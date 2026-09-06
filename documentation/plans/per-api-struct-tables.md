# Per-API struct tables

Move `_map_structs` and `_map_structs_by_name` off the module and onto `DataAPI`, so a
`DataStruct` belongs to the api that built it rather than to the process.

This is "position 3" from [`per-api-structs.md`](per-api-structs.md), which rejected it on
cost. That rejection was reviewed and did not survive: three of its four stated costs were
wrong, and two argued the other way. See that plan's
[Follow-ups](per-api-structs.md#follow-ups) for the correction, which this plan continues.

Status: **stage 1 done**, stages 2-4 not started. Pressure-tested once, by a fresh-context agent, and revised
substantially. One blocking finding removed a stage; a second was downgraded to a one-line
fix on review. See [What the pressure test changed](#what-the-pressure-test-changed).

<!-- toc -->

- [Why now](#why-now)
- [What actually changes](#what-actually-changes)
- [Census](#census)
  - [Already written for this](#already-written-for-this)
  - [Changes behaviour](#changes-behaviour)
  - [Verified, having been unverified](#verified-having-been-unverified)
- [Stages](#stages)
  - [Stage 1 — make the failure legible](#stage-1--make-the-failure-legible)
  - [Stage 2 — move the tables](#stage-2--move-the-tables)
  - [Stage 3 — delete the opt-out](#stage-3--delete-the-opt-out)
  - [Stage 4 — document, regenerate, measure](#stage-4--document-regenerate-measure)
- [What flips](#what-flips)
- [Hard constraints](#hard-constraints)
- [Open questions](#open-questions)
- [What the pressure test changed](#what-the-pressure-test-changed)

<!-- regenerate with pnpm markdown-toc -->

<!-- tocstop -->

## Why now

- The prerequisite landed. `_map_structs` is already a `WeakMap` keyed on the class, so this
  moves a field rather than rewriting a lookup.
- The sharing is not neutral, it is a **degradation**. `defineGraphAPI` guards with
  `if ("nodes" in st.pathmap) return st` (`graph_api.ts:18-21`) and `nodeStructFor` guards
  with `hasStruct` (`:51-52`) — both keyed on the struct, both already written per-api. Under
  the global table a second api hits those guards, skips its own `defineAPI`, and resolves
  through the first api's struct. `defineGraphAPI`'s `validStructs` third parameter is
  silently discarded for that api along the way.
- One workaround for the sharing goes away with it: the `useGlobalRegistry` opt-out and the
  `_localStructs` WeakMap behind it become the same mechanism as the ordinary path.

`ToolRegistry.structName` is **not** in that list, and the first draft of this plan was wrong
to put it there. See [F2](#what-the-pressure-test-changed).

## What actually changes

- `_map_structs` (`WeakMap<object, DataStruct>`) and `_map_structs_by_name`
  (`Record<string, DataStruct>`) become instance fields on `DataAPI`.
- They must move **together**. Moving only the name table changes nothing, because the
  object-keyed lookup still hands out the shared struct.
- `mapStruct`, `getStruct`, `hasStruct`, `getStructByName`, `inheritStruct`,
  `mapStructCustom` and `_addClass` all become genuinely per-api. Their signatures do not
  change; only what they answer does.
- `CLS_API_KEY_CUSTOM` stays a module-level stamp. It is read with `in`
  (`controller.ts:1247`), so it inherits down the prototype chain and a per-api table would
  not.

## Census

Built from greps over path.ux and the superproject, excluding build output, and re-verified
by the pressure test.

### Already written for this

- **`apps/desktop/renderer/pathux/app/api.ts`** — the largest consumer, and the shape this
  change is for. `defineShellApi()` and `defineGraphApi()` are self-contained factories: each
  makes its own root, maps what it needs, and calls `buildToolSysAPI(api, false, root)`. The
  whole of `apps/` calls `mapStruct` **once** (`:16`), and never calls `getStruct`,
  `hasStruct`, `getStructByName` or `defineAPI`.
- **`scripts/graph/graph_api.ts:13-21, 49-57`** — `defineGraphAPI` and `nodeStructFor`, per-api
  already and currently degraded, as above.
- **`scripts/graph/group.ts:375-376`** — `api.getStruct(Graph)` on the api it was handed.
  `GroupNode.defineAPI` is reachable only from `nodeStructFor`, which is reachable only from a
  list `defineGraphAPI` built, so `Graph` is always mapped on that api.
- **`scripts/simple/app.ts:155`** (`makeAPI`) — maps `DataModelClasses`, `areaclasses` and the
  ctx class into the api it just built (`:158-180`).
- **`controller_base.ts:662`** — `DataList`'s default `getStruct` resolves an element's
  constructor against the api passed at resolve time.
- **`toolsys/toolregistry.ts:209-211`** — `updateDefaults` already iterates `this.apis()`.

### Changes behaviour

- **A half-initialized api stops resolving.** `mapStruct(cls, false)` — which is what
  `getStruct` is — throws for a class this api never mapped, where today it borrows whichever
  api mapped first. `resolvePath` swallowing that and returning `undefined`
  (`controller.ts:1057-1073`) is correct and by design; an unresolvable path is not an
  exception. What is wrong is that `mapStruct` throws a plain `Error`, and only a
  `DataPathError` sets `lastResolveError` — so the one useful message goes to the console as a
  stack rather than onto the field built to carry it. Stage 1 fixes that; the control flow
  needs no change.
- **`getStructByName` becomes api-relative.** Two APIs registering a class run the same code
  and derive the same stable name, so the lookup still resolves — to that api's struct. An api
  that never mapped the class answers `undefined` instead of finding a global entry.
- **`api.structs` changes meaning.** Today `mapStruct` returns early without calling
  `_addClass`, which is *why* the field holds only what that api created
  (documented at `controller.ts:662`). Per-api, `_addClass` runs for every class on every api,
  so `structs` becomes roughly the full set and the documented distinction collapses. Decide
  what the field means in stage 2, in the commit that causes it.
- **The duplicate-name warning** (`controller.ts:852-860`) stops firing for the
  two-APIs-one-class case. Decide whether it is a typo-catcher (now weaker) or a collision
  catcher (now correct), and reword it either way.

### Verified, having been unverified

The first draft carried three claims marked unverified. All three are now settled by reading:

- **`DataStruct.add` dedupes.** `controller.ts:564-584` removes any member with the same
  `apiname` before pushing, so a second api's `buildOpAPI` never creates duplicate members.
  There is **no** live duplicate-member bug for this change to fix incidentally. (The override
  warning at `:566-570` is gated on `window.DEBUG?.datapaths`, which is why it is invisible.)
- **No `DataStruct` is handed between APIs by hand.** Every `st` argument comes from the api
  that will own it. The cross-api-capable seams exist — `defineGraphAPI(api, st, validStructs)`,
  `_addClass`, `Node.defineAPI` — and nothing uses them that way. A documentation item, not a
  migration item.
- **The multiplier is retention, not allocation.** The CPU is already paid today:
  `buildAPI(apiB)` already runs `buildOpAPI` and `_buildBinding` for every class and input,
  including `prop.copy()` at `tooldefaults.ts:141`; it just replaces entries in the shared
  struct. After the change the same work is *retained*. About 29 registered op classes in a
  desktop-shaped process, so per api roughly 29 op structs, 10-15 accessor-prefix structs, and
  two `DataPath`s plus one full `ToolProperty` copy per input. The property copies dominate.
  Order 10² KB per open pane — still worth measuring, but state it as retention.

## Stages

One green commit pair per stage: submodule first, then the parent's gitlink.

### Stage 1 — make the failure legible

**Done.** `pnpm typecheck` clean on both passes, `pnpm test` green at 47 files / 473 tests,
barrel unchanged at 588 keys.

- `mapStruct` now throws `DataPathError` (`controller.ts:889`). One line; `resolvePath`'s
  control flow is untouched.
- `tests/perApiStructs.test.ts` gains the `lastResolveError` test, routed through
  `dynamicStruct` so it reaches `mapStruct(cls, false)` at `controller.ts:1253` rather than
  dying earlier on a missing member. Reverting to a plain `Error` fails it.
- ...and the graph pin: two APIs calling `defineGraphAPI` get **one** struct, the second
  early-returning before declaring anything, with only the first api's `structs` listing it.
- Nothing else in the suite needed editing.

Was "pin the bootstrap crash". The pins mostly already exist, and the crash is correctly not a
crash.

- **`mapStruct`'s "class does not have a struct definition" becomes a `DataPathError`**
  (`controller.ts:889`). `resolvePath` goes on returning `undefined`, which is the contract —
  it only changes which branch of the catch runs, so the message lands on `lastResolveError`
  and the console stops getting a stack that reads like an unhandled throw. No initialization
  check, and no control-flow change: an unresolvable path is not an exception.
- `perApiStructs.test.ts:115-118` matches on the message, so it holds; add the assertion that
  `lastResolveError` names the class after a failed resolve.
- **Add the one genuinely new pin**: a second api calling `defineGraphAPI` early-returns with
  the first api's struct today. Nothing covers that.
- Do **not** re-pin what is already pinned: `perApiStructs.test.ts:84-85,105` (a second api
  resolves through the first's struct), `:115-118` (unmapped throws),
  `toolregistry_second.test.ts:161` (cross-api by-name sharing). Listing them here is what
  makes stage 2's "nothing else should need editing" checkable.
- Cost to undo: free, and the diagnostic stands on its own terms.

### Stage 2 — move the tables

- `_map_structs` and `_map_structs_by_name` become `DataAPI` instance fields.
- Settle what `api.structs` means and update its doc comment in the same commit.
- Reword or remove the duplicate-name warning.
- Rewrite the pins listed under [What flips](#what-flips), and only those. Anything else that
  needs editing is a finding to report, not a test to fix quietly.
- Cost to undo: **one release, and this is the one-way door** — not stage 3. The diff reverts
  cleanly in isolation, but once it ships, hosts rely on "my api mapped my own classes", and a
  consumer that deletes a now-redundant `mapStruct` breaks on revert.

### Stage 3 — delete the opt-out

- `_localStructs` and the `useGlobalRegistry` parameter go away. Once every mapping is per-api,
  "do not add this to the global registry" has nothing to opt out of.
- `theme_editor.ts:1054-1056` keeps its `_addClass` calls, minus the fourth argument. **Not**
  `mapStruct`, which creates an empty struct — the editor needs its prebuilt `st` from
  `:1047-1051` attached to the class.
- Give the root at `:1055` an explicit name in the same commit: it maps a fresh `{}`, and
  `resolveStructName({})` yields `undefined`, so it would land in the name table under the
  string `"undefined"`.
- Delete or rewrite `perApiStructs.test.ts:122-153`, the only coverage of `_addClass`'s fourth
  parameter.
- Cost to undo: cheap in code, expensive in signature — `_addClass` is a public method on a
  barrel-exported class, called from another module.

**`ToolRegistry.structName` does not revert here, or anywhere in this plan.** See F2.

### Stage 4 — document, regenerate, measure

- Rewrite `documentation/controller.md` § Who Owns a DataStruct **and** `:244-255`, whose
  "false three ways" paragraph loses one of its three when the opt-out goes, **and**
  `:240-242`, which documents the cache-instance keying. Then the `CLAUDE.md` short form. The
  new rule: **a `DataAPI` owns every struct it maps.**
- Say which api `getStructByName` answers for. `:187-213` documents the lookup as surviving
  bundle boundaries and says nothing about that, and after stage 3 the theme editor's micro
  APIs answer by name for `CSSFont` and friends.
- Re-run `pnpm run gen:paths`; the change alters which structs the shell api reaches, so the
  catalog moves. (`generated/` is gitignored in path.ux and committed only in the superproject
  — `per-api-structs.md`'s constraint was wrong about that for this repo.)
- Record the heap measurement.
- Close position 3 in `per-api-structs.md` and `toolsys-tasks.md`.
- Cost to undo: cheap in code, expensive in belief.

## What flips

Pins that assert the current sharing. All are pins rather than requirements, and stage 2
rewrites exactly this list.

| Pin                                          | Asserts                                                  |
| -------------------------------------------- | -------------------------------------------------------- |
| `tests/perApiStructs.test.ts:83`             | both roots' `toolDefaults` resolve to one struct          |
| `tests/perApiStructs.test.ts:84-85`          | `Model` and `EarlyTool` are one struct across the two     |
| `tests/perApiStructs.test.ts:105`            | `apiB.getStruct(Model)` is apiA's struct                  |
| `tests/perApiStructs.test.ts:151`            | an opted-out class maps globally to one struct afterwards |
| `tests/perApiStructs.test.ts:122-153`        | the `useGlobalRegistry` opt-out; deleted in stage 3       |
| `tests/toolregistry_second.test.ts:161`      | `apiA.getStructByName("stage5c")` is `apiB`'s             |

`toolregistry_second.test.ts:158-160` does **not** flip — the two caches' prefix objects stay
different objects; only the by-name struct identity at `:161` changes.

## Hard constraints

- **The `pathux` barrel must not gain a name.** Diff the sorted `Object.keys()` of built
  `dist/pathux.js` against a pre-change baseline; a type-only addition is invisible to it, and
  an `export *` line reads identically either way.
- **Barrel-stable is not signature-stable.** Removing `_addClass`'s fourth parameter changes a
  public method on a barrel-exported class, called from another module
  (`theme_editor.ts:1055-1056`). The key count will not move. Check signatures by hand.
- **nstructjs registers by class name globally**, and saved files in consumer projects depend
  on those names. Struct *names* stay process-wide facts even though struct *objects* stop
  being; `resolveStructName` does not change.
- **Re-run `pnpm run gen:paths` after any stage that moves struct ownership.**
  `gen-datapaths.mjs:318-324` builds one api from a factory and walks its
  `rootContextStruct`, so per-api ownership is already its assumption, but the reachable set
  moves.
- **`setDataPathToolOp` calls `ToolOp.unregister(DataPathSetOp)` and does not put it back.**
  Do not call it from a test without restoring.
- Green means `pnpm typecheck` (**both** passes — the second is `example/`, the only thing
  that type-checks the public surface), `pnpm test`, and `pnpm format:check`.

## Open questions

1. **Does the `mapStructCustom` api-argument change belong in this plan at all?**
   `mapStructCustom` has zero call sites in `scripts/`, `example/`, `tests/`, `buildtools/`
   or `apps/`; so does `inheritStruct`. Passing the api to a callback nobody registers cannot
   be tested. Either drop it, or write the first `mapStructCustom` test alongside it.
2. **Is one registry per `DataAPI` an invariant worth enforcing?** F2 turns on it not being
   one. Enforcing it would make the `structName` revert safe and simplify the defaults
   binding; it would also break `toolregistry_api.test.ts:119-121`, which exercises repointing
   deliberately. Out of scope here, worth its own decision.
3. **Should a shared struct across APIs stay expressible?** Deferred answer: add explicit
   struct sharing later if the per-api multiplier bites. Adding the hatch up front would
   recreate the ambiguity this change removes.

## What the pressure test changed

Eleven findings, two blocking. The two that changed the plan's shape:

- **F1 — the central "correct crash" is not a crash, but that half is by design.** The finding
  was right that `resolvePath`'s catch-all (`controller.ts:1057-1073`) swallows `mapStruct`'s
  throw and that "a correct crash replacing a silent wrong answer" was wrong. It was wrong to
  treat the swallowing as the defect: returning `undefined` for an unresolvable path is the
  contract, and `lastResolveError` exists to carry the message past it. The real defect is
  one line — `mapStruct` throws a plain `Error`, and only a `DataPathError` sets that field.
  Downgraded from blocking to the first bullet of stage 1; the proposed initialization check
  was dropped.
- **F2 — reverting `ToolRegistry.structName` would reintroduce the bug tool-registry stage 5
  fixed.** The revert is only safe if one registry ever builds against one api, and the tree
  neither enforces nor believes that: `api.registry` is a plain mutable public field
  (`controller_abstract.ts:73,77`), `buildAPI` is public, and
  `tests/toolregistry_api.test.ts:119-121` repoints `api.registry` after `buildToolSysAPI` on
  purpose. Two registries on one api collide *within* the api, which per-api tables do nothing
  about, and `buildAPI`'s `dstruct.clear()` then wipes one registry's accessors. The bullet was
  removed and stage 3 shrank to the opt-out.

The other nine — the `structs` meaning change, the incomplete flip list, the three now-verified
claims, the theme-editor mis-specification, the signature constraint, the extra doc sites, and
the `gen:paths` constraint — are folded into the sections above.
