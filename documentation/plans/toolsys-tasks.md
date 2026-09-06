# Tool system: coalescing and multi-API tasks

Four tasks in `scripts/path-controller/` and `scripts/core/`. Task 0 is a live regression
and blocks task 1; tasks 1-3 are independent of each other and land in any order.

Task 0 was found by the pressure test of task 1's plan, not by the design discussion that
produced the rest of this file.

Status: tasks 0 and 1 done, bar one manual check recorded in `datapath-set-fold.md`'s
stage 5. Tasks 2 and 3 sketched only.

<!-- toc -->

- [Why these](#why-these)
- [Task 0 — resynchronize `setPathValueUndo` with the async toolstack](#task-0--resynchronize-setpathvalueundo-with-the-async-toolstack)
- [Task 1 — fold `DataPathSetOp` writes instead of replaying them](#task-1--fold-datapathsetop-writes-instead-of-replaying-them)
- [Task 2 — bind tool defaults per `DataAPI` instead of per process](#task-2--bind-tool-defaults-per-dataapi-instead-of-per-process)
- [Task 3 — a `ToolRegistry` object, with the module globals as its default instance](#task-3--a-toolregistry-object-with-the-module-globals-as-its-default-instance)
<!-- regenerate with pnpm markdown-toc -->

<!-- tocstop -->

## Why these

`ToolClasses`, `ToolPaths`, `MacroClasses` and `SavedToolDefaults` are module-level
singletons, and `setPathValueUndo` reads the toolstack head to decide whether a widget edit
continues the previous one. Both are fine for one app with one `DataAPI` and one synchronous
toolstack. Neither is true any more: the library ships `NodeGraphView` as a hostable widget
and `NodeEditor` unregistered for a consumer to register, so two `DataAPI`s in one process is
a supported configuration; and `336424c` made the tool lifecycle async.

## Task 0 — resynchronize `setPathValueUndo` with the async toolstack

**Done.** It was a live regression on `master` rather than an improvement.

- Before `336424c`, `ToolStack.undo()`/`redo()`/`execTool()` were synchronous `void`
  methods. That commit made the lifecycle async and routed every public entry point through
  `protect()`, which crosses `await prev` unconditionally (`toolsys/toolstack.ts:185`), so
  the callback never runs in the calling turn.
- `setPathValueUndo` (`scripts/core/base/ui_base_datapath.ts:20-67`) was not updated. It
  awaits nothing, and it re-reads `toolstack.head` immediately after `pushTool` at `:60-61`.
- Measured consequences:
  - The first widget edit against an empty undo stack throws. `head` is still `undefined` a
    microtask later, so `:64-66` throws `new Error("toolpath error")`, which is not a
    `DataPathError` and so escapes `setPathValue`'s handler
    (`ui_base_datapath.ts:206-210`) into the caller.
  - Same-turn frames no longer coalesce. Five sets in one JS turn leave five stack entries
    instead of one, so one Ctrl+Z walks back one frame of a drag.
  - After an `undoBreakPoint`, a same-turn burst folds onto the _previous_ op — which is no
    longer at `cur` when the queued work runs — and the intermediate values are dropped.
- The route taken: `pushTool` removed in favour of a single `execTool`, `ToolStack.head` is now
  a promise acquired through `protect`, and `setPathValueUndo` is async and awaits each step.
- Three bugs came out of the first pass, all found by running the suite (49 failures across
  four files), all now fixed:
  - `_execTool`'s `if (this.locked)` guard (`toolsys/toolstack.ts:290`) fires on every call.
    `protect` sets `_lockLabel` before invoking its callback (`:191-193`), so the normal
    `execTool` path always throws. It cannot tell "I hold the lock" from "someone else does".
  - `setPathValue` (`ui_base_datapath.ts:196`) still calls the now-async `setPathValueUndo`
    without awaiting, so its `try/catch` is dead and rejections escape unhandled.
    `UIBase.setPathValueUndo` (`scripts/core/ui_base.ts:862`) drops the promise and still
    declares `void`.
  - `_execOrRedo` reads `this.at(-1)` where it read `this[this.cur]` (`toolstack.ts:243`).
    Those differ whenever `cur < length - 1`, so after an undo it compares against the newest
    redo entry and `_rerun` warns that the tool is not at the head.
- Touches `ui_base_datapath.ts` and `ui_base.ts` in path.ux, `toolstack.ts` and
  `controller_abstract.ts` in the submodule.

## Task 1 — fold `DataPathSetOp` writes instead of replaying them

Plan: [`datapath-set-fold.md`](datapath-set-fold.md), **done**.

- `setPathValueUndo` (`scripts/core/base/ui_base_datapath.ts:20`) coalesces a drag by
  rewinding and replaying: `toolstack.undo(ctx)` → mutate the head's inputs →
  `toolstack.redo(ctx)`. That is a full undo plus a full re-exec for every frame of every
  slider drag in the library.
- `DataPathSetOp.exec` is an absolute write (`ctx.api.setValue`, then `massSetProp`), not a
  read-modify-write, so replaying is not what makes the coalesced result correct.
- Replace the round trip with a fold: keep the op's `_undo` snapshot from the first push and
  write the new value through `exec` alone.
- Wins: one write per frame instead of undo+exec, one undo snapshot per run instead of one
  per frame, and an explicit coalescing key in place of a string hash the widget compared
  against the stack head. The `change`-event saving did not materialize — see the plan's
  stage 3.
- Touches both repos: `controller_ops.ts` in the submodule, `ui_base_datapath.ts` in path.ux.

## Task 2 — bind tool defaults per `DataAPI` instead of per process

Sketch only.

- `ToolPropertyCache._buildAccessors` (`toolsys/tooldefaults.ts:41`) assigns `this.api` and
  `this.dstruct` on every call, so the last `buildToolSysAPI` wins. A second `DataAPI` in the
  same process silently steals the binding from the first.
- The knock-on: `ToolOp.register` calls `updateToolDefaults(cls)` with no arguments, which
  falls back to `SavedToolDefaults.api` (`toolsys/toolsys.ts:39-45`), so a tool registered
  after both builds gets accessors in the second API only.
- Fix: one `ToolPropertyCache` per API binding rather than one per process. Either key the
  cache's `api`/`dstruct` by API, or hold a cache per registry once task 3 lands.
- Needs a decision the plan must settle: whether saved default _values_ are per-API (two
  graph panes forget each other's last-used values) or shared (one value table, many
  bindings). Shared is almost certainly right; the bug is in the binding, not the values.
- Submodule only. No path.ux changes.

## Task 3 — a `ToolRegistry` object, with the module globals as its default instance

Sketch only.

- Move `ToolClasses` (`toolsys/toolop.ts:79`), `ToolPaths` + `initToolPaths_run`
  (`toolsys/toolpath.ts:5`), `MacroClasses` + `macroidgen` (`toolsys/toolmacro.ts:9,24`) and
  the defaults cache onto a `ToolRegistry` class.
- Keep the existing exports as aliases onto a `defaultRegistry`, so every current consumer
  is untouched. Purely additive; no behaviour change in this step.
- Three seams need an owner, and they are not the same owner:
  - path → class (`parseToolPath`, `createTool`, `getToolDef`, menu templates) already has
    `ctx.api` in hand, so `ModelInterface` carries the registry reference.
  - class → defaults (`hasDefault`/`getDefault`/`saveDefaultInputs`) has no ctx available,
    so the registry is stamped on the class at `register()` time.
  - registry → `DataAPI` (`buildToolSysAPI`) becomes a method on the registry.
- Later steps, not committed to here: parent chaining so an isolated registry inherits the
  built-ins, `dispose()` for test isolation, and a serializable catalog projection.
- Hard constraint to respect: nstructjs registers by class name globally, and saved files in
  consumer projects depend on those names. Registries stay a runtime concept; struct names
  are never namespaced.
- Submodule only. No path.ux changes.
