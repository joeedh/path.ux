# Splitting `scripts/core/ui_base.ts`

## Context

`scripts/core/ui_base.ts` is 4985 lines / ~127 KB and holds four unrelated
subsystems: the icon manager, the theme-key/scrollbar utilities, the canvas
text/box drawing helpers, and the `UIBase` custom-element base class that every
widget in the library extends. It is the single largest file in the repo and the
one every other module depends on, so it is the hardest file to navigate, review
or type-check incrementally.

The goal is to get `ui_base.ts` under 1200 lines while leaving the public API
byte-for-byte identical. `scripts/pathux.ts:12` is a bare
`export * from "./core/ui_base"`, and 36 modules import from `ui_base` directly
(eight of them through `import * as ui_base`), so every symbol the file exports
today must still be reachable through `ui_base.ts` after the split. New files are
not added to `pathux.ts`; `ui_base.ts` re-exports them with
`export * from "./<newfile>"`, which is already the established shape in the file
(`ui_base.ts:78` does exactly this for `./ui_theme`).

This plan touches `ui_base.ts`, the new files it creates, and a todos.md entry.
Nothing else.

## Approach

Extract free functions only. No mixins, no prototype assignment from other files.
A method body moves to a module-level function whose first parameter is the
element; the method in `UIBase` becomes a one-line delegation. The class skeleton
— every field declaration, accessor, static, overload set and generic parameter —
stays in `ui_base.ts`, so subclass overriding, `super.x()` calls in widgets, and
the emitted `.d.ts` are untouched.

Measured budget, from a brace-matched parse of the file rather than an estimate:

| | lines |
|---|---|
| class body retained after delegating all 112 eligible members | 1059 |
| module-level retained (incl. +22 new import / `export *` lines) | 95 |
| mechanical subtotal | 1154 |
| named arg/return types (cleanup 1) | −41 |
| dead commented-out code that survives delegation (cleanup 2) | −17 |
| `graphNodeDef` literal moved out (cleanup 3) | −9 |
| `noMarginsOrPadding` reusing `marginPaddingCSSKeys` | −2 |
| projected final | ~1085 (+20 pessimism for prettier rewrapping) |

The partition has to be total, with every cluster assigned. An 80/20 pass that
only delegates the 52 methods saving ≥11 lines each lands at ~1445, over budget.
The 60 small delegations are worth only 291 lines combined but they are
load-bearing, as is each of the three big module-level blocks (icons 488, draw
351, savedata 130).

## Mechanics

1. Signatures are copied verbatim into the delegate — same defaults, optional
   markers, overloads, generic parameters. Only bodies move. This is what keeps
   `types/core/ui_base.d.ts` unchanged.
2. Free functions take `elem: UIBase<any, any, any>` as the first parameter, to
   avoid `CTX`/`VALUE` variance errors when a `UIBase<MyCtx>` delegate calls
   them. Generic methods stay generic in the free function and the delegate
   forwards the type argument explicitly, since `T` is not inferable:
   `return pick.pickElement<CTX, T>(this, x, y, args);`
3. Namespace imports, not named imports — `import * as themeLookup from
   "./ui_base_theme_lookup";`, one line per new file. Named imports of ~112
   functions would add ~120 lines and eat the whole margin.
4. Cycle rule: new files may `import { UIBase } from "./ui_base"` for runtime
   use, but `UIBase` may appear only inside function bodies, never at module top
   level. Use `import type` where only the type is needed. The repo already
   survives a harder cycle: `core/ui.ts:36` ⇄ `widgets/ui_listbox.ts:2` with
   `class ListBox extends Container` at the top level bundles correctly. The only
   eager module-level `UIBase` references in the regions being moved are the two
   glue lines 4981/4984, which stay.
5. `super.*` becomes `HTMLElement.prototype.X.call(elem, …)`, which is exactly
   equivalent because `UIBase extends HTMLElement` directly. This covers the 8
   sites in `add`/`removeEventListener`, `appendChild`, `removeChild`,
   `replaceChild`, `remove`, and `get`/`set hidden`.
6. Only six new modules are `export *`-ed, the ones carrying public API:
   `ui_icons`, `ui_draw`, `ui_savedata`, `ui_element_registry`, `ui_theme_key`,
   `ui_base_types`. The ten `ui_base_*` implementation modules need no re-export.
   No two `export *`-ed modules may export the same name — an ambiguous name is
   silently dropped from the namespace object and would break `ui_base.xxx`
   consumers.
7. Filenames are flat. Do not create a `ui_base/` directory next to
   `ui_base.ts`; `./ui_base` would then ambiguously resolve to `ui_base.ts` or
   `ui_base/index.ts`.
8. Extracted modules import `theme`, `parsepx` and `ThemeRecord` from
   `./ui_theme` directly, never round-tripping through `./ui_base`.
9. `export let _themeUpdateKey` (line 876) is a mutable binding. `export *`
   re-exports live bindings, so `ui_base._themeUpdateKey` still tracks
   `flagThemeUpdate()`. Confirm with a test that reads it after a theme change.
10. `setTheme(DefaultTheme)` at line 207 runs at module init and must still
    execute before anything reads `theme`. Keep it co-located with `setTheme` in
    `ui_theme_key.ts`, imported first from `ui_base.ts`.
11. `ui_worker_shim.ts` must be a static import so its body runs before
    `class UIBase extends HTMLElement` evaluates. ESM depth-first evaluation
    guarantees this regardless of where the import line sits.
12. Run `pnpm run format` after each step; the projection assumes
    prettier-formatted output at `printWidth: 100`.

### Two deliberate deviations from "nothing changes"

`#reflagGraph` is renamed to `_reflagGraph` in the prep step. A free function
cannot touch an ECMAScript `#` private, and `graphExec` (107 lines) plus
`ensureGraph` both use it. The rename adds one underscore-prefixed field to
`ui_base.d.ts`, the only expected line in the declaration diff. Nothing outside
the class references it. The fallback, if that is unacceptable, is to keep the
event-graph cluster in the class entirely, costing ~160 lines and pushing the
projection to ~1245 — over budget, recoverable only by spending the reserve
levers below.

`private getStyleRecord` keeps a one-line `private` delegate in the class so the
`.d.ts` still emits `private getStyleRecord;`. The free function takes the
widened `elem` type and the delegate casts.

### Stays in `ui_base.ts`

Field declarations, `accessor` fields, `get`/`set value`, all get/set accessors,
`declare ["constructor"]`, `static PositionKey` and `dataPathPolling`, the
`getDefault` overload triple (overloads are a class construct, and the
implementation needs the class's `SELF` for `ThemeKeysFor<SELF>`),
`static internalRegister` (it calls `this.prefix(…)`, a polymorphic static
`this`, so delegating would hard-bind the base implementation),
`connectedCallback`, the class header, the constructor shell, and the bottom glue
(`UIBase.PositionKey = "fixed"`, `aspect._setUIBase(UIBase)`).

`PackFlags` moves to `ui_base_types.ts` and is re-exported. documentation/container.md
§88 says it lives "in `scripts/core/ui_base.ts`", which stays true for importers.

## File partition

The largest new file is ~510 lines; none exceeds 600.

| New file | Content | ≈ lines |
|---|---|---|
| `ui_icons.ts` | module `243–730`: `_IconManager`, `CustomIcon`, `IconManager`, `iconmanager`, `IconSheets`, `iconSheetFromPackFlag`, `get`/`setIconManager`, `makeIconDiv`, `CustomIconEntry` | 510 |
| `ui_base_theme_lookup.ts` | theme lookup `3909–4359` plus `_mobile_theme_patterns` | 430 |
| `ui_base_init.ts` | constructor body, lifecycle, `update`/`onadd`, `_idgen` | 430 |
| `ui_base_anim.ts` | `flash`, `animateOld`, `abortAnimations`, `doOnce`, `internalSetTimeout` queue | 430 |
| `ui_base_datapath.ts` | datapath `3159–3431` plus path watching `3717–3823` | 390 |
| `ui_base_dom.ts` | DOM search, tree ops, visibility, `add`/`removeEventListener` | 380 |
| `ui_draw.ts` | module `4498–4848`: `drawRoundBox*`, fonts, `measureText*`, `drawText` | 340 |
| `ui_base_modal.ts` | `__updateDisable`, `push`/`popModal`, clipboard | 300 |
| `ui_base_css.ts` | `setBoxCSS`, `genBoxCSS`, `setCSS`, `flushSetCSS`, `noMargins*`, `getTotalRect`, `parse`/`formatNumber` | 285 |
| `ui_element_registry.ts` | tag prefix machinery, `EventCBSymbol`, `calcElemCBKey`, `ElementClasses`, element-name maps, `class_idgen`, `dpistack`, `UIFlags`, `report`, deprecated `getDefault` and `IsMobile`, `marginPaddingCSSKeys`, static registration bodies | 275 |
| `ui_base_graph.ts` | event graph `1123–1309`, `updateEventGraph`, `uiBaseNodeDef` | 240 |
| `ui_base_tooltips.ts` | `updateToolTipHandlers`, `updateToolTips`, `abortToolTips`, the `TextBox` late-bind hack | 195 |
| `ui_base_pick.ts` | `pickElement*`, geometry | 180 |
| `ui_savedata.ts` | module `4850–4979`: `PTOT`, `saveUIData`, `loadUIData` | 155 |
| `ui_base_props.ts` | accessors cluster, serialization stubs, `getZoom`, instance `getDPI` | 150 |
| `ui_theme_key.ts` | `styleScrollBars`, `_testSetScrollbars`, `_digest`, `calcThemeKey`, `_themeUpdateKey`, `flagThemeUpdate`, `setTheme` and its init call, `ErrorColors` | 130 |
| `ui_base_types.ts` | `UIBaseDefinition`, `DisableData`, `ToolTipState`, `EventIF`, `IUIBaseConstructor`, `DefaultTypes`, `StyleRecord`, `PackFlags`, new `TotalRect` / `FormatNumberArgs` / `PickArgs` | 95 |
| `ui_base_dpi.ts` | leaf free `getDPI()`; `static getDPI()` delegates | 20 |
| `ui_worker_shim.ts` | module `938–950` | 20 |

`ui_base_dpi.ts` is what makes `ui_icons.ts` and `ui_draw.ts` type-only
dependents of `ui_base.ts`. Their sole class reference is `UIBase.getDPI()` at
lines 603 and 4819, and `static getDPI()` is literally
`return window.devicePixelRatio;`.

## Cleanups folded into the same commits

**Named types for inline signature types (−41 in `ui_base.ts`).** These are
structurally identical replacements, so no consumer breaks. `getTotalRect`
returns `TotalRect | undefined` (18 signature lines down to 1);
`formatNumber(value, args: FormatNumberArgs = {})` (10 down to 1); `pickElements`
and `pickElement` share `PickArgs` (13 and 14 down to ~7 and ~8);
`removeEventListener`'s inline `cb` intersection (8 down to 5). Do not convert
`flash`, `pushModal`, `doOnce`, `traverse`, `dependsOn`, `getDefault*`,
`getClassDefault`, `loadNumConstraints` or `getStyleRecord` — those are
multi-line because they have many positional params, and collapsing them would
change the public API.

**Dead commented-out code that survives delegation (−17).** Most of the ~150
commented lines sit inside bodies that move anyway. Only `1520–1528`,
`3335–3341`, `48–56`, `984` and `4985` land in retained territory. Also drop the
unreachable returns at 620, 625–626 and 1692, the stray mid-file `// @ts-nocheck`
at 946, the shipped `debugger;` at 4629, the unreachable `SMALL_ICON` branch at
691 (`!PackFlags.LARGE_ICON` is a constant `false`), the empty
`static unregister` at 1761–1765, and the never-read `_last_description` and
`_checkTheme` fields. Deprecated-but-exported symbols (`IsMobile`, the module
`getDefault`, `marginPaddingCSSKeys`, `_testSetScrollbars`, `dpistack`,
`UIFlags`) are moved rather than deleted, since the API surface is preserved.

**`static graphNodeDef` (−9).** Move the object literal to `ui_base_graph.ts` as
`export const uiBaseNodeDef`, leaving
`static graphNodeDef = EventNode.register(this, uiBaseNodeDef);`.

**Deduplication that lands in the new files.** These are for quality rather than
budget, since the code leaves `ui_base.ts` either way. `drawRoundBox2` becomes a
thin shim over `drawRoundBox`. `_getFont_new`, `getFont`, `_getFont` and
`_ensureFont` collapse to one implementation plus aliases. `setBoxCSS` and
`genBoxCSS` share one `buildBoxCSS(elem, subkey, apply)`, which also fixes the
live `${val}` → `${val2}` bug at 2256 and the stray space at 2248. `hasDefault`,
`getDefault_intern` and `getStyleRecord` share one `walkStyleChain` helper.
`_hasSubDefault`, which ignores its `_themeDef` param, collapses into
`hasSubDefault`. `_hasClassSubDefault` routes through `getClassDefault`'s
fallback chain, resolving the `TODO: harmonize this to use getStyleRecord` at
4051. `IconManager.canvasDraw`, `getCSS` and `setCSS` share one
`withDrawSize(sheet, size, cb)`. `noMarginsOrPadding` imports
`marginPaddingCSSKeys` instead of rebuilding it inline, which is the only one of
these worth 2 lines in `ui_base.ts`.

**Reserve levers, to spend only if the measured number lands over 1200.** R2:
drop blank lines between consecutive 3-line delegates (−60). Prettier preserves
at most one blank line and never inserts one, so this is stable under
`format:check`. R1: relocate method JSDoc to the free functions (−98). This
degrades hover-docs for the public API, since TS does not inherit JSDoc through a
delegation, so spend it last. R3: trim the 8-line `SELF` JSDoc at 993–998 (−6).

## Order of work

Prep first, then the module-level moves, which are near-zero risk and prove the
`export *` and cycle mechanics before any behavior-bearing code moves, then the
class clusters least-coupled first, with the constructor last. Each step is one
commit gated on `pnpm run typecheck && pnpm run test && pnpm run format:check`.

**Step 0 — retarget the one real import cycle, as a standalone commit.**
`ui_base.ts:759` does `import { DataPathSetOp } from "../pathux";`, and its only
use is a type position at 3217. `DataPathSetOp` lives at
`scripts/path-controller/controller/controller_ops.ts:27` and is not re-exported
from `controller.ts`, so name that module directly:
`import type { DataPathSetOp } from "../path-controller/controller/controller_ops";`.
`controller_ops.ts` imports nothing from `scripts/core/`.

**Step P0 — prep, no extraction.** Delete the retained dead code from cleanup 2.
Rename `#reflagGraph` to `_reflagGraph`. Introduce `TotalRect`,
`FormatNumberArgs` and `PickArgs`, still inside `ui_base.ts`, and apply them to
the five signatures from cleanup 1. This lands at ~4930 lines and de-risks steps
8, 12 and 14.

### Phase A — module level, leaf first

1. `ui_base_types.ts` — zero runtime deps; surfaces any `import type` friction
   immediately.
2. `ui_base_dpi.ts`, then `ui_worker_shim.ts`. Verify the shim still runs before
   the class evaluates.
3. `ui_icons.ts` (488) — the biggest single win, with no class coupling. This is
   the canary for the `ui_base` ⇄ `ui_icons` cycle and for `export *` preserving
   `iconmanager`, `IconSheets` and `makeIconDiv`.
4. `ui_draw.ts` (351) — already free functions taking `elem`, so a straight move
   plus the font-alias collapse.
5. `ui_savedata.ts` (130). `ui_base.ts` imports `saveUIData` and `PTOT` back for
   the retained 3-line `saveData` and `loadData`.
6. `ui_theme_key.ts` — the highest module-order risk. Do it while the file is
   still mostly intact so a regression bisects easily. Gate additionally on
   `pnpm run gen:themes && pnpm run typecheck:themes`.
7. `ui_element_registry.ts`, plus the first delegation batch: the static
   registration methods, minus `internalRegister`. Gate on the theme-editor and
   custom-element registration tests.

After phase A the file is ~3200 lines, all module-level code is gone, and
delegation is proven on statics.

### Phase B — class clusters

8. `ui_base_theme_lookup.ts` — the largest class win (312) and nearly
   self-contained. Fold in the `walkStyleChain` collapse. Gate on
   `theme_editor.test.ts`, `theme_editor_widget.test.ts` and `gen:themes`.
9. `ui_base_tooltips.ts` — 152, three methods, isolated; carries the `TextBox`
   late-bind hack.
10. `ui_base_modal.ts` — 234. `_clipboardHotkeyInit` is one 115-line method. Gate
    on `clipboardDefer.test.ts`.
11. `ui_base_anim.ts` — 279.
12. `ui_base_css.ts` — 195.
13. `ui_base_datapath.ts` — 277. Gate on `pathWatch.test.ts`,
    `datapathErrors.test.ts`, `datapathWalker.test.ts`, `massSetPaths.test.ts`
    and `pnpm run gen:paths`. `UIBase.dataPathPolling` is read at 3816; pass it
    in rather than importing the class there.
14. `ui_base_pick.ts` — 109.
15. `ui_base_dom.ts` — 264. This is the `super.` to
    `HTMLElement.prototype.*.call` step; do it alone so a DOM-semantics
    regression is unambiguous. Gate on `dock_panels.test.ts`,
    `screenarea_switch_editor.test.ts`, `ui_tabs_*` and `ui_listbox_*`.
16. `ui_base_graph.ts` — 160; depends on the P0 rename. Gate on the eight
    `graph_*.test.ts` files.
17. `ui_base_props.ts` — 72; many small accessors, low risk.
18. `ui_base_init.ts` — last. The constructor alone is 205 of the saving but has
    the highest blast radius (field initialization order, `attachShadow`,
    `_idgen`). Every other test is green by then, so breakage is unambiguously
    the constructor.

### Phase C — cleanup

Prune the now-unused imports. 41 of the 71 module-level identifiers become
unreferenced (`util`, `math`, `cconst`, `aspect`, `contextWrangler`,
`DefaultTheme`, `parsepx`, the color helpers, most of the `simple_events`
bundle, several `toolprop` internals, `tagManager`, and others). Several must
now be imported back from the new files — `EventCBSymbol`, `tagPrefix` and
`internalElementNames` from `ui_element_registry`, `saveUIData` from
`ui_savedata` — which is already counted in the +22. Then measure; if the file is
over 1200, spend R2, then R1.

## Verification

Take a baseline before step 0: run `pnpm run emitTypes` and copy `types/` aside
as a pre-split snapshot. (A stale `.tmp-types/` may be sitting in the working
tree from an earlier session — regenerate rather than trusting it.)

After every step:

```bash
pnpm run typecheck
pnpm run test
pnpm run format:check
```

At each phase boundary, and at the end:

```bash
pnpm run gen:themes && pnpm run typecheck:themes   # strict getDefault typing
pnpm run gen:paths                                  # datapath catalog still walks
pnpm run build                                      # esbuild bundle, no cycle failures
pnpm run emitTypes                                  # then diff types/ against the snapshot
```

The declaration diff for `types/core/ui_base.d.ts` must be empty except for the
one `_reflagGraph` field line. Anything else in that diff is an API-surface
regression and has to be fixed before the step lands. New `types/core/ui_*.d.ts`
files appearing is expected and harmless.

Two behavioral checks the test suite does not cover directly:

- Read `ui_base._themeUpdateKey` through a namespace import after calling
  `flagThemeUpdate()`, confirming the live binding survives `export *`.
- Import `pathux` in a context where `typeof HTMLElement === "undefined"` to
  confirm `ui_worker_shim.ts` still evaluates before the class does.
  `pnpm run gen:themes` exercises this path too.

Finally, launch the example app with `pnpm nwjs` and exercise icons, tooltips,
the theme editor, node editor drag gestures and dock panels — the areas whose
code moved furthest.
