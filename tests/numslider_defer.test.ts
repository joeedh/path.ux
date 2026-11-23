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

/** Delivers one resize callback for the given canvases at the given size. */
function resize(targets: Element[], width: number, height: number) {
  const ro = FakeResizeObserver.instances[0];
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

test("without an override, deferral is off under happy-dom", () => {
  NumSlider.deferDrawsToLayout = undefined;
  try {
    const slider = makeSlider();
    slider._redraw();
    expect(fills).toBeGreaterThan(0);
  } finally {
    NumSlider.deferDrawsToLayout = true;
  }
});
