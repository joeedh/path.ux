import { JSONAny } from "../path-controller/util/jsonUtils";
import * as events from "../path-controller/util/events";
import * as ui from "../core/ui";
import { IContextBase } from "../core/context_base";
import { UIBase } from "../core/ui_base";
import { CSSFont } from "../core/cssfont";
import { Vector2 } from "../util/vectormath";
export declare let tab_idgen: number;
export declare class TabItemContainer<CTX extends IContextBase = IContextBase> extends ui.ColumnFrame<CTX> {
    name: string;
    static define(): {
        tagname: string;
    };
    parentTabs: TabContainer<CTX>;
    _tab: TabItem<CTX>;
    getAttribute(name: string): string | null;
    setAttribute(name: string, value: string): void;
    noSwitch(): this;
    get ontabclick(): ((e: PointerEvent) => void) | null;
    set ontabclick(v: ((e: PointerEvent) => void) | null);
    get ontabdragmove(): ((e: PointerEvent) => void) | null;
    set ontabdragmove(v: ((e: PointerEvent) => void) | null);
    get ontabdragstart(): ((e: PointerEvent) => void) | null;
    set ontabdragstart(v: ((e: PointerEvent) => void) | null);
    get ontabdragend(): ((e: PointerEvent) => void) | null;
    set ontabdragend(v: ((e: PointerEvent) => void) | null);
}
type TabDragEvents = {
    tabclick: PointerEvent;
    tabdragstart: PointerEvent;
    tabdragmove: PointerEvent;
    tabdragend: PointerEvent;
};
/**
 * This is a kind of phantom buttom DOM element (elements are 100% drawn with canvas).
 **/
export declare class TabItem<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
    name: string;
    icon: number | undefined;
    tooltip: string;
    movable: boolean;
    tbar: TabBar<CTX>;
    noSwitch?: boolean;
    ontabclick: ((e: PointerEvent) => void) | null;
    ontabdragstart: ((e: PointerEvent) => void) | null;
    ontabdragmove: ((e: PointerEvent) => void) | null;
    ontabdragend: ((e: PointerEvent) => void) | null;
    dom: HTMLDivElement | undefined;
    extra: HTMLElement | undefined;
    extraSize: number | undefined;
    size: Vector2;
    pos: Vector2;
    abssize: Vector2;
    abspos: Vector2;
    watcher?: {
        timer?: number;
    };
    get parentTabBar(): TabBar<CTX>;
    constructor();
    addEventListener<K extends keyof (TabDragEvents & HTMLElementEventMap)>(type: K, listener: (this: HTMLElement, ev: (TabDragEvents & HTMLElementEventMap)[K]) => any, options?: boolean | AddEventListenerOptions): void;
    init(): void;
    static define(): {
        tagname: string;
    };
    sendEvent(type: string, forwardEvent?: Event): Event;
    getClientRects(): DOMRectList;
    setCSS(): void;
}
export declare class ModalTabMove<CTX extends IContextBase = IContextBase> extends events.EventHandler {
    dom: HTMLElement | UIBase<CTX>;
    tab: TabItem<CTX>;
    tbar: TabBar<CTX>;
    first: boolean;
    droptarget: Element | undefined | null;
    start_mpos: Vector2;
    mpos: [number, number] | undefined;
    dragtab: TabItem<CTX> | undefined;
    dragstate: boolean;
    finished: boolean;
    dragevent?: DragEvent;
    dragimg?: ImageData;
    dragcanvas?: HTMLCanvasElement & {
        visibleToPick?: boolean;
    };
    drag_g?: CanvasRenderingContext2D | null;
    constructor(tab: TabItem<CTX>, tbar: TabBar<CTX>, dom: HTMLElement | UIBase<CTX>);
    finish(): void;
    popModal(): void;
    on_pointerenter(e: PointerEvent): void;
    on_pointerleave(e: PointerEvent): void;
    on_pointerstart(e: PointerEvent): void;
    on_pointerend(e: PointerEvent): void;
    on_pointerdown(e: PointerEvent): void;
    on_pointercancel(e: PointerEvent): void;
    on_pointerup(e: PointerEvent): void;
    on_pointermove(e: PointerEvent): void;
    _dragstate(e: PointerEvent, x: number, y: number): void;
    _on_move(e: PointerEvent, x: number, y: number): void;
    on_keydown(e: KeyboardEvent): void;
}
export declare class TabBar<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
    iconsheet: number;
    movableTabs: boolean;
    tabFontScale: number;
    tabs: TabItem<CTX>[] & {
        active?: TabItem<CTX>;
        highlight?: TabItem<CTX>;
    };
    _last_style_key?: string;
    r: number;
    canvas: HTMLCanvasElement;
    g: CanvasRenderingContext2D;
    _last_dpi?: number;
    _last_pos?: string;
    horiz: boolean;
    onchange: ((tab: TabItem<CTX>, e?: Event) => void) | null;
    onselect: ((e: {
        tab?: TabItem<CTX>;
        defaultPrevented: boolean;
        preventDefault: () => void;
    }) => void) | null;
    _tool?: ModalTabMove<CTX>;
    _last_p_key?: string;
    _size_cb?: () => void;
    constructor();
    _doelement(e: PointerEvent, mx: number, my: number): void;
    _domouse(e: PointerEvent): void;
    _doclick(e: PointerEvent): void;
    on_pointerdown(e: PointerEvent): void;
    on_pointermove(e: PointerEvent): void;
    on_pointerup(e: PointerEvent): void;
    static setDefault<T extends UIBase>(element: T): T;
    static define(): {
        tagname: string;
        style: string;
    };
    _ensureNoModal(): void;
    get tool(): ModalTabMove<CTX> | undefined;
    set tool(v: ModalTabMove<CTX> | undefined);
    _startMove(tab?: TabItem<CTX> | undefined, event?: PointerEvent, pointerId?: number | undefined, pointerElem?: HTMLElement | HTMLDocument | Window | TabItem<CTX> | undefined): void;
    _fireOnSelect(): {
        tab: TabItem<CTX> | undefined;
        defaultPrevented: boolean;
        preventDefault(): void;
    };
    _makeOnSelectEvt(): {
        tab: TabItem<CTX> | undefined;
        defaultPrevented: boolean;
        preventDefault(): void;
    };
    getTab(name_or_id: string): TabItem<CTX> | undefined;
    clear(): void;
    saveData(): {
        taborder: string[];
        active: string;
    };
    loadData(obj: JSONAny): this;
    swapTabs(a: TabItem<CTX>, b: TabItem<CTX>): void;
    addIconTab(icon: number, id: string, tooltip: string, movable?: boolean): TabItem<CTX>;
    addTab(name: string, id: string, tooltip?: string, movable?: boolean): TabItem<CTX>;
    updatePos(force_update?: boolean): void;
    updateDPI(force_update?: boolean): void;
    updateCanvas(force_update?: boolean): void;
    _getFont(tsize?: number): CSSFont;
    _layout(): void;
    /** tab is a TabItem instance */
    setActive(tab: TabItem<CTX>, event?: Event): void;
    _redraw(): void;
    removeTab(tab: TabItem<CTX>): void;
    setCSS(): void;
    updateStyle(): void;
    update(force_update?: boolean): void;
}
export declare class TabContainer<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
    _style?: HTMLStyleElement;
    tbar: TabBar<CTX>;
    tabs: {
        [k: string]: TabItemContainer<CTX>;
    };
    tabFontScale: number;
    dataPrefix: "";
    inherit_packflag: number;
    _last_style_key: string;
    _last_horiz?: boolean;
    _last_bar_pos?: string | null;
    _tab?: TabItemContainer<CTX>;
    onchange?: (tab: TabItem<CTX>, event?: PointerEvent | KeyboardEvent) => void;
    onselect?: (e: any) => void;
    horiz: boolean;
    constructor();
    get movableTabs(): boolean;
    set movableTabs(val: boolean | string);
    get hideScrollBars(): boolean;
    set hideScrollBars(val: boolean | string);
    static setDefault<T extends UIBase<any>>(e: T): T;
    static define(): {
        tagname: string;
        style: string;
    };
    _startMove(tab?: TabItem<CTX> | undefined, event?: PointerEvent): void;
    _ensureNoModal(): void;
    saveData(): JSONAny;
    loadData(json: JSONAny): this;
    enableDrag(): void;
    clear(): void;
    init(): void;
    setCSS(): void;
    _remakeStyle(): void;
    icontab(icon: number, id: string, tooltip: string): TabItemContainer<CTX>;
    removeTab(tab: TabItemContainer<CTX>): void;
    tab(name: string, id?: string | number, tooltip?: string, movable?: boolean): TabItemContainer<CTX>;
    setActive(tab: TabItemContainer<CTX> | string): void;
    getTabCount(): number;
    moveTab(tab: TabItemContainer<CTX>, i: number): void;
    getTab(name_or_id: string | number): TabItemContainer<CTX>;
    updateBarPos(): void;
    updateHoriz(): void;
    updateStyle(): void;
    getActive(): TabItem<CTX> | undefined;
    update(): void;
}
export {};
//# sourceMappingURL=ui_tabs.d.ts.map