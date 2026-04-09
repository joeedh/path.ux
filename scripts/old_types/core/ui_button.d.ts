import { Context } from "./context";

export as namespace ui_buttons;

import { UIBase, pathUXInt } from "./ui_base";
import { TabContainer } from "../widgets/ui_tabs";
import { ListBox } from "../widgets/ui_listbox";
import { ToolProperty } from "../pathux";

export declare class Button<CTX extends Context> extends UIBase<CTX> {
  icon: number;
}

export declare class IconButton<CTX extends Context> extends Button<CTX> {
  icon: number;
}
