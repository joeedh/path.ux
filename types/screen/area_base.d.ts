import type { IContextBase } from "../core/context_base";
import { ClassIdSymbol, IUIBaseConstructor } from "../core/ui_base";
import { EnumProperty } from "../path-controller/toolsys/toolprop";
import type { Area, IAreaDef as IAreaDef } from "./ScreenArea";
export interface IAreaConstructor<CTX extends IContextBase = IContextBase, T extends Area<CTX> = Area<CTX>> extends IUIBaseConstructor<T> {
    new (): T;
    /** internal API type, do not use. */
    [ClassIdSymbol]?: string;
    define(): IAreaDef;
}
export type AreaConstructorParam = any;
export declare const AreaFlags: {
    HIDDEN: number;
    FLOATING: number;
    INDEPENDENT: number;
    NO_SWITCHER: number;
    NO_HEADER_CONTEXT_MENU: number;
    NO_COLLAPSE: number;
};
export declare const areaclasses: {
    [key: string]: IAreaConstructor;
};
export declare function getAreaConstructor<CTX extends IContextBase = IContextBase>(area: Area<CTX>): IAreaConstructor;
export declare function makeAreasEnum(): EnumProperty<string>;
//# sourceMappingURL=area_base.d.ts.map