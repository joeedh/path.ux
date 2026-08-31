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
import { compatMap, ThemeScrollBars } from "./ui_theme";
import type { ThemeItem, ThemeRecord } from "./ui_theme";

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
    ret[key] = copyThemeItem(rec[key], vars, path ? `${path}.${key}` : key);
  }

  return ret;
}

/**
 * Deep-copies one theme value, resolving any variable it holds against `vars`.
 * The result shares no object with `item`, so two slots on one variable never
 * alias each other.
 */
export function copyThemeItem(
  item: ThemeItemWithVar<string>,
  vars: ThemeVarsDef = {},
  path = ""
): ThemeItem {
  if (item instanceof ThemeVar) {
    if (!(item.key in vars)) {
      throw new Error(`unknown theme variable "${item.key}" at "${path}"`);
    }

    const value = vars[item.key];
    if (value instanceof ThemeVar) {
      throw new Error(`theme variable "${item.key}" stands for another variable, at "${path}"`);
    }

    return copyThemeItem(value, vars, path);
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

/**
 * Deep-copies a theme value, keeping each variable reference as a reference.
 * {@link copyThemeItem} resolves them instead, so an editor that owns an
 * authored record uses this one.
 */
export function copyVarItem(item: ThemeItemWithVar<string>): ThemeItemWithVar<string> {
  if (item instanceof ThemeVar) {
    return new ThemeVar(item.key);
  }

  if (item instanceof CSSFont) {
    return item.copy();
  }

  if (item instanceof ThemeScrollBars) {
    return new ThemeScrollBars({ ...item });
  }

  if (typeof item === "object" && item !== null) {
    const ret: ThemeRecordWithVar<string> = {};

    for (const key in item) {
      if (key !== "__proto__") {
        ret[key] = copyVarItem(item[key]);
      }
    }

    return ret;
  }

  return item;
}

/** A slot's address inside a theme record, one key per level. */
export type ThemePath = string[];

/** One variable reference, at its authored path and the live path it lands on. */
export interface VarSlot {
  varPath: ThemePath;
  livePath: ThemePath;
}

/**
 * Identity of a path, for use as a map key. Real theme keys carry `-` and a
 * user-typed key may carry `.`, so the segments are not joined.
 */
export function pathKey(path: ThemePath): string {
  return JSON.stringify(path);
}

function isWalkable(item: ThemeItemWithVar<string>): item is ThemeRecordWithVar<string> {
  return typeof item === "object" && item !== null && !(item instanceof ThemeVar);
}

/** A sub-record, as opposed to a leaf value or one of the theme's value classes. */
export function isPlainRecord(item: ThemeItemWithVar<string>): item is ThemeRecordWithVar<string> {
  return isWalkable(item) && !(item instanceof CSSFont) && !(item instanceof ThemeScrollBars);
}

/** The value at `path`, or `undefined` when any step of the walk is missing. */
export function itemAt(rec: ThemeRecordWithVar<string>, path: ThemePath): ThemeItemWithVar<string> {
  let item: ThemeItemWithVar<string> = rec;

  for (const key of path) {
    if (!isWalkable(item)) {
      return undefined;
    }
    item = item[key];
  }

  return item;
}

/**
 * Whether `path` names a key that exists. Tested with `in`, because `undefined`
 * is a real theme value and {@link itemAt} cannot tell it from an absent key.
 */
export function hasItemAt(rec: ThemeRecordWithVar<string>, path: ThemePath): boolean {
  if (path.length === 0) {
    return true;
  }

  const parent = itemAt(rec, path.slice(0, -1));
  return isWalkable(parent) && path[path.length - 1]! in parent;
}

function assertKey(key: string): void {
  if (key === "__proto__") {
    throw new Error('"__proto__" is not a usable theme key');
  }
}

/**
 * Writes `item` at `path`, creating the records the walk needs. An intermediate
 * created below a style class is seeded from `live` (a copy of the leaf values
 * at the same path), because `setTheme` assigns a level-3 sub-record by
 * reference and a partial one would replace the default's wholesale.
 */
export function setItemAt(
  rec: ThemeRecordWithVar<string>,
  path: ThemePath,
  item: ThemeItemWithVar<string>,
  live?: ThemeRecord
): void {
  if (path.length === 0) {
    throw new Error("cannot set the theme root");
  }

  let parent = rec;

  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]!;
    assertKey(key);

    let next = parent[key];

    if (!isWalkable(next)) {
      const liveHere = live
        ? itemAt(live as ThemeRecordWithVar<string>, path.slice(0, i + 1))
        : undefined;

      const created: ThemeRecordWithVar<string> =
        liveHere instanceof ThemeScrollBars
          ? (new ThemeScrollBars({}) as unknown as ThemeRecordWithVar<string>)
          : {};

      if (i > 0 && isWalkable(liveHere)) {
        seedLeaves(created, liveHere);
      }

      parent[key] = created;
      next = created;
    }

    // a ThemeScrollBars is walked into like a record, but does not type as one
    parent = next as ThemeRecordWithVar<string>;
  }

  const last = path[path.length - 1]!;
  assertKey(last);
  parent[last] = item;
}

/** Copies `src`'s non-record values into `dst`, leaving its sub-records alone. */
function seedLeaves(dst: ThemeRecordWithVar<string>, src: ThemeRecordWithVar<string>): void {
  for (const key in src) {
    const v = src[key];

    if (key === "__proto__" || isPlainRecord(v)) {
      continue;
    }

    dst[key] = copyThemeItem(v);
  }
}

/** Removes the key at `path`, leaving the records above it in place. */
export function deleteItemAt(rec: ThemeRecordWithVar<string>, path: ThemePath): void {
  const parent = itemAt(rec, path.slice(0, -1));

  if (isWalkable(parent)) {
    delete parent[path[path.length - 1]!];
  }
}

/**
 * The path an authored slot lands on in the live theme. `setTheme` rewrites
 * level-2 keys through `compatMap`, so `base.BoxBG` is read back as
 * `base["background-color"]`. The map is many-to-one and is never inverted.
 */
export function toLivePath(path: ThemePath): ThemePath {
  if (path.length < 2) {
    return [...path];
  }

  const key = path[1]!;
  const mapped = key in compatMap ? compatMap[key as keyof typeof compatMap] : key;

  return [path[0]!, mapped, ...path.slice(2)];
}

/** Every slot of `varTheme` referencing `varKey`. */
export function varSlots(varTheme: ThemeRecordWithVar<string>, varKey: string): VarSlot[] {
  const found: VarSlot[] = [];

  const walk = (rec: ThemeRecordWithVar<string>, path: ThemePath) => {
    for (const key in rec) {
      const v = rec[key];
      const here = [...path, key];

      if (v instanceof ThemeVar) {
        if (v.key === varKey) {
          found.push({ varPath: here, livePath: toLivePath(here) });
        }
      } else if (isPlainRecord(v)) {
        walk(v, here);
      }
    }
  };

  walk(varTheme, []);
  return found;
}

/** Points the slot at `varPath` at `varKey`. */
export function bindSlot(
  varTheme: ThemeRecordWithVar<string>,
  varPath: ThemePath,
  varKey: string,
  live?: ThemeRecord
): void {
  setItemAt(varTheme, varPath, new ThemeVar(varKey), live);
}

/**
 * Replaces the variable reference at `varPath` with a copy of the variable's
 * current value, so nothing on screen changes.
 */
export function unbindSlot(
  varTheme: ThemeRecordWithVar<string>,
  vars: ThemeVarsDef,
  varPath: ThemePath
): ThemeItem {
  const item = itemAt(varTheme, varPath);

  if (!(item instanceof ThemeVar)) {
    throw new Error(`slot "${pathKey(varPath)}" is not bound to a variable`);
  }

  const value = copyThemeItem(item, vars, pathKey(varPath));
  setItemAt(varTheme, varPath, value);

  return value;
}

/**
 * Adds a variable, returning the trimmed name it was stored under. Refuses an
 * empty name, a duplicate, and a name carrying a newline (which would corrupt
 * the comments the generated file emits). Non-identifier names are fine —
 * the writer quotes them.
 */
export function addVar(vars: ThemeVarsDef, key: string, value: ThemeItem): string {
  const name = key.trim();

  if (!name) {
    throw new Error("a theme variable needs a name");
  }
  if (name.search("\n") >= 0) {
    throw new Error("a theme variable name cannot contain a newline");
  }
  assertKey(name);
  if (name in vars) {
    throw new Error(`theme variable "${name}" already exists`);
  }

  vars[name] = value;
  return name;
}

/**
 * Removes a variable, inlining a copy of its current value at every slot that
 * referenced it. A missed reference would make the next `instanceThemeVars`
 * throw.
 */
export function deleteVar(
  varTheme: ThemeRecordWithVar<string>,
  vars: ThemeVarsDef,
  key: string
): VarSlot[] {
  if (!(key in vars)) {
    throw new Error(`no such theme variable "${key}"`);
  }

  const slots = varSlots(varTheme, key);

  for (const slot of slots) {
    setItemAt(varTheme, slot.varPath, copyThemeItem(vars[key], vars, pathKey(slot.varPath)));
  }

  delete vars[key];
  return slots;
}

/** Renames a variable, rewriting every reference and moving its comment. */
export function renameVar(
  varTheme: ThemeRecordWithVar<string>,
  vars: ThemeVarsDef,
  comments: Record<string, string>,
  from: string,
  to: string
): string {
  const name = to.trim();

  if (!(from in vars)) {
    throw new Error(`no such theme variable "${from}"`);
  }
  if (name === from) {
    return from;
  }
  if (!name) {
    throw new Error("a theme variable needs a name");
  }
  if (name.search("\n") >= 0) {
    throw new Error("a theme variable name cannot contain a newline");
  }
  assertKey(name);
  if (name in vars) {
    throw new Error(`theme variable "${name}" already exists`);
  }

  for (const slot of varSlots(varTheme, from)) {
    setItemAt(varTheme, slot.varPath, new ThemeVar(name));
  }

  // rewritten in place so the variables keep the order the generated file writes them in
  const entries = Object.entries(vars).map(([k, v]): [string, ThemeItem] => [
    k === from ? name : k,
    v,
  ]);
  for (const k of Object.keys(vars)) {
    delete vars[k];
  }
  for (const [k, v] of entries) {
    vars[k] = v;
  }

  if (from in comments) {
    comments[name] = comments[from]!;
    delete comments[from];
  }

  return name;
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
