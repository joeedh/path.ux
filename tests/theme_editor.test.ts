import { test, expect } from "vitest";

import { CSSFont } from "../scripts/core/cssfont";
import { BoxBorder, ThemeScrollBars } from "../scripts/core/ui_theme";
import type { ThemeRecord } from "../scripts/core/ui_theme";
import { themeItemKind, groupThemeCategories } from "../scripts/widgets/theme_editor";

test("themeItemKind skips flag keys whatever their value", () => {
  expect(themeItemKind("someFlag", 1)).toBe("skip");
  expect(themeItemKind("FLAGS", "red")).toBe("skip");
  expect(themeItemKind("internalFlags", { a: 1 })).toBe("skip");
});

test("themeItemKind separates colors from plain strings", () => {
  expect(themeItemKind("a", "red")).toBe("color");
  expect(themeItemKind("a", "#ff00ff")).toBe("color");
  expect(themeItemKind("a", "rgb(1,2,3)")).toBe("color");
  expect(themeItemKind("a", "rgba(1, 2, 3, 0.5)")).toBe("color");
  expect(themeItemKind("a", "  RED  ")).toBe("color");

  expect(themeItemKind("a", "solid")).toBe("string");
  expect(themeItemKind("a", "unset")).toBe("string");
  expect(themeItemKind("a", "")).toBe("string");
});

test("themeItemKind classifies the remaining theme value types", () => {
  expect(themeItemKind("a", 12)).toBe("number");
  expect(themeItemKind("a", true)).toBe("boolean");
  expect(themeItemKind("a", new CSSFont())).toBe("font");
  expect(themeItemKind("a", { b: 1 })).toBe("record");
  expect(themeItemKind("a", new BoxBorder({}))).toBe("boxborder");
  expect(themeItemKind("a", new ThemeScrollBars({}))).toBe("scrollbars");
  expect(themeItemKind("a", undefined)).toBe("skip");
});

const rec: ThemeRecord = {
  button  : { width: 1 },
  Zebra   : { width: 1 },
  checkbox: { width: 1 },
  label   : { width: 1 },
};

test("groupThemeCategories defaults each key to its own category", () => {
  const groups = groupThemeCategories(rec, {});

  expect(groups.map((g) => g.category)).toEqual(["button", "checkbox", "label", "Zebra"]);
  expect(groups.every((g) => g.keys.length === 1)).toBe(true);
  expect(groups[0].keys[0]).toEqual({ category: "button", help: "", key: "button" });
});

test("groupThemeCategories expands a bare category name into a CatKey", () => {
  const groups = groupThemeCategories(rec, { button: "Widgets" });
  const widgets = groups.find((g) => g.category === "Widgets");

  expect(widgets?.keys).toEqual([{ category: "Widgets", help: "", key: "button" }]);
});

test("groupThemeCategories fills an empty key from the theme key", () => {
  const groups = groupThemeCategories(rec, {
    button: { category: "Widgets", help: "how buttons look", key: "" },
  });

  expect(groups.find((g) => g.category === "Widgets")?.keys).toEqual([
    { category: "Widgets", help: "how buttons look", key: "button" },
  ]);
});

test("groupThemeCategories groups and sorts case-insensitively", () => {
  const groups = groupThemeCategories(rec, {
    button  : "Widgets",
    checkbox: "Widgets",
    Zebra   : "Widgets",
  });

  expect(groups.map((g) => g.category)).toEqual(["label", "Widgets"]);
  expect(groups[1].keys.map((k) => k.key)).toEqual(["button", "checkbox", "Zebra"]);
});

test("groupThemeCategories does not mutate the categoryMap it is given", () => {
  const map = { button: { category: "Widgets", help: "", key: "" } };
  groupThemeCategories(rec, map);

  expect(map.button.key).toBe("");
});
