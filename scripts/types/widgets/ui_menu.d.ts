import {UIBase} from "../core/ui_base";
import {ToolProperty} from "../../path-controller/types/toolsys/toolprop";
import {Context} from "../core/context";

export declare class DropBox<CTX = Context> extends UIBase<CTX> {
  prop: ToolProperty<any>
}

export declare class Menu<CTX = Context> extends UIBase<CTX> {
  addItemExtra(text: string, id: string | number, hotkey?: string, icon?: number, add?: number, tooltip?: string);

  addItem(text: string, id: string | number, add?: number, tooltip?: string);

  startFancy(prepend?: boolean): void

  start(prepend?: boolean, setActive?: boolean): void
}
