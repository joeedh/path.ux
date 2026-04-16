import { IContextBase } from "../core/context_base.js";
import { ColumnFrame, RowFrame, Label } from "../core/ui.js";
import { IconCheck } from "./ui_widgets.js";
export declare class PanelContents<CTX extends IContextBase = IContextBase> extends ColumnFrame<CTX> {
    /** @deprecated use panelFrame */
    _panel: PanelFrame<CTX>;
    /** Owner PanelFrame<CTX> */
    panelFrame: PanelFrame<CTX>;
    get openClosedIcon(): IconCheck<CTX>;
    get closed(): boolean;
    set closed(v: boolean);
    get parentPanel(): PanelFrame<CTX> | undefined;
    remove(): void;
    static define(): {
        tagname: string;
    };
}
export declare class PanelFrame<CTX extends IContextBase = IContextBase> extends ColumnFrame<CTX> {
    titleframe: RowFrame<CTX>;
    contents: PanelContents<CTX>;
    _iconcheckWidget: IconCheck<CTX>;
    __label: Label<CTX>;
    _closed: boolean;
    _state: boolean | undefined;
    _panel: this;
    get openCloseIcon(): IconCheck<CTX>;
    private createContents;
    constructor();
    get inherit_packflag(): number;
    set inherit_packflag(val: number);
    get packflag(): number;
    set packflag(val: number);
    appendChild<T extends Node>(child: T): T;
    get headerLabel(): string;
    set headerLabel(v: string);
    get dataPrefix(): string;
    set dataPrefix(v: string);
    get closed(): boolean;
    set closed(val: boolean);
    static define(): {
        tagname: string;
        style: string;
        subclassChecksTheme: boolean;
    };
    setHeaderToolTip(tooltip: string): void;
    saveData(): ({
        scrollTop: number;
        scrollLeft: number;
    } | {
        scrollTop?: undefined;
        scrollLeft?: undefined;
    }) & {
        closed: boolean;
    };
    loadData(obj: Record<string, unknown>): this;
    clear(): this;
    makeHeader(): void;
    init(): void;
    setCSS(): void;
    on_disabled(): void;
    on_enabled(): void;
    update(): void;
    _onchange(isClosed: boolean): void;
    setAttribute(key: string, value: string): void;
    get noUpdateClosedContents(): boolean;
    set noUpdateClosedContents(v: boolean);
    _setVisible(isClosed: boolean, changed: boolean): void;
    _updateClosed(changed: boolean): void;
}
//# sourceMappingURL=ui_panel.d.ts.map