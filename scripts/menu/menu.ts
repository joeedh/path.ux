import * as util from "../path-controller/util/util";
import { UIBase, IconSheets, makeIconDiv, getFont, BoxBorder } from "../core/ui_base";
import { ZIndexes } from "../screen/constants";
import type { IContextBase } from "../core/context_base";
import type { CSSFont } from "../core/cssfont";
import type { PopupContainer } from "../screen/FrameManager_popup";
import { SEP, type MenuItem } from "./menu_types";
import { menuWrangler } from "./wrangler";
import type { DropBox } from "./dropbox";

/** Runs a menu-item callback, logging rather than propagating an exception it throws. */
function invokeMenuCallback(cb: (id: string | number) => void, id: string | number) {
  try {
    cb(id);
  } catch (error: unknown) {
    util.print_stack(error as Error);
    console.log("Error in menu callback");
  }
}

export class Menu<CTX extends IContextBase = IContextBase> extends UIBase<CTX, unknown, "Menu"> {
  static SEP: typeof SEP;

  /** The src button that created this menu, used to switch menus when hovering over other buttons. */
  srcWidget: UIBase<CTX> | undefined;
  /**
   * Hover text for the row a *parent* menu draws for this menu as a submenu. Ordinary items take
   * their tooltip through `addItem`/`addItemExtra`, but a submenu is added as the menu itself, so
   * the text has to travel on it.
   */
  tooltip: string | undefined;
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
  /**
   * A submenu's *own* dispatch, captured the first time a parent wraps it so that the wrapper can
   * be reinstalled on every focus without either dropping the callbacks or nesting itself. See
   * the wrapping in `addItem`; `undefined` means never wrapped, `null` means wrapped when there
   * was nothing of its own to keep.
   */
  _ownSelect?: ((id: string | number) => void) | null;

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

    this.container.setAttribute("class", "menucon");

    this.dom = document.createElement("ul");
    this.dom.setAttribute("class", "menu");

    const style = (this.menustyle = document.createElement("style"));
    this.buildStyle();

    this.dom.setAttribute("tabindex", "-1");

    //the menu wrangler handles key events

    this.addEventListener("contextmenu", (e) => e.preventDefault());

    this.shadow.appendChild(style);
    this.shadow.appendChild(this.container);
  }

  static define() {
    return {
      tagname: "menu-x",
      style  : "menu",
    };
  }

  /** The `zindex` argument is accepted for signature compatibility and ignored; menus always float at `ZIndexes.menu`. */
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

    return super.float(x, y, ZIndexes.menu, positionKey);
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

    const activeItem = this.activeItem;

    if (this._onselect) {
      invokeMenuCallback(this._onselect, activeItem._id);
    }
    if (this.on_select) {
      invokeMenuCallback(this.on_select, activeItem._id);
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
      let item: typeof this.activeItem;

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

  /** @deprecated Use {@link startSearch}. */
  startFancy(prepend?: boolean, setActive = true) {
    return this.startSearch(prepend, setActive);
  }

  /** Starts the menu with a search textbox that filters the items. */
  startSearch(prepend?: boolean, setActive = true) {
    this.hasSearchBox = true;
    this.started = true;
    menuWrangler.pushMenu(this);

    const dom2 = document.createElement("div");

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
    sbox.on_change = () => {
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
      return this.startSearch(prepend, setActive);
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

  addItemExtra(
    text: string,
    id: string | number,
    hotkey: string | undefined,
    icon = -1,
    add = true,
    tooltip = ""
  ) {
    const dom = document.createElement("span") as HTMLSpanElement & {
      hotkey?: string;
      icon?: number;
    };

    dom.style["display"] = "inline-flex";

    dom.hotkey = hotkey;
    dom.icon = icon;

    const icon_div = makeIconDiv(icon, IconSheets.SMALL);

    icon_div.style["display"] = "inline-flex";
    icon_div.style["marginRight"] = "1px";
    icon_div.style["align" as any] = "left";

    const span = document.createElement("span");

    //stupid css doesn't get width right. . .
    span.style["font"] = getFont(this, undefined, "MenuText");

    //XXX stupid!
    const canvas = document.createElement("canvas");
    const g = canvas.getContext("2d")!;

    g.font = span.style["font"];

    let twid = Math.ceil(g.measureText(text).width);
    let hwid: number | undefined;
    if (hotkey) {
      dom.hotkey = hotkey;
      g.font = getFont(this, undefined, "HotkeyText");
      hwid = Math.ceil(g.measureText(hotkey).width / UIBase.getDPI());
      twid += hwid + 8;
    }

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

      hotkey_span.style["width"] = "max-content";

      hotkey_span.style["textAlign"] = "right";
      hotkey_span.style["justifyContent"] = "right";
      hotkey_span.style["flexWrap"] = "nowrap";
      hotkey_span.style["textWrap"] = "nowrap";

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
  addItem(
    item: string | string | HTMLElement | Menu,
    id?: string | number,
    add = true,
    tooltip?: string
  ) {
    id = id === undefined ? (item as unknown as string | number) : id;
    let text: string | null =
      typeof item === "string" || item instanceof String
        ? (item as string)
        : (item as HTMLElement).textContent;

    if (typeof item === "string" || item instanceof String) {
      const dom = document.createElement("div");
      dom.style["textAlign"] = "left";

      dom.textContent = item as string;
      item = dom;
    } else {
      text = (item as HTMLElement).textContent;
    }

    const li = document.createElement("li") as unknown as MenuItem;

    li.setAttribute("tabindex", "" + this.itemindex++);
    li.setAttribute("class", "menuitem");

    // A submenu is added as the menu itself, so there is no `tooltip` argument to pass; it rides
    // on the menu instead.
    const hover = tooltip !== undefined ? tooltip : item instanceof Menu ? item.tooltip : undefined;
    if (hover !== undefined) {
      li.title = hover;
    }

    if (item instanceof Menu) {
      const dom = document.createElement("span") as HTMLSpanElement & { _id: string | number };
      dom.innerHTML = "" + item.title;
      dom._id = dom.id = "" + id;
      dom.setAttribute("class", "menu");

      li.style["width"] = "100%";
      li.appendChild(dom);

      li._isMenu = true;
      li._menu = item;
      item.parentMenu = this;
      item.srcWidget = this.srcWidget;

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
          const sub = li._menu!;
          // The submenu's own dispatch is kept rather than replaced. `createMenu` files a
          // submenu's callbacks on the submenu itself, keyed by that submenu's ids; a wrapper
          // that forwarded the id to the *parent* looked them up in the parent's table, found
          // nothing, and threw — which `click()` catches and logs, so the entry did nothing at
          // all. Captured once, because focus fires again every time the row is re-entered.
          if (sub._ownSelect === undefined) sub._ownSelect = sub._onselect ?? null;
          sub._onselect = (item: string | number) => {
            // Falling back to the parent keeps a submenu built by hand — one with no dispatch of
            // its own — working the way it did before.
            if (sub._ownSelect) sub._ownSelect(item);
            else this._onselect?.(item);
            sub.close();
            this.close();
          };

          if (!li._menu!.on_select && this.on_select !== undefined) {
            li._menu!.on_select = (item: string | number) => {
              this.on_select!(item);
            };
          }

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

      for (const type of ["pointerup", "click", "pointerdown"]) {
        li.addEventListener(type, onclick, { capture: true });
      }

      li.addEventListener("focus", onfocus);

      const hoverFocus = (e: Event) => {
        onfocus(e);
        li.focus();
      };
      for (const type of ["pointermove", "mouseover", "mouseenter", "pointerover"]) {
        li.addEventListener(type, hoverFocus);
      }

      this.dom.appendChild(li);
    }

    return li;
  }

  buildStyle() {
    // pad1 is only applied to items if the 'item' them subkey does not exist
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

    let itemRadius: number;

    if (this.hasDefault("item-radius")) {
      // this is only used if the item subkey doesn't exist
      itemRadius = this.getDefault("item-radius") as number;
    } else {
      itemRadius =
        (this.getDefault("border") as BoxBorder | undefined)?.radius ??
        (this.getDefault("border-radius") as number);
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
          ${this.genBoxCSS()}
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

          margin  : 0px;
          ${
            // XXX should separate out border from padding/margin box properties
            // e.g. if padding is present but border is not
            this.hasSubDefault("item", "border")
              ? this.genBoxCSS("item")
              : `
            padding-right: 16px;
            padding-left: 16px;
            padding-top : ${pad1}px;
            padding-bottom : ${pad1}px;

            border-radius : ${itemRadius}px;
          `
          }

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

        ${
          // XXX should separate out border from padding/margin box properties
          // e.g. if padding is present but border is not
          this.hasSubDefault("highlight-item", "border")
            ? this.genBoxCSS("highlight-item")
            : `
            border : none;
            border-radius : ${itemRadius}px;
          `
        }
          outline: none;

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
    const ret = newMenu(title);
    this.addItem(ret);

    return ret;
  }
}

/** Creates an unstarted `menu-x` element with the given title. */
export function newMenu<CTX extends IContextBase = IContextBase>(
  title: string,
  ctx?: CTX
): Menu<CTX> {
  const menu = UIBase.createElement("menu-x") as unknown as Menu<CTX>;

  if (ctx !== undefined) {
    menu.ctx = ctx;
  }

  menu.setAttribute("name", title);

  return menu;
}

Menu.SEP = SEP;
UIBase.internalRegister(Menu);
