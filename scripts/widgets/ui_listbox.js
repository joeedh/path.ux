"use strict";

import * as util from '../path-controller/util/util.js';
import * as vectormath from '../path-controller/util/vectormath.js';
import * as ui_base from '../core/ui_base.js';
import * as events from '../path-controller/util/events.js';
import * as simple_toolsys from '../path-controller/toolsys/toolsys.js';
import * as toolprop from '../path-controller/toolsys/toolprop.js';

import {TableFrame} from './ui_table.js';
import {Container, ColumnFrame, RowFrame} from '../core/ui.js';
import {keymap} from '../path-controller/util/events.js';

let EnumProperty = toolprop.EnumProperty,
  PropTypes = toolprop.PropTypes;

let UIBase = ui_base.UIBase,
  PackFlags = ui_base.PackFlags,
  IconSheets = ui_base.IconSheets;

function getpx(css) {
  return parseFloat(css.trim().replace("px", ""))
}

class ListItem extends RowFrame {
  constructor() {
    super();

    let highlight = () => {
      console.log("listitem mouseover");
      this.highlight = true;
      this.setBackground();
    };

    let unhighlight = () => {
      console.log("listitem mouseleave");
      this.highlight = false;
      this.setBackground();
    };

    this.addEventListener("mouseover", highlight);
    this.addEventListener("mousein", highlight);

    this.addEventListener("mouseleave", unhighlight);
    this.addEventListener("mouseout", unhighlight);
    this.addEventListener("blur", unhighlight);

    this.addEventListener("click", (e) => {
      console.log("click!");
      if (this.onclick) {
        this.onclick();
      }
    });

    let style = document.createElement("style");
    style.textContent = `
      .listitem {
        -moz-user-focus: normal;
        moz-user-focus: normal;
        user-focus: normal;
      }
    `;

    this.shadowRoot.prepend(style);
  }

  init() {
    super.init();

    this.setAttribute("class", "listitem");
    this.style["width"] = "100%";
    this.setCSS();
  }

  setBackground() {
    if (this.highlight) {
      this.background = this.getDefault("ListHighlight");
    } else if (this.is_active) {
      this.background = this.getDefault("ListActive");
    } else {
      this.background = this.getDefault("background-color");
    }
  }

  static define() {return {
    tagname : "listitem-x",
    style : "listbox"
  }}
}
UIBase.internalRegister(ListItem);

class ListBox extends Container {
  constructor() {
    super();

    this.items = [];
    this.idmap = {};
    this.items.active = undefined;
    this.highlight = false;
    this.is_active = false;

    let style = document.createElement("style");
    style.textContent = `
      .listbox {
        -moz-user-focus: normal;
        moz-user-focus: normal;
        user-focus: normal;
      }
    `;
    this.shadow.prepend(style);

    this.onkeydown = (e) => {
      console.log("yay", e.keyCode);

      switch (e.keyCode) {
        case keymap["Up"]:
        case keymap["Down"]:
          if (this.items.length == 0)
            return;

          if (this.items.active === undefined) {
            this.setActive(this.items[0]);
            return;
          }

          let i = this.items.indexOf(this.items.active);
          let dir = e.keyCode == keymap["Up"] ? -1 : 1;

          i = Math.max(Math.min(i+dir, this.items.length-1), 0);
          this.setActive(this.items[i]);

          break;
      }
    };

    //this.addEventListener("keydown", on_keydown);

    //this._table =  this.table();
  }

  setCSS() {
    super.setCSS();
  }

  init() {
    super.init();

    this.setCSS();

    this.style["width"] = this.getDefault("width") + "px";
    this.style["height"] = this.getDefault("height") + "px";
    this.style["overflow"] = "scroll";

    //this.setAttribute("class", "listbox");
    //this.setAttribute("tabindex", 0);
    //this.tabIndex = 0;
  }

  addItem(name, id) {
    let item = UIBase.createElement("listitem-x");

    item._id = id === undefined ? this.items.length : id;
    this.idmap[item._id] = item;

    //item.addEventListener("keydown", this.onkeydown);
    this.tabIndex = 1;
    this.setAttribute("tabindex", 1);

    this.add(item);
    this.items.push(item);

    item.label(name);
    let this2 = this;

    item.onclick = function() {
      this2.setActive(this);
      this.setBackground();
    };

    return item;
  }

  removeItem(item) {
    if (typeof item == "number") {
      item = this.idmap[item];
    }

    item.remove();
    delete this.idmap[item._id];
    this.items.remove(item);
  }

  setActive(item) {
    if (typeof item == "number") {
      item = this.idmap[item];
    }

    console.log("set active!");

    if (item === this.items.active) {
      return;
    }

    if (this.items.active !== undefined) {
      this.items.active.highlight = false;
      this.items.active.is_active = false;
      this.items.active.setBackground();
    }

    item.is_active = true;
    this.items.active = item;

    if (item !== undefined) {
      item.setBackground();
      item.scrollIntoViewIfNeeded();
    }

    if (this.onchange) {
      this.onchange(item._id, item);
    }
  }

  clear() {

  }

  static define() {return {
    tagname : "listbox-x",
    style : "listbox"
  }}
}
UIBase.internalRegister(ListBox);
