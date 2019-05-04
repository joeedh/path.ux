let _ScreenArea = undefined;

define([
  "util", "vectormath", "ui_base", "ui", "ui_noteframe"
], function(util, vectormath, ui_base, ui, ui_noteframe) {
  'use strict';
  
  let Vector2 = vectormath.Vector2;
  
  let exports = _ScreenArea = {};

  exports.getAreaIntName = function(name) {
    let hash = 0;
    
    for (let i=0; i<name.length; i++) {
      let c = name.charCodeAt(i);
      
      if (i % 2 == 0) {
        hash += c<<8;
        hash *= 13;
        hash = hash & ((1<<15)-1);
      } else {
        hash += c;
      }
    }
    
    return hash;
  }
  window.getAreaIntName = exports.getAreaIntName;
  
  let AreaTypes = exports.AreaTypes = {
    TEST_CANVAS_EDITOR : 0
  };
  
  exports.areaclasses = {};
  exports.area_idgen = 0;
  
  let Area = exports.Area = class Area extends ui_base.UIBase {
    constructor() {
      super();
      
      this.inactive = true;
      
      this.owning_sarea = undefined;
      this._area_id = exports.area_idgen++;
      
      this.pos = undefined; //set by screenarea parent
      this.size = undefined; //set by screenarea parent
    }
    
    buildDataPath() {
      let p = this;
      
      let sarea = this.owning_sarea;
      
      if (sarea === undefined || sarea.screen === undefined) {
        console.warn("Area.buildDataPath(): Failed to build data path");
        return "";
      }
      
      let screen = sarea.screen;
      
      let idx1 = screen.sareas.indexOf(sarea);
      let idx2 = sarea.editors.indexOf(this);
      
      if (idx1 < 0 || idx2 < 0) {
        throw new Error("malformed area data");
      }
      
      let ret = `screen.sareas[${idx1}].editors[${idx2}]`;
      return ret;
    }
    
    saveData() {
      return {
        _area_id : this._area_id,
        areaName : this.areaName
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
      
      exports.areaclasses[def.areaname] = cls;
      
      ui_base.UIBase.register(cls);
    }
    
    getScreen() {
      //XXX
      return _appstate.screen;
    }
    
    toJSON() {
      return Object.assign(super.toJSON(), {
        areaname : this.constructor.define().areaname,
        _area_id : this._area_id
      });
    }
    
    loadJSON(obj) {
      super.loadJSON(obj);
      this._area_id = obj._area_id;
      
      return this;
    }
    
    makeHeader(container) {
      let areas = {};
      let i = 0;
      
      for (let k in exports.areaclasses) {
        let cls = exports.areaclasses[k];
        let uiname = cls.define().uiname;
        
        if (uiname === undefined) {
          uiname = k.replace("_", " ").toLowerCase();
        }
        
        areas[uiname] = k;
      }
      
      let row = container.row();
      row.background = ui_base.getDefault("AreaHeaderBG");
      row.style["width"] = "100%";
      
      let mdown = false;
      let mpos = new Vector2();
      
      let mpre = (e) => {
        let node = this.getScreen().pickElement(e.pageX, e.pageY);
       // console.log(node.tagName, node === row)
        
        if (node !== row) {
          return false;
        }
        
        return true;
      }
      
      row.addEventListener("mouseout", (e) => {
        console.log("mouse leave");
        mdown = false;
      });
      row.addEventListener("mouseleave", (e) => {
        console.log("mouse out");
        mdown = false;
      });
      
      row.addEventListener("mousedown", (e) => {
        if (!mpre(e)) return;
        
        mpos[0] = e.pageX;
        mpos[1] = e.pageY;
        mdown = true;
      }, false);
      
      row.addEventListener("mousemove", (e) => {
        if (!mdown || !mpre(e)) return;
        
        //console.log(mdown);
        let dx = e.pageX - mpos[0];
        let dy = e.pageY - mpos[1];
        
        let dis = dx*dx + dy*dy;
        let limit = 7;
        
        if (dis > limit*limit) {
          let sarea = this.owning_sarea;
          if (sarea === undefined) {
            console.warn("Error: missing sarea ref");
            return;
          }
          
          let screen = sarea.screen;
          if (screen === undefined) {
            console.log("Error: missing screen ref");
            return;
          }
          
          mdown = false;
          console.log("area drag tool!");
          screen.areaDragTool(this.owning_sarea);
        }
      }, false);

      row.addEventListener("mouseup", (e) => {
        if (!mpre(e)) return;
        
        mdown = false;
      }, false);

      row.addEventListener("touchstart", (e) => {
        if (!mpre(e)) return;
        
        if (e.touches.length == 0)
          return;
        
        mpos[0] = e.pageX;
        mpos[1] = e.pageY;
        mdown = true;
      }, false);
      
      row.addEventListener("touchmove", (e) => {
        let node = this.getScreen().pickElement(e.pageX, e.pageY);
        if (node !== row) {
          return;
        }
      }, false);

      function touchend(e) {
        let node = this.getScreen().pickElement(e.pageX, e.pageY);
        if (node !== row) {
          return;
        }
        if (e.touches.length == 0)
          return;
        
        mdown = false;
      }
      
      row.addEventListener("touchcancel", (e) => {
        touchend(e);        
      }, false);
      row.addEventListener("touchend", (e) => {
        touchend(e);        
      }, false);

      row.listenum(undefined, this.constructor.define().uiname, areas, undefined, (id) => {
        let cls = exports.areaclasses[id];
        this.owning_sarea.switch_editor(cls);
      });
      
      row.button("------", () => {
        _appstate.screen.splitTool();
      }).dom.style["width"] = "50px";
      
      row.button("*", () => {
        _appstate.screen.areaDragTool();
      }).dom.style["width"] = "50px";
      
      
      //ui_noteframe
      let notef = document.createElement("noteframe-x");
      notef.ctx = this.ctx;
      row._add(notef);
    }
    
    setCSS() {
      this.style["overflow"] = "hidden";
      
      if (this.size !== undefined) {
        this.style["position"] = "absolute";
        //this.style["left"] = this.pos[0] + "px";
        //this.style["top"] = this.pos[1] + "px";
        this.style["width"] = this.size[0] + "px";
        this.style["height"] = this.size[1] + "px";
      }
    }
    
    update() {
      super.update();
      
      this._forEachChildren((n) => {
        n.update();
      });
    }
    
    static define() {return {
      tagname  : "areadata-x",
      areaname : undefined, //api name for area type
      uiname   : undefined
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
    
    toJSON() {
      let ret = {
        editors : this.editors,
        _sarea_id : this._sarea_id,
        area : this.area.constructor.define().areaname,
        type : this.type,
        pos : this.pos,
        size : this.size
      };
      
      return Object.assign(super.toJSON(), ret);
    }
    
    loadJSON(obj) {
      super.loadJSON(obj);
      
      this.pos.load(obj.pos);
      this.size.load(obj.size);
      
      for (let editor of obj.editors) {
        let areaname = editor.areaname;
        
        //console.log(editor);
        
        let tagname = exports.areaclasses[areaname].define().tagname;
        let area = document.createElement(tagname);
        
        area.owning_sarea = this;
        this.editormap[areaname] = area;
        this.editors.push(this.editormap[areaname]);

        area.pos = new Vector2(obj.pos);
        area.size = new Vector2(obj.size);
        area.ctx = this.ctx;
        
        area.inactive = true;
        area.loadJSON(editor);
        area.owning_sarea = undefined;
        
        if (areaname === obj.area) {
          this.area = area;
        }
      }
      
      if (this.area !== undefined) {
        this.area.ctx = this.ctx;
        this.area.style["width"] = "100%";
        this.area.style["height"] = "100%";
        this.area.owning_sarea = this;
        
        this.area.pos = this.pos;
        this.area.size = this.size;
        
        this.area.inactive = false;
        this.shadow.appendChild(this.area);
        this.area.on_area_active();
        this.area.onadd();
      }
      
      this.setCSS();
    }
    
    _ondestroy() {
      super._ondestroy();
      
      for (let editor of this.editors) {
        if (editor === this.area) continue;
        
        editor._ondestroy();
      }
    }
    
    getScreen() {
      let p = this.parentNode;
      
      while (p && p.tagName.toLowerCase() !== "screen-x") {
        p = this.parentNode;
      }
      
      return p;
    }
    
    copy(screen) {
      let ret = document.createElement("screenarea-x");
      
      ret.screen = this.screen;
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
      
      if (ret.area !== undefined) {
        ret.area.ctx = this.ctx;
        ret.area.pos = ret.pos;
        ret.area.size = ret.size;
        ret.area.owning_sarea = ret;
        
        ret.shadow.appendChild(ret.area);
        //ret.area.onadd();
        
        ret.ctx = this.ctx;
        ret.area.ctx = this.ctx;
        
        ret.area.push_ctx_active();
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
        
        if (vs[i].sareas.indexOf(this) < 0) {
          vs[i].sareas.push(this);
        }
      }
      
      for (let i=0; i<vs.length; i++) {
        let v1 = vs[i], v2 = vs[(i + 1) % vs.length];
        let b = screen.getScreenBorder(v1, v2);
        
        if (b.sareas.indexOf(this) < 0) {
          b.sareas.push(this);
        }
        
        this._borders.push(b);
      }
      
      return this;
    }
    
    setCSS() {
      this.style["position"] = "absolute";
      this.style["overflow"] = "hidden";
      
      this.style["left"] = this.pos[0] + "px";
      this.style["top"] = this.pos[1] + "px";
      
      this.style["width"] = this.size[0] + "px";
      this.style["height"] = this.size[1] + "px";
      
      
      if (this.area !== undefined) {
        this.area.setCSS();
        //this.style["overflow"] = this.area.style["overflow"];
        
        //this.area.style["width"] = this.size[0] + "px";
        //this.area.style["height"] = this.size[1] + "px";
      }
        
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
        child.ctx = this.ctx;
        child.pos = this.pos;
        child.size = this.size;
        
        if (this.editors.indexOf(child) < 0) {
          this.editors.push(child);
        }
        
        child.owning_sarea = undefined;
      }
      
      super.appendChild(child);
      
      if (child instanceof ui_base.UIBase) {
        child.onadd();
      }
    }
    
    switch_editor(cls) {
      let def = cls.define();
      let name = def.areaname;
      
      //exports.areaclasses[name]
      if (!(name in this.editormap)) {
        this.editormap[name] = document.createElement(def.tagname);
        this.editormap[name].ctx = this.ctx;
        this.editormap[name].owning_sarea = this;
        this.editormap[name].inactive = false;
        
        this.editors.push(this.editormap[name]);
      }
      
      //var finish = () => {
        if (this.area !== undefined) {
          //break direct pos/size references for old active area
          this.area.pos = new Vector2(this.area.pos);
          this.area.size = new Vector2(this.area.size);
          
          this.area.owning_sarea = undefined;
          this.area.inactive = true;
          this.area.push_ctx_active();
          this.area.on_area_inactive();
          this.area.pop_ctx_active();
          
          this.area.remove();
        }
        
        this.area = this.editormap[name];
        
        this.area.inactive = false;
        
        //. . .and set references to pos/size
        this.area.pos = this.pos;
        this.area.size = this.size;
        this.area.owning_sarea = this;
        
        this.shadow.appendChild(this.area);
        
        //propegate new size
        this.area.on_resize(this.size);

        this.area.style["width"] = "100%";
        this.area.style["height"] = "100%";
        
        this.area.push_ctx_active();
        this.area.on_area_active();
        this.area.pop_ctx_active();
      //}
    }
    
    update() {
      super.update();
      
      this._forEachChildren((n) => {
        n.update();
      });
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
