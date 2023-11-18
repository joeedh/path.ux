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
import {Unit} from '../core/units.js';

export const sliderDomAttributes = new Set([
  "min", "max", "integer", "displayUnit", "baseUnit", "labelOnTop",
  "radix", "step", "expRate", "stepIsRelative", "decimalPlaces",
  "slideSpeed", "sliderDisplayExp"
]);

function updateSliderFromDom(dom, slider = dom) {
  slider.loadNumConstraints(undefined, dom);
}

export const SliderDefaults = {
  stepIsRelative  : false,
  expRate         : 1.0 + 1.0/3.0,
  radix           : 10,
  decimalPlaces   : 4,
  baseUnit        : "none",
  displayUnit     : "none",
  slideSpeed      : 1.0,
  step            : 0.1,
  sliderDisplayExp: 1.0
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

    loadNumConstraints(prop, dom) {
      return super.loadNumConstraints(prop, dom, this._redraw);
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
      tagname          : "numslider-x",
      style            : "numslider",
      parentStyle      : "button",
      havePickClipboard: true,
    };
  }


  updateWidth(force = false) {
    let dpi = UIBase.getDPI();
    let wid = ~~(this.getDefault("width")*dpi);

    if (force || wid !== this._last_width) {
      this._last_width = wid;
      this.setCSS();
    }
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
      this.loadNumConstraints(prop);
    }

    super.updateDataPath();
  }

  update() {
    if (!!this._last_disabled !== !!this.disabled) {
      this._last_disabled = !!this.disabled;
      this._redraw();
      this.setCSS();
    }

    this.updateWidth();
    super.update(); //calls this.updateDataPath

    updateSliderFromDom(this);
  }

  clipboardCopy() {
    console.log("Copy", "" + this.value);
    cconst.setClipboardData("value", "text/plain", "" + this.value);
  }

  clipboardPaste() {
    let data = cconst.getClipboardData("text/plain");
    console.log("Paste", data);

    if (typeof data == "object") {
      data = data.data;
    }

    let displayUnit = this.editAsBaseUnit ? undefined : this.displayUnit;
    let val = units.parseValue(data, this.baseUnit, displayUnit);

    if (typeof val === "number" && !isNaN(val)) {
      this.setValue(val);
    }
  }

  swapWithTextbox() {
    let tbox = UIBase.createElement("textbox-x");

    if (this.modalRunning) {
      this.popModal();
    }

    this.mdown = false;
    this._pressed = false;

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
        this._pressed = false;
        e.stopPropagation();

        return;
      }

      if (e.button) {
        return;
      }

      this.mdown = true;
      this._pressed = true;
      this._redraw();

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

    this.addEventListener("pointermove", (e) => {
      this.setMpos(e);

      if (this.mdown && !this._modaldata && this.mpos.vectorDistance(this.start_mpos) > 13) {
        this.dragStart(e);
      }
    });

    this.addEventListener("dblclick", (e) => {
      this.setMpos(e);

      this.mdown = false;
      this._pressed = false;

      if (this.disabled || this.overArrow(e.x, e.y)) {
        e.preventDefault();
        e.stopPropagation();

        return;
      }

      e.preventDefault();
      e.stopPropagation();

      this.swapWithTextbox();
    });

    this.addEventListener("pointerdown", (e) => {
      this.setMpos(e);

      if (this.disabled) return;
      onmousedown(e);
    }, {capture: true});

    this.addEventListener("pointerup", (e) => {
      this.mdown = false;
      this._pressed = false;
      this._redraw();
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

    //this.addEventListener("pointerup", (e) => {
    //  return onmouseup(e);
    //});

    this.addEventListener("pointerover", (e) => {
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

    this.addEventListener("pointerout", (e) => {
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
    console.warn("Deprecated: NumSlider.prototype.doRange, use loadNumConstraints instead!");
    this.loadNumConstraints();
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
      this.loadNumConstraints();
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
    this._pressed = true;

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

      on_pointermove: (e) => {
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

      on_pointerup: (e) => {
        this.setMpos(e);

        this.undoBreakPoint();
        cancel(false);

        e.preventDefault();
        e.stopPropagation();
      },

      on_pointerout: (e) => {
        last_background = this.getDefault("background-color");

        e.preventDefault();
        e.stopPropagation();
      },

      on_pointerover: (e) => {
        last_background = this.getDefault("BoxHighlight");

        e.preventDefault();
        e.stopPropagation();
      },

      on_pointerdown: (e) => {
        this.popModal();
      },
    };

    //events.pushModal(this.getScreen(), handlers);
    this.pushModal(handlers);

    cancel = (restore_value) => {
      this._pressed = false;

      if (restore_value) {
        this.value = startvalue;
        this.updateWidth();
        fire();
      }

      this.dom._background = last_background; //ui_base.getDefault("background-color");
      this._redraw();

      this.popModal();
    }
  }

  get _pressed() {
    return this.__pressed;
  }

  set _pressed(v) {
    /* Try to improve usability on pen/touch displays
     * by forcing pressed state to last at least 100ms.
     */
    if (!v) {
      window.setTimeout(() => {
        let redraw = this.__pressed;

        this.__pressed = false;
        if (redraw) {
          this._redraw();
        }
      }, 100);
    } else {
      this.__pressed = v;
    }
  }

  setCSS(unused_setBG, fromRedraw) {
    /* Do not call parent class implementation. */

    let dpi = this.getDPI();
    let ts = this.getDefault("DefaultText").size*UIBase.getDPI();
    let label = this._genLabel();

    let tw = ui_base.measureText(this, label, {
      size: ts,
      font: this.getDefault("DefaultText")
    }).width/dpi;

    /* Enforce a minimum size based on final text. */
    tw = Math.max(tw + this._getArrowSize()*1, this.getDefault("width"));

    tw += ts;
    tw = ~~tw;

    let w, h;

    if (this.vertical) {
      w = this.getDefault("height");
      h = tw;
    } else {
      h = this.getDefault("height");
      w = tw;
    }

    w = ~~(w*dpi);
    h = ~~(h*dpi);

    this.style["width"] = this.dom.style["width"] = (w/dpi) + "px";
    this.style["height"] = this.dom.style["height"] = (h/dpi) + "px";
    this.dom.width = w;
    this.dom.height = h;

    if (!fromRedraw) {
      this._repos_canvas();
      this._redraw();
    }
  }

  _repos_canvas() {
    //super._repos_canvas();
  }

  updateDefaultSize() {
    /* Do nothing, don't invoke parent class method. */
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
      } else if (this.hasAttribute("name")) {
        text = "" + this.getAttribute("name") + ": " + text;
      }
    }

    return text;
  }

  _redraw(fromCSS) {
    if (!fromCSS) {
      this.setCSS(undefined, true);
    }

    let g = this.g;
    let canvas = this.dom;

    let dpi = this.getDPI();
    let disabled = this.disabled;

    /* Fallback on BoxHighlight for backwards compatibility with
     * old themes. */

    let over = !this._modaldata && this.overArrow(this.mpos[0], this.mpos[1]);

    let subkey = undefined;
    let pressed = this._pressed && !over;

    if (this._highlight && pressed) {
      subkey = "highlight-pressed";
    } else if (this._highlight) {
      subkey = "highlight";
    } else if (pressed) {
      subkey = "pressed";
    }

    let getDefault = (key, backupval = undefined, subkey2 = subkey) => {
      /* Have highlight-pressed fall back to pressed. */
      if (subkey2 === "highlight-pressed" && !this.hasClassSubDefault(subkey2, key, false)) {
        return this.getSubDefault("pressed", key, undefined, backupval);
      }

      if (!subkey2) {
        return this.getDefault(key, undefined, backupval);
      } else {
        return this.getSubDefault(subkey2, key, undefined, backupval);
      }
    }

    let r = getDefault("border-radius");
    if (this.isInt) {
      r *= 0.25;
    }

    let boxbg = getDefault("background-color");

    ui_base.drawRoundBox(this, this.dom, this.g, undefined, undefined,
      r, "fill", disabled ? getDefault("DisabledBG") : boxbg);
    ui_base.drawRoundBox(this, this.dom, this.g, undefined, undefined,
      r, "stroke", disabled ? getDefault("DisabledBG") : getDefault("border-color"));

    let ts = getDefault("DefaultText").size;
    let text = this._genLabel();

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
        size  : ts,
        font  : getDefault("DefaultText"),
      });
      g.restore();
    } else {
      ui_base.drawText(this, cx, cy + ts/2, text, {
        canvas: this.dom,
        g     : this.g,
        size  : ts,
        font  : getDefault("DefaultText"),
      });
    }

    let parseArrowColor = (arrowcolor) => {
      arrowcolor = arrowcolor.trim();
      if (arrowcolor.endsWith("%")) {
        arrowcolor = arrowcolor.slice(0, arrowcolor.length - 1).trim();

        let perc = parseFloat(arrowcolor)/100.0;
        let c = css2color(this.getDefault("background-color"));

        let f = (c[0] + c[1] + c[2])*perc;

        f = ~~(f*255);
        arrowcolor = `rgba(${f},${f},${f},0.95)`;

      }
      return arrowcolor;
    }

    let arrowcolor_base;
    let arrowcolor;

    arrowcolor_base = this.getDefault("arrow-color");
    arrowcolor_base = parseArrowColor(arrowcolor_base);

    if (this._pressed && this._highlight) {
      arrowcolor = this.getSubDefault("highlight-pressed", "arrow-color", null, undefined, false);

      if (!arrowcolor) {
        arrowcolor = this.getSubDefault("pressed", "arrow-color");
      }

      if (!arrowcolor) {
        arrowcolor = "33%";
      }
    } else if (this._pressed) {
      arrowcolor = this.getSubDefault("pressed", "arrow-color", "arrow-color", "33%");
    } else if (this._highlight) {
      if (!this.hasClassSubDefault("highlight", "arrow-color", false)) {
        if (this.hasClassSubDefault("highlight", "background-color", false)) {
          arrowcolor = this.getSubDefault("highlight", "background-color");
        } else {
          arrowcolor = this.getDefault("BoxHighlight");
        }

        arrowcolor = css2color(arrowcolor);
        let base = this.getSubDefault("pressed", "arrow-color", undefined, "33%");
        base = css2color(base);

        arrowcolor.interp(base, 0.25);
        arrowcolor = color2css(arrowcolor);
      } else {
        arrowcolor = this.getSubDefault("highlight", "arrow-color");
      }
    } else {
      arrowcolor = getDefault("arrow-color", "33%");
    }

    if (this._pressed) {
//      arrowcolor = this.getSubDefault("pressed", "arrow-color");
    }

    arrowcolor = parseArrowColor(arrowcolor);


    let d = 7, w = canvas.width, h = canvas.height;
    let sz = this._getArrowSize();

    if (this.vertical) {
      g.beginPath();
      g.moveTo(w*0.5, d);
      g.lineTo(w*0.5 + sz*0.5, d + sz);
      g.lineTo(w*0.5 - sz*0.5, d + sz);

      g.fillStyle = over < 0 ? arrowcolor : arrowcolor_base;
      g.fill();

      g.beginPath();
      g.moveTo(w*0.5, h - d);
      g.lineTo(w*0.5 + sz*0.5, h - sz - d);
      g.lineTo(w*0.5 - sz*0.5, h - sz - d);

      g.fillStyle = over > 0 ? arrowcolor : arrowcolor_base;
      g.fill();
    } else {
      g.beginPath();
      g.moveTo(d, h*0.5);
      g.lineTo(d + sz, h*0.5 + sz*0.5);
      g.lineTo(d + sz, h*0.5 - sz*0.5);

      g.fillStyle = over < 0 ? arrowcolor : arrowcolor_base;
      g.fill();

      g.beginPath();
      g.moveTo(w - d, h*0.5);
      g.lineTo(w - sz - d, h*0.5 + sz*0.5);
      g.lineTo(w - sz - d, h*0.5 - sz*0.5);

      g.fillStyle = over > 0 ? arrowcolor : arrowcolor_base;
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
    this.sliderDisplayExp = undefined;

    this.canvas = document.createElement("canvas");
    this.g = this.canvas.getContext("2d");

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

      this.loadNumConstraints(prop);
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
      pointermove: (e) => {
        let x = e.x, y = e.y;

        x = this.ma.add(x);

        let e2 = new MouseEvent(e, {
          x, y
        });
        this._setFromMouse(e);
      },

      pointerover : (e) => {
      },
      pointerout  : (e) => {
      },
      pointerleave: (e) => {
      },
      pointerenter: (e) => {
      },
      blur        : (e) => {
      },
      focus       : (e) => {
      },

      pointerup: (e) => {
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

    this.addEventListener("pointerdown", (e) => {
      if (this.disabled) {
        return;
      }

      /* ensure browser doesn't spawn its own (incompatible)
         touch->mouse emulation events}; */
      e.preventDefault();
      this._startModal(e);
    });

    this.addEventListener("pointerin", (e) => {
      this.setHighlight(e);
      this._redraw();
    });
    this.addEventListener("pointerout", (e) => {
      this.highlight = false;
      this._redraw();
    });
    this.addEventListener("pointerover", (e) => {
      this.setHighlight(e);
      this._redraw();
    });
    this.addEventListener("pointermove", (e) => {
      this.setHighlight(e);
      this._redraw();
    });
    this.addEventListener("pointerleave", (e) => {
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

    if (this.sliderDisplayExp && this.sliderDisplayExp !== 1.0) {
      g.strokeStyle = this.getDefault("SliderDivColor")
        || this.getDefault("border-color")
        || "grey";

      let steps = 8;
      let t = 0.0, dt = 1.0/(steps - 1);

      g.beginPath();
      for (let i = 0; i < steps; i++, t += dt) {
        let t2 = Math.pow(t, this.sliderDisplayExp);

        let x = t2*w;
        g.moveTo(x, y);
        g.lineTo(x, h - y);
      }
      g.stroke();
    }

    if (this.highlight === 1) {
      color = this.getDefault("BoxHighlight");
    } else {
      color = this.getDefault("border-color");
    }

    //g.strokeStyle = color;
    //g.stroke();

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
    if (this.sliderDisplayExp) {
      x = Math.max(x, 0.0);
      x = Math.pow(x, 1.0/this.sliderDisplayExp);
    }
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

    if (this.sliderDisplayExp) {
      x = Math.pow(x, this.sliderDisplayExp);
    }

    let boxw = this.canvas.height - 4;
    let w2 = w - boxw;

    x = x*w2 + boxw*0.5;

    return [x, boxw*0.5, boxw*0.5];
  }

  setCSS() {
    //UIBase.setCSS does annoying things with background-color
    //super.setCSS();

    const dpi = UIBase.getDPI();
    this.style["min-width"] = this.getDefault("width") + "px";
    this.style["width"] = this.getDefault("width") + "px";

    this.canvas.style["width"] = "" + (this.canvas.width/dpi) + "px";
    this.canvas.style["height"] = "" + (this.canvas.height/dpi) + "px`";

    this.canvas.height = this.getDefault("height")*UIBase.getDPI();

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
    let canvas = this.canvas;
    let w = ~~(rect.width*dpi), h = ~~(rect.height*dpi);

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

    /*
    if (this.checkThemeUpdate()) {
      this._redraw();
    }
    */

    let key = "" + this.getDefault("width") + ":" + this.getDefault("height") + ":" + this.getDefault("SlideHeight");

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
    this.textbox.startSelected = true;

    this._last_value = undefined;
  }

  get addLabel() {
    if (this.hasAttribute("add-label")) {
      let val = ("" + this.getAttribute("add-label")).toLowerCase();
      return val === "true" || val === "yes";
    }

    return this.getDefault("addLabel");
  }

  set addLabel(v) {
    this.setAttribute("add-label", v ? "true" : "false");

    if (this.addLabel && !this.l) {
      this.doOnce(this.rebuild);
    }
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

  get sliderDisplayExp() {
    return this.numslider.sliderDisplayExp;
  }

  set sliderDisplayExp(v) {
    this.numslider.sliderDisplayExp = v;
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
    return this.numslider.displayUnit;
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
      this._name = this.getAttribute("name");
    } else {
      this._name = "slider";
    }


    if (this.addLabel) {
      this.l = this.container.label(this._name);
      this.l.overrideClass("numslider_textbox");
      this.l.font = "TitleText";
      this.l.style["display"] = "float";
      this.l.style["position"] = "relative";
    }

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

    if (this._lock_textbox > 0 || this.textbox.editing)
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
      if (this.l) {
        this.l.text = name;
      }
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

    updateSliderFromDom(this, this.numslider);
    updateSliderFromDom(this, this.textbox);

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
      this.textbox.setAttribute("datapath", this.getAttribute("datapath"));
    }

    if (this.hasAttribute("mass_set_path")) {
      this.numslider.setAttribute("mass_set_path", this.getAttribute("mass_set_path"))
      this.textbox.setAttribute("mass_set_path", this.getAttribute("mass_set_path"));
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

  update() {
    super.update();

    if (this.hasAttribute("name")) {
      let name = this.getAttribute("name");

      if (name !== this.numslider.name) {
        this.numslider.setAttribute("name", name);
        this.numslider._redraw();
      }
    }
  }

  _redraw() {
    this.numslider._redraw();
  }
}

UIBase.internalRegister(NumSliderWithTextBox);

