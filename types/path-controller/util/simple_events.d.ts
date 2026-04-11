import { Vector2 } from "./vectormath.js";
import { ContextLike } from "../controller.js";
declare global {
    interface Window {
        testSingleMouseUpEvent: (type?: string) => void;
        _findScreen: () => unknown;
        _haveModal: () => boolean;
        _print_evt_debug: boolean;
    }
}
export interface EventHandler {
    (e: Event): void;
    settings?: AddEventListenerOptions;
}
export interface ModalState {
    keys: Set<string>;
    handlers: Record<string, EventHandler>;
    last_mpos: number[];
    pointer?: {
        elem: Element;
        pointerId: number;
        [key: string]: unknown;
    };
}
export declare const modalstack: ModalState[];
/**
 * adds a mouse event callback that only gets called once
 * */
export declare function singleMouseEvent(cb: (e: Event) => void, type: string): void;
export declare function isLeftClick(e: Record<string, unknown>): boolean;
export declare class DoubleClickHandler {
    down: number;
    last: number;
    up: number;
    dblEvent: any | undefined;
    mdown: boolean;
    start_mpos: InstanceType<typeof Vector2>;
    _on_mouseup: (e: Event) => void;
    _on_mousemove: (e: Event) => void;
    constructor();
    _on_mouseup_impl(_e: Event): void;
    _on_mousemove_impl(e: Event): void;
    mousedown(e: MouseEvent): void;
    ondblclick(_e: Record<string, unknown>): void;
    update(): void;
    abort(): void;
}
export declare function isMouseDown(e: MouseEvent | PointerEvent | TouchEvent): boolean;
export declare function pathDebugEvent(event: Event, extra?: unknown): void;
export declare function eventWasMouseDown(e: PointerEvent | MouseEvent | TouchEvent, button?: number): boolean;
/** Returns true if event came from a touchscreen or pen device */
export declare function eventWasTouch(e: MouseEvent): boolean;
export declare function copyEvent(e: Event): any;
export declare function _setScreenClass(cls: any): void;
export declare function _setModalAreaClass(cls: {
    lock(): void;
    unlock(): void;
}): void;
export declare function pushPointerModal(obj: Record<string, unknown>, elem?: Element, pointerId?: number, autoStopPropagation?: boolean): ModalState;
export declare function pushModalLight(obj: Record<string, unknown>, autoStopPropagation?: boolean, elem?: Element, pointerId?: number): ModalState;
export declare function popModalLight(state: ModalState | undefined): void;
export declare function haveModal(): boolean;
export declare var keymap_latin_1: Record<string, number>;
export declare var keymap: Record<string, number>;
export declare var reverse_keymap: Record<number, string>;
export declare class HotKey {
    action: string | ((ctx: ContextLike) => void);
    mods: string[];
    key: number;
    uiname: string | undefined;
    /**action can be a callback or a toolpath string*/
    constructor(key: string, modifiers: string[], action: string | ((ctx: ContextLike) => void), uiname?: string);
    exec(ctx: ContextLike): void;
    buildString(): string;
}
export declare class KeyMap<CTX extends ContextLike = ContextLike> extends Array<HotKey> {
    pathid: string;
    /**
     *
     * @param hotkeys
     * @param pathid Id of keymap, used when patching hotkeys, when
     *                       that is implemented
     * */
    constructor(hotkeys?: HotKey[], pathid?: string);
    handle(ctx: CTX, e: KeyboardEvent): boolean;
    add(hk: HotKey): void;
    push(hk: HotKey): number;
}
//# sourceMappingURL=simple_events.d.ts.map