export as namespace simple_toolsys;

import {Context} from '../core/context.d.ts';

declare class ToolOp {
    inputs   : any;
    outputs  : any;
    static tooldef() : any;

    undoPre(ctx : Context);
    undo(ctx : Context);
    execPre(ctx : Context);
    exec(ctx : Context);
    execPost(ctx : Context);
    modalStart(ctx : Context);
    modalEnd(wasCancelled : boolean);
}