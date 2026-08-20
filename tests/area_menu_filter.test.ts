import { afterEach, expect, test } from "vitest";
import { EnumProperty } from "../scripts/path-controller/toolsys/toolprop";
import {
  AreaFlags,
  areaclasses,
  getAreaMenuFilter,
  makeAreasEnum,
  setAreaMenuFilter,
  type IAreaConstructor,
} from "../scripts/screen/area_base";

/** The names `makeAreasEnum` offers, as a set — the enum's values are the area names. */
function offered(prop: EnumProperty): Set<string> {
  return new Set(Object.values(prop.values as Record<string, string>));
}

/**
 * A stand-in area class. `makeAreasEnum` only ever calls `define()`, so nothing here needs a DOM
 * — which is the point of testing the filter against `areaclasses` directly rather than through
 * a screen.
 */
function register(areaname: string, flag?: number): void {
  areaclasses[areaname] = {
    define: () => ({
      tagname: `filter-test-${areaname}-x`,
      areaname,
      uiname: `Ui ${areaname}`,
      ...(flag === undefined ? {} : { flag }),
    }),
  } as unknown as IAreaConstructor;
}

register("filt_a");
register("filt_b");
register("filt_hidden", AreaFlags.HIDDEN);

afterEach(() => {
  setAreaMenuFilter(undefined);
});

test("with no filter, everything but HIDDEN is offered", () => {
  const names = offered(makeAreasEnum());
  expect(names.has("filt_a")).toBe(true);
  expect(names.has("filt_b")).toBe(true);
  expect(names.has("filt_hidden")).toBe(false);
});

test("an installed filter narrows the enum", () => {
  setAreaMenuFilter((name) => name !== "filt_b");
  expect(getAreaMenuFilter()).toBeTypeOf("function");

  const names = offered(makeAreasEnum());
  expect(names.has("filt_a")).toBe(true);
  expect(names.has("filt_b")).toBe(false);
});

test("a filtered-out area is still registered and constructible by name", () => {
  setAreaMenuFilter((name) => name !== "filt_b");
  expect(offered(makeAreasEnum()).has("filt_b")).toBe(false);
  // The filter narrows a menu; it does not unregister. This is what lets an application reach an
  // unoffered editor from its own menu entry, and what lets a stored layout naming one restore.
  expect(areaclasses["filt_b"]).toBeDefined();
  expect(areaclasses["filt_b"].define().areaname).toBe("filt_b");
});

test("an explicit argument wins over the installed filter", () => {
  setAreaMenuFilter((name) => name !== "filt_b");
  const names = offered(makeAreasEnum((name) => name !== "filt_a"));
  expect(names.has("filt_a")).toBe(false);
  expect(names.has("filt_b")).toBe(true);
});

test("the filter sees the definition, not just the name", () => {
  setAreaMenuFilter((_name, def) => def.uiname !== "Ui filt_a");
  expect(offered(makeAreasEnum()).has("filt_a")).toBe(false);
});

test("a filter that excludes everything yields an empty enum rather than throwing", () => {
  setAreaMenuFilter(() => false);
  const prop = makeAreasEnum();
  expect(offered(prop).size).toBe(0);
});

test("passing undefined restores offer-everything", () => {
  setAreaMenuFilter(() => false);
  setAreaMenuFilter(undefined);
  expect(getAreaMenuFilter()).toBeUndefined();
  const names = offered(makeAreasEnum());
  expect(names.has("filt_a")).toBe(true);
  expect(names.has("filt_b")).toBe(true);
});
