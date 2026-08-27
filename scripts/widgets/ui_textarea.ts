"use strict";

import * as events from "../path-controller/util/events";
import type { PathWatchInfo } from "../path-controller/controller/pathwatch";

const keymap = events.keymap;

import { UIBase } from "../core/ui_base";
import { IContextBase } from "../core/context_base";
import type { CSSFont } from "../core/cssfont";
import { StringPropertyBase } from "../path-controller/toolsys/toolprop";

export class TextArea<CTX extends IContextBase = IContextBase> extends UIBase<CTX, string> {
  dom: HTMLTextAreaElement;

  commitOnIdle = true;
  lastIdleTime = 0;
  idleTimeout = 500;
  idleTimer?: ReturnType<typeof setInterval> = undefined;

  customWidth?: number;
  customHeight?: number;

  static define() {
    return { tagname: "text-area-x", style: "textbox" };
  }

  get value() {
    return this.dom.value;
  }
  set value(val: string) {
    this.setValue(val, true, true);
  }

  setValue(val: string, fireChange?: boolean, setDataPath?: boolean) {
    this.dom.value = val;

    if (fireChange) {
      this.on_change?.(val);
    }
    if (setDataPath && this.ctx && this.hasAttribute("datapath")) {
      this.setPathValue(this.ctx, this.getAttribute("datapath")!, val);
    }
  }

  constructor(public ui: UIBase<CTX>) {
    super();
    this.dom = document.createElement("textarea");
    this.shadow.appendChild(this.dom);

    this.dom.addEventListener("input", () => {
      if (this.realtime) {
        this.setValue(this.dom.value, true, true);
      }
    });

    const down = (e: PointerEvent) => {
      if (this.hasFocus && this.ctx.screen.pickElement(e.clientX, e.clientY) !== this) {
        this.blur();
      }
    };

    this.dom.addEventListener("focus", () => {
      this.setCSS();

      if (!this.realtime) {
        this.startIdleTimer();
      }
      window.addEventListener("pointerdown", down, { capture: true });
    });

    this.dom.addEventListener("blur", () => {
      this.stopIdleTimer();
      window.removeEventListener("pointerdown", down);
      if (!this.realtime) {
        this.setValue(this.dom.value, true, true);
      }
      this.setCSS(false);
    });
    this.dom.addEventListener("keydown", (e) => {
      if (keymap[e.keyCode] === "Escape") {
        this.blur();
      }
    });
  }

  init() {
    super.init();
    this.setCSS();
  }

  startIdleTimer() {
    this.stopIdleTimer();

    this.idleTimer = setInterval(() => {
      const datapath = this.getAttribute("datapath");
      if (!datapath) {
        return;
      }

      const val = this.getPathValue(this.ctx, datapath);
      if (typeof val === "string" && this.dom.value !== val) {
        this.setValue(this.dom.value, true, true);
      }
    }, this.idleTimeout);
  }
  stopIdleTimer() {
    if (this.idleTimer) {
      clearInterval(this.idleTimer);
      this.idleTimer = undefined;
    }
  }

  destroy() {
    this.stopIdleTimer();
    super.destroy();
  }

  updateFromPath(val: unknown, info: PathWatchInfo) {
    if (!this.ctx) {
      return;
    }
    if (this.hasFocus || this._flashtimer !== undefined) {
      /* ignore while the user is editing; the blur handler calls
       * refreshPathWatches() to catch up */
      return;
    }

    const datapath = info.path;
    if (!info.resolved || val === null) {
      this.internalDisabled = true;
      return;
    } else {
      this.internalDisabled = false;
    }

    const prop = info.prop ?? this.getPathMeta(this.ctx, datapath);
    if (!prop) {
      console.error("datapath error " + datapath, val);
      return;
    }

    if (prop instanceof StringPropertyBase && prop.multiLineIdleTimeout !== undefined) {
      this.idleTimeout = prop.multiLineIdleTimeout;
    }

    if ("" + val !== this.value) {
      this.setValue("" + val, true, false);
    }
  }

  setCSS(focus = this.hasFocus) {
    super.setCSS();

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

    if (this.hasFocus) {
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

    this.setAreaSizing();
  }

  private setAreaSizing() {
    this.dom.style.boxSizing = "border-box";
    this.dom.style.width = this.customWidth ? this.customWidth + "px" : "100%";
    this.dom.style.height = this.customHeight ? this.customHeight + "px" : "100%";
  }

  saveData() {
    return {
      offsetWidth : this.dom.offsetWidth,
      offsetHeight: this.dom.offsetHeight,
    };
  }

  loadData(json: Record<string, unknown>) {
    this.customWidth = json.offsetWidth as number | undefined;
    this.customHeight = json.offsetHeight as number | undefined;
    this.setAreaSizing();

    return this;
  }
}
UIBase.internalRegister(TextArea as unknown as typeof UIBase);
