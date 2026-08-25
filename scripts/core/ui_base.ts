//shims HTMLElement in workers; must evaluate before `class UIBase extends HTMLElement`
import "./base/ui_worker_shim";
import { getDPI } from "./base/ui_base_dpi";
import { contextWrangler } from "../screen/area_wrangler";
import type { Area } from "../screen/ScreenArea";
import {
  PackFlags,
  type DefaultTypes,
  type DisableData,
  type IUIBaseConstructor,
  type FormatNumberArgs,
  type PickArgs,
  type StyleRecord,
  type ToolTipState,
  type TotalRect,
  type UIBaseDefinition,
} from "./base/ui_base_types";

export * from "./base/ui_base_types";

//runs setTheme(DefaultTheme) on evaluation, so it must load before anything reads `theme`
export * from "./base/ui_theme_key";
import { _themeUpdateKey } from "./base/ui_theme_key";

//avoid circular module references
let TextBox: (new (...args: unknown[]) => HTMLElement) | undefined = undefined;

export function _setTextboxClass(cls: new (...args: unknown[]) => HTMLElement): void {
  TextBox = cls;
}

import { Animator } from "./anim";
import "./units";
import * as util from "../path-controller/util/util";
import { Vector2, Vector3, Vector4 } from "../path-controller/util/vectormath";
import * as math from "../path-controller/util/math";
import * as toolprop from "../path-controller/toolsys/toolprop";
import {
  pushModalLight,
  popModalLight,
  copyEvent,
  pathDebugEvent,
  haveModal,
  keymap,
  pushPointerModal,
  ModalState,
} from "../path-controller/util/simple_events";
import { getDataPathToolOp } from "../path-controller/controller/controller";
import * as units from "./units";
import { rgb_to_hsv, hsv_to_rgb } from "../util/colorutils";

export * from "./ui_theme";

import {
  theme,
  parsepx,
  compatMap,
  color2css,
  css2color,
  ThemeRecord,
  ThemeScrollBars,
} from "./ui_theme";

import { DefaultTheme } from "./theme";
import type { ThemeSchema, ThemeKeysFor } from "./theme_schema";

export {
  ElementClasses,
  UIFlags,
  dpistack,
  getDefault,
  getTagPrefix,
  marginPaddingCSSKeys,
  report,
  setTagPrefix,
  IsMobile,
} from "./base/ui_element_registry";
import * as registry from "./base/ui_element_registry";
import * as themeLookup from "./base/ui_base_theme_lookup";
import * as tooltips from "./base/ui_base_tooltips";
import { EventCBSymbol, calcElemCBKey } from "./base/ui_element_registry";

export { theme } from "./ui_theme";

import cconst from "../config/const";

window.__cconst = cconst;

export { Icons } from "../icon_enum";
import { Icons } from "../icon_enum";

export { setIconMap } from "../icon_enum";

import { initAspectClass } from "./aspect";
import * as aspect from "./aspect";

window.__theme = theme;

import { ClassIdSymbol } from "./ui_consts";

export { ClassIdSymbol };

export * from "./base/ui_icons";

import { DataPathError, normalizePath } from "../path-controller/controller/controller";
import type {
  DataPathWatcher,
  DataPathWatcherOpts,
  PathWatchCallback,
  PathWatchInfo,
} from "../path-controller/controller/controller";
import { IntProperty, NumberConstraints, PropFlags } from "../path-controller/toolsys/toolprop";
import {
  DependSocket,
  EventNode,
  PropertySocket,
  PropSocketModes,
  SocketTypes,
  theEventGraph,
  SocketType,
} from "../path-controller/dag/eventdag";
import type { IContextBase } from "./context_base";
import { CSSFont } from "./cssfont";

export { CSSFont } from "./cssfont";
import type { DataPathSetOp } from "../path-controller/controller/controller_ops";
import { tagManager } from "./tagReRegister";
import type { Screen } from "../screen/FrameManager";

let _idgen = 0;

interface TimeoutQueueItem {
  cb: () => void;
  timeout: number;
  time: number;
}

const setTimeoutQueue = new Set<TimeoutQueueItem>();
let haveTimeout = false;

function timeout_cb(): void {
  if (setTimeoutQueue.size === 0) {
    haveTimeout = false;
    return;
  }

  for (const item of new Set(setTimeoutQueue)) {
    const { cb, timeout, time } = item;
    if (util.time_ms() - time < timeout) {
      continue;
    }

    setTimeoutQueue.delete(item);

    try {
      cb();
    } catch (error) {
      console.error((error as Error).stack);
    }
  }

  window.setTimeout(timeout_cb, 0);
}

export function internalSetTimeout(cb: () => void, timeout = 0): void {
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

/** Bookkeeping stamped onto a listener so the wrapper it was registered as can be found again. */
type EventCBHolder = {
  [EventCBSymbol]?: Map<string, EventListener>;
  _cb2?: EventListener;
};

/**
 * ExtraEvents specifies custom events that are not part of HTMLElementEventMap,
 * it is a mapping from event names to the type that's passed to downstream event handlers
 */
export class UIBase<
  CTX extends IContextBase = IContextBase,
  VALUE extends unknown | any = unknown,
  /**
   * Widget class name used to look up this element's theme keys in
   * {@link ThemeKeyRegistry} (see theme_schema.ts / generated/themes.ts).
   * Defaults to "UIBase", whose catalog entry is empty, so `getDefault`'s typed
   * overload stays inert unless a subclass opts in by passing its own name.
   */
  SELF extends string = "UIBase",
> extends HTMLElement {
  static PositionKey: string;

  /**
   * Global datapath poll safety net. While `true` (the default) every widget
   * with path watchers re-reads and diffs its paths from `update()` exactly
   * like the old `updateDataPath` protocol, catching raw model writes that
   * bypass `api.setValue`. Set to `false` to rely on push notifications
   * (`api.notifyChange` / `updateFrom`) alone; per-widget {@link pollDataPath}
   * overrides this in either direction.
   */
  static dataPathPolling = true;

  declare ["constructor"]: IUIBaseConstructor<this>;

  /* -- instance properties -- */
  _tool_tip_abort_delay: number | undefined;
  _tooltip_ref: { remove(): void } | undefined;
  _textBoxEvents: boolean;
  _themeOverride: Record<string, Record<string, unknown>> | undefined;
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
  __cbs: [string, EventListener, AddEventListenerOptions | boolean | undefined][] = [];
  _wasAddedToNodeAtSomeTime: boolean;
  visibleToPick: boolean;
  _override_class: string | undefined;
  _parentWidget: UIBase<CTX, unknown> | undefined;
  _id: string;
  default_overrides: Record<string, unknown>;
  my_default_overrides: Record<string, unknown>;
  class_default_overrides: Record<string, Record<string, unknown>>;
  _description_final: string | undefined;
  _modaldata?: ModalState;
  accessor packflag: number;
  _internalDisabled: boolean;
  __disabledState: boolean;
  _disdata: DisableData | undefined;
  // will be set later
  _ctx: CTX = undefined as unknown as CTX;
  _description: string | undefined;
  _init_done: boolean;
  __background?: string;
  _flashtimer?: number;
  _flashcolor: string | undefined;

  /* -- datapath watch protocol (see watchPath / updateFromPath) -- */
  _pathWatchers: DataPathWatcher<CTX>[] = [];
  _pathWatchInit = false;
  _watchedDataPathAttr: string | null = null;
  /**
   * Per-widget override for the datapath poll safety net: `false` never polls,
   * `true` always polls (even when {@link UIBase.dataPathPolling} is off),
   * `"auto"` (default) follows the global flag. Push notifications are
   * unaffected — polling only covers writes that bypass `api.setValue`.
   */
  pollDataPath: boolean | "auto" = "auto";

  /* clipboard-related, set by _clipboardHotkeyInit */
  _clipboard_over!: boolean;
  _last_clipboard_keyevt: KeyboardEvent | undefined;
  _clipboard_keystart!: () => void;
  _clipboard_keyend!: () => void;
  _clipboard_keydown!: (e: KeyboardEvent, internal_mode?: boolean) => void;
  _clipboard_events!: boolean;

  /* EventNode mixin fields */
  graphNode?: EventNode;

  /* Dynamic property fields set by subclasses (numslider, etc) */
  accessor baseUnit: string | undefined = undefined;
  accessor displayUnit: string | undefined;
  accessor isInt: boolean | undefined;
  accessor radix: number | undefined;
  accessor decimalPlaces: number | undefined;
  accessor editAsBaseUnit: boolean | undefined;
  accessor range: [number, number] | undefined;
  accessor step: number | undefined;
  accessor slideSpeed: number | undefined;
  accessor expRate: number | undefined;
  accessor stepIsRelative: boolean | undefined;
  accessor sliderDisplayExp: number | undefined;
  accessor uiRange: [number, number] | undefined;
  // XXX review this later
  get value(): VALUE {
    throw new Error("implement me");
  }
  set value(value: VALUE) {
    throw new Error("implement me");
  }
  ondestroy?: () => void;
  getValue?: () => unknown;
  declare on_change: ((val: unknown) => void) | null;

  _reflagGraph = false;

  static graphNodeDef = EventNode.register(this, {
    flag    : 0,
    typeName: this.name,
    uiName  : this.name,
    inputs: {
      depend: new DependSocket(),
    },
    outputs: {
      depend: new DependSocket(),
    },
  });

  /** Returns previous icon flags */
  useIcons?: (bool_or_icon_number?: boolean | number) => number;

  graphExec(): void {
    const node = this.graphNode;
    if (node === undefined) {
      return;
    }

    if (node.inputs.depend.isUpdated) {
      node.outputs.depend.flagUpdate();
    }

    for (const k in node.inputs) {
      const sock = node.inputs[k];

      if (!(sock instanceof PropertySocket)) {
        continue;
      }

      let val = sock.value;
      let first = true;

      for (const sockb of sock.edges) {
        if (first) {
          val = sockb.value;
          first = false;
        } else {
          switch (sock.mixMode) {
            case PropSocketModes.REPLACE:
              val = sockb.value;
              break;
            case PropSocketModes.MIN:
              val = Math.min(val, sockb.value as number); // XXX bad cast!
              break;
            case PropSocketModes.MAX:
              val = Math.max(val, sockb.value as number); // XXX bad cast!
              break;
          }
        }
      }

      sock.value = val;
    }

    function isNumArray(a: any) {
      if (!(a instanceof Array)) {
        return false;
      }

      const b = a as unknown as number[];

      for (let i = 0; i < a.length; i++) {
        if (b[i] !== undefined && typeof b[i] !== "number" && typeof b[i] !== "boolean") {
          return false;
        }
      }

      return true;
    }

    for (const k in node.outputs) {
      const sock = node.outputs[k];

      if (!(sock instanceof PropertySocket)) {
        continue;
      }

      const v = sock.value;
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
            const json = JSON.stringify(v);
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
    if (!theEventGraph.has(this)) {
      theEventGraph.add(this);
    }
  }

  playwrightId(id: string): this {
    this.setAttribute("data-testid", id);
    return this;
  }

  flagPropSocketUpdate(path: string): this {
    const sock = this.getPropertySocket(path, SocketTypes.OUTPUT);
    if (sock) {
      console.warn(`Flag socket "${path}" for update`);
      sock.flagUpdate();
    }
    return this;
  }

  getPropertySocket(prop: string, socktype: string): PropertySocket | undefined {
    const node = this.graphNode;
    const sockets = socktype === SocketTypes.INPUT ? node!.inputs : node!.outputs;

    if (sockets[prop]) {
      return sockets[prop] as PropertySocket;
    }

    return undefined;
  }

  ensurePropertySocket(prop: string, socktype: SocketType): PropertySocket {
    this.ensureGraph();

    const node = this.graphNode!;
    const sockets = socktype === "inputs" ? node!.inputs : node!.outputs;

    if (sockets[prop]) {
      return sockets[prop] as PropertySocket;
    }

    const sock = new PropertySocket();
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
    const sockdst = this.ensurePropertySocket(dstProp, SocketTypes.INPUT);
    const socksrc = source.ensurePropertySocket(srcProp, SocketTypes.OUTPUT);

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

    initAspectClass(
      this,
      new Set(["appendChild", "animate", "shadow", "removeNode", "prepend", "add", "init"])
    );

    this.shadow = this.attachShadow({ mode: "open" });

    // this is the stupidest thing ever
    const styleElem = document.createElement("style");
    styleElem.innerHTML = `
        /* This hides the host element when it has the hidden attribute */
        :host([hidden]) {
          display: none !important;
        }
    `;
    this.shadow.appendChild(styleElem);

    if (cconst.DEBUG.paranoidEvents) {
      this.__cbs = [];
    }

    this.shadow.appendChild(this._screenStyleTag);
    const _origAppendChild = this.shadow.appendChild.bind(this.shadow) as <T extends Node>(
      child: T
    ) => T;
    (this.shadow as ShadowRoot & { _appendChild: <T extends Node>(child: T) => T })._appendChild =
      _origAppendChild;

    ///*
    this.shadow.appendChild = <T extends Node>(child: T): T => {
      if (child && typeof child === "object" && child instanceof UIBase) {
        child.parentWidget = this as any;
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

    const tagname = this.constructor.define().tagname;
    this._id = tagname.replace(/-/g, "_") + _idgen++;

    this.default_overrides = {}; //inherited by child widgets
    this.my_default_overrides = {}; //not inherited to child widgets
    this.class_default_overrides = {};

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

    this._description = undefined;

    const style = document.createElement("style");
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
    const do_touch = (e: TouchEvent, type: string, button?: number) => {
      if (haveModal()) {
        return;
      }

      button = button === undefined ? 0 : button;
      const e2 = copyEvent(e);

      if (e.touches.length === 0) {
        //hrm, what to do, what to do. . .
      } else {
        const t = e.touches[0];

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

      const e3 = new MouseEvent(type, e2 as MouseEventInit) as MouseEvent & {
        was_touch: boolean;
        touches: TouchList;
      };

      e3.was_touch = true;
      e3.stopPropagation = e.stopPropagation.bind(e);
      e3.preventDefault = e.preventDefault.bind(e);
      (e3 as MouseEvent & { touches: TouchList }).touches = e.touches;

      this.dispatchEvent(e3);
    };

    this.addEventListener(
      "touchstart",
      (e) => {
        do_touch(e as TouchEvent, "mousedown", 0);
      },
      { passive: false }
    );
    this.addEventListener(
      "touchmove",
      (e) => {
        do_touch(e as TouchEvent, "mousemove");
      },
      { passive: false }
    );
    this.addEventListener(
      "touchcancel",
      (e) => {
        do_touch(e as TouchEvent, "mouseup", 2);
      },
      { passive: false }
    );
    this.addEventListener(
      "touchend",
      (e) => {
        do_touch(e as TouchEvent, "mouseup", 0);
      },
      { passive: false }
    );

    if (this.constructor.define().havePickClipboard) {
      this._clipboardHotkeyInit();
    }
  }

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

  set parentWidget(val: UIBase<CTX> | undefined) {
    if (val) {
      this._wasAddedToNodeAtSomeTime = true;
    }

    this._parentWidget = val;
  }

  get useDataPathUndo() {
    let p = this as UIBase<CTX> | undefined;

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

      const path = this.getAttribute("datapath");
      s += "\n    path: " + path;

      if (this.hasAttribute("mass_set_path")) {
        const m = this.getAttribute("mass_set_path");
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

  set background(bg: string | undefined) {
    this.__background = bg;

    if (bg !== undefined) {
      this.overrideDefault("background-color", bg, true);
      this.saneStyle["backgroundColor"] = bg;
    } else {
      this.clearOverride("background-color");
    }
  }

  get disabled() {
    //hrm, I could just propegate checks upward. . .

    if (this.parentWidget?.disabled) {
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
    return getDPI();
  }

  static prefix(name: string): string {
    return registry.prefix(name);
  }

  static internalRegister(cls: IUIBaseConstructor): void {
    registry.registerInternal(cls, this.prefix(cls.define().tagname));
  }

  static getInternalName(name: string): string | undefined {
    return registry.getInternalName(name);
  }

  static createElement<T extends UIBase | HTMLElement = HTMLElement>(
    name: string,
    internal = false
  ): T {
    return registry.createElement<T>(name, internal);
  }

  static isRegistered(cls: IUIBaseConstructor) {
    return registry.isRegistered(cls);
  }

  static register(cls: IUIBaseConstructor): void {
    registry.registerElement(cls);
  }

  static unregister(cls: IUIBaseConstructor): void {
    // do nothing for now, we can replace tag constructors
    // via our proxy system but unregistering them altogether
    // could be problematic.
  }

  /**
   * Unprefixed tag names of every registered element, from both
   * {@link internalRegister} (built-ins) and {@link register} (app widgets).
   * Used by the data-path generator to emit the JSX widget-tag registry.
   */
  static getRegisteredTagNames(): string[] {
    return registry.getRegisteredTagNames();
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

  flushHiddenState(hidden: boolean) {
    this.hidden = hidden;
    this._forEachChildWidget((n: UIBase) => {
      n.flushHiddenState(hidden);
    });
  }

  get isVisible() {
    return this.checkVisibility();
  }

  set hidden(state: boolean) {
    super.hidden = state;
  }

  get hidden(): boolean {
    const value = super.hidden as any;
    if (typeof value === "string" && value === "until-found") {
      return true;
    }
    return Boolean(value);
  }

  hide(sethide = true): this {
    this.hidden = sethide;
    return this;
  }

  getElementById(id: string): HTMLElement | undefined {
    let ret: HTMLElement | UIBase<CTX> | undefined;

    const rec = (n: HTMLElement | UIBase<CTX>) => {
      if (ret) {
        return;
      }

      if (n.getAttribute("id") === id || n.id === id) {
        ret = n;
      }

      if (n instanceof UIBase && n.constructor.define().tagname === "panelframe-x") {
        rec((n as unknown as { contents: HTMLElement }).contents);
      } else if (n instanceof UIBase && n.constructor.define().tagname === "tabcontainer-x") {
        for (const k in (n as unknown as { tabs: Record<string, HTMLElement> }).tabs) {
          const tab = (n as unknown as { tabs: Record<string, HTMLElement> }).tabs[k];

          if (tab) {
            rec(tab);
          }
        }
      }

      for (const n2 of n.childNodes) {
        if (n2 instanceof HTMLElement) {
          rec(n2);

          if (ret) {
            break;
          }
        }
      }

      if (n instanceof UIBase && n.shadow) {
        for (const n2 of n.shadow.childNodes) {
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

    return ret as HTMLElement;
  }

  unhide(): void {
    this.hide(false);
  }

  findArea(): Area | undefined {
    let p: any | undefined = this;

    while (p) {
      if (p[Symbol.IsAreaTag]) {
        return p;
      }
      p = p.parentWidget;
    }

    return p;
  }

  addEventListener<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    cb: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions | boolean
  ): void;
  addEventListener(
    type: string,
    cb: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions | boolean
  ): void {
    if (cconst.DEBUG.domEventAddRemove) {
      console.log("addEventListener", type, this._id, options);
    }

    const cb2 = (e: Event) => {
      if (cconst.DEBUG.paranoidEvents) {
        if (this.isDead()) {
          this.removeEventListener(type, cb as any, options);
          return;
        }
      }

      if (cconst.DEBUG.domEvents) {
        pathDebugEvent(e);
      }

      const area = this.findArea() as
        | (UIBase & { push_ctx_active(): void; pop_ctx_active(): void })
        | undefined;

      if (area) {
        area.push_ctx_active();
        try {
          const ret = (cb as EventListener).call(this as unknown as HTMLElement, e as any);
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

        return (cb as EventListener).call(this as unknown as HTMLElement, e as any);
      }
    };

    const cbAny = cb as any;
    if (!cbAny[EventCBSymbol]) {
      cbAny[EventCBSymbol] = new Map();
    }

    const key = calcElemCBKey(this, type, options);
    cbAny[EventCBSymbol].set(key, cb2);

    if (cconst.DEBUG.paranoidEvents) {
      this.__cbs.push([type, cb2, options]);
    }

    return super.addEventListener(type, cb2, options as AddEventListenerOptions);
  }

  removeEventListener(
    type: string,
    cb: EventListener & { [EventCBSymbol]?: Map<string, EventListener> },
    options?: AddEventListenerOptions | boolean
  ): void;
  removeEventListener<K extends keyof HTMLElementEventMap>(
    type: K,
    cb: ((this: HTMLElement, ev: HTMLElementEventMap[K]) => any) & EventCBHolder,
    options?: AddEventListenerOptions | boolean
  ): void {
    if (cconst.DEBUG.paranoidEvents) {
      for (const item of this.__cbs) {
        if (item[0] == type && item[1] === cb._cb2 && "" + item[2] === "" + options) {
          this.__cbs.remove(item);
          break;
        }
      }
    }

    if (cconst.DEBUG.domEventAddRemove) {
      console.log("removeEventListener", type, this._id, options);
    }

    const key = calcElemCBKey(this, type as string, options);

    if (!cb[EventCBSymbol]?.has(key)) {
      return super.removeEventListener(type as string, cb as any, options as EventListenerOptions);
    } else {
      const cb2 = cb[EventCBSymbol].get(key)!;

      const ret = super.removeEventListener(type as string, cb2, options as EventListenerOptions);

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

    const style = this.saneStyle as any;
    for (const k of keys) {
      style[k] = "0px";
    }

    return this;
  }

  /**
   * find owning screen and tell it to update
   * the global tab order
   * */
  regenTabOrder(): this {
    const screen = this.getScreen();
    if (screen !== undefined) {
      screen.needsTabRecalc = true;
    }

    return this;
  }

  noMargins(): this {
    this.saneStyle["margin"] =
      this.saneStyle["margin-left"] =
      this.saneStyle["margin-right"] =
        "0px";
    this.saneStyle["margin-top"] = this.saneStyle["margin-bottom"] = "0px";
    return this;
  }

  get saneStyle(): { [k: string]: string } {
    return this.style as unknown as { [k: string]: string };
  }

  noPadding(): this {
    this.saneStyle["padding"] =
      this.saneStyle["padding-left"] =
      this.saneStyle["padding-right"] =
        "0px";
    this.saneStyle["padding-top"] = this.saneStyle["padding-bottom"] = "0px";
    return this;
  }

  getTotalRect(): TotalRect | undefined {
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

    const baseUnit = args.baseUnit || this.baseUnit;
    const isInt = args.isInt || this.isInt;

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

  formatNumber(value: number, args: FormatNumberArgs = {}): string {
    const baseUnit = args.baseUnit || this.baseUnit;
    const displayUnit = args.displayUnit || this.displayUnit;
    const isInt = args.isInt || this.isInt;
    const radix = args.radix || this.radix || 10;
    const decimalPlaces = args.decimalPlaces || this.decimalPlaces;

    //console.log(this.baseUnit, this.displayUnit);

    if (isInt && radix !== 10) {
      const ret = Math.floor(value).toString(radix);

      if (radix === 2) return "0b" + ret;
      else if (radix === 16) return ret + "h";
    }

    return units.buildString(value, baseUnit, decimalPlaces, displayUnit);
  }

  setBoxCSS(subkey?: string): void {
    const keys = ["left", "right", "top", "bottom"];

    let sub: any | undefined;
    if (subkey) {
      sub = this.getAttribute(subkey) || {};
    }

    const def = (key: string) => {
      if (sub && subkey) {
        return this.getSubDefault(subkey, key);
      }

      return this.getDefault(key);
    };

    for (let i = 0; i < 2; i++) {
      const key = i ? "padding" : "margin";

      this.saneStyle[key] = "unset";

      const val = def(key);
      if (val !== undefined) {
        //handle default first
        for (let j = 0; j < 4; j++) {
          this.saneStyle[key + "-" + keys[j]] = val + "px";
        }
      }

      for (let j = 0; j < 4; j++) {
        //now do box sides
        const key2 = `${key}-${keys[j]}`;
        const val2 = def(key2);

        if (val2 !== undefined) {
          this.saneStyle[key2] = val2 + "px";
        }
      }
    }

    this.saneStyle["border-radius"] = def("border-radius") + "px";
    this.saneStyle["border"] =
      `${def("border-width")}px ${def("border-style")} ${def("border-color")}`;
  }

  genBoxCSS(subkey?: string): string {
    let boxcode = "";

    const keys = ["left", "right", "top", "bottom"];

    let sub: any | undefined;
    if (subkey) {
      sub = this.getAttribute(subkey) || {};
    }

    const def = (key: string) => {
      if (sub && subkey) {
        return this.getSubDefault(subkey, key);
      }

      return this.getDefault(key);
    };

    for (let i = 0; i < 2; i++) {
      const key = i ? "padding" : "margin";

      const val = def(key);
      if (val !== undefined) {
        boxcode += `${key}: ${val} px;\n`;
      }

      for (let j = 0; j < 4; j++) {
        const key2 = `${key}-${keys[j]}`;
        const val2 = def(key2);

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
      const bg = this.getDefault("background-color");
      if (bg) {
        this.saneStyle["background-color"] = "" + bg;
      }
    }

    const zoom = this.getZoom();
    if (zoom === 1.0) {
      return;
    }

    let transform = "" + this.saneStyle["transform"];

    //try to preserve user set transform by selectively deleting scale
    //kind of hackish. . .

    //normalize whitespace
    transform = transform.replace(/[ \t\n\r]+/g, " ");
    transform = transform.replace(/, /g, ",");

    //cut out scale
    const transform2 = transform.replace(/scale\([^)]+\)/, "").trim();
    this.saneStyle["transform"] = transform2 + ` scale(${zoom},${zoom})`;
  }

  //TS patch into this.update.after
  setCSSAfter(cb: () => void) {
    const anyThis = this as unknown as any;
    return anyThis.setCSS.after(cb);
  }

  setCSSOnce(cb: () => void, arg: any) {
    const anyThis = this as unknown as any;
    return anyThis.setCSS.once(cb, arg);
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

  replaceChild<T extends Node>(newnode: Node, oldnode: T): T {
    for (let i = 0; i < this.childNodes.length; i++) {
      if ((this.childNodes[i] as unknown as T) === oldnode) {
        super.replaceChild(newnode, oldnode);
        return oldnode;
      }
    }

    for (let i = 0; i < this.shadow.childNodes.length; i++) {
      if ((this.shadow.childNodes[i] as unknown as T) === oldnode) {
        this.shadow.replaceChild(newnode, oldnode);
        return oldnode;
      }
    }

    console.error("Unknown child node", oldnode);
    return oldnode;
  }

  swapWith(b: UIBase<CTX>): boolean {
    let p1: Node | undefined | null | UIBase<CTX> = this.parentNode;
    let p2: Node | undefined | null | UIBase<CTX> = b.parentNode;

    if (p1 === this.parentWidget?.shadow || !p1) {
      p1 = this.parentWidget;
    }

    if (p2 === b.parentWidget?.shadow || !p2) {
      p2 = b.parentWidget;
    }

    if (!p1 || !p2) {
      console.error("Invalid call to UIBase.prototype.swapWith", this, b, p1, p2);
      return false;
    }

    const getPos = (
      n: Node | UIBase,
      p: (Node | UIBase) & { shadow?: ShadowRoot }
    ): [number, Node] => {
      let i = Array.prototype.indexOf.call(p.childNodes, n);

      if (i < 0 && p.shadow) {
        p = p.shadow;
        i = Array.prototype.indexOf.call(p.childNodes, n);
      }

      return [i, p];
    };

    const [i1, n1] = getPos(this, p1);
    const [i2, n2] = getPos(b, p2);

    console.log("i1, i2, n1, n2", i1, i2, n1, n2);

    const tmp1 = document.createElement("div");
    const tmp2 = document.createElement("div");

    n1.insertBefore(tmp1, this);
    n2.insertBefore(tmp2, b);

    //HTMLElement.prototype.remove.call(this);
    //HTMLElement.prototype.remove.call(b);

    n1.replaceChild(b, tmp1);
    n2.replaceChild(this, tmp2);

    const ptmp = this.parentWidget;
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
    const this2: UIBase = this;

    let classes: Iterable<new (...args: unknown[]) => UIBase>;

    let is_set = type_or_set instanceof Set;
    is_set = is_set || Array.isArray(type_or_set);

    if (!is_set) {
      classes = [type_or_set as new (...args: unknown[]) => UIBase];
    } else {
      classes = type_or_set as Iterable<new (...args: unknown[]) => UIBase>;
    }

    const visit = new Set<Node>();

    return (function* () {
      const stack: (Node & { shadow?: ShadowRoot })[] = [this2];

      while (stack.length > 0) {
        const n = stack.pop()!;

        visit.add(n);

        if (!n?.childNodes) {
          continue;
        }

        for (const cls of classes) {
          if (n instanceof cls) {
            yield n;
          }
        }

        for (const c of n.childNodes) {
          if (!visit.has(c)) {
            stack.push(c);
          }
        }

        if (n.shadow) {
          for (const c of n.shadow.childNodes) {
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
      window.addEventListener("keydown", this._clipboard_keydown, {
        capture: true,
        passive: false,
      });
    };

    this._clipboard_keyend = () => {
      if (!this._clipboard_events) {
        return;
      }

      this._clipboard_events = false;
      window.removeEventListener("keydown", this._clipboard_keydown, { capture: true });
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

      const is_copy =
        e.keyCode === keymap["C"] && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey;
      const is_paste =
        e.keyCode === keymap["V"] && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey;

      if (!is_copy && !is_paste) {
        //early out, remember that pickElement is highly expensive to run
        return;
      }

      //pasteForAllChildren
      if (!internal_mode) {
        const screen = this.ctx.screen;
        let elem: UIBase | undefined = screen.pickElement(screen.mpos[0], screen.mpos[1]);

        let checkTree = is_paste && this.constructor.define().pasteForAllChildren;
        checkTree = checkTree || (is_copy && this.constructor.define().copyForAllChildren);

        while (
          checkTree &&
          !(TextBox && elem instanceof TextBox) &&
          elem !== this &&
          elem?.parentWidget
        ) {
          console.log("  " + elem._id);

          elem = elem.parentWidget;
        }

        console.warn("COLOR", this._id, elem ? elem._id : "none");

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

    const start = (e: Event) => {
      this._clipboard_over = true;
      this._clipboard_keystart();
    };

    const stop = (e: Event) => {
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
      for (const item of this.__cbs) {
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

    this.clearPathWatches();

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

  removeChild<T extends Node | UIBase<CTX>>(child: T, trigger_on_destroy = true): T {
    super.removeChild(child);
    if (child instanceof UIBase) {
      child.clearPathWatches();
    }
    if (child instanceof UIBase && child.on_remove) {
      child.on_remove();
    }
    if (trigger_on_destroy && child instanceof UIBase) {
      child._ondestroy();
    }
    if (child instanceof UIBase) {
      child.parentWidget = undefined;
    }
    return child;
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
  _forEachChildWidget(cb: (n: UIBase<CTX>) => void, thisvar?: unknown): void {
    const rec = (n: Node & { shadow?: ShadowRoot }) => {
      if (n instanceof UIBase) {
        if (thisvar !== undefined) {
          cb.call(thisvar, n);
        } else {
          cb(n);
        }
      } else {
        for (const n2 of n.childNodes) {
          rec(n2);
        }

        if (n.shadow !== undefined) {
          for (const n2 of n.shadow.childNodes) {
            rec(n2);
          }
        }
      }
    };

    for (const n of this.childNodes) {
      rec(n);
    }

    if (this.shadow) {
      for (const n of this.shadow.childNodes) {
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
      if (n instanceof HTMLElement && !isNaN(parseFloat("" + n.style["zIndex"]))) {
        const z = parseFloat(n.style["zIndex"]);
        return z;
      }

      n = n.parentNode;

      if (!n) {
        n = p = p!.parentWidget;
      }
    }

    return 0;
  }

  /** returns path to a specific element, see document.elementsFromPoint */
  pickElements<T extends UIBase<CTX> = UIBase<CTX>>(
    x: number,
    y: number,
    args: PickArgs = {},
    marginy = 0,
    nodeclass: IUIBaseConstructor = UIBase,
    excluded_classes?: IUIBaseConstructor[]
  ): T[] {
    nodeclass = args.nodeclass || UIBase;
    excluded_classes = args.excluded_classes;

    x -= window.scrollX;
    y -= window.scrollY;

    const elems = this.shadow.elementsFromPoint(x, y);

    const excluded = (n: UIBase) =>
      excluded_classes ? excluded_classes.find((n2) => n instanceof n2) : false;
    const visit = new WeakSet<Element>();

    const result = new Set<T>();
    const recurse = (elems2: Element[]) => {
      for (const n of elems2) {
        if (n instanceof UIBase) {
          const ns = n.shadow.elementsFromPoint(x, y);
          if (!excluded(n) && (!nodeclass || n instanceof nodeclass)) {
            result.add(n as T);
          }
          ns.forEach((n2) => visit.add(n2));
          recurse(ns.filter((n2) => !visit.has(n2)));
        }
      }
    };
    recurse(elems);

    return Array.from(result);
  }

  pickElement<T extends UIBase<CTX> = UIBase<CTX>>(
    x: number,
    y: number,
    args: PickArgs = {},
    /** @deprecated */
    marginy = 0,
    nodeclass: IUIBaseConstructor = UIBase,
    excluded_classes?: IUIBaseConstructor[]
  ): T | undefined {
    nodeclass = args.nodeclass || UIBase;
    excluded_classes = args.excluded_classes;
    const clip = args.clip;

    x -= window.scrollX;
    y -= window.scrollY;

    let elem: Element | null = document.elementFromPoint(x, y);

    if (!elem) {
      return;
    }

    const path = [elem];
    let lastelem: Element | null = elem;
    let i = 0;

    while (elem instanceof UIBase) {
      if (i++ > 1000) {
        console.error("Infinite loop error");
        break;
      }

      elem = elem.shadow.elementFromPoint(x, y);

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
      const node = path[i];
      let ok = node instanceof nodeclass;

      if (excluded_classes) {
        for (const cls of excluded_classes) {
          ok = ok && !(node instanceof cls);
        }
      }

      if (clip) {
        const rect = node.getBoundingClientRect();
        // avoid GC
        const clip2 = math.aabb_intersect_2d(
          clip.pos,
          clip.size,
          [rect.x, rect.y],
          [rect.width, rect.height]
        );

        ok = ok && Boolean(clip2);
      }

      if (ok) {
        return node as T;
      }
    }
  }

  __updateDisable(val: boolean): void {
    if (!!val === !!this.__disabledState) {
      return;
    }

    this.__disabledState = !!val;

    if (val && !this._disdata) {
      const style: any = this.getDefault("disabled") ??
        this.getDefault("internalDisabled") ?? {
          "background-color": this.getDefault("DisabledBG"),
        };

      this._disdata = {
        style   : {},
        defaults: {},
      };

      for (const k in style) {
        //save old style information
        this._disdata.style[k] = this.saneStyle[k];
        this._disdata.defaults[k] = this.default_overrides[k];

        const v = style[k];

        if (typeof v === "object" && v instanceof CSSFont) {
          this.saneStyle[k] = style[k].genCSS();
        } else if (typeof v === "object") {
          continue;
        } else {
          this.saneStyle[k] = style[k];
        }
        this.default_overrides[k] = style[k];
      }

      this.__disabledState = !!val;
      this.on_disabled();
    } else if (!val && this._disdata) {
      //load old style information
      for (const k in this._disdata.style) {
        this.saneStyle[k] = this._disdata.style[k];
      }

      for (const k in this._disdata.defaults) {
        const v = this._disdata.defaults[k];

        if (v === undefined) {
          delete this.default_overrides[k];
        } else {
          this.default_overrides[k] = v;
        }
      }

      //this.background = this.saneStyle["background-color"];
      this._disdata = undefined;

      this.__disabledState = !!val;
      this.on_enabled();
    }

    this.__disabledState = !!val;

    const visit = (n: UIBase | HTMLElement | Node) => {
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
    handlers: any = this,
    autoStopPropagation = true,
    pointerId?: number,
    pointerElem: UIBase = this
  ): unknown {
    if (this._modaldata !== undefined) {
      console.warn("UIBase.prototype.pushModal called when already in modal mode");
      this.popModal();
    }

    const _areaWrangler = contextWrangler.copy();

    contextWrangler.copy();

    function bindFunc(func: Function): (...args: unknown[]) => unknown {
      return function (this: unknown, ...args: unknown[]) {
        _areaWrangler.copyTo(contextWrangler);

        return func.apply(handlers, args);
      };
    }

    const handlers2: Record<string, Function> = {};
    for (const k in handlers) {
      const func = handlers[k];

      if (typeof func !== "function") {
        continue;
      }

      handlers2[k] = bindFunc(func);
    }

    if (pointerId !== undefined && pointerElem) {
      this._modaldata = pushPointerModal(handlers2, undefined, undefined, autoStopPropagation);
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

    popModalLight(this._modaldata!);
    this._modaldata = undefined;
  }

  /** child classes can override this to prevent focus on flash*/
  _flash_focus(): void {
    this.focus();
  }

  flash(
    colorIn: string | number[] | Vector3 | Vector4,
    rect_element: UIBase | HTMLElement = this,
    timems = 355,
    autoFocus = true
  ): void {
    if (typeof colorIn === "string") {
      colorIn = Array.from(css2color(colorIn));
    }
    const color = new Vector4().loadXYZW(colorIn[0], colorIn[1], colorIn[2], colorIn[3] ?? 1.0);
    const csscolor = color2css(color);

    if (this._flashtimer !== undefined && this._flashcolor !== csscolor) {
      window.setTimeout(() => {
        this.flash(color, rect_element, timems, autoFocus);
      }, 100);

      return;
    } else if (this._flashtimer !== undefined) {
      return;
    }

    //let rect = rect_element.getClientRects()[0];
    const rect = rect_element.getBoundingClientRect();

    if (rect === undefined) {
      return;
    }

    //okay, dom apparently calls onchange() on .remove, so we have
    //to put the timer code first to avoid loops
    let timer: number | undefined;
    let tick = 0;
    const max = ~~(timems / 20);

    const x = rect.x;
    const y = rect.y;

    const cb = () => {
      if (timer === undefined) {
        return;
      }

      const a = 1.0 - tick / max;
      div.style["backgroundColor"] = color2css(color, a * a * 0.5);

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
    timer = window.setInterval(cb, 20);
    this._flashtimer = timer;

    const div = document.createElement("div");

    div.style["pointerEvents"] = "none";
    div.tabIndex = -1;
    div.style["zIndex"] = "900";
    div.style["display"] = "float";
    div.style["position"] = UIBase.PositionKey;
    div.style["margin"] = "0px";
    div.style["left"] = x + "px";
    div.style["top"] = y + "px";

    div.style["backgroundColor"] = color2css(color, 0.5);
    div.style["width"] = rect.width + "px";
    div.style["height"] = rect.height + "px";
    div.setAttribute("class", "UIBaseFlash");

    const screen = this.getScreen();
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

  /* Screen and several editors take the old size too, and Screen a third
     internal flag; declared here so overrides stay assignable. */
  on_resize(newsize: number[] | Vector2, oldsize?: number[] | Vector2, _set_key?: boolean): void {}

  toJSON(): Record<string, unknown> {
    const ret: Record<string, unknown> = {};

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

  getPathValue<T = unknown>(ctx: CTX, path: string): T | undefined {
    try {
      return ctx.api.getValue(ctx, path) as T | undefined;
    } catch (error) {
      //report("data path error in ui for" + path);
      return undefined;
    }
  }

  undoBreakPoint(): void {
    this.pathUndoGen++;
  }

  setPathValueUndo(ctx: CTX, path: string, val: unknown): void {
    this.pathSocketUpdate(ctx, path);

    const mass_set_path = this.getAttribute("mass_set_path");
    const rdef = ctx.api.resolvePath(ctx, path)!;
    const prop = rdef.prop!;

    if (ctx.api.getValue(ctx, path) === val) {
      return;
    }

    const toolstack = this.ctx.toolstack;
    let head = toolstack.head;

    const bad =
      head === undefined ||
      !(head instanceof getDataPathToolOp()) ||
      head!.hashThis() !== head!.hash(mass_set_path, path, prop.type, this._id) ||
      this.pathUndoGen !== this._lastPathUndoGen;

    if (!bad) {
      toolstack.undo(ctx);
      const tool = head as InstanceType<ReturnType<typeof getDataPathToolOp>>;
      tool.setValue(ctx, val, rdef.obj);
      toolstack.redo(ctx);
    } else {
      this._lastPathUndoGen = this.pathUndoGen;

      const toolop = getDataPathToolOp().create(
        ctx,
        path,
        val,
        this._id,
        mass_set_path ?? undefined
      );

      /* getDataPathToolOp.create can return false in case of no-op paths. */
      if (!toolop) {
        return;
      }

      ctx.toolstack.execTool(this.ctx, toolop);
      head = toolstack.head;
    }

    if (!head || (head as unknown as DataPathSetOp).hadError) {
      throw new Error("toolpath error");
    }
  }

  loadNumConstraints(
    prop: toolprop.ToolProperty | undefined,
    dom: HTMLElement | UIBase<CTX> = this,
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
        prop = this.getPathMeta(this.ctx, path) ?? prop;
      }
    }

    const loadAttr = (propkey: string, domkey: string, thiskey: string) => {
      const anyThis = this as any;
      const old = anyThis[thiskey];

      if (dom.hasAttribute(domkey)) {
        anyThis[thiskey] = parseFloat(dom.getAttribute(domkey)!);
      } else if (prop) {
        anyThis[thiskey] = prop[propkey as keyof typeof prop];
      }

      if (anyThis[thiskey] !== old) {
        modified = true;
      }
    };

    for (const key of NumberConstraints) {
      const thiskey = key;
      const domkey = key;

      if (key === "range") {
        //handled later
        continue;
      }

      loadAttr(key, domkey, thiskey);
    }

    if (this.range === undefined) {
      this.range = [-Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
    }

    const oldmin = this.range[0];
    const oldmax = this.range[1];

    const range = prop ? prop.range : undefined;
    if (range && !dom.hasAttribute("min")) {
      this.range[0] = range[0];
    } else if (dom.hasAttribute("min")) {
      this.range[0] = parseFloat(dom.getAttribute("min")!);
    }

    if (range && !dom.hasAttribute("max")) {
      this.range[1] = range[1];
    } else if (dom.hasAttribute("max")) {
      this.range[1] = parseFloat(dom.getAttribute("max")!);
    }

    if (this.range[0] !== oldmin || this.range[1] !== oldmax) {
      modified = true;
    }

    const oldint = this.isInt;

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

    const oldedit = this.editAsBaseUnit;

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

  pushReportContext(key: string): void {
    const api = this.ctx.api;
    if (api.pushReportContext) {
      api.pushReportContext(key);
    }
  }

  popReportContext(): void {
    const api = this.ctx.api;
    if (api.popReportContext) api.popReportContext();
  }

  pathSocketUpdate(ctx: unknown, path: string): this {
    this.flagPropSocketUpdate("value");
    return this;
  }

  setPathValue<T = unknown>(ctx: CTX, path: string, val: T): void {
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
        ctx.api.massSetProp(ctx, this.getAttribute("mass_set_path")!, val);
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

  getPathMeta(ctx: CTX, path: string) {
    this.pushReportContext(this._reportCtxName);
    const ret = ctx.api.resolvePath(ctx, path);
    this.popReportContext();

    return ret !== undefined ? ret.prop : undefined;
  }

  getPathDescription(ctx: CTX, path: string): string | undefined {
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

  // we never pass Screen with a <CTX> due to potential for
  // circular type errors
  getScreen(): Screen | undefined {
    return this.ctx?.screen;
  }

  isDead(): boolean {
    return !this.isConnected;
  }

  doOnce(
    func: Function & {
      _doOnce?: (thisvar: UIBase, trace: string) => void;
      _doOnce_reqs?: Set<string>;
    },
    timeout?: number
  ): void {
    if (func._doOnce === undefined) {
      func._doOnce_reqs = new Set();

      func._doOnce = function (thisvar, trace) {
        if (func._doOnce_reqs!.has(thisvar._id)) {
          return;
        }

        func._doOnce_reqs!.add(thisvar._id);

        function f() {
          if (thisvar.isDead()) {
            func._doOnce_reqs!.delete(thisvar._id);

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

          func._doOnce_reqs!.delete(thisvar._id);
          func.call(thisvar);
        }

        internalSetTimeout(f, timeout);
      };
    }

    const trace = new Error().stack;
    func._doOnce(this, trace!);
  }

  float(x = 0, y = 0, zindex?: number | string, positionKey = UIBase.PositionKey): this {
    this.saneStyle.position = positionKey;

    this.saneStyle.left = x + "px";
    this.saneStyle.top = y + "px";

    if (zindex !== undefined) {
      this.saneStyle["z-index"] = "" + zindex;
    }

    return this;
  }

  _ensureChildrenCtx(ctx = this.ctx): void {
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
    return tooltips.abortToolTips(this, delayMs);
  }

  updateToolTipHandlers(): void {
    tooltips.updateToolTipHandlers(this);
  }

  updateToolTips(): void {
    tooltips.updateToolTips(this);
  }

  updateEventGraph(): void {
    if (!this.isConnected) {
      this._reflagGraph = true;
    } else if (this._reflagGraph) {
      this._reflagGraph = false;

      for (const [, sock] of Object.entries(this.graphNode!.inputs)) {
        sock.flagUpdate();
      }
    }
  }

  //TS patch into this.update.after
  updateAfter(cb: () => void) {
    const anyThis = this as unknown as any;
    return anyThis.update.after(cb);
  }

  /**
   * Declare this widget's datapath binding(s) by calling {@link addPathWatch}.
   * Invoked automatically (from `update()`) once `ctx` is available, and
   * re-invoked whenever the `datapath` attribute changes. The base
   * implementation watches the `datapath` attribute when present; override in
   * widgets that bind additional or non-default paths.
   */
  watchPath(): void {
    if (this.hasAttribute("datapath")) {
      this.addPathWatch("datapath");
    }
  }

  /**
   * Reaction to a watched path's value changing — the former post-diff body of
   * `updateDataPath`: update widget state, then `_redraw()`/`setCSS()` as
   * needed. The watcher owns the read + compare; this is only called when the
   * value actually changed. `info.resolved` is `false` when the path failed to
   * resolve (the old `val === undefined → internalDisabled` case).
   */
  updateFromPath(value: unknown, info: PathWatchInfo): void {}

  /**
   * Subscribe to a datapath. `pathOrAttr` names an attribute on this element
   * (default `"datapath"`) whose value is the path, or — when no such
   * attribute exists — is itself the path. Idempotent per path. Pass
   * `opts.onChange` to route a binding somewhere other than
   * {@link updateFromPath} (multi-path widgets).
   */
  addPathWatch(
    pathOrAttr: string = "datapath",
    opts?: DataPathWatcherOpts & { onChange?: PathWatchCallback }
  ): DataPathWatcher<CTX> | undefined {
    if (!this._ctx) {
      return undefined;
    }

    const raw = this.hasAttribute(pathOrAttr) ? this.getAttribute(pathOrAttr)! : pathOrAttr;
    const path = normalizePath(raw);

    if (!path) {
      return undefined;
    }

    for (const w of this._pathWatchers) {
      if (w.path === path) {
        return w;
      }
    }

    const onChange: PathWatchCallback =
      opts?.onChange ?? ((v, info) => this.updateFromPath(v, info));

    /* ctx is passed as a getter so watchers survive context swaps */
    const w = this._ctx.api.watch(() => this._ctx, path, onChange, opts);
    this._pathWatchers.push(w);

    return w;
  }

  /** Re-deliver every watched path's current value through
   * {@link updateFromPath}, bypassing the change diff. Call after a widget
   * stops gating reactions (e.g. a textbox losing focus). */
  refreshPathWatches(): void {
    for (const w of this._pathWatchers) {
      w.refresh();
    }
  }

  /** Unsubscribe every path watcher; they are rebuilt (via {@link watchPath})
   * on the next `update()` while the widget stays in the tree. */
  clearPathWatches(): void {
    for (const w of this._pathWatchers) {
      w.remove();
    }

    this._pathWatchers.length = 0;
    this._pathWatchInit = false;
  }

  /** Lifecycle driver: (re)builds watchers once ctx/datapath are available and
   * runs the poll-mode compat bridge (see {@link UIBase.dataPathPolling}). */
  _updatePathWatchers(): void {
    if (!this._ctx) {
      return;
    }

    const dp = this.getAttribute("datapath");

    if (!this._pathWatchInit || dp !== this._watchedDataPathAttr) {
      this.clearPathWatches();

      this._pathWatchInit = true;
      this._watchedDataPathAttr = dp;

      this.watchPath();
    }

    const poll =
      this.pollDataPath === true || (UIBase.dataPathPolling && this.pollDataPath !== false);

    if (poll) {
      for (const w of this._pathWatchers) {
        w.tick();
      }
    }
  }

  //called regularly
  update(): void {
    this.updateToolTips();
    this.updateEventGraph();
    this._updatePathWatchers();

    if (this.ctx && this._description === undefined && this.getAttribute("datapath")) {
      const d = this.getPathDescription(this.ctx, this.getAttribute("datapath")!);

      this.description = d;
    }

    if (!this._init_done) {
      this._init();
    }

    if (this._init_done && !this.constructor.define().subclassChecksTheme) {
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

  clearOverride(key: string, localOnly = false): this {
    delete this.my_default_overrides[key];
    if (!localOnly) delete this.default_overrides[key];
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
    return themeLookup._doMobileDefault(this, key, val, obj);
  }

  hasDefault(key: string): boolean {
    return themeLookup.hasDefault(this, key);
  }

  hasSubDefault(key: string, subkey: string): boolean {
    return themeLookup.hasSubDefault(this, key, subkey);
  }

  _hasSubDefault(key: string, subkey: string, _themeDef?: Record<string, unknown>): boolean {
    return themeLookup._hasSubDefault(this, key, subkey, _themeDef);
  }

  hasClassSubDefault(key: string, subkey: string, inherit = true): boolean {
    return themeLookup.hasClassSubDefault(this, key, subkey, inherit);
  }

  _hasClassSubDefault(
    key: string,
    subkey: string,
    inherit = true,
    style: string = this.getStyleClass(),
    themeDef?: Record<string, unknown>
  ): boolean {
    return themeLookup._hasClassSubDefault(this, key, subkey, inherit, style, themeDef);
  }

  /** get a sub style from a theme style class.
   *  note that if key is falsy then it just forwards to this.getDefault directly*/
  getSubDefault<T extends DefaultTypes = string>(
    key: string,
    subkey: string,
    backupkey: string = subkey,
    defaultval?: T,
    inherit = true
  ): T {
    return themeLookup.getSubDefault<T>(this, key, subkey, backupkey, defaultval, inherit);
  }

  /**
   * Typed against this class's theme catalog: when `SELF` names a class present
   * in {@link ThemeKeyRegistry} (augmented by generated/themes.ts), `key` is
   * checked and the return type is inferred from the catalog. Otherwise the
   * string fallback overload below applies, preserving prior behavior.
   */
  getDefault<K extends keyof ThemeKeysFor<SELF> & string>(
    key: K,
    checkForMobile?: boolean
  ): ThemeKeysFor<SELF>[K];
  getDefault<T extends DefaultTypes = string>(
    key: string,
    checkForMobile?: boolean,
    defaultval?: unknown,
    inherit?: boolean
  ): T;
  getDefault(
    key: string,
    checkForMobile?: boolean,
    defaultval?: unknown,
    inherit?: boolean
  ): unknown {
    return themeLookup.getDefault(this, key, checkForMobile, defaultval, inherit);
  }

  getDefault_intern(
    key: string,
    checkForMobile = true,
    defaultval?: unknown,
    inherit = true
  ): unknown {
    return themeLookup.getDefault_intern(this, key, checkForMobile, defaultval, inherit);
  }

  getStyleClass(ignoreOverride = false): string {
    return themeLookup.getStyleClass(this, ignoreOverride);
  }

  hasClassDefault(key: string): boolean {
    return themeLookup.hasClassDefault(this, key);
  }

  /**
   * Get a class default value for a given key
   * @param key The key to get the default value for
   * @param checkForMobile Whether to check for mobile-specific values
   * @param defaultval The default value to return if the key is not found
   * @param inherit Whether to use `this.constructor.define().parentStyle` as a fallback
   *                note: if the style class was overriden, this will also cause
   *                `this.constructor.define().style` to be checked (before parentStyle).
   * @returns The default value for the given key
   */
  getClassDefault(
    key: string,
    checkForMobile = true,
    defaultval?: unknown,
    inherit = true
  ): unknown {
    return themeLookup.getClassDefault(this, key, checkForMobile, defaultval, inherit);
  }

  overrideTheme(themeOverride: Record<string, Record<string, unknown>>): this {
    themeLookup.overrideTheme(this, themeOverride);
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
  /** @deprecated Use DOM animation API*/
  animateOld(
    _extra_handlers: Record<string, Function> | Keyframe[] | PropertyIndexedKeyframes | null = {},
    domAnimateOptions?: KeyframeAnimationOptions | number
  ): Animator {
    const transform = new DOMMatrix(this.saneStyle["transform"]);

    const update_trans = () => {
      const t = transform;
      const css = "matrix(" + t.a + "," + t.b + "," + t.c + "," + t.d + "," + t.e + "," + t.f + ")";
      this.saneStyle["transform"] = css;
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
      dx_set(x: number) {
        transform.m41 = x;
        update_trans();
      },

      dy_get() {
        return transform.m42;
      },
      dy_set(x: number) {
        transform.m42 = x;
        update_trans();
      },
    };

    const pixkeys = [
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

    const makePixHandler = (k: string, k2: string) => {
      handlers[k2 + "_get"] = () => {
        const s = this.saneStyle[k];

        if (s.endsWith("px")) {
          return parsepx(s);
        } else {
          return 0.0;
        }
      };

      handlers[k2 + "_set"] = (val: number | string) => {
        this.saneStyle[k] = val + "px";
      };
    };

    for (const k of pixkeys) {
      if (!(k in handlers)) {
        makePixHandler(k, `style.${k}`);
        makePixHandler(k, `style["${k}"]`);
        makePixHandler(k, `style['${k}']`);
      }
    }

    const handler: ProxyHandler<UIBase> = {
      get: (target: UIBase, key: string, receiver: unknown) => {
        console.log(key, handlers[key + "_get"], handlers);

        if (key + "_get" in handlers) {
          return handlers[key + "_get"].call(target);
        } else {
          return (target as any)[key];
        }
      },
      set: (target: UIBase, key: string, val: unknown, receiver: unknown) => {
        console.log(key);

        if (key + "_set" in handlers) {
          handlers[key + "_set"].call(target, val);
        } else {
          (target as any)[key] = val;
        }

        return true;
      },
    };

    const proxy = new Proxy(this, handler);
    const anim = new Animator(proxy as any);

    anim.onend = () => {
      this._active_animations.remove(anim);
    };

    this._active_animations.push(anim);
    return anim;
  }

  abortAnimations(): void {
    for (const anim of util.list(this._active_animations)) {
      anim.end();
    }

    this._active_animations = [];
  }
}

export * from "./base/ui_draw";
import { _getFont } from "./base/ui_draw";

export * from "./base/ui_savedata";

UIBase.PositionKey = "fixed";

//avoid explicit circular references
aspect._setUIBase(UIBase);
