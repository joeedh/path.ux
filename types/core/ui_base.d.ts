import type { Area } from "../screen/ScreenArea";
export type DefaultTypes = string | number | boolean | CSSFont;
export interface IUIBaseConstructor<T extends UIBase = UIBase> {
    new (): T;
    define(): {
        tagname: string;
        style?: string;
    };
    setDefault<T2 extends T>(element: T2): T2;
}
export declare const PackFlags: {
    readonly INHERIT_WIDTH: 1;
    readonly INHERIT_HEIGHT: 2;
    readonly VERTICAL: 4;
    readonly USE_ICONS: 8;
    readonly SMALL_ICON: 16;
    readonly LARGE_ICON: 32;
    readonly FORCE_PROP_LABELS: 64;
    readonly PUT_FLAG_CHECKS_IN_COLUMNS: 128;
    readonly WRAP_CHECKBOXES: 256;
    readonly STRIP_HORIZ: 512;
    readonly STRIP_VERT: 1024;
    readonly STRIP: number;
    readonly SIMPLE_NUMSLIDERS: 2048;
    readonly FORCE_ROLLER_SLIDER: 4096;
    readonly HIDE_CHECK_MARKS: number;
    readonly NO_NUMSLIDER_TEXTBOX: number;
    readonly CUSTOM_ICON_SHEET: number;
    readonly CUSTOM_ICON_SHEET_START: 20;
    readonly NO_UPDATE: number;
    readonly LABEL_ON_RIGHT: number;
};
export declare function _setTextboxClass(cls: new (...args: unknown[]) => HTMLElement): void;
import { Animator } from "./anim.js";
import "./units.js";
import * as util from "../path-controller/util/util.js";
import * as vectormath from "../path-controller/util/vectormath";
import * as toolprop from "../path-controller/toolsys/toolprop.js";
import { ModalState } from "../path-controller/util/simple_events.js";
export * from "./ui_theme.js";
import { ThemeRecord } from "./ui_theme.js";
export declare const ElementClasses: (typeof UIBase)[];
export { theme } from "./ui_theme.js";
export { Icons } from "../icon_enum.js";
export { setIconMap } from "../icon_enum.js";
export declare const ErrorColors: {
    WARNING: string;
    ERROR: string;
    OK: string;
};
declare const EventCBSymbol: unique symbol;
/**
 * Sets tag prefix for pathux html elements.
 * Must be called prior to loading other modules.
 * Since this is tricky, you can alternatively
 * add a script tag with the prefix with the id "pathux-tag-prefix",
 * e.g.<pre> <script type="text/plain" id="pathux-tag-prefix">prefix</script> </pre>
 * */
export declare function setTagPrefix(prefix: string): void;
export declare function getTagPrefix(): string;
import { ClassIdSymbol } from "./ui_consts.js";
export { ClassIdSymbol };
export declare function setTheme(theme2: ThemeRecord): void;
export declare function report(...args: unknown[]): void;
export declare function getDefault(key: string, elem?: UIBase): unknown;
export declare function IsMobile(): boolean;
export declare const marginPaddingCSSKeys: string[];
interface CustomIconEntry {
    blobUrl: string;
    canvas: HTMLCanvasElement;
}
declare class _IconManager {
    tilex: number;
    tilesize: number;
    drawsize: number;
    customIcons: Map<number, CustomIconEntry>;
    image: HTMLImageElement;
    promise: util.TimeoutPromise<_IconManager> | undefined;
    _accept: ((value: _IconManager) => void) | undefined;
    _reject: ((reason?: unknown) => void) | undefined;
    constructor(image: HTMLImageElement, tilesize: number, number_of_horizontal_tiles: number, drawsize: number);
    get ready(): boolean;
    onReady(): Promise<_IconManager> | util.TimeoutPromise<_IconManager>;
    canvasDraw(elem: UIBase, canvas: HTMLCanvasElement, g: CanvasRenderingContext2D, icon: number, x?: number, y?: number): void;
    setCSS(icon: number, dom: HTMLElement, fitsize?: number | number[] | undefined): void;
    getCSS(icon: number, fitsize?: number | number[]): string;
}
export declare class CustomIcon {
    key: string;
    baseImage: HTMLImageElement;
    images: HTMLCanvasElement[];
    id: number;
    manager: IconManager;
    constructor(manager: IconManager, key: string, id: number, baseImage: HTMLImageElement);
    regenIcons(): void;
}
export declare class IconManager {
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
    constructor(images: (HTMLImageElement | null)[], sizes?: (number | [number, number])[], horizontal_tile_count?: number);
    isReady(sheet?: number): boolean;
    addCustomIcon(key: string, image: HTMLImageElement): number;
    load(manager2: IconManager): this;
    reset(horizontal_tile_count: number): void;
    add(image: HTMLImageElement, size: number, drawsize?: number): this;
    canvasDraw(elem: UIBase, canvas: HTMLCanvasElement, g: CanvasRenderingContext2D, icon: number, x?: number, y?: number, sheet?: number): void;
    findClosestSheet(size: number): number;
    findSheet(sheet: number | undefined): _IconManager;
    getTileSize(sheet?: number): number;
    getRealSize(sheet?: number): number;
    getCSS(icon: number, sheet?: number): string;
    setCSS(icon: number, dom: HTMLElement, sheet?: number, fitsize?: number | number[] | undefined): void;
}
declare let iconmanager: IconManager;
export { iconmanager };
export declare const IconSheets: Record<string, number>;
export declare function iconSheetFromPackFlag(flag: number): number;
export declare function getIconManager(): IconManager;
export declare function setIconManager(manager: IconManager, IconSheetsOverride?: Record<string, number>): void;
export declare function makeIconDiv(icon: number, sheet?: number): HTMLDivElement;
export declare const dpistack: number[];
export declare const UIFlags: Record<string, number>;
import { EventNode, PropertySocket, SocketType } from "../path-controller/dag/eventdag.js";
import type { IContextBase } from "./context_base.js";
import { CSSFont } from "./cssfont.js";
export declare const _testSetScrollbars: (color?: string, contrast?: number, width?: number, border?: string) => string;
export declare function styleScrollBars(color?: string, color2?: string | undefined, contrast?: number, width?: number, border?: string, selector?: string): string;
export declare function calcThemeKey(digest?: util.HashDigest): number;
export declare let _themeUpdateKey: number;
export declare function flagThemeUpdate(): void;
export declare function internalSetTimeout(cb: () => void, timeout?: number): void;
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
export type EventIF = {
    [k: string]: Event;
};
/**
 * ExtraEvents specifies custom events that are not part of HTMLElementEventMap,
 * it is a mapping from event names to the type that's passed to downstream event handlers
 */
export declare class UIBase<CTX extends IContextBase = IContextBase, VALUE extends unknown | any = unknown> extends HTMLElement {
    #private;
    static PositionKey: string;
    ["constructor"]: IUIBaseConstructor<this>;
    _tool_tip_abort_delay: number | undefined;
    _tooltip_ref: {
        remove(): void;
    } | undefined;
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
    shadow: ShadowRoot;
    __cbs: [string, EventListener, AddEventListenerOptions | boolean | undefined][];
    _wasAddedToNodeAtSomeTime: boolean;
    visibleToPick: boolean;
    _override_class: string | undefined;
    _parentWidget: UIBase<CTX, unknown> | undefined;
    _id: string;
    default_overrides: Record<string, unknown>;
    my_default_overrides: Record<string, unknown>;
    class_default_overrides: Record<string, Record<string, unknown>>;
    _last_description: string | undefined;
    _description_final: string | undefined;
    _modaldata?: ModalState;
    accessor packflag: number;
    _internalDisabled: boolean;
    __disabledState: boolean;
    _disdata: DisableData | undefined;
    _ctx: CTX;
    _description: string | undefined;
    _init_done: boolean;
    __background?: string;
    _flashtimer?: number;
    _flashcolor: string | undefined;
    _clipboard_over: boolean;
    _last_clipboard_keyevt: KeyboardEvent | undefined;
    _clipboard_keystart: () => void;
    _clipboard_keyend: () => void;
    _clipboard_keydown: (e: KeyboardEvent, internal_mode?: boolean) => void;
    _clipboard_events: boolean;
    graphNode?: EventNode;
    accessor baseUnit: string | undefined;
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
    get value(): VALUE;
    set value(value: VALUE);
    ondestroy?: () => void;
    getValue?: () => unknown;
    onchange: ((val: unknown) => void) | null;
    static graphNodeDef: import("../path-controller/dag/eventdag.js").GraphNodeDef;
    /** Returns previous icon flags */
    useIcons?: (bool_or_icon_number?: boolean | number) => number;
    graphExec(): void;
    ensureGraph(): void;
    playwrightId(id: string): this;
    flagPropSocketUpdate(path: string): this;
    getPropertySocket(prop: string, socktype: string): PropertySocket | undefined;
    ensurePropertySocket(prop: string, socktype: SocketType): PropertySocket;
    dependsOn(dstProp: string, source: UIBase<CTX>, srcProp: string, srcCallback?: (v: unknown) => unknown, dstCallback?: (v: unknown) => unknown): PropertySocket;
    constructor();
    get useNativeToolTips(): boolean;
    set useNativeToolTips(val: boolean);
    get parentWidget(): UIBase<CTX> | undefined;
    set parentWidget(val: UIBase<CTX> | undefined);
    get useDataPathUndo(): boolean;
    /**
     causes calls to setPathValue to go through
     toolpath app.datapath_set(path="" newValueJSON="")
  
     every child will inherit
     */
    set useDataPathUndo(val: boolean);
    get description(): string | undefined;
    set description(val: string | undefined);
    get background(): string | undefined;
    set background(bg: string | undefined);
    get disabled(): boolean;
    set disabled(v: boolean);
    get internalDisabled(): boolean;
    set internalDisabled(val: boolean);
    get ctx(): CTX;
    set ctx(c: CTX);
    get _reportCtxName(): string;
    get modalRunning(): boolean;
    static getIconEnum(): Record<string, number>;
    static setDefault<T extends UIBase>(element: T): T;
    /**DEPRECATED
  
     scaling ratio (e.g. for high-resolution displays)
     */
    static getDPI(): number;
    static prefix(name: string): string;
    static internalRegister(cls: IUIBaseConstructor): void;
    static getInternalName(name: string): string | undefined;
    static createElement<T extends UIBase | HTMLElement = HTMLElement>(name: string, internal?: boolean): T;
    static isRegistered(cls: IUIBaseConstructor): boolean;
    static register(cls: IUIBaseConstructor): void;
    static unregister(cls: IUIBaseConstructor): void;
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
    static define(): UIBaseDefinition;
    setUndo(val: boolean): this;
    flushHiddenState(hidden: boolean): void;
    get isVisible(): boolean;
    set hidden(state: boolean);
    get hidden(): boolean;
    hide(sethide?: boolean): this;
    getElementById(id: string): HTMLElement | undefined;
    unhide(): void;
    findArea(): Area | undefined;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, cb: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean): void;
    removeEventListener(type: string, cb: EventListener & {
        [EventCBSymbol]?: Map<string, EventListener>;
    }, options?: AddEventListenerOptions | boolean): void;
    connectedCallback(): void;
    noMarginsOrPadding(): this;
    /**
     * find owning screen and tell it to update
     * the global tab order
     * */
    regenTabOrder(): this;
    noMargins(): this;
    get saneStyle(): {
        [k: string]: string;
    };
    noPadding(): this;
    getTotalRect(): {
        width: number;
        height: number;
        x: number;
        y: number;
        left: number;
        top: number;
        right: number;
        bottom: number;
    } | undefined;
    parseNumber(value: string | number, args?: {
        baseUnit?: string;
        isInt?: boolean;
    }): number;
    formatNumber(value: number, args?: {
        baseUnit?: string;
        displayUnit?: string;
        isInt?: boolean;
        radix?: number;
        decimalPlaces?: number;
    }): string;
    setBoxCSS(subkey?: string): void;
    genBoxCSS(subkey?: string): string;
    setCSS(setBG?: boolean): void;
    setCSSAfter(cb: () => void): any;
    setCSSOnce(cb: () => void, arg: any): any;
    flushSetCSS(): void;
    replaceChild<T extends Node>(newnode: Node, oldnode: T): T;
    swapWith(b: UIBase<CTX>): boolean;
    traverse(type_or_set: (new (...args: unknown[]) => UIBase) | Set<new (...args: unknown[]) => UIBase> | (new (...args: unknown[]) => UIBase)[]): Generator<UIBase>;
    appendChild<T extends Node>(child: T): T;
    _clipboardHotkeyInit(): void;
    /** set havePickClipboard to true in define() to
     *  enable mouseover pick clipboarding */
    clipboardCopy(): void;
    clipboardPaste(): void;
    init(): void;
    _ondestroy(): void;
    remove(trigger_on_destroy?: boolean): void;
    on_remove(): void;
    removeChild<T extends Node | UIBase<CTX>>(child: T, trigger_on_destroy?: boolean): T;
    flushUpdate(force?: boolean): void;
    /**
     * Iterates over all child widgets,
     * including ones that might be inside
     * of normal DOM nodes.
     *
     * This is done by recursing into the dom
     * tree and stopping at any node that's
     * descended from ui_base.UIBase
     **/
    _forEachChildWidget(cb: (n: UIBase<CTX>) => void, thisvar?: unknown): void;
    checkInit(): boolean;
    _init(): boolean;
    getWinWidth(): number;
    getWinHeight(): number;
    calcZ(): number;
    pickElement<T extends UIBase<CTX> = UIBase<CTX>>(x: number, y: number, args?: {
        nodeclass?: IUIBaseConstructor;
        excluded_classes?: IUIBaseConstructor[];
        clip?: {
            pos: number[];
            size: number[];
        };
        mouseEvent?: MouseEvent | PointerEvent;
    }, marginy?: number, nodeclass?: IUIBaseConstructor, excluded_classes?: IUIBaseConstructor[]): T | undefined;
    __updateDisable(val: boolean): void;
    on_disabled(): void;
    on_enabled(): void;
    pushModal(handlers?: any, autoStopPropagation?: boolean, pointerId?: number, pointerElem?: UIBase): unknown;
    popModal(): void;
    /** child classes can override this to prevent focus on flash*/
    _flash_focus(): void;
    flash(colorIn: string | number[] | vectormath.Vector3 | vectormath.Vector4, rect_element?: UIBase | HTMLElement, timems?: number, autoFocus?: boolean): void;
    destroy(): void;
    on_resize(newsize: number[] | vectormath.Vector2): void;
    toJSON(): Record<string, unknown>;
    loadJSON(obj: Record<string, unknown>): void;
    getPathValue<T = unknown>(ctx: CTX, path: string): T | undefined;
    undoBreakPoint(): void;
    setPathValueUndo(ctx: CTX, path: string, val: unknown): void;
    loadNumConstraints(prop: toolprop.ToolProperty | undefined, dom?: HTMLElement | UIBase<CTX>, onModifiedCallback?: (this: UIBase) => void): void;
    pushReportContext(key: string): void;
    popReportContext(): void;
    pathSocketUpdate(ctx: unknown, path: string): this;
    setPathValue<T = unknown>(ctx: CTX, path: string, val: T): void;
    getPathMeta(ctx: CTX, path: string): import("../path-controller/toolsys/allprops.js").ToolPropertyTypes | undefined;
    getPathDescription(ctx: CTX, path: string): string | undefined;
    getScreen(): UIBase<CTX> | undefined;
    isDead(): boolean;
    doOnce(func: Function & {
        _doOnce?: (thisvar: UIBase, trace: string) => void;
        _doOnce_reqs?: Set<string>;
    }, timeout?: number): void;
    float(x?: number, y?: number, zindex?: number | string, positionKey?: string): this;
    _ensureChildrenCtx(ctx?: CTX): void;
    checkThemeUpdate(): boolean;
    abortToolTips(delayMs?: number): this;
    updateToolTipHandlers(): void;
    updateToolTips(): void;
    updateEventGraph(): void;
    updateAfter(cb: () => void): any;
    update(): void;
    onadd(): void;
    getZoom(): number;
    /**try to use this method
  
     scaling ratio (e.g. for high-resolution displays)
     for zoom ratio use getZoom()
     */
    getDPI(): number;
    /**
     * for saving ui state.
     * see saveUIData() export
     *
     * should fail gracefully.
     */
    saveData(): Record<string, unknown>;
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
    loadData(obj: Record<string, unknown>): this;
    clearOverride(key: string, localOnly?: boolean): this;
    overrideDefault(key: string, val: unknown, localOnly?: boolean): this;
    overrideClass(style: string): void;
    overrideClassDefault(style: string, key: string, val: unknown): void;
    _doMobileDefault(key: string, val: unknown, obj?: Record<string, unknown>): unknown;
    hasDefault(key: string): boolean;
    hasSubDefault(key: string, subkey: string): boolean;
    _hasSubDefault(key: string, subkey: string, _themeDef?: Record<string, unknown>): boolean;
    hasClassSubDefault(key: string, subkey: string, inherit?: boolean): boolean;
    _hasClassSubDefault(key: string, subkey: string, inherit?: boolean, style?: string, themeDef?: Record<string, unknown>): boolean;
    /** get a sub style from a theme style class.
     *  note that if key is falsy then it just forwards to this.getDefault directly*/
    getSubDefault<T extends DefaultTypes = string>(key: string, subkey: string, backupkey?: string, defaultval?: T, inherit?: boolean): T;
    getDefault<T extends DefaultTypes = string>(key: string, checkForMobile?: boolean, defaultval?: unknown, inherit?: boolean): T;
    getDefault_intern(key: string, checkForMobile?: boolean, defaultval?: unknown, inherit?: boolean): unknown;
    getStyleClass(ignoreOverride?: boolean): string;
    /**
     * returns theme record data (including class overrides) associated with
     * styleClass.  If key is not undefined it will be used to only
     * include overrides that contains that key
     */
    private getStyleRecord;
    hasClassDefault(key: string): boolean;
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
    getClassDefault(key: string, checkForMobile?: boolean, defaultval?: unknown, inherit?: boolean): unknown;
    overrideTheme(themeOverride: Record<string, Record<string, unknown>>): this;
    getStyle(): string;
    /** returns a new Animator instance
     *
     * example:
     *
     * container.animate().goto("style.width", 500, 100, "ease");
     * */
    /** @deprecated Use DOM animation API*/
    animateOld(_extra_handlers?: Record<string, Function> | Keyframe[] | PropertyIndexedKeyframes | null, domAnimateOptions?: KeyframeAnimationOptions | number): Animator;
    abortAnimations(): void;
}
export declare function drawRoundBox2(elem: UIBase, options?: {
    canvas?: HTMLCanvasElement;
    g?: CanvasRenderingContext2D;
    width?: number;
    height?: number;
    r?: number;
    op?: string;
    color?: string;
    margin?: number;
    no_clear?: boolean;
}): void;
/**okay, I need to refactor this function,
 it needs to take x, y as well as width, height,
 and be usable for more use cases.*/
export declare function drawRoundBox(elem: UIBase, canvas?: HTMLCanvasElement, g?: CanvasRenderingContext2D, width?: number, height?: number, r?: number, op?: string, color?: string, margin?: number, no_clear?: boolean): void;
export declare function _getFont_new(elem: UIBase, size?: number, font?: string, do_dpi?: boolean): string;
export declare function getFont<T extends UIBase>(elem: T, size?: number, font?: string, do_dpi?: boolean): string;
export declare function _getFont<T extends UIBase>(elem: T, size?: number, font?: string, do_dpi?: boolean): string;
export declare function _ensureFont(elem: UIBase, canvas: HTMLCanvasElement & {
    font?: string;
}, g: CanvasRenderingContext2D, size?: number): void;
export declare function measureTextBlock(elem: UIBase, text: string, canvas?: HTMLCanvasElement & {
    font?: string;
    g?: CanvasRenderingContext2D;
}, g?: CanvasRenderingContext2D, size?: number, font?: CSSFont | string): {
    width: number;
    height: number;
};
export declare function measureText<CTX extends IContextBase = IContextBase>(elem: UIBase<CTX>, text: string, canvas?: (HTMLCanvasElement & {
    font?: string;
    g?: CanvasRenderingContext2D;
}) | {
    canvas?: HTMLCanvasElement;
    g?: CanvasRenderingContext2D;
    size?: number;
    font?: CSSFont | string;
}, g?: CanvasRenderingContext2D, size?: number, font?: CSSFont | string): TextMetrics & {
    width: number;
    height?: number;
};
export declare function drawText(elem: UIBase, x: number, y: number, text: string, args?: {
    canvas?: HTMLCanvasElement & {
        font?: string;
    };
    g?: CanvasRenderingContext2D;
    color?: string | number[];
    font?: CSSFont | string;
    size?: number;
}): void;
/**

 Saves UI layout data, like panel layouts, active tabs, etc.
 Uses the UIBase.prototype.[save/load]Data interface.

 Note that this is error-tolerant.
 */
export declare function saveUIData<CTX extends IContextBase = IContextBase>(node: UIBase<CTX>, key: string): string;
export declare function loadUIData<CTX extends IContextBase = IContextBase>(node: UIBase<CTX>, buf: string | null | undefined): void;
//# sourceMappingURL=ui_base.d.ts.map