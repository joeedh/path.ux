/**
 * The popup machinery behind Screen.popup / Screen.draggablePopup. Screen keeps those
 * methods as thin delegates; the container construction, screen registration and
 * close-on-click-outside wiring live here.
 */

import * as util from "../path-controller/util/util";
import { keymap } from "../path-controller/util/simple_events";
import { UIBase } from "../core/ui_base";
import type { IContextBase } from "../core/context_base";
import type { Container } from "../core/ui";
import { ScreenArea } from "./ScreenArea";
import { ScreenBorder } from "./FrameManager_mesh";
import { ZIndexes } from "./constants";
import type { Screen } from "./FrameManager";

export { ZIndexes };

/**
 * Which pointer gestures outside a popup close it. `true` and `false` are the original setting:
 * both gestures, or neither. The strings split them, for a popup the pointer has to be able to
 * leave — a picker the user browses and then confirms — without it disappearing.
 */
export type PopupCloseMode = boolean | "click" | "move" | "click-move";

/** Whether `mode` closes on a press outside, and whether it closes on the pointer moving out. */
function closeGestures(mode: PopupCloseMode): { click: boolean; move: boolean } {
  if (typeof mode === "boolean") {
    return { click: mode, move: mode };
  }

  return { click: mode !== "move", move: mode !== "click" };
}

/**
 * The container `Screen.popup` returns. `end()` closes the popup: it removes the
 * outside-click and Escape listeners and unregisters the container from the screen.
 * Calling `remove()` with no arguments funnels into `end()` as well, so hooking
 * `remove` observes every teardown path.
 */
export interface PopupContainer<CTX extends IContextBase = IContextBase> extends Container<CTX> {
  end(): void;
}

/** Registers a floated element so `Screen.pickElement` checks it before the screen tree. */
export function addPopup(screen: Screen, popup: UIBase) {
  screen._popups.push(popup);
}

/** Unregisters an element `addPopup` registered; a second call is a no-op. */
export function removePopup(screen: Screen, popup: UIBase) {
  if (screen._popups.includes(popup)) {
    screen._popups.remove(popup);
  }
}

/**
 * Waits `popupDelay` milliseconds for the popup to lay out, then moves it fully inside
 * the window if it hangs past an edge. The popup is parked at `ZIndexes.measuring`
 * until its rect can be read, so the unclamped frame is never shown.
 */
export function clampPopup(screen: Screen, popup: UIBase, popupDelay: number) {
  const z = popup.style["zIndex"];

  popup.style["zIndex"] = `${ZIndexes.measuring}`;

  const cb = () => {
    const rect = popup.getClientRects()[0];
    const size = screen.size;

    if (!rect) {
      screen.doOnce(cb);
      return;
    }

    if (rect.bottom > size[1]) {
      popup.style["top"] = size[1] - rect.height - 10 + "px";
    } else if (rect.top < 0) {
      popup.style["top"] = "10px";
    }
    if (rect.right > size[0]) {
      popup.style["left"] = size[0] - rect.width - 10 + "px";
    } else if (rect.left < 0) {
      popup.style["left"] = "10px";
    }

    popup.style["zIndex"] = z;

    popup.flushUpdate();
    popup.flushSetCSS();
  };

  setTimeout(cb, popupDelay);
}

/**
 * Builds the container `Screen.popup` returns: a themed container-x at `x, y`, appended
 * to document.body, registered with the screen, and wired to close on Escape and on
 * whichever outside gestures `closeOnMouseOut` names.
 */
export function makePopup(
  screen: Screen,
  owning_node: UIBase,
  elem_or_x: UIBase | number,
  y?: number,
  closeOnMouseOut: PopupCloseMode = true,
  closeEventSource: EventTarget & GlobalEventHandlers = screen,
  /** In milliseconds. */
  mouseOutCloseTimeout = 250
): PopupContainer {
  const closeOn = closeGestures(closeOnMouseOut);
  let sarea = screen.sareas.active;
  let w = owning_node as UIBase | undefined;

  while (w) {
    if (w instanceof ScreenArea) {
      sarea = w;
      break;
    }
    w = w.parentWidget;
  }

  let rx: number | undefined;
  let ry: number | undefined;
  if (typeof elem_or_x === "object") {
    const r = elem_or_x.getClientRects()[0];
    rx = r.x;
    ry = r.y;
  } else {
    rx = elem_or_x;
  }

  const x = (typeof elem_or_x === "number" ? elem_or_x : rx) ?? 0;
  y = y ?? ry ?? 0;

  const container = UIBase.createElement("container-x") as Container & {
    background: string;
    end: () => void;
  };

  container.ctx = screen.ctx;
  container._init();

  const remove = container.remove;
  container.remove = (...args: Parameters<UIBase["remove"]>) => {
    removePopup(screen, container);

    return remove.apply(container, args);
  };

  container.overrideClass("popup");

  container.background = container.getDefault("background-color");
  container.style["borderRadius"] = container.getDefault("border-radius") + "px";
  container.style["borderColor"] = container.getDefault("border-color");
  container.style["borderStyle"] = container.getDefault("border-style");
  container.style["borderWidth"] = container.getDefault("border-width") + "px";
  container.style["boxShadow"] = container.getDefault("box-shadow");

  container.style["position"] = UIBase.PositionKey;
  container.style["zIndex"] = `${ZIndexes.popup}`;
  container.style["left"] = x + "px";
  container.style["top"] = y + "px";
  container.style["margin"] = "0px";

  container.parentWidget = screen;
  container.updateAfter(() => {
    container.style["zIndex"] = `${ZIndexes.popup}`;
  });

  document.body.appendChild(container);
  screen.setCSS();

  addPopup(screen, container);

  // eslint-disable-next-line prefer-const
  let mousepick: ((e: PointerEvent) => void) | undefined;
  // eslint-disable-next-line prefer-const
  let mousepickWithTimout: ((e: PointerEvent) => void) | undefined;

  // eslint-disable-next-line prefer-const
  let keydown: (e: KeyboardEvent) => void | undefined;

  let done = false;
  const end = () => {
    if (screen._popup_safe) {
      return;
    }

    if (done) return;

    // the same target they were added to, or a popup opened against another one leaks all three
    if (mousepick && mousepickWithTimout) {
      closeEventSource.removeEventListener("pointerdown", mousepick, true);
      closeEventSource.removeEventListener("pointermove", mousepickWithTimout, {
        passive: true,
      } as any);
      closeEventSource.removeEventListener("pointerup", mousepick, true);
    }
    window.removeEventListener("keydown", keydown);

    done = true;
    container.remove();
  };

  container.end = end;

  const _remove = container.remove;
  container.remove = function (...args: Parameters<typeof _remove>) {
    if (arguments.length == 0) {
      end();
    }
    _remove.apply(this, args);
  };

  container._ondestroy = () => {
    end();
  };

  let bad_time = util.time_ms();
  let last_pick_time = util.time_ms();
  /** Whether a press of its own has arrived, as opposed to the tail of the one that opened it. */
  let pressed = false;

  const mousepickBase = (e: PointerEvent, fromMove = false) => {
    if (!container.isConnected) {
      end();
      return;
    }

    if (sarea?.area) {
      sarea.area.push_ctx_active();
      sarea.area.pop_ctx_active();
    }

    // One handler serves all three events, so which gesture this is decides whether it may close.
    // A gesture that cannot close leaves before the throttle below, or a stream of moves would
    // keep resetting it and the press that is meant to close would never be looked at.
    if (!(fromMove ? closeOn.move : closeOn.click)) {
      return;
    }

    if (fromMove) {
      // moves arrive as a stream, so they are sampled; a press is discrete and is not
      if (util.time_ms() - last_pick_time < 350) {
        return;
      }
      last_pick_time = util.time_ms();
    } else {
      // The gesture that opened the popup still owes its pointerup, and that release is not a
      // press outside. It is ignored until a pointerdown of the popup's own has arrived.
      if (e.type === "pointerup" && !pressed) {
        return;
      }
      pressed = true;
    }

    const x = e.x;
    const y = e.y;

    let elem = screen.pickElement(x, y, {
      excluded_classes: [ScreenBorder],
      mouseEvent      : e,
    });

    if (elem === undefined) {
      end();
      return;
    }

    let ok = false;

    while (elem) {
      if (elem === container) {
        ok = true;
        break;
      }
      elem = elem.parentWidget;
    }

    if (!ok) {
      // a press closes at once; a move has to have sat outside for mouseOutCloseTimeout first
      if (!fromMove || util.time_ms() - bad_time > mouseOutCloseTimeout) {
        end();
      }
    } else {
      bad_time = util.time_ms();
    }
  };

  keydown = (e: KeyboardEvent) => {
    if (!container.isConnected) {
      window.removeEventListener("keydown", keydown);
      return;
    }

    switch (e.keyCode) {
      case keymap["Escape"]:
        end();
        break;
    }
  };

  mousepickWithTimout = (e: PointerEvent) => mousepickBase(e, true);
  mousepick = mousepickBase;

  closeEventSource.addEventListener("pointerdown", mousepick, true);
  closeEventSource.addEventListener("pointermove", mousepickWithTimout, {
    passive: true,
  });
  closeEventSource.addEventListener("pointerup", mousepick, true);
  window.addEventListener("keydown", keydown);

  screen.calcTabOrder();

  return container;
}
