# Example TS Port — Error Categories

Baseline: **0 errors** — Phase 5 complete (2026-05-26). Both `npx tsgo --project example/tsconfig.json`
and `npx tsgo --noEmit` (main library) report 0 errors. History: 593 → 635 (real source types
surfaced) → 139 (continuation start) → 0.
Raw list: `errors-raw.txt` (stale, pre-fix). Regenerate: `npx tsgo --project example/tsconfig.json 2>&1 | grep "error TS"`.

## Phase 6 — fresh-context type-hack audit (2026-05-26, complete)

A fresh-context agent re-read the port hunting for suspicious casts/asserts. No `any`,
`@ts-ignore`, or `@ts-nocheck` exist in `example/*.ts` source. Findings actioned:

**Fixed:**
- **`treeview()` library typing gap** (was `as TreeView`): fixed `scripts/core/ui.ts` `treeview()`
  to return `TreeView<CTX>` (added `import type`), removing the `// XXX property type me` TODO and
  the example-side cast. Main lib stays at 0 errors.
- **`graphNodes!` asserts** in live `buildGraphPack`: use `buildGraphPackNodes`'s return value and
  the in-scope `nodes` binding; no more non-null asserts.
- **`canvas as HTMLCanvasElement & {g}`** field-injection cast: replaced with a local
  `let g = canvas.getContext("2d")!`.
- **`(this as unknown as Record<...>)[name](e)`** dynamic dispatch in workspace.ts: replaced with
  explicit typed handler passing (`makeEventListener(name, (e) => this.mousedown(e))`).
- **`_fileUndo!`** in toolop.ts undo: guarded with `if (this._fileUndo)`.

**Left as legitimate (with rationale):**
- Dead `init()` tab block (properties.ts) and dead `oldSave` (docbrowser.ts) are PRE-EXISTING
  intentionally-disabled code (confirmed via `git show HEAD:...js`: the `return;` and `oldSave`
  name were in the original JS). They typecheck honestly; deleting is out of port scope.
- `getElementById(...) as Container` — conventional honest DOM downcast against a known page.xml.
- `ContextLike` / `loadConstants` double-casts (app.ts) — real library variance/shape impedance at
  the boundary, documented inline; fixing means a public library API change for unclear payoff.
- nstructjs serialize round-trip puns (datablock.ts, draw.ts), dynamic blockset property writes,
  PropTypes runtime enum extension, `PackNodeVertex.side` augmentation, `_relative` global signature
  (mirrors already-loosened library) — all legitimate dynamic/serialization/runtime-extension patterns.

## Structural findings (resolved during Phase 5)

- **ScreenArea.minSize** typed `number[]` but runtime uses `undefined` as a "no constraint"
  sentinel (matches `maxSize`, checked at FrameManager.ts:2029-2059). Fixed library type →
  `(number | undefined)[]`. Real library bug.
- **DocsBrowser** is NOT in `scripts/pathux.ts`; it lives in `scripts/docbrowser/docbrowser.ts`
  and ships only in the separate `pathux_with_docbrowser` bundle. docbrowser.ts imports it from
  source so the example bundle includes it + registers the `docs-browser-x` element.
- **`_relative` global**: importing docbrowser source pulled scripts/docbrowser into the example
  program; example/global.d.ts had to match scripts/global.d.ts's loose `(...args: unknown[]) => unknown`
  signature or the merged Window type became an intersection. Debug-only global.
- **`_fileUndo`**: example's file-based undo augmentation on ToolOp was renamed `_undo` → `_fileUndo`
  to avoid colliding with library ToolOp subclasses that declare their own typed `_undo`.
- Real bugs fixed + called out: eventgraph duplicate `update()` override; eventgraph `layout()`
  assigning void return of `layoutSockets()` to inputs/outputs; Blob `{mime}` → `{type}` (×2).

## Library resolution (changed)

`example/pathux.ts` now re-exports `../scripts/pathux` (library SOURCE), and `example/tsconfig.json`
has NO `paths` mapping. This gives full-fidelity library types directly from source. The earlier
`.tmp-types/` emitted declarations were low quality (DataAPI value-only, `util` → `{}`) and hid
errors — do NOT use them. Count rose 593→635 because real source types surfaced more genuine errors.

Because the example imports library source (TS), it can no longer load as raw ES modules in the
browser. It is now bundled: `buildtools/esbuild.mjs` builds `example/core/app.ts` →
`dist/example/app.js`, and a postbuild plugin copies it to `example/dist/app.js` (+map) for electron.
`index.html` and `electron_app.html` load `./dist/app.js`.

## Category A — Missing class field declarations (TS2339, ~big chunk of 341)

JS classes assigned `this.foo = ...` in the constructor without declaring fields. TS classes
require explicit field declarations. Biggest offenders:

- `draw/draw.ts` `Canvas`: `paths, verts, edges, idmap, indexMap, ...` (~135 errors in file, many here)
- `core/datablock.ts` `DataLib`: `blockIdMap, ...` (130 errors in file)

**Fix:** add class field declarations with inferred/explicit types. This also resolves many
TS7053 (indexing) and TS7005/7034 (implicit any) once the field types are known.

## Category B — Implicit `any` parameters (TS7006 = 179)

Method/function params with no annotation. Dominant pattern: `defineAPI(api)`, `(list)`, `(ctx)`,
`(b)`, `(obj)`. Heaviest in `api/api_define.ts` (api/list params), `core/datablock.ts`,
`draw/draw_ops.ts` (ctx), `core/dynamics.ts`.

**Fix:** annotate params. `api` → DataAPI/DataStruct builder types from pathux; `ctx` → ToolContext/
ViewContext (example/core/context.ts); `b` → the block copy target type.

## Category C — `_appstate` global not found (TS2304 + TS2552 = ~16)

Code references a global `_appstate` that doesn't exist as a TS symbol. `app.ts` suggests `AppState`.
Appears in screen.ts, toolop.ts, docbrowser.ts, context.ts, app.ts.

**Fix:** determine the real source of `_appstate` (module-global set in app.ts?). Likely needs a
declared exported `appstate` singleton or `declare global`. STRUCTURAL — ask/understand.

## Category D — Editor static-side incompatibility (TS2417 = 7)

Every editor subclass (`WorkspaceEditor`, `PropsEditor`, `MenuBarEditor`, `LogEditor`,
`EventGraphViewer`, `DocsBrowserEditor`) "incorrectly extends base class static side 'typeof Editor'".
The base `Editor.define()` (or similar static) return type conflicts with subclass overrides.

**Fix:** align the static `define()`/`defineAPI()` signatures with the base `Editor` from pathux.
STRUCTURAL — understand the Area/Editor contract.

## Category E — Wrong argument counts (TS2554 = 21)

Calls into library/own APIs with mismatched arg counts. e.g. context.ts "Expected 0, got 1";
properties.ts "Expected 4, got 2"; dynamics.ts "Expected 4-6, got 1" and "Expected 1, got 5".

**Fix:** case-by-case. Some are stale call sites vs current library signatures; some are our own
methods needing optional params. Inspect each.

## Category F — Implicit any variables / locals (TS7005=15, TS7034=7)

`let graphNodes`, `solveTimer`, `data2`, `animreq` etc. declared without init/type.
**Fix:** annotate or initialize.

## Category G — Dynamic index signatures (TS7053 = 13)

Objects indexed by `any` key (`{}` or `DataLib`). Often the same objects as Category A.
**Fix:** add index signatures or type the field as a Map/Record.

## Category H — possibly-undefined (TS18048=6, TS2532=2, TS18047=1)

`canvas` possibly undefined in eventgraph.ts; objects possibly undefined.
**Fix:** guards / non-null where invariant holds.

## Category I — One-off structural bugs

- TS2393 (2) `eventgraph.ts`: **Duplicate function implementation** — two funcs same name. Real bug.
- TS17009 (2) `workspace_ops.ts`: `super` must be called before `this` in constructor. Real bug.
- TS2683 (3): `this` implicitly any — needs `this` param annotation on plain functions.
- TS2353 (2) `properties.ts`: `mime` not in `BlobPropertyBag` — wrong Blob option (should be `type`).
- TS2345/2322/2740/2741/2556/2416/2377/2349/2393 misc — handle during iteration.

## Suggested resolution order (low-risk → structural)

1. A + G + F (field declarations / locals) — mechanical, unlocks many cascading errors.
2. B (param annotations) — mechanical with the type map above.
3. H (undefined guards), I one-offs (2393, 17009, 2353) — local bug fixes.
4. C (`_appstate`) — structural, needs understanding.
5. D (Editor static side) — structural, needs understanding.
6. E (arg counts) — case-by-case.

Re-run typecheck after each batch; counts cascade down.
