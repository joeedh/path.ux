export declare const SVG_URL = "http://www.w3.org/2000/svg";
import * as vectormath from "./vectormath.js";
import * as ui_base from "../core/ui_base.js";
import { IContextBase } from "../core/context_base.js";
import type { Screen } from "../screen/FrameManager";
declare const Vector2: {
    new (existing?: number[] | vectormath.IBaseVector<2>): {
        [k: number]: number | undefined;
        0: number;
        1: number;
        length: number;
        LEN: 2;
        [Symbol.iterator]: (() => ArrayIterator<any>) | (() => ArrayIterator<number>);
        slice: (start?: number, end?: number) => number[];
        load(existing: number[] | vectormath.IBaseVector<2>): /*elided*/ any;
        load2(existing: number[] | vectormath.IBaseVector<2>): /*elided*/ any;
        normalizedDot(b: vectormath.IBaseVector<2>): number;
        equals(b: vectormath.IBaseVector<2>): boolean;
        zero(): /*elided*/ any;
        negate(): /*elided*/ any;
        combine(b: vectormath.IBaseVector<2>, u: number, v: number): /*elided*/ any;
        interp(b: vectormath.IBaseVector<2>, t: number): /*elided*/ any;
        add(b: vectormath.IBaseVector<2>): /*elided*/ any;
        addFac(b: vectormath.IBaseVector<2>, f: number): /*elided*/ any;
        fract(): /*elided*/ any;
        sub(b: vectormath.IBaseVector<2>): /*elided*/ any;
        mul(b: vectormath.IBaseVector<2>): /*elided*/ any;
        div(b: vectormath.IBaseVector<2>): /*elided*/ any;
        mulScalar(b: number): /*elided*/ any;
        divScalar(b: number): /*elided*/ any;
        addScalar(b: number): /*elided*/ any;
        subScalar(b: number): /*elided*/ any;
        minScalar(b: number): /*elided*/ any;
        maxScalar(b: number): /*elided*/ any;
        ceil(): /*elided*/ any;
        floor(): /*elided*/ any;
        abs(): /*elided*/ any;
        min(b: vectormath.IBaseVector<2>): /*elided*/ any;
        max(b: vectormath.IBaseVector<2>): /*elided*/ any;
        clamp(min: number, max: number): /*elided*/ any;
        vectorDotDistance(b: vectormath.IBaseVector<2>): number;
        vectorDistance(b: vectormath.IBaseVector<2>): number;
        vectorDistanceSqr(b: vectormath.IBaseVector<2>): number;
        copy(): /*elided*/ any;
        vectorLengthSqr(): number;
        vectorLength(): number;
        rot2d(A: number, axis?: number): /*elided*/ any;
        dot(b: vectormath.IBaseVector<2>): number;
        loadX(x: number): /*elided*/ any;
        loadXY(x: number, y: number): /*elided*/ any;
        swapAxes(axis1: 0 | 1, axis2: 0 | 1): /*elided*/ any;
        sinterp(v2: vectormath.IBaseVector<2>, t: number): /*elided*/ any;
        perpSwap(axis1?: 0 | 1, axis2?: 0 | 1, sign?: number): /*elided*/ any;
        normalize(): /*elided*/ any;
        multVecMatrix(matrix: vectormath.Matrix4, ignore_w?: boolean): /*elided*/ any;
        mulVecQuat(q: vectormath.IQuat): /*elided*/ any;
        preNormalizedAngle(v2: vectormath.IBaseVector<2>): number;
        loadSTRUCT(reader: import("nstructjs").StructReader</*elided*/ any>): void;
    };
    structName: string | undefined;
    STRUCT: string | undefined;
    normalizedDot4(v1: vectormath.IBaseVector<2>, v2: vectormath.IBaseVector<2>, v3: vectormath.IBaseVector<2>, v4: vectormath.IBaseVector<2>): number;
    normalizedDot3(v1: vectormath.IBaseVector<2>, center: vectormath.IBaseVector<2>, v2: vectormath.IBaseVector<2>): number;
};
interface TextArgs {
    font?: string;
    "background-color"?: string;
    color?: string | number[];
    padding?: string;
    "border-color"?: string;
    "border-radius"?: string | number;
    "border-width"?: string | number;
}
interface TextBox extends HTMLDivElement {
    minsize: [number, number];
    grads: number[];
    params: number[];
    startpos: InstanceType<typeof Vector2>;
    setCSS: () => void;
}
export interface SVGRectWithColor extends SVGRectElement {
    setColor: (color: string) => void;
}
export declare class CanvasOverdraw<CTX extends IContextBase = IContextBase> extends ui_base.UIBase<CTX> {
    canvas: HTMLCanvasElement;
    g: CanvasRenderingContext2D | null;
    screen?: Screen<CTX>;
    shapes: unknown[];
    otherChildren: HTMLElement[];
    font: string | undefined;
    svg: SVGSVGElement;
    constructor();
    static define(): {
        tagname: string;
    };
    startNode(node: HTMLElement, screen?: Screen<CTX>): void;
    start(screen: Screen<CTX>): void;
}
export declare class Overdraw<CTX extends IContextBase = IContextBase> extends ui_base.UIBase<CTX> {
    visibleToPick: boolean;
    screen: unknown;
    shapes: unknown[];
    otherChildren: HTMLElement[];
    font: string | undefined;
    zindex_base: number;
    svg: SVGSVGElement;
    constructor();
    startNode(node: HTMLElement, screen?: Screen<CTX>, cssPosition?: string): void;
    start(screen: Screen<CTX>): void;
    clear(): void;
    drawTextBubbles(texts: string[], cos: number[][], colors?: string[]): TextBox[] | undefined;
    text(text: string, x: number, y: number, args?: TextArgs): HTMLDivElement;
    circle(p: number[], r: number, stroke?: string, fill?: string): SVGCircleElement;
    line(v1: vectormath.Vector2Like | number[], v2: vectormath.Vector2Like | number[], color?: string): SVGLineElement;
    rect(p: vectormath.Vector2Like | number[], size: vectormath.Vector2Like | number[], color?: string): SVGRectWithColor;
    end(): void;
    static define(): {
        tagname: string;
        style: string;
    };
}
export {};
//# sourceMappingURL=ScreenOverdraw.d.ts.map