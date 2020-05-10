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

export class NumSliderSimple extends UIBase {
  constructor() {
    super();

    this.baseUnit = undefined;
    this.displayUnit = undefined;

    this.canvas = document.createElement("canvas");
    this.g = this.canvas.getContext("2d");

    this.canvas.style["width"] = this.getDefault("DefaultWidth") + "px";
    this.canvas.style["height"] = this.getDefault("DefaultHeight") + "px";
    this.canvas.style["pointer-events"] = "none";

    this.highlight = false;
    this.isInt = false;

    this.shadow.appendChild(this.canvas);
    this.range = [0, 1];

    this.step = 0.1;
    this._value = 0.5;
    this._focus = false;

    this.modal = undefined;
  }

  setValue(val, ignore_events=false) {
    val = Math.min(Math.max(val, this.range[0]), this.range[1]);

    if (this.isInt) {
      val = Math.floor(val);
    }

    if (this._value !== val) {
      this._value = val;
      this._redraw();

      if (this.onchange && !ignore_events) {
        this.onchange(val);
      }

      if (this.getAttribute("datapath")) {
        let path = this.getAttribute("datapath");
        this.setPathValue(this.ctx, path, this._value);
      }
    }
  }

  get value() {
    return this._value;
  }

  set value(val) {
    this.setValue(val);
  }

  updateDataPath() {
    if (!this.hasAttribute("datapath")) {
      return;
    }

    let path = this.getAttribute("datapath");

    if (!path || path === "null" || path === "undefined") {
      return;
    }

    let val = this.getPathValue(this.ctx, path);

    if (this.isInt) {
      val = Math.floor(val);
    }

    if (val !== this._value) {
      let prop = this.getPathMeta(this.ctx, path);
      if (!prop) {
        return;
      }
      this.isInt = prop.type === PropTypes.INT;

      if (prop.range !== undefined) {
        this.range[0] = prop.range[0];
        this.range[1] = prop.range[1];
      }
      if (prop.uiRange !== undefined) {
        this.uiRange = new Array(2);
        this.uiRange[0] = prop.uiRange[0];
        this.uiRange[1] = prop.uiRange[1];
      }


      //console.log("updating numsplider simple value", val);
      this.value = val;
    }
  }

  _setFromMouse(e) {
    let rect = this.getClientRects()[0];
    if (rect === undefined) {
      return;
    }

    let x = e.x - rect.left;
    let dpi = UIBase.getDPI();
    let co = this._getButtonPos();

    let val = this._invertButtonX(x*dpi);
    this.value = val;
  }

  _startModal(e) {
    if (e !== undefined) {
      this._setFromMouse(e);
    }
    let dom = window;
    let evtargs = {capture : false};

    if (this.modal) {
      console.warn("Double call to _startModal!");
      return;
    }

    console.log("start simple numslider modal");

    let end = () => {
      console.log("end simple numslider modal");

      if (this._modal === undefined) {
        console.warn("end called twiced");
        return;
      }

      popModalLight(this._modal);

      this._modal = undefined;
      this.modal = undefined;
    };

    this.modal = {
      mousemove : (e) => {
        this._setFromMouse(e);
      },

      mouseover : (e) => {},
      mouseout : (e) => {},
      mouseleave : (e) => {},
      mouseenter : (e) => {},
      blur : (e) => {},
      focus : (e) => {},

      mouseup: (e) => {
        end();
      },

      keydown : (e) => {
        switch (e.keyCode) {
          case keymap["Enter"]:
          case keymap["Space"]:
          case keymap["Escape"]:
            end();
        }
      }
    };

    function makefunc(f) {
      return (e) => {
        e.stopPropagation();
        e.preventDefault();

        return f(e);
      }
    }

    for (let k in this.modal) {
      this.modal[k] = makefunc(this.modal[k]);
    }
    this._modal = pushModalLight(this.modal);
  }

  init() {
    super.init();

    if (!this.hasAttribute("tab-index")) {
      this.setAttribute("tab-index", 0);
    }

    this.updateSize();

    this.addEventListener("keydown", (e) => {
      console.log("yay keydown", e.keyCode);
      let dt = this.range[1] > this.range[0] ? 1 : -1;

      switch (e.keyCode) {
        case keymap["Left"]:
        case keymap["Right"]:
          let fac = this.step;

          if (e.shiftKey) {
            fac *= 0.1;
          }

          if (this.isInt) {
            fac = Math.max(fac, 1);
          }

          this.value += e.keyCode === keymap["Left"] ? -dt*fac : dt*fac;

          break;
      }
    });

    this.addEventListener("focusin", () => {
      if (this.disabled) return;

      this._focus = 1;
      this._redraw();
      this.focus();
      //console.log("focus2");
    });

    this.addEventListener("mousedown", (e) => {
      this._startModal(e);
    });

    this.addEventListener("mousein", (e) => {
      //console.log("mouse in");
      this.setHighlight(e);
      this._redraw();
    });
    this.addEventListener("mouseout", (e) => {
      //console.log("mouse out");
      this.highlight = false;
      this._redraw();
    });
    this.addEventListener("mouseover", (e) => {
      //console.log("mouse over");
      this.setHighlight(e);
      this._redraw();
    });
    this.addEventListener("mousemove", (e) => {
      this.setHighlight(e);
      this._redraw();
    });
    this.addEventListener("mouseleave", (e) => {
      //console.log("mouse leave");
      this.highlight = false;
      this._redraw();
    });
    this.addEventListener("blur", (e) => {
      //console.log("blur");
      this._focus = 0;
      this.highlight = false;
      this._redraw();
    });

    this.setCSS();
  }

  setHighlight(e) {
    this.highlight =  this.isOverButton(e) ? 2 : 1;
  }

  _redraw() {
    let g = this.g, canvas = this.canvas;
    let w = canvas.width, h = canvas.height;
    let dpi = UIBase.getDPI();

    let color = this.getDefault("BoxBG");
    let sh = ~~(this.getDefault("SlideHeight")*dpi + 0.5);

    g.clearRect(0, 0, canvas.width, canvas.height);

    //console.log(color)
    g.fillStyle = color;

    let y = (h - sh)*0.5;

    //export function drawRoundBox(elem, canvas, g, width, height, r=undefined,
    //                             op="fill", color=undefined, margin=undefined, no_clear=false) {

    let r = this.getDefault("BoxRadius");
    r = 3;

    g.translate(0, y);
    ui_base.drawRoundBox(this, this.canvas, g, w, sh, r, "fill", color, undefined, true);
    g.translate(0, -y);

    //g.beginPath();
    //g.rect(0, y, w, sh);
    //g.fill();

    if (this.highlight === 1) {
      color = this.getDefault("BoxHighlight");
    } else {
      color = this.getDefault("BoxBorder");
    }
    g.strokeStyle = color;
    g.stroke();

    let co = this._getButtonPos();

    g.beginPath();

    if (this.highlight === 2) {
      color = this.getDefault("BoxHighlight");
    } else {
      color = this.getDefault("BoxBorder");
    }

    g.arc(co[0], co[1], Math.abs(co[2]), -Math.PI, Math.PI);
    g.fill();

    g.strokeStyle = color;
    g.stroke();

    g.beginPath();
    g.setLineDash([4, 4]);

    if (this._focus) {
      g.strokeStyle = this.getDefault("BoxHighlight");
      g.arc(co[0], co[1], co[2] - 4, -Math.PI, Math.PI);
      g.stroke();
    }

    g.setLineDash([]);
  }

  isOverButton(e) {
    let x = e.x, y = e.y;
    let rect = this.getClientRects()[0];

    if (!rect) {
      return false;
    }

    x -= rect.left;
    y -= rect.top;

    let co = this._getButtonPos();

    let dpi = UIBase.getDPI();
    let dv = new Vector2([co[0]/dpi-x, co[1]/dpi-y]);
    let dis = dv.vectorLength();

    //console.log("dis", dis.toFixed(3));
    return dis < co[2]/dpi;
  }

  _invertButtonX(x) {
    let w = this.canvas.width;
    let dpi = UIBase.getDPI();
    let sh = ~~(this.getDefault("SlideHeight")*dpi + 0.5);
    let boxw = this.canvas.height - 4;
    let w2 = w - boxw;

    x = (x - boxw*0.5) / w2;
    x = x*(this.range[1] - this.range[0]) + this.range[0];

    return x;
  }

  _getButtonPos() {
    let w = this.canvas.width;
    let dpi = UIBase.getDPI();
    let sh = ~~(this.getDefault("SlideHeight")*dpi + 0.5);
    let x = this._value;
    x = (x - this.range[0]) / (this.range[1] - this.range[0]);
    let boxw = this.canvas.height - 4;
    let w2 = w - boxw;

    //console.log(x, this.range);

    x = x*w2 + boxw*0.5;

    return [x, boxw*0.5, boxw*0.5];
  }
  setCSS() {
    super.setCSS();

    this.canvas.style["width"] = "min-contents";
    this.canvas.style["min-width"] = this.getDefault("DefaultWidth") + "px";
    this.style["min-width"] = this.getDefault("DefaultWidth") + "px";
    this._redraw();
  }

  updateSize() {
    if (this.canvas === undefined) {
      return;
    }

    let rect = this.getClientRects()[0];

    if (rect === undefined) {
      return;
    }

    let dpi = UIBase.getDPI();
    let w = ~~(rect.width*dpi), h = ~~(rect.height*dpi);
    let canvas = this.canvas;

    if (w !== canvas.width || h !== canvas.height) {
      //console.log("canvas size update", w, h);
      this.canvas.width = w;
      this.canvas.height = h;

      this.setCSS();
      this._redraw();
    }
  }

  _ondestroy() {
    if (this._modal) {
      popModalLight(this._modal);
      this._modal = undefined;
    }
  }

  update() {
    super.update();

    if (this.getAttribute("tab-index") !== this.tabIndex) {
      this.tabIndex = this.getAttribute("tab-index");
    }

    this.updateSize();
    this.updateDataPath();
  }

  static define() {return {
    tagname : "numslider-simple-base-x",
    style : "numslider_simple"
  }}
}
UIBase.register(NumSliderSimple);

export class NumSliderSimple2 extends ColumnFrame {
  constructor() {
    super();

    this._value = 0;
    this._name = undefined;
    this.decimalPlaces = 4;
    this.isInt = false;
    this._lock_textbox = false;
    this.labelOnTop = undefined;

    this._last_label_on_top = undefined;

    this.styletag.textContent = `
    .numslider_simple_textbox {
      padding : 0px;
      margin  : 0px;
      height  : 15px;
    }
    `;

    this.container = this;

    this.textbox = document.createElement("textbox-x");
    this.numslider = document.createElement("numslider-simple-base-x");

    this.textbox.range = this.numslider.range;

    this.textbox.setAttribute("class", "numslider_simple_textbox");
  }

  get range() {
    return this.numslider.range;
  }

  get displayUnit() {
    return this.textbox.displayUnit;
  }

  set displayUnit(val) {
    let update = val !== this.displayUnit;

    //console.warn("setting display unit", val);
    this.slider.displayUnit = this.textbox.displayUnit = val;

    if (update) {
      this.updateTextBox();
    }
  }

  get baseUnit() {
    return this.textbox.baseUnit;
  }
  set baseUnit(val) {
    let update = val !== this.baseUnit;

    //console.warn("setting base unit", val);
    this.slider.baseUnit = this.textbox.baseUnit = val;

    if (update) {
      this.updateTextBox();
    }
  }

  init() {
    super.init();

    if (this.hasAttribute("labelOnTop")) {
      this.labelOnTop = this.getAttribute("labelOnTop");
    } else {
      this.labelOnTop = this.getDefault("labelOnTop");
    }

    this.rebuild();
  }

  rebuild() {
    this._last_label_on_top = this.labelOnTop;

    this.container.clear();

    if (this.labelOnTop) {
      this.container = this.row();
    } else {
      this.container = this;
    }

    if (this.hasAttribute("name")) {
      this._name = this.hasAttribute("name");
    } else {
      this._name = "slider";
    }


    this.l = this.container.label(this._name);
    this.l.font = "TitleText";
    this.l.overrideClass("numslider_simple");
    this.l.style["display"] = "float";
    this.l.style["position"] = "relative";
    
    if (!this.labelOnTop) {
      this.l.style["left"] = "8px";
      this.l.style["top"] = "5px";
    }

    let strip = this.container.row();
    strip.add(this.numslider);

    let path = this.hasAttribute("datapath") ? this.getAttribute("datapath") : undefined;

    let textbox = this.textbox;

    textbox.onchange = () => {
      let text = textbox.text;

      if (!isNumber(text)) {
        textbox.flash("red");
        return;
      } else {
        textbox.flash("green");

        let f = units.parseValue(text, this.baseUnit);

        if (isNaN(f)) {
          this.flash("red");
          return;
        }

        if (this.isInt) {
          f = Math.floor(f);
        }

        this._lock_textbox = 1;
        this.setValue(f);
        this._lock_textbox = 0;
      }
    };

    textbox.ctx = this.ctx;
    textbox.packflag |= this.inherit_packflag;
    textbox._width = this.getDefault("TextBoxWidth")+"px";
    textbox.style["height"] = (this.getDefault("DefaultHeight")-2) + "px";
    textbox._init();

    strip.add(textbox);

    this.linkTextBox();

    let in_onchange = 0;

    this.numslider.onchange = (val) => {
      this._value = this.numslider.value;
      this.updateTextBox();

      if (in_onchange) {
        return;
      }

      if (this.onchange !== undefined) {
        in_onchange++;
        try {
          if (this.onchange) {
            this.onchange(this);
          }
        } catch (error) {
          util.print_stack(error);
        }
      }

      in_onchange--;
    }
  }

  updateTextBox() {
    if (!this._init_done) {
      return;
    }

    if (this._lock_textbox > 0)
      return;

    //this.textbox.text = util.formatNumberUI(this._value, this.isInt, this.decimalPlaces);

    this.textbox.text = this.formatNumber(this._value);
    this.textbox.update();
  }

  linkTextBox() {
    this.updateTextBox();

    let onchange = this.numslider.onchange;
    this.numslider.onchange = (e) => {
      this._value = e.value;
      this.updateTextBox();

      onchange(e);
    }
  }

  setValue(val) {
    this._value = val;
    this.numslider.setValue(val);
    this.updateTextBox();
  }

  get value() {
    return this._value;
  }

  set value(val) {
    this.setValue(val);
  }

  updateName() {
    let name = this.getAttribute("name");

    if (!name && this.hasAttribute("datapath")) {
      let prop = this.getPathMeta(this.ctx, this.getAttribute("datapath"));

      if (prop) {
        name = prop.uiname;
      }
    }

    if (!name) {
      name = "[error]";
    }

    if (name !== this._name) {
      this._name = name;
      this.l.text = name;
    }
  }

  updateLabelOnTop() {
    if (this.labelOnTop !== this._last_label_on_top) {
      this._last_label_on_top = this.labelOnTop;
      this.rebuild();
    }
  }

  updateDataPath() {
    if (!this.ctx || !this.getAttribute("datapath")) {
      return;
    }

    let prop = this.getPathMeta(this.ctx, this.getAttribute("datapath"))

    if (prop !== undefined && !this.baseUnit && prop.baseUnit) {
      this.baseUnit = prop.baseUnit;
    }

    if (prop !== undefined && !this.displayUnit && prop.displayUnit) {
      this.displayUnit = prop.displayUnit;
    }
  }

  update() {
    this.updateLabelOnTop();
    super.update();

    this.updateDataPath();

    if (this.hasAttribute("min")) {
      this.range[0] = parseFloat(this.getAttribute("min"));
      this.setCSS();
      this._redraw();
    }

    if (this.hasAttribute("max")) {
      this.range[1] = parseFloat(this.getAttribute("max"));
      this.setCSS();
      this._redraw();
    }

    if (this.hasAttribute("integer")) {
      this.isInt = true;
      this.numslider.isInt = true;
    }

    this.updateName();

    this.numslider.description = this.description;
    this.textbox.description = this.title; //get full, transformed toolip

    if (this.hasAttribute("datapath")) {
      this.numslider.setAttribute("datapath", this.getAttribute("datapath"));
    }

    if (this.hasAttribute("mass_set_path")) {
      this.numslider.setAttribute("mass_set_path", this.getAttribute("mass_set_path"))
    }
  }

  setCSS() {
    super.setCSS();

    //textbox.style["margin"] = "5px";

  }

  static define() {return {
    tagname : "numslider-simple-x",
    style : "numslider_simple"
  }}
}
UIBase.register(NumSliderSimple2);

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
