export as namespace toolsys;

import {Context} from '../core/context';

declare interface ToolDef {
    uiname: string;
    toolpath: string;
    inputs: any;
    outputs: any;
    icon: number;
    is_modal: boolean;
    flag: number;
}

declare class ToolOp {
    inputs   : any;
    outputs  : any;
    static tooldef() : ToolDef;

    undoPre(ctx : Context): void;
    undo(ctx : Context): void;
    execPre(ctx : Context): void;
    exec(ctx : Context): void;
    execPost(ctx : Context): void;
    modalStart(ctx : Context): void;
    modalEnd(wasCancelled : boolean): void;
}