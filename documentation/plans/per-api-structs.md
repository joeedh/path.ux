# Per-API struct ownership

Task 2 of [`toolsys-tasks.md`](toolsys-tasks.md): "bind tool defaults per `DataAPI` instead
of per process". The census below reframes it — after task 3 landed, neither half of the
sketch has a live symptom, and the two halves turn out not to be independent.

Status: stages 1-3 done; stage 4 not planned, and the review that could have called for
it did not. Revised once after a
fresh-context pressure test, which found a third `DataAPI` the first census missed, a
pre-existing hole in the global map, and a second job the field stage 2 wanted to delete is
doing. See [Findings](#findings).

<!-- toc -->

- [What is actually true today](#what-is-actually-true-today)
- [The configuration this is for](#the-configuration-this-is-for)
- [What breaks if `mapStruct` goes per-API](#what-breaks-if-mapstruct-goes-per-api)
- [Three positions](#three-positions)
- [Stages](#stages)
  - [Stage 1 — pin what sharing does](#stage-1--pin-what-sharing-does)
  - [Stage 2 — the registry owns its APIs](#stage-2--the-registry-owns-its-apis)
  - [Stage 3 — make the sharing honest](#stage-3--make-the-sharing-honest)
  - [Stage 4 — only if review rejects the recommendation](#stage-4--only-if-review-rejects-the-recommendation)
- [Hard constraints](#hard-constraints)
- [Follow-ups](#follow-ups)
- [Open questions](#open-questions)
- [Findings](#findings)
  - [From the fresh-context pressure test](#from-the-fresh-context-pressure-test)

<!-- regenerate with pnpm markdown-toc -->

<!-- tocstop -->

## What is actually true today

Every claim here was measured against the tree, not read off the sketch. The sketch was
wrong about one of them, and the first draft of this census was wrong about two more.

**Two `DataAPI`s share every `DataStruct` below the root.** Only `rootContextStruct` is
per-api. `_map_structs` (`controller/controller.ts:588`) is module-level and keyed by an id
stamped on the class object, so the first api to map a class decides that class's shape for
every api in the process — model classes, `ToolOp` classes built by `buildOpAPI`, and a
registry's defaults cache alike.

**Except that the map already has an opt-out, and the opt-out is broken.** `_addClass`
stamps `cls[CLS_API_KEY]` at `controller.ts:836`, *before* the `useGlobalRegistry` early
return at `:842`. So a class mapped with `useGlobalRegistry: false` is marked mapped
process-wide while `_map_structs[key]` is never written. The consequences are live today:
`api.hasStruct(cls)` is `true` on every api (`:707-709` is a bare `hasOwnProperty`), and
`api.mapStruct(cls, true)` returns `undefined` on every api, because the key is present so
auto-create never fires. This is the `hasStruct`/`getStruct` disagreement this plan's own
table predicts for position 3 — it is already in the tree.

**`api.structs` holds only the structs that api created.** `mapStruct` returns early from
the module map without pushing, so an api that maps nothing new has an empty `structs` while
the api that mapped first holds every entry. `getStructs()` has zero readers in path.ux,
`example/`, `buildtools/`, or the desktop app (`controller.ts:699-701,841` are the only
mentions), so this is wrong rather than broken.

**The sketch's knock-on claim is false.** It says a tool registered after two
`buildToolSysAPI` calls "gets accessors in the second API only". Both APIs see it, because
they share the one defaults struct it is built into. That was true before task 3 as well —
the claim was never right.

**`cache.api` / `cache.dstruct` are last-writer-wins** (`toolsys/tooldefaults.ts:42-43`) and
are read back by `ToolRegistry.updateDefaults` (`toolsys/toolregistry.ts:167-172`) and by
`ToolPropertyCache.set`'s recovery path (`tooldefaults.ts:182`). They are harmless for
exactly the reason above: whichever api they name, the struct they reach is the same one.

**`cache.api` has a second job.** `updateDefaults` uses the api it falls back to for *two*
things, not one: `buildOpAPI(api, cls)` at `toolregistry.ts:179` as well as
`_buildAccessors` at `:185`. `buildOpAPI` is irreducibly api-shaped — `api.mapStruct(cls,
true)` plus `customGetSet` DataPaths over a live op's inputs — and it is what
`ctx.last_tool.<input>` resolves through: `buildToolSysAPI` declares `last_tool` as a
`dynamicStruct` (`toolsys.ts:65`), `LastToolPanel` builds `last_tool.${k}` paths
(`widgets/ui_lasttool.ts:188`), and resolution reaches `this.mapStruct(obj2.constructor,
false)` at `controller.ts:1243`. Nothing in the suite covers it, and a miss there falls back
to `dpath.data` at `:1249-1251` rather than erroring.

**Nothing clears a struct it does not own any more.** `updateToolSysAPI` was the only such
caller, and task 3's stage 5 gave each registry its own defaults struct. That was the one
mechanism turning sharing into destruction. Note the limit: `buildAPI`'s `dstruct.clear()`
(`toolregistry.ts:208`) clears the top struct only — nested prefix structs are re-fetched by
identity (`tooldefaults.ts:76`) and never cleared, so task 3's "stale accessors still get
dropped" holds for single-segment toolpaths only.

So **the two halves are coupled, and the coupling runs the wrong way.** Half A
(last-writer-wins fields) is inert *because* half B (global structs) is unfixed. Fixing half
B alone would create the bug half A describes: an api that was not the last builder would
stop seeing late-registered tools.

That argument holds only under one branch of a decision listed below as open. `structFor`
passes an explicit `structName` (`toolregistry.ts:200`), and `mapStruct` hands back an
existing struct **by name** at `controller.ts:883-884` before it creates one. If
`_map_structs_by_name` stays process-global while `_map_structs` goes per-api, the second api
gets the first's defaults struct back by name and half A's bug never appears. **This plan
assumes both indexes split together**, because keeping one global is what produced the
`hasStruct` hole above. Under that assumption: half B must not land without half A.

## The configuration this is for

- `defineShellApi()` — one `DataAPI`, built once
  (`apps/desktop/renderer/pathux/app/api.ts:11`).
- `defineGraphApi(getGraph)` — one more **per `NodeEditor` pane** (`api.ts:52`, called from
  `editors/nodes.ts:226`).
- **A third kind, inside path.ux itself**: `theme_editor.ts:1054` builds a `DataAPI` per
  theme-object class (`CSSFont`, `ThemeScrollBars`, …), cached on the class. It is a library
  widget, so it exists in any app that opens the theme editor. It reaches its goal by opting
  *out* of the global map (`_addClass(cls, st, undefined, false)`), not by wanting a second
  entry in it — but it is the closest thing in the tree to a working prototype of position 3,
  and it is where the broken opt-out above actually bites.
- `example/api/api_define.ts:102` and `simple/app.ts:156` each build one.
- path.ux's own `CLAUDE.md` calls two `DataAPI`s in one process a supported configuration,
  because `NodeGraphView` ships as a hostable widget and `NodeEditor` ships unregistered.

Every graph pane describes `Graph` and the node classes identically, which is why sharing
works there. Nothing wants two APIs to describe one class differently *through the global
map*; the theme editor wants a class described only privately, which is a different thing
and already has a mechanism.

## What breaks if `mapStruct` goes per-API

Six sites resolve a struct for a class the asking api may never have mapped.

| Site                                | Shape                                                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `graph/graph_api.ts:51-52`          | `nodeStructFor` guards with `hasStruct` (process-global) then calls `getStruct`                                            |
| `graph/group.ts:375-376`            | `GroupNode.defineAPI` calls `api.getStruct(Graph)`; would need `defineGraphAPI(api)`, which is idempotent                  |
| `controller/controller_base.ts:662` | `DataList`'s default `getStruct` does `api.getStruct(obj.constructor)` for an element class                                |
| `controller/controller.ts:978`      | the mass-set filter's `api.mapStruct(obj.constructor, false)`                                                              |
| `controller/controller.ts:974`      | that filter resolves through `ctx.api ?? this` — the **context's** api, not the path's owner. `editors/nodes.ts:227-229` overrides `api` on the graph ctx, so this is a second, independent failure at the same call |
| `controller/controller.ts:1243`     | dynamic-struct resolution, which `ctx.last_tool.<input>` goes through                                                     |

**These fail silently, not loudly.** `mapStruct`'s throw is on the `key === undefined &&
!auto_create` branch (`controller.ts:888`); under a design that keeps `cls[CLS_API_KEY]` as a
stable class id the key is always defined, so control reaches `return _map_structs[key]` and
per-api that is `undefined`. `nodeStructFor` then returns `undefined` typed as `DataStruct`,
and `controller.ts:1249-1251` substitutes `dpath.data` — a wrong struct, no error.

`hasStruct`, `getStruct` and `mapStruct` have to move together; a per-api `getStruct` behind a
process-global `hasStruct` is strictly worse than either. Two `auto_create = false` sites are
same-api and therefore not hazards: `example/core/datablock.ts:450`, and `simple/app.ts:177-179`
(which passes a `DataStruct` where `auto_create` goes — a pre-existing bug that works because
the value is truthy).

Three decisions come with it:

- **Auto-create's test must change.** Today `mapStruct` auto-creates only when the key is
  *absent* (`controller.ts:874-890`). Per-api, the key can be present — stamped by api A —
  while this api's map has no entry, so the test becomes "key absent **or** key not in this
  api's map". Without that, every second api gets `undefined` from every call, `structFor`
  included.
- **`getStructByName` / `_map_structs_by_name`.** Documented public API
  (`documentation/controller.md`), pinned by `tests/mapStructByName.test.ts`, and meant for
  lookups that cross a serialization or bundle boundary. See the assumption stated above.
- **Explicit-name aliasing.** `mapStruct(cls, true, name)` deliberately returns an existing
  struct of that name. Task 3 leans on it twice: the accessor prefix objects, and a
  registry's own defaults struct. Whatever per-api means, it must not break those.

## Three positions

**1 — Close it.** State the rule the code actually follows, then make the code tell the
truth: either populate `structs` on every api that maps a class, or delete `getStructs`.
Cost: two APIs can never describe one class differently through the global map.

**2 — Half A only.** Move "which APIs has this registry been built against" from
`ToolPropertyCache` to `ToolRegistry`, as a pruned list rather than a single last-writer
field. `updateDefaults` with no arguments then reaches *every* built api instead of the most
recent one, which is what the sketch wanted and what `buildOpAPI` needs. Small, and a
prerequisite for 3.

**3 — Per-API structs.** Move `_map_structs` onto the instance, fix the auto-create test,
and fix the six sites. This is the task as originally written.

**Recommendation: 2, then 1 — and not 3 yet.** Position 2 removes a real trap for a
contained change, and has to happen first under either of the others. Position 3 changes the
lookup every datapath resolution goes through, fails silently when it is wrong, and serves a
capability nothing has asked for; its honest trigger is a consumer that needs two
descriptions of one class through the global map, and there isn't one. The pressure test
strengthened this rather than weakening it: the one place in the tree that wants a private
description already has `useGlobalRegistry`, and that mechanism is *itself* broken — fixing
it (position 1's work) is better value than generalizing it.

## Stages

### Stage 1 — pin what sharing does

**Done.** `tests/perApiStructs.test.ts`, five tests, all passing against unchanged code
(stage 2 added a sixth).
Dropping `buildOpAPI` from `updateDefaults` fails two of them, so the guard stage 2 needs is
real.

- Tests only, no production changes. **path.ux only; no submodule half, so no commit pair.**
- Two APIs, both built: assert the root structs differ while the structs below them are the
  same objects, and assert a late-registered tool reaches both.
- Assert the invariant, not the fixture: `api.structs` holds the structs *that api created*.
  "Empty" is only true when the second api maps nothing new, which is not the desktop shape —
  `apiB` maps `Graph` fresh at `graph_api.ts:18`.
- Pin the `useGlobalRegistry: false` hole: after `_addClass(cls, st, undefined, false)`,
  `hasStruct(cls)` is `true` and `mapStruct(cls, true)` is `undefined`, on any api. Wrong,
  pinned as-is, fixed in stage 3.
- Pin `ctx.last_tool.<input>` resolving for a tool registered *after* `buildToolSysAPI` —
  this is the assertion stage 2 can break.
- Read first, do not duplicate: `tests/mapStructByName.test.ts` covers name lookup and
  explicit-name aliasing; `tests/toolregistry_second.test.ts:94-120,161` already builds two
  APIs in the desktop shape and already pins cross-api struct sharing.
- Cost to undo: free.

### Stage 2 — the registry owns its APIs

**Done.** Both fields deleted. `pnpm typecheck` clean on both passes, `pnpm test` green at
47 files / 469 tests, barrel unchanged at 588 keys.

What shipped, against what the stage predicted:

- `ToolRegistry._builtAPIs` is a `WeakRef<DataAPI>[]`, read through `apis()`, which derefs and
  compacts in place. It does **not** hold the struct alongside each api, as the stage said it
  would: `structFor(api)` recovers it from `mapStruct` by name, so there was nothing to store.
- `updateDefaults(cls)` with no api iterates `apis()`, which reaches `buildOpAPI` on every
  built api rather than only the newest. An empty list means `buildToolSysAPI` has not run yet
  and there is nowhere to build into.
- `_buildAccessors` split into `_ensureValues` (seeds `accessors` and `pathmap` from the
  toolpath alone) and `_buildBinding` (adds the `DataPath` to a struct), plus two statics,
  `_splitToolpath` and `_accessorName`, that both halves need.
- The stage's warning about `prop2` resolved the other way: the split **does** copy twice. It
  has to, since `_ensureValues` runs with no api and cannot see the normalized copy. The seeded
  value is unaffected, because uiname normalization only writes `uiname` and `description`, so
  the second copy costs an allocation and changes nothing.
- `cache.api` / `cache.dstruct` are replaced by `cache.registry`, assigned by `ToolRegistry`'s
  constructor, which warns if a cache is handed to a second registry. A cache has one owner for
  its lifetime, so unlike a bound api it cannot go stale.
- `set()`'s recovery path, for a tool whose accessors were never built, now calls
  `_ensureValues` and then `this.registry?.updateDefaults(cls)`. Before the split it reached
  `this.api.mapStruct` and threw `Cannot read properties of undefined` whenever no api had been
  built; it now seeds, warns, and leaves the binding to the next `buildAPI`.
- `tests/tooldefaults.test.ts:60-61` edited exactly as predicted, from "both fields are
  defined" to "the registry owns this cache and has been built against this api".
- One test added to `tests/perApiStructs.test.ts` for that recovery path, and one assertion
  added that `apis()` holds both APIs rather than the newest.

Mutation-tested, both halves load-bearing:

- Seeding unconditionally instead of `if (!(name in obj))` — 1 failed / 14 passed.
- `_buildAccessors` calling only `_buildBinding` — the file's `beforeAll` throws
  `TypeError: Cannot convert undefined or null to object` out of `mapStruct(obj[k])` on a
  prefix that was never seeded, so vitest reports the file as skipped rather than failed.
  Skipped on a hook throw is a kill, not a vacuous pass.

- `ToolRegistry` gains a pruned list of the APIs `buildAPI` has run against, each with the
  struct it built. `WeakRef` plus prune-on-iteration, because `defineGraphApi` builds one per
  pane and a strong list would pin every closed pane's struct graph;
  `controller/pathwatch.ts` is the existing precedent for that shape in this repo.
- `updateDefaults` with no arguments iterates that list, so a late-registered tool gets both
  its accessors **and** its `buildOpAPI` struct on every built api, not just the newest.
- `ToolPropertyCache._buildAccessors` splits: one half seeds `accessors` / `pathmap` from the
  toolpath with no api, one half adds `DataPath` members to a struct. `set()`'s recovery path
  (`tooldefaults.ts:180-185`) calls the value half, then asks the registry to rebind.
  Watch `prop2` (`:87`): one copy currently feeds both the `DataPath` and the seeded value,
  with uiname normalization in between at `:92-102`. The split must not seed from an
  un-normalized prop, and must not copy twice.
- `cache.api` / `cache.dstruct` are then dead. They are `declare`d public on a
  barrel-exported class (`tooldefaults.ts:18-19`), so this is the plan's one-way door —
  answer open question 5 before writing code.
- **This stage must edit `tests/tooldefaults.test.ts:60-61`**, which asserts both fields are
  defined. That is a task-3 stage-1 pin, so the edit is expected rather than a warning sign,
  but it makes this a commit pair in the unusual direction: submodule plus one path.ux test.
- Stage 1's other tests must pass unedited, the `last_tool` one especially.
- Cost to undo: two public fields, one release.

### Stage 3 — make the sharing honest

**Done.** `pnpm typecheck` clean on both passes, `pnpm test` green at 47 files / 470 tests,
barrel unchanged.

- `DataAPI._localStructs` is a `WeakMap<object, DataStruct>` holding the structs mapped with
  `useGlobalRegistry: false`. `_addClass` writes there and returns *before* stamping, so the
  opt-out no longer leaves a global id with nothing behind it.
- `mapStruct` checks it before the stamp, and `hasStruct` ORs the two, which lands the plan's
  own finding that `hasStruct`, `getStruct` and `mapStruct` have to move together.
  `graph/graph_api.ts:51-52` is the one site that pairs them.
- The opt-out therefore stops poisoning the class process-wide. Before this, one
  `theme_editor.ts:1056` call made `mapStruct(thatThemeClass, true)` return `undefined` on
  every api forever, with auto-create unable to recover because the id was already there.
- `getStructs()` deleted; it had no caller in either repo outside stage 1's own test. The
  `structs` field stays, documented as *the structs this api created*, which is what stage 1
  pinned.
- Stage 1's two pins rewritten to the fixed behaviour, and a second opt-out test added for the
  case the fix unlocks: a class that opted out on one api can still be mapped globally later.
- Rule written into `documentation/controller.md` (§ Who Owns a DataStruct) and `CLAUDE.md`.

Not done here, and not in the plan: dropping `CLS_API_KEY` in favour of a module-level
`WeakMap`. It is a representation change with the same semantics, worth doing on its own; see
[Follow-ups](#follow-ups).

- Fix the `useGlobalRegistry` hole: do not stamp `CLS_API_KEY` before the early return, or
  give the opt-out its own per-api storage. This is a real bug, not documentation.
- Whichever of "populate `structs` on every api" or "delete `getStructs`" survives review.
- Write the rule down, in `documentation/controller.md` and `CLAUDE.md`. The honest wording is
  narrower than "one `DataStruct` per class per process", which three things already
  contradict: the `useGlobalRegistry` opt-out, explicit-name aliasing (many classes to one
  struct, documented as intended at `controller.md:215-219`), and `inheritStruct`, which
  `copy()`s the parent (`controller.ts:812-823`). Write: *a class mapped through the global
  registry has one `DataStruct` for the process; a `DataAPI` owns its root and its opt-outs.*
- Tick `todos.md`, update `toolsys-tasks.md`.
- Cost to undo: cheap in code, expensive in belief once written down.

### Stage 4 — only if review rejects the recommendation

- Per-api `_map_structs`, the auto-create test, the six sites, and the three decisions above.
- Wants its own pressure test, being a different-sized change from stages 1-3.
- Cost to undo: high. This is the one to be sure about.

## Hard constraints

- **nstructjs registers by class name globally**, and saved files in consumer projects depend
  on those names. Nothing here may namespace a struct name.
- **The `pathux` barrel.** Splitting a module the barrel reaches must not add a name to it.
  Diff the sorted export keys of the built `dist/pathux.js` against a baseline, and remember
  the runtime bundle cannot see a type-only addition.
- **`pnpm typecheck` runs twice.** The second pass is `example/`, and it is the only thing
  that type-checks the public surface.
- **The generated catalog.** `buildtools/resolve-struct-imports.mjs:28` statically scans
  `mapStruct` / `mapStructCustom` / `inheritStruct` call sites, and
  `buildtools/gen-datapaths.mjs:320` / `datapath-walker.mjs:268` walk
  `api.rootContextStruct`. `pnpm run gen:paths` writes a committed catalog; re-run it after
  any stage that moves struct ownership.
- [`tool-registry.md`](tool-registry.md) is the record of how the registry got here. Its
  stage 5 section explains why a registry's defaults struct is keyed on the cache instance.

## Follow-ups

- **Replace `CLS_API_KEY` + `_map_structs` with a module-level `WeakMap<class, DataStruct>`.**
  The stamp is already own-property-only on both read paths, so a `WeakMap` matches its
  semantics exactly while dropping `_map_struct_idgen`, the mutation of foreign classes, and
  the leak of every mapped class. `CLS_API_KEY_CUSTOM` must **not** move with it: it is read
  with `in` (`controller.ts:1240`), so it inherits down the prototype chain and a `WeakMap`
  would not. Its own commit, since it touches every resolution path.
- **Moving `_map_structs` / `_map_structs_by_name` onto `DataAPI` is position 3, not a follow-up
  to the `WeakMap`.** The two look adjacent and are not: one changes representation, the other
  changes semantics. Both tables have to move together — object-keyed lookup would keep handing
  out the shared struct otherwise — and that is the change this plan rejected on cost with no
  live symptom to show for it. It wants its own pressure test.

## Open questions

Carried forward; the pressure test answered the rest.

1. ~~Deprecate or delete the two public fields?~~ **Decided: delete outright.** Nothing
   outside `tests/tooldefaults.test.ts:60-61` reads them in either repo, and `dstruct` is
   redundant with `ToolRegistry.structFor(api)`, which knows the same answer without
   last-writer-wins ambiguity.
2. ~~Should stage 3 fix the `useGlobalRegistry` stamp by not stamping, or by giving the opt-out
   per-api storage?~~ **Decided: per-api storage, a `WeakMap` on the `DataAPI`.** Not stamping
   is not the smaller option it looked like: `mapStruct(cls, false)` on an unstamped class
   *throws* (`controller.ts:891`) rather than returning `undefined`, so that route converts a
   silent miss into an exception at every `auto_create = false` site, `controller_base.ts:662`
   included.

## Findings

### From the fresh-context pressure test

| Finding                                                                                                    | Disposition                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Stage 2 silently drops `buildOpAPI` for late-registered tools; the plan never mentioned it                 | **Accepted**, and it changed stage 2's design: the registry owns a list of built APIs instead of the field simply being deleted. |
| Stage 2's "no behaviour change" is wrong at `set()`'s recovery path                                        | **Accepted.** The recovery path now rebinds through the registry rather than being value-only.                                   |
| `tests/tooldefaults.test.ts:60-61` reads both fields, so stage 2 cannot be green without editing it        | **Accepted.** Stated in stage 2, including that it makes the commit pair run the other way.                                     |
| The census missed a third `DataAPI`: `theme_editor.ts:1054`, one per theme-object class, in the library    | **Accepted.** Added to the configuration list. The "nothing wants two descriptions" sentence is qualified rather than dropped — the theme editor wants a *private* description, which is a different want with an existing mechanism. |
| `_addClass` stamps `CLS_API_KEY` before the `useGlobalRegistry` early return, so the opt-out is already broken | **Accepted**, and it is the sharpest finding: the failure mode this plan predicted for position 3 is already live. Now a stage 1 pin and a stage 3 fix, and it strengthens the recommendation rather than weakening it. |
| The table's failure mode is wrong — `mapStruct` returns `undefined`, it does not throw                     | **Accepted.** Stated, with the `dpath.data` fallback that hides it.                                                             |
| Per-api needs auto-create's test to change, or every second api gets `undefined`                            | **Accepted.** Added as the first of the three decisions.                                                                        |
| The coupling claim is conditional on whether `_map_structs_by_name` splits too                              | **Accepted.** The plan now states which branch it assumes and why.                                                              |
| Stage 1's "`structs` is empty" pins the fixture, not the system                                            | **Accepted.** Replaced with "holds the structs that api created", with the desktop counterexample.                              |
| Stage 1 overlaps `tests/toolregistry_second.test.ts`, unmentioned                                          | **Accepted.** Both overlapping files are now named.                                                                             |
| "One `DataStruct` per class per process" is contradicted three ways                                        | **Accepted.** Stage 3 carries the narrower wording and the three contradictions.                                                |
| Unstated: the `prop2` split, what replaces `cache.api`, deprecate-vs-delete, cost to undo                  | **Accepted.** First two are in stage 2, third is open question 1, fourth is per stage.                                          |
| Two `auto_create = false` sites outside the table; "five sites" should say five *cross-api* sites           | **Accepted.** Both named as non-hazards.                                                                                        |
| `controller.ts:974` resolves through `ctx.api ?? this`, a second failure at the same call                  | **Accepted.** Added as its own table row.                                                                                       |
| Unmentioned: the buildtools struct scanners, and that `clear()` only clears the top struct                 | **Accepted.** Scanners are a hard constraint; the `clear()` limit is in the census.                                             |

Nothing was rejected. The reviewer's closing call — that stage 2 ships looking small while
quietly breaking `ctx.last_tool` for late-registered tools — is the failure this revision is
built to prevent, and it is why stage 1 pins that path before stage 2 touches anything.
