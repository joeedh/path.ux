# Disabling menu items, and refusals that carry a reason

Gives a menu item a disabled state, and gives `ToolOp.canRun` somewhere to put the sentence
explaining why it said no. The two are one feature: a greyed control that will not say why is
the same bug as a hidden one.

Status: stages 1-3 complete, plus the widget half of the tooltip work. Stages 4-6 not started.

Revised once, after a fresh-context pressure test. See [Findings](#findings) for the disposition
of each result, including the three the review got wrong.

<!-- toc -->

- [Three coupled changes](#three-coupled-changes)
- [A — `canRun` returns a reason](#a--canrun-returns-a-reason)
  - [The type](#the-type)
  - [The truthiness hazard, and the chokepoint that contains it](#the-truthiness-hazard-and-the-chokepoint-that-contains-it)
  - [`canRun` may not touch the toolstack](#canrun-may-not-touch-the-toolstack)
  - [What `graph_ops` gets back](#what-graph_ops-gets-back)
  - [Macros](#macros)
- [B — `execTool` enforces `canRun`](#b--exectool-enforces-canrun)
  - [It does not enforce it today](#it-does-not-enforce-it-today)
  - [Throw, do not return](#throw-do-not-return)
  - [`ToolRefusedError`](#toolrefusederror)
  - [The gate goes in the wrappers, not in `_execTool`](#the-gate-goes-in-the-wrappers-not-in-_exectool)
  - [Receiving a refusal](#receiving-a-refusal)
- [C — disabled menu items](#c--disabled-menu-items)
  - [State on the item](#state-on-the-item)
  - [The five chokepoints](#the-five-chokepoints)
  - [The search box](#the-search-box)
  - [Template entries](#template-entries)
  - [Toolpath entries need an instance](#toolpath-entries-need-an-instance)
  - [Async `canRun` starts disabled](#async-canrun-starts-disabled)
  - [Submenus](#submenus)
  - [Theme](#theme)
  - [The native menu bar](#the-native-menu-bar)
- [Answers an implementer would otherwise guess at](#answers-an-implementer-would-otherwise-guess-at)
- [Scope and limits](#scope-and-limits)
- [What deliberately does not change](#what-deliberately-does-not-change)
- [Public API added to the barrels](#public-api-added-to-the-barrels)
  - [The widget half](#the-widget-half)
- [Repos](#repos)
- [Risk](#risk)
- [Cost to undo](#cost-to-undo)
- [Stages](#stages)
- [Findings](#findings)
  - [Accepted](#accepted)
  - [Rejected](#rejected)

<!-- regenerate with pnpm markdown-toc -->

<!-- tocstop -->

## Three coupled changes

**A. `canRun` may return a refusal sentence.** Today it returns a bare boolean, so an op that
knows why it is refusing has nowhere to put the sentence. `graph_ops.ts` already demonstrates the
cost: it computes a real sentence and dumps it into `console.warn`.

**B. The toolstack's exec entry points consult `canRun` and throw `ToolRefusedError`.** `canRun`
is advisory today — nothing on the exec path reads it. Once C disables the controls, the exec
path is what a hotkey, a script or a race arrives on, so it needs the gate.

**C. Menu items can be disabled**, from a template (`canRun` for toolpaths, a `validate` callback
for custom entries) or through a new `Menu` API, with the refusal sentence as the row's tooltip.

A is a prerequisite for both B and C. B and C are independent **in code**, but not in landing
order: dropping `graph_ops`' `console.warn` before a surface displays the sentence would leave a
window in which refusals are silent. The stage order below resolves that.

## A — `canRun` returns a reason

### The type

In `scripts/path-controller/toolsys/toolop.ts`:

```ts
/** Why something refused, written for the person who pressed the control. */
export interface Refusal {
  /** One sentence, shown on the control itself. */
  reason: string;
  /** The longer explanation, shown behind the tooltip's expander. */
  description?: string;
}

export type CanRunResult = boolean | Refusal;
```

- An object always means refused. An op would never return one to mean yes, so no `ok` field is
  needed, and the literal stays open for a later case that wants `hidden: true` (drop the row
  rather than grey it).
- `canRun` widens to `CanRunResult | Promise<CanRunResult>` in both declarations: the
  `IToolOpConstructor` member (`toolop.ts:245`) and the `ToolOp.canRun` static (`toolop.ts:665`).
  The static's body keeps returning `true`.
- While editing that interface, fix the neighbouring wart: `IToolOpConstructor.searchBoxOk` is
  declared `(ctx: unknown): boolean` (`toolop.ts:252`) while the real static is `async` returning
  `Promise<boolean>` (`toolop.ts:653`). Correct the declaration in the same pass.

### The truthiness hazard, and the chokepoint that contains it

`{ reason }` is truthy, and every existing consumer tests truthiness. An un-migrated site reads a
refusal as permission — the one inversion this feature must not ship. So the normalization
happens in one place and the existing helper's contract does not move:

- `toolopCanRunAsync` (`toolop.ts:191`) keeps returning `Promise<boolean>`, normalizing a refusal
  object to `false`. Every current caller — including `searchBoxOk` at `toolop.ts:653`, whose
  `ret = ret && await toolopCanRunAsync(...)` would otherwise start returning the truthy object —
  stays correct without being touched.
- New beside it:

  ```ts
  /** The refusal sentence, or undefined when the tool may run. */
  export function toolopRefusal<CTX extends ContextLike>(
    ctx: CTX,
    cls: IToolOpConstructor,
    toolop?: ToolOp
  ): string | undefined | Promise<string | undefined>;
  ```

  It stays synchronous when `canRun` does. Menu build code cannot await, and the fold path
  gates per frame; forcing either through a microtask for a tool that answered outright would
  be a cost with nothing bought. `await` reads it either way.

  A refusal with an empty `reason` still refuses; it yields a generic sentence rather than
  `undefined`, so an op cannot accidentally allow itself by returning `{ reason: "" }`.

- Before landing, grep the `visualnovel` superproject for direct `canRun(` calls. Anything
  calling the static rather than going through the helper is outside this protection and must be
  migrated by hand.

### `canRun` may not touch the toolstack

`canRun` is consumer-authored code that the toolstack now calls on its own exec path, so its
contract has to be stated where an implementer writes one — a doc comment on both declarations:

> Must not call into `ctx.toolstack`. It is polled from the exec path and from UI build code;
> `head`, `idle`, `execTool`, `undo`, `redo`, `rerun` and `rewind` all take the toolstack lock,
> which is not reentrant. Read `ctx.toolstack.headOp` if the head is genuinely needed.

`headOp` (`toolstack.ts:83`) exists for exactly this reason — it is how `ctx.last_tool` reads the
head without queueing. The gate's placement (below) means a `canRun` that violates this does not
deadlock outright, but it can still queue behind a running op and stall the menu, so the rule
stands regardless.

### What `graph_ops` gets back

`structuralOkay` (`graph_ops.ts:94`) and `definitionOkay` (`graph_ops.ts:131`) are shared by the
**sixteen** ops that declare `static override canRun` in that file.
`Graph.structuralEditsRefused()` (`graph.ts:253`) already hands them a finished sentence — _"a
group instance takes value edits only; structural edits belong to the group's definition"_ —
which they `console.warn` and discard. Both helpers return `CanRunResult`, and the policy refusal
becomes `{ reason }`.

Two cases are not the shared helpers and must be migrated by hand: `CreateGroupOp` warns two
sentences of its own (pinned by `tests/graph_ops.test.ts:401-404`).

The `catch` around `graphAt` is a different case and keeps its `console.warn`: a `graphPath` that
will not resolve is a bug, not a policy decision, and the warn is the only signal of it. It
returns a refusal as well, so the UI still greys the control.

### Macros

`ToolOpMacro`'s live `canRun` is the static at `toolmacro.ts:164`, which returns `true`
unconditionally — so a macro composed entirely of refusing ops executes, and B's gate is a no-op
for the whole macro population. The instance method that would have polled the first tool
(`toolmacro.ts:426-433`) is inside a `/* … //*/` block and is dead.

The static receives the instance, so it can do the real thing:

```ts
static override canRun(ctx: ContextLike, toolop?: ToolOp): CanRunResult {
  // ...first refusal among toolop.tools, or true
}
```

Delete the commented-out block rather than migrating it, per the repo's rule against
commented-out code. Polling **every** member rather than only the first is the deliberate change:
the dead code polled `tools[0]`, and a macro is refused if any step is.

## B — `execTool` enforces `canRun`

### It does not enforce it today

`canRun` appears nowhere on the exec path. `ToolStack._execTool` (`toolstack.ts:326`) and
`ContextAPI.execTool` (`controller_abstract.ts:269`) never call it; the only readers in the repo
are `toolopCanRunAsync` and `searchBoxOk`. The comment on `structuralOkay` claiming the warn
matches "how execTool reports a declined canRun" describes behaviour that does not exist, and is
corrected as part of this work.

### Throw, do not return

Counted by grep over `scripts/` and `example/`: 34 `execTool` call sites outside the toolstack,
**none** of which reads a return value; roughly half are fire-and-forget. (The superproject adds
more, uncounted.) `ToolStack.execTool` is declared `Promise<void>` and `api.execTool` resolves to
the tool instance, so a returned refusal is not merely ignored — at a `void`-typed site it is
unreadable by construction, and the compiler flags none of them. The two failure modes are:
**return** → silent and wrong at every site; **throw** → loud, at worst an unhandled rejection at
the fire-and-forget ones. Loud wins.

A throw is also the honest classification. Once C disables the controls, arriving at the exec
path with a refusal means something bypassed the gate — a hotkey, a script or CDP call, or a race
where state changed between menu build and click. The normal path never constructs the error,
because the control was disabled before it could be pressed.

### `ToolRefusedError`

```ts
export class ToolRefusedError extends Error {
  override readonly name = "ToolRefusedError";

  constructor(
    readonly reason: string,
    readonly toolop?: ToolOpAny,
    readonly toolpath?: string
  ) {
    super(reason);
  }

  /** `instanceof` is unreliable across duplicated copies of this module in a bundle. */
  static is(e: unknown): e is ToolRefusedError {
    return e instanceof Error && e.name === "ToolRefusedError";
  }
}
```

path.ux ships both as a rollup bundle and as source through a vite alias, so a superproject can
hold two copies of `toolop.ts` and break prototype identity. Every consumer uses
`ToolRefusedError.is`, never bare `instanceof`.

### The gate goes in the wrappers, not in `_execTool`

The obvious placement — the top of `_execTool`, the one funnel all three entry points share — is
wrong. `_execTool` always runs inside `protect()`, whose doc comment (`toolstack.ts:175-181`)
says the lock is **not reentrant** and that the inner call "would wait forever on its own
caller". Awaiting consumer-authored `canRun` there hands the live lock to arbitrary code: any
`canRun` that reads `ctx.toolstack.head` (itself `protect("toolstackHead", …)` at
`toolstack.ts:79`) deadlocks the toolstack permanently, with the watchdog reporting it after
`lockWarnTimeoutMS` and not recovering it.

So the check goes in the three **public** wrappers, before each takes the lock:

- `execTool` (`toolstack.ts:320`) — before `this.protect(...)`.
- `execOrRedo` (`toolstack.ts:239`) — before `protect`, which also puts it before
  `_execOrRedo`'s `await this._undo()` (`toolstack.ts:266`). That matters: gating inside
  `_execTool` would let the undo land and the exec then throw, leaving the document one op behind
  with nothing to replace it.
- `foldOrExec` (`toolstack.ts:302`) — before `protect`, so **both** its branches gate, including
  the fold. This is the per-frame path (`DataPathSetOp` is foldable), and the cost is one static
  call plus a microtask per frame against a `canRun` that is the default `return true` for
  ordinary ops. If a drag's op starts refusing mid-gesture, stopping is the correct outcome.

`_execTool` itself stays unchecked, with a doc comment saying its callers gate and why it must
not do so itself.

Two consequences to state plainly:

- **The check is not transactional.** It runs outside the lock, so state can change between the
  answer and the exec. This is a gate, not a guarantee; an op that must be certain still checks
  in `exec`.
- **Three sites, not one.** Anything added later as a fourth public entry point must gate too. A
  shared private `_checkCanRun(ctx, toolop)` keeps the three honest.

Modal tools are covered — the wrappers precede `modalStart`. Undo, redo and `_rerun` stay
unchecked: re-running something already on the stack is not a new authorization decision.

### Receiving a refusal

A refusal is an expected outcome of an unexpected route, so it is reported as a sentence, not as
a crash:

- `ContextAPI.execTool`'s catch (`controller_abstract.ts:305`) calls `print_stack`. Branch on
  `ToolRefusedError.is` and log the reason instead.
- **`createMenu`'s tool callback drops it entirely today.**
  `cbs[id] = () => { ctx.api.execTool(ctx, item); }` (`menu_ops.ts:61-63`) neither awaits nor
  catches, and `invokeMenuCallback` (`menu.ts:11-19`) is a synchronous try/catch, so a rejected
  promise never reaches it. Both change: the callback returns the promise, and
  `invokeMenuCallback` attaches a `.catch` when one is returned. This also fixes async custom
  callbacks, which are silently unguarded for the same reason.
- `HotKey.exec` (`simple_events.ts:925`) already wraps in `.catch` and logs
  `hotkey: could not run "<path>"`. It needs no change; the message just gains a reason. Hotkeys
  are the main route that C's disabled rows do not cover, so this is the primary consumer.

## C — disabled menu items

### State on the item

`MenuItem` (`menu_types.ts`) gains `_disabled?: boolean`, `_refusalReason?: Refusal` and
`_description?: string` — the row's own hover text, kept apart from `title` because `title` is the
composed result. `Menu`
gains:

```ts
setItemDisabled(id: string | number, reason?: string): void;
setItemEnabled(id: string | number): void;
isItemDisabled(id: string | number): boolean;
```

Re-enabling is its own method rather than a boolean parameter, so a call site reads as what it
does. Both mutators re-render the row immediately — they are the API a live menu uses.

Rendering: a `disabled` class on the `<li>` plus `aria-disabled`, and `li.title` recomposed from
`composeTooltip(_refusalReason, _description)` — the same function `tooltipText` uses for a widget,
so a row and a button order the two halves identically. `_description` is written once in
`addItem`, from the `tooltip` argument or a submenu's own `Menu.tooltip`, so toggling twice cannot
lose it.

`addItemExtra` used to assign `ret.title` after `addItem` returned, which would have bypassed
`_description` entirely; it now passes the tooltip through to `addItem` instead.

### The five chokepoints

Each of these knows about `hidden` today and must learn about disabled; each is a separate bug if
missed.

1. **`Menu.click()`** (`menu.ts:140`) — return before `_onselect` / `on_select`. This is the one
   that matters for correctness.
2. **`Menu._select(dir)`** (`menu.ts:209`) — skip disabled rows the way it skips `hidden`. It has
   **two** loops: the `activeItem === undefined` branch (`menu.ts:210-216`) and the `do/while`
   below it. Both take the predicate.
3. **`Menu.setActive`** (`menu.ts:247`) — it writes the highlight as an **inline** style
   (`item.style["backgroundColor"] = this.getDefault("MenuHighlight")`), which beats any
   stylesheet rule `buildStyle` emits. A disabled row must keep `MenuBG` here; the CSS class
   cannot do it alone.
4. **The `onfocus` handler in `addItem`** (`menu.ts:567`) — a disabled submenu row must not
   `start()` its child.
5. **`buildElectronMenu`** (`electron_api.ts:414`) — see
   [the native menu bar](#the-native-menu-bar).

Plus one initial-state fix: `start()` (`menu.ts:382-393`) assigns
`this.activeItem = this.dom.childNodes[0]` and focuses it, so a menu whose first row is disabled
opens focused on a dead row. It picks the first enabled row instead.

Hover-focus still lands on a disabled row: that is how the reason tooltip gets read. It just
cannot click or open.

### The search box

`startSearch`'s filter (`menu.ts:305`) is **not** orthogonal, contrary to the obvious reading. It
sets `item.hidden = true` on every row, then in a second pass calls `this.selectNext(false)`
**mid-loop** for the row that was active — at which point every not-yet-visited row is still
`hidden`, so `_select` already walks a transiently all-hidden set and can leave `activeItem` on a
hidden row. Adding a disabled predicate narrows that set further and makes it likelier.

This is not a rare path: `start()` escalates to `startSearch` for any menu over 15 items when
`autoSearchMode` is set (`menu.ts:365`) — app-menu scale, which is what this feature targets. The
fix is to move the `selectNext` out of the loop and run it once after the filter pass, when
`hidden` is settled. That is a pre-existing bug this work must not step on, and it is in scope
for the stage that touches `_select`.

A disabled row still participates in the text filter: it is findable, and found disabled. Hiding
it would make the search box lie about what the menu contains.

### Template entries

`MenuTemplateEntry` (`menu_types.ts:23`) gains:

```ts
disabled?: boolean;
validate?: (ctx: IContextBase) => true | string;
```

`validate` returning the sentence rather than `false` is what makes the tooltip free — otherwise
every call site has to remember a matching `disabledReason`, and most will not. `disabled` stays
for the static case so a caller is not forced to write a closure returning `true`.

`validate` runs **once per menu build**, not per open: a popup menu is rebuilt on every press
(`DropBox._build_menu`), so per-build is per-open for every menu except the native bar, which
[rebuilds explicitly](#the-native-menu-bar). It receives the `ctx` `createMenu` was called with;
a submenu built by `createMenu` receives that same ctx, and one added as a pre-built `Menu`
carries its own.

`MenuTemplateCustom`, the positional array, gains nothing. Its own doc comment says it "silently
mistakes an argument for a tooltip when an optional slot is skipped"; a seventh slot is that bug
again. It already normalizes into the object form inside `createMenu` (`menu_ops.ts:72`), so old
callers simply never get a validator.

### Toolpath entries need an instance

Both graph helpers open with `if (toolop === undefined) return true;` (`graph_ops.ts:100`,
`:137`) — permissive. A toolpath row calling `canRun(ctx, undefined)` would therefore never
disable, and the feature would look broken on precisely the ops that motivated it. The same
applies to B's gate, which passes the instance it already holds.

So `createMenu` builds one: `ctx.api.createTool(ctx, item)`. `createTool` (`controller.ts:1814`)
resolves `tool.path(a=1)` argument syntax into the inputs, which is exactly what `structuralOkay`
reads off `toolop.inputs.graphPath`.

Three costs come with that, and none of them is hidden here.

- `createTool` calls `cls.invoke(ctx, args)`, a **documented consumer override hook** for filling
  properties from context (`toolop.ts:530-537`); `example/draw/draw_ops.ts:74` already overrides
  it and reads `ctx.workspace`. So building a menu now runs consumer code once per toolpath row.
  The construction is wrapped in try/catch: an `invoke` that throws degrades the row to
  `canRun(ctx, undefined)` rather than killing the menu.
- The instance is used for `canRun` only. The click keeps calling `ctx.api.execTool(ctx, item)`
  with the path, so a menu left open across a state change still executes against fresh state.
- Nothing is written to `SavedToolDefaults` — `saveDefaultInputs` runs only from `_execTool`
  (`toolstack.ts:407`), `_redo` and `popModal` — and the `ToolOp` constructor does not call
  `loadDefaults` (only `toolmacro.ts:439` and `:500` do). Stated here so the next reader does not
  re-derive it. Undo is untouched: nothing is pushed.

### Async `canRun` starts disabled

`createMenu` is synchronous and `canRun` may return a promise. A row whose answer is pending is
added **disabled**, and enables when the promise resolves. The menu is live DOM and a popup takes
a frame to appear, so a microtask-resolved `canRun` settles before anything is visible. Starting
enabled and disabling later is the wrong default: that is the window in which a click does the
thing that was supposed to be forbidden.

For the DOM path, a promise resolving after the menu closes writes to a detached element, which
is harmless. **The native path is different** — `buildElectronMenu` snapshots `menu.items` once,
so a row still pending at build time would freeze disabled forever. `createMenu` therefore
publishes `menu.pendingValidation?: Promise<void>`, and the Electron builders await it before
snapshotting. Both are already in async context (`DropBox._onpress`, and `initMenuBar` can be
made so).

### Submenus

A `Menu` added as a submenu has no per-item argument to carry state, so it rides on the menu
object exactly as `Menu.tooltip` already does (`menu.ts:29`): `Menu.rowDisabled` and
`Menu.rowDisabledReason`, read by `addItem` when `item instanceof Menu`. They are named apart
from `UIBase.disabled`, which every `Menu` already inherits and which greys the menu's own
widget — a plain `disabled` here shadows it and fails the static-side variance check.

### Theme

A new `MenuTextDisabled` colour in the `menu` style class in `scripts/core/theme.ts:372`.
`MenuText` in that class is a `CSSFont` carrying its own colour, and `buildStyle` writes
`color: ${menuText.color}` into both `.menuitem` and `.menuitem:focus`; `MenuTextDisabled` is a
bare colour string that `.menuitem.disabled` overrides `color` with, emitted **after** both rules
so it wins on order at equal specificity.

`example/theme.ts` deliberately does **not** get the key. `setTheme` merges, so the example app
falls back to `DefaultTheme` for it — and the file's blob predates `core.autocrlf=true`, so any
`git add` of it normalizes all 584 lines from CRLF to LF. A one-line theme addition is not worth
that diff; a `.gitattributes` would be the real fix, and is its own change. There is no
`gen:themes --strict` obligation here, because `Menu.define()` has no `theme` block (it is not
migrated to typed `getDefault`), and that gate only fires on declared keys missing from
`theme.ts`.

`buildStyle` (`menu.ts:643`) gains `.menuitem.disabled`. It does **not** need a
`.menuitem.disabled:focus` background rule — chokepoint 3 handles the highlight, because the
inline style would beat the stylesheet anyway.

### The native menu bar

`ElectronMenuItemArgs` (`electron_api.ts:105`) gains an `enabled` field, and `buildElectronMenu`
sets it from `item._disabled` (args block, `electron_api.ts:437-447`). Without this the native
path silently ignores every disable.

The same args block already declares `tooltip` (`electron_api.ts:107`) and **never sets it**, so
today a native row carries no hover text at all. It gains `tooltip` from
`li.title`, which is already the composed text — otherwise the native path ships the exact bug this plan's opening
sentence names.

That is still not enough under Electron: `initMenuBar` (`electron_api.ts:472`) has a `_menu_init`
guard and runs once from `MenuBarEditor.init()`'s `doOnce` (`menubar.ts:105-110`), so the native
app menu's enabled states freeze at startup. `MenuBarEditor` has `needsRebuild`, polled in
`update()` (`menubar.ts:124`), and `rebuild()` (`menubar.ts:116`) — which currently rebuilds the
DOM row only and does **not** call `initMenuBar`. The change is to have `rebuild()` call
`initMenuBar(this, true)` on the Electron path.

Two costs to accept explicitly: `initMenuBar(…, true)` reconstructs the entire `ElectronMenu`,
its role table and every submenu, so a rebuild is not cheap and an app should not flag one per
frame; and under Electron `rebuild()`'s DOM half is dead work, since `init()` sets
`this.height = 1`. Deciding _when_ an app flags a rebuild stays out of scope.

NW.js has its own `initMenuBar` (`nwjs_api.ts`) and is not covered — the DOM path is what
`pnpm nwjs` exercises for menus.

## Answers an implementer would otherwise guess at

- **Which `canRun` the gate calls:** the static, off `toolop.constructor`, with the instance as
  the second argument — `toolopRefusal(ctx, toolop.constructor, toolop)`.
- **`isItemDisabled` on an unknown id:** `false`. It answers about a row, and there is no row.
- **`setItemEnabled` and the tooltip:** restores the original, which `setItemDisabled` saved.
- **`validate` timing and ctx:** once per build; the ctx `createMenu` was given.
- **Disabled rows and search:** still findable, found disabled.
- **The fold path:** gates. See
  [the gate placement](#the-gate-goes-in-the-wrappers-not-in-_exectool).

## Scope and limits

- **Enum-driven dropboxes are excluded.** `DropBox._build_menu`'s `prop.values` loop
  (`dropbox.ts:374`) builds rows from an `EnumProperty`, which has `iconmap` and `descriptions`
  but no per-key enabled map. Adding one is a `toolprop` change and is cleanly separable.
- **Re-evaluation is one-shot.** A popup menu is built per press and lives seconds, so state is
  computed at build time and not watched. The native menu bar is the only long-lived menu, and it
  is handled by rebuild.
- **nstructjs is a non-issue.** `ToolStack.STRUCT` (`toolstack.ts:699`) serializes only `cur` and
  `_stack`; `MenuItem._disabled` is DOM-only and outside `saveUIData`'s reach. Nothing here is
  persisted.

## What deliberately does not change

- `toolopCanRunAsync`'s `Promise<boolean>` contract, for the reason in A.
- The positional `MenuTemplateCustom` array.
- Undo, redo and `_rerun`, which stay outside the gate.
- `Container.tool()` buttons (`container_menu.ts:120`) never disable. The same `toolopRefusal`
  feeds them and they already assemble a `description` tooltip, so this is the obvious next
  consumer — but it is a separate change, and putting it here would make this plan a rewrite of
  every tool button in the app.

## Public API added to the barrels

Two barrels reach this work, and both must be checked against the rule in `CLAUDE.md` that a name
exported from any module in an `export *` chain silently becomes public API.

- `toolop.ts` → `toolsys/index.ts` → `controller.ts` → `pathux.ts`. Intended additions:
  `Refusal`, `CanRunResult`, `ToolRefusedError`, `toolopRefusal`. Only `toolopRefusal` reaches the
  runtime surface; the rest are types.
- `pathux.ts:29-33` `export *`s `menu/menu_types`, `menu/menu` and `menu/menu_ops` **directly**.
  So any helper the template work adds to `menu_ops.ts` leaks too — keep the `createTool` /
  `canRun` plumbing unexported inside the module. Intended additions here are members on existing
  types only.

Verify per `CLAUDE.md` by diffing the sorted `Object.keys()` of the built `dist/pathux.js`
against a pre-change baseline.

### The widget half

`Refusal` is the shape a widget holds as well, so an op's answer reaches a tooltip with no
adapter between: `UIBase.refusalReason?: Refusal | (() => Refusal | undefined)`.

- The tooltip is composed **on read**, in `props.tooltipText`, not when the fields are set.
  Composing at assignment left two bugs standing: a control that sets its description once at
  build and flips `disabled` per state — every command-backed button — showed the enabled
  tooltip while disabled, and a thunk was called on every assignment rather than at hover.
- `updateToolTips` reads `tooltipText` rather than `_description_final`, which also gives a
  tooltip to a control whose only text is a refusal — an icon button with no description used
  to hover silently.
- The native path cannot recompute anything itself, so `__updateDisable` calls
  `props.refreshNativeToolTip`. That is the only notification the feature needs.
- The refusal goes **above** the description rather than replacing it: a widget's own
  description is still worth reading. Menu rows compose the same way, through the shared
  `composeTooltip`; an earlier draft had them replace, which was never justified by anything
  except that a row's label is also on screen.
- `composeTooltip` is exported from `ui_base_props.ts`, so it joins the barrel deliberately —
  a consumer composing its own refusal text should not re-derive the ordering.

## Repos

`scripts/path-controller` is a git submodule on its shared default branch, and this work
straddles the boundary:

- **Inside the submodule:** `toolsys/toolop.ts`, `toolsys/toolstack.ts`, `toolsys/toolmacro.ts`,
  `controller/controller_abstract.ts`, `controller/controller.ts`.
- **In path.ux:** `menu/*`, `graph/*`, `platforms/electron/electron_api.ts`,
  `simple/menubar.ts`, `core/theme.ts`, `example/theme.ts`, `tests/*`.

Consequences, per path.ux's `CLAUDE.md`:

- **Ask the user before committing or advancing `path-controller`'s default branch.** That is a
  gate on stages 1 and 4, not a formality.
- Parent and submodule commit **together**: submodule commit first, then the parent's gitlink
  bump, as one logical change.
- The "each stage is green on its own" contract is verified from the parent checkout only, since
  that is where `pnpm run typecheck` / `test` / `lint` run. Stages that touch both are two
  commits with a fixed order, not one.

## Risk

- **Highest: the truthiness inversion.** A missed consumer of `canRun` reads a refusal as
  permission. Contained by leaving `toolopCanRunAsync` boolean, and by the superproject grep in
  A. A test asserting the normalization pins it.
- **High: the gate breaks something that was passing a stale or wrong `canRun`.** Nothing on the
  exec path has ever consulted it, so an op with a buggy `canRun` has never been called on it.
  The sixteen `graph_ops` users and the new `ToolOpMacro` static are the population to check.
- **Medium: a consumer `canRun` that touches the toolstack** stalls a menu behind the lock. The
  wrapper placement keeps it from being a hard deadlock; the documented contract is the rest of
  the answer.
- **Medium: `createTool` per menu row** runs consumer `invoke` overrides at popup time. Contained
  by the try/catch fallback, but it is new consumer code on a hot UI path.
- **Low: unhandled rejections** from the fire-and-forget call sites — noise, on a path that was
  already refusing, and reduced by the `menu_ops.ts` fix.

## Cost to undo

- **A is a one-way door.** `CanRunResult` is public API through the barrel, deliberately. Once
  any consumer writes `return { reason: … }`, narrowing back to `boolean` turns every one of
  those into a truthy `true` — the same inversion named as the highest risk, now pointing the
  other way, with no compiler error at the consumer. Nothing in this plan protects the reverse
  direction, and nothing can.
- **B is cheap in code, expensive in consequence.** Once shipped, apps will drop their own
  pre-flight checks in favour of it; reverting silently re-opens every path it was closing.
- **C is cheap to revert** — additive fields, five local guards, one theme key, one CSS rule.

## Stages

Each stage is green under `pnpm run typecheck`, `pnpm run test` and `pnpm run lint` from the
parent checkout. Stages 1 and 4 touch the submodule and need the user's go-ahead first (see
[Repos](#repos)).

- **Stage 1 — `CanRunResult`** _(submodule + parent)_ — **done**. The types, `toolopRefusal`,
  `toolopCanRunAsync` normalization, the `canRun` doc contract, the `searchBoxOk` declaration
  fix, the real `ToolOpMacro.canRun` static plus deletion of the dead commented block, and the
  superproject grep. Tests: a refusing `canRun` normalizes to `false`; `toolopRefusal` returns
  the sentence for object, boolean and promise forms, and for `{ reason: "" }`; a macro refuses
  when any member refuses.
- **Stage 2 — menu item state and the five chokepoints** — **done**. `MenuItem` fields, the `Menu` API,
  `click` / `_select` (both loops) / `setActive` / `onfocus`, `start()`'s first-row pick, the
  `startSearch` mid-loop `selectNext` fix, the CSS rule and the theme key. Tests (vitest, plus a
  Playwright DOM test for the widget): a disabled item does not dispatch on click or on Enter;
  arrow keys skip it; `setActive` leaves a disabled row unhighlighted; a disabled submenu row
  does not open; a menu opening on a disabled first row focuses the next enabled one.
- **Stage 3 — template entries** — **done**. `disabled` / `validate` on `MenuTemplateEntry`, toolpath rows
  through `createTool` + `canRun` with the try/catch fallback, the pending-promise rule and
  `menu.pendingValidation`. Tests: a `validate` returning a string disables and titles the row; a
  toolpath whose op refuses is disabled with its reason; a promise-returning `canRun` starts
  disabled and enables on resolve; a throwing `invoke` leaves the menu usable.
- **Stage 4 — `ToolRefusedError` and the gate** _(submodule + parent)_. The class, the check in
  `execTool` / `execOrRedo` / `foldOrExec` with the shared private helper, `_execTool`'s doc
  comment, and the two reporting branches (`controller_abstract.ts`, and the `menu_ops.ts` /
  `invokeMenuCallback` promise fix). Tests: a refusing op throws `ToolRefusedError`; the stack is
  unchanged after it (length, `cur`, redo branch intact); `execOrRedo` refuses **without**
  running its `_undo`; a fold refuses; a modal op refuses before `modalStart`; `_rerun`, undo and
  redo still run. Review `tests/toolstack_lock.test.ts` and `tests/toolstack_abort.test.ts`
  against the new early return.
- **Stage 5 — `graph_ops` returns sentences.** Both shared helpers, the sixteen ops, and
  `CreateGroupOp`'s two hand-written warns; drop the policy `console.warn`, keep the `graphAt`
  one; correct the stale comment. **Lands after stages 2 and 3**, so a surface displays the
  sentence before the warn that was carrying it goes away. Update `tests/graph_ops.test.ts`:
  `:278`, `:396`, `:400` and `:593` assert `toBe(false)` and become refusal-object assertions;
  `:280` and `:401-404` assert the dropped warns and move to asserting the returned sentences.
- **Stage 6 — the native menu bar.** `enabled` and `tooltip` on `ElectronMenuItemArgs`,
  `buildElectronMenu`, awaiting `pendingValidation`, `MenuBarEditor.rebuild` calling
  `initMenuBar(this, true)`. Verified by hand under `pnpm electron`, since the native menu is not
  reachable from the DOM.

## Findings

From the fresh-context pressure test.

### Accepted

1. **The gate cannot go inside `_execTool`** — `protect()` is documented non-reentrant
   (`toolstack.ts:175-181`), so awaiting consumer `canRun` under the lock deadlocks on any
   `canRun` that reads `ctx.toolstack.head`. Rewritten: the check moved to the three public
   wrappers, before `protect`. This also resolved the `execOrRedo` undo-then-throw window and
   answered the per-frame cost question for `foldOrExec`.
2. **The macro `canRun` cited was commented-out code** (`toolmacro.ts:426-433`); the live static
   at `:164` returns `true` unconditionally, so macros bypassed the gate entirely. Added a real
   static that polls every member, and deletion of the dead block.
3. **The plan never said which `canRun` the gate calls, or with what `toolop`** — and with
   `undefined` it would have been a no-op on all sixteen graph ops. Now stated explicitly, in its
   own section.
4. **`createMenu`'s tool callback cannot catch the throw** — no `await`, no `.catch`, and
   `invokeMenuCallback` is synchronous. The claimed reporting path did not exist. Both now change
   in stage 4.
5. **Existing tests break in `tests/graph_ops.test.ts`** (`:278`, `:280`, `:396`, `:400`,
   `:401-404`, `:593`), and `CreateGroupOp` warns two sentences the "shared helpers" scope
   missed. Stage 5 now names the file and the assertions; stage 4 flags the two toolstack test
   files.
6. **`setActive` writes the highlight inline**, so the stylesheet rule could not have worked. It
   is now chokepoint 3, and the `.menuitem.disabled:focus` rule is dropped as useless.
   `start()`'s first-row focus added as a related fix.
7. **Electron: async refusals freeze, and `tooltip` is never set.** Added
   `menu.pendingValidation` for the first and the `tooltip` assignment for the second — without
   which the native path shipped the exact bug this plan opens by naming.
8. **`MenuBarEditor.rebuild()` prose was written as fact** when it described the proposed change,
   and `flagRebuild()` does not exist (the field is `needsRebuild`). Reworded, with the rebuild
   cost and the dead DOM half now stated.
9. **`createTool` runs consumer code.** `invoke` is a documented override hook and
   `example/draw/draw_ops.ts:74` uses it. Kept the approach, added the try/catch fallback and the
   honest cost note, plus the reviewer's two useful negatives (no `SavedToolDefaults` write, no
   `loadDefaults` in the constructor).
10. **`startSearch` is not orthogonal** — its mid-loop `selectNext` runs while every unvisited row
    is still `hidden`. Pre-existing, made likelier by this change, now in scope for stage 2.
11. **Submodule boundary was absent.** Added a Repos section: the ask-first gate on the default
    branch, co-committing, and the two-commit reality of stages 1 and 4.
12. **Barrel accounting was incomplete** — `pathux.ts` `export *`s the menu modules directly, not
    only through `controller`. Section extended.
13. **Sixteen graph ops, not fourteen.** Corrected in both places.
14. **The `gen:themes --strict` justification was backwards** — with no `define().theme` block the
    gate checks nothing, and `setTheme` merges, so the `example/theme.ts` edit is a choice.
    Rewritten, and how `MenuTextDisabled` composes with the `MenuText` `CSSFont` now specified.
15. **All eight "undecided" items** now have answers, in their own section.
16. **No undo section.** Added, including that A is a one-way door and that stage 5 must follow
    stages 2-3 so refusals are never silent.
17. **`searchBoxOk`'s interface declaration disagrees with its implementation.** Folded into
    stage 1 rather than left as a trip hazard.
18. Line-number corrections applied: `electron_api.ts` 105/414/472, `menubar.ts:116`,
    `theme.ts:372`, `graph.ts:253`, `simple_events.ts:925`.

### Rejected

- **"`_select` cannot infinite-loop, so the guard is a non-problem."** Right about the change
  being safe — the `do/while` exits on wraparound regardless of the predicate — and the spin test
  is dropped. But the stated reason is too strong: if `activeItem` is not in `this.items`,
  `indexOf` returns `-1` and the exit test never fires, so an all-hidden set does spin. That is
  pre-existing and unreachable through the public API, so it stays out of scope rather than
  becoming a claim that no spin is possible.
- **"`createTool` hits a bare `debugger;` on an unknown tool."** The statement is in
  `controller.ts:1830`, but `createMenu` reaches `createTool` only after `ctx.api.getToolDef` has
  already resolved the path in a try/catch and emitted the `(tool path error)` row
  (`menu_ops.ts:38-45`). The branch is unreachable from this code path.
- **"37 `execTool` calls / 19 fire-and-forget cannot be verified."** Fair on the numbers — the
  originals were a rough grep. Replaced with 34 and "roughly half", and the sentence now says
  what was measured and that the superproject is uncounted. The argument does not depend on the
  exact figure.
