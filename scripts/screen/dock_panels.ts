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
import { UIBase, Icons, loadUIData, saveUIData } from "../core/ui_base";
//side-effect import: registers tabbar-x/tabcontainer-x, used by rail
//mode and tabbed stacks
import "../widgets/ui_tabs";
import type { TabBar, TabContainer } from "../widgets/ui_tabs";
import {
  pushModalLight,
  popModalLight,
  keymap as eventKeymap,
  ModalState,
} from "../path-controller/util/simple_events";
import { PanelFrame } from "../widgets/ui_panel";
//side-effect import: registers overdraw-x, used by the float tether
import "../util/ScreenOverdraw";
import type { Overdraw } from "../util/ScreenOverdraw";
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
  NO_CLOSE   : 1,
  /** Panel cannot be floated (implies it stays in its allowed docks). */
  NO_FLOAT   : 2,
  /** Rollout collapse (PanelFrame closed state) is disabled. */
  NO_COLLAPSE: 4,
  /** Panel cannot be moved at all; it stays where definePanels() put it. */
  PINNED     : 8,
};

export const RegionMode = {
  /** Panels render inline in the region (rollout stacks / tab groups). */
  DOCKED: 0,
  /**
   * Only an edge-aligned tab bar is shown; clicking a tab toggles the whole
   * group's visibility.  The bar itself never hides.
   */
  RAIL  : 1,
};

/** How the panels within one stack are presented. */
export const StackMode = {
  /** Vertical rollout list (Blender N-panel style). */
  STACK: 0,
  /** One visible panel selected by a tab bar. */
  TABS : 1,
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
  /** Minimum content size in CSS pixels; either component may be omitted. */
  minSize?: [(number | undefined)?, (number | undefined)?];
  /** Maximum content size in CSS pixels; either component may be omitted.
   *  Content past the limit scrolls inside the panel. */
  maxSize?: [(number | undefined)?, (number | undefined)?];
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
  /** Human-readable host name shown in floating panel titles for
   *  provenance (several editors of one type may be open). */
  getPanelHostTitle?(): string;
  /** Bounding rect of the host editor, used for drag drop zones. */
  getBoundingClientRect(): DOMRect;
  /** Panel managers of other visible editors of the same type; drags can
   *  drop panels onto their edge zones (same-catalog transfer). */
  getPanelPeers?(): PanelManager<CTX>[];
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
  active   : string;
}`;

  /** StackMode. */
  mode = StackMode.STACK;
  panelIds: string[] = [];
  /** Tabs mode: id of the active tab ("" when unset). */
  active = "";

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
  /** Style tag backing the data-dock-hidetitle rule (see _setTitleHidden). */
  _dockTitleStyle?: HTMLStyleElement;

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

  override _updateClosed(changed: boolean) {
    super._updateClosed(changed);
    //collapsed panels give up their footprint, not just their contents
    this.manager?._onPanelCollapse(this);
  }
}

UIBase.internalRegister(DockPanel as unknown as typeof UIBase);

let _dockpin_idgen = 0;

/** A drag-drop target: an edge region ("edge") or an existing docked
 *  panel/tab group to merge into as tabs ("stack"). */
interface DropZone<CTX extends IContextBase = IContextBase> {
  kind: "edge" | "stack";
  side: PanelSide;
  pm: PanelManager<CTX>;
  /** Stack zones: a panel id inside the stack to merge with. */
  targetId?: string;
  el: HTMLDivElement;
  baseBg: string;
  hitBg: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Runtime (non-serialized) state of one stack of panels within a region. */
export interface PanelStackRuntime<CTX extends IContextBase = IContextBase> {
  /** StackMode.  STACK stacks hold exactly one panel (a rollout);
   *  TABS stacks hold one or more panels behind a tab bar. */
  mode: number;
  ids: string[];
  /** Tabs mode: id of the active tab. */
  active?: string;
  /** Tabs mode: the TabContainer presenting the stack (transient). */
  tabs?: TabContainer<CTX>;
}

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
  /** Panel stacks in display order.  Panels dock as their own STACK-mode
   *  stack; dropping one panel onto another merges them into a TABS stack. */
  stacks: PanelStackRuntime<CTX>[];
  /** All panel ids in the region, in display order (derived from stacks). */
  readonly order: string[];
  /** Rail mode: the edge-aligned tab bar (never hidden). */
  rail?: TabBar<CTX>;
  /** Rail mode: container holding the panels next to the rail. */
  stackWrap?: Container<CTX>;
  /** Rail mode: id of the panel shown when the group is expanded. */
  activeRail?: string;
  /** Resize grip on the region's center-facing edge. */
  grip?: HTMLDivElement;
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

  /** Live floating frames, keyed by panel id. */
  readonly floating = new Map<string, { frame: Container<CTX> }>();
  /** Last dock side per panel, used by re-dock / closePanel. */
  private readonly lastDock = new Map<string, PanelSide>();
  /** Panels hidden via closePanel(); layout position is retained. */
  private readonly hiddenPanels = new Set<string>();
  /** Active provenance tether overlay, if any (see _showTether). */
  private _tether?: Overdraw<CTX>;
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
      stacks       : [],
      get order(): string[] {
        return this.stacks.flatMap((s: PanelStackRuntime<CTX>) => s.ids);
      },
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

    //the dock frame owns the editor's content area; percentage heights
    //below need the parent chain to resolve
    parent.style.setProperty("height", "100%", "important");
    parent.style.setProperty("width", "100%", "important");

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
        "align-self"     : "stretch",
      });
      this._updateRegion(r);
    }

    return this.center;
  }

  /* --- imperative layout control --- */

  /** Move a panel into an edge region; index positions it among the
   *  region's stacks (the panel becomes its own rollout stack). */
  dockPanel(id: string, side: PanelSide, opts?: { index?: number }): void {
    this._ensurePanel(id);
    this._removeFromLayout(id);
    this.lastDock.set(id, side);

    const r = this.regions[side];
    const index = Math.min(opts?.index ?? r.stacks.length, r.stacks.length);
    r.stacks.splice(index, 0, { mode: StackMode.STACK, ids: [id] });

    this._rebuildRegion(r);
  }

  /** Dock a panel into the same stack as `targetId`, presenting the stack
   *  as tabs — the drop-a-panel-onto-a-panel gesture.  No-ops when the
   *  target isn't docked or the panel may not dock on that side. */
  dockPanelInto(id: string, targetId: string): void {
    if (id === targetId || !this.defs.has(targetId)) {
      return;
    }

    const panel = this._ensurePanel(id);
    const side = this._findSide(targetId);

    if (!side || !panel.canDock(side)) {
      return;
    }

    this._removeFromLayout(id);

    //re-find: the removal may have collapsed or dropped stacks
    const r = this.regions[this._findSide(targetId)!];
    const stack = r.stacks.find((s) => s.ids.includes(targetId))!;

    stack.mode = StackMode.TABS;
    stack.ids.splice(stack.ids.indexOf(targetId) + 1, 0, id);
    stack.active = id;

    this.lastDock.set(id, r.side);
    this._rebuildRegion(r);
  }

  /** Float a panel at rect (screen space); defaults to def.floatRect. */
  floatPanel(id: string, rect?: { pos: [number, number]; size?: [number, number] }): void {
    const panel = this._ensurePanel(id);

    if (!panel.canFloat()) {
      console.warn(`dock panel "${id}" is not allowed to float`);
      return;
    }

    const existing = this.floating.get(id);
    if (existing) {
      if (rect) {
        existing.frame.style.left = rect.pos[0] + "px";
        existing.frame.style.top = rect.pos[1] + "px";
      }
      return;
    }

    this._removeFromLayout(id);
    this.hiddenPanels.delete(id);
    panel.style.display = "";

    const def = this.defs.get(id)!;
    const pos = rect?.pos ?? def.floatRect?.pos ?? [64, 64];
    const size = rect?.size ?? def.floatRect?.size;

    const frame = this._makeFloatFrame(panel, pos, size);
    this.floating.set(id, { frame });
  }

  /** Hide a panel; its layout position and widget state are retained.
   *  A floating panel is first re-docked to its last dock side. */
  closePanel(id: string): void {
    if (this.floating.has(id)) {
      this.dockPanel(id, this.lastDock.get(id) ?? this._defaultSide(this.defs.get(id)!));
    }

    this.hiddenPanels.add(id);
    const panel = this.panels.get(id);
    if (panel) {
      panel.style.display = "none";
      const side = this._findSide(id);
      if (side) {
        this._rebuildRegion(this.regions[side]);
      }
    }
  }

  /** Re-show a panel closed with closePanel(). */
  showPanel(id: string): void {
    this.hiddenPanels.delete(id);
    const panel = this._ensurePanel(id);
    panel.style.display = "";

    //a never-docked panel goes to its default location
    if (!this._isPlaced(id)) {
      this.dockPanel(id, this._defaultSide(this.defs.get(id)!));
    } else {
      const side = this._findSide(id);
      if (side) {
        this._rebuildRegion(this.regions[side]);
      }
    }
  }

  isPanelClosed(id: string): boolean {
    return this.hiddenPanels.has(id);
  }

  /** Discard the current layout and rebuild from the catalog's defaults. */
  resetLayout(): void {
    for (const id of [...this.floating.keys()]) {
      this._unfloat(id);
    }
    for (const side of PanelSides) {
      const r = this.regions[side];
      r.stacks = [];
      r.hidden = false;
      r.railCollapsed = false;
    }
    this.hiddenPanels.clear();
    this.lastDock.clear();
    this.applyDefaultLayout();
  }

  /** Place every catalogued panel at its default dock. */
  applyDefaultLayout(): void {
    for (const def of this.defs.values()) {
      if (this._isPlaced(def.id)) {
        continue;
      }

      if (def.dock === "float") {
        this.floatPanel(def.id, def.floatRect);
        if (this.floating.has(def.id)) {
          continue;
        }
      }

      this.dockPanel(def.id, this._defaultSide(def));
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

  /** In rail mode this collapses to the bare rail instead of hiding —
   *  the rail is the affordance for getting the panels back. */
  toggleEdge(side: PanelSide): void {
    const r = this.regions[side];

    if (r.mode === RegionMode.RAIL && !r.hidden) {
      r.railCollapsed = !r.railCollapsed;
      this._applyRailState(r);
      return;
    }

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

  /** Present a docked region's panels as rollout stacks or as one tab
   *  group (StackMode.STACK / StackMode.TABS).  This merges/splits the
   *  region's stacks; per-stack tab groups are made with dockPanelInto. */
  setStackMode(side: PanelSide, mode: number): void {
    const r = this.regions[side];
    const ids = r.order;

    if (ids.length === 0) {
      return;
    }

    if (mode === StackMode.TABS) {
      if (r.stacks.length === 1 && r.stacks[0].mode === StackMode.TABS) {
        return;
      }
      const active = r.stacks.find((s) => s.mode === StackMode.TABS)?.active;
      r.stacks = [{ mode: StackMode.TABS, ids, active: active ?? ids[0] }];
    } else {
      if (r.stacks.every((s) => s.mode === StackMode.STACK)) {
        return;
      }
      r.stacks = ids.map((id) => ({ mode: StackMode.STACK, ids: [id] }));
    }

    this._rebuildRegion(r);
  }

  /** Switch a region between inline-docked and rail presentation.  In rail
   *  mode a slim edge-aligned tab bar (one tab per panel, the panels' own
   *  title bars hidden) stays visible; clicking a tab expands the group
   *  with that panel active, clicking the active tab collapses it. */
  setEdgeMode(side: PanelSide, mode: number): void {
    const r = this.regions[side];

    if (r.mode === mode) {
      return;
    }

    r.mode = mode;
    this._rebuildRegion(r);
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

      rs.stacks = r.stacks.map((s) => {
        const stack = new PanelStackState();
        stack.mode = s.mode;
        stack.panelIds = [...s.ids];
        stack.active = s.active ?? "";
        return stack;
      });

      state.regions.push(rs);
    }

    let order = 0;
    for (const [id, fl] of this.floating) {
      const fs = new FloatingPanelState();
      const rect = fl.frame.getBoundingClientRect();

      fs.panelId = id;
      fs.pos.loadXY(rect.x, rect.y);
      fs.size.loadXY(rect.width, rect.height);
      fs.order = order++;

      state.floating.push(fs);
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
      this.regions[side].stacks = [];
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
        const ids = stack.panelIds.filter((id) => this.defs.has(id) && !this._isPlaced(id));
        if (ids.length === 0) {
          continue;
        }

        if (stack.mode === StackMode.TABS && ids.length > 1) {
          r.stacks.push({
            mode: StackMode.TABS,
            ids,
            active: ids.includes(stack.active) ? stack.active : ids[0],
          });
        } else {
          //rollout stacks are per-panel; also splits legacy multi-id stacks
          for (const id of ids) {
            r.stacks.push({ mode: StackMode.STACK, ids: [id] });
          }
        }

        for (const id of ids) {
          this.lastDock.set(id, side);
        }
      }
    }

    for (const side of PanelSides) {
      this._rebuildRegion(this.regions[side]);
    }

    for (const fs of state.floating) {
      if (this.defs.has(fs.panelId) && !this._isPlaced(fs.panelId)) {
        this.floatPanel(fs.panelId, { pos: [fs.pos[0], fs.pos[1]] });
      }
    }

    //panels the layout predates get their default placement
    this.applyDefaultLayout();
  }

  /* --- host lifecycle (called from Area) --- */

  /** Hide floating frames while the host editor is inactive in its tile. */
  _hostHidden(): void {
    for (const fl of this.floating.values()) {
      fl.frame.style.display = "none";
    }
  }

  _hostShown(): void {
    for (const fl of this.floating.values()) {
      fl.frame.style.display = "";
    }
  }

  /** Remove all floating frames from the DOM (host editor destroyed). */
  destroyFloats(): void {
    for (const id of [...this.floating.keys()]) {
      this._unfloat(id);
    }
  }

  /* --- internals --- */

  private _isPlaced(id: string): boolean {
    return this._findSide(id) !== undefined || this.floating.has(id);
  }

  /** Hide/show a panel's title bar via an !important shadow rule —
   *  RowFrame.connectedCallback re-sets inline display:flex whenever the
   *  panel reconnects (e.g. tab switches), so inline styles don't stick. */
  private _setTitleHidden(panel: DockPanel<CTX>, hidden: boolean) {
    if (!panel._dockTitleStyle) {
      const tag = document.createElement("style");
      tag.textContent = "[data-dock-hidetitle] { display: none !important; }\n";
      panel.shadow.prepend(tag);
      panel._dockTitleStyle = tag;
    }

    if (hidden) {
      panel.titleframe.setAttribute("data-dock-hidetitle", "1");
    } else {
      panel.titleframe.removeAttribute("data-dock-hidetitle");
    }
  }

  private _screen() {
    return (this.host.ctx as unknown as { screen: UIBase<CTX> & { _popups: UIBase<CTX>[] } })
      .screen;
  }

  /** Detach a floating frame, keeping the panel widget alive. */
  private _unfloat(id: string): void {
    const fl = this.floating.get(id);
    if (!fl) {
      return;
    }

    this.floating.delete(id);

    const panel = this.panels.get(id);
    if (panel) {
      HTMLElement.prototype.remove.call(panel);
    }

    fl.frame.remove();
  }

  private _makeFloatFrame(
    panel: DockPanel<CTX>,
    pos: readonly [number, number],
    size?: readonly [number, number]
  ): Container<CTX> {
    const def = panel.def;
    const frame = UIBase.createElement("colframe-x") as Container<CTX>;

    frame.ctx = this.host.ctx;
    frame.style.position = UIBase.PositionKey;
    frame.style.left = pos[0] + "px";
    frame.style.top = pos[1] + "px";
    frame.style.zIndex = "205";
    frame.style.borderRadius = "6px";
    frame.style.boxShadow = "0px 4px 12px rgba(0,0,0,0.35)";

    if (size) {
      frame.style.width = size[0] + "px";
    } else {
      frame.style.minWidth = "225px";
    }

    const header = frame.row();
    header.noMarginsOrPadding();

    //provenance: several editors of one type may be open
    const hostTitle = this.host.getPanelHostTitle?.();
    header.label(hostTitle ? `${def.title} — ${hostTitle}` : def.title);

    header.iconbutton(Icons.UI_COLLAPSE, "Dock", () => {
      this.dockPanel(panel.panelId, this.lastDock.get(panel.panelId) ?? this._defaultSide(def));
    });

    if (panel.canClose()) {
      header.iconbutton(Icons.TINY_X, "Close", () => {
        this.closePanel(panel.panelId);
      });
    }

    header.addEventListener("pointerdown", (e: PointerEvent) => {
      this._startFrameDrag(frame, panel, e);
      e.preventDefault();
    });

    //hover tether: show where this panel came from
    header.addEventListener("pointerenter", () => {
      this._showTether(frame);
    });
    header.addEventListener("pointerleave", () => {
      this._hideTether();
    });

    frame.add(panel as unknown as Container<CTX>);

    document.body.appendChild(frame);
    frame._init();
    frame.background = frame.getDefault("background-color") as string;

    //register as a screen popup so pickElement sees the frame first
    const screen = this.host.ctx ? this._screen() : undefined;
    if (screen) {
      (screen._popups as unknown as UIBase<CTX>[]).push(frame);

      const remove = frame.remove.bind(frame);
      frame.remove = () => {
        const popups = screen._popups as unknown as {
          includes(f: unknown): boolean;
          remove(f: unknown): void;
        };
        if (popups.includes(frame)) {
          popups.remove(frame);
        }
        return remove();
      };
    }

    return frame;
  }

  /* --- cross-editor transfer --- */

  /** Move a panel to another editor's manager (same panel catalog — peers
   *  are editors of the same type).  Widget state travels via saveUIData;
   *  in this editor the panel becomes closed ("moved away"), so showPanel
   *  brings it back locally. */
  transferPanel(
    id: string,
    target: PanelManager<CTX>,
    side: PanelSide,
    opts?: { index?: number }
  ): void {
    if (target === this || !target.defs.has(id)) {
      return;
    }

    const srcPanel = this.panels.get(id);
    const uidata = srcPanel
      ? saveUIData(srcPanel as unknown as UIBase<CTX>, "panel:" + id)
      : this.pendingState.get(id)?.uidata;

    this._removeFromLayout(id);
    this.hiddenPanels.add(id);
    if (srcPanel) {
      srcPanel.style.display = "none";
    }

    target.hiddenPanels.delete(id);
    target.dockPanel(id, side, opts);

    if (uidata) {
      loadUIData(target.panels.get(id)! as unknown as UIBase<CTX>, uidata);
    }
  }

  /* --- drag interaction --- */

  /** Drop zones over the edges of the host editor, over docked panels
   *  (drop to group as tabs), and — for cross-editor transfer — the same
   *  zones of same-type peers.  Elements are appended to document.body. */
  private _makeDropZones(panel: DockPanel<CTX>): DropZone<CTX>[] {
    const zones: DropZone<CTX>[] = [];

    const targets: PanelManager<CTX>[] = [this];
    for (const peer of this.host.getPanelPeers?.() ?? []) {
      if (peer.host.panelLayoutEditable && peer.defs.has(panel.panelId)) {
        targets.push(peer);
      }
    }

    const mk = (
      kind: "edge" | "stack",
      pm: PanelManager<CTX>,
      side: PanelSide,
      x: number,
      y: number,
      w: number,
      h: number,
      targetId?: string
    ) => {
      //edge zones blue, tab-into zones green
      const rgb = kind === "edge" ? "90,140,230" : "80,200,120";
      const baseBg = `rgba(${rgb},0.25)`;

      const el = document.createElement("div");
      el.style.cssText =
        `position:fixed;left:${x}px;top:${y}px;width:${w}px;height:${h}px;` +
        `background:${baseBg};border:2px solid rgba(${rgb},0.7);` +
        `border-radius:4px;z-index:${kind === "edge" ? 299 : 300};pointer-events:none;`;
      document.body.appendChild(el);

      zones.push({ kind, side, pm, targetId, el, baseBg, hitBg: `rgba(${rgb},0.5)`, x, y, w, h });
    };

    for (const pm of targets) {
      const er = pm.host.getBoundingClientRect();
      const zw = Math.min(Math.max(er.width * 0.18, 48), 160);
      const zh = Math.min(Math.max(er.height * 0.18, 40), 120);

      const edge = (side: PanelSide, x: number, y: number, w: number, h: number) => {
        if (panel.canDock(side)) {
          mk("edge", pm, side, x, y, w, h);
        }
      };

      edge("left", er.x, er.y, zw, er.height);
      edge("right", er.x + er.width - zw, er.y, zw, er.height);
      edge("top", er.x, er.y, er.width, zh);
      edge("bottom", er.x, er.y + er.height - zh, er.width, zh);

      //tab-into zones: one per visible docked panel / tab group
      for (const side of PanelSides) {
        const r = pm.regions[side];
        if (r.hidden || r.mode === RegionMode.RAIL || !panel.canDock(side)) {
          continue;
        }

        for (const stack of r.stacks) {
          let el0: Element | undefined;
          let targetId: string | undefined;

          if (stack.mode === StackMode.TABS) {
            if (stack.ids.includes(panel.panelId)) {
              continue; //already in this group
            }
            el0 = stack.tabs;
            targetId = stack.active ?? stack.ids[0];
          } else {
            targetId = stack.ids[0];
            if (targetId === panel.panelId) {
              continue;
            }
            const p = pm.panels.get(targetId);
            if (!p || p.style.display === "none") {
              continue;
            }
            el0 = p;
          }

          if (!el0 || targetId === undefined) {
            continue;
          }

          const rect = el0.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) {
            continue;
          }

          mk("stack", pm, side, rect.x, rect.y, rect.width, rect.height, targetId);
        }
      }
    }

    //hit-testing prefers the more specific tab-into zones
    zones.sort((a, b) => Number(a.kind === "edge") - Number(b.kind === "edge"));

    return zones;
  }

  /** Dock, tab-into, or transfer depending on the drop zone hit. */
  private _dropOnZone(id: string, zone: DropZone<CTX>, x: number, y: number): void {
    if (zone.kind === "stack" && zone.targetId !== undefined) {
      if (zone.pm === this) {
        this.dockPanelInto(id, zone.targetId);
      } else {
        this.transferPanel(id, zone.pm, zone.side);
        zone.pm.dockPanelInto(id, zone.targetId);
      }
      return;
    }

    const index = zone.pm._dropIndex(zone.side, x, y);

    if (zone.pm === this) {
      this.dockPanel(id, zone.side, { index });
    } else {
      this.transferPanel(id, zone.pm, zone.side, { index });
    }
  }

  /* --- float tether (provenance affordance) --- */

  /** Outline the owning editor and draw a line to it from the frame. */
  private _showTether(frame: Container<CTX>) {
    this._hideTether();

    if (!this.host.ctx) {
      return;
    }

    const od = UIBase.createElement("overdraw-x") as Overdraw<CTX>;
    od.start(this._screen() as never);

    const fr = frame.getBoundingClientRect();
    const hr = this.host.getBoundingClientRect();

    od.rect([hr.x, hr.y], [hr.width, hr.height], "rgba(90,140,230,0.13)");
    od.line(
      [fr.x + fr.width * 0.5, fr.y + 14],
      [hr.x + hr.width * 0.5, hr.y + hr.height * 0.5],
      "rgba(90,140,230,0.8)"
    );

    this._tether = od;
  }

  private _hideTether() {
    this._tether?.end();
    this._tether = undefined;
  }

  /** Insertion index (among the region's stacks) for a drop at screen-space
   *  x/y — panels flow horizontally in top/bottom regions. */
  private _dropIndex(side: PanelSide, x: number, y: number): number {
    const r = this.regions[side];
    const horiz = side === "top" || side === "bottom";
    let index = 0;

    for (const stack of r.stacks) {
      const el =
        stack.mode === StackMode.TABS
          ? stack.tabs
          : (this.panels.get(stack.ids[0]) as HTMLElement | undefined);
      if (!el) {
        continue;
      }

      const rect = el.getBoundingClientRect();
      const past = horiz ? x > rect.x + rect.width * 0.5 : y > rect.y + rect.height * 0.5;
      if (past) {
        index++;
      }
    }

    return index;
  }

  /** Header drag on a docked panel: ghost + drop zones; drop on a zone
   *  docks, elsewhere floats (when allowed), Escape cancels. */
  _beginPanelDrag(panel: DockPanel<CTX>, e: PointerEvent): void {
    const id = panel.panelId;

    const ghost = document.createElement("div");
    ghost.style.cssText =
      "position:fixed;width:180px;height:30px;z-index:300;pointer-events:none;" +
      "background:rgba(128,128,128,0.6);border:1px solid rgba(0,0,0,0.5);" +
      "border-radius:4px;padding:4px 8px;font:12px sans-serif;overflow:hidden;";
    ghost.textContent = panel.def.title;
    document.body.appendChild(ghost);

    const zones = this._makeDropZones(panel);

    const hitZone = (x: number, y: number) =>
      zones.find((z) => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h);

    const place = (x: number, y: number) => {
      ghost.style.left = x + 8 + "px";
      ghost.style.top = y + 8 + "px";

      const hit = hitZone(x, y);
      for (const z of zones) {
        z.el.style.background = z === hit ? z.hitBg : z.baseBg;
      }
    };
    place(e.x, e.y);

    let modal: ModalState | undefined;

    const finish = (commit: boolean, e2?: MouseEvent) => {
      if (modal) {
        popModalLight(modal);
        modal = undefined;
      }
      ghost.remove();
      for (const z of zones) {
        z.el.remove();
      }

      if (!commit || !e2) {
        return;
      }

      const z = hitZone(e2.x, e2.y);

      if (z) {
        this._dropOnZone(id, z, e2.x, e2.y);
      } else if (panel.canFloat()) {
        this.floatPanel(id, { pos: [e2.x - 24, e2.y - 12] });
      }
    };

    //note: pointer (not mouse) handlers — preventDefault on the initiating
    //pointerdown suppresses the compatibility mouse event stream
    modal = pushModalLight({
      on_pointermove(e2: PointerEvent) {
        place(e2.x, e2.y);
      },
      on_pointerup(e2: PointerEvent) {
        finish(true, e2);
      },
      on_keydown(e2: KeyboardEvent) {
        if (e2.keyCode === eventKeymap["Escape"]) {
          finish(false);
        }
      },
    } as unknown as Record<string, unknown>);
  }

  /** Move a floating frame with the pointer; dropping on a dock zone
   *  re-docks the panel. */
  private _startFrameDrag(frame: Container<CTX>, panel: DockPanel<CTX>, e: PointerEvent): void {
    if (!this.host.panelLayoutEditable) {
      return;
    }

    const zones = this._makeDropZones(panel);
    let lastx = e.x;
    let lasty = e.y;
    let modal: ModalState | undefined;

    const hitZone = (x: number, y: number) =>
      zones.find((z) => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h);

    const finish = (commit: boolean, e2?: MouseEvent) => {
      if (modal) {
        popModalLight(modal);
        modal = undefined;
      }
      this._hideTether();
      for (const z of zones) {
        z.el.remove();
      }

      if (!commit || !e2) {
        return;
      }

      const z = hitZone(e2.x, e2.y);
      if (z) {
        this._dropOnZone(panel.panelId, z, e2.x, e2.y);
      }
    };

    //note: pointer (not mouse) handlers — preventDefault on the initiating
    //pointerdown suppresses the compatibility mouse event stream
    modal = pushModalLight({
      on_pointermove: (e2: PointerEvent) => {
        const rect = frame.getBoundingClientRect();
        frame.style.left = rect.x + (e2.x - lastx) + "px";
        frame.style.top = rect.y + (e2.y - lasty) + "px";
        lastx = e2.x;
        lasty = e2.y;

        //keep the ownership link visible while dragging
        this._showTether(frame);

        const hit = hitZone(e2.x, e2.y);
        for (const z of zones) {
          z.el.style.background = z === hit ? z.hitBg : z.baseBg;
        }
      },
      on_pointerup: (e2: PointerEvent) => {
        finish(true, e2);
      },
      on_keydown: (e2: KeyboardEvent) => {
        if (e2.keyCode === eventKeymap["Escape"]) {
          finish(false);
        }
      },
    } as unknown as Record<string, unknown>);
  }

  /** Arm a docked panel's title bar for drag-to-dock/float. */
  private _attachHeaderDrag(panel: DockPanel<CTX>): void {
    panel.titleframe.addEventListener("pointerdown", (e: PointerEvent) => {
      if (!this.host.panelLayoutEditable || (panel.def.flags ?? 0) & PanelFlags.PINNED) {
        return;
      }
      if (this.floating.has(panel.panelId)) {
        return; //the float frame header owns dragging there
      }

      const startx = e.x;
      const starty = e.y;
      const title = panel.titleframe;

      //keep move/up events routed here while below the drag threshold
      try {
        title.setPointerCapture(e.pointerId);
      } catch {
        /* pointer may be gone already */
      }

      const onmove = (e2: PointerEvent) => {
        const dx = e2.x - startx;
        const dy = e2.y - starty;

        if (dx * dx + dy * dy > 49) {
          cleanup(e2);
          this._beginPanelDrag(panel, e2);
        }
      };
      const cleanup = (e2?: PointerEvent) => {
        title.removeEventListener("pointermove", onmove as EventListener);
        title.removeEventListener("pointerup", cleanup as EventListener);
        try {
          title.releasePointerCapture((e2 ?? e).pointerId);
        } catch {
          /* already released */
        }
      };

      title.addEventListener("pointermove", onmove as EventListener);
      title.addEventListener("pointerup", cleanup as EventListener);
    });
  }

  private _defaultSide(def: PanelDef<CTX>): PanelSide {
    const dock = def.dock ?? "right";
    //floating defaults arrive with the floating implementation (phase 4)
    return dock === "float" ? "right" : dock;
  }

  private _findSide(id: string): PanelSide | undefined {
    return PanelSides.find((side) => this.regions[side].stacks.some((s) => s.ids.includes(id)));
  }

  private _removeFromLayout(id: string) {
    this._unfloat(id);

    for (const side of PanelSides) {
      const r = this.regions[side];
      let changed = false;

      for (let i = r.stacks.length - 1; i >= 0; i--) {
        const s = r.stacks[i];
        const j = s.ids.indexOf(id);
        if (j < 0) {
          continue;
        }

        s.ids.splice(j, 1);
        changed = true;

        if (s.ids.length === 0) {
          r.stacks.splice(i, 1);
        } else if (s.ids.length === 1) {
          //a tab group of one degrades to a plain rollout
          s.mode = StackMode.STACK;
        }
        if (s.active === id) {
          s.active = s.ids[0];
        }
      }

      if (changed) {
        this._rebuildRegion(r);
      }
    }
  }

  /** Rollout collapse changed on a docked panel: re-fit the panel and its
   *  region so a collapsed panel gives up its footprint. */
  _onPanelCollapse(panel: DockPanel<CTX>): void {
    const side = this._findSide(panel.panelId);
    if (!side) {
      return;
    }

    const r = this.regions[side];
    this._applyCollapseShrink(r, panel);
    this._updateRegion(r);
  }

  /** In a horizontal region a collapsed rollout shrinks to its header so
   *  siblings take the space; expanded panels stretch as before. */
  private _applyCollapseShrink(r: DockRegionRuntime<CTX>, panel: DockPanel<CTX>) {
    const horiz = r.side === "top" || r.side === "bottom";
    const shrink = horiz && panel.closed && r.mode === RegionMode.DOCKED;

    panel.style.width = shrink ? "fit-content" : "100%";
    panel.style.alignSelf = shrink ? "flex-start" : "";
    panel.style.flexGrow = shrink ? "0" : "";
  }

  /** True when every visible panel in a docked region is a collapsed
   *  rollout — the region then shrinks to its headers instead of r.size. */
  private _allPanelsCollapsed(r: DockRegionRuntime<CTX>): boolean {
    if (r.mode !== RegionMode.DOCKED) {
      return false;
    }

    let seen = false;
    for (const stack of r.stacks) {
      for (const id of stack.ids) {
        if (this.hiddenPanels.has(id)) {
          continue;
        }
        if (stack.mode === StackMode.TABS) {
          return false; //tab groups have no rollout collapse
        }
        const panel = this.panels.get(id);
        if (!panel || !panel.closed) {
          return false;
        }
        seen = true;
      }
    }

    return seen;
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

    //a collapsed rail shrinks to the bare tab bar; a docked region whose
    //panels are all collapsed rollouts shrinks to their headers
    const collapsed =
      (r.mode === RegionMode.RAIL && r.railCollapsed) || this._allPanelsCollapsed(r);

    if (r.side === "left" || r.side === "right") {
      c.style.setProperty("width", collapsed ? "auto" : r.size + "px", "important");
      c.style.removeProperty("height");
    } else {
      c.style.setProperty("height", collapsed ? "auto" : r.size + "px", "important");
      c.style.setProperty("width", "100%", "important");
    }
  }

  /** Rebuild a region's DOM from its stacks/mode; panels survive detached. */
  private _rebuildRegion(r: DockRegionRuntime<CTX>) {
    const c = r.container;
    if (!c) {
      return;
    }

    for (const [, panel] of this.panels) {
      if (c.shadow.contains(panel)) {
        HTMLElement.prototype.remove.call(panel);
        this._setTitleHidden(panel, false);
      }
    }

    r.grip?.remove();
    r.grip = undefined;

    c.clear();
    r.rail = undefined;
    r.stackWrap = undefined;
    for (const stack of r.stacks) {
      stack.tabs = undefined;
    }

    if (r.mode === RegionMode.RAIL && r.order.length > 0) {
      this._buildRail(r);
    } else {
      for (const stack of r.stacks) {
        if (stack.mode === StackMode.TABS) {
          this._buildTabStack(r, stack);
          continue;
        }

        for (const id of stack.ids) {
          const panel = this._ensurePanel(id);
          c.add(panel as unknown as Container<CTX>);
          this._setTitleHidden(panel, false);
          panel.style.display = this.hiddenPanels.has(id) ? "none" : "";
          this._applyCollapseShrink(r, panel);
        }
      }
    }

    this._addGrip(r);
    this._updateRegion(r);
  }

  /** Tabs presentation for one stack: one visible panel selected by a tab
   *  bar; panel title bars hide (the tabs are the headers).  Dragging a
   *  tab out of the bar detaches its panel into the drag-to-dock gesture. */
  private _buildTabStack(r: DockRegionRuntime<CTX>, stack: PanelStackRuntime<CTX>) {
    const c = r.container!;

    const visible = stack.ids.filter((id) => !this.hiddenPanels.has(id));
    if (visible.length === 0) {
      return;
    }

    const tc = UIBase.createElement("tabcontainer-x") as TabContainer<CTX>;
    tc.ctx = this.host.ctx;
    tc.setAttribute("bar_pos", "top");
    stack.tabs = tc;

    c._add(tc as unknown as UIBase<CTX>);
    tc._init();

    if (r.side === "left" || r.side === "right") {
      tc.style.setProperty("width", "100%", "important");
    } else {
      tc.style.setProperty("min-width", "0", "important");
      tc.style.setProperty("align-self", "stretch", "important");
    }
    tc.style.setProperty("flex-grow", "1", "important");
    tc.style.setProperty("min-height", "0", "important");

    for (const id of visible) {
      const panel = this._ensurePanel(id);
      const tab = tc.tab(this.defs.get(id)!.title, id);

      tab.add(panel as unknown as Container<CTX>);
      this._setTitleHidden(panel, true);
      panel.closed = false; //rollout collapse is meaningless without a header
      panel.style.display = "";
      this._applyCollapseShrink(r, panel);

      //dragging a tab out of the bar detaches its panel
      tab.ontabdragstart = (e: PointerEvent) => {
        e.preventDefault(); //suppress the tab bar's own reorder-drag
        this._beginTabDragOut(panel, e);
      };
    }

    if (stack.active === undefined || !visible.includes(stack.active)) {
      stack.active = visible[0];
    }
    tc.setActive(stack.active);

    //record tab switches so saves and rebuilds keep the active tab
    tc.onselect = (e: { tab?: { id?: unknown } }) => {
      const tabId = e?.tab?.id;
      if (tabId !== undefined && stack.ids.includes(String(tabId))) {
        stack.active = String(tabId);
      }
    };
  }

  /** Watch the pointer after a tab-bar press; past the drag threshold the
   *  tab's panel detaches into the normal drag-to-dock gesture. */
  private _beginTabDragOut(panel: DockPanel<CTX>, e: PointerEvent) {
    if (!this.host.panelLayoutEditable || (panel.def.flags ?? 0) & PanelFlags.PINNED) {
      return;
    }

    const startx = e.x;
    const starty = e.y;

    const onmove = (e2: PointerEvent) => {
      const dx = e2.x - startx;
      const dy = e2.y - starty;

      if (dx * dx + dy * dy > 49) {
        cleanup();
        this._beginPanelDrag(panel, e2);
      }
    };
    const cleanup = () => {
      document.removeEventListener("pointermove", onmove as EventListener, true);
      document.removeEventListener("pointerup", cleanup, true);
    };

    //capture phase: the tab bar's canvas handlers stopPropagation on move
    document.addEventListener("pointermove", onmove as EventListener, true);
    document.addEventListener("pointerup", cleanup, true);
  }

  /** Resize grip on the region's center-facing edge. */
  private _addGrip(r: DockRegionRuntime<CTX>) {
    const c = r.container;

    if (!c || !this.host.panelLayoutEditable || r.order.length === 0) {
      return;
    }

    c.style.setProperty("position", "relative", "important");

    const grip = document.createElement("div");
    const vert = r.side === "left" || r.side === "right";
    const anchor =
      r.side === "left"
        ? "right:0;"
        : r.side === "right"
          ? "left:0;"
          : r.side === "top"
            ? "bottom:0;"
            : "top:0;";

    grip.style.cssText =
      "position:absolute;z-index:10;background:transparent;" +
      (vert
        ? "top:0;bottom:0;width:6px;cursor:ew-resize;"
        : "left:0;right:0;height:6px;cursor:ns-resize;") +
      anchor;

    grip.addEventListener("pointerenter", () => {
      grip.style.background = "rgba(90,140,230,0.5)";
    });
    grip.addEventListener("pointerleave", () => {
      grip.style.background = "transparent";
    });
    grip.addEventListener("pointerdown", (e: PointerEvent) => {
      this._startGripDrag(r, e);
      e.preventDefault();
      e.stopPropagation();
    });

    c.shadow.appendChild(grip);
    r.grip = grip;
  }

  private _startGripDrag(r: DockRegionRuntime<CTX>, e: PointerEvent) {
    //a collapsed rail (or all-collapsed region) sizes to content;
    //nothing to resize
    if ((r.mode === RegionMode.RAIL && r.railCollapsed) || this._allPanelsCollapsed(r)) {
      return;
    }

    const startSize = r.size;
    const sx = e.x;
    const sy = e.y;

    let modal: ModalState | undefined;

    const finish = (commit: boolean) => {
      if (modal) {
        popModalLight(modal);
        modal = undefined;
      }
      if (!commit) {
        r.size = startSize;
        this._updateRegion(r);
      }
    };

    modal = pushModalLight({
      on_pointermove: (e2: PointerEvent) => {
        let delta = 0;

        switch (r.side) {
          case "left":
            delta = e2.x - sx;
            break;
          case "right":
            delta = sx - e2.x;
            break;
          case "top":
            delta = e2.y - sy;
            break;
          case "bottom":
            delta = sy - e2.y;
            break;
        }

        r.size = Math.min(Math.max(startSize + delta, 80), 2000);
        this._updateRegion(r);
      },
      on_pointerup: () => {
        finish(true);
      },
      on_keydown: (e2: KeyboardEvent) => {
        if (e2.keyCode === eventKeymap["Escape"]) {
          finish(false);
        }
      },
    } as unknown as Record<string, unknown>);
  }

  /** Build the rail presentation: an edge-aligned tab bar plus a wrap
   *  holding the panels (title bars hidden — the tabs are the headers). */
  private _buildRail(r: DockRegionRuntime<CTX>) {
    const c = r.container!;
    const horizRegion = r.side === "top" || r.side === "bottom";

    const inner = horizRegion ? c.col() : c.row();
    inner.noMarginsOrPadding();
    inner.style.setProperty("align-items", "stretch", "important");
    inner.style.setProperty("justify-content", "flex-start", "important");
    inner.style.setProperty("width", "100%", "important");
    inner.style.setProperty("height", "100%", "important");
    inner.style.setProperty("flex-grow", "1", "important");

    const wrap = inner.col();
    wrap.noMarginsOrPadding();
    wrap.style.setProperty("flex-grow", "1", "important");
    wrap.style.setProperty("overflow", "auto", "important");
    wrap.style.setProperty("min-width", "0", "important");
    r.stackWrap = wrap;

    const rail = UIBase.createElement("tabbar-x") as TabBar<CTX>;
    rail.ctx = this.host.ctx;
    rail.setAttribute("bar_pos", r.side);
    r.rail = rail;

    //the rail sits flush against the editor's edge
    if (r.side === "left" || r.side === "top") {
      inner._prepend(rail as unknown as UIBase<CTX>);
    } else {
      inner._add(rail as unknown as UIBase<CTX>);
    }

    const visibleIds = r.order.filter((id) => !this.hiddenPanels.has(id));

    if (!r.activeRail || !visibleIds.includes(r.activeRail)) {
      r.activeRail = visibleIds[0];
    }

    let railIgnore = false;

    for (const id of visibleIds) {
      rail.addTab(this.defs.get(id)!.title, id);
    }

    rail.onselect = (e) => {
      if (railIgnore) {
        return;
      }
      const tab = e.tab ?? rail.tabs.active;
      if (tab) {
        this._onRailTabClick(r, String(tab.id));
      }
    };

    //reflect the active panel without re-firing onselect
    const active = rail.tabs.find((t) => String(t.id) === r.activeRail);
    if (active) {
      railIgnore = true;
      rail.setActive(active);
      railIgnore = false;
    }

    for (const id of r.order) {
      const panel = this._ensurePanel(id);
      wrap.add(panel as unknown as Container<CTX>);
      this._setTitleHidden(panel, true);
      panel.closed = false; //rollout collapse is meaningless without a header
      this._applyCollapseShrink(r, panel);
    }

    this._applyRailState(r);
  }

  /** Sync panel/wrap visibility with railCollapsed + activeRail. */
  private _applyRailState(r: DockRegionRuntime<CTX>) {
    if (r.mode !== RegionMode.RAIL || !r.stackWrap) {
      this._updateRegion(r);
      return;
    }

    r.stackWrap.style.setProperty("display", r.railCollapsed ? "none" : "flex", "important");

    for (const id of r.order) {
      const panel = this.panels.get(id);
      if (!panel) {
        continue;
      }
      const shown = !r.railCollapsed && id === r.activeRail && !this.hiddenPanels.has(id);
      panel.style.display = shown ? "" : "none";
    }

    if (r.rail && r.activeRail) {
      const active = r.rail.tabs.find((t) => String(t.id) === r.activeRail);
      if (active && r.rail.tabs.active !== active) {
        r.rail.setActive(active);
      }
    }

    this._updateRegion(r);
  }

  /** Rail tab click: expand-with-panel / switch / collapse-on-active. */
  private _onRailTabClick(r: DockRegionRuntime<CTX>, id: string) {
    if (r.railCollapsed) {
      r.railCollapsed = false;
      r.activeRail = id;
    } else if (r.activeRail === id) {
      r.railCollapsed = true;
    } else {
      r.activeRail = id;
    }

    this._applyRailState(r);
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
    panel.contents.ctx = this.host.ctx;
    panel.setAttribute("label", def.title);

    this.panels.set(id, panel);

    //build into the panel's contents (as container.panel() returns), so the
    //widgets live inside the collapsible PanelContents; building on the panel
    //itself routes through forwardContainerMethods, which lands them in the
    //panel's shadow beside contents where rollout-collapse can't hide them.
    def.build(panel.contents as unknown as Container<CTX>, panel);

    //content size constraints; oversize content scrolls inside the panel
    const [minW, minH] = def.minSize ?? [];
    const [maxW, maxH] = def.maxSize ?? [];
    const cs = panel.contents.style;

    if (minW !== undefined) {
      cs.minWidth = minW + "px";
    }
    if (minH !== undefined) {
      cs.minHeight = minH + "px";
    }
    if (maxW !== undefined) {
      cs.maxWidth = maxW + "px";
    }
    if (maxH !== undefined) {
      cs.maxHeight = maxH + "px";
    }
    if (maxW !== undefined || maxH !== undefined) {
      cs.overflow = "auto";
    }

    this._attachHeaderDrag(panel);

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
