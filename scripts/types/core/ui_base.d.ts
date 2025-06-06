import { PathPropMeta } from "../../path-controller/types/controller/controller_base";
import { ToolProperty } from "../../path-controller/types/toolsys/toolprop";

export as namespace ui_base;

type pathUXInt = number;

import { Context } from "./context";
import { INumVector, IVector4 } from "../../path-controller/types/util/vectormath";
import { Animator, AnimatorHandlers } from "./anim";

export declare function color2css(color: IVector4): string;

export declare function css2color(css: string): number[];
declare interface IUIBaseDef {
  tagname: string;
  style?: string;
}

declare interface IUIBaseConstructor<Type> {
  new (): Type;

  define(): IUIBaseDef;
}

declare class UIBase<CTX extends Context = Context> extends HTMLElement {
  ["constructor"]: IUIBaseConstructor<this>;

  static createElement<CTX extends Context, T extends UIBase = UIBase<CTX>>(tag: string): T;

  static getDPI(): number;

  ctx: CTX;

  parentWidget?: UIBase<CTX>;

  constructor();

  useDataPathUndo: boolean;
  shadow: ShadowRoot;

  /** called regularly by a setInterval timer, see FrameManager.listen*/
  update(): void;

  /** call .update and all children's .update methods recursively */
  flushUpdate(): void;

  /* called after constructor, since DOM limits what you can do in constructor
   *  (e.g. you can't modifer .style or set attributes)*/
  init(): void;

  /*queue a function callback, multiple repeated calls will be ignored*/
  doOnce(func: Function): void;

  setCSS(): void;

  noMarginsOrPadding(): this;

  getPathValue<T = any>(ctx: any, path: string): T;

  setPathValueUndo<T = any>(ctx: any, path: string, value: T): void;

  setPathValue<T = any>(ctx: any, path: string, value: T): void;

  getPathMeta<T = any, PropType extends ToolProperty<any> = ToolProperty<any>>(
    ctx: any,
    path: string
  ): PathPropMeta<T, P> | undefined;

  //getPathMeta<T = any>(ctx: any, path: string)
  loadNumConstraints(prop: ToolProperty<any>, dom: HTMLElement, onModifiedCallback: (elem: UIBase) => any);

  undoBreakPoint(): any;

  /* float element by setting z-index and setting position to absolute*/
  float(x: number, y: number, zindex: number): void;
  float(x: number, y: number): void;

  overrideDefault(key: string, val: string | number, localOnly: boolean): void;

  overrideClass(style: string): void;

  overrideClassDefault(style: string, key: string, value: string | number): void;

  getDefault(
    key: string,
    checkForMobile?: boolean,
    defaultval?: string | number,
    inherit?: boolean
  ): string | number | boolean;

  getStyleClass(): string;

  hasClassDefault(key: string): boolean;

  getClassDefault(
    key: string,
    checkForMobile?: boolean,
    defaultval?: string | number,
    inherit?: boolean
  ): string | number | boolean;

  overrideTheme(theme: any): this;

  animate(
    keyframes: Keyframe[] | PropertyIndexedKeyframes | null | AnimatorHandlers,
    options?: number | KeyframeAnimationOptions
  ): Animator | Animation;
  //animate(handlers?: any): Animator

  static register(cls: any): void;

  /**
   * for saving ui state.
   * see saveUIData() export
   *
   * should fail gracefully.
   *
   * also, it doesn't rebuild the object graph,
   * it patches it; for true serialization use
   * the toJSON/loadJSON or STRUCT interfaces.
   */
  saveData(): any;

  loadData(json: any): this;

  animate(extraHandlers?: any, domAnimateOptions?: any): Animator
}

/**
 * Saves 'euphemeral' state for UI elements (e.g. scroll, collapsed/open panels, tab states, etc)
 * into a string buffer.
 */
export declare function saveUIData<CTX extends Context>(elem: UIBase<CTX>, name: string): string;

/**
 * Loads 'euphemeral' state saved by saveUIData.  Child elements that no longer exist
 * will be ignored; this is by design.
 */
export declare function loadUIData<CTX extends Context>(elem: UIBase<CTX>, uiData: string);
