import { ToolOp, type PropertySlots } from "../path-controller/toolsys/toolsys.js";
import { BoolProperty } from "../path-controller/toolsys/toolprop.js";
export declare class SimpleAppNewOp extends ToolOp<PropertySlots, PropertySlots> {
    static tooldef(): {
        uiname: string;
        toolpath: string;
        inputs: {};
        undoflag: number;
    };
    exec(_ctx: unknown): void;
}
export declare class SimpleAppSaveOp extends ToolOp<{
    forceDialog: BoolProperty;
}, PropertySlots> {
    static tooldef(): {
        uiname: string;
        toolpath: string;
        inputs: {
            forceDialog: BoolProperty;
        };
        undoflag: number;
    };
    exec(_ctx: unknown): void;
}
export declare class SimpleAppOpenOp extends ToolOp<{
    forceDialog: BoolProperty;
}, PropertySlots> {
    static tooldef(): {
        uiname: string;
        toolpath: string;
        inputs: {
            forceDialog: BoolProperty;
        };
        undoflag: number;
    };
    exec(ctx: unknown): void;
}
export declare function register(): void;
//# sourceMappingURL=app_ops.d.ts.map