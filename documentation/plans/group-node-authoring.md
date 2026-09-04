# Group node authoring

Status: **planned**. The groups the graph module already has — `GroupDef`, `GroupNode`, the
proxy nodes, reconciliation, the designer panel — gain the gestures that make them usable
from the editor: making a group out of a selection, taking one apart again, entering a
group's definition to edit it, and editing its boundary and its forwarded rows with real
controls. The example app exercises all of it through its Edit menu and the ToolOp
toolstack; the VN Generator desktop app hosts the same view over its own command system and
is planned separately in
`C:\dev\visualnovel\docs\plans\group-nodes-in-the-gen-graph-editor.md` (the desktop plan).
This plan covers path.ux alone.

<!-- toc -->

- [What exists, verified against the code](#what-exists-verified-against-the-code)
- [What is missing](#what-is-missing)
- [Vocabulary](#vocabulary)
- [Decisions](#decisions)
- [The look](#the-look)
- [Stages](#stages)
  - [Stage G1 — grouping and ungrouping, as pure graph operations](#stage-g1--grouping-and-ungrouping-as-pure-graph-operations)
  - [Stage G2 — the ToolOps and the delegate](#stage-g2--the-toolops-and-the-delegate)
  - [Stage G3 — levels: the view enters a definition](#stage-g3--levels-the-view-enters-a-definition)
  - [Stage G4 — the group designer, rebuilt](#stage-g4--the-group-designer-rebuilt)
  - [Stage G5 — the example app](#stage-g5--the-example-app)
- [Verification](#verification)
- [Deliberately cut](#deliberately-cut)
- [Pressure test](#pressure-test)

<!-- tocstop -->

## What exists, verified against the code

Checked on 2026-09-04.

- `GroupDef` (`scripts/graph/group.ts:144`) holds a subgraph, boundary socket templates and
  the `exposed` list. `declareInput`/`declareOutput` (`:194`, `:210`) add a boundary socket
  and return the inner proxy socket to wire; `removeInput`/`removeOutput` retire one.
  `contentHash()` hashes the definition's JSON, positions included, and is what instances
  compare against.
- `GroupNode` (`group.ts:306`) carries `ref`, `syncedHash` and a physical `subgraph`.
  `setDefinition` refuses self-containment; `_resolveGroup` skips an empty `ref`, loads
  through `Graph.groupLoader` and calls the private `_reconcile`, which rebuilds the
  instance subgraph from a JSON copy of the definition's and transplants `wasSet` overrides
  back in. Its API (`:343`) mounts the instance subgraph at the `group` member, so a
  datapath descends `nodes[3].group.nodes[7]`. `loadSTRUCT` (`:668`) restores the subgraph
  and re-wires the proxies but leaves `definition` unset until the next `resolveGroups`.
- A definition's subgraph maps back to its `GroupDef` through `definitionOfSubgraph`
  (`group.ts:19`), keyed by the subgraph object, which reconciliation never replaces.
- `Graph.structuralEditsRefused()` (`graph.ts:239`) answers with a sentence on an instance
  subgraph, and every structural op's `canRun` consults it through `structuralOkay`
  (`graph_ops.ts:80`). `graph.sort()` flattens instances through `expandNode`, which leaves
  the `GroupNode` itself out of the order.
- `Graph.add` (`graph.ts:140`) throws for a node that belongs to another graph, keeps a
  preassigned id, bumps `idgen` past a numeric one, and allocates only for `NO_ID`; a
  colliding id silently overwrites the `nodeIdMap` entry. `Graph.remove` severs the node's
  edges and clears its `graph`. Node ids are per graph and every graph's `idgen` starts at
  zero, so an inner node and a root node sharing an id is the normal case.
- `Graph`'s `[CreateSnapshot]` (`graph.ts:126`) covers node identity, label, position and
  edges and deliberately not prop values, so a path watch on a graph wakes for a structural
  op or a move and not for a property write.
- The store seams `groupLoader` and `groupSaver` live on the root `Graph` (`graph.ts:103`);
  a definition's subgraph carries none and has no pointer back to a root.
- A STRUCT member of the data API is read as `obj[path]`, and a dotted path is walked key
  by key (`path-controller/controller/controller.ts:1279-1334`), so a member can be declared
  over `definition.subgraph` with no new getter. An unresolvable step throws, which
  `graphAt` reports as a sentence.
- The view (`scripts/editors/nodeeditor/nodegraphview.ts`) keeps `descent: GraphId[]`, a
  list of instance ids, and builds `currentGraphPath` by appending `.nodes[id].group`
  per entry. `descendInto` (`:284`) shows an instance read-only. Nothing in the library
  calls it. The breadcrumb (`:344`) is raw `<button>`s and offers Open Definition when the
  host set `onOpenDefinition`.
- A press on a frame header runs `_wirePress` (`nodeframe.ts:706`), which starts
  `NodeMoveModalOp` with pointer capture on the screen element, so a `click` or `dblclick`
  never reaches the header; a press that did not drag reports through `onMoveClick`
  (`gesture_ops.ts:129`).
- `NodeEditor.editDefinition(ref, def, defPath)` (`nodeeditor.ts:117`) re-points the view
  at `def.subgraph` under a host-supplied datapath, losing the parent graph from the
  breadcrumb, and shows the designer, which dispatches against `_rootPath` (`:136`). The
  example app mounts one definition at a fixed `demogroup` path
  (`example/api/api_define.ts`, `example/core/context.ts`), so it can edit exactly one
  group, and `pnpm run typecheck` covers the example (`package.json:14`).
- The four exposure edits (`delegate.ts:57-75`) carry `ref` and `def` and are performed by
  mutating `def.exposed` in place and calling `groupSaver` (`_performExposure`, `:462`); they
  carry no undo, and `check` accepts them unconditionally (`:287`).
- The designer (`groupui.ts:233`) asks the author to type node ids and property keys into
  raw `<input>`s.
- `_performDuplicate` (`delegate.ts:412`) duplicates by `AddNodeOp` on the type name plus a
  `SetNodePropOp` per authored value, so a duplicated `GroupNode` arrives with an empty
  `ref` and no subgraph.
- `addMenuItems` (`addmenu.ts:20`) leaves the three group classes out, so nothing can place
  an instance of an existing definition from the editor, and `buildGraphFromDSL`
  (`dsl.ts:86-96`) diagnoses a `GroupNode` entry as an unknown type.
- `HotKey(key, modifiers, action)` takes a toolpath string or a callback
  (`scripts/path-controller/util/simple_events.ts:979`); a keymap is consulted only for the
  active area (`FrameManager.ts:2721`), and `KeyMap.handle` matches the modifier set
  exactly, so Ctrl+Alt+G and Ctrl+G are distinct.
- `graph_ops.ts:11` imports `GraphContext` from the `pathux` barrel, a pre-existing cycle;
  new ops import the type from `../editors/nodeeditor/delegate`.

## What is missing

- No operation turns a selection into a group, and none takes a group apart.
- No gesture enters a group. The two entries that exist — `descendInto` for a read-only
  instance view and `editDefinition` for a definition — are unconnected, and the second
  forgets where it came from.
- Editing a definition's boundary (add or remove an input or output) has no op and no UI;
  editing its exposed rows has UI that types ids by hand and no undo.
- Duplicating a group instance loses it.
- An existing definition cannot be instanced from the add menu or named from the DSL.

## Vocabulary

- **Definition**: a `GroupDef`, stored wherever the host's `groupLoader` and `groupSaver`
  say. The example app keeps them in a `Map`; the desktop app keeps one file per
  definition.
- **Instance**: a `GroupNode` in some graph, naming its definition by `ref`.
- **Level**: what the view is showing. The **root** graph; a **definition**, whose
  subgraph is editable and whose edits reach every instance; or an **instance**, whose
  subgraph is shown read-only so an author can see the overrides it carries.
- **Boundary**: a definition's inputs and outputs, mirrored on the Group Input and Group
  Output proxy nodes inside it and on every instance's socket rows outside.

## Decisions

Settled here so the stages below do not reopen them.

1. **Entering a group edits its definition.** The research doc that shaped the graph module
   (deleted with its plans in commit `fbd16fae`; `git show
   fbd16fae^:documentation/research/nodeEditor.md`) put the rule as "the editor can descend
   into an instance to look at it, and offers opening the definition as the way to change
   anything", and it stands. Tab, a double press on a group's header, and Edit ▸ Edit Group
   all push a *definition* level. The read-only instance view stays reachable from the
   node's context menu as Show Instance, since it is the only place an author can see what
   one instance overrides. An instance nested inside an instance has no definition of its
   own (reconciliation copies the definition's inner instances without resolving them), so
   Show Instance one level down offers no *edit the definition* button and its tooltip says
   the definition is not loaded at that depth.
2. **A definition level is addressed by datapath, not by host wiring.** `GroupNode`'s API
   gains a `definition` member beside `group`, declared over the dotted path
   `definition.subgraph`, so `nodegraph.nodes[3].definition.nodes[7].props['x'].value`
   composes from the machinery `group` already uses and nests for a group inside a group.
   An instance whose definition has not resolved yet (one just loaded from a file) makes the
   path throw; `currentGraph` answers `undefined` for that entry and decision 14 pops the
   view. `NodeEditor.editDefinition` and its `defPath` argument are removed, and the
   example app's `demogroup` mount with them. The ToolOps need no change for this:
   `graphAt` resolves whatever the path yields, a definition's subgraph is not an
   instance's, so `structuralEditsRefused()` is undefined on it, and `definitionOfSubgraph`
   already maps it back to its `GroupDef`.
3. **The library allocates no ref, and an op that needs the store is told where it is.**
   Creating a group needs a name for the new definition, and only the host knows what a ref
   is. `Graph.newGroupRef?: () => string` joins `groupLoader` and `groupSaver` as the third
   store seam; the example app counts up `group_1`, `group_2` against its map. The
   `createGroup` edit carries `ref?`, the view fills it from the root graph's seam when the
   seam exists, and `ToolOpDelegate` refuses the edit by sentence when neither the edit nor
   the seam supplies one. The desktop app's delegate leaves it empty and its command
   allocates a file name. Because the seams live on the root graph and a group may be made
   inside a definition, `CreateGroupOp` takes a second path, `storePath`, naming the root;
   the view passes its own `graphPath`. The op saves the new definition through that root's
   `groupSaver` in `exec`, before the view's pass (decision 9) saves the enclosing
   definition and resolves, so the loader can answer the new ref when the outer instance
   reconciles.
4. **Grouping moves the nodes; it does not copy them.** The selected nodes leave the graph
   and become the definition's subgraph with their ids, positions, links and authored values
   intact, so the author sees the same layout inside the group they had outside. The
   instance placed in their stead reconciles against the definition at once (a public
   `GroupNode.syncToDefinition()` wraps the private `_reconcile`), and starts with no
   overrides: the definition holds the values.
5. **The boundary is derived from the cut.** Each link from an outside output into a
   selected input becomes one group input, keyed and typed by the first inner socket it
   reaches in selection order; one outside output feeding two selected inputs yields one
   group input feeding both, because that is the wiring the author had. Each selected output
   feeding an outside input becomes one group output, keyed by the socket's name. A key
   collision takes a numeric suffix (`value`, `value_2`). The boundary socket's template is
   a copy of the inner socket it stands for, so it carries that socket's type and editable
   default.
6. **Ungrouping copies the instance's subgraph; it does not move it.** An instance's
   subgraph is a physical copy with its overrides materialized as `wasSet` values, so
   inlining a JSON copy of it is what an author who ungroups expects: the nodes come back
   with the values this instance had, and the `GroupNode` itself is left whole for undo to
   put back. A numeric id is reset to `NO_ID` before `Graph.add` so the parent allocates
   one; a string id is kept when the parent has no node by that name and suffixed
   otherwise. Internal links are re-made through an old-to-new id map, and boundary links
   reconnect through what the proxies were wired to. The definition is left in the store
   untouched; another instance may still use it.
7. **Group and Ungroup are one ToolOp each, not macros, over pure functions a host without
   a toolstack can call.** Every mutation this plan adds — grouping, ungrouping, the four
   exposure edits, the two boundary edits — is a plain function in `scripts/graph/grouping.ts`
   taking a `Graph` or a `GroupDef`, and the ToolOp wraps it with undo. The desktop app's
   main process applies the same functions inside its commands and never runs a ToolOp.
   `CreateGroupOp` does the whole move in `exec` and its undo takes the same node objects
   back out of the definition's subgraph and re-adds them with their edges, the way
   `DeleteNodeOp` does. The `GroupDef` is held on the op and reused by redo, so the store
   never sees two definitions for one ref, and the reallocated ids of an ungroup are
   recorded for redo. After an undo the definition is still in the store, emptied down to
   its proxies: there is no `groupDeleter` seam, the example app shows it in Add ▸ Group
   until the page reloads, and the desktop app's undo restores its file tree wholesale and
   so removes the file.
8. **Every definition edit is an undoable op that notifies the definition's path.** The four
   exposure kinds stop being in-place mutations and become `ExposeEntryOp`,
   `ReorderEntryOp`, `RepointEntryOp` and `RemoveEntryOp`; the boundary gains
   `AddGroupSocketOp` and `RemoveGroupSocketOp`. Each finds its `GroupDef` through
   `definitionOfSubgraph` of the graph at `graphPath` and refuses on a graph that is no
   definition, and the delegate's `check` refuses the same way. The `GraphEdit` kinds keep
   their names and drop their `ref` and `def` fields, which the path now supplies. A
   boundary socket is not renamed in this plan: `_diffBoundary` keys instances by socket
   name, so a rename is a remove plus an add, and every instance's socket by that key is
   marked orphaned. A display label is a follow-on.
9. **Saving and propagating a definition edit is the view's job, at three moments.** After a
   notification on a definition level that changed its topology, when a definition level
   is left, and when the view is removed from the document while on one, the view calls
   the root graph's `groupSaver` for that definition and then `resolveGroups()`, then syncs
   and notifies the root graph's path so another view of the same root redraws its
   reconciled instances. Topology means the graph snapshot with positions left out: a move
   inside a definition wakes the watch every frame, and saving and reconciling every
   instance per frame is not worth it while none is on screen, so moves are carried out by
   the second moment. The second and third moments also exist because a property write
   inside a definition does not wake the graph's path watch at all (the snapshot excludes
   values on purpose). The pass is asynchronous; the view exposes it as `pendingResolve` and
   `exitLevel`/`popTo` return it, so a caller or a test can await it. A host with no saver
   skips the save; a host with no loader gets nothing from `resolveGroups` and is
   unaffected. The delegate stops calling `groupSaver` itself.
10. **Duplicate clones.** `DuplicateNodeOp` copies a node through `cloneNode`, a JSON round
    trip with a fresh id, which carries a group's `ref`, its instance subgraph and its overrides, and
    replaces the add-plus-set macro. The copy of a resolved instance is given the source's
    definition directly, so its forwarded rows draw without a resolve pass, on redo too.
    `duplicateNode` in `GraphEdit` is unchanged.
11. **An instance of an existing definition is added through `addNode` with a `ref`.** The
    `addNode` edit and `AddNodeOp` gain an optional `ref`, honoured when the type is
    `GroupNode`. The view's root-level watch runs `resolveGroups` whenever the notified
    graph holds an instance with a ref and no definition, which covers the add, its redo,
    and a graph loaded from a file. `addGroupMenuTemplate(refs, onPick)` builds the picker;
    the host supplies the refs, since only it can list its store.
12. **Hotkeys are declared once, on the view.** `NodeGraphView.hotkeys()` returns the
    `HotKey` list — Delete, Shift+D, Ctrl+G, Ctrl+Alt+G, Tab — and `NodeEditor` installs it
    as its keymap. A host embedding the bare view builds its own `KeyMap` from the same list,
    so the two hosts cannot drift. Tab enters the definition of the one selected group node,
    and with no group selected leaves the current level; the keymap only sees it while the
    node editor is the active area, so focus traversal elsewhere is untouched. Ctrl+Alt+G
    rather than Ctrl+Shift+G because Blender uses Ctrl+Alt+G for ungroup and an author
    arriving from a node editor will try it.
13. **A frame is entered by a double press on its header, and headers only.** The header
    press already runs the move gesture under pointer capture, so no `dblclick` arrives; the
    view times `onMoveClick`, and two on the same frame within 350 ms enter it. The body
    holds live widgets, and a double press there belongs to them.
14. **A level whose instance is gone is left.** Undo and delete are global, so the instance
    a descent entry names can vanish while the author is inside it. On every structural
    notification the view re-resolves its descent entries and pops to the deepest one that
    still does.

## The look

The editor is neutral grey with one orange for selection. Groups need to read as
*containers* against that without adding a second loud color, and a level change needs to be
visible without a banner.

- **A group instance's frame** carries a 3 px accent stripe down its left edge in
  `GroupAccent` and a header tinted `GroupHeaderBG`, a cooler grey than a plain node's. Its
  header tooltip says what it is and how to enter it. Nothing else on the frame changes; its
  body is the forwarded rows it already shows.
- **The proxy nodes** inside a definition take `ProxyHeaderBG` and a final row that is a
  dropdown labelled *Add input…* or *Add output…*, listing the registered socket types. That
  row is the only structural control on a proxy; a socket is removed from the designer.
- **The breadcrumb** becomes a trail rather than a row of buttons: `Graph ▸ ink wash ▸
  kernel`, each crumb a plain text button, the last one set in `CrumbActiveFont`, separators
  in the crumb font at reduced opacity. After the trail sits one pill naming the level:
  *definition · edits reach every instance* in `LevelDefinitionColor`, or *instance · values
  only* in `LevelInstanceColor` with an *edit the definition* text button beside it. The root
  shows no pill. The whole row is `CrumbBG`.
- **The level band.** Off the root, the pan/zoom canvas gets a 2 px inset outline in the
  level's color. It sits at the edges, so it says where you are without competing with the
  frames.
- Theme keys, all with defaults in `scripts/core/theme.ts`: `nodeframe.GroupAccent`,
  `nodeframe.GroupHeaderBG`, `nodeframe.ProxyHeaderBG`; `nodegraphview.CrumbBG`,
  `nodegraphview.CrumbFont`, `nodegraphview.CrumbActiveFont`,
  `nodegraphview.LevelDefinitionColor`, `nodegraphview.LevelInstanceColor`. Declared in
  each widget's `define().theme` so `gen:themes --strict` covers them.
- **The designer panel** is three headed lists — Inputs, Outputs, Exposed — built with
  path.ux containers rather than raw DOM. An input or output row is its name, its socket
  type in the socket font, and ✕. An exposed row is its label, ↑ ↓ ✕, and a *missing*
  flag in `ErrorColor` with *Repoint…* where the target is gone. Under each list a single
  control adds: *Add input…* / *Add output…* (socket type dropdown, then a name box),
  *Expose…* (a menu of the definition's inner nodes, each a submenu of that node's props
  plus *whole node*). Nothing asks for an id.
- Every control carries a `description` or `title`.

## Stages

Every stage is one commit, green under `pnpm run typecheck` (which covers the example app),
`pnpm run test` and `pnpm run format:check`, with tests beside the existing graph and editor
tests.

### Stage G1 — grouping and ungrouping, as pure graph operations

Files: `scripts/graph/grouping.ts` (new), `scripts/graph/group.ts`, `scripts/graph/graph.ts`,
`scripts/graph/index.ts`, `tests/graph_grouping.test.ts`.

- `groupPlan(graph, ids)` → `{ nodes, inputs, outputs } | { refusal }`. The refusals, each a
  sentence: no node named; a proxy node in the selection ("the group's own input and output
  nodes stay where they are"); the graph refuses structural edits; an id the graph does not
  hold. `inputs` and `outputs` are the derived boundary of decision 5, with the source or
  destination sockets each entry stands for, so a caller can show the plan before acting.
- `createGroup(graph, ids, ref)` → `{ def, node }`, performing decision 4: capture the
  internal and crossing links, remove the nodes, add them to a new `GroupDef.subgraph`
  with ids kept, remake the internal links, declare the boundary from the plan and wire the
  proxies, place the input proxy left of the nodes' bounds and the output proxy right of
  them, add a `GroupNode` at the bounds' centre, `setDefinition`, `syncToDefinition`, and
  reconnect the crossing links to the instance's boundary sockets. `dissolveGroup(def,
  node, graph, edges)` is its inverse for undo: the same node objects back into `graph`.
- `ungroup(graph, node)` → `{ nodes, idMap }`, performing decision 6, positioned so the
  inlined nodes' bounds centre on where the instance stood.
- The definition edits as functions over a `GroupDef` (decision 7): `exposeEntry(def,
  entry, at?)`, `reorderEntry(def, from, to)`, `repointEntry(def, index, nodeId, key?)`,
  `removeEntry(def, index)`, `addBoundary(def, dir, key, socketType)` → the proxy socket,
  and `removeBoundary(def, dir, key)` → the inner links it severed, each answering a
  refusal sentence for a bad index, an unknown socket type, a duplicate key, or a key not
  on the boundary.
- `cloneNode(node)` → a JSON-round-trip copy with `NO_ID`, carrying a group's ref,
  subgraph, overrides and definition; `DuplicateNodeOp` and the desktop app's own
  duplicate decision both use it.
- `GroupNode.syncToDefinition()` public; `_resolveGroup` calls it.
- `GroupNode.graphDef().uiName` becomes a callback answering the `ref` when it is set, so a
  fresh instance is titled by its definition rather than "Group"; a rename still wins.
- `Graph.newGroupRef?: () => string` (decision 3).

Tests: the boundary derivation on the spec's `P → G.a, G.x → Q, Q → G.b, G.y → R` shape
built flat and then grouped; one outside output feeding two selected inputs of different
names and types yields one group input named and typed by the first in selection order; a
key collision suffixes; each refusal; ids survive into the definition; the instance starts
with no `wasSet`; the flattened `sort()` of the grouped graph visits the same node types in
the same order as the flat graph; ungroup of an instance with an override inlines the
overridden value and leaves the instance object intact; ungroup reallocates a colliding
numeric id and suffixes a colliding string id; group-then-ungroup round-trips the topology;
each definition function mutates as named and refuses as named.

### Stage G2 — the ToolOps and the delegate

Files: `scripts/graph/graph_ops.ts`, `scripts/graph/dsl.ts`,
`scripts/editors/nodeeditor/delegate.ts`, `scripts/editors/nodeeditor/nodeeditor.ts`,
`scripts/editors/nodeeditor/addmenu.ts`, `tests/graph_ops.test.ts`,
`tests/nodeeditor_edit.test.ts`.

- `CreateGroupOp` (`graph.create_group`: `graphPath`, `storePath`, `nodeIds` JSON, `ref`;
  output `nodeId`) and `UngroupOp` (`graph.ungroup`: `graphPath`, `nodeId`; output
  `nodeIds`), per decisions 3 and 7, both selecting what they produced through
  `ctx.selectNodes`. Redo reuses the recorded ids and the held `GroupDef`.
- `DuplicateNodeOp` (`graph.duplicate_node`), decision 10.
- `AddNodeOp` gains `ref` (decision 11).
- The six definition ops of decision 8, each wrapping its G1 function.
  `RemoveGroupSocketOp`'s undo re-declares the socket and remakes the inner links it
  severed; the instances' side is reconciliation's job.
- `GraphEdit` gains `createGroup {nodeIds, ref?}`, `ungroup {nodeId}`,
  `addBoundary {dir, key, socketType}` and `removeBoundary {dir, key}`; the exposure kinds
  lose `ref` and `def`; `addNode` gains `ref?`. `ToolOpDelegate.check` judges each (a
  `createGroup` against `groupPlan`'s refusal; every definition kind against
  `definitionOfSubgraph`; the boundary kinds against the socket registry too); `perform`
  dispatches the ops. `_performExposure` and the `groupSaver` call in it are deleted.
- `NodeEditor._renderDesigner` dispatches against `view.graphPath` rather than `_rootPath`,
  since the ops now find the definition through the path; the existing designer test is
  rewritten to mount `def.subgraph` at its own root member and to assert undo rather than a
  saver call. This keeps the shipped designer working between G2 and G3.
- `buildGraphFromDSL` reads an optional `group` string on a node entry and sets it as the
  `ref` of a `GroupNode` entry; a `group` on any other type is diagnosed `unknown-prop`.
  The caller still decides whether `GroupNode` is in the `nodeTypes` it hands over. This is
  the one DSL change the desktop plan needs, and it belongs here because `GroupNode` is
  this library's.
- `addGroupMenuTemplate(refs, onPick)` beside `addNodeMenuTemplate`.

Tests: each op mutates and undoes through a `ToolStack`, including a redo after undo; after
`CreateGroupOp`'s undo the definition's subgraph holds only its proxies and after redo it
holds the nodes again with the same `GroupDef` object; the duplicate of a synced instance
carries `ref`, its definition and an override; every definition op refuses on a root graph
and on an instance subgraph; the delegate's `check` for `createGroup` carries the plan's
refusal sentence and for a definition kind on a root graph refuses; a DSL entry
`{type: "GroupNode", group: "g"}` builds an instance with that ref.

### Stage G3 — levels: the view enters a definition

Files: `scripts/editors/nodeeditor/nodegraphview.ts`, `nodeframe.ts`, `nodeeditor.ts`,
`scripts/graph/group.ts` (the `definition` API member), `scripts/core/theme.ts`,
`example/editors/nodeeditor/nodeeditor_tab.ts`, `example/api/api_define.ts`,
`example/core/context.ts`, `example/editors/nodeeditor/demo_nodes.ts`,
`tests/nodeeditor_view.test.ts`, `tests/graph_api.test.ts`.

- `DescentEntry = { nodeId: GraphId; into: "instance" | "definition" }`; `descent`,
  `NodeGraphViewState.descent`, `currentGraph`, `currentGraphPath` and the crumbs follow it.
  `NodeEditor.STRUCT` stores each entry JSON-encoded through `_structDescent()`; `loadSTRUCT`
  reads a bare id from an older file as an instance entry.
- `enterDefinition(node)`, `enterInstance(node)` (the old `descendInto`), `exitLevel()`,
  `popTo(depth)`, and `currentLevel()` answering `{ kind, node?, ref?, def? }`. A level
  change dispatches a `levelchange` DOM event on the view, per the DOM-events direction in
  CLAUDE.md; `NodeEditor` listens to it to redraw the designer. Decision 14's re-resolve of
  the descent on each structural notification.
- `groupSelected()`, `ungroupSelected()`, `addGroupAt(ref, at?)`, `hotkeys()` (decision
  12). `ungroupSelected` over several groups runs inside `singleUndoStep`.
- Decision 9's save-and-resolve pass with its topology signature, `pendingResolve`, and
  decision 11's resolve on a root-level notification.
- `NodeFrame` reports header presses through the existing `onMoveClick`; the view times
  them (decision 13) and enters a group frame's definition. The group and proxy frame
  styling and the crumb trail, the level pill and the level band of [The look](#the-look),
  with the theme keys declared and defaulted.
- The frame context menu gains Edit Group, Show Instance and Ungroup on a group frame, and
  Group Selected on any frame while something is selected.
- `NodeEditor` drops `editDefinition`, `_designing` and `_rootPath`; the designer renders for
  `view.currentLevel()` when it is a definition, dispatching against `currentGraphPath`.
  `onOpenDefinition` is removed from the view; the instance pill's button calls
  `enterDefinition` on the instance being shown, which replaces the last descent entry.
- The example app's call sites move in the same commit, because `pnpm run typecheck` covers
  them: `nodeeditor_tab.ts` stops setting `onOpenDefinition` and calling `editDefinition`,
  the `demogroup` mount leaves `api_define.ts` and `context.ts`, and `DEMO_GROUP_DEF_PATH`
  goes with it. The example's menu and keymap work stays in G5.

Tests (headless, the way `nodeeditor_view.test.ts` builds a view): entering a definition
resolves `currentGraph` to `def.subgraph` and `currentGraphPath` to `...nodes[3].definition`;
the datapath `graph.nodes[3].definition.nodes[7].props['bias'].value` reads and writes the
definition's value and leaves the instance's copy alone until the resolve pass; a structural
op inside a definition, awaited through `pendingResolve`, reconciles the instance; a move
inside a definition runs no pass and `exitLevel` afterwards does; `exitLevel` from a
definition after a property write runs the pass; deleting the instance a level rests on
pops the view to the root; a view state round-trips through `getViewState`/`setViewState`
with mixed entries and through `_structDescent`/`loadSTRUCT`, including the old bare-id
form; `hotkeys()` names the five keys; Tab with one group selected enters its definition
and with none selected leaves; two `onMoveClick`s on a group frame within the window enter
it and two slower ones do not.

### Stage G4 — the group designer, rebuilt

Files: `scripts/editors/nodeeditor/groupui.ts`, `nodeframe.ts`, `nodeeditor.ts`,
`tests/nodeeditor_edit.test.ts`.

- `buildGroupDesigner` rebuilt to [The look](#the-look): the three lists over path.ux
  containers, every mutation an edit through the delegate, re-rendered on `levelchange` and
  on the definition path's watch.
- The proxy frames' *Add input…* / *Add output…* row, built in `buildExtraUI` for
  `GroupInputNode`/`GroupOutputNode` frames when the frame sits in a definition level (the
  view passes a `level` to the frame builder), dispatching `addBoundary`.
- A prop row inside a definition offers *Expose on group* from its context menu, dispatching
  `exposeEntry` for that node and key. The view installs the handler on `propEditRow`'s
  container when the frame's graph is a definition.

Tests: the designer renders one row per entry with the right label and flag; ↑ ↓ ✕ dispatch
the matching edits through a recording delegate; the add-input control dispatches
`addBoundary` with the chosen socket type; an expose from a prop row names the node and the
key; a missing entry offers Repoint and nothing else.

### Stage G5 — the example app

Files: `example/editors/nodeeditor/nodeeditor_tab.ts`, `demo_nodes.ts`,
`example/editors/menu/menu.ts`, `documentation/NodeEditor.md`, `todos.md`.

- `makeDemoGraph` sets `newGroupRef` counting against `demoGroupDefs`.
- The tab's keymap comes from `view.hotkeys()`; its Add dropdown gains a Group ▸ submenu
  from `addGroupMenuTemplate([...demoGroupDefs.keys()], …)`.
- Edit ▸ Create Group (Ctrl+G), Ungroup (Ctrl+Alt+G), Edit Group (Tab), Exit Group, each
  reaching the active `NodeEditorTab` through `Area.getActiveArea` and reporting through
  `ctx.report` when no node editor is active. The menu entries carry tooltips.
- `NodeEditor.md`: the Groups, Group descent, delegate and editor-Area sections rewritten
  for levels, the new ops table rows, the pure functions, the theme keys, the three store
  seams, and the example walkthrough without `editDefinition`. The `todos.md`
  delete-hotkey item is closed by `hotkeys()`.
- Verified live over CDP (`pnpm electron`, `pnpm cdp screenshot`): select two demo nodes,
  Ctrl+G, see the instance with its derived boundary; Tab into it; add an input from the
  proxy row; expose a prop from its row; leave; see the instance's new row; Ctrl+Alt+G;
  undo through all of it.

## Verification

- The three root gates per stage, plus an example build for G5.
- `pnpm run gen:themes --strict && pnpm run typecheck:themes` after G3, since it adds keys.
- The barrel rule in CLAUDE.md: `grouping.ts` is re-exported from `scripts/graph/index.ts`
  deliberately, and nothing else new reaches `pathux.ts`.

## Deliberately cut

- Renaming a boundary socket (decision 8) and reordering the boundary.
- Dragging a link onto an empty slot on a proxy node to create a socket. The dropdown row
  is the route; the drop target is a follow-on once the row has been used.
- A display name on `GroupDef`. The ref is the name; an instance's `label` renames one
  instance.
- Removing a definition from the store, and any `groupDeleter` seam.
- Resolving the nested instances inside an instance's copied subgraph (decision 1).
- Copy and paste across graphs, and an undo-history UI, as before.

## Pressure test

Run 2026-09-04 by a fresh-context agent against the first draft. Twenty-one findings; each
is folded in above or answered here. Two more came from the desktop plan's own review and
are folded in the same way.

- Blockers. G3 broke `pnpm run typecheck`, which covers the example app: the example
  call-site edits moved into G3. `dblclick` never reaches a header under the move gesture's
  pointer capture: decision 13 times `onMoveClick` instead. Decision 6 claimed `Graph.add`
  reallocates ids, contradicting the verified list: ungroup now resets numeric ids and
  suffixes colliding string ids.
- Should-fix, folded in: ungroup copies rather than moves (decision 6); `CreateGroupOp`
  holds its `GroupDef` and undo empties it in the store (decision 7); `storePath` and the
  nested save order (decision 3); the duplicate is given its definition directly and
  root-level notifications resolve unresolved refs (decisions 10, 11); G2 re-points
  `_renderDesigner` and rewrites its test; the exposure kinds drop `ref` and `def`
  (decision 8); the pass is exposed as `pendingResolve` and ends with a root notification
  (decision 9); the shared-source boundary is keyed by the first inner socket in selection
  order (decision 5); the research doc is cited by the commit that deleted it (decision 1).
- Notes, folded in: the dotted STRUCT member path and the unresolved-instance case
  (decision 2); a stranded level (decision 14); a nested instance's missing definition
  (decision 1, cut); "orphaned" rather than "severed" (decision 8); Tab only in the active
  area (decision 12); the STRUCT round trip tested through `_structDescent`/`loadSTRUCT`;
  the pass also runs on view removal (decision 9); `GraphContext` imported from the
  delegate module.
- From the desktop review: the definition edits had no pure form a host without a
  toolstack could call, so G1 now carries them as functions and the ops wrap them
  (decision 7); the pass ran per drag frame inside a definition, which in the desktop app
  meant a file round trip per frame, so it now keys on topology and leaves moves to the
  exit (decision 9), which also answers the per-move rebuild cost the first review noted.
