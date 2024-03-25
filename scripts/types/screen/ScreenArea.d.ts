import { UIBase } from "../core/ui_base";
import { Vector2 } from "../../path-controller/types/util/vectormath";
import { Container } from "../core/ui";
import { Context } from "../core/context";
import { KeyMap } from "../../path-controller/types/util/simple_events";
import { Screen } from "./FrameManager";

export { Screen };

export declare interface IAreaDef {
  tagname: string;
  areaname: string;
  uiname?: string;
  apiname?: string;
  /** Defaults to 'areaname' */
  flag?: number;
  icon?: number;
  style?: string;
}

export declare interface IAreaConstructor<Type = any> {
  new (): Type;

  define(): IAreaDef;
}

export declare class Area<CTX = Context> extends UIBase<CTX> {
  ["constructor"]: IAreaConstructor<this>;

  header: Container;
  pos: Vector2;
  size: Vector2;
  flag: number;
  minSize: Vector2;
  maxSize: Vector2;
  floating: boolean;
  owning_sarea: ScreenArea<CTX>;
  swapParent?: HTMLElement;
  keymap?: KeyMap;

  getKeyMaps(): KeyMap[];

  getID(): string;

  on_keydown(e: KeyboardEvent): void;

  push_ctx_active(): void;

  pop_ctx_active(): void;

  on_area_active(): void;

  on_area_inactive(): void;

  on_area_blur(): void;

  on_area_focus(): void;

  getScreen(): Screen<CTX>;

  makeHeader(container: Container<CTX>, addHelpPicker?: boolean): void;

  static getActiveArea<T extends Area = Area>(type: IAreaConstructor<T>): T | undefined;

  static register<T extends Area = Area>(type: IAreaConstructor<T>): void;
}

export declare class ScreenArea<CTX = Context> extends UIBase<CTX> {
  area: Area<CTX>;

  /** @deprecated */
  switch_editor(IAreaConstructor): void;

  switchEditor(IAreaConstructor): void;

  screen: Screen<CTX>;
}

export declare const areaclasses: { [k: string]: IAreaConstructor };
