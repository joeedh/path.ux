/**
 see doc_src/context.md
 */
import type { ContextLike } from "../controller";
declare global {
    interface SymbolConstructor {
        CachedDef: symbol;
        ContextID: symbol;
    }
}
interface Notifier {
    error(screen: unknown, message: string, timeout: number): unknown;
    warning(screen: unknown, message: string, timeout: number): unknown;
    message(screen: unknown, msg: string, timeout: number): unknown;
    progbarNote(screen: unknown, msg: string, perc: number, color: string, timeout: number, id: string): unknown;
}
export declare function setNotifier(cls: Notifier): void;
export declare const ContextFlags: {
    IS_VIEW: number;
};
declare class InheritFlag {
    data: number;
    constructor(data: number);
}
export declare const OverlayClasses: Function[];
interface ContextDefinition {
    name?: string;
    flag?: number | InheritFlag;
}
type OverlayParent = {
    new (appstate: unknown): Record<string, unknown>;
};
export declare function makeDerivedOverlay(parent: OverlayParent): {
    new (appstate: unknown): {
        [x: string]: unknown;
        ctx: Context | undefined;
        _state: unknown;
        __allKeys: Set<string | symbol> | undefined;
        get state(): unknown;
        set state(state: unknown);
        onRemove(_have_new_file?: boolean): void;
        copy(): /*elided*/ any;
        validate(): boolean;
    };
    contextDefine(): ContextDefinition;
    resolveDef(): {
        name?: string;
        flag: number;
    };
};
export declare const ContextOverlay: {
    new (appstate: unknown): {
        [x: string]: unknown;
        ctx: Context | undefined;
        _state: unknown;
        __allKeys: Set<string | symbol> | undefined;
        get state(): unknown;
        set state(state: unknown);
        onRemove(_have_new_file?: boolean): void;
        copy(): /*elided*/ any;
        validate(): boolean;
    };
    contextDefine(): ContextDefinition;
    resolveDef(): {
        name?: string;
        flag: number;
    };
};
export declare const excludedKeys: Set<string>;
type OverlayInstance = InstanceType<ReturnType<typeof makeDerivedOverlay>>;
export declare class LockedContext {
    props: Record<string, {
        data: unknown;
        get: (ctx: unknown, data: unknown) => unknown;
    }>;
    state: unknown;
    api: unknown;
    toolstack: unknown;
    noWarnings: boolean;
    ctx: Context;
    [key: string]: unknown;
    constructor(ctx: Context, noWarnings?: boolean);
    toLocked(): this;
    error(...args: unknown[]): unknown;
    warning(...args: unknown[]): unknown;
    message(...args: unknown[]): unknown;
    progbar(...args: unknown[]): unknown;
    progressBar(...args: unknown[]): unknown;
    load(ctx: Context): void;
    setContext(ctx: Context): void;
}
export declare class Context<Overlays extends ContextLike = ContextLike> {
    state: unknown;
    _props: Set<string>;
    _stack: OverlayInstance[];
    _inside_map: Record<number, number>;
    [key: string]: unknown;
    constructor(appstate: unknown);
    static isContextSubclass(cls: Function | null): boolean;
    /** chrome's debug console corrupts this._inside_map,
     this method fixes it*/
    _fix(): void;
    fix(): void;
    error(message: string, timeout?: number): unknown;
    warning(message: string, timeout?: number): unknown;
    message(msg: string, timeout?: number): unknown;
    progbar(msg: string, perc?: number, timeout?: number, id?: string): unknown;
    validateOverlays(): void;
    hasOverlay(cls: Function): boolean;
    getOverlay(cls: Function): OverlayInstance | undefined;
    clear(have_new_file?: boolean): void;
    reset(have_new_file?: boolean): void;
    override(overrides: Record<string, unknown> & {
        copy?: () => Record<string, unknown>;
    }): Context;
    copy(): Context;
    static super(): Record<string, never>;
    saveProperty(key: string): unknown;
    loadProperty(_ctx: unknown, _key: string, data: unknown): unknown;
    getOwningOverlay(name: string, _val_out?: [unknown]): OverlayInstance | undefined;
    ensureProperty(name: string): void;
    toLocked(): LockedContext;
    pushOverlay(overlay: OverlayInstance): void;
    popOverlay(overlay: OverlayInstance): void;
    removeOverlay(overlay: OverlayInstance): void;
    static inherit(data: number): InheritFlag;
    static register(cls: Function): void;
}
export declare function test(): boolean;
export {};
//# sourceMappingURL=context.d.ts.map