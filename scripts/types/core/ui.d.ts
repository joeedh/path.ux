export as namespace ui;

import {UIBase, pathUXInt} from './ui_base';

interface ListEnumArgs {
  mass_set_path?: string;
  enumDef?: string;
  name?: string;
  callback?: Function;
  iconmap?: object;
  packflag?: pathUXInt;
  defaultval: number | string;
}

interface SliderArgs {
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

declare class Container extends UIBase {
  prop(path: string, packflag: pathUXInt): UIBase;
  prop(path: string): UIBase;

  row(packflag: pathUXInt): RowFrame;

  col(packflag: pathUXInt): ColumnFrame;

  label(str: string): UIBase;

  colorbutton(str: string): UIBase;

  vecpopup(path: string): UIBase;

  table(): TableFrame;

  listenum(inpath: string, name: string, enumDef: object, defaultval?: any, callback?: Function, iconmap?: object, packflag?: pathUXInt): UIBase;
  listenum(inpath: string, args?: ListEnumArgs): UIBase;

  slider(inpath: string, name: string, defaultval: number, min: number, max: number, step: number, is_int: boolean, do_redraw: boolean, callback: Function, packflag: number): UIBase;
  slider(inpath: string, args: SliderArgs): UIBase;
}

declare class TableFrame extends Container {

}

declare class RowFrame extends Container {

}

declare class ColumnFrame extends Container {

}
