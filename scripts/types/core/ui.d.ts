export as namespace ui;

import { UIBase, pathUXInt } from "./ui_base";

export interface ListEnumArgs {
  mass_set_path?: string;
  enumDef?: string;
  name?: string;
  callback?: Function;
  iconmap?: object;
  packflag?: pathUXInt;
  defaultval: number | string;
}

export interface SliderArgs {
  mass_set_path?: string;
  enumDef?: string;
  name?: string;
  callback?: Function;
  iconmap?: object;
  packflag?: pathUXInt;
  min: number;
  max: number;
  decimals: pathUXInt;
  step: number;
  is_int: boolean;
  do_redraw: boolean;
  defaultval: number;
}

export declare class Container extends UIBase {
  dataPrefix: string;
  clear();

  prop(path: string, packflag?: pathUXInt): UIBase;

  row(packflag?: pathUXInt): RowFrame;

  col(packflag?: pathUXInt): ColumnFrame;

  label(str: string): UIBase;

  colorbutton(str: string): UIBase;

  vecpopup(path: string): UIBase;

  table(): TableFrame;

  listenum(
    inpath: string,
    name: string,
    enumDef: object,
    defaultval?: any,
    callback?: Function,
    iconmap?: object,
    packflag?: pathUXInt
  ): UIBase;
  listenum(inpath: string, args?: ListEnumArgs): UIBase;

  slider(
    inpath: string,
    name: string,
    defaultval: number,
    min: number,
    max: number,
    step: number,
    is_int: boolean,
    do_redraw: boolean,
    callback: Function,
    packflag: number
  ): UIBase;
  slider(inpath: string, args: SliderArgs): UIBase;
}

export declare class TableFrame extends Container {}

export declare class RowFrame extends Container {}

export declare class ColumnFrame extends Container {}
