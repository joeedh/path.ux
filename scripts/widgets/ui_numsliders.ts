import { UIBase } from "../core/ui_base";
import { ValueButtonBase } from "./ui_widgets";
import cconst from "../config/const";
import * as ui_base from "../core/ui_base";
import * as units from "../core/units";
import { Vector2, Vector4 } from "../path-controller/util/vectormath";
import { ColumnFrame, Container, Label } from "../core/ui";
import * as util from "../path-controller/util/util";
import { NumberConstraints } from "../path-controller/toolsys/toolprop";
import { eventWasTouch } from "../path-controller/util/simple_events";
import { keymap } from "../path-controller/util/simple_events";
import { color2css, css2color } from "../core/ui_theme";
import type { ToolProperty } from "../path-controller/toolsys/toolprop";
import { IContextBase } from "../core/context_base";
import { ResolvedProp } from "../pathux";
import { TextBox } from "./ui_textbox";

export const sliderDomAttributes = new Set([
  "min",
  "max",
  "integer",
  "displayUnit",
  "baseUnit",
  "labelOnTop",
  "radix",
  "step",
  "expRate",
  "stepIsRelative",
  "decimalPlaces",
  "slideSpeed",
  "sliderDisplayExp",
]);

function updateSliderFromDom(dom: UIBase, slider: UIBase = dom) {
  slider.loadNumConstraints(undefined as unknown as ToolProperty, dom);
}

export const SliderDefaults = {
  stepIsRelative  : false,
  expRate         : 1.0 + 1.0 / 3.0,
  radix           : 10,
  decimalPlaces   : 4,
  baseUnit        : "none",
  displayUnit     : "none",
  slideSpeed      : 1.0,
  step            : 0.1,
  sliderDisplayExp: 1.0,
};

function loadNumConstraints(self: any, defaults: any = SliderDefaults, skip = new Set<string>()) {
  for (const key of NumberConstraints) {
    if (skip.has(key)) {
      continue;
    }

    if (key in defaults) {
      self[key] = defaults[key];
    } else {
      self[key] = undefined;
    }
  }
}

//use .setAttribute("linear") to disable nonlinear sliding
export class NumSlider<CTX extends IContextBase = IContextBase> extends ValueButtonBase<CTX> {
  _last_label: string | undefined;
  mdown: boolean;
  ma: InstanceType<typeof util.MovingAvg> | undefined;
  mpos: Vector2;
  start_mpos: Vector2;
  _last_overarrow: number;
  vertical: boolean;
  _last_disabled: boolean;
  _last_width: number;
  last_time: number;
  _on_click: ((e: PointerEvent) => void) | undefined;
  __pressed: boolean;
  declare g: CanvasRenderingContext2D;
  _name: string;
  _value: number;

  constructor() {
    super();
    loadNumConstraints(this);

    this._last_label = undefined;

    this.mdown = false;
    this.ma = undefined;

    this.mpos = new Vector2();
    this.start_mpos = new Vector2();

    this._last_overarrow = 0;

    this._name = "";
    this._value = 0.0;
    this.expRate = SliderDefaults.expRate;

    this.vertical = false;
    this._last_disabled = false;
    this._last_width = 0;
    this.last_time = 0;
    this._on_click = undefined;
    this.__pressed = false;

    this.range = [-1e17, 1e17];
    this.isInt = false;
    this.editAsBaseUnit = undefined;
  }

  loadNumConstraints(
    prop?: ResolvedProp | ToolProperty | undefined,
    dom?: HTMLElement | UIBase<CTX, unknown>,
    onModifiedCallback?: (this: UIBase) => void
  ): void {
    super.loadNumConstraints(prop, dom, () => {
      if (onModifiedCallback) {
        onModifiedCallback.call(this);
      }
      this._redraw();
    });
  }

  get value() {
    return this._value;
  }

  set value(val: number) {
    this.setValue(val);
  }

  /** Current name label.  If set to null label will
   * be pulled from the datapath api.*/
  get name() {
    return (this.getAttribute("name") ?? null) || this._name;
  }

  /** Current name label.  If set to null label will
   * be pulled from the datapath api.*/
  set name(name: string | null | undefined) {
    if (name === undefined || name === null) {
      this.removeAttribute("name");
    } else {
      this.setAttribute("name", name);
    }
  }

  static define() {
    return {
      tagname          : "numslider-x",
      style            : "numslider",
      parentStyle      : "button",
      havePickClipboard: true,
    };
  }

  updateWidth(w_add = 0) {
    const dpi = UIBase.getDPI();
    const wid = ~~((this.getDefault("width") as number) * dpi);

    if (w_add || wid !== this._last_width) {
      this._last_width = wid;
      this.setCSS(undefined, false);
    }
  }

  updateDataPath() {
    if (!this.hasAttribute("datapath")) {
      return;
    }

    const prop = this.getPathMeta(this.ctx, this.getAttribute("datapath") ?? "");

    if (!prop) {
      return;
    }

    let name: string | null | undefined;

    if (this.hasAttribute("name")) {
      name = this.getAttribute("name");
    } else {
      name = "" + prop.uiname;
    }

    //lazily load constraints, since there's so much
    //accessing of DOM attributes
    let updateConstraints = false;

    if (name !== null && name !== this._name) {
      this._name = name;
      this.setCSS(undefined, false);
      updateConstraints = true;
    }

    const val = this.getPathValue(this.ctx, this.getAttribute("datapath")!);

    if (val !== this._value) {
      updateConstraints = true;
      /* Note that super.updateDataPath will update .value for us*/
    }

    if (updateConstraints) {
      this.loadNumConstraints(prop);
    }

    super.updateDataPath();
  }

  update() {
    if (!!this._last_disabled !== !!this.disabled) {
      this._last_disabled = !!this.disabled;
      this._redraw(false);
      this.setCSS(undefined, false);
    }

    this.updateWidth();
    super.update(); //calls this.updateDataPath

    updateSliderFromDom(this);
  }

  clipboardCopy() {
    console.log("Copy", "" + this.value);
    cconst.setClipboardData("value", "text/plain", "" + this.value);
  }

  clipboardPaste() {
    const clipEntry = cconst.getClipboardData("text/plain");
    console.log("Paste", clipEntry);

    const data: string | undefined = typeof clipEntry === "object" ? clipEntry?.data : clipEntry;

    const displayUnit = this.editAsBaseUnit ? undefined : this.displayUnit;
    const val = units.parseValue(data!, this.baseUnit, displayUnit);

    if (typeof val === "number" && !isNaN(val)) {
      this.setValue(val);
    }
  }

  swapWithTextbox() {
    const tbox = UIBase.createElement<UIBase>("textbox-x");

    if (this.modalRunning) {
      this.popModal();
    }

    this.mdown = false;
    this._pressed = false;

    tbox.ctx = this.ctx;
    tbox._init();

    tbox.decimalPlaces = this.decimalPlaces;
    tbox.isInt = this.isInt;
    tbox.editAsBaseUnit = this.editAsBaseUnit;

    if (this.isInt && this.radix != 10) {
      let text = (this.value as number).toString(this.radix);
      if (this.radix === 2) text = "0b" + text;
      else if (this.radix === 16) text += "h";

      (tbox as unknown as { text: string }).text = text;
    } else {
      (tbox as unknown as { text: string }).text = units.buildString(
        this.value as number,
        this.baseUnit,
        this.decimalPlaces,
        this.displayUnit
      ) as string;
    }

    this.parentNode!.insertBefore(tbox, this);
    //this.remove();
    this.hidden = true;
    //this.dom.hidden = true;

    const finish = (ok: boolean) => {
      tbox.remove();
      this.hidden = false;

      if (ok) {
        let val: number | string = (tbox as unknown as { text: string }).text.trim();

        if (this.isInt && this.radix !== 10) {
          val = parseInt(val as string);
        } else {
          const displayUnit = this.editAsBaseUnit ? undefined : this.displayUnit;

          val = units.parseValue(val as string, this.baseUnit, displayUnit) as number;
        }

        if (isNaN(val as number)) {
          console.log("Text input error", val, (tbox as unknown as { text: string }).text.trim(), this.isInt);
          this.flash(ui_base.ErrorColors.ERROR);
        } else {
          this.setValue(val as number);

          if (this.onchange) {
            this.onchange(this);
          }
        }
      }
    };

    (tbox as unknown as { onend: (ok: boolean) => void }).onend = finish;
    tbox.focus();
    (tbox as unknown as { select: () => void }).select();

    //this.shadow.appendChild(tbox);
    return;
  }

  bindEvents() {
    const dir = this.range && this.range[0] > this.range[1] ? -1 : 1;

    this.addEventListener("keydown", (e) => {
      switch (e.keyCode) {
        case keymap["Left"]:
        case keymap["Down"]:
          this.setValue((this.value as number) - dir * 5 * (this.step ?? 0.1));
          break;
        case keymap["Up"]:
        case keymap["Right"]:
          this.setValue((this.value as number) + dir * 5 * (this.step ?? 0.1));
          break;
      }
    });

    const onmousedown = (e: PointerEvent) => {
      e.preventDefault();

      if (this.disabled) {
        this.mdown = false;
        this._pressed = false;
        e.stopPropagation();

        return;
      }

      if (e.button) {
        return;
      }

      this.mdown = true;
      this._pressed = true;
      this._redraw(false);

      if (this.overArrow(e.x, e.y)) {
        this._on_click!(e);
      } else {
        this.dragStart(e);
        e.stopPropagation();
      }
    };

    this._on_click = (e: PointerEvent) => {
      this.setMpos(e);

      if (this.disabled) {
        e.preventDefault();
        e.stopPropagation();

        return;
      }

      let step;

      if ((step = this.overArrow(e.x, e.y))) {
        if (e.shiftKey) {
          step *= 0.1;
        }

        this.setValue(this.value + step);
      }
    };

    this.addEventListener("pointermove", (e) => {
      this.setMpos(e);

      if (this.mdown && !this._modaldata && this.mpos.vectorDistance(this.start_mpos) > 13) {
        this.dragStart(e);
      }
    });

    this.addEventListener("dblclick", (e: MouseEvent) => {
      this.setMpos(e as unknown as PointerEvent);

      this.mdown = false;
      this._pressed = false;

      if (this.disabled || this.overArrow(e.x, e.y)) {
        e.preventDefault();
        e.stopPropagation();

        return;
      }

      e.preventDefault();
      e.stopPropagation();

      this.swapWithTextbox();
    });

    this.addEventListener(
      "pointerdown",
      (e) => {
        this.setMpos(e);

        if (this.disabled) return;
        onmousedown(e);
      },
      { capture: true }
    );

    this.addEventListener("pointerup", (e) => {
      this.mdown = false;
      this._pressed = false;
      this._redraw(false);
    });
    /*
    this.addEventListener("touchstart", (e) => {
      if (this.disabled) return;

      e.x = e.touches[0].screenX;
      e.y = e.touches[0].screenY;

      this.dragStart(e);

      e.preventDefault();
      e.stopPropagation();
    }, {passive : false});
    //*/

    //this.addEventListener("pointerup", (e) => {
    //  return onmouseup(e);
    //});

    this.addEventListener("pointerover", (e: PointerEvent) => {
      this.setMpos(e);
      if (this.disabled) return;

      if (!this._highlight) {
        this._highlight = true;
        this._repos_canvas();
        this._redraw(false);
      }
    });

    this.addEventListener("blur", (e) => {
      this._highlight = false;
      this.mdown = false;
    });

    this.addEventListener("pointerout", (e) => {
      this.setMpos(e as unknown as PointerEvent);
      if (this.disabled) return;

      this._highlight = false;

      this.dom._background = this.getDefault("background-color");
      this._repos_canvas();
      this._redraw(false);
    });
  }

  overArrow(x: number, y: number) {
    const r = this.getBoundingClientRect();
    let rwidth;
    let rx;

    if (this.vertical) {
      rwidth = r.height;
      rx = r.y;
      x = y;
    } else {
      rwidth = r.width;
      rx = r.x;
    }

    x -= rx;
    const sz = this._getArrowSize();

    const szmargin = sz + cconst.numSliderArrowLimit;

    let step = this.step || 0.01;

    if (this.isInt) {
      step = Math.max(step, 1);
    }

    if (isNaN(step)) {
      console.error("NaN step size", "step:", this.step, "numslider:", this._id);
      this.flash("red");
      step = this.isInt ? 1 : 0.1;
    }

    if (x < szmargin) {
      return -step;
    } else if (x > rwidth - szmargin) {
      return step;
    }

    return 0;
  }

  doRange() {
    console.warn("Deprecated: NumSlider.prototype.doRange, use loadNumConstraints instead!");
    this.loadNumConstraints();
  }

  setValue(value: number, fire_onchange = true, setDataPath = true, checkConstraints = true) {
    value = Math.min(Math.max(value, this.range![0]), this.range![1]);

    this._value = value;

    if (this.hasAttribute("integer")) {
      this.isInt = true;
    }

    if (this.isInt) {
      this._value = Math.floor(this._value);
    }

    if (checkConstraints) {
      this.loadNumConstraints();
    }

    if (setDataPath && this.ctx && this.hasAttribute("datapath")) {
      this.setPathValue(this.ctx, this.getAttribute("datapath")!, this._value);
    }

    if (fire_onchange && this.onchange) {
      this.onchange(this.value);
    }

    this._redraw(false);
  }

  setMpos(e: PointerEvent) {
    this.mpos[0] = e.x;
    this.mpos[1] = e.y;

    if (!this.mdown) {
      this.start_mpos[0] = e.x;
      this.start_mpos[1] = e.y;
    }

    const over = this.overArrow(e.x, e.y);

    if (over !== this._last_overarrow) {
      this._last_overarrow = over;
      this._redraw(false);
    }
  }

  dragStart(e: PointerEvent) {
    this.mdown = false;
    this._pressed = true;

    if (this.disabled) return;

    if (this.modalRunning) {
      console.log("modal already running for numslider", this);
      return;
    }

    this.last_time = util.time_ms();

    let last_background = this.dom._background;
    let cancel: (restore_value: boolean) => void;

    this.ma = new util.MovingAvg(eventWasTouch(e) ? 8 : 2);

    const startvalue = this.value as number;
    let value = startvalue;

    let startx = this.vertical ? e.y : e.x;
    const starty = this.vertical ? e.x : e.y;
    let sumdelta = 0;

    this.dom._background = this.getDefault("BoxDepressed");
    const fire = () => {
      if (this.onchange) {
        this.onchange(this);
      }
    };

    const handlers = {
      on_keydown: (e: KeyboardEvent) => {
        switch (e.keyCode) {
          case 27: //escape key
            cancel(true);
          case 13: //enter key
            cancel(false);
            break;
        }

        e.preventDefault();
        e.stopPropagation();
      },

      on_pointermove: (e: PointerEvent) => {
        if (this.disabled) return;

        e.preventDefault();
        e.stopPropagation();

        const x = this.ma!.add(this.vertical ? e.y : e.x);
        let dx = x - startx;
        startx = x;

        if (util.time_ms() - this.last_time < 35) {
          return;
        }
        this.last_time = util.time_ms();

        if (e.shiftKey) {
          dx *= 0.1;
        }

        dx *= this.vertical ? -1 : 1;

        sumdelta += Math.abs(dx);

        value += dx * (this.step ?? 0.1) * 0.1 * (this.slideSpeed ?? 1.0);

        let dvalue = value - startvalue;
        const dsign = Math.sign(dvalue);

        const expRate = this.expRate ?? 1.0;

        //if (eventWasTouch(e)) {
        //  expRate = (1 + expRate)*0.5;
        //}

        if (!this.hasAttribute("linear")) {
          dvalue = Math.pow(Math.abs(dvalue), expRate) * dsign;
        }

        this.value = startvalue + dvalue;

        /*
        if (e.shiftKey) {
          dx *= 0.1;
          this.value = startvalue2 + dx*0.1*this.step*this.slideSpeed;
          startvalue3 = this.value;
        } else {
          startvalue2 = this.value;
          this.value = startvalue3 + dx*0.1*this.step*this.slideSpeed;
        }*/

        this.updateWidth();
        this._redraw(false);
        fire();
      },

      on_pointerup: (e: PointerEvent) => {
        this.setMpos(e);

        this.undoBreakPoint();
        cancel(false);

        e.preventDefault();
        e.stopPropagation();
      },

      on_pointerout: (e: PointerEvent) => {
        last_background = this.getDefault<string>("background-color");

        e.preventDefault();
        e.stopPropagation();
      },

      on_pointerover: (e: PointerEvent) => {
        last_background = this.getDefault<string>("BoxHighlight");

        e.preventDefault();
        e.stopPropagation();
      },

      on_pointerdown: (e: PointerEvent) => {
        this.popModal();
      },
    };

    //events.pushModal(this.getScreen(), handlers);
    this.pushModal(handlers);

    cancel = (restore_value: boolean) => {
      this._pressed = false;

      if (restore_value) {
        this.value = startvalue;
        this.updateWidth();
        fire();
      }

      this.dom._background = last_background; //ui_base.getDefault("background-color");
      this._redraw(false);

      this.popModal();
    };
  }

  get _pressed() {
    return this.__pressed;
  }

  set _pressed(v: boolean) {
    /* Try to improve usability on pen/touch displays
     * by forcing pressed state to last at least 100ms.
     */
    if (!v) {
      window.setTimeout(() => {
        const redraw = this.__pressed;

        this.__pressed = false;
        if (redraw) {
          this._redraw(false);
        }
      }, 100);
    } else {
      this.__pressed = v;
    }
  }

  setCSS(unused_setBG?: unknown, fromRedraw?: boolean) {
    /* Do not call parent class implementation. */

    const dpi = this.getDPI();
    const ts = (this.getDefault("DefaultText") as { size: number }).size * UIBase.getDPI();
    const label = this._genLabel();

    let tw =
      ui_base.measureText(this, label, {
        size: ts,
        font: this.getDefault("DefaultText") as import("../core/cssfont.js").CSSFont,
      }).width / dpi;

    /* Enforce a minimum size based on final text. */
    tw = Math.max(tw + this._getArrowSize() * 1, this.getDefault("width") as number);

    tw += ts;
    tw = ~~tw;

    let w: number;
    let h: number;

    if (this.vertical) {
      w = this.getDefault("height") as number;
      h = tw;
    } else {
      h = this.getDefault("height") as number;
      w = tw;
    }

    w = ~~(w * dpi);
    h = ~~(h * dpi);

    this.style["width"] = this.dom.style["width"] = w / dpi + "px";
    this.style["height"] = this.dom.style["height"] = h / dpi + "px";
    this.dom.width = w;
    this.dom.height = h;

    if (!fromRedraw) {
      this._repos_canvas();
      this._redraw(true);
    }
  }

  _repos_canvas() {
    //super._repos_canvas();
  }

  updateDefaultSize() {
    /* Do nothing, don't invoke parent class method. */
  }

  updateName(force?: boolean) {
    if (!this.hasAttribute("name")) {
      return;
    }

    const name = this.getAttribute("name");

    if (name !== null && (force || name !== this._name)) {
      this._name = name;
      this.setCSS(undefined, false);
    }

    const label = this._genLabel();
    if (label !== this._last_label) {
      this._last_label = label;
      this.setCSS(undefined, false);
    }
  }

  _genLabel() {
    const val = this.value;
    let text: string;

    if (val === undefined) {
      text = "error";
    } else {
      let numVal = val === undefined ? 0.0 : val;

      if (this.isInt) {
        numVal = Math.floor(numVal);
      }

      const valStr = units.buildString(numVal, this.baseUnit, this.decimalPlaces, this.displayUnit);

      text = valStr;
      if (this._name) {
        text = this._name + ": " + text;
      } else if (this.hasAttribute("name")) {
        text = (this.getAttribute("name") ?? "") + ": " + text;
      }
    }

    return text;
  }

  _redraw(fromCSS?: boolean) {
    if (!fromCSS) {
      this.setCSS(undefined, true);
    }

    const g = this.g;
    const canvas = this.dom;

    const dpi = this.getDPI();
    const disabled = this.disabled;

    /* Fallback on BoxHighlight for backwards compatibility with
     * old themes. */

    const over = !this._modaldata ? this.overArrow(this.mpos[0], this.mpos[1]) : 0;

    let subkey = undefined;
    const pressed = this._pressed && !over;

    if (this._highlight && pressed) {
      subkey = "highlight-pressed";
    } else if (this._highlight) {
      subkey = "highlight";
    } else if (pressed) {
      subkey = "pressed";
    }

    const getDefault = <T extends ui_base.DefaultTypes>(
      key: string,
      backupval?: T,
      subkey2: string | undefined = subkey
    ): T => {
      /* Have highlight-pressed fall back to pressed. */
      if (subkey2 === "highlight-pressed" && !this.hasClassSubDefault(subkey2, key, false)) {
        return this.getSubDefault<T>("pressed", key, undefined, backupval);
      }

      if (!subkey2) {
        return this.getDefault<T>(key, undefined, backupval);
      } else {
        return this.getSubDefault<T>(subkey2, key, undefined, backupval);
      }
    };

    let r = getDefault<number>("border-radius");
    if (this.isInt) {
      r *= 0.25;
    }

    const boxbg = getDefault<string>("background-color")!;

    ui_base.drawRoundBox(
      this,
      this.dom,
      this.g,
      undefined,
      undefined,
      r,
      "fill",
      disabled ? getDefault<string>("DisabledBG") : boxbg
    );
    ui_base.drawRoundBox(
      this,
      this.dom,
      this.g,
      undefined,
      undefined,
      r,
      "stroke",
      disabled ? (getDefault("DisabledBG") as string) : (getDefault("border-color") as string)
    );

    const ts = (getDefault("DefaultText") as { size: number }).size;
    const text = this._genLabel();

    const cx = ts + this._getArrowSize();
    const cy = (this.dom as HTMLCanvasElement).height / 2;

    this.dom.font = undefined;

    g.save();

    const th = Math.PI * 0.5;

    if (this.vertical) {
      g.rotate(th);

      ui_base.drawText(this, cx, -ts * 0.5, text, {
        canvas: this.dom,
        g     : this.g,
        size  : ts,
        font  : getDefault("DefaultText") as unknown as import("../core/cssfont.js").CSSFont | string | undefined,
      });
      g.restore();
    } else {
      ui_base.drawText(this, cx, cy + ts / 2, text, {
        canvas: this.dom,
        g     : this.g,
        size  : ts,
        font  : getDefault("DefaultText") as unknown as import("../core/cssfont.js").CSSFont | string | undefined,
      });
    }

    const parseArrowColor = (arrowcolor: string): string => {
      arrowcolor = arrowcolor.trim();
      if (arrowcolor.endsWith("%")) {
        arrowcolor = arrowcolor.slice(0, arrowcolor.length - 1).trim();

        const perc = parseFloat(arrowcolor) / 100.0;
        const c = css2color(this.getDefault("background-color") as string);

        let f = (c[0] + c[1] + c[2]) * perc;

        f = ~~(f * 255);
        arrowcolor = `rgba(${f},${f},${f},0.95)`;
      }
      return arrowcolor;
    };

    let arrowcolor_base: string;
    let arrowcolor: string;

    arrowcolor_base = this.getDefault("arrow-color") as string;
    arrowcolor_base = parseArrowColor(arrowcolor_base);

    let arrowcolorValue: string | Vector4;

    if (this._pressed && this._highlight) {
      arrowcolorValue = (this.getSubDefault("highlight-pressed", "arrow-color", undefined, undefined, false) ??
        "") as string;

      if (!arrowcolorValue) {
        arrowcolorValue = (this.getSubDefault("pressed", "arrow-color") ?? "") as string;
      }

      if (!arrowcolorValue) {
        arrowcolorValue = "33%";
      }
    } else if (this._pressed) {
      arrowcolorValue = (this.getSubDefault("pressed", "arrow-color", "arrow-color", "33%") ?? "") as string;
    } else if (this._highlight) {
      if (!this.hasClassSubDefault("highlight", "arrow-color", false)) {
        if (this.hasClassSubDefault("highlight", "background-color", false)) {
          arrowcolorValue = (this.getSubDefault("highlight", "background-color") ?? "") as string;
        } else {
          arrowcolorValue = (this.getDefault("BoxHighlight") ?? "") as string;
        }

        const colorVector = css2color(arrowcolorValue as string);
        const base = css2color((this.getSubDefault("pressed", "arrow-color", undefined, "33%") ?? "") as string);

        colorVector.interp(base, 0.25);
        arrowcolorValue = color2css(colorVector);
      } else {
        arrowcolorValue = (this.getSubDefault("highlight", "arrow-color") ?? "") as string;
      }
    } else {
      arrowcolorValue = (getDefault("arrow-color", "33%") ?? "") as string;
    }

    if (this._pressed) {
      //      arrowcolorValue = this.getSubDefault("pressed", "arrow-color");
    }

    arrowcolor = parseArrowColor(arrowcolorValue as string);

    const d = 7;
    const w = (canvas as HTMLCanvasElement).width;
    const h = (canvas as HTMLCanvasElement).height;
    const sz = this._getArrowSize();

    if (this.vertical) {
      g.beginPath();
      g.moveTo(w * 0.5, d);
      g.lineTo(w * 0.5 + sz * 0.5, d + sz);
      g.lineTo(w * 0.5 - sz * 0.5, d + sz);

      g.fillStyle = over < 0 ? arrowcolor : arrowcolor_base;
      g.fill();

      g.beginPath();
      g.moveTo(w * 0.5, h - d);
      g.lineTo(w * 0.5 + sz * 0.5, h - sz - d);
      g.lineTo(w * 0.5 - sz * 0.5, h - sz - d);

      g.fillStyle = over > 0 ? arrowcolor : arrowcolor_base;
      g.fill();
    } else {
      g.beginPath();
      g.moveTo(d, h * 0.5);
      g.lineTo(d + sz, h * 0.5 + sz * 0.5);
      g.lineTo(d + sz, h * 0.5 - sz * 0.5);

      g.fillStyle = over < 0 ? arrowcolor : arrowcolor_base;
      g.fill();

      g.beginPath();
      g.moveTo(w - d, h * 0.5);
      g.lineTo(w - sz - d, h * 0.5 + sz * 0.5);
      g.lineTo(w - sz - d, h * 0.5 - sz * 0.5);

      g.fillStyle = over > 0 ? arrowcolor : arrowcolor_base;
      g.fill();
    }

    g.fill();
  }

  _getArrowSize() {
    return UIBase.getDPI() * 10;
  }
}
UIBase.internalRegister(NumSlider);

export class NumSliderSimpleBase<CTX extends IContextBase> extends UIBase<CTX> {
  canvas: HTMLCanvasElement;
  g: CanvasRenderingContext2D | null;
  highlight: boolean;
  _value: number;
  ma: InstanceType<typeof util.MovingAvg> | undefined;
  _focus: boolean;
  modal: unknown;
  _last_slider_key: string;

  constructor() {
    super();

    loadNumConstraints(this);
    this.baseUnit = undefined;
    this.displayUnit = undefined;
    this.editAsBaseUnit = undefined;
    this.sliderDisplayExp = undefined;

    this.canvas = document.createElement("canvas");
    this.g = this.canvas.getContext("2d");

    this.canvas.style["pointerEvents"] = "none";

    this.highlight = false;
    this.isInt = false;

    this.shadow.appendChild(this.canvas);
    this.range = [0, 1];

    /** if not undefined defines subrange of visible slider */
    this.uiRange = undefined;

    this.step = 0.1;
    this._value = 0.5;
    this.ma = undefined;
    this._focus = false;

    this.modal = undefined;

    this._last_slider_key = "";
  }

  loadNumConstraints(
    prop?: ResolvedProp | ToolProperty | undefined,
    dom?: HTMLElement | UIBase<CTX, unknown>,
    onModifiedCallback?: (this: UIBase) => void
  ): void {
    super.loadNumConstraints(prop, dom, () => {
      if (onModifiedCallback) {
        onModifiedCallback.call(this);
      }
      this._redraw();
    });
  }

  get value() {
    return this._value;
  }

  set value(val) {
    this.setValue(val);
  }

  static define() {
    return {
      tagname    : "numslider-simple-base-x",
      style      : "numslider_simple",
      parentStyle: "button",
    };
  }

  setValue(val: number, fire_onchange = true, setDataPath = true) {
    val = Math.min(Math.max(val, this.range![0]), this.range![1]);

    if (this.isInt) {
      val = Math.floor(val);
    }

    if (this._value !== val) {
      this._value = val;
      this._redraw();

      if (this.onchange && fire_onchange) {
        this.onchange(val);
      }

      if (setDataPath && this.getAttribute("datapath")) {
        const path = this.getAttribute("datapath") ?? "";
        this.setPathValue(this.ctx, path, this._value);
      }
    }
  }

  updateDataPath() {
    if (!this.hasAttribute("datapath")) {
      return;
    }

    const path = this.getAttribute("datapath");

    if (!path || path === "null" || path === "undefined") {
      return;
    }

    let val = this.getPathValue(this.ctx, path) as unknown as number;

    if (this.isInt) {
      val = Math.floor(val);
    }

    if (val !== this._value) {
      const prop = this.getPathMeta(this.ctx, path);
      if (!prop) {
        return;
      }

      this.loadNumConstraints(prop);
      this.setValue(val, true, false);
    }
  }

  _setFromMouse(e: PointerEvent) {
    const rect = this.getClientRects()[0];
    if (rect === undefined) {
      return;
    }

    const x = e.x - rect.left;
    const dpi = UIBase.getDPI();
    const co = this._getButtonPos();

    const val = this._invertButtonX(x * dpi);
    this.value = val;
  }

  _startModal(e: PointerEvent | undefined) {
    if (this.disabled) {
      return;
    }

    if (e !== undefined) {
      this._setFromMouse(e);
    }
    const dom = window;
    const evtargs = { capture: false };

    if (this.modal) {
      console.warn("Double call to _startModal!");
      return;
    }

    this.ma = new util.MovingAvg(e && eventWasTouch(e) ? 4 : 2);
    let handlers: unknown;

    const end = () => {
      if (handlers === undefined) {
        return;
      }

      this.popModal();
      handlers = undefined;
    };

    handlers = {
      pointermove: (e: PointerEvent) => {
        let x = e.x;
        const y = e.y;

        x = this.ma!.add(x);

        this._setFromMouse(e);
      },

      pointerover : (e: PointerEvent) => {},
      pointerout  : (e: PointerEvent) => {},
      pointerleave: (e: PointerEvent) => {},
      pointerenter: (e: PointerEvent) => {},
      blur        : (e: Event) => {},
      focus       : (e: Event) => {},

      pointerup: (e: PointerEvent) => {
        this.undoBreakPoint();
        end();
      },

      keydown: (e: KeyboardEvent) => {
        switch (e.keyCode) {
          case keymap["Enter"]:
          case keymap["Space"]:
          case keymap["Escape"]:
            end();
        }
      },
    } as Record<string, (e: Event | KeyboardEvent | PointerEvent) => void>;

    function makefunc(
      f: (e: Event | KeyboardEvent | PointerEvent) => void
    ): (e: Event | KeyboardEvent | PointerEvent) => void {
      return (e: Event | KeyboardEvent | PointerEvent) => {
        if (e instanceof Event) {
          e.stopPropagation();
          e.preventDefault();
        }

        return f(e);
      };
    }

    for (const k in handlers as Record<string, unknown>) {
      (handlers as Record<string, unknown>)[k] = makefunc(
        (handlers as Record<string, (e: Event | KeyboardEvent | PointerEvent) => void>)[k]
      );
    }

    this.pushModal(handlers as unknown);
  }

  init() {
    super.init();

    if (!this.hasAttribute("tab-index")) {
      this.setAttribute("tab-index", "0");
    }

    this.updateSize();

    this.addEventListener("keydown", (e: KeyboardEvent) => {
      const dt = this.range![1] > this.range![0] ? 1 : -1;

      switch (e.keyCode) {
        case keymap["Left"]:
        case keymap["Right"]: {
          let fac = this.step ?? 0.1;

          if (e.shiftKey) {
            fac *= 0.1;
          }

          if (this.isInt) {
            fac = Math.max(fac, 1);
          }

          this.value += e.keyCode === keymap["Left"] ? -dt * fac : dt * fac;

          break;
        }
      }
    });

    this.addEventListener("focusin", () => {
      if (this.disabled) return;

      this._focus = true;
      this._redraw();
      this.focus();
    });

    this.addEventListener("pointerdown", (e: PointerEvent) => {
      if (this.disabled) {
        return;
      }

      /* ensure browser doesn't spawn its own (incompatible)
         touch->mouse emulation events}; */
      e.preventDefault();
      this._startModal(e);
    });

    this.addEventListener("pointerin", (e: Event) => {
      this.setHighlight(e as PointerEvent);
      this._redraw();
    });
    this.addEventListener("pointerout", (e: PointerEvent) => {
      this.highlight = false;
      this._redraw();
    });
    this.addEventListener("pointerover", (e: PointerEvent) => {
      this.setHighlight(e);
      this._redraw();
    });
    this.addEventListener("pointermove", (e: PointerEvent) => {
      this.setHighlight(e);
      this._redraw();
    });
    this.addEventListener("pointerleave", (e: PointerEvent) => {
      this.highlight = false;
      this._redraw();
    });
    this.addEventListener("blur", (e: Event) => {
      this._focus = false;
      this.highlight = false;
      this._redraw();
    });

    this.setCSS();
  }

  setHighlight(e: PointerEvent) {
    this.highlight = this.isOverButton(e) ? true : false;
  }

  _redraw() {
    const g = this.g;
    const canvas = this.canvas;
    const w = canvas.width;
    const h = canvas.height;
    const dpi = UIBase.getDPI();

    let color = this.getDefault("background-color") as unknown as string;
    const sh = ~~((this.getDefault("SlideHeight") as unknown as number) * dpi + 0.5);

    g!.clearRect(0, 0, canvas.width, canvas.height);

    g!.fillStyle = color;

    const y = (h - sh) * 0.5;

    const r = this.getDefault("border-radius") as unknown as number;

    g!.translate(0, y);
    ui_base.drawRoundBox(this, this.canvas, g!, w, sh, r, "fill", color, undefined, true);

    const bcolor = this.getDefault("border-color") as unknown as string;
    ui_base.drawRoundBox(this, this.canvas, g!, w, sh, r, "stroke", bcolor, undefined, true);
    g!.translate(0, -y);

    if (this.sliderDisplayExp && this.sliderDisplayExp !== 1.0) {
      g!.strokeStyle = ((this.getDefault("SliderDivColor") as unknown as string) ||
        this.getDefault("border-color") ||
        "grey") as unknown as string;

      const steps = 8;
      let t = 0.0;
      const dt = 1.0 / (steps - 1);

      g!.beginPath();
      for (let i = 0; i < steps; i++, t += dt) {
        const t2 = Math.pow(t, this.sliderDisplayExp!);

        const x = t2 * w;
        g!.moveTo(x, y);
        g!.lineTo(x, h - y);
      }
      g!.stroke();
    }

    if (this.highlight) {
      color = this.getDefault("BoxHighlight") as unknown as string;
    } else {
      color = this.getDefault("border-color") as unknown as string;
    }

    //g.strokeStyle = color;
    //g.stroke();

    const co = this._getButtonPos();

    g!.beginPath();

    if (this.highlight) {
      color = this.getDefault("BoxHighlight") as unknown as string;
    } else {
      color = this.getDefault("border-color") as unknown as string;
    }

    g!.arc(co[0], co[1], Math.abs(co[2]), -Math.PI, Math.PI);
    g!.fill();

    g!.strokeStyle = color;
    g!.stroke();

    g!.beginPath();
    g!.setLineDash([4, 4]);

    if (this._focus) {
      g!.strokeStyle = this.getDefault("BoxHighlight") as unknown as string;
      g!.arc(co[0], co[1], co[2] - 4, -Math.PI, Math.PI);
      g!.stroke();
    }

    g!.setLineDash([]);
  }

  isOverButton(e: PointerEvent) {
    let x = e.x;
    let y = e.y;
    const rect = this.getClientRects()[0];

    if (!rect) {
      return false;
    }

    x -= rect.left;
    y -= rect.top;

    const co = this._getButtonPos();

    const dpi = UIBase.getDPI();
    const dv = new Vector2([co[0] / dpi - x, co[1] / dpi - y]);
    const dis = dv.vectorLength();

    return dis < co[2] / dpi;
  }

  _invertButtonX(x: number): number {
    const w = this.canvas.width;
    const dpi = UIBase.getDPI();
    const sh = ~~((this.getDefault("SlideHeight") as unknown as number) * dpi + 0.5);
    const boxw = this.canvas.height - 4;
    const w2 = w - boxw;

    const range = this.uiRange || this.range!;

    x = (x - boxw * 0.5) / w2;
    if (this.sliderDisplayExp) {
      x = Math.max(x, 0.0);
      x = Math.pow(x, 1.0 / this.sliderDisplayExp);
    }
    x = x * (range[1] - range[0]) + range[0];

    return x;
  }

  _getButtonPos() {
    const w = this.canvas.width;
    const dpi = UIBase.getDPI();
    const sh = ~~((this.getDefault("SlideHeight") as unknown as number) * dpi + 0.5);
    let x = this._value;

    const range = this.uiRange || this.range!;

    x = (x - range[0]) / (range[1] - range[0]);

    if (this.sliderDisplayExp) {
      x = Math.pow(x, this.sliderDisplayExp);
    }

    const boxw = this.canvas.height - 4;
    const w2 = w - boxw;

    x = x * w2 + boxw * 0.5;

    return [x, boxw * 0.5, boxw * 0.5];
  }

  setCSS() {
    //UIBase.setCSS does annoying things with background-color
    //super.setCSS();

    const dpi = UIBase.getDPI();
    this.style["minWidth"] = this.getDefault("width") + "px";
    this.style["width"] = this.getDefault("width") + "px";

    this.canvas.style["width"] = "" + this.canvas.width / dpi + "px";
    this.canvas.style["height"] = "" + this.canvas.height / dpi + "px`";

    this.canvas.height = this.getDefault<number>("height") * UIBase.getDPI();

    this._redraw();
  }

  updateSize() {
    if (this.canvas === undefined) {
      return;
    }

    const rect = this.getClientRects()[0];

    if (rect === undefined) {
      return;
    }

    const dpi = UIBase.getDPI();
    const canvas = this.canvas;
    const w = ~~(rect.width * dpi);
    const h = ~~(rect.height * dpi);

    if (w !== canvas.width || h !== canvas.height) {
      this.canvas.width = w;
      this.canvas.height = h;

      this.setCSS();
      this._redraw();
    }
  }

  _ondestroy() {
    if (this.modalRunning) {
      this.popModal();
    }
  }

  update() {
    super.update();

    /*
    if (this.checkThemeUpdate()) {
      this._redraw();
    }
    */

    const key = "" + this.getDefault("width") + ":" + this.getDefault("height") + ":" + this.getDefault("SlideHeight");

    if (key !== this._last_slider_key) {
      this._last_slider_key = key;

      this.flushUpdate();
      this.setCSS();
      this._redraw();
    }

    if (parseInt(this.getAttribute("tab-index")!) !== this.tabIndex) {
      this.tabIndex = parseInt(this.getAttribute("tab-index")!);
    }

    this.updateSize();
    this.updateDataPath();
    updateSliderFromDom(this);
  }
}
UIBase.internalRegister(NumSliderSimpleBase);

export class SliderWithTextbox<CTX extends IContextBase = IContextBase> extends ColumnFrame<CTX> {
  _value: number;
  _name: string | undefined;
  _lock_textbox: boolean;
  _labelOnTop: boolean | undefined;
  _last_label_on_top: boolean | undefined;
  container: Container<CTX>;
  declare _numslider: NumSlider<CTX>;
  _last_value: number | undefined;
  declare l: Label<CTX>;
  _textbox: TextBox<CTX>;

  constructor() {
    super();

    this._value = 0;
    this._name = undefined;
    this._lock_textbox = false;
    this._labelOnTop = undefined;

    this._last_label_on_top = undefined;

    this.container = this;

    this._textbox = UIBase.createElement("textbox-x");
    this._textbox.width = 55;

    this._textbox.overrideDefault("width", this.getDefault("TextBoxWidth"));
    this._textbox.setAttribute("class", "numslider_simple_textbox");
    this._textbox.startSelected = true;

    this._last_value = undefined;
  }

  get addLabel() {
    if (this.hasAttribute("add-label")) {
      const val = ("" + this.getAttribute("add-label")).toLowerCase();
      return val === "true" || val === "yes";
    }

    return this.getDefault("addLabel");
  }

  set addLabel(v) {
    this.setAttribute("add-label", v ? "true" : "false");

    if (this.addLabel && !this.l) {
      this.doOnce(this.rebuild);
    }
  }

  /**
   * whether to put label on top or to the left of sliders
   *
   * If undefined value will be either this.getAtttribute("labelOnTop"),
   * if "labelOnTop" attribute exists, or it will be this.getDefault("labelOnTop")
   * (theme default)
   **/
  get labelOnTop() {
    let ret = this._labelOnTop;

    if (ret === undefined && this.hasAttribute("labelOnTop")) {
      let val = this.getAttribute("labelOnTop");
      if (typeof val === "string") {
        val = val.toLowerCase();
        ret = val === "true" || val === "yes";
      } else {
        ret = !!val;
      }
    }

    if (ret === undefined) {
      ret = Boolean(this.getDefault("labelOnTop") as number);
    }

    return !!ret;
  }

  set labelOnTop(v) {
    this._labelOnTop = v;
  }

  get numslider() {
    return this._numslider!;
  }

  //child classes set this in their constructors
  set numslider(v: this["_numslider"]) {
    this._numslider = v;
    this._textbox.range = this._numslider.range;
  }

  get editAsBaseUnit() {
    return this._numslider.editAsBaseUnit;
  }

  set editAsBaseUnit(v: boolean | undefined) {
    this.numslider.editAsBaseUnit = v;
  }

  get range() {
    return this.numslider.range;
  }

  set range(v: [number, number] | undefined) {
    this.numslider.range = v as [number, number];
  }

  get step() {
    return this.numslider.step;
  }

  set step(v: number | undefined) {
    this.numslider.step = v;
  }

  get expRate() {
    return this.numslider.expRate;
  }

  set expRate(v: number | undefined) {
    this.numslider.expRate = v;
  }

  get decimalPlaces() {
    return this.numslider.decimalPlaces;
  }

  set decimalPlaces(v: number | undefined) {
    this.numslider.decimalPlaces = v;
  }

  get isInt() {
    return this.numslider.isInt;
  }

  set isInt(v: boolean | undefined) {
    this.numslider.isInt = v;
  }

  get slideSpeed() {
    return this.numslider.slideSpeed;
  }

  set slideSpeed(v: number | undefined) {
    this.numslider.slideSpeed = v;
  }

  get sliderDisplayExp() {
    return this.numslider.sliderDisplayExp;
  }

  set sliderDisplayExp(v: number | undefined) {
    this.numslider.sliderDisplayExp = v;
  }

  get radix() {
    return this.numslider.radix;
  }

  set radix(v: number | undefined) {
    this.numslider.radix = v;
  }

  get stepIsRelative() {
    return this.numslider.stepIsRelative;
  }

  set stepIsRelative(v: boolean | undefined) {
    this.numslider.stepIsRelative = v;
  }

  get displayUnit() {
    return this.numslider.displayUnit;
  }

  set displayUnit(val: string | undefined) {
    const update = val !== this.displayUnit;

    this.numslider.displayUnit = this._textbox.displayUnit = val;

    if (update) {
      //this.numslider._redraw();
      this.updateTextBox();
    }
  }

  get baseUnit() {
    return this._textbox.baseUnit;
  }

  set baseUnit(val: string | undefined) {
    const update = val !== this.baseUnit;
    this.numslider.baseUnit = this._textbox.baseUnit = val;

    if (update) {
      //this.slider._redraw();
      this.updateTextBox();
    }
  }

  get realTimeTextBox() {
    let ret = this.getAttribute("realtime");

    if (!ret) {
      return false;
    }

    ret = ret.toLowerCase().trim();

    return ret === "true" || ret === "on" || ret === "yes";
  }

  set realTimeTextBox(val) {
    this.setAttribute("realtime", val ? "true" : "false");
  }

  get value() {
    return this._value;
  }

  set value(val) {
    this.setValue(val);
  }

  init() {
    super.init();

    this.rebuild();
    window.setTimeout(() => this.updateTextBox(), 500);
  }

  rebuild() {
    this._last_label_on_top = this.labelOnTop;

    this.container.clear();

    if (!this.labelOnTop) {
      this.container = this.row();
    } else {
      this.container = this;
    }

    if (this.hasAttribute("name")) {
      this._name = this.getAttribute("name") ?? undefined;
    } else {
      this._name = "slider";
    }

    if (this.addLabel) {
      this.l = this.container.label(this._name!);
      this.l.overrideClass("numslider_textbox");
      this.l.font = "TitleText";
      this.l.style["display"] = "float";
      this.l.style["position"] = "relative";
    }

    const strip = this.container.row();
    //strip.style['justify-content'] = 'space-between';
    strip.add(this.numslider);

    const textbox = this._textbox;
    this._textbox.overrideDefault("width", this.getDefault("TextBoxWidth"));

    const apply_textbox = () => {
      const text = textbox.text as unknown as string;

      if (!units.isNumber(text)) {
        textbox.flash?.("red");
        return;
      } else {
        textbox.flash?.("green");

        const displayUnit = this.editAsBaseUnit ? undefined : this.displayUnit;

        let f = units.parseValue(text as string, this.baseUnit, displayUnit);

        if (isNaN(f as unknown as number)) {
          this.flash("red");
          return;
        }

        if (this.isInt) {
          f = Math.floor(f as unknown as number);
        }

        this._lock_textbox = true;
        this._numslider.setValue?.(f);
        this._lock_textbox = false;
      }
    };

    if (this.realTimeTextBox) {
      textbox.onchange = apply_textbox;
    }

    textbox.onend = apply_textbox;

    textbox.ctx = this.ctx;
    textbox.packflag = textbox.packflag | this.inherit_packflag;
    this._textbox.overrideDefault?.("width", this.getDefault("TextBoxWidth"));

    textbox.style["height"] = this.getDefault<number>("height") - 2 + "px";
    textbox._init();

    strip.add(textbox);

    textbox.setCSS();
    this.linkTextBox();

    let in_onchange = 0;

    this.numslider.onchange = (val) => {
      this._value = this.numslider.value;
      this.updateTextBox();

      if (in_onchange) {
        return;
      }

      if (this.onchange !== undefined) {
        in_onchange++;
        try {
          if (this.onchange) {
            this.onchange(this);
          }
        } catch (error) {
          util.print_stack(error as Error);
        }
      }

      in_onchange--;
    };
  }

  updateTextBox() {
    if (!this._init_done) {
      return;
    }

    if (this._lock_textbox || this._textbox.editing) return;

    this._textbox.text = this.formatNumber(this._value);
    this._textbox.update();

    updateSliderFromDom(this, this.numslider);
  }

  linkTextBox() {
    this.updateTextBox();

    const onchange = this.numslider.onchange!;
    this.numslider.onchange = (e: any) => {
      this._value = e.value;
      this.updateTextBox();
      onchange(e);
    };
  }

  setValue(val: number, fire_onchange = true) {
    this._value = val;
    this.numslider.setValue(val, fire_onchange);
    this.updateTextBox();
  }

  updateName() {
    let name = this.getAttribute("name");

    if (!name && this.hasAttribute("datapath")) {
      const prop = this.getPathMeta(this.ctx, this.getAttribute("datapath")!);

      if (prop) {
        name = prop.uiname!;
      }
    }

    if (!name) {
      name = "[error]";
    }

    if (name !== this._name) {
      this._name = name;
      if (this.l) {
        this.l.text = name;
      }
    }
  }

  updateLabelOnTop() {
    if (this.labelOnTop !== this._last_label_on_top) {
      this._last_label_on_top = this.labelOnTop;
      this.rebuild();
    }
  }

  updateDataPath() {
    if (!this.ctx || !this.getAttribute("datapath")) {
      return;
    }

    const prop = this.getPathMeta(this.ctx, this.getAttribute("datapath")!);

    if (!prop) {
      return;
    }

    const val = this.getPathValue(this.ctx, this.getAttribute("datapath")!) as number;
    if (val !== this._last_value) {
      this._last_value = this._value = val;
      this.updateTextBox();
    }
  }

  update() {
    this.updateLabelOnTop();
    super.update();

    this.updateDataPath();
    const redraw = false;

    updateSliderFromDom(this, this.numslider);
    updateSliderFromDom(this, this._textbox);

    if (redraw) {
      this.setCSS();
      this.numslider.setCSS();
      this.numslider._redraw();
    }

    this.updateName();

    this.numslider.description = this.description;
    this._textbox.description = this.title; //get full, transformed toolip

    if (this.hasAttribute("datapath")) {
      this.numslider.setAttribute("datapath", this.getAttribute("datapath")!);
      this._textbox.setAttribute("datapath", this.getAttribute("datapath")!);
    }

    if (this.hasAttribute("mass_set_path")) {
      this.numslider.setAttribute("mass_set_path", this.getAttribute("mass_set_path")!);
      this._textbox.setAttribute("mass_set_path", this.getAttribute("mass_set_path")!);
    }
  }

  setCSS() {
    super.setCSS();
    this._textbox.setCSS();
    //textbox.style["margin"] = "5px";
  }
}

export class NumSliderSimple<CTX extends IContextBase = IContextBase> extends SliderWithTextbox<CTX> {
  constructor() {
    super();

    this.numslider = UIBase.createElement("numslider-simple-base-x") as this["numslider"];
  }

  static define() {
    return {
      tagname: "numslider-simple-x",
      style  : "numslider_simple",
    };
  }

  _redraw() {
    this.numslider._redraw();
  }
}

UIBase.internalRegister(NumSliderSimple);

export class NumSliderWithTextBox extends SliderWithTextbox {
  constructor() {
    super();

    this.numslider = UIBase.createElement("numslider-x");
  }

  static define() {
    return {
      tagname: "numslider-textbox-x",
      style  : "numslider_textbox",
    };
  }

  update() {
    super.update();

    if (this.hasAttribute("name")) {
      const name = this.getAttribute("name")!;

      if (name !== this.numslider.name) {
        this.numslider.setAttribute("name", name);
        this.numslider._redraw();
      }
    }
  }

  _redraw() {
    this.numslider._redraw();
  }
}

UIBase.internalRegister(NumSliderWithTextBox);
