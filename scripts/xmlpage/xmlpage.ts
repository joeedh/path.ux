//stores xml sources
import { isNumber } from "../path-controller/toolsys/toolprop.js";

let pagecache = new Map<string, string>();
import { PackFlags, UIBase } from "../core/ui_base.js";
import { sliderDomAttributes } from "../widgets/ui_numsliders.js";
import * as util from "../util/util.js";
import { Menu } from "../widgets/ui_menu.js";
import { Icons } from "../core/ui_base.js";
import { Container } from "../core/ui.js";
import type { IContextBase } from "../core/context_base.js";

export var domTransferAttrs = new Set(["id", "title", "tab-index"]);
export var domEventAttrs = new Set(["click", "mousedown", "mouseup", "mousemove", "keydown", "keypress"]);

export function parseXML(xml: string): XMLDocument {
  let parser = new DOMParser();
  xml = `<root>${xml}</root>`;
  return parser.parseFromString(xml.trim(), "application/xml") as XMLDocument;
}

let num_re = /[0-9]+$/;

function getIconFlag(elem: Element): number {
  if (!elem.hasAttribute("useIcons")) {
    return 0;
  }

  let attr: string | number | null = elem.getAttribute("useIcons");

  if (typeof attr === "string") {
    attr = attr.toLowerCase().trim();
  }

  if (attr === "false" || attr === "no") {
    return 0;
  }

  if (attr === "true" || attr === "yes") {
    return PackFlags.USE_ICONS;
  } else if (attr === "small") {
    return PackFlags.SMALL_ICON | PackFlags.USE_ICONS;
  } else if (attr === "large") {
    return PackFlags.LARGE_ICON | PackFlags.USE_ICONS;
  } else {
    let isnum = typeof attr === "number";
    let sheet: string | number = attr as string;

    if (typeof sheet === "string" && sheet.search(num_re) === 0) {
      sheet = parseInt(sheet);
      isnum = true;
    }

    if (!isnum) {
      return PackFlags.USE_ICONS;
    }

    let flag = PackFlags.USE_ICONS | PackFlags.CUSTOM_ICON_SHEET;
    flag |= ((sheet as number) - 1) << PackFlags.CUSTOM_ICON_SHEET_START;

    return flag;
  }

  return 0;
}

function getPackFlag(elem: Element): number {
  let packflag = getIconFlag(elem);

  if (elem.hasAttribute("drawChecks")) {
    if (!getbool(elem, "drawChecks")) {
      packflag |= PackFlags.HIDE_CHECK_MARKS;
    } else {
      packflag &= ~PackFlags.HIDE_CHECK_MARKS;
    }
  }

  if (getbool(elem, "simpleSlider")) {
    packflag |= PackFlags.SIMPLE_NUMSLIDERS;
  }
  if (getbool(elem, "rollarSlider")) {
    packflag |= PackFlags.FORCE_ROLLER_SLIDER;
  }

  return packflag;
}

function myParseFloat(s: unknown): number {
  let str = "" + s;
  str = str.trim().toLowerCase();

  if (str.endsWith("px")) {
    str = str.slice(0, str.length - 2);
  }

  return parseFloat(str);
}

function getbool(elem: Element, attr: string): boolean {
  let ret = elem.getAttribute(attr);
  if (!ret) {
    return false;
  }

  ret = ret.toLowerCase();
  return ret === "1" || ret === "true" || ret === "yes";
}

function getfloat(elem: Element, attr: string, defaultval: number | undefined): number | undefined {
  if (!elem.hasAttribute(attr)) {
    return defaultval;
  }

  return myParseFloat(elem.getAttribute(attr));
}

/*
 **
 *
 * a customHandler can be a callback, or the string "default", e.g.
 *
 * xmlpage.customHandlers["homegig-element-x"] = "default".
 *
 * The default case simply suppresses the warning that would otherwise
 * be printed to the console.
 * */
export const customHandlers: Record<string, ((handler: Handler, elem: Element) => void) | "default"> = {};

interface ContainerOptions {
  ignorePathPrefix?: boolean;
  noInheritCustomAttrs?: boolean;
}

class Handler {
  container: Container;
  stack: unknown[];
  ctx: IContextBase;
  codefuncs: Record<string, (...args: unknown[]) => unknown>;
  templateVars: Record<string, string>;
  templateScope: unknown;
  inheritDomAttrs: Record<string, string>;
  inheritDomAttrKeys: Set<string>;

  constructor(ctx: IContextBase, container: Container) {
    this.container = container;
    this.stack = [];
    this.ctx = ctx;
    this.codefuncs = {};

    this.templateVars = {};

    let attrs = util.list(sliderDomAttributes) as string[];

    //note that useIcons, showLabel and sliderMode are PackFlag bits and are inherited through that system

    this.inheritDomAttrs = {};
    this.inheritDomAttrKeys = new Set(attrs);
    this.templateScope = {};
  }

  push() {
    this.stack.push(this.container);
    this.stack.push(new Set(this.inheritDomAttrKeys));
    this.stack.push(Object.assign({}, this.inheritDomAttrs));
  }

  pop() {
    this.inheritDomAttrs = this.stack.pop() as Record<string, string>;
    this.inheritDomAttrKeys = this.stack.pop() as Set<string>;
    this.container = this.stack.pop() as Container;
  }

  handle(elem: Node) {
    if (elem.constructor === XMLDocument || elem.nodeName === "root") {
      for (let child of elem.childNodes) {
        this.handle(child);
      }

      (window as unknown as Record<string, unknown>)["tree"] = elem;
      return;
    } else if (elem.constructor === Text || elem.constructor === Comment) {
      return;
    }

    const elemEl = elem as Element;
    let tagname = "" + elemEl.tagName;

    const handlers = customHandlers as Record<string, ((handler: Handler, elem: Element) => void) | "default">;
    if (tagname in handlers) {
      const h = handlers[tagname];
      if (typeof h === "function") {
        h(this, elemEl);
      }
    } else if ((this as unknown as Record<string, unknown>)[tagname]) {
      (this as unknown as Record<string, (e: Element) => void>)[tagname](elemEl);
    } else {
      let elem2 = UIBase.createElement(tagname.toLowerCase());

      (window as unknown as Record<string, unknown>)["__elem"] = elemEl;
      //transfer DOM attributes
      for (let k of elemEl.getAttributeNames()) {
        elem2.setAttribute(k, elemEl.getAttribute(k) ?? "");
      }

      if (elem2 instanceof UIBase) {
        if (!elem2.hasAttribute("datapath") && elem2.hasAttribute("path")) {
          elem2.setAttribute("datapath", elem2.getAttribute("path") ?? "");
        }

        if (elem2.hasAttribute("datapath")) {
          let path = elem2.getAttribute("datapath") ?? "";
          path = (this.container as Container)._joinPrefix(path) ?? path;
          elem2.setAttribute("datapath", path);
        }

        if (elem2.hasAttribute("massSetPath") || this.container.massSetPrefix) {
          let massSetPath = "";

          if (elem2.hasAttribute("massSetPath")) {
            massSetPath = elem2.getAttribute("massSetPath") ?? "";
          }

          let path = elem2.getAttribute("datapath") ?? "";

          const mpath = this.container._getMassPath(this.container.ctx, path, massSetPath);
          elem2.setAttribute("massSetPath", mpath ?? "");
          elem2.setAttribute("mass_set_path", mpath ?? "");
        }

        this.container.add(elem2);
        this._style(elemEl, elem2);

        if (elem2 instanceof Container) {
          this.push();

          this.container = elem2;
          this._container(elemEl, elem2, { ignorePathPrefix: false });
          this.visit(elemEl);

          this.pop();

          return;
        }
      } else {
        console.warn("Unknown element " + elemEl.tagName + " (" + elemEl.constructor.name + ")");
        let elem2b = document.createElement(elemEl.tagName.toLowerCase());

        for (let attr of elemEl.getAttributeNames()) {
          elem2b.setAttribute(attr, elemEl.getAttribute(attr) ?? "");
        }

        this._basic(elemEl, elem2b);

        this.container.shadow.appendChild(elem2b);

        (elem2b as unknown as Record<string, unknown>)["pathux_ctx"] = this.container.ctx;
      }

      this.visit(elemEl);
    }
  }

  _style(elem: Element, elem2: Element | UIBase) {
    let style: Record<string, string> = {};

    //try to handle class attribute, at least somewhat

    if (elem.hasAttribute("class")) {
      elem2.setAttribute("class", elem.getAttribute("class") ?? "");

      let cls = (elem2.getAttribute("class") ?? "").trim();
      let keys = [cls, (elem2.tagName.toLowerCase() + "." + cls).trim(), "#" + (elem.getAttribute("id") ?? "").trim()];

      for (let sheet of document.styleSheets) {
        for (let rule of sheet.cssRules) {
          const cssRule = rule as CSSStyleRule & { styleMap?: { keys(): Iterable<string> } };
          if (!cssRule.selectorText) continue;
          for (let k of keys) {
            if (cssRule.selectorText.trim() === k) {
              if (cssRule.styleMap) {
                for (let k2 of cssRule.styleMap.keys()) {
                  let val = (cssRule.style as unknown as Record<string, string>)[k2];
                  style[k2] = val;
                }
              } else {
                for (let k2 in cssRule.style) {
                  const desc = Object.getOwnPropertyDescriptor(cssRule.style, k2);
                  if (!desc?.writable) continue;
                  const val = (cssRule.style as unknown as Record<string, string>)[k2];
                  if (val) style[k2] = val;
                }
              }
            }
          }
        }
      }
    }

    if (elem.hasAttribute("style")) {
      let stylecode = elem.getAttribute("style") ?? "";

      const parts = stylecode.split(";");

      for (let row of parts) {
        row = row.trim();

        let i = row.search(/:/);
        if (i >= 0) {
          let key = row.slice(0, i).trim();
          let val = row.slice(i + 1, row.length).trim();

          style[key] = val;
        }
      }
    }

    let keys = Object.keys(style);
    if (keys.length === 0) {
      return;
    }

    function setStyle() {
      for (let k of keys) {
        (elem2 as unknown as Record<string, unknown>)["style"] &&
          ((elem2 as HTMLElement).style as unknown as Record<string, string>)[k] !== undefined
          ? ((elem2 as HTMLElement).style.setProperty(k, style[k]))
          : ((elem2 as unknown as Record<string, string>)[k] = style[k]);
      }
    }

    if (elem2 instanceof UIBase) {
      elem2.setCSSAfter(() => {
        setStyle();
      });
    }

    setStyle();
  }

  visit(node: Node) {
    for (let child of node.childNodes) {
      this.handle(child);
    }
  }

  _getattr(elem: Element, k: string): string | null {
    let val: string | null = elem.getAttribute(k);

    if (!val) {
      return val;
    }

    if (val.startsWith("##")) {
      let varname = val.slice(2, val.length).trim();

      if (!(varname in this.templateVars)) {
        console.error(`unknown template variable '${varname}'`);
        val = "";
      } else {
        val = this.templateVars[varname];
      }
    }

    return val;
  }

  _inheritCustomAttrs(elem: Element, elem2: Element | UIBase) {
    let codeattrs: [string, string, string][] = [];
    let dataattrs: [string, string][] = [];

    for (let k of elem.getAttributeNames()) {
      let val = "" + elem.getAttribute(k);

      if (val.startsWith("ng[")) {
        val = val.slice(3, val.endsWith("]") ? val.length - 1 : val.length);

        codeattrs.push([k, "ng", val]);
      }
      if (k.startsWith("data-")) {
        dataattrs.push([k, val]);
      }
    }

    // set data- attributes directly
    for (const [k, val] of dataattrs) {
      elem2.setAttribute(k, val);
    }

    for (let k of domEventAttrs) {
      let k2 = "on" + k;

      if (elem.hasAttribute(k2)) {
        codeattrs.push([k, "dom", elem.getAttribute(k2) ?? ""]);
      }
    }

    for (let [k, eventType, id] of codeattrs) {
      if (!(id in this.codefuncs)) {
        console.error("Unknown code fragment " + id);
        continue;
      }

      if (eventType === "dom") {
        //click events usually don't go through normal
        //dom event system
        if (k === "click") {
          const htmlElem = elem2 as HTMLElement;
          let onclick = htmlElem.onclick;
          let func = this.codefuncs[id];

          (htmlElem as unknown as Record<string, unknown>)["onclick"] = function (this: HTMLElement) {
            if (onclick) {
              (onclick as (...a: unknown[]) => unknown).apply(this, arguments as unknown as unknown[]);
            }

            return func.apply(this, arguments as unknown as unknown[]);
          };
        } else {
          elem2.addEventListener(k, this.codefuncs[id] as EventListener);
        }
      } else if (eventType === "ng") {
        elem2.addEventListener(k, this.codefuncs[id] as EventListener);
      }
    }
  }

  _basic(elem: Element, elem2: Element | UIBase, options: ContainerOptions = {}) {
    if (!options.noInheritCustomAttrs) {
      this._inheritCustomAttrs(elem, elem2);
    }

    this._style(elem, elem2);

    for (let k of elem.getAttributeNames()) {
      if (k.startsWith("custom")) {
        elem2.setAttribute(k, this._getattr(elem, k) ?? "");
      }
    }

    for (let k of domTransferAttrs) {
      if (elem.hasAttribute(k)) {
        elem2.setAttribute(k, elem.getAttribute(k) ?? "");
      }
    }

    for (let k in this.inheritDomAttrs) {
      if (!elem.hasAttribute(k)) {
        elem.setAttribute(k, this.inheritDomAttrs[k]);
      }
    }

    for (let k of sliderDomAttributes) {
      if (elem.hasAttribute(k)) {
        elem2.setAttribute(k, elem.getAttribute(k) ?? "");
      }
    }

    if (!(elem2 instanceof UIBase)) {
      return;
    }

    if (elem.hasAttribute("theme-class")) {
      elem2.overrideClass(elem.getAttribute("theme-class") ?? "");

      if (elem2._init_done) {
        elem2.setCSS();
        elem2.flushUpdate();
      }
    }

    if (elem.hasAttribute("useIcons") && typeof (elem2 as unknown as Record<string, unknown>)["useIcons"] === "function") {
      let val: string | number | boolean = (elem.getAttribute("useIcons") ?? "").trim().toLowerCase();

      if (val === "small" || val === "true" || val === "yes") {
        val = true;
      } else if (val === "large") {
        val = 1;
      } else if (val === "false" || val === "no") {
        val = false;
      } else {
        val = parseInt(val as string) - 1;
      }

      (elem2 as Container).useIcons(val as boolean | number);
    }

    if (elem.hasAttribute("sliderTextBox")) {
      let textbox = getbool(elem, "sliderTextBox");

      if (textbox) {
        elem2.packflag &= ~PackFlags.NO_NUMSLIDER_TEXTBOX;
        (elem2 as Container).inherit_packflag &= ~PackFlags.NO_NUMSLIDER_TEXTBOX;
      } else {
        elem2.packflag |= PackFlags.NO_NUMSLIDER_TEXTBOX;
        (elem2 as Container).inherit_packflag |= PackFlags.NO_NUMSLIDER_TEXTBOX;
      }

      //console.error("textBox", textbox, elem2, elem.getAttribute("sliderTextBox"), elem2.packflag);
    }

    if (elem.hasAttribute("sliderMode")) {
      let sliderMode = elem.getAttribute("sliderMode");

      if (sliderMode === "slider") {
        elem2.packflag &= ~PackFlags.FORCE_ROLLER_SLIDER;
        (elem2 as Container).inherit_packflag &= ~PackFlags.FORCE_ROLLER_SLIDER;

        elem2.packflag |= PackFlags.SIMPLE_NUMSLIDERS;
        (elem2 as Container).inherit_packflag |= PackFlags.SIMPLE_NUMSLIDERS;
      } else if (sliderMode === "roller") {
        elem2.packflag &= ~PackFlags.SIMPLE_NUMSLIDERS;
        elem2.packflag |= PackFlags.FORCE_ROLLER_SLIDER;

        (elem2 as Container).inherit_packflag &= ~PackFlags.SIMPLE_NUMSLIDERS;
        (elem2 as Container).inherit_packflag |= PackFlags.FORCE_ROLLER_SLIDER;
      }

      //console.error("sliderMode", sliderMode, elem2, elem2.packflag & (PackFlags.SIMPLE_NUMSLIDERS | PackFlags.FORCE_ROLLER_SLIDER));
    }

    if (elem.hasAttribute("showLabel")) {
      let state = getbool(elem, "showLabel");

      if (state) {
        elem2.packflag |= PackFlags.FORCE_PROP_LABELS;
        (elem2 as Container).inherit_packflag |= PackFlags.FORCE_PROP_LABELS;
      } else {
        elem2.packflag &= ~PackFlags.FORCE_PROP_LABELS;
        (elem2 as Container).inherit_packflag &= ~PackFlags.FORCE_PROP_LABELS;
      }
    }

    function doBox(key: string) {
      if (elem.hasAttribute(key)) {
        let val: string | number = (elem.getAttribute(key) ?? "").toLowerCase().trim();

        if ((val as string).endsWith("px")) {
          val = (val as string).slice(0, (val as string).length - 2).trim();
        }

        if ((val as string).endsWith("%")) {
          //eek! don't support at all?
          //or use aspect overlay?

          console.warn(`Relative styling of '${key}' may be unstable for this element`, elem);

          (elem2 as UIBase).setCSSAfter(function (this: UIBase) {
            (this.style as unknown as Record<string, string>)[key] = val as string;
          });
        } else {
          val = parseFloat(val as string);

          if (isNaN(val) || typeof val !== "number") {
            console.error(`Invalid style ${key}:${elem.getAttribute(key)}`);
            return;
          }

          (elem2 as UIBase).overrideDefault(key, val);
          (elem2 as UIBase).setCSS();
          (elem2 as HTMLElement).style.setProperty(key, "" + val + "px");
        }
      }
    }

    doBox("width");
    doBox("height");
    doBox("margin");
    doBox("padding");

    for (let i = 0; i < 2; i++) {
      let key = i ? "margin" : "padding";

      doBox(key + "-bottom");
      doBox(key + "-top");
      doBox(key + "-left");
      doBox(key + "-right");
    }
  }

  _handlePathPrefix(elem: Element, con: Container) {
    if (elem.hasAttribute("path")) {
      let prefix = con.dataPrefix;
      let path = (elem.getAttribute("path") ?? "").trim();

      if (prefix.length > 0) {
        prefix += ".";
      }

      prefix += path;
      con.dataPrefix = prefix;
    }

    if (elem.hasAttribute("massSetPath")) {
      let prefix = con.massSetPrefix;
      let path = (elem.getAttribute("massSetPath") ?? "").trim();

      if (prefix.length > 0) {
        prefix += ".";
      }

      prefix += path;
      con.massSetPrefix = prefix;
    }
  }

  /** noInheritCustomAttrs: don't transfer ng or data- attributes to the container element*/
  _container(elem: Element, con: Container, options: ContainerOptions = {}) {
    for (let k of this.inheritDomAttrKeys) {
      if (elem.hasAttribute(k)) {
        this.inheritDomAttrs[k] = elem.getAttribute(k) ?? "";
      }
    }

    let packflag = getPackFlag(elem);

    con.packflag |= packflag;
    con.inherit_packflag |= packflag;

    this._basic(elem, con, options);

    if (!options?.ignorePathPrefix) {
      this._handlePathPrefix(elem, con);
    }
  }

  noteframe(elem: Element) {
    let ret = this.container.noteframe();

    if (ret) {
      this._basic(elem, ret);
    }
  }

  cell(elem: Element) {
    this.push();
    this.container = (this.container as unknown as Record<string, () => Container>)["cell"]() as Container;
    this._container(elem, this.container);
    this.visit(elem);
    this.pop();
  }

  table(elem: Element) {
    this.push();
    this.container = this.container.table() as unknown as Container;
    this._container(elem, this.container);
    this.visit(elem);
    this.pop();
  }

  panel(elem: Element) {
    let title = "" + elem.getAttribute("label");
    let closed = getbool(elem, "closed");

    this.push();
    this.container = this.container.panel(title) as unknown as Container;
    (this.container as unknown as Record<string, unknown>)["closed"] = closed;

    this._container(elem, this.container);

    this.visit(elem);

    this.pop();
  }

  pathlabel(elem: Element) {
    this._prop(elem, "pathlabel");
  }

  /**
   handle a code element, which are wrapped in functions
   */
  code(elem: Element) {
    (window as unknown as Record<string, unknown>)["_codelem"] = elem;

    let buf = "";

    for (let elem2 of elem.childNodes) {
      if (elem2.nodeName === "#text") {
        buf += elem2.textContent + "\n";
      }
    }

    let func: ((...args: unknown[]) => unknown) | undefined;
    const $scope = this.templateScope;

    buf = `
func = function() {
  ${buf};
}
    `;

    // eslint-disable-next-line no-eval
    eval(buf);

    let id = "" + elem.getAttribute("id");

    this.codefuncs[id] = func!;
  }

  textbox(elem: Element) {
    if (elem.hasAttribute("path")) {
      this._prop(elem, "textbox");
    } else {
      //let elem2 = this.container.textbox();
      //this._basic(elem, elem2);
    }
  }

  label(elem: Element) {
    let elem2 = this.container.label(elem.innerHTML);
    this._basic(elem, elem2);
  }

  colorfield(elem: Element) {
    this._prop(elem, "colorfield");
  }

  /** simpleSliders=true enables simple sliders */
  prop(elem: Element) {
    this._prop(elem, "prop");
  }

  _prop(elem: Element, key: string) {
    let packflag = getPackFlag(elem);
    let path = elem.getAttribute("path");

    let elem2: Element | undefined;
    if (key === "pathlabel") {
      elem2 = this.container.pathlabel(path ?? undefined, elem.innerHTML, packflag) as unknown as Element;
    } else if (key === "textbox") {
      const tb = this.container.textbox(path ?? undefined, undefined, undefined, packflag);
      elem2 = tb as unknown as Element;

      if (tb) {
        (tb as unknown as { update(): void }).update();
      }

      //make textboxes non-modal by default
      if (elem.hasAttribute("modal")) {
        elem2.setAttribute("modal", elem.getAttribute("modal") ?? "");
      }

      if (elem.hasAttribute("realtime")) {
        elem2.setAttribute("realtime", elem.getAttribute("realtime") ?? "");
      }
    } else if (key === "colorfield") {
      elem2 = this.container.colorPicker(path ?? undefined, {
        packflag,
        themeOverride: elem.hasAttribute("theme-class") ? elem.getAttribute("theme-class") ?? undefined : undefined,
      }) as unknown as Element;
    } else {
      elem2 = (this.container as unknown as Record<string, (p: string | undefined, f: number) => Element>)[key](path ?? undefined, packflag);
    }

    if (!elem2) {
      let span = document.createElement("span");
      span.innerHTML = "error";
      this.container.shadow.appendChild(span);
    } else {
      this._basic(elem, elem2);

      if (elem.hasAttribute("massSetPath") || this.container.massSetPrefix) {
        let mpath: string | undefined = elem.getAttribute("massSetPath") ?? undefined;
        if (!mpath) {
          mpath = elem.getAttribute("path") ?? undefined;
        }

        mpath = this.container._getMassPath(this.container.ctx, path ?? undefined, mpath);

        elem2.setAttribute("mass_set_path", mpath ?? "");
      }
    }
  }

  strip(elem: Element) {
    this.push();

    let dir: boolean | undefined;
    if (elem.hasAttribute("mode")) {
      dir = (elem.getAttribute("mode") ?? "").toLowerCase().trim() === "horizontal";
    }

    let margin1 = getfloat(elem, "margin1", undefined);
    let margin2 = getfloat(elem, "margin2", undefined);

    this.container = this.container.strip(undefined, margin1, margin2, dir) as unknown as Container;
    this._container(elem, this.container);
    this.visit(elem);

    this.pop();
  }

  column(elem: Element) {
    this.push();
    this.container = this.container.col() as unknown as Container;
    this._container(elem, this.container);
    this.visit(elem);
    this.pop();
  }

  row(elem: Element) {
    this.push();
    this.container = this.container.row() as unknown as Container;
    this._container(elem, this.container);
    this.visit(elem);
    this.pop();
  }

  toolPanel(elem: Element) {
    this.tool(elem, "toolPanel");
  }

  tool(elem: Element, key = "tool") {
    let path = elem.getAttribute("path");
    let packflag = getPackFlag(elem);

    let noIcons = false;
    let iconflags: number | undefined;

    if (getbool(elem, "useIcons")) {
      packflag |= PackFlags.USE_ICONS;
    } else if (elem.hasAttribute("useIcons")) {
      packflag &= ~PackFlags.USE_ICONS;
      noIcons = true;
    }

    let label = ("" + elem.textContent).trim();
    if (label.length > 0) {
      path += "|" + label;
    }

    if (noIcons) {
      iconflags = this.container.useIcons(false);
    }

    let elem2: Element | undefined = (this.container as unknown as Record<string, (p: string | null, f: number) => Element | undefined>)[key](path, packflag);

    if (elem2) {
      this._basic(elem, elem2);
    } else {
      let errElem = document.createElement("strip");
      errElem.innerHTML = "error";
      this.container.shadow.appendChild(errElem);
      this._basic(elem, errElem);
    }

    if (noIcons && iconflags !== undefined) {
      (this.container as Container).inherit_packflag |= iconflags;
      this.container.packflag |= iconflags;
    }
  }

  dropbox(elem: Element) {
    return this.menu(elem, true);
  }

  menu(elem: Element, isDropBox = false) {
    let packflag = getPackFlag(elem);
    let title = elem.getAttribute("name") ?? "";

    let list: unknown[] = [];

    for (let child of elem.childNodes) {
      const childEl = child as Element;
      if (!childEl.tagName) continue;

      if (childEl.tagName === "tool") {
        let path = childEl.getAttribute("path") ?? "";
        let label = childEl.innerHTML.trim();

        if (label.length > 0) {
          path += "|" + label;
        }

        list.push(path);
      } else if (childEl.tagName === "sep") {
        list.push(Menu.SEP);
      } else if (childEl.tagName === "item") {
        let id: string | undefined;
        let icon: number | undefined;
        let hotkey: string | undefined;
        let description: string | undefined;

        if (childEl.hasAttribute("id")) {
          id = childEl.getAttribute("id") ?? undefined;
        }

        if (childEl.hasAttribute("icon")) {
          const iconName = (childEl.getAttribute("icon") ?? "").toUpperCase().trim();
          icon = (Icons as Record<string, number>)[iconName];
        }

        if (childEl.hasAttribute("hotkey")) {
          hotkey = childEl.getAttribute("hotkey") ?? undefined;
        }

        if (childEl.hasAttribute("description")) {
          description = childEl.getAttribute("description") ?? undefined;
        }

        list.push({
          name: childEl.innerHTML.trim(),
          id,
          icon,
          hotkey,
          description,
        });
      }
    }

    let ret = this.container.menu(title, list as Parameters<Container["menu"]>[1], packflag);
    if (isDropBox) {
      ret.removeAttribute("simple");
    }

    if (elem.hasAttribute("id")) {
      ret.setAttribute("id", elem.getAttribute("id") ?? "");
    }

    this._basic(elem, ret as unknown as Element);

    return ret;
  }

  button(elem: Element) {
    let title = elem.innerHTML.trim();

    let ret = this.container.button(title);

    if (elem.hasAttribute("id")) {
      (ret as unknown as Element).setAttribute("id", elem.getAttribute("id") ?? "");
    }

    this._basic(elem, ret as unknown as Element);
  }

  iconbutton(elem: Element) {
    let title = elem.innerHTML.trim();

    let iconStr = elem.getAttribute("icon");
    let icon: number | undefined;
    if (iconStr) {
      icon = UIBase.getIconEnum()[iconStr];
    }
    let ret = this.container.iconbutton(icon ?? 0, title);

    if (elem.hasAttribute("id")) {
      (ret as unknown as Element).setAttribute("id", elem.getAttribute("id") ?? "");
    }

    this._basic(elem, ret as unknown as Element);
  }

  tab(elem: Element) {
    this.push();

    let title = "" + elem.getAttribute("label");

    this.container = (this.container as unknown as Record<string, (t: string) => Container>)["tab"](title);

    if (elem.hasAttribute("overflow")) {
      this.container.setAttribute("overflow", elem.getAttribute("overflow") ?? "");
    }

    if (elem.hasAttribute("overflow-y")) {
      this.container.setAttribute("overflow-y", elem.getAttribute("overflow-y") ?? "");
    }

    this._container(elem, this.container, { noInheritCustomAttrs: true });
    const tabItem = (this.container as unknown as Record<string, unknown>)["_tab"];
    if (tabItem && typeof (tabItem as Element).setAttribute === "function") {
      this._inheritCustomAttrs(elem, tabItem as Element);
    }

    this.visit(elem);

    this.pop();
  }

  tabs(elem: Element) {
    let pos = elem.getAttribute("pos") || "left";

    this.push();

    let tabs = this.container.tabs(pos as "top" | "bottom" | "left" | "right");
    this.container = tabs as unknown as Container;

    if (elem.hasAttribute("movable-tabs")) {
      (tabs as unknown as Element).setAttribute("movable-tabs", elem.getAttribute("movable-tabs") ?? "");
    }

    this._container(elem, tabs as unknown as Container);
    this.visit(elem);

    this.pop();
  }
}

interface LoadPageArgs {
  parentContainer?: HTMLElement;
  loadSourceOnly?: boolean;
  modifySourceCB?: (source: string) => string;
  templateVars?: Record<string, string>;
  templateScope?: unknown;
}

export function initPage(
  ctx: IContextBase,
  xml: string,
  parentContainer: HTMLElement | undefined = undefined,
  templateVars: Record<string, string> = {},
  templateScope: unknown = {}
): Container {
  let tree = parseXML(xml);
  let container = UIBase.createElement("container-x") as unknown as Container;

  container.ctx = ctx;
  if (ctx) {
    container._init();
  }

  if (parentContainer) {
    (parentContainer as unknown as Container).add(container);
  }

  let handler = new Handler(ctx, container);

  handler.templateVars = Object.assign({}, templateVars);
  handler.templateScope = templateScope;

  handler.handle(tree);

  return container;
}

export function loadPage(
  ctx: IContextBase,
  url: string,
  parentContainer_or_args: HTMLElement | LoadPageArgs | undefined = undefined,
  loadSourceOnly = false,
  modifySourceCB?: (source: string) => string,
  templateVars?: Record<string, string>,
  templateScope?: unknown
): Promise<Container | string> {
  let source: string | undefined;
  let parentContainer: HTMLElement | undefined;

  if (parentContainer_or_args !== undefined && !(parentContainer_or_args instanceof HTMLElement)) {
    let args = parentContainer_or_args as LoadPageArgs;

    parentContainer = args.parentContainer;
    loadSourceOnly = args.loadSourceOnly ?? false;
    modifySourceCB = args.modifySourceCB;
    templateVars = args.templateVars;
    templateScope = args.templateScope;
  } else {
    parentContainer = parentContainer_or_args as HTMLElement | undefined;
  }

  if (pagecache.has(url)) {
    source = pagecache.get(url)!;

    if (modifySourceCB) {
      source = modifySourceCB(source);
    }

    return new Promise((accept) => {
      if (loadSourceOnly) {
        accept(source!);
      } else {
        accept(initPage(ctx, source!, parentContainer, templateVars, templateScope));
      }
    });
  } else {
    return new Promise((accept) => {
      fetch(url)
        .then((res) => res.text())
        .then((data) => {
          pagecache.set(url, data);

          if (modifySourceCB) {
            data = modifySourceCB(data);
          }

          if (loadSourceOnly) {
            accept(data);
          } else {
            accept(initPage(ctx, data, parentContainer, templateVars, templateScope));
          }
        });
    });
  }
}
