# Plan: theme variables in the theme editor

Status: **done**. Gives `ThemeEditor` the original untransformed theme (the
variable-carrying record plus its variable definitions), and the UI to add
variables, remove them, and bind theme slots to them.

## Context

path.ux already has a theme-variable system and an editor, but they do not know about each
other.

`scripts/core/ui_theme_utils.ts` implements variables at authoring time: `ThemeVar` is a
placeholder holding a variable name, `getVars` builds one per key, `instanceThemeVars(theme,
vars)` substitutes the values in, and `createThemeFile` writes the theme back out as TypeScript
source with each bound slot written as `vars.foo`. `documentation/theming.md` describes the
intended cycle: the theme file is the source of truth, the app loads it with
`setTheme(instanceThemeVars(theme, themeVars))`, and an Export button regenerates the file.

`scripts/widgets/theme_editor.ts` edits only the live global `theme`, which holds resolved
values — `instanceThemeVars` deep-copies, so no `ThemeVar` survives into it and nothing on
screen can tell that two slots came from one variable. The editor has no way to add a variable,
remove one, or point a slot at one, and a client that wants to export its edits has to
hand-write the `mergeEdits` walk that theming.md spells out at lines 277–329.

## Key design decisions (settled)

- Editing a slot bound to a variable edits **the variable**, so every slot using it updates
  live. Detaching is a separate, explicit action on the row.
- Deleting a variable still in use **inlines its current value** at every referencing slot, so
  nothing on screen changes, then removes it from `themeVars`.
- With no untransformed theme set, the widget behaves exactly as it does today.
- The editor deep-copies the records it is handed and never writes through to the caller's
  module state. An app that keeps its `themeVars` for a variant (theming.md:112-118) is
  unaffected by editing.

## Approach

### 1. Pure variable operations in `ui_theme_utils.ts`

Add exported, DOM-free helpers beside the existing ones, so the editor stays thin rendering and
the rules are unit-testable (this file already has `tests/ui_theme_utils.test.ts`):

- `copyThemeItem(item, vars?)` — promote the private `copyItem` (ui_theme_utils.ts:108).
  `copyRecord` and `instanceThemeVars` keep using it. It is the one copy definition, shared by
  the broadcast write, delete-inlining and the copy-in of the caller's records.
- `itemAt(rec, path)` / `hasItemAt(rec, path)` / `setItemAt(rec, path, item)` /
  `deleteItemAt(rec, path)` — walk a `string[]` path. `hasItemAt` tests with `key in rec`,
  because `undefined` is a real theme value (ui_theme.ts:41-42) and `itemAt` cannot tell it
  from an absent key. `setItemAt` seeds an intermediate it has to create from the live
  object's constructor, so a `ThemeScrollBars` is never replaced by a plain object —
  `FrameManager.ts:1426` silently skips one that is not an instance.
- `toLivePath(varPath)` — the `compatMap` mapping, in one place (see §2).
- `varSlots(varTheme, varKey): {varPath, livePath}[]` — every slot referencing a variable.
- `bindSlot(varTheme, varPath, varKey)` / `unbindSlot(varTheme, vars, varPath)`. Detach reads
  the variable and writes a `copyThemeItem` of it, so there is no caller-supplied value to
  mismatch.
- `addVar(vars, key, value)` — trims, and refuses an empty name, a duplicate, `__proto__`, and
  a name containing a newline (which would corrupt comment emission at ui_theme_utils.ts:331).
  Non-identifier names are allowed; `writeKey` already quotes them.
- `deleteVar(varTheme, vars, key)` — inlines a `copyThemeItem` at **every** reference, including
  slots the UI never shows, then deletes the key. A missed reference makes the next
  `instanceThemeVars` throw (line 111).
- `renameVar(varTheme, vars, comments, from, to)` — rewrites every reference and the comment,
  and refuses a rename onto an existing key.

Variables hold literal values only. `copyItem` already resolves a variable whose value is
another variable, but nothing bounds a cycle, so the UI never offers a variable as a variable's
value.

Path identity is `JSON.stringify(path)`, not `path.join(".")` — real theme keys carry `-`
(`"border-radius"`) and the `+` menu (theme_editor.ts:221) lets a user type a dot.

### 2. Applying an edit to the live theme

Do not re-run `setTheme(instanceThemeVars(...))` after each edit. `setTheme`
(`scripts/core/ui_base.ts:165`) merges only two levels deep, assigns third-level sub-records by
reference, and rewrites `compatMap` keys **in the record it is handed** (`delete vRec[k2]`, line
197), so a round trip is lossy and re-entrant. Nothing derived from `varTheme` is ever passed to
`setTheme` without a copy.

Instead the editor writes the resolved value straight into the live theme, as the row builders
already do. Changing a variable calls `varSlots` and writes an independent `copyThemeItem` at
each referencing path — handing one `CSSFont` to N slots would work until a detach, then edits
would bleed between them.

Three details this has to respect:

- **`compatMap` renames.** `setTheme` rewrites **level-2** keys — the key inside a style class,
  which is exactly what `doFolder` edits. The map is many-to-one: `BoxBG`, `BoxSubBG`,
  `DefaultPanelBG`, `Background` and others all collapse to `background-color`, so an authored
  `base: { BoxBG: vars.x }` lives at `theme.base["background-color"]` at runtime. `toLivePath`
  applies `compatMap` to `path[1]` and the binding index is keyed by the **live** path; the
  mapping is never inverted. Two legacy keys in one class collapsing onto one live key means one
  authored slot wins at load — the editor warns once rather than binding both.
- **Lazy `varTheme` entries.** The live theme is path.ux's whole `DefaultTheme`; mirroring it
  into `varTheme` would export all of it. Entries are created on bind or on first edit only,
  which is also what removes theming.md's "a style class the file never mentions is not
  exported" caveat (lines 327-329). A created entry is written under the renamed key.
- **Seeding a sub-record.** Creating a level-1 style class is safe, because `setTheme` merges
  level 2 key by key. A newly created **level-3** sub-record must be seeded from the current
  live values, because a partial one is assigned by reference (ui_base.ts:201) and would replace
  the default's wholesale at the next load. The cost — seeding freezes path.ux's current
  defaults into the app's file, so a later library upgrade does not reach those keys — is
  documented, and seeding happens only when the editor actually creates the sub-record.

### 3. A `ValueSlot` seam in the editor

`colorRow` (theme_editor.ts:313), `stringRow` (337), `numberRow` (355), `boolRow` (372) and
`fontPanel` (385) each hardcode `resolveRecord(path)[key] = …`. Refactor them against
`interface ValueSlot { get(): ThemeItem; set(v: ThemeItem): void }` so the same builders serve
three cases: a plain theme slot, a var-bound theme slot (the write redirects to the variable and
fans out to every user), and a row in the Variables panel.

Two hazards this seam has to close:

- **`fontPanel` mutates a `CSSFont` in place** (lines 396, 405, 415) and takes no `path`. For a
  variable's font that updates one of the N independent live copies and leaves the rest stale.
  It gains a `path` and deals in whole values instead: read, `.copy()`, mutate the copy, `set()`
  it, and let the ordinary broadcast make the N copies. That also removes the last place
  assuming a live value's object identity is stable.
- **Refresh feedback loops.** `boolRow` already documents that assigning `check.value` fires
  `on_change` (lines 374-375). A variable edit refreshes sibling rows bound to the same
  variable, each refresh re-fires that row's `on_change`, which writes the variable again — two
  rows on one variable ping-pong. Every refresh runs under a `_refreshing` flag that makes
  `set` a no-op, and the broadcast skips the originating row.

Refresh callbacks are registered on the editor as `{widget, refresh}` entries, filtered by
`isDead()` (ui_base.ts:3439) at broadcast time and cleared in `build()`, because
`rebuildFolder` (line 247) discards a subtree whose callbacks would otherwise write into
detached rows.

### 4. UI

- A **Variables** panel at the top of `build()`, present only when an untransformed theme is
  set, with an explicit `panel(name, id)` id so `saveUIData`/`loadUIData` keeps its open state
  across a rebuild. One row per variable: its value editor chosen by `themeItemKind`, a use
  count taken from `varTheme` (so `"flag"`-skipped and `undefined`-valued slots still count), an
  editable comment textbox (fed to `createThemeFile`'s `varComments`), and a delete button whose
  confirmation says the value is inlined everywhere it is used. A textbox plus a "+" menu adds
  one (Float / Color / String / Bool / Font), mirroring `addPropMenu` (213).
- Every theme value row gains a binding menu naming its variable, built lazily on click
  (`menu()`'s `_build_menu`, ui.ts:801) rather than materialised per row — the live theme has
  hundreds of rows. It offers the compatible existing variables, "New variable from this
  value", and "Detach" when bound.
- Compatibility is `themeItemKind` of the **live** value against the variable's value, with
  `color` and `string` mutually compatible and `number` / `boolean` / `font` / `record` strict.
  `colorRow`'s existing try/catch (lines 322-327) stays, because a hand-authored file can still
  bind a font into a colour slot.
- Binding is offered for whole values only. A `ThemeVar` cannot sit inside a `CSSFont` or a
  `ThemeScrollBars`, so those get a menu on the value itself and none on their sub-keys.
- "New variable from this value" auto-names `<class>_<key>`, deduped, and opens the Variables
  panel row for renaming rather than prompting — the widget has no modal, and `renameVar` makes
  the rename cheap.
- A record-valued variable (legal, since `ThemeItem` includes `ThemeRecord`) is displayed as a
  sub-panel of leaf editors that write into the variable's record and rebroadcast. The editor
  never creates one.
- `ThemeChangeEvent` gains an optional `varKey`, dispatched once per variable edit rather than
  once per affected slot; `category` and `key` keep naming the originating slot.

Every control carries a tooltip, and rebuilds use the existing `rebuildFolder` idiom
(saveUIData → clear → rebuild → loadUIData) so open panels stay open.

`invertTheme()` (ui_theme.ts:253) rewrites live colours in place behind the editor's back and
would desync every binding's displayed value. This is documented rather than guarded.

### 5. Export, and the docs

Add `ThemeEditor.createFile({existingThemeFile?, importPath?, onAssemble?})`, returning
`createThemeFile`'s source from the editor's own untransformed theme, variables and comments.
That retires the `mergeEdits` recipe: the editor now owns the authored record, so an edit at a
bound slot is no longer silently dropped on export. `setVarTheme` seeds `varComments` from
`parseVarComments` when handed the existing file, so the comment fields come up populated. The
legacy `exportTheme` (ui_theme.ts:316) is left alone.

Rewrite theming.md's "Merging live edits back into the var theme" (lines 277-329) as the
`setVarTheme` / `createFile` flow, and extend "The theme editor widget" (223-242) with the
Variables panel, the edit-the-variable and delete-inlines rules, the `compatMap` renaming note,
the seeded-sub-record trade-off and the `invertTheme` caveat. Re-run `pnpm run markdown-toc`.

### 6. Demo in the example app

The theme tab is live (`example/page.tsx:26-29`, covered by `playwright/basic.spec.ts:15`); only
the duplicate block in `example/editors/properties/properties.ts` after the bare `return;` at
line 138 is dead, and it should go regardless. Convert `example/theme.ts` to a variable-carrying
theme with about four variables (accent, background, radius, body font) on a handful of slots —
not all 515 lines — load it in `example/core/app.ts:416` with `instanceThemeVars`, hand both
records to the editor through a JSX `ref`, and repoint the Export button (`properties.ts:75-77`,
handler at 104) at `createFile`. The example is bundled by rollup rather than vite, so `?raw` is
unavailable: either fetch `./theme.ts` over HTTP at export time or ship without
`existingThemeFile` and rely on the editor's own comment fields. This is the only end-to-end
check that a generated file loads back.

## Stages

Each stage leaves `pnpm run typecheck`, `pnpm test` and `pnpm run format:check` green.

1. **Variable operations.** The helpers in §1. Tests in `tests/ui_theme_utils.test.ts`:
   inline-on-delete keeps N independent copies and `instanceThemeVars` does not throw
   afterwards; `toLivePath` maps `BoxBG` to its live key; `setItemAt` preserves a
   `ThemeScrollBars` intermediate; `hasItemAt` separates an `undefined` value from a missing
   key; `renameVar` moves the comment and refuses a collision.
2. **The `ValueSlot` refactor.** No behaviour change, plus the `fontPanel` whole-value rewrite
   and the `_refreshing` flag. A new `tests/theme_editor_widget.test.ts` on the happy-dom setup
   from `tests/dock_panels.test.ts:16-38` (window shim, canvas `getContext` proxy) asserts a
   slider and a checkbox still write the live theme.
3. **Variable mode plumbing.** `setVarTheme` / `getVarTheme` / `getThemeVars` (deep-copying in,
   rebuilding only when `_init_done`, since `init()` calls `build()` on connect), the binding
   index, the callback registry, and the broadcast write of §2. Tests: two slots on one
   variable both update and hold distinct objects; a shared `CSSFont` variable does not share
   identity; a bounded number of `set` calls proves there is no feedback loop.
4. **Variables panel and bind menus.** The panel, the per-row lazy menu, lazy entry creation
   with level-3 seeding. Tests: binding an unmentioned slot creates the entry under the renamed
   key with a seeded sub-record; deleting a variable leaves every live value unchanged.
5. **Export and docs.** `createFile`, the theming.md rewrite, the TOC, and a round-trip test
   through `parseVarComments`.
6. **Example app.** The conversion in §6, the dead block deleted, and a refreshed playwright
   baseline for the theme tab.

Do not name the editor's field `theme`; the module imports a `theme` at line 1 and shadowing it
inside methods is a live footgun.

## Files

- `scripts/core/ui_theme_utils.ts` — the variable operations.
- `scripts/widgets/theme_editor.ts` — `ValueSlot`, variable mode, the panel, the binding menu,
  export.
- `tests/ui_theme_utils.test.ts`, `tests/theme_editor.test.ts`,
  `tests/theme_editor_widget.test.ts` — unit and happy-dom coverage.
- `documentation/theming.md` — the rewrite.
- `example/theme.ts`, `example/core/app.ts`, `example/page.tsx`,
  `example/editors/properties/properties.ts` — the demo.

Read-only, but load-bearing: `scripts/core/ui_base.ts` (`setTheme`, 165-207) and
`scripts/core/ui_theme.ts` (`compatMap`, 57-75).

## Verification

- `pnpm run typecheck && pnpm test && pnpm run format:check`.
- `pnpm run gen:themes --strict && pnpm run typecheck:themes` — the editor reads theme keys, so
  the catalog check should stay green.
- `pnpm electron` (or `pnpm nwjs`), then the Theme tab: add a variable, bind two slots to it,
  drag its colour and watch both repaint, detach one, delete the variable and confirm nothing on
  screen moves. Drive it over CDP with `pnpm cdp` where clicking by hand is awkward.
- Bind a slot in a class the theme file does not mention, export, and confirm the generated
  source carries the new class with the renamed key.
- Export and check the rest of the source: bound slots read `vars.foo`, comments survive, and
  re-importing the file reproduces the same screen.
- `pnpm run playwright` — the theme-tab screenshot test still passes.
