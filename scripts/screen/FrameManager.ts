import "../widgets/dragbox.js";
import "../widgets/ui_widgets2.js";
import "../widgets/ui_panel.js";
import "../widgets/ui_treeview.js";

import { DataPathError, isMouseDown, nstructjs, ToolStack } from "../path-controller/controller.js";

import "../util/ScreenOverdraw.js";
import cconst from "../config/const.js";
import { haveModal, _setScreenClass } from "../path-controller/util/simple_events.js";
import * as util from "../path-controller/util/util.js";
import "../widgets/ui_curvewidget.js";
import { Vector2, Number2 } from "../path-controller/util/vectormath.js";
import { ScreenArea, Area } from "./ScreenArea.js";
import * as FrameManager_ops from "./FrameManager_ops.js";
import * as math from "../path-controller/util/math.js";
import * as ui_menu from "../widgets/ui_menu.js";
import "../path-controller/util/struct.js";
import { KeyMap } from "../path-controller/util/simple_events.js";
import { keymap } from "../path-controller/util/simple_events.js";

import { ScreenBorder, ScreenVert, ScreenHalfEdge, SnapLimit } from "./FrameManager_mesh.js";

export { ScreenBorder, ScreenVert, ScreenHalfEdge } from "./FrameManager_mesh.js";
import {
  theme,
  PackFlags,
  UIBase,
  styleScrollBars,
  saveUIData,
  loadUIData,
  IUIBaseConstructor,
  ThemeScrollBars,
} from "../core/ui_base";
import * as FrameManager_mesh from "./FrameManager_mesh.js";
import { makePopupArea } from "../widgets/ui_dialog.js";

import "../widgets/ui_widgets.js";
import "../widgets/ui_tabs.js";
import "../widgets/ui_colorpicker2.js";
import "../widgets/ui_noteframe.js";
import "../widgets/ui_listbox.js";
import "../widgets/ui_table.js";
import { AreaFlags } from "./ScreenArea.js";
import { checkForTextBox } from "../widgets/ui_textbox.js";
import { startMenu } from "../widgets/ui_menu.js";
import { IsScreenTag } from "./constants.js";
import { IContextBase } from "../core/context_base.js";
import { StructReader } from "../util/nstructjs.js";
import { AreaConstructor } from "./area_base.js";
import "./AreaDocker";

const list = Array.from;

ui_menu.startMenuEventWrangling();

let _events_started = false;

export function registerToolStackGetter(func: () => ToolStack) {
  FrameManager_ops.registerToolStackGetter(func);
}

class UpdateStack extends Array<UIBase | HTMLElement | undefined> {
  cur = 0;
}
const update_stack = new UpdateStack();
update_stack.cur = 0;

let screen_idgen = 0;

export function purgeUpdateStack() {
  for (let i = 0; i < update_stack.length; i++) {
    update_stack[i] = undefined;
  }
}

/**
 * Base class for app workspaces
 *
 attributes:

 inherit-scale : don't resize to fit whole screen, use cssbox scaling

 */
export class Screen<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `pathux.Screen { 
       size  : vec2;
       pos   : vec2;
       sareas : array(pathux.ScreenArea);
       idgen : int;
       uidata : string | obj.saveUIData();
    }`
  );

  [IsScreenTag] = true;
  snapLimit: number;
  fullScreen: boolean;

  globalCSS: HTMLStyleElement;
  _do_updateSize: boolean;
  _resize_callbacks: ((size: Vector2) => void)[];
  allBordersMovable: boolean;
  needsBorderRegen: boolean;
  _popup_safe: number;
  testAllKeyMaps: boolean;
  needsTabRecalc: boolean;
  _screen_id: number;
  _popups: UIBase[];
  keymap: KeyMap;
  size: Vector2;
  pos: Vector2;
  oldpos: Vector2;
  idgen: number;
  sareas: ScreenArea<CTX>[] & { active?: ScreenArea<CTX> };
  mpos: [number, number];
  screenborders: ScreenBorder<CTX>[];
  screenverts: ScreenVert<CTX>[];
  _vertmap: Record<string, ScreenVert<CTX>>;
  _edgemap: Record<string, ScreenBorder<CTX>>;
  _idmap: Record<string, ScreenVert<CTX> | ScreenBorder<CTX>>;
  _aabb: [Vector2, Vector2];
  listen_timer?: any;
  _last_ckey1?: string;
  _update_gen?: Generator<void>;
  _last_scrollstyle_key?: string;
  _debug_overlay?: HTMLElement;
  uidata?: string;

  constructor() {
    super();

    this.snapLimit = 1;
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

    this._ctx = undefined as unknown as typeof this._ctx;

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

    const on_mousemove = (e: MouseEvent, x: number, y: number) => {
      //let elem = this.pickElement(x, y, 1, 1, ScreenArea);
      let dragging = e.type === "mousemove" || e.type === "touchmove" || e.type === "pointermove";
      dragging = dragging && isMouseDown(e);

      /*
      make sure active area is up to date.
      but don't call pickElement too often as it's slow
      */
      if (!dragging && Math.random() > 0.9) {
        const elem = this.pickElement<ScreenArea<CTX>>(x, y, {
          nodeclass : ScreenArea,
          mouseEvent: e,
        });

        if (elem !== undefined) {
          if (elem.area) {
            //make sure context area stacks are up to date
            elem.area.push_ctx_active();
            elem.area.pop_ctx_active();
          }

          this.sareas.active = elem;
        }
      }

      this.mpos[0] = x;
      this.mpos[1] = y;
    };
    this.shadow.addEventListener(
      "mousemove",
      (e) => {
        const e2 = e as unknown as MouseEvent;
        return on_mousemove(e2, e2.x, e2.y);
      },
      { passive: true }
    );

    /*UIBase forwards touch events already
    this.shadow.addEventListener("touchmove", (e) => {
      if (e.touches.length === 0) {
        return;
      }

      return on_mousemove(e, e.touches[0].pageX, e.touches[0].pagesY);
    }, {passive : true});
    */
  }

  get borders() {
    const this2 = this;

    return (function* () {
      for (const k in this2._edgemap) {
        yield this2._edgemap[k];
      }
    })();
  }

  get listening() {
    return this.listen_timer !== undefined;
  }

  get ctx() {
    return this._ctx;
  }

  set ctx(val) {
    this._ctx = val;

    //fully recurse tree
    const rec = (n: Node & { shadow?: ShadowRoot; ctx?: unknown }) => {
      if (n instanceof UIBase) {
        n.ctx = val;
      }

      for (const n2 of n.childNodes) {
        rec(n2);
      }

      if (n.shadow) {
        for (const n2 of n.shadow.childNodes) {
          rec(n2);
        }
      }
    };

    for (const n of this.childNodes) {
      rec(n);
    }

    for (const n of this.shadow.childNodes) {
      rec(n);
    }
  }

  static fromJSON(obj: Record<string, unknown>, schedule_resize = false) {
    const ret = UIBase.createElement(this.define().tagname) as Screen;
    return ret.loadJSON(obj, schedule_resize);
  }

  static define() {
    return {
      tagname: "pathux-screen-x",
    };
  }

  static newSTRUCT() {
    return UIBase.createElement(this.define().tagname);
  }

  setPosSize(x: number, y: number, w: number, h: number) {
    this.pos[0] = x;
    this.pos[1] = y;
    this.size[0] = w;
    this.size[1] = h;

    this.setCSS();
    this._internalRegenAll();
  }

  setSize(w: number, h: number) {
    this.size[0] = w;
    this.size[1] = h;

    this.setCSS();
    this._internalRegenAll();
  }

  setPos(x: number, y: number) {
    this.pos[0] = x;
    this.pos[1] = y;

    this.setCSS();
    this._internalRegenAll();
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
  mergeGlobalCSS(style: string | CSSStyleSheet | HTMLStyleElement) {
    return new Promise<void>((accept, reject) => {
      let sheet: CSSStyleSheet | undefined;

      const finish = () => {
        const sheet2 = this.globalCSS.sheet;
        if (!sheet2) {
          this.doOnce(finish);
          return;
        }

        const map: Record<string, CSSStyleRule> = {};
        for (const rule of sheet2.cssRules) {
          if (rule instanceof CSSStyleRule) {
            map[rule.selectorText] = rule;
          }
        }

        for (const rule of sheet!.cssRules) {
          if (!(rule instanceof CSSStyleRule)) continue;
          const k = rule.selectorText;
          if (k in map) {
            const rule2 = map[k];

            if (!(rule as any).styleMap) {
              //handle firefox
              // eslint-disable-next-line @typescript-eslint/no-for-in-array
              for (const k in rule.style) {
                const desc = Object.getOwnPropertyDescriptor(rule.style, k);

                if (!desc?.writable) {
                  continue;
                }
                const v = (rule.style as any)[k];

                if (v) {
                  (rule2.style as any)[k] = (rule.style as any)[k];
                }
              }
              continue;
            }
            for (const [key, val] of Array.from(rule.styleMap.entries())) {
              if (1 || (rule2 as any).styleMap.has(key)) {
                //rule2.styleMap.delete(key);
                let sval = "";

                if (Array.isArray(val)) {
                  for (const item of val) {
                    sval += " " + val;
                  }
                  sval = sval.trim();
                } else {
                  sval = ("" + val).trim();
                }

                (rule2.style as any)[key] = sval;
                (rule2 as any).styleMap.set(key, val);
              } else {
                (rule2 as any).styleMap.append(key, val);
              }
            }
          } else {
            sheet2.insertRule(rule.cssText);
          }
        }
      };

      if (typeof style === "string") {
        try {
          //stupid firefox
          sheet = new CSSStyleSheet();
        } catch (error) {
          sheet = undefined;
        }

        if (sheet?.replaceSync) {
          sheet.replaceSync(style);
          finish();
        } else {
          const tag = document.createElement("style");
          tag.textContent = style;
          document.body.appendChild(tag);

          const cb = () => {
            if (!tag.sheet) {
              this.doOnce(cb);
              return;
            }

            sheet = tag.sheet;
            finish();
            tag.remove();
          };

          this.doOnce(cb);
        }
      } else if (!(style instanceof CSSStyleSheet)) {
        sheet = style.sheet ?? undefined;
        finish();
      } else {
        sheet = style;
        finish();
      }
    });
  }

  newScreenArea() {
    const ret = UIBase.createElement("screenarea-x") as ScreenArea;
    ret.ctx = this.ctx;

    if (ret.ctx) {
      ret.init();
    }

    return ret;
  }

  copy() {
    const ret = UIBase.createElement((this.constructor as unknown as typeof Screen).define().tagname) as Screen<CTX>;
    ret.ctx = this.ctx;
    ret._init();

    for (const sarea of this.sareas) {
      const sarea2 = sarea.copy(ret);

      sarea2._ctx = this.ctx;
      sarea2.screen = ret;
      sarea2.parentWidget = ret;

      ret.appendChild(sarea2);
    }

    for (const sarea of ret.sareas) {
      sarea.ctx = this.ctx;
      sarea.area!.ctx = this.ctx;

      sarea.area!.push_ctx_active();
      sarea._init();
      sarea.area!._init();
      sarea.area!.pop_ctx_active();

      for (const area of sarea.editors) {
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

  findScreenArea(x: number, y: number) {
    for (let i = this.sareas.length - 1; i >= 0; i--) {
      const sarea = this.sareas[i];

      let ok = x >= sarea.pos[0] && x <= sarea.pos[0] + sarea.size[0];
      ok = ok && y >= sarea.pos[1] && y <= sarea.pos[1] + sarea.size[1];

      if (ok) {
        return sarea;
      }
    }
  }

  pickElement<T extends UIBase<CTX> = UIBase<CTX>>(
    x: number,
    y: number,
    args: Parameters<UIBase<CTX>["pickElement"]>[2] = {},
    marginy = 0,
    nodeclass?: IUIBaseConstructor<UIBase<CTX>>,
    excluded_classes?: IUIBaseConstructor[]
  ): T | undefined {
    if (typeof args === "object") {
      nodeclass = args.nodeclass as unknown as IUIBaseConstructor<UIBase<CTX>>;
      excluded_classes = args.excluded_classes;
    } else {
      args = {
        nodeclass,
        excluded_classes,
      };
    }

    if (!this.ctx) {
      console.warn("no ctx in screen");
      return;
    }

    let ret: UIBase | undefined;
    for (let i = this._popups.length - 1; i >= 0; i--) {
      const popup = this._popups[i];
      ret = ret || popup.pickElement(x, y, args);
    }
    ret = ret || super.pickElement(x, y, args);
    return ret as unknown as T;
  }

  _enterPopupSafe() {
    if (this._popup_safe === undefined) {
      this._popup_safe = 0;
    }

    this._popup_safe++;
  }

  *_allAreas() {
    for (const sarea of this.sareas) {
      for (const area of sarea.editors) {
        yield [area, area._area_id, sarea];
      }
    }
  }

  _exitPopupSafe() {
    this._popup_safe = Math.max(this._popup_safe - 1, 0);
  }

  popupMenu(menu: ui_menu.Menu<CTX>, x: number, y: number) {
    startMenu(menu, x, y);

    for (let i = 0; i < 3; i++) {
      menu.flushSetCSS();
      menu.flushUpdate();
    }

    return menu;
  }

  /**
   *
   * @param popupDelay : if non-zero, wait for popup to layout for popupDelay miliseconds,
   *                     then move the popup so it's fully inside the window (if it's outsize).
   *
   * */
  popup(owning_node: UIBase, elem_or_x: UIBase | number, y: number, closeOnMouseOut = true, popupDelay = 5) {
    const ret = this._popup(owning_node, elem_or_x, y, closeOnMouseOut);

    for (let i = 0; i < 2; i++) {
      ret.flushUpdate();
      ret.flushSetCSS();
    }

    if (popupDelay === 0) {
      return ret;
    }

    const z = ret.style["zIndex"];

    ret.style["zIndex"] = "-10";

    const cb = () => {
      const rect = ret.getClientRects()[0];
      const size = this.size;

      if (!rect) {
        this.doOnce(cb);
        return;
      }

      //console.log("rect", rect);

      if (rect.bottom > size[1]) {
        ret.style["top"] = size[1] - rect.height - 10 + "px";
      } else if (rect.top < 0) {
        ret.style["top"] = "10px";
      }
      if (rect.right > size[0]) {
        ret.style["left"] = size[0] - rect.width - 10 + "px";
      } else if (rect.left < 0) {
        ret.style["left"] = "10px";
      }

      ret.style["zIndex"] = z;

      ret.flushUpdate();
      ret.flushSetCSS();
    };

    setTimeout(cb, popupDelay);
    //this.doOnce(cb);

    return ret;
  }

  draggablePopup(x: number, y: number) {
    const ret = UIBase.createElement("drag-box-x") as UIBase<CTX>;
    ret.ctx = this.ctx;
    ret.parentWidget = this;
    ret._init();

    this._popups.push(ret);
    (ret as any)._onend = () => {
      if (this._popups.includes(ret)) {
        this._popups.remove(ret);
      }
    };

    ret.style["zIndex"] = "205";
    ret.style["position"] = UIBase.PositionKey;
    ret.style["left"] = x + "px";
    ret.style["top"] = y + "px";

    document.body.appendChild(ret);

    return ret;
  }

  /** makes a popup at x,y and returns a new container-x for it */
  _popup(owning_node: UIBase, elem_or_x: UIBase | number, y: number, closeOnMouseOut = true) {
    let sarea = this.sareas.active;
    let w = owning_node as UIBase | undefined;
    let x: number;

    while (w) {
      if (w instanceof ScreenArea) {
        sarea = w;
        break;
      }
      w = w.parentWidget;
    }

    if (typeof elem_or_x === "object") {
      const r = elem_or_x.getClientRects()[0];
      x = r.x;
      y = r.y;
    } else {
      x = elem_or_x;
    }

    //[x, y] = toVisualViewport(x, y, false)

    const container = UIBase.createElement("container-x") as UIBase<CTX> & { background: string; end: () => void };

    container.ctx = this.ctx;
    container._init();

    const remove = container.remove;
    container.remove = (...args: Parameters<UIBase["remove"]>) => {
      if (this._popups.includes(container)) {
        this._popups.remove(container);
      }

      return remove.apply(container, args);
    };

    container.overrideClass("popup");

    container.background = container.getDefault("background-color");
    container.style["borderRadius"] = container.getDefault("border-radius") + "px";
    container.style["borderColor"] = container.getDefault("border-color");
    container.style["borderStyle"] = container.getDefault("border-style");
    container.style["borderWidth"] = container.getDefault("border-width") + "px";
    container.style["boxShadow"] = container.getDefault("box-shadow");

    container.style["position"] = UIBase.PositionKey;
    container.style["zIndex"] = "2205";
    container.style["left"] = x + "px";
    container.style["top"] = y + "px";
    container.style["margin"] = "0px";

    container.parentWidget = this;

    const mm = new math.MinMax(2);
    const p = new Vector2();

    const _update = container.update;
    container.updateAfter(() => {
      container.style["zIndex"] = "2205";
    });

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

    // eslint-disable-next-line prefer-const
    let mousepick: ((e: MouseEvent, x?: number, y?: number, do_timeout?: boolean) => void) | undefined;
    // eslint-disable-next-line prefer-const
    let keydown: (e: KeyboardEvent) => void | undefined;

    let done = false;
    const end = () => {
      if (this._popup_safe) {
        return;
      }

      if (done) return;

      //this.ctx.screen.removeEventListener("touchstart", touchpick, true);
      //this.ctx.screen.removeEventListener("touchmove", touchpick, true);
      this.ctx.screen.removeEventListener("mousedown", mousepick, true);
      this.ctx.screen.removeEventListener("mousemove", mousepick, { passive: true } as any);
      this.ctx.screen.removeEventListener("mouseup", mousepick, true);
      window.removeEventListener("keydown", keydown);

      done = true;
      container.remove();
    };

    container.end = end;

    const _remove = container.remove;
    container.remove = function (...args: Parameters<typeof _remove>) {
      if (arguments.length == 0) {
        end();
      }
      _remove.apply(this, args);
    };

    container._ondestroy = () => {
      end();
    };

    let bad_time = util.time_ms();
    let last_pick_time = util.time_ms();

    mousepick = (e: MouseEvent, x?: number, y?: number, do_timeout = true) => {
      if (!container.isConnected) {
        end();
        return;
      }

      if (sarea?.area) {
        sarea.area.push_ctx_active();
        sarea.area.pop_ctx_active();
      }
      //console.log("=======================================================popup touch start");
      //console.log(e);

      if (util.time_ms() - last_pick_time < 350) {
        return;
      }
      last_pick_time = util.time_ms();

      x = x === undefined ? e.x : x;
      y = y === undefined ? e.y : y;

      //let elem = this.pickElement(x, y, 2, 2, undefined, [ScreenBorder]);
      let elem = this.pickElement(x, y, {
        excluded_classes: [ScreenBorder],
        mouseEvent      : e,
      });

      const startelem = elem;

      if (elem === undefined) {
        if (closeOnMouseOut) {
          end();
        }
        return;
      }

      let ok = false;
      const elem2 = elem;

      while (elem) {
        if (elem === container) {
          ok = true;
          break;
        }
        elem = elem.parentWidget;
      }

      if (!ok) {
        do_timeout = !do_timeout || util.time_ms() - bad_time > 100;

        if (closeOnMouseOut && do_timeout) {
          end();
        }
      } else {
        bad_time = util.time_ms();
      }
    };

    keydown = (e: KeyboardEvent) => {
      if (!container.isConnected) {
        window.removeEventListener("keydown", keydown);
        return;
      }

      switch (e.keyCode) {
        case keymap["Escape"]:
          end();
          break;
      }
    };

    this.ctx.screen.addEventListener("mousedown", mousepick, true);
    this.ctx.screen.addEventListener("mousemove", mousepick, { passive: true });
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

  _recalcAABB(save = true) {
    const mm = new math.MinMax(2);

    for (const v of this.screenverts) {
      mm.minmax(v);
    }

    if (save) {
      this._aabb[0].load(mm.min as unknown as number[]);
      this._aabb[1].load(mm.max as unknown as number[]);
    }

    return [new Vector2(mm.min as unknown as number[]), new Vector2(mm.max as unknown as number[])];
  }

  //XXX look at if this is referenced anywhere
  load() {}

  //XXX look at if this is referenced anywhere
  save() {}

  popupArea(area_class: typeof Area) {
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

  unlisten() {
    if (this.listen_timer !== undefined) {
      window.clearInterval(this.listen_timer);
      this.listen_timer = undefined;
    }
  }

  checkCSSSize() {
    const sw = this.style.width.toLowerCase().trim();
    const sh = this.style.height.toLowerCase().trim();
    let w = 0;
    let h = 0;

    if (sw.endsWith("px") && sh.endsWith("px")) {
      w = parseFloat(sw.slice(0, sw.length - 2).trim());
      h = parseFloat(sh.slice(0, sh.length - 2).trim());

      if (w !== this.size[0] || h !== this.size[1]) {
        this.on_resize([this.size[0], this.size[1]], [w, h]);
        this.size[0] = w;
        this.size[1] = h;
      }
    }
  }

  getBoolAttribute(attr: string, defaultval = false) {
    if (!this.hasAttribute(attr)) {
      return defaultval;
    }

    const ret = this.getAttribute(attr);

    if (typeof ret === "number") {
      return !!ret;
    } else if (typeof ret === "string") {
      return ret === "true" || ret === "1" || ret === "yes";
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

    const ratio = window.outerHeight / window.innerHeight;
    const scale = 1.0; //visualViewport.scale;

    const pad = 4;
    width = window.innerWidth - pad;
    height = window.innerHeight - pad;

    if (cconst.DEBUG.customWindowSize) {
      const s = cconst.DEBUG.customWindowSize as unknown as any;
      width = s.width as number;
      height = s.height as number;
    }

    const key = this._calcSizeKey(width, height, 0 /*ox*/, 0 /*oy*/, devicePixelRatio, scale);

    document.body.style.margin = document.body.style.padding = "0px";

    if (key !== this._last_ckey1) {
      //console.log("resizing", key, this._last_ckey1);
      this._last_ckey1 = key;

      this.on_resize(this.size, [width, height], false);
      this.on_resize(this.size, this.size, false);

      this.regenBorders();

      this.setCSS();
      this.completeUpdate();
    }
  }

  listen(args = { updateSize: true }) {
    ui_menu.setWranglerScreen(this);

    const ctx = this.ctx;
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

  _calcSizeKey(w: number, h: number, x: number, y: number, dpi: number, scale: number) {
    if (arguments.length !== 6) {
      throw new Error("eek");
    }

    let s = "";
    for (let i = 0; i < arguments.length; i++) {
      s += arguments[i].toFixed(0) + ":";
    }

    return s;
  }

  _ondestroy() {
    if (ui_menu.getWranglerScreen() === (this as unknown as Screen)) {
      //ui_menu.setWranglerScreen(undefined);
    }

    this.unlisten();

    //unlike other ondestroy functions, this one physically dismantles the DOM tree
    const recurse = (n: any, second_pass: number, parent?: any) => {
      if (n.__pass === second_pass) {
        console.warn("CYCLE IN DOM TREE!", n, parent);
        return;
      }

      n.__pass = second_pass;

      n._forEachChildWidget((n2: any) => {
        if (n === n2) return;
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

    const id = ~~(Math.random() * 1024 * 1024);

    recurse(this, id, undefined);
    recurse(this, id + 1, undefined);
  }

  destroy() {
    this._ondestroy();
  }

  clear() {
    this._ondestroy();

    this.sareas = [];
    this.sareas.active = undefined;

    for (const child of list(this.childNodes)) {
      child.remove();
    }
    for (const child of list(this.shadow.childNodes)) {
      child.remove();
    }
  }

  _test_save() {
    const obj = JSON.parse(JSON.stringify(this));
    console.log(JSON.stringify(this));

    this.loadJSON(obj);
  }

  loadJSON(obj: Record<string, any>, schedule_resize = false) {
    this.clear();
    super.loadJSON(obj);

    for (const sarea of obj.sareas) {
      const sarea2 = UIBase.createElement("screenarea-x") as ScreenArea;

      sarea2.ctx = this.ctx;
      sarea2.screen = this as any;

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

  toJSON() {
    return {
      ...super.toJSON(),
      sareas: this.sareas,
      size  : this.size,
      idgen : this.idgen,
    };
  }

  getHotKey(toolpath: string) {
    const test = (keymap: KeyMap) => {
      for (const hk of keymap) {
        if (typeof hk.action != "string") continue;

        if (hk.action.trim().startsWith(toolpath.trim())) {
          return hk;
        }
      }
    };

    let ret = test(this.keymap);
    if (ret) return ret;

    if (this.sareas.active?.keymap) {
      const area = this.sareas.active.area;

      for (const keymap of area!.getKeyMaps()) {
        ret = test(keymap);

        if (ret) return ret;
      }
    }

    if (ret === undefined) {
      //just to be safe, check all areas in case the
      //context is confused as to which area is currently "active"

      for (const sarea of this.sareas) {
        const area = sarea.area;
        if (!area) continue;

        for (const keymap of area.getKeyMaps()) {
          ret = test(keymap);

          if (ret) {
            return ret;
          }
        }
      }
    }

    return undefined;
  }

  addEventListener(type: string, cb: any, options?: boolean | AddEventListenerOptions) {
    if (type === "resize") {
      this._resize_callbacks.push(cb);
    } else {
      return super.addEventListener(type, cb, options);
    }
  }

  removeEventListener(type: string, cb: any, options?: boolean | EventListenerOptions) {
    if (type === "resize") {
      if (this._resize_callbacks.includes(cb)) this._resize_callbacks.remove(cb);
    } else {
      return super.removeEventListener(type, cb, options);
    }
  }

  execKeyMap(e: KeyboardEvent) {
    let handled = false;

    if (window.DEBUG?.keymap) {
      console.warn("execKeyMap called", e.keyCode, document.activeElement?.tagName);
    }

    if (this.sareas.active) {
      const area = this.sareas.active.area;

      if (!area) {
        return;
      }

      area.push_ctx_active();

      for (const keymap of area.getKeyMaps()) {
        if (keymap === undefined) {
          continue;
        }

        if (keymap.handle(area.ctx, e)) {
          handled = true;
          break;
        }
      }

      area.pop_ctx_active();
    }

    handled = handled || this.keymap.handle(this.ctx, e);

    if (!handled && this.testAllKeyMaps) {
      for (const sarea of this.sareas) {
        if (handled) {
          break;
        }

        if (!sarea.area) continue;
        sarea.area.push_ctx_active();

        for (const keymap of sarea.area.getKeyMaps()) {
          if (keymap!.handle(sarea.area.ctx, e)) {
            handled = true;
            break;
          }
        }

        sarea.area.pop_ctx_active();
      }
    }

    return handled;
  }

  calcTabOrder() {
    const nodes: any[] = [];
    const visit: Record<string, number> = {};

    const rec = (n: any) => {
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

      n._forEachChildWidget((n2: any) => {
        rec(n2);
      });
    };

    for (const sarea of this.sareas) {
      rec(sarea);
    }

    for (const popup of this._popups) {
      rec(popup);
    }

    //console.log("nodes2", nodes2);
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i as unknown as keyof typeof nodes] as unknown as any;
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
    const move = [];
    for (const child of this.childNodes) {
      if (child instanceof ScreenArea) {
        move.push(child);
      }
    }

    for (const child of move) {
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

    outer: for (const sarea of this.sareas) {
      for (const b of sarea._borders) {
        const movable = this.isBorderMovable(b);

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
        if (!(error instanceof DataPathError)) {
          util.print_stack(error as Error);
          console.log("error in update_intern tasklet");
        }
        return;
      }

      if (ret?.done) {
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

  completeSetCSS() {
    const rec = (n: any) => {
      n.setCSS();

      if (n.packflag & PackFlags.NO_UPDATE) {
        return;
      }

      n._forEachChildWidget((c: any) => {
        rec(c);
      });
    };

    rec(this);
  }

  completeUpdate() {
    for (const _step of this.update_intern()) {
      //
    }
  }

  updateScrollStyling() {
    const s = theme.scrollbars;
    if (!(s instanceof ThemeScrollBars)) {
      return;
    }

    // s's members are allowed to be undefined, styleScrollBars has defaults
    const key = "" + s.color + ":" + s.color2 + ":" + s.border + ":" + s.contrast + ":" + s.width;

    if (key !== this._last_scrollstyle_key) {
      this._last_scrollstyle_key = key;

      //console.log("updating scrollbar styling");

      this.mergeGlobalCSS(styleScrollBars(s.color, s.color2, s.contrast, s.width, s.border, "*"));
    }
  }

  //XXX race condition warning
  update_intern() {
    this.updateScrollStyling();

    const popups = this._popups;

    let cssText = "";
    const sheet = this.globalCSS.sheet;
    if (sheet) {
      for (const rule of sheet.rules) {
        cssText += rule.cssText + "\n";
      }

      window.cssText = cssText;
    }
    const cssTextHash = util.strhash(cssText);

    if (this.needsBorderRegen) {
      this.needsBorderRegen = false;
      this.regenBorders();
    }

    super.update();
    const this2 = this;

    //ensure each area has proper ctx set
    for (const sarea of this.sareas) {
      if (!sarea.ctx) {
        sarea.ctx = this.ctx;
      }
    }

    return (function* () {
      const stack = update_stack;
      stack.cur = 0;

      const lastn = this2;

      function push(n: any) {
        stack[stack.cur++] = n as any;
      }

      function pop(_n?: any): any {
        if (stack.cur < 0) {
          throw new Error("Screen.update(): stack overflow!");
        }

        return stack[--stack.cur];
      }

      const ctx = this2.ctx;

      const SCOPE_POP = Symbol("pop");
      const AREA_CTX_POP = Symbol("pop2");

      const scopestack = [];
      const areastack = [];

      let t = util.time_ms();
      push(this2);

      for (const p of popups) {
        push(p);
      }

      while (stack.cur > 0) {
        const n = pop()!;

        if (n === undefined) {
          //console.log("eek!", stack.length);
          continue;
        } else if (n === SCOPE_POP) {
          scopestack.pop();
          continue;
        } else if (n === AREA_CTX_POP) {
          //console.log("POP", areastack[areastack.length-1].constructor.name);
          areastack.pop()!.pop_ctx_active(true);
          continue;
        }

        if (n instanceof Area) {
          //console.log("PUSH", n.constructor.name);
          areastack.push(n);
          n.push_ctx_active(true);
          push(AREA_CTX_POP);
        }

        if (!n.hidden && n !== this2 && n instanceof UIBase) {
          if (!n._ctx) {
            n._ctx = ctx;
          }

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

        for (const n2 of n.childNodes) {
          if (!(n2 instanceof UIBase) || !(n2.packflag & PackFlags.NO_UPDATE)) {
            push(n2);
          }
        }

        if (n.shadow === undefined) {
          continue;
        }

        for (const n2 of n.shadow.childNodes) {
          if (!(n2 instanceof UIBase) || !(n2.packflag & PackFlags.NO_UPDATE)) {
            push(n2);
          }
        }

        if (n instanceof UIBase) {
          if (!(n.packflag & PackFlags.NO_UPDATE)) {
            scopestack.push(n);
            push(SCOPE_POP);
          }
        }
      }
    })();
  }

  //load pos/size from screenverts
  loadFromVerts() {
    const old = [0, 0];
    for (const sarea of this.sareas) {
      old[0] = sarea.size[0];
      old[1] = sarea.size[1];

      sarea.loadFromVerts();
      sarea.on_resize(old);
      sarea.setCSS();
    }

    this.setCSS();
  }

  /** merges sarea into the screen area opposite to sarea*/
  collapseArea(sarea: ScreenArea<CTX>, border?: ScreenBorder<CTX>) {
    let sarea2;

    if (!border) {
      for (const b of sarea._borders) {
        const sarea2 = b.getOtherSarea(sarea);

        if (sarea2 && !b.locked) {
          border = b;
          break;
        }
      }
    } else if (border.locked) {
      console.warn("Cannot remove screen border");
    }

    console.warn("SAREA2", border, sarea2, sarea2 !== sarea);

    if (border) {
      sarea2 = border.getOtherSarea(sarea);

      if (!sarea2) {
        console.error("Error merging sarea");
        return;
      }

      const size1 = new Vector2(sarea.pos).add(sarea.size);
      const size2 = new Vector2(sarea2.pos).add(sarea2.size);

      sarea2.pos.min(sarea.pos);
      sarea2.size.load(size1).max(size2).sub(sarea2.pos);

      sarea2.loadFromPosSize();
    }

    this.sareas.remove(sarea);
    sarea.remove();

    this.regenScreenMesh();
    this._internalRegenAll();

    return this;
  }

  splitArea(sarea: ScreenArea<CTX>, t = 0.5, horiz = true) {
    const w = sarea.size[0];
    const h = sarea.size[1];
    const x = sarea.pos[0];
    const y = sarea.size[1];
    let s1;
    let s2;

    if (!horiz) {
      s1 = sarea;
      if (s1.ctx === undefined) {
        s1.ctx = this.ctx;
      }
      s2 = s1.copy(this);

      s1.size[0] *= t;
      s2.size[0] *= 1.0 - t;

      s2.pos[0] += w * t;
    } else {
      s1 = sarea;
      if (s1.ctx === undefined) {
        s1.ctx = this.ctx;
      }
      s2 = s1.copy(this);

      s1.size[1] *= t;
      s2.size[1] *= 1.0 - t;

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
    if (s2.area !== undefined) s2.area.onadd();

    return s2;
  }

  setCSS() {
    if (!this.getBoolAttribute("inherit-scale")) {
      this.style["width"] = this.size[0] + "px";
      this.style["height"] = this.size[1] + "px";
    }

    this.style["overflow"] = "hidden";

    //call setCSS on borders
    for (const key in this._edgemap) {
      const b = this._edgemap[key];

      b.setCSS();
    }
  }

  regenScreenMesh(snapLimit = SnapLimit) {
    this.snapLimit = snapLimit;

    this.regenBorders();
  }

  regenBorders_stage2() {
    for (const b of this.screenborders) {
      b.halfedges = [];
    }

    function hashHalfEdge(border: ScreenBorder<CTX>, sarea: ScreenArea<CTX>) {
      return border._id + ":" + sarea._id;
    }

    function has_he(border: ScreenBorder<CTX>, border2: ScreenBorder<CTX>, sarea: ScreenArea<CTX>) {
      for (const he of border.halfedges) {
        if (border2 === he.border && sarea === he.sarea) {
          return true;
        }
      }

      return false;
    }

    for (const b1 of this.screenborders) {
      for (const sarea of b1.sareas) {
        const he = new ScreenHalfEdge<CTX>(b1, sarea);
        b1.halfedges.push(he);
      }

      const axis = b1.horiz ? 1 : 0;

      const min = Math.min(b1.v1[axis], b1.v2[axis]);
      const max = Math.max(b1.v1[axis], b1.v2[axis]);

      for (const b2 of this.walkBorderLine(b1)) {
        if (b1 === b2) {
          continue;
        }

        let ok = b2.v1[axis] >= min && b2.v1[axis] <= max;
        ok = ok || (b2.v2[axis] >= min && b2.v2[axis] <= max);

        for (const sarea of b2.sareas) {
          const ok2 = ok && !has_he(b2, b1, sarea);
          if (ok2) {
            const he2 = new ScreenHalfEdge(b2, sarea);
            b1.halfedges.push(he2);
          }
        }
      }
    }

    for (const b of this.screenborders) {
      let movable = true;

      for (const sarea of b.sareas) {
        movable = movable && this.isBorderMovable(b);
      }

      b.movable = movable;
    }
  }

  hasBorder(b: ScreenBorder<CTX>) {
    return b._id! in this._idmap;
  }

  killScreenVertex(v: ScreenVert<CTX>) {
    this.screenverts.remove(v);

    delete this._edgemap[ScreenVert.hash(v, v.added_id, this.snapLimit)];
    delete this._idmap[v._id];

    return this;
  }

  freeBorder(b: ScreenBorder<CTX>, sarea?: ScreenArea<CTX>) {
    if (b.sareas.includes(sarea!)) {
      b.sareas.remove(sarea);
    }

    const dels = [] as [ScreenBorder<CTX>, ScreenHalfEdge<CTX>][];

    for (const he of b.halfedges) {
      if (he.sarea === sarea) {
        dels.push([b, he]);
      }

      for (const he2 of he.border.halfedges) {
        if (he2 === he) continue;

        if (he2.sarea === sarea) {
          dels.push([he.border, he2]);
        }
      }
    }

    for (const d of dels) {
      if (!d[0].halfedges.includes(d[1])) {
        console.warn("Double remove detected; use util.set?");
        continue;
      }

      d[0].halfedges.remove(d[1]);
    }

    if (b.sareas.length === 0) {
      this.killBorder(b);
    }
  }

  killBorder(b: ScreenBorder<CTX>) {
    console.log("killing border", b._id, b);

    if (!this.screenborders.includes(b)) {
      console.log("unknown border", b);
      b.remove();
      return;
    }

    this.screenborders.remove(b);

    const del = [] as [ScreenBorder<CTX>, ScreenHalfEdge<CTX>][];

    for (const he of b.halfedges) {
      if (he.border === b) continue;

      for (const he2 of he.border.halfedges) {
        if (he2.border === b) {
          del.push([he.border, he2]);
        }
      }
    }

    for (const d of del) {
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
    for (const b of this.screenborders) {
      b.remove();
    }

    this._idmap = {};
    this.screenborders = [];
    this._edgemap = {};
    this._vertmap = {};
    this.screenverts = [];

    for (const sarea of this.sareas) {
      if (sarea.hidden) continue;

      sarea.makeBorders(this);
    }

    for (const key in this._edgemap) {
      const b = this._edgemap[key];

      b.setCSS();
    }

    this.regenBorders_stage2();
    this._recalcAABB();

    for (const b of this.screenborders) {
      b.outer = this.isBorderOuter(b);
      b.movable = this.isBorderMovable(b);
      b.setCSS();
    }

    this.updateDebugBoxes();
  }

  _get_debug_overlay() {
    if (!this._debug_overlay) {
      this._debug_overlay = UIBase.createElement("overdraw-x");
      const s = this._debug_overlay as any;

      s.startNode(this, this);
    }

    return this._debug_overlay;
  }

  updateDebugBoxes() {
    if (cconst.DEBUG.screenborders) {
      const overlay = this._get_debug_overlay() as any;
      overlay.clear();

      for (const b of this.screenborders) {
        overlay.line(b.v1, b.v2, "red");
      }
      const del = [];
      for (const child of document.body.childNodes) {
        if (child instanceof HTMLElement && child.getAttribute("class") === "__debug") {
          del.push(child);
        }
      }
      for (const n of del) {
        n.remove();
      }

      const box = (x: number, y: number, s: number, text: string, color = "red") => {
        x -= s * 0.5;
        y -= s * 0.5;

        x = Math.min(Math.max(x, 0.0), this.size[0] - s);
        y = Math.min(Math.max(y, 0.0), this.size[1] - s);

        let ret = UIBase.createElement("div");
        ret.setAttribute("class", "__debug");

        ret.style["position"] = UIBase.PositionKey;
        ret.style["left"] = x + "px";
        ret.style["top"] = y + "px";
        ret.style["height"] = s + "px";
        ret.style["width"] = s + "px"; //"200px";
        ret.style["zIndex"] = "1000";
        ret.style["pointerEvents"] = "none";
        ret.style["padding"] = ret.style["margin"] = "0px";
        ret.style["display"] = "float";
        ret.style["backgroundColor"] = color;
        document.body.appendChild(ret);

        const colors = ["orange", "black", "white"];

        for (let i = 2; i >= 0; i--) {
          ret = UIBase.createElement("div");

          ret.setAttribute("class", "__debug");

          ret.style["position"] = UIBase.PositionKey;
          ret.style["left"] = x + "px";
          ret.style["top"] = y + "px";
          ret.style["height"] = s + "px";
          ret.style["width"] = "250px"; //"200px";
          ret.style["zIndex"] = "" + (1005 - i - 1);
          ret.style["pointerEvents"] = "none";
          ret.style["color"] = colors[i];

          const style = ret.style as any;
          const w = i * 2;
          style["-webkit-text-stroke-width"] = w + "px";
          style["-webkit-text-stroke-color"] = colors[i];
          style["text-stroke-width"] = w + "px";
          style["text-stroke-color"] = colors[i];

          ret.style["padding"] = ret.style["margin"] = "0px";
          ret.style["display"] = "float";
          ret.style["backgroundColor"] = "rgba(0,0,0,0)";
          ret.innerText = "" + text;
          document.body.appendChild(ret);
        }
      };

      for (const v of this.screenverts) {
        box(v[0], v[1], 10 * v.borders.length, "" + v.borders.length, "rgba(255,0,0,0.5)");
      }

      for (const b of this.screenborders) {
        for (const he of b.halfedges) {
          const txt = `${he.side}, ${b.sareas.length}, ${b.halfedges.length}`;
          const p = new Vector2(b.v1).add(b.v2).mulScalar(0.5);
          const size = 10 * b.halfedges.length;

          const wadd = 25 + size * 0.5;
          const axis = ((b.horiz ? 1 : 0) & 1) as unknown as Number2;

          if (p[axis] > he.sarea.pos[axis]) {
            p[axis] -= wadd;
          } else {
            p[axis] += wadd;
          }
          box(p[0], p[1], size, txt, "rgba(155,255,75,0.5)");
        }
      }
    }
  }

  checkAreaConstraint(sarea: ScreenArea<CTX>, checkOnly = false) {
    const min = sarea.minSize;
    const max = sarea.maxSize;
    const vs = sarea._verts;
    let chg = 0.0;
    let mask = 0;

    const moveBorder = (sidea: number, sideb: number, dh: number) => {
      const b1 = sarea._borders[sidea];
      const b2 = sarea._borders[sideb];
      let bad = 0;

      for (let i = 0; i < 2; i++) {
        const b = i ? b2 : b1;
        let bad2 = Boolean(sarea.borderLock & (1 << sidea));

        bad2 = bad2 || !b.movable;
        bad2 = bad2 || this.isBorderOuter(b);

        if (bad2) bad |= 1 << i;
      }

      if (bad === 0) {
        this.moveBorder(b1, dh * 0.5);
        this.moveBorder(b2, -dh * 0.5);
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
      const dh = sarea.size[0] - max[0];
      chg += Math.abs(dh);
      mask |= 1;

      moveBorder(0, 2, dh);
    }

    if (min[0] !== undefined && sarea.size[0] < min[0]) {
      const dh = min[0] - sarea.size[0];
      chg += Math.abs(dh);
      mask |= 2;

      moveBorder(2, 0, dh);
    }

    if (max[1] !== undefined && sarea.size[1] > max[1]) {
      const dh = sarea.size[1] - max[1];
      chg += Math.abs(dh);
      mask |= 4;

      moveBorder(3, 1, dh);
    }

    if (min[1] !== undefined && sarea.size[1] < min[1]) {
      const dh = min[1] - sarea.size[1];
      chg += Math.abs(dh);
      mask |= 8;

      moveBorder(1, 3, dh);
    }

    if (sarea.pos[0] + sarea.size[0] > this.size[0]) {
      mask |= 16;
      const dh = this.size[0] - sarea.size[0] - sarea.pos[0];

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

  walkBorderLine(b: ScreenBorder<CTX>) {
    const visit = new util.set();
    let ret = [b];
    visit.add(b);

    const rec = (b: ScreenBorder<CTX>, v: ScreenVert<CTX> | undefined) => {
      if (!v) return;
      for (const b2 of v.borders) {
        if (b2 === b) {
          continue;
        }

        if (b2.horiz === b.horiz && !visit.has(b2)) {
          visit.add(b2);
          ret.push(b2);
          rec(b2, b2.otherVertex(v));
        }
      }
    };

    rec(b, b.v1);
    const ret2 = ret;
    ret = [];

    rec(b, b.v2);
    ret2.reverse();

    return ret2.concat(ret);
  }

  moveBorderWithoutVerts(halfedge: ScreenHalfEdge<CTX>, df: number) {
    const side = halfedge.side;
    const sarea = halfedge.sarea;

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

  moveBorder(b: ScreenBorder<CTX>, df: number, strict = true) {
    return this.moveBorderSimple(b, df, strict);
  }

  moveBorderSimple(b: ScreenBorder<CTX>, df: number, strict = true) {
    const axis = (b.horiz as unknown as number) & 1;
    const axis2 = axis ^ 1;

    const min = Math.min(b.v1![axis2 as Number2] as number, b.v2![axis2 as Number2] as number);
    const max = Math.max(b.v1![axis2 as Number2] as number, b.v2![axis2 as Number2] as number);

    const test = (v: ScreenVert<CTX>) => {
      return v[axis2 as Number2] >= min && v[axis2 as Number2] <= max;
    };

    const vs = new Set<ScreenVert<CTX>>();

    for (const b2 of this.walkBorderLine(b)) {
      if (strict && !test(b2.v1) && !test(b2.v2)) {
        return false;
      }

      vs.add(b2.v1);
      vs.add(b2.v2);
    }

    for (const v of vs) {
      v[axis as Number2] += df;
    }

    for (const v of vs) {
      for (const b of v.borders) {
        for (const sarea of b.sareas) {
          sarea.loadFromVerts();
        }
      }
    }
    return true;
  }

  moveBorderUnused(b: ScreenBorder<CTX>, df: number, strict = true) {
    if (!b) {
      console.warn("missing border");
      return false;
    }

    const axis = (b.horiz ? 1 : 0) as Number2;
    const vs = new Set<ScreenVert<CTX>>();
    const axis2 = (axis ^ 1) as Number2;

    const min = Math.min(b.v1![axis2] as number, b.v2![axis2] as number);
    const max = Math.max(b.v1![axis2] as number, b.v2![axis2] as number);

    const test = (v: ScreenVert<CTX>) => {
      return (v[axis2] as number) >= min && (v[axis2] as number) <= max;
    };

    let first = true;
    let found = false;
    const halfedges = new Set<ScreenHalfEdge<CTX>>();
    const borders = new Set<ScreenBorder<CTX>>();

    for (const b2 of this.walkBorderLine(b)) {
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

      const t1 = test(b2.v1);
      const t2 = test(b2.v2);

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
      for (const sarea of b2.sareas) {
        halfedges.add(new ScreenHalfEdge(b2, sarea));
      }

      vs.add(b2.v1);
      vs.add(b2.v2);
    }

    for (const b2 of this.walkBorderLine(b)) {
      if (borders.has(b2)) {
        continue;
      }

      for (const he of b2.halfedges) {
        borders.delete(he.border);
        if (halfedges.has(he)) {
          halfedges.delete(he);
        }
      }
    }

    for (const v of vs) {
      const ok = v[axis2] >= min && v[axis2] <= max;

      if (!ok && strict) {
        //   return false;
      }
    }

    if (!found || !strict) {
      for (const v of vs) {
        v[axis] += df;
      }
    } else {
      const borders = new Set<ScreenBorder<CTX>>();

      for (const he of halfedges) {
        borders.add(he.border);
        this.moveBorderWithoutVerts(he, df);
      }

      for (const he of halfedges) {
        he.sarea.loadFromPosSize();
      }

      for (const b of borders) {
        const sareas = b.sareas.slice(0, b.sareas.length);

        this.killBorder(b);
        for (const sarea of sareas) {
          sarea.loadFromPosSize();
        }
      }

      return halfedges.size > 0;
    }

    for (const sarea of b.sareas) {
      sarea.loadFromVerts();
    }

    for (const he of b.halfedges) {
      he.sarea.loadFromVerts();

      for (const sarea of he.border.sareas) {
        sarea.loadFromVerts();
        for (const b2 of sarea._borders) {
          b2.setCSS();
        }
      }
    }

    b.setCSS();

    return true;
  }

  solveAreaConstraints(snapArgument = true) {
    let repeat = false;
    let found = false;

    let time = util.time_ms();

    for (let i = 0; i < 10; i++) {
      repeat = false;

      for (const sarea of this.sareas) {
        if (sarea.hidden) continue;
        repeat = repeat || Boolean(this.checkAreaConstraint(sarea));
      }

      found = found || repeat;

      if (repeat) {
        for (const sarea of this.sareas) {
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

  snapScreenVerts(fitToSize = true) {
    const this2 = this;

    function* screenverts() {
      for (const v of this2.screenverts) {
        let ok = 0;

        for (const sarea of v.sareas) {
          if (!(sarea.flag & AreaFlags.INDEPENDENT)) {
            ok = 1;
          }
        }

        if (ok) {
          yield v;
        }
      }
    }

    const mm = new math.MinMax(2);
    for (const v of screenverts()) {
      mm.minmax(v);
    }

    let min = new Vector2(mm.min);
    let max = new Vector2(mm.max);

    //snap(min);
    //snapi(max);

    if (fitToSize) {
      //fit entire screen to, well, the entire screen (size)
      const vec = new Vector2(max).sub(min);
      const sz = new Vector2(this.size);

      sz.div(vec);

      for (const v of screenverts()) {
        v.sub(min as any).mul(sz as any);
        //snap(v.sub(min).mul(sz));//.add(this.pos);
      }

      for (const v of screenverts()) {
        v[0] += this.pos[0];
        v[1] += this.pos[1];
      }

      //this.pos.zero();
    } else {
      for (const v of screenverts()) {
        //snap(v);
      }

      [min, max] = this._recalcAABB();

      //snap(min);
      //snapi(max);

      this.size.load(max).sub(min);
      //this.pos.zero();
      //this.pos.load(min);
    }

    let found = true;

    for (const sarea of this.sareas) {
      if (sarea.hidden) continue;

      const old = new Vector2(sarea.size);
      const oldpos = new Vector2(sarea.pos);

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

  on_resize(oldsize: Vector2 | number[], newsize: Vector2 | number[] = this.size, _set_key = true) {
    //console.warn("resizing");

    if (_set_key) {
      this._last_ckey1 = this._calcSizeKey(
        newsize[0],
        newsize[1],
        this.pos[0],
        this.pos[1],
        devicePixelRatio,
        visualViewport!.scale
      );
    }

    const ratio = [newsize[0] / oldsize[0], newsize[1] / oldsize[1]];

    const offx = this.pos[0] - this.oldpos[0];
    const offy = this.pos[1] - this.oldpos[1];

    this.oldpos.load(this.pos);

    //console.log("resize!", ratio);

    for (const v of this.screenverts) {
      v[0] *= ratio[0];
      v[1] *= ratio[1];
      v[0] += offx;
      v[1] += offy;
    }

    const min = [1e17, 1e17];
    const max = [-1e17, -1e17];
    const olds = [];

    for (const sarea of this.sareas) {
      olds.push([sarea.size[0], sarea.size[1]]);

      sarea.loadFromVerts();
    }

    this.size[0] = newsize[0];
    this.size[1] = newsize[1];

    this.snapScreenVerts();
    this.solveAreaConstraints();
    this._recalcAABB();

    let i = 0;
    for (const sarea of this.sareas) {
      sarea.on_resize(sarea.size); //, olds[i]);
      sarea.setCSS();
      i++;
    }

    this.regenBorders();
    this.setCSS();
    this.calcTabOrder();

    this._fireResizeCB(new Vector2(oldsize));
  }

  _fireResizeCB(oldsize = this.size) {
    for (const cb of this._resize_callbacks) {
      cb(new Vector2(oldsize));
    }
  }

  getScreenVert(pos: Vector2 | number[], added_id = "", floating = false) {
    const key = ScreenVert.hash(pos, added_id, this.snapLimit);

    if (floating || !(key in this._vertmap)) {
      const v = new ScreenVert<CTX>(pos, this.idgen++, added_id);

      this._vertmap[key] = v;
      this._idmap[v._id] = v;

      this.screenverts.push(v);
    }

    return this._vertmap[key];
  }

  isBorderOuter(border: ScreenBorder<CTX>) {
    let sides = 0;

    for (const he of border.halfedges) {
      sides |= 1 << he.side;
    }

    let bits = 0;
    for (let i = 0; i < 4; i++) {
      bits += sides & (1 << i) ? 1 : 0;
    }

    let ret = bits < 2;
    let floating = false;

    for (const sarea of border.sareas) {
      floating = floating || Boolean(sarea.floating);
    }

    if (floating) {
      //check if border is on screen limits
      const axis = border.horiz ? 1 : 0;

      ret = Math.abs(border.v1[axis] - this.pos[axis]) < 4;
      ret = ret || Math.abs(border.v1[axis] - this.pos[axis] - this.size[axis]) < 4;
    }

    border.outer = ret;
    return ret;
  }

  isBorderMovable(b: ScreenBorder<CTX>, limit = 5) {
    if (this.allBordersMovable) return true;

    for (const he of b.halfedges) {
      if (he.sarea.borderLock & (1 << he.side)) {
        return false;
      }
    }

    let ok = !this.isBorderOuter(b);

    for (const sarea of b.sareas) {
      if (sarea.floating) {
        ok = true;
        break;
      }
    }

    return ok;
  }

  getScreenBorder(
    sarea: ScreenArea<CTX>,
    co1: Vector2 | ScreenVert<CTX>,
    co2: Vector2 | ScreenVert<CTX>,
    side: number
  ): ScreenBorder<CTX> {
    const suffix = sarea._get_v_suffix();
    const v1 = co1 instanceof ScreenVert ? co1 : this.getScreenVert(co1, suffix, true);
    const v2 = co2 instanceof ScreenVert ? co2 : this.getScreenVert(co2, suffix, true);
    const hash = ScreenBorder.hash(v1, v2);

    if (!(hash in this._edgemap)) {
      const sb = (this._edgemap[hash] = UIBase.createElement("screenborder-x") as unknown as ScreenBorder<CTX>);

      sb._hash = hash;
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

  minmaxArea(sarea: ScreenArea<CTX>, mm?: any) {
    if (mm === undefined) {
      mm = new math.MinMax(2);
    }

    for (const b of sarea._borders) {
      mm.minmax(b.v1);
      mm.minmax(b.v2);
    }

    return mm;
  }

  //does sarea1 border sarea2?
  areasBorder(sarea1: ScreenArea<CTX>, sarea2: ScreenArea<CTX>) {
    for (const b of sarea1._borders) {
      for (const sa of b.sareas) {
        if (sa === sarea2) return true;
      }
    }

    return false;
  }

  //regenerates borders, sets css and calls this.update

  replaceArea(dst: ScreenArea<CTX>, src: ScreenArea<CTX>) {
    if (dst === src) return;

    src.pos[0] = dst.pos[0];
    src.pos[1] = dst.pos[1];
    src.size[0] = dst.size[0];
    src.size[1] = dst.size[1];

    src.floating = dst.floating;
    src._borders = dst._borders;
    src._verts = dst._verts;

    if (!this.sareas.includes(src)) {
      this.sareas.push(src);
      this.shadow.appendChild(src);
    }

    if (this.sareas.active === dst) {
      this.sareas.active = src;
    }

    //this.sareas.remove(dst);
    //dst.remove();

    this.sareas.remove(dst);
    dst.remove();

    this.regenScreenMesh();
    this.snapScreenVerts();
    this._updateAll();
  }

  _internalRegenAll() {
    this.snapScreenVerts();
    this._recalcAABB();
    this.calcTabOrder();
    this.setCSS();

    this.completeUpdate();
    this.completeSetCSS();
    this.completeUpdate();
  }

  _updateAll() {
    for (const sarea of this.sareas) {
      sarea.setCSS();
    }
    this.setCSS();
    this.update();
  }

  removeArea(sarea: ScreenArea<CTX>) {
    if (!this.sareas.includes(sarea)) {
      console.warn(sarea, "<- Warning: tried to remove unknown area");
      return;
    }

    this.sareas.remove(sarea);
    sarea.remove();

    for (let i = 0; i < 2; i++) {
      this.snapScreenVerts();
      this.regenScreenMesh();
    }

    this._updateAll();
    this.drawUpdate();
  }

  appendChild<T extends Node>(child: T): T {
    /*
    if (child instanceof UIBase) {
      if (child._useDataPathUndo === undefined) {
        child.useDataPathUndo = this.useDataPathUndo;
      }
    }*/

    if (child instanceof ScreenArea) {
      child.screen = this;
      child.ctx = this.ctx;
      child.parentWidget = this;

      this.sareas.push(child);

      if (child.size.dot(child.size) === 0) {
        child.size[0] = this.size[0];
        child.size[1] = this.size[1];
      }

      if (!(child as any)._has_evts) {
        (child as any)._has_evts = true;

        const onfocus = () => {
          this.sareas.active = child;
        };

        const onblur = () => {
          //XXX this is causing bugs
          //if (this.sareas.active === child) {
          //  this.sareas.active = undefined;
          //}
        };

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

  add(child: Node) {
    return this.appendChild(child);
  }

  hintPickerTool() {
    new FrameManager_ops.ToolTipViewer(this).start();
  }

  removeAreaTool(border?: ScreenBorder<CTX>) {
    const tool = new FrameManager_ops.RemoveAreaTool(this, border);
    //let tool = new FrameManager_ops.AreaDragTool(this, undefined, this.mpos);
    tool.start();
  }

  moveAttachTool(
    sarea: ScreenArea<CTX>,
    mpos: [number, number] | number[] | Vector2 = this.mpos,
    elem?: any,
    pointerId?: number
  ) {
    const tool = new FrameManager_ops.AreaMoveAttachTool(this, sarea, mpos);
    tool.start(elem, pointerId);
  }

  splitTool() {
    const tool = new FrameManager_ops.SplitTool(this);
    //let tool = new FrameManager_ops.AreaDragTool(this, undefined, this.mpos);
    tool.start();
  }

  areaDragTool(sarea = this.sareas.active) {
    if (sarea === undefined) {
      console.warn("no active screen area");
      return;
    }

    const mpos = this.mpos;
    const tool = new FrameManager_ops.AreaDragTool(this, this.sareas.active, mpos);

    tool.start();
  }

  makeBorders() {
    for (const sarea of this.sareas) {
      sarea.makeBorders(this);
    }
  }

  cleanupBorders() {
    const del = new Set<ScreenBorder<CTX>>();

    for (const b of this.screenborders) {
      if (b.halfedges.length === 0) {
        del.add(b);
      }
    }

    for (const b of del) {
      delete this._edgemap[b._hash!];
      HTMLElement.prototype.remove.call(b);
    }
  }

  mergeBlankAreas() {
    for (const b of this.screenborders) {
      if (b.locked) {
        continue;
      }

      let blank: ScreenArea<CTX> | undefined;
      let sarea: ScreenArea<CTX> | undefined;

      for (const he of b.halfedges) {
        if (!he.sarea.area) {
          blank = he.sarea;
          sarea = b.getOtherSarea(blank);

          const axis = b.horiz ? 1 : 0;

          if (blank && sarea && blank.size[axis] !== sarea.size[axis]) {
            blank = sarea = undefined;
          }

          if (blank && sarea) {
            break;
          } else {
            blank = undefined;
            sarea = undefined;
          }
        }
      }

      if (blank && sarea && blank !== sarea) {
        this.collapseArea(blank, b);
      }
    }

    this.cleanupBorders();
  }

  floatArea(area: Area<CTX>) {
    const sarea = area.parentWidget as ScreenArea<CTX>;

    /* already floating? */
    if (sarea.floating) {
      return sarea;
    }

    sarea.editors.remove(area);
    delete sarea.editormap[(area.constructor as unknown as AreaConstructor).define().areaname!];
    sarea.area = undefined;

    HTMLElement.prototype.remove.call(area);

    const sarea2 = UIBase.createElement("screenarea-x", true) as ScreenArea<CTX>;
    sarea2.floating = true;

    sarea2.pos = new Vector2(sarea.pos);
    sarea2.pos.addScalar(5);

    sarea2.size = new Vector2(sarea.size);

    sarea2.editors.push(area);
    sarea2.editormap[Area.getAreaName(area)] = area;

    sarea2.shadow.appendChild(area);
    sarea2.area = area;

    area.push_ctx_active();
    area.pop_ctx_active();

    area.pos = sarea2.pos;
    area.size = sarea2.size;
    area.parentWidget = sarea2;
    area.owning_sarea = sarea2;

    sarea.flushSetCSS();
    sarea.flushUpdate();

    sarea2.flushSetCSS();
    sarea2.flushUpdate();

    this.appendChild(sarea2);

    if (sarea.editors.length > 0) {
      const area2 = sarea.editors[0];
      sarea.switch_editor(area2.constructor);

      sarea.flushSetCSS();
      sarea.flushUpdate();
    }

    sarea2.loadFromPosSize();
    sarea2.bringToFront();

    this.mergeBlankAreas();
    this.cleanupBorders();

    return sarea2;
  }

  on_keydown(e: KeyboardEvent) {
    if (checkForTextBox(this, this.mpos[0], this.mpos[1])) {
      console.log("textbox detected");
      return;
    }

    if (!haveModal() && this.execKeyMap(e)) {
      e.preventDefault();
      return;
    }

    if (!haveModal() && this.sareas.active !== undefined && this.sareas.active.on_keydown) {
      const area = this.sareas.active;
      return this.sareas.active.on_keydown(e);
    }
  }

  on_keyup(e: KeyboardEvent) {
    if (!haveModal() && this.sareas.active?.on_keyup) {
      return this.sareas.active.on_keyup(e);
    }
  }

  on_keypress(e: KeyboardEvent) {
    if (!haveModal() && this.sareas.active?.on_keypress) {
      return this.sareas.active.on_keypress(e);
    }
  }

  draw() {
    for (const sarea of this.sareas) {
      sarea.draw();
    }
  }

  afterSTRUCT() {
    for (const sarea of this.sareas) {
      sarea._ctx = this.ctx;
      sarea.afterSTRUCT();
    }
  }

  loadSTRUCT(reader: StructReader<this>) {
    this.clear();

    reader(this);

    //handle old files that might have saved as simple arrays
    this.size = new Vector2(this.size);

    const sareas = this.sareas;
    this.sareas = [];

    /*
    let push = this.sareas.push;

    this.sareas.push = function(item) {
      console.error("this.sareas.push", item);
      push.call(this, item);
    }
    */

    for (const sarea of sareas) {
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

  saveUIData() {
    try {
      return saveUIData(this, "screen");
    } catch (error) {
      util.print_stack(error as Error);
      console.log("Failed to save UI state data");
    }
  }

  loadUIData(str: string | undefined) {
    try {
      loadUIData(this, str);
    } catch (error) {
      util.print_stack(error as Error);
      console.log("Failed to load UI state data");
    }
  }
}

UIBase.internalRegister(Screen);

_setScreenClass(Screen);

let get_screen_cb: () => Screen;
let _on_keydown: ((e: KeyboardEvent) => void) | undefined;

const start_cbs = [] as (() => void)[];
const stop_cbs = [] as (() => void)[];

let key_event_opts: AddEventListenerOptions | undefined;

export function startEvents<CTX extends IContextBase>(getScreenFunc: () => Screen<CTX>) {
  get_screen_cb = getScreenFunc as unknown as typeof get_screen_cb;

  if (_events_started) {
    return;
  }

  _events_started = true;

  _on_keydown = (e: KeyboardEvent) => {
    /* Prevent browser from unfocuing the page with the alt key.
     * Happens during touch/pen event handing in Chrome (Oct2023).
     */
    if (e.keyCode === keymap["Alt"]) {
      e.preventDefault();
    }

    const screen = get_screen_cb();

    return screen.on_keydown(e);
  };

  window.addEventListener("keydown", _on_keydown, key_event_opts);

  for (const cb of start_cbs) {
    cb();
  }
}

export function stopEvents() {
  window.removeEventListener("keydown", _on_keydown!, key_event_opts);
  _on_keydown = undefined;
  _events_started = false;

  for (const cb of stop_cbs) {
    try {
      cb();
    } catch (error) {
      util.print_stack(error as Error);
    }
  }

  return get_screen_cb;
}

export function setKeyboardDom(dom: Window) {
  const started = _events_started;
  if (started) {
    stopEvents();
  }

  if (started) {
    startEvents(get_screen_cb);
  }
}

/** Sets options passed to addEventListener() for on_keydown hotkey handler */
export function setKeyboardOpts(opts: AddEventListenerOptions) {
  key_event_opts = opts;
}

export function _onEventsStart(cb: () => void) {
  start_cbs.push(cb);
}

export function _onEventsStop(cb: () => void) {
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
