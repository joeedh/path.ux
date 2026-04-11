import { ToolPropertyTypes, ToolDef, ToolOp } from "../toolsys";
import { DataPath } from "./controller_base";
import type { DataAPI, DataStruct } from "./controller";
import type { Screen } from "../../screen/FrameManager";
export type ToolOpAny = ToolOp<any, any, any, any> | ToolOp;
export interface IToolStack {
    head?: ToolOpAny;
    [k: number]: ToolOpAny;
    length: number;
    cur: number;
    limitMemory(maxmem?: number, ctx?: unknown): number;
    calcMemSize(ctx?: unknown): number;
    setRestrictedToolContext(ctx: unknown): void;
    reset(ctx?: unknown): void;
    execOrRedo(ctx: unknown, tool: ToolOpAny, compareInputs?: boolean): boolean;
    execTool(ctx: unknown, toolop: ToolOpAny, event?: PointerEvent): void;
    toolCancel(ctx: unknown, toolop: ToolOpAny): void;
    undo(ctx: unknown): void;
    redo(ctx: unknown): void;
    rerun(tool?: ToolOpAny): void;
    save(): number[];
    rewind(): this;
    replay(cb?: (ctx: unknown) => unknown, onStep?: () => unknown): Promise<unknown>;
}
export interface ContextLike<AppState = any, TS extends IToolStack = IToolStack> {
    state: AppState;
    api: DataAPI<this>;
    toolstack: TS;
    toLocked?(): this;
    screen: Screen<this>;
}
/**
 * Result of resolvePath().
 */
export interface ResolvePathResult<CTX extends ContextLike = ContextLike> {
    dpath: DataPath;
    parent: any;
    obj: any;
    value: any;
    key: string;
    dstruct: DataStruct;
    prop?: ToolPropertyTypes;
    subkey?: string | number;
    mass_set?: string;
}
export declare class ModelInterface<CTX extends ContextLike = ContextLike> {
    prefix: string;
    constructor();
    getToolDef(path: string): ToolDef | undefined;
    getToolPathHotkey(ctx: CTX, path: string): string | undefined;
    createTool<T extends ToolOp = ToolOp>(ctxOrPath: ContextLike | string, pathOrInputs?: string | Record<string, unknown>, inputsOrUnused?: Record<string, unknown> | unknown, unused?: unknown): T;
    parseToolPath(path: string): typeof ToolOp | undefined;
    /**
     * runs .undo,.redo if toolstack head is same as tool
     *
     * otherwise, .execTool(ctx, tool) is called.
     *
     * @param compareInputs : check if toolstack head has identical input values, defaults to false
     * */
    execOrRedo(ctx: CTX, toolop: ToolOp, compareInputs?: boolean): unknown;
    execTool<T extends ToolOpAny | unknown = unknown>(ctx: CTX, path: string | (T extends ToolOpAny ? T : ToolOpAny), inputs?: T extends ToolOp ? ReturnType<T["getInputs"]> : Record<string, any>, unused?: unknown, event?: PointerEvent | undefined): Promise<T extends ToolOpAny ? T : ToolOpAny>;
    pushReportContext(name: string): void;
    popReportContext(): void;
    static toolRegistered(tool: typeof ToolOp): boolean;
    static registerTool(tool: typeof ToolOp): void;
    massSetProp(ctx: CTX, mass_set_path: string, value: unknown): void;
    /** takes a mass_set_path and returns an array of individual paths */
    resolveMassSetPaths(ctx: CTX, mass_set_path: string): string[];
    /**
     * @example
     *
     * return {
     *   obj      : [object owning property key]
     *   parent   : [parent of obj]
     *   key      : [property key]
     *   subkey   : used by flag properties, represents a key within the property
     *   value    : [value of property]
     *   prop     : [optional toolprop.ToolProperty representing the property definition]
     *   struct   : [optional datastruct representing the type, if value is an object]
     *   mass_set : mass setter string, if controller implementation supports it
     * }
     */
    resolvePath(ctx: CTX, path: string, ignoreExistence?: boolean, rootStruct?: unknown): ResolvePathResult<CTX> | undefined;
    setValue<T = unknown>(ctx: CTX, path: string, val: T, rootStruct?: unknown): void;
    getDescription(ctx: CTX, path: string): string;
    validPath(ctx: CTX, path: string, rootStruct?: unknown): boolean;
    getPropName(ctx: CTX, path: string): string;
    getValue<T = unknown>(ctx: CTX, path: string, rootStruct?: T): T | undefined;
}
//# sourceMappingURL=controller_abstract.d.ts.map