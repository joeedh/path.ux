import { UIBase } from "../core/ui_base";
import { Context } from "../core/context";

export declare class IconButton<CTX extends Context = Context> extends UIBase<CTX> {
  extraDom?: HTMLElement;
  customIcon?: HTMLImageElement;
  icon: number;
}
