# Per-API tool tables

`ModelInterface` carries an ordered list of registries and owns two things a single
`ToolRegistry` reference owns today: the resolved toolpath table, and the tool-defaults
binding. `ToolRegistry` keeps the stored values.

Continues [`tool-registry.md`](tool-registry.md), whose *Later, not here* listed parent
chaining.

Status: **stages 1-3 done; stages 4-6 outstanding.** Pressure-tested once by a fresh-context agent, and revised
substantially. Two blocking findings removed claims the plan was partly built on: the
`ToolPropertyCache.api`/`.dstruct` bug it promised to close does not exist any more, and the
macro-defaults policy it proposed to choose is already shipped and was described backwards.
See [Findings](#findings).

<!-- toc -->

- [Why](#why)
- [What is there today](#what-is-there-today)
  - [The seven readers of `api.registry`](#the-seven-readers-of-apiregistry)
  - [What already supports N registries per api](#what-already-supports-n-registries-per-api)
  - [`ToolPropertyCache`](#toolpropertycache)
  - [Macros](#macros)
  - [Macro defaults, as shipped](#macro-defaults-as-shipped)
- [The design](#the-design)
  - [An api carries a list and owns the resolved table](#an-api-carries-a-list-and-owns-the-resolved-table)
  - [The api binds, the registry stores](#the-api-binds-the-registry-stores)
  - [`ToolPropertyCache` loses the tree](#toolpropertycache-loses-the-tree)
  - [Macros in the merged table](#macros-in-the-merged-table)
  - [The macro defaults policy is written down, not changed](#the-macro-defaults-policy-is-written-down-not-changed)
- [Why not a global toolpath registry](#why-not-a-global-toolpath-registry)
- [What flips](#what-flips)
- [Hard constraints](#hard-constraints)
- [What deliberately does not change](#what-deliberately-does-not-change)
- [Risk](#risk)
- [Stages](#stages)
  - [Stage 1 — pin what is not pinned](#stage-1--pin-what-is-not-pinned)
  - [Stage 2 — the list and the merged table](#stage-2--the-list-and-the-merged-table)
  - [Stage 3 — the api owns the binding](#stage-3--the-api-owns-the-binding)
  - [Stage 4 — macros in the table](#stage-4--macros-in-the-table)
  - [Stage 5 — pin and document the macro defaults policy](#stage-5--pin-and-document-the-macro-defaults-policy)
  - [Stage 6 — document](#stage-6--document)
- [Later, not here](#later-not-here)
- [Open questions](#open-questions)
- [Repos](#repos)
- [Findings](#findings)
  - [From the fresh-context pressure test](#from-the-fresh-context-pressure-test)

<!-- regenerate with pnpm markdown-toc -->

<!-- tocstop -->

## Why

`api.registry` is one reference, so an api gets one namespace and no fallback. A subsystem
that wants its own tools has to either register into the default registry or lose the
built-ins entirely.

- **An ordered list is more expressive than parent chaining.** Chaining puts a parent
  pointer on `ToolRegistry`, which bakes one hierarchy for every consumer. A list at the api
  makes composition per-consumer: two APIs can order the same two registries differently.
  This replaces the chaining item in `tool-registry.md`'s *Later, not here* rather than
  layering on it.
- **A merged table beats walking the list.** Holding `toolpath → { cls, registry }` on the
  api makes `parseToolPath` one lookup, gives the defaults binding a per-toolpath owner, and
  turns collision detection into a duplicate key at merge time.
- **The motivating case is unchanged.** `c:/dev/visualnovel/docs/research/ux-behaviour-model.md`
  wants per-editor tool catalogs and a model keyed on toolpath strings. A string is only a
  usable key if it names one tool.

Two things improve as consequences: the toolpath-prefix struct merge that
`documentation/toolsystem.md` currently documents as a constraint goes away, and the macro
defaults policy — which is shipped, coherent and undocumented — gets written down and pinned.

**This plan does not fix a `ToolPropertyCache` binding bug, because there is not one.** The
first draft said it did, inheriting a census from `toolsys-tasks.md` § Task 2 that submodule
commit `68bfc5d` had already made stale. Correcting that file is a stage 6 deliverable.

## What is there today

### The seven readers of `api.registry`

| Site                                                    | Reads                         | Under a list      |
| ------------------------------------------------------- | ----------------------------- | ----------------- |
| `updateToolSysAPI` (`toolsys.ts:29`)                    | `api.registry.buildAPI(api)`  | loop              |
| the nstructjs pass (`toolsys.ts:104`)                   | `api.registry.classes`        | loop              |
| `parseToolPath` (`controller.ts:1647`)                  | `this.registry`               | the merged table  |
| `parseToolArgs` (`controller.ts:1659`)                  | `this.registry`               | the merged table  |
| `createTool` (`controller.ts:1668`)                     | `this.registry`               | the merged table  |
| the `toolDefaults` root member (`toolsys.ts:58`)        | `api.registry.structFor(api)` | **single-valued** |
| the `ctx.toolDefaults` getter (`toolsys.ts:88`)         | `api.registry.defaults`       | **single-valued** |

And two more outside `toolsys.ts`, both single-valued, both reaching the cache object
directly:

| Site                       | Reads                          |
| -------------------------- | ------------------------------ |
| `simple/app.ts:112`        | `this.api.registry.defaults`   |
| `example/core/context.ts:51` | `this.api.registry.defaults` |

`example/` is inside the gate — `pnpm typecheck`'s second pass is
`tsgo --noEmit -p example/tsconfig.json` — so that row is not example code that can be left
behind.

`getToolDef` routes through `this.parseToolPath` (`controller.ts:1549`) and needs nothing of
its own. `getToolPathHotkey` (`controller.ts:1563`) reaches no registry at all, matching
toolpath strings against the screen's keymaps; it is a method on `DataAPI`, called as
`ctx.api.getToolPathHotkey(...)`, so it is not a ctx-less caller either. `window.parseToolPath`
(`toolpath.ts:13,21`) is the only genuinely ctx-less one, and it stays on the default
registry.

The four single-valued rows are the whole difficulty. Everything else falls out of iteration.

### What already supports N registries per api

Stage 5 of `tool-registry.md` built most of this while fixing something else:

- `structFor(api)` maps per (registry, api) pair through the per-registry `structName`
  (`toolregistry.ts:237-239`), so several registries build their own struct into one api.
- `buildAPI`'s `dstruct.clear()` is already scoped to the registry's own struct (`:249-250`).
- `_builtAPIs` is a per-registry `WeakRef` list (`:58`) read through `apis()` (`:74`), and
  `updateDefaults(cls)` with no api argument already iterates it (`:209`).

So N registries against one api works today, end to end, as `tests/toolregistry_second.test.ts`
demonstrates. This plan makes it the ordinary configuration and gives the four single-valued
seams an owner.

### `ToolPropertyCache`

Five fields (`tooldefaults.ts:12-32`): `map` (deprecated), `pathmap`, `accessors`,
`userSetMap`, and `registry` — the owning registry, assigned by `ToolRegistry`'s constructor.

Three of them exist only to feed the binding:

- `accessors` — a nested object tree, built by `_ensureValues` walking the toolpath's
  segments (`:62-101`).
- `pathmap` — partial prefix to tree node, filled by the same walk.
- `_buildBinding` maps each tree node into a struct with `api.mapStruct(obj[k], true, k)`
  (`:131`), and prefixes the first segment with `"accessors."` (`:127-129`) because the
  `dataref` is the cache and the tree hangs off `cache.accessors`. The api-visible path is
  unaffected, since the apiname is the bare segment. **The prefix merge comes from `:131`:**
  `mapStruct` returns an existing struct of that name, so two registries holding `foo.a` and
  `foo.b` describe `foo` once.

Nothing is ever removed. `map`, `pathmap`, `accessors` and `userSetMap` only grow, and
`dstruct.clear()` does not touch them (`tool-registry.md` stage 1).

There is **no** stale api/struct binding. `set()`'s recovery path calls
`this.registry?.updateDefaults(cls)` (`:244-245`) and `updateDefaults` iterates `apis()`, so a
cache reaches every api it was built into rather than the last one.

### Macros

- **The key is structural and unique.** `_getTypeClass` builds it from the member class
  names, then the subclass toolpath where the macro is subclassed, then the input names
  (`toolmacro.ts:153-165`). Stage 3 of `tool-registry.md` fixed the `+=` bug that used to
  collapse it to the last member tool. Pinned at `tooldefaults.test.ts:248-268`.
- **The key is the toolpath.** `tdef.toolpath = key` (`:206`), so `_getFinalToolDef` and
  `_splitToolpath` work on a macro class unchanged.
- **Generation is lazy and bypasses `register()`.** `_getTypeClass` writes
  `registry.macros[key] = cls` the first time a macro of that shape runs, and stamps the
  class by hand (`:144`) because nothing else would.
- **`_macroTypeId` is process-wide on purpose** (`:214-216`), because ids repeating across
  registries would collide in a saved file. The key is per-registry, so the id and the key
  already disagree about scope.
- **A not-ready class carries the subclass's toolpath, or `""`.** Called from the `ToolOp`
  constructor before `tools` is filled, `_getTypeClass` returns early (`:147-151`) with
  `toolpath` taken from `this.constructor.tooldef().toolpath || ""` (`:139`). So a
  `ToolMacro` subclass gets its own toolpath and a bare `ToolMacro` gets `""`. The read path
  does not reach `_splitToolpath`: `has`/`get` go through `_getAccessor` (`:172-176`), which
  reads `cls.tooldef().toolpath` and returns `undefined` silently. The visible symptom for a
  bare macro is `set()`'s "Malformed toolpath" error at `:233`.

### Macro defaults, as shipped

This is a coherent policy, not an accident, and the first draft of this plan described it
backwards. What the code does:

- **`add()` aliases, it does not copy.** For every member input without `PropFlags.PRIVATE`,
  `selfInputs[k] = prop` puts the member's own property object into the macro's `inputs`
  (`toolmacro.ts:335-354`). The macro's inputs *are* its members' inputs.
- **`connect()` unaliases.** Linking a property deletes it from `this.inputs`
  (`:291-311`), so `MacroLink` removes a property from macro-scoped defaults. It is an
  opt-out, not a promotion route.
- **The macro re-reads after its tools are added.** `exec` (`:449`) and `modalStart`
  (`:388`) both call `this.loadDefaults(false)`, under the comment "macros obviously can't
  call loadDefaults in the constructor". `loadDefaults` is gated on `!prop.wasSet`
  (`toolop.ts:717`).
- **The write lands macro-scoped.** `toolstack.ts:399` calls `saveDefaultInputs()` on the op
  it ran; for a macro that is the override at `toolmacro.ts:235-248`, writing every aliased
  property under the macro key.

Net: a member reads its individual toolpath default at construction as a seed, the macro then
overrides it with the macro-scoped value, and the save goes to the macro key. So **macro
inputs are macro-scoped by default, with `PRIVATE` and `connect()` as the two opt-outs.**
Pinned working at `tooldefaults.test.ts:228-246`.

## The design

### An api carries a list and owns the resolved table

```ts
class ModelInterface {
  registries: ToolRegistry[]; // ordered; assignment rebuilds the table
  toolPaths: Map<string, { cls: typeof ToolOp; registry: ToolRegistry }>;

  get registry(): ToolRegistry; // alias for registries[0]
  set registry(r: ToolRegistry);
}
```

- Merge order is list order.
- **A duplicate key across two registries is an error at merge time.** Within one api a
  toolpath names one tool, which is what makes a bare toolpath usable as an identity in a
  serialized record. It costs one check, because the merge is already the scan.
- **One registry can never collide with itself**, since `paths` is a `Record` keyed on
  toolpath. So `new DataAPI()` — which assigns `registry = defaultRegistry` in the constructor
  (`controller_abstract.ts:77`) — can never throw, and the check is inherently about two or
  more registries. Two classes in *one* registry declaring the same toolpath stays
  last-wins, as `initPaths` does today (`toolregistry.ts:134-140`); changing that is out of
  scope.
- **Macros are exempt from the check**, so "first wins" applies to them and to nothing else.
  See [Macros in the merged table](#macros-in-the-merged-table).
- Merge sources are `registry.classes` **and** `registry.macros`.
- `registry` survives as a getter/setter alias, the same migration aid the four table aliases
  were in `tool-registry.md` stage 2. `toolregistry_api.test.ts:119-121` repoints
  `api.registry` deliberately and keeps working, but assignment is a setter that rebuilds
  rather than a plain field.

**The table is not built once.** Registration after construction is a live path, not a
hypothetical: `setDataPathToolOp` unregisters and re-registers at runtime
(`controller.ts:1726-1734`), `tests/toolregistry_second.test.ts:94-103` constructs an api at
module scope and registers in `beforeAll`, and `tests/tooldefaults.test.ts:27` builds one api
at module scope and registers a different tool in each test. So `ToolRegistry.register` and
`unregister` notify their APIs through `apis()`, the channel `updateDefaults` already uses,
and the api adds or drops the one toolpath rather than remerging. A full remerge happens only
when `registries` is assigned.

This is also why the plan does not lean on the lazy-rescan trick `parseToolPath` uses
(`toolregistry.ts:162-166`, where a miss re-runs `initPaths` because a miss may mean the map
is stale): a rescan cannot detect a collision it introduces, and the duplicate-key rule needs
a moment to fire in.

### The api binds, the registry stores

`ctx.toolDefaults` and the `toolDefaults` root struct member are built per api, from the
merged table, with each leaf bound to the owning registry's storage.

- **The path shape is preserved.** `ctx.toolDefaults.<prefix>.<tool>.<prop>` is what
  `container_menu.ts:92` reads through, and anything already bound keeps resolving.
- **The prefix tree becomes the api's**, so a shared prefix is the design rather than a
  caveat: `foo` carries `foo.a` and `foo.b` even when they come from different registries,
  each leaf reading through its own. The constraint `toolsystem.md` documents goes away
  instead of being reworded.
- **Values stay per registry.** `tool-registry.md` stage 5 settled that deliberately, so two
  graph panes do not forget each other's last-used values. Only the binding moves.

This is the same move stage 5 made once already, one level further: `structFor` took the
defaults struct out of `mapStruct`'s class-keyed reach; this takes the binding out of the
registry entirely.

**All four single-valued readers are edited in the same stage**, and they must agree:
`toolsys.ts:58` and `:88` are the app-facing pair, and `simple/app.ts:112` and
`example/core/context.ts:51` are three separate wirings of the same getter. Leaving the last
two reading `registries[0].defaults` while `toolsys.ts:88` returns the merged view would give
`ctx.toolDefaults` two different meanings depending on which host built the context.

### `ToolPropertyCache` loses the tree

With the api owning the binding, the cache is storage and nothing else.

- The `accessors` tree and `pathmap` are deleted. They exist only so `_buildBinding` has
  objects to `mapStruct`, and the api builds that tree now.
- Storage becomes `Map<toolpath, Record<propName, value>>` plus `userSetMap`. The deprecated
  `map` field goes with them.
- `registry` stays. It is the cache's owner, not a stale binding.
- Removal becomes possible: a flat map keyed on toolpath can drop an entry at `unregister`,
  which the three-structure design could not.

The public method surface (`get`, `set`, `has`, `useDefault`) is preserved. That is necessary
but **not sufficient**, because several tests and all four single-valued readers hold the
cache by identity — see [What flips](#what-flips). `SavedToolDefaults` stays an identity alias
onto `defaultRegistry.defaults`.

Whatever `ctx.toolDefaults` returns has to expose the object the JS-side data path walks, not
just the methods. The `"accessors."` first hop (`tooldefaults.ts:127-129`) is part of that
shape, and open question 1 owns the decision.

### Macros in the merged table

- Merged from `registry.macros`, filtering on `ready` so the not-ready bootstrap class never
  enters.
- **Exempt from the duplicate-key check.** Two registries can hold the same structural key
  legitimately: the key is derived from member class names and shape, not from registry
  identity, and two macros of one shape sharing a set of defaults is the intent. A structural
  key should collide when the structure matches.
- **Reserved prefix.** A key with no `.` splits to a single segment, so
  `"MoveOp:RotateOp:x:y:"` currently lands as a top-level member of the defaults tree beside
  `mesh` and `view3d`. Emitting `macro.<key>` keeps the tree legible and lets a lint rule tell
  a macro path from a tool path. Safe to change for the reason stage 3 of `tool-registry.md`
  gave when it changed the key already: nothing in path.ux persists the cache or reads
  `_macroTypeId`, so no saved file carries the old keys.
- **Staleness needs the same hook `register` gets.** `_getTypeClass` already holds the
  registry through `registryOf`, so it notifies `apis()` when it generates a shape. That makes
  macro creation and `register()` one path, which is what has been missing since stage 3 had
  to stamp macros by hand.

### The macro defaults policy is written down, not changed

The shipped policy stands: **macro inputs are macro-scoped by default, seeded from the
individual toolpath at construction, with `PropFlags.PRIVATE` and `connect()` as the two
opt-outs.** This plan pins and documents it and changes no behaviour.

The first draft proposed replacing it with individual-toolpath-only plus explicit promotion,
on the argument that current behaviour was incoherent. That argument was wrong on the facts —
see [Macro defaults, as shipped](#macro-defaults-as-shipped) — and the replacement would have
made running a macro silently rewrite the standalone tool's saved default.

**The apparent tension with the duplicate-key rule is not one.** A macro-key value overriding
an individual-toolpath value is two different toolpaths holding values for one property
object, resolved by an explicit `loadDefaults` call. The duplicate-key rule is about two
registries offering one toolpath, where there is no principled way to choose. Different
question, different answer, and the documentation should say so where it would otherwise read
as an inconsistency.

## Why not a global toolpath registry

A process-wide `toolpath → class` table would give uniqueness across APIs rather than within
one. It is rejected:

- It restores the shape the last three plans removed — the four tool tables onto
  `ToolRegistry`, `_map_structs` and `_map_structs_by_name` onto `DataAPI`,
  `useGlobalRegistry` deleted. A module singleton two hosts both write to has no owner and no
  teardown, and `ToolRegistry` still has no `dispose()`, so a test that registers a tool would
  poison the next one.
- It can detect a collision but not resolve one. Two subsystems that both want `node.delete`
  get a warning and no recourse, where the merged per-api table resolves it correctly for
  each.
- It re-globalizes what per-api struct tables just localized. `getStructByName` went
  api-relative for this reason.

`window.parseToolPath` is the one caller with no api in hand, and it stays on the default
registry. The process-wide question, if it is ever wanted, is a dev-mode reporter that walks
the live APIs and prints overlaps: the same information without a singleton, and gated the way
the duplicate-name warning at `controller.ts:841-849` already is.

## What flips

Pins that assert what this plan changes. Stage 2 rewrites none of these; stages 3 and 4
rewrite exactly this list, and anything else needing an edit is a finding to report rather
than a test to fix quietly.

| Pin                                             | Asserts                                           | Stage |
| ----------------------------------------------- | ------------------------------------------------- | ----- |
| `toolregistry_second.test.ts:128`               | `ctxB.toolDefaults` **is** `registryB.defaults`   | 3     |
| `toolregistry_second.test.ts:145`               | `ctx.toolDefaults` **is** `SavedToolDefaults`     | 3     |
| `toolregistry_api.test.ts:115,122,123`          | the same identity, three more times               | 3     |
| `toolregistry_second.test.ts:140`               | `SavedToolDefaults.pathmap.has(...)`              | 3     |
| `toolregistry_second.test.ts:157-158`           | `pathmap.get("stage5c")` on both caches           | 3     |
| `tooldefaults.test.ts:206,207`                  | the bare macro key as toolpath and `MacroClasses` key | 4 |
| `tooldefaults.test.ts:259-260`                  | two more bare macro keys                          | 4     |
| `tooldefaults.test.ts:216`                      | `hasDefault` is false before the first save       | 4     |
| `tooldefaults.test.ts:219-222,234,264`          | `set()`'s "unregistered?" warning fires once      | 4     |

The last two flip only if stage 4's notify hook builds defaults accessors rather than only the
path table. Open question 2 owns that; whichever way it goes, the rows move together.

## Hard constraints

- **The `pathux` barrel must not gain a name.** Diff the sorted `Object.keys()` of built
  `dist/pathux.js` against a pre-change baseline; **588 today**, counted from the single
  `export {}` block. A type-only addition is invisible to it and has to be caught by reading
  the diff.
- **Barrel-stable is not signature-stable.** Deleting `ToolPropertyCache` fields and changing
  `_buildBinding` touches a barrel-exported class called from another module. The key count
  will not move. Check signatures by hand.
- **No new module-scope import cycle.** `tool-registry.md` calls this "a certainty to be
  designed around" and shipped a third fix after two proposals failed;
  `tests/toolregistry_load.test.ts` exists for it. Stages 2 and 4 are safe by inspection —
  `controller_abstract.ts` already value-imports `ToolOp` from the `../toolsys` barrel
  (`:3-10`) and `defaultRegistry` (`:12`), and assigns in the constructor rather than at
  module scope. **Stage 3 is the one that adds an edge**, `controller.ts` gaining a value
  import from `toolsys/tooldefaults.ts`, which is safe only while `tooldefaults.ts` imports
  `../controller` type-only (`:3`) and `controller_base` by value (`:2`).
  `toolregistry_load.test.ts` must be green at stage 3 and is not optional there.
- **nstructjs registers by class name globally**, and saved files in consumer projects depend
  on those names. Registries stay a runtime concept.
- **`_macroTypeId` stays process-wide**, on `defaultRegistry.macroIdGen`, for the saved-file
  reason `toolmacro.ts:214-216` records.
- **Re-run `pnpm run gen:paths`** after any stage that moves struct ownership.
- **`setDataPathToolOp` calls `ToolOp.unregister(DataPathSetOp)` and does not put it back.**
  Do not call it from a test without restoring.
- Green means `pnpm typecheck` — **both passes; the second is `example/`, the only thing that
  type-checks the public surface** — `pnpm test`, `pnpm format:check` and `pnpm lint:prose`.

## What deliberately does not change

- Saved default **values** stay one cache per registry. Only the binding moves.
- **The macro defaults policy.** Stage 5 pins and documents it; no behaviour moves.
- `ToolOp.register`, `unregister` and `isRegistered` stay the default registry's public API,
  and the four module tables stay its tables by identity.
- Two classes in one registry sharing a toolpath stays last-wins.
- No `dispose()`, no parent chaining on `ToolRegistry`, no catalog projection. The list
  replaces chaining; the other two stay deferred from `tool-registry.md`.
- `ToolPropertyCache`'s public method surface.

## Risk

- **The quiet failure is a stale merged table.** It is a `register()` problem first and a
  macro problem second, which is why the notification lands in stage 2 rather than stage 4.
  Three existing test files register after constructing an api, so the suite catches it.
- **The loud failure is a duplicate-key throw.** It fires only where two or more registries
  are listed, never from `new DataAPI()`, and it names both registries.
- **The one-way door is the `ctx.toolDefaults` path shape.** It does not move under this
  design, and that is why the design was chosen over first-wins or one member per registry. A
  stage that moves it is a different plan.
- **Stage 3 is the release-cost step**, and it is wider than the cache: four wiring sites and
  five identity assertions move together.
- Reversibility is good through stage 2 while `registry` remains an alias.

## Stages

One green commit pair per stage: submodule first, then the parent's gitlink.

### Stage 1 — pin what is not pinned (done)

Most of what this plan touches is already covered, and saying which is what makes stage 2's
"nothing else should need editing" rule checkable.

**Already pinned; confirm, do not duplicate:** `ctx.toolDefaults` resolving
`<prefix>.<tool>.<prop>` on a one-registry api (`toolregistry_second.test.ts:129,136,146,147`,
`toolregistry_api.test.ts:105-115`); two registries on one api each getting their own defaults
struct (`toolregistry_second.test.ts`); the macro key being structural and unique
(`tooldefaults.test.ts:248-268`); a macro subclass reading no default at construction
(`tooldefaults.test.ts:216`); the macro-scoped read-then-override
(`tooldefaults.test.ts:228-246`).

**Genuinely missing, and worth writing:**

- A member tool inside a macro reads its **individual** toolpath default at construction,
  before `loadDefaults` overrides it. This is the seed half of the policy and nothing asserts
  it in isolation.
- A non-modal member's value is saved under the **macro** key and not under the member's own
  toolpath. Write the assertion against the member's own toolpath, not as "does the value come
  back" — the macro saved the same aliased property object under the macro key, so the naive
  form passes whether or not the behaviour is intact. It needs the async toolstack to reach
  `toolstack.ts:399`.
- `connect()` removing a property from macro-scoped defaults, which is one of the two
  documented opt-outs and is untested.
- Cost to undo: free.

### Stage 2 — the list and the merged table (done)

- `ModelInterface.registries`, with `registry` as a getter/setter alias onto `registries[0]`.
- The merged `toolPaths` table, built from `classes` and `macros`, with macros exempt from
  the duplicate-key error.
- **`ToolRegistry.register` and `unregister` notify `apis()`**, and the api adds or drops one
  toolpath rather than remerging. This is in stage 2 and not stage 4 because register-after-
  construction is the common case, and three existing test files do it.
- `parseToolPath`, `parseToolArgs` and `createTool` read the table. `updateToolSysAPI` and the
  nstructjs pass loop the list.
- Stage 1's tests plus the existing suite are the net; nothing in
  [What flips](#what-flips) is due yet, so a test needing an edit means the stage is wrong.
- Barrel diff against a pre-stage baseline.
- Cost to undo: cheap while `registry` is an alias. The setter cannot throw for a single
  registry, so no existing construction path changes.

### Stage 3 — the api owns the binding (done)

- The api builds the `toolDefaults` struct tree from the merged table, each leaf bound to the
  owning registry's storage. `ctx.toolDefaults` reads through the same view.
- **All four single-valued readers move together**: `toolsys.ts:58`, `toolsys.ts:88`,
  `simple/app.ts:112`, `example/core/context.ts:51`. The last two are the gitlink-paired
  path.ux-side edit.
- `ToolPropertyCache` loses `accessors`, `pathmap` and `map`; storage becomes the flat map.
  Method surface preserved; `registry` kept.
- Settle whether `structFor` and the per-registry `structName` survive. `per-api-struct-tables.md`'s
  F2 kept them because two registries on one api is reachable, and this plan makes that the
  ordinary configuration.
- `unregister` drops the entry, now that it can.
- Rewrite exactly the stage-3 rows of [What flips](#what-flips).
- `toolregistry_load.test.ts` green, per the import-cycle constraint. Re-run
  `pnpm run gen:paths`.
- Cost to undo: **one release**, and the widest stage. Consumers start relying on a defaults
  path that resolves across registries.

### Stage 4 — macros in the table

- Merge `registry.macros`, filtered on `ready`.
- Emit `macro.<key>` as the generated toolpath.
- `_getTypeClass` notifies `apis()` when it generates a shape.
- Rewrite exactly the stage-4 rows of [What flips](#what-flips), which includes deciding open
  question 2.
- Test that a macro generated after the list was assigned resolves, and that its defaults land
  under `macro.`.
- Cost to undo: cheap. Nothing persists the key.

### Stage 5 — pin and document the macro defaults policy

No behaviour changes here. The policy is shipped; this stage makes it legible.

- Write it into `documentation/toolsystem.md` beside the toolpath-keying rule: macro-scoped by
  default, seeded from the individual toolpath at construction, `PRIVATE` and `connect()` as
  the opt-outs.
- State why it is not in tension with the duplicate-key rule.
- Stage 1's three new pins are the evidence; add the `macro.` prefix to the wording.
- Cost to undo: free.

### Stage 6 — document

- `documentation/toolsystem.md` § Registration: the list, the merged table, the duplicate-key
  rule. **Delete the toolpath-prefix constraint**, which stage 3 removes.
- `CLAUDE.md`'s Registration and registries subsection, matching.
- `documentation/controller.md:221-229` and `:255-260`, the two ranges that document
  `structName` as a live guard, per stage 3's decision.
- **Correct `toolsys-tasks.md` § Task 2**, which still describes `ToolPropertyCache.api`/`.dstruct`
  as live and `_map_structs` as module-global. Both were fixed before this plan was written.
- Tick `todos.md`.

## Later, not here

- **Prefix claims.** A registry declaring the toolpath prefixes it owns, with `register()`
  refusing anything outside them, would give identity *across* APIs rather than within one.
  Wanted only if a swept record has to be resolvable without knowing which api produced it.
- The dev-mode overlap reporter described above.
- **`example/editors/screen.ts:5,49`** iterates the module-level `ToolClasses` to build the
  command palette, so it shows only the default registry's tools. That is at odds with the
  per-editor-catalog motivation, and it is inside the typecheck gate. Not this plan's work,
  but named here because `tool-registry.md`'s pressure test found this exact file missing from
  a census.
- `dispose()` and the serializable catalog projection, still deferred from `tool-registry.md`.

## Open questions

1. **What is the data shape of what `ctx.toolDefaults` returns?** Preserving `get`/`set`/`has`/
   `useDefault` is not enough: the JS-side data path walks an object, and `_buildBinding`'s
   `"accessors."` first hop (`tooldefaults.ts:127-129`) is part of that shape. Five tests hold
   the cache by identity. Decide before stage 3 whether the view is a new object, the cache
   with a redirected tree, or something the api owns outright.
2. **Does the macro notify hook build defaults accessors, or only the path table?** Stage 4's
   "its defaults land under `macro.`" implies the former. Four `tooldefaults.test.ts`
   assertions move either way; which four depends on the answer.
3. **Does the merge skip classes with no own `tooldef`,** as `initPaths` does
   (`toolregistry.ts:134-137`)? Without that filter, abstract bases enter the table and two
   classes in one registry sharing a toolpath become a throw where they silently last-win
   today.

## Repos

Mostly submodule: `toolregistry.ts`, `tooldefaults.ts`, `toolsys.ts`, `toolmacro.ts`,
`toolop.ts` and `controller_abstract.ts` are under `scripts/path-controller/`. The path.ux
side needs the paired commit and gitlink bump for `scripts/simple/app.ts:112` and
`example/core/context.ts:51` at stage 3, the tests at stages 1, 3 and 4, and stages 5 and 6's
documentation.

The superproject is barely exposed: `apps/desktop/renderer/pathux/app/api.ts:43,63` are the
only `buildToolSysAPI` calls in `apps/` or `packages/`, nothing there touches a table, a cache
or `api.registry`, and both calls pass `rootCtxClass` as undefined — so the desktop app never
installs a `ctx.toolDefaults` getter at all.

## Findings

### From the fresh-context pressure test

Sixteen findings, six blocking. Every file:line citation in the plan was re-verified against
the submodule at `e5f0377`.

| Finding                                                                                            | Disposition                                                                                                                                    |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ToolPropertyCache.api`/`.dstruct` no longer exist; the "bug this closes" was fixed by `68bfc5d`   | **Accepted**, verified. Claim deleted from three sections and from stage 3. Correcting the stale `toolsys-tasks.md` census is a stage 6 item.   |
| The reader table missed `simple/app.ts:112` and `example/core/context.ts:51`, both single-valued   | **Accepted**, verified. Both added; moving all four together is now a stage 3 deliverable and a design bullet.                                  |
| The eager table has no invalidation for `register`/`unregister`, only for macros                   | **Accepted.** The notification moved to stage 2, with three live register-after-construction sites named.                                       |
| The macro-defaults section was backwards; the policy it proposed to choose is already shipped      | **Accepted**, verified. Section re-derived from `add`/`connect`/`exec`/`modalStart`; stage 5 shrank to pinning and documenting.                 |
| Stage 3 breaks five identity assertions and two `pathmap` reads, none listed                       | **Accepted.** A *What flips* table now covers them, and open question 1 owns the view's shape.                                                  |
| Stage 4's rename and hook flip four more assertions, unnamed                                       | **Accepted.** Listed in *What flips*, gated on open question 2.                                                                                 |
| `getToolPathHotkey` described two contradictory ways                                               | **Accepted.** It has an api and needs no registry; struck from the open question and from the global-registry section.                          |
| "First wins" and "duplicate is an error" are mutually exclusive; a throwing setter throws in `new DataAPI()` | **Accepted.** One registry cannot collide with itself, so construction never throws and first-wins applies only to the macro exemption. Stated. |
| Line-citation drift in `toolmacro.ts`, plus a `controller.ts` range copied from a sibling plan     | **Accepted**, all re-verified: stamp `:144`, toolpath `:206`, id `:214-216`, key `:153-165`, guard `:147-151`, warning `:841-849`, app `:112`.  |
| The not-ready mechanism was wrong; a subclass gets its own toolpath and the read path never reaches `_splitToolpath` | **Accepted.** Rewritten around `:139` and `_getAccessor` (`:172-176`); the conclusion survives, the mechanism did not.               |
| Stage 1 overlapped existing coverage and its second pin was a trap                                 | **Accepted.** Stage 1 now separates confirm-only from genuinely missing, and states why the naive form of that pin passes when broken.          |
| `structFor` / `structName` left undecided while load-bearing                                       | **Accepted.** A stage 3 deliverable, with the two `controller.md` ranges named in stage 6.                                                      |
| The `accessors.` first hop is unaddressed                                                          | **Accepted.** Documented in the census and folded into open question 1.                                                                         |
| `example/editors/screen.ts` iterates the module table and is in the gate                           | **Accepted** as out of scope but named, under *Later, not here*.                                                                                |
| No import-cycle analysis, though the series has been bitten before                                 | **Accepted.** Now a hard constraint: stages 2 and 4 safe by inspection, stage 3 adds the one edge and must keep `toolregistry_load.test.ts` green. |
| Cost-to-undo understated at stages 2 and 5                                                         | **Accepted.** Stage 2's throw concern dissolves once construction cannot throw; stage 5 no longer changes behaviour, so its cost is now free.   |

Confirmed sound and left alone: all four `toolsys.ts` citations; every citation in *What
already supports N registries per api*; "nothing is ever removed" from the cache; the
`getToolDef` and `window.parseToolPath` routing; the 588-name barrel count, counted directly
from `dist/pathux.js`; the toolpath-prefix constraint existing in `toolsystem.md` and being
genuinely removed rather than reworded; all four bullets of *Why not a global toolpath
registry*; the macro key's structural uniqueness and the `_macroTypeId` constraint; and the
superproject census.
