import { UIBase } from "../core/ui_base.js";
import { IContextBase } from "../core/context_base.js";
export declare class ButtonEventBase<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
    _auto_depress: boolean;
    _highlight: boolean;
    accessor _pressed: boolean;
    _focus: number;
    _onpress: ((self: unknown) => void) | undefined;
    constructor();
    bindEvents(): void;
    _redraw(): void;
}
export declare class Button<CTX extends IContextBase = IContextBase> extends ButtonEventBase<CTX> {
    label: HTMLSpanElement;
    _pressedTime: number;
    _pressedTimeout: number;
    __pressed: boolean;
    _last_name: string | undefined;
    _last_disabled: boolean | undefined;
    constructor();
    get name(): string;
    set name(val: string);
    get _pressed(): boolean;
    set _pressed(v: boolean);
    static define(): {
        tagname: string;
        style: string;
    };
    init(): void;
    on_enabled(): void;
    on_disabled(): void;
    setCSS(): void;
    click(): void;
    _redraw(): void;
    updateDisabled(): void;
    update(): void;
}
export declare class OldButton<CTX extends IContextBase = IContextBase> extends ButtonEventBase<CTX> {
    _last_but_update_key: string | number;
    _name: string | undefined;
    _namePad: number | undefined;
    _leftPad: number;
    _rightPad: number;
    _last_w: number;
    _last_h: number;
    _last_dpi: number;
    _lastw: number | undefined;
    _lasth: number | undefined;
    dom: HTMLCanvasElement & {
        _background?: string;
        font?: string;
    };
    g: CanvasRenderingContext2D;
    _last_bg: string | undefined;
    _last_disabled: boolean;
    constructor();
    get r(): number;
    set r(val: number);
    static define(): {
        tagname: string;
        style: string;
    };
    click(): void;
    init(): void;
    setAttribute(key: string, val: string): void;
    updateDisabled(): void;
    updateDefaultSize(): void;
    _calcUpdateKey(): number;
    update(): void;
    setCSS(): void;
    updateBorders(dom?: HTMLElement): void;
    updateName(): void;
    updateWidth(w_add?: number): void;
    _repos_canvas(): void;
    updateDPI(): void;
    _genLabel(): string;
    _getSubKey(): string;
    _redraw(draw_text?: boolean): void;
    _draw_text(): void;
}
//# sourceMappingURL=ui_button.d.ts.map