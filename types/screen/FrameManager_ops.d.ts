import { Vector2 } from "../path-controller/util/vectormath";
import * as ui_base from "../core/ui_base";
import * as simple_toolsys from "../path-controller/toolsys/toolsys";
import { ToolTip } from "../widgets/ui_widgets2";
import type { Screen } from "./FrameManager";
import type { Overdraw } from "../util/ScreenOverdraw";
import type { SVGRectWithColor } from "../util/ScreenOverdraw";
import type { ScreenBorder, ScreenBorderAny } from "./FrameManager_mesh";
export declare function registerToolStackGetter(func: () => simple_toolsys.ToolStack): void;
import { pushModalLight, pushPointerModal } from "../util/simple_events";
import { IContextBase } from "../core/context_base";
import { ScreenArea, ScreenAreaAny } from "./ScreenArea";
export declare class ToolBase<CTX extends IContextBase = IContextBase> extends simple_toolsys.ToolOp<{}, {}, CTX> {
    screen: Screen<CTX>;
    _finished: boolean;
    overdraw?: Overdraw<CTX>;
    modaldata: ReturnType<typeof pushModalLight> | ReturnType<typeof pushPointerModal> | undefined;
    ctx: CTX;
    constructor(screen: Screen<CTX>);
    start(elem?: Element, pointerId?: number): void;
    cancel(): void;
    finish(): void;
    popModal(): void;
    toolModalStart(ctx?: CTX | undefined, elem?: Element, pointerId?: number): void;
    on_pointermove(e: PointerEvent): void;
    on_pointerup(e: PointerEvent): void;
    on_keydown(e: KeyboardEvent): void;
}
export declare class AreaResizeTool<CTX extends IContextBase = any> extends ToolBase<CTX> {
    sarea: ScreenAreaAny;
    start_mpos: Vector2;
    side: number;
    constructor(screen: Screen<CTX>, border: ScreenBorderAny, mpos: Vector2 | number[]);
    get border(): ScreenBorder<any>;
    static tooldef(): {
        uiname: string;
        toolpath: string;
        icon: number;
        description: string;
        is_modal: boolean;
        undoflag: number;
        flag: number;
        inputs: {};
        outputs: {};
    };
    getBorders(): ScreenBorder<CTX>[];
    on_pointerup(e: PointerEvent): void;
    finish(): void;
    on_keydown(e: KeyboardEvent): void;
    on_pointermove(e: PointerEvent): void;
}
export declare class SplitTool<CTX extends IContextBase = IContextBase> extends ToolBase<CTX> {
    done: boolean;
    sarea: ScreenArea<CTX> | undefined;
    t: number | undefined;
    horiz: boolean | undefined;
    started: boolean;
    constructor(screen: Screen<CTX>);
    static tooldef(): {
        uiname: string;
        toolpath: string;
        icon: number;
        description: string;
        is_modal: boolean;
        undoflag: number;
        flag: number;
        inputs: {};
        outputs: {};
    };
    toolModalStart(ctx?: CTX): void;
    cancel(): void;
    finish(canceled?: boolean): void;
    on_pointermove(e: PointerEvent): void;
    on_pointerdown(e: PointerEvent): void;
    on_keydown(e: KeyboardEvent): void;
}
export declare class RemoveAreaTool<CTX extends IContextBase = IContextBase> extends ToolBase<CTX> {
    _border: ScreenBorderAny | undefined;
    done: boolean;
    sarea: ScreenArea<CTX> | undefined;
    t: number | undefined;
    started: boolean;
    constructor(screen: Screen<CTX>, border?: ScreenBorder<CTX>);
    static tooldef(): {
        uiname: string;
        toolpath: string;
        icon: number;
        description: string;
        is_modal: boolean;
        undoflag: number;
        flag: number;
        inputs: {};
        outputs: {};
    };
    toolModalStart(ctx?: CTX): void;
    cancel(): void;
    finish(canceled?: boolean): void;
    on_pointermove(e: PointerEvent): void;
    on_pointerdown(e: PointerEvent): void;
    on_keydown(e: KeyboardEvent): void;
}
interface DragBoxRect<CTX extends IContextBase = IContextBase> extends SVGRectWithColor {
    sarea: ScreenArea<CTX>;
    horiz: boolean | number;
    t: number;
    side: string | number;
    rect: SVGRectWithColor | undefined;
    onclick: (e: PointerEvent | MouseEvent) => void;
}
interface DragBox<CTX extends IContextBase = IContextBase> {
    sarea: ScreenArea<CTX>;
    horiz: boolean | number;
    t: number;
    side: string | number;
}
export declare class AreaDragTool<CTX extends IContextBase = IContextBase> extends ToolBase<CTX> {
    dropArea: boolean;
    excludeAreas: Set<ScreenArea<CTX>>;
    cursorbox: SVGRectWithColor | undefined;
    boxes: DragBoxRect<CTX>[] & {
        active?: DragBoxRect<CTX>;
    };
    sarea: ScreenArea<CTX> | undefined;
    start_mpos: Vector2;
    color: string;
    hcolor: string;
    curbox: DragBoxRect<CTX> | undefined;
    constructor(screen: Screen<CTX>, sarea: ScreenArea<CTX> | undefined, mpos: Vector2 | number[]);
    static tooldef(): {
        uiname: string;
        toolpath: string;
        icon: number;
        description: string;
        is_modal: boolean;
        undoflag: number;
        flag: number;
        inputs: {};
        outputs: {};
    };
    finish(): void;
    getBoxRect(b: DragBox<CTX>): SVGRectWithColor;
    doSplit(b: DragBox<CTX>): void;
    doSplitDrop(b: DragBox<CTX>): void;
    makeBoxes(sa: ScreenArea<CTX>): void;
    getActiveBox(x: number, y: number): DragBoxRect<CTX> | undefined;
    on_drag(e: PointerEvent): void;
    on_dragend(e: PointerEvent): void;
    on_pointermove(e: PointerEvent): void;
    on_pointerup(e: PointerEvent): void;
    toolModalStart(ctx?: CTX): void;
    on_keydown(e: KeyboardEvent): void;
}
export declare class AreaMoveAttachTool<CTX extends IContextBase = IContextBase> extends AreaDragTool<CTX> {
    first: boolean;
    mpos: Vector2;
    start_mpos2: Vector2;
    start_pos: Vector2;
    constructor(screen: Screen<CTX>, sarea: ScreenArea<CTX>, mpos: Vector2 | number[]);
    on_pointermove(e: PointerEvent): void;
    on_pointerup(e: PointerEvent): void;
    on_pointerdown(e: PointerEvent): void;
    on_keydown(e: KeyboardEvent): void;
}
export declare class ToolTipViewer<CTX extends IContextBase = IContextBase> extends ToolBase<CTX> {
    tooltip: ToolTip<CTX> | undefined;
    element: ui_base.UIBase | undefined;
    constructor(screen: Screen<CTX>);
    static tooldef(): {
        uiname: string;
        toolpath: string;
        icon: number;
        description: string;
        is_modal: boolean;
        undoflag: number;
        flag: number;
        inputs: {};
        outputs: {};
    };
    on_pointermove(e: PointerEvent): void;
    on_pointerdown(e: PointerEvent): void;
    on_pointerup(e: PointerEvent): void;
    finish(): void;
    on_keydown(e: KeyboardEvent): void;
    pick(e: PointerEvent): void;
}
export {};
//# sourceMappingURL=FrameManager_ops.d.ts.map