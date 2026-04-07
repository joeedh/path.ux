import type { Screen } from "../screen/FrameManager";
import { ContextLike, IToolStack } from "../path-controller/controller/controller_abstract";

export interface IContextBase<AppState = any, TS extends IToolStack = IToolStack> extends ContextLike<AppState, TS> {
  state: AppState;
  // so stupid
  // @ts-expect-error
  screen: Screen<this>;
}
