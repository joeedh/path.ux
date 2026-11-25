import { test, expect, beforeAll, vi } from "vitest";
import { UIBase, iconmanager } from "../scripts/core/ui_base";
import type { Container } from "../scripts/core/ui";
import type { IContextBase } from "../scripts/core/context_base";
import { DataAPI, DataStruct } from "../scripts/path-controller/controller/controller";
import { flushPathNotifications } from "../scripts/path-controller/controller/pathwatch";
import { popModalLight, pushModalLight } from "../scripts/path-controller/util/simple_events";
import { ToolStack } from "../scripts/path-controller/toolsys/toolstack";
import { Vector2 } from "../scripts/path-controller/util/vectormath";
import { FloatProperty } from "../scripts/path-controller/toolsys/toolprop";
import { Node, registerNodeType } from "../scripts/graph/node";
import type { NodeDef } from "../scripts/graph/node";
import { Graph } from "../scripts/graph/graph";
import { FloatSocket } from "../scripts/graph/sockets_std";
import { defineGraphAPI } from "../scripts/graph/graph_api";
// a plain import, so that the widget is registered
import "../scripts/editors/nodeeditor/nodegraphview";
import type { NodeGraphView } from "../scripts/editors/nodeeditor/nodegraphview";
import type { NodeFrame } from "../scripts/editors/nodeeditor/nodeframe";
import { PLACEHOLDER_CLASS } from "../scripts/editors/nodeeditor/editorloader";
import type { EditorLoader } from "../scripts/editors/nodeeditor/editorloader";

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

class LazyNode extends Node {
  static override graphDef(): NodeDef {
    return {
      typeName: "LazyNode",
      inputs  : { a: new FloatSocket("in"), b: new FloatSocket("in") },
      props   : { bias: new FloatProperty(0.5) },
      outputs : { out: new FloatSocket("out") },
    };
  }
}
registerNodeType(LazyNode);

/** How many editors a LazyNode has: both inputs, the output and the prop. */
const ALL = 4;

/** A view of 800 by 600 pixels on a graph of count nodes, 1200 units apart in a row. */
function makeView(count: number) {
  const graph = new Graph();
  const nodes: LazyNode[] = [];
  for (let i = 0; i < count; i++) {
    const node = new LazyNode();
    node.pos[0] = i * 1200;
    graph.add(node);
    nodes.push(node);
  }

  const api = new DataAPI();
  const root = new DataStruct();
  root.struct("graph", "graph", "Graph", defineGraphAPI(api));
  api.setRoot(root);
  const ctx: any = { state: {}, graph, api };
  ctx.toLocked = () => ctx;
  ctx.toolstack = new ToolStack(ctx);

  const view = UIBase.createElement("nodegraphview-x") as NodeGraphView;
  view.lazyEditors = true;
  view.ctx = ctx as IContextBase;
  document.body.appendChild(view);
  view.checkInit();
  view.panzoom.getBoundingClientRect = () => new DOMRect(0, 0, 800, 600);

  const loader = (view as unknown as { _loader: EditorLoader })._loader;
  // the passes run when the test says so, late enough for the transform to count as settled
  loader.request = () => {};
  view.setGraph(graph, "graph");

  const pass = () => {
    for (let i = 0; i < 50; i++) {
      loader.pass(performance.now() + 1000);
    }
  };
  const missing = () => nodes.map((n) => view.frames.get(n.id)!.pendingEditors);
  return { graph, nodes, view, ctx, loader, pass, missing };
}

function placeholders(frame: NodeFrame): HTMLElement[] {
  const body = (frame as unknown as { _body: Container })._body;
  const sel = "." + PLACEHOLDER_CLASS;
  return [
    ...frame.shadow.querySelectorAll<HTMLElement>(sel),
    ...body.shadow.querySelectorAll<HTMLElement>(sel),
  ];
}

/** The slider somewhere below a row. */
function findSlider(elem: UIBase): (UIBase & { value: number }) | undefined {
  if (/numslider/i.test(elem.tagName)) {
    return elem as UIBase & { value: number };
  }
  let found: (UIBase & { value: number }) | undefined;
  elem._forEachChildWidget((n) => {
    found ??= findSlider(n);
  });
  return found;
}

function heightKeys(frame: NodeFrame): string[] {
  const pending = (frame as unknown as { _pending: { heightKey: string }[] })._pending;
  return pending.map((p) => p.heightKey);
}

test("only the frames in and near the view get editors", () => {
  const { nodes, view, pass, missing } = makeView(6);
  expect(missing()).toEqual([ALL, ALL, ALL, ALL, ALL, ALL]);

  view.panzoom.setTransform(1, [0, 0]);
  expect(view.editorsPending()).toBe(ALL);
  pass();
  expect(missing()).toEqual([0, ALL, ALL, ALL, ALL, ALL]);

  // a built editor stays
  view.panzoom.setTransform(1, [-2400, 0]);
  pass();
  expect(missing()).toEqual([0, ALL, 0, ALL, ALL, ALL]);
  expect(placeholders(view.frames.get(nodes[2].id)!)).toEqual([]);

  view.flushEditors();
  expect(missing()).toEqual([0, 0, 0, 0, 0, 0]);
  view.remove();
});

test("nothing is built when zoomed far out, in a modal tool, moving, hidden or detached", () => {
  const { view, loader, pass, missing } = makeView(6);
  const none = [ALL, ALL, ALL, ALL, ALL, ALL];

  view.panzoom.setTransform(0.2, [0, 0]);
  pass();
  expect(missing()).toEqual(none);

  view.panzoom.setTransform(1, [0, 0]);
  loader.pass(performance.now());
  expect(missing()).toEqual(none);

  const modal = pushModalLight({});
  pass();
  expect(missing()).toEqual(none);
  popModalLight(modal);

  view.panzoom.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0);
  pass();
  expect(missing()).toEqual(none);

  view.panzoom.getBoundingClientRect = () => new DOMRect(0, 0, 800, 600);
  HTMLElement.prototype.remove.call(view);
  pass();
  expect(missing()).toEqual(none);

  document.body.appendChild(view);
  pass();
  expect(missing()[0]).toBe(0);
  view.remove();
});

test("frames far outside the view are hidden, except one with a live drag", () => {
  const { nodes, view, loader } = makeView(6);
  const hidden = () => nodes.map((n) => view.frames.get(n.id)!.style.visibility === "hidden");

  view.panzoom.setTransform(1, [0, 0]);
  loader.cull();
  expect(hidden()).toEqual([false, false, true, true, true, true]);

  // the view is 400 either side of its center, so a frame is hidden past 1000 and shown by 800
  view.panzoom.setTransform(1, [-1200, 0]);
  view.frames.get(nodes[0].id)!.previewPos = new Vector2([0, 0]);
  loader.cull();
  expect(hidden()).toEqual([false, false, false, true, true, true]);

  view.frames.get(nodes[0].id)!.previewPos = undefined;
  loader.cull();
  expect(hidden()).toEqual([true, false, false, true, true, true]);

  // between the two limits a frame stays as it is
  view.panzoom.setTransform(1, [-640, 0]);
  loader.cull();
  expect(hidden().slice(0, 2)).toEqual([true, false]);
  view.panzoom.setTransform(1, [0, 0]);
  loader.cull();
  view.panzoom.setTransform(1, [-640, 0]);
  loader.cull();
  expect(hidden().slice(0, 2)).toEqual([false, false]);

  view.panzoom.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0);
  view.panzoom.setTransform(1, [-90000, 0]);
  loader.cull();
  expect(hidden().slice(0, 2)).toEqual([false, false]);
  view.remove();
});

test("the event says when nothing near the view is missing", () => {
  const { view, pass } = makeView(6);
  const loaded = vi.fn();
  view.addEventListener("editorsloaded", loaded);
  pass();
  expect(loaded).toHaveBeenCalledTimes(1);
  pass();
  expect(loaded).toHaveBeenCalledTimes(1);
  view.remove();
});

test("a few added frames, and rows that appear in a loaded frame, are built at once", () => {
  const { graph, nodes, view, pass, missing } = makeView(6);
  pass();

  const added = new LazyNode();
  added.pos[0] = 50000;
  graph.add(added);
  view.syncGraph();
  expect(view.frames.get(added.id)!.pendingEditors).toBe(0);

  graph.connect(added.outputs.out, nodes[0].inputs.a);
  view.syncGraph();
  graph.disconnect(added.outputs.out, nodes[0].inputs.a);
  view.syncGraph();
  expect(missing()[0]).toBe(0);
  expect(placeholders(view.frames.get(nodes[0].id)!)).toEqual([]);
  view.remove();
});

test("a connected input's editor is no longer pending", () => {
  const { graph, nodes, view, missing } = makeView(12);
  for (let i = 1; i < 12; i++) {
    graph.connect(nodes[0].outputs.out, nodes[i].inputs.a);
  }
  view.syncGraph();
  expect(missing()).toEqual(Array(12).fill(ALL - 1));

  view.flushEditors();
  const rows = view.frames
    .get(nodes[3].id)!
    .shadow.querySelectorAll<HTMLElement>(".nodeeditor-prop-row");
  const keys = [...rows].map((e) => e.dataset.propKey as unknown);
  expect(keys).toEqual([nodes[3].outputs.out.nodePropName, nodes[3].inputs.b.nodePropName]);
  view.remove();
});

test("an editor binds to the node that's there when it's built", () => {
  const { graph, nodes, view, ctx } = makeView(6);
  const old = nodes[0];
  graph.remove(old);
  const node = new LazyNode();
  node.id = old.id;
  graph.add(node);
  node.inputs.a.defaultProp.setValue(2.5);
  view.syncGraph();
  view.flushEditors();
  flushPathNotifications();

  const frame = view.frames.get(node.id)!;
  expect(frame.node).toBe(node);
  const key = node.inputs.a.nodePropName as unknown as string;
  const row = [...frame.shadow.querySelectorAll<Container>(".nodeeditor-prop-row")].find(
    (r) => r.dataset.propKey === key
  )!;
  const slider = findSlider(row)!;
  expect(slider.value).toBe(2.5);

  const path = `graph.nodes[${JSON.stringify(node.id)}].props['${key}'].value`;
  ctx.api.setValue(ctx, path, 4);
  flushPathNotifications();
  expect(slider.value).toBe(4);
  view.remove();
});

test("a built editor's height goes to the placeholders of its kind", () => {
  const { nodes, view, loader } = makeView(6);
  loader.learnHeight(heightKeys(view.frames.get(nodes[0].id)!)[0], 57);
  for (const node of nodes) {
    // the sockets and the prop are all plain floats
    const heights = placeholders(view.frames.get(node.id)!).map((p) => p.style.height);
    expect(heights).toEqual(["57px", "57px", "57px", "57px"]);
  }
  view.remove();
});

test("a press on a placeholder moves the node, and a press on an editor doesn't", () => {
  const { nodes, view } = makeView(6);
  const frame = view.frames.get(nodes[0].id)!;
  const started = vi.fn();
  frame.onMoveStart = started;
  const press = (el: Element) =>
    el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true, button: 0 }));

  const found = placeholders(frame);
  const socket = found[0];
  const prop = found[ALL - 1];
  press(socket);
  press(prop);
  expect(started).toHaveBeenCalledTimes(2);

  view.flushEditors();
  press(frame.shadow.querySelector(".nodeeditor-prop-row")!);
  expect(started).toHaveBeenCalledTimes(2);
  view.remove();
});

test("right-click on a placeholder inside a definition offers the same menu as on its row", () => {
  const { nodes, view } = makeView(6);
  const frame = view.frames.get(nodes[0].id)!;
  const level = vi.spyOn(view, "currentLevel");
  level.mockReturnValue({ ...view.currentLevel(), kind: "definition" } as ReturnType<
    typeof view.currentLevel
  >);
  const menu = vi.spyOn(view, "openPropMenu").mockImplementation(() => undefined as never);
  const rightClick = (el: Element) => {
    const opts = { bubbles: true, composed: true, cancelable: true };
    el.dispatchEvent(new MouseEvent("contextmenu", opts));
    return menu.mock.calls.pop()?.[1];
  };

  const keys = placeholders(frame).map(rightClick);
  expect(keys).toContain("bias");
  expect(keys).toContain("in:a");

  view.flushEditors();
  const row = frame.shadow.querySelector('.nodeeditor-prop-row[data-prop-key="bias"]');
  const body = (frame as unknown as { _body: Container })._body;
  const rows = [...body.shadow.querySelectorAll(".nodeeditor-prop-row"), ...(row ? [row] : [])];
  expect(rows.map(rightClick)).toContain("bias");
  view.remove();
});

test("extra UI built late is updated at any depth", () => {
  const { nodes, view } = makeView(6);
  const frame = view.frames.get(nodes[0].id)!;
  const widget = UIBase.createElement("container-x") as Container;
  const flushed = vi.spyOn(widget, "flushUpdate");
  frame.buildExtraUI = (_f, body) => {
    let el: HTMLElement = document.createElement("div");
    body.shadow.appendChild(el);
    for (let i = 0; i < 3; i++) {
      el = el.appendChild(document.createElement("div"));
    }
    el.appendChild(widget);
  };
  frame.extraUI = { heightKey: "extra", rows: 1 };
  frame.rebuildExtraUI();
  expect(widget.isConnected).toBe(false);

  view.flushEditors();
  expect(widget.isConnected).toBe(true);
  expect(flushed).toHaveBeenCalledTimes(1);
  view.remove();
});

test("extra UI built late takes its placeholder's place", () => {
  const { nodes, view } = makeView(6);
  const frame = view.frames.get(nodes[0].id)!;
  const body = (frame as unknown as { _body: Container })._body;
  const extra = [document.createElement("div"), document.createElement("div")];
  frame.buildExtraUI = (_f, body) => body.shadow.append(...extra);
  frame.extraUI = { heightKey: "extra", rows: 1 };
  frame.rebuildExtraUI();
  const last = document.createElement("div");
  body.shadow.append(last);

  view.flushEditors();
  const after = [...body.shadow.children];
  expect(after.slice(after.indexOf(extra[0]))).toEqual([...extra, last]);
  view.remove();
});

test("an update and a pass on a moving view don't measure the frames", () => {
  const { nodes, view, loader } = makeView(6);
  view.panzoom.setTransform(1, [0, 0]);
  // the first update polls the view's watches for the first time
  view.update();
  expect(view.editorsPending()).toBe(ALL);

  const measured = vi.spyOn(view.frames.get(nodes[0].id)!, "outerSize");
  const request = vi.fn();
  loader.request = request;
  view.update();
  expect(request).not.toHaveBeenCalled();
  loader.transformChanged();
  request.mockClear();
  loader.pass();
  expect(measured).not.toHaveBeenCalled();
  view.remove();
});

test("a pass that has to wait is tried again by a timer, and only if it's of use", () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  try {
    const { view, loader } = makeView(6);
    view.panzoom.setTransform(1, [0, 0]);
    const request = vi.fn();
    loader.request = request;

    const keys = pushModalLight({});
    for (let i = 0; i < 10; i++) {
      loader.pass(performance.now() + 1000);
    }
    expect(request).not.toHaveBeenCalled();
    vi.advanceTimersByTime(150);
    expect(request).toHaveBeenCalledTimes(1);

    // not while zoomed out, where nothing is built
    request.mockClear();
    view.panzoom.setTransform(0.2, [0, 0]);
    request.mockClear();
    loader.pass(performance.now() + 1000);
    vi.advanceTimersByTime(1000);
    expect(request).not.toHaveBeenCalled();

    // and not for a view that's gone
    view.panzoom.setTransform(1, [0, 0]);
    loader.pass();
    view.remove();
    request.mockClear();
    vi.advanceTimersByTime(1000);
    expect(request).not.toHaveBeenCalled();
    popModalLight(keys);
  } finally {
    vi.useRealTimers();
  }
});

test("a view that's shown or resized is looked at again", () => {
  const observers: { target: Element | undefined; report: () => void }[] = [];
  class FakeObserver {
    private entry: (typeof observers)[number];
    constructor(report: () => void) {
      this.entry = { target: undefined, report };
      observers.push(this.entry);
    }
    observe(target: Element) {
      this.entry.target = target;
    }
    unobserve() {}
    disconnect() {
      this.entry.target = undefined;
    }
  }
  vi.stubGlobal("ResizeObserver", FakeObserver);
  try {
    const { view, loader } = makeView(2);
    const cancel = vi.spyOn(loader, "cancel");
    const observing = () => observers.filter((o) => o.target === view.panzoom).length;
    const request = vi.fn();
    loader.request = request;
    const observer = observers.find((o) => o.target === view.panzoom);
    expect(observer).toBeDefined();
    observer!.report();
    expect(request).toHaveBeenCalledTimes(1);
    view.lazyEditors = false;
    observer!.report();
    expect(request).toHaveBeenCalledTimes(1);

    HTMLElement.prototype.remove.call(view);
    expect(observing()).toBe(0);
    expect(cancel).toHaveBeenCalledTimes(1);
    document.body.appendChild(view);
    expect(observing()).toBe(1);
    view.remove();
    expect(observing()).toBe(0);
  } finally {
    vi.unstubAllGlobals();
  }
});

test("a link redraw that was pending when the view left happens once it's back", async () => {
  const { view } = makeView(2);
  const internals = view as unknown as { _redrawLinks(): void; _redrawLinksSoon(): void };
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  await frame();
  const redraw = vi.spyOn(internals, "_redrawLinks");

  internals._redrawLinksSoon();
  HTMLElement.prototype.remove.call(view);
  await frame();
  expect(redraw).not.toHaveBeenCalled();

  document.body.appendChild(view);
  await frame();
  expect(redraw).toHaveBeenCalled();
  view.remove();
});

test("without lazyEditors every editor is built by syncGraph", () => {
  const { graph, view, ctx } = makeView(6);
  view.remove();
  const eager = UIBase.createElement("nodegraphview-x") as NodeGraphView;
  eager.ctx = ctx;
  eager.checkInit();
  eager.setGraph(graph, "graph");
  for (const frame of eager.frames.values()) {
    expect(frame.pendingEditors).toBe(0);
    expect(placeholders(frame)).toEqual([]);
  }
});
