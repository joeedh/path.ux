# path.ux

HTML5 UI library with Blender RNA-style data binding.

## Plans
- plans live in documentation/plans
- plans should always be committed to the repo
- plans should be pressure tested with an agent with fresh context when created, 
  and the pressure tested results folded back into the plan
- when executing plans the status of each stage/task/phase/wave/etc
  should be written into the plan itself and marked as completed when done.
  
## ToDos
- A todos list lives in `todos.md` and is committed to the repo. Check items off
  as they are completed.

## Comments

Comments are prose, so the Prose rules below govern them as well. The rules in this section
are the ones that apply only to code.

- **A comment describes the code directly beneath it.** A comment placed above an `if` is read
  as a caption for the branch it guards, so one that explains the opposite case belongs on the
  `else`, or should be reworded to describe the test itself. Misplacing a comment this way is a
  correctness bug, not a style one.
- **Delete commented-out code — never leave it as commentary.** Git history holds it. A
  commented-out call, import or block explains nothing about the code that survives, and it
  goes stale silently because nothing type-checks it.
- **Never restate what the code already says.** `inputs: {}, //tool properties` and
  `case keymap.Escape: //esc` add a maintenance burden and no information. A comment earns its
  place by giving a reason, a constraint, or a consequence.
- **Cite a named constant rather than its value.** A comment saying "thirty seconds" beside
  `LINGER_MS` is wrong the first time the constant changes; write `` `LINGER_MS` ``.
- **Rename instead of commenting a name.** If the sentence's work is translating an
  identifier — what `snapMode` means, what a bare `-1` means — rename the identifier or
  introduce a named constant, then delete the sentence. Comment a name only when the name
  cannot be fixed. Try to avoid names longer than three words or 25 characters
  (10 characters or less is preferred).
- **Comment the consequence, not the arguments.** Options passed at a call site (`capture`,
  `passive`, a flag, a lifetime) are already on screen. Say what the reader cannot see: what
  the call does to everything around it. "Does not inhibit the event from reaching other
  consumers" earns its line; "registered `passive` so it cannot call `preventDefault`" does not.
- **State facts; do not defend the design.** Rationale belongs in a comment only when a reader
  looking at the surrounding code still could not derive it — an ordering constraint, a platform
  quirk, a decision with a live alternative. "Why this is the good version" and "what would go
  wrong under the naive one" are commit-message material.
- **A doc comment continues its declaration; it does not restate it.** Do not re-supply the
  subject the declaration already names, and do not narrate the signature. A field or property
  takes a noun phrase or a bare predicate — "Pointer ids currently down.", "Detected via the
  presence of multiple pointer ids." A class, function or method takes a predicate, because the
  reader needs to know what it does — "Draws the links beneath the node frames in screen space."
  A headless noun phrase over a class or a function is a fragment opener; do not use one.
  A doc comment that reads as a standalone paragraph is usually rationale in disguise.
- **Inline notes and doc comments are punctuated differently.** An inline `//` note is a
  fragment with no terminal period; a `/** … */` doc comment is a punctuated sentence. One
  line each, unless the fact genuinely needs two.
- **Non-doc comments use `//`.** Doc comments use proper `/** … */` brackets. Don't use
  `/* … */` for ordinary inline commentary.
- **Non-doc comments are at most 3 lines.** A longer block comment is allowed sparingly —
  budget roughly one per 500 lines of a file — for genuinely load-bearing context that
  can't be stated in three lines.
- **Doc comments stay reasonably concise.** Say what the thing is and any non-obvious
  contract; don't restate the signature or narrate the implementation.
- **Temporary comments are marked `CLAUDENOTE:`.** Any scratch/working comment Claude
  writes gets that prefix, and all of them must be removed before the final commit of a
  plan (or at the end of the plan, whichever comes first).

### Prose

These rules govern every piece of prose in the repository. They apply to code comments, to
this file, and to everything under `documentation/`.

- **Write plain declarative prose — no epigrams.** State the constraint or decision
  directly: "An empty answer is deliberate and is passed to the model as-is", not "Empty is an
  answer — silence, said out loud." If a sentence needs a second read to parse, rewrite it.
  Specific patterns to catch:
  - **Inverted syntax and personification** — the sentence performs rather than informs.
  - **Metaphorical equations** — "The leak scan is the refusal", "what ships is identity",
    "the project as commands". The connector word varies — do not get hung up on "is"
    versus "as". Say what happens instead: "Refuses if the leak scan finds a known name
    still in the body."
  - **Fragment openers that defer the subject — never use this pattern.** Naming a placeholder
    and then withholding the real content behind a colon or a dash is always wrong: "The
    redactor to scan a report with: the one that wrote it, else one built from the project as it
    stands." Lead with a complete sentence and name each case as you reach it. A doc comment is
    not an exception, and deleting the label is not the fix, because the apposition left behind
    is still headless. Supply a predicate instead. Write "Draws the links beneath the node
    frames in screen space." rather than "The link underlay: a screen-space canvas beneath the
    node frames." or the bare "Screen-space canvas beneath the node frames."
  - **Double negatives** — "the palette cannot be relied on not to". State the positive claim.
  - **Pronouns and ellipses that point outside the sentence** — "the second case", "asking
    twice is how…" — each sentence should carry its own referents.
  - **"Clause A, else B" constructions** — "Resolve a push's destination: the named window
    when it still exists, else the focused window falling back to the most recently focused
    one." Spell out the cases as ordinary sentences instead: "Pushes to the named window if it
    still exists. Otherwise pushes to the focused window, or the most recently focused window
    if none is focused."
  - **Adverbs hung off the end of a noun phrase** — "the next pointerdown anywhere", "the
    handler above". The adverb postmodifies the noun, but the reader cannot tell on first pass
    whether it attaches to the noun or to the clause's verb, and an event or API name coined
    from a verb ("pointerdown") re-parses as a clause when an adverb follows it. Attach the
    qualification to a verb, or state it as its own fact: "the listener is on `window`".
  - **Non-assertive words under a definite** — "any", "anywhere", "ever" range over
    alternatives, so they fight a definite description that names exactly one thing. "A press
    anywhere dismisses it" reads fine; "the next pointerdown anywhere" does not.
  - **Rhetorical emphasis** — bold and italics inside a sentence mark the clause the author
    found most interesting, not the one the reader needs first. Put the load-bearing claim in
    the first sentence and drop the markup. A bolded lead-in that labels a Markdown bullet is
    structure rather than emphasis, and is fine.
  - **A head noun that is not what the thing is** — a module of commands documented as "The
    prompt an asset is generated from, as commands" asserts that the module is a prompt, then
    retracts it through a preposition. Lead with the head noun that names the thing —
    "Commands for the prompt an asset is generated from" — and demote the rest to a
    complement. A trailing ", as X" or ", in the form of X" is the same metaphorical equation
    above smuggled in through an adjunct.
- **Reserve backticks for code symbols.** Backticks belong on identifiers, types, commands,
  and file globs the reader will type. A file path cited mid-sentence as a reference —
  documentation/NodeEditor.md §3 — takes none, because marking it up gives it the same weight
  as the identifiers around it and dilutes them. Markdown link text is the one exception and
  keeps its backticks, where the marking separates a path from the prose around it rather than
  competing with nearby identifiers.
- **Bracket a subordinate alternative rather than fencing it with commas.** Parentheses mark the
  material as skippable, so the reader gets a complete sentence either way; paired commas leave
  it unclear whether the second comma closes an interpolation or opens a new clause. Write
  "Dropping onto itself (or onto a neighbor it would split against) is not a rip". Drop any comma
  that would follow the closing bracket — it separates the subject from its verb.

## Build

This project uses pnpm as its package manager. Use `pnpm` (and `pnpm run …`)
rather than `npm`.

```bash
pnpm run build          # Rollup bundle → dist/pathux.js
pnpm run typecheck      # tsgo --noEmit
pnpm run test           # vitest
pnpm run format         # prettier --write
pnpm run format:check   # prettier --check
```

Use `tsgo` to typecheck instead of `tsc`, e.g.
`pnpm exec tsgo --noEmit`.

## Running the example app (NW.js / Electron)

`pnpm nwjs` and `pnpm electron` launch the `example/` app in NW.js (SDK
flavor, from the `nw` devDependency) or Electron respectively, with the
Chrome DevTools Protocol enabled on port 9222 (override with `--port=<n>`).
Both build `example/dist/app.js` first if missing. `pnpm nwjs` also opens the
DevTools window automatically (pass `--no-devtools` to suppress it).

`example/package.json` doubles as the NW.js manifest: its `main` is
`nwjs_app.html`, which sets `window.haveNwjs` so the app picks the NW.js
platform backend (`scripts/platforms/nwjs/`). Electron ignores that field —
`pnpm electron` runs `electron_app.cjs` directly, whose `electron_app.html`
sets `window.haveElectron`.

Drive the running app (either runtime) over CDP with `pnpm cdp` (each
invocation connects, acts, and disconnects; the app keeps running):

```bash
pnpm cdp pages                  # list debuggable pages
pnpm cdp eval "document.title"  # evaluate JS in the app page
pnpm cdp screenshot shot.png    # capture the window
pnpm cdp click 100 200          # click at viewport coordinates
pnpm cdp key Enter              # press a key (Playwright key names)
```

Screenshots are captured at the window's `devicePixelRatio` (often 1.25 on
Windows) while `click` takes CSS-pixel coordinates. Divide screenshot pixel
positions by `devicePixelRatio` before clicking.

For richer automation, import `connectApp()` from `buildtools/cdp.mjs`
in a Node script: it returns `{ browser, page }` where `page` is a Playwright
`Page` connected over CDP; `browser.close()` only disconnects.

The NW.js and Electron binaries are downloaded by their packages' postinstall
scripts (allowed via `pnpm.onlyBuiltDependencies`). If a launcher reports a
missing binary, run `pnpm rebuild nw` / `pnpm rebuild electron`.

## Vector classes

By design vectors do not have a simple index signature.
Instead, indices up to LEN type to number, while indices above
LEN type to number | undefined.

This is to prevent mixing of incompatible vectors.

This can create problems with iteration, for example:

  ```ts
  let v = new Vector3()
  for (let i=0; i<3; i++) {
    // will not work
    v[i] = i
    // will work
    v[i] = i as Number3
  }
  
  //alternative with IndexRange:
  for (const i of IndexRange(3)) {
    v[i] = i
  }
  ```

## Project Structure

 `scripts/` — main source (TypeScript, converting from JS)
 `scripts/path-controller/` — git submodule (data binding, tool system, math)
 `scripts/core/` — UIBase, Container, theme, animation
 `scripts/widgets/` — UI widget classes (extend UIBase)
 `scripts/screen/` — FrameManager, ScreenArea, area management
 `scripts/platforms/` — platform abstraction (web, electron)
 `scripts/simple/` — simple app framework
 `documentation/` — documentation source (markdown)
 `dist/` — built output
 `generated/` — auto-generated catalogs: data paths (`pnpm run gen:paths`) and theme keys (`pnpm run gen:themes`)

## Data API paths

See [documentation/controller.md](documentation/controller.md) for the datapath
controller overview: how model classes are wrapped (`DataAPI` / `DataStruct` /
`DataPath`), how the UI references values by path, and how to look up structs by
name (`getStructByName`).

See [documentation/container.md](documentation/container.md) for how `Container` binds those
paths. `container.prop(path)` resolves the path, reads the `ToolProperty` at the end of it,
and builds whichever widget that property's type calls for — a slider for `INT`/`FLOAT`, a
checkbox for `BOOL`, a dropdown or checkbox strip for `ENUM`, a checkbox strip for `FLAG`, a
color button or component sliders for a vector, a textbox or label for `STRING`, a curve
widget for `CURVE` — with the property's UI name, tooltip, range, step, unit, enum items and
icons already applied. The other build methods (`slider`, `simpleslider`, `check`,
`checkenum`, `listenum`, `textbox`, `textarea`, `colorbutton`, `colorPicker`, `curve1d`,
`vecpopup`, `pathlabel`) take the same paths and bind the same way. Sliders come in three
elements — roller (`numslider-x`), simple bar (`numslider-simple-x`), and roller with
textbox (`numslider-textbox-x`) — chosen from the property's `SIMPLE_SLIDER` /
`FORCE_ROLLER_SLIDER` flags, the container's `PackFlags`, and the `cconst.simpleNumSliders`
/ `cconst.useNumSliderTextboxes` app defaults. Containers also carry `dataPrefix` and
`massSetPrefix` down to their children, and mass-set paths
(`scene.objects[{$.select}].size`) apply one edit across a selection as a single undo step.

Valid `path` strings for `container.prop("...")`, related widget methods, and
`<prop path="...">` xmlpage tags are catalogued in `generated/API_PATHS.md`
(human/LLM-readable) and `generated/api-paths.json` (machine-readable), with each
path's type, UI name, range, unit, and enum items. `generated/datapaths.ts` exports
a `KnownDataPath` union of the valid non-indexed paths. Regenerate after changing any
`api_define` with `pnpm run gen:paths` (walks the app's `defineAPI()`).

## Datapath updates (push + coalesced)

Widgets subscribe to their datapaths instead of re-reading them per frame; the
old per-widget `updateDataPath()` protocol is removed. The runtime lives in
`scripts/path-controller/controller/pathwatch.ts`.

**Widget protocol** (both overridable on `UIBase`):

- `watchPath()` — declare bindings once by calling
  `this.addPathWatch(pathOrAttr, opts?)` (idempotent per path; the base
  implementation watches the `datapath` attribute when present). Runs
  automatically from `update()` once `ctx` exists, and re-runs when the
  `datapath` attribute changes. `opts.onChange` routes a binding somewhere
  other than `updateFromPath` (multi-path widgets).
- `updateFromPath(value, info)` — the reaction, called only when the value
  actually changed. `info = { resolved, path, prop, source }`;
  `info.resolved === false` replaces the old `val === undefined →
  internalDisabled` check. The watcher owns read + snapshot + prop-aware
  compare (including in-place vector mutation), so do **not** re-diff, but a
  widget-side no-op guard is fine.
- `refreshPathWatches()` re-delivers current values past the diff — call it
  when a widget stops gating reactions (e.g. textbox blur).

**Write side**: `api.setValue` (and everything through it — `setPathValue`,
tool ops, mass-set, undo/redo) notifies automatically. For raw model writes,
call the typed `api.updateFrom<T>(path, prop)` / `api.updateChanged<T>(prop)`
(checked against the generated `StructCatalog`, `pnpm run gen:paths`), or
`api.notifyChange(path)`. `api.notifyChange()` with no arguments bumps the
structural epoch and wakes every watcher — use after tree-shape changes
(active-object switch, list insert/remove, context swap).

**Delivery**: notifications coalesce onto one `requestAnimationFrame` flush
(1000 sets in a frame → one reaction). Per-binding debounce via
`addPathWatch("datapath", { debounce })`: `"raf"` (default), `"immediate"`, or
`{ trailing: ms }` for heavy widgets (Curve1DWidget uses 200, ColorPicker 100).
In tests, drive the flush synchronously with `flushPathNotifications()`.

**Compat safety net**: `UIBase.dataPathPolling` (static, default `true`) keeps
every watcher also polling from `update()` — same cadence and diff as the old
protocol — so un-instrumented raw writes are still caught. Per-widget
`pollDataPath: boolean | "auto"` overrides it in either direction. Widgets
must keep chaining `super.update()` (or drive `this._updatePathWatchers()`
directly, as `Label` does) or their watchers neither build nor poll.

Lifecycle: watchers are removed in `remove()`/`removeChild()` and rebuilt on
the next `update()` if the widget is reused; the registry holds only weak
refs (a `FinalizationRegistry` prunes anything missed). See
`tests/pathWatch.test.ts` for the behavioral contract.

## Theming

See [documentation/theming.md](documentation/theming.md) for the full write-up:
theme variables, the generated theme file, the editor widget and its variable
mode, and the export button a client app wraps it in.

A theme is a record of style classes, each mapping keys to values (colors,
numbers, booleans, `CSSFont`, `ThemeScrollBars`, and nested sub-records such as
`disabled`/`highlight`). Widgets read values with `UIBase.getDefault(key)`,
which searches the widget's own style class (from `define().style`), then
`parentStyle`, then `base`.

- `scripts/core/theme.ts` holds path.ux's `DefaultTheme`. `setTheme(record)`
  (in `scripts/core/ui_base.ts`) merges an app theme into the live global
  `theme` object rather than replacing it, so an app only supplies the keys it
  overrides. After a runtime change call `flagThemeUpdate()` and repaint with
  `screen.completeSetCSS()` / `screen.completeUpdate()`.
- An app's theme file is the source of truth for its theme values. It is a
  TypeScript module holding a `themeVars` block and a `theme` record referencing
  those variables through `getVars`, loaded with
  `setTheme(instanceThemeVars(theme, themeVars))`.
  `example/theme.ts` is a working one; `example/core/app.ts` loads it.
- The variable system lives in `scripts/core/ui_theme_utils.ts`
  (`getVars`, `instanceThemeVars`, `createThemeFile`, `parseVarComments`), the
  color and export helpers in `scripts/core/ui_theme.ts`, and the editor widget
  (`theme-editor-x`) in `scripts/widgets/theme_editor.ts`. All of it is
  re-exported from the `pathux` entry point.
- The editor edits the live theme in place; the edits are runtime-only until an
  app-supplied Export button regenerates the theme file with `createThemeFile`.

### Theme typing (`getDefault`)

The theme file governs values; the keys widgets read are typed separately. The
keys are catalogued so `getDefault` can be type-checked, mirroring the data-path
catalog above.

- **Declare** the keys a widget uses in its `static define().theme`, mapping each
  to a `t.*` token from `scripts/core/theme_schema.ts` (`t.number`, `t.color`,
  `t.font`, …; nest an object for sub-records like `disabled`/`highlight`).
  Declare the returned type — a `"12px"` value reads back as a number, so use
  `t.number`. A widget inherits its parent class's declarations; only list what
  it adds or overrides. Annotate the migrated `define()` with the exported
  `UIBaseDefinition` return type so subclasses that omit `theme` still satisfy
  the static-side variance check.
- **Opt in** to typed lookups by passing the class name as `UIBase`'s third type
  param: `class Button<CTX…> extends ButtonEventBase<CTX, "Button">` (thread a
  `SELF extends string = "UIBase"` param through any intermediate base class).
- **Regenerate** with `pnpm run gen:themes` (walks the registry, resolves
  inheritance + `theme.ts` in JS, emits flat per-class types). It writes
  `generated/themes.ts` (augments the `ThemeKeyRegistry` seam) and
  `generated/themes.json`. `generated/` is gitignored — it's a build artifact.
- **Strict check**: the default `pnpm run typecheck` keeps `getDefault` loose
  (empty seam) so the library builds standalone; existing `as number`/`as CSSFont`
  casts stay load-bearing there. Run `pnpm run gen:themes && pnpm run
  typecheck:themes` (includes the catalog) to type-check `getDefault` against the
  per-class keys for migrated widgets.
- **CI**: run `pnpm run gen:themes --strict` (fails on a `define().theme` key
  absent from `theme.ts` — i.e. a typo) followed by `pnpm run typecheck:themes`.
- An **optional**, opt-in ESLint rule (`buildtools/eslint-rules/valid-theme-key.mjs`)
  flags literal `getDefault("…")` keys absent from the whole catalog. It is not
  wired into `eslint.config.js` by default (it currently surfaces ~15 legitimately
  un-themed keys read with runtime defaults); enable it as a `pathux/valid-theme-key`
  warning if you want typo coverage.

## Conventions

 Do not add type annotations if types can be inferred from the assignment.
 Annotate function parameters, return types where the type is non-obvious, and
 variables whose inferred type would be too wide (`unknown` out of `JSON.parse`).
 Leave `const x = 5`, `let s = "hello"` and the like to inference.
 The same rule applies to agents delegated conversion work — tell them.
 TypeScript: `strictNullChecks: true` in all tsconfigs
 No `any`: except at `JSON.parse` boundaries, immediately narrowed
 Formatting: prettier (see `.prettierrc`)
 Tests: vitest for unit tests, Playwright for DOM widget tests
 Modules: ES modules (`"type": "module"` in package.json)
 Entry point: `scripts/pathux.ts` → re-exported from root `pathux.js`

### The `pathux` barrel

Splitting a module that `pathux.ts` re-exports must not add any name to the barrel
unless the original module already exported it. `pathux.ts` re-exports with
`export *`, so a name exported from any module in that chain silently becomes
public API, and a `.d.ts` diff does not catch it — the leak arrives through an
`export * from "…"` line that reads identically either way.

Keep an internal helper unexported inside a module the barrel reaches. Put a
helper two modules share in a module that is imported but never `export *`-ed.
Verify by diffing the sorted `Object.keys()` of the built `dist/pathux.js`
against a pre-refactor baseline.

## DOM events (future direction)

Historically widgets signal value/selection changes through bespoke
`on_change`-style callback properties; very few use real DOM events. We are
moving towards standard DOM events (e.g. `dispatchEvent(new
CustomEvent("change", { detail }))`) so consumers can use
`addEventListener`. `scripts/widgets/ui_listbox.ts` is the first widget
converted: it dispatches a `"change"` event (`detail = { id, item }`) and keeps
its `on_change` callback only as a deprecated backwards-compat shim. New
widgets should prefer DOM events; convert existing callbacks opportunistically,
leaving the old callback in place and `@deprecated`.

## Widgets

- [Containers and property binding](documentation/container.md) — how `Container.prop`
  and the other build methods (`slider`, `check`, `listenum`, `colorbutton`, …) turn a
  `ToolProperty`-typed datapath into a widget: which widget each property type gets, the
  `PropFlags` and `PackFlags` that steer the choice, the three slider styles, path
  prefixes, mass set, and undo.
- [Menus](documentation/menus.md) — `Menu`, `DropBox` and the menu wrangler
  (`scripts/menu/`; `scripts/widgets/ui_menu.ts` is a deprecated re-export
  shim): menu templates (tool paths, separators, custom entries, submenus),
  `container.menu`, `createMenu`/`startMenu` for context menus, enum
  dropdowns, and `Editor.registerAppMenu` for the app menu bar.
- [ListBox](documentation/listbox.md) — scrollable single-select list, in
  either manual (`addItem`) or `DataList`-backed mode, with a typed `"change"`
  event and user-resizable corner grip.
- [Dock panels](documentation/dock_panels.md) — dockable/floatable editor
  panels (`PanelManager` in `scripts/screen/dock_panels.ts`): editors declare
  panels in `definePanels()`, users drag them between edge regions, float
  them, or collapse regions to edge-aligned tab rails; layouts serialize via
  `Area.STRUCT`'s `panelLayout` field.
- [Node editor](documentation/NodeEditor.md) — the node-graph data model
  (`scripts/graph/`, exported as the `nodegraph` namespace: node/socket
  types, groups, DSL, ToolOps, data API) plus the editor layer:
  `NodeGraphView` is a hostable graph widget, and `NodeEditor` is an Area
  shell shipped unregistered for the consumer to `Area.register`.

## Context

Children of `UIBase` should all take a `CTX` generic parameter that extends
`IContextBase` and defaults to `IContextBase`.  They should pass this parameter
up the inheritance chain, e.g.:

```ts
class MyWidget<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
}
```

## Widget values

If widgets implement `getValue` with a specific type they should pass that to UIBase, e.g.

```ts
class MyNumberWidget<CTX extends IContextBase = IContextBase> extends UIBase<CTX, number> {
  value = 1.0
  getValue(): number {return this.value}
  setValue(value: number) {return this.value}
}

```

## ToolOp

ToolOp has a strongly typed property system.  Properties are created
at runtime in the tooldef static method, and their types are declared in parameters
that are passed up the inheritance chain to ToolOp.

For example:

```ts
class Tool extends ToolOp<{
  input1: FloatProperty,
  input2: IntProperty
}, {
  output1: StringProperty,
  output2: BoolProperty
}> {
  static tooldef() {
    return {
      toolpath: 'tool',
      // inputs must match input list in generic parameters
      inputs: {
        input1: new FloatProperty(2.0)
        input2: new IntProperty(1)
      },
      // outputs must match output list in generic parameters
      outputs: {
        output1: new StringProperty("out1"), 
        output2: new BoolProperty(false),
      } 
    }
  }
}
```

To handle inheritance, do this:

```ts

class Tool1<Inputs extends PropertySlots, Outputs extends PropertySlots> extends ToolOp<
Inputs & {
  input1: FloatProperty,
  input2: IntProperty
}, 
Outputs & {
  output1: StringProperty,
  output2: BoolProperty
}> {
  static tooldef() {
    return {
      toolpath: 'tool1',
      // inputs must match input list in generic parameters
      inputs: {
        input1: new FloatProperty(2.0)
        input2: new IntProperty(1)
      },
      // outputs must match output list in generic parameters
      outputs: {
        output1: new StringProperty("out1"), 
        output2: new BoolProperty(false),
      } 
    }
  }
}

// tool2 will have access to both it's parent class's properties and it's own
class Tool2 extends Tool1<{
  input3: FloatProperty,
  input4: IntProperty
}, {
  output3: StringProperty,
  output4: BoolProperty
}> {
  exec(ctx){ 
    const {input1, input2, input3, input4} = this.getInputs()
  }

  static tooldef() {
    return {
      toolpath: 'tool2',
      // inputs must match input list in generic parameters
      inputs: {
        input3: new FloatProperty(2.0)
        input4: new IntProperty(1)
      },
      // outputs must match output list in generic parameters
      outputs: {
        output3: new StringProperty("out1"), 
        output4: new BoolProperty(false),
      } 
    }
  }
}
```

### Modal drag gestures

Editors and widgets do not implement modal dragging behaviours themselves —
no `_dragging` flags, no pointermove/pointerup listeners tracking a drag.
A pointerdown handler decides that a gesture has started and spawns a modal
ToolOp (`is_modal: true` in its tooldef) via
`ctx.toolstack.execTool(ctx, new Op(...), event)`; passing the event routes
the pointer capture to the op, which then receives `on_pointermove` /
`on_pointerup` / `on_pointercancel` and keyboard events until it calls
`modalEnd`. The node editor's `scripts/editors/nodeeditor/gesture_ops.ts`
and `PanZoomPanOp` in `scripts/widgets/ui_panzoom.ts` are the reference
implementations.

Every ToolOp must be properly undo/redo-able. A gesture op that only
previews (or changes pure view state such as selection or the camera)
carries `UndoFlags.NO_UNDO` and commits any document change on release by
dispatching a separate, undoable op — for the node editor, through the
view's delegate — so the committed op is the single entry the gesture
leaves on the undo stack. Escape cancels the gesture and restores whatever
its preview changed. Per the modal-tool rule in
`scripts/path-controller/toolsys/toolsys.ts`, an op may hold direct widget
pointers during the drag but must clear them in `modalEnd`.

Client apps often layer a toolmode system on top of an editor, where the
active toolmode's pointerdown decides which modal ToolOp to spawn. Not all
clients do this; path.ux's own editors spawn their ops directly and leave
any toolmode layer to the client.

## Submodule

The `scripts/path-controller/` directory is a git submodule. Commit changes there separately before updating the parent repo's submodule pointer.

```bash
cd scripts/path-controller && git add -A && git commit -m "msg"
cd ../.. && git add scripts/path-controller && git commit -m "update submodule"
```

**Commit a parent repo and its submodules together** whenever their branch names
match, or both are on their default branches: make the submodule commit, then bump
the parent's gitlink, as one logical change. This applies both to
`path-controller` under path.ux and to path.ux itself under any superproject that
embeds it. (Pinned third-party submodules — e.g. a parent's `extern/imgui`
— are the exception and are bumped deliberately, not auto-co-committed; path.ux has
no such pinned submodules.)

**Parent on a branch, submodule on its default branch:** do not silently commit or
advance the submodule's shared default branch. Ask the user whether they want to
commit and/or push the submodule's default branch (and bump the gitlink) before
doing so. This applies to `path-controller` under path.ux and to path.ux itself
under any superproject.

**Worktree teardown:** before removing a worktree, every submodule sitting on its
default branch (path.ux has no pinned exceptions) must be committed and pushed, so
no work is lost when the checkout goes away.

## Commit Messages
Commit messages should be terse and use bullet points.  The message should lead with 
what the purpose of the commit is and high level information.
