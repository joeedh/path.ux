import { Container } from "../core/ui.js";
import { IContextBase } from "../core/context_base.js";
import { ModalState } from "../path-controller/util/simple_events.js";
export declare class DragBox<CTX extends IContextBase = IContextBase> extends Container<CTX> {
    _done: boolean;
    header: Container<CTX>;
    contents: Container<CTX>;
    _modal: ModalState | undefined;
    _onend: (() => void) | undefined;
    onend: (() => void) | undefined;
    constructor();
    init(): void;
    add(...args: any[]): any;
    prepend(...args: any[]): any;
    appendChild<T extends Node>(n: T): T;
    col(...args: any[]): any;
    row(...args: any[]): any;
    strip(...args: any[]): any;
    button(...args: any[]): any;
    iconbutton(...args: any[]): any;
    iconcheck(...args: any[]): any;
    tool(...args: any[]): any;
    menu(...args: any[]): any;
    prop(...args: any[]): any;
    listenum(...args: any[]): any;
    check(...args: any[]): any;
    iconenum(...args: any[]): any;
    slider(...args: any[]): any;
    simpleslider(...args: any[]): any;
    curve(...args: any[]): any;
    textbox(...args: any[]): any;
    textarea(...args: any[]): any;
    viewer(...args: any[]): any;
    panel(...args: any[]): any;
    tabs(...args: any[]): any;
    table(...args: any[]): any;
    end(): void;
    setCSS(): void;
    static define(): {
        tagname: string;
        style: string;
    };
}
//# sourceMappingURL=dragbox.d.ts.map