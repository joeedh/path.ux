"use strict";

//set default datapath controller implementation class
import cconst from './const.js';

//XXX eek why was this here!
//import {DataAPI} from './simple_controller.js';
//import {setImplementationClass} from './controller.js';
//setImplementationClass(DataAPI);

import * as util from './util.js';
import * as vectormath from './vectormath.js';
import * as ui_base from './ui_base.js';
import * as ui from './ui.js';
import * as ScreenArea from './ScreenArea.js';
import * as events from './events.js';
import * as controller from './controller.js';
import * as ScreenOverdraw from './ScreenOverdraw.js';
import * as simple_toolsys from './simple_toolsys.js';
import {ToolTip} from "./ui_widgets2.js";

/*
why am I using a toolstack here at all?  time to remove!
*/

let toolstack_getter = function() {
  throw new Error("must pass a toolstack getter to registerToolStackGetter, I know it's dumb")
}

export function registerToolStackGetter(func) {
  toolstack_getter = func;
}

let Vector2 = vectormath.Vector2,
    Vector3 = vectormath.Vector3,
    UndoFlags = simple_toolsys.UndoFlags,
    ToolFlags = simple_toolsys.ToolFlags;

import {pushModalLight, popModalLight, keymap} from "./simple_events.js";
//import {keymap} from './events';

export class ToolBase extends simple_toolsys.ToolOp {
  constructor(screen) {
    super();
    this.screen = screen;
   //super();
    
    this._finished = false;
  }

  start() {
    //toolstack_getter().execTool(this);
    this.modalStart(undefined);
  }
  
  cancel() {
    this.finish();
  }
  
  finish() {
    this._finished = true;
    this.overdraw.end();
    this.popModal(this.screen);
  }

  popModal() {
    console.log("popModal called");

    popModalLight(this.modaldata);
    this.modaldata = undefined;
  }

  modalStart(ctx) {
    this.ctx = ctx;

    if (this.modaldata !== undefined) {
      console.log("Error, modaldata was not undefined");
      popModalLight(this.modaldata);
    }

    this.overdraw = document.createElement("overdraw-x");
    this.overdraw.start(this.screen);

    let handlers = {};
    let keys = Object.getOwnPropertyNames(this);
    for (let k in this.__proto__) {
      keys.push(k);
    }
    for (let k of Object.getOwnPropertyNames(this.__proto__)) {
      keys.push(k);
    }

    for (let k in this) {
      keys.push(k);
    }

    for (let k of keys) {
      if (k.startsWith("on")) {
        handlers[k] = this[k].bind(this);
      }
    }

    //window.setTimeout(() => {
      this.modaldata = pushModalLight(handlers);
      //console.log("HANDLERS", this.modaldata.handlers);
      
    //}, 100);

    //window.addEventListener("touchmove", (e) => {
    //  console.log("touchmove");
    //}, {passive : false});
  }
  
  on_mousemove(e) {
  }
  
  on_mouseup(e) {
    this.finish();
  }
  
  on_keydown(e) {
    console.log("s", e.keyCode);
    
    switch (e.keyCode) {
      case keymap.Escape: //esc
        this.cancel();
        break;
      case keymap.Space: //space
      case keymap.Enter: //return
        this.finish();
        break;
    }
  }
}

export class AreaResizeTool extends ToolBase {
  constructor(screen, border, mpos) {
    if (screen === undefined) screen = _appstate.screen; //XXX hackish!
    
    super(screen);
    
    this.start_mpos = new Vector2(mpos);

    this.sarea = border.sareas[0];
    if (!this.sarea || border.dead) {
      console.log(border.dead, border);
      throw new Error("border corruption");
    }

    this.screen = screen;

    this.side = this.sarea._side(border);
  }

  get border() {
    return this.sarea._borders[this.side];
  }

  static tooldef() {return {
    uiname   : "Resize Area",
    toolpath : "screen.area.resize",
    icon     : ui_base.Icons.RESIZE,
    description : "change size of area",
    is_modal : true,
    hotkey : undefined,
    undoflag : UndoFlags.NO_UNDO,
    flag     : 0,
    inputs   : {}, //tool properties
    outputs  : {}  //tool properties
  }}
  
  getBorders() {
    let horiz = this.border.horiz;
    
    let ret = [];
    let visit = new Set();
    
    let rec = (v) => {
      if (visit.has(v._id)) {
        return;
      }
      
      visit.add(v._id);
      
      for (let border of v.borders) {
        if (border.horiz == horiz && !visit.has(border._id)) {
          visit.add(border._id);
          ret.push(border);
          
          rec(border.otherVertex(v));
        }
      }
    }
    
    rec(this.border.v1);
    rec(this.border.v2);
    
    return ret;
  }

  on_mouseup(e) {
    this.finish();
  }

  finish() {
    super.finish();
    this.screen.snapScreenVerts();
    this.screen.regenBorders();
    this.screen.snapScreenVerts();
    this.screen.loadFromVerts();
  }

  on_keydown(e) {
    switch (e.keyCode) {
      case keymap["Escape"]:
      case keymap["Enter"]:
      case keymap["Space"]:
        this.finish();
        break;
    }
  }
  on_mousemove(e) {
    let mpos = new Vector2([e.x, e.y]);
    
    mpos.sub(this.start_mpos);
    
    let axis = this.border.horiz ? 1 : 0;
    
    //console.log(this.border.horiz);
    
    this.overdraw.clear();
    
    let visit = new Set();
    let borders = this.getBorders();

    let color = cconst.DEBUG.screenborders ? "rgba(1.0, 0.5, 0.0, 0.1)" : "rgba(1.0, 0.5, 0.0, 1.0)";

    let bad = false;

    for (let border of borders) {
      bad = bad || !this.screen.isBorderMovable(border);

      border.oldv1 = new Vector2(border.v1);
      border.oldv2 = new Vector2(border.v2);
    }

    if (bad) {
      console.log("border is not movable");
      return;
    }

    let check = () => {
      let count = 0;

      for (let sarea of this.screen.sareas) {
        if (sarea.size[0] < 15 || sarea.size[1] < 15) {
          count++;
        }
      }

      return count;
    };

    let badcount = check();


    let snapMode = true;

    let df = mpos[axis];
    let border = this.border;

    this.screen.moveBorder(border, df, false);

    for (let border of borders) {
      //if false, stead of forcing areas to fit within screen bounds
      //in snapScreenVerts the screen bounds will be modified instead.

      if (border.outer) {
        snapMode = false;
      }

      this.overdraw.line(border.v1, border.v2, color);
    }
    
    this.start_mpos[0] = e.x;
    this.start_mpos[1] = e.y;
    this.screen.loadFromVerts();
    this.screen.setCSS();

    if (check() != badcount) {
      console.log("bad");

      for (let border of borders) {
        border.v1.load(border.oldv1);
        border.v2.load(border.oldv2);
      }
    }


    this.screen.snapScreenVerts(snapMode);
    this.screen.loadFromVerts();
    this.screen.solveAreaConstraints(snapMode);
    this.screen.setCSS();
    this.screen.updateDebugBoxes();
  }
}

//controller.registerTool(AreaResizeTool);

export class SplitTool extends ToolBase {
  constructor(screen) {
    if (screen === undefined) screen = _appstate.screen; //XXX hackish!
    
    super(screen);

    this.done = false;
    this.screen = screen;
    this.ctx = screen.ctx;
    this.sarea = undefined;
    this.t = undefined;

    this.started = false;
  }
  
  static tooldef() {return {
    uiname   : "Split Area",
    toolpath : "screen.area.split",
    icon     : ui_base.Icons.SMALL_PLUS,
    description : "split an area in two",
    is_modal : true,
    hotkey   : "BLEH-B",
    undoflag : UndoFlags.NO_UNDO,
    flag     : 0,
    inputs   : {}, //tool properties
    outputs  : {}  //tool properties
  }}
  
  modalStart(ctx) {
    if (this.started) {
      console.trace("double call to modalStart()");
      return;
    }
    
    this.overdraw = document.createElement("overdraw-x");
    this.overdraw.start(this.screen);
    
    super.modalStart(ctx);
  }
  
  cancel() {
    return this.finish(true);
  }
  
  finish(canceled=false) {
    if (this.done) {
      return;
    }

    this.done = true;
    this.overdraw.end();

    this.popModal(this.screen);

    if (canceled || !this.sarea) {
      return;
    }

    let sarea = this.sarea, screen = this.screen;
    let t = this.t;

    screen.splitArea(sarea, t, this.horiz);
    screen._internalRegenAll();
  }
  
  on_mousemove(e) {
    let x = e.x, y = e.y;

    let screen = this.screen;

    let sarea = screen.findScreenArea(x, y);
    console.log(sarea, x, y);

    this.overdraw.clear();

    if (sarea !== undefined) {
      //x -= sarea.pos[0];
      //y -= sarea.pos[1];
      x = (x - sarea.pos[0]) / (sarea.size[0]);
      y = (y - sarea.pos[1]) / (sarea.size[1]);

      let dx = 1.0 - Math.abs(x-0.5);
      let dy = 1.0 - Math.abs(y-0.5);

      this.sarea = sarea;
      let horiz = this.horiz = dx < dy;

      if (horiz) {
        this.t = y;
        this.overdraw.line([sarea.pos[0], e.y], [sarea.pos[0]+sarea.size[0], e.y]);
      } else {
        this.t = x;
        this.overdraw.line([e.x, sarea.pos[1]], [e.x, sarea.pos[1]+sarea.size[1]]);
      }
    }
    //console.warn("sarea:", sarea);

    //let sarea = this.
    //console.log(e.x, e.y);
    //this.overdraw.clear();
    //this.overdraw.line([e.x, e.y-200], [e.x, e.y+200], "grey");
  }
  
  on_mousedown(e) {
  }
  
  on_mouseup(e) {
    this.finish();
    
    if (e.button) {
      this.stopPropagation();
      this.preventDefault();
    }
  }
  
  on_keydown(e) {
    console.log("s", e.keyCode);
    
    switch (e.keyCode) {
      case keymap.Escape: //esc
        this.cancel();
        break;
      case keymap.Space: //space
      case keymap.Enter: //return
        this.finish();
        break;
    }
  }
}

//controller.registerTool(SplitTool);


export class AreaDragTool extends ToolBase {
  constructor(screen, sarea, mpos) {
    if (screen === undefined) screen = _appstate.screen; //XXX hackish!
    
    super(screen);
    
    this.cursorbox = undefined;
    this.boxes = [];
    this.boxes.active = undefined;

    this.sarea = sarea;
    this.start_mpos = new Vector2(mpos);
    this.screen = screen;
  }
  
  static tooldef() {return {
    uiname   : "Drag Area",
    toolpath : "screen.area.drag",
    icon     : ui_base.Icons.TRANSLATE,
    description : "move or duplicate area",
    is_modal : true,
    hotkey : undefined,
    undoflag : UndoFlags.NO_UNDO,
    flag     : 0,
    inputs   : {}, //tool properties
    outputs  : {}  //tool properties
  }}
  
  finish() {
    super.finish();

    this.screen.regenBorders();
    this.screen.solveAreaConstraints();
    this.screen.snapScreenVerts();
    this.screen._recalcAABB();

    console.log("tool finish");
  }
  
  getBoxRect(b) {
    let sa = b.sarea;
    let pos, size;
    
    if (b.horiz == -1) {
      //replacement mode
      pos = sa.pos;
      size = sa.size;
    } else if (b.horiz) {
      if (b.side == 'b') {
        pos = [sa.pos[0], sa.pos[1]+sa.size[1]*b.t]
        size = [sa.size[0], sa.size[1]*(1.0-b.t)]
      } else {
        pos = [sa.pos[0], sa.pos[1]];
        size = [sa.size[0], sa.size[1]*b.t]
      }
    } else {
      if (b.side == 'r') {
        pos = [sa.pos[0]+sa.size[0]*b.t, sa.pos[1]]
        size = [sa.size[0]*(1.0-b.t), sa.size[1]]
      } else {
        pos = [sa.pos[0], sa.pos[1]];
        size = [sa.size[0]*b.t, sa.size[1]]
      }
    }
    
    let color = "rgba(100, 100, 100, 0.2)";
    
    let ret = this.overdraw.rect(pos, size, color);
    ret.style["pointer-events"] = "none";
    
    return ret;
  }
  
  doSplit(b) {
    if (this.sarea) {
      return this.doSplitDrop(b);
    }
    
    let src = this.sarea, dst = b.sarea;
    let screen = this.screen;
    
    let t = b.t;
    
    screen.splitArea(dst, t, b.horiz);
    screen._internalRegenAll();
  }
  
  doSplitDrop(b) {
    //first check if there was no change
    if (b.horiz == -1 && b.sarea === this.sarea) {
      return;
    }

    console.log("BBBB", b.horiz, b.sarea===this.sarea, b);
    
    let can_rip = false;
    let sa = this.sarea;
    let screen = this.screen;
    
    //rip conditions
    can_rip = sa.size[0] == screen.size[0] || sa.size[1] == screen.size[1];
    can_rip = can_rip && b.sarea !== sa;
    can_rip = can_rip && (b.horiz == -1 || !screen.areasBorder(sa, b.sarea));
    
    let expand = b.horiz == -1 && b.sarea !== sa && screen.areasBorder(b.sarea, sa);
    
    can_rip = can_rip || expand;
    
    console.log("can_rip:", can_rip, expand);
    
    if (can_rip) {
      screen.removeArea(sa);
      screen.snapScreenVerts();
    }
    
    if (b.horiz == -1) {
      //replacement
      let src = this.sarea, dst = b.sarea;
      
      if (can_rip) {
        let mm;
        
        //handle case of one area "consuming" another
        if (expand) {
          mm = screen.minmaxArea(src);
          screen.minmaxArea(dst, mm);
        }
        
        console.log("replacing. . .", expand);
        screen.replaceArea(dst, src);
        
        if (expand) {
          console.log("\nEXPANDING:", src.size[0], src.size[1]);
          
          src.pos[0] = mm.min[0];
          src.pos[1] = mm.min[1];
          
          src.size[0] = mm.max[0] - mm.min[0];
          src.size[1] = mm.max[1] - mm.min[1];

          src.loadFromPosSize();

          screen._internalRegenAll();
        }
      } else {
        //console.log("copying. . .");
        screen.replaceArea(dst, src.copy());
        screen._internalRegenAll();
      }
    } else {
      let src = this.sarea, dst = b.sarea;
      
      let t = b.t;
      
      let nsa = screen.splitArea(dst, t, b.horiz);
      
      if (can_rip) {
        //console.log("replacing");
        screen.replaceArea(nsa, src);
      } else {
        //console.log("copying");
        screen.replaceArea(nsa, src.copy());
      }

      screen._internalRegenAll();
    }
  }
  
  makeBoxes(sa) {
    let sz = util.isMobile() ? 100 : 40;
    let cx = sa.pos[0] + sa.size[0]*0.5;
    let cy = sa.pos[1] + sa.size[1]*0.5;
    
    let color = this.color = "rgba(200, 200, 200, 0.55)";
    let hcolor = this.hcolor = "rgba(230, 230, 230, 0.75)";
    let idgen = 0;
    let boxes = this.boxes;
    
    let box = (x, y, sz, horiz, t, side) => {
      //console.log(x, y, sz);
      
      let b = this.overdraw.rect([x-sz[0]*0.5, y-sz[1]*0.5], sz, color);
      boxes.push(b);

      b.sarea = sa;
      
      let style = document.createElement("style")
      let cls = `mybox_${idgen++}`;
      
      b.horiz = horiz;
      b.t = t;
      b.side = side;
      b.setAttribute("class", cls);
      b.setAttribute("is_box", true);

      b.addEventListener("mousemove", this.on_mousemove.bind(this));

      let onclick = b.onclick = (e) => {
        let type = e.type.toLowerCase();

        if ((e.type == "mousedown" || e.type == "mouseup") && e.button != 0) {
          return; //another handler will cancel
        }

        console.log("split click");

        if (!this._finished) {
          this.finish();
          this.doSplit(b);
          
          e.preventDefault();
          e.stopPropagation();
        }
      }
      
      b.addEventListener("click", onclick);
      b.addEventListener("mousedown", onclick);
      b.addEventListener("mouseup", onclick);

      b.addEventListener("mouseenter", (e) => {
        console.log("mouse enter box");
        
        if (this.curbox !== undefined) {
          if (this.curbox.rect) {
            this.curbox.rect.remove()
            this.curbox.rect = undefined;
          }
        }
        
        if (b.rect !== undefined) {
          b.rect.remove();
          b.rect = undefined;
        }
        
        b.rect = this.getBoxRect(b);
        this.curbox = b;

        console.log("setting hcolor");
        b.setColor(hcolor);
        //b.style["background-color"] = hcolor;
      })
      
      b.addEventListener("mouseleave", (e) => {
        console.log("mouse leave box");
        
        if (b.rect) {
          b.rect.remove();
          b.rect = undefined;
        }
        
        if (this.curbox === b) {
          this.curbox = undefined;
        }

        b.setColor(color);
        //b.style["background-color"] = color;
      })
      
      style.textContent = `
        .${cls}:hover {
          background-color : orange;
          fill:orange;stroke-width:2
        }
      `
      //console.log(style.textContent);
      b.appendChild(style);
      b.setAttribute("class", cls);

      return b;
    }
    
    let pad = 5;
    
    if (this.sarea) {
      box(cx, cy, [sz, sz], -1, -1, -1);
    }
    
    box(cx-sz*0.75-pad, cy, [sz*0.5, sz], false, 0.5, 'l');
    box(cx-sz*1.2-pad, cy, [sz*0.25, sz], false, 0.3, 'l');
    
    box(cx+sz*0.75+pad, cy, [sz*0.5, sz], false, 0.5, 'r');
    box(cx+sz*1.2+pad, cy, [sz*0.25, sz], false, 0.7, 'r');
    
    box(cx, cy-sz*0.75-pad, [sz, sz*0.5], true, 0.5, 't');
    box(cx, cy-sz*1.2-pad, [sz, sz*0.25], true, 0.3, 't');
    
    box(cx, cy+sz*0.75+pad, [sz, sz*0.5], true, 0.5, 'b');
    box(cx, cy+sz*1.2+pad, [sz, sz*0.25], true, 0.7, 'b');
  }

  getActiveBox(x, y) {
    for (let n of this.boxes) {
      if (n.hasAttribute && n.hasAttribute("is_box")) {
        let rect = n.getClientRects()[0];

        //console.log(rect.x, rect.y);
        if (x >= rect.x && y >= rect.y && x < rect.x + rect.width && y < rect.y + rect.height) {
          //console.log("found rect");
          return n;
        }
      }
    }
  }

  on_drag(e) {
    this.on_mousemove(e);
  }

  on_dragend(e) {
    this.on_mouseup(e);
  }

  on_mousemove(e) {
    let wid = 55;
    let color = "rgb(200, 200, 200, 0.7)";

    //console.trace("mouse move!", e.x, e.y, this.sarea);

    /*
     manually feed events to boxes so as to work right
     with touch events; note that pushModalLight routes
     touch to mouse events (if no touch handlers are present).
     */
    let n = this.getActiveBox(e.x, e.y);

    if (n !== undefined) {
      n.setColor(this.hcolor); //"rgba(250, 250, 250, 0.75)");
    }
    //console.log("mouse move", n);

    if (this.boxes.active !== undefined && this.boxes.active !== n) {
      this.boxes.active.setColor(this.color);
      this.boxes.active.dispatchEvent(new MouseEvent("mouseleave", e));
    }

    if (n !== undefined) {
      n.dispatchEvent(new MouseEvent("mouseenter", e));
    }

    this.boxes.active = n;
    /*
    let rec = (n) => {
      if (n.hasAttribute && n.hasAttribute("is_box")) {
        let rect = n.getClientRects()[0];

        console.log(rect.x, rect.y);
        if (x >= rect.x && x >= rect.y && x < rect.x+rect.width && y < rect.y+rect.height) {
          console.log("found rect");
          n.dispatchEvent("mouseenter", new MouseEvent("mouseenter", e));
        }
      }
      if (n === undefined || n.childNodes === undefined) {
        return;
      }

      for (let n2 of n.childNodes) {
        rec(n2);
      }
      if (n.shadow) {
        for (let n2 of n.shadow.childNodes) {
          rec(n2);
        }
      }
    };

    rec(this.overdraw);
    //*/
    if (this.sarea === undefined) {
      return;
    }
    
    if (this.cursorbox === undefined) {
      wid = 25;
      this.cursorbox = this.overdraw.rect([e.x-wid*0.5, e.y-wid*0.5], [wid, wid], color);
      this.cursorbox.style["pointer-events"] = "none";
    } else {
      this.cursorbox.style["x"] = (e.x-wid*0.5) + "px";
      this.cursorbox.style["y"] = (e.y-wid*0.5) + "px";
    }
  }
  
  on_mouseup(e) {
    console.log("e.button", e.button, e, e.x, e.y, this.getActiveBox(e.x, e.y));

    if (e.button) {
      e.stopPropagation();
      e.preventDefault();
    } else {
      let box = this.getActiveBox(e.x, e.y);

      if (box !== undefined) {
        box.onclick(e);
      }
    }
    
    this.finish();
  }
  
  modalStart(ctx) {
    super.modalStart(ctx);
    
    let screen = this.screen;
    
    this.overdraw.clear();
    
    if (this.sarea) {
      let sa = this.sarea;
      let box = this.overdraw.rect(sa.pos, sa.size, "rgba(100, 100, 100, 0.5)");
      
      box.style["pointer-events"] = "none";
    }
    
    for (let sa of screen.sareas) {
      this.makeBoxes(sa);
    }
  }
}

//controller.registerTool(AreaDragTool);

export class ToolTipViewer extends ToolBase {
  constructor(screen) {
    super(screen);

    this.tooltip = undefined;
    this.element = undefined;
  }

  static tooldef() {return {
    uiname   : "Help Tool",
    toolpath : "screen.help_picker",
    icon     : ui_base.Icons.HELP,
    description : "view tooltips",
    is_modal : true,
    hotkey : undefined,
    undoflag : UndoFlags.NO_UNDO,
    flag     : 0,
    inputs   : {}, //tool properties
    outputs  : {}  //tool properties
  }}

  on_mousemove(e) {
    this.pick(e);
  }

  on_mousedown(e) {
    this.pick(e);
  }

  on_mouseup(e) {
    this.finish();
  }

  finish() {
    super.finish();
  }

  on_keydown(e) {
    switch (e.keyCode) {
      case keymap.Escape:
      case keymap.Enter:
      case Keymap.Space:
        if (this.tooltip) {
          this.tooltip.end();
        }
        this.finish();
        break;
    }
  }
  pick(e) {
    let x = e.x, y = e.y;

    let ele = this.screen.pickElement(x, y);
    console.log(ele ? ele.tagName : ele);

    if (ele !== undefined && ele !== this.element && ele.title) {
      if (this.tooltip) {
        this.tooltip.end();
      }

      this.element = ele;
      let tip = ele.title;

      this.tooltip = ToolTip.show(tip, this.screen, x, y);
    }
    e.preventDefault();
    e.stopPropagation();
  }
}

