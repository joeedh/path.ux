import {UIBase, drawText} from "../core/ui_base.js";
import {ValueButtonBase} from "./ui_widgets.js";
import * as cconst from '../config/const.js';
import * as ui_base from "../core/ui_base.js";
import * as units from "../core/units.js";
import {Vector2} from "../path-controller/util/vectormath.js";
import {ColumnFrame} from "../core/ui.js";
import * as util from "../path-controller/util/util.js";
import {PropTypes, isNumber, PropSubTypes, PropFlags} from "../path-controller/toolsys/toolprop.js";
import {pushModalLight, popModalLight} from "../path-controller/util/simple_events.js";
import {KeyMap, keymap} from "../path-controller/util/simple_events.js";

//use .setAttribute("linear") to disable nonlinear sliding
export class NumSlider extends ValueButtonBase {
  constructor() {
    super();

    this._last_label = undefined;

    this.mdown = false;

    this._name = "";
    this._step = 0.1;
    this._value = 0.0;
    this._expRate = 1.333;
    this.decimalPlaces = 4;
    this.radix = 10;

    this.vertical = false;
    this._last_disabled = false;

    this.range = [-1e17, 1e17];
    this.isInt = false;
    this.editAsBaseUnit = undefined;

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

    if (this.editAsBaseUnit === undefined) {
      if (prop.flag & PropFlags.EDIT_AS_BASE_UNIT) {
        this.editAsBaseUnit = true;
      } else {
        this.editAsBaseUnit = false;
      }
    }

    if (prop.displayUnit !== undefined) {
      this.displayUnit = prop.displayUnit;
    }

    super.updateDataPath();
  }

  update() {
    if (!!this._last_disabled !== !!this.disabled) {
      this._last_disabled = !!this.disabled;
      this._redraw();
      this.setCSS();
    }

    super.update();
    this.updateDataPath();
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
      if (this.disabled) {
        e.preventDefault();
        e.stopPropagation();

        return;
      }

      if (e.button === 0 && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();

        this.swapWithTextbox();
      } else if (!e.button) {
        this.dragStart(e);
        this.mdown = true;

        e.preventDefault();
        e.stopPropagation();
      }
    }

    let onmouseup = this._on_click = (e) => {
      this.mdown = false;

      if (this.disabled) {
        e.preventDefault();
        e.stopPropagation();

        return;
      }

      let r = this.getClientRects()[0];
      let x = e.x;

      if (r) {
        x -= r.x;
        let sz = this._getArrowSize();

        let v = this.value;

        let step = this.step || 0.01;
        if (this.isInt) {
          step = Math.max(step, 1);
        } else {
          step *= 5.0;
        }

        let szmargin = Math.min(sz*8.0, r.width*0.4);

        if (x < szmargin) {
          this.setValue(v - step);
        } else if (x > r.width - szmargin) {
          this.setValue(v + step);
        }
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
      if (this.disabled) return;

      this.dom._background = this.getDefault("BoxHighlight");
      this._repos_canvas();
      this._redraw();
    })

    this.addEventListener("blur", (e) => {
      this.mdown = false;
    });

    this.addEventListener("mouseout", (e) => {
      if (this.disabled) return;

      this.dom._background = this.getDefault("BoxBG");
      this._repos_canvas();
      this._redraw();
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

        let dx = (this.vertical ? e.y : e.x) - startx;
        startx = (this.vertical ? e.y : e.x)

        if (e.shiftKey) {
          dx *= 0.1;
        }

        dx *= this.vertical ? -1 : 1;

        sumdelta += Math.abs(dx);

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
        let dpi = UIBase.getDPI();

        let limit = cconst.numSliderArrowLimit;
        limit = limit === undefined ? 6 : limit;
        limit *= dpi;

        let dv = this.vertical ? starty - e.y : startx - e.x;

        this.undoBreakPoint();
        cancel(false);

        //check for arrow click
        if (sumdelta < limit) {
          this._on_click(e);
        }

        e.preventDefault();
        e.stopPropagation();
      },

      on_mouseout: (e) => {
        last_background = this.getDefault("BoxBG");

        e.preventDefault();
        e.stopPropagation();
      },

      on_mouseover: (e) => {
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

    let ts = this.getDefault("DefaultText").size*UIBase.getDPI();

    let dd = this.isInt ? 5 : this.decimalPlaces + 8;

    let label = this._genLabel();

    let tw = ui_base.measureText(this, label, {
      size :ts,
      font : this.getDefault("DefaultText")
    }).width / dpi;

    tw = Math.max(tw + this._getArrowSize()*0, this.getDefault("defaultWidth"));

    tw += ts;
    tw = ~~tw;

    //tw = Math.max(tw, w);
    if (this.vertical) {
      this.style["width"] = this.dom.style["width"] = this.getDefault("defaultHeight") + "px";

      this.style["height"] = tw+"px";
      this.dom.style["height"] = tw+"px";
    } else {
      this.style["height"] = this.dom.style["height"] = this.getDefault("defaultHeight") + "px";

      this.style["width"] = tw+"px";
      this.dom.style["width"] = tw+"px";
    }

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

    let dpi = this.getDPI();
    let disabled = this.disabled;

    let r = this.getDefault("BoxRadius");
    if (this.isInt) {
      r *= 0.25;
    }

    let boxbg = this.getDefault("BoxBG");

    ui_base.drawRoundBox(this, this.dom, this.g, undefined, undefined,
      r, undefined, disabled ? this.getDefault("DisabledBG") : boxbg);

    r *= dpi;
    let pad = this.getDefault("BoxMargin");
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
        g: this.g,
        size: ts
      });
      g.restore();
    } else {
      ui_base.drawText(this, cx, cy + ts / 2, text, {
        canvas: this.dom,
        g: this.g,
        size: ts
      });
    }

    //}

    let c = css2color(this.getDefault("BoxBG"));
    let f = 1.0 - (c[0]+c[1]+c[2])*0.33;
    f = ~~(f*255);

    g.fillStyle = `rgba(${f},${f},${f},0.95)`;

    let d = 7, w=canvas.width, h=canvas.height;
    let sz = this._getArrowSize();

    if (this.vertical) {
      g.beginPath();
      g.moveTo(w*0.5, d);
      g.lineTo(w*0.5 + sz*0.5, d+sz);
      g.lineTo(w*0.5 - sz*0.5, d+sz);

      g.moveTo(w*0.5, h-d);
      g.lineTo(w*0.5 + sz*0.5, h-sz-d);
      g.lineTo(w*0.5 - sz*0.5, h-sz-d);
    } else {
      g.beginPath();
      g.moveTo(d, h*0.5);
      g.lineTo(d+sz, h*0.5 + sz*0.5);
      g.lineTo(d+sz, h*0.5 - sz*0.5);

      g.moveTo(w-d, h*0.5);
      g.lineTo(w-sz-d, h*0.5 + sz*0.5);
      g.lineTo(w-sz-d, h*0.5 - sz*0.5);
    }

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
UIBase.internalRegister(NumSlider);


export class NumSliderSimpleBase extends UIBase {
  constructor() {
    super();

    this.baseUnit = undefined;
    this.displayUnit = undefined;
    this.editAsBaseUnit = undefined;

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

  setValue(val, fire_onchange=true) {
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
    if (this.disabled) {
      return;
    }

    if (e !== undefined) {
      this._setFromMouse(e);
    }
    let dom = window;
    let evtargs = {capture : false};

    if (this.modal) {
      console.warn("Double call to _startModal!");
      return;
    }

    let end = () => {
      if (this._modal === undefined) {
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
        this.undoBreakPoint();
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
    this.highlight =  this.isOverButton(e) ? 2 : 1;
  }

  _redraw() {
    let g = this.g, canvas = this.canvas;
    let w = canvas.width, h = canvas.height;
    let dpi = UIBase.getDPI();

    let color = this.getDefault("BoxBG");
    let sh = ~~(this.getDefault("SlideHeight")*dpi + 0.5);

    g.clearRect(0, 0, canvas.width, canvas.height);

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

    x = x*w2 + boxw*0.5;

    return [x, boxw*0.5, boxw*0.5];
  }
  setCSS() {
    //UIBase.setCSS does annoying thing with background-color
    //super.setCSS();

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
UIBase.internalRegister(NumSliderSimpleBase);

export class SliderWithTextbox extends ColumnFrame {
  constructor() {
    super();

    this._value = 0;
    this._name = undefined;
    this._lock_textbox = false;
    this._labelOnTop = undefined;

    this._last_label_on_top = undefined;

    this.styletag.textContent = `
    .numslider_simple_textbox {
      padding : 0px;
      margin  : 0px;
      height  : 15px;
    }
    `;

    this.container = this;

    this.textbox = UIBase.createElement("textbox-x");
    this.textbox.width = 55;
    this._numslider = undefined;

    this.textbox.setAttribute("class", "numslider_simple_textbox");
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

  set range(v) {
    this.numslider.range = v;
  }
  get range() {
    return this.numslider.range;
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

  init() {
    super.init();

    this.rebuild();
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

    if (!this.labelOnTop && !(this.numslider instanceof NumSlider)) {
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

  setValue(val, fire_onchange=true) {
    this._value = val;
    this.numslider.setValue(val, fire_onchange);
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

    if (!prop) {
      return;
    }

    if (!this.baseUnit && prop.baseUnit) {
      this.baseUnit = prop.baseUnit;
    }

    if (prop.decimalPlaces !== undefined) {
      this.decimalPlaces = prop.decimalPlaces;
    }

    if (this.editAsBaseUnit === undefined) {
      if (prop.flag & PropFlags.EDIT_AS_BASE_UNIT) {
        this.editAsBaseUnit = true;
      } else {
        this.editAsBaseUnit = false;
      }
    }

    if (!this.displayUnit && prop.displayUnit) {
      this.displayUnit = prop.displayUnit;
    }
  }

  update() {
    this.updateLabelOnTop();
    super.update();

    this.updateDataPath();
    let redraw = false;

    if (this.hasAttribute("min")) {
      let r = this.range[0];
      this.range[0] = parseFloat(this.getAttribute("min"));
      redraw = Math.abs(this.range[0]-r) > 0.0001;
    }

    if (this.hasAttribute("max")) {
      let r = this.range[1];
      this.range[1] = parseFloat(this.getAttribute("max"));
      redraw = redraw || Math.abs(this.range[1]-r) > 0.0001;
    }

    if (this.hasAttribute("integer")) {
      let val = this.getAttribute("integer");
      val = val || val === null;

      redraw = redraw || !!val !== this.isInt;

      this.isInt = !!val;
      this.numslider.isInt = !!val;
      this.textbox.isInt = !!val;
    }

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

  static define() {return {
    tagname : "numslider-simple-x",
    style : "numslider_simple"
  }}
}
UIBase.internalRegister(NumSliderSimple);

export class NumSliderWithTextBox extends SliderWithTextbox {
  constructor() {
    super();

    this.numslider = UIBase.createElement("numslider-x");
  }

  _redraw() {
    this.numslider._redraw();
  }
  
  static define() {return {
    tagname : "numslider-textbox-x",
    style : "numslider_textbox"
  }}
}
UIBase.internalRegister(NumSliderWithTextBox);

