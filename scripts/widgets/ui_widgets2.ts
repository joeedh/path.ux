'use strict'
import './ui_richedit.js'

import * as util from '../path-controller/util/util.js'
import * as ui_base from '../core/ui_base.js'
import {Vector2, Vector3, Vector4, Quat} from '../path-controller/util/vectormath.js'
import {RowFrame, ColumnFrame} from '../core/ui.js'
import {isVecProperty, PropFlags} from '../path-controller/toolsys'

import './ui_widgets.js'

import {UIBase, PackFlags} from '../core/ui_base.js'

import {ToolProperty} from '../path-controller/toolsys/toolprop.js'
import {Button} from './ui_button.js'
import {IContextBase} from '../core/context_base.js'

/** Type for the container returned by Screen.popup() */
type PopupContainer = UIBase & {
  background: string
  end(): void
  add(child: UIBase): void
  button(label: string, cb?: () => void): UIBase
  flushUpdate(): void
}

type AnySlider = UIBase & Record<string, unknown>

export class VectorPopupButton<CTX extends IContextBase = IContextBase> extends Button<CTX> {
  _value: Vector2 | Vector3 | Vector4 | Quat

  constructor() {
    super()

    this._value = new Vector4()
  }

  get value() {
    return this._value
  }
  set value(v: Vector2 | Vector3 | Vector4 | Quat) {
    this._value = v
  }

  private castValue<V extends Vector2 | Vector3 | Vector4 | Quat>() {
    return this._value as V
  }

  static define() {
    return {
      tagname: 'vector-popup-button-x',
      style  : 'vecPopupButton',
    }
  }

  _onpress = (e: unknown) => {
    const evt = e as {button?: number}
    if (evt.button && evt.button !== 0) {
      return
    }

    const panel = UIBase.createElement<UIBase>('vector-panel-x')
    const screen = this.ctx.screen

    const popup = screen.popup(this, this, 0) as unknown as PopupContainer

    popup.add(panel)
    popup.button('ok', () => {
      popup.end()
    })

    if (this.hasAttribute('datapath')) {
      panel.setAttribute('datapath', this.getAttribute('datapath')!)
    }
    if (this.hasAttribute('mass_set_path')) {
      panel.setAttribute('mass_set_path', this.getAttribute('mass_set_path')!)
    }

    popup.flushUpdate()
  }

  updateDataPath() {
    if (!this.hasAttribute('datapath')) {
      return
    }

    const value = this.getPathValue(this.ctx, this.getAttribute('datapath')!) as
      | (Vector2 | Vector3 | Vector4 | Quat)
      | undefined

    if (!value) {
      this.internalDisabled = true
      return
    }

    if (this.internalDisabled) {
      this.internalDisabled = false
    }

    if (this.value.length !== value.length) {
      switch (value.length) {
        case 2:
          this.value = new Vector2()
          break
        case 3:
          this.value = new Vector3()
          break
        case 4:
          this.value = new Vector4()
          break
      }
    }

    if (this.castValue<typeof value>().vectorDistance(value as any) > 0.0001) {
      this.castValue<typeof value>().load(value as any)
      console.log('updated vector popup button value')
    }
  }

  update() {
    super.update()
    this.updateDataPath()
  }
}
UIBase.internalRegister(VectorPopupButton)

export class VectorPanel<CTX extends IContextBase = IContextBase> extends ColumnFrame<CTX> {
  _value: Vector2 | Vector3 | Vector4 | Quat
  declare name: string
  axes: string
  sliders: AnySlider[]
  hasUniformSlider: boolean
  __range: [number, number]
  _range: [number, number]
  uslider: AnySlider | undefined

  private castValue<V extends Vector2 | Vector3 | Vector4 | Quat>() {
    return this._value as V
  }
  
  get value() {
    return this._value
  }
  set value(v: Vector2 | Vector3 | Vector4 | Quat) {
    this._value = v
  }

  constructor() {
    super()

    this.range = [-1e17, 1e17]

    this.name = ''

    this.axes = 'XYZW'
    this._value = new Vector3()
    this.sliders = []
    this.hasUniformSlider = false

    this.packflag |= PackFlags.FORCE_ROLLER_SLIDER

    const makeParam = (key: string) => {
      Object.defineProperty(this, key, {
        get: function () {
          return (this as VectorPanel)._getNumParam(key)
        },

        set: function (val: unknown) {
          ;(this as VectorPanel)._setNumParam(key, val)
        },
      })
    }

    this.__range = [-1e17, 1e17]
    this._range = new Array(2) as [number, number]

    Object.defineProperty(this._range, 0, {
      get: () => this.__range[0],
      set: (val: number) => (this.__range[0] = val),
    })
    Object.defineProperty(this._range, 1, {
      get: () => this.__range[1],
      set: (val: number) => (this.__range[1] = val),
    })

    makeParam('isInt')
    makeParam('radix')
    makeParam('decimalPlaces')
    makeParam('baseUnit')
    makeParam('displayUnit')
    makeParam('step')
    makeParam('slideSpeed')
    makeParam('expRate')
    makeParam('stepIsRelative')

    window.vp = this
  }

  init() {
    super.init()
    this.rebuild()
    this.setCSS()

    this.background = this.getDefault('InnerPanelBG')
  }

  _getNumParam(key: string): unknown {
    return (this as unknown as Record<string, unknown>)['_' + key]
  }

  _setNumParam(key: string, val: unknown) {
    if (key === 'range') {
      const v = val as [number, number]
      this.__range[0] = v[0]
      this.__range[1] = v[1]

      return
    }

    ;(this as unknown as Record<string, unknown>)['_' + key] = val

    for (const slider of this.sliders) {
      slider[key] = val
    }
  }

  rebuild() {
    this.clear()

    if (this.name) {
      this.label(this.name)
    }

    let frame: UIBase
    let row: RowFrame<CTX> | undefined

    if (this.hasUniformSlider) {
      row = this.row()
      frame = row.col()
    } else {
      frame = this
    }

    this.sliders = []

    for (let i = 0; i < this.value.length; i++) {
      const vArr = this.value as unknown as number[]
      const slider = (frame as ColumnFrame<CTX>).slider(undefined, {
        name      : this.axes[i],
        defaultval: vArr[i],
        min       : this.range![0],
        max       : this.range![1],
        step      : this.step ?? 0.001,
        is_int    : this.isInt,
        packflag  : this.packflag,
      }) as unknown as AnySlider

      slider['addLabel'] = false
      slider['labelOnTop'] = false

      slider['axis'] = i
      const this2 = this

      slider['baseUnit'] = this.baseUnit
      slider['slideSpeed'] = this.slideSpeed
      slider['decimalPlaces'] = this.decimalPlaces
      slider['displayUnit'] = this.displayUnit
      slider['isInt'] = this.isInt
      slider['range'] = this.__range
      slider['radix'] = this.radix
      slider['step'] = this.step
      slider['expRate'] = this.expRate
      slider['stepIsRelative'] = this.stepIsRelative

      if (this.stepIsRelative) {
        slider['step'] = ToolProperty.calcRelativeStep(this.step ?? 0, vArr[i])
      }

      slider['onchange'] = function (this: AnySlider) {
        ;(this2.value as unknown as Record<number, number>)[this['axis'] as number] = this['value'] as number

        if (this2.hasAttribute('datapath')) {
          this2.setPathValue(this2.ctx, this2.getAttribute('datapath')!, this2.value)
        }

        if (this2.uslider) {
          ;(this2.uslider as unknown as {setValue(v: number, b: boolean): void}).setValue(this2.uniformValue, false)
        }

        if (this2.onchange) {
          this2.onchange(this2.value)
        }
      }

      this.sliders.push(slider)
    }

    if (this.hasUniformSlider) {
      const uslider = (this.uslider = UIBase.createElement('numslider-x') as AnySlider)
      row!._prepend(uslider as unknown as UIBase<CTX>)

      uslider['range'] = this.range
      uslider['baseUnit'] = this.baseUnit
      uslider['slideSpeed'] = this.slideSpeed
      uslider['decimalPlaces'] = this.decimalPlaces
      uslider['displayUnit'] = this.displayUnit
      uslider['expRate'] = this.expRate
      uslider['step'] = this.step
      uslider['isInt'] = this.isInt
      uslider['radix'] = this.radix
      uslider['stepIsRelative'] = this.stepIsRelative

      uslider['vertical'] = true
      ;(uslider as unknown as {setValue(v: number, b: boolean): void}).setValue(this.uniformValue, false)

      this.sliders.push(uslider)

      uslider['onchange'] = () => {
        this.uniformValue = uslider['value'] as number
      }
    } else {
      this.uslider = undefined
    }

    this.setCSS()
  }

  get uniformValue() {
    let sum = 0.0
    const vArr = this.value as unknown as number[]

    for (let i = 0; i < this.value.length; i++) {
      sum += isNaN(vArr[i]) ? 0.0 : vArr[i]
    }

    return sum / this.value.length
  }

  set uniformValue(val: number) {
    const old = this.uniformValue
    let doupdate = false

    const vArr = this.value as unknown as number[]

    if (old === 0.0 || val === 0.0) {
      doupdate = (this.value as unknown as {dot(v: unknown): number}).dot(this.value) !== 0.0

      this.value.zero()
    } else {
      const ratio = val / old
      for (let i = 0; i < this.value.length; i++) {
        vArr[i] *= ratio
      }

      doupdate = true
    }

    if (doupdate) {
      if (this.hasAttribute('datapath')) {
        this.setPathValue(this.ctx, this.getAttribute('datapath')!, this.value)
      }

      if (this.onchange) {
        this.onchange(this.value)
      }

      for (let i = 0; i < this.value.length; i++) {
        ;(this.sliders[i] as unknown as {setValue(v: number, b: boolean): void}).setValue(vArr[i], false)
        ;(this.sliders[i] as unknown as {_redraw(): void})._redraw()
      }

      if (this.uslider) {
        ;(this.uslider as unknown as {setValue(v: number, b: boolean): void}).setValue(val, false)
        ;(this.uslider as unknown as {_redraw(): void})._redraw()
      }
    }
  }

  setValue(value: Vector2 | Vector3 | Vector4 | Quat | null | undefined) {
    if (value === null || value === undefined) {
      return
    }

    if (value.length !== this.value.length) {
      switch (value.length) {
        case 2:
          this.value = new Vector2(value as Vector2)
          break
        case 3:
          this.value = new Vector3(value as Vector3)
          break
        case 4:
          this.value = new Vector4(value as Vector4)
          break
        default:
          throw new Error('invalid vector size ' + value.length)
      }

      this.rebuild()
    } else {
      this.castValue<typeof value>().load(value as any)
    }

    if (this.onchange) {
      this.onchange(this.value)
    }

    return this
  }

  updateDataPath() {
    if (!this.hasAttribute('datapath')) {
      return
    }

    const path = this.getAttribute('datapath')!

    const val = this.getPathValue(this.ctx, path) as (Vector2 & Vector3 & Vector4 & Quat) | undefined
    if (val === undefined) {
      this.internalDisabled = true
      return
    }

    const meta = this.getPathMeta(this.ctx, path)
    if (!isVecProperty(meta)) {
      return
    }

    const name = this.getAttribute('name') ?? meta?.uiname ?? meta?.apiname

    if (name !== undefined && name !== this.name) {
      this.name = name
      this.rebuild()
      return
    }

    const loadNumParam = (k: string, do_rebuild = false) => {
      const self = this as unknown as Record<string, unknown>
      const m = meta as unknown as Record<string, unknown> | undefined
      if (m?.[k] !== undefined && self[k] === undefined) {
        self[k] = m[k]

        if (self[k] !== m[k] && do_rebuild) {
          this.doOnce(this.rebuild)
        }
      }
    }

    loadNumParam('decimalPlaces')
    loadNumParam('baseUnit')
    loadNumParam('slideSpeed')
    loadNumParam('displayUnit')
    loadNumParam('decimalPlaces')
    loadNumParam('isInt')
    loadNumParam('radix')
    loadNumParam('step')
    loadNumParam('expRate')
    loadNumParam('stepIsRelative')

    if (meta?.hasUniformSlider !== undefined && meta.hasUniformSlider !== this.hasUniformSlider) {
      this.hasUniformSlider = meta.hasUniformSlider
      this.doOnce(this.rebuild)
    }

    if (meta?.range) {
      const update = this.range![0] !== meta.range[0] || this.range![1] !== meta.range[1]

      this.range![0] = meta.range[0]
      this.range![1] = meta.range[1]

      if (update) {
        this.doOnce(this.rebuild)
      }
    }

    this.internalDisabled = false

    let length = (val as any)?.length ?? 0

    if (meta !== undefined && meta.flag & PropFlags.USE_CUSTOM_GETSET) {
      const rdef = this.ctx.api.resolvePath(this.ctx, path)

      if (rdef !== undefined) {
        // set up context for getValue
        using ctx = meta.execWithContext()
        ctx.ctx = this.ctx
        ctx.dataref = rdef.obj
        ctx.datapath = path

        length = meta.getValue().length
      }
    }

    if (this.value.length !== length) {
      let newVal: Vector2 | Vector3 | Vector4 | Quat
      switch (length) {
        case 2:
          newVal = new Vector2(val as Vector2)
          break
        case 3:
          newVal = new Vector3(val as Vector3)
          break
        case 4:
          newVal = new Vector4(val as Vector4)
          break
        default: {
          const getValFn = (
            meta as unknown as {
              getValue(): {copy(): {load(v: unknown): Vector2 | Vector3 | Vector4 | Quat}}
            }
          ).getValue
          newVal = getValFn.call(meta).copy().load(val)
          break
        }
      }

      this.value = newVal
      this.rebuild()

      for (let i = 0; i < this.value.length; i++) {
        ;(this.sliders[i] as unknown as {setValue(v: number, b: boolean): void}).setValue(
          (newVal as unknown as Record<number, number>)[i],
          false
        )
        ;(this.sliders[i] as unknown as {_redraw(): void})._redraw()
      }
    } else {
      const valNN = val!
      if ((this.value as unknown as {vectorDistance(v: unknown): number}).vectorDistance(valNN) > 0) {
        this.value.load(valNN as Vector2 & Vector3 & Vector4 & Quat)

        if (this.uslider) {
          ;(this.uslider as unknown as {setValue(v: number, b: boolean): void}).setValue(this.uniformValue, false)
        }

        for (let i = 0; i < this.value.length; i++) {
          ;(this.sliders[i] as unknown as {setValue(v: number, b: boolean): void}).setValue(
            (val as unknown as Record<number, number>)[i],
            false
          )
          ;(this.sliders[i] as unknown as {_redraw(): void})._redraw()
        }
      }
    }
  }

  update() {
    super.update()

    this.updateDataPath()

    if (this.stepIsRelative) {
      for (const slider of this.sliders) {
        slider['step'] = ToolProperty.calcRelativeStep(this.step ?? 0, (slider as unknown as {value: number}).value)
      }
    }

    if (this.uslider) {
      this.uslider['step'] = this.step
      if (this.stepIsRelative) {
        this.uslider['step'] = ToolProperty.calcRelativeStep(this.step ?? 0, this.uniformValue)
      }
    }
  }

  static define() {
    return {
      tagname: 'vector-panel-x',
    }
  }
}
UIBase.internalRegister(VectorPanel)

export class ToolTip<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
  div: HTMLDivElement
  _start_time: number | undefined
  timeout: number | undefined
  _popup:
    | {
        background: string
        end(): void
        style: CSSStyleDeclaration
        add(child: UIBase): void
      }
    | undefined

  constructor() {
    super()

    this.visibleToPick = false
    this.div = document.createElement('div')

    this.shadow.appendChild(this.div)
    this._start_time = undefined
    this.timeout = undefined
  }

  static show<CTX extends IContextBase = IContextBase>(message: string, screen: UIBase<CTX>, x: number, y: number) {
    const ret = UIBase.createElement<ToolTip<CTX>>(this.define().tagname)

    ret._start_time = util.time_ms()
    ret.timeout = ret.getDefault('timeout') as number

    ret.text = message
    const size = ret._estimateSize()

    const pad = 5
    const size2 = [size[0] + pad, size[1] + pad]

    console.log(size2)
    const sscreen = screen as unknown as {
      popup(
        owning: UIBase,
        x: number,
        y: number
      ): {
        background: string
        end(): void
        style: CSSStyleDeclaration
        add(child: UIBase): void
      }
      size: [number, number]
    }

    x = Math.min(Math.max(x, 0), sscreen.size[0] - size2[0])
    y = Math.min(Math.max(y, 0), sscreen.size[1] - size2[1])

    const dpi = UIBase.getDPI()

    x += 10 / dpi
    y += 15 / dpi

    ret._popup = sscreen.popup(ret, x, y)
    ret._popup.background = 'rgba(0,0,0,0)'
    ret._popup.style['border'] = 'none'
    ret.div.style['padding'] = '15px'

    ret._popup.add(ret)

    return ret
  }

  end() {
    this._popup!.end()
  }

  init() {
    super.init()
    this.setCSS()
  }

  set text(val: string) {
    this.div.innerHTML = val.replace(/[\n]/g, '<br>\n')
  }

  get text() {
    return this.div.innerHTML
  }

  _estimateSize() {
    const text = this.div.textContent ?? ''
    const block = ui_base.measureTextBlock(
      this,
      text,
      undefined,
      undefined,
      undefined,
      this.getDefault('ToolTipText') as string | undefined
    )

    return [block.width + 50, block.height + 30]
  }

  update() {
    super.update()

    if (util.time_ms() - (this._start_time ?? 0) > (this.timeout ?? 0)) {
      this.end()
    }
  }

  setCSS() {
    super.setCSS()

    const color = this.getDefault('background-color') as string
    const bcolor = this.getDefault('border-color') as string

    this.background = color

    const radius = this.getDefault('border-radius', undefined, 5) as number
    const bstyle = this.getDefault('border-style', undefined, 'solid') as string
    const bwidth = this.getDefault('border-width', undefined, 1) as number
    const padding = this.getDefault('padding', undefined, 15) as number

    this.noMarginsOrPadding()

    const divStyle = this.div.style as unknown as Record<string, string>
    const selfStyle = this.style as unknown as Record<string, string>

    divStyle['padding'] = padding + 'px'

    divStyle['background-color'] = 'rgba(0,0,0,0)'
    divStyle['border'] = `${bwidth}px ${bstyle} ${bcolor}`
    divStyle['border-radius'] = radius + 'px'
    selfStyle['border-radius'] = radius + 'px'

    const font = this.getDefault('ToolTipText') as {color: string; genCSS(): string}
    this.div.style['color'] = font.color
    this.div.style['font'] = font.genCSS()
  }

  static define() {
    return {
      tagname: 'tool-tip-x',
      style  : 'tooltip',
    }
  }
}
UIBase.internalRegister(ToolTip)

window._ToolTip = ToolTip
