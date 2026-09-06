# A `ToolRegistry` object

Moves the module-level tool tables onto an object, with the current module globals kept as
aliases onto a default instance. Task 3 of [`toolsys-tasks.md`](toolsys-tasks.md).

Status: all six stages done. Revised once after a fresh-context pressure
test, which invalidated the first draft's census, its import-cycle fix, and its stage
boundaries. See [Findings](#findings) for the disposition of each.

<!-- toc -->

- [Why](#why)
- [What is there today](#what-is-there-today)
  - [The tables](#the-tables)
  - [Who reads them](#who-reads-them)
  - [The fifth global the tables do not include](#the-fifth-global-the-tables-do-not-include)
  - [Stale, to clean up in passing](#stale-to-clean-up-in-passing)
- [The design](#the-design)
- [The seams](#the-seams)
- [The import cycle](#the-import-cycle)
- [Hard constraints](#hard-constraints)
- [What deliberately does not change](#what-deliberately-does-not-change)
- [Risk](#risk)
- [Stages](#stages)
  - [Stage 1 — tests for the parts that have none](#stage-1--tests-for-the-parts-that-have-none)
  - [Stage 2 — the class, the cycle, and the tables](#stage-2--the-class-the-cycle-and-the-tables)
  - [Stage 3 — the class → defaults stamp](#stage-3--the-class-%E2%86%92-defaults-stamp)
  - [Stage 4 — `ModelInterface` carries a registry](#stage-4--modelinterface-carries-a-registry)
  - [Stage 5 — make a second registry actually work](#stage-5--make-a-second-registry-actually-work)
  - [Stage 6 — document](#stage-6--document)
- [Later, not here](#later-not-here)
- [Repos](#repos)
- [Findings](#findings)
  - [From the fresh-context pressure test](#from-the-fresh-context-pressure-test)
  <!-- regenerate with pnpm markdown-toc -->

<!-- tocstop -->

## Why

An app embedding path.ux cannot give a subsystem its own tool namespace. Registration is a
push onto a module array, path lookup is a module map, and the defaults cache is a module
singleton, so every `ToolOp.register` in a process lands in the same tables. The motivating
case is a desktop app whose real toolstack lives in another process and whose editors want
their own tool catalogs — see `c:/dev/visualnovel/docs/research/ux-behaviour-model.md`.

That end state needs parent chaining, disposal and a serializable catalog. None of it is
reachable while the tables are module bindings, because a binding cannot be substituted per
caller. This plan does the substitutability and nothing else.

## What is there today

### The tables

| Table               | Declared at               | Exported | Holds                       |
| ------------------- | ------------------------- | -------- | --------------------------- |
| `ToolClasses`       | `toolsys/toolop.ts:79`    | yes      | every registered class      |
| `ToolPaths`         | `toolsys/toolpath.ts:5`   | yes      | toolpath string → class     |
| `initToolPaths_run` | `toolsys/toolpath.ts:7`   | **no**   | whether the scan has run    |
| `MacroClasses`      | `toolsys/toolmacro.ts:9`  | yes      | macro key → generated class |
| `macroidgen`        | `toolsys/toolmacro.ts:24` | **no**   | next macro type id          |
| `SavedToolDefaults` | `toolsys/tooldefaults.ts` | yes      | one `ToolPropertyCache`     |

Only four are exported, and all four are object identities, so an
`export const X = defaultRegistry.x` alias keeps every existing mutation working. The two
unexported ones need no alias — they are module-private state that simply moves.

### Who reads them

Not only `toolsys/`. The first draft claimed that and was wrong:

- `scripts/simple/app.ts:5,115` imports `SavedToolDefaults` **by path** and exposes it as
  `get toolDefaults()`. Library code, not example code.
- `example/editors/screen.ts:5,49` iterates `ToolClasses` for the command palette, and
  `example/core/context.ts:14,51-59` imports `SavedToolDefaults`. `example/` is inside the
  gate: `package.json:14` runs `tsgo --noEmit -p example/tsconfig.json` as the second half of
  `pnpm typecheck`.
- `tests/toolpath_parse.test.ts:3,77` imports `initToolPaths` directly.

The superproject half does hold: `apps/` and `packages/` touch only `buildToolSysAPI`
(`apps/desktop/renderer/pathux/app/api.ts:43,63`), never a table.

`controller/controller.ts:1734` calls `initToolPaths()` inside the exported
`initSimpleController()`, which nothing in path.ux calls. The live callers of `parseToolPath`
are `DataAPI` (`:1664,1676,1685`) and the `window.parseToolPath` hook (`toolpath.ts:147`).

### The fifth global the tables do not include

`DataAPI.mapStruct` is keyed on the **class object**, not on the API:

- `_addClass` stamps `cls[CLS_API_KEY] = key` and writes module-level `_map_structs[key]`
  (`controller/controller.ts:846-847,858`).
- `mapStruct` sees an existing key on the class and returns `_map_structs[key]` — the _first_
  API's `DataStruct` — regardless of which `DataAPI` asked (`:882-905`).
- `updateToolSysAPI` then calls `datastruct.clear()` (`toolsys.ts:61-62`).

So a second `buildToolSysAPI` wipes the first API's tool-defaults accessors. **This is live in
the desktop app today**: `defineGraphApi` (`api.ts:63`) clears what `defineShellApi`
(`api.ts:43`) built, and the comment above the second call — "gestures read their defaults
through whichever API the context carries" — states exactly the assumption that is broken.

This is task 2's bug, reached from task 3's direction, and it means
[`toolsys-tasks.md`](toolsys-tasks.md)'s claim that tasks 2 and 3 are independent is wrong.
Task 3 cannot demonstrate a working second registry without it. Stage 5 handles it.

**Amended after stage 5.** Two halves of this were overstated. The wipe is real but has no
observable effect while both APIs sit on one registry, because the refill walks the same
class list — it needed a second registry to bite, which is why nothing in the app ever
looked wrong. And `_map_structs` did not have to be fixed: stage 5 moved the defaults
binding out of its reach instead, so the general bug (any two APIs sharing one struct for a
model class) is still open and still task 2's. The dependency claim stands: task 3 could not
have shown a working second registry while the defaults struct was keyed on the class.

### Stale, to clean up in passing

- `toolsys.ts:11` claims window globals `_ToolClasses` / `_MacroClasses` are declared in
  `global.d.ts`. Neither `scripts/global.d.ts` nor `example/global.d.ts` declares them and
  nothing assigns them. The comment goes.
- `toolpath.ts:147` sets `window.parseToolPath`. Real, stays, and must keep pointing at the
  default registry.

## The design

```ts
export class ToolRegistry {
  readonly classes: IToolOpConstructor[] = [];
  readonly paths: Record<string, typeof ToolOp> = {};
  readonly macros: Record<string, MacroClassType> = {};
  readonly defaults: ToolPropertyCache;

  register(cls: IToolOpConstructor): void;
  unregister(cls: IToolOpConstructor): void;
  isRegistered(cls: IToolOpConstructor): boolean;
  parseToolPath(str: string, checkExists?: boolean): ParseToolPathResult;
  buildAPI(api: DataAPI, ...): void; // today's buildToolSysAPI
}

export const defaultRegistry = new ToolRegistry();
```

The four exported tables become aliases onto that instance — same object identity, so
`ToolClasses.push(cls)` in `example/` still mutates the registry's array. `unregister` keeps
its `(ToolClasses as unknown as unknown[]).remove(cls)` cast (`toolop.ts:604`), which works
unchanged against a `readonly` field.

Aliases are a migration aid, not the end state: an alias cannot be repointed, so anything
wanting a second registry reaches it through a seam below.

`macroidgen` moves onto the registry as private state and **stays process-wide in effect** —
the counter lives on `defaultRegistry` and macro classes read it from there, because a macro
type id that repeated across registries would collide in a saved file. Whether macro ids
should be per-registry is left open; stage 5's second-registry test must not depend on the
answer.

## The seams

Four ways a caller reaches the registry, and they do not have the same owner, because they do
not have the same information in hand.

**Path → class.** `parseToolPath`, `createTool`, `getToolDef` and `getToolPathHotkey` are all
reached through `ctx.api`, and all four are virtual on `ModelInterface`
(`controller_abstract.ts:64-91`), overridden in `DataAPI`. So `ModelInterface` holds a
registry reference defaulting to `defaultRegistry`. The free `parseToolPath` and
`initToolPaths` stay as wrappers over the default, or the `window` hook and the barrel break.

**Class → defaults.** `ToolOp.hasDefault` and `getDefault` are called from the **`ToolOp`
constructor** (`toolop.ts:409,415`, constructor at `:330`), which has no ctx and never can —
that, not `saveDefaultInputs`, is what forces the stamp-on-the-class design. The first draft
justified it with `saveDefaultInputs`, which was wrong at every site: `toolstack.ts:399` sits
inside `execTool` with a locked `tctx` in hand, `toolstack.ts:564` inside `_redo` (a site the
draft missed entirely), and `toolop.ts:967` fifteen lines after `const ctx = this.modal_ctx`.

Three sub-questions this seam must answer, all currently open:

- **Macro classes never pass through `register()`.** `_getTypeClass` generates
  `MacroTypeClass extends ToolOp` at runtime and writes it straight into `MacroClasses[key]`
  (`toolmacro.ts:124-226,223`), yet hands it to `SavedToolDefaults.set/has/get`
  (`:235,243,249`). Nothing would stamp it. It must be stamped where it is generated, from
  the registry that owns the macro.
- **Statics inherit.** `_regWithNstructjs` uses `cls.hasOwnProperty("STRUCT")`
  (`toolop.ts:573-596`) precisely because of this. An unregistered subclass of a registered
  tool would silently inherit the parent's registry through `this.constructor`. Decide
  whether that is intended; if not, guard the lookup with `hasOwnProperty`.
- **`unregister` then re-register is a live path.** `setDataPathToolOp`
  (`controller.ts:1743-1750`) does exactly that. Say whether `unregister` clears the stamp:
  leaving it means a class moved between registries keeps the old one; clearing it means an
  already-constructed op loses its defaults mid-life. Note also that `ToolOp.isRegistered`
  (`toolop.ts:598`) reads `ToolClasses`, so a class registered into a non-default registry
  answers `false` — and `setDataPathToolOp:1746` depends on that answer.

**Registry → `DataAPI`.** `buildToolSysAPI(api)` becomes `registry.buildAPI(api)`, free
function kept as a wrapper. Blocked on the `_map_structs` global above; see stage 5.

**Registry → context.** The one the first draft missed. `ctx.toolDefaults` is wired to the
module global in three places (`toolsys.ts:156`, `simple/app.ts:115`,
`example/core/context.ts:51`) and read by path at `core/utils/container_menu.ts:92`. A
per-registry cache has to reach the context, and no other seam covers it.

## The import cycle

Not a hazard to be checked for — a certainty to be designed around, and the first draft's
"cheapest" fix was the broken shape.

The cycle already exists: `toolop.ts:76` imports the _value_ `SavedToolDefaults` from
`tooldefaults.ts`, and `tooldefaults.ts:5` imports back. It is harmless today because neither
side touches the other at module scope. The registry breaks that, putting a module-scope
evaluation on each side of a 2-cycle:

- `toolregistry.ts`: `new ToolRegistry()` → field init `new ToolPropertyCache()` → needs
  `tooldefaults`' class binding initialized.
- `tooldefaults.ts`: `export const SavedToolDefaults = defaultRegistry.defaults` → needs the
  constructed instance.

Either entry order throws `ReferenceError`, and entry order is not stable: `toolsys/index.ts`
evaluates `toolpath` → `toolop` → `tooldefaults`, while `controller/controller.ts` enters
through the `../toolsys` barrel and `tooldefaults.ts:3` enters through `../controller`. So
"put `ToolRegistry` in its own module that both import" — the draft's option 1 — is precisely
the failing configuration.

Two fixes were proposed here, and **neither is what stage 2 shipped**. The second is
broken, and the first opens a one-way door for no reason:

- _Move `ToolPropertyCache` into `toolregistry.ts`, leaving `tooldefaults.ts` as a re-export
  shim._ Works, but it moves barrel provenance — the plan's own one-way door — and
  `tooldefaults.ts` has to survive as a module exporting that name either way, because
  `simple/app.ts:5` imports it by path rather than through the barrel.
- _Make `defaults` a lazy getter, so nothing is constructed at module scope._ **Wrong.** The
  getter defers `new ToolPropertyCache()`, but `tooldefaults.ts` still evaluates
  `export const SavedToolDefaults = defaultRegistry.defaults` at module scope, so entering
  through `toolregistry.ts` reaches that line while `defaultRegistry` is still uninitialized.
  Verified by building it and running the entry-order test: 7 of 8 orders pass and the
  `toolregistry` one throws, which is the entry-order-dependent failure this section warned
  about, arriving through the fix meant to prevent it.

**What stage 2 did instead: invert the ownership.** `tooldefaults.ts` keeps `ToolPropertyCache`
and keeps constructing `SavedToolDefaults`; `ToolRegistry`'s constructor takes a cache, and
`defaultRegistry` is built as `new ToolRegistry(SavedToolDefaults)`. The identity the aliases
need is the same either way — which module calls `new` is invisible to every consumer — but
`tooldefaults.ts` now imports nothing from `toolregistry.ts`, so the 2-cycle never forms and
no entry order can fail. The one-way door stays shut.

Two supporting edge deletions made that hold rather than merely look tidy:

- `tooldefaults.ts:3` and `toolsys.ts:4` imported `DataAPI`/`DataStruct` as values from the
  `../controller` barrel but use them only as types; `tooldefaults.ts:5` did the same with
  `IToolOpConstructor`. All three are now `import type`, which leaves `tooldefaults.ts`
  importing values from only `./toolprop` and `../controller/controller_base`.
- `updateToolDefaults` and `buildToolOpAPI` moved from `toolsys.ts` onto `ToolRegistry` as
  `updateDefaults` and `buildOpAPI`, with the free functions kept as wrappers over
  `defaultRegistry`. Neither needs `ToolOp` as a value, so this puts `toolregistry.ts`
  strictly below `toolop.ts` — and it removes the `toolop.ts` → `toolsys.ts` edge, which was
  the other half of the cycle `ToolOp.register` would otherwise have needed.

`defaultRegistry` must also exist before the module-scope `ToolOp.register(...)` calls at the
bottom of many modules run. `tests/toolregistry_load.test.ts` checks all of this: it enters
the graph through each of the eight plausible first modules and asserts the four aliases came
out bound and the `ToolOp` statics still delegate.

## Hard constraints

- **nstructjs registers by class name, globally.** Saved files in consumer projects carry
  those names. Registries are a runtime concept; struct names are never namespaced. This
  kills the obvious "prefix the registry name" design, so it is stated rather than left to be
  rediscovered.
- **`IToolStack` stays untouched.** Nothing in this plan changes its type.
- **path.ux is a shared library.** A consumer that never asks for a second registry sees no
  change: same tables, same identities, same registration order.
- **The `pathux` barrel.** `toolsys/index.ts` re-exports with `export *`, so relocating
  `ToolPropertyCache` can leak or drop a public name. CLAUDE.md requires diffing the sorted
  `Object.keys()` of the built `dist/pathux.js` against a pre-refactor baseline.

## What deliberately does not change

- The module exports stay public. Removing them is a separate decision with a deprecation
  cycle behind it.
- No parent chaining, no `dispose()`, no catalog projection.
- `ToolOp.register` keeps its signature and keeps merely warning on a double registration.
  Refusing is a behaviour change and does not belong in an additive step.

## Risk

The census failure is the lesson: the first draft called this low-risk on the strength of a
grep that never searched for `SavedToolDefaults` and never looked in `example/` or `tests/`.
The exposure is wider than it looked, though the aliases still absorb all of it.

The two things that can actually break are the module-load order (a `ReferenceError` at
import time, which fails loudly and immediately) and the `ctx.toolDefaults` seam (which fails
quietly, as a menu reading an empty cache).

Reversibility: stages 1-4 are reversible while the aliases stand. The one-way door would
have been whichever module ends up owning `ToolPropertyCache`, because that changes barrel
provenance — stage 2's fix leaves it in `tooldefaults.ts`, so the door was never opened.

## Stages

Each stage is green under `pnpm typecheck` — **both passes; the second one is `example/`** —
`pnpm test` and `pnpm format:check` on its own.

### Stage 1 — tests for the parts that have none

**Done.** `tests/tooldefaults.test.ts`, 11 tests over the four cases below. Grep over
`tests/` had found no coverage of `SavedToolDefaults`, `saveDefaultInputs`, `hasDefault`,
`loadDefaults` or `ToolMacro` — only `toolpath_parse.test.ts:69-71` touched registration at
all. That is exactly where the macro and defaults hazards live, so the regression net is
written before anything moves, not after.

- Saved defaults survive a register → construct → `saveDefaultInputs` → construct round trip.
- A `ToolMacro` gets and sets its defaults through `_getTypeClass()`.
- `unregister` → re-register, as `setDataPathToolOp` does it.
- A subclass of a registered tool: pin whatever it does today, so stage 3 shows the movement.

Three things the net pins are wrong today, written around rather than fixed. Stage 3 owns
all three, and each is now a test that will change colour when it moves. (Stage 3 fixed the
first and the third; it decided the second is correct as it stands, for the reason recorded
there.)

- **Re-registering resets a saved default.** `register()` → `updateToolDefaults` →
  `_buildAccessors` ends with `obj[name] = prop2.getValue()`, so a `setDataPathToolOp`-shaped
  unregister/re-register puts the accessor back at the `tooldef()` value while `userSetMap`
  goes on reporting the path as user-set. `unregister` on its own clears nothing, so the
  answer to "does `unregister` clear the stamp" has to cover re-`register` as well.
- **A subclass with no `tooldef()` of its own reads _and writes_ the parent's defaults.**
  Statics inherit, so `_getAccessor` resolves the parent's toolpath, and `isRegistered` says
  `false` the whole time. Guarding only the read is not enough: `set()`'s
  "not in the default map" fallback calls `_buildAccessors`, which resolves the same
  inherited toolpath and lands the write on the parent anyway.
- **Macro keys collide.** `_getTypeClass` builds the key with
  `key = tool.constructor.name + ":"` rather than `+=`, so only the last member tool reaches
  it, and two macros over different tool lists share one generated class and one set of
  defaults. The key is also the accessor path, so it is what a registry would have to
  namespace.

Two facts the net records that the plan did not state:

- `SavedToolDefaults.has()` asks whether registration built an accessor, not whether a value
  was ever saved into it; `useDefault()` is the question about the saved value. For a
  registered tool nothing has ever saved, `has()` is already `true` and `useDefault()` is
  `false`, so stage 3 cannot read `has()` as "a default exists".
- The cache has no remove: `pathmap`, `accessors` and `userSetMap` only ever grow, and
  `updateToolSysAPI`'s `datastruct.clear()` does not touch them. Tests therefore need one
  tool class per test rather than one per file, and stage 5's second registry cannot be
  torn down by rebuilding the API.

### Stage 2 — the class, the cycle, and the tables

**Done.** Merged, because the draft's separate stage 1 could not verify its own deliverable:
with no consumer there is no cycle, no load order and no test that would fail.

- `import type` conversion in `tooldefaults.ts` and `toolsys.ts` first. ✓ — plus
  `tooldefaults.ts`'s `IToolOpConstructor`, which was the same mistake a third time.
- New `toolsys/toolregistry.ts`; pick a cycle fix and record which and why. ✓ — neither of
  the two the plan offered; see [The import cycle](#the-import-cycle).
- The six tables become registry members; the four exported ones become aliases. ✓ —
  `initToolPaths_run` is `pathsScanned` and `macroidgen` is `macroIdGen`, both on the
  registry, with `_getTypeClass` advancing `defaultRegistry`'s as the design says.
- `ToolOp.register` / `unregister` / `isRegistered` delegate. ✓ — `unregister` keeps the
  `.remove()` polyfill and its cast, now against `this.classes`.
- Barrel diff against a baseline built before the stage. ✓ — 584 names before, 586 after,
  the two added being `ToolRegistry` and `defaultRegistry`. Nothing dropped, nothing leaked.
  Read the names statically out of `dist/pathux.js`'s single `export {` block rather than by
  importing it: the barrel touches `window` at module scope and never settles under node.
  (Stage 3 adds `registryOf` and `defaultsFor`, and drops nothing, for 588.)
- Stage 1's tests plus the existing suite are the net. A test needing an edit means a
  behaviour change, which means the stage is wrong. ✓ — 441 tests, no edit.

Two things the stage added that the plan did not ask for, both because the cycle fix needed
them:

- `updateToolDefaults` and `buildToolOpAPI` are now `ToolRegistry.updateDefaults` and
  `.buildOpAPI`, free functions kept as wrappers. They were the only reason
  `toolregistry.ts` would have had to import `toolsys.ts`, and moving them also means a
  second registry builds accessors into its own cache rather than into `SavedToolDefaults`.
  Stage 5 gets that for free.
- `tests/toolregistry_load.test.ts`, eight entry orders. This is the only test that can
  catch the failure mode the cycle section describes, and stages 4 and 5 both add
  module-scope wiring that could reintroduce it.

The stale `global.d.ts` comment at `toolsys.ts:11` went, per
[Stale, to clean up in passing](#stale-to-clean-up-in-passing), along with two vacant
section-header boxes below it. `window.parseToolPath` still points at the free function over
the default registry.

`parseToolPath` and `buildAPI` from the design sketch are **not** on `ToolRegistry` yet.
Adding them here would have pulled `toolpath.ts` and `toolsys.ts` back under
`toolregistry.ts` for no stage-2 benefit; they arrive with their seams, in stages 4 and 5.

### Stage 3 — the class → defaults stamp

**Done.** `ToolRegistry.register` stamps `cls[REGISTRY_KEY] = this`, a module-private
symbol; `registryOf(cls)` reads it, falling back to `defaultRegistry`, and `defaultsFor(cls)`
is `registryOf(cls).defaults`. `ToolOp.hasDefault`, `getDefault` and `saveDefaultInputs` —
and `ToolMacro`'s overrides of all three — go through it instead of naming
`SavedToolDefaults` directly. `_getTypeClass` stamps the class it generates and reads and
writes `registry.macros` rather than the module alias. With one registry every one of those
resolves to the same cache, so nothing moves.

- Stamp at `register()`, and at `_getTypeClass()` for macros. ✓
- Answer the three sub-questions above in code. ✓, below.

**Subclass inheritance: intended, so the lookup is not guarded.** The mark sits on the
constructor, so an unregistered subclass finds its parent's through the static prototype
chain. That is the answer we want and not merely the cheap one: a subclass of a registered
tool belongs wherever its parent does, and a `hasOwnProperty` guard would send it to
`defaultRegistry` — a *different* registry's defaults — rather than to none. This is why the
mark is not guarded the way `_regWithNstructjs` guards `STRUCT`: `STRUCT` is about identity,
where every class needs its own, and the mark is about ownership, which is exactly the thing
a subclass should inherit.

This decides the registry lookup only. A subclass with no `tooldef()` of its own still shares
the parent's *toolpath*, and so its saved values, in either direction — stage 1 pinned that.
It is left alone, because defaults are keyed by toolpath by design: two classes that report
the same toolpath sharing one set of saved values is that rule working, not failing. The
oddity is a subclass that declares no `tooldef()`, which is a malformed tool rather than a
registry problem.

**`unregister` clears the mark, but only its own.** It clears only when the mark is an own
property of `cls` and points at this registry — so `registryB.unregister(cls)` cannot drop
registryA's claim, and clearing an inherited mark cannot silently reparent a subclass. The
"already-constructed op loses its defaults mid-life" objection does not bite: an unmarked
class falls back to `defaultRegistry`, which is where `setDataPathToolOp`'s
`unregister` → re-`register` was pointing anyway.

Stage 1 pinned a second half of this that the sub-question did not name: re-`register` used
to *reset* the saved value, because `_buildAccessors` ended with an unconditional
`obj[name] = prop2.getValue()`. That is now a seed — it assigns only when the key is absent —
so a class that moves between registries, or an API that gets rebuilt, keeps what
`saveDefaultInputs` put in. `tests/tooldefaults.test.ts` was edited to match; that edit is
the stage's deliverable rather than a warning sign.

**`isRegistered` stays the default registry's question.** `ToolOp`'s statics *are*
`defaultRegistry`'s public API, so `ToolOp.isRegistered` answers `false` for a class
registered only into another registry. That is the answer `setDataPathToolOp:1746` wants,
since the line after it registers into the default. `ToolRegistry.isRegistered` is the
per-registry question, and being marked by a registry is a third thing again — a macro type
class is marked and in no class list at all. All three are now pinned in tests.

One more fix taken here because the stage was already inside `_getTypeClass`: the macro key
was built with `key = tool.constructor.name + ":"` rather than `+=`, so only the last member
tool reached it and two macros over different tool lists shared one generated class and one
set of defaults. Safe to change — nothing in path.ux persists the cache or reads
`_macroTypeId`, so no saved file carries the old keys.

### Stage 4 — `ModelInterface` carries a registry

**Done.** The 453 tests that predate the stage passed unedited, so the "no behaviour change"
claim held.

- A `registry` field defaulting to `defaultRegistry`; `parseToolPath`, `createTool`,
  `getToolDef`, `getToolPathHotkey` read it. Free functions stay as wrappers. ✓ — only
  `parseToolPath`, `parseToolArgs` and `createTool` needed editing. `getToolDef` already
  routes through `this.parseToolPath`; `getToolPathHotkey` reaches no registry at all, since
  it matches toolpath strings against the screen's keymaps. (Corrected in stage 6 — the
  stage 4 write-up claimed both went through `parseToolPath`.)
- `ctx.toolDefaults` reaches the registry's cache rather than the module global, at all three
  wiring sites. ✓ — `buildToolSysAPI`'s installed getter closes over the `api` it was handed;
  `simple/app.ts` and `example/core/context.ts` read `this.api.registry.defaults`.
  `example/`'s `toolDefaults_save`/`_load` now go through its own getter rather than naming
  the global a second and third time.
- Still one registry in play, so still no behaviour change. ✓

`parseToolPath` and `initToolPaths` moved onto `ToolRegistry` as `parseToolPath` and
`initPaths`, per the design sketch. That needed a fourth module: the argument parser
(`buildParser`, `Parser`) is now `toolsys/toolpath_parser.ts`, a leaf both `toolregistry.ts`
and `toolpath.ts` import. Leaving it in `toolpath.ts` would have put those two in a
module-scope cycle — `toolpath.ts` evaluates `Parser` and `ToolPaths` at module scope, and
the latter needs `defaultRegistry` — which is the stage 2 shape again. `toolpath.ts`
re-exports `buildParser` and `Parser` by name rather than with `export *`, so the barrel
gains nothing from the split.

Barrel: no runtime change at all, 588 keys either side. Note the limit of that check — the
`export {` block a built bundle carries holds runtime names only, so the one name stage 4
does add to the public surface, the `ParseToolPathResult` type (module-private in
`toolpath.ts` before, exported now because a public method returns it), is invisible to it. A
type-level addition has to be caught by reading the diff.

**Left incoherent deliberately, for stage 5 to close:** `updateToolSysAPI` and
`buildToolSysAPI` still walk `ToolClasses`, the *default* registry's list, whatever
`api.registry` says. Nothing sets `api.registry` outside the tests yet, so it cannot bite
today, but an api pointed at a second registry currently gets that registry's
`ctx.toolDefaults` over the default registry's accessors. `registry.buildAPI` is where those
two meet.

### Stage 5 — make a second registry actually work

**Done.** `tests/toolregistry_second.test.ts`, four tests, both halves of the fix
mutation-checked.

- `mapStruct` must give each `DataAPI` its own `DataStruct` for a shared class, or
  `registry.buildAPI` must stop calling `clear()` on a struct it does not own. Either way
  this is task 2's bug; settle the shared-versus-per-API question for default _values_ here
  (shared is almost certainly right — the bug is in the binding, not the values).
  **Neither, and `_map_structs` was not fixed** — see below.
- Then the test: register a tool into registry B, point a `DataAPI` at it, resolve the
  toolpath, read a default, and run it — with the default registry never seeing the class,
  and registry A's accessors still intact afterwards. ✓
- If this needs a fifth seam, add it here rather than widening an existing one. ✓ —
  `ToolRegistry.structFor(api)`, plus `structName` to key it.

**What shipped: the registry owns the struct, so `clear()` is always its own.** The tool
tables were never the problem; `api.mapStruct(ToolPropertyCache)` was. A `DataStruct`
describes a class, but this one's shape is built from the tools a *cache instance* was
filled with, so keying it on the class hands every registry the same struct and the second
`buildAPI` clears the first's accessors. `structFor` maps the cache instance instead —
`mapStruct` keys on object identity, which is the same trick `_buildAccessors` already uses
for the accessor prefix objects — under a per-registry `structName`. `clear()` then only
ever wipes a struct this registry filled, so it stays, and stale accessors from an
unregistered tool still get dropped.

That is a third route past a plan sub-question, after stage 2's cycle. It is worth naming
why the plan's two options were both worse: making `mapStruct` per-API is task 2 in full,
and it changes what `getStruct(cls)` answers on an api that never mapped `cls` — today the
module map covers for it, and `resolvePath` leans on that. Dropping `clear()` leaves the
struct wider than any one cache forever.

**So `_map_structs` is untouched, and task 2 is still owed.** `mapStruct` is still keyed on
the class object and still module-global; two `DataAPI`s still share one struct for any
model class either of them maps. Stage 5 took the defaults binding out of that map's reach
rather than fixing the map. The plan's claim that this stage "has to fix `_map_structs`
first" was wrong: it had to stop depending on it.

**The desktop app's live bug, revisited.** `defineGraphApi` still clears what
`defineShellApi` built, because both sit on `defaultRegistry` and so on one struct — but it
refills it from the same class list, so the result is identical and nothing observable
happens. The breakage the census described needs two registries, and two registries now
have two structs. Benign today, and no longer able to turn malignant.

**Shared versus per-API, settled.** Per *registry*, not per api. Values were never in
question (one cache per registry, by construction since stage 2); the binding now matches
them. The visible consequence is that `cache.api` and `cache.dstruct` name the last api to
call `buildAPI`, which is what they did before — `set()` falls back to them when a tool is
missing from the map, so a tool saving a default on an api that is not the last builder
writes through the wrong one's struct. Pre-existing, unchanged, and out of scope here.

**Found while testing: toolpath prefixes are shared between registries, by name.**
`_buildAccessors` maps each prefix object under the bare prefix (`api.mapStruct(obj[k],
true, k)`), and `mapStruct` hands back an existing struct of that name — so two registries
holding `foo.a` and `foo.b` describe `foo` with one struct carrying both members. Each
registry's accessor *object* is still its own, so reading the other's path resolves and then
finds nothing, and `getValue` throws. Left as is and pinned by the last test: the prefix
namespace is global anyway, and the values stay separate. It does mean a registry cannot
give an existing toolpath prefix a different shape.

Stage 4's flagged incoherence is closed: `buildToolSysAPI` walks `api.registry.classes` for
the nstructjs pass too. Barrel unchanged, 588 keys.

### Stage 6 — document

**Done.**

- `CLAUDE.md` gains a short registry section and the nstructjs constraint. ✓ — a
  "Registration and registries" subsection under `## ToolOp`, pointing at the full write-up.
- Wherever the tool system is written up, say the module exports are the default registry's
  tables. ✓ — `documentation/toolsystem.md` gains a Registration section: the four tables
  and their identity with `defaultRegistry`, defaults keyed by toolpath, how to build a
  second registry, the class stamp and its inheritance, and the two constraints (global
  struct names, prefixes shared by name). `documentation/controller.md`'s struct-aliasing
  note gains the two consequences the tool system leans on.
- Tick `todos.md`, and correct `toolsys-tasks.md`'s claim that tasks 2 and 3 are
  independent. ✓ — the independence claim had already been retracted there; what needed
  fixing was the sentence after it, "Task 3 goes first and fixes it", since task 3 did not.
  Task 2's sketch is rewritten around what is actually left, and task 3 is marked done.

The example in `toolsystem.md` had `ToolOp.register(SomeTool)` inside the class body. Fixed
in passing.

## Later, not here

Parent chaining so an isolated registry inherits the built-ins; `dispose()` for test
isolation; a serializable catalog projection for a toolstack in another process; and whether
macro type ids are per-registry or process-wide.

## Repos

Almost entirely submodule. `toolop.ts`, `toolpath.ts`, `toolmacro.ts`, `tooldefaults.ts`,
`toolsys.ts` and `controller.ts` are under `scripts/path-controller/`. Three path.ux-side
pieces need the paired commit and gitlink bump: `scripts/simple/app.ts` and
`example/core/context.ts` for the `ctx.toolDefaults` seam (stage 4), the tests (stages 1 and
5), and stage 6's documentation.

## Findings

### From the fresh-context pressure test

| Finding                                                                                                                      | Disposition                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| The census was wrong: `simple/app.ts`, `example/` and `tests/` read the tables directly, and `example/` is in the gate       | **Accepted.** Census rewritten; the grep behind the draft never searched `SavedToolDefaults` and never left `scripts/`. |
| A fourth seam, `ctx.toolDefaults`, has no owner in the design                                                                | **Accepted.** Added as a seam and to stage 4.                                                                           |
| The proposed cycle is a mutual module-scope TDZ deadlock, and the draft's option 1 is the failing shape                      | **Accepted**, and the diagnosis was right — but one of the two replacement fixes was wrong too; stage 2 shipped a third. |
| Stage 1 could not verify its own deliverable                                                                                 | **Accepted.** Folded into stage 2; stage 1 is now the missing tests.                                                    |
| The `saveDefaultInputs` justification is wrong at every call site, and misses `_redo`                                        | **Accepted.** The `ToolOp` constructor is the real ctx-less site; corrected.                                            |
| Macro classes never pass through `register()`, so nothing would stamp them                                                   | **Accepted.** Now an explicit sub-question of the seam and a stage 3 deliverable.                                       |
| Stage 4 tested one seam of three, and `_map_structs` blocks the other two                                                    | **Accepted**, and rewritten as stage 5 — but the fix was to stop routing the defaults struct through `mapStruct`, not to fix it. |
| `macroidgen` was described two contradictory ways; neither it nor `initToolPaths_run` is exported and neither needs an alias | **Accepted.** Table now marks what is exported; the counter is stated as process-wide with the question left open.      |
| Stage 2's regression net does not exist for defaults and macros                                                              | **Accepted.** That is stage 1.                                                                                          |
| `unregister`/re-register and subclass stamping are undecided                                                                 | **Accepted.** Both are stage 3 deliverables.                                                                            |
| Stage 4's "same class in two registries is refused" contradicts "changes no behaviour"                                       | **Accepted.** Dropped; `register` keeps warning.                                                                        |
| `initSimpleController` is dead, and the free `parseToolPath`/`initToolPaths` need wrappers                                   | **Accepted.** Both stated.                                                                                              |
| The barrel rule and the `dist` key diff are not in the plan                                                                  | **Accepted.** Added as a hard constraint and a stage 2 step.                                                            |
| `tooldefaults.ts` must survive as a module, since `simple/app.ts` imports it by path                                         | **Accepted.** Stated in the cycle section.                                                                              |
| `unregister`'s `.remove()` polyfill cast still works against a `readonly` field                                              | **Accepted**, noted in the design so it is not a surprise.                                                              |

Confirmed sound and left alone: every census line number, the `global.d.ts` cleanup, the
superproject half of the census, the nstructjs constraint and the no-namespacing conclusion,
and `ModelInterface` as the owner of path → class.
