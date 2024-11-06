import { UIBase } from "../core/ui_base";
import { ToolProperty } from "../../path-controller/types/toolsys/toolprop";
import { Context } from "../core/context";
import { HotKey } from "../../util/simple_events";

export declare class DropBox<CTX extends Context  = Context> extends UIBase<CTX> {
  prop: ToolProperty<any>;
}

export declare class Menu<CTX extends Context  = Context> extends UIBase<CTX> {
  addItemExtra(text: string, id: string | number, hotkey?: string, icon?: number, add?: number, tooltip?: string);

  addItem(text: string, id: string | number, add?: number, tooltip?: string);

  startFancy(prepend?: boolean): void;

  start(prepend?: boolean, setActive?: boolean): void;
}

export declare const SEP: symbol;
export declare type SEP = symbol;

export declare type MenuTemplateTool = string;
export declare type MenuTemplateCustom = [name: string, func: <CTX>(ctx: CTX) => void];
export declare type MenuItemCallback = (dom: HTMLElement) => HTMLElement;
/** Old array form; [label, hotkey?:string|HotKey, icon?:number, tooltip?:string id?:any */
export declare type MenuItemArrayForm = [string, (string | HotKey)?, number?, string?, any?];
export declare type MenuTemplateItem =
  | SEP
  | MenuTemplateTool
  | MenuTemplateCustom
  | MenuItemCallback
  | MenuItemArrayForm
  | Menu;

export declare type MenuTemplate = MenuTemplateItem[];

export declare function startMenu(menu: any, x: number, y: number, searchMenuMode?: boolean, safetyDelay?: number);
export declare function createMenu<CTX>(ctx: CTX, title: string, templ: MenuTemplate);
