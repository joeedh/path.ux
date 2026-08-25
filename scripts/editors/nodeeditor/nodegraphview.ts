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
import { GroupNode } from "../../graph/group";
import type { Node as GraphNode } from "../../graph/node";
import type { GraphId, SocketDir } from "../../graph/graph_types";
import { NodeFrame, socketAnchor, socketRow } from "./nodeframe";
import type { LinkCanvas, LinkSegment } from "./linkcanvas";
import { ToolOpDelegate } from "./delegate";
import type { ArrangeMove, GraphEdit, NodeGraphDelegate } from "./delegate";
import { LinkDrag } from "./linkdrag";
import { BoxSelectModalOp, LinkDragModalOp, NodeMoveModalOp } from "./gesture_ops";
import { buildAddNodeMenu } from "./addmenu";
import { Menu, createMenu, startMenu } from "../../widgets/ui_menu";
import { t } from "../../core/theme_schema";
import { buildForwardedUI } from "./groupui";

/** The view state an embedding editor persists: camera plus descent stack. */
export interface NodeGraphViewState {
  pan: [number, number];
  zoom: number;
  descent: GraphId[];
}

/**
 * The hostable node-graph widget: one pan/zoom surface holding a NodeFrame per
 * node, a link canvas beneath them, breadcrumbs for group descent, and
 * click/box selection. It is a plain internally-registered widget, so any
 * host — an Area subclass, a dialog, a dock panel — can create and embed one.
 * Drag gestures (node move, box select, link drag) run as modal ToolOps the
 * view spawns on pointerdown; see gesture_ops.ts. Every mutating gesture
 * routes through {@link delegate}; the view itself never writes the graph.
 */
export class NodeGraphView<CTX extends IContextBase = IContextBase> extends Container<
  CTX,
  "NodeGraphView"
> {
  delegate: NodeGraphDelegate = new ToolOpDelegate();

  /** Invoked by the breadcrumb's Open Definition button; the host decides where the definition opens. */
  onOpenDefinition?: (node: GroupNode) => void;

  graphPath = "";
  rootGraph: Graph | undefined = undefined;

  /** GroupNode ids from the root graph down to the graph on screen. */
  descent: GraphId[] = [];

  selection = new Set<GraphId>();
  frames = new Map<GraphId, NodeFrame<CTX>>();

  panzoom!: PanZoomContainer<CTX>;
  links!: LinkCanvas<CTX>;
  linkDrag!: LinkDrag<CTX>;

  private _crumbs!: HTMLDivElement;
  private _pendingView: NodeGraphViewState | undefined = undefined;

  static define(): UIBaseDefinition {
    return {
      tagname: "nodegraphview-x",
      style  : "nodegraphview",
      theme: {
        "background-color": t.color,
        BoxSelectBorder   : t.color,
        BoxSelectBG       : t.color,
        // Read by the editor shell for the group designer's missing-entry flag.
        ErrorColor        : t.color,
      },
    };
  }

  init() {
    super.init();

    this.style.display = "flex";
    this.style.flexDirection = "column";
    this.style.width = "100%";
    this.style.height = "100%";

    this._crumbs = document.createElement("div");
    this._crumbs.style.cssText = "display: flex; gap: 4px; padding: 2px; align-items: center;";
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
  }

  /** Points the view at a graph; graphPath is the datapath edits dispatch against. */
  setGraph(graph: Graph | undefined, graphPath: string) {
    this.rootGraph = graph;
    this.graphPath = graphPath;
    this.descent = [];
    this.selection.clear();
    this._refresh();
  }

  /** The graph on screen: the root, or the descent tail's instance subgraph. */
  get currentGraph(): Graph | undefined {
    let g = this.rootGraph;
    for (const nid of this.descent) {
      const node = g?.nodeIdMap.get(nid);
      if (!(node instanceof GroupNode)) {
        return undefined;
      }
      g = node.subgraph;
    }
    return g;
  }

  /** The datapath of the graph on screen, descending .nodes[id].group per entry. */
  get currentGraphPath(): string {
    let path = this.graphPath;
    for (const nid of this.descent) {
      path += `.nodes[${JSON.stringify(nid)}].group`;
    }
    return path;
  }

  /** Descends into a group instance's subgraph (read-only for structural edits). */
  descendInto(node: GraphNode) {
    if (!(node instanceof GroupNode)) {
      return;
    }
    this.descent.push(node.id);
    this.selection.clear();
    this._refresh();
  }

  /** Returns to depth entries of descent; popTo(0) shows the root graph. */
  popTo(depth: number) {
    this.descent.length = Math.min(Math.max(depth, 0), this.descent.length);
    this.selection.clear();
    this._refresh();
  }

  getViewState(): NodeGraphViewState {
    if (this.panzoom !== undefined) {
      const t = this.panzoom.transform;
      return { pan: [t.pan[0], t.pan[1]], zoom: t.scale, descent: [...this.descent] };
    }
    return this._pendingView ?? { pan: [0, 0], zoom: 1, descent: [...this.descent] };
  }

  /** Restores a persisted view state; safe to call before init runs. */
  setViewState(state: NodeGraphViewState) {
    if (this.panzoom !== undefined) {
      this.descent = [...state.descent];
      this.panzoom.setTransform(state.zoom, state.pan);
      this._refresh();
    } else {
      this._pendingView = {
        pan    : [state.pan[0], state.pan[1]],
        zoom   : state.zoom,
        descent: [...state.descent],
      };
      this.descent = [...state.descent];
    }
  }

  /** Rebuilds frames when a graph op — or its undo/redo — notifies the graph's datapath. */
  override watchPath(): void {
    super.watchPath();
    if (this.graphPath !== "") {
      this.addPathWatch(this.currentGraphPath, { onChange: () => this.syncGraph() });
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

  private _rebuildCrumbs() {
    this._crumbs.textContent = "";

    const rootBtn = document.createElement("button");
    rootBtn.textContent = "Root";
    rootBtn.title = "Show the root graph";
    rootBtn.addEventListener("click", () => this.popTo(0));
    this._crumbs.appendChild(rootBtn);

    let g = this.rootGraph;
    for (let i = 0; i < this.descent.length; i++) {
      const nid = this.descent[i];
      const node = g?.nodeIdMap.get(nid);

      const btn = document.createElement("button");
      btn.textContent = node?.getUIName() ?? String(nid);
      btn.title = "Show this group instance (read-only)";
      const depth = i + 1;
      btn.addEventListener("click", () => this.popTo(depth));
      this._crumbs.appendChild(btn);

      g = node instanceof GroupNode ? node.subgraph : undefined;
    }

    if (this.descent.length > 0) {
      const note = document.createElement("span");
      note.textContent = "read-only";
      note.title =
        "A group instance takes value edits only; structural edits belong to the group's definition";
      note.style.cssText = "font-size: 11px; opacity: 0.7;";
      this._crumbs.appendChild(note);

      const tailId = this.descent[this.descent.length - 1];
      let tailGraph = this.rootGraph;
      for (let i = 0; i + 1 < this.descent.length; i++) {
        const n = tailGraph?.nodeIdMap.get(this.descent[i]);
        tailGraph = n instanceof GroupNode ? n.subgraph : undefined;
      }
      const tail = tailGraph?.nodeIdMap.get(tailId);
      if (tail instanceof GroupNode && this.onOpenDefinition !== undefined) {
        const open = document.createElement("button");
        open.textContent = "Open Definition";
        open.title = "Edit this group's definition";
        open.addEventListener("click", () => this.onOpenDefinition?.(tail));
        this._crumbs.appendChild(open);
      }
    }
  }

  /** Reconciles frames against the graph on screen; call after any graph change. */
  syncGraph() {
    const graph = this.currentGraph;

    for (const [nid, frame] of [...this.frames]) {
      if (graph?.nodeIdMap.get(nid) !== frame.node) {
        frame.remove();
        this.frames.delete(nid);
      }
    }

    if (graph === undefined) {
      this._redrawLinks();
      return;
    }

    for (const node of graph.nodes) {
      if (this.frames.has(node.id)) {
        continue;
      }

      const frame = UIBase.createElement("nodeframe-x") as NodeFrame<CTX>;
      frame.setNode(node);
      frame.getScale = () => this.panzoom.transform.scale;
      frame.onSelect = (f, e) => this._selectFrame(f, e);
      frame.onMoveStart = (f, e) =>
        this.ctx.toolstack.execTool(this.ctx, new NodeMoveModalOp(f, e), e);
      frame.onMovePreview = (f) => this._previewMove(f);
      frame.onMoveCommit = (f, x, y) => this._commitMove(f, x, y);
      frame.onSocketDown = (f, key, dir, e) => this._socketDown(f, key, dir, e);
      frame.addEventListener("contextmenu", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        this._openNodeMenu(frame, this._localPoint(e));
      });

      const nodePath = `${this.currentGraphPath}.nodes[${JSON.stringify(node.id)}]`;
      if (node instanceof GroupNode) {
        frame.buildExtraUI = (f, body) => {
          const root = document.createElement("div");
          root.className = "nodeeditor-forwarded";
          body.shadow.appendChild(root);
          buildForwardedUI(root, this.ctx, f.node as GroupNode, nodePath);
        };
      } else {
        // A group instance's editable values are its forwarded rows above.
        frame.nodePath = nodePath;
      }

      frame.parentWidget = this.panzoom;
      this.panzoom.appendChild(frame);
      frame.ctx = this.ctx;
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
    }

    this._redrawLinks();
  }

  private _selectFrame(frame: NodeFrame<CTX>, e: PointerEvent) {
    const id = frame.node.id;
    if (e.shiftKey) {
      if (this.selection.has(id)) {
        this.selection.delete(id);
      } else {
        this.selection.add(id);
      }
    } else {
      this.selection.clear();
      this.selection.add(id);
    }
    this._applySelection();
  }

  private _applySelection() {
    for (const [nid, frame] of this.frames) {
      frame.setSelected(this.selection.has(nid));
    }
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

  private _previewMove(frame: NodeFrame<CTX>) {
    const pos = frame.previewPos ?? frame.node.pos;
    const verdict = this.delegate.check(this.ctx, this._moveEdit(frame, pos[0], pos[1]));
    frame.style.opacity = verdict.ok ? "" : "0.5";
    this._redrawLinks();
  }

  private _commitMove(frame: NodeFrame<CTX>, x: number, y: number) {
    frame.style.opacity = "";
    const edit = this._moveEdit(frame, x, y);
    if (this.delegate.check(this.ctx, edit).ok) {
      this.delegate.perform(this.ctx, edit);
    }
    // A refused drop snaps back here: the frame re-reads node.pos, which perform never changed.
    this.syncGraph();
  }

  /** Dispatches an edit through the delegate, check first. */
  private _dispatch(edit: GraphEdit) {
    if (this.delegate.check(this.ctx, edit).ok) {
      this.delegate.perform(this.ctx, edit);
    }
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
  addNodeAt(typeName: string, at?: readonly [number, number] | Vector2) {
    if (at === undefined) {
      const r = this.panzoom.getBoundingClientRect();
      at = this.panzoom.transform.unproject([r.width * 0.5, r.height * 0.5]);
    }
    this._dispatch({
      kind     : "addNode",
      graphPath: this.currentGraphPath,
      nodeType : typeName,
      x        : at[0],
      y        : at[1],
    });
    this.syncGraph();
  }

  /** Opens the add-node menu at a widget-local point; a pick adds there. */
  openAddMenu(local: readonly [number, number]): Menu<CTX> {
    const menu = buildAddNodeMenu(this.ctx, (typeName: string) => {
      this.addNodeAt(typeName, this.panzoom.transform.unproject(local));
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

  deleteSelected() {
    for (const nid of [...this.selection]) {
      this._dispatch({ kind: "deleteNode", graphPath: this.currentGraphPath, nodeId: nid });
    }
    this.syncGraph();
  }

  duplicateSelected() {
    const graph = this.currentGraph;
    for (const nid of [...this.selection]) {
      const node = graph?.nodeIdMap.get(nid);
      if (node === undefined) {
        continue;
      }
      this._dispatch({
        kind     : "duplicateNode",
        graphPath: this.currentGraphPath,
        nodeId   : nid,
        x        : node.pos[0] + 20,
        y        : node.pos[1] + 20,
      });
    }
    this.syncGraph();
  }

  replaceNode(nodeId: GraphId, newType: string) {
    this._dispatch({ kind: "replaceNode", graphPath: this.currentGraphPath, nodeId, newType });
    this.syncGraph();
  }

  /**
   * Repacks the graph with graphpack, one island at a time, then lays the
   * islands out left to right so they stay disjoint (the solver itself is
   * randomized). The result commits as one arrange edit — one undo entry.
   */
  arrangeNodes() {
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

    const moves: ArrangeMove[] = [];
    for (const [nid, pn] of packs) {
      moves.push({ nodeId: nid, x: pn.pos[0], y: pn.pos[1] });
    }
    this._dispatch({ kind: "arrange", graphPath: this.currentGraphPath, moves });
    this.syncGraph();
  }

  /** The context menu for one node: delete, duplicate, replace. */
  private _openNodeMenu(frame: NodeFrame<CTX>, local: [number, number]) {
    const nid = frame.node.id;
    const menu = createMenu(this.ctx, "", [
      {
        name    : "Delete",
        tooltip : "Delete this node",
        callback: () => {
          this._dispatch({ kind: "deleteNode", graphPath: this.currentGraphPath, nodeId: nid });
          this.syncGraph();
        },
      },
      {
        name    : "Duplicate",
        tooltip : "Duplicate this node, keeping its overridden values",
        callback: () => {
          this._dispatch({
            kind     : "duplicateNode",
            graphPath: this.currentGraphPath,
            nodeId   : nid,
            x        : frame.node.pos[0] + 20,
            y        : frame.node.pos[1] + 20,
          });
          this.syncGraph();
        },
      },
      {
        name    : "Replace…",
        tooltip : "Swap this node's type, keeping links where sockets match",
        callback: () => {
          const picker = buildAddNodeMenu(this.ctx, (typeName: string) =>
            this.replaceNode(nid, typeName)
          );
          this._startMenu(picker, local, true);
        },
      },
    ]);
    this._startMenu(menu, local);
  }

  private _redrawLinks() {
    if (this.links === undefined) {
      return;
    }

    const graph = this.currentGraph;
    const segments: LinkSegment[] = [];
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

            const a = tf.project(socketAnchor(srcFrame.metrics(), "out", srcRow));
            const b = tf.project(socketAnchor(dstFrame.metrics(), "in", dstRow));
            segments.push({ x1: a[0], y1: a[1], x2: b[0], y2: b[1] });
          }
        }
      }
    }

    const r = this.panzoom.getBoundingClientRect();
    const dpi = UIBase.getDPI();
    this.links.resize(Math.max(r.width, 1), Math.max(r.height, 1), dpi);
    this.links.drawLinks(segments, dpi);
  }

  private _boxDown(e: PointerEvent) {
    // Frames stop propagation of their own presses, and the pan gesture
    // preventDefaults before this listener runs, so what arrives here is a
    // press on empty canvas.
    if (e.button !== 0 || e.defaultPrevented) {
      return;
    }
    this.ctx.toolstack.execTool(this.ctx, new BoxSelectModalOp(this, e), e);
  }

  /** Clears the selection and repaints the frames. */
  clearSelection() {
    this.selection.clear();
    this._applySelection();
  }

  /**
   * Selects the frames whose rects intersect the graph-space box from min to
   * max; additive keeps the current selection.
   */
  boxSelect(min: readonly [number, number], max: readonly [number, number], additive: boolean) {
    if (!additive) {
      this.selection.clear();
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
