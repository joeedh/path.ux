"use strict";

import * as util from '../path-controller/util/util.js';
import * as vectormath from '../path-controller/util/vectormath.js';
import * as ui_base from '../core/ui_base.js';
import * as events from '../path-controller/util/events.js';
import * as simple_toolsys from '../path-controller/toolsys/toolsys.js';
import * as toolprop from '../path-controller/toolsys/toolprop.js';
import {DataPathError} from '../path-controller/controller/controller.js';
import {Vector3, Vector4, Quat, Matrix4} from '../path-controller/util/vectormath.js';
import cconst from '../config/const.js';
import {_themeUpdateKey, CSSFont} from "../core/ui_base.js";

let keymap = events.keymap;

let EnumProperty = toolprop.EnumProperty,
    PropTypes    = toolprop.PropTypes;

let UIBase     = ui_base.UIBase,
    PackFlags  = ui_base.PackFlags,
    IconSheets = ui_base.IconSheets;

let parsepx = ui_base.parsepx;

cconst.DEBUG.buttonEvents = true;

export class ButtonEventBase extends UIBase {
  constructor() {
    super();

    this._auto_depress = true;
    this._highlight = false;
    this._pressed = false;
  }

  bindEvents() {
    let press_gen = 0;
    let depress;

    let press = (e) => {
      e.stopPropagation();

      if (!this.modalRunning) {
        let this2 = this;

        this.pushModal({
          on_pointerdown(e) {
            this.end(e);
          },

          on_pointerup(e) {
            this.end(e);
          },

          on_pointercancel(e) {
            console.warn("Pointer cancel in button");
            this2.popModal();
          },

          on_keydown(e) {
            switch (e.keyCode) {
              case keymap["Enter"]:
              case keymap["Escape"]:
              case keymap["Space"]:
                this.end();
                break;
            }
          },

          end(e) {
            if (!this2.modalRunning) {
              return;
            }

            this2.popModal();
            depress(e);
          }
        }, undefined, e.pointerId);
      }

      if (cconst.DEBUG.buttonEvents) {
        console.log("button press", this._pressed, this.disabled, e.button);
      }

      if (this.disabled) return;

      this._pressed = true;

      if (this._onpress) {
        this._onpress(this);
      }

      this._redraw();

      e.preventDefault();
    };

    depress = (e) => {
      if (cconst.DEBUG.buttonEvents)
        console.log("button depress", e.button, e.was_touch);

      if (this._auto_depress) {
        this._pressed = false;

        if (this.disabled) return;

        this._redraw();
      }

      if (e) {
        e.preventDefault();
        e.stopPropagation();

        if (util.isMobile() || e.type === "pointerup" && e.button) {
          return;
        }
      }

      this._redraw();

      if (cconst.DEBUG.buttonEvents)
        console.log("button click callback:", this.onclick, this._onpress, this.onpress);

      if (this.onclick && e && e.pointerType !== "mouse") {
        this.onclick(this);
      }

      this.undoBreakPoint();
    }

    this.addEventListener("click", () => {
      this._pressed = false;
      this._highlight = false;
      this._redraw();
    });

    this.addEventListener("pointerdown", press, {captured: true, passive: false});
    this.addEventListener("pointerup", depress, {captured: true, passive: false});
    this.addEventListener("pointerover", (e) => {
      if (this.disabled)
        return;

      this._highlight = true;
      this._redraw();
    })

    this.addEventListener("pointerout", (e) => {
      if (this.disabled)
        return;

      this._highlight = false;
      this._redraw();
    })

    this.addEventListener("keydown", (e) => {
      if (this.disabled) return;

      if (cconst.DEBUG.buttonEvents)
        console.log(e.keyCode);

      switch (e.keyCode) {
        case 27: //escape
          this.blur();
          e.preventDefault();
          e.stopPropagation();
          break;
        case 32: //spacebar
        case 13: //enter
          this.click();
          e.preventDefault();
          e.stopPropagation();
          break;
      }
    });

    this.addEventListener("focusin", () => {
      if (this.disabled) return;

      this._focus = 1;
      this._redraw();
      this.focus();
    });

    this.addEventListener("blur", () => {
      if (this.disabled) return;

      this._focus = 0;
      this._redraw();
    });
  }

  _redraw() {

  }
}

export class Button extends ButtonEventBase {
  constructor() {
    super();

    this.label = document.createElement("span");
    this.label.innerText = "button";
    this.shadow.appendChild(this.label);

    this.label.style["pointer-events"] = "none";

    this._pressed = false;
    this._highlight = false;
    this._pressedTime = 0;
    this._pressedTimeout = 100;

    this._auto_depress = true;

    this._last_name = undefined;
    this._last_disabled = undefined;
  }

  get name() {
    return "" + this.getAttribute("name");
  }

  set name(val) {
    this.setAttribute("name", val);
  }

  get _pressed() {
    return this.__pressed;
  }

  set _pressed(v) {
    let changed = !v !== !this._pressed;

    if (v) {
      this._pressedTime = util.time_ms();
    } else if (changed && util.time_ms() - this._pressedTime < this._pressedTimeout) {
      window.setTimeout(() => {
        this.setCSS();
      }, this._pressedTimeout - (util.time_ms() - this._pressedTime) + 1);
    }

    this.__pressed = v;
  }

  static define() {
    return {
      tagname: "button-x",
      style  : "button"
    };
  }

  init() {
    super.init();
    this.tabIndex = 0;

    this.bindEvents();

    this.setCSS();
  }

  on_enabled() {
    this.setCSS();
  }

  on_disabled() {
    this.setCSS();
  }

  setCSS() {
    super.setCSS();

    if (this.hasDefault("pressedTimeout")) {
      this._pressedTimeout = this.getDefault("pressedTimeout");
    }

    let subkey = undefined;

    let pressed = this._pressed;
    if (!pressed && util.time_ms() - this._pressedTime < this._pressedTimeout) {
      pressed = true;
    }

    if (this.disabled) {
      subkey = "disabled";
    } else if (pressed && this._highlight) {
      subkey = "highlight-pressed";
    } else if (pressed) {
      subkey = "pressed";
    } else if (this._highlight) {
      subkey = "highlight";
    }

    let h = this.getDefault("height");

    this.setBoxCSS(subkey);

    this.label.style["padding"] = this.label.style["margin"] = "0px";
    this.style["background-color"] = this.getSubDefault(subkey, "background-color");

    let font = this.getSubDefault(subkey, "DefaultText");
    this.label.style["font"] = font.genCSS();
    this.label.style["color"] = font.color;

    this.style["display"] = "flex";
    this.style["align-items"] = "center";
    this.style["width"] = "max-content";
    this.style["height"] = h + "px";

    this.style["user-select"] = "none";
    this.label.style["user-select"] = "none";
  }

  click() {
    if (this._onpress) {
      let rect = this.getClientRects();
      let x = rect.x + rect.width*0.5;
      let y = rect.y + rect.height*0.5;

      let e = {
        x                : x, y: y, stopPropagation: () => {
        }, preventDefault: () => {
        }
      };

      this._onpress(e);
    }

    super.click();
  }

  _redraw() {
    this.setCSS();
  }

  updateDisabled() {
    if (this._last_disabled !== this.disabled) {
      this._last_disabled = this.disabled;

      //setTimeout(() => {

      this._redraw();

      if (cconst.DEBUG.buttonEvents)
        console.log("disabled update!", this.disabled, this.style["background-color"]);
      //}, 100);
    }
  }

  update() {
    if (this._last_name !== this.name) {
      this.label.innerHTML = this.name;
      this._last_name = this.name;
    }
  }
}

UIBase.register(Button);

//use .setAttribute("linear") to disable nonlinear sliding
export class OldButton extends ButtonEventBase {
  constructor() {
    super();

    let dpi = this.getDPI();

    this._last_but_update_key = "";

    this._name = "";
    this._namePad = undefined;
    this._leftPad = 5; //extra pad before text
    this._rightPad = 5; //extra pad after text

    this._last_w = 0;
    this._last_h = 0;

    this._last_dpi = dpi;

    this._lastw = undefined;
    this._lasth = undefined;

    this.dom = document.createElement("canvas");
    this.g = this.dom.getContext("2d");

    this.dom.setAttribute("class", "canvas1");
    this.dom.tabIndex = 0;

    this._last_bg = undefined;

    this.addEventListener("keydown", (e) => {
      if (this.disabled) return;

      if (cconst.DEBUG.buttonEvents)
        console.log(e.keyCode);

      switch (e.keyCode) {
        case 27: //escape
          this.blur();
          e.preventDefault();
          e.stopPropagation();
          break;
        case 32: //spacebar
        case 13: //enter
          this.click();
          e.preventDefault();
          e.stopPropagation();
          break;
      }
    });

    this.addEventListener("focusin", () => {
      if (this.disabled) return;

      this._focus = 1;
      this._redraw();
      this.focus();
    });

    this.addEventListener("blur", () => {
      if (this.disabled) return;

      this._focus = 0;
      this._redraw();
    });

    this._last_disabled = false;
    this._auto_depress = true;

    this.shadow.appendChild(this.dom);
  }

  get r() {
    return this.getDefault("border-radius");
  }

  set r(val) {
    this.overrideDefault("border-radius", val);
  }

  static define() {
    return {
      tagname: "old-button-x",
      style  : "button"
    };
  }

  click() {
    if (this._onpress) {
      let rect = this.getClientRects();
      let x = rect.x + rect.width*0.5;
      let y = rect.y + rect.height*0.5;

      let e = {
        x                : x, y: y, stopPropagation: () => {
        }, preventDefault: () => {
        }
      };

      this._onpress(e);
    }

    super.click();
  }

  init() {
    let dpi = this.getDPI();

    //set default dimensions
    let width = ~~(this.getDefault("width")*dpi);
    let height = ~~(this.getDefault("height")*dpi);

    this.dom.width = width;
    this.dom.height = height;

    this.dom.style["width"] = (width/dpi) + "px";
    this.dom.style["height"] = (height/dpi) + "px";
    this.dom.style["padding"] = this.dom.style["margin"] = "0px";

    this._name = undefined;
    this.updateName();

    this.bindEvents();
    this._redraw();
  }

  setAttribute(key, val) {
    super.setAttribute(key, val);

    if (key === "name") {
      this.updateName();
      this.updateWidth();
    }
  }

  old_bindEvents() {
    let press_gen = 0;

    let press = (e) => {
      e.stopPropagation();

      if (cconst.DEBUG.buttonEvents) {
        console.log("button press", this._pressed, this.disabled, e.button);
      }

      if (this.disabled) return;

      this._pressed = true;

      if (util.isMobile() && this.onclick && e.button === 0) {
        this.onclick();
      }

      if (this._onpress) {
        this._onpress(this);
      }

      this._redraw();

      e.preventDefault();
    };

    let depress = (e) => {
      if (cconst.DEBUG.buttonEvents)
        console.log("button depress", e.button, e.was_touch);

      if (this._auto_depress) {
        this._pressed = false;

        if (this.disabled) return;

        this._redraw();
      }

      e.preventDefault();
      e.stopPropagation();

      if (util.isMobile() || e.type === "pointerup" && e.button) {
        return;
      }

      this._redraw();

      if (cconst.DEBUG.buttonEvents) {
        console.log("button click callback:", this.onclick, this._onpress, this.onpress);
      }

      if (this.onclick && e.pointerType !== "mouse") {
        this.onclick(this);
      }

      this.undoBreakPoint();
    }

    this.addEventListener("mousedown", press, {captured: true, passive: false});
    this.addEventListener("mouseup", depress, {captured: true, passive: false});
    this.addEventListener("mouseover", (e) => {
      if (this.disabled)
        return;

      this._highlight = true;
      this._repos_canvas();
      this._redraw();
    })

    this.addEventListener("mouseout", (e) => {
      if (this.disabled)
        return;

      this._highlight = false;
      this._repos_canvas();
      this._redraw();
    })
  }

  updateDisabled() {
    if (this._last_disabled !== this.disabled) {
      this._last_disabled = this.disabled;

      //setTimeout(() => {
      this.dom._background = this.getDefault("background-color");

      this._repos_canvas();
      this._redraw();

      if (cconst.DEBUG.buttonEvents)
        console.log("disabled update!", this.disabled, this.style["background-color"]);
      //}, 100);
    }
  }

  updateDefaultSize() {
    const dpi = UIBase.getDPI();
    let height = ~~(this.getDefault("height")) + this.getDefault("padding");
    let size = this.getDefault("DefaultText").size*1.33;

    if (height === undefined || size === undefined || isNaN(height) || isNaN(size)) {
      return;
    }

    height = ~~(Math.max(height, size)*dpi);
    let cssHeight = (height/dpi) + "px";

    if (cssHeight !== this.style["height"]) {
      this.style["height"] = cssHeight;
      this.dom.style["height"] = cssHeight;
      this.dom.height = height;

      this._repos_canvas();
      this._redraw();
    }
  }

  _calcUpdateKey() {
    return _themeUpdateKey;
  }

  update() {
    super.update();

    this.style["user-select"] = "none";
    this.dom.style["user-select"] = "none";

    this.updateDefaultSize();
    this.updateWidth();
    this.updateDPI();
    this.updateName();
    this.updateDisabled();

    if (this.background !== this._last_bg) {
      this._last_bg = this.background;
      this._repos_canvas();
      this._redraw();
    }

    let key = this._calcUpdateKey();
    if (key !== this._last_but_update_key) {
      this._last_but_update_key = key;

      this.setCSS();
      this._repos_canvas();
      this._redraw();
    }
  }

  setCSS() {
    super.setCSS();

    this.dom.style["margin"] = this.getDefault("margin", undefined, 0) + "px";
    this.dom.style["margin-left"] = this.getDefault("margin-left", undefined, 0) + "px";
    this.dom.style["margin-right"] = this.getDefault("margin-right", undefined, 0) + "px";
    this.dom.style["margin-top"] = this.getDefault("margin-top", undefined, 0) + "px";
    this.dom.style["margin-bottom"] = this.getDefault("margin-bottom", undefined, 0) + "px";

    let name = this._name;
    if (name === undefined) {
      return;
    }

    let dpi = this.getDPI();

    let pad = this.getDefault("padding");
    let ts = this.getDefault("DefaultText").size;

    let tw = ui_base.measureText(this, this._genLabel(), {
      size: ts,
      font: this.getDefault("DefaultText")
    }).width + 2.0*pad + this._leftPad + this._rightPad;

    if (this._namePad !== undefined) {
      tw += this._namePad;
    }

    let w = this.getDefault("width");

    w = Math.max(w, tw);
    w = ~~w;
    this.dom.style["width"] = w + "px";
    this.updateBorders();
  }

  updateBorders() {
    let lwid = this.getDefault("border-width");

    if (lwid) {
      this.dom.style["border-color"] = this.getDefault("border-color");
      this.dom.style["border-width"] = lwid + "px";
      this.dom.style["border-style"] = "solid";
      this.dom.style["border-radius"] = this.getDefault("border-radius") + "px";
    } else {
      this.dom.style["border-color"] = "none";
      this.dom.style["border-width"] = "0px";
      this.dom.style["border-radius"] = this.getDefault("border-radius") + "px";
    }

  }

  updateName() {
    if (!this.hasAttribute("name")) {
      return;
    }

    let name = this.getAttribute("name");

    if (name !== this._name) {
      this._name = name;

      this.setCSS();
      this._repos_canvas();
      this._redraw();
    }
  }

  updateWidth(w_add = 0) {
  }

  _repos_canvas() {
    let dpi = this.getDPI();

    let w = parsepx(this.dom.style["width"]);
    let h = parsepx(this.dom.style["height"]);

    let w2 = ~~(w*dpi);
    let h2 = ~~(h*dpi);

    w = w2/dpi;
    h = h2/dpi;

    this.dom.width = w2;
    this.dom.style["width"] = w + "px";

    this.dom.height = h2;
    this.dom.style["height"] = h + "px";
  }

  updateDPI() {
    let dpi = this.getDPI();

    if (this._last_dpi !== dpi) {
      //console.log("update dpi", dpi);

      this._last_dpi = dpi;

      this.g.font = undefined; //reset font

      this.setCSS();
      this._repos_canvas();
      this._redraw();
    }

    if (this.style["background-color"]) {
      this.dom._background = this.style["background-color"];
      this.style["background-color"] = "";
    }

    //console.log(">", this.dom.style["background-color"], "-----");
    //console.log("width:", this.clientWidth)
  }

  _genLabel() {
    return "" + this._name;
  }

  _getSubKey() {
    if (this._pressed) {
      return 'depressed';
    } else if (this._highlight) {
      return 'highlight';
    } else {
      return undefined; //make getSubDefault forward to getDefault
    }
  }

  _redraw(draw_text = true) {
    //console.log("button draw");

    let dpi = this.getDPI();

    let subkey = this._getSubKey();

    if (this._pressed && this._highlight) {
      this.dom._background = this.getSubDefault(subkey, "highlight-pressed", "BoxHighlight");
    } else if (this._pressed) {
      this.dom._background = this.getSubDefault(subkey, "pressed", "BoxDepressed");
    } else if (this._highlight) {
      this.dom._background = this.getSubDefault(subkey, "highlight", "BoxHighlight");
    } else {
      this.dom._background = this.getSubDefault(subkey, "background-color", "background-color");
    }

    ui_base.drawRoundBox(this, this.dom, this.g);

    //drawn with CSS now
    /*
    let lwid = this.getDefault("border-width");
    if (lwid) {
      this.g.lineWidth = lwid*dpi;
      ui_base.drawRoundBox(this, this.dom, this.g, undefined, undefined, undefined, "stroke");
    }
     */

    this.updateBorders();

    if (this._focus) {
      let w = this.dom.width, h = this.dom.height;
      let p = 1/dpi;

      //XXX remove this.g.translate lines after refactoring drawRoundBox, see comment in ui_base.js
      this.g.translate(p, p);
      let lw = this.g.lineWidth;


      this.g.lineWidth = this.getDefault("focus-border-width", undefined, 1.0)*dpi;

      ui_base.drawRoundBox(this, this.dom, this.g, w - p*2, h - p*2, this.r, "stroke", this.getDefault("BoxHighlight"));

      this.g.lineWidth = lw;
      this.g.translate(-p, -p);
    }

    if (draw_text) {
      this._draw_text();
    }
  }

  _draw_text() {
    let dpi = this.getDPI();

    let subkey = this._getSubKey();

    //if (util.isMobile()) {
    //dpi = dpi; //visualViewport.scale;
    //}

    let font = this.getSubDefault(subkey, "DefaultText");

    let pad = this.getDefault("padding")*dpi;
    let ts = font.size*dpi;

    let text = this._genLabel();

    //console.log(text, "text", this._name);

    let w = this.dom.width, h = this.dom.height;

    let tw = ui_base.measureText(this, text, undefined, undefined, ts, font).width;

    let cx = pad*0.5 + this._leftPad*dpi;
    let cy = ts + (h - ts)/3.0;

    let g = this.g;

    ui_base.drawText(this, ~~cx, ~~cy, text, {
      canvas: this.dom,
      g     : this.g,
      size  : ts/dpi,
      font  : font
    });
  }
}

UIBase.internalRegister(OldButton);
