import cconst from "../../config/const";
import { pathDebugEvent } from "../../path-controller/util/simple_events";
import type { Area } from "../../screen/ScreenArea";
import { EventCBSymbol, calcElemCBKey } from "./ui_element_registry";
import { UIBase } from "../ui_base";

type AnyUIBase = UIBase<any, any, any>;
type EventCBHolder = { [EventCBSymbol]?: Map<string, EventListener> };

export function getElementById(elem: AnyUIBase, id: string): HTMLElement | undefined {
  let ret: HTMLElement | AnyUIBase | undefined;

  const rec = (n: HTMLElement | AnyUIBase) => {
    if (ret) {
      return;
    }

    if (n.getAttribute("id") === id || n.id === id) {
      ret = n;
    }

    if (n instanceof UIBase && n.constructor.define().tagname === "panelframe-x") {
      rec((n as unknown as { contents: HTMLElement }).contents);
    } else if (n instanceof UIBase && n.constructor.define().tagname === "tabcontainer-x") {
      for (const k in (n as unknown as { tabs: Record<string, HTMLElement> }).tabs) {
        const tab = (n as unknown as { tabs: Record<string, HTMLElement> }).tabs[k];

        if (tab) {
          rec(tab);
        }
      }
    }

    for (const n2 of n.childNodes) {
      if (n2 instanceof HTMLElement) {
        rec(n2);

        if (ret) {
          break;
        }
      }
    }

    if (n instanceof UIBase && n.shadow) {
      for (const n2 of n.shadow.childNodes) {
        if (n2 instanceof HTMLElement) {
          rec(n2);

          if (ret) {
            break;
          }
        }
      }
    }
  };

  rec(elem);

  return ret as HTMLElement;
}

export function findArea(elem: AnyUIBase): Area | undefined {
  let p: any | undefined = elem;

  while (p) {
    if (p[Symbol.IsAreaTag]) {
      return p;
    }
    p = p.parentWidget;
  }

  return p;
}

export function addEventListener(
  elem: AnyUIBase,
  type: string,
  cb: EventListenerOrEventListenerObject,
  options?: AddEventListenerOptions | boolean
): void {
  if (cconst.DEBUG.domEventAddRemove) {
    console.log("addEventListener", type, elem._id, options);
  }

  const cb2 = (e: Event) => {
    if (cconst.DEBUG.paranoidEvents) {
      if (elem.isDead()) {
        elem.removeEventListener(type, cb as any, options);
        return;
      }
    }

    if (cconst.DEBUG.domEvents) {
      pathDebugEvent(e);
    }

    const area = elem.findArea() as
      | (AnyUIBase & { push_ctx_active(): void; pop_ctx_active(): void })
      | undefined;

    if (area) {
      area.push_ctx_active();
      try {
        const ret = (cb as EventListener).call(elem as unknown as HTMLElement, e as any);
        area.pop_ctx_active();
        return ret;
      } catch (error) {
        area.pop_ctx_active();
        throw error;
      }
    } else {
      if (cconst.DEBUG.areaContextPushes) {
        console.warn("Element is not part of an area?", elem);
      }

      return (cb as EventListener).call(elem as unknown as HTMLElement, e as any);
    }
  };

  const cbAny = cb as any;
  if (!cbAny[EventCBSymbol]) {
    cbAny[EventCBSymbol] = new Map();
  }

  const key = calcElemCBKey(elem, type, options);
  cbAny[EventCBSymbol].set(key, cb2);

  if (cconst.DEBUG.paranoidEvents) {
    elem.__cbs.push([type, cb2, options]);
  }

  return HTMLElement.prototype.addEventListener.call(
    elem,
    type,
    cb2,
    options as AddEventListenerOptions
  );
}

export function removeEventListener(
  elem: AnyUIBase,
  type: string,
  cb: EventListener & EventCBHolder,
  options?: AddEventListenerOptions | boolean
): void {
  if (cconst.DEBUG.paranoidEvents) {
    for (const item of elem.__cbs) {
      if (item[0] == type && item[1] === (cb as any)._cb2 && "" + item[2] === "" + options) {
        elem.__cbs.remove(item);
        break;
      }
    }
  }

  if (cconst.DEBUG.domEventAddRemove) {
    console.log("removeEventListener", type, elem._id, options);
  }

  const key = calcElemCBKey(elem, type, options);

  if (!cb[EventCBSymbol]?.has(key)) {
    return HTMLElement.prototype.removeEventListener.call(
      elem,
      type,
      cb as any,
      options as EventListenerOptions
    );
  } else {
    const cb2 = cb[EventCBSymbol].get(key)!;

    const ret = HTMLElement.prototype.removeEventListener.call(
      elem,
      type,
      cb2,
      options as EventListenerOptions
    );

    cb[EventCBSymbol].delete(key);
    return ret;
  }
}

export function replaceChild<T extends Node>(elem: AnyUIBase, newnode: Node, oldnode: T): T {
  for (let i = 0; i < elem.childNodes.length; i++) {
    if ((elem.childNodes[i] as unknown as T) === oldnode) {
      HTMLElement.prototype.replaceChild.call(elem, newnode, oldnode);
      return oldnode;
    }
  }

  for (let i = 0; i < elem.shadow.childNodes.length; i++) {
    if ((elem.shadow.childNodes[i] as unknown as T) === oldnode) {
      elem.shadow.replaceChild(newnode, oldnode);
      return oldnode;
    }
  }

  console.error("Unknown child node", oldnode);
  return oldnode;
}

export function swapWith(elem: AnyUIBase, b: AnyUIBase): boolean {
  let p1: Node | undefined | null | AnyUIBase = elem.parentNode;
  let p2: Node | undefined | null | AnyUIBase = b.parentNode;

  if (p1 === elem.parentWidget?.shadow || !p1) {
    p1 = elem.parentWidget;
  }

  if (p2 === b.parentWidget?.shadow || !p2) {
    p2 = b.parentWidget;
  }

  if (!p1 || !p2) {
    console.error("Invalid call to UIBase.prototype.swapWith", elem, b, p1, p2);
    return false;
  }

  const getPos = (
    n: Node | AnyUIBase,
    p: (Node | AnyUIBase) & { shadow?: ShadowRoot }
  ): [number, Node] => {
    let i = Array.prototype.indexOf.call(p.childNodes, n);

    if (i < 0 && p.shadow) {
      p = p.shadow;
      i = Array.prototype.indexOf.call(p.childNodes, n);
    }

    return [i, p];
  };

  const [i1, n1] = getPos(elem, p1);
  const [i2, n2] = getPos(b, p2);

  console.log("i1, i2, n1, n2", i1, i2, n1, n2);

  const tmp1 = document.createElement("div");
  const tmp2 = document.createElement("div");

  n1.insertBefore(tmp1, elem);
  n2.insertBefore(tmp2, b);

  n1.replaceChild(b, tmp1);
  n2.replaceChild(elem, tmp2);

  const ptmp = elem.parentWidget;
  elem.parentWidget = b.parentWidget;
  b.parentWidget = ptmp;

  tmp1.remove();
  tmp2.remove();

  return true;
}

export function traverse(
  elem: AnyUIBase,
  type_or_set:
    | (new (...args: unknown[]) => AnyUIBase)
    | Set<new (...args: unknown[]) => AnyUIBase>
    | (new (...args: unknown[]) => AnyUIBase)[]
): Generator<AnyUIBase> {
  let classes: Iterable<new (...args: unknown[]) => AnyUIBase>;

  let is_set = type_or_set instanceof Set;
  is_set = is_set || Array.isArray(type_or_set);

  if (!is_set) {
    classes = [type_or_set as new (...args: unknown[]) => AnyUIBase];
  } else {
    classes = type_or_set as Iterable<new (...args: unknown[]) => AnyUIBase>;
  }

  const visit = new Set<Node>();

  return (function* () {
    const stack: (Node & { shadow?: ShadowRoot })[] = [elem];

    while (stack.length > 0) {
      const n = stack.pop()!;

      visit.add(n);

      if (!n?.childNodes) {
        continue;
      }

      for (const cls of classes) {
        if (n instanceof cls) {
          yield n;
        }
      }

      for (const c of n.childNodes) {
        if (!visit.has(c)) {
          stack.push(c);
        }
      }

      if (n.shadow) {
        for (const c of n.shadow.childNodes) {
          if (!visit.has(c)) {
            stack.push(c);
          }
        }
      }
    }
  })();
}

export function appendChild<T extends Node>(elem: AnyUIBase, child: T): T {
  if (child instanceof UIBase) {
    child.ctx = elem.ctx;
    child.parentWidget = elem;

    child.useDataPathUndo = elem.useDataPathUndo;
  }

  return HTMLElement.prototype.appendChild.call(elem, child) as T;
}

export function remove(elem: AnyUIBase, trigger_on_destroy = true): void {
  if (elem.tabIndex >= 0) {
    elem.regenTabOrder();
  }

  elem.clearPathWatches();

  HTMLElement.prototype.remove.call(elem);

  if (trigger_on_destroy) {
    elem._ondestroy();
  }

  if (elem.on_remove) {
    elem.on_remove();
  }

  elem.parentWidget = undefined;
}

export function removeChild<T extends Node>(
  elem: AnyUIBase,
  child: T,
  trigger_on_destroy = true
): T {
  HTMLElement.prototype.removeChild.call(elem, child);
  if (child instanceof UIBase) {
    child.clearPathWatches();
  }
  if (child instanceof UIBase && child.on_remove) {
    child.on_remove();
  }
  if (trigger_on_destroy && child instanceof UIBase) {
    child._ondestroy();
  }
  if (child instanceof UIBase) {
    child.parentWidget = undefined;
  }
  return child;
}
