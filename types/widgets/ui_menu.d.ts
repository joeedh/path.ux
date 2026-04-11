import { UIBase } from "../core/ui_base";
import * as toolprop from "../path-controller/toolsys/toolprop";
import { OldButton } from "./ui_button";
import type { IContextBase } from "../core/context_base";
import type { Screen } from "../screen/FrameManager";
export declare const SEP: unique symbol;
export type SEP = symbol;
export type MenuTemplateTool = string;
export type MenuTemplateCustom = [
    name: string,
    func: <CTX>(ctx: CTX) => void,
    hotkey?: string,
    icon?: number,
    tooltip?: string,
    id?: string | number
];
export type MenuItemCallback = (dom: HTMLElement) => HTMLElement;
/** Old array form; [label, hotkey?:string|HotKey, icon?:number, tooltip?:string id?:any */
export type MenuTemplateItem = SEP | MenuTemplateTool | MenuTemplateCustom | MenuItemCallback | Menu;
export type MenuTemplate = MenuTemplateItem[];
/** Menu item: an HTMLLIElement with extra properties attached at runtime */
interface MenuItem extends HTMLLIElement {
    _id: string | number;
    _isMenu: boolean;
    _menu?: Menu;
    hotkey?: string;
    icon?: number;
    label?: string;
}
/** Type for popup container returned by Screen.popup() */
type PopupContainer<CTX extends IContextBase = IContextBase> = UIBase<CTX> & {
    noMarginsOrPadding(): void;
    end(): void;
    add(child: UIBase<CTX>): void;
};
export declare class Menu<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
    static SEP: typeof SEP;
    parentMenu: Menu | undefined;
    _was_clicked: boolean;
    items: MenuItem[];
    autoSearchMode: boolean;
    _ignoreFocusEvents: boolean;
    closeOnMouseUp?: boolean;
    _submenu: Menu | undefined;
    ignoreFirstClick: number | boolean;
    itemindex: number;
    closed: boolean;
    started: boolean;
    activeItem: MenuItem | undefined;
    container: HTMLSpanElement;
    dom: HTMLUListElement;
    menustyle: HTMLStyleElement;
    hasSearchBox: boolean;
    textbox: UIBase<CTX> & {
        text: string;
        onchange: (() => void) | null;
        parentWidget: unknown;
    };
    _popup: PopupContainer | undefined;
    _dropbox: DropBox | undefined;
    _onclose: ((...args: unknown[]) => void) | undefined;
    _onselect: ((id: string | number) => void) | null;
    on_select?: (id: number | string) => void;
    constructor();
    static define(): {
        tagname: string;
        style: string;
    };
    float(x?: number, y?: number, zindex?: number | string, positionKey?: string): this;
    click(): void;
    _ondestroy(): void;
    init(): void;
    close(): void;
    _select(dir: number, focus?: boolean): void;
    selectPrev(focus?: boolean): void;
    selectNext(focus?: boolean): void;
    start_fancy(prepend?: boolean, setActive?: boolean): void;
    setActive(item: MenuItem | undefined, focus?: boolean): void;
    startFancy(prepend?: boolean, setActive?: boolean): void;
    start(prepend?: boolean, setActive?: boolean): void;
    addItemExtra(text: string, id: string | number, hotkey: string | undefined, icon?: number, add?: boolean, tooltip?: string): MenuItem;
    addItem(item: string | string | HTMLElement | Menu, id?: string | number, add?: boolean, tooltip?: string): MenuItem;
    _getBorderStyle(): string;
    buildStyle(): void;
    setCSS(): void;
    seperator(): this;
    menu(title: string): Menu<IContextBase<any, import("../pathux").IToolStack>>;
    calcSize(): void;
}
export declare class DropBox<CTX extends IContextBase = IContextBase> extends OldButton<CTX> {
    _menu: Menu<CTX> | undefined;
    prop?: toolprop.EnumProperty;
    lockTimer: number;
    _template: MenuTemplate | (() => MenuTemplate) | undefined;
    _searchMenuMode: boolean;
    altKey: number | undefined;
    _value: number | string;
    _last_datapath: string | undefined;
    _last_dbox_key: unknown;
    _popup: PopupContainer | undefined;
    _background: string | undefined;
    width: number;
    on_select?: ((id: string | number) => void) | undefined;
    _onselect?: ((id: string | number) => void) | undefined;
    _onchangeCallback: ((val: string | number) => void) | null;
    constructor();
    get searchMenuMode(): boolean;
    set searchMenuMode(v: boolean);
    get template(): MenuTemplate | (() => MenuTemplate) | undefined;
    set template(v: MenuTemplate | (() => MenuTemplate) | undefined);
    get value(): string | number;
    set value(v: string | number);
    get menu(): Menu<CTX> | undefined;
    set menu(val: Menu<CTX> | undefined);
    static define(): {
        tagname: string;
        style: string;
    };
    init(): void;
    setCSS(): void;
    _genLabel(): string;
    updateWidth(): number;
    updateBorders(): void;
    updateDataPath(): void;
    update(): void;
    _build_menu_template(): Menu<CTX>;
    _build_menu(): void;
    _onpress: (e: unknown) => void;
    _redraw(): void;
    _convertVal(val: string | number): string | number | undefined;
    setValue(val: string | number | undefined, setLabelOnly?: boolean): void;
}
export declare class MenuWrangler {
    screen: Screen | undefined;
    menustack: Menu[];
    lastPickElemTime: number;
    _closetimer: number;
    closeOnMouseUp: boolean | undefined;
    closereq: Menu | undefined;
    timer: ReturnType<typeof setInterval> | undefined;
    spawnreq: unknown;
    [k: string]: unknown;
    constructor();
    get closetimer(): number;
    set closetimer(v: number);
    get menu(): Menu<IContextBase<any, import("../pathux").IToolStack>> | undefined;
    pushMenu(menu: Menu): void;
    popMenu(_menu?: Menu): Menu<IContextBase<any, import("../pathux").IToolStack>> | undefined;
    endMenus(): void;
    searchKeyDown(e: KeyboardEvent): void;
    on_keydown(e: KeyboardEvent): void;
    on_pointerdown(e: PointerEvent): void;
    on_pointerup(e: PointerEvent): void;
    findMenu(x: number, y: number): Menu<any> | undefined;
    on_pointermove(e: PointerEvent): void;
    update(): void;
    startTimer(): void;
    stopTimer(): void;
}
export declare const menuWrangler: MenuWrangler;
export declare function startMenuEventWrangling(screen?: Screen): void;
export declare function setWranglerScreen<CTX extends IContextBase>(screen: Screen<CTX> | undefined): void;
export declare function getWranglerScreen(): Screen<IContextBase<any, import("../pathux").IToolStack>> | undefined;
export declare function createMenu<CTX extends IContextBase = IContextBase>(ctx: CTX, title: string, templ: MenuTemplate): Menu<CTX>;
export declare function startMenu(menu: Menu, x: number, y: number, searchMenuMode?: boolean, safetyDelay?: number): void;
export {};
//# sourceMappingURL=ui_menu.d.ts.map