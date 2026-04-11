import { UIBase } from "../core/ui_base.js";
import { IContextBase } from "../core/context_base.js";
import { RowFrame } from "../core/ui.js";
import { TextBoxBase } from "./ui_textbox.js";
export declare class RichEditor<CTX extends IContextBase = IContextBase> extends TextBoxBase<CTX> {
    _internalDisabled: boolean;
    _value: string;
    textOnlyMode: boolean;
    styletag: HTMLStyleElement;
    controls: RowFrame<CTX>;
    textarea: HTMLDivElement;
    _focus: number;
    constructor();
    formatStart(): void;
    formatLine(line: string, text: string): string;
    toggleStrikeThru(): void;
    formatEnd(): void;
    init(): void;
    get internalDisabled(): boolean;
    set internalDisabled(val: boolean);
    set value(val: string);
    get value(): string;
    setCSS(): void;
    updateDataPath(): void;
    update(): void;
    static define(): {
        tagname: string;
        style: string;
        modalKeyEvents: boolean;
    };
}
export declare class RichViewer<CTX extends IContextBase = IContextBase> extends UIBase<CTX, string> {
    contents: HTMLDivElement;
    _value: string;
    constructor();
    hideScrollBars(): void;
    showScrollBars(): void;
    textTransform(text: string): string;
    set value(val: string);
    get value(): string;
    updateDataPath(): void;
    update(): void;
    static define(): {
        tagname: string;
        style: string;
    };
}
//# sourceMappingURL=ui_richedit.d.ts.map