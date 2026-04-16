import { ToolOp, PropertySlots } from "../toolsys/toolsys";
import * as util from "../util/util";
import { Vector2 } from "../util/vectormath";
import type { StructReader } from "../util/nstructjs";
import type { ContextLike } from "../controller/controller_abstract";
export declare const SplineTemplates: {
    CONSTANT: number;
    LINEAR: number;
    SHARP: number;
    SQRT: number;
    SMOOTH: number;
    SMOOTHER: number;
    SHARPER: number;
    SPHERE: number;
    REVERSE_LINEAR: number;
    GUASSIAN: number;
};
export declare const SplineTemplateIcons: Record<string | number, HTMLImageElement>;
export declare function mySafeJSONStringify(obj: {
    toJSON(): Record<string, unknown>;
}): string;
export declare function mySafeJSONParse(buf: string): unknown;
export declare function binomial(n: number, i: number): number;
import { CurveTypeData } from "./curve1d_base";
import { BoolProperty, EnumProperty, FloatProperty, IntProperty, StringProperty, Vec2Property } from "../toolsys/toolprop";
import { Container } from "../../pathux";
/** Interface for BSplineCurve's parent (Curve1D) with the methods it actually uses */
interface BSplineCurveParent {
    redraw(): void;
    _on_change(): void;
    _fireEvent(type: string, data: unknown): void;
    _fire(type: string, data: unknown): void;
    xRange: Vector2;
    yRange: Vector2;
}
/** Interface for the Curve1D object as retrieved from the data path */
interface Curve1DObject {
    copy(): Curve1DObject;
    load(b: Curve1DObject): void;
    _fireEvent(type: string, data: unknown): void;
    generators: {
        active: BSplineCurve;
    };
    xRange: Vector2;
    yRange: Vector2;
    [key: string]: unknown;
}
/** Simulated mouse event for touch event wrapping */
interface WrappedMouseEvent {
    x: number;
    y: number;
    button: number;
    shiftKey: boolean;
    altKey: boolean;
    ctrlKey: boolean;
    isTouch: boolean;
    metaKey: boolean;
    stopPropagation(): void;
    preventDefault(): void;
}
/** Points array with highlight and active properties */
interface CurvePointList extends Array<Curve1DPoint> {
    highlight: Curve1DPoint | undefined;
    active: Curve1DPoint | undefined;
}
export declare class Curve1dBSplineOpBase<Inputs extends PropertySlots = {}, Outputs extends PropertySlots = {}, CTX extends ContextLike = ContextLike> extends ToolOp<Inputs & {
    dataPath: StringProperty;
}, Outputs, CTX> {
    static tooldef(): {
        inputs: {
            dataPath: StringProperty;
        };
        outputs: {};
    };
    _undo: Curve1DObject | undefined;
    undoPre(ctx: CTX): void;
    undo(ctx: CTX): void;
    getCurve1d(ctx: CTX): Curve1DObject | undefined;
    execPost(ctx: CTX): void;
}
export declare class Curve1dBSplineResetOp<CTX extends ContextLike = ContextLike> extends Curve1dBSplineOpBase<{}, {}, CTX> {
    static tooldef(): {
        inputs: {
            dataPath: StringProperty;
        };
        outputs: {};
        toolpath: string;
    };
    exec(ctx: CTX): void;
}
export declare class Curve1dBSplineLoadTemplOp<CTX extends ContextLike = ContextLike> extends Curve1dBSplineOpBase<{
    template: EnumProperty;
}, {}, CTX> {
    static tooldef(): {
        outputs: {};
        toolpath: string;
        inputs: {
            dataPath: StringProperty;
            template: EnumProperty<number>;
        };
    };
    exec(ctx: CTX): void;
}
export declare class Curve1dBSplineDeleteOp<CTX extends ContextLike = ContextLike> extends Curve1dBSplineOpBase<{}, {}, CTX> {
    static tooldef(): {
        inputs: {
            dataPath: StringProperty;
        };
        outputs: {};
        toolpath: string;
    };
    exec(ctx: CTX): void;
}
export declare class Curve1dBSplineSelectOp<CTX extends ContextLike = ContextLike> extends Curve1dBSplineOpBase<{
    point: IntProperty;
    state: BoolProperty;
    unique: BoolProperty;
}, {}, CTX> {
    static tooldef(): {
        outputs: {};
        toolpath: string;
        inputs: {
            dataPath: StringProperty;
            point: IntProperty;
            state: BoolProperty;
            unique: BoolProperty;
        };
    };
    exec(ctx: CTX): void;
}
export declare class Curve1dBSplineAddOp<CTX extends ContextLike = ContextLike> extends Curve1dBSplineOpBase<{
    x: FloatProperty;
    y: FloatProperty;
}, {}, CTX> {
    static tooldef(): {
        outputs: {};
        toolpath: string;
        inputs: {
            dataPath: StringProperty;
            x: FloatProperty;
            y: FloatProperty;
        };
    };
    exec(ctx: CTX): void;
}
export declare class BSplineTransformOp<CTX extends ContextLike> extends ToolOp<{
    dataPath: StringProperty;
    off: Vec2Property;
    dpi: FloatProperty;
}, {}, CTX> {
    first: boolean;
    start_mpos: {
        [k: number]: number | undefined;
        0: number;
        1: number;
        length: number;
        LEN: 2;
        [Symbol.iterator]: (() => ArrayIterator<any>) | (() => ArrayIterator<number>);
        slice: (start?: number, end?: number) => number[];
        load(existing: number[] | import("../controller").IBaseVector<2>): /*elided*/ any;
        load2(existing: number[] | import("../controller").IBaseVector<2>): /*elided*/ any;
        normalizedDot(b: import("../controller").IBaseVector<2>): number;
        equals(b: import("../controller").IBaseVector<2>): boolean;
        zero(): /*elided*/ any;
        negate(): /*elided*/ any;
        combine(b: import("../controller").IBaseVector<2>, u: number, v: number): /*elided*/ any;
        interp(b: import("../controller").IBaseVector<2>, t: number): /*elided*/ any;
        add(b: import("../controller").IBaseVector<2>): /*elided*/ any;
        addFac(b: import("../controller").IBaseVector<2>, f: number): /*elided*/ any;
        fract(): /*elided*/ any;
        sub(b: import("../controller").IBaseVector<2>): /*elided*/ any;
        mul(b: import("../controller").IBaseVector<2>): /*elided*/ any;
        div(b: import("../controller").IBaseVector<2>): /*elided*/ any;
        mulScalar(b: number): /*elided*/ any;
        divScalar(b: number): /*elided*/ any;
        addScalar(b: number): /*elided*/ any;
        subScalar(b: number): /*elided*/ any;
        minScalar(b: number): /*elided*/ any;
        maxScalar(b: number): /*elided*/ any;
        ceil(): /*elided*/ any;
        floor(): /*elided*/ any;
        abs(): /*elided*/ any;
        min(b: import("../controller").IBaseVector<2>): /*elided*/ any;
        max(b: import("../controller").IBaseVector<2>): /*elided*/ any;
        clamp(min: number, max: number): /*elided*/ any;
        vectorDotDistance(b: import("../controller").IBaseVector<2>): number;
        vectorDistance(b: import("../controller").IBaseVector<2>): number;
        vectorDistanceSqr(b: import("../controller").IBaseVector<2>): number;
        copy(): /*elided*/ any;
        vectorLengthSqr(): number;
        vectorLength(): number;
        rot2d(A: number, axis?: number): /*elided*/ any;
        dot(b: import("../controller").IBaseVector<2>): number;
        loadX(x: number): /*elided*/ any;
        loadXY(x: number, y: number): /*elided*/ any;
        swapAxes(axis1: 0 | 1, axis2: 0 | 1): /*elided*/ any;
        sinterp(v2: import("../controller").IBaseVector<2>, t: number): /*elided*/ any;
        perpSwap(axis1?: 0 | 1, axis2?: 0 | 1, sign?: number): /*elided*/ any;
        normalize(): /*elided*/ any;
        multVecMatrix(matrix: import("../controller").Matrix4, ignore_w?: boolean): /*elided*/ any;
        mulVecQuat(q: import("../controller").IQuat): /*elided*/ any;
        preNormalizedAngle(v2: import("../controller").IBaseVector<2>): number;
        loadSTRUCT(reader: StructReader</*elided*/ any>): void;
    };
    _undo: Curve1DPoint[];
    static tooldef(): {
        toolpath: string;
        inputs: {
            dataPath: StringProperty;
            off: Vec2Property;
            dpi: FloatProperty;
        };
        is_modal: boolean;
        outputs: {};
    };
    storePoints(ctx: CTX): Curve1DPoint[];
    loadPoints(ctx: CTX, ps: Curve1DPoint[]): void;
    undoPre(ctx: CTX): void;
    undo(ctx: CTX): void;
    getCurve1d(ctx: CTX): Record<string, unknown> | undefined;
    finish(cancel?: boolean): void;
    on_pointerup(_e: PointerEvent): void;
    modalStart(ctx: CTX): Promise<unknown>;
    on_pointermove(e: {
        x: number;
        y: number;
    }): void;
    on_pointerdown(_e: unknown): void;
    exec(ctx: CTX): void;
}
export declare class Curve1DPoint {
    static STRUCT: string;
    co: Vector2;
    rco: Vector2;
    sco: Vector2;
    startco: Vector2;
    eid: number;
    flag: number;
    tangent: number;
    constructor(co?: Vector2 | number[]);
    get 0(): never;
    get 1(): never;
    set 0(v: number);
    set 1(v: number);
    load(b: Curve1DPoint): this;
    set deg(_v: unknown);
    static fromJSON(obj: Record<string, unknown>): Curve1DPoint;
    copy(): Curve1DPoint;
    toJSON(): {
        co: {
            [k: number]: number | undefined;
            0: number;
            1: number;
            length: number;
            LEN: 2;
            [Symbol.iterator]: (() => ArrayIterator<any>) | (() => ArrayIterator<number>);
            slice: (start?: number, end?: number) => number[];
            load(existing: number[] | import("../controller").IBaseVector<2>): /*elided*/ any;
            load2(existing: number[] | import("../controller").IBaseVector<2>): /*elided*/ any;
            normalizedDot(b: import("../controller").IBaseVector<2>): number;
            equals(b: import("../controller").IBaseVector<2>): boolean;
            zero(): /*elided*/ any;
            negate(): /*elided*/ any;
            combine(b: import("../controller").IBaseVector<2>, u: number, v: number): /*elided*/ any;
            interp(b: import("../controller").IBaseVector<2>, t: number): /*elided*/ any;
            add(b: import("../controller").IBaseVector<2>): /*elided*/ any;
            addFac(b: import("../controller").IBaseVector<2>, f: number): /*elided*/ any;
            fract(): /*elided*/ any;
            sub(b: import("../controller").IBaseVector<2>): /*elided*/ any;
            mul(b: import("../controller").IBaseVector<2>): /*elided*/ any;
            div(b: import("../controller").IBaseVector<2>): /*elided*/ any;
            mulScalar(b: number): /*elided*/ any;
            divScalar(b: number): /*elided*/ any;
            addScalar(b: number): /*elided*/ any;
            subScalar(b: number): /*elided*/ any;
            minScalar(b: number): /*elided*/ any;
            maxScalar(b: number): /*elided*/ any;
            ceil(): /*elided*/ any;
            floor(): /*elided*/ any;
            abs(): /*elided*/ any;
            min(b: import("../controller").IBaseVector<2>): /*elided*/ any;
            max(b: import("../controller").IBaseVector<2>): /*elided*/ any;
            clamp(min: number, max: number): /*elided*/ any;
            vectorDotDistance(b: import("../controller").IBaseVector<2>): number;
            vectorDistance(b: import("../controller").IBaseVector<2>): number;
            vectorDistanceSqr(b: import("../controller").IBaseVector<2>): number;
            copy(): /*elided*/ any;
            vectorLengthSqr(): number;
            vectorLength(): number;
            rot2d(A: number, axis?: number): /*elided*/ any;
            dot(b: import("../controller").IBaseVector<2>): number;
            loadX(x: number): /*elided*/ any;
            loadXY(x: number, y: number): /*elided*/ any;
            swapAxes(axis1: 0 | 1, axis2: 0 | 1): /*elided*/ any;
            sinterp(v2: import("../controller").IBaseVector<2>, t: number): /*elided*/ any;
            perpSwap(axis1?: 0 | 1, axis2?: 0 | 1, sign?: number): /*elided*/ any;
            normalize(): /*elided*/ any;
            multVecMatrix(matrix: import("../controller").Matrix4, ignore_w?: boolean): /*elided*/ any;
            mulVecQuat(q: import("../controller").IQuat): /*elided*/ any;
            preNormalizedAngle(v2: import("../controller").IBaseVector<2>): number;
            loadSTRUCT(reader: StructReader</*elided*/ any>): void;
        };
        eid: number;
        flag: number;
        tangent: number;
        rco: {
            [k: number]: number | undefined;
            0: number;
            1: number;
            length: number;
            LEN: 2;
            [Symbol.iterator]: (() => ArrayIterator<any>) | (() => ArrayIterator<number>);
            slice: (start?: number, end?: number) => number[];
            load(existing: number[] | import("../controller").IBaseVector<2>): any;
            load2(existing: number[] | import("../controller").IBaseVector<2>): any;
            normalizedDot(b: import("../controller").IBaseVector<2>): number;
            equals(b: import("../controller").IBaseVector<2>): boolean;
            zero(): any;
            negate(): any;
            combine(b: import("../controller").IBaseVector<2>, u: number, v: number): any;
            interp(b: import("../controller").IBaseVector<2>, t: number): any;
            add(b: import("../controller").IBaseVector<2>): any;
            addFac(b: import("../controller").IBaseVector<2>, f: number): any;
            fract(): any;
            sub(b: import("../controller").IBaseVector<2>): any;
            mul(b: import("../controller").IBaseVector<2>): any;
            div(b: import("../controller").IBaseVector<2>): any;
            mulScalar(b: number): any;
            divScalar(b: number): any;
            addScalar(b: number): any;
            subScalar(b: number): any;
            minScalar(b: number): any;
            maxScalar(b: number): any;
            ceil(): any;
            floor(): any;
            abs(): any;
            min(b: import("../controller").IBaseVector<2>): any;
            max(b: import("../controller").IBaseVector<2>): any;
            clamp(min: number, max: number): any;
            vectorDotDistance(b: import("../controller").IBaseVector<2>): number;
            vectorDistance(b: import("../controller").IBaseVector<2>): number;
            vectorDistanceSqr(b: import("../controller").IBaseVector<2>): number;
            copy(): any;
            vectorLengthSqr(): number;
            vectorLength(): number;
            rot2d(A: number, axis?: number): any;
            dot(b: import("../controller").IBaseVector<2>): number;
            loadX(x: number): any;
            loadXY(x: number, y: number): any;
            swapAxes(axis1: 0 | 1, axis2: 0 | 1): any;
            sinterp(v2: import("../controller").IBaseVector<2>, t: number): any;
            perpSwap(axis1?: 0 | 1, axis2?: 0 | 1, sign?: number): any;
            normalize(): any;
            multVecMatrix(matrix: import("../controller").Matrix4, ignore_w?: boolean): any;
            mulVecQuat(q: import("../controller").IQuat): any;
            preNormalizedAngle(v2: import("../controller").IBaseVector<2>): number;
            loadSTRUCT(reader: StructReader<any>): void;
        };
        startco: {
            [k: number]: number | undefined;
            0: number;
            1: number;
            length: number;
            LEN: 2;
            [Symbol.iterator]: (() => ArrayIterator<any>) | (() => ArrayIterator<number>);
            slice: (start?: number, end?: number) => number[];
            load(existing: number[] | import("../controller").IBaseVector<2>): any;
            load2(existing: number[] | import("../controller").IBaseVector<2>): any;
            normalizedDot(b: import("../controller").IBaseVector<2>): number;
            equals(b: import("../controller").IBaseVector<2>): boolean;
            zero(): any;
            negate(): any;
            combine(b: import("../controller").IBaseVector<2>, u: number, v: number): any;
            interp(b: import("../controller").IBaseVector<2>, t: number): any;
            add(b: import("../controller").IBaseVector<2>): any;
            addFac(b: import("../controller").IBaseVector<2>, f: number): any;
            fract(): any;
            sub(b: import("../controller").IBaseVector<2>): any;
            mul(b: import("../controller").IBaseVector<2>): any;
            div(b: import("../controller").IBaseVector<2>): any;
            mulScalar(b: number): any;
            divScalar(b: number): any;
            addScalar(b: number): any;
            subScalar(b: number): any;
            minScalar(b: number): any;
            maxScalar(b: number): any;
            ceil(): any;
            floor(): any;
            abs(): any;
            min(b: import("../controller").IBaseVector<2>): any;
            max(b: import("../controller").IBaseVector<2>): any;
            clamp(min: number, max: number): any;
            vectorDotDistance(b: import("../controller").IBaseVector<2>): number;
            vectorDistance(b: import("../controller").IBaseVector<2>): number;
            vectorDistanceSqr(b: import("../controller").IBaseVector<2>): number;
            copy(): any;
            vectorLengthSqr(): number;
            vectorLength(): number;
            rot2d(A: number, axis?: number): any;
            dot(b: import("../controller").IBaseVector<2>): number;
            loadX(x: number): any;
            loadXY(x: number, y: number): any;
            swapAxes(axis1: 0 | 1, axis2: 0 | 1): any;
            sinterp(v2: import("../controller").IBaseVector<2>, t: number): any;
            perpSwap(axis1?: 0 | 1, axis2?: 0 | 1, sign?: number): any;
            normalize(): any;
            multVecMatrix(matrix: import("../controller").Matrix4, ignore_w?: boolean): any;
            mulVecQuat(q: import("../controller").IQuat): any;
            preNormalizedAngle(v2: import("../controller").IBaseVector<2>): number;
            loadSTRUCT(reader: StructReader<any>): void;
        };
    };
    loadSTRUCT(reader: StructReader<this>): void;
}
export declare class BSplineCurve extends CurveTypeData<"BSplineCurve"> {
    static STRUCT: string;
    _bid: number;
    _degOffset: number;
    cache_w: number;
    _last_cache_key: number;
    parent: BSplineCurveParent | undefined;
    points: CurvePointList;
    length: number;
    interpolating: boolean;
    _ps: Curve1DPoint[];
    hermite: number[];
    deg: number;
    recalc: number;
    basis_tables: number[][];
    eidgen: util.IDGen;
    mpos: Vector2;
    _save_hook: (() => void) | undefined;
    highlightPoint: number | undefined;
    on_mousedown: (e: MouseEvent | WrappedMouseEvent) => void;
    on_mousemove: (e: MouseEvent | WrappedMouseEvent) => void;
    on_mouseup: (e: MouseEvent | WrappedMouseEvent) => void;
    on_keydown: (e: KeyboardEvent) => void;
    on_touchstart: (e: TouchEvent) => void;
    on_touchmove: (e: TouchEvent) => void;
    on_touchend: (e: TouchEvent) => void;
    on_touchcancel: (e: TouchEvent) => void;
    constructor();
    get hasGUI(): boolean;
    static define(): {
        uiname: string;
        name: string;
        typeName: string;
    };
    calcHashKey(digest?: util.HashDigest): number;
    copyTo(b: BSplineCurve): BSplineCurve;
    copy(): BSplineCurve;
    equals(b: CurveTypeData): boolean;
    remove(p: Curve1DPoint): void;
    add(x: number, y: number, no_update?: boolean): Curve1DPoint;
    update(): void;
    _sortPoints(): this;
    updateKnots(recalc?: boolean, points?: Curve1DPoint[]): void;
    toJSON(): {
        type: string;
    };
    loadJSON(obj: Record<string, unknown>): this;
    basis(t: number, i: number): number;
    reset(empty?: boolean): this;
    regen_hermite(steps?: number): void;
    solve_interpolating(): void;
    regen_basis(): void;
    _dbasis(t: number, i: number): number;
    _basis(t: number, i: number): number;
    evaluate(t: number): number;
    _evaluate(t: number): number;
    _evaluate2(t: number): {
        [k: number]: number | undefined;
        0: number;
        1: number;
        length: number;
        LEN: 2;
        [Symbol.iterator]: (() => ArrayIterator<any>) | (() => ArrayIterator<number>);
        slice: (start?: number, end?: number) => number[];
        load(existing: number[] | import("../controller").IBaseVector<2>): /*elided*/ any;
        load2(existing: number[] | import("../controller").IBaseVector<2>): /*elided*/ any;
        normalizedDot(b: import("../controller").IBaseVector<2>): number;
        equals(b: import("../controller").IBaseVector<2>): boolean;
        zero(): /*elided*/ any;
        negate(): /*elided*/ any;
        combine(b: import("../controller").IBaseVector<2>, u: number, v: number): /*elided*/ any;
        interp(b: import("../controller").IBaseVector<2>, t: number): /*elided*/ any;
        add(b: import("../controller").IBaseVector<2>): /*elided*/ any;
        addFac(b: import("../controller").IBaseVector<2>, f: number): /*elided*/ any;
        fract(): /*elided*/ any;
        sub(b: import("../controller").IBaseVector<2>): /*elided*/ any;
        mul(b: import("../controller").IBaseVector<2>): /*elided*/ any;
        div(b: import("../controller").IBaseVector<2>): /*elided*/ any;
        mulScalar(b: number): /*elided*/ any;
        divScalar(b: number): /*elided*/ any;
        addScalar(b: number): /*elided*/ any;
        subScalar(b: number): /*elided*/ any;
        minScalar(b: number): /*elided*/ any;
        maxScalar(b: number): /*elided*/ any;
        ceil(): /*elided*/ any;
        floor(): /*elided*/ any;
        abs(): /*elided*/ any;
        min(b: import("../controller").IBaseVector<2>): /*elided*/ any;
        max(b: import("../controller").IBaseVector<2>): /*elided*/ any;
        clamp(min: number, max: number): /*elided*/ any;
        vectorDotDistance(b: import("../controller").IBaseVector<2>): number;
        vectorDistance(b: import("../controller").IBaseVector<2>): number;
        vectorDistanceSqr(b: import("../controller").IBaseVector<2>): number;
        copy(): /*elided*/ any;
        vectorLengthSqr(): number;
        vectorLength(): number;
        rot2d(A: number, axis?: number): /*elided*/ any;
        dot(b: import("../controller").IBaseVector<2>): number;
        loadX(x: number): /*elided*/ any;
        loadXY(x: number, y: number): /*elided*/ any;
        swapAxes(axis1: 0 | 1, axis2: 0 | 1): /*elided*/ any;
        sinterp(v2: import("../controller").IBaseVector<2>, t: number): /*elided*/ any;
        perpSwap(axis1?: 0 | 1, axis2?: 0 | 1, sign?: number): /*elided*/ any;
        normalize(): /*elided*/ any;
        multVecMatrix(matrix: import("../controller").Matrix4, ignore_w?: boolean): /*elided*/ any;
        mulVecQuat(q: import("../controller").IQuat): /*elided*/ any;
        preNormalizedAngle(v2: import("../controller").IBaseVector<2>): number;
        loadSTRUCT(reader: StructReader</*elided*/ any>): void;
    };
    _wrapTouchEvent(e: TouchEvent): WrappedMouseEvent;
    _on_touchstart(e: TouchEvent): void;
    loadTemplate(templ: number | undefined): void;
    _on_touchmove(e: TouchEvent): void;
    _on_touchend(e: TouchEvent): void;
    _on_touchcancel(e: TouchEvent): void;
    deletePoint(): void;
    makeGUI(container: Container, canvas: HTMLCanvasElement & {
        g: CanvasRenderingContext2D;
    }, drawTransform: [number, [number, number]], datapath?: string, onSourceUpdate?: () => void): this;
    killGUI(container: unknown, canvas?: unknown): this;
    start_transform(_useSelected?: boolean): void;
    _on_mousedown(e: MouseEvent | WrappedMouseEvent): void;
    load(b: BSplineCurve): this | undefined;
    addFromMouse(x: number, y: number): void;
    do_highlight(x: number, y: number): void;
    do_transform(x: number, y: number): void;
    transform_mpos(x: number, y: number): [number, number];
    _on_mousemove(e: MouseEvent | WrappedMouseEvent): void;
    end_transform(): void;
    _on_mouseup(_e: MouseEvent | WrappedMouseEvent): void;
    _on_keydown(e: KeyboardEvent): void;
    draw(canvas: unknown, g: CanvasRenderingContext2D, draw_trans: [number, [number, number]]): void;
    loadSTRUCT(reader: StructReader<this>): void;
}
export declare function initSplineTemplates(): void;
export {};
//# sourceMappingURL=curve1d_bspline.d.ts.map