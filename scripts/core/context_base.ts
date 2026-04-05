import type { DataAPI, ToolStack } from "../pathux";
import type { Screen} from "../screen/FrameManager";

export interface IContextBase<AppState = any, TS extends ToolStack = ToolStack> {
  state: AppState
  screen: Screen
  api: DataAPI
  toolstack: TS
}
