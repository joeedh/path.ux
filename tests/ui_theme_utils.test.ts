import { test, expect } from "vitest";
import { rmSync, writeFileSync } from "fs";

import { CSSFont } from "../scripts/core/cssfont";
import { ThemeScrollBars } from "../scripts/core/ui_theme";
import {
  addVar,
  bindSlot,
  copyThemeItem,
  createThemeFile,
  deleteItemAt,
  deleteVar,
  getVars,
  hasItemAt,
  instanceThemeVars,
  itemAt,
  parseVarComments,
  renameVar,
  setItemAt,
  ThemeVar,
  toLivePath,
  unbindSlot,
  varSlots,
  type ThemeRecordWithVar,
  type ThemeVarsDef,
  type VarKeys,
} from "../scripts/core/ui_theme_utils";
import type { ThemeItem, ThemeRecord } from "../scripts/core/ui_theme";

const themeVars = {
  font: new CSSFont({ size: 12, color: "black" }),
  b   : 1,
  c   : "red",
} as const;

const vars = getVars(themeVars);

const theme = {
  base: {
    color: vars.c,
    width: vars.b,
    font : vars.font,
  },
  button: {
    font: vars.font,
  },
} satisfies ThemeRecordWithVar<VarKeys<typeof vars>>;

test("getVars builds one placeholder per key", () => {
  expect(Object.keys(vars).sort()).toEqual(["b", "c", "font"]);
  expect(vars.c).toBeInstanceOf(ThemeVar);
  expect(vars.c.key).toBe("c");
});

test("instanceThemeVars substitutes values", () => {
  const out = instanceThemeVars(theme, themeVars);

  expect(out.base.color).toBe("red");
  expect(out.base.width).toBe(1);
  expect(out.base.font.color).toBe("black");
});

test("a variant instances the same theme with different values", () => {
  const out = instanceThemeVars(theme, { ...themeVars, c: "blue" });

  expect(out.base.color).toBe("blue");
  // the first instancing is unaffected, and the theme still holds its variables
  expect(instanceThemeVars(theme, themeVars).base.color).toBe("red");
  expect(theme.base.color).toBe(vars.c);
});

test("nothing is shared with either argument", () => {
  const out = instanceThemeVars(theme, themeVars);

  expect(out.base.font).not.toBe(themeVars.font);
  expect(out.base.font).not.toBe(out.button.font);
  expect(out.base).not.toBe(theme.base);
});

test("scrollbar records are rebuilt rather than referenced", () => {
  const bars = new ThemeScrollBars({ color: "red", width: 10 });
  const out = instanceThemeVars({ base: { scrollbars: bars } }, {});

  expect(out.base.scrollbars).toBeInstanceOf(ThemeScrollBars);
  expect(out.base.scrollbars).not.toBe(bars);
  expect(out.base.scrollbars).toMatchObject({ color: "red", width: 10 });
});

test("a variable from another set is rejected by key", () => {
  const other = getVars({ z: "green" });

  // @ts-expect-error "z" is not a key of themeVars
  const bad: ThemeRecordWithVar<VarKeys<typeof vars>> = { base: { color: other.z } };
  expect(bad).toBeTruthy();
});

test("an unknown variable throws, naming the key and where it was used", () => {
  // the key check above is what stops this, so reaching the runtime guard needs a cast
  const nope = new ThemeVar("nope") as unknown as ThemeVar<VarKeys<typeof vars>, string>;
  const stray = { base: { color: nope } };

  expect(() => instanceThemeVars(stray, themeVars)).toThrow(/"nope".*"base\.color"/);
});

const barsVars = {
  font     : new CSSFont({ size: 14, color: "black", weight: "bold" }),
  bars     : new ThemeScrollBars({ color: "red", width: 10 }),
  c        : "red",
  "odd-key": 2,
} as const;

const barVars = getVars(barsVars);

const barsTheme = {
  base: {
    color             : barVars.c,
    "background-color": "white",
    width             : barVars["odd-key"],
    scrollbars        : barVars.bars,
    disabled          : { font: barVars.font },
  },
} satisfies ThemeRecordWithVar<VarKeys<typeof barsVars>>;

const comments = { font: "the body font", c: "accent\nused everywhere" };

test("createThemeFile emits variables, comments and vars references", () => {
  const src = createThemeFile({ theme: barsTheme, vars: barsVars, varComments: comments });

  expect(src).toContain("//XXX warning: auto-generated file!");
  expect(src).toContain(
    'import { CSSFont, ThemeScrollBars, getVars, instanceThemeVars } from "pathux";'
  );
  expect(src).toContain("  // the body font\n  font: new CSSFont(");
  expect(src).toContain(`  // accent\n  // used everywhere\n  c: "red",`);
  // a variable reads back as a reference, not as the value it currently holds
  expect(src).toContain("color: vars.c,");
  expect(src).toContain('width: vars["odd-key"],');
  expect(src).toContain('"background-color": "white",');
  expect(src).toContain("scrollbars: vars.bars,");
});

test("constructor calls carry only the fields that differ from the defaults", () => {
  const src = createThemeFile({ theme: barsTheme, vars: barsVars });

  expect(src).toContain('font: new CSSFont({ size: 14, weight: "bold", color: "black" }),');
  expect(src).toContain('bars: new ThemeScrollBars({ color: "red", width: 10 }),');
});

test("comments round-trip through the generated file", () => {
  const src = createThemeFile({ theme: barsTheme, vars: barsVars, varComments: comments });
  const again = createThemeFile({ theme: barsTheme, vars: barsVars, existingThemeFile: src });

  expect(parseVarComments(src)).toEqual(comments);
  // a regeneration recovers them from the file rather than being handed them again
  expect(parseVarComments(again)).toEqual(comments);
  // and reproduces the file it read them from
  expect(again).toBe(src);
});

// The dynamic import transforms the whole pathux barrel, which outgrows the default 5s timeout.
test(
  "the generated file evaluates back to the theme it was written from",
  { timeout: 30000 },
  async () => {
    const src = createThemeFile({
      theme      : barsTheme,
      vars       : barsVars,
      varComments: comments,
      importPath : "../scripts/pathux",
    });

    const path = "tests/__roundtrip_theme.ts";
    writeFileSync(path, src);

    try {
      // the specifier is hidden from vite's import analysis, which runs before the file exists
      const spec = ["./", "__roundtrip_theme"].join("");
      const mod = (await import(/* @vite-ignore */ spec)) as {
        themeVars: unknown;
        theme: unknown;
        instancedTheme: unknown;
      };

      expect(mod.themeVars).toStrictEqual(barsVars);
      expect(mod.theme).toStrictEqual(barsTheme);
      expect(mod.instancedTheme).toStrictEqual(instanceThemeVars(barsTheme, barsVars));
    } finally {
      rmSync(path, { force: true });
    }
  }
);

test("comments are read from a hand-authored theme module too", () => {
  const src = [
    'import { CSSFont, getVars } from "pathux";',
    "",
    "export const myVars = {",
    "  // a comment for font",
    '  font: new CSSFont({ size: 12, color: "black" }),',
    "  b: 1, // the border width",
    "",
    "  // detached by a blank line, so not a comment for c",
    "",
    '  c: "red",',
    "};",
    "",
    "const vars = getVars(myVars);",
    "export const theme = {",
    "  base: {",
    "    // not a variable comment",
    "    color: vars.c,",
    "  },",
    "};",
  ].join("\n");

  expect(parseVarComments(src)).toEqual({
    font: "a comment for font",
    b   : "the border width",
  });
});

test("a variable commented in both places reads back as the lines above then the trailing one", () => {
  const src = [
    "export const themeVars = {",
    "  // the body font",
    "  // sized in points",
    "  font: new CSSFont({ size: 12 }), // and the trailing half",
    '  url: "http://example.com/a//b", // slashes inside a string are not a comment',
    '  plain: "red",',
    "};",
    "",
    "const vars = getVars(themeVars);",
  ].join("\n");

  expect(parseVarComments(src)).toEqual({
    font: "the body font\nsized in points\nand the trailing half",
    url : "slashes inside a string are not a comment",
  });
});

function editable(): {
  varTheme: ThemeRecordWithVar<string>;
  vars: ThemeVarsDef;
} {
  return {
    vars: {
      accent: "red",
      radius: 6,
      body  : new CSSFont({ size: 14, color: "black" }),
    },
    varTheme: {
      base: {
        BoxBG          : new ThemeVar("accent"),
        "border-radius": new ThemeVar("radius"),
        DefaultText    : new ThemeVar("body"),
        disabled       : { DefaultText: new ThemeVar("body") },
      },
      button: {
        BoxHighlight: new ThemeVar("accent"),
        padding     : 4,
      },
    },
  };
}

test("itemAt and hasItemAt separate an undefined value from a missing key", () => {
  const rec: ThemeRecordWithVar<string> = { base: { blank: undefined } };

  expect(itemAt(rec, ["base", "blank"])).toBe(undefined);
  expect(itemAt(rec, ["base", "nope"])).toBe(undefined);
  expect(hasItemAt(rec, ["base", "blank"])).toBe(true);
  expect(hasItemAt(rec, ["base", "nope"])).toBe(false);
  expect(hasItemAt(rec, ["nope", "deeper"])).toBe(false);
});

test("setItemAt creates the records the walk needs", () => {
  const rec: ThemeRecordWithVar<string> = {};

  setItemAt(rec, ["listbox", "width"], 12);
  expect(rec).toEqual({ listbox: { width: 12 } });

  deleteItemAt(rec, ["listbox", "width"]);
  expect(hasItemAt(rec, ["listbox", "width"])).toBe(false);
  expect(hasItemAt(rec, ["listbox"])).toBe(true);
});

test("setItemAt refuses __proto__ anywhere in the path", () => {
  const rec: ThemeRecordWithVar<string> = {};

  expect(() => setItemAt(rec, ["base", "__proto__"], 1)).toThrow(/__proto__/);
  expect(() => setItemAt(rec, ["__proto__", "x"], 1)).toThrow(/__proto__/);
});

test("setItemAt keeps a ThemeScrollBars intermediate rather than replacing it", () => {
  const bars = new ThemeScrollBars({ color: "red", width: 10 });
  const rec: ThemeRecordWithVar<string> = { base: { scrollbars: bars } };

  setItemAt(rec, ["base", "scrollbars", "color"], "blue");

  expect(itemAt(rec, ["base", "scrollbars"])).toBe(bars);
  expect(bars.color).toBe("blue");
});

test("setItemAt builds a missing intermediate from the live object's constructor", () => {
  const live: ThemeRecord = {
    base: { scrollbars: new ThemeScrollBars({ color: "red", width: 10 }) },
  };
  const rec: ThemeRecordWithVar<string> = {};

  setItemAt(rec, ["base", "scrollbars", "color"], "blue", live);

  const made = itemAt(rec, ["base", "scrollbars"]);
  expect(made).toBeInstanceOf(ThemeScrollBars);
  // seeded from the live values, so setTheme's by-reference assign keeps the rest
  expect(made).toMatchObject({ color: "blue", width: 10 });
});

test("setItemAt seeds a created sub-record but not a created style class", () => {
  const live: ThemeRecord = {
    base: { padding: 4, disabled: { padding: 2, "background-color": "grey" } },
  };
  const rec: ThemeRecordWithVar<string> = {};

  setItemAt(rec, ["base", "disabled", "padding"], 9, live);

  expect(itemAt(rec, ["base", "disabled"])).toEqual({ padding: 9, "background-color": "grey" });
  // the style class itself is merged key by key, so it carries only what was set
  expect(Object.keys(itemAt(rec, ["base"]) as object)).toEqual(["disabled"]);
});

test("toLivePath applies compatMap to the key inside a style class", () => {
  expect(toLivePath(["base", "BoxBG"])).toEqual(["base", "background"]);
  expect(toLivePath(["base", "BoxSubBG"])).toEqual(["base", "background-color"]);
  expect(toLivePath(["base", "disabled", "BoxBG"])).toEqual(["base", "disabled", "BoxBG"]);
  expect(toLivePath(["BoxBG"])).toEqual(["BoxBG"]);
});

test("varSlots finds every reference, with its live path", () => {
  const { varTheme } = editable();

  expect(varSlots(varTheme, "accent")).toEqual([
    { varPath: ["base", "BoxBG"], livePath: ["base", "background"] },
    { varPath: ["button", "BoxHighlight"], livePath: ["button", "BoxHighlight"] },
  ]);
  expect(varSlots(varTheme, "body").map((s) => s.varPath)).toEqual([
    ["base", "DefaultText"],
    ["base", "disabled", "DefaultText"],
  ]);
  expect(varSlots(varTheme, "nope")).toEqual([]);
});

test("bindSlot and unbindSlot are inverses, and detaching copies the value", () => {
  const { varTheme, vars } = editable();

  bindSlot(varTheme, ["button", "padding"], "radius");
  expect(varSlots(varTheme, "radius")).toHaveLength(2);

  const value = unbindSlot(varTheme, vars, ["button", "padding"]);
  expect(value).toBe(6);
  expect(itemAt(varTheme, ["button", "padding"])).toBe(6);

  bindSlot(varTheme, ["button", "font"], "body");
  const font = unbindSlot(varTheme, vars, ["button", "font"]);
  expect(font).toBeInstanceOf(CSSFont);
  expect(font).not.toBe(vars.body);
});

test("unbindSlot refuses a slot that is not bound", () => {
  const { varTheme, vars } = editable();

  expect(() => unbindSlot(varTheme, vars, ["button", "padding"])).toThrow(/not bound/);
});

test("addVar trims, and refuses an empty, duplicate or newline-bearing name", () => {
  const vars: ThemeVarsDef = {};

  expect(addVar(vars, "  accent  ", "red")).toBe("accent");
  expect(vars.accent).toBe("red");

  expect(() => addVar(vars, "   ", "red")).toThrow(/needs a name/);
  expect(() => addVar(vars, "accent", "blue")).toThrow(/already exists/);
  expect(() => addVar(vars, "a\nb", "blue")).toThrow(/newline/);
  expect(() => addVar(vars, "__proto__", "blue")).toThrow(/__proto__/);

  // a non-identifier name is fine; the writer quotes it
  expect(addVar(vars, "odd-key", 2)).toBe("odd-key");
});

test("deleting a variable inlines an independent copy at every reference", () => {
  const { varTheme, vars } = editable();

  const slots = deleteVar(varTheme, vars, "body");

  expect(slots).toHaveLength(2);
  expect("body" in vars).toBe(false);

  const a = itemAt(varTheme, ["base", "DefaultText"]);
  const b = itemAt(varTheme, ["base", "disabled", "DefaultText"]);
  expect(a).toBeInstanceOf(CSSFont);
  expect(a).not.toBe(b);
  expect((a as CSSFont).color).toBe("black");

  // nothing on screen moves, and the theme still instances
  const out = instanceThemeVars(varTheme, vars) as ThemeRecord;
  expect(((out.base as ThemeRecord).DefaultText as CSSFont).color).toBe("black");
});

test("deleteVar refuses a variable that does not exist", () => {
  const { varTheme, vars } = editable();

  expect(() => deleteVar(varTheme, vars, "nope")).toThrow(/no such/);
});

test("renameVar moves every reference, the value and the comment", () => {
  const { varTheme, vars } = editable();
  const comments = { accent: "the accent color", radius: "corner rounding" };

  expect(renameVar(varTheme, vars, comments, "accent", " highlight ")).toBe("highlight");

  expect(varSlots(varTheme, "accent")).toEqual([]);
  expect(varSlots(varTheme, "highlight")).toHaveLength(2);
  expect(vars.highlight).toBe("red");
  expect("accent" in vars).toBe(false);
  expect(comments).toEqual({ highlight: "the accent color", radius: "corner rounding" });

  // the variables keep their authored order
  expect(Object.keys(vars)).toEqual(["highlight", "radius", "body"]);
});

test("renameVar refuses a collision and leaves everything alone", () => {
  const { varTheme, vars } = editable();

  expect(() => renameVar(varTheme, vars, {}, "accent", "radius")).toThrow(/already exists/);
  expect(varSlots(varTheme, "accent")).toHaveLength(2);
  expect(vars.radius).toBe(6);
});

test("copyThemeItem resolves a variable and shares nothing with it", () => {
  const vars: ThemeVarsDef = { body: new CSSFont({ size: 14 }) };
  const copy = copyThemeItem(new ThemeVar("body"), vars) as CSSFont;

  expect(copy).toBeInstanceOf(CSSFont);
  expect(copy).not.toBe(vars.body);
  expect(copy.size).toBe(14);

  const plain: ThemeItem = { a: 1 };
  expect(copyThemeItem(plain)).not.toBe(plain);
});

test("onAssemble receives the four blocks in order", () => {
  const seen: string[] = [];
  const src = createThemeFile({
    theme     : barsTheme,
    vars      : barsVars,
    onAssemble: (header, varsSrc, themeSrc, footer) => {
      seen.push(header, varsSrc, themeSrc, footer);
      return footer;
    },
  });

  expect(seen).toHaveLength(4);
  expect(seen[0]).toContain("auto-generated");
  expect(seen[1]).toContain("export const themeVars");
  expect(seen[2]).toContain("export const theme");
  expect(src).toBe(seen[3]);
});
