import {Editor} from "../editor_base.js";
import {UIBase} from "../../../scripts/ui_base.js";
import {PackFlags} from "../../../scripts/ui_base.js";
import {Icons} from "../icon_enum.js";
import * as nstructjs from "../../util/struct.js";
import {KeyMap, HotKey} from "../../../scripts/simple_events.js";

export class LogEditor extends Editor {
  constructor() {
    super();
  }

  getKeyMaps() {
    return [

    ]
  }

  init() {
    super.init();

    this.table = this.container.table();
    this.rebuild();
  }

  buildLines() {
    let toolstack = this.ctx.toolstack;
    let count = 8;

    let lines = [];

    for (let i=toolstack.length-1; i >= 0 && i>=toolstack.length-count; i--) {
      lines.push({
        line  : toolstack[i].genToolString(),
        index : i
      });
    }

    return lines;
  }

  rebuild() {
    if (!this.ctx || !this.table)
      return;

    let table2 = this.container.table();
    table2.remove();

    let lines = this.buildLines();
    let buf = "";

    for (let line of lines) {
      buf += line.line + "\n";
    }
    buf += this.ctx.toolstack.cur;

    if (buf === this._last_buf) {
      return;
    }

    this._last_buf = buf;

    for (let l of lines) {
      let row = table2.row();

      row.label(l.line);
      if (l.index === this.ctx.toolstack.cur) {
        row.background = "rgb(0, 200, 255, 0.5)";
      }
    }

    this.table.update();

    window.setTimeout(() => {
      this.table.remove();
      this.table = table2;
      this.container.add(this.table);
    }, 150);
  }

  update() {
    this.rebuild();
  }

  static define() {return {
    tagname  : "log-editor-x",
    areaname : "log",
    uiname   : "Command Log",
    icon     : -1
  }}
};
Editor.register(LogEditor);
LogEditor.STRUCT = nstructjs.STRUCT.inherit(LogEditor, Editor) + `
}
`;
nstructjs.register(LogEditor);
