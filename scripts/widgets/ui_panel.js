//bind module to global var to get at it in console.
//
//note that require has an api for handling circular
//module refs, in such cases do not use these vars.

var _ui = undefined;

import * as util from '../util/util.js';
import * as vectormath from '../util/vectormath.js';
import * as ui_base from '../core/ui_base.js';
import * as ui_widgets from './ui_widgets.js';
import * as toolprop from '../toolsys/toolprop.js';
import '../util/html5_fileapi.js';
import {ColumnFrame, RowFrame, Container} from "../core/ui.js";

let PropFlags = toolprop.PropFlags;
let PropSubTypes = toolprop.PropSubTypes;

let EnumProperty = toolprop.EnumProperty;

let Vector2 = vectormath.Vector2,
  UIBase = ui_base.UIBase,
  PackFlags = ui_base.PackFlags,
  PropTypes = toolprop.PropTypes;

export class PanelFrame extends ColumnFrame {
  constructor() {
    super();

    this.contents = document.createElement("colframe-x");
    this.iconcheck = document.createElement("iconcheck-x");

    Object.defineProperty(this.contents, "closed", {
      get : () => {
        return this.closed;
      },

      set : (v) => {
        this.closed = v;
      }
    })

    this.packflag = this.inherit_packflag = 0;

    this._closed = false;
  }

  saveData() {
    let ret = {
      _closed: this._closed
    };

    return Object.assign(super.saveData(), ret);
  }

  loadData(obj) {
    this.closed = obj._closed;
  }

  clear() {
    this.clear();
    this.add(this.titleframe);
  }

  get inherit_packflag() {
    if (!this.contents) return;
    return this.contents.inherit_packflag;
  }

  set inherit_packflag(val) {
    if (!this.contents) return;
    this.contents.inherit_packflag = val;
  }

  get packflag () {
    if (!this.contents) return;
    return this.contents.packflag;
  }

  set packflag(val) {
    if (!this.contents) return;
    this.contents.packflag = val;
  }

  init() {
    super.init();

    //con.style["margin-left"] = "5px";
    let con = this.titleframe = this.row();

    this.setCSS();

    let row = con;

    let iconcheck = this.iconcheck;
    this.style["width"] = "100%";

    this.overrideDefault("BoxMargin", 0);
    iconcheck.overrideDefault("BoxMargin", 0);

    iconcheck.noMarginsOrPadding();

    iconcheck.overrideDefault("BoxBG", "rgba(0,0,0,0)");
    iconcheck.overrideDefault("BoxSubBG", "rgba(0,0,0,0)");
    iconcheck.overrideDefault("BoxDepressed", "rgba(0,0,0,0)");
    iconcheck.overrideDefault("BoxBorder", "rgba(0,0,0,0)");

    iconcheck.ctx = this.ctx;
    iconcheck._icon_pressed = ui_base.Icons.UI_EXPAND;
    iconcheck._icon = ui_base.Icons.UI_COLLAPSE;
    iconcheck.drawCheck = false;
    iconcheck.iconsheet = ui_base.IconSheets.SMALL;
    iconcheck.checked = this._closed;

    this.iconcheck.onchange = (e) => {
      this.closed = this.iconcheck.checked;
    };

    row._add(iconcheck);

    //stupid css, let's just hackishly put " " to create spacing2

    let onclick = (e) => {
      console.log("panel header click");
      iconcheck.checked = !iconcheck.checked;
    };

    let label = this.__label = row.label(this.getAttribute("title"));

    this.__label.font = "TitleText";
    label._updateFont();

    label.noMarginsOrPadding();
    label.addEventListener("mousedown", onclick);
    label.addEventListener("touchdown", onclick);

    let bs = this.getDefault("border-style");

    row.background = this.getDefault("TitleBackground");
    row.style["border-radius"] = this.getDefault("BoxRadius") + "px";
    row.style["border"] = `${this.getDefault("BoxLineWidth")}px ${bs} ${this.getDefault("BoxBorder")}`;

    this.background = this.getDefault("Background");

    row.style["padding-right"] = "20px";
    row.style["padding-left"] = "5px";
    row.style["padding-top"] = this.getDefault("padding-top") + "px";
    row.style["padding-bottom"] = this.getDefault("padding-bottom") + "px";

    this.contents.ctx = this.ctx;
    if (!this._closed) {
      this.add(this.contents);
      this.contents.flushUpdate();
    }

    this.setCSS();
  }

  get label() {
    return this.__label.text;
  }

  set label(v) {
    this.__label.text = v;
  }

  setCSS() {
    super.setCSS();

    if (!this.titleframe || !this.__label) {
      return;
    }

    let bs = this.getDefault("border-style");

    this.titleframe.background = this.getDefault("TitleBackground");
    this.titleframe.style["border-radius"] = this.getDefault("BoxRadius") + "px";
    this.titleframe.style["border"] = `${this.getDefault("BoxLineWidth")}px ${bs} ${this.getDefault("TitleBorder")}`;
    this.style["border"] = `${this.getDefault("BoxLineWidth")}px ${bs} ${this.getDefault("BoxBorder")}`;
    this.titleframe.style["padding-top"] = this.getDefault("padding-top") + "px";
    this.titleframe.style["padding-bottom"] = this.getDefault("padding-bottom") + "px";

    let bg = this.getDefault("Background");
    
    this.background = bg;
    this.contents.background = bg;
    this.contents.style["background-color"] = bg;
    this.style["background-color"] = bg;

    this.__label._updateFont();
  }

  on_disabled() {
    super.on_disabled();

    this.__label._updateFont();
    this.setCSS();
  }

  on_enabled() {
    super.on_enabled();
    
    this.__label.setCSS();
    this.__label.style["color"] = this.style["color"];
    this.setCSS();
  }

  static define() {
    return {
      tagname: "panelframe-x",
      style  : "panel"
    };
  }

  update() {
    let key = this.getDefault("background-color") + this.getDefault("TitleBackground");
    key += this.getDefault("BoxBorder") + this.getDefault("BoxLineWidth");
    key += this.getDefault("BoxRadius") + this.getDefault("padding-top");
    key += this.getDefault("padding-bottom") + this.getDefault("TitleBorder");
    key += this.getDefault("Background") + this.getDefault("border-style");

    if (key !== this._last_key) {
      this._last_key = key;
      this.setCSS();
    }

    super.update();
  }

  _setVisible(state) {
    if (state) {
      this.contents.remove();
    } else {
      this.add(this.contents, false);
      this.contents.parentWidget = this;

      this.contents.flushUpdate();
    }

    this.contents.hidden = state;

    if (this.parentWidget) {
      this.parentWidget.flushUpdate();
    } else {
      this.flushUpdate();
    }
    return;
    for (let c of this.shadow.childNodes) {
      if (c !== this.titleframe) {
        c.hidden = state;
      }
    }
  }

  _updateClosed() {
    this._setVisible(this._closed);
    this.iconcheck.checked = this._closed;
  }

  get closed() {
    return this._closed;
  }

  set closed(val) {
    let update = !!val != !!this.closed;
    this._closed = val;

    //console.log("closed set", update);
    if (update) {
      this._updateClosed();
    }
  }
}

UIBase.register(PanelFrame);
