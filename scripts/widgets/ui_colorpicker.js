"use strict";

//currently unused, see ui_colorpicker2.js

import * as util from '../util/util.js';
import * as vectormath from '../util/vectormath.js';
import * as ui_base from '../core/ui_base.js';
import * as events from '../util/events.js';
import * as ui from '../core/ui.js';
import {PropTypes} from '../toolsys/toolprop.js';

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
  else if (h >= 300.0 && h < 360.0)
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
    
let fields = {};
export function getFieldImage(size, hsva) {
  fieldrand.seed(0);
  
  let hue = hsva[0];
  let hue_rgb = hsv_to_rgb(hue, 1.0, 1.0);
  let key = size + ":" + hue.toFixed(4);
  
  if (key in fields)
    return fields[key];
  
  //console.log("generation color picker field of size", size);
  
  let size2 = 128;
  let image = {
    width : size, 
    height : size, 
    image : new ImageData(size2, size2)
  };
  
  let scale = size2 / size;
  
  let idata = image.image.data;
  let dpi = this.getDPI();
  
  let band = ui_base.IsMobile() ? 35 : 20;
  
  let r2 = Math.ceil(size*0.5), r1 = r2 - band*dpi;
  
  let pad = 5*dpi;
  let px1 = size*0.5 - r1 / Math.sqrt(2.0) + pad;
  let py1 = size*0.5 - r1 / Math.sqrt(2.0) + pad;
  
  let pw = r1 / Math.sqrt(2)*2 - pad*2, ph = pw;
  
  image.params = {
    r1 : r1,
    r2 : r2,
    
    box : {
      x : px1,
      y : py1,
      width : pw,
      height : ph
    }
  };
  
  for (let i=0; i<size2*size2; i++) {
    let x = i % size2, y = ~~(i / size2);
    let idx = i*4;
    let alpha = 0.0;
    
    let r = Math.sqrt((x-size2*0.5)**2 + (y-size2*0.5)**2);
    
    if (r < r2*scale && r > r1*scale) {
      let th = Math.atan2(y-size2*0.5, x-size2*0.5) / (2 * Math.PI) + 0.5;
      let eps = 0.001
      th = th*(1.0 - eps*2) + eps;
      
      let r=0, g=0, b=0;
      
      if (th < 1.0/6.0) {
        r = 1.0;
        g = th*6.0;
      } else if (th < 2.0/6.0) {
        th -= 1.0/6.0;
        r = 1.0 - th*6.0;
        g = 1.0;
      } else if (th < 3.0/6.0) {
        th -= 2.0/6.0;
        g = 1.0;
        b = th*6.0;
      } else if (th < 4.0/6.0) {
        th -= 3.0/6.0;
        b = 1.0;
        g = 1.0 - th*6.0;
      } else if (th < 5.0/6.0) {
        th -= 4.0/6.0;
        r = th * 6.0;
        b = 1.0;
      } else if (th < 6.0/6.0) {
        th -= 5.0/6.0;
        r = 1.0;
        b = 1.0 - th*6.0;
      }
      
      /*
      let l = Math.sqrt(r*r + g*g + b*b);
      if (l > 0.0) {
        r = (r / l)*255;
        g = (g / l)*255;
        b = (b / l)*255;
      }//*/
      //*
      r = r*255 + (fieldrand.random()-0.5);
      g = g*255 + (fieldrand.random()-0.5);
      b = b*255 + (fieldrand.random()-0.5);
      //*/
      
      idata[idx] = r;
      idata[idx+1] = g;
      idata[idx+2] = b;
      
      alpha = 1.0;
    }
    
    let px2 = (px1 + pw)*scale, py2 = (py1 + ph)*scale;
    
    if (x > px1*scale && y > py1*scale && x < px2 && y < py2) {
      let u = 1.0 - (x - px1*scale) / (px2 - px1*scale);
      let v = 1.0 - (y - py1*scale) / (py2 - py1*scale);
      
      //let inv = fields.inv_sample(u, v);
      //u = inv[0], v = inv[1];
      u = Math.pow(u, UPW);
      v = Math.pow(v, VPW);
      
      //u = u*u*(3.0 - 2.0*u);
      //v = v*v*(3.0 - 2.0*v);
      
      let r=0, g=0, b=0;
      
      //(u*v)*255;
      r = hue_rgb[0]*(1.0-u) + u;
      g = hue_rgb[1]*(1.0-u) + u;
      b = hue_rgb[2]*(1.0-u) + u;
      
      //let s = 255;
      let fac = 1.0;
      
      //r = (~~(r*s + (fieldrand.random()-0.5)*fac))/s;
      //g = (~~(g*s + (fieldrand.random()-0.5)*fac))/s;
      //b = (~~(b*s + (fieldrand.random()-0.5)*fac))/s;

      idata[idx+0] = r*v*255 + (fieldrand.random()-0.5)*fac;
      idata[idx+1] = g*v*255 + (fieldrand.random()-0.5)*fac;
      idata[idx+2] = b*v*255 + (fieldrand.random()-0.5)*fac;
      
      alpha = 1.0;
    }
    
    idata[idx+3] = alpha*255;
  }
  
  //console.log("done.");
  
  //*
  let image2 = document.createElement("canvas");
  image2.width = size2;
  image2.height = size2;
  let g = image2.getContext("2d");
  g.putImageData(image.image, 0, 0);
  //*/
  image.canvas = image2;
  image.scale = size / size2;
  
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

export class ColorField extends UIBase {
  constructor() {
    super();
    
    this.hsva = [0.05, 0.6, 0.15, 1.0];
    this.rgba =new Vector4([0, 0, 0, 0]);
    
    this._recalcRGBA();
    
    /*
    this.hbox = new SimpleBox();
    this.svbox = new SimpleBox();
    //*/
    
    this._last_dpi = undefined;
    
    let canvas = this.canvas = document.createElement("canvas");
    let g = this.g = canvas.getContext("2d");
    
    this.shadow.appendChild(canvas);
    
    let mx, my;
    
    let do_mouse = (e) => {
      let r = this.canvas.getClientRects()[0];
      let dpi = this.getDPI();
      
      mx = (e.pageX-r.x)*dpi;
      my = (e.pageY-r.y)*dpi;
    }
    
    let do_touch = (e) => {
      if (e.touches.length == 0) {
        mx = my = undefined;
        return;
      }
      
      let r = this.canvas.getClientRects()[0];
      let dpi = this.getDPI();
      let t = e.touches[0];
      
      mx = (t.pageX-r.x)*dpi;
      my = (t.pageY-r.y)*dpi;
    }
    
    this.canvas.addEventListener("mousedown", (e) => {
      do_mouse(e);
      return this.on_mousedown(e, mx, my, e.button);
    });
    this.canvas.addEventListener("mousemove", (e) => {
      do_mouse(e);
      return this.on_mousemove(e, mx, my, e.button);
    });
    this.canvas.addEventListener("mouseup", (e) => {
      do_mouse(e);
      return this.on_mouseup(e, mx, my, e.button);
    });
    
    this.canvas.addEventListener("touchstart", (e) => {
      do_touch(e);
      if (mx !== undefined)
        return this.on_mousedown(e, mx, my, 0);
    });
    
    this.canvas.addEventListener("touchmove", (e) => {
      do_touch(e);
      if (mx !== undefined)
        return this.on_mousemove(e, mx, my, 0);
    });
    
    this.canvas.addEventListener("touchend", (e) => {
      do_touch(e);
      if (mx !== undefined)
        return this.on_mouseup(e, mx, my, 0);
    });
    
    this.canvas.addEventListener("touchcancel", (e) => {
      do_touch(e);
      if (mx !== undefined)
        return this.on_mouseup(e, mx, my, 0);
    });

    this.updateCanvas(true);
  }
  
  pick_h(x, y) {
    let field = this._field;
    let size = field.width;
    let dpi = this.getDPI();
    
    if (field === undefined) {
      console.error("no field in colorpicker");
      return //no field!
    }
    
    
    //console.log(x, y, size, "SIZE");
    let th = Math.atan2(y-size/2, x-size/2)/(2*Math.PI) + 0.5;
    
    this.hsva[0] = th;

    this.update(true);
    this._recalcRGBA();
    
    
    if (this.onchange) {
      this.onchange(this.hsva, this.rgba);
    }
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
  
  _recalcRGBA() {
    let ret = hsv_to_rgb(this.hsva[0], this.hsva[1], this.hsva[2]);
    
    this.rgba[0] = ret[0];
    this.rgba[1] = ret[1];
    this.rgba[2] = ret[2];
    this.rgba[3] = this.hsva[3];
    
    return this;
  }
  
  on_mousedown(e, x, y, button) {
      if (button != 0)
        return
      
      let field = this._field;
      if (field === undefined)
        return;
      let size = field.width;
      
      let dpi = this.getDPI();
      let r = Math.sqrt((x-size/2)**2 + (y-size/2)**2);
      let pad = 5*dpi;
      
      let px1 = field.params.box.x, py1 = field.params.box.y, 
          px2 = px1 + field.params.box.width, py2 = py1 + field.params.box.height;
        
      px1 -= pad*0.5;
      py1 -= pad*0.5;
      px2 += pad*0.5;
      py2 += pad*0.5;
      
      if (r > field.params.r1-pad && r < field.params.r2+pad) {
        this.pick_h(x, y);
        this._mode = "h";
      } else if (x >= px1 && x <= px2 && y >= py1 && y <= py2) {
        this.pick_sv(x, y);
        console.log("in box");
        this._mode = "sv";
      }
      
      
      
      e.preventDefault();
      e.stopPropagation();
      
      console.log(x, y);
      
  }
  
  pick_sv(x, y) {
    let sv = this._sample_box(x, y);
    
    this.hsva[1] = sv[0];
    this.hsva[2] = sv[1];
    
    this._recalcRGBA();
    this.update(true);
    
    if (this.onchange) {
      this.onchange(this.hsva, this.rgba);
    }
  }
  
  //return saturation and value
  _sample_box(x, y) {
    let field = this._field;
    
    if (field === undefined) {
      return [-1, -1];
    }
    
    let px = field.params.box.x, py = field.params.box.y, 
        pw = field.params.box.width, ph = field.params.box.height;
        
    let u = (x - px) / pw;
    let v = 1.0 - (y - py) / ph;
    
    u = Math.min(Math.max(u, 0.0), 1.0);
    v = Math.min(Math.max(v, 0.0), 1.0);
    
    let ret = sample(u, 1.0-v);
    u = ret[0], v = 1.0-ret[1];
    
    return [u, v];
  }
  
  on_mousemove(e, x, y, button) {
      if (this._mode == "h") {
        this.pick_h(x, y);
      } else if (this._mode == "sv") {
        this.pick_sv(x, y);
      }
      
      e.preventDefault();
      e.stopPropagation();
  }
  
  on_mouseup(e, x, y, button) {
      this._mode = undefined;
      
      e.preventDefault();
      e.stopPropagation();
      console.log(x, y);
  }
  
  updateCanvas(force_update=false, _in_update=false) {
    let canvas = this.canvas;
    let update = force_update;
    
    if (update) {
      let size = this.getDefault("fieldsize");
      let dpi = this.getDPI();
      
      canvas.style["width"] = size + "px";
      canvas.style["height"] = size + "px";
      
      canvas.width = canvas.height = Math.ceil(size*dpi);
      
      //console.log("SIZE!", canvas.style["width"], canvas.style["height"]);
      
      //this._redraw();
      if (!_in_update)
        this._redraw();
      
      //this.doOnce(this._redraw);
      return true;
    }
  }
  
  _redraw() {
    let canvas = this.canvas, g = this.g;
    let dpi = this.getDPI();
    
    let size = canvas.width;
    let field = this._field = getFieldImage(size, this.hsva);
    let w = size, h = size * field.height / field.width;
    
    //console.log("Redraw called!"); //, canvas, canvas.width, canvas.height, canvas.style);
    
    g.clearRect(0, 0, w, h); //canvas.width, canvas.height);
    //g.putImageData(field.image, 0, 0);
    g.drawImage(field.canvas, 0, 0, field.width, field.height);
    
    g.lineWidth = 2.0;

    function circle(x, y, r) {
      g.strokeStyle = "white";
      g.beginPath();
      g.arc(x, y, r, -Math.PI, Math.PI);
      g.stroke();
      
      g.strokeStyle = "grey";
      g.beginPath();
      g.arc(x, y, r-1, -Math.PI, Math.PI);
      g.stroke();
      
      g.fillStyle = "black";
      g.beginPath();
      g.arc(x, y, 2*dpi, -Math.PI, Math.PI);
      g.fill();
    }
    
    let hsva = this.hsva;
    let r = (field.params.r2 - field.params.r1)*0.7;
    let bandr = (field.params.r2 + field.params.r1)*0.5;
    
    //let th = Math.fract(hsva[0]+1/Math.PI**0.5);
    let th = Math.fract(1.0 - hsva[0] - 0.25);
    
    let x = Math.sin(th*Math.PI*2)*bandr + size/2;
    let y = Math.cos(th*Math.PI*2)*bandr + size/2;
    
    /*
    this.hbox.pos[0] = x;
    this.hbox.pos[1] = y;
    this.hbox.size[0] = r;
    this.hbox.size[1] = r;
    //*/
    
    circle(x, y, r);
    
    let u = this.hsva[1], v = 1.0 - this.hsva[2];
    let ret = inv_sample(u, v);
    u = ret[0], v = ret[1];
    
    x = field.params.box.x + u*field.params.box.width;
    y = field.params.box.y + v*field.params.box.height;
    
    circle(x, y, r);
  }
  
  updateDPI(force_update=false, _in_update=false) {
    let dpi = this.getDPI();
    
    let update = force_update;
    update = update || dpi != this._last_dpi;
    
    if (update) {
      this._last_dpi = dpi;
      
      this.updateCanvas(true);
      
      if (!_in_update)
        this._redraw();
      
      return true;
    }
  }
  
  update(force_update=false) {
    super.update();
    
    let redraw = false;
    
    redraw = redraw || this.updateCanvas(force_update, true);
    redraw = redraw || this.updateDPI(force_update, true);
    
    if (redraw) {
      this._redraw();
    }
  }
  
  static define() {return {
    tagname : "colorfield0-x",
    style : "colorfield"
  };}
}

UIBase.register(ColorField);

export class ColorPicker extends ui.ColumnFrame {
  constructor() {
    super();
    
    this.field = document.createElement("colorfield-x");
    this.field.setAttribute("class", "colorpicker");
    
    this.field.onchange = (hsva, rgba) => {
      if (this.onchange) {
        this.onchange(hsva, rgba);
      }

      this._setDataPath();
      this._setSliders();
    }
    
    let style = document.createElement("style");
    style.textContent = `
      .colorpicker {
        background-color : ${ui_base.getDefault("InnerPanelBG")};
      }
    `;
    
    
    this._style = style;
    
    this.shadow.appendChild(style);
    this.field.ctx = this.ctx;
    this.shadow.appendChild(this.field);
    //this._add(this.field);
    //this.style["background-color"] = ui_base.getDefault("InnerPanelBG");
  }
  
  static setDefault(node) {
    let tabs = node.tabs();
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

    let prop = this.getPathMeta(this.ctx, this.getAttribute("datapath"));
    let val =  this.getPathValue(this.ctx, this.getAttribute("datapath"));

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
        console.log("VAL", val);
      console.log("color changed!");
      this.setRGBA(_update_temp[0], _update_temp[1], _update_temp[2], _update_temp[3]);
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
      this.setPathValue(this.ctx, this.getAttribute("datapath"), this.field.rgba);
    }
  }

  setHSVA(h, s, v, a) {
    this.field.setHSVA(h, s, v, a);
    this._setDataPath();
  }
  
  setRGBA(r, g, b, a) {
    this.field.setRGBA(r, g, b, a)
    this._setDataPath();
  }
  
  static define() {return {
    tagname : "colorpicker0-x"
  };}
}

UIBase.register(ColorPicker);
