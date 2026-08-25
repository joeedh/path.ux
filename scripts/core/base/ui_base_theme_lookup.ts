import * as util from "../../path-controller/util/util";
import { theme, ThemeRecord } from "../ui_theme";
import { UIBase } from "../ui_base";
import type { DefaultTypes } from "./ui_base_types";

type AnyUIBase = UIBase<any, any, any>;

const _mobile_theme_patterns = [
  /.*width.*/,
  /.*height.*/,
  /.*size.*/,
  /.*margin.*/,
  /.*pad/,
  /.*radius.*/,
];

export function _doMobileDefault(
  elem: AnyUIBase,
  key: string,
  val: unknown,
  obj?: Record<string, unknown>
): unknown {
  if (!util.isMobile()) {
    return val;
  }

  const mobilekey = key + "_mobile";
  if (obj && mobilekey in obj) {
    return obj[mobilekey];
  }

  key = key.toLowerCase();
  let ok = false;

  for (const re of _mobile_theme_patterns) {
    if (key.search(re) >= 0) {
      ok = true;
      break;
    }
  }

  if (ok && ((theme.base as ThemeRecord).mobileSizeMultiplier as number)) {
    val = (val as number) * ((theme.base as ThemeRecord).mobileSizeMultiplier as number);
  }

  return val;
}

export function hasDefault(elem: AnyUIBase, key: string): boolean {
  let p: AnyUIBase | undefined = elem;

  while (p) {
    if (key in p.default_overrides) {
      return true;
    }

    p = p.parentWidget;
  }

  return elem.hasClassDefault(key);
}

export function hasSubDefault(elem: AnyUIBase, key: string, subkey: string): boolean {
  return (
    elem._hasSubDefault(key, subkey, theme) ||
    !!(elem._themeOverride && elem._hasSubDefault(key, subkey, elem._themeOverride))
  );
}

export function _hasSubDefault(
  elem: AnyUIBase,
  key: string,
  subkey: string,
  _themeDef?: Record<string, unknown>
): boolean {
  const obj = elem.getDefault(key);

  if (!obj || typeof obj !== "object") {
    return false;
  }

  return subkey in obj;
}

export function hasClassSubDefault(
  elem: AnyUIBase,
  key: string,
  subkey: string,
  inherit = true
): boolean {
  return (
    elem._hasClassSubDefault(key, subkey, inherit, undefined, theme) ||
    !!(
      elem._themeOverride &&
      elem._hasClassSubDefault(key, subkey, inherit, undefined, elem._themeOverride)
    )
  );
}

export function _hasClassSubDefault(
  elem: AnyUIBase,
  key: string,
  subkey: string,
  inherit = true,
  style: string = elem.getStyleClass(),
  themeDef?: Record<string, unknown>
): boolean {
  if (!themeDef) return false;
  const th = themeDef[style];

  if (inherit) {
    if (elem._hasClassSubDefault(key, subkey, false, style, themeDef)) {
      return true;
    }

    let ret = false;
    const def = elem.constructor.define();

    if (def.parentStyle) {
      ret = ret || elem._hasClassSubDefault(key, subkey, false, def.parentStyle, themeDef);
    }
    ret = ret || elem._hasClassSubDefault(key, subkey, false, "base", themeDef);
    return ret;
  }

  if (!th) {
    return false;
  }

  const obj = th[key as keyof typeof th];
  if (!obj || typeof obj !== "object") {
    return false;
  }

  return subkey in obj;
}

export function getSubDefault<T extends DefaultTypes = string>(
  elem: AnyUIBase,
  key: string,
  subkey: string,
  backupkey: string = subkey,
  defaultval?: T,
  inherit = true
): T {
  // TODO: harmonize this to use getStyleRecord

  if (!key) {
    return elem.getDefault<T>(subkey, undefined, defaultval, inherit);
  }

  const style = elem.getDefault(key, undefined, undefined, inherit);

  if (!style || typeof style !== "object" || !(subkey in style)) {
    if (defaultval !== undefined) {
      return defaultval;
    } else if (backupkey) {
      return elem.getDefault(backupkey, undefined, undefined, inherit);
    }
  }
  return style[subkey as keyof typeof style] as T;
}

export function getDefault(
  elem: AnyUIBase,
  key: string,
  checkForMobile?: boolean,
  defaultval?: unknown,
  inherit?: boolean
): unknown {
  const ret = elem.getDefault_intern(key, checkForMobile, defaultval, inherit);

  //convert pixel units straight to numbers
  if (typeof ret === "string" && ret.trim().toLowerCase().endsWith("px")) {
    let s = ret.trim().toLowerCase();
    s = s.slice(0, s.length - 2).trim();

    const f = parseFloat(s);
    if (!isNaN(f) && isFinite(f)) {
      return f;
    }
  }

  return ret;
}

export function getDefault_intern(
  elem: AnyUIBase,
  key: string,
  checkForMobile = true,
  defaultval?: unknown,
  inherit = true
): unknown {
  if (elem.my_default_overrides[key] !== undefined) {
    const v = elem.my_default_overrides[key];
    return checkForMobile ? elem._doMobileDefault(key, v, elem.my_default_overrides) : v;
  }

  let p: AnyUIBase | undefined = elem;
  while (p) {
    if (p.default_overrides[key] !== undefined) {
      const v = p.default_overrides[key];
      return checkForMobile ? elem._doMobileDefault(key, v, p.default_overrides) : v;
    }

    p = p.parentWidget;
  }

  return elem.getClassDefault(key, checkForMobile, defaultval, inherit);
}

/** First `define().style` found walking up from `cls`, or undefined at the UIBase root. */
function walkStyleChain(cls: any): string | undefined {
  let p = cls;
  const lastp: any | undefined = undefined;

  while (p && p !== lastp && p !== UIBase && p !== Object) {
    const def = (p as typeof UIBase).define();

    if (def?.style) {
      return def.style;
    }

    if (!p.prototype || !Object.getPrototypeOf(p.prototype)) break;
    p = Object.getPrototypeOf(p.prototype).constructor;
  }

  return undefined;
}

export function getStyleClass(elem: AnyUIBase, ignoreOverride = false): string {
  if (!ignoreOverride && elem._override_class !== undefined) {
    return elem._override_class;
  }

  return walkStyleChain(elem.constructor) ?? "base";
}

/**
 * returns theme record data (including class overrides) associated with
 * styleClass.  If key is not undefined it will be used to only
 * include overrides that contains that key
 */
function getStyleRecord(
  elem: AnyUIBase,
  styleClass: string,
  key?: string,
  inherit = true
): ThemeRecord | undefined {
  let result: ThemeRecord | undefined;
  const chunks = styleClass.split(".");
  if (chunks.length === 0) {
    return undefined;
  }

  const chunk1 = chunks[0]!;

  function testKey(obj: any) {
    if (key === undefined || obj === undefined) {
      return true;
    }
    for (let i = 1; i < chunks.length; i++) {
      obj = obj[chunks[i]];
      if (typeof obj !== "object") {
        return false;
      }
    }
    return key in obj;
  }

  let p: AnyUIBase | undefined = elem;
  while (p) {
    const def1 = p.class_default_overrides[chunk1];
    if (def1 && testKey(def1)) {
      result = def1 as any;
    }

    // also check if we have a full path as a key in
    // class_default_overrides instead of a nested object
    const def2 = p.class_default_overrides[styleClass];
    if (def2 && (key === undefined || key in def2)) {
      result = def2 as any;
    }

    //do we have both?
    if (def1 !== def2 && def1 !== undefined && def2 !== undefined) {
      console.warn(
        'You defined a class override both as a "key1.key2" value and a nested object, e.g. "key1: {key2: {}}"',
        'The former (e.g. the one with class key "key1.key2") will be used'
      );
      result = def2 as any;
      break;
    } else if (def1 !== undefined) {
      result = def1 as any;
      break;
    } else if (def2 !== undefined) {
      return def2 as any;
    }

    if (!inherit) {
      break;
    }
    p = p.parentWidget;
  }

  // check theme override
  if (result === undefined) {
    const th = elem._themeOverride;
    if (th && typeof th[chunk1] === "object" && testKey(th[chunk1])) {
      result = th[chunk1] as any;
    }
    if (typeof theme[chunk1] === "object" && testKey(theme[chunk1])) {
      result = theme[chunk1] as any;
    }
  }

  if (result !== undefined) {
    // now descend into final record
    for (let i = 1; i < chunks.length; i++) {
      if (typeof result![chunks[i]] !== "object") {
        console.warn("Invalid style class key", styleClass, "starting from base", result);
        return undefined;
      }
      result = result![chunks[i]]! as any;
    }
  }

  return result;
}

export function hasClassDefault(elem: AnyUIBase, key: string): boolean {
  const style = elem.getStyleClass();
  const record = getStyleRecord(elem, style, key);
  return record !== undefined && key in record;
}

export function getClassDefault(
  elem: AnyUIBase,
  key: string,
  checkForMobile = true,
  defaultval?: unknown,
  inherit = true
): unknown {
  const style = elem.getStyleClass();

  if (style === "none") {
    return undefined;
  }

  let record = getStyleRecord(elem, style, key, inherit) as any;
  let value = (record ? record[key] : undefined) as any;

  if (value === undefined && defaultval !== undefined) {
    return defaultval;
  } else if (value === undefined && inherit) {
    // check the original style class
    if (elem._override_class !== undefined) {
      const record2 = getStyleRecord(elem, elem.getStyleClass(true), key, inherit);
      value = record2 ? record2[key] : undefined;
      if (value !== undefined) {
        record = record2;
      }
    }

    // check for define().parentStyle
    const def = elem.constructor.define();
    if (value === undefined && def.parentStyle) {
      const record2 = getStyleRecord(elem, def.parentStyle, key, inherit);
      value = record2 ? record2[key] : undefined;
      if (value !== undefined) {
        record = record2;
      }
    }
  }
  if (value === undefined) {
    for (let i = 0; i < 2; i++) {
      const th = i ? elem._themeOverride : theme;
      if (typeof th?.base === "object" && key in th.base) {
        value = (th.base as any)[key];
        record = th.base;
        break;
      }
    }
  }

  return checkForMobile ? elem._doMobileDefault(key, value, record) : value;
}

export function overrideTheme(
  elem: AnyUIBase,
  themeOverride: Record<string, Record<string, unknown>>
): void {
  elem._themeOverride = themeOverride;

  elem._forEachChildWidget((child: AnyUIBase) => {
    child.overrideTheme(themeOverride);
  });

  if (elem.ctx) {
    elem.flushSetCSS();
    elem.flushUpdate();
  }
}
