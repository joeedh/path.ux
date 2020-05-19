"use strict";
import './ui_richedit.js';

import * as util from '../util/util.js';
import * as ui_base from '../core/ui_base.js';
import * as events from '../util/events.js';
import * as simple_toolsys from '../toolsys/simple_toolsys.js';
import {pushModalLight, popModalLight} from '../util/simple_events.js';
import * as toolprop from '../toolsys/toolprop.js';
import {DataPathError} from '../controller/simple_controller.js';
import {Vector2, Vector3, Vector4, Quat, Matrix4} from '../util/vectormath.js';
import {RowFrame, ColumnFrame} from "../core/ui.js";
import {isNumber} from "../toolsys/toolprop.js";

import './ui_widgets.js';

let keymap = events.keymap;

let EnumProperty = toolprop.EnumProperty,
  PropTypes = toolprop.PropTypes;

let UIBase = ui_base.UIBase,
  PackFlags = ui_base.PackFlags,
  IconSheets = ui_base.IconSheets;

let parsepx = ui_base.parsepx;

import * as units from '../core/units.js';
import {ToolProperty} from "../toolsys/toolprop.js";

export class VectorPanel extends ColumnFrame {
  constructor() {
    super();

    this.range = [-1e17, 1e17];

    this.name = "";

    this.axes = "XYZW";
    this.value = new Vector3();
    this.sliders = [];

    let makeParam = (key) => {
      Object.defineProperty(this, key, {
        get : function() {
          return this._getNumParam(key);
        },

        set : function(val) {
          this._setNumParam(key, val);
        }
      });
    };

    this.__range = [-1e17, 1e17];
    this._range = new Array(2);

    Object.defineProperty(this._range, 0, {
      get : () => this.__range[0],
      set : (val) => this.__range[0] = val
    });
    Object.defineProperty(this._range, 1, {
      get : () => this.__range[1],
      set : (val) => this.__range[1] = val
    });

    makeParam("isInt");
    makeParam("radix");
    makeParam("decimalPlaces");
    makeParam("baseUnit");
    makeParam("displayUnit");
    makeParam("step");
    makeParam("expRate");
    makeParam("stepIsRelative");

    window.vp = this;
  }

  init() {
    super.init();
    this.rebuild();
    this.setCSS();

    this.background = this.getDefault("InnerPanelBG");
    this.style["padding"] = "5px";
  }

  _getNumParam(key) {
    return this["_"+key];
  }

  _setNumParam(key, val) {
    if (key === "range") {
      this.__range[0] = val[0];
      this.__range[1] = val[1];

      return;
    }

    this["_"+key] = val;

    for (let slider of this.sliders) {
      slider[key] = val;
    }
  }

  rebuild() {
    this.clear();

    console.warn("rebuilding");

    if (this.name) {
      this.label(this.name);
    }

    this.sliders = [];

    for (let i=0; i<this.value.length; i++) {
      //inpath, name, defaultval, min, max, step, is_int, do_redraw, callback, packflag = 0) {

      let slider = this.slider(undefined, this.axes[i], this.value[i], this.range[0], this.range[1], 0.001, this.isInt);
      slider.axis = i;
      let this2 = this;

      slider.baseUnit = this.baseUnit;
      slider.displayUnit = this.displayUnit;
      slider.isInt = this.isInt;
      slider.range = this.__range;
      slider.radix = this.radix;
      slider.step = this.step;
      slider.expRate = this.expRate;
      slider.stepIsRelative= this.stepIsRelative;

      if (this.stepIsRelative) {
        slider.step = ToolProperty.calcRelativeStep(this.step, this.value[i]);
      }

      slider.onchange = function(e) {
        this2.value[this.axis] = this.value;

        if (this2.hasAttribute("datapath")) {
          this2.setPathValue(this2.ctx, this2.getAttribute("datapath"), this2.value);
        }

        if (this2.onchange) {
          this2.onchange(this2.value);
        }
      }

      this.sliders.push(slider);
    }

    this.setCSS();
  }

  setValue(value) {
    if (!value) {
      return;
    }

    if (value.length !== this.value.length) {
      switch (value.length) {
        case 2:
          this.value = new Vector2(value);
          break;
        case 3:
          this.value = new Vector3(value);
          break;
        case 4:
          this.value = new Vector4(value);
          break;
        default:
          throw new Error("invalid vector size " + value.length);
      }

      this.rebuild();
    } else {
      this.value.load(value);
    }

    if (this.onchange) {
      this.onchange(this.value);
    }

    return this;
  }

  updateDataPath() {
    if (!this.hasAttribute("datapath")) {
      return;
    }

    let path = this.getAttribute("datapath");

    let val = this.getPathValue(this.ctx, path);
    if (val === undefined) {
      this.disabled = true;
      return;
    }


    let meta = this.getPathMeta(this.ctx, path);
    let name = meta.uiname !== undefined ? meta.uiname : meta.name;
    if (this.hasAttribute("name")) {
      name = this.getAttribute("name");
    }

    if (name && name !== this.name) {
      this.name = name;
      this.rebuild();
      return;
    }

    let loadNumParam = (k) => {
      if (meta && meta[k] !== undefined && this[k] === undefined) {
        this[k] = meta[k];
      }
    }

    loadNumParam("baseUnit");
    loadNumParam("displayUnit");
    loadNumParam("decimalPlaces");
    loadNumParam("isInt");
    loadNumParam("radix");
    loadNumParam("step");
    loadNumParam("expRate");
    loadNumParam("stepIsRelative");

    if (meta && meta.range) {
      this.range[0] = meta.range[0];
      this.range[1] = meta.range[1];
    }

    this.disabled = false;

    let length = val.length;

    if (meta)
      length = meta.getValue().length;
    
    if (this.value.length !== length) {
      switch (length) {
        case 2:
          val = new Vector2(val);
          break;
        case 3:
          val = new Vector3(val);
          break;
        case 4:
          val = new Vector4(val);
          break;
        default:
          val = meta.getValue().copy().load(val);
          break;
      }

      this.value = val;
      this.rebuild();

      for (let i=0; i<this.value.length; i++) {
        this.sliders[i].setValue(val[i], false);
        this.sliders[i]._redraw();
      }
    } else {
      if (this.value.vectorDistance(val) > 0) {
        this.value.load(val);

        for (let i=0; i<this.value.length; i++) {
          this.sliders[i].setValue(val[i], false);
          this.sliders[i]._redraw();
        }
      }
    }
  }
  update() {
    super.update();

    this.updateDataPath();
    
    if (this.stepIsRelative) {
      for (let i = 0; i < this.sliders.length; i++) {
        this.sliders[i].step = ToolProperty.calcRelativeStep(this.step, this.value[i]);
      }
    }
  }

  static define() {return {
    tagname : "vector-panel-x"
  }}
}
UIBase.register(VectorPanel);

export class ToolTip extends UIBase {
  constructor() {
    super();

    this.visibleToPick = false;
    this.div = document.createElement("div");

    this.styletag = document.createElement("style");
    this.styletag.textContent = `
      div {
        padding : 15px;
      }
    `;

    this.shadow.appendChild(this.styletag);
    this.shadow.appendChild(this.div);
  }

  static show(message, screen, x, y) {
    let ret = document.createElement(this.define().tagname);

    ret.text = message;
    let size = ret._estimateSize();

    console.log(size);
    x = Math.min(Math.max(x, 0), screen.size[0] - size[0]);
    y = Math.min(Math.max(y, 0), screen.size[1] - size[1]);

    ret._popup = screen.popup(ret, x, y);
    ret._popup.add(ret);

    return ret;
  }

  end() {
    this._popup.end();
  }

  init() {
    super.init();
    this.setCSS();
  }

  set text(val) {
    this.div.innerHTML = val.replace(/[\n]/g, "<br>\n");
  }

  get text() {
    return this.div.innerHTML;
  }

  _estimateSize() {
    let text = this.div.textContent;
    let block = ui_base.measureTextBlock(this, text, undefined, undefined, undefined, this.getDefault("ToolTipText"));

    return [block.width+50, block.height+30];
  }

  setCSS() {
    super.setCSS();

    let color = this.getDefault("BoxBG");
    let bcolor = this.getDefault("BoxBorder");

    this.div.style["background-color"] = color;
    this.div.style["border"] = "2px solid " + bcolor;

    this.div.style["font"] = this.getDefault("ToolTipText").genCSS();
  }

  static define() {return {
    tagname : "tool-tip-x",
    style   : "tooltip"
  }}
};
UIBase.register(ToolTip);
