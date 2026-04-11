import { Quat, Vector2, Vector3, Vector4 } from "../util/vectormath.js";
import { ToolProperty } from "../toolsys/toolprop.js";
import type { DataStruct } from "./controller.js";
import type { ContextLike, ModelInterface } from "./controller_abstract.js";
import { ToolPropertyTypes } from "../toolsys/allprops.js";
declare global {
    interface PathUXDebug {
        datapaths?: boolean;
    }
}
export declare const DataFlags: {
    readonly READ_ONLY: 1;
    readonly USE_CUSTOM_GETSET: 2;
    readonly USE_FULL_UNDO: 4;
    readonly USE_CUSTOM_PROP_GETTER: 8;
    readonly USE_EVAL_MASS_SET_PATHS: 16;
};
export declare const DataTypes: {
    readonly STRUCT: 0;
    readonly DYNAMIC_STRUCT: 1;
    readonly PROP: 2;
    readonly ARRAY: 3;
};
type DataTypeValue = (typeof DataTypes)[keyof typeof DataTypes];
/**
 * Extended ToolProperty interface covering methods on various subclasses
 * (FloatProperty, EnumProperty, VecProperty, etc.) that DataPath uses
 * via its fluent builder pattern. These methods exist at runtime but live
 * on subclasses rather than the ToolProperty base class.
 */
export interface DataPathToolProperty extends ToolProperty {
    flag: number;
    uiname: string;
    description: string;
    setDecimalPlaces(n: number): this;
    setSliderDisplayExp(f: number): this;
    setExpRate(exp: number): this;
    setSlideSpeed(f: number): this;
    uniformSlider(state: boolean): this;
    setRadix(radix: number): this;
    addIcons(iconmap: Record<string, number>): void;
    addIcons2(iconmap: Record<string, number>): void;
    addDescriptions(map: Record<string, string>): void;
    addUINames(map: Record<string, string>): void;
    dynamicMeta(metaCB: (prop: ToolProperty) => void): this;
    _getValue?: () => unknown;
    _setValue?: (val: unknown) => void;
}
export declare function getTempProp<P extends ToolProperty | ToolPropertyTypes>(type: number): P;
export declare class DataPathError extends Error {
}
export declare function getVecClass(proptype: number): typeof Vector2 | typeof Vector3 | typeof Vector4 | typeof Quat;
interface DataPathGetSet {
    get: ((this: ToolProperty) => unknown) | undefined;
    set: ((this: ToolProperty, val: unknown) => void) | undefined;
    dataref: unknown;
    datapath: string | undefined;
    ctx: unknown;
}
export declare class DataPath<CTX extends ContextLike = ContextLike> {
    type: DataTypeValue;
    data: DataPathToolProperty | DataList | DataStruct<CTX>;
    apiname: string;
    path: string;
    flag: number;
    struct: unknown;
    parent?: unknown;
    propGetter?: (prop: ToolProperty) => void;
    getSet?: DataPathGetSet;
    ui_name_get?: (this: ToolProperty) => string;
    constructor(path?: string, apiname?: string, prop?: ToolProperty | DataList, type?: DataTypeValue);
    /**
     * Provide a callback to update an enum or flags property dynamically
     * Callback should call enumProp.updateDefinition to update the property.
     *
     * @param metaCB: (enumProp: EnumProperty|FlagsProperty) => void
     */
    dynamicMeta(metaCB: (prop: ToolProperty) => void): this;
    evalMassSetFilter(): this;
    copy(): DataPath;
    /** this property should not be treated as something
     *  that should be kept track off in the undo stack*/
    noUndo(): this;
    setProp(prop: ToolProperty): void;
    readOnly(): this;
    read_only(): this;
    /** used to override tool property settings,
     *  e.g. ranges, units, etc; returns a
     *  base class instance of ToolProperty.
     *
     *  The this context points to the original ToolProperty and contains
     *  a few useful references:
     *
     *  this.dataref - an object instance of this struct type
     *  this.ctx - a context
     *
     *  callback takes one argument, a new (freshly copied of original)
     *  tool property to modify
     *
     * */
    customPropCallback(callback: (prop: ToolProperty) => void): this;
    /**
     *
     * For the callbacks 'this' points to an internal ToolProperty;
     * Referencing object lives in 'this.dataref'; calling context in 'this.ctx';
     * and the datapath is 'this.datapath'
     **/
    customGetSet<DATAREF = unknown>(get: ((this: ToolProperty & {
        dataref: DATAREF;
    }) => unknown) | undefined, set: ((this: ToolProperty & {
        dataref: DATAREF;
    }, val: unknown) => void) | undefined): this;
    customSet(set: ((this: ToolProperty, val: unknown) => void) | undefined): this;
    customGet(get: ((this: ToolProperty) => unknown) | undefined): this;
    /**db will be executed with underlying data object
     that contains this path in 'this.dataref'
  
     main event is 'change'
     */
    on(type: string, cb: (...args: unknown[]) => void): this;
    off(type: string, cb: (...args: unknown[]) => void): void;
    simpleSlider(): this;
    rollerSlider(): this;
    checkStrip(state?: boolean): this;
    noUnits(): this;
    baseUnit(unit: string): this;
    displayUnit(unit: string): this;
    unit(unit: string): this;
    editAsBaseUnit(): this;
    range(min: number, max: number): this;
    uiRange(min: number, max: number): this;
    decimalPlaces(n: number): this;
    sliderDisplayExp(f: number): this;
    /**
     * like other callbacks (until I refactor it),
     * func will be called with a mysterious object that stores
     * the following properties:
     *
     * this.dataref  : owning object reference
     * this.datactx  : ctx
     * this.datapath : datapath
     * */
    uiNameGetter(func: (this: ToolProperty) => string): this;
    expRate(exp: number): this;
    slideSpeed(speed: number): this;
    /**adds a slider for moving vector component sliders simultaneously*/
    uniformSlider(state?: boolean): this;
    radix(r: number): this;
    relativeStep(s: number): this;
    step(s: number): this;
    /**
     *
     * Tell DataPathSetOp to save/load entire app state for undo/redo
     *
     * */
    fullSaveUndo(): this;
    icon(i: number): this;
    icon2(i: number): this;
    icons(icons: Record<string, number>): this;
    /** secondary icons (e.g. disabled states) */
    icons2(icons: Record<string, number>): this;
    descriptions(description_map: Record<string, string>): this;
    uiNames(uinames: Record<string, string>): this;
    description(d: string): this;
}
export declare const StructFlags: {
    readonly NO_UNDO: 1;
};
export interface ListIFace<DataAPIType extends ModelInterface = ModelInterface, ListType = any, KeyType = any, ValType = any, CTX extends ContextLike = ContextLike> {
    getStruct(api: DataAPIType, list: ListType, key: KeyType): DataStruct | undefined;
    get(api: DataAPIType, list: ListType, key: KeyType): ValType;
    getKey(api: DataAPIType, list: ListType, obj: ValType): any;
    getActive?(api: DataAPIType, list: ListType): ValType | undefined;
    setActive?(api: DataAPIType, list: ListType, val: ValType): void;
    set?(api: DataAPIType, list: ListType, key: KeyType, val: ValType): void;
    getIter?(api: DataAPIType, list: ListType): Iterable<ValType>;
    filter?(api: DataAPIType, list: ListType, filter: number | string): Iterable<ValType>;
    getLength(api: DataAPIType, list: ListType): number;
}
export type ListFuncs<DataAPIType extends ModelInterface = ModelInterface, ListType = any, KeyType = any, ObjType = any, CTX extends ContextLike = ContextLike> = (Required<ListIFace<DataAPIType, ListType, KeyType, ObjType, CTX>>[keyof ListIFace] | ((api: ModelInterface<CTX>, list: ListType, key: KeyType, val: ObjType) => void))[];
type ListCallback = (...args: any[]) => any;
type ListCallbackMap = Record<string, ListCallback>;
export declare class DataList<DataAPIType extends ModelInterface = ModelInterface, ListType = any, KeyType = any, ValType = any, CTX extends ContextLike = ContextLike> implements ListIFace<DataAPIType, ListType, KeyType, ValType, CTX> {
    cb: ListCallbackMap;
    constructor(callbacks: any);
    /**
     Generic list API.
  
     * Callbacks is an array of name functions, like so:
     - function getStruct(api, list, key) //return DataStruct type of object in key, key is optional if omitted return base type of all objects?
     - function get(api, list, key)
     - function set(api, list, key, val) //this one has default behavior: list[key] = val
     - function getLength(api, list)
     - function getActive(api, list)
     - function setActive(api, list, key)
     - function getIter(api, list)
     - function getKey(api, list, object) returns object's key in this list, either a string or a number
     * */
    copy(): DataList;
    get(api: DataAPIType, list: ListType, key: KeyType): ValType;
    getLength(api: DataAPIType, list: ListType): number;
    _check(cb: string): void;
    set(api: DataAPIType, list: ListType, key: KeyType, val: ValType): void;
    getIter(api: DataAPIType, list: ListType): Iterable<ValType>;
    filter(api: DataAPIType, list: ListType, filter: number | string): Iterable<ValType>;
    getActive(api: DataAPIType, list: ListType): ValType | undefined;
    setActive(api: DataAPIType, list: ListType, value: ValType): void;
    getKey(api: DataAPIType, list: ListType, value: ValType): string | number | undefined;
    getStruct(api: DataAPIType, list: ListType, key: KeyType): DataStruct | undefined;
}
interface ToolDefResult {
    uiname: string;
    icon: number;
    toolpath: string;
    description: string | undefined;
    is_modal: boolean;
    inputs: Record<string, ToolProperty>;
    outputs: Record<string, ToolProperty>;
}
export declare class ToolOpIface {
    constructor();
    static tooldef(): ToolDefResult;
}
interface DataAPIClassLike {
    registerTool(cls: Function): void;
}
export declare function setImplementationClass(cls: DataAPIClassLike): void;
export declare function registerTool(cls: Function): void;
export {};
//# sourceMappingURL=controller_base.d.ts.map