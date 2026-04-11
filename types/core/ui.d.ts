import { Check, IconButton, IconCheck } from "../widgets/ui_widgets";
import { FlagProperty, EnumProperty } from "../path-controller/toolsys";
import "../path-controller/util/html5_fileapi.js";
import { CSSFont } from "./cssfont.js";
import { UIBase } from "./ui_base.js";
import { EnumDef, IconMap } from "../path-controller/toolsys/toolprop.js";
import { DropBox, MenuTemplate } from "../widgets/ui_menu.js";
import { IContextBase } from "./context_base.js";
import type { TabContainer } from "../widgets/ui_tabs.js";
import { ToolOp } from "../path-controller/toolsys/toolsys";
import { NumSliderTypes } from "../pathux";
import { ListBox } from "../widgets/ui_listbox";
export type SliderArgs = {
    name?: string;
    defaultval?: number;
    min?: number;
    max?: number;
    step?: number;
    callback?: Function;
    packflag?: number;
    do_redraw?: boolean;
    isInt?: boolean;
    /** @deprecated */
    is_int?: boolean;
    decimalPlaces?: number;
};
export declare class Label<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
    dom: HTMLDivElement;
    shadow: ShadowRoot;
    _useDataPathUndo: boolean | undefined;
    _label: string;
    _lastText: string;
    _font: CSSFont | undefined;
    _last_font: string | undefined;
    _enabled_font: CSSFont | string | undefined;
    constructor();
    get font(): CSSFont | string | undefined;
    /**Set a font defined in ui_base.defaults
     e.g. DefaultText*/
    set font(fontDefaultName: CSSFont | string | undefined);
    get text(): string;
    set text(text: string);
    static define(): {
        tagname: string;
        style: string;
    };
    init(): void;
    setCSS(): void;
    on_disabled(): void;
    on_enabled(): void;
    _updateFont(): void;
    updateDataPath(): void;
    update(): void;
}
export declare class Container<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
    shadow: ShadowRoot;
    _useDataPathUndo: boolean | undefined;
    div: HTMLElement;
    accessor dataPrefix: string;
    accessor massSetPrefix: string;
    accessor inherit_packflag: number;
    styletag: HTMLStyleElement;
    reversed: boolean;
    storagePrefix: string;
    _prefixstack: string[];
    _mass_prefixstack: string[];
    constructor();
    noUndo(): this;
    set background(bg: string);
    get childWidgets(): UIBase<CTX>[];
    static define(): {
        tagname: string;
    };
    /** recursively change path prefix for all children*/
    changePathPrefix(newprefix: string): void;
    reverse(): this;
    pushMassSetPrefix(val: string): this;
    pushDataPrefix(val: string): this;
    popDataPrefix(): this;
    popMassSetPrefix(): this;
    saveData(): {
        scrollTop: number;
        scrollLeft: number;
    } | {
        scrollTop?: undefined;
        scrollLeft?: undefined;
    };
    loadData(obj: Record<string, unknown>): this;
    init(): void;
    /** Returns previous icon flags */
    useIcons: (enabled_or_sheet?: boolean | number) => number;
    /**
     *
     * @param mode: flexbox wrap mode, can be wrap, nowrap, or wrap-reverse
     * @returns {Container}
     */
    wrap(mode?: string): this;
    noMarginsOrPadding(): this;
    setCSS(): void;
    overrideDefault(key: string, val: string | number): this;
    strip(themeClass_or_obj?: string | any, margin1?: number, margin2?: number, horiz?: boolean | undefined): Container<CTX>;
    /**
     * tries to set margin along one axis only in smart manner
     * */
    oneAxisMargin(m?: number | string, m2?: number): this;
    /**
     * tries to set padding along one axis only in smart manner
     * */
    oneAxisPadding(axisPadding?: number | string, otherPadding?: number): this;
    setMargin(m: number): this;
    setPadding(m: number): this;
    setSize(width: number | string | undefined, height: number | string | undefined): this;
    save(): void;
    load(): void;
    saveVisibility(): this;
    loadVisibility(): boolean;
    toJSON(): Record<string, unknown> & {
        opened: boolean;
    };
    _ondestroy(): void;
    loadJSON(obj: Record<string, unknown>): this;
    redrawCurves(): void;
    listen(): void;
    update(): void;
    appendChild<T extends Node>(child: T): T;
    clear(trigger_on_destroy?: boolean): void;
    prepend(child: Node): void;
    _prepend(child: UIBase<CTX>): UIBase<CTX, unknown>;
    add(child: UIBase<CTX>): UIBase<CTX, unknown>;
    insert(i: number, ch: UIBase<CTX>): void;
    _add(child: UIBase<CTX>, prepend?: boolean): UIBase<CTX, unknown>;
    dynamicMenu(title: string, list: MenuTemplate, packflag?: number): DropBox<CTX>;
    /**example usage:
  
     .menu([
     "some_tool_path.tool()|CustomLabel",
     ui_widgets.Menu.SEP,
     "some_tool_path.another_tool()",
     "some_tool_path.another_tool()|CustomLabel::Custom Hotkey String",
     ["Name", () => {console.log("do something")}]
     ])
  
     **/
    menu(title: string, list: MenuTemplate, packflag?: number): DropBox<CTX>;
    toolPanel(path_or_cls: string | typeof ToolOp, args?: Record<string, unknown>): Container<IContextBase<any, import("../pathux").IToolStack>>;
    tool(path_or_cls: string | typeof ToolOp, packflag_or_args?: number | Record<string, unknown>, createCb?: Function, label?: string): UIBase<IContextBase<any, import("../pathux").IToolStack>, unknown> | undefined;
    textbox(inpath?: string, text?: string, cb?: Function, packflag?: number): UIBase;
    pathlabel(inpath?: string, label?: string, packflag?: number): UIBase<CTX>;
    label(text: string): Label<CTX>;
    /**
     *
     * makes a button for a help picker tool
     * to view tooltips on mobile devices
     * */
    helppicker(): IconButton<CTX, unknown>;
    iconbutton(icon: number, description: string, cb?: () => void, thisvar?: unknown, packflag?: number): IconButton<CTX, unknown>;
    button(label: string, cb?: () => void, thisvar?: unknown, id?: unknown, packflag?: number): UIBase<CTX>;
    _joinPrefix(path?: string, prefix?: string): string | undefined;
    colorbutton(inpath: string | undefined, packflag?: number, mass_set_path?: string): UIBase<CTX>;
    noteframe(packflag?: number): UIBase<CTX>;
    curve1d(inpath?: string, packflag?: number, mass_set_path?: string): UIBase<CTX>;
    vecpopup(inpath?: string, packflag?: number, mass_set_path?: string): UIBase<CTX>;
    _getMassPath(ctx: CTX, inpath?: string, mass_set_path?: string): string | undefined;
    prop(inpath: string, packflag?: number, mass_set_path?: string): UIBase<CTX>;
    iconcheck(inpath: string | undefined, icon: number, description?: string, mass_set_path?: string): IconCheck<CTX>;
    check(inpath: string | undefined, name: string, packflag?: number, mass_set_path?: string): Check<CTX> | IconCheck<CTX>;
    checkenum(inpath: string | undefined, name?: string | Record<string, unknown> | null, packflag?: number, enummap?: unknown, defaultval?: unknown, callback?: Function, iconmap?: unknown, mass_set_path?: string): UIBase<CTX>;
    checkenum_panel(inpath: string, name?: string, packflag?: number, callback?: Function, mass_set_path?: string, prop?: FlagProperty | EnumProperty): Container<CTX> | undefined;
    listenum(inpath: string | undefined, name?: string | {
        name: string;
        enumDef?: EnumProperty | FlagProperty | EnumDef;
        defaultval?: string | number;
        callback?: Function;
        iconmap?: Record<string, number>;
        packflag?: number;
        mass_set_path?: string;
    }, enumDef?: EnumProperty | FlagProperty | EnumDef, defaultval?: number | string, callback?: Function, iconmap?: IconMap, packflag?: number): DropBox<CTX>;
    getroot(): Container<CTX>;
    simpleslider(datapath: string | undefined, name?: string | SliderArgs, defaultval?: number, min?: number, max?: number, step?: number, isInt?: boolean, do_redraw?: boolean, callback?: Function, packflag?: number): NumSliderTypes<CTX>;
    /**
     *
     * usage: .slider(inpath, {
     *  name : bleh,
     *  defaultval : number,
     *  etc...
     * });
     * */
    slider(datapath: string | undefined, name?: string | SliderArgs, defaultval?: number, min?: number, max?: number, step?: number, is_int?: boolean, do_redraw?: boolean, callback?: Function, packflag?: number, decimalPlaces?: number): NumSliderTypes<CTX>;
    _container_inherit(elem: UIBase<CTX>, packflag?: number): void;
    treeview(): UIBase<CTX, unknown>;
    panel(name: string, id?: string, packflag?: number, tooltip?: string): import("../pathux").PanelContents<CTX>;
    row(packflag?: number): RowFrame<CTX>;
    listbox<IDType extends string | number = string | number>(packflag?: number): ListBox<CTX, IDType>;
    table(packflag?: number): TableFrame<CTX>;
    twocol(parentDepth?: number, packflag?: number): TwoColumnFrame<CTX>;
    col(packflag?: number): ColumnFrame<CTX>;
    colorPicker(inpath?: string, packflag_or_args?: number | Record<string, unknown>, mass_set_path?: string, themeOverride?: string): UIBase<CTX>;
    textarea(datapath?: string, value?: string, packflag?: number, mass_set_path?: string): UIBase<CTX>;
    /**
     * html5 viewer
     * */
    viewer(datapath?: string, value?: string, packflag?: number, mass_set_path?: string): UIBase<CTX>;
    tabs(position?: "top" | "bottom" | "left" | "right", packflag?: number): TabContainer<CTX>;
    asDialogFooter(): this;
}
export declare class RowFrame<CTX extends IContextBase = IContextBase> extends Container<CTX> {
    constructor();
    static define(): {
        tagname: string;
    };
    connectedCallback(): void;
    init(): void;
    oneAxisMargin(m?: number | string, m2?: number): this;
    oneAxisPadding(m?: number | string, m2?: number): this;
    update(): void;
}
export declare class ColumnFrame<CTX extends IContextBase = IContextBase> extends Container<CTX> {
    constructor();
    static define(): {
        tagname: string;
    };
    init(): void;
    update(): void;
    oneAxisMargin(m?: number | string, m2?: number): this;
    oneAxisPadding(m?: number | string, m2?: number): this;
}
export declare class TableFrame<CTX extends IContextBase = IContextBase> extends Container<CTX> {
    static define(): {
        tagname: string;
    };
}
export declare class TwoColumnFrame<CTX extends IContextBase = IContextBase> extends Container<CTX> {
    _colWidth: number;
    parentDepth: number;
    constructor();
    get colWidth(): number;
    set colWidth(v: number);
    static define(): {
        tagname: string;
    };
    init(): void;
    update(): void;
}
//# sourceMappingURL=ui.d.ts.map