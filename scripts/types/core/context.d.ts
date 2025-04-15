import { Screen } from "../screen/FrameManager";

export as namespace context;

import { DataAPI } from "../path-controller/controller_base";
import { ToolStack } from "../../path-controller/toolsys/toolsys";
import { Area } from "../../screen/ScreenArea";

interface Context<AppState = any> {
  state: AppState;
  toolstack: ToolStack;
  api: DataAPI;
  screen: Screen;
  activeArea: Area

  //report(message : string, delayMs : number);
}
