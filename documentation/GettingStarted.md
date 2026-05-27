# Getting started: typed, LLM-friendly data paths

path.ux builds UIs from a Blender-RNA-style data API. Properties are **string paths**
(`"workspace.brush.size"`, `"canvas.paths[0].material.color"`) into a schema you construct
at runtime with a fluent builder, then consume as plain strings:

```ts
container.prop("workspace.brush.size");
// or in an xmlpage template:
//   <prop path="workspace.brush.size">
```

The valid paths, their value types, and their UI metadata live only inside your
`defineAPI()` builder code — nothing is statically greppable or checkable, so a typo
fails at runtime (or silently renders `"(error)"`).

This guide wires up a **codegen step** that walks your real `defineAPI()` and emits three
artifacts that fix that:

| Artifact | Purpose |
| --- | --- |
| `generated/API_PATHS.md` | Human/LLM-readable catalog — what an agent greps before writing a `prop()` call |
| `generated/api-paths.json` | Machine-readable catalog — the source the ESLint rule reads |
| `generated/datapaths.ts` | A `KnownDataPath` union + a `DataPathRegistry` augmentation for compile-time typo-checking and autocomplete |

On top of those you get an **ESLint rule** that flags unknown path literals (including
inside `<prop path="...">` template strings), and **richer runtime errors** with
"did you mean…?" suggestions.

---

## Prerequisites

- Node 18+ and a package manager (`npm`/`pnpm`).
- `esbuild` available (used to bundle your API factory headlessly). It is a dependency of
  path.ux; if you consume path.ux as a library, add it: `npm i -D esbuild`.
- ESLint 9 flat config (`eslint.config.js`) if you want the lint rule.
- TypeScript via `tsgo` (`@typescript/native-preview`) or `tsc` for the typecheck surface.

---

## 1. Expose a node-loadable API factory

The generator imports your API factory **outside the browser**, so it must be loadable in
node. The factory module must export either:

- a **function** that returns a `DataAPI` (default export name `defineAPI`), or
- a `DataAPI` instance directly.

The returned API must have its root set (`api.setRoot(...)`), i.e. `api.rootContextStruct`
must be defined. See `example/api/api_define.js` for a reference:

```js
export function defineAPI() {
  const api = new DataAPI();
  // api.mapStruct(...).float("size", "size", "Size").range(0.25, 1024)...
  api.setRoot(rootStruct);
  return api;
}
```

You do not need to stub the DOM yourself — the generator injects a DOM stub banner
(`window`, `document`, `HTMLElement`, event classes, `localStorage`, etc.) before
evaluating the bundle, so modules that touch the DOM at import time still load.

---

## 2. Add the `gen:paths` script

In `package.json`:

```jsonc
{
  "scripts": {
    "gen:paths": "node node_modules/path.ux/buildtools/gen-datapaths.mjs"
  }
}
```

> Inside the path.ux repo itself the path is just
> `node buildtools/gen-datapaths.mjs`.

Run it, pointing at your factory:

```bash
# defaults: factory=example/api/api_define.js  export=defineAPI  out=generated
npm run gen:paths

# your own app:
npm run gen:paths -- src/api/define_api.ts defineAPI
```

### CLI arguments

```
gen-datapaths.mjs [factoryModule] [exportName] [--out dir] [--module name]
```

| Arg | Default | Meaning |
| --- | --- | --- |
| `factoryModule` | `example/api/api_define.js` | Path (relative to repo root) to your factory module |
| `exportName` | `defineAPI` | Named export to invoke; falls back to the default export |
| `--out dir` | `generated` | Output directory for the three artifacts |
| `--module name` | `path.ux` | Module name used in the `declare module "..."` augmentation in `datapaths.ts` |

On success it prints `wrote N paths to generated/`. If your factory can't load, it prints
the error and exits non-zero (so it's safe to gate CI on).

> **Note:** the generator calls `process.exit()` when done — your app may register timers
> or animation frames that would otherwise keep node alive.

Commit the `generated/` artifacts (or regenerate them in CI before lint/typecheck) so the
ESLint rule and docs stay in sync with your API.

---

## 3. Compile-time typo-checking (optional but recommended)

`container.prop()` and the related widget methods accept a `KnownDataPath`. Out of the box
that type is just `string` — **zero behavior change**. To narrow it to your real paths,
include the generated augmentation in your `tsconfig.json`:

```jsonc
{
  "include": ["src/**/*", "generated/datapaths.ts"]
}
```

`generated/datapaths.ts` augments path.ux's `DataPathRegistry` interface via declaration
merging:

```ts
declare module "path.ux" {
  interface DataPathRegistry {
    "workspace.brush.size": true;
    // ...one line per non-indexed path
  }
}
```

Once augmented, `KnownDataPath` becomes `(known paths) | (string & {})`:

- **Exact known literals** are autocompleted, and an outright wrong *type* (e.g. a number)
  is rejected by the compiler.
- **Arbitrary strings still compile** — relative/prefixed paths (resolved at runtime via
  `Container._joinPrefix`) and dynamic-struct paths can't live in a global union, so they
  fall through to `string & {}`. Catching *typo'd* strings is the ESLint rule's job
  (step 4), not the type system's.

If `--module` differed from your install name, make sure the `declare module "<name>"`
target matches the specifier you import path.ux under, or the augmentation won't merge.

---

## 4. ESLint rule for typo errors (the CI surface)

This is what turns a typo into a hard error — including inside xmlpage template strings,
which the type system can't see into.

Register the rule in `eslint.config.js` (flat config):

```js
import validDatapath from "path.ux/buildtools/eslint-rules/valid-datapath.mjs";

export default [
  // ...your existing config...
  {
    plugins: { pathux: { rules: { "valid-datapath": validDatapath } } },
    rules:   { "pathux/valid-datapath": "warn" }, // or "error" to fail CI
  },
];
```

What it validates:

- The **first string-literal argument** to `prop`, `slider`, `simpleslider`, `check`,
  `checkenum`, `listenum`, `pathlabel`, and `textbox`.
- **`path="..."` attributes** inside template literals that look like xmlpage markup
  (contain `<` and `path=`).

How it avoids false positives:

- Relative/prefixed paths validate if they match a known **path suffix** (so `"brush.size"`
  and `"size"` both pass when `"workspace.brush.size"` exists).
- Strings containing `{`, `$`, or a backtick (mass-set / interpolated expressions) are
  skipped.
- Indexed segments are normalized (`foo[0]` → `foo[n]`).
- If `generated/api-paths.json` is **missing, the rule is a no-op** — it never blocks a
  build just because codegen hasn't run.

On a miss it reports `Unknown data path "x". Did you mean: …?` with nearest-match
suggestions.

---

## 5. Runtime "did you mean…?" errors

No setup required — this ships in path.ux. When a path fails to resolve:

- `resolvePath` records the rich message on `api.lastResolveError`.
- `container.prop()` and `pathlabel()` surface the nearest valid keys instead of a bare
  throw or a silent `"(error)"` label.

This is the surface an agent sees when it runs your app and guesses a path wrong — it can
self-correct without reading `defineAPI()`.

---

## 6. Wire it into your build

A typical ordering — regenerate, then lint and typecheck against fresh artifacts:

```jsonc
{
  "scripts": {
    "gen:paths":  "node node_modules/path.ux/buildtools/gen-datapaths.mjs -- src/api/define_api.ts",
    "lint":       "eslint .",
    "typecheck":  "tsgo --noEmit",
    "prebuild":   "npm run gen:paths",
    "ci":         "npm run gen:paths && npm run lint && npm run typecheck && npm run build"
  }
}
```

In a shell-based pipeline:

```bash
npm run gen:paths -- src/api/define_api.ts || exit 1
npm run lint      || exit 1
npm run typecheck || exit 1
npm run build
```

> If your release script auto-commits/pushes, decide deliberately whether to run
> `gen:paths` there — loading the app headlessly adds a failure point. Many teams instead
> commit `generated/` and regenerate only in the CI lint/typecheck job.

---

## 7. Point your LLM/agent at the catalog

Add a line to your `CLAUDE.md` (or equivalent) so agents discover the reference before
authoring `prop()` calls:

```md
## Data API paths

Valid `path` strings for `container.prop("...")` and `<prop path="...">` are catalogued in
`generated/API_PATHS.md` (human/LLM-readable) and `generated/api-paths.json` (machine).
Regenerate after changing any `api_define` with `npm run gen:paths`.
```

---

## Verifying the setup

1. `npm run gen:paths` writes a non-empty `generated/api-paths.json` covering known paths.
2. Introduce a deliberate typo, e.g. `container.prop("workspace.brush.sized")`:
   - `eslint` flags it with a "did you mean…?" hint.
   - With the augmentation included, a wrong *type* (`prop(123)`) is a `tsgo` error.
   - Running the app yields a "did you mean workspace.brush.size?" message instead of a
     bare throw / `"(error)"`.
3. Confirm valid absolute **and** relative paths (`"brush.size"`) still lint/typecheck
   clean — no false positives.

---

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `has no export "defineAPI" (or default)` | Pass the correct export name as the 2nd CLI arg, or default-export your factory. |
| `did not yield a DataAPI with a rootContextStruct` | Call `api.setRoot(...)` in your factory before returning. |
| `X is not defined` / `X is not a function` during load | Your module touches a DOM/global API not covered by the stub banner at import time. Defer that work out of module top-level, or extend the banner in `buildtools/gen-datapaths.mjs`. |
| ESLint rule reports nothing | `generated/api-paths.json` is missing (rule is a no-op) — run `gen:paths` first. |
| Augmentation doesn't narrow `KnownDataPath` | `generated/datapaths.ts` isn't in tsconfig `include`, or its `declare module "<name>"` doesn't match your path.ux import specifier (set `--module`). |
