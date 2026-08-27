/**
 * Global type augmentations for path.ux
 *
 * Window globals and Symbol extensions used throughout the codebase.
 * Many of these are debug/test helpers. Production-critical globals
 * are marked with comments.
 */

/* eslint-disable no-var */

/** Minimal TinyMCE types for docbrowser integration */
interface TinyMCEURI {
  host: string;
  source: string;
  toAbsolute(): string;
}

interface TinyMCEUndoManager {
  beforeChange(): void;
  add(): void;
}

interface TinyMCEEditor {
  undoManager: TinyMCEUndoManager;
}

interface TinyMCEInstance {
  baseURI: TinyMCEURI;
  baseURL: string;
  editors: TinyMCEEditor[];
  init(config: Record<string, unknown>): Promise<TinyMCEInstance[]>;
  show(): void;
  hide(): void;
}

declare function _tinymce(globals: Window): TinyMCEInstance;

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
  haveElectron?: boolean;
  haveNwjs?: boolean;
  redraw_all?: Function;
  /* ── Config & Theme (production) ────────────────────────── */
  __cconst: Record<string, unknown>;
  __theme: Record<string, unknown>;
  DEBUG?: { [k: string]: boolean | undefined } & PathUXDebug;

  invertTheme: () => void;
  _exportTheme: () => string;

  /* ── Icon system ──────────────────────────────────────────── */
  _iconmanager: unknown;
  iconsheet: unknown;
  _icon: unknown;
  icongen: unknown;

  /* ── Tool system (production) ────────────────────────────── */
  ToolProperty: unknown;
  parseToolPath: (path: string) => unknown;
  _testToolStackIO: () => unknown;

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

  /* ── Polyfill / compatibility ──────────────────────────────── */
  destroyAllCSS: () => void;
  list: (iter: Iterable<unknown>) => unknown[];
  _nGlobal: typeof globalThis;
  PATHUX_CONFIG: Record<string, unknown> | undefined;

  /* ── Screen / Area management ──────────────────────────────── */
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
  tinymce: TinyMCEInstance | undefined;
  tinyMCE: unknown;
  tinyMCEPreInit: Record<string, unknown>;

  /* ── Docs browser globals ────────────────────────────────────── */
  PATHUX_DOCPATH?: string;
  PATHUX_DOC_CONFIG?: string;
  PATHUX_DOCPATH_PREFIX?: string;

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
  ta: unknown;
  rc: unknown;
  cw: unknown;
  vp: unknown;
  _ToolTip: { show(text: string, screen: UIBase, x: number, y: number): { remove(): void } };
  menu: unknown;
  elem: HTMLElement | Node;
}

/** Symbol augmentations used for metadata throughout path.ux */
/* `readonly` on keystr is load-bearing: an interface property only keeps its
   `unique symbol` type when it is readonly. Without it the symbol widens to
   plain `symbol` and every `[Symbol.keystr]()` member becomes a symbol *index
   signature* rather than a named property, so nothing satisfies a
   `{[Symbol.keystr](): ...}` constraint. The other three are re-declared
   non-readonly in path-controller, and controller.ts assigns to ToolID. */
interface SymbolConstructor {
  ToolID: unique symbol;
  ContextID: unique symbol;
  CachedDef: unique symbol;
  readonly keystr: unique symbol;
}

/* ── Polyfill prototype augmentations (from polyfill.js) ───── */

interface Array<T> {
  /** Remove element at index, shifting remaining elements left */
  pop_i(idx: number): void;
  /** Remove first occurrence of item from array */
  remove(item: T, suppressError?: boolean): void;
  replace(existing: T, replacement: T): void;

  /** Like TypedArray.set -- copy elements from source array */
  set(array: ArrayLike<T>, srcOffset?: number, destOrCount?: number, count?: number): this;
  /** Filter out elements matching predicate (inverse of filter) */
  reject(func: (item: T) => boolean): T[];
  /** Get keystr for use as map/set key */
  // causes very weird type corruption errors
  // [Symbol.keystr](): string;
}

interface Math {
  /** Fractional part of a number */
  fract(f: number): number;
  /** Tent function */
  tent(f: number): number;
}

/* `string | number` matches Keyable in path-controller/util/util.ts, and the
   Number implementation really does return the number itself. */
interface String {
  contains(substr: string): boolean;
  [Symbol.keystr](): string | number;
}

interface Number {
  [Symbol.keystr](): string | number;
}

interface Boolean {
  [Symbol.keystr](): string | number;
}

/** Augment Window for polyfill globals */
interface Window {
  _disable_all_listeners?: boolean;
}

interface SymbolConstructor {
  readonly Disposable: unique symbol;
}

/** globalThis extensions (from path-controller/util/util.js) */
declare var get_callstack: (msg?: string) => string;
declare var print_stack: (...args: unknown[]) => void;
declare var _debug_event_listeners: boolean | undefined;
