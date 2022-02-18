import * as util from '../path-controller/util/util.js';
import * as ui from '../core/ui.js';
import * as ui_base from '../core/ui_base.js';
import {Icons, css2color, color2css} from '../core/ui_base.js';

let UIBase = ui_base.UIBase;

export class Note extends ui_base.UIBase {
  constructor() {
    super();

    let style = document.createElement("style");

    this._noteid = undefined;
    this.height = 20;

    this.showExclMark = true;

    style.textContent = `
    .notex {
      display : flex;
      flex-direction : row;
      flex-wrap : nowrap;
      height : {this.height}px;
      padding : 0px;
      margin : 0px;
    }
    `;

    this.dom = document.createElement("div");
    this.dom.setAttribute("class", "notex");
    this.color = "red";

    this.shadow.appendChild(style);
    this.shadow.append(this.dom);
    this.setLabel("");
  }

  static define() {
    return {
      tagname: "note-x",
      style  : 'notification',
    }
  }

  setLabel(s) {
    let color = this.color;
    if (this.showExclMark && this.mark === undefined) {
      this.mark = document.createElement("div");
      this.mark.style["display"] = "flex";
      this.mark.style["flex-direction"] = "row";
      this.mark.style["flex-wrap"] = "nowrap";

      //this.mark.style["width"]
      let sheet = 0;

      let size = ui_base.iconmanager.getTileSize(sheet);

      this.mark.style["width"] = "" + size + "px";
      this.mark.style["height"] = "" + size + "px";

      this.dom.appendChild(this.mark);

      this.ntext = document.createElement("div");
      this.ntext.style["display"] = "inline-flex";
      this.ntext.style["flex-wrap"] = "nowrap";

      this.dom.appendChild(this.ntext);

      ui_base.iconmanager.setCSS(Icons.NOTE_EXCL, this.mark, sheet);

      //this.mark.style["margin"] = this.ntext.style["margin"] = "0px"
      //this.mark.style["padding"] = this.ntext.style["padding"] = "0px"
      //this.mark.style["background-color"] = color;
    } else if (!this.showExclMark && this.mark) {
      this.mark.remove();
      this.mark = undefined;
    }

    let ntext = this.ntext;
    //mark.innerText = "!";
    ntext.innerText = " " + s;
  }

  init() {
    super.init();

    this.setAttribute("class", "notex");

    this.style["display"] = "flex";
    this.style["flex-wrap"] = "nowrap";
    this.style["flex-direction"] = "row";
    this.style["border-radius"] = "7px";
    this.style["padding"] = "2px";

    this.style["color"] = this.getDefault("DefaultText").color;
    let clr = css2color(this.color);
    clr = color2css([clr[0], clr[1], clr[2], 0.25]);

    this.style["background-color"] = clr;
    this.setCSS();
  }
}

UIBase.internalRegister(Note);

export class ProgBarNote extends Note {
  constructor() {
    super();

    this._percent = 0.0;
    this.barWidth = 100;

    let bar = this.bar = document.createElement("div");
    bar.style["display"] = "flex";
    bar.style["flex-direction"] = "row";
    bar.style["width"] = this.barWidth + "px";
    bar.style["height"] = this.height + "px";
    bar.style["background-color"] = this.getDefault("ProgressBarBG");
    bar.style["border-radius"] = "12px";
    bar.style["align-items"] = "center";
    bar.style["padding"] = bar.style["margin"] = "0px";

    let bar2 = this.bar2 = document.createElement("div");
    let w = 50.0;

    bar2.style["display"] = "flex";
    bar2.style["flex-direction"] = "row";
    bar2.style["height"] = this.height + "px";
    bar2.style["background-color"] = this.getDefault("ProgressBar");
    bar2.style["border-radius"] = "12px";
    bar2.style["align-items"] = "center";
    bar2.style["padding"] = bar2.style["margin"] = "0px";

    this.bar.appendChild(bar2);
    this.dom.appendChild(this.bar);
  }

  get percent() {
    return this._percent;
  }

  set percent(val) {
    this._percent = val;
    this.setCSS();
  }

  static define() {
    return {
      tagname: "note-progress-x",
      style  : 'notification',
    }
  }

  setCSS() {
    super.setCSS();

    let w = ~~(this.percent*this.barWidth + 0.5);

    this.bar2.style["width"] = w + "px";
  }

  init() {
    super.init();
  }
}

UIBase.internalRegister(ProgBarNote);

export class NoteFrame extends ui.RowFrame {
  constructor() {
    super();
    this._h = 20;
  }

  static define() {
    return {
      tagname: "noteframe-x",
      style  : 'noteframe',
    }
  }

  init() {
    super.init();

    this.noMarginsOrPadding();

    noteframes.push(this);
    this.background = this.getDefault("background-color");
    this.style['flex-grow'] = 'unset';
  }

  setCSS() {
    super.setCSS();

    this.style["width"] = "min-contents";
    this.style["height"] = this._h + "px";
  }

  _ondestroy() {
    if (noteframes.indexOf(this) >= 0) {
      noteframes.remove(this)
    }

    super._ondestroy();
  }

  progbarNote(msg, percent, color = "rgba(255,0,0,0.2)", timeout = 700, id = msg) {
    let note;

    for (let child of this.children) {
      if (child._noteid === id) {
        note = child;
        break;
      }
    }

    let f = (100.0*Math.min(percent, 1.0)).toFixed(1);

    if (note === undefined) {
      note = this.addNote(msg, color, -1, "note-progress-x");
      note._noteid = id;
    }

    //note.setLabel(msg + " " + f + "%");
    note.percent = percent;

    if (percent >= 1.0) {
      //note.setLabel(msg + " " + f + "%");

      window.setTimeout(() => {
        note.remove();
      }, timeout);
    }

    return note;
  }

  addNote(msg, color = "rgba(255,0,0,0.2)", timeout = 1200, tagname = "note-x", showExclMark=true) {
    //let note = UIBase.createElement("note-x");

    //note.ctx = this.ctx;
    //note.background = "red";
    //note.dom.innerText = msg;

    //this._add(note);

    let note = UIBase.createElement(tagname);

    note.color = color;
    note.setLabel(msg);

    note.style["text-align"] = "center";

    note.style["font"] = ui_base.getFont(note, "DefaultText");
    note.style["color"] = this.getDefault("DefaultText").color;
    note.showExclMark = showExclMark;

    this.add(note);

    this.noMarginsOrPadding();
    note.noMarginsOrPadding();

    //this.dom.style["position"] = UIBase.PositionKey;
    //this.style["position"] = UIBase.PositionKey;
    //note.style["position"] = UIBase.PositionKey;

    note.style["height"] = this._h + "px";
    note.height = this._h;

    if (timeout !== -1) {
      window.setTimeout(() => {
        //console.log("remove!");
        note.remove();
      }, timeout);
    }

    //this.appendChild(note);
    return note;

  }
}

UIBase.internalRegister(NoteFrame);

export function getNoteFrames(screen) {
  let ret = [];

  let rec = (n) => {

    if (n instanceof NoteFrame) {
      ret.push(n);
    }

    if (n.childNodes !== undefined) {
      for (let node of n.childNodes) {
        rec(node);
      }
    }

    if (n instanceof ui_base.UIBase && n.shadow !== undefined && n.shadow.childNodes) {
      for (let node of n.shadow.childNodes) {
        rec(node);
      }
    }
  }

  rec(screen);
  return ret;
}

export let noteframes = [];

export function progbarNote(screen, msg, percent, color, timeout) {
  noteframes = getNoteFrames(screen);

  for (let frame of noteframes) {
    try {
      frame.progbarNote(msg, percent, color, timeout);
    } catch (error) {
      print_stack(error);
      console.log(error.stack, error.message);
      console.log("bad notification frame");
    }
  }
}

export function sendNote(screen, msg, color, timeout = 3000, showExclMark=true) {
  noteframes = getNoteFrames(screen);

  for (let frame of noteframes) {
    try {
      frame.addNote(msg, color, timeout, undefined, showExclMark);
    } catch (error) {
      print_stack(error);
      console.log(error.stack, error.message);
      console.log("bad notification frame");
    }
  }
}

window._sendNote = sendNote;

export function error(screen, msg, timeout) {
  return sendNote(screen, msg, ui_base.color2css([1.0, 0.0, 0.0, 1.0]), timeout);
}

export function warning(screen, msg, timeout) {
  return sendNote(screen, msg, ui_base.color2css([0.78, 0.78, 0.2, 1.0]), timeout);
}

export function message(screen, msg, timeout) {
  return sendNote(screen, msg, ui_base.color2css([0.2, 0.9, 0.1, 1.0]), timeout, false);
}
