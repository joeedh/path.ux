import {UIBase, drawText} from "../core/ui_base.js";
import {ValueButtonBase} from "./ui_widgets.js";
import cconst from '../config/const.js';
import * as ui_base from "../core/ui_base.js";
import * as units from "../core/units.js";
import {Vector2} from "../path-controller/util/vectormath.js";
import {ColumnFrame} from "../core/ui.js";
import * as util from "../path-controller/util/util.js";
import {
  PropTypes, isNumber, PropSubTypes, PropFlags, NumberConstraints, IntProperty
} from "../path-controller/toolsys/toolprop.js";
import {eventWasTouch} from "../path-controller/util/simple_events.js";
import {KeyMap, keymap} from "../path-controller/util/simple_events.js";
import {color2css, css2color} from "../core/ui_theme.js";
import {ThemeEditor} from "./theme_editor.js";

export const sliderDomAttributes = new Set([
  "min", "max", "integer", "displayUnit", "baseUnit", "labelOnTop",
  "radix", "step", "expRate", "stepIsRelative", "decimalPlaces",
  "slideSpeed"
]);

function updateSliderFromDom(dom, slider = dom) {
  let redraw = false;

  function getbool(attr, prop = attr) {
    if (!dom.hasAttribute(attr)) {
      return;
    }

    let v = dom.getAttribute(attr);
    let ret = v === null || v.toLowerCase() === "true" || v.toLowerCase === "yes";

    let old = slider[prop];
    if (old !== undefined && old !== ret) {
      redraw = true;
    }

    slider[prop] = ret;
    return ret;
  }

  function getfloat(attr, prop = attr) {
    if (!dom.hasAttribute(attr)) {
      return;
    }

    let v = dom.getAttribute(attr);
    let ret = parseFloat(v);

    let old = slider[prop];
    if (old !== undefined && Math.abs(old - v) < 0.00001) {
      redraw = true;
    }

    slider[prop] = ret;
    return ret;
  }

  function getint(attr, prop = attr) {
    if (!dom.hasAttribute(attr)) {
      return;
    }

    let v = ("" + dom.getAttribute(attr)).toLowerCase();
    let ret;

    if (v === "true") {
      ret = true;
    } else if (v === "false") {
      ret = false;
    } else {
      ret = parseInt(v);
    }

    if (isNaN(ret)) {
      console.error("bad value " + v);
      return 0.0;
    }

    let old = slider[prop];
    if (old !== undefined && Math.abs(old - v) < 0.00001) {
      redraw = true;
    }

    slider[prop] = ret;
    return ret;
  }

  if (dom.hasAttribute("min")) {
    slider.range = slider.range || [-1e17, 1e17];

    let r = slider.range[0];
    slider.range[0] = parseFloat(dom.getAttribute("min"));
    redraw = Math.abs(slider.range[0] - r) > 0.0001;
  }

  if (dom.hasAttribute("max")) {
    slider.range = slider.range || [-1e17, 1e17];

    let r = slider.range[1];
    slider.range[1] = parseFloat(dom.getAttribute("max"));
    redraw = redraw || Math.abs(slider.range[1] - r) > 0.0001;
  }

  if (dom.hasAttribute("displayUnit")) {
    let old = slider.displayUnit;
    slider.displayUnit = dom.getAttribute("displayUnit").trim();

    redraw = redraw || old !== slider.displayUnit;
  }

  getint("integer", "isInt");

  getint("radix");
  getint("decimalPlaces");

  getbool("labelOnTop");
  getbool("stepIsRelative");
  getfloat("expRate");
  getfloat("step");

  return redraw;
}

export const SliderDefaults = {
  stepIsRelative: false,
  expRate       : 1.0 + 1.0/3.0,
  radix         : 10,
  decimalPlaces : 4,
  baseUnit      : "none",
  displayUnit   : "none",
  slideSpeed    : 1.0,
  step          : 0.1,
}

export function NumberSliderBase(cls = UIBase, skip = new Set(), defaults = SliderDefaults) {
  skip = new Set(skip);

  return class NumberSliderBase extends cls {
    constructor() {
      super();

      for (let key of NumberConstraints) {
        if (skip.has(key)) {
          continue;
        }

        if (key in defaults) {
          this[key] = defaults[key];
        } else {
          this[key] = undefined;
        }
      }
    }

    loadConstraints(prop = undefined) {
      if (!this.hasAttribute("datapath")) {
        return;
      }

      if (!prop) {
        prop = this.getPathMeta(this.ctx, this.getAttribute("datapath"));
      }

      let loadAttr = (propkey, domkey = key, thiskey = key) => {
        if (this.hasAttribute(domkey)) {
          this[thiskey] = parseFloat(this.getAttribute(domkey));
        } else {
          this[thiskey] = prop[propkey];
        }
      }

      for (let key of NumberConstraints) {
        let thiskey = key, domkey = key;

        if (key === "range") { //handled later
          continue;
        }

        loadAttr(key, domkey, thiskey);
      }

      let range = prop.range;
      if (range && !this.hasAttribute("min")) {
        this.range[0] = range[0];
      } else if (this.hasAttribute("min")) {
        this.range[0] = parseFloat(this.getAttribute("min"));
      }

      if (range && !this.hasAttribute("max")) {
        this.range[1] = range[1];
      } else if (this.hasAttribute("max")) {
        this.range[1] = parseFloat(this.getAttribute("max"));
      }

      if (this.getAttribute("integer")) {
        let val = this.getAttribute("integer");
        val = ("" + val).toLowerCase();

        //handles anonymouse <numslider-x integer> case
        this.isInt = val === "null" || val === "true" || val === "yes" || val === "1";
      } else {
        this.isInt = prop instanceof IntProperty;
      }

      if (this.editAsBaseUnit === undefined) {
        if (prop.flag & PropFlags.EDIT_AS_BASE_UNIT) {
          this.editAsBaseUnit = true;
        } else {
          this.editAsBaseUnit = false;
        }
      }
    }
  }
}

//use .setAttribute("linear") to disable nonlinear sliding
export class NumSlider extends NumberSliderBase(ValueButtonBase) {
  constructor() {
    super();

    this._highlight = undefined;
    this._last_label = undefined;

    this.mdown = false;
    this.ma = undefined;

    this.mpos = new Vector2();
    this.start_mpos = new Vector2();

    this._last_overarrow = false;

    this._name = "";
    this._value = 0.0;
    this.expRate = SliderDefaults.expRate;

    this.vertical = false;
    this._last_disabled = false;

    this.range = [-1e17, 1e17];
    this.isInt = false;
    this.editAsBaseUnit = undefined;

    this._redraw();
  }

  get value() {
    return this._value;
  }

  set value(val) {
    this.setValue(val);
  }

  /** Current name label.  If set to null label will
   * be pulled from the datapath api.*/
  get name() {
    return this.getAttribute("name") || this._name;
  }

  /** Current name label.  If set to null label will
   * be pulled from the datapath api.*/
  set name(name) {
    if (name === undefined || name === null) {
      this.removeAttribute("name");
    } else {
      this.setAttribute("name", name);
    }
  }

  static define() {
    return {
      tagname    : "numslider-x",
      style      : "numslider",
      parentStyle: "button"
    };
  }


  updateDataPath() {
    if (!this.hasAttribute("datapath")) {
      return;
    }

    let prop = this.getPathMeta(this.ctx, this.getAttribute("datapath"));

    if (!prop) {
      return;
    }

    let name;

    if (this.hasAttribute("name")) {
      name = this.getAttribute("name");
    } else {
      name = "" + prop.uiname;
    }

    //lazily load constraints, since there's so much
    //accessing of DOM attributes
    let updateConstraints = false;

    if (name !== this._name) {
      this._name = name;
      this.setCSS();
      updateConstraints = true;
    }

    let val = this.getPathValue(this.ctx, this.getAttribute("datapath"));

    if (val !== this._value) {
      updateConstraints = true;
      /* Note that super.updateDataPath will update .value for us*/
    }

    if (updateConstraints) {
      this.loadConstraints(prop);
    }

    super.updateDataPath();
  }

  update() {
    if (!!this._last_disabled !== !!this.disabled) {
      this._last_disabled = !!this.disabled;
      this._redraw();
      this.setCSS();
    }

    super.update(); //calls this.updateDataPath

    updateSliderFromDom(this);
  }

  swapWithTextbox() {
    let tbox = UIBase.createElement("textbox-x");

    tbox.ctx = this.ctx;
    tbox._init();

    tbox.decimalPlaces = this.decimalPlaces;
    tbox.isInt = this.isInt;
    tbox.editAsBaseUnit = this.editAsBaseUnit;

    if (this.isInt && this.radix != 10) {
      let text = this.value.toString(this.radix);
      if (this.radix === 2)
        text = "0b" + text;
      else if (this.radix === 16)
        text += "h";

      tbox.text = text;
    } else {
      tbox.text = units.buildString(this.value, this.baseUnit, this.decimalPlaces, this.displayUnit);
    }

    this.parentNode.insertBefore(tbox, this);
    //this.remove();
    this.hidden = true;
    //this.dom.hidden = true;

    let finish = (ok) => {
      tbox.remove();
      this.hidden = false;

      if (ok) {
        let val = tbox.text.trim();

        if (this.isInt && this.radix !== 10) {
          val = parseInt(val);
        } else {
          let displayUnit = this.editAsBaseUnit ? undefined : this.displayUnit;

          val = units.parseValue(val, this.baseUnit, displayUnit);
        }

        if (isNaN(val)) {
          console.log("Text input error", val, tbox.text.trim(), this.isInt);
          this.flash(ui_base.ErrorColors.ERROR);
        } else {
          this.setValue(val);

          if (this.onchange) {
            this.onchange(this);
          }
        }
      }
    }

    tbox.onend = finish;
    tbox.focus();
    tbox.select();

    //this.shadow.appendChild(tbox);
    return;
  }

  bindEvents() {
    let dir = this.range && this.range[0] > this.range[1] ? -1 : 1;

    this.addEventListener("keydown", (e) => {
      switch (e.keyCode) {
        case keymap["Left"]:
        case keymap["Down"]:
          this.setValue(this.value - dir*5*this.step);
          break;
        case keymap["Up"]:
        case keymap["Right"]:
          this.setValue(this.value + dir*5*this.step);
          break;
      }
    });

    let onmousedown = (e) => {
      e.preventDefault();

      if (this.disabled) {
        this.mdown = false;
        e.stopPropagation();

        return;
      }

      if (e.button) {
        return;
      }

      this.mdown = true;

      if (e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();

        this.swapWithTextbox();
      } else if (this.overArrow(e.x, e.y)) {
        this._on_click(e);
      } else {
        this.dragStart(e);
        e.stopPropagation();
      }
    }

    this._on_click = (e) => {
      this.setMpos(e);

      if (this.disabled) {
        e.preventDefault();
        e.stopPropagation();

        return;
      }

      let step;

      if (step = this.overArrow(e.x, e.y)) {
        if (e.shiftKey) {
          step *= 0.1;
        }

        this.setValue(this.value + step);
      }
    }

    this.addEventListener("mousemove", (e) => {
      this.setMpos(e);

      if (this.mdown && !this._modaldata && this.mpos.vectorDistance(this.start_mpos) > 13) {
        this.dragStart(e);
      }
    });

    this.addEventListener("dblclick", (e) => {
      this.setMpos(e);

      this.mdown = false;

      if (this.disabled || this.overArrow(e.x, e.y)) {
        e.preventDefault();
        e.stopPropagation();

        return;
      }

      e.preventDefault();
      e.stopPropagation();

      this.swapWithTextbox();
    });

    this.addEventListener("mousedown", (e) => {
      this.setMpos(e);

      if (this.disabled) return;
      onmousedown(e);
    }, {capture: true});

    this.addEventListener("mouseup", (e) => {
      this.mdown = false;
    })
    /*
    this.addEventListener("touchstart", (e) => {
      if (this.disabled) return;

      e.x = e.touches[0].screenX;
      e.y = e.touches[0].screenY;

      this.dragStart(e);

      e.preventDefault();
      e.stopPropagation();
    }, {passive : false});
    //*/

    //this.addEventListener("mouseup", (e) => {
    //  return onmouseup(e);
    //});

    this.addEventListener("mouseover", (e) => {
      this.setMpos(e);
      if (this.disabled) return;

      if (!this._highlight) {
        this._highlight = true;
        this._repos_canvas();
        this._redraw();
      }
    })

    this.addEventListener("blur", (e) => {
      this._highlight = false;
      this.mdown = false;
    });

    this.addEventListener("mouseout", (e) => {
      this.setMpos(e);
      if (this.disabled) return;

      this._highlight = false;

      this.dom._background = this.getDefault("background-color");
      this._repos_canvas();
      this._redraw();
    })
  }

  overArrow(x, y) {
    let r = this.getBoundingClientRect();
    let rwidth, rx;

    if (this.vertical) {
      rwidth = r.height;
      rx = r.y;
      x = y;
    } else {
      rwidth = r.width;
      rx = r.x;
    }

    x -= rx;
    let sz = this._getArrowSize();

    let szmargin = sz + cconst.numSliderArrowLimit;

    let step = this.step || 0.01;

    if (this.isInt) {
      step = Math.max(step, 1);
    }

    if (isNaN(step)) {
      console.error("NaN step size", "step:", this.step, "numslider:", this._id);
      this.flash("red");
      step = this.isInt ? 1 : 0.1;
    }

    if (x < szmargin) {
      return -step;
    } else if (x > rwidth - szmargin) {
      return step;
    }

    return 0;
  }

  doRange() {
    console.warn("Deprecated: NumSlider.prototype.doRange, use loadConstraints instead!");
    this.loadConstraints();
  }

  setValue(value, fire_onchange = true, setDataPath = true, checkConstraints = true) {
    value = Math.min(Math.max(value, this.range[0]), this.range[1]);
    
    this._value = value;

    if (this.hasAttribute("integer")) {
      this.isInt = true;
    }

    if (this.isInt) {
      this._value = Math.floor(this._value);
    }

    if (checkConstraints) {
      this.loadConstraints();
    }

    if (setDataPath && this.ctx && this.hasAttribute("datapath")) {
      this.setPathValue(this.ctx, this.getAttribute("datapath"), this._value);
    }

    if (fire_onchange && this.onchange) {
      this.onchange(this.value);
    }

    this._redraw();
  }

  setMpos(e) {
    this.mpos[0] = e.x;
    this.mpos[1] = e.y;

    if (!this.mdown) {
      this.start_mpos[0] = e.x;
      this.start_mpos[1] = e.y;
    }

    let over = this.overArrow(e.x, e.y);

    if (over !== this._last_overarrow) {
      this._last_overarrow = over;
      this._redraw();
    }
  }

  dragStart(e) {
    this.mdown = false;

    if (this.disabled) return;

    if (this.modalRunning) {
      console.log("modal already running for numslider", this);
      return;
    }

    this.last_time = util.time_ms();

    let last_background = this.dom._background;
    let cancel;

    this.ma = new util.MovingAvg(eventWasTouch(e) ? 8 : 2);

    let startvalue = this.value;
    let value = startvalue;

    let startx = this.vertical ? e.y : e.x, starty = this.vertical ? e.x : e.y;
    let sumdelta = 0;

    this.dom._background = this.getDefault("BoxDepressed");
    let fire = () => {
      if (this.onchange) {
        this.onchange(this);
      }
    }

    let handlers = {
      on_keydown: (e) => {
        switch (e.keyCode) {
          case 27: //escape key
            cancel(true);
          case 13: //enter key
            cancel(false);
            break;
        }

        e.preventDefault();
        e.stopPropagation();
      },

      on_mousemove: (e) => {
        if (this.disabled) return;

        e.preventDefault();
        e.stopPropagation();

        let x = this.ma.add(this.vertical ? e.y : e.x);
        let dx = x - startx;
        startx = x;

        if (util.time_ms() - this.last_time < 35) {
          return;
        }
        this.last_time = util.time_ms();

        if (e.shiftKey) {
          dx *= 0.1;
        }

        dx *= this.vertical ? -1 : 1;

        sumdelta += Math.abs(dx);

        value += dx*this.step*0.1*this.slideSpeed;

        let dvalue = value - startvalue;
        let dsign = Math.sign(dvalue);

        let expRate = this.expRate;

        //if (eventWasTouch(e)) {
        //  expRate = (1 + expRate)*0.5;
        //}

        if (!this.hasAttribute("linear")) {
          dvalue = Math.pow(Math.abs(dvalue), expRate)*dsign;
        }

        this.value = startvalue + dvalue;

        /*
        if (e.shiftKey) {
          dx *= 0.1;
          this.value = startvalue2 + dx*0.1*this.step*this.slideSpeed;
          startvalue3 = this.value;
        } else {
          startvalue2 = this.value;
          this.value = startvalue3 + dx*0.1*this.step*this.slideSpeed;
        }*/

        this.updateWidth();
        this._redraw();
        fire();
      },

      on_mouseup: (e) => {
        this.setMpos(e);

        this.undoBreakPoint();
        cancel(false);

        e.preventDefault();
        e.stopPropagation();
      },

      on_mouseout: (e) => {
        last_background = this.getDefault("background-color");

        e.preventDefault();
        e.stopPropagation();
      },

      on_mouseover: (e) => {
        last_background = this.getDefault("BoxHighlight");

        e.preventDefault();
        e.stopPropagation();
      },

      on_mousedown: (e) => {
        this.popModal();
      },
    };

    //events.pushModal(this.getScreen(), handlers);
    this.pushModal(handlers);

    cancel = (restore_value) => {
      if (restore_value) {
        this.value = startvalue;
        this.updateWidth();
        fire();
      }

      this.dom._background = last_background; //ui_base.getDefault("background-color");
      this._redraw();

      this.popModal();
    }

    /*
    cancel = (restore_value) => {
      if (restore_value) {
        this.value = startvalue;
        this.updateWidth();
        fire();
      }

      this.dom._background = last_background; //ui_base.getDefault("background-color");
      this._redraw();

      console.trace("end");

      window.removeEventListener("keydown", keydown, true);
      window.removeEventListener("mousemove", mousemove, {captured : true, passive : false});

      window.removeEventListener("touchend", touchend, true);
      window.removeEventListener("touchmove", touchmove, {captured : true, passive : false});
      window.removeEventListener("touchcancel", touchcancel, true);
      window.removeEventListener("mouseup", mouseup, true);

      this.removeEventListener("mouseover", mouseover, true);
      this.removeEventListener("mouseout", mouseout, true);
    }

    window.addEventListener("keydown", keydown, true);
    window.addEventListener("mousemove", mousemove, true);
    window.addEventListener("touchend", touchend, true);
    window.addEventListener("touchmove", touchmove, {captured : true, passive : false});
    window.addEventListener("touchcancel", touchcancel, true);
    window.addEventListener("mouseup", mouseup, true);

    this.addEventListener("mouseover", mouseover, true);
    this.addEventListener("mouseout", mouseout, true);
    //*/
  }

  setCSS() {
    //do not call parent class implementation
    let dpi = this.getDPI();

    let ts = this.getDefault("DefaultText").size*UIBase.getDPI();

    let dd = this.isInt ? 5 : this.decimalPlaces + 8;

    let label = this._genLabel();

    let tw = ui_base.measureText(this, label, {
      size: ts,
      font: this.getDefault("DefaultText")
    }).width/dpi;

    tw = Math.max(tw + this._getArrowSize()*0, this.getDefault("width"));

    tw += ts;
    tw = ~~tw;

    //tw = Math.max(tw, w);
    if (this.vertical) {
      this.style["width"] = this.dom.style["width"] = this.getDefault("height") + "px";

      this.style["height"] = tw + "px";
      this.dom.style["height"] = tw + "px";
    } else {
      this.style["height"] = this.dom.style["height"] = this.getDefault("height") + "px";

      this.style["width"] = tw + "px";
      this.dom.style["width"] = tw + "px";
    }

    this._repos_canvas();
    this._redraw();
  }

  updateName(force) {
    if (!this.hasAttribute("name")) {
      return;
    }

    let name = this.getAttribute("name");

    if (force || name !== this._name) {
      this._name = name;
      this.setCSS();
    }

    let label = this._genLabel();
    if (label !== this._last_label) {
      this._last_label = label;
      this.setCSS();
    }
  }

  _genLabel() {
    let val = this.value;
    let text;

    if (val === undefined) {
      text = "error";
    } else {
      val = val === undefined ? 0.0 : val;

      if (this.isInt) {
        val = Math.floor(val);
      }

      val = units.buildString(val, this.baseUnit, this.decimalPlaces, this.displayUnit);

      text = val;
      if (this._name) {
        text = this._name + ": " + text;
      }
    }

    return text;
  }

  _redraw() {
    let g = this.g;
    let canvas = this.dom;

    let dpi = this.getDPI();
    let disabled = this.disabled;

    let r = this.getDefault("border-radius");
    if (this.isInt) {
      r *= 0.25;
    }

    let boxbg = this.getDefault(this._highlight ? "BoxHighlight" : "background-color");

    ui_base.drawRoundBox(this, this.dom, this.g, undefined, undefined,
      r, "fill", disabled ? this.getDefault("DisabledBG") : boxbg);
    ui_base.drawRoundBox(this, this.dom, this.g, undefined, undefined,
      r, "stroke", disabled ? this.getDefault("DisabledBG") : this.getDefault("border-color"));

    r *= dpi;
    let pad = this.getDefault("padding");
    let ts = this.getDefault("DefaultText").size;

    let text = this._genLabel();

    let tw = ui_base.measureText(this, text, this.dom, this.g).width;
    let cx = ts + this._getArrowSize();
    let cy = this.dom.height/2;

    this.dom.font = undefined;

    g.save();

    let th = Math.PI*0.5;

    if (this.vertical) {
      g.rotate(th);

      ui_base.drawText(this, cx, -ts*0.5, text, {
        canvas: this.dom,
        g     : this.g,
        size  : ts
      });
      g.restore();
    } else {
      ui_base.drawText(this, cx, cy + ts/2, text, {
        canvas: this.dom,
        g     : this.g,
        size  : ts
      });
    }

    //}

    let arrowcolor = this.getDefault("arrow-color") || "33%";
    arrowcolor = arrowcolor.trim();

    if (arrowcolor.endsWith("%")) {
      arrowcolor = arrowcolor.slice(0, arrowcolor.length - 1).trim();
      let perc = parseFloat(arrowcolor)/100.0;
      let c = css2color(this.getDefault("arrow-color"));

      let f = 1.0 - (c[0] + c[1] + c[2])*perc;

      f = ~~(f*255);
      arrowcolor = `rgba(${f},${f},${f},0.95)`;

    }

    arrowcolor = css2color(arrowcolor);
    let higharrow = css2color(this.getDefault("BoxHighlight"));
    higharrow.interp(arrowcolor, 0.5);

    arrowcolor = color2css(arrowcolor);
    higharrow = color2css(higharrow);

    let over = this._highlight ? this.overArrow(this.mpos[0], this.mpos[1]) : 0;

    let d = 7, w = canvas.width, h = canvas.height;
    let sz = this._getArrowSize();

    if (this.vertical) {
      g.beginPath();
      g.moveTo(w*0.5, d);
      g.lineTo(w*0.5 + sz*0.5, d + sz);
      g.lineTo(w*0.5 - sz*0.5, d + sz);

      g.fillStyle = over < 0 ? higharrow : arrowcolor;
      g.fill();

      g.beginPath();
      g.moveTo(w*0.5, h - d);
      g.lineTo(w*0.5 + sz*0.5, h - sz - d);
      g.lineTo(w*0.5 - sz*0.5, h - sz - d);

      g.fillStyle = over > 0 ? higharrow : arrowcolor;
      g.fill();
    } else {
      g.beginPath();
      g.moveTo(d, h*0.5);
      g.lineTo(d + sz, h*0.5 + sz*0.5);
      g.lineTo(d + sz, h*0.5 - sz*0.5);

      g.fillStyle = over < 0 ? higharrow : arrowcolor;
      g.fill();

      g.beginPath();
      g.moveTo(w - d, h*0.5);
      g.lineTo(w - sz - d, h*0.5 + sz*0.5);
      g.lineTo(w - sz - d, h*0.5 - sz*0.5);

      g.fillStyle = over > 0 ? higharrow : arrowcolor;
      g.fill();
    }

    g.fill();
  }

  _getArrowSize() {
    return UIBase.getDPI()*10;
  }
}

UIBase.internalRegister(NumSlider);


export class NumSliderSimpleBase extends NumberSliderBase(UIBase) {
  constructor() {
    super();

    this.baseUnit = undefined;
    this.displayUnit = undefined;
    this.editAsBaseUnit = undefined;

    this.canvas = document.createElement("canvas");
    this.g = this.canvas.getContext("2d");

    this.canvas.style["width"] = this.getDefault("width") + "px";
    this.canvas.style["height"] = this.getDefault("height") + "px";
    this.canvas.style["pointer-events"] = "none";

    this.highlight = false;
    this.isInt = false;

    this.shadow.appendChild(this.canvas);
    this.range = [0, 1];

    /** if not undefined defines subrange of visible slider */
    this.uiRange = undefined;

    this.step = 0.1;
    this._value = 0.5;
    this.ma = undefined;
    this._focus = false;

    this.modal = undefined;

    this._last_slider_key = '';
  }

  get value() {
    return this._value;
  }

  set value(val) {
    this.setValue(val);
  }

  static define() {
    return {
      tagname    : "numslider-simple-base-x",
      style      : "numslider_simple",
      parentStyle: "button"
    }
  }

  setValue(val, fire_onchange = true, setDataPath = true) {
    val = Math.min(Math.max(val, this.range[0]), this.range[1]);

    if (this.isInt) {
      val = Math.floor(val);
    }

    if (this._value !== val) {
      this._value = val;
      this._redraw();

      if (this.onchange && fire_onchange) {
        this.onchange(val);
      }

      if (setDataPath && this.getAttribute("datapath")) {
        let path = this.getAttribute("datapath");
        this.setPathValue(this.ctx, path, this._value);
      }
    }
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

      this.loadConstraints(prop);
      this.setValue(val, true, false);
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
    if (this.disabled) {
      return;
    }

    if (e !== undefined) {
      this._setFromMouse(e);
    }
    let dom = window;
    let evtargs = {capture: false};

    if (this.modal) {
      console.warn("Double call to _startModal!");
      return;
    }

    this.ma = new util.MovingAvg(eventWasTouch(e) ? 4 : 2);
    let handlers;

    let end = () => {
      if (handlers === undefined) {
        return;
      }

      this.popModal();
      handlers = undefined;
    };

    handlers = {
      mousemove: (e) => {
        let x = e.x, y = e.y;

        x = this.ma.add(x);

        let e2 = new MouseEvent(e, {
          x, y
        });
        this._setFromMouse(e);
      },

      mouseover : (e) => {
      },
      mouseout  : (e) => {
      },
      mouseleave: (e) => {
      },
      mouseenter: (e) => {
      },
      blur      : (e) => {
      },
      focus     : (e) => {
      },

      mouseup: (e) => {
        this.undoBreakPoint();
        end();
      },

      keydown: (e) => {
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

    for (let k in handlers) {
      handlers[k] = makefunc(handlers[k]);
    }

    this.pushModal(handlers);
  }

  init() {
    super.init();

    if (!this.hasAttribute("tab-index")) {
      this.setAttribute("tab-index", 0);
    }

    this.updateSize();

    this.addEventListener("keydown", (e) => {
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
    });

    this.addEventListener("mousedown", (e) => {
      if (this.disabled) {
        return;
      }

      /* ensure browser doesn't spawn its own (incompatible)
         touch->mouse emulation events}; */
      e.preventDefault();
      this._startModal(e);
    });

    this.addEventListener("mousein", (e) => {
      this.setHighlight(e);
      this._redraw();
    });
    this.addEventListener("mouseout", (e) => {
      this.highlight = false;
      this._redraw();
    });
    this.addEventListener("mouseover", (e) => {
      this.setHighlight(e);
      this._redraw();
    });
    this.addEventListener("mousemove", (e) => {
      this.setHighlight(e);
      this._redraw();
    });
    this.addEventListener("mouseleave", (e) => {
      this.highlight = false;
      this._redraw();
    });
    this.addEventListener("blur", (e) => {
      this._focus = 0;
      this.highlight = false;
      this._redraw();
    });

    this.setCSS();
  }

  setHighlight(e) {
    this.highlight = this.isOverButton(e) ? 2 : 1;
  }

  _redraw() {
    let g = this.g, canvas = this.canvas;
    let w = canvas.width, h = canvas.height;
    let dpi = UIBase.getDPI();

    let color = this.getDefault("background-color");
    let sh = ~~(this.getDefault("SlideHeight")*dpi + 0.5);

    g.clearRect(0, 0, canvas.width, canvas.height);

    g.fillStyle = color;

    let y = (h - sh)*0.5;

    let r = this.getDefault("border-radius");

    g.translate(0, y);
    ui_base.drawRoundBox(this, this.canvas, g, w, sh, r, "fill", color, undefined, true);

    let bcolor = this.getDefault('border-color');
    ui_base.drawRoundBox(this, this.canvas, g, w, sh, r, "stroke", bcolor, undefined, true);
    g.translate(0, -y);

    if (this.highlight === 1) {
      color = this.getDefault("BoxHighlight");
    } else {
      color = this.getDefault("border-color");
    }

    g.strokeStyle = color;
    g.stroke();

    let co = this._getButtonPos();

    g.beginPath();

    if (this.highlight === 2) {
      color = this.getDefault("BoxHighlight");
    } else {
      color = this.getDefault("border-color");
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
    let dv = new Vector2([co[0]/dpi - x, co[1]/dpi - y]);
    let dis = dv.vectorLength();

    return dis < co[2]/dpi;
  }

  _invertButtonX(x) {
    let w = this.canvas.width;
    let dpi = UIBase.getDPI();
    let sh = ~~(this.getDefault("SlideHeight")*dpi + 0.5);
    let boxw = this.canvas.height - 4;
    let w2 = w - boxw;

    let range = this.uiRange || this.range;

    x = (x - boxw*0.5)/w2;
    x = x*(range[1] - range[0]) + range[0];

    return x;
  }

  _getButtonPos() {
    let w = this.canvas.width;
    let dpi = UIBase.getDPI();
    let sh = ~~(this.getDefault("SlideHeight")*dpi + 0.5);
    let x = this._value;

    let range = this.uiRange || this.range;

    x = (x - range[0])/(range[1] - range[0]);

    let boxw = this.canvas.height - 4;
    let w2 = w - boxw;

    x = x*w2 + boxw*0.5;

    return [x, boxw*0.5, boxw*0.5];
  }

  setCSS() {
    //UIBase.setCSS does annoying thing with background-color
    //super.setCSS();

    this.canvas.style["width"] = "min-contents";
    this.canvas.style["min-width"] = this.getDefault("width") + "px";
    this.canvas.style["height"] = this.getDefault("height") + "px";

    this.canvas.height = this.getDefault("height")*UIBase.getDPI();

    this.style["min-width"] = this.getDefault("width") + "px";
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
      this.canvas.width = w;
      this.canvas.height = h;

      this.setCSS();
      this._redraw();
    }
  }

  _ondestroy() {
    if (this.modalRunning) {
      this.popModal();
    }
  }

  update() {
    super.update();

    let key = this.getDefault("width") + this.getDefault("height") + this.getDefault("SlideHeight");
    if (key !== this._last_slider_key) {
      this._last_slider_key = key;

      this.flushUpdate();
      this.setCSS();
      this._redraw();
    }

    if (this.getAttribute("tab-index") !== this.tabIndex) {
      this.tabIndex = this.getAttribute("tab-index");
    }

    this.updateSize();
    this.updateDataPath();
    updateSliderFromDom(this);
  }
}

UIBase.internalRegister(NumSliderSimpleBase);

export class SliderWithTextbox extends ColumnFrame {
  constructor() {
    super();

    this._value = 0;
    this._name = undefined;
    this._lock_textbox = false;
    this._labelOnTop = undefined;

    this._last_label_on_top = undefined;

    this.container = this;

    this.textbox = UIBase.createElement("textbox-x");
    this.textbox.width = 55;
    this._numslider = undefined;

    this.textbox.overrideDefault("width", this.getDefault("TextBoxWidth"));
    this.textbox.setAttribute("class", "numslider_simple_textbox");

    this._last_value = undefined;
  }

  /**
   * whether to put label on top or to the left of sliders
   *
   * If undefined value will be either this.getAtttribute("labelOnTop"),
   * if "labelOnTop" attribute exists, or it will be this.getDefault("labelOnTop")
   * (theme default)
   **/
  get labelOnTop() {
    let ret = this._labelOnTop;

    if (ret === undefined && this.hasAttribute("labelOnTop")) {
      let val = this.getAttribute("labelOnTop");
      if (typeof val === "string") {
        val = val.toLowerCase();
        ret = val === "true" || val === "yes";
      } else {
        ret = !!val;
      }
    }

    if (ret === undefined) {
      ret = this.getDefault("labelOnTop");
    }

    return !!ret;
  }

  set labelOnTop(v) {
    this._labelOnTop = v;
  }

  get numslider() {
    return this._numslider;
  }

  //child classes set this in their constructors
  set numslider(v) {
    this._numslider = v;
    this.textbox.range = this._numslider.range;
  }

  get editAsBaseUnit() {
    return this.numslider.editAsBaseUnit;
  }

  set editAsBaseUnit(v) {
    this.numslider.editAsBaseUnit = v;
  }

  get range() {
    return this.numslider.range;
  }

  set range(v) {
    this.numslider.range = v;
  }

  get step() {
    return this.numslider.step;
  }

  set step(v) {
    this.numslider.step = v;
  }

  get expRate() {
    return this.numslider.expRate;
  }

  set expRate(v) {
    this.numslider.expRate = v;
  }

  get decimalPlaces() {
    return this.numslider.decimalPlaces;
  }

  set decimalPlaces(v) {
    this.numslider.decimalPlaces = v;
  }

  get isInt() {
    return this.numslider.isInt;
  }

  set isInt(v) {
    this.numslider.isInt = v;
  }

  get slideSpeed() {
    return this.numslider.slideSpeed;
  }

  set slideSpeed(v) {
    this.numslider.slideSpeed = v;
  }

  get radix() {
    return this.numslider.radix;
  }

  set radix(v) {
    this.numslider.radix = v;
  }

  get stepIsRelative() {
    return this.numslider.stepIsRelative;
  }

  set stepIsRelative(v) {
    this.numslider.stepIsRelative = v;
  }

  get displayUnit() {
    return this.textbox.displayUnit;
  }

  set displayUnit(val) {
    let update = val !== this.displayUnit;

    this.numslider.displayUnit = this.textbox.displayUnit = val;

    if (update) {
      //this.numslider._redraw();
      this.updateTextBox();
    }
  }

  get baseUnit() {
    return this.textbox.baseUnit;
  }

  set baseUnit(val) {
    let update = val !== this.baseUnit;

    this.numslider.baseUnit = this.textbox.baseUnit = val;

    if (update) {
      //this.slider._redraw();
      this.updateTextBox();
    }
  }

  get realTimeTextBox() {
    let ret = this.getAttribute("realtime");

    if (!ret) {
      return false;
    }

    ret = ret.toLowerCase().trim();

    return ret === 'true' || ret === 'on' || ret === 'yes';
  }

  set realTimeTextBox(val) {
    this.setAttribute("realtime", val ? "true" : "false");
  }

  get value() {
    return this._value;
  }

  set value(val) {
    this.setValue(val);
  }

  init() {
    super.init();

    this.rebuild();
    window.setTimeout(() => this.updateTextBox(), 500);
  }

  rebuild() {
    this._last_label_on_top = this.labelOnTop;

    this.container.clear();

    if (!this.labelOnTop) {
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
    this.l.overrideClass("numslider_textbox");
    this.l.font = "TitleText";
    this.l.style["display"] = "float";
    this.l.style["position"] = "relative";

    let strip = this.container.row();
    //strip.style['justify-content'] = 'space-between';
    strip.add(this.numslider);

    let path = this.hasAttribute("datapath") ? this.getAttribute("datapath") : undefined;

    let textbox = this.textbox;
    this.textbox.overrideDefault("width", this.getDefault("TextBoxWidth"));

    let apply_textbox = () => {
      let text = textbox.text;

      if (!units.isNumber(text)) {
        textbox.flash("red");
        return;
      } else {
        textbox.flash("green");

        let displayUnit = this.editAsBaseUnit ? undefined : this.displayUnit;

        let f = units.parseValue(text, this.baseUnit, displayUnit);

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

    if (this.realTimeTextBox) {
      textbox.onchange = apply_textbox;
    }

    textbox.onend = apply_textbox;

    textbox.ctx = this.ctx;
    textbox.packflag |= this.inherit_packflag;
    textbox.overrideDefault("width", this.getDefault("TextBoxWidth"));

    textbox.style["height"] = (this.getDefault("height") - 2) + "px";
    textbox._init();

    strip.add(textbox);

    textbox.setCSS();
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

    this.textbox.text = this.formatNumber(this._value);
    this.textbox.update();

    updateSliderFromDom(this, this.numslider);
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

  setValue(val, fire_onchange = true) {
    this._value = val;
    this.numslider.setValue(val, fire_onchange);
    this.updateTextBox();
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

    if (!prop) {
      return;
    }

    let val = this.getPathValue(this.ctx, this.getAttribute("datapath"));
    if (val !== this._last_value) {
      this._last_value = this._value = val;
      this.updateTextBox();
    }
  }

  update() {
    this.updateLabelOnTop();
    super.update();

    this.updateDataPath();
    let redraw = false;

    updateSliderFromDom(this.numslider, this);
    updateSliderFromDom(this.textbox, this);

    if (redraw) {
      this.setCSS();
      this.numslider.setCSS();
      this.numslider._redraw();
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
    this.textbox.setCSS();
    //textbox.style["margin"] = "5px";

  }
}

export class NumSliderSimple extends SliderWithTextbox {
  constructor() {
    super();

    this.numslider = UIBase.createElement("numslider-simple-base-x");
  }

  static define() {
    return {
      tagname: "numslider-simple-x",
      style  : "numslider_simple"
    }
  }

  _redraw() {
    this.numslider._redraw();
  }
}

UIBase.internalRegister(NumSliderSimple);

export class NumSliderWithTextBox extends SliderWithTextbox {
  constructor() {
    super();

    this.numslider = UIBase.createElement("numslider-x");
  }

  static define() {
    return {
      tagname: "numslider-textbox-x",
      style  : "numslider_textbox"
    }
  }

  _redraw() {
    this.numslider._redraw();
  }
}

UIBase.internalRegister(NumSliderWithTextBox);

