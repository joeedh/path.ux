import { test, expect, vi } from "vitest";
import * as nstructjs from "../scripts/path-controller/util/nstructjs";
import { readJSON, writeJSON } from "../scripts/path-controller/util/nstructjs";
import { Node, registerNodeType } from "../scripts/graph/node";
import type { NodeDef } from "../scripts/graph/node";
import { Graph } from "../scripts/graph/graph";
import { FloatSocket } from "../scripts/graph/sockets_std";

// Test types register their own STRUCTs so the graph's abstract node array
// reconstructs the subclass rather than a bare Node.
class SrcNode extends Node {
  static STRUCT = nstructjs.inlineRegister(this, `graph.SrcNode {}`);

  static override graphDef(): NodeDef {
    return {
      typeName: "SrcNode",
      outputs : { value: new FloatSocket("out") },
    };
  }
}
registerNodeType(SrcNode);

class PipeNode extends Node {
  static STRUCT = nstructjs.inlineRegister(this, `graph.PipeNode {}`);

  static override graphDef(): NodeDef {
    return {
      typeName: "PipeNode",
      inputs  : { a: new FloatSocket("in"), b: new FloatSocket("in") },
      outputs : { out: new FloatSocket("out") },
    };
  }
}
registerNodeType(PipeNode);

function chain(g: Graph, ...nodes: Node[]): void {
  for (let i = 0; i + 1 < nodes.length; i++) {
    g.connect(nodes[i].outputs.out ?? nodes[i].outputs.value, nodes[i + 1].inputs.a);
  }
}

function addAll(g: Graph, ...nodes: Node[]): void {
  for (const n of nodes) {
    g.add(n);
  }
}

test("sort orders a chain and reports no cycles", () => {
  const g = new Graph();
  const [a, b, c] = [new SrcNode(), new PipeNode(), new PipeNode()];
  addAll(g, a, b, c);
  chain(g, a, b, c);

  const { order, cycles } = g.sort();

  expect(cycles).toEqual([]);
  expect(order.indexOf(a)).toBeLessThan(order.indexOf(b));
  expect(order.indexOf(b)).toBeLessThan(order.indexOf(c));

  // connect dirtied the inputs it touched, which flagged their nodes.
  expect(g.dirtyNodes.has(b)).toBe(true);
  expect(g.dirtyNodes.has(c)).toBe(true);
});

test("sort orders a diamond", () => {
  const g = new Graph();
  const [a, b, c, d] = [new SrcNode(), new PipeNode(), new PipeNode(), new PipeNode()];
  addAll(g, a, b, c, d);

  g.connect(a.outputs.value, b.inputs.a);
  g.connect(a.outputs.value, c.inputs.a);
  g.connect(b.outputs.out, d.inputs.a);
  g.connect(c.outputs.out, d.inputs.b);

  const { order, cycles } = g.sort();

  expect(cycles).toEqual([]);
  expect(order.length).toBe(4);
  expect(order[0]).toBe(a);
  expect(order[3]).toBe(d);
});

test("two disjoint islands both appear in the order", () => {
  const g = new Graph();
  const [a1, a2] = [new SrcNode(), new PipeNode()];
  const [b1, b2] = [new SrcNode(), new PipeNode()];
  addAll(g, a1, a2, b1, b2);
  chain(g, a1, a2);
  chain(g, b1, b2);

  const { order, cycles } = g.sort();

  expect(cycles).toEqual([]);
  expect(order.length).toBe(4);
  expect(order.indexOf(a1)).toBeLessThan(order.indexOf(a2));
  expect(order.indexOf(b1)).toBeLessThan(order.indexOf(b2));
});

test("cycles come back as components while the acyclic remainder is ordered", () => {
  const g = new Graph();

  const [x, y] = [new PipeNode(), new PipeNode()];
  const [p, q, r] = [new PipeNode(), new PipeNode(), new PipeNode()];
  const [s, t] = [new SrcNode(), new PipeNode()];
  addAll(g, x, y, p, q, r, s, t);

  g.connect(x.outputs.out, y.inputs.a);
  g.connect(y.outputs.out, x.inputs.a);

  g.connect(p.outputs.out, q.inputs.a);
  g.connect(q.outputs.out, r.inputs.a);
  g.connect(r.outputs.out, p.inputs.a);

  chain(g, s, t);

  const { order, cycles } = g.sort();

  expect(cycles.length).toBe(2);
  const sizes = cycles.map((c) => c.length).sort();
  expect(sizes).toEqual([2, 3]);
  expect(new Set(cycles.find((c) => c.length === 2))).toEqual(new Set([x, y]));
  expect(new Set(cycles.find((c) => c.length === 3))).toEqual(new Set([p, q, r]));

  expect(order.length).toBe(2);
  expect(order.indexOf(s)).toBeLessThan(order.indexOf(t));
});

test("the cached order is reused until a structural change invalidates it", () => {
  const g = new Graph();
  const [a, b, c] = [new SrcNode(), new PipeNode(), new PipeNode()];
  addAll(g, a, b);
  chain(g, a, b);

  const first = g.sort();
  expect(g.sort()).toBe(first);

  g.add(c);
  const afterAdd = g.sort();
  expect(afterAdd).not.toBe(first);
  expect(g.sort()).toBe(afterAdd);

  g.connect(b.outputs.out, c.inputs.a);
  const afterConnect = g.sort();
  expect(afterConnect).not.toBe(afterAdd);

  g.remove(c);
  const afterRemove = g.sort();
  expect(afterRemove).not.toBe(afterConnect);

  g.flagSortDirty();
  expect(g.sort()).not.toBe(afterRemove);
});

test("connect refuses cross-graph edges and same-direction pairs", () => {
  const g1 = new Graph();
  const g2 = new Graph();
  const a = new SrcNode();
  const b = new PipeNode();
  g1.add(a);
  g2.add(b);

  expect(() => g1.connect(a.outputs.value, b.inputs.a)).toThrow(/different graphs/);
  expect(() => g2.connect(a.outputs.value, b.inputs.a)).toThrow(/different graphs/);

  const c = new PipeNode();
  g1.add(c);
  expect(() => g1.connect(a.outputs.value, c.outputs.out)).toThrow(/output socket and one input/);
});

test("a single-link input replaces its edge; a multi input accumulates", () => {
  const g = new Graph();
  const [s1, s2, p] = [new SrcNode(), new SrcNode(), new PipeNode()];
  addAll(g, s1, s2, p);

  g.connect(s1.outputs.value, p.inputs.a);
  g.connect(s2.outputs.value, p.inputs.a);

  expect(p.inputs.a.edges.length).toBe(1);
  expect(p.inputs.a.edges[0]).toBe(s2.outputs.value);
  expect(s1.outputs.value.edges.length).toBe(0);

  p.inputs.b.multiSocket = true;
  g.connect(s1.outputs.value, p.inputs.b);
  g.connect(s2.outputs.value, p.inputs.b);
  expect(p.inputs.b.edges.length).toBe(2);
});

test("a graph JSON round-trips its ids, edges and sort order", () => {
  const g = new Graph();
  const [a, b, c, d] = [new SrcNode(), new PipeNode(), new PipeNode(), new PipeNode()];
  addAll(g, a, b, c, d);

  g.connect(a.outputs.value, b.inputs.a);
  g.connect(a.outputs.value, c.inputs.a);
  g.connect(b.outputs.out, d.inputs.a);
  g.connect(c.outputs.out, d.inputs.b);

  const orderIds = g.sort().order.map((n) => n.id);

  const loaded = readJSON(writeJSON(g), Graph);

  expect(loaded.nodes.length).toBe(4);
  for (const n of loaded.nodes) {
    expect(loaded.nodeIdMap.get(n.id)).toBe(n);
    expect(n.graph).toBe(loaded);
  }

  const [la, lb, ld] = [a, b, d].map((n) => loaded.nodeIdMap.get(n.id)!);
  expect(la).toBeInstanceOf(SrcNode);
  expect(lb).toBeInstanceOf(PipeNode);

  expect(lb.inputs.a.edges).toEqual([la.outputs.value]);
  expect(ld.inputs.a.edges.length).toBe(1);
  expect(ld.inputs.b.edges.length).toBe(1);
  expect(la.outputs.value.edges.length).toBe(2);

  // A value set after load flows across the reloaded edges. Output values themselves
  // are derived state and are deliberately not serialized.
  la.outputs.value.setValue(3);
  expect(lb.inputs.a.getValue()).toBe(3);

  expect(loaded.sort().order.map((n) => n.id)).toEqual(orderIds);
  expect(loaded.sort().cycles).toEqual([]);

  // The id counter survives, so a new node cannot collide with a loaded id.
  const fresh = new SrcNode();
  loaded.add(fresh);
  expect(loaded.nodes.filter((n) => n.id === fresh.id).length).toBe(1);
  expect(fresh.id).not.toBe(la.id);
});

test("a link naming a deleted node is dropped with a warning", () => {
  const g = new Graph();
  const [a, b] = [new SrcNode(), new PipeNode()];
  addAll(g, a, b);
  g.connect(a.outputs.value, b.inputs.a);

  const json = writeJSON(g) as { links: { dstNode: string }[] };
  expect(json.links.length).toBe(1);
  json.links[0].dstNode = "999";

  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const loaded = readJSON(json, Graph);

  expect(warn).toHaveBeenCalledWith(expect.stringContaining("missing endpoint"));
  warn.mockRestore();
  expect(loaded.nodes.length).toBe(2);
  for (const n of loaded.nodes) {
    for (const key in n.inputs) {
      expect(n.inputs[key].edges).toEqual([]);
    }
    for (const key in n.outputs) {
      expect(n.outputs[key].edges).toEqual([]);
    }
  }
});
