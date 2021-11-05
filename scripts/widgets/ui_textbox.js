"use strict";

import * as units from '../core/units.js';
import * as util from '../path-controller/util/util.js';
import {Vector2, Vector3, Vector4, Matrix4, Quat} from '../path-controller/util/vectormath.js';
import * as ui_base from '../core/ui_base.js';
import * as events from '../path-controller/util/events.js';
import * as toolprop from '../path-controller/toolsys/toolprop.js';

import cconst from '../config/const.js';

function myToFixed(s, n) {
  s = s.toFixed(n);

  while (s.endsWith('0')) {
    s = s.slice(0, s.length-1);
  }
  if (s.endsWith("\.")) {
    s = s.slice(0, s.length-1);
  }

  return s;
}

let keymap = events.keymap;

let EnumProperty = toolprop.EnumProperty,
    PropTypes = toolprop.PropTypes;

let UIBase = ui_base.UIBase,
    PackFlags = ui_base.PackFlags,
    IconSheets = ui_base.IconSheets;

let parsepx = ui_base.parsepx;

import {Button} from './ui_button.js';

export class TextBoxBase extends UIBase {
  static define() {return {
    modalKeyEvents : true
  }}
}

export class TextBox extends TextBoxBase {
  constructor() {
    super();

    this._width = "min-content";
    this._textBoxEvents = true;

    let margin = Math.ceil(3 * this.getDPI());

    this._had_error = false;

    this.decimalPlaces = undefined; //will inherit from property defaults

    this.baseUnit = undefined; //will automatically use defaults
    this.displayUnit = undefined; //will automatically use defaults

    this.dom = document.createElement("input");

    this.dom.tabIndex = 0;
    this.dom.setAttribute("tabindex", 0);
    this.dom.setAttribute("tab-index", 0);
    this.dom.style["margin"] = margin + "px";

    this.dom.setAttribute("type", "textbox");
    this.dom.onchange = (e) => {
      this._change(this.dom.value);
    }

    this.radix = 16;

    this.dom.oninput = (e) => {
      this._change(this.dom.value);
    }

    this.shadow.appendChild(this.dom);

    this.dom.addEventListener("focus", (e) => {
      console.log("Textbox focus", this.isModal);

      this._focus = 1;

      if (this.isModal) {
        this._startModal();
        this.setCSS();
      }
    });

    this.dom.addEventListener("blur", (e) => {
      console.log("Textbox blur");

      this._focus = 0;

      if (this._modal) {
        this._endModal(true);
        this.setCSS();
      }
    });

  }

  /** realtime dom attribute getter, defaults to true in absence of attribute*/
  get realtime() {
    let ret = this.getAttribute("realtime");

    if (!ret) {
      return true;
    }

    ret = ret.toLowerCase().trim();

    return ret === 'yes' || ret === 'true' || ret === 'on';
  }

  set realtime(val) {
    this.setAttribute('realtime', val ? 'true' : 'false');
  }

  get isModal() {
    let ret = this.getAttribute("modal");

    if (!ret) {
      return false;
    }

    ret = ret.toLowerCase().trim();

    return ret === 'yes' || ret === 'true' || ret === 'on';
  }

  set isModal(val) {
    this.setAttribute('modal', val ? 'true' : 'false');
  }

  _startModal() {
    console.warn("textbox modal");

    if (this._modal) {
      this._endModal(true);
    }

    let ignore = 0;

    let finish = (ok) => {
      this._endModal(ok);
    }

    let keydown = (e) => {
      e.stopPropagation();

      switch (e.keyCode) {
        case keymap.Enter:
          finish(true);
          break;
        case keymap.Escape:
          finish(false);
          break;
      }

      return;
      if (ignore) return;

      let e2 = new KeyboardEvent(e.type, e);

      ignore = 1;
      this.dom.dispatchEvent(e2);
      ignore = 0;
    };

    this._modal = true;
    this.pushModal({
      on_mousemove : (e) => {
        e.stopPropagation();
      },

      on_keydown : keydown,
      on_keypress : keydown,
      on_keyup : keydown,

      on_mousedown : (e) => {
        e.stopPropagation();
        console.log("mouse down", e, e.x, e.y);
      }
    }, false)
  }

  _flash_focus() {
    //don't focus on flash
  }

  _endModal(ok) {
    console.log("textbox end modal");

    this._modal = false;
    this.popModal();

    this.blur();

    if (this.onend) {
      this.onend(ok);
    } else {
      this._updatePathVal(this.dom.value);
    }

    this.blur();
  }

  get tabIndex() {
    return this.dom.tabIndex;
  }

  set tabIndex(val) {
    this.dom.tabIndex = val;
  }

  init() {
    super.init();

    //set isModal default
    if (!this.hasAttribute('modal')) {
      this.isModal = true;
    }

    this.style["display"] = "flex";
    this.style["width"] = this._width;

    this.setCSS();
  }

  set width(val) {
    if (typeof val === "number") {
      val += "px";
    }

    this._width = val;
    this.style["width"] = val;
  }

  setCSS() {
    super.setCSS();

    this.overrideDefault("background-color", this.getDefault("background-color"));

    this.background = this.getDefault("background-color");
    this.dom.style["margin"] = this.dom.style["padding"] = "0px";

    if (this.getDefault("background-color")) {
      this.dom.style["background-color"] = this.getDefault("background-color");
    }

    if (this._focus) {
      this.dom.style["border"] = `2px dashed ${this.getDefault('focus-border-color')}`;
    } else {
      this.dom.style["border"] = "none";
    }

    if (this.style["font"]) {
      this.dom.style["font"] = this.style["font"];
    } else {
      this.dom.style["font"] = this.getDefault("DefaultText").genCSS();
      this.dom.style["color"] = this.getDefault("DefaultText").color;
    }

    this.dom.style["width"] = "100%";
    this.dom.style["height"] = "100%";
  }

  updateDataPath() {
    if (!this.ctx || !this.hasAttribute("datapath")) {
      return;
    }
    if (this._focus || this._flashtimer !== undefined || (this._had_error && this._focus)) {
      return;
    }

    let val = this.getPathValue(this.ctx, this.getAttribute("datapath"));
    if (val === undefined || val === null) {
      console.error("invalid datapath " + this.getAttribute("datapath"), val);

      this.internalDisabled = true;
      return;
    } else {
      this.internalDisabled = false;
    }


    let prop = this.getPathMeta(this.ctx, this.getAttribute("datapath"));

    let text = this.text;

    if (!prop) {
      console.error("datapath error " + this.getAttribute("datapath"), val);
      return;
    }

    let is_num = prop.type & (PropTypes.FLOAT|PropTypes.INT);
    if (typeof val === "number" && (prop.type & (PropTypes.VEC2|PropTypes.VEC3|PropTypes.VEC4|PropTypes.QUAT))) {
      is_num = true;
    }

    if (is_num) {
      let is_int = prop.type === PropTypes.INT;

      this.radix = prop.radix;

      let decimalPlaces = this.decimalPlaces !== undefined ? this.decimalPlaces : prop.decimalPlaces;
      if (this.hasAttribute("decimalPlaces")) {
        decimalPlaces = parseInt(this.getAttribute("decimalPlaces"));
      }

      let baseUnit = this.baseUnit ?? prop.baseUnit;
      if (this.hasAttribute("baseUnit")) {
        baseUnit = this.getAttribute("baseUnit");
      }

      let displayUnit = this.displayUnit ?? prop.displayUnit;
      if (this.hasAttribute("displayUnit")) {
        displayUnit = this.getAttribute("displayUnit");
      }

      if (is_int && this.radix === 2) {
        text = val.toString(this.radix);
        text = "0b" + text;
      } else if (is_int && this.radix === 16) {
        text += "h";
      } else {
        text = units.buildString(val, baseUnit, decimalPlaces, displayUnit);
      }
    } else if (prop !== undefined && prop.type === PropTypes.STRING) {
      text = val;
    }

    if (this.text !== text) {
      this.text = text;
    }
  }

  update() {
    super.update();

    if (this.dom.style["width"] !== this.style["width"]) {
      this.dom.style["width"] = this.style["width"];
    }
    if (this.dom.style["height"] !== this.style["height"]) {
      this.dom.style["height"] = this.style["height"];
    }

    if (this.hasAttribute("datapath")) {
      this.updateDataPath();
    }

    this.setCSS();
  }

  select() {
    this.dom.select();
    //return this.dom.select.apply(this, arguments);
  }

  focus() {
    return this.dom.focus();
  }

  blur() {
    return this.dom.blur();
  }

  static define() {return {
    tagname : "textbox-x",
    style   : "textbox",
    modalKeyEvents : true
  };}

  get text() {
    return this.dom.value;
  }

  set text(value) {
    this.dom.value = value;
  }

  _prop_update(prop, text) {
    let is_num = prop.type & (PropTypes.FLOAT|PropTypes.INT);
    let val = this.getPathValue(this.ctx, this.getAttribute("datapath"));

    if (typeof val === "number" && (prop.type & (PropTypes.VEC2|PropTypes.VEC3|PropTypes.VEC4|PropTypes.QUAT))) {
      is_num = true;
    }

    if (is_num) {
      let is_int = prop.type === PropTypes.INT;

      this.radix = prop.radix;

      let decimalPlaces = this.decimalPlaces !== undefined ? this.decimalPlaces : prop.decimalPlaces;
      if (this.hasAttribute("decimalPlaces")) {
        decimalPlaces = parseInt(this.getAttribute("decimalPlaces"));
      }

      let baseUnit = this.baseUnit ?? prop.baseUnit;
      if (this.hasAttribute("baseUnit")) {
        baseUnit = this.getAttribute("baseUnit");
      }

      let displayUnit = this.displayUnit ?? prop.displayUnit;
      if (this.hasAttribute("displayUnit")) {
        displayUnit = this.getAttribute("displayUnit");
      }

      if (!units.isNumber(text.trim())) {
        this.flash(ui_base.ErrorColors.ERROR, this.dom);
        this.focus();
        this.dom.focus();
        this._had_error = true;
      } else {
        let val = units.parseValue(text, baseUnit, displayUnit);

        if (this._had_error) {
          this.flash(ui_base.ErrorColors.OK, this.dom);
        }

        this._had_error = false;
        this.setPathValue(this.ctx, this.getAttribute("datapath"), val);
      }
    } else if (prop.type === PropTypes.STRING) {
      try {
        this.setPathValue(this.ctx, this.getAttribute("datapath"), this.text);

        if (this._had_error) {
          this.flash(ui_base.ErrorColors.OK, this.dom);
          this.dom.focus();
        }

        this._had_error = false;
      } catch (error) {
        console.log(error.stack);
        console.log(error.message);
        console.warn("textbox error!");
        //this._had_error = true;

        this.flash(ui_base.ErrorColors.ERROR, this.dom);
        this.dom.focus();
      }
    }
  }


  _updatePathVal(text) {
    if (this.hasAttribute("datapath") && this.ctx !== undefined) {
      let prop = this.getPathMeta(this.ctx, this.getAttribute("datapath"));
      console.log(prop);

      if (prop) {
        this._prop_update(prop, text);
      }
    }

  }

  _change(text) {
    //console.log("onchange", this.ctx, this, this.dom.__proto__, this.hasFocus);
    //console.log("onchange", this._focus);

    console.log("change", text);

    if (this.realtime) {
      this._updatePathVal(text);
    }

    if (this.onchange) {
      this.onchange(text);
    }
  }
}

UIBase.internalRegister(TextBox);

/**

 Returns false if it's safe to call preventDefault.

 Returns true if the element at position x,y is
 either a textbox or is draggable.
 */
export function checkForTextBox(screen, x, y) {
  let p = screen.pickElement(x, y);
  //console.log(p, x, y);

  while (p) {
    //don't prevent draggable elements from dragging
    if (p.draggable) {
      return true;
    }

    if (p instanceof UIBase) {
      //check immediate children of p
      for (let i=0; i<2; i++) {
        let nodes = i ? p.childNodes : p.shadow.childNodes;

        for (let child of nodes) {
          if (child.draggable) {
            return true;
          }
        }
      }
    }

    let ok = p instanceof TextBoxBase;
    ok = ok || p.constructor.define && p.constructor.define().modalKeyEvents;

    if (ok) {
      return true;
    }

    p = p.parentWidget ? p.parentWidget : p.parentNode;
  }

  return false;
}
