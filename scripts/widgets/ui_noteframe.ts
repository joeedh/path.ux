import * as util from "../path-controller/util/util";
import * as ui from "../core/ui";
import * as ui_base from "../core/ui_base";
import { Icons, css2color, color2css, getFont } from "../core/ui_base";
import { IContextBase } from "../core/context_base";

/* Helper for CSSStyleDeclaration string indexing. */
type StyleRecord = CSSStyleDeclaration & Record<string, string>;

let UIBase = ui_base.UIBase;

export class Note<CTX extends IContextBase = IContextBase> extends ui_base.UIBase<CTX> {
  _noteid: string | undefined;
  height: number;
  showExclMark: boolean;
  dom: HTMLDivElement;
  color: string;
  mark: HTMLDivElement | undefined;
  ntext!: HTMLDivElement;

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
      style  : "notification",
    };
  }

  setLabel(s: string) {
    let color = this.color;
    if (this.showExclMark && this.mark === undefined) {
      this.mark = document.createElement("div");
      (this.mark.style as StyleRecord)["display"] = "flex";
      (this.mark.style as StyleRecord)["flex-direction"] = "row";
      (this.mark.style as StyleRecord)["flex-wrap"] = "nowrap";

      //this.mark.style["width"]
      let sheet = 0;

      let size = ui_base.iconmanager.getTileSize(sheet);

      (this.mark.style as StyleRecord)["width"] = "" + size + "px";
      (this.mark.style as StyleRecord)["height"] = "" + size + "px";

      this.dom.appendChild(this.mark);

      this.ntext = document.createElement("div");
      (this.ntext.style as StyleRecord)["display"] = "inline-flex";
      (this.ntext.style as StyleRecord)["flex-wrap"] = "nowrap";

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

    (this.style as StyleRecord)["display"] = "flex";
    (this.style as StyleRecord)["flex-wrap"] = "nowrap";
    (this.style as StyleRecord)["flex-direction"] = "row";
    (this.style as StyleRecord)["border-radius"] = "7px";
    (this.style as StyleRecord)["padding"] = "2px";

    (this.style as StyleRecord)["color"] = (this.getDefault("DefaultText") as { color: string }).color;
    let clr = css2color(this.color);
    let clrCss = color2css([clr[0], clr[1], clr[2], 0.25]);

    (this.style as StyleRecord)["background-color"] = clrCss;
    this.setCSS();
  }

  setCSS() {
    super.setCSS(false);
  }
}

UIBase.internalRegister(Note);

export class ProgBarNote<CTX extends IContextBase = IContextBase> extends Note<CTX> {
  _percent: number;
  barWidth: number;
  bar: HTMLDivElement;
  bar2: HTMLDivElement;

  constructor() {
    super();

    this._percent = 0.0;
    this.barWidth = 100;

    let bar = (this.bar = document.createElement("div"));
    (bar.style as StyleRecord)["display"] = "flex";
    (bar.style as StyleRecord)["flex-direction"] = "row";
    (bar.style as StyleRecord)["width"] = this.barWidth + "px";
    (bar.style as StyleRecord)["height"] = this.height + "px";
    (bar.style as StyleRecord)["background-color"] = this.getDefault("ProgressBarBG");
    (bar.style as StyleRecord)["border-radius"] = "12px";
    (bar.style as StyleRecord)["align-items"] = "center";
    (bar.style as StyleRecord)["padding"] = (bar.style as StyleRecord)["margin"] = "0px";

    let bar2 = (this.bar2 = document.createElement("div"));

    (bar2.style as StyleRecord)["display"] = "flex";
    (bar2.style as StyleRecord)["flex-direction"] = "row";
    (bar2.style as StyleRecord)["height"] = this.height + "px";
    (bar2.style as StyleRecord)["background-color"] = this.getDefault("ProgressBar");
    (bar2.style as StyleRecord)["border-radius"] = "12px";
    (bar2.style as StyleRecord)["align-items"] = "center";
    (bar2.style as StyleRecord)["padding"] = (bar2.style as StyleRecord)["margin"] = "0px";

    this.bar.appendChild(bar2);
    this.dom.appendChild(this.bar);
  }

  get percent() {
    return this._percent;
  }

  set percent(val: number) {
    this._percent = val;
    this.setCSS();
  }

  static define() {
    return {
      tagname: "note-progress-x",
      style  : "notification",
    };
  }

  setCSS() {
    super.setCSS();

    let w = ~~(this.percent * this.barWidth + 0.5);

    (this.bar2.style as StyleRecord)["width"] = w + "px";
  }

  init() {
    super.init();
  }
}

UIBase.internalRegister(ProgBarNote);

export class NoteFrame<CTX extends IContextBase = IContextBase> extends ui.RowFrame<CTX> {
  _h: number;

  constructor() {
    super();
    this._h = 20;
  }

  static define() {
    return {
      tagname: "noteframe-x",
      style  : "noteframe",
    };
  }

  init() {
    super.init();

    this.noMarginsOrPadding();

    noteframes.push(this as unknown as NoteFrame);
    this.background = this.getDefault("background-color");
    (this.style as StyleRecord)["flex-grow"] = "unset";
  }

  setCSS() {
    super.setCSS();

    (this.style as StyleRecord)["width"] = "min-contents";
    (this.style as StyleRecord)["height"] = this._h + "px";
  }

  _ondestroy() {
    if (noteframes.indexOf(this as unknown as NoteFrame) >= 0) {
      noteframes.remove(this as unknown as NoteFrame);
    }

    super._ondestroy();
  }

  progbarNote(msg: string, percent: number, color = "rgba(255,0,0,0.2)", timeout = 700, id: string = msg) {
    let note: ProgBarNote<CTX> | undefined;

    for (let child of this.childWidgets) {
      if ((child as Note<CTX>)._noteid === id) {
        note = child as ProgBarNote<CTX>;
        break;
      }
    }

    let f = (100.0 * Math.min(percent, 1.0)).toFixed(1);

    if (note === undefined) {
      note = this.addNote(msg, color, -1, "note-progress-x") as ProgBarNote<CTX>;
      note._noteid = id;
    }

    //note.setLabel(msg + " " + f + "%");
    note.percent = percent;

    if (percent >= 1.0) {
      //note.setLabel(msg + " " + f + "%");

      window.setTimeout(() => {
        note!.remove();
      }, timeout);
    }

    return note;
  }

  addNote(msg: string, color = "rgba(255,0,0,0.2)", timeout = 1200, tagname = "note-x", showExclMark = true) {
    //let note = UIBase.createElement("note-x");

    //note.ctx = this.ctx;
    //note.background = "red";
    //note.dom.innerText = msg;

    //this._add(note);

    let note = UIBase.createElement(tagname) as Note<CTX>;

    note.color = color;
    note.setLabel(msg);

    (note.style as StyleRecord)["text-align"] = "center";

    (note.style as StyleRecord)["font"] = getFont(note, undefined, "DefaultText");
    (note.style as StyleRecord)["color"] = (this.getDefault("DefaultText") as { color: string }).color;
    note.showExclMark = showExclMark;

    this.add(note);

    this.noMarginsOrPadding();
    note.noMarginsOrPadding();

    //this.dom.style["position"] = UIBase.PositionKey;
    //this.style["position"] = UIBase.PositionKey;
    //note.style["position"] = UIBase.PositionKey;

    (note.style as StyleRecord)["height"] = this._h + "px";
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

export function getNoteFrames(screen: Node): NoteFrame[] {
  let ret: NoteFrame[] = [];

  let rec = (n: Node) => {
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
  };

  rec(screen);
  return ret;
}

export let noteframes: NoteFrame[] = [];

export function sendNote(screen: Node, msg: string, color?: string, timeout = 3000, showExclMark = true) {
  noteframes = getNoteFrames(screen);

  for (let frame of noteframes) {
    try {
      frame.addNote(msg, color, timeout, undefined, showExclMark);
    } catch (error: unknown) {
      print_stack(error);
      console.log((error as Error).stack, (error as Error).message);
      console.log("bad notification frame");
    }
  }
}

window._sendNote = sendNote as (...args: unknown[]) => void;

export function error(screen: Node, msg: string, timeout?: number) {
  return sendNote(screen, msg, ui_base.color2css([1.0, 0.0, 0.0, 1.0]), timeout);
}

export function warning(screen: Node, msg: string, timeout?: number) {
  return sendNote(screen, msg, ui_base.color2css([0.78, 0.78, 0.2, 1.0]), timeout);
}

export function message(screen: Node, msg: string, timeout?: number) {
  return sendNote(screen, msg, ui_base.color2css([0.2, 0.9, 0.1, 1.0]), timeout, false);
}

export function progbarNote(screen: Node, msg: string, percent: number, color?: string, timeout?: number) {
  noteframes = getNoteFrames(screen);

  for (let frame of noteframes) {
    try {
      frame.progbarNote(msg, percent, color, timeout);
    } catch (error: unknown) {
      print_stack(error);
      console.log((error as Error).stack, (error as Error).message);
      console.log("bad notification frame");
    }
  }
}
