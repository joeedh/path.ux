import * as util from './util.js';
import * as ui from './ui.js';
import * as ui_base from './ui_base.js';

let UIBase = ui_base.UIBase;

export class Note extends ui_base.UIBase {
  constructor() {
    super();
   
    this.dom = document.createElement("span");
    let style = document.createElement("style");

    this._id = undefined;

    style.textContent = `
    div {
      height : 20px;
      padding : 0px;
      margin : 0px;
      color : black;
    }
    `;

    this.color = "red";
    this.shadow.appendChild(style);
    this.shadow.appendChild(this.dom);
  }

  setLabel(s) {
    let color = this.color;
    if (this.mark === undefined) {

      this.mark = document.createElement("span");
      this.ntext = document.createElement("span");

      this.dom.appendChild(this.mark);
      this.dom.appendChild(this.ntext);

      this.mark.style["color"] = "white";
      this.mark.style["margin"] = this.ntext.style["margin"] = "0px"
      this.mark.style["padding"] = this.ntext.style["padding"] = "0px"
      this.mark.style["background-color"] = color;
    }

    let mark = this.mark, ntext = this.ntext;
    mark.innerText = "!";
    ntext.innerText = " " + s;
  }

  init() {
    this.style["color"] = ui_base.getDefault("NoteTextColor");
  }

  static define() {return {
    tagname : "note-x"
  }}
}
UIBase.register(Note);

export class NoteFrame extends ui.RowFrame {
  constructor() {
    super();
    this._h = "20px";
  }
  
  init() {
    this.noMargins();

    noteframes.push(this);
    this.background = ui_base.getDefault("NoteBG");
  }
  
  _ondestroy() {
    if (noteframes.indexOf(this) >= 0) {
      noteframes.remove(this)
    }
    
    super._ondestroy();
  }
  
  setCSS() {
    return;
  }

  progbarNote(msg, percent, color="rgba(255,0,0,0.2)", timeout=700) {
    let id = msg, note;

    for (let child of this.dom.childNodes) {
      if (child._id == msg) {

      }

      note = child;
      break;
    }

    let f = (100.0*Math.min(percent, 1.0)).toFixed(1);

    if (note === undefined) {
      note = this.addNote(msg + " " + f + "%", color, -1);
      note._id = msg;
    }

    note.setLabel(msg + " " + f + "%");

    if (percent >= 1.0) {
      note.setLabel(msg + " " + f + "%");

      window.setTimeout(() => {
        note.remove();
      }, timeout);
    }

    return note;
  }

  addNote(msg, color="rgba(255,0,0,0.2)", timeout=1200) {
    //let note = document.createElement("note-x");
    
    //note.ctx = this.ctx;
    //note.background = "red";
    //note.dom.innerText = msg;
    
    //this._add(note);

    let note = document.createElement("note-x");

    note.color = color;
    note.setLabel(msg);

    note.style["text-align"] = "center";

    note.style["color"] = ui_base.getDefault("NoteTextColor");

    this.dom.style["display"] = "inline-block";
    this.dom.appendChild(note);
    
    this.style["margin-left"] = "0px";
    this.style["margin-right"] = "0px";
    this.style["padding"] = "0px";
    this.dom.style["margin-left"] = "0px";
    this.dom.style["margin-right"] = "0px";
    this.dom.style["padding"] = "0px";
    note.style["margin-left"] = "0px";
    note.style["margin-right"] = "0px";
    note.style["padding"] = "0px";
    
    //this.dom.style["position"] = "absolute";
    //this.style["position"] = "absolute";
    //note.style["position"] = "absolute";

    this.style["height"] = this._h;
    this.dom.style["height"] = this._h;
    note.style["height"] = this._h;

    if (timeout != -1) {
      window.setTimeout(() => {
        console.log("remove!");
        note.remove();
      }, timeout);
    }
    
    //this.appendChild(note);
    return note;
    
  }
  
  static define() {return {
    tagname : "noteframe-x"
  }}
}
UIBase.register(NoteFrame);

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
      console.log("bad notification frame");
    }
  }
}

export function sendNote(screen, msg, color, timeout=1000) {
  noteframes = getNoteFrames(screen);

  console.log(noteframes.length);

  for (let frame of noteframes) {
    console.log(frame);

    try {
      frame.addNote(msg, color, timeout);
    } catch (error) {
      print_stack(error);
      console.log("bad notification frame");
    }
  }
}

window._sendNote = sendNote;

export function warning(screen, msg, timeout=1000) {
  return sendNote(screen, msg, ui_base.color2css([1.0, 0.0, 0.0, 1.0]), timeout);
}
