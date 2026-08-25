import { contextWrangler } from "../../screen/area_wrangler";
import {
  keymap,
  pushModalLight,
  popModalLight,
  pushPointerModal,
} from "../../path-controller/util/simple_events";
import cconst from "../../config/const";
import { CSSFont } from "../cssfont";
import { UIBase } from "../ui_base";

type AnyUIBase = UIBase<any, any, any>;

//avoid circular module references
let TextBox: (new (...args: unknown[]) => HTMLElement) | undefined = undefined;

export function _setTextboxClass(cls: new (...args: unknown[]) => HTMLElement): void {
  TextBox = cls;
}

export function pushModal(
  elem: AnyUIBase,
  handlers: any = elem,
  autoStopPropagation = true,
  pointerId?: number,
  pointerElem: UIBase = elem
): unknown {
  if (elem._modaldata !== undefined) {
    console.warn("UIBase.prototype.pushModal called when already in modal mode");
    elem.popModal();
  }

  const _areaWrangler = contextWrangler.copy();

  contextWrangler.copy();

  function bindFunc(func: Function): (...args: unknown[]) => unknown {
    return function (this: unknown, ...args: unknown[]) {
      _areaWrangler.copyTo(contextWrangler);

      return func.apply(handlers, args);
    };
  }

  const handlers2: Record<string, Function> = {};
  for (const k in handlers) {
    const func = handlers[k];

    if (typeof func !== "function") {
      continue;
    }

    handlers2[k] = bindFunc(func);
  }

  if (pointerId !== undefined && pointerElem) {
    elem._modaldata = pushPointerModal(handlers2, undefined, undefined, autoStopPropagation);
  } else {
    elem._modaldata = pushModalLight(handlers2, autoStopPropagation);
  }

  return elem._modaldata;
}

export function popModal(elem: AnyUIBase): void {
  if (elem._modaldata === undefined) {
    console.warn("Invalid call to UIBase.prototype.popModal");
    return;
  }

  popModalLight(elem._modaldata!);
  elem._modaldata = undefined;
}

export function updateDisable(elem: AnyUIBase, val: boolean): void {
  if (!!val === !!elem.__disabledState) {
    return;
  }

  elem.__disabledState = !!val;

  if (val && !elem._disdata) {
    const style: any = elem.getDefault("disabled") ??
      elem.getDefault("internalDisabled") ?? {
        "background-color": elem.getDefault("DisabledBG"),
      };

    elem._disdata = {
      style   : {},
      defaults: {},
    };

    for (const k in style) {
      //save old style information
      elem._disdata.style[k] = elem.saneStyle[k];
      elem._disdata.defaults[k] = elem.default_overrides[k];

      const v = style[k];

      if (typeof v === "object" && v instanceof CSSFont) {
        elem.saneStyle[k] = style[k].genCSS();
      } else if (typeof v === "object") {
        continue;
      } else {
        elem.saneStyle[k] = style[k];
      }
      elem.default_overrides[k] = style[k];
    }

    elem.__disabledState = !!val;
    elem.on_disabled();
  } else if (!val && elem._disdata) {
    //load old style information
    for (const k in elem._disdata.style) {
      elem.saneStyle[k] = elem._disdata.style[k];
    }

    for (const k in elem._disdata.defaults) {
      const v = elem._disdata.defaults[k];

      if (v === undefined) {
        delete elem.default_overrides[k];
      } else {
        elem.default_overrides[k] = v;
      }
    }

    elem._disdata = undefined;

    elem.__disabledState = !!val;
    elem.on_enabled();
  }

  elem.__disabledState = !!val;

  const visit = (n: UIBase | HTMLElement | Node) => {
    if (n instanceof UIBase) {
      let changed = !!n.__disabledState;

      n.__updateDisable(n.disabled);

      changed = changed !== !!n.__disabledState;
      if (changed) {
        n.update();
        n.setCSS();
      }
    }
  };

  elem._forEachChildWidget(visit);
}

export function clipboardHotkeyInit(elem: AnyUIBase): void {
  elem._clipboard_over = false;
  elem._last_clipboard_keyevt = undefined;

  elem._clipboard_keystart = () => {
    if (elem._clipboard_events) {
      return;
    }

    elem._clipboard_events = true;
    window.addEventListener("keydown", elem._clipboard_keydown, {
      capture: true,
      passive: false,
    });
  };

  elem._clipboard_keyend = () => {
    if (!elem._clipboard_events) {
      return;
    }

    elem._clipboard_events = false;
    window.removeEventListener("keydown", elem._clipboard_keydown, { capture: true });
  };

  elem._clipboard_keydown = (e: KeyboardEvent, internal_mode?: boolean) => {
    if (!elem.isConnected || !cconst.getClipboardData) {
      elem._clipboard_keyend();
      return;
    }

    if (e === elem._last_clipboard_keyevt || !elem._clipboard_over) {
      return;
    }

    /* the user's mouse cursor might not be over the element
     *  if they've tabbed to it */

    const is_copy =
      e.keyCode === keymap["C"] && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey;
    const is_paste =
      e.keyCode === keymap["V"] && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey;

    if (!is_copy && !is_paste) {
      //early out, remember that pickElement is highly expensive to run
      return;
    }

    //pasteForAllChildren
    if (!internal_mode) {
      const screen = elem.ctx.screen;
      let picked: UIBase | undefined = screen.pickElement(screen.mpos[0], screen.mpos[1]);

      let checkTree = is_paste && elem.constructor.define().pasteForAllChildren;
      checkTree = checkTree || (is_copy && elem.constructor.define().copyForAllChildren);

      while (
        checkTree &&
        !(TextBox && picked instanceof TextBox) &&
        picked !== elem &&
        picked?.parentWidget
      ) {
        console.log("  " + picked._id);

        picked = picked.parentWidget;
      }

      console.warn("COLOR", elem._id, picked ? picked._id : "none");

      if (picked !== elem) {
        //remove global keyhandler
        elem._clipboard_keyend();
        return;
      }
    } else {
      console.warn("COLOR", elem._id);
    }

    elem._last_clipboard_keyevt = e;

    if (is_copy) {
      elem.clipboardCopy();
      e.preventDefault();
      e.stopPropagation();
    }

    if (is_paste) {
      elem.clipboardPaste();
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const start = () => {
    elem._clipboard_over = true;
    elem._clipboard_keystart();
  };

  const stop = () => {
    elem._clipboard_over = false;
    elem._clipboard_keyend();
  };

  elem.doOnce(() => {
    elem.tabIndex = 0; //enable self key events when element has focus
  });

  elem.addEventListener("keydown", ((e: KeyboardEvent) => {
    return elem._clipboard_keydown(e, true);
  }) as EventListener);

  elem.addEventListener("pointerover", start, { capture: true, passive: true });
  elem.addEventListener("pointerout", stop, { capture: true, passive: true });
  elem.addEventListener("focus", stop, { capture: true, passive: true });
}
