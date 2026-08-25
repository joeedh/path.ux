import { contextWrangler } from "../../screen/area_wrangler";
import {
  pushModalLight,
  popModalLight,
  pushPointerModal,
} from "../../path-controller/util/simple_events";
import type { UIBase } from "../ui_base";

type AnyUIBase = UIBase<any, any, any>;

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
