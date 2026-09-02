import type { DataAPI, DataStruct } from "../path-controller/controller/controller";
import { Graph } from "./graph";
import { Node } from "./node";
import type { NodeTypeConstructor } from "./node";

type Mappable = Parameters<DataAPI["mapStruct"]>[0];

/**
 * Declares the Graph datapath layout on api and returns its struct: a "nodes" list
 * keyed by node id, each entry typed by its own class's defineAPI. Idempotent, so a
 * GroupNode's "group" member and the app's root can both call it.
 */
export function defineGraphAPI(
  api: DataAPI,
  st?: DataStruct,
  validStructs?: DataStruct[]
): DataStruct {
  st ??= api.mapStruct(Graph as unknown as Mappable, true)!;
  if ("nodes" in st.pathmap) {
    return st;
  }

  const list = st.list<Node[], number | string, Node | undefined>("nodes", "nodes", {
    get(_api: DataAPI, list: Node[], key: number | string) {
      return list.find((n) => String(n.id) === String(key));
    },
    getKey(_api: DataAPI, _list: Node[], obj: Node | undefined) {
      return obj?.id;
    },
    getLength(_api: DataAPI, list: Node[]) {
      return list.length;
    },
    getIter(_api: DataAPI, list: Node[]) {
      return list[Symbol.iterator]();
    },
    getStruct(api2: DataAPI, list: Node[], key: number | string) {
      const node = list.find((n) => String(n.id) === String(key));
      if (node === undefined) {
        return undefined;
      }
      return nodeStructFor(api2, node.constructor as NodeTypeConstructor);
    },
  });
  list.validStructs = validStructs ?? [];

  return st;
}

/** The DataStruct for a node class, built on first use from the class's defineAPI. */
export function nodeStructFor(api: DataAPI, cls: NodeTypeConstructor): DataStruct {
  if (api.hasStruct(cls)) {
    return api.getStruct(cls);
  }

  const st = api.mapStruct(cls as unknown as Mappable, true)!;
  (cls as unknown as typeof Node).defineAPI(api, st);
  return st;
}
