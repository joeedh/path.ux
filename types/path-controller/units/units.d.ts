/**
 * Unit system.
 *
 * Provides an API to convert units,
 * e.g. `convert(0.5, "foot", "meter")`
 *
 * Path.ux widgets typically have `baseUnit`
 * and `displayUnit` properties. `baseUnit`
 * is the unit of the real stored value,
 * while `displayUnit` is what he user sees
 * and edits.
 *
 * Units:
 * # none           No unit
 * # meter          Meter       (distance)
 * # inch           Inch        (distance)
 * # foot           Foot        (distance)
 * # square_foot    Square Feet (area)
 * # mile           Mile        (distance)
 * # degree         Degrees     (angle)
 * # radian         Radians     (angle)
 * # pixel          Pixel       (distance)
 * # percent        Percent
 *
 */
export interface UnitDefinition {
    name: string;
    uiname: string;
    type: string;
    icon: number;
    pattern: RegExp | undefined;
}
export interface UnitClass {
    unitDefine(): UnitDefinition;
    parse(s: string): number;
    validate(s: string): boolean;
    toInternal(value: number): number;
    fromInternal(value: number): number;
    buildString(value: number, decimals?: number): string;
}
export declare const Units: UnitClass[];
export declare class Unit {
    static baseUnit: string;
    static isMetric: boolean;
    static getUnit(name: string | undefined): UnitClass | undefined;
    static register(cls: UnitClass): void;
    static unitDefine(): UnitDefinition;
    static parse(string: string): number;
    static validate(string: string): boolean;
    static toInternal(value: number): number;
    static fromInternal(value: number): number;
    static buildString(value: number, decimals?: number): string;
}
export declare class MeterUnit extends Unit {
    static unitDefine(): UnitDefinition;
    static parse(string: string): number;
    static toInternal(value: number): number;
    static fromInternal(value: number): number;
    static buildString(value: number, decimals?: number): string;
}
export declare class InchUnit extends Unit {
    static unitDefine(): UnitDefinition;
    static parse(string: string): number;
    static toInternal(value: number): number;
    static fromInternal(value: number): number;
    static buildString(value: number, decimals?: number): string;
}
export declare class FootUnit extends Unit {
    static unitDefine(): UnitDefinition;
    static parse(string: string): number;
    static toInternal(value: number): number;
    static fromInternal(value: number): number;
    static buildString(value: number, decimals?: number): string;
}
export declare class SquareFootUnit extends FootUnit {
    static unitDefine(): UnitDefinition;
    static parse(string: string): number;
    static buildString(value: number, decimals?: number): string;
}
export declare class MileUnit extends Unit {
    static unitDefine(): UnitDefinition;
    static parse(string: string): number;
    static toInternal(value: number): number;
    static fromInternal(value: number): number;
    static buildString(value: number, decimals?: number): string;
}
export declare class DegreeUnit extends Unit {
    static unitDefine(): UnitDefinition;
    static parse(string: string): number;
    static toInternal(value: number): number;
    static fromInternal(value: number): number;
    static buildString(value: number, decimals?: number): string;
}
export declare class RadianUnit extends Unit {
    static unitDefine(): UnitDefinition;
    static parse(string: string): number;
    static toInternal(value: number): number;
    static fromInternal(value: number): number;
    static buildString(value: number, decimals?: number): string;
}
export declare function setBaseUnit(unit: string): void;
export declare function setMetric(val: boolean): void;
export declare function parseValueIntern(string: string, baseUnit?: string | UnitClass | undefined): number;
export declare function parseValue(string: string, baseUnit?: string | undefined, displayUnit?: string | undefined): number;
export declare function isNumber(string: string): boolean;
export declare class PixelUnit extends Unit {
    static unitDefine(): UnitDefinition;
    static parse(string: string): number;
    static toInternal(value: number): number;
    static fromInternal(value: number): number;
    static buildString(value: number, decimals?: number): string;
}
export declare class PercentUnit extends Unit {
    static unitDefine(): UnitDefinition;
    static toInternal(value: number): number;
    static fromInternal(value: number): number;
    static parse(string: string): number;
    static buildString(value: number, decimals?: number): string;
}
export declare function convert(value: number, unita: string | UnitClass | undefined, unitb: string | UnitClass | undefined): number;
/**
 *
 * @param value Value (note: is not converted to internal unit)
 * @param unit: Unit to use, should be a string referencing unit type, see unitDefine().name
 * @returns {*}
 */
export declare function buildString(value: number, baseUnit?: string | UnitClass | undefined, decimalPlaces?: number, displayUnit?: string | UnitClass | undefined): string;
//# sourceMappingURL=units.d.ts.map