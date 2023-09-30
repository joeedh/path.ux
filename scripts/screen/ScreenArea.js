let _ScreenArea = undefined;

import * as util from '../path-controller/util/util.js';
import * as vectormath from '../path-controller/util/vectormath.js';
import * as ui_base from '../core/ui_base.js';
import * as ui from '../core/ui.js';
import * as ui_noteframe from '../widgets/ui_noteframe.js';
import {haveModal} from '../path-controller/util/simple_events.js';
import cconst from '../config/const.js';

import nstructjs from '../path-controller/util/struct.js';

let UIBase = ui_base.UIBase;

import {EnumProperty} from "../path-controller/toolsys/toolprop.js";

let Vector2 = vectormath.Vector2;
let Screen = undefined;

import {AreaFlags, BORDER_ZINDEX_BASE, ScreenBorder, snap, snapi} from './FrameManager_mesh.js';

export {AreaFlags};

export * from './area_wrangler.js';
import {getAreaIntName, setAreaTypes, contextWrangler, AreaWrangler, areaclasses} from './area_wrangler.js';

export {contextWrangler};

window._contextWrangler = contextWrangler;

export const BorderMask = {
  LEFT  : 1,
  BOTTOM: 2,
  RIGHT : 4,
  TOP   : 8,
  ALL   : 1 | 2 | 4 | 8
};

export const BorderSides = {
  LEFT  : 0,
  BOTTOM: 1,
  RIGHT : 2,
  TOP   : 3
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

    let def = this.constructor.define();

    //set bits in mask to keep
    //borders from moving
    this.borderLock = def.borderLock || 0;
    this.flag = def.flag || 0;

    this.inactive = true;
    this.areaDragToolEnabled = true;

    this.owning_sarea = undefined;
    this._area_id = contextWrangler.idgen++;

    this.pos = undefined; //set by screenarea parent
    this.size = undefined; //set by screenarea parent
    this.minSize = [5, 5];
    this.maxSize = [undefined, undefined];

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
    };
  }

  get floating() {
    return ~~(this.flag & AreaFlags.FLOATING);
  }

  set floating(val) {
    if (val) {
      this.flag |= AreaFlags.FLOATING;
    } else {
      this.flag &= ~AreaFlags.FLOATING;
    }
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

  static unregister(cls) {
    let def = cls.define();

    if (!def.areaname) {
      throw new Error("Missing areaname key in define()");
    }

    if (def.areaname in areaclasses) {
      delete areaclasses[def.areaname];
    }
  }

  /*
  addEventListener(type, cb, options) {
    let cb2 = (e) => {
      let x, y;
      let screen = this.getScreen();

      if (!screen) {
        console.warn("no screen!");
        return cb(elem);
      }

      if (type.startsWith("mouse")) {
        x = e.x; y = e.y;
      } else if (type.startsWith("touch") && e.touches && e.touches.length > 0) {
        x = e.touches[0].pageX; y = e.touches[0].pageY;
      } else if (type.startsWith("pointer")) {
        x = e.x; y = e.y;
      } else {
        if (screen) {
          x = screen.mpos[0];
          y = screen.mpos[1];
        } else {
          x = y = -100;
        }
      }

      let elem = screen.pickElement(x, y);
      console.log(elem ? elem.tagName : undefined);

      if (elem === this || elem === this.owning_sarea) {
        return cb(elem);
      }
    };

    cb.__cb2 = cb2;
    return super.addEventListener(type, cb2, options);
  }

  removeEventListener(type, cb, options) {
    super.removeEventListener(type, cb.__cb2, options);
  }
  //*/

  static register(cls) {
    let def = cls.define();

    if (!def.areaname) {
      throw new Error("Missing areaname key in define()");
    }

    areaclasses[def.areaname] = cls;

    ui_base.UIBase.internalRegister(cls);
  }

  static makeAreasEnum() {
    let areas = {};
    let icons = {};
    let i = 0;

    for (let k in areaclasses) {
      let cls = areaclasses[k];
      let def = cls.define();

      if (def.flag & AreaFlags.HIDDEN)
        continue;

      let uiname = def.uiname;

      if (uiname === undefined) {
        uiname = k.replace("_", " ").toLowerCase();
        uiname = uiname[0].toUpperCase() + uiname.slice(1, uiname.length);
      }

      areas[uiname] = k;
      icons[uiname] = def.icon !== undefined ? def.icon : -1;
    }

    let prop = new EnumProperty(undefined, areas);
    prop.addIcons(icons);

    return prop;
  }

  static define() {
    return {
      tagname : "pathux-editor-x", // tag name, e.g. editor-x
      areaname: undefined, //api name for area type
      flag    : 0, //see AreaFlags
      uiname  : undefined,
      icon    : undefined //icon representing area in MakeHeader's area switching menu. Integer.
    };
  }

  static newSTRUCT() {
    return UIBase.createElement(this.define().tagname);
  }

  init() {
    super.init();

    this.style["overflow"] = "hidden";
    this.noMarginsOrPadding();

    let onover = (e) => {
      //console.log(this._area_id, this.ctx.workspace._area_id);

      //try to trigger correct entry in context area stacks
      this.push_ctx_active();
      this.pop_ctx_active();
    };

    //*
    super.addEventListener("mouseover", onover, {passive: true});
    super.addEventListener("mousemove", onover, {passive: true});
    super.addEventListener("mousein", onover, {passive: true});
    super.addEventListener("mouseenter", onover, {passive: true});
    super.addEventListener("touchstart", onover, {passive: true});
    super.addEventListener("focusin", onover, {passive: true});
    super.addEventListener("focus", onover, {passive: true});
    //*/
  }

  _get_v_suffix() {
    if (this.flag & AreaFlags.INDEPENDENT) {
      return this._id;
    } else {
      return "";
    }
  }

  /**
   * Return a list of keymaps used by this editor
   * @returns {Array<KeyMap>}
   */
  getKeyMaps() {
    return this.keymap !== undefined ? [this.keymap] : [];
  }

  on_fileload(isActiveEditor) {
    contextWrangler.reset();
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
      _area_id: this._area_id,
      areaName: this.areaName
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
    let ret = UIBase.createElement(this.constructor.define().tagname);
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
  push_ctx_active(dontSetLastRef = false) {
    contextWrangler.updateLastRef(this.constructor, this);
    contextWrangler.push(this.constructor, this, !dontSetLastRef);
  }

  /**
   * see push_ctx_active
   * */
  pop_ctx_active(dontSetLastRef = false) {
    contextWrangler.pop(this.constructor, this, !dontSetLastRef);
  }

  getScreen() {
    //XXX
    //return _appstate.screen;
    throw new Error("replace me in Area.prototype");
  }

  toJSON() {
    return Object.assign(super.toJSON(), {
      areaname: this.constructor.define().areaname,
      _area_id: this._area_id
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
    if (cconst.useAreaTabSwitcher) {
      let ret = UIBase.createElement("area-docker-x");
      container.add(ret);
      return ret;
    }

    let prop = Area.makeAreasEnum();

    let dropbox = container.listenum(undefined, {
      name    : this.constructor.define().uiname,
      enumDef : prop,
      callback: (id) => {
        let cls = areaclasses[id];
        this.owning_sarea.switch_editor(cls);
      }
    });

    dropbox.update.after(() => {
      let name = this.constructor.define().uiname;
      let val = prop.values[name];

      if (dropbox.value !== val && val in prop.keys) {
        val = prop.keys[val];
      }

      if (dropbox.value !== val) {
        dropbox.setValue(prop.values[name], true);
      }
    });

    return dropbox;
  }

  makeHeader(container, add_note_area = true, make_draggable = true) {
    let switcherRow;
    let row;
    let helpRow;

    if (!(this.flag & AreaFlags.NO_SWITCHER) && cconst.useAreaTabSwitcher) {
      let col = this.header = container.col();

      switcherRow = helpRow = col.row();
      row = col.row();
    } else {
      row = helpRow = this.header = container.row();
    }

    if (!(this.flag & AreaFlags.NO_HEADER_CONTEXT_MENU)) {
      let callmenu = ScreenBorder.bindBorderMenu(this.header, true);

      this.addEventListener("mousedown", e => {
        if (e.button !== 2 || this.header.pickElement(e.x, e.y) !== this.header) {
          return;
        }

        callmenu(e);
      });
    }

    this.header.remove();
    container._prepend(this.header);

    row.setCSS.after(() => row.background = this.getDefault("AreaHeaderBG"));

    let rh = ~~(16*this.getDPI());

    //container.setSize(undefined, rh);
    //row.setSize(undefined, rh);
    //row.setSize(undefined, rh);

    container.noMarginsOrPadding();
    row.noMarginsOrPadding();

    row.style["width"] = "100%";
    row.style["margin"] = "0px";
    row.style["padding"] = "0px";

    if (!(this.flag & AreaFlags.NO_SWITCHER)) {
      if (this.switcher) {
        //add back same switcher
        switcherRow.add(this.switcher);
      } else {
        this.switcher = this.makeAreaSwitcher(cconst.useAreaTabSwitcher ? switcherRow : row);
      }
    }

    if (util.isMobile() || cconst.addHelpPickers) {
      if (this.helppicker) {
        this.helppicker.remove();
      }

      this.helppicker = helpRow.helppicker();
      this.helppicker.iconsheet = 0;
    }

    if (add_note_area) {
      let notef = UIBase.createElement("noteframe-x");
      notef.ctx = this.ctx;
      row._add(notef);
    }

    /* don't do normal dragging for tab switchers */
    if (cconst.useAreaTabSwitcher) {
      return row;
    }

    let eventdom = this.header;

    let mdown = false;
    let mpos = new Vector2();

    let mpre = (e, pageX, pageY) => {
      if (haveModal()) {
        return;
      }

      pageX = pageX === undefined ? e.x : pageX;
      pageY = pageY === undefined ? e.y : pageY;

      let node = this.getScreen().pickElement(pageX, pageY);

      /*
      while (node) {
        if (node === row) {
          break;
        }
        node = node.parentWidget;
      }//*/

      //console.log(node === row, node ? node._id : undefined, row._id)

      if (node !== row) {
        return false;
      }

      return true;
    }

    eventdom.addEventListener("pointerout", (e) => {
      //console.log("pointerout", e);
      mdown = false;
    });
    eventdom.addEventListener("pointerleave", (e) => {
      mdown = false;
      //console.log("pointerleave", e);
    });

    eventdom.addEventListener("pointerdown", (e) => {
      //console.log("pointerdown", e, mpre(e));

      if (!mpre(e)) return;

      mpos[0] = e.pageX;
      mpos[1] = e.pageY;
      mdown = true;
    });

    let last_time = util.time_ms();

    let do_mousemove = (e, pageX, pageY) => {
      if (haveModal() || !make_draggable) {
        return;
      }

      let mdown2 = e.buttons !== 0 || (e.touches && e.touches.length > 0);
      mdown2 = mdown2 && mdown;

      //console.log("area drag?", e, mdown2, e.pageX, e.pageY, mpre(e, pageX, pageY), e.was_touch);

      //calls to pickElement in mpre are expensive
      if (util.time_ms() - last_time < 250) {
        return;
      }

      last_time = util.time_ms;

      if (!mdown2 || !mpre(e, pageX, pageY)) return;


      if (e.type === "mousemove" && e.was_touch) {
        //okay how are patched events getting here?
        //avoid double call. . .
        return;
      }

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

        if (!this.areaDragToolEnabled) {
          return;
        }
        mdown = false;
        console.log("area drag tool!", e.type, e);
        screen.areaDragTool(this.owning_sarea);
      }
    };

    //not working on mobile
    //row.setAttribute("draggable", true);
    //row.draggable = true;
    /*
    eventdom.addEventListener("dragstart", (e) => {
      return;
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

    eventdom.addEventListener("drag", (e) => {
      console.log("drag!", e);
    });*/

    eventdom.addEventListener("pointermove", (e) => {
      return do_mousemove(e, e.pageX, e.pageY);
    }, false);
    eventdom.addEventListener("pointerup", (e) => {
      console.log("pointerup", e);
      mdown = false;
    }, false);
    eventdom.addEventListener("pointercancel", (e) => {
      console.log("pointercancel", e);
      mdown = false;
    }, false);

    return row;
  }

  setCSS() {
    if (this.size !== undefined) {
      this.style["position"] = UIBase.PositionKey;
      //this.style["left"] = this.pos[0] + "px";
      //this.style["top"] = this.pos[1] + "px";
      this.style["width"] = this.size[0] + "px";
      this.style["height"] = this.size[1] + "px";
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

  loadSTRUCT(reader) {
    reader(this);
  }

  _isDead() {
    if (this.dead) {
      return true;
    }

    let screen = this.getScreen();

    if (screen === undefined)
      return true;

    if (screen.parentNode === undefined)
      return true;
  }

  //called by owning ScreenArea on file load
  afterSTRUCT() {
    let f = () => {
      if (this._isDead()) {
        return;
      }
      if (!this.ctx) {
        this.doOnce(f);
        return;
      }

      try {
        ui_base.loadUIData(this, this.saved_uidata);
        this.saved_uidata = undefined;
      } catch (error) {
        console.log("failed to load ui data");
        util.print_stack(error);
      }
    };

    this.doOnce(f);
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
  flag : int;
  saved_uidata : string | obj._getSavedUIData();
}
`

nstructjs.register(Area, "pathux.Area");
ui_base.UIBase.internalRegister(Area);

export class ScreenArea extends ui_base.UIBase {
  constructor() {
    super();

    this._flag = undefined;

    this.flag = 0; /** holds AreaFlags.FLOATING and AreaFlags.INDEPENDENT */

    this._borders = [];
    this._verts = [];
    this.dead = false;

    this._sarea_id = contextWrangler.idgen++;

    this._pos = new Vector2();
    this._size = new Vector2([512, 512]);

    if (cconst.DEBUG.screenAreaPosSizeAccesses) {
      let wrapVector = (name, axis) => {
        Object.defineProperty(this[name], axis, {
          get: function () {
            return this["_" + axis];
          },

          set: function (val) {
            console.warn(`ScreenArea.${name}[${axis}] set:`, val);
            this["_" + axis] = val;
          }
        });
      };

      wrapVector("size", 0);
      wrapVector("size", 1);
      wrapVector("pos", 0);
      wrapVector("pos", 1);
    }

    this.area = undefined;
    this.editors = [];
    this.editormap = {};

    this.addEventListener("mouseover", (e) => {
      if (haveModal()) {
        return;
      }

      //console.log("screen area mouseover");
      let screen = this.getScreen();
      if (screen.sareas.active !== this && screen.sareas.active && screen.sareas.active.area) {
        screen.sareas.active.area.on_area_blur();
      }

      if (this.area && screen.sareas.active !== this) {
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

  get floating() {
    return this.flag & AreaFlags.FLOATING;
  }

  set floating(val) {
    if (val) {
      this.flag |= AreaFlags.FLOATING;
    } else {
      this.flag &= ~AreaFlags.FLOATING;
    }
  }

  get flag() {
    let flag = this._flag & (AreaFlags.FLOATING | AreaFlags.INDEPENDENT);

    if (this.area) {
      flag |= this.area.flag;
    }

    return flag;
  }

  set flag(v) {
    this._flag &= ~(AreaFlags.FLOATING | AreaFlags.INDEPENDENT);
    this._flag |= v & (AreaFlags.FLOATING | AreaFlags.INDEPENDENT);

    if (this.area) {
      this.area.flag |= v & ~(AreaFlags.FLOATING | AreaFlags.INDEPENDENT);
    }
  }

  get borderLock() {
    return this.area !== undefined ? this.area.borderLock : 0;
  }

  get minSize() {
    return this.area !== undefined ? this.area.minSize : this.size;
  }

  get maxSize() {
    return this.area !== undefined ? this.area.maxSize : this.size;
  }

  get pos() {
    return this._pos;
  }

  set pos(val) {
    if (cconst.DEBUG.screenAreaPosSizeAccesses) {
      console.log("ScreenArea set pos", val);
    }
    this._pos.load(val);
  }

  get size() {
    return this._size;
  }

  set size(val) {
    if (cconst.DEBUG.screenAreaPosSizeAccesses) {
      console.log("ScreenArea set size", val);
    }
    this._size.load(val);
  }

  static newSTRUCT() {
    return UIBase.createElement("screenarea-x");
  }

  static define() {
    return {
      tagname: "screenarea-x"
    };
  }

  _get_v_suffix() {
    return this.area ? this.area._get_v_suffix() : "";
  }

  bringToFront() {
    let screen = this.getScreen();

    HTMLElement.prototype.remove.call(this);
    screen.sareas.remove(this);

    screen.appendChild(this);

    let zindex = BORDER_ZINDEX_BASE + 1;

    if (screen.style["z-index"]) {
      zindex = parseInt(screen.style["z-index"]) + 1;
    }

    for (let sarea of screen.sareas) {
      let zindex = sarea.style["z-index"];
      if (sarea.style["z-index"]) {
        zindex = Math.max(zindex, parseInt(sarea.style["z-index"]) + 1);
      }
    }

    this.style["z-index"] = zindex;
  }

  _side(border) {
    let ret = this._borders.indexOf(border);
    if (ret < 0) {
      throw new Error("border not in screen area");
    }

    return ret;
  }

  init() {
    super.init();

    this.noMarginsOrPadding();
  }

  draw() {
    if (this.area && this.area.draw) {
      this.area.push_ctx_active();
      this.area.draw();
      this.area.pop_ctx_active();
    }
  }

  _isDead() {
    if (this.dead) {
      return true;
    }

    let screen = this.getScreen();

    if (screen === undefined)
      return true;

    if (screen.parentNode === undefined)
      return true;
  }

  toJSON() {
    let ret = {
      editors  : this.editors,
      _sarea_id: this._sarea_id,
      area     : this.area.constructor.define().areaname,
      pos      : this.pos,
      size     : this.size
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
      let area = UIBase.createElement(tagname);

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
      this.area.parentWidget = this;

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

    this.dead = true;

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

    return p && p instanceof Screen ? p : undefined;
  }

  copy(screen) {
    let ret = UIBase.createElement("screenarea-x");

    ret.screen = screen;
    ret.ctx = this.ctx;

    ret.pos[0] = this.pos[0];
    ret.pos[1] = this.pos[1];

    ret.size[0] = this.size[0];
    ret.size[1] = this.size[1];

    for (let area of this.editors) {
      let cpy = area.copy();

      cpy.ctx = this.ctx;

      cpy.parentWidget = ret;
      ret.editors.push(cpy);
      ret.editormap[cpy.constructor.define().areaname] = cpy;

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
      ret.area.parentWidget = ret;

      ret.shadow.appendChild(ret.area);
      //ret.area.onadd();

      if (ret.area._init_done) {
        ret.area.push_ctx_active();
        ret.area.on_area_active();
        ret.area.pop_ctx_active();
      } else {
        ret.doOnce(() => {
          if (this.dead) {
            return;
          }
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

  snapToScreenSize() {
    let screen = this.getScreen();
    let co = new Vector2();
    let changed = 0;

    for (let v of this._verts) {
      co.load(v);

      v[0] = Math.min(Math.max(v[0], 0), screen.size[0]);
      v[1] = Math.min(Math.max(v[1], 0), screen.size[1]);

      if (co.vectorDistance(v) > 0.1) {
        changed = 1;
      }
    }

    if (changed) {
      this.loadFromVerts();
    }
  }

  /**
   *
   * Sets screen verts from pos/size
   * */
  loadFromPosSize() {
    if (this.floating && this._verts.length > 0) {
      let p = this.pos, s = this.size;

      this._verts[0].loadXY(p[0], p[1]);
      this._verts[1].loadXY(p[0], p[1] + s[1]);
      this._verts[2].loadXY(p[0] + s[0], p[1] + s[1]);
      this._verts[3].loadXY(p[0] + s[0], p[1]);

      for (let border of this._borders) {
        border.setCSS();
      }

      this.setCSS();
      return;
    }

    let screen = this.getScreen();
    if (!screen) return;

    for (let b of this._borders) {
      screen.freeBorder(b);
    }

    this.makeBorders(screen);
    this.setCSS();

    return this;
  }

  /**
   *
   * Sets pos/size from screen verts
   * */
  loadFromVerts() {
    if (this._verts.length == 0) {
      return;
    }

    let min = new Vector2([1e17, 1e17]);
    let max = new Vector2([-1e17, -1e17]);

    for (let v of this._verts) {
      min.min(v);
      max.max(v);
    }

    this.pos[0] = min[0];
    this.pos[1] = min[1];

    this.size[0] = max[0] - min[0];
    this.size[1] = max[1] - min[1];

    this.setCSS();
    return this;
  }

  on_resize(size, oldsize) {
    super.on_resize(size, oldsize);

    if (this.area !== undefined) {
      this.area.on_resize(size, oldsize);
    }
  }

  makeBorders(screen) {
    this._borders.length = 0;
    this._verts.length = 0;

    let p = this.pos, s = this.size;

    //s = snapi(new Vector2(s));

    let vs = [
      new Vector2([p[0], p[1]]),
      new Vector2([p[0], p[1] + s[1]]),
      new Vector2([p[0] + s[0], p[1] + s[1]]),
      new Vector2([p[0] + s[0], p[1]])
    ];

    let floating = this.floating;

    for (let i = 0; i < vs.length; i++) {
      vs[i] = snap(vs[i]);
      vs[i] = screen.getScreenVert(vs[i], i, floating);
      this._verts.push(vs[i]);
    }

    for (let i = 0; i < vs.length; i++) {
      let v1 = vs[i], v2 = vs[(i + 1)%vs.length];

      let b = screen.getScreenBorder(this, v1, v2, i);


      for (let j = 0; j < 2; j++) {
        let v = j ? b.v2 : b.v1;

        if (v.sareas.indexOf(this) < 0) {
          v.sareas.push(this);
        }
      }

      if (b.sareas.indexOf(this) < 0) {
        b.sareas.push(this);
      }

      this._borders.push(b);

      b.movable = screen.isBorderMovable(b);
    }

    return this;
  }

  setCSS() {
    this.style["position"] = UIBase.PositionKey;

    this.style["left"] = this.pos[0] + "px";
    this.style["top"] = this.pos[1] + "px";

    this.style["width"] = this.size[0] + "px";
    this.style["height"] = this.size[1] + "px";

    this.style["overflow"] = "hidden";
    this.style["contain"] = "layout"; //ensure we have a new positioning stack

    if (this.area !== undefined) {
      this.area.setCSS();
    }
  }

  appendChild(child) {
    if (child instanceof Area) {
      let def = child.constructor.define();
      let existing = this.editormap[def.areaname];

      if (existing && existing !== child) {
        console.warn("Warning, replacing an exising editor instance", child, existing);

        if (this.area === existing) {
          this.area = child;
        }

        existing.remove();
        this.editormap[def.areaname] = child;
      }

      child.ctx = this.ctx;
      child.pos = this.pos;
      child.size = this.size;

      if (this.editors.indexOf(child) < 0) {
        this.editors.push(child);
      }

      child.owning_sarea = undefined;
      if (this.area === undefined) {
        this.area = child;
      }
    }

    super.appendChild(child);

    if (child instanceof ui_base.UIBase) {
      child.parentWidget = this;
      child.onadd();
    }
  }

  switch_editor(cls) {
    return this.switchEditor(cls);
  }

  switchEditor(cls) {
    let def = cls.define();
    let name = def.areaname;

    //areaclasses[name]
    if (!(name in this.editormap)) {
      this.editormap[name] = UIBase.createElement(def.tagname);
      this.editormap[name].ctx = this.ctx;
      this.editormap[name].parentWidget = this;
      this.editormap[name].owning_sarea = this;
      this.editormap[name].inactive = false;

      this.editors.push(this.editormap[name]);
    }

    //var finish = () => {
    if (this.area) {
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
    } else {
      this.area = undefined;
    }

    this.area = this.editormap[name];

    this.area.inactive = false;
    this.area.parentWidget = this;

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

  _checkWrangler() {
    if (this.ctx)
      contextWrangler._checkWrangler(this.ctx);
  }

  update() {
    this._checkWrangler();

    super.update();

    //flag client controller implementation that
    //this area is active for its type
    if (this.area !== undefined) {
      this.area.owning_sarea = this;
      this.area.parentWidget = this;
      this.area.size = this.size;
      this.area.pos = this.pos;

      let screen = this.getScreen();
      let oldsize = [this.size[0], this.size[1]];

      let moved = screen ? screen.checkAreaConstraint(this, true) : 0;
      //*
      if (moved) {
        if (cconst.DEBUG.areaConstraintSolver) {
          console.log("screen constraint solve", moved, this.area.minSize, this.area.maxSize, this.area.tagName, this.size);
        }

        screen.solveAreaConstraints();
        screen.regenBorders();
        this.on_resize(oldsize);
      }//*/

      this.area.push_ctx_active(true);
    }

    this._forEachChildWidget((n) => {
      n.update();
    });

    if (this.area !== undefined) {
      this.area.pop_ctx_active(true);
    }
  }

  appendChild(ch) {
    if (ch instanceof Area) {
      this.editors.push(ch);
      this.editormap[ch.constructor.define().areaname] = ch;
    } else {
      super.appendChild(ch);
    }
  }

  removeChild(ch) {
    if (ch instanceof Area) {
      ch.owining_sarea = undefined;
      ch.pos = undefined;
      ch.size = undefined;

      if (this.area === ch && this.editors.length > 1) {
        let i = (this.editors.indexOf(ch) + 1)%this.editors.length;
        this.switchEditor(this.editors[i].constructor);
      } else if (this.area === ch) {
        this.editors = [];
        this.editormap = {};
        this.area = undefined;

        ch.remove();
        return;
      }

      let areaname = ch.constructor.define().areaname;

      this.editors.remove(ch);
      delete this.editormap[areaname];

      ch.parentWidget = undefined;
    } else {
      return super.removeChild(ch);
    }
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

    let editors = [];

    for (let area of this.editors) {
      if (!area.constructor || !area.constructor.define || area.constructor === Area) {
        //failed to load this area
        continue;
      }

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

      if (areaname === this.area) {
        this.area = area;
      }

      /*
      * originally inactive areas weren't supposed to have
      * a reference to their owning ScreenAreas.
      *
      * Unfortunately this will cause isDead() to return true,
      * which might lead to nasty problems.
      * */
      area.parentWidget = this;

      editors.push(area);
    }
    this.editors = editors;

    if (typeof this.area !== "object") {
      let area = this.editors[0];

      console.warn("Failed to find active area!", this.area);

      if (typeof area !== "object") {
        for (let k in areaclasses) {
          area = areaclasses[k].define().tagname;
          area = UIBase.createElement(area);
          let areaname = area.constructor.define().areaname;

          this.editors.push(area);
          this.editormap[areaname] = area;

          break;
        }
      }

      if (area) {
        this.area = area;
      }
    }

    if (this.area !== undefined) {
      this.area.style["width"] = "100%";
      this.area.style["height"] = "100%";
      this.area.owning_sarea = this;
      this.area.parentWidget = this;

      this.area.pos = this.pos;
      this.area.size = this.size;

      this.area.inactive = false;
      this.shadow.appendChild(this.area);

      let f = () => {
        if (this._isDead()) {
          return;
        }

        if (!this.ctx && this.parentNode) {
          console.log("waiting to start. . .");
          this.doOnce(f);
          return;
        }

        this.area.ctx = this.ctx;
        this.area._init(); //ensure init has been called already
        this.area.on_area_active();
        this.area.onadd();
      };

      this.doOnce(f);
    }

  }
}

ScreenArea.STRUCT = `
pathux.ScreenArea { 
  pos      : vec2;
  size     : vec2;
  type     : string;
  hidden   : bool;
  editors  : array(abstract(pathux.Area));
  area     : string | this.area ? this.area.constructor.define().areaname : "";
}
`;

nstructjs.register(ScreenArea, "pathux.ScreenArea");
ui_base.UIBase.internalRegister(ScreenArea);

ui_base._setAreaClass(Area);

export function setScreenClass(cls) {
  Screen = cls;
}
