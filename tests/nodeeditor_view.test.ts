import { test, expect, beforeAll } from "vitest";
import { UIBase, iconmanager } from "../scripts/core/ui_base";
import { Area } from "../scripts/screen/ScreenArea";
import { areaclasses } from "../scripts/screen/area_base";
import type { IContextBase } from "../scripts/core/context_base";
import { DataAPI, DataStruct } from "../scripts/path-controller/controller/controller";
import { ToolStack } from "../scripts/path-controller/toolsys/toolsys";
import { Node, registerNodeType } from "../scripts/graph/node";
import type { NodeDef } from "../scripts/graph/node";
import { Graph } from "../scripts/graph/graph";
import { FloatSocket } from "../scripts/graph/sockets_std";
import { GroupDef, GroupNode } from "../scripts/graph/group";
import { defineGraphAPI } from "../scripts/graph/graph_api";
import { socketAnchor, socketRow } from "../scripts/editors/nodeeditor/nodeframe";
import { NodeGraphView } from "../scripts/editors/nodeeditor/nodegraphview";
import { NodeEditor } from "../scripts/editors/nodeeditor/nodeeditor";
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

class ViewSrc extends Node {
  static override graphDef(): NodeDef {
    return {
      typeName: "ViewSrc",
      outputs : { value: new FloatSocket("out") },
    };
  }
}
registerNodeType(ViewSrc);

class ViewMath extends Node {
  static override graphDef(): NodeDef {
    return {
      typeName: "ViewMath",
      inputs  : { a: new FloatSocket("in"), b: new FloatSocket("in") },
      outputs : { out: new FloatSocket("out") },
    };
  }
}
registerNodeType(ViewMath);

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
  view._init();
  return view;
}

const REFUSAL =
  "a group instance takes value edits only; structural edits belong to the group's definition";

async function makeGroup() {
  const def = new GroupDef();
  const inner = new ViewMath();
  def.subgraph.add(inner);

  const host = new Graph();
  const grp = new GroupNode();
  grp.ref = "grp";
  host.add(grp);
  host.groupLoader = async (ref) => (ref === "grp" ? def : undefined);
  await host.resolveGroups();

  return { def, inner, host, grp };
}

test("a bare NodeGraphView works with no Area and no editor registration", () => {
  const g = new Graph();
  const src = new ViewSrc();
  const m = new ViewMath();
  g.add(src);
  g.add(m);
  g.connect(src.outputs.value, m.inputs.a);

  const view = makeView(makeCtx(g));
  view.setGraph(g, "graph");

  expect(view.frames.size).toBe(2);
  expect(view.frames.get(src.id)!.node).toBe(src);
});

test("refreshGraph reconciles by node id, keeping the frame and selection across a reparse", () => {
  const g1 = new Graph();
  const src1 = new ViewSrc();
  g1.add(src1);

  const view = makeView(makeCtx(g1));
  view.setGraph(g1, "graph");
  const frame = view.frames.get(src1.id)!;
  view.selection.add(src1.id);

  // Stands in for an independent reparse of the same file: same node id, distinct objects
  // throughout, the way `readGraphFile` produces a fresh Graph and Node set each read.
  const g2 = new Graph();
  const src2 = new ViewSrc();
  src2.id = src1.id;
  g2.add(src2);

  view.refreshGraph(g2);

  expect(view.rootGraph).toBe(g2);
  expect(view.frames.get(src1.id)).toBe(frame);
  expect(frame.node).toBe(src2);
  expect(view.selection.has(src1.id)).toBe(true);
});

test("the editor ships unregistered; Area.register makes it reachable", () => {
  // Direct `new` on an undefined custom element throws Illegal constructor on
  // the web platform, so non-registration is asserted rather than constructed
  // around.
  expect(UIBase.getInternalName("node-editor-x")).toBe(undefined);
  expect(areaclasses["node_editor"]).toBe(undefined);
  expect(UIBase.createElement("node-editor-x")).not.toBeInstanceOf(NodeEditor);

  Area.register(NodeEditor);

  expect(areaclasses["node_editor"]).toBe(NodeEditor);
  const ed = UIBase.createElement("node-editor-x") as NodeEditor;
  expect(ed).toBeInstanceOf(NodeEditor);
  expect(ed.view).toBeInstanceOf(NodeGraphView);

  // The custom-element definition is irrevocable; unregister removes only the
  // areaclasses entry, so no other test inherits it.
  Area.unregister(NodeEditor);
  expect(areaclasses["node_editor"]).toBe(undefined);
});

test("frames are created and destroyed as nodes enter and leave the graph", () => {
  const g = new Graph();
  const src = new ViewSrc();
  g.add(src);

  const view = makeView(makeCtx(g));
  view.setGraph(g, "graph");
  expect(view.frames.size).toBe(1);

  const m = new ViewMath();
  g.add(m);
  view.syncGraph();
  expect(view.frames.size).toBe(2);

  const frame = view.frames.get(src.id)!;
  g.remove(src);
  view.syncGraph();
  expect(view.frames.size).toBe(1);
  expect(view.frames.get(src.id)).toBe(undefined);
  expect(frame.parentNode).toBe(null);
});

test("frame positions track node.pos through the transform", () => {
  const g = new Graph();
  const src = new ViewSrc();
  src.pos.loadXY(30, 40);
  g.add(src);

  const view = makeView(makeCtx(g));
  view.setGraph(g, "graph");

  const frame = view.frames.get(src.id)!;
  expect(frame.style.left).toBe("30px");
  expect(frame.style.top).toBe("40px");

  src.pos.loadXY(300, 400);
  view.syncGraph();
  expect(frame.style.left).toBe("300px");
  expect(frame.style.top).toBe("400px");

  // Frames sit in graph space; the pan/zoom content's CSS matrix maps them to
  // the screen, so a transform change moves the projection, not the styles.
  view.panzoom.setTransform(2, [10, 20]);
  expect(frame.style.left).toBe("300px");
  const p = view.panzoom.transform.project([300, 400]);
  expect([p[0], p[1]]).toEqual([610, 820]);
});

test("socketAnchor lands on the frame edge at the socket's row", () => {
  const m = { x: 100, y: 50, width: 140, headerHeight: 24, socketRowHeight: 20 };

  expect(socketAnchor(m, "in", 0)).toEqual([100, 84]);
  expect(socketAnchor(m, "in", 1)).toEqual([100, 104]);
  expect(socketAnchor(m, "out", 0)).toEqual([240, 84]);

  // A row carrying an inline editor is taller, and the rows after it shift down.
  const tall = { ...m, rowHeights: [40, 20] };
  expect(socketAnchor(tall, "in", 0)).toEqual([100, 94]);
  expect(socketAnchor(tall, "in", 1)).toEqual([100, 124]);

  // Every socket owns a row: the outputs first, then the inputs.
  const node = new ViewMath();
  expect(socketRow(node, "out", "out")).toBe(0);
  expect(socketRow(node, "in", "a")).toBe(1);
  expect(socketRow(node, "in", "b")).toBe(2);
  expect(socketRow(node, "in", "missing")).toBe(-1);
});

test("the breadcrumb reflects descent and returns", async () => {
  const { host, grp, inner } = await makeGroup();
  const view = makeView(makeCtx(host));
  view.setGraph(host, "graph");

  const crumbs = () => [...view.shadow.querySelectorAll("button")].map((b) => b.textContent);
  expect(crumbs()).toEqual(["Root"]);
  expect(view.currentGraph).toBe(host);
  expect(view.currentGraphPath).toBe("graph");

  view.descendInto(grp);
  expect(view.currentGraph).toBe(grp.subgraph);
  expect(view.currentGraphPath).toBe(`graph.nodes[${JSON.stringify(grp.id)}].group`);
  expect(crumbs()).toEqual(["Root", grp.getUIName()]);
  expect(view.frames.get(inner.id)).toBeDefined();

  const note = [...view.shadow.querySelectorAll("span")].find((s) => s.textContent === "read-only");
  expect(note).toBeDefined();

  view.shadow.querySelectorAll("button")[0].click();
  expect(view.currentGraph).toBe(host);
  expect(crumbs()).toEqual(["Root"]);
});

test("a structural gesture inside a descended instance is refused through check", async () => {
  const { host, grp, inner } = await makeGroup();
  const ctx = makeCtx(host);
  const view = makeView(ctx);
  view.setGraph(host, "graph");
  view.descendInto(grp);

  const copy = grp.subgraph.nodeIdMap.get(inner.id)!;
  const frame = view.frames.get(copy.id)!;

  const verdict = view.delegate.check(ctx, {
    kind     : "moveNode",
    graphPath: view.currentGraphPath,
    nodeId   : copy.id,
    x        : 50,
    y        : 60,
  });
  expect(verdict).toEqual({ ok: false, reason: REFUSAL });

  const before = [copy.pos[0], copy.pos[1]];
  frame.onMoveCommit!([{ frame, x: 50, y: 60 }]);
  expect([copy.pos[0], copy.pos[1]]).toEqual(before);
  expect(ctx.toolstack.length).toBe(0);
});

test("a move commits through the default delegate as the MoveNodeOp", () => {
  const g = new Graph();
  const src = new ViewSrc();
  g.add(src);

  const ctx = makeCtx(g);
  const view = makeView(ctx);
  view.setGraph(g, "graph");

  const frame = view.frames.get(src.id)!;
  frame.onMoveCommit!([{ frame, x: 50, y: 60 }]);

  expect([src.pos[0], src.pos[1]]).toEqual([50, 60]);
  expect(frame.style.left).toBe("50px");

  ctx.toolstack.undo();
  expect([src.pos[0], src.pos[1]]).toEqual([0, 0]);
});

test("an installed delegate receives the move and no op issues", () => {
  const g = new Graph();
  const src = new ViewSrc();
  g.add(src);

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

  const frame = view.frames.get(src.id)!;
  frame.onMoveCommit!([{ frame, x: 50, y: 60 }]);

  expect(received).toEqual([
    { kind: "moveNode", graphPath: "graph", nodeId: src.id, x: 50, y: 60 },
  ]);
  expect([src.pos[0], src.pos[1]]).toEqual([0, 0]);
  expect(ctx.toolstack.length).toBe(0);
});

test("a group move commits as one moveNodes edit, undoable in a single step", () => {
  const g = new Graph();
  const a = new ViewSrc();
  const b = new ViewSrc();
  b.pos.loadXY(100, 0);
  g.add(a);
  g.add(b);

  const ctx = makeCtx(g);
  const view = makeView(ctx);
  view.setGraph(g, "graph");

  const frameA = view.frames.get(a.id)!;
  const frameB = view.frames.get(b.id)!;
  frameA.onMoveCommit!([
    { frame: frameA, x: 10, y: 20 },
    { frame: frameB, x: 110, y: 20 },
  ]);

  expect([a.pos[0], a.pos[1]]).toEqual([10, 20]);
  expect([b.pos[0], b.pos[1]]).toEqual([110, 20]);
  expect(ctx.toolstack.length).toBe(1);

  ctx.toolstack.undo();
  expect([a.pos[0], a.pos[1]]).toEqual([0, 0]);
  expect([b.pos[0], b.pos[1]]).toEqual([100, 0]);
});

test("a press on a selected node keeps the selection; a click without a drag collapses it", () => {
  const g = new Graph();
  const a = new ViewSrc();
  const b = new ViewSrc();
  g.add(a);
  g.add(b);

  const view = makeView(makeCtx(g));
  view.setGraph(g, "graph");

  const frameA = view.frames.get(a.id)!;
  const frameB = view.frames.get(b.id)!;

  frameA.onSelect!(frameA, { shiftKey: false } as PointerEvent);
  frameB.onSelect!(frameB, { shiftKey: true } as PointerEvent);
  expect([...view.selection].sort()).toEqual([a.id, b.id].sort());

  // The press that would start a drag leaves both selected.
  frameA.onSelect!(frameA, { shiftKey: false } as PointerEvent);
  expect(view.selection.size).toBe(2);

  // Releasing without a drag makes it an ordinary click.
  frameA.onMoveClick!(frameA);
  expect([...view.selection]).toEqual([a.id]);
});

test("a shift press on a selected node defers the deselect until the release", () => {
  const g = new Graph();
  const a = new ViewSrc();
  g.add(a);

  const view = makeView(makeCtx(g));
  view.setGraph(g, "graph");

  const frame = view.frames.get(a.id)!;
  frame.onSelect!(frame, { shiftKey: false } as PointerEvent);
  frame.onSelect!(frame, { shiftKey: true } as PointerEvent);
  expect(view.selection.has(a.id)).toBe(true);

  frame.onMoveClick!(frame);
  expect(view.selection.has(a.id)).toBe(false);
});

test("a link is selectable and delete severs it", async () => {
  const g = new Graph();
  const src = new ViewSrc();
  const m = new ViewMath();
  m.pos.loadXY(300, 0);
  g.add(src);
  g.add(m);
  g.connect(src.outputs.value, m.inputs.a);

  const ctx = makeCtx(g);
  const view = makeView(ctx);
  view.setGraph(g, "graph");

  const ref = {
    srcNode  : src.id,
    srcSocket: "value",
    dstNode  : m.id,
    dstSocket: "a",
  };
  expect(view.selectedLinks()).toEqual([]);

  view.selectLink(ref);
  expect(view.selectedLinks()).toEqual([ref]);

  await view.deleteSelected();
  expect(m.inputs.a.edges.length).toBe(0);
  expect(ctx.toolstack.length).toBe(1);

  ctx.toolstack.undo();
  expect(m.inputs.a.edges.length).toBe(1);
});

test("duplicateSelected groups every duplicate into one undo step", async () => {
  const g = new Graph();
  const a = new ViewSrc();
  const b = new ViewSrc();
  b.pos.loadXY(100, 0);
  g.add(a);
  g.add(b);

  const ctx = makeCtx(g);
  const view = makeView(ctx);
  view.setGraph(g, "graph");

  view.selection.add(a.id);
  view.selection.add(b.id);
  const before = new Set(g.nodes.map((n) => n.id));

  await view.duplicateSelected();

  expect(g.nodes.length).toBe(4);
  expect(ctx.toolstack.length).toBe(1);

  const newIds = g.nodes.map((n) => n.id).filter((id) => !before.has(id));
  expect([...view.selection].sort()).toEqual(newIds.sort());

  ctx.toolstack.undo();
  expect(g.nodes.length).toBe(2);
});

test("duplicateSelected selects the new nodes before undoStepEnd runs, not after", async () => {
  const g = new Graph();
  const a = new ViewSrc();
  const b = new ViewSrc();
  b.pos.loadXY(100, 0);
  g.add(a);
  g.add(b);

  const ctx = makeCtx(g);
  const view = makeView(ctx);
  view.setGraph(g, "graph");

  view.selection.add(a.id);
  view.selection.add(b.id);
  const before = new Set(g.nodes.map((n) => n.id));

  // Models the production delegate (GenGraphEditor's), whose perform() writes the graph
  // synchronously — unlike the default ToolOpDelegate, which defers its own writes into
  // undoStepEnd. The selection must be set by the time undoStepEnd starts, since that step is
  // a slow checkpoint round trip in production and must not gate the highlight the writes
  // already made visible.
  let selectionAtEnd: string[] | undefined;
  const testDelegate: NodeGraphDelegate = {
    undoStepBegin: async () => {},
    check  : () => ({ ok: true }),
    perform: (_performCtx, edit) => {
      if (edit.kind === "duplicateNode") {
        g.add(new ViewSrc());
      }
    },
    undoStepEnd: async () => {
      selectionAtEnd = [...view.selection].sort();
    },
  };
  view.delegate = testDelegate;

  await view.duplicateSelected();

  const newIds = g.nodes
    .map((n) => n.id)
    .filter((id) => !before.has(id))
    .sort();
  expect(newIds.length).toBe(2);
  expect(selectionAtEnd).toEqual(newIds);
});

test("singleUndoStep awaits the delegate's async undoStepBegin/undoStepEnd, passing the given labels", async () => {
  const g = new Graph();
  const ctx = makeCtx(g);
  const view = makeView(ctx);
  view.setGraph(g, "graph");

  const calls: string[] = [];
  const testDelegate: NodeGraphDelegate = {
    undoStepBegin: async (_ctx, shortLabel, message) => {
      await Promise.resolve();
      calls.push(`begin:${shortLabel}:${message}`);
    },
    check  : () => ({ ok: true }),
    perform: () => {},
    undoStepEnd: async () => {
      await Promise.resolve();
      calls.push("end");
    },
  };
  view.delegate = testDelegate;

  const result = await view.singleUndoStep(() => {
    calls.push("cb");
    return 42;
  }, "Label", "A test message");

  expect(result).toBe(42);
  expect(calls).toEqual(["begin:Label:A test message", "cb", "end"]);
});

test("singleUndoStep still runs undoStepEnd, and rejects, when cb throws", async () => {
  const g = new Graph();
  const ctx = makeCtx(g);
  const view = makeView(ctx);
  view.setGraph(g, "graph");

  const calls: string[] = [];
  const testDelegate: NodeGraphDelegate = {
    undoStepBegin: async () => {
      calls.push("begin");
    },
    check  : () => ({ ok: true }),
    perform: () => {},
    undoStepEnd: async () => {
      calls.push("end");
    },
  };
  view.delegate = testDelegate;

  await expect(
    view.singleUndoStep(() => {
      calls.push("cb");
      throw new Error("boom");
    })
  ).rejects.toThrow("boom");

  expect(calls).toEqual(["begin", "cb", "end"]);
});

test("selecting a link drops the node selection, and a vanished link leaves it", () => {
  const g = new Graph();
  const src = new ViewSrc();
  const m = new ViewMath();
  g.add(src);
  g.add(m);
  g.connect(src.outputs.value, m.inputs.a);

  const view = makeView(makeCtx(g));
  view.setGraph(g, "graph");

  const frame = view.frames.get(src.id)!;
  frame.onSelect!(frame, { shiftKey: false } as PointerEvent);
  expect(view.selection.size).toBe(1);

  const ref = { srcNode: src.id, srcSocket: "value", dstNode: m.id, dstSocket: "a" };
  view.selectLink(ref);
  expect(view.selection.size).toBe(0);
  expect(view.linkSelection.size).toBe(1);

  g.disconnect(src.outputs.value, m.inputs.a);
  view.syncGraph();
  expect(view.linkSelection.size).toBe(0);
});
