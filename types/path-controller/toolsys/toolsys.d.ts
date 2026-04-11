/**

 ToolOps are base operators for modifying application state.
 They operate on Contexts and can use the datapath API.
 They make up the undo stack.

 ToolOp subclasses handle undo with their undoPre (run before tool execution)
 and undo methods.  You can set default handlers (most commonly this is just
 saving/reloading the app state) with setDefaultUndoHandlers.

 ToolOps have inputs and outputs (which are ToolProperties) and can also
 be modal.

 ## Rules

 Tools are never, EVER allowed to store direct pointers to the application state,
 with one exception: tools in modal mode may store such pointers, but they must
 delete them when existing modal mode by overriding modalEnd.

 This is to prevent very evil and difficult to debug bugs in the undo stack
 and nasty memory leaks.

 ## Example

 <pre>

 const ExampleEnum = {
  ITEM1 : 0,
  ITEM2 : 1
}

 class MyTool extends ToolOp {
  static tooldef() {
    return {
      uiname     : "Tool Name",
      toolpath   : "my.tool",
      inputs     : {
          input1 : new IntProperty(),
          input2 : new EnumProperty(0, ExampleEnum)
      },
      outputs    : {
          someoutput : new IntProperty
      }
    }
  }

  undoPre(ctx) {
    //run before tool starts
  }

  undo(ctx) {
    //undo handler
  }

  execPre(ctx) {
    //run right before exec
  }
  exec(ctx) {
    //main execution method
  }
  execPost(ctx) {
    //run right after exec
  }
}
 ToolOp.register(MyTool);

 </pre>
 */
import * as events from "../util/events.js";
import { ToolProperty } from "./toolprop.js";
import { ContextLike, DataAPI, DataStruct, ToolOpAny } from "../controller.js";
import { StructReader } from "../util/nstructjs.js";
/** The shape returned by ToolOp.tooldef() */
export interface ToolDef<InputSlots = PropertySlots, OutputSlots = PropertySlots> {
    uiname?: string;
    toolpath?: string;
    icon?: number;
    description?: string;
    is_modal?: boolean;
    hotkey?: unknown;
    undoflag?: number;
    flag?: number;
    inputs?: (InputSlots & InheritFlag<InputSlots>) | InputSlots | InheritFlag<InputSlots>;
    outputs?: (OutputSlots & InheritFlag<OutputSlots>) | OutputSlots | InheritFlag<OutputSlots>;
    [key: string]: unknown;
}
/** A resolved tool definition (inputs/outputs are plain records) */
interface ResolvedToolDef {
    uiname?: string;
    toolpath?: string;
    icon?: number;
    description?: string;
    is_modal?: boolean;
    hotkey?: unknown;
    undoflag?: number;
    flag?: number;
    inputs: Record<string, ToolProperty>;
    outputs: Record<string, ToolProperty>;
    [key: string]: unknown;
}
/** ToolOp constructor shape for static-side typing */
export interface IToolOpConstructor {
    new (): ToolOp;
    name: string;
    STRUCT?: string;
    tooldef(): ToolDef;
    _getFinalToolDef(): ResolvedToolDef;
    _regWithNstructjs(cls: IToolOpConstructor, structName?: string): void;
    canRun<CTX extends ContextLike, ModalCTX extends CTX = CTX>(ctx: CTX, toolop?: ToolOp<any, any, CTX, ModalCTX>): boolean;
    isRegistered(cls: IToolOpConstructor): boolean;
    register(cls: IToolOpConstructor): void;
    unregister(cls: IToolOpConstructor): void;
    searchBoxOk(ctx: unknown): boolean;
    onTick(): void;
    invoke(ctx: unknown, args: Record<string, unknown>): ToolOp;
    inherit<Slots>(slots: Slots): InheritFlag<Slots>;
    Equals(a: ToolOp | undefined | null, b: ToolOp | undefined | null): boolean;
    prototype: ToolOp & {
        __proto__: {
            constructor: IToolOpConstructor;
        };
    };
}
/** Runtime-generated macro class shape */
type MacroClassType = (new () => ToolOp) & {
    __tooldef: Record<string, unknown>;
    ready: boolean;
    _macroTypeId?: number;
    tooldef(): ToolDef;
    _getFinalToolDef(): ResolvedToolDef;
    name: string;
    STRUCT?: string;
};
export type PropertySlots = {
    [k: string]: ToolProperty<unknown>;
};
export type SlotType<slot extends ToolProperty<unknown>> = slot extends ToolProperty<infer T> ? T : unknown;
export declare const ToolClasses: IToolOpConstructor[];
export declare function setContextClass(_cls: unknown): void;
export declare const ToolFlags: Record<string, number>;
export declare const UndoFlags: Record<string, number>;
/** @deprecated inheritance is now forced (at least for inputs/outputs) */
export declare class InheritFlag<Slots = Record<string, ToolProperty>> {
    slots: Slots;
    constructor(slots?: Slots);
}
export declare function setDefaultUndoHandlers(undoPre: (ctx: unknown) => void, undo: (ctx: unknown) => void): void;
export declare class ToolPropertyCache {
    /** @deprecated */
    map: Map<unknown, unknown>;
    pathmap: Map<string, any>;
    accessors: Record<string, any>;
    userSetMap: Set<string>;
    api: DataAPI;
    dstruct: DataStruct;
    constructor();
    static getPropKey(_cls: unknown, key: string, prop: ToolProperty): string;
    _buildAccessors(cls: IToolOpConstructor | MacroClassType, key: string, prop: ToolProperty, dstruct: DataStruct, api: DataAPI): void;
    _getAccessor(cls: IToolOpConstructor | MacroClassType): Record<string, unknown> | undefined;
    static getFullPath(cls: IToolOpConstructor | MacroClassType, key: string, prop: ToolProperty): string;
    useDefault(cls: IToolOpConstructor | MacroClassType, key: string, prop: ToolProperty): boolean;
    has(cls: IToolOpConstructor | MacroClassType, key: string, prop: ToolProperty): boolean;
    get<T>(cls: IToolOpConstructor | MacroClassType, key: string, prop: ToolProperty<T>): T | undefined;
    set<T>(cls: IToolOpConstructor | MacroClassType, key: string, prop: ToolProperty<T>): this | undefined;
}
export declare const SavedToolDefaults: ToolPropertyCache;
export declare class ToolOp<InputSlots extends PropertySlots = {}, OutputSlots extends PropertySlots = {}, CTX extends ContextLike = ContextLike, ModalCTX extends CTX = CTX> extends events.EventHandler {
    /**
     Main ToolOp constructor.  It reads the inputs/outputs properties from
     this.constructor.tooldef() and copies them to build this.inputs and this.outputs.
     If inputs or outputs are wrapped in ToolOp.inherit(), it will walk up the class
     chain to fetch parent class properties.
  
  
     Default input values are loaded from SavedToolDefaults.  If initialized (buildToolSysAPI
     has been called) SavedToolDefaults will have a copy of all the default
     property values of all registered ToolOps.
     **/
    static STRUCT: string;
    _pointerId: number | undefined;
    _overdraw: (HTMLElement & {
        start(screen: unknown): void;
        end(): void;
        line(v1: unknown, v2: unknown, style: unknown): unknown;
    }) | undefined;
    __memsize: number | undefined;
    undoflag: number;
    flag: number;
    _accept: ((ctx: unknown, wasCancelled: boolean) => void) | undefined;
    _reject: ((reason?: unknown) => void) | undefined;
    _promise: Promise<unknown> | undefined;
    _on_cancel: ((tool: any) => void) | undefined;
    _was_redo: boolean;
    inputs: InputSlots;
    outputs: OutputSlots;
    drawlines: unknown[];
    is_modal: boolean;
    modal_ctx?: ModalCTX;
    modalRunning: boolean;
    execCtx?: CTX;
    constructor();
    /**
     ToolOp definition.
  
     An example:
     <pre>
     static tooldef() {
      return {
        uiname   : "Tool Name",
        toolpath : "logical_module.tool", //logical_module need not match up to a real module
        icon     : -1, //tool's icon, or -1 if there is none
        description : "tooltip",
        is_modal : false, //tool is interactive and takes control of events
        hotkey   : undefined,
        undoflag : 0, //see UndoFlags
        flag     : 0,
        inputs   : ToolOp.inherit({
          f32val : new Float32Property(1.0),
          path   : new StringProperty("./path");
        }),
        outputs  : {}
        }
      }
     </pre>
     */
    static tooldef(): ToolDef;
    /** Returns a map of input property values,
     *  e.g. `let {prop1, prop2} = this.getInputs()` */
    getInputs(): {
        [k in keyof InputSlots]: SlotType<InputSlots[k]>;
    };
    /** Returns a map of output property values */
    getOutputs(): {
        [k in keyof OutputSlots]: SlotType<OutputSlots[k]>;
    };
    static Equals<CTX extends ContextLike, ModalCTX extends CTX = CTX>(a: ToolOp<any, any, CTX, ModalCTX> | undefined | null, b: ToolOp<any, any, CTX, ModalCTX> | undefined | null): boolean;
    /** @deprecated inheritance is now forced */
    static inherit<Slots>(slots: Slots): InheritFlag<Slots>;
    /**
  
     Creates a new instance of this toolop from args and a context.
     This is often use to fill properties with default arguments
     stored somewhere in the context.
  
     */
    static invoke(_ctx: any, args: Record<string, unknown>): ToolOpAny;
    static register(cls: any): void;
    static _regWithNstructjs(cls: IToolOpConstructor, structName?: string): void;
    static isRegistered(cls: IToolOpConstructor): boolean;
    static unregister(cls: any): void;
    static _getFinalToolDef(): ResolvedToolDef;
    static onTick(): void;
    static searchBoxOk<CTX extends ContextLike>(ctx: CTX): boolean;
    static canRun<CTX extends ContextLike>(_ctx: CTX, _toolop?: ToolOp | undefined): boolean;
    /** Called when the undo system needs to destroy
     *  this toolop to save memory*/
    onUndoDestroy(): void;
    /** Used by undo system to limit memory */
    calcMemSize(ctx: CTX): number;
    loadDefaults(force?: boolean): this;
    hasDefault(toolprop: ToolProperty, key?: string): boolean;
    getDefault(toolprop: ToolProperty, key?: string): unknown;
    saveDefaultInputs(): this;
    genToolString(): string;
    on_tick(): void;
    /**default on_keydown implementation for modal tools,
     no need to call super() to execute this if you don't want to*/
    on_keydown(e: KeyboardEvent): void;
    calcUndoMem(_ctx: CTX): number;
    undoPre(_ctx: CTX): void;
    undo(_ctx: CTX): void;
    redo(ctx: CTX): void;
    exec_pre(ctx: CTX): void;
    execPre(_ctx: CTX): void;
    exec(_ctx: CTX): void;
    execPost(_ctx: CTX): void;
    /**for use in modal mode only*/
    resetTempGeom(): void;
    error(msg: string): void;
    getOverdraw(): HTMLElement & {
        start(screen: unknown): void;
        end(): void;
        line(v1: unknown, v2: unknown, style: unknown): unknown;
    };
    /**for use in modal mode only*/
    makeTempLine(v1: unknown, v2: unknown, style: unknown): unknown;
    pushModal(_node: unknown): void;
    popModal(): void;
    /**returns promise to be executed on modalEnd*/
    modalStart(ctx: ModalCTX): Promise<unknown>;
    toolCancel(): void;
    modalEnd(was_cancelled: boolean): void;
    loadSTRUCT(reader: StructReader<this>): void;
    _save_inputs(): PropKey[];
    _save_outputs(): PropKey[];
}
declare class PropKey {
    static STRUCT: string;
    key: string;
    val: ToolProperty;
    constructor(key: string, val: ToolProperty);
}
export declare class MacroLink {
    static STRUCT: string;
    source: number;
    dest: number;
    sourceProps: string;
    destProps: string;
    sourcePropKey: string;
    destPropKey: string;
    constructor(sourcetool_idx: number, srckey: string, srcprops: string | undefined, desttool_idx: number, dstkey: string, dstprops?: string);
}
export declare const MacroClasses: Record<string, MacroClassType>;
interface ConnectCB {
    srctool: ToolOp;
    dsttool: ToolOp;
    callback: (src: ToolOp, dst: ToolOp) => void;
    thisvar: unknown;
}
export declare class ToolMacro<CTX extends ContextLike, ModalCTX extends CTX = CTX> extends ToolOp<any, any, CTX, ModalCTX> {
    static STRUCT: string;
    tools: ToolOp[];
    curtool: number;
    has_modal: boolean;
    connects: ConnectCB[];
    connectLinks: MacroLink[];
    private _macro_class;
    constructor();
    static tooldef(): ToolDef;
    static canRun<CTX extends ContextLike = ContextLike>(_ctx: CTX, _toolop?: ToolOp | undefined): boolean;
    _getTypeClass(): MacroClassType;
    saveDefaultInputs(): this;
    hasDefault(toolprop: ToolProperty, key?: string): boolean;
    getDefault(toolprop: ToolProperty, key?: string): unknown;
    connect(srctool: ToolOp, srcoutput: string | ((src: ToolOp, dst: ToolOp) => void), dsttool: ToolOp | unknown, dstinput?: string | unknown, srcprops?: string, dstprops?: string): this;
    connectCB(srctool: ToolOp, dsttool: ToolOp, callback: (src: ToolOp, dst: ToolOp) => void, thisvar: unknown): this;
    add(tool: ToolOpAny): this;
    _do_connections(_tool: ToolOp): void;
    modalStart(ctx: ModalCTX): Promise<unknown>;
    loadDefaults(force?: boolean): this;
    exec(ctx: CTX): void;
    calcUndoMem(_ctx: CTX): number;
    calcMemSize(ctx: CTX): number;
    undoPre(): void;
    undo(ctx: CTX): void;
}
export declare class ToolStack<ContextCls extends ContextLike = ContextLike, ModalContextCls extends ContextCls = ContextCls> extends Array<ToolOp<any, any, ContextCls, ModalContextCls>> {
    static STRUCT: string;
    memLimit: number;
    enforceMemLimit: boolean;
    cur: number;
    ctx: ContextCls;
    modalRunning: number;
    modal_running: boolean;
    toolctx?: ContextCls;
    _undo_branch: ToolOp[] | undefined;
    _stack?: this[0][];
    constructor(ctx: ContextCls);
    get head(): (typeof this)[0] | undefined;
    limitMemory(maxmem?: number, ctx?: ContextCls): number;
    calcMemSize(ctx?: ContextCls): number;
    setRestrictedToolContext(ctx: ContextCls): void;
    reset(ctx?: ContextCls): void;
    /**
     * runs .undo,.redo if toolstack head is same as tool
     *
     * otherwise, .execTool(ctx, tool) is called.
     *
     * @param compareInputs : check if toolstack head has identical input values, defaults to false
     * */
    execOrRedo(ctx: ContextCls, tool: ToolOp<any, any, ContextCls, ModalContextCls>, compareInputs?: boolean): boolean;
    execTool(ctx: ContextCls | ModalContextCls, toolop: this[0] | ToolOpAny, event?: PointerEvent): void;
    toolCancel(ctx: ContextCls, tool: ToolOp): void;
    undo(): void;
    rerun(tool?: this[0]): void;
    redo(): void;
    save(): number[];
    rewind(): this;
    /**cb is a function(ctx), if it returns the value false then playback stops
     promise will still be fulfilled.
  
     onstep is a callback, if it returns a promise that promise will be
     waited on, otherwise execution is queue with window.setTimeout().
     */
    replay(cb?: (ctx: ContextCls) => unknown, onStep?: () => unknown | Promise<unknown>): Promise<unknown>;
    loadSTRUCT(reader: StructReader<this>): void;
    _save(): this;
    /** Remove element at index (Array polyfill) */
    pop_i(idx: number): ToolOp | undefined;
}
export declare function buildToolOpAPI(api: DataAPI, cls: IToolOpConstructor): unknown;
/**
 * Call this to build the tool property cache data binding API.
 *
 * If rootCtxClass is not undefined and insertToolDefaultsIntoContext is true
 * then ".toolDefaults" will be automatically added to rootCtxClass's prototype
 * if necessary.
 */
export declare function buildToolSysAPI(api: DataAPI, registerWithNStructjs?: boolean, rootCtxStruct?: DataStruct, rootCtxClass?: (new (arg: any) => ContextLike) | undefined, insertToolDefaultsIntoContext?: boolean): void;
export {};
//# sourceMappingURL=toolsys.d.ts.map