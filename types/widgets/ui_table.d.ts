import { Container } from "../core/ui";
import { IContextBase } from "../core/context_base";
import { UIBase } from "../core/ui_base";
/** Ad-hoc wrapper around a <tr> element that proxies Container methods. */
export interface TableRowProxy {
    _tr: HTMLTableRowElement;
    style: CSSStyleDeclaration;
    focus(args?: FocusOptions): void;
    blur(): void;
    remove(): void;
    addEventListener(type: string, cb: EventListenerOrEventListenerObject, arg?: boolean | AddEventListenerOptions): void;
    removeEventListener(type: string, cb: EventListenerOrEventListenerObject, arg?: boolean | EventListenerOptions): void;
    setAttribute(attr: string, val: string): void;
    scrollTo(...args: unknown[]): void;
    scrollIntoView(...args: unknown[]): void;
    clear(): void;
    cell(): Container;
    tabIndex: number;
    background: string;
    label(...args: unknown[]): unknown;
    tool(...args: unknown[]): unknown;
    prop(...args: unknown[]): unknown;
    pathlabel(...args: unknown[]): unknown;
    button(...args: unknown[]): unknown;
    iconbutton(...args: unknown[]): unknown;
    textbox(...args: unknown[]): unknown;
    col(...args: unknown[]): unknown;
    row(...args: unknown[]): unknown;
    table(...args: unknown[]): unknown;
    listenum(...args: unknown[]): unknown;
    check(...args: unknown[]): unknown;
}
export declare class TableRow<CTX extends IContextBase = IContextBase> extends Container<CTX> {
    dom: HTMLTableRowElement;
    shadow: ShadowRoot;
    constructor();
    static define(): {
        tagname: string;
    };
    _add(child: UIBase<CTX>): UIBase<CTX, unknown>;
}
export declare class TableFrame<CTX extends IContextBase = IContextBase> extends Container<CTX> {
    dom: HTMLTableElement;
    constructor();
    update(): void;
    _add(child: UIBase<CTX>): UIBase<CTX, unknown>;
    add(child: UIBase<CTX>): UIBase<CTX, unknown>;
    row(packflag?: number): any;
    clear(): void;
    static define(): {
        tagname: string;
    };
}
//# sourceMappingURL=ui_table.d.ts.map