import { Area, IAreaDef } from "../screen/ScreenArea.js";
import { Container } from "../core/ui.js";
import type { IContextBase } from "../core/context_base.js";
import type { Vector2 } from "../path-controller/util/vectormath.js";
export declare class SideBar<CTX extends IContextBase = IContextBase> extends Container<CTX> {
    header: Container<CTX>;
    _last_resize_key: number | undefined;
    _closed: boolean;
    closeIcon: ReturnType<Container<CTX>["iconbutton"]>;
    _openWidth: number | undefined;
    needsSetCSS: boolean;
    tabbar: ReturnType<Container<CTX>["tabs"]>;
    constructor();
    saveData(): Record<string, unknown>;
    loadData(obj: Record<string, unknown>): this;
    set closed(val: boolean);
    get closed(): boolean;
    get width(): number;
    set width(val: number);
    get height(): number;
    set height(val: number);
    static define(): {
        tagname: string;
        style: string;
    };
    tab(name: string): import("../pathux.js").TabItemContainer<CTX>;
    init(): void;
    setCSS(): void;
    update(): void;
}
export declare class Editor<CTX extends IContextBase = IContextBase> extends Area<CTX> {
    container: Container<CTX>;
    sidebar?: SideBar<CTX>;
    static makeMenuBar?: (ctx: unknown, container: unknown, menuBarEditor: unknown) => void;
    constructor();
    static define(): IAreaDef;
    static defineAPI(_api: unknown, strct: unknown): unknown;
    /** \param makeMenuBar function(ctx, container, menuBarEditor)
     *
     * example:
     *
     * function makeMenuBar(ctx, container, menuBarEditor) {
     *
     *  container.menu("File", [
     *    "app.new()",
     *    simple.Menu.SEP,
     *    "app.save()",
     *    "app.save(forceDialog=true)|Save As",
     *    "app.open"
     *  ]);
     * }
     * */
    static registerAppMenu(makeMenuBar: (ctx: unknown, container: unknown, menuBarEditor: unknown) => void): void;
    /** Registers class with Area system
     *  and nstructjs.  Uses nstructjs.inlineRegister
     *  to handle inheritance.
     **/
    static register(cls: any): void;
    makeSideBar(): SideBar<CTX>;
    on_resize(size: number[] | Vector2): void;
    static findEditor(cls?: typeof Area): Area<IContextBase<any, import("../pathux.js").IToolStack>> | undefined;
    getScreen(): import("../pathux.js").Screen<CTX>;
    init(): void;
    /** creates default header and puts it in this.header */
    makeHeader(container: Container<CTX>, add_note_area?: boolean, make_draggable?: boolean): Container<CTX>;
    /** called regularly */
    update(): void;
    /** */
    setCSS(): void;
}
//# sourceMappingURL=editor.d.ts.map