export declare function rgb_to_hsv(r: number, g: number, b: number): number[];
export declare function hsv_to_rgb(h: number, s: number, v: number): number[];
export declare function cmyk_to_rgb(c: number, m: number, y: number, k: number): {
    [k: number]: number | undefined;
    0: number;
    1: number;
    2: number;
    length: number;
    LEN: 3;
    [Symbol.iterator]: (() => ArrayIterator<any>) | (() => ArrayIterator<number>);
    slice: (start?: number, end?: number) => number[];
    load(existing: number[] | ({
        0: number;
        1: number;
        2: number;
    } & {
        3?: number | undefined;
    } & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
    })): /*elided*/ any;
    load2(existing: number[] | ({
        0: number;
        1: number;
    } & {
        2?: number | undefined;
        3?: number | undefined;
    } & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any, t: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any)): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & {
            [k: number]: number | undefined;
            length: number;
            [Symbol.iterator](): Iterator<number>;
            slice(start?: number, end?: number): number[];
            sinterp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, t: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any)): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            copy(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            add(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            sub(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mul(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            div(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            min(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            max(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            floor(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            fract(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            ceil(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            abs(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            dot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalizedDot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            multVecMatrix(mat: import("../controller.js").Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            zero(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            negate(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
        }): number;
        normalize(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
    })): /*elided*/ any;
    load3(existing: number[] | ({
        0: number;
        1: number;
        2: number;
    } & {
        3?: number | undefined;
    } & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
    })): /*elided*/ any;
    normalizedDot(b: {
        0: number;
        1: number;
        2: number;
    } & {
        3?: number | undefined;
    } & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
    }): number;
    equals(b: {
        0: number;
        1: number;
        2: number;
    } & {
        3?: number | undefined;
    } & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
    }): boolean;
    zero(): /*elided*/ any;
    negate(): /*elided*/ any;
    combine(b: {
        0: number;
        1: number;
        2: number;
    } & {
        3?: number | undefined;
    } & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
    }, u: number, v: number): /*elided*/ any;
    interp(b: {
        0: number;
        1: number;
        2: number;
    } & {
        3?: number | undefined;
    } & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
    }, t: number): /*elided*/ any;
    add(b: {
        0: number;
        1: number;
        2: number;
    } & {
        3?: number | undefined;
    } & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
    }): /*elided*/ any;
    addFac(b: {
        0: number;
        1: number;
        2: number;
    } & {
        3?: number | undefined;
    } & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
    }, f: number): /*elided*/ any;
    fract(): /*elided*/ any;
    sub(b: {
        0: number;
        1: number;
        2: number;
    } & {
        3?: number | undefined;
    } & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
    }): /*elided*/ any;
    mul(b: {
        0: number;
        1: number;
        2: number;
    } & {
        3?: number | undefined;
    } & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
    }): /*elided*/ any;
    div(b: {
        0: number;
        1: number;
        2: number;
    } & {
        3?: number | undefined;
    } & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
    }): /*elided*/ any;
    mulScalar(b: number): /*elided*/ any;
    divScalar(b: number): /*elided*/ any;
    addScalar(b: number): /*elided*/ any;
    subScalar(b: number): /*elided*/ any;
    minScalar(b: number): /*elided*/ any;
    maxScalar(b: number): /*elided*/ any;
    ceil(): /*elided*/ any;
    floor(): /*elided*/ any;
    abs(): /*elided*/ any;
    min(b: {
        0: number;
        1: number;
        2: number;
    } & {
        3?: number | undefined;
    } & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
    }): /*elided*/ any;
    max(b: {
        0: number;
        1: number;
        2: number;
    } & {
        3?: number | undefined;
    } & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
    }): /*elided*/ any;
    clamp(min: number, max: number): /*elided*/ any;
    vectorDotDistance(b: {
        0: number;
        1: number;
        2: number;
    } & {
        3?: number | undefined;
    } & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
    }): number;
    vectorDistance(b: {
        0: number;
        1: number;
        2: number;
    } & {
        3?: number | undefined;
    } & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
    }): number;
    vectorDistanceSqr(b: {
        0: number;
        1: number;
        2: number;
    } & {
        3?: number | undefined;
    } & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
    }): number;
    copy(): /*elided*/ any;
    vectorLengthSqr(): number;
    vectorLength(): number;
    rot2d(A: number, axis?: number): /*elided*/ any;
    dot(b: {
        0: number;
        1: number;
        2: number;
    } & {
        3?: number | undefined;
    } & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
    }): number;
    loadX(x: number): /*elided*/ any;
    loadXY(x: number, y: number): /*elided*/ any;
    loadXYZ(x: number, y: number, z: number): /*elided*/ any;
    swapAxes(axis1: 0 | 1 | 2, axis2: 0 | 1 | 2): /*elided*/ any;
    sinterp(v2: {
        0: number;
        1: number;
        2: number;
    } & {
        3?: number | undefined;
    } & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
    }, t: number): /*elided*/ any;
    perpSwap(axis1?: 0 | 1 | 2, axis2?: 0 | 1 | 2, sign?: number): /*elided*/ any;
    normalize(): /*elided*/ any;
    multVecMatrix(matrix: import("../controller.js").Matrix4, ignore_w?: boolean): number;
    mulVecQuat(q: import("../controller.js").IQuat): /*elided*/ any;
    cross(v: {
        0: number;
        1: number;
        2: number;
    } & {
        3?: number | undefined;
    } & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
    }): /*elided*/ any;
    preNormalizedAngle(v2: {
        0: number;
        1: number;
        2: number;
    } & {
        3?: number | undefined;
    } & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
    }): number;
    toCSS(): string;
    loadSTRUCT(reader: import("./nstructjs_es6.js").StructReader</*elided*/ any>): void;
};
export declare function rgb_to_cmyk(r: number, g: number, b: number): {
    [k: number]: number | undefined;
    0: number;
    1: number;
    2: number;
    3: number;
    length: number;
    LEN: 4;
    [Symbol.iterator]: (() => ArrayIterator<any>) | (() => ArrayIterator<number>);
    slice: (start?: number, end?: number) => number[];
    load(existing: number[] | ({
        0: number;
        1: number;
        2: number;
        3: number;
    } & {} & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & {
            [k: number]: number | undefined;
            length: number;
            [Symbol.iterator](): Iterator<number>;
            slice(start?: number, end?: number): number[];
            sinterp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, t: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any)): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            copy(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            add(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            sub(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mul(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            div(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            min(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            max(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            floor(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            fract(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            ceil(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            abs(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            dot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalizedDot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            multVecMatrix(mat: import("../controller.js").Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            zero(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            negate(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
        }): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
    })): /*elided*/ any;
    load2(existing: number[] | ({
        0: number;
        1: number;
    } & {
        2?: number | undefined;
        3?: number | undefined;
    } & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any, t: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any)): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & {
            [k: number]: number | undefined;
            length: number;
            [Symbol.iterator](): Iterator<number>;
            slice(start?: number, end?: number): number[];
            sinterp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, t: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any)): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            copy(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            add(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            sub(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mul(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            div(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            min(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            max(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            floor(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            fract(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            ceil(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            abs(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            dot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalizedDot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            multVecMatrix(mat: import("../controller.js").Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            zero(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            negate(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
        }): number;
        normalize(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & /*elided*/ any;
    })): /*elided*/ any;
    load3(existing: number[] | ({
        0: number;
        1: number;
        2: number;
    } & {
        3?: number | undefined;
    } & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & /*elided*/ any;
    })): /*elided*/ any;
    load4(existing: number[] | ({
        0: number;
        1: number;
        2: number;
        3: number;
    } & {} & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & {
            [k: number]: number | undefined;
            length: number;
            [Symbol.iterator](): Iterator<number>;
            slice(start?: number, end?: number): number[];
            sinterp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, t: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any)): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            copy(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            add(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            sub(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mul(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            div(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            min(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            max(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            floor(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            fract(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            ceil(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            abs(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            dot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalizedDot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            multVecMatrix(mat: import("../controller.js").Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            zero(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            negate(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
        }): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
    })): /*elided*/ any;
    normalizedDot(b: {
        0: number;
        1: number;
        2: number;
        3: number;
    } & {} & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & {
            [k: number]: number | undefined;
            length: number;
            [Symbol.iterator](): Iterator<number>;
            slice(start?: number, end?: number): number[];
            sinterp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, t: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any)): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            copy(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            add(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            sub(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mul(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            div(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            min(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            max(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            floor(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            fract(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            ceil(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            abs(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            dot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalizedDot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            multVecMatrix(mat: import("../controller.js").Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            zero(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            negate(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
        }): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
    }): number;
    equals(b: {
        0: number;
        1: number;
        2: number;
        3: number;
    } & {} & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & {
            [k: number]: number | undefined;
            length: number;
            [Symbol.iterator](): Iterator<number>;
            slice(start?: number, end?: number): number[];
            sinterp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, t: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any)): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            copy(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            add(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            sub(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mul(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            div(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            min(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            max(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            floor(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            fract(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            ceil(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            abs(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            dot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalizedDot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            multVecMatrix(mat: import("../controller.js").Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            zero(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            negate(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
        }): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
    }): boolean;
    zero(): /*elided*/ any;
    negate(): /*elided*/ any;
    combine(b: {
        0: number;
        1: number;
        2: number;
        3: number;
    } & {} & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & {
            [k: number]: number | undefined;
            length: number;
            [Symbol.iterator](): Iterator<number>;
            slice(start?: number, end?: number): number[];
            sinterp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, t: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any)): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            copy(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            add(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            sub(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mul(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            div(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            min(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            max(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            floor(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            fract(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            ceil(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            abs(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            dot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalizedDot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            multVecMatrix(mat: import("../controller.js").Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            zero(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            negate(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
        }): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
    }, u: number, v: number): /*elided*/ any;
    interp(b: {
        0: number;
        1: number;
        2: number;
        3: number;
    } & {} & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & {
            [k: number]: number | undefined;
            length: number;
            [Symbol.iterator](): Iterator<number>;
            slice(start?: number, end?: number): number[];
            sinterp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, t: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any)): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            copy(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            add(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            sub(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mul(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            div(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            min(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            max(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            floor(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            fract(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            ceil(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            abs(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            dot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalizedDot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            multVecMatrix(mat: import("../controller.js").Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            zero(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            negate(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
        }): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
    }, t: number): /*elided*/ any;
    add(b: {
        0: number;
        1: number;
        2: number;
        3: number;
    } & {} & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & {
            [k: number]: number | undefined;
            length: number;
            [Symbol.iterator](): Iterator<number>;
            slice(start?: number, end?: number): number[];
            sinterp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, t: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any)): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            copy(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            add(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            sub(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mul(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            div(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            min(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            max(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            floor(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            fract(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            ceil(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            abs(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            dot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalizedDot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            multVecMatrix(mat: import("../controller.js").Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            zero(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            negate(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
        }): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
    }): /*elided*/ any;
    addFac(b: {
        0: number;
        1: number;
        2: number;
        3: number;
    } & {} & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & {
            [k: number]: number | undefined;
            length: number;
            [Symbol.iterator](): Iterator<number>;
            slice(start?: number, end?: number): number[];
            sinterp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, t: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any)): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            copy(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            add(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            sub(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mul(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            div(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            min(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            max(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            floor(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            fract(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            ceil(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            abs(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            dot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalizedDot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            multVecMatrix(mat: import("../controller.js").Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            zero(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            negate(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
        }): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
    }, f: number): /*elided*/ any;
    fract(): /*elided*/ any;
    sub(b: {
        0: number;
        1: number;
        2: number;
        3: number;
    } & {} & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & {
            [k: number]: number | undefined;
            length: number;
            [Symbol.iterator](): Iterator<number>;
            slice(start?: number, end?: number): number[];
            sinterp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, t: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any)): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            copy(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            add(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            sub(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mul(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            div(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            min(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            max(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            floor(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            fract(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            ceil(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            abs(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            dot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalizedDot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            multVecMatrix(mat: import("../controller.js").Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            zero(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            negate(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
        }): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
    }): /*elided*/ any;
    mul(b: {
        0: number;
        1: number;
        2: number;
        3: number;
    } & {} & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & {
            [k: number]: number | undefined;
            length: number;
            [Symbol.iterator](): Iterator<number>;
            slice(start?: number, end?: number): number[];
            sinterp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, t: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any)): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            copy(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            add(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            sub(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mul(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            div(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            min(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            max(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            floor(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            fract(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            ceil(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            abs(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            dot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalizedDot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            multVecMatrix(mat: import("../controller.js").Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            zero(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            negate(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
        }): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
    }): /*elided*/ any;
    div(b: {
        0: number;
        1: number;
        2: number;
        3: number;
    } & {} & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & {
            [k: number]: number | undefined;
            length: number;
            [Symbol.iterator](): Iterator<number>;
            slice(start?: number, end?: number): number[];
            sinterp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, t: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any)): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            copy(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            add(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            sub(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mul(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            div(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            min(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            max(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            floor(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            fract(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            ceil(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            abs(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            dot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalizedDot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            multVecMatrix(mat: import("../controller.js").Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            zero(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            negate(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
        }): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
    }): /*elided*/ any;
    mulScalar(b: number): /*elided*/ any;
    divScalar(b: number): /*elided*/ any;
    addScalar(b: number): /*elided*/ any;
    subScalar(b: number): /*elided*/ any;
    minScalar(b: number): /*elided*/ any;
    maxScalar(b: number): /*elided*/ any;
    ceil(): /*elided*/ any;
    floor(): /*elided*/ any;
    abs(): /*elided*/ any;
    min(b: {
        0: number;
        1: number;
        2: number;
        3: number;
    } & {} & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & {
            [k: number]: number | undefined;
            length: number;
            [Symbol.iterator](): Iterator<number>;
            slice(start?: number, end?: number): number[];
            sinterp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, t: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any)): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            copy(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            add(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            sub(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mul(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            div(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            min(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            max(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            floor(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            fract(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            ceil(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            abs(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            dot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalizedDot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            multVecMatrix(mat: import("../controller.js").Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            zero(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            negate(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
        }): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
    }): /*elided*/ any;
    max(b: {
        0: number;
        1: number;
        2: number;
        3: number;
    } & {} & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & {
            [k: number]: number | undefined;
            length: number;
            [Symbol.iterator](): Iterator<number>;
            slice(start?: number, end?: number): number[];
            sinterp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, t: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any)): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            copy(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            add(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            sub(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mul(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            div(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            min(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            max(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            floor(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            fract(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            ceil(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            abs(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            dot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalizedDot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            multVecMatrix(mat: import("../controller.js").Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            zero(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            negate(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
        }): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
    }): /*elided*/ any;
    clamp(min: number, max: number): /*elided*/ any;
    vectorDotDistance(b: {
        0: number;
        1: number;
        2: number;
        3: number;
    } & {} & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & {
            [k: number]: number | undefined;
            length: number;
            [Symbol.iterator](): Iterator<number>;
            slice(start?: number, end?: number): number[];
            sinterp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, t: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any)): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            copy(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            add(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            sub(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mul(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            div(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            min(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            max(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            floor(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            fract(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            ceil(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            abs(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            dot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalizedDot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            multVecMatrix(mat: import("../controller.js").Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            zero(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            negate(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
        }): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
    }): number;
    vectorDistance(b: {
        0: number;
        1: number;
        2: number;
        3: number;
    } & {} & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & {
            [k: number]: number | undefined;
            length: number;
            [Symbol.iterator](): Iterator<number>;
            slice(start?: number, end?: number): number[];
            sinterp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, t: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any)): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            copy(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            add(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            sub(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mul(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            div(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            min(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            max(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            floor(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            fract(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            ceil(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            abs(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            dot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalizedDot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            multVecMatrix(mat: import("../controller.js").Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            zero(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            negate(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
        }): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
    }): number;
    vectorDistanceSqr(b: {
        0: number;
        1: number;
        2: number;
        3: number;
    } & {} & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & {
            [k: number]: number | undefined;
            length: number;
            [Symbol.iterator](): Iterator<number>;
            slice(start?: number, end?: number): number[];
            sinterp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, t: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any)): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            copy(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            add(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            sub(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mul(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            div(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            min(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            max(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            floor(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            fract(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            ceil(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            abs(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            dot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalizedDot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            multVecMatrix(mat: import("../controller.js").Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            zero(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            negate(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
        }): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
    }): number;
    copy(): /*elided*/ any;
    vectorLengthSqr(): number;
    vectorLength(): number;
    rot2d(A: number, axis?: number): /*elided*/ any;
    dot(b: {
        0: number;
        1: number;
        2: number;
        3: number;
    } & {} & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & {
            [k: number]: number | undefined;
            length: number;
            [Symbol.iterator](): Iterator<number>;
            slice(start?: number, end?: number): number[];
            sinterp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, t: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any)): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            copy(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            add(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            sub(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mul(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            div(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            min(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            max(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            floor(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            fract(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            ceil(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            abs(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            dot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalizedDot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            multVecMatrix(mat: import("../controller.js").Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            zero(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            negate(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
        }): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
    }): number;
    loadX(x: number): /*elided*/ any;
    loadXY(x: number, y: number): /*elided*/ any;
    loadXYZ(x: number, y: number, z: number): /*elided*/ any;
    loadXYZW(x: number, y: number, z: number, w: number): /*elided*/ any;
    swapAxes(axis1: 0 | 1 | 2 | 3, axis2: 0 | 1 | 2 | 3): /*elided*/ any;
    sinterp(v2: {
        0: number;
        1: number;
        2: number;
        3: number;
    } & {} & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & {
            [k: number]: number | undefined;
            length: number;
            [Symbol.iterator](): Iterator<number>;
            slice(start?: number, end?: number): number[];
            sinterp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, t: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any)): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            copy(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            add(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            sub(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mul(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            div(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            min(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            max(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            floor(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            fract(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            ceil(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            abs(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            dot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalizedDot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            multVecMatrix(mat: import("../controller.js").Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            zero(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            negate(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
        }): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
    }, t: number): /*elided*/ any;
    perpSwap(axis1?: 0 | 1 | 2 | 3, axis2?: 0 | 1 | 2 | 3, sign?: number): /*elided*/ any;
    normalize(): /*elided*/ any;
    multVecMatrix(matrix: import("../controller.js").Matrix4): number;
    mulVecQuat(q: import("../controller.js").IQuat): /*elided*/ any;
    cross(v: {
        0: number;
        1: number;
        2: number;
        3: number;
    } & {} & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & {
            [k: number]: number | undefined;
            length: number;
            [Symbol.iterator](): Iterator<number>;
            slice(start?: number, end?: number): number[];
            sinterp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, t: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any)): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            copy(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            add(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            sub(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mul(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            div(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            min(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            max(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            floor(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            fract(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            ceil(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            abs(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            dot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalizedDot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            multVecMatrix(mat: import("../controller.js").Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            zero(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            negate(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
        }): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
    }): /*elided*/ any;
    preNormalizedAngle(v2: {
        0: number;
        1: number;
        2: number;
        3: number;
    } & {} & {
        [k: number]: number | undefined;
        length: number;
        [Symbol.iterator](): Iterator<number>;
        slice(start?: number, end?: number): number[];
        sinterp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, t: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any)): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        copy(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        add(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        sub(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mul(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        div(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        min(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        max(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        floor(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        fract(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        ceil(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        abs(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        dot(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        normalizedDot(b: {
            0: number;
            1: number;
            2: number;
        } & {
            3?: number | undefined;
        } & {
            [k: number]: number | undefined;
            length: number;
            [Symbol.iterator](): Iterator<number>;
            slice(start?: number, end?: number): number[];
            sinterp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, t: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            load(b: (import("../controller.js").INumVectorLimited<2> | import("../controller.js").INumVectorLimited<3> | import("../controller.js").INumVectorLimited<4> | import("../controller.js").IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any)): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            copy(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            add(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            sub(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mul(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            div(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            min(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            max(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            floor(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            fract(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            ceil(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            abs(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            dot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalizedDot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any): number;
            multVecMatrix(mat: import("../controller.js").Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            zero(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            negate(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & /*elided*/ any;
        }): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any): number;
        multVecMatrix(mat: import("../controller.js").Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        zero(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        negate(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & /*elided*/ any;
    }): number;
    toCSS(): string;
    loadSTRUCT(reader: import("./nstructjs_es6.js").StructReader</*elided*/ any>): void;
};
//# sourceMappingURL=colorutils.d.ts.map