import type { StructReader } from "./nstructjs";
import * as util from "./util";
export type VectorLike<LEN extends 0 | 1 | 2 | 3 | 4> = {
    0: LEN extends 1 | 2 | 3 | 4 ? number : never;
    1?: LEN extends 2 | 3 | 4 ? number : never;
    2?: LEN extends 3 | 4 ? number : never;
    3?: LEN extends 4 ? number : never;
    length: number;
};
export declare interface IOpenNumVector {
    [k: number]: number;
    length: number;
}
type indexUnions = {
    0: never;
    1: 0;
    2: 0 | 1;
    3: 0 | 1 | 2;
    4: 0 | 1 | 2 | 3;
};
export type INumVectorLimited<LEN extends 0 | 1 | 2 | 3 | 4> = {
    0: LEN extends 1 | 2 | 3 | 4 ? number : never;
    1?: LEN extends 2 | 3 | 4 ? number : never;
    2?: LEN extends 3 | 4 ? number : never;
    3?: LEN extends 4 ? number : never;
    length: number;
};
declare type INumVector = IOpenNumVector | INumVectorLimited<2> | INumVectorLimited<3> | INumVectorLimited<4>;
export type IndexUnion<L extends 0 | 1 | 2 | 3 | 4> = indexUnions[L];
export type Number1 = 0;
export type Number2 = 0 | 1;
export type Number3 = 0 | 1 | 2;
export type Number4 = 0 | 1 | 2 | 3;
export type Number5 = 0 | 1 | 2 | 3 | 4;
type numlits = {
    1: 1;
    2: 2 | 3 | 4;
    3: 3 | 4;
    4: 4;
};
export type NumLitHigher<L extends 1 | 2 | 3 | 4> = numlits[L];
type helper1 = [never, never, 0 | 1, 0 | 1 | 2, 0 | 1 | 2 | 3];
type IBaseBase<LEN extends 2 | 3 | 4> = {
    [k in 0 | 1 | 2 | 3 as k extends helper1[LEN] ? k : never]: number;
} & {
    [k in 0 | 1 | 2 | 3 as k extends helper1[LEN] ? never : k]?: number;
};
/**
 * By design vectors do not have a simple index signature.
 * Instead, indices up to LEN type to number, while indices above
 * LEN type to number | undefined.
 *
 * This is to prevent mixing of incompatible vectors.
 *
 * This can create problems with iteration, for example:
 *
 * ```ts
 * let v = new Vector3()
 * for (let i=0; i<3; i++) {
 *   // will not work
 *   v[i] = i
 *   // will work
 *   v[i] = i as Number3
 * }
 *
 * //alternative with IndexRange:
 * for (const i of IndexRange(3)) {
 *   v[i] = i
 * }
 * ```
 */
export type IBaseVector<LEN extends 2 | 3 | 4, ArrayType = Array<number>> = IBaseBase<LEN> & {
    length: number;
    [k: number]: number | undefined;
    [Symbol.iterator](): Iterator<number>;
    slice(start?: number, end?: number): number[];
    sinterp(b: IBaseVector<LEN>, t: number): IBaseVector<LEN>;
    perpSwap(axis1?: number, axis2?: number, sign?: number): IBaseVector<LEN>;
    load(b: IBaseVector<LEN> | INumVector): IBaseVector<LEN>;
    loadXY(x: number, y: number): IBaseVector<LEN>;
    copy(): IBaseVector<LEN>;
    add(b: IBaseVector<LEN>): IBaseVector<LEN>;
    sub(b: IBaseVector<LEN>): IBaseVector<LEN>;
    mul(b: IBaseVector<LEN>): IBaseVector<LEN>;
    div(b: IBaseVector<LEN>): IBaseVector<LEN>;
    addScalar(b: number): IBaseVector<LEN>;
    subScalar(b: number): IBaseVector<LEN>;
    mulScalar(b: number): IBaseVector<LEN>;
    divScalar(b: number): IBaseVector<LEN>;
    minScalar(b: number): IBaseVector<LEN>;
    maxScalar(b: number): IBaseVector<LEN>;
    min(b: IBaseVector<LEN>): IBaseVector<LEN>;
    max(b: IBaseVector<LEN>): IBaseVector<LEN>;
    floor(): IBaseVector<LEN>;
    fract(): IBaseVector<LEN>;
    ceil(): IBaseVector<LEN>;
    abs(): IBaseVector<LEN>;
    dot(b: IBaseVector<LEN>): number;
    normalizedDot(b: IBaseVector<3>): number;
    normalize(): IBaseVector<LEN>;
    vectorLength(): number;
    vectorLengthSqr(): number;
    vectorDistance(b: IBaseVector<LEN>): number;
    vectorDistanceSqr(b: IBaseVector<LEN>): number;
    multVecMatrix(mat: Matrix4): void;
    interp(b: IBaseVector<LEN>, fac: number): IBaseVector<LEN>;
    addFac(b: IBaseVector<LEN>, fac: number): IBaseVector<LEN>;
    rot2d(th: number, axis?: number | undefined): IBaseVector<LEN>;
    zero(): IBaseVector<LEN>;
    negate(): IBaseVector<LEN>;
    swapAxes(axis1: number, axis2: number): IBaseVector<LEN>;
};
/** @deprecated use IBaseVector directly */
export type VectorLikeOrHigher<LEN extends 2 | 3 | 4, Type = never> = IBaseVector<LEN>;
/** @deprecated use IBaseVector directly */
export type IVectorOrHigher<LEN extends 2 | 3 | 4, Type = never> = VectorLikeOrHigher<LEN, Type>;
export type IQuat = IBaseVector<4> & {
    axisAngleToQuat(axis: IBaseVector<3>, angle: number): IQuat;
    toMatrix(output?: Matrix4): Matrix4;
};
export interface IVector2 extends IBaseVector<2> {
    load2(b: IBaseVector<2> | number[]): this;
}
export interface IVector3 extends IBaseVector<3> {
    loadXYZ(x: number, y: number, z: number): this;
    cross(b: IBaseVector<3>): this;
    load2(b: IBaseVector<2> | number[]): this;
    load3(b: IBaseVector<3> | number[]): this;
}
export interface IVector4 extends IBaseVector<4> {
    loadXYZ(x: number, y: number, z: number): this;
    loadXYZW(x: number, y: number, z: number, w: number): this;
    load2(b: IBaseVector<2> | number[]): this;
    load3(b: IBaseVector<3> | number[]): this;
    load4(b: IBaseVector<4> | number[]): this;
    cross(b: IBaseVector<4>): this;
}
export declare interface IVectorConstructor<Type, LEN extends 2 | 3 | 4 = 3> {
    new (value?: number[] | Type | IBaseVector<LEN>): Type;
    /** |(a - center)| dot |(b - center)| */
    normalizedDot3(a: IBaseVector<LEN>, center: IBaseVector<LEN>, b: IBaseVector<LEN>): number;
    /** |(b - a)| dot |(d - c)| */
    normalizedDot4(a: IBaseVector<LEN>, b: IBaseVector<LEN>, c: IBaseVector<LEN>, d: IBaseVector<LEN>): number;
    structName?: string;
    STRUCT?: string;
}
export declare const Vector2: {
    new (existing?: number[] | IBaseVector<2>): {
        [k: number]: number | undefined;
        0: number;
        1: number;
        length: number;
        LEN: 2;
        [Symbol.iterator]: (() => ArrayIterator<any>) | (() => ArrayIterator<number>);
        slice: (start?: number, end?: number) => number[];
        load(existing: number[] | IBaseVector<2>): /*elided*/ any;
        load2(existing: number[] | IBaseVector<2>): /*elided*/ any;
        normalizedDot(b: IBaseVector<2>): number;
        equals(b: IBaseVector<2>): boolean;
        zero(): /*elided*/ any;
        negate(): /*elided*/ any;
        combine(b: IBaseVector<2>, u: number, v: number): /*elided*/ any;
        interp(b: IBaseVector<2>, t: number): /*elided*/ any;
        add(b: IBaseVector<2>): /*elided*/ any;
        addFac(b: IBaseVector<2>, f: number): /*elided*/ any;
        fract(): /*elided*/ any;
        sub(b: IBaseVector<2>): /*elided*/ any;
        mul(b: IBaseVector<2>): /*elided*/ any;
        div(b: IBaseVector<2>): /*elided*/ any;
        mulScalar(b: number): /*elided*/ any;
        divScalar(b: number): /*elided*/ any;
        addScalar(b: number): /*elided*/ any;
        subScalar(b: number): /*elided*/ any;
        minScalar(b: number): /*elided*/ any;
        maxScalar(b: number): /*elided*/ any;
        ceil(): /*elided*/ any;
        floor(): /*elided*/ any;
        abs(): /*elided*/ any;
        min(b: IBaseVector<2>): /*elided*/ any;
        max(b: IBaseVector<2>): /*elided*/ any;
        clamp(min: number, max: number): /*elided*/ any;
        vectorDotDistance(b: IBaseVector<2>): number;
        vectorDistance(b: IBaseVector<2>): number;
        vectorDistanceSqr(b: IBaseVector<2>): number;
        copy(): /*elided*/ any;
        vectorLengthSqr(): number;
        vectorLength(): number;
        rot2d(A: number, axis?: number): /*elided*/ any;
        dot(b: IBaseVector<2>): number;
        loadX(x: number): /*elided*/ any;
        loadXY(x: number, y: number): /*elided*/ any;
        swapAxes(axis1: 0 | 1, axis2: 0 | 1): /*elided*/ any;
        /** somewhat crappy spherical interpolation */
        sinterp(v2: IBaseVector<2>, t: number): /*elided*/ any;
        /** perpendicular swap */
        perpSwap(axis1?: 0 | 1, axis2?: 0 | 1, sign?: number): /*elided*/ any;
        normalize(): /*elided*/ any;
        /** Returns w value. */
        multVecMatrix(matrix: Matrix4, ignore_w?: boolean): /*elided*/ any;
        mulVecQuat(q: IQuat): /*elided*/ any;
        preNormalizedAngle(v2: IBaseVector<2>): number;
        loadSTRUCT(reader: StructReader</*elided*/ any>): void;
    };
    structName: string | undefined;
    STRUCT: string | undefined;
    normalizedDot4(v1: IBaseVector<2>, v2: IBaseVector<2>, v3: IBaseVector<2>, v4: IBaseVector<2>): number;
    normalizedDot3(v1: IBaseVector<2>, center: IBaseVector<2>, v2: IBaseVector<2>): number;
};
export declare const Vector3: {
    new (existing?: number[] | IBaseVector<3>): {
        [k: number]: number | undefined;
        0: number;
        1: number;
        2: number;
        length: number;
        LEN: 3;
        [Symbol.iterator]: (() => ArrayIterator<any>) | (() => ArrayIterator<number>);
        slice: (start?: number, end?: number) => number[];
        load(existing: number[] | IBaseVector<3>): /*elided*/ any;
        load2(existing: number[] | IBaseVector<2>): /*elided*/ any;
        load3(existing: number[] | IBaseVector<3>): /*elided*/ any;
        normalizedDot(b: IBaseVector<3>): number;
        equals(b: IBaseVector<3>): boolean;
        zero(): /*elided*/ any;
        negate(): /*elided*/ any;
        combine(b: IBaseVector<3>, u: number, v: number): /*elided*/ any;
        interp(b: IBaseVector<3>, t: number): /*elided*/ any;
        add(b: IBaseVector<3>): /*elided*/ any;
        addFac(b: IBaseVector<3>, f: number): /*elided*/ any;
        fract(): /*elided*/ any;
        sub(b: IBaseVector<3>): /*elided*/ any;
        mul(b: IBaseVector<3>): /*elided*/ any;
        div(b: IBaseVector<3>): /*elided*/ any;
        mulScalar(b: number): /*elided*/ any;
        divScalar(b: number): /*elided*/ any;
        addScalar(b: number): /*elided*/ any;
        subScalar(b: number): /*elided*/ any;
        minScalar(b: number): /*elided*/ any;
        maxScalar(b: number): /*elided*/ any;
        ceil(): /*elided*/ any;
        floor(): /*elided*/ any;
        abs(): /*elided*/ any;
        min(b: IBaseVector<3>): /*elided*/ any;
        max(b: IBaseVector<3>): /*elided*/ any;
        clamp(min: number, max: number): /*elided*/ any;
        vectorDotDistance(b: IBaseVector<3>): number;
        vectorDistance(b: IBaseVector<3>): number;
        vectorDistanceSqr(b: IBaseVector<3>): number;
        copy(): /*elided*/ any;
        vectorLengthSqr(): number;
        vectorLength(): number;
        rot2d(A: number, axis?: number): /*elided*/ any;
        dot(b: IBaseVector<3>): number;
        loadX(x: number): /*elided*/ any;
        loadXY(x: number, y: number): /*elided*/ any;
        loadXYZ(x: number, y: number, z: number): /*elided*/ any;
        swapAxes(axis1: 0 | 1 | 2, axis2: 0 | 1 | 2): /*elided*/ any;
        /** somewhat crappy spherical interpolation */
        sinterp(v2: IBaseVector<3>, t: number): /*elided*/ any;
        /** perpendicular swap */
        perpSwap(axis1?: 0 | 1 | 2, axis2?: 0 | 1 | 2, sign?: number): /*elided*/ any;
        normalize(): /*elided*/ any;
        /** Returns w value. */
        multVecMatrix(matrix: Matrix4, ignore_w?: boolean): number;
        mulVecQuat(q: IQuat): /*elided*/ any;
        cross(v: IBaseVector<3>): /*elided*/ any;
        preNormalizedAngle(v2: IBaseVector<3>): number;
        toCSS(): string;
        loadSTRUCT(reader: StructReader</*elided*/ any>): void;
    };
    structName: string | undefined;
    STRUCT: string | undefined;
    normalizedDot4(v1: IBaseVector<3>, v2: IBaseVector<3>, v3: IBaseVector<3>, v4: IBaseVector<3>): number;
    normalizedDot3(v1: IBaseVector<3>, center: IBaseVector<3>, v2: IBaseVector<3>): number;
};
export declare const Vector4: {
    new (existing?: number[] | IBaseVector<4>): {
        [k: number]: number | undefined;
        0: number;
        1: number;
        2: number;
        3: number;
        length: number;
        LEN: 4;
        [Symbol.iterator]: (() => ArrayIterator<any>) | (() => ArrayIterator<number>);
        slice: (start?: number, end?: number) => number[];
        load(existing: number[] | IBaseVector<4>): /*elided*/ any;
        load2(existing: number[] | IBaseVector<2>): /*elided*/ any;
        load3(existing: number[] | IBaseVector<3>): /*elided*/ any;
        load4(existing: number[] | IBaseVector<4>): /*elided*/ any;
        normalizedDot(b: IBaseVector<4>): number;
        equals(b: IBaseVector<4>): boolean;
        zero(): /*elided*/ any;
        negate(): /*elided*/ any;
        combine(b: IBaseVector<4>, u: number, v: number): /*elided*/ any;
        interp(b: IBaseVector<4>, t: number): /*elided*/ any;
        add(b: IBaseVector<4>): /*elided*/ any;
        addFac(b: IBaseVector<4>, f: number): /*elided*/ any;
        fract(): /*elided*/ any;
        sub(b: IBaseVector<4>): /*elided*/ any;
        mul(b: IBaseVector<4>): /*elided*/ any;
        div(b: IBaseVector<4>): /*elided*/ any;
        mulScalar(b: number): /*elided*/ any;
        divScalar(b: number): /*elided*/ any;
        addScalar(b: number): /*elided*/ any;
        subScalar(b: number): /*elided*/ any;
        minScalar(b: number): /*elided*/ any;
        maxScalar(b: number): /*elided*/ any;
        ceil(): /*elided*/ any;
        floor(): /*elided*/ any;
        abs(): /*elided*/ any;
        min(b: IBaseVector<4>): /*elided*/ any;
        max(b: IBaseVector<4>): /*elided*/ any;
        clamp(min: number, max: number): /*elided*/ any;
        vectorDotDistance(b: IBaseVector<4>): number;
        vectorDistance(b: IBaseVector<4>): number;
        vectorDistanceSqr(b: IBaseVector<4>): number;
        copy(): /*elided*/ any;
        vectorLengthSqr(): number;
        vectorLength(): number;
        rot2d(A: number, axis?: number): /*elided*/ any;
        dot(b: IBaseVector<4>): number;
        loadX(x: number): /*elided*/ any;
        loadXY(x: number, y: number): /*elided*/ any;
        loadXYZ(x: number, y: number, z: number): /*elided*/ any;
        loadXYZW(x: number, y: number, z: number, w: number): /*elided*/ any;
        swapAxes(axis1: 0 | 1 | 2 | 3, axis2: 0 | 1 | 2 | 3): /*elided*/ any;
        /** somewhat crappy spherical interpolation */
        sinterp(v2: IBaseVector<4>, t: number): /*elided*/ any;
        /** perpendicular swap */
        perpSwap(axis1?: 0 | 1 | 2 | 3, axis2?: 0 | 1 | 2 | 3, sign?: number): /*elided*/ any;
        normalize(): /*elided*/ any;
        /** Returns w value. */
        multVecMatrix(matrix: Matrix4): number;
        mulVecQuat(q: IQuat): /*elided*/ any;
        cross(v: IBaseVector<4>): /*elided*/ any;
        preNormalizedAngle(v2: IBaseVector<4>): number;
        toCSS(): string;
        loadSTRUCT(reader: StructReader</*elided*/ any>): void;
    };
    structName: string | undefined;
    STRUCT: string | undefined;
    normalizedDot4(v1: IBaseVector<4>, v2: IBaseVector<4>, v3: IBaseVector<4>, v4: IBaseVector<4>): number;
    normalizedDot3(v1: IBaseVector<4>, center: IBaseVector<4>, v2: IBaseVector<4>): number;
};
export type Vector2 = InstanceType<typeof Vector2>;
export type Vector3 = InstanceType<typeof Vector3>;
export type Vector4 = InstanceType<typeof Vector4>;
export declare class Quat extends Vector4 {
    makeUnitQuat(): this;
    isZero(): boolean;
    mulQuat(qt: this): this;
    conjugate(): this;
    dotWithQuat(q2: this): number;
    canInvert(): boolean;
    invert(): this;
    sub(q2: this): this;
    /** if m is not undefined, will be used as output */
    toMatrix(m?: Matrix4): Matrix4;
    matrixToQuat(wmat: Matrix4): this;
    normalize(): this;
    axisAngleToQuat(axis: IBaseVector<3>, angle: number): this;
    rotationBetweenVecs(v1_: IBaseVector<3>, v2_: IBaseVector<3>, fac?: number): this;
    quatInterp(quat2: this, t: number): this;
}
/** Incredibly old matrix class. */
export declare const EulerOrders: {
    XYZ: number;
    XZY: number;
    YXZ: number;
    YZX: number;
    ZXY: number;
    ZYX: number;
};
export type EulerOrders = (typeof EulerOrders)[keyof typeof EulerOrders];
declare class internal_matrix {
    m11: number;
    m12: number;
    m13: number;
    m14: number;
    m21: number;
    m22: number;
    m23: number;
    m24: number;
    m31: number;
    m32: number;
    m33: number;
    m34: number;
    m41: number;
    m42: number;
    m43: number;
    m44: number;
    constructor();
}
export declare class Matrix4 {
    static STRUCT: string;
    static setUniformArray?: number[];
    static setUniformWebGLArray?: Float32Array;
    $matrix: internal_matrix;
    isPersp: boolean;
    constructor(m?: Matrix4 | number[] | Float32Array | Float64Array);
    static fromJSON(json: any): Matrix4;
    copy(): Matrix4;
    clone(): Matrix4;
    addToHashDigest(hash: util.HashDigest): this;
    equals(m: this): boolean;
    loadColumn(i: number, vec: IVector4 | number[]): this;
    copyColumnTo(i: number, vec: IVector4 | number[]): number[] | IVector4;
    copyColumn(i: number): number[] | IVector4;
    load(b: Matrix4 | number[] | Float32Array | Float64Array): this;
    toJSON(): {
        isPersp: boolean;
        items: number[];
    };
    getAsArray(): number[];
    getAsFloat32Array(): Float32Array<ArrayBuffer>;
    setUniform(ctx: WebGL2RenderingContext | WebGLRenderingContext, loc: WebGLUniformLocation, transpose?: boolean): this;
    makeIdentity(): this;
    transpose(): this;
    determinant(): number;
    invert(): this | null;
    translate(x: number, y: number, z: number): this;
    preTranslate(x: number, y: number, z: number): this;
    scale(x: number | any, y: number, z: number, w?: number): this;
    preScale(x: number, y: number, z: number, w?: number): this;
    euler_rotate_order(x: number, y: number, z: number, order?: number): this;
    euler_rotate(x: number, y: number, z: number): this;
    toString(): string;
    rotate(angle: number, x: number | any, y: number, z: number): this | undefined;
    normalize(): this;
    clearTranslation(set_w_to_one?: boolean): this;
    setTranslation(x: number | any, y: number, z: number, resetW?: boolean): this;
    makeNormalMatrix(normal: Vector3, up?: Vector3): this;
    preMultiply(mat: this | Matrix4): this;
    multiply(mat: this | Matrix4): this;
    divide(divisor: number): this;
    ortho(left: number, right: number, bottom: number, top: number, near: number, far: number): this;
    frustum(left: number, right: number, bottom: number, top: number, near: number, far: number): this;
    orthographic(scale: number, aspect: number, near: number, far: number): Matrix4;
    perspective(fovy: number, aspect: number, zNear: number, zFar: number): this;
    lookat(pos: Vector3, target: Vector3, up: Vector3): this;
    makeRotationOnly(): this;
    getAsVecs(): Vector4[];
    loadFromVecs(vecs: Vector4[]): this;
    alignAxis(axis: number, vec_: number[] | IVector3): this;
    decompose(_translate: any, _rotate?: any, _scale?: any, _skew?: any, _perspective?: any, order?: number): false | undefined;
    _determinant2x2(a: number, b: number, c: number, d: number): number;
    _determinant3x3(a1: number, a2: number, a3: number, b1: number, b2: number, b3: number, c1: number, c2: number, c3: number): number;
    _determinant4x4(): number;
    _makeAdjoint(): void;
    loadSTRUCT(reader: StructReader<this>): void;
}
export type VectorArg<V extends Vector2 | Vector3 | Vector4 | Quat, N extends 2 | 3 | 4> = VectorLikeOrHigher<N, V>;
export type Vector2Like = VectorArg<Vector2, 2>;
export type Vector3Like = VectorArg<Vector3, 3>;
export type Vector4Like = VectorArg<Vector4, 4>;
export {};
//# sourceMappingURL=vectormath.d.ts.map