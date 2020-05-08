import {ToolOp, ToolFlags, UndoFlags, keymap, Vector2, util} from '../../pathux.js';

export class PanOp extends ToolOp {
  constructor(start_mpos) {
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
    let ctx = this.modal_ctx;

    this.modalEnd(false);
  }

  onmousedown(e) {
    let ctx = this.modal_ctx;
    console.log("pan mouse down");
    this.finish();
  }

  onmousemove(e) {
    let ctx = this.modal_ctx;
    let canvas = ctx.canvas;

    let mpos = canvas.getLocalMouse([e.x, e.y]);

    if (!this.start_mpos) {
      this.start_mpos = new Vector2(mpos);
      this.last_mpos.load(mpos);
      return;
    }

    console.log(mpos);

    this.last_mpos.load(mpos);
  }

  onmouseup(e) {
    let ctx = this.modal_ctx;

    console.log("pan mouse up");
    this.finish();
  }
}
ToolOp.register(PanOp);
