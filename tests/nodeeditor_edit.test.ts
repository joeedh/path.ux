import { test, expect, beforeAll, vi } from "vitest";
import { UIBase, iconmanager } from "../scripts/core/ui_base";
import type { IContextBase } from "../scripts/core/context_base";
import type { Label } from "../scripts/core/ui";
import type { Button } from "../scripts/widgets/ui_button";
import type { TextBox } from "../scripts/widgets/ui_textbox";
import type { DropBox } from "../scripts/menu/dropbox";
import type { Menu } from "../scripts/menu/menu";
import type { MenuTemplate } from "../scripts/menu/menu_types";
import { createMenu } from "../scripts/menu/menu_ops";
import type { ExposeRequest } from "../scripts/graph/grouping";
import { DataAPI, DataStruct } from "../scripts/path-controller/controller/controller";
import { ToolStack } from "../scripts/path-controller/toolsys/toolstack";
import { FloatProperty, StringProperty } from "../scripts/path-controller/toolsys/toolprop";
import { Node, registerNodeType } from "../scripts/graph/node";
import type { NodeDef } from "../scripts/graph/node";
import { Graph } from "../scripts/graph/graph";
import { NodeSocketBase, registerSocketType } from "../scripts/graph/socket";
import type { SocketTypeDef } from "../scripts/graph/socket";
import type { SocketDir } from "../scripts/graph/graph_types";
import { FloatSocket } from "../scripts/graph/sockets_std";
import { ExposedEntry, GroupDef, GroupNode } from "../scripts/graph/group";
import { ConnectOp } from "../scripts/graph/graph_ops";
import { defineGraphAPI } from "../scripts/graph/graph_api";
import { socketAnchor, socketRow } from "../scripts/editors/nodeeditor/nodeframe";
import type { NodeFrame } from "../scripts/editors/nodeeditor/nodeframe";
// The plain import keeps the view module's module-scope internalRegister call;
// a type-only use would let the transpiler elide it.
import "../scripts/editors/nodeeditor/nodegraphview";
import type { NodeGraphView } from "../scripts/editors/nodeeditor/nodegraphview";
import {
  buildForwardedUI,
  buildGroupDesigner,
  exposeMenuTemplate,
  socketTypeMenuTemplate,
} from "../scripts/editors/nodeeditor/groupui";
import { ToolOpDelegate } from "../scripts/editors/nodeeditor/delegate";
import type {
  GraphContext,
  GraphEdit,
  NodeGraphDelegate,
} from "../scripts/editors/nodeeditor/delegate";

/**
 * Drains the toolstack and the microtask continuations a fire-and-forget UI
 * callback leaves behind it — a menu pick or a button press dispatches an edit
 * and repaints once it lands, with no promise the caller can hold.
 */
async function settle(ctx: { toolstack: { idle(): Promise<void> } }): Promise<void> {
  for (let i = 0; i < 4; i++) {
    await ctx.toolstack.idle();
    await Promise.resolve();
  }
}

beforeAll(() => {
  // resolvePath / theme lookups touch window in node.
  (globalThis as unknown as { window: unknown }).window ||= globalThis;

  // the link canvas renders to 2d canvas; happy-dom has no real context.
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

  // no iconsheet <img> elements exist in the test DOM; icon CSS lookups
  // dereference sheet.image.src, so give the sheets a stand-in.
  const sheets = (iconmanager as unknown as { iconsheets: { image: unknown }[] }).iconsheets;
  for (const sheet of sheets) {
    sheet.image ||= { src: "" };
  }
});

// a wire type nothing coerces to or from, so a float drop on it is refused.
class EditStrSocket extends NodeSocketBase<"editstr", string> {
  static socketDef(): SocketTypeDef {
    return { typeName: "EditStrSocket", type: "editstr", uiName: "Str" };
  }

  constructor(dir: SocketDir = "in") {
    super(dir);
    this.defaultProp = new StringProperty("");
  }
}
registerSocketType(EditStrSocket);

class EditSrc extends Node {
  static override graphDef(): NodeDef {
    return {
      typeName: "EditSrc",
      outputs : { value: new FloatSocket("out") },
    };
  }
}
registerNodeType(EditSrc);

class EditMath extends Node {
  static override graphDef(): NodeDef {
    return {
      typeName: "EditMath",
      inputs  : { a: new FloatSocket("in"), b: new FloatSocket("in") },
      outputs : { out: new FloatSocket("out") },
    };
  }
}
registerNodeType(EditMath);

class EditStr extends Node {
  static override graphDef(): NodeDef {
    return {
      typeName: "EditStr",
      inputs  : { s: new EditStrSocket("in") },
    };
  }
}
registerNodeType(EditStr);

class EditBias extends Node {
  static override graphDef(): NodeDef {
    return {
      typeName: "EditBias",
      props   : { bias: new FloatProperty(0.5) },
      outputs : { out: new FloatSocket("out") },
    };
  }
}
registerNodeType(EditBias);

function makeCtx(graph: Graph) {
  const api = new DataAPI();
  const root = new DataStruct();
  root.struct("graph", "graph", "Graph", defineGraphAPI(api));
  api.setRoot(root);

  const ctx: any = { state: {}, graph, api };
  ctx.toLocked = () => ctx;
  ctx.toolstack = new ToolStack(ctx);
  return ctx;
}

function makeView(ctx: unknown): NodeGraphView {
  const view = UIBase.createElement("nodegraphview-x") as NodeGraphView;
  view.ctx = ctx as IContextBase;
  view.checkInit();
  return view;
}

/** The widget-local screen point over a frame's socket terminal. */
function anchorOf(view: NodeGraphView, frame: NodeFrame, dir: "in" | "out", key: string) {
  const row = socketRow(frame.node, dir, key);
  const p = view.panzoom.transform.project(socketAnchor(frame.metrics(), dir, row));
  return [p[0], p[1]] as [number, number];
}

test("a completed link drag issues the ConnectOp through the default delegate", async () => {
  const g = new Graph();
  const src = new EditSrc();
  const m = new EditMath();
  m.pos.loadXY(300, 0);
  g.add(src);
  g.add(m);

  const ctx = makeCtx(g);
  const view = makeView(ctx);
  view.setGraph(g, "graph");
  await settle(ctx);

  const srcFrame = view.frames.get(src.id)!;
  const dstFrame = view.frames.get(m.id)!;

  await settle(ctx);
  expect(view.linkDrag.begin(srcFrame, "value", "out")).toBe(true);
  expect(view.linkDrag.active).toBe(true);

  const drop = anchorOf(view, dstFrame, "in", "a");
  view.linkDrag.update(drop);
  await settle(ctx);
  await view.linkDrag.drop(drop);
  await settle(ctx);

  await settle(ctx);
  expect(view.linkDrag.active).toBe(false);
  expect(m.inputs.a.edges.length).toBe(1);
  expect(m.inputs.a.edges[0]).toBe(src.outputs.value);
  expect(ctx.toolstack.length).toBe(1);
  expect(ctx.toolstack[0]).toBeInstanceOf(ConnectOp);

  await ctx.toolstack.undo();
  await settle(ctx);
  expect(m.inputs.a.edges.length).toBe(0);
});

test("an incompatible drop dims its terminal during the drag and issues nothing", async () => {
  const g = new Graph();
  const src = new EditSrc();
  const str = new EditStr();
  str.pos.loadXY(300, 0);
  g.add(src);
  g.add(str);

  const ctx = makeCtx(g);
  const view = makeView(ctx);
  view.setGraph(g, "graph");

  const srcFrame = view.frames.get(src.id)!;
  const strFrame = view.frames.get(str.id)!;

  view.linkDrag.begin(srcFrame, "value", "out");
  expect(strFrame.terminalDot("s", "in")!.style.opacity).toBe("0.35");

  await view.linkDrag.drop(anchorOf(view, strFrame, "in", "s"));
  expect(strFrame.terminalDot("s", "in")!.style.opacity).toBe("");
  expect(str.inputs.s.edges.length).toBe(0);
  expect(ctx.toolstack.length).toBe(0);
});

test("an installed delegate receives the drop's connect edit and no op issues", async () => {
  const g = new Graph();
  const src = new EditSrc();
  const m = new EditMath();
  m.pos.loadXY(300, 0);
  g.add(src);
  g.add(m);

  const ctx = makeCtx(g);
  const view = makeView(ctx);
  view.setGraph(g, "graph");

  const received: GraphEdit[] = [];
  const testDelegate: NodeGraphDelegate = {
    check  : () => ({ ok: true }),
    perform: async (_ctx, edit) => {
      received.push(edit);
    },
  };
  view.delegate = testDelegate;

  view.linkDrag.begin(view.frames.get(src.id)!, "value", "out");
  await view.linkDrag.drop(anchorOf(view, view.frames.get(m.id)!, "in", "a"));

  expect(received).toEqual([
    {
      kind     : "connect",
      graphPath: "graph",
      srcNode  : src.id,
      srcSocket: "value",
      dstNode  : m.id,
      dstSocket: "a",
    },
  ]);
  expect(m.inputs.a.edges.length).toBe(0);
  expect(ctx.toolstack.length).toBe(0);
});

test("targets a delegate's check refuses dim for the drag's duration", async () => {
  const g = new Graph();
  const src = new EditSrc();
  const m = new EditMath();
  m.pos.loadXY(300, 0);
  g.add(src);
  g.add(m);

  const ctx = makeCtx(g);
  const view = makeView(ctx);
  view.setGraph(g, "graph");

  view.delegate = {
    check: (_ctx, edit) =>
      edit.kind === "connect" ? { ok: false, reason: "refused" } : { ok: true },
    perform: async () => {},
  };

  const mFrame = view.frames.get(m.id)!;
  view.linkDrag.begin(view.frames.get(src.id)!, "value", "out");
  expect(mFrame.terminalDot("a", "in")!.style.opacity).toBe("0.35");
  expect(mFrame.terminalDot("b", "in")!.style.opacity).toBe("0.35");

  await view.linkDrag.drop(anchorOf(view, mFrame, "in", "a"));
  expect(mFrame.terminalDot("a", "in")!.style.opacity).toBe("");
  expect(m.inputs.a.edges.length).toBe(0);
  expect(ctx.toolstack.length).toBe(0);
});

test("dragging a connected input detaches it: a drop back keeps the link, an empty drop severs it", async () => {
  const g = new Graph();
  const src = new EditSrc();
  const m = new EditMath();
  m.pos.loadXY(300, 0);
  g.add(src);
  g.add(m);
  g.connect(src.outputs.value, m.inputs.a);

  const ctx = makeCtx(g);
  const view = makeView(ctx);
  view.setGraph(g, "graph");
  await settle(ctx);

  const dstFrame = view.frames.get(m.id)!;

  view.linkDrag.begin(dstFrame, "a", "in");
  await settle(ctx);
  await view.linkDrag.drop(anchorOf(view, dstFrame, "in", "a"));
  await settle(ctx);
  expect(m.inputs.a.edges.length).toBe(1);
  expect(ctx.toolstack.length).toBe(0);

  view.linkDrag.begin(dstFrame, "a", "in");
  await settle(ctx);
  await view.linkDrag.drop([-1000, -1000]);
  await settle(ctx);
  expect(m.inputs.a.edges.length).toBe(0);
  expect(ctx.toolstack.length).toBe(1);

  await ctx.toolstack.undo();
  await settle(ctx);
  expect(m.inputs.a.edges.length).toBe(1);
});

test("the add menu lists registered types and instantiates at the drop point in graph coordinates", async () => {
  const g = new Graph();
  const ctx = makeCtx(g);
  const view = makeView(ctx);
  view.setGraph(g, "graph");
  view.panzoom.setTransform(2, [10, 20]);

  const menu = view.openAddMenu([50, 60]);
  const ids = menu.items.map((li) => li._id);
  expect(ids).toContain("EditSrc");
  expect(ids).toContain("EditMath");
  expect(ids).not.toContain("GroupNode");
  expect(ids).not.toContain("GroupInputNode");

  menu._onselect!("EditSrc");
  await settle(ctx);

  const added = g.nodes.find((n) => n.def.typeName === "EditSrc")!;
  expect(added).toBeDefined();
  expect([added.pos[0], added.pos[1]]).toEqual([20, 20]);
  expect(view.frames.get(added.id)).toBeDefined();
  expect(ctx.toolstack.length).toBe(1);
});

test("auto-arrange keeps islands separate and commits as one undo entry", async () => {
  const g = new Graph();
  const a = new EditSrc();
  const b = new EditMath();
  const c = new EditSrc();
  b.pos.loadXY(20, 10);
  c.pos.loadXY(5, 5);
  g.add(a);
  g.add(b);
  g.add(c);
  g.connect(a.outputs.value, b.inputs.a);

  const ctx = makeCtx(g);
  const view = makeView(ctx);
  view.setGraph(g, "graph");
  await settle(ctx);

  const before = [a, b, c].map((n) => [n.pos[0], n.pos[1]]);
  await view.arrangeNodes();
  await settle(ctx);

  await settle(ctx);
  expect(ctx.toolstack.length).toBe(1);

  // islands lay out left to right: {a, b} first, then {c}, gapped apart.
  const rect = (n: Node) => view.frames.get(n.id)!.rect();
  const island1MaxX = Math.max(rect(a).x + rect(a).width, rect(b).x + rect(b).width);
  await settle(ctx);
  expect(island1MaxX).toBeLessThan(rect(c).x);

  await ctx.toolstack.undo();
  await settle(ctx);
  expect([a, b, c].map((n) => [n.pos[0], n.pos[1]])).toEqual(before);
});

/** Every element under root matching selector, shadow roots included, in tree order. */
function deepAll(root: Element, selector: string): HTMLElement[] {
  const out: HTMLElement[] = [];
  const shadowOf = (el: Element) =>
    el.shadowRoot ?? (el as unknown as { shadow?: ShadowRoot }).shadow;
  const walk = (node: ParentNode) => {
    for (const el of node.querySelectorAll<HTMLElement>("*")) {
      if (el.matches(selector)) {
        out.push(el);
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
  return out;
}

/** The first element under root matching selector, shadow roots included. */
function deepOne(root: Element, selector: string): HTMLElement {
  const el = deepAll(root, selector)[0];
  expect(el, selector).toBeDefined();
  return el;
}

/** The path.ux buttons and dropboxes under root, by the name they show. */
function control(root: Element, tag: "button-x" | "dropbox-x", name: string) {
  return deepAll(root, tag).find((el) => el.getAttribute("name") === name);
}

function press(btn: Element | undefined) {
  expect(btn).toBeDefined();
  (btn as unknown as Button).onclick!(undefined as unknown as PointerEvent);
}

/** Picks id from a dropbox's template as its menu would; sub names the submenu holding it. */
function pick(ctx: unknown, dbox: Element | undefined, id: string, sub?: string) {
  expect(dbox).toBeDefined();
  const template = (dbox as unknown as DropBox).template as MenuTemplate;
  const menu = createMenu(ctx as IContextBase, "", template);
  if (sub === undefined) {
    menu._onselect!(id);
    return;
  }
  const submenu = (template as Menu[]).find((m) => m.getAttribute("name") === sub);
  expect(submenu, sub).toBeDefined();
  submenu!._onselect!(id);
}

class RecordingDelegate extends ToolOpDelegate {
  edits: GraphEdit[] = [];

  override async perform(ctx: GraphContext, edit: GraphEdit): Promise<void> {
    this.edits.push(edit);
    await super.perform(ctx, edit);
  }
}

function designerFixture() {
  const def = new GroupDef();
  def.declareInput("a", new FloatSocket("in"));
  def.declareOutput("out", new FloatSocket("out"));
  const inner = new EditBias();
  def.subgraph.add(inner);
  const unresolved = new GroupNode();
  unresolved.ref = "void";
  def.subgraph.add(unresolved);

  def.exposed.push(new ExposedEntry("prop", inner.id, "bias", "Bias"));
  def.exposed.push(new ExposedEntry("prop", unresolved.id, "hidden"));
  def.exposed.push(new ExposedEntry("prop", "no-such-id", "x", "Gone"));

  // The designer edits the definition, so its subgraph is what the path resolves to.
  const ctx = makeCtx(def.subgraph);
  const delegate = new RecordingDelegate();
  const root = document.createElement("div");
  buildGroupDesigner(root, { ctx, def, graphPath: "graph", delegate });
  return { def, inner, ctx, delegate, root };
}

test("the designer lists inputs, outputs and exposed rows; a missing row offers Repoint and nothing else", () => {
  const { root } = designerFixture();

  const boundary = (dir: string) =>
    deepAll(deepOne(root, `.nodeeditor-boundary-${dir}`), ".nodeeditor-boundary-row");
  expect(boundary("in").map((r) => r.dataset.socketKey)).toEqual(["a"]);
  expect(boundary("out").map((r) => r.dataset.socketKey)).toEqual(["out"]);
  const typeLabel = deepOne(boundary("in")[0], ".nodeeditor-boundary-type") as unknown as Label;
  expect(typeLabel.text).toBe("Float");

  const rows = deepAll(root, ".nodeeditor-exposure-row");
  expect(rows.map((r) => r.dataset.exposureIndex)).toEqual(["0", "2"]);
  expect(rows.map((r) => r.dataset.exposureState)).toEqual(["ok", "missing"]);
  const names = rows.map(
    (r) => (deepAll(r, ".nodeeditor-exposure-name")[0] as unknown as Label).text
  );
  expect(names).toEqual(["Bias", "Gone"]);

  const buttonNames = (row: Element) => deepAll(row, "button-x").map((b) => b.getAttribute("name"));
  expect(buttonNames(rows[0])).toEqual(["↑", "↓", "✕"]);
  expect(buttonNames(rows[1])).toEqual(["✕"]);
  expect(control(rows[1], "dropbox-x", "Repoint…")).toBeDefined();
  expect(control(rows[0], "dropbox-x", "Repoint…")).toBeUndefined();

  // Every control says what it does.
  for (const el of deepAll(root, "button-x, dropbox-x")) {
    expect((el as unknown as UIBase).description, el.getAttribute("name")!).toBeTruthy();
  }
});

test("the designer's reorder, remove and repoint controls dispatch the matching edits", async () => {
  const { def, inner, ctx, delegate, root } = designerFixture();
  const rows = () => deepAll(root, ".nodeeditor-exposure-row");

  press(control(rows()[0], "button-x", "↓"));
  await settle(ctx);
  expect(delegate.edits.at(-1)).toEqual({
    kind     : "reorderEntry",
    graphPath: "graph",
    from     : 0,
    to       : 1,
  });
  expect(def.exposed[1].label).toBe("Bias");

  // The re-rendered list follows the new order.
  expect(rows().map((r) => r.dataset.exposureIndex)).toEqual(["1", "2"]);

  pick(ctx, control(rows()[1], "dropbox-x", "Repoint…"), "bias", "EditBias");
  await settle(ctx);
  expect(delegate.edits.at(-1)).toEqual({
    kind     : "repointEntry",
    graphPath: "graph",
    index    : 2,
    nodeId   : inner.id,
    propKey  : "bias",
  });
  expect(rows().map((r) => r.dataset.exposureState)).toEqual(["ok", "ok"]);

  press(control(rows()[1], "button-x", "✕"));
  await settle(ctx);
  expect(delegate.edits.at(-1)).toEqual({ kind: "removeEntry", graphPath: "graph", index: 2 });
  expect(def.exposed.length).toBe(2);

  press(control(deepOne(root, ".nodeeditor-boundary-in"), "button-x", "✕"));
  await settle(ctx);
  expect(delegate.edits.at(-1)).toEqual({
    kind     : "removeBoundary",
    graphPath: "graph",
    dir      : "in",
    key      : "a",
  });
  expect(Object.keys(def.inputs)).toEqual([]);

  // Each edit is an op on the stack; undo restores the last one.
  expect(ctx.toolstack.length).toBe(4);
  await ctx.toolstack.undo();
  expect(Object.keys(def.inputs)).toEqual(["a"]);
});

test("the add-input control picks a socket type, then names it; a refusal shows beneath the box", async () => {
  const { def, ctx, delegate, root } = designerFixture();
  const addRow = () => deepAll(root, ".nodeeditor-add-socket[data-dir='in']")[0];

  expect(deepAll(addRow(), ".nodeeditor-add-socket-name").length).toBe(0);
  pick(ctx, control(addRow(), "dropbox-x", "Add input…"), "FloatSocket");
  await settle(ctx);

  const nameRow = deepAll(addRow(), ".nodeeditor-add-socket-name")[0];
  expect(nameRow).toBeDefined();
  const box = deepAll(nameRow, "textbox-x")[0] as unknown as TextBox;
  expect(box.text).toBe("float");

  // A name already on the boundary is refused, and the refusal is shown.
  box.text = "a";
  press(control(nameRow, "button-x", "Add"));
  await settle(ctx);
  expect(delegate.edits.length).toBe(0);
  const note = deepAll(addRow(), ".nodeeditor-refusal")[0] as unknown as Label;
  expect(note.hidden).toBe(false);
  expect(note.text).toMatch(/a/);
  expect((control(nameRow, "button-x", "Add") as unknown as UIBase).description).toBe(note.text);

  box.text = "gain";
  press(control(nameRow, "button-x", "Add"));
  await settle(ctx);
  expect(delegate.edits.at(-1)).toEqual({
    kind      : "addBoundary",
    graphPath : "graph",
    dir       : "in",
    key       : "gain",
    socketType: "FloatSocket",
  });
  expect(Object.keys(def.inputs)).toEqual(["a", "gain"]);
  expect(
    deepAll(deepOne(root, ".nodeeditor-boundary-in"), ".nodeeditor-boundary-row").map(
      (r) => r.dataset.socketKey
    )
  ).toEqual(["a", "gain"]);
});

test("the expose menu names each inner node's properties and whole node, and never a proxy", () => {
  const { def, inner, ctx } = designerFixture();
  const picked: ExposeRequest[] = [];
  const items = exposeMenuTemplate(ctx, def, (req) => picked.push(req)) as Menu[];

  // The unresolved group is listed under its ref for its whole node; the proxies are not.
  const titles = (menus: Menu[]) => menus.map((m) => m.getAttribute("name"));
  expect(titles(items)).toEqual(["EditBias", "void"]);
  const bias = items[0];
  expect(bias.items.map((li) => li._id)).toEqual(["nodeUI", "bias"]);

  bias._onselect!("bias");
  bias._onselect!("nodeUI");
  expect(picked).toEqual([
    { kind: "prop", nodeId: inner.id, propKey: "bias" },
    { kind: "nodeUI", nodeId: inner.id },
  ]);

  // Repointing a prop entry offers props only.
  const propsOnly = exposeMenuTemplate(ctx, def, () => undefined, "prop") as Menu[];
  expect(titles(propsOnly)).toEqual(["EditBias"]);
  expect(propsOnly[0].items.map((li) => li._id)).toEqual(["bias"]);

  const ids = socketTypeMenuTemplate(() => undefined).map((e) => (e as { id: string }).id);
  expect(ids).toContain("FloatSocket");
  expect(ids).toContain("EditStrSocket");
});

test("a definition edit dispatched against a graph that is no definition is refused", () => {
  const host = new Graph();
  const ctx = makeCtx(host);
  const verdict = new ToolOpDelegate().check(ctx, {
    kind     : "removeEntry",
    graphPath: "graph",
    index    : 0,
  });
  expect(verdict.ok).toBe(false);
  expect(!verdict.ok && verdict.reason).toMatch(/definition/);
});

test("an instance frame gains its forwarded rows when the definition arrives, and follows exposure changes", async () => {
  const def = new GroupDef();
  const inner = new EditBias();
  def.subgraph.add(inner);
  def.exposed.push(new ExposedEntry("prop", inner.id, "bias", "Bias"));

  const host = new Graph();
  const grp = new GroupNode();
  grp.ref = "grp";
  host.add(grp);

  // The frame is built while the instance is still unresolved.
  const ctx = makeCtx(host);
  const view = makeView(ctx);
  view.setGraph(host, "graph");
  await settle(ctx);
  const frame = view.frames.get(grp.id)!;
  const rows = () => deepAll(frame, ".nodeeditor-prop-row").length;
  await settle(ctx);
  expect(rows()).toBe(0);

  host.groupLoader = async (ref) => (ref === "grp" ? def : undefined);
  await host.resolveGroups();
  view.syncGraph();
  await settle(ctx);
  expect(view.frames.get(grp.id)).toBe(frame);
  expect(rows()).toBe(1);

  // A second exposure on the same definition reaches the frame on the next sync.
  const second = new EditBias();
  def.subgraph.add(second);
  await settle(ctx);
  def.exposed.push(new ExposedEntry("prop", second.id, "bias", "More"));
  await settle(ctx);
  await host.resolveGroups();
  view.syncGraph();
  await settle(ctx);
  expect(rows()).toBe(2);

  // An unchanged signature leaves the rows alone.
  const before = deepAll(frame, ".nodeeditor-prop-row");
  view.syncGraph();
  await settle(ctx);
  expect(deepAll(frame, ".nodeeditor-prop-row")).toEqual(before);
});

test("editing a forwarded property on an instance materializes the override", async () => {
  const def = new GroupDef();
  const inner = new EditBias();
  def.subgraph.add(inner);
  def.exposed.push(new ExposedEntry("prop", inner.id, "bias", "Bias"));

  const host = new Graph();
  const grp = new GroupNode();
  grp.ref = "grp";
  host.add(grp);
  host.groupLoader = async (ref) => (ref === "grp" ? def : undefined);
  await host.resolveGroups();

  const ctx = makeCtx(host);
  const root = document.createElement("div");
  buildForwardedUI(root, ctx, grp, `graph.nodes[${JSON.stringify(grp.id)}]`, 0);

  // The row hosts a real prop editor bound to the instance-side value path.
  // A labeled prop is wrapped in its own widget-with-label-x element, which
  // carries its own shadow root, so the datapath widget sits one shadow
  // boundary deeper than the row itself.
  const row = root.querySelector(".nodeeditor-prop-row") as UIBase;
  await settle(ctx);
  expect(row).not.toBeNull();
  const strip = row.shadow.querySelector("widget-with-label-x") as UIBase;
  await settle(ctx);
  expect(strip).not.toBeNull();
  const widget = strip.shadow.querySelector("[datapath]") as UIBase;
  await settle(ctx);
  expect(widget).not.toBeNull();

  const path = widget.getAttribute("datapath")!;
  await settle(ctx);
  expect(path).toBe(
    `graph.nodes[${JSON.stringify(grp.id)}].group` +
      `.nodes[${JSON.stringify(inner.id)}].props['bias'].value`
  );
  await settle(ctx);
  expect(widget.getPathValue(ctx, path)).toBe(0.5);

  // The widget's binding is asserted above; the write goes through the same
  // datapath. (setPathValue would route via the saved-defaults cache, which a
  // bare test ToolStack never initializes.)
  ctx.api.setValue(ctx, path, 0.9);
  await settle(ctx);

  const copy = grp.subgraph.nodeIdMap.get(inner.id)!;
  await settle(ctx);
  expect(copy.props.bias.wasSet).toBe(true);
  expect(copy.props.bias.getValue()).toBe(0.9);

  // the definition's own value stays untouched; only the instance overrode it.
  expect(inner.props.bias.getValue()).toBe(0.5);
  expect(inner.props.bias.wasSet).toBe(false);
});

async function definitionView() {
  const def = new GroupDef();
  def.declareInput("a", new FloatSocket("in"));
  const inner = new EditBias();
  def.subgraph.add(inner);

  const host = new Graph();
  const grp = new GroupNode();
  grp.ref = "grp";
  host.add(grp);
  host.groupLoader = async (ref) => (ref === "grp" ? def : undefined);
  await host.resolveGroups();

  const ctx = makeCtx(host);
  const view = makeView(ctx);
  view.setGraph(host, "graph");
  return { def, inner, grp, ctx, view };
}

test("inside a definition a prop row's context menu exposes the property", async () => {
  const { def, inner, grp, view, ctx } = await definitionView();
  await view.enterDefinition(grp);
  expect(view.currentLevel().kind).toBe("definition");

  const frame = view.frames.get(inner.id)!;
  const row = deepAll(frame, ".nodeeditor-prop-row").find((r) => r.dataset.propKey === "bias");
  expect(row).toBeDefined();

  const spy = vi.spyOn(view, "openPropMenu");
  row!.dispatchEvent(
    new MouseEvent("contextmenu", { bubbles: true, composed: true, cancelable: true })
  );
  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy.mock.calls[0][1]).toBe("bias");

  const menu = spy.mock.results[0].value as Menu;
  expect(menu.items.map((li) => li._id)).toEqual(["expose"]);
  menu._onselect!("expose");
  await settle(ctx);
  expect(def.exposed.map((e) => [e.kind, e.nodeId, e.propKey])).toEqual([
    ["prop", inner.id, "bias"],
  ]);

  // At the root the same gesture opens the node menu instead.
  await view.exitLevel();
  const nodeMenu = vi.spyOn(view as unknown as { _openNodeMenu: () => void }, "_openNodeMenu");
  const rootFrame = view.frames.get(grp.id)!;
  rootFrame.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
  expect(spy).toHaveBeenCalledTimes(1);
  expect(nodeMenu).toHaveBeenCalledTimes(1);
});

test("the proxy frames carry the add-socket row inside a definition and nowhere else", async () => {
  const { def, grp, ctx, view } = await definitionView();
  expect(deepAll(view, ".nodeeditor-add-socket").length).toBe(0);

  await view.enterDefinition(grp);
  const inFrame = view.frames.get(def.inputNode().id)!;
  const addRow = deepAll(inFrame, ".nodeeditor-add-socket[data-dir='in']")[0];
  expect(addRow).toBeDefined();

  pick(ctx, control(addRow, "dropbox-x", "Add input…"), "FloatSocket");
  await settle(ctx);
  const nameRow = deepAll(inFrame, ".nodeeditor-add-socket-name")[0];
  press(control(nameRow, "button-x", "Add"));
  await settle(ctx);
  expect(Object.keys(def.inputs)).toEqual(["a", "float"]);
  expect(Object.keys(def.inputNode().outputs)).toEqual(["a", "float"]);
  expect(ctx.toolstack.length).toBe(1);

  // The frames belong to the level: leaving it rebuilds them without the row.
  await view.exitLevel();
  expect(deepAll(view, ".nodeeditor-add-socket").length).toBe(0);
});
