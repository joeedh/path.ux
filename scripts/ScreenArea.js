let _ScreenArea = undefined;

define([
  "util", "vectormath", "ui_base", "ui"
], function(util, vectormath, ui_base, ui) {
  'use strict';
  
  let Vector2 = vectormath.Vector2;
  
  let exports = _ScreenArea = {};

  let AreaTypes = exports.AreaTypes = {
    TEST_CANVAS_EDITOR : 0
  };
  
  exports.areaclasses = {};
  exports.area_idgen = 0;
  
  let Area = exports.Area = class Area extends ui_base.UIBase {
    constructor() {
      super();
      
      this.areaType = this.constructor.define().areatype;
      
      this.owning_sarea = undefined;
      this._area_id = exports.area_idgen++;
      
      this.pos = undefined; //set by screenarea parent
      this.size = undefined; //set by screenarea parent
    }
    
    saveData() {
      return {
        _area_id : this._area_id,
        areaType : this.areaType
      };
    }
    
    loadData(obj) {
      let id = obj._area_id;
      
      if (id !== undefined && id !== null) {
        this._area_id = id;
      }
    }
    
    draw() {
    }
    
    copy() {
      throw new Error("implement me! Area.copy()");
    }
    
    on_resize(size) {
  
    }

    on_area_active() {
    }
    
    on_area_inactive() {
    }
    
    push_ctx_active() {
    }
    
    pop_ctx_active() {
    }
    
    static register(cls) {
      let def = cls.define();
      
      if (!def.areaname) {
        throw new Error("Missing areaname key in define()");
      }
      
      if (def.areatype === undefined) {
        throw new Error("Missing areatype (an integer) in define()");
      }
      
      exports.areaclasses[def.areaname] = cls;
      
      ui_base.UIBase.register(cls);
    }
    
    static define() {return {
      tagname  : "areadata-x",
      areaname : undefined,
      uiname   : undefined,
      areatype : undefined
    };}
  }
  
  Area.STRUCT = `
  Area { 
    pos  : vec2;
    size : vec2;
    type : string;
    saved_uidata : string;
  }
  `
  ui_base.UIBase.register(Area);
  
  exports.sarea_idgen = 0;
  
  let ScreenArea = exports.ScreenArea = class ScreenArea extends ui_base.UIBase {
    constructor() {
      super();
      
      this._borders = [];
      
      this._sarea_id = exports.sarea_idgen++;
      
      this.pos = new Vector2();
      this.size = new Vector2();
      
      this.area = undefined;
      this.editors = [];
      this.editormap = {};
      this.type = "";
    }
    
    /*
    saveData() {
      return {
        _sarea_id : this._sarea_id,
        pos       : this.pos,
        size      : this.size,
        areatype  : this.area.areaType
      };
    }
    loadData(obj) {
      super.loadData(obj);

      let id = obj._sarea_id;
      
      let type = obj.areatype;
      
      if (id !== undefined && id !== null) {
        this._sarea_id = id;
      }
      
      for (let area of this.editors) {
        if (area.areaType == type) {
          console.log("             found saved area type");
          
          this.switch_editor(area.constructor);
        }
      }
      
      this.pos.load(obj.pos);
      this.size.load(obj.size);
    }//*/
    
    draw() {
      this.area.draw();
    }
    
    getScreen() {
      let p = this.parentNode;
      
      while (p && p.tagName.toLowerCase() !== "screen-x") {
        p = this.parentNode;
      }
      
      return p;
    }
    
    copy() {
      let ret = document.createElement("screenarea-x");
      
      ret.ctx = this.ctx;
      
      ret.pos[0] = this.pos[0];
      ret.pos[1] = this.pos[1];
      
      ret.size[0] = this.size[0];
      ret.size[1] = this.size[1];
      
      ret.type = this.type;
      
      for (let area of this.editors) {
        let cpy = area.copy();
        
        cpy.ctx = this.ctx;
        ret.editors.push(cpy);

        if (area === this.area) {
          ret.area = cpy;
        }
      }
      
      console.log("RET.AREA", this.area, ret.area);
      
      if (ret.area !== undefined, this.area) {
        ret.shadow.appendChild(ret.area);
        
        ret.area.push_ctx_active();
        ret.area.owning_sarea = ret;
        ret.area.on_area_active();
        ret.area.pop_ctx_active();
      }
      
      return ret;
    }
    
    loadFromVerts() {
      let bs = this._borders;
      let min = [1e17, 1e17], max = [-1e17, -1e17];
      
      for (let b of bs) {
        for (let i=0; i<2; i++) {
          min[i] = Math.min(min[i], b.v1[i]);
          min[i] = Math.min(min[i], b.v2[i]);
          
          max[i] = Math.max(max[i], b.v1[i]);
          max[i] = Math.max(max[i], b.v2[i]);
        }
      }
      
      this.pos[0] = min[0];
      this.pos[1] = min[1];
      
      this.size[0] = max[0] - min[0];
      this.size[1] = max[1] - min[1];
      
      this.setCSS();
    }
    
    on_resize(size) {
      super.on_resize(this);
      
      if (this.area !== undefined) {
        this.area.on_resize(size);
      }      
    }
    
    makeBorders(screen) {
      this._borders.length = 0;
      
      let p = this.pos, s = this.size;
      
      let vs = [
        new Vector2([p[0], p[1]]),
        new Vector2([p[0], p[1] + s[1]]),
        new Vector2([p[0] + s[0], p[1] + s[1]]),
        new Vector2([p[0] + s[0], p[1]]),
      ]
      
      for (let i=0; i<vs.length; i++) {
        vs[i] = screen.getScreenVert(vs[i]);
        vs[i].sareas.push(this);
      }
      
      for (let i=0; i<vs.length; i++) {
        let v1 = vs[i], v2 = vs[(i + 1) % vs.length];
        let b = screen.getScreenBorder(v1, v2);
        
        b.sareas.push(this);
        
        this._borders.push(b);
      }
      
      return this;
    }
    
    setCSS() {
      this.style["position"] = "absolute";
      
      this.style["left"] = this.pos[0] + "px";
      this.style["top"] = this.pos[1] + "px";
      
      this.style["width"] = this.size[0] + "px";
      this.style["height"] = this.size[1] + "px";
        
      /*
      if (this.area) {
        let area = this.area;
        area.style["position"] = "absolute";
        
        area.style["width"] = this.size[0] + "px";
        area.style["height"] = this.size[1] + "px";
      }
      //*/
    }
    
    appendChild(child) {
      if (child instanceof Area) {
        child.pos = this.pos;
        child.size = this.size;
        
        if (this.editors.indexOf(child) < 0) {
          this.editors.push(child);
        }
        
        child.owning_sarea = undefined;
      }
      
      super.appendChild(child);
    }
    
    switch_editor(cls) {
      let def = cls.define();
      let name = def.areaname;
      
      //exports.areaclasses[name]
      if (!(name in this.editormap)) {
        this.editormap[name] = document.createElement(def.tagname);
        this.editors.push(this.editormap[name]);
      }
      
      if (this.area !== undefined) {
        //break direct pos/size references for old active area
        this.area.pos = new Vector2(this.area.pos);
        this.area.size = new Vector2(this.area.size);
        
        this.area.owning_sarea = undefined;
        this.area.push_ctx_active();
        this.area.on_area_inactive();
        this.area.pop_ctx_active();
        
        this.area.remove();
      }
      
      this.area = this.editormap[name];
      
      //propegate new size
      this.area.on_resize(this.size);
      
      //. . .and set references to pos/size
      this.area.pos = this.pos;
      this.area.size = this.size;
      
      this.shadow.appendChild(this.area);
      this.area.style["width"] = "100%";
      this.area.style["height"] = "100%";
      
      this.area.push_ctx_active();
      this.area.on_area_active();
      this.area.owning_sarea = this;
      this.area.pop_ctx_active();
    }
    
    update() {
      super.update();
      
      if (this.area) {
        this.area.update();
      }
    }
    
    static define() {return {
      tagname : "screenarea-x"
    };}
  }
  
  ScreenArea.STRUCT = `
  ScreenArea { 
    pos     : vec2;
    size    : vec2;
    type    : string;
    editors : iter(k, abstract(Area)) | obj.editors[k];
    area    : string | obj.area.constructor.name;
  `;
  ui_base.UIBase.register(ScreenArea);
  
  return exports;
});
