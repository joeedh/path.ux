"use strict";

import * as util from "../path-controller/util/util";
import cconst from "../config/const";
import {
  UIBase,
  IconSheets,
  makeIconDiv,
  iconmanager,
  getFont,
  drawRoundBox2,
  drawRoundBox,
  IUIBaseConstructor,
} from "../core/ui_base";
import * as toolprop from "../path-controller/toolsys/toolprop";
import { OldButton } from "./ui_button";
import { DomEventTypes } from "../path-controller/util/events";

import { HotKey, keymap } from "../path-controller/util/simple_events";
import { parseToolPath } from "../path-controller/controller";
import { IContextBase } from "../core/context_base";
import type { CSSFont } from "../core/cssfont";
import type { Screen } from "../screen/FrameManager";

const PropTypes = toolprop.PropTypes;

export const SEP = Symbol("MenuSep");
export type SEP = symbol;

export type MenuTemplateTool = string;
export type MenuTemplateCustom = [
  name: string,
  func: <CTX>(ctx: CTX) => void,
  hotkey?: string,
  icon?: number,
  tooltip?: string,
  id?: string | number,
];

export type MenuItemCallback = (dom: HTMLElement) => HTMLElement;
/** Old array form; [label, hotkey?:string|HotKey, icon?:number, tooltip?:string id?:any */
export type MenuTemplateItem =
  | SEP
  | MenuTemplateTool
  | MenuTemplateCustom
  | MenuItemCallback
  | Menu;

export type MenuTemplate = MenuTemplateItem[];

function getpx(css: string) {
  return parseFloat(css.trim().replace("px", ""));
}

function debugmenu(...args: unknown[]) {
  if (window.DEBUG?.menu) {
    console.warn("%cmenu:", "color:blue", ...args);
  }
}

/** Helper for CSSStyleDeclaration string indexing */
type StyleRecord = CSSStyleDeclaration & Record<string, string>;

/** Menu item: an HTMLLIElement with extra properties attached at runtime */
interface MenuItem extends HTMLLIElement {
  _id: string | number;
  _isMenu: boolean;
  _menu?: Menu;
  hotkey?: string;
  icon?: number;
  label?: string;
}

/** Type for popup container returned by Screen.popup() */
type PopupContainer<CTX extends IContextBase = IContextBase> = UIBase<CTX> & {
  noMarginsOrPadding(): void;
  end(): void;
  add(child: UIBase<CTX>): void;
};

/* Window augmentations for _menuWrangler, menu, _startMenuEventWrangling
 * are already declared in global.d.ts — use type assertions when setting. */

export class Menu<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
  static SEP: typeof SEP;

  parentMenu: Menu | undefined;
  _was_clicked: boolean;
  items: MenuItem[];
  autoSearchMode: boolean;
  _ignoreFocusEvents: boolean;
  closeOnMouseUp?: boolean;
  _submenu: Menu | undefined;
  ignoreFirstClick: number | boolean;
  itemindex: number;
  closed: boolean;
  started: boolean;
  activeItem: MenuItem | undefined;
  container: HTMLSpanElement;
  dom: HTMLUListElement;
  menustyle: HTMLStyleElement;
  hasSearchBox: boolean;
  textbox!: UIBase<CTX> & { text: string; onchange: (() => void) | null; parentWidget: unknown };
  _popup: PopupContainer | undefined;
  _dropbox: DropBox | undefined;
  _onclose: ((...args: unknown[]) => void) | undefined;
  _onselect: ((id: string | number) => void) | null;

  on_select?: (id: number | string) => void;

  constructor() {
    super();

    this.parentMenu = undefined;

    this._was_clicked = false;

    this.items = [];
    this.autoSearchMode = true;

    this._ignoreFocusEvents = false;
    this.closeOnMouseUp = true;

    this._submenu = undefined;

    this.ignoreFirstClick = false;

    this.itemindex = 0;
    this.closed = false;
    this.started = false;
    this.activeItem = undefined;
    this.hasSearchBox = false;
    this._onselect = null;
    this._onclose = undefined;

    this.overrideDefault("DefaultText", this.getDefault("MenuText"));

    //we have to make a container for any submenus to
    this.container = document.createElement("span");
    this.container.style["display"] = "flex";
    this.container.style["color"] = (this.getDefault("MenuText") as CSSFont).color;

    //this.container.style["background-color"] = "red";
    this.container.setAttribute("class", "menucon");

    this.dom = document.createElement("ul");
    this.dom.setAttribute("class", "menu");
    /*
              place-items: start start;
              flex-wrap : nowrap;
              align-content : start;
              place-content : start;
              justify-content : start;

              align-items : start;
              place-items : start;
              justify-items : start;
    */

    const style = (this.menustyle = document.createElement("style"));
    this.buildStyle();

    this.dom.setAttribute("tabindex", "-1");

    //the menu wrangler handles key events

    this.shadow.appendChild(style);
    this.shadow.appendChild(this.container);
  }

  static define() {
    return {
      tagname: "menu-x",
      style  : "menu",
    };
  }

  float(x = 0, y = 0, zindex?: number | string, positionKey = UIBase.PositionKey): this {
    const rects = this.dom.getClientRects();
    const maxx = this.getWinWidth() - 10;
    const maxy = this.getWinHeight() - 10;

    if (rects.length > 0) {
      const rect = rects[0];
      if (y + rect.height > maxy) {
        y = maxy - rect.height - 1;
      }

      if (x + rect.width > maxx) {
        x = maxx - rect.width - 1;
      }
    }

    return super.float(x, y, 50, positionKey);
  }

  click() {
    if (this._was_clicked) {
      return;
    }

    if (this.ignoreFirstClick) {
      this.ignoreFirstClick = Math.max((this.ignoreFirstClick as number) - 1, 0);
      return;
    }

    if (!this.activeItem || this.activeItem._isMenu) {
      return;
    }

    this._was_clicked = true;

    if (this._onselect) {
      try {
        this._onselect(this.activeItem._id);
      } catch (error: unknown) {
        util.print_stack(error as Error);
        console.log("Error in menu callback");
      }
    }
    if (this.on_select) {
      try {
        this.on_select(this.activeItem._id);
      } catch (error: unknown) {
        util.print_stack(error as Error);
        console.log("Error in menu callback");
      }
    }

    this.close();
  }

  _ondestroy() {
    if (this.started) {
      menuWrangler.popMenu(this);

      if (this._onclose) {
        this._onclose();
      }
    }
  }

  init() {
    super.init();
    this.setCSS();
  }

  close() {
    if (this.closed) {
      return;
    }

    this.closed = true;

    if (this.started) {
      menuWrangler.popMenu(this);
    }

    this.started = false;

    if (this._popup) {
      this._popup.end();
      this._popup = undefined;
    }

    this.remove();
    this.dom.remove();

    if (this._onclose) {
      this._onclose(this);
    }
  }

  _select(dir: number, focus = true) {
    if (this.activeItem === undefined) {
      for (const item of this.items) {
        if (!item.hidden) {
          this.setActive(item, focus);
          break;
        }
      }
    } else {
      let i = this.items.indexOf(this.activeItem);
      let item = this.activeItem;

      do {
        i = (i + dir + this.items.length) % this.items.length;
        item = this.items[i];

        if (!item.hidden) {
          break;
        }
      } while (item !== this.activeItem);

      this.setActive(item, focus);
    }

    if (this.hasSearchBox) {
      this.activeItem?.scrollIntoView();
    }
  }

  selectPrev(focus = true) {
    return this._select(-1, focus);
  }

  selectNext(focus = true) {
    return this._select(1, focus);
  }

  start_fancy(prepend?: boolean, setActive = true) {
    return this.startFancy(prepend, setActive);
  }

  setActive(item: MenuItem | undefined, focus = true) {
    if (this.activeItem === item) {
      return;
    }

    if (this.activeItem) {
      this.activeItem.style["backgroundColor"] = this.getDefault("MenuBG") as string;

      if (focus) {
        this.activeItem.blur();
      }
    }

    if (item) {
      item.style["backgroundColor"] = this.getDefault("MenuHighlight") as string;

      if (focus) {
        item.focus();
      }
    }

    this.activeItem = item;
  }

  startFancy(prepend?: boolean, setActive = true) {
    this.hasSearchBox = true;
    this.started = true;
    menuWrangler.pushMenu(this);

    const dom2 = document.createElement("div");
    //let dom2 = document.createElement("div");

    this.dom.setAttribute("class", "menu");
    dom2.setAttribute("class", "menu");

    const sbox = (this.textbox = UIBase.createElement("textbox-x") as typeof this.textbox);
    this.textbox.parentWidget = this;

    dom2.appendChild(sbox);
    dom2.appendChild(this.dom);

    dom2.style["height"] = "300px";
    this.dom.style["height"] = "300px";
    this.dom.style["overflow"] = "scroll";

    if (prepend) {
      this.container.prepend(dom2);
    } else {
      this.container.appendChild(dom2);
    }

    (dom2 as HTMLDivElement & { parentWidget: unknown }).parentWidget = this.container;

    sbox.focus();
    sbox.onchange = () => {
      const t = sbox.text.trim().toLowerCase();

      for (const item of this.items) {
        item.hidden = true;
        item.remove();
      }

      for (const item of this.items) {
        let ok = t == "";
        ok = ok || item.innerHTML.toLowerCase().search(t) >= 0;

        if (ok) {
          item.hidden = false;
          this.dom.appendChild(item);
        } else if (item === this.activeItem) {
          this.selectNext(false);
        }
        //item.hidden = !ok;
      }
    };

    sbox.addEventListener("keydown", (e: KeyboardEvent) => {
      switch (e.keyCode) {
        case 27: //escape key
          this.close();
          break;
        case 13: //enter key
          this.click();
          this.close();
          break;
      }
    });
  }

  start(prepend = false, setActive = true) {
    this.closed = false;

    this.started = true;
    this.focus();

    menuWrangler.pushMenu(this);

    const dokey = (key: string) => {
      let val = this.getDefault(key) as string | number | undefined;
      if (typeof val === "number") {
        val = "" + val + "px";
      }

      if (val !== undefined) {
        this.dom.style[key as any] = val as string;
      }
    };

    dokey("padding");
    dokey("padding-top");
    dokey("padding-left");
    dokey("padding-right");
    dokey("padding-bottom");

    if (this.items.length > 15 && this.autoSearchMode) {
      return this.start_fancy(prepend, setActive);
    }

    if (prepend) {
      this.container.prepend(this.dom);
    } else {
      this.container.appendChild(this.dom);
    }

    if (!setActive) return;

    this.setCSS();
    this.flushUpdate();

    window.setTimeout(() => {
      this.flushUpdate();

      //select first child
      //TODO: cache last child entry

      if (this.activeItem === undefined) {
        this.activeItem = this.dom.childNodes[0] as MenuItem | undefined;
      }

      if (this.activeItem === undefined) {
        return;
      }

      this.activeItem.focus();
    }, 0);
  }

  addItemExtra(text: string, id: string | number, hotkey: string | undefined, icon = -1, add = true, tooltip = "") {
    const dom = document.createElement("span") as HTMLSpanElement & { hotkey?: string; icon?: number };

    console.warn("hotkey", hotkey);
    dom.style["display"] = "inline-flex";

    dom.hotkey = hotkey;
    dom.icon = icon;

    let icon_div: HTMLElement;

    if (1) {
      //icon >= 0) {
      icon_div = makeIconDiv(icon, IconSheets.SMALL);
    } else {
      const tilesize = iconmanager.getTileSize(IconSheets.SMALL);

      //tilesize *= window.devicePixelRatio;

      icon_div = document.createElement("span");
      icon_div.style["padding"] = icon_div.style["margin"] = "0px";
      icon_div.style["width"] = tilesize + "px";
      icon_div.style["height"] = tilesize + "px";
    }

    icon_div.style["display"] = "inline-flex";
    icon_div.style["marginRight"] = "1px";
    icon_div.style["align" as any] = "left";

    const span = document.createElement("span");

    //stupid css doesn't get width right. . .
    span.style["font"] = getFont(this, undefined, "MenuText");

    const dpi = this.getDPI();
    const tsize = (this.getDefault("MenuText") as CSSFont).size;
    //XXX proportional font fail

    //XXX stupid!
    const canvas = document.createElement("canvas");
    const g = canvas.getContext("2d")!;

    g.font = span.style["font"];

    const rect = span.getClientRects();

    let twid = Math.ceil(g.measureText(text).width);
    let hwid: number | undefined;
    if (hotkey) {
      dom.hotkey = hotkey;
      g.font = getFont(this, undefined, "HotkeyText");
      hwid = Math.ceil(g.measureText(hotkey).width / UIBase.getDPI());
      twid += hwid + 8;
    }

    //let twid = Math.ceil(text.trim().length * tsize / dpi);

    span.innerText = text;

    span.style["wordWrap"] = "none";
    span.style["whiteSpace"] = "pre";
    span.style["overflow"] = "hidden";
    span.style["textOverflow"] = "clip";

    span.style["width"] = ~~twid + "px";
    span.style["padding"] = "0px";
    span.style["margin"] = "0px";

    dom.style["width"] = "100%";

    dom.appendChild(icon_div);
    dom.appendChild(span);

    if (hotkey) {
      const hotkey_span = document.createElement("span");
      hotkey_span.innerText = hotkey;
      hotkey_span.style["display"] = "inline-flex";

      hotkey_span.style["margin"] = "0px";
      hotkey_span.style["marginLeft"] = "auto";
      hotkey_span.style["marginRight"] = "0px";
      hotkey_span.style["padding"] = "0px";

      hotkey_span.style["font"] = getFont(this, undefined, "HotkeyText");
      hotkey_span.style["color"] = this.getDefault("HotkeyTextColor") as string;

      //hotkey_span.style["width"] = ~~((hwid + 7)) + "px";
      hotkey_span.style["width"] = "max-content";

      //hotkey_span.style["background-color"] = "rgba(0,0,0,0)";

      hotkey_span.style["textAlign"] = "right";
      hotkey_span.style["justifyContent"] = "right";
      hotkey_span.style["flexWrap"] = "nowrap";
      hotkey_span.style["textWrap"] = "nowrap";

      //hotkey_span.style["border"] = "1px solid red";

      //hotkey_span.style["display"] = "inline";
      //hotkey_span.style["float"] = "right";

      dom.appendChild(hotkey_span);
    }

    const ret = this.addItem(dom, id, add);

    ret.hotkey = hotkey;
    ret.icon = icon;
    ret.label = text ? text : ret.innerText;

    if (tooltip) {
      ret.title = tooltip;
    }

    return ret;
  }

  //item can be menu or text
  addItem(item: string | string | HTMLElement | Menu, id?: string | number, add = true, tooltip?: string) {
    id = id === undefined ? (item as unknown as string | number) : id;
    let text: string | null =
      typeof item === "string" || item instanceof String ? (item as string) : (item as HTMLElement).textContent;

    if (typeof item === "string" || item instanceof String) {
      const dom = document.createElement("div");
      dom.style["textAlign"] = "left";

      dom.textContent = item as string;
      item = dom;
      //return this.addItemExtra(item, id);
    } else {
      text = (item as HTMLElement).textContent;
    }

    const li = document.createElement("li") as unknown as MenuItem;

    li.setAttribute("tabindex", "" + this.itemindex++);
    li.setAttribute("class", "menuitem");

    if (tooltip !== undefined) {
      li.title = tooltip;
    }

    if (item instanceof Menu) {
      //let dom = this.addItemExtra(""+item.title, id, "", -1, false);
      const dom = document.createElement("span") as HTMLSpanElement & { _id: string | number };
      dom.innerHTML = "" + item.title;
      dom._id = dom.id = "" + id;
      dom.setAttribute("class", "menu");

      //dom = document.createElement("div");
      //dom.innerText = ""+item.title;

      //dom.style["display"] = "inline-block";
      li.style["width"] = "100%";
      li.appendChild(dom);

      li._isMenu = true;
      li._menu = item;
      item.parentMenu = this;

      item.hidden = false;
      item.container = this.container;
    } else {
      li._isMenu = false;
      li.appendChild(item as HTMLElement);
    }

    li._id = id!;

    this.items.push(li);

    li.label = text ? text : li.innerText.trim();

    if (add) {
      li.addEventListener("blur", () => {
        if (this._ignoreFocusEvents) {
          return;
        }

        if (this.activeItem && !this.activeItem._isMenu) {
          this.setActive(undefined, false);
        }
      });

      const onfocus = (_e: Event) => {
        if (this._ignoreFocusEvents) {
          return;
        }

        if (this._submenu) {
          this._submenu.close();
          this._submenu = undefined;
        }

        if (li._isMenu) {
          li._menu!._onselect = (item: string | number) => {
            this._onselect?.(item);
            li._menu!.close();
            this.close();
          };

          li._menu!.start(false, false);
          this._submenu = li._menu;
        }

        this.setActive(li, false);
      };

      const onclick = (e: Event) => {
        onfocus(e);

        e.stopPropagation();
        e.preventDefault();

        if (this.activeItem?._isMenu) {
          //ignore
          return;
        }

        this.click();
      };

      li.addEventListener("contextmenu", (e) => e.preventDefault());
      this.addEventListener("contextmenu", (e) => e.preventDefault());

      li.addEventListener("pointerup", onclick, { capture: true });
      li.addEventListener("click", onclick, { capture: true });
      li.addEventListener("pointerdown", onclick, { capture: true });

      li.addEventListener("focus", (e) => {
        onfocus(e);
        onfocus(e);
      });

      li.addEventListener("pointermove", (e) => {
        onfocus(e);
        li.focus();
      });
      li.addEventListener("mouseover", (e) => {
        onfocus(e);
        li.focus();
      });
      li.addEventListener("mouseenter", (e) => {
        onfocus(e);
        li.focus();
      });

      li.addEventListener("pointerover", (e) => {
        onfocus(e);
        li.focus();
      });

      this.dom.appendChild(li);
    }

    return li;
  }

  _getBorderStyle() {
    const r = this.getDefault("border-width");
    const s = this.getDefault("border-style");
    const c = this.getDefault("border-color");

    return `${r}px ${s} ${c}`;
  }

  buildStyle() {
    let pad1 = util.isMobile() ? 2 : 0;
    pad1 += this.getDefault("MenuSpacing") as number;

    let boxShadow = "";
    if (this.hasDefault("box-shadow")) {
      boxShadow = "box-shadow: " + this.getDefault("box-shadow") + ";";
    }

    let sepcss: unknown = this.getDefault("MenuSeparator");
    if (typeof sepcss === "object" && sepcss !== null) {
      let s = "";
      const sepobj = sepcss as Record<string, string | number>;

      for (const k in sepobj) {
        let v: string | number = sepobj[k];

        if (typeof v === "number") {
          v = v.toFixed(4) + "px";
        }

        s += `    ${k}: ${v};\n`;
      }

      sepcss = s;
    }

    let itemRadius: number = 0;

    if (this.hasDefault("item-radius")) {
      itemRadius = this.getDefault("item-radius") as number;
    } else {
      itemRadius = this.getDefault("border-radius") as number;
    }

    const menuText = this.getDefault("MenuText") as CSSFont;

    this.menustyle.textContent = `
        .menucon {
          position:fixed;
          float:left;

          border-radius : ${this.getDefault("border-radius")}px;

          display: block;
          -moz-user-focus: normal;
          ${boxShadow}
        }

        ul.menu {
          display        : flex;
          flex-direction : column;
          flex-wrap      : nowrap;
          width          : max-content;

          margin : 0px;
          padding : 0px;
          border : ${this._getBorderStyle()};
          border-radius : ${this.getDefault("border-radius")}px;
          -moz-user-focus: normal;
          background-color: ${this.getDefault("MenuBG")};
          color : ${menuText.color};
        }

        .menuitem {
          display : flex;
          flex-wrap : nowrap;
          flex-direction : row;

          list-style-type:none;
          -moz-user-focus: normal;

          margin : 0;
          padding : 0px;
          padding-right: 16px;
          padding-left: 16px;
          padding-top : ${pad1}px;
          padding-bottom : ${pad1}px;

          border-radius : ${itemRadius}px;

          color : ${menuText.color};
          font : ${menuText.genCSS()};
          background-color: ${this.getDefault("MenuBG")};
        }
        
        .menuseparator {
          ${sepcss}
        }
        
        .menuitem:focus {
          display : flex;
          text-align: left;
          
          border : none;
          outline : none;
          border-radius : ${itemRadius}px;
          
          background-color: ${this.getDefault("MenuHighlight")};
          color : ${menuText.color};
          -moz-user-focus: normal;
        }
      `;
  }

  setCSS() {
    super.setCSS();

    this.buildStyle();

    const menuTextColor = (this.getDefault("MenuText") as CSSFont).color;
    this.container.style["color"] = menuTextColor;
    this.style["color"] = menuTextColor;
  }

  seperator() {
    const bar = document.createElement("div");
    bar.setAttribute("class", "menuseparator");

    this.dom.appendChild(bar);

    return this;
  }

  menu(title: string) {
    const ret = UIBase.createElement("menu-x") as unknown as Menu;

    ret.setAttribute("name", title);
    this.addItem(ret);

    return ret;
  }

  calcSize() {}
}

Menu.SEP = SEP;
UIBase.internalRegister(Menu);

export class DropBox<CTX extends IContextBase = IContextBase> extends OldButton<CTX> {
  _menu: Menu<CTX> | undefined;
  prop?: toolprop.EnumProperty;
  lockTimer: number;
  _template: MenuTemplate | (() => MenuTemplate) | undefined;
  _searchMenuMode: boolean;
  altKey: number | undefined;
  _value: number | string;
  _last_datapath: string | undefined;
  _last_dbox_key: unknown;
  _popup: PopupContainer | undefined;
  _background: string | undefined;
  width = 0;
  on_select?: ((id: string | number) => void) | undefined;
  _onselect?: ((id: string | number) => void) | undefined;
  _onchangeCallback: ((val: string | number) => void) | null = null;

  constructor() {
    super();

    this.lockTimer = 0;

    this._template = undefined;

    this._searchMenuMode = false;
    this.altKey = undefined;

    this._value = 0;

    this._last_datapath = undefined;

    this.r = 5;
    this._menu = undefined;
    this._auto_depress = false;
    //this.prop = new EnumProperty(undefined, {}, "", "", 0);

    this._onpress = this._onpress.bind(this);
  }

  get searchMenuMode() {
    return this._searchMenuMode;
  }

  set searchMenuMode(v) {
    this._searchMenuMode = v;
  }

  get template() {
    return this._template;
  }

  set template(v) {
    this._template = v;
  }

  get value() {
    return this._value;
  }

  set value(v) {
    this.setValue(v);
  }

  get menu() {
    return this._menu;
  }

  set menu(val) {
    this._menu = val;

    if (val !== undefined) {
      this._name = val.title;
      this.updateName();
    }
  }

  static define() {
    return {
      tagname: "dropbox-x",
      style  : "dropbox",
    };
  }

  init() {
    super.init();

    this.setAttribute("menu-button", "true");

    this.updateWidth();
  }

  setCSS() {
    //do not call parent classes's setCSS here

    this.style["userSelect"] = "none";
    this.dom.style["userSelect"] = "none";

    let keys;
    if (this.getAttribute("simple")) {
      keys = ["margin-left", "margin-right", "padding-left", "padding-right"];
    } else {
      keys = [
        "margin",
        "margin-left",
        "margin-right",
        "margin-top",
        "margin-bottom",
        "padding",
        "padding-left",
        "padding-right",
        "padding-top",
        "padding-bottom",
      ];
    }

    const setDefault = (key: string) => {
      if (this.hasDefault(key)) {
        this.style[key as any] = this.getDefault(key, undefined, 0) + "px";
      }
    };

    for (const k of keys) {
      setDefault(k);
    }
  }

  _genLabel() {
    let s = super._genLabel();
    let ret = "";

    if (s.length === 0) {
      s = "(error)";
    }

    this.altKey = s[0].toUpperCase().charCodeAt(0);

    for (let i = 0; i < s.length; i++) {
      if (s[i] === "&" && i < s.length - 1 && s[i + 1] !== "&") {
        this.altKey = s[i + 1].toUpperCase().charCodeAt(0);
      } else if (s[i] === "&" && i < s.length - 1 && s[i + 1] === "&") {
        continue;
      } else {
        ret += s[i];
      }
    }

    return ret;
  }

  updateWidth() {
    //let ret = super.updateWidth(10);
    const dpi = this.getDPI();

    const ts = (this.getDefault("DefaultText") as CSSFont).size;
    let tw = this.g.measureText(this._genLabel()).width / dpi;
    //let tw = measureText(this, this._genLabel(), undefined, undefined, ts).width + 8;
    tw = ~~tw;

    tw += 15;

    if (!this.getAttribute("simple")) {
      tw += 35;
    }

    if (tw !== this._last_w) {
      this._last_w = tw;
      this.dom.style["width"] = tw + "px";
      this.style["width"] = tw + "px";
      this.width = tw;

      this.overrideDefault("width", tw);
      this._repos_canvas();
      this._redraw();
    }

    return 0;
  }

  updateBorders() {
    //Do not apply border stlying to the child canvas
    super.updateBorders(this as unknown as HTMLElement);
  }

  updateDataPath() {
    if (!this.ctx || !this.hasAttribute("datapath")) {
      return;
    }

    let wasError = false;
    let prop: toolprop.EnumProperty | undefined;
    let val: unknown;

    try {
      this.pushReportContext(this._reportCtxName);
      const datapath = this.getAttribute("datapath")!;
      const resolved = this.ctx.api.resolvePath(this.ctx, datapath);
      if (!resolved) {
        wasError = true;
        this.popReportContext();
        return;
      }
      prop = resolved.prop as unknown as toolprop.EnumProperty;
      val = this.ctx.api.getValue(this.ctx, datapath);

      prop = (prop as unknown as { prop?: toolprop.EnumProperty })?.prop
        ? (prop as unknown as { prop: toolprop.EnumProperty }).prop
        : prop;

      this.popReportContext();
    } catch (error: unknown) {
      util.print_stack(error as Error);
      wasError = true;
    }

    if (wasError) {
      this.disabled = true;
      this.setCSS();
      this._redraw();

      return;
    } else {
      this.disabled = false;
      this.setCSS();
      this._redraw();
    }

    if (!prop) {
      return;
    }

    if (this.prop === undefined) {
      this.prop = prop;
    }

    prop = this.prop;

    let name: string | null = this.getAttribute("name");

    if (prop!.type & (PropTypes.ENUM | PropTypes.FLAG)) {
      name = prop!.ui_value_names[prop!.keys[val as string | number]];
    } else {
      name = "" + val;
    }

    if (name !== this.getAttribute("name")) {
      this.setAttribute("name", name!);
      this.updateName();
    }
  }

  update() {
    const path = this.getAttribute("datapath");

    if (path && path !== this._last_datapath) {
      this._last_datapath = path;
      this.prop = undefined;

      this.updateDataPath();
    }

    super.update();

    const key = this.getDefault("dropTextBG");
    if (key !== this._last_dbox_key) {
      this._last_dbox_key = key;
      this.setCSS();
      this._redraw();
    }

    if (this.hasAttribute("datapath")) {
      this.updateDataPath();
    }
  }

  _build_menu_template() {
    if (this._menu?.parentNode !== undefined) {
      this._menu.remove();
    }

    //let name = "" + this.getAttribute("name");
    let template = this._template;

    if (typeof template === "function") {
      template = template();
    }

    this._menu = createMenu(this.ctx!, "", template as MenuTemplate);
    return this._menu;
  }

  _build_menu() {
    if (this._template) {
      this._build_menu_template();
      return;
    }

    const prop = this.prop;

    if (prop === undefined) {
      return;
    }

    if (this._menu?.parentNode !== undefined) {
      this._menu.remove();
    }

    const menu = (this._menu = UIBase.createElement("menu-x") as unknown as Menu<CTX>);

    //let name = "" + this.getAttribute("name");
    menu.setAttribute("name", "");
    menu._dropbox = this;

    const valmap: Record<string | number, string> = {};
    const enummap = prop.values;
    const iconmap = prop.iconmap;
    const uimap = prop.ui_value_names;
    const desr = prop.descriptions || {};

    for (const k in enummap) {
      let uk = k;

      valmap[enummap[k]] = k;

      if (uimap !== undefined && k in uimap) {
        uk = uimap[k];
      }

      const tooltip = desr[k];

      //menu.addItem(k, enummap[k], ":");
      if (iconmap?.[k]) {
        menu.addItemExtra(uk, enummap[k], undefined, iconmap[k], undefined, tooltip);
      } else {
        menu.addItem(uk, enummap[k], undefined, tooltip);
      }
    }

    menu._onselect = (id: string | number) => {
      this._pressed = false;

      this._pressed = false;
      this._redraw();

      this._menu = undefined;

      //check if datapath system will be calling .prop.setValue instead of us
      let callProp = true;
      if (this.hasAttribute("datapath")) {
        const datapath = this.getAttribute("datapath")!;
        const rdef = this.ctx!.api.resolvePath(this.ctx!, datapath);
        const rdata = (rdef as unknown as { dpath: { data: unknown } }).dpath?.data;

        callProp = !rdata || !(rdata instanceof toolprop.ToolProperty);
      }

      this._value = this._convertVal(id) ?? id;

      if (callProp) {
        this.prop!.setValue(id);
      }

      this.setAttribute("name", this.prop!.ui_value_names[valmap[id]]);
      if (this.on_select) {
        this.on_select(id);
      }

      if (this.hasAttribute("datapath") && this.ctx) {
        this.setPathValue(this.ctx, this.getAttribute("datapath")!, id);
      }
    };
  }

  override _onpress = (e: unknown) => {
    const _e = e as { x: number; y: number; stopPropagation?(): void; preventDefault?(): void };
    this.abortToolTips(1000);

    if (this._menu !== undefined) {
      this.lockTimer = util.time_ms();

      this._pressed = false;
      this._redraw();

      const menu = this._menu;
      this._menu = undefined;
      menu.close();
      return;
    }

    if (util.time_ms() - this.lockTimer < 200) {
      return;
    }

    this._build_menu();

    // TypeScript can't see that _build_menu() sets this._menu, so cast to re-read
    const builtMenu = (this as DropBox<CTX>)._menu;
    if (builtMenu === undefined) {
      return;
    }

    builtMenu.autoSearchMode = false;

    builtMenu._dropbox = this;
    (this.dom as HTMLCanvasElement & { _background: unknown })._background = this.getDefault("BoxDepressed");
    this._background = this.getDefault("BoxDepressed") as string;
    this._redraw();
    this._pressed = true;
    this.setCSS();

    const onclose = builtMenu._onclose;
    builtMenu._onclose = () => {
      this.lockTimer = util.time_ms();

      this._pressed = false;
      this._redraw();

      const menu = this._menu;
      if (menu) {
        this._menu = undefined;
        menu._dropbox = undefined;
      }

      if (onclose) {
        onclose.call(menu);
      }
    };

    const menu = builtMenu;
    const screen = this.getScreen() as unknown as Screen<CTX> | undefined;

    const dpi = this.getDPI();

    let x = _e.x;
    let y = _e.y;
    const rects = this.dom.getBoundingClientRect(); //getClientRects();

    const rheight = rects.height;
    x = rects.x;
    y = rects.y + rheight;

    if (!window.haveElectron) {
      //y -= 8;
    }

    /* need to figure out a better way to pop up a menu
     *  above a given y position */
    if (cconst.menusCanPopupAbove && screen && y > screen.size[1] * 0.5 && !this.searchMenuMode) {
      const con = screen.popup(this, 500, 400, false, 0) as unknown as PopupContainer;

      con.style["zIndex"] = "-10000";
      con.style["position"] = UIBase.PositionKey;
      document.body.appendChild(con);

      con.style["visibility"] = "hidden";

      con.add(menu);
      menu.start();

      const time = util.time_ms();

      const timer = window.setInterval(() => {
        if (util.time_ms() - time > 1500) {
          window.clearInterval(timer);
          return;
        }

        const r = menu.dom.getBoundingClientRect();

        if (!r || r.height < 55) {
          return;
        }

        window.clearInterval(timer);

        y -= r.height + rheight;

        menu.dom.remove();
        con.remove();

        const popup = (this._popup = menu._popup = screen!.popup(this, x, y, false, 0) as unknown as PopupContainer);
        popup.noMarginsOrPadding();

        //popup.shadow.appendChild(menu.dom);
        popup.add(menu);
        menu.start();

        popup.style["left"] = x + "px";
        popup.style["top"] = y + "px";
        //menu.setCSS();
      }, 1);

      return;
    }

    if (!screen) return;

    const con = (this._popup = menu._popup = screen.popup(this, x, y, false, 0) as unknown as PopupContainer);
    con.noMarginsOrPadding();

    con.add(menu);
    if (this.searchMenuMode) {
      menu.startFancy();
    } else {
      menu.start();
    }
  };

  _redraw() {
    if (this.getAttribute("simple")) {
      let color;

      this.g.clearRect(0, 0, this.dom.width, this.dom.height);

      if (this._highlight) {
        drawRoundBox2(this, {
          canvas: this.dom,
          g     : this.g,
          color : this.getDefault("BoxHighlight") as string | undefined,
        });
      }

      if (this._focus) {
        drawRoundBox2(this, {
          canvas  : this.dom,
          g       : this.g,
          color   : this.getDefault("BoxHighlight") as string | undefined,
          op      : "stroke",
          no_clear: true,
        });
        drawRoundBox(this, this.dom, this.g, undefined, undefined, 2, "stroke");
      }

      this._draw_text();
      return;
    }

    super._redraw(false);

    const g = this.g;
    const w = this.dom.width;
    const h = this.dom.height;
    const dpi = this.getDPI();

    const p = 10 * dpi;
    const p2 = dpi;

    //*
    const bg = this.getDefault("dropTextBG");
    if (bg !== undefined) {
      g.fillStyle = bg;

      g.beginPath();
      g.rect(p2, p2, this.dom.width - p2 - h, this.dom.height - p2 * 2);
      g.fill();
    }
    //*/

    g.fillStyle = "rgba(50, 50, 50, 0.2)";
    g.strokeStyle = "rgba(50, 50, 50, 0.8)";
    g.beginPath();
    /*
    g.moveTo(w-p, p);
    g.lineTo(w-(p+h*0.25), h-p);
    g.lineTo(w-(p+h*0.5), p);
    g.closePath();
    //*/

    const sz = 0.3;
    g.moveTo(w - h * 0.5 - p, p);
    g.lineTo(w - p, p);
    g.moveTo(w - h * 0.5 - p, p + (sz * h) / 3);
    g.lineTo(w - p, p + (sz * h) / 3);
    g.moveTo(w - h * 0.5 - p, p + (sz * h * 2) / 3);
    g.lineTo(w - p, p + (sz * h * 2) / 3);

    g.lineWidth = 1;
    g.stroke();

    this._draw_text();
  }

  _convertVal(val: string | number) {
    if (typeof val === "string" && this.prop) {
      if (val in this.prop.values) {
        return this.prop.values[val];
      } else if (val in this.prop.keys) {
        return this.prop.keys[val];
      } else {
        return undefined;
      }
    }

    return val;
  }

  setValue(val: string | number | undefined, setLabelOnly = false) {
    if (val === undefined || val === this._value) {
      return;
    }

    val = this._convertVal(val);

    if (val === undefined) {
      console.warn("Bad val", arguments[0]);
      return;
    }

    this._value = val;

    if (this.prop !== undefined && !setLabelOnly) {
      this.prop.setValue(val);
      let val2 = val;

      if (val2 in this.prop.keys) val2 = this.prop.keys[val2];
      val2 = this.prop.ui_value_names[val2];

      this.setAttribute("name", "" + val2);
      this._name = "" + val2;
    } else {
      this.setAttribute("name", "" + val);
      this._name = "" + val;
    }

    if (this._onchangeCallback && !setLabelOnly) {
      this._onchangeCallback(val);
    }

    this.setCSS();
    this.updateDataPath();
    this._redraw();
  }
}

UIBase.internalRegister(DropBox as unknown as IUIBaseConstructor);

export class MenuWrangler {
  screen: Screen | undefined;
  menustack: Menu[];
  lastPickElemTime: number;
  _closetimer: number;
  closeOnMouseUp: boolean | undefined;
  closereq: Menu | undefined;
  timer: ReturnType<typeof setInterval> | undefined;
  spawnreq: unknown;

  [k: string]: unknown;

  constructor() {
    this.screen = undefined;
    this.menustack = [];

    this.lastPickElemTime = util.time_ms();

    this._closetimer = 0;
    this.closeOnMouseUp = undefined;
    this.closereq = undefined;

    this.timer = undefined;
  }

  get closetimer() {
    return this._closetimer;
  }

  set closetimer(v) {
    debugmenu("set closertime", v);
    this._closetimer = v;
  }

  get menu() {
    return this.menustack.length > 0 ? this.menustack[this.menustack.length - 1] : undefined;
  }

  pushMenu(menu: Menu) {
    debugmenu("pushMenu");

    this.spawnreq = undefined;

    if (this.menustack.length === 0 && menu.closeOnMouseUp) {
      this.closeOnMouseUp = true;
    }

    this.menustack.push(menu);
  }

  popMenu(_menu?: Menu) {
    debugmenu("popMenu");

    return this.menustack.pop();
  }

  endMenus() {
    debugmenu("endMenus");

    for (const menu of this.menustack) {
      menu.close();
    }

    this.menustack = [];
  }

  searchKeyDown(e: KeyboardEvent) {
    const menu = this.menu;
    if (!menu) return;

    e.stopPropagation();
    menu._ignoreFocusEvents = true;
    menu.textbox.focus();
    menu._ignoreFocusEvents = false;

    //if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) {
    //  return;
    //}

    switch (e.keyCode) {
      case keymap["Enter"]: //return key
        menu.click();
        break;
      case keymap["Escape"]: //escape key
        menu.close();
        break;
      case keymap["Up"]:
        menu.selectPrev(false);
        break;
      case keymap["Down"]:
        menu.selectNext(false);
        break;
    }
  }

  on_keydown(e: KeyboardEvent) {
    window.menu = this.menu;

    if (this.menu === undefined) {
      return;
    }

    if (this.menu.hasSearchBox) {
      return this.searchKeyDown(e);
    }

    const menu = this.menu;

    switch (e.keyCode) {
      case keymap["Left"]: //left
      case keymap["Right"]: //right
        if (menu._dropbox) {
          let dropbox: Element | null = menu._dropbox as unknown as Element;

          if (e.keyCode === keymap["Left"]) {
            dropbox = dropbox.previousElementSibling;
          } else {
            dropbox = dropbox.nextElementSibling;
          }

          if (dropbox !== null && dropbox instanceof DropBox) {
            this.endMenus();
            (dropbox as unknown as DropBox)._onpress(e);
          }
        }
        break;
      case keymap["Up"]: //up
        menu.selectPrev();
        break;
      case keymap["Down"]: //down
        menu.selectNext();
        break;
      /*
      let item = menu.activeItem;
      if (!item) {
        item = menu.items[0];
      }

      if (!item) {
        return;
      }

      let item2;
      let i = menu.items.indexOf(item);

      if (e.keyCode == 38) {
        i = (i - 1 + menu.items.length) % menu.items.length;
      } else {
        i = (i + 1) % menu.items.length;
      }

      item2 = menu.items[i];

      if (item2) {
        menu.setActive(item2);
      }
      break;//*/
      case 13: //return key
      case 32: //space key
        menu.click();
        break;
      case 27: //escape key
        menu.close();
        break;
    }
  }

  on_pointerdown(e: PointerEvent) {
    if (this.menu === undefined || this.screen === undefined) {
      this.closetimer = util.time_ms();
      return;
    }

    const screen = this.screen;
    const x = e.pageX;
    const y = e.pageY;

    const element = screen.pickElement(x, y);

    if (element !== undefined && (element instanceof DropBox || util.isMobile())) {
      this.endMenus();
      e.preventDefault();
      e.stopPropagation();
    }
  }

  on_pointerup(e: PointerEvent) {
    if (this.menu === undefined || this.screen === undefined) {
      this.closetimer = util.time_ms();
      return;
    }

    const screen = this.screen;
    const x = e.pageX;
    const y = e.pageY;

    let element = screen.pickElement(x, y, undefined, undefined, DropBox);
    if (element !== undefined) {
      this.closeOnMouseUp = false;
    } else {
      element = screen.pickElement(x, y, undefined, undefined, Menu);

      //closeOnMouseUp
      if (element && this.closeOnMouseUp) {
        element.click();
      }
    }
  }

  findMenu(x: number, y: number) {
    const screen = this.screen;
    if (!screen) return undefined;

    const element = screen.pickElement(x, y);

    if (element === undefined) {
      return;
    }

    if (element instanceof Menu) {
      return element;
    }

    let w = element as UIBase | undefined;

    while (w) {
      if (w instanceof Menu) {
        //w === this.menu) {
        return w;
        break;
      }

      w = w.parentWidget;
    }

    return undefined;
  }

  on_pointermove(e: PointerEvent) {
    if (this.menu?.hasSearchBox) {
      this.closetimer = util.time_ms();
      this.closereq = undefined;
      return;
    }

    if (this.menu === undefined || this.screen === undefined) {
      this.closetimer = util.time_ms();
      this.closereq = undefined;
      return;
    }

    const screen = this.screen;
    const x = e.pageX;
    const y = e.pageY;

    let element: UIBase | undefined;
    const menu = this.menu;

    if (menu) {
      const r = menu.getBoundingClientRect();
      const pad = 15;

      if (r && x >= r.x - pad && y >= r.y - pad && x <= r.x + r.width + pad * 2 && y <= r.y + r.height + pad * 2) {
        element = menu;
      }
    }

    if (!element && util.time_ms() - this.lastPickElemTime > 250) {
      element = screen.pickElement(x, y);
      this.lastPickElemTime = util.time_ms();
    }

    if (element === undefined) {
      return;
    }

    if (element instanceof Menu) {
      this.closetimer = util.time_ms();
      this.closereq = undefined;
      return;
    }

    type DropBoxLike = UIBase & { menu?: Menu; _onpress?(e: PointerEvent): void };
    const elem = element as DropBoxLike;

    let destroy = elem.hasAttribute("menu-button") && element.hasAttribute("simple");
    destroy = destroy && elem.menu !== this.menu;

    if (destroy) {
      /* check that dropbox doesn't contain our parent menu either */

      let menu2: Menu | undefined = this.menu;
      while (menu2 !== elem.menu) {
        menu2 = menu2?.parentMenu;
        destroy = destroy && (menu2 === undefined || menu2 !== elem.menu);
      }
    }

    if (destroy) {
      //destroy entire menu stack
      this.endMenus();

      this.closetimer = util.time_ms();
      this.closereq = undefined;

      //start new menu
      elem._onpress?.(e);
      return;
    }

    let ok = false;

    let w: DropBoxLike | undefined = elem;
    while (w) {
      if (w instanceof Menu) {
        //w === this.menu) {
        ok = true;
        break;
      }

      if (w.hasAttribute("menu-button") && w.menu === this.menu) {
        ok = true;
        break;
      }

      w = w.parentWidget as DropBoxLike | undefined;
    }

    if (!ok) {
      this.closereq = this.menu;
    } else {
      this.closetimer = util.time_ms();
      this.closereq = undefined;
    }
  }

  update() {
    let closetime: number | undefined = cconst.menu_close_time;
    closetime = closetime === undefined ? 50 : closetime;

    let close = this.closereq && this.closereq === this.menu;
    close = close && util.time_ms() - this.closetimer > closetime;

    if (close) {
      this.closereq = undefined;
      this.endMenus();
    }
  }

  startTimer() {
    if (this.timer) {
      this.stopTimer();
    }

    this.timer = setInterval(() => {
      debugmenu("start menu wrangler interval");

      this.update();
    }, 150);
  }

  stopTimer() {
    if (this.timer) {
      debugmenu("stop menu wrangler interval");

      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}

export const menuWrangler = new MenuWrangler();
window._menuWrangler = menuWrangler;
let wrangerStarted = false;

export function startMenuEventWrangling(screen?: Screen) {
  if (typeof document === "undefined") {
    // inside a worker?
    return;
  }
  menuWrangler.screen = screen;

  if (wrangerStarted) {
    return;
  }

  wrangerStarted = true;

  for (const k in DomEventTypes) {
    if (menuWrangler[k] === undefined) {
      continue;
    }

    const eventType = (DomEventTypes as Record<string, string>)[k];
    const handler = (menuWrangler[k] as Function).bind(menuWrangler) as EventListener;
    window.addEventListener(eventType, handler, { passive: false, capture: true });
  }

  menuWrangler.screen = screen;
  menuWrangler.startTimer();
}

window._startMenuEventWrangling = startMenuEventWrangling;

export function setWranglerScreen<CTX extends IContextBase>(screen: Screen<CTX> | undefined) {
  startMenuEventWrangling(screen as unknown as Screen);
}

export function getWranglerScreen() {
  return menuWrangler.screen;
}

export function createMenu<CTX extends IContextBase = IContextBase>(
  ctx: CTX,
  title: string,
  templ: MenuTemplate
): Menu<CTX> {
  const menu = UIBase.createElement("menu-x") as unknown as Menu<CTX>;
  menu.ctx = ctx;
  menu.setAttribute("name", title);

  const menuSEP = (menu.constructor as typeof Menu).SEP;
  let id = 0;
  const cbs: Record<string | number, () => void> = {};

  const doItem = (item: MenuTemplateItem) => {
    if (item !== undefined && item instanceof Menu) {
      menu.addItem(item);
    } else if (typeof item == "string") {
      let def: { uiname: string; hotkey?: string; icon?: number };
      let hotkey: string | undefined;

      try {
        def = ctx.api.getToolDef(item) as typeof def;
      } catch (error: unknown) {
        menu.addItem("(tool path error)", id++);
        return;
      }

      //3Extra(text, id=undefined, hotkey, icon=-1, add=true) {
      if (!def.hotkey) {
        try {
          hotkey = ctx.api.getToolPathHotkey(ctx, item) as string | undefined;
        } catch (error: unknown) {
          util.print_stack(error as Error);
          console.warn("error getting hotkey for tool " + item);
          hotkey = undefined;
        }
      } else {
        hotkey = def.hotkey;
      }

      menu.addItemExtra(def.uiname, id, hotkey, def.icon);

      cbs[id] = (function (toolpath: string) {
        return function () {
          ctx.api.execTool(ctx, toolpath);
        };
      })(item);

      id++;
    } else if (item === menuSEP) {
      menu.seperator();
    } else if (typeof item === "function" || item instanceof Function) {
      doItem((item as MenuItemCallback)(document.createElement("div")) as unknown as MenuTemplateItem);
    } else if (item instanceof Array) {
      //old array-based api for custom entries
      let hotkey: string | HotKey | undefined = item.length > 1 ? (item[2] as string | HotKey | undefined) : undefined;
      const icon = item.length > 2 ? ((item as any)[3] as number | undefined) : undefined;
      const tooltip = item.length > 3 ? ((item as any)[4] as string | undefined) : undefined;
      const id2 = item.length > 4 ? ((item as any)[5] as string | number) : id++;

      if (hotkey !== undefined && hotkey instanceof HotKey) {
        hotkey = hotkey.buildString();
      }

      menu.addItemExtra(item[0], id2, hotkey, icon, undefined, tooltip);

      cbs[id2 as string | number] = (function (cbfunc: Function, arg: string | number) {
        return function () {
          cbfunc(arg);
        };
      })(item[1] as Function, id2 as string | number);
    } else if (typeof item === "object") {
      //new object-based api for custom entries
      const objItem = item as {
        name: string;
        callback: Function;
        hotkey?: string | HotKey;
        icon?: number;
        tooltip?: string;
        id?: string | number;
      };
      let { name, callback, hotkey, icon, tooltip } = objItem;

      const id2 = objItem.id !== undefined ? objItem.id : id++;
      if (hotkey !== undefined && hotkey instanceof HotKey) {
        hotkey = hotkey.buildString();
      }

      menu.addItemExtra(name, id2, hotkey as string | undefined, icon, undefined, tooltip);

      cbs[id2] = (function (cbfunc: Function, arg: string | number) {
        return function () {
          cbfunc(arg);
        };
      })(callback, id2);
    }
  };

  for (const item of templ) {
    doItem(item);
  }

  menu._onselect = (id: string | number) => {
    cbs[id]();
  };

  return menu;
}

export function startMenu(menu: Menu, x: number, y: number, searchMenuMode = false, safetyDelay = 55) {
  menuWrangler.endMenus();

  const screen = (menu.ctx as IContextBase).screen as unknown as Screen;
  const con = (menu._popup = screen.popup(
    menu as unknown as UIBase,
    x,
    y,
    false,
    safetyDelay
  ) as unknown as PopupContainer);
  con.noMarginsOrPadding();

  con.add(menu);
  if (searchMenuMode) {
    menu.startFancy();
  } else {
    menu.start();
  }

  menu.flushUpdate();
  menu.flushSetCSS();

  menu._popup.flushUpdate();
  menu._popup.flushSetCSS();
}
