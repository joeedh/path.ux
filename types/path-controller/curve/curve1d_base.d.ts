import { StructReader } from "../util/nstructjs_es6.js";
import * as util from "../util/util.js";
/** Definition returned by CurveTypeData.define() and subclass overrides */
export interface CurveTypeDefine {
    uiname: string;
    name: string;
    typeName: string;
    icon?: number;
}
/** Interface for CurveTypeData subclass constructors */
export interface CurveTypeDataConstructor {
    define(): CurveTypeDefine;
    new (...args: unknown[]): CurveTypeData;
    name: string;
    STRUCT?: string;
}
export declare const CurveConstructors: CurveTypeDataConstructor[];
export declare const CURVE_VERSION = 1.1;
export declare const CurveFlags: {
    readonly SELECT: 1;
    readonly TRANSFORM: 2;
};
export declare const TangentModes: {
    readonly SMOOTH: 1;
    readonly BREAK: 2;
};
export declare function getCurve(type: string, throw_on_error?: boolean): CurveTypeDataConstructor;
/** Minimal interface for the parent (Curve1D) to avoid circular imports */
interface CurveParent {
    redraw(): void;
    _on_change(): void;
}
/** Minimal container interface for GUI methods */
export interface CurveGUIContainer {
    clear(): void;
    [key: string]: unknown;
}
export declare class CurveTypeData<TYPE extends string = string> {
    static STRUCT: string;
    type: TYPE;
    parent: CurveParent | undefined;
    fastmode: boolean;
    uidata: Record<string, unknown> | undefined;
    constructor();
    get hasGUI(): boolean;
    static register(cls: CurveTypeDataConstructor): void;
    static define(): CurveTypeDefine;
    calcHashKey(digest?: util.HashDigest): number;
    toJSON(): {
        type: string;
    };
    equals(b: CurveTypeData): boolean;
    loadJSON(obj: Record<string, unknown>): this;
    redraw(): void;
    makeGUI(container: unknown, canvas?: unknown, drawTransform?: unknown, datapath?: unknown, onSourceUpdate?: unknown): void;
    killGUI(container: unknown, canvas?: unknown, g?: unknown, draw_transform?: unknown, extra?: unknown): void;
    evaluate(s: number): number;
    integrate(s1: number, quadSteps?: number): number;
    derivative(s: number): number;
    derivative2(s: number): number;
    inverse(y: number): number;
    onActive(_parent?: CurveParent | unknown, _draw_transform?: unknown): void;
    onInactive(_parent?: CurveParent | unknown, _draw_transform?: unknown): void;
    reset(): void;
    destroy(): void;
    update(): void;
    draw(canvas: unknown, g: unknown, draw_transform: unknown): void;
    loadSTRUCT(reader: StructReader<this>): void;
}
export declare function evalHermiteTable(table: number[], t: number, range?: [number, number] | number[]): number;
export declare function genHermiteTable(evaluate: (t: number) => number, steps: number, range?: number[]): number[];
export {};
//# sourceMappingURL=curve1d_base.d.ts.map