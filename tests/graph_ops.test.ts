import { test, expect, beforeAll, vi } from "vitest";
import { DataAPI, DataStruct } from "../scripts/path-controller/controller/controller";
import { ToolStack } from "../scripts/path-controller/toolsys/toolsys";
import { FloatProperty } from "../scripts/path-controller/toolsys/toolprop";
import { Node, registerNodeType } from "../scripts/graph/node";
import type { NodeDef } from "../scripts/graph/node";
import { Graph } from "../scripts/graph/graph";
import { FloatSocket } from "../scripts/graph/sockets_std";
import { ExposedEntry, GroupDef, GroupNode } from "../scripts/graph/group";
import { defineGraphAPI } from "../scripts/graph/graph_api";
import {
  AddNodeOp,
  ConnectOp,
  DeleteNodeOp,
  DisconnectOp,
  MoveNodeOp,
  RenameNodeOp,
  ReplaceNodeOp,
  SetNodePropOp,
} from "../scripts/graph/graph_ops";

beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window ||= globalThis;
});

class OpsSrc extends Node {
  static override graphDef(): NodeDef {
    return {
      typeName: "OpsSrc",
      outputs : { value: new FloatSocket("out") },
    };
  }
}
registerNodeType(OpsSrc);

class OpsMath extends Node {
  static override graphDef(): NodeDef {
    return {
      typeName: "OpsMath",
      inputs  : { a: new FloatSocket("in"), b: new FloatSocket("in") },
      outputs : { out: new FloatSocket("out") },
      props   : { bias: new FloatProperty(1) },
    };
  }
}
registerNodeType(OpsMath);

// Shares OpsMath's 'a' and 'out' socket keys but lacks 'b' and the bias prop, so a
// replacement drops that link and that exposure row.
class OpsMath2 extends Node {
  static override graphDef(): NodeDef {
    return {
      typeName: "OpsMath2",
      inputs  : { a: new FloatSocket("in") },
      outputs : { out: new FloatSocket("out") },
    };
  }
}
registerNodeType(OpsMath2);

function makeCtx(graph: Graph) {
  const api = new DataAPI();
  const root = new DataStruct();
  root.struct("graph", "graph", "Graph", defineGraphAPI(api));
  api.setRoot(root);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx: any = { state: {}, graph, api };
  ctx.toLocked = () => ctx;
  ctx.toolstack = new ToolStack(ctx);
  return ctx;
}

function id(n: Node): string {
  return JSON.stringify(n.id);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addNode(ctx: any, type: string, x = 0, y = 0): Node {
  const tool = new AddNodeOp();
  tool.inputs.graphPath.setValue("graph");
  tool.inputs.nodeType.setValue(type);
  tool.inputs.x.setValue(x);
  tool.inputs.y.setValue(y);
  ctx.toolstack.execTool(ctx, tool);
  return ctx.graph.nodeIdMap.get(JSON.parse(tool.outputs.nodeId.getValue()))!;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function connect(ctx: any, src: Node, srcKey: string, dst: Node, dstKey: string): void {
  const tool = new ConnectOp();
  tool.inputs.graphPath.setValue("graph");
  tool.inputs.srcNode.setValue(id(src));
  tool.inputs.srcSocket.setValue(srcKey);
  tool.inputs.dstNode.setValue(id(dst));
  tool.inputs.dstSocket.setValue(dstKey);
  ctx.toolstack.execTool(ctx, tool);
}

test("AddNodeOp adds through the stack; undo removes; redo restores the same id", () => {
  const ctx = makeCtx(new Graph());
  const node = addNode(ctx, "OpsMath", 10, 20);

  expect(ctx.graph.nodes.length).toBe(1);
  expect(node).toBeInstanceOf(OpsMath);
  expect(node.pos[0]).toBe(10);
  expect(node.pos[1]).toBe(20);

  ctx.toolstack.undo();
  expect(ctx.graph.nodes.length).toBe(0);

  ctx.toolstack.redo();
  expect(ctx.graph.nodes.length).toBe(1);
  expect(ctx.graph.nodeIdMap.get(node.id)).toBeInstanceOf(OpsMath);
});

test("DeleteNodeOp removes; undo restores the node with its links", () => {
  const ctx = makeCtx(new Graph());
  const src = addNode(ctx, "OpsSrc");
  const m = addNode(ctx, "OpsMath");
  connect(ctx, src, "value", m, "a");

  const tool = new DeleteNodeOp();
  tool.inputs.graphPath.setValue("graph");
  tool.inputs.nodeId.setValue(id(m));
  ctx.toolstack.execTool(ctx, tool);

  expect(ctx.graph.nodes.length).toBe(1);
  expect(src.outputs.value.edges).toEqual([]);

  ctx.toolstack.undo();
  expect(ctx.graph.nodeIdMap.get(m.id)).toBe(m);
  expect(m.inputs.a.edges).toEqual([src.outputs.value]);
});

test("ConnectOp links through the stack; undo restores a displaced link", () => {
  const ctx = makeCtx(new Graph());
  const s1 = addNode(ctx, "OpsSrc");
  const s2 = addNode(ctx, "OpsSrc");
  const m = addNode(ctx, "OpsMath");

  connect(ctx, s1, "value", m, "a");
  connect(ctx, s2, "value", m, "a");
  expect(m.inputs.a.edges).toEqual([s2.outputs.value]);

  ctx.toolstack.undo();
  expect(m.inputs.a.edges).toEqual([s1.outputs.value]);
});

test("DisconnectOp severs through the stack; undo reconnects", () => {
  const ctx = makeCtx(new Graph());
  const src = addNode(ctx, "OpsSrc");
  const m = addNode(ctx, "OpsMath");
  connect(ctx, src, "value", m, "a");

  const tool = new DisconnectOp();
  tool.inputs.graphPath.setValue("graph");
  tool.inputs.srcNode.setValue(id(src));
  tool.inputs.srcSocket.setValue("value");
  tool.inputs.dstNode.setValue(id(m));
  tool.inputs.dstSocket.setValue("a");
  ctx.toolstack.execTool(ctx, tool);
  expect(m.inputs.a.edges).toEqual([]);

  ctx.toolstack.undo();
  expect(m.inputs.a.edges).toEqual([src.outputs.value]);
});

test("MoveNodeOp and RenameNodeOp mutate and undo through the stack", () => {
  const ctx = makeCtx(new Graph());
  const m = addNode(ctx, "OpsMath", 1, 2);

  const move = new MoveNodeOp();
  move.inputs.graphPath.setValue("graph");
  move.inputs.nodeId.setValue(id(m));
  move.inputs.x.setValue(50);
  move.inputs.y.setValue(60);
  ctx.toolstack.execTool(ctx, move);
  expect([m.pos[0], m.pos[1]]).toEqual([50, 60]);

  ctx.toolstack.undo();
  expect([m.pos[0], m.pos[1]]).toEqual([1, 2]);

  const rename = new RenameNodeOp();
  rename.inputs.graphPath.setValue("graph");
  rename.inputs.nodeId.setValue(id(m));
  rename.inputs.label.setValue("Blend");
  ctx.toolstack.execTool(ctx, rename);
  expect(m.getUIName()).toBe("Blend");

  ctx.toolstack.undo();
  expect(m.label).toBeUndefined();
  expect(m.getUIName()).toBe("OpsMath");
});

test("SetNodePropOp sets through the stack; undo restores value and wasSet", () => {
  const ctx = makeCtx(new Graph());
  const m = addNode(ctx, "OpsMath");
  expect(m.props.bias.wasSet).toBe(false);

  const tool = SetNodePropOp.create(ctx, "graph", id(m), "bias", 5);
  ctx.toolstack.execTool(ctx, tool);
  expect(m.props.bias.getValue()).toBe(5);
  expect(m.props.bias.wasSet).toBe(true);

  ctx.toolstack.undo();
  expect(m.props.bias.getValue()).toBe(1);
  expect(m.props.bias.wasSet).toBe(false);

  ctx.toolstack.redo();
  expect(m.props.bias.getValue()).toBe(5);
});

const REFUSAL = "a group instance takes value edits only; structural edits belong to the group's definition";

async function makeGroup() {
  const def = new GroupDef();
  const inner = new OpsMath();
  def.subgraph.add(inner);

  const host = new Graph();
  const grp = new GroupNode();
  grp.ref = "grp";
  host.add(grp);
  host.groupLoader = async (ref) => (ref === "grp" ? def : undefined);
  await host.resolveGroups();

  return { def, inner, host, grp };
}

test("every structural op refuses on an instance subgraph; SetNodePropOp does not", async () => {
  const { inner, host, grp } = await makeGroup();
  const ctx = makeCtx(host);
  const sub = `graph.nodes[${grp.id}].group`;
  const copy = grp.subgraph.nodeIdMap.get(inner.id)!;

  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

  const structural = [
    new AddNodeOp(),
    new DeleteNodeOp(),
    new ConnectOp(),
    new DisconnectOp(),
    new MoveNodeOp(),
    new RenameNodeOp(),
    new ReplaceNodeOp(),
  ];
  for (const tool of structural) {
    tool.inputs.graphPath.setValue(sub);
    const cls = tool.constructor as typeof AddNodeOp;
    expect(cls.canRun(ctx, tool)).toBe(false);
  }
  expect(warn.mock.calls.map((c) => c[0])).toEqual(structural.map(() => REFUSAL));

  // A value edit runs on the instance, materializing the property...
  inner.props.bias.setValue(4);
  const tool = SetNodePropOp.create(ctx, sub, id(copy), "bias", 9);
  ctx.toolstack.execTool(ctx, tool);
  expect(copy.props.bias.wasSet).toBe(true);
  expect(copy.props.bias.getValue()).toBe(9);
  expect(inner.props.bias.getValue()).toBe(4);

  // ...and undoing the first edit dematerializes: reads follow the definition again.
  ctx.toolstack.undo();
  expect(copy.props.bias.wasSet).toBe(false);
  expect(ctx.api.getValue(ctx, `${sub}.nodes[${copy.id}].props['bias']`)).toBe(4);

  warn.mockRestore();
});

test("ReplaceNodeOp swaps in place, re-links compatible sockets, prunes exposure rows", () => {
  const def = new GroupDef();
  const src = new OpsSrc();
  const src2 = new OpsSrc();
  const m = new OpsMath();
  def.subgraph.add(src);
  def.subgraph.add(src2);
  def.subgraph.add(m);
  def.subgraph.connect(src.outputs.value, m.inputs.a);
  def.subgraph.connect(src2.outputs.value, m.inputs.b);

  const eBias = new ExposedEntry("prop", m.id, "bias");
  const eUI = new ExposedEntry("nodeUI", m.id);
  def.exposed.push(eBias, eUI);

  const ctx = makeCtx(def.subgraph);
  const tool = new ReplaceNodeOp();
  tool.inputs.graphPath.setValue("graph");
  tool.inputs.nodeId.setValue(id(m));
  tool.inputs.newType.setValue("OpsMath2");
  ctx.toolstack.execTool(ctx, tool);

  const nn = def.subgraph.nodeIdMap.get(m.id)!;
  expect(nn).toBeInstanceOf(OpsMath2);
  expect(nn).not.toBe(m);
  expect(nn.inputs.a.edges).toEqual([src.outputs.value]);
  // OpsMath2 has no 'b' input, so that link is dropped rather than misrouted.
  expect(src2.outputs.value.edges).toEqual([]);
  // The bias exposure row cannot be satisfied and goes; the nodeUI row stays.
  expect(def.exposed).toEqual([eUI]);

  ctx.toolstack.undo();
  expect(def.subgraph.nodeIdMap.get(m.id)).toBe(m);
  expect(m.inputs.a.edges).toEqual([src.outputs.value]);
  expect(m.inputs.b.edges).toEqual([src2.outputs.value]);
  expect(def.exposed).toEqual([eBias, eUI]);
});
