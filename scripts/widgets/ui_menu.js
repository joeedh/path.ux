"use strict";

import * as util from '../path-controller/util/util.js';
import cconst from '../config/const.js';
import * as ui_base from '../core/ui_base.js';
import * as toolprop from '../path-controller/toolsys/toolprop.js';
import {OldButton} from "./ui_button.js";
import {DomEventTypes} from '../path-controller/util/events.js';

import {HotKey, keymap} from '../path-controller/util/simple_events.js';
import { parseToolPath } from '../pathux.js';

let EnumProperty = toolprop.EnumProperty,
    PropTypes    = toolprop.PropTypes;

let UIBase     = ui_base.UIBase,
    PackFlags  = ui_base.PackFlags,
    IconSheets = ui_base.IconSheets;

function getpx(css) {
  return parseFloat(css.trim().replace("px", ""))
}

function debugmenu() {
  if (window.DEBUG && window.DEBUG.menu) {
    console.warn("%cmenu:", "color:blue", ...arguments);
  }
}


export class Menu extends UIBase {
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

    this.overrideDefault("DefaultText", this.getDefault("MenuText"));

    //we have to make a container for any submenus to
    this.container = document.createElement("span");
    this.container.style["display"] = "flex";
    this.container.style["color"] = this.getDefault("MenuText").color;

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

    let style = this.menustyle = document.createElement("style");
    this.buildStyle();

    this.dom.setAttribute("tabindex", -1);

    //the menu wrangler handles key events

    this.shadow.appendChild(style);
    this.shadow.appendChild(this.container);
  }

  static define() {
    return {
      tagname: "menu-x",
      style  : "menu"
    };
  }

  float(x, y, zindex = undefined) {
    let dpi = this.getDPI();
    let rect = this.dom.getClientRects();
    let maxx = this.getWinWidth() - 10;
    let maxy = this.getWinHeight() - 10;

    if (rect.length > 0) {
      rect = rect[0];
      if (y + rect.height > maxy) {
        y = maxy - rect.height - 1;
      }

      if (x + rect.width > maxx) {
        x = maxx - rect.width - 1;
      }
    }

    super.float(x, y, 50);
  }

  click() {
    if (this._was_clicked) {
      return;
    }

    if (this.ignoreFirstClick) {
      this.ignoreFirstClick = Math.max(this.ignoreFirstClick - 1, 0);
      return;
    }

    if (!this.activeItem || this.activeItem._isMenu) {
      return;
    }

    this._was_clicked = true;

    if (this.onselect) {
      try {
        this.onselect(this.activeItem._id);
      } catch (error) {
        util.print_stack(error);
        console.log("Error in menu callback");
      }
    }

    this.close();
  }

  _ondestroy() {
    if (this.started) {
      menuWrangler.popMenu(this);

      if (this.onclose) {
        this.onclose();
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

    if (this.onclose) {
      this.onclose(this);
    }
  }

  _select(dir, focus = true) {
    if (this.activeItem === undefined) {
      for (let item of this.items) {
        if (!item.hidden) {
          this.setActive(item, focus);
          break;
        }
      }
    } else {
      let i = this.items.indexOf(this.activeItem);
      let item = this.activeItem;

      do {
        i = (i + dir + this.items.length)%this.items.length;
        item = this.items[i];

        if (!item.hidden) {
          break;
        }
      } while (item !== this.activeItem);

      this.setActive(item, focus);
    }

    if (this.hasSearchBox) {
      this.activeItem.scrollIntoView();
    }
  }

  selectPrev(focus = true) {
    return this._select(-1, focus);
  }

  selectNext(focus = true) {
    return this._select(1, focus);
  }

  start_fancy(prepend, setActive = true) {
    return this.startFancy(prepend, setActive);
  }

  setActive(item, focus = true) {
    if (this.activeItem === item) {
      return;
    }

    if (this.activeItem) {
      this.activeItem.style["background-color"] = this.getDefault("MenuBG");

      if (focus) {
        this.activeItem.blur();
      }
    }

    if (item) {
      item.style["background-color"] = this.getDefault("MenuHighlight");

      if (focus) {
        item.focus();
      }
    }

    this.activeItem = item;
  }

  startFancy(prepend, setActive = true) {
    this.hasSearchBox = true;
    this.started = true;
    menuWrangler.pushMenu(this);

    let dom2 = document.createElement("div");
    //let dom2 = document.createElement("div");

    this.dom.setAttribute("class", "menu");
    dom2.setAttribute("class", "menu");

    let sbox = this.textbox = UIBase.createElement("textbox-x");
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

    dom2.parentWidget = this.container;

    sbox.focus();
    sbox.onchange = () => {
      let t = sbox.text.trim().toLowerCase();

      for (let item of this.items) {
        item.hidden = true;
        item.remove();
      }

      for (let item of this.items) {
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
    }

    sbox.addEventListener("keydown", (e) => {
      switch (e.keyCode) {
        case 27: //escape key
          this.close();
          break;
        case 13: //enter key
          this.click(this.activeItem);
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

    let dokey = (key) => {
      let val = this.getDefault(key);
      if (typeof val === "number") {
        val = "" + val + "px";
      }

      if (val !== undefined) {
        this.dom.style[key] = val;
      }
    }

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

    if (!setActive)
      return;

    this.setCSS();
    this.flushUpdate();

    window.setTimeout(() => {
      this.flushUpdate();

      //select first child
      //TODO: cache last child entry

      if (this.activeItem === undefined) {
        this.activeItem = this.dom.childNodes[0];
      }

      if (this.activeItem === undefined) {
        return;
      }

      this.activeItem.focus();
    }, 0);
  }

  addItemExtra(text, id = undefined, hotkey, icon = -1, add = true, tooltip = undefined) {
    let dom = document.createElement("span");

    dom.style["display"] = "inline-flex";

    dom.hotkey = hotkey;
    dom.icon = icon;

    let icon_div;

    if (1) { //icon >= 0) {
      icon_div = ui_base.makeIconDiv(icon, IconSheets.SMALL);
    } else {
      let tilesize = ui_base.iconmanager.getTileSize(IconSheets.SMALL);

      //tilesize *= window.devicePixelRatio;

      icon_div = document.createElement("span");
      icon_div.style["padding"] = icon_div.style["margin"] = "0px";
      icon_div.style["width"] = tilesize + "px";
      icon_div.style["height"] = tilesize + "px";
    }

    icon_div.style["display"] = "inline-flex";
    icon_div.style["margin-right"] = "1px";
    icon_div.style["align"] = "left";

    let span = document.createElement("span");

    //stupid css doesn't get width right. . .
    span.style["font"] = ui_base.getFont(this, undefined, "MenuText");

    let dpi = this.getDPI();
    let tsize = this.getDefault("MenuText").size;
    //XXX proportional font fail

    //XXX stupid!
    let canvas = document.createElement("canvas");
    let g = canvas.getContext("2d");

    g.font = span.style["font"];

    let rect = span.getClientRects();

    let twid = Math.ceil(g.measureText(text).width);
    let hwid;
    if (hotkey) {
      dom.hotkey = hotkey;
      g.font = ui_base.getFont(this, undefined, "HotkeyText");
      hwid = Math.ceil(g.measureText(hotkey).width/UIBase.getDPI());
      twid += hwid + 8;
    }

    //let twid = Math.ceil(text.trim().length * tsize / dpi);

    span.innerText = text;

    span.style["word-wrap"] = "none";
    span.style["white-space"] = "pre";
    span.style["overflow"] = "hidden";
    span.style["text-overflow"] = "clip";

    span.style["width"] = ~~(twid) + "px";
    span.style["padding"] = "0px";
    span.style["margin"] = "0px";

    dom.style["width"] = "100%";

    dom.appendChild(icon_div);
    dom.appendChild(span);

    if (hotkey) {
      let hotkey_span = document.createElement("span");
      hotkey_span.innerText = hotkey;
      hotkey_span.style["display"] = "inline-flex";

      hotkey_span.style["margin"] = "0px";
      hotkey_span.style["margin-left"] = "auto";
      hotkey_span.style["margin-right"] = "0px";
      hotkey_span.style["padding"] = "0px";

      hotkey_span.style["font"] = ui_base.getFont(this, undefined, "HotkeyText");
      hotkey_span.style["color"] = this.getDefault("HotkeyTextColor");

      //hotkey_span.style["width"] = ~~((hwid + 7)) + "px";
      hotkey_span.style["width"] = "max-content";

      //hotkey_span.style["background-color"] = "rgba(0,0,0,0)";

      hotkey_span.style["text-align"] = "right";
      hotkey_span.style["justify-content"] = "right";
      hotkey_span["flex-wrap"] = "nowrap";
      hotkey_span["text-wrap"] = "nowrap";

      //hotkey_span.style["border"] = "1px solid red";

      //hotkey_span.style["display"] = "inline";
      //hotkey_span.style["float"] = "right";

      dom.appendChild(hotkey_span);
    }

    let ret = this.addItem(dom, id, add);

    ret.hotkey = hotkey;
    ret.icon = icon;
    ret.label = text ? text : ret.innerText;

    if (tooltip) {
      ret.title = tooltip;
    }

    return ret;
  }

  //item can be menu or text
  addItem(item, id, add = true, tooltip = undefined) {
    id = id === undefined ? item : id;
    let text = item;

    if (typeof item === "string" || item instanceof String) {
      let dom = document.createElement("dom");
      dom.style["text-align"] = "left";

      dom.textContent = item;
      item = dom;
      //return this.addItemExtra(item, id);
    } else {
      text = item.textContent;
    }

    let li = document.createElement("li");

    li.setAttribute("tabindex", this.itemindex++);
    li.setAttribute("class", "menuitem");

    if (tooltip !== undefined) {
      li.title = tooltip;
    }

    if (item instanceof Menu) {
      //let dom = this.addItemExtra(""+item.title, id, "", -1, false);
      let dom = document.createElement("span");
      dom.innerHTML = "" + item.title;
      dom._id = dom.id = id;
      dom.setAttribute("class", "menu")

      //dom = document.createElement("div");
      //dom.innerText = ""+item.title;

      //dom.style["display"] = "inline-block";
      li.style["width"] = "100%"
      li.appendChild(dom);

      li._isMenu = true;
      li._menu = item;
      item.parentMenu = this;

      item.hidden = false;
      item.container = this.container;
    } else {
      li._isMenu = false;
      li.appendChild(item);
    }

    li._id = id;

    this.items.push(li);

    li.label = text ? text : li.innerText.trim();

    if (add) {
      li.addEventListener("blur", (e) => {
        if (this._ignoreFocusEvents) {
          return;
        }

        if (this.activeItem && !this.activeItem._isMenu) {
          this.setActive(undefined, false);
        }
      });

      let onfocus = (e) => {
        if (this._ignoreFocusEvents) {
          return;
        }

        let active = this.activeItem;

        if (this._submenu) {
          this._submenu.close();
          this._submenu = undefined;
        }

        if (li._isMenu) {
          li._menu.onselect = (item) => {
            this.onselect(item);
            li._menu.close();
            this.close();
          };

          li._menu.start(false, false);
          this._submenu = li._menu;
        }

        this.setActive(li, false);
      };

      let onclick = (e) => {
        onfocus(e);

        e.stopPropagation();
        e.preventDefault();

        if (this.activeItem !== undefined && this.activeItem._isMenu) {
          //ignore
          return;
        }

        this.click();
      }

      li.addEventListener("contextmenu", e => e.preventDefault());
      this.addEventListener("contextmenu", e => e.preventDefault());

      li.addEventListener("pointerup", onclick, {capture: true});
      li.addEventListener("click", onclick, {capture: true});
      li.addEventListener("pointerdown", onclick, {capture: true});

      li.addEventListener("focus", (e) => {
        onfocus(e);
        onfocus(e);
      })

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
    let r = this.getDefault("border-width");
    let s = this.getDefault("border-style");
    let c = this.getDefault("border-color");

    return `${r}px ${s} ${c}`;
  }

  buildStyle() {
    let pad1 = util.isMobile() ? 2 : 0;
    pad1 += this.getDefault("MenuSpacing");

    let boxShadow = "";
    if (this.hasDefault("box-shadow")) {
      boxShadow = "box-shadow: " + this.getDefault("box-shadow") + ';';
    }

    let sepcss = this.getDefault("MenuSeparator");
    if (typeof sepcss === "object") {
      let s = '';

      for (let k in sepcss) {
        let v = sepcss[k];

        if (typeof v === "number") {
          v = v.toFixed(4) + "px";
        }

        s += `    ${k}: ${v};\n`;
      }

      sepcss = s;
    }

    let itemRadius = 0;

    if (this.hasDefault("item-radius")) {
      itemRadius = this.getDefault("item-radius");
    } else {
      itemRadius = this.getDefault("border-radius");
    }

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
          color : ${this.getDefault("MenuText").color};
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
          
          color : ${this.getDefault("MenuText").color};
          font : ${this.getDefault("MenuText").genCSS()};
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
          color : ${this.getDefault("MenuText").color};
          -moz-user-focus: normal;
        }
      `;
  }

  setCSS() {
    super.setCSS();

    this.buildStyle();

    this.container.style["color"] = this.getDefault("MenuText").color;
    this.style["color"] = this.getDefault("MenuText").color;
  }

  seperator() {
    let bar = document.createElement("div");
    bar.setAttribute("class", "menuseparator");

    this.dom.appendChild(bar);

    return this;
  }

  menu(title) {
    let ret = UIBase.createElement("menu-x");

    ret.setAttribute("name", title);
    this.addItem(ret);

    return ret;
  }

  calcSize() {

  }
}

Menu.SEP = Symbol("menu seperator");
UIBase.internalRegister(Menu);

export class DropBox extends OldButton {
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
    //this.prop = new ui_base.EnumProperty(undefined, {}, "", "", 0);

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
      style  : "dropbox"
    };
  }

  init() {
    super.init();

    this.setAttribute("menu-button", "true");

    this.updateWidth();
  }

  setCSS() {
    //do not call parent classes's setCSS here

    this.style["user-select"] = "none";
    this.dom.style["user-select"] = "none";

    let keys;
    if (this.getAttribute("simple")) {
      keys = ["margin-left", "margin-right", "padding-left", "padding-right"];
    } else {
      keys = [
        "margin", "margin-left", "margin-right",
        "margin-top", "margin-bottom", "padding",
        "padding-left", "padding-right", "padding-top",
        "padding-bottom"];
    }

    let setDefault = (key) => {
      if (this.hasDefault(key)) {
        this.dom.style[key] = this.getDefault(key, undefined, 0) + "px";
      }
    }

    for (let k of keys) {
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
    let dpi = this.getDPI();

    let ts = this.getDefault("DefaultText").size;
    let tw = this.g.measureText(this._genLabel()).width/dpi;
    //let tw = ui_base.measureText(this, this._genLabel(), undefined, undefined, ts).width + 8;
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

  updateDataPath() {
    if (!this.ctx || !this.hasAttribute("datapath")) {
      return;
    }

    let wasError = false;
    let prop, val;

    try {
      this.pushReportContext(this._reportCtxName);
      prop = this.ctx.api.resolvePath(this.ctx, this.getAttribute("datapath")).prop;
      val = this.ctx.api.getValue(this.ctx, this.getAttribute("datapath"));

      prop = prop && prop.prop ? prop.prop : prop;

      this.popReportContext();
    } catch (error) {
      util.print_stack(error);
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

    let name = this.getAttribute("name");
    
    if (prop.type & (PropTypes.ENUM | PropTypes.FLAG)) {
      name = prop.ui_value_names[prop.keys[val]];
    } else {
      name = "" + val;
    }

    if (name !== this.getAttribute("name")) {
      this.setAttribute("name", name);
      this.updateName();
    }
  }

  update() {
    let path = this.getAttribute("datapath");

    if (path && path !== this._last_datapath) {
      this._last_datapath = path;
      this.prop = undefined;

      this.updateDataPath();
    }

    super.update();

    let key = this.getDefault("dropTextBG");
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
    if (this._menu !== undefined && this._menu.parentNode !== undefined) {
      this._menu.remove();
    }

    //let name = "" + this.getAttribute("name");
    let template = this._template;

    if (typeof template === "function") {
      template = template();
    }

    this._menu = createMenu(this.ctx, "", template);
    return this._menu;
  }

  _build_menu() {
    if (this._template) {
      this._build_menu_template();
      return;
    }

    let prop = this.prop;

    if (this.prop === undefined) {
      return;
    }

    if (this._menu !== undefined && this._menu.parentNode !== undefined) {
      this._menu.remove();
    }

    let menu = this._menu = UIBase.createElement("menu-x");

    //let name = "" + this.getAttribute("name");
    menu.setAttribute("name", "");
    menu._dropbox = this;

    let valmap = {};
    let enummap = prop.values;
    let iconmap = prop.iconmap;
    let uimap = prop.ui_value_names;
    let desr = prop.descriptions || {};

    for (let k in enummap) {
      let uk = k;

      valmap[enummap[k]] = k;

      if (uimap !== undefined && k in uimap) {
        uk = uimap[k];
      }

      let tooltip = desr[k];

      //menu.addItem(k, enummap[k], ":");
      if (iconmap && iconmap[k]) {
        menu.addItemExtra(uk, enummap[k], undefined, iconmap[k], undefined, tooltip);
      } else {
        menu.addItem(uk, enummap[k], undefined, tooltip);
      }
    }

    menu.onselect = (id) => {
      this._pressed = false;

      this._pressed = false;
      this._redraw();

      this._menu = undefined;

      //check if datapath system will be calling .prop.setValue instead of us
      let callProp = true;
      if (this.hasAttribute("datapath")) {
        let rdef = this.ctx.api.resolvePath(this.ctx, this.getAttribute("datapath"));
        let prop = rdef.dpath.data;

        callProp = !rdef || !rdef.dpath || !(rdef.dpath.data instanceof ToolProperty);
      }

      this._value = this._convertVal(id);

      if (callProp) {
        this.prop.setValue(id);
      }

      this.setAttribute("name", this.prop.ui_value_names[valmap[id]]);
      if (this.onselect) {
        this.onselect(id);
      }

      if (this.hasAttribute("datapath") && this.ctx) {
        this.setPathValue(this.ctx, this.getAttribute("datapath"), id);
      }
    };
  }

  _onpress(e) {
    this.abortToolTips(1000);

    if (this._menu !== undefined) {
      this.lockTimer = util.time_ms();

      this._pressed = false;
      this._redraw();

      let menu = this._menu;
      this._menu = undefined;
      menu.close();
      return;
    }

    if (util.time_ms() - this.lockTimer < 200) {
      return;
    }

    this._build_menu();

    if (this._menu === undefined) {
      return;
    }

    this._menu.autoSearchMode = false;

    this._menu._dropbox = this;
    this.dom._background = this.getDefault("BoxDepressed");
    this._background = this.getDefault("BoxDepressed");
    this._redraw();
    this._pressed = true;
    this.setCSS();

    let onclose = this._menu.onclose;
    this._menu.onclose = () => {
      this.lockTimer = util.time_ms();

      this._pressed = false;
      this._redraw();

      let menu = this._menu;
      if (menu) {
        this._menu = undefined;
        menu._dropbox = undefined;
      }

      if (onclose) {
        onclose.call(menu);
      }
    }

    let menu = this._menu;
    let screen = this.getScreen();

    let dpi = this.getDPI();

    let x = e.x, y = e.y;
    let rects = this.dom.getBoundingClientRect(); //getClientRects();

    let rheight = rects.height;
    x = rects.x - window.scrollX;
    y = rects.y + rheight - window.scrollY; // + rects[0].height; // visualViewport.scale;

    if (!window.haveElectron) {
      //y -= 8;
    }

    /* need to figure out a better way to pop up a menu
    *  above a given y position */
    if (cconst.menusCanPopupAbove && y > screen.size[1]*0.5 && !this.searchMenuMode) {
      let con = screen.popup(this, 500, 400, false, 0);

      con.style["z-index"] = "-10000";
      con.style["position"] = UIBase.PositionKey;
      document.body.appendChild(con);

      con.style["visibility"] = "hidden";

      con.add(menu);
      menu.start();

      let time = util.time_ms();

      let timer = window.setInterval(() => {
        if (util.time_ms() - time > 1500) {
          window.clearInterval(timer);
          return;
        }

        let r = menu.dom.getBoundingClientRect();

        if (!r || r.height < 55) {
          return;
        }

        window.clearInterval(timer);

        y -= r.height + rheight;

        menu.dom.remove();
        con.remove();

        let popup = this._popup = menu._popup = screen.popup(this, x, y, false, 0);
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

    /*
    let w = document.createElement("div");
    w.style["width"] = w.style["height"] = "15px";
    w.style["background-color"] = "red";
    w.style["z-index"] = "5000";
    w.style["position"] = UIBase.PositionKey;
    w.style["pointer-events"] = "none";
    w.style["left"] = x + "px";
    w.style["top"] = y + "px";

    document.body.appendChild(w);
    //*/

    let con = this._popup = menu._popup = screen.popup(this, x, y, false, 0);
    con.noMarginsOrPadding();

    con.add(menu);
    if (this.searchMenuMode) {
      menu.startFancy();
    } else {
      menu.start();
    }
  }

  _redraw() {
    if (this.getAttribute("simple")) {
      let color;

      this.g.clearRect(0, 0, this.dom.width, this.dom.height);
      
      if (this._highlight) {
        ui_base.drawRoundBox2(this, {canvas: this.dom, g: this.g, color: this.getDefault("BoxHighlight")});
      }

      if (this._focus) {
        ui_base.drawRoundBox2(this, {
          canvas: this.dom, g: this.g, color: this.getDefault("BoxHighlight"), op: "stroke", no_clear: true
        });
        ui_base.drawRoundBox(this, this.dom, this.g, undefined, undefined, 2, "stroke");
      }

      this._draw_text();
      return;
    }

    super._redraw(false);

    let g = this.g;
    let w = this.dom.width, h = this.dom.height;
    let dpi = this.getDPI();

    let p = 10*dpi;
    let p2 = dpi;

    //*
    let bg = this.getDefault("dropTextBG");
    if (bg !== undefined) {
      g.fillStyle = bg;

      g.beginPath();
      g.rect(p2, p2, this.dom.width - p2 - h, this.dom.height - p2*2);
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

    let sz = 0.3;
    g.moveTo(w - h*0.5 - p, p);
    g.lineTo(w - p, p);
    g.moveTo(w - h*0.5 - p, p + sz*h/3);
    g.lineTo(w - p, p + sz*h/3);
    g.moveTo(w - h*0.5 - p, p + sz*h*2/3);
    g.lineTo(w - p, p + sz*h*2/3);

    g.lineWidth = 1;
    g.stroke();

    this._draw_text();
  }

  _convertVal(val) {
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

  setValue(val, setLabelOnly = false) {
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

      if (val2 in this.prop.keys)
        val2 = this.prop.keys[val2];
      val2 = this.prop.ui_value_names[val2];

      this.setAttribute("name", "" + val2);
      this._name = "" + val2;
    } else {
      this.setAttribute("name", "" + val);
      this._name = "" + val;
    }

    if (this.onchange && !setLabelOnly) {
      this.onchange(val);
    }

    this.setCSS();
    this.updateDataPath();
    this._redraw();
  }
}

UIBase.internalRegister(DropBox);

export class MenuWrangler {
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

  pushMenu(menu) {
    debugmenu("pushMenu");

    this.spawnreq = undefined;

    if (this.menustack.length === 0 && menu.closeOnMouseUp) {
      this.closeOnMouseUp = true;
    }

    this.menustack.push(menu);
  }

  popMenu(menu) {
    debugmenu("popMenu");

    return this.menustack.pop();
  }

  endMenus() {
    debugmenu("endMenus");

    for (let menu of this.menustack) {
      menu.close();
    }

    this.menustack = [];
  }

  searchKeyDown(e) {
    let menu = this.menu;

    e.stopPropagation();
    menu._ignoreFocusEvents = true;
    menu.textbox.focus();
    menu._ignoreFocusEvents = false;

    //if (e.shiftKey || e.altKey || e.ctrlKey || e.commandKey) {
    //  return;
    //}

    switch (e.keyCode) {
      case keymap["Enter"]: //return key
        menu.click(menu.activeItem);
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

  on_keydown(e) {
    window.menu = this.menu;

    if (this.menu === undefined) {
      return;
    }

    if (this.menu.hasSearchBox) {
      return this.searchKeyDown(e);
    }

    let menu = this.menu;

    switch (e.keyCode) {
      case keymap["Left"]: //left
      case keymap["Right"]: //right
        if (menu._dropbox) {
          let dropbox = menu._dropbox;

          if (e.keyCode === keymap["Left"]) {
            dropbox = dropbox.previousElementSibling;
          } else {
            dropbox = dropbox.nextElementSibling;
          }

          if (dropbox !== undefined && dropbox instanceof DropBox) {
            this.endMenus();
            dropbox._onpress(e);
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
        menu.click(menu.activeItem);
        break;
      case 27: //escape key
        menu.close();
        break;
    }
  }

  on_pointerdown(e) {
    if (this.menu === undefined || this.screen === undefined) {
      this.closetimer = util.time_ms();
      return;
    }

    let screen = this.screen;
    let x = e.pageX, y = e.pageY;

    let element = screen.pickElement(x, y);

    if (element !== undefined && (element instanceof DropBox || util.isMobile())) {
      this.endMenus();
      e.preventDefault();
      e.stopPropagation();
    }
  }

  on_pointerup(e) {
    if (this.menu === undefined || this.screen === undefined) {
      this.closetimer = util.time_ms();
      return;
    }

    let screen = this.screen;
    let x = e.pageX, y = e.pageY;

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

  findMenu(x, y) {
    let screen = this.screen;

    let element = screen.pickElement(x, y);

    if (element === undefined) {
      return;
    }

    if (element instanceof Menu) {
      return element;
    }

    let w = element;

    while (w) {
      if (w instanceof Menu) {//w === this.menu) {
        return w;
        break;
      }

      w = w.parentWidget;
    }

    return undefined;
  }

  on_pointermove(e) {
    if (this.menu && this.menu.hasSearchBox) {
      this.closetimer = util.time_ms();
      this.closereq = undefined;
      return;
    }

    if (this.menu === undefined || this.screen === undefined) {
      this.closetimer = util.time_ms();
      this.closereq = undefined;
      return;
    }

    let screen = this.screen;
    let x = e.pageX, y = e.pageY;

    let element;
    let menu = this.menu;

    if (menu) {
      let r = menu.getBoundingClientRect();
      let pad = 15;

      if (r && x >= r.x - pad && y >= r.y - pad && x <= r.x + r.width + pad*2 && y <= r.y + r.height + pad*2) {
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
    
    let destroy = element.hasAttribute("menu-button") && element.hasAttribute("simple");
    destroy = destroy && element.menu !== this.menu;

    if (destroy) {
      /* check that dropbox doesn't contain our parent menu either */

      let menu2 = this.menu;
      while (menu2 !== element.menu) {
        menu2 = menu2.parentMenu;
        destroy = destroy && (menu2 === undefined || menu2 !== element.menu);
      }
    }

    if (destroy) {
      //destroy entire menu stack
      this.endMenus();

      this.closetimer = util.time_ms();
      this.closereq = undefined;

      //start new menu
      element._onpress(e);
      return;
    }

    let ok = false;

    let w = element;
    while (w) {
      if (w instanceof Menu) {//w === this.menu) {
        ok = true;
        break;
      }

      if (w.hasAttribute("menu-button") && w.menu === this.menu) {
        ok = true;
        break;
      }

      w = w.parentWidget;
    }

    if (!ok) {
      this.closereq = this.menu;
    } else {
      this.closetimer = util.time_ms();
      this.closereq = undefined;
    }
  }

  update() {
    let closetime = cconst.menu_close_time;
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

export let menuWrangler = window._menuWrangler = new MenuWrangler();
let wrangerStarted = false;

export function startMenuEventWrangling(screen) {
  menuWrangler.screen = screen;

  if (wrangerStarted) {
    return;
  }

  wrangerStarted = true;

  for (let k in DomEventTypes) {
    if (menuWrangler[k] === undefined) {
      continue;
    }

    let dom = k.search("key") >= 0 ? window : document.body;
    dom = window;
    dom.addEventListener(DomEventTypes[k], menuWrangler[k].bind(menuWrangler), {passive: false, capture: true})
  }

  menuWrangler.screen = screen;
  menuWrangler.startTimer();
}

window._startMenuEventWrangling = startMenuEventWrangling;

export function setWranglerScreen(screen) {
  startMenuEventWrangling(screen);
}

export function getWranglerScreen() {
  return menuWrangler.screen;
}

export function createMenu(ctx, title, templ) {
  let menu = UIBase.createElement("menu-x");
  menu.ctx = ctx;
  menu.setAttribute("name", title);

  let SEP = menu.constructor.SEP;
  let id = 0;
  let cbs = {};

  let doItem = (item) => {
    if (item !== undefined && item instanceof Menu) {
      menu.addItem(item);
    } else if (typeof item == "string") {
      let def, hotkey;

      try {
        def = ctx.api.getToolDef(item);
      } catch (error) {
        menu.addItem("(tool path error)", id++);
        return;
      }

      //3Extra(text, id=undefined, hotkey, icon=-1, add=true) {
      if (!def.hotkey) {
        try {
          hotkey = ctx.api.getToolPathHotkey(ctx, item);
        } catch (error) {
          util.print_stack(error);
          console.warn("error getting hotkey for tool " + item);
          hotkey = undefined;
        }
      } else {
        hotkey = def.hotkey;
      }

      menu.addItemExtra(def.uiname, id, hotkey, def.icon);

      cbs[id] = (function (toolpath) {
        return function () {
          ctx.api.execTool(ctx, toolpath);
        }
      })(item);

      id++;
    } else if (item === SEP) {
      menu.seperator();
    } else if (typeof item === "function" || item instanceof Function) {
      doItem(item());
    } else if (item instanceof Array) { //old array-based api for custom entries
      let hotkey = item.length > 2 ? item[2] : undefined;
      let icon = item.length > 3 ? item[3] : undefined;
      let tooltip = item.length > 4 ? item[4] : undefined;
      let id2 = item.length > 5 ? item[5] : id++;

      if (hotkey !== undefined && hotkey instanceof HotKey) {
        hotkey = hotkey.buildString();
      }

      menu.addItemExtra(item[0], id2, hotkey, icon, undefined, tooltip);

      cbs[id2] = (function (cbfunc, arg) {
        return function () {
          cbfunc(arg);
        }
      })(item[1], id2);
    } else if (typeof item === "object") { //new object-based api for custom entries
      let {name, callback, hotkey, icon, tooltip} = item;

      let id2 = item.id !== undefined ? item.id : id++;
      if (hotkey !== undefined && hotkey instanceof HotKey) {
        hotkey = hotkey.buildString();
      }

      menu.addItemExtra(name, id2, hotkey, icon, undefined, tooltip);

      cbs[id2] = (function (cbfunc, arg) {
        return function () {
          cbfunc(arg);
        }
      })(callback, id2);
    }
  }

  for (let item of templ) {
    doItem(item);
  }

  menu.onselect = (id) => {
    cbs[id]();
  }

  return menu;
}

export function startMenu(menu, x, y, searchMenuMode = false, safetyDelay = 55) {
  menuWrangler.endMenus();

  let screen = menu.ctx.screen;
  let con = menu._popup = screen.popup(undefined, x, y, false, safetyDelay);
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
