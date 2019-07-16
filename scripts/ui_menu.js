"use strict";

import * as util from './util.js';
import * as vectormath from './vectormath.js';
import * as ui_base from './ui_base.js';
import * as events from './events.js';
import * as simple_toolsys from './simple_toolsys.js';
import * as toolprop from './toolprop.js';
import {Button} from "./ui_widgets.js";

let EnumProperty = toolprop.EnumProperty,
  PropTypes = toolprop.PropTypes;

let UIBase = ui_base.UIBase,
  PackFlags = ui_base.PackFlags,
  IconSheets = ui_base.IconSheets;

function getpx(css) {
  return parseFloat(css.trim().replace("px", ""))
}

export class Menu extends UIBase {
  constructor() {
    super();

    this.items = [];

    this.itemindex = 0;
    this.closed = false;
    this.activeItem = undefined;

    //we have to make a container for any submenus to
    this.container = document.createElement("span");

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
    let style = document.createElement("style");
    style.textContent = `
        .menucon {
          position:absolute;
          float:left;
          
          display: block;
          -moz-user-focus: normal;
        }
        
        ul.menu {
          display : block;
          
          margin : 0px;
          padding : 0px;
          border-style : solid;
          border-width : 1px;
          border-color: grey;
          -moz-user-focus: normal;
          background-color: ${this.getDefault("MenuBG")};
        }
        
        .menuitem {
          display : block;
          
          list-style-type:none;
          -moz-user-focus: normal;
          
          margin : 0;
          padding : 0px;
          padding-right: 2px;
          padding-left: 4px;
          padding-top : 0px;
          padding-bottom : 0px;
          font : ${ui_base._getFont()};
          background-color: ${this.getDefault("MenuBG")};
        }
        
        .menuitem:focus {
          background-color: rgba(155, 220, 255, 1.0);
          -moz-user-focus: normal;
        }
      `;

    this.dom.setAttribute("tabindex", -1);

    this.dom.addEventListener("keydown", (e) => {
      console.log("key", e.keyCode);

      switch (e.keyCode) {
        case 38: //up
        case 40: //down
          let item = this.activeItem;
          if (!item) {
            item = this.dom.childNodes[0];
          }
          if (!item) {
            return;
          }

          console.log(item);
          let item2;

          if (e.keyCode == 38) {
            item2 = item.previousElementSibling;
          } else {
            item2 = item.nextElementSibling;
          }
          console.log("item2:", item2);

          if (item2) {
            this.activeItem = item2;

            item.blur();
            item2.focus();
          }
          break;
        case 13: //return key
        case 32: //space key
          this.click(this.activeItem);
        case 27: //escape key
          this.close();
      }
    }, false);

    this.container.addEventListener("mouseleave", (e) => {
      console.log("menu out");
      this.close();
    }, false);

    //this.container.appendChild(this.dom);

    this.shadow.appendChild(style);
    this.shadow.appendChild(this.container);
  }

  float(x, y, zindex=undefined) {
    console.log("menu test!");

    let dpi = ui_base.UIBase.getDPI();
    let rect = this.dom.getClientRects();
    let maxx = this.getWinWidth()-10;
    let maxy = this.getWinHeight()-10;

    console.log(rect.length > 0 ? rect[0] : undefined)

    if (rect.length > 0) {
      rect = rect[0];
      console.log(y + rect.height);
      if (y + rect.height > maxy) {
        console.log("greater");
        y = maxy - rect.height - 1;
      }

      if (x + rect.width > maxx) {
        console.log("greater");
        x = maxx - rect.width - 1;
      }
    }

    super.float(x, y, 50);
  }

  click() {
    if (this.activeItem == undefined)
      return;

    if (this.activeItem !== undefined && this.activeItem._isMenu)
    //ignore
      return;

    if (this.onselect) {
      try {
        console.log(this.activeItem._id, "-----");
        this.onselect(this.activeItem._id);
      } catch (error) {
        util.print_stack(error);
        console.log("Error in menu callback");
      }
    }

    console.log("menu select");
    this.close();
  }

  close() {
    //XXX
    //return;

    this.closed = true;
    console.log("menu close");

    this.remove();
    this.dom.remove();

    if (this.onclose) {
      this.onclose(this);
    }
  }

  static define() {return {
    tagname : "menu-x"
  };}

  start_fancy(prepend, setActive=true) {
    console.log("menu fancy start");

    let dom2 = document.createElement("div");
    //let dom2 = document.createElement("div");

    this.dom.setAttribute("class", "menu");
    dom2.setAttribute("class", "menu");

    let sbox = document.createElement("textbox-x");

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

    sbox.focus();
    sbox.onchange = () => {
      let t = sbox.text.trim().toLowerCase();

      console.log("applying search", t);

      for (let item of this.items) {
        item.remove();
      }

      for (let item of this.items) {
        let ok = t == "";
        ok = ok || item.innerHTML.toLowerCase().search(t) >= 0;

        if (ok) {
          this.dom.appendChild(item);
        }
        //item.hidden = !ok;
      }
    }

    sbox.addEventListener("keydown", (e) => {
      console.log(e.keyCode);
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

    if (!setActive)
      return;
  }

  start(prepend, setActive=true) {
    this.focus();

    if (this.items.length > 10) {
      return this.start_fancy(prepend, setActive);
    }

    console.log("menu start");

    if (prepend) {
      this.container.prepend(this.dom);
    } else {
      this.container.appendChild(this.dom);
    }

    if (!setActive)
      return;

    window.setTimeout(() => {
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

  addItemExtra(text, id=undefined, hotkey, icon=-1, add=true) {
    let dom = document.createElement("span");

    dom.style["display"] = "inline-flex";

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
    span.style["font"] = ui_base._getFont(undefined, "MenuText");

    let dpi = UIBase.getDPI();
    let tsize = this.getDefault("MenuTextSize");
    //XXX proportional font fail

    //XXX stupid!
    let canvas = document.createElement("canvas");
    let g = canvas.getContext("2d");
    g.font = span.style["font"];
    console.log(g.font);
    let rect = span.getClientRects();
    console.log(g.measureText(text));

    let twid = Math.ceil(g.measureText(text).width);
    let hwid;
    if (hotkey) {
      g.font = ui_base._getFont(undefined, "HotkeyText");
      hwid = Math.ceil(g.measureText(hotkey).width);
      twid += hwid + 8;
    }

    console.log("TWID", twid);
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
      hotkey_span.style["margin-left"] = "0px";
      hotkey_span.style["margin-right"] = "0px";
      hotkey_span.style["margin"] = "0px";
      hotkey_span.style["padding"] = "0px";

      let al = "right";

      hotkey_span.style["font"] = ui_base._getFont(undefined, "HotkeyText");
      hotkey_span.style["color"] = this.getDefault("HotkeyTextColor");

      //hotkey_span.style["width"] = ~~((hwid + 7)) + "px";
      hotkey_span.style["width"] = "100%";

      hotkey_span.style["text-align"] = al;
      hotkey_span.style["flex-align"] = al;
      //hotkey_span.style["display"] = "inline";
      hotkey_span.style["float"] = "right";
      hotkey_span["flex-wrap"] = "nowrap";

      dom.appendChild(hotkey_span);
    }

    return this.addItem(dom, id, add);
  }

  //item can be menu or text
  addItem(item, id, add=true) {
    id = id === undefined ? item : id;

    if (typeof item == "string" || item instanceof String) {
      let dom = document.createElement("dom");
      dom.textContent = item;
      item = dom;
      //return this.addItemExtra(item, id);
    }

    let li = document.createElement("li");

    li.setAttribute("tabindex", this.itemindex++);
    li.setAttribute("class", "menuitem");

    li.style["margin-top"] = "10px";

    if (item instanceof Menu) {
      console.log("submenu!");

      let dom = this.addItemExtra(""+item.title, id, "", -1, false);

      //dom = document.createElement("div");
      //dom.innerText = ""+item.title;

      //dom.style["display"] = "inline-block";
      li.style["width"] = "100%"
      li.appendChild(dom);

      li._isMenu = true;
      li._menu = item;

      item.hidden = false;
      item.container = this.container;
    } else {
      li._isMenu = false;
      li.appendChild(item);
    }

    li._id = id;
    this.items.push(li);

    if (add) {
      li.addEventListener("click", (e) => {
        //console.log("menu click!");

        if (this.activeItem !== undefined && this.activeItem._isMenu) {
          console.log("menu ignore");
          //ignore
          return;
        }

        this.click();
      });

      li.addEventListener("blur", (e) => {
        //console.log("blur", li.getAttribute("tabindex"));
        if (this.activeItem && !this.activeItem._isMenu) {
          this.activeItem = undefined;
        }
      });

      li.addEventListener("focus", (e) => {
        if (this.activeItem !== undefined && this.activeItem._isMenu) {
          let active = this.activeItem;

          window.setTimeout(() => {
            if (this.activeItem && this.activeItem !== active) {
              active._menu.close();
            }
          }, 500);
        }
        if (li._isMenu) {
          li._menu.start(false, false);
        }

        this.activeItem = li;
      })

      li.addEventListener("mouseenter", (e) => {
        //console.log("mouse over");
        li.focus();
      });

      this.dom.appendChild(li);
    }

    return li;
  }

  seperator() {
    let li = document.createElement("li");
    let span = document.createElement("hr");

    //span.textContent = "--"
    //span.style["textcolor"] = span.style["color"] = "grey";

    li.setAttribute("class", "menuitem");
    li.appendChild(span);

    this.dom.appendChild(li);

    return this;
  }

  menu(title) {
    let ret = document.createElement("menu-x");

    ret.setAttribute("title", title);
    this.addItem(ret);

    return ret;
  }

  calcSize() {

  }
}

Menu.SEP = Symbol("menu seperator");
UIBase.register(Menu);

export class DropBox extends Button {
  constructor() {
    super();

    this.r = 5;
    this._menu = undefined;
    //this.prop = new ui_base.EnumProperty(undefined, {}, "", "", 0);

    this._onpress = this._onpress.bind(this);
    this.updateWidth();
  }

  updateWidth() {
    //let ret = super.updateWidth(10);
    let dpi = UIBase.getDPI();

    let ts = this.getDefault("DefaultTextSize");
    let tw = ui_base.measureText(this._genLabel(), this.dom, this.g).width/dpi + ts*2;
    tw = ~~tw;

    tw += 30;

    if (tw != this._last_w) {
      this._last_w = tw;
      this.dom.style["width"] = tw + "px";
      this._repos_canvas();
      this._redraw();
    }

    return 0;
  }


  updateDataPath() {
    if (!this.ctx || !this.hasAttribute("datapath")) {
      return;
    }

    let prop = this.getPathMeta(this.ctx, this.getAttribute("datapath"));
    let val = this.getPathValue(this.ctx, this.getAttribute("datapath"));

    if (val === undefined) {
      this.disabled = true;
      return;
    } else {
      this.disabled = false;
    }

    if (this.prop !== undefined) {
      prop = this.prop;
    }

    let name = prop.ui_value_names[prop.keys[val]];
    if (name != this.getAttribute("name")) {
      this.setAttribute("name", name);
      this.updateName();
    }

    //console.log(name, val);
  }

  update() {
    super.update();

    if (this.hasAttribute("datapath")) {
      this.updateDataPath();
    }
  }

  _build_menu() {
    let prop = this.prop;

    if (this.prop === undefined) {
      return;
    }

    if (this._menu !== undefined && this._menu.parentNode !== undefined) {
      this._menu.remove();
    }

    let menu = this._menu = document.createElement("menu-x");
    menu.setAttribute("title", name);

    let valmap = {};
    let enummap = prop.values;
    let iconmap = prop.iconmap;
    let uimap = prop.ui_value_names;

    //console.log("   UIMAP", uimap);

    for (let k in enummap) {
      let uk = k;

      valmap[enummap[k]] = k;

      if (uimap !== undefined && k in uimap) {
        uk = uimap[k];
      }

      //menu.addItem(k, enummap[k], ":");
      if (iconmap && iconmap[k]) {
        menu.addItemExtra(uk, enummap[k], undefined, iconmap[k]);
      } else {
        menu.addItem(uk, enummap[k]);
      }
    }

    menu.onclose = () => {
      this._menu = undefined;
    }

    menu.onselect = (id) => {
      //console.trace("got click!", id, ":::");

      this._menu = undefined;
      this.prop.setValue(id);

      this.setAttribute("name", this.prop.ui_value_names[valmap[id]]);
      if (this.onselect !== undefined) {
        this.onselect(id);
      }

      if (this.hasAttribute("datapath") && this.ctx) {
        this.setPathValue(this.ctx, this.getAttribute("datapath"), id);
      }
    };
  }

  _onpress(e) {
    //console.log("menu dropbox click");

    if (this._menu !== undefined) {
      this._menu.close();
      this._menu = undefined;
      return;
    }

    this._build_menu();

    if (this._menu === undefined) {
      return;
    }

    let onclose = this._menu.onclose;

    this._menu.onclose = () => {
      let menu = this._menu;
      this._menu = undefined;

      if (onclose) {
        onclose.call(menu);
      }
    }

    let menu = this._menu;

    document.body.appendChild(menu);
    let dpi = UIBase.getDPI();

    let x = e.x, y = e.y;
    let rects = this.dom.getClientRects();

    console.log(rects[0], Math.ceil(rects[0].height), "::");

    x = rects[0].x;
    y = rects[0].y + Math.ceil(rects[0].height);//dpi + 20*dpi;//Math.ceil(150/dpi);

    menu.start();
    menu.float(x, y, 8);
  }

  _redraw() {
    if (this.getAttribute("simple")) {
      if (this._highlight) {
        ui_base.drawRoundBox(this, this.dom, this.g, undefined, undefined, 2);
      }

      if (this._focus) {
        ui_base.drawRoundBox(this, this.dom, this.g, undefined, undefined, 2, "stroke");
      }

      this._draw_text();
      return;
    }

    super._redraw(false);

    let g = this.g;
    let w = this.dom.width, h = this.dom.height;

    let p = 10*UIBase.getDPI();
    let p2 = 4*UIBase.getDPI();

    g.fillStyle = "rgba(250, 250, 250, 0.7)";
    g.beginPath();
    g.rect(p2, p2, this.dom.width-p2 - h, this.dom.height-p2*2);
    g.fill();

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
    g.moveTo(w-h*0.5-p, p);
    g.lineTo(w-p, p);
    g.moveTo(w-h*0.5-p, p+sz*h/3);
    g.lineTo(w-p, p+sz*h/3);
    g.moveTo(w-h*0.5-p, p+sz*h*2/3);
    g.lineTo(w-p, p+sz*h*2/3);

    g.lineWidth = 1;
    g.stroke();

    this._draw_text();
  }

  set menu(val) {
    this._menu = val;

    if (val !== undefined) {
      this._name = val.title;
      this.updateName();
    }
  }

  get menu() {
    return this._menu;
  }

  static define() {return {
    tagname : "dropbox-x"
  };}
}

UIBase.register(DropBox);

