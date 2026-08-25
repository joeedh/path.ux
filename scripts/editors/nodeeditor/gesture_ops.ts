import { ToolOp, UndoFlags } from "../../path-controller/toolsys/toolsys";
import type { ContextLike } from "../../path-controller/controller/controller_abstract";
import { Vector2 } from "../../path-controller/util/vectormath";
import { IContextBase } from "../../core/context_base";
import type { FrameMove, NodeFrame } from "./nodeframe";
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
 * Drags node frames in graph space; the pressed frame leads and the rest come
 * from the view's selection. Preview goes through each frame's previewPos, and
 * release commits every frame in one call to the lead's onMoveCommit. A release
 * within CLICK_SLOP_PX moves nothing and reports onMoveClick instead, which is
 * where the view resolves a selection it deferred at press time.
 */
export class NodeMoveModalOp<CTX extends IContextBase = IContextBase> extends ToolOp<
  {},
  {},
  ContextLike
> {
  private _frames: NodeFrame<CTX>[] = [];
  private _bases: Vector2[] = [];
  private _startX = 0;
  private _startY = 0;
  private _moved = false;

  constructor(frames?: readonly NodeFrame<CTX>[], e?: PointerEvent) {
    super();
    this._frames = frames !== undefined ? [...frames] : [];
    this._bases = this._frames.map((f) => new Vector2(f.node.pos));
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
    const lead = this._frames[0];
    if (lead === undefined) {
      return;
    }

    const dx = e.clientX - this._startX;
    const dy = e.clientY - this._startY;
    if (Math.abs(dx) >= CLICK_SLOP_PX || Math.abs(dy) >= CLICK_SLOP_PX) {
      this._moved = true;
    }

    const s = lead.getScale();
    for (let i = 0; i < this._frames.length; i++) {
      const frame = this._frames[i];
      frame.previewPos = new Vector2([this._bases[i][0] + dx / s, this._bases[i][1] + dy / s]);
      frame.syncPosition();
    }
    lead.onMovePreview?.(this._frames);
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
    const frames = this._frames;
    const moved = this._moved;
    this._frames = [];

    const lead = frames[0];
    const moves: FrameMove<CTX>[] = [];
    for (const frame of frames) {
      const dropped = frame.previewPos;
      frame.previewPos = undefined;
      frame.style.opacity = "";
      if (dropped !== undefined && moved) {
        moves.push({ frame, x: dropped[0], y: dropped[1] });
      } else {
        frame.syncPosition();
      }
    }

    if (lead !== undefined) {
      if (moves.length > 0) {
        lead.onMoveCommit?.(moves);
      } else {
        lead.onMoveClick?.(lead);
      }
    }
    this.modalEnd(false);
  }

  override modalEnd(was_cancelled?: boolean) {
    const frames = this._frames;
    this._frames = [];

    let reverted = false;
    for (const frame of frames) {
      if (frame.previewPos === undefined) {
        continue;
      }
      frame.previewPos = undefined;
      frame.syncPosition();
      frame.style.opacity = "";
      reverted = true;
    }
    if (reverted) {
      frames[0].onMovePreview?.(frames);
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
