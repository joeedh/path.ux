// @vitest-environment node

// The graph module's headless contract: importing scripts/graph performs no
// DOM access, so an Electron main process or CLI can use it outside a browser.
// This file runs in vitest's node environment — no happy-dom, no window.
import { test, expect } from "vitest";
import * as nstructjs from "../scripts/path-controller/util/nstructjs";
import { readJSON, writeJSON } from "../scripts/path-controller/util/nstructjs";
import { Graph, Node, registerNodeType, FloatSocket } from "../scripts/graph";
import type { NodeDef } from "../scripts/graph";

class HeadlessSrc extends Node {
  static STRUCT = nstructjs.inlineRegister(this, `graph.HeadlessSrc {}`);

  static override graphDef(): NodeDef {
    return {
      typeName: "HeadlessSrc",
      outputs : { value: new FloatSocket("out") },
    };
  }
}
registerNodeType(HeadlessSrc);

class HeadlessSink extends Node {
  static STRUCT = nstructjs.inlineRegister(this, `graph.HeadlessSink {}`);

  static override graphDef(): NodeDef {
    return {
      typeName: "HeadlessSink",
      inputs  : { a: new FloatSocket("in") },
      outputs : { out: new FloatSocket("out") },
    };
  }
}
registerNodeType(HeadlessSink);

test("the graph module builds, sorts and serializes without a DOM", () => {
  // path-controller's polyfill aliases window to globalThis headlessly, so the
  // DOM-absence check is on document.
  expect(typeof document).toBe("undefined");

  const g = new Graph();
  const src = new HeadlessSrc();
  const sink = new HeadlessSink();
  g.add(src);
  g.add(sink);
  g.connect(src.outputs.value, sink.inputs.a);

  const { order, cycles } = g.sort();
  expect(cycles).toEqual([]);
  expect(order.map((n) => n.id)).toEqual([src.id, sink.id]);

  const loaded = readJSON(writeJSON(g), Graph);
  expect(loaded.nodes.length).toBe(2);
  expect(loaded.nodeIdMap.get(src.id)).toBeInstanceOf(HeadlessSrc);
  expect(loaded.sort().order.map((n) => n.id)).toEqual([src.id, sink.id]);
});
