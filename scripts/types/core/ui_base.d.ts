export type pathUXInt = number;

import { Context } from "./context";
import { INumVector } from "../../path-controller/types/util/vectormath";

export declare function color2css(color: INumVector): string;

export declare function css2color(css: string): number[];

export declare class UIBase extends HTMLElement {
  ctx: Context;

  constructor();

  /** called regularly by a setInterval timer, see FrameManager.listen*/
  update(): void;

  /* called after constructor, since DOM limits what you can do in constructor
   *  (e.g. you can't modifer .style or set attributes)*/
  init(): void;

  /*queue a function callback, multiple repeated calls will be ignored*/
  doOnce(func: Function): void;

  setCSS(): void;

  /* float element by setting z-index and setting position to absolute*/
  float(x: number, y: number, zindex: number): void;
  float(x: number, y: number): void;

  static register(Class: new () => UIBase);
}

/**
 * Saves 'euphemeral' state for UI elements (e.g. scroll, collapsed/open panels, tab states, etc)
 * into a string buffer.
 */
export declare function saveUIData(elem: UIBase, name: string): string;

/**
 * Loads 'euphemeral' state saved by saveUIData.  Child elements that no longer exist
 * will be ignored; this is by design.
 */
export declare function loadUIData(elem: UIBase, uiData: string);
