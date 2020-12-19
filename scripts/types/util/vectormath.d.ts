export as namespace vectormath;

export declare class BaseVector extends Array {
    load(b: BaseVector): BaseVector;

    //all math operates in-place, no new objects
    add(b: BaseVector): BaseVector;

    sub(b: BaseVector): BaseVector;

    mul(b: BaseVector): BaseVector;

    div(b: BaseVector): BaseVector;

    mulScalar(b: number): BaseVector;

    divScalar(b: number): BaseVector;

    addScalar(b: number): BaseVector;

    subScalar(b: number): BaseVector;

    min(b: BaseVector): BaseVector;

    max(b: BaseVector): BaseVector;

    floor(): BaseVector;

    ceil(): BaseVector;

    abs(): BaseVector;

    vectorLength(): number;

    vectorLengthSqr(): number;

    multVecMatrix(mat: Matrix4): number;

    dot(b: BaseVector): number;
    cross(b: BaseVector): BaseVector;
    normalize(): BaseVector;

}

declare class Vector2 extends BaseVector {

}
declare class Vector3 extends BaseVector {

}

declare class Vector4 extends BaseVector {

}

declare class Quat extends Vector4 {

}

declare class Matrix4Data {
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
}

declare class Matrix4 {
    $matrix: Matrix4Data;

    //almost all methods operator in-place, though some allocate temporary objects internally
    multiply(b: Matrix4): Matrix4;

    makeIdentity(): Matrix4;
}
