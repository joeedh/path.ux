"use strict";

import * as util from './util.js';
import * as vectormath from './vectormath.js';
import * as ui_base from './ui_base.js';
import * as events from './events.js';
import * as simple_toolsys from './simple_toolsys.js';
import * as toolprop from './toolprop.js';
import {DataPathError} from './simple_controller.js';
import {Vector3, Vector4, Quat, Matrix4} from './vectormath.js';
import {isNumber} from "./toolprop.js";

import cconst from './const.js';

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

export class TextBox extends UIBase {
  constructor() {
    super();

    this._width = "min-content";

    this.addEventListener("focusin", () => {
      this._focus = 1;
      this.dom.focus();
    });

    this.addEventListener("blur", () => {
      this._focus = 0;
    });

    let margin = Math.ceil(3 * this.getDPI());

    this._had_error = false;

    this.decimalPlaces = 4;

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
      console.log("Textbox focus");
      this._startModal();
    });

    this.dom.addEventListener("blur", (e) => {
      console.log("Textbox blur");
      if (this._modal) {
        this._endModal();
      }
    });

  }

  _startModal() {
    console.log("textbox modal");

    if (this._modal) {
      this._endModal();
    }

    let ignore = 0;

    let keydown = (e) => {
      e.stopPropagation();
      console.log(e.keyCode);
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
        console.log(e.x, e.y);
      },

      on_keydown : keydown,
      on_keypress : keydown,
      on_keyup : keydown,

      on_mousedown : (e) => {
        console.log("mouse down", e.x, e.y);
      }
    }, false)
  }

  _endModal() {
    console.log("textbox end modal");

    this._modal = false;
    this.popModal();
  }

  get tabIndex() {
    return this.dom.tabIndex;
  }

  set tabIndex(val) {
    this.dom.tabIndex = val;
  }

  init() {
    super.init();

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

    if (this.style["font"]) {
      this.dom.style["font"] = this.style["font"];
    } else {
      this.dom.style["font"] = this.getDefault("DefaultText").genCSS();
    }

    this.dom.style["width"] = this.style["width"];
    this.dom.style["height"] = this.style["height"];
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
      this.disabled = true;
      return;
    } else {
      this.disabled = false;
    }


    let prop = this.getPathMeta(this.ctx, this.getAttribute("datapath"));

    let text = this.text;

    if (prop !== undefined && (prop.type == PropTypes.INT || prop.type == PropTypes.FLOAT)) {
      let is_int = prop.type == PropTypes.INT;

      if (is_int) {
        this.radix = prop.radix;
        text = val.toString(this.radix);

        if (this.radix == 2) {
          text = "0b" + text;
        } else if (this.radix == 16) {
          text += "h";
        }
      } else {
        text = myToFixed(val, this.decimalPlaces);
      }
    } else if (prop !== undefined && prop.type == PropTypes.STRING) {
      text = val;
    }

    if (this.text != text) {
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
    tagname : "textbox-x"
  };}

  get text() {
    return this.dom.value;
  }

  set text(value) {
    this.dom.value = value;
  }

  _prop_update(prop, text) {
    if ((prop.type == PropTypes.INT || prop.type == PropTypes.FLOAT)) {
      let val = parseFloat(this.text);

      if (!toolprop.isNumber(this.text.trim())) {
        this.flash(ui_base.ErrorColors.ERROR, this.dom);
        this.focus();
        this.dom.focus();
        this._had_error = true;
      } else {
        if (this._had_error) {
          this.flash(ui_base.ErrorColors.OK, this.dom);
        }

        this._had_error = false;
        this.setPathValue(this.ctx, this.getAttribute("datapath"), val);
      }
    } else if (prop.type == PropTypes.STRING) {
      this.setPathValue(this.ctx, this.getAttribute("datapath"), this.text);
    }
  }


  _change(text) {
    //console.log("onchange", this.ctx, this, this.dom.__proto__, this.hasFocus);
    //console.log("onchange", this._focus);

    if (this.hasAttribute("datapath") && this.ctx !== undefined) {
      let prop = this.getPathMeta(this.ctx, this.getAttribute("datapath"));
      //console.log(prop);
      if (prop) {
        this._prop_update(prop, text);
      }
    }

    if (this.onchange) {
      this.onchange(text);
    }
  }
}

UIBase.register(TextBox);

export function checkForTextBox(screen, x, y) {
  let elem = screen.pickElement(x, y);
  console.log(elem, x, y);

  if (elem && elem.tagName === "TEXTBOX-X") {
    return true;
  }

  return false;
}
