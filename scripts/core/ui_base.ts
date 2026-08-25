//shims HTMLElement in workers; must evaluate before `class UIBase extends HTMLElement`
import "./base/ui_worker_shim";
import { getDPI } from "./base/ui_base_dpi";
import type { Area } from "../screen/ScreenArea";
import type {
  DefaultTypes,
  DisableData,
  IUIBaseConstructor,
  FormatNumberArgs,
  PickArgs,
  ToolTipState,
  TotalRect,
  UIBaseDefinition,
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
import * as toolprop from "../path-controller/toolsys/toolprop";
import { ModalState } from "../path-controller/util/simple_events";

export * from "./ui_theme";

import { theme } from "./ui_theme";

import type { ThemeKeysFor } from "./theme_schema";

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
import * as dom from "./base/ui_base_dom";
import * as graph from "./base/ui_base_graph";
import * as props from "./base/ui_base_props";
import * as init from "./base/ui_base_init";
import { EventCBSymbol } from "./base/ui_element_registry";

export { theme } from "./ui_theme";

import cconst from "../config/const";

window.__cconst = cconst;

export { Icons } from "../icon_enum";
import { Icons } from "../icon_enum";

export { setIconMap } from "../icon_enum";

import * as aspect from "./aspect";

window.__theme = theme;

import { ClassIdSymbol } from "./ui_consts";

export { ClassIdSymbol };

export * from "./base/ui_icons";

import type {
  DataPathWatcher,
  DataPathWatcherOpts,
  PathWatchCallback,
  PathWatchInfo,
} from "../path-controller/controller/controller";
import { EventNode, PropertySocket, SocketType } from "../path-controller/dag/eventdag";
import type { IContextBase } from "./context_base";

export { CSSFont } from "./cssfont";
import type { Screen } from "../screen/FrameManager";

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
  _textBoxEvents!: boolean;
  _themeOverride: Record<string, Record<string, unknown>> | undefined;
  _last_theme_update_key!: number;
  _client_disabled_set: boolean | undefined;
  _useNativeToolTips!: boolean;
  _useNativeToolTips_set!: boolean;
  _has_own_tooltips: ToolTipState | undefined;
  _tooltip_timer: number | undefined;
  pathUndoGen!: number;
  _lastPathUndoGen!: number;
  _useDataPathUndo: boolean | undefined;
  _active_animations!: Animator[];
  _screenStyleTag!: HTMLStyleElement;
  _screenStyleUpdateHash!: number;
  shadow!: ShadowRoot;
  __cbs: [string, EventListener, AddEventListenerOptions | boolean | undefined][] = [];
  _wasAddedToNodeAtSomeTime!: boolean;
  visibleToPick!: boolean;
  _override_class: string | undefined;
  _parentWidget: UIBase<CTX, unknown> | undefined;
  _id!: string;
  default_overrides!: Record<string, unknown>;
  my_default_overrides!: Record<string, unknown>;
  class_default_overrides!: Record<string, Record<string, unknown>>;
  _description_final: string | undefined;
  _modaldata?: ModalState;
  accessor packflag: number = 0;
  _internalDisabled!: boolean;
  __disabledState!: boolean;
  _disdata: DisableData | undefined;
  // will be set later
  _ctx: CTX = undefined as unknown as CTX;
  _description: string | undefined;
  _init_done!: boolean;
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

  static graphNodeDef = EventNode.register(this, graph.uiBaseNodeDef);

  /** Returns previous icon flags */
  useIcons?: (bool_or_icon_number?: boolean | number) => number;

  graphExec(): void {
    graph.graphExec(this);
  }

  ensureGraph(): void {
    graph.ensureGraph(this);
  }

  playwrightId(id: string): this {
    this.setAttribute("data-testid", id);
    return this;
  }

  flagPropSocketUpdate(path: string): this {
    graph.flagPropSocketUpdate(this, path);
    return this;
  }

  getPropertySocket(prop: string, socktype: string): PropertySocket | undefined {
    return graph.getPropertySocket(this, prop, socktype);
  }

  ensurePropertySocket(prop: string, socktype: SocketType): PropertySocket {
    return graph.ensurePropertySocket(this, prop, socktype);
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
    return graph.dependsOn(this, dstProp, source, srcProp, srcCallback);
  }

  constructor() {
    super();

    init.initUIBase(this);
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
    props.setParentWidget(this, val);
  }

  get useDataPathUndo() {
    return props.getUseDataPathUndo(this);
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
    props.setDescription(this, val);
  }

  get background() {
    return this.__background;
  }

  set background(bg: string | undefined) {
    props.setBackground(this, bg);
  }

  get disabled() {
    return props.getDisabled(this);
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
    props.setCtx(this, c);
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
    return dom.getElementById(this, id);
  }

  unhide(): void {
    this.hide(false);
  }

  findArea(): Area | undefined {
    return dom.findArea(this);
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
    dom.addEventListener(this, type, cb, options);
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
    dom.removeEventListener(this, type as string, cb as EventListener, options);
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
    dom.regenTabOrder(this);
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
    return dom.replaceChild(this, newnode, oldnode);
  }

  swapWith(b: UIBase<CTX>): boolean {
    return dom.swapWith(this, b);
  }

  traverse(
    type_or_set:
      | (new (...args: unknown[]) => UIBase)
      | Set<new (...args: unknown[]) => UIBase>
      | (new (...args: unknown[]) => UIBase)[]
  ): Generator<UIBase> {
    return dom.traverse(this, type_or_set);
  }

  appendChild<T extends Node>(child: T): T {
    return dom.appendChild(this, child);
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
    dom.initElement(this);
  }

  _ondestroy(): void {
    init.ondestroy(this);
  }

  remove(trigger_on_destroy = true): void {
    dom.remove(this, trigger_on_destroy);
  }

  /*
   *
   * called when elements are removed.
   * you should assume the element will be reused later;
   * on_destroy is the callback for when elements are permanently destroyed
   * */
  on_remove(): void {}

  removeChild<T extends Node | UIBase<CTX>>(child: T, trigger_on_destroy = true): T {
    return dom.removeChild(this, child as unknown as Node, trigger_on_destroy) as unknown as T;
  }

  flushUpdate(force = false): void {
    init.flushUpdate(this, force);
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
    init.forEachChildWidget(this, cb as (n: UIBase) => void, thisvar);
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
    return props.toJSON(this);
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
    init.doOnce(this, func, timeout);
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
    graph.updateEventGraph(this);
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
    init.update(this);
  }

  onadd(): void {
    init.onadd(this);
  }

  getZoom(): number {
    return props.getZoom(this);
  }

  /**try to use this method

   scaling ratio (e.g. for high-resolution displays)
   for zoom ratio use getZoom()
   */
  getDPI(): number {
    return props.getDPI(this, UIBase.getDPI);
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
    props.clearOverride(this, key, localOnly);
    return this;
  }

  overrideDefault(key: string, val: unknown, localOnly = false): this {
    props.overrideDefault(this, key, val, localOnly);
    return this;
  }

  overrideClass(style: string): void {
    this._override_class = style;
  }

  overrideClassDefault(style: string, key: string, val: unknown): void {
    props.overrideClassDefault(this, style, key, val);
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
