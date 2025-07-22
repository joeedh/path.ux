export * from "./core/ui_base";
export * from "./core/ui";
export * from "./core/anim";
export * from "./core/context";
export * from "../path-controller/types/controller";
export * from "./screen/ScreenArea";
export * from "./screen/area_wrangler";
export * from './widgets/ui_listbox'
export * from "./widgets/ui_menu";
export * from "./widgets/ui_tabs";
export * from './widgets/ui_textbox'
export * from './widgets/ui_widgets'

import * as simple from "./simple/simple";
export { simple };

export const keymap: { [k: string]: number };

export interface IconMap {
  [k: string]: number;
}

export declare const Icons: IconMap;

export declare interface IPathuxConstants {
  colorSchemeType: 'light' | 'dark'
  docManualPath: string
  docEditorPath: string
  /** Add textboxes to rollar sliders,
     note that  users can also double click them to
     enter text as well
   */
  useNumSliderTextboxes: boolean
  /** Threshold to check if numslider arrow was clicked. */
  numSliderArrowLimit: number
  simpleNumSliders: boolean
  menusCanPopupAbove: boolean
  menu_close_time: number
  doubleClickTime: number
  doubleClickHoldTime: number
  DEBUG: any
  /** Auto load 1d bspline templates, can hurt startup time. */
  autoLoadSplineTemplates: boolean
  addHelpPickers: boolean

  useAreaTabSwitcher: boolean
  autoSizeUpdate: boolean
  showPathsInToolTips: boolean
  enableThemeAutoUpdate: boolean
  useNativeToolTips: boolean
  noElectronMenus: boolean
}

export declare const cconst: IPathuxConstants & {
  setConstants(constants: Partial<IPathuxConstants>): void
} 
