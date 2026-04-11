export declare const SVG_URL = "http://www.w3.org/2000/svg";
import * as vectormath from "./vectormath.js";
import * as ui_base from "../core/ui_base.js";
import { IContextBase } from "../core/context_base.js";
import type { Screen } from "../screen/FrameManager";
declare const Vector2: {
    new (existing?: number[] | ({
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
    })): {
        [k: number]: number | undefined;
        0: number;
        1: number;
        length: number;
        LEN: 2;
        [Symbol.iterator]: (() => ArrayIterator<any>) | (() => ArrayIterator<number>);
        slice: (start?: number, end?: number) => number[];
        load(existing: number[] | ({
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
            } & any, t: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any)): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            copy(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            add(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            sub(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mul(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            div(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            subScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mulScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            divScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            minScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            maxScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            min(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            max(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            floor(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            fract(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            ceil(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            abs(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            dot(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
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
            } & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addFac(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            zero(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            negate(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
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
            } & any, t: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any)): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            copy(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            add(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            sub(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mul(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            div(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            subScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mulScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            divScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            minScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            maxScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            min(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            max(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            floor(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            fract(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            ceil(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            abs(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            dot(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
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
            } & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addFac(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            zero(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            negate(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
        })): /*elided*/ any;
        normalizedDot(b: {
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
            } & any, t: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any)): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            copy(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            add(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            sub(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mul(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            div(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            subScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mulScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            divScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            minScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            maxScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            min(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            max(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            floor(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            fract(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            ceil(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            abs(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            dot(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
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
            } & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addFac(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            zero(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            negate(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
        }): number;
        equals(b: {
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
            } & any, t: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any)): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            copy(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            add(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            sub(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mul(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            div(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            subScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mulScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            divScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            minScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            maxScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            min(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            max(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            floor(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            fract(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            ceil(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            abs(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            dot(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
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
            } & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addFac(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            zero(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            negate(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
        }): boolean;
        zero(): /*elided*/ any;
        negate(): /*elided*/ any;
        combine(b: {
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
            } & any, t: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any)): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            copy(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            add(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            sub(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mul(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            div(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            subScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mulScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            divScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            minScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            maxScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            min(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            max(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            floor(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            fract(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            ceil(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            abs(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            dot(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
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
            } & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addFac(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            zero(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            negate(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
        }, u: number, v: number): /*elided*/ any;
        interp(b: {
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
            } & any, t: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any)): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            copy(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            add(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            sub(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mul(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            div(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            subScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mulScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            divScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            minScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            maxScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            min(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            max(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            floor(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            fract(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            ceil(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            abs(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            dot(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
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
            } & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addFac(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            zero(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            negate(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
        }, t: number): /*elided*/ any;
        add(b: {
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
            } & any, t: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any)): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            copy(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            add(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            sub(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mul(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            div(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            subScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mulScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            divScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            minScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            maxScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            min(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            max(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            floor(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            fract(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            ceil(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            abs(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            dot(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
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
            } & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addFac(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            zero(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            negate(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
        }): /*elided*/ any;
        addFac(b: {
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
            } & any, t: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any)): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            copy(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            add(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            sub(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mul(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            div(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            subScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mulScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            divScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            minScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            maxScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            min(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            max(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            floor(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            fract(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            ceil(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            abs(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            dot(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
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
            } & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addFac(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            zero(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            negate(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
        }, f: number): /*elided*/ any;
        fract(): /*elided*/ any;
        sub(b: {
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
            } & any, t: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any)): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            copy(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            add(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            sub(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mul(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            div(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            subScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mulScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            divScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            minScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            maxScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            min(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            max(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            floor(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            fract(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            ceil(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            abs(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            dot(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
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
            } & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addFac(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            zero(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            negate(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
        }): /*elided*/ any;
        mul(b: {
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
            } & any, t: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any)): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            copy(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            add(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            sub(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mul(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            div(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            subScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mulScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            divScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            minScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            maxScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            min(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            max(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            floor(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            fract(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            ceil(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            abs(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            dot(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
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
            } & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addFac(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            zero(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            negate(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
        }): /*elided*/ any;
        div(b: {
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
            } & any, t: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any)): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            copy(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            add(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            sub(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mul(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            div(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            subScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mulScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            divScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            minScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            maxScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            min(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            max(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            floor(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            fract(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            ceil(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            abs(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            dot(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
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
            } & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addFac(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            zero(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            negate(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
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
            } & any, t: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any)): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            copy(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            add(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            sub(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mul(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            div(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            subScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mulScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            divScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            minScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            maxScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            min(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            max(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            floor(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            fract(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            ceil(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            abs(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            dot(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
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
            } & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addFac(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            zero(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            negate(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
        }): /*elided*/ any;
        max(b: {
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
            } & any, t: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any)): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            copy(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            add(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            sub(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mul(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            div(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            subScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mulScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            divScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            minScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            maxScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            min(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            max(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            floor(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            fract(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            ceil(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            abs(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            dot(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
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
            } & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addFac(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            zero(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            negate(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
        }): /*elided*/ any;
        clamp(min: number, max: number): /*elided*/ any;
        vectorDotDistance(b: {
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
            } & any, t: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any)): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            copy(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            add(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            sub(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mul(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            div(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            subScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mulScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            divScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            minScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            maxScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            min(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            max(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            floor(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            fract(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            ceil(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            abs(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            dot(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
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
            } & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addFac(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            zero(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            negate(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
        }): number;
        vectorDistance(b: {
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
            } & any, t: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any)): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            copy(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            add(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            sub(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mul(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            div(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            subScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mulScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            divScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            minScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            maxScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            min(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            max(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            floor(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            fract(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            ceil(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            abs(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            dot(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
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
            } & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addFac(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            zero(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            negate(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
        }): number;
        vectorDistanceSqr(b: {
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
            } & any, t: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any)): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            copy(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            add(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            sub(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mul(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            div(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            subScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mulScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            divScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            minScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            maxScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            min(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            max(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            floor(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            fract(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            ceil(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            abs(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            dot(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
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
            } & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addFac(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            zero(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            negate(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
        }): number;
        copy(): /*elided*/ any;
        vectorLengthSqr(): number;
        vectorLength(): number;
        rot2d(A: number, axis?: number): /*elided*/ any;
        dot(b: {
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
            } & any, t: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any)): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            copy(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            add(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            sub(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mul(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            div(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            subScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mulScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            divScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            minScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            maxScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            min(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            max(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            floor(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            fract(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            ceil(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            abs(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            dot(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
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
            } & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addFac(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            zero(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            negate(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
        }): number;
        loadX(x: number): /*elided*/ any;
        loadXY(x: number, y: number): /*elided*/ any;
        swapAxes(axis1: 0 | 1, axis2: 0 | 1): /*elided*/ any;
        sinterp(v2: {
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
            } & any, t: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any)): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            copy(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            add(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            sub(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mul(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            div(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            subScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mulScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            divScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            minScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            maxScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            min(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            max(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            floor(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            fract(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            ceil(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            abs(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            dot(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
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
            } & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addFac(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            zero(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            negate(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
        }, t: number): /*elided*/ any;
        perpSwap(axis1?: 0 | 1, axis2?: 0 | 1, sign?: number): /*elided*/ any;
        normalize(): /*elided*/ any;
        multVecMatrix(matrix: vectormath.Matrix4, ignore_w?: boolean): /*elided*/ any;
        mulVecQuat(q: vectormath.IQuat): /*elided*/ any;
        preNormalizedAngle(v2: {
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
            } & any, t: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            perpSwap(axis1?: number, axis2?: number, sign?: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any)): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            loadXY(x: number, y: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            copy(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            add(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            sub(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mul(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            div(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            subScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            mulScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            divScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            minScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            maxScalar(b: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            min(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            max(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            floor(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            fract(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            ceil(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            abs(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            dot(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
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
            } & any;
            vectorLength(): number;
            vectorLengthSqr(): number;
            vectorDistance(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            vectorDistanceSqr(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any): number;
            multVecMatrix(mat: vectormath.Matrix4): void;
            interp(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            addFac(b: {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any, fac: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            rot2d(th: number, axis?: number | undefined): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            zero(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            negate(): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
            swapAxes(axis1: number, axis2: number): {
                0: number;
                1: number;
            } & {
                2?: number | undefined;
                3?: number | undefined;
            } & any;
        }): number;
        loadSTRUCT(reader: import("./nstructjs.js").StructReader</*elided*/ any>): void;
    };
    structName: string | undefined;
    STRUCT: string | undefined;
    normalizedDot4(v1: {
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
    }, v2: {
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
        } & any, t: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any)): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        copy(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        add(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        sub(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        mul(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        div(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        addScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        subScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        mulScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        divScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        minScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        maxScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        min(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        max(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        floor(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        fract(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        ceil(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        abs(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        dot(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): number;
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
        } & any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): number;
        multVecMatrix(mat: vectormath.Matrix4): void;
        interp(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any, fac: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        addFac(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any, fac: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        zero(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        negate(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
    }, v3: {
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
        } & any, t: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any)): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        copy(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        add(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        sub(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        mul(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        div(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        addScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        subScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        mulScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        divScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        minScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        maxScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        min(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        max(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        floor(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        fract(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        ceil(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        abs(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        dot(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): number;
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
        } & any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): number;
        multVecMatrix(mat: vectormath.Matrix4): void;
        interp(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any, fac: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        addFac(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any, fac: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        zero(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        negate(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
    }, v4: {
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
        } & any, t: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any)): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        copy(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        add(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        sub(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        mul(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        div(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        addScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        subScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        mulScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        divScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        minScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        maxScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        min(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        max(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        floor(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        fract(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        ceil(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        abs(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        dot(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): number;
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
        } & any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): number;
        multVecMatrix(mat: vectormath.Matrix4): void;
        interp(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any, fac: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        addFac(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any, fac: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        zero(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        negate(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
    }): number;
    normalizedDot3(v1: {
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
    }, center: {
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
        } & any, t: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any)): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        copy(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        add(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        sub(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        mul(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        div(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        addScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        subScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        mulScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        divScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        minScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        maxScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        min(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        max(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        floor(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        fract(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        ceil(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        abs(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        dot(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): number;
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
        } & any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): number;
        multVecMatrix(mat: vectormath.Matrix4): void;
        interp(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any, fac: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        addFac(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any, fac: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        zero(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        negate(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
    }, v2: {
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
        } & any, t: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        perpSwap(axis1?: number, axis2?: number, sign?: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        load(b: (vectormath.INumVectorLimited<2> | vectormath.INumVectorLimited<3> | vectormath.INumVectorLimited<4> | vectormath.IOpenNumVector) | ({
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any)): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        loadXY(x: number, y: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        copy(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        add(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        sub(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        mul(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        div(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        addScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        subScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        mulScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        divScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        minScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        maxScalar(b: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        min(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        max(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        floor(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        fract(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        ceil(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        abs(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        dot(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): number;
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
        } & any;
        vectorLength(): number;
        vectorLengthSqr(): number;
        vectorDistance(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): number;
        vectorDistanceSqr(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any): number;
        multVecMatrix(mat: vectormath.Matrix4): void;
        interp(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any, fac: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        addFac(b: {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any, fac: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        rot2d(th: number, axis?: number | undefined): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        zero(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        negate(): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
        swapAxes(axis1: number, axis2: number): {
            0: number;
            1: number;
        } & {
            2?: number | undefined;
            3?: number | undefined;
        } & any;
    }): number;
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