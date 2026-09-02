import { Vector2 } from "../../path-controller/util/vectormath";
import * as units from "../units";
import { PackFlags, type FormatNumberArgs, type TotalRect } from "./ui_base_types";
import { BoxBorder, UIBase } from "../ui_base";

type AnyUIBase = UIBase<any, any, any>;

export function noMarginsOrPadding<T extends AnyUIBase>(elem: T): T {
  let keys = ["margin", "padding", "margin-block-start", "margin-block-end"];
  keys = keys.concat(["padding-block-start", "padding-block-end"]);

  keys = keys.concat(["margin-left", "margin-top", "margin-bottom", "margin-right"]);
  keys = keys.concat(["padding-left", "padding-top", "padding-bottom", "padding-right"]);

  const style = elem.saneStyle;
  for (const k of keys) {
    style[k] = "0px";
  }

  return elem;
}

export function noMargins<T extends AnyUIBase>(elem: T): T {
  elem.saneStyle["margin"] = elem.saneStyle["margin-left"] = elem.saneStyle["margin-right"] = "0px";
  elem.saneStyle["margin-top"] = elem.saneStyle["margin-bottom"] = "0px";
  return elem;
}

export function noPadding<T extends AnyUIBase>(elem: T): T {
  elem.saneStyle["padding"] =
    elem.saneStyle["padding-left"] =
    elem.saneStyle["padding-right"] =
      "0px";
  elem.saneStyle["padding-top"] = elem.saneStyle["padding-bottom"] = "0px";
  return elem;
}

export function getTotalRect(elem: AnyUIBase): TotalRect | undefined {
  let found = false;

  const min = new Vector2([1e17, 1e17]);
  const max = new Vector2([-1e17, -1e17]);

  const doaabb = (n: HTMLElement) => {
    const rs = n.getClientRects();

    for (const r of rs) {
      min[0] = Math.min(min[0], r.x);
      min[1] = Math.min(min[1], r.y);
      max[0] = Math.max(max[0], r.x + r.width);
      max[1] = Math.max(max[1], r.y + r.height);

      found = true;
    }
  };

  doaabb(elem);

  elem._forEachChildWidget((n) => {
    doaabb(n);
  });

  if (!found) {
    return undefined;
  }

  return {
    width : max[0] - min[0],
    height: max[1] - min[1],
    x     : min[0],
    y     : min[1],
    left  : min[0],
    top   : min[1],
    right : max[0],
    bottom: max[1],
  };
}

export function parseNumber(
  elem: AnyUIBase,
  value: string | number,
  args: { baseUnit?: string; isInt?: boolean } = {}
): number {
  let str = ("" + value).trim().toLowerCase();

  const baseUnit = args.baseUnit || elem.baseUnit;
  const isInt = args.isInt || elem.isInt;

  let sign = 1.0;

  if (str.startsWith("-")) {
    str = str.slice(1, str.length).trim();
    sign = -1;
  }

  const hexre = /-?[0-9a-f]+h$/;
  let result: number;

  if (str.startsWith("0b")) {
    str = str.slice(2, str.length).trim();
    result = parseInt(str, 2);
  } else if (str.startsWith("0x")) {
    str = str.slice(2, str.length).trim();
    result = parseInt(str, 16);
  } else if (str.search(hexre) === 0) {
    str = str.slice(0, str.length - 1).trim();
    result = parseInt(str, 16);
  } else {
    result = units.parseValue(str, baseUnit);
  }

  if (isInt) {
    result = ~~result;
  }

  return result * sign;
}

export function formatNumber(elem: AnyUIBase, value: number, args: FormatNumberArgs = {}): string {
  const baseUnit = args.baseUnit || elem.baseUnit;
  const displayUnit = args.displayUnit || elem.displayUnit;
  const isInt = args.isInt || elem.isInt;
  const radix = args.radix || elem.radix || 10;
  const decimalPlaces = args.decimalPlaces || elem.decimalPlaces;

  if (isInt && radix !== 10) {
    const ret = Math.floor(value).toString(radix);

    if (radix === 2) return "0b" + ret;
    else if (radix === 16) return ret + "h";
  }

  return units.buildString(value, baseUnit, decimalPlaces, displayUnit);
}

/**
 * Resolves the margin, padding, border-radius and border theme keys for `elem`.
 * Writes them to `elem.saneStyle` when `apply` is set, and returns them as a css
 * declaration block otherwise.
 */
function buildBoxCSS(elem: AnyUIBase, subkey?: string, apply?: boolean): string {
  const keys = ["left", "right", "top", "bottom"];

  const themeFetch = (key: string, inherit = true) => {
    if (subkey) {
      // null prevents the use of backupkey which defaults to key,
      // this breaks borders
      return elem.getSubDefault<string | BoxBorder>(
        subkey,
        key,
        inherit ? undefined : null,
        undefined,
        inherit
      );
    }
    return elem.getDefault<string | BoxBorder>(key, undefined, undefined, inherit);
  };

  // note: we support using either outline or border css properties,
  // this is controlled by BoxBorder.isOutline

  let borderRec = themeFetch("border", false) as BoxBorder | undefined | string;
  const borderPrefix = "border";

  const boxDef = (key: string) => {
    let borderRec = themeFetch("border", false);

    // prefers any explicit sibling border-XXX order borderXXX
    // over boxborder's
    if (borderRec instanceof BoxBorder) {
      let borderKey = key.slice(borderPrefix.length + 1).toLowerCase();

      // use inherited value if non-inherited sibling and boxborder values both don't exist
      return (
        themeFetch(key, false) ?? borderRec?.[borderKey as keyof BoxBorder] ?? themeFetch(key, true)
      );
    }
    return themeFetch(key);
  };

  const def = (key: string) => {
    if (key.startsWith("border") || key.startsWith("outline")) {
      return boxDef(key);
    }
    return themeFetch(key);
  };

  let boxcode = "";

  for (let i = 0; i < 2; i++) {
    const key = i ? "padding" : "margin";

    if (apply) {
      elem.saneStyle[key] = "unset";
    }

    const val = def(key);
    if (val !== undefined) {
      //handle default first
      if (apply) {
        for (let j = 0; j < 4; j++) {
          elem.saneStyle[key + "-" + keys[j]] = val + "px";
        }
      } else {
        boxcode += `${key}: ${val}px;\n`;
      }
    }

    for (let j = 0; j < 4; j++) {
      //now do box sides
      const key2 = `${key}-${keys[j]}`;
      const val2 = def(key2);

      if (val2 === undefined) {
        continue;
      }

      if (apply) {
        elem.saneStyle[key2] = val2 + "px";
      } else {
        boxcode += `${key2}: ${val2}px;\n`;
      }
    }
  }

  const border = `${def("border-width")}px ${def("border-style")} ${def("border-color")}`;

  if (apply) {
    elem.saneStyle[borderPrefix + "-radius"] = def("border-radius") + "px";
    elem.saneStyle[borderPrefix] = border;
    return "";
  }

  boxcode += `${borderPrefix}-radius: ${def("border-radius")}px;\n`;
  boxcode += `${borderPrefix}: ${border};\n`;

  return boxcode;
}

export function setBoxCSS(elem: AnyUIBase, subkey?: string): void {
  buildBoxCSS(elem, subkey, true);
}

export function genBoxCSS(elem: AnyUIBase, subkey?: string): string {
  return buildBoxCSS(elem, subkey, false);
}

export function setCSS(elem: AnyUIBase, setBG = true): void {
  if (setBG) {
    const bg = elem.getDefault("background-color");
    if (bg) {
      elem.saneStyle["background-color"] = "" + bg;
    }
  }

  const zoom = elem.getZoom();
  if (zoom === 1.0) {
    return;
  }

  let transform = "" + elem.saneStyle["transform"];

  //preserve a user-set transform by cutting out just the scale

  //normalize whitespace
  transform = transform.replace(/[ \t\n\r]+/g, " ");
  transform = transform.replace(/, /g, ",");

  const transform2 = transform.replace(/scale\([^)]+\)/, "").trim();
  elem.saneStyle["transform"] = transform2 + ` scale(${zoom},${zoom})`;
}

export function flushSetCSS(elem: AnyUIBase): void {
  //check init
  elem._init();

  elem.setCSS();

  elem._forEachChildWidget((c) => {
    if (!(c.packflag & PackFlags.NO_UPDATE)) {
      c.flushSetCSS();
    }
  });
}
