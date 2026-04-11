import { ToolOp } from "../toolsys/toolsys.js";
import type { ToolProperty } from "../toolsys/toolprop.js";
import { BoolProperty, IntProperty, EnumProperty, StringProperty } from "../toolsys/toolprop.js";
import { ContextLike } from "./controller_abstract.js";
type DataPathSetInputs = {
    dataPath: StringProperty;
    massSetPath: StringProperty;
    fullSaveUndo: BoolProperty;
    flagBit: IntProperty;
    useFlagBit: BoolProperty;
    destType: EnumProperty;
    prop: ToolProperty;
    [k: string]: ToolProperty;
};
export declare class DataPathSetOp<CTX extends ContextLike = ContextLike> extends ToolOp<DataPathSetInputs, {}, CTX> {
    propType: number;
    _undo: Record<string, unknown> | undefined;
    hadError: boolean;
    id: unknown;
    __ctx?: CTX;
    constructor();
    setValue(ctx: CTX, val: unknown, object: unknown): void;
    static create<CTX extends ContextLike>(ctx: CTX, datapath: string, value: unknown, id: unknown, massSetPath?: string): DataPathSetOp<CTX> | undefined;
    hash(massSetPath: string | undefined | null, dataPath: string, prop: unknown, id: unknown): string;
    hashThis(): string;
    undoPre(ctx: CTX): void;
    undo(ctx: CTX): void;
    exec(ctx: CTX): void;
    modalStart(ctx: CTX): Promise<unknown>;
    static tooldef(): {
        uiname: string;
        toolpath: string;
        icon: number;
        flag: number;
        is_modal: boolean;
        inputs: {
            dataPath: StringProperty;
            massSetPath: StringProperty;
            fullSaveUndo: BoolProperty;
            flagBit: IntProperty;
            useFlagBit: BoolProperty;
            destType: EnumProperty<1 | 2 | 4 | 8 | 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 4096 | 8192 | 16384 | 32768 | 65536>;
        };
    };
}
export {};
//# sourceMappingURL=controller_ops.d.ts.map