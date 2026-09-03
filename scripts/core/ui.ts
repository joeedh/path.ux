//bind module to global var to get at it in console.
//
//note that require has an api for handling circular
//module refs, in such cases do not use these vars.

import * as util from "../path-controller/util/util";
import * as units from "../core/units";
import { FlagProperty, EnumProperty } from "../path-controller/toolsys";
import "../path-controller/util/html5_fileapi";
import { CSSFont } from "./cssfont";
import { theme, UIBase, PackFlags } from "./ui_base";
import type { UIBaseDefinition } from "./ui_base";
import { t } from "./theme_schema";
import type { PathsUnderPrefix } from "./datapath_registry";
import { EnumDef, IconMap, PropTypes } from "../path-controller/toolsys/toolprop";
import type { DropBox } from "../menu/dropbox";
import type { MenuTemplate } from "../menu/menu_types";
import { IsRowFrameTag } from "./ui_consts";
import { elementIsRow } from "./base/ui_base_dom";
import { IContextBase } from "./context_base";
import type { TreeView } from "../widgets/ui_treeview";
import { ToolOp } from "../path-controller/toolsys/toolsys";
import type { TextArea } from "../widgets/ui_textarea";
import type { RichEditor } from "../widgets/ui_richedit";

// Type-only: a value import of ui_containers would evaluate `class RowFrame extends
// Container` while Container is still in its temporal dead zone. ui_containers imports
// this module; this module must never import it at runtime, not even for side effects.
import type { RowFrame, ColumnFrame } from "./ui_containers";
import type { TableFrame } from "../widgets/ui_table";
import { ToolOpAny } from "../path-controller/controller/controller_abstract";
import type { PathWatchInfo } from "../path-controller/controller/pathwatch";
import { dynamicMenuImpl, menuImpl, toolPanelImpl, toolImpl } from "./utils/container_menu";
import {
  textboxImpl,
  pathlabelImpl,
  labelImpl,
  helppickerImpl,
  iconbuttonImpl,
  buttonImpl,
  colorbuttonImpl,
  noteframeImpl,
  curve1dImpl,
  vecpopupImpl,
  colorPickerImpl,
  textareaImpl,
  viewerImpl,
} from "./utils/container_widgets";
import {
  iconcheckImpl,
  checkImpl,
  checkenumImpl,
  checkenumPanelImpl,
  listenumImpl,
} from "./utils/container_enum";
import { propImpl, simplesliderImpl, sliderImpl } from "./utils/container_prop";
import {
  treeviewImpl,
  panelImpl,
  rowImpl,
  listboxImpl,
  tableImpl,
  twocolImpl,
  colImpl,
  tabsImpl,
} from "./utils/container_layout";

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

export class Label<CTX extends IContextBase = IContextBase> extends UIBase<CTX, unknown, "Label"> {
  declare dom: HTMLDivElement;
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
    } else {
      /* the rendered text is "<label> <path value>" — re-render with the
       * current path value */
      this._lastText = "";
      this.refreshPathWatches();
    }
  }

  static define(): UIBaseDefinition {
    return {
      tagname: "label-x",
      style  : "label",
      theme: {
        LabelText  : t.font,
        DefaultText: t.font,
      },
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

  updateFromPath(value: unknown, info: PathWatchInfo) {
    if (this.ctx === undefined || value === undefined) {
      return;
    }

    const prop = info.prop ?? this.getPathMeta(this.ctx, info.path);
    let val: unknown = value;

    if (prop && prop.type & (PropTypes.INT | PropTypes.FLOAT)) {
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

    /* Label.update does not chain to super.update, so drive the
     * datapath watch lifecycle directly */
    this._updatePathWatchers();
  }
}

UIBase.internalRegister(Label);

/**
 * A container whose theme class and data-path prefix are both unconstrained.
 * Use it for plumbing that passes containers around without caring about
 * either — a `Container<CTX>` parameter would reject anything carrying a
 * prefix, since {@link Container.__dataPathPrefix} makes the prefix part of
 * the type.
 */
export type AnyContainer<CTX extends IContextBase = IContextBase> = Container<CTX, string, string>;

export class Container<
  CTX extends IContextBase = IContextBase,
  SELF extends string = "Container",
  /**
   * Do not pass Container<CTX, SELF, DataPrefix> around, always
   * get a container with a prefix with container.withDataPrefix()
   */
  DataPrefix extends string = "",
> extends UIBase<CTX, unknown, SELF> {
  /**
   * Phantom tag holding the data-path prefix as a literal type. It is never
   * assigned — `declare` erases it — and exists so the `pathux/valid-datapath`
   * ESLint rule can read the prefix off the receiver of `prop(...)` and friends
   * and check prefix + path against the generated catalog. Two containers with
   * different prefixes are not assignable to each other, which is what keeps a
   * prefixed container from being passed somewhere that expects a bare one.
   */
  declare readonly __dataPathPrefix: DataPrefix;

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

  /**
   * Declares the prefix this container was handed, so `prop(...)` autocompletes
   * the paths under it and the ESLint rule can check them. Does not set the
   * prefix — whoever built the container already did that, through
   * `dataPrefix` / `pushDataPrefix` / `_container_inherit`. Passing the wrong
   * literal here just moves the lint errors somewhere else.
   */
  withDataPrefix<T extends string>(): Container<CTX, SELF, T> {
    return this as unknown as Container<CTX, SELF, T>;
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

    const rec = (n: UIBase<CTX>, con: AnyContainer<CTX>) => {
      if (n instanceof Container && n !== this) {
        if (n.dataPrefix.startsWith(prefix)) {
          n.dataPrefix = n.dataPrefix.slice(prefix.length, n.dataPrefix.length);
          n.dataPrefix = con._joinPrefix(n.dataPrefix)!;
          con = n;
        }
      }

      if (n instanceof UIBase && n.hasAttribute("datapath")) {
        let path = n.getAttribute("datapath")!;

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

    const x = (obj.scrollLeft as number | undefined) ?? 0;
    const y = (obj.scrollTop as number | undefined) ?? 0;

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

    if (enabled_or_sheet === true) {
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
      horiz = IsRowFrameTag in this;
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
        const bradius = strip.getDefault<number>("border-radius");
        const bline = strip.getDefault<number>("border-width");
        const bstyle = strip.getDefault("border-style") || "solid";
        const padding = strip.getDefault<number>("padding");
        const bcolor = strip.getDefault("border-color") || "rgba(0,0,0,0)";
        const margin = strip.getDefault<number>("margin") || 0;

        const blineVal = bline === undefined ? 0 : bline;
        const bradiusVal = bradius === undefined ? 0 : bradius;
        const paddingVal = padding === undefined ? 5 : padding;

        const bg = strip.getDefault<string>("background-color");

        let key = "" + bradiusVal + ":" + blineVal + ":" + bg + ":" + paddingVal + ":";
        key += bstyle + ":" + paddingVal + ":" + bcolor + ":" + margin;

        if (key !== lastkey) {
          lastkey = key;

          strip.oneAxisPadding(margin1 + paddingVal, margin2 + paddingVal);
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
  oneAxisPadding(
    axisPadding: number | string = this.getDefault("oneAxisPadding") as number,
    otherPadding = 0
  ) {
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
      if (typeof height == "number")
        this.style["height"] = this.div.style["height"] = ~~height + "px";
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
    // XXX test what this does!
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
      if (child.ctx === undefined) {
        child.ctx = this.ctx;
      }
      child.parentWidget = this;
      this.shadow.appendChild(child);

      if (child.onadd) {
        child.onadd();
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
      this._prepend(child);
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
    if (ch.ctx === undefined) {
      ch.ctx = this.ctx;
    }

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

    if (child.ctx === undefined) {
      child.ctx = this.ctx;
    }
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

    if (child.onadd) {
      child.onadd();
    }

    return child;
  }

  //TODO: make sure this works on Electron?
  dynamicMenu(title: string, list: MenuTemplate, packflag = 0) {
    return dynamicMenuImpl(this, title, list, packflag);
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
    return menuImpl(this, title, list, packflag);
  }

  toolPanel(
    path_or_cls: string | typeof ToolOp,
    args: {
      label?: string;
      packflag?: number;
      createCb?: (cls: typeof ToolOp) => ToolOpAny;
      /** @deprecated */
      create_cb?: (cls: typeof ToolOp) => ToolOpAny;
      container?: Container<CTX>;
      defaultsPath?: string;
    } = {}
  ) {
    return toolPanelImpl(this, path_or_cls, args);
  }

  tool(
    path_or_cls: string | typeof ToolOp,
    packflag_or_args:
      | number
      | { packflag?: number; createCb?: (cls: typeof ToolOp) => ToolOpAny; label?: string } = 0,
    createCb?: Function,
    label?: string
  ) {
    return toolImpl(this, path_or_cls, packflag_or_args, createCb, label);
  }

  //supports number types
  textbox(
    inpath?: PathsUnderPrefix<DataPrefix>,
    text?: string,
    cb?: typeof this.on_change,
    packflag = 0
  ) {
    return this.addPropLabel(textboxImpl(this, inpath, text, cb, packflag), undefined, packflag)
      .widget;
  }

  pathlabel(inpath?: PathsUnderPrefix<DataPrefix>, label?: string, packflag = 0) {
    return this.addPropLabel(pathlabelImpl(this, inpath, label, packflag), undefined, packflag)
      .widget;
  }

  label(text: string) {
    return labelImpl(this, text);
  }

  /**
   * Makes a button that starts the help picker: point at anything to read what it does, which is
   * the only way to reach a tooltip on a device that cannot hover. Tap empty space to leave.
   */
  helppicker() {
    return helppickerImpl(this);
  }

  iconbutton(icon: number, description: string, cb?: () => void, thisvar?: unknown, packflag = 0) {
    return iconbuttonImpl(this, icon, description, cb, thisvar, packflag);
  }

  button(
    label: string,
    cb?: (e?: PointerEvent) => void,
    thisvar?: unknown,
    id?: string | number,
    packflag = 0
  ) {
    return buttonImpl(this, label, cb, thisvar, id, packflag);
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

  colorbutton(inpath: string | undefined, packflag?: number, mass_set_path?: string) {
    return this.addPropLabel(
      colorbuttonImpl(this, inpath, packflag, mass_set_path),
      undefined,
      packflag
    ).widget;
  }

  noteframe(packflag = 0) {
    return noteframeImpl(this, packflag);
  }

  curve1d(inpath?: string, packflag = 0, mass_set_path?: string) {
    return this.addPropLabel(
      curve1dImpl(this, inpath, packflag, mass_set_path),
      undefined,
      packflag
    ).widget;
  }

  vecpopup(inpath?: string, packflag = 0, mass_set_path?: string) {
    return vecpopupImpl(this, inpath, packflag, mass_set_path);
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

  prop(inpath: PathsUnderPrefix<DataPrefix>, packflag = 0, mass_set_path?: string): UIBase<CTX> {
    return propImpl(this, inpath, packflag, mass_set_path);
  }

  iconcheck(
    inpath: string | undefined,
    icon: number,
    description?: string,
    mass_set_path?: string
  ) {
    return this.addPropLabel(iconcheckImpl(this, inpath, icon, description, mass_set_path)).widget;
  }

  check(
    inpath: PathsUnderPrefix<DataPrefix> | undefined,
    name?: string,
    packflag = 0,
    mass_set_path?: string
  ) {
    return checkImpl(this, inpath, name, packflag, mass_set_path);
  }

  /*
   *
   * new (optional) form: checkenum(inpath, args)
   * */
  checkenum(
    inpath: PathsUnderPrefix<DataPrefix> | undefined,
    name?: string | Parameters<typeof checkenumImpl>[2],
    packflag?: number,
    enummap?: unknown,
    defaultval?: unknown,
    callback?: Function,
    iconmap?: unknown,
    mass_set_path?: string
  ): UIBase<CTX> {
    const label = typeof name === "object" ? name.name : name;
    packflag = typeof name === "object" ? name.packflag ?? 0 : packflag;

    return this.addPropLabel(
      checkenumImpl(
        this,
        inpath,
        name,
        packflag,
        enummap,
        defaultval,
        callback,
        iconmap,
        mass_set_path
      ),
      label,
      packflag
    ).widget;
  }

  checkenum_panel(
    inpath: string,
    name?: string,
    packflag = 0,
    callback?: Function,
    mass_set_path?: string,
    prop?: FlagProperty | EnumProperty
  ): Container<CTX> | undefined {
    const widget = checkenumPanelImpl(this, inpath, name, packflag, callback, mass_set_path, prop);
    return widget ? this.addPropLabel(widget, name, packflag).widget : widget;
  }

  /**
    Creates a dropbox menu widget for selecting enum items
    
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
    inpath: PathsUnderPrefix<DataPrefix> | undefined,
    name?:
      | string
      | {
          name?: string;
          enumDef?:
            | EnumProperty
            | FlagProperty
            | EnumDef
            | (() => EnumProperty | EnumDef | Promise<EnumProperty | EnumDef>);
          defaultval?: string | number;
          callback?: DropBox["on_select"];
          iconmap?: Record<string, number>;
          packflag?: number;
          mass_set_path?: string;
        },
    enumDef?:
      | EnumProperty
      | FlagProperty
      | EnumDef
      | (() => EnumProperty | EnumDef | Promise<EnumProperty | EnumDef>),
    defaultval?: number | string,
    callback?: DropBox["on_select"],
    iconmap?: IconMap,
    packflag = 0
  ): DropBox<CTX> {
    const label = typeof name === "string" ? name : name?.name;
    packflag = typeof name === "object" ? name.packflag ?? 0 : packflag;
    return this.addPropLabel(
      listenumImpl(this, inpath, name, enumDef, defaultval, callback, iconmap, packflag),
      label,
      packflag
    ).widget;
  }

  /**
   * To force a widget to never ever have a label
   * add | PackFlags.NO_PROP_LABELS to its packflag
   * (or pass that in here)
   */
  addPropLabel<T extends UIBase<CTX>>(
    widget: T,
    label?: string,
    packflag: number = widget.packflag
  ): { container: AnyContainer<CTX>; widget: T } {
    packflag |= this.inherit_packflag;
    if (typeof packflag !== "number" || isNaN(packflag) || !isFinite(packflag)) {
      throw new Error("invalid pack flag");
    }

    if (!(packflag & PackFlags.FORCE_PROP_LABELS) || packflag & PackFlags.NO_PROP_LABELS) {
      this._add(widget);
      return { widget, container: this };
    }

    if (!label && widget.getAttribute("datapath")) {
      const prop = this.getPathMeta(this.ctx, widget.getAttribute("datapath")!);
      if (prop) {
        label = prop.getUIName();
      }
    }

    // Nothing to label it with, so it is packed bare. Without the add it would be dropped, which
    // is a widget that silently never appears rather than one that appears unlabelled.
    if (!label) {
      this._add(widget);
      return { widget, container: this };
    }

    const strip = UIBase.createElement("widget-with-label-x") as WidgetWithLabel<CTX>;
    strip.ctx = this.ctx;
    this._container_inherit(strip);
    strip.widget = widget;
    strip.labelElem = UIBase.createElement("label-x") as Label<CTX>;
    strip._add(strip.labelElem);
    strip._add(widget);
    this._add(strip);
    strip._init();

    strip.labelElem._init();
    strip.labelElem.text = label;
    strip.labelElem.setCSS();
    strip.setCSS();

    return { widget, container: strip };
  }

  getroot(): AnyContainer<CTX> {
    let p: AnyContainer<CTX> = this;

    while (p.parentWidget !== undefined) {
      p = p.parentWidget as AnyContainer<CTX>;
    }

    return p;
  }

  simpleslider(
    datapath: PathsUnderPrefix<DataPrefix> | undefined,
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
    const label = typeof name === "string" ? name : name?.name;
    packflag = typeof name === "object" ? name.packflag ?? 0 : packflag;
    return this.addPropLabel(
      simplesliderImpl(
        this,
        datapath,
        name,
        defaultval,
        min,
        max,
        step,
        isInt,
        do_redraw,
        callback,
        packflag
      ),
      label,
      packflag
    ).widget;
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
    datapath: PathsUnderPrefix<DataPrefix> | undefined,
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
    const label = typeof name === "string" ? name : name?.name;
    packflag = typeof name === "object" ? name.packflag ?? 0 : packflag;

    return this.addPropLabel(
      sliderImpl(
        this,
        datapath,
        name,
        defaultval,
        min,
        max,
        step,
        is_int,
        do_redraw,
        callback,
        packflag,
        decimalPlaces
      ),
      label,
      packflag
    ).widget;
  }

  _container_inherit(
    elem: UIBase<CTX, any> & {
      inherit_packflag?: number;
      dataPrefix?: string;
      massSetPrefix?: string;
    },
    packflag = 0
  ) {
    //don't inherit NO_UPDATE

    packflag |= this.inherit_packflag & ~PackFlags.NO_UPDATE;
    elem.packflag |= packflag;

    if (elem.inherit_packflag !== undefined) {
      elem.inherit_packflag |= packflag;
    }
    elem.dataPrefix = this.dataPrefix;
    elem.massSetPrefix = this.massSetPrefix;
  }

  treeview(): TreeView<CTX> {
    return treeviewImpl(this);
  }

  panel(name: string, id?: string, packflag = 0, tooltip?: string) {
    return panelImpl(this, name, id, packflag, tooltip);
  }

  row(packflag = 0): RowFrame<CTX> {
    return rowImpl(this, packflag);
  }

  listbox<IDType extends string | number = string | number>(path?: string, packflag = 0) {
    return listboxImpl<CTX, SELF, IDType>(this, path, packflag);
  }

  table(packflag = 0): TableFrame<CTX> {
    return tableImpl(this, packflag);
  }

  twocol(parentDepth = 1, packflag = 0) {
    return twocolImpl(this, parentDepth, packflag);
  }

  col(packflag = 0): ColumnFrame<CTX> {
    return colImpl(this, packflag);
  }

  colorPicker(
    inpath?: string,
    packflag_or_args:
      | number
      | { packflag?: number; massSetPath?: string; themeOverride?: string } = 0,
    mass_set_path?: string,
    themeOverride?: string
  ) {
    const packflag =
      typeof packflag_or_args === "object" ? packflag_or_args.packflag : packflag_or_args;
    return this.addPropLabel(
      colorPickerImpl(this, inpath, packflag_or_args, mass_set_path, themeOverride),
      undefined,
      packflag
    ).widget;
  }

  textarea(
    datapath?: string,
    value?:
      | string
      | {
          value?: string;
          massSetPath?: string;
          isRichEdit?: boolean;
          label?: string;
        },
    /** @deprecated */
    packflag = 0,
    /** @deprecated */
    mass_set_path?: string,
    /** @deprecated */
    isRichEdit?: boolean,
    /** @deprecated */
    label?: string
  ): TextArea<CTX> | RichEditor<CTX> {
    if (typeof value === "object") {
      mass_set_path ??= value.massSetPath;
      isRichEdit ??= value.isRichEdit;
      label ??= value.label;
      value = value.value;
    }
    return this.addPropLabel(
      textareaImpl(this, datapath, value, packflag, mass_set_path, isRichEdit),
      label,
      packflag
    ).widget;
  }

  /**
   * html5 viewer
   * */
  viewer(datapath?: string, value = "", packflag = 0, mass_set_path?: string) {
    return viewerImpl(this, datapath, value, packflag, mass_set_path);
  }

  //
  tabs(position: "top" | "bottom" | "left" | "right" = "top", packflag = 0) {
    return tabsImpl(this, position, packflag);
  }

  asDialogFooter() {
    this.style["marginTop"] = "15px";
    this.style["justifyContent"] = "flex-end";

    return this;
  }
}

UIBase.internalRegister(Container);

export class WidgetWithLabel<CTX extends IContextBase> extends Container<CTX> {
  declare labelElem: Label<CTX>;
  declare widget: UIBase<CTX>;
  private lastPackFlag = 0;
  private lastToolTip: string | undefined;

  constructor() {
    super();
  }

  update() {
    super.update();
    if (this.widget.packflag !== this.lastPackFlag) {
      this.setCSS();
    }
    if (this.widget.description !== this.lastToolTip) {
      this.description = this.widget.description;
      this.lastToolTip = this.widget.description;
    }
  }

  setCSS() {
    super.setCSS();
    this.lastPackFlag = this.widget.packflag;
    this.widget.packflag = this.lastPackFlag;
    this.style.display = "flex";

    const f = this.lastPackFlag;

    if (!(f & PackFlags.FORCE_PROP_LABELS) || f & PackFlags.NO_PROP_LABELS) {
      this.style.display = "inline-flex";
      this.labelElem.style.display = "none";
      this.style.margin = this.style.padding = "0px";
      return;
    }

    this.labelElem.style.display = "inline";

    // ensure label is in correct position
    if (f & PackFlags.LABEL_ON_RIGHT && this.labelElem === this.shadow.childNodes[0]) {
      this.labelElem.remove();
      this.shadow.append(this.labelElem);
    } else if (!(f & PackFlags.LABEL_ON_RIGHT) && this.labelElem !== this.shadow.childNodes[0]) {
      this.labelElem.remove();
      this.shadow.prepend(this.labelElem);
    }

    if (f & (PackFlags.LABEL_ON_RIGHT | PackFlags.LABEL_ON_LEFT)) {
      this.style.display = "inline-flex";
      this.style.flexDirection = "row";
    } else if (f & PackFlags.LABEL_ON_TOP) {
      this.style.display = "flex";
      this.style.flexDirection = "column";
    } else {
      this.style.display = this.parentWidget?.style.display ?? "flex";
      this.style.flexDirection = this.parentWidget?.style.flexDirection ?? "column";
    }

    this.labelElem.font = this.getDefault("font") || this.labelElem.font;
    this.labelElem.setCSS();

    // add label theme styling here
  }

  static define() {
    return {
      tagname: "widget-with-label-x",
      style  : "propLabels",
      theme: {
        font: t.font,
      },
    };
  }
}
UIBase.internalRegister(WidgetWithLabel as any);
