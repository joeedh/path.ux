/**
 * Maps prop type names to integers.
 * These can be combined into a bitmask.
 **/
export declare const PropTypes: {
    readonly INT: 1;
    readonly STRING: 2;
    readonly BOOL: 4;
    readonly ENUM: 8;
    readonly FLAG: 16;
    readonly FLOAT: 32;
    readonly VEC2: 64;
    readonly VEC3: 128;
    readonly VEC4: 256;
    readonly MATRIX4: 512;
    readonly QUAT: 1024;
    readonly PROPLIST: 4096;
    readonly STRSET: 8192;
    readonly CURVE: 16384;
    readonly FLOAT_ARRAY: 32768;
    readonly REPORT: 65536;
};
export type PropTypes = typeof PropTypes;
export declare const PropSubTypes: Record<string, number>;
export declare const PropFlags: Record<string, number>;
export declare class ToolPropertyIF<TYPE extends number = number> {
    data: unknown;
    type: TYPE;
    subtype: number | undefined;
    apiname: string | undefined;
    uiname: string | undefined;
    description: string | undefined;
    flag: number | undefined;
    icon: number | undefined;
    constructor(type?: TYPE, subtype?: number, apiname?: string, uiname?: string, description?: string, flag?: number, icon?: number);
    equals(b: ToolPropertyIF): boolean;
    copyTo(b: ToolPropertyIF): void;
    copy(): ToolPropertyIF | void;
    _fire(type: string, arg1?: unknown, arg2?: unknown): void;
    on(type: string, cb: Function): void;
    off(type: string, cb: Function): void;
    getValue(): unknown;
    setValue(val: unknown): void;
    setStep(step: number): void;
    setRange(min: number, max: number): void;
    setUnit(unit: string): void;
    setUIRange(min: number, max: number): void;
    setIcon(icon: number): void;
}
export declare class StringPropertyIF extends ToolPropertyIF {
    constructor();
}
export declare class NumPropertyIF extends ToolPropertyIF {
}
export declare class IntPropertyIF extends ToolPropertyIF {
    constructor();
    setRadix(radix: number): void;
}
export declare class FloatPropertyIF extends ToolPropertyIF {
    constructor();
    setDecimalPlaces(n: number): void;
}
export declare class EnumPropertyIF extends ToolPropertyIF {
    values: Record<string, string | number>;
    keys: Record<string | number, string | number>;
    ui_value_names: Record<string, string>;
    iconmap: Record<string, number>;
    constructor(value?: unknown, valid_values?: Record<string, number>);
    addIcons(iconmap: Record<string, number>): void;
}
export declare class FlagPropertyIF extends EnumPropertyIF {
    constructor(valid_values?: Record<string, number> | string[] | string);
}
export declare class Vec2PropertyIF extends ToolPropertyIF {
    constructor(valid_values?: unknown);
}
export declare class Vec3PropertyIF extends ToolPropertyIF {
    constructor(valid_values?: unknown);
}
export declare class Vec4PropertyIF extends ToolPropertyIF {
    constructor(valid_values?: unknown);
}
/**
 * List of other tool props (all of one type)
 */
export declare class ListPropertyIF extends ToolPropertyIF {
    prop: ToolPropertyIF;
    constructor(prop: ToolPropertyIF);
    get length(): number;
    set length(val: number);
    copyTo(b: ToolPropertyIF): void;
    copy(): ToolPropertyIF | void;
    /**
     * clear list
     * */
    clear(): void;
    push(item?: ToolPropertyIF): void;
    [Symbol.iterator](): Iterator<ToolPropertyIF>;
}
export declare class StringSetPropertyIF extends ToolPropertyIF {
    constructor(value?: unknown, definition?: string[]);
    setValue(values: unknown, destructive?: boolean, soft_fail?: boolean): void;
    getValue(): unknown;
    addIcons(iconmap: Record<string, number>): void;
    addUINames(map: Record<string, string>): void;
    addDescriptions(map: Record<string, string>): void;
    copyTo(b: ToolPropertyIF): void;
    copy(): ToolPropertyIF | void;
}
interface CurveData {
    load(json: unknown): void;
}
export declare class Curve1DPropertyIF extends ToolPropertyIF {
    data: CurveData | undefined;
    constructor(curve?: CurveData, uiname?: string);
    getValue(): CurveData | undefined;
    setValue(curve: unknown): void;
    copyTo(b: ToolPropertyIF): void;
}
export {};
//# sourceMappingURL=toolprop_abstract.d.ts.map