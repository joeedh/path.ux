export { keymap, reverse_keymap, keymap_latin_1 } from "./simple_events.js";
type EventCallback = (data: {
    stopPropagation(): void;
    data: unknown;
}) => void;
export declare class EventDispatcher {
    _cbs: Record<string, EventCallback[]>;
    constructor();
    _fireEvent(type: string, data: unknown): void;
    on(type: string, cb: EventCallback): this;
    off(type: string, cb: EventCallback): this;
}
export declare function copyMouseEvent(e: MouseEvent | TouchEvent): Record<string, unknown>;
export declare const DomEventTypes: {
    readonly on_mousemove: "mousemove";
    readonly on_mousedown: "mousedown";
    readonly on_mouseup: "mouseup";
    readonly on_touchstart: "touchstart";
    readonly on_touchcancel: "touchcanel";
    readonly on_touchmove: "touchmove";
    readonly on_touchend: "touchend";
    readonly on_mousewheel: "mousewheel";
    readonly on_keydown: "keydown";
    readonly on_keyup: "keyup";
    readonly on_pointerdown: "pointerdown";
    readonly on_pointermove: "pointermove";
    readonly on_pointercancel: "pointercancel";
    readonly on_pointerup: "pointerup";
};
export declare const modalStack: unknown[];
export declare function isModalHead(owner: unknown): boolean;
export declare class EventHandler {
    _modalstate: unknown;
    constructor();
    pushPointerModal(dom: EventTarget, pointerId: number): void;
    pushModal(_dom?: EventTarget, _is_root?: boolean): void;
    popModal(): void;
}
export declare function pushModal(dom: EventTarget, handlers: Record<string, unknown> & {
    popModal?: () => void;
}): EventHandler;
//# sourceMappingURL=events.d.ts.map