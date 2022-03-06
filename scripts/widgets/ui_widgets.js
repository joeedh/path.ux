"use strict";

import * as util from '../path-controller/util/util.js';
import * as vectormath from '../path-controller/util/vectormath.js';
import * as ui_base from '../core/ui_base.js';
import * as events from '../path-controller/util/events.js';
import * as toolsys from '../path-controller/toolsys/toolsys.js';
import * as toolprop from '../path-controller/toolsys/toolprop.js';
import {DataPathError} from '../path-controller/controller/controller.js';
import {Vector3, Vector4, Quat, Matrix4} from '../path-controller/util/vectormath.js';
import {isNumber, PropFlags} from "../path-controller/toolsys/toolprop.js";
import * as units from '../core/units.js';

import cconst from '../config/const.js';

function myToFixed(s, n) {
  s = s.toFixed(n);

  while (s.endsWith('0')) {
    s = s.slice(0, s.length - 1);
  }
  if (s.endsWith("\.")) {
    s = s.slice(0, s.length - 1);
  }

  return s;
}

let keymap = events.keymap;

let EnumProperty = toolprop.EnumProperty,
    PropTypes    = toolprop.PropTypes;

let UIBase     = ui_base.UIBase,
    PackFlags  = ui_base.PackFlags,
    IconSheets = ui_base.IconSheets;

let parsepx = ui_base.parsepx;

import {Button, OldButton} from './ui_button.js';
import {eventWasTouch, popModalLight, pushModalLight} from '../path-controller/util/simple_events.js';

export {Button} from './ui_button.js';

export class IconLabel extends UIBase {
  constructor() {
    super();
    this._icon = -1;
    this.iconsheet = 1;
  }

  get icon() {
    return this._icon;
  }

  set icon(id) {
    this._icon = id;
    this.setCSS();
  }

  static define() {
    return {
      tagname: "icon-label-x"
    }
  }

  init() {
    super.init();

    this.style["display"] = "flex";
    this.style["margin"] = this.style["padding"] = "0px";

    this.setCSS();
  }

  setCSS() {
    let size = ui_base.iconmanager.getTileSize(this.iconsheet);


    ui_base.iconmanager.setCSS(this.icon, this);

    this.style["width"] = size + "px";
    this.style["height"] = size + "px";
  }
}

UIBase.internalRegister(IconLabel);

export class ValueButtonBase extends OldButton {
  constructor() {
    super();
  }

  get value() {
    return this._value;
  }

  set value(val) {
    this._value = val;

    if (this.ctx && this.hasAttribute("datapath")) {
      this.setPathValue(this.ctx, this.getAttribute("datapath"), this._value);
    }
  }

  updateDataPath() {
    if (!this.hasAttribute("datapath")) return;
    if (this.ctx === undefined) return;

    let val = this.getPathValue(this.ctx, this.getAttribute("datapath"));

    if (val === undefined) {
      let redraw = !this.disabled;

      this.internalDisabled = true;

      if (redraw) this._redraw();

      return;
    } else {
      let redraw = this.disabled;

      this.internalDisabled = false;
      if (redraw) this._redraw();
    }

    if (val !== this._value) {
      this._value = val;
      this.updateWidth();
      this._repos_canvas();
      this._redraw();
      this.setCSS();
    }
  }

  update() {
    this.updateDataPath();

    super.update();
  }
}

export class Check extends UIBase {
  constructor() {
    super();

    this._checked = false;
    this._highlight = false;
    this._focus = false;

    let shadow = this.shadow;

    //let form = document.createElement("form");

    let span = document.createElement("span");
    span.setAttribute("class", "checkx");

    span.style["display"] = "flex";
    span.style["flex-direction"] = "row";
    span.style["margin"] = span.style["padding"] = "0px";
    //span.style["background"] = ui_base.iconmanager.getCSS(1);

    let sheet = 0;
    let size = ui_base.iconmanager.getTileSize(0);

    let check = this.canvas = document.createElement("canvas");
    this.g = check.getContext("2d");

    check.setAttribute("id", check._id);
    check.setAttribute("name", check._id);

    let mdown = (e) => {
      this._highlight = false;
      this.checked = !this.checked;
    };

    let mup = (e) => {
      this._highlight = false;
      this.blur();
      this._redraw();
    };

    let mover = (e) => {
      this._highlight = true;
      this._redraw();
    };

    let mleave = (e) => {
      this._highlight = false;
      this._redraw();
    };

    span.addEventListener("pointerover", mover, {passive: true});
    span.addEventListener("mousein", mover, {passive: true});
    span.addEventListener("mouseleave", mleave, {passive: true});
    span.addEventListener("pointerout", mleave, {passive: true});

    this.addEventListener("blur", (e) => {
      this._highlight = this._focus = false;
      this._redraw();
    });
    this.addEventListener("focusin", (e) => {
      this._focus = true;
      this._redraw();
    });
    this.addEventListener("focus", (e) => {
      this._focus = true;
      this._redraw();
    });


    span.addEventListener("pointerdown", mdown, {passive: true});
    span.addEventListener("pointerup", mup, {passive: true});
    span.addEventListener("pointercancel", mup, {passive: true});

    this.addEventListener("keydown", (e) => {
      switch (e.keyCode) {
        case keymap["Escape"]:
          this._highlight = undefined;
          this._redraw();
          e.preventDefault();
          e.stopPropagation();

          this.blur();
          break;
        case keymap["Enter"]:
        case keymap["Space"]:
          this.checked = !this.checked;
          e.preventDefault();
          e.stopPropagation();
          break;
      }
    });
    this.checkbox = check;

    span.appendChild(check);

    let label = this._label = document.createElement("label");
    label.setAttribute("class", "checkx");
    span.setAttribute("class", "checkx");
    label.style["align-self"] = "center";

    let side = this.getDefault("CheckSide");
    if (side === "right") {
      span.prepend(label);
    } else {
      span.appendChild(label);
    }

    shadow.appendChild(span);
  }

  get internalDisabled() {
    return super.internalDisabled;
  }

  set internalDisabled(val) {
    if (!!this.internalDisabled === !!val) {
      return;
    }

    super.internalDisabled = val;
    this._redraw();
  }

  get value() {
    return this.checked;
  }

  set value(v) {
    this.checked = v;
  }

  get checked() {
    return this._checked;
  }

  set checked(v) {
    v = !!v;

    if (this._checked !== v) {
      this._checked = v;

      this.setCSS();

      //this.dom.checked = v;
      this._redraw();

      if (this.onclick) {
        this.onclick(v);
      }
      if (this.onchange) {
        this.onchange(v);
      }

      if (this.hasAttribute("datapath")) {
        this.setPathValue(this.ctx, this.getAttribute("datapath"), this._checked);
      }
    }
  }

  get label() {
    return this._label.textContent;
  }

  set label(l) {
    this._label.textContent = l;
  }

  static define() {
    return {
      tagname    : "check-x",
      style      : "checkbox",
      parentStyle: "button"
    };
  }

  init() {
    this.tabIndex = 1;
    this.setAttribute("class", "checkx");


    let style = document.createElement("style");
    //let style = this.cssStyleTag();

    let color = this.getDefault("focus-border-color");

    style.textContent = `
      .checkx:focus {
        outline : none;
      }
    `;

    //document.body.prepend(style);
    this.prepend(style);
  }

  setCSS() {
    this._label.style["font"] = this.getDefault("DefaultText").genCSS();
    this._label.style["color"] = this.getDefault("DefaultText").color;

    this._label.style['font'] = 'normal 14px poppins'; // TODO - Jordan - add to settings

    super.setCSS();

    //force clear background
    this.style["background-color"] = "rgba(0,0,0,0)";
  }

  updateDataPath() {
    if (!this.getAttribute("datapath")) {
      return;
    }

    let val = this.getPathValue(this.ctx, this.getAttribute("datapath"));

    let redraw = false;

    if (val === undefined) {
      this.internalDisabled = true;
      return;
    } else {
      redraw = this.internalDisabled;

      this.internalDisabled = false;
    }

    val = !!val;

    redraw = redraw || !!this._checked !== !!val;

    if (redraw) {
      this._checked = val;
      this._repos_canvas();
      this.setCSS();
      this._redraw();
    }
  }

  _repos_canvas() {
  }

  _redraw() {
    if (this.canvas === undefined) {
      //flag update
      this._updatekey = "";
      return;
    }

    let canvas = this.canvas, g = this.g;
    let dpi = UIBase.getDPI();
    let tilesize = ui_base.iconmanager.getTileSize(0);
    let pad = this.getDefault("padding");

    let csize = tilesize + pad*2;

    canvas.style["margin"] = "2px";
    canvas.style["width"] = csize + "px";
    canvas.style["height"] = csize + "px";

    csize = ~~(csize*dpi + 0.5);
    tilesize = ~~(tilesize*dpi + 0.5);

    canvas.width = csize;
    canvas.height = csize;

    g.clearRect(0, 0, canvas.width, canvas.height);

    g.beginPath();
    g.rect(0, 0, canvas.width, canvas.height);
    g.fill();

    let color;

    if (!this._checked && this._highlight) {
      color = this.getDefault("BoxHighlight");
    }

    ui_base.drawRoundBox(this, canvas, g, undefined, undefined, undefined, undefined, color);
    if (this._checked) {
      //canvasDraw(elem, canvas, g, icon, x=0, y=0, sheet=0) {
      let x = (csize - tilesize)*0.5, y = (csize - tilesize)*0.5;
      ui_base.iconmanager.canvasDraw(this, canvas, g, ui_base.Icons.LARGE_CHECK, x, y);
    }

    if (this._focus) {
      color = this.getDefault("focus-border-color");
      g.lineWidth *= dpi;
      ui_base.drawRoundBox(this, canvas, g, undefined, undefined, undefined, "stroke", color);
    }
  }

  updateDPI() {
    let dpi = UIBase.getDPI();

    if (dpi !== this._last_dpi) {
      this._last_dpi = dpi;
      this._redraw();
    }
  }

  update() {
    super.update();

    this.updateDPI();

    if (this.hasAttribute("datapath")) {
      this.updateDataPath();
    }

    let updatekey = this.getDefault("DefaultText").hash();
    updatekey += this._checked + ":" + this._label.textContent;

    if (updatekey !== this._updatekey) {
      this._repos_canvas();
      this.setCSS();

      this._updatekey = updatekey;
      this._redraw();
    }
  }
}

UIBase.internalRegister(Check);

export class IconButton extends UIBase {
  constructor() {
    super();

    this._customIcon = undefined;

    this._pressed = false;
    this._highlight = false;
    this._draw_pressed = true;

    this._icon = -1;
    this._icon_pressed = undefined;
    this.iconsheet = 0;
    this.drawButtonBG = true;

    this._extraIcon = undefined; //draw another icon on top

    this.extraDom = undefined;

    //have to put icon in subdiv
    this.dom = document.createElement("div");
    this.shadow.appendChild(this.dom);

    this._last_iconsheet = undefined;

  }

  get customIcon() {
    return this._customIcon;
  }

  set customIcon(domImage) {
    this._customIcon = domImage;
    this.setCSS();
  }

  get icon() {
    return this._icon;
  }

  set icon(val) {
    this._icon = val;
    this.setCSS();
  }

  static define() {
    return {
      tagname: "iconbutton-x",
      style  : "iconbutton"
    };
  }

  _on_press() {
    this._pressed = true;
    this.setCSS();
  }

  _on_depress() {
    this._pressed = false;
    this.setCSS();
  }

  updateDefaultSize() {

  }

  setCSS() {
    super.setCSS();

    let def;
    let pstyle = this.getDefault("depressed");
    let hstyle = this.getDefault("highlight");

    this.noMarginsOrPadding();

    if (this._pressed && this._draw_pressed) {
      def = k => pstyle && k in pstyle ? pstyle[k] : this.getDefault(k);
    } else if (this._highlight) {
      def = k => hstyle && k in hstyle ? hstyle[k] : this.getDefault(k);
    } else {
      def = k => this.getDefault(k);
    }

    let loadstyle = (key, addpx) => {
      let val = def(key);
      if (addpx) {
        val = ("" + val).trim();

        if (!val.toLowerCase().endsWith("px")) {
          val += "px";
        }
      }

      this.style[key] = val;
    }

    let keys = ["margin", "padding", "margin-left", "margin-right", "margin-top", "margin-botton",
                "padding-left", "padding-bottom", "padding-top", "padding-right",
                "border-radius"]

    for (let k of keys) {
      loadstyle(k, true);
    }
    loadstyle("background-color", false);
    loadstyle("color", false);

    let border = `${def("border-width", true)} ${def("border-style", false)} ${def("border-color", false)}`
    this.style["border"] = border;

    let w = this.getDefault("width");

    let size = ui_base.iconmanager.getTileSize(this.iconsheet);
    w = size;

    this.style["width"] = w + "px";
    this.style["height"] = w + "px";

    this.dom.style["width"] = w + "px";
    this.dom.style["height"] = w + "px";
    this.dom.style["margin"] = this.dom.style["padding"] = "0px";

    this.style["display"] = "flex";
    this.style["align-items"] = "center";

    if (this._customIcon) {
      this.dom.style["background-image"] = `url("${this._customIcon.src}")`
      this.dom.style["background-size"] = "contain";
      this.dom.style["background-repeat"] = "no-repeat";
    } else {
      let icon = this.icon;

      if (this._pressed && this._icon_pressed !== undefined) {
        icon = this._icon_pressed;
      }

      ui_base.iconmanager.setCSS(icon, this.dom, this.iconsheet);
    }

    if (this._extraIcon !== undefined) {
      let dom;

      if (!this.extraDom) {
        this.extraDom = dom = document.createElement("div");

        this.shadow.appendChild(dom);
      } else {
        dom = this.extraDom;
      }

      dom.style["position"] = "absolute";
      dom.style["margin"] = dom.style["padding"] = "0px";
      dom.style["pointer-events"] = "none";
      dom.style["width"] = size + "px";
      dom.style["height"] = size + "px";

      ui_base.iconmanager.setCSS(this._extraIcon, dom, this.iconsheet);
    } else if (this.extraDom) {
      this.extraDom.remove();
    }
  }

  init() {
    super.init();

    let press = (e) => {
      e.stopPropagation();
      e.preventDefault();

      if (this.modalRunning) {
        this.popModal();
      }

      if (!eventWasTouch(e) && e.button !== 0) {
        return;
      }

      if (1) { //!eventWasTouch(e)) {
        let this2 = this;

        this.pushModal({
          on_mouseup(e) {
            //touch events aren't fireing onclick automatically the way mouse ones are

            if (this2.onclick && eventWasTouch(e)) {
              this2.onclick();
            }
            this.end();
          },
          on_touchcancel(e) {
            this.on_mouseup(e);
            this.end();
          },
          on_touchend(e) {
            this.on_mouseup(e);
            this.end();
          },
          on_keydown(e) {
            this.end();
          },
          end() {
            if (this2.modalRunning) {
              this2.popModal();
              this2._on_depress(e)
              this2.setCSS();
            }
          }
        });
      }

      this._on_press(e);
    }

    let depress = (e) => {
      e.stopPropagation();
      e.preventDefault();

      this._on_depress();
      this.setCSS();
    }

    let high = (e) => {
      this._highlight = true;
      this.setCSS();
    }

    let unhigh = (e) => {
      this._highlight = false;
      this.setCSS();
    }

    this.tabIndex = 0;

    this.addEventListener("mouseover", high);
    this.addEventListener("mouseexit", unhigh);
    this.addEventListener("mouseleave", unhigh);
    this.addEventListener("focus", high);
    this.addEventListener("blur", unhigh);

    this.addEventListener("mousedown", press, {capture: true});
    this.addEventListener("mouseup", depress, {capture: true});
    //this.addEventListener("touchstart", press, {capture: true});
    //this.addEventListener("touchcancel", depress, {capture: true});
    //this.addEventListener("touchend", depress, {capture: true});
    this.setCSS();

    this.dom.style["pointer-events"] = "none";
  }

  update() {
    super.update();

    if (this.iconsheet !== this._last_iconsheet) {
      this.setCSS();
      this._last_iconsheet = this.iconsheet;
    }
  }

  _getsize() {
    let margin = this.getDefault("padding");

    return ui_base.iconmanager.getTileSize(this.iconsheet) + margin*2;
  }
}

UIBase.internalRegister(IconButton);


export class IconCheck extends IconButton {
  constructor() {
    super();

    this._checked = undefined;
    this._drawCheck = undefined;
  }

  get drawCheck() {
    let ret = this._drawCheck;

    ret = ret === undefined ? this.getDefault("drawCheck") : ret;
    ret = ret === undefined ? true : ret;

    return ret;
  }

  set drawCheck(val) {
    val = !!val;

    if (val && (this.packflag & PackFlags.HIDE_CHECK_MARKS)) {
      this.packflag &= ~PackFlags.HIDE_CHECK_MARKS;
    }

    let old = !!this.drawCheck;
    this._drawCheck = val;

    if (val !== old) {
      this.updateDrawCheck();
      this.setCSS();
    }
  }

  get icon() {
    return this._icon;
  }

  set icon(val) {
    this._icon = val;
    this.setCSS();
  }

  get checked() {
    return this._checked;
  }

  set checked(val) {
    if (!!val !== !!this._checked) {
      this._checked = val
      this._updatePressed(!!val);
      this.setCSS();

      if (this.onchange) {
        this.onchange(val);
      }
    }
  }

  get noEmboss() {
    let ret = this.getAttribute("no-emboss");

    if (!ret) {
      return false;
    }

    ret = ret.toLowerCase().trim();

    return ret === 'true' || ret === 'yes' || ret === 'on';
  }

  set noEmboss(val) {
    this.setAttribute('no-emboss', val ? 'true' : 'false');
  }

  static define() {
    return {
      tagname    : "iconcheck-x",
      style      : "iconcheck",
      parentStyle: "iconbutton"
    };
  }

  _updatePressed(val) {
    //don't set _pressed if we have a custom icon for press state
    if (this._icon_pressed) {
      this._draw_pressed = false;
    }

    this._pressed = val;
    this.setCSS();
  }

  _on_depress() {
    return;
  }

  _on_press() {
    this.checked ^= true;

    if (this.hasAttribute("datapath")) {
      this.setPathValue(this.ctx, this.getAttribute("datapath"), !!this.checked);
    }

    this.setCSS();
  }

  updateDefaultSize() {

  }

  _calcUpdateKey() {
    return super._calcUpdateKey() + ":" + this._icon;
  }

  updateDataPath() {
    if (!this.hasAttribute("datapath") || !this.ctx) {
      return;
    }

    if (this._icon < 0) {
      let rdef;
      try {
        rdef = this.ctx.api.resolvePath(this.ctx, this.getAttribute("datapath"));
      } catch (error) {
        if (error instanceof DataPathError) {
          return;
        } else {
          throw error;
        }
      }

      if (rdef !== undefined && rdef.prop) {
        let icon, icon2, title;

        if (rdef.prop.flag & PropFlags.NO_UNDO) {
          this.setUndo(false);
        } else {
          this.setUndo(true);
        }

        //console.log("SUBKEY", rdef.subkey, rdef.prop.iconmap);

        if (rdef.subkey && (rdef.prop.type === PropTypes.FLAG || rdef.prop.type === PropTypes.ENUM)) {
          icon = rdef.prop.iconmap[rdef.subkey];
          icon2 = rdef.prop.iconmap2[rdef.subkey];
          title = rdef.prop.descriptions[rdef.subkey];

          if (title === undefined && rdef.subkey.length > 0) {
            title = rdef.subkey;
            title = title[0].toUpperCase() + title.slice(1, title.length).toLowerCase();
          }
        } else {
          icon2 = rdef.prop.icon2;
          icon = rdef.prop.icon;
          title = rdef.prop.description;
        }

        if (icon2 !== undefined && icon2 !== -1) {
          this._icon_pressed = icon;
          icon = icon2;
        }

        if (icon !== undefined && icon !== this.icon)
          this.icon = icon;
        if (title !== undefined)
          this.description = title;
      }
    }

    let val = this.getPathValue(this.ctx, this.getAttribute("datapath"));

    if (val === undefined) {
      this.internalDisabled = true;
      return;
    } else {
      this.internalDisabled = false;
    }

    val = !!val;

    if (val !== !!this._checked) {
      this._checked = val;
      this._updatePressed(!!val);
      this.setCSS();
    }
  }

  updateDrawCheck() {
    if (this.drawCheck) {
      this._extraIcon = this._checked ? ui_base.Icons.ENUM_CHECKED : ui_base.Icons.ENUM_UNCHECKED;
    } else {
      this._extraIcon = undefined;
    }
  }

  update() {
    if (this.packflag & PackFlags.HIDE_CHECK_MARKS) {
      this.drawCheck = false;
    }

    this.updateDrawCheck();

    if (this.hasAttribute("datapath")) {
      this.updateDataPath();
    }

    super.update();
  }

  _getsize() {
    let margin = this.getDefault("padding");
    return ui_base.iconmanager.getTileSize(this.iconsheet) + margin*2;
  }

  setCSS() {
    this.updateDrawCheck();
    super.setCSS();
  }
}

UIBase.internalRegister(IconCheck);

export class Check1 extends Button {
  constructor() {
    super();

    this._namePad = 40;
    this._value = undefined;
  }

  static define() {
    return {
      tagname    : "check1-x",
      parentStyle: "button"
    };
  }

  _redraw() {
    //console.log("button draw");

    let dpi = this.getDPI();

    let box = 40;
    ui_base.drawRoundBox(this, this.dom, this.g, box);

    let ts = this.getDefault("DefaultText").size;

    let text = this._genLabel();

    //console.log(text, "text", this._name);

    let tw = ui_base.measureText(this, text, this.dom, this.g).width;
    let cx = this.dom.width/2 - tw/2;
    let cy = this.dom.height/2;

    ui_base.drawText(this, box, cy + ts/2, text, {
      canvas: this.dom, g: this.g
    });
  }
}

UIBase.internalRegister(Check1);

export {checkForTextBox} from './ui_textbox.js';
