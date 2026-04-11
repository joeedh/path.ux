import { ToolOp } from "./toolsys.js";
import { parser } from "../util/parseutil.js";
export declare const ToolPaths: Record<string, typeof ToolOp>;
export declare function buildParser(): InstanceType<typeof parser>;
export declare const Parser: parser;
interface ParseToolPathResult {
    toolclass: typeof ToolOp | undefined;
    args: Record<string, unknown>;
}
export declare function parseToolPath(str: string, check_tool_exists?: boolean): ParseToolPathResult;
export declare function testToolParser(): ParseToolPathResult;
export declare function initToolPaths(): void;
export {};
//# sourceMappingURL=toolpath.d.ts.map