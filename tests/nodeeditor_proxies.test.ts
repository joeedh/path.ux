import { beforeAll, expect, test, vi } from "vitest";
import { UIBase, iconmanager } from "../scripts/core/ui_base";
import type { IContextBase } from "../scripts/core/context_base";
import type { Menu } from "../scripts/menu/menu";
import { DataAPI, DataStruct } from "../scripts/path-controller/controller/controller";
import { ToolStack } from "../scripts/path-controller/toolsys/toolstack";
import { Node, registerNodeType } from "../scripts/graph/node";
import type { NodeDef } from "../scripts/graph/node";
import { Graph } from "../scripts/graph/graph";
import { FloatSocket } from "../scripts/graph/sockets_std";
import { GroupDef, GroupInputNode, GroupNode } from "../scripts/graph/group";
import { defineGraphAPI } from "../scripts/graph/graph_api";
import { DeleteNodeOp, DuplicateNodeOp, ReplaceNodeOp } from "../scripts/graph/graph_ops";
// a plain import, so that the widget is registered
import "../scripts/editors/nodeeditor/nodegraphview";
import type { NodeGraphView } from "../scripts/editors/nodeeditor/nodegraphview";
import type { NodeFrame } from "../scripts/editors/nodeeditor/nodeframe";
import { ToolOpDelegate } from "../scripts/editors/nodeeditor/delegate";
import type { EditVerdict, GraphEdit } from "../scripts/editors/nodeeditor/delegate";

class ProxyTestNode extends Node {
  static override graphDef(): NodeDef {
    return {
      typeName: "ProxyTestNode",
      inputs  : { a: new FloatSocket("in") },
      outputs : { value: new FloatSocket("out") },
    };
  }
}
registerNodeType(ProxyTestNode);

beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window ||= globalThis;

  const proto = HTMLCanvasElement.prototype as unknown as {
    getContext(kind: string): unknown;
  };
  proto.getContext = () =>
    new Proxy(
      {},
      {
        get: (_t, key) => (key === "measureText" ? () => ({ width: 10 }) : () => undefined),
        set: () => true,
      }
    );

  const sheets = (iconmanager as unknown as { iconsheets: { image: unknown }[] }).iconsheets;
  for (const sheet of sheets) {
    sheet.image ||= { src: "" };
  }
});

function makeView(graph: Graph): NodeGraphView {
  const api = new DataAPI();
  const root = new DataStruct();
  root.struct("graph", "graph", "Graph", defineGraphAPI(api));
  api.setRoot(root);

  const ctx = { state: {}, graph, api } as Record<string, unknown>;
  ctx.toLocked = () => ctx;
  ctx.toolstack = new ToolStack(ctx as unknown as ConstructorParameters<typeof ToolStack>[0]);

  const view = UIBase.createElement("nodegraphview-x") as NodeGraphView;
  view.ctx = ctx as unknown as IContextBase;
  view.checkInit();
  view.setGraph(graph, "graph");
  return view;
}

/** Opens a definition holding an input, a node linked to it, and an output. */
async function openDefinition() {
  const def = new GroupDef();
  const inner = def.declareInput("a", new FloatSocket("in"));
  def.declareOutput("out", new FloatSocket("out"));
  const node = new ProxyTestNode();
  def.subgraph.add(node);
  def.subgraph.connect(inner, node.inputs.a);

  const graph = new Graph();
  const instance = new GroupNode();
  graph.add(instance);
  instance.setDefinition("grp", def);
  const view = makeView(graph);
  await view.enterDefinition(instance);
  expect(view.currentLevel().kind).toBe("definition");
  return { def, graph, node, view, input: def.inputNode(), output: def.outputNode() };
}

const KINDS = ["deleteNode", "replaceNode", "duplicateNode"] as const;

function editOf(view: NodeGraphView, kind: (typeof KINDS)[number], node: Node): GraphEdit {
  const at = { graphPath: view.currentGraphPath, nodeId: node.id };
  switch (kind) {
    case "deleteNode":
      return { kind, ...at };
    case "replaceNode":
      return { kind, ...at, newType: "ProxyTestNode" };
    case "duplicateNode":
      return { kind, ...at, x: 0, y: 0 };
  }
}

/** What the delegate, and the op that it would run, decide about each kind. */
function verdicts(view: NodeGraphView, node: Node): [boolean[], boolean[]] {
  const ctx = view.graphContext;
  const checks = KINDS.map((kind) => view.delegate.check(ctx, editOf(view, kind, node)).ok);
  const runs = [DeleteNodeOp, ReplaceNodeOp, DuplicateNodeOp].map((cls) => {
    const op = new cls();
    op.inputs.graphPath.setValue(view.currentGraphPath);
    op.inputs.nodeId.setValue(JSON.stringify(node.id));
    return cls.canRun(ctx, op) === true;
  });
  return [checks, runs];
}

/** The names that the node menu of one node lists, or undefined when none opens. */
function menuNames(view: NodeGraphView, node: Node): string[] | undefined {
  const menus: Menu[] = [];
  const internals = view as unknown as {
    _startMenu(menu: Menu): void;
    _openNodeMenu(frame: NodeFrame, local: [number, number]): void;
  };
  internals._startMenu = (menu) => void menus.push(menu);
  internals._openNodeMenu(view.frames.get(node.id)!, [0, 0]);
  return menus[0]?.items.map((li) => (li as unknown as HTMLElement).textContent ?? "");
}

const NONE = [false, false, false];

test("a definition's proxy nodes can't be deleted, replaced or duplicated", async () => {
  const { view, input, output, node } = await openDefinition();
  expect(verdicts(view, input)).toEqual([NONE, NONE]);
  expect(verdicts(view, output)).toEqual([NONE, NONE]);
  const ALL = [true, true, true];
  expect(verdicts(view, node)).toEqual([ALL, ALL]);
});

test("a further proxy can be deleted or replaced, and not duplicated", async () => {
  const { def, view, input } = await openDefinition();
  const extra = new GroupInputNode();
  def.subgraph.add(extra);
  expect(verdicts(view, extra)).toEqual([
    [true, true, false],
    [true, true, false],
  ]);
  expect(verdicts(view, input)).toEqual([NONE, NONE]);
});

test("a proxy in a graph that is no definition isn't kept", () => {
  const graph = new Graph();
  const stray = new GroupInputNode();
  graph.add(stray);
  const view = makeView(graph);
  expect(verdicts(view, stray)[0]).toEqual([true, true, true]);
});

test("an op with an id that doesn't parse or isn't there is left to exec", async () => {
  const { view } = await openDefinition();
  for (const id of ["", "{", '"nothing"']) {
    const op = new DeleteNodeOp();
    op.inputs.graphPath.setValue(view.currentGraphPath);
    op.inputs.nodeId.setValue(id);
    expect(DeleteNodeOp.canRun(view.graphContext, op)).toBe(true);
  }
});

test("the node menu of a proxy has only what is allowed there", async () => {
  const { view, input, node } = await openDefinition();
  expect(menuNames(view, node)?.length).toBe(3);
  expect(menuNames(view, input)).toBeUndefined();
  view.selection.add(node.id);
  expect(menuNames(view, input)?.length).toBe(1);
});

test("deleting a selection keeps the proxies, in one undo entry", async () => {
  const { def, view, input, output, node } = await openDefinition();
  const stack = view.graphContext.toolstack;
  for (const n of [input, node, output]) {
    view.selection.add(n.id);
  }
  await view.deleteSelected();
  expect([...def.subgraph.nodes]).toEqual([input, output]);
  expect(stack.length).toBe(1);

  await stack.undo();
  expect([...def.subgraph.nodes]).toEqual([input, output, node]);
  expect(input.outputs.a.edges).toEqual([node.inputs.a]);
});

test("a gesture on proxies alone leaves the undo stack as it was", async () => {
  const { def, view, input, node } = await openDefinition();
  const stack = view.graphContext.toolstack;
  view.selection.add(node.id);
  await view.deleteSelected();
  await stack.undo();
  const { length, cur } = stack;
  expect([length, cur]).toEqual([1, -1]);

  for (const gesture of ["deleteSelected", "duplicateSelected"] as const) {
    view.selection.clear();
    view.selection.add(input.id);
    await view[gesture]();
    expect([stack.length, stack.cur]).toEqual([length, cur]);
  }
  await stack.redo();
  expect(def.subgraph.nodes).not.toContain(node);
});

/** Accepts every edit, also one that the op then refuses. */
class AcceptingDelegate extends ToolOpDelegate {
  override check(): EditVerdict {
    return { ok: true };
  }
}

test("a gesture whose undo step fails rejects, and releases the input", async () => {
  const { def, view, input, node } = await openDefinition();
  view.delegate = new AcceptingDelegate();
  view.selection.add(input.id);
  view.selection.add(node.id);
  const settled = vi.fn();
  await Promise.race([
    view.deleteSelected().then(settled, settled),
    new Promise((resolve) => setTimeout(resolve, 1000)),
  ]);
  expect(settled).toHaveBeenCalledTimes(1);
  expect(String(settled.mock.calls[0][0])).toContain("keeps its own input and output nodes");
  expect(def.subgraph.nodes).toContain(node);

  // the next gesture isn't locked out
  view.delegate = new ToolOpDelegate();
  view.selection.clear();
  view.selection.add(node.id);
  await view.deleteSelected();
  expect(def.subgraph.nodes).not.toContain(node);
});
