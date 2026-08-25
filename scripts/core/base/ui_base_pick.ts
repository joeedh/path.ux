import * as math from "../../path-controller/util/math";
import type { IUIBaseConstructor, PickArgs } from "./ui_base_types";
import { UIBase } from "../ui_base";

type AnyUIBase = UIBase<any, any, any>;

export function calcZ(elem: AnyUIBase): number {
  let p: AnyUIBase | undefined = elem;
  let n: Node | null | AnyUIBase | undefined = elem;

  while (n) {
    if (n instanceof HTMLElement && !isNaN(parseFloat("" + n.style["zIndex"]))) {
      const z = parseFloat(n.style["zIndex"]);
      return z;
    }

    n = n.parentNode;

    if (!n) {
      n = p = p!.parentWidget;
    }
  }

  return 0;
}

/** returns path to a specific element, see document.elementsFromPoint */
export function pickElements<T extends AnyUIBase>(
  elem: AnyUIBase,
  x: number,
  y: number,
  args: PickArgs = {}
): T[] {
  const nodeclass: IUIBaseConstructor = args.nodeclass || UIBase;
  const excluded_classes = args.excluded_classes;

  x -= window.scrollX;
  y -= window.scrollY;

  const elems = elem.shadow.elementsFromPoint(x, y);

  const excluded = (n: AnyUIBase) =>
    excluded_classes ? excluded_classes.find((n2) => n instanceof n2) : false;
  const visit = new WeakSet<Element>();

  const result = new Set<T>();
  const recurse = (elems2: Element[]) => {
    for (const n of elems2) {
      if (n instanceof UIBase) {
        const ns = n.shadow.elementsFromPoint(x, y);
        if (!excluded(n) && (!nodeclass || n instanceof nodeclass)) {
          result.add(n as T);
        }
        ns.forEach((n2) => visit.add(n2));
        recurse(ns.filter((n2) => !visit.has(n2)));
      }
    }
  };
  recurse(elems);

  return Array.from(result);
}

export function pickElement<T extends AnyUIBase>(
  x: number,
  y: number,
  args: PickArgs = {}
): T | undefined {
  const nodeclass: IUIBaseConstructor = args.nodeclass || UIBase;
  const excluded_classes = args.excluded_classes;
  const clip = args.clip;

  x -= window.scrollX;
  y -= window.scrollY;

  let elem: Element | null = document.elementFromPoint(x, y);

  if (!elem) {
    return;
  }

  const path = [elem];
  let lastelem: Element | null = elem;
  let i = 0;

  while (elem instanceof UIBase) {
    if (i++ > 1000) {
      console.error("Infinite loop error");
      break;
    }

    elem = elem.shadow.elementFromPoint(x, y);

    if (elem === lastelem) {
      break;
    }

    if (elem) {
      path.push(elem);
    }

    lastelem = elem;
  }

  path.reverse();

  for (let i = 0; i < path.length; i++) {
    const node = path[i];
    let ok = node instanceof nodeclass;

    if (excluded_classes) {
      for (const cls of excluded_classes) {
        ok = ok && !(node instanceof cls);
      }
    }

    if (clip) {
      const rect = node.getBoundingClientRect();
      // avoid GC
      const clip2 = math.aabb_intersect_2d(
        clip.pos,
        clip.size,
        [rect.x, rect.y],
        [rect.width, rect.height]
      );

      ok = ok && Boolean(clip2);
    }

    if (ok) {
      return node as T;
    }
  }
}
