# A `ToolRegistry` object

Moves the module-level tool tables onto an object, with the current module globals kept as
aliases onto a default instance. Task 3 of [`toolsys-tasks.md`](toolsys-tasks.md).

Status: not started. Revised once after a fresh-context pressure test, which invalidated the
first draft's census, its import-cycle fix, and its stage boundaries. See
[Findings](#findings) for the disposition of each.

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

Two fixes that work, one to be chosen in stage 2:

- Move `ToolPropertyCache` into `toolregistry.ts`, leaving `tooldefaults.ts` as a re-export
  shim. It must survive as a module exporting that name either way, because
  `simple/app.ts:5` imports it by path rather than through the barrel.
- Make `defaults` a lazy getter, so nothing is constructed at module scope.

Cheap prerequisite, worth doing first regardless: `tooldefaults.ts:3` and `toolsys.ts:4`
import `DataAPI`/`DataStruct` as values from the `../controller` barrel but use them only as
types. Converting to `import type` deletes two large edges from the cycle graph.

`defaultRegistry` must also exist before the module-scope `ToolOp.register(...)` calls at the
bottom of many modules run.

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

Reversibility: stages 1-4 are reversible while the aliases stand. The one-way door is
whichever module ends up owning `ToolPropertyCache`, because that changes barrel provenance.

## Stages

Each stage is green under `pnpm typecheck` — **both passes; the second one is `example/`** —
`pnpm test` and `pnpm format:check` on its own.

### Stage 1 — tests for the parts that have none

Grep over `tests/` finds no coverage of `SavedToolDefaults`, `saveDefaultInputs`,
`hasDefault`, `loadDefaults` or `ToolMacro` — only `toolpath_parse.test.ts:69-71` touches
registration at all. That is exactly where the macro and defaults hazards live, so the
regression net is written before anything moves, not after.

- Saved defaults survive a register → construct → `saveDefaultInputs` → construct round trip.
- A `ToolMacro` gets and sets its defaults through `_getTypeClass()`.
- `unregister` → re-register, as `setDataPathToolOp` does it.
- A subclass of a registered tool: pin whatever it does today, so stage 3 shows the movement.

### Stage 2 — the class, the cycle, and the tables

Merged, because the draft's separate stage 1 could not verify its own deliverable: with no
consumer there is no cycle, no load order and no test that would fail.

- `import type` conversion in `tooldefaults.ts` and `toolsys.ts` first.
- New `toolsys/toolregistry.ts`; pick a cycle fix and record which and why.
- The six tables become registry members; the four exported ones become aliases.
- `ToolOp.register` / `unregister` / `isRegistered` delegate.
- Barrel diff against a baseline built before the stage.
- Stage 1's tests plus the existing suite are the net. A test needing an edit means a
  behaviour change, which means the stage is wrong.

### Stage 3 — the class → defaults stamp

- Stamp at `register()`, and at `_getTypeClass()` for macros.
- Answer the three sub-questions above in code: subclass inheritance, `unregister` clearing,
  and what `isRegistered` means once more than one registry exists.

### Stage 4 — `ModelInterface` carries a registry

- A `registry` field defaulting to `defaultRegistry`; `parseToolPath`, `createTool`,
  `getToolDef`, `getToolPathHotkey` read it. Free functions stay as wrappers.
- `ctx.toolDefaults` reaches the registry's cache rather than the module global, at all three
  wiring sites.
- Still one registry in play, so still no behaviour change.

### Stage 5 — make a second registry actually work

The draft's stage 4 tested the easiest seam and would have passed while two others were
broken. This stage has to fix `_map_structs` first.

- `mapStruct` must give each `DataAPI` its own `DataStruct` for a shared class, or
  `registry.buildAPI` must stop calling `clear()` on a struct it does not own. Either way
  this is task 2's bug; settle the shared-versus-per-API question for default _values_ here
  (shared is almost certainly right — the bug is in the binding, not the values).
- Then the test: register a tool into registry B, point a `DataAPI` at it, resolve the
  toolpath, read a default, and run it — with the default registry never seeing the class,
  and registry A's accessors still intact afterwards.
- If this needs a fifth seam, add it here rather than widening an existing one.

### Stage 6 — document

- `CLAUDE.md` gains a short registry section and the nstructjs constraint.
- Wherever the tool system is written up, say the module exports are the default registry's
  tables.
- Tick `todos.md`, and correct `toolsys-tasks.md`'s claim that tasks 2 and 3 are independent.

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
| The proposed cycle is a mutual module-scope TDZ deadlock, and the draft's option 1 is the failing shape                      | **Accepted.** Section rewritten with the two fixes that work and the `import type` prerequisite.                        |
| Stage 1 could not verify its own deliverable                                                                                 | **Accepted.** Folded into stage 2; stage 1 is now the missing tests.                                                    |
| The `saveDefaultInputs` justification is wrong at every call site, and misses `_redo`                                        | **Accepted.** The `ToolOp` constructor is the real ctx-less site; corrected.                                            |
| Macro classes never pass through `register()`, so nothing would stamp them                                                   | **Accepted.** Now an explicit sub-question of the seam and a stage 3 deliverable.                                       |
| Stage 4 tested one seam of three, and `_map_structs` blocks the other two                                                    | **Accepted.** Rewritten as stage 5, fixing `mapStruct` first; the tasks-are-independent claim is retracted.             |
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
