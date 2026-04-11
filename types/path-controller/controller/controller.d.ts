import * as parseutil from "../util/parseutil.js";
import { ToolOp } from "../toolsys/toolsys.js";
import { DataPathSetOp } from "./controller_ops.js";
import { ToolPropertyTypes } from "../toolsys";
import { DataPath, ListIFace, ListFuncs } from "./controller_base.js";
declare global {
    interface SymbolConstructor {
        ToolID: symbol;
    }
}
export * from "./controller_base.js";
export declare const pathParser: parseutil.parser;
import { ContextLike, ModelInterface, ResolvePathResult } from "./controller_abstract.js";
export { DataPathError, DataFlags } from "./controller_base.js";
import { ToolProperty, IntProperty } from "../toolsys/toolprop.js";
export declare function pushReportName(name: string): void;
export declare function popReportName(): void;
export declare class DataStruct<CTX extends ContextLike = ContextLike> {
    members: DataPath[];
    name: string;
    pathmap: Record<string, DataPath>;
    flag: number;
    dpath: DataPath | undefined;
    inheritFlag: number;
    constructor(members?: DataPath[] | undefined, name?: string);
    clear(): this;
    copy(): DataStruct;
    /**
     * Like .struct, but the type of struct is looked up
     * for objects at runtime.  Note that to work correctly each object
     * must create its own struct definition via api.mapStruct
     *
     * @param path
     * @param apiname
     * @param uiname
     * @param default_struct : default struct if one can't be looked up
     * @returns {*}
     */
    dynamicStruct(path: string, apiname: string, uiname: string, default_struct?: DataStruct): DataStruct;
    struct(path: string, apiname: string, uiname: string, existing_struct?: DataStruct): DataStruct;
    customGet(getter: (this: ToolProperty) => unknown): this;
    customGetSet(getter: (this: ToolProperty) => unknown, setter: (this: ToolProperty, val: unknown) => void): this;
    color3(path: string, apiname: string, uiname: string, description?: string): DataPath;
    color4(path: string, apiname: string, uiname: string, description?: string): DataPath;
    arrayList<T extends number = number>(path: string, apiname: string, structdef: DataStruct, uiname: string, description: string): DataPath;
    color3List(path: string, apiname: string, uiname: string, description: string): DataPath;
    color4List(path: string, apiname: string, uiname: string, description: string): DataPath;
    vectorList(size: number, path: string, apiname: string, uiname: string, description: string, subtype: number): DataPath;
    bool(path: string, apiname: string, uiname?: string, description?: string): DataPath<ContextLike<any, import("./controller_abstract.js").IToolStack>>;
    vec2(path: string, apiname: string, uiname?: string, description?: string): DataPath<ContextLike<any, import("./controller_abstract.js").IToolStack>>;
    vec3(path: string, apiname: string, uiname?: string, description?: string): DataPath<ContextLike<any, import("./controller_abstract.js").IToolStack>>;
    vec4(path: string, apiname: string, uiname?: string, description?: string): DataPath<ContextLike<any, import("./controller_abstract.js").IToolStack>>;
    float(path: string, apiname: string, uiname?: string, description?: string): DataPath<ContextLike<any, import("./controller_abstract.js").IToolStack>>;
    textblock(path: string, apiname: string, uiname?: string, description?: string): DataPath<ContextLike<any, import("./controller_abstract.js").IToolStack>>;
    report(path: string, apiname: string, uiname?: string, description?: string): DataPath<ContextLike<any, import("./controller_abstract.js").IToolStack>>;
    string(path: string, apiname: string, uiname?: string, description?: string): DataPath<ContextLike<any, import("./controller_abstract.js").IToolStack>>;
    int(path: string, apiname: string, uiname?: string, description?: string, prop?: IntProperty): DataPath<ContextLike<any, import("./controller_abstract.js").IToolStack>>;
    curve1d(path: string, apiname: string, uiname?: string, description?: string): DataPath<ContextLike<any, import("./controller_abstract.js").IToolStack>>;
    enum(path: string, apiname: string, enumdef: any, uiname?: string, description?: string): DataPath<ContextLike<any, import("./controller_abstract.js").IToolStack>>;
    list<ListType = any, KeyType = any, ObjType = any>(path: string, apiname: string, funcs: ListIFace<DataAPI, ListType, KeyType, ObjType, CTX> | ListFuncs<DataAPI, ListType, KeyType, ObjType, CTX>): DataPath<ContextLike<any, import("./controller_abstract.js").IToolStack>>;
    flags(path: string, apiname: string, enumdef: any, uiname?: string, description?: string): DataPath<ContextLike<any, import("./controller_abstract.js").IToolStack>>;
    remove(m: string | DataPath): void;
    fromToolProp(path: string, prop: ToolProperty, apiname?: string): DataPath<ContextLike<any, import("./controller_abstract.js").IToolStack>>;
    add(dpath: DataPath): this;
}
export declare class DataAPI<CTX extends ContextLike = ContextLike> extends ModelInterface {
    #private;
    rootContextStruct: DataStruct | undefined;
    structs: DataStruct[];
    constructor();
    static toolRegistered(cls: any): boolean;
    static registerTool(cls: any): void;
    getStructs(): DataStruct<ContextLike<any, import("./controller_abstract.js").IToolStack>>[];
    setRoot(sdef: DataStruct): void;
    hasStruct(cls: any): any;
    getStruct(cls: any): DataStruct<ContextLike<any, import("./controller_abstract.js").IToolStack>>;
    mergeStructs(dest: DataStruct<CTX>, src: DataStruct<CTX>): void;
    inheritStruct(cls: any, parent: any, auto_create_parent?: boolean): DataStruct<ContextLike<any, import("./controller_abstract.js").IToolStack>>;
    /**
     * Look up struct definition for a class.
     *
     * @param cls: the class
     * @param auto_create: If true, automatically create definition if not already existing.
     * @returns {IterableIterator<*>}
     */
    _addClass(cls: any, dstruct: DataStruct): void;
    mapStructCustom(cls: any, callback: (instance: any) => void): void;
    mapStruct(cls: any, auto_create?: boolean, name?: string): DataStruct<ContextLike<any, import("./controller_abstract.js").IToolStack>>;
    pushReportContext(name: string): void;
    popReportContext(): void;
    massSetProp<T = unknown>(ctx: CTX, massSetPath: string, value: T): void;
    resolveMassSetPaths(ctx: CTX, massSetPath: string): string[];
    resolvePath(ctx: CTX, inpath: string, ignoreExistence?: boolean, dstruct?: DataStruct): ResolvePathResult | undefined;
    getPropOverride<P extends ToolProperty | ToolPropertyTypes>(ctx: CTX, path: string, dpath: DataPath, obj: any, prop?: ToolProperty): P;
    /**
     get meta information for a datapath.
  
     @param ignoreExistence: don't try to get actual data associated with path,
      just want meta information
     */
    resolvePath_intern(ctx: CTX, inpath: string, ignoreExistence?: boolean, p?: parseutil.parser, dstruct?: DataStruct): ResolvePathResult | undefined;
    _parsePathOverrides(path: string): {
        path: string;
        uiname: string | undefined;
        hotkey: string | undefined;
    };
    /** Get tooldef for path, applying any modifications, e.g.:
     *  "app.some_tool()|Label::CustomHotkeyString"
     * */
    getToolDef(toolpath: string): import("../toolsys").ToolDef<import("../toolsys").PropertySlots, import("../toolsys").PropertySlots>;
    getToolPathHotkey(ctx: CTX, toolpath: string): string | undefined;
    parseToolPath(path: string): typeof ToolOp | undefined;
    parseToolArgs(path: string): Record<string, unknown>;
    createTool<T extends ToolOp = ToolOp>(ctx: CTX, path: string, inputs?: any): T;
}
export declare function initSimpleController(): void;
export declare function getDataPathToolOp(): typeof DataPathSetOp;
export declare function setDataPathToolOp(cls: any): void;
//# sourceMappingURL=controller.d.ts.map