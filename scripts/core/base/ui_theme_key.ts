import * as util from "../../path-controller/util/util";
import { rgb_to_hsv, hsv_to_rgb } from "../../util/colorutils";
import { CSSFont } from "../cssfont";
import { DefaultTheme } from "../theme";
import { theme, compatMap, color2css, css2color, ThemeRecord, ThemeScrollBars } from "../ui_theme";
import { BoxBorder } from "../ui_theme";

export const ErrorColors = {
  WARNING: "yellow",
  ERROR  : "red",
  OK     : "green",
};

export function setTheme(theme2: ThemeRecord): void {
  //merge theme
  for (const k in theme2) {
    const v = theme2[k];

    if (
      typeof v !== "object" ||
      v === null ||
      v instanceof CSSFont ||
      v instanceof BoxBorder ||
      v instanceof ThemeScrollBars
    ) {
      theme[k] = v;
      continue;
    }

    if (!(k in theme)) {
      theme[k] = {};
    }

    const vRec = v;
    for (let k2 in vRec) {
      if (k2 in compatMap) {
        const k3 = compatMap[k2 as keyof typeof compatMap]!;

        if (vRec[k3] === undefined) {
          vRec[k3] = vRec[k2];
        }

        delete vRec[k2];
        k2 = k3;
      }

      const substyle = theme[k] as ThemeRecord;
      substyle[k2] = vRec[k2];
    }
  }
}

setTheme(DefaultTheme);

export const _testSetScrollbars = function (
  color = "grey",
  contrast = 0.5,
  width = 15,
  border = "solid"
): string {
  return styleScrollBars(color, undefined, contrast, width, border, "*");
};

export function styleScrollBars(
  color: string = "grey",
  color2?: string | undefined,
  contrast = 0.5,
  width = 15,
  border = "1px groove black",
  selector = "*"
): string {
  if (!color2) {
    const c = css2color(color);
    const a = c.length > 3 ? c[3] : 1.0;

    c.load3(rgb_to_hsv(c[0], c[1], c[2]));
    let inv = c.slice(0, c.length);

    inv[2] = 1.0 - inv[2];
    inv[2] += (c[2] - inv[2]) * (1.0 - contrast);

    inv = hsv_to_rgb(inv[0], inv[1], inv[2]);

    inv.length = 4;
    inv[3] = a;

    color2 = color2css(inv);
  }

  const buf = `

${selector} {
  scrollbar-width : ${width <= 16 ? "thin" : "auto"};
  scrollbar-color : ${color2} ${color};
}

${selector}::-webkit-scrollbar {
  width : ${width}px;
  background-color : ${color};
}

${selector}::-webkit-scrollbar-track {
  background-color : ${color};
  border : ${border};
}

${selector}::-webkit-scrollbar-thumb {
  background-color : ${color2};
  border : ${border};
}
    `;

  return buf;
}

const _digest = new util.HashDigest();

export function calcThemeKey(digest = _digest.reset()): number {
  const anyTheme = theme as any;
  for (const k in anyTheme) {
    const obj = anyTheme[k];

    if (typeof obj !== "object") {
      continue;
    }

    for (const k2 in obj) {
      const v2 = obj[k2];

      if (typeof v2 === "number" || typeof v2 === "boolean" || typeof v2 === "string") {
        digest.add(v2);
      } else if (
        typeof v2 === "object" &&
        (v2 instanceof CSSFont || v2 instanceof BoxBorder || v2 instanceof ThemeScrollBars)
      ) {
        v2.calcHashUpdate(digest);
      }
    }
  }

  return digest.get();
}

export let _themeUpdateKey = calcThemeKey();

export function flagThemeUpdate(): void {
  _themeUpdateKey = calcThemeKey();
}

window._flagThemeUpdate = flagThemeUpdate;
