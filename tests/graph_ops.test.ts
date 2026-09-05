import { test, expect, beforeAll, vi } from "vitest";
import { DataAPI, DataStruct } from "../scripts/path-controller/controller/controller";
import { ToolStack } from "../scripts/path-controller/toolsys/toolstack";
import { FloatProperty } from "../scripts/path-controller/toolsys/toolprop";
import { Node, registerNodeType } from "../scripts/graph/node";
import type { NodeDef } from "../scripts/graph/node";
import { Graph } from "../scripts/graph/graph";
import { FloatSocket } from "../scripts/graph/sockets_std";
import { ExposedEntry, GroupDef, GroupNode } from "../scripts/graph/group";
import { defineGraphAPI } from "../scripts/graph/graph_api";
import {
  AddGroupSocketOp,
  AddNodeOp,
  ConnectOp,
  CreateGroupOp,
  DeleteNodeOp,
  DisconnectOp,
  DuplicateNodeOp,
  ExposeEntryOp,
  MoveNodeOp,
  RemoveEntryOp,
  RemoveGroupSocketOp,
  RenameNodeOp,
  ReorderEntryOp,
  RepointEntryOp,
  ReplaceNodeOp,
  SetNodePropOp,
  UngroupOp,
} from "../scripts/graph/graph_ops";
import { buildGraphFromDSL } from "../scripts/graph/dsl";
import { NodeClasses } from "../scripts/graph/node";
import { SocketClasses } from "../scripts/graph/socket";

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

  const ctx: any = { state: {}, graph, api };
  ctx.toLocked = () => ctx;
  ctx.toolstack = new ToolStack(ctx);

  // AddNodeOp selects the node it creates, so exercising it through the
  // stack directly (without a full NodeGraphView) needs a stub GraphContext.
  ctx.selection = new Set<unknown>();
  ctx.selectNodes = (ids: unknown[]) => ids.forEach((id) => ctx.selection.add(id));
  ctx.deselectNodes = (ids: unknown[]) => ids.forEach((id) => ctx.selection.delete(id));
  ctx.selectSockets = () => {};
  ctx.deselectSockets = () => {};
  ctx.clearSelection = () => ctx.selection.clear();
  ctx.selectAll = () => {};

  return ctx;
}

function id(n: Node): string {
  return JSON.stringify(n.id);
}

async function addNode(ctx: any, type: string, x = 0, y = 0): Promise<Node> {
  const tool = new AddNodeOp();
  tool.inputs.graphPath.setValue("graph");
  tool.inputs.nodeType.setValue(type);
  tool.inputs.x.setValue(x);
  tool.inputs.y.setValue(y);
  await ctx.toolstack.execTool(ctx, tool);
  return ctx.graph.nodeIdMap.get(JSON.parse(tool.outputs.nodeId.getValue()))!;
}

async function connect(
  ctx: any,
  src: Node,
  srcKey: string,
  dst: Node,
  dstKey: string
): Promise<void> {
  const tool = new ConnectOp();
  tool.inputs.graphPath.setValue("graph");
  tool.inputs.srcNode.setValue(id(src));
  tool.inputs.srcSocket.setValue(srcKey);
  tool.inputs.dstNode.setValue(id(dst));
  tool.inputs.dstSocket.setValue(dstKey);
  await ctx.toolstack.execTool(ctx, tool);
}

test("AddNodeOp adds through the stack; undo removes; redo restores the same id", async () => {
  const ctx = makeCtx(new Graph());
  const node = await addNode(ctx, "OpsMath", 10, 20);

  expect(ctx.graph.nodes.length).toBe(1);
  expect(node).toBeInstanceOf(OpsMath);
  expect(node.pos[0]).toBe(10);
  expect(node.pos[1]).toBe(20);

  await ctx.toolstack.undo();
  expect(ctx.graph.nodes.length).toBe(0);

  await ctx.toolstack.redo();
  expect(ctx.graph.nodes.length).toBe(1);
  expect(ctx.graph.nodeIdMap.get(node.id)).toBeInstanceOf(OpsMath);
});

test("DeleteNodeOp removes; undo restores the node with its links", async () => {
  const ctx = makeCtx(new Graph());
  const src = await addNode(ctx, "OpsSrc");
  const m = await addNode(ctx, "OpsMath");
  await connect(ctx, src, "value", m, "a");

  const tool = new DeleteNodeOp();
  tool.inputs.graphPath.setValue("graph");
  tool.inputs.nodeId.setValue(id(m));
  await ctx.toolstack.execTool(ctx, tool);

  expect(ctx.graph.nodes.length).toBe(1);
  expect(src.outputs.value.edges).toEqual([]);

  await ctx.toolstack.undo();
  expect(ctx.graph.nodeIdMap.get(m.id)).toBe(m);
  expect(m.inputs.a.edges).toEqual([src.outputs.value]);
});

test("ConnectOp links through the stack; undo restores a displaced link", async () => {
  const ctx = makeCtx(new Graph());
  const s1 = await addNode(ctx, "OpsSrc");
  const s2 = await addNode(ctx, "OpsSrc");
  const m = await addNode(ctx, "OpsMath");

  await connect(ctx, s1, "value", m, "a");
  await connect(ctx, s2, "value", m, "a");
  expect(m.inputs.a.edges).toEqual([s2.outputs.value]);

  await ctx.toolstack.undo();
  expect(m.inputs.a.edges).toEqual([s1.outputs.value]);
});

test("DisconnectOp severs through the stack; undo reconnects", async () => {
  const ctx = makeCtx(new Graph());
  const src = await addNode(ctx, "OpsSrc");
  const m = await addNode(ctx, "OpsMath");
  await connect(ctx, src, "value", m, "a");

  const tool = new DisconnectOp();
  tool.inputs.graphPath.setValue("graph");
  tool.inputs.srcNode.setValue(id(src));
  tool.inputs.srcSocket.setValue("value");
  tool.inputs.dstNode.setValue(id(m));
  tool.inputs.dstSocket.setValue("a");
  await ctx.toolstack.execTool(ctx, tool);
  expect(m.inputs.a.edges).toEqual([]);

  await ctx.toolstack.undo();
  expect(m.inputs.a.edges).toEqual([src.outputs.value]);
});

test("MoveNodeOp and RenameNodeOp mutate and undo through the stack", async () => {
  const ctx = makeCtx(new Graph());
  const m = await addNode(ctx, "OpsMath", 1, 2);

  const move = new MoveNodeOp();
  move.inputs.graphPath.setValue("graph");
  move.inputs.nodeId.setValue(id(m));
  move.inputs.x.setValue(50);
  move.inputs.y.setValue(60);
  await ctx.toolstack.execTool(ctx, move);
  expect([m.pos[0], m.pos[1]]).toEqual([50, 60]);

  await ctx.toolstack.undo();
  expect([m.pos[0], m.pos[1]]).toEqual([1, 2]);

  const rename = new RenameNodeOp();
  rename.inputs.graphPath.setValue("graph");
  rename.inputs.nodeId.setValue(id(m));
  rename.inputs.label.setValue("Blend");
  await ctx.toolstack.execTool(ctx, rename);
  expect(m.getUIName()).toBe("Blend");

  await ctx.toolstack.undo();
  expect(m.label).toBeUndefined();
  expect(m.getUIName()).toBe("OpsMath");
});

test("SetNodePropOp sets through the stack; undo restores value and wasSet", async () => {
  const ctx = makeCtx(new Graph());
  const m = await addNode(ctx, "OpsMath");
  expect(m.props.bias.wasSet).toBe(false);

  const tool = SetNodePropOp.create(ctx, "graph", id(m), "bias", 5);
  await ctx.toolstack.execTool(ctx, tool);
  expect(m.props.bias.getValue()).toBe(5);
  expect(m.props.bias.wasSet).toBe(true);

  await ctx.toolstack.undo();
  expect(m.props.bias.getValue()).toBe(1);
  expect(m.props.bias.wasSet).toBe(false);

  await ctx.toolstack.redo();
  expect(m.props.bias.getValue()).toBe(5);
});

const REFUSAL =
  "a group instance takes value edits only; structural edits belong to the group's definition";

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
  await ctx.toolstack.execTool(ctx, tool);
  expect(copy.props.bias.wasSet).toBe(true);
  expect(copy.props.bias.getValue()).toBe(9);
  expect(inner.props.bias.getValue()).toBe(4);

  // ...and undoing the first edit dematerializes: reads follow the definition again.
  await ctx.toolstack.undo();
  expect(copy.props.bias.wasSet).toBe(false);
  expect(ctx.api.getValue(ctx, `${sub}.nodes[${copy.id}].props['bias'].value`)).toBe(4);

  warn.mockRestore();
});

test("ReplaceNodeOp swaps in place, re-links compatible sockets, prunes exposure rows", async () => {
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
  await ctx.toolstack.execTool(ctx, tool);

  const nn = def.subgraph.nodeIdMap.get(m.id)!;
  expect(nn).toBeInstanceOf(OpsMath2);
  expect(nn).not.toBe(m);
  expect(nn.inputs.a.edges).toEqual([src.outputs.value]);
  // OpsMath2 has no 'b' input, so that link is dropped rather than misrouted.
  expect(src2.outputs.value.edges).toEqual([]);
  // The bias exposure row cannot be satisfied and goes; the nodeUI row stays.
  expect(def.exposed).toEqual([eUI]);

  await ctx.toolstack.undo();
  expect(def.subgraph.nodeIdMap.get(m.id)).toBe(m);
  expect(m.inputs.a.edges).toEqual([src.outputs.value]);
  expect(m.inputs.b.edges).toEqual([src2.outputs.value]);
  expect(def.exposed).toEqual([eBias, eUI]);
});

function connectRaw(g: Graph, src: Node, srcKey: string, dst: Node, dstKey: string): void {
  g.connect(src.outputs[srcKey], dst.inputs[dstKey]);
}

test("CreateGroupOp groups, saves through the store, undoes to the same objects and redoes into the same definition", async () => {
  const g = new Graph();
  const saved: { ref: string; def: GroupDef }[] = [];
  g.groupSaver = async (ref, def) => {
    saved.push({ ref, def });
  };
  const ctx = makeCtx(g);
  const src = await addNode(ctx, "OpsSrc");
  const m = await addNode(ctx, "OpsMath");
  const q = await addNode(ctx, "OpsMath");
  connectRaw(g, src, "value", m, "a");
  connectRaw(g, m, "out", q, "a");

  const tool = new CreateGroupOp();
  tool.inputs.graphPath.setValue("graph");
  tool.inputs.storePath.setValue("graph");
  tool.inputs.nodeIds.setValue(JSON.stringify([m.id]));
  tool.inputs.ref.setValue("grp");
  await ctx.toolstack.execTool(ctx, tool);

  const grp = g.nodeIdMap.get(JSON.parse(tool.outputs.nodeId.getValue()))!;
  expect(grp).toBeInstanceOf(GroupNode);
  expect(g.nodes.includes(m)).toBe(false);
  expect(saved.length).toBe(1);
  expect(saved[0].ref).toBe("grp");
  const def = saved[0].def;
  expect(def.subgraph.nodeIdMap.get(m.id)).toBe(m);
  expect(ctx.selection.has(grp.id)).toBe(true);
  expect(src.outputs.value.edges).toEqual([grp.inputs.a]);
  expect(grp.outputs.out.edges).toEqual([q.inputs.a]);

  await ctx.toolstack.undo();
  expect(g.nodeIdMap.get(m.id)).toBe(m);
  expect(g.nodes.includes(grp)).toBe(false);
  expect(src.outputs.value.edges).toEqual([m.inputs.a]);
  expect(m.outputs.out.edges).toEqual([q.inputs.a]);
  expect(def.subgraph.nodes.every((n) => !(n instanceof OpsMath))).toBe(true);

  await ctx.toolstack.redo();
  expect(g.nodeIdMap.get(grp.id)).toBe(grp);
  expect((grp as GroupNode).definition).toBe(def);
  expect(def.subgraph.nodeIdMap.get(m.id)).toBe(m);
  expect(saved.length).toBe(2);
  expect(saved[1].def).toBe(def);
  expect(src.outputs.value.edges).toEqual([grp.inputs.a]);
});

test("CreateGroupOp refuses through canRun on an empty ref and on a refused plan", async () => {
  const ctx = makeCtx(new Graph());
  const m = await addNode(ctx, "OpsMath");
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

  const tool = new CreateGroupOp();
  tool.inputs.graphPath.setValue("graph");
  tool.inputs.storePath.setValue("graph");
  tool.inputs.nodeIds.setValue(JSON.stringify([m.id]));
  expect(CreateGroupOp.canRun(ctx, tool)).toBe(false);

  tool.inputs.ref.setValue("grp");
  tool.inputs.nodeIds.setValue("[]");
  expect(CreateGroupOp.canRun(ctx, tool)).toBe(false);
  expect(warn.mock.calls.map((c) => c[0])).toEqual([
    "a new group needs a reference to be saved under",
    "select at least one node to group",
  ]);
  warn.mockRestore();
});

test("UngroupOp inlines with fresh ids, undoes to the instance, and redoes onto the same ids", async () => {
  const ctx = makeCtx(new Graph());
  const g: Graph = ctx.graph;
  const src = await addNode(ctx, "OpsSrc");
  const m = await addNode(ctx, "OpsMath");
  connectRaw(g, src, "value", m, "a");

  const create = new CreateGroupOp();
  create.inputs.graphPath.setValue("graph");
  create.inputs.storePath.setValue("graph");
  create.inputs.nodeIds.setValue(JSON.stringify([m.id]));
  create.inputs.ref.setValue("grp");
  await ctx.toolstack.execTool(ctx, create);
  const grp = g.nodeIdMap.get(JSON.parse(create.outputs.nodeId.getValue())) as GroupNode;

  const tool = new UngroupOp();
  tool.inputs.graphPath.setValue("graph");
  tool.inputs.nodeId.setValue(id(grp));
  await ctx.toolstack.execTool(ctx, tool);

  const pairs = JSON.parse(tool.outputs.nodeIds.getValue()) as [number, number][];
  expect(pairs.length).toBe(1);
  const inlined = g.nodeIdMap.get(pairs[0][1])!;
  expect(inlined).toBeInstanceOf(OpsMath);
  expect(inlined).not.toBe(m);
  expect(g.nodes.includes(grp)).toBe(false);
  expect(src.outputs.value.edges).toEqual([inlined.inputs.a]);
  expect(ctx.selection.has(inlined.id)).toBe(true);

  await ctx.toolstack.undo();
  expect(g.nodeIdMap.get(grp.id)).toBe(grp);
  expect(g.nodes.includes(inlined)).toBe(false);
  expect(src.outputs.value.edges).toEqual([grp.inputs.a]);

  await ctx.toolstack.redo();
  expect(g.nodeIdMap.get(pairs[0][1])).toBeInstanceOf(OpsMath);
  expect(g.nodes.includes(grp)).toBe(false);
});

test("DuplicateNodeOp copies a synced instance with its ref, definition and override", async () => {
  const { host, grp, inner, def } = await makeGroup();
  const ctx = makeCtx(host);
  grp.subgraph.nodeIdMap.get(inner.id)!.props.bias.setValue(7);

  const tool = new DuplicateNodeOp();
  tool.inputs.graphPath.setValue("graph");
  tool.inputs.nodeId.setValue(id(grp));
  tool.inputs.x.setValue(30);
  tool.inputs.y.setValue(40);
  await ctx.toolstack.execTool(ctx, tool);

  const copy = host.nodeIdMap.get(JSON.parse(tool.outputs.nodeId.getValue())) as GroupNode;
  expect(copy).toBeInstanceOf(GroupNode);
  expect(copy).not.toBe(grp);
  expect(copy.ref).toBe("grp");
  expect(copy.definition).toBe(def);
  expect(copy.subgraph.nodeIdMap.get(inner.id)!.props.bias.getValue()).toBe(7);
  expect([copy.pos[0], copy.pos[1]]).toEqual([30, 40]);

  await ctx.toolstack.undo();
  expect(host.nodes.length).toBe(1);
  await ctx.toolstack.redo();
  expect(host.nodeIdMap.get(copy.id)).toBeInstanceOf(GroupNode);
});

test("AddNodeOp with a ref adds an unresolved instance that the next resolve binds", async () => {
  const def = new GroupDef();
  def.subgraph.add(new OpsMath());
  const host = new Graph();
  host.groupLoader = async (ref) => (ref === "grp" ? def : undefined);
  const ctx = makeCtx(host);

  const tool = new AddNodeOp();
  tool.inputs.graphPath.setValue("graph");
  tool.inputs.nodeType.setValue("GroupNode");
  tool.inputs.ref.setValue("grp");
  await ctx.toolstack.execTool(ctx, tool);

  const node = host.nodes[0] as GroupNode;
  expect(node).toBeInstanceOf(GroupNode);
  expect(node.ref).toBe("grp");
  expect(node.definition).toBeUndefined();
  await host.resolveGroups();
  expect(node.definition).toBe(def);
  expect(node.subgraph.nodes.some((n) => n instanceof OpsMath)).toBe(true);
});

test("the definition ops mutate a definition through the stack and undo, and refuse elsewhere", async () => {
  const def = new GroupDef();
  const m = new OpsMath();
  def.subgraph.add(m);
  const ctx = makeCtx(def.subgraph);

  const expose = new ExposeEntryOp();
  expose.inputs.graphPath.setValue("graph");
  expose.inputs.kind.setValue("prop");
  expose.inputs.nodeId.setValue(id(m));
  expose.inputs.propKey.setValue("bias");
  expose.inputs.label.setValue("Bias");
  await ctx.toolstack.execTool(ctx, expose);
  expect(def.exposed.map((e) => e.label)).toEqual(["Bias"]);

  const exposeUI = new ExposeEntryOp();
  exposeUI.inputs.graphPath.setValue("graph");
  exposeUI.inputs.kind.setValue("nodeUI");
  exposeUI.inputs.nodeId.setValue(id(m));
  exposeUI.inputs.at.setValue(0);
  await ctx.toolstack.execTool(ctx, exposeUI);
  expect(def.exposed.map((e) => e.kind)).toEqual(["nodeUI", "prop"]);

  const reorder = new ReorderEntryOp();
  reorder.inputs.graphPath.setValue("graph");
  reorder.inputs.from.setValue(0);
  reorder.inputs.to.setValue(1);
  await ctx.toolstack.execTool(ctx, reorder);
  expect(def.exposed.map((e) => e.kind)).toEqual(["prop", "nodeUI"]);

  const repoint = new RepointEntryOp();
  repoint.inputs.graphPath.setValue("graph");
  repoint.inputs.index.setValue(0);
  repoint.inputs.nodeId.setValue(id(m));
  repoint.inputs.propKey.setValue("in:a");
  await ctx.toolstack.execTool(ctx, repoint);
  expect(def.exposed[0].propKey).toBe("in:a");

  const remove = new RemoveEntryOp();
  remove.inputs.graphPath.setValue("graph");
  remove.inputs.index.setValue(1);
  await ctx.toolstack.execTool(ctx, remove);
  expect(def.exposed.map((e) => e.kind)).toEqual(["prop"]);

  const addSock = new AddGroupSocketOp();
  addSock.inputs.graphPath.setValue("graph");
  addSock.inputs.dir.setValue("in");
  addSock.inputs.key.setValue("x");
  addSock.inputs.socketType.setValue("FloatSocket");
  await ctx.toolstack.execTool(ctx, addSock);
  expect(def.inputs.x).toBeInstanceOf(FloatSocket);
  def.subgraph.connect(def.inputNode().outputs.x, m.inputs.b);

  const removeSock = new RemoveGroupSocketOp();
  removeSock.inputs.graphPath.setValue("graph");
  removeSock.inputs.dir.setValue("in");
  removeSock.inputs.key.setValue("x");
  await ctx.toolstack.execTool(ctx, removeSock);
  expect(def.inputs.x).toBeUndefined();
  expect(m.inputs.b.edges).toEqual([]);

  // undo all the way back, then redo all the way forward
  await ctx.toolstack.undo();
  expect(def.inputs.x).toBeDefined();
  expect(def.inputNode().outputs.x.edges).toEqual([m.inputs.b]);
  await ctx.toolstack.undo();
  expect(def.inputs.x).toBeUndefined();
  await ctx.toolstack.undo();
  expect(def.exposed.map((e) => e.kind)).toEqual(["prop", "nodeUI"]);
  await ctx.toolstack.undo();
  expect(def.exposed[0].propKey).toBe("bias");
  await ctx.toolstack.undo();
  expect(def.exposed.map((e) => e.kind)).toEqual(["nodeUI", "prop"]);
  await ctx.toolstack.undo();
  expect(def.exposed.map((e) => e.kind)).toEqual(["prop"]);
  await ctx.toolstack.undo();
  expect(def.exposed).toEqual([]);
  for (let i = 0; i < 7; i++) {
    await ctx.toolstack.redo();
  }
  expect(def.exposed.map((e) => e.propKey)).toEqual(["in:a"]);
  expect(def.inputs.x).toBeUndefined();

  // every definition op refuses on a root graph and on an instance subgraph
  const { host, grp } = await makeGroup();
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  for (const path of ["graph", `graph.nodes[${grp.id}].group`]) {
    const hctx = makeCtx(host);
    for (const op of [
      new ExposeEntryOp(),
      new ReorderEntryOp(),
      new RepointEntryOp(),
      new RemoveEntryOp(),
      new AddGroupSocketOp(),
      new RemoveGroupSocketOp(),
    ]) {
      op.inputs.graphPath.setValue(path);
      const cls = op.constructor as typeof ExposeEntryOp;
      expect(cls.canRun(hctx, op)).toBe(false);
    }
  }
  expect(warn.mock.calls.every((c) => /is not a group definition/.test(String(c[0])))).toBe(true);
  warn.mockRestore();
});

test("a DSL entry names its definition with group, and only a GroupNode may", () => {
  const registries = { nodeTypes: NodeClasses, socketTypes: SocketClasses };
  const { graph, diagnostics } = buildGraphFromDSL(
    {
      nodes: [
        { id: "g", type: "GroupNode", group: "blur" },
        { id: "m", type: "OpsMath", group: "blur" },
      ],
    },
    registries
  );
  const g = graph.nodeIdMap.get("g") as GroupNode;
  expect(g.ref).toBe("blur");
  expect(diagnostics.map((d) => d.code)).toEqual(["unknown-prop"]);
  expect(diagnostics[0].path).toBe("nodes[1].group");
});
