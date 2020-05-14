import * as util from "../util/util.js";
import {Vector3, Vector4} from '../util/vectormath.js';
import * as nstructjs from "../util/struct.js";

export function parsepx(css) {
  return parseFloat(css.trim().replace("px", ""))
}

export function color2css(c, alpha_override) {
  let r = ~~(c[0]*255);
  let g = ~~(c[1]*255);
  let b = ~~(c[2]*255);
  let a = c.length < 4 ? 1.0 : c[3];

  a = alpha_override !== undefined ? alpha_override : a;

  if (c.length == 3 && alpha_override === undefined) {
    return `rgb(${r},${g},${b})`;
  } else {
    return `rgba(${r},${g},${b}, ${a})`;
  }
}
window.color2css = color2css;

let css2color_rets = util.cachering.fromConstructor(Vector4, 64);
let cmap = {
  red : [1, 0, 0, 1],
  green : [0, 1, 0, 1],
  blue : [0, 0, 1, 1],
  yellow : [1, 1, 0, 1],
  white : [1, 1, 1, 1],
  black : [0, 0, 0, 1],
  grey : [0.7, 0.7, 0.7, 1],
  teal : [0, 1, 1, 1],
  orange : [1,0.55,0.25,1],
  brown  : [0.7, 0.4, 0.3, 1]
};

export function color2web(color) {
  function tostr(n) {
    n = ~~(n*255);
    let s = n.toString(16);

    if (s.length > 2) {
      s = s.slice(0, 2);
    }

    while (s.length < 2) {
      s = "0" + s;
    }

    return s;
  }

  if (color.length === 3 || color[3] === 1.0) {
    let r = tostr(color[0]);
    let g = tostr(color[1]);
    let b = tostr(color[2]);

    return "#" + r + g + b;
  } else {
    let r = tostr(color[0]);
    let g = tostr(color[1]);
    let b = tostr(color[2]);
    let a = tostr(color[3]);

    return "#" + r + g + b + a;
  }
}

window.color2web = color2web;

export function css2color(color) {
  if (!color) {
    return new Vector4([0,0,0,1]);
  }

  color = (""+color).trim();

  let ret = css2color_rets.next();

  if (color[0] === "#") {
    color = color.slice(1, color.length);
    let parts = [];

    for (let i=0; i<color.length>>1; i++) {
      let part = "0x" + color.slice(i*2, i*2+2);
      parts.push(parseInt(part));
    }

    ret.zero();
    let i;
    for (i=0; i<Math.min(parts.length, ret.length); i++) {
      ret[i] = parts[i] / 255.0;
    }

    if (i < 4) {
      ret[3] = 1.0;
    }

    return ret;
  }

  if (color in cmap) {
    return ret.load(cmap[color]);
  }

  color = color.replace("rgba", "").replace("rgb", "").replace(/[\(\)]/g, "").trim().split(",")

  for (let i=0; i<color.length; i++) {
    ret[i] = parseFloat(color[i]);
    if (i < 3) {
      ret[i] /= 255;
    }
  }

  return ret;
}

window.css2color = css2color

export function web2color(str) {
  if (typeof str === "string" && str.trim()[0] !== "#") {
    str = "#" + str.trim();
  }

  return css2color(str);
}
window.web2color = web2color;

let validate_pat = /\#?[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

export function validateWebColor(str) {
  if (typeof str !== "string" && !(str instanceof String))
    return false;

  return str.trim().search(validate_pat) === 0;
}

export let theme = {};

window.validateWebColor = validateWebColor;

export class CSSFont {
  constructor(args={}) {
    this._size = args.size ? args.size : 12;
    this.font = args.font;
    this.style = args.style !== undefined ? args.style : "normal";
    this.weight = args.weight !== undefined ? args.weight : "normal";
    this.variant = args.variant !== undefined ? args.variant : "normal";
    this.color = args.color;
  }

  set size(val) {
    this._size = val;
  }

  get size() {
    if (util.isMobile()) {
      let mul = theme.base.mobileTextSizeMultiplier / visualViewport.scale;
      if (mul) {
        return this._size * mul;;
      }
    }

    return this._size;
  }

  copyTo(b) {
    b._size = this._size;
    b.font = this.font;
    b.style = this.style;
    b.color = this.color;
    b.variant = this.variant;
    b.weight = this.weight;
  }

  copy() {
    let ret = new CSSFont();
    this.copyTo(ret);
    return ret;
  }

  genCSS(size=this.size) {
    return `${this.style} ${this.variant} ${this.weight} ${size}px ${this.font}`;
  }

  hash() {
    return this.genCSS + ":" + this.size + ":" + this.color;
  }
}
CSSFont.STRUCT = `
CSSFont {
  size     : float | obj._size;
  font     : string | obj.font || "";
  style    : string | obj.font || "";
  color    : string | ""+obj.color;
  variant  : string | obj.variant || "";
  weight   : string | ""+obj.weight;
}
`;
nstructjs.register(CSSFont);
