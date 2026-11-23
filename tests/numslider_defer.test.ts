import { test, expect, beforeAll, afterAll, afterEach } from "vitest";
import { iconmanager } from "../scripts/core/ui_base";
import "../scripts/pathux";
import { NumSlider } from "../scripts/widgets/ui_numsliders";

let fills = 0;

/** Stands in for ResizeObserver; tests deliver its callbacks by hand. */
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  observed = new Set<Element>();

  constructor(public callback: (entries: ResizeObserverEntry[]) => void) {
    FakeResizeObserver.instances.push(this);
  }

  observe(target: Element) {
    this.observed.add(target);
  }

  unobserve(target: Element) {
    this.observed.delete(target);
  }

  disconnect() {
    this.observed.clear();
  }
}

/** The fake observer watching `target`, if any. */
function observerOf(target: Element) {
  return FakeResizeObserver.instances.find((ro) => ro.observed.has(target));
}

/** Delivers one resize callback for the given canvases at the given size. */
function resize(targets: Element[], width: number, height: number) {
  const ro = observerOf(targets[0]!);
  expect(ro).toBeDefined();
  const entries = targets.map(
    (target) => ({ target, contentRect: { width, height } }) as unknown as ResizeObserverEntry
  );
  ro!.callback(entries);
}

const savedRO = globalThis.ResizeObserver;

beforeAll(() => {
  // resolvePath / theme lookups touch window in node
  (globalThis as unknown as { window: unknown }).window ||= globalThis;

  // happy-dom has no 2d context; this one counts fills
  const proto = HTMLCanvasElement.prototype as unknown as {
    getContext(kind: string): unknown;
  };
  proto.getContext = () =>
    new Proxy(
      {},
      {
        get: (_t, key) => {
          if (key === "measureText") return () => ({ width: 10 });
          if (key === "fill") return () => fills++;
          return () => undefined;
        },
        set: () => true,
      }
    );

  const sheets = (iconmanager as unknown as { iconsheets: { image: unknown }[] }).iconsheets;
  for (const sheet of sheets) {
    sheet.image ||= { src: "" };
  }

  globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
  NumSlider.deferDrawsToLayout = true;
});

afterAll(() => {
  globalThis.ResizeObserver = savedRO;
  NumSlider.deferDrawsToLayout = undefined;
});

afterEach(() => {
  document.body.innerHTML = "";
  fills = 0;
});

function makeSlider(connect = true) {
  const slider = document.createElement("numslider-x") as NumSlider;
  if (connect) {
    document.body.appendChild(slider);
  }
  slider.checkInit();
  fills = 0;
  return slider;
}

test("a connected slider draws only once its canvas is laid out", () => {
  const slider = makeSlider();

  slider._redraw();
  slider._redraw();
  expect(fills).toBe(0);
  expect(slider._drawPending).toBe(true);

  //Chromium's initial callback for a canvas without layout is 0x0
  resize([slider.dom], 0, 0);
  expect(fills).toBe(0);

  resize([slider.dom], 200, 20);
  expect(fills).toBeGreaterThan(0);
  expect(slider._drawPending).toBe(false);

  //once laid out, redraws are immediate
  fills = 0;
  slider._redraw();
  expect(fills).toBeGreaterThan(0);
});

test("hiding a slider defers its draws again until it is shown", () => {
  const slider = makeSlider();
  slider._redraw();
  resize([slider.dom], 200, 20);

  resize([slider.dom], 0, 0);
  fills = 0;
  slider._redraw();
  expect(fills).toBe(0);

  resize([slider.dom], 200, 20);
  expect(fills).toBeGreaterThan(0);
});

test("a slider that isn't connected draws immediately", () => {
  const slider = makeSlider(false);
  slider._redraw();
  expect(fills).toBeGreaterThan(0);
  expect(slider._drawPending).toBe(false);
});

test("one failing deferred draw doesn't stop the others", () => {
  const a = makeSlider();
  const b = makeSlider();
  a._redraw();
  b._redraw();

  a._redraw = () => {
    throw new Error("draw failed");
  };
  const errors: unknown[] = [];
  const savedError = console.error;
  console.error = (e: unknown) => errors.push(e);
  try {
    resize([a.dom, b.dom], 200, 20);
  } finally {
    console.error = savedError;
  }

  expect(errors.length).toBe(1);
  expect(b._drawPending).toBe(false);
  expect(fills).toBeGreaterThan(0);
});

test("a slider removed with a draw pending draws once it is reconnected", () => {
  const slider = makeSlider();
  slider._redraw();
  expect(observerOf(slider.dom)).toBeDefined();

  slider.remove();
  expect(observerOf(slider.dom)).toBeUndefined();
  expect(slider._drawPending).toBe(true);
  expect(fills).toBe(0);

  document.body.appendChild(slider);
  resize([slider.dom], 200, 20);
  expect(fills).toBeGreaterThan(0);
  expect(slider._drawPending).toBe(false);
});

test("a laid out slider that is removed is unobserved and defers again when reconnected", () => {
  const slider = makeSlider();
  slider._redraw();
  resize([slider.dom], 200, 20);

  slider.remove();
  expect(observerOf(slider.dom)).toBeUndefined();

  //nothing is pending, so there is nothing to watch for
  document.body.appendChild(slider);
  expect(observerOf(slider.dom)).toBeUndefined();

  fills = 0;
  slider._redraw();
  expect(fills).toBe(0);
  resize([slider.dom], 200, 20);
  expect(fills).toBeGreaterThan(0);
});

test("a draw while removed clears the pending one", () => {
  const slider = makeSlider();
  slider._redraw();
  slider.remove();

  slider._redraw();
  expect(fills).toBeGreaterThan(0);
  expect(slider._drawPending).toBe(false);

  document.body.appendChild(slider);
  expect(observerOf(slider.dom)).toBeUndefined();
});

test("without an override, deferral is off until an observer has reported layout", () => {
  NumSlider.deferDrawsToLayout = undefined;
  try {
    const drawsAtOnce = () => {
      const slider = makeSlider();
      slider._redraw();
      return fills > 0;
    };

    //an environment whose observer never calls back, or reports no layout
    expect(drawsAtOnce()).toBe(true);
    expect(drawsAtOnce()).toBe(true);
    resize([document.documentElement], 0, 0);
    expect(drawsAtOnce()).toBe(true);

    //an empty page has no height
    resize([document.documentElement], 1024, 0);
    expect(drawsAtOnce()).toBe(false);
    expect(observerOf(document.documentElement)).toBeUndefined();
  } finally {
    NumSlider.deferDrawsToLayout = true;
  }
});
