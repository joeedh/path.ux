import { test, expect, beforeAll } from "vitest";
import { PanZoomTransform } from "../scripts/widgets/ui_panzoom";

beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window ||= globalThis;
});

test("zooming about a cursor point keeps that point fixed", () => {
  const t = new PanZoomTransform();
  t.panBy(30, -10);
  t.setScale(1.7, [0, 0]);

  const cursor = [120, 85] as const;
  const under = t.unproject(cursor);

  t.zoomBy(1.5, cursor);
  const after = t.project(under);
  expect(after[0]).toBeCloseTo(cursor[0], 6);
  expect(after[1]).toBeCloseTo(cursor[1], 6);

  t.zoomBy(0.25, cursor);
  const after2 = t.project(under);
  expect(after2[0]).toBeCloseTo(cursor[0], 6);
  expect(after2[1]).toBeCloseTo(cursor[1], 6);
});

test("pans and zooms compose", () => {
  const a = new PanZoomTransform();
  a.panBy(5, 7).panBy(-2, 11);

  const b = new PanZoomTransform();
  b.panBy(3, 18);
  expect(a.pan[0]).toBeCloseTo(b.pan[0], 6);
  expect(a.pan[1]).toBeCloseTo(b.pan[1], 6);

  const center = [40, 60] as const;
  const c = new PanZoomTransform();
  c.zoomBy(1.5, center).zoomBy(2, center);

  const d = new PanZoomTransform();
  d.zoomBy(3, center);
  expect(c.scale).toBeCloseTo(d.scale, 6);
  expect(c.pan[0]).toBeCloseTo(d.pan[0], 6);
  expect(c.pan[1]).toBeCloseTo(d.pan[1], 6);
});

test("project and unproject invert each other", () => {
  const t = new PanZoomTransform();
  t.zoomBy(2.5, [33, -14]);
  t.panBy(-120, 45);

  for (const p of [
    [0, 0],
    [17, -3],
    [-250, 999],
  ] as const) {
    const round = t.unproject(t.project(p));
    expect(round[0]).toBeCloseTo(p[0], 6);
    expect(round[1]).toBeCloseTo(p[1], 6);

    const round2 = t.project(t.unproject(p));
    expect(round2[0]).toBeCloseTo(p[0], 6);
    expect(round2[1]).toBeCloseTo(p[1], 6);
  }
});

test("scale clamps at both ends", () => {
  const t = new PanZoomTransform();
  t.minScale = 0.5;
  t.maxScale = 2;

  t.zoomBy(100, [10, 10]);
  expect(t.scale).toBe(2);

  t.zoomBy(1e-6, [10, 10]);
  expect(t.scale).toBe(0.5);

  t.setScale(1.25, [0, 0]);
  expect(t.scale).toBe(1.25);
});

test("zoomToRect fits and centers the rect in the view", () => {
  const t = new PanZoomTransform();
  t.zoomToRect({ x: 10, y: 20, width: 40, height: 40 }, 200, 100);

  expect(t.scale).toBeCloseTo(2.5, 6);

  const center = t.project([30, 40]);
  expect(center[0]).toBeCloseTo(100, 6);
  expect(center[1]).toBeCloseTo(50, 6);

  // Both corners land inside the view.
  const min = t.project([10, 20]);
  const max = t.project([50, 60]);
  expect(min[0]).toBeGreaterThanOrEqual(0);
  expect(min[1]).toBeGreaterThanOrEqual(0);
  expect(max[0]).toBeLessThanOrEqual(200);
  expect(max[1]).toBeLessThanOrEqual(100);
});

test("zoomToRect clamps the fitted scale", () => {
  const t = new PanZoomTransform();
  t.maxScale = 2;
  t.zoomToRect({ x: 0, y: 0, width: 10, height: 10 }, 1000, 1000);
  expect(t.scale).toBe(2);

  // Still centered at the clamped scale.
  const center = t.project([5, 5]);
  expect(center[0]).toBeCloseTo(500, 6);
  expect(center[1]).toBeCloseTo(500, 6);
});
