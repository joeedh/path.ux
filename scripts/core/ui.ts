//bind module to global var to get at it in console.
//
//note that require has an api for handling circular
//module refs, in such cases do not use these vars.

import { TextBox } from "../widgets/ui_textbox";

import { Check, IconButton, IconCheck } from "../widgets/ui_widgets";
import * as util from "../path-controller/util/util.js";
import * as units from "../core/units.js";
import {
  FlagProperty,
  EnumProperty,
  ToolProperty,
  PropFlags,
  PropSubTypes,
  ToolPropertyTypes,
} from "../path-controller/toolsys";
import "../path-controller/util/html5_fileapi.js";
import { CSSFont } from "./cssfont.js";
import { theme, iconSheetFromPackFlag, UIBase, PackFlags, Icons } from "./ui_base.js";
import { EnumDef, IconMap, PropTypes } from "../path-controller/toolsys/toolprop.js";
import { createMenu, DropBox, Menu, MenuTemplate } from "../widgets/ui_menu.js";

import cconst from "../config/const.js";
import { IContextBase } from "./context_base.js";
import type { PanelFrame } from "../widgets/ui_panel.js";
import type { TabContainer } from "../widgets/ui_tabs.js";
import { InheritFlag, ToolDef, ToolOp } from "../path-controller/toolsys/toolsys";
import { NumSliderTypes } from "../pathux";

/* Style coercion: CSSStyleDeclaration doesn't allow arbitrary string indexing. */
function styl(el: { style: CSSStyleDeclaration }) {
  return el.style;
}

export type SliderArgs = {
  name?: string;
  defaultval?: number;
  min?: number; //
  max?: number;
  step?: number;
  callback?: Function;
  packflag?: number;
  do_redraw?: boolean;
  isInt?: boolean;
  /** @deprecated */
  is_int?: boolean;
  decimalPlaces?: number;
};

export class Label<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
  declare dom: HTMLDivElement;
  declare shadow: ShadowRoot;
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

    const style = document.createElement("style");
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
    const font = this._font;
    if (!font) return;

    this.dom.style["font"] = (font as CSSFont).genCSS();
    this.dom.style["color"] = (font as CSSFont).color;
  }

  updateDataPath() {
    if (this.ctx === undefined) {
      return;
    }

    const path = this.getAttribute("datapath")!;
    const prop = this.getPathMeta(this.ctx, path)!;
    let val: unknown = this.getPathValue(this.ctx, path);

    if (val === undefined) {
      return;
    }

    //console.log(path);
    if (prop.type & (PropTypes.INT | PropTypes.FLOAT)) {
      val = units.buildString(val as number, prop.baseUnit, prop.decimalPlaces, prop.displayUnit);
    }

    const valStr = "" + this._label + " " + val;

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

    styl(this.dom)["pointerEvents"] = styl(this)["pointerEvents"];

    if (this.hasAttribute("datapath")) {
      this.updateDataPath();
    }
  }
}

UIBase.internalRegister(Label);

export class Container<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
  declare shadow: ShadowRoot;
  declare _useDataPathUndo: boolean | undefined;
  declare div: HTMLElement;

  // these use accessors so child classes can override them with getters/setters
  accessor dataPrefix = "";
  accessor massSetPrefix = "";
  accessor inherit_packflag = 0;
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

    const style = (this.styletag = document.createElement("style"));
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
    this.__background = bg;

    this.styletag.textContent = `div.containerx {
        background-color : ${bg};
      }
    `;
    this.saneStyle["background-color"] = bg;
  }

  get childWidgets(): UIBase<CTX>[] {
    const list: UIBase<CTX>[] = [];

    this._forEachChildWidget((n: UIBase<CTX>) => {
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

    const rec = (n: UIBase<CTX>, con: Container<CTX>) => {
      if (n instanceof Container && n !== this) {
        if (n.dataPrefix.startsWith(prefix)) {
          n.dataPrefix = n.dataPrefix.slice(prefix.length, n.dataPrefix.length);
          n.dataPrefix = con._joinPrefix(n.dataPrefix)!;
          con = n;
        }
      }

      // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
      if (n instanceof UIBase && n.hasAttribute("datapath")) {
        let path = (n as unknown as Element).getAttribute("datapath")!;

        if (path.startsWith(prefix)) {
          path = path.slice(prefix.length, path.length);
          path = con._joinPrefix(path)!;
          n.setAttribute("datapath", path);

          //update helper tooltips
          n.description = n.description;
        }
      }

      n._forEachChildWidget((n2: UIBase<CTX>) => {
        rec(n2, con);
      });
    };

    rec(this, this);
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

    const x = (obj.scrollLeft as number) || 0;
    const y = (obj.scrollTop as number) || 0;

    this.doOnce(() => {
      this.scrollTo(x, y);
    }, 12);

    return this;
  }

  init() {
    this.saneStyle["display"] = "flex";
    this.saneStyle["flex-direction"] = this.reversed ? "column-reverse" : "column";
    this.saneStyle["flex-wrap"] = "nowrap";
    this.saneStyle["flex-grow"] = "" + this.getDefault("flex-grow", undefined, "1");

    this.setCSS();

    super.init();

    this.setAttribute("class", "containerx");
  }

  /** Returns previous icon flags */
  useIcons = (enabled_or_sheet: boolean | number = true) => {
    const enabled = !!enabled_or_sheet;

    let mask = PackFlags.USE_ICONS | PackFlags.SMALL_ICON | PackFlags.LARGE_ICON;
    mask = mask | PackFlags.CUSTOM_ICON_SHEET;
    mask = mask | (255 << PackFlags.CUSTOM_ICON_SHEET_START);

    const previous = this.packflag & mask;

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
  };

  /**
   *
   * @param mode: flexbox wrap mode, can be wrap, nowrap, or wrap-reverse
   * @returns {Container}
   */
  wrap(mode = "wrap"): this {
    this.saneStyle["flex-wrap"] = mode;
    return this;
  }

  noMarginsOrPadding(): this {
    super.noMarginsOrPadding();

    let keys = ["margin", "padding", "margin-block-start", "margin-block-end"];
    keys = keys.concat(["padding-block-start", "padding-block-end"]);

    for (const k of keys) {
      this.saneStyle[k] = "0px";
    }

    return this;
  }

  setCSS() {
    let rest = "";

    const add = (style: string) => {
      if (!this.hasDefault(style)) {
        return;
      }

      const val = this.getDefault(style);

      if (val !== undefined) {
        rest += `  ${style} = ${val};\n`;
        this.saneStyle[style] = "" + val;
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
    themeClass_or_obj: string | any = "strip",
    margin1: number = this.getDefault("oneAxisPadding") as number,
    margin2 = 1,
    horiz?: boolean | undefined
  ): Container<CTX> {
    let themeClass = themeClass_or_obj as string;

    if (typeof themeClass_or_obj === "object") {
      const obj = themeClass_or_obj;

      themeClass = (obj.themeClass as string) ?? "strip";
      margin1 = (obj.margin1 as number) ?? margin1;
      margin2 = (obj.margin2 as number) ?? 1;
      horiz = obj.horiz as boolean | undefined;
    }

    if (horiz === undefined) {
      horiz = this instanceof RowFrame;
      horiz = horiz || this.saneStyle["flex-direction"] === "row";
    }

    const flag = horiz ? PackFlags.STRIP_HORIZ : PackFlags.STRIP_VERT;

    const strip = horiz ? this.row() : this.col();

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
        const bradius = strip.getDefault("border-radius");
        const bline = strip.getDefault("border-width");
        const bstyle = strip.getDefault("border-style") || "solid";
        const padding = strip.getDefault("padding");
        const bcolor = strip.getDefault("border-color") || "rgba(0,0,0,0)";
        const margin = strip.getDefault("margin") || 0;

        const blineVal = bline === undefined ? 0 : bline;
        const bradiusVal = bradius === undefined ? 0 : bradius;
        const paddingVal = padding === undefined ? 5 : padding;

        const bg = strip.getDefault("background-color") as string;

        let key = "" + bradiusVal + ":" + blineVal + ":" + bg + ":" + paddingVal + ":";
        key += bstyle + ":" + paddingVal + ":" + bcolor + ":" + margin;

        if (key !== lastkey) {
          lastkey = key;

          strip.oneAxisPadding((margin1 as number) + (paddingVal as number), margin2 + (paddingVal as number));
          strip.setCSS();

          strip.background = bg;

          strip.style["margin"] = "" + margin + "px";
          strip.style["border"] = `${blineVal}px ${bstyle} ${bcolor}`;
          strip.style["borderRadius"] = "" + bradiusVal + "px";
        }
      });
    } else {
      console.warn((this as any).constructor.name + ".strip(): unknown theme class " + themeClass);
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
    this.saneStyle["margin-top"] = this.saneStyle["margin-bottom"] = "" + m + "px";
    this.saneStyle["margin-left"] = this.saneStyle["margin-right"] = "" + m2 + "px";

    return this;
  }

  /**
   * tries to set padding along one axis only in smart manner
   * */
  oneAxisPadding(axisPadding: number | string = this.getDefault("oneAxisPadding") as number, otherPadding = 0) {
    this.style["paddingTop"] = this.style["paddingBottom"] = "" + axisPadding + "px";
    this.style["paddingLeft"] = this.style["paddingRight"] = "" + otherPadding + "px";

    return this;
  }

  setMargin(m: number) {
    this.style["margin"] = m + "px";

    return this;
  }

  setPadding(m: number) {
    this.style["padding"] = m + "px";

    return this;
  }

  setSize(width: number | string | undefined, height: number | string | undefined) {
    if (width !== undefined) {
      if (typeof width == "number") this.style["width"] = this.div.style["width"] = ~~width + "px";
      else this.style["width"] = this.div.style["width"] = width;
    }

    if (height !== undefined) {
      if (typeof height == "number") this.style["height"] = this.div.style["height"] = ~~height + "px";
      else this.style["height"] = this.div.style["height"] = height;
    }

    return this;
  }

  save() {}

  load() {}

  saveVisibility() {
    localStorage[this.storagePrefix + "_settings"] = JSON.stringify(this);
    return this;
  }

  loadVisibility() {
    const key = this.storagePrefix + "_settings";
    let ok = true;

    if (key in localStorage) {
      console.log("loading UI visibility state. . .");

      try {
        this.loadJSON(JSON.parse(localStorage[key]));
      } catch (error) {
        util.print_stack(error as Error);
        ok = false;
      }
    }

    return ok;
  }

  toJSON() {
    const ret = {
      opened: !(this as any).closed,
    };

    return Object.assign(super.toJSON(), ret);
  }

  _ondestroy() {
    this._forEachChildWidget((n: UIBase) => {
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
    if (child instanceof UIBase) {
      child.ctx = this.ctx;
      child.parentWidget = this;
      this.shadow.appendChild(child);

      if (child.onadd) {
        (child.onadd as () => void)();
      }

      return child;
    }

    return super.appendChild(child);
  }

  clear(trigger_on_destroy = true) {
    for (const child of this.childWidgets) {
      if (child instanceof UIBase) {
        child.remove(trigger_on_destroy);
      }
    }
  }

  prepend(child: Node) {
    if (child instanceof UIBase) {
      this._prepend(child as UIBase<CTX>);
    } else {
      super.prepend(child);
    }
  }

  //*
  _prepend(child: UIBase<CTX>) {
    return this._add(child, true);
  } //*/

  add(child: UIBase<CTX>) {
    return this._add(child);
  }

  insert(i: number, ch: UIBase<CTX>) {
    ch.parentWidget = this;
    ch.ctx = this.ctx;

    if (i >= this.shadow.childNodes.length) {
      this.add(ch);
    } else {
      this.shadow.insertBefore(ch, util.list(this.childWidgets)[i]);
    }

    if (ch.onadd) {
      ch.onadd();
    }
  }

  _add(child: UIBase<CTX>, prepend = false) {
    //paranoia check for if we accidentally got a DOM NodeList
    if (child instanceof NodeList) {
      throw new Error("eek!");
    }

    child.ctx = this.ctx;
    child.parentWidget = this;
    child._useDataPathUndo = this._useDataPathUndo;

    if (!child._themeOverride && this._themeOverride) {
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

    if (child.onadd) (child.onadd as () => void)();

    return child;
  }

  //TODO: make sure this works on Electron?
  dynamicMenu(title: string, list: MenuTemplate, packflag = 0) {
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
  menu(title: string, list: MenuTemplate, packflag = 0) {
    const dbox = UIBase.createElement("dropbox-x") as DropBox<CTX>;

    dbox._name = title;
    dbox.setAttribute("simple", "true");
    dbox.setAttribute("name", title);

    if (list instanceof Menu) {
      dbox._build_menu = function (this: DropBox<CTX>) {
        if (this._menu?.parentNode !== undefined) {
          this._menu.remove();
        }

        this._menu = createMenu(this.ctx, title, list);
        return this._menu;
      };
    } else if (list) {
      dbox.template = list;
    }

    this._container_inherit(dbox, packflag);

    this._add(dbox);
    return dbox;
  }

  toolPanel(path_or_cls: string | typeof ToolOp, args: Record<string, unknown> = {}) {
    let tdef: ToolDef;
    let cls: any;

    if (typeof path_or_cls === "string") {
      cls = this.ctx.api.parseToolPath(path_or_cls);
    } else {
      cls = path_or_cls;
    }

    tdef = cls._getFinalToolDef();

    const packflag = (args.packflag as number) || 0;
    const label = (args.label as string) || (tdef.uiname as string);
    const createCb = (args.createCb || args.create_cb) as Function | undefined;
    const container = (args.container || this.panel(label)) as Container;
    let defaultsPath = (args.defaultsPath as string) || "toolDefaults";

    if (defaultsPath.length > 0 && !defaultsPath.endsWith(".")) {
      defaultsPath += ".";
    }

    const path = defaultsPath + tdef.toolpath;

    container.useIcons(false);

    const inputs = (tdef.inputs instanceof InheritFlag ? tdef.inputs.slots : tdef.inputs) ?? {};
    for (const k in inputs) {
      const prop = inputs[k];

      if ((prop.flag as number) & PropFlags.PRIVATE) {
        continue;
      }

      const apiname = (prop.apiname as string) || k;
      const path2 = path + "." + apiname;

      container.prop(path2);
    }

    container.tool(path_or_cls, packflag, createCb, label);

    return container;
  }

  tool(
    path_or_cls: string | typeof ToolOp,
    packflag_or_args: number | Record<string, unknown> = {},
    createCb?: Function,
    label?: string
  ) {
    let cls: typeof ToolOp | undefined;
    let packflag: number;

    if (typeof packflag_or_args === "object") {
      const args = packflag_or_args;

      packflag = args.packflag as number;
      createCb = args.createCb as Function | undefined;
      label = args.label as string | undefined;
    } else {
      packflag = (packflag_or_args as number) || 0;
    }

    if (typeof path_or_cls == "string") {
      if (path_or_cls.search(/\|/) >= 0) {
        const parts = path_or_cls.split("|");

        if (label === undefined && parts.length > 1) {
          label = parts[1].trim();
        }

        path_or_cls = parts[0].trim();
      }

      if (this.ctx === undefined) {
        console.warn("this.ctx was undefined in tool()");
        return;
      }

      cls = this.ctx.api.parseToolPath(path_or_cls);

      if (cls === undefined) {
        console.warn('Unknown tool for toolpath "' + path_or_cls + '"');
        return;
      }
    } else {
      cls = path_or_cls;
    }

    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;
    let hotkey: string | undefined;

    if (createCb === undefined) {
      createCb = (cls: unknown) => {
        return this.ctx.api.createTool(this.ctx, path_or_cls as string);
      };
    }

    const cb = () => {
      console.log("tool run");

      const toolob = createCb!(cls);
      this.ctx.api.execTool(this.ctx, toolob);
    };

    const def = typeof path_or_cls === "string" ? this.ctx.api.getToolDef(path_or_cls) : cls.tooldef();
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

      const hotkey = this.ctx.api.getToolPathHotkey(this.ctx, path);
      if (hotkey) {
        tooltip += "\n\tHotkey: " + hotkey;
      }
    }

    let ret: UIBase;

    if (def.icon !== undefined && packflag & PackFlags.USE_ICONS) {
      label = label === undefined ? tooltip : label;

      const check = this.iconbutton(def.icon as number, label, cb);

      check.iconsheet = iconSheetFromPackFlag(packflag);
      check.packflag |= packflag;
      check.description = tooltip;
      ret = check;
    } else {
      label = label === undefined ? (def.uiname as string) : label;

      ret = this.button(label, cb);
      ret.description = tooltip;
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

    const ret = UIBase.createElement("textbox-x") as unknown as TextBox<CTX>;

    if (path !== undefined) {
      ret.setAttribute("datapath", path);
    }

    ret.ctx = this.ctx;
    ret.parentWidget = this;
    ret._init();
    this._add(ret);

    ret.setCSS();
    ret.update();

    ret.packflag |= packflag;
    ret.onchange = cb as typeof ret.onchange;
    ret.text = "" + text;

    return ret as UIBase;
  }

  pathlabel(inpath?: string, label?: string, packflag = 0) {
    let path: string | undefined;

    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;

    if (inpath) {
      path = this._joinPrefix(inpath);
    }

    const ret = UIBase.createElement("label-x") as Label<CTX>;

    if (label === undefined && inpath) {
      const rdef = this.ctx.api.resolvePath(this.ctx, path!);
      if (rdef) {
        label = (rdef.prop!.uiname as string) ?? (rdef.dpath.apiname as string);
      } else {
        label = "(error)";
      }
    }

    ret.text = label!;
    ret.packflag = packflag;
    ret.setAttribute("datapath", path!);

    this._add(ret as UIBase<CTX>);
    ret.setCSS();

    return ret as UIBase<CTX>;
  }

  label(text: string) {
    const ret = UIBase.createElement("label-x") as Label<CTX>;
    ret.text = text;

    this._add(ret as UIBase<CTX>);

    return ret;
  }

  /**
   *
   * makes a button for a help picker tool
   * to view tooltips on mobile devices
   * */
  helppicker() {
    const ret = this.iconbutton(Icons.HELP, "Help Picker", () => {
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

    const ret = UIBase.createElement("iconbutton-x") as IconButton<CTX>;

    ret.packflag |= packflag;

    ret.setAttribute("icon", "" + icon);
    ret.description = description;
    ret.icon = icon;

    ret.iconsheet = iconSheetFromPackFlag(packflag);

    ret.onclick = cb as unknown as ((this: GlobalEventHandlers, ev: MouseEvent) => unknown) | null;

    this._add(ret);

    return ret;
  }

  button(label: string, cb?: () => void, thisvar?: unknown, id?: unknown, packflag = 0) {
    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;

    const ret = UIBase.createElement("button-x") as UIBase<CTX>;

    ret.packflag |= packflag;

    ret.setAttribute("name", label);
    ret.setAttribute("buttonid", "" + id); //XXX no longer used?
    ret.onclick = cb as unknown as ((this: GlobalEventHandlers, ev: MouseEvent) => unknown) | null;

    this._add(ret as UIBase<CTX>);

    return ret as UIBase<CTX>;
  }

  _joinPrefix(path?: string, prefix = this.dataPrefix.trim()): string | undefined {
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

    mass_set_path = inpath !== undefined ? this._getMassPath(this.ctx, inpath, mass_set_path) : "";

    const ret = UIBase.createElement("color-picker-button-x") as UIBase<CTX>;

    if (inpath !== undefined) {
      inpath = this._joinPrefix(inpath)!;
      ret.setAttribute("datapath", inpath);
    }

    if (mass_set_path !== undefined) {
      ret.setAttribute("mass_set_path", mass_set_path);
    }

    ret.packflag |= packflag;

    this._add(ret as UIBase<CTX>);
    return ret as UIBase<CTX>;
  }

  noteframe(packflag = 0) {
    const ret = UIBase.createElement("noteframe-x") as UIBase<CTX>;

    ret.packflag |= (this.inherit_packflag & ~PackFlags.NO_UPDATE) | packflag;

    this._add(ret as UIBase<CTX>);
    return ret as UIBase<CTX>;
  }

  curve1d(inpath?: string, packflag = 0, mass_set_path?: string) {
    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;

    mass_set_path = this._getMassPath(this.ctx, inpath, mass_set_path);

    const ret = UIBase.createElement("curve-widget-x") as UIBase<CTX>;

    ret.ctx = this.ctx;
    ret.packflag |= packflag;

    if (inpath) {
      inpath = this._joinPrefix(inpath)!;
      ret.setAttribute("datapath", inpath);
    }

    if (mass_set_path) ret.setAttribute("mass_set_path", mass_set_path);

    this.add(ret as UIBase<CTX>);

    return ret as UIBase<CTX>;
  }

  vecpopup(inpath?: string, packflag = 0, mass_set_path?: string) {
    const button = UIBase.createElement("vector-popup-button-x") as UIBase<CTX>;

    mass_set_path = this._getMassPath(this.ctx, inpath, mass_set_path);

    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;
    let name = "vector";

    if (inpath) {
      inpath = this._joinPrefix(inpath)!;

      button.setAttribute("datapath", inpath);
      if (mass_set_path) {
        button.setAttribute("mass_set_path", mass_set_path);
      }

      const rdef = this.ctx.api.resolvePath(this.ctx, inpath);
      if (rdef?.prop) {
        name = rdef.prop.uiname ?? rdef.prop.apiname ?? name;
      }
    }

    button.setAttribute("name", name);
    button.packflag |= packflag;

    this.add(button as UIBase<CTX>);
    return button as UIBase<CTX>;
  }

  _getMassPath(ctx: CTX, inpath?: string, mass_set_path?: string): string | undefined {
    if (inpath === undefined) {
      return undefined;
    }
    if (mass_set_path === undefined && this.massSetPrefix.length > 0) {
      mass_set_path = ctx.api.getPropName(ctx, inpath) as string;
    }

    if (mass_set_path === undefined) {
      return undefined;
    }

    return this._joinPrefix(mass_set_path, this.massSetPrefix);
  }

  prop(inpath: string, packflag = 0, mass_set_path?: string): UIBase<CTX> | undefined {
    if (!this.ctx) {
      console.warn(this.id + ".ctx was undefined");
      let p = this.parentWidget as UIBase<CTX> | undefined;

      while (p) {
        if (p.ctx) {
          console.warn("Fetched this.ctx from parent");
          this.ctx = p.ctx;
          break;
        }

        p = p.parentWidget as UIBase<CTX> | undefined;
      }

      if (!this.ctx) {
        throw new Error("ui.Container.prototype.prop(): this.ctx was undefined");
      }
    }

    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;

    const rdef = this.ctx.api.resolvePath(this.ctx, this._joinPrefix(inpath!)!, true);

    if (rdef?.prop === undefined) {
      console.warn(
        "Unknown property at path",
        this._joinPrefix(inpath),
        this.ctx.api.resolvePath(this.ctx, this._joinPrefix(inpath)!, true)
      );
      return;
    }
    //slider(path, name, defaultval, min, max, step, is_int, do_redraw, callback, packflag=0) {
    const prop = rdef.prop as ToolPropertyTypes;
    const useDataPathUndo = this.useDataPathUndo && !(prop.flag & PropFlags.NO_UNDO);

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

    if (prop.type === PropTypes.REPORT) {
      return this.pathlabel(inpath, prop.uiname as string);
    } else if (prop.type === PropTypes.STRING) {
      let ret: UIBase<CTX>;

      if (prop.flag & PropFlags.READ_ONLY) {
        ret = this.pathlabel(inpath, prop.uiname as string);
      } else if (prop.multiLine) {
        ret = this.textarea(inpath, rdef.value as string, packflag, mass_set_path);
        ret.useDataPathUndo = useDataPathUndo;
      } else {
        const strip = this.strip();

        strip.label(prop.uiname as string);

        ret = strip.textbox(inpath) as UIBase<CTX>;
        ret.useDataPathUndo = useDataPathUndo;

        if (mass_set_path) {
          ret.setAttribute("mass_set_path", mass_set_path);
        }
      }

      ret.packflag |= packflag;
      return ret;
    } else if (prop.type === PropTypes.CURVE) {
      const ret = this.curve1d(inpath, packflag, mass_set_path);
      ret.useDataPathUndo = useDataPathUndo;
      return ret;
    } else if (prop.type === PropTypes.INT || prop.type === PropTypes.FLOAT) {
      let ret: UIBase<CTX>;
      if (packflag & PackFlags.SIMPLE_NUMSLIDERS) {
        ret = this.simpleslider(inpath, { packflag: packflag });
      } else {
        ret = this.slider(inpath, { packflag: packflag });
      }

      ret.useDataPathUndo = useDataPathUndo;
      ret.packflag |= packflag;

      if (mass_set_path) {
        ret.setAttribute("mass_set_path", mass_set_path);
      }

      return ret;
    } else if (prop.type === PropTypes.BOOL) {
      const ret = this.check(inpath, prop.uiname as string, packflag, mass_set_path);
      ret.useDataPathUndo = useDataPathUndo;
      return ret;
    } else if (prop.type === PropTypes.ENUM) {
      if (rdef.subkey !== undefined) {
        const subkey = rdef.subkey as string;
        let name = prop.ui_value_names[rdef.subkey as string];

        if (name === undefined) {
          name = makeUIName(rdef.subkey);
        }

        const check = this.check(inpath, name, packflag, mass_set_path);
        const tooltip = prop.descriptions[subkey];

        check.useDataPathUndo = useDataPathUndo;

        check.description = tooltip === undefined ? prop.ui_value_names[subkey] : tooltip;
        if (check instanceof Check) {
          check.icon = prop.iconmap[rdef.subkey as string];
        }
        return check;
      }

      if (
        !(packflag & PackFlags.USE_ICONS) &&
        !((prop.flag as number) & (PropFlags.USE_ICONS | PropFlags.FORCE_ENUM_CHECKBOXES))
      ) {
        return this.listenum(inpath, { name: "listenum", packflag, mass_set_path }).setUndo(useDataPathUndo);
      } else {
        if ((prop.flag as number) & PropFlags.USE_ICONS) {
          packflag |= PackFlags.USE_ICONS;
        } else if ((prop.flag as number) & PropFlags.FORCE_ENUM_CHECKBOXES) {
          packflag &= ~PackFlags.USE_ICONS;
        }

        if (packflag & PackFlags.FORCE_PROP_LABELS) {
          const strip = this.strip();
          strip.label(prop.uiname as string);

          return strip.checkenum(inpath, undefined, packflag).setUndo(useDataPathUndo);
        } else {
          return this.checkenum(inpath, undefined, packflag).setUndo(useDataPathUndo);
        }
      }
    } else if (prop.type & (PropTypes.VEC2 | PropTypes.VEC3 | PropTypes.VEC4)) {
      if (rdef.subkey !== undefined) {
        let ret: UIBase<CTX>;

        if (packflag & PackFlags.SIMPLE_NUMSLIDERS) ret = this.simpleslider(inpath, { packflag: packflag });
        else ret = this.slider(inpath, { packflag: packflag });

        ret.packflag |= packflag;
        return ret.setUndo(useDataPathUndo);
      } else if ((prop.subtype as number) === PropSubTypes.COLOR) {
        return this.colorbutton(inpath, packflag, mass_set_path).setUndo(useDataPathUndo);
        //return this.colorPicker(inpath, packflag, mass_set_path);
      } else {
        const ret = UIBase.createElement("vector-panel-x") as UIBase<CTX> & { inherit_packflag: number };

        mass_set_path = this._getMassPath(this.ctx, inpath, mass_set_path);

        ret.packflag |= packflag | (this.inherit_packflag & ~PackFlags.NO_UPDATE);
        ret.inherit_packflag |= packflag | (this.inherit_packflag & ~PackFlags.NO_UPDATE);

        if (inpath) {
          ret.setAttribute("datapath", this._joinPrefix(inpath)!);
        }

        if (mass_set_path) {
          ret.setAttribute("mass_set_path", mass_set_path);
        }

        this.add(ret as UIBase<CTX>);

        return (ret as UIBase<CTX>).setUndo(useDataPathUndo);
      }
    } else if (prop.type === PropTypes.FLAG) {
      if (rdef.subkey !== undefined) {
        const tooltip = prop.descriptions[rdef.subkey as string];
        let name = prop.ui_value_names[rdef.subkey as string];

        if (typeof rdef.subkey === "number") {
          name = prop.keys[rdef.subkey] as string;
          if (name && name in prop.ui_value_names) {
            name = prop.ui_value_names[name];
          } else {
            name = makeUIName(name ? name : "(error)");
          }
        }

        if (name === undefined) {
          name = "(error)";
        }

        const ret = this.check(inpath, name, packflag, mass_set_path);
        ret.icon = prop.iconmap[rdef.subkey as string];

        if (tooltip) {
          ret.description = tooltip;
        }

        return ret.setUndo(useDataPathUndo);
      } else {
        let con: Container<CTX> = this;

        if (packflag & PackFlags.FORCE_PROP_LABELS) {
          con = this.strip();
          con.label(prop.uiname as string);
        }

        if (packflag & PackFlags.PUT_FLAG_CHECKS_IN_COLUMNS) {
          let i = 0;
          const row = con.row();
          const col1 = row.col();
          const col2 = row.col();

          for (const k in prop.values) {
            let name = prop.ui_value_names[k];
            const tooltip = prop.descriptions[k];

            if (name === undefined) {
              name = makeUIName(k);
            }

            const con2 = i & 1 ? col1 : col2;
            const check = con2.check(`${inpath}[${k}]`, name, packflag, mass_set_path);

            if (tooltip) {
              check.description = tooltip;
            }

            check.setUndo(useDataPathUndo);

            i++;
          }

          return row as unknown as UIBase<CTX>;
        }

        if (packflag & PackFlags.WRAP_CHECKBOXES) {
          let isrow = this.style["flexDirection"] === "row";
          isrow = isrow || this.style["flexDirection"] === "row-reverse";

          let wrapChars: number;

          let strip2: Container<CTX>;
          let con2: Container<CTX>;

          if (isrow) {
            wrapChars = this.getDefault("checkRowWrapLimit", undefined, 24) as number;
            strip2 = this.col().strip();
            strip2.packflag |= packflag;
            strip2.inherit_packflag |= packflag;

            con2 = strip2.row();
          } else {
            wrapChars = this.getDefault("checkColWrapLimit", undefined, 5) as number;
            strip2 = this.row().strip();
            strip2.packflag |= packflag;
            strip2.inherit_packflag |= packflag;

            con2 = strip2.col();
          }

          let x = 0;
          let y = 0;

          for (const k in prop.values) {
            let name = prop.ui_value_names[k];
            const tooltip = prop.descriptions[k];

            if (name === undefined) {
              name = makeUIName(k);
            }

            const check = con2.check(`${inpath}[${k}]`, name, packflag, mass_set_path);

            if (tooltip) {
              check.description = tooltip;
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

          return strip2 as unknown as UIBase<CTX>;
        }

        if (con === this) {
          con = this.strip();
        }

        const rebuild = () => {
          con.clear();

          for (const k in prop.values) {
            let name = prop.ui_value_names[k];
            const tooltip = prop.descriptions[k];

            if (name === undefined) {
              name = makeUIName(k);
            }

            const check = con.check(`${inpath}[${k}]`, name, packflag, mass_set_path);
            check.useDataPathUndo = useDataPathUndo;

            if (tooltip) {
              check.description = tooltip;
            }

            check.setUndo(useDataPathUndo);
          }
        };

        rebuild();
        let last_hash = (prop as unknown as { calcHash(): number }).calcHash();

        con.updateAfter(() => {
          const hash = (prop as unknown as { calcHash(): number }).calcHash();

          if (last_hash !== hash) {
            last_hash = hash;
            console.error("Property definition update");
            rebuild();
          }
        });

        return con as unknown as UIBase<CTX>;
      }
    }
  }

  iconcheck(inpath: string | undefined, icon: number, name: string, mass_set_path?: string) {
    const ret = UIBase.createElement("iconcheck-x") as IconCheck<CTX>;
    ret.icon = icon;
    ret.description = name;

    if (inpath) {
      ret.setAttribute("datapath", inpath);
    }

    if (mass_set_path) {
      ret.setAttribute("mass_set_path", mass_set_path);
    }

    this.add(ret);

    return ret;
  }

  check(inpath: string | undefined, name: string, packflag = 0, mass_set_path?: string) {
    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;

    const path = inpath !== undefined ? this._joinPrefix(inpath) : undefined;

    //let prop = this.ctx.getProp(path);
    let ret: Check<CTX> | IconCheck<CTX>;
    if (packflag & PackFlags.USE_ICONS) {
      ret = UIBase.createElement("iconcheck-x") as IconCheck<CTX>;
      ret.iconsheet = iconSheetFromPackFlag(packflag);
    } else {
      ret = UIBase.createElement("check-x") as Check<CTX>;
      ret.label = name;
    }

    mass_set_path = this._getMassPath(this.ctx, inpath, mass_set_path);

    ret.packflag |= packflag;
    ret.noMarginsOrPadding();

    if (inpath) {
      ret.setAttribute("datapath", path!);
    }

    if (mass_set_path) {
      ret.setAttribute("mass_set_path", mass_set_path);
    }

    this._add(ret);
    return ret;
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
  ): UIBase<CTX> {
    if (typeof name === "object" && name !== null) {
      const args = name;

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

    const path = this._joinPrefix(inpath);

    let prop: EnumProperty | FlagProperty | undefined;
    let frame: Container<CTX> | undefined;

    if (path !== undefined) {
      const resolved = this.ctx.api.resolvePath(this.ctx, path, true);
      prop = resolved !== undefined ? (resolved.prop as unknown as EnumProperty | FlagProperty) : undefined;
    }

    if (path !== undefined) {
      if (prop === undefined) {
        console.warn("Bad path in checkenum", path);
        return undefined as unknown as UIBase<CTX>;
      }

      frame = this.strip();
      frame.oneAxisPadding();

      if (packflag & PackFlags.USE_ICONS) {
        for (const key in prop.values) {
          const check = frame!.check(inpath + "[" + key + "]", "", packflag) as IconCheck<CTX>;

          check.packflag |= PackFlags.HIDE_CHECK_MARKS;

          check.icon = prop.iconmap[key];
          check.drawCheck = false;

          check.style["padding"] = "0px";
          check.style["margin"] = "0px";

          styl(check.dom)["padding"] = "0px";
          styl(check.dom)["margin"] = "0px";

          check.description = (prop.descriptions as any)[key];
          //console.log(check.description, key, prop.keys[key], prop.descriptions, prop.keys);
        }
      } else {
        if (name === undefined) {
          name = prop.uiname as string;
        }

        (frame!.label(name!) as unknown as Label).font = "TitleText";

        const checks: Record<string, IconCheck<CTX> | Check<CTX>> = {};

        let ignorecb = false;

        function makecb(key: string) {
          return () => {
            if (ignorecb) return;

            ignorecb = true;
            for (const k in checks) {
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

        for (const key in prop.values) {
          const check = frame!.check(`${inpath}[${key}]`, prop.ui_value_names[key]);
          checks[key] = check;

          if (mass_set_path) {
            check.setAttribute("mass_set_path", mass_set_path);
          }

          check.description = prop.descriptions[prop.keys[parseInt("" + key)]];
          if (!check.description) {
            check.description = "" + prop.ui_value_names[key];
          }
          check.onchange = makecb(key);
        }
      }
    }

    return frame!;
  }

  checkenum_panel(
    inpath: string,
    name?: string,
    packflag = 0,
    callback?: Function,
    mass_set_path?: string,
    prop?: FlagProperty | EnumProperty
  ): Container<CTX> | undefined {
    packflag = packflag === undefined ? 0 : packflag;
    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;

    const path = this._joinPrefix(inpath);
    let frame: Container<CTX> | undefined;

    if (path !== undefined && prop === undefined) {
      const resolved = this.ctx.api.resolvePath(this.ctx, path, true);
      prop = resolved !== undefined ? (resolved.prop as unknown as FlagProperty | EnumProperty) : undefined;
    }

    if (!name && prop) {
      name = prop.uiname as string;
    }

    if (path !== undefined) {
      if (prop === undefined) {
        console.warn("Bad path in checkenum", path);
        return undefined;
      }

      frame = this.panel(name!, name, packflag);
      frame.oneAxisPadding();
      frame.setCSSAfter(() => (frame!.background = this.getDefault("BoxSub2BG") as string));

      if (packflag & PackFlags.USE_ICONS) {
        for (const key in prop.values) {
          const check = frame.check(inpath + " == " + prop.values[key], "", packflag) as IconCheck<CTX>;

          check.icon = prop.iconmap[key];
          check.drawCheck = false;

          check.style["padding"] = "0px";
          check.style["margin"] = "0px";

          styl((check as unknown as { dom: HTMLElement }).dom)["padding"] = "0px";
          styl((check as unknown as { dom: HTMLElement }).dom)["margin"] = "0px";

          check.description = prop.descriptions[key];
          //console.log(check.description, key, prop.keys[key], prop.descriptions, prop.keys);
        }
      } else {
        if (name === undefined) {
          name = prop.uiname as string;
        }

        (frame.label(name!) as unknown as Label).font = "TitleText";

        const checks: Record<string, IconCheck<CTX> | Check<CTX>> = {};

        let ignorecb = false;

        function makecb(key: string) {
          return () => {
            if (ignorecb) return;

            ignorecb = true;
            for (const k in checks) {
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

        for (const key in prop.values) {
          const check = frame.check(inpath + " = " + prop.values[key], prop.ui_value_names[key]);
          checks[key] = check;

          if (mass_set_path) {
            check.setAttribute("mass_set_path", mass_set_path);
          }

          check.description = prop.descriptions[prop.keys[parseInt("" + key)]];
          if (!check.description) {
            check.description = "" + prop.ui_value_names[key];
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
    name?:
      | string
      | {
          name: string;
          enumDef?: EnumProperty | FlagProperty;
          defaultval?: string | number;
          callback?: Function;
          iconmap?: Record<string, number>;
          packflag?: number;
          mass_set_path?: string;
        },
    enumDef?: EnumProperty | FlagProperty | EnumDef,
    defaultval?: number | string,
    callback?: Function,
    iconmap?: IconMap,
    packflag = 0
  ): DropBox<CTX> {
    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;
    let mass_set_path: string | undefined;

    if (name && typeof name === "object") {
      const args = name;

      name = args.name;
      enumDef = args.enumDef;
      defaultval = args.defaultval;
      callback = args.callback;
      iconmap = args.iconmap;
      packflag = args.packflag ?? 0;
      mass_set_path = args.mass_set_path;
    }

    mass_set_path = this._getMassPath(this.ctx, inpath, mass_set_path);

    let path: string | undefined;
    let label = name as string | undefined;

    if (inpath !== undefined) {
      path = this._joinPrefix(inpath);
    }

    const ret = UIBase.createElement("dropbox-x") as DropBox<CTX>;

    if (enumDef !== undefined) {
      if (enumDef instanceof EnumProperty) {
        ret.prop = enumDef;
        label ||= (enumDef.uiname as string) || ToolProperty.makeUIName(enumDef.apiname as string);
      } else {
        ret.prop = new EnumProperty(defaultval, enumDef as EnumDef, path, name as string);
      }

      if (iconmap) {
        ret.prop.addIcons(iconmap);
      }
    } else {
      const res = this.ctx.api.resolvePath(this.ctx, path!, true);

      if (res !== undefined) {
        ret.prop = res.prop as unknown as EnumProperty;

        name ||= res.prop!.uiname as string;
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

    ret.onchange = callback as unknown as typeof ret.onchange;
    ret.onselect = callback as unknown as typeof ret.onselect;

    ret.packflag |= packflag;

    if (label && packflag & PackFlags.FORCE_PROP_LABELS) {
      const container = this.row();
      let l: UIBase<CTX>;

      if (packflag & PackFlags.LABEL_ON_RIGHT) {
        container._add(ret as UIBase<CTX>);
        l = container.label(label);

        if (!l.style["marginLeft"] || l.style["marginLeft"] === "unset") {
          l.style["marginLeft"] = "5px";
        }
      } else {
        l = container.label(label);
        container._add(ret);
      }
    } else {
      this._add(ret);
    }

    return ret;
  }

  getroot(): Container<CTX> {
    let p: Container<CTX> = this;

    while (p.parentWidget !== undefined) {
      p = p.parentWidget as Container<CTX>;
    }

    return p;
  }

  simpleslider(
    datapath: string | undefined,
    name?: string | SliderArgs,
    defaultval?: number,
    min?: number,
    max?: number,
    step?: number,
    isInt?: boolean,
    do_redraw?: boolean,
    callback?: Function,
    packflag = 0
  ) {
    if (typeof name === "object") {
      return this.slider(datapath, {
        ...name,
        packflag: (name.packflag ?? 0) | PackFlags.SIMPLE_NUMSLIDERS,
      });
      //new-style api call
    } else {
      return this.slider(
        datapath,
        name,
        defaultval,
        min,
        max,
        step,
        isInt,
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
    datapath: string | undefined,
    name?: string | SliderArgs,
    defaultval?: number,
    min?: number,
    max?: number,
    step?: number,
    is_int?: boolean,
    do_redraw?: boolean,
    callback?: Function,
    packflag = 0,
    decimalPlaces?: number
  ) {
    if (typeof name === "object") {
      //new-style api call

      const args = name;
      decimalPlaces = args.decimalPlaces;
      name = args.name;
      defaultval = args.defaultval;
      min = args.min;
      max = args.max;
      step = args.step;
      is_int = args.is_int || args.isInt;
      do_redraw = args.do_redraw;
      callback = args.callback;
      packflag = args.packflag ?? 0;
    }

    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;
    let ret: NumSliderTypes<CTX>;

    if (datapath) {
      datapath = this._joinPrefix(datapath)!;

      const rdef = this.ctx.api.resolvePath(this.ctx, datapath, true);
      if (rdef?.prop && rdef.prop.flag & PropFlags.SIMPLE_SLIDER) {
        packflag |= PackFlags.SIMPLE_NUMSLIDERS;
      }
      if (rdef?.prop && rdef.prop.flag & PropFlags.FORCE_ROLLER_SLIDER) {
        packflag |= PackFlags.FORCE_ROLLER_SLIDER;
      }
    }

    let simple: boolean | number = packflag & PackFlags.SIMPLE_NUMSLIDERS || cconst.simpleNumSliders;
    simple = simple && !(packflag & PackFlags.FORCE_ROLLER_SLIDER);

    const extraTextBox = cconst.useNumSliderTextboxes && !(packflag & PackFlags.NO_NUMSLIDER_TEXTBOX);

    if (extraTextBox) {
      if (simple) {
        ret = UIBase.createElement<NumSliderTypes<CTX>>("numslider-simple-x");
      } else {
        ret = UIBase.createElement<NumSliderTypes<CTX>>("numslider-textbox-x");
      }
    } else {
      if (simple) {
        ret = UIBase.createElement<NumSliderTypes<CTX>>("numslider-simple-x");
      } else {
        ret = UIBase.createElement<NumSliderTypes<CTX>>("numslider-x");
      }
    }

    ret.packflag |= packflag;

    if (datapath) {
      ret.setAttribute("datapath", datapath);
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

    if (decimalPlaces !== undefined) {
      ret.decimalPlaces = decimalPlaces;
    }

    if (step) {
      ret.setAttribute("step", "" + step);
    }
    if (callback) {
      ret.onchange = callback as typeof ret.onchange;
    }

    this._add(ret);

    if (this.ctx) {
      ret.setCSS();
      ret.update();
    }

    if (do_redraw) {
      ret._redraw();
    }

    return ret;
  }

  _container_inherit(elem: UIBase<CTX>, packflag = 0) {
    //don't inherit NO_UPDATE

    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;

    elem.packflag |= packflag;
    (elem as unknown as Container).inherit_packflag |= packflag;
    (elem as unknown as Container).dataPrefix = this.dataPrefix;
    (elem as unknown as Container).massSetPrefix = this.massSetPrefix;
  }

  treeview() {
    //XXX property type me
    const ret = UIBase.createElement("tree-view-x") as UIBase<CTX>;
    ret.ctx = this.ctx;
    this.add(ret);

    this._container_inherit(ret);

    return ret;
  }

  panel(name: string, id?: string, packflag = 0, tooltip?: string) {
    id = id === undefined ? name : id;

    // XXX todo: add <CTX> after panelFrame is moved to TS
    const ret = UIBase.createElement("panelframe-x") as PanelFrame<CTX>;

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

      ret.contents.ctx = ret.ctx;
    }

    ret.contents.dataPrefix = this.dataPrefix;
    ret.contents.massSetPrefix = this.massSetPrefix;

    return ret;
  }

  row(packflag = 0): RowFrame<CTX> {
    const ret = UIBase.createElement("rowframe-x") as unknown as RowFrame<CTX>;

    this._container_inherit(ret, packflag);
    this._add(ret);

    ret.ctx = this.ctx;

    return ret;
  }

  listbox(packflag = 0) {
    const ret = UIBase.createElement("listbox-x") as UIBase<CTX>;

    this._container_inherit(ret, packflag);

    this._add(ret);
    return ret;
  }

  table(packflag = 0): TableFrame {
    const ret = UIBase.createElement("tableframe-x") as unknown as TableFrame;

    this._container_inherit(ret as unknown as UIBase<CTX>, packflag);

    this._add(ret as unknown as UIBase<CTX>);
    return ret;
  }

  twocol(parentDepth = 1, packflag = 0) {
    const ret = UIBase.createElement("two-column-x") as unknown as TwoColumnFrame<CTX>;

    ret.parentDepth = parentDepth;

    this._container_inherit(ret, packflag);

    this._add(ret);
    return ret;
  }

  col(packflag = 0): ColumnFrame<CTX> {
    const ret = UIBase.createElement("colframe-x") as unknown as ColumnFrame<CTX>;

    this._container_inherit(ret as unknown as UIBase<CTX>, packflag);

    this._add(ret as unknown as UIBase<CTX>);
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
      const args = packflag_or_args;

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

    const ret = UIBase.createElement("colorpicker-x") as UIBase<CTX> & Record<string, unknown>;

    if (themeOverride) {
      ret.overrideClass(themeOverride);
    }

    packflag |= PackFlags.SIMPLE_NUMSLIDERS;

    this._container_inherit(ret as UIBase<CTX>, packflag);

    ret.ctx = this.ctx;
    ret.parentWidget = this;
    ret._init();
    ret.packflag |= packflag;
    (ret as unknown as Container).inherit_packflag |= packflag;
    (ret.constructor as unknown as { setDefault(el: UIBase<CTX>): void }).setDefault(ret as UIBase<CTX>);

    if (path !== undefined) {
      ret.setAttribute("datapath", path);
    }

    console.warn("mass_set_path", mass_set_path);
    if (mass_set_path) {
      ret.setAttribute("mass_set_path", mass_set_path);
    }

    //XXX
    window.colorpicker = ret;

    this._add(ret as UIBase<CTX>);
    return ret as UIBase<CTX>;
  }

  textarea(datapath?: string, value = "", packflag = 0, mass_set_path?: string) {
    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;

    mass_set_path = this._getMassPath(this.ctx, datapath, mass_set_path);

    const ret = UIBase.createElement("rich-text-editor-x") as UIBase<CTX> & Record<string, unknown>;
    ret.ctx = this.ctx;

    ret.packflag |= packflag;

    if (value !== undefined) {
      ret.value = value;
    }

    if (datapath) ret.setAttribute("datapath", datapath);
    if (mass_set_path) ret.setAttribute("mass_set_path", mass_set_path);

    this.add(ret as UIBase<CTX>);
    return ret as UIBase<CTX>;
  }

  /**
   * html5 viewer
   * */
  viewer(datapath?: string, value = "", packflag = 0, mass_set_path?: string) {
    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;

    mass_set_path = this._getMassPath(this.ctx, datapath, mass_set_path);

    const ret = UIBase.createElement("html-viewer-x") as UIBase<CTX> & Record<string, unknown>;
    ret.ctx = this.ctx;

    ret.packflag |= packflag;

    if (value !== undefined) {
      ret.value = value;
    }

    if (datapath) ret.setAttribute("datapath", datapath);
    if (mass_set_path) ret.setAttribute("mass_set_path", mass_set_path);

    this.add(ret as UIBase<CTX>);
    return ret as UIBase<CTX>;
  }

  //
  tabs(position: "top" | "bottom" | "left" | "right" = "top", packflag = 0) {
    const ret = UIBase.createElement("tabcontainer-x") as UIBase<CTX>;

    (ret.constructor as unknown as { setDefault(el: UIBase<CTX>): void }).setDefault(ret as UIBase<CTX>);
    ret.setAttribute("bar_pos", position);

    this._container_inherit(ret, packflag);

    this._add(ret);
    return ret as unknown as TabContainer<CTX>;
  }

  asDialogFooter() {
    this.style["marginTop"] = "15px";
    this.style["justifyContent"] = "flex-end";

    return this;
  }
}

UIBase.internalRegister(Container);

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

    this.style["display"] = "flex";
    this.style["flexDirection"] = this.reversed ? "row-reverse" : "row";
  }

  init() {
    super.init();

    this.style["display"] = "flex";
    this.style["flexDirection"] = this.reversed ? "row-reverse" : "row";

    if (!this.style["alignItems"] || this.style["alignItems"] == "") {
      this.style["alignItems"] = "center";
    }

    if (this.getDefault("slider-style") === "simple") {
      this.packflag |= PackFlags.SIMPLE_NUMSLIDERS;
      this.inherit_packflag |= PackFlags.SIMPLE_NUMSLIDERS;
    }
  }

  oneAxisMargin(m: number | string = this.getDefault("oneAxisMargin") as number, m2 = 0) {
    this.style["marginLeft"] = this.style["marginRight"] = m + "px";
    this.style["marginTop"] = this.style["marginBottom"] = "" + m2 + "px";

    return this;
  }

  oneAxisPadding(m: number | string = this.getDefault("oneAxisPadding") as number, m2 = 0) {
    this.style["paddingLeft"] = this.style["paddingRight"] = "" + m + "px";
    this.style["paddingTop"] = this.style["paddingBottom"] = "" + m2 + "px";

    return this;
  }

  update() {
    super.update();
  }
}

UIBase.internalRegister(RowFrame);

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

    this.style["display"] = "flex";
    this.style["flexDirection"] = "column";
    this.style["justifyContent"] = "right";
  }

  update() {
    super.update();
  }

  oneAxisMargin(m: number | string = this.getDefault("oneAxisMargin") as number, m2 = 0) {
    this.style["marginTop"] = this.style["marginBottom"] = "" + m + "px";
    this.style["marginLeft"] = this.style["marginRight"] = m2 + "px";

    return this;
  }

  oneAxisPadding(m: number | string = this.getDefault("oneAxisPadding") as number, m2 = 0) {
    this.style["paddingTop"] = this.style["paddingBottom"] = "" + m + "px";
    this.style["paddingLeft"] = this.style["paddingRight"] = "" + m2 + "px";

    return this;
  }
}

UIBase.internalRegister(ColumnFrame);

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

    this.style["display"] = "flex";
    this.style["flexDirection"] = "column";
  }

  update() {
    super.update();

    let p: UIBase<CTX> | undefined = this as unknown as UIBase<CTX>;

    for (let i = 0; i < this.parentDepth; i++) {
      p = p.parentWidget ? (p.parentWidget as UIBase<CTX>) : p;
    }

    if (!p) {
      return;
    }

    const r = p.getBoundingClientRect();

    if (!r) {
      return;
    }

    const style = r.width > this.colWidth * 2.0 ? "row" : "column";

    if (this.style["flexDirection"] !== style) {
      this.style["flexDirection"] = style;
    }
  }
}

UIBase.internalRegister(TwoColumnFrame);

function parsepx(css: string): number {
  return parseFloat(css);
}
