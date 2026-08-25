import { ToolOp, UndoFlags } from "../../path-controller/toolsys/toolsys";
import type { ContextLike } from "../../path-controller/controller/controller_abstract";
import { Vector2 } from "../../path-controller/util/vectormath";
import { IContextBase } from "../../core/context_base";
import type { NodeFrame } from "./nodeframe";
import type { NodeGraphView } from "./nodegraphview";

/** A press that moved less than this in both axes counts as a click. */
export const CLICK_SLOP_PX = 3;

/** The pan/zoom-widget-local point of a pointer event. */
function localPoint<CTX extends IContextBase>(
  view: NodeGraphView<CTX>,
  e: PointerEvent
): [number, number] {
  const r = view.panzoom.getBoundingClientRect();
  return [e.clientX - r.x, e.clientY - r.y];
}

/**
 * Modal gesture ToolOps for the node-graph view. The view's pointerdown
 * handlers spawn these through ctx.toolstack.execTool, which routes pointer
 * events to the op until it ends. Each op carries UndoFlags.NO_UNDO: a gesture
 * that changes the document commits on release through the view's delegate,
 * so the dispatched graph op (graph.move_node, graph.connect, …) is the
 * single undoable entry the gesture leaves behind. Escape cancels a gesture
 * and restores what its preview changed.
 */

/**
 * Drags one node frame in graph space. Preview goes through
 * frame.previewPos; release commits through frame.onMoveCommit, and a
 * sub-move release (a plain click on the header) commits nothing.
 */
export class NodeMoveModalOp<CTX extends IContextBase = IContextBase> extends ToolOp<
  {},
  {},
  ContextLike
> {
  private _frame: NodeFrame<CTX> | undefined;
  private _startX = 0;
  private _startY = 0;
  private _base = new Vector2();

  constructor(frame?: NodeFrame<CTX>, e?: PointerEvent) {
    super();
    this._frame = frame;
    if (frame !== undefined) {
      this._base.load(frame.node.pos);
    }
    if (e !== undefined) {
      this._startX = e.clientX;
      this._startY = e.clientY;
    }
  }

  static tooldef() {
    return {
      uiname     : "Move Node",
      description: "Drag a node to a new position",
      toolpath   : "nodeview.translate_node",
      is_modal   : true,
      undoflag   : UndoFlags.NO_UNDO,
      inputs     : {},
      outputs    : {},
    };
  }

  on_pointermove(e: PointerEvent) {
    const frame = this._frame;
    if (frame === undefined) {
      return;
    }
    const s = frame.getScale();
    frame.previewPos = new Vector2([
      this._base[0] + (e.clientX - this._startX) / s,
      this._base[1] + (e.clientY - this._startY) / s,
    ]);
    frame.syncPosition();
    frame.onMovePreview?.(frame);
  }

  on_pointerup(_e: PointerEvent) {
    this._commit();
  }

  on_pointercancel(_e: PointerEvent) {
    this.modalEnd(true);
  }

  override on_keydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      this.modalEnd(true);
    } else if (e.key === "Enter" || e.key === " ") {
      this._commit();
    }
  }

  private _commit() {
    const frame = this._frame;
    this._frame = undefined;
    if (frame !== undefined) {
      const dropped = frame.previewPos;
      frame.previewPos = undefined;
      if (dropped !== undefined) {
        frame.onMoveCommit?.(frame, dropped[0], dropped[1]);
      }
    }
    this.modalEnd(false);
  }

  override modalEnd(was_cancelled?: boolean) {
    const frame = this._frame;
    this._frame = undefined;
    if (frame !== undefined && frame.previewPos !== undefined) {
      frame.previewPos = undefined;
      frame.syncPosition();
      frame.onMovePreview?.(frame);
      frame.style.opacity = "";
    }
    super.modalEnd(was_cancelled);
  }
}
ToolOp.register(NodeMoveModalOp as unknown as Parameters<typeof ToolOp.register>[0]);

/**
 * Marquee selection on the view's empty canvas. A release within
 * CLICK_SLOP_PX is a click and clears the selection instead; holding shift
 * keeps the existing selection either way. Selection is view state, so the
 * op commits nothing.
 */
export class BoxSelectModalOp<CTX extends IContextBase = IContextBase> extends ToolOp<
  {},
  {},
  ContextLike
> {
  private _view: NodeGraphView<CTX> | undefined;
  private _start: [number, number] | undefined;
  private _marquee: HTMLDivElement | undefined;

  constructor(view?: NodeGraphView<CTX>, e?: PointerEvent) {
    super();
    this._view = view;
    if (view !== undefined && e !== undefined) {
      this._start = localPoint(view, e);
    }
  }

  static tooldef() {
    return {
      uiname     : "Box Select",
      description: "Drag a box to select the nodes it touches",
      toolpath   : "nodeview.box_select",
      is_modal   : true,
      undoflag   : UndoFlags.NO_UNDO,
      inputs     : {},
      outputs    : {},
    };
  }

  on_pointermove(e: PointerEvent) {
    const view = this._view;
    const start = this._start;
    if (view === undefined || start === undefined) {
      return;
    }

    const [x, y] = localPoint(view, e);

    // Created on the first move, so a plain click never shows a marquee.
    if (this._marquee === undefined) {
      this._marquee = document.createElement("div");
      this._marquee.style.cssText = "position: absolute; pointer-events: none;";
      this._marquee.style.border = `1px dashed ${view.getDefault("BoxSelectBorder") as string}`;
      this._marquee.style.background = view.getDefault("BoxSelectBG") as string;
      view.panzoom.shadow.appendChild(this._marquee);
    }

    this._marquee.style.left = Math.min(start[0], x) + "px";
    this._marquee.style.top = Math.min(start[1], y) + "px";
    this._marquee.style.width = Math.abs(x - start[0]) + "px";
    this._marquee.style.height = Math.abs(y - start[1]) + "px";
  }

  on_pointerup(e: PointerEvent) {
    const view = this._view;
    const start = this._start;
    if (view === undefined || start === undefined) {
      this.modalEnd(false);
      return;
    }

    const end = localPoint(view, e);

    if (
      Math.abs(end[0] - start[0]) < CLICK_SLOP_PX &&
      Math.abs(end[1] - start[1]) < CLICK_SLOP_PX
    ) {
      if (!e.shiftKey) {
        view.clearSelection();
      }
      this.modalEnd(false);
      return;
    }

    const a = view.panzoom.transform.unproject(start);
    const b = view.panzoom.transform.unproject(end);
    view.boxSelect(
      [Math.min(a[0], b[0]), Math.min(a[1], b[1])],
      [Math.max(a[0], b[0]), Math.max(a[1], b[1])],
      e.shiftKey
    );
    this.modalEnd(false);
  }

  on_pointercancel(_e: PointerEvent) {
    this.modalEnd(true);
  }

  override modalEnd(was_cancelled?: boolean) {
    this._marquee?.remove();
    this._marquee = undefined;
    this._view = undefined;
    this._start = undefined;
    super.modalEnd(was_cancelled);
  }
}
ToolOp.register(BoxSelectModalOp as unknown as Parameters<typeof ToolOp.register>[0]);

/**
 * Drives an already-begun {@link NodeGraphView.linkDrag} gesture: moves
 * update the preview segment, release drops (the drag dispatches the
 * connect/disconnect edits through the view's delegate), Escape cancels.
 */
export class LinkDragModalOp<CTX extends IContextBase = IContextBase> extends ToolOp<
  {},
  {},
  ContextLike
> {
  private _view: NodeGraphView<CTX> | undefined;

  constructor(view?: NodeGraphView<CTX>) {
    super();
    this._view = view;
  }

  static tooldef() {
    return {
      uiname     : "Drag Link",
      description: "Drag a link between two sockets",
      toolpath   : "nodeview.link_drag",
      is_modal   : true,
      undoflag   : UndoFlags.NO_UNDO,
      inputs     : {},
      outputs    : {},
    };
  }

  on_pointermove(e: PointerEvent) {
    const view = this._view;
    if (view !== undefined) {
      view.linkDrag.update(localPoint(view, e));
    }
  }

  on_pointerup(e: PointerEvent) {
    const view = this._view;
    this._view = undefined;
    if (view !== undefined) {
      view.linkDrag.drop(localPoint(view, e));
    }
    this.modalEnd(false);
  }

  on_pointercancel(_e: PointerEvent) {
    this.modalEnd(true);
  }

  override modalEnd(was_cancelled?: boolean) {
    const view = this._view;
    this._view = undefined;
    if (view !== undefined && view.linkDrag.active) {
      view.linkDrag.cancel();
    }
    super.modalEnd(was_cancelled);
  }
}
ToolOp.register(LinkDragModalOp as unknown as Parameters<typeof ToolOp.register>[0]);
