# Node editor

A general node graph and node editor for path.ux, with user-definable and clonable node
groups. Intended for shader graphs, image composition graphs, procedural generation graphs,
and similar workflows.

The library owns graph structure, sockets, typed connections, dirty tracking, topological
sorting, serialization and the editor. It does not own evaluation. Clients decide what
running a graph means.

## Contents

- [Scope](#scope)
- [Authored state and derived state](#authored-state-and-derived-state)
- [Sockets](#sockets)
- [Node properties](#node-properties)
- [Names, descriptions and icons](#names-descriptions-and-icons)
- [Nodes](#nodes)
- [Graph](#graph)
- [Groups](#groups)
  - [Definitions can live in other files](#definitions-can-live-in-other-files)
  - [An instance's structure belongs to the definition](#an-instances-structure-belongs-to-the-definition)
  - [What a group instance shows](#what-a-group-instance-shows)
- [Serialization](#serialization)
- [Nodes authored by an LLM](#nodes-authored-by-an-llm)
- [Undo](#undo)
- [The editor](#the-editor)
- [Existing code to build on](#existing-code-to-build-on)
- [Open questions](#open-questions)

## Scope

Nodes have no `exec` method. The graph provides a topological sort and dirty tracking; the
client walks the resulting order and decides how to evaluate each node. This keeps push
evaluation, lazy pull, and compilation to another representation all equally available, and
it keeps the graph free of any execution context.

Two consequences follow. `Graph` needs no context type parameter, since the only remaining
use for one is `createUI`, which belongs to `Node`. And the graph exposes a dirty node set
for the client to drain rather than an execution entry point.

Cycles are permitted structurally. `sort()` reports them instead of throwing, and a client
with a cyclic graph supplies its own solver.

## Authored state and derived state

Every field on a node or socket is one of two kinds, and the distinction decides how it is
stored, serialized and reconciled.

Authored state is small, edited by the user, diffable, serialized, and can be overridden on
a group instance. It is held as a `ToolProperty`.

Derived state is computed: caches, results, image buffers, meshes. It is whatever the client
wants, is never diffed, and is never serialized. It is rebuilt on demand.

Group reconciliation only ever touches the authored half, which is what makes it tractable.

## Sockets

A socket is a typed, directed graph connection. An unconnected input socket takes its value
from an editable default; the default's UI is hidden while the socket is connected.

Output sockets store values. Input sockets do not: an input resolves its value through its
edge on demand. Direction-dependent behavior is free to branch on `dir` wherever it is
natural. The rule against conditionals applies to socket _types_, not to direction.

```ts
type GraphId = number | string;

class NodeSocketBase<
  Type extends string = string,
  Value = unknown,
  CTX extends IContextBase = IContextBase,
> {
  socketId: GraphId;
  type: Type;
  dir: "in" | "out";

  /** Derived, output sockets only. Written by the client, read through `getValue`. */
  private value: Value;

  /** Authored, input sockets only. `undefined` means no editable default. */
  defaultProp?: ToolProperty;

  /**
   * On an output, the stored value. On an input, the value resolved through the edge:
   * coerced from the source, reduced when multi-connected, or the default when unconnected.
   * Returns undefined on an unconnected input whose type has no default.
   */
  getValue(): Value | undefined;

  /** Output sockets only. Stores the value and dirties the inputs connected to it. */
  setValue(value: Value): void;

  edges: NodeSocketBase[];

  /** True by default on output sockets, false by default on input sockets. */
  multiSocket: boolean;

  /** Combines the incoming values on a multi-connected input socket. */
  reduce?(values: Value[]): Value;

  isDirty: boolean;

  /** Loads the coerced value from `b`, or reports whether coercion is possible. */
  coerce(b: NodeSocketBase, options?: { dryRun?: boolean }): boolean;

  /** Reports whether this socket's value can be converted to `type`. */
  canCoerceTo(type: string): boolean;

  /** Edges with group proxies resolved away. */
  resolvedEdges(): NodeSocketBase[];

  /** The socket or default an input's value comes from, without resolving the value. */
  resolveSource(): NodeSocketBase | ToolProperty | undefined;

  flagDirty(): void;
  clearDirty(): void;

  color: Color;
  owningNode: Node;

  copyTo(b: this): void;
  copy(): this;

  static defineAPI(api: DataAPI, st: DataStruct): void;

  /** UI for editing the default value. */
  createUI(container: Container<CTX>): void;
}
```

### Reading a value

`getValue` on an input socket applies the four rules that decide what an input carries:
follow `resolvedEdges()` through any group proxies to the source, coerce the source's type to
this socket's type, reduce when multi-connected, and fall back to `defaultProp` when
unconnected. Shipping this in the library keeps every client from reimplementing socket
semantics, and it is the reason input sockets need no value storage at all.

`getValue` returns a value rather than storing one, so it does not assume an evaluation model.
A push client calls it per input and keeps the result; a lazy client calls it on demand; a
client compiling the graph to another representation ignores it and uses `resolveSource`
instead, which performs the same traversal without the value handling — enough to emit an
unconnected input's default as a constant and to name a connected input's source.

Coercion runs per read rather than per propagation, which is free for a scalar and expensive
for a large buffer. `isDirty` is the invalidation signal: an input may memoize its coerced
value while clean and recompute when dirty. Where the source and destination types match there
is nothing to memoize, because the source's value is returned directly.

`setValue` exists on output sockets only. It stores the value and dirties the inputs connected
to it, since that hop is the one propagation the library owns and leaving it to the client
makes a forgotten call a silent staleness bug. A client that recomputes and gets the same
answer skips the call rather than suppressing the propagation.

### Coercion

Coercion resolves by double dispatch: ask the destination socket first, and fall back to
asking the source whether it can convert to the destination's type. A new socket type then
ships knowing only about itself, instead of requiring an edit to every existing socket's
`coerce`. No socket type is named in a conditional anywhere in the library. Branching on
`dir` is a separate matter and is allowed.

### Socket defaults

A socket's default value is a `ToolProperty`, so it serializes, diffs, carries its own UI
metadata, and participates in group override tracking on the same terms as a node property.
`createUI` becomes a `container.prop(path)` call rather than hand-written UI per socket type.

A socket type with no meaningful editable default (a mesh socket, an image socket) leaves
`defaultProp` undefined. That is a supported state meaning "no default UI", and `getValue`
returns undefined for an unconnected socket of such a type.

An output socket's value is not a `ToolProperty`. It is derived state and may be large.

`defaultProp` is meaningful on input sockets only, and a stored value on output sockets only.
Both are worth asserting against in development builds, since they are the two ways a socket
gets used against the grain of its direction.

### Dirty propagation

Clients flag output sockets dirty, either directly or by calling `setValue`. The only
propagation the library performs is from an output socket to the input sockets connected to
it. An input socket does not automatically dirty its owning node's outputs, because only the
client knows which outputs depend on which inputs.

On an input socket, dirty means the socket's memoized coerced value is stale, since an input
stores no value of its own.

Propagation walks `resolvedEdges()`, which is what carries dirtiness across a group boundary
without the group node forwarding anything. Propagation carries a visit stamp (an integer
bumped per pass, not a `Set`) so that a cyclic graph, or a malformed group whose proxies
resolve back to themselves, terminates.

## Node properties

Authored node state is a keyed collection of `ToolProperty` instances. The property system
already supplies most of what the graph needs:

- `wasSet` (`toolprop.ts:232`, set in `setValue` at line 569, and serialized at line 711)
  distinguishes an inherited value from one the user changed. Group reconciliation depends on
  it, and it already persists across save and load.
- `equals()` per subclass makes an instance diffable against its definition.
- Every subclass registers with nstructjs via `inlineRegister`, and the base is registered at
  line 714, so `abstract(ToolProperty, "type")` serializes a heterogeneous property list.
- `ToolProperty.register()` and `customPropertyTypes` (lines 318 and 390) let a client add
  property types, so client-defined node state is still open-ended.
- Property `callbacks` fire `"change"`, so a property edit can flag its node dirty without
  polling.
- UI metadata (`uiname`, `description`, `icon`, `range`, `unit`, `step`, `subtype`) travels
  with the property, so node UI and tooltips come from the property list, and a node type's
  `defineAPI` can be generated from that list rather than written per type.

`ToolProperty.equals` throws on the base class (`toolprop.ts:432`) and is implemented per
subclass. `FloatArrayProperty` and `ArrayBufferProperty` appear to lack an implementation.
Both need one before group reconciliation can rely on `equals`, since the failure mode is a
throw during a sync rather than a wrong answer.

### Sparse overrides

A `ToolProperty` carries enough metadata that instantiating one per property per node is too
expensive at graph scale. So a group definition holds the property objects, and a group
instance materializes a property only when it has been overridden. `wasSet` decides which,
so the same field serves override tracking and storage sparseness.

Diff on the property's value, never on the whole property object. `copyTo`
(`toolprop.ts:573`) copies `uiname`, `description`, `icon`, flags and callbacks and leaves
the value to subclasses, so comparing whole objects would report a definition's retitled
tooltip as a user override.

## Names, descriptions and icons

Three distinct things, resolved through one path:

1. A per-type constant, held on `NodeDef`, with no instance storage.
2. A per-type derived value, such as a Math node reading "Add" or "Multiply" from its mode
   property. A stored copy of this goes stale whenever the underlying state changes, so it is
   computed rather than stored.
3. A per-instance name the user typed in the editor. This is authored state and serializes.

`NodeDef` therefore holds a union, and the callback lives on the definition rather than on
the instance:

```ts
interface NodeDef {
  typeName: string;
  uiName: string | ((node: Node) => string);
  description: string | ((node: Node) => string);
  icon: Icons | ((node: Node) => Icons);
  color: Color;
  size: Vector2;
  inputs: Sockets;
  outputs: Sockets;
}
```

A node resolves all three through one method each, so the editor, tooltips, the add-node
search menu and group nodes share a single resolution point:

```ts
getUIName(): string {
  return this.label ?? resolveDefValue(this.def.uiName, this)
}
```

Precedence is: the user's rename, then a definition callback, then a definition constant.
A group instance's name resolves to the group definition's name until the user renames the
instance, with no group-specific code.

The callback sits on the definition rather than on the instance because a function field on
an instance costs a slot on every node, cannot be serialized, and does not compose with
inheritance. Definitions are never serialized, so a function on one raises no load-time
questions. A definition-level callback also lets a client relabel a stock node type at
registration time without subclassing it.

These resolvers are reached from the datapath layer through `customGetSet`, and
`UIBase.dataPathPolling` defaults to `true`, so they are polled on the update cadence. They
must be cheap and free of side effects. A client needing an expensive label caches it and
invalidates on change.

## Nodes

```ts
class Node<Inputs extends Sockets = Sockets, Outputs extends Sockets = Sockets> {
  inputs: Inputs;
  outputs: Outputs;

  /** Authored properties, sparse on a group instance. */
  props: Record<string, ToolProperty>;

  /** The user's rename, absent until the user renames this node. */
  label?: string;

  id: GraphId;
  graph: Graph;
  pos: Vector2;
  size: Vector2;

  dirty: boolean;

  flagDirty(): void;

  getUIName(): string;
  getDescription(): string;
  getIcon(): Icons;

  static defineAPI(api: DataAPI, st: DataStruct): void;
  createUI<CTX extends IContextBase>(container: Container<CTX>): void;
}
```

A node type's definition is static and is not the instance's base class. A `NodeDef` describes
a type; making `Node extends NodeDef` would put a copy of every descriptive field on every
instance, free to drift from the type. It also does not compile: TypeScript forbids a static
member from referencing its class's type parameters, so `static nodeDef: NodeDef<Inputs,
Outputs>` is an error. The definition is returned by a static method declaring its own
generics, following the `ToolOp.tooldef()` pattern, which also supplies the
merge-with-parent-class behavior definitions need.

The constructor copies the definition's sockets onto the instance, as `EventNode` already
does in `eventdag.ts`.

Node type registration validates that the definition's `typeName` matches the class name, the
way `CurveTypeData.register` does at `curve1d_base.ts:81`. The check exists because a
hand-written name string breaks under minification.

## Graph

```ts
class Graph {
  nodes: Node[];
  nodeIdMap: Map<GraphId, Node>;
  dirtyNodes: Set<Node>;

  add(node: Node): void;
  remove(node: Node): void;

  flagSortDirty(): void;

  /** Topological order, plus any strongly connected components found. */
  sort(): { order: Node[]; cycles: Node[][] };
}
```

`sort()` reports cycles rather than refusing to return, so a client with its own cyclic
solver receives the components it needs to solve. A client wanting the strict behavior checks
that `cycles` is empty.

The returned order is flattened across group boundaries and contains no group nodes and no
group proxies. See below.

The order is cached in memory and recomputed when `flagSortDirty()` is called, as `EventGraph`
already does with its `sortlist` and resort flag. It is never serialized: it is derived state,
and sorting is cheap enough that rebuilding it costs less than keeping a stored copy honest.

A structural change inside a group instance invalidates the order of every graph that expands
it, so `flagSortDirty()` on a subgraph bubbles to the graph owning the group node.

`connect()` refuses an edge between nodes belonging to different graphs. All traffic across a
group boundary passes through proxy sockets.

## Groups

A group is a subgraph that can be instanced. Users create input and output sockets for the
group node, and the group's designer picks which of the inner nodes' properties appear on the
group node itself.

### Instances are physical

A group instance owns real, distinct node objects, instantiated inside the group node.
Serialization requires this, and it has a second benefit: every node in an expanded graph is a
unique object, so a flattened sort order is a plain `Node[]`. A shared-definition design would
have needed instance paths or evaluation frames to tell two instances of the same group apart.

### Proxies are transparent

The subgraph contains real GroupInput and GroupOutput proxy nodes. They are what the user
edits and what serializes. Sockets expose `resolvedEdges()`, which walks through a proxy to
whatever lies on the other side of the boundary.

One resolution step then serves the flattened sort, the client's value pull, and dirty
propagation, instead of each growing a group branch. Because the flattened order contains only
client node types, a client's evaluator never meets a proxy it does not know how to run —
which matters now that the library has no `exec` to hide a passthrough behind.

### Groups are expanded in the sort, not present in the tree

`graph.nodes` does not contain a group's inner nodes. The topological sort expands a group
node into its inner nodes in place.

The expansion is a true flattening rather than splicing the group's inner order in as one
block. Collapsing a group to a single sort unit invents cycles that do not exist: if group `G`
has an output `x` depending only on input `a`, and an output `y` depending only on input `b`,
then `P → G.a`, `G.x → Q`, `Q → G.b`, `G.y → R` is acyclic when expanded and cyclic when `G`
is one node.

Node ids are unique within their owning graph only, so a subgraph serializes and copies
standalone. Nothing looks up a node by a bare id across a group boundary.

### Definitions can live in other files

A group instance references its definition by a string rather than embedding it, so one
definition is shared across files and a library of groups is possible. The library never
parses that string. A client may use a file path, a path with a fragment, a uuid, or anything
else, which is what lets one client keep a single group per file and another keep several.

The client supplies the loader, since only it knows how a reference maps to storage:

```ts
graph.groupLoader = async (ref: string): Promise<GroupDef | undefined> => { ... }

/** Loads every referenced definition and reconciles the instances against it. */
await graph.resolveGroups(): Promise<GroupResolveReport>
```

Resolution is a deferred pass rather than part of deserialization. Reading another file is
asynchronous and `readJSON` is not, so a graph loads with its instances unsynced and the
client calls `resolveGroups()` afterwards. Anything assuming a fully synced graph runs after
that call, not after load. It is re-runnable, since a definition can change on disk.

`resolveGroups` reports what it could not load rather than throwing, matching the degradation
below. It recurses, because a loaded definition may contain group instances of its own, and it
holds loaded definitions in a registry keyed by the reference string so two instances share one
definition object.

A later run that fails to load a definition an earlier run resolved keeps the definition it
already has and reports the failure. Discarding it would throw away a working group because a
file was momentarily unreadable.

The registry also keys in-flight loads, not just completed ones. Two files may reference each
other's definitions, so a load can re-enter — resolving A needs B, which needs A — and
returning the pending promise is what keeps that from deadlocking or loading twice.

Mutual file references are allowed. Only cycles among actual nodes are refused, so the depth
check walks the chain of group definitions rather than the files holding them. A file-level
cycle with no group instantiating itself is a legal arrangement.

Physical instantiation pays off here. An instance already owns a working copy of every inner
node, so a missing, unreadable or not-yet-resolved definition degrades to an instance that
cannot sync rather than a graph that fails to load. The editor reports it; the graph still
sorts and evaluates.

A monotonic `defVersion` is not sufficient across files, since two people can advance the same
definition independently. The version is a content hash of the definition's authored state,
which also avoids a false sync when a definition is edited back to an identical state.

Recursion checking cannot be confined to link time once definitions are external, because a
cycle can run through a file that was not loaded when the link was made. The depth check runs
again during `resolveGroups`, and a cycle found then leaves the instances in place and unsynced
with an error for the editor to show.

### An instance's structure belongs to the definition

A group instance cannot be edited structurally. Adding or removing an inner node, linking or
unlinking an inner socket, and moving a node are all refused on an instance's subgraph. Layout
belongs to the definition too, so instances of one group are arranged identically.

Property values are the only thing an instance carries of its own, which is what keeps
reconciliation tractable: a diff only ever compares values, and never has to decide what to do
with an inner node one instance has and the definition does not.

The structural `ToolOp`s enforce this by refusing when their target graph belongs to an
instance, and the refusal says so, so the editor can show the reason rather than a control
that quietly does nothing. The editor can descend into an instance to look at it, and offers
opening the definition as the way to change anything.

### What a group instance shows

A group instance's property values are editable. The group's designer chooses which of the
inner nodes' properties are forwarded into the instance's own UI, an entry at a time rather
than a node at a time.

This controls presentation only. It is not a write restriction: a client may let a user
override any property on any node inside an instance, whether or not it is forwarded. Exposure
is authored on the definition; overriding happens on the instance and is recorded by `wasSet`.
The two are orthogonal, and forwarding a property does not materialize it on the instance —
editing it does.

The definition holds one ordered list, whose entries are either a property or a whole node's
UI:

```ts
type ExposedEntry =
  | { kind: "prop"; nodeId: GraphId; propKey: string; label?: string }
  | { kind: "nodeUI"; nodeId: GraphId };
```

A list rather than a flag on each property, because the instance UI needs a deliberate order
and a set of flags has none. It is also one thing to serialize and one thing to reconcile. The
optional `label` lets a definition present an inner property under a name that makes sense
from outside.

The `nodeUI` kind exists for a node whose `createUI` is hand-written and indivisible — a curve
widget or a color ramp cannot be decomposed into property entries. Keeping both kinds in one
ordered list is what preserves ordering across a mixture of the two. "Expose everything on this
node" is an editor convenience that appends property entries, not a third kind.

Nesting composes without special handling: an entry naming an inner group node forwards that
group's own forwarded UI outward.

Building this UI requires a datapath that descends into a group. Inner nodes are absent from
`graph.nodes`, so the API must reach them through the group node for `container.prop(path)` to
address an inner property at all. That is a requirement on the `defineAPI` design, not a
detail of the editor.

#### An entry that names nothing

An entry whose target is absent is skipped when the UI is built and kept in the definition,
never pruned. Which of two states it is in decides what the designer sees:

- Unresolved: the target may exist, but the definition holding it has not loaded. Nothing is
  shown, and nothing is reported.
- Missing: resolution finished and the target is genuinely gone. The entry is flagged broken
  for the designer.

The distinction is load-bearing rather than cosmetic. Resolution is asynchronous and recursive,
so an entry naming a property inside a nested group is indistinguishable from a deleted one
until that group resolves. Pruning on absence would delete a designer's work whenever a load
was slow, and permanently once the definition was saved.

Entries break in bulk when an inner node is replaced rather than deleted, since every entry
naming it breaks at once. Replacing a node therefore repoints the entries that named it: the
replace operation is the only point in the system holding both the old node and the new one,
and doing it there turns the common case into no work at all. An entry may also be repointed
by hand, which keeps its place in the order where deleting and re-adding would append it to the
end. Deletion remains correct for a target that was genuinely removed.

Repairs are contained, because an entry belongs to the definition rather than to its instances.
Fixing one fixes every file instancing that group, including files nobody has open.

### When a group definition changes

Inner nodes carry ids assigned in the definition and copied into instances, so an instance is
diffed against its definition by id rather than by position. An instance records the version
hash it last synced to and reconciles lazily.

Reconciliation copies metadata down unconditionally and copies a property's value down only
where `!wasSet`, so a user's edits on an instance survive a definition change.

Derived classes override reconciliation through one coarse hook whose default implementation
calls the finer ones:

```ts
onDefChanged(diff: GroupDiff): void   // default calls the three below
onSocketAdded(socket: NodeSocketBase): void
onSocketRemoved(socket: NodeSocketBase): void
onInnerNodeRemoved(node: Node): void
```

The coarse hook exists because a subclass usually needs to see a whole change at once, which
is exactly when fine-grained-only hooks fail it.

A socket that disappears from the definition while still connected in the parent has no good
default. Dropping the link silently loses user work, and keeping a dangling socket hides the
problem. The default keeps it as an orphaned socket flagged for the editor to show as an
error; `onSocketRemoved` overrides that.

A group cannot contain itself. Link-time depth checking refuses it.

## Serialization

nstructjs JSON mode, with `writeJSON` and `readJSON`.

Serialized fields use TypeScript's `private` keyword rather than an ES `#private` field.
nstructjs assigns with computed property access (`obj[f.name] = …`, `nstructjs.js:3892`),
which cannot reach a `#private` field; a TypeScript `private` is an ordinary property at
runtime and loads normally.

A socket writes its id, type, links and `defaultProp`. Values are never written: an output's
value is derived state, and an input has no value of its own to write.

Polymorphic nodes, sockets and properties use `abstract(Base, "type")`, which writes a
discriminator into the JSON object. Links are written as `(nodeId, socketKey)` pairs rather
than object references, since ids survive migration where pointers do not; the
`field : type | expr` STRUCT form writes a computed id in place of a reference.

Migration follows the convention in `Curve1D.loadSTRUCT` (`curve1d.ts:503`): a `VERSION: float`
field, sequential `if (this.VERSION < X)` patches, dropping and warning on any subobject that
is not an instance of the expected base, then re-establishing owner backreferences. Node types
version independently of the file, because they come from client applications, so a node type
carries its own version alongside the graph's.

Nodes that create sockets dynamically at runtime cannot have their socket list reconstructed
from their type. The actual socket set is written per node, and reconciled on load: a socket
present in the definition but absent from the file takes its default, and a socket present in
the file but absent from the definition is kept as an orphan flagged for the editor, matching
the group-reconciliation rule above.

## Nodes authored by an LLM

A model emits a flat DSL, not nstructjs JSON:

```
nodes: [{id, type, props}]
links: [[fromNode, "outSocket", toNode, "inSocket"]]
```

It costs a fraction of the tokens, it validates against the node and socket type registries
with real diagnostics rather than a parse failure, and it decouples the format a model writes
from the serialization format, which will change. The validator returns a diagnostic list
rather than throwing, so a model can repair its own output. Reuse the drop-and-warn validation
that `Curve1D.loadSTRUCT` already performs on unrecognized subobjects.

## Undo

Every graph mutation is a `ToolOp`: add node, remove node, link, unlink, move, set property,
rename. Because authored state is uniformly `ToolProperty`, one generic property-setting op
covers all node types rather than one op per type.

## The editor

The editor registers as an `Editor` subclass, alongside the others in `scripts/simple/`.

Node bodies are real path.ux `Container`s in a CSS-transformed pane, not shapes drawn on a
canvas. `createUI(container)` and the group feature's hoisting of inner node UI both require
real widgets; a canvas would mean reimplementing every widget for in-node use. `DragBox`
(`scripts/widgets/dragbox.ts:85`) is already a draggable `Container` and is the closest
starting point.

Links are drawn on a canvas underlay. `CanvasOverdraw` and `Overdraw`
(`scripts/util/ScreenOverdraw.ts`) are the layer for a link drag in progress.

There is no pan and zoom transform container in the library yet; `Curve1DWidget` does its own
zoom by hand in canvas space. That piece has to be built either way.

`graphPack` and `graphGetIslands` (`scripts/path-controller/util/graphpack.ts`) provide
force-directed layout for auto-arrange.

Because the editor can descend into a group, it holds a current-graph pointer and shows a
breadcrumb.

## Existing code to build on

- `scripts/path-controller/dag/eventdag.ts` — an event and dependency graph with the same
  shape: `EventSocket` (`edges`, `connect`, `disconnect`, `flagUpdate`, `copy`,
  `static socketDef`), `EventNode` (`inputs`/`outputs` records, `addSocket`,
  `static graphNodeDef`, a constructor that copies the definition's sockets onto the
  instance), and `EventGraph` with `nodeIdMap`, `sortlist`, and a topological `sort()` that
  detects cycles with two sort tags. It carries values but has no typed sockets, no coercion
  and no serialization. Read it before starting, either to generalize or to diverge from
  deliberately.
- `DataList`'s per-key `getStruct(api, list, key)` callback
  (`controller_base.ts:514`) returns a different `DataStruct` per key, which is how a
  heterogeneous node list gets per-node-type API definitions with no special casing.
  `DataStruct.dynamicStruct` (`controller.ts:238`) resolves a struct at access time.
- `CurveTypeData.register` (`curve1d_base.ts:63`) — the type registry pattern, including the
  minification-safe `typeName` check.
- `Curve1D.loadSTRUCT` (`curve1d.ts:503`) — the versioned migration and drop-and-warn
  validation convention.
- `Curve1DWidget` (`scripts/widgets/ui_curvewidget.ts`) — canvas creation, DPI handling and a
  draw transform inside a widget.

## Open questions

None outstanding. Two things are decided but unbuilt, and are where implementation is most
likely to discover something: the datapath that descends into a group instance, which forwarded
UI depends on entirely, and the pan and zoom container the editor needs and the library does
not yet have.
