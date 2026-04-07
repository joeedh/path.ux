"use strict";

import * as util from "../path-controller/util/util.js";
import * as vectormath from "../path-controller/util/vectormath.js";
import * as ui_base from "../core/ui_base.js";
import * as events from "../path-controller/util/events.js";
import * as toolsys from "../path-controller/toolsys/toolsys.js";
import * as toolprop from "../path-controller/toolsys/toolprop.js";
import { DataPathError } from "../path-controller/controller/controller.js";
import { Vector3, Vector4, Quat, Matrix4 } from "../path-controller/util/vectormath.js";
import { isNumber, PropFlags } from "../path-controller/toolsys/toolprop.js";
import * as units from "../core/units.js";

import cconst from "../config/const.js";

function myToFixed(s: number, n: number) {
  let str = s.toFixed(n);

  while (str.endsWith("0")) {
    str = str.slice(0, str.length - 1);
  }
  if (str.endsWith(".")) {
    str = str.slice(0, str.length - 1);
  }

  return str;
}

const keymap = events.keymap;

const EnumProperty = toolprop.EnumProperty;
const PropTypes = toolprop.PropTypes;

const UIBase = ui_base.UIBase;
const PackFlags = ui_base.PackFlags;
const IconSheets = ui_base.IconSheets;

const parsepx = ui_base.parsepx;

import { Button, OldButton } from "./ui_button.js";
import { eventWasTouch, popModalLight, pushModalLight } from "../path-controller/util/simple_events.js";
import { IContextBase } from "../core/context_base.js";
import type { CSSFont } from "../core/cssfont.js";
import type { EnumPropertyBase } from "../path-controller/toolsys/toolprop.js";

export { Button } from "./ui_button.js";

export class IconLabel<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
  _icon: number;
  iconsheet: number;

  constructor() {
    super();
    this._icon = -1;
    this.iconsheet = 1;
  }

  get icon() {
    return this._icon;
  }

  set icon(id: number) {
    this._icon = id;
    this.setCSS();
  }

  static define() {
    return {
      tagname: "icon-label-x",
    };
  }

  init() {
    super.init();

    this.style["display"] = "flex";
    this.style["margin"] = this.style["padding"] = "0px";

    this.setCSS();
  }

  setCSS() {
    const size = ui_base.iconmanager.getTileSize(this.iconsheet);

    ui_base.iconmanager.setCSS(this.icon, this as unknown as HTMLElement);

    this.style["width"] = size + "px";
    this.style["height"] = size + "px";
  }
}

UIBase.internalRegister(IconLabel);

export class ValueButtonBase<CTX extends IContextBase = IContextBase> extends OldButton<CTX> {
  _value: unknown;

  constructor() {
    super();
    this._value = undefined;
  }

  get value() {
    return this._value;
  }

  set value(val: unknown) {
    this._value = val;

    if (this.ctx && this.hasAttribute("datapath")) {
      this.setPathValue(this.ctx, this.getAttribute("datapath")!, this._value);
    }
  }

  updateDataPath() {
    if (!this.hasAttribute("datapath")) return;
    if (this.ctx === undefined) return;

    const val = this.getPathValue(this.ctx, this.getAttribute("datapath")!);

    if (val === undefined) {
      const redraw = !this.disabled;

      this.internalDisabled = true;

      if (redraw) this._redraw();

      return;
    } else {
      const redraw = this.disabled;

      this.internalDisabled = false;
      if (redraw) this._redraw();
    }

    if (val !== this._value) {
      this._value = val;
      this.updateWidth();
      this._repos_canvas();
      this._redraw();
      this.setCSS();
    }
  }

  update() {
    this.updateDataPath();

    super.update();
  }
}

export class Check<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
  icon: number = -1;
  iconsheet: number = 0;
  _checked: boolean;
  _highlight: boolean | undefined;
  _focus: boolean;
  canvas!: HTMLCanvasElement;
  g!: CanvasRenderingContext2D;
  checkbox!: HTMLCanvasElement;
  _label!: HTMLLabelElement;
  _updatekey: string = "";
  _last_dpi: number = 1;

  constructor() {
    super();

    this._checked = false;
    this._highlight = false;
    this._focus = false;

    const shadow = this.shadow;

    //let form = document.createElement("form");

    const span = document.createElement("span");
    span.setAttribute("class", "checkx");

    span.style.display = "flex";
    span.style.flexDirection = "row";
    span.style.margin = span.style.padding = "0px";
    //span.style["background"] = ui_base.iconmanager.getCSS(1);

    const sheet = 0;
    const size = ui_base.iconmanager.getTileSize(0);

    const check = (this.canvas = document.createElement("canvas"));
    this.g = check.getContext("2d")!;

    check.setAttribute("id", String(check.id));
    check.setAttribute("name", String(check.id));

    const mdown = (_e: Event) => {
      this._highlight = false;
      this.checked = !this.checked;
    };

    const mup = (_e: Event) => {
      this._highlight = false;
      this.blur();
      this._redraw();
    };

    const mover = (_e: Event) => {
      this._highlight = true;
      this._redraw();
    };

    const mleave = (_e: Event) => {
      this._highlight = false;
      this._redraw();
    };

    span.addEventListener("pointerover", mover, { passive: true });
    span.addEventListener("mousein" as keyof HTMLElementEventMap, mover, { passive: true });
    span.addEventListener("mouseleave", mleave, { passive: true });
    span.addEventListener("pointerout", mleave, { passive: true });

    this.addEventListener("blur", (e) => {
      this._highlight = this._focus = false;
      this._redraw();
    });
    this.addEventListener("focusin", (e) => {
      this._focus = true;
      this._redraw();
    });
    this.addEventListener("focus", (e) => {
      this._focus = true;
      this._redraw();
    });

    span.addEventListener("pointerdown", mdown, { passive: true });
    span.addEventListener("pointerup", mup, { passive: true });
    span.addEventListener("pointercancel", mup, { passive: true });

    this.addEventListener("keydown", (e) => {
      switch (e.keyCode) {
        case keymap["Escape"]:
          this._highlight = undefined;
          this._redraw();
          e.preventDefault();
          e.stopPropagation();

          this.blur();
          break;
        case keymap["Enter"]:
        case keymap["Space"]:
          this.checked = !this.checked;
          e.preventDefault();
          e.stopPropagation();
          break;
      }
    });
    this.checkbox = check;

    span.appendChild(check);

    const label = (this._label = document.createElement("label"));
    label.setAttribute("class", "checkx");
    span.setAttribute("class", "checkx");
    label.style.alignSelf = "center";

    const side = this.getDefault("CheckSide");
    if (side === "right") {
      span.prepend(label);
    } else {
      span.appendChild(label);
    }

    shadow.appendChild(span);
  }

  get internalDisabled() {
    return super.internalDisabled;
  }

  set internalDisabled(val) {
    if (!!this.internalDisabled === !!val) {
      return;
    }

    super.internalDisabled = val;
    this._redraw();
  }

  get value() {
    return this.checked;
  }

  set value(v) {
    this.checked = v;
  }

  get checked() {
    return this._checked;
  }

  set checked(v) {
    v = !!v;

    if (this._checked !== v) {
      this._checked = v;

      this.setCSS();

      //this.dom.checked = v;
      this._redraw();

      if (this.onclick) {
        (this.onclick as unknown as (val: boolean) => void)(v);
      }
      if (this.onchange) {
        this.onchange(v);
      }

      if (this.hasAttribute("datapath")) {
        this.setPathValue(this.ctx, this.getAttribute("datapath")!, this._checked);
      }
    }
  }

  get label() {
    return this._label.textContent;
  }

  set label(l) {
    this._label.textContent = l;
  }

  static define() {
    return {
      tagname    : "check-x",
      style      : "checkbox",
      parentStyle: "button",
    };
  }

  init() {
    this.tabIndex = 1;
    this.setAttribute("class", "checkx");

    const style = document.createElement("style");
    //let style = this.cssStyleTag();

    const color = this.getDefault("focus-border-color");

    style.textContent = `
      .checkx:focus {
        outline : none;
      }
    `;

    //document.body.prepend(style);
    this.prepend(style);
  }

  setCSS() {
    const defaultText = this.getDefault("DefaultText") as CSSFont;
    this._label.style.font = defaultText.genCSS();
    this._label.style.color = defaultText.color;

    this._label.style.font = "normal 14px poppins"; // TODO - Jordan - add to settings

    super.setCSS();

    //force clear background
    this.style.backgroundColor = "rgba(0,0,0,0)";
  }

  updateDataPath() {
    if (!this.getAttribute("datapath")) {
      return;
    }

    const rawVal = this.getPathValue(this.ctx, this.getAttribute("datapath")!);

    let redraw = false;

    if (rawVal === undefined) {
      this.internalDisabled = true;
      return;
    } else {
      redraw = this.internalDisabled;

      this.internalDisabled = false;
    }

    const val = !!rawVal;

    redraw = redraw || !!this._checked !== val;

    if (redraw) {
      this._checked = val;
      this._repos_canvas();
      this.setCSS();
      this._redraw();
    }
  }

  _repos_canvas() {}

  _redraw() {
    if (this.canvas === undefined) {
      //flag update
      this._updatekey = "";
      return;
    }

    const canvas = this.canvas;
    const g = this.g;
    const dpi = UIBase.getDPI();
    let tilesize = ui_base.iconmanager.getTileSize(0);
    const pad = this.getDefault("padding") as number;

    let csize = tilesize + pad * 2;

    canvas.style.margin = "2px";
    canvas.style.width = csize + "px";
    canvas.style.height = csize + "px";

    csize = ~~(csize * dpi + 0.5);
    tilesize = ~~(tilesize * dpi + 0.5);

    canvas.width = csize;
    canvas.height = csize;

    g.clearRect(0, 0, canvas.width, canvas.height);

    g.beginPath();
    g.rect(0, 0, canvas.width, canvas.height);
    g.fill();

    let color;

    if (!this._checked && this._highlight) {
      color = this.getDefault("BoxHighlight");
    }

    ui_base.drawRoundBox(this, canvas, g, undefined, undefined, undefined, undefined, color);
    if (this._checked) {
      //canvasDraw(elem, canvas, g, icon, x=0, y=0, sheet=0) {
      const x = (csize - tilesize) * 0.5;
      const y = (csize - tilesize) * 0.5;
      ui_base.iconmanager.canvasDraw(this, canvas, g, ui_base.Icons.LARGE_CHECK, x, y);
    }

    if (this._focus) {
      color = this.getDefault("focus-border-color");
      g.lineWidth *= dpi;
      ui_base.drawRoundBox(this, canvas, g, undefined, undefined, undefined, "stroke", color);
    }
  }

  updateDPI() {
    const dpi = UIBase.getDPI();

    if (dpi !== this._last_dpi) {
      this._last_dpi = dpi;
      this._redraw();
    }
  }

  update() {
    super.update();

    this.updateDPI();

    const ready = ui_base.getIconManager().isReady(0);

    if (this.hasAttribute("datapath")) {
      this.updateDataPath();
    }

    let updatekey = (this.getDefault("DefaultText") as CSSFont).hash();
    updatekey += this._checked + ":" + this._label.textContent;
    updatekey += ":" + ready;

    if (updatekey !== this._updatekey) {
      this._repos_canvas();
      this.setCSS();

      this._updatekey = updatekey;
      this._redraw();
    }
  }
}

UIBase.internalRegister(Check);

export class IconButton<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
  _icon_pressed: number | undefined;
  _icon: number;
  iconsheet: number;
  _customIcon: HTMLImageElement | undefined;
  _pressed: boolean;
  _highlight: boolean;
  _draw_pressed: boolean;
  drawButtonBG: boolean;
  _extraIcon: number | undefined;
  extraDom: HTMLDivElement | undefined;
  _last_iconsheet: number | undefined;
  _onpress: ((e: { x: number; y: number; stopPropagation: () => void; preventDefault: () => void }) => void) | undefined;
  dom: HTMLDivElement;

  constructor() {
    super();

    this._customIcon = undefined;

    this._pressed = false;
    this._highlight = false;
    this._draw_pressed = true;

    this._icon = -1;
    this._icon_pressed = undefined;
    this.iconsheet = 0;
    this.drawButtonBG = true;

    this._extraIcon = undefined; //draw another icon on top

    this.extraDom = undefined;

    //have to put icon in subdiv
    this.dom = document.createElement("div");
    this.shadow.appendChild(this.dom);

    this._last_iconsheet = undefined;

    this.addEventListener("keydown", (e) => {
      switch (e.keyCode) {
        case keymap["Enter"]:
        case keymap["Space"]:
          this.click();
          break;
      }
    });
  }

  click() {
    if (this._onpress) {
      const rects = this.getClientRects();
      const rect = rects[0];
      const x = (rect?.x ?? 0) + (rect?.width ?? 0) * 0.5;
      const y = (rect?.y ?? 0) + (rect?.height ?? 0) * 0.5;

      const e = { x, y, stopPropagation: () => {}, preventDefault: () => {} };

      this._onpress(e);
    }

    super.click();
  }

  get customIcon() {
    return this._customIcon;
  }

  set customIcon(domImage: HTMLImageElement | undefined) {
    this._customIcon = domImage;
    this.setCSS();
  }

  get icon() {
    return this._icon;
  }

  set icon(val) {
    this._icon = val;
    this.setCSS();
  }

  static define() {
    return {
      tagname: "iconbutton-x",
      style  : "iconbutton",
    };
  }

  _on_press(_e?: Event) {
    this._pressed = true;
    this.setCSS();
  }

  _on_depress(_e?: Event) {
    this._pressed = false;
    this.setCSS();
  }

  updateDefaultSize() {}

  setCSS() {
    super.setCSS();

    let def: (k: string) => unknown;
    const _pstyle = this.getDefault("depressed");
    const _hstyle = this.getDefault("highlight");

    this.noMarginsOrPadding();

    if (this._pressed && this._draw_pressed) {
      def = (k: string) => this.getSubDefault("depressed", k);
    } else if (this._highlight) {
      def = (k: string) => this.getSubDefault("highlight", k);
    } else {
      def = (k: string) => this.getDefault(k);
    }

    const loadstyle = (key: string, addpx: boolean) => {
      let val = def(key);
      if (addpx) {
        let strVal = ("" + val).trim();

        if (!strVal.toLowerCase().endsWith("px")) {
          strVal += "px";
        }
        this.style.setProperty(key, strVal);
      } else {
        this.style.setProperty(key, "" + val);
      }
    };

    const keys = [
      "margin",
      "padding",
      "margin-left",
      "margin-right",
      "margin-top",
      "margin-bottom",
      "padding-left",
      "padding-bottom",
      "padding-top",
      "padding-right",
      "border-radius",
    ];

    for (const k of keys) {
      loadstyle(k, true);
    }
    loadstyle("background-color", false);
    loadstyle("color", false);

    const border = `${def("border-width")} ${def("border-style")} ${def("border-color")}`;
    this.style.border = border;

    const size = ui_base.iconmanager.getTileSize(this.iconsheet);
    const w = size;

    this.style.width = w + "px";
    this.style.height = w + "px";

    this.dom.style.width = w + "px";
    this.dom.style.height = w + "px";
    this.dom.style.margin = this.dom.style.padding = "0px";

    this.style.display = "flex";
    this.style.alignItems = "center";

    if (this._customIcon) {
      this.dom.style.backgroundImage = `url("${this._customIcon.src}")`;
      this.dom.style.backgroundSize = "contain";
      this.dom.style.backgroundRepeat = "no-repeat";
    } else {
      let icon = this.icon;

      if (this._pressed && this._icon_pressed !== undefined) {
        icon = this._icon_pressed;
      }

      ui_base.iconmanager.setCSS(icon, this.dom, this.iconsheet);
    }

    if (this._extraIcon !== undefined) {
      let dom: HTMLDivElement;

      if (!this.extraDom) {
        this.extraDom = dom = document.createElement("div");

        this.shadow.appendChild(dom);
      } else {
        dom = this.extraDom;
      }

      dom.style.position = "absolute";
      dom.style.margin = dom.style.padding = "0px";
      dom.style.pointerEvents = "none";
      dom.style.width = size + "px";
      dom.style.height = size + "px";

      ui_base.iconmanager.setCSS(this._extraIcon, dom, this.iconsheet);
    } else if (this.extraDom) {
      this.extraDom.remove();
    }
  }

  init() {
    super.init();

    const press = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      if (this.modalRunning) {
        this.popModal();
      }

      if (!eventWasTouch(e) && e.button !== 0) {
        return;
      }

      if (1) {
        //!eventWasTouch(e)) {
        const this2 = this;

        this.pushModal({
          on_mouseup(ev: Event) {
            //touch events aren't fireing onclick automatically the way mouse ones are

            if (this2.onclick && eventWasTouch(ev as MouseEvent)) {
              (this2.onclick as unknown as () => void)();
            }
            (this as { end(): void }).end();
          },
          on_touchcancel(ev: Event) {
            (this as { on_mouseup(e: Event): void }).on_mouseup(ev);
            (this as { end(): void }).end();
          },
          on_touchend(ev: Event) {
            (this as { on_mouseup(e: Event): void }).on_mouseup(ev);
            (this as { end(): void }).end();
          },
          on_keydown(_ev: KeyboardEvent) {
            (this as { end(): void }).end();
          },
          end() {
            if (this2.modalRunning) {
              this2.popModal();
              this2._on_depress(e);
              this2.setCSS();
            }
          },
        });
      }

      this._on_press(e);
    };

    const depress = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      this._on_depress();
      this.setCSS();
    };

    const high = (_e: Event) => {
      this._highlight = true;
      this.setCSS();
    };

    const unhigh = (_e: Event) => {
      this._highlight = false;
      this.setCSS();
    };

    this.tabIndex = 0;

    this.addEventListener("mouseover", high);
    this.addEventListener("mouseexit" as keyof HTMLElementEventMap, unhigh);
    this.addEventListener("mouseleave", unhigh);
    this.addEventListener("focus", high);
    this.addEventListener("blur", unhigh);

    this.addEventListener("mousedown", press, { capture: true });
    this.addEventListener("mouseup", depress, { capture: true });
    //this.addEventListener("touchstart", press, {capture: true});
    //this.addEventListener("touchcancel", depress, {capture: true});
    //this.addEventListener("touchend", depress, {capture: true});
    this.setCSS();

    this.dom.style.pointerEvents = "none";
  }

  update() {
    super.update();

    if (this.iconsheet !== this._last_iconsheet) {
      this.setCSS();
      this._last_iconsheet = this.iconsheet;
    }
  }

  _getsize() {
    const margin = this.getDefault("padding") as number;

    return ui_base.iconmanager.getTileSize(this.iconsheet) + margin * 2;
  }
}

UIBase.internalRegister(IconButton);

export class IconCheck<CTX extends IContextBase = IContextBase> extends IconButton<CTX> {
  _checked: boolean | undefined;
  _drawCheck: boolean | undefined;

  constructor() {
    super();

    this._checked = undefined;
    this._drawCheck = undefined;
  }

  get drawCheck() {
    let ret: boolean | undefined = this._drawCheck;

    ret = ret === undefined ? (this.getDefault("drawCheck") as unknown as boolean | undefined) : ret;
    ret = ret === undefined ? true : ret;

    return ret;
  }

  set drawCheck(val) {
    val = !!val;

    if (val && this.packflag & PackFlags.HIDE_CHECK_MARKS) {
      this.packflag &= ~PackFlags.HIDE_CHECK_MARKS;
    }

    const old = !!this.drawCheck;
    this._drawCheck = val;

    if (val !== old) {
      this.updateDrawCheck();
      this.setCSS();
    }
  }

  click() {
    super.click();
    this.checked = !this.checked;
  }

  get icon() {
    return this._icon;
  }

  set icon(val: number) {
    this._icon = val;
    this.setCSS();
  }

  get checked() {
    return this._checked;
  }

  set checked(val: boolean | undefined) {
    if (!!val !== !!this._checked) {
      this._checked = val;
      this._updatePressed(!!val);
      this.setCSS();

      if (this.onchange) {
        this.onchange(val);
      }
    }
  }

  get noEmboss() {
    let ret = this.getAttribute("no-emboss");

    if (!ret) {
      return false;
    }

    ret = ret.toLowerCase().trim();

    return ret === "true" || ret === "yes" || ret === "on";
  }

  set noEmboss(val) {
    this.setAttribute("no-emboss", val ? "true" : "false");
  }

  static define() {
    return {
      tagname    : "iconcheck-x",
      style      : "iconcheck",
      parentStyle: "iconbutton",
    };
  }

  _updatePressed(val: boolean) {
    //don't set _pressed if we have a custom icon for press state
    if (this._icon_pressed) {
      this._draw_pressed = false;
    }

    this._pressed = val;
    this.setCSS();
  }

  _on_depress(_e?: Event) {
    return;
  }

  _on_press(_e?: Event) {
    this.checked = !this.checked;

    if (this.hasAttribute("datapath")) {
      this.setPathValue(this.ctx, this.getAttribute("datapath")!, !!this.checked);
    }

    this.setCSS();
  }

  updateDefaultSize() {}

  _calcUpdateKey(): string {
    return ":" + this._icon;
  }

  updateDataPath() {
    if (!this.hasAttribute("datapath") || !this.ctx) {
      return;
    }

    const datapath = this.getAttribute("datapath")!;

    if (this._icon < 0) {
      let rdef;
      try {
        rdef = this.ctx.api.resolvePath(this.ctx, datapath);
      } catch (error) {
        if (error instanceof DataPathError) {
          return;
        } else {
          throw error;
        }
      }

      if (rdef?.prop) {
        let icon: number | undefined;
        let icon2: number | undefined;
        let title: string | undefined;

        if (rdef.prop.flag & PropFlags.NO_UNDO) {
          this.setUndo(false);
        } else {
          this.setUndo(true);
        }

        //console.log("SUBKEY", rdef.subkey, rdef.prop.iconmap);

        if (rdef.subkey && (rdef.prop.type === PropTypes.FLAG || rdef.prop.type === PropTypes.ENUM)) {
          const enumProp = rdef.prop as unknown as EnumPropertyBase<number>;
          const subkey = rdef.subkey as string;
          icon = enumProp.iconmap[subkey];
          icon2 = enumProp.iconmap2[subkey];
          title = rdef.prop.descriptions[subkey];

          if (!title && subkey.length > 0) {
            title = subkey;
            title = title[0].toUpperCase() + title.slice(1, title.length).toLowerCase();
          }
        } else {
          icon2 = (rdef.prop as { icon2?: number }).icon2;
          icon = rdef.prop.icon;
          title = rdef.prop.description;
        }

        if (icon2 !== undefined && icon2 !== -1) {
          this._icon_pressed = icon;
          icon = icon2;
        }

        if (icon !== undefined && icon !== this.icon) this.icon = icon;
        if (title) this.description = title;
      }
    }

    const rawVal = this.getPathValue(this.ctx, datapath);

    if (rawVal === undefined) {
      this.internalDisabled = true;
      return;
    } else {
      this.internalDisabled = false;
    }

    const val = !!rawVal;

    if (val !== !!this._checked) {
      this._checked = val;
      this._updatePressed(val);
      this.setCSS();
    }
  }

  updateDrawCheck() {
    if (this.drawCheck) {
      this._extraIcon = this._checked ? ui_base.Icons.ENUM_CHECKED : ui_base.Icons.ENUM_UNCHECKED;
    } else {
      this._extraIcon = undefined;
    }
  }

  update() {
    if (this.packflag & PackFlags.HIDE_CHECK_MARKS) {
      this.drawCheck = false;
    }

    this.updateDrawCheck();

    if (this.hasAttribute("datapath")) {
      this.updateDataPath();
    }

    super.update();
  }

  _getsize() {
    const margin = this.getDefault("padding") as number;
    return ui_base.iconmanager.getTileSize(this.iconsheet) + margin * 2;
  }

  setCSS() {
    this.updateDrawCheck();
    super.setCSS();
  }
}

UIBase.internalRegister(IconCheck);

export class Check1<CTX extends IContextBase = IContextBase> extends OldButton<CTX> {
  _value: unknown;

  constructor() {
    super();

    this._namePad = 40;
    this._value = undefined;
  }

  static define() {
    return {
      tagname    : "check1-x",
      style      : "button",
      parentStyle: "button",
    };
  }

  _redraw(draw_text = true) {
    //console.log("button draw");

    const _dpi = this.getDPI();

    const box = 40;
    ui_base.drawRoundBox(this, this.dom, this.g, box);

    const ts = (this.getDefault("DefaultText") as CSSFont).size;

    const text = this._genLabel();

    //console.log(text, "text", this._name);

    const tw = ui_base.measureText(this, text, this.dom, this.g).width;
    const cx = this.dom.width / 2 - tw / 2;
    const cy = this.dom.height / 2;

    ui_base.drawText(this, box, cy + ts / 2, text, {
      canvas: this.dom,
      g     : this.g,
    });
  }
}

UIBase.internalRegister(Check1);

export { checkForTextBox } from "./ui_textbox.js";
