"use strict";

import * as units from '../core/units.js';
import * as util from '../util/util.js';
import * as vectormath from '../util/vectormath.js';
import * as ui_base from '../core/ui_base.js';
import * as events from '../util/events.js';
import * as simple_toolsys from '../toolsys/simple_toolsys.js';
import * as toolprop from '../toolsys/toolprop.js';
import {DataPathError} from '../controller/simple_controller.js';
import {Vector3, Vector4, Quat, Matrix4} from '../util/vectormath.js';
import {isNumber} from "../toolsys/toolprop.js";

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

  }}
}

export class TextBox extends TextBoxBase {
  constructor() {
    super();

    this._width = "min-content";

    let margin = Math.ceil(3 * this.getDPI());

    this._had_error = false;

    this.decimalPlaces = 4;

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
      console.log("Textbox focus");
      this._startModal();
      this._focus = 1;
      this.setCSS();
    });

    this.dom.addEventListener("blur", (e) => {
      console.log("Textbox blur");
      if (this._modal) {
        this._endModal(true);
        this._focus = 0;
        this.setCSS();
      }
    });

  }

  _startModal() {
    console.log("textbox modal");

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
        console.log(e.x, e.y);
        e.stopPropagation();
      },

      on_keydown : keydown,
      on_keypress : keydown,
      on_keyup : keydown,

      on_mousedown : (e) => {
        e.stopPropagation();
        console.log("mouse down", e.x, e.y);
      }
    }, false)
  }

  _endModal(ok) {
    console.log("textbox end modal");

    this._modal = false;
    this.popModal();

    if (this.onend) {
      this.onend(ok);
    }
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

    this.overrideDefault("BoxBG", this.getDefault("background-color"));
    
    this.background = this.getDefault("background-color");
    this.dom.style["margin"] = this.dom.style["padding"] = "0px";
    
    if (this.getDefault("background-color")) {
      this.dom.style["background-color"] = this.getDefault("background-color");
    }
    
    if (this._focus) {
      this.dom.style["border"] = `2px dashed ${this.getDefault('FocusOutline')}`;
    } else {
      this.dom.style["border"] = "none";
    }

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

      this.radix = prop.radix;

      if (is_int && this.radix === 2) {
        text = val.toString(this.radix);
        text = "0b" + text;
      } else if (is_int && this.radix === 16) {
        text += "h";
      } else {
        text = units.buildString(val, this.baseUnit, this.decimalPlaces, this.displayUnit);
      }
    } else if (prop !== undefined && prop.type === PropTypes.STRING) {
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
    tagname : "textbox-x",
    style   : "textbox"
  };}

  get text() {
    return this.dom.value;
  }

  set text(value) {
    this.dom.value = value;
  }

  _prop_update(prop, text) {
    if ((prop.type === PropTypes.INT || prop.type === PropTypes.FLOAT)) {
      let val = units.parseValue(this.text, this.baseUnit);

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
  //console.log(elem, x, y);

  if (elem && elem instanceof TextBoxBase) {
    return true;
  }

  return false;
}
