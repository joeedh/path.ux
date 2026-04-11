import * as util from "../util/util.js";
import { Vector2, Vector3, Vector4, Quat, Matrix4 } from "../util/vectormath.js";
import { ToolPropertyIF, PropTypes } from "./toolprop_abstract.js";
import type { StructReader } from "../util/nstructjs_es6.js";
import type { JSONAny } from "../controller.js";
declare global {
    interface SymbolConstructor {
        readonly dispose: symbol;
    }
}
export type EnumDef = Record<string, number | string>;
export type FlagsDef = Record<string, number>;
export type IconMap = Record<string, number>;
export type DescriptionMap = Record<string, string>;
export type UINameMap = Record<string, string>;
export { PropTypes, PropFlags } from "./toolprop_abstract.js";
export type NumberConstraintBase = "range" | "expRate" | "step" | "uiRange" | "displayUnit" | "baseUnit" | "stepIsRelative" | "slideSpeed" | "sliderDisplayExp";
export type IntegerConstraint = NumberConstraintBase | "radix";
export type FloatConstraint = NumberConstraintBase | "decimalPlaces";
export type NumberConstraint = IntegerConstraint | FloatConstraint;
export declare const NumberConstraintsBase: Set<NumberConstraintBase>;
export declare const IntegerConstraints: Set<IntegerConstraint>;
export declare const FloatConstrinats: Set<FloatConstraint>;
export declare const NumberConstraints: Set<NumberConstraint>;
export declare const PropSubTypes: Record<string, number>;
type CallbackFn = (this: ToolProperty<unknown>, arg1?: unknown, arg2?: unknown) => void;
type UtilStringSet = util.set<any>;
export declare function setPropTypes(types: Record<string, number>): void;
export declare const customPropertyTypes: ToolPropertyConstructor[];
export declare const PropClasses: Record<number, ToolPropertyConstructor>;
export declare const MakeUINameWordMap: Record<string, string>;
export declare var defaultRadix: number;
export declare var defaultDecimalPlaces: number;
declare class OnceTag {
    cb: CallbackFn;
    constructor(cb: CallbackFn);
}
interface ToolPropertyConstructor {
    PROP_TYPE_ID?: number;
}
interface DataAPIExecScope {
    ctx?: unknown;
    dataref?: unknown;
    datapath?: string;
}
declare class ExecScopeUsing {
    private oldScope;
    private prop?;
    init(prop: DataAPIExecScope): this;
    get ctx(): unknown;
    set ctx(v: unknown);
    get dataref(): unknown;
    set dataref(v: unknown);
    get datapath(): string | undefined;
    set datapath(v: string | undefined);
    [Symbol.dispose](): void;
}
export declare class ToolProperty<T = unknown, TYPE extends number = number> extends ToolPropertyIF<TYPE> implements DataAPIExecScope {
    static STRUCT: string;
    static PROP_TYPE_ID: number;
    data: T;
    subtype: number | undefined;
    wasSet: boolean;
    apiname: string | undefined;
    uiname: string | undefined;
    description: string | undefined;
    flag: number;
    icon: number;
    icon2: number;
    decimalPlaces: number;
    radix: number;
    step: number;
    range: [number, number] | undefined;
    uiRange: [number, number] | undefined;
    baseUnit: string | undefined;
    displayUnit: string | undefined;
    stepIsRelative: boolean;
    expRate: number;
    slideSpeed: number;
    callbacks: Record<string, (CallbackFn | OnceTag)[]>;
    update?: Function;
    api_update?: Function;
    ctx?: unknown;
    dataref?: unknown;
    datapath?: string;
    constructor(type?: TYPE, subtype?: number, apiname?: string, uiname?: string, description?: string, flag?: number, icon?: number);
    /** Get a data api execution context stack ( for use with the using keyword) */
    execWithContext(): ExecScopeUsing;
    static internalRegister(cls: any): void;
    static getClass(type: number): ToolPropertyConstructor;
    static setDefaultRadix(n: number): void;
    static setDefaultDecimalPlaces(n: number): void;
    static makeUIName(name: string): string;
    static register(cls: any): number;
    static calcRelativeStep(step: number, value: number, logBase?: number): number;
    setDescription(s: string): this;
    setUIName(s: string): this;
    calcMemSize(): number;
    equals(b: this): boolean;
    private(): this;
    /** Save property in last value cache.  Now set by default,
     *  to disable use .ignoreLastValue().
     */
    saveLastValue(): this;
    ignoreLastValue(): this;
    report(...args: unknown[]): void;
    _fire(type: string, arg1?: unknown, arg2?: unknown): this;
    clearEventCallbacks(): this;
    once(type: string, cb: CallbackFn): this;
    on(type: string, cb: CallbackFn): this;
    off(type: string, cb: CallbackFn): this;
    toJSON(): JSONAny;
    loadJSON(obj: Record<string, unknown>): this;
    getValue(): T;
    setValue(val?: T): void;
    copyTo(b: this): void;
    copy(): this;
    setStep(step: number): this;
    getStep(value?: number): number;
    setRelativeStep(step: number): this;
    setRange(min: number, max: number): this;
    noUnits(): this;
    setBaseUnit(unit: string): this;
    setDisplayUnit(unit: string): this;
    setUnit(unit: string): this;
    setFlag(f: number, combine?: boolean): this;
    setUIRange(min: number, max: number): this;
    setIcon(icon: number): this;
    setIcon2(icon: number): this;
    loadSTRUCT(reader: StructReader<this>): void;
}
export declare class FloatArrayProperty extends ToolProperty<number[], PropTypes["FLOAT_ARRAY"]> {
    static PROP_TYPE_ID: 32768;
    static STRUCT: string;
    value: number[];
    constructor(value?: Iterable<number | boolean>, apiname?: string, uiname?: string, description?: string, flag?: number, icon?: number);
    [Symbol.iterator](): IterableIterator<number>;
    setValue(value?: Iterable<number | boolean>): void;
    push(item: number | boolean): void;
    getValue(): number[];
    clear(): this;
}
export declare class StringPropertyBase<TYPE extends number> extends ToolProperty<string, TYPE> {
    static STRUCT: string;
    multiLine: boolean;
    constructor(type?: TYPE, value?: string, apiname?: string, uiname?: string, description?: string, flag?: number, icon?: number);
    calcMemSize(): number;
    equals(b: this): boolean;
    copyTo(b: this): void;
    getValue(): string;
    setValue(val: string): void;
}
export declare class StringProperty extends StringPropertyBase<PropTypes["STRING"]> {
    static PROP_TYPE_ID: 2;
    static STRUCT: string;
    constructor(value?: string, apiname?: string, uiname?: string, description?: string, flag?: number, icon?: number);
}
export { isNumber } from "../../core/units.js";
export declare class NumProperty<TYPE extends number = number> extends ToolProperty<number, TYPE> {
    static STRUCT: string;
    range: [number, number];
    constructor(type?: TYPE, value?: number, apiname?: string, uiname?: string, description?: string, flag?: number, icon?: number);
    equals(b: this): boolean;
    loadSTRUCT(reader: StructReader<this>): void;
}
export declare class _NumberPropertyBase<T = number, TYPE extends number = number> extends ToolProperty<T, TYPE> {
    static STRUCT: string;
    /** Display simple sliders with exponent divisions, don't
     * confuse with expRate which affects roller
     * slider speed.
     */
    sliderDisplayExp: number;
    /** controls roller slider rate */
    slideSpeed: number;
    /** exponential rate, used by roller sliders */
    expRate: number;
    step: number;
    stepIsRelative: boolean;
    range: [number, number];
    uiRange: [number, number] | undefined;
    constructor(type?: TYPE, value?: number | null, apiname?: string, uiname?: string, description?: string, flag?: number, icon?: number);
    get ui_range(): [number, number] | undefined;
    set ui_range(val: [number, number] | undefined);
    calcMemSize(): number;
    equals(b: this): boolean;
    toJSON(): JSONAny;
    copyTo(b: this): void;
    setSliderDisplayExp(f: number): this;
    setSlideSpeed(f: number): this;
    setExpRate(exp: number): this;
    setValue(val?: T | number | null): void;
    loadJSON(obj: Record<string, unknown>): this;
}
export declare class IntProperty extends _NumberPropertyBase<number, PropTypes["INT"]> {
    static PROP_TYPE_ID: 1;
    static STRUCT: string;
    radix: number;
    constructor(value?: number, apiname?: string, uiname?: string, description?: string, flag?: number, icon?: number);
    setValue(val?: number | null): void;
    setRadix(radix: number): void;
    toJSON(): JSONAny;
    loadJSON(obj: Record<string, unknown>): this;
    loadSTRUCT(reader: StructReader<this>): void;
}
export declare class ReportProperty extends StringPropertyBase<PropTypes["REPORT"]> {
    static PROP_TYPE_ID: 65536;
    static STRUCT: string;
    constructor(value?: string, apiname?: string, uiname?: string, description?: string, flag?: number, icon?: number);
}
export declare class BoolProperty extends ToolProperty<boolean, PropTypes["BOOL"]> {
    static PROP_TYPE_ID: 4;
    static STRUCT: string;
    constructor(value?: boolean | unknown, apiname?: string, uiname?: string, description?: string, flag?: number, icon?: number);
    equals(b: this): boolean;
    copyTo(b: this): void;
    setValue(val?: boolean): void;
    getValue(): boolean;
    toJSON(): JSONAny;
    loadJSON(obj: Record<string, unknown>): this;
}
declare class FloatPropertyBase<T = number, TYPE extends number = number> extends _NumberPropertyBase<T, TYPE> {
    static STRUCT: string;
    constructor(type?: TYPE, value?: number | null, apiname?: string, uiname?: string, description?: string, flag?: number, icon?: number);
    setDecimalPlaces(n: number): this;
    copyTo(b: this): void;
    setValue(val?: T | number | null): void;
    toJSON(): JSONAny;
    loadJSON(obj: Record<string, unknown>): this;
    loadSTRUCT(reader: StructReader<this>): void;
}
export declare class FloatProperty extends FloatPropertyBase<number, PropTypes["FLOAT"]> {
    static PROP_TYPE_ID: 32;
    static STRUCT: string;
    constructor(value?: number | null, apiname?: string, uiname?: string, description?: string, flag?: number, icon?: number);
}
export declare class EnumKeyPair {
    static loadMap<KEY extends string | number, //
    VALUE extends string | number>(obj: EnumKeyPair[] | undefined): Record<KEY, VALUE>;
    static saveMap(obj: Record<string, string | number> | undefined): EnumKeyPair[];
    static STRUCT: string;
    key: string | number;
    val: string | number;
    key_is_int: boolean;
    val_is_int: boolean;
    constructor(key?: string | number | boolean, val?: string | number | boolean);
    loadSTRUCT(reader: StructReader<this>): void;
}
export declare class EnumPropertyBase<TYPE extends number, VALUE extends string | number> extends ToolProperty<VALUE, TYPE> {
    static STRUCT: string;
    dynamicMetaCB: Function | undefined;
    /** Maps keys to values */
    values: {
        [k: string | number]: VALUE;
    };
    /** Maps values to keys */
    keys: Record<VALUE, string | number>;
    /** Maps keys to UI strings */
    ui_value_names: {
        [k: string]: string;
    };
    /** Maps keys to descriptions */
    descriptions: {
        [k: string]: string;
    };
    /** Maps keys to icons */
    iconmap: {
        [k: string]: number;
    };
    /** Maps keys to pressed icons */
    iconmap2: {
        [k: string]: number;
    };
    _keys?: EnumKeyPair[];
    _values?: EnumKeyPair[];
    _ui_value_names?: EnumKeyPair[];
    _iconmap?: EnumKeyPair[];
    _iconmap2?: EnumKeyPair[];
    _descriptions?: EnumKeyPair[];
    data_is_int?: boolean;
    constructor(type?: TYPE, string_or_int?: string | number, valid_values?: Record<string, VALUE> | string[] | EnumPropertyBase<TYPE, VALUE>, apiname?: string, uiname?: string, description?: string, flag?: number, icon?: number);
    /**
     * Provide a callback to update the enum or flags property dynamically
     * Callback should call enumProp.updateDefinition to update the property.
     *
     * @param metaCB: (enumProp: EnumProperty|FlagsProperty) => void
     */
    dynamicMeta(metaCB: CallbackFn): this;
    checkMeta(): void;
    calcHash(digest?: util.HashDigest): number;
    updateDefinition(enumdef_or_prop: EnumPropertyBase<TYPE, string | number> | Record<string, number | string>): this;
    calcMemSize(): number;
    equals(b: this): boolean;
    addUINames(map: UINameMap): this;
    addDescriptions(map: DescriptionMap): this;
    addIcons2(iconmap2: IconMap): this;
    addIcons(iconmap: IconMap): this;
    copyTo(b: this): void;
    copy(): this;
    getValue(): VALUE;
    setValue(val?: VALUE): void;
    _saveMap: typeof EnumKeyPair.saveMap;
    loadSTRUCT(reader: StructReader<this>): void;
    _is_data_int(): boolean;
}
export declare class EnumProperty<VALUE extends string | number = string | number>//
 extends EnumPropertyBase<PropTypes["ENUM"], VALUE> {
    static PROP_TYPE_ID: 8;
    static STRUCT: string;
    constructor(string_or_int?: string | number, valid_values?: Record<string, VALUE> | string[] | EnumPropertyBase<PropTypes["ENUM"], VALUE>, apiname?: string, uiname?: string, description?: string, flag?: number, icon?: number);
}
export declare class FlagProperty extends EnumPropertyBase<PropTypes["FLAG"], number> {
    static PROP_TYPE_ID: 16;
    static STRUCT: string;
    constructor(string_or_int?: string | number, valid_values?: Record<string, number> | string[] | EnumPropertyBase<PropTypes["FLAG"], number>, apiname?: string, uiname?: string, description?: string, flag?: number, icon?: number);
    setValue(bitmask?: string | number): void;
}
export declare class VecPropertyBase<T extends Vector2 | Vector3 | Vector4 | Quat, TYPE extends number> extends FloatPropertyBase<T, TYPE> {
    static STRUCT: string;
    hasUniformSlider: boolean;
    descriptions?: {
        [k: number]: string;
    };
    icons?: {
        [k: number]: number;
    };
    constructor(type?: TYPE, data?: unknown, apiname?: string, uiname?: string, description?: string);
    setIsColor(): this;
    calcMemSize(): number;
    equals(b: this): boolean;
    uniformSlider(state?: boolean): this;
    copyTo(b: this): void;
    addIcons(iconmap: {
        [k: number]: number;
    }): this;
    addDescriptions(descmap: {
        [k: number]: string;
    }): this;
    _saveMap: typeof EnumKeyPair.saveMap;
    loadSTRUCT(reader: StructReader<this>): void;
}
export declare class Vec2Property extends VecPropertyBase<Vector2, PropTypes["VEC2"]> {
    static PROP_TYPE_ID: 64;
    static STRUCT: string;
    constructor(data?: unknown, apiname?: string, uiname?: string, description?: string);
    setValue(v?: unknown): void;
    getValue(): Vector2;
    copyTo(b: this): void;
}
export declare class Vec3Property extends VecPropertyBase<Vector3, PropTypes["VEC3"]> {
    static PROP_TYPE_ID: 128;
    static STRUCT: string;
    constructor(data?: unknown, apiname?: string, uiname?: string, description?: string);
    isColor(): this;
    setValue(v?: unknown): void;
    getValue(): Vector3;
}
export declare class Vec4Property extends VecPropertyBase<Vector4, PropTypes["VEC4"]> {
    static PROP_TYPE_ID: 256;
    static STRUCT: string;
    constructor(data?: unknown, apiname?: string, uiname?: string, description?: string);
    setValue(v?: unknown, w?: number): void;
    isColor(): this;
    getValue(): Vector4;
    copyTo(b: this): void;
}
export declare class QuatProperty extends ToolProperty<Quat, PropTypes["QUAT"]> {
    static PROP_TYPE_ID: 1024;
    static STRUCT: string;
    constructor(data?: unknown, apiname?: string, uiname?: string, description?: string);
    equals(b: this): boolean;
    setValue(v?: Quat): void;
    getValue(): Quat;
    copyTo(b: this): void;
}
export declare class Mat4Property extends ToolProperty<Matrix4, PropTypes["MATRIX4"]> {
    static PROP_TYPE_ID: 512;
    static STRUCT: string;
    constructor(data?: unknown, apiname?: string, uiname?: string, description?: string);
    calcMemSize(): number;
    equals(b: this): boolean;
    setValue(v?: Matrix4): void;
    getValue(): Matrix4;
    copyTo(b: this): void;
    loadSTRUCT(reader: StructReader<this>): void;
}
/**
 * List of other tool props (all of one type)
 */
export declare class ListProperty<ToolPropType extends ToolProperty = ToolProperty>//
 extends ToolProperty<ToolPropType[], PropTypes["PROPLIST"]> {
    static PROP_TYPE_ID: 4096;
    static STRUCT: string;
    prop: ToolPropType;
    value: ToolPropType[];
    constructor(prop?: ToolProperty<unknown> | number | ToolPropertyConstructor, list?: unknown[], uiname?: string);
    get length(): number;
    set length(val: number);
    splice(i: number, deleteCount: number, ...newItems: ToolPropType[]): ToolPropType[];
    calcMemSize(): number;
    equals(b: this): boolean;
    copyTo(b: this): void;
    copy(): this;
    push(item?: ToolPropType | unknown): ToolPropType;
    clear(): this;
    getListItem(i: number): unknown;
    setListItem(i: number, val: unknown): void;
    setValue(value?: Iterable<unknown>): void;
    getValue(): ToolPropType[];
    [Symbol.iterator](): IterableIterator<ReturnType<ToolPropType["getValue"]>>;
}
export declare class StringSetProperty extends ToolProperty<UtilStringSet, PropTypes["STRSET"]> {
    static STRUCT: string;
    static PROP_TYPE_ID: 8192;
    value: UtilStringSet;
    values: Record<string, string>;
    ui_value_names: UINameMap;
    descriptions: DescriptionMap;
    iconmap: IconMap;
    iconmap2: IconMap;
    constructor(value?: string | Iterable<string> | Record<string, string> | null, definition?: string[] | UtilStringSet | Set<string> | Record<string, string> | string);
    calcMemSize(): number;
    equals(b: this): boolean;
    setValue(values?: string | Iterable<string> | Record<string, string> | null, destructive?: boolean, soft_fail?: boolean): void;
    getValue(): UtilStringSet;
    addIcons2(iconmap2: Record<string, number> | undefined): this;
    addIcons(iconmap: Record<string, number> | undefined): this;
    addUINames(map: Record<string, string>): this;
    addDescriptions(map: Record<string, string>): this;
    copyTo(b: this): void;
    loadSTRUCT(reader: StructReader<this>): void;
}
//# sourceMappingURL=toolprop.d.ts.map