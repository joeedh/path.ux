import { Vector2 } from "./vectormath.js";
export declare class PackNodeVertex extends Vector2 {
    [Symbol.keystr]: () => string;
    node: PackNode;
    _id: number;
    edges: PackNodeVertex[];
    _absPos: InstanceType<typeof Vector2>;
    constructor(node: PackNode, co?: number[] | InstanceType<typeof Vector2>);
    get absPos(): InstanceType<typeof Vector2>;
}
export declare class PackNode {
    [Symbol.keystr]: () => string;
    pos: Vector2;
    vel: Vector2;
    oldpos: Vector2;
    _id: number;
    size: Vector2;
    startpos?: Vector2;
    verts: PackNodeVertex[];
    constructor();
}
export declare function graphGetIslands(nodes: PackNode[]): PackNode[][];
interface GraphPackArgs {
    margin?: number;
    steps?: number;
    updateCb?: () => boolean | void;
    speed?: number;
}
export declare function graphPack(nodes: PackNode[], margin_or_args?: number | GraphPackArgs, steps?: number, updateCb?: () => boolean | void): {
    stop: () => void;
} | void;
export {};
//# sourceMappingURL=graphpack.d.ts.map