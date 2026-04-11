import { UIBase } from "../core/ui_base";
import { ValueButtonBase } from "./ui_widgets";
import { Vector2 } from "../path-controller/util/vectormath";
import { ColumnFrame, Container, Label } from "../core/ui";
import * as util from "../path-controller/util/util";
import { IContextBase } from "../core/context_base";
import { TextBox } from "./ui_textbox";
import { ToolPropertyTypes } from "../path-controller/toolsys";
export declare const sliderDomAttributes: Set<string>;
export declare const SliderDefaults: {
    stepIsRelative: boolean;
    expRate: number;
    radix: number;
    decimalPlaces: number;
    baseUnit: string;
    displayUnit: string;
    slideSpeed: number;
    step: number;
    sliderDisplayExp: number;
};
export declare class NumSlider<CTX extends IContextBase = IContextBase> extends ValueButtonBase<CTX> {
    _last_label: string | undefined;
    mdown: boolean;
    ma: InstanceType<typeof util.MovingAvg> | undefined;
    mpos: Vector2;
    start_mpos: Vector2;
    _last_overarrow: number;
    vertical: boolean;
    _last_disabled: boolean;
    _last_width: number;
    last_time: number;
    _on_click: ((e: PointerEvent) => void) | undefined;
    __pressed: boolean;
    g: CanvasRenderingContext2D;
    _name: string;
    _value: number;
    constructor();
    loadNumConstraints(prop?: ToolPropertyTypes | undefined, dom?: HTMLElement | UIBase<CTX, unknown>, onModifiedCallback?: (this: UIBase) => void): void;
    get value(): number;
    set value(val: number);
    /** Current name label.  If set to null label will
     * be pulled from the datapath api.*/
    get name(): string | null | undefined;
    /** Current name label.  If set to null label will
     * be pulled from the datapath api.*/
    set name(name: string | null | undefined);
    static define(): {
        tagname: string;
        style: string;
        parentStyle: string;
        havePickClipboard: boolean;
    };
    updateWidth(w_add?: number): void;
    updateDataPath(): void;
    update(): void;
    clipboardCopy(): void;
    clipboardPaste(): void;
    swapWithTextbox(): void;
    bindEvents(): void;
    overArrow(x: number, y: number): number;
    doRange(): void;
    setValue(value: number, fire_onchange?: boolean, setDataPath?: boolean, checkConstraints?: boolean): void;
    setMpos(e: PointerEvent): void;
    dragStart(e: PointerEvent): void;
    get _pressed(): boolean;
    set _pressed(v: boolean);
    setCSS(unused_setBG?: unknown, fromRedraw?: boolean): void;
    _repos_canvas(): void;
    updateDefaultSize(): void;
    updateName(force?: boolean): void;
    _genLabel(): string;
    _redraw(fromCSS?: boolean): void;
    _getArrowSize(): number;
}
export declare class NumSliderSimpleBase<CTX extends IContextBase> extends UIBase<CTX> {
    canvas: HTMLCanvasElement;
    g: CanvasRenderingContext2D | null;
    highlight: boolean;
    _value: number;
    ma: InstanceType<typeof util.MovingAvg> | undefined;
    _focus: boolean;
    modal: unknown;
    _last_slider_key: string;
    constructor();
    loadNumConstraints(prop?: ToolPropertyTypes | undefined, dom?: HTMLElement | UIBase<CTX, unknown>, onModifiedCallback?: (this: UIBase) => void): void;
    get value(): number;
    set value(val: number);
    static define(): {
        tagname: string;
        style: string;
        parentStyle: string;
    };
    setValue(val: number, fire_onchange?: boolean, setDataPath?: boolean): void;
    updateDataPath(): void;
    _setFromMouse(e: PointerEvent): void;
    _startModal(e: PointerEvent | undefined): void;
    init(): void;
    setHighlight(e: PointerEvent): void;
    _redraw(): void;
    isOverButton(e: PointerEvent): boolean;
    _invertButtonX(x: number): number;
    _getButtonPos(): number[];
    setCSS(): void;
    updateSize(): void;
    _ondestroy(): void;
    update(): void;
}
export declare class SliderWithTextbox<CTX extends IContextBase = IContextBase> extends ColumnFrame<CTX> {
    _value: number;
    _name: string | undefined;
    _lock_textbox: boolean;
    _labelOnTop: boolean | undefined;
    _last_label_on_top: boolean | undefined;
    container: Container<CTX>;
    _numslider: NumSlider<CTX>;
    _last_value: number | undefined;
    l: Label<CTX>;
    _textbox: TextBox<CTX>;
    constructor();
    get addLabel(): string | boolean;
    set addLabel(v: string | boolean);
    /**
     * whether to put label on top or to the left of sliders
     *
     * If undefined value will be either this.getAtttribute("labelOnTop"),
     * if "labelOnTop" attribute exists, or it will be this.getDefault("labelOnTop")
     * (theme default)
     **/
    get labelOnTop(): boolean;
    set labelOnTop(v: boolean);
    get numslider(): this["_numslider"];
    set numslider(v: this["_numslider"]);
    get editAsBaseUnit(): boolean | undefined;
    set editAsBaseUnit(v: boolean | undefined);
    get range(): [number, number] | undefined;
    set range(v: [number, number] | undefined);
    get step(): number | undefined;
    set step(v: number | undefined);
    get expRate(): number | undefined;
    set expRate(v: number | undefined);
    get decimalPlaces(): number | undefined;
    set decimalPlaces(v: number | undefined);
    get isInt(): boolean | undefined;
    set isInt(v: boolean | undefined);
    get slideSpeed(): number | undefined;
    set slideSpeed(v: number | undefined);
    get sliderDisplayExp(): number | undefined;
    set sliderDisplayExp(v: number | undefined);
    get radix(): number | undefined;
    set radix(v: number | undefined);
    get stepIsRelative(): boolean | undefined;
    set stepIsRelative(v: boolean | undefined);
    get displayUnit(): string | undefined;
    set displayUnit(val: string | undefined);
    get baseUnit(): string | undefined;
    set baseUnit(val: string | undefined);
    get realTimeTextBox(): boolean;
    set realTimeTextBox(val: boolean);
    get value(): number;
    set value(val: number);
    init(): void;
    rebuild(): void;
    updateTextBox(): void;
    linkTextBox(): void;
    setValue(val: number, fire_onchange?: boolean): void;
    updateName(): void;
    updateLabelOnTop(): void;
    updateDataPath(): void;
    update(): void;
    setCSS(): void;
}
export declare class NumSliderSimple<CTX extends IContextBase = IContextBase> extends SliderWithTextbox<CTX> {
    constructor();
    static define(): {
        tagname: string;
        style: string;
    };
    _redraw(): void;
}
export declare class NumSliderWithTextBox<CTX extends IContextBase = IContextBase> extends SliderWithTextbox<CTX> {
    constructor();
    static define(): {
        tagname: string;
        style: string;
    };
    update(): void;
    _redraw(): void;
}
export type NumSliderTypes<CTX extends IContextBase = IContextBase> = NumSlider<CTX> | NumSliderSimple<CTX> | NumSliderWithTextBox<CTX>;
//# sourceMappingURL=ui_numsliders.d.ts.map