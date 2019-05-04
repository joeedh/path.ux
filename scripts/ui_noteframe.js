let _ui_noteframe = undefined;

define([
  "./util", "./ui", "./ui_base"
], function(util, ui, ui_base) {
  "use strict";
  
  let exports = _ui_noteframe = {};
  let UIBase = ui_base.UIBase;
  
  let Note = exports.Note = class Note extends ui_base.UIBase {
    constructor() {
      super();
     
      this.dom = document.createElement("div");
      let style = document.createElement("style");
      
      style.textContent = `
      div {
        height : 24px;
      }
      `;
      
      this.shadow.appendChild(style);
      this.shadow.appendChild(this.dom);
    }
    
    static define() {return {
      tagname : "note-x"
    }}
  }
  
  UIBase.register(Note);
  
  exports.noteframes = [];
  
  exports.sendNote = function(msg, color, timeout) {
    for (let frame of exports.noteframes) {
      try {
        frame.addNote(msg, color, timeout);
      } catch (error) {
        print_stack(error);
        console.log("bad notification frame");
      }
    }
    
  }
  let NoteFrame = exports.NoteFrame = class NoteFrame extends ui.RowFrame {
    constructor() {
      super();
      this._h = "20px";
    }
    
    init() {
      exports.noteframes.push(this);
      this.background = ui_base.getDefault("BoxSubBG");
    }
    
    _ondestroy() {
      if (exports.noteframes.indexOf(this) >= 0) {
        exports.noteframes.remove(this)
      }
      
      super._ondestroy();
    }
    
    setCSS() {
      return;
    }
    
    addNote(msg, color="rgba(255,0,0,0.2)", timeout=1200) {
      //let note = document.createElement("note-x");
      
      //note.ctx = this.ctx;
      //note.background = "red";
      //note.dom.innerText = msg;
      
      //this._add(note);
       
      let note = document.createElement("span");
      let mark = document.createElement("span");
      let ntext = document.createElement("span");
      
      mark.innerText = "!";
      
      mark.style["color"] = "white";
      mark.style["margin"] = ntext.style["margin"] = "0px"
      mark.style["padding"] = ntext.style["padding"] = "0px"
      mark.style["background-color"] = color;
      
      ntext.innerText = " " + msg;
      note.appendChild(mark);
      note.appendChild(ntext);
      note.style["color"] = "white";
      
      this.dom.style["display"] = "inline-block";
      this.dom.appendChild(note);
      
      this.style["margin"] = "2px";
      this.style["padding"] = "0px";
      this.dom.style["margin"] = "2px";
      this.dom.style["padding"] = "0px";
      note.style["margin"] = "2px";
      note.style["padding"] = "0px";
      
      //this.dom.style["position"] = "absolute";
      //this.style["position"] = "absolute";
      //note.style["position"] = "absolute";

      this.style["height"] = this._h;
      this.dom.style["height"] = this._h;
      note.style["height"] = this._h;
      
      window.setTimeout(() => {
        note.remove();
      }, timeout);
      
      //this.appendChild(note);
      return note;
      
    }
    
    static define() {return {
      tagname : "noteframe-x"
    }}
  }
  UIBase.register(NoteFrame);
  
  return exports;
});
