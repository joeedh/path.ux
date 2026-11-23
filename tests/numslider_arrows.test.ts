import { test, expect, beforeAll, afterEach, vi } from "vitest";
import { iconmanager } from "../scripts/core/ui_base";
import "../scripts/pathux";
import type { NumSlider } from "../scripts/widgets/ui_numsliders";

/** One fill() call: its fillStyle and the x of the path's first moveTo. */
interface Fill {
  style: unknown;
  x: number;
}

let fills: Fill[] = [];

beforeAll(() => {
  // resolvePath / theme lookups touch window in node
  (globalThis as unknown as { window: unknown }).window ||= globalThis;

  // happy-dom has no 2d context; this one records each fill and where its path started
  const proto = HTMLCanvasElement.prototype as unknown as {
    getContext(kind: string): unknown;
  };
  proto.getContext = () => {
    const state: Record<string | symbol, unknown> = {};
    let pathX = NaN;
    return new Proxy(state, {
      get: (t, key) => {
        if (key === "measureText") return () => ({ width: 10 });
        if (key === "beginPath") return () => (pathX = NaN);
        if (key === "moveTo") return (x: number) => (pathX = isNaN(pathX) ? x : pathX);
        if (key === "fill") return () => fills.push({ style: t.fillStyle, x: pathX });
        if (key in t) return t[key];
        return () => undefined;
      },
      set: (t, key, value) => {
        t[key] = value;
        return true;
      },
    });
  };

  const sheets = (iconmanager as unknown as { iconsheets: { image: unknown }[] }).iconsheets;
  for (const sheet of sheets) {
    sheet.image ||= { src: "" };
  }
});

afterEach(() => {
  document.body.innerHTML = "";
  fills = [];
});

function makeSlider() {
  const slider = document.createElement("numslider-x") as NumSlider;
  document.body.appendChild(slider);
  //attaches the pointer listeners
  slider.checkInit();
  slider.setValue(0.5);
  const rect = vi.fn(() => ({
    x     : 0,
    y     : 0,
    width : 200,
    height: 20,
    left  : 0,
    top   : 0,
    right : 200,
    bottom: 20,
  }));
  slider.getBoundingClientRect = rect as unknown as typeof slider.getBoundingClientRect;
  return { slider, rect };
}

function pointer(type: string, x: number) {
  const e = new PointerEvent(type, { clientX: x, clientY: 10 });
  //happy-dom has no x/y aliases, which setMpos reads
  Object.defineProperties(e, { x: { value: x }, y: { value: 10 } });
  return e;
}

function hover(slider: NumSlider, x: number) {
  slider.dispatchEvent(pointer("pointerover", x));
  slider.dispatchEvent(pointer("pointermove", x));
}

/** Redraws and returns the left and right arrows' fill styles. */
function arrowStyles(slider: NumSlider) {
  fills = [];
  slider._redraw();
  //_redraw insets the arrows 7px from the canvas edges
  const d = 7;
  const w = slider.dom.width;
  const left = fills.find((f) => f.x === d);
  const right = fills.find((f) => f.x === w - d);
  expect(left).toBeDefined();
  expect(right).toBeDefined();
  return [left!.style, right!.style];
}

test("hovering an arrow highlights only that arrow", () => {
  const { slider } = makeSlider();

  hover(slider, 100);
  const [base, base2] = arrowStyles(slider);
  expect(base).toBe(base2);

  hover(slider, 2);
  const [left, right] = arrowStyles(slider);
  expect(left).not.toBe(base);
  expect(right).toBe(base);

  hover(slider, 198);
  const [left2, right2] = arrowStyles(slider);
  expect(left2).toBe(base);
  expect(right2).toBe(left);
});

test("_redraw does not read layout", () => {
  const { slider, rect } = makeSlider();
  hover(slider, 2);
  rect.mockClear();
  slider._redraw();
  expect(rect).not.toHaveBeenCalled();
});
