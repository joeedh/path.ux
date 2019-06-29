"use strict";

import * as util from './util.js';
import * as vectormath from './vectormath.js';
import * as ui_base from './ui_base.js';
import * as events from './events.js';
import * as ui from './ui.js';
import {PropTypes} from 'toolprops';
import {keymap} from './simple_events';

let rgb_to_hsv_rets = new util.cachering(() => [0, 0, 0], 64);

let Vector2 = vectormath.Vector2,
  Vector3 = vectormath.Vector3,
  Vector4 = vectormath.Vector4,
  Matrix4 = vectormath.Matrix4;

export function rgb_to_hsv (r,g,b) {
  var computedH = 0;
  var computedS = 0;
  var computedV = 0;

  if ( r==null || g==null || b==null ||
    isNaN(r) || isNaN(g)|| isNaN(b) ) {
    throw new Error('Please enter numeric RGB values!');
    return;
  }
  /*
  if (r<0 || g<0 || b<0 || r>1.0 || g>1.0 || b>1.0) {
   throw new Error('RGB values must be in the range 0 to 1.0');
   return;
  }//*/

  var minRGB = Math.min(r,Math.min(g,b));
  var maxRGB = Math.max(r,Math.max(g,b));

  // Black-gray-white
  if (minRGB==maxRGB) {
    computedV = minRGB;

    let ret = rgb_to_hsv_rets.next();
    ret[0] = 0, ret[1] = 0, ret[2] = computedV;
    return ret;
  }

  // Colors other than black-gray-white:
  var d = (r==minRGB) ? g-b : ((b==minRGB) ? r-g : b-r);
  var h = (r==minRGB) ? 3 : ((b==minRGB) ? 1 : 5);

  computedH = (60*(h - d/(maxRGB - minRGB))) / 360.0;
  computedS = (maxRGB - minRGB)/maxRGB;
  computedV = maxRGB;

  let ret = rgb_to_hsv_rets.next();
  ret[0] = computedH, ret[1] = computedS, ret[2] = computedV;
  return ret;
}

let hsv_to_rgb_rets = new util.cachering(() => [0, 0, 0], 64);

export function hsv_to_rgb(h, s, v) {
  let c=0, m=0, x=0;
  let ret = hsv_to_rgb_rets.next();

  ret[0] = ret[1] = ret[2] = 0.0;
  h *= 360.0;

  c = v * s;
  x = c * (1.0 - Math.abs(((h / 60.0) % 2) - 1.0));
  m = v - c;
  let color;

  function RgbF_Create(r, g, b) {
    ret[0] = r;
    ret[1] = g;
    ret[2] = b;

    return ret;
  }

  if (h >= 0.0 && h < 60.0)
  {
    color = RgbF_Create(c + m, x + m, m);
  }
  else if (h >= 60.0 && h < 120.0)
  {
    color = RgbF_Create(x + m, c + m, m);
  }
  else if (h >= 120.0 && h < 180.0)
  {
    color = RgbF_Create(m, c + m, x + m);
  }
  else if (h >= 180.0 && h < 240.0)
  {
    color = RgbF_Create(m, x + m, c + m);
  }
  else if (h >= 240.0 && h < 300.0)
  {
    color = RgbF_Create(x + m, m, c + m);
  }
  else if (h >= 300.0)
  {
    color = RgbF_Create(c + m, m, x + m);
  }
  else
  {
    color = RgbF_Create(m, m, m);
  }

  return color;
}

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
      let dpi = UIBase.getDPI();
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
    let dpi = UIBase.getDPI();

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
  }

  static define() {return {
    tagname : "huefield-x",
    style   : "colorfield"
  };}
}

UIBase.register(HueField);

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
      let r = ~~(this.getDefault("circleSize")*UIBase.getDPI());

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
    })
  }

  _getField() {
    let dpi = UIBase.getDPI();
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
    let dpi = UIBase.getDPI();

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
  }

  static define() {return {
    tagname : "satvalfield-x",
    style   : "colorfield"
  };}
}

UIBase.register(SatValField);

export class ColorField extends ui.RowFrame {
  constructor() {
    super();

    this.hsva = [0.05, 0.6, 0.15, 1.0];
    this.rgba = new Vector4([0, 0, 0, 0]);

    this._recalcRGBA();

    /*
    this.hbox = new SimpleBox();
    this.svbox = new SimpleBox();
    //*/

    this._last_dpi = undefined;

    let satvalfield = this.satvalfield = document.createElement("satvalfield-x");
    satvalfield.hsva = this.hsva;

    let huefield = this.huefield = document.createElement("huefield-x");
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
    let dpi = UIBase.getDPI();

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
    let ret = rgb_to_hsv(r, g, b);

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
UIBase.register(ColorField);

export class ColorPicker extends ui.ColumnFrame {
  constructor() {
    super();

    this.field = document.createElement("colorfield-x");
    this.field.setAttribute("class", "colorpicker");

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

    this.shadow.appendChild(this.colorbox);
    this.shadow.appendChild(style);
    this.field.ctx = this.ctx;
    this.shadow.appendChild(this.field);
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

  init() {
    super.init();

    this.style["width"] = this.getDefault("defaultWidth") + "px";
  }

  static setDefault(node) {
    let tabs = node.tabs();

    tabs.overrideDefault("DefaultPanelBG", node.getDefault("DefaultPanelBG"));

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

    let hsva = this.hsva;
    this.h.setValue(hsva[0], false);
    this.s.setValue(hsva[1], false);
    this.v.setValue(hsva[2], false);
    this.a.setValue(hsva[3], false);

    let rgba = this.rgba;

    this.r.setValue(rgba[0], false);
    this.g.setValue(rgba[1], false);
    this.b.setValue(rgba[2], false);
    this.a2.setValue(rgba[3], false);

    this.updateColorBox();
  }

  get hsva() {
    return this.field.hsva;
  }

  get rgba() {
    return this.field.rgba;
  }

  updateDataPath() {
    if (!this.hasAttribute("datapath")) {
      return;
    }

    let prop = UIBase.getPathMeta(this.ctx, this.getAttribute("datapath"));
    let val =  UIBase.getPathValue(this.ctx, this.getAttribute("datapath"));

    if (val === undefined) {
      //console.warn("Bad datapath", this.getAttribute("datapath"));
      this.disabled = true;
      return;
    }

    this.disabled = false;

    _update_temp.load(val);

    if (prop.type == PropTypes.VEC3) {
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
      ui_base.UIBase.setPathValue(this.ctx, this.getAttribute("datapath"), this.field.rgba);
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

UIBase.register(ColorPicker);
