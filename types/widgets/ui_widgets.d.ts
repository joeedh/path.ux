import * as ui_base from '../core/ui_base.js';
declare const UIBase: typeof ui_base.UIBase;
import { OldButton } from './ui_button.js';
import { IContextBase } from '../core/context_base.js';
export { Button } from './ui_button.js';
export declare class IconLabel<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
    _icon: number;
    iconsheet: number;
    constructor();
    get icon(): number;
    set icon(id: number);
    static define(): {
        tagname: string;
    };
    init(): void;
    setCSS(): void;
}
export declare class ValueButtonBase<CTX extends IContextBase = IContextBase> extends OldButton<CTX> {
    _value: unknown;
    constructor();
    get value(): unknown;
    set value(val: unknown);
    updateDataPath(): void;
    update(): void;
}
export declare class Check<CTX extends IContextBase = IContextBase> extends UIBase<CTX, boolean> {
    icon: number;
    iconsheet: number;
    _checked: boolean;
    _highlight: boolean | undefined;
    _focus: boolean;
    canvas: HTMLCanvasElement;
    g: CanvasRenderingContext2D;
    checkbox: HTMLCanvasElement;
    _label: HTMLLabelElement;
    _updatekey: string;
    _last_dpi: number;
    constructor();
    get internalDisabled(): boolean;
    set internalDisabled(val: boolean);
    get value(): boolean;
    set value(v: boolean);
    get checked(): boolean;
    set checked(v: boolean);
    get label(): string;
    set label(l: string);
    static define(): {
        tagname: string;
        style: string;
        parentStyle: string;
    };
    init(): void;
    setCSS(): void;
    updateDataPath(): void;
    _repos_canvas(): void;
    _redraw(): void;
    updateDPI(): void;
    update(): void;
}
export declare class IconButton<CTX extends IContextBase = IContextBase, VALUE = unknown> extends UIBase<CTX, VALUE> {
    _icon_pressed: number | undefined;
    _icon: number;
    iconsheet: number;
    _customIcon: HTMLImageElement | undefined;
    _pressed: boolean;
    _highlight: boolean;
    _draw_pressed: boolean;
    drawButtonBG: boolean;
    _extraIcon: number | undefined;
    extraDom: HTMLDivElement | undefined;
    _last_iconsheet: number | undefined;
    _onpress: ((e: {
        x: number;
        y: number;
        stopPropagation: () => void;
        preventDefault: () => void;
    }) => void) | undefined;
    dom: HTMLDivElement;
    constructor();
    click(): void;
    get customIcon(): HTMLImageElement | undefined;
    set customIcon(domImage: HTMLImageElement | undefined);
    get icon(): number;
    set icon(val: number);
    static define(): {
        tagname: string;
        style: string;
    };
    _on_press(_e?: Event): void;
    _on_depress(_e?: Event): void;
    updateDefaultSize(): void;
    setCSS(): void;
    init(): void;
    update(): void;
    getIconSize(): number;
    /** Get the icon size plus any padding. */
    getSize(): number;
    _getsize(): number;
}
export declare class IconCheck<CTX extends IContextBase = IContextBase> extends IconButton<CTX, boolean> {
    _checked: boolean | undefined;
    _drawCheck: boolean | undefined;
    constructor();
    get drawCheck(): boolean;
    set drawCheck(val: boolean);
    click(): void;
    get icon(): number;
    set icon(val: number);
    get checked(): boolean | undefined;
    set checked(val: boolean | undefined);
    get noEmboss(): boolean;
    set noEmboss(val: boolean);
    static define(): {
        tagname: string;
        style: string;
        parentStyle: string;
    };
    _updatePressed(val: boolean): void;
    _on_depress(_e?: Event): void;
    _on_press(_e?: Event): void;
    updateDefaultSize(): void;
    _calcUpdateKey(): string;
    updateDataPath(): void;
    updateDrawCheck(): void;
    update(): void;
    _getsize(): number;
    setCSS(): void;
}
export declare class Check1<CTX extends IContextBase = IContextBase> extends OldButton<CTX> {
    _value: unknown;
    constructor();
    static define(): {
        tagname: string;
        style: string;
        parentStyle: string;
    };
    _redraw(draw_text?: boolean): void;
}
export { checkForTextBox } from './ui_textbox.js';
//# sourceMappingURL=ui_widgets.d.ts.map