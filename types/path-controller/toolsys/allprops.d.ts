export type VecPropertyTypes = Vec2Property | Vec3Property | Vec4Property;
export type StringPropertyTypes = StringProperty | ReportProperty;
export type NumPropertyTypes = IntProperty | FloatProperty;
export declare function isNumProperty(p?: ToolProperty): p is NumPropertyTypes;
import { Curve1DProperty } from "../controller";
import { BoolProperty, EnumProperty, FlagProperty, FloatProperty, IntProperty, ListProperty, Mat4Property, QuatProperty, ReportProperty, StringProperty, StringSetProperty, ToolProperty, Vec2Property, Vec3Property, Vec4Property } from "./toolprop";
export declare function isVecProperty(prop: unknown): prop is VecPropertyTypes;
export type ToolPropertyTypes = StringProperty | IntProperty | FloatProperty | BoolProperty | EnumProperty | FlagProperty | Vec2Property | Vec3Property | Vec4Property | QuatProperty | Mat4Property | ListProperty | StringSetProperty | ReportProperty | Curve1DProperty;
//# sourceMappingURL=allprops.d.ts.map