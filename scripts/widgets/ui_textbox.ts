"use strict";

import * as units from "../core/units";

import * as events from "../path-controller/util/events";
import { PropTypes } from "../path-controller/toolsys/toolprop";

const keymap = events.keymap;

import { UIBase } from "../core/ui_base";
import { _setTextboxClass, ErrorColors } from "../core/ui_base";
import { IContextBase } from "../core/context_base";
import type { CSSFont } from "../core/cssfont";

export class TextBoxBase<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
  static define() {
    return {
      tagname       : "text-box-base",
      modalKeyEvents: true,
    };
  }
}

export class TextBox<CTX extends IContextBase = IContextBase> extends TextBoxBase<CTX> {
  dom: HTMLInputElement;
  _editing = false;
  _width: string | number = "min-content";
  _textBoxEvents = true;
  _had_error = false;
  _modal: unknown = undefined;
  _focus = 0;
  onend?: (ok: boolean) => void;
  accessor radix = 16;

  constructor() {
    super();

    this._editing = false;

    this._width = (this.getDefault("width") as number) + "px";
    this._textBoxEvents = true;

    const margin = Math.ceil(3 * this.getDPI());

    this._had_error = false;

    this.decimalPlaces = undefined;

    this.baseUnit = undefined;
    this.displayUnit = undefined;

    this.dom = document.createElement("input");

    this.dom.tabIndex = 0;
    this.dom.setAttribute("tabindex", "0");
    this.dom.setAttribute("tab-index", "0");
    this.dom.style["margin"] = margin + "px";

    this.dom.setAttribute("type", "textbox");
    this.dom.onchange = (e: Event) => {
      this._change(this.dom.value);
    };

    this.radix = 16;

    this.dom.oninput = (e: Event) => {
      this._change(this.dom.value);
    };

    this.shadow.appendChild(this.dom);

    this.dom.addEventListener("focus", (e: Event) => {
      console.log("Textbox focus", this.isModal);

      this._focus = 1;

      if (this.isModal) {
        this._startModal();
        this.setCSS();
      }
    });

    this.dom.addEventListener("blur", (e: Event) => {
      console.log("Textbox blur");

      this._focus = 0;

      if (this._modal) {
        this._endModal(true);
        this.setCSS();
      }
    });
  }

  get startSelected() {
    const b = (this.getAttribute("start-selected") ?? "").toLowerCase();

    return b === "yes" || b === "true" || b === "on" || b === "1";
  }

  set startSelected(v: boolean) {
    this.setAttribute("start-selected", v ? "true" : "false");
  }

  /** realtime dom attribute getter, defaults to true in absence of attribute*/
  get realtime() {
    let ret = this.getAttribute("realtime");

    if (!ret) {
      return true;
    }

    ret = ret.toLowerCase().trim();

    return ret === "yes" || ret === "true" || ret === "on";
  }

  set realtime(val: boolean) {
    this.setAttribute("realtime", val ? "true" : "false");
  }

  get isModal() {
    let ret = this.getAttribute("modal");

    if (!ret) {
      return false;
    }

    ret = ret.toLowerCase().trim();

    return ret === "yes" || ret === "true" || ret === "on";
  }

  set isModal(val: boolean) {
    this.setAttribute("modal", val ? "true" : "false");
  }

  _startModal() {
    if (this.startSelected) {
      this.select();
    }

    console.warn("textbox modal");

    if (this._modal) {
      this._endModal(true);
    }

    this._editing = true;

    let ignore = 0;

    const finish = (ok: boolean) => {
      this._endModal(ok);
    };

    const keydown = (e: KeyboardEvent) => {
      e.stopPropagation();

      switch (e.keyCode) {
        case keymap.Enter:
          finish(true);
          break;
        case keymap.Escape:
          finish(false);
          break;
      }

      return;
      if (ignore) return;

      const e2 = new KeyboardEvent(e.type, e);

      ignore = 1;
      this.dom.dispatchEvent(e2);
      ignore = 0;
    };

    this._modal = true;
    this.pushModal(
      {
        on_mousemove: (e: PointerEvent) => {
          e.stopPropagation();
        },

        on_keydown : keydown,
        on_keypress: keydown,
        on_keyup   : keydown,

        on_mousedown: (e: PointerEvent) => {
          e.stopPropagation();
          console.log("mouse down", e, e.x, e.y);
        },
      },
      false
    );
  }

  _flash_focus() {
    //don't focus on flash
  }

  get editing() {
    return this._editing;
  }

  _endModal(ok: boolean) {
    console.log("textbox end modal");

    this._editing = false;

    this._modal = false;
    this.popModal();

    this.blur();

    if (this.onend) {
      this.onend(ok);
    } else {
      this._updatePathVal(this.dom.value);
    }

    this.blur();
  }

  get tabIndex() {
    return this.dom.tabIndex;
  }

  set tabIndex(val: number) {
    this.dom.tabIndex = val;
  }

  init() {
    super.init();

    //set isModal default
    if (!this.hasAttribute("modal")) {
      this.isModal = true;
    }

    this.style["display"] = "flex";
    this.style["width"] = typeof this._width === "number" ? this._width + "px" : this._width;

    this.setCSS();
  }

  set width(val: string | number) {
    let widthStr: string;
    if (typeof val === "number") {
      widthStr = val + "px";
    } else {
      widthStr = val;
    }

    this._width = widthStr;
    this.style["width"] = widthStr;
  }

  setCSS() {
    super.setCSS();

    this.overrideDefault("background-color", this.getDefault("background-color"));

    this.background = this.getDefault("background-color") as string | undefined;
    this.dom.style.margin = this.dom.style.padding = "0px";

    const bgColor = this.getDefault("background-color") as string | undefined;
    if (bgColor) {
      this.dom.style.backgroundColor = bgColor;
    }

    const borderRadius = this.getDefault("border-radius") as number;
    this.style.borderRadius = borderRadius + "px";
    this.dom.style.borderRadius = borderRadius + "px";

    const bwid = this.getDefault("border-width") as number;
    const bcolor = this.getDefault("border-color") as string;
    const bstyle = this.getDefault("border-style") as string;
    const border = `${bwid}px ${bstyle} ${bcolor}`;

    this.style.border = border;
    this.style.borderColor = bcolor;

    if (this._focus) {
      this.dom.style.border = `2px dashed ${this.getDefault("focus-border-color") as string}`;
    } else {
      this.dom.style.border = border;
      this.dom.style.borderColor = bcolor;
    }

    const fontStyle = this.style["font"];
    if (fontStyle) {
      this.dom.style["font"] = fontStyle;
    } else {
      const defaultFont = this.getDefault("DefaultText") as CSSFont;
      this.dom.style["font"] = defaultFont.genCSS();
      this.dom.style["color"] = defaultFont.color;
    }

    this.dom.style.width = "100%";
    this.dom.style.height = "100%";
  }

  updateDataPath() {
    if (!this.ctx || !this.hasAttribute("datapath")) {
      return;
    }
    if (this._focus || this._flashtimer !== undefined || (this._had_error && this._focus)) {
      return;
    }

    const datapath = this.getAttribute("datapath")!;
    const val = this.getPathValue(this.ctx, datapath);
    if (val === undefined || val === null) {
      this.internalDisabled = true;
      return;
    } else {
      this.internalDisabled = false;
    }

    const prop = this.getPathMeta(this.ctx, datapath);

    let text = this.text;

    if (!prop) {
      console.error("datapath error " + datapath, val);
      return;
    }

    let is_num: number = prop.type & (PropTypes.FLOAT | PropTypes.INT);
    if (typeof val === "number" && prop.type & (PropTypes.VEC2 | PropTypes.VEC3 | PropTypes.VEC4 | PropTypes.QUAT)) {
      is_num = 1;
    }

    if (is_num) {
      const is_int = prop.type === PropTypes.INT;

      this.radix = prop.radix;

      let decimalPlaces = this.decimalPlaces !== undefined ? this.decimalPlaces : prop.decimalPlaces;
      if (this.hasAttribute("decimalPlaces")) {
        decimalPlaces = parseInt(this.getAttribute("decimalPlaces")!);
      }

      let baseUnit: string | undefined = this.baseUnit ?? prop.baseUnit;
      if (this.hasAttribute("baseUnit")) {
        baseUnit = this.getAttribute("baseUnit") ?? undefined;
      }

      let displayUnit: string | undefined = this.displayUnit ?? prop.displayUnit;
      if (this.hasAttribute("displayUnit")) {
        displayUnit = this.getAttribute("displayUnit") ?? undefined;
      }

      if (is_int && this.radix === 2) {
        text = (val as number).toString(this.radix);
        text = "0b" + text;
      } else if (is_int && this.radix === 16) {
        text += "h";
      } else {
        text = units.buildString(val as number, baseUnit, decimalPlaces, displayUnit);
      }
    } else if (prop?.type === PropTypes.STRING) {
      text = val as string;
    }

    if (this.text !== text) {
      this.text = text;
    }
  }

  update() {
    super.update();

    const styleWidth = this.style["width"];
    const styleHeight = this.style["height"];
    if (styleWidth && this.dom.style["width"] !== styleWidth) {
      this.dom.style["width"] = styleWidth;
    }
    if (styleHeight && this.dom.style["height"] !== styleHeight) {
      this.dom.style["height"] = styleHeight;
    }

    if (this.hasAttribute("datapath")) {
      this.updateDataPath();
    }

    this.setCSS();
  }

  select() {
    this.dom.select();
    //return this.dom.select.apply(this, arguments);
  }

  focus() {
    return this.dom.focus();
  }

  blur() {
    return this.dom.blur();
  }

  static define() {
    return {
      tagname       : "textbox-x",
      style         : "textbox",
      modalKeyEvents: true,
    };
  }

  get text() {
    return this.dom.value;
  }

  set text(value: string) {
    this.dom.value = value;
  }

  _prop_update(prop: any, text: string) {
    let is_num: number = prop.type & (PropTypes.FLOAT | PropTypes.INT);
    const val = this.getPathValue(this.ctx, this.getAttribute("datapath")!);

    if (typeof val === "number" && prop.type & (PropTypes.VEC2 | PropTypes.VEC3 | PropTypes.VEC4 | PropTypes.QUAT)) {
      is_num = 1;
    }

    if (is_num) {
      this.radix = prop.radix;

      let decimalPlaces = this.decimalPlaces !== undefined ? this.decimalPlaces : prop.decimalPlaces;
      if (this.hasAttribute("decimalPlaces")) {
        decimalPlaces = parseInt(this.getAttribute("decimalPlaces")!);
      }

      let baseUnit: string | undefined = this.baseUnit ?? prop.baseUnit;
      if (this.hasAttribute("baseUnit")) {
        baseUnit = this.getAttribute("baseUnit") ?? undefined;
      }

      let displayUnit: string | undefined = this.displayUnit ?? prop.displayUnit;
      if (this.hasAttribute("displayUnit")) {
        displayUnit = this.getAttribute("displayUnit") ?? undefined;
      }

      if (!units.isNumber(text.trim())) {
        this.flash(ErrorColors.ERROR, this.dom, undefined, false);
        this.focus();
        this.dom.focus();
        this._had_error = true;
      } else {
        const val = units.parseValue(text, baseUnit, displayUnit);

        if (this._had_error) {
          this.flash(ErrorColors.OK, this.dom, undefined, false);
        }

        this._had_error = false;
        this.setPathValue(this.ctx, this.getAttribute("datapath")!, val);
      }
    } else if (prop.type === PropTypes.STRING) {
      try {
        this.setPathValue(this.ctx, this.getAttribute("datapath")!, this.text);

        if (this._had_error) {
          this.flash(ErrorColors.OK, this.dom, undefined, false);
          this.dom.focus();
        }

        this._had_error = false;
      } catch (error) {
        console.log((error as Error).stack);
        console.log((error as Error).message);
        console.warn("textbox error!");
        //this._had_error = true;

        this.flash(ErrorColors.ERROR, this.dom, undefined, false);
        this.dom.focus();
      }
    }
  }

  _updatePathVal(text: string) {
    if (this.hasAttribute("datapath") && this.ctx !== undefined) {
      const prop = this.getPathMeta(this.ctx, this.getAttribute("datapath")!);
      console.log(prop);

      if (prop) {
        this._prop_update(prop, text);
      }
    }
  }

  _change(text: string) {
    if (this.realtime) {
      this._updatePathVal(text);
    }

    if (this.onchange) {
      this.onchange(text);
    }
  }
}

UIBase.internalRegister(TextBox as unknown as typeof UIBase);

/**

 Returns false if it's safe to call preventDefault.

 Returns true if the element at position x,y is
 either a textbox or is draggable.
 */
export function checkForTextBox<CTX extends IContextBase = IContextBase>(screen: UIBase<CTX>, x: number, y: number) {
  let p: any = screen.pickElement(x, y);
  //console.log(p, x, y);

  while (p) {
    //don't prevent draggable elements from dragging
    if ((p as any).draggable) {
      return true;
    }

    if (p instanceof UIBase) {
      //check immediate children of p
      for (let i = 0; i < 2; i++) {
        const nodes = i ? p.childNodes : p.shadow.childNodes;

        for (const child of nodes) {
          if ((child as any).draggable) {
            return true;
          }
        }
      }
    }

    let ok = p instanceof TextBoxBase;
    ok = ok || p.constructor.define?.().modalKeyEvents;

    if (ok) {
      return true;
    }

    p = p.parentWidget ? p.parentWidget : p.parentNode;
  }

  return false;
}

_setTextboxClass(TextBox as unknown as new (...args: unknown[]) => HTMLElement);
