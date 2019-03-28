let _FrameManager = undefined;

define([
  "util", "vectormath", "ui_base", "ui", "ScreenArea", "events",
  "FrameManager_ops", "math", "ui_colorpicker", "ui_tabs"
], function(util, vectormath, ui_base, ui, ScreenArea, events,
            FrameManager_ops, math, ui_colorpicker, ui_tabs) {
  'use strict';
  
  let Vector2 = vectormath.Vector2,
      UIBase = ui_base.UIBase;
  
  let exports = _FrameManager = {};
  
  let ScreenVert = exports.ScreenVert = class ScreenVert extends Vector2 {
    constructor(pos, id) {
      super(pos);
      
      this.sareas = [];
      this.borders = [];
      
      this._id = id;
    }
    
    static hash(pos) {
      return pos[0].toFixed(3) + ":" + pos[1].toFixed(3);
    }
    
    valueOf() {
      return ScreenVert.hash(this);
    }
    
    [Symbol.keystr]() {
      return ScreenVert.hash(this);
    }
  }
  
  let ScreenBorder = exports.ScreenBorder = class ScreenBorder extends ui_base.UIBase {
    constructor() {
      super();
      
      this.screen = undefined;
      this.v1 = undefined;
      this.v2 = undefined;
      this._id = undefined;
      
      this.sareas = [];
      
      this._innerstyle = document.createElement("style");
      this._style = undefined;
      
      this.shadow.appendChild(this._innerstyle);
      
      this.inner = document.createElement("div");
      //this.inner.innerText = "sdfsdfsdf";
      this.shadow.appendChild(this.inner);
      
      this.addEventListener("mousedown", (e) => {
        console.log("area resize start!");
        let tool = new FrameManager_ops.AreaResizeTool(this.screen, this, [e.x, e.y]);
        
        tool.start();
        
        e.preventDefault();
        e.stopPropagation();
      });
    }
    
    otherVert(v) {
      if (v === this.v1)
        return this.v2;
      else
        return this.v1;
    }
    
    get horiz() {
      let dx = this.v2[0] - this.v1[0];
      let dy = this.v2[1] - this.v1[1];
      
      return Math.abs(dx) > Math.abs(dy);
    }
        
    setCSS() {
      if (this._style === undefined) {
        this._style = document.createElement("style");
        this.appendChild(this._style);
      }
      
      let wid = 8, iwid = 4;
      
      let v1 = this.v1, v2 = this.v2;
      let vec = new Vector2(v2).sub(v1);

      let x = Math.min(v1[0], v2[0]), y = Math.min(v1[1], v2[1]);
      let w, h;
      let cursor, bstyle, mstyle;
      
      if (Math.abs(vec[0]) < Math.abs(vec[1])) {
        x -= wid/2;
        
        w = wid;
        h = Math.abs(vec[1]);
        
        cursor = 'e-resize';
        
        bstyle = "border-left-style : solid;\n    border-right-style : solid;\n";
        mstyle = "margin-left : 2px;\n    margin-right : 2px;\n    ";
        mstyle += "height : 100%;\n    width:${iwid}px;\n";
      } else {
        y -= wid/2;
        
        w = Math.abs(vec[0]);
        h = wid;
        cursor = 'n-resize';
        bstyle = "border-top-style : solid;\n    border-bottom-style : solid;\n";
        mstyle = "margin-top : 2px;\n    margin-bottom : 2px;\n    ";
        mstyle += "width : 100%;\n    height:${iwid}px;\n";
      }
      
      let innerbuf = `
          .screenborder_inner_${this._id} {
            ${bstyle}
            ${mstyle}
            background-color : rgba(170, 170, 170, 1.0);
            border-color : rgba(220, 220, 220, 1.0);
            border-width : 1px;
            pointer-events : none;
          }`;
      
       let sbuf = `
          .screenborder_${this._id} {
            padding : 0;
            margin : 0;
          }
      `;
      
      if (this.sareas.length >= 2) {
        sbuf += `
          .screenborder_${this._id}:hover {
            cursor : ${cursor};
          }
        `;
      }
      
      this._style.textContent = sbuf;
      this._innerstyle.textContent = innerbuf;
      
      this.setAttribute("class", "screenborder_" + this._id);
      this.inner.setAttribute("class", "screenborder_inner_" + this._id);
      
      this.style["position"] = "absolute";
      this.style["left"] = x + "px";
      this.style["top"] = y + "px";
      this.style["width"] = w + "px";
      this.style["height"] = h + "px";
      this.style["z-index"] = 5;
    }
    
    static hash(v1, v2) {
      return (Math.min(v1._id, v2._id)<<16) + Math.max(v1._id, v2._id);
    }
    
    valueOf() {
      return ScreenBorder.hash(this.v1, this.v2);
    }
    
    [Symbol.keystr] () {
      return ScreenBorder.hash(this.v1, this.v2);
    }
    
    static define() {return {
      tagname : "screenborder-x"
    };}
  }

  ui_base.UIBase.register(ScreenBorder);
  
  let Screen = exports.Screen = class Screen extends ui_base.UIBase {
    constructor() {
      super();
      
      this.size = [0, 0];
      this.idgen = 0;
      this.sareas = [];
      this.sareas.active = undefined;
      this.mpos = [0, 0];
      
      this.screenverts = [];
      this._vertmap = {};
      this._edgemap = {};
      this._idmap = {};
      
      this.shadow.addEventListener("mousemove", (e) => {
        this.mpos[0] = e.x;
        this.mpos[1] = e.y;
      });
      
      this.shadow.addEventListener("touchmove", (e) => {
        this.mpos[0] = e.touches[0].pageX;
        this.mpos[1] = e.touches[0].pageY;
      });
      
    }
    
    load() {
    }
    
    save() {
    }
    
    listen() {
      window.setInterval(() => {
        this.update();
      }, 150);
    }

    static define() {return {
      tagname : "screen-x"
    };}
    
    drawUpdate() {
      if (window.redraw_all !== undefined) {
        window.redraw_all();
      }
    }
    
    update() {
      super.update();
      
      for (let child of this.shadow.childNodes) {
        if (child instanceof UIBase) {
          child.update();
        }
      }
      
      /*
      for (let sarea of this.sareas) {
        sarea.update();
      }//*/
    }
    
    loadFromVerts() {
      for (let sarea of this.sareas) {
        sarea.loadFromVerts();
        sarea.on_resize(sarea.size);
        sarea.setCSS();
      }
      
      this.setCSS();
    }
    
    splitArea(sarea, t=0.5, horiz=true) {
      let w = sarea.size[0], h = sarea.size[1];
      let x =  sarea.pos[0], y = sarea.size[1];
      let s1, s2;
      
      if (!horiz) {
        s1 = sarea;
        s2 = s1.copy();
        
        s1.size[0] *= t;
        s2.size[0] *= (1.0 - t);
        
        s2.pos[0] += w * t;
      } else {
        s1 = sarea;
        s2 = s1.copy();
        
        s1.size[1] *= t;
        s2.size[1] *= (1.0 - t);
        
        s2.pos[1] += h * t;
      }
      
      this.appendChild(s2);
      
      s1.on_resize(s1.size);
      s2.on_resize(s2.size);

      this.regenBorders();
      
      s1.setCSS();
      s2.setCSS();
      
      this.setCSS();
      
      return s2;
    }
    
    setCSS() {
      this.style["width"] = this.size[0] + "px";
      this.style["height"] = this.size[1] + "px";
      
      //call setCSS on borders
      for (let key in this._edgemap) {
        let b = this._edgemap[key];
        
        b.setCSS();
      }
    }
    
    regenBorders() {
      for (let k in this._edgemap) {
        let b = this._edgemap[k];
        
        b.remove();
      }
      
      this._edgemap = {};
      this._vertmap = {};
      this.screenverts.length = 0;
      
      for (let sarea of this.sareas) {
        sarea.makeBorders(this);
      }
      
      for (let key in this._edgemap) {
        let b = this._edgemap[key];
        
        b.setCSS();
      }
    }
    
    snapScreenVerts() {
      let min = [1e17, 1e17], max = [-1e17, -1e17];
      
      this.regenBorders();

      //fit entire screen to, well, the entire screen (size)
      for (let v of this.screenverts) {
        for (let i=0; i<2; i++) {
          min[i] = Math.min(min[i], v[i]);
          max[i] = Math.max(max[i], v[i]);
        }
      }
      
      let vec = new Vector2(max).sub(min);
      let sz = new Vector2(this.size);
      
      sz.div(vec);
      
      for (let v of this.screenverts) {
        v.sub(min).mul(sz);
      }
      
      for (let sarea of this.sareas) {
        sarea.on_resize(sarea.size);
        sarea.loadFromVerts();
      }
      
      this.regenBorders();
      
      for (let sarea of this.sareas) {
        sarea.makeBorders(this);
        sarea.setCSS();
      }
      
      this.setCSS();
    }
    
    on_resize(size) {
      let ratio = [size[0] / this.size[0], size[1] / this.size[1]];
      
      console.log("resize!", ratio);
      
      this.regenBorders();
      
      let min = [1e17, 1e17], max = [-1e17, -1e17];
      
      //fit entire screen to, well, the entire screen (size)
      for (let v of this.screenverts) {
        console.log(v[0], v[1]);
        
        v[0] *= ratio[0];
        v[1] *= ratio[1];
        
        for (let i=0; i<2; i++) {
          min[i] = Math.min(min[i], v[i]);
          max[i] = Math.max(max[i], v[i]);
        }
      }
      
      let vec = new Vector2(max).sub(min);
      let sz = new Vector2(size);
      
      sz.div(vec);
      
      for (let v of this.screenverts) {
        v.sub(min).mul(sz);
      }
      
      for (let sarea of this.sareas) {
        sarea.on_resize([sarea.size[0]*ratio[0], sarea.size[1]*ratio[1]]);
        sarea.loadFromVerts();
      }
      
      this.regenBorders();
      
      for (let sarea of this.sareas) {
        sarea.makeBorders(this);
        sarea.setCSS();
      }
      
      this.size[0] = size[0];
      this.size[1] = size[1];
      this.setCSS();
    }
    
    getScreenVert(pos) {
      let key = ScreenVert.hash(pos);
      
      if (!(key in this._vertmap)) {
        let v = new ScreenVert(pos, this.idgen++);
        
        this._vertmap[key] = v;
        this._idmap[v._id] = v;
        
        this.screenverts.push(v);
      }
      
      return this._vertmap[key];
    }
    
    getScreenBorder(v1, v2) {
      if (!(v1 instanceof ScreenVert)) {
        v1 = this.getScreenVert(v1);
      }
      
      if (!(v2 instanceof ScreenVert)) {
        v2 = this.getScreenVert(v2);
      }
      
      let hash = ScreenBorder.hash(v1, v2);
      
      if (!(hash in this._edgemap)) {
        let sa = this._edgemap[hash] = document.createElement("screenborder-x");
        
        sa.screen = this;
        sa.v1 = v1;
        sa.v2 = v2;
        sa._id = this.idgen++;
        
        v1.borders.push(sa);
        v2.borders.push(sa);
        
        this.appendChild(sa);
        
        sa.setCSS();
        
        this._edgemap[hash] = sa;
        this._idmap[sa._id] = sa;
      }
      
      return this._edgemap[hash];
    }

    minmaxArea(sarea, mm=undefined) {
      if (mm === undefined) {
        mm = new math.MinMax(2);
      }
      
      for (let b of sarea._borders) {
        mm.minmax(b.v1);
        mm.minmax(b.v2);
      }
      
      return mm;
    }
    
    //does sarea1 border sarea2?
    areasBorder(sarea1, sarea2) {
      for (let b of sarea1._borders) {
        for (let sa of b.sareas) {
          if (sa === sarea2)
            return true;
        }
      }
      
      return false;
    }
    
    replaceArea(dst, src) {
      if (dst === src)
        return;
      
      src.pos[0] = dst.pos[0];
      src.pos[1] = dst.pos[1];
      src.size[0] = dst.size[0];
      src.size[1] = dst.size[1];

      if (this.sareas.indexOf(src) < 0) {
        this.appendChild(src);
      }

      //this.sareas.remove(dst);
      //dst.remove();
      
      this.removeArea(dst);
      
      this.regenBorders();
      this.snapScreenVerts();      
      this._updateAll();
    }
    
    //regenerates borders, sets css and calls this.update
    _internalRegenAll() {
      this.regenBorders();
      this._updateAll();
    }
    
    
    _updateAll() {
      for (let sarea of this.sareas) {
        sarea.setCSS();
      }
      this.setCSS();
      this.update();
    }
    
    removeArea(sarea) {
      if (this.sareas.indexOf(sarea) < 0) {
        console.warn(sarea, "<- Warning: tried to remove unknown area");
        return;
      }
      
      this.sareas.remove(sarea);
      sarea.remove();
      
      this.snapScreenVerts();
      this.regenBorders();
      
      this._updateAll();
      this.drawUpdate();
    }
    
    appendChild(child) {
      if (child instanceof ScreenArea.ScreenArea) {
        if (!child._has_evts) {
          child._has_evts = true;
            
          let onfocus = (e) => {
            this.sareas.active = child;
          }
          
          let onblur = (e) => {
            if (this.sareas.active === child) {
              this.sareas.active = undefined;
            }
          }
          
          child.addEventListener("focus", onfocus);
          child.addEventListener("mouseenter", onfocus);
          child.addEventListener("blur", onblur);
          child.addEventListener("mouseleave", onblur);
        }
        
        this.sareas.push(child);
        this.drawUpdate();
      }
      
      return this.shadow.appendChild(child);
      //return super.appendChild(child);
    }
    
    splitTool() {
      console.log("screen split!");
      
      //let tool = new FrameManager_ops.SplitTool(this);
      let tool = new FrameManager_ops.AreaDragTool(this, undefined, this.mpos);
      tool.start();
    }
    
    areaDragTool() {
      if (this.sareas.active === undefined) {
        console.warn("no active screen area");
        return;
      }
      
      console.log("screen area drag!");
      
      let mpos = this.mpos;
      let tool = new FrameManager_ops.AreaDragTool(this, this.sareas.active, mpos);
      
      tool.start();
    }
    
    makeBorders() {
      for (let sarea of this.sareas) {
        sarea.makeBorders(this);
      }
    }
    
    clear() {
      for (let child of list(this.childNodes)) {
        child.remove();
      }
      
      return this;
    }
    
    on_keydown(e) {
      if (this.sareas.active !== undefined) {
        return this.sareas.active.on_keydown(e);
      }
    }
    
    on_keyup(e) {
      if (this.sareas.active !== undefined) {
        return this.sareas.active.on_keyup(e);
      }
    }
    
    on_keypress(e) {
      if (this.sareas.active !== undefined) {
        return this.sareas.active.on_keypress(e);
      }
    }
    
    /*
    _do_mouse_event(e) {
      let type = e.type.toLowerCase();
      
      if (this.sareas.active !== undefined) {
        let x = e.x, y = e.y;
        let ret, sa = this.sareas.active;
        
        e.x -= sa.pos[0];
        e.y -= sa.pos[1];
        
        let key = "on_" + type.toLowerCase();
        
        try {
          ret = sa[key](e);
        } catch (error) {
          util.print_stack(error);
          console.error("Exception raised in Screen._do_mouse_event for a ScreenArea");
          
          ret = undefined;
        }
        
        e.x = x;
        e.y = y;
      }
      
      return e;
    }
    
    on_mousedown(e) {
      super.on_mousedown(e);
      return this._do_mouse_event(e);
    }
    on_mousemove(e) {
      super.on_mousemove(e);
      return this._do_mouse_event(e);
    }
    on_mouseup(e) {
      super.on_mouseup(e);
      return this._do_mouse_event(e);
    }
    on_touchstart(e) {
      super.on_touchstart(e);
      return this._do_mouse_event(e);
    }
    on_touchmove(e) {
      super.on_touchmove(e);
      return this._do_mouse_event(e);
    }
    on_touchcancel(e) {
      super.on_touchcancel(e);
      return this._do_mouse_event(e);
    }
    on_touchend(e) {
      super.on_touchend(e);
      return this._do_mouse_event(e);
    }//*/
    
    draw() {
      for (let sarea of this.sareas) {
        sarea.draw();
      }
    }
  }
  
  Screen.STRUCT = `
  Screen { 
    pos   : vec2;
    size  : vec2;
    areas : array(abstract(ScreenArea));
    idgen : int;
  }
  `;
  
  ui_base.UIBase.register(Screen);
  
  return exports;
});
