import { DataAPI, DataStruct } from "../scripts/path-controller/controller/controller";
import { suggestPropertyKeys } from "../scripts/path-controller/controller/controller_base";
import { test, expect, beforeAll } from "vitest";

beforeAll(() => {
  // resolvePath touches window.DEBUG; provide a benign global in node.
  (globalThis as unknown as { window: unknown }).window ||= globalThis;
});

function buildApi() {
  class Brush {
    size = 1;
  }
  const api = new DataAPI();
  const root = new DataStruct();
  api.setRoot(root);
  const brushDef = api.mapStruct(Brush);
  brushDef.float("size", "size", "Size");
  brushDef.float("spacing", "spacing", "Spacing");
  root.struct("brush", "brush", "Brush", brushDef);
  return api;
}

test("suggestPropertyKeys ranks near matches and lists available keys", () => {
  const msg = suggestPropertyKeys("siZe", ["size", "spacing", "color"]);
  expect(msg).toContain('did you mean "size"');
  expect(msg).toContain("available:");
  expect(msg).toContain("color");
});

test("resolving a typo'd path records a rich lastResolveError", () => {
  const api = buildApi();
  const ctx = {} as never;

  const ok = api.resolvePath(ctx, "brush.size", true);
  expect(ok?.prop).toBeDefined();
  expect(api.lastResolveError).toBeUndefined();

  const bad = api.resolvePath(ctx, "brush.sized", true);
  expect(bad).toBeUndefined();
  expect(api.lastResolveError).toBeDefined();
  expect(api.lastResolveError).toContain('unknown property "sized"');
  expect(api.lastResolveError).toContain('did you mean "size"');
});
