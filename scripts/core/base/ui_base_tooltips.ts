import * as util from "../../path-controller/util/util";
import cconst from "../../config/const";
import { haveModal } from "../../path-controller/util/simple_events";
import type { ToolTipState } from "./ui_base_types";
import type { UIBase } from "../ui_base";

type AnyUIBase = UIBase<any, any, any>;

export function abortToolTips<T extends AnyUIBase>(elem: T, delayMs = 500): T {
  if (elem._has_own_tooltips) {
    elem._has_own_tooltips.stop_timer();
  }

  if (elem._tooltip_ref) {
    elem._tooltip_ref.remove();
    elem._tooltip_ref = undefined;
  }

  elem._tool_tip_abort_delay = util.time_ms() + delayMs;

  return elem;
}

export function updateToolTipHandlers(elem: AnyUIBase): void {
  if (!elem._useNativeToolTips_set && !cconst.useNativeToolTips !== !elem._useNativeToolTips) {
    elem._useNativeToolTips = cconst.useNativeToolTips;
  }

  if (!!elem.useNativeToolTips === !elem._has_own_tooltips) {
    return;
  }

  if (!elem.useNativeToolTips) {
    const state: ToolTipState = (elem._has_own_tooltips = {
      start_timer: () => {
        elem._tooltip_timer = util.time_ms();
      },
      stop_timer: () => {
        elem._tooltip_timer = undefined;
      },
      reset_timer: () => {
        if (elem._tooltip_timer !== undefined) {
          elem._tooltip_timer = util.time_ms();
        }
      },
      start_events: ["mouseover"],
      reset_events: [
        "mousemove",
        "mousedown",
        "mouseup",
        "touchstart",
        "touchend",
        "keydown",
        "focus",
      ],
      stop_events : ["mouseleave", "blur", "mouseout"],
      handlers    : {},
    });

    const bind_handler = (type: string, etype: string): EventListener => {
      const handler = (e: Event) => {
        if (
          elem._tool_tip_abort_delay !== undefined &&
          util.time_ms() < elem._tool_tip_abort_delay
        ) {
          elem._tooltip_timer = undefined;
          return;
        }

        (state as any)[type](e);
      };

      if (etype in state.handlers) {
        console.error(type, "is in handlers already");
        return (state.handlers as any)[etype]!;
      }

      (state.handlers as any)[etype] = handler;
      return handler;
    };

    let i = 0;
    const lists = [state.start_events, state.stop_events, state.reset_events];

    for (const type of ["start_timer", "stop_timer", "reset_timer"]) {
      for (const etype of lists[i]) {
        elem.addEventListener(etype, bind_handler(type, etype), { passive: true });
      }

      i++;
    }
  } else {
    console.warn(elem.id, "removing tooltip handlers");
    const state = elem._has_own_tooltips;

    for (const k in state!.handlers) {
      const handler = state!.handlers[k];
      elem.removeEventListener(k, handler);
    }

    elem._has_own_tooltips = undefined;
    elem._tooltip_timer = undefined;
  }
}

export function updateToolTips(elem: AnyUIBase): void {
  if (
    elem._description_final === undefined ||
    elem._description_final === null ||
    elem._description_final.trim().length === 0
  ) {
    return;
  }

  if (!elem.ctx || !elem.ctx.screen) {
    return;
  }

  elem.updateToolTipHandlers();

  if (elem.useNativeToolTips || elem._tooltip_timer === undefined) {
    return;
  }

  if (elem._tool_tip_abort_delay !== undefined && util.time_ms() < elem._tool_tip_abort_delay) {
    return;
  }

  elem._tool_tip_abort_delay = undefined;

  const screen = elem.ctx.screen;

  const timelimit = 500;
  let ok = util.time_ms() - elem._tooltip_timer! > timelimit;

  const x = screen.mpos[0];
  const y = screen.mpos[1];

  const rects = elem.getClientRects();
  const r: DOMRect | undefined = rects ? rects[0] : undefined;

  if (!r) {
    ok = false;
  } else {
    ok = ok && x >= r.x && x < r.x + r.width;
    ok = ok && y >= r.y && y < r.y + r.height;
  }

  ok = ok && !haveModal();
  ok = ok && screen.pickElement(x, y) === elem;
  ok = ok && !!elem._description_final;

  if (ok) {
    const _ToolTip = window._ToolTip;
    elem._tooltip_ref = _ToolTip.show(elem._description_final!, elem.ctx.screen, x, y);
  } else {
    if (elem._tooltip_ref) {
      elem._tooltip_ref.remove();
    }

    elem._tooltip_ref = undefined;
  }

  if (util.time_ms() - elem._tooltip_timer > timelimit) {
    elem._tooltip_timer = undefined;
  }
}
