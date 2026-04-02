import {Context} from './context'

export as namespace ui

import {PackFlags, UIBase, pathUXInt} from './ui_base'
import {TabContainer} from '../widgets/ui_tabs'
import {ListBox} from '../widgets/ui_listbox'
import {ToolProperty} from '../pathux'
import { Menu, MenuTemplate } from '../widgets/ui_menu'

type Enum = {[k: string]: string | number}

type ListEnum<CTX extends Context, ENUM extends Enum = Enum> = Omit<UIBase<CTX>, 'onselect'> & {
  onselect: (id: string | number) => void
  internalDisabled?: boolean
  setValue(value: Enum): void
  getValue(value: Enum): void
}

export interface ListEnumArgs<ENUM extends Enum = Enum> {
  name?: string
  mass_set_path?: string
  enumDef?: ENUM
  callback?: Function
  iconmap?: {[k in keyof ENUM]?: number}
  packflag?: pathUXInt
  defaultval?: number | string
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

interface StripStyle {
  margin1?: number
  margin2?: number
  horiz?: boolean
}

declare class Container<CTX extends Context = Context> extends UIBase<CTX> {
  dataPrefix: string
  clear()

  add(child: UIBase<CTX>)

  prop(path: string, packflag?: pathUXInt, massSetPath?: string): UIBase<CTX>

  pathlabel(path, label = undefined, packflag = 0): UIBase<CTX>

  row(packflag?: pathUXInt): RowFrame<CTX>
  strip(themeClass_or_obj?: string | StripStyle): Container<CTX>

  col(packflag?: pathUXInt): ColumnFrame<CTX>

  dynamicMenu(title, list, packflag = 0): Menu
  menu(title: string, template: MenuTemplate, packflag?: PackFlags): Menu
  panel(label: string): Container<CTX> & {closed: boolean}

  tabs(position: 'top' | 'bottom' | 'left' | 'right', packflag?: number): TabContainer<CTX>

  listbox(packflag?: number): ListBox<CTX>

  label(str: string): UIBase<CTX>

  colorbutton(str: string): UIBase<CTX>

  iconbutton(icon: number, description: string, cb: () => void, thisvar?: any, packflag?: number): IconButton<CTX>

  button(string: string, cb: () => void, thisvar?: any, id?: any, packflag?: number): Button<CTX>

  vecpopup(path: string): UIBase<CTX>

  table(): TableFrame<CTX>

  listenum(
    path?: string,
    name: string,
    enumDef: object,
    defaultval?: any,
    callback?: Function,
    iconmap?: object,
    packflag?: pathUXInt
  ): ListEnum<CTX>
  listenum(path?: string, args?: ListEnumArgs): ListEnum<CTX>

  slider(
    path: string,
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
  slider(path: string, args: SliderArgs): UIBase<CTX>

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
  clear(): void

  inherit_packflag: number
}

declare class TableFrame<CTX extends Context = Context> extends Container<CTX> {}

declare class RowFrame<CTX extends Context = Context> extends Container<CTX> {}

declare class ColumnFrame<CTX extends Context = Context> extends Container<CTX> {}
