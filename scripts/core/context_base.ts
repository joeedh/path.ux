import type { Screen } from "../screen/FrameManager";
import { ContextLike } from "../path-controller/controller/controller_abstract";
import type { ToolStack } from "../path-controller/toolsys/toolsys";

export interface IContextBase<AppState = any, TS extends ToolStack = ToolStack> extends ContextLike<AppState, TS> {
  state: AppState;
  // so stupid
  // @ts-expect-error
  screen: Screen<this>;
}
