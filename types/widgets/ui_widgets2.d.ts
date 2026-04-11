import "./ui_richedit.js";
import { Vector2, Vector3, Vector4, Quat } from "../path-controller/util/vectormath.js";
import { ColumnFrame } from "../core/ui.js";
import "./ui_widgets.js";
import { UIBase } from "../core/ui_base.js";
import { Button } from "./ui_button.js";
import { IContextBase } from "../core/context_base.js";
type AnySlider = UIBase & Record<string, unknown>;
export declare class VectorPopupButton<CTX extends IContextBase = IContextBase> extends Button<CTX> {
    _value: Vector2 | Vector3 | Vector4 | Quat;
    constructor();
    get value(): Vector2 | Vector3 | Vector4 | Quat;
    set value(v: Vector2 | Vector3 | Vector4 | Quat);
    private castValue;
    static define(): {
        tagname: string;
        style: string;
    };
    _onpress: (e: unknown) => void;
    updateDataPath(): void;
    update(): void;
}
export declare class VectorPanel<CTX extends IContextBase = IContextBase> extends ColumnFrame<CTX> {
    _value: Vector2 | Vector3 | Vector4 | Quat;
    name: string;
    axes: string;
    sliders: AnySlider[];
    hasUniformSlider: boolean;
    __range: [number, number];
    _range: [number, number];
    uslider: AnySlider | undefined;
    private castValue;
    get value(): Vector2 | Vector3 | Vector4 | Quat;
    set value(v: Vector2 | Vector3 | Vector4 | Quat);
    constructor();
    init(): void;
    _getNumParam(key: string): unknown;
    _setNumParam(key: string, val: unknown): void;
    rebuild(): void;
    get uniformValue(): number;
    set uniformValue(val: number);
    setValue(value: Vector2 | Vector3 | Vector4 | Quat | null | undefined): this | undefined;
    updateDataPath(): void;
    update(): void;
    static define(): {
        tagname: string;
    };
}
export declare class ToolTip<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
    div: HTMLDivElement;
    _start_time: number | undefined;
    timeout: number | undefined;
    _popup: {
        background: string;
        end(): void;
        style: CSSStyleDeclaration;
        add(child: UIBase): void;
    } | undefined;
    constructor();
    static show<CTX extends IContextBase = IContextBase>(message: string, screen: UIBase<CTX>, x: number, y: number): ToolTip<CTX>;
    end(): void;
    init(): void;
    set text(val: string);
    get text(): string;
    _estimateSize(): number[];
    update(): void;
    setCSS(): void;
    static define(): {
        tagname: string;
        style: string;
    };
}
export {};
//# sourceMappingURL=ui_widgets2.d.ts.map