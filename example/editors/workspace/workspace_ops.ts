import {ToolOp, UndoFlags, Vector2} from '../../pathux.js';
import type {AppContext} from "../../core/context.js";

export class PanOp extends ToolOp<{}, {}, AppContext> {
  start_mpos: Vector2 | undefined;
  last_mpos: Vector2 | undefined;

  constructor(start_mpos?: number[] | Vector2) {
    super();

    this.start_mpos = start_mpos !== undefined ? new Vector2(start_mpos) : undefined;
    this.last_mpos = start_mpos !== undefined ? new Vector2(start_mpos) : undefined;
  }

  static tooldef() {return {
    uiname      : "Pan",
    description : "Pan",
    toolpath    : "canvas.pan",
    is_modal    : true,
    undoflag    : UndoFlags.NO_UNDO
  }}

  finish() {
    this.modalEnd(false);
  }

  onmousedown(e: MouseEvent) {
    console.log("pan mouse down");
    this.finish();
  }

  onmousemove(e: MouseEvent) {
    const ctx = this.modal_ctx;
    if (!ctx) {
      return;
    }

    // BUG FIX: was `ctx.canvas.getLocalMouse(...)`, but getLocalMouse is a
    // WorkspaceEditor method, not a Canvas method.
    const workspace = ctx.workspace;
    if (!workspace) {
      return;
    }

    const mpos = workspace.getLocalMouse([e.x, e.y]);

    if (!this.start_mpos) {
      this.start_mpos = new Vector2(mpos);
      this.last_mpos!.load(mpos);
      return;
    }

    console.log(mpos);

    this.last_mpos!.load(mpos);
  }

  onmouseup(e: MouseEvent) {
    console.log("pan mouse up");
    this.finish();
  }
}
ToolOp.register(PanOp);
