"use strict";
import './ui_richedit.js';

import * as util from '../util/util.js';
import * as ui_base from '../core/ui_base.js';
import * as events from '../path-controller/util/events.js';
import {Vector2, Vector3, Vector4, Quat, Matrix4} from '../path-controller/util/vectormath.js';
import {RowFrame, ColumnFrame} from "../core/ui.js";
import {isNumber, PropFlags} from "../path-controller/toolsys/toolprop.js";

import './ui_widgets.js';

let keymap = events.keymap;

import {EnumProperty, PropTypes} from '../path-controller/toolsys/toolprop.js';
import {UIBase, PackFlags, IconSheets, parsepx} from '../core/ui_base.js';

import * as units from '../core/units.js';
import {ToolProperty} from '../path-controller/toolsys/toolprop.js';
import {Button} from "./ui_button.js";

export class VectorPopupButton extends Button {
  constructor() {
    super();

    this.value = new Vector4();
  }

  static define() {return {
    tagname : "vector-popup-button-x",
    style : "vecPopupButton"
  }}

  _onpress(e) {
    if (e.button && e.button !== 0) {
      return;
    }

    let panel = UIBase.createElement("vector-panel-x");
    let screen = this.ctx.screen;

    let popup = screen.popup(this, this);

    popup.add(panel);
    popup.button("ok", () => {
      popup.end();
    })

    if (this.hasAttribute("datapath")) {
      panel.setAttribute("datapath", this.getAttribute("datapath"));
    }
    if (this.hasAttribute("mass_set_path")) {
      panel.setAttribute("mass_set_path", this.getAttribute("mass_set_path"));
    }

    popup.flushUpdate();
  }

  updateDataPath() {
    if (!this.hasAttribute("datapath")) {
      return;
    }

    let value = this.getPathValue(this.ctx, this.getAttribute("datapath"));

    if (!value) {
      this.internalDisabled = true;
      return;
    }

    if (this.internalDisabled) {
      this.internalDisabled = false;
    }

    if (this.value.length !== value.length) {
      switch (value.length) {
        case 2:
          this.value = new Vector2();
          break;
        case 3:
          this.value = new Vector3();
          break;
        case 4:
          this.value = new Vector4();
          break;
      }
    }

    if (this.value.vectorDistance(value) > 0.0001) {
      this.value.load(value);
      console.log("updated vector popup button value");
    }
  }

  update() {
    super.update();
    this.updateDataPath();
  }

}
UIBase.internalRegister(VectorPopupButton);

export class VectorPanel extends ColumnFrame {
  constructor() {
    super();

    this.range = [-1e17, 1e17];

    this.name = "";

    this.axes = "XYZW";
    this.value = new Vector3();
    this.sliders = [];
    this.hasUniformSlider = false;

    this.packflag |= PackFlags.FORCE_ROLLER_SLIDER;

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
    makeParam("slideSpeed");
    makeParam("expRate");
    makeParam("stepIsRelative");

    window.vp = this;
  }

  init() {
    super.init();
    this.rebuild();
    this.setCSS();

    this.background = this.getDefault("InnerPanelBG");
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

    if (this.name) {
      this.label(this.name);
    }

    let frame, row;

    if (this.hasUniformSlider) {
      row = this.row();
      frame = row.col();
    } else {
      frame = this;
    }

    this.sliders = [];

    for (let i=0; i<this.value.length; i++) {
      let slider = frame.slider(undefined, {
        name       : this.axes[i],
        defaultval : this.value[i],
        min        : this.range[0],
        max        : this.range[1],
        step       : this.step || 0.001,
        is_int     : this.isInt,
        packflag   : this.packflag
      });

      slider.addLabel = false;
      slider.labelOnTop = false;

      //let slider = frame.slider(undefined, this.axes[i], this.value[i], this.range[0], this.range[1], 0.001, this.isInt);
      slider.axis = i;
      let this2 = this;

      slider.baseUnit = this.baseUnit;
      slider.slideSpeed = this.slideSpeed;
      slider.decimalPlaces = this.decimalPlaces;
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

        if (this2.uslider) {
          this2.uslider.setValue(this2.uniformValue, false);
        }

        if (this2.onchange) {
          this2.onchange(this2.value);
        }
      }

      this.sliders.push(slider);
    }

    if (this.hasUniformSlider) {
      let uslider = this.uslider = UIBase.createElement("numslider-x");
      row._prepend(uslider);

      uslider.range = this.range;
      uslider.baseUnit = this.baseUnit;
      uslider.slideSpeed = this.slideSpeed;
      uslider.decimalPlaces = this.decimalPlaces;
      uslider.displayUnit = this.displayUnit;
      uslider.expRate = this.expRate;
      uslider.step = this.step;
      uslider.expRate = this.expRate;
      uslider.isInt = this.isInt;
      uslider.radix = this.radix;
      uslider.decimalPlaces = this.decimalPlaces;
      uslider.stepIsRelative= this.stepIsRelative;

      uslider.vertical = true;
      uslider.setValue(this.uniformValue, false);

      this.sliders.push(uslider);

      uslider.onchange = () => {
        this.uniformValue = uslider.value;
      }
    } else {
      this.uslider = undefined;
    }

    this.setCSS();
  }

  get uniformValue() {
    let sum = 0.0;

    for (let i=0; i<this.value.length; i++) {
      sum += isNaN(this.value[i]) ? 0.0 : this.value[i];
    }

    return sum / this.value.length;
  }

  set uniformValue(val) {
    let old = this.uniformValue;
    let doupdate = false;

    if (old === 0.0 || val === 0.0) {
      doupdate = this.value.dot(this.value) !== 0.0

      this.value.zero();
    } else {
      let ratio = val / old;
      for (let i = 0; i < this.value.length; i++) {
        this.value[i] *= ratio;
      }

      doupdate = true;
    }

    if (doupdate) {
      if (this.hasAttribute("datapath")) {
        this.setPathValue(this.ctx, this.getAttribute("datapath"), this.value);
      }

      if (this.onchange) {
        this.onchange(this.value);
      }

      for (let i=0; i<this.value.length; i++) {
        this.sliders[i].setValue(this.value[i], false);
        this.sliders[i]._redraw();
      }

      if (this.uslider) {
        this.uslider.setValue(val, false);
        this.uslider._redraw();
      }
    }
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
      this.internalDisabled = true;
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

    let loadNumParam = (k, do_rebuild=false) => {
      if (meta && meta[k] !== undefined && this[k] === undefined) {
        this[k] = meta[k];

        if (this[k] !== meta[k] && do_rebuild) {
          this.doOnce(this.rebuild);
        }
      }
    }


    loadNumParam("decimalPlaces");
    loadNumParam("baseUnit");
    loadNumParam("slideSpeed");
    loadNumParam("displayUnit");
    loadNumParam("decimalPlaces");
    loadNumParam("isInt");
    loadNumParam("radix");
    loadNumParam("step");
    loadNumParam("expRate");
    loadNumParam("stepIsRelative");

    if (meta && meta.hasUniformSlider !== undefined && meta.hasUniformSlider !== this.hasUniformSlider) {
      this.hasUniformSlider = meta.hasUniformSlider;
      this.doOnce(this.rebuild);
    }

    if (meta && meta.range) {
      let update = this.range[0] !== meta.range[0];
      update= update || this.range[1] !== meta.range[1];

      this.range[0] = meta.range[0];
      this.range[1] = meta.range[1];

      if (update) {
        this.doOnce(this.rebuild);
      }
    }

    this.internalDisabled = false;

    let length = val.length;

    if (meta && (meta.flag & PropFlags.USE_CUSTOM_GETSET)) {
      let rdef = this.ctx.api.resolvePath(this.ctx, path);

      meta.ctx = this.ctx;
      meta.dataref = rdef.obj;
      meta.datapath = path;

      length = meta.getValue().length;

      meta.dataref = undefined;
    }

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

        if (this.uslider) {
          this.uslider.setValue(this.uniformValue, false);
        }

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
      for (let slider of this.sliders) {
        slider.step = ToolProperty.calcRelativeStep(this.step, slider.value);
      }
    }

    if (this.uslider) {
      this.uslider.step = this.step;
      if (this.stepIsRelative) {
        this.uslider.step = ToolProperty.calcRelativeStep(this.step, this.uniformValue);
      }

    }
  }

  static define() {return {
    tagname : "vector-panel-x"
  }}
}
UIBase.internalRegister(VectorPanel);


export class ToolTip extends UIBase {
  constructor() {
    super();

    this.visibleToPick = false;
    this.div = document.createElement("div");

    this.shadow.appendChild(this.div);
    this._start_time = undefined;
    this.timeout = undefined;
  }

  static show(message, screen, x, y) {
    let ret = UIBase.createElement(this.define().tagname);

    ret._start_time = util.time_ms();
    ret.timeout = ret.getDefault("timeout");

    ret.text = message;
    let size = ret._estimateSize();

    let pad = 5;
    size = [size[0] + pad, size[1] + pad];

    console.log(size);
    x = Math.min(Math.max(x, 0), screen.size[0] - size[0]);
    y = Math.min(Math.max(y, 0), screen.size[1] - size[1]);

    let dpi = UIBase.getDPI();

    x += 10/dpi;
    y += 15/dpi;

    ret._popup = screen.popup(ret, x, y);
    ret._popup.background = "rgba(0,0,0,0)";
    ret._popup.style["border"] = "none";
    ret.div.style["padding"] = "15px";

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

  update() {
    super.update();

    if (util.time_ms() - this._start_time > this.timeout) {
      this.end();
    }
  }

  setCSS() {
    super.setCSS();

    let color = this.getDefault("background-color");
    let bcolor = this.getDefault("border-color");

    this.background = color;

    let radius = this.getDefault("border-radius", undefined, 5);
    let bstyle = this.getDefault("border-style", undefined, "solid");
    let bwidth = this.getDefault("border-width", undefined, 1);
    let padding = this.getDefault("padding", undefined, 15);

    this.noMarginsOrPadding();

    this.div.style["padding"] = padding + "px";

    this.div.style["background-color"] = "rgba(0,0,0,0)";
    this.div.style["border"] = `${bwidth}px ${bstyle} ${bcolor}`;
    this.div.style["border-radius"] = radius + "px";
    this.style["border-radius"] = radius + "px";

    let font = this.getDefault("ToolTipText");
    this.div.style["color"] = font.color;
    this.div.style["font"] = font.genCSS();
  }

  static define() {return {
    tagname : "tool-tip-x",
    style   : "tooltip"
  }}
};
UIBase.internalRegister(ToolTip);

window._ToolTip = ToolTip;
