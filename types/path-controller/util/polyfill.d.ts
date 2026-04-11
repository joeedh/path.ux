/**
 * Runtime polyfills for path.ux.
 * This is a side-effect-only module — it modifies global prototypes and window properties.
 */
interface EventDebugData {
    type?: string;
    event?: unknown;
    cb?: unknown;
    args?: unknown;
    thisvar?: unknown;
    line?: unknown;
    filename?: string;
    filepath?: string;
    ownerpath?: unknown;
}
interface EventDebugModule {
    _addEventListener: typeof EventTarget.prototype.addEventListener;
    _removeEventListener: typeof EventTarget.prototype.removeEventListener;
    _dispatchEvent: typeof EventTarget.prototype.dispatchEvent;
    start(): void;
    add(type: string, data: EventDebugData): void;
    ondispatch(this: EventTarget, ...args: unknown[]): boolean;
    onadd(this: EventTarget, ...args: unknown[]): void;
    onrem(this: EventTarget, ...args: unknown[]): void;
    pruneConnected(): void;
}
//# sourceMappingURL=polyfill.d.ts.map