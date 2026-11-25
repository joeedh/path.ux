import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { UIBase, iconmanager } from "../scripts/core/ui_base";
import type { IContextBase } from "../scripts/core/context_base";
import { Area } from "../scripts/screen/ScreenArea";
import type { DropBox } from "../scripts/menu/dropbox";
import type { Menu } from "../scripts/menu/menu";
import { DataAPI, DataStruct } from "../scripts/path-controller/controller/controller";
import { ToolStack } from "../scripts/path-controller/toolsys/toolstack";
import { Node, registerNodeType } from "../scripts/graph/node";
import type { NodeDef } from "../scripts/graph/node";
import { Graph } from "../scripts/graph/graph";
import { SocketClasses } from "../scripts/graph/socket";
import { FloatSocket } from "../scripts/graph/sockets_std";
import { GroupDef, GroupNode } from "../scripts/graph/group";
import { defineGraphAPI } from "../scripts/graph/graph_api";
// a plain import, so that the widget is registered
import "../scripts/editors/nodeeditor/nodegraphview";
import type { NodeGraphView } from "../scripts/editors/nodeeditor/nodegraphview";
import type { NodeFrame } from "../scripts/editors/nodeeditor/nodeframe";
import { NodeEditor } from "../scripts/editors/nodeeditor/nodeeditor";
import { addMenuItems } from "../scripts/editors/nodeeditor/addmenu";
import { buildGroupDesigner, socketTypeMenuTemplate } from "../scripts/editors/nodeeditor/groupui";
import { ToolOpDelegate } from "../scripts/editors/nodeeditor/delegate";
import type { EditVerdict } from "../scripts/editors/nodeeditor/delegate";

class HookNode extends Node {
  static override graphDef(): NodeDef {
    return { typeName: "HookNode", outputs: { value: new FloatSocket("out") } };
  }
}
registerNodeType(HookNode);

class HookOther extends Node {
  static override graphDef(): NodeDef {
    return { typeName: "HookOther", outputs: { value: new FloatSocket("out") } };
  }
}
registerNodeType(HookOther);

const TYPES = ["Vec3Socket", "NoSuchSocket", "FloatSocket", "Vec3Socket"];
const OFFERED = ["Vec3Socket", "FloatSocket"];
const ALL = [...SocketClasses.keys()];

/** Refuses everything, so that nothing changes. */
class HookDelegate extends ToolOpDelegate {
  override check(): EditVerdict {
    return { ok: false, reason: "hook delegate" };
  }
}

const hookDelegate = new HookDelegate();

class HookEditor extends NodeEditor {
  static override define() {
    return { tagname: "hook-node-editor-x", areaname: "hook_node_editor", uiname: "Hooks" };
  }

  override init() {
    this.view.delegate = hookDelegate;
    this.view.socketTypes = TYPES;
    super.init();
  }
}

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
  Area.register(HookEditor);
});

afterAll(() => {
  Area.unregister(HookEditor);
});

function makeCtx(graph: Graph) {
  const api = new DataAPI();
  const root = new DataStruct();
  root.struct("graph", "graph", "Graph", defineGraphAPI(api));
  api.setRoot(root);

  const ctx = { state: {}, graph, api } as Record<string, unknown>;
  ctx.toLocked = () => ctx;
  ctx.toolstack = new ToolStack(ctx as unknown as ConstructorParameters<typeof ToolStack>[0]);
  return ctx as unknown as IContextBase;
}

function makeView(graph: Graph): NodeGraphView {
  const view = UIBase.createElement("nodegraphview-x") as NodeGraphView;
  view.ctx = makeCtx(graph);
  view.checkInit();
  return view;
}

/** Reaches the parts of the view that start menus, which need a screen. */
interface MenuInternals {
  _startMenu(menu: Menu): void;
  _openNodeMenu(frame: NodeFrame, local: [number, number]): void;
}

/** Opens Replace… on a frame, and answers the picker it starts. */
function replacePicker(view: NodeGraphView, frame: NodeFrame): Menu {
  const menus: Menu[] = [];
  const internals = view as unknown as MenuInternals;
  internals._startMenu = (menu) => void menus.push(menu);
  internals._openNodeMenu(frame, [0, 0]);
  menus[0]._onselect!("replace");
  expect(menus.length).toBe(2);
  return menus[1];
}

const ids = (menu: Menu) => menu.items.map((li) => li._id);

const shadowOf = (el: Element) =>
  el.shadowRoot ?? (el as unknown as { shadow?: ShadowRoot }).shadow;

/** Finds the elements under root that match, shadow roots included. */
function deepAll(root: Element, selector: string): HTMLElement[] {
  const out = new Set<HTMLElement>();
  const walk = (node: ParentNode) => {
    for (const el of node.querySelectorAll<HTMLElement>("*")) {
      if (el.matches(selector)) {
        out.add(el);
      }
      const shadow = shadowOf(el);
      if (shadow) {
        walk(shadow);
      }
    }
  };
  walk(root);
  const own = shadowOf(root);
  if (own) {
    walk(own);
  }
  return [...out];
}

/** Lists what each "Add input…" and "Add output…" dropdown under root offers. */
function offered(root: Element): string[][] {
  return deepAll(root, ".nodeeditor-add-socket").map((row) => {
    const dbox = deepAll(row, "dropbox-x")[0] as unknown as DropBox;
    return (dbox.template as { id: string }[]).map((item) => item.id);
  });
}

/** Makes a graph with one instance of a group, whose definition has an input and an output. */
function groupFixture() {
  const def = new GroupDef();
  def.declareInput("a", new FloatSocket("in"));
  def.declareOutput("out", new FloatSocket("out"));
  def.subgraph.add(new HookNode());
  const graph = new Graph();
  const instance = new GroupNode();
  graph.add(instance);
  instance.setDefinition("grp", def);
  return { def, graph, instance };
}

function addNode(graph: Graph) {
  const node = new HookNode();
  graph.add(node);
  return node;
}

test("without the hooks, the menus offer every type", () => {
  const { def, graph } = groupFixture();
  const node = addNode(graph);
  const view = makeView(graph);
  view.setGraph(graph, "graph");

  const all = addMenuItems().map((item) => item.typeName);
  expect(all).toContain("HookOther");
  expect(ids(replacePicker(view, view.frames.get(node.id)!))).toEqual(all);
  expect(ids(view.openAddMenu([0, 0]))).toEqual(all);

  const root = document.createElement("div");
  const ctx = view.graphContext;
  buildGroupDesigner(root, { ctx, def, graphPath: "graph", delegate: view.delegate });
  expect(offered(root)).toEqual([ALL, ALL]);
});

test("Replace and openAddMenu offer the host's items, asked for each time", () => {
  const graph = new Graph();
  const node = addNode(graph);
  const view = makeView(graph);
  view.setGraph(graph, "graph");
  let allowed = "HookOther";
  view.nodeItems = vi.fn(() => addMenuItems().filter((item) => item.typeName === allowed));

  const frame = view.frames.get(node.id)!;
  expect(ids(replacePicker(view, frame))).toEqual(["HookOther"]);
  expect(ids(view.openAddMenu([0, 0]))).toEqual(["HookOther"]);
  allowed = "HookNode";
  expect(ids(replacePicker(view, frame))).toEqual(["HookNode"]);
  expect(view.nodeItems).toHaveBeenCalledTimes(3);
});

test("a pick from the host's items replaces the node", async () => {
  const graph = new Graph();
  const node = addNode(graph);
  const view = makeView(graph);
  view.setGraph(graph, "graph");
  view.nodeItems = () => addMenuItems().filter((item) => item.typeName === "HookOther");
  const replace = vi.spyOn(view, "replaceNode");

  replacePicker(view, view.frames.get(node.id)!)._onselect!("HookOther");
  expect(replace).toHaveBeenCalledWith(node.id, "HookOther");
  await replace.mock.results[0].value;
  expect(graph.nodes.map((n) => n.def.typeName)).toEqual(["HookOther"]);
});

test("a socket type list keeps its order and leaves out repeated and unknown names", () => {
  const list = (types?: readonly string[]) =>
    socketTypeMenuTemplate(() => undefined, types).map((item) => (item as { id: string }).id);
  expect(list(TYPES)).toEqual(OFFERED);
  expect(list([])).toEqual([]);
  expect(list()).toEqual(ALL);
});

test("the designer and the rows on proxy nodes offer the listed socket types", async () => {
  const { def, graph, instance } = groupFixture();
  const view = makeView(graph);
  view.socketTypes = TYPES;
  view.setGraph(graph, "graph");
  await view.enterDefinition(instance);
  expect(offered(view)).toEqual([OFFERED, OFFERED]);

  const root = document.createElement("div");
  const { graphContext: ctx, currentGraphPath: graphPath, delegate } = view;
  buildGroupDesigner(root, { ctx, def, graphPath, delegate, socketTypes: TYPES });
  expect(offered(root)).toEqual([OFFERED, OFFERED]);
});

test("a copied editor builds its designer and rows with its own context, delegate and types", async () => {
  const { graph, instance } = groupFixture();
  const ctx = makeCtx(graph);
  const editor = UIBase.createElement("hook-node-editor-x") as HookEditor;
  editor.ctx = ctx;
  editor.checkInit();
  editor.setGraph(graph, "graph");
  await editor.view.enterDefinition(instance);
  expect(editor.view.currentLevel().kind).toBe("definition");

  const copy = editor.copy();
  const check = vi.spyOn(hookDelegate, "check");
  copy.ctx = ctx;
  copy.checkInit();
  expect(copy.view.currentLevel().kind).toBe("definition");
  // two rows in the designer and one on each proxy node
  expect(offered(copy)).toEqual([OFFERED, OFFERED, OFFERED, OFFERED]);

  const removes = deepAll(copy, ".nodeeditor-boundary-row button-x");
  expect(removes.length).toBe(2);
  for (const remove of removes) {
    (remove as unknown as { onclick(): void }).onclick();
  }
  const calls = check.mock.calls as unknown as unknown[][];
  expect(calls.length).toBe(2);
  for (const args of calls) {
    expect(args[0]).toBe(copy.view.graphContext);
  }
  check.mockRestore();
});
