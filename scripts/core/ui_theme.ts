/*
THEME REFACTOR:

* Use CSS as much as possible
* Create a compatibility layer

*/
import * as util from "../path-controller/util/util.js";
import { Vector3, Vector4 } from "../path-controller/util/vectormath.js";
import cconst from "../config/const.js";
import { CSSFont } from "./cssfont.js";

export class ThemeScrollBars {
  border?: string;
  color?: string;
  color2?: string;
  contrast?: number;
  width?: number;

  constructor({
    border,
    color,
    color2,
    contrast,
    width,
  }: {
    border?: string;
    color?: string;
    color2?: string;
    contrast?: number;
    width?: number;
  }) {
    this.border = border;
    this.color = color;
    this.color2 = color2;
    this.contrast = contrast;
    this.width = width;
  }
}

export type ThemeItem = ThemeRecord | CSSFont | string | number | boolean | ThemeScrollBars;
export interface ThemeRecord {
  [k: string]: ThemeItem;
}

//export type ThemeRecord =  | CSSFont | string | number>;

export const compatMap = {
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

export const ColorSchemeTypes = {
  LIGHT: "light",
  DARK : "dark",
} as const;

export function parsepx(css: string): number {
  return parseFloat(css.trim().replace("px", ""));
}

export function color2css(c: number[] | Vector4 | Vector3, alpha_override?: number): string {
  const r = ~~(c[0] * 255);
  const g = ~~(c[1] * 255);
  const b = ~~(c[2] * 255);
  let a = c.length < 4 ? 1.0 : (c as number[])[3];

  a = alpha_override !== undefined ? alpha_override : a;

  if (c.length === 3 && alpha_override === undefined) {
    return `rgb(${r},${g},${b})`;
  } else {
    return `rgba(${r},${g},${b}, ${a})`;
  }
}

const css2color_rets = util.cachering.fromConstructor(Vector4, 64);
const basic_colors: Record<string, number[]> = {
  white : [1, 1, 1],
  grey  : [0.5, 0.5, 0.5],
  gray  : [0.5, 0.5, 0.5],
  black : [0, 0, 0],
  red   : [1, 0, 0],
  yellow: [1, 1, 0],
  green : [0, 1, 0],
  teal  : [0, 1, 1],
  cyan  : [0, 1, 1],
  blue  : [0, 0, 1],
  orange: [1, 0.5, 0.25],
  brown : [0.5, 0.4, 0.3],
  purple: [1, 0, 1],
  pink  : [1, 0.5, 0.5],
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
    const r = tostr(color[0]);
    const g = tostr(color[1]);
    const b = tostr(color[2]);

    return "#" + r + g + b;
  } else {
    const r = tostr(color[0]);
    const g = tostr(color[1]);
    const b = tostr(color[2]);
    const a = tostr(color[3]);

    return "#" + r + g + b + a;
  }
}

export function css2color(color: string | null | undefined): Vector4 {
  if (!color) {
    return new Vector4([0, 0, 0, 1]);
  }

  color = ("" + color).trim();

  const ret = css2color_rets.next();

  if (color[0] === "#") {
    color = color.slice(1, color.length);
    const parts: number[] = [];

    for (let i = 0; i < color.length >> 1; i++) {
      const part = "0x" + color.slice(i * 2, i * 2 + 2);
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
  const colorParts = color
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

export function web2color(str: string): Vector4 {
  if (typeof str === "string" && str.trim()[0] !== "#") {
    str = "#" + str.trim();
  }

  return css2color(str);
}

const validate_pat = /\#?[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

export function validateWebColor(str: string): boolean {
  if (typeof str !== "string") return false;

  return str.trim().search(validate_pat) === 0;
}

const num = "(([0-9]+.[0-9]+)|[0-9a-f]+)";

const validate_rgba = new RegExp(`rgba\\(${num},${num},${num},${num}\\)$`);
const validate_rgb = new RegExp(`rgb\\(${num},${num},${num}\\)$`);

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

// will load later
export const theme = {} as unknown as ThemeRecord;

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

    const c = css2color(color);
    return color2css(inverted(Array.from(c)) as number[]);
  }

  //if (!bg) {
  const bg = cconst.colorSchemeType === ColorSchemeTypes.LIGHT ? "rgb(200,200,200)" : "rgb(55, 55, 55)";
  //} else {
  //  bg = inverted(bg);
  //}

  document.body.style.backgroundColor = bg;

  for (const styleKey in theme) {
    const style = theme[styleKey as keyof typeof theme];

    if (typeof style !== "object" || style instanceof CSSFont) {
      continue;
    }

    const styleRec = style as Record<string, unknown>;
    for (const k in styleRec) {
      const v = styleRec[k];

      if (v instanceof CSSFont) {
        v.color = inverted(v.color) as string;
      } else if (typeof v === "string") {
        const vLower = v.trim().toLowerCase();

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

export function setColorSchemeType(mode: "light" | "dark"): void {
  if (mode !== cconst.colorSchemeType) {
    invertTheme();
    cconst.colorSchemeType = mode;
  }
}

export function exportTheme(themeIn: ThemeRecord = theme, addVarDecl = true): string {
  const theme1 = themeIn as any;

  const sortkeys = (obj: Record<string, unknown>): string[] => {
    const keys: string[] = [];
    for (const k in obj) {
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
    } else if (v instanceof ThemeScrollBars) {
      return `new ThemeScrollBars({
${indent}  border   : ${writekey(v.border)},
${indent}  color    : ${writekey(v.color)},
${indent}  color2   : ${writekey(v.color2)},
${indent}  contrast : ${writekey(v.contrast)},
${indent}  width     : ${writekey(v.width)}
${indent}})`;
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
          const v2 = (v as Record<string, unknown>)[k];

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

  for (const k of sortkeys(theme1)) {
    let k2 = k;

    if (k.search(/[- \t.]/) >= 0) {
      k2 = "'" + k + "'";
    }
    s += "  " + k2 + ": ";

    const v = theme1[k];
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
        const v2 = (v as Record<string, unknown>)[k2];

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

export function copyTheme(
  themeObj: ThemeRecord | CSSFont | Record<string, unknown>
): CSSFont | Record<string, unknown> {
  if (themeObj instanceof CSSFont) {
    return themeObj.copy();
  }

  const ret: Record<string, unknown> = {};
  for (const k in themeObj) {
    const v = (themeObj as Record<string, unknown>)[k];

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
