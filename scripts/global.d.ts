/**
 * Global type augmentations for path.ux
 *
 * Window globals and Symbol extensions used throughout the codebase.
 * Many of these are debug/test helpers. Production-critical globals
 * are marked with comments.
 */

/* eslint-disable no-var */

declare interface ElementCSSInlineStyle {
  style: { [k: string]: string };
}

interface SymbolConstructor {
  // used to avoid circular module references
  // so uibase can find area instances
  IsAreaTag: symbol;
}

interface PathUXDebug {
  paranoidEvents?: boolean;
  domEventAddRemove?: boolean;
  domEvents?: boolean;
  areaContextPushes?: boolean;
  areadocker?: boolean;
}

interface Window {
  /* ── Config & Theme (production) ────────────────────────── */
  __cconst: Record<string, unknown>;
  __theme: Record<string, unknown>;
  DEBUG?: { [k: string]: boolean } & PathUXDebug;

  /* ── Color utilities (production, assigned in ui_theme.js) ── */
  color2css: (c: number[], alphaOverride?: number) => string;
  color2web: (color: number[]) => string;
  css2color: (color: string) => unknown; // returns Vector4
  web2color: (str: string) => unknown; // returns Vector4
  validateCSSColor: (color: string) => boolean;
  validateWebColor: (str: string) => boolean;
  invertTheme: () => void;
  _exportTheme: () => string;

  /* ── Icon system ──────────────────────────────────────────── */
  _iconmanager: unknown;
  iconsheet: unknown;
  _icon: unknown;
  icongen: unknown;

  /* ── Tool system (production) ────────────────────────────── */
  _ToolClasses: Function[];
  _MacroClasses: Record<string, Function>;
  ToolProperty: unknown;
  parseToolPath: (path: string) => unknown;
  _testToolStackIO: () => unknown;
  _appstate: Record<string, unknown>;

  /* ── UI system ─────────────────────────────────────────────── */
  _contextWrangler: unknown;
  _menuWrangler: unknown;
  _startMenuEventWrangling: () => void;
  _sendNote: (...args: unknown[]) => void;
  _flagThemeUpdate: () => void;
  styleScrollBars: (color?: string, contrast?: number, width?: number, border?: string) => void;
  setTimeoutQueue: (fn: () => void) => void;
  _saveUIData: (...args: unknown[]) => unknown;
  _loadUIData: (...args: unknown[]) => unknown;
  _testSetScrollbars: (color?: string, contrast?: number, width?: number, border?: string) => void;
  _tsttag: HTMLStyleElement;
  colorpicker: unknown;

  /* ── Event system ─────────────────────────────────────────── */
  _print_evt_debug: boolean;
  _haveModal: () => boolean;
  _findScreen: () => unknown;
  testSingleMouseUpEvent: (type?: string) => void;
  eventDebugModule: unknown;
  debugEventLists: unknown;
  debugEventList: unknown[];

  /* ── Math / Vectors ───────────────────────────────────────── */
  isMobile: boolean;
  IndexRange: unknown;
  IndexRangeStack: unknown[];
  makeCompiledVectormathCode: (mode?: string) => string;
  Matrix4: unknown;

  /* ── Cachering system ──────────────────────────────────────── */
  _cacherings: unknown[];
  _clear_all_cacherings: (killAll?: boolean) => void;
  _nonvector_cacherings: () => unknown;
  _stale_cacherings: () => unknown;

  /* ── Units ─────────────────────────────────────────────────── */
  _getBaseUnit: () => unknown;
  unitConvert: (...args: unknown[]) => number;

  /* ── Polyfill / compatibility ──────────────────────────────── */
  destroyAllCSS: () => void;
  list: (iter: Iterable<unknown>) => unknown[];
  _nGlobal: typeof globalThis;
  PATHUX_CONFIG: Record<string, unknown> | undefined;

  /* ── Screen / Area management ──────────────────────────────── */
  _DEBUG: boolean;
  cssText: string;
  getAreaIntName: (...args: unknown[]) => string;
  testSnapScreenVerts: (...args: unknown[]) => void;
  tabs: unknown;

  /* ── Serialization ─────────────────────────────────────────── */
  _debug__map_structs: Record<string, unknown>;
  mySafeJSONStringify: (value: unknown, replacer?: unknown, space?: unknown) => string;
  _image_url: string;

  /* ── Curve system ──────────────────────────────────────────── */
  _bin_cache: Record<string, unknown>;
  bin: (...args: unknown[]) => unknown;
  _splineCache: Record<string, unknown>;
  _SplineTemplateIcons: Record<string, unknown>;

  /* ── TinyMCE (third-party) ─────────────────────────────────── */
  tinymce: unknown;
  tinyMCE: unknown;
  tinyMCEPreInit: Record<string, unknown>;

  /* ── Debug/test helpers ────────────────────────────────────── */
  __elem: HTMLElement;
  _codelem: HTMLElement;
  tree: HTMLElement;
  _relative: (...args: unknown[]) => unknown;
  test_aabb_intersect_2d: () => void;
  _test_hash2: () => void;
  _testLoadFile: (exts?: string[]) => void;
  _testSaveFile: () => void;
  _testToolStackIO: () => void;
  _parseValueTest: (...args: unknown[]) => unknown;
  _buildStringTest: (...args: unknown[]) => unknown;
  ta: unknown;
  rc: unknown;
  cw: unknown;
  vp: unknown;
  _ToolTip: unknown;
  menu: unknown;
  elem: HTMLElement | Node;
}

/** Symbol augmentations used for metadata throughout path.ux */
interface SymbolConstructor {
  ToolID: unique symbol;
  ContextID: unique symbol;
  CachedDef: unique symbol;
  keystr: unique symbol;
}

/* ── Polyfill prototype augmentations (from polyfill.js) ───── */

interface Array<T> {
  /** Remove element at index, shifting remaining elements left */
  pop_i(idx: number): void;
  /** Remove first occurrence of item from array */
  remove(item: T, suppressError?: boolean): void;
  /** Like TypedArray.set -- copy elements from source array */
  set(array: ArrayLike<T>, srcOffset?: number, destOrCount?: number, count?: number): this;
  /** Filter out elements matching predicate (inverse of filter) */
  reject(func: (item: T) => boolean): T[];
  /** Get keystr for use as map/set key */
  [Symbol.keystr](): string;
}

interface Math {
  /** Fractional part of a number */
  fract(f: number): number;
  /** Tent function */
  tent(f: number): number;
}

interface String {
  contains(substr: string): boolean;
  [Symbol.keystr](): string;
}

interface Number {
  [Symbol.keystr](): string;
}

interface Boolean {
  [Symbol.keystr](): string;
}

/** Augment Window for polyfill globals */
interface Window {
  _disable_all_listeners?: boolean;
}

/** globalThis extensions (from path-controller/util/util.js) */
declare var _isDenormal: (f: number) => boolean;
declare var termColor: Record<string, string>;
declare var get_callstack: (msg?: string) => string;
declare var print_stack: (...args: unknown[]) => void;
declare var _debug_event_listeners: boolean | undefined;
