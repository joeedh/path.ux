import "../util/ScreenOverdraw.js";
import { Container } from "../core/ui.js";
import { IContextBase } from "../core/context_base.js";
export declare class TreeItem<CTX extends IContextBase = IContextBase> extends Container<CTX> {
    treeParent: TreeItem<CTX> | undefined;
    treeChildren: TreeItem<CTX>[];
    treeView: TreeView<CTX> | undefined;
    treeDepth: number;
    header: any;
    _icon1: any;
    _icon2: any;
    opened: boolean;
    _label: any;
    _labelText: string | HTMLElement;
    constructor();
    set icon(id: number);
    get icon(): number;
    open(): void;
    close(): void;
    set text(b: string | HTMLElement);
    get text(): string | HTMLElement;
    item(name: string, args?: any): any;
    init(): void;
    static define(): {
        tagname: string;
        style: string;
    };
}
export declare class TreeView<CTX extends IContextBase = IContextBase> extends Container<CTX> {
    items: TreeItem<CTX>[];
    strokes: any[];
    overdraw: any;
    constructor();
    init(): void;
    _forAllChildren(item: TreeItem<CTX>, cb: (n: TreeItem<CTX>) => void): void;
    _open(item: TreeItem<CTX>): void;
    _close(item: TreeItem<CTX>): void;
    _makeStrokes(): void;
    updateOverdraw(): void;
    update(): void;
    item(name: string, args?: {
        icon?: number;
        treeParent?: TreeItem<CTX>;
    }): TreeItem<CTX>;
    static define(): {
        tagname: string;
        style: string;
    };
}
//# sourceMappingURL=ui_treeview.d.ts.map