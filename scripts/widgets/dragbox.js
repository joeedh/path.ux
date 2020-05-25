import {UIBase} from '../core/ui_base.js';
import {Container} from '../core/ui.js';

export class DragBox extends Container {
  constructor() {
    super();

    this._done = false;
    this.header = undefined;
  }

  init() {
    super.init();

    let header = this.header = this.row();

    header.style["min-width"] = "256px";
    header.style["height"] = "32px";

    header.background = this.getDefault("Background");

    this.setCSS();
  }

  end() {
    if (this._done) {
      return;
    }
    this.remove();

    if (this._onend) {
      this._onend();
    }

    if (this.onend) {
      this.onend();
    }
  }

  setCSS() {
    super.setCSS();

    this.background = this.getDefault("Background");
  }

  static define() {return {
    tagname : "drag-box-x",
    style   : "panel"
  }}
}
UIBase.register(DragBox);
