/* TS-NOCHECK RATIONALE: 215 remaining strict-mode errors after structural conversion.
 * Major categories to fix incrementally:
 *   1. CSSStyleDeclaration string indexing (31x) — use (style as StyleRecord) pattern
 *   2. graphExec() dynamic socket values — needs typed sock.value/oldValue
 *   3. catch(error) unknown (3x) — cast to Error
 *   4. Touch event handlers (4x) — addEventListener type mismatch
 *   5. SocketTypes.INPUT/OUTPUT type mismatch — imported number vs SocketType literal
 *   6. EventNode.register() GraphNodeDef shape — missing 'flag' field
 *   7. Dynamic theme object access patterns
 *   8. customElements.define() cls parameter
 *   9. initAspectClass(this) — AspectOwner type
 */
import { contextWrangler } from "../screen/area_wrangler.js";

/* Helper for CSSStyleDeclaration string indexing, common throughout this file */
type StyleRecord = CSSStyleDeclaration & Record<string, string>;

let _ui_base: typeof UIBase | undefined = undefined;

//avoid circular module references
let TextBox: (new (...args: unknown[]) => HTMLElement) | undefined = undefined;

export function _setTextboxClass(cls: new (...args: unknown[]) => HTMLElement): void {
  TextBox = cls;
}

//import * as ui_save from './ui_save.js';

/*
if (window.document && document.body) {
  console.log("ensuring body.style.margin/padding are zero");
  document.body.style["margin"] = "0px";
  document.body.style["padding"] = "0px";
}
 */

import { Animator } from "./anim.js";
import "./units.js";
import * as util from "../path-controller/util/util.js";
import * as vectormath from "../path-controller/util/vectormath.js";
import * as math from "../path-controller/util/math.js";
import * as toolprop from "../path-controller/toolsys/toolprop.js";
import {
  pushModalLight,
  popModalLight,
  copyEvent,
  pathDebugEvent,
  haveModal,
  keymap,
  reverse_keymap,
  pushPointerModal,
  ModalState,
} from "../path-controller/util/simple_events.js";
import { getDataPathToolOp } from "../path-controller/controller/controller.js";
import * as units from "./units.js";
import { rgb_to_hsv, hsv_to_rgb } from "../util/colorutils.js";

export * from "./ui_theme.js";

import { CSSFont, theme, parsepx, compatMap, color2css, css2color } from "./ui_theme.js";

import { DefaultTheme } from "./theme.js";

//global list of elements to, hopefully, prevent minification tree shaking
//of live elements
export let ElementClasses: (typeof UIBase)[] = [];

export { theme } from "./ui_theme.js";

import cconst from "../config/const.js";

window.__cconst = cconst;

let Vector4 = vectormath.Vector4;

export { Icons } from "../icon_enum.js";
import { Icons } from "../icon_enum.js";

export { setIconMap } from "../icon_enum.js";
import { setIconMap } from "../icon_enum.js";

import { AfterAspect, initAspectClass } from "./aspect.js";
import * as aspect from "./aspect.js";

export const ErrorColors = {
  WARNING: "yellow",
  ERROR  : "red",
  OK     : "green",
};

window.__theme = theme;

let registered_has_happened = false;
let tagPrefix = "";
const EventCBSymbol: unique symbol = Symbol("wrapped event callback");

function calcElemCBKey(elem: UIBase, type: string, options: AddEventListenerOptions | boolean | undefined): string {
  return elem._id + ":" + type + ":" + JSON.stringify(options || {});
}

/**
 * Sets tag prefix for pathux html elements.
 * Must be called prior to loading other modules.
 * Since this is tricky, you can alternatively
 * add a script tag with the prefix with the id "pathux-tag-prefix",
 * e.g.<pre> <script type="text/plain" id="pathux-tag-prefix">prefix</script> </pre>
 * */
export function setTagPrefix(prefix: string): void {
  if (registered_has_happened) {
    throw new Error("have to call ui_base.setTagPrefix before loading any other path.ux modules");
  }

  tagPrefix = "" + prefix;
}

export function getTagPrefix(): string {
  return tagPrefix;
}

if (typeof document !== "undefined") {
  let prefixElem = document.getElementById("pathux-tag-prefix");
  if (prefixElem) {
    console.log("Found pathux-tag-prefix element");
    let prefixText = (prefixElem as HTMLElement).innerText.trim();
    setTagPrefix(prefixText);
  }
}

import { ClassIdSymbol } from "./ui_consts.js";

export { ClassIdSymbol };

let class_idgen = 1;

export function setTheme(theme2: Record<string, unknown>): void {
  //merge theme
  for (let k in theme2) {
    let v = theme2[k];

    if (typeof v !== "object" || v === null) {
      (theme as Record<string, unknown>)[k] = v;
      continue;
    }

    let v0 = (theme as Record<string, unknown>)[k];

    if (!(k in theme)) {
      (theme as Record<string, unknown>)[k] = {};
    }

    let vRec = v as Record<string, unknown>;
    for (let k2 in vRec) {
      //if (v0 && !(k2 in v0)) {
      //  continue;
      //}

      if (k2 in compatMap) {
        let k3 = (compatMap as Record<string, string>)[k2]!;

        if (vRec[k3] === undefined) {
          vRec[k3] = vRec[k2];
        }

        delete vRec[k2];
        k2 = k3;
      }

      ((theme as Record<string, unknown>)[k] as Record<string, unknown>)[k2] = vRec[k2];
    }
  }
}

setTheme(DefaultTheme);

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

  let base = theme.base as Record<string, unknown>;
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

interface CustomIconEntry {
  blobUrl: string;
  canvas: HTMLCanvasElement;
}

class _IconManager {
  tilex: number;
  tilesize: number;
  drawsize: number;
  customIcons: Map<number, CustomIconEntry>;
  image: HTMLImageElement;
  promise: util.TimeoutPromise<_IconManager> | undefined;
  _accept: ((value: _IconManager) => void) | undefined;
  _reject: ((reason?: unknown) => void) | undefined;

  constructor(image: HTMLImageElement, tilesize: number, number_of_horizontal_tiles: number, drawsize: number) {
    this.tilex = number_of_horizontal_tiles;
    this.tilesize = tilesize;
    this.drawsize = drawsize;

    this.customIcons = new Map();

    this.image = image;
    this.promise = undefined;
    this._accept = undefined;
    this._reject = undefined;
  }

  get ready(): boolean {
    return !!(this.image && this.image.width);
  }

  onReady(): Promise<_IconManager> | util.TimeoutPromise<_IconManager> {
    if (this.ready) {
      return new Promise((accept, reject) => {
        accept(this);
      });
    }

    if (this.promise) {
      return this.promise;
    }

    let onload = this.image.onload as ((this: GlobalEventHandlers, ev: Event) => void) | null;
    this.image.onload = (e: Event) => {
      if (onload) {
        onload.call(this.image, e);
      }

      if (!this._accept) {
        return;
      }

      let accept = this._accept;
      this._accept = this._reject = this.promise = undefined;

      if (this.image.width) {
        accept(this);
      }
    };

    this.promise = new util.TimeoutPromise<_IconManager>(
      (accept, reject) => {
        this._accept = accept;
        this._reject = reject;
      },
      15000,
      true
    ); /* silently rejects on timeout */

    this.promise.catch((error: unknown) => {
      util.print_stack(error as Error);
      this.promise = this._accept = this._reject = undefined;
    });

    return this.promise;
  }

  canvasDraw(elem: UIBase, canvas: HTMLCanvasElement, g: CanvasRenderingContext2D, icon: number, x = 0, y = 0): void {
    let customIcon = this.customIcons.get(icon);

    if (customIcon) {
      g.drawImage(customIcon.canvas, x, y);
      return;
    }

    let tx = icon % this.tilex;
    let ty = ~~(icon / this.tilex);

    let dpi = elem.getDPI();
    let ts = this.tilesize;
    let ds = this.drawsize;

    if (!this.image) {
      //console.warn("Failed to render an iconsheet");
      return;
    }

    try {
      g.drawImage(this.image, tx * ts, ty * ts, ts, ts, x, y, ds * dpi, ds * dpi);
    } catch (error: unknown) {
      console.log(this.image);
      console.error((error as Error).stack);
      console.error((error as Error).message);
      console.error("failed to draw an icon");
    }
  }

  setCSS(icon: number, dom: HTMLElement, fitsize: number | number[] | undefined = undefined): void {
    if (!fitsize) {
      fitsize = this.drawsize;
    }

    if (typeof fitsize === "object") {
      fitsize = Math.max(fitsize[0], fitsize[1]);
    }

    let s = dom.style as StyleRecord;
    s["background"] = this.getCSS(icon, fitsize);
    if (this.customIcons.has(icon)) {
      s["background-size"] = fitsize + "px";
    } else {
      s["background-size"] = fitsize * this.tilex + "px";
    }

    s["background-clip"] = "content-box";

    if (!s["width"]) {
      s["width"] = this.drawsize + "px";
    }
    if (!s["height"]) {
      s["height"] = this.drawsize + "px";
    }
  }

  //icon is an integer
  getCSS(icon: number, fitsize: number | number[] = this.drawsize): string {
    if (icon === -1) {
      //-1 means no icon
      return "";
    }

    if (typeof fitsize === "object") {
      fitsize = Math.max(fitsize[0], fitsize[1]);
    }

    let ratio = fitsize / this.tilesize;

    let customIcon = this.customIcons.get(icon);
    if (customIcon !== undefined) {
      //ratio = fitsize / this.drawsize;
      //let d = this.drawsize*0.25;
      let d = 0.0;

      let css = `url("${customIcon.blobUrl}")`;

      return css;
    }

    let x = -(icon % this.tilex) * this.tilesize * ratio;
    let y = -~~(icon / this.tilex) * this.tilesize * ratio;

    //x = ~~x;
    //y = ~~y;

    //console.log(this.tilesize, this.drawsize, x, y);
    //let ts = this.tilesize;
    //return `image('${this.image.src}#xywh=${x},${y},${ts},${ts}')`;
    return `url("${this.image.src}") ${x}px ${y}px`;
  }
}

export class CustomIcon {
  key: string;
  baseImage: HTMLImageElement;
  images: HTMLCanvasElement[];
  id: number;
  manager: IconManager;

  constructor(manager: IconManager, key: string, id: number, baseImage: HTMLImageElement) {
    this.key = key;
    this.baseImage = baseImage;
    this.images = [];
    this.id = id;
    this.manager = manager;
  }

  regenIcons(): void {
    let manager = this.manager;

    let doSheet = (sheet: _IconManager) => {
      let size = sheet.drawsize;
      let canvas = document.createElement("canvas");
      let g = canvas.getContext("2d")!;

      canvas.width = canvas.height = size;
      g.drawImage(this.baseImage, 0, 0, size, size);

      canvas.toBlob((blob: Blob | null) => {
        let blobUrl = URL.createObjectURL(blob!);

        sheet.customIcons.set(this.id, {
          blobUrl,
          canvas,
        });
      });
    };

    for (let sheet of manager.iconsheets) {
      doSheet(sheet);
    }
  }
}

export class IconManager {
  iconsheets: _IconManager[];
  tilex: number;
  customIcons: Map<string, CustomIcon>;
  customIconIDMap: Map<number, CustomIcon>;

  /**
   images is a list of dom ids of img tags

   sizes is a list of tile sizes, one per image.
   you can control the final *draw* size by passing an array
   of [tilesize, drawsize] instead of just a number.
   */
  constructor(
    images: (HTMLImageElement | null)[],
    sizes: (number | [number, number])[] = [],
    horizontal_tile_count = 16
  ) {
    this.iconsheets = [];
    this.tilex = horizontal_tile_count;

    this.customIcons = new Map();
    this.customIconIDMap = new Map();

    for (let i = 0; i < images.length; i++) {
      let size: number, drawsize: number;

      if (typeof sizes[i] == "object") {
        (size = (sizes[i] as [number, number])[0]), (drawsize = (sizes[i] as [number, number])[1]);
      } else {
        size = drawsize = sizes[i] as number;
      }

      if (util.isMobile()) {
        drawsize = ~~(drawsize * theme.base.mobileSizeMultiplier);
      }

      this.iconsheets.push(new _IconManager(images[i] as HTMLImageElement, size, horizontal_tile_count, drawsize));
    }
  }

  isReady(sheet = 0): boolean {
    return this.iconsheets[sheet].ready;
  }

  addCustomIcon(key: string, image: HTMLImageElement): number {
    let icon = this.customIcons.get(key);

    if (!icon) {
      let maxid = 0;

      for (let k in Icons) {
        maxid = Math.max(maxid, Icons[k] + 1);
      }
      for (let icon of this.customIcons.values()) {
        maxid = Math.max(maxid, icon.id + 1);
      }

      maxid = Math.max(maxid, 1000); //just to be on the safe side

      let id = maxid;
      icon = new CustomIcon(this, key, id, image);

      this.customIcons.set(key, icon);
      this.customIconIDMap.set(id, icon);
    }

    icon.baseImage = image;
    icon.regenIcons();

    return icon.id;
  }

  load(manager2: IconManager): this {
    this.iconsheets = manager2.iconsheets;
    this.tilex = manager2.tilex;

    return this;
  }

  reset(horizontal_tile_count: number): void {
    this.iconsheets.length = 0;
    this.tilex = horizontal_tile_count;
  }

  add(image: HTMLImageElement, size: number, drawsize = size): this {
    this.iconsheets.push(new _IconManager(image, size, this.tilex, drawsize));
    return this;
  }

  canvasDraw(
    elem: UIBase,
    canvas: HTMLCanvasElement,
    g: CanvasRenderingContext2D,
    icon: number,
    x = 0,
    y = 0,
    sheet = 0
  ): void {
    let base = this.iconsheets[sheet];

    let found = this.findSheet(sheet);
    let ds = found.drawsize;

    found.drawsize = base.drawsize;
    found.canvasDraw(elem, canvas, g, icon, x, y);
    found.drawsize = ds;
  }

  findClosestSheet(size: number): number {
    let sheets = this.iconsheets.concat([]);

    sheets.sort((a, b) => a.drawsize - b.drawsize);
    let sheet;

    for (let i = 0; i < sheets.length; i++) {
      if (sheets[i].drawsize <= size) {
        sheet = sheets[i];
        break;
      }
    }

    if (!sheet) sheet = sheets[sheets.length - 1];

    return this.iconsheets.indexOf(sheet);
  }

  findSheet(sheet: number | undefined): _IconManager {
    if (sheet === undefined) {
      console.warn("sheet was undefined");
      sheet = 0;
    }

    let base = this.iconsheets[sheet];

    /**sigh**/
    let dpi = UIBase.getDPI();
    let minsheet = undefined;
    let goal = dpi * base.drawsize;

    for (let sheet of this.iconsheets) {
      minsheet = sheet;

      if (sheet.drawsize >= goal) {
        break;
      }
    }

    return minsheet === undefined ? base : minsheet;
  }

  getTileSize(sheet = 0): number {
    return this.iconsheets[sheet].drawsize;
    return this.findSheet(sheet).drawsize;
  }

  getRealSize(sheet = 0): number {
    return this.iconsheets[sheet].tilesize;
    return this.findSheet(sheet).tilesize;
    //return this.iconsheets[sheet].tilesize;
  }

  //icon is an integer
  getCSS(icon: number, sheet = 0): string {
    //return this.iconsheets[sheet].getCSS(icon);
    //return this.findSheet(sheet).getCSS(icon);

    let base = this.iconsheets[sheet];
    let found = this.findSheet(sheet);
    let ds = found.drawsize;

    found.drawsize = base.drawsize;
    let ret = found.getCSS(icon);
    found.drawsize = ds;

    return ret;
  }

  setCSS(icon: number, dom: HTMLElement, sheet = 0, fitsize: number | number[] | undefined = undefined): void {
    //return this.iconsheets[sheet].setCSS(icon, dom);

    let base = this.iconsheets[sheet];
    let found = this.findSheet(sheet);
    let ds = found.drawsize;

    found.drawsize = base.drawsize;
    found.setCSS(icon, dom, fitsize);
    found.drawsize = ds;
  }
}

let iconmanager: IconManager;

if (typeof document !== "undefined") {
  iconmanager = new IconManager(
    [
      document.getElementById("iconsheet16") as HTMLImageElement | null,
      document.getElementById("iconsheet32") as HTMLImageElement | null,
      document.getElementById("iconsheet48") as HTMLImageElement | null,
    ],
    [16, 32, 64],
    16
  );
} else {
  iconmanager = new IconManager([]);
}

export { iconmanager };
window._iconmanager = iconmanager; //debug global

//if client code overrides iconsheets, they must follow logical convention
//that the first one is "small" and the second is "large"
export let IconSheets: Record<string, number> = {
  SMALL : 0,
  LARGE : 1,
  XLARGE: 2,
};

export function iconSheetFromPackFlag(flag: number): number {
  if (flag & PackFlags.CUSTOM_ICON_SHEET) {
    //console.log("Custom Icon Sheet:", flag>>PackFlags.CUSTOM_ICON_SHEET_START);
    return flag >> PackFlags.CUSTOM_ICON_SHEET_START;
  }

  if (flag & PackFlags.SMALL_ICON && !PackFlags.LARGE_ICON) {
    return 0; //IconSheets.SMALL; //0
  } else {
    return 1; //IconSheets.LARGE; //1
  }
}

export function getIconManager(): IconManager {
  return iconmanager;
}

export function setIconManager(manager: IconManager, IconSheetsOverride?: Record<string, number>): void {
  iconmanager.load(manager);

  if (IconSheetsOverride !== undefined) {
    for (let k in IconSheetsOverride) {
      IconSheets[k] = IconSheetsOverride[k];
    }
  }
}

export function makeIconDiv(icon: number, sheet = 0): HTMLDivElement {
  let size = iconmanager.getRealSize(sheet);

  let drawsize = iconmanager.getTileSize(sheet);

  let icontest = document.createElement("div");

  icontest.style["width"] = icontest.style["minWidth"] = drawsize + "px";
  icontest.style["height"] = icontest.style["minHeight"] = drawsize + "px";

  //icontest.style["background-color"] = "orange";

  icontest.style["margin"] = "0px";
  icontest.style["padding"] = "0px";

  iconmanager.setCSS(icon, icontest, sheet);

  return icontest;
}

let Vector2 = vectormath.Vector2;
let Matrix4 = vectormath.Matrix4;

export let dpistack: number[] = [];

export const UIFlags: Record<string, number> = {};

const internalElementNames: Record<string, string> = {};
const externalElementNames: Record<string, string> = {};

export const PackFlags = {
  INHERIT_WIDTH : 1,
  INHERIT_HEIGHT: 2,
  VERTICAL      : 4,
  USE_ICONS     : 8,
  SMALL_ICON    : 16,
  LARGE_ICON    : 32,

  FORCE_PROP_LABELS         : 64, //force propeties (Container.prototype.prop()) to always have labels
  PUT_FLAG_CHECKS_IN_COLUMNS: 128, //group flag property checkmarks in columns (doesn't apply to icons)

  WRAP_CHECKBOXES: 256,

  //internal flags
  STRIP_HORIZ            : 512,
  STRIP_VERT             : 1024,
  STRIP                  : 512 | 1024,
  SIMPLE_NUMSLIDERS      : 2048,
  FORCE_ROLLER_SLIDER    : 4096,
  HIDE_CHECK_MARKS       : 1 << 13,
  NO_NUMSLIDER_TEXTBOX   : 1 << 14,
  CUSTOM_ICON_SHEET      : 1 << 15,
  CUSTOM_ICON_SHEET_START: 20, //custom icon sheet bits are shifted to here
  NO_UPDATE              : 1 << 16,
  LABEL_ON_RIGHT         : 1 << 17,
};

let first = (iter: Iterable<unknown> | Record<string, unknown> | undefined): unknown => {
  if (iter === undefined) {
    return undefined;
  }

  if (!(Symbol.iterator in (iter as Record<symbol, unknown>))) {
    for (let item in iter as Record<string, unknown>) {
      return item;
    }

    return undefined;
  }

  for (let item of iter as Iterable<unknown>) {
    return item;
  }
};

import { DataPathError } from "../path-controller/controller/controller.js";
import { TimeoutPromise } from "../path-controller/util/util.js";
import { IntProperty, NumberConstraints, PropFlags } from "../path-controller/toolsys/toolprop.js";
import {
  DependSocket,
  EventNode,
  PropertySocket,
  PropSocketModes,
  SocketTypes,
  theEventGraph,
} from "../path-controller/dag/eventdag.js";
import { isNum } from "../path-controller/util/math.js";
import { IContextBase } from "./context_base.js";

let _mobile_theme_patterns = [/.*width.*/, /.*height.*/, /.*size.*/, /.*margin.*/, /.*pad/, /.*radius.*/];

let _idgen = 0;

window._testSetScrollbars = function (color = "grey", contrast = 0.5, width = 15, border = "solid"): string {
  let buf = styleScrollBars(color, undefined, contrast, width, border, "*");
  /* CTX is an app-level global */
  (window as unknown as Record<string, unknown>)["CTX"] &&
    (
      (window as unknown as Record<string, unknown>)["CTX"] as { screen: { mergeGlobalCSS(buf: string): void } }
    ).screen.mergeGlobalCSS(buf);

  //document.body.style["overflow"] = "scroll";

  /*
  if (!window._tsttag) {
    window._tsttag = document.createElement("style");
    document.body.prepend(_tsttag);
  }

  _tsttag.textContent = buf;
  //*/

  return buf;
};

export function styleScrollBars(
  color: string = "grey",
  color2: string | undefined = undefined,
  contrast = 0.5,
  width = 15,
  border = "1px groove black",
  selector = "*"
): string {
  if (!color2) {
    let c = css2color(color);
    let a = c.length > 3 ? c[3] : 1.0;

    c = rgb_to_hsv(c[0], c[1], c[2]);
    let inv = c.slice(0, c.length);

    inv[2] = 1.0 - inv[2];
    inv[2] += (c[2] - inv[2]) * (1.0 - contrast);

    inv = hsv_to_rgb(inv[0], inv[1], inv[2]);

    inv.length = 4;
    inv[3] = a;

    color2 = color2css(inv);
  }

  let buf = `

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

  //console.log(buf);
  return buf;
}

window.styleScrollBars = styleScrollBars;

let _digest = new util.HashDigest();

export function calcThemeKey(digest = _digest.reset()): number {
  for (let k in theme) {
    let obj = theme[k];

    if (typeof obj !== "object") {
      continue;
    }

    for (let k2 in obj) {
      let v2 = obj[k2];

      if (typeof v2 === "number" || typeof v2 === "boolean" || typeof v2 === "string") {
        digest.add(v2);
      } else if (typeof v2 === "object" && v2 instanceof CSSFont) {
        v2.calcHashUpdate(digest);
      }
    }
  }

  return digest.get();
}

export var _themeUpdateKey = calcThemeKey();

export function flagThemeUpdate(): void {
  _themeUpdateKey = calcThemeKey();
}

window._flagThemeUpdate = flagThemeUpdate;

interface TimeoutQueueItem {
  cb: () => void;
  timeout: number;
  time: number;
}

let setTimeoutQueue = new Set<TimeoutQueueItem>();
let haveTimeout = false;

function timeout_cb(): void {
  if (setTimeoutQueue.size === 0) {
    haveTimeout = false;
    return;
  }

  for (let item of new Set(setTimeoutQueue)) {
    let { cb, timeout, time } = item;
    if (util.time_ms() - time < timeout) {
      continue;
    }

    setTimeoutQueue.delete(item);

    try {
      cb();
    } catch (error) {
      console.error(error.stack);
    }
  }

  window.setTimeout(timeout_cb, 0);
}

export function internalSetTimeout(cb: () => void, timeout: number | undefined): void {
  if (timeout !== undefined && timeout > 100) {
    //call directly
    window.setTimeout(cb, timeout);
    return;
  }

  setTimeoutQueue.add({
    cb,
    timeout,
    time: util.time_ms(),
  });

  if (!haveTimeout) {
    haveTimeout = true;
    window.setTimeout(timeout_cb, 0);
  }
}

window.setTimeoutQueue = setTimeoutQueue as unknown as typeof window.setTimeoutQueue;

if (typeof HTMLElement === "undefined") {
  // inside a worker?
  (window as unknown as Record<string, unknown>).HTMLElement = class HTMLElement {};
  (window as unknown as Record<string, unknown>).customElements = {
    define: () => {},
  };
  window.devicePixelRatio = 1.0;
  (window as unknown as Record<string, unknown>).PointerEvent = class PointerEvent {};
}

interface UIBaseDefinition {
  tagname: string;
  style?: string;
  subclassChecksTheme?: boolean;
  havePickClipboard?: boolean;
  pasteForAllChildren?: boolean;
  copyForAllChildren?: boolean;
  parentStyle?: string;
}

interface DisableData {
  style: Record<string, string>;
  defaults: Record<string, unknown>;
}

interface ToolTipState {
  start_timer: (e?: Event) => void;
  stop_timer: (e?: Event) => void;
  reset_timer: (e?: Event) => void;
  start_events: string[];
  reset_events: string[];
  stop_events: string[];
  handlers: Record<string, EventListener>;
}

export class UIBase<CTX extends IContextBase = IContextBase> extends HTMLElement {
  static PositionKey: string;

  declare ["constructor"]: typeof UIBase;

  /* -- instance properties -- */
  _tool_tip_abort_delay: number | undefined;
  _tooltip_ref: { remove(): void } | undefined;
  _textBoxEvents: boolean;
  _themeOverride: Record<string, Record<string, unknown>> | undefined;
  _checkTheme: boolean;
  _last_theme_update_key: number;
  _client_disabled_set: boolean | undefined;
  _useNativeToolTips: boolean;
  _useNativeToolTips_set: boolean;
  _has_own_tooltips: ToolTipState | undefined;
  _tooltip_timer: number | undefined;
  pathUndoGen: number;
  _lastPathUndoGen: number;
  _useDataPathUndo: boolean | undefined;
  _active_animations: Animator[];
  _screenStyleTag: HTMLStyleElement;
  _screenStyleUpdateHash: number;
  shadow!: ShadowRoot;
  __cbs: [string, EventListener, AddEventListenerOptions | boolean | undefined][];
  _wasAddedToNodeAtSomeTime: boolean;
  visibleToPick: boolean;
  _override_class: string | undefined;
  _parentWidget: UIBase<CTX> | undefined;
  _id: string;
  default_overrides: Record<string, unknown>;
  my_default_overrides: Record<string, unknown>;
  class_default_overrides: Record<string, Record<string, unknown>>;
  _last_description: string | undefined;
  _description_final: string | undefined;
  _modaldata: unknown;
  packflag: unknown;
  _internalDisabled: boolean;
  __disabledState: boolean;
  _disdata: DisableData | undefined;
  _ctx: CTX;
  _description: string | undefined;
  _init_done: boolean;
  __background: string;
  _flashtimer: ReturnType<typeof setInterval> | undefined;
  _flashcolor: string | undefined;

  /* clipboard-related, set by _clipboardHotkeyInit */
  _clipboard_over!: boolean;
  _last_clipboard_keyevt: KeyboardEvent | undefined;
  _clipboard_keystart!: () => void;
  _clipboard_keyend!: () => void;
  _clipboard_keydown!: (e: KeyboardEvent, internal_mode?: boolean) => void;
  _clipboard_events!: boolean;

  /* EventNode mixin fields */
  declare graphNode: import("../path-controller/dag/eventdag.js").EventNode;

  /* Dynamic property fields set by subclasses (numslider, etc) */
  declare baseUnit: string | undefined;
  declare displayUnit: string | undefined;
  declare isInt: boolean | undefined;
  declare radix: number | undefined;
  declare decimalPlaces: number | undefined;
  declare editAsBaseUnit: boolean | undefined;
  declare range: [number, number];
  declare value: unknown;
  declare ondestroy: (() => void) | undefined;
  declare on_remove: (() => void) | undefined;
  declare getValue: (() => unknown) | undefined;

  #reflagGraph = false;

  static graphNodeDef = EventNode.register(this, {
    typeName: this.name,
    uiName  : this.name,
    inputs: {
      depend: new DependSocket(),
    },
    outputs: {
      depend: new DependSocket(),
    },
  });

  graphExec(): void {
    let node = this.graphNode;

    if (node.inputs.depend.isUpdated) {
      node.outputs.depend.flagUpdate();
    }

    for (let k in node.inputs) {
      let sock = node.inputs[k];

      if (!(sock instanceof PropertySocket)) {
        continue;
      }

      let val = sock.value;
      let first = true;

      for (let sockb of sock.edges) {
        if (first) {
          val = sockb.value;
          first = false;
        } else {
          switch (sock.mixMode) {
            case PropSocketModes.REPLACE:
              val = sockb.value;
              break;
            case PropSocketModes.MIN:
              val = Math.min(val, sockb.value);
              break;
            case PropSocketModes.MAX:
              val = Math.max(val, sockb.value);
              break;
          }
        }
      }

      sock.value = val;
    }

    function isNumArray(a) {
      if (!Array.isArray(a)) {
        return false;
      }

      for (let i = 0; i < a.length; i++) {
        if (a[i] !== undefined && typeof a[i] !== "number" && typeof a[i] !== "boolean") {
          return false;
        }
      }

      return true;
    }

    for (let k in node.outputs) {
      let sock = node.outputs[k];

      if (!(sock instanceof PropertySocket)) {
        continue;
      }

      let v = sock.value;
      let changed;
      if (typeof v === "boolean" || typeof v === "string" || typeof v === "number") {
        changed = v !== sock.oldValue;
        sock.oldValue = v;
      } else if (typeof v === "object") {
        if (isNumArray(v)) {
          if (!sock.oldValue) {
            sock.oldValue = Array.from(v);
          } else {
            if (sock.oldValue.length !== v.length) {
              changed = true;
            } else {
              for (let i = 0; i < sock.oldValue.length; i++) {
                changed = sock.oldValue[i] !== v[i];
              }
            }

            if (sock.oldValue.length !== v.length) {
              sock.oldValue.length = v.length;
            }
            for (let i = 0; i < v.length; i++) {
              sock.oldValue[i] = v.value[i];
            }
          }
        } else {
          if (sock.oldValue === undefined) {
            sock.oldValue = JSON.stringify(v);
          } else {
            let json = JSON.stringify(v);
            changed = json !== sock.oldValue;
            sock.oldValue = json;
          }
        }
      }

      if (changed) {
        console.log("Propagating prop update");
        sock.flagUpdate();
      }
    }
  }

  ensureGraph(): void {
    console.log("Ensure Graph", this, this.graphNode, this.graphNode.id);
    if (!theEventGraph.has(this)) {
      theEventGraph.add(this);
    }
  }

  flagPropSocketUpdate(path: string): this {
    let sock = this.getPropertySocket(path, SocketTypes.OUTPUT);
    if (sock) {
      console.warn(`Flag socket "${path}" for update`);
      sock.flagUpdate();
    }
    return this;
  }

  getPropertySocket(prop: string, socktype: number): PropertySocket | undefined {
    let node = this.graphNode;
    let sockets = socktype === SocketTypes.INPUT ? node.inputs : node.outputs;

    if (sockets[prop]) {
      return sockets[prop] as PropertySocket;
    }

    return undefined;
  }

  ensurePropertySocket(prop: string, socktype: number): PropertySocket {
    this.ensureGraph();

    let node = this.graphNode;
    let sockets = socktype === SocketTypes.INPUT ? node.inputs : node.outputs;

    if (sockets[prop]) {
      return sockets[prop] as PropertySocket;
    }

    let sock = new PropertySocket();
    sock.bind(this, prop);
    node.addSocket(socktype, prop, sock);

    if (prop === "value") {
      sock.callback((v) => {
        if (this.getValue) {
          return this.getValue();
        }

        return this.value;
      });
    }

    return sock;
  }

  /*
    widget.dependsOn("hidden", checkbox, "value")
   */
  dependsOn(
    dstProp: string,
    source: UIBase<CTX>,
    srcProp: string,
    srcCallback?: (v: unknown) => unknown,
    dstCallback?: (v: unknown) => unknown
  ): PropertySocket {
    let sockdst = this.ensurePropertySocket(dstProp, SocketTypes.INPUT);
    let socksrc = source.ensurePropertySocket(srcProp, SocketTypes.OUTPUT);

    if (srcCallback) {
      socksrc.callback(srcCallback);
    }

    sockdst.connect(socksrc);

    return sockdst;
  }

  constructor() {
    super();

    EventNode.init(this);

    this._tool_tip_abort_delay = undefined;
    this._tooltip_ref = undefined;

    this._textBoxEvents = false;

    this._themeOverride = undefined;

    this._checkTheme = true;
    this._last_theme_update_key = _themeUpdateKey;

    this._client_disabled_set = undefined;
    //this._parent_disabled_set = 0;

    this._useNativeToolTips = cconst.useNativeToolTips;
    this._useNativeToolTips_set = false;
    this._has_own_tooltips = undefined;
    this._tooltip_timer = util.time_ms();

    this.pathUndoGen = 0;
    this._lastPathUndoGen = 0;
    this._useDataPathUndo = undefined;

    this._active_animations = [];

    //ref to Link element referencing Screen style node
    //Screen.update_intern sets the contents of this
    this._screenStyleTag = document.createElement("style");
    this._screenStyleUpdateHash = 0;

    initAspectClass(this, new Set(["appendChild", "animate", "shadow", "removeNode", "prepend", "add", "init"]));

    this.shadow = this.attachShadow({ mode: "open" });

    if (cconst.DEBUG.paranoidEvents) {
      this.__cbs = [];
    }

    this.shadow.appendChild(this._screenStyleTag);
    let _origAppendChild = this.shadow.appendChild.bind(this.shadow) as <T extends Node>(child: T) => T;
    (this.shadow as ShadowRoot & { _appendChild: <T extends Node>(child: T) => T })._appendChild = _origAppendChild;

    ///*
    this.shadow.appendChild = <T extends Node>(child: T): T => {
      if (child && typeof child === "object" && child instanceof UIBase) {
        child.parentWidget = this;
      }

      return _origAppendChild(child);
    };
    //*/

    this._wasAddedToNodeAtSomeTime = false;

    this.visibleToPick = true;

    this._override_class = undefined;
    this.parentWidget = undefined;

    /*
    this.shadow._appendChild = this.shadow.appendChild;
    this.shadow.appendChild = (child) => {
      if (child instanceof UIBase) {
        child.ctx = this.ctx;
        child.parentWidget = this;

        if (child._useDataPathUndo === undefined) {
          child.useDataPathUndo = this.useDataPathUndo;
        }
      }

      return this.shadow._appendChild(child);
    };
    //*/

    let tagname = (this.constructor as typeof UIBase).define().tagname;
    this._id = tagname.replace(/\-/g, "_") + _idgen++;

    this.default_overrides = {}; //inherited by child widgets
    this.my_default_overrides = {}; //not inherited to child widgets
    this.class_default_overrides = {};

    this._last_description = undefined;
    this._description_final = undefined;

    //getting css to flow down properly can be a pain, so
    //some packing settings are set as bitflags here,
    //see PackFlags

    /*
    setInterval(() => {
      this.update();
    }, 200);
    //*/

    this._modaldata = undefined;
    this.packflag = this.getDefault("BasePackFlag");
    this._internalDisabled = false;
    this.__disabledState = false;
    this._disdata = undefined;
    this._ctx = undefined;

    this._description = undefined;

    let style = document.createElement("style");
    style.textContent =
      `
    .DefaultText {
      font: ` +
      _getFont(this) +
      `;
    }
    `;
    this.shadow.appendChild(style);
    this._init_done = false;

    /* Deprecated touch -> mouse event conversion,
       use pointer events instead. */
    let do_touch = (e: TouchEvent, type: string, button?: number) => {
      if (haveModal()) {
        return;
      }

      button = button === undefined ? 0 : button;
      let e2 = copyEvent(e) as Record<string, unknown>;

      if (e.touches.length === 0) {
        //hrm, what to do, what to do. . .
      } else {
        let t = e.touches[0];

        e2.pageX = t.pageX;
        e2.pageY = t.pageY;
        e2.screenX = t.screenX;
        e2.screenY = t.screenY;
        e2.clientX = t.clientX;
        e2.clientY = t.clientY;
        e2.x = t.clientX;
        e2.y = t.clientY;
      }

      e2.button = button;

      let e3 = new MouseEvent(type, e2 as MouseEventInit) as MouseEvent & { was_touch: boolean; touches: TouchList };

      e3.was_touch = true;
      e3.stopPropagation = e.stopPropagation.bind(e);
      e3.preventDefault = e.preventDefault.bind(e);
      (e3 as MouseEvent & { touches: TouchList }).touches = e.touches;

      this.dispatchEvent(e3);
    };

    this.addEventListener(
      "touchstart",
      (e) => {
        do_touch(e, "mousedown", 0);
      },
      { passive: false }
    );
    this.addEventListener(
      "touchmove",
      (e) => {
        do_touch(e, "mousemove");
      },
      { passive: false }
    );
    this.addEventListener(
      "touchcancel",
      (e) => {
        do_touch(e, "mouseup", 2);
      },
      { passive: false }
    );
    this.addEventListener(
      "touchend",
      (e) => {
        do_touch(e, "mouseup", 0);
      },
      { passive: false }
    );

    if ((this.constructor as typeof UIBase).define().havePickClipboard) {
      this._clipboardHotkeyInit();
    }
  }

  /*
  set default_overrides(v) {
    console.error("default_overrides was set", v);
    this._default_overrides = v;
  }

  get default_overrides() {
    return this._default_overrides;
  }//*/

  get useNativeToolTips() {
    return this._useNativeToolTips;
  }

  set useNativeToolTips(val) {
    this._useNativeToolTips = val;
    this._useNativeToolTips_set = true;
  }

  get parentWidget() {
    return this._parentWidget;
  }

  set parentWidget(val) {
    if (val) {
      this._wasAddedToNodeAtSomeTime = true;
    }

    this._parentWidget = val;
  }

  get useDataPathUndo() {
    let p = this;

    while (p) {
      if (p._useDataPathUndo !== undefined) {
        return p._useDataPathUndo;
      }

      p = p.parentWidget;
    }

    /* Default to true. */
    return true;
  }

  /**
   causes calls to setPathValue to go through
   toolpath app.datapath_set(path="" newValueJSON="")

   every child will inherit
   */
  set useDataPathUndo(val) {
    this._useDataPathUndo = val;
  }

  get description() {
    return this._description;
  }

  set description(val) {
    if (val === null) {
      this._description = undefined;
      return;
    }

    this._description = val;

    if (val === undefined || val === null) {
      return;
    }

    if (cconst.showPathsInToolTips && this.hasAttribute("datapath")) {
      let s = "" + this._description;

      let path = this.getAttribute("datapath");
      s += "\n    path: " + path;

      if (this.hasAttribute("mass_set_path")) {
        let m = this.getAttribute("mass_set_path");
        s += "\n    massSetPath: " + m;
      }

      this._description_final = s;
    } else {
      this._description_final = this._description;
    }

    if (cconst.useNativeToolTips) {
      this.title = "" + this._description_final;
    }
  }

  get background() {
    return this.__background;
  }

  set background(bg) {
    this.__background = bg;

    this.overrideDefault("background-color", bg, true);
    this.style["background-color"] = bg;
  }

  get disabled() {
    //hrm, I could just propegate checks upward. . .

    if (this.parentWidget && this.parentWidget.disabled) {
      return true;
    }

    return !!this._client_disabled_set || !!this._internalDisabled; // || !!this._parent_disabled_set;
  }

  set disabled(v) {
    this._client_disabled_set = v;
    this.__updateDisable(this.disabled);
  }

  get internalDisabled() {
    return this._internalDisabled;
  }

  set internalDisabled(val) {
    this._internalDisabled = !!val;

    this.__updateDisable(this.disabled);
  }

  get ctx() {
    return this._ctx;
  }

  set ctx(c: CTX) {
    this._ctx = c;

    this._forEachChildWidget((n) => {
      n.ctx = c;
    });
  }

  get _reportCtxName() {
    return "" + this._id;
  }

  get modalRunning() {
    return this._modaldata !== undefined;
  }

  static getIconEnum(): Record<string, number> {
    return Icons;
  }

  static setDefault<T extends UIBase>(element: T): T {
    return element;
  }

  /**DEPRECATED

   scaling ratio (e.g. for high-resolution displays)
   */
  static getDPI(): number {
    //if (dpistack.length > 0) {
    //  return dpistack[this.dpistack.length-1];
    //} else {
    //if (util.isMobile()) {
    return window.devicePixelRatio; // * visualViewport.scale;
    //}

    return window.devicePixelRatio;
    //}
  }

  static prefix(name: string): string {
    return tagPrefix + name;
  }

  static internalRegister(cls: typeof UIBase): void {
    (cls as Record<symbol, unknown>)[ClassIdSymbol] = class_idgen++;

    registered_has_happened = true;

    internalElementNames[cls.define().tagname] = this.prefix(cls.define().tagname);
    customElements.define(this.prefix(cls.define().tagname), cls);
  }

  static getInternalName(name: string): string | undefined {
    return internalElementNames[name];
  }

  static createElement(name: string, internal = false): HTMLElement {
    if (!internal && name in externalElementNames) {
      return document.createElement(name);
    } else if (name in internalElementNames) {
      return document.createElement(internalElementNames[name]);
    } else {
      return document.createElement(name);
    }
  }

  static register(cls: typeof UIBase): void {
    registered_has_happened = true;

    (cls as Record<symbol, unknown>)[ClassIdSymbol] = class_idgen++;

    ElementClasses.push(cls);

    externalElementNames[cls.define().tagname] = cls.define().tagname;
    customElements.define(cls.define().tagname, cls);
  }

  /**
   * Defines core attributes of the class
   *
   * @example
   *
   * static define() {return {
   *   tagname             : "custom-element-x",
   *   style               : "[style class in theme]"
   *   subclassChecksTheme : boolean //set to true to disable base class invokation of checkTheme()
   *   havePickClipboard   : boolean //whether element supports mouse hover copy/paste
   *   pasteForAllChildren : boolean //mouse hover paste happens even over child widgets
   *   copyForAllChildren  : boolean //mouse hover copy happens even over child widgets
   * }}
   */
  static define(): UIBaseDefinition {
    throw new Error("Missing define() for ux element");
  }

  setUndo(val: boolean): this {
    this.useDataPathUndo = val;
    return this;
  }

  set hidden(state: boolean) {
    state = !!state;
    super.hidden = state;

    for (let n of this.shadow.childNodes) {
      (n as HTMLElement).hidden = state;
    }

    this._forEachChildWidget((n: UIBase) => {
      n.hide(state);
    });
  }

  get hidden(): boolean {
    return super.hidden;
  }

  hide(sethide = true): this {
    this.hidden = sethide;
    return this;
  }

  getElementById(id: string): HTMLElement | undefined {
    let ret: HTMLElement | undefined;

    let rec = (
      n: HTMLElement & { shadow?: ShadowRoot; contents?: HTMLElement; tabs?: Record<string, HTMLElement> }
    ) => {
      if (ret) {
        return;
      }

      if (n.getAttribute("id") === id || n.id === id) {
        ret = n;
      }

      if (n instanceof UIBase && n.constructor.define().tagname === "panelframe-x") {
        rec((n as unknown as { contents: HTMLElement }).contents);
      } else if (n instanceof UIBase && n.constructor.define().tagname === "tabcontainer-x") {
        for (let k in (n as unknown as { tabs: Record<string, HTMLElement> }).tabs) {
          let tab = (n as unknown as { tabs: Record<string, HTMLElement> }).tabs[k];

          if (tab) {
            rec(tab);
          }
        }
      }

      for (let n2 of n.childNodes) {
        if (n2 instanceof HTMLElement) {
          rec(n2);

          if (ret) {
            break;
          }
        }
      }

      if (n.shadow) {
        for (let n2 of n.shadow.childNodes) {
          if (n2 instanceof HTMLElement) {
            rec(n2);

            if (ret) {
              break;
            }
          }
        }
      }
    };

    rec(this);

    return ret;
  }

  unhide(): void {
    this.hide(false);
  }

  findArea(): UIBase | undefined {
    let p: UIBase | undefined = this;

    while (p) {
      if (Area && p instanceof Area) {
        return p;
      }

      p = p.parentWidget;
    }

    return p;
  }

  addEventListener(
    type: string,
    cb: EventListener & { [EventCBSymbol]?: Map<string, EventListener> },
    options?: AddEventListenerOptions | boolean
  ): void {
    if (cconst.DEBUG.domEventAddRemove) {
      console.log("addEventListener", type, this._id, options);
    }

    let cb2 = (e: Event) => {
      if (cconst.DEBUG.paranoidEvents) {
        if (this.isDead()) {
          this.removeEventListener(type, cb, options);
          return;
        }
      }

      if (cconst.DEBUG.domEvents) {
        pathDebugEvent(e);
      }

      let area = this.findArea() as (UIBase & { push_ctx_active(): void; pop_ctx_active(): void }) | undefined;

      if (area) {
        area.push_ctx_active();
        try {
          let ret = cb(e);
          area.pop_ctx_active();
          return ret;
        } catch (error) {
          area.pop_ctx_active();
          throw error;
        }
      } else {
        if (cconst.DEBUG.areaContextPushes) {
          console.warn("Element is not part of an area?", this);
        }

        return cb(e);
      }
    };

    if (!cb[EventCBSymbol]) {
      cb[EventCBSymbol] = new Map();
    }

    let key = calcElemCBKey(this, type, options);
    cb[EventCBSymbol].set(key, cb2);

    if (cconst.DEBUG.paranoidEvents) {
      this.__cbs.push([type, cb2, options]);
    }

    return super.addEventListener(type, cb2, options as AddEventListenerOptions);
  }

  removeEventListener(
    type: string,
    cb: EventListener & { [EventCBSymbol]?: Map<string, EventListener>; _cb2?: EventListener },
    options?: AddEventListenerOptions | boolean
  ): void {
    if (cconst.DEBUG.paranoidEvents) {
      for (let item of this.__cbs) {
        if (item[0] == type && item[1] === cb._cb2 && "" + item[2] === "" + options) {
          this.__cbs.remove(item);
          break;
        }
      }
    }

    if (cconst.DEBUG.domEventAddRemove) {
      console.log("removeEventListener", type, this._id, options);
    }

    let key = calcElemCBKey(this, type, options);

    if (!cb[EventCBSymbol] || !cb[EventCBSymbol].has(key)) {
      return super.removeEventListener(type, cb, options as EventListenerOptions);
    } else {
      let cb2 = cb[EventCBSymbol].get(key)!;

      let ret = super.removeEventListener(type, cb2, options as EventListenerOptions);

      cb[EventCBSymbol].delete(key);
      return ret;
    }
  }

  connectedCallback(): void {}

  noMarginsOrPadding(): this {
    let keys = ["margin", "padding", "margin-block-start", "margin-block-end"];
    keys = keys.concat(["padding-block-start", "padding-block-end"]);

    keys = keys.concat(["margin-left", "margin-top", "margin-bottom", "margin-right"]);
    keys = keys.concat(["padding-left", "padding-top", "padding-bottom", "padding-right"]);

    for (let k of keys) {
      this.style[k] = "0px";
    }

    return this;
  }

  /**
   * find owning screen and tell it to update
   * the global tab order
   * */
  regenTabOrder(): this {
    let screen = this.getScreen() as (UIBase & { needsTabRecalc: boolean }) | undefined;
    if (screen !== undefined) {
      screen.needsTabRecalc = true;
    }

    return this;
  }

  noMargins(): this {
    this.style["margin"] = this.style["margin-left"] = this.style["margin-right"] = "0px";
    this.style["margin-top"] = this.style["margin-bottom"] = "0px";
    return this;
  }

  noPadding(): this {
    this.style["padding"] = this.style["padding-left"] = this.style["padding-right"] = "0px";
    this.style["padding-top"] = this.style["padding-bottom"] = "0px";
    return this;
  }

  getTotalRect():
    | { width: number; height: number; x: number; y: number; left: number; top: number; right: number; bottom: number }
    | undefined {
    let found = false;

    let min = new Vector2([1e17, 1e17]);
    let max = new Vector2([-1e17, -1e17]);

    let doaabb = (n: HTMLElement) => {
      let rs = n.getClientRects();

      for (let r of rs) {
        min[0] = Math.min(min[0], r.x);
        min[1] = Math.min(min[1], r.y);
        max[0] = Math.max(max[0], r.x + r.width);
        max[1] = Math.max(max[1], r.y + r.height);

        found = true;
      }
    };

    doaabb(this);

    this._forEachChildWidget((n) => {
      doaabb(n);
    });

    if (found) {
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
    } else {
      return undefined;
    }
  }

  parseNumber(value: string | number, args: { baseUnit?: string; isInt?: boolean } = {}): number {
    let str = ("" + value).trim().toLowerCase();

    let baseUnit = args.baseUnit || this.baseUnit;
    let isInt = args.isInt || this.isInt;

    let sign = 1.0;

    if (str.startsWith("-")) {
      str = str.slice(1, str.length).trim();
      sign = -1;
    }

    let hexre = /-?[0-9a-f]+h$/;
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
      result = units.parseValue(str, baseUnit) as number;
    }

    if (isInt) {
      result = ~~result;
    }

    return result * sign;
  }

  formatNumber(
    value: number,
    args: { baseUnit?: string; displayUnit?: string; isInt?: boolean; radix?: number; decimalPlaces?: number } = {}
  ): string {
    let baseUnit = args.baseUnit || this.baseUnit;
    let displayUnit = args.displayUnit || this.displayUnit;
    let isInt = args.isInt || this.isInt;
    let radix = args.radix || this.radix || 10;
    let decimalPlaces = args.decimalPlaces || this.decimalPlaces;

    //console.log(this.baseUnit, this.displayUnit);

    if (isInt && radix !== 10) {
      let ret = Math.floor(value).toString(radix);

      if (radix === 2) return "0b" + ret;
      else if (radix === 16) return ret + "h";
    }

    return units.buildString(value, baseUnit, decimalPlaces, displayUnit) as string;
  }

  setBoxCSS(subkey?: string): void {
    let boxcode = "";

    //debugger;

    let keys = ["left", "right", "top", "bottom"];

    let sub;
    if (subkey) {
      sub = this.getAttribute(subkey) || {};
    }

    let def = (key) => {
      if (sub) {
        return this.getSubDefault(subkey, key);
      }

      return this.getDefault(key);
    };

    for (let i = 0; i < 2; i++) {
      let key = i ? "padding" : "margin";

      this.style[key] = "unset";

      let val = def(key);
      if (val !== undefined) {
        //handle default first
        for (let j = 0; j < 4; j++) {
          this.style[key + "-" + keys[j]] = val + "px";
        }
      }

      for (let j = 0; j < 4; j++) {
        //now do box sides
        let key2 = `${key}-${keys[j]}`;
        let val2 = def(key2);

        if (val2 !== undefined) {
          this.style[key2] = val2 + "px";
        }
      }
    }

    this.style["border-radius"] = def("border-radius") + "px";
    this.style["border"] = `${def("border-width")}px ${def("border-style")} ${def("border-color")}`;
  }

  genBoxCSS(subkey?: string): string {
    let boxcode = "";

    let keys = ["left", "right", "top", "bottom"];

    let sub;
    if (subkey) {
      sub = this.getAttribute(subkey) || {};
    }

    let def = (key) => {
      if (sub) {
        return this.getSubDefault(subkey, key);
      }

      return this.getDefault(key);
    };

    for (let i = 0; i < 2; i++) {
      let key = i ? "padding" : "margin";

      let val = def(key);
      if (val !== undefined) {
        boxcode += `${key}: ${val} px;\n`;
      }

      for (let j = 0; j < 4; j++) {
        let key2 = `${key}-${keys[j]}`;
        let val2 = def(key2);

        if (val2 !== undefined) {
          boxcode += `${key2}: ${val}px;\n`;
        }
      }
    }

    boxcode += `border-radius: ${def("border-radius")}px;\n`;
    boxcode += `border: ${def("border-width")}px ${def("border-style")} ${def("border-color")};\n`;

    return boxcode;
  }

  setCSS(setBG = true): void {
    if (setBG) {
      let bg = this.getDefault("background-color");
      if (bg) {
        this.style["background-color"] = bg;
      }
    }

    let zoom = this.getZoom();
    if (zoom === 1.0) {
      return;
    }

    let transform = "" + this.style["transform"];

    //try to preserve user set transform by selectively deleting scale
    //kind of hackish. . .

    //normalize whitespace
    transform = transform.replace(/[ \t\n\r]+/g, " ");
    transform = transform.replace(/, /g, ",");

    //cut out scale
    let transform2 = transform.replace(/scale\([^)]+\)/, "").trim();
    this.style["transform"] = transform2 + ` scale(${zoom},${zoom})`;
  }

  flushSetCSS(): void {
    //check init
    this._init();

    this.setCSS();

    this._forEachChildWidget((c) => {
      if (!(c.packflag & PackFlags.NO_UPDATE)) {
        c.flushSetCSS();
      }
    });
  }

  /* Why is the DOM API argument order swapped here?*/
  replaceChild(newnode: Node, node: Node): boolean {
    for (let i = 0; i < this.childNodes.length; i++) {
      if (this.childNodes[i] === node) {
        super.replaceChild(newnode, node);
        return true;
      }
    }

    for (let i = 0; i < this.shadow.childNodes.length; i++) {
      if (this.shadow.childNodes[i] === node) {
        this.shadow.replaceChild(newnode, node);
        return true;
      }
    }

    console.error("Unknown child node", node);
    return false;
  }

  swapWith(b: UIBase): boolean {
    let p1: Node | null | UIBase = this.parentNode;
    let p2: Node | null | UIBase = b.parentNode;

    if ((this.parentWidget && p1 === this.parentWidget.shadow) || p1 === null) {
      p1 = this.parentWidget;
    }

    if ((b.parentWidget && p2 === b.parentWidget.shadow) || p2 === null) {
      p2 = b.parentWidget;
    }

    if (!p1 || !p2) {
      console.error("Invalid call to UIBase.prototype.swapWith", this, b, p1, p2);
      return false;
    }

    let getPos = (n: Node, p: Node & { shadow?: ShadowRoot }): [number, Node] => {
      let i = Array.prototype.indexOf.call(p.childNodes, n);

      if (i < 0 && p.shadow) {
        p = p.shadow;
        i = Array.prototype.indexOf.call(p.childNodes, n);
      }

      return [i, p];
    };

    let [i1, n1] = getPos(this, p1);
    let [i2, n2] = getPos(b, p2);

    console.log("i1, i2, n1, n2", i1, i2, n1, n2);

    let tmp1 = document.createElement("div");
    let tmp2 = document.createElement("div");

    n1.insertBefore(tmp1, this);
    n2.insertBefore(tmp2, b);

    //HTMLElement.prototype.remove.call(this);
    //HTMLElement.prototype.remove.call(b);

    n1.replaceChild(b, tmp1);
    n2.replaceChild(this, tmp2);

    let ptmp = this.parentWidget;
    this.parentWidget = b.parentWidget;
    b.parentWidget = ptmp;

    tmp1.remove();
    tmp2.remove();

    return true;
  }

  traverse(
    type_or_set:
      | (new (...args: unknown[]) => UIBase)
      | Set<new (...args: unknown[]) => UIBase>
      | (new (...args: unknown[]) => UIBase)[]
  ): Generator<UIBase> {
    let this2: UIBase = this;

    let classes: Iterable<new (...args: unknown[]) => UIBase>;

    let is_set = type_or_set instanceof Set;
    is_set = is_set || type_or_set instanceof util.set;
    is_set = is_set || Array.isArray(type_or_set);

    if (!is_set) {
      classes = [type_or_set as new (...args: unknown[]) => UIBase];
    } else {
      classes = type_or_set as Iterable<new (...args: unknown[]) => UIBase>;
    }

    let visit = new Set<Node>();

    return (function* () {
      let stack: (Node & { shadow?: ShadowRoot })[] = [this2];

      while (stack.length > 0) {
        let n = stack.pop();

        visit.add(n);

        if (!n || !n.childNodes) {
          continue;
        }

        for (let cls of classes) {
          if (n instanceof cls) {
            yield n;
          }
        }

        for (let c of n.childNodes) {
          if (!visit.has(c)) {
            stack.push(c);
          }
        }

        if (n.shadow) {
          for (let c of n.shadow.childNodes) {
            if (!visit.has(c)) {
              stack.push(c);
            }
          }
        }
      }
    })();
  }

  appendChild<T extends Node>(child: T): T {
    if (child instanceof UIBase) {
      child.ctx = this.ctx;
      child.parentWidget = this;

      child.useDataPathUndo = this.useDataPathUndo;
    }

    return super.appendChild(child);
  }

  _clipboardHotkeyInit(): void {
    this._clipboard_over = false;
    this._last_clipboard_keyevt = undefined;

    this._clipboard_keystart = () => {
      if (this._clipboard_events) {
        return;
      }

      this._clipboard_events = true;
      window.addEventListener("keydown", this._clipboard_keydown, { capture: true, passive: false });
    };

    this._clipboard_keyend = () => {
      if (!this._clipboard_events) {
        return;
      }

      this._clipboard_events = false;
      window.removeEventListener("keydown", this._clipboard_keydown, { capture: true, passive: false });
    };

    this._clipboard_keydown = (e: KeyboardEvent, internal_mode?: boolean) => {
      if (!this.isConnected || !cconst.getClipboardData) {
        this._clipboard_keyend();
        return;
      }

      if (e === this._last_clipboard_keyevt || !this._clipboard_over) {
        return;
      }

      /* the user's mouse cursor might not be over the element
       *  if they've tabbed to it */

      let is_copy = e.keyCode === keymap["C"] && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey;
      let is_paste = e.keyCode === keymap["V"] && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey;

      if (!is_copy && !is_paste) {
        //early out, remember that pickElement is highly expensive to run
        return;
      }

      //pasteForAllChildren
      if (!internal_mode) {
        let screen = (
          this.ctx as { screen: UIBase & { mpos: number[]; pickElement(x: number, y: number): UIBase | undefined } }
        ).screen;
        let elem: UIBase | undefined = screen.pickElement(screen.mpos[0], screen.mpos[1]);

        let checkTree = is_paste && (this.constructor as typeof UIBase).define().pasteForAllChildren;
        checkTree = checkTree || (is_copy && (this.constructor as typeof UIBase).define().copyForAllChildren);

        while (
          checkTree &&
          !(TextBox && elem instanceof TextBox) &&
          elem !== this &&
          elem &&
          (elem as UIBase).parentWidget
        ) {
          console.log("  " + elem._id);

          elem = (elem as UIBase).parentWidget;
        }

        console.warn("COLOR", this._id, elem ? (elem as UIBase)._id : "none");

        if (elem !== this) {
          //remove global keyhandler
          this._clipboard_keyend();
          return;
        }
      } else {
        console.warn("COLOR", this._id);
      }

      this._last_clipboard_keyevt = e;

      if (is_copy) {
        this.clipboardCopy();
        e.preventDefault();
        e.stopPropagation();
      }

      if (is_paste) {
        this.clipboardPaste();
        e.preventDefault();
        e.stopPropagation();
      }
    };

    let start = (e: Event) => {
      this._clipboard_over = true;
      this._clipboard_keystart();
    };

    let stop = (e: Event) => {
      this._clipboard_over = false;
      this._clipboard_keyend();
    };

    this.doOnce(() => {
      this.tabIndex = 0; //enable self key events when element has focus
    });

    this.addEventListener("keydown", ((e: KeyboardEvent) => {
      return this._clipboard_keydown(e, true);
    }) as EventListener);

    this.addEventListener("pointerover", start, { capture: true, passive: true });
    this.addEventListener("pointerout", stop, { capture: true, passive: true });
    this.addEventListener("focus", stop, { capture: true, passive: true });
  }

  /** set havePickClipboard to true in define() to
   *  enable mouseover pick clipboarding */
  clipboardCopy(): void {
    throw new Error("implement me!");
  }

  clipboardPaste(): void {
    throw new Error("implement me!");
  }

  //delayed init
  init(): void {
    this._init_done = true;

    if (!this.hasAttribute("id") && this._id) {
      this.setAttribute("id", this._id);
    }
  }

  _ondestroy(): void {
    if (this.tabIndex >= 0) {
      this.regenTabOrder();
    }

    if (cconst.DEBUG.paranoidEvents) {
      for (let item of this.__cbs) {
        this.removeEventListener(item[0], item[1], item[2]);
      }

      this.__cbs = [];
    }

    if (this.ondestroy !== undefined) {
      this.ondestroy();
    }
  }

  remove(trigger_on_destroy = true): void {
    if (this.tabIndex >= 0) {
      this.regenTabOrder();
    }

    super.remove();

    if (trigger_on_destroy) {
      this._ondestroy();
    }

    if (this.on_remove) {
      this.on_remove();
    }

    this.parentWidget = undefined;
  }

  /*
   *
   * called when elements are removed.
   * you should assume the element will be reused later;
   * on_destroy is the callback for when elements are permanently destroyed
   * */
  on_remove(): void {}

  removeChild(child: UIBase, trigger_on_destroy = true): void {
    super.removeChild(child);

    if (trigger_on_destroy) {
      child._ondestroy();
    }
  }

  flushUpdate(force = false): void {
    //check init
    this._init();

    this.update();

    this._forEachChildWidget((c) => {
      if (force || !(c.packflag & PackFlags.NO_UPDATE)) {
        if (!c.ctx) {
          c.ctx = this.ctx;
        }

        c.flushUpdate(force);
      }
    });
  }

  //used by container nodes
  /**
   * Iterates over all child widgets,
   * including ones that might be inside
   * of normal DOM nodes.
   *
   * This is done by recursing into the dom
   * tree and stopping at any node that's
   * descended from ui_base.UIBase
   **/
  _forEachChildWidget(cb: (n: UIBase) => void, thisvar?: unknown): void {
    let rec = (n: Node & { shadow?: ShadowRoot }) => {
      if (n instanceof UIBase) {
        if (thisvar !== undefined) {
          cb.call(thisvar, n);
        } else {
          cb(n);
        }
      } else {
        for (let n2 of n.childNodes) {
          rec(n2 as Node & { shadow?: ShadowRoot });
        }

        if (n.shadow !== undefined) {
          for (let n2 of n.shadow.childNodes) {
            rec(n2 as Node & { shadow?: ShadowRoot });
          }
        }
      }
    };

    for (let n of this.childNodes) {
      rec(n);
    }

    if (this.shadow) {
      for (let n of this.shadow.childNodes) {
        rec(n);
      }
    }
  }

  checkInit(): boolean {
    return this._init();
  }

  _init(): boolean {
    if (this._init_done) {
      return false;
    }

    this._init_done = true;
    this.init();

    return true;
  }

  getWinWidth(): number {
    return window.innerWidth;
  }

  getWinHeight(): number {
    return window.innerHeight;
  }

  calcZ(): number {
    let p: UIBase | undefined = this;
    let n: Node | null | UIBase | undefined = this;

    while (n) {
      if ((n as HTMLElement).style && (n as HTMLElement).style["z-index"]) {
        let z = parseFloat((n as HTMLElement).style["z-index"]);
        return z;
      }

      n = (n as Node).parentNode;

      if (!n) {
        n = p = p!.parentWidget;
      }
    }

    return 0;
  }

  pickElement(
    x: number,
    y: number,
    args: {
      nodeclass?: typeof UIBase;
      excluded_classes?: (typeof UIBase)[];
      clip?: { pos: number[]; size: number[] };
      mouseEvent?: MouseEvent | PointerEvent;
    } = {},
    marginy = 0,
    nodeclass: typeof UIBase = UIBase,
    excluded_classes?: (typeof UIBase)[]
  ): UIBase | undefined {
    let clip: { pos: number[]; size: number[] } | undefined;
    let mouseEvent: MouseEvent | PointerEvent | undefined;
    let isMouseMove: boolean | undefined, isMouseDown: boolean | number | undefined;

    nodeclass = args.nodeclass || UIBase;
    excluded_classes = args.excluded_classes;
    clip = args.clip;
    mouseEvent = args.mouseEvent;

    if (mouseEvent) {
      isMouseMove =
        mouseEvent.type === "mousemove" || mouseEvent.type === "touchmove" || mouseEvent.type === "pointermove";
      isMouseDown =
        mouseEvent.buttons ||
        ((mouseEvent as TouchEvent & { touches?: TouchList }).touches &&
          (mouseEvent as TouchEvent & { touches: TouchList }).touches.length > 0);
    }

    x -= window.scrollX;
    y -= window.scrollY;

    let elem: Element | null = document.elementFromPoint(x, y);

    if (!elem) {
      return;
    }

    let path = [elem];
    let lastelem: Element | null = elem;
    let i = 0;

    while (elem && (elem as HTMLElement & { shadow?: ShadowRoot }).shadow) {
      if (i++ > 1000) {
        console.error("Infinite loop error");
        break;
      }

      elem = (elem as HTMLElement & { shadow: ShadowRoot }).shadow.elementFromPoint(x, y);

      if (elem === lastelem) {
        break;
      }

      if (elem) {
        path.push(elem);
      }

      lastelem = elem;
    }

    path.reverse();

    //console.warn(path);

    for (let i = 0; i < path.length; i++) {
      let node = path[i];
      let ok = node instanceof nodeclass;

      if (excluded_classes) {
        for (let cls of excluded_classes) {
          ok = ok && !(node instanceof cls);
        }
      }

      if (clip) {
        let rect = node.getBoundingClientRect();
        let clip2 = math.aabb_intersect_2d(clip.pos, clip.size, [rect.x, rect.y], [rect.width, rect.height]);

        ok = ok && clip2;
      }

      if (ok) {
        window.elem = node;
        //console.log(node._id);
        return node;
      }
    }
  }

  __updateDisable(val: boolean): void {
    if (!!val === !!this.__disabledState) {
      return;
    }

    this.__disabledState = !!val;

    if (val && !this._disdata) {
      let style = this.getDefault("disabled") ||
        this.getDefault("internalDisabled") || {
          "background-color": this.getDefault("DisabledBG"),
        };

      this._disdata = {
        style   : {},
        defaults: {},
      };

      for (let k in style) {
        //save old style information
        this._disdata.style[k] = this.style[k];
        this._disdata.defaults[k] = this.default_overrides[k];

        let v = style[k];

        if (typeof v === "object" && v instanceof CSSFont) {
          this.style[k] = style[k].genCSS();
        } else if (typeof v === "object") {
          continue;
        } else {
          this.style[k] = style[k];
        }
        this.default_overrides[k] = style[k];
      }

      this.__disabledState = !!val;
      this.on_disabled();
    } else if (!val && this._disdata) {
      //load old style information
      for (let k in this._disdata.style) {
        this.style[k] = this._disdata.style[k];
      }

      for (let k in this._disdata.defaults) {
        let v = this._disdata.defaults[k];

        if (v === undefined) {
          delete this.default_overrides[k];
        } else {
          this.default_overrides[k] = v;
        }
      }

      //this.background = this.style["background-color"];
      this._disdata = undefined;

      this.__disabledState = !!val;
      this.on_enabled();
    }

    this.__disabledState = !!val;

    let visit = (n) => {
      if (n instanceof UIBase) {
        let changed = !!n.__disabledState;

        /*
        if (val) {
          n._parent_disabled_set = Math.max(n._parent_disabled_set + 1, 0);
        } else {
          n._parent_disabled_set = Math.max(n._parent_disabled_set - 1, 0);
        }//*/

        n.__updateDisable(n.disabled);

        changed = changed !== !!n.__disabledState;
        if (changed) {
          n.update();
          n.setCSS();
        }
      }
    };

    this._forEachChildWidget(visit);
  }

  on_disabled(): void {}

  on_enabled(): void {}

  pushModal(
    handlers: Record<string, Function> | UIBase = this,
    autoStopPropagation = true,
    pointerId?: number,
    pointerElem: UIBase = this
  ): unknown {
    if (this._modaldata !== undefined) {
      console.warn("UIBase.prototype.pushModal called when already in modal mode");
      this.popModal();
    }

    let _areaWrangler = contextWrangler.copy();

    contextWrangler.copy(this.ctx);

    function bindFunc(func: Function): (...args: unknown[]) => unknown {
      return function (this: unknown, ...args: unknown[]) {
        _areaWrangler.copyTo(contextWrangler);

        return func.apply(handlers, args);
      };
    }

    let handlers2: Record<string, Function> = {};
    for (let k in handlers) {
      let func = (handlers as Record<string, unknown>)[k];

      if (typeof func !== "function") {
        continue;
      }

      handlers2[k] = bindFunc(func as Function);
    }

    if (pointerId !== undefined && pointerElem) {
      this._modaldata = pushPointerModal(handlers2, autoStopPropagation);
    } else {
      this._modaldata = pushModalLight(handlers2, autoStopPropagation);
    }

    return this._modaldata;
  }

  popModal(): void {
    if (this._modaldata === undefined) {
      console.warn("Invalid call to UIBase.prototype.popModal");
      return;
    }

    popModalLight(this._modaldata);
    this._modaldata = undefined;
  }

  /** child classes can override this to prevent focus on flash*/
  _flash_focus(): void {
    this.focus();
  }

  flash(color: string | number[], rect_element: UIBase | HTMLElement = this, timems = 355, autoFocus = true): void {
    if (typeof color != "object") {
      color = css2color(color);
    }
    color = new Vector4(color);
    let csscolor = color2css(color);

    if (this._flashtimer !== undefined && this._flashcolor !== csscolor) {
      window.setTimeout(() => {
        this.flash(color, rect_element, timems, autoFocus);
      }, 100);

      return;
    } else if (this._flashtimer !== undefined) {
      return;
    }

    //let rect = rect_element.getClientRects()[0];
    let rect = rect_element.getBoundingClientRect();

    if (rect === undefined) {
      return;
    }

    //okay, dom apparently calls onchange() on .remove, so we have
    //to put the timer code first to avoid loops
    let timer;
    let tick = 0;
    let max = ~~(timems / 20);

    let x = rect.x,
      y = rect.y;

    let cb = () => {
      if (timer === undefined) {
        return;
      }

      let a = 1.0 - tick / max;
      div.style["background-color"] = color2css(color, a * a * 0.5);

      if (tick > max) {
        window.clearInterval(timer);

        this._flashtimer = undefined;
        this._flashcolor = undefined;
        timer = undefined;

        div.remove();

        if (autoFocus) {
          this._flash_focus();
        }
      }

      tick++;
    };

    window.setTimeout(cb, 5);
    this._flashtimer = timer = window.setInterval(cb, 20);

    let div = document.createElement("div");

    div.style["pointer-events"] = "none";
    div.tabIndex = -1;
    div.style["z-index"] = "900";
    div.style["display"] = "float";
    div.style["position"] = UIBase.PositionKey;
    div.style["margin"] = "0px";
    div.style["left"] = x + "px";
    div.style["top"] = y + "px";

    div.style["background-color"] = color2css(color, 0.5);
    div.style["width"] = rect.width + "px";
    div.style["height"] = rect.height + "px";
    div.setAttribute("class", "UIBaseFlash");

    let screen = this.getScreen() as (UIBase & { _enterPopupSafe(): void; _exitPopupSafe(): void }) | undefined;
    if (screen !== undefined) {
      screen._enterPopupSafe();
    }

    document.body.appendChild(div);
    if (autoFocus) {
      this._flash_focus();
    }

    this._flashcolor = csscolor;

    if (screen !== undefined) {
      screen._exitPopupSafe();
    }
  }

  destroy(): void {}

  on_resize(newsize: number[]): void {}

  toJSON(): Record<string, unknown> {
    let ret: Record<string, unknown> = {};

    if (this.hasAttribute("datapath")) {
      ret.datapath = this.getAttribute("datapath");
    }

    return ret;
  }

  loadJSON(obj: Record<string, unknown>): void {
    if (!this._init_done) {
      this._init();
    }
  }

  getPathValue(ctx: { api: Record<string, Function> }, path: string): unknown {
    try {
      return ctx.api.getValue(ctx, path);
    } catch (error) {
      //report("data path error in ui for" + path);
      return undefined;
    }
  }

  undoBreakPoint(): void {
    this.pathUndoGen++;
  }

  setPathValueUndo(
    ctx: { api: Record<string, Function>; toolstack: Record<string, Function | unknown> },
    path: string,
    val: unknown
  ): void {
    this.pathSocketUpdate(ctx, path);

    let mass_set_path = this.getAttribute("mass_set_path");
    let rdef = ctx.api.resolvePath(ctx, path) as Record<string, unknown>;
    let prop = rdef.prop as Record<string, unknown>;

    if (ctx.api.getValue(ctx, path) === val) {
      return;
    }

    let toolstack = (this.ctx as Record<string, unknown>).toolstack as Record<string, Function | unknown>;
    let head = toolstack.head as Record<string, Function> | undefined;

    let bad = head === undefined || !(head instanceof (getDataPathToolOp() as Function));
    bad = bad || head!.hashThis() !== head!.hash(mass_set_path, path, prop.type, this._id);
    bad = bad || this.pathUndoGen !== this._lastPathUndoGen;

    //if (head !== undefined && head instanceof getDataPathToolOp()) {
    //console.log("===>", bad, head.hashThis());
    //console.log("    ->", head.hash(mass_set_path, path, prop.type, this._id));
    //}

    if (!bad) {
      (toolstack.undo as Function)();
      head!.setValue(ctx, val, rdef.obj);
      (toolstack.redo as Function)();
    } else {
      this._lastPathUndoGen = this.pathUndoGen;

      let toolop = (getDataPathToolOp() as Record<string, Function>).create(ctx, path, val, this._id, mass_set_path);

      /* getDataPathToolOp.create can return false in case of no-op paths. */
      if (!toolop) {
        return;
      }

      (ctx.toolstack as Record<string, Function>).execTool(this.ctx, toolop);
      head = toolstack.head as Record<string, Function> | undefined;
    }

    if (!head || (head as Record<string, unknown>).hadError === true) {
      throw new Error("toolpath error");
    }
  }

  loadNumConstraints(
    prop: Record<string, unknown> | undefined = undefined,
    dom: HTMLElement & { hasAttribute: HTMLElement["hasAttribute"]; getAttribute: HTMLElement["getAttribute"] } = this,
    onModifiedCallback?: (this: UIBase) => void
  ): void {
    let modified = false;

    if (!prop) {
      let path;

      if (dom.hasAttribute("datapath")) {
        path = dom.getAttribute("datapath");
      }

      if (path === undefined && this.hasAttribute("datapath")) {
        path = this.getAttribute("datapath");
      }

      if (typeof path === "string") {
        prop = this.getPathMeta(this.ctx, path);
      }
    }

    let loadAttr = (propkey: string, domkey: string, thiskey: string) => {
      let old = (this as Record<string, unknown>)[thiskey];

      if (dom.hasAttribute(domkey)) {
        (this as Record<string, unknown>)[thiskey] = parseFloat(dom.getAttribute(domkey)!);
      } else if (prop) {
        (this as Record<string, unknown>)[thiskey] = prop[propkey];
      }

      if ((this as Record<string, unknown>)[thiskey] !== old) {
        modified = true;
      }
    };

    for (let key of NumberConstraints) {
      let thiskey = key,
        domkey = key;

      if (key === "range") {
        //handled later
        continue;
      }

      loadAttr(key, domkey, thiskey);
    }

    let oldmin = this.range[0];
    let oldmax = this.range[1];

    let range = prop ? prop.range : undefined;
    if (range && !dom.hasAttribute("min")) {
      this.range[0] = range[0];
    } else if (dom.hasAttribute("min")) {
      this.range[0] = parseFloat(dom.getAttribute("min"));
    }

    if (range && !dom.hasAttribute("max")) {
      this.range[1] = range[1];
    } else if (dom.hasAttribute("max")) {
      this.range[1] = parseFloat(dom.getAttribute("max"));
    }

    if (this.range[0] !== oldmin || this.range[1] !== oldmax) {
      modified = true;
    }

    let oldint = this.isInt;

    if (dom.getAttribute("integer")) {
      let val = dom.getAttribute("integer");
      val = ("" + val).toLowerCase();

      //handles anonymouse <numslider-x integer> case
      this.isInt = val === "null" || val === "true" || val === "yes" || val === "1";
    } else if (prop && prop instanceof IntProperty) {
      this.isInt = true;
    }

    if (!this.isInt !== !oldint) {
      modified = true;
    }

    let oldedit = this.editAsBaseUnit;

    if (this.editAsBaseUnit === undefined) {
      if (prop && prop.flag & PropFlags.EDIT_AS_BASE_UNIT) {
        this.editAsBaseUnit = true;
      } else {
        this.editAsBaseUnit = false;
      }
    }

    if (!this.editAsBaseUnit !== !oldedit) {
      modified = true;
    }

    if (modified) {
      this.setCSS();

      if (onModifiedCallback) {
        onModifiedCallback.call(this);
      }
    }
  }

  /*
    adds a method call to the event queue,
    but only if that method (for this instance, as differentiated
    by ._id) isn't there already.

    also, method won't be ran until this.ctx exists
  */

  pushReportContext(key: string): void {
    let api = (this.ctx as { api: Record<string, Function> }).api;
    if (api.pushReportContext) {
      api.pushReportContext(key);
    }
  }

  popReportContext(): void {
    let api = (this.ctx as { api: Record<string, Function> }).api;
    if (api.popReportContext) api.popReportContext();
  }

  pathSocketUpdate(ctx: unknown, path: string): this {
    this.flagPropSocketUpdate("value");
    return this;
  }

  setPathValue(
    ctx: { api: Record<string, Function>; toolstack?: Record<string, Function> },
    path: string,
    val: unknown
  ): void {
    this.pathSocketUpdate(ctx, path);

    if (this.useDataPathUndo) {
      this.pushReportContext(this._reportCtxName);

      try {
        this.setPathValueUndo(ctx, path, val);
      } catch (error) {
        this.popReportContext();

        if (!(error instanceof DataPathError)) {
          throw error;
        } else {
          return;
        }
      }

      this.popReportContext();
      return;
    }

    this.pushReportContext(this._reportCtxName);

    try {
      if (this.hasAttribute("mass_set_path")) {
        ctx.api.massSetProp(ctx, this.getAttribute("mass_set_path"), val);
        ctx.api.setValue(ctx, path, val);
      } else {
        ctx.api.setValue(ctx, path, val);
      }
    } catch (error) {
      this.popReportContext();

      if (!(error instanceof DataPathError)) {
        throw error;
      }

      return;
    }

    this.popReportContext();
  }

  getPathMeta(ctx: { api: Record<string, Function> }, path: string): unknown {
    this.pushReportContext(this._reportCtxName);
    let ret = ctx.api.resolvePath(ctx, path);
    this.popReportContext();

    return ret !== undefined ? ret.prop : undefined;
  }

  getPathDescription(ctx: { api: Record<string, Function> }, path: string): string | undefined {
    let ret;
    this.pushReportContext(this._reportCtxName);

    try {
      ret = ctx.api.getDescription(ctx, path);
    } catch (error) {
      this.popReportContext();

      if (error instanceof DataPathError) {
        //console.warn("Invalid data path '" + path + "'");
        return undefined;
      } else {
        throw error;
      }
    }

    this.popReportContext();
    return ret;
  }

  getScreen(): UIBase | undefined {
    if (this.ctx !== undefined) return (this.ctx as { screen: UIBase }).screen;
  }

  isDead(): boolean {
    return !this.isConnected;
    let p = this,
      lastp = this;

    function find(c, n) {
      for (let n2 of c) {
        if (n2 === n) {
          return true;
        }
      }
    }

    while (p) {
      lastp = p;

      let parent = p.parentWidget;
      if (!parent) {
        parent = p.parentElement ? p.parentElement : p.parentNode;
      }

      if (parent && p && !find(parent.childNodes, p)) {
        if (parent.shadow !== undefined && !find(parent.shadow.childNodes)) {
          return true;
        }
      }
      p = parent;

      if (p === document.body) {
        return false;
      }
    }

    return true;
  }

  doOnce(
    func: Function & { _doOnce?: (thisvar: UIBase, trace: string) => void; _doOnce_reqs?: Set<string> },
    timeout?: number
  ): void {
    if (func._doOnce === undefined) {
      func._doOnce_reqs = new Set();

      func._doOnce = function (thisvar, trace) {
        if (func._doOnce_reqs.has(thisvar._id)) {
          return;
        }

        func._doOnce_reqs.add(thisvar._id);

        function f() {
          if (thisvar.isDead()) {
            func._doOnce_reqs.delete(thisvar._id);

            if (func === thisvar._init || !cconst.DEBUG.doOnce) {
              return;
            }

            console.warn("Ignoring doOnce call for dead element", thisvar._id, func, trace);
            return;
          }

          if (!thisvar.ctx) {
            if (cconst.DEBUG.doOnce) {
              console.warn("doOnce call is waiting for context...", thisvar._id, func);
            }

            internalSetTimeout(f, 0);
            return;
          }

          func._doOnce_reqs.delete(thisvar._id);
          func.call(thisvar);
        }

        internalSetTimeout(f, timeout);
      };
    }

    let trace = new Error().stack;
    func._doOnce(this, trace);
  }

  float(x = 0, y = 0, zindex?: number | string, positionKey = UIBase.PositionKey): this {
    this.style.position = positionKey;

    this.style.left = x + "px";
    this.style.top = y + "px";

    if (zindex !== undefined) {
      this.style["z-index"] = zindex;
    }

    return this;
  }

  _ensureChildrenCtx(): void {
    let ctx = this.ctx;
    if (ctx === undefined) {
      return;
    }

    this._forEachChildWidget((n) => {
      n.parentWidget = this;

      if (n.ctx === undefined) {
        n.ctx = ctx;
      }

      n._ensureChildrenCtx(ctx);
    });
  }

  checkThemeUpdate(): boolean {
    if (!cconst.enableThemeAutoUpdate) {
      return false;
    }

    if (_themeUpdateKey !== this._last_theme_update_key) {
      this._last_theme_update_key = _themeUpdateKey;
      return true;
    }

    return false;
  }

  abortToolTips(delayMs = 500): this {
    if (this._has_own_tooltips) {
      this._has_own_tooltips.stop_timer();
    }

    if (this._tooltip_ref) {
      this._tooltip_ref.remove();
      this._tooltip_ref = undefined;
    }

    this._tool_tip_abort_delay = util.time_ms() + delayMs;

    return this;
  }

  updateToolTipHandlers(): void {
    if (!this._useNativeToolTips_set && !cconst.useNativeToolTips !== !this._useNativeToolTips) {
      this._useNativeToolTips = cconst.useNativeToolTips;
    }

    if (!!this.useNativeToolTips === !this._has_own_tooltips) {
      return;
    }

    if (!this.useNativeToolTips) {
      let state = (this._has_own_tooltips = {
        start_timer: (e) => {
          this._tooltip_timer = util.time_ms();
          //console.warn(this._id, "tooltip timer start", e.type);
        },
        stop_timer: (e) => {
          //console.warn(this._id, "tooltip timer end", util.time_ms()-this._tooltip_timer, e.type);
          this._tooltip_timer = undefined;
        },
        reset_timer: (e) => {
          //console.warn(this._id, "tooltip timer reset", util.time_ms()-this._tooltip_timer, e.type);
          if (this._tooltip_timer !== undefined) {
            this._tooltip_timer = util.time_ms();
          }
        },
        start_events: ["mouseover"],
        reset_events: ["mousemove", "mousedown", "mouseup", "touchstart", "touchend", "keydown", "focus"],
        stop_events : ["mouseleave", "blur", "mouseout"],
        handlers    : {},
      });

      let bind_handler = (type: string, etype: string): EventListener => {
        let handler = (e: Event) => {
          if (this._tool_tip_abort_delay !== undefined && util.time_ms() < this._tool_tip_abort_delay) {
            this._tooltip_timer = undefined;
            return;
          }

          state[type](e);
        };

        if (etype in state.handlers) {
          console.error(type, "is in handlers already");
          return;
        }

        state.handlers[etype] = handler;
        return handler;
      };

      let i = 0;
      let lists = [state.start_events, state.stop_events, state.reset_events];

      for (let type of ["start_timer", "stop_timer", "reset_timer"]) {
        for (let etype of lists[i]) {
          this.addEventListener(etype, bind_handler(type, etype), { passive: true });
        }

        i++;
      }
    } else {
      console.warn(this.id, "removing tooltip handlers");
      let state = this._has_own_tooltips;

      for (let k in state!.handlers) {
        let handler = state!.handlers[k];
        this.removeEventListener(k, handler);
      }

      this._has_own_tooltips = undefined;
      this._tooltip_timer = undefined;
    }
  }

  updateToolTips(): void {
    if (
      this._description_final === undefined ||
      this._description_final === null ||
      this._description_final.trim().length === 0
    ) {
      return;
    }

    if (!this.ctx || !this.ctx.screen) {
      return;
    }

    this.updateToolTipHandlers();

    if (this.useNativeToolTips || this._tooltip_timer === undefined) {
      return;
    }

    if (this._tool_tip_abort_delay !== undefined && util.time_ms() < this._tool_tip_abort_delay) {
      return;
    }

    this._tool_tip_abort_delay = undefined;

    let screen = (
      this.ctx as { screen: UIBase & { mpos: number[]; pickElement(x: number, y: number): UIBase | undefined } }
    ).screen;

    const timelimit = 500;
    let ok = util.time_ms() - this._tooltip_timer! > timelimit;

    let x = screen.mpos[0],
      y = screen.mpos[1];

    let rects = this.getClientRects();
    let r: DOMRect | undefined = rects ? rects[0] : undefined;

    if (!r) {
      ok = false;
    } else {
      ok = ok && x >= r.x && x < r.x + r.width;
      ok = ok && y >= r.y && y < r.y + r.height;
    }

    //console.log(r);
    if (r) {
      //console.warn(this._id, "possible tooltip", x, y, r.x-3, r.y-3, r.width, r.height);
    }

    ok = ok && !haveModal();
    ok = ok && screen.pickElement(x, y) === this;
    ok = ok && !!this._description_final;

    if (ok) {
      //console.warn("Showing tooltop", this.id);
      let _ToolTip = (window as unknown as Record<string, unknown>)._ToolTip as {
        show(text: string, screen: UIBase, x: number, y: number): { remove(): void };
      };
      this._tooltip_ref = _ToolTip.show(this._description_final!, (this.ctx as { screen: UIBase }).screen, x, y);
    } else {
      if (this._tooltip_ref) {
        this._tooltip_ref.remove();
      }

      this._tooltip_ref = undefined;
    }

    //console.warn(this._id, "tooltip timer end");
    if (util.time_ms() - this._tooltip_timer > timelimit) {
      this._tooltip_timer = undefined;
    }
  }

  updateEventGraph(): void {
    if (!this.isConnected) {
      this.#reflagGraph = true;
    } else if (this.#reflagGraph) {
      this.#reflagGraph = false;

      for (let [k, sock] of Object.entries(this.graphNode.inputs)) {
        sock.flagUpdate();
      }
    }
  }

  //called regularly
  update(): void {
    this.updateToolTips();
    this.updateEventGraph();

    if (this.ctx && this._description === undefined && this.getAttribute("datapath")) {
      let d = this.getPathDescription(this.ctx, this.getAttribute("datapath"));

      this.description = d;
    }

    if (!this._init_done) {
      this._init();
    }

    if (this._init_done && !(this.constructor as typeof UIBase).define().subclassChecksTheme) {
      if (this.checkThemeUpdate()) {
        console.log("theme update!");

        this.setCSS();
      }
    }
  }

  onadd(): void {
    //if (this.parentWidget !== undefined) {
    //  this._useDataPathUndo = this.parentWidget._useDataPathUndo;
    //}

    if (!this._init_done) {
      this.doOnce(this._init);
    }

    if (this.tabIndex >= 0) {
      this.regenTabOrder();
    }
  }

  getZoom(): number {
    if (this.parentWidget !== undefined) {
      return this.parentWidget.getZoom();
    }

    return 1.0;
  }

  /**try to use this method

   scaling ratio (e.g. for high-resolution displays)
   for zoom ratio use getZoom()
   */
  getDPI(): number {
    if (this.parentWidget !== undefined) {
      return this.parentWidget.getDPI();
    }

    return UIBase.getDPI();
  }

  /**
   * for saving ui state.
   * see saveUIData() export
   *
   * should fail gracefully.
   */
  saveData(): Record<string, unknown> {
    return {};
  }

  /**
   * for saving ui state.
   * see saveUIData() export
   *
   * should fail gracefully.
   *
   * also, it doesn't rebuild the object graph,
   * it patches it; for true serialization use
   * the toJSON/loadJSON or STRUCT interfaces.
   */
  loadData(obj: Record<string, unknown>): this {
    return this;
  }

  overrideDefault(key: string, val: unknown, localOnly = false): this {
    this.my_default_overrides[key] = val;

    if (!localOnly) {
      this.default_overrides[key] = val;
    }

    return this;
  }

  overrideClass(style: string): void {
    this._override_class = style;
  }

  overrideClassDefault(style: string, key: string, val: unknown): void {
    if (!(style in this.class_default_overrides)) {
      this.class_default_overrides[style] = {};
    }

    this.class_default_overrides[style][key] = val;
  }

  _doMobileDefault(key: string, val: unknown, obj?: Record<string, unknown>): unknown {
    if (!util.isMobile()) return val;

    const mobilekey = key + "_mobile";
    if (obj && mobilekey in obj) {
      return obj[mobilekey];
    }

    key = key.toLowerCase();
    let ok = false;

    for (let re of _mobile_theme_patterns) {
      if (key.search(re) >= 0) {
        ok = true;
        break;
      }
    }

    if (ok && (theme.base as Record<string, unknown>).mobileSizeMultiplier) {
      val = (val as number) * ((theme.base as Record<string, unknown>).mobileSizeMultiplier as number);
    }

    return val;
  }

  hasDefault(key: string): boolean {
    let p: UIBase | undefined = this;

    while (p) {
      if (key in p.default_overrides) {
        return true;
      }

      p = p.parentWidget;
    }

    return this.hasClassDefault(key);
  }

  hasSubDefault(key: string, subkey: string): boolean {
    return (
      this._hasSubDefault(key, subkey, theme) ||
      !!(this._themeOverride && this._hasSubDefault(key, subkey, this._themeOverride))
    );
  }

  _hasSubDefault(key: string, subkey: string, _themeDef?: Record<string, unknown>): boolean {
    let style = this.getStyleClass();

    let obj = this.getDefault(key);

    if (!obj || typeof obj !== "object") {
      return false;
    }

    return subkey in obj;
  }

  hasClassSubDefault(key: string, subkey: string, inherit = true): boolean {
    return (
      this._hasClassSubDefault(key, subkey, inherit, undefined, theme) ||
      !!(this._themeOverride && this._hasClassSubDefault(key, subkey, inherit, undefined, this._themeOverride))
    );
  }

  _hasClassSubDefault(
    key: string,
    subkey: string,
    inherit = true,
    style: string = this.getStyleClass(),
    themeDef?: Record<string, unknown>
  ): boolean {
    if (!themeDef) return false;
    let th = themeDef[style] as Record<string, unknown> | undefined;

    if (inherit) {
      if (this._hasClassSubDefault(key, subkey, false, style, themeDef)) {
        return true;
      }

      let ret = false;
      let def = (this.constructor as typeof UIBase).define();

      if (def.parentStyle) {
        ret = ret || this._hasClassSubDefault(key, subkey, false, def.parentStyle, themeDef);
      }
      ret = ret || this._hasClassSubDefault(key, subkey, false, "base", themeDef);
      return ret;
    }

    if (!th) {
      return false;
    }

    let obj = th[key];
    if (!obj || typeof obj !== "object") {
      return false;
    }

    return subkey in obj;
  }

  /** get a sub style from a theme style class.
   *  note that if key is falsy then it just forwards to this.getDefault directly*/
  getSubDefault(
    key: string,
    subkey: string,
    backupkey: string = subkey,
    defaultval?: unknown,
    inherit = true
  ): unknown {
    /* Check if client code manually overrode a theme key for this instance. */
    if (subkey && subkey in this.my_default_overrides) {
      //return this.getDefault(subkey, undefined, defaultval);
    }

    if (!key) {
      return this.getDefault(subkey, undefined, defaultval, inherit);
    }

    let style = this.getDefault(key, undefined, undefined, inherit);

    if (!style || typeof style !== "object" || !(subkey in (style as Record<string, unknown>))) {
      if (defaultval !== undefined) {
        return defaultval;
      } else if (backupkey) {
        return this.getDefault(backupkey, undefined, undefined, inherit);
      }
    } else {
      return (style as Record<string, unknown>)[subkey];
    }
  }

  getDefault(key: string, checkForMobile?: boolean, defaultval?: unknown, inherit?: boolean): unknown {
    let ret = this.getDefault_intern(key, checkForMobile, defaultval, inherit);

    //convert pixel units straight to numbers
    if (typeof ret === "string" && ret.trim().toLowerCase().endsWith("px")) {
      let s = ret.trim().toLowerCase();
      s = s.slice(0, s.length - 2).trim();

      let f = parseFloat(s);
      if (!isNaN(f) && isFinite(f)) {
        return f;
      }
    }

    return ret;
  }

  getDefault_intern(key: string, checkForMobile = true, defaultval?: unknown, inherit = true): unknown {
    if (this.my_default_overrides[key] !== undefined) {
      let v = this.my_default_overrides[key];
      return checkForMobile ? this._doMobileDefault(key, v, this.my_default_overrides) : v;
    }

    let p: UIBase | undefined = this;
    while (p) {
      if (p.default_overrides[key] !== undefined) {
        let v = p.default_overrides[key];
        return checkForMobile ? this._doMobileDefault(key, v, p.default_overrides) : v;
      }

      p = p.parentWidget;
    }

    return this.getClassDefault(key, checkForMobile, defaultval, inherit);
  }

  getStyleClass(): string {
    if (this._override_class !== undefined) {
      return this._override_class;
    }

    let p: Function = this.constructor;
    let lastp: Function | undefined = undefined;

    while (p && p !== lastp && p !== UIBase && p !== Object) {
      let def = (p as typeof UIBase).define();

      if (def?.style) {
        return def.style;
      }

      if (!p.prototype || !Object.getPrototypeOf(p.prototype)) break;

      p = Object.getPrototypeOf(p.prototype).constructor;
    }

    return "base";
  }

  hasClassDefault(key: string): boolean {
    let style = this.getStyleClass();

    let p: UIBase | undefined = this;
    while (p) {
      let def = p.class_default_overrides[style];

      if (def && key in def) {
        return true;
      }

      p = p.parentWidget;
    }

    let th = this._themeOverride;

    if (th && style in th && key in (th[style] as Record<string, unknown>)) {
      return true;
    }

    if (style in theme && key in theme[style]) {
      return true;
    }

    return key in (theme.base as Record<string, unknown>);
  }

  getClassDefault(key: string, checkForMobile = true, defaultval?: unknown, inherit = true): unknown {
    let style = this.getStyleClass();

    if (style === "none") {
      return undefined;
    }

    let themeobj: Record<string, unknown> | undefined;
    let val: unknown;
    let p: UIBase | undefined = this;

    while (p) {
      let def = p.class_default_overrides[style];

      if (def && key in def) {
        themeobj = def;
        val = def[key];
        break;
      }

      p = p.parentWidget;
    }

    if (
      val === undefined &&
      style in theme &&
      !(key in (theme[style] as Record<string, unknown>)) &&
      !(key in (theme.base as Record<string, unknown>))
    ) {
      if (window.DEBUG && (window.DEBUG as Record<string, boolean>).theme) {
        report("Missing theme key ", key, "for", style);
      }
    }

    for (let i = 0; i < 2; i++) {
      let th: Record<string, unknown> = !i ? (this._themeOverride as Record<string, unknown>) : theme;

      if (!th) {
        continue;
      }

      let thStyle = th[style] as Record<string, unknown> | undefined;
      let thBase = th.base as Record<string, unknown> | undefined;

      if (val === undefined && thStyle && key in thStyle) {
        themeobj = thStyle;
        val = thStyle[key];
      } else if (defaultval !== undefined) {
        themeobj = undefined;
        val = defaultval;
      } else if (val === undefined && inherit) {
        let def = (this.constructor as typeof UIBase).define();

        let thParent = def.parentStyle ? (th[def.parentStyle] as Record<string, unknown> | undefined) : undefined;
        if (thParent && key in thParent) {
          val = thParent[key];
          themeobj = thParent;
        } else if (thBase) {
          val = thBase[key];
          themeobj = thBase;
        }
      }
    }

    return checkForMobile ? this._doMobileDefault(key, val, themeobj) : val;
  }

  overrideTheme(themeOverride: Record<string, Record<string, unknown>>): this {
    this._themeOverride = themeOverride;

    this._forEachChildWidget((child: UIBase) => {
      child.overrideTheme(themeOverride);
    });

    if (this.ctx) {
      this.flushSetCSS();
      this.flushUpdate();
    }

    return this;
  }

  getStyle(): string {
    console.warn("deprecated call to UIBase.getStyle");
    return this.getStyleClass();
  }

  /** returns a new Animator instance
   *
   * example:
   *
   * container.animate().goto("style.width", 500, 100, "ease");
   * */
  animate(
    _extra_handlers: Record<string, Function> | Keyframe[] | PropertyIndexedKeyframes | null = {},
    domAnimateOptions?: KeyframeAnimationOptions | number
  ): Animator | Animation {
    /* User is providing DOM animation data. */
    if (Array.isArray(_extra_handlers) || _extra_handlers === null) {
      return super.animate(_extra_handlers as Keyframe[], domAnimateOptions);
    }

    let transform = new DOMMatrix(this.style["transform"]);

    let update_trans = () => {
      let t = transform;
      let css = "matrix(" + t.a + "," + t.b + "," + t.c + "," + t.d + "," + t.e + "," + t.f + ")";
      this.style["transform"] = css;
    };

    let handlers: Record<string, Function> = {
      background_get(this: UIBase) {
        return css2color(this.background);
      },

      background_set(this: UIBase, c: string | number[]) {
        if (typeof c !== "string") {
          c = color2css(c);
        }
        this.background = c;
      },

      dx_get() {
        return transform.m41;
      },
      dx_set(x) {
        transform.m41 = x;
        update_trans();
      },

      dy_get() {
        return transform.m42;
      },
      dy_set(x) {
        transform.m42 = x;
        update_trans();
      },
    };

    let pixkeys = [
      "width",
      "height",
      "left",
      "top",
      "right",
      "bottom",
      "border-radius",
      "border-width",
      "margin",
      "padding",
      "margin-left",
      "margin-right",
      "margin-top",
      "margin-bottom",
      "padding-left",
      "padding-right",
      "padding-bottom",
      "padding-top",
    ];
    handlers = Object.assign(handlers, _extra_handlers);

    let makePixHandler = (k, k2) => {
      handlers[k2 + "_get"] = () => {
        let s = this.style[k];

        if (s.endsWith("px")) {
          return parsepx(s);
        } else {
          return 0.0;
        }
      };

      handlers[k2 + "_set"] = (val) => {
        this.style[k] = val + "px";
      };
    };

    for (let k of pixkeys) {
      if (!(k in handlers)) {
        makePixHandler(k, `style.${k}`);
        makePixHandler(k, `style["${k}"]`);
        makePixHandler(k, `style['${k}']`);
      }
    }

    let handler: ProxyHandler<UIBase> = {
      get: (target: UIBase, key: string, receiver: unknown) => {
        console.log(key, handlers[key + "_get"], handlers);

        if (key + "_get" in handlers) {
          return handlers[key + "_get"].call(target);
        } else {
          return (target as Record<string, unknown>)[key];
        }
      },
      set: (target: UIBase, key: string, val: unknown, receiver: unknown) => {
        console.log(key);

        if (key + "_set" in handlers) {
          handlers[key + "_set"].call(target, val);
        } else {
          (target as Record<string, unknown>)[key] = val;
        }

        return true;
      },
    };

    let proxy = new Proxy(this, handler);
    let anim = new Animator(proxy);

    anim.onend = () => {
      this._active_animations.remove(anim);
    };

    this._active_animations.push(anim);
    return anim;
  }

  abortAnimations(): void {
    for (let anim of util.list(this._active_animations)) {
      anim.end();
    }

    this._active_animations = [];
  }
}

export function drawRoundBox2(
  elem: UIBase,
  options: {
    canvas?: HTMLCanvasElement;
    g?: CanvasRenderingContext2D;
    width?: number;
    height?: number;
    r?: number;
    op?: string;
    color?: string;
    margin?: number;
    no_clear?: boolean;
  } = {}
): void {
  drawRoundBox(
    elem,
    options.canvas,
    options.g,
    options.width,
    options.height,
    options.r,
    options.op,
    options.color,
    options.margin,
    options.no_clear
  );
}

/**okay, I need to refactor this function,
 it needs to take x, y as well as width, height,
 and be usable for more use cases.*/
export function drawRoundBox(
  elem: UIBase,
  canvas?: HTMLCanvasElement,
  g?: CanvasRenderingContext2D,
  width?: number,
  height?: number,
  r?: number,
  op = "fill",
  color?: string,
  margin?: number,
  no_clear = false
): void {
  width = width === undefined ? canvas!.width : width;
  height = height === undefined ? canvas!.height : height;
  let ctx2d = g!;
  ctx2d.save();

  let dpi = elem.getDPI();

  let r2val: number = r === undefined ? (elem.getDefault("border-radius") as number) : r;

  if (margin === undefined) {
    margin = 1;
  }

  r2val *= dpi;
  let r1 = r2val,
    r2 = r2val;

  if (r2val > (height - margin * 2) * 0.5) {
    r1 = (height - margin * 2) * 0.5;
  }

  if (r2val > (width - margin * 2) * 0.5) {
    r2 = (width - margin * 2) * 0.5;
  }

  let bg: string | undefined = color;

  if (bg === undefined && (canvas as HTMLCanvasElement & { _background?: string })!._background !== undefined) {
    bg = (canvas as HTMLCanvasElement & { _background: string })!._background;
  } else if (bg === undefined) {
    bg = elem.getDefault("background-color") as string;
  }

  if (op === "fill" && !no_clear) {
    ctx2d.clearRect(0, 0, width, height);
  }

  ctx2d.fillStyle = bg;
  //hackish!
  ctx2d.strokeStyle = color === undefined ? (elem.getDefault("border-color") as string) : color;

  let w = width,
    h = height;

  let th = Math.PI / 4;
  let th2 = Math.PI * 0.75;

  ctx2d.beginPath();

  ctx2d.moveTo(margin, margin + r1);
  ctx2d.lineTo(margin, h - r1 - margin);

  ctx2d.quadraticCurveTo(margin, h - margin, margin + r2, h - margin);
  ctx2d.lineTo(w - margin - r2, h - margin);

  ctx2d.quadraticCurveTo(w - margin, h - margin, w - margin, h - margin - r1);
  ctx2d.lineTo(w - margin, margin + r1);

  ctx2d.quadraticCurveTo(w - margin, margin, w - margin - r2, margin);
  ctx2d.lineTo(margin + r2, margin);

  ctx2d.quadraticCurveTo(margin, margin, margin, margin + r1);
  ctx2d.closePath();

  if (op === "clip") {
    ctx2d.clip();
  } else if (op === "fill") {
    ctx2d.fill();
  } else {
    ctx2d.stroke();
  }

  ctx2d.restore();
}

export function _getFont_new(elem: UIBase, size?: number, font: string = "DefaultText", do_dpi = true): string {
  let fontObj = elem.getDefault(font) as CSSFont;

  return fontObj.genCSS(size);
}

export function getFont(elem: UIBase, size?: number, font = "DefaultText", do_dpi = true): string {
  return _getFont_new(elem, size, font, do_dpi);
}

//size is optional, defaults to font's default size
export function _getFont(elem: UIBase, size?: number, font = "DefaultText", do_dpi = true): string {
  let dpi = elem.getDPI();

  let font2 = elem.getDefault(font);
  if (font2 !== undefined) {
    //console.warn("New style font detected", font2, font2.genCSS(size));
    return _getFont_new(elem, size, font, do_dpi);
  }

  throw new Error("unknown font " + font);
}

export function _ensureFont(
  elem: UIBase,
  canvas: HTMLCanvasElement & { font?: string },
  g: CanvasRenderingContext2D,
  size?: number
): void {
  if (canvas.font) {
    g.font = canvas.font;
  } else {
    let font = elem.getDefault("DefaultText");
    g.font = font.genCSS(size);
  }
}

let _mc: (HTMLCanvasElement & { g: CanvasRenderingContext2D }) | undefined;

function get_measure_canvas(): HTMLCanvasElement & { g: CanvasRenderingContext2D } {
  if (_mc !== undefined) {
    return _mc;
  }

  let canvas = document.createElement("canvas") as HTMLCanvasElement & { g: CanvasRenderingContext2D };
  canvas.width = 256;
  canvas.height = 256;
  canvas.g = canvas.getContext("2d")!;
  _mc = canvas;

  return _mc;
}

export function measureTextBlock(
  elem: UIBase,
  text: string,
  canvas?: HTMLCanvasElement & { font?: string; g?: CanvasRenderingContext2D },
  g?: CanvasRenderingContext2D,
  size?: number,
  font?: CSSFont | string
): { width: number; height: number } {
  let lines = text.split("\n");

  let ret = {
    width : 0,
    height: 0,
  };

  if (size === undefined) {
    if (font !== undefined && typeof font === "object" && font instanceof CSSFont) {
      size = font.size;
    }

    if (size === undefined) {
      size = (elem.getDefault("DefaultText") as CSSFont).size;
    }
  }

  for (let line of lines) {
    let m = measureText(elem, line, canvas, g, size, font);

    ret.width = Math.max(ret.width, m.width);
    let h = m.height !== undefined ? m.height : size * 1.25;

    ret.height += h;
  }

  return ret;
}

export function measureText(
  elem: UIBase,
  text: string,
  canvas?:
    | (HTMLCanvasElement & { font?: string; g?: CanvasRenderingContext2D })
    | { canvas?: HTMLCanvasElement; g?: CanvasRenderingContext2D; size?: number; font?: CSSFont | string },
  g?: CanvasRenderingContext2D,
  size?: number,
  font?: CSSFont | string
): TextMetrics {
  if (
    typeof canvas === "object" &&
    canvas !== null &&
    !(canvas instanceof HTMLCanvasElement) &&
    (canvas as HTMLElement).tagName !== "CANVAS"
  ) {
    let args = canvas as {
      canvas?: HTMLCanvasElement;
      g?: CanvasRenderingContext2D;
      size?: number;
      font?: CSSFont | string;
    };

    canvas = args.canvas as HTMLCanvasElement & { font?: string; g?: CanvasRenderingContext2D };
    g = args.g;
    size = args.size;
    font = args.font;
  }

  if (g === undefined) {
    let mc = get_measure_canvas();
    canvas = mc;
    g = mc.g;
  }

  if (font !== undefined) {
    if (typeof font === "object" && font instanceof CSSFont) {
      font = font.genCSS(size);
    }

    g.font = font;
  } else {
    _ensureFont(elem, canvas as HTMLCanvasElement & { font?: string }, g, size);
  }

  let ret = g.measureText(text);

  if (size !== undefined) {
    //clear custom font for next time
    g.font = "";
  }

  return ret;
}

//export function drawText(elem, x, y, text, canvas, g, color=undefined, size=undefined, font=undefined) {
export function drawText(
  elem: UIBase,
  x: number,
  y: number,
  text: string,
  args: {
    canvas?: HTMLCanvasElement & { font?: string };
    g?: CanvasRenderingContext2D;
    color?: string | number[];
    font?: CSSFont | string;
    size?: number;
  } = {}
): void {
  let canvas = args.canvas,
    g = args.g,
    color: string | number[] | undefined = args.color,
    font: CSSFont | string | undefined = args.font;
  let size = args.size;

  if (size === undefined) {
    if (font !== undefined && font instanceof CSSFont) {
      size = font.size;
    } else {
      size = (elem.getDefault("DefaultText") as CSSFont).size;
    }
  }

  size *= UIBase.getDPI();

  if (color === undefined) {
    if (font && font.color) {
      color = font.color;
    } else {
      color = (elem.getDefault("DefaultText") as CSSFont).color;
    }
  }

  if (font === undefined) {
    _ensureFont(elem, canvas!, g!, size);
  } else if (typeof font === "object" && font instanceof CSSFont) {
    g!.font = font.genCSS(size);
  } else if (font) {
    g!.font = font as string;
  }

  if (typeof color === "object") {
    color = color2css(color);
  }

  g!.fillStyle = color as string;
  g!.fillText(text, x + 0.5, y + 0.5);

  if (size !== undefined) {
    //clear custom font for next time
    g!.font = "";
  }
}

let PIDX = 0,
  PSHADOW = 1,
  PTOT = 2;

/**

 Saves UI layout data, like panel layouts, active tabs, etc.
 Uses the UIBase.prototype.[save/load]Data interface.

 Note that this is error-tolerant.
 */
export function saveUIData(node: UIBase, key: string): string {
  if (key === undefined) {
    throw new Error("ui_base.saveUIData(): key cannot be undefined");
  }

  let paths: unknown[][] = [];

  let rec = (n: Node & { shadow?: ShadowRoot }, path: unknown[], ni: number, is_shadow: boolean) => {
    path = path.slice(0, path.length); //copy path

    let pi = path.length;
    for (let i = 0; i < PTOT; i++) {
      path.push(undefined);
    }

    path[pi] = ni;
    path[pi + 1] = is_shadow ? 1 : 0;

    if (n instanceof UIBase) {
      let path2 = path.slice(0, path.length);
      let data = n.saveData();

      let bad = !data;
      bad = bad || (typeof data === "object" && Object.keys(data).length === 0);

      if (!bad) {
        path2.push(data);

        if (path2[pi + 2]) {
          paths.push(path2);
        }
      }
    }

    for (let i = 0; i < n.childNodes.length; i++) {
      let n2 = n.childNodes[i];

      rec(n2, path, i, false);
    }

    let shadow = n.shadow;

    if (!shadow) return;

    for (let i = 0; i < shadow.childNodes.length; i++) {
      let n2 = shadow.childNodes[i];

      rec(n2, path, i, true);
    }
  };

  rec(node, [], 0, false);

  return JSON.stringify({
    key        : key,
    paths      : paths,
    _ui_version: 1,
  });
}

window._saveUIData = saveUIData;

export function loadUIData(node: UIBase, buf: string | null | undefined): void {
  if (buf === undefined || buf === null) {
    return;
  }

  let obj = JSON.parse(buf);
  let key = buf.key;

  for (let path of obj.paths) {
    let n = node;

    let data = path[path.length - 1];
    path = path.slice(2, path.length - 1); //in case some api doesn't want me calling .pop()

    for (let pi = 0; pi < path.length; pi += PTOT) {
      let ni = path[pi],
        shadow = path[pi + 1];

      let list;

      if (shadow) {
        list = n.shadow;

        if (list) {
          list = list.childNodes;
        }
      } else {
        list = n.childNodes;
      }

      if (list === undefined || list[ni] === undefined) {
        //console.log("failed to load a ui data block", path);
        n = undefined;
        break;
      }

      n = list[ni];
    }

    if (n !== undefined && n instanceof UIBase) {
      n._init(); //ensure init's been called, _init will check if it has
      n.loadData(data);

      //console.log(n, path, data);
    }
  }
}

UIBase.PositionKey = "fixed";

window._loadUIData = loadUIData;

//avoid explicit circular references
aspect._setUIBase(UIBase);
//ui_save.setUIBase(UIBase);
