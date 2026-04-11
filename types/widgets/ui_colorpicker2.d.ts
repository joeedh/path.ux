import * as vectormath from "../path-controller/util/vectormath";
import * as ui_base from "../core/ui_base.js";
import * as ui from "../core/ui.js";
import { IContextBase } from "../core/context_base.js";
declare const Vector4: {
    new (existing?: number[] | ({
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
        load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
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
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
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
            multVecMatrix(mat: vectormath.Matrix4): void;
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
        multVecMatrix(mat: vectormath.Matrix4): void;
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
    })): {
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
            } & {} & any, t: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any)): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            copy(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            add(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            sub(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mul(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            div(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            min(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            max(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            floor(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            fract(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            ceil(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            abs(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            dot(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
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
                } & any, t: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                perpSwap(axis1?: number, axis2?: number, sign?: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any)): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                loadXY(x: number, y: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                copy(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                add(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                sub(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mul(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                div(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                subScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mulScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                divScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                minScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                maxScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                min(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                max(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                floor(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                fract(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                ceil(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                abs(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                dot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalizedDot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalize(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                vectorLength(): number;
                vectorLengthSqr(): number;
                vectorDistance(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                vectorDistanceSqr(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                multVecMatrix(mat: vectormath.Matrix4): void;
                interp(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addFac(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                rot2d(th: number, axis?: number | undefined): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                zero(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                negate(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                swapAxes(axis1: number, axis2: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
            }): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            zero(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            negate(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
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
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
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
                } & any, t: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                perpSwap(axis1?: number, axis2?: number, sign?: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any)): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                loadXY(x: number, y: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                copy(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                add(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                sub(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mul(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                div(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                subScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mulScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                divScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                minScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                maxScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                min(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                max(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                floor(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                fract(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                ceil(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                abs(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                dot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalizedDot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalize(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                vectorLength(): number;
                vectorLengthSqr(): number;
                vectorDistance(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                vectorDistanceSqr(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                multVecMatrix(mat: vectormath.Matrix4): void;
                interp(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addFac(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                rot2d(th: number, axis?: number | undefined): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                zero(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                negate(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                swapAxes(axis1: number, axis2: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
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
            multVecMatrix(mat: vectormath.Matrix4): void;
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
            } & any, t: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any)): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            copy(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            add(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            sub(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            mul(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            div(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            min(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            max(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            floor(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            fract(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            ceil(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            abs(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            dot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): number;
            normalizedDot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            zero(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            negate(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
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
            } & {} & any, t: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any)): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            copy(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            add(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            sub(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mul(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            div(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            min(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            max(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            floor(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            fract(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            ceil(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            abs(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            dot(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
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
                } & any, t: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                perpSwap(axis1?: number, axis2?: number, sign?: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any)): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                loadXY(x: number, y: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                copy(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                add(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                sub(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mul(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                div(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                subScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mulScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                divScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                minScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                maxScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                min(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                max(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                floor(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                fract(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                ceil(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                abs(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                dot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalizedDot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalize(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                vectorLength(): number;
                vectorLengthSqr(): number;
                vectorDistance(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                vectorDistanceSqr(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                multVecMatrix(mat: vectormath.Matrix4): void;
                interp(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addFac(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                rot2d(th: number, axis?: number | undefined): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                zero(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                negate(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                swapAxes(axis1: number, axis2: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
            }): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            zero(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            negate(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
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
            } & {} & any, t: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any)): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            copy(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            add(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            sub(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mul(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            div(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            min(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            max(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            floor(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            fract(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            ceil(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            abs(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            dot(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
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
                } & any, t: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                perpSwap(axis1?: number, axis2?: number, sign?: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any)): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                loadXY(x: number, y: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                copy(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                add(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                sub(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mul(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                div(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                subScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mulScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                divScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                minScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                maxScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                min(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                max(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                floor(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                fract(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                ceil(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                abs(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                dot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalizedDot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalize(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                vectorLength(): number;
                vectorLengthSqr(): number;
                vectorDistance(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                vectorDistanceSqr(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                multVecMatrix(mat: vectormath.Matrix4): void;
                interp(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addFac(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                rot2d(th: number, axis?: number | undefined): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                zero(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                negate(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                swapAxes(axis1: number, axis2: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
            }): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            zero(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            negate(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
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
            } & {} & any, t: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any)): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            copy(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            add(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            sub(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mul(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            div(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            min(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            max(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            floor(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            fract(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            ceil(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            abs(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            dot(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
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
                } & any, t: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                perpSwap(axis1?: number, axis2?: number, sign?: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any)): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                loadXY(x: number, y: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                copy(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                add(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                sub(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mul(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                div(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                subScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mulScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                divScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                minScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                maxScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                min(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                max(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                floor(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                fract(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                ceil(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                abs(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                dot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalizedDot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalize(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                vectorLength(): number;
                vectorLengthSqr(): number;
                vectorDistance(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                vectorDistanceSqr(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                multVecMatrix(mat: vectormath.Matrix4): void;
                interp(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addFac(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                rot2d(th: number, axis?: number | undefined): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                zero(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                negate(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                swapAxes(axis1: number, axis2: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
            }): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            zero(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            negate(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
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
            } & {} & any, t: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any)): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            copy(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            add(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            sub(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mul(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            div(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            min(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            max(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            floor(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            fract(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            ceil(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            abs(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            dot(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
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
                } & any, t: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                perpSwap(axis1?: number, axis2?: number, sign?: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any)): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                loadXY(x: number, y: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                copy(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                add(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                sub(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mul(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                div(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                subScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mulScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                divScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                minScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                maxScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                min(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                max(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                floor(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                fract(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                ceil(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                abs(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                dot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalizedDot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalize(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                vectorLength(): number;
                vectorLengthSqr(): number;
                vectorDistance(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                vectorDistanceSqr(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                multVecMatrix(mat: vectormath.Matrix4): void;
                interp(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addFac(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                rot2d(th: number, axis?: number | undefined): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                zero(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                negate(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                swapAxes(axis1: number, axis2: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
            }): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            zero(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            negate(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
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
            } & {} & any, t: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any)): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            copy(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            add(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            sub(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mul(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            div(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            min(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            max(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            floor(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            fract(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            ceil(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            abs(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            dot(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
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
                } & any, t: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                perpSwap(axis1?: number, axis2?: number, sign?: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any)): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                loadXY(x: number, y: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                copy(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                add(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                sub(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mul(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                div(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                subScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mulScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                divScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                minScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                maxScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                min(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                max(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                floor(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                fract(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                ceil(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                abs(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                dot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalizedDot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalize(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                vectorLength(): number;
                vectorLengthSqr(): number;
                vectorDistance(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                vectorDistanceSqr(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                multVecMatrix(mat: vectormath.Matrix4): void;
                interp(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addFac(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                rot2d(th: number, axis?: number | undefined): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                zero(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                negate(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                swapAxes(axis1: number, axis2: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
            }): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            zero(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            negate(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
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
            } & {} & any, t: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any)): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            copy(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            add(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            sub(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mul(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            div(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            min(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            max(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            floor(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            fract(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            ceil(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            abs(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            dot(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
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
                } & any, t: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                perpSwap(axis1?: number, axis2?: number, sign?: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any)): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                loadXY(x: number, y: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                copy(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                add(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                sub(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mul(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                div(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                subScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mulScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                divScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                minScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                maxScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                min(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                max(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                floor(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                fract(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                ceil(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                abs(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                dot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalizedDot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalize(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                vectorLength(): number;
                vectorLengthSqr(): number;
                vectorDistance(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                vectorDistanceSqr(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                multVecMatrix(mat: vectormath.Matrix4): void;
                interp(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addFac(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                rot2d(th: number, axis?: number | undefined): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                zero(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                negate(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                swapAxes(axis1: number, axis2: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
            }): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            zero(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            negate(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
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
            } & {} & any, t: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any)): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            copy(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            add(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            sub(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mul(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            div(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            min(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            max(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            floor(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            fract(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            ceil(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            abs(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            dot(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
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
                } & any, t: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                perpSwap(axis1?: number, axis2?: number, sign?: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any)): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                loadXY(x: number, y: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                copy(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                add(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                sub(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mul(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                div(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                subScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mulScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                divScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                minScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                maxScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                min(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                max(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                floor(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                fract(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                ceil(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                abs(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                dot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalizedDot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalize(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                vectorLength(): number;
                vectorLengthSqr(): number;
                vectorDistance(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                vectorDistanceSqr(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                multVecMatrix(mat: vectormath.Matrix4): void;
                interp(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addFac(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                rot2d(th: number, axis?: number | undefined): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                zero(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                negate(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                swapAxes(axis1: number, axis2: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
            }): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            zero(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            negate(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
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
            } & {} & any, t: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any)): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            copy(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            add(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            sub(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mul(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            div(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            min(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            max(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            floor(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            fract(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            ceil(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            abs(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            dot(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
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
                } & any, t: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                perpSwap(axis1?: number, axis2?: number, sign?: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any)): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                loadXY(x: number, y: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                copy(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                add(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                sub(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mul(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                div(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                subScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mulScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                divScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                minScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                maxScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                min(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                max(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                floor(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                fract(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                ceil(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                abs(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                dot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalizedDot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalize(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                vectorLength(): number;
                vectorLengthSqr(): number;
                vectorDistance(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                vectorDistanceSqr(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                multVecMatrix(mat: vectormath.Matrix4): void;
                interp(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addFac(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                rot2d(th: number, axis?: number | undefined): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                zero(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                negate(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                swapAxes(axis1: number, axis2: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
            }): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            zero(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            negate(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
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
            } & {} & any, t: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any)): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            copy(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            add(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            sub(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mul(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            div(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            min(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            max(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            floor(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            fract(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            ceil(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            abs(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            dot(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
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
                } & any, t: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                perpSwap(axis1?: number, axis2?: number, sign?: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any)): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                loadXY(x: number, y: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                copy(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                add(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                sub(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mul(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                div(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                subScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mulScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                divScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                minScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                maxScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                min(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                max(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                floor(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                fract(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                ceil(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                abs(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                dot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalizedDot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalize(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                vectorLength(): number;
                vectorLengthSqr(): number;
                vectorDistance(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                vectorDistanceSqr(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                multVecMatrix(mat: vectormath.Matrix4): void;
                interp(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addFac(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                rot2d(th: number, axis?: number | undefined): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                zero(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                negate(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                swapAxes(axis1: number, axis2: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
            }): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            zero(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            negate(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
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
            } & {} & any, t: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any)): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            copy(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            add(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            sub(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mul(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            div(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            min(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            max(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            floor(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            fract(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            ceil(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            abs(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            dot(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
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
                } & any, t: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                perpSwap(axis1?: number, axis2?: number, sign?: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any)): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                loadXY(x: number, y: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                copy(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                add(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                sub(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mul(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                div(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                subScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mulScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                divScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                minScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                maxScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                min(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                max(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                floor(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                fract(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                ceil(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                abs(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                dot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalizedDot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalize(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                vectorLength(): number;
                vectorLengthSqr(): number;
                vectorDistance(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                vectorDistanceSqr(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                multVecMatrix(mat: vectormath.Matrix4): void;
                interp(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addFac(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                rot2d(th: number, axis?: number | undefined): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                zero(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                negate(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                swapAxes(axis1: number, axis2: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
            }): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            zero(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            negate(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
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
            } & {} & any, t: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any)): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            copy(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            add(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            sub(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mul(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            div(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            min(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            max(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            floor(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            fract(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            ceil(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            abs(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            dot(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
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
                } & any, t: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                perpSwap(axis1?: number, axis2?: number, sign?: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any)): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                loadXY(x: number, y: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                copy(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                add(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                sub(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mul(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                div(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                subScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mulScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                divScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                minScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                maxScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                min(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                max(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                floor(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                fract(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                ceil(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                abs(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                dot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalizedDot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalize(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                vectorLength(): number;
                vectorLengthSqr(): number;
                vectorDistance(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                vectorDistanceSqr(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                multVecMatrix(mat: vectormath.Matrix4): void;
                interp(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addFac(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                rot2d(th: number, axis?: number | undefined): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                zero(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                negate(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                swapAxes(axis1: number, axis2: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
            }): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            zero(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            negate(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
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
            } & {} & any, t: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any)): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            copy(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            add(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            sub(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mul(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            div(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            min(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            max(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            floor(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            fract(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            ceil(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            abs(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            dot(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
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
                } & any, t: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                perpSwap(axis1?: number, axis2?: number, sign?: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any)): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                loadXY(x: number, y: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                copy(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                add(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                sub(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mul(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                div(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                subScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mulScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                divScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                minScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                maxScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                min(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                max(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                floor(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                fract(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                ceil(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                abs(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                dot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalizedDot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalize(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                vectorLength(): number;
                vectorLengthSqr(): number;
                vectorDistance(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                vectorDistanceSqr(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                multVecMatrix(mat: vectormath.Matrix4): void;
                interp(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addFac(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                rot2d(th: number, axis?: number | undefined): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                zero(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                negate(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                swapAxes(axis1: number, axis2: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
            }): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            zero(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            negate(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
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
            } & {} & any, t: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any)): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            copy(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            add(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            sub(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mul(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            div(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            min(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            max(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            floor(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            fract(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            ceil(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            abs(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            dot(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
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
                } & any, t: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                perpSwap(axis1?: number, axis2?: number, sign?: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any)): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                loadXY(x: number, y: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                copy(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                add(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                sub(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mul(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                div(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                subScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mulScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                divScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                minScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                maxScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                min(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                max(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                floor(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                fract(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                ceil(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                abs(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                dot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalizedDot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalize(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                vectorLength(): number;
                vectorLengthSqr(): number;
                vectorDistance(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                vectorDistanceSqr(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                multVecMatrix(mat: vectormath.Matrix4): void;
                interp(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addFac(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                rot2d(th: number, axis?: number | undefined): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                zero(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                negate(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                swapAxes(axis1: number, axis2: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
            }): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            zero(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            negate(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
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
            } & {} & any, t: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any)): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            copy(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            add(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            sub(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mul(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            div(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            min(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            max(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            floor(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            fract(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            ceil(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            abs(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            dot(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
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
                } & any, t: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                perpSwap(axis1?: number, axis2?: number, sign?: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any)): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                loadXY(x: number, y: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                copy(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                add(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                sub(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mul(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                div(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                subScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mulScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                divScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                minScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                maxScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                min(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                max(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                floor(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                fract(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                ceil(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                abs(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                dot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalizedDot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalize(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                vectorLength(): number;
                vectorLengthSqr(): number;
                vectorDistance(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                vectorDistanceSqr(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                multVecMatrix(mat: vectormath.Matrix4): void;
                interp(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addFac(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                rot2d(th: number, axis?: number | undefined): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                zero(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                negate(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                swapAxes(axis1: number, axis2: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
            }): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            zero(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            negate(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
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
            } & {} & any, t: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any)): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            copy(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            add(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            sub(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mul(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            div(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            min(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            max(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            floor(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            fract(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            ceil(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            abs(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            dot(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
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
                } & any, t: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                perpSwap(axis1?: number, axis2?: number, sign?: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any)): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                loadXY(x: number, y: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                copy(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                add(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                sub(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mul(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                div(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                subScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mulScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                divScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                minScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                maxScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                min(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                max(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                floor(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                fract(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                ceil(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                abs(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                dot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalizedDot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalize(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                vectorLength(): number;
                vectorLengthSqr(): number;
                vectorDistance(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                vectorDistanceSqr(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                multVecMatrix(mat: vectormath.Matrix4): void;
                interp(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addFac(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                rot2d(th: number, axis?: number | undefined): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                zero(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                negate(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                swapAxes(axis1: number, axis2: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
            }): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            zero(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            negate(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
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
            } & {} & any, t: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any)): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            copy(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            add(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            sub(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mul(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            div(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            min(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            max(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            floor(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            fract(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            ceil(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            abs(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            dot(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
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
                } & any, t: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                perpSwap(axis1?: number, axis2?: number, sign?: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any)): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                loadXY(x: number, y: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                copy(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                add(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                sub(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mul(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                div(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                subScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mulScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                divScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                minScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                maxScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                min(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                max(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                floor(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                fract(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                ceil(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                abs(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                dot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalizedDot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalize(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                vectorLength(): number;
                vectorLengthSqr(): number;
                vectorDistance(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                vectorDistanceSqr(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                multVecMatrix(mat: vectormath.Matrix4): void;
                interp(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addFac(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                rot2d(th: number, axis?: number | undefined): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                zero(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                negate(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                swapAxes(axis1: number, axis2: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
            }): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            zero(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            negate(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
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
            } & {} & any, t: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any)): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            copy(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            add(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            sub(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mul(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            div(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            min(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            max(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            floor(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            fract(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            ceil(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            abs(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            dot(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
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
                } & any, t: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                perpSwap(axis1?: number, axis2?: number, sign?: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any)): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                loadXY(x: number, y: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                copy(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                add(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                sub(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mul(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                div(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                subScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mulScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                divScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                minScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                maxScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                min(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                max(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                floor(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                fract(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                ceil(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                abs(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                dot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalizedDot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalize(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                vectorLength(): number;
                vectorLengthSqr(): number;
                vectorDistance(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                vectorDistanceSqr(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                multVecMatrix(mat: vectormath.Matrix4): void;
                interp(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addFac(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                rot2d(th: number, axis?: number | undefined): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                zero(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                negate(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                swapAxes(axis1: number, axis2: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
            }): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            zero(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            negate(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
        }, t: number): /*elided*/ any;
        perpSwap(axis1?: 0 | 1 | 2 | 3, axis2?: 0 | 1 | 2 | 3, sign?: number): /*elided*/ any;
        normalize(): /*elided*/ any;
        multVecMatrix(matrix: vectormath.Matrix4): number;
        mulVecQuat(q: vectormath.IQuat): /*elided*/ any;
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
            } & {} & any, t: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any)): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            copy(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            add(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            sub(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mul(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            div(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            min(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            max(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            floor(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            fract(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            ceil(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            abs(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            dot(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
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
                } & any, t: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                perpSwap(axis1?: number, axis2?: number, sign?: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any)): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                loadXY(x: number, y: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                copy(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                add(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                sub(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mul(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                div(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                subScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mulScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                divScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                minScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                maxScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                min(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                max(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                floor(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                fract(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                ceil(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                abs(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                dot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalizedDot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalize(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                vectorLength(): number;
                vectorLengthSqr(): number;
                vectorDistance(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                vectorDistanceSqr(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                multVecMatrix(mat: vectormath.Matrix4): void;
                interp(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addFac(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                rot2d(th: number, axis?: number | undefined): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                zero(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                negate(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                swapAxes(axis1: number, axis2: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
            }): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            zero(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            negate(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
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
            } & {} & any, t: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any)): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            copy(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            add(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            sub(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mul(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            div(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            min(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            max(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            floor(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            fract(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            ceil(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            abs(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            dot(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
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
                } & any, t: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                perpSwap(axis1?: number, axis2?: number, sign?: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any)): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                loadXY(x: number, y: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                copy(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                add(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                sub(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mul(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                div(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                subScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                mulScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                divScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                minScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                maxScalar(b: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                min(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                max(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                floor(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                fract(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                ceil(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                abs(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                dot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalizedDot(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                normalize(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                vectorLength(): number;
                vectorLengthSqr(): number;
                vectorDistance(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                vectorDistanceSqr(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any): number;
                multVecMatrix(mat: vectormath.Matrix4): void;
                interp(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                addFac(b: {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any, fac: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                rot2d(th: number, axis?: number | undefined): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                zero(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                negate(): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
                swapAxes(axis1: number, axis2: number): {
                    0: number;
                    1: number;
                    2: number;
                } & {
                    3?: number | undefined;
                } & any;
            }): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any, fac: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            zero(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            negate(): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
                3: number;
            } & {} & any;
        }): number;
        toCSS(): string;
        loadSTRUCT(reader: import("../util/nstructjs.js").StructReader</*elided*/ any>): void;
    };
    structName: string | undefined;
    STRUCT: string | undefined;
    normalizedDot4(v1: {
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
        load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
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
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
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
            multVecMatrix(mat: vectormath.Matrix4): void;
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
        multVecMatrix(mat: vectormath.Matrix4): void;
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
    }, v2: {
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
        } & {} & any, t: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any)): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        copy(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        add(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        sub(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        mul(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        div(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        min(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        max(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        floor(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        fract(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        ceil(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        abs(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        dot(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): number;
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
            } & any, t: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any)): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            copy(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            add(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            sub(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            mul(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            div(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            min(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            max(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            floor(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            fract(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            ceil(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            abs(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            dot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): number;
            normalizedDot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            zero(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            negate(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
        }): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): number;
        multVecMatrix(mat: vectormath.Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        zero(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        negate(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
    }, v3: {
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
        } & {} & any, t: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any)): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        copy(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        add(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        sub(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        mul(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        div(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        min(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        max(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        floor(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        fract(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        ceil(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        abs(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        dot(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): number;
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
            } & any, t: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any)): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            copy(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            add(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            sub(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            mul(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            div(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            min(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            max(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            floor(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            fract(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            ceil(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            abs(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            dot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): number;
            normalizedDot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            zero(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            negate(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
        }): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): number;
        multVecMatrix(mat: vectormath.Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        zero(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        negate(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
    }, v4: {
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
        } & {} & any, t: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any)): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        copy(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        add(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        sub(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        mul(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        div(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        min(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        max(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        floor(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        fract(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        ceil(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        abs(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        dot(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): number;
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
            } & any, t: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any)): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            copy(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            add(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            sub(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            mul(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            div(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            min(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            max(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            floor(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            fract(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            ceil(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            abs(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            dot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): number;
            normalizedDot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            zero(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            negate(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
        }): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): number;
        multVecMatrix(mat: vectormath.Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        zero(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        negate(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
    }): number;
    normalizedDot3(v1: {
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
        load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
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
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
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
            multVecMatrix(mat: vectormath.Matrix4): void;
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
        multVecMatrix(mat: vectormath.Matrix4): void;
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
    }, center: {
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
        } & {} & any, t: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any)): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        copy(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        add(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        sub(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        mul(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        div(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        min(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        max(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        floor(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        fract(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        ceil(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        abs(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        dot(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): number;
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
            } & any, t: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any)): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            copy(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            add(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            sub(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            mul(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            div(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            min(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            max(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            floor(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            fract(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            ceil(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            abs(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            dot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): number;
            normalizedDot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            zero(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            negate(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
        }): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): number;
        multVecMatrix(mat: vectormath.Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        zero(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        negate(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
    }, v2: {
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
        } & {} & any, t: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any)): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        copy(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        add(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        sub(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        mul(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        div(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        addScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        subScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        mulScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        divScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        minScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        maxScalar(b: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        min(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        max(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        floor(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        fract(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        ceil(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        abs(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        dot(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): number;
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
            } & any, t: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any)): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            copy(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            add(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            sub(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            mul(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            div(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            addScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            subScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            mulScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            divScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            minScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            maxScalar(b: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            min(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            max(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            floor(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            fract(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            ceil(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            abs(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            dot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): number;
            normalizedDot(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): number;
            normalize(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            addFac(b: {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            zero(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            negate(): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
                2: number;
            } & {
                3?: number | undefined;
            } & any;
        }): number;
        normalize(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any): number;
        multVecMatrix(mat: vectormath.Matrix4): void;
        interp(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        addFac(b: {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any, fac: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        zero(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        negate(): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
            2: number;
            3: number;
        } & {} & any;
    }): number;
};
export { rgb_to_hsv, hsv_to_rgb } from "../path-controller/util/colorutils.js";
declare const UIBase: typeof ui_base.UIBase;
type Vector4 = vectormath.Vector4;
type UIBaseType = InstanceType<typeof UIBase>;
export declare function inv_sample(u: number, v: number): number[];
export declare function sample(u: number, v: number): number[];
export declare function getHueField(width: number, height: number, dpi: number): HTMLCanvasElement;
interface FieldImage {
    width: number;
    height: number;
    image: ImageData;
    canvas: HTMLCanvasElement;
    scale: number;
    params: {
        box: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    };
    x2sat(x: number): number;
    y2val(y: number): number;
    sat2x(s: number): number;
    val2y(v: number): number;
}
export declare function getFieldImage(fieldsize: number, width: number, height: number, hsva: ArrayLike<number>): FieldImage;
export declare class SimpleBox {
    pos: vectormath.Vector2;
    size: vectormath.Vector2;
    r: number;
    constructor(pos?: number[], size?: number[]);
}
export declare class HueField<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
    canvas: HTMLCanvasElement;
    g: CanvasRenderingContext2D;
    hsva: Vector4;
    _onchange: ((hsva?: Vector4) => void) | undefined;
    constructor();
    static define(): {
        tagname: string;
        style: string;
        havePickClipboard: boolean;
    };
    getRGBA(): Vector4;
    setRGBA(rgba: Vector4 | number[]): void;
    clipboardCopy(): void;
    clipboardPaste(): void;
    _getPad(): number;
    _redraw(): void;
    on_disabled(): void;
    on_enabled(): void;
}
export declare class SatValField<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
    canvas: HTMLCanvasElement;
    g: CanvasRenderingContext2D;
    hsva: Vector4;
    _onchange: ((hsva?: Vector4) => void) | undefined;
    constructor();
    static define(): {
        tagname: string;
        style: string;
        havePickClipboard: boolean;
    };
    getRGBA(): Vector4;
    setRGBA(rgba: Vector4 | number[]): void;
    clipboardCopy(): void;
    clipboardPaste(): void;
    _getField(): FieldImage;
    update(force_update?: boolean): void;
    _redraw(): void;
    on_disabled(): void;
    on_enabled(): void;
}
export declare class ColorField<CTX extends IContextBase = IContextBase> extends ui.ColumnFrame<CTX> {
    hsva: Vector4;
    rgba: Vector4;
    satvalfield: SatValField<CTX>;
    huefield: HueField<CTX>;
    _onchange: ((hsvaOrRgba: Vector4, rgba?: Vector4) => void) | undefined;
    _lastThemeStyle: string;
    _last_dpi: number | undefined;
    constructor();
    static define(): {
        tagname: string;
        style: string;
    };
    setCMYK(c: number, m: number, y: number, k: number): void;
    getCMYK(): number[];
    setHSVA(h: number, s: number, v: number, a?: number, fire_onchange?: boolean): void;
    _recalcRGBA(): this;
    updateDPI(force_update?: boolean, _in_update?: boolean): boolean | undefined;
    getRGBA(): Vector4;
    setRGBA(r: number | Vector4 | number[], g?: number, b?: number, a?: number, fire_onchange?: boolean): void;
    updateThemeOverride(): boolean;
    update(force_update?: boolean): void;
    setCSS(): void;
    _redraw(): void;
}
interface SliderWidget extends UIBaseType {
    setValue(val: number, fire_onchange?: boolean): void;
    baseUnit: string | undefined;
    displayUnit: string | undefined;
    text?: string;
}
export declare class ColorPicker<CTX extends IContextBase = IContextBase> extends ui.ColumnFrame<CTX> {
    _lastThemeStyle: string;
    field: ColorField<CTX>;
    colorbox: HTMLDivElement;
    _style: HTMLStyleElement;
    cssText: SliderWidget;
    h: SliderWidget | undefined;
    s: SliderWidget | undefined;
    v: SliderWidget | undefined;
    a: SliderWidget | undefined;
    r: SliderWidget | undefined;
    g: SliderWidget | undefined;
    b: SliderWidget | undefined;
    a2: SliderWidget | undefined;
    cmyk: SliderWidget[] | undefined;
    _no_update_textbox: boolean;
    _onchange: ((rgba: Vector4) => void) | undefined;
    constructor();
    get hsva(): Vector4;
    get rgba(): Vector4;
    set description(_val: string);
    static setDefault(node: ColorPicker): void;
    static define(): {
        tagname: string;
        style: string;
        havePickClipboard: boolean;
        copyForAllChildren: boolean;
        pasteForAllChildren: boolean;
    };
    clipboardCopy(): void;
    clipboardPaste(): void;
    init(): void;
    updateColorBox(): void;
    _setSliders(): void;
    updateDataPath(): void;
    updateThemeOverride(): boolean;
    update(): void;
    _setDataPath(): void;
    getCMYK(): number[];
    setCMYK(c: number, m: number, y: number, k: number): void;
    setHSVA(h: number, s: number, v: number, a: number): void;
    getRGBA(): Vector4;
    setRGBA(r: number | number[], g?: number, b?: number, a?: number): void;
}
export declare class ColorPickerButton<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
    _highlight: boolean;
    _depress: boolean;
    _label: string;
    customLabel: string | undefined;
    rgba: Vector4;
    labelDom: HTMLSpanElement;
    dom: HTMLCanvasElement;
    g: CanvasRenderingContext2D | null;
    _font: string;
    _last_key: string;
    constructor();
    get label(): string;
    set label(val: string);
    get font(): string;
    set font(val: string);
    get noLabel(): boolean;
    set noLabel(v: boolean);
    static define(): {
        tagname: string;
        style: string;
        havePickClipboard: boolean;
    };
    init(): void;
    clipboardCopy(): void;
    clipboardPaste(): void;
    getRGBA(): Vector4;
    _onClickButton(e: MouseEvent): void;
    setRGBA(val: Vector4 | number[]): this;
    on_disabled(): void;
    _redraw(): void;
    setCSS(): void;
    updateDataPath(): void;
    update(): void;
    redraw(): void;
}
//# sourceMappingURL=ui_colorpicker2.d.ts.map