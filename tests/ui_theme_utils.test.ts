import { test, expect } from "vitest";
import { rmSync, writeFileSync } from "fs";

import { CSSFont } from "../scripts/core/cssfont";
import { ThemeScrollBars } from "../scripts/core/ui_theme";
import {
  createThemeFile,
  getVars,
  instanceThemeVars,
  parseVarComments,
  ThemeVar,
  type ThemeRecordWithVar,
  type VarKeys,
} from "../scripts/core/ui_theme_utils";

const themeVars = {
  font: new CSSFont({ size: 12, color: "black" }),
  b: 1,
  c: "red",
} as const;

const vars = getVars(themeVars);

const theme = {
  base: {
    color: vars.c,
    width: vars.b,
    font: vars.font,
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
  font: new CSSFont({ size: 14, color: "black", weight: "bold" }),
  bars: new ThemeScrollBars({ color: "red", width: 10 }),
  c: "red",
  "odd-key": 2,
} as const;

const barVars = getVars(barsVars);

const barsTheme = {
  base: {
    color: barVars.c,
    "background-color": "white",
    width: barVars["odd-key"],
    scrollbars: barVars.bars,
    disabled: { font: barVars.font },
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

test("the generated file evaluates back to the theme it was written from", async () => {
  const src = createThemeFile({
    theme: barsTheme,
    vars: barsVars,
    varComments: comments,
    importPath: "../scripts/pathux",
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
});

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
    b: "the border width",
  });
});

test("a variable commented in both places reads back as the lines above then the trailing one", () => {
  const src = [
    "export const themeVars = {",
    "  // the body font",
    "  // sized in points",
    '  font: new CSSFont({ size: 12 }), // and the trailing half',
    '  url: "http://example.com/a//b", // slashes inside a string are not a comment',
    '  plain: "red",',
    "};",
    "",
    "const vars = getVars(themeVars);",
  ].join("\n");

  expect(parseVarComments(src)).toEqual({
    font: "the body font\nsized in points\nand the trailing half",
    url: "slashes inside a string are not a comment",
  });
});

test("onAssemble receives the four blocks in order", () => {
  const seen: string[] = [];
  const src = createThemeFile({
    theme: barsTheme,
    vars: barsVars,
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
