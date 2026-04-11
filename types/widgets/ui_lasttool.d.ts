import { ColumnFrame } from "../core/ui.js";
import { ToolOp } from "../path-controller/toolsys/toolsys.js";
import { IContextBase } from "../core/context_base.js";
export declare function getLastToolStruct(ctx: IContextBase): any;
export declare class LastToolPanel<CTX extends IContextBase = IContextBase> extends ColumnFrame<CTX> {
    ignoreOnChange: boolean;
    on_change: (() => void) | null;
    _tool_id: number | undefined;
    needsRebuild: boolean;
    last_tool: ToolOp | undefined;
    constructor();
    init(): void;
    /** client code can subclass and override this method */
    getToolStackHead(ctx: CTX): ToolOp<any, any, any, any> | undefined;
    rebuild(): void;
    unlinkEvents(): void;
    /** client code can subclass and override this method */
    buildTool(ctx: CTX, tool: ToolOp, panel: any): void;
    update(): void;
    static define(): {
        tagname: string;
    };
}
//# sourceMappingURL=ui_lasttool.d.ts.map