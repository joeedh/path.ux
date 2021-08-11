"use strict";

import * as util from '../path-controller/util/util.js';
import * as vectormath from '../path-controller/util/vectormath.js';
import * as ui_base from '../core/ui_base.js';
import * as events from '../path-controller/util/events.js';
import * as stoolsys from '../path-controller/toolsys/toolsys.js';
import * as toolprop from '../path-controller/toolsys/toolprop.js';
import {DataPathError} from '../path-controller/controller/controller.js';
import {Vector3, Vector4, Quat, Matrix4} from '../path-controller/util/vectormath.js';
import {isNumber} from "../path-controller/toolsys/toolprop.js";
import * as units from '../core/units.js';

import cconst from '../config/const.js';

function myToFixed(s, n) {
  s = s.toFixed(n);

  while (s.endsWith('0')) {
    s = s.slice(0, s.length-1);
  }
  if (s.endsWith("\.")) {
    s = s.slice(0, s.length-1);
  }

  return s;
}

let keymap = events.keymap;

let EnumProperty = toolprop.EnumProperty,
    PropTypes = toolprop.PropTypes;

let UIBase = ui_base.UIBase,
    PackFlags = ui_base.PackFlags,
    IconSheets = ui_base.IconSheets;

let parsepx = ui_base.parsepx;

import {Button} from './ui_button.js';
export {Button} from './ui_button.js';

export class IconLabel extends UIBase {
  constructor() {
    super();
    this._icon = -1;
    this.iconsheet = 1;
  }

  init() {
    super.init();

    this.style["display"] = "flex";
    this.style["margin"] = this.style["padding"] = "0px";

    this.setCSS();
  }

  set icon(id) {
    this._icon = id;
    this.setCSS();
  }

  get icon() {
    return this._icon;
  }

  setCSS() {
    let size = ui_base.iconmanager.getTileSize(this.iconsheet);


    ui_base.iconmanager.setCSS(this.icon, this);

    this.style["width"] = size + "px";
    this.style["height"] = size + "px";
  }

  static define() {return {
    tagname : "icon-label-x"
  }}
}
UIBase.internalRegister(IconLabel);

export class ValueButtonBase extends Button {
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

    let val =  this.getPathValue(this.ctx, this.getAttribute("datapath"));

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

    /*
    let doblur = () => {
      this.blur();
    };
    check.addEventListener("mousedown", doblur);
    check.addEventListener("mouseup", doblur);
    check.addEventListener("touchstart", doblur);
    check.addEventListener("touchend", doblur);
    //*/

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

    span.addEventListener("mouseover", mover);
    span.addEventListener("mousein", mover);
    span.addEventListener("mouseleave", mleave);
    span.addEventListener("mouseout", mleave);
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


    span.addEventListener("mousedown", mdown);
    span.addEventListener("touchstart", mdown);
    span.addEventListener("mouseup", mup);
    span.addEventListener("touchend", mup);

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

  setCSS() {
    this._label.style["font"] = this.getDefault("DefaultText").genCSS();
    this._label.style["color"] = this.getDefault("DefaultText").color;

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
      let x=(csize-tilesize)*0.5, y=(csize-tilesize)*0.5;
      ui_base.iconmanager.canvasDraw(this, canvas, g, ui_base.Icons.LARGE_CHECK, x, y);
    }

    if (this._focus) {
      color = this.getDefault("focus-border-color");
      g.lineWidth *= dpi;
      ui_base.drawRoundBox(this, canvas, g, undefined, undefined, undefined, "stroke", color);
    }
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

  get checked() {
    return this._checked;
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

  get label() {
    return this._label.textContent;
  }

  set label(l) {
    this._label.textContent = l;
  }

  static define() {return {
    tagname : "check-x",
    style   : "checkbox",
    parentStyle : "button"
  };}
}
UIBase.internalRegister(Check);

export class IconCheck extends Button {
  constructor() {
    super();

    this._checked = undefined;

    this._drawCheck = undefined;
    this._icon = -1;
    this._icon_pressed = undefined;
    this.iconsheet = ui_base.IconSheets.LARGE;
  }

  updateDefaultSize() {

  }

  _calcUpdateKey() {
    return super._calcUpdateKey() + ":" + this._icon;
  }

  get drawCheck() {
    let ret = this._drawCheck;

    ret = ret === undefined ? this.getDefault("drawCheck") : ret;
    ret = ret === undefined ? true : ret;

    return ret;
  }

  set drawCheck(val) {
    if (val && (this.packflag & PackFlags.HIDE_CHECK_MARKS)) {
      this.packflag &= ~PackFlags.HIDE_CHECK_MARKS;
    }

    if (!!val !== !!this._drawCheck) {
      this._redraw();
    }

    this._drawCheck = val;
  }

  get icon() {
    return this._icon;
  }

  set icon(val) {
    this._icon = val;
    this._repos_canvas();
    this._redraw();
  }

  get checked() {
    return this._checked;
  }

  set checked(val) {
    if (!!val != !!this._checked) {
      this._checked = val;
      this._redraw();

      if (this.onchange) {
        this.onchange(val);
      }
    }
  }

  updateDataPath() {
    if (!this.hasAttribute("datapath") || !this.ctx) {
      return;
    }

    if (this._icon < 0) {
      let rdef;
      try {
        rdef = this.ctx.api.resolvePath(this.ctx, this.getAttribute("datapath"));
      } catch(error) {
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

        if (icon2 !== undefined) {
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

    if (val != !!this._checked) {
      this._checked = val;
      this._redraw();
    }
  }

  update() {
    if (this.packflag & PackFlags.HIDE_CHECK_MARKS) {
      this.drawCheck = false;
    }

    if (this.hasAttribute("datapath")) {
      this.updateDataPath();
    }

    super.update();
  }

  _getsize() {
    let margin = this.getDefault("padding");
    return ui_base.iconmanager.getTileSize(this.iconsheet) + margin*2;
  }

  _repos_canvas() {
    let dpi = UIBase.getDPI();

    let w = (~~(this._getsize()*dpi))/dpi;
    let h = (~~(this._getsize()*dpi))/dpi;

    this.dom.style["width"] = w + "px";
    this.dom.style["height"] = h + "px";

    if (this._div !== undefined) {
      this._div.style["width"] = w + "px";
      this._div.style["height"] = h + "px";
    }

    super._repos_canvas();
  }

  set icon(f) {
    this._icon = f;
    this._redraw();
  }

  get icon() {
    return this._icon;
  }

  _onpress() {
    this.checked ^= 1;

    if (this.hasAttribute("datapath")) {
      this.setPathValue(this.ctx, this.getAttribute("datapath"), this.checked);
    }

    this._redraw();
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

  _redraw() {
    this._repos_canvas();

    if (!this.noEmboss) {
      let pressed = this._pressed;
      this._pressed = this._checked;
      super._redraw(false);
      this._pressed = pressed;
    }

    let icon = this._icon;

    if (this._checked && this._icon_pressed !== undefined) {
      icon = this._icon_pressed;
    }

    let tsize = ui_base.iconmanager.getTileSize(this.iconsheet);
    let size = this._getsize();
    let off = size > tsize ? (size - tsize)*0.5 : 0.0;

    this.g.save();
    this.g.translate(off, off);
    ui_base.iconmanager.canvasDraw(this, this.dom, this.g, icon, undefined, undefined, this.iconsheet);

    if (this.drawCheck) {
      let icon2 = this._checked ? ui_base.Icons.CHECKED : ui_base.Icons.UNCHECKED;
      ui_base.iconmanager.canvasDraw(this, this.dom, this.g, icon2, undefined, undefined, this.iconsheet);
    }

    this.g.restore();
  }

  static define() {return {
    tagname : "iconcheck-x",
    style   : "iconcheck",
    parentStyle : "button"
  };}
}

UIBase.internalRegister(IconCheck);

export class IconButton extends Button {
  constructor() {
    super();

    this._customIcon = undefined;

    this._icon = 0;
    this._icon_pressed = undefined;
    this.iconsheet = ui_base.Icons.LARGE;
    this.drawButtonBG = true;
  }

  updateDefaultSize() {

  }

  set customIcon(domImage) {
    this._customIcon = domImage;
  }

  get customIcon() {
    return this._customIcon;
  }

  _calcUpdateKey() {
    return super._calcUpdateKey() + ":" + this._icon;
  }

  get icon() {
    return this._icon;
  }

  set icon(val) {
    this._icon = val;
    this._repos_canvas();
    this._redraw();
  }

  update() {
    super.update();
  }

  _getsize() {
    let margin = this.getDefault("padding");

    return ui_base.iconmanager.getTileSize(this.iconsheet) + margin*2;
  }

  _repos_canvas() {
    let dpi = UIBase.getDPI();

    let w = (~~(this._getsize()*dpi))/dpi;
    let h = (~~(this._getsize()*dpi))/dpi;

    this.dom.style["width"] = w + "px";
    this.dom.style["height"] = h + "px";

    if (this._div !== undefined) {
      this._div.style["width"] = w + "px";
      this._div.style["height"] = h + "px";
    }

    super._repos_canvas();
  }

  _redraw() {
    this._repos_canvas();

    //this.dom._background = this._checked ? this.getDefault("BoxDepressed") : this.getDefault("background-color");
    //
    if (this.drawButtonBG) {
      super._redraw(false);
    }

    let icon = this._icon;

    if (this._checked && this._icon_pressed !== undefined) {
      icon = this._icon_pressed;
    }

    let tsize = ui_base.iconmanager.getTileSize(this.iconsheet);
    let size = this._getsize();

    let dpi = UIBase.getDPI();
    let off = size > tsize ? (size - tsize)*0.5*dpi : 0.0;

    this.g.save();
    this.g.translate(off, off);

    if (this.customIcon) {
      this.g.drawImage(this.customIcon, 0, 0, this.customIcon.width, this.customIcon.height, 0, 0, size, size);
    } else {
      ui_base.iconmanager.canvasDraw(this, this.dom, this.g, icon, undefined, undefined, this.iconsheet);
    }

    this.g.restore();
  }

  static define() {return {
    tagname : "iconbutton-x",
    style : "iconbutton",
    parentStyle : "button"
  };}
}

UIBase.internalRegister(IconButton);

export class Check1 extends Button {
  constructor() {
    super();

    this._namePad = 40;
    this._value = undefined;
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
    let cx = this.dom.width / 2 - tw / 2;
    let cy = this.dom.height / 2;

    ui_base.drawText(this, box, cy + ts / 2, text, {
      canvas: this.dom, g: this.g
    });
  }

  static define() {return {
    tagname : "check1-x",
    parentStyle : "button"
  };}
}

UIBase.internalRegister(Check1);

export {checkForTextBox} from './ui_textbox.js';
