//bind module to global var to get at it in console.
//
//note that require has an api for handling circular
//module refs, in such cases do not use these vars.

var _ui: typeof import("./ui.js") | undefined = undefined;

import * as util from "../path-controller/util/util.js";
import * as units from "../core/units.js";
import * as vectormath from "../path-controller/util/vectormath.js";
import * as ui_base from "./ui_base.js";
import * as ui_widgets from "../widgets/ui_widgets.js";
import * as toolprop from "../path-controller/toolsys/toolprop.js";
import "../path-controller/util/html5_fileapi.js";
import { HotKey } from "../path-controller/util/simple_events.js";
import { CSSFont } from "./ui_theme.js";
import { theme, iconSheetFromPackFlag } from "./ui_base.js";

import { createMenu, startMenu } from "../widgets/ui_menu.js";

let PropFlags = toolprop.PropFlags;
let PropSubTypes = toolprop.PropSubTypes;

let EnumProperty = toolprop.EnumProperty;

let Vector2 = vectormath.Vector2,
  UIBase = ui_base.UIBase,
  PackFlags = ui_base.PackFlags,
  PropTypes = toolprop.PropTypes;

import { DataPathError } from "../path-controller/controller/controller_base.js";

import cconst from "../config/const.js";
import { IContextBase } from "./context_base.js";
import type { PanelFrame } from "../widgets/ui_panel.js";
import type { TabContainer } from "../widgets/ui_tabs.js";

/*
 * UIBase assigns many properties dynamically in its constructor without
 * TypeScript declarations. Until ui_base.ts is fully typed, we use this
 * helper to access dynamic properties on UIBase instances.
 */
type Dyn = Record<string, unknown>;
function dyn(v: unknown): Dyn {
  return v as Dyn;
}

type CtxApi = Record<string, unknown> & { api: Record<string, Function> };
function ctxApi(ctx: unknown): CtxApi {
  return ctx as unknown as CtxApi;
}

/* Style coercion: CSSStyleDeclaration doesn't allow arbitrary string indexing. */
function styl(el: { style: CSSStyleDeclaration }): Record<string, string> {
  return el.style as unknown as Record<string, string>;
}

export class Label<CTX extends IContextBase = IContextBase> extends ui_base.UIBase<CTX> {
  declare dom: HTMLDivElement;
  declare shadow: ShadowRoot;
  declare packflag: number;
  declare _useDataPathUndo: boolean | undefined;

  _label = "";
  _lastText = "";
  _font: CSSFont | undefined = undefined;
  _last_font: string | undefined = undefined;
  _enabled_font: CSSFont | string | undefined = undefined;

  constructor() {
    super();

    this._label = "";

    this._lastText = "";

    this.dom = document.createElement("div");
    this.dom.setAttribute("class", "_labelx");

    let style = document.createElement("style");
    style.textContent = `
      div._labelx::selection {
        color: none;
        background: none;
         -webkit-user-select:none;
         user-select:none;
      }
    `;

    this.shadow.appendChild(style);
    this.shadow.appendChild(this.dom);

    this.font = "LabelText";
  }

  get font(): CSSFont | string | undefined {
    return this._font;
  }

  /**Set a font defined in ui_base.defaults
   e.g. DefaultText*/
  set font(fontDefaultName: CSSFont | string | undefined) {
    if (typeof fontDefaultName === "string") {
      this._font = this.getDefault(fontDefaultName) as CSSFont | undefined;
      if (!this._font) {
        console.warn("Invalid font", fontDefaultName);
      }
    } else if (typeof fontDefaultName === "object" && fontDefaultName instanceof CSSFont) {
      this._font = fontDefaultName;
    } else {
      console.warn("Invalid font", fontDefaultName);
    }

    this._updateFont();
  }

  get text() {
    return this._label;
    //return this.dom.innerText;
  }

  set text(text: string) {
    this._label = text;

    if (!this.hasAttribute("datapath")) {
      this.dom.innerText = text;
    }
  }

  static define() {
    return {
      tagname: "label-x",
      style  : "label",
    };
  }

  init() {
    this.dom.style["width"] = "max-content";
  }

  setCSS() {
    super.setCSS(false);
    this.setBoxCSS();
  }

  on_disabled() {
    super.on_disabled();
    this._enabled_font = this.font;
    this.font = "DefaultText";
    this._updateFont();
  }

  on_enabled() {
    super.on_enabled();
    this.font = this._enabled_font;
    this._updateFont();
  }

  _updateFont() {
    let font = this._font;
    if (!font) return;

    this.dom.style["font"] = (font as CSSFont).genCSS();
    this.dom.style["color"] = (font as CSSFont).color;
  }

  updateDataPath() {
    if (this.ctx === undefined) {
      return;
    }

    let path = this.getAttribute("datapath")!;
    let prop = this.getPathMeta(this.ctx, path)!;
    let val: unknown = this.getPathValue(this.ctx, path);

    if (val === undefined) {
      return;
    }

    //console.log(path);
    if (prop.type & (PropTypes.INT | PropTypes.FLOAT)) {
      val = units.buildString(val as number, prop.baseUnit, prop.decimalPlaces, prop.displayUnit);
    }

    let valStr = "" + this._label + " " + val;

    if (valStr !== this._lastText) {
      this._lastText = valStr;
      this.dom.innerText = valStr;
    }
  }

  update() {
    let key = "";

    if (this._font !== undefined && this._font instanceof CSSFont) {
      key += this._font.genKey();
    }

    if (key !== this._last_font) {
      this._last_font = key;
      this._updateFont();
    }

    styl(this.dom)["pointer-events"] = styl(this)["pointer-events"];

    if (this.hasAttribute("datapath")) {
      this.updateDataPath();
    }
  }
}

ui_base.UIBase.internalRegister(Label as unknown as typeof ui_base.UIBase);

export class Container<CTX extends IContextBase = IContextBase> extends ui_base.UIBase<CTX> {
  declare shadow: ShadowRoot;
  declare packflag: number;
  declare _useDataPathUndo: boolean | undefined;
  declare div: HTMLElement;

  dataPrefix = "";
  massSetPrefix = "";
  inherit_packflag = 0;
  styletag!: HTMLStyleElement;
  reversed = false;
  storagePrefix = "";

  _prefixstack: string[] = [];
  _mass_prefixstack: string[] = [];

  constructor() {
    super();

    this.dataPrefix = "";
    this.massSetPrefix = "";

    this.inherit_packflag = 0;

    let style = (this.styletag = document.createElement("style"));
    style.textContent = `
    `;

    this.shadow.appendChild(style);
    this.reversed = false;

    this._prefixstack = [];
    this._mass_prefixstack = [];
  }

  noUndo() {
    this.setUndo(false);
    return this;
  }

  set background(bg: string) {
    (this as Record<string, unknown>).__background = bg;

    this.styletag.textContent = `div.containerx {
        background-color : ${bg};
      }
    `;
    (this.style as unknown as Record<string, string>)["background-color"] = bg;
  }

  get childWidgets(): ui_base.UIBase<CTX>[] {
    let list: ui_base.UIBase<CTX>[] = [];

    this._forEachChildWidget((n: ui_base.UIBase<CTX>) => {
      list.push(n);
    });

    return list;
  }

  static define() {
    return {
      tagname: "container-x",
    };
  }

  /** recursively change path prefix for all children*/
  changePathPrefix(newprefix: string) {
    let prefix = this.dataPrefix.trim();
    this.dataPrefix = newprefix;

    if (prefix.length > 0) {
      prefix += ".";
    }

    let rec = (n: Record<string, unknown>, con: Container) => {
      if (n instanceof Container && n !== (this as Container)) {
        if (n.dataPrefix.startsWith(prefix)) {
          n.dataPrefix = n.dataPrefix.slice(prefix.length, n.dataPrefix.length);
          n.dataPrefix = con._joinPrefix(n.dataPrefix)!;
          con = n;
        }
      }

      if ((n as unknown as Element).hasAttribute && (n as unknown as Element).hasAttribute("datapath")) {
        let path = (n as unknown as Element).getAttribute("datapath")!;

        if (path.startsWith(prefix)) {
          path = path.slice(prefix.length, path.length);
          path = con._joinPrefix(path)!;
          (n as unknown as Element).setAttribute("datapath", path);

          //update helper tooltips
          (n as Record<string, unknown>).description = (n as Record<string, unknown>).description;
        }
      }

      (n as unknown as ui_base.UIBase)._forEachChildWidget((n2: ui_base.UIBase) => {
        rec(n2 as unknown as Record<string, unknown>, con);
      });
    };

    rec(this as unknown as Record<string, unknown>, this);
  }

  reverse() {
    this.reversed = !this.reversed;
    return this;
  }

  pushMassSetPrefix(val: string) {
    this._mass_prefixstack.push(this.massSetPrefix);
    this.massSetPrefix = val;
    return this;
  }

  pushDataPrefix(val: string) {
    this._prefixstack.push(this.dataPrefix);
    this.dataPrefix = val;
    return this;
  }

  popDataPrefix() {
    this.dataPrefix = this._prefixstack.pop()!;
    return this;
  }

  popMassSetPrefix() {
    this.massSetPrefix = this._mass_prefixstack.pop()!;
    return this;
  }

  saveData() {
    if (this.scrollTop || this.scrollLeft) {
      return {
        scrollTop : this.scrollTop,
        scrollLeft: this.scrollLeft,
      };
    } else {
      return {};
    }
  }

  loadData(obj: Record<string, unknown>): this {
    if (!obj) return this;

    let x = (obj.scrollLeft as number) || 0;
    let y = (obj.scrollTop as number) || 0;

    this.doOnce(() => {
      this.scrollTo(x, y);
    }, 12);

    return this;
  }

  init() {
    (this.style as unknown as Record<string, string>)["display"] = "flex";
    (this.style as unknown as Record<string, string>)["flex-direction"] = this.reversed ? "column-reverse" : "column";
    (this.style as unknown as Record<string, string>)["flex-wrap"] = "nowrap";
    (this.style as unknown as Record<string, string>)["flex-grow"] = "" + this.getDefault("flex-grow", undefined, "1");

    this.setCSS();

    super.init();

    this.setAttribute("class", "containerx");
  }

  /** Returns previous icon flags */
  useIcons(enabled_or_sheet: boolean | number = true) {
    let enabled = !!enabled_or_sheet;

    let mask = PackFlags.USE_ICONS | PackFlags.SMALL_ICON | PackFlags.LARGE_ICON;
    mask = mask | PackFlags.CUSTOM_ICON_SHEET;
    mask = mask | (255 << PackFlags.CUSTOM_ICON_SHEET_START);

    let previous = this.packflag & mask;

    if (!enabled) {
      this.packflag &= ~PackFlags.USE_ICONS;
      this.inherit_packflag &= ~PackFlags.USE_ICONS;

      return previous;
    }

    let sheet: number = enabled_or_sheet as number;

    if (sheet === (true as unknown as number)) {
      sheet = PackFlags.SMALL_ICON;
    } else if (sheet === 1) {
      sheet = PackFlags.LARGE_ICON;
    } else {
      sheet = PackFlags.CUSTOM_ICON_SHEET | (sheet << PackFlags.CUSTOM_ICON_SHEET_START);
    }

    //clear any existing sizing flags
    this.packflag &= ~(PackFlags.SMALL_ICON | PackFlags.LARGE_ICON | PackFlags.CUSTOM_ICON_SHEET);
    this.packflag &= ~(255 << PackFlags.CUSTOM_ICON_SHEET_START);

    this.packflag |= PackFlags.USE_ICONS | sheet;
    this.inherit_packflag |= PackFlags.USE_ICONS | sheet;

    return previous;
  }

  /**
   *
   * @param mode: flexbox wrap mode, can be wrap, nowrap, or wrap-reverse
   * @returns {Container}
   */
  wrap(mode = "wrap") {
    (this.style as unknown as Record<string, string>)["flex-wrap"] = mode;
    return this;
  }

  noMarginsOrPadding() {
    super.noMarginsOrPadding();

    let keys = ["margin", "padding", "margin-block-start", "margin-block-end"];
    keys = keys.concat(["padding-block-start", "padding-block-end"]);

    for (let k of keys) {
      (this.style as unknown as Record<string, string>)[k] = "0px";
    }

    return this;
  }

  setCSS() {
    let rest = "";

    let add = (style: string) => {
      if (!this.hasDefault(style)) {
        return;
      }

      let val = this.getDefault(style);

      if (val !== undefined) {
        rest += `  ${style} = ${val};\n`;
        (this.style as unknown as Record<string, string>)[style] = "" + val;
      }
    };

    add("border-radius");
    add("border-width");
    add("border-top");
    add("border-bottom");
    add("border-left");
    add("border-right");

    this.styletag.textContent = `div.containerx {
        background-color : ${this.getDefault("background-color")};
        ${rest}
      }
      `;
  }

  overrideDefault(key: string, val: string | number) {
    super.overrideDefault(key, val);
    this.setCSS();

    return this;
  }

  /*
   * shorthand for:
   *
   * .row().noMarginsOrPadding().oneAxisPadding()
   * */
  strip(
    themeClass_or_obj: string | Record<string, unknown> = "strip",
    margin1: number = this.getDefault("oneAxisPadding") as number,
    margin2 = 1,
    horiz: boolean | undefined = undefined
  ): Container {
    let themeClass = themeClass_or_obj as string;

    if (typeof themeClass_or_obj === "object") {
      let obj = themeClass_or_obj;

      themeClass = (obj.themeClass as string) ?? "strip";
      margin1 = (obj.margin1 as number) ?? margin1;
      margin2 = (obj.margin2 as number) ?? 1;
      horiz = obj.horiz as boolean | undefined;
    }

    if (horiz === undefined) {
      horiz = this instanceof RowFrame;
      horiz = horiz || this.saneStyle["flex-direction"] === "row";
    }

    let flag = horiz ? PackFlags.STRIP_HORIZ : PackFlags.STRIP_VERT;

    let strip = horiz ? this.row() : this.col();

    if (typeof margin1 !== "number") {
      throw new Error("margin1 was not a number");
    }
    if (typeof margin2 !== "number") {
      throw new Error("margin2 was not a number");
    }

    strip.packflag |= flag;
    strip.dataPrefix = this.dataPrefix;
    strip.massSetPrefix = this.massSetPrefix;

    if (themeClass in theme) {
      strip.overrideClass(themeClass);
      strip.background = strip.getDefault("background-color") as string;
      strip.setCSS();
      strip.overrideClass(themeClass);

      let lastkey: string | undefined;

      strip.updateAfter(function (this: Container) {
        let bradius = strip.getDefault("border-radius");
        let bline = strip.getDefault("border-width");
        let bstyle = strip.getDefault("border-style") || "solid";
        let padding = strip.getDefault("padding");
        let bcolor = strip.getDefault("border-color") || "rgba(0,0,0,0)";
        let margin = strip.getDefault("margin") || 0;

        let blineVal = bline === undefined ? 0 : bline;
        let bradiusVal = bradius === undefined ? 0 : bradius;
        let paddingVal = padding === undefined ? 5 : padding;

        let bg = strip.getDefault("background-color") as string;

        let key = "" + bradiusVal + ":" + blineVal + ":" + bg + ":" + paddingVal + ":";
        key += bstyle + ":" + paddingVal + ":" + bcolor + ":" + margin;

        if (key !== lastkey) {
          lastkey = key;

          strip.oneAxisPadding((margin1 as number) + (paddingVal as number), margin2 + (paddingVal as number));
          strip.setCSS();

          strip.background = bg;

          (strip.style as unknown as Record<string, string>)["margin"] = "" + margin + "px";
          (strip.style as unknown as Record<string, string>)["border"] = `${blineVal}px ${bstyle} ${bcolor}`;
          (strip.style as unknown as Record<string, string>)["border-radius"] = "" + bradiusVal + "px";
        }
      });
    } else {
      console.warn(this.constructor.name + ".strip(): unknown theme class " + themeClass);
    }

    /*
    let prev = strip.previousElementSibling;
    if (prev !== undefined && (prev.packflag & flag)) {
      if (horiz) {
        prev.style["padding-right"] = "0px";
      } else {
        prev.style["padding-top"] = "0px";
      }
    }//*/

    return strip;
  }

  /**
   * tries to set margin along one axis only in smart manner
   * */
  oneAxisMargin(m: number | string = this.getDefault("oneAxisMargin") as number, m2 = 0) {
    (this.style as unknown as Record<string, string>)["margin-top"] = (this.style as unknown as Record<string, string>)[
      "margin-bottom"
    ] = "" + m + "px";
    (this.style as unknown as Record<string, string>)["margin-left"] = (
      this.style as unknown as Record<string, string>
    )["margin-right"] = "" + m2 + "px";

    return this;
  }

  /**
   * tries to set padding along one axis only in smart manner
   * */
  oneAxisPadding(axisPadding: number | string = this.getDefault("oneAxisPadding") as number, otherPadding = 0) {
    (this.style as unknown as Record<string, string>)["padding-top"] = (
      this.style as unknown as Record<string, string>
    )["padding-bottom"] = "" + axisPadding + "px";
    (this.style as unknown as Record<string, string>)["padding-left"] = (
      this.style as unknown as Record<string, string>
    )["padding-right"] = "" + otherPadding + "px";

    return this;
  }

  setMargin(m: number) {
    (this.style as unknown as Record<string, string>)["margin"] = m + "px";

    return this;
  }

  setPadding(m: number) {
    (this.style as unknown as Record<string, string>)["padding"] = m + "px";

    return this;
  }

  setSize(width: number | string | undefined, height: number | string | undefined) {
    if (width !== undefined) {
      if (typeof width == "number")
        (this.style as unknown as Record<string, string>)["width"] = (
          this.div.style as unknown as Record<string, string>
        )["width"] = ~~width + "px";
      else
        (this.style as unknown as Record<string, string>)["width"] = (
          this.div.style as unknown as Record<string, string>
        )["width"] = width;
    }

    if (height !== undefined) {
      if (typeof height == "number")
        (this.style as unknown as Record<string, string>)["height"] = (
          this.div.style as unknown as Record<string, string>
        )["height"] = ~~height + "px";
      else
        (this.style as unknown as Record<string, string>)["height"] = (
          this.div.style as unknown as Record<string, string>
        )["height"] = height;
    }

    return this;
  }

  save() {}

  load() {}

  saveVisibility() {
    (localStorage as Record<string, string>)[this.storagePrefix + "_settings"] = JSON.stringify(this);
    return this;
  }

  loadVisibility() {
    let key = this.storagePrefix + "_settings";
    let ok = true;

    if (key in localStorage) {
      console.log("loading UI visibility state. . .");

      try {
        this.loadJSON(JSON.parse((localStorage as Record<string, string>)[key]));
      } catch (error) {
        util.print_stack(error as Error);
        ok = false;
      }
    }

    return ok;
  }

  toJSON() {
    let ret = {
      opened: !(this as Record<string, unknown>).closed,
    };

    return Object.assign(super.toJSON(), ret);
  }

  _ondestroy() {
    this._forEachChildWidget((n: ui_base.UIBase) => {
      n._ondestroy();
    });

    super._ondestroy();
  }

  loadJSON(obj: Record<string, unknown>) {
    //console.error("ui.js:Container.loadJSON: implement me!");

    return this;
  }

  redrawCurves() {
    throw new Error("Implement me (properly!)");

    if ((this as Record<string, unknown>).closed) return;

    for (let cw of (this as unknown as { curve_widgets: { draw(): void }[] }).curve_widgets) {
      cw.draw();
    }
  }

  listen() {
    window.setInterval(() => {
      this.update();
    }, 150);
  }

  update() {
    super.update();
  }

  appendChild<T extends Node>(child: T): T {
    if (child instanceof ui_base.UIBase) {
      (child as unknown as Record<string, unknown>).ctx = this.ctx;
      (child as unknown as Record<string, unknown>).parentWidget = this;
      this.shadow.appendChild(child);

      if ((child as unknown as Record<string, unknown>).onadd) {
        ((child as unknown as Record<string, unknown>).onadd as () => void)();
      }

      return child;
    }

    return super.appendChild(child);
  }

  clear(trigger_on_destroy = true) {
    for (let child of this.childWidgets) {
      if (child instanceof ui_base.UIBase) {
        child.remove(trigger_on_destroy);
      }
    }
  }

  removeChild<T extends Node>(child: T, trigger_on_destroy = true): T {
    let ret = super.removeChild(child);

    if ((child as Record<string, unknown>).on_remove) {
      ((child as Record<string, unknown>).on_remove as () => void)();
    }

    if (trigger_on_destroy && (child as Record<string, unknown>).on_destroy) {
      ((child as Record<string, unknown>).on_destroy as () => void)();
    }

    (child as Record<string, unknown>).parentWidget = undefined;

    return ret;
  }

  prepend(child: Node) {
    if (child instanceof UIBase) {
      this._prepend(child);
    } else {
      super.prepend(child);
    }
  }

  //*
  _prepend(child: ui_base.UIBase) {
    return this._add(child, true);
  } //*/

  add(child: ui_base.UIBase) {
    return this._add(child);
  }

  insert(i: number, ch: ui_base.UIBase) {
    dyn(ch).parentWidget = this;
    dyn(ch).ctx = this;

    if (i >= this.shadow.childNodes.length) {
      this.add(ch);
    } else {
      this.shadow.insertBefore(ch, util.list(this.childWidgets)[i]);
    }

    if (dyn(ch).onadd) {
      (dyn(ch).onadd as () => void)();
    }
  }

  _add(child: ui_base.UIBase, prepend = false) {
    //paranoia check for if we accidentally got a DOM NodeList
    if (child instanceof NodeList) {
      throw new Error("eek!");
    }

    dyn(child).ctx = this.ctx;
    dyn(child).parentWidget = this;
    dyn(child)._useDataPathUndo = this._useDataPathUndo;

    if (!dyn(child)._themeOverride && this._themeOverride) {
      child.overrideTheme(this._themeOverride);
    }

    if (prepend) {
      this.shadow.prepend(child);
    } else {
      this.shadow.appendChild(child);
    }

    /*
    if (child._ctx) {
      child._init();
    }//*/

    if (dyn(child).onadd) (dyn(child).onadd as () => void)();

    return child;
  }

  //TODO: make sure this works on Electron?
  dynamicMenu(title: string, list: unknown, packflag = 0) {
    //actually, .menu works for now
    return this.menu(title, list, packflag);
  }

  /**example usage:

   .menu([
   "some_tool_path.tool()|CustomLabel",
   ui_widgets.Menu.SEP,
   "some_tool_path.another_tool()",
   "some_tool_path.another_tool()|CustomLabel::Custom Hotkey String",
   ["Name", () => {console.log("do something")}]
   ])

   **/
  menu(title: string, list: unknown, packflag = 0) {
    let dbox = UIBase.createElement("dropbox-x") as ui_base.UIBase & Record<string, unknown>;

    dbox._name = title;
    dbox.setAttribute("simple", "true");
    dbox.setAttribute("name", title);

    if (list instanceof HTMLElement && list.constructor.name === "Menu") {
      dbox._build_menu = function (this: Record<string, unknown>) {
        if (this._menu !== undefined && (this._menu as HTMLElement).parentNode !== undefined) {
          (this._menu as HTMLElement).remove();
        }

        this._menu = createMenu((this as Record<string, unknown>).ctx, title, list);
        return this._menu;
      };
    } else if (list) {
      dbox.template = list;
    }

    this._container_inherit(dbox as ui_base.UIBase, packflag);

    this._add(dbox as ui_base.UIBase);
    return dbox;
  }

  toolPanel(path_or_cls: string | (new (...args: unknown[]) => unknown), args: Record<string, unknown> = {}) {
    let tdef: Record<string, unknown>;
    let cls: Record<string, unknown>;

    if (typeof path_or_cls === "string") {
      cls = ctxApi(this.ctx).api.parseToolPath(path_or_cls);
    } else {
      cls = path_or_cls as unknown as Record<string, unknown>;
    }

    tdef = (cls as unknown as { _getFinalToolDef(): Record<string, unknown> })._getFinalToolDef();

    let packflag = (args.packflag as number) || 0;
    let label = (args.label as string) || (tdef.uiname as string);
    let createCb = (args.createCb || args.create_cb) as Function | undefined;
    let container = (args.container || this.panel(label)) as Container;
    let defaultsPath = (args.defaultsPath as string) || "toolDefaults";

    if (defaultsPath.length > 0 && !defaultsPath.endsWith(".")) {
      defaultsPath += ".";
    }

    let path = defaultsPath + tdef.toolpath;

    container.useIcons(false);

    let inputs = (tdef.inputs || {}) as Record<string, Record<string, unknown>>;
    for (let k in inputs) {
      let prop = inputs[k];

      if ((prop.flag as number) & PropFlags.PRIVATE) {
        continue;
      }

      let apiname = (prop.apiname as string) || k;
      let path2 = path + "." + apiname;

      container.prop(path2);
    }

    container.tool(path_or_cls, packflag, createCb, label);

    return container;
  }

  tool(
    path_or_cls: string | (new (...args: unknown[]) => unknown),
    packflag_or_args: number | Record<string, unknown> = {},
    createCb?: Function,
    label?: string
  ) {
    let cls: Record<string, unknown>;
    let packflag: number;

    if (typeof packflag_or_args === "object") {
      let args = packflag_or_args;

      packflag = args.packflag as number;
      createCb = args.createCb as Function | undefined;
      label = args.label as string | undefined;
    } else {
      packflag = (packflag_or_args as number) || 0;
    }

    if (typeof path_or_cls == "string") {
      if (path_or_cls.search(/\|/) >= 0) {
        let parts = path_or_cls.split("|");

        if (label === undefined && parts.length > 1) {
          label = parts[1].trim();
        }

        path_or_cls = parts[0].trim();
      }

      if (this.ctx === undefined) {
        console.warn("this.ctx was undefined in tool()");
        return;
      }

      cls = ctxApi(this.ctx).api.parseToolPath(path_or_cls);

      if (cls === undefined) {
        console.warn('Unknown tool for toolpath "' + path_or_cls + '"');
        return;
      }
    } else {
      cls = path_or_cls as unknown as Record<string, unknown>;
    }

    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;
    let hotkey: string | undefined;

    if (createCb === undefined) {
      createCb = (cls: unknown) => {
        return ctxApi(this.ctx).api.createTool(this.ctx, path_or_cls);
      };
    }

    let cb = () => {
      console.log("tool run");

      let toolob = createCb!(cls);
      ctxApi(this.ctx).api.execTool(this.ctx, toolob);
    };

    let def =
      typeof path_or_cls === "string"
        ? (ctxApi(this.ctx).api.getToolDef(path_or_cls) as Record<string, unknown>)
        : (cls as unknown as { tooldef(): Record<string, unknown> }).tooldef();
    let tooltip = def.description === undefined ? (def.uiname as string) : (def.description as string);

    //is there a hotkey hardcoded in the class?
    if (def.hotkey !== undefined) {
      tooltip += "\n\t" + def.hotkey;
      hotkey = def.hotkey as string;
    } else {
      //if not, use getToolPathHotkey api
      let path = path_or_cls;

      if (typeof path != "string") {
        path = def.toolpath as string;
      }

      let hotkey = ctxApi(this.ctx).api.getToolPathHotkey(this.ctx, path);
      if (hotkey) {
        tooltip += "\n\tHotkey: " + hotkey;
      }
    }

    let ret: ui_base.UIBase;

    if (def.icon !== undefined && packflag & PackFlags.USE_ICONS) {
      label = label === undefined ? tooltip : label;

      ret = this.iconbutton(def.icon as number, label, cb);

      dyn(ret).iconsheet = iconSheetFromPackFlag(packflag);
      ret.packflag |= packflag;
      dyn(ret).description = tooltip;
    } else {
      label = label === undefined ? (def.uiname as string) : label;

      ret = this.button(label, cb);
      dyn(ret).description = tooltip;
      ret.packflag |= packflag;
    }

    return ret;
  }

  //supports number types
  textbox(inpath?: string, text?: string, cb?: Function, packflag = 0) {
    let path: string | undefined;

    if (inpath) {
      path = this._joinPrefix(inpath);
    }

    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;

    let ret = UIBase.createElement("textbox-x") as ui_base.UIBase & Record<string, unknown>;

    if (path !== undefined) {
      ret.setAttribute("datapath", path);
    }

    dyn(ret).ctx = this.ctx;
    dyn(ret).parentWidget = this;
    ret._init();
    this._add(ret as ui_base.UIBase);

    ret.setCSS();
    ret.update();

    ret.packflag |= packflag;
    dyn(ret).onchange = cb;
    dyn(ret).text = text;

    return ret as ui_base.UIBase;
  }

  pathlabel(inpath?: string, label?: string, packflag = 0) {
    let path: string | undefined;

    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;

    if (inpath) {
      path = this._joinPrefix(inpath);
    }

    let ret = UIBase.createElement("label-x") as Label & Record<string, unknown>;

    if (label === undefined && inpath) {
      let rdef = ctxApi(this.ctx).api.resolvePath(this.ctx, path) as Record<string, unknown> | undefined;
      if (rdef) {
        label =
          ((rdef.prop as Record<string, unknown>).uiname as string) ??
          ((rdef.dpath as Record<string, unknown>).apiname as string);
      } else {
        label = "(error)";
      }
    }

    ret.text = label!;
    ret.packflag = packflag;
    ret.setAttribute("datapath", path!);

    this._add(ret as unknown as ui_base.UIBase);
    ret.setCSS();

    return ret as unknown as ui_base.UIBase;
  }

  label(text: string) {
    let ret = UIBase.createElement("label-x") as Label;
    ret.text = text;

    this._add(ret as unknown as ui_base.UIBase);

    return ret as unknown as ui_base.UIBase;
  }

  /**
   *
   * makes a button for a help picker tool
   * to view tooltips on mobile devices
   * */
  helppicker() {
    let ret = this.iconbutton(ui_base.Icons.HELP, "Help Picker", () => {
      (this.getScreen()! as unknown as { hintPickerTool(): void }).hintPickerTool();
    });

    if (util.isMobile()) {
      //ret.iconsheet = 2;
      //XXX look up in mobile theme properly
    }

    if (ret.ctx) {
      ret._init();
      ret.setCSS();
    }

    return ret;
  }

  iconbutton(icon: number, description: string, cb?: () => void, thisvar?: unknown, packflag = 0) {
    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;

    let ret = UIBase.createElement("iconbutton-x") as ui_base.UIBase & Record<string, unknown>;

    ret.packflag |= packflag;

    ret.setAttribute("icon", "" + icon);
    dyn(ret).description = description;
    dyn(ret).icon = icon;

    dyn(ret).iconsheet = iconSheetFromPackFlag(packflag);

    ret.onclick = cb as unknown as ((this: GlobalEventHandlers, ev: MouseEvent) => unknown) | null;

    this._add(ret as ui_base.UIBase);

    return ret as ui_base.UIBase;
  }

  button(label: string, cb?: () => void, thisvar?: unknown, id?: unknown, packflag = 0) {
    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;

    let ret = UIBase.createElement("button-x") as ui_base.UIBase & Record<string, unknown>;

    ret.packflag |= packflag;

    ret.setAttribute("name", label);
    ret.setAttribute("buttonid", "" + id); //XXX no longer used?
    ret.onclick = cb as unknown as ((this: GlobalEventHandlers, ev: MouseEvent) => unknown) | null;

    this._add(ret as ui_base.UIBase);

    return ret as ui_base.UIBase;
  }

  _joinPrefix(path: string | undefined, prefix = this.dataPrefix.trim()) {
    if (path === undefined) {
      return undefined;
    }

    path = path.trim();
    if (path[0] === "/") {
      return path;
    }

    if (prefix.length > 0 && path.length > 0 && !prefix.endsWith(".") && !path.startsWith(".")) {
      path = "." + path;
    }

    return prefix + path;
  }

  colorbutton(inpath: string | undefined, packflag: number, mass_set_path?: string) {
    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;

    mass_set_path = this._getMassPath(this.ctx, inpath, mass_set_path);

    let ret = UIBase.createElement("color-picker-button-x") as ui_base.UIBase & Record<string, unknown>;

    if (inpath !== undefined) {
      inpath = this._joinPrefix(inpath)!;
      ret.setAttribute("datapath", inpath);
    }

    if (mass_set_path !== undefined) {
      ret.setAttribute("mass_set_path", mass_set_path);
    }

    ret.packflag |= packflag;

    this._add(ret as ui_base.UIBase);
    return ret as ui_base.UIBase;
  }

  noteframe(packflag = 0) {
    let ret = UIBase.createElement("noteframe-x") as ui_base.UIBase & Record<string, unknown>;

    ret.packflag |= (this.inherit_packflag & ~PackFlags.NO_UPDATE) | packflag;

    this._add(ret as ui_base.UIBase);
    return ret as ui_base.UIBase;
  }

  curve1d(inpath?: string, packflag = 0, mass_set_path?: string) {
    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;

    mass_set_path = this._getMassPath(this.ctx, inpath, mass_set_path);

    let ret = UIBase.createElement("curve-widget-x") as ui_base.UIBase & Record<string, unknown>;

    ret.ctx = this.ctx;
    ret.packflag |= packflag;

    if (inpath) {
      inpath = this._joinPrefix(inpath)!;
      ret.setAttribute("datapath", inpath);
    }

    if (mass_set_path) ret.setAttribute("mass_set_path", mass_set_path);

    this.add(ret as ui_base.UIBase);

    return ret as ui_base.UIBase;
  }

  vecpopup(inpath?: string, packflag = 0, mass_set_path?: string) {
    let button = UIBase.createElement("vector-popup-button-x") as ui_base.UIBase & Record<string, unknown>;

    mass_set_path = this._getMassPath(this.ctx, inpath, mass_set_path);

    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;
    let name = "vector";

    if (inpath) {
      inpath = this._joinPrefix(inpath)!;

      button.setAttribute("datapath", inpath);
      if (mass_set_path) {
        button.setAttribute("mass_set_path", mass_set_path);
      }

      let rdef = ctxApi(this.ctx).api.resolvePath(this.ctx, inpath) as Record<string, unknown> | undefined;
      if (rdef && rdef.prop) {
        name =
          ((rdef.prop as Record<string, unknown>).uiname as string) ||
          ((rdef.prop as Record<string, unknown>).name as string);
      }
    }

    button.setAttribute("name", name);
    button.packflag |= packflag;

    this.add(button as ui_base.UIBase);
    return button as ui_base.UIBase;
  }

  _getMassPath(ctx: unknown, inpath: string | undefined, mass_set_path: string | undefined): string | undefined {
    if (mass_set_path === undefined && this.massSetPrefix.length > 0) {
      mass_set_path = ctxApi(ctx).api.getPropName(ctx, inpath) as string;
    }

    if (mass_set_path === undefined) {
      return undefined;
    }

    return this._joinPrefix(mass_set_path, this.massSetPrefix);
  }

  prop(inpath: string, packflag = 0, mass_set_path?: string): ui_base.UIBase | undefined {
    if (!this.ctx) {
      console.warn(this.id + ".ctx was undefined");
      let p = this.parentWidget as ui_base.UIBase | undefined;

      while (p) {
        if (dyn(p).ctx) {
          console.warn("Fetched this.ctx from parent");
          dyn(this).ctx = dyn(p).ctx;
          break;
        }

        p = dyn(p).parentWidget as ui_base.UIBase | undefined;
      }

      if (!this.ctx) {
        throw new Error("ui.Container.prototype.prop(): this.ctx was undefined");
      }
    }

    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;

    let rdef = ctxApi(this.ctx).api.resolvePath(this.ctx, this._joinPrefix(inpath), true) as
      | Record<string, unknown>
      | undefined;

    if (rdef === undefined || rdef.prop === undefined) {
      console.warn(
        "Unknown property at path",
        this._joinPrefix(inpath),
        ctxApi(this.ctx).api.resolvePath(this.ctx, this._joinPrefix(inpath), true)
      );
      return;
    }
    //slider(path, name, defaultval, min, max, step, is_int, do_redraw, callback, packflag=0) {
    let prop = rdef.prop as Record<string, unknown>;

    let useDataPathUndo = this.useDataPathUndo && !((prop.flag as number) & PropFlags.NO_UNDO);

    //console.log(prop, PropTypes, PropSubTypes);

    function makeUIName(name: unknown) {
      if (typeof name === "number" && isNaN(name)) {
        console.warn("Subkey error in data api", inpath);
        return "" + name;
      }

      let s = "" + name;
      s = s[0].toUpperCase() + s.slice(1, s.length).toLowerCase();
      s = s.replace(/_/g, " ");
      return s;
    }

    if ((prop.type as number) === PropTypes.REPORT) {
      return this.pathlabel(inpath, prop.uiname as string);
    } else if ((prop.type as number) === PropTypes.STRING) {
      let ret: ui_base.UIBase;

      if ((prop.flag as number) & PropFlags.READ_ONLY) {
        ret = this.pathlabel(inpath, prop.uiname as string);
      } else if (prop.multiLine) {
        ret = this.textarea(inpath, rdef.value as string, packflag, mass_set_path);
        dyn(ret).useDataPathUndo = useDataPathUndo;
      } else {
        let strip = this.strip();

        let uiname =
          prop.uiname !== undefined
            ? (prop.uiname as string)
            : toolprop.ToolProperty.makeUIName(prop.apiname as string);

        strip.label(prop.uiname as string);

        ret = strip.textbox(inpath) as ui_base.UIBase;
        dyn(ret).useDataPathUndo = useDataPathUndo;

        if (mass_set_path) {
          ret.setAttribute("mass_set_path", mass_set_path);
        }
      }

      ret.packflag |= packflag;
      return ret;
    } else if ((prop.type as number) === PropTypes.CURVE) {
      let ret = this.curve1d(inpath, packflag, mass_set_path);
      dyn(ret).useDataPathUndo = useDataPathUndo;
      return ret;
    } else if ((prop.type as number) === PropTypes.INT || (prop.type as number) === PropTypes.FLOAT) {
      let ret: ui_base.UIBase;
      if (packflag & PackFlags.SIMPLE_NUMSLIDERS) {
        ret = this.simpleslider(inpath, { packflag: packflag });
      } else {
        ret = this.slider(inpath, { packflag: packflag });
      }

      dyn(ret).useDataPathUndo = useDataPathUndo;
      ret.packflag |= packflag;

      if (mass_set_path) {
        ret.setAttribute("mass_set_path", mass_set_path);
      }

      return ret;
    } else if ((prop.type as number) === PropTypes.BOOL) {
      let ret = this.check(inpath, prop.uiname as string, packflag, mass_set_path);
      dyn(ret).useDataPathUndo = useDataPathUndo;
      return ret;
    } else if ((prop.type as number) === PropTypes.ENUM) {
      if (rdef.subkey !== undefined) {
        let subkey = rdef.subkey as string;
        let name = (prop.ui_value_names as Record<string, string>)[rdef.subkey as string];

        if (name === undefined) {
          name = makeUIName(rdef.subkey);
        }

        let check = this.check(inpath, name, packflag, mass_set_path);
        let tooltip = (prop.descriptions as Record<string, string>)[subkey];

        dyn(check).useDataPathUndo = useDataPathUndo;

        dyn(check).description =
          tooltip === undefined ? (prop.ui_value_names as Record<string, string>)[subkey] : tooltip;
        dyn(check).icon = (prop.iconmap as Record<string, unknown>)[rdef.subkey as string];

        return check;
      }

      if (
        !(packflag & PackFlags.USE_ICONS) &&
        !((prop.flag as number) & (PropFlags.USE_ICONS | PropFlags.FORCE_ENUM_CHECKBOXES))
      ) {
        return this.listenum(inpath, { packflag, mass_set_path }).setUndo(useDataPathUndo);
      } else {
        if ((prop.flag as number) & PropFlags.USE_ICONS) {
          packflag |= PackFlags.USE_ICONS;
        } else if ((prop.flag as number) & PropFlags.FORCE_ENUM_CHECKBOXES) {
          packflag &= ~PackFlags.USE_ICONS;
        }

        if (packflag & PackFlags.FORCE_PROP_LABELS) {
          let strip = this.strip();
          strip.label(prop.uiname as string);

          return strip.checkenum(inpath, undefined, packflag).setUndo(useDataPathUndo);
        } else {
          return this.checkenum(inpath, undefined, packflag).setUndo(useDataPathUndo);
        }
      }
    } else if ((prop.type as number) & (PropTypes.VEC2 | PropTypes.VEC3 | PropTypes.VEC4)) {
      if (rdef.subkey !== undefined) {
        let ret: ui_base.UIBase;

        if (packflag & PackFlags.SIMPLE_NUMSLIDERS) ret = this.simpleslider(inpath, { packflag: packflag });
        else ret = this.slider(inpath, { packflag: packflag });

        ret.packflag |= packflag;
        return ret.setUndo(useDataPathUndo);
      } else if ((prop.subtype as number) === PropSubTypes.COLOR) {
        return this.colorbutton(inpath, packflag, mass_set_path).setUndo(useDataPathUndo);
        //return this.colorPicker(inpath, packflag, mass_set_path);
      } else {
        let ret = UIBase.createElement("vector-panel-x") as ui_base.UIBase & { inherit_packflag: number };

        mass_set_path = this._getMassPath(this.ctx, inpath, mass_set_path);

        ret.packflag |= packflag | (this.inherit_packflag & ~PackFlags.NO_UPDATE);
        ret.inherit_packflag |= packflag | (this.inherit_packflag & ~PackFlags.NO_UPDATE);

        if (inpath) {
          ret.setAttribute("datapath", this._joinPrefix(inpath)!);
        }

        if (mass_set_path) {
          ret.setAttribute("mass_set_path", mass_set_path);
        }

        this.add(ret as ui_base.UIBase);

        return (ret as ui_base.UIBase).setUndo(useDataPathUndo);
      }
    } else if ((prop.type as number) === PropTypes.FLAG) {
      if (rdef.subkey !== undefined) {
        let tooltip = (prop.descriptions as Record<string, string>)[rdef.subkey as string];
        let name = (prop.ui_value_names as Record<string, string>)[rdef.subkey as string];

        if (typeof rdef.subkey === "number") {
          name = (prop.keys as Record<number, string>)[rdef.subkey];
          if (name && name in (prop.ui_value_names as Record<string, string>)) {
            name = (prop.ui_value_names as Record<string, string>)[name];
          } else {
            name = makeUIName(name ? name : "(error)");
          }
        }

        if (name === undefined) {
          name = "(error)";
        }

        let ret = this.check(inpath, name, packflag, mass_set_path);

        dyn(ret).icon = (prop.iconmap as Record<string, unknown>)[rdef.subkey as string];

        if (tooltip) {
          dyn(ret).description = tooltip;
        }

        return ret.setUndo(useDataPathUndo);
      } else {
        let con: Container = this;

        if (packflag & PackFlags.FORCE_PROP_LABELS) {
          con = this.strip() as Container;
          con.label(prop.uiname as string);
        }

        if (packflag & PackFlags.PUT_FLAG_CHECKS_IN_COLUMNS) {
          let i = 0;
          let row = con.row();
          let col1 = row.col();
          let col2 = row.col();

          for (let k in prop.values as Record<string, unknown>) {
            let name = (prop.ui_value_names as Record<string, string>)[k];
            let tooltip = (prop.descriptions as Record<string, string>)[k];

            if (name === undefined) {
              name = makeUIName(k);
            }

            let con2 = i & 1 ? col1 : col2;
            let check = con2.check(`${inpath}[${k}]`, name, packflag, mass_set_path);

            if (tooltip) {
              dyn(check).description = tooltip;
            }

            check.setUndo(useDataPathUndo);

            i++;
          }

          return row as unknown as ui_base.UIBase;
        }

        if (packflag & PackFlags.WRAP_CHECKBOXES) {
          let isrow = (this.style as unknown as Record<string, string>)["flex-direction"] === "row";
          isrow = isrow || (this.style as unknown as Record<string, string>)["flex-direction"] === "row-reverse";

          let wrapChars: number;

          let strip2: Container, con2: Container;

          if (isrow) {
            wrapChars = this.getDefault("checkRowWrapLimit", undefined, 24) as number;
            strip2 = this.col().strip() as Container;
            strip2.packflag |= packflag;
            strip2.inherit_packflag |= packflag;

            con2 = strip2.row();
          } else {
            wrapChars = this.getDefault("checkColWrapLimit", undefined, 5) as number;
            strip2 = this.row().strip() as Container;
            strip2.packflag |= packflag;
            strip2.inherit_packflag |= packflag;

            con2 = strip2.col();
          }

          let x = 0;
          let y = 0;

          for (let k in prop.values as Record<string, unknown>) {
            let name = (prop.ui_value_names as Record<string, string>)[k];
            let tooltip = (prop.descriptions as Record<string, string>)[k];

            if (name === undefined) {
              name = makeUIName(k);
            }

            let check = con2.check(`${inpath}[${k}]`, name, packflag, mass_set_path);

            if (tooltip) {
              dyn(check).description = tooltip;
            }

            x += name.length;
            y += 1;

            if (isrow && x > wrapChars) {
              x = 0;
              con2 = strip2.row();
            } else if (!isrow && y > wrapChars) {
              y = 0;
              con2 = strip2.col();
            }
          }

          return strip2 as unknown as ui_base.UIBase;
        }

        if (con === this) {
          con = this.strip() as Container;
        }

        let rebuild = () => {
          con.clear();

          for (let k in prop.values as Record<string, unknown>) {
            let name = (prop.ui_value_names as Record<string, string>)[k];
            let tooltip = (prop.descriptions as Record<string, string>)[k];

            if (name === undefined) {
              name = makeUIName(k);
            }

            let check = con.check(`${inpath}[${k}]`, name, packflag, mass_set_path);
            dyn(check).useDataPathUndo = useDataPathUndo;

            if (tooltip) {
              dyn(check).description = tooltip;
            }

            check.setUndo(useDataPathUndo);
          }
        };

        rebuild();
        let last_hash = (prop as unknown as { calcHash(): number }).calcHash();

        con.updateAfter(() => {
          let hash = (prop as unknown as { calcHash(): number }).calcHash();

          if (last_hash !== hash) {
            last_hash = hash;
            console.error("Property definition update");
            rebuild();
          }
        });

        return con as unknown as ui_base.UIBase;
      }
    }
  }

  iconcheck(inpath: string | undefined, icon: number, name: string, mass_set_path?: string) {
    let ret = UIBase.createElement("iconcheck-x") as ui_base.UIBase & Record<string, unknown>;
    ret.icon = icon;
    ret.description = name;

    if (inpath) {
      ret.setAttribute("datapath", inpath);
    }

    if (mass_set_path) {
      ret.setAttribute("mass_set_path", mass_set_path);
    }

    this.add(ret as ui_base.UIBase);

    return ret as ui_base.UIBase;
  }

  check(inpath: string | undefined, name: string, packflag = 0, mass_set_path?: string) {
    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;

    let path = inpath !== undefined ? this._joinPrefix(inpath) : undefined;

    //let prop = this.ctx.getProp(path);
    let ret: ui_base.UIBase & Record<string, unknown>;
    if (packflag & PackFlags.USE_ICONS) {
      ret = UIBase.createElement("iconcheck-x") as ui_base.UIBase & Record<string, unknown>;

      ret.iconsheet = iconSheetFromPackFlag(packflag);
    } else {
      ret = UIBase.createElement("check-x") as ui_base.UIBase & Record<string, unknown>;
    }

    mass_set_path = this._getMassPath(this.ctx, inpath, mass_set_path);

    ret.packflag |= packflag;
    ret.label = name;
    ret.noMarginsOrPadding();

    if (inpath) {
      ret.setAttribute("datapath", path!);
    }

    if (mass_set_path) {
      ret.setAttribute("mass_set_path", mass_set_path);
    }

    this._add(ret as ui_base.UIBase);
    return ret as ui_base.UIBase;
  }

  /*
   *
   * new (optional) form: checkenum(inpath, args)
   * */
  checkenum(
    inpath: string | undefined,
    name?: string | Record<string, unknown> | null,
    packflag?: number,
    enummap?: unknown,
    defaultval?: unknown,
    callback?: Function,
    iconmap?: unknown,
    mass_set_path?: string
  ): ui_base.UIBase {
    if (typeof name === "object" && name !== null) {
      let args = name;

      name = args.name as string | undefined;
      packflag = args.packflag as number | undefined;
      enummap = args.enummap;
      defaultval = args.defaultval;
      callback = args.callback as Function | undefined;
      iconmap = args.iconmap;
      mass_set_path = args.mass_set_path as string | undefined;
    }

    mass_set_path = this._getMassPath(this.ctx, inpath, mass_set_path);

    packflag = packflag === undefined ? 0 : packflag;
    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;

    let path = this._joinPrefix(inpath);

    let has_path = path !== undefined;
    let prop: Record<string, unknown> | undefined;
    let frame: Container | undefined;

    if (path !== undefined) {
      let resolved = ctxApi(this.ctx).api.resolvePath(this.ctx, path, true) as Record<string, unknown> | undefined;
      prop = resolved !== undefined ? (resolved.prop as Record<string, unknown>) : undefined;
    }

    if (path !== undefined) {
      if (prop === undefined) {
        console.warn("Bad path in checkenum", path);
        return undefined as unknown as ui_base.UIBase;
      }

      frame = this.strip();
      frame.oneAxisPadding();

      if (packflag & PackFlags.USE_ICONS) {
        for (let key in prop.values as Record<string, unknown>) {
          let check = frame!.check(inpath + "[" + key + "]", "", packflag) as ui_base.UIBase & Record<string, unknown>;

          check.packflag |= PackFlags.HIDE_CHECK_MARKS;

          check.icon = (prop.iconmap as Record<string, unknown>)[key];
          check.drawCheck = false;

          (check.style as unknown as Record<string, string>)["padding"] = "0px";
          (check.style as unknown as Record<string, string>)["margin"] = "0px";

          styl((check as unknown as { dom: HTMLElement }).dom)["padding"] = "0px";
          styl((check as unknown as { dom: HTMLElement }).dom)["margin"] = "0px";

          check.description = (prop.descriptions as Record<string, string>)[key];
          //console.log(check.description, key, prop.keys[key], prop.descriptions, prop.keys);
        }
      } else {
        if (name === undefined) {
          name = prop.uiname as string;
        }

        (frame!.label(name!) as unknown as Label).font = "TitleText";

        let checks: Record<string, Record<string, unknown>> = {};

        let ignorecb = false;

        function makecb(key: string) {
          return () => {
            if (ignorecb) return;

            ignorecb = true;
            for (let k in checks) {
              if (k !== key) {
                checks[k].checked = false;
              }
            }
            ignorecb = false;

            if (callback) {
              callback(key);
            }
          };
        }

        for (let key in prop.values as Record<string, unknown>) {
          let check = frame!.check(
            `${inpath}[${key}]`,
            (prop.ui_value_names as Record<string, string>)[key]
          ) as ui_base.UIBase & Record<string, unknown>;
          checks[key] = check;

          if (mass_set_path) {
            check.setAttribute("mass_set_path", mass_set_path);
          }

          check.description = (prop.descriptions as Record<string, string>)[(prop.keys as Record<string, string>)[key]];
          if (!check.description) {
            check.description = "" + (prop.ui_value_names as Record<string, string>)[key];
          }
          check.onchange = makecb(key);
        }
      }
    }

    return frame! as unknown as ui_base.UIBase;
  }

  checkenum_panel(
    inpath: string,
    name?: string,
    packflag = 0,
    callback?: Function,
    mass_set_path?: string,
    prop?: Record<string, unknown>
  ) {
    packflag = packflag === undefined ? 0 : packflag;
    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;

    let path = this._joinPrefix(inpath);
    let frame: Container | undefined;

    let has_path = path !== undefined;

    if (path !== undefined && prop === undefined) {
      let resolved = ctxApi(this.ctx).api.resolvePath(this.ctx, path, true) as Record<string, unknown> | undefined;
      prop = resolved !== undefined ? (resolved.prop as Record<string, unknown>) : undefined;
    }

    if (!name && prop) {
      name = prop.uiname as string;
    }

    if (path !== undefined) {
      if (prop === undefined) {
        console.warn("Bad path in checkenum", path);
        return;
      }

      frame = this.panel(name!, name, packflag) as unknown as Container;

      frame.oneAxisPadding();
      frame.setCSSAfter(
        () => frame!.background = this.getDefault("BoxSub2BG") as string
      );

      if (packflag & PackFlags.USE_ICONS) {
        for (let key in prop.values as Record<string, unknown>) {
          let check = frame.check(
            inpath + " == " + (prop.values as Record<string, unknown>)[key],
            "",
            packflag
          ) as ui_base.UIBase & Record<string, unknown>;

          check.icon = (prop.iconmap as Record<string, unknown>)[key];
          check.drawCheck = false;

          (check.style as unknown as Record<string, string>)["padding"] = "0px";
          (check.style as unknown as Record<string, string>)["margin"] = "0px";

          styl((check as unknown as { dom: HTMLElement }).dom)["padding"] = "0px";
          styl((check as unknown as { dom: HTMLElement }).dom)["margin"] = "0px";

          check.description = (prop.descriptions as Record<string, string>)[key];
          //console.log(check.description, key, prop.keys[key], prop.descriptions, prop.keys);
        }
      } else {
        if (name === undefined) {
          name = prop.uiname as string;
        }

        (frame.label(name!) as unknown as Label).font = "TitleText";

        let checks: Record<string, Record<string, unknown>> = {};

        let ignorecb = false;

        function makecb(key: string) {
          return () => {
            if (ignorecb) return;

            ignorecb = true;
            for (let k in checks) {
              if (k !== key) {
                checks[k].checked = false;
              }
            }
            ignorecb = false;

            if (callback) {
              callback(key);
            }
          };
        }

        for (let key in prop.values as Record<string, unknown>) {
          let check = frame.check(
            inpath + " = " + (prop.values as Record<string, unknown>)[key],
            (prop.ui_value_names as Record<string, string>)[key]
          ) as ui_base.UIBase & Record<string, unknown>;
          checks[key] = check;

          if (mass_set_path) {
            check.setAttribute("mass_set_path", mass_set_path);
          }

          check.description = (prop.descriptions as Record<string, string>)[(prop.keys as Record<string, string>)[key]];
          if (!check.description) {
            check.description = "" + (prop.ui_value_names as Record<string, string>)[key];
          }
          check.onchange = makecb(key);
          //console.log("PATH", path);
        }
      }
    }

    return frame;
  }

  /*
    enummap is an object that maps
    ui names to keys, e.g.:

    ui.listenum("color", "Color", {
      RED   : 0,
      GREEN : 1,
      BLUE  : 2
    });

    path can be undefined, in which case, use callback,
    which gets the current enum as an argument

    defaultval cannot be undefined
  */
  listenum(
    inpath: string | undefined,
    name?: string | Record<string, unknown>,
    enumDef?: unknown,
    defaultval?: unknown,
    callback?: Function,
    iconmap?: unknown,
    packflag = 0
  ): ui_base.UIBase {
    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;
    let mass_set_path: string | undefined;

    if (name && typeof name === "object") {
      let args = name;

      name = args.name as string | undefined;
      enumDef = args.enumDef;
      defaultval = args.defaultval;
      callback = args.callback as Function | undefined;
      iconmap = args.iconmap;
      packflag = (args.packflag as number) || 0;
      mass_set_path = args.mass_set_path as string | undefined;
    }

    mass_set_path = this._getMassPath(this.ctx, inpath, mass_set_path);

    let path: string | undefined;
    let label = name as string | undefined;

    if (inpath !== undefined) {
      path = this._joinPrefix(inpath);
    }

    let ret = UIBase.createElement("dropbox-x") as ui_base.UIBase & Record<string, unknown>;

    if (enumDef !== undefined) {
      if (enumDef instanceof toolprop.EnumProperty) {
        ret.prop = enumDef;
        label ||= (enumDef.uiname as string) || toolprop.ToolProperty.makeUIName(enumDef.apiname as string);
      } else {
        ret.prop = new toolprop.EnumProperty(
          defaultval as string | number | undefined,
          enumDef as Record<string, number>,
          path,
          name as string
        );
      }

      if (iconmap !== undefined) {
        (ret.prop as Record<string, Function>).addIcons(iconmap);
      }
    } else {
      let res = ctxApi(this.ctx).api.resolvePath(this.ctx, path, true) as Record<string, unknown> | undefined;

      if (res !== undefined) {
        ret.prop = res.prop;

        name ||= (res.prop as Record<string, unknown>).uiname as string;
        label ||= name as string;
      }
    }

    mass_set_path = this._getMassPath(this.ctx, inpath, mass_set_path);
    if (path !== undefined) {
      ret.setAttribute("datapath", path);
    }
    if (mass_set_path !== undefined) {
      ret.setAttribute("mass_set_path", mass_set_path);
    }

    ret.setAttribute("name", name as string);

    if (defaultval) {
      (ret as unknown as { setValue(v: unknown): void }).setValue(defaultval);
    }

    dyn(ret).onchange = callback;
    dyn(ret).onselect = callback;

    ret.packflag |= packflag;

    if (label && packflag & PackFlags.FORCE_PROP_LABELS) {
      const container = this.row();
      let l: ui_base.UIBase;

      if (packflag & PackFlags.LABEL_ON_RIGHT) {
        container._add(ret as ui_base.UIBase);
        l = container.label(label);

        if (
          !(l.style as unknown as Record<string, string>)["margin-left"] ||
          (l.style as unknown as Record<string, string>)["margin-left"] === "unset"
        ) {
          (l.style as unknown as Record<string, string>)["margin-left"] = "5px";
        }
      } else {
        l = container.label(label);
        container._add(ret as ui_base.UIBase);
      }
    } else {
      this._add(ret as ui_base.UIBase);
    }

    return ret as ui_base.UIBase;
  }

  getroot(): Container {
    let p: Container = this;

    while (dyn(p).parent !== undefined) {
      p = dyn(p).parent as Container;
    }

    return p;
  }

  simpleslider(
    inpath: string | undefined,
    name?: string | Record<string, unknown>,
    defaultval?: number,
    min?: number,
    max?: number,
    step?: number,
    is_int?: boolean,
    do_redraw?: boolean,
    callback?: Function,
    packflag = 0
  ): ui_base.UIBase {
    if (arguments.length === 2 || typeof name === "object") {
      let args = Object.assign({}, name as Record<string, unknown>);

      args.packflag = ((args.packflag as number) || 0) | PackFlags.SIMPLE_NUMSLIDERS;
      return this.slider(inpath, args);
      //new-style api call
    } else {
      return this.slider(
        inpath,
        name,
        defaultval,
        min,
        max,
        step,
        is_int,
        do_redraw,
        callback,
        packflag | PackFlags.SIMPLE_NUMSLIDERS
      );
    }
  }

  /**
   *
   * usage: .slider(inpath, {
   *  name : bleh,
   *  defaultval : number,
   *  etc...
   * });
   * */
  slider(
    inpath: string | undefined,
    name?: string | Record<string, unknown>,
    defaultval?: number,
    min?: number,
    max?: number,
    step?: number,
    is_int?: boolean,
    do_redraw?: boolean,
    callback?: Function,
    packflag = 0
  ): ui_base.UIBase {
    if (arguments.length === 2 || typeof name === "object") {
      //new-style api call

      let args = name as Record<string, unknown>;

      name = args.name as string | undefined;
      defaultval = args.defaultval as number | undefined;
      min = args.min as number | undefined;
      max = args.max as number | undefined;
      step = args.step as number | undefined;
      is_int = (args.is_int || args.isInt) as boolean | undefined;
      do_redraw = args.do_redraw as boolean | undefined;
      callback = args.callback as Function | undefined;
      packflag = (args.packflag as number) || 0;
    }

    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;
    let ret: ui_base.UIBase & Record<string, unknown>;

    if (inpath) {
      inpath = this._joinPrefix(inpath)!;

      let rdef = ctxApi(this.ctx).api.resolvePath(this.ctx, inpath, true) as Record<string, unknown> | undefined;
      if (rdef && rdef.prop && ((rdef.prop as Record<string, unknown>).flag as number) & PropFlags.SIMPLE_SLIDER) {
        packflag |= PackFlags.SIMPLE_NUMSLIDERS;
      }
      if (
        rdef &&
        rdef.prop &&
        ((rdef.prop as Record<string, unknown>).flag as number) & PropFlags.FORCE_ROLLER_SLIDER
      ) {
        packflag |= PackFlags.FORCE_ROLLER_SLIDER;
      }
    }

    let simple: boolean | number = packflag & PackFlags.SIMPLE_NUMSLIDERS || cconst.simpleNumSliders;
    simple = simple && !(packflag & PackFlags.FORCE_ROLLER_SLIDER);

    let extraTextBox = cconst.useNumSliderTextboxes && !(packflag & PackFlags.NO_NUMSLIDER_TEXTBOX);

    if (extraTextBox) {
      if (simple) {
        ret = UIBase.createElement("numslider-simple-x") as ui_base.UIBase & Record<string, unknown>;
      } else {
        ret = UIBase.createElement("numslider-textbox-x") as ui_base.UIBase & Record<string, unknown>;
      }
    } else {
      if (simple) {
        ret = UIBase.createElement("numslider-simple-x") as ui_base.UIBase & Record<string, unknown>;
      } else {
        ret = UIBase.createElement("numslider-x") as ui_base.UIBase & Record<string, unknown>;
      }
    }

    ret.packflag |= packflag;

    let decimals: number | undefined;

    if (inpath) {
      ret.setAttribute("datapath", inpath);
    }

    if (name) {
      ret.setAttribute("name", name as string);
    }

    if (min !== undefined) {
      ret.setAttribute("min", "" + min);
    }
    if (max !== undefined) {
      ret.setAttribute("max", "" + max);
    }

    if (defaultval !== undefined) {
      (ret as unknown as { setValue(v: number): void }).setValue(defaultval);
    }

    if (is_int) {
      ret.setAttribute("integer", "" + is_int);
    }

    if (decimals !== undefined) {
      ret.decimalPlaces = decimals;
    }

    if (callback) {
      dyn(ret).onchange = callback;
    }

    this._add(ret as ui_base.UIBase);

    if (this.ctx) {
      ret.setCSS();
      ret.update();
    }

    return ret as ui_base.UIBase;
  }

  _container_inherit(elem: ui_base.UIBase, packflag = 0) {
    //don't inherit NO_UPDATE

    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;

    elem.packflag |= packflag;
    (elem as unknown as Container).inherit_packflag |= packflag;
    (elem as unknown as Container).dataPrefix = this.dataPrefix;
    (elem as unknown as Container).massSetPrefix = this.massSetPrefix;
  }

  treeview() {
    //XXX property type me
    let ret = UIBase.createElement("tree-view-x") as ui_base.UIBase<CTX>;
    ret.ctx = this.ctx;
    this.add(ret);

    this._container_inherit(ret);

    return ret;
  }

  panel(name: string, id?: string, packflag = 0, tooltip?: string) {
    id = id === undefined ? name : id;

    // XXX todo: add <CTX> after panelFrame is moved to TS
    let ret = UIBase.createElement("panelframe-x") as PanelFrame as unknown as ui_base.UIBase<CTX>;

    this._container_inherit(ret, packflag);

    if (tooltip) {
      (ret as unknown as { setHeaderToolTip(t: string): void }).setHeaderToolTip(tooltip);
    }

    ret.setAttribute("label", name);
    ret.setAttribute("id", id);

    this._add(ret);

    if (this.ctx) {
      //check init was called
      ret.ctx = this.ctx;
      ret._init();
      //ret.headerLabel = name;

      (dyn(ret).contents as Record<string, unknown>).ctx = ret.ctx;
    }

    (dyn(ret).contents as Record<string, unknown>).dataPrefix = this.dataPrefix;
    (dyn(ret).contents as Record<string, unknown>).massSetPrefix = this.massSetPrefix;

    return ret;
  }

  row(packflag = 0): RowFrame<CTX> {
    let ret = UIBase.createElement("rowframe-x") as unknown as RowFrame<CTX>;

    this._container_inherit(ret, packflag);
    this._add(ret);

    dyn(ret).ctx = this.ctx;

    return ret;
  }

  listbox(packflag = 0) {
    let ret = UIBase.createElement("listbox-x") as ui_base.UIBase;

    this._container_inherit(ret, packflag);

    this._add(ret);
    return ret;
  }

  table(packflag = 0): TableFrame {
    let ret = UIBase.createElement("tableframe-x") as unknown as TableFrame;

    this._container_inherit(ret as unknown as ui_base.UIBase, packflag);

    this._add(ret as unknown as ui_base.UIBase);
    return ret;
  }

  twocol(parentDepth = 1, packflag = 0) {
    let ret = UIBase.createElement("two-column-x") as unknown as TwoColumnFrame<CTX>;

    ret.parentDepth = parentDepth;

    this._container_inherit(ret, packflag);

    this._add(ret);
    return ret;
  }

  col(packflag = 0): ColumnFrame {
    let ret = UIBase.createElement("colframe-x") as unknown as ColumnFrame;

    this._container_inherit(ret as unknown as ui_base.UIBase, packflag);

    this._add(ret as unknown as ui_base.UIBase);
    return ret;
  }

  colorPicker(
    inpath?: string,
    packflag_or_args: number | Record<string, unknown> = 0,
    mass_set_path?: string,
    themeOverride?: string
  ) {
    let packflag: number;

    if (typeof packflag_or_args === "object") {
      let args = packflag_or_args;

      packflag = args.packflag !== undefined ? (args.packflag as number) : 0;
      mass_set_path = args.massSetPath as string | undefined;
      themeOverride = args.themeOverride as string | undefined;
    } else {
      packflag = packflag_or_args;
    }

    let path: string | undefined;

    if (inpath) {
      path = this._joinPrefix(inpath);
    }

    let ret = UIBase.createElement("colorpicker-x") as ui_base.UIBase & Record<string, unknown>;

    if (themeOverride) {
      ret.overrideClass(themeOverride);
    }

    packflag |= PackFlags.SIMPLE_NUMSLIDERS;

    this._container_inherit(ret as ui_base.UIBase, packflag);

    dyn(ret).ctx = this.ctx;
    dyn(ret).parentWidget = this;
    ret._init();
    ret.packflag |= packflag;
    (ret as unknown as Container).inherit_packflag |= packflag;
    (ret.constructor as unknown as { setDefault(el: ui_base.UIBase): void }).setDefault(ret as ui_base.UIBase);

    if (path !== undefined) {
      ret.setAttribute("datapath", path);
    }

    console.warn("mass_set_path", mass_set_path);
    if (mass_set_path) {
      ret.setAttribute("mass_set_path", mass_set_path);
    }

    //XXX
    dyn(window).colorpicker = ret;

    this._add(ret as ui_base.UIBase);
    return ret as ui_base.UIBase;
  }

  textarea(datapath?: string, value = "", packflag = 0, mass_set_path?: string) {
    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;

    mass_set_path = this._getMassPath(this.ctx, datapath, mass_set_path);

    let ret = UIBase.createElement("rich-text-editor-x") as ui_base.UIBase & Record<string, unknown>;
    ret.ctx = this.ctx;

    ret.packflag |= packflag;

    if (value !== undefined) {
      ret.value = value;
    }

    if (datapath) ret.setAttribute("datapath", datapath);
    if (mass_set_path) ret.setAttribute("mass_set_path", mass_set_path);

    this.add(ret as ui_base.UIBase);
    return ret as ui_base.UIBase;
  }

  /**
   * html5 viewer
   * */
  viewer(datapath?: string, value = "", packflag = 0, mass_set_path?: string) {
    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;

    mass_set_path = this._getMassPath(this.ctx, datapath, mass_set_path);

    let ret = UIBase.createElement("html-viewer-x") as ui_base.UIBase & Record<string, unknown>;
    ret.ctx = this.ctx;

    ret.packflag |= packflag;

    if (value !== undefined) {
      ret.value = value;
    }

    if (datapath) ret.setAttribute("datapath", datapath);
    if (mass_set_path) ret.setAttribute("mass_set_path", mass_set_path);

    this.add(ret as ui_base.UIBase);
    return ret as ui_base.UIBase;
  }

  //
  tabs(position: "top" | "bottom" | "left" | "right" = "top", packflag = 0) {
    let ret = UIBase.createElement("tabcontainer-x") as ui_base.UIBase<CTX>;

    (ret.constructor as unknown as { setDefault(el: ui_base.UIBase): void }).setDefault(ret as ui_base.UIBase);
    ret.setAttribute("bar_pos", position);

    this._container_inherit(ret, packflag);

    this._add(ret);
    return ret as unknown as TabContainer;
  }

  asDialogFooter() {
    (this.style as unknown as Record<string, string>)["margin-top"] = "15px";
    (this.style as unknown as Record<string, string>)["justify-content"] = "flex-end";

    return this;
  }
}

ui_base.UIBase.internalRegister(Container as unknown as typeof ui_base.UIBase);

export class RowFrame<CTX extends IContextBase = IContextBase> extends Container<CTX> {
  constructor() {
    super();
  }

  static define() {
    return {
      tagname: "rowframe-x",
    };
  }

  //try to set styling as early as possible
  connectedCallback() {
    super.connectedCallback();

    (this.style as unknown as Record<string, string>)["display"] = "flex";
    (this.style as unknown as Record<string, string>)["flex-direction"] = this.reversed ? "row-reverse" : "row";
  }

  init() {
    super.init();

    (this.style as unknown as Record<string, string>)["display"] = "flex";
    (this.style as unknown as Record<string, string>)["flex-direction"] = this.reversed ? "row-reverse" : "row";

    if (
      !(this.style as unknown as Record<string, string>)["align-items"] ||
      (this.style as unknown as Record<string, string>)["align-items"] == ""
    ) {
      (this.style as unknown as Record<string, string>)["align-items"] = "center";
    }

    if (this.getDefault("slider-style") === "simple") {
      this.packflag |= PackFlags.SIMPLE_NUMSLIDERS;
      this.inherit_packflag |= PackFlags.SIMPLE_NUMSLIDERS;
    }
  }

  oneAxisMargin(m: number | string = this.getDefault("oneAxisMargin") as number, m2 = 0) {
    (this.style as unknown as Record<string, string>)["margin-left"] = (
      this.style as unknown as Record<string, string>
    )["margin-right"] = m + "px";
    (this.style as unknown as Record<string, string>)["margin-top"] = (this.style as unknown as Record<string, string>)[
      "margin-bottom"
    ] = "" + m2 + "px";

    return this;
  }

  oneAxisPadding(m: number | string = this.getDefault("oneAxisPadding") as number, m2 = 0) {
    (this.style as unknown as Record<string, string>)["padding-left"] = (
      this.style as unknown as Record<string, string>
    )["padding-right"] = "" + m + "px";
    (this.style as unknown as Record<string, string>)["padding-top"] = (
      this.style as unknown as Record<string, string>
    )["padding-bottom"] = "" + m2 + "px";

    return this;
  }

  update() {
    super.update();
  }
}

UIBase.internalRegister(RowFrame as unknown as typeof UIBase);

export class ColumnFrame<CTX extends IContextBase = IContextBase> extends Container<CTX> {
  constructor() {
    super();
  }

  static define() {
    return {
      tagname: "colframe-x",
    };
  }

  init() {
    super.init();

    (this.style as unknown as Record<string, string>)["display"] = "flex";
    (this.style as unknown as Record<string, string>)["flex-direction"] = "column";
    (this.style as unknown as Record<string, string>)["justify-content"] = "right";
  }

  update() {
    super.update();
  }

  oneAxisMargin(m: number | string = this.getDefault("oneAxisMargin") as number, m2 = 0) {
    (this.style as unknown as Record<string, string>)["margin-top"] = (this.style as unknown as Record<string, string>)[
      "margin-bottom"
    ] = "" + m + "px";
    (this.style as unknown as Record<string, string>)["margin-left"] = (
      this.style as unknown as Record<string, string>
    )["margin-right"] = m2 + "px";

    return this;
  }

  oneAxisPadding(m: number | string = this.getDefault("oneAxisPadding") as number, m2 = 0) {
    (this.style as unknown as Record<string, string>)["padding-top"] = (
      this.style as unknown as Record<string, string>
    )["padding-bottom"] = "" + m + "px";
    (this.style as unknown as Record<string, string>)["padding-left"] = (
      this.style as unknown as Record<string, string>
    )["padding-right"] = "" + m2 + "px";

    return this;
  }
}

UIBase.internalRegister(ColumnFrame as unknown as typeof UIBase);

export class TableFrame<CTX extends IContextBase = IContextBase> extends Container<CTX> {
  static define() {
    return {
      tagname: "tableframe-x",
    };
  }
}

// TableFrame was not registered in the original; keep it consistent
// (the original file did not have a TableFrame class, but it's referenced
// in createElement("tableframe-x") calls)

export class TwoColumnFrame<CTX extends IContextBase = IContextBase> extends Container<CTX> {
  _colWidth = 256;
  parentDepth = 1;

  constructor() {
    super();

    this._colWidth = 256;
    this.parentDepth = 1;
  }

  get colWidth() {
    if (this.hasAttribute("colWidth")) {
      return parsepx(this.getAttribute("colWidth")!);
    }

    return this._colWidth;
  }

  set colWidth(v: number) {
    if (this.hasAttribute("colWidth")) {
      this.setAttribute("colWidth", "" + v);
    } else {
      this._colWidth = v;
    }
  }

  static define() {
    return {
      tagname: "two-column-x",
    };
  }

  init() {
    super.init();

    (this.style as unknown as Record<string, string>)["display"] = "flex";
    (this.style as unknown as Record<string, string>)["flex-direction"] = "column";
  }

  update() {
    super.update();

    let p: ui_base.UIBase | undefined = this as unknown as ui_base.UIBase;

    for (let i = 0; i < this.parentDepth; i++) {
      p = dyn(p).parentWidget ? (dyn(p).parentWidget as ui_base.UIBase) : p;
    }

    if (!p) {
      return;
    }

    let r = p.getBoundingClientRect();

    if (!r) {
      return;
    }

    let style = r.width > this.colWidth * 2.0 ? "row" : "column";

    if ((this.style as unknown as Record<string, string>)["flex-direction"] !== style) {
      (this.style as unknown as Record<string, string>)["flex-direction"] = style;
    }
  }
}

UIBase.internalRegister(TwoColumnFrame as unknown as typeof UIBase);

function parsepx(css: string): number {
  return parseFloat(css);
}
