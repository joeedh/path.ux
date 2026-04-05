/*
THEME REFACTOR:

* Use CSS as much as possible
* Create a compatibility layer

*/
import * as util from "../path-controller/util/util.js";
import { Vector3, Vector4 } from "../path-controller/util/vectormath.js";
import nstructjs from "../path-controller/util/struct.js";
import cconst from "../config/const.js";
import { DefaultTheme } from "./theme.js";

export interface CSSFontArgs {
  size?: number;
  font?: string;
  style?: string;
  weight?: string;
  variant?: string;
  color?: string;
}

export type ThemeRecord = typeof DefaultTheme //& Record<string, Record<string, unknown> | CSSFont | string | number>;

export let compatMap = {
  BoxMargin       : "padding",
  BoxBG           : "background",
  BoxRadius       : "border-radius",
  background      : "background-color",
  defaultWidth    : "width",
  defaultHeight   : "height",
  DefaultWidth    : "width",
  DefaultHeight   : "height",
  BoxBorder       : "border-color",
  BoxLineWidth    : "border-width",
  BoxSubBG        : "background-color",
  BoxSub2BG       : "background-color",
  DefaultPanelBG  : "background-color",
  InnerPanelBG    : "background-color",
  Background      : "background-color",
  numslider_width : "width",
  numslider_height: "height",
};

export let ColorSchemeTypes = {
  LIGHT: "light",
  DARK : "dark",
};

export function parsepx(css: string): number {
  return parseFloat(css.trim().replace("px", ""));
}

export function color2css(c: ArrayLike<number>, alpha_override?: number): string {
  let r = ~~(c[0] * 255);
  let g = ~~(c[1] * 255);
  let b = ~~(c[2] * 255);
  let a = c.length < 4 ? 1.0 : c[3];

  a = alpha_override !== undefined ? alpha_override : a;

  if (c.length === 3 && alpha_override === undefined) {
    return `rgb(${r},${g},${b})`;
  } else {
    return `rgba(${r},${g},${b}, ${a})`;
  }
}

window.color2css = color2css;

let css2color_rets = util.cachering.fromConstructor(Vector4, 64);
let basic_colors: Record<string, number[]> = {
  "white" : [1, 1, 1],
  "grey"  : [0.5, 0.5, 0.5],
  "gray"  : [0.5, 0.5, 0.5],
  "black" : [0, 0, 0],
  "red"   : [1, 0, 0],
  "yellow": [1, 1, 0],
  "green" : [0, 1, 0],
  "teal"  : [0, 1, 1],
  "cyan"  : [0, 1, 1],
  "blue"  : [0, 0, 1],
  "orange": [1, 0.5, 0.25],
  "brown" : [0.5, 0.4, 0.3],
  "purple": [1, 0, 1],
  "pink"  : [1, 0.5, 0.5],
};

export function color2web(color: ArrayLike<number>): string {
  function tostr(n: number): string {
    n = ~~(n * 255);
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

export function css2color(color: string | null | undefined): Vector4 {
  if (!color) {
    return new Vector4([0, 0, 0, 1]);
  }

  color = ("" + color).trim();

  let ret = css2color_rets.next();

  if (color[0] === "#") {
    color = color.slice(1, color.length);
    let parts: number[] = [];

    for (let i = 0; i < color.length >> 1; i++) {
      let part = "0x" + color.slice(i * 2, i * 2 + 2);
      parts.push(parseInt(part));
    }

    ret.zero();
    let i: number;
    for (i = 0; i < Math.min(parts.length, ret.length); i++) {
      (ret as unknown as number[])[i] = parts[i] / 255.0;
    }

    if (i < 4) {
      (ret as unknown as number[])[3] = 1.0;
    }

    return ret;
  }

  if (color in basic_colors) {
    ret.load(basic_colors[color]);
    (ret as unknown as number[])[3] = 1.0;
    return ret;
  }

  const hasAlpha = color.startsWith("rgba(");
  let colorParts = color
    .replace("rgba", "")
    .replace("rgb", "")
    .replace(/[\(\)]/g, "")
    .trim()
    .split(",");

  for (let i = 0; i < colorParts.length; i++) {
    (ret as unknown as number[])[i] = parseFloat(colorParts[i]);
    if (i < 3) {
      (ret as unknown as number[])[i] /= 255;
    }
  }

  if (ret.length === 3) {
    (ret as unknown as number[]).push(1.0);
  }

  if (!hasAlpha) {
    (ret as unknown as number[])[3] = 1.0;
  }

  return ret;
}

window.css2color = css2color;

export function web2color(str: string): Vector4 {
  if (typeof str === "string" && str.trim()[0] !== "#") {
    str = "#" + str.trim();
  }

  return css2color(str);
}

window.web2color = web2color;

let validate_pat = /\#?[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

export function validateWebColor(str: string | String): boolean {
  if (typeof str !== "string" && !(str instanceof String)) return false;

  return str.trim().search(validate_pat) === 0;
}

let num = "(([0-9]+.[0-9]+)|[0-9a-f]+)";

let validate_rgba = new RegExp(`rgba\\(${num},${num},${num},${num}\\)$`);
let validate_rgb = new RegExp(`rgb\\(${num},${num},${num}\\)$`);

export function validateCSSColor(color: string): boolean {
  if (color.toLowerCase() in basic_colors) {
    return true;
  }

  let rgba = color.toLowerCase().replace(/[ \t]/g, "");
  rgba = rgba.trim();

  if (validate_rgba.test(rgba) || validate_rgb.exec(rgba)) {
    return true;
  }

  return validateWebColor(color);
}

window.validateCSSColor = validateCSSColor;

// will load later
export let theme = {} as unknown as ThemeRecord;

export function invertTheme(): void {
  cconst.colorSchemeType =
    cconst.colorSchemeType === ColorSchemeTypes.LIGHT ? ColorSchemeTypes.DARK : ColorSchemeTypes.LIGHT;

  function inverted(color: string | number[]): string | number[] {
    if (Array.isArray(color)) {
      for (let i = 0; i < 3; i++) {
        color[i] = 1.0 - color[i];
      }

      return color;
    }

    let c = css2color(color);
    return color2css(inverted(Array.from(c)) as number[]);
  }

  let bg: string;
  //if (!bg) {
  bg = cconst.colorSchemeType === ColorSchemeTypes.LIGHT ? "rgb(200,200,200)" : "rgb(55, 55, 55)";
  //} else {
  //  bg = inverted(bg);
  //}

  document.body.style.backgroundColor = bg;

  for (let styleKey in theme) {
    let style = theme[styleKey as keyof typeof theme];

    if (typeof style !== "object" || style instanceof CSSFont) {
      continue;
    }

    let styleRec = style as Record<string, unknown>;
    for (let k in styleRec) {
      let v = styleRec[k];

      if (v instanceof CSSFont) {
        v.color = inverted(v.color) as string;
      } else if (typeof v === "string") {
        let vLower = v.trim().toLowerCase();

        let iscolor = vLower.search("rgb") >= 0;
        iscolor = iscolor || vLower in basic_colors;
        iscolor = iscolor || validateWebColor(vLower);

        if (iscolor) {
          styleRec[k] = inverted(vLower);
        }
      }
    }
  }
}

window.invertTheme = invertTheme;

export function setColorSchemeType(mode: string): void {
  if (mode !== cconst.colorSchemeType) {
    invertTheme();
    cconst.colorSchemeType = mode;
  }
}

window.validateWebColor = validateWebColor;

let _digest = new util.HashDigest();

export class CSSFont {
  _size: number;
  font: string;
  style: string;
  weight: string;
  variant: string;
  color: string;

  static STRUCT: string;

  constructor(args: CSSFontArgs = {}) {
    this._size = args.size ? args.size : 12;
    this.font = args.font ?? "";
    this.style = args.style !== undefined ? args.style : "normal";
    this.weight = args.weight !== undefined ? args.weight : "normal";
    this.variant = args.variant !== undefined ? args.variant : "normal";
    this.color = args.color ?? "";
  }

  calcHashUpdate(digest = _digest.reset()): number {
    digest.add(this._size || 0);
    digest.add(this.font);
    digest.add(this.style);
    digest.add(this.weight);
    digest.add(this.variant);
    digest.add(this.color);

    return digest.get();
  }

  set size(val: number) {
    this._size = val;
  }

  get size(): number {
    if (util.isMobile()) {
      let mul = theme.base.mobileTextSizeMultiplier / visualViewport!.scale;
      if (mul) {
        return this._size * mul;
      }
    }

    return this._size;
  }

  copyTo(b: CSSFont): void {
    b._size = this._size;
    b.font = this.font;
    b.style = this.style;
    b.color = this.color;
    b.variant = this.variant;
    b.weight = this.weight;
  }

  copy(): CSSFont {
    let ret = new CSSFont();
    this.copyTo(ret);
    return ret;
  }

  genCSS(size = this.size): string {
    return `${this.style} ${this.variant} ${this.weight} ${size}px ${this.font}`;
  }

  //deprecated, use genKey()
  hash(): string {
    return this.genKey();
  }

  genKey(): string {
    let color: string = this.color;

    if (typeof this.color === "object" || typeof this.color === "function") {
      color = JSON.stringify(color);
    }

    return this.genCSS() + ":" + this.size + ":" + color;
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

export function exportTheme(themeIn: ThemeRecord = theme, addVarDecl = true): string {
  const theme1 = themeIn as any
  
  let sortkeys = (obj: Record<string, unknown>): string[] => {
    let keys: string[] = [];
    for (let k in obj) {
      keys.push(k);
    }
    keys.sort();

    return keys;
  };

  let s = addVarDecl ? "var theme = {\n" : "{\n";

  function writekey(v: unknown, indent = ""): string {
    if (typeof v === "string") {
      let vs: string;
      if (v.search("\n") >= 0) {
        vs = "`" + v + "`";
      } else {
        vs = "'" + v + "'";
      }

      return vs;
    } else if (typeof v === "object") {
      if (v instanceof CSSFont) {
        return `new CSSFont({
${indent}  font    : ${writekey(v.font)},
${indent}  weight  : ${writekey(v.weight)},
${indent}  variant : ${writekey(v.variant)},
${indent}  style   : ${writekey(v.style)},
${indent}  size    : ${writekey(v._size)},
${indent}  color   : ${writekey(v.color)}
${indent}})`;
      } else {
        let s = "{\n";

        for (let k of sortkeys(v as Record<string, unknown>)) {
          let v2 = (v as Record<string, unknown>)[k];

          if (k.search(" ") >= 0 || k.search("-") >= 0) {
            k = "'" + k + "'";
          }

          s += indent + "  " + k + " : " + writekey(v2, indent + "  ") + ",\n";
        }

        s += indent + "}";
        return s;
      }
    } else {
      return "" + v;
    }
  }

  for (let k of sortkeys(theme1)) {
    let k2 = k;

    if (k.search(/[- \t.]/) >= 0) {
      k2 = "'" + k + "'";
    }
    s += "  " + k2 + ": ";

    let v = theme1[k];
    if (typeof v !== "object" || v instanceof CSSFont) {
      s += writekey(v, "  ") + ",\n";
    } else {
      s += " {\n";
      let s2 = "";

      let maxwid = 0;

      for (let k2 of sortkeys(v as Record<string, unknown>)) {
        if (k2.search("-") >= 0 || k2.search(" ") >= 0) {
          k2 = "'" + k2 + "'";
        }

        maxwid = Math.max(maxwid, k2.length);
      }

      for (let k2 of sortkeys(v as Record<string, unknown>)) {
        let v2 = (v as Record<string, unknown>)[k2];

        if (k2.search("-") >= 0 || k2.search(" ") >= 0) {
          k2 = "'" + k2 + "'";
        }

        let pad = "";

        for (let i = 0; i < maxwid - k2.length; i++) {
          pad += " ";
        }

        s2 += "    " + k2 + pad + ": " + writekey(v2, "    ") + ",\n";
      }

      s += s2;
      s += "  },\n\n";
    }
  }
  s += "};\n";

  return s;
}

window._exportTheme = exportTheme;

export function copyTheme(
  themeObj: ThemeRecord | CSSFont | Record<string, unknown>
): CSSFont | Record<string, unknown> {
  if (themeObj instanceof CSSFont) {
    return themeObj.copy();
  }

  let ret: Record<string, unknown> = {};
  for (let k in themeObj) {
    let v = (themeObj as Record<string, unknown>)[k];

    if (typeof v === "function") {
      continue;
    }

    if (typeof v === "object") {
      ret[k] = copyTheme(v as ThemeRecord | CSSFont | Record<string, unknown>);
    } else {
      ret[k] = v;
    }
  }

  return ret;
}
