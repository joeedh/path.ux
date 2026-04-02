import {PathPropMeta} from '../../path-controller/types/controller/controller_base'
import {ToolProperty} from '../../path-controller/types/toolsys/toolprop'

export as namespace ui_base

export enum PackFlags {
  INHERIT_WIDTH = 1,
  INHERIT_HEIGHT = 2,
  VERTICAL = 4,
  USE_ICONS = 8,
  SMALL_ICON = 16,
  LARGE_ICON = 32,

  FORCE_PROP_LABELS = 64, //force propeties (Container.prototype.prop()) to always have labels
  PUT_FLAG_CHECKS_IN_COLUMNS = 128, //group flag property checkmarks in columns (doesn't apply to icons)

  WRAP_CHECKBOXES = 256,

  //internal flags
  STRIP_HORIZ = 512,
  STRIP_VERT = 1024,
  STRIP = 512 | 1024,
  SIMPLE_NUMSLIDERS = 2048,
  FORCE_ROLLER_SLIDER = 4096,
  HIDE_CHECK_MARKS = 1 << 13,
  NO_NUMSLIDER_TEXTBOX = 1 << 14,
  CUSTOM_ICON_SHEET = 1 << 15,
  CUSTOM_ICON_SHEET_START = 20, //custom icon sheet bits are shifted to here
  NO_UPDATE = 1 << 16,
  LABEL_ON_RIGHT = 1 << 17,
}

type pathUXInt = number

import {Context} from './context'
import {INumVector, IVector4} from '../../path-controller/types/util/vectormath'
import {Animator, AnimatorHandlers} from './anim'

export declare function color2css(color: IVector4): string

export declare function css2color(css: string): number[]
interface IUIBaseDef {
  tagname: string
  style?: string
}

interface IUIBaseConstructor<Type> {
  new (): Type

  define(): IUIBaseDef
}

type AfterAspect<ThisCls, ARGS extends any[], RET, FUNC extends (...args: any) => RET> = {
  (...args): RET
  after(cb: () => void)
  after(cb: (this: ThisCls) => void)
}

declare class UIBase<CTX extends Context = Context> extends HTMLElement {
  ['constructor']: IUIBaseConstructor<this>

  static createElement<CTX extends Context, T extends UIBase = UIBase<CTX>>(tag: string): T

  static getDPI(): number

  ctx: CTX

  parentWidget?: UIBase<CTX>

  constructor()

  disabled?: boolean

  useDataPathUndo: boolean
  shadow: ShadowRoot

  /** called regularly by a setInterval timer, see FrameManager.listen*/
  update(): void
  //update(): AfterAspect<this, [], void>

  /** call .update and all children's .update methods recursively */
  flushUpdate(): void

  /* called after constructor, since DOM limits what you can do in constructor
   *  (e.g. you can't modifer .style or set attributes)*/
  init(): void

  /* pick an element or a child element */
  pickElement(
    x: number,
    y: number,
    args?: {
      //
      nodeclass: UIBase
      excluded_classes: UIBase[]
      clip?: boolean
      mouseEvent?: PointerEvent
    },
    // @unused @deprecated
    marginy = 0,
    // @deprecated
    nodeclass = UIBase,
    // @deprecated
    excluded_classes = undefined
  )

  /*queue a function callback, multiple repeated calls will be ignored*/
  doOnce(func: Function): void

  setCSS(): void

  noMarginsOrPadding(): this

  getPathValue<T = any>(ctx: any, path: string): T

  setPathValueUndo<T = any>(ctx: any, path: string, value: T): void

  setPathValue<T = any>(ctx: any, path: string, value: T): void

  getPathMeta<T = any, PropType extends ToolProperty<any> = ToolProperty<any>>(
    ctx: any,
    path: string
  ): PathPropMeta<T, P> | undefined

  //getPathMeta<T = any>(ctx: any, path: string)
  loadNumConstraints(prop: ToolProperty<any>, dom: HTMLElement, onModifiedCallback: (elem: UIBase) => any)

  undoBreakPoint(): any

  /* float element by setting z-index and setting position to absolute*/
  float(x: number, y: number, zindex: number): void
  float(x: number, y: number): void

  overrideDefault(key: string, val: string | number, localOnly: boolean): void

  overrideClass(style: string): void

  overrideClassDefault(style: string, key: string, value: string | number): void

  getDefault(
    key: string,
    checkForMobile?: boolean,
    defaultval?: string | number,
    inherit?: boolean
  ): string | number | boolean

  getStyleClass(): string

  hasClassDefault(key: string): boolean

  getClassDefault(
    key: string,
    checkForMobile?: boolean,
    defaultval?: string | number,
    inherit?: boolean
  ): string | number | boolean

  overrideTheme(theme: any): this

  animate(
    keyframes: Keyframe[] | PropertyIndexedKeyframes | null | AnimatorHandlers,
    options?: number | KeyframeAnimationOptions
  ): Animator | Animation
  //animate(handlers?: any): Animator

  static register(cls: any): void

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
  saveData(): any

  loadData(json: any): this

  animate(extraHandlers?: any, domAnimateOptions?: any): Animator
  
  background: string
}

/**
 * Saves 'euphemeral' state for UI elements (e.g. scroll, collapsed/open panels, tab states, etc)
 * into a string buffer.
 */
export declare function saveUIData<CTX extends Context>(elem: UIBase<CTX>, name: string): string

/**
 * Loads 'euphemeral' state saved by saveUIData.  Child elements that no longer exist
 * will be ignored; this is by design.
 */
export declare function loadUIData<CTX extends Context>(elem: UIBase<CTX>, uiData: string)
