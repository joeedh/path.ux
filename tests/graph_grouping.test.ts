import { test, expect } from "vitest";
import * as nstructjs from "../scripts/path-controller/util/nstructjs";
import { FloatProperty } from "../scripts/path-controller/toolsys/toolprop";
import { Node, registerNodeType } from "../scripts/graph/node";
import type { NodeDef } from "../scripts/graph/node";
import { Graph } from "../scripts/graph/graph";
import { FloatSocket, StringSocket } from "../scripts/graph/sockets_std";
import { GroupDef, GroupNode, GroupInputNode, GroupOutputNode } from "../scripts/graph/group";
import {
  addBoundary,
  cloneNode,
  createGroup,
  dissolveGroup,
  exposeEntry,
  groupPlan,
  isRefusal,
  redoGroup,
  regroup,
  removeBoundary,
  removeEntry,
  reorderEntry,
  repointEntry,
  restoreBoundary,
  ungroup,
} from "../scripts/graph/grouping";

class GrSrc extends Node {
  static STRUCT = nstructjs.inlineRegister(this, `graph.GrSrc {}`);

  static override graphDef(): NodeDef {
    return {
      typeName: "GrSrc",
      outputs : { value: new FloatSocket("out") },
    };
  }
}
registerNodeType(GrSrc);

class GrMath extends Node {
  static STRUCT = nstructjs.inlineRegister(this, `graph.GrMath {}`);

  static override graphDef(): NodeDef {
    return {
      typeName: "GrMath",
      inputs  : { a: new FloatSocket("in"), b: new FloatSocket("in") },
      outputs : { out: new FloatSocket("out") },
      props   : { bias: new FloatProperty(1) },
    };
  }
}
registerNodeType(GrMath);

class GrText extends Node {
  static STRUCT = nstructjs.inlineRegister(this, `graph.GrText {}`);

  static override graphDef(): NodeDef {
    return {
      typeName: "GrText",
      inputs  : { text: new StringSocket("in"), n: new FloatSocket("in") },
      outputs : { out: new StringSocket("out") },
    };
  }
}
registerNodeType(GrText);

// The spec's shape built flat: P -> A.a, A.out -> Q, Q -> B.a, B.out -> R, with A and B
// the nodes that get grouped.
function makeFlat() {
  const g = new Graph();
  const P = new GrSrc();
  const A = new GrMath();
  const B = new GrMath();
  const Q = new GrMath();
  const R = new GrMath();
  for (const n of [P, A, B, Q, R]) {
    g.add(n);
  }
  A.pos[0] = 100;
  A.pos[1] = 0;
  B.pos[0] = 100;
  B.pos[1] = 200;

  g.connect(P.outputs.value, A.inputs.a);
  g.connect(A.outputs.out, Q.inputs.a);
  g.connect(Q.outputs.out, B.inputs.a);
  g.connect(B.outputs.out, R.inputs.a);
  return { g, P, A, B, Q, R };
}

function typesInOrder(g: Graph): string[] {
  return g.sort().order.map((n) => n.def.typeName);
}

test("the cut derives one input per outside source and one output per feeding socket", () => {
  const { g, A, B, P, Q, R } = makeFlat();
  const plan = groupPlan(g, [A.id, B.id]);
  expect(isRefusal(plan)).toBe(false);
  if (isRefusal(plan)) return;

  expect(plan.nodes).toEqual([A, B]);
  expect(plan.inputs.map((i) => i.key)).toEqual(["a", "a_2"]);
  expect(plan.inputs[0].source).toBe(P.outputs.value);
  expect(plan.inputs[0].targets).toEqual([A.inputs.a]);
  expect(plan.inputs[1].source).toBe(Q.outputs.out);
  expect(plan.outputs.map((o) => o.key)).toEqual(["out", "out_2"]);
  expect(plan.outputs[0].targets).toEqual([Q.inputs.a]);
  expect(plan.outputs[1].targets).toEqual([R.inputs.a]);
});

test("one outside output feeding two selected inputs yields one input keyed by the first", () => {
  const g = new Graph();
  const P = new GrSrc();
  const T = new GrText();
  const M = new GrMath();
  for (const n of [P, T, M]) {
    g.add(n);
  }
  g.connect(P.outputs.value, T.inputs.n);
  g.connect(P.outputs.value, M.inputs.b);

  const plan = groupPlan(g, [T.id, M.id]);
  if (isRefusal(plan)) throw new Error(plan.refusal);
  expect(plan.inputs.length).toBe(1);
  expect(plan.inputs[0].key).toBe("n");
  expect(plan.inputs[0].targets).toEqual([T.inputs.n, M.inputs.b]);

  const { def, node } = createGroup(g, [T.id, M.id], "pair");
  expect(def.inputs.n).toBeInstanceOf(FloatSocket);
  expect(node.inputs.n.edges).toEqual([P.outputs.value]);
  const gin = def.inputNode();
  expect(gin.outputs.n.edges.length).toBe(2);
});

test("groupPlan refuses an empty selection, a proxy, an unknown id and an instance subgraph", () => {
  const { g, A } = makeFlat();
  expect(groupPlan(g, [])).toEqual({ refusal: "select at least one node to group" });
  expect(groupPlan(g, [A.id, "nowhere"])).toEqual({ refusal: "no node with id nowhere" });

  const { def, node } = createGroup(g, [A.id], "one");
  const gin = def.inputNode();
  const inner = def.subgraph.nodes.find((n) => n instanceof GrMath)!;
  expect(groupPlan(def.subgraph, [inner.id, gin.id])).toEqual({
    refusal: "the group's own input and output nodes stay where they are",
  });
  const instInner = node.subgraph.nodes.find((n) => n instanceof GrMath)!;
  const r = groupPlan(node.subgraph, [instInner.id]);
  expect(isRefusal(r) && r.refusal).toMatch(/definition/);
});

test("createGroup moves the nodes with their ids, keeps the flat order and starts clean", () => {
  const { g, A, B, P, Q, R } = makeFlat();
  A.props.bias.setValue(5);
  const before = typesInOrder(g);
  const created = createGroup(g, [A.id, B.id], "ab");
  const { def, node } = created;

  expect(g.nodes).toEqual([P, Q, R, node]);
  expect(created.crossing.length).toBe(4);
  expect(def.subgraph.nodeIdMap.get(A.id)).toBe(A);
  expect(def.subgraph.nodeIdMap.get(B.id)).toBe(B);
  expect(A.graph).toBe(def.subgraph);
  expect(node.ref).toBe("ab");
  expect(node.getUIName()).toBe("ab");
  expect(node.definition).toBe(def);
  expect(node.syncedHash).toBe(def.contentHash());

  // the definition holds the authored value; the instance carries no override
  expect(A.props.bias.getValue()).toBe(5);
  expect(A.props.bias.wasSet).toBe(true);
  const instA = node.subgraph.nodeIdMap.get(A.id)!;
  expect(instA.props.bias.getValue()).toBe(5);
  expect(instA.props.bias.wasSet).toBe(false);

  // the proxies bracket the moved nodes
  const gin = def.inputNode();
  const gout = def.outputNode();
  expect(gin.pos[0] + gin.size[0]).toBeLessThan(A.pos[0]);
  expect(gout.pos[0]).toBeGreaterThan(A.pos[0] + A.size[0]);

  expect(typesInOrder(g)).toEqual(before);
  expect(g.sort().cycles).toEqual([]);

  // the values flow through the boundary
  P.outputs.value.setValue(3);
  expect(instA.inputs.a.getValue()).toBe(3);
});

test("dissolveGroup returns the same objects and redoGroup reuses the definition", () => {
  const { g, A, B, P, Q, R } = makeFlat();
  const before = typesInOrder(g);
  const created = createGroup(g, [A.id, B.id], "ab");
  const { def, node } = created;

  const dissolved = dissolveGroup(g, created);
  expect(g.nodes).toEqual([P, Q, R, A, B]);
  expect(A.graph).toBe(g);
  expect(
    def.subgraph.nodes.every((n) => n instanceof GroupInputNode || n instanceof GroupOutputNode)
  ).toBe(true);
  expect(P.outputs.value.edges).toEqual([A.inputs.a]);
  expect(B.outputs.out.edges).toEqual([R.inputs.a]);
  expect(typesInOrder(g)).toEqual(before);

  redoGroup(g, created, dissolved);
  expect(g.nodes).toEqual([P, Q, R, node]);
  expect(def.subgraph.nodeIdMap.get(A.id)).toBe(A);
  expect(node.definition).toBe(def);
  expect(def.inputNode().outputs.a.edges).toEqual([A.inputs.a]);
  expect(node.inputs.a.edges).toEqual([P.outputs.value]);
  expect(node.outputs.out_2.edges).toEqual([R.inputs.a]);
  expect(typesInOrder(g)).toEqual(before);
});

test("ungroup inlines the instance's values, reallocates ids and leaves the instance whole", () => {
  const { g, A, B, P, Q, R } = makeFlat();
  const before = typesInOrder(g);
  const { node } = createGroup(g, [A.id, B.id], "ab");

  // an override on the instance, and a colliding numeric id in the parent
  const instA = node.subgraph.nodeIdMap.get(A.id)!;
  instA.props.bias.setValue(42);
  const extra = new GrSrc();
  extra.id = A.id;
  g.add(extra);
  expect(g.nodeIdMap.get(A.id)).toBe(extra);

  const result = ungroup(g, node);
  if (isRefusal(result)) throw new Error(result.refusal);
  const { nodes, idMap } = result;

  expect(g.nodes.includes(node)).toBe(false);
  expect(nodes.length).toBe(2);
  expect(nodes.every((n) => n.graph === g)).toBe(true);
  expect(idMap.get(A.id)).not.toBe(A.id);
  const newA = g.nodeIdMap.get(idMap.get(A.id)!)!;
  expect(newA.props.bias.getValue()).toBe(42);
  expect(newA).not.toBe(A);
  expect(newA).not.toBe(instA);

  expect(P.outputs.value.edges).toEqual([newA.inputs.a]);
  expect(newA.outputs.out.edges).toEqual([Q.inputs.a]);
  const newB = g.nodeIdMap.get(idMap.get(B.id)!)!;
  expect(newB.outputs.out.edges).toEqual([R.inputs.a]);
  expect(typesInOrder(g).filter((t) => t !== "GrSrc")).toEqual(before.filter((t) => t !== "GrSrc"));

  // the instance object is intact for undo
  expect(node.subgraph.nodeIdMap.get(A.id)).toBe(instA);
  regroup(g, node, result);
  expect(g.nodes.includes(node)).toBe(true);
  expect(g.nodes.includes(newA)).toBe(false);
  expect(node.inputs.a.edges).toEqual([P.outputs.value]);
  expect(node.outputs.out_2.edges).toEqual([R.inputs.a]);
});

test("ungroup keeps a free string id, suffixes a taken one, and honours fixed ids", () => {
  const g = new Graph();
  const src = new GrSrc();
  const m = new GrMath();
  m.id = "math";
  g.add(src);
  g.add(m);
  g.connect(src.outputs.value, m.inputs.a);
  const { node } = createGroup(g, [m.id], "one");

  const first = ungroup(g, node);
  if (isRefusal(first)) throw new Error(first.refusal);
  expect(first.idMap.get("math")).toBe("math");
  regroup(g, node, first);

  const taken = new GrMath();
  taken.id = "math";
  g.add(taken);
  const second = ungroup(g, node);
  if (isRefusal(second)) throw new Error(second.refusal);
  expect(second.idMap.get("math")).toBe("math_2");
  regroup(g, node, second);

  const third = ungroup(g, node, new Map([["math", "chosen"]]));
  if (isRefusal(third)) throw new Error(third.refusal);
  expect(third.idMap.get("math")).toBe("chosen");
});

test("ungroup copies an unconnected boundary default onto the inner input", () => {
  const g = new Graph();
  const m = new GrMath();
  g.add(m);
  const P = new GrSrc();
  g.add(P);
  g.connect(P.outputs.value, m.inputs.a);
  const { node } = createGroup(g, [m.id], "one");
  g.disconnect(P.outputs.value, node.inputs.a);
  node.inputs.a.defaultProp.setValue(9);

  const result = ungroup(g, node);
  if (isRefusal(result)) throw new Error(result.refusal);
  const inlined = g.nodeIdMap.get(result.idMap.get(m.id)!)!;
  expect(inlined.inputs.a.getValue()).toBe(9);
});

test("group then ungroup round-trips the topology", () => {
  const { g, A, B } = makeFlat();
  const before = typesInOrder(g);
  const { node } = createGroup(g, [A.id, B.id], "ab");
  const r = ungroup(g, node);
  if (isRefusal(r)) throw new Error(r.refusal);
  expect(typesInOrder(g)).toEqual(before);
  expect(g.sort().cycles).toEqual([]);
});

test("ungroup refuses on an instance subgraph and on a node from another graph", () => {
  const { g, A } = makeFlat();
  const { node } = createGroup(g, [A.id], "one");
  const other = new Graph();
  expect(isRefusal(ungroup(other, node))).toBe(true);
  expect(isRefusal(ungroup(node.subgraph, node))).toBe(true);
});

test("cloneNode carries a group's ref, subgraph, override and definition", () => {
  const { g, A } = makeFlat();
  const { node, def } = createGroup(g, [A.id], "one");
  node.subgraph.nodeIdMap.get(A.id)!.props.bias.setValue(7);
  node.label = "mine";

  const copy = cloneNode(node);
  expect(copy).toBeInstanceOf(GroupNode);
  expect(copy.id).toBe(-1);
  expect(copy.graph).toBeUndefined();
  expect(copy.ref).toBe("one");
  expect(copy.label).toBe("mine");
  expect(copy.definition).toBe(def);
  expect(copy.subgraph.nodeIdMap.get(A.id)!.props.bias.getValue()).toBe(7);
  expect(copy.subgraph.nodeIdMap.get(A.id)!.props.bias.wasSet).toBe(true);
  expect(copy.inputs.a.edges).toEqual([]);
  g.add(copy);
  expect(copy.id).not.toBe(node.id);
});

test("the exposure functions mutate and refuse as named", () => {
  const def = new GroupDef();
  const m = new GrMath();
  const t = new GrText();
  def.subgraph.add(m);
  def.subgraph.add(t);

  const e1 = exposeEntry(def, { kind: "prop", nodeId: m.id, propKey: "bias", label: "Bias" });
  expect(isRefusal(e1)).toBe(false);
  expect(def.exposed.length).toBe(1);
  expect(def.exposed[0].label).toBe("Bias");

  expect(exposeEntry(def, { kind: "prop", nodeId: m.id, propKey: "bias" })).toEqual({
    refusal: "that is already exposed",
  });
  expect(exposeEntry(def, { kind: "prop", nodeId: m.id, propKey: "nope" })).toEqual({
    refusal: "GrMath has no property 'nope'",
  });
  expect(exposeEntry(def, { kind: "prop", nodeId: 99, propKey: "bias" })).toEqual({
    refusal: "no node with id 99 in the definition",
  });

  // an input default is a property too, and a whole node needs no key
  expect(isRefusal(exposeEntry(def, { kind: "prop", nodeId: m.id, propKey: "in:a" }))).toBe(false);
  expect(isRefusal(exposeEntry(def, { kind: "nodeUI", nodeId: t.id }, 0))).toBe(false);
  expect(def.exposed.map((e) => e.kind)).toEqual(["nodeUI", "prop", "prop"]);

  expect(reorderEntry(def, 0, 2)).toBeUndefined();
  expect(def.exposed.map((e) => e.kind)).toEqual(["prop", "prop", "nodeUI"]);
  expect(reorderEntry(def, 5, 0)).toEqual({ refusal: "no row 5 to move" });

  const rp = repointEntry(def, 0, m.id, "in:b");
  expect(isRefusal(rp)).toBe(false);
  expect(def.exposed[0].propKey).toBe("in:b");
  expect(isRefusal(repointEntry(def, 0, t.id, "bias"))).toBe(true);

  const rm = removeEntry(def, 2);
  expect(isRefusal(rm)).toBe(false);
  expect(def.exposed.length).toBe(2);
  expect(removeEntry(def, 2)).toEqual({ refusal: "no row 2 to remove" });
});

test("the boundary functions declare, refuse and restore", () => {
  const def = new GroupDef();
  const m = new GrMath();
  def.subgraph.add(m);

  expect(addBoundary(def, "in", "", "FloatSocket")).toEqual({
    refusal: "a boundary socket needs a name",
  });
  expect(addBoundary(def, "in", "x", "NoSuchSocket")).toEqual({
    refusal: "unknown socket type 'NoSuchSocket'",
  });

  const added = addBoundary(def, "in", "x", "FloatSocket");
  if (isRefusal(added)) throw new Error(added.refusal);
  expect(def.inputs.x).toBeInstanceOf(FloatSocket);
  expect(added.socket.owningNode).toBe(def.inputNode());
  expect(addBoundary(def, "in", "x", "FloatSocket")).toEqual({
    refusal: "the group already has an input named 'x'",
  });

  const out = addBoundary(def, "out", "y", "StringSocket");
  if (isRefusal(out)) throw new Error(out.refusal);
  expect(def.outputs.y).toBeInstanceOf(StringSocket);
  expect(out.socket.dir).toBe("in");

  def.subgraph.connect(added.socket, m.inputs.a);
  const removed = removeBoundary(def, "in", "x");
  if (isRefusal(removed)) throw new Error(removed.refusal);
  expect(def.inputs.x).toBeUndefined();
  expect(m.inputs.a.edges).toEqual([]);
  expect(removed.links.length).toBe(1);
  expect(removeBoundary(def, "in", "x")).toEqual({
    refusal: "the group has no input named 'x'",
  });

  restoreBoundary(def, "in", "x", removed);
  expect(def.inputs.x).toBe(removed.template);
  expect(def.inputNode().outputs.x.edges).toEqual([m.inputs.a]);
});

test("a grouped graph round-trips through JSON with its instance and definition apart", () => {
  const { g, A, B } = makeFlat();
  const { def, node } = createGroup(g, [A.id, B.id], "ab");
  const loaded = nstructjs.readJSON(nstructjs.writeJSON(g), Graph);
  const inst = loaded.nodes.find((n): n is GroupNode => n instanceof GroupNode)!;
  expect(inst.ref).toBe("ab");
  expect(inst.syncedHash).toBe(node.syncedHash);
  expect(inst.definition).toBeUndefined();

  const ldef = nstructjs.readJSON(nstructjs.writeJSON(def), GroupDef);
  expect(ldef.contentHash()).toBe(def.contentHash());
  expect(Object.keys(ldef.inputs)).toEqual(["a", "a_2"]);
  expect(ldef.subgraph.nodes.some((n) => n instanceof GroupOutputNode)).toBe(true);
});
