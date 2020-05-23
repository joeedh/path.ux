import {UIBase, drawText} from "../core/ui_base.js";
import {ValueButtonBase} from "./ui_widgets.js";
import * as ui_base from "../core/ui_base.js";
import * as units from "../core/units.js";
import {Vector2} from "../util/vectormath.js";
import {ColumnFrame} from "../core/ui.js";
import * as util from "../util/util.js";
import {PropTypes, PropSubTypes, PropFlags} from "../toolsys/toolprop.js";
import {pushModalLight, popModalLight} from "../util/simple_events.js";
import {KeyMap, keymap} from "../util/simple_events.js";

//use .setAttribute("linear") to disable nonlinear sliding
export class NumSlider extends ValueButtonBase {
  constructor() {
    super();

    this._last_label = undefined;

    this._name = "";
    this._step = 0.1;
    this._value = 0.0;
    this._expRate = 1.333;
    this.decimalPlaces = 4;
    this.radix = 10;

    this.range = [-1e17, 1e17];
    this.isInt = false;

    this._redraw();
  }

  get step() {
    return this._step;
  }

  set step(v) {
    this._step = v;
  }

  get expRate() {
    return this._expRate;
  }

  set expRate(v) {
    this._expRate = v;
  }

  updateDataPath() {
    if (!this.hasAttribute("datapath")) {
      return;
    }

    let rdef = this.ctx.api.resolvePath(this.ctx, this.getAttribute("datapath"));
    let prop = rdef ? rdef.prop : undefined;

    if (!prop)
      return;

    if (prop.expRate) {
      this._expRate = prop.expRate;
    }
    if (prop.radix !== undefined) {
      this.radix = prop.radix;
    }

    if (prop.step) {
      this._step = prop.getStep(rdef.value);
    }
    if (prop.decimalPlaces !== undefined) {
      this.decimalPlaces = prop.decimalPlaces;
    }

    if (prop.baseUnit !== undefined) {
      this.baseUnit = prop.baseUnit;
    }

    if (prop.displayUnit !== undefined) {
      this.displayUnit = prop.displayUnit;
    }

    super.updateDataPath();
  }

  update() {
    super.update();
    this.updateDataPath();
  }

  swapWithTextbox() {
    let tbox = document.createElement("textbox-x");

    tbox.ctx = this.ctx;
    tbox._init();

    tbox.decimalPlaces = this.decimalPlaces;
    tbox.isInt = this.isInt;

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
          val = units.parseValue(val, this.baseUnit);
        }

        if (isNaN(val)) {
          console.log("EEK!");
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
    let onmousedown = (e) => {
      if (this.disabled) {
        e.preventDefault();
        e.stopPropagation();

        return;
      }

      if (e.button == 0 && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();

        this.swapWithTextbox();
      } else if (e.button == 0) {
        this.dragStart(e);

        e.preventDefault();
        e.stopPropagation();
      }
    }

    this.addEventListener("dblclick", (e) => {
      if (this.disabled) {
        e.preventDefault();
        e.stopPropagation();

        return;
      }

      e.preventDefault();
      e.stopPropagation();
      this.swapWithTextbox();
    });

    this.addEventListener("mousedown", (e) => {
      if (this.disabled) return;
      onmousedown(e);
    });

    this.addEventListener("touchstart", (e) => {
      if (this.disabled) return;
      console.log(e)

      e.x = e.touches[0].screenX;
      e.y = e.touches[0].screenY;

      this.dragStart(e);

      e.preventDefault();
      e.stopPropagation();
    }, {passive : false});

    //this.addEventListener("touchstart", (e) => {
    //  console.log(e);
    //});

    this.addEventListener("mouseover", (e) => {
      if (this.disabled) return;

      this.dom._background = this.getDefault("BoxHighlight");
      this._repos_canvas();
      this._redraw();
      //console.log("mouse enter");
    })

    this.addEventListener("mouseout", (e) => {
      if (this.disabled) return;

      this.dom._background = this.getDefault("BoxBG");
      this._repos_canvas();
      this._redraw();
      //console.log("mouse leave!");
    })
  }

  doRange() {
    if (this.hasAttribute("min")) {
      this.range[0] = parseFloat(this.getAttribute("min"));
    }
    if (this.hasAttribute("max")) {
      this.range[1] = parseFloat(this.getAttribute("max"));
    }

    this._value = Math.min(Math.max(this._value, this.range[0]), this.range[1]);
  }

  get value() {
    return this._value;
  }

  set value(val) {
    this.setValue(val, true, false);
  }

  setValue(value, fire_onchange=true) {
    this._value = value;

    if (this.hasAttribute("integer")) {
      this.isInt = true;
    }

    if (this.isInt) {
      this._value = Math.floor(this._value);
    }

    this.doRange();

    if (this.ctx && this.hasAttribute("datapath")) {
      this.setPathValue(this.ctx, this.getAttribute("datapath"), this._value);
    }

    if (fire_onchange && this.onchange) {
      this.onchange(this.value);
    }

    this._redraw();
  }

  dragStart(e) {
    if (this.disabled) return;

    let last_background = this.dom._background;
    let cancel;

    let startvalue = this.value;
    let value = startvalue;

    let startx = e.x, starty = e.y;

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

        let dx = e.x - startx;
        startx = e.x;

        if (e.shiftKey) {
          dx *= 0.1;
        }

        value += dx * this._step * 0.1;

        let dvalue = value - startvalue;
        let dsign = Math.sign(dvalue);

        if (!this.hasAttribute("linear")) {
          dvalue = Math.pow(Math.abs(dvalue), this._expRate) * dsign;
        }

        this.value = startvalue + dvalue;
        this.doRange();

        /*
        if (e.shiftKey) {
          dx *= 0.1;
          this.value = startvalue2 + dx*0.1*this._step;
          startvalue3 = this.value;
        } else {
          startvalue2 = this.value;
          this.value = startvalue3 + dx*0.1*this._step;
        }*/

        this.updateWidth();
        this._redraw();
        fire();
      },

      on_mouseup: (e) => {
        cancel(false);
        e.preventDefault();
        e.stopPropagation();
      },

      on_mouseout: (e) => {
        //console.log("leave");
        last_background = this.getDefault("BoxBG");

        e.preventDefault();
        e.stopPropagation();
      },

      on_mouseover: (e) => {
        //console.log("over");
        last_background = this.getDefault("BoxHighlight");

        e.preventDefault();
        e.stopPropagation();
      },

      on_mousedown : (e) => {
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

      this.dom._background = last_background; //ui_base.getDefault("BoxBG");
      this._redraw();

      console.trace("end");

      this.popModal();
    }

    /*
    cancel = (restore_value) => {
      if (restore_value) {
        this.value = startvalue;
        this.updateWidth();
        fire();
      }

      this.dom._background = last_background; //ui_base.getDefault("BoxBG");
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

    let ts = this.getDefault("DefaultText").size;

    let dd = this.isInt ? 5 : this.decimalPlaces + 8;

    let label = this._name;
    if (this.isInt) {
      label += ": 0";
      for (let i=0; i<this.radix; i++) {
        label += "0";
      }
    } else {
      label += ": 0.";
      for (let i=0; i<this.decimalPlaces+1; i++) {
        label += "0";
      }
    }

    let tw = ui_base.measureText(this, label, undefined, undefined,
      ts, this.getDefault("DefaultText")).width ;

    tw += this._getArrowSize()*2.0 + ts;
    tw = ~~tw;

    let defw = this.getDefault("numslider_width");

    //tw = Math.max(tw, w);

    this.style["width"] = tw+"px";
    this.dom.style["width"] = tw+"px";

    this._repos_canvas();
    this._redraw();
  }

  updateName(force) {
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

      val = units.buildString(val, this.baseUnit, this.decimalPlaces, this.displayUnit);
      //val = myToFixed(val, this.decimalPlaces);

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

    //console.log("numslider draw");

    let dpi = this.getDPI();
    let disabled = this.disabled; //this.hasAttribute("disabled");

    let r = this.getDefault("BoxRadius");
    if (this.isInt) {
      r *= 0.25;
    }

    ui_base.drawRoundBox(this, this.dom, this.g, undefined, undefined,
      r, undefined, disabled ? this.getDefault("DisabledBG") : undefined);

    r *= dpi;
    let pad = this.getDefault("BoxMargin");
    let ts = this.getDefault("DefaultText").size;

    //if (this.value !== undefined) {
    let text = this._genLabel();

    let tw = ui_base.measureText(this, text, this.dom, this.g).width;
    let cx = ts + this._getArrowSize();//this.dom.width/2 - tw/2;
    let cy = this.dom.height/2;

    this.dom.font = undefined;

    ui_base.drawText(this, cx, cy + ts/2, text, {
      canvas : this.dom,
      g      : this.g,
      size   : ts
    });

    //}

    let c = css2color(this.getDefault("BoxBG"));
    let f = 1.0 - (c[0]+c[1]+c[2])*0.33;
    f = ~~(f*255);

    g.fillStyle = `rgba(${f},${f},${f},0.95)`;

    let d = 7, w=canvas.width, h=canvas.height;
    let sz = this._getArrowSize();

    g.beginPath();
    g.moveTo(d, h*0.5);
    g.lineTo(d+sz, h*0.5 + sz*0.5);
    g.lineTo(d+sz, h*0.5 - sz*0.5);

    g.moveTo(w-d, h*0.5);
    g.lineTo(w-sz-d, h*0.5 + sz*0.5);
    g.lineTo(w-sz-d, h*0.5 - sz*0.5);

    g.fill();
  }

  _getArrowSize() {
    return UIBase.getDPI()*10;
  }
  static define() {return {
    tagname : "numslider-x",
    style : "numslider"
  };}
}
UIBase.register(NumSlider);


export class NumSliderSimpleBase extends UIBase {
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
UIBase.register(NumSliderSimpleBase);

export class SliderWithTextbox extends ColumnFrame {
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
    this.textbox.width = 55;
    this._numslider = undefined;

    this.textbox.setAttribute("class", "numslider_simple_textbox");
  }


  get numslider() {
    return this._numslider;
  }

  //child classes set this in their constructors
  set numslider(v) {
    this._numslider = v;
    this.textbox.range = this._numslider.range;
  }

  set range(v) {
    this.numslider.range = v;
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
    this.textbox.setCSS();
    //textbox.style["margin"] = "5px";

  }
}

export class NumSliderSimple extends SliderWithTextbox {
  constructor() {
    super();

    this.numslider = document.createElement("numslider-simple-base-x");

  }
  static define() {return {
    tagname : "numslider-simple-x",
    style : "numslider_simple"
  }}
}
UIBase.register(NumSliderSimple);

export class NumSliderWithTextBox extends SliderWithTextbox {
  constructor() {
    super();

    this.numslider = document.createElement("numslider-x");

  }
  static define() {return {
    tagname : "numslider-textbox-x",
    style : "numslider-textbox-x"
  }}
}
UIBase.register(NumSliderWithTextBox);
