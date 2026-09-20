# Tool handlers

A modal tool today is two things fused into one object: a headless `ToolOp` (inputs,
`exec`, `undo`) and an event handler that rewrites the op's inputs and re-runs it. This
plan makes the split explicit. `ToolOp` goes headless; `ToolHandler` is the event side; a
handler may or may not be bound to an op, and may or may not be pushed on the event modal
stack, which gives four kinds of handler that today are four different hacks. A macro's
modal steps become handler composition, and a toolmode — an app's resting event handler
that dispatches arbitrary commands — is the resting, op-less kind.

Depends on [`migration-records.md`](migration-records.md) stages 1 and 3 (a record is
opened in stage 1 here; `migration plan` runs in stage 6). Lands after
[`property-categories.md`](property-categories.md) has closed its record, since one
record is open at a time and both plans edit `toolop.ts`.

## Context

- `ToolOp` (`toolsys/toolop.ts:346`) `extends events.EventHandler` (`:352`).
  `modalStart` pushes the op itself onto the event modal stack
  (`simple_events.pushModalLight` via `EventHandler.pushModal`/`pushPointerModal`,
  `util/events.ts`); the op receives `on_pointermove` and friends, writes
  `this.inputs.*`, and re-runs itself.
- Modal-only state carried by every `ToolOp`: `is_modal`, `modal_ctx`, `modalRunning`,
  the `ModalCTX` generic parameter (`ModalContextCls` on `ToolStack`), `_pointerId`,
  `_overdraw`, `drawlines`, `makeTempLine`, `resetTempGeom`, `getOverdraw`,
  `_promise`/`_accept`/`_reject`/`_on_cancel`, the default `on_keydown` (Enter and Space
  end, Escape cancels), `pushModal`/`popModal` stubs that throw, `toolCancel()` ("XXX
  fix", unused), `on_tick`, and the module-level `modalstack` that `ToolOp.onTick`
  iterates (`:168, 726–730`; driven by webgl-app-framework's `editor_base.ts:1308`). The
  header rule (`:16–18`): an op may hold pointers to app state only while modal.
- `ToolStack.execTool` (`toolstack.ts:377–460`) runs two programs. Headless:
  `execPre`/`exec`/`execPost`, then `saveDefaultInputs`. Modal: `undoPre` once, install
  `_on_cancel` (undo `this[this.cur]` and pop it, skipped under `NO_UNDO`, `:427–437`),
  record the pointer id, call `modalStart` _inside_ the lock (`:447`, under `protect`,
  `:190–214`), and release the lock at once so a gesture can commit another tool before
  it ends. The lock's watchdog reports a region held past 5 s (`:52, 217–237`).
- **Every existing re-run is `exec` alone over cached start data.** webgl's
  `TranslateOp.on_pointermove` writes `inputs.value` and calls `this.exec(ctx)`
  (`transform_ops.ts:832–834`); `applyTransform` computes `td.start * mat`, so it is
  idempotent without an undo. The identity → `genTransData` → `undoPre(ctx, false)`
  sequence (`:419–426`) is `updateTransData`, reached only from a proportional-radius
  change (`:409–417`), and it _re-runs `undoPre` mid-gesture_ to widen the snapshot.
  Incremental ops are the other shape: webgl `SculptPaintOp.exec` replays every sample in
  `inputs.samples` and its `undo` is `meshLog.undo` (`sculptcore_ops.ts:225–229, 906`);
  path.ux's `example/draw/draw_ops.ts` appends a point per move and runs `execPoints` for
  the new segment only (`:246–298`) while `undo` deletes everything since `idgen`
  (`:204–244`). fairmotion's default `undo` is a whole-file reload
  (`toolops_api.ts:112–127`). Many `exec` bodies branch on `this.modalRunning` to tell
  first run from re-run (webgl `transform_ops.ts:98`, `sculptcore_ops.ts:910`,
  `stroke_paint_op.ts:247`; fairmotion `transform.ts` ×8, `dopesheet_ops.ts` ×2,
  `view2d_spline_ops.ts` ×2, `spline_editops.ts:452`).
- **path.ux's own modal ops are op-less previews.** All seven are `NO_UNDO` with empty
  inputs, holding app pointers from their constructor: `gesture_ops.ts` ×3
  (`:37–56, 164–179, 267–277`), `PanZoomPanOp` (`ui_panzoom.ts:260–293`),
  `markdown_image.ts` ×2 (`:239–268, 327–360`), and `AsyncGateOp` (`delegate.ts:161–216`),
  an input lock with no pointer, started by calling `gate.modalStart()` directly
  (`nodegraphview.ts:1177`) so it never enters the undo stack. The gesture ops commit by
  running a second tool before `modalEnd` (`gesture_ops.ts:127–128, 302–303`,
  `markdown_image.ts:283–284, 450–451`). The five `FrameManager_ops.ts` tools never touch
  the toolstack: `ToolBase.start` → `toolModalStart` → `pushModalLight` with a handler
  dict (`:46–112`, started via `tool.start()` at `FrameManager.ts:2568–2602`; the file's
  line 16 says so). fairmotion's `RenderAnimOp`/`PlayAnimOp` are the same shape
  (`view2d_spline_ops.ts:89–108, 208–227`).
- The one in-library modal op with inputs, `exec`, `undo` and a hand-rolled re-run is
  `BSplineTransformOp` (`pc/curve/curve1d_bspline.ts:541–603`). It undoes twice on
  cancel (`modalEnd(true)` → `_on_cancel` → stack undo, then `this.undo(ctx)`,
  `:543, 551`), is started without the event from a `mousedown` (`:1928`), and ends on
  the _next_ `on_pointerdown` (`:605`) — a deliberate no-capture modal.
- `DataPathSetOp` (`pc/controller/controller_ops.ts:355–376`) is `is_modal` but not a
  gesture: `modalStart` runs `exec` and `modalEnd(false)` synchronously. The flag is used
  to skip `execPre`/`execPost` and to receive the unlocked context.
- `ToolMacro.modalStart` (`toolmacro.ts:453–508`) runs headless members inline
  (`undoPre`/`execPre`/`exec`/`execPost`, then `_do_connections`), starts a modal member
  by calling its `modalStart` directly, and continues on its promise. A cancelled modal
  member therefore does not cancel the macro: it has no `_on_cancel`, its promise
  resolves, `on_modal_end` runs and the remaining members execute (`:477–497`).
  `ToolMacro.undo` reverses _every_ member, executed or not (`:552–556`). Membership is
  per instance (`add`, `:412–431`), so a static `tooldef()` cannot know whether a macro is
  modal; `_getTypeClass` reads the first member's `is_modal` (`:249`). `modalStart` also
  calls `loadDefaults(false)` (`:456`; `documentation/toolsystem.md:127`). webgl's
  extrude-then-grab macros (`leafmesh/src/modeling_ops.ts:167–181`,
  `litemesh/src/litemesh_modeling_ops.ts:1053–1071`) and fairmotion's
  `DuplicateTransformMacro` (`view2d_spline_ops.ts:57–87`) depend on the executed
  members surviving a cancelled grab.
- Hotkeys start tools with no event: `HotKey.exec` (`simple_events.ts:926–938`) calls
  `ctx.api.execTool(ctx, "path(...)")`, and `api.execTool`
  (`controller_abstract.ts:283–332`) passes an event through only when given one. Whether
  a tool goes modal is decided by `tooldef().is_modal` alone, and the toolstack reads the
  _instance_ field (`toolstack.ts:421`), which `modalEnd` clears (`toolop.ts:1041`),
  `ToolMacro.add` sets (`:413–414`) and webgl sets to `false` per instance
  (`sculptcore_ops.ts:1529`). `pushModalLight` resolves handler names as `k`, `on` + k
  and `on_` + k (`simple_events.ts:619–621`), so `DrawOp.pointermove` and
  `PanOp.onmousemove` in `example/` are real handlers. webgl passes the event to
  `OrbitTool` only, not `PanTool`/`ZoomTool`/`TouchViewTool` (`view3d.ts:1186–1200`).
- Other readers of the modal state: `ui_lasttool.ts:127–134` suppresses re-runs while
  `tool.modalRunning` or `toolstack.locked`; webgl `autosave.ts:126–127` reads
  `toolstack.modal_running`; webgl sets `tool.modal_ctx = ctx` on non-modal runs
  (`sculptcore_ops.ts:1475, 1586`); fairmotion wraps `start_modal`/`end_modal`
  (`toolops_api.ts:129–135`); `tests/toolstack_lock.test.ts:78–112, 277–309` drives
  `modalStart`/`modalEnd`/`_on_cancel`/`modal_running`; `example/draw/draw_ops.ts:51`
  and `example/editors/workspace/workspace_ops.ts:20` are modal, and `example/` is the
  second half of `pnpm run typecheck`.
- Nothing modal is serialized: `ToolOp.STRUCT` is inputs and outputs
  (`toolop.ts:1097–1102`), `ToolMacro.STRUCT` adds `tools` and `connectLinks`
  (`toolmacro.ts:559–569`).
- Consumers, excluding vendored copies and build output: webgl-app-framework 13 files
  with `is_modal: true`, 32 `modalStart` references, 13 `makeTempLine`/`resetTempGeom`,
  1 `makeTempText`; fairmotion 12 / 14 / 4; noise_fractal_stuff 2 / 2 / 0; visualnovel
  none. fairmotion and noise_fractal_stuff are pinned to a pre-split path.ux (one
  `toolsys/toolsys.ts`, no `toolstack.ts`), so their per-op rewrite sits on top of a
  much larger gap this plan does not cover.
- webgl's `ToolMode` (`view3d_toolmode.ts`) extends `Node` — saved in the scene, undoable
  — owns widgets and a `KeyMap`, has `on_drawstart`/`on_drawend`, and receives
  `on_mousedown/move/up(e, x, y, was_touch)` from `View3D.doEvent` (`view3d.ts:917–960`),
  which calls the toolmode _first_, the widgets second, passes a `docontrols` flag, and
  uses the boolean return to stop propagation. `selecttool.ts:139` dispatches
  `ctx.api.execTool(ctx, "object.selectone(...)")` on click.
- The node editor's pointer dispatch is per-element DOM listeners in
  `nodegraphview.ts:318, 798–800, 1027, 1575` and `nodeframe.ts:115, 770`. `delegate.ts`
  is `NodeGraphDelegate`, a data seam (`GraphEdit` → `ToolOp`, `check`/`perform`,
  `:115–133, 228–532`) with no pointer methods.
- `CLAUDE.md` § Modal drag gestures names `gesture_ops.ts` and `PanZoomPanOp` as the
  reference implementations and cites `toolsys/toolsys.ts` for the pointer rule, which
  lives at `toolop.ts:16–18`.

## Decisions already made

- `ToolOp` holds no event state and no pointers to app state, ever.
- A handler reaches its op through `inputs` (to write) and `apply()` (to re-run), and
  through nothing else. The toolstack, not the handler, tells the op when the gesture
  ended, through an optional `op.finish(ctx, cancelled)`.
- **`apply()` defaults to `exec` alone** — today's contract, which every existing re-run
  already satisfies. An op that needs its partial effect reversed before a re-run
  overrides `reexec(ctx)` (`undo` then `exec`, or something cheaper). Undo-first as the
  default would make an incremental op O(N²) per stroke and is the expensive door to walk
  back through; exec-only is free to walk back from.
- Whether a tool starts its handler is decided by `op.handlerClass()`, an instance method
  defaulting to `tooldef().modal`; `{ modal: false }` on the call runs it headless. "Event
  present" is not the trigger, because hotkeys start gestures with no event. An op with
  no handler class cannot be started modally.
- Four kinds of handler, all one class: bound or op-less, pushed on the event modal stack
  or resting. A pushed op-less handler (`toolstack.startHandler`) puts nothing on the undo
  stack — the shape of every in-library gesture today. A resting op-less handler is a
  toolmode.
- A pushed handler that is bound to an op on the undo stack may not commit another tool
  (`exec`/`gesture` throw); only op-less and `NO_UNDO` handlers may, which is what every
  committing gesture is today.
- **Macro cancel is per member**: cancelling a modal member reverses that member through
  its own `finish(ctx, true)`, ends the macro there, and leaves the executed members on
  the stack. Today's behaviour — the remaining members run anyway — is a bug for a
  `[modal pick, geomOp, grab]` macro and is changed; the executed members surviving is
  what the extrude-then-grab macros depend on, and is kept.
- `ToolHandler` and the toolstack changes live in path-controller; the temp geometry
  (overdraw, `makeTempLine`, `makeTempText`) is a path.ux mixin.
- Toolmodes get an interface and two helpers from path.ux, and nothing else. No registry,
  no widgets, no keymap ownership, no rewrite of the node editor's input layer.
- No compatibility shims.

## Design

### `ToolOp`, headless

- Loses: the `EventHandler` base, every member in the Context list, `ModalCTX`, and the
  module-level `modalstack`. `ToolStack` loses `ModalContextCls`, `modalRunning` and
  `modal_running`, gaining `activeHandler` and `onTick()`.
- Keeps: inputs, outputs, `canRun`, `undoPre`/`undo`/`redo`, `execPre`/`exec`/`execPost`,
  `onExecError`, STRUCT, defaults.
- Gains: `reexec(ctx)`, default `exec(ctx)`; `finish?(ctx, cancelled)`, called by the
  toolstack when a gesture ends, for op-side cleanup that is not a re-run (webgl's
  `clearModalFlag` and `invalidate(POSITIONS)` at `transform_ops.ts:345–362`);
  `handlerClass()`, default `tooldef().modal`.
- `exec` bodies that branch on `this.modalRunning` split: the first-run half stays in
  `exec`, the re-run half becomes `reexec`.
- `tooldef().is_modal` becomes `tooldef().modal?: typeof ToolHandler`.

### `ToolHandler`

```ts
class ToolHandler<
  Op extends ToolOpAny | undefined = undefined,
  CTX extends ContextLike = ContextLike,
>
  extends events.EventHandler
{
  readonly ctx: CTX;
  readonly op: Op;
  readonly pushed: boolean; // on the event modal stack, or resting
  get inputs(): NonNullable<Op>["inputs"]; // throws when op-less
  apply(): void; // latest-wins re-run of the bound op; throws when op-less
  end(cancelled?: boolean): void;
  start(ctx: CTX, event?: PointerEvent): void; // overridable; super captures the pointer when given one
  on_pointerdown(e): boolean | void; // and move, up, cancel, keydown, keyup, wheel, tick
  exec(path: string | ToolOpAny): Promise<void>; // dispatch a command
  gesture(op: ToolOpAny, event?: PointerEvent): Promise<void>; // start op's handler
}
```

- The `on_*` methods return `boolean | void`; `true` means consumed. That is what a
  resting handler needs (webgl's `doEvent` stops propagation on it) and costs a pushed one
  nothing.
- Default `on_keydown` is today's: Enter and Space end, Escape cancels.
- `exec` and `gesture` are `ctx.api.execTool` / `ctx.toolstack.execTool` with the
  handler's context. They throw when the handler is bound to an op on the undo stack.
- The temp-geometry mixin in path.ux adds `makeTempLine`, `makeTempText`,
  `resetTempGeom` and the overdraw, cleared in `end`.
- One handler class serves any op whose inputs it knows how to write; several ops'
  `tooldef().modal` may name the same class.

### The toolstack

- `execTool(ctx, op, eventOrOptions?)`. `options.modal === false` or no handler class →
  headless, as today's non-modal branch. Otherwise: push the op unless `NO_UNDO`,
  `undoPre`, construct the handler (`options.handler ?? op.handlerClass()`), push it on
  the event modal stack (pointer-captured when an event is given), release the lock, and
  _then_ call `handler.start(ctx, event)`. Starting inside the lock would deadlock the
  first `apply()`. The returned promise resolves when the handler ends.
- `startHandler(ctx, handler, event?)`: the op-less form. Pushes the event modal stack,
  nothing on the undo stack, resolves on `end`. `AsyncGateOp`, the gesture ops,
  `PanZoomPanOp`, the `markdown_image.ts` ops and the `FrameManager_ops.ts` tools become
  handlers started this way; `ToolBase` and `toolModalStart` go.
- `apply()` is latest-wins: the handler marks the op dirty; the toolstack runs
  `op.reexec(ctx)` under `protect` once, after any region in flight, and a second `apply`
  before that run does nothing more (the inputs already hold the latest values). This
  keeps the browser's pointer-move coalescing, which today's synchronous `exec` gets for
  free. `end()` stamps a generation; a re-run queued before it is dropped, so Escape on a
  preview cannot be followed by a stale re-apply.
- For a macro member, `reexec` runs on the member while the macro is the stack entry;
  `reapply` takes the op explicitly and does not check it against the head.
- End uncancelled → `op.finish?.(ctx, false)`, `saveDefaultInputs`, resolve. If
  `apply()` never ran, the entry is popped: a step whose `undoPre` ran and `exec` never
  did is a no-op undo step. Cancelled → `op.finish?.(ctx, true)`, then undo and pop the
  op _by identity_, not by `cur`, unless `NO_UNDO`. Both paths pop the event modal
  stack and run the mixin's cleanup.
- `activeHandler` is the one pushed handler, or `undefined`; it replaces `modal_running`
  for `autosave.ts` and `ui_lasttool.ts`'s guard, and `toolstack.onTick()` drives its
  `on_tick`, replacing `ToolOp.onTick` over the module `modalstack`.

### Macros

- `ToolMacro` is headless; its `exec` runs members in order with `_do_connections`, as
  its non-modal `exec` does today. `handlerClass()` returns `MacroHandler` when any member
  has one, computed per instance where `_getTypeClass` reads the first member today.
  `undo` reverses only the members that executed, tracked by count.
- `MacroHandler.start`: `loadDefaults(false)` (moved from `modalStart`), then run members
  headless up to the first with a handler class; construct that member's handler bound to
  the member, start it with the same event, continue when it ends. Uncancelled →
  `_do_connections`, the following headless members, the next handler; after the last
  member, `end(false)`. Cancelled → the member's `finish(ctx, true)` has reversed it;
  `end(false)` on the macro with the executed count as it stands.
- `ToolMacro.modalStart`, `has_modal` and `curtool` go.

### Toolmodes

- path.ux exports `ToolHandler` with `pushed: false` and no op as the toolmode base, and
  that is all. `exec` and `gesture` are the two helpers a toolmode uses that a gesture
  does not.
- webgl's `ToolMode extends Node` composes a resting handler or implements the interface;
  its widgets, keymap, draw hooks, scene storage and undo stay where they are, and
  `View3D.doEvent`'s toolmode-first ordering and `docontrols` flag are app-side. The
  `(e, x, y, was_touch)` vocabulary maps onto the handler's pointer methods at that seam.
- The node editor is not rewritten. Its DOM-targeted listeners stay; where it starts a
  gesture it uses `startHandler`.

### Migration record

- `documentation/migrations/tool-handlers.md`. Surfaces: `api`, `behaviour`, `modules`
  if `toolop.ts` is split. Not `struct`; the record's **Save files** section says nothing
  modal was ever serialized.
- `behaviour` entries: `reexec` replaces the `modalRunning` branch in `exec`; a tool with
  no handler class cannot be started modally; `DataPathSetOp` runs headless, so
  `execPre`/`execPost` now run for it and a throw is reported as `exec`; macro cancel
  ends the macro after the cancelled member; a pushed gesture that never applied is
  popped; a bound, pushed handler cannot commit another tool.
- Searches: `is_modal`, `\bmodalStart\b`, `\bmodalEnd\b`, `modal_ctx`, `modalRunning`,
  `modal_running`, `makeTempLine`, `makeTempText`, `resetTempGeom`, `getOverdraw`,
  `drawlines`, `ModalCTX`, `ModalContextCls`, `_on_cancel`, `toolCancel`, `has_modal`,
  `ToolOp\.onTick`, `start_modal|end_modal`, `toolModalStart`, `ToolBase\b`,
  `\.modal_ctx\s*=`, and inside a class that `extends ToolOp`:
  `\b(on_?)?(pointer|mouse)(move|up|down|cancel)\(`, `\bon_?keydown\(`, `\bon_?tick\(`.
- What a consumer rewrites, per modal op: `is_modal: true` → `modal: XHandler`; the
  `modalStart`/`modalEnd` overrides and the `on_*` methods → an `XHandler` whose `on_*`
  write `this.inputs` and call `this.apply()`; the `if (!this.modalRunning)` branch in
  `exec` → `reexec`; `modalEnd`'s op-side cleanup → `finish`; `modal_ctx` → the handler's
  `ctx`; a preview op with no inputs → an op-less handler through `startHandler`. webgl's
  transform ops keep their trans-data cache and `updateTransData` becomes their `reexec`.

### Cost to undo

- Dropping the `EventHandler` base and `is_modal` are the irreversible parts, and both
  are deferred to stage 4, so stages 1–3 can be reverted by deleting additions.
- The expensive door is the `apply()` contract. Exec-only is what every op already does,
  so landing it commits nobody to anything new; undo-first would have.

## Stages

Each stage is one path-controller commit plus the path.ux commit that bumps and adapts,
green under path.ux's `typecheck`, `test` and `lint:check`. `example/` and
`tests/toolstack_lock.test.ts` are updated in the stage that changes what they use.

1. **Open the record; `ToolHandler`; `startHandler`; `reexec`.** `ToolHandler` in
   path-controller; `reexec`, `finish` and `handlerClass` on `ToolOp`; `startHandler`,
   `reapply`, `activeHandler` and `onTick` on the toolstack; the branch in `_execTool`
   reads `handlerClass()` first and falls back to the instance `is_modal`; `ToolMacro.add`
   sees `modal` as well as `is_modal`. The temp-geometry mixin in path.ux.
   `BSplineTransformOp` converted as the first bound user (its double undo goes with it);
   `PanZoomPanOp` as the first op-less one. Record opened.
2. **In-library gestures.** `gesture_ops.ts`, `AsyncGateOp`, `markdown_image.ts`,
   `FrameManager_ops.ts` (`ToolBase` and `toolModalStart` removed) as op-less handlers;
   `DataPathSetOp` headless; `example/draw/draw_ops.ts` and
   `example/editors/workspace/workspace_ops.ts` converted; `CLAUDE.md` § Modal drag
   gestures rewritten to name the handler and to cite `toolop.ts` for the pointer rule.
3. **Macros.** `MacroHandler`; executed-count undo; `handlerClass` on `ToolMacro`;
   `modalStart`, `has_modal`, `curtool` removed; `toolsystem.md:127` updated.
4. **`ToolOp` headless.** Every member in the Context list removed; `EventHandler` base
   dropped; `ModalCTX`/`ModalContextCls` removed; `is_modal` removed from `tooldef` and
   from the toolstack branch; `ToolOp.onTick` and the module `modalstack` removed;
   `ui_lasttool.ts` on `activeHandler`; `tests/toolstack_lock.test.ts` rewritten against
   the handler; `toolop.ts`'s header rule rewritten. Barrel fixture regenerated.
5. **Toolmode interface and docs.** The resting, op-less form documented as a section of
   `toolsystem.md`, with the webgl `doEvent` seam as the worked example; nothing in the
   node editor changes.
6. **Close the record; acceptance.** The record's prose from the consumer's seat;
   `migration check` green. Acceptance is webgl-app-framework converting its transform
   ops and composing a toolmode with the base, through `migration plan`, once its pin has
   reached this plan's base through the earlier records.

## Status

- [ ] Plan written
- [ ] Pressure-tested; findings folded in below
- [ ] Stage 1: record opened; `ToolHandler`; `startHandler`; `reexec`
- [ ] Stage 2: in-library gestures
- [ ] Stage 3: macros
- [ ] Stage 4: `ToolOp` headless
- [ ] Stage 5: toolmode interface and docs
- [ ] Stage 6: record closed; acceptance

## Pressure test

A fresh-context review returned fifteen findings. What each changed:

1. Undo-then-exec as the `apply()` default: every existing re-run is exec-alone over
   cached start data, `undoPre` is re-run mid-gesture in the flagship case, and undo-first
   makes incremental ops O(N²). Fixed: exec-only default, `reexec` opt-in, premise
   sentence removed.
2. The plan's premise described none of path.ux's own modal ops, which are op-less
   `NO_UNDO` previews; `FrameManager_ops.ts` never touches the toolstack. Fixed: four
   kinds of handler, `startHandler`, `BSplineTransformOp` as the first bound user, and
   every in-library op placed.
3. `apply()` under `protect` from inside `start` deadlocks; per-move regions queue
   unboundedly; a queued apply outlives `end`. Fixed: `start` after lock release,
   latest-wins apply, generation stamp at `end`.
4. Cancel undid the head by index while the plan let a pushed gesture commit another
   tool. Fixed: undo by identity; a bound, pushed handler may not commit.
5. Macro cancel: `ToolMacro.undo` reverses unexecuted members, today's cancel continues
   the macro, `tooldef()` cannot know a macro's modality, `loadDefaults` needed a home,
   and a member's `reapply` would fail the head check. Fixed: per-member cancel that
   ends the macro, executed-count undo, `handlerClass()` per instance, `loadDefaults` in
   `MacroHandler.start`, `reapply` taking the op explicitly.
6. Stage 4 broke unlisted callers: `ToolOp.onTick`, `ui_lasttool.ts`, `autosave.ts`,
   webgl's non-modal `modal_ctx` writes, the lock test, two `example/` ops. Fixed: listed,
   `activeHandler` and `toolstack.onTick()` added.
7. Searches missed the un-prefixed handler names `pushModalLight` resolves. Fixed.
8. `DataPathSetOp` is not a gesture; `BSplineTransformOp` undoes twice and is a
   no-capture modal; webgl passes the event to one view tool of four. Fixed: headless, a
   `behaviour` entry, and cited.
9. "`delegate.ts` becomes a toolmode" misread a data seam as an input layer, and
   `void`-returning `on_*` cannot say "consumed". Fixed: stage 5 reduced to the interface
   and docs; `boolean | void` returns.
10. Record ordering against `property-categories.md` and the `struct` surface were
    undecided. Fixed: lands after that record closes; not `struct`, with **Save files**
    saying so.
11. Stage 1's branch and `ToolMacro.add` needed spelling out; the `modalRunning` branch
    in `exec` needed a named replacement. Fixed.
12. Line numbers, counts, `ToolOpBase` (does not exist; `ToolOpAny`), the pre-split pins
    of two consumers, the `CLAUDE.md` citation. Fixed.
13. A pushed gesture that never applied, and op-side cleanup at end. Fixed: popped;
    `finish(ctx, cancelled)`.
14. `ui_lasttool.ts`'s guard depended on the lock. Fixed: `activeHandler`.
15. One-way doors. Added as Cost to undo; the `apply()` direction argument is what
    decided finding 1.
