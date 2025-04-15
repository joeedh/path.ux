import {Context} from './context'

export as namespace ui

import {UIBase, pathUXInt} from './ui_base'
import {TabContainer} from '../widgets/ui_tabs'
import {ListBox} from '../widgets/ui_listbox'
import {ToolProperty} from '../pathux'

export interface ListEnumArgs {
  mass_set_path?: string
  enumDef?: string
  name?: string
  callback?: Function
  iconmap?: object
  packflag?: pathUXInt
  defaultval: number | string
}

export interface SliderArgs {
  mass_set_path?: string
  enumDef?: string
  name?: string
  callback?: Function
  iconmap?: object
  packflag?: pathUXInt
  min: number
  max: number
  decimals: pathUXInt
  step: number
  is_int: boolean
  do_redraw: boolean
  defaultval: number
}

declare class Container<CTX extends Context = Context> extends UIBase<CTX> {
  dataPrefix: string
  clear()

  add(child: UIBase<CTX>)

  prop(path: string, packflag?: pathUXInt, massSetPath?: string): UIBase<CTX>
  
  pathlabel(inpath, label = undefined, packflag = 0): UIBase<CTX>

  row(packflag?: pathUXInt): RowFrame<CTX>

  col(packflag?: pathUXInt): ColumnFrame<CTX>

  panel(label: string): Container<CTX> & { closed: boolean }

  tabs(position: 'top' | 'bottom' | 'left' | 'right', packflag?: number): TabContainer<CTX>

  listbox(packflag?: number): ListBox<CTX>

  label(str: string): UIBase<CTX>

  colorbutton(str: string): UIBase<CTX>

  iconbutton(icon: number, description: string, cb: () => void, thisvar?: any, packflag?: number): UIBase<CTX>

  button(string: string, cb: () => void, thisvar?: any, id?: any, packflag?: number): UIBase<CTX>

  vecpopup(path: string): UIBase<CTX>

  table(): TableFrame<CTX>

  listenum(
    inpath: string,
    name: string,
    enumDef: object,
    defaultval?: any,
    callback?: Function,
    iconmap?: object,
    packflag?: pathUXInt
  ): UIBase<CTX>
  listenum(inpath: string, args?: ListEnumArgs): UIBase<CTX>

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
  ): UIBase<CTX>
  slider(inpath: string, args: SliderArgs): UIBase<CTX>

  tool(
    cls_or_path: (new () => ToolProperty<{}, {}, CTX>) | string,
    args?: {
      packflag?: number
      createCb?: (cls: new () => ToolProperty<{}, {}, CTX>) => ToolProperty
      label?: string
    }
  ): UIBase<CTX>

  toolPanel(
    cls_or_path: (new () => ToolProperty<{}, {}, CTX>) | string,
    args?: {
      packflag?: number
      createCb?: (cls: new () => ToolProperty<{}, {}, CTX>) => ToolProperty
      label?: string
      container?: Container
      defaultsPath?: string
    }
  ): UIBase<CTX>

  /** Returns previous useIcons state. */
  useIcons(state?: boolean | number): number

  background: string

  clear(): void

  inherit_packflag: number
}

declare class TableFrame<CTX extends Context = Context> extends Container<CTX> {}

declare class RowFrame<CTX extends Context = Context> extends Container<CTX> {}

declare class ColumnFrame<CTX extends Context = Context> extends Container<CTX> {}
