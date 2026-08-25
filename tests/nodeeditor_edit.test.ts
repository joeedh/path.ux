import { test, expect, beforeAll } from "vitest";
import { UIBase, iconmanager } from "../scripts/core/ui_base";
import type { IContextBase } from "../scripts/core/context_base";
import { DataAPI, DataStruct } from "../scripts/path-controller/controller/controller";
import { ToolStack } from "../scripts/path-controller/toolsys/toolsys";
import { FloatProperty } from "../scripts/path-controller/toolsys/toolprop";
import { Node, registerNodeType } from "../scripts/graph/node";
import type { NodeDef } from "../scripts/graph/node";
import { Graph } from "../scripts/graph/graph";
import { NodeSocketBase, registerSocketType } from "../scripts/graph/socket";
import type { SocketTypeDef } from "../scripts/graph/socket";
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
import { buildForwardedUI, buildGroupDesigner } from "../scripts/editors/nodeeditor/groupui";
import { ToolOpDelegate } from "../scripts/editors/nodeeditor/delegate";
import type { GraphEdit, NodeGraphDelegate } from "../scripts/editors/nodeeditor/delegate";

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx: any = { state: {}, graph, api };
  ctx.toLocked = () => ctx;
  ctx.toolstack = new ToolStack(ctx);
  return ctx;
}

function makeView(ctx: unknown): NodeGraphView {
  const view = UIBase.createElement("nodegraphview-x") as NodeGraphView;
  view.ctx = ctx as IContextBase;
  view._init();
  return view;
}

/** The widget-local screen point over a frame's socket terminal. */
function anchorOf(view: NodeGraphView, frame: NodeFrame, dir: "in" | "out", key: string) {
  const row = socketRow(frame.node, dir, key);
  const p = view.panzoom.transform.project(socketAnchor(frame.metrics(), dir, row));
  return [p[0], p[1]] as [number, number];
}

test("a completed link drag issues the ConnectOp through the default delegate", () => {
  const g = new Graph();
  const src = new EditSrc();
  const m = new EditMath();
  m.pos.loadXY(300, 0);
  g.add(src);
  g.add(m);

  const ctx = makeCtx(g);
  const view = makeView(ctx);
  view.setGraph(g, "graph");

  const srcFrame = view.frames.get(src.id)!;
  const dstFrame = view.frames.get(m.id)!;

  expect(view.linkDrag.begin(srcFrame, "value", "out")).toBe(true);
  expect(view.linkDrag.active).toBe(true);

  const drop = anchorOf(view, dstFrame, "in", "a");
  view.linkDrag.update(drop);
  view.linkDrag.drop(drop);

  expect(view.linkDrag.active).toBe(false);
  expect(m.inputs.a.edges.length).toBe(1);
  expect(m.inputs.a.edges[0]).toBe(src.outputs.value);
  expect(ctx.toolstack.length).toBe(1);
  expect(ctx.toolstack[0]).toBeInstanceOf(ConnectOp);

  ctx.toolstack.undo();
  expect(m.inputs.a.edges.length).toBe(0);
});

test("an incompatible drop dims its terminal during the drag and issues nothing", () => {
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

  view.linkDrag.drop(anchorOf(view, strFrame, "in", "s"));
  expect(strFrame.terminalDot("s", "in")!.style.opacity).toBe("");
  expect(str.inputs.s.edges.length).toBe(0);
  expect(ctx.toolstack.length).toBe(0);
});

test("an installed delegate receives the drop's connect edit and no op issues", () => {
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
    perform: (_ctx, edit) => {
      received.push(edit);
    },
  };
  view.delegate = testDelegate;

  view.linkDrag.begin(view.frames.get(src.id)!, "value", "out");
  view.linkDrag.drop(anchorOf(view, view.frames.get(m.id)!, "in", "a"));

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

test("targets a delegate's check refuses dim for the drag's duration", () => {
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
    perform: () => {},
  };

  const mFrame = view.frames.get(m.id)!;
  view.linkDrag.begin(view.frames.get(src.id)!, "value", "out");
  expect(mFrame.terminalDot("a", "in")!.style.opacity).toBe("0.35");
  expect(mFrame.terminalDot("b", "in")!.style.opacity).toBe("0.35");

  view.linkDrag.drop(anchorOf(view, mFrame, "in", "a"));
  expect(mFrame.terminalDot("a", "in")!.style.opacity).toBe("");
  expect(m.inputs.a.edges.length).toBe(0);
  expect(ctx.toolstack.length).toBe(0);
});

test("dragging a connected input detaches it: a drop back keeps the link, an empty drop severs it", () => {
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

  const dstFrame = view.frames.get(m.id)!;

  view.linkDrag.begin(dstFrame, "a", "in");
  view.linkDrag.drop(anchorOf(view, dstFrame, "in", "a"));
  expect(m.inputs.a.edges.length).toBe(1);
  expect(ctx.toolstack.length).toBe(0);

  view.linkDrag.begin(dstFrame, "a", "in");
  view.linkDrag.drop([-1000, -1000]);
  expect(m.inputs.a.edges.length).toBe(0);
  expect(ctx.toolstack.length).toBe(1);

  ctx.toolstack.undo();
  expect(m.inputs.a.edges.length).toBe(1);
});

test("the add menu lists registered types and instantiates at the drop point in graph coordinates", () => {
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

  const added = g.nodes.find((n) => n.def.typeName === "EditSrc")!;
  expect(added).toBeDefined();
  expect([added.pos[0], added.pos[1]]).toEqual([20, 20]);
  expect(view.frames.get(added.id)).toBeDefined();
  expect(ctx.toolstack.length).toBe(1);
});

test("auto-arrange keeps islands separate and commits as one undo entry", () => {
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

  const before = [a, b, c].map((n) => [n.pos[0], n.pos[1]]);
  view.arrangeNodes();

  expect(ctx.toolstack.length).toBe(1);

  // islands lay out left to right: {a, b} first, then {c}, gapped apart.
  const rect = (n: Node) => view.frames.get(n.id)!.rect();
  const island1MaxX = Math.max(rect(a).x + rect(a).width, rect(b).x + rect(b).width);
  expect(island1MaxX).toBeLessThan(rect(c).x);

  ctx.toolstack.undo();
  expect([a, b, c].map((n) => [n.pos[0], n.pos[1]])).toEqual(before);
});

test("the exposure list renders in order, skips unresolved, flags missing, and repoint preserves position", () => {
  const def = new GroupDef();
  const inner = new EditBias();
  def.subgraph.add(inner);
  const unresolved = new GroupNode();
  unresolved.ref = "void";
  def.subgraph.add(unresolved);

  def.exposed.push(new ExposedEntry("prop", inner.id, "bias", "Bias"));
  def.exposed.push(new ExposedEntry("prop", unresolved.id, "hidden"));
  def.exposed.push(new ExposedEntry("prop", "no-such-id", "x", "Gone"));

  const host = new Graph();
  const saved: string[] = [];
  host.groupSaver = async (ref) => {
    saved.push(ref);
  };

  const ctx = makeCtx(host);
  const root = document.createElement("div");
  buildGroupDesigner(root, {
    ctx,
    def,
    ref      : "grp",
    graphPath: "graph",
    delegate : new ToolOpDelegate(),
  });

  const rows = () => [...root.querySelectorAll<HTMLElement>(".nodeeditor-exposure-row")];
  expect(rows().map((r) => r.dataset.exposureIndex)).toEqual(["0", "2"]);
  expect(rows().map((r) => r.dataset.exposureState)).toEqual(["ok", "missing"]);
  expect(rows()[0].querySelector("span")!.textContent).toBe("Bias");
  expect(rows()[1].querySelector("span")!.textContent).toBe("Gone");

  const missingRow = rows()[1];
  const [nodeIdIn, keyIn] = [...missingRow.querySelectorAll("input")];
  nodeIdIn.value = String(inner.id);
  keyIn.value = "bias";
  const repoint = [...missingRow.querySelectorAll("button")].find(
    (btn) => btn.textContent === "Repoint"
  )!;
  repoint.click();

  expect(def.exposed.length).toBe(3);
  expect(def.exposed[2].nodeId).toBe(inner.id);
  expect(def.exposed[2].propKey).toBe("bias");
  expect(saved).toEqual(["grp"]);

  expect(rows().map((r) => r.dataset.exposureIndex)).toEqual(["0", "2"]);
  expect(rows().map((r) => r.dataset.exposureState)).toEqual(["ok", "ok"]);
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
  buildForwardedUI(root, ctx, grp, `graph.nodes[${JSON.stringify(grp.id)}]`);

  // The row hosts a real prop editor bound to the instance-side value path.
  const row = root.querySelector(".nodeeditor-prop-row") as UIBase;
  expect(row).not.toBeNull();
  const widget = row.shadow.querySelector("[datapath]") as UIBase;
  expect(widget).not.toBeNull();

  const path = widget.getAttribute("datapath")!;
  expect(path).toBe(
    `graph.nodes[${JSON.stringify(grp.id)}].group` +
      `.nodes[${JSON.stringify(inner.id)}].props['bias'].value`
  );
  expect(widget.getPathValue(ctx, path)).toBe(0.5);

  // The widget's binding is asserted above; the write goes through the same
  // datapath. (setPathValue would route via the saved-defaults cache, which a
  // bare test ToolStack never initializes.)
  ctx.api.setValue(ctx, path, 0.9);

  const copy = grp.subgraph.nodeIdMap.get(inner.id)!;
  expect(copy.props.bias.wasSet).toBe(true);
  expect(copy.props.bias.getValue()).toBe(0.9);

  // the definition's own value stays untouched; only the instance overrode it.
  expect(inner.props.bias.getValue()).toBe(0.5);
  expect(inner.props.bias.wasSet).toBe(false);
});
