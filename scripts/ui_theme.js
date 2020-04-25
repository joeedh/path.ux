import * as util from "./util.js";
import {Vector3, Vector4} from './vectormath.js';

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

export function css2color(color) {
  let ret = css2color_rets.next();

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


export class CSSFont {
  constructor(args) {
    this.size = args.size;
    this.font = args.font;
    this.style = args.style !== undefined ? args.style : "normal";
    this.weight = args.weight !== undefined ? args.weight : "normal";
    this.variant = args.variant !== undefined ? args.variant : "normal";
    this.color = args.color;
  }

  copyTo(b) {
    b.size = this.size;
    b.font = this.font;
    b.style = this.style;
    b.color = this.color;
  }

  copy() {
    return new CSSFont(this);
  }

  genCSS(size=this.size) {
    return `${this.style} ${this.variant} ${this.weight} ${size}px ${this.font}`;
  }

  hash() {
    return this.genCSS + ":" + this.size + ":" + this.color;
  }
}
