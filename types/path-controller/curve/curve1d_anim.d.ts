import { CurveTypeData } from "./curve1d_base.js";
import * as util from "../util/util.js";
import type { StructReader } from "../util/nstructjs_es6.js";
export declare class ParamKey {
    key: string;
    val: number;
    constructor(key: string, val: number);
    static STRUCT: string;
}
interface CurveDefineResult {
    params: Record<string, [string, number | boolean, number, number]>;
    name: string;
    uiname: string;
    typeName: string;
}
interface SimpleCurveConstructor {
    name: string;
    define(): CurveDefineResult;
}
export declare class SimpleCurveBase<TYPE extends string> extends CurveTypeData<TYPE> {
    ["constructor"]: SimpleCurveConstructor;
    params: Record<string, number>;
    uidata: Record<string, unknown> | undefined;
    parent: {
        redraw(): void;
        _on_change(): void;
        _fireEvent(evt: string, data: unknown): void;
    } | undefined;
    constructor();
    get hasGUI(): boolean;
    calcHashKey(digest?: util.HashDigest): number;
    equals(b: CurveTypeData): boolean;
    redraw(): void;
    makeGUI(container: Record<string, Function>): void;
    killGUI(container: Record<string, Function>): void;
    evaluate(_s: number): number;
    reset(): void;
    update(): void;
    draw(_canvas: HTMLCanvasElement, g: CanvasRenderingContext2D, _draw_transform: [number, [number, number]]): void;
    _saveParams(): ParamKey[];
    toJSON(): {
        type: string;
    } & Record<string, unknown>;
    loadJSON(obj: Record<string, unknown>): this;
    loadSTRUCT(reader: StructReader<this>): void;
    static STRUCT: string;
}
export declare class BounceCurve extends SimpleCurveBase<"BounceCurve"> {
    static define(): CurveDefineResult;
    _evaluate(t: number): number;
    evaluate(t: number): number;
    static STRUCT: string;
}
export declare class ElasticCurve extends SimpleCurveBase<"ElasticCurve"> {
    _func: ((t: number) => number) | undefined;
    _last_hash: number | undefined;
    constructor();
    static define(): CurveDefineResult;
    evaluate(t: number): number;
    static STRUCT: string;
}
export declare class EaseCurve extends SimpleCurveBase<"EaseCurve"> {
    constructor();
    static define(): CurveDefineResult;
    evaluate(t: number): number;
    static STRUCT: string;
}
export declare class RandCurve extends SimpleCurveBase<"RandCurve"> {
    random: util.MersenneRandom;
    _seed: number;
    constructor();
    get seed(): number;
    set seed(v: number);
    static define(): CurveDefineResult;
    evaluate(t: number): number;
    static STRUCT: string;
}
export {};
//# sourceMappingURL=curve1d_anim.d.ts.map