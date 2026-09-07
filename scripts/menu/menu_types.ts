import type { HotKey } from "../path-controller/util/simple_events";
import type { Refusal } from "../path-controller/toolsys/toolop";
import type { IContextBase } from "../core/context_base";
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
  /** Refuses the entry outright, for a condition already known when the template is written. */
  disabled?: boolean;
  /**
   * Refuses the entry with a sentence. Return `true` to allow it, or the reason it may not run,
   * which becomes the row's tooltip. Runs once per menu build.
   */
  validate?: (ctx: IContextBase) => true | string | Refusal;
};

/** Old array form; [label, hotkey?:string|HotKey, icon?:number, tooltip?:string id?:any */
export type MenuTemplateItem =
  SEP | MenuTemplateTool | MenuTemplateCustom | MenuItemCallback | MenuTemplateEntry | Menu;

export type MenuTemplate = MenuTemplateItem[];

/** Menu item: an HTMLLIElement with extra properties attached at runtime */
export interface MenuItem extends HTMLLIElement {
  _id: string | number;
  _isMenu: boolean;
  _menu?: Menu;
  hotkey?: string;
  icon?: number;
  label?: string;
  /** Refuses clicks and keyboard selection; the row still takes hover focus, to show why. */
  _disabled?: boolean;
  /** Why the row refused, shown in place of its tooltip. */
  _disabledReason?: Refusal;
  /** The tooltip disabling replaced, restored when the row is enabled again. */
  _enabledTitle?: string;
}
