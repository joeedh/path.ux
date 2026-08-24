import { test, expect } from "vitest";
import * as nstructjs from "../scripts/path-controller/util/nstructjs";
import { readJSON, writeJSON } from "../scripts/path-controller/util/nstructjs";
import { FloatProperty } from "../scripts/path-controller/toolsys/toolprop";
import { Node, registerNodeType } from "../scripts/graph/node";
import type { NodeDef } from "../scripts/graph/node";
import { Graph } from "../scripts/graph/graph";
import { FloatSocket } from "../scripts/graph/sockets_std";
import { GroupDef, GroupNode, GroupInputNode, GroupOutputNode } from "../scripts/graph/group";
import type { GroupDiff } from "../scripts/graph/group";

class GSrc extends Node {
  static STRUCT = nstructjs.inlineRegister(this, `graph.GSrc {}`);

  static override graphDef(): NodeDef {
    return {
      typeName: "GSrc",
      outputs : { value: new FloatSocket("out") },
    };
  }
}
registerNodeType(GSrc);

class GMath extends Node {
  static STRUCT = nstructjs.inlineRegister(this, `graph.GMath {}`);

  static override graphDef(): NodeDef {
    return {
      typeName: "GMath",
      inputs  : { a: new FloatSocket("in"), b: new FloatSocket("in") },
      outputs : { out: new FloatSocket("out") },
      props   : { bias: new FloatProperty(1) },
    };
  }
}
registerNodeType(GMath);

// The spec's group: two independent paths through it, a -> A -> x and b -> B -> y.
function makeDef(): { def: GroupDef; innerA: GMath; innerB: GMath } {
  const def = new GroupDef();
  const innerA = new GMath();
  const innerB = new GMath();
  def.subgraph.add(innerA);
  def.subgraph.add(innerB);

  const inA = def.declareInput("a", new FloatSocket("in"));
  const inB = def.declareInput("b", new FloatSocket("in"));
  const outX = def.declareOutput("x", new FloatSocket("in"));
  const outY = def.declareOutput("y", new FloatSocket("in"));

  def.subgraph.connect(inA, innerA.inputs.a);
  def.subgraph.connect(inB, innerB.inputs.a);
  def.subgraph.connect(innerA.outputs.out, outX);
  def.subgraph.connect(innerB.outputs.out, outY);

  return { def, innerA, innerB };
}

// The spec's parent arrangement: P -> G.a, G.x -> Q, Q -> G.b, G.y -> R. Acyclic once
// the group flattens, even though the group node itself is entered twice.
async function makeSynced() {
  const { def, innerA, innerB } = makeDef();

  const g = new Graph();
  const P = new GSrc();
  const Q = new GMath();
  const R = new GMath();
  const grp = new GroupNode();
  grp.ref = "grp";
  for (const n of [P, Q, R, grp]) {
    g.add(n);
  }

  g.groupLoader = async (ref) => (ref === "grp" ? def : undefined);
  const report = await g.resolveGroups();

  g.connect(P.outputs.value, grp.inputs.a);
  g.connect(grp.outputs.x, Q.inputs.a);
  g.connect(Q.outputs.out, grp.inputs.b);
  g.connect(grp.outputs.y, R.inputs.a);

  return { def, innerA, innerB, g, P, Q, R, grp, report };
}

test("the spec's group arrangement sorts flat with no cycle and no proxies", async () => {
  const { g, P, Q, R, grp, innerA, innerB, report } = await makeSynced();

  expect(report.failed).toEqual([]);
  expect(report.synced).toContain(grp);

  const { order, cycles } = g.sort();
  expect(cycles).toEqual([]);

  const iA = grp.subgraph.nodeIdMap.get(innerA.id)!;
  const iB = grp.subgraph.nodeIdMap.get(innerB.id)!;

  expect(order.length).toBe(5);
  expect(order.indexOf(P)).toBeLessThan(order.indexOf(iA));
  expect(order.indexOf(iA)).toBeLessThan(order.indexOf(Q));
  expect(order.indexOf(Q)).toBeLessThan(order.indexOf(iB));
  expect(order.indexOf(iB)).toBeLessThan(order.indexOf(R));

  for (const n of order) {
    expect(
      n instanceof GroupNode || n instanceof GroupInputNode || n instanceof GroupOutputNode
    ).toBe(false);
  }
});

test("dirtying an output feeding the group dirties the consumer inside the instance", async () => {
  const { g, P, Q, grp, innerA } = await makeSynced();
  const iA = grp.subgraph.nodeIdMap.get(innerA.id)!;

  for (const n of [...g.nodes, ...grp.subgraph.nodes]) {
    n.clearDirty();
  }

  P.outputs.value.setValue(5);
  expect(iA.dirty).toBe(true);
  expect(grp.subgraph.dirtyNodes.has(iA)).toBe(true);
  expect(iA.inputs.a.getValue()).toBe(5);

  // and the reverse direction: an inner producer reaches the outer consumer
  iA.outputs.out.setValue(7);
  expect(Q.dirty).toBe(true);
  expect(Q.inputs.a.getValue()).toBe(7);
});

test("reconciliation updates un-overridden values, preserves overrides, and reports the diff", async () => {
  const { def, innerA, innerB } = makeDef();

  const g = new Graph();
  const grp1 = new GroupNode();
  grp1.ref = "grp";
  const grp2 = new GroupNode();
  grp2.ref = "grp";
  g.add(grp1);
  g.add(grp2);
  g.groupLoader = async () => def;
  await g.resolveGroups();

  grp1.subgraph.nodeIdMap.get(innerA.id)!.props.bias.setValue(42);

  // Bump the definition: a new value, a new boundary input, one inner node removed.
  innerA.props.bias.setValue(2);
  def.declareInput("c", new FloatSocket("in"));
  def.subgraph.remove(innerB);

  const diffs: GroupDiff[] = [];
  const base = grp1.onDefChanged.bind(grp1);
  grp1.onDefChanged = (d) => {
    diffs.push(d);
    base(d);
  };

  const report = await g.resolveGroups();
  expect(report.failed).toEqual([]);
  expect(report.synced).toContain(grp1);
  expect(report.synced).toContain(grp2);

  expect(grp1.subgraph.nodeIdMap.get(innerA.id)!.props.bias.getValue()).toBe(42);
  expect(grp1.subgraph.nodeIdMap.get(innerA.id)!.props.bias.wasSet).toBe(true);
  expect(grp2.subgraph.nodeIdMap.get(innerA.id)!.props.bias.getValue()).toBe(2);
  expect(grp2.subgraph.nodeIdMap.get(innerA.id)!.props.bias.wasSet).toBe(false);

  expect(diffs.length).toBe(1);
  expect(diffs[0].addedSockets.map((s) => s.name)).toEqual(["c"]);
  expect(diffs[0].removedSockets).toEqual([]);
  expect(diffs[0].removedInnerNodes.map((n) => n.id)).toEqual([innerB.id]);

  expect("c" in grp1.inputs).toBe(true);
  expect(grp1.inputs.c.owningNode).toBe(grp1);
  expect(grp1.subgraph.nodeIdMap.has(innerB.id)).toBe(false);
});

test("a removed-but-connected boundary socket survives as a flagged orphan", async () => {
  const { def, g, Q, R, grp } = await makeSynced();

  def.removeInput("b");
  await g.resolveGroups();

  const b = grp.inputs.b;
  expect(b).toBeDefined();
  expect(b.orphaned).toBe(true);
  // the parent link is kept for the editor to show as an error
  expect(b.edges.length).toBe(1);
  // but the orphan is dead as a signal path
  expect(Q.outputs.out.resolvedEdges()).toEqual([]);

  // an unconnected removed socket is deleted outright
  g.disconnect(grp.outputs.y, R.inputs.a);
  def.removeOutput("y");
  await g.resolveGroups();
  expect(grp.outputs.y).toBeUndefined();
});

test("resolveGroups degrades on a missing ref and the graph still sorts", async () => {
  const g = new Graph();
  const src = new GSrc();
  const grp = new GroupNode();
  grp.ref = "nowhere";
  g.add(src);
  g.add(grp);
  g.groupLoader = async () => undefined;

  const report = await g.resolveGroups();
  expect(report.failed.length).toBe(1);
  expect(report.failed[0].ref).toBe("nowhere");
  expect(report.synced).toEqual([]);
  expect(grp.syncedHash).toBe("");

  const { order, cycles } = g.sort();
  expect(cycles).toEqual([]);
  expect(order).toEqual([src]);
});

test("a later run that fails to load keeps the definition from an earlier run", async () => {
  const { def, g, grp } = await makeSynced();
  const hash = grp.syncedHash;
  expect(hash).not.toBe("");

  g.groupLoader = async () => {
    throw new Error("backend down");
  };
  const report = await g.resolveGroups();

  expect(report.failed.length).toBe(1);
  expect(report.failed[0].reason).toMatch(/keeping/);
  expect(report.synced).toContain(grp);
  expect(grp.syncedHash).toBe(hash);
  expect(grp.definition).toBe(def);
});

test("resolveGroups refuses a self-instantiating group, directly and through an intermediate", async () => {
  // direct: A contains an instance of A
  const defA = new GroupDef();
  const inner = new GroupNode();
  inner.ref = "a";
  defA.subgraph.add(inner);

  const g = new Graph();
  const grp = new GroupNode();
  grp.ref = "a";
  g.add(grp);
  g.groupLoader = async (ref) => (ref === "a" ? defA : undefined);

  const report = await g.resolveGroups();
  expect(report.failed.map((f) => f.reason)).toEqual([
    "a group cannot contain itself, directly or through another group",
  ]);
  // the outer instance still syncs; the inner one is left unsynced
  expect(grp.syncedHash).not.toBe("");
  const innerCopy = grp.subgraph.nodes.find((n): n is GroupNode => n instanceof GroupNode)!;
  expect(innerCopy.syncedHash).toBe("");

  // through an intermediate: X contains Y, Y contains X; terminating at all is half
  // the assertion here
  const defX = new GroupDef();
  const defY = new GroupDef();
  const xInY = new GroupNode();
  xInY.ref = "x";
  defY.subgraph.add(xInY);
  const yInX = new GroupNode();
  yInX.ref = "y";
  defX.subgraph.add(yInX);

  const g2 = new Graph();
  const gx = new GroupNode();
  gx.ref = "x";
  g2.add(gx);
  g2.groupLoader = async (ref) => (ref === "x" ? defX : ref === "y" ? defY : undefined);

  const report2 = await g2.resolveGroups();
  expect(report2.failed.some((f) => /cannot contain itself/.test(f.reason))).toBe(true);
});

test("the self-containing arrangement is refused at link time with the same sentence", () => {
  const defA = new GroupDef();
  const gn = new GroupNode();
  defA.subgraph.add(gn);
  expect(() => gn.setDefinition("a", defA)).toThrow(/cannot contain itself/);

  // through an intermediate: defB holds an instance bound to defA
  const defB = new GroupDef();
  const aInB = new GroupNode();
  defB.subgraph.add(aInB);
  aInB.setDefinition("a", defA);

  const bInA = new GroupNode();
  defA.subgraph.add(bInA);
  expect(() => bInA.setDefinition("b", defB)).toThrow(/cannot contain itself/);
});

test("structuralEditsRefused answers on an instance subgraph, not the definition's", async () => {
  const { def, g, grp } = await makeSynced();

  expect(g.structuralEditsRefused()).toBeUndefined();
  expect(def.subgraph.structuralEditsRefused()).toBeUndefined();
  expect(grp.subgraph.structuralEditsRefused()).toMatch(/definition/);
});

test("a group instance round-trips unsynced and reconciles identically after load", async () => {
  const { def, innerA, g, P, Q, grp } = await makeSynced();
  grp.subgraph.nodeIdMap.get(innerA.id)!.props.bias.setValue(42);

  const loaded = readJSON(writeJSON(g), Graph);
  const lg = loaded.nodes.find((n): n is GroupNode => n instanceof GroupNode)!;
  const lp = loaded.nodeIdMap.get(P.id)!;
  const lq = loaded.nodeIdMap.get(Q.id)!;

  // functional before any resolve: the saved subgraph and proxies carry the instance
  expect(lg.syncedHash).toBe(grp.syncedHash);
  const liA = lg.subgraph.nodeIdMap.get(innerA.id)!;
  expect(liA.props.bias.getValue()).toBe(42);
  expect(liA.props.bias.wasSet).toBe(true);

  lp.outputs.value.setValue(9);
  expect(liA.inputs.a.getValue()).toBe(9);
  liA.outputs.out.setValue(11);
  expect(lq.inputs.a.getValue()).toBe(11);

  const { order, cycles } = loaded.sort();
  expect(cycles).toEqual([]);
  expect(order.length).toBe(5);

  // resolving against the unchanged definition is a no-op: same hash, same objects
  loaded.groupLoader = async () => def;
  const report = await loaded.resolveGroups();
  expect(report.failed).toEqual([]);
  expect(lg.subgraph.nodeIdMap.get(innerA.id)).toBe(liA);
  expect(liA.props.bias.getValue()).toBe(42);
});
