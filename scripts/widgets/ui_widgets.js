"use strict";

import * as util from '../util/util.js';
import * as vectormath from '../util/vectormath.js';
import * as ui_base from '../core/ui_base.js';
import * as events from '../util/events.js';
import * as simple_toolsys from '../toolsys/simple_toolsys.js';
import * as toolprop from '../toolsys/toolprop.js';
import {DataPathError} from '../controller/simple_controller.js';
import {Vector3, Vector4, Quat, Matrix4} from '../util/vectormath.js';
import {isNumber} from "../toolsys/toolprop.js";
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

      this.disabled = true;

      if (redraw) this._redraw();

      return;
    } else {
      let redraw = this.disabled;

      this.disabled = false;
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

    let color = this.getDefault("FocusOutline");

    style.textContent = `
      .checkx:focus {
        outline : none;
      }
    `;

    //document.body.prepend(style);
    this.prepend(style);
  }

  get disabled() {
    return super.disabled;
  }

  set disabled(val) {
    super.disabled = val;
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
  }

  updateDataPath() {
    if (!this.getAttribute("datapath")) {
      return;
    }

    let val = this.getPathValue(this.ctx, this.getAttribute("datapath"));

    if (val === undefined) {
      this.disabled = true;
      return;
    } else {
      this.disabled = false;
    }

    val = !!val;

    if (!!this._checked != !!val) {
      this._checked = val;
      this._redraw();
    }
  }

  _repos_canvas() {
    if (this.canvas === undefined)
      return;

    let r = this.canvas.getClientRects()[0];

    if (r === undefined) {
      return;
    }

  }

  _redraw() {
    if (this.canvas === undefined)
      return;

    let canvas = this.canvas, g = this.g;
    let dpi = UIBase.getDPI();
    let tilesize = ui_base.iconmanager.getTileSize(0);
    let pad = this.getDefault("BoxMargin");

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
      color = this.getDefault("FocusOutline");
      g.lineWidth *= dpi;
      ui_base.drawRoundBox(this, canvas, g, undefined, undefined, undefined, "stroke", color);
    }
  }

  set checked(v) {
    if (!!this._checked != !!v) {
      this._checked = v;
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

    if (updatekey !== this._updatekey) {
      this._updatekey = updatekey;
      this.setCSS();
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
    style   : "checkbox"
  };}
}
UIBase.register(Check);

export class IconCheck extends Button {
  constructor() {
    super();

    this._checked = undefined;

    this._drawCheck = true;
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
    return this._drawCheck;
  }

  set drawCheck(val) {
    if (val && (this.packflag & PackFlags.HIDE_CHECK_MARKS)) {
      this.packflag &= ~PackFlags.HIDE_CHECK_MARKS;
    }

    this._drawCheck = val;
    this._redraw();
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
        let icon, title;

        //console.log("SUBKEY", rdef.subkey, rdef.prop.iconmap);

        if (rdef.subkey && (rdef.prop.type == PropTypes.FLAG || rdef.prop.type == PropTypes.ENUM)) {
          icon = rdef.prop.iconmap[rdef.subkey];
          title = rdef.prop.descriptions[rdef.subkey];

          if (title === undefined && rdef.subkey.length > 0) {
            title = rdef.subkey;
            title = title[0].toUpperCase() + title.slice(1, title.length).toLowerCase();
          }
        } else {
          icon = rdef.prop.icon;
          title = rdef.prop.description;
        }

        if (icon !== undefined && icon !== this.icon)
          this.icon = icon;
        if (title !== undefined)
          this.description = title;
      }
    }

    let val = this.getPathValue(this.ctx, this.getAttribute("datapath"));

    if (val === undefined) {
      this.disabled = true;
      return;
    } else {
      this.disabled = false;
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
      let margin = this.getDefault("BoxMargin");
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

    console.log("click!", this.checked);
    this._redraw();
  }
  
  _redraw() {
    this._repos_canvas();
    
    //this.dom._background = this._checked ? this.getDefault("BoxDepressed") : this.getDefault("BoxBG");
    if (this._checked) {
      this._highlight = false;
    }

    //
    let pressed = this._pressed;
    this._pressed = this._checked;
    super._redraw(false);
    this._pressed = pressed;

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
    style   : "iconcheck"
  };}
}

UIBase.register(IconCheck);

export class IconButton extends Button {
  constructor() {
    super();

    this._icon = 0;
    this._icon_pressed = undefined;
    this.iconsheet = ui_base.Icons.LARGE;
  }

  updateDefaultSize() {

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
    let margin = this.getDefault("BoxMargin");

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
    
    //this.dom._background = this._checked ? this.getDefault("BoxDepressed") : this.getDefault("BoxBG");
    //
    super._redraw(false);

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
    ui_base.iconmanager.canvasDraw(this, this.dom, this.g, icon, undefined, undefined, this.iconsheet);
    this.g.restore();
  }
  
  static define() {return {
    tagname : "iconbutton-x",
    style : "iconbutton",
  };}
}

UIBase.register(IconButton);

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

    let r = this.getDefault("BoxRadius") * dpi;
    let pad = this.getDefault("BoxMargin") * dpi;
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
    tagname : "check1-x"
  };}
}

UIBase.register(Check1);

export {checkForTextBox} from './ui_textbox.js';
