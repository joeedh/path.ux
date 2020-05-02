let _ScreenArea = undefined;

import * as util from './util.js';
import * as vectormath from './vectormath.js';
import * as ui_base from './ui_base.js';
import * as ui from './ui.js';
import * as ui_noteframe from './ui_noteframe.js';
//import * as nstructjs from './struct.js';
import {haveModal} from './simple_events.js';

import './struct.js';

let UIBase = ui_base.UIBase;
let Vector2 = vectormath.Vector2;
let Screen = undefined;

export function setScreenClass(cls) {
  Screen = cls;
}

export function getAreaIntName(name) {
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
//XXX get rid of me
window.getAreaIntName = getAreaIntName;

//XXX get rid of me
export var AreaTypes = {
  TEST_CANVAS_EDITOR : 0
};

export function setAreaTypes(def) {
  for (let k in AreaTypes) {
    delete AreaTypes[k];
  }
  
  for (let k in def) {
    AreaTypes[k] = def[k];
  }
}

export let areaclasses = {};
class AreaWrangler {
  constructor() {
    this.stacks = {};
    this.lasts = {};
    this.lastArea = undefined;
    this.stack = [];
    this.idgen = 0;
  }

  push(type, area) {
    this.lasts[type.name] = area;
    this.lastArea = area;

    if (!(type.name in this.stacks)) {
      this.stacks[type.name] = [];
    }

    this.stacks[type.name].push(area);
    this.stack.push(area);
  }

  pop(type, area) {
    if (!(type.name in this.stacks)) {
      throw new Error("pop_ctx_area called in error");
    }

    this.stacks[type.name].pop();
    this.stack.pop();
  }

  getLastArea(type) {
    if (type === undefined) {
      if (this.stack.length > 0) {
        return this.stack[this.stack.length-1];
      } else {
        return this.lastArea;
      }
    } else {
      if (type.name in this.stacks) {
        let stack = this.stacks[type.name];

        if (stack.length > 0) {
          return stack[stack.length-1];
        }
      }

      return this.lasts[type.name];
    }
  }
}

let contextWrangler = new AreaWrangler();

export const BorderMask = {
  LEFT    : 1,
  BOTTOM  : 2,
  RIGHT   : 4,
  TOP     : 8,
  ALL     : 1|2|4|8
};

export const BorderSides = {
  LEFT   : 0,
  BOTTOM : 1,
  RIGHT  : 2,
  TOP    : 3
};

/**
 * Base class for all editors
 **/
export class Area extends ui_base.UIBase {
  constructor() {
    super();

    /**
     * -----b4----
     *
     * b1       b3
     *
     * -----b2----
     *
     * */
    //set bits in mask to keep
    //borders from moving
    this.borderLock = 0;
    this.inactive = true;
    
    this.owning_sarea = undefined;
    this._area_id = contextWrangler.idgen++;
    
    this.pos = undefined; //set by screenarea parent
    this.size = undefined; //set by screenarea parent

    let appendChild = this.shadow.appendChild;
    this.shadow.appendChild = (child) => {
      appendChild.call(this.shadow, child);
      if (child instanceof UIBase) {
        child.parentWidget = this;
      }
    }

    let prepend = this.shadow.prepend;
    this.shadow.prepend = (child) => {
      prepend.call(this.shadow, child);

      if (child instanceof UIBase) {
        child.parentWidget = this;
      }
    }
  }

  init() {
    super.init();

    this.noMarginsOrPadding();
  }

  /**
   * Return a list of keymaps used by this editor
   * @returns {Array<KeyMap>}
   */
  getKeyMaps() {
    return this.keymap !== undefined ? [this.keymap] : [];
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
    console.warn("You might want to implement this, Area.prototype.copy based method called");
    let ret = document.createElement(this.constructor.define().tagname);
    return ret;
  }
  
  on_resize(size, oldsize) {
    super.on_resize(size, oldsize);
  }

  on_area_focus() {

  }

  on_area_blur() {

  }

  /** called when editors are swapped with another editor type*/
  on_area_active() {
  }

  /** called when editors are swapped with another editor type*/
  on_area_inactive() {
  }

  /**
   * Get active area as defined by push_ctx_active and pop_ctx_active.
   *
   * Type should be an Area subclass, if undefined the last accessed area
   * will be returned.
   * */
  static getActiveArea(type) {
    return contextWrangler.getLastArea(type);
  }

  /*
  * This is needed so UI controls can know what their parent area is.
  * For example, a slider with data path "view2d.zoomfac" needs to know where
  * to find view2d.
  *
  * Typically this works by adding a field to a ContextOverlay:
  *
  * class ContextOverlay {
  *   get view3d() {
  *     return Area.getActiveArea(View3D);
  *   }
  * }
  *
  * Make sure to wrap event callbacks in push_ctx_active and pop_ctx_active.
  * */
  push_ctx_active() {
    contextWrangler.push(this.constructor, this);
  }

  /**
   * see push_ctx_active
   * */
  pop_ctx_active() {
    contextWrangler.pop(this.constructor, this);
  }
  
  static register(cls) {
    let def = cls.define();
    
    if (!def.areaname) {
      throw new Error("Missing areaname key in define()");
    }
    
    areaclasses[def.areaname] = cls;
    
    ui_base.UIBase.register(cls);
  }
  
  getScreen() {
    //XXX
    //return _appstate.screen;
    throw new Error("replace me in Area.prototype");
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

  getBarHeight() {
    return this.header.getClientRects()[0].height;
  }

  makeAreaSwitcher(container) {
    let areas = {};
    let icons = {};
    let i = 0;

    for (let k in areaclasses) {
      let cls = areaclasses[k];
      let def = cls.define();

      if (def.hidden)
        continue;

      let uiname = def.uiname;

      if (uiname === undefined) {
        uiname = k.replace("_", " ").toLowerCase();
        uiname = uiname[0].toUpperCase() + uiname.slice(1, uiname.length);
      }

      areas[uiname] = k;
      icons[uiname] = def.icon !== undefined ? def.icon : -1;
    }


    return container.listenum(undefined, this.constructor.define().uiname, areas, undefined, (id) => {
      let cls = areaclasses[id];
      this.owning_sarea.switch_editor(cls);
    }, icons);

    //return areas;
  }

  makeHeader(container, add_note_area=true) {
    let row = this.header = container.row();

    row.remove();
    container._prepend(row);

    row.background = this.getDefault("AreaHeaderBG");

    let rh = ~~(16*this.getDPI());

    //container.setSize(undefined, rh);
    //row.setSize(undefined, rh);
    //row.setSize(undefined, rh);

    container.noMarginsOrPadding();
    row.noMarginsOrPadding();

    row.style["width"] = "100%";
    row.style["margin"] = "0px";
    row.style["padding"] = "0px";

    let mdown = false;
    let mpos = new Vector2();
    
    let mpre = (e, pageX, pageY) => {
      pageX = pageX === undefined ? e.pageX : pageX;
      pageY = pageY === undefined ? e.pageY : pageY;

      let node = this.getScreen().pickElement(pageX, pageY);
     // console.log(node.tagName, node === row)
      
      if (node !== row) {
        return false;
      }
      
      return true;
    }
    
    row.addEventListener("mouseout", (e) => {
      //console.log("mouse leave");
      mdown = false;
    });
    row.addEventListener("mouseleave", (e) => {
      //console.log("mouse out");
      mdown = false;
    });
    
    row.addEventListener("mousedown", (e) => {
      if (!mpre(e)) return;
      
      mpos[0] = e.pageX;
      mpos[1] = e.pageY;
      mdown = true;
    }, false);

    let do_mousemove = (e, pageX, pageY) => {
      if (!mdown || !mpre(e, pageX, pageY)) return;

      //console.log(mdown);
      let dx = pageX - mpos[0];
      let dy = pageY - mpos[1];

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
    };

    row.setAttribute("draggable", true);
    row.draggable = true;

    row.addEventListener("dragstart", (e) => {
      console.log("drag start!", e);
      e.dataTransfer.setData("text/json", "SplitAreaDrag");

      let canvas = document.createElement("canvas");
      let g = canvas.g;

      canvas.width = 32;
      canvas.height = 32;

      e.dataTransfer.setDragImage(canvas, 0, 0);

      mdown = false;
      console.log("area drag tool!");
      this.getScreen().areaDragTool(this.owning_sarea);
    });

    row.addEventListener("drag", (e) => {
      console.log("drag!", e);
    });

    //*
    row.addEventListener("mousemove", (e) => {
      return do_mousemove(e, e.pageX, e.pageY);
    }, false);
      //*/
    row.addEventListener("mouseup", (e) => {
      if (!mpre(e)) return;

      mdown = false;
    }, false);

    row.addEventListener("touchstart", (e) => {
      console.log("touchstart", e);

      if (!mpre(e, e.touches[0].pageX, e.touches[0].pageY)) return;
      
      if (e.touches.length == 0)
        return;
      
      mpos[0] = e.touches[0].pageX;
      mpos[1] = e.touches[0].pageY;
      mdown = true;
    }, false);
    
    row.addEventListener("touchmove", (e) => {
      return do_mousemove(e, e.touches[0].pageX, e.touches[0].pageY);
    }, false);

    let touchend = (e) => {
      let node = this.getScreen().pickElement(e.pageX, e.pageY);
      if (node !== row) {
        return;
      }
      if (e.touches.length == 0)
        return;
      
      mdown = false;
    };
    
    row.addEventListener("touchcancel", (e) => {
      touchend(e);        
    }, false);
    row.addEventListener("touchend", (e) => {
      touchend(e);        
    }, false);

    this.switcher = this.makeAreaSwitcher(row);

    if (add_note_area) {
      let notef = document.createElement("noteframe-x");
      notef.ctx = this.ctx;
      row._add(notef);
    }

    this.header = row;
    
    return row;
  }
  
  setCSS() {
    this.style["overflow"] = "hidden";
    
    if (this.size !== undefined) {
      this.style["position"] = "absolute";
      //this.style["left"] = this.pos[0] + "px";
      //this.style["top"] = this.pos[1] + "px";
      this.style["width"] = ~~this.size[0] + "px";
      this.style["height"] = ~~this.size[1] + "px";
    }
  }
  
  update() {
    //don't update non-active editors
    if (this.owning_sarea === undefined || this !== this.owning_sarea.area) {
      return;
    }

    super.update();
    
    //see FrameManager.js, we use a single update
    //function for everything now
    //this._forEachChildWidget((n) => {
    //  n.update();
    //});
  }
  
  static define() {return {
    tagname  : undefined, // e.g. "areadata-x",
    areaname : undefined, //api name for area type
    uiname   : undefined,
    icon : undefined //icon representing area in MakeHeader's area switching menu. Integer.
  };}
  
  //subclassing loadSTRUCTs should either call this, or invoke super.loadSTRUCT()
  afterSTRUCT() {
    this.doOnce(() => {
      try {
        console.log("load ui data");
        ui_base.loadUIData(this, this.saved_uidata);
        this.saved_uidata = undefined;
      } catch (error) {
        console.log("failed to load ui data");
        util.print_stack(error);
      }
    });
  }

  static newSTRUCT(reader) {
    return document.createElement(this.define().tagname);
  }

  loadSTRUCT(reader) {
    reader(this);
  }
  
  _getSavedUIData() {
    return ui_base.saveUIData(this, "area");
  }
}

Area.STRUCT = `
pathux.Area { 
  saved_uidata : string | obj._getSavedUIData();
}
`

nstructjs.manager.add_class(Area);  
//ui_base.UIBase.register(Area);

export class ScreenArea extends ui_base.UIBase {
  constructor() {
    super();
    
    this._borders = [];
    
    this._sarea_id = contextWrangler.idgen++;
    
    this.pos = new Vector2();
    this.size = new Vector2();

    this.floating = false;

    this.area = undefined;
    this.editors = [];
    this.editormap = {};

    this.addEventListener("mouseover", (e) => {
      if (haveModal()) {
        return;
      }

      //console.log("screen area mouseover");
      let screen = this.getScreen();
      if (screen.sareas.active !== this && screen.sareas.active) {
        screen.sareas.active.area.on_area_blur();
      }

      if (screen.sareas.active !== this) {
        this.area.on_area_focus();
      }

      screen.sareas.active = this;
    });

    //this.addEventListener("mouseleave", (e) => {
      //console.log("screen area mouseleave");
    //});
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

  get borderLock() {
    return this.area !== undefined ? this.area.borderLock : 0;
  }

  _side(border) {
    return this._borders.indexOf(border);
  }

  init() {
    super.init();

    this.noMarginsOrPadding();
  }

  draw() {
    this.area.draw();
  }
  
  toJSON() {
    let ret = {
      editors : this.editors,
      _sarea_id : this._sarea_id,
      area : this.area.constructor.define().areaname,
      pos : this.pos,
      size : this.size
    };
    
    return Object.assign(super.toJSON(), ret);
  }

  on_keydown(e) {
    if (this.area.on_keydown) {
      this.area.push_ctx_active();
      this.area.on_keydown(e);
      this.area.pop_ctx_active();
    }
  }

  loadJSON(obj) {
    if (obj === undefined) {
      console.warn("undefined in loadJSON");
      return;
    }

    super.loadJSON(obj);
    
    this.pos.load(obj.pos);
    this.size.load(obj.size);
    
    for (let editor of obj.editors) {
      let areaname = editor.areaname;
      
      //console.log(editor);
      
      let tagname = areaclasses[areaname].define().tagname;
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
    if (this.screen !== undefined) {
      return this.screen;
    }

    //try to walk up graph, if possible
    let p = this.parentNode;
    let _i = 0;

    while (p && !(p instanceof Screen) && p !== p.parentNode) {
      p = this.parentNode;

      if (_i++ > 1000) {
        console.warn("infinite loop detected in ScreenArea.prototype.getScreen()");
        return undefined;
      }
    }
    
    return p instanceof Screen ? p : undefined;
  }
  
  copy(screen) {
    let ret = document.createElement("screenarea-x");
    
    ret.screen = screen;
    ret.ctx = this.ctx;
    
    ret.pos[0] = this.pos[0];
    ret.pos[1] = this.pos[1];
    
    ret.size[0] = this.size[0];
    ret.size[1] = this.size[1];
    
    for (let area of this.editors) {
      let cpy = area.copy();
      
      cpy.ctx = this.ctx;
      ret.editors.push(cpy);

      if (area === this.area) {
        ret.area = cpy;
      }
    }
    
    //console.trace("RET.AREA", this.area, ret.area);

    ret.ctx = this.ctx;

    if (ret.area !== undefined) {
      ret.area.ctx = this.ctx;

      ret.area.pos = ret.pos;
      ret.area.size = ret.size;
      ret.area.owning_sarea = ret;
      
      ret.shadow.appendChild(ret.area);
      //ret.area.onadd();
      
      if (ret.area._init_done) {
        ret.area.push_ctx_active();
        ret.area.on_area_active();
        ret.area.pop_ctx_active();
      } else {
        ret.doOnce(() => {
          ret._init();
          ret.area._init();
          ret.area.push_ctx_active();
          ret.area.on_area_active();
          ret.area.pop_ctx_active();
        });
      }
    }
    
    return ret;
  }
  
  loadFromVerts() {
    let bs = this._borders;

    let min = new Vector2([1e17, 1e17]);
    let max = new Vector2([-1e17, -1e17]);

    for (let b of bs) {
      min.min(b.v1);
      min.min(b.v2);
      max.max(b.v1);
      max.max(b.v2);
    }
    
    this.pos[0] = Math.floor(min[0]);
    this.pos[1] = Math.floor(min[1]);
    
    this.size[0] = Math.floor(max[0] - min[0]);
    this.size[1] = Math.floor(max[1] - min[1]);
    
    this.setCSS();
  }
  
  on_resize(size, oldsize) {
    super.on_resize(size, oldsize);
    
    if (this.area !== undefined) {
      this.area.on_resize(size, oldsize);
    }      
  }
  
  makeBorders(screen) {
    this._borders.length = 0;
    
    let p = this.pos, s = this.size;
    
    let vs = [
      new Vector2([p[0],      p[1]]),
      new Vector2([p[0],      p[1]+s[1]]),
      new Vector2([p[0]+s[0], p[1]+s[1]]),
      new Vector2([p[0]+s[0], p[1]])
    ];

    for (let i=0; i<vs.length; i++) {
      let v1 = vs[i], v2 = vs[(i + 1) % vs.length];

      let b = screen.getScreenBorder(this, v1, v2, i);

      for (let j=0; j<2; j++) {
        let v = j ? b.v2 : b.v1;

        if (v.sareas.indexOf(this) < 0) {
          v.sareas.push(this);
        }
      }

      if (b.sareas.indexOf(this) < 0) {
        b.sareas.push(this);
      }
      
      this._borders.push(b);

      b.movable = screen.isBorderMovable(this, b);
    }
    
    return this;
  }
  
  setCSS() {
    this.style["position"] = "absolute";
    
    this.style["left"] = ~~this.pos[0] + "px";
    this.style["top"] = ~~this.pos[1] + "px";
    
    this.style["width"] = ~~this.size[0] + "px";
    this.style["height"] = ~~this.size[1] + "px";
    
    
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
    
    //areaclasses[name]
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
        this.area._init(); //check that init was called
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
      this.area.ctx = this.ctx;

      this.area.packflag |= this.packflag;

      this.shadow.appendChild(this.area);

      this.area.style["width"] = "100%";
      this.area.style["height"] = "100%";

      //propegate new size
      this.area.push_ctx_active();
      this.area._init(); //check that init was called
      this.area.on_resize(this.size, this.size);
      this.area.pop_ctx_active();

      this.area.push_ctx_active();
      this.area.on_area_active();
      this.area.pop_ctx_active();

      this.regenTabOrder();
    //}
  }
  
  update() {
    super.update();

    //flag client controller implementation that
    //this area is active for its type
    if (this.area !== undefined) {
      this.area.owning_sarea = this;
      this.area.size = this.size;
      this.area.pos = this.pos;
      this.area.push_ctx_active();
    }

    this._forEachChildWidget((n) => {
      n.update();
    });

    if (this.area !== undefined) {
      this.area.pop_ctx_active();
    }
  }

  static newSTRUCT() {
    return document.createElement("screenarea-x");
  }

  afterSTRUCT() {
    for (let area of this.editors) {
      area.pos = this.pos;
      area.size = this.size;
      area.owning_sarea = this;

      area.push_ctx_active();
      area._ctx = this.ctx;
      area.afterSTRUCT();
      area.pop_ctx_active();
    }
  }

  loadSTRUCT(reader) {
    reader(this);

    this.pos = new Vector2(this.pos);
    this.size = new Vector2(this.size);
    
    //find active editor
    
    for (let area of this.editors) {
      
      /*
      if (area.constructor === undefined || area.constructor.define === undefined) {
        console.warn("Missing class for area", area, "maybe buggy loadSTRUCT()?");
        continue;
      }
      //*/
      
      let areaname = area.constructor.define().areaname;

      area.inactive = true;
      area.owning_sarea = undefined;
      this.editormap[areaname] = area;
      
      if (areaname == this.area) {
        this.area = area;
      }
    }
    
    if (typeof this.area != "object") {
      console.warn("Failed to find active area!", this.area);
      this.area = this.editors[0];
    } 

    if (this.area !== undefined) {
      this.area.style["width"] = "100%";
      this.area.style["height"] = "100%";
      this.area.owning_sarea = this;

      this.area.pos = this.pos;
      this.area.size = this.size;

      this.area.inactive = false;
      this.shadow.appendChild(this.area);

      this.doOnce(() => {
        this.area.ctx = this.ctx;
        this.area._init(); //ensure init has been called already
        this.area.on_area_active();
        this.area.onadd();
      });        
    }
  }
  
  static define() {return {
    tagname : "screenarea-x"
  };}
}

ScreenArea.STRUCT = `
pathux.ScreenArea { 
  pos      : array(float);
  size     : array(float);
  type     : string;
  floating : int; 
  editors  : array(abstract(pathux.Area));
  area     : string | obj.area.constructor.define().areaname;
}
`;

nstructjs.manager.add_class(ScreenArea);  
ui_base.UIBase.register(ScreenArea);
