# Per-API struct tables

Move `_map_structs` and `_map_structs_by_name` off the module and onto `DataAPI`, so a
`DataStruct` belongs to the api that built it rather than to the process.

This is "position 3" from [`per-api-structs.md`](per-api-structs.md), which rejected it on
cost. That rejection was reviewed and did not survive: three of its four stated costs were
wrong, and two argued the other way. See that plan's
[Follow-ups](per-api-structs.md#follow-ups) for the correction, which this plan is the
continuation of.

Status: **not started**, not yet pressure-tested.

<!-- toc -->

- [Why now](#why-now)
- [What actually changes](#what-actually-changes)
- [Census](#census)
  - [Already written for this](#already-written-for-this)
  - [Changes behaviour](#changes-behaviour)
  - [Unverified, and the plan must verify before relying on it](#unverified-and-the-plan-must-verify-before-relying-on-it)
- [Stages](#stages)
  - [Stage 1 — pin the bootstrap crash](#stage-1--pin-the-bootstrap-crash)
  - [Stage 2 — move the tables](#stage-2--move-the-tables)
  - [Stage 3 — collapse what the change makes redundant](#stage-3--collapse-what-the-change-makes-redundant)
  - [Stage 4 — document and measure](#stage-4--document-and-measure)
- [What flips](#what-flips)
- [Hard constraints](#hard-constraints)
- [Open questions](#open-questions)

<!-- regenerate with pnpm markdown-toc -->

<!-- tocstop -->

## Why now

- The prerequisite landed. `_map_structs` is already a `WeakMap` keyed on the class, so this
  change moves a field rather than rewriting a lookup.
- The sharing is not neutral, it is a **degradation**. `defineGraphAPI` guards with
  `if ("nodes" in st.pathmap) return st` and `nodeStructFor` guards with `hasStruct` — both
  keyed on the struct, both already written per-api. Under the global table a second api hits
  those guards, skips its own `defineAPI`, and silently resolves through the first api's
  struct.
- Every remaining consumer of the sharing is a workaround for the sharing. `ToolRegistry`
  maps its defaults cache *instance* under a per-registry `structName` for no reason except
  that keying on `ToolPropertyCache` let one registry's `buildAPI` clear another's. The
  `useGlobalRegistry` opt-out and its `_localStructs` WeakMap exist for the same reason.

## What actually changes

- `_map_structs` (`WeakMap<object, DataStruct>`) and `_map_structs_by_name`
  (`Record<string, DataStruct>`) become instance fields on `DataAPI`.
- They must move **together**. Moving only the name table changes nothing, because the
  object-keyed lookup still hands out the shared struct.
- `mapStruct`, `getStruct`, `hasStruct`, `getStructByName`, `inheritStruct`,
  `mapStructCustom` and `_addClass` all become genuinely per-api. Their signatures do not
  change; only what they answer does.
- `CLS_API_KEY_CUSTOM` stays a module-level stamp. It is read with `in`
  (`controller.ts:1240`), so it inherits down the prototype chain and a per-api table would
  not. Give its callback the api as a second argument so a custom getter can resolve against
  the right one; existing callbacks ignore the extra parameter.

## Census

Built from greps over path.ux and the superproject, excluding build output.

### Already written for this

- **`apps/desktop/renderer/pathux/app/api.ts`** — the largest consumer, and the shape this
  change is for. `defineShellApi()` and `defineGraphApi()` are self-contained factories: each
  makes its own root, maps what it needs, and calls `buildToolSysAPI(api, false, root)`. The
  whole app calls `mapStruct` **once** (`:16`), and never calls `getStruct`, `hasStruct` or
  `getStructByName`.
- **`scripts/graph/graph_api.ts:13-21`** (`defineGraphAPI`) and **`:49-57`**
  (`nodeStructFor`) — per-api already, and currently degraded by the global table, as above.
- **`scripts/simple/app.ts:155`** (`makeAPI`) — iterates `DataModelClasses`, `areaclasses` and
  the ctx class, mapping each into the api it was given.
- **`scripts/graph/group.ts:375-376`** — `api.getStruct(Graph)` uses the api it was handed.
  Correct as written, provided that api ran `defineGraphAPI`, which it does.
- **`controller_base.ts:662`** — `DataList`'s default `getStruct` resolves an element's
  constructor against the api passed at resolve time. Correct as written.
- **`toolsys/toolregistry.ts`** — `updateDefaults` already iterates `this.apis()` and builds
  into each, as of `per-api-structs.md` stage 2.

### Changes behaviour

- **A half-initialized api starts throwing.** `mapStruct(cls, false)` — which is what
  `getStruct` is — throws `"class does not have a struct definition"` for a class this api
  never mapped. Today it silently borrows whichever api mapped first. This is the intended
  outcome and was accepted explicitly; it is also the only item here that surfaces at runtime
  rather than at compile or test time.
- **`getStructByName` becomes api-relative.** Two APIs registering a class run the same code
  and derive the same stable name, so the lookup still resolves — to that api's struct. An api
  that never mapped the class now answers `undefined` instead of finding a global entry.
- **Structs multiply by api.** One `DataStruct` per mapped class per api, and `defineAPI` runs
  once per api per node class. Bounded by class count; the objects are small.

### Unverified, and the plan must verify before relying on it

- **Does `DataStruct.add` dedupe?** `buildOpAPI` does `api.mapStruct(cls, true)` then
  `st.add(dpath)` per input, and `updateDefaults` calls it once per built api. Under the
  global table the second api therefore adds a second `DataPath` for every input **to the same
  struct**. If `add` does not dedupe, that is a live duplicate-member bug today which this
  change fixes as a side effect — worth a test either way. Do not state it as fact until read.
- **Whether any `DataStruct` is passed between APIs by hand.** `DataPath.validStructs` is
  baked in at define time and `copy()` slices it (`controller_base.ts:207`), so per-api
  `defineAPI` runs give each api's paths that api's structs. Confirm nothing hands a struct
  built under one api to another's `st.struct(...)`.
- **Memory, measured rather than assumed.** Take a heap snapshot of a pane-heavy desktop
  layout before and after.

## Stages

One green commit pair per stage: submodule first, then the parent's gitlink.

### Stage 1 — pin the bootstrap crash

- Tests only. Extend `tests/perApiStructs.test.ts` and add a graph-side case.
- Pin, against **unchanged** code, what the global table currently does: a second api that
  calls `defineGraphAPI` early-returns and resolves through the first api's struct; a class
  mapped by api A resolves on api B that never mapped it.
- Pin the `buildOpAPI` duplicate question either way, once read.
- These pins flip in stage 2 by design. Their job is to make the diff legible, not to protect
  the behaviour.

### Stage 2 — move the tables

- `_map_structs` and `_map_structs_by_name` become `DataAPI` instance fields.
- Give `CLS_API_KEY_CUSTOM`'s callback the api as a second argument.
- Rewrite the stage 1 pins to the new behaviour. Nothing else in the suite should need
  editing; anything that does is a finding to report, not a test to fix quietly.

### Stage 3 — collapse what the change makes redundant

- **`_localStructs` and the `useGlobalRegistry` parameter go away.** Once every mapping is
  per-api, "do not add this to the global registry" has nothing to opt out of.
  `theme_editor.ts:1054-1056` becomes two ordinary `_addClass` calls, or plain `mapStruct`.
- **`ToolRegistry.structName` and the cache-instance mapping revert.** `structFor` can key on
  `ToolPropertyCache` again, because a registry's defaults struct is now its api's alone.
  Delete the per-registry name generator with it.
- Each of these is a separate reviewable commit inside the stage.

### Stage 4 — document and measure

- Rewrite `documentation/controller.md` § Who Owns a DataStruct and the `CLAUDE.md` short
  form. The new rule is the simple one the old code could not honestly claim: **a `DataAPI`
  owns every struct it maps.**
- Record the heap measurement.
- Close position 3 in `per-api-structs.md` and `toolsys-tasks.md`.

## What flips

Known pins that assert the current sharing, all of which are pins rather than requirements:

| Pin                                        | Asserts                                              |
| ------------------------------------------ | ---------------------------------------------------- |
| `tests/toolregistry_second.test.ts:161`    | `apiA.getStructByName("stage5c") === apiB`'s         |
| `tests/toolregistry_second.test.ts:158-160`| the two caches' prefix objects differ but share a struct |
| `tests/perApiStructs.test.ts` test 1       | structs below the two roots are the same objects     |
| `tests/perApiStructs.test.ts` test 3       | `structs` holds what that api created                |

The last one survives unchanged in meaning and becomes trivially true.

## Hard constraints

- **The `pathux` barrel must not gain a name.** Diff the sorted `Object.keys()` of built
  `dist/pathux.js` against a pre-change baseline; a type-only addition is invisible to it, and
  an `export *` line reads identically either way.
- **nstructjs registers by class name globally**, and saved files in consumer projects depend
  on those names. Struct *names* stay process-wide facts even though struct *objects* stop
  being; `resolveStructName` does not change.
- **`setDataPathToolOp` calls `ToolOp.unregister(DataPathSetOp)` and does not put it back.**
  Do not call it from a test without restoring.
- Green means `pnpm typecheck` (**both** passes — the second is `example/`, the only thing
  that type-checks the public surface), `pnpm test`, and `pnpm format:check`.

## Open questions

1. Should `DataAPI` expose a way to ask "have you been initialized?", so a host can fail
   loudly at construction rather than at the first unmapped resolve? The crash is wanted; the
   question is whether it should arrive earlier and with a better message.
2. Does anything need a *shared* struct across APIs badly enough to keep an escape hatch? The
   deferred answer is to add explicit struct sharing later if the per-api multiplier bites.
   Nothing needs it now, and adding the hatch up front would recreate the ambiguity this
   change removes.
