/**
 * Assorted geometry utility functions.
 *
 * This file was originally written in a modified form of ES6 way back in ~2010.
 * It was then transpiled to ES5 before being ported later to ES6.
 *
 * TODO: cleanup this file.
 */
import { StructReader } from "./nstructjs";
import { Vector2, Vector3, Vector4, Matrix4, Vector2Like, Vector3Like, Vector4Like, Number2, Number3 } from "./vectormath.js";
type Vec2Like = Vector2Like;
type Vec3Like = Vector3Like;
type Vec4Like = Vector4Like;
export declare function quad_bilinear(v1: number, v2: number, v3: number, v4: number, u: number, v: number): number;
export declare function quad_uv_2d(p: Vec2Like, v1: Vec2Like, v2: Vec2Like, v3: Vec2Like, v4: Vec2Like): {
    [k: number]: number | undefined;
    0: number;
    1: number;
    length: number;
    LEN: 2;
    [Symbol.iterator]: (() => ArrayIterator<any>) | (() => ArrayIterator<number>);
    slice: (start?: number, end?: number) => number[];
    load(existing: number[] | import("./vectormath.js").IBaseVector<2>): /*elided*/ any;
    load2(existing: number[] | import("./vectormath.js").IBaseVector<2>): /*elided*/ any;
    normalizedDot(b: import("./vectormath.js").IBaseVector<2>): number;
    equals(b: import("./vectormath.js").IBaseVector<2>): boolean;
    zero(): /*elided*/ any;
    negate(): /*elided*/ any;
    combine(b: import("./vectormath.js").IBaseVector<2>, u: number, v: number): /*elided*/ any;
    interp(b: import("./vectormath.js").IBaseVector<2>, t: number): /*elided*/ any;
    add(b: import("./vectormath.js").IBaseVector<2>): /*elided*/ any;
    addFac(b: import("./vectormath.js").IBaseVector<2>, f: number): /*elided*/ any;
    fract(): /*elided*/ any;
    sub(b: import("./vectormath.js").IBaseVector<2>): /*elided*/ any;
    mul(b: import("./vectormath.js").IBaseVector<2>): /*elided*/ any;
    div(b: import("./vectormath.js").IBaseVector<2>): /*elided*/ any;
    mulScalar(b: number): /*elided*/ any;
    divScalar(b: number): /*elided*/ any;
    addScalar(b: number): /*elided*/ any;
    subScalar(b: number): /*elided*/ any;
    minScalar(b: number): /*elided*/ any;
    maxScalar(b: number): /*elided*/ any;
    ceil(): /*elided*/ any;
    floor(): /*elided*/ any;
    abs(): /*elided*/ any;
    min(b: import("./vectormath.js").IBaseVector<2>): /*elided*/ any;
    max(b: import("./vectormath.js").IBaseVector<2>): /*elided*/ any;
    clamp(min: number, max: number): /*elided*/ any;
    vectorDotDistance(b: import("./vectormath.js").IBaseVector<2>): number;
    vectorDistance(b: import("./vectormath.js").IBaseVector<2>): number;
    vectorDistanceSqr(b: import("./vectormath.js").IBaseVector<2>): number;
    copy(): /*elided*/ any;
    vectorLengthSqr(): number;
    vectorLength(): number;
    rot2d(A: number, axis?: number): /*elided*/ any;
    dot(b: import("./vectormath.js").IBaseVector<2>): number;
    loadX(x: number): /*elided*/ any;
    loadXY(x: number, y: number): /*elided*/ any;
    swapAxes(axis1: 0 | 1, axis2: 0 | 1): /*elided*/ any;
    sinterp(v2: import("./vectormath.js").IBaseVector<2>, t: number): /*elided*/ any;
    perpSwap(axis1?: 0 | 1, axis2?: 0 | 1, sign?: number): /*elided*/ any;
    normalize(): /*elided*/ any;
    multVecMatrix(matrix: Matrix4, ignore_w?: boolean): /*elided*/ any;
    mulVecQuat(q: import("./vectormath.js").IQuat): /*elided*/ any;
    preNormalizedAngle(v2: import("./vectormath.js").IBaseVector<2>): number;
    loadSTRUCT(reader: StructReader</*elided*/ any>): void;
};
export declare const ClosestModes: {
    CLOSEST: number;
    START: number;
    END: number;
    ENDPOINTS: number;
    ALL: number;
};
/** @deprecated */
export declare class AbstractCurve {
    evaluate(t: number): void;
    derivative(t: number): void;
    curvature(t: number): void;
    normal(t: number): void;
    width(t: number): void;
}
/** @deprecated */
export declare class ClosestCurveRets {
    p: Vec3Like;
    t: number;
    constructor();
}
/** @deprecated */ export declare function closestPoint(p: Vec3Like, curve: AbstractCurve, mode: number): void;
export declare function normal_poly(vs: Vec3Like[]): {
    [k: number]: number | undefined;
    0: number;
    1: number;
    2: number;
    length: number;
    LEN: 3;
    [Symbol.iterator]: (() => ArrayIterator<any>) | (() => ArrayIterator<number>);
    slice: (start?: number, end?: number) => number[];
    load(existing: number[] | import("./vectormath.js").IBaseVector<3>): /*elided*/ any;
    load2(existing: number[] | import("./vectormath.js").IBaseVector<2>): /*elided*/ any;
    load3(existing: number[] | import("./vectormath.js").IBaseVector<3>): /*elided*/ any;
    normalizedDot(b: import("./vectormath.js").IBaseVector<3>): number;
    equals(b: import("./vectormath.js").IBaseVector<3>): boolean;
    zero(): /*elided*/ any;
    negate(): /*elided*/ any;
    combine(b: import("./vectormath.js").IBaseVector<3>, u: number, v: number): /*elided*/ any;
    interp(b: import("./vectormath.js").IBaseVector<3>, t: number): /*elided*/ any;
    add(b: import("./vectormath.js").IBaseVector<3>): /*elided*/ any;
    addFac(b: import("./vectormath.js").IBaseVector<3>, f: number): /*elided*/ any;
    fract(): /*elided*/ any;
    sub(b: import("./vectormath.js").IBaseVector<3>): /*elided*/ any;
    mul(b: import("./vectormath.js").IBaseVector<3>): /*elided*/ any;
    div(b: import("./vectormath.js").IBaseVector<3>): /*elided*/ any;
    mulScalar(b: number): /*elided*/ any;
    divScalar(b: number): /*elided*/ any;
    addScalar(b: number): /*elided*/ any;
    subScalar(b: number): /*elided*/ any;
    minScalar(b: number): /*elided*/ any;
    maxScalar(b: number): /*elided*/ any;
    ceil(): /*elided*/ any;
    floor(): /*elided*/ any;
    abs(): /*elided*/ any;
    min(b: import("./vectormath.js").IBaseVector<3>): /*elided*/ any;
    max(b: import("./vectormath.js").IBaseVector<3>): /*elided*/ any;
    clamp(min: number, max: number): /*elided*/ any;
    vectorDotDistance(b: import("./vectormath.js").IBaseVector<3>): number;
    vectorDistance(b: import("./vectormath.js").IBaseVector<3>): number;
    vectorDistanceSqr(b: import("./vectormath.js").IBaseVector<3>): number;
    copy(): /*elided*/ any;
    vectorLengthSqr(): number;
    vectorLength(): number;
    rot2d(A: number, axis?: number): /*elided*/ any;
    dot(b: import("./vectormath.js").IBaseVector<3>): number;
    loadX(x: number): /*elided*/ any;
    loadXY(x: number, y: number): /*elided*/ any;
    loadXYZ(x: number, y: number, z: number): /*elided*/ any;
    swapAxes(axis1: 0 | 1 | 2, axis2: 0 | 1 | 2): /*elided*/ any;
    sinterp(v2: import("./vectormath.js").IBaseVector<3>, t: number): /*elided*/ any;
    perpSwap(axis1?: 0 | 1 | 2, axis2?: 0 | 1 | 2, sign?: number): /*elided*/ any;
    normalize(): /*elided*/ any;
    multVecMatrix(matrix: Matrix4, ignore_w?: boolean): number;
    mulVecQuat(q: import("./vectormath.js").IQuat): /*elided*/ any;
    cross(v: import("./vectormath.js").IBaseVector<3>): /*elided*/ any;
    preNormalizedAngle(v2: import("./vectormath.js").IBaseVector<3>): number;
    toCSS(): string;
    loadSTRUCT(reader: StructReader</*elided*/ any>): void;
};
/**

v2

v1------v3

v4

*/ export declare function dihedral_v3_sqr(v1: Vec3Like, v2: Vec3Like, v3: Vec3Like, v4: Vec3Like): number;
export declare function tet_volume(a: Vec3Like, b: Vec3Like, c: Vec3Like, d: Vec3Like): number;
export declare function calc_projection_axes(no: Vec3Like): Number3[];
export declare function aabb_isect_line_3d(v1: Vec3Like, v2: Vec3Like, min: Vec3Like, max: Vec3Like): boolean;
export declare function aabb_isect_cylinder_3d(v1: Vec3Like, v2: Vec3Like, radius: number, min: Vec3Like, max: Vec3Like): boolean;
export declare function barycentric_v2(p: Vec2Like, v1: Vec2Like, v2: Vec2Like, v3: Vec2Like, axis1?: Number2, axis2?: Number2, out?: Vec2Like): Vec2Like;
export declare function closest_point_on_quad(p: Vec3Like, v1: Vec3Like, v2: Vec3Like, v3: Vec3Like, v4: Vec3Like, n?: Vec3Like, uvw?: Vec3Like): {
    co: Vector3;
    uv: Vector2;
    dist: number;
};
export declare function closest_point_on_tri(p: Vec3Like, v1: Vec3Like, v2: Vec3Like, v3: Vec3Like, n?: Vec3Like, uvw?: Vec3Like): {
    co: Vector3;
    uv: Vector2;
    dist: number;
};
export declare function dist_to_tri_v3_old(co: Vec3Like, v1: Vec3Like, v2: Vec3Like, v3: Vec3Like, no?: Vec3Like): number;
export declare function dist_to_tri_v3(p: Vec3Like, v1: Vec3Like, v2: Vec3Like, v3: Vec3Like, n?: Vec3Like): number;
export declare function dist_to_tri_v3_sqr(p: Vec3Like, v1: Vec3Like, v2: Vec3Like, v3: Vec3Like, n?: Vec3Like): number;
export declare function tri_area(v1: Vec3Like, v2: Vec3Like, v3: Vec3Like): number;
export declare function aabb_overlap_area(pos1: Vec2Like, size1: Vec2Like, pos2: Vec2Like, size2: Vec2Like): number;
/**
 * Returns true if two aabbs intersect
 * @param {*} pos1
 * @param {*} size1
 * @param {*} pos2
 * @param {*} size2
 */ export declare function aabb_isect_2d(pos1: Vec2Like, size1: Vec2Like, pos2: Vec2Like, size2: Vec2Like): boolean;
export declare function aabb_isect_3d(pos1: Vec3Like, size1: Vec3Like, pos2: Vec3Like, size2: Vec3Like): boolean;
/**
 * Returns aabb that's the intersection of two aabbs
 * @param {*} pos1
 * @param {*} size1
 * @param {*} pos2
 * @param {*} size2
 */ export declare function aabb_intersect_2d(pos1: Vec2Like, size1: Vec2Like, pos2: Vec2Like, size2: Vec2Like): {
    pos: Vector2;
    size: Vector2;
} | undefined;
export declare function aabb_intersect_3d(min1: Vec3Like, max1: Vec3Like, min2: Vec3Like, max2: Vec3Like): boolean;
/**
 * AABB union of a and b.
 * Result is in a.
 *
 * @param a List of two vectors
 * @param b List of two vectors
 * @returns a
 */ export declare function aabb_union(a: [Vec2Like, Vec2Like], b: [Vec2Like, Vec2Like]): [Vec2Like, Vec2Like];
export declare function aabb_union_2d(pos1: Vec2Like, size1: Vec2Like, pos2: Vec2Like, size2: Vec2Like): {
    pos: Vector2;
    size: Vector2;
};
export declare const feps = 2.22e-16;
export declare const COLINEAR = 1;
export declare const LINECROSS = 2;
export declare const COLINEAR_ISECT = 3;
export declare const SQRT2: number;
export declare const FEPS_DATA: {
    F16: number;
    F32: number;
    F64: number;
};
export declare const FEPS: number;
export declare const FLOAT_MIN = -1e+21;
export declare const FLOAT_MAX = 1e+22;
export declare const Matrix4UI: typeof Matrix4;
export declare function get_rect_points(p: Vec2Like | Vec3Like, size: Vec2Like | Vec3Like): (Vec2Like | Vec3Like)[];
export declare function get_rect_lines(p: Vec2Like | Vec3Like, size: Vec2Like | Vec3Like): [Vec2Like | Vec3Like, Vec2Like | Vec3Like][];
export declare function simple_tri_aabb_isect(v1: Vec3Like, v2: Vec3Like, v3: Vec3Like, min: Vec3Like, max: Vec3Like): boolean;
export declare class MinMax1 {
    min: number;
    max: number;
    construtor(): void;
    minmax(n: number): void;
    reset(): this;
    get empty(): boolean;
}
export declare class MinMax<N extends 2 | 3 | 4 = 2> {
    #private;
    totaxis: number;
    min: Vector4;
    max: Vector4;
    static STRUCT: string;
    constructor(totaxis?: N);
    loadSTRUCT(reader: StructReader<this>): void;
    load(mm: MinMax<N>): this;
    reset(): this;
    get empty(): boolean;
    minmax_rect(_p: Vec2Like, _size: Vec2Like): this;
    minmax(_p: Vec2Like | [number, number, number?, number?]): void;
}
export declare function winding_axis(a: Vec3Like, b: Vec3Like, c: Vec3Like, up_axis: Number3): boolean;
/** returns false if clockwise */ export declare function winding(a: Vec2Like, b: Vec2Like, c: Vec2Like, zero_z?: boolean, tol?: number): boolean;
export declare function inrect_2d(p: Vec2Like, pos: Vec2Like, size: Vec2Like): boolean;
export declare function aabb_isect_line_2d(v1: Vec2Like, v2: Vec2Like, min: Vec2Like, max: Vec2Like): boolean;
export declare function expand_rect2d(pos: Vec2Like, size: Vec2Like, margin: Vec2Like): void;
export declare function expand_line(l: [Vector3, Vector3], margin: number): [Vector3, Vector3];
export declare function colinear(a: Vec2Like | Vec3Like, b: Vec2Like | Vec3Like, c: Vec2Like | Vec3Like, limit?: number, distLimit?: number): boolean;
export declare function colinear2d(a: Vec2Like, b: Vec2Like, c: Vec2Like, limit?: number, precise?: boolean): boolean;
export declare function corner_normal(vec1: Vec3Like, vec2: Vec3Like, width: number): Vector3;
export declare function line_line_isect<T extends Vec2Like | Vec3Like | Vec4Like>(v1: T, v2: T, v3: T, v4: T, test_segment?: boolean): T | typeof COLINEAR_ISECT | undefined;
export declare function line_line_cross(a: Vec2Like, b: Vec2Like, c: Vec2Like, d: Vec2Like): boolean;
export declare function point_in_aabb_2d(p: Vec2Like, min: Vec2Like, max: Vec2Like): boolean;
export declare function aabb_sphere_isect_2d(p: Vec2Like, r: number, min: Vec2Like, max: Vec2Like): boolean;
export declare function point_in_aabb(p: Vec3Like, min: Vec3Like, max: Vec3Like): boolean;
export declare function aabb_sphere_isect(p: Vec2Like | Vec3Like, r: number, min: Vec2Like | Vec3Like, max: Vec2Like | Vec3Like): boolean;
export declare function aabb_sphere_dist(p: Vec2Like | Vec3Like, min: Vec2Like | Vec3Like, max: Vec2Like | Vec3Like): number;
export declare function point_in_tri(p: Vec2Like, v1: Vec2Like, v2: Vec2Like, v3: Vec2Like): boolean;
export declare function quadIsConvex(v1: Vec2Like, v2: Vec2Like, v3: Vec2Like, v4: Vec2Like): boolean;
export declare function isNum(f: any): boolean;
export declare function normal_tri(v1: Vec3Like, v2: Vec3Like, v3: Vec3Like): Vector3;
export declare function normal_quad(v1: Vec3Like, v2: Vec3Like, v3: Vec3Like, v4: Vec3Like): Vector3;
export declare function normal_quad_old(v1: Vec3Like, v2: Vec3Like, v3: Vec3Like, v4: Vec3Like): Vector3;
export declare function line_isect<CALCT extends true | false | undefined>(v1: Vec2Like | Vec3Like, v2: Vec2Like | Vec3Like, v3: Vec2Like | Vec3Like, v4: Vec2Like | Vec3Like, calc_t?: CALCT): CALCT extends true ? [Vector3, number, number] : [Vector3, number];
export declare function dist_to_line_2d(p: Vec2Like, v1: Vec2Like, v2: Vec2Like, clip?: boolean, closest_co_out?: Vec2Like, t_out?: number): number;
export declare function dist_to_line_sqr(p: Vec2Like, v1: Vec2Like, v2: Vec2Like, clip?: boolean): number;
export declare function dist_to_line(p: Vec2Like | Vec3Like, v1: Vec2Like | Vec3Like, v2: Vec2Like | Vec3Like, clip?: boolean): number;
export declare function clip_line_w(_v1: Vec4Like, _v2: Vec4Like, znear: number, zfar: number): boolean;
export declare function closest_point_on_line(p: Vec3Like, v1: Vec3Like, v2: Vec3Like, clip?: boolean): [Vector3, number] | undefined;
export declare function circ_from_line_tan(a: Vec3Like, b: Vec3Like, t: Vec3Like): [Vector3, number];
export declare function circ_from_line_tan_2d(a: Vec2Like, b: Vec2Like, t: Vec2Like): [Vector2, number] | undefined;
export declare function get_tri_circ(a: Vec3Like, b: Vec3Like, c: Vec3Like): [Vector3, number];
export declare function gen_circle(m: any, origin: Vec3Like, r: number, stfeps: number): any[];
export declare function rot2d(v1: Vec2Like | Vec3Like, A: number, axis?: number): void;
/** @deprecated */
export declare function makeCircleMesh(gl: any, radius: number, stfeps: number): any;
export declare function minmax_verts(verts: any[]): [Vector3, Vector3];
export declare function unproject(vec: Vec3Like, ipers: Matrix4, iview: Matrix4): Vector3;
export declare function project(vec: Vec3Like, pers: Matrix4, view: Matrix4): Vector3;
export declare function get_boundary_winding(points: Vec3Like[]): boolean;
export declare class PlaneOps {
    axis: [Number3, Number3, Number3];
    constructor(normal: Vec3Like);
    reset_axis(no: Vec3Like): void;
    /** @deprecated use quadIsConvex */
    convex_quad(v1: Vec3Like, v2: Vec3Like, v3: Vec3Like, v4: Vec3Like): boolean;
    quadIsConvex(v1: Vec3Like, v2: Vec3Like, v3: Vec3Like, v4: Vec3Like): boolean;
    line_isect(v1: Vec3Like, v2: Vec3Like, v3: Vec3Like, v4: Vec3Like): [Vector3, number, number?];
    line_line_cross(l1: [Vec3Like, Vec3Like], l2: [Vec3Like, Vec3Like]): boolean;
    winding(v1: Vec3Like, v2: Vec3Like, v3: Vec3Like): boolean;
    colinear(v1: Vec3Like, v2: Vec3Like, v3: Vec3Like): boolean;
    get_boundary_winding(points: Vec3Like[]): boolean;
}
export declare function isect_ray_plane(planeorigin: Vec3Like, planenormal: Vec3Like, rayorigin: Vec3Like, raynormal: Vec3Like): Vector3 | undefined;
export declare function _old_isect_ray_plane(planeorigin: Vec3Like, planenormal: Vec3Like, rayorigin: Vec3Like, raynormal: Vec3Like): Vector3;
export declare class Mat4Stack {
    stack: Matrix4[];
    matrix: Matrix4;
    update_func?: () => void;
    constructor();
    set_internal_matrix(mat: Matrix4, update_func?: () => void): void;
    reset(mat: Matrix4): void;
    load(mat: Matrix4): void;
    multiply(mat: Matrix4): void;
    identity(): void;
    push(mat2?: Matrix4): void;
    pop(): Matrix4;
}
export declare function trilinear_v3(uvw: Vec3Like, boxverts: Vec3Like[]): Vector3;
export declare function point_in_hex(p: Vec3Like, boxverts: Vec3Like[], boxfacecents?: Vec3Like[], boxfacenormals?: Vec3Like[]): boolean;
export declare function trilinear_co(p: Vec3Like, boxverts: Vec3Like[]): Vector3;
export declare function trilinear_co2(p: Vec3Like, boxverts: Vec3Like[], uvw: Vec3Like): Vector3;
export declare function tri_angles(v1: Vec3Like, v2: Vec3Like, v3: Vec3Like): Vector3;
export declare function angle_between_vecs(v1: Vec2Like | Vec3Like, vcent: Vec2Like | Vec3Like, v2: Vec2Like | Vec3Like): number;
export {};
//# sourceMappingURL=math.d.ts.map