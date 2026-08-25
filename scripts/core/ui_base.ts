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

export { _setTextboxClass } from "./base/ui_base_modal";

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
import * as modal from "./base/ui_base_modal";
import * as anims from "./base/ui_base_anim";
import * as css from "./base/ui_base_css";
import * as datapath from "./base/ui_base_datapath";
import * as pick from "./base/ui_base_pick";
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
    return css.noMarginsOrPadding(this);
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
    return css.noMargins(this);
  }

  get saneStyle(): { [k: string]: string } {
    return this.style as unknown as { [k: string]: string };
  }

  noPadding(): this {
    return css.noPadding(this);
  }

  getTotalRect(): TotalRect | undefined {
    return css.getTotalRect(this);
  }

  parseNumber(value: string | number, args: { baseUnit?: string; isInt?: boolean } = {}): number {
    return css.parseNumber(this, value, args);
  }

  formatNumber(value: number, args: FormatNumberArgs = {}): string {
    return css.formatNumber(this, value, args);
  }

  setBoxCSS(subkey?: string): void {
    css.setBoxCSS(this, subkey);
  }

  genBoxCSS(subkey?: string): string {
    return css.genBoxCSS(this, subkey);
  }

  setCSS(setBG = true): void {
    css.setCSS(this, setBG);
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
    css.flushSetCSS(this);
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
    modal.clipboardHotkeyInit(this);
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
    return pick.calcZ(this);
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
    return pick.pickElements<T>(this, x, y, args);
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
    return pick.pickElement<T>(x, y, args);
  }

  __updateDisable(val: boolean): void {
    modal.updateDisable(this, val);
  }

  on_disabled(): void {}

  on_enabled(): void {}

  pushModal(
    handlers: any = this,
    autoStopPropagation = true,
    pointerId?: number,
    pointerElem: UIBase = this
  ): unknown {
    return modal.pushModal(this, handlers, autoStopPropagation, pointerId, pointerElem);
  }

  popModal(): void {
    modal.popModal(this);
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
    anims.flash(this, colorIn, rect_element, timems, autoFocus);
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
    datapath.setPathValueUndo(this, ctx, path, val);
  }

  loadNumConstraints(
    prop: toolprop.ToolProperty | undefined,
    dom: HTMLElement | UIBase<CTX> = this,
    onModifiedCallback?: (this: UIBase) => void
  ): void {
    datapath.loadNumConstraints(this, prop, dom, onModifiedCallback as () => void);
  }

  pushReportContext(key: string): void {
    datapath.pushReportContext(this, key);
  }

  popReportContext(): void {
    datapath.popReportContext(this);
  }

  pathSocketUpdate(ctx: unknown, path: string): this {
    this.flagPropSocketUpdate("value");
    return this;
  }

  setPathValue<T = unknown>(ctx: CTX, path: string, val: T): void {
    datapath.setPathValue(this, ctx, path, val);
  }

  getPathMeta(ctx: CTX, path: string) {
    return datapath.getPathMeta(this, ctx, path);
  }

  getPathDescription(ctx: CTX, path: string): string | undefined {
    return datapath.getPathDescription(this, ctx, path);
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
    return datapath.addPathWatch(this, pathOrAttr, opts);
  }

  /** Re-deliver every watched path's current value through
   * {@link updateFromPath}, bypassing the change diff. Call after a widget
   * stops gating reactions (e.g. a textbox losing focus). */
  refreshPathWatches(): void {
    datapath.refreshPathWatches(this);
  }

  /** Unsubscribe every path watcher; they are rebuilt (via {@link watchPath})
   * on the next `update()` while the widget stays in the tree. */
  clearPathWatches(): void {
    datapath.clearPathWatches(this);
  }

  /** Lifecycle driver: (re)builds watchers once ctx/datapath are available and
   * runs the poll-mode compat bridge (see {@link UIBase.dataPathPolling}). */
  _updatePathWatchers(): void {
    datapath.updatePathWatchers(this, UIBase.dataPathPolling);
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
    return anims.animateOld(this, _extra_handlers, domAnimateOptions);
  }

  abortAnimations(): void {
    anims.abortAnimations(this);
  }
}

export * from "./base/ui_draw";
import { _getFont } from "./base/ui_draw";

export * from "./base/ui_savedata";

UIBase.PositionKey = "fixed";

//avoid explicit circular references
aspect._setUIBase(UIBase);
