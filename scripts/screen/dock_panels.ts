/**
 * Dockable / floatable editor panels — interface draft.
 *
 * Design summary (see documentation/ once implemented):
 *
 * Each editor (Area subclass) may own a PanelManager.  The manager owns four
 * fixed edge dock regions (left/right/top/bottom) plus the editor's existing
 * content container as the untouched "center".  Panels are declared in the
 * editor's `definePanels()` hook, which registers a *catalog* of panels and
 * their default placement; a serialized PanelLayoutState overrides the
 * defaults when present and is validated against the catalog on load
 * (unknown ids dropped, missing ids inserted at their defaults).
 *
 * Regions hold ordered stacks of panels; a stack shows its panels either
 * stacked vertically (rollouts) or as tabs.  A region can also run in "rail"
 * mode: only a slim edge-aligned tab bar is shown (vertical for left/right),
 * and clicking a tab toggles visibility of the docked group — the rail itself
 * never hides.
 *
 * Floating panels live in DragBox-style containers appended at screen level
 * but owned by the editor: they hide with it, die with it, and wrap their
 * events in push_ctx_active()/pop_ctx_active().  Because several editors of
 * the same type may be open, floating panels carry provenance affordances:
 * the owning editor's uiname (plus a disambiguator) in the title bar, a
 * hover/drag tether drawn via ScreenOverdraw, and a re-dock button.
 *
 * Serialization follows the established triad: structure through nstructjs
 * (the *State classes below), per-panel widget state through
 * saveUIData(panel.contents, "panel:" + id) blobs keyed by panel id (not by
 * child index, so reorders don't break restore), replayed in afterSTRUCT once
 * ctx is ready.
 *
 * Implementation status: programmatic core (catalog, dock skeleton, edge
 * regions, per-edge hide/show, serialization).  Floating (floatPanel), the
 * drag/drop interaction, and the rail-mode visual are later phases;
 * unimplemented methods throw.
 */

import { Container } from "../core/ui";
import { UIBase, loadUIData, saveUIData } from "../core/ui_base";
import { PanelFrame } from "../widgets/ui_panel";
import type { IContextBase } from "../core/context_base";
import nstructjs from "../path-controller/util/struct";
import type { StructReader } from "../util/nstructjs";
import { Vector2 } from "../path-controller/util/vectormath";

/** Edge a dock region is attached to. */
export type PanelSide = "left" | "right" | "top" | "bottom";

export const PanelSides: readonly PanelSide[] = ["left", "right", "top", "bottom"];

/** Bitmask of places a panel is allowed to go (PanelDef.allowedDocks). */
export const PanelDockMask = {
  LEFT  : 1,
  RIGHT : 2,
  TOP   : 4,
  BOTTOM: 8,
  FLOAT : 16,
  ALL   : 1 | 2 | 4 | 8 | 16,
};

export const PanelFlags = {
  /** Panel cannot be closed by the user. */
  NO_CLOSE: 1,
  /** Panel cannot be floated (implies it stays in its allowed docks). */
  NO_FLOAT: 2,
  /** Rollout collapse (PanelFrame closed state) is disabled. */
  NO_COLLAPSE: 4,
  /** Panel cannot be moved at all; it stays where definePanels() put it. */
  PINNED: 8,
};

export const RegionMode = {
  /** Panels render inline in the region (rollout stacks / tab groups). */
  DOCKED: 0,
  /**
   * Only an edge-aligned tab bar is shown; clicking a tab toggles the whole
   * group's visibility.  The bar itself never hides.
   */
  RAIL: 1,
};

/** How the panels within one stack are presented. */
export const StackMode = {
  /** Vertical rollout list (Blender N-panel style). */
  STACK: 0,
  /** One visible panel selected by a tab bar. */
  TABS: 1,
};

/**
 * A panel declaration, registered via PanelManager.panel() inside the
 * editor's definePanels() hook.  This is the catalog entry: it defines
 * identity, constraints, default placement, and how to build the contents.
 */
export interface PanelDef<CTX extends IContextBase = IContextBase> {
  /** Stable string id; used as the serialization key.  Never rename. */
  id: string;
  title: string;
  icon?: number;
  /** Default placement.  "float" spawns floating (rect from floatRect). */
  dock?: PanelSide | "float";
  /** Default floating rect (screen space), when dock is "float". */
  floatRect?: { pos: [number, number]; size: [number, number] };
  /** PanelDockMask bits; drop zones outside the mask never render. */
  allowedDocks?: number;
  /** PanelFlags bits. */
  flags?: number;
  /** Minimum content size in CSS pixels. */
  minSize?: [number, number];
  /**
   * Builds the panel contents.  Called once when the panel is first shown;
   * widget state is restored afterwards from the per-panel uidata blob.
   */
  build(container: Container<CTX>, panel: DockPanel<CTX>): void;
}

/**
 * Implemented by editors hosting a PanelManager (Area gains this in a later
 * phase; kept structural so tests can host panels outside an Area).
 */
export interface IPanelHost<CTX extends IContextBase = IContextBase> {
  readonly ctx: CTX;
  /**
   * When false, all interactive layout editing (drag, dock, float, close)
   * is disabled and the programmatic layout is authoritative.
   */
  panelLayoutEditable: boolean;
}

/* -------------------------------------------------------------------------
 * Serialized state (nstructjs).  These round-trip through the editor's
 * STRUCT; the PanelManager itself is not serialized.
 * ---------------------------------------------------------------------- */

/** Per-panel persistent state; uidata is a saveUIData blob keyed by panel id. */
export class PanelState {
  static STRUCT = `pathux.PanelState {
  id       : string;
  closed   : bool;
  uidata   : string;
}`;

  id = "";
  /** PanelFrame rollout collapse state. */
  closed = false;
  uidata = "";

  loadSTRUCT(reader: StructReader<this>) {
    reader(this);
  }
}
nstructjs.register(PanelState);

/** One stack of panels within a region. */
export class PanelStackState {
  static STRUCT = `pathux.PanelStackState {
  mode     : int;
  panelIds : array(string);
}`;

  /** StackMode. */
  mode = StackMode.STACK;
  panelIds: string[] = [];

  loadSTRUCT(reader: StructReader<this>) {
    reader(this);
  }
}
nstructjs.register(PanelStackState);

export class DockRegionState {
  static STRUCT = `pathux.DockRegionState {
  side          : int;
  size          : float;
  mode          : int;
  hidden        : bool;
  railCollapsed : bool;
  stacks        : array(pathux.PanelStackState);
}`;

  /** Index into PanelSides. */
  side = 0;
  /** Width (left/right) or height (top/bottom) in CSS pixels. */
  size = 225;
  /** RegionMode. */
  mode = RegionMode.DOCKED;
  /** Hidden via hideEdge(); stacks/size are retained for restore. */
  hidden = false;
  /** Rail mode only: the docked group is currently toggled off. */
  railCollapsed = false;
  stacks: PanelStackState[] = [];

  loadSTRUCT(reader: StructReader<this>) {
    reader(this);
  }
}
nstructjs.register(DockRegionState);

export class FloatingPanelState {
  static STRUCT = `pathux.FloatingPanelState {
  panelId : string;
  pos     : vec2;
  size    : vec2;
  order   : int;
}`;

  panelId = "";
  pos = new Vector2();
  size = new Vector2();
  /** Raise order among the editor's floating panels. */
  order = 0;

  loadSTRUCT(reader: StructReader<this>) {
    reader(this);
  }
}
nstructjs.register(FloatingPanelState);

/**
 * The complete layout for one editor instance.  Editors embed this in their
 * own STRUCT (`panelLayout : pathux.PanelLayoutState`) and hand it to
 * PanelManager.loadLayout() in afterSTRUCT.
 */
export class PanelLayoutState {
  static STRUCT = `pathux.PanelLayoutState {
  regions  : array(pathux.DockRegionState);
  floating : array(pathux.FloatingPanelState);
  panels   : array(pathux.PanelState);
}`;

  regions: DockRegionState[] = [];
  floating: FloatingPanelState[] = [];
  panels: PanelState[] = [];

  loadSTRUCT(reader: StructReader<this>) {
    reader(this);
  }
}
nstructjs.register(PanelLayoutState);

/* -------------------------------------------------------------------------
 * Widgets
 * ---------------------------------------------------------------------- */

/**
 * A dockable/floatable panel.  Extends PanelFrame so rollout collapse,
 * theming, and saveData()/loadData() participation come for free; the
 * titleframe is the drag handle.
 */
export class DockPanel<CTX extends IContextBase = IContextBase> extends PanelFrame<CTX> {
  panelId = "";
  def!: PanelDef<CTX>;
  manager!: PanelManager<CTX>;

  static define() {
    return {
      tagname            : "dock-panel-x",
      style              : "panel",
      subclassChecksTheme: true,
    };
  }

  canDock(side: PanelSide): boolean {
    const mask = this.def.allowedDocks ?? PanelDockMask.ALL;
    const bit = {
      left  : PanelDockMask.LEFT,
      right : PanelDockMask.RIGHT,
      top   : PanelDockMask.TOP,
      bottom: PanelDockMask.BOTTOM,
    }[side];
    return !(this.def.flags! & PanelFlags.PINNED) && (mask & bit) !== 0;
  }

  canFloat(): boolean {
    const mask = this.def.allowedDocks ?? PanelDockMask.ALL;
    const flags = this.def.flags ?? 0;
    return (
      !(flags & (PanelFlags.NO_FLOAT | PanelFlags.PINNED)) && (mask & PanelDockMask.FLOAT) !== 0
    );
  }

  canClose(): boolean {
    return !((this.def.flags ?? 0) & PanelFlags.NO_CLOSE);
  }
}


UIBase.internalRegister(DockPanel as unknown as typeof UIBase);

let _dockpin_idgen = 0;

/** Runtime (non-serialized) state of one dock region. */
export interface DockRegionRuntime<CTX extends IContextBase = IContextBase> {
  side: PanelSide;
  container?: Container<CTX>;
  /** Width (left/right) or height (top/bottom) in CSS pixels. */
  size: number;
  /** RegionMode. */
  mode: number;
  hidden: boolean;
  railCollapsed: boolean;
  /** Panel ids in display order (single stack in this phase). */
  order: string[];
}

/**
 * Owns dock regions, floating panels, the panel catalog, and the (future)
 * drag/drop interaction.  Not a widget itself: it manages DOM inside the
 * host editor's container.
 *
 * Usage from an editor:
 *
 *   this.panels = new PanelManager(this);
 *   this.definePanels(this.panels);      // catalog + defaults via panel()
 *   this.panels.build(this.container);   // dock skeleton; content goes in
 *   this.panels.center.add(...);         // .center is the editor content
 *   this.panels.applyDefaultLayout();    // or loadLayout(saved) when loading
 */
export class PanelManager<CTX extends IContextBase = IContextBase> {
  readonly host: IPanelHost<CTX>;
  /** Catalog registered by definePanels(); keyed by panel id. */
  readonly defs = new Map<string, PanelDef<CTX>>();
  /** Live panel widgets, created lazily; keyed by panel id. */
  readonly panels = new Map<string, DockPanel<CTX>>();

  outer!: Container<CTX>;
  /** The editor's content container, framed by the four dock regions. */
  center!: Container<CTX>;

  readonly regions: Record<PanelSide, DockRegionRuntime<CTX>>;

  /** Panels hidden via closePanel(); layout position is retained. */
  private readonly hiddenPanels = new Set<string>();
  /** Deserialized per-panel state awaiting realization (uidata replay). */
  private readonly pendingState = new Map<string, PanelState>();

  constructor(host: IPanelHost<CTX>) {
    this.host = host;

    const region = (side: PanelSide): DockRegionRuntime<CTX> => ({
      side,
      size         : 225,
      mode         : RegionMode.DOCKED,
      hidden       : false,
      railCollapsed: false,
      order        : [],
    });

    this.regions = {
      left  : region("left"),
      right : region("right"),
      top   : region("top"),
      bottom: region("bottom"),
    };
  }

  /* --- catalog / declaration (definePanels) --- */

  /** Register a panel in the catalog with its default placement. */
  panel(def: PanelDef<CTX>): this {
    if (this.defs.has(def.id)) {
      throw new Error(`duplicate panel id "${def.id}"`);
    }
    this.defs.set(def.id, def);
    return this;
  }

  /* --- skeleton --- */

  /** Build the dock frame inside `parent`; editor content goes in .center. */
  build(parent: Container<CTX>): Container<CTX> {
    //Containers (re)apply theme defaults like flex-grow:unset from their
    //deferred init(), clobbering inline styles set here.  Pin structural
    //layout via !important rules in the enclosing shadow root instead —
    //stylesheet !important beats later plain inline assignments.
    //note: data attributes, not classes — Container.init() replaces the
    //whole class attribute when its deferred init runs
    const pin = (el: Container<CTX>, styles: Record<string, string>) => {
      const key = `p${_dockpin_idgen++}`;
      el.setAttribute("data-dockpin", key);

      let body = "";
      for (const k in styles) {
        body += `  ${k}: ${styles[k]} !important;\n`;
      }

      const tag = document.createElement("style");
      tag.textContent =
        `[data-dockpin="${key}"] {\n${body}}\n` +
        `[data-dockpin="${key}"][data-dock-hidden] { display: none !important; }\n`;

      const root = el.getRootNode();
      if (root instanceof ShadowRoot) {
        root.prepend(tag);
      } else if (el.parentNode) {
        el.parentNode.insertBefore(tag, el);
      }
    };

    const outer = (this.outer = parent.col());

    outer.noMarginsOrPadding();
    pin(outer, {
      width            : "100%",
      height           : "100%",
      "justify-content": "flex-start",
      "align-items"    : "stretch",
    });

    this.regions.top.container = outer.row();

    const mid = outer.row();
    mid.noMarginsOrPadding();
    pin(mid, {
      "flex-grow"      : "1",
      "align-items"    : "stretch",
      "justify-content": "flex-start",
      width            : "100%",
      "min-height"     : "0",
    });

    this.regions.left.container = mid.col();
    this.center = mid.col();
    this.regions.right.container = mid.col();
    this.regions.bottom.container = outer.row();

    this.center.noMarginsOrPadding();
    pin(this.center, {
      "flex-grow" : "1",
      "flex-basis": "0",
      "min-width" : "0",
    });

    for (const side of PanelSides) {
      const r = this.regions[side];
      r.container!.noMarginsOrPadding();
      pin(r.container!, {
        overflow         : "auto",
        display          : "flex",
        "flex-grow"      : "0",
        "flex-shrink"    : "0",
        "justify-content": "flex-start",
        "align-items"    : "stretch",
      });
      this._updateRegion(r);
    }

    return this.center;
  }

  /* --- imperative layout control --- */

  /** Move a panel into an edge region; index positions it in the stack. */
  dockPanel(id: string, side: PanelSide, opts?: { index?: number }): void {
    const panel = this._ensurePanel(id);
    this._removeFromLayout(id);

    const r = this.regions[side];
    const index = Math.min(opts?.index ?? r.order.length, r.order.length);
    r.order.splice(index, 0, id);

    //keep DOM order in sync with r.order
    const nextId = r.order[index + 1];
    const next = nextId ? this.panels.get(nextId) : undefined;

    HTMLElement.prototype.remove.call(panel);
    if (next && next.parentNode) {
      next.parentNode.insertBefore(panel, next);
      panel.parentWidget = r.container as unknown as typeof panel.parentWidget;
    } else {
      r.container!.add(panel as unknown as Container<CTX>);
    }

    panel.style.display = this.hiddenPanels.has(id) ? "none" : "";
    this._updateRegion(r);
  }

  /** Float a panel at rect (screen space). Interactive/floating docking is
   *  a later phase. */
  floatPanel(id: string, rect?: { pos: [number, number]; size: [number, number] }): void {
    throw new Error("TODO: PanelManager.floatPanel (phase 4)");
  }

  /** Hide a panel; its layout position and widget state are retained. */
  closePanel(id: string): void {
    this.hiddenPanels.add(id);
    const panel = this.panels.get(id);
    if (panel) {
      panel.style.display = "none";
    }
  }

  /** Re-show a panel closed with closePanel(). */
  showPanel(id: string): void {
    this.hiddenPanels.delete(id);
    const panel = this._ensurePanel(id);
    panel.style.display = "";

    //a never-docked panel goes to its default location
    if (!this._findSide(id)) {
      this.dockPanel(id, this._defaultSide(this.defs.get(id)!));
    }
  }

  isPanelClosed(id: string): boolean {
    return this.hiddenPanels.has(id);
  }

  /** Discard the current layout and rebuild from the catalog's defaults. */
  resetLayout(): void {
    for (const side of PanelSides) {
      const r = this.regions[side];
      r.order = [];
      r.hidden = false;
      r.railCollapsed = false;
    }
    this.hiddenPanels.clear();
    this.applyDefaultLayout();
  }

  /** Place every catalogued panel at its default dock. */
  applyDefaultLayout(): void {
    for (const def of this.defs.values()) {
      if (!this._findSide(def.id)) {
        this.dockPanel(def.id, this._defaultSide(def));
      }
    }
  }

  /* --- per-edge visibility (hotkey-bindable by editors) --- */

  hideEdge(side: PanelSide): void {
    const r = this.regions[side];
    r.hidden = true;
    this._updateRegion(r);
  }

  showEdge(side: PanelSide): void {
    const r = this.regions[side];
    r.hidden = false;
    this._updateRegion(r);
  }

  /** In rail mode (later phase) this collapses to the bare rail instead. */
  toggleEdge(side: PanelSide): void {
    if (this.isEdgeHidden(side)) {
      this.showEdge(side);
    } else {
      this.hideEdge(side);
    }
  }

  isEdgeHidden(side: PanelSide): boolean {
    return this.regions[side].hidden;
  }

  setEdgeSize(side: PanelSide, size: number): void {
    this.regions[side].size = size;
    this._updateRegion(this.regions[side]);
  }

  /** Switch a region between inline-docked and rail presentation.  The rail
   *  visual (edge-aligned tab bar, click-to-toggle) is a later phase; the
   *  mode is stored and serialized now so layouts round-trip. */
  setEdgeMode(side: PanelSide, mode: number): void {
    this.regions[side].mode = mode;
  }

  /* --- serialization --- */

  /** Snapshot the layout, including per-panel saveUIData blobs. */
  saveLayout(): PanelLayoutState {
    const state = new PanelLayoutState();

    for (const side of PanelSides) {
      const r = this.regions[side];
      const rs = new DockRegionState();

      rs.side = PanelSides.indexOf(side);
      rs.size = r.size;
      rs.mode = r.mode;
      rs.hidden = r.hidden;
      rs.railCollapsed = r.railCollapsed;

      const stack = new PanelStackState();
      stack.panelIds = [...r.order];
      rs.stacks = [stack];

      state.regions.push(rs);
    }

    for (const id of this.defs.keys()) {
      const ps = new PanelState();
      ps.id = id;
      ps.closed = this.hiddenPanels.has(id);

      const panel = this.panels.get(id);
      if (panel) {
        ps.uidata = saveUIData(panel as unknown as UIBase<CTX>, "panel:" + id);
      } else {
        ps.uidata = this.pendingState.get(id)?.uidata ?? "";
      }

      state.panels.push(ps);
    }

    return state;
  }

  /**
   * Apply a deserialized layout.  Must run after definePanels() and build();
   * ids are validated against the catalog (unknown ids dropped, missing ids
   * placed at their defaults).  Call when ctx is ready (afterSTRUCT/doOnce)
   * so panel contents can build and replay their uidata.
   */
  loadLayout(state: PanelLayoutState): void {
    for (const side of PanelSides) {
      this.regions[side].order = [];
    }
    this.hiddenPanels.clear();
    this.pendingState.clear();

    for (const ps of state.panels) {
      if (!this.defs.has(ps.id)) {
        continue;
      }
      this.pendingState.set(ps.id, ps);
      if (ps.closed) {
        this.hiddenPanels.add(ps.id);
      }
    }

    for (const rs of state.regions) {
      const side = PanelSides[rs.side];
      if (!side) {
        continue;
      }

      const r = this.regions[side];
      r.size = rs.size;
      r.mode = rs.mode;
      r.hidden = rs.hidden;
      r.railCollapsed = rs.railCollapsed;

      for (const stack of rs.stacks) {
        for (const id of stack.panelIds) {
          if (this.defs.has(id) && !this._findSide(id)) {
            this.dockPanel(id, side);
          }
        }
      }
    }

    //panels the layout predates get their default placement
    this.applyDefaultLayout();
  }

  /* --- internals --- */

  private _defaultSide(def: PanelDef<CTX>): PanelSide {
    const dock = def.dock ?? "right";
    //floating defaults arrive with the floating implementation (phase 4)
    return dock === "float" ? "right" : dock;
  }

  private _findSide(id: string): PanelSide | undefined {
    return PanelSides.find((side) => this.regions[side].order.includes(id));
  }

  private _removeFromLayout(id: string) {
    for (const side of PanelSides) {
      const r = this.regions[side];
      const i = r.order.indexOf(id);
      if (i >= 0) {
        r.order.splice(i, 1);
        this._updateRegion(r);
      }
    }
  }

  private _updateRegion(r: DockRegionRuntime<CTX>) {
    const c = r.container;
    if (!c) {
      return;
    }

    const visible = !r.hidden && r.order.length > 0;
    if (visible) {
      c.removeAttribute("data-dock-hidden");
    } else {
      c.setAttribute("data-dock-hidden", "1");
    }

    if (r.side === "left" || r.side === "right") {
      c.style.setProperty("width", r.size + "px", "important");
      c.style.removeProperty("height");
    } else {
      c.style.setProperty("height", r.size + "px", "important");
      c.style.setProperty("width", "100%", "important");
    }
  }

  private _ensurePanel(id: string): DockPanel<CTX> {
    const existing = this.panels.get(id);
    if (existing) {
      return existing;
    }

    const def = this.defs.get(id);
    if (!def) {
      throw new Error(`unknown panel id "${id}" (missing panel() declaration)`);
    }

    const panel = UIBase.createElement("dock-panel-x") as DockPanel<CTX>;
    panel.panelId = id;
    panel.def = def;
    panel.manager = this;
    panel.ctx = this.host.ctx;
    panel.setAttribute("label", def.title);

    this.panels.set(id, panel);

    //PanelFrame forwards container methods to its contents
    def.build(panel as unknown as Container<CTX>, panel);

    const pending = this.pendingState.get(id);
    if (pending) {
      if (pending.uidata) {
        loadUIData(panel as unknown as UIBase<CTX>, pending.uidata);
      }
      this.pendingState.delete(id);
    }

    return panel;
  }
}
