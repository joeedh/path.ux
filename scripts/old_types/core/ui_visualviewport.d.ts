import { Vector2 } from "../../path-controller/controller";

/** note: uses a cachering for the return value */
export declare function toVisualViewport(x: number, y: number, includeScale?: boolean): Vector2;

/** note: uses a cachering for the return value */
export declare function fromVisualViewport(x: number, y: number, includeScale?: boolean): Vector2;
