# Plan: node graph and node editor

Status: **draft, pressure-tested**. Implements the design in
[documentation/research/nodeEditor.md](../research/nodeEditor.md). Every design decision in
that document is settled input; this plan only decides implementation order, file placement,
and how to unblock the pieces the spec names as unbuilt.

This plan covers the library: properties, sockets, nodes, graph, groups, DSL, ToolOps and
the data API. The editor view (the pan/zoom container, the `NodeEditor` area, and the
example-app integration that exercises it) is planned separately in
[node-editor-view.md](node-editor-view.md). The master task list spanning both is
[node-editor-tasklist.md](node-editor-tasklist.md).

Each stage below is one commit, green on its own under `pnpm run typecheck`,
`pnpm run test` and `pnpm run format:check`. No stage depends on a later one to compile.

## Ground realities the plan is built on

These were verified against the code, not taken from the spec's summary of it.

- **`eventdag` is load-bearing inside `UIBase` and stays untouched.** `ui_base.ts:1108`
  registers every widget class as a `NodeCapable` via `EventNode.register`, `_init` calls
  `EventNode.init(this)` (ui_base.ts:1314), and the update loop drives the global
  `theEventGraph` (ui_base.ts:1232, 3699). `EventGraph` also owns an execution queue
  (`queueExec`/`exec`) — exactly the thing the new library deliberately does not have. The
  new graph therefore **sits beside** `eventdag`, in path.ux proper rather than in the
  path-controller submodule. Generalizing `eventdag` would mean giving the new `Graph` an
  exec loop it is specified not to own, and replacing it would mean rewriting `UIBase`'s
  update plumbing for no functional gain. `eventdag.ts` gets a doc comment pointing at the
  new module so the two are not mistaken for duplicates.
- **`equals()` gaps are exactly:** `FloatArrayProperty` (toolprop.ts:716) and
  `ArrayBufferProperty` (toolprop.ts:856) inherit the base-class throw (toolprop.ts:432);
  `Curve1DProperty.equals` (curve1d_toolprop.ts:43) returns `false` unconditionally, which
  is worse than a throw for reconciliation — it silently reports every curve as an override.
  All other subclasses either implement it or inherit a real implementation
  (`ReportProperty` via `StringPropertyBase`, `IntProperty`/`FloatProperty` via
  `_NumberPropertyBase`).
- **nstructjs is the real npm package**, re-exported from
  `scripts/path-controller/util/nstructjs.ts`. JSON mode (`writeJSON`/`readJSON`) is already
  exercised by `scripts/simple/file.ts`, and `abstract(Base, "type")` is available.
  `ToolProperty` is registered (toolprop.ts:714) and serializes `wasSet` (toolprop.ts:711).
- **Tests are vitest files in the top-level `tests/` directory**, including DOM widget tests
  (`ui_listbox.test.ts` and friends), so editor-side behavior is unit-testable there too.
- **Editor-side ground realities live in the view plan.** Area registration semantics,
  `DragBox`, the overdraw layer, the two `graphpack` copies, and the absence of a pan/zoom
  container are documented in [node-editor-view.md](node-editor-view.md), with the stages
  that consume them. Nothing in stages 1–7 touches the screen system.
- **Optional STRUCT fields use the `?:` form.** nstructjs 0.8.7 supports `field ?: type`
  (and `optional(type)`), which round-trips an `undefined` field as JSON `null` and reads it
  back as `undefined`. No existing STRUCT in this codebase uses it — the precedent
  (ToolProperty.STRUCT, toolprop.ts:692–712) handles absence with `| fallback` sentinel
  expressions, which bake the sentinel into the file format. Every optional field in this
  plan (`defaultProp`, `label`, and the like) uses `?:`, never a sentinel; a plain
  `abstract()` field that is `undefined` at write time throws, so this is load-bearing.
- **New graph exports go out under a namespace.** `pathux.ts` re-exports the graph module as
  `export * as nodegraph from "./graph/..."`, following the existing `controller`/`platform`
  namespace precedent, because a bare `export { Node }` from the package entry shadows DOM's
  `Node` for consumers. Collision-free editor-side names are decided in the view plan.
  This is decided up front because the export form is expensive to change once consumers
  exist.
- **Only stage 1 touches the submodule.** Everything else lives under path.ux proper
  (`scripts/graph/`, `scripts/widgets/`, `scripts/editors/`), which imports from
  path-controller freely — `ui_base.ts` already does. Stage 1's submodule commit and the
  parent gitlink bump land together, per the submodule policy in CLAUDE.md; since
  path-controller sits on its default branch, committing it is confirmed with the user
  before it happens.

## Where the blocked pieces get unblocked

The spec names three things that do not exist yet. Each is assigned to a stage:

1. **Missing `equals()` implementations** → stage 1, before anything reads them.
2. **The datapath that descends into a group instance** → stage 7. Concrete design:
   `GroupNode.defineAPI` declares its instance subgraph as a `DataList` (per-key
   `getStruct` callback, controller_base.ts:514, resolving each inner node's struct through
   `api.mapStruct` — heterogeneous lists are the documented use of that callback), so paths
   like `nodes[5].group.nodes[3].props['scale'].value` compose from existing machinery with no new
   controller feature. Sparse overrides are handled at the property leaf with `customGetSet`
   (controller.ts:282): the getter resolves instance-override-else-definition, the setter
   materializes the property on the instance (which sets `wasSet`) and writes it. Nested
   groups recurse for free because the inner `GroupNode`'s struct declares the same list.
3. **The pan/zoom container** → the view plan's first stage, as a standalone widget landed
   before the editor that needs it, with its coordinate math split out pure so vitest
   covers it.

## Stage 1 — `equals()` completions (path-controller submodule)

Files: `scripts/path-controller/toolsys/toolprop.ts`,
`scripts/path-controller/curve/curve1d_toolprop.ts`, `tests/toolprop_equals.test.ts` (parent
repo).

Public surface:

- `FloatArrayProperty.equals(b)` — length plus elementwise `===` over `value`.
- `ArrayBufferProperty.equals(b)` — `byteLength` plus bytewise compare through `Uint8Array`
  views.
- `Curve1DProperty.equals(b)` — compares the two curves' authored state by
  `nstructjs.writeJSON` of `data`, replacing the unconditional `false`. JSON mode is the
  comparison, not the storage, so derived fields never enter it; if profiling later shows
  this hot in reconciliation, a `Curve1D.calcHashKey` is the follow-up, not part of this
  stage.

Tests assert: equal and unequal arrays/buffers/curves compare correctly; `equals` never
mutates `wasSet`; every registered property class in `PropClasses` plus
`customPropertyTypes` either overrides `equals` or inherits an override (a registry sweep,
so a future property class missing `equals` fails a named test instead of throwing during a
group sync).

This is the one submodule commit; the parent commit bumps the gitlink and adds the test.

## Stage 2 — sockets

Files: `scripts/graph/graph_types.ts` (shared `GraphId`, flags, small interfaces),
`scripts/graph/socket.ts`, `scripts/graph/sockets_std.ts`, export additions in
`scripts/pathux.ts`, `tests/graph_socket.test.ts`.

Public surface: `NodeSocketBase<Type, Value, CTX>` exactly as specced —
`socketId`, `type`, `dir`, private `value` (TypeScript `private`, not `#private`, so
nstructjs can assign it), `defaultProp?: ToolProperty`, `getValue`, `setValue`, `edges`,
`multiSocket`, `reduce?`, `isDirty`, `coerce(b, {dryRun})`, `canCoerceTo(type)`,
`resolvedEdges()`, `resolveSource()`, `flagDirty`/`clearDirty`, `color`, `owningNode`,
`copyTo`/`copy`, `static defineAPI`, `createUI` (a `container.prop(path)` call against the
default). `createUI` and `defineAPI` land here because they are part of the spec's class
shape, but they are inert until stage 7 wires the datapath that reaches a socket — the
stage-2 commit says so in a doc comment, and stage 2's tests deliberately do not exercise
them. Plus `registerSocketType(cls)` following `CurveTypeData.register`
(curve1d_base.ts:91–96): `typeName` presence is checked always; the `typeName === cls.name`
equality is a dev-build assert only, because `cls.name` is mangled in a minified build —
the very situation the typeName convention exists to survive. And two stock types that
exercise coercion in both dispatch directions: `FloatSocket` and `Vec3Socket`
(float→vec3 splat answered by the destination, vec3→float answered by the source's
`canCoerceTo`).

Design notes pinned here so the code cannot drift from them:

- `Node` does not exist yet. `owningNode` is typed against a minimal `ISocketOwner`
  interface in `graph_types.ts` (`id`, `flagDirty()`, `graph`), which `Node` implements in
  stage 3. That is what lets this stage compile and test alone.
- `resolvedEdges()` is implemented on the base as a walk that asks each edge for
  `resolveProxy(): NodeSocketBase[] | undefined` — base returns `undefined` (meaning "I am
  the endpoint"). Group proxies override it in stage 5. The walk carries the visit stamp (a
  module-level integer bumped per pass), so a malformed proxy chain terminates.
- Dirty propagation: `setValue`/`flagDirty` on an output walks `resolvedEdges()` and flags
  the connected inputs, and nothing else — per the spec, input→output dirtiness within a
  node is the client's knowledge.
- Serialization lands with the socket: STRUCT writes `socketId`, `type` string, `dir`,
  `multiSocket`, and `defaultProp ?: abstract(ToolProperty)` (the `?:` optional form — see
  ground realities). Edges are **not**
  written by the socket — links are graph-level `(nodeId, socketKey)` pairs, stage 4.
  Registration goes through `nstructjs.inlineRegister` like `FloatArrayProperty`
  (toolprop.ts:717).

Tests assert: unconnected input with `defaultProp` returns the default; unconnected input
without one returns `undefined`; connected input pulls through the edge; coercion resolves
by double dispatch and `dryRun` performs no write; a multi-connected input reduces;
`resolveSource` names the source without valuing it; output `setValue` dirties downstream
inputs and a propagation over a cyclic edge set terminates (stamp check); socket
JSON round-trips with its `defaultProp` intact; `registerSocketType` refuses a mismatched
`typeName`; dev-mode asserts fire for `defaultProp` on an output and `setValue` on an input.

## Stage 3 — nodes and the type registry

Files: `scripts/graph/node.ts`, `scripts/pathux.ts` exports, `tests/graph_node.test.ts`.

Public surface: `NodeDef` (with `uiName`/`description`/`icon` as constant-or-callback),
`Node<Inputs, Outputs>` per the spec (`inputs`, `outputs`, `props`, `label?`, `id`, `graph`,
`pos`, `size`, `dirty`, `flagDirty`, `getUIName`/`getDescription`/`getIcon`,
`static defineAPI`, `createUI`), a static `graphDef(): NodeDef` following the
`ToolOp.tooldef()` merge-with-parent pattern, and `registerNodeType(cls)` with the same
presence-always, equality-in-dev typeName check as stage 2. The constructor copies the
definition's sockets onto the instance the way `EventNode`'s constructor walks the
prototype chain (eventdag.ts:201–234), and subscribes each property's `"change"` callback
to `flagDirty()`, so a property edit dirties its node without polling — the wiring the spec
lists as available machinery lives here, with the node that owns the props.

One invariant pinned here:

- **A props record key equals its property's `apiname`.** The STRUCT grammar has no map
  type, so `props` serializes as a plain `array(abstract(ToolProperty))` and the record is
  rebuilt from each property's own `apiname` (already written by ToolProperty.STRUCT,
  toolprop.ts:695) — no KV wrapper struct. Node construction asserts the invariant, and
  stage 5's reconciliation diffs by the same key.

Serialization lands with the node: STRUCT writes `id`, the type discriminator (via
`abstract(Node, "type")` at the graph level), `label ?: string`, `pos`, `size`, `props` as
`array(abstract(ToolProperty))` per the invariant above, a per-node-type `typeVersion`, and
the actual socket lists (nodes that create sockets dynamically cannot rebuild them from the
type). `loadSTRUCT` reconciles sockets against `graphDef()`: a definition socket absent from
the file is created at its default; a file socket absent from the definition is kept,
flagged orphaned, per the spec. Drop-and-warn on any subobject that is not a
`NodeSocketBase`/`ToolProperty`, following `Curve1D.loadSTRUCT` (curve1d.ts:503).

Tests assert: constructor materializes def sockets with correct `dir` and ownership;
subclass defs merge with parent defs; name resolution precedence (label → callback →
constant) including a callback reading a mode property; registry refuses a `typeName` that
does not match the class name; JSON round trip preserves props (including `wasSet`) and the
socket reconciliation behaviors (default-filled, orphan-kept, garbage-dropped-with-warning).

## Stage 4 — graph and sort

Files: `scripts/graph/graph.ts`, `scripts/pathux.ts` exports, `tests/graph_sort.test.ts`.

Public surface: `Graph` per the spec — `nodes`, `nodeIdMap`, `dirtyNodes`, `add`, `remove`,
`connect(sockA, sockB)` / `disconnect`, `flagSortDirty()`, and
`sort(): { order: Node[]; cycles: Node[][] }`. Ids are allocated per graph from a serialized
counter, never globally (the spec requires subgraphs to serialize standalone).
`connect` refuses an edge between sockets whose owning nodes belong to different graphs.
The sort is iterative (explicit stack, no recursion — graphs are user-sized), computes a
topological order and reports strongly connected components via Tarjan rather than
`eventdag`'s log-and-continue two-tag scheme, and is cached until `flagSortDirty()`. Group
expansion is not in this stage; `sort` gains it in stage 5 through a hook that this stage
lands as identity (`expandNode(node): Node[]` returning `[node]`).

Serialization lands with the graph: STRUCT writes the id counter, `nodes` as
`array(abstract(Node))`, and `links` as flat `(nodeId, socketKey, nodeId, socketKey)`
records. A `socketKey` is the socket's record key in `outputs` (first pair) or `inputs`
(second pair) — direction is implied by position in the link, which is what
disambiguates a node carrying an input and an output under the same key. Stage 3's
orphan-socket reconciliation keeps a socket's record key stable, so links survive it.
`loadSTRUCT` carries a `VERSION: float` with the sequential-patch convention,
rebuilds `nodeIdMap`, re-links sockets from the link records (dropping and warning on a link
naming a missing endpoint), and re-establishes `owningNode`/`graph` backreferences.

Tests assert: order respects edges on a chain and a diamond; two disjoint islands both
appear; a 2-cycle and a 3-cycle come back as components while the acyclic remainder is still
ordered; the cached order is reused until `connect`/`remove`/`flagSortDirty` invalidates it;
cross-graph `connect` refuses; a full JSON round trip reproduces edges, ids, and sorts to
the same order; a link naming a deleted node is dropped with a warning, not a throw.

## Stage 5 — groups

Files: `scripts/graph/group.ts`, edits to `graph.ts` (sort expansion hook, dirty bubbling)
and `socket.ts` (nothing new — proxies use the stage-2 `resolveProxy` seam),
`scripts/pathux.ts` exports, `tests/graph_group.test.ts`.

Public surface:

- `GroupDef`: the definition's subgraph, its boundary socket declarations, the ordered
  `exposed: ExposedEntry[]` list, and `contentHash` — a hash (via `util.HashDigest`) over
  the definition's authored state serialized in JSON mode, computed on demand and after
  edits, never stored as truth.
- `GroupInputNode` / `GroupOutputNode`: real proxy nodes in the subgraph; their sockets
  override `resolveProxy` to return the sockets on the far side of the boundary, which is
  the single step that makes `resolvedEdges`, dirty propagation and the flattened sort all
  cross the boundary with no group-specific branches elsewhere.
- `GroupNode extends Node`: holds the instance subgraph (physical copies of the
  definition's inner nodes, ids copied from the definition), the definition reference
  string, the `syncedHash` it last reconciled to, and sparse `props`. Its `graphDef()`
  boundary sockets come from the resolved definition.
- `Graph.groupLoader?: (ref: string) => Promise<GroupDef | undefined>` and
  `Graph.resolveGroups(): Promise<GroupResolveReport>`, with the registry keyed by ref
  string holding completed **and in-flight** loads (mutual file references re-enter and must
  get the pending promise), recursion into loaded definitions, keep-on-later-failure, and a
  depth check over the chain of group definitions (not files) that reports a self-containing
  group and leaves its instances unsynced. Any resolution pass that reconciled an instance
  (added or removed inner nodes, re-linked boundary sockets) calls `flagSortDirty()` on the
  owning graph, so the stage-4 cached order cannot outlive a sync.
- Reconciliation: diff inner nodes by id; copy metadata down unconditionally via
  `ToolProperty.copyTo`; copy values down only where `!wasSet`, compared with `equals` on
  values per the spec's sparse-override rule; hooks
  `onDefChanged(diff)` / `onSocketAdded` / `onSocketRemoved` / `onInnerNodeRemoved` with the
  coarse one calling the fine ones; a definition socket removed while connected in the
  parent becomes an orphaned, error-flagged socket by default.
- Structural protection seam: `Graph.structuralEditsRefused(): string | undefined` returns
  the refusal sentence on an instance subgraph. Stage 7's ToolOps consult it; landing it
  here keeps the invariant with the thing it protects.
- Sort expansion: `expandNode` on a `GroupNode` returns its inner client nodes recursively,
  proxies excluded; `flagSortDirty` on an instance subgraph bubbles to the owning graph.

Serialization lands with the group: a `GroupNode` writes its ref string, `syncedHash`, its
sparse props, and its instance subgraph (a `Graph`, which stage 4 already serializes
standalone). `GroupDef` gets its own STRUCT here too — its subgraph, boundary socket
declarations, and the `ExposedEntry` list, entries kept even when their target is absent,
with the unresolved-versus-missing state derived at UI time rather than stored.
Persisting an edited definition is the client's, mirroring loading: a
`graph.groupSaver?: (ref: string, def: GroupDef) => Promise<void>` seam beside
`groupLoader`, which the view plan's designer panel calls after an edit. The library never
decides where a ref string points.

Tests assert: the spec's acyclicity example — `P → G.a`, `G.x → Q`, `Q → G.b`, `G.y → R`
sorts flat with no cycle and the flattened order contains no proxies and no group nodes;
dirtying an output feeding `G.a` dirties the consumer inside the instance; reconciliation
against a bumped definition updates un-overridden values, preserves a `wasSet` override, and
fires the hooks with the right diff; a removed-but-connected boundary socket survives as a
flagged orphan; `resolveGroups` with a stub loader map degrades on a missing ref (graph
still sorts), terminates on mutual refs, keeps an earlier definition when a later run fails,
and refuses a group that instantiates itself (directly and through an intermediate);
creating the self-containing arrangement is also refused at link time, not only during
resolution, per the spec's two-checkpoint rule;
`structuralEditsRefused()` answers on an instance subgraph and not on a definition's; a
group instance JSON round-trips unsynced and reconciles identically after load.

## Stage 6 — the LLM DSL validator

Files: `scripts/graph/dsl.ts`, `scripts/pathux.ts` exports, `tests/graph_dsl.test.ts`.

Public surface: `validateGraphDSL(input, registries): Diagnostic[]` and
`buildGraphFromDSL(input, registries): { graph: Graph; diagnostics: Diagnostic[] }`, both
taking the same `{nodeTypes, socketTypes}` registries (the builder instantiates from them),
over the flat
`nodes: [{id, type, props}]` / `links: [[fromNode, "outSocket", toNode, "inSocket"]]`
format. Diagnostics carry a code, a message naming the offending entry, and the path to it;
nothing throws. Unrecognized props and links are dropped and reported, matching the
drop-and-warn convention.

Tests assert: a valid description builds a graph that sorts; an unknown node type, a link to
a nonexistent socket, a prop value failing the property's own parse, and a link creating a
type mismatch with no coercion each produce one named diagnostic; the builder still returns
the salvageable graph alongside the diagnostics.

## Stage 7 — ToolOps and the data API

Files: `scripts/graph/graph_ops.ts`, `scripts/graph/graph_api.ts`, `scripts/pathux.ts`
exports, `tests/graph_ops.test.ts`, `tests/graph_api.test.ts`.

Public surface:

- Ops, all `ToolOp` subclasses with typed property slots: `AddNodeOp`, `DeleteNodeOp`,
  `ConnectOp`, `DisconnectOp`, `MoveNodeOp`, `RenameNodeOp`, `ReplaceNodeOp`, and one
  generic `SetNodePropOp` addressing `(graphPath, nodeId, propKey)` — authored state being
  uniformly `ToolProperty` is what lets one op cover every node type. `ReplaceNodeOp`
  swaps a node for a new type, re-links compatible sockets by key, and repoints the
  definition's `ExposedEntry` items that named the old node — the spec assigns repointing
  to the replace operation because it is the only point holding both nodes at once.
  Structural ops call `structuralEditsRefused()` in `canRun` and surface the sentence, so
  the editor shows the reason (`MoveNodeOp` is structural on an instance per the spec:
  layout belongs to the definition).
- `SetNodePropOp` on a group instance's sparse property records whether the property was
  materialized (and its prior `wasSet`) before running, and its undo restores that state —
  undoing the first edit of a forwarded property dematerializes it. This cannot ride the
  generic write-the-old-value-back undo, because writing the old value through the
  `customGetSet` leaf re-materializes with `wasSet = true` (toolprop.ts:569 sets it
  unconditionally), leaving the instance permanently overridden at the definition's value.
- `defineAPI` wiring: the graph's node list is a `DataList` whose per-key `getStruct`
  resolves each node's struct by type; a node's struct is generated from its `props` list
  (each `ToolProperty` already carries its UI metadata) plus its input sockets' defaults;
  the group-instance descent works as described in "Where the blocked pieces get unblocked"
  above — `DataList` recursion for structure, leaf `customGetSet` for sparse-override
  materialization. Name/description/icon resolvers are exposed through `customGet` and stay
  cheap, since `dataPathPolling` polls them.

Tests assert: each op mutates and undoes correctly through the tool stack; every structural
op refuses on an instance subgraph with the refusal sentence and `SetNodePropOp` does not; a
datapath into `nodes[i].props[...]` reads and writes; a datapath through a group node into
an inner node's property reads the definition's value while unmaterialized, and a write
through it materializes the override (`wasSet` true, definition object untouched); undoing
the first edit of a forwarded property dematerializes it (`wasSet` false again, reads
resolve to the definition); `ReplaceNodeOp` repoints exposure entries and its undo restores
them; a two-level nested group resolves one level deeper along the same path shape.

## The editor view

The pan/zoom container and the editor itself (view, editing gestures, group designer panel,
and an example-app tab that exercises it all) are planned in
[node-editor-view.md](node-editor-view.md). Its stages depend on stages 5 and 7 here and on
nothing else; stages 1–7 do not depend on it.

## What is deliberately not in this plan

- No evaluation engine, no `exec` — the spec excludes it.
- No binary nstructjs mode commitment beyond what STRUCT scripts give for free; JSON mode is
  the tested path, matching `simple/file.ts`.
- No changes to `eventdag` beyond the pointer comment (stage 2's commit carries it).
- No editor — the view plan owns it, including the pan/zoom container.
- Undo history UI, copy/paste between graphs, and a stock socket library beyond
  `FloatSocket`/`Vec3Socket` are follow-ons; the registration seams they need all land here.

## Review findings and answers

A fresh-context reviewer attacked the draft on 2026-08-24. It first verified the
load-bearing claims independently: the eventdag analysis, the `equals()` gap inventory,
nstructjs `abstract()` working in JSON mode (by execution), tsconfig/rollup needing no
config edits for the new directories, vitest running `tests/**` under happy-dom, quoted
string subscripts in datapaths, `Vector2`'s registered STRUCT, and the absence of a `Node`
name collision inside the library. Fifteen findings came back; all were accepted and folded
in. None were rejected. The review ran while the editor stages (then numbered 8–10) still
lived in this file; findings naming those stages now resolve into
[node-editor-view.md](node-editor-view.md), and the stage numbers below are kept as the
review used them. The record:

1. **Nullable STRUCT fields were assumed without a mechanism** — a bare `abstract()` field
   that is `undefined` throws at write time. Answered: the `?:` optional form is named as
   the mechanism in ground realities, explicitly rejecting the codebase's sentinel-fallback
   precedent for these fields.
2. **"Keyed pairs" for `props` named no encoding** (STRUCT has no map type). Answered:
   plain `array(abstract(ToolProperty))` with the record rebuilt from `apiname`, and the
   key ≡ `apiname` invariant stated and asserted in stage 3.
3. **`socketKey` in links was undefined** and a bare key cannot identify a socket when a
   node has an input and output under one key. Answered in stage 4: record key with
   direction implied by link position, and key stability under orphan reconciliation
   stated.
4. **Undo of a materializing write was unspecified**, and the generic
   write-old-value-back undo re-materializes with `wasSet = true`, permanently overriding.
   Answered in stage 7: `SetNodePropOp` records prior materialization state, undo
   dematerializes, with a test.
5. **The cited typeName check is a presence check, not equality** (curve1d_base.ts:91–96),
   and strict equality false-fails minified. Answered in stages 2–3: presence always,
   equality as a dev-build assert.
6. **Wrong `graphpack` copy cited** — two near-identical copies exist and only the
   path-controller one is re-exported. Answered in ground realities and stage 10.
7. **Node replacement repointing exposure entries had no home** despite the spec assigning
   it to the replace operation. Answered: `ReplaceNodeOp` added to stage 7, used by
   stage 10.
8. **`GroupDef` had no STRUCT and no persistence path**, though stage 10 edits
   definitions. Answered in stage 5: `GroupDef` gets a STRUCT, and a client-owned
   `groupSaver` seam mirrors `groupLoader`.
9. **Stage 2's `createUI`/`defineAPI` are dead until stage 7.** Answered: kept in stage 2
   as part of the spec's class shape, with the inert-until-stage-7 status stated in the
   plan and in a doc comment on the commit.
10. **`resolveGroups` reconciliation never invalidated the cached sort.** Answered in
    stage 5: a reconciling pass calls `flagSortDirty()`.
11. **`buildGraphFromDSL` lacked the registries parameter** its validator takes. Answered
    in stage 6: both take the same `registries`.
12. **Link-time self-containment refusal was untested** (only the resolve-time path was).
    Answered in stage 5's test list.
13. **happy-dom has no working 2D canvas**, which would kill stage 9's editor-construction
    tests. Answered in stage 9: `linkcanvas.ts` tolerates a null context.
14. **Property-change → node-dirty wiring was unassigned** despite the spec listing the
    callback machinery. Answered in stage 3: the node constructor subscribes its props'
    `"change"` callbacks to `flagDirty()`.
15. **The pathux.ts export form was undecided**, and `export { Node }` shadows DOM's
    `Node` for consumers. Answered in ground realities: graph exports go out as a
    `nodegraph` namespace; collision-free editor names export bare.
