let _FrameManager_ops = undefined;

define([
  "util", "vectormath", "ScreenArea", "ui", "ui_base", "events",
  "ScreenOverdraw", "simple_toolsys", "controller", "icon_enum"
], function(util, vectormath, ScreenArea, ui, ui_base, events,
            ScreenOverdraw, simple_toolsys, controller, unused) 
{
  "use strict";
  
  let exports = _FrameManager_ops = {};
  
  let Vector2 = vectormath.Vector2,
      Vector3 = vectormath.Vector3,
      UndoFlags = simple_toolsys.UndoFlags,
      ToolFlags = simple_toolsys.ToolFlags;
  
  let ToolBase = exports.ToolBase = class ToolBase extends simple_toolsys.ToolOp {
    constructor(screen) {
      if (screen === undefined) screen = _appstate.screen; //XXX hackish!
      
      super();
      
      this._finished = false;
      this.screen = screen;
    }
    
    start() {
      _appstate.toolstack.execTool(this);
    }
    
    cancel() {
      this.finish();
    }
    
    finish() {
      this._finished = true;
      this.overdraw.end();
      this.popModal(this.screen);
    }
    
    modalStart(ctx) {
      this.overdraw = document.createElement("overdraw-x");
      this.overdraw.start(this.screen);
      
      super.modalStart(ctx);
    }
    
    on_mousemove(e) {
    }
    
    on_touchend(e) {
      this.on_mouseup();
    }
    
    on_touchmove(e) {
      e.x = e.touches[0].pageX;
      e.y = e.touches[1].pageY;
      
      this.on_mousemove(e);
    }
    
    on_mouseup(e) {
      this.finish();
    }
    
    on_keydown(e) {
      console.log("s", e.keyCode);
      
      switch (e.keyCode) {
        case 27: //esc
          this.cancel();
          break;
        case 32: //space
        case 13: //return
          this.finish();
          break;
      }
    }
  }
  
  let AreaResizeTool = exports.AreaResizeTool = class AreaResizeTool extends ToolBase {
    constructor(screen, border, mpos) {
      if (screen === undefined) screen = _appstate.screen; //XXX hackish!
      
      super(screen);
      
      this.start_mpos = new Vector2(mpos);
      this.border = border;
      this.screen = screen;
    }
    
    static tooldef() {return {
      uiname   : "Resize Area",
      toolpath : "screen.area.resize",
      icon     : Icons.RESIZE,
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
            
            rec(border.otherVert(v));
          }
        }
      }
      
      rec(this.border.v1);
      rec(this.border.v2);
      
      return ret;
    }

    on_mousemove(e) {
      let mpos = new Vector2([e.x, e.y]);
      
      mpos.sub(this.start_mpos);
      
      let axis = this.border.horiz ? 1 : 0;
      
      //console.log(this.border.horiz);
      
      this.overdraw.clear();
      
      let visit = new Set();
      let borders = this.getBorders();
      
      for (let border of borders) {
        this.overdraw.line(border.v1, border.v2, "red");
        
        if (!visit.has(border.v1._id)) {
          border.v1[axis] += mpos[axis];
          visit.add(border.v1._id);
        }
        
        if (!visit.has(border.v2._id)) {
          border.v2[axis] += mpos[axis];
          visit.add(border.v2._id);
        }
      }
      
      this.start_mpos[0] = e.x;
      this.start_mpos[1] = e.y;
      this.screen.loadFromVerts();
    }
  }
  
  controller.registerTool(AreaResizeTool);
  
  let SplitTool = exports.SplitTool = class SplitTool extends ToolBase {
    constructor(screen) {
      if (screen === undefined) screen = _appstate.screen; //XXX hackish!
      
      super(screen);
      
      this.screen = screen;
      this.ctx = screen.ctx;
      this.start = false;
    }
    
    static tooldef() {return {
      uiname   : "Split Area",
      toolpath : "screen.area.split",
      icon     : Icons.SMALL_PLUS,
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
        console.trace("double call to start()");
        return;
      }
      
      this.overdraw = document.createElement("overdraw-x");
      this.overdraw.start(this.screen);
      
      super.modalStart(ctx);
    }
    
    cancel() {
      return this.finish();
    }
    
    finish() {
      this.overdraw.end();
      this.popModal(this.screen);
    }
    
    on_mousemove(e) {
      console.log(e.x, e.y);
      this.overdraw.clear();
      this.overdraw.line([e.x, e.y-200], [e.x, e.y+200], "grey");
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
        case 27: //esc
          this.cancel();
          break;
        case 32: //space
        case 13: //return
          this.finish();
          break;
      }
    }
  }
  
  controller.registerTool(SplitTool);
  
  
  let AreaDragTool = exports.AreaDragTool = class AreaDragTool extends ToolBase {
    constructor(screen, sarea, mpos) {
      if (screen === undefined) screen = _appstate.screen; //XXX hackish!
      
      super(screen);
      
      this.cursorbox = undefined;
      
      this.sarea = sarea;
      this.start_mpos = new Vector2(mpos);
      this.screen = screen;
    }
    
    static tooldef() {return {
      uiname   : "Drag Area",
      toolpath : "screen.area.drag",
      icon     : Icons.TRANSLATE,
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
            console.log("\na:", src.size[0], src.size[1]);
            
            src.pos[0] = mm.min[0];
            src.pos[1] = mm.min[1];
            
            src.size[0] = mm.max[0] - mm.min[0];
            src.size[1] = mm.max[1] - mm.min[1];
            
            console.log("b:", src.size[0], src.size[1], "\n");
            
            screen._internalRegenAll();
          }
        } else {
          console.log("copying. . .");
          screen.replaceArea(dst, src.copy());
        }
      } else {
        let src = this.sarea, dst = b.sarea;
        
        let t = b.t;
        
        let nsa = screen.splitArea(dst, t, b.horiz);
        
        if (can_rip) {
          console.log("replacing");
          screen.replaceArea(nsa, src);
        } else {
          console.log("copying");
          screen.replaceArea(nsa, src.copy());
        }
      }
    }
    
    makeBoxes(sa) {
      let sz = 40;
      let cx = sa.pos[0] + sa.size[0]*0.5;
      let cy = sa.pos[1] + sa.size[1]*0.5;
      
      let color = "rgba(100, 100, 100, 0.3)";
      let hcolor = "rgba(200, 200, 200, 0.55)";
      let idgen = 0;
      
      let box = (x, y, sz, horiz, t, side) => {
        //console.log(x, y, sz);
        
        let b = this.overdraw.rect([x-sz[0]*0.5, y-sz[1]*0.5], sz, color);
        
        b.sarea = sa;
        
        let style = document.createElement("style")
        let cls = `mybox_${idgen++}`;
        
        b.horiz = horiz;
        b.t = t;
        b.side = side;
        b.setAttribute("class", cls);
        
        b.addEventListener("mousemove", this.on_mousemove.bind(this));
        b.addEventListener("touchmove", this.on_mousemove.bind(this));
        
        let onclick = (e) => {
          let type = e.type.toLowerCase();
          
          if ((e.type == "mousedown" || e.type == "mouseup") && e.button != 0) {
            return; //another handler will cancel
          }
          
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
        b.addEventListener("touchfinish", onclick);
        
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
          
          b.style["background-color"] = hcolor;
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
          b.style["background-color"] = color;
        })
        
        style.textContent = `
          .${cls}:hover {
            background-color : orange;
          }
        `
        //console.log(style.textContent);
        b.appendChild(style);
        
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
    
    on_mousemove(e) {
      let wid = 55;
      let color = "rgb(200, 200, 200, 0.7)";
      
      //console.log("mouse move!", e.x, e.y);
      
      if (this.sarea === undefined) {
        return;
      }
      
      if (this.cursorbox === undefined) {
        this.cursorbox = this.overdraw.rect([e.x-wid*0.5, e.y-wid*0.5], [wid, wid], color);
        this.cursorbox.style["pointer-events"] = "none";
      } else {
        this.cursorbox.style["left"] = (e.x-wid*0.5) + "px";
        this.cursorbox.style["top"] = (e.y-wid*0.5) + "px";
      }
    }
    
    on_mouseup(e) {
      if (e.button) {
        this.stopPropagation();
        this.preventDefault();
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
  
  controller.registerTool(AreaDragTool);
  
  return exports;
});

