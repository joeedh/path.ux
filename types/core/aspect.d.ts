type AspectOwner = any & {
    __aspect_methods?: Set<string>;
    constructor: Function;
};
export declare function _setUIBase(uibase: Function): void;
export declare function initAspectClass(objectIn: any, blacklist?: Set<string | symbol>): void;
export declare function clearAspectCallbacks(obj: AspectOwner): void;
type ChainEntry = [Function | undefined, (Node & {
    isDead?: () => boolean;
}) | undefined, boolean?];
interface AspectMethod {
    (...args: unknown[]): unknown;
    value?: unknown;
    after: (cb: Function, node?: Node, once?: boolean) => unknown;
    once: (cb: Function, node?: Node) => unknown;
    remove: (cb: Function) => boolean;
    clear: () => AfterAspect;
}
/**
 *
 * example:
 *
 * someobject.update.after(() => {
 *   do_something();
 *   return someobject.update.value;
 * }
 *
 * */
export declare class AfterAspect {
    owner: AspectOwner;
    key: string;
    chain: ChainEntry[];
    chain2: ChainEntry[];
    root: ChainEntry[];
    _method: AspectMethod;
    _method_bound: boolean;
    constructor(owner: AspectOwner, key: string);
    static bind(owner: AspectOwner, key: string): AfterAspect;
    remove(cb: Function): boolean;
    once(cb: Function, node?: Node): unknown;
    _checkbind(): void;
    clear(): this;
    before(cb: Function | undefined, node?: Node, once?: boolean): unknown;
    after(cb: Function | undefined, node?: Node, once?: boolean): unknown;
}
export {};
//# sourceMappingURL=aspect.d.ts.map