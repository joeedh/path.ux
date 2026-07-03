import { DataAPI } from "../scripts/path-controller/controller/controller";
import * as nstructjs from "../scripts/path-controller/util/nstructjs";
import { test, expect } from "vitest";

test("getStructByName resolves the explicit name passed to mapStruct", () => {
  const api = new DataAPI();

  class Widget {
    size = 1;
  }

  const def = api.mapStruct(Widget, true, "ExplicitWidget");
  def.float("size", "size", "Size");

  expect(api.getStructByName("ExplicitWidget")).toBe(def);
  // same DataStruct as the class-keyed lookup
  expect(api.getStructByName("ExplicitWidget")).toBe(api.getStruct(Widget));
  expect(def.name).toBe("ExplicitWidget");
});

test("getStructByName resolves the nstructjs registered name (mangle-proof)", () => {
  const api = new DataAPI();

  // Simulate a bundler-mangled constructor name: the JS `name` is `a`, but the
  // nstructjs registration carries the real, unmangled name as a string literal.
  class a {
    static STRUCT = nstructjs.inlineRegister(a, "RealBrush {\n}");
    radius = 2;
  }

  const def = api.mapStruct(a);
  def.float("radius", "radius", "Radius");

  expect((a as unknown as { structName: string }).structName).toBe("RealBrush");
  expect(api.getStructByName("RealBrush")).toBe(def);
  expect(api.getStructByName("RealBrush")).toBe(api.getStruct(a));
  expect(def.name).toBe("RealBrush");
});

test("getStructByName returns undefined for unknown names", () => {
  const api = new DataAPI();
  expect(api.getStructByName("DoesNotExist")).toBe(undefined);
});

test("duplicate explicit names alias the first registration", () => {
  const api = new DataAPI();

  class First {
    x = 0;
  }
  class Second {
    y = 0;
  }

  const first = api.mapStruct(First, true, "Dup");
  // Re-mapping the same explicit name intentionally reuses the existing
  // struct (needed for SavedToolDefaults re-registration) rather than
  // creating a shadow duplicate.
  const second = api.mapStruct(Second, true, "Dup");

  expect(second).toBe(first);
  expect(api.getStructByName("Dup")).toBe(first);
  expect(api.getStruct(Second)).toBe(first);
});
