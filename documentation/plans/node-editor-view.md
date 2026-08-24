# Plan: node editor view

Status: **draft**. The editor half of the node-graph work: the pan/zoom container, the
`NodeEditor` area, its editing gestures, and an example-app tab that exercises all of it.
The library half (sockets, nodes, graph, groups, DSL, ToolOps, data API) is
[node-editor.md](node-editor.md); this plan's stages depend on that plan's stages 5 and 7
and on nothing later. The master task list spanning both plans is
[node-editor-tasklist.md](node-editor-tasklist.md).

The design source is [documentation/research/nodeEditor.md](../research/nodeEditor.md),
settled input as before. Four decisions were made after the spec, by the user on 2026-08-24,
and are settled the same way:

- **`NodeEditor` subclasses the base `Area` class** (scripts/screen/ScreenArea.ts:82), not
  `simple.Editor`. The simple framework's editor base assumes the simple app scaffolding;
  the node editor must be usable by any pathux consumer, whatever framework they run.
- **The library registers no editor.** `Area.register` writes the global `areaclasses`
  registry (ScreenArea.ts:252–266), which every screen's area-switching menu is built
  from — a library-side call would put a node editor entry in every pathux consumer's UI
  whether or not they use the module. The library therefore ships `NodeEditor` unregistered:
  no `Area.register`, no `simple.Editor.register`, no custom-element definition at import
  time. The consumer calls `Area.register(NodeEditor)` (or registers a subclass) exactly
  once, which performs both the areaclasses entry and the custom-element registration.
- **The view is a hostable widget; the editor is a thin shell.** `NodeGraphView` (a
  `Container`) owns the pan/zoom surface, the node frames, the link underlay, and the
  gestures; `NodeEditor extends Area` wraps one `NodeGraphView` and adds only area
  plumbing (header, STRUCT, keymaps). The split exists because a consumer whose editors
  already extend their own `Area` subclass cannot also extend `NodeEditor`, but can host
  the widget inside any editor. The VN Generator desktop app is the first such consumer.
- **Mutating gestures route through a delegate.** Every gesture that would change the
  graph asks a `NodeGraphDelegate` to perform it, and the default delegate dispatches the
  library plan's stage-7 ToolOps, so a standalone consumer sees the specced behavior
  unchanged. A host with its own command system installs a delegate that routes edits
  into that system instead. The delegate also answers whether a proposed edit would be
  accepted (`check`), so a refusal shows mid-gesture rather than on drop, and the host's
  mid-gesture verdict comes from the same authority that will judge the commit.

Each stage below is one commit, green on its own under `pnpm run typecheck`,
`pnpm run test` and `pnpm run format:check`. Stage V4 additionally keeps the example app's
own gates green (see that stage — the root gates do not cover `example/`).

## Ground realities

Verified against the code:

- `Area.register` (ScreenArea.ts:252) writes `areaclasses[def.areaname]` and registers the
  custom element via `UIBase.internalRegister`/`UIBase.register`; `areaclasses` feeds
  ScreenArea's editor switching (ScreenArea.ts:1029, 1493–1505). Registration and class
  definition are separable, which is what the no-registration decision relies on.
- `Area` itself provides `makeHeader`, keymap plumbing, `copy()`/STRUCT participation, and
  the dock-panel system (`definePanels()`, `PanelManager` in scripts/screen/dock_panels.ts)
  — everything stage V3's designer panel needs without `simple.Editor`.
- `DragBox` (scripts/widgets/dragbox.ts:85) is a draggable Container whose drag pattern
  stage V2 borrows without subclassing. `CanvasOverdraw`/`Overdraw`
  (scripts/util/ScreenOverdraw.ts:36, 133) are the link-drag layer precedent, and
  `CanvasOverdraw` already types its 2D context nullable (ScreenOverdraw.ts:37).
- `graphPack` and `graphGetIslands` come from
  `scripts/path-controller/util/graphpack.ts`, the copy `pathux.ts` already re-exports
  (pathux.ts:35). The near-identical `scripts/util/graphpack.ts` is unused by the library
  and is not imported here, because mixing the two puts two incompatible `PackNode` classes
  in play.
- There is no pan/zoom transform container anywhere in the library; stage V1 builds it.
- The example app is the registration precedent: `example/editors/editor_base.ts` defines
  its own `Editor extends Area`, and each example editor calls `Editor.register(cls)` —
  `Area`'s own static — at module scope (example/editors/eventgraph/eventgraph.ts:156).
  `example/pathux.ts` is the local re-export shim example code imports from. The root
  `tsconfig.json` include list and the `format:check` glob (`scripts/**`) both exclude
  `example/`; the example builds through `pnpm nwjs` / `pnpm electron` (which build
  `example/dist/app.js`) and typechecks through its own `example/tsconfig.json`.
- Editor-side names export bare from `scripts/pathux.ts` (`NodeEditor`,
  `PanZoomContainer`, `NodeFrame`); none collide with DOM globals. The graph library's
  `nodegraph` namespace decision is recorded in [node-editor.md](node-editor.md).

## Stage V1 — pan/zoom container

Files: `scripts/widgets/ui_panzoom.ts`, `scripts/pathux.ts` exports,
`tests/panzoom_math.test.ts`.

Public surface: `PanZoomContainer<CTX>` — a `Container` whose single content child carries
a CSS `transform: matrix(...)`; wheel zoom centered on the cursor, middle-drag (and
space-drag) pan, clamped zoom range from `define().theme` tokens, `project(p)` /
`unproject(p)` between screen and content space, `zoomToRect(rect)`, and a `"transform"`
CustomEvent on change (per the DOM-events direction in CLAUDE.md). The transform math lives
in an exported pure class (`PanZoomTransform`) so the widget stays thin. As an ordinary
widget it registers the way every library widget does (`UIBase.internalRegister`); the
no-registration rule above is about editors and `areaclasses`, not widgets.

Tests assert (on the pure class): zoom about a cursor point keeps that point fixed;
pan/zoom compose associatively; `project`/`unproject` invert each other; clamping holds at
both ends; `zoomToRect` fits and centers.

## Stage V2 — the view widget and the editor shell

Files: `scripts/editors/nodeeditor/nodegraphview.ts`, `nodeframe.ts`, `linkcanvas.ts`,
`delegate.ts`, `nodeeditor.ts`, `scripts/pathux.ts` exports,
`tests/nodeeditor_view.test.ts`.

Public surface, split per the widget decision above:

- `NodeGraphView<CTX>` — a `Container` owning the pan/zoom surface (one
  `PanZoomContainer`), the node frames, the link underlay, the breadcrumb row, and the
  gestures. As an ordinary widget it registers the way `PanZoomContainer` does
  (`UIBase.internalRegister`); the no-registration decision is about editors and
  `areaclasses`, not widgets. Its view state (the pan/zoom transform and the group-descent
  path) is exposed as plain serializable data (`getViewState()` / `setViewState()`), so a
  foreign host can persist it through its own mechanism.
- `NodeGraphDelegate` — the gesture seam, in `delegate.ts`. This stage defines the
  interface and the default implementation, which dispatches the library plan's stage-7
  ops, and routes this stage's one mutating gesture (node moves) through it. Selection is
  view state and stays on the widget. `check(edit)` answers whether a proposed edit would
  be accepted, which is how a refusal shows mid-gesture; the default implementation
  accepts whatever the ops accept, including the `structuralEditsRefused()` refusal inside
  a descended instance.
- `NodeEditor extends Area` — a thin shell: it constructs one `NodeGraphView`, forwards
  the area's context to it, and carries the widget's view state in its STRUCT, following
  the Area STRUCT convention. Shipped unregistered per the decision above; its doc comment
  states the consumer's one required call (`Area.register(NodeEditor)` or a subclass).
  `nstructjs.register(NodeEditor)` still runs at module scope — that adds a STRUCT
  definition, not a menu entry, and both serialization and a subclass's `STRUCT.inherit`
  require it.

The rest as specced, all inside `NodeGraphView`: a current-graph pointer with a breadcrumb
row (descending into a group instance is read-only viewing, offering "open definition");
`NodeFrame` — a per-node `Container` (borrowing `DragBox`'s drag pattern, not subclassing
it: a node frame drags in graph space through the pan/zoom transform, not in screen pixels)
whose body is the node's `createUI` and whose sockets render as terminals down the sides;
the link underlay as a `CanvasOverdraw`-style canvas below the frames redrawing on
transform and topology changes — `linkcanvas.ts` tolerates a null 2D context, because
happy-dom provides no working canvas and this stage's vitest tests construct the widget in
that environment; selection (click, shift-click, box-select) on the widget, and node moves
through the delegate.

This stage renders and navigates; it does not yet edit topology. That split keeps both
editor commits reviewable and independently green.

Tests assert: constructing a bare `NodeGraphView` with no Area and no editor registration
works (the widget-split contract); importing the editor module registers nothing — no
custom-element definition, no `areaclasses` entry, and `UIBase.createElement` on its
tagname yields a non-`NodeEditor` element (direct `new` on an undefined custom element
throws Illegal constructor on the web platform, so non-registration is asserted rather
than constructed around) — while `Area.register(NodeEditor)` in a test makes it
constructible and reachable through `areaclasses` (`Area.unregister` afterward removes the
`areaclasses` entry; the custom-element definition is irrevocable, so the register call
happens once per test process);
frames are created and destroyed as nodes enter and leave the graph; frame positions track
`node.pos` through the transform; socket terminal anchor positions (pure math, exported)
land on the frame edge at the socket's row; breadcrumb reflects descent and returns; a
structural gesture inside a descended instance is refused with the sentence from
`structuralEditsRefused()`, surfaced through `check`; a move with the default delegate
issues the stage-7 op, and the same gesture with a test delegate installed reaches that
delegate and issues no op.

## Stage V3 — the editor, editing

Files: additions to `scripts/editors/nodeeditor/` (`linkdrag.ts`, `addmenu.ts`,
`groupui.ts`), `tests/nodeeditor_edit.test.ts`.

Public surface: link dragging (drag from a terminal on the overdraw layer, drop on a
compatible terminal — compatibility asked through `coerce(..., {dryRun: true})` combined
with the delegate's `check`, and terminals refused by either are dimmed); the add-node
search menu built from the node type registry (names via the definition resolvers);
delete/duplicate, and node replacement; auto-arrange via `graphPack` with
`graphGetIslands` (the path-controller copy — see ground realities); the group designer
panel for a definition, hosted as a dock panel via `definePanels()` rather than a
simple-framework sidebar — reordering `exposed` entries, adding a `prop` or `nodeUI`
entry, repointing a broken entry by hand, with unresolved entries silently skipped and
missing ones flagged, per the spec, and saves flowing through the library plan's stage-5
`groupSaver` seam; the forwarded-UI rendering on a group instance's frame, walking
`exposed` through the stage-7 datapath.

Every mutating gesture in this stage goes through the stage-V2 delegate: a completed link
drop, an add-menu pick, delete/duplicate, replacement, auto-arrange's position writes, and
the designer's exposure edits. The default delegate dispatches the stage-7 ops
(`ConnectOp`, `ReplaceNodeOp`, and the rest) plus the `groupSaver` seam, so the specced
behavior is unchanged when no host delegate is installed.

Tests assert: a completed link drag with the default delegate issues `ConnectOp` and an
incompatible drop issues nothing; the same drop with a test delegate installed reaches
that delegate and issues no op, and a drop the delegate's `check` refuses dims the target
during the drag; the add menu lists registered types and instantiates at the drop point in
graph coordinates; auto-arrange keeps islands separate; the exposure list renders in
order, skips an unresolved entry without flagging it, flags a missing one, and repointing
preserves the entry's position; editing a forwarded property on an instance materializes
the override.

## Stage V4 — example-app node editor tab

Files: `example/editors/nodeeditor/nodeeditor_tab.ts` (plus a small
`example/editors/nodeeditor/demo_nodes.ts`), an import-and-register line where the example
wires its editors, `example/pathux.ts` re-export additions if the shim lacks the new names.

Public surface (example app only — nothing in `scripts/` changes): a `NodeEditorTab
extends NodeEditor` that adds the example's context conventions
(`push_ctx_active`/`pop_ctx_active` via `contextWrangler`, as example/editors/editor_base.ts
does), registered at module scope with `Editor.register` the way
`EventGraphViewer` is — this is the consumer-side registration call the library
deliberately omits, exercised for real. `demo_nodes.ts` registers a handful of demo node
and socket types (enough to exercise coercion, a multi-input reduce, and a property-driven
`getUIName`) and one demo group definition served by a stub in-memory
`groupLoader`/`groupSaver` pair, so group descent, the designer panel, and forwarded UI are
all reachable by hand.

Green gates for this stage: the root three (`typecheck`, `test`, `format:check` — all
unaffected, since they exclude `example/`) plus
`pnpm exec tsgo --noEmit -p example/tsconfig.json` and a successful example build (the one
`pnpm nwjs` / `pnpm electron` performs). Behavior is verified live over CDP (`pnpm nwjs`,
then `pnpm cdp screenshot` / `pnpm cdp eval`), since the example app has no vitest
coverage; the demo node types themselves need no new unit tests because they only compose
library surface the library plan already tests.

## What is deliberately not in this plan

- No library-side editor registration, ever — a consumer that wants the editor in its
  menus makes the one `Area.register` call.
- No `simple.Editor` integration. A simple-framework app can still register `NodeEditor`
  (it is an `Area`); a convenience wrapper is a follow-on if wanted.
- No active-output bookkeeping. A consumer that wants Blender-style "most recently
  selected output wins" semantics tracks that flag itself for now; a library-side notion
  of an active output node is a possible follow-on once the editor exists.
- Undo history UI and copy/paste between graphs stay follow-ons, as in the library plan.
