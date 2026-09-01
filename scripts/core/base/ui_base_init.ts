import cconst from "../../config/const";
import { EventNode } from "../../path-controller/dag/eventdag";
import { copyEvent, haveModal } from "../../path-controller/util/simple_events";
import * as util from "../../path-controller/util/util";
import { initAspectClass } from "../aspect";
import { UIBase, internalSetTimeout } from "../ui_base";
import { _getFont } from "./ui_draw";
import { PackFlags } from "./ui_base_types";
import { _themeUpdateKey } from "./ui_theme_key";

type AnyUIBase = UIBase<any, any, any>;

let _idgen = 0;

/** Runs the whole `UIBase` constructor body, after `super()` and the field initializers. */
export function initUIBase(elem: AnyUIBase): void {
  EventNode.init(elem);

  elem._tool_tip_abort_delay = undefined;
  elem._tooltip_ref = undefined;

  elem._textBoxEvents = false;

  elem._themeOverride = undefined;

  elem._last_theme_update_key = _themeUpdateKey;

  elem._client_disabled_set = undefined;

  elem._useNativeToolTips = cconst.useNativeToolTips;
  elem._useNativeToolTips_set = false;
  elem._has_own_tooltips = undefined;
  elem._tooltip_timer = util.time_ms();

  elem.pathUndoGen = 0;
  elem._lastPathUndoGen = 0;
  elem._useDataPathUndo = undefined;

  elem._active_animations = [];

  //Screen.update_intern sets the contents of this
  elem._screenStyleTag = document.createElement("style");
  elem._screenStyleUpdateHash = 0;

  initAspectClass(
    elem,
    new Set(["appendChild", "animate", "shadow", "removeNode", "prepend", "add", "init"])
  );

  // needed so you can walk from normal html elements to the widget owning the shadow root
  elem.shadow = elem.attachShadow({ mode: "open" }) as typeof elem.shadow;
  elem.shadow.parentWidget = elem;

  const styleElem = document.createElement("style");
  styleElem.innerHTML = `
        /* This hides the host element when it has the hidden attribute */
        :host([hidden]) {
          display: none !important;
        }
    `;
  elem.shadow.appendChild(styleElem);

  if (cconst.DEBUG.paranoidEvents) {
    elem.__cbs = [];
  }

  elem.shadow.appendChild(elem._screenStyleTag);
  const _origAppendChild = elem.shadow.appendChild.bind(elem.shadow) as <T extends Node>(
    child: T
  ) => T;
  (
    elem.shadow as typeof elem.shadow & { _appendChild: <T extends Node>(child: T) => T }
  )._appendChild = _origAppendChild;

  elem.shadow.appendChild = <T extends Node>(child: T): T => {
    if (child && typeof child === "object" && child instanceof UIBase) {
      child.parentWidget = elem;
    }

    return _origAppendChild(child);
  };

  elem._wasAddedToNodeAtSomeTime = false;

  elem.visibleToPick = true;

  elem._override_class = undefined;
  elem.parentWidget = undefined;

  const tagname = elem.constructor.define().tagname;
  elem._id = tagname.replace(/-/g, "_") + _idgen++;

  elem.default_overrides = {}; //inherited by child widgets
  elem.my_default_overrides = {}; //not inherited to child widgets
  elem.class_default_overrides = {};

  elem._description_final = undefined;

  elem._modaldata = undefined;
  elem.packflag = elem.getDefault("BasePackFlag");
  elem._internalDisabled = false;
  elem.__disabledState = false;
  elem._disdata = undefined;

  elem._description = undefined;

  const style = document.createElement("style");
  style.textContent =
    `
    .DefaultText {
      font: ` +
    _getFont(elem) +
    `;
    }
    `;
  elem.shadow.appendChild(style);
  elem._init_done = false;

  /* Deprecated touch -> mouse event conversion,
     use pointer events instead. */
  const do_touch = (e: TouchEvent, type: string, button?: number) => {
    if (haveModal()) {
      return;
    }

    button = button === undefined ? 0 : button;
    const e2 = copyEvent(e);

    if (e.touches.length > 0) {
      const t = e.touches[0];

      e2.pageX = t.pageX;
      e2.pageY = t.pageY;
      e2.screenX = t.screenX;
      e2.screenY = t.screenY;
      e2.clientX = t.clientX;
      e2.clientY = t.clientY;
      e2.x = t.clientX;
      e2.y = t.clientY;
    }

    e2.button = button;

    const e3 = new MouseEvent(type, e2 as MouseEventInit) as MouseEvent & {
      was_touch: boolean;
      touches: TouchList;
    };

    e3.was_touch = true;
    e3.stopPropagation = e.stopPropagation.bind(e);
    e3.preventDefault = e.preventDefault.bind(e);
    (e3 as MouseEvent & { touches: TouchList }).touches = e.touches;

    elem.dispatchEvent(e3);
  };

  elem.addEventListener(
    "touchstart",
    (e) => {
      do_touch(e as TouchEvent, "mousedown", 0);
    },
    { passive: false }
  );
  elem.addEventListener(
    "touchmove",
    (e) => {
      do_touch(e as TouchEvent, "mousemove");
    },
    { passive: false }
  );
  elem.addEventListener(
    "touchcancel",
    (e) => {
      do_touch(e as TouchEvent, "mouseup", 2);
    },
    { passive: false }
  );
  elem.addEventListener(
    "touchend",
    (e) => {
      do_touch(e as TouchEvent, "mouseup", 0);
    },
    { passive: false }
  );

  if (elem.constructor.define().havePickClipboard) {
    elem._clipboardHotkeyInit();
  }
}

export function ondestroy(elem: AnyUIBase): void {
  if (elem.tabIndex >= 0) {
    elem.regenTabOrder();
  }

  if (cconst.DEBUG.paranoidEvents) {
    for (const item of elem.__cbs) {
      elem.removeEventListener(item[0], item[1], item[2]);
    }

    elem.__cbs = [];
  }

  if (elem.ondestroy !== undefined) {
    elem.ondestroy();
  }
}

export function flushUpdate(elem: AnyUIBase, force: boolean): void {
  //check init
  elem._init();

  elem.update();

  elem._forEachChildWidget((c) => {
    if (force || !(c.packflag & PackFlags.NO_UPDATE)) {
      if (!c.ctx) {
        c.ctx = elem.ctx;
      }

      c.flushUpdate(force);
    }
  });
}

export function forEachChildWidget(
  elem: AnyUIBase,
  cb: (n: AnyUIBase) => void,
  thisvar?: unknown
): void {
  const rec = (n: Node & { shadow?: ShadowRoot }) => {
    if (n instanceof UIBase) {
      if (thisvar !== undefined) {
        cb.call(thisvar, n);
      } else {
        cb(n);
      }
    } else {
      for (const n2 of n.childNodes) {
        rec(n2);
      }

      if (n.shadow !== undefined) {
        for (const n2 of n.shadow.childNodes) {
          rec(n2);
        }
      }
    }
  };

  for (const n of elem.childNodes) {
    rec(n);
  }

  if (elem.shadow) {
    for (const n of elem.shadow.childNodes) {
      rec(n);
    }
  }
}

type DoOnceFunc = Function & {
  _doOnce?: (thisvar: AnyUIBase, trace: string) => void;
  _doOnce_reqs?: Set<string>;
};

export function doOnce(elem: AnyUIBase, func: DoOnceFunc, timeout?: number): void {
  if (func._doOnce === undefined) {
    func._doOnce_reqs = new Set();

    func._doOnce = function (thisvar, trace) {
      if (func._doOnce_reqs!.has(thisvar._id)) {
        return;
      }

      func._doOnce_reqs!.add(thisvar._id);

      function f() {
        if (thisvar.isDead()) {
          func._doOnce_reqs!.delete(thisvar._id);

          if (func === thisvar._init || !cconst.DEBUG.doOnce) {
            return;
          }

          console.warn("Ignoring doOnce call for dead element", thisvar._id, func, trace);
          return;
        }

        if (!thisvar.ctx) {
          if (cconst.DEBUG.doOnce) {
            console.warn("doOnce call is waiting for context...", thisvar._id, func);
          }

          internalSetTimeout(f, 0);
          return;
        }

        func._doOnce_reqs!.delete(thisvar._id);
        func.call(thisvar);
      }

      internalSetTimeout(f, timeout);
    };
  }

  const trace = new Error().stack;
  func._doOnce(elem, trace!);
}

export function update(elem: AnyUIBase): void {
  elem.updateToolTips();
  elem.updateEventGraph();
  elem._updatePathWatchers();

  if (elem.ctx && elem._description === undefined && elem.getAttribute("datapath")) {
    const d = elem.getPathDescription(elem.ctx, elem.getAttribute("datapath")!);

    elem.description = d;
  }

  if (!elem._init_done) {
    elem._init();
  }

  if (elem._init_done && !elem.constructor.define().subclassChecksTheme) {
    if (elem.checkThemeUpdate()) {
      elem.setCSS();
    }
  }
}

export function onadd(elem: AnyUIBase): void {
  if (!elem._init_done) {
    elem.doOnce(elem._init);
  }

  if (elem.tabIndex >= 0) {
    elem.regenTabOrder();
  }
}
