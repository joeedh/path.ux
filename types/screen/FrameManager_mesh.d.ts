import * as ui_base from "../core/ui_base.js";
import { UIBase } from "../core/ui_base.js";
import { Vector2 } from "../path-controller/util/vectormath.js";
import { IContextBase } from "../core/context_base.js";
import type { ScreenArea, ScreenAreaAny } from "./ScreenArea.js";
import type { Screen } from "./FrameManager";
import { StructReader } from "../util/nstructjs.js";
export declare const SnapLimit = 1;
export declare const BORDER_ZINDEX_BASE = 25;
export declare function snap(c: number, snap_limit?: number): number;
export declare function snap(c: number[], snap_limit?: number): number[];
export declare function snapi(c: number, snap_limit?: number): number;
export declare function snapi(c: number[], snap_limit?: number): number[];
export declare class ScreenVert<CTX extends IContextBase = IContextBase> extends Vector2 {
    [Symbol.keystr]: () => string;
    added_id: string;
    sareas: ScreenAreaAny[];
    borders: ScreenBorderAny[];
    _id: number;
    constructor(pos?: Vector2 | number[], id?: number, added_id?: string);
    static hash(pos: Vector2 | number[], added_id: string, limit?: number): string;
    valueOf(): string;
    loadSTRUCT(reader: StructReader<this>): void;
    static STRUCT: string;
}
export declare class ScreenHalfEdge<CTX extends IContextBase = IContextBase> {
    [Symbol.keystr]: () => string;
    sarea: ScreenAreaAny;
    border: ScreenBorderAny;
    side: number;
    constructor(border: ScreenBorderAny, sarea: ScreenAreaAny);
    get v1(): ScreenVert<IContextBase<any, import("../pathux.js").IToolStack>>;
    get v2(): ScreenVert<IContextBase<any, import("../pathux.js").IToolStack>>;
}
export declare class ScreenBorder<CTX extends IContextBase = IContextBase> extends ui_base.UIBase<CTX> {
    [Symbol.keystr]: () => string;
    screen?: Screen<CTX>;
    v1: ScreenVert;
    v2: ScreenVert;
    _id: any;
    _hash: string | undefined;
    outer: boolean | undefined;
    halfedges: ScreenHalfEdge[];
    sareas: ScreenAreaAny[];
    _innerstyle: HTMLStyleElement;
    _style: HTMLStyleElement | undefined;
    inner: HTMLDivElement;
    movable: boolean;
    constructor();
    static bindBorderMenu(elem: ScreenBorder | UIBase, usePickElement?: boolean): (e: MouseEvent) => void;
    getOtherSarea(sarea: ScreenArea<CTX>): ScreenAreaAny | undefined;
    get locked(): boolean;
    get dead(): boolean;
    get side(): never;
    set side(_val: never);
    get valence(): number;
    get horiz(): boolean;
    static hash<CTX extends IContextBase = IContextBase>(v1: ScreenVert<CTX>, v2: ScreenVert<CTX>): string;
    static define(): {
        tagname: string;
        style: string;
    };
    otherVertex(v: ScreenVert<CTX>): ScreenVert<IContextBase<any, import("../pathux.js").IToolStack>>;
    setCSS(): void;
    valueOf(): string;
}
export type ScreenBorderAny = ScreenBorder<any>;
//# sourceMappingURL=FrameManager_mesh.d.ts.map