/**
 * Simple theme variable system. Intended use:
 *
 *   export const themeVars = {
 *     // comment for font
 *     font: new CSSFont({ size: 12, color: "black" }),
 *     // comment for b
 *     b: 1,
 *     c: 'red',
 *   } as const;
 *
 *   const vars = getVars(themeVars);
 *   export const theme = {
 *     base: {
 *       color : vars.c,
 *       width: vars.b,
 *       font: vars.font,
 *     }
 *   } satisfies ThemeRecordWithVar<VarKeys<typeof vars>>;
 *
 *   // when loading theme
 *   setTheme(instanceThemeVars(theme, themeVars));
 *
 * A variant instances the same theme with different values, e.g.
 * `instanceThemeVars(theme, { ...themeVars, c: 'blue' })`.
 */

import { CSSFont } from "./cssfont";
import { ThemeScrollBars } from "./ui_theme";
import type { ThemeItem } from "./ui_theme";

/** Placeholder standing in for a theme value until `instanceThemeVars` substitutes one. */
export class ThemeVar<Keys extends string, Type extends ThemeItem> {
  key: Keys;

  // does not really exist, for typechecking only
  declare TYPE: Type;

  constructor(key: Keys) {
    this.key = key;
  }
}

/** Declares a theme's variables, each mapped to the value it is instanced with. */
export type ThemeVarsDef = Record<string, ThemeItem>;

export type ThemeVars<VarsDef extends ThemeVarsDef = ThemeVarsDef> = {
  [K in keyof VarsDef & string]: ThemeVar<K, VarsDef[K]>;
};

/** Accepts either a `ThemeVarsDef` or the `ThemeVars` built from it; their keys match. */
export type VarKeys<VarsDef> = keyof VarsDef & string;

export type ThemeItemWithVar<Keys extends string> =
  | ThemeVar<Keys, ThemeItem>
  | ThemeRecordWithVar<Keys>
  | CSSFont
  | string
  | number
  | boolean
  | ThemeScrollBars
  | undefined;
export interface ThemeRecordWithVar<Keys extends string> {
  [k: string]: ThemeItemWithVar<Keys>;
}

/**
 * A theme with each variable replaced by the type of value it stands for.
 * The `CSSFont | ThemeScrollBars` case precedes the object case, which would
 * otherwise map a class instance down to a plain record.
 */
export type Resolved<T> =
  T extends ThemeVar<string, infer Value>
    ? Value
    : T extends CSSFont | ThemeScrollBars
      ? T
      : T extends object
        ? { [K in keyof T]: Resolved<T[K]> }
        : T;

export function getVars<const VarsDef extends ThemeVarsDef>(vars: VarsDef): ThemeVars<VarsDef> {
  const entries = Object.keys(vars).map((key) => [key, new ThemeVar(key)]);
  return Object.fromEntries(entries) as ThemeVars<VarsDef>;
}

/**
 * Builds a theme from `theme`, substituting `vars` for its variables.
 * Neither argument is mutated and the result shares no object with either, so a
 * variable used in several places yields a separate copy at each one.
 */
export function instanceThemeVars<
  VarsDef extends ThemeVarsDef,
  Theme extends ThemeRecordWithVar<VarKeys<VarsDef>>,
>(theme: Theme, vars: VarsDef): Resolved<Theme> {
  return copyRecord(theme, vars, "") as Resolved<Theme>;
}

function copyRecord(rec: ThemeRecordWithVar<string>, vars: ThemeVarsDef, path: string): ThemeItem {
  const ret: Record<string, ThemeItem> = {};

  for (const key in rec) {
    ret[key] = copyItem(rec[key], vars, path ? `${path}.${key}` : key);
  }

  return ret;
}

function copyItem(item: ThemeItemWithVar<string>, vars: ThemeVarsDef, path: string): ThemeItem {
  if (item instanceof ThemeVar) {
    if (!(item.key in vars)) {
      throw new Error(`unknown theme variable "${item.key}" at "${path}"`);
    }

    return copyItem(vars[item.key], vars, path);
  }

  if (item instanceof CSSFont) {
    return item.copy();
  }

  if (item instanceof ThemeScrollBars) {
    return new ThemeScrollBars({ ...item });
  }

  if (Array.isArray(item)) {
    throw new Error(`arrays are not theme values, at "${path}"`);
  }

  if (typeof item === "object" && item !== null) {
    return copyRecord(item, vars, path);
  }

  return item;
}

/** Generates a theme file.  if existingThemeFile is supplied, it will be parsed for var comments */
export function createThemeFile<
  VarsDef extends ThemeVarsDef,
  Theme extends ThemeRecordWithVar<VarKeys<VarsDef>>,
>({
  theme,
  vars,
  existingThemeFile,
  varComments = existingThemeFile ? parseVarComments(existingThemeFile) : undefined,
  importPath = "pathux",
  onAssemble,
}: {
  varComments?: Record<string, string>;
  existingThemeFile?: string;
  theme: Theme;
  vars: VarsDef;
  // module the generated file imports CSSFont, getVars and the rest from
  importPath?: string;
  // note: header always include '//XXX warning: auto-generated file!'
  onAssemble?: (header: string, vars: string, theme: string, footer: string) => string;
}): string {
  onAssemble =
    onAssemble ??
    ((header: string, vars: string, theme: string, footer: string) => {
      return header + vars + theme + footer;
    });

  const items = [...Object.values(vars), ...Object.values(theme)];
  const names = ["getVars", "instanceThemeVars"];

  if (items.some((item) => usesClass(item, CSSFont))) {
    names.push("CSSFont");
  }
  if (items.some((item) => usesClass(item, ThemeScrollBars))) {
    names.push("ThemeScrollBars");
  }

  const header =
    `//XXX warning: auto-generated file!\n\n` +
    `import { ${names.sort().join(", ")} } from ${quote(importPath)};\n` +
    `import type { ThemeRecordWithVar, VarKeys } from ${quote(importPath)};\n\n`;

  const varsSrc = `export const themeVars = ${writeRecord(vars, "", varComments)} as const;\n\n`;

  const themeSrc =
    `const vars = getVars(themeVars);\n\n` +
    `export const theme = ${writeRecord(theme, "")} satisfies ThemeRecordWithVar<VarKeys<typeof vars>>;\n\n`;

  const footer = `export const instancedTheme = instanceThemeVars(theme, themeVars);\n`;

  return onAssemble(header, varsSrc, themeSrc, footer);
}

const KEY_LINE = /^\s*(?:([A-Za-z_$][\w$]*)|"([^"]*)"|'([^']*)')\s*:/;

/**
 * Reads the `//` comments describing each variable in a theme file, keyed by variable name.
 * A comment counts if it sits on the lines above the variable or at the end of its line;
 * one written in both places reads back as the lines above followed by the trailing one.
 * Takes either a generated file or the module the theme was authored in, and reads the
 * block named by the file's own `getVars` call.
 */
export function parseVarComments(themeFile: string): Record<string, string> {
  const comments = {} as Record<string, string>;

  const name = /\bgetVars\s*\(\s*([A-Za-z_$][\w$]*)\s*\)/.exec(themeFile)?.[1] ?? "themeVars";
  const decl = new RegExp(`\\b${name}\\s*(?::[^=]*)?=\\s*\\{`).exec(themeFile);
  if (!decl) {
    return comments;
  }

  const block = readBlock(themeFile, decl.index + decl[0].length - 1);
  let pending: string[] = [];

  for (const { code, comment, depth } of block) {
    const key = KEY_LINE.exec(code);

    if (key && depth === 1) {
      const lines = comment ? [...pending, comment] : pending;
      if (lines.length > 0) {
        comments[key[1] ?? key[2] ?? key[3]!] = lines.join("\n");
      }
    } else if (code.trim() === "" && comment) {
      pending.push(comment);
      continue;
    }

    // anything else between a comment and a variable detaches the two
    pending = [];
  }

  return comments;
}

interface BlockLine {
  /** The line with any `//` comment removed. */
  code: string;
  /** The line's `//` comment, without the slashes. */
  comment: string;
  /** Brace depth the line begins at, counting the literal's own braces as 1. */
  depth: number;
}

/** Each line of the object literal opening at `start`, split into code and comment. */
function readBlock(src: string, start: number): BlockLine[] {
  const lines: BlockLine[] = [];

  let depth = 0;
  let lineDepth = 0;
  let code = "";
  let comment = "";
  let inComment = false;
  let quoteChar = "";

  const pushLine = () => {
    lines.push({ code, comment: comment.trim(), depth: lineDepth });
    code = "";
    comment = "";
    inComment = false;
  };

  for (let i = start; i < src.length; i++) {
    const c = src[i]!;

    if (c === "\n") {
      pushLine();
      lineDepth = depth;
      continue;
    }

    if (inComment) {
      comment += c;
      continue;
    }

    if (quoteChar) {
      code += c;
      if (c === "\\") {
        code += src[++i] ?? "";
      } else if (c === quoteChar) {
        quoteChar = "";
      }
      continue;
    }

    if (c === "/" && src[i + 1] === "/") {
      inComment = true;
      i++;
      continue;
    }

    code += c;

    if (c === '"' || c === "'" || c === "`") {
      quoteChar = c;
    } else if (c === "{" || c === "[" || c === "(") {
      depth++;
    } else if (c === "}" || c === "]" || c === ")") {
      if (--depth === 0) {
        pushLine();
        break;
      }
    }
  }

  return lines;
}

/** Whether `item` is an instance of `cls`, or a record holding one at any depth. */
function usesClass(
  item: ThemeItemWithVar<string>,
  cls: typeof CSSFont | typeof ThemeScrollBars
): boolean {
  if (item instanceof cls) {
    return true;
  }
  if (item instanceof ThemeVar || item instanceof CSSFont || item instanceof ThemeScrollBars) {
    return false;
  }
  if (typeof item !== "object" || item === null) {
    return false;
  }

  return Object.values(item).some((child) => usesClass(child, cls));
}

function writeRecord(
  rec: ThemeRecordWithVar<string>,
  indent: string,
  comments?: Record<string, string>
): string {
  const inner = indent + "  ";
  let out = "{\n";

  for (const key in rec) {
    for (const line of comments?.[key]?.split("\n") ?? []) {
      out += `${inner}//${line ? " " + line : ""}\n`;
    }

    out += `${inner}${writeKey(key)}: ${writeItem(rec[key], inner)},\n`;
  }

  return out + indent + "}";
}

function writeItem(item: ThemeItemWithVar<string>, indent: string): string {
  if (item instanceof ThemeVar) {
    return /^[A-Za-z_$][\w$]*$/.test(item.key) ? `vars.${item.key}` : `vars[${quote(item.key)}]`;
  }

  if (item instanceof CSSFont) {
    return `new CSSFont(${writeArgs(
      {
        size   : item._size,
        font   : item.font,
        style  : item.style,
        weight : item.weight,
        variant: item.variant,
        color  : item.color,
      },
      DEFAULT_FONT
    )})`;
  }

  if (item instanceof ThemeScrollBars) {
    return `new ThemeScrollBars(${writeArgs({
      border  : item.border,
      color   : item.color,
      color2  : item.color2,
      contrast: item.contrast,
      width   : item.width,
    })})`;
  }

  if (Array.isArray(item)) {
    throw new Error("arrays are not theme values");
  }

  if (typeof item === "object" && item !== null) {
    return writeRecord(item, indent);
  }

  return typeof item === "string" ? quote(item) : String(item);
}

const DEFAULT_FONT: Record<string, string | number> = {
  size   : 12,
  font   : "",
  style  : "normal",
  weight : "normal",
  variant: "normal",
  color  : "",
};

/** Constructor arguments on one line, dropping each that the constructor would supply itself. */
function writeArgs(
  args: Record<string, string | number | undefined>,
  defaults: Record<string, string | number> = {}
): string {
  const parts: string[] = [];

  for (const key in args) {
    const val = args[key];
    if (val === undefined || val === defaults[key]) {
      continue;
    }

    parts.push(`${key}: ${typeof val === "string" ? quote(val) : val}`);
  }

  return parts.length > 0 ? `{ ${parts.join(", ")} }` : "{}";
}

function writeKey(key: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? key : quote(key);
}

function quote(str: string): string {
  return JSON.stringify(str);
}
