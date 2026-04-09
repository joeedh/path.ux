import {UIBase} from "../core/ui_base";
import {Context} from "../core/context";
import {Container} from "../core/ui";

export declare class TabContainer<CTX extends Context = Context> extends UIBase<CTX> {
  tab(name: string): Container<CTX>;

  tabFontScale: number;
}