import { UIBase } from "../../core/ui_base";
import { IContextBase } from "../../core/context_base";
// The plain import keeps the canvas module's module-scope internalRegister
// call; a type-only use would let the transpiler elide it.
import "./linkcanvas";
import type { LinkCanvas } from "./linkcanvas";
import type { NodeGraphView } from "./nodegraphview";
import type { NodeFrame, TerminalDot } from "./nodeframe";
import { socketAnchor, socketRow } from "./nodeframe";
import { Node as GraphNode } from "../../graph/node";
import type { NodeSocketBase } from "../../graph/socket";
import type { GraphId, SocketDir } from "../../graph/graph_types";
import type { GraphEdit } from "./delegate";

/** Screen-pixel radius within which a drop lands on a terminal. */
export const LINK_DROP_PX = 12;

interface DragOrigin<CTX extends IContextBase> {
  frame: NodeFrame<CTX>;
  key: string;
  dir: SocketDir;
  sock: NodeSocketBase;
}

interface DropTarget<CTX extends IContextBase> {
  frame: NodeFrame<CTX>;
  key: string;
  ok: boolean;
}

/**
 * One in-flight link gesture, driven by begin/update/drop/cancel so tests can
 * run it without pointer events; the view wires the pointer side. Coordinates
 * are pan/zoom-widget-local screen pixels. Beginning on a connected
 * single-link input detaches its edge: the drag re-originates from the far
 * output, an empty drop severs the link, and a drop on another input moves
 * it. Every resulting edit goes through the view's delegate, check first;
 * terminals whose connect the delegate (or coercion) refuses dim for the
 * drag's duration.
 */
export class LinkDrag<CTX extends IContextBase = IContextBase> {
  private view: NodeGraphView<CTX>;
  private _origin: DragOrigin<CTX> | undefined = undefined;
  private _detach:
    | { srcNode: GraphId; srcSocket: string; dstNode: GraphId; dstSocket: string }
    | undefined = undefined;
  private _overlay: LinkCanvas<CTX> | undefined = undefined;
  private _dimmed: HTMLElement[] = [];
  private _highlight?: TerminalDot<CTX>;

  constructor(view: NodeGraphView<CTX>) {
    this.view = view;
  }

  get active(): boolean {
    return this._origin !== undefined;
  }

  /** Starts a drag from the terminal named key; false when it has no socket. */
  begin(frame: NodeFrame<CTX>, key: string, dir: SocketDir): boolean {
    const node = frame.node;
    const sock = dir === "in" ? node.inputs[key] : node.outputs[key];
    if (sock === undefined) {
      return false;
    }

    let origin: DragOrigin<CTX> = { frame, key, dir, sock };

    if (dir === "in" && !sock.multiSocket && sock.edges.length > 0) {
      const far = sock.edges[0];
      const farNode = far.owningNode as GraphNode | undefined;
      const farFrame = farNode !== undefined ? this.view.frames.get(farNode.id) : undefined;
      if (farNode !== undefined && farFrame !== undefined) {
        this._detach = {
          srcNode  : farNode.id,
          srcSocket: far.name,
          dstNode  : node.id,
          dstSocket: key,
        };
        origin = { frame: farFrame, key: far.name, dir: "out", sock: far };
      }
    }

    this._origin = origin;
    this._makeOverlay();
    this._dimRefusedTargets();
    return true;
  }

  /** Redraws the in-flight segment to the given point. */
  update(local: readonly [number, number]): void {
    const origin = this._origin;
    const overlay = this._overlay;
    if (origin === undefined || overlay === undefined) {
      return;
    }

    const row = socketRow(origin.frame.node, origin.dir, origin.key);
    const a = this.view.panzoom.transform.project(
      socketAnchor(origin.frame.metrics(), origin.dir, row)
    );

    const r = this.view.panzoom.getBoundingClientRect();
    const dpi = UIBase.getDPI();
    overlay.resize(Math.max(r.width, 1), Math.max(r.height, 1), dpi);

    const target = this._nearestTarget(local);
    let targetDot: TerminalDot<CTX> | undefined;
    if (target?.ok) {
      targetDot = target.frame.terminalDot(target.key, this.targetDir);
    }

    if (targetDot !== this._highlight) {
      if (this._highlight) {
        this._highlight.forceHighlight = false;
        this._highlight.showError = false;
      }

      if (targetDot !== undefined) {
        targetDot.forceHighlight = true;
      }
      this._highlight = targetDot;
    }

    const seg =
      origin.dir === "out"
        ? { x1: a[0], y1: a[1], x2: local[0], y2: local[1] }
        : { x1: local[0], y1: local[1], x2: a[0], y2: a[1] };
    overlay.drawLinks([seg], dpi);
  }

  /** Ends the drag, dispatching the edits the drop point calls for. */
  drop(local: readonly [number, number]): void {
    const origin = this._origin;
    if (origin === undefined) {
      return;
    }

    const target = this._nearestTarget(local);
    const detach = this._detach;
    this._cleanup();

    if (detach !== undefined) {
      const backOnOrigin =
        target?.frame.node.id === detach.dstNode && target.key === detach.dstSocket;
      if (backOnOrigin) {
        return;
      }

      this._dispatch({ kind: "disconnect", graphPath: this.view.currentGraphPath, ...detach });
      if (target !== undefined && target.ok) {
        this._dispatch(this._connectEdit(origin, target));
      }
      this.view.syncGraph();
      return;
    }

    if (target !== undefined && target.ok) {
      this._dispatch(this._connectEdit(origin, target));
    }
    this.view.syncGraph();
  }

  cancel(): void {
    this._cleanup();
  }

  /** The connect edit for a drop, normalized to output-to-input order. */
  private _connectEdit(origin: DragOrigin<CTX>, target: DropTarget<CTX>): GraphEdit {
    const graphPath = this.view.currentGraphPath;
    if (origin.dir === "out") {
      return {
        kind: "connect",
        graphPath,
        srcNode  : origin.frame.node.id,
        srcSocket: origin.key,
        dstNode  : target.frame.node.id,
        dstSocket: target.key,
      };
    }
    return {
      kind: "connect",
      graphPath,
      srcNode  : target.frame.node.id,
      srcSocket: target.key,
      dstNode  : origin.frame.node.id,
      dstSocket: origin.key,
    };
  }

  private _targetOk(frame: NodeFrame<CTX>, key: string): boolean {
    const origin = this._origin!;
    const edit = this._connectEdit(origin, { frame, key, ok: true });
    return this.view.delegate.check(this.view.graphContext, edit).ok;
  }

  private get targetDir(): "in" | "out" {
    return this._origin?.dir === "out" ? "in" : "out";
  }

  /** The opposite-direction terminal nearest to local, within LINK_DROP_PX. */
  private _nearestTarget(local: readonly [number, number]): DropTarget<CTX> | undefined {
    const origin = this._origin!;
    const targetDir = this.targetDir;
    const tf = this.view.panzoom.transform;

    let best: DropTarget<CTX> | undefined;
    let bestDist = LINK_DROP_PX;

    for (const frame of this.view.frames.values()) {
      const node = frame.node;
      const keys = Object.keys(targetDir === "in" ? node.inputs : node.outputs);

      for (const key of keys) {
        const row = socketRow(node, targetDir, key);
        const p = tf.project(socketAnchor(frame.metrics(), targetDir, row));
        const dist = Math.hypot(p[0] - local[0], p[1] - local[1]);
        if (dist <= bestDist) {
          bestDist = dist;
          best = { frame, key, ok: this._targetOk(frame, key) };
        }
      }
    }
    return best;
  }

  private _dispatch(edit: GraphEdit): void {
    if (this.view.delegate.check(this.view.graphContext, edit).ok) {
      this.view.delegate.perform(this.view.graphContext, edit);
    }
  }

  private _makeOverlay(): void {
    const overlay = UIBase.createElement("nodelinkcanvas-x") as LinkCanvas<CTX>;
    overlay.ctx = this.view.ctx;
    overlay.style.position = "absolute";
    overlay.style.left = overlay.style.top = "0px";
    overlay.style.pointerEvents = "none";
    // Appended after the pan/zoom content, so the preview paints above frames.
    this.view.panzoom.shadow.appendChild(overlay);
    overlay._init();
    this._overlay = overlay;
  }

  private _dimRefusedTargets(): void {
    const origin = this._origin!;
    const targetDir: SocketDir = origin.dir === "out" ? "in" : "out";

    for (const frame of this.view.frames.values()) {
      const node = frame.node;
      const keys = Object.keys(targetDir === "in" ? node.inputs : node.outputs);

      for (const key of keys) {
        if (this._targetOk(frame, key)) {
          continue;
        }
        const dot = frame.terminalDot(key, targetDir);
        if (dot !== undefined) {
          dot.style.opacity = "0.35";
          this._dimmed.push(dot);
        }
      }
    }
  }

  private _cleanup(): void {
    for (const dot of this._dimmed) {
      dot.style.opacity = "";
    }
    this._dimmed = [];
    this._overlay?.remove();
    this._overlay = undefined;
    this._origin = undefined;
    this._detach = undefined;
    if (this._highlight) {
      this._highlight.forceHighlight = false;
      this._highlight.showError = false;
    }
  }
}
