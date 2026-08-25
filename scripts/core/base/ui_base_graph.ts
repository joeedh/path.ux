import {
  DependSocket,
  PropertySocket,
  PropSocketModes,
  SocketTypes,
  theEventGraph,
  SocketType,
} from "../../path-controller/dag/eventdag";
import type { UIBase } from "../ui_base";

type AnyUIBase = UIBase<any, any, any>;

export const uiBaseNodeDef = {
  flag    : 0,
  typeName: "UIBase",
  uiName  : "UIBase",
  inputs: {
    depend: new DependSocket(),
  },
  outputs: {
    depend: new DependSocket(),
  },
};

function isNumArray(a: any) {
  if (!(a instanceof Array)) {
    return false;
  }

  const b = a as unknown as number[];

  for (let i = 0; i < a.length; i++) {
    if (b[i] !== undefined && typeof b[i] !== "number" && typeof b[i] !== "boolean") {
      return false;
    }
  }

  return true;
}

export function graphExec(elem: AnyUIBase): void {
  const node = elem.graphNode;
  if (node === undefined) {
    return;
  }

  if (node.inputs.depend.isUpdated) {
    node.outputs.depend.flagUpdate();
  }

  for (const k in node.inputs) {
    const sock = node.inputs[k];

    if (!(sock instanceof PropertySocket)) {
      continue;
    }

    let val = sock.value;
    let first = true;

    for (const sockb of sock.edges) {
      if (first) {
        val = sockb.value;
        first = false;
      } else {
        switch (sock.mixMode) {
          case PropSocketModes.REPLACE:
            val = sockb.value;
            break;
          case PropSocketModes.MIN:
            val = Math.min(val, sockb.value as number); // XXX bad cast!
            break;
          case PropSocketModes.MAX:
            val = Math.max(val, sockb.value as number); // XXX bad cast!
            break;
        }
      }
    }

    sock.value = val;
  }

  for (const k in node.outputs) {
    const sock = node.outputs[k];

    if (!(sock instanceof PropertySocket)) {
      continue;
    }

    const v = sock.value;
    let changed;
    if (typeof v === "boolean" || typeof v === "string" || typeof v === "number") {
      changed = v !== sock.oldValue;
      sock.oldValue = v;
    } else if (typeof v === "object") {
      if (isNumArray(v)) {
        if (!sock.oldValue) {
          sock.oldValue = Array.from(v);
        } else {
          if (sock.oldValue.length !== v.length) {
            changed = true;
          } else {
            for (let i = 0; i < sock.oldValue.length; i++) {
              changed = sock.oldValue[i] !== v[i];
            }
          }

          if (sock.oldValue.length !== v.length) {
            sock.oldValue.length = v.length;
          }
          for (let i = 0; i < v.length; i++) {
            sock.oldValue[i] = v.value[i];
          }
        }
      } else {
        if (sock.oldValue === undefined) {
          sock.oldValue = JSON.stringify(v);
        } else {
          const json = JSON.stringify(v);
          changed = json !== sock.oldValue;
          sock.oldValue = json;
        }
      }
    }

    if (changed) {
      console.log("Propagating prop update");
      sock.flagUpdate();
    }
  }
}

export function ensureGraph(elem: AnyUIBase): void {
  if (!theEventGraph.has(elem)) {
    theEventGraph.add(elem);
  }
}

export function flagPropSocketUpdate(elem: AnyUIBase, path: string): void {
  const sock = elem.getPropertySocket(path, SocketTypes.OUTPUT);
  if (sock) {
    console.warn(`Flag socket "${path}" for update`);
    sock.flagUpdate();
  }
}

export function getPropertySocket(
  elem: AnyUIBase,
  prop: string,
  socktype: string
): PropertySocket | undefined {
  const node = elem.graphNode;
  const sockets = socktype === SocketTypes.INPUT ? node!.inputs : node!.outputs;

  if (sockets[prop]) {
    return sockets[prop] as PropertySocket;
  }

  return undefined;
}

export function ensurePropertySocket(
  elem: AnyUIBase,
  prop: string,
  socktype: SocketType
): PropertySocket {
  elem.ensureGraph();

  const node = elem.graphNode!;
  const sockets = socktype === "inputs" ? node!.inputs : node!.outputs;

  if (sockets[prop]) {
    return sockets[prop] as PropertySocket;
  }

  const sock = new PropertySocket();
  sock.bind(elem, prop);
  node.addSocket(socktype, prop, sock);

  if (prop === "value") {
    sock.callback(() => {
      if (elem.getValue) {
        return elem.getValue();
      }

      return elem.value;
    });
  }

  return sock;
}

export function dependsOn(
  elem: AnyUIBase,
  dstProp: string,
  source: AnyUIBase,
  srcProp: string,
  srcCallback?: (v: unknown) => unknown
): PropertySocket {
  const sockdst = elem.ensurePropertySocket(dstProp, SocketTypes.INPUT);
  const socksrc = source.ensurePropertySocket(srcProp, SocketTypes.OUTPUT);

  if (srcCallback) {
    socksrc.callback(srcCallback);
  }

  sockdst.connect(socksrc);

  return sockdst;
}

export function updateEventGraph(elem: AnyUIBase): void {
  if (!elem.isConnected) {
    elem._reflagGraph = true;
  } else if (elem._reflagGraph) {
    elem._reflagGraph = false;

    for (const [, sock] of Object.entries(elem.graphNode!.inputs)) {
      sock.flagUpdate();
    }
  }
}
