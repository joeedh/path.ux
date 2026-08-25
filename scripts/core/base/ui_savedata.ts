import { UIBase } from "../ui_base";
import type { IContextBase } from "../context_base";

const PTOT = 2;

/**

 Saves UI layout data, like panel layouts, active tabs, etc.
 Uses the UIBase.prototype.[save/load]Data interface.

 Note that this is error-tolerant.
 */
export function saveUIData<CTX extends IContextBase = IContextBase>(
  node: UIBase<CTX>,
  key: string
): string {
  if (key === undefined) {
    throw new Error("ui_base.saveUIData(): key cannot be undefined");
  }

  const paths: unknown[][] = [];

  const rec = (
    n: Node & { shadow?: ShadowRoot },
    path: unknown[],
    ni: number,
    is_shadow: boolean
  ) => {
    path = path.slice(0, path.length); //copy path

    const pi = path.length;
    for (let i = 0; i < PTOT; i++) {
      path.push(undefined);
    }

    path[pi] = ni;
    path[pi + 1] = is_shadow ? 1 : 0;

    if (n instanceof UIBase) {
      const path2 = path.slice(0, path.length);
      const data = n.saveData();

      let bad = !data;
      bad = bad || (typeof data === "object" && Object.keys(data).length === 0);

      if (!bad) {
        path2.push(data);

        if (path2[pi + 2]) {
          paths.push(path2);
        }
      }
    }

    for (let i = 0; i < n.childNodes.length; i++) {
      const n2 = n.childNodes[i];

      rec(n2, path, i, false);
    }

    const shadow = n.shadow;

    if (!shadow) return;

    for (let i = 0; i < shadow.childNodes.length; i++) {
      const n2 = shadow.childNodes[i];

      rec(n2, path, i, true);
    }
  };

  rec(node, [], 0, false);

  return JSON.stringify({
    key        : key,
    paths      : paths,
    _ui_version: 1,
  });
}

export function loadUIData<CTX extends IContextBase = IContextBase>(
  node: UIBase<CTX>,
  buf: string | null | undefined
): void {
  if (buf === undefined || buf === null) {
    return;
  }

  const obj = JSON.parse(buf);

  for (let path of obj.paths) {
    let n = node as typeof node | undefined;

    if (n === undefined) {
      break;
    }

    const data = path[path.length - 1];
    path = path.slice(2, path.length - 1); //in case some api doesn't want me calling .pop()

    for (let pi = 0; pi < path.length; pi += PTOT) {
      const ni = path[pi];
      const shadow = path[pi + 1];

      let list;

      if (shadow) {
        list = n!.shadow;

        if (list) {
          list = list.childNodes;
        }
      } else {
        list = n!.childNodes;
      }

      if (list?.[ni] === undefined) {
        n = undefined;
        break;
      }

      n = list[ni] as typeof n;
    }

    if (n !== undefined && n instanceof UIBase) {
      n._init(); //ensure init's been called, _init will check if it has
      n.loadData(data);
    }
  }
}
