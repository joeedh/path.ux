import type { HotKey } from "../path-controller/util/simple_events";
import type { Menu } from "./menu";

export const SEP = Symbol("MenuSep");
export type SEP = symbol;

export type MenuTemplateTool = string;
export type MenuTemplateCustom = [
  name: string,
  func: <CTX>(ctx: CTX) => void,
  hotkey?: string,
  icon?: number,
  tooltip?: string,
  id?: string | number,
];

export type MenuItemCallback = (dom: HTMLElement) => HTMLElement;

/**
 * Object form of a custom entry. Preferred over {@link MenuTemplateCustom}: the positional array
 * silently mistakes an argument for a tooltip when an optional slot is skipped.
 */
export type MenuTemplateEntry = {
  name: string;
  callback: (id: string | number) => void;
  hotkey?: string | HotKey;
  icon?: number;
  tooltip?: string;
  id?: string | number;
};

/** Old array form; [label, hotkey?:string|HotKey, icon?:number, tooltip?:string id?:any */
export type MenuTemplateItem =
  | SEP
  | MenuTemplateTool
  | MenuTemplateCustom
  | MenuItemCallback
  | MenuTemplateEntry
  | Menu;

export type MenuTemplate = MenuTemplateItem[];

/** Menu item: an HTMLLIElement with extra properties attached at runtime */
export interface MenuItem extends HTMLLIElement {
  _id: string | number;
  _isMenu: boolean;
  _menu?: Menu;
  hotkey?: string;
  icon?: number;
  label?: string;
}
