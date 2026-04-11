import { Container, RowFrame } from "../core/ui.js";
import { IContextBase } from "../core/context_base.js";
export declare class ListItem<CTX extends IContextBase = IContextBase, IDTYPE extends string | number = string | number> extends RowFrame<CTX> {
    highlight: boolean;
    is_active: boolean;
    listId: IDTYPE;
    constructor();
    static define(): {
        tagname: string;
        style: string;
    };
    init(): void;
    setBackground(): void;
    setCSS(): void;
}
export interface ListItems<CTX extends IContextBase = IContextBase, IDTYPE extends string | number = string | number> extends Array<ListItem<CTX, IDTYPE>> {
    active?: ListItem<CTX, IDTYPE> | undefined;
}
export declare class ListBox<CTX extends IContextBase = IContextBase, IDTYPE extends string | number = string | number> extends Container<CTX> {
    items: ListItems<CTX, IDTYPE>;
    idmap: Record<IDTYPE, ListItem<CTX, IDTYPE>>;
    highlight: boolean;
    is_active: boolean;
    on_change?: (val: IDTYPE | undefined, item: ListItem<CTX, IDTYPE> | undefined) => void;
    constructor();
    static define(): {
        tagname: string;
        style: string;
    };
    setCSS(): void;
    init(): void;
    addItem(name: string, id?: number): ListItem<CTX, IDTYPE>;
    removeItem(item: ListItem<CTX, IDTYPE> | IDTYPE): void;
    setActive(item: ListItem<CTX, IDTYPE> | IDTYPE | undefined): void;
    clear(): void;
}
//# sourceMappingURL=ui_listbox.d.ts.map