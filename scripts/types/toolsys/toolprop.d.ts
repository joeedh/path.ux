export as namespace toolprop;

import {Vector2, Vector3, Vector4, Quat, Matrix4} from '../util/vectormath';

declare class ToolProperty<T> {
    copy(): ToolProperty<T>;
    setStep(s: number): ToolProperty<T>;
    copyTo(b: ToolProperty<T>): void;
    setValue(value: T): void;
    getValue(): T;
    static calcRelativeStep(step:number, value:number, logBase: number) : number;
    uiname: string;
    icon: number;

    setIcon(i: number): ToolProperty<T>;
    type: number;
}

declare class FloatProperty extends ToolProperty<number> {

}

declare class IntProperty extends ToolProperty<number> {

}

declare class BoolProperty extends ToolProperty<boolean> {

}

declare class StringProperty extends ToolProperty<string> {

}

declare class Vec2Property extends ToolProperty<Vector2> {

}

declare class Vec3Property extends ToolProperty<Vector3> {

}

declare class Vec4Property extends ToolProperty<Vector4> {

}

declare class EnumProperty extends ToolProperty<number> {

}

declare class FlagProperty extends ToolProperty<number> {

}
