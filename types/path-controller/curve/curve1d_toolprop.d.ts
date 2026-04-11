import { Curve1D } from "./curve1d.js";
import { ToolProperty, PropTypes } from "../toolsys/toolprop.js";
import "./curve1d_all.js";
export declare class Curve1DProperty extends ToolProperty<Curve1D, PropTypes["CURVE"]> {
    static PROP_TYPE_ID: 16384;
    static STRUCT: string;
    data: Curve1D;
    constructor(curve?: Curve1D, apiname?: string, uiname?: string, description?: string, flag?: number, icon?: number);
    calcMemSize(): number;
    equals(_b: ToolProperty): boolean;
    getValue(): Curve1D;
    evaluate(t: number): number;
    setValue(curve: Curve1D | undefined): void;
    copyTo(b: this): void;
}
//# sourceMappingURL=curve1d_toolprop.d.ts.map