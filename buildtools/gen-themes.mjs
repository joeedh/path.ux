/**
 * Generate a strongly-typed theme catalog from the path.ux widget registry.
 *
 *   - generated/themes.ts   augments the ThemeKeyRegistry seam (theme_schema.ts)
 *                           with per-class, flat, inheritance-pre-resolved theme
 *                           keys; also exports a KnownThemeKey union.
 *   - generated/themes.json machine-readable catalog (for an ESLint rule).
 *
 * Usage:
 *   node buildtools/gen-themes.mjs [entryModule] [--out dir]
 *
 * Default entry = scripts/pathux.ts (re-exports every widget, so all
 * UIBase.register / internalRegister side effects fire on import).
 *
 * How it works: the entry is bundled with esbuild (platform=node) behind a DOM
 * stub whose `customElements.define` records every registered constructor. For
 * each class we walk the static prototype chain to merge `define().theme`
 * (declared schema), resolve the style class, seed types from `theme.ts` for
 * that style + parentStyle + base, and overlay the declared tokens. Inheritance
 * is resolved HERE, in JS, and emitted as flat per-class member lists so the TS
 * side never recurses (no self-reference cycles).
 */
import { writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

// ----------------------------------------------------------------- DOM stub

// Identical spirit to gen-datapaths' stub, but customElements.define records
// every constructor into globalThis.__THEME_CLASSES__ so we can enumerate the
// full widget set (built-ins via internalRegister + app widgets via register).
const DOM_STUB_BANNER = `
{
  const noop = () => {};
  const elTarget = { style: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false }, dataset: {}, children: [], childNodes: [] };
  const el = new Proxy(elTarget, { get: (t, k) => (k in t ? t[k] : noop), set: () => true });
  const win = globalThis;
  for (const k of ["addEventListener", "removeEventListener", "dispatchEvent", "requestAnimationFrame", "cancelAnimationFrame", "scrollTo"]) {
    if (typeof win[k] !== "function") win[k] = noop;
  }
  win.window ||= win;
  win.requestAnimationFrame ||= (cb) => 0;
  win.matchMedia ||= () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop });
  win.getComputedStyle ||= () => new Proxy({}, { get: () => "" });
  win.devicePixelRatio ||= 1;
  win.location ||= { href: "about:blank", search: "", hash: "", protocol: "about:" };
  const storage = { getItem: () => null, setItem: noop, removeItem: noop, clear: noop, key: () => null, length: 0 };
  win.localStorage ||= storage;
  win.sessionStorage ||= storage;
  globalThis.navigator ||= { userAgent: "node", platform: "node", maxTouchPoints: 0 };
  for (const name of [
    "HTMLElement", "Element", "Node", "EventTarget", "Event", "UIEvent",
    "MouseEvent", "PointerEvent", "KeyboardEvent", "TouchEvent", "DragEvent",
    "WheelEvent", "FocusEvent", "InputEvent", "CustomEvent", "Image",
    "HTMLCanvasElement", "HTMLDivElement", "HTMLInputElement", "DOMParser",
    "ResizeObserver", "MutationObserver", "IntersectionObserver",
  ]) {
    if (typeof globalThis[name] === "undefined") {
      globalThis[name] = class {};
    }
  }
  if (!globalThis.HTMLElement) { globalThis.HTMLElement = class HTMLElement {}; }
  globalThis.__THEME_CLASSES__ = [];
  const record = (cls) => { try { if (cls) globalThis.__THEME_CLASSES__.push(cls); } catch {} };
  if (!globalThis.customElements) {
    globalThis.customElements = {
      define: (name, cls) => record(cls),
      get: noop,
      whenDefined: () => Promise.resolve(),
    };
  } else {
    const orig = globalThis.customElements.define?.bind(globalThis.customElements);
    globalThis.customElements.define = (name, cls) => { record(cls); if (orig) { try { orig(name, cls); } catch {} } };
  }
  if (!globalThis.document) {
    globalThis.document = new Proxy(
      {
        createElement: () => el, createElementNS: () => el, createTextNode: () => el,
        body: el, head: el, documentElement: el,
        addEventListener: noop, removeEventListener: noop,
        querySelector: () => null, querySelectorAll: () => [], getElementById: () => null,
      },
      { get: (t, k) => (k in t ? t[k] : noop) }
    );
  }
}
`;

// ------------------------------------------------------------------ loader

async function loadRegistry(entryModule) {
  const esbuild = await import("esbuild");

  const entrySpec = "./" + entryModule.replace(/\\/g, "/");
  const stdinContents =
    `import ${JSON.stringify(entrySpec)};\n` +
    `export { UIBase } from "./scripts/core/ui_base.js";\n` +
    `export { DefaultTheme } from "./scripts/core/theme.js";\n` +
    `export { CSSFont } from "./scripts/core/cssfont.js";\n` +
    `export { ThemeScrollBars } from "./scripts/core/ui_theme.js";\n`;

  const result = await esbuild.build({
    stdin: {
      contents  : stdinContents,
      resolveDir: repoRoot,
      sourcefile: "gen-themes-entry.js",
      loader    : "js",
    },
    bundle  : true,
    write   : false,
    format  : "esm",
    platform: "node",
    target  : "es2022",
    external: ["electron", "marked", "parse5", "diff"],
    banner  : { js: DOM_STUB_BANNER },
    logLevel: "silent",
  });

  const code = result.outputFiles[0].text;
  const tmp = join(tmpdir(), `pathux-themes-${process.pid}-${Date.now()}.mjs`);
  await writeFile(tmp, code, "utf8");
  try {
    const mod = await import(pathToFileURL(tmp).href);
    const classes = (globalThis.__THEME_CLASSES__ ?? []).filter((c) => typeof c === "function");
    return {
      UIBase         : mod.UIBase,
      DefaultTheme   : mod.DefaultTheme,
      CSSFont        : mod.CSSFont,
      ThemeScrollBars: mod.ThemeScrollBars,
      classes,
    };
  } finally {
    await rm(tmp, { force: true });
  }
}

// -------------------------------------------------------------- resolution

const PX_RE = /^[0-9.]+px$/i;

function staticChain(cls, UIBase) {
  const chain = [];
  let p = cls;
  while (p && p !== UIBase && p !== Function.prototype && p !== Object) {
    chain.push(p);
    p = Object.getPrototypeOf(p);
  }
  if (p === UIBase) chain.push(UIBase);
  return chain; // most-derived first
}

function ownDefine(cls) {
  if (!Object.prototype.hasOwnProperty.call(cls, "define")) return null;
  try {
    return cls.define() ?? null;
  } catch {
    return null;
  }
}

function resolveStyleClass(cls, UIBase) {
  for (const c of staticChain(cls, UIBase)) {
    const def = ownDefine(c);
    if (def && def.style) return def.style;
  }
  return "base";
}

function resolveParentStyle(cls, UIBase) {
  for (const c of staticChain(cls, UIBase)) {
    const def = ownDefine(c);
    if (def && def.parentStyle) return def.parentStyle;
  }
  return undefined;
}

const KIND_TO_TS = {
  string    : "string",
  number    : "number",
  bool      : "boolean",
  color     : "string",
  font      : "CSSFont",
  scrollbars: "ThemeScrollBars",
};

function isToken(v) {
  return v && typeof v === "object" && typeof v.kind === "string" && !("length" in v);
}

/** Merge each class's own define().theme up the chain (most-derived wins). */
function collectDeclared(cls, UIBase) {
  const chain = staticChain(cls, UIBase).reverse(); // base first
  const merged = {};
  const deepMerge = (dst, src) => {
    for (const [k, v] of Object.entries(src)) {
      if (isToken(v)) {
        dst[k] = v;
      } else if (v && typeof v === "object") {
        if (!dst[k] || isToken(dst[k]) || typeof dst[k] !== "object") dst[k] = {};
        deepMerge(dst[k], v);
      }
    }
  };
  for (const c of chain) {
    const def = ownDefine(c);
    if (def && def.theme && typeof def.theme === "object") deepMerge(merged, def.theme);
  }
  return merged;
}

/** Resolved type-node tree from a theme.ts value. Leaf = TS type string. */
function inferValue(val, CSSFont, ThemeScrollBars) {
  if (val instanceof CSSFont) return "CSSFont";
  if (val instanceof ThemeScrollBars) return "ThemeScrollBars";
  switch (typeof val) {
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "string":
      return PX_RE.test(val.trim()) ? "number" : "string";
    case "object": {
      if (!val) return "string";
      const out = {};
      for (const [k, v] of Object.entries(val)) out[k] = inferValue(v, CSSFont, ThemeScrollBars);
      return out;
    }
    default:
      return "string";
  }
}

function inferStyle(styleName, ctx) {
  const rec = ctx.DefaultTheme[styleName];
  if (!rec || typeof rec !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(rec))
    out[k] = inferValue(v, ctx.CSSFont, ctx.ThemeScrollBars);
  return out;
}

function declaredToTypes(decl) {
  const out = {};
  for (const [k, v] of Object.entries(decl)) {
    if (isToken(v)) out[k] = KIND_TO_TS[v.kind] ?? "string";
    else if (v && typeof v === "object") out[k] = declaredToTypes(v);
  }
  return out;
}

/** Shallow-ish overlay: nested objects merge, leaves overwrite. */
function overlay(dst, src) {
  for (const [k, v] of Object.entries(src)) {
    if (v && typeof v === "object" && dst[k] && typeof dst[k] === "object") overlay(dst[k], v);
    else dst[k] = v;
  }
  return dst;
}

/** All leaf key-paths present in a theme.ts style record (for validation). */
function styleKeySet(ctx, styleName) {
  const rec = ctx.DefaultTheme[styleName];
  return rec && typeof rec === "object" ? new Set(Object.keys(rec)) : new Set();
}

function resolveClass(cls, ctx) {
  const { UIBase } = ctx;
  const style = resolveStyleClass(cls, UIBase);
  const parentStyle = resolveParentStyle(cls, UIBase);
  const declared = collectDeclared(cls, UIBase);

  const resolved = {};
  overlay(resolved, inferStyle("base", ctx));
  if (parentStyle) overlay(resolved, inferStyle(parentStyle, ctx));
  if (style && style !== "base") overlay(resolved, inferStyle(style, ctx));
  overlay(resolved, declaredToTypes(declared));

  // validation: a class's OWN declared keys absent from theme.ts (own style /
  // parentStyle / base). Inherited declarations are validated on the class that
  // declares them, so a subclass isn't blamed for a parent's keys.
  const ownDef = ownDefine(cls);
  const ownDeclared =
    ownDef && ownDef.theme && typeof ownDef.theme === "object" ? ownDef.theme : {};
  const known = new Set([
    ...styleKeySet(ctx, "base"),
    ...(parentStyle ? styleKeySet(ctx, parentStyle) : []),
    ...(style ? styleKeySet(ctx, style) : []),
  ]);
  const warnings = [];
  for (const k of Object.keys(ownDeclared)) {
    if (!known.has(k))
      warnings.push(
        `${cls.name}: declared theme key "${k}" not found in theme.ts (style "${style}")`
      );
  }

  return { name: cls.name, style, parentStyle, resolved, warnings };
}

// --------------------------------------------------------------- rendering

function renderType(node, indent) {
  if (typeof node === "string") return node;
  const pad = "  ".repeat(indent + 1);
  const close = "  ".repeat(indent);
  const lines = Object.entries(node)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${pad}${JSON.stringify(k)}: ${renderType(v, indent + 1)};`);
  return `{\n${lines.join("\n")}\n${close}}`;
}

function renderTs(entries) {
  let ts = "// AUTO-GENERATED by buildtools/gen-themes.mjs — do not edit.\n";
  ts += "// Run `pnpm run gen:themes` to regenerate.\n";
  ts += "//\n";
  ts += "// Per-class theme-key catalog with inheritance pre-resolved (flat), emitted\n";
  ts += "// as an augmentation of the empty `ThemeKeyRegistry` seam in\n";
  ts += "// scripts/core/theme_schema.ts. The library typechecks standalone with the\n";
  ts += "// empty seam; include THIS file (see tsconfig.themes.json) to make\n";
  ts += "// UIBase.getDefault's typed overload strict for migrated widgets.\n\n";
  ts += 'import type { CSSFont } from "../scripts/core/cssfont";\n';
  ts += 'import type { ThemeScrollBars } from "../scripts/core/ui_theme";\n';
  ts += 'import type { ThemeKeyRegistry } from "../scripts/core/theme_schema";\n\n';

  ts += 'declare module "../scripts/core/theme_schema" {\n';
  ts += "  interface ThemeKeyRegistry {\n";
  for (const e of entries) {
    if (e.name === "UIBase") continue;
    ts += `    ${JSON.stringify(e.name)}: ${renderType(e.resolved, 2)};\n`;
  }
  ts += "  }\n";
  ts += "}\n\n";

  // Standalone union of every known theme key (handy for an ESLint rule / docs).
  ts += "export type KnownThemeKey = {\n";
  ts += "  [K in keyof ThemeKeyRegistry]: keyof ThemeKeyRegistry[K];\n";
  ts += "}[keyof ThemeKeyRegistry] & string;\n";
  return ts;
}

function renderJson(entries) {
  const classes = {};
  for (const e of entries) {
    classes[e.name] = { style: e.style, parentStyle: e.parentStyle ?? null, keys: e.resolved };
  }
  return JSON.stringify({ version: 1, classes }, null, 2) + "\n";
}

// -------------------------------------------------------------------- main

async function main(argv) {
  let outDir = "generated";
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") outDir = argv[++i] ?? outDir;
    else positional.push(argv[i]);
  }
  const entryModule = positional[0] ?? "scripts/pathux.ts";

  let ctx;
  try {
    ctx = await loadRegistry(entryModule);
  } catch (err) {
    console.error(`[gen-themes] failed to load ${entryModule}:`);
    console.error("  " + (err?.stack ?? err?.message ?? err));
    process.exitCode = 1;
    return;
  }

  const { classes, UIBase } = ctx;
  if (!UIBase) {
    console.error("[gen-themes] could not resolve UIBase from the bundle");
    process.exitCode = 1;
    return;
  }

  const seen = new Map();
  const allWarnings = [];
  for (const cls of classes) {
    if (cls === UIBase) continue;
    if (!(cls.prototype instanceof UIBase)) continue;
    if (!cls.name) continue;
    const e = resolveClass(cls, ctx);
    allWarnings.push(...e.warnings);
    if (seen.has(e.name)) continue; // first registration wins; dedupe by name
    seen.set(e.name, e);
  }

  const entries = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));

  const absOut = resolve(repoRoot, outDir);
  await mkdir(absOut, { recursive: true });
  await writeFile(join(absOut, "themes.ts"), renderTs(entries), "utf8");
  await writeFile(join(absOut, "themes.json"), renderJson(entries), "utf8");

  for (const w of allWarnings) console.warn("[gen-themes] " + w);
  console.log(
    `[gen-themes] wrote ${entries.length} classes to ${outDir}/ ` +
      `(themes.ts, themes.json)${allWarnings.length ? `; ${allWarnings.length} warning(s)` : ""}`
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2));
}
