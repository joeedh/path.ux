import { UIBase } from "../../core/ui_base";
import type { UIBaseDefinition } from "../../core/ui_base";
import type { Vector2 } from "../../path-controller/util/vectormath";
import { Container } from "../../core/ui";
import { IContextBase } from "../../core/context_base";
// The plain imports keep the widget modules' module-scope internalRegister
// calls; a type-only use would let the transpiler elide them.
import "../../widgets/ui_panzoom";
import "./linkcanvas";
import type { PanZoomContainer } from "../../widgets/ui_panzoom";
import {
  PackNode,
  PackNodeVertex,
  graphGetIslands,
  graphPack,
} from "../../path-controller/util/graphpack";
import { Graph } from "../../graph/graph";
import { GroupInputNode, GroupNode, GroupOutputNode } from "../../graph/group";
import type { GroupDef } from "../../graph/group";
import { Node as GraphNode } from "../../graph/node";
import type { NodePropName } from "../../graph/node";
import type { GraphId, SocketDir } from "../../graph/graph_types";
import { HotKey } from "../../path-controller/util/simple_events";
import type { CSSFont } from "../../core/cssfont";
import { NodeFrame, socketAnchor, socketRow } from "./nodeframe";
import type { FrameMove } from "./nodeframe";
import { linkDistance } from "./linkcanvas";
import type { LinkCanvas, LinkSegment } from "./linkcanvas";
import { AsyncGateOp, ToolOpDelegate } from "./delegate";
import type { GraphContext, GraphEdit, NodeGraphDelegate, NodeMove } from "./delegate";
import { LinkDrag } from "./linkdrag";
import { BoxSelectModalOp, LinkDragModalOp, NodeMoveModalOp } from "./gesture_ops";
import { buildAddNodeMenu } from "./addmenu";
import { Menu } from "../../menu/menu";
import type { MenuTemplate } from "../../menu/menu_types";
import { createMenu, startMenu } from "../../menu/menu_ops";
import { t } from "../../core/theme_schema";
import { buildAddSocketRow, buildForwardedUI, forwardedSignature } from "./groupui";

/** One step of the view's descent: a group node, and which of its two graphs it leads into. */
export interface DescentEntry {
  nodeId: GraphId;
  into: "instance" | "definition";
}

/** The view state an embedding editor persists: camera plus descent stack. */
export interface NodeGraphViewState {
  pan: [number, number];
  zoom: number;
  descent: DescentEntry[];
}

/**
 * What the view is showing: the root graph, a definition whose edits reach every
 * instance, or one instance shown for its values only. An instance nested inside
 * another instance's copy carries no definition of its own.
 */
export type Level =
  | { kind: "root" }
  | { kind: "definition"; node: GroupNode; ref: string; def: GroupDef }
  | { kind: "instance"; node: GroupNode; ref: string; def: GroupDef | undefined };

/** Two title-bar presses on one frame within this window enter the group. */
export const DOUBLE_PRESS_MS = 350;

/** The text of the pill after the crumb trail, per level kind. */
export const LEVEL_PILL_TEXT = {
  definition: "definition · edits reach every instance",
  instance  : "instance · values only",
} as const;

/**
 * What a definition edit must change for its instances to need reconciling: node
 * identity, sockets and links, plus the exposed rows. Positions are left out, so a
 * drag inside a definition is carried by the exit pass rather than saved per frame.
 */
function definitionSignature(def: GroupDef): string {
  const parts: unknown[] = [];
  for (const n of def.subgraph.nodes) {
    parts.push(n.id, n.def.typeName, n.label ?? "");
    parts.push(Object.keys(n.inputs).join(","), Object.keys(n.outputs).join(","));
    for (const key in n.inputs) {
      for (const e of n.inputs[key].edges) {
        parts.push(`${String(e.owningNode?.id)}:${e.name}>${String(n.id)}:${key}`);
      }
    }
  }
  for (const e of def.exposed) {
    parts.push(e.kind, e.nodeId, e.propKey, e.label);
  }
  return JSON.stringify(parts);
}

/** One resolved step of a descent: the entry, its group node, and the graph it leads into. */
interface DescentStep {
  entry: DescentEntry;
  node: GroupNode;
  graph: Graph;
}

/** One link, named by its two endpoints. */
export interface LinkRef {
  srcNode: GraphId;
  srcSocket: string;
  dstNode: GraphId;
  dstSocket: string;
}

/** Screen-pixel radius within which a press picks a link. */
export const LINK_PICK_PX = 18;

/** Identifies a link across a rebuild, for the view's link selection. */
/** The prop key of the frame's prop row under a pointer event, if it sits on one. */
function propRowKey(e: Event): NodePropName | undefined {
  for (const el of e.composedPath()) {
    if (el instanceof HTMLElement && el.classList.contains("nodeeditor-prop-row")) {
      const key = el.dataset.propKey;
      return key === undefined ? undefined : (key as unknown as NodePropName);
    }
  }
  return undefined;
}

function isProxy(node: GraphNode): node is GroupInputNode | GroupOutputNode {
  return node instanceof GroupInputNode || node instanceof GroupOutputNode;
}

export function linkKey(ref: LinkRef): string {
  return JSON.stringify([ref.srcNode, ref.srcSocket, ref.dstNode, ref.dstSocket]);
}

type ViewGraphContext<CTX extends IContextBase> = CTX & GraphContext;

/**
 * Main node node graph widget. It is a plain internally-registered widget, so any
 * host — an Area subclass, a dialog, a dock panel — can create and embed one.
 * Drag gestures (node move, box select, link drag) run as modal ToolOps the
 * view spawns on pointerdown; see gesture_ops.ts. Every mutating gesture
 * routes through {@link delegate}; the view itself never writes the graph.
 */
export class NodeGraphView<CTX extends IContextBase = IContextBase> extends Container<
  CTX,
  "NodeGraphView"
> {
  declare graphContext: ViewGraphContext<CTX>;
  delegate: NodeGraphDelegate = new ToolOpDelegate();

  graphPath = "";
  rootGraph: Graph | undefined = undefined;

  /** The steps from the root graph down to the graph on screen. */
  descent: DescentEntry[] = [];

  /**
   * The save-and-resolve pass in flight, if any: the definition being edited is
   * saved through the root graph's groupSaver and every instance reconciled. Awaited
   * by a caller that needs the instances current.
   */
  pendingResolve: Promise<void> | undefined = undefined;

  /** Why the last dispatched edit was refused; a host shows it beside the control that asked. */
  lastRefusal: string | undefined = undefined;

  selection = new Set<GraphId>();

  /** The selected links, by {@link linkKey}; pruned against the live graph. */
  linkSelection = new Set<string>();

  frames = new Map<GraphId, NodeFrame<CTX>>();

  panzoom!: PanZoomContainer<CTX>;
  links!: LinkCanvas<CTX>;
  linkDrag!: LinkDrag<CTX>;

  private _crumbs!: HTMLDivElement;
  private _pendingView: NodeGraphViewState | undefined = undefined;

  /** The links on screen, kept for picking; rebuilt with every repaint. */
  private _linkRefs: { ref: LinkRef; seg: LinkSegment }[] = [];

  /** A selection change a press on an already-selected node put off, in case
   *  the press turns into a drag; a click without a drag applies it. */
  private _pendingSelect: { id: GraphId; shift: boolean } | undefined = undefined;

  /** The last title-bar click, for the double press that enters a group. */
  private _lastPress: { id: GraphId; at: number } | undefined = undefined;

  /** The definition signature the current level was last reconciled at. */
  private _defSig = "";

  /** Instances a root-level resolve was already attempted for, so a failed load does not retry per notification. */
  private _resolveTried = new WeakSet<GroupNode>();

  /** The forwarded-UI signature each group frame was built with. */
  private _forwardedSigs = new WeakMap<NodeFrame<CTX>, string>();

  static define(): UIBaseDefinition {
    return {
      tagname: "nodegraphview-x",
      style  : "nodegraphview",
      theme: {
        "background-color"  : t.color,
        BoxSelectBorder     : t.color,
        BoxSelectBG         : t.color,
        // Read by the editor shell for the group designer's missing-entry flag.
        ErrorColor          : t.color,
        CrumbBG             : t.color,
        CrumbFont           : t.font,
        CrumbActiveFont     : t.font,
        LevelDefinitionColor: t.color,
        LevelInstanceColor  : t.color,
      },
    };
  }

  private wrapGraphContext(ctx: any) {
    const handlers = {
      toLocked:
        this.ctx.toLocked !== undefined
          ? () => {
              return this.wrapGraphContext(this.ctx.toLocked!());
            }
          : undefined,
      selectNodes: (ids: GraphId[]) => {
        for (const id of ids) {
          this.selection.add(id);
        }
      },
      deselectNodes: (ids: GraphId[]) => {
        for (const id of ids) {
          this.selection.delete(id);
        }
      },
      selectLinks: (ids: string[]) => {
        for (const id of ids) {
          this.linkSelection.add(id as string);
        }
      },
      deselectLinks: (ids: string[]) => {
        for (const id of ids) {
          this.linkSelection.delete(id as string);
        }
      },
      clearSelection: () => {
        this.selection.clear();
        this.linkSelection.clear();
      },
      selectAll: () => {
        // TODO: links? not sure

        const currentGraph = this.currentGraph;
        if (currentGraph === undefined) {
          return;
        }
        this.selection.clear();
        for (const node of currentGraph.nodes) {
          this.selection.add(node.id);
        }
      },
    };

    return new Proxy(ctx, {
      get: (target: any, prop: string | symbol) => {
        if (prop in handlers) {
          return (handlers as any)[prop];
        }
        return target[prop];
      },
      set: (target: any, prop: string | symbol, value: any) => {
        if (prop in handlers) {
          return false;
        }
        target[prop] = value;
        return true;
      },
    }) as unknown as ViewGraphContext<CTX>;
  }

  private checkGraphContext() {
    if (this.graphContext) {
      return;
    }

    this.graphContext = this.wrapGraphContext(this.ctx);
  }

  init() {
    super.init();

    this.checkGraphContext();

    this.style.display = "flex";
    this.style.flexDirection = "column";
    this.style.width = "100%";
    this.style.height = "100%";

    this._crumbs = document.createElement("div");
    this._crumbs.className = "nodeeditor-crumbs";
    this._crumbs.style.cssText =
      "display: flex; gap: 2px; padding: 2px 6px; align-items: center; flex: 0 0 auto;";
    this.shadow.appendChild(this._crumbs);

    this.panzoom = UIBase.createElement("panzoom-x") as PanZoomContainer<CTX>;
    this.panzoom.parentWidget = this;
    this.shadow.appendChild(this.panzoom);
    this.panzoom.ctx = this.ctx;
    this.panzoom._init();
    this.panzoom.style.flexGrow = "1";
    this.panzoom.style.minHeight = "0";

    this.links = UIBase.createElement("nodelinkcanvas-x") as LinkCanvas<CTX>;
    this.links.ctx = this.ctx;
    this.panzoom.addUnderlay(this.links);
    this.links._init();

    this.panzoom.addEventListener("transform", () => this._redrawLinks());

    this.panzoom.addEventListener("pointerdown", (e: PointerEvent) => this._boxDown(e));

    this.linkDrag = new LinkDrag(this);

    if (this._pendingView !== undefined) {
      const v = this._pendingView;
      this._pendingView = undefined;
      this.descent = [...v.descent];
      this._defSig = this._levelSignature();
      this.panzoom.setTransform(v.zoom, v.pan);
    }

    this._rebuildCrumbs();
    this.setCSS();
    this.syncGraph();
  }

  /** Applies the themed canvas background; a live theme edit re-runs it. */
  setCSS() {
    super.setCSS();
    // Container's styletag targets div.containerx, which never matches the host.
    this.style.backgroundColor = this.getDefault("background-color") as string;
    if (this._crumbs !== undefined) {
      this._rebuildCrumbs();
    }
  }

  /** Points the view at a graph; graphPath is the datapath edits dispatch against. */
  setGraph(graph: Graph | undefined, graphPath: string) {
    this.rootGraph = graph;
    this.graphPath = graphPath;
    this._setDescent([]);
  }

  /**
   * Re-points the view at a fresh parse of the graph already on screen — same file, new object —
   * keeping selection, descent and pan/zoom, and reconciling frames by node id via `syncGraph`
   * rather than tearing every one down. Use `setGraph` to point at a different graph instead.
   */
  refreshGraph(graph: Graph | undefined) {
    this.rootGraph = graph;
    this._refresh();
  }

  /**
   * Resolves the descent step by step. Stops short where an entry names no group
   * node in its graph, or a definition entry whose instance has not resolved.
   */
  private _walk(descent: readonly DescentEntry[] = this.descent): {
    steps: DescentStep[];
    complete: boolean;
  } {
    const steps: DescentStep[] = [];
    let g = this.rootGraph;
    for (const entry of descent) {
      const node = g?.nodeIdMap.get(entry.nodeId);
      if (!(node instanceof GroupNode)) {
        return { steps, complete: false };
      }
      const into = entry.into === "definition" ? node.definition?.subgraph : node.subgraph;
      if (into === undefined) {
        return { steps, complete: false };
      }
      steps.push({ entry, node, graph: into });
      g = into;
    }
    return { steps, complete: true };
  }

  /** The graph on screen; undefined while a descent entry no longer resolves. */
  get currentGraph(): Graph | undefined {
    const walk = this._walk();
    if (!walk.complete) {
      return undefined;
    }
    const tail = walk.steps[walk.steps.length - 1];
    return tail !== undefined ? tail.graph : this.rootGraph;
  }

  /** The datapath of the graph on screen, descending .nodes[id].group or .nodes[id].definition per entry. */
  get currentGraphPath(): string {
    let path = this.graphPath;
    for (const entry of this.descent) {
      path += `.nodes[${JSON.stringify(entry.nodeId)}].${entry.into === "definition" ? "definition" : "group"}`;
    }
    return path;
  }

  /** What the view is showing. A descent that no longer resolves reads as the root until it is repaired. */
  currentLevel(): Level {
    const walk = this._walk();
    const tail = walk.steps[walk.steps.length - 1];
    if (!walk.complete || tail === undefined) {
      return { kind: "root" };
    }
    const node = tail.node;
    if (tail.entry.into === "definition") {
      return { kind: "definition", node, ref: node.ref, def: node.definition! };
    }
    return { kind: "instance", node, ref: node.ref, def: node.definition };
  }

  /**
   * Enters a group's definition, where structural edits reach every instance. A
   * definition level being left is saved and its instances reconciled first; the
   * returned promise is that pass. From the instance level of the same node the
   * instance entry is replaced rather than nested. Refused, resolving at once, for a
   * node that is no group, is not on screen, or has no resolved definition.
   */
  enterDefinition(node: GraphNode): Promise<void> {
    if (!(node instanceof GroupNode) || node.definition === undefined) {
      return this._settled();
    }
    const level = this.currentLevel();
    const replacing = level.kind === "instance" && level.node === node;
    if (!replacing && this.currentGraph?.nodeIdMap.get(node.id) !== node) {
      return this._settled();
    }

    const pass = this._leavePass();
    const next = replacing ? this.descent.slice(0, -1) : [...this.descent];
    next.push({ nodeId: node.id, into: "definition" });
    this._setDescent(next);
    return pass;
  }

  /** Shows a group instance's own subgraph, for the values it overrides; structural edits are refused there. */
  enterInstance(node: GraphNode): Promise<void> {
    if (!(node instanceof GroupNode) || this.currentGraph?.nodeIdMap.get(node.id) !== node) {
      return this._settled();
    }
    const pass = this._leavePass();
    this._setDescent([...this.descent, { nodeId: node.id, into: "instance" }]);
    return pass;
  }

  /** Leaves the level on screen for the one above it; a definition is saved and propagated on the way out. */
  exitLevel(): Promise<void> {
    return this.popTo(this.descent.length - 1);
  }

  /** Returns to depth entries of descent; popTo(0) shows the root graph. */
  popTo(depth: number): Promise<void> {
    depth = Math.min(Math.max(depth, 0), this.descent.length);
    if (depth === this.descent.length) {
      return this._settled();
    }
    const pass = this._leavePass();
    this._setDescent(this.descent.slice(0, depth));
    return pass;
  }

  /**
   * Tab's behaviour: with exactly one group selected, enters its definition; with
   * no group selected, leaves the current level. Any other selection does nothing.
   */
  enterOrExit(): Promise<void> {
    const graph = this.currentGraph;
    const groups: GroupNode[] = [];
    for (const nid of this.selection) {
      const node = graph?.nodeIdMap.get(nid);
      if (node instanceof GroupNode) {
        groups.push(node);
      }
    }
    if (groups.length === 1) {
      return this.enterDefinition(groups[0]);
    }
    if (groups.length === 0) {
      return this.exitLevel();
    }
    return this._settled();
  }

  /** The pass in flight, or an already-settled promise. */
  private _settled(): Promise<void> {
    return this.pendingResolve ?? Promise.resolve();
  }

  /** The pass a level being left owes: a definition saves and propagates, anything else owes nothing. */
  private _leavePass(): Promise<void> {
    const level = this.currentLevel();
    return level.kind === "definition" ? this._runPass(level) : this._settled();
  }

  /**
   * Saves def through the root graph's groupSaver (when the level is a definition),
   * reconciles every instance through resolveGroups, then repaints and notifies the
   * root path so another view of the same graph redraws too. Passes queue behind one
   * another, so two never interleave; a failure is reported, not thrown.
   */
  private _runPass(def?: { ref: string; def: GroupDef }): Promise<void> {
    const root = this.rootGraph;
    const ctx = this.ctx;
    if (root === undefined || ctx === undefined) {
      return this._settled();
    }

    const run = async () => {
      try {
        if (def !== undefined && root.groupSaver !== undefined) {
          await root.groupSaver(def.ref, def.def);
        }
        await root.resolveGroups();
      } catch (err) {
        console.warn(err instanceof Error ? err.message : String(err));
      }
      if (this.rootGraph === root) {
        this.syncGraph();
      }
      ctx.api.notifyChange(this.graphPath);
    };

    const pass = this._settled().then(run);
    this.pendingResolve = pass;
    const clear = () => {
      if (this.pendingResolve === pass) {
        this.pendingResolve = undefined;
      }
    };
    void pass.then(clear, clear);
    return pass;
  }

  /** Replaces the descent, drops the selection, repaints and announces the level. */
  private _setDescent(descent: DescentEntry[]) {
    this.descent = descent;
    this.selection.clear();
    this.linkSelection.clear();
    this._lastPress = undefined;
    this._defSig = this._levelSignature();

    // Node ids repeat across levels, and a frame's extra UI is built once, so
    // every frame is rebuilt for the level rather than reused by id.
    for (const frame of this.frames.values()) {
      frame.remove();
    }
    this.frames.clear();

    this._refresh();
    this.dispatchEvent(new CustomEvent("levelchange", { detail: this.currentLevel() }));
  }

  /** The definition signature of the level on screen; empty off a definition. */
  private _levelSignature(): string {
    const level = this.currentLevel();
    return level.kind === "definition" ? definitionSignature(level.def) : "";
  }

  /**
   * Drops the descent entries that no longer resolve: undo and delete are global,
   * so the instance a level rests on can vanish while the author is inside it.
   */
  private _repairDescent(): boolean {
    const walk = this._walk();
    if (walk.complete) {
      return false;
    }
    this._setDescent(this.descent.slice(0, walk.steps.length));
    return true;
  }

  /**
   * The watch's reaction to a graph op, or its undo or redo. Inside a definition, a
   * change to its signature starts the save-and-resolve pass; at the root, a newly
   * added instance with a ref and no definition gets one resolve attempt.
   */
  private _onGraphNotified() {
    if (this._repairDescent()) {
      return;
    }
    this._checkLevel();
    this.syncGraph();
  }

  private _checkLevel() {
    const level = this.currentLevel();
    if (level.kind === "definition") {
      const sig = definitionSignature(level.def);
      if (sig !== this._defSig) {
        this._defSig = sig;
        void this._runPass(level);
      }
    } else if (level.kind === "root") {
      this._resolveNewInstances();
    }
  }

  private _resolveNewInstances() {
    const root = this.rootGraph;
    if (root === undefined) {
      return;
    }
    let found = false;
    for (const node of root.nodes) {
      if (
        node instanceof GroupNode &&
        node.ref !== "" &&
        node.definition === undefined &&
        !this._resolveTried.has(node)
      ) {
        this._resolveTried.add(node);
        found = true;
      }
    }
    if (found) {
      void this._runPass();
    }
  }

  getViewState(): NodeGraphViewState {
    const descent = this.descent.map((e) => ({ ...e }));
    if (this.panzoom !== undefined) {
      const t = this.panzoom.transform;
      return { pan: [t.pan[0], t.pan[1]], zoom: t.scale, descent };
    }
    return this._pendingView ?? { pan: [0, 0], zoom: 1, descent };
  }

  /** Restores a persisted view state; safe to call before init runs. */
  setViewState(state: NodeGraphViewState) {
    const descent = state.descent.map((e) => ({ ...e }));
    if (this.panzoom !== undefined) {
      this.panzoom.setTransform(state.zoom, state.pan);
      this._setDescent(descent);
    } else {
      this._pendingView = {
        pan : [state.pan[0], state.pan[1]],
        zoom: state.zoom,
        descent,
      };
      this.descent = descent;
    }
  }

  /** Reacts to a graph op — or its undo/redo — notifying the graph on screen. */
  override watchPath(): void {
    super.watchPath();
    if (this.graphPath !== "") {
      this.addPathWatch(this.currentGraphPath, { onChange: () => this._onGraphNotified() });
    }
  }

  /** A view leaving the document while inside a definition saves it on the way out. */
  override on_remove(): void {
    super.on_remove();
    const level = this.currentLevel();
    if (level.kind === "definition") {
      void this._runPass(level);
    }
  }

  private _refresh() {
    if (this.panzoom === undefined) {
      return;
    }
    // The watched path follows graphPath and descent; the next update() rebuilds it.
    this.clearPathWatches();
    this._rebuildCrumbs();
    this.syncGraph();
  }

  /**
   * The crumb trail — Graph ▸ group ▸ group, each a text button back to that
   * level — followed by a pill naming the level, and the level band on the canvas.
   */
  private _rebuildCrumbs() {
    const row = this._crumbs;
    row.textContent = "";
    row.style.background = this.getDefault("CrumbBG") as string;

    const font = this.getDefault("CrumbFont") as CSSFont;
    const activeFont = this.getDefault("CrumbActiveFont") as CSSFont;
    const walk = this._walk();
    const names = ["Graph", ...walk.steps.map((s) => s.node.getUIName())];

    names.forEach((name, depth) => {
      if (depth > 0) {
        const sep = document.createElement("span");
        sep.textContent = "▸";
        sep.style.cssText = `font: ${font.genCSS()}; color: ${font.color}; opacity: 0.5; padding: 0 2px;`;
        row.appendChild(sep);
      }

      const last = depth === names.length - 1;
      const btn = document.createElement("button");
      btn.className = "nodeeditor-crumb";
      btn.textContent = name;
      btn.title = depth === 0 ? "Show the root graph" : `Go back to ${name}`;
      btn.style.cssText = "background: none; border: none; padding: 0 2px; cursor: pointer;";
      btn.style.font = (last ? activeFont : font).genCSS();
      btn.style.color = (last ? activeFont : font).color;
      btn.addEventListener("click", () => void this.popTo(depth));
      row.appendChild(btn);
    });

    const level = this.currentLevel();
    if (level.kind === "root") {
      this.panzoom.style.outline = "";
      return;
    }

    const color = this.getDefault(
      level.kind === "definition" ? "LevelDefinitionColor" : "LevelInstanceColor"
    ) as string;

    const pill = document.createElement("span");
    pill.className = "nodeeditor-level-pill";
    pill.textContent = LEVEL_PILL_TEXT[level.kind];
    pill.style.cssText =
      `margin-left: 8px; padding: 0 8px; border-radius: 9px; border: 1px solid ${color}; ` +
      `font: ${font.genCSS()}; color: ${color}; white-space: nowrap;`;
    row.appendChild(pill);

    if (level.kind === "definition") {
      pill.title =
        "Changes here are saved to the group's definition and reach every instance of it";
    } else if (level.def !== undefined) {
      pill.title = "This instance's own values; its structure belongs to the definition";
      const edit = document.createElement("button");
      edit.className = "nodeeditor-crumb";
      edit.textContent = "edit the definition";
      edit.title = "Open this group's definition, where its structure is edited";
      edit.style.cssText =
        `background: none; border: none; padding: 0 6px; cursor: pointer; ` +
        `font: ${font.genCSS()}; color: ${color}; text-decoration: underline;`;
      edit.addEventListener("click", () => void this.enterDefinition(level.node));
      row.appendChild(edit);
    } else {
      pill.title =
        "The definition is not loaded at this depth; edit it from the graph that holds this group";
    }

    // The level band: an inset outline on the canvas, at the edges where it does not compete with the frames.
    this.panzoom.style.outline = `2px solid ${color}`;
    this.panzoom.style.outlineOffset = "-2px";
  }

  /**
   * Reconciles frames against the graph on screen; call after any graph change. A frame is kept
   * across a reparse as long as its node's id still exists — `setNode` points it at the new
   * object, and `syncContents` rebuilds only what actually changed — so swapping in an
   * independently-parsed but value-equal graph does not tear every frame down.
   */
  syncGraph() {
    const graph = this.currentGraph;

    for (const [nid, frame] of [...this.frames]) {
      if (graph?.nodeIdMap.get(nid) === undefined) {
        frame.remove();
        this.frames.delete(nid);
      }
    }

    if (graph === undefined) {
      this._redrawLinks();
      return;
    }

    const level = this.currentLevel();
    for (const node of graph.nodes) {
      const existing = this.frames.get(node.id);
      if (existing !== undefined) {
        existing.setNode(node);
        if (node instanceof GroupNode) {
          // The definition can arrive, or change, under a frame that stays.
          const sig = forwardedSignature(node);
          if (this._forwardedSigs.get(existing) !== sig) {
            this._forwardedSigs.set(existing, sig);
            existing.rebuildExtraUI();
          }
        }
        continue;
      }

      const frame = UIBase.createElement("nodeframe-x") as NodeFrame<CTX>;
      frame.setNode(node);
      frame.getScale = () => this.panzoom.transform.scale;
      frame.onSelect = (f, e) => this._selectFrame(f, e);
      frame.onMoveStart = (f, e) =>
        this.ctx.toolstack.execTool(
          this.ctx,
          new NodeMoveModalOp(this._dragSet(f, e.shiftKey), e),
          e
        );
      frame.onMoveClick = (f) => this._clickFrame(f);
      frame.onMovePreview = (fs) => this._previewMove(fs);
      frame.onMoveCommit = (moves) => this._commitMove(moves);
      frame.onSocketDown = (f, key, dir, e) => this._socketDown(f, key, dir, e);
      frame.addEventListener("contextmenu", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const key = propRowKey(e);
        if (key !== undefined && this.currentLevel().kind === "definition") {
          this.openPropMenu(frame, key, this._localPoint(e));
        } else {
          this._openNodeMenu(frame, this._localPoint(e));
        }
      });

      const nodePath = `${this.currentGraphPath}.nodes[${JSON.stringify(node.id)}]`;
      if (node instanceof GroupNode) {
        frame.buildExtraUI = (f, body) => {
          const root = document.createElement("div");
          root.className = "nodeeditor-forwarded";
          body.shadow.appendChild(root);
          buildForwardedUI(root, this.ctx, f.node as GroupNode, nodePath, body.inherit_packflag);
        };
        this._forwardedSigs.set(frame, forwardedSignature(node));
      } else {
        // A group instance's editable values are its forwarded rows above.
        frame.nodePath = nodePath;
      }
      if (level.kind === "definition" && isProxy(node)) {
        const dir: SocketDir = node instanceof GroupInputNode ? "in" : "out";
        frame.buildExtraUI = (_f, body) =>
          buildAddSocketRow(body, dir, {
            ctx      : this.graphContext,
            def      : level.def,
            graphPath: this.currentGraphPath,
            delegate : this.delegate,
            onChanged: () => this.syncGraph(),
          });
      }

      frame.parentWidget = this.panzoom;
      this.panzoom.appendChild(frame);
      frame.ctx = this.ctx;
      frame.inherit_packflag |= this.inherit_packflag;
      frame._init();
      this.frames.set(node.id, frame);
    }

    for (const nid of [...this.selection]) {
      if (!this.frames.has(nid)) {
        this.selection.delete(nid);
      }
    }

    for (const [nid, frame] of this.frames) {
      frame.syncPosition();
      frame.syncContents();
      frame.setSelected(this.selection.has(nid));
      frame.flushUpdate();
    }

    this._redrawLinks();
  }

  /**
   * Selects on press. A press on an already-selected node leaves the selection
   * alone so a drag can move the whole group, and defers what the press would
   * otherwise have done to _clickFrame.
   */
  private _selectFrame(frame: NodeFrame<CTX>, e: PointerEvent) {
    const id = frame.node.id;
    this._pendingSelect = undefined;

    if (this.selection.has(id)) {
      this._pendingSelect = { id, shift: e.shiftKey };
      return;
    }

    if (!e.shiftKey) {
      this.selection.clear();
      this.linkSelection.clear();
    }
    this.selection.add(id);
    this._applySelection();
  }

  /**
   * A press that released without moving. Two on one frame's title bar within
   * DOUBLE_PRESS_MS enter the group; otherwise it applies the selection change
   * _selectFrame deferred for a press on an already-selected node.
   */
  private _clickFrame(frame: NodeFrame<CTX>) {
    const pending = this._pendingSelect;
    this._pendingSelect = undefined;

    const now = Date.now();
    const last = this._lastPress;
    this._lastPress = frame.headerPressed ? { id: frame.node.id, at: now } : undefined;
    if (
      last !== undefined &&
      last.id === frame.node.id &&
      now - last.at <= DOUBLE_PRESS_MS &&
      frame.headerPressed &&
      frame.node instanceof GroupNode
    ) {
      this._lastPress = undefined;
      void this.enterDefinition(frame.node);
      return;
    }

    if (pending?.id !== frame.node.id) {
      return;
    }

    if (pending.shift) {
      this.selection.delete(pending.id);
    } else {
      this.selection.clear();
      this.linkSelection.clear();
      this.selection.add(pending.id);
    }
    this._applySelection();
  }

  /** The frames a drag led by lead moves; shift takes the rest of the selection. */
  private _dragSet(lead: NodeFrame<CTX>, withSelection: boolean): NodeFrame<CTX>[] {
    const frames = [lead];
    if (!withSelection) {
      return frames;
    }
    for (const [nid, frame] of this.frames) {
      if (frame !== lead && this.selection.has(nid)) {
        frames.push(frame);
      }
    }
    return frames;
  }

  private _applySelection() {
    for (const [nid, frame] of this.frames) {
      frame.setSelected(this.selection.has(nid));
    }
    this._redrawLinks();
  }

  private _moveEdit(frame: NodeFrame<CTX>, x: number, y: number): GraphEdit {
    return {
      kind     : "moveNode",
      graphPath: this.currentGraphPath,
      nodeId   : frame.node.id,
      x,
      y,
    };
  }

  private _previewMove(frames: readonly NodeFrame<CTX>[]) {
    for (const frame of frames) {
      const pos = frame.previewPos ?? frame.node.pos;
      const verdict = this.delegate.check(this.graphContext, this._moveEdit(frame, pos[0], pos[1]));
      frame.style.opacity = verdict.ok ? "" : "0.5";
    }
    this._redrawLinks();
  }

  /** Commits a finished drag; a group move goes as one moveNodes edit, so the
   *  gesture leaves a single undo entry. */
  private async _commitMove(moves: readonly FrameMove<CTX>[]): Promise<void> {
    for (const move of moves) {
      move.frame.style.opacity = "";
    }

    if (moves.length === 1) {
      const edit = this._moveEdit(moves[0].frame, moves[0].x, moves[0].y);
      await this._dispatch(edit);
    } else if (moves.length > 1) {
      const accepted: NodeMove[] = [];
      for (const move of moves) {
        if (this.delegate.check(this.graphContext, this._moveEdit(move.frame, move.x, move.y)).ok) {
          accepted.push({ nodeId: move.frame.node.id, x: move.x, y: move.y });
        }
      }
      if (accepted.length > 0) {
        await this._dispatch({
          kind     : "moveNodes",
          graphPath: this.currentGraphPath,
          moves    : accepted,
        });
      }
    }

    // A refused drop snaps back here: the frame re-reads node.pos, which perform never changed.
    this.syncGraph();
  }

  /**
   * Dispatches an edit through the delegate, check first, and answers whether it
   * was performed. Resolves once the edit has been applied, so a caller may
   * repaint from the model straight after awaiting it. The level check runs here
   * as well as from the watch, so the pass starts without waiting a frame.
   */
  private async _dispatch(edit: GraphEdit): Promise<boolean> {
    this.checkGraphContext();
    const verdict = this.delegate.check(this.graphContext, edit);
    if (!verdict.ok) {
      this.lastRefusal = verdict.reason;
      return false;
    }
    this.lastRefusal = undefined;
    await this.delegate.perform(this.graphContext, edit);
    this._checkLevel();
    return true;
  }

  /** The pan/zoom-widget-local point of a mouse event. */
  private _localPoint(e: MouseEvent): [number, number] {
    const r = this.panzoom.getBoundingClientRect();
    return [e.clientX - r.x, e.clientY - r.y];
  }

  private _socketDown(frame: NodeFrame<CTX>, key: string, dir: SocketDir, e: PointerEvent) {
    if (!this.linkDrag.begin(frame, key, dir)) {
      return;
    }

    this.linkDrag.update(this._localPoint(e));
    this.ctx.toolstack.execTool(this.ctx, new LinkDragModalOp(this), e);
  }

  /**
   * Adds a node of the named registered type at a graph-space point, defaulting
   * to the view's center. This is the entry point a host's own add menu calls.
   */
  async addNodeAt(typeName: string, at?: readonly [number, number] | Vector2): Promise<void> {
    if (at === undefined) {
      const r = this.panzoom.getBoundingClientRect();
      at = this.panzoom.transform.unproject([r.width * 0.5, r.height * 0.5]);
    }

    await this._dispatch({
      kind     : "addNode",
      graphPath: this.currentGraphPath,
      nodeType : typeName,
      x        : at[0],
      y        : at[1],
    });
    this.syncGraph();
  }

  /**
   * Adds an instance of an existing definition, named by ref, at a graph-space
   * point defaulting to the view's center. The root-level watch resolves it.
   */
  async addGroupAt(ref: string, at?: readonly [number, number] | Vector2): Promise<void> {
    if (at === undefined) {
      const r = this.panzoom.getBoundingClientRect();
      at = this.panzoom.transform.unproject([r.width * 0.5, r.height * 0.5]);
    }

    await this._dispatch({
      kind     : "addNode",
      graphPath: this.currentGraphPath,
      nodeType : "GroupNode",
      ref,
      x: at[0],
      y: at[1],
    });
    this.syncGraph();
  }

  /**
   * Moves the selected nodes into a new group and selects the instance left in their
   * place. The ref comes from the root graph's newGroupRef seam, or from a host
   * delegate that allocates its own; without either the edit is refused.
   */
  async groupSelected(): Promise<boolean> {
    const ids = [...this.selection];
    if (ids.length === 0) {
      this.lastRefusal = "nothing is selected";
      return false;
    }
    const done = await this._dispatch({
      kind     : "createGroup",
      graphPath: this.currentGraphPath,
      storePath: this.graphPath,
      nodeIds  : ids,
    });
    this.syncGraph();
    return done;
  }

  /** Replaces one group instance with a copy of its contents. */
  async ungroupNode(nodeId: GraphId): Promise<boolean> {
    const done = await this._dispatch({
      kind: "ungroup",
      graphPath: this.currentGraphPath,
      nodeId,
    });
    this.syncGraph();
    return done;
  }

  /** Ungroups every selected group instance, as one undo step. */
  async ungroupSelected(): Promise<void> {
    const graph = this.currentGraph;
    const groups = [...this.selection].filter(
      (nid) => graph?.nodeIdMap.get(nid) instanceof GroupNode
    );
    if (groups.length === 0) {
      return;
    }
    if (groups.length === 1) {
      await this.ungroupNode(groups[0]);
      return;
    }
    await this.singleUndoStep(
      async () => {
        for (const nid of groups) {
          await this._dispatch({ kind: "ungroup", graphPath: this.currentGraphPath, nodeId: nid });
        }
        this.syncGraph();
      },
      "Ungroup",
      "Ungroup selected groups"
    );
  }

  /**
   * The view's key bindings, declared once so an Area shell and a host embedding
   * the bare view install the same list: Delete, Shift+D duplicate, Ctrl+G group,
   * Ctrl+Alt+G ungroup, Tab to enter the selected group or leave the level.
   */
  hotkeys(): HotKey[] {
    return [
      new HotKey("Delete", [], () => void this.deleteSelected(), "Delete"),
      new HotKey("D", ["shift"], () => void this.duplicateSelected(), "Duplicate"),
      new HotKey("G", ["ctrl"], () => void this.groupSelected(), "Create Group"),
      new HotKey("G", ["ctrl", "alt"], () => void this.ungroupSelected(), "Ungroup"),
      new HotKey("Tab", [], () => void this.enterOrExit(), "Edit Group"),
    ];
  }

  /** Opens the add-node menu at a widget-local point; a pick adds there. */
  openAddMenu(local: readonly [number, number]): Menu<CTX> {
    const menu = buildAddNodeMenu(this.ctx, (typeName: string) => {
      void this.addNodeAt(typeName, this.panzoom.transform.unproject(local));
    });
    this._startMenu(menu, local, true);
    return menu;
  }

  /**
   * Starts a menu as a screen popup at a panzoom-local point, with the type
   * filter box when searchMode is set. A context without a screen (the
   * headless tests) gets the built menu back unstarted.
   */
  private _startMenu(menu: Menu<CTX>, local: readonly [number, number], searchMode = false) {
    if (this.ctx.screen === undefined) {
      return;
    }
    // Every menu here opens from a completed right-click; keeps the menu open
    // when that button releases over it.
    menu.closeOnMouseUp = false;
    const r = this.panzoom.getBoundingClientRect();
    startMenu(menu as unknown as Menu, r.x + local[0], r.y + local[1], searchMode);
  }

  // TODO: make this into a using keyword instead
  // of using a closure pattern to do RAII
  async singleUndoStep<T = any>(cb: () => T, shortLabel = "Edit", message = "Edit"): Promise<T> {
    const gate = new AsyncGateOp<ViewGraphContext<CTX>>().init(
      this.delegate,
      shortLabel,
      message,
      cb
    );
    return (await gate.modalStart(this.graphContext)) as T;
  }

  /** Deletes the selected nodes and severs the selected links. */
  async deleteSelected(): Promise<void> {
    await this.singleUndoStep(
      async () => {
        for (const ref of this.selectedLinks()) {
          await this._dispatch({ kind: "disconnect", graphPath: this.currentGraphPath, ...ref });
        }
        this.linkSelection.clear();

        for (const nid of [...this.selection]) {
          await this._dispatch({
            kind: "deleteNode",
            graphPath: this.currentGraphPath,
            nodeId: nid,
          });
        }
        this.syncGraph();
      },
      "Delete",
      "Delete selected nodes"
    );
  }

  async duplicateSelected(): Promise<void> {
    if (!this.currentGraph) {
      return;
    }

    await this.singleUndoStep(
      async () => {
        const graph = this.currentGraph;
        const existingNodes = new Set(Array.from(graph?.nodes ?? []).map((n) => n.id));
        const selection = Array.from(this.selection);
        this.selection.clear();

        for (const nid of selection) {
          const node = graph?.nodeIdMap.get(nid);
          if (node === undefined) {
            continue;
          }
          await this._dispatch({
            kind     : "duplicateNode",
            graphPath: this.currentGraphPath,
            nodeId   : nid,
            x        : node.pos[0] + 20,
            y        : node.pos[1] + 20,
          });
        }

        this.syncGraph();

        // select new nodes; painted immediately rather than after the checkpoint's async
        // commit round-trip resolves
        for (const node of graph?.nodes ?? []) {
          if (!existingNodes.has(node.id)) {
            this.selection.add(node.id);
          }
        }
      },
      "Duplicate",
      "Duplicate selected nodes"
    );
  }

  async replaceNode(nodeId: GraphId, newType: string): Promise<void> {
    await this._dispatch({
      kind: "replaceNode",
      graphPath: this.currentGraphPath,
      nodeId,
      newType,
    });
    this.syncGraph();
  }

  /**
   * Repacks the graph with graphpack, one island at a time, then lays the
   * islands out left to right so they stay disjoint (the solver itself is
   * randomized). The result commits as one arrange edit — one undo entry.
   */
  async arrangeNodes(): Promise<void> {
    const graph = this.currentGraph;
    if (graph === undefined || graph.nodes.length === 0) {
      return;
    }

    const packs = new Map<GraphId, PackNode>();
    for (const node of graph.nodes) {
      const frame = this.frames.get(node.id);
      const r = frame?.rect() ?? { x: node.pos[0], y: node.pos[1], width: 140, height: 64 };
      const pn = new PackNode();
      pn.pos.loadXY(r.x, r.y);
      pn.oldpos.load(pn.pos);
      pn.size.loadXY(r.width, r.height);
      packs.set(node.id, pn);
    }

    const relAnchor = (frame: NodeFrame<CTX>, dir: SocketDir, row: number): [number, number] => {
      const m = frame.metrics();
      const a = socketAnchor(m, dir, row);
      return [a[0] - m.x, a[1] - m.y];
    };

    for (const node of graph.nodes) {
      const dstPn = packs.get(node.id)!;
      const dstFrame = this.frames.get(node.id);

      for (const key of Object.keys(node.inputs)) {
        for (const edge of node.inputs[key].edges) {
          const srcNode = edge.owningNode as GraphNode | undefined;
          const srcPn = srcNode !== undefined ? packs.get(srcNode.id) : undefined;
          if (srcNode === undefined || srcPn === undefined) {
            continue;
          }
          const srcFrame = this.frames.get(srcNode.id);

          const srcOff =
            srcFrame !== undefined
              ? relAnchor(srcFrame, "out", socketRow(srcNode, "out", edge.name))
              : ([0, 0] as [number, number]);
          const dstOff =
            dstFrame !== undefined
              ? relAnchor(dstFrame, "in", socketRow(node, "in", key))
              : ([0, 0] as [number, number]);

          const v1 = new PackNodeVertex(srcPn, srcOff);
          const v2 = new PackNodeVertex(dstPn, dstOff);
          srcPn.verts.push(v1);
          dstPn.verts.push(v2);
          v1.edges.push(v2);
          v2.edges.push(v1);
        }
      }
    }

    const islands = graphGetIslands([...packs.values()]);
    let cursorX = 0;
    for (const island of islands) {
      graphPack(island, { margin: 20, steps: 8 });
      // graphPack normalizes the island's min corner to the origin.
      let maxX = cursorX;
      for (const pn of island) {
        pn.pos[0] += cursorX;
        maxX = Math.max(maxX, pn.pos[0] + pn.size[0]);
      }
      cursorX = maxX + 40;
    }

    const moves: NodeMove[] = [];
    for (const [nid, pn] of packs) {
      moves.push({ nodeId: nid, x: pn.pos[0], y: pn.pos[1] });
    }
    await this._dispatch({ kind: "arrange", graphPath: this.currentGraphPath, moves });
    this.syncGraph();
  }

  /**
   * The context menu for one node: delete, duplicate, replace; a group adds Edit
   * Group, Show Instance and Ungroup, and any node adds Group Selected while
   * something is selected.
   */
  /**
   * The menu a prop row opens inside a definition: "Expose on group" (id
   * "expose") forwards that property to every instance. Returned so a caller
   * can drive it without a screen.
   */
  openPropMenu(frame: NodeFrame<CTX>, key: NodePropName, local: [number, number]): Menu<CTX> {
    const nid = frame.node.id;
    const { name } = GraphNode.decomposePropName(key);
    const menu = createMenu(this.ctx, "", [
      {
        name    : "Expose on group",
        id      : "expose",
        tooltip : `Forward ${name} so every instance of this group shows it`,
        callback: () => void this.exposeProp(nid, key),
      },
    ]);
    this._startMenu(menu, local);
    return menu;
  }

  /** Deletes one node, named by the node menu rather than the selection. */
  private async _deleteNode(nodeId: GraphId): Promise<void> {
    await this._dispatch({ kind: "deleteNode", graphPath: this.currentGraphPath, nodeId });
    this.syncGraph();
  }

  /** Duplicates one node, offset from the frame the node menu opened on. */
  private async _duplicateNode(nodeId: GraphId, frame: NodeFrame<CTX>): Promise<void> {
    await this._dispatch({
      kind     : "duplicateNode",
      graphPath: this.currentGraphPath,
      nodeId,
      x: frame.node.pos[0] + 20,
      y: frame.node.pos[1] + 20,
    });
    this.syncGraph();
  }

  /** Forwards one property of a node in the definition on screen; false when refused. */
  async exposeProp(nodeId: GraphId, propKey: NodePropName): Promise<boolean> {
    return await this._dispatch({
      kind     : "exposeEntry",
      graphPath: this.currentGraphPath,
      entry    : { kind: "prop", nodeId, propKey: propKey as unknown as string },
    });
  }

  private _openNodeMenu(frame: NodeFrame<CTX>, local: [number, number]) {
    const nid = frame.node.id;
    const node = frame.node;
    const template: MenuTemplate = [];

    if (node instanceof GroupNode) {
      template.push(
        {
          name    : "Edit Group",
          tooltip:
            node.definition !== undefined
              ? "Open this group's definition; edits there reach every instance"
              : "This group's definition has not loaded, so it cannot be edited here",
          callback: () => void this.enterDefinition(node),
        },
        {
          name    : "Show Instance",
          tooltip : "Look inside this one instance; it takes value edits only",
          callback: () => void this.enterInstance(node),
        },
        {
          name    : "Ungroup",
          tooltip : "Replace this group with a copy of what it contains",
          callback: () => void this.ungroupNode(nid),
        }
      );
    }
    if (this.selection.size > 0) {
      template.push({
        name    : "Group Selected",
        tooltip : "Move the selected nodes into a new group",
        callback: () => void this.groupSelected(),
      });
    }

    template.push(
      {
        name    : "Delete",
        tooltip : "Delete this node",
        callback: () => void this._deleteNode(nid),
      },
      {
        name    : "Duplicate",
        tooltip : "Duplicate this node, keeping its overridden values",
        callback: () => void this._duplicateNode(nid, frame),
      },
      {
        name    : "Replace…",
        tooltip : "Swap this node's type, keeping links where sockets match",
        callback: () => {
          const picker = buildAddNodeMenu(this.ctx, (typeName: string) => {
            void this.replaceNode(nid, typeName);
          });
          this._startMenu(picker, local, true);
        },
      }
    );
    const menu = createMenu(this.ctx, "", template);
    this._startMenu(menu, local);
  }

  private _redrawLinks() {
    if (this.links === undefined) {
      return;
    }

    const graph = this.currentGraph;
    const links: { ref: LinkRef; seg: LinkSegment }[] = [];
    const tf = this.panzoom.transform;

    if (graph !== undefined) {
      for (const node of graph.nodes) {
        const dstFrame = this.frames.get(node.id);
        if (dstFrame === undefined) {
          continue;
        }

        for (const key of Object.keys(node.inputs)) {
          const sock = node.inputs[key];
          const dstRow = socketRow(node, "in", key);

          for (const edge of sock.edges) {
            const srcNode = edge.owningNode as GraphNode | undefined;
            if (srcNode === undefined) {
              continue;
            }
            const srcFrame = this.frames.get(srcNode.id);
            const srcRow = socketRow(srcNode, "out", edge.name);
            if (srcFrame === undefined || srcRow < 0 || dstRow < 0) {
              continue;
            }

            const ref: LinkRef = {
              srcNode  : srcNode.id,
              srcSocket: edge.name,
              dstNode  : node.id,
              dstSocket: key,
            };
            const a = tf.project(socketAnchor(srcFrame.metrics(), "out", srcRow));
            const b = tf.project(socketAnchor(dstFrame.metrics(), "in", dstRow));
            links.push({
              ref,
              seg: {
                x1      : a[0],
                y1      : a[1],
                x2      : b[0],
                y2      : b[1],
                selected: this.linkSelection.has(linkKey(ref)),
              },
            });
          }
        }
      }
    }

    // A link the graph no longer holds drops out of the selection with it.
    const live = new Set(links.map((l) => linkKey(l.ref)));
    for (const key of [...this.linkSelection]) {
      if (!live.has(key)) {
        this.linkSelection.delete(key);
      }
    }

    this._linkRefs = links;

    const r = this.panzoom.getBoundingClientRect();
    const dpi = UIBase.getDPI();
    this.links.resize(Math.max(r.width, 1), Math.max(r.height, 1), dpi);
    this.links.drawLinks(
      links.map((l) => l.seg),
      dpi
    );
  }

  /** The link nearest to a widget-local point, within LINK_PICK_PX. */
  private _pickLink(local: readonly [number, number]): LinkRef | undefined {
    let best: LinkRef | undefined;
    let bestDist = LINK_PICK_PX;

    for (const link of this._linkRefs) {
      const dist = linkDistance(link.seg, local[0], local[1]);
      if (dist <= bestDist) {
        bestDist = dist;
        best = link.ref;
      }
    }
    return best;
  }

  /** Selects one link; shift toggles it and keeps whatever else is selected. */
  selectLink(ref: LinkRef, additive = false) {
    const key = linkKey(ref);
    if (additive) {
      if (this.linkSelection.has(key)) {
        this.linkSelection.delete(key);
      } else {
        this.linkSelection.add(key);
      }
    } else {
      this.selection.clear();
      this.linkSelection.clear();
      this.linkSelection.add(key);
    }
    this._applySelection();
  }

  /** The selected links, resolved against the links currently on screen. */
  selectedLinks(): LinkRef[] {
    return this._linkRefs.filter((l) => this.linkSelection.has(linkKey(l.ref))).map((l) => l.ref);
  }

  private _boxDown(e: PointerEvent) {
    // Frames stop propagation of their own presses, and the pan gesture
    // preventDefaults before this listener runs, so what arrives here is a
    // press on empty canvas.
    if (e.button !== 0 || e.defaultPrevented) {
      return;
    }

    // The link canvas is an underlay taking no pointer events, so the press
    // that lands on a link arrives here rather than on the curve.
    const hit = this._pickLink(this._localPoint(e));
    if (hit !== undefined) {
      e.preventDefault();
      this.selectLink(hit, e.shiftKey);
      return;
    }

    this.ctx.toolstack.execTool(this.ctx, new BoxSelectModalOp(this, e), e);
  }

  /** Clears the node and link selection and repaints. */
  clearSelection() {
    this.selection.clear();
    this.linkSelection.clear();
    this._applySelection();
  }

  /**
   * Selects the frames whose rects intersect the graph-space box from min to
   * max; additive keeps the current selection.
   */
  boxSelect(min: readonly [number, number], max: readonly [number, number], additive: boolean) {
    if (!additive) {
      this.selection.clear();
      this.linkSelection.clear();
    }
    for (const [nid, frame] of this.frames) {
      const fr = frame.rect();
      if (fr.x < max[0] && fr.x + fr.width > min[0] && fr.y < max[1] && fr.y + fr.height > min[1]) {
        this.selection.add(nid);
      }
    }
    this._applySelection();
  }
}
UIBase.internalRegister(NodeGraphView);
