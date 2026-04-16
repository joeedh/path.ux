import { Vector2, Vector3, Vector4, Quat } from "./vectormath";
type ConstraintFunc<PARAMS> = (params: PARAMS) => number;
export type KVector = (Float64Array | number[] | Vector2 | Vector3 | Vector4 | Quat) | Float32Array;
export declare class Constraint<PARAMS = unknown[]> {
    glst: Float64Array[];
    klst: number[][];
    wlst: Float64Array[];
    k: number;
    private params;
    name: string;
    df: number;
    threshold: number;
    private func;
    private funcDv;
    constructor(name: string, func: ConstraintFunc<PARAMS> | undefined, klst: KVector[], params: Readonly<PARAMS>, k?: number);
    postSolve(): void;
    evaluate(no_dvs?: boolean): number;
}
export declare class Solver {
    constraints: Constraint[];
    gk: number;
    simple: boolean;
    randCons: boolean;
    threshold: number;
    constructor();
    remove(con: Constraint): void;
    add<PARAMS>(con: Constraint<PARAMS>): void;
    solveStep(gk?: number): number;
    solveStepSimple(gk?: number): number;
    solve(steps: number, gk?: number, printError?: boolean): number;
}
export {};
//# sourceMappingURL=solver.d.ts.map