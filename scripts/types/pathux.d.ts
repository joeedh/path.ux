export * from "./core/ui_base";
export * from "./core/ui";
export * from "./core/anim";
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
