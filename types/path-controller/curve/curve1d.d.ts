import * as util from "../util/util.js";
import { Vector2 } from "../util/vectormath.js";
import type { StructReader } from "../util/nstructjs_es6.js";
export { getCurve } from "./curve1d_base.js";
export { SplineTemplates, SplineTemplateIcons } from "./curve1d_bspline.js";
import type { AllCurveTypes } from "./curve1d_all.js";
export declare function mySafeJSONStringify(obj: {
    toJSON(): Record<string, unknown>;
}): string;
export declare function mySafeJSONParse(buf: string): unknown;
export { CurveConstructors, CURVE_VERSION, CurveTypeData } from "./curve1d_base.js";
import { CurveTypeData } from "./curve1d_base.js";
type Vec2 = InstanceType<typeof Vector2>;
interface EventCB {
    type: string;
    cb: (data: unknown) => void;
    owner: unknown;
    dead: () => boolean;
    once: boolean;
}
interface ActiveGenerators extends Array<CurveTypeData> {
    active: CurveTypeData;
}
export declare class Curve1D {
    #private;
    _eventCBs: EventCB[];
    uiZoom: number;
    xRange: Vec2;
    yRange: Vec2;
    clipToRange: boolean;
    generators: ActiveGenerators;
    VERSION: number;
    _fastmode: boolean;
    overlay_curvefunc: ((f: number) => number) | undefined;
    _active: string | undefined;
    constructor();
    get generatorType(): string | undefined;
    get fastmode(): boolean;
    set fastmode(val: boolean);
    /** cb_is_dead is a callback that returns true if it
     *  should be removed from the callback list. */
    on(type: string, cb: (data: unknown) => void, owner?: unknown, cb_is_dead?: () => boolean): void;
    off(_type: string, cb: (data: unknown) => void): void;
    once(type: string, cb: (data: unknown) => void, owner?: unknown, cb_is_dead?: () => boolean): void;
    subscribed(type: string | undefined, owner: unknown): boolean;
    _pruneEventCallbacks(): void;
    _fireEvent(evt: string, data: unknown): void;
    calcHashKey(digest?: util.HashDigest): number;
    equals(b: Curve1D): boolean;
    load(b: Curve1D | undefined): this;
    copy(): this;
    _on_change(): void;
    redraw(): void;
    setGenerator(type: string | Function): void;
    toJSON(): Record<string, unknown>;
    /** throw_on_error defaults to true */
    checkGenerator<KEY extends AllCurveTypes["type"]>(type: KEY): Extract<AllCurveTypes, {
        type: KEY;
    }> | undefined;
    getGenerator<KEY extends AllCurveTypes["type"]>(type: KEY): Extract<AllCurveTypes, {
        type: KEY;
    }>;
    switchGenerator(type: string): CurveTypeData;
    destroy(): this;
    loadJSON(obj: Record<string, unknown>): this;
    evaluate(s: number): number;
    integrate(s: number, quadSteps?: number): number;
    derivative(s: number): number;
    derivative2(s: number): number;
    inverse(s: number): number;
    reset(): void;
    update(): void;
    draw(canvas: HTMLCanvasElement, g: CanvasRenderingContext2D, draw_transform: [number, [number, number]]): this;
    loadSTRUCT(reader: StructReader<this>): void;
    static STRUCT: string;
}
//# sourceMappingURL=curve1d.d.ts.map