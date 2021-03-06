let _ui_base = undefined;


//import * as ui_save from './ui_save.js';

/*
if (window.document && document.body) {
  console.log("ensuring body.style.margin/padding are zero");
  document.body.style["margin"] = "0px";
  document.body.style["padding"] = "0px";
}
 */

import * as cssutils from '../path-controller/util/cssutils.js';
import {Animator} from "./anim.js";
import './units.js';
import * as util from '../path-controller/util/util.js';
import * as vectormath from '../path-controller/util/vectormath.js';
import * as math from '../path-controller/util/math.js';
import * as toolprop from '../path-controller/toolsys/toolprop.js';
import * as controller from '../path-controller/controller/controller.js';
import {pushModalLight, popModalLight, copyEvent, pathDebugEvent} from '../path-controller/util/simple_events.js';
import {getDataPathToolOp} from '../path-controller/controller/controller.js';
import * as units from './units.js';
import {rgb_to_hsv, hsv_to_rgb} from "../util/colorutils.js";

export * from './ui_theme.js';

import {CSSFont, theme, parsepx, compatMap} from "./ui_theme.js";

import {DefaultTheme} from './theme.js';

export {theme} from "./ui_theme.js";

import cconst from '../config/const.js';

window.__cconst = cconst;

let Vector4 = vectormath.Vector4;

export {Icons} from '../icon_enum.js';
import {Icons} from '../icon_enum.js';

export {setIconMap} from '../icon_enum.js';
import {setIconMap} from '../icon_enum.js';

import {AfterAspect, initAspectClass} from "./aspect.js";
import * as aspect from './aspect.js';

const EnumProperty = toolprop.EnumProperty;

let Area;
export let _setAreaClass = (cls) => {
  Area = cls;
}

export const ErrorColors = {
  WARNING: "yellow",
  ERROR  : "red",
  OK     : "green"
};

window.__theme = theme;

let registered_has_happened = false;
let tagPrefix = "";

/**
 * Sets tag prefix for pathux html elements.
 * Must be called prior to loading other modules.
 * Since this is tricky, you can alternatively
 * add a script tag with the prefix with the id "pathux-tag-prefix",
 * e.g.<pre> <script type="text/plain" id="pathux-tag-prefix">prefix</script> </pre>
 * */
export function setTagPrefix(prefix) {
  if (registered_has_happened) {
    throw new Error("have to call ui_base.setTagPrefix before loading any other path.ux modules");
  }

  tagPrefix = "" + prefix;
}

export function getTagPrefix(prefix) {
  return tagPrefix;
}

let prefix = document.getElementById("pathux-tag-prefix");
if (prefix) {
  console.log("Found pathux-tag-prefix element");
  prefix = prefix.innerText.trim();
  setTagPrefix(prefix);
}

export function setTheme(theme2) {
  //merge theme
  for (let k in theme2) {
    let v = theme2[k];

    if (typeof v !== "object") {
      theme[k] = v;
      continue;
    }

    let v0 = theme[k];

    if (!(k in theme)) {
      theme[k] = {};
    }

    for (let k2 in v) {
      //if (v0 && !(k2 in v0)) {
      //  continue;
      //}

      if (k2 in compatMap) {
        let k3 = compatMap[k2];

        if (v[k3] === undefined) {
          v[k3] = v[k2];
        }

        delete v[k2];
        k2 = k3;
      }

      theme[k][k2] = v[k2];
    }
  }
}

setTheme(DefaultTheme);

let _last_report = util.time_ms();

export function report() {
  if (util.time_ms() - _last_report > 350) {
    console.warn(...arguments);
    _last_report = util.time_ms();
  }
}

//this function is deprecated
export function getDefault(key, elem) {
  console.warn("Deprecated call to ui_base.js:getDefault");

  if (key in theme.base) {
    return theme.base[key];
  } else {
    throw new Error("Unknown default " + key);
  }
}

//XXX implement me!
export function IsMobile() {
  console.warn("ui_base.IsMobile is deprecated; use util.isMobile instead")
  return util.isMobile();
};

let keys = ["margin", "padding", "margin-block-start", "margin-block-end"];
keys = keys.concat(["padding-block-start", "padding-block-end"]);

keys = keys.concat(["margin-left", "margin-top", "margin-bottom", "margin-right"]);
keys = keys.concat(["padding-left", "padding-top", "padding-bottom", "padding-right"]);
export const marginPaddingCSSKeys = keys;


class _IconManager {
  constructor(image, tilesize, number_of_horizontal_tiles, drawsize) {
    this.tilex = number_of_horizontal_tiles;
    this.tilesize = tilesize;
    this.drawsize = drawsize;

    this.image = image;
  }

  canvasDraw(elem, canvas, g, icon, x = 0, y = 0) {
    let tx = icon%this.tilex;
    let ty = ~~(icon/this.tilex);

    let dpi = elem.getDPI();
    let ts = this.tilesize;
    let ds = this.drawsize;

    if (!this.image) {
      //console.warn("Failed to render an iconsheet");
      return;
    }

    g.drawImage(this.image, tx*ts, ty*ts, ts, ts, x, y, ds*dpi, ds*dpi);
  }

  setCSS(icon, dom, fitsize=undefined) {
    if (!fitsize) {
      fitsize = this.drawsize;
    }

    if (typeof fitsize === "object") {
      fitsize = Math.max(fitsize[0], fitsize[1]);
    }

    dom.style["background"] = this.getCSS(icon, fitsize);
    dom.style["background-size"] = (fitsize*this.tilex) + "px";

    if (!dom.style["width"]) {
      dom.style["width"] = this.drawsize + "px";
    }
    if (!dom.style["height"]) {
      dom.style["height"] = this.drawsize + "px";
    }
  }

  //icon is an integer
  getCSS(icon, fitsize=this.drawsize) {
    if (icon == -1) { //-1 means no icon
      return '';
    }

    if (typeof fitsize === "object") {
      fitsize = Math.max(fitsize[0], fitsize[1]);
    }

    let ratio = fitsize/this.tilesize;

    let x = (-(icon%this.tilex)*this.tilesize)*ratio;
    let y = (-(~~(icon/this.tilex))*this.tilesize)*ratio;

    //x = ~~x;
    //y = ~~y;

    //console.log(this.tilesize, this.drawsize, x, y);

    return `url("${this.image.src}") ${x}px ${y}px`;
  }
}

export class IconManager {
  /**
   images is a list of dom ids of img tags

   sizes is a list of tile sizes, one per image.
   you can control the final *draw* size by passing an array
   of [tilesize, drawsize] instead of just a number.
   */
  constructor(images, sizes, horizontal_tile_count) {
    this.iconsheets = [];
    this.tilex = horizontal_tile_count;

    for (let i = 0; i < images.length; i++) {
      let size, drawsize;

      if (typeof sizes[i] == "object") {
        size = sizes[i][0], drawsize = sizes[i][1];
      } else {
        size = drawsize = sizes[i];
      }

      if (util.isMobile()) {
        drawsize = ~~(drawsize*theme.base.mobileSizeMultiplier);
      }

      this.iconsheets.push(new _IconManager(images[i], size, horizontal_tile_count, drawsize));
    }
  }

  load(manager2) {
    this.iconsheets = manager2.iconsheets;
    this.tilex = manager2.tilex;

    return this;
  }

  reset(horizontal_tile_count) {
    this.iconsheets.length = 0;
    this.tilex = horizontal_tile_count;
  }

  add(image, size, drawsize = size) {
    this.iconsheets.push(new _IconManager(image, size, this.tilex, drawsize));
    return this;
  }

  canvasDraw(elem, canvas, g, icon, x = 0, y = 0, sheet = 0) {
    let base = this.iconsheets[sheet];

    sheet = this.findSheet(sheet);
    let ds = sheet.drawsize;

    sheet.drawsize = base.drawsize;
    sheet.canvasDraw(elem, canvas, g, icon, x, y);
    sheet.drawsize = ds;
  }

  findClosestSheet(size) {
    let sheets = this.iconsheets.concat([]);

    sheets.sort((a, b) => a.drawsize - b.drawsize);
    let sheet;

    for (let i = 0; i < sheets.length; i++) {
      if (sheets[i].drawsize <= size) {
        sheet = sheets[i];
        break;
      }
    }

    if (!sheet)
      sheet = sheets[sheets.length - 1];

    return this.iconsheets.indexOf(sheet);
  }

  findSheet(sheet) {
    if (sheet === undefined) {
      console.warn("sheet was undefined");
      sheet = 0;
    }

    let base = this.iconsheets[sheet];

    /**sigh**/
    let dpi = UIBase.getDPI();
    let minsheet = undefined;
    let goal = dpi*base.drawsize;

    for (let sheet of this.iconsheets) {
      minsheet = sheet;

      if (sheet.drawsize >= goal) {
        break;
      }
    }

    return minsheet === undefined ? base : minsheet;
  }

  getTileSize(sheet = 0) {
    return this.iconsheets[sheet].drawsize;
    return this.findSheet(sheet).drawsize;
  }

  getRealSize(sheet = 0) {
    return this.iconsheets[sheet].tilesize;
    return this.findSheet(sheet).tilesize;
    //return this.iconsheets[sheet].tilesize;
  }

  //icon is an integer
  getCSS(icon, sheet = 0) {
    //return this.iconsheets[sheet].getCSS(icon);
    //return this.findSheet(sheet).getCSS(icon);

    let base = this.iconsheets[sheet];
    sheet = this.findSheet(sheet);
    let ds = sheet.drawsize;

    sheet.drawsize = base.drawsize;
    let ret = sheet.getCSS(icon);
    sheet.drawsize = ds;

    return ret;
  }

  setCSS(icon, dom, sheet = 0, fitsize=undefined) {
    //return this.iconsheets[sheet].setCSS(icon, dom);

    let base = this.iconsheets[sheet];
    sheet = this.findSheet(sheet);
    let ds = sheet.drawsize;

    sheet.drawsize = base.drawsize;
    let ret = sheet.setCSS(icon, dom, fitsize);
    sheet.drawsize = ds;

    return ret;
  }
}

export let iconmanager = new IconManager([
  document.getElementById("iconsheet16"),
  document.getElementById("iconsheet32"),
  document.getElementById("iconsheet48")
], [16, 32, 64], 16);

window._iconmanager = iconmanager; //debug global

//if client code overrides iconsheets, they must follow logical convention
//that the first one is "small" and the second is "large"
export let IconSheets = {
  SMALL : 0,
  LARGE : 1,
  XLARGE: 2
};

export function iconSheetFromPackFlag(flag) {
  if (flag & PackFlags.CUSTOM_ICON_SHEET) {
    return flag >> PackFlags.CUSTOM_ICON_SHEET_START;
  }

  if ((flag & PackFlags.SMALL_ICON) && !(PackFlags.LARGE_ICON)) {
    return 0//IconSheets.SMALL; //0
  } else {
    return 1//IconSheets.LARGE; //1
  }
}

export function getIconManager() {
  return iconmanager;
}

export function setIconManager(manager, IconSheetsOverride) {
  iconmanager.load(manager);

  if (IconSheetsOverride !== undefined) {
    for (let k in IconSheetsOverride) {
      IconSheets[k] = IconSheetsOverride[k];
    }
  }
}

export function makeIconDiv(icon, sheet = 0) {
  let size = iconmanager.getRealSize(sheet);
  let drawsize = iconmanager.getTileSize(sheet);

  let icontest = document.createElement("div");

  icontest.style["width"] = icontest.style["min-width"] = drawsize + "px";
  icontest.style["height"] = icontest.style["min-height"] = drawsize + "px";

  icontest.style["background-color"] = "orange";

  icontest.style["margin"] = "0px";
  icontest.style["padding"] = "0px";

  iconmanager.setCSS(icon, icontest, sheet);

  return icontest;
}

let Vector2 = vectormath.Vector2;
let Matrix4 = vectormath.Matrix4;

export let dpistack = [];

export const UIFlags = {};

const internalElementNames = {};
const externalElementNames = {};

export const PackFlags = {
  INHERIT_WIDTH : 1,
  INHERIT_HEIGHT: 2,
  VERTICAL      : 4,
  USE_ICONS     : 8,
  SMALL_ICON    : 16,
  LARGE_ICON    : 32,

  FORCE_PROP_LABELS         : 64, //force propeties (Container.prototype.prop()) to always have labels
  PUT_FLAG_CHECKS_IN_COLUMNS: 128, //group flag property checkmarks in columns (doesn't apply to icons)

  WRAP_CHECKBOXES: 256,

  //internal flags
  STRIP_HORIZ            : 512,
  STRIP_VERT             : 1024,
  STRIP                  : 512 | 1024,
  SIMPLE_NUMSLIDERS      : 2048,
  FORCE_ROLLER_SLIDER    : 4096,
  HIDE_CHECK_MARKS       : (1<<13),
  NO_NUMSLIDER_TEXTBOX   : (1<<14),
  CUSTOM_ICON_SHEET      : 1<<15,
  CUSTOM_ICON_SHEET_START: 20
};

let first = (iter) => {
  if (iter === undefined) {
    return undefined;
  }

  if (!(Symbol.iterator in iter)) {
    for (let item in iter) {
      return item;
    }

    return undefined;
  }

  for (let item of iter) {
    return item;
  }
}

import {DataPathError} from '../path-controller/controller/controller.js';

let _mobile_theme_patterns = [
  /.*width.*/,
  /.*height.*/,
  /.*size.*/,
  /.*margin.*/,
  /.*pad/,
  /.*radius.*/
];


let _idgen = 0;

window._testSetScrollbars = function (color = "grey", contrast = 0.5, width = 15, border = "solid") {
  let buf = styleScrollBars(color, undefined, contrast, width, border, "*");
  CTX.screen.mergeGlobalCSS(buf);

  //document.body.style["overflow"] = "scroll";

  /*
  if (!window._tsttag) {
    window._tsttag = document.createElement("style");
    document.body.prepend(_tsttag);
  }

  _tsttag.textContent = buf;
  //*/

  return buf;
};

export function styleScrollBars(color = "grey", color2 = undefined, contrast = 0.5, width = 15,
                                border = "1px groove black", selector = "*") {

  if (!color2) {
    let c = css2color(color);
    let a = c.length > 3 ? c[3] : 1.0;

    c = rgb_to_hsv(c[0], c[1], c[2]);
    let inv = c.slice(0, c.length);

    inv[2] = 1.0 - inv[2];
    inv[2] += (c[2] - inv[2])*(1.0 - contrast);

    inv = hsv_to_rgb(inv[0], inv[1], inv[2]);

    inv.length = 4;
    inv[3] = a;

    inv = color2css(inv);
    color2 = inv;
  }

  let buf = `

${selector} {
  scrollbar-width : ${width <= 16 ? 'thin' : 'auto'};
  scrollbar-color : ${color2} ${color};
}

${selector}::-webkit-scrollbar {
  width : ${width}px;
  background-color : ${color};
}

${selector}::-webkit-scrollbar-track {
  background-color : ${color};
  border : ${border};
}

${selector}::-webkit-scrollbar-thumb {
  background-color : ${color2};
  border : ${border};
}
    `;

  //console.log(buf);
  return buf;
}

window.styleScrollBars = styleScrollBars;

let _digest = new util.HashDigest();

export function calcThemeKey(digest = _digest.reset()) {
  for (let k in theme) {
    let obj = theme[k];

    if (typeof obj !== "object") {
      continue;
    }

    for (let k2 in obj) {
      let v2 = obj[k2];

      if (typeof v2 === "number" || typeof v2 === "boolean" || typeof v2 === "string") {
        digest.add(v2);
      } else if (typeof v2 === "object" && v2 instanceof CSSFont) {
        v2.calcHashUpdate(digest);
      }
    }
  }

  return digest.get();
}

export var _themeUpdateKey = calcThemeKey();

export function flagThemeUpdate() {
  _themeUpdateKey = calcThemeKey();
}

export class UIBase extends HTMLElement {
  constructor() {
    super();

    this._textBoxEvents = false;

    this._checkTheme = true;
    this._last_theme_update_key = _themeUpdateKey;

    this._client_disabled_set = undefined;
    //this._parent_disabled_set = 0;

    this.pathUndoGen = 0;
    this._lastPathUndoGen = 0;
    this._useDataPathUndo = undefined;

    this._active_animations = [];

    //ref to Link element referencing Screen style node
    //Screen.update_intern sets the contents of this
    this._screenStyleTag = document.createElement("style");
    this._screenStyleUpdateHash = 0;

    initAspectClass(this, new Set(["appendChild", "animate", "shadow", "removeNode", "prepend", "add", "init"]));

    this.shadow = this.attachShadow({mode: 'open'});

    if (cconst.DEBUG.paranoidEvents) {
      this.__cbs = [];
    }

    this.shadow.appendChild(this._screenStyleTag);
    this.shadow._appendChild = this.shadow.appendChild;

    ///*
    let appendChild = this.shadow.appendChild;
    this.shadow.appendChild = (child) => {
      if (child && typeof child === "object" && child instanceof UIBase) {
        child.parentWidget = this;
      }

      return this.shadow._appendChild(child, ...arguments);
    };
    //*/

    this._wasAddedToNodeAtSomeTime = false;

    this.visibleToPick = true;

    this._override_class = undefined;
    this.parentWidget = undefined;

    /*
    this.shadow._appendChild = this.shadow.appendChild;
    this.shadow.appendChild = (child) => {
      if (child instanceof UIBase) {
        child.ctx = this.ctx;
        child.parentWidget = this;

        if (child._useDataPathUndo === undefined) {
          child.useDataPathUndo = this.useDataPathUndo;
        }
      }

      return this.shadow._appendChild(child);
    };
    //*/

    let tagname = this.constructor.define().tagname;
    this._id = tagname.replace(/\-/g, "_") + (_idgen++);

    this.default_overrides = {}; //inherited by child widgets
    this.my_default_overrides = {}; //not inherited to child widgets
    this.class_default_overrides = {};

    this._last_description = undefined;

    //getting css to flow down properly can be a pain, so
    //some packing settings are set as bitflags here,
    //see PackFlags

    /*
    setInterval(() => {
      this.update();
    }, 200);
    //*/

    this._modaldata = undefined;
    this.packflag = this.getDefault("BasePackFlag");
    this._internalDisabled = false;
    this.__disabledState = false;
    this._disdata = undefined;
    this._ctx = undefined;

    this._description = undefined;

    let style = document.createElement("style");
    style.textContent = `
    .DefaultText {
      font: ` + _getFont(this) + `;
    }
    `;
    this.shadow.appendChild(style);
    this._init_done = false;

    //make default touch handlers that send mouse events
    let do_touch = (e, type, button) => {
      button = button === undefined ? 0 : button;
      let e2 = copyEvent(e);

      if (e.touches.length === 0) {
        //hrm, what to do, what to do. . .
      } else {
        let t = e.touches[0];

        e2.pageX = t.pageX;
        e2.pageY = t.pageY;
        e2.screenX = t.screenX;
        e2.screenY = t.screenY;
        e2.clientX = t.clientX;
        e2.clientY = t.clientY;
        e2.x = t.x;
        e2.y = t.y;
      }

      e2.button = button;

      e2 = new MouseEvent(type, e2);

      e2.was_touch = true;
      e2.stopPropagation = e.stopPropagation.bind(e);
      e2.preventDefault = e.preventDefault.bind(e);
      e2.touches = e.touches;

      this.dispatchEvent(e2);
    };

    this.addEventListener("touchstart", (e) => {
      do_touch(e, "mousedown", 0);
    }, {passive: false});
    this.addEventListener("touchmove", (e) => {
      do_touch(e, "mousemove");
    }, {passive: false});
    this.addEventListener("touchcancel", (e) => {
      do_touch(e, "mouseup", 2);
    }, {passive: false});
    this.addEventListener("touchend", (e) => {
      do_touch(e, "mouseup", 0);
    }, {passive: false});
  }

  /*
  set default_overrides(v) {
    console.error("default_overrides was set", v);
    this._default_overrides = v;
  }

  get default_overrides() {
    return this._default_overrides;
  }//*/

  get parentWidget() {
    return this._parentWidget;
  }

  set parentWidget(val) {
    if (val) {
      this._wasAddedToNodeAtSomeTime = true;
    }

    this._parentWidget = val;
  }

  get useDataPathUndo() {
    let p = this;

    while (p) {
      if (p._useDataPathUndo !== undefined) {
        return p._useDataPathUndo;
      }

      p = p.parentWidget;
    }

    return false;
  }

  /**
   causes calls to setPathValue to go through
   toolpath app.datapath_set(path="" newValueJSON="")

   every child will inherit
   */
  set useDataPathUndo(val) {
    this._useDataPathUndo = val;
  }

  get description() {

    return this._description;
  }

  set description(val) {
    this._description = val;

    if (val === undefined || val === null) {
      return;
    }

    if (cconst.showPathsInToolTips && this.hasAttribute("datapath")) {
      let s = "" + this._description;

      let path = this.getAttribute("datapath");
      s += "\n    path: " + path;

      if (this.hasAttribute("mass_set_path")) {
        let m = this.getAttribute("mass_set_path");
        s += "\n    massSetPath: " + m;
      }
      this.title = s;

    } else {
      this.title = "" + val;
    }
  }

  get background() {
    return this.__background;
  }

  set background(bg) {
    this.__background = bg;

    this.overrideDefault("background-color", bg, true);
    this.style["background-color"] = bg;
  }

  get disabled() {
    //hrm, I could just propegate checks upward. . .

    if (this.parentWidget && this.parentWidget.disabled) {
      return true;
    }

    return !!this._client_disabled_set || !!this._internalDisabled;// || !!this._parent_disabled_set;
  }

  set disabled(v) {
    this._client_disabled_set = v;
    this.__updateDisable(this.disabled);
  }

  get internalDisabled() {
    return this._internalDisabled;
  }

  set internalDisabled(val) {
    this._internalDisabled = !!val;

    this.__updateDisable(this.disabled);
  }

  get ctx() {
    return this._ctx;
  }

  set ctx(c) {
    this._ctx = c;

    this._forEachChildWidget((n) => {
      n.ctx = c;
    });
  }

  get _reportCtxName() {
    return "" + this._id;
  }

  static getIconEnum() {
    return Icons;
  }

  static setDefault(element) {
    return element;
  }

  /**DEPRECATED

   scaling ratio (e.g. for high-resolution displays)
   */
  static getDPI() {
    //if (dpistack.length > 0) {
    //  return dpistack[this.dpistack.length-1];
    //} else {
    //if (util.isMobile()) {
    return window.devicePixelRatio; // * visualViewport.scale;
    //}

    return window.devicePixelRatio;
    //}
  }

  static prefix(name) {
    return tagPrefix + name;
  }

  static internalRegister(cls) {
    registered_has_happened = true;

    internalElementNames[cls.define().tagname] = this.prefix(cls.define().tagname);
    customElements.define(this.prefix(cls.define().tagname), cls);
  }

  static createElement(name, internal = false) {
    if (!internal && name in externalElementNames) {
      return document.createElement(name);
    } else if (name in internalElementNames) {
      return document.createElement(internalElementNames[name]);
    } else {
      return document.createElement(name)
    }
  }

  static register(cls) {
    registered_has_happened = true;

    externalElementNames[cls.define().tagname] = cls.define().tagname;
    customElements.define(cls.define().tagname, cls);
  }

  /**
   * Defines core attributes of the class
   *
   * @example
   *
   * static define() {return {
   *   tagname : "custom-element-x",
   *   style : "[style class in theme]"
   *   subclassChecksTheme : boolean //set to true to disable base class invokation of subclassChecksTheme
   * }}
   */
  static define() {
    throw new Error("Missing define() for ux element");
  }

  hide(sethide = true) {
    this.hidden = sethide;

    for (let n of this.shadow.childNodes) {
      n.hidden = sethide;
    }

    this._forEachChildWidget((n) => {
      n.hide(sethide);
    })
  }

  getElementById(id) {
    let ret;

    let rec = (n) => {
      if (ret) {
        return;
      }

      if (n.getAttribute("id") === id || n.id === id) {
        ret = n;
      }

      if (n.constructor.name === "PanelFrame") {
        rec(n.contents);
      } else if (n.constructor.name === "TabContainer") {
        for (let k in n.tabs) {
          let tab = n.tabs[k];

          if (tab) {
            rec(tab);
          }
        }
      }

      for (let n2 of n.childNodes) {
        if (n2 instanceof HTMLElement) {
          rec(n2);

          if (ret) {
            break;
          }
        }
      }

      if (n.shadow) {
        for (let n2 of n.shadow.childNodes) {
          if (n2 instanceof HTMLElement) {
            rec(n2);

            if (ret) {
              break;
            }
          }
        }
      }
    }

    rec(this);

    return ret;
  }

  unhide() {
    this.hide(false);
  }

  findArea() {
    let p = this;

    while (p) {
      if (p instanceof Area) {
        return p;
      }

      p = p.parentWidget;
    }
  }

  addEventListener(type, cb, options) {
    if (cconst.DEBUG.domEventAddRemove) {
      console.log("addEventListener", type, this._id, options);
    }

    let cb2 = (e) => {
      if (cconst.DEBUG.paranoidEvents) {
        if (this.isDead()) {
          this.removeEventListener(type, cb, options);
          return;
        }
      }

      if (cconst.DEBUG.domEvents) {
        pathDebugEvent(e);
      }

      let area = this.findArea();

      if (area) {
        area.push_ctx_active();
        try {
          let ret = cb(e);
          area.pop_ctx_active();
          return ret;
        } catch (error) {
          area.pop_ctx_active();
          throw error;
        }
      } else {
        if (cconst.DEBUG.areaContextPushes) {
          console.warn("Element is not part of an area?", element);
        }

        return cb(e);
      }
    };

    cb._cb = cb2;

    if (cconst.DEBUG.paranoidEvents) {
      this.__cbs.push([type, cb2, options]);
    }


    return super.addEventListener(type, cb, options);
  }

  removeEventListener(type, cb, options) {
    if (cconst.DEBUG.paranoidEvents) {
      for (let item of this.__cbs) {
        if (item[0] == type && item[1] === cb._cb2 && ("" + item[2]) === ("" + options)) {
          this.__cbs.remove(item);
          break;
        }
      }
    }

    if (cconst.DEBUG.domEventAddRemove) {
      console.log("removeEventListener", type, this._id, options);
    }

    if (!cb._cb) {
      return super.removeEventListener(type, cb, options);
    } else {
      return super.removeEventListener(type, cb._cb, options);
    }
  }

  connectedCallback() {

  }

  noMarginsOrPadding() {
    let keys = ["margin", "padding", "margin-block-start", "margin-block-end"];
    keys = keys.concat(["padding-block-start", "padding-block-end"]);

    keys = keys.concat(["margin-left", "margin-top", "margin-bottom", "margin-right"]);
    keys = keys.concat(["padding-left", "padding-top", "padding-bottom", "padding-right"]);

    for (let k of keys) {
      this.style[k] = "0px";
    }

    return this;
  }

  /**
   * find owning screen and tell it to update
   * the global tab order
   * */
  regenTabOrder() {
    let screen = this.getScreen();
    if (screen !== undefined) {
      screen.needsTabRecalc = true;
    }

    return this;
  }

  noMargins() {
    this.style["margin"] = this.style["margin-left"] = this.style["margin-right"] = "0px";
    this.style["margin-top"] = this.style["margin-bottom"] = "0px";
    return this;
  }

  noPadding() {
    this.style["padding"] = this.style["padding-left"] = this.style["padding-right"] = "0px";
    this.style["padding-top"] = this.style["padding-bottom"] = "0px";
    return this;
  }

  getTotalRect() {
    let found = false;

    let min = new Vector2([1e17, 1e17]);
    let max = new Vector2([-1e17, -1e17]);

    let doaabb = (n) => {
      let rs = n.getClientRects();

      for (let r of rs) {
        min[0] = Math.min(min[0], r.x);
        min[1] = Math.min(min[1], r.y);
        max[0] = Math.max(max[0], r.x + r.width);
        max[1] = Math.max(max[1], r.y + r.height);

        found = true;
      }
    };

    doaabb(this);

    this._forEachChildWidget((n) => {
      doaabb(n);
    });

    if (found) {
      return {
        width : max[0] - min[0],
        height: max[1] - min[1],
        x     : min[0],
        y     : min[1],
        left  : min[0],
        top   : min[1],
        right : max[0],
        bottom: max[1]
      };
    } else {
      return undefined;
    }
  }

  parseNumber(value, args = {}) {
    value = ("" + value).trim().toLowerCase();

    let baseUnit = args.baseUnit || this.baseUnit;
    let isInt = args.isInt || this.isInt;

    let sign = 1.0;

    if (value.startsWith("-")) {
      value = value.slice(1, value.length).trim();
      sign = -1;
    }

    let hexre = /-?[0-9a-f]+h$/;

    if (value.startsWith("0b")) {
      value = value.slice(2, value.length).trim();
      value = parseInt(value, 2);
    } else if (value.startsWith("0x")) {
      value = value.slice(2, value.length).trim();
      value = parseInt(value, 16);
    } else if (value.search(hexre) === 0) {
      value = value.slice(0, value.length - 1).trim();
      value = parseInt(value, 16);
    } else {
      value = units.parseValue(value, baseUnit);
    }

    if (isInt) {
      value = ~~value;
    }

    return value*sign;
  }

  formatNumber(value, args = {}) {
    let baseUnit = args.baseUnit || this.baseUnit;
    let displayUnit = args.displayUnit || this.displayUnit;
    let isInt = args.isInt || this.isInt;
    let radix = args.radix || this.radix || 10;
    let decimalPlaces = args.decimalPlaces || this.decimalPlaces;

    //console.log(this.baseUnit, this.displayUnit);

    if (isInt && radix !== 10) {
      let ret = Math.floor(value).toString(radix);

      if (radix === 2)
        return "0b" + ret;
      else if (radix === 16)
        return ret + "h";
    }

    return units.buildString(value, baseUnit, decimalPlaces, displayUnit);
  }

  setCSS(setBG = true) {
    if (setBG) {
      let bg = this.getDefault("background-color");
      if (bg) {
        this.style["background-color"] = bg;
      }
    }

    let zoom = this.getZoom();
    this.style["transform"] = `scale(${zoom},${zoom})`;
  }

  traverse(type_or_set) {
    let this2 = this;

    let classes = type_or_set;

    let is_set = type_or_set instanceof Set;
    is_set = is_set || type_or_set instanceof util.set;
    is_set = is_set || Array.isArray(type_or_set);

    if (!is_set) {
      classes = [type_or_set];
    }

    let visit = new Set();

    return (function* () {
      let stack = [this2];

      while (stack.length > 0) {
        let n = stack.pop();

        visit.add(n);

        if (!n || !n.childNodes) {
          continue;
        }

        for (let cls of classes) {
          if (n instanceof cls) {
            yield n;
          }
        }

        for (let c of n.childNodes) {
          if (!visit.has(c)) {
            stack.push(c);
          }
        }

        if (n.shadow) {
          for (let c of n.shadow.childNodes) {
            if (!visit.has(c)) {
              stack.push(c);
            }
          }
        }
      }
    })();
  }

  appendChild(child) {
    if (child instanceof UIBase) {
      child.ctx = this.ctx;
      child.parentWidget = this;

      child.useDataPathUndo = this.useDataPathUndo;
    }

    return super.appendChild(child);
  }

  //delayed init
  init() {
    this._init_done = true;

    if (!this.hasAttribute("id") && this._id) {
      this.setAttribute("id", this._id);
    }
  }

  _ondestroy() {
    if (this.tabIndex >= 0) {
      this.regenTabOrder();
    }

    if (cconst.DEBUG.paranoidEvents) {
      for (let item of this.__cbs) {
        this.removeEventListener(item[0], item[1], item[2]);
      }

      this.__cbs = [];
    }


    if (this.ondestroy !== undefined) {
      this.ondestroy();
    }
  }

  remove(trigger_on_destroy = true) {
    if (this.tabIndex >= 0) {
      this.regenTabOrder();
    }

    super.remove();

    if (trigger_on_destroy) {
      this._ondestroy();
    }

    if (this.on_remove) {
      this.on_remove();
    }

    this.parentWidget = undefined;
  }

  /*
  *
  * called when elements are removed.
  * you should assume the element will be reused later;
  * on_destroy is the callback for when elements are permanently destroyed
  * */
  on_remove() {

  }

  removeChild(child, trigger_on_destroy = true) {
    super.removeChild(child);

    if (trigger_on_destroy) {
      child._ondestroy();
    }
  }

  flushUpdate() {
    //check init
    this._init();

    this.update();

    this._forEachChildWidget((c) => {
      c.flushUpdate();
    });
  }

  flushSetCSS() {
    //check init
    this._init();

    this.setCSS();

    this._forEachChildWidget((c) => {
      c.flushSetCSS();
    });
  }

  //used by container nodes
  /**
   * Iterates over all child widgets,
   * including ones that might be inside
   * of normal DOM nodes.
   *
   * This is done by recursing into the dom
   * tree and stopping at any node that's
   * descended from ui_base.UIBase
   **/
  _forEachChildWidget(cb, thisvar) {
    let rec = (n) => {
      if (n instanceof UIBase) {
        if (thisvar !== undefined) {
          cb.call(thisvar, n);
        } else {
          cb(n);
        }
      } else {
        for (let n2 of n.childNodes) {
          rec(n2);
        }

        if (n.shadow !== undefined) {
          for (let n2 of n.shadow.childNodes) {
            rec(n2);
          }
        }
      }
    };

    for (let n of this.childNodes) {
      rec(n);
    }

    if (this.shadow) {
      for (let n of this.shadow.childNodes) {
        rec(n);
      }
    }
  }

  _init() {
    if (this._init_done) {
      return;
    }

    this._init_done = true;
    this.init();
  }

  getWinWidth() {
    return window.innerWidth;
  }

  getWinHeight() {
    return window.innerHeight;
  }

  calcZ() {
    let p = this;
    let n = this;

    while (n) {
      if (n.style && n.style["z-index"]) {
        let z = parseFloat(n.style["z-index"]);
        return z;
      }

      n = n.parentNode;

      if (!n) {
        n = p = p.parentWidget;
      }
    }

    return 0;
  }

  pickElement(x, y, args = {}, marginy = 0, nodeclass = UIBase, excluded_classes = undefined) {
    let marginx;
    let clip;

    if (typeof args === "object") {
      marginx = args.sx || 0;
      marginy = args.sy || 0;
      nodeclass = args.nodeclass || UIBase;
      excluded_classes = args.excluded_classes;
      clip = args.clip;
    } else {
      marginx = args;

      args = {
        marginx         : marginx || 0,
        marginy         : marginy || 0,
        nodeclass       : nodeclass || UIBase,
        excluded_classes: excluded_classes,
        clip            : clip
      }
    }

    if (!clip) {
      clip = {
        pos : new Vector2([-10000, 10000]),
        size: new Vector2([20000, 10000])
      };
    }

    let ret = undefined;

    let retzindex = undefined;

    let testwidget = (n) => {
      if (n instanceof nodeclass) {
        let ok = true;
        ok = n.visibleToPick;
        ok = ok && !n.hidden;
        ok = ok && !(excluded_classes !== undefined && excluded_classes.indexOf(n.constructor) >= 0);

        return ok;
      }
    };

    let rec = (n, widget, widget_zindex, zindex, clip, depth = 0) => {
      if (n.style && n.style["z-index"]) {
        if (!(n instanceof UIBase) || n.visibleToPick) {
          zindex = parseInt(n.style["z-index"]);
        }
      }

      if (n.getClientRects && n.getClientRects().length > 0) {
        let rects = n.getClientRects();

        let rect = n.getBoundingClientRect();

        if (n.style && n.style["overflow"] === "hidden" || n.style["overflow"] === "scroll") {
          clip = math.aabb_intersect_2d(clip.pos, clip.size, [rect.x, rect.y], [rect.width, rect.height]);

          if (!clip) {
            return;
          }
        }

        if (testwidget(n)) {
          widget = n;
          widget_zindex = zindex;
        }

        let ok = true;

        if (n instanceof UIBase) {
          ok = ok && n.visibleToPick;
        }

        if (!ok) {
          return;
        }

        for (let rect of rects) {
          ok = true;

          let clip2 = math.aabb_intersect_2d(clip.pos, clip.size, [rect.x, rect.y], [rect.width, rect.height]);

          if (!clip2) {
            ok = false;
            continue;
          }

          ok = ok && !n.hidden;
          ok = ok && (retzindex === undefined || widget_zindex >= retzindex);
          ok = ok && (retzindex === undefined || zindex >= retzindex);

          ok = ok && x >= clip2.pos[0] - marginx && x <= clip2.pos[0] + clip2.size[0] + marginy;
          ok = ok && y >= clip2.pos[1] - marginy && y <= clip2.pos[1] + clip2.size[1] + marginx;

          if (n.visibleToPick !== undefined) {
            ok = ok && n.visibleToPick;
          }

          if (ok) {
            ret = widget;
            retzindex = zindex;
          }
        }
      }

      let isleaf = n.childNodes.length === 0;

      if (n.shadow !== undefined) {
        isleaf = isleaf && (n.shadow.childNodes.length === 0);
      }

      if (typeof n === "object" && n instanceof UIBase && !n.visibleToPick) {
        return;
      }

      if (!isleaf) {
        if (n.shadow !== undefined) {
          for (let i = 0; i < n.shadow.childNodes.length; i++) {
            let i2 = i;
            //i2 = n.shadow.childNodes.length - 1 - i;

            let n2 = n.shadow.childNodes[i2];
            if (n2.childNodes && n2.style) {
              rec(n2, widget, widget_zindex, zindex, clip, depth + 1);
            }
          }
        }
        for (let i = 0; i < n.childNodes.length; i++) {
          let i2 = i;
          //i2 = n.childNodes.length - 1 - i;

          let n2 = n.childNodes[i2];
          if (n2.childNodes && n2.style) {
            rec(n2, widget, widget_zindex, zindex, clip, depth + 1);
          }
        }
      }
    };

    let p = this;

    while (p && !p.style["z-index"] && p.style["z-index"] !== 0.0) {
      p = p.parentWidget;
    }
    let zindex = p !== undefined ? parseInt(p.style["z-index"]) : 0;

    rec(this, testwidget(this) ? this : undefined, zindex, zindex, clip, 0);

    return ret;
  }

  __updateDisable(val) {
    if (!!val === !!this.__disabledState) {
      return;
    }

    this.__disabledState = !!val;

    if (val && !this._disdata) {
      let style = this.getDefault("internalDisabled") || {
        "background-color": this.getDefault("DisabledBG")
      };

      this._disdata = {
        style   : {},
        defaults: {}
      };

      for (let k in style) {
        this._disdata.style[k] = this.style[k];
        this._disdata.defaults[k] = this.default_overrides[k];

        let v = style[k];

        if (typeof v === "object" && v instanceof CSSFont) {
          this.style[k] = style[k].genCSS();
          this.default_overrides[k] = style[k];
        } else {
          this.style[k] = style[k];
          this.default_overrides[k] = style[k];
        }
      }

      this.__disabledState = !!val;
      this.on_disabled();
    } else if (!val && this._disdata) {
      for (let k in this._disdata.style) {
        this.style[k] = this._disdata.style[k];
      }

      for (let k in this._disdata.defaults) {
        let v = this._disdata.defaults[k];

        if (v === undefined) {
          delete this.default_overrides[k];
        } else {
          this.default_overrides[k] = v;
        }
      }

      this.background = this.style["background-color"];
      this._disdata = undefined;

      this.__disabledState = !!val;
      this.on_enabled();
    }

    this.__disabledState = !!val;

    let visit = (n) => {
      if (n instanceof UIBase) {
        let changed = !!n.__disabledState;

        /*
        if (val) {
          n._parent_disabled_set = Math.max(n._parent_disabled_set + 1, 0);
        } else {
          n._parent_disabled_set = Math.max(n._parent_disabled_set - 1, 0);
        }//*/

        n.__updateDisable(n.disabled);

        changed = changed !== !!n.__disabledState;
        if (changed) {
          n.update();
          n.setCSS();
        }
      }
    };

    this._forEachChildWidget(visit);
  }

  on_disabled() {

  }

  on_enabled() {

  }

  pushModal(handlers = this, autoStopPropagation = true) {
    if (this._modaldata !== undefined) {
      console.warn("UIBase.prototype.pushModal called when already in modal mode");
      //pop modal stack just to be safe
      popModalLight(this._modaldata);
      this._modaldata = undefined;
    }

    this._modaldata = pushModalLight(handlers, autoStopPropagation);
    return this._modaldata;
  }

  popModal() {
    if (this._modaldata === undefined) {
      console.warn("Invalid call to UIBase.prototype.popModal");
      return;
    }

    popModalLight(this._modaldata);
    this._modaldata = undefined;
  }

  flash(color, rect_element = this, timems = 355) {
    //console.warn("flash internalDisabled due to bug");
    //return;

    if (typeof color != "object") {
      color = css2color(color);
    }
    color = new Vector4(color);
    let csscolor = color2css(color);

    if (this._flashtimer !== undefined && this._flashcolor !== csscolor) {
      window.setTimeout(() => {
        this.flash(color, rect_element, timems);
      }, 100);

      return;
    } else if (this._flashtimer !== undefined) {
      return;
    }

    //let rect = rect_element.getClientRects()[0];
    let rect = rect_element.getBoundingClientRect();

    if (rect === undefined) {
      return;
    }

    //okay, dom apparently calls onchange() on .remove, so we have
    //to put the timer code first to avoid loops
    let timer;
    let tick = 0;
    let max = ~~(timems/20);

    let x = rect.x, y = rect.y;

    let cb = (e) => {
      if (timer === undefined) {
        return
      }

      let a = 1.0 - tick/max;
      div.style["background-color"] = color2css(color, a*a*0.5);

      if (tick > max) {
        window.clearInterval(timer);

        this._flashtimer = undefined;
        this._flashcolor = undefined;
        timer = undefined;

        div.remove();
        this.focus();
      }

      tick++;
    };

    setTimeout(cb, 5);
    this._flashtimer = timer = window.setInterval(cb, 20);

    let div = document.createElement("div");

    div.style["pointer-events"] = "none";
    div.tabIndex = undefined;
    div.style["z-index"] = "900";
    div.style["display"] = "float";
    div.style["position"] = "absolute";
    div.style["margin"] = "0px";
    div.style["left"] = x + "px";
    div.style["top"] = y + "px";

    div.style["background-color"] = color2css(color, 0.5);
    div.style["width"] = rect.width + "px";
    div.style["height"] = rect.height + "px";
    div.setAttribute("class", "UIBaseFlash");

    let screen = this.getScreen();
    if (screen !== undefined) {
      screen._enterPopupSafe();
    }

    document.body.appendChild(div);
    this.focus();
    this._flashcolor = csscolor;

    if (screen !== undefined) {
      screen._exitPopupSafe();
    }
  }

  destory() {
  }

  on_resize(newsize) {
  }

  toJSON() {
    let ret = {};

    if (this.hasAttribute("datapath")) {
      ret.datapath = this.getAttribute("datapath");
    }

    return ret;
  }

  loadJSON(obj) {
    if (!this._init_done) {
      this._init();
    }
  }

  getPathValue(ctx, path) {
    try {
      return ctx.api.getValue(ctx, path);
    } catch (error) {
      //report("data path error in ui for" + path);
      return undefined;
    }
  }

  undoBreakPoint() {
    this.pathUndoGen++;
  }

  setPathValueUndo(ctx, path, val) {
    let mass_set_path = this.getAttribute("mass_set_path");
    let rdef = ctx.api.resolvePath(ctx, path);
    let prop = rdef.prop;

    if (ctx.api.getValue(ctx, path) === val) {
      return;
    }

    let toolstack = this.ctx.toolstack;
    let head = toolstack.head;

    let bad = head === undefined || !(head instanceof getDataPathToolOp());
    bad = bad || head.hashThis() !== head.hash(mass_set_path, path, prop.type, this._id);
    bad = bad || this.pathUndoGen !== this._lastPathUndoGen;

    //if (head !== undefined && head instanceof getDataPathToolOp()) {
    //console.log("===>", bad, head.hashThis());
    //console.log("    ->", head.hash(mass_set_path, path, prop.type, this._id));
    //}

    if (!bad) {
      toolstack.undo();
      head.setValue(ctx, val, rdef.obj);
      toolstack.redo();
    } else {
      this._lastPathUndoGen = this.pathUndoGen;

      let toolop = getDataPathToolOp().create(ctx, path, val, this._id, mass_set_path);
      ctx.toolstack.execTool(this.ctx, toolop);
    }
  }

  /*
    adds a method call to the event queue,
    but only if that method (for this instance, as differentiated
    by ._id) isn't there already.

    also, method won't be ran until this.ctx exists
  */

  pushReportContext(key) {
    if (this.ctx.api.pushReportContext) {
      this.ctx.api.pushReportContext(key);
    }
  }

  popReportContext() {
    if (this.ctx.api.popReportContext)
      this.ctx.api.popReportContext();
  }

  setPathValue(ctx, path, val) {
    if (this.useDataPathUndo) {
      this.pushReportContext(this._reportCtxName);

      try {
        this.setPathValueUndo(ctx, path, val);
      } catch (error) {
        this.popReportContext();

        if (!(error instanceof DataPathError)) {
          throw error;
        } else {
          return;
        }
      }

      this.popReportContext();
      return;
    }

    this.pushReportContext(this._reportCtxName);

    try {
      if (this.hasAttribute("mass_set_path")) {
        ctx.api.massSetProp(ctx, this.getAttribute("mass_set_path"), val);
        ctx.api.setValue(ctx, path, val);
      } else {
        ctx.api.setValue(ctx, path, val);
      }
    } catch (error) {
      this.popReportContext();

      if (!(error instanceof DataPathError)) {
        throw error;
      }

      return;
    }

    this.popReportContext();
  }

  getPathMeta(ctx, path) {
    this.pushReportContext(this._reportCtxName);
    let ret = ctx.api.resolvePath(ctx, path);
    this.popReportContext();

    return ret !== undefined ? ret.prop : undefined;
  }

  getPathDescription(ctx, path) {
    let ret;
    this.pushReportContext(this._reportCtxName);

    try {
      ret = ctx.api.getDescription(ctx, path);
    } catch (error) {
      this.popReportContext();

      if (error instanceof DataPathError) {
        //console.warn("Invalid data path '" + path + "'");
        return undefined;
      } else {
        throw error;
      }
    }

    this.popReportContext();
    return ret;
  }

  getScreen() {
    if (this.ctx !== undefined)
      return this.ctx.screen;
  }

  isDead() {
    return !this.isConnected;
    let p = this, lastp = this;

    function find(c, n) {
      for (let n2 of c) {
        if (n2 === n) {
          return true;
        }
      }
    }

    while (p) {
      lastp = p;

      let parent = p.parentWidget;
      if (!parent) {
        parent = p.parentElement ? p.parentElement : p.parentNode;
      }

      if (parent && p && !find(parent.childNodes, p)) {
        if (parent.shadow !== undefined && !find(parent.shadow.childNodes)) {
          return true;
        }
      }
      p = parent;

      if (p === document.body) {
        return false;
      }
    }

    return true;
  }

  doOnce(func, timeout = undefined) {
    if (func._doOnce === undefined) {
      func._doOnce_reqs = new Set();

      func._doOnce = function (thisvar, trace) {
        if (func._doOnce_reqs.has(thisvar._id)) {
          return;
        }

        func._doOnce_reqs.add(thisvar._id);

        function f() {
          if (thisvar.isDead()) {
            func._doOnce_reqs.delete(thisvar._id);

            if (func === thisvar._init || !cconst.DEBUG.doOnce) {
              return;
            }

            console.warn("Ignoring doOnce call for dead element", thisvar._id, func, trace);
            return;
          }

          if (!thisvar.ctx) {
            if (cconst.DEBUG.doOnce) {
              console.warn("doOnce call is waiting for context...", thisvar._id, func);
            }

            window.setTimeout(f, 0);
            return;
          }

          func._doOnce_reqs.delete(thisvar._id);
          func.call(thisvar);
        };

        window.setTimeout(f, timeout);
      }
    }

    let trace = new Error().stack;
    func._doOnce(this, trace);
  }

  float(x = 0, y = 0, zindex = undefined) {
    this.style.position = "absolute";

    this.style.left = x + "px";
    this.style.top = y + "px";

    if (zindex !== undefined) {
      this.style["z-index"] = zindex
    }

    return this;
  }

  _ensureChildrenCtx() {
    let ctx = this.ctx;
    if (ctx === undefined) {
      return;
    }

    this._forEachChildWidget((n) => {
      n.parentWidget = this;

      if (n.ctx === undefined) {
        n.ctx = ctx;
      }

      n._ensureChildrenCtx(ctx);
    });
  }

  checkThemeUpdate() {
    if (!cconst.enableThemeAutoUpdate) {
      return false;
    }

    if (_themeUpdateKey !== this._last_theme_update_key) {
      this._last_theme_update_key = _themeUpdateKey;
      return true;
    }

    return false;
  }

  //called regularly
  update() {
    if (this.ctx && this._description === undefined && this.getAttribute("datapath")) {
      let d = this.getPathDescription(this.ctx, this.getAttribute("datapath"));

      this.description = d;
    }

    if (!this._init_done) {
      this._init();
    }

    if (this._init_done && !this.constructor.define().subclassChecksTheme) {
      if (this.checkThemeUpdate()) {
        this.setCSS();
      }
    }
  }

  onadd() {
    //if (this.parentWidget !== undefined) {
    //  this._useDataPathUndo = this.parentWidget._useDataPathUndo;
    //}

    if (!this._init_done) {
      this.doOnce(this._init);
    }

    if (this.tabIndex >= 0) {
      this.regenTabOrder();
    }
  }

  getZoom() {
    if (this.parentWidget !== undefined) {
      return this.parentWidget.getZoom();
    }

    return 1.0;
  }

  /**try to use this method

   scaling ratio (e.g. for high-resolution displays)
   for zoom ratio use getZoom()
   */
  getDPI() {
    if (this.parentWidget !== undefined) {
      return this.parentWidget.getDPI();
    }

    return UIBase.getDPI();
  }

  /**
   * for saving ui state.
   * see saveUIData() export
   *
   * should fail gracefully.
   */
  saveData() {
    return {};
  }

  /**
   * for saving ui state.
   * see saveUIData() export
   *
   * should fail gracefully.
   *
   * also, it doesn't rebuild the object graph,
   * it patches it; for true serialization use
   * the toJSON/loadJSON or STRUCT interfaces.
   */
  loadData(obj) {
    return this;
  }

  overrideDefault(key, val, localOnly = false) {
    this.my_default_overrides[key] = val;

    if (!localOnly) {
      this.default_overrides[key] = val;
    }
  }

  overrideClass(style) {
    this._override_class = style;
  }

  overrideClassDefault(style, key, val) {
    if (!(style in this.class_default_overrides)) {
      this.class_default_overrides[style] = {};
    }

    this.class_default_overrides[style][key] = val;
  }

  _doMobileDefault(key, val) {
    if (!util.isMobile())
      return val;

    key = key.toLowerCase();
    let ok = false;

    for (let re of _mobile_theme_patterns) {
      if (key.search(re) >= 0) {
        ok = true;
        break;
      }
    }

    if (ok) {
      val *= theme.base.mobileSizeMultiplier;
    }

    return val;
  }

  hasDefault(key) {
    let p = this;

    while (p) {
      if (key in p.default_overrides) {
        return true;
      }

      p = p.parentWidget;
    }

    return this.hasClassDefault(key);
  }

  /** get a sub style from a theme style class.
   *  note that if key is falsy then it just forwards to this.getDefault directly*/
  getSubDefault(key, subkey, backupkey=subkey, defaultval=undefined) {
    if (!key) {
      return this.getDefault(subkey, undefined, defaultval);
    }

    let style = this.getDefault(key);

    if (!style || typeof style !== "object" || !(subkey in style)) {
      if (defaultval !== undefined) {
        return defaultval;
      } else if (backupkey !== undefined) {
        return this.getDefault(backupkey);
      }
    } else {
      return style[subkey];
    }
  }

  getDefault(key, checkForMobile = true, defaultval = undefined) {
    let ret = this.getDefault_intern(key, checkForMobile, defaultval);

    //convert pixel units straight to numbers
    if (typeof ret === "string" && ret.trim().toLowerCase().endsWith("px")) {
      let s = ret.trim().toLowerCase();
      s = s.slice(0, s.length - 2).trim();

      let f = parseFloat(s);
      if (!isNaN(f) && isFinite(f)) {
        return f;
      }
    }

    return ret;
  }

  getDefault_intern(key, checkForMobile = true, defaultval = undefined) {
    if (this.my_default_overrides[key] !== undefined) {
      let v = this.my_default_overrides[key];
      return checkForMobile ? this._doMobileDefault(key, v) : v;
    }

    let p = this;
    while (p) {
      if (p.default_overrides[key] !== undefined) {
        let v = p.default_overrides[key];
        checkForMobile ? this._doMobileDefault(key, v) : v;
      }

      p = p.parentWidget;
    }

    return this.getClassDefault(key, checkForMobile, defaultval);
  }

  getStyleClass() {
    if (this._override_class !== undefined) {
      return this._override_class;
    }

    let p = this.constructor, lastp = undefined;

    while (p && p !== lastp && p !== UIBase && p !== Object) {
      let def = p.define();

      if (def.style) {
        return def.style;
      }

      if (!p.prototype || !p.prototype.__proto__)
        break;

      p = p.prototype.__proto__.constructor;
    }

    return "base";
  }

  hasClassDefault(key) {
    let style = this.getStyleClass();

    let p = this;
    while (p) {
      let def = p.class_default_overrides[style];

      if (def && (key in def)) {
        return true;
      }

      p = p.parentWidget;
    }

    if (style in theme && key in theme[style]) {
      return true;
    }

    return key in theme.base;
  }

  getClassDefault(key, checkForMobile = true, defaultval = undefined) {
    let style = this.getStyleClass();

    let val = undefined;
    let p = this;
    while (p) {
      let def = p.class_default_overrides[style];

      if (def && (key in def)) {
        val = def[key];
        break;
      }

      p = p.parentWidget;
    }

    if (val === undefined && style in theme && !(key in theme[style]) && !(key in theme.base)) {
      if (window.DEBUG.theme) {
        report("Missing theme key ", key, "for", style);
      }
    }

    if (val === undefined && style in theme && key in theme[style]) {
      val = theme[style][key];
    } else if (defaultval !== undefined) {
      val = defaultval;
    } else if (val === undefined) {
      let def = this.constructor.define();
      if (def.parentStyle && key in theme[def.parentStyle]) {
        val = theme[def.parentStyle][key];
      } else {
        val = theme.base[key];
      }
    }

    return checkForMobile ? this._doMobileDefault(key, val) : val;
  }

  getStyle() {
    console.warn("deprecated call to UIBase.getStyle");
    return this.getStyleClass();
  }

  /** returns a new Animator instance */
  animate(_extra_handlers = {}) {
    let transform = new DOMMatrix(this.style["transform"]);

    let update_trans = () => {
      let t = transform;
      let css = "matrix(" + t.a + "," + t.b + "," + t.c + "," + t.d + "," + t.e + "," + t.f + ")";
      this.style["transform"] = css;
    }

    let handlers = {
      background_get() {
        return css2color(this.background);
      },

      background_set(c) {
        if (typeof c !== "string") {
          c = color2css(c);
        }
        this.background = c;
      },

      dx_get() {
        return transform.m41;
      },
      dx_set(x) {
        transform.m41 = x;
        update_trans();
      },

      dy_get() {
        return transform.m42;
      },
      dy_set(x) {
        transform.m42 = x;
        update_trans();
      }
    }

    handlers = Object.assign(handlers, _extra_handlers);

    let handler = {
      get: (target, key, receiver) => {
        if ((key + "_get") in handlers) {
          return handlers[key + "_get"].call(target);
        } else {
          return target[key];
        }
      },
      set: (target, key, val, receiver) => {
        if ((key + "_set") in handlers) {
          handlers[key + "_set"].call(target, val);
        } else {
          target[key] = val;
        }

        return true;
      }
    }

    let proxy = new Proxy(this, handler);
    let anim = new Animator(proxy);

    anim.onend = () => {
      this._active_animations.remove(anim);
    }

    this._active_animations.push(anim);
    return anim;
  }

  abortAnimations() {
    for (let anim of util.list(this._active_animations)) {
      anim.end();
    }

    this._active_animations = [];
  }
}

export function drawRoundBox2(elem, options = {}) {
  drawRoundBox(elem, options.canvas, options.g, options.width, options.height, options.r, options.op, options.color, options.margin, options.no_clear);
}

/**okay, I need to refactor this function,
 it needs to take x, y as well as width, height,
 and be usable for more use cases.*/
export function drawRoundBox(elem, canvas, g, width, height, r      = undefined,
                             op = "fill", color = undefined, margin = undefined,
                             no_clear = false) {
  width = width === undefined ? canvas.width : width;
  height = height === undefined ? canvas.height : height;
  g.save();

  let dpi = elem.getDPI();

  r = r === undefined ? elem.getDefault("border-radius") : r;

  if (margin === undefined) {
    margin = 1;
  }

  r *= dpi;
  let r1 = r, r2 = r;

  if (r > (height - margin*2)*0.5) {
    r1 = (height - margin*2)*0.5;
  }

  if (r > (width - margin*2)*0.5) {
    r2 = (width - margin*2)*0.5;
  }

  let bg = color;

  if (bg === undefined && canvas._background !== undefined) {
    bg = canvas._background;
  } else if (bg === undefined) {
    bg = elem.getDefault("background-color");
  }

  if (op === "fill" && !no_clear) {
    g.clearRect(0, 0, width, height);
  }

  g.fillStyle = bg;
  //hackish!
  g.strokeStyle = color === undefined ? elem.getDefault("border-color") : color;

  let w = width, h = height;

  let th = Math.PI/4;
  let th2 = Math.PI*0.75;

  g.beginPath();

  g.moveTo(margin, margin + r1);
  g.lineTo(margin, h - r1 - margin);

  g.quadraticCurveTo(margin, h - margin, margin + r2, h - margin);
  g.lineTo(w - margin - r2, h - margin);

  g.quadraticCurveTo(w - margin, h - margin, w - margin, h - margin - r1);
  g.lineTo(w - margin, margin + r1);

  g.quadraticCurveTo(w - margin, margin, w - margin - r2, margin);
  g.lineTo(margin + r2, margin);

  g.quadraticCurveTo(margin, margin, margin, margin + r1);
  g.closePath();

  if (op === "clip") {
    g.clip();
  } else if (op === "fill") {
    g.fill();
  } else {
    g.stroke();
  }

  g.restore();
};

export function _getFont_new(elem, size, font = "DefaultText", do_dpi = true) {

  font = elem.getDefault(font);

  return font.genCSS(size);
}

export function getFont(elem, size, font = "DefaultText", do_dpi = true) {
  return _getFont_new(elem, size, font = "DefaultText", do_dpi = true);
}

//size is optional, defaults to font's default size
export function _getFont(elem, size, font = "DefaultText", do_dpi = true) {
  let dpi = elem.getDPI();

  let font2 = elem.getDefault(font);
  if (font2 !== undefined) {
    //console.warn("New style font detected", font2, font2.genCSS(size));
    return _getFont_new(elem, size, font, do_dpi);
  }

  throw new Error("unknown font " + font);
}

export function _ensureFont(elem, canvas, g, size) {
  if (canvas.font) {
    g.font = canvas.font;
  } else {
    let font = elem.getDefault("DefaultText");
    g.font = font.genCSS(size);
  }
}

let _mc;

function get_measure_canvas() {
  if (_mc !== undefined) {
    return _mc;
  }

  _mc = document.createElement("canvas");
  _mc.width = 256;
  _mc.height = 256;
  _mc.g = _mc.getContext("2d");

  return _mc;
}

export function measureTextBlock(elem, text, canvas                    = undefined,
                                 g = undefined, size = undefined, font = undefined) {
  let lines = text.split("\n");

  let ret = {
    width : 0,
    height: 0
  };

  if (size === undefined) {
    if (font !== undefined && typeof font === "object") {
      size = font.size;
    }

    if (size === undefined) {
      size = elem.getDefault("DefaultText").size;
    }
  }

  for (let line of lines) {
    let m = measureText(elem, line, canvas, g, size, font);

    ret.width = Math.max(ret.width, m.width);
    let h = m.height !== undefined ? m.height : size*1.25;

    ret.height += h;
  }

  return ret;
}

export function measureText(elem, text, canvas                    = undefined,
                            g = undefined, size = undefined, font = undefined) {
  if (typeof canvas === "object" && canvas !== null && !(canvas instanceof HTMLCanvasElement) && canvas.tagName !== "CANVAS") {
    let args = canvas;

    canvas = args.canvas;
    g = args.g;
    size = args.size;
    font = args.font;

  }

  if (g === undefined) {
    canvas = get_measure_canvas();
    g = canvas.g;
  }

  if (font !== undefined) {
    if (typeof font === "object" && font instanceof CSSFont) {
      font = font.genCSS(size);
    }

    g.font = font;
  } else {
    _ensureFont(elem, canvas, g, size);
  }

  let ret = g.measureText(text);

  if (ret && util.isMobile()) {
    let ret2 = {};
    let dpi = UIBase.getDPI();

    for (let k in ret) {
      let v = ret[k];

      if (typeof v === "number") {
        v *= dpi;
        //v *= window.devicePixelRatio;
      }

      ret2[k] = v;
    }

    ret = ret2;
  }

  if (size !== undefined) {
    //clear custom font for next time
    g.font = undefined;
  }

  return ret;
}

//export function drawText(elem, x, y, text, canvas, g, color=undefined, size=undefined, font=undefined) {
export function drawText(elem, x, y, text, args = {}) {
  let canvas = args.canvas, g = args.g, color = args.color, font = args.font;
  let size = args.size;

  if (size === undefined) {
    if (font !== undefined && font instanceof CSSFont) {
      size = font.size;
    } else {
      size = elem.getDefault("DefaultText").size;
    }
  }

  size *= UIBase.getDPI();

  if (color === undefined) {
    if (font && font.color) {
      color = font.color;
    } else {
      color = elem.getDefault("DefaultText").color;
    }
  }

  if (font === undefined) {
    _ensureFont(elem, canvas, g, size);
  } else if (typeof font === "object" && font instanceof CSSFont) {
    g.font = font = font.genCSS(size);
  } else if (font) {
    g.font = font;
  }

  if (typeof color === "object") {
    color = color2css(color);
  }


  g.fillStyle = color;
  g.fillText(text, x + 0.5, y + 0.5);

  if (size !== undefined) {
    //clear custom font for next time
    g.font = undefined;
  }
}

let PIDX = 0, PSHADOW = 1, PTOT = 2;

/**

 Saves UI layout data, like panel layouts, active tabs, etc.
 Uses the UIBase.prototype.[save/load]Data interface.

 Note that this is error-tolerant.
 */
export function saveUIData(node, key) {
  if (key === undefined) {
    throw new Error("ui_base.saveUIData(): key cannot be undefined");
  }

  let paths = [];

  let rec = (n, path, ni, is_shadow) => {
    path = path.slice(0, path.length); //copy path

    let pi = path.length;
    for (let i = 0; i < PTOT; i++) {
      path.push(undefined);
    }

    path[pi] = ni;
    path[pi + 1] = is_shadow ? 1 : 0;

    if (n instanceof UIBase) {
      let path2 = path.slice(0, path.length);
      let data = n.saveData();

      let bad = !data;
      bad = bad || (typeof data === "object" && Object.keys(data).length === 0);

      if (!bad) {
        path2.push(data);

        if (path2[pi + 2]) {
          paths.push(path2);
        }
      }
    }

    for (let i = 0; i < n.childNodes.length; i++) {
      let n2 = n.childNodes[i];

      rec(n2, path, i, false);
    }

    let shadow = n.shadow;

    if (!shadow)
      return;

    for (let i = 0; i < shadow.childNodes.length; i++) {
      let n2 = shadow.childNodes[i];

      rec(n2, path, i, true);
    }
  }

  rec(node, [], 0, false);

  return JSON.stringify({
    key        : key,
    paths      : paths,
    _ui_version: 1
  });
}

window._saveUIData = saveUIData;

export function loadUIData(node, buf) {
  if (buf === undefined || buf === null) {
    return;
  }

  let obj = JSON.parse(buf);
  let key = buf.key;

  for (let path of obj.paths) {
    let n = node;

    let data = path[path.length - 1];
    path = path.slice(2, path.length - 1); //in case some api doesn't want me calling .pop()

    for (let pi = 0; pi < path.length; pi += PTOT) {
      let ni = path[pi], shadow = path[pi + 1];

      let list;

      if (shadow) {
        list = n.shadow;

        if (list) {
          list = list.childNodes;
        }
      } else {
        list = n.childNodes;
      }

      if (list === undefined || list[ni] === undefined) {
        //console.log("failed to load a ui data block", path);
        n = undefined;
        break;
      }

      n = list[ni];
    }

    if (n !== undefined && n instanceof UIBase) {
      n._init(); //ensure init's been called, _init will check if it has
      n.loadData(data);

      //console.log(n, path, data);
    }
  }
}

window._loadUIData = loadUIData;

//avoid explicit circular references
aspect._setUIBase(UIBase);
//ui_save.setUIBase(UIBase);
