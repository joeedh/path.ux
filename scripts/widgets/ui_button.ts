import * as util from "../path-controller/util/util";
import { UIBase, parsepx, measureText, drawRoundBox, drawText } from "../core/ui_base";
import { keymap } from "../path-controller/util/events";
import { IContextBase } from "../core/context_base";
import cconst from "../config/const";
import { _themeUpdateKey } from "../core/ui_base";
import type { CSSFont } from "../core/cssfont";

cconst.DEBUG.buttonEvents = true;

export class ButtonEventBase<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
  _auto_depress: boolean;
  _highlight: boolean;
  accessor _pressed: boolean = false;
  _focus: number = 0;
  _onpress: ((self: unknown) => void) | undefined;

  constructor() {
    super();

    this._auto_depress = true;
    this._highlight = false;
    this._pressed = false;
  }

  bindEvents() {
    let depress: (e?: Event) => void;

    const press = (e: PointerEvent) => {
      e.stopPropagation();

      if (!this.modalRunning) {
        const this2 = this;

        const modalHandlers = {
          on_pointerdown(e: PointerEvent) {
            this.end(e);
          },

          on_pointerup(e: PointerEvent) {
            this.end(e);
          },

          on_pointercancel() {
            console.warn("Pointer cancel in button");
            this2.popModal();
          },

          on_keydown(e: KeyboardEvent) {
            switch (e.keyCode) {
              case keymap["Enter"]:
              case keymap["Escape"]:
              case keymap["Space"]:
                this.end();
                break;
            }
          },

          end(e?: Event) {
            if (!this2.modalRunning) {
              return;
            }

            this2.popModal();
            depress(e);
          },
        };
        this.pushModal(modalHandlers, undefined, e.pointerId);
      }

      if (this.disabled) return;

      this._pressed = true;

      if (this._onpress) {
        this._onpress(this);
      }

      this._redraw();

      e.preventDefault();
    };

    depress = (e?: Event) => {
      if (this._auto_depress) {
        this._pressed = false;

        if (this.disabled) return;

        this._redraw();
      }

      if (e) {
        e.preventDefault();
        e.stopPropagation();

        if (util.isMobile() || (e.type === "pointerup" && (e as PointerEvent).button)) {
          return;
        }
      }

      this._redraw();

      if (this.onclick && e && (e as PointerEvent).pointerType !== "mouse") {
        this.onclick(e as unknown as PointerEvent);
      }

      this.undoBreakPoint();
    };

    this.addEventListener("click", () => {
      this._pressed = false;
      this._highlight = false;
      this._redraw();
    });

    this.addEventListener("pointerdown", press as EventListener, { capture: true });
    this.addEventListener("pointerup", depress as EventListener, { capture: true });
    this.addEventListener("pointerover", () => {
      if (this.disabled) return;
      this._highlight = true;
      this._redraw();
    });

    this.addEventListener("pointerout", () => {
      if (this.disabled) return;
      this._highlight = false;
      this._redraw();
    });

    this.addEventListener("keydown", (e) => {
      if (this.disabled) return;

      switch (e.keyCode) {
        case 27: //escape
          this.blur();
          e.preventDefault();
          e.stopPropagation();
          break;
        case 32: //spacebar
        case 13: //enter
          this.click();
          e.preventDefault();
          e.stopPropagation();
          break;
      }
    });

    this.addEventListener("focusin", () => {
      if (this.disabled) return;
      this._focus = 1;
      this._redraw();
      this.focus();
    });

    this.addEventListener("blur", () => {
      if (this.disabled) return;
      this._focus = 0;
      this._redraw();
    });
  }

  _redraw() {}
}

export class Button<CTX extends IContextBase = IContextBase> extends ButtonEventBase<CTX> {
  label: HTMLSpanElement;
  _pressedTime: number;
  _pressedTimeout: number;
  __pressed: boolean;
  _last_name: string | undefined;
  _last_disabled: boolean | undefined;

  constructor() {
    super();

    this.label = document.createElement("span");
    this.label.innerText = "button";
    this.shadow.appendChild(this.label);

    this.label.style.pointerEvents = "none";

    this.__pressed = false;
    this._highlight = false;
    this._pressedTime = 0;
    this._pressedTimeout = 100;

    this._auto_depress = true;

    this._last_name = undefined;
    this._last_disabled = undefined;
  }

  get name() {
    return "" + this.getAttribute("name");
  }

  set name(val: string) {
    this.setAttribute("name", val);
  }

  get _pressed() {
    return this.__pressed;
  }

  set _pressed(v: boolean) {
    const changed = !v !== !this._pressed;

    if (v) {
      this._pressedTime = util.time_ms();
    } else if (changed && util.time_ms() - this._pressedTime < this._pressedTimeout) {
      window.setTimeout(
        () => {
          this.setCSS();
        },
        this._pressedTimeout - (util.time_ms() - this._pressedTime) + 1
      );
    }

    this.__pressed = v;
  }

  static define() {
    return {
      tagname: "button-x",
      style  : "button",
    };
  }

  init() {
    super.init();
    this.tabIndex = 0;
    this.bindEvents();
    this.setCSS();
  }

  on_enabled() {
    this.setCSS();
  }
  on_disabled() {
    this.setCSS();
  }

  setCSS() {
    super.setCSS();

    if (this.hasDefault("pressedTimeout")) {
      this._pressedTimeout = this.getDefault("pressedTimeout") as number;
    }

    let subkey = "";

    let pressed = this._pressed;
    if (!pressed && util.time_ms() - this._pressedTime < this._pressedTimeout) {
      pressed = true;
    }

    if (this.disabled) {
      subkey = "disabled";
    } else if (pressed && this._highlight) {
      subkey = "highlight-pressed";
    } else if (pressed) {
      subkey = "pressed";
    } else if (this._highlight) {
      subkey = "highlight";
    }

    this.setBoxCSS(subkey);

    this.label.style.padding = this.label.style.margin = "0px";
    this.style.backgroundColor = this.getSubDefault(subkey, "background-color") as string;

    const font = this.getSubDefault(subkey, "DefaultText") as CSSFont;
    this.label.style.font = font.genCSS();
    this.label.style.color = font.color;

    this.style.display = "flex";
    this.style.alignItems = "center";
    this.style.width = "max-content";
    this.style.height = this.getDefault("height") + "px";

    this.style.userSelect = "none";
    this.label.style.userSelect = "none";
  }

  click() {
    if (this._onpress) {
      const rect = this.getClientRects()[0];
      if (rect) {
        this._onpress({
          x: rect.x + rect.width * 0.5,
          y: rect.y + rect.height * 0.5,
          stopPropagation() {},
          preventDefault() {},
        });
      }
    }

    super.click();
  }

  _redraw() {
    this.setCSS();
  }

  updateDisabled() {
    if (this._last_disabled !== this.disabled) {
      this._last_disabled = this.disabled;
      this._redraw();
    }
  }

  update() {
    if (this._last_name !== this.name) {
      this.label.innerHTML = this.name;
      this._last_name = this.name;
    }
  }
}

UIBase.register(Button);

export class OldButton<CTX extends IContextBase = IContextBase> extends ButtonEventBase<CTX> {
  _last_but_update_key: string | number;
  _name: string | undefined;
  _namePad: number | undefined;
  _leftPad: number;
  _rightPad: number;
  _last_w: number;
  _last_h: number;
  _last_dpi: number;
  _lastw: number | undefined;
  _lasth: number | undefined;
  dom: HTMLCanvasElement & { _background?: string; font?: string };
  g: CanvasRenderingContext2D;
  _last_bg: string | undefined;
  _last_disabled: boolean;

  constructor() {
    super();

    const dpi = this.getDPI();

    this._last_but_update_key = "";
    this._name = "";
    this._namePad = undefined;
    this._leftPad = 5;
    this._rightPad = 5;
    this._last_w = 0;
    this._last_h = 0;
    this._last_dpi = dpi;
    this._lastw = undefined;
    this._lasth = undefined;

    this.dom = document.createElement("canvas");
    this.g = this.dom.getContext("2d")!;

    this.dom.setAttribute("class", "canvas1");
    this.dom.tabIndex = 0;

    this._last_bg = undefined;
    this._last_disabled = false;
    this._auto_depress = true;

    this.shadow.appendChild(this.dom);
  }

  get r() {
    return this.getDefault("border-radius") as number;
  }

  set r(val: number) {
    this.overrideDefault("border-radius", val);
  }

  static define() {
    return {
      tagname: "old-button-x",
      style  : "button",
    };
  }

  click() {
    if (this._onpress) {
      const rect = this.getClientRects()[0];
      if (rect) {
        this._onpress({
          x: rect.x + rect.width * 0.5,
          y: rect.y + rect.height * 0.5,
          stopPropagation() {},
          preventDefault() {},
        });
      }
    }

    super.click();
  }

  init() {
    const dpi = this.getDPI();

    const width = ~~((this.getDefault("width") as number) * dpi);
    const height = ~~((this.getDefault("height") as number) * dpi);

    this.dom.width = width;
    this.dom.height = height;

    this.dom.style.width = width / dpi + "px";
    this.dom.style.height = height / dpi + "px";
    this.dom.style.padding = this.dom.style.margin = "0px";

    this._name = undefined;
    this.updateName();

    this.bindEvents();
    this._redraw();
  }

  override setAttribute(key: string, val: string) {
    super.setAttribute(key, val);

    if (key === "name") {
      this.updateName();
      this.updateWidth();
    }
  }

  updateDisabled() {
    if (this._last_disabled !== this.disabled) {
      this._last_disabled = this.disabled;

      this.dom._background = this.getDefault("background-color");

      this._repos_canvas();
      this._redraw();
    }
  }

  updateDefaultSize() {
    const dpi = UIBase.getDPI();
    let height = ~~(this.getDefault("height") as number) + (this.getDefault("padding") as number);
    const size = (this.getDefault("DefaultText") as CSSFont).size * 1.33;

    if (height === undefined || size === undefined || isNaN(height) || isNaN(size)) {
      return;
    }

    height = ~~(Math.max(height, size) * dpi);
    const cssHeight = height / dpi + "px";

    if (cssHeight !== this.style.height) {
      this.style.height = cssHeight;
      this.dom.style.height = cssHeight;
      this.dom.height = height;

      this._repos_canvas();
      this._redraw();
    }
  }

  _calcUpdateKey() {
    return _themeUpdateKey;
  }

  update() {
    super.update();

    this.style.userSelect = "none";
    this.dom.style.userSelect = "none";

    this.updateDefaultSize();
    this.updateWidth();
    this.updateDPI();
    this.updateName();
    this.updateDisabled();

    if (this.background !== this._last_bg) {
      this._last_bg = this.background;
      this._repos_canvas();
      this._redraw();
    }

    const key = this._calcUpdateKey();
    if (key !== this._last_but_update_key) {
      this._last_but_update_key = key;

      this.setCSS();
      this._repos_canvas();
      this._redraw();
    }
  }

  setCSS() {
    super.setCSS();
    this.updateBorders();

    const name = this._name;
    if (name === undefined) {
      return;
    }

    const pad = this.getDefault("padding") as number;
    const ts = (this.getDefault("DefaultText") as CSSFont).size;

    let tw =
      measureText(this, this._genLabel(), {
        size: ts,
        font: this.getDefault("DefaultText") as CSSFont,
      }).width +
      2.0 * pad +
      this._leftPad +
      this._rightPad;

    if (this._namePad !== undefined) {
      tw += this._namePad;
    }

    let w = this.getDefault("width") as number;

    w = Math.max(w, tw);
    w = ~~w;
    this.dom.style.width = w + "px";
    this.updateBorders();
  }

  updateBorders(dom: HTMLElement = this.dom) {
    const lwid = this.getDefault("border-width") as number;

    if (lwid) {
      dom.style.borderColor = this.getDefault("border-color") as string;
      dom.style.borderWidth = lwid + "px";
      dom.style.borderStyle = "solid";
      dom.style.borderRadius = this.getDefault("border-radius") + "px";
    } else {
      dom.style.borderColor = "none";
      dom.style.borderWidth = "0px";
      dom.style.borderRadius = this.getDefault("border-radius") + "px";
    }
  }

  updateName() {
    if (!this.hasAttribute("name")) {
      return;
    }

    const name = this.getAttribute("name");

    if (name !== this._name) {
      this._name = name ?? undefined;

      this.setCSS();
      this._repos_canvas();
      this._redraw();
    }
  }

  updateWidth(w_add = 0) {}

  _repos_canvas() {
    const dpi = this.getDPI();

    let w = parsepx(this.dom.style.width);
    let h = parsepx(this.dom.style.height);

    const w2 = ~~(w * dpi);
    const h2 = ~~(h * dpi);

    w = w2 / dpi;
    h = h2 / dpi;

    this.dom.width = w2;
    this.dom.style.width = w + "px";

    this.dom.height = h2;
    this.dom.style.height = h + "px";
  }

  updateDPI() {
    const dpi = this.getDPI();

    if (this._last_dpi !== dpi) {
      this._last_dpi = dpi;

      this.g.font = "";

      this.setCSS();
      this._repos_canvas();
      this._redraw();
    }

    if (this.style.backgroundColor) {
      this.dom._background = this.style.backgroundColor;
      this.style.backgroundColor = "";
    }
  }

  _genLabel() {
    return "" + this._name;
  }

  _getSubKey(): string {
    if (this._pressed) {
      return "depressed";
    } else if (this._highlight) {
      return "highlight";
    } else {
      return "";
    }
  }

  _redraw(draw_text = true) {
    const dpi = this.getDPI();
    const subkey = this._getSubKey();

    if (this._pressed && this._highlight) {
      this.dom._background = this.getSubDefault(subkey, "highlight-pressed", "BoxHighlight");
    } else if (this._pressed) {
      this.dom._background = this.getSubDefault(subkey, "pressed", "BoxDepressed");
    } else if (this._highlight) {
      this.dom._background = this.getSubDefault(subkey, "highlight", "BoxHighlight");
    } else {
      (this.dom as unknown as Record<string, unknown>)._background = this.getSubDefault(
        subkey,
        "background-color",
        "background-color"
      );
    }

    drawRoundBox(this, this.dom, this.g);
    this.updateBorders();

    if (this._focus) {
      const w = this.dom.width;
      const h = this.dom.height;
      const p = 1 / dpi;

      this.g.translate(p, p);
      const lw = this.g.lineWidth;

      this.g.lineWidth = (this.getDefault("focus-border-width", undefined, 1.0) as number) * dpi;

      drawRoundBox(
        this,
        this.dom,
        this.g,
        w - p * 2,
        h - p * 2,
        this.r,
        "stroke",
        this.getDefault("BoxHighlight") as string
      );

      this.g.lineWidth = lw;
      this.g.translate(-p, -p);
    }

    if (draw_text) {
      this._draw_text();
    }
  }

  _draw_text() {
    const dpi = this.getDPI();
    const subkey = this._getSubKey();

    const font = this.getSubDefault(subkey, "DefaultText") as CSSFont;

    const pad = (this.getDefault("padding") as number) * dpi;
    const ts = font.size * dpi;

    const text = this._genLabel();

    const w = this.dom.width;
    const h = this.dom.height;
    const tw = measureText(this, text, undefined, undefined, ts, font).width;

    const cx = pad * 0.5 + this._leftPad * dpi;
    const cy = ts + (h - ts) / 3.0;

    drawText(this, ~~cx, ~~cy, text, {
      canvas: this.dom,
      g     : this.g,
      size  : ts / dpi,
      font  : font,
    });
  }
}

UIBase.internalRegister(OldButton);
