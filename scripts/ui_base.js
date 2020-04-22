let _ui_base = undefined;

import * as util from './util.js';
import * as vectormath from './vectormath.js';
import * as toolprop from './toolprop.js';
import * as controller from './controller.js';
import {pushModalLight, popModalLight, copyEvent} from './simple_events.js';

let Vector4 = vectormath.Vector4;

export let Icons = {};

/*
Icons are defined in spritesheets that live in 
the iconsheet16/32 dom nodes.  Icons are numbered start from
the upper left sprite tile.

This function sets the mapping between icon numbers and names.

The following icons should be in the icon sheet and in this map:

RESIZE      :
SMALL_PLUS  :
TRANSLATE   : for moving things
UI_EXPAND   : panel open icon
UI_COLLAPSE : panel close icon
NOTE_EXCL   : exclamation mark for notifications
*/
export function setIconMap(icons) {
  for (let k in icons) {
    Icons[k] = icons[k];
  }
}

export function color2css(c, alpha_override) {
  let r = ~~(c[0]*255);
  let g = ~~(c[1]*255);
  let b = ~~(c[2]*255);
  let a = c.length < 4 ? 1.0 : c[3];
  
  a = alpha_override !== undefined ? alpha_override : a;
  
  if (c.length == 3 && alpha_override === undefined) {
    return `rgb(${r},${g},${b})`;
  } else {
    return `rgba(${r},${g},${b}, ${a})`;
  }
}
window.color2css = color2css;

let css2color_rets = util.cachering.fromConstructor(Vector4, 64);
let cmap = {
  red : [1, 0, 0, 1],
  green : [0, 1, 0, 1],
  blue : [0, 0, 1, 1],
  yellow : [1, 1, 0, 1],
  white : [1, 1, 1, 1],
  black : [0, 0, 0, 1],
  grey : [0.7, 0.7, 0.7, 1],
  teal : [0, 1, 1, 1],
  orange : [1,0.55,0.25,1],
  brown  : [0.7, 0.4, 0.3, 1]
};

export function css2color(color) {
  let ret = css2color_rets.next();
  
  if (color in cmap) {
    return ret.load(cmap[color]);
  }
  
  color = color.replace("rgba", "").replace("rgb", "").replace(/[\(\)]/g, "").trim().split(",")
  
  for (let i=0; i<color.length; i++) {
    ret[i] = parseFloat(color[i]);
    if (i < 3) {
      ret[i] /= 255;
    }
  }
  
  return ret;
}

window.css2color = css2color

export const EnumProperty = toolprop.EnumProperty;

export const ErrorColors = {
  WARNING : "yellow",
  ERROR : "red",
  OK : "green"
};

export class CSSFont {
  constructor(args) {
    this.size = args.size;
    this.font = args.font;
    this.style = args.style !== undefined ? args.style : "normal";
    this.weight = args.weight !== undefined ? args.weight : "normal";
    this.variant = args.variant !== undefined ? args.variant : "normal";
    this.color = args.color;
  }

  copyTo(b) {
    b.size = this.size;
    b.font = this.font;
    b.style = this.style;
    b.color = this.color;
  }

  copy() {
    return new CSSFont(this);
  }

  genCSS(size=this.size) {
    return `${this.style} ${this.variant} ${this.weight} ${size}px ${this.font}`;
  }
}

export const theme = {
  base : {
    //used for by icon strips and the like
    "oneAxisPadding" : 6,
    "oneAxisMargin" : 6,

    "ScreenBorderOuter" : "rgba(255, 255, 255, 1.0)",
    "ScreenBorderInner" : "rgba(170, 170, 170, 1.0)",

    "numslider_width" : 24,
    "numslider_height" : 24,

    "defaultWidth" : 32,
    "defaultHeight" : 32,

    "NoteBG" : "rgba(220, 220, 220, 0.0)",
    "NoteText" : new CSSFont({
      font  : "sans-serif",
      size  : 12,
      color :  "rgba(135, 135, 135, 1.0)",
      weight : "bold"
    }),

    "TabStrokeStyle1" : "rgba(200, 200, 200, 1.0)",
    "TabStrokeStyle2" : "rgba(225, 225, 225, 1.0)",
    "TabInactive" : "rgba(150, 150, 150, 1.0)",
    "TabHighlight" : "rgba(50, 50, 50, 0.2)",

    "DefaultPanelBG" : "rgba(155, 155, 155, 1.0)",
    "InnerPanelBG" : "rgba(140, 140, 140, 1.0)",

    "BoxRadius" : 12,
    "BoxMargin" : 4,
    "BoxDrawMargin" : 2, //how much to shrink rects drawn by drawRoundBox
    "BoxHighlight" : "rgba(155, 220, 255, 1.0)",
    "BoxDepressed" : "rgba(130, 130, 130, 1.0)",
    "BoxBG" : "rgba(170, 170, 170, 1.0)",
    "DisabledBG" : "rgba(110, 110, 110, 1.0)",
    "BoxSubBG" : "rgba(175, 175, 175, 1.0)",
    "BoxSub2BG" : "rgba(125, 125, 125, 1.0)", //for panels
    "BoxBorder" : "rgba(255, 255, 255, 1.0)",
    "MenuBG" : "rgba(250, 250, 250, 1.0)",
    "MenuHighlight" : "rgba(155, 220, 255, 1.0)",
    "AreaHeaderBG" : "rgba(170, 170, 170, 1.0)",

    //fonts
    "DefaultText" : new CSSFont({
      font  : "sans-serif",
      size  : 14,
      color :  "rgba(35, 35, 35, 1.0)",
      weight : "bold"
    }),

    "TabText" : new CSSFont({
      size     : 18,
      color    : "rgba(35, 35, 35, 1.0)",
      font     : "sans-serif",
      //weight   : "bold"
    }),

    "LabelText" : new CSSFont({
      size     : 13,
      color    : "rgba(75, 75, 75, 1.0)",
      font     : "sans-serif",
      weight   : "bold"
    }),

    "HotkeyText" : new CSSFont({
      size     : 12,
      color    : "rgba(130, 130, 130, 1.0)",
      font     : "courier"
      //weight   : "bold"
    }),

    "MenuText" : new CSSFont({
      size     : 12,
      color    : "rgba(25, 25, 25, 1.0)",
      font     : "sans-serif"
      //weight   : "bold"
    }),

    "TitleText" : new CSSFont({
      size     : 16,
      color    : "rgba(55, 55, 55, 1.0)",
      font     : "sans-serif",
      weight   : "bold"
    }),
  },

  button : {
    "defaultWidth" : 100,
    "defaultHeight" : 24
  },
  iconcheck : {

  },

  iconbutton : {

  },

  numslider : {
    "defaultWidth" : 100,
    "defaultHeight" : 29
  },

  colorfield : {
    fieldsize : 32,
    defaultWidth : 200,
    defaultHeight : 200,
    hueheight : 24,
    colorBoxHeight : 24,
    circleSize : 4,
    DefaultPanelBG : "rgba(170, 170, 170, 1.0)"
  },

  listbox : {
    DefaultPanelBG : "rgba(230, 230, 230, 1.0)",
    ListHighlight : "rgba(155, 220, 255, 0.5)",
    ListActive : "rgba(200, 205, 215, 1.0)",
    width : 110,
    height : 200
  },

  dopesheet : {
    treeWidth : 100,
    treeHeight : 600
  },

  colorpickerbutton : {
    defaultWidth  : 100,
    defaultHeight : 25,
    defaultFont   : "LabelText"
  }
};


export function setTheme(theme2) {
  //merge theme
  for (let k in theme2) {
    let v = theme2[k];

    if (!(k in theme)) {
      theme[k] = {};
    }

    for (let k2 in v) {
      theme[k][k2] = v[k2];
    }
  }
}

let _last_report = util.time_ms();
export function report(msg) {
  if (util.time_ms() - _last_report > 350) {
    console.warn(msg);
    _last_report = util.time_ms();
  }
}

//this function is deprecated
export function getDefault(key, elem) {
  console.warn("Deprecated call to ui_base.js:getDefault");

  if (key in theme.base) {
    return theme.base[key];
  } else {
    throw new Error("Unknown default", key);
  }
}

//XXX remember to set this properly
export function IsMobile() {
  return false;
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
  
  canvasDraw(elem, canvas, g, icon, x=0, y=0) {
    let tx = icon % this.tilex;
    let ty = ~~(icon / this.tilex);

    let dpi = elem.getDPI();
    let ts = this.tilesize;
    let ds = this.drawsize;

    g.drawImage(this.image, tx*ts, ty*ts, ts, ts, x, y, ds*dpi, ds*dpi);
  }

  setCSS(icon, dom) {
    dom.style["background"] = this.getCSS(icon);
    dom.style["background-size"] = (this.drawsize*this.tilex) + "px";

    if (!dom.style["width"]) {
      dom.style["width"] = this.drawsize + "px";
    }
    if (!dom.style["height"]) {
      dom.style["height"] = this.drawsize + "px";
    }
  }

  //icon is an integer
  getCSS(icon) {
    if (icon == -1) { //-1 means no icon
      return '';
    }
    
    let ratio = this.drawsize / this.tilesize;

    let x = (-(icon % this.tilex) * this.tilesize) * ratio;
    let y = (-(~~(icon / this.tilex)) * this.tilesize) * ratio;

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
    
    for (let i=0; i<images.length; i++) {
      let size, drawsize;

      if (typeof sizes[i] == "object") {
        size = sizes[i][0], drawsize = sizes[i][1];
      } else {
        size = drawsize = sizes[i];
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

  add(image, size, drawsize=size) {
    this.iconsheets.push(new _IconManager(image, size, this.tilex, drawsize));
    return this;
  }

  canvasDraw(elem, canvas, g, icon, x=0, y=0, sheet=0) {
    let base = this.iconsheets[sheet];
    
    sheet = this.findSheet(sheet);
    let ds = sheet.drawsize;

    sheet.drawsize = base.drawsize;
    sheet.canvasDraw(elem, canvas, g, icon, x, y);
    sheet.drawsize = ds;
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

  getTileSize(sheet=0) {
    return this.iconsheets[sheet].drawsize;
    return this.findSheet(sheet).drawsize;
  }

  getRealSize(sheet=0) {
    return this.iconsheets[sheet].tilesize;
    return this.findSheet(sheet).tilesize;
    //return this.iconsheets[sheet].tilesize;
  }
  
  //icon is an integer
  getCSS(icon, sheet=0) {
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

  setCSS(icon, dom, sheet=0) {
    //return this.iconsheets[sheet].setCSS(icon, dom);
    
    let base = this.iconsheets[sheet];
    sheet = this.findSheet(sheet);
    let ds = sheet.drawsize;
    
    sheet.drawsize = base.drawsize;
    let ret = sheet.setCSS(icon, dom);
    sheet.drawsize = ds;

    return ret;
  }
}

export let iconmanager = new IconManager([
  document.getElementById("iconsheet16"),
  document.getElementById("iconsheet"),
  document.getElementById("iconsheet")
], [16, 32, 64], 16);

window._iconmanager = iconmanager; //debug global

//if client code overrides iconsheets, they must follow logical convention
//that the first one is "small" and the second is "large"
export let IconSheets = {
  SMALL  : 0,
  LARGE  : 1,
  XLARGE : 2
};

export function setIconManager(manager, IconSheetsOverride) {
  iconmanager.load(manager);

  if (IconSheetsOverride !== undefined) {
    for (let k in IconSheetsOverride) {
      IconSheets[k] = IconSheetsOverride[k];
    }
  }
}

export function makeIconDiv(icon, sheet=0) {
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

export const UIFlags = {

};

export const PackFlags = {
  INHERIT_WIDTH  : 1,
  INHERIT_HEIGHT : 2,
  VERTICAL : 4,
  USE_ICONS : 8,
  SMALL_ICON : 16,
  LARGE_ICON : 32,

  //internal flags
  STRIP_HORIZ : 512,
  STRIP_VERT : 1024,
  STRIP : 512|1024
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


import {DataPathError} from './controller.js';
export {DataPathError} from './controller.js';

export class SimpleContext {
  constructor(stateobj, api) {
    if (api === undefined) {
      throw new Error("api cannot be undefined, see controller.js");
    }
    this.state = stateobj;
    this.api = api;
  }
}
  

let _idgen = 0;

export class UIBase extends HTMLElement {
  constructor() {
    super();

    this._override_class = undefined;
    this.parentWidget = undefined;

    /*
    this.shadow._appendChild = this.shadow.appendChild;
    this.shadow.appendChild = (child) => {
      if (child instanceof UIBase) {
        child.ctx = this.ctx;
        child.parentWidget = this;

        if (child._useDataPathToolOp === undefined) {
          child.useDataPathToolOp = this.useDataPathToolOp;
        }
      }

      return this.shadow._appendChild(child);
    };
    //*/

    this._useDataPathToolOp = undefined;
    let tagname = this.constructor.define().tagname;
    
    this._id = tagname.replace(/\-/g, "_") + (_idgen++);

    this.default_overrides = {};
    this.class_default_overrides = {};

    //getting css to flow down properly can be a pain, so
    //some packing settings are set as bitflags here,
    //see PackFlags
    
    /*
    setInterval(() => {
      this.update();
    }, 200);
    //*/

    this._modaldata = undefined;
    this.packflag = 0;
    this._disabled = false;
    this._disdata = undefined;
    this.shadow = this.attachShadow({mode : 'open'});
    this._ctx = undefined;
    
    this.description = undefined;
    
    let style = document.createElement("style");
    style.textContent = `
    .DefaultText {
      font: `+_getFont(this)+`;
    }
    `;
    this.shadow.appendChild(style);
    this._init_done = false;

    //make default touch handlers that send mouse events
    let do_touch = (e, type, button) => {
      button = button === undefined ? 0 : button;
      let e2 = copyEvent(e);

      if (e.touches.length == 0) {
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
    }, {passive : false});
    this.addEventListener("touchmove", (e) => {
      do_touch(e, "mousemove");
    }, {passive : false});
    this.addEventListener("touchcancel", (e) => {
      do_touch(e, "mouseup", 2);
    }, {passive : false});
    this.addEventListener("touchend", (e) => {
      do_touch(e, "mouseup", 0);
    }, {passive : false});
  }

  /**
   causes calls to setPathValue to go through
   toolpath app.datapath_set(path="" newValueJSON="")

   every child will inherit
  */
  set useDataPathToolOp(val) {
    this._useDataPathToolOp = val;

    this._forEachChildWidget((n) => {
      n.useDataPathToolOp = val;
    })
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

  get background() {
    return this.__background;
  }

  set background(bg) {
    this.__background = bg;
    this.style["background-color"] = bg;
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
        max[0] = Math.max(max[0], r.x+r.width);
        max[1] = Math.max(max[1], r.y+r.height);

        found = true;
      }
    };

    doaabb(this);

    this._forEachChildWidget((n) => {
      doaabb(n);
    });

    if (found) {
      return {
        width  : max[0] - min[0],
        height : max[1] - min[1],
        x : min[0],
        y : min[1],
        left : min[0],
        top : min[1],
        right : max[0],
        bottom : max[1]
      };
    } else {
      return undefined;
    }
  }

  get useDataPathToolOp() {
    return this._useDataPathToolOp;
  }

  setCSS() {
    let zoom = this.getZoom();
    this.style["transform"] = `scale(${zoom},${zoom})`;
  }

  appendChild(child) {
    if (child instanceof UIBase) {
      child.ctx = this.ctx;
      child.parentWidget = this;

      if (child._useDataPathToolOp === undefined) {
        child.useDataPathToolOp = this.useDataPathToolOp;
      }
    }

    return super.appendChild(child);
  }

    //delayed init
  init() {
    
  }
  
  _ondestroy() {
    if (this.ondestroy !== undefined) {
      this.ondestroy();
    }
  }
  
  remove() {
    super.remove();
    this._ondestroy();
  }
  
  removeChild(child) {
    super.removeChild(child);
    
    child._ondestroy();
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

    for (let n of this.shadow.childNodes) {
      rec(n);
    }
  }
  
  _init() {
    if (this._init_done) {
      return;
    }
    
    this._init_done = true;
    this.init();
  }
  
  static setDefault(element) {
    return element;
  }
  
  getWinWidth() {
    return window.innerWidth;
  }
  
  getWinHeight() {
    return window.innerHeight;
  }

  pickElement(x, y, marginx=0, marginy=0, nodeclass=UIBase) {
    let ret = undefined;


    let rec = (n, widget, depth=0) => {
      if (n.getClientRects) {
        let rects = n.getClientRects();

        if (n instanceof nodeclass) {
          widget = n;
        }

        for (let rect of rects) {
          let ok =   x >= rect.x-marginx && x <= rect.x+marginx+rect.width;
          ok = ok && y >= rect.y-marginy && y <= rect.y+marginy+rect.height;

          //ok = x >= rect.x && x <= rect.x + rect.width;
          //ok = ok && y >= rect.y && y <= rect.y + rect.height;

          if (nodeclass !== undefined) {
            ok = ok && (widget instanceof nodeclass);
          }

          //console.log(ok, "|", x, y, rect.x, rect.y, rect.x+rect.width, rect.y+rect.height);
          if (ok) {
            ret = widget;
          }
          //console.log(rect.width, rect.height, "eek", depth);
        }
      }

      let isleaf = n.childNodes.length == 0;

      if (n.shadow !== undefined) {
        isleaf = isleaf && (n.shadow.childNodes.length == 0);
      }

      if (!isleaf) {
        for (let n2 of n.childNodes) {
          rec(n2, widget, depth+1);
        }

        if (n.shadow !== undefined) {
          for (let n2 of n.shadow.childNodes) {
            rec(n2, widget, depth+1);
          }
        }
      }
    };

    rec(this, this);

    return ret;
  }
  /**
   *
    * @param x
   * @param y
   * @param sx
   * @param sy
   * @param nodeclass
   * @returns {*}
   */
  pickElement3(x, y, sx=0, sy=0, nodeclass=undefined) {
    let rects = this.getClientRects();
    let ret;
    
    //if (rects.length == 0)
    //  return;

    let nodes = [];
    this._forEachChildWidget((n) => {
      nodes.push(n);
    });

    for (let n of nodes) {
      let ret2 = n.pickElement(x, y, sx, sy, nodeclass); //sx+rects[0].x, sy+rects[0].y);

      ret = ret2 || ret;
      ret = ret2 !== undefined ? ret2 : ret;
    }

    if (ret === undefined && rects !== undefined) {
      console.log(rects[0]);

      if (nodeclass !== undefined && !(this instanceof nodeclass))
        return undefined;

      //ignore svg overdraw elements
      if (this.tagName == "OVERDRAW-X") {
        return undefined;
      }

      for (let rect of rects) {
        if (x >= rect.x+sx && x <=rect.x+sx+rect.width && 
            y >= rect.y+sy && y <=rect.y+sy+rect.height)
        {
          return this;
        }
      }
    }
    
    return ret;
  }

  set disabled(val) {
    if (!!this._disabled == !!val)
      return;

    if (val && !this._disdata) {
      this._disdata = {
        background : this.background,
        bgcolor : this.style["background-color"],
        DefaultPanelBG : this.default_overrides.DefaultPanelBG,
        BoxBG : this.default_overrides.BoxBG
      };

      let bg = this.getDefault("DisabledBG");

      this.background = bg;
      this.default_overrides.DefaultPanelBG = bg;
      this.default_overrides.BoxBG = bg;
      this.style["background-color"] = bg;

      this._disabled = val;
      this.on_disabled();
    } else if (!val && this._disdata) {
      if (this._disdata.DefaultPanelBG) {
        this.default_overrides.DefaultPanelBG = this._disdata.DefaultPanelBG;
      } else {
        delete this.default_overrides.DefaultPanelBG;
      }

      if (this.boxBG) {
        this.default_overrides.BoxBG = this._disdata.BoxBG;
      } else {
        delete this.default_overrides.BoxBG;
      }

      this.background = this._disdata.background;
      this.style["background-color"] = this._disdata.bgcolor;
      this._disdata = undefined;

      this._disabled = val;
      this.on_enabled();
    }

    this._disabled = val;

    let rec = (n) => {
      if (n instanceof UIBase) {
        n.disabled = val;
      }

      for (let c of n.childNodes) {
        rec(c);
      }

      if (!n.shadow) return;

      for (let c of n.shadow.childNodes) {
        rec(c);
      }
    };

    rec(this);
  }

  on_disabled() {

  }

  on_enabled() {

  }

  pushModal(handlers=this) {
    if (this._modaldata !== undefined){
      console.warn("UIBase.prototype.pushModal called when already in modal mode");
      //pop modal stack just to be safe
      popModalLight(this._modaldata);
      this._modaldata = undefined;
    }

    this._modaldata = pushModalLight(handlers);
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

  get disabled() {
    return this._disabled;
  }

  flash(color, rect_element=this, timems=355) {
    console.warn("flash disabled due to bug");
    return;
    
    console.trace("flash");
    if (typeof color != "object") {
        color = css2color(color);
    }
    color = new Vector4(color);
    let csscolor = color2css(color);
    
    if (this._flashtimer !== undefined && this._flashcolor != csscolor) {
      window.setTimeout(() => {
        this.flash(color, rect_element, timems);
      }, 100);
      
      return;
    } else if (this._flashtimer !== undefined) {
      return;
    }
    
    let rect = rect_element.getClientRects()[0];
    if (rect === undefined) {
      return;
    }
    
    //okay, dom apparently calls onchange() on .remove, so we have
    //to put the timer code first to avoid loops
    let timer;
    
    this._flashtimer = timer = window.setInterval((e) => {
      if (timer === undefined) {
        return
      }
      
      let a = 1.0 - tick / max;
      div2.style["background-color"] = color2css(color, a*a*0.5);
      
      if (tick > max) {
        window.clearInterval(timer);
        
        this._flashtimer = undefined;
        this._flashcolor = undefined;
        timer = undefined;
        
        try {
          this.remove();
          div.parentNode.insertBefore(this, div);
        } catch (error) {
          console.log("dom removal error");
          div.appendChild(this);
          return;
        }
        
        //console.log(div.parentNode);
        div.remove();
        
        this.focus();
      }
      
      tick++;
    }, 20);

    console.log(this.parentNode);
    
    let div = document.createElement("div");
    
    this.parentNode.insertBefore(div, this);
    
    try {
      this.remove();
    } catch (error) {
      console.log("this.remove() failure in UIBase.flash()");
    }        
    
    div.appendChild(this);
    
    let div2 = document.createElement("div");
    
    div2.style["pointer-events"] = "transparent";
    div2.tabIndex = undefined;
    div2.style["z-index"] = "100";
    div2.style["display"] = "float";
    div2.style["position"] = "absolute";
    div2.style["left"] = rect.x + "px";
    div2.style["top"] = rect.y + "px";

    div2.style["background-color"] = color2css(color, 0.5);
    div2.style["width"] = rect.width + "px";
    div2.style["height"] = rect.height + "px";

    div.appendChild(div2);
    this.focus();
    
    let tick = 0;
    let max = ~~(timems/20);
    
    this._flashcolor = csscolor;
  }
  
  destory() {
  }
  
  on_resize(newsize) {
  }
  
  get ctx() {
    return this._ctx;
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
  
  setPathValue(ctx, path, val) {
    if (this.hasAttribute("mass_set_path")) {
      ctx.api.massSetProp(ctx, this.getAttribute("mass_set_path"), val);
      ctx.api.setValue(ctx, path, val);
    } else {
      ctx.api.setValue(ctx, path, val);
    }
  }
  
  getPathMeta(ctx, path) {
    let ret = ctx.api.resolvePath(ctx, path);

    return ret !== undefined ? ret.prop : undefined;
  }

  getScreen() {
    return this.ctx.screen;
  }

  //not sure I'm happy about this. . .
  //it adds a method call to the event queue,
  //but only if that method (for this instance, as differentiated
  //by ._id) isn't there already.
  
  doOnce(func, timeout=undefined) {
    if (func._doOnce === undefined) {
      func._doOnce_reqs = new Set();
      
      func._doOnce = (thisvar) => {
        if (func._doOnce_reqs.has(thisvar._id)) {
          return;
        }
        
        func._doOnce_reqs.add(thisvar._id);
        
        window.setTimeout(() => {
          func._doOnce_reqs.delete(thisvar._id);
          
          func.call(thisvar);
        }, timeout);
      }
    }
    
    func._doOnce(this);
  }

  
  set ctx(c) {
    this._ctx = c;
    
    let rec = (n) => { 
      if (n instanceof UIBase) {
        n.ctx = c;
      }
      for (let child of n.childNodes) {
        rec(child);
      }
    }
    
    if (this._init_done) {
      this.update();
    }
  }
  
  float(x=0, y=0, zindex=undefined) {
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
      if (n.ctx === undefined) {
        n.ctx = ctx;
      }
      
      n._ensureChildrenCtx(ctx);
    });
  }
  
  //called regularly
  update() {
    //use dom tooltips
    if (this.description !== undefined && this.title != this.description) {
      this.title = this.description;
    }

    if (!this._init_done) {
      this._init();
    }
    
    //this._ensureChildrenCtx();
  }
  
  onadd() {
    if (this.parentWidget !== undefined) {
      this._useDataPathToolOp = this.parentWidget._useDataPathToolOp;
    }

    if (!this._init_done) {
      this.doOnce(this._init);
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

    return window.devicePixelRatio;
  }

  /**DEPRECATED

    scaling ratio (e.g. for high-resolution displays)
   */
  static getDPI() {
    //if (dpistack.length > 0) {
    //  return dpistack[this.dpistack.length-1];
    //} else {
    return window.devicePixelRatio;
    //}
  }
  
  /**
   * for saving ui state.
   * see saveUIData() export
   *
   * should fail gracefully.
   */
  saveData() {
    return {
    };
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
  
  //parent_cls is a string, tagname of element to extend
  static register(cls) {
    //if (parent_cls !== undefined) {
    // customElements.define(cls.define().tagname, cls, {extends : "div"});
    //} else {
      customElements.define(cls.define().tagname, cls);
    //}
  }

  overrideDefault(key, val) {
    this.default_overrides[key] = val;
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

  getDefault(key) {
    let p = this;

    while (p) {
      if (key in p.default_overrides) {
        return p.default_overrides[key];
      }

      p = p.parentWidget;
    }

    return this.getClassDefault(key);
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

  getClassDefault(key) {
    let style = this.getStyleClass();

    let p = this;
    while (p) {
      let def = p.class_default_overrides[style];

      if (def && (key in def)) {
        return def[key];
      }

      p = p.parentWidget;
    }

    if (style in theme && key in theme[style]) {
      return theme[style][key];
    }

    return theme.base[key];
  }

  getStyle() {
    console.warn("deprecated call to UIBase.getStyle");
    return this.getStyleClass();
  }

  /**
   * Defines core attributes of the class
   *
   * @example
   *
   * static define() {return {
   *   tagname : "custom-element-x",
   *   style : "[style class in theme]"
   * }}
   */
  static define() {
    throw new Error("Missing define() for ux element");
  }
}

/**okay, I need to refactor this function,
  it needs to take x, y as well as width, height,
  and be usable for more use cases.*/
export function drawRoundBox(elem, canvas, g, width, height, r=undefined,
                             op="fill", color=undefined, margin=undefined, no_clear=false) {
    width = width === undefined ? canvas.width : width;
    height = height === undefined ? canvas.height : height;
    
    let dpi = elem.getDPI();
    
    r = r === undefined ? elem.getDefault("BoxRadius") : r;

    if (margin === undefined) {
      margin = elem.getDefault("BoxDrawMargin");
    }

    r *= dpi;
    let r1=r, r2=r;
    
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
      bg = elem.getDefault("BoxBG");
    }
    
    if (op == "fill" && !no_clear) {
      g.clearRect(0, 0, width, height);
    }
    
    g.fillStyle = bg;
    //hackish!
    g.strokeStyle = color === undefined ? elem.getDefault("BoxBorder") : color;
    
    let w = width, h = height;
    
    let th = Math.PI/4;
    let th2 = Math.PI*0.75;
    
    g.beginPath();

    g.moveTo(margin, margin+r1);
    g.lineTo(margin, h-r1-margin);

    g.quadraticCurveTo(margin, h-margin, margin+r2, h-margin);
    g.lineTo(w-margin-r2, h-margin);
    
    g.quadraticCurveTo(w-margin, h-margin, w-margin, h-margin-r1);
    g.lineTo(w-margin, margin+r1);
    
    g.quadraticCurveTo(w-margin, margin, w-margin-r2, margin);
    g.lineTo(margin+r2, margin);

    g.quadraticCurveTo(margin, margin, margin, margin+r1);
    g.closePath();

    if (op == "clip") {
      g.clip();
    } else if (op == "fill") {
      g.fill();
      g.stroke();
    } else {
      g.stroke();
    }
};

export function _getFont_new(elem, size, font="DefaultText", do_dpi=true) {

  font = elem.getDefault(font);

  return font.genCSS(size);
}

export function getFont(elem, size, font="DefaultText", do_dpi=true) {
  return _getFont_new(elem, size, font="DefaultText", do_dpi=true);
}

//size is optional, defaults to font's default size
export function _getFont(elem, size, font="DefaultText", do_dpi=true) {
  let dpi = elem.getDPI();

  let font2 = elem.getDefault(font);
  if (font2 !== undefined) {
    //console.warn("New style font detected", font2, font2.genCSS(size));
    return _getFont_new(elem, size, font, do_dpi);
  }

  console.warn("Old style font detected");

  if (!do_dpi) {
    dpi = 1;
  }
  
  if (size !== undefined) {
    return ""+(size * dpi) + "px " + getDefault(font+"Font");
  } else {
    let size = getDefault(font+"Size");

    if (size === undefined) {
      console.warn("Unknown fontsize for font", font);
      size = 14;
    }

    return ""+size+ "px " + getDefault(font+"Font");
  }
}

export function _ensureFont(elem, canvas, g, size) {
  let dpi = elem.getDPI();
  
  if (size !== undefined) {
    g.font = ""+Math.ceil(size * dpi) + "px sans-serif";
  } else if (!canvas.font) {
    let size = elem.getDefault("DefaultText").size * dpi;

    let add = "0"; //Math.ceil(Math.fract((0.5 / dpi))*100);
    
    //size += 4;
    g.font = ""+Math.floor(size) + "." + add + "px sans-serif";
  } else {
    g.font = canvas.font;
  }
}

export function measureText(elem, text, canvas, g, size=undefined) {
  _ensureFont(elem, canvas, g, size);
  
  let ret = g.measureText(text);
  
  if (size !== undefined) {
    //clear custom font for next time
    g.font = undefined;
  }
  
  return ret;
}

export function drawText(elem, x, y, text, canvas, g, color=undefined, size=undefined) {
  _ensureFont(elem, canvas, g, size);
  
  g.fillStyle = elem.getDefault("DefaultText").color;
  g.fillText(text, x+0.5, y+0.5);
  
  if (size !== undefined) {
    //clear custom font for next time
    g.font = undefined;
  }
}

let PIDX=0, PSHADOW=1, PTOT=2;

export function saveUIData(node, key) {
  if (key === undefined) {
    throw new Error("ui_base.saveUIData(): key cannot be undefined");
  }
  
  let paths = [];
  
  let rec = (n, path, ni, is_shadow) => {
    path = path.slice(0, path.length); //copy path
    
    let pi = path.length;
    for (let i=0; i<PTOT; i++) {
      path.push(undefined);
    }
    
    path[pi] = ni;
    path[pi+1] = is_shadow;
    
    if (n instanceof UIBase) {
      let path2 = path.slice(0, path.length);
      path2.push(n.saveData());
      
      if (path2[pi+2]) {
        paths.push(path2);
      }
    }
    
    for (let i=0; i<n.childNodes.length; i++) {
      let n2 = n.childNodes[i];
      
      rec(n2, path, i, false);
    }
    
    let shadow = n.shadow;
    
    if (!shadow)
      return;
    
    for (let i=0; i<shadow.childNodes.length; i++) {
      let n2 = shadow.childNodes[i];
      
      rec(n2, path, i, true);
    }
  }
  
  rec(node, [], 0, false);
  
  return JSON.stringify({
    key : key,
    paths : paths,
    _ui_version : 1
  });
}

export function loadUIData(node, buf) {
  if (buf === undefined || buf === null) {
    return;
  }
  
  let obj = JSON.parse(buf);
  let key = buf.key;
  
  for (let path of obj.paths) {
    let n = node;
    
    let data = path[path.length-1];
    path = path.slice(2, path.length-1); //in case some api doesn't want me calling .pop()
    
    for (let pi=0; pi<path.length; pi += PTOT) {
      let ni = path[pi], shadow = path[pi+1];
      
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

