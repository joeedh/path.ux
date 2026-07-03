# Plan: datapath update-notification system

Status: proposed. Author-reviewed design; to be executed in a fresh session.

## Goal

Move the datapath controller from ~100% poll-based updates to a **push +
coalesced** model, without regressing behavior. Widgets subscribe to their
datapaths and react to change notifications; the old per-frame poll is retained
as a globally- and per-widget-toggleable safety net for un-instrumented writes.

Two halves, already partly built:

- **Write side (done, on this branch):** the typed `api.updateFrom<T>(path, prop)`
  / `updateChanged<T>(prop)` API + generated `StructCatalog` (see
  `generated/struct-catalog.ts`, `buildtools/gen-datapaths.mjs`,
  `buildtools/resolve-struct-imports.mjs`). These currently call a stub
  `DataAPI.notifyChange`. This plan makes `notifyChange` real.
- **Read side (this plan):** a `DataPathWatcher` that owns change-detection, a
  subscription registry keyed by path string, rAF coalescing, and a
  `UIBase.watchPath()` / `updateFromPath()` widget protocol that replaces every
  `updateDataPath()` override.

## Key design decisions (settled)

1. **Subscriptions key on the path string, not model object identity.** Widgets
   must never hold model instances. Both reads and writes already address data
   by path (`getPathValue`, `setPathValue`, `updateFrom`), so the path string is
   the common key. Consequence: the registry holds only strings + weak widget
   refs — no model object is ever retained, so the hard GC-leak class cannot
   occur.
2. **Change-detection moves entirely into the controller layer.** Today each
   widget re-reads its value and does an inline `val !== this._value` compare in
   `updateDataPath()`. That logic (read + snapshot + prop-aware compare +
   resolved/undefined handling) becomes `DataPathWatcher`. Widgets supply only a
   reaction. This also fixes the latent bug that `!==` does not detect in-place
   mutation of vector/array props.
3. **`updateDataPath` is split and deleted.** Each override becomes:
   - `watchPath()` — declares the widget's binding(s) once (calls
     `this.addPathWatch(path, opts)`); replaces nothing at runtime beyond setup.
   - `updateFromPath(value, info)` — the reaction (the former post-diff body:
     state update + `_redraw()`/`setCSS()`). Invoked by the watcher on change.
   The base `ValueButtonBase.updateDataPath` and every other `updateDataPath`
   are removed; `super.updateDataPath()` chains (NumSlider) are untangled into
   `super.updateFromPath()`.
4. **Compat = keep the behavior, retire the code pattern.** A global
   `UIBase.dataPathPolling` (default `true`) makes the base `update()` drive each
   registered watcher in poll mode, reproducing today's 150 ms re-read+diff.
   Per-widget `this.pollDataPath: boolean | "auto"` overrides it. Push reactions
   fire on the controller's rAF flush (~16 ms), independent of the 150 ms Screen
   timer, so migrated widgets get *more* responsive, not less.
5. **Debouncing is per-binding**, owned by the watcher: `raf` (default),
   `{ trailing: ms }` for heavy widgets (curve, colorpicker), or `immediate`.

## Prerequisite: reconcile branches

This feature branch (`feature/datapath-update-notify`, both parent and
`path-controller` submodule) was cut **before** master gained the NW.js/Electron
CDP tooling (`68271954`, `5d17dc2d`: `buildtools/{nwjs,electron,cdp}.mjs`,
`pnpm nwjs`/`pnpm electron`/`pnpm cdp`). Phase 4 verification needs it.

**First step in the execution session:** merge (or rebase onto) master to pick up
the CDP driver, keeping the branch's typed-`updateFrom` work. Resolve any
`CLAUDE.md`/`package.json` overlaps. Confirm `pnpm nwjs` launches and
`pnpm cdp pages` connects before starting Phase 4.

---

## Phase 1 — Controller runtime (`scripts/path-controller/`, submodule)

Commit in the submodule first, then bump the parent gitlink (branches match →
co-commit per CLAUDE.md).

1. **Subscription registry.** Start with a flat `Map<string, Set<Sub>>` keyed by
   normalized path string (v1); leave a `TODO` to upgrade to a segment **trie**
   for targeted subtree invalidation (structural/pointer changes invalidate all
   child paths). A `Sub` holds `{ ref: WeakRef<object>, cb, debounce state }`.
   - Register a `FinalizationRegistry` that prunes dead `WeakRef` entries and
     empty buckets.
2. **`notifyChange(path?, prop?)` → coalescing.** Replace the stub. Mark matching
   subscriptions dirty into a module-level `dirty: Set<Sub>` (or
   `Map<Sub,…>`); schedule one `requestAnimationFrame(flush)` if not already
   scheduled. `flush()` drains, invoking each dirty sub's callback once. Dedup is
   inherent (Set). `updateFrom`/`updateChanged` already funnel here.
   - Guard `requestAnimationFrame` for non-DOM/test/node contexts (fallback to a
     microtask or synchronous flush behind a flag, so vitest can drive it).
3. **Emit on write.** Have `setPathValue` / `pathSocketUpdate`
   (`ui_base.ts:3136` calls it) emit `notifyChange(path)` at the existing choke
   point. Raw `obj.foo = …` mutations remain invisible → that's what the poll
   safety net and the coarse epoch counter cover.
4. **Coarse structural epoch.** Add a global generation counter bumped on
   tree-shape changes (active-object switch, list insert/remove, context swap),
   mirroring the `_themeUpdateKey` idiom (`ui_base.ts:3490`). Watchers cache
   `_lastGen`; on mismatch they re-resolve their path and re-file their reverse
   index. This is the fallback for "the owner moved out from under me."
5. **`DataPathWatcher`.** The single home for change detection:
   ```ts
   class DataPathWatcher {
     constructor(ctx, path, onChange: (value, info) => void, opts)
     private resolve()           // resolve once; cache leaf identity (struct,prop,subkey)
     private equals(a, b)        // prop-aware: scalars, enums, AND vectors/arrays
     poll(): boolean             // re-read, structural diff vs snapshot, fire onChange if changed
     markDirty()                 // push: flipped by notifyChange
     tick()                      // called per Screen frame; polls iff polling enabled
     flush()                     // push: if dirty, fire onChange (debounced)
     remove()                    // unsubscribe + prune
   }
   ```
   - `info = { resolved: boolean, path, prop }` so the widget can fold the
     former `val === undefined → internalDisabled` handling into `updateFromPath`.
   - `equals` uses the resolved `ToolProperty` type to compare correctly
     (vectors via component/`equals`, enums by value, etc.).
   - Reverse index for `updateChanged<T>(prop)`: at subscribe time, file the
     watcher under `(structName, prop)` derived from the resolved leaf, so a
     type-scoped notify (no path) can wake it.
6. **`DataAPI.watch(ctx, path, cb, opts): DataPathWatcher`** + `subscribe` /
   `unsubscribe` primitives. `watch` creates the watcher and registers its `Sub`.
7. **Debounce utility** (`raf` | `{trailing:ms}` | `immediate`), owned by the
   watcher so no widget re-implements it.

**Phase 1 tests (vitest):** value change fires once; 1000 sets → one callback
(coalescing); vector in-place mutation detected; unsubscribe stops callbacks and
prunes; `updateChanged` wakes by `(struct,prop)`; poll mode matches push result.

---

## Phase 2 — UIBase integration (`scripts/core/ui_base.ts`, `scripts/core/ui.ts`)

1. **Watcher storage + protocol.** Add `_pathWatchers: DataPathWatcher[]` and:
   - `addPathWatch(pathOrAttr, opts?)` — resolves the attr (default `"datapath"`),
     creates `ctx.api.watch(...)` with `(v, info) => this.updateFromPath(v, info)`,
     stores it. Idempotent per path.
   - `watchPath(): void` — **overridable** hook where a widget declares its
     binding(s) by calling `addPathWatch`. Base implementation: if the widget has
     a `datapath` attribute, `addPathWatch("datapath")`. Called once ctx +
     datapath are available.
   - `updateFromPath(value, info): void` — **overridable** reaction. Base
     implementation empty (or sets `this._value` for value-typed widgets — decide
     during Phase 3 against `ValueButtonBase`).
2. **Lifecycle.** Invoke `watchPath()` from `_init`/`onadd` once `ctx` is set
   (`ui_base.ts:2688`, `3704`); re-run when the `datapath` attribute changes
   (rebuild watchers); call `w.remove()` for all watchers on remove/disconnect
   (`disconnectedCallback`, `ui_base.ts:1982`, and the tree-removal path). The
   `FinalizationRegistry` from Phase 1 is the safety net for anything missed.
3. **Poll driving = the compat bridge.** In base `update()`, replace the
   scattered per-widget `this.updateDataPath()` calls with:
   ```ts
   if (UIBase.dataPathPolling && this.pollDataPath !== false) {
     for (const w of this._pathWatchers) w.tick();  // poll mode
   }
   ```
   Add static `UIBase.dataPathPolling = true` and instance `pollDataPath:
   boolean | "auto" = "auto"`. `"auto"` = poll unless every one of the widget's
   paths is confirmed push-covered (start conservative: `"auto"` polls).
4. **Delete `updateDataPath`** from the base(s) once Phase 3 removes all
   overrides. No base method remains.

---

## Phase 3 — Widget migration (17 sites, 10 files)

For each site: (a) move the value read+compare out (the watcher does it), (b) turn
the post-diff body into `updateFromPath(value, info)`, (c) add a `watchPath()`
override only if the widget binds a non-default path or multiple paths, (d) delete
the `updateDataPath()` override and any `this.updateDataPath()` call in `update()`.

Inventory (class — file:line):

| Class | File:line | Notes |
| --- | --- | --- |
| `Label` | `scripts/core/ui.ts:172` | reads path, unit-formats, sets `innerText`; keep the `units.buildString` formatting **inside** `updateFromPath`. |
| `ValueButtonBase` | `scripts/widgets/ui_widgets.ts:97` | the shared base; `NumSlider` chains `super`. Define base `updateFromPath` here (sets `this._value`). |
| `Check` | `scripts/widgets/ui_widgets.ts:345` | boolean; folds `internalDisabled` on unresolved. |
| `IconCheck` | `scripts/widgets/ui_widgets.ts:927` | extends `IconButton`. |
| `VectorPopupButton` | `scripts/widgets/ui_widgets2.ts:85` | extends `Button`; vector value — verify `equals` handles it. |
| `VectorPanel` | `scripts/widgets/ui_widgets2.ts:428` | extends `ColumnFrame`; likely watches multiple component paths. |
| `TextBox` | `scripts/widgets/ui_textbox.ts:308` | extends `TextBoxBase`. |
| `RichEditor` | `scripts/widgets/ui_richedit.ts:242` | extends `TextBoxBase`. |
| `RichViewer` | `scripts/widgets/ui_richedit.ts:324` | extends `UIBase`. |
| `Curve1DWidget` | `scripts/widgets/ui_curvewidget.ts:513` | heavy redraw → `{ trailing: … }` debounce. |
| `ColorPicker` | `scripts/widgets/ui_colorpicker2.ts:1277` | extends `ColumnFrame`; vector/color; heavy. |
| `ColorPickerButton` | `scripts/widgets/ui_colorpicker2.ts:1707` | extends `UIBase`. |
| `NumSlider` | `scripts/widgets/ui_numsliders.ts:171` | calls `super.updateDataPath()` (line 211) → rewrite to `super.updateFromPath()`. |
| `NumSliderSimpleBase` | `scripts/widgets/ui_numsliders.ts:1152` | extends `UIBase`. |
| `SliderWithTextbox` | `scripts/widgets/ui_numsliders.ts:1975` | extends the simple base. |
| `DropBox` | `scripts/widgets/ui_menu.ts:1063` | extends `OldButton`. |
| `ListBox` | `scripts/widgets/ui_listbox.ts:493` | already partly DOM-event based; align. |

Special cases:
- **Inheritance chains** (`ValueButtonBase`→`NumSlider`,
  `TextBoxBase`→`TextBox`/`RichEditor`, simple-slider chain): define
  `updateFromPath` on the base, extend via `super.updateFromPath(...)`.
- **Multi-path widgets** (`VectorPanel`, color/curve): `watchPath()` calls
  `addPathWatch` once per component/sub-path; `updateFromPath(info.path…)` or a
  per-path callback distinguishes them.
- **Formatting widgets** (`Label`): unit formatting stays in the reaction.

Do the base classes (`ValueButtonBase`, `TextBoxBase`) and one leaf (`Check`)
first as the reference conversions, then the rest.

---

## Phase 4 — Compatibility & verification

1. **Defaults preserve behavior.** `UIBase.dataPathPolling = true`,
   `pollDataPath = "auto"` → every widget still polls, so with push doing nothing
   observable the app behaves exactly as today. Then flip individual migrated
   widgets to push-primary and confirm.
2. **Static/unit.** `pnpm run typecheck`; `pnpm run gen:themes &&
   pnpm run typecheck:themes`; `pnpm run gen:paths &&
   pnpm exec tsgo --noEmit -p tsconfig.structcatalog.json`; `pnpm test`.
3. **Playwright** widget DOM tests.
4. **CDP smoke test (real app)** — the reason to reconcile with master:
   - `pnpm nwjs` (or `pnpm electron`), then drive with `pnpm cdp`.
   - **Push works:** `pnpm cdp eval "<mutate a brush value via api.setPathValue / a tool>"`, then screenshot and confirm the bound slider/label updated **without** waiting for the 150 ms poll (temporarily set `UIBase.dataPathPolling=false` via `pnpm cdp eval` to prove push alone drives it).
   - **Coalescing:** instrument a redraw counter; `eval` a loop of 1000
     `setPathValue` on one path in a frame; assert one reaction/redraw.
   - **Poll fallback:** with `dataPathPolling=true`, mutate the model **raw**
     (bypass `setPathValue`) and confirm the widget still catches up on the next
     poll tick.
   - **No leak:** open/close a panel many times; `eval` the registry size and
     confirm it returns to baseline (deterministic unsubscribe + FR pruning).
   - Remember the `devicePixelRatio` gotcha when converting screenshot pixels to
     click coords.

---

## Phase 5 — Docs & cleanup

- Update `CLAUDE.md`: new "Datapath updates" section — `watchPath()` /
  `updateFromPath()` protocol, `dataPathPolling` / `pollDataPath`, `updateFrom<T>`
  for the write side, debounce options. Note `updateDataPath` is removed.
- Update `documentation/controller.md` with the subscribe/notify overview.
- Keep `tsconfig.structcatalog.json` as the opt-in typed-`updateFrom` check;
  wire `pnpm run gen:paths --strict` + that typecheck into CI (mirrors the theme
  guardrails).
- `generated/` stays gitignored (build artifact); nothing to commit there.

## Out of scope (follow-ups)

- Trie upgrade for targeted subtree invalidation (v1 ships the flat map + epoch).
- Indexed-path (`foo[n].bar`) exact typing for `updateFrom` — needs the runtime
  index arg; today those structs get `paths: never` and use `updateChanged<T>`.
- Migrating the remaining `on_change` callbacks to DOM `CustomEvent`s (separate
  in-flight direction; align opportunistically).
