# Folding repeated tool invocations

Moves the coalescing that `setPathValueUndo` performs out of the widget layer and onto the
toolstack as one protected operation, and stops `DataPathSetOp` swallowing its own errors.
Task 1 of [`toolsys-tasks.md`](toolsys-tasks.md).

Status: part B (stages 4a, 4b and 4c) landed; part A (`foldOrExec`, stages 1-3) not started.
Task 0 is complete.

Revised twice: once after a fresh-context pressure test, once after task 0's first pass made
`ToolStack.head` a promise. See [Findings](#findings) for the disposition of each.

<!-- toc -->

- [Two coupled changes](#two-coupled-changes)
- [A — `foldOrExec`](#a--foldorexec)
  - [The problem with folding through `head`](#the-problem-with-folding-through-head)
  - [The operation](#the-operation)
  - [`DataPathSetOp`'s half](#datapathsetops-half)
  - [`extendUndo`, and why it exists](#extendundo-and-why-it-exists)
  - [The seal moves into the key](#the-seal-moves-into-the-key)
  - [What the widget is left with](#what-the-widget-is-left-with)
- [B — let `DataPathSetOp` throw](#b--let-datapathsetop-throw)
  - [What it does now](#what-it-does-now)
  - [The change](#the-change)
  - [What the toolstack must do first](#what-the-toolstack-must-do-first)
- [Scope, limits and behaviour changes](#scope-limits-and-behaviour-changes)
- [What deliberately does not change](#what-deliberately-does-not-change)
- [Risk](#risk)
- [Stages](#stages)
  - [Stage 1 — a harness that fails honestly](#stage-1--a-harness-that-fails-honestly)
  - [Stage 2 — assertions that pin the danger](#stage-2--assertions-that-pin-the-danger)
  - [Stage 3 — `foldOrExec`](#stage-3--foldorexec)
  - [Stage 4 — abort and roll back — **done**](#stage-4--abort-and-roll-back--done)
  - [Stage 5 — measure and document](#stage-5--measure-and-document)
- [Repos](#repos)
- [Findings](#findings)
  - [From the fresh-context pressure test](#from-the-fresh-context-pressure-test)
  - [From task 0's first pass](#from-task-0s-first-pass)
  <!-- regenerate with pnpm markdown-toc -->

<!-- tocstop -->

## Two coupled changes

**A. Coalescing becomes a toolstack operation.** Today the widget reads the head, decides
whether this edit continues the last one, and drives `undo`/`redo` itself. Since task 0 made
every entry point async and `head` a promise, that is three separate lock acquisitions with
nothing held between them, so the head that was tested is not provably the head that gets
undone. Folding belongs inside one `protect()` region.

**B. `DataPathSetOp` stops swallowing errors.** It catches, logs, sets `hadError` and carries
on — including running the mass set after the single write already failed. `hadError` now has
no reader at all, so a failed write is silent. Letting the op throw is only safe once the
toolstack rolls back a partly-run op, which is the same region A creates.

A and B are separable and land in that order. A is the design change; B is a bug fix that A
makes safe.

## A — `foldOrExec`

### The problem with folding through `head`

`setPathValueUndo` currently does, per drag frame:

```ts
let head = await toolstack.head; // acquires and releases the lock
/* … hash comparison … */
if (!bad) {
  await toolstack.undo(ctx); // acquires and releases
  tool.setValue(ctx, val, rdef.obj);
  await toolstack.redo(ctx); // acquires and releases
}
```

Three acquisitions, three gaps. It also needs `head` to be a live, mutable op with
`hashThis()` on it, which is exactly the coupling that stops a toolstack living anywhere but
the renderer.

### The operation

One new public method, and no knowledge of `DataPathSetOp` anywhere in the toolstack:

```ts
/** An op that can absorb a later invocation of itself into one undo entry. */
export interface FoldableToolOp {
  /** Coalescing identity. Two ops fold when their keys match. */
  foldKey(): string;
  /** Absorbs `next`'s inputs, keeping the undo snapshot taken when this op was pushed. */
  foldFrom(next: this, ctx: unknown): void | Promise<void>;
}
```

```ts
/**
 * Runs `toolop`, or folds it into the head when both are foldable and their keys
 * match. Returns true when a new entry was pushed.
 *
 * The test and the write share one protected region, so no other operation can
 * change the head between them.
 */
async foldOrExec(ctx: ContextCls, toolop: ToolOpAny): Promise<boolean> {
  return this.protect("foldOrExec", async () => {
    const head = this[this.cur];
    const key = isFoldable(toolop) ? toolop.foldKey() : undefined;

    if (key !== undefined && isFoldable(head) && head.foldKey() === key) {
      await asyncCheck(head.foldFrom(toolop as typeof head, ctx));
      return false;
    }

    await this._execTool(ctx, toolop);
    return true;
  });
}
```

The caller builds an op every frame rather than only on a miss. That is cheap —
`DataPathSetOp.create` is a few property copies — and it is what lets the toolstack stay
generic: the op carries its own identity and its own fold rule, and the stack only asks.

### `DataPathSetOp`'s half

```ts
foldKey(): string {
  return this.hashThis();
}

foldFrom(next: this, ctx: CTX): void {
  const opCtx = this.__ctx ?? (ctx as CTX);
  this.extendUndo(opCtx);
  this.inputs.prop.setValue(next.inputs.prop.getValue());
  this.inputs.flagBit.setValue(next.inputs.flagBit.getValue());
  this.inputs.useFlagBit.setValue(next.inputs.useFlagBit.getValue());
  this.exec(opCtx);
}
```

`exec` writes the model; nothing runs `undoPre`, so `_undo` keeps the snapshot taken when the
op was pushed (`toolstack.ts:323` runs `undoPre` before the modal branch).

### `extendUndo`, and why it exists

A naive fold gets mass set wrong. `undoPre` re-resolves `resolveMassSetPaths` on every call
(`controller_ops.ts:213`), so the affected set can change mid-drag as the selection filter
re-evaluates. Today that is safe: `undo()` restores the old set, `redo`'s `undoPre` snapshots
the new one, `exec` writes it. A fold that kept only the original snapshot would write paths
that entered the selection mid-drag **with no snapshot, so Ctrl+Z would leave them dirty.**

```ts
/** Adds pre-values for paths that entered a mass set mid-drag. Never overwrites an entry. */
extendUndo(ctx: CTX): void | Promise<void> {
  /* re-resolve the mass-set paths; snapshot each one absent from this._undo */
}
```

**It is typed `void | Promise<void>` but implemented synchronously.** Everything it does —
`resolveMassSetPaths`, `getValue`, `.copy()` — is synchronous, so marking it `async` would
cost a microtask per drag frame for nothing. The signature matches `ToolOp.undoPre`
(`toolop.ts:740`), which it mirrors, and is called through `asyncCheck` the way `_execTool`
already calls `undoPre` — so an app that substitutes its own op class through
`setDataPathToolOp` (`controller.ts:1743`) can override it with an async one.

If merging proves awkward, the fallback is to fold only when `massSetPath` is empty. Smaller
win, no correctness question.

### The seal moves into the key

`undoBreakPoint()` (`ui_base.ts:858`) bumps `pathUndoGen`, and today the widget compares it
against `_lastPathUndoGen` to end a run. Fold the generation into the op's id instead — pass
`` `${elem._id}:${elem.pathUndoGen}` `` as `create`'s `id` argument — and a bumped generation
changes `hashThis()`, so folding stops on its own. `_lastPathUndoGen` and its two assignments
are then dead and go away.

### What the widget is left with

```ts
const toolop = getDataPathToolOp().create(
  ctx,
  path,
  val,
  `${elem._id}:${elem.pathUndoGen}`,
  mass_set_path ?? undefined
);
if (!toolop) return; // create returns undefined for no-op paths
await ctx.toolstack.foldOrExec(elem.ctx, toolop);
```

No `await toolstack.head`, no `instanceof`, no `hashThis`, no `undo`/`redo`. The widget stops
needing to see the head at all, which is what unblocks a toolstack that does not live in the
renderer.

## B — let `DataPathSetOp` throw

### What it does now

Two swallow sites, and the second is worse than silent:

- `setValue` (`controller_ops.ts:69-77`) catches, logs `"Error setting datapath"`, sets
  `hadError = true`, returns normally.
- `exec` (`controller_ops.ts:282-320`) catches around the single write, sets `hadError`, **and
  then runs `ctx.api.massSetProp` anyway** (`:312`). A mass set that follows a failed primary
  write is not a partial success — the value it fans out is the one that just failed to apply.
  This is the likeliest source of the odd cross-app bugs, because the fan-out lands on every
  selected object while the widget's own path silently did not change.
- `hadError` has no reader anywhere in the tree. Task 0 removed the last one when it dropped
  the `throw new Error("toolpath error")` from `setPathValueUndo`. It is currently a
  write-only field.

### The change

- Delete both `try/catch` blocks and let the error propagate. Delete `hadError` and its five
  assignments.
- `exec` runs the mass set only if the single write succeeded — which, with the catch gone, is
  just straight-line code.
- `setPathValue` (`ui_base_datapath.ts:195-205`) becomes meaningful again: its `DataPathError`
  swallow starts swallowing something. It has to `await` for that, which is task 0's business,
  not this plan's.

### What the toolstack must do first

`_execTool` leaves a partly-run op on the stack if anything throws: `cur` was already
incremented and `this[cur]` assigned (`toolstack.ts:298-308`) before `undoPre` and `exec` run.
`protect`'s `finally` releases the lock, so the stack does not wedge, but the failed op stays
at `cur` with a captured `_undo` and a half-applied effect.

**The stack aborts and rolls back; it never reverses the op for you.** A throw from any of
`undoPre`, `execPre`, `exec` or `execPost` means the toolstack:

1. Calls `toolop.onExecError(ctx, error, phase)`.
2. Pops the op and restores `cur`, then restores `_undo_branch` — the redo branch the push
   replaced (`toolstack.ts:301`), so the stack is exactly as it was before the call.
3. Rethrows the original error.

Step 2 deliberately does **not** call `toolop.undo()`. Whether a half-applied effect is safe
to reverse depends on the op and on which phase failed, and the stack cannot know either. An
op whose `undoPre` threw may hold a partial snapshot that `undo` would apply as though it were
complete. So reversing is the op's decision, taken in the hook:

```ts
/** Which lifecycle step threw. `_undo` is only fully populated from `execPre` onward. */
export type ToolExecPhase = "undoPre" | "execPre" | "exec" | "execPost" | "modalStart";

/**
 * Called when a lifecycle step threw, before the stack drops this op and restores the
 * branch it replaced. Reverse a partial effect here if reversing is safe; the stack
 * never calls `undo` on its own. Throwing from here is reported and discarded — the
 * original error is what reaches the caller.
 */
onExecError(ctx: CTX, error: unknown, phase: ToolExecPhase): void | Promise<void> {}
```

Notes the implementation has to honour:

- **The hook is guarded.** Wrap the call so a throw inside it is logged and dropped; losing
  the original error to a failure in the error path is the worst outcome available.
- **`void | Promise<void>` and `asyncCheck`**, matching `undoPre` and `extendUndo`.
- **`phase` is the whole point.** A client that wants the common behaviour writes
  `if (phase !== "undoPre") this.undo(ctx);` and gets it, without the stack guessing.
- **A `NO_UNDO` op was never pushed** (`toolstack.ts:298`), so there is nothing to pop and no
  branch to restore. The hook still runs.
- **`execPost` is the awkward one.** By then `exec` has landed, so aborting discards the undo
  entry for work that really happened. That is the stated cost of a uniform rule, and it is
  exactly the case `onExecError` exists to let a client handle differently.

Two leaks in the modal branch need the same treatment, and both are reachable today the moment
`exec` throws:

- `DataPathSetOp.modalStart` (`controller_ops.ts:323-339`) calls `super.modalStart` — which
  pushes the modal stack (`toolop.ts:833`) — then `exec`, then `modalEnd`. If `exec` throws,
  `modalEnd` never runs and **the modal stack stays pushed, freezing input.** Wrap the `exec`
  in `try/finally` so `modalEnd` always runs.
- `_execTool`'s modal branch does `const modal = toolop.modalStart(...)` then
  `modal.then(clear, clear)` (`toolstack.ts:350-352`). A synchronous throw out of `modalStart`
  skips the assignment, so `modal_running` stays `true` forever. Set the flag from a `finally`
  rather than from the promise.

## Scope, limits and behaviour changes

- **Enum and flag props never fold today, and this fixes that as a side effect.** `create`
  chops the subkey off `datapath` (`controller_ops.ts:112-123`) and swaps in an `IntProperty`,
  while `hashThis` (`:190-197`) hashes the chopped path and the call site
  (`ui_base_datapath.ts:42`) hashes the unchopped one, so they can never match. Under
  `foldOrExec` both sides are `foldKey()` on real ops, so the comparison is symmetric by
  construction. Worth an explicit test — it changes behaviour for flag drags.
- **"Absolute write" holds for `exec`, not necessarily for the app's setter.** A path flagged
  `PropFlags.USE_CUSTOM_GETSET` (`controller_abstract.ts:248-281`) runs the app's own setter,
  which nothing constrains to be idempotent. Today the `undo()` restores the pre-state before
  each re-`exec`; the fold removes that. Consumer apps are the exposure, so this needs a line
  in `container.md`.
- **`saveDefaultInputs` stops running per frame.** `ToolStack._redo:459` calls it today and
  `PropFlags.SAVE_LAST_VALUE` is on by default (`toolsys/props/base.ts:280`), so all six
  `app.prop_set` inputs write into `SavedToolDefaults` every frame. Dropping that is a win, but
  it is a behaviour change.
- **`_was_redo` stops being set on a folded op**, flipping `_toolCancel`'s early return
  (`toolstack.ts:366-370`) from ignoring a cancel to rolling back. No in-library caller reaches
  it, but `toolCancel` is public API.
- **`foldOrExec` runs inside the lock**, so unlike the draft this plan replaced, the per-frame
  write does _not_ escape the invariant `336424c` established.

## What deliberately does not change

- **The hash itself.** `hash(massSetPath, dataPath, propType, id)` (`controller_ops.ts:176`)
  stays as it is; only who calls it moves.
- **`IToolStack`** gains `foldOrExec` and nothing else. `head` keeps whatever shape task 0
  settles on, but the hot path stops reading it.

## Risk

Both failure modes are silent: an undo entry landing on a mid-drag value, or mass-set paths
Ctrl+Z leaves dirty. Nothing in the suite catches either today. Reverting A is contained —
`foldOrExec` is additive, and the widget's old branch can come back — but B is a genuine
behaviour change for consumer apps, which will start seeing exceptions where they previously
saw a console line. That is the point, but it belongs in a release note rather than arriving
unannounced.

## Stages

Each stage is green under `pnpm typecheck`, `pnpm test` and `pnpm format:check` on its own.

### Stage 1 — a harness that fails honestly

New `tests/datapathSetFold.test.ts`, against post-task-0 code. Three obstacles first, each of
which currently produces an unhandled rejection that leaves a test green:

1. `DataPathSetOp.is_modal` is true (`controller_ops.ts:352`), so `modalStart` reaches
   `pushModal` → `ContextAreaClass!.lock()` (`toolop.ts:833`, `simple_events.ts:809`), null
   unless `screen/area_wrangler.ts:239` ran. Call the exported seam:
   `_setModalAreaClass({ lock() {}, unlock() {} })`.
2. `saveDefaultInputs` reaches `api.mapStruct` on an undefined api (`tooldefaults.ts:76`). Call
   `buildToolSysAPI(api)` in setup rather than stubbing, so the real path runs.
3. Register an `unhandledRejection` guard that fails the test.

The fake `elem` needs `_id`, `pathUndoGen`, `getAttribute("mass_set_path")`, `pathSocketUpdate`
**and `ctx`** — `setPathValueUndo` reads `elem.ctx` at `:36` and passes it to the stack while
using the `ctx` argument everywhere else. Build the `DataAPI` in the style of
`tests/massSetPaths.test.ts`.

### Stage 2 — assertions that pin the danger

Required to pass unchanged through stages 3 and 4 except where noted:

1. `head._undo` after N folds still holds the **pre-drag** value. Read the field directly; an
   undo round-trip passes under both implementations and proves nothing.
2. N values with no `undoBreakPoint` leave one stack entry holding the last value.
3. `undoBreakPoint()` mid-run splits it in two, and two undos walk back through the
   intermediate value.
4. Mass set: a path that **enters** the selection mid-drag is restored by Ctrl+Z. This is the
   assertion that fails without `extendUndo`.
5. A flag drag folds. Expected to fail before stage 3 and pass after — the enum/flag fix.
6. `fullSaveUndo`: count calls to the default undo handler across a drag. Expected to drop from
   N to 1; recorded here, tightened in stage 3.
7. `change` events per folded frame: 3 before, 2 after. Assert the numbers with the derivation,
   not an observed constant.
8. An op that throws from each of `undoPre`, `execPre`, `exec` and `execPost` in turn leaves
   `length`, `cur` and the redo branch exactly as they were before the call, and the original
   error reaches the caller. Fails before stage 4.
9. `onExecError` receives the right `phase` for each of those four, and the stack does **not**
   call the op's `undo`. An op that calls `this.undo(ctx)` from the hook does get its effect
   reversed; one that does not, does not.
10. An `onExecError` that itself throws does not replace the original error reaching the
    caller.

### Stage 3 — `foldOrExec`

- `FoldableToolOp`, `foldOrExec` and the `IToolStack` member (submodule).
- `foldKey`, `foldFrom`, `extendUndo` on `DataPathSetOp` (submodule).
- `setPathValueUndo` reduced to build-and-call; `_lastPathUndoGen` deleted (path.ux).
- Assertions 5, 6 and 7 move to their new values.

### Stage 4 — abort and roll back — **done**

Landed ahead of stages 1-3, since it needs none of the fold harness. Two commits, because the
first is a general toolstack contract and the second is one op taking advantage of it.

Covered by `tests/toolstack_abort.test.ts` (16 assertions) rather than by the fold harness
stage 1 describes. One thing turned up that the plan did not predict: `_undo_branch` was
sliced _after_ `cur++`, so the branch save dropped the very entry the push was about to
overwrite. Any `toolCancel` on a push over a live redo branch lost its first redo entry. The
slice now happens before `cur` moves. Pre-existing, unrelated to the abort work, found by the
redo-branch assertion.

**4a, the contract.** `ToolExecPhase` and the no-op `ToolOp.onExecError`; the
abort-and-roll-back wrapper in `_execTool` plus `_abortTool`; `modal_running` cleared on a
synchronous throw out of `modalStart`; `try/finally` around `exec` in
`DataPathSetOp.modalStart` so `modalEnd` always runs.

**4b, `DataPathSetOp` stops swallowing.** Both `try/catch` blocks and `hadError` deleted; the
mass set no longer runs after a failed single write.

**4c, the rest of the lifecycle.** `_execTool` was the only entry that handled a throw. The
same treatment now covers `_undo`, `_redo`, `_rerun` and `_replay`, each restoring what it
alone can restore: `_undo` leaves `cur` on the tool, which is still applied; `_redo` steps it
back; `_rerun` drops the tool it had already undone; `_replay` stops at the last entry that
applied. Two bugs surfaced along the way. `ToolOp.redo` started its four phases without
awaiting them, so an async tool ran them concurrently and a failure became an unhandled
rejection. And `_replay` built a promise whose `reject` was captured but never called, so any
throw during playback left it unsettled — and, because replay runs inside `protect()`, left
the toolstack locked for the life of the page. `runToolPhases` in `toolop.ts` is now the one
ordered runner both `ToolOp.redo` and the stack call, and `_replay` is a plain loop.

`DataPathSetOp` does **not** override `onExecError`, so a failed widget edit is not reversed
for the author. Left that way deliberately: `exec` is a single `api.setValue` followed by an
optional `massSetProp`, so a throw from the first leaves nothing applied, and a throw from the
second leaves a partial fan-out whose correct repair is the app's business. Revisit if a real
case turns up.

### Stage 5 — measure and document

- Confirm the drop on a real drag in the example app (`pnpm nwjs`, then `pnpm cdp`), rather
  than trusting the unit test.
- Amend `documentation/container.md:284-285`, which already states the coalescing contract, to
  say the undo snapshot is taken once per run, that a `USE_CUSTOM_GETSET` setter is no longer
  re-run from a restored state, and that a failed datapath write now throws.
- Tick the entries in `todos.md`.

## Repos

The change spans the submodule boundary: `controller_ops.ts` and `toolstack.ts` are in
`scripts/path-controller/`, `ui_base_datapath.ts` is in path.ux. Per CLAUDE.md, commit the
submodule first and bump the gitlink in the same logical change. Stages 1, 2 and 5 are path.ux
only; stages 3 and 4 each need the paired commit.

## Findings

### From the fresh-context pressure test

| Finding                                                                                                                              | Disposition                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `336424c` made the lifecycle async; `setPathValueUndo` awaits nothing, so the first edit throws and same-turn frames do not coalesce | **Accepted and promoted out.** Verified independently; now task 0.                                    |
| The mass-set claim was backwards — folding regresses paths that enter the selection mid-drag                                         | **Accepted.** The draft claimed a correctness win; it is the opposite. `extendUndo` exists for this.  |
| Stage 1 was not writable: two crashes arrive as unhandled rejections and leave the test green                                        | **Accepted.** Stage 1 is now the harness alone, with all three obstacles named.                       |
| `exec` is absolute only if `api.setValue` is; `USE_CUSTOM_GETSET` escapes                                                            | **Accepted** as a documented limitation.                                                              |
| `saveDefaultInputs`, `_was_redo` and the `protect()` lock all change behaviour                                                       | **Accepted**; each has a bullet under Scope. The lock one is now moot — `foldOrExec` runs inside it.  |
| `fullSaveUndo` is the biggest win and went unmentioned                                                                               | **Accepted.**                                                                                         |
| Enum and flag props can never fold                                                                                                   | **Accepted, and upgraded to a fix.** `foldOrExec` compares two real ops, so the asymmetry disappears. |
| `change` events are 3 → 2, not 2 → 1                                                                                                 | **Accepted**, with the derivation.                                                                    |
| `container.md:284-285` already documents the contract the draft said was unwritten                                                   | **Accepted**; stage 5 amends it.                                                                      |
| The original seven assertions were not a regression net                                                                              | **Accepted**; rewritten around `_undo`, mass set, flags and the throw.                                |
| `IToolStack.undo(ctx)`/`redo(ctx)` declare a parameter the implementation discards                                                   | **Noted, not acted on.** Belongs to task 0.                                                           |

### From task 0's first pass

| Finding                                                                              | Disposition                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `head` is now a promise, so the widget's read-then-act spans three lock acquisitions | **Accepted, and it is why this plan was restructured.** Folding moved onto the stack as `foldOrExec`.                                                                                                                                         |
| `head.fold(...)` called from the widget inherits that race                           | **Rejected the draft's design.** The widget no longer touches the head.                                                                                                                                                                       |
| `hadError` lost its last reader when the `"toolpath error"` throw was removed        | **Accepted**; it is deleted in stage 4 rather than given a new reader.                                                                                                                                                                        |
| `exec` runs the mass set after the single write already failed                       | **Accepted** as the substantive half of B.                                                                                                                                                                                                    |
| Should `extendUndo` be async?                                                        | **Typed `void \| Promise<void>`, implemented synchronously, called through `asyncCheck`** — see [`extendUndo`](#extendundo-and-why-it-exists).                                                                                                |
| `_execOrRedo` read `this.at(-1)` where it read `this[this.cur]`                      | **Fixed upstream** before this plan starts.                                                                                                                                                                                                   |
| The stack should abort on a throw from any of `undoPre`/`execPre`/`exec`/`execPost`  | **Accepted**, and it is now the stated contract rather than a `_toolCancel` reuse.                                                                                                                                                            |
| Rolling back must not call the op's `undo` automatically                             | **Accepted, replacing the draft's design.** The draft reused `_toolCancel`, which does call `_undo()`. The stack now pops and restores the branch only, and `onExecError(ctx, error, phase)` is where a client reverses if reversing is safe. |
