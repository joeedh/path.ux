import {Screen} from '../screen/FrameManager'

export as namespace context

import {Area} from '../../screen/ScreenArea'
import {DataAPI, ToolOp, ToolPropertyCache} from '../pathux'

export declare enum ContextFlags {
  NONE = 0,
  IS_VIEW = 1,
}

declare class ContextOverlay<AppState = any> {
  constructor(appstate: AppState)
  state: AppState
}

declare interface IContextConstructor<AppState, Overlays extends ContextOverlay = {}> {
  new (state?: AppState): Context<AppState, Overlays>
}

declare interface IOverlayConstructor<AppState> {
  new (state?: AppState): ContextOverlay<AppState>
}

type O<s extends AppState, Overlays extends ContextOverlay<s>> = {[k in keyof Overlays]: Overlays[k]}
type K<Overlays extends {}> = keyof Overlays

declare class Context<AppState = any> {
  static register(cls: IOverlayConstructor<AppState>)
  static contextDefine(): {name: string; flag: ContextFlags}

  get state(): AppState
  toolstack: ToolStack
  api: DataAPI
  screen: Screen
  activeArea: Area
  toolDefaults?: ToolPropertyCache
  last_tool?: ToolOp<any, any, this, any>

  constructor(state: AppState)

  message(msg: string, timeout = 2500): void

  error(msg: string, timeout = 2500): void

  warning(msg: string, timeout = 2500): void

  progressBar(msg: string, percent: number, cssColor?: string, timeout = 1000)

  reset(haveNewFile: boolean): void
  pushOverlay(overlay: ContextOverlay<AppState>): void
}

export type MakeContextType<Context, Overlays> = Context & Overlays