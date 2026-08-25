import * as util from "../../path-controller/util/util";
import { theme, ThemeRecord } from "../ui_theme";
import { ClassIdSymbol } from "../ui_consts";
import { tagManager } from "../tagReRegister";
import type { IUIBaseConstructor } from "./ui_base_types";
import type { UIBase } from "../ui_base";

//global list of elements to, hopefully, prevent minification tree shaking
//of live elements
export const ElementClasses: (typeof UIBase)[] = [];

export const dpistack: number[] = [];
export const UIFlags: Record<string, number> = {};

let registered_has_happened = false;
let tagPrefix = "";
let class_idgen = 1;

const internalElementNames: Record<string, string> = {};
const externalElementNames: Record<string, string> = {};

export const EventCBSymbol: unique symbol = Symbol("wrapped event callback");

export function calcElemCBKey(
  elem: UIBase,
  type: string,
  options: AddEventListenerOptions | boolean | undefined
): string {
  return elem._id + ":" + type + ":" + JSON.stringify(options || {});
}

/**
 * Sets tag prefix for pathux html elements.
 * Must be called prior to loading other modules.
 * Since this is tricky, you can alternatively
 * add a script tag with the prefix with the id "pathux-tag-prefix",
 * e.g.<pre> <script type="text/plain" id="pathux-tag-prefix">prefix</script> </pre>
 * */
export function setTagPrefix(prefix2: string): void {
  if (registered_has_happened) {
    throw new Error("have to call ui_base.setTagPrefix before loading any other path.ux modules");
  }

  tagPrefix = "" + prefix2;
}

export function getTagPrefix(): string {
  return tagPrefix;
}

if (typeof document !== "undefined") {
  const prefixElem = document.getElementById("pathux-tag-prefix");
  if (prefixElem) {
    console.log("Found pathux-tag-prefix element");
    const prefixText = (prefixElem as HTMLElement).innerText.trim();
    setTagPrefix(prefixText);
  }
}

export function prefix(name: string): string {
  return tagPrefix + name;
}

/** Registers a built-in element under `prefixedTag`, which the caller resolved through `prefix`. */
export function registerInternal(cls: IUIBaseConstructor, prefixedTag: string): void {
  const clsAny = cls as any;
  clsAny[ClassIdSymbol] = class_idgen++;

  registered_has_happened = true;

  internalElementNames[cls.define().tagname] = prefixedTag;
  // note: we override HTMLElement.prototype.animate in a type incompatible way
  customElements.define(prefixedTag, cls as unknown as CustomElementConstructor);
}

export function getInternalName(name: string): string | undefined {
  return internalElementNames[name];
}

export function createElement<T extends UIBase | HTMLElement = HTMLElement>(
  name: string,
  internal = false
): T {
  const mappedTag = tagManager.get(name);
  if (mappedTag !== undefined) {
    return document.createElement(mappedTag) as unknown as T;
  } else if (!internal && name in externalElementNames) {
    return document.createElement(name) as unknown as T;
  } else if (name in internalElementNames) {
    return document.createElement(internalElementNames[name]) as unknown as T;
  } else {
    return document.createElement(name) as unknown as T;
  }
}

export function isRegistered(cls: IUIBaseConstructor): boolean {
  return customElements.get(cls.define().tagname) === (cls as unknown as CustomElementConstructor);
}

export function registerElement(cls: IUIBaseConstructor): void {
  registered_has_happened = true;
  const clsAny = cls as any;
  clsAny[ClassIdSymbol] = class_idgen++;

  const def = cls.define();

  if (typeof customElements?.get === "undefined") {
    // running in nodejs?
    return;
  }
  if (customElements.get(def.tagname) === (cls as unknown as CustomElementConstructor)) {
    // already registered
    return;
  }

  const tagName = tagManager.replaceTag(def.tagname);
  ElementClasses.push(cls as any);

  externalElementNames[tagName] = tagName;
  customElements.define(tagName, cls as unknown as CustomElementConstructor);
}

export function getRegisteredTagNames(): string[] {
  const names = new Set<string>(Object.keys(internalElementNames));
  for (const cls of ElementClasses) {
    try {
      names.add(cls.define().tagname);
    } catch {
      // some define()s touch ctx/DOM; skip what we can't read
    }
  }
  return [...names].sort();
}

let _last_report = util.time_ms();

export function report(...args: unknown[]): void {
  if (util.time_ms() - _last_report > 350) {
    console.warn(...args);
    _last_report = util.time_ms();
  }
}

//this function is deprecated
export function getDefault(key: string, elem?: UIBase): unknown {
  console.warn("Deprecated call to ui_base.js:getDefault");

  const base = theme.base as ThemeRecord;
  if (key in base) {
    return base[key];
  } else {
    throw new Error("Unknown default " + key);
  }
}

//XXX implement me!
export function IsMobile(): boolean {
  console.warn("ui_base.IsMobile is deprecated; use util.isMobile instead");
  return util.isMobile();
}

let keys = ["margin", "padding", "margin-block-start", "margin-block-end"];
keys = keys.concat(["padding-block-start", "padding-block-end"]);

keys = keys.concat(["margin-left", "margin-top", "margin-bottom", "margin-right"]);
keys = keys.concat(["padding-left", "padding-top", "padding-bottom", "padding-right"]);
export const marginPaddingCSSKeys = keys;
