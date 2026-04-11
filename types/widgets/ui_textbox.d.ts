import { UIBase } from "../core/ui_base";
import { IContextBase } from "../core/context_base.js";
export declare class TextBoxBase<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
    static define(): {
        tagname: string;
        modalKeyEvents: boolean;
    };
}
export declare class TextBox<CTX extends IContextBase = IContextBase> extends TextBoxBase<CTX> {
    dom: HTMLInputElement;
    _editing: boolean;
    _width: string | number;
    _textBoxEvents: boolean;
    _had_error: boolean;
    _modal: unknown;
    _focus: number;
    onend?: (ok: boolean) => void;
    accessor radix: number;
    constructor();
    get startSelected(): boolean;
    set startSelected(v: boolean);
    /** realtime dom attribute getter, defaults to true in absence of attribute*/
    get realtime(): boolean;
    set realtime(val: boolean);
    get isModal(): boolean;
    set isModal(val: boolean);
    _startModal(): void;
    _flash_focus(): void;
    get editing(): boolean;
    _endModal(ok: boolean): void;
    get tabIndex(): number;
    set tabIndex(val: number);
    init(): void;
    set width(val: string | number);
    setCSS(): void;
    updateDataPath(): void;
    update(): void;
    select(): void;
    focus(): void;
    blur(): void;
    static define(): {
        tagname: string;
        style: string;
        modalKeyEvents: boolean;
    };
    get text(): string;
    set text(value: string);
    _prop_update(prop: any, text: string): void;
    _updatePathVal(text: string): void;
    _change(text: string): void;
}
/**

 Returns false if it's safe to call preventDefault.

 Returns true if the element at position x,y is
 either a textbox or is draggable.
 */
export declare function checkForTextBox<CTX extends IContextBase = IContextBase>(screen: UIBase<CTX>, x: number, y: number): boolean;
//# sourceMappingURL=ui_textbox.d.ts.map