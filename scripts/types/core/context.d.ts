import { Screen } from "../screen/FrameManager";

export as namespace context;

import { Area } from "../../screen/ScreenArea";
import { DataAPI, ToolOp, ToolPropertyCache } from "../pathux";

declare interface Context<AppState = any> {
  state: AppState;
  toolstack: ToolStack;
  api: DataAPI;
  screen: Screen;
  activeArea: Area;
  toolDefaults?: ToolPropertyCache
  last_tool?: ToolOp<any, any, this, any>

  message(msg: string, timeout = 2500): void;

  error(msg: string, timeout = 2500): void;

  warning(msg: string, timeout = 2500): void;

  progressBar(msg: string, percent: number, cssColor?: string, timeout = 1000);
}
