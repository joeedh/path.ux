import { CurveTypeData } from "./curve1d_base.js";
import { Vector2 } from "../util/vectormath.js";
import * as util from "../util/util.js";
export declare class EquationCurve extends CurveTypeData<"EquationCurve"> {
    #private;
    parent: {
        xRange: InstanceType<typeof Vector2>;
        yRange: InstanceType<typeof Vector2>;
        redraw(): void;
        _on_change(): void;
        _fireEvent(evt: string, data: unknown): void;
    } | undefined;
    equation: string;
    _last_equation: string;
    _last_xrange: InstanceType<typeof Vector2>;
    _func: ((x: number) => number) | undefined;
    _haserror: boolean;
    hermite: number[] | undefined;
    uidata: Record<string, unknown> | undefined;
    constructor();
    get hasGUI(): boolean;
    static define(): {
        uiname: string;
        name: string;
        typeName: string;
    };
    calcHashKey(digest?: util.HashDigest): number;
    equals(b: CurveTypeData): boolean;
    toJSON(): {
        type: string;
    } & Record<string, unknown>;
    loadJSON(obj: Record<string, unknown>): this;
    makeGUI(container: Record<string, Function>, canvas?: HTMLCanvasElement & {
        g: CanvasRenderingContext2D;
    }, drawTransform?: [number, [number, number]]): void;
    killGUI(_container: Record<string, Function>): void;
    updateTextBox(): void;
    evaluate(s: number): number;
    _evaluate(s: number): void;
    derivative(s: number): number;
    derivative2(s: number): number;
    inverse(y: number): number;
    onActive(_parent?: unknown, _draw_transform?: unknown): void;
    onInactive(_parent?: unknown, _draw_transform?: unknown): void;
    reset(): void;
    destroy(): void;
    draw(_canvas: HTMLCanvasElement, g: CanvasRenderingContext2D, _draw_transform: [number, [number, number]]): void;
    static STRUCT: string;
}
export declare class GuassianCurve extends CurveTypeData<"GuassianCurve"> {
    height: number;
    offset: number;
    deviation: number;
    uidata: Record<string, unknown> | undefined;
    constructor();
    get hasGUI(): boolean;
    static define(): {
        uiname: string;
        name: string;
        typeName: string;
    };
    calcHashKey(digest?: util.HashDigest): number;
    equals(b: CurveTypeData): boolean;
    toJSON(): {
        type: string;
    } & Record<string, unknown>;
    loadJSON(obj: Record<string, unknown>): this;
    makeGUI(container: Record<string, Function>, canvas?: HTMLCanvasElement & {
        g: CanvasRenderingContext2D;
    }, drawTransform?: [number, [number, number]]): void;
    killGUI(_container: Record<string, Function>): void;
    evaluate(s: number): number;
    derivative(s: number): number;
    derivative2(s: number): number;
    inverse(y: number): number;
    static STRUCT: string;
}
//# sourceMappingURL=curve1d_basic.d.ts.map