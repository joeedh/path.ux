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
 * Implementation status: DRAFT — types and signatures only.  Interaction
 * (drag/dock/float) and layout DOM management are later phases; unimplemented
 * methods throw.
 */

import { Container } from "../core/ui";
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
  /** Root container the dock regions attach around; the editor's content. */
  getPanelRoot(): Container<CTX>;
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
 * Widgets (skeletons; not registered until implemented)
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

/**
 * Owns dock regions, floating panels, the panel catalog, and (later) the
 * drag/drop interaction.  Not a widget: it manages DOM inside the host.
 */
export class PanelManager<CTX extends IContextBase = IContextBase> {
  readonly host: IPanelHost<CTX>;
  /** Catalog registered by definePanels(); keyed by panel id. */
  readonly defs = new Map<string, PanelDef<CTX>>();
  /** Live panel widgets, created lazily; keyed by panel id. */
  readonly panels = new Map<string, DockPanel<CTX>>();

  constructor(host: IPanelHost<CTX>) {
    this.host = host;
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

  /* --- imperative layout control --- */

  /** Move a panel into an edge region.  index positions it in the stack. */
  dockPanel(id: string, side: PanelSide, opts?: { stack?: number; index?: number }): void {
    throw new Error("TODO: PanelManager.dockPanel");
  }

  /** Float a panel at rect (screen space); defaults to def.floatRect. */
  floatPanel(id: string, rect?: { pos: [number, number]; size: [number, number] }): void {
    throw new Error("TODO: PanelManager.floatPanel");
  }

  /** Close (hide) a panel; its state is retained. */
  closePanel(id: string): void {
    throw new Error("TODO: PanelManager.closePanel");
  }

  /** Re-show a closed panel at its last location. */
  showPanel(id: string): void {
    throw new Error("TODO: PanelManager.showPanel");
  }

  /** Discard the current layout and rebuild from the catalog's defaults. */
  resetLayout(): void {
    throw new Error("TODO: PanelManager.resetLayout");
  }

  /* --- per-edge visibility (hotkey-bindable by editors) --- */

  hideEdge(side: PanelSide): void {
    throw new Error("TODO: PanelManager.hideEdge");
  }

  showEdge(side: PanelSide): void {
    throw new Error("TODO: PanelManager.showEdge");
  }

  /** In rail mode this collapses to the bare rail instead of hiding it. */
  toggleEdge(side: PanelSide): void {
    throw new Error("TODO: PanelManager.toggleEdge");
  }

  isEdgeHidden(side: PanelSide): boolean {
    throw new Error("TODO: PanelManager.isEdgeHidden");
  }

  /** Switch a region between inline-docked and rail presentation. */
  setEdgeMode(side: PanelSide, mode: number): void {
    throw new Error("TODO: PanelManager.setEdgeMode");
  }

  /* --- serialization --- */

  /**
   * Snapshot the layout, including per-panel saveUIData blobs.  Editors call
   * this from a computed STRUCT field.
   */
  saveLayout(): PanelLayoutState {
    throw new Error("TODO: PanelManager.saveLayout");
  }

  /**
   * Apply a deserialized layout.  Must run after definePanels() has filled
   * the catalog; validates ids against it (unknown ids dropped, missing ids
   * placed at their defaults).
   */
  loadLayout(state: PanelLayoutState): void {
    throw new Error("TODO: PanelManager.loadLayout");
  }
}
