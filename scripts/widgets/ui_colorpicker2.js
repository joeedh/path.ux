"use strict";

import * as util from '../util/util.js';
import * as vectormath from '../util/vectormath.js';
import * as ui_base from '../core/ui_base.js';
import * as events from '../util/events.js';
import * as ui from '../core/ui.js';
import {PropTypes} from '../toolsys/toolprop.js';
import {keymap} from '../util/simple_events.js';
import cconst from '../config/const.js';
import {color2web, web2color, validateWebColor} from "../core/ui_base.js";

let Vector2 = vectormath.Vector2,
  Vector3 = vectormath.Vector3,
  Vector4 = vectormath.Vector4,
  Matrix4 = vectormath.Matrix4;

export {rgb_to_hsv, hsv_to_rgb} from "../util/colorutils.js";
import {rgb_to_hsv, hsv_to_rgb} from "../util/colorutils.js";

let UIBase = ui_base.UIBase,
  PackFlags = ui_base.PackFlags,
  IconSheets = ui_base.IconSheets;

let UPW = 1.25, VPW = 0.75;

//*
let sample_rets = new util.cachering(() => [0, 0], 64);
export function inv_sample(u, v) {
  let ret = sample_rets.next();

  ret[0] = Math.pow(u, UPW);
  ret[1] = Math.pow(v, VPW);

  return ret;
}

export function sample(u, v) {
  let ret = sample_rets.next();

  ret[0] = Math.pow(u, 1.0/UPW);
  ret[1] = Math.pow(v, 1.0/VPW);

  return ret;
}
//*/

let fieldrand = new util.MersenneRandom(0);

let huefields = {};
export function getHueField(width, height, dpi) {
  let key = width + ":" + height + ":" + dpi.toFixed(4);

  if (key in huefields) {
    return huefields[key];
  }

  let field = new ImageData(width, height);
  let idata = field.data;

  for (let i=0; i<width*height; i++) {
    let ix = i % width, iy = ~~(i / width);
    let idx = i*4;

    let rgb = hsv_to_rgb(ix/width, 1, 1);

    idata[idx] = rgb[0]*255;
    idata[idx+1] = rgb[1]*255;
    idata[idx+2] = rgb[2]*255;
    idata[idx+3] = 255;
  }

  //*
  let canvas = document.createElement("canvas");
  canvas.width = field.width;
  canvas.height = field.height;
  let g = canvas.getContext("2d");
  g.putImageData(field, 0, 0);
  field = canvas;
  //*/

  huefields[key] = field;
  return field;
}

let fields = {};
export function getFieldImage(fieldsize, width, height, hsva) {
  fieldrand.seed(0);

  let hue = hsva[0];
  let hue_rgb = hsv_to_rgb(hue, 1.0, 1.0);
  let key = fieldsize + ":" + width + ":" + height + ":" + hue.toFixed(5);

  if (key in fields)
    return fields[key];

  //console.log("generation color picker field of size", size);

  let size2 = fieldsize;
  let valpow = 0.75;

  let image = {
    width : width,
    height : height,
    image : new ImageData(fieldsize, fieldsize),

    x2sat : (x) => {
      return Math.min(Math.max(x/width, 0), 1);
    },
    y2val : (y) => {
      y = 1.0 - Math.min(Math.max(y/height, 0), 1);

      return y === 0.0 ? 0.0 : y**valpow;
    },
    sat2x : (s) => {
       return s*width;
    },
    val2y : (v) => {
      if (v == 0)
        return height;

      v = v**(1.0 / valpow);
      return (1.0 - v)*height;
    }
  };

  image.params = {
    box : {
      x : 0,
      y : 0,
      width : width,
      height : height
    }
  };

  let idata = image.image.data;
  for (let i=0; i<idata.length; i += 4) {
    let i2 = i/4;
    let x = i2 % size2, y = ~~(i2 / size2);

    let v = 1.0 - (y / size2);
    let s = (x/size2);

    let rgb = hsv_to_rgb(hsva[0], s, v**valpow);

    idata[i] = rgb[0]*255;
    idata[i+1] = rgb[1]*255;
    idata[i+2] = rgb[2]*255;
    idata[i+3] = 255;
  }

  //*
  let image2 = document.createElement("canvas");
  image2.width = size2;
  image2.height = size2;
  let g = image2.getContext("2d");
  g.putImageData(image.image, 0, 0);
  //*/
  image.canvas = image2;
  image.scale = width / size2;

  fields[key] = image;
  return image;
}

let _update_temp = new Vector4();

export class SimpleBox {
  constructor(pos=[0, 0], size=[1, 1]) {
    this.pos = new Vector2(pos);
    this.size = new Vector2(size);
    this.r = 0;
  }
}

export class HueField extends UIBase {
  constructor() {
    super();

    this.canvas = document.createElement("canvas");
    this.g = this.canvas.getContext("2d");
    this.shadow.appendChild(this.canvas);

    let setFromXY = (x, y) => {
      let dpi = this.getDPI();
      let r = this.getDefault("circleSize");

      let h = x / ((this.canvas.width - r*4)/dpi);
      h = Math.min(Math.max(h, 0.0), 1.0);

      this.hsva[0] = h;

      if (this.onchange !== undefined) {
        this.onchange(this.hsva);
      }

      this._redraw();
    };

    this.addEventListener("mousedown", (e) => {
      let rect = this.canvas.getClientRects()[0];
      let x = e.clientX - rect.x, y = e.clientY - rect.y;

      setFromXY(x, y);

      setTimeout(() => {
        this.pushModal({
          on_mousemove: (e) => {
            let rect = this.canvas.getClientRects()[0];
            let x = e.clientX - rect.x, y = e.clientY - rect.y;

            setFromXY(x, y);
          },
          on_mousedown: (e) => {
            this.popModal();
          },
          on_mouseup: (e) => {
            this.popModal();
          },
          on_keydown: (e) => {
            if (e.keyCode == keymap["Enter"] || e.keyCode == keymap["Escape"] || e.keyCode == keymap["Space"]) {
              this.popModal();
            }
          }
        });
      }, 1)
    });
  }

  _redraw() {
    let g = this.g, canvas = this.canvas;
    let dpi = this.getDPI();

    let w = this.getDefault("defaultWidth");
    let h = this.getDefault("hueheight");

    canvas.width = ~~(w*dpi);
    canvas.height = ~~(h*dpi);

    canvas.style["width"] = w + "px";
    canvas.style["height"] = h + "px";

    let rselector = ~~(this.getDefault("circleSize") * dpi);

    let w2 = canvas.width - rselector*4, h2 = canvas.height;

    g.drawImage(getHueField(w2, h2, dpi), 0, 0, w2, h2, rselector*2, 0, w2, h2);

    let x = this.hsva[0]*(canvas.width - rselector*4) + rselector*2;
    let y = canvas.height*0.5;

    g.beginPath();
    g.arc(x, y, rselector, -Math.PI, Math.PI);
    g.closePath();

    g.strokeStyle = "white";
    g.lineWidth = 3*dpi;
    g.stroke();

    g.strokeStyle = "grey";
    g.lineWidth = 1*dpi;
    g.stroke();

    if (this.disabled) {
      g.beginPath();
      g.fillStyle = "rgba(25,25,25,0.75)"
      g.rect(0, 0, this.canvas.width, this.canvas.height);
      g.fill();
    }
  }

  on_disabled() {
    this._redraw();
  }

  on_enabled() {
    this._redraw();
  }

  static define() {return {
    tagname : "huefield-x",
    style   : "colorfield"
  };}
}

UIBase.internalRegister(HueField);

export class SatValField extends UIBase {
  constructor() {
    super();

    this.hsva = [0,0,0,1];

    this.canvas = document.createElement("canvas");
    this.g = this.canvas.getContext("2d");
    this.shadow.appendChild(this.canvas);

    this.onchange = undefined;

    let setFromXY = (x, y) => {
      let field = this._getField();
      let r = ~~(this.getDefault("circleSize")*this.getDPI());

      let sat = field.x2sat(x-r);
      let val = field.y2val(y-r);

      this.hsva[1] = sat;
      this.hsva[2] = val;

      if (this.onchange) {
        this.onchange(this.hsva);
      }

      this._redraw();
    };

    this.canvas.addEventListener("mousedown", (e) => {
      let rect = this.canvas.getClientRects()[0];
      let x = e.clientX - rect.x, y = e.clientY - rect.y;

      setFromXY(x, y);

      setTimeout(() => {
        this.pushModal({
          on_mousemove: (e) => {
            let rect = this.canvas.getClientRects()[0];
            if (rect === undefined) {
              return;
            }
            
            let x = e.clientX - rect.x, y = e.clientY - rect.y;

            setFromXY(x, y);
          },
          on_mousedown: (e) => {
            this.popModal();
          },
          on_mouseup: (e) => {
            this.popModal();
          },
          on_keydown: (e) => {
            if (e.keyCode == keymap["Enter"] || e.keyCode == keymap["Escape"] || e.keyCode == keymap["Space"]) {
              this.popModal();
            }
          }
        });
      }, 1);
    });

    this.canvas.addEventListener("touchstart", (e) => {
      let rect = this.canvas.getClientRects()[0];
      let x = e.touches[0].clientX - rect.x, y = e.touches[0].clientY - rect.y;

      setFromXY(x, y);

      setTimeout(() => {
        this.pushModal({
          on_mousemove: (e) => {
            let rect = this.canvas.getClientRects()[0];
            let x, y;

            if (e.touches && e.touches.length) {
              x = e.touches[0].clientX - rect.x;
              y = e.touches[0].clientY - rect.y;
            } else {
              x = e.x;
              y = e.y;
            }

            setFromXY(x, y);
          },
          on_touchmove: (e) => {
            let rect = this.canvas.getClientRects()[0];
            let x = e.touches[0].clientX - rect.x, y = e.touches[0].clientY - rect.y;

            setFromXY(x, y);
          },
          on_mousedown: (e) => {
            this.popModal();
          },
          on_touchcancel: (e) => {
            this.popModal();
          },
          on_touchend: (e) => {
            this.popModal();
          },
          on_mouseup: (e) => {
            this.popModal();
          },
          on_keydown: (e) => {
            if (e.keyCode == keymap["Enter"] || e.keyCode == keymap["Escape"] || e.keyCode == keymap["Space"]) {
              this.popModal();
            }
          }
        });
      }, 1);
    })
  }

  _getField() {
    let dpi = this.getDPI();
    let canvas = this.canvas;
    let r = this.getDefault("circleSize");
    let w = this.getDefault("defaultWidth");
    let h = this.getDefault("defaultHeight");

    //r = ~~(r*dpi);

    return getFieldImage(this.getDefault("fieldsize"), w-r*2, h-r*2, this.hsva);
  }

  update(force_update=false) {
    super.update();

    if (force_update) {
      this._redraw();
    }
  }

  _redraw() {
    let g = this.g, canvas = this.canvas;
    let dpi = this.getDPI();

    let w = this.getDefault("defaultWidth");
    let h = this.getDefault("defaultHeight");

    canvas.width = ~~(w*dpi);
    canvas.height = ~~(h*dpi);

    canvas.style["width"] = w + "px";
    canvas.style["height"] = h + "px";
    //SatValField

    let rselector = ~~(this.getDefault("circleSize") * dpi);

    let field = this._getField()
    let image = field.canvas;

    g.globalAlpha = 1.0;
    g.beginPath();
    g.rect(0, 0, canvas.width, canvas.height);
    g.fillStyle = "rgb(200, 200, 200)";
    g.fill();

    g.beginPath();

    let steps = 17;
    let dx = canvas.width / steps;
    let dy = canvas.height / steps;

    for (let i=0; i<steps*steps; i++) {
      let x = (i % steps)*dx, y = (~~(i / steps))*dy;

      if (i % 2 == 0) {
        continue;
      }
      g.rect(x, y, dx, dy);
    }

    g.fillStyle = "rgb(110, 110, 110)";
    g.fill();

    g.globalAlpha = this.hsva[3];
    g.drawImage(image, 0, 0, image.width, image.height, rselector, rselector, canvas.width-rselector*2, canvas.height-rselector*2);

    let hsva = this.hsva;

    let x = field.sat2x(hsva[1])*dpi + rselector;
    let y = field.val2y(hsva[2])*dpi + rselector;
    let r = rselector;

    g.beginPath();
    g.arc(x, y, r, -Math.PI, Math.PI);
    g.closePath();

    g.strokeStyle = "white";
    g.lineWidth = 3*dpi;
    g.stroke();

    g.strokeStyle = "grey";
    g.lineWidth = 1*dpi;
    g.stroke();

    if (this.disabled) {
      g.beginPath();
      g.fillStyle = "rgba(25,25,25,0.75)";
      g.rect(0, 0, this.canvas.width, this.canvas.height);
      g.fill();
    }
  }

  on_disabled() {
    this._redraw();
  }

  on_enabled() {
    this._redraw();
  }

  static define() {return {
    tagname : "satvalfield-x",
    style   : "colorfield"
  };}
}

UIBase.internalRegister(SatValField);

export class ColorField extends ui.ColumnFrame {
  constructor() {
    super();

    this.hsva = new Vector4([0.05, 0.6, 0.15, 1.0]);
    this.rgba = new Vector4([0, 0, 0, 0]);

    this._recalcRGBA();

    /*
    this.hbox = new SimpleBox();
    this.svbox = new SimpleBox();
    //*/

    this._last_dpi = undefined;

    let satvalfield = this.satvalfield = UIBase.createElement("satvalfield-x");
    satvalfield.hsva = this.hsva;

    let huefield = this.huefield = UIBase.createElement("huefield-x");
    huefield.hsva = this.hsva;

    huefield.onchange = (e) => {
      this.satvalfield._redraw();
      this._recalcRGBA();

      if (this.onchange) {
        this.onchange(this.rgba);
      }
    };

    satvalfield.onchange = (e) => {
      this._recalcRGBA();

      if (this.onchange) {
        this.onchange(this.rgba);
      }
    };

    this._add(satvalfield);
    this._add(huefield);
    //this.shadow.appendChild(canvas);
    //this.shadow.appendChild(huecanvas);
  }

  setHSVA(h, s, v, a=1.0, fire_onchange=true) {
    this.hsva[0] = h;
    this.hsva[1] = s;
    this.hsva[2] = v;
    this.hsva[3] = a;

    this._recalcRGBA();
    this.update(true);

    if (this.onchange && fire_onchange) {
      this.onchange(this.hsva, this.rgba);
    }
  }

  setRGBA(r, g, b, a=1.0, fire_onchange=true) {
    let hsv = rgb_to_hsv(r, g, b);

    this.hsva[0] = hsv[0];
    this.hsva[1] = hsv[1];
    this.hsva[2] = hsv[2];
    this.hsva[3] = a;

    this._recalcRGBA();
    this.update(true);

    if (this.onchange && fire_onchange) {
      this.onchange(this.hsva, this.rgba);
    }
  }

  _recalcRGBA() {
    let ret = hsv_to_rgb(this.hsva[0], this.hsva[1], this.hsva[2]);

    this.rgba[0] = ret[0];
    this.rgba[1] = ret[1];
    this.rgba[2] = ret[2];
    this.rgba[3] = this.hsva[3];

    return this;
  }

  updateDPI(force_update=false, _in_update=false) {
    let dpi = this.getDPI();

    let update = force_update;
    update = update || dpi != this._last_dpi;

    if (update) {
      this._last_dpi = dpi;

      if (!_in_update)
        this._redraw();

      return true;
    }
  }

  setRGBA(r, g, b, a=1.0, fire_onchange=true) {
    if (bad(r) || bad(g) || bad(b) || bad(a)) {
      console.warn("Invalid value!");
      return;
    }

    let ret = rgb_to_hsv(r, g, b);

    function bad(f) {
      return typeof f !== "number" || isNaN(f);
    }

    this.hsva[0] = ret[0];
    this.hsva[1] = ret[1];
    this.hsva[2] = ret[2];
    this.hsva[3] = a;

    this._recalcRGBA();
    this.update(true);

    if (this.onchange && fire_onchange) {
      this.onchange(this.hsva, this.rgba);
    }
  }
  update(force_update=false) {
    super.update();

    let redraw = false;

    redraw = redraw || this.updateDPI(force_update, true);

    if (redraw) {
      this.satvalfield.update(true);
      this._redraw();
    }
  }

  static define() {return {
    tagname : "colorfield-x",
    style : "colorfield"
  };}

  _redraw() {
    this.satvalfield._redraw();
    this.huefield._redraw();
  }
}
UIBase.internalRegister(ColorField);

export class ColorPicker extends ui.ColumnFrame {
  constructor() {
    super();
  }

  init() {
    super.init();

    this.field = UIBase.createElement("colorfield-x");
    this.field.setAttribute("class", "colorpicker");

    this.field.packflag |= this.inherit_packflag;
    this.field.packflag |= this.packflag;

    this.field.onchange = () => {
      this._setDataPath();
      this._setSliders();

      if (this.onchange) {
        this.onchange(this.field.rgba);
      }
    };

    let style = document.createElement("style");
    style.textContent = `
      .colorpicker {
        background-color : ${this.getDefault("BoxBG")};
      }
    `;

    this._style = style;

    let cb = this.colorbox = document.createElement("div");
    cb.style["width"] = "100%";
    cb.style["height"] = this.getDefault("colorBoxHeight") + "px";
    cb.style["background-color"] = "black";

    this.shadow.appendChild(style);
    this.field.ctx = this.ctx;

    this.add(this.colorbox);
    this.add(this.field);

    this.style["width"] = this.getDefault("defaultWidth") + "px";
  }

  updateColorBox() {
    let r = this.field.rgba[0], g = this.field.rgba[1], b = this.field.rgba[2];
    //let a = this.field.rgba[3];

    r = ~~(r*255);
    g = ~~(g*255);
    b = ~~(b*255);

    let css = `rgb(${r},${g},${b})`;
    this.colorbox.style["background-color"] = css;
  }

  static setDefault(node) {
    let tabs = node.tabs();

    node.cssText = node.textbox();
    node.cssText.onchange = (val) => {
      let ok = validateWebColor(val);
      if (!ok) {
        node.cssText.flash("red");
        return;
      } else {
        node.cssText.flash("green");
      }

      val = val.trim();

      let color = web2color(val);

      node._no_update_textbox = true;
      node.field.setRGBA(color[0], color[1], color[2], color[3]);
      node._setSliders();

      node._no_update_textbox = false;
    };

    //tabs.overrideDefault("DefaultPanelBG", node.getDefault("DefaultPanelBG"));

    let tab = tabs.tab("HSV");

    node.h = tab.slider(undefined, "Hue", 0.0, 0.0, 1.0, 0.001, false, true, (e) => {
      let hsva = node.hsva;
      node.setHSVA(e.value, hsva[1], hsva[2], hsva[3]);
    });

    node.s = tab.slider(undefined, "Saturation", 0.0, 0.0, 1.0, 0.001, false, true, (e) => {
      let hsva = node.hsva;
      node.setHSVA(hsva[0], e.value, hsva[2], hsva[3]);
    });
    node.v = tab.slider(undefined, "Value", 0.0, 0.0, 1.0, 0.001, false, true, (e) => {
      let hsva = node.hsva;
      node.setHSVA(hsva[0], hsva[1], e.value, hsva[3]);
    });
    node.a = tab.slider(undefined, "Alpha", 0.0, 0.0, 1.0, 0.001, false, true, (e) => {
      let hsva = node.hsva;
      node.setHSVA(hsva[0], hsva[1], hsva[2], e.value);
    });

    tab = tabs.tab("RGB");

    node.r = tab.slider(undefined, "R", 0.0, 0.0, 1.0, 0.001, false, true, (e) => {
      let rgba = node.rgba;
      node.setRGBA(e.value, rgba[1], rgba[2], rgba[3]);
    });
    node.g = tab.slider(undefined, "G", 0.0, 0.0, 1.0, 0.001, false, true, (e) => {
      let rgba = node.rgba;
      node.setRGBA(rgba[0], e.value, rgba[2], rgba[3]);
    });
    node.b = tab.slider(undefined, "B", 0.0, 0.0, 1.0, 0.001, false, true, (e) => {
      let rgba = node.rgba;
      node.setRGBA(rgba[0], rgba[1], e.value, rgba[3]);
    });
    node.a2 = tab.slider(undefined, "Alpha", 0.0, 0.0, 1.0, 0.001, false, true, (e) => {
      let rgba = node.rgba;
      node.setRGBA(rgba[0], rgba[1], rgba[2], e.value);
    });

    node._setSliders();
  }

  _setSliders() {
    if (this.h === undefined) {
      //setDefault() wasn't called
      console.warn("colorpicker ERROR");
      return;
    }

    let hsva = this.field.hsva;
    this.h.setValue(hsva[0], false);
    this.s.setValue(hsva[1], false);
    this.v.setValue(hsva[2], false);
    this.a.setValue(hsva[3], false);

    let rgba = this.field.rgba;

    this.r.setValue(rgba[0], false);
    this.g.setValue(rgba[1], false);
    this.b.setValue(rgba[2], false);
    this.a2.setValue(rgba[3], false);

    this.updateColorBox();

    if (!this._no_update_textbox) {
      this.cssText.text = color2web(this.field.rgba);
    }
  }

  //*
  get hsva() {
    return this.field.hsva;
  }

  get rgba() {
    return this.field.rgba;
  }//*/

  updateDataPath() {
    if (!this.hasAttribute("datapath")) {
      return;
    }

    let prop = this.getPathMeta(this.ctx, this.getAttribute("datapath"));
    let val =  this.getPathValue(this.ctx, this.getAttribute("datapath"));

    if (val === undefined) {
      //console.warn("Bad datapath", this.getAttribute("datapath"));
      this.internalDisabled = true;
      return;
    }

    this.internalDisabled = false;

    _update_temp.load(val);

    if (prop.type === PropTypes.VEC3) {
      _update_temp[3] = 1.0;
    }

    if (_update_temp.vectorDistance(this.field.rgba) > 0.01)  {
      this.field.setRGBA(_update_temp[0], _update_temp[1], _update_temp[2], _update_temp[3], false);
      this._setSliders();
      this.field.update(true);
    }
  }

  update() {
    if (this.hasAttribute("datapath")) {
      this.updateDataPath();
    }

    super.update();
  }

  _setDataPath() {
    if (this.hasAttribute("datapath")) {
      let prop = this.getPathMeta(this.ctx, this.getAttribute("datapath"));

      if (prop === undefined) {
        console.warn("Bad data path for color field:", this.getAttribute("datapath"));
      }

      let val = this.field.rgba;
      if (prop !== undefined && prop.type === PropTypes.VEC3) {
        val = new Vector3();
        val.load(this.field.rgba);
      }

      this.setPathValue(this.ctx, this.getAttribute("datapath"), val);
    }
  }

  setHSVA(h, s, v, a) {
    this.field.setHSVA(h, s, v, a);
    this._setSliders();
    this._setDataPath();
  }

  setRGBA(r, g, b, a) {
    this.field.setRGBA(r, g, b, a)
    this._setSliders();
    this._setDataPath();
  }

  static define() {return {
    tagname : "colorpicker-x",
    style : "colorfield"
  };}
}

UIBase.internalRegister(ColorPicker);


export class ColorPickerButton extends UIBase {
  constructor() {
    super();

    this._highlight = false;
    this._depress = false;
    this._label = "";

    this.rgba = new Vector4([1, 1, 1, 1]);

    this.labelDom = document.createElement("span");
    this.labelDom.textContent = "error";
    this.dom = document.createElement("canvas");
    this.g = this.dom.getContext("2d");

    this.shadow.appendChild(this.labelDom);
    this.shadow.appendChild(this.dom);
  }

  set label(val) {
    this._label = val;
    this.labelDom.textContent = val;
  }

  get label() {
    return this._label;
  }

  init() {
    super.init();
    this._font = "DefaultText"; //this.getDefault("defaultFont");

    let enter = (e) => {
      this._keyhandler_add();
      this._highlight = true;
      this._redraw();
    };

    let leave = (e) => {
      this._keyhandler_remove();
      this._highlight = false;
      this._redraw();
    };

    this.tabIndex = 0;

    this._has_keyhandler = false;
    this._keyhandler_timeout = -1;
    this._last_keyevt = undefined;

    this._keydown = this._keydown.bind(this);
    this.addEventListener("keydown", (e) => {
      return this._keydown(e, true);
    });

    this.addEventListener("mousedown", (e) => {
      this.click(e);
    });

    this.addEventListener("mouseover", enter);
    this.addEventListener("mouseleave", leave);
    this.addEventListener("mousein", enter);
    this.addEventListener("mouseout", leave);
    this.addEventListener("focus", enter);
    this.addEventListener("blur", leave);

    this.setCSS();
  }

  _keyhandler_remove() {
    if (this._has_keyhandler) {
      window.removeEventListener("keydown", this._keydown, {
        capture : true, passive : false
      });
      this._has_keyhandler = false;
    }
  }

  _keyhandler_add() {
    if (!this._has_keyhandler) {
      window.addEventListener("keydown", this._keydown, {
        capture : true, passive : false
      });
      this._has_keyhandler = true;
    }

    this._keyhandler_timeout = util.time_ms();
  }

  _keydown(e, internal_mode=false) {
    if (internal_mode && !this._highlight) {
      return;
    }

    if (e === this._last_keyevt) {
      return; //prevent double event procesing
    }

    this._last_keyevt = e;

    if (e.keyCode === 67 && (e.ctrlKey||e.commandKey) && !e.shiftKey && !e.altKey) {
      this.clipboardCopy();
      e.preventDefault();
      e.stopPropagation();
    }
    if (e.keyCode === 86 && (e.ctrlKey||e.commandKey) && !e.shiftKey && !e.altKey) {
      this.clipboardPaste();
      e.preventDefault();
      e.stopPropagation();
    }
  }

  clipboardCopy() {
    if (!cconst.setClipboardData) {
      console.log("no clipboard api");
      return;
    }

    let r = this.rgba[0]*255;
    let g = this.rgba[1]*255;
    let b = this.rgba[2]*255;
    let a = this.rgba[3];

    let data = `rgba(${r.toFixed(4)}, ${g.toFixed(4)}, ${b.toFixed(4)}, ${a.toFixed(4)})`;
    //cconst.setClipboardData("color", "text/css", data);

    cconst.setClipboardData("color", "text/plain", data);

    /*
    function makehex(c) {
      c = (~~c).toString(16);
      while (c.length < 2) {
        c = "0" + c;
      }

      if (c.length > 2) {
        return "FF";
      }

      return c.toUpperCase();
    }

    r = makehex(r);
    g = makehex(g);
    b = makehex(b);
    a = makehex(a*255);

    data = "#" + r + g + b + a;

    cconst.setClipboardData("color", "text/plain", data);

     */
  }

  clipboardPaste() {
    if (!cconst.getClipboardData) {
      return;
    }

    let data = cconst.getClipboardData("text/plain");

    if (!data || !validateCSSColor(""+data.data)) {// || data.mime !== "text/css") {
      return;
    }

    let color;

    try {
      color = css2color(data.data);
    } catch (error) {
      //not a color
      console.log(error.stack);
      console.log(error.message);
    }

    if (color) {
      if (color.length < 4) {
        color.push(1.0);
      }

      this.setRGBA(color);
    }

    /*
    console.log("data:", data);
    data = data.data.trim();
    if (data.startsWith("{")) {
      data = data.slice(1, data.length-1).split(";");
      for (let arg of data) {
        arg = arg.trim().split(":");

        if (arg.length < 2) {
          continue;
        }

        arg[0] = arg[0].trim().toLowerCase();
        arg[1] = arg[1].trim().toLowerCase();

        if (arg[0] === "color") {
          data = arg[1];
          break;
        }
      }
    }

    console.log("DATA", data);
    let color = css2color(data);

    if (color.length < 3) {
      color.push(1.0);
    }
    console.log("COLOR", color);

    this.setRGBA(color);

     */
  }

  click(e) {
    if (this.onclick) {
      this.onclick(e);
    }

    let colorpicker = this.ctx.screen.popup(this, this);
    colorpicker.useDataPathUndo = this.useDataPathUndo;

    let path = this.hasAttribute("datapath") ? this.getAttribute("datapath") : undefined;

    let widget = colorpicker.colorPicker(path, undefined, this.getAttribute("mass_set_path"));
    widget._init();
    widget.setRGBA(this.rgba[0], this.rgba[1], this.rgba[2], this.rgba[3]);

    widget.style["padding"] = "20px";

    let onchange = () => {
      this.rgba.load(widget.rgba);
      this.redraw();
      
      if (this.onchange) {
        this.onchange(this);
      }
    }

    widget.onchange = onchange;

    colorpicker.style["background-color"] = widget.getDefault("DefaultPanelBG");
    colorpicker.style["border-radius"] = "25px";
    colorpicker.style["border"] = widget.getDefault("border");
  }

  setRGBA(val) {
    let a = this.rgba[3];

    let old = new Vector4(this.rgba);

    this.rgba.load(val);

    if (val.length < 4) {
      this.rgba[3] = a;
    }

    if (this.rgba.vectorDistance(old) < 0.001) {
      return;
    }

    if (this.hasAttribute("datapath")) {
      this.setPathValue(this.ctx, this.getAttribute("datapath"), this.rgba);
    }

    if (this.onchange) {
      this.onchange();
    }

    this._redraw();
    return this;
  }

  get font() {
    return this._font;
  }

  set font(val) {
    this._font = val;

    this.setCSS();
  }

  on_disabled() {
    this.setCSS();
    this._redraw();
  }
  
  _redraw() {
    let canvas = this.dom, g = this.g;

    g.clearRect(0, 0, canvas.width, canvas.height);

    if (this.disabled) {
      let color = "rgb(55, 55, 55)";

      g.save();

      ui_base.drawRoundBox(this, canvas, g, canvas.width, canvas.height, undefined, "fill", color);
      ui_base.drawRoundBox(this, canvas, g, canvas.width, canvas.height, undefined, "clip");
      let steps = 5;
      let dt = canvas.width / steps, t = 0;

      g.beginPath();
      g.lineWidth = 2;
      g.strokeStyle = "black";

      for (let i=0; i<steps; i++, t += dt) {
        g.moveTo(t, 0);
        g.lineTo(t+dt, canvas.height);
        g.moveTo(t+dt, 0);
        g.lineTo(t, canvas.height);
      }

      g.stroke();
      g.restore();
      return;
    }

    //do checker pattern for alpha
    g.save();

    let grid1 = "rgb(100, 100, 100)";
    let grid2 = "rgb(175, 175, 175)";

    ui_base.drawRoundBox(this, canvas, g, canvas.width, canvas.height, undefined, "clip");
    ui_base.drawRoundBox(this, canvas, g, canvas.width, canvas.height, undefined, "fill", grid1);

    let cellsize = 10;
    let totx = Math.ceil(canvas.width / cellsize), toty = Math.ceil(canvas.height / cellsize);

    ui_base.drawRoundBox(this, canvas, g, canvas.width, canvas.height, undefined, "clip", undefined, undefined, true);
    g.clip();

    g.beginPath();
    for (let x=0; x<totx; x++) {
      for (let y=0; y<toty; y++) {
        if ((x+y) & 1) {
          continue;
        }

        g.rect(x*cellsize, y*cellsize, cellsize, cellsize);
      }
    }

    g.fillStyle = grid2;
    g.fill();

    //g.fillStyle = "orange";
    //g.beginPath();
    //g.rect(0, 0, canvas.width, canvas.height);
    //g.fill();

    let color = color2css(this.rgba);
    ui_base.drawRoundBox(this, canvas, g, canvas.width, canvas.height, undefined, "fill", color, undefined, true);
    //drawRoundBox(elem, canvas, g, width, height, r=undefined, op="fill", color=undefined, pad=undefined) {

    if (this._highlight) {
      //let color = "rgba(200, 200, 255, 0.5)";
      let color = this.getDefault("BoxHighlight");
      ui_base.drawRoundBox(this, canvas, g, canvas.width, canvas.height, undefined, "fill", color);
    }

    g.restore();
  }

  setCSS() {
    super.setCSS();

    let w = this.getDefault("defaultWidth");
    let h = this.getDefault("defaultHeight");
    let dpi = this.getDPI();

    this.style["width"] = "min-contents" + "px";
    this.style["height"] = h + "px";

    this.style["flex-direction"] = "row";
    this.style["display"] = "flex";

    this.labelDom.style["color"] = this.getDefault(this._font).color;
    this.labelDom.style["font"] = ui_base.getFont(this, undefined, this._font, false);

    let canvas = this.dom;

    canvas.style["width"] = w + "px";
    canvas.style["height"] = h + "px";
    canvas.width = ~~(w*dpi);
    canvas.height = ~~(h*dpi);
        
    this.style["background-color"] = "rgba(0,0,0,0)";
    this._redraw();
  }

  static define() {return {
    tagname : "color-picker-button-x",
    style   : "colorpickerbutton"
  }}

  updateDataPath() {
    if (!(this.hasAttribute("datapath"))) {
      return;
    }

    let path = this.getAttribute("datapath");
    let prop = this.getPathMeta(this.ctx, path);

    if ((prop === undefined || prop.data === undefined) && cconst.DEBUG.verboseDataPath) {
      console.log("bad path", path);
      return;
    } else if (prop === undefined) {
      let redraw = !this.disabled;

      this.internalDisabled = true;

      if (redraw) {
        this._redraw();
      }
      return;
    }

    let redraw = this.disabled;

    this.internalDisabled = false;

    if (prop.uiname !== this._label) {
      this.label = prop.uiname;
    }

    let val = this.getPathValue(this.ctx, path);

    if (val === undefined) {
      redraw = redraw || this.disabled !== true;

      this.internalDisabled = true;

      if (redraw) {
        this._redraw();
      }

    } else {
      this.internalDisabled = false;

      let dis;

      if (val.length === 3) {
        dis = Vector3.prototype.vectorDistance.call(val, this.rgba);
      } else {
        dis = this.rgba.vectorDistance(val);
      }

      if (dis > 0.0001) {
        if (prop.type === PropTypes.VEC3) {
          this.rgba.load(val);
          this.rgba[3] = 1.0;
        } else {
          this.rgba.load(val);
        }

        redraw = true;
      }

      if (redraw) {
        this._redraw();
      }
    }
  }

  update() {
    super.update();

    //remove keyhandler after timeout in case something kept it from happening automatically
    if (this._has_keyhandler && util.time_ms() - this._keyhandler_timeout > 3500) {
      console.log("keyhandler auto remove");
      this._keyhandler_remove();
    }

    let key = "" + this.rgba[0].toFixed(4) + " " + this.rgba[1].toFixed(4) + " " + this.rgba[2].toFixed(4) + " " + this.rgba[3].toFixed(4);
    if (key !== this._last_key) {
      this._last_key = key;
      this.redraw();
    }
    
    if (this.hasAttribute("datapath")) {
      this.updateDataPath();
    }
  }

  redraw() {
    this._redraw();
  }
};
UIBase.internalRegister(ColorPickerButton);
