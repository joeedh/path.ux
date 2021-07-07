import {ToolTipViewer} from "./FrameManager_ops.js";

let _FrameManager = undefined;
import '../widgets/dragbox.js';
import '../widgets/ui_widgets2.js';
import '../widgets/ui_panel.js';
import '../widgets/ui_treeview.js';

import '../util/ScreenOverdraw.js';
import cconst from '../config/const.js';
import {haveModal, pushModalLight, popModalLight, _setScreenClass} from '../path-controller/util/simple_events.js';
import * as util from '../path-controller/util/util.js';
import '../widgets/ui_curvewidget.js';
import * as vectormath from '../path-controller/util/vectormath.js';
import * as ui_base from '../core/ui_base.js';
import * as ScreenArea from './ScreenArea.js';
import * as FrameManager_ops from './FrameManager_ops.js';
import * as math from '../path-controller/util/math.js';
import * as ui_menu from '../widgets/ui_menu.js';
import '../path-controller/util/struct.js';
import {KeyMap, HotKey} from '../path-controller/util/simple_events.js';
import {keymap} from "../path-controller/util/simple_events.js";

import {AreaDocker} from './AreaDocker.js';

import {snap, snapi, ScreenBorder, ScreenVert, ScreenHalfEdge} from "./FrameManager_mesh.js";
export {ScreenBorder, ScreenVert, ScreenHalfEdge} from "./FrameManager_mesh.js";
import {theme} from '../core/ui_base.js';
import * as FrameManager_mesh from './FrameManager_mesh.js';
import {makePopupArea} from "../widgets/ui_dialog.js";

let Area = ScreenArea.Area;

import '../widgets/ui_widgets.js';
import '../widgets/ui_tabs.js';
import '../widgets/ui_colorpicker2.js';
import '../widgets/ui_noteframe.js';
import '../widgets/ui_listbox.js';
import '../widgets/ui_table.js';
import {AreaFlags} from "./ScreenArea.js";
import {checkForTextBox} from '../widgets/ui_textbox.js';

function list(iter) {
  let ret = [];
  
  for (let item of iter) {
    ret.push(item);
  }

  return ret;
}

ui_menu.startMenuEventWrangling();

let _events_started = false;

export function registerToolStackGetter(func) {
  FrameManager_ops.registerToolStackGetter(func);
}

//XXX why!!!
window._nstructjs = nstructjs;

let Vector2 = vectormath.Vector2,
  UIBase = ui_base.UIBase,
  styleScrollBars = ui_base.styleScrollBars;

let update_stack = new Array(8192);
update_stack.cur = 0;

let screen_idgen = 0;

export function purgeUpdateStack() {
  for (let i=0; i<update_stack.length; i++) {
    update_stack[i] = undefined;
  }
}

/**
 * Base class for app workspaces
 *
 attributes:

 inherit-scale : don't resize to fit whole screen, use cssbox scaling

 */
export class Screen extends ui_base.UIBase {
  constructor() {
    super();

    this.fullScreen = true;

    //all widget shadow DOMs reference this style tag,
    //or rather they copy it
    this.globalCSS = document.createElement("style");
    this.shadow.prepend(this.globalCSS);

    this._do_updateSize = true;
    this._resize_callbacks = [];

    this.allBordersMovable = cconst.DEBUG.allBordersMovable;
    this.needsBorderRegen = true;

    this._popup_safe = 0;

    //if true, will test all areas for keymaps on keypress,
    //not just the active one
    this.testAllKeyMaps = false;

    this.needsTabRecalc = true;
    this._screen_id = screen_idgen++;

    this._popups = [];

    this._ctx = undefined;

    this.keymap = new KeyMap();

    this.size = new Vector2([window.innerWidth, window.innerHeight]);
    this.pos = new Vector2();
    this.oldpos = new Vector2();

    this.idgen = 0;
    this.sareas = [];
    this.sareas.active = undefined;
    this.mpos = [0, 0];

    this.screenborders = [];
    this.screenverts = [];
    this._vertmap = {};
    this._edgemap = {};
    this._idmap = {};

    //effective bounds of screen
    this._aabb = [new Vector2(), new Vector2()];

    let on_mousemove = (e, x, y) => {
      let elem = this.pickElement(x, y, 1, 1, ScreenArea.ScreenArea);

      if (0) {
        let elem2 = this.pickElement(x, y, 1, 1);
        console.log(""+this.sareas.active, elem2 ? elem2.tagName : undefined, elem !== undefined);
      }

      if (elem !== undefined) {
        if (elem.area) {
          //make sure context area stacks are up to date
          elem.area.push_ctx_active();
          elem.area.pop_ctx_active();
        }

        this.sareas.active = elem;
      }

      this.mpos[0] = x;
      this.mpos[1] = y;
    }
    this.shadow.addEventListener("mousemove", (e) => {
      return on_mousemove(e, e.x, e.y);
    });

    this.shadow.addEventListener("touchmove", (e) => {
      if (e.touches.length === 0) {
        return;
      }

      return on_mousemove(e, e.touches[0].pageX, e.touches[0].pagesY);
    });

  }

  init() {
    super.init();

    if (this.hasAttribute("listen")) {
      this.listen();
    }
  }
  /**
   * 
   * @param {*} style May be a string, a CSSStyleSheet instance, or a style tag
   * @returns Promise fulfilled when style has been merged
   */
  mergeGlobalCSS(style) {
    return new Promise((accept, reject) => {
      let sheet;

      let finish = () => {
        let sheet2 = this.globalCSS.sheet;
        if (!sheet2) {
          this.doOnce(finish);
          return;
        }

        let map = {};
        for (let rule of sheet2.rules) {
          map[rule.selectorText] = rule;
        }

        for (let rule of sheet.rules) {
          let k = rule.selectorText;
          if (k in map) {
            let rule2 = map[k];

            if (!rule.styleMap) { //handle firefox
              for (let k in rule.style) {
                let desc = Object.getOwnPropertyDescriptor(rule.style, k);
                
                if (!desc || !desc.writable) {
                  continue;
                }
                let v = rule.style[k];

                if (v) {
                  rule2.style[k] = rule.style[k];
                }
              }
              continue;
            }
            for (let [key, val] of list(rule.styleMap.entries())) {
              if (1||rule2.styleMap.has(key)) {
                //rule2.styleMap.delete(key);
                let sval = "";

                if (Array.isArray(val)) {
                  for (let item of val) {
                    sval += " " + val;
                  }
                  sval = sval.trim();
                } else {
                  sval = ("" + val).trim();
                }

                rule2.style[key] = sval;
                rule2.styleMap.set(key, val);
              } else {
                rule2.styleMap.append(key, val);
              }
            }
          } else {
            sheet2.insertRule(rule.cssText);
          }
        }
      }

      if (typeof style === "string") {
        try { //stupid firefox
          sheet = new CSSStyleSheet();
        } catch (error) {
          sheet = undefined;
        }

        if (sheet && sheet.replaceSync) {
          sheet.replaceSync(style);
          finish();
        } else {
          let tag = document.createElement("style");
          tag.textContent = style;
          document.body.appendChild(tag);
          
          let cb = () => {
            if (!tag.sheet) {
              this.doOnce(cb);
              return;
            }

            sheet = tag.sheet;
            finish();
            tag.remove();
          };

          this.doOnce(cb)
        }
      } else if (!(style instanceof CSSStyleSheet)) {
        sheet = style.sheet;
        finish();
      } else {
        sheet = style;
        finish();
      }
    });
  }

  newScreenArea() {
    let ret = UIBase.createElement("screenarea-x");
    ret.ctx = this.ctx;

    if (ret.ctx) {
      ret.init();
    }

    return ret;
  }

  copy() {
    let ret = UIBase.createElement(this.constructor.define().tagname);
    ret.ctx = this.ctx;
    ret._init();

    for (let sarea of this.sareas) {
      let sarea2 = sarea.copy(ret);

      sarea2._ctx = this.ctx;
      sarea2.screen = ret;
      sarea2.parentWidget = ret;

      ret.appendChild(sarea2);
    }

    for (let sarea of ret.sareas) {
      sarea.ctx = this.ctx;
      sarea.area.ctx = this.ctx;

      sarea.area.push_ctx_active();
      sarea._init();
      sarea.area._init();
      sarea.area.pop_ctx_active();

      for (let area of sarea.editors) {
        area.ctx = this.ctx;

        area.push_ctx_active();
        area._init();
        area.pop_ctx_active();
      }
    }

    ret.update();
    ret.regenBorders();
    ret.setCSS();

    return ret;
  }

  findScreenArea(x, y) {
    for (let i=this.sareas.length-1; i>=0; i--) {
      let sarea = this.sareas[i];

      let ok = x >= sarea.pos[0] && x <= sarea.pos[0] + sarea.size[0];
      ok = ok && (y >= sarea.pos[1] && y <= sarea.pos[1] + sarea.size[1]);

      if (ok) {
        return sarea;
      }
    }
  }

  /** 
   * @param x
   * @param y
   * @param args arguments : {sx, sy, nodeclass, excluded_classes}
  */
  pickElement(x, y, args, sy, nodeclass, excluded_classes) {
    let sx;
    let clip;

    if (typeof args === "object") {
      sx = args.sx;
      sy = args.sy;
      nodeclass = args.nodeclass;
      excluded_classes = args.excluded_classes;
      clip = args.clip;
    } else {
      sx = args;

      args = {
        sx : sx,
        sy : sy,
        nodeclass : nodeclass,
        excluded_classes : excluded_classes
      };
    }

    if (clip === undefined) {
      clip = args.clip = {
        pos   : new Vector2(this.pos),
        size  : new Vector2(this.size)
      }
    };

    if (!this.ctx) {
      console.warn("no ctx in screen");
      return;
    }

    let ret;

    for (let i=this._popups.length-1; i >= 0; i--) {
      let popup = this._popups[i];

      ret = ret || popup.pickElement(x, y, args);
    }

    ret = ret || super.pickElement(x, y, args);

    return ret;
  }

  _enterPopupSafe() {
    if (this._popup_safe === undefined) {
      this._popup_safe = 0;
    }

    this._popup_safe++;
  }

  * _allAreas() {
    for (let sarea of this.sareas) {
      for (let area of sarea.editors) {
        yield [area, area._area_id, sarea];
      }
    }
  }

  _exitPopupSafe() {
    this._popup_safe = Math.max(this._popup_safe-1, 0);
  }

  popupMenu(menu, x, y) {
    let popup = this.popup(undefined, x, y, false);
    popup.add(menu);

    menu.start();
    return menu;
  }

  /**
   *
   * @param popupDelay : if non-zero, wait for popup to layout for popupDelay miliseconds,
   *                     then move the popup so it's fully inside the window (if it's outsize).
   *
    * */
  popup(owning_node, elem_or_x, y, closeOnMouseOut=true, popupDelay=250) {
    let ret = this._popup(...arguments);

    if (popupDelay === 0) {
      return ret;
    }

    let z = ret.style["z-index"];

    ret.style["z-index"] = "-10";

    let cb = () => {
      let rect = ret.getClientRects()[0];
      let size = this.size;

      if (!rect) {
        this.doOnce(cb);
        return;
      }

      console.log("rect", rect);
      
      if (rect.bottom > size[1]) {
        ret.style["top"] = (size[1] - rect.height - 10) + "px";
      } else if (rect.top < 0) {
        ret.style["top"] = "10px";
      }
      if (rect.right > size[0]) {
        ret.style["left"] = (size[0] - rect.width - 10) + "px";
      } else if (rect.left < 0) {
        ret.style["left"] = "10px";
      }


      ret.style["z-index"] = z;
    }

    setTimeout(cb, popupDelay);
    //this.doOnce(cb);

    return ret;
  }

  draggablePopup(x, y) {
    let ret = UIBase.createElement("drag-box-x");
    ret.ctx = this.ctx;
    ret.parentWidget = this;
    ret._init();

    this._popups.push(ret);

    ret._onend = () => {
      if (this._popups.indexOf(ret) >= 0) {
        this._popups.remove(ret);
      }
    }

    ret.style["z-index"] = 205;
    ret.style["position"] = "absolute";
    ret.style["left"] = x + "px";
    ret.style["top"] = y + "px";

    document.body.appendChild(ret);

    return ret;
  }

  /** makes a popup at x,y and returns a new container-x for it */
  _popup(owning_node, elem_or_x, y, closeOnMouseOut=true) {
    let x;

    let sarea = this.sareas.active;

    let w = owning_node;
    while (w) {
      if (w instanceof ScreenArea.ScreenArea) {
        sarea = w;
        break;
      }
      w = w.parentWidget;
    }

    if (typeof elem_or_x === "object") {
      let r = elem_or_x.getClientRects()[0];

      x = r.x;
      y = r.y;
    } else {
      x = elem_or_x;
    }

    let container = UIBase.createElement("container-x");

    container.ctx = this.ctx;
    container._init();

    let remove = container.remove;
    container.remove = () => {
      if (this._popups.indexOf(container) >= 0) {
        this._popups.remove(container);
      }

      return remove.apply(container, arguments);
    };

    container.overrideClass("popup");

    container.background = container.getDefault("background-color");
    container.style["border-radius"] = container.getDefault("border-radius") + "px";
    container.style["border-color"] = container.getDefault("border-color");
    container.style["border-style"] = container.getDefault("border-style");
    container.style["border-width"] = container.getDefault("border-width") + "px";

    container.style["position"] = "absolute";
    container.style["z-index"] = 205;
    container.style["left"] = x + "px";
    container.style["top"] = y + "px";
    container.style["margin"] = "0px";

    container.parentWidget = this;

    let mm = new math.MinMax(2);
    let p = new Vector2();

    let _update = container.update;
    /*causes weird bugs
    container.update = () => {
      _update.call(container);

      let rects = container.getClientRects();
      mm.reset();

      for (let r of rects) {
        p[0] = r.x;
        p[1] = r.y;
        mm.minmax(p);

        p[0] += r.width;
        p[1] += r.height;
        mm.minmax(p);
      }

      let x = mm.min[0], y = mm.min[1];

      x = Math.min(x, this.size[0]-(mm.max[0]-mm.min[0]));
      y = Math.min(y, this.size[1]-(mm.max[1]-mm.min[1]));

      container.style["left"] = x + "px";
      container.style["top"] = y + "px";
    }//*/

    document.body.appendChild(container);
    //this.shadow.appendChild(container);
    this.setCSS();

    this._popups.push(container);

    let touchpick, mousepick, keydown;

    let done = false;
    let end = () => {
      if (this._popup_safe) {
        return;
      }

      if (done) return;

      this.ctx.screen.removeEventListener("touchstart", touchpick, true);
      this.ctx.screen.removeEventListener("touchmove", touchpick, true);
      this.ctx.screen.removeEventListener("mousedown", mousepick, true);
      this.ctx.screen.removeEventListener("mousemove", mousepick, true);
      this.ctx.screen.removeEventListener("mouseup", mousepick, true);
      window.removeEventListener("keydown", keydown);

      done = true;
      container.remove();
    };

    container.end = end;

    let _remove = container.remove;
    container.remove = function() {
      if (arguments.length == 0) {
        end();
      }
      _remove.apply(this, arguments);
    };

    container._ondestroy = () => {
      end();
    };

    let bad_time = util.time_ms();
    let last_pick_time = util.time_ms();

    mousepick = (e, x, y, do_timeout=true) => {
      if (sarea && sarea.area) {
        sarea.area.push_ctx_active();
        sarea.area.pop_ctx_active();
      }
      //console.log("=======================================================popup touch start");
      //console.log(e);
      
      if (util.time_ms() - last_pick_time < 250) {
        return;
      }
      last_pick_time = util.time_ms();

      x = x === undefined ? e.x : x;
      y = y === undefined ? e.y : y;

      let elem = this.pickElement(x, y, 2, 2, undefined, [ScreenBorder]);
      let startelem = elem;

      if (elem === undefined) {
        if (closeOnMouseOut) {
          end();
        }
        return;
      }

      let ok = false;
      let elem2 = elem;

      while (elem) {
        if (elem === container) {
          ok = true;
          break;
        }
        elem = elem.parentWidget;
      }

      if (!ok) {
        do_timeout = !do_timeout || (util.time_ms() - bad_time > 100);

        if (closeOnMouseOut && do_timeout) {
          end();
        }
      } else {
        bad_time = util.time_ms();
      }
    };

    touchpick = (e) => {
      let x = e.touches[0].pageX, y = e.touches[0].pageY;

      return mousepick(e, x, y, false);
    };

    keydown = (e) => {
      if (!container.isConnected) {
        window.removeEventListener("keydown", keydown);
        return;
      }

      console.log(e.keyCode);

      switch (e.keyCode) {
        case keymap["Escape"]:
          end();
          break;
      }
    };

    this.ctx.screen.addEventListener("touchstart", touchpick, true);
    this.ctx.screen.addEventListener("touchmove", touchpick, true);
    this.ctx.screen.addEventListener("mousemove", mousepick, true);
    this.ctx.screen.addEventListener("mousedown", mousepick, true);
    this.ctx.screen.addEventListener("mouseup", mousepick, true);
    window.addEventListener("keydown", keydown);

    /*
    container.addEventListener("mouseleave", (e) => {
      console.log("popup mouse leave");
      if (closeOnMouseOut)
        end();
    });
    container.addEventListener("mouseout", (e) => {
      console.log("popup mouse out");
      if (closeOnMouseOut)
        end();
    });
    //*/

    this.calcTabOrder();

    return container;
  }

  _recalcAABB(save=true) {
    let mm = new math.MinMax(2);

    for (let v of this.screenverts) {
      mm.minmax(v);
    }

    if (save) {
      this._aabb[0].load(mm.min);
      this._aabb[1].load(mm.max);
    }

    return [new Vector2(mm.min), new Vector2(mm.max)];
  }

  get borders() {
    let this2 = this;

    return (function* () {
      for (let k in this2._edgemap) {
        yield this2._edgemap[k];
      }
    })();
  }

  //XXX look at if this is referenced anywhere
  load() {
  }

  //XXX look at if this is referenced anywhere
  save() {
  }

  popupArea(area_class) {
    return makePopupArea(area_class, this);
  }

  remove(trigger_destroy = true) {
    this.unlisten();

    if (trigger_destroy) {
      return super.remove();
    } else {
      HTMLElement.prototype.remove.call(this);
    }
  }

  get listening() {
    return this.listen_timer !== undefined;
  }

  unlisten() {
    if (this.listen_timer !== undefined) {
      window.clearInterval(this.listen_timer);
      this.listen_timer = undefined;
    }
  }

  checkCSSSize() {
    let w = this.style.width.toLowerCase().trim();
    let h = this.style.height.toLowerCase().trim();

    if (w.endsWith("px") && h.endsWith("px")) {
      w = parseFloat(w.slice(0, w.length-2).trim());
      h = parseFloat(h.slice(0, h.length-2).trim());

      if (w !== this.size[0] || h !== this.size[1]) {
        this.on_resize([this.size[0], this.size[1]], [w, h]);
        this.size[0] = w;
        this.size[1] = h;
      }
    }
  }

  getBoolAttribute(attr, defaultval=false) {
    if (!this.hasAttribute(attr)) {
      return defaultval;
    }

    let ret = this.getAttribute(attr);

    if (typeof ret === "number") {
      return !!ret;
    } else if (typeof ret === "string") {
      ret = ret.toLowerCase().trim();
      ret = ret === "true" || ret === "1" || ret === "yes";
    }

    return !!ret;
  }

  updateSize() {
    if (this.getBoolAttribute("inherit-scale") || !this.fullScreen || !cconst.autoSizeUpdate) {
      this.checkCSSSize();
      return;
    }

    let width = window.innerWidth;
    let height = window.innerHeight;

    let ratio = window.outerHeight / window.innerHeight;
    let scale = visualViewport.scale;

    let pad = 4;
    width = visualViewport.width * scale - pad;
    height = visualViewport.height * scale - pad;

    let ox = visualViewport.offsetLeft;
    let oy = visualViewport.offsetTop;

    if (cconst.DEBUG.customWindowSize) {
      let s = cconst.DEBUG.customWindowSize;
      width = s.width;
      height = s.height;
      ox = 0;
      oy = 0;
      window._DEBUG = cconst.DEBUG;
    }

    let key = this._calcSizeKey(width, height, ox, oy, devicePixelRatio, scale);

    /* CSS IS EVIL! WHY DOES BODY HAVE A MARGIN? */
    document.body.style.margin = document.body.style.padding = "0px";
    document.body.style["transform-origin"] = "top left";
    document.body.style["transform"] = `translate(${ox}px,${oy}px) scale(${1.0/scale})`;

    //document.body.style["transform"] = `scale(${1.0 / scale}, ${1.0 / scale})`; // translate(${ox*scale2}px, ${oy*scale2}px)`;

    if (key !== this._last_ckey1) {
      //console.log("resizing", key, this._last_ckey1);
      this._last_ckey1 = key;

      this.on_resize(this.size, [width, height], false);
      this.on_resize(this.size, this.size, false);

      let scale = visualViewport.scale;


      this.regenBorders();

      this.setCSS();
      this.completeUpdate();
    }
  }

  listen(args={updateSize : true}) {
    ui_menu.setWranglerScreen(this);

    let ctx = this.ctx;
    startEvents(() => ctx.screen);

    if (this.listen_timer !== undefined) {
      return; //already listening
    }

    this._do_updateSize = args.updateSize !== undefined ? args.updateSize : true;

    this.listen_timer = window.setInterval(() => {
      if (this.isDead()) {
        console.log("dead screen");
        this.unlisten();
        return;
      }
      
      this.update();
    }, 150);
  }

  _calcSizeKey(w, h, x, y, dpi, scale) {
    if (arguments.length !== 6) {
      throw new Error("eek");
    }

    let s = "";
    for (let i=0; i<arguments.length; i++) {
      s += arguments[i].toFixed(0)+":";
    }

    return s;
  }

  _ondestroy() {
    if (ui_menu.getWranglerScreen() === this) {
      //ui_menu.setWranglerScreen(undefined);
    }

    this.unlisten();

    //unlike other ondestroy functions, this one physically dismantles the DOM tree
    let recurse = (n, second_pass, parent) => {
      if (n.__pass === second_pass) {
        console.warn("CYCLE IN DOM TREE!", n, parent);
        return;
      }

      n.__pass = second_pass;

      n._forEachChildWidget(n2 => {
        if (n === n2)
          return;
        recurse(n2, second_pass, n);

        try {
          if (!second_pass && !n2.__destroyed) {
            n2.__destroyed = true;
            n2._ondestroy();
          }
        } catch (error) {
          print_stack(error);
          console.log("failed to exectue an ondestroy callback");
        }

        n2.__destroyed = true;

        try {
          if (second_pass) {
            n2.remove();
          }
        } catch (error) {
          print_stack(error);
          console.log("failed to remove element after ondestroy callback");
        }
      });
    };

    let id = ~~(Math.random() * 1024 * 1024);

    recurse(this, id);
    recurse(this, id + 1);
  }

  destroy() {
    this._ondestroy();
  }

  clear() {
    this._ondestroy();

    this.sareas = [];
    this.sareas.active = undefined;

    for (let child of list(this.childNodes)) {
      child.remove();
    }
    for (let child of list(this.shadow.childNodes)) {
      child.remove();
    }
  }

  _test_save() {
    let obj = JSON.parse(JSON.stringify(this));
    console.log(JSON.stringify(this));

    this.loadJSON(obj);
  }

  loadJSON(obj, schedule_resize = false) {
    this.clear();
    super.loadJSON();

    for (let sarea of obj.sareas) {
      let sarea2 = UIBase.createElement("screenarea-x");

      sarea2.ctx = this.ctx;
      sarea2.screen = this;

      this.appendChild(sarea2);

      sarea2.loadJSON(sarea);
    }

    this.regenBorders();
    this.setCSS();

    if (schedule_resize) {
      window.setTimeout(() => {
        this.on_resize(this.size, [window.innerWidth, window.innerHeight]);
      }, 50);
    }
  }

  static fromJSON(obj, schedule_resize = false) {
    let ret = UIBase.createElement(this.define().tagname);
    return ret.loadJSON(obj, schedule_resize);
  }

  toJSON() {
    let ret = {
      sareas: this.sareas
    };

    ret.size = this.size;
    ret.idgen = this.idgen;

    return Object.assign(super.toJSON(), ret);
  }

  getHotKey(toolpath) {
    let test = (keymap) => {
      for (let hk of keymap) {
        if (typeof hk.action != "string")
          continue;

        if (hk.action.trim().startsWith(toolpath.trim())) {
          return hk;
        }
      }
    };

    let ret = test(this.keymap);
    if (ret)
      return ret;

    if (this.sareas.active && this.sareas.active.keymap) {
      let area = this.sareas.active.area;

      for (let keymap of area.getKeyMaps()) {
        ret = test(keymap);

        if (ret)
          return ret;
      }
    }

    if (ret === undefined) {
      //just to be safe, check all areas in case the
      //context is confused as to which area is currently "active"

      for (let sarea of this.sareas) {
        let area = sarea.area;

        for (let keymap of area.getKeyMaps()) {
          ret = test(keymap);

          if (ret) {
            return ret;
          }
        }
      }
    }

    return undefined;
  }

  addEventListener(type, cb, options) {
    if (type === "resize") {
      this._resize_callbacks.push(cb);
    } else {
      return super.addEventListener(type, cb, options);
    }
  }

  removeEventListener(type, cb, options) {
    if (type === "resize") {
      if (this._resize_callbacks.indexOf(cb) >= 0)
        this._resize_callbacks.remove(cb);
    } else {
      return super.removeEventListener(type, cb, options);
    }
  }

  execKeyMap(e) {
    let handled = false;

    if (window.DEBUG && window.DEBUG.keymap) {
      console.warn("execKeyMap called", e.keyCode, document.activeElement.tagName);
    }

    if (this.sareas.active) {
      let area = this.sareas.active.area;

      if (!area) {
        return;
      }

      area.push_ctx_active();

      for (let keymap of area.getKeyMaps()) {
        if (keymap === undefined) {
          continue;
        }

        if (keymap.handle(this.ctx, e)) {
          handled = true;
          break;
        }
      }

      area.pop_ctx_active();
    }

    handled = handled || this.keymap.handle(this.ctx, e);

    if (!handled && this.testAllKeyMaps) {
      for (let sarea of this.sareas) {
        if (handled) {
          break;
        }

        sarea.area.push_ctx_active();

        for (let keymap of sarea.area.getKeyMaps()) {
          if (keymap.handle(this.ctx, e)) {
            handled = true;
            break;
          }
        }

        sarea.area.pop_ctx_active();
      }
    }

    return handled;
  }

  static define() {
    return {
      tagname: "pathux-screen-x"
    };
  }

  calcTabOrder() {
    let nodes = [];
    let visit = {};

    let rec = (n) => {
      let bad = n.tabIndex < 0 || n.tabIndex === undefined || n.tabIndex === null;
      bad = bad || !(n instanceof UIBase);
      
      if (n._id in visit || n.hidden) {
        return;
      }

      visit[n._id] = 1;

      if (!bad) {
        n.__pos = n.getClientRects()[0];
        if (n.__pos) {
          nodes.push(n);
        }
      }

      n._forEachChildWidget((n2) => {
        rec(n2);
      });
    };

    for (let sarea of this.sareas) {
      rec(sarea);
    }

    for (let popup of this._popups) {
      rec(popup);
    }

    //console.log("nodes2", nodes2);
    for (let i=0; i<nodes.length; i++) {
      let n = nodes[i];

      n.tabIndex = i + 1;
      //console.log(n.tabIndex);
    }
  }

  drawUpdate() {
    if (window.redraw_all !== undefined) {
      window.redraw_all();
    }
  }

  update() {
    let move = [];
    for (let child of this.childNodes) {
      if (child instanceof ScreenArea) {
        move.push(child);
      }
    }

    for (let child of move) {
      console.warn("moved screen area to shadow");

      HTMLElement.prototype.remove.call(child);
      this.shadow.appendChild(child);
    }

    if (this._do_updateSize) {
      this.updateSize();
    }

    if (this.needsTabRecalc) {
      this.needsTabRecalc = false;
      this.calcTabOrder();
    }

    outer: for (let sarea of this.sareas) {
      for (let b of sarea._borders) {
        let movable = this.isBorderMovable(b);

        if (movable !== b.movable) {
          console.log("detected change in movable borders");
          this.regenBorders();
          break outer;
        }
      }
    }

    if (this._update_gen) {
      let ret;

      /*
      if (cconst.DEBUG.debugUIUpdatePerf) {
          for (ret = this._update_gen.next(); !ret.done; ret = this._update_gen.next()) {}

        this._update_gen = this.update_intern();
        return;
      }
      //*/

      try {
        ret = this._update_gen.next();
      } catch (error) {
        util.print_stack(error);
        console.log("error in update_intern tasklet");
        this._update_gen = undefined;
        return;
      }

      if (ret !== undefined && ret.done) {
        this._update_gen = undefined;
      }
    } else {
      this._update_gen = this.update_intern();
    }
  }

  purgeUpdateStack() {
    this._update_gen = undefined;
    purgeUpdateStack();
  }

  get ctx() {
    return this._ctx;
  }

  set ctx(val) {
    this._ctx = val;

    //fully recurse tree
    let rec = (n) => {
      if (n instanceof UIBase) {
        n.ctx = val;
      }

      for (let n2 of n.childNodes) {
        rec(n2);
      }

      if (n.shadow) {
        for (let n2 of n.shadow.childNodes) {
          rec(n2);
        }
      }
    }

    for (let n of this.childNodes) {
      rec(n);
    }

    for (let n of this.shadow.childNodes) {
      rec(n);
    }
  }

  completeSetCSS() {
    let rec = (n) => {
      n.setCSS();

      n._forEachChildWidget((c) => {
        rec(c);
      })
    }

    rec(this);
  }

  completeUpdate() {
    for (let step of this.update_intern()) {
    }
  }

  updateScrollStyling() {
    let s = theme.scrollbars;

    if (!s || !s.color) return;

    let key = "" + s.color + ":" + s.color2 + ":" + s.border + ":" + s.contrast + ":" + s.width;

    if (key !== this._last_scrollstyle_key) {
      this._last_scrollstyle_key = key;

      //console.log("updating scrollbar styling");

      this.mergeGlobalCSS(styleScrollBars(s.color, s.color2, s.contrast, s.width, s.border, "*"));
    }
  }

  //XXX race condition warning
  update_intern() {
    this.updateScrollStyling();

    let popups = this._popups;

    let cssText = "";
    let sheet = this.globalCSS.sheet;
    if (sheet) {
      for (let rule of sheet.rules) {
        cssText += rule.cssText + "\n";
      }

      window.cssText = cssText
    }
    let cssTextHash = util.strhash(cssText);

    if (this.needsBorderRegen) {
      this.needsBorderRegen = false;
      this.regenBorders();
    }

    super.update();
    let this2 = this;

    //ensure each area has proper ctx set
    for (let sarea of this.sareas) {
      sarea.ctx = this.ctx;
    }

    return (function* () {
      let stack = update_stack;
      stack.cur = 0;

      let lastn = this2;

      function push(n) {
        stack[stack.cur++] = n;
      }

      function pop(n) {
        if (stack.cur < 0) {
          throw new Error("Screen.update(): stack overflow!");
        }

        return stack[--stack.cur];
      }

      let ctx = this2.ctx;

      let SCOPE_POP = Symbol("pop");
      let AREA_CTX_POP = Symbol("pop2");

      let scopestack = [];
      let areastack = [];

      let t = util.time_ms();
      push(this2);

      for (let p of popups) {
        push(p);
      }

      while (stack.cur > 0) {
        let n = pop();

        if (n === undefined) {
          //console.log("eek!", stack.length);
          continue;
        } else if (n === SCOPE_POP) {
          scopestack.pop();
          continue;
        } else if (n === AREA_CTX_POP) {
          //console.log("POP", areastack[areastack.length-1].constructor.name);
          areastack.pop().pop_ctx_active(ctx, true);
          continue;
        }

        if (n instanceof Area) {
          //console.log("PUSH", n.constructor.name);
          areastack.push(n);
          n.push_ctx_active(ctx, true);
          push(AREA_CTX_POP);
        }

        if (!n.hidden && n !== this2 && n instanceof UIBase) {
          n._ctx = ctx;

          if (n._screenStyleUpdateHash !== cssTextHash) {
            n._screenStyleTag.textContent = cssText;
            n._screenStyleUpdateHash = cssTextHash;
          }

          if (scopestack.length > 0 && scopestack[scopestack.length - 1]) {
            n.parentWidget = scopestack[scopestack.length - 1];

            //if (n.parentWidget && n._useDataPathUndo === undefined && n.parentWidget._useDataPathUndo !== undefined) {
            //  n._useDataPathUndo = n.parentWidget._useDataPathUndo;
            //}
          }

          n.update();
        }

        if (util.time_ms() - t > 20) {
          yield;
          t = util.time_ms();
        }

        for (let n2 of n.childNodes) {
          push(n2);
        }

        if (n.shadow === undefined) {
          continue;
        }

        for (let n2 of n.shadow.childNodes) {
          push(n2);
        }

        if (n instanceof UIBase) {
          scopestack.push(n);
          push(SCOPE_POP);
        }
      }
    })();
  }

  //load pos/size from screenverts
  loadFromVerts() {
    let old = [0, 0];
    for (let sarea of this.sareas) {
      old[0] = sarea.size[0];
      old[1] = sarea.size[1];

      sarea.loadFromVerts();
      sarea.on_resize(old);
      sarea.setCSS();
    }

    this.setCSS();
  }

  collapseArea(sarea) {
    sarea.remove();

    this.regenBorders();
    this.snapScreenVerts(true);
    this.solveAreaConstraints();
    this.completeSetCSS();
    this.completeUpdate();

    return this;
  }

  splitArea(sarea, t = 0.5, horiz = true) {
    let w = sarea.size[0], h = sarea.size[1];
    let x = sarea.pos[0], y = sarea.size[1];
    let s1, s2;

    if (!horiz) {
      s1 = sarea;
      if (s1.ctx === undefined) {
        s1.ctx = this.ctx;
      }
      s2 = s1.copy(this);

      s1.size[0] *= t;
      s2.size[0] *= (1.0 - t);

      s2.pos[0] += w * t;
    } else {
      s1 = sarea;
      if (s1.ctx === undefined) {
        s1.ctx = this.ctx;
      }
      s2 = s1.copy(this);

      s1.size[1] *= t;
      s2.size[1] *= (1.0 - t);

      s2.pos[1] += h * t;
    }

    s2.ctx = this.ctx;
    this.appendChild(s2);

    s1.on_resize(s1.size);
    s2.on_resize(s2.size);

    this.regenBorders();
    this.solveAreaConstraints();

    s1.setCSS();
    s2.setCSS();

    this.setCSS();

    //XXX not sure if this is right place to do this or really necassary
    if (s2.area !== undefined)
      s2.area.onadd();

    return s2;
  }

  setCSS() {
    if (!this.getBoolAttribute("inherit-scale")) {
      this.style["width"] = this.size[0] + "px";
      this.style["height"] = this.size[1] + "px";
    }

    //call setCSS on borders
    for (let key in this._edgemap) {
      let b = this._edgemap[key];

      b.setCSS();
    }
  }

  regenScreenMesh() {
    this.regenBorders();
  }

  regenBorders_stage2() {
    for (let b of this.screenborders) {
      b.halfedges = []
    }

    function hashHalfEdge(border, sarea) {
      return border._id + ":" + sarea._id;
    }

    function has_he(border, border2, sarea) {
      for (let he of border.halfedges) {
        if (border2 === he.border && sarea === he.sarea) {
          return true;
        }
      }

      return false;
    }

    for (let b1 of this.screenborders) {
      for (let sarea of b1.sareas) {
        let he = new ScreenHalfEdge(b1, sarea);
        b1.halfedges.push(he);
      }

      let axis = b1.horiz ? 1 : 0;

      let min = Math.min(b1.v1[axis], b1.v2[axis]);
      let max = Math.max(b1.v1[axis], b1.v2[axis]);

      for (let b2 of this.walkBorderLine(b1)) {
        if (b1 === b2) {
          continue;
        }

        let ok = b2.v1[axis] >= min && b2.v1[axis] <= max;
        ok = ok || (b2.v2[axis] >= min && b2.v2[axis] <= max);

        for (let sarea of b2.sareas) {
          let ok2 = ok && !has_he(b2, b1, sarea);
          if (ok2) {
            let he2 = new ScreenHalfEdge(b2, sarea);
            b1.halfedges.push(he2);
          }
        }

      }
    }


    for (let b of this.screenborders) {
      let movable = true;

      for (let sarea of b.sareas) {
        movable = movable && this.isBorderMovable(b);
      }

      b.movable = movable;
    }
  }

  hasBorder(b) {
    return b._id in this._idmap;
  }

  killScreenVertex(v) {
    this.screenverts.remove(v);

    delete this._edgemap[ScreenVert.hash(v)];
    delete this._idmap[v._id];

    return this;
  }

  freeBorder(b, sarea) {
    if (b.sareas.indexOf(sarea) >= 0) {
      b.sareas.remove(sarea);
    }

    let dels = [];

    for (let he of b.halfedges) {
      if (he.sarea === sarea) {
        dels.push([b, he]);
      }

      for (let he2 of he.border.halfedges) {
        if (he2 === he)
          continue;

        if (he2.sarea === sarea) {
          dels.push([he.border, he2]);
        }
      }
    }

    for (let d of dels) {
      if (d[0].halfedges.indexOf(d[1]) < 0) {
        console.warn("Double remove detected; use util.set?");
        continue;
      }

      d[0].halfedges.remove(d[1]);
    }

    if (b.sareas.length === 0) {
      this.killBorder(b);
    }
  }

  killBorder(b) {
    console.log("killing border", b._id, b);
    
    if (this.screenborders.indexOf(b) < 0) {
      console.log("unknown border", b);
      b.remove();
      return;
    }

    this.screenborders.remove(b);

    let del = [];

    for (let he of b.halfedges) {
      if (he === he2)
        continue;

      for (let he2 of he.border.halfedges) {
        if (he2.border === b) {
          del.push([he.border, he2]);
        }
      }
    }

    for (let d of del) {
      d[0].halfedges.remove(d[1]);
    }

    delete this._edgemap[ScreenBorder.hash(b.v1, b.v2)];
    delete this._idmap[b._id];

    b.v1.borders.remove(b);
    b.v2.borders.remove(b);

    if (b.v1.borders.length === 0) {
      this.killScreenVertex(b.v1);
    }
    if (b.v2.borders.length === 0) {
      this.killScreenVertex(b.v2);
    }

    b.remove();

    return this;
  }

  //XXX rename to regenScreenMesh
  regenBorders() {

    for (let b of this.screenborders) {
      b.remove();
      HTMLElement.prototype.remove.call(b);
    }

    this._idmap = {};
    this.screenborders = [];
    this._edgemap = {};
    this._vertmap = {};
    this.screenverts = []

    for (let sarea of this.sareas) {
      if (sarea.hidden) continue;

      sarea.makeBorders(this);
    }

    for (let key in this._edgemap) {
      let b = this._edgemap[key];

      b.setCSS();
    }

    this.regenBorders_stage2();
    this._recalcAABB();

    for (let b of this.screenborders) {
      b.outer = this.isBorderOuter(b);
      b.movable = this.isBorderMovable(b);
      b.setCSS();
    }

    this.updateDebugBoxes();
  }

  _get_debug_overlay() {
    if (!this._debug_overlay) {
      this._debug_overlay = UIBase.createElement("overdraw-x");
      let s = this._debug_overlay;

      s.startNode(this, this);
    }

    return this._debug_overlay;
  }

  updateDebugBoxes() {
    if (cconst.DEBUG.screenborders) {
      let overlay = this._get_debug_overlay();
      overlay.clear();

      for (let b of this.screenborders) {
        overlay.line(b.v1, b.v2, "red");
      }
      let del = [];
      for (let child of document.body.childNodes) {
        if (child.getAttribute && child.getAttribute("class") === "__debug") {
          del.push(child);
        }
      }
      for (let n of del) {
        n.remove();
      }

      let box = (x, y, s, text, color = "red") => {
        x -= s * 0.5;
        y -= s * 0.5;

        x = Math.min(Math.max(x, 0.0), this.size[0]-s);
        y = Math.min(Math.max(y, 0.0), this.size[1]-s);

        let ret = UIBase.createElement("div");
        ret.setAttribute("class", "__debug");


        ret.style["position"] = "absolute";
        ret.style["left"] = x + "px";
        ret.style["top"] = y + "px";
        ret.style["height"] = s + "px";
        ret.style["width"] = s + "px";//"200px";
        ret.style["z-index"] = "1000";
        ret.style["pointer-events"] = "none";
        ret.style["padding"] = ret.style["margin"] = "0px";
        ret.style['display'] = "float";
        ret.style["background-color"] = color;
        document.body.appendChild(ret);

        let colors = [
          "orange",
          "black",
          "white",
        ];

        for (let i=2; i>=0; i--) {
          ret = UIBase.createElement("div");

          ret.setAttribute("class", "__debug");

          ret.style["position"] = "absolute";
          ret.style["left"] = x + "px";
          ret.style["top"] = y + "px";
          ret.style["height"] = s + "px";
          ret.style["width"] = "250px";//"200px";
          ret.style["z-index"] = ""+(1005-i-1);
          ret.style["pointer-events"] = "none";
          ret.style["color"] = colors[i];

          let w = (i)*2;
          ret.style["-webkit-text-stroke-width"] = w + "px";
          ret.style["-webkit-text-stroke-color"] = colors[i];
          ret.style["text-stroke-width"] = w + "px";
          ret.style["text-stroke-color"] = colors[i];

          ret.style["padding"] = ret.style["margin"] = "0px";
          ret.style['display'] = "float";
          ret.style["background-color"] = "rgba(0,0,0,0)";
          ret.innerText = ""+text;
          document.body.appendChild(ret);
        }

      };

      for (let v of this.screenverts) {
        box(v[0], v[1], 10 * v.borders.length, ""+v.borders.length, "rgba(255,0,0,0.5)");
      }

      for (let b of this.screenborders) {
        for (let he of b.halfedges) {
          let txt = `${he.side}, ${b.sareas.length}, ${b.halfedges.length}`;
          let p = new Vector2(b.v1).add(b.v2).mulScalar(0.5);
          let size = 10 * b.halfedges.length;

          let wadd = 25+size*0.5;
          let axis = b.horiz & 1;

          if (p[axis] > he.sarea.pos[axis]) {
            p[axis] -= wadd;
          } else {
            p[axis] += wadd;
          }
          box(p[0], p[1], size, txt, "rgba(155,255,75,0.5)")
        }
      }
    }
  }

  checkAreaConstraint(sarea, checkOnly=false) {
    let min = sarea.minSize, max = sarea.maxSize;
    let vs = sarea._verts;
    let chg = 0.0;
    let mask = 0;

    let moveBorder = (sidea, sideb, dh) => {
      let b1 = sarea._borders[sidea];
      let b2 = sarea._borders[sideb];
      let bad = 0;

      for (let i=0; i<2; i++) {
        let b = i ? b2 : b1;
        let bad2 = sarea.borderLock & (1<<sidea);

        bad2 = bad2 || !b.movable;
        bad2 = bad2 || this.isBorderOuter(b);

        if (bad2)
          bad |= 1<<i;
      }

      if (bad === 0) {
        this.moveBorder(b1, dh*0.5);
        this.moveBorder(b2, -dh*0.5);
      } else if (bad === 1) {
        this.moveBorder(b2, -dh);
      } else if (bad === 2) {
        this.moveBorder(b1, dh);
      } else if (bad === 3) {
        //both borders are bad, yet we need to move anyway. . .
        //console.warn("got case of two borders being bad");

        if (!this.isBorderOuter(b1)) {
          this.moveBorder(b1, dh);
        } else if (!this.isBorderOuter(b2)) {
          this.moveBorder(b2, -dh);
        } else {
          this.moveBorder(b1, dh * 0.5);
          this.moveBorder(b2, -dh * 0.5);
        }
      }
    };

    if (max[0] !== undefined && sarea.size[0] > max[0]) {
      let dh = (sarea.size[0] - max[0]) ;
      chg += Math.abs(dh);
      mask |= 1;

      moveBorder(0, 2, dh);
    }

    if (min[0] !== undefined && sarea.size[0] < min[0]) {
      let dh = (min[0] - sarea.size[0]);
      chg += Math.abs(dh);
      mask |= 2;

      moveBorder(2, 0, dh);
    }


    if (max[1] !== undefined && sarea.size[1] > max[1]) {
      let dh = (sarea.size[1] - max[1]);
      chg += Math.abs(dh);
      mask |= 4;

      moveBorder(3, 1, dh);
    }

    if (min[1] !== undefined && sarea.size[1] < min[1]) {
      let dh = (min[1] - sarea.size[1]) ;
      chg += Math.abs(dh);
      mask |= 8;

      moveBorder(1, 3, dh);
    }
    
    if (sarea.pos[0]+sarea.size[0] > this.size[0]) {
      mask |= 16;
      let dh = ((this.size[0] - sarea.size[0]) - sarea.pos[0]);

      chg += Math.abs(dh);

      if (sarea.floating) {
        sarea.pos[0] = this.size[0] - sarea.size[0];
        sarea.loadFromPosSize();
      } else {
        this.moveBorder(sarea._borders[0], dh);
        this.moveBorder(sarea._borders[2], dh);
      }
    }
    
    if (chg === 0.0) {
      return false;
    }

    return mask;
  }

  walkBorderLine(b) {
    let visit = new util.set();
    let ret = [b];
    visit.add(b);

    let rec = (b, v) => {
      for (let b2 of v.borders) {
        if (b2 === b) {
          continue;
        }

        if (b2.horiz === b.horiz && !visit.has(b2)) {
          visit.add(b2);
          ret.push(b2);
          rec(b2, b2.otherVertex(v));
        }
      }
    }

    rec(b, b.v1);
    let ret2 = ret;
    ret = [];

    rec(b, b.v2);
    ret2.reverse();

    return ret2.concat(ret);
  }

  moveBorderWithoutVerts(halfedge, df) {
    let side = halfedge.side;
    let sarea = halfedge.sarea;

    switch (side) {
      case 0:
        sarea.pos[0] += df;
        sarea.size[0] -= df;
        break;
      case 1:
        sarea.size[1] += df;
        break;
      case 2:
        sarea.size[0] += df;
        break;
      case 3:
        sarea.pos[1] += df;
        sarea.size[1] -= df;
        break;
    }
  }

  moveBorder(b, df, strict=true) {
    return this.moveBorderSimple(b, df, strict);
  }

  moveBorderSimple(b, df, strict=true) {
    let axis = b.horiz & 1;
    let axis2 = axis^1;

    let min = Math.min(b.v1[axis2], b.v2[axis2]);
    let max = Math.max(b.v1[axis2], b.v2[axis2]);

    let test = (v) => {
      return v[axis2] >= min && v[axis2] <= max;
    };

    let vs = new util.set();

    for (let b2 of this.walkBorderLine(b)) {
      if (strict && !test(b2.v1) && !test(b2.v2)) {
        return false;
      }

      vs.add(b2.v1);
      vs.add(b2.v2);
    }

    for (let v of vs) {
      v[axis] += df;
    }

    for (let v of vs) {
      for (let b of v.borders) {
        for (let sarea of b.sareas) {
          sarea.loadFromVerts();
        }
      }
    }
    return true;
  }

  moveBorderUnused(b, df, strict=true) {
    if (!b) {
      console.warn("missing border");
      return false;
    }

    let axis = b.horiz & 1;

    let vs = new util.set();

    let visit = new util.set();

    let axis2 = axis^1;

    let min = Math.min(b.v1[axis2], b.v2[axis2]);
    let max = Math.max(b.v1[axis2], b.v2[axis2]);

    let test = (v) => {
      return v[axis2] >= min && v[axis2] <= max;
    };

    let first = true;
    let found = false;
    let halfedges = new util.set();
    let borders = new util.set();

    for (let b2 of this.walkBorderLine(b)) {
      /*
      if (first) {
        first = false;
        df = Math.max(Math.abs(df), FrameManager_mesh.SnapLimit) * Math.sign(df);
      }
      found = true;
      for (let sarea of b2.sareas) {
        halfedges.add(new ScreenHalfEdge(b2, sarea))
      }
      vs.add(b2.v1);
      vs.add(b2.v2);
      continue;
      //*/

      if (!strict) {
        vs.add(b2.v1);
        vs.add(b2.v2);
        continue;
      }


      let t1 = test(b2.v1), t2 = test(b2.v2);

      if (!t1 || !t2) {
        found = true;

        if (first) {
          first = false;
          df = Math.max(Math.abs(df), FrameManager_mesh.SnapLimit) * Math.sign(df);
        }
      }
      if (!t1 && !t2) {
        continue;
      }

      borders.add(b2);

      //make dummy half edges to keep track of border/sarea pairs
      //and especailly what the border side is
      for (let sarea of b2.sareas) {
        halfedges.add(new ScreenHalfEdge(b2, sarea))
      }

      vs.add(b2.v1);
      vs.add(b2.v2);
    }

    for (let b2 of this.walkBorderLine(b)) {
      if (borders.has(b2)) {
        continue;
      }

      for (let he of b2.halfedges) {
        borders.remove(he.border);
        if (halfedges.has(he)) {
          halfedges.remove(he);
        }
      }
    }

    for (let v of vs) {
      let ok = v[axis2] >= min && v[axis2] <= max;

      if (!ok && strict) {
     //   return false;
      }
    }

    if (!found || !strict) {
      for (let v of vs) {
        v[axis] += df;
      }
    } else {
      let borders = new util.set();

      for (let he of halfedges) {
        borders.add(he.border);
        this.moveBorderWithoutVerts(he, df);
      }

      for (let he of halfedges) {
        he.sarea.loadFromPosSize();
      }

      for (let b of borders) {
        let sareas = b.sareas.slice(0, b.sareas.length);

        this.killBorder(b);
        for (let sarea of sareas) {
          sarea.loadFromPosSize();
        }
      }

      return halfedges.length > 0;
    }


    for (let sarea of b.sareas) {
      sarea.loadFromVerts();
    }

    for (let he of b.halfedges) {
      he.sarea.loadFromVerts();

      for (let sarea of he.border.sareas) {
        sarea.loadFromVerts();
        for (let b2 of sarea._borders) {
          b2.setCSS();
        }
      }
    }

    b.setCSS();

    return true;
  }

  solveAreaConstraints(snapArgument=true) {
    let repeat = false;
    let found = false;

    let time = util.time_ms();

    for (let i=0; i<10; i++) {
      repeat = false;

      for (let sarea of this.sareas) {
        if (sarea.hidden) continue;

        repeat = repeat || this.checkAreaConstraint(sarea);
      }

      found = found || repeat;

      if (repeat) {
        for (let sarea of this.sareas) {
          sarea.loadFromVerts();
        }

        this.snapScreenVerts(snapArgument);
      } else {
        break;
      }
    }

    if (found) {
      this.snapScreenVerts(snapArgument);
      if (cconst.DEBUG.areaConstraintSolver) {
        time = util.time_ms() - time;

        console.log(`enforced area constraint ${time.toFixed(2)}ms`);
      }
      this._recalcAABB();
      this.setCSS();
    }
  }

  snapScreenVerts(fitToSize=true) {
    let this2 = this;
    function* screenverts() {
      for (let v of this2.screenverts) {
        let ok = 0;

        for (let sarea of v.sareas) {
          if (!(sarea.flag & AreaFlags.INDEPENDENT)) {
            ok  = 1;
          }
        }

        if (ok) {
          yield v;
        }
      }
    }

    let mm = new math.MinMax(2);
    for (let v of screenverts()) {
      mm.minmax(v);
    }

    let min = mm.min, max = mm.max;

    //snap(min);
    //snapi(max);

    if (fitToSize) {
      //fit entire screen to, well, the entire screen (size)
      let vec = new Vector2(max).sub(min);
      let sz = new Vector2(this.size);

      sz.div(vec);

      for (let v of screenverts()) {
        v.sub(min).mul(sz);
        //snap(v.sub(min).mul(sz));//.add(this.pos);
      }

      for (let v of screenverts()) {
        v[0] += this.pos[0];
        v[1] += this.pos[1];
      }

      //this.pos.zero();
    } else {
      for (let v of screenverts()) {
        //snap(v);
      }

      [min, max] = this._recalcAABB();

      //snap(min);
      //snapi(max);

      this.size.load(max).sub(min);
      //this.pos.zero();
      //this.pos.load(min);
    }

    let found = 1;

    for (let sarea of this.sareas) {
      if (sarea.hidden) continue;

      let old = new Vector2(sarea.size);
      let oldpos = new Vector2(sarea.pos);

      sarea.loadFromVerts();

      found = found || old.vectorDistance(sarea.size) > 1;
      found = found || oldpos.vectorDistance(sarea.pos) > 1;

      sarea.on_resize(old);
    }

    if (found) {
      //this.regenBorders();
      this._recalcAABB();
      this.setCSS();
    }
  }

  on_resize(oldsize, newsize=this.size, _set_key=true) {
    //console.warn("resizing");

    if (_set_key) {
      this._last_ckey1 = this._calcSizeKey(newsize[0], newsize[1], this.pos[0], this.pos[1], devicePixelRatio, visualViewport.scale);
    }

    let ratio = [newsize[0] / oldsize[0], newsize[1] / oldsize[1]];

    let offx = this.pos[0] - this.oldpos[0];
    let offy = this.pos[1] - this.oldpos[1];

    this.oldpos.load(this.pos);

    //console.log("resize!", ratio);

    for (let v of this.screenverts) {
      v[0] *= ratio[0];
      v[1] *= ratio[1];
      v[0] += offx;
      v[1] += offy;
    }

    let min = [1e17, 1e17], max = [-1e17, -1e17];
    let olds = [];

    for (let sarea of this.sareas) {
      olds.push([sarea.size[0], sarea.size[1]]);

      sarea.loadFromVerts();
    }

    this.size[0] = newsize[0];
    this.size[1] = newsize[1];

    this.snapScreenVerts();
    this.solveAreaConstraints();
    this._recalcAABB();


    let i = 0;
    for (let sarea of this.sareas) {
      sarea.on_resize(sarea.size, olds[i]);
      sarea.setCSS();
      i++;
    }

    this.regenBorders();
    this.setCSS();
    this.calcTabOrder();

    this._fireResizeCB(oldsize);
  }

  _fireResizeCB(oldsize=this.size) {
    for (let cb of this._resize_callbacks) {
      cb(oldsize);
    }
  }

  getScreenVert(pos, added_id="") {
    let key = ScreenVert.hash(pos, added_id);

    if (!(key in this._vertmap)) {
      let v = new ScreenVert(pos, this.idgen++, added_id);

      this._vertmap[key] = v;
      this._idmap[v._id] = v;

      this.screenverts.push(v);
    }

    return this._vertmap[key];
  }

  isBorderOuter(border) {
    let sides = 0;

    for (let he of border.halfedges) {
      sides |= 1 << he.side;
    }

    let bits = 0;
    for (let i=0; i<4; i++) {
      bits += (sides & (1<<i)) ? 1 : 0;
    }

    let ret = bits < 2;
    let floating = false;

    for (let sarea of border.sareas) {
      floating = floating || sarea.floating;
    }

    if (floating) {
      //check if border is on screen limits
      let axis = border.horiz ? 1 : 0;

      ret = Math.abs(border.v1[axis] - this.pos[axis]) < 4;
      ret = ret || Math.abs(border.v1[axis] - this.pos[axis] - this.size[axis]) < 4;
    }

    border.outer = ret;
    return ret;
  }

  isBorderMovable(b, limit = 5) {
    if (this.allBordersMovable)
      return true;

    for (let he of b.halfedges){
      if (he.sarea.borderLock & (1<<he.side)) {
        return false;
      }
    }

    let ok = !this.isBorderOuter(b);

    for (let sarea of b.sareas) {
      if (sarea.floating) {
        ok = true;
        break;
      }
    }

    return ok;
  }

  getScreenBorder(sarea, v1, v2, side) {
    let suffix = sarea._get_v_suffix();

    if (!(v1 instanceof ScreenVert)) {
      v1 = this.getScreenVert(v1, suffix);
    }

    if (!(v2 instanceof ScreenVert)) {
      v2 = this.getScreenVert(v2, suffix);
    }

    let hash = ScreenBorder.hash(v1, v2);

    if (!(hash in this._edgemap)) {
      let sb = this._edgemap[hash] = UIBase.createElement("screenborder-x");

      sb.screen = this;
      sb.v1 = v1;
      sb.v2 = v2;
      sb._id = this.idgen++;

      v1.borders.push(sb);
      v2.borders.push(sb);

      sb.ctx = this.ctx;

      this.screenborders.push(sb);
      this.appendChild(sb);

      sb.setCSS();

      this._edgemap[hash] = sb;
      this._idmap[sb._id] = sb;
    }

    return this._edgemap[hash];
  }

  minmaxArea(sarea, mm = undefined) {
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

    src.loadFromPosSize();

    if (this.sareas.indexOf(src) < 0) {
      this.appendChild(src);
    }

    src.setCSS();

    //this.sareas.remove(dst);
    //dst.remove();

    this.removeArea(dst);

    this.regenScreenMesh();
    this.snapScreenVerts();
    this._updateAll();
  }

  //regenerates borders, sets css and calls this.update

  _internalRegenAll() {
    this.snapScreenVerts();
    this._recalcAABB();
    this.calcTabOrder();
    this.setCSS();
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

    for (let i=0; i<2; i++) {
      this.snapScreenVerts();
      this.regenScreenMesh();
    }

    this._updateAll();
    this.drawUpdate();
  }

  appendChild(child) {
    /*
    if (child instanceof UIBase) {
      if (child._useDataPathUndo === undefined) {
        child.useDataPathUndo = this.useDataPathUndo;
      }
    }*/

    if (child instanceof ScreenArea.ScreenArea) {
      child.screen = this;
      child.ctx = this.ctx;
      child.parentWidget = this;

      this.sareas.push(child);

      if (child.size.dot(child.size) === 0) {
        child.size[0] = this.size[0];
        child.size[1] = this.size[1];
      }

      if (!child._has_evts) {
        child._has_evts = true;

        let onfocus = (e) => {
          this.sareas.active = child;
        }

        let onblur = (e) => {
          //XXX this is causing bugs

          //if (this.sareas.active === child) {
          //  this.sareas.active = undefined;
          //}
        }

        child.addEventListener("focus", onfocus);
        child.addEventListener("mouseenter", onfocus);
        child.addEventListener("blur", onblur);
        child.addEventListener("mouseleave", onblur);
      }

      this.regenBorders();
      child.setCSS();
      this.drawUpdate();
      child._init();
    }

    return this.shadow.appendChild(child);
    //return super.appendChild(child);
  }

  add(child) {
    return this.appendChild(child);
  }

  hintPickerTool() {
    (new FrameManager_ops.ToolTipViewer(this)).start();
  }

  splitTool() {
    console.log("screen split!");

    let tool = new FrameManager_ops.SplitTool(this);
    //let tool = new FrameManager_ops.AreaDragTool(this, undefined, this.mpos);
    tool.start();
  }

  areaDragTool(sarea = this.sareas.active) {
    if (sarea === undefined) {
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

  on_keydown(e) {
    if (checkForTextBox(this, this.mpos[0], this.mpos[1])) {
      console.log("textbox detected");
      return;
    }

    if (!haveModal() && this.execKeyMap(e)) {
      e.preventDefault();
      return;
    }

    if (!haveModal() && this.sareas.active !== undefined && this.sareas.active.on_keydown) {
      let area = this.sareas.active;
      return this.sareas.active.on_keydown(e);
    }
  }

  on_keyup(e) {
    if (!haveModal() && this.sareas.active !== undefined && this.sareas.active.on_keyup) {
      return this.sareas.active.on_keyup(e);
    }
  }

  on_keypress(e) {
    if (!haveModal() && this.sareas.active !== undefined && this.sareas.active.on_keypress) {
      return this.sareas.active.on_keypress(e);
    }
  }

  draw() {
    for (let sarea of this.sareas) {
      sarea.draw();
    }
  }

  static newSTRUCT() {
    return UIBase.createElement(this.define().tagname);
  }

  afterSTRUCT() {
    for (let sarea of this.sareas) {
      sarea._ctx = this.ctx;
      sarea.afterSTRUCT();
    }
  }

  loadSTRUCT(reader) {
    this.clear();

    reader(this);
    console.log("SAREAS", this.sareas.concat([]));

    //handle old files that might have saved as simple arrays
    this.size = new Vector2(this.size);

    let sareas = this.sareas;
    this.sareas = [];

    /*
    let push = this.sareas.push;

    this.sareas.push = function(item) {
      console.error("this.sareas.push", item);
      push.call(this, item);
    }
    */

    for (let sarea of sareas) {
      sarea.screen = this;
      sarea.parentWidget = this;

      this.appendChild(sarea);
    }

    this.regenBorders();
    this.setCSS();

    this.doOnce(() => {
      this.loadUIData(this.uidata);
      this.uidata = undefined;
    });

    return this;
  }

  test_struct(appstate=_appstate) {
    let data = [];
    //let scripts = nstructjs.write_scripts();
    nstructjs.manager.write_object(data, this);
    data = new DataView(new Uint8Array(data).buffer);

    let screen2 = nstructjs.manager.read_object(data, this.constructor);
    screen2.ctx = this.ctx;

    for (let sarea of screen2.sareas) {
      sarea.screen = screen2;
      sarea.ctx = this.ctx;
      sarea.area.ctx = this.ctx;
    }

    let parent = this.parentElement;
    this.remove();

    appstate.screen = screen2;

    parent.appendChild(screen2);

    //for (let 
    screen2.regenBorders();
    screen2.update();
    screen2.listen();

    screen2.doOnce(() => {
      screen2.on_resize(screen2.size, [window.innerWidth, window.innerHeight]);
    });

    console.log(data)
    return screen2;
  }

  saveUIData() {
    try {
      return ui_base.saveUIData(this, "screen");
    } catch (error) {
      util.print_stack(error);
      console.log("Failed to save UI state data");
    }
  }

  loadUIData(str) {
    try {
      ui_base.loadUIData(this, str);
    } catch (error) {
      util.print_stack(error);
      console.log("Failed to load UI state data");
    }
  }
}

Screen.STRUCT = `
pathux.Screen { 
  size  : vec2;
  pos   : vec2;
  sareas : array(pathux.ScreenArea);
  idgen : int;
  uidata : string | obj.saveUIData();
}
`;

nstructjs.manager.add_class(Screen);
ui_base.UIBase.internalRegister(Screen);

ScreenArea.setScreenClass(Screen);
_setScreenClass(Screen);


let get_screen_cb;
let _on_keydown;

let start_cbs = [];
let stop_cbs = [];
let keyboardDom = window;

let key_event_opts = undefined;

export function startEvents(getScreenFunc) {
  get_screen_cb = getScreenFunc;

  if (_events_started) {
    return;
  }

  _events_started = true;

  _on_keydown = (e) => {
    let screen = get_screen_cb();

    return screen.on_keydown(e);
  };

  window.addEventListener("keydown", _on_keydown, key_event_opts);

  for (let cb of start_cbs) {
    cb();
  }
}

export function stopEvents() {
  window.removeEventListener("keydown", _on_keydown, key_event_opts);
  _on_keydown = undefined;
  _events_started = false;

  for (let cb of stop_cbs) {
    try {
      cb();
    } catch (error) {
      util.print_stack(error);
    }
  }

  return get_screen_cb;
}

export function setKeyboardDom(dom) {
  let started = _events_started;
  if (started) {
    stopEvents();
  }

  keyboardDom = dom;

  if (started) {
    startEvents(get_screen_cb);
  }
}

/** Sets options passed to addEventListener() for on_keydown hotkey handler */
export function setKeyboardOpts(opts) {
  key_event_opts = opts;
}

export function _onEventsStart(cb) {
  start_cbs.push(cb);
}

export function _onEventsStop(cb) {
  stop_cbs.push(cb);
}

/*
document.addEventListener("touchstart", (e) => {
  e.preventDefault();
}, {capture : true});
document.addEventListener("touchmove", (e) => {
  e.preventDefault();
}, {capture : true});
document.addEventListener("scroll", (e) => {
  e.preventDefault();
}, {capture : true});
document.addEventListener("resize", (e) => {
  e.preventDefault();
}, {capture : true});
document.addEventListener("pointerdown", (e) => {
  e.preventDefault();
}, {capture : true});
document.addEventListener("pointerstart", (e) => {
  e.preventDefault();
}, {capture : true});
document.addEventListener("pointermove", (e) => {
  e.preventDefault();
}, {capture : true});
*/