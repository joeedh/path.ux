# Node editor

The node-graph system has two layers. The graph module (`scripts/graph/`,
exported from `pathux.js` as the `nodegraph` namespace) is the headless data
model: node and socket types, the graph itself, groups, serialization, a
validation DSL, ToolOps and a data-API binding. It imports nothing from the
DOM, so an Electron main process or a CLI can build and evaluate graphs with
it. The editor layer (`scripts/editors/nodeeditor/`) renders a graph:
`NodeGraphView` (custom element `nodegraphview-x`) is a hostable widget any
container can embed, and `NodeEditor` (custom element `node-editor-x`) wraps
one view in an `Area` shell. The library ships `NodeEditor` unregistered — a
consumer that wants it as a screen editor calls `Area.register` itself.

<!-- toc -->

- [Quick start](#quick-start)
- [Defining node types](#defining-node-types)
  * [Definition merging](#definition-merging)
  * [Node properties](#node-properties)
- [Sockets](#sockets)
  * [Value resolution](#value-resolution)
  * [Multi-link inputs and reduce](#multi-link-inputs-and-reduce)
  * [Coercion](#coercion)
  * [Writing a socket type](#writing-a-socket-type)
- [The graph](#the-graph)
  * [Links](#links)
  * [Evaluation order](#evaluation-order)
- [Groups](#groups)
  * [Definitions and instances](#definitions-and-instances)
  * [The loader and saver seams](#the-loader-and-saver-seams)
  * [Exposed UI](#exposed-ui)
- [The graph DSL](#the-graph-dsl)
- [The data API](#the-data-api)
- [ToolOps](#toolops)
- [The view widget](#the-view-widget)
  * [Theming](#theming)
  * [Gestures](#gestures)
  * [Group descent](#group-descent)
  * [View state](#view-state)
- [The delegate seam](#the-delegate-seam)
- [The editor Area](#the-editor-area)
- [Registering it in an app](#registering-it-in-an-app)
- [API reference](#api-reference)
<!-- regenerate with pnpm markdown-toc -->

<!-- tocstop -->

## Quick start

```ts
import { FloatProperty, nodegraph } from "pathux.js";
const { Node, registerNodeType, FloatSocket, Graph } = nodegraph;

class ValueNode extends Node {
  static override graphDef(): nodegraph.NodeDef {
    return {
      typeName: "ValueNode",
      uiName  : (node) => `Value ${node.props.value.getValue()}`,
      props   : { value: new FloatProperty(1.0) },
      outputs : { out: new FloatSocket("out") },
    };
  }
}
registerNodeType(ValueNode);

class AddNode extends Node {
  static override graphDef(): nodegraph.NodeDef {
    return {
      typeName: "AddNode",
      inputs  : { a: new FloatSocket("in"), b: new FloatSocket("in") },
      outputs : { out: new FloatSocket("out") },
    };
  }
}
registerNodeType(AddNode);

const g = new Graph();
const v = new ValueNode();
const add = new AddNode();
g.add(v);
g.add(add);
g.connect(v.outputs.out, add.inputs.a);
```

To put a graph on screen, mount the data API, host the editor, and point it at
the graph's datapath (see [Registering it in an app](#registering-it-in-an-app)
for the full walkthrough):

```ts
const graphst = nodegraph.defineGraphAPI(api);
cstruct.struct("nodegraph", "nodegraph", "Node Graph", graphst);

class MyNodeEditor extends NodeEditor {
  init() {
    super.init();
    this.setGraph(myGraph, "nodegraph");
  }
}
Area.register(MyNodeEditor);
```

## Defining node types

A node class extends `Node` and describes itself in a static `graphDef()`,
mirroring the `ToolOp.tooldef()` pattern:

```ts
interface NodeDef {
  typeName: string; // must equal the class name
  uiName?: NodeDefValue<string>; // header label; defaults to typeName
  description?: NodeDefValue<string>;
  icon?: NodeDefValue<number>;
  color?: NodeDefValue<Color>;
  size?: Vector2;
  inputs?: Record<string, NodeSocketBase>; // socket templates, copied per instance
  outputs?: Record<string, NodeSocketBase>;
  props?: Record<string, ToolProperty>; // property templates, copied per instance
  typeVersion?: number;
}
```

`registerNodeType(cls)` adds the class to the registry the add-node menu, the
DSL and deserialization all read. It throws if `graphDef` or `typeName` is
missing, and dev builds additionally throw when `typeName` differs from the
class name — the name must survive minification, which is why it is spelled
out rather than read from `cls.name`. Registration also covers serialization:
a class without its own `STRUCT` is auto-registered with nstructjs as
`graph.<typeName>`, inheriting its nearest registered ancestor's fields, so a
plain subclass round-trips without writing STRUCT boilerplate. A class that
adds persistent fields of its own still declares its own `STRUCT`.

`NodeDefValue<T>` is either a plain value or `(node) => T`, so a label can
track live state; the quick-start `uiName` above re-renders as `value`
changes.

### Definition merging

`graphDef()` definitions merge up the class chain. Each field resolves to the
most-derived class that supplies it, and the record fields (`inputs`,
`outputs`, `props`) merge per key, so a subclass adds or overrides individual
sockets without restating its parent's. A subclass therefore declares only
what it changes.

### Node properties

`props` holds `ToolProperty` templates. Each key must equal the property's
`apiname` (the constructor throws otherwise), and every instance gets its own
copy. Property changes flag the node dirty automatically.

A socket's `defaultProp` (see [Sockets](#sockets) below) is reachable the same
way, through a `NodePropName` — an opaque string addressing one of a node's
props, input defaults, or output defaults: a bare name (`"scale"`) means a
node prop, `"in:a"` an input's default, `"out:out"` an output's default.
`Node.composePropName(type, name)` / `Node.decomposePropName(nodePropName)`
convert between the parts and the address; a socket's own `sock.nodePropName`
getter already returns its address (`` `${dir}:${name}` ``). `nodePropTarget(node,
nodePropName)` resolves an address to its `ToolProperty`, `nodePropSocket`
resolves it to a socket (`undefined` for a plain node-prop address), and
`nodePropKeys(node)` lists every address the node exposes: its own prop keys,
plus every input and output whose default is editable
(`sock.defaultIsEditable` — `useDefaultValue` and not read-only).

## Sockets

A socket is an instance of a `NodeSocketBase` subclass, created with a
direction (`"in"` or `"out"`) and living in its owning node's `inputs` or
`outputs` record. Every socket, input or output, carries a `defaultProp` — an
editable per-instance default value — which its constructor must create (see
[Writing a socket type](#writing-a-socket-type)). `registerSocketType(cls)`
registers the class for serialization and the DSL; a socket class declares a
`socketDef()` with a `typeName` (the class name) and a `type` — the wire-type
string link compatibility is judged by. Like `registerNodeType`, it
auto-registers a `graph.<typeName>` STRUCT for a class that lacks its own, so
a custom socket subclass round-trips through serialization without STRUCT
boilerplate.

### Value resolution

`getValue()` resolves through `defaultProp` on both directions when nothing
downstream has actually driven the socket, gated by `useDefaultValue` (default
`true`):

- **Output**: the stored value if `setValue(v)` has been called; otherwise
  `defaultProp`'s value when `useDefaultValue` is true, else `undefined`. This
  is what lets an output-only node (no inputs at all) still produce a
  configurable constant.
- **Input**, unconnected: `defaultProp`'s value when `useDefaultValue` is
  true, else `undefined`.
- **Input**, one link of the same wire type: the source's resolved value,
  passed through.
- **Input**, otherwise: each source value is coerced to the input's type, and
  multiple values are combined by the socket's `reduce` function.

`defaultIsEditable` (`useDefaultValue && !` read-only) additionally gates
whether the default is user-editable — an input or output frame row, and
`nodePropKeys` (see [Node properties](#node-properties)) — a socket can carry
a live default (`useDefaultValue`) without exposing it for editing.

Resolved values are memoized; `flagDirty()` invalidates the cache and
propagates downstream, flagging the owning nodes as it goes.

### Multi-link inputs and reduce

`multiSocket` controls how many links a socket accepts. It defaults to `true`
on outputs and `false` on inputs, so an ordinary input holds one link and
connecting a second replaces the first. An input with `multiSocket = true`
accepts any number of links and combines the incoming values with its
`reduce` function; a multi-link input without one resolves to the first
value.

### Coercion

Two wire types connect when either side knows a conversion, resolved by
double dispatch: the source is asked whether it converts to the destination's
wire type (`canCoerceTo` / `convertTo`), and the destination whether it
accepts the source's (the protected `canCoerceFrom` / `convertFrom`). Each
side carries only its own knowledge. The stock pair shows
the split: `Vec3Socket` accepts a float by splatting it across components
(destination-side), and converts itself to a float by averaging
(source-side) — `FloatSocket` knows nothing about vectors in either
direction. `dst.coerce(src, { dryRun: true })` answers link feasibility
without converting, and is what the editor's mid-drag verdict uses.

### Writing a socket type

```ts
class FloatSocket extends NodeSocketBase<"float", number> {
  static socketDef(): SocketTypeDef {
    return { typeName: "FloatSocket", type: "float", uiName: "Float", color: "#a1a1a1" };
  }

  constructor(dir: SocketDir = "in") {
    super(dir);
    this.defaultProp = new FloatProperty(0);
  }
}
registerSocketType(FloatSocket);
```

The constructor must create `defaultProp` unconditionally — both directions
carry one now, so an output socket can be given a configurable constant just
like an unconnected input. `sockets_std.ts` ships `FloatSocket`, `Vec3Socket`
and `StringSocket` as the stock types. `setUX(cb)` chains onto the
constructor to configure the default prop's UX metadata without a local
variable:

```ts
inputs: {
  strIn: new StringSocket("in").setUX((prop) => prop.setMultiline(true).setDescription("...")),
},
```

Set `useDefaultValue = false` on a socket that must not fall back to a
default at all (an unconnected input reads as `undefined` rather than the
prop's value), and use `setUX((prop) => prop.setReadOnly())` — reflected by
`defaultIsEditable` — for one whose default should be visible but not
user-editable. `protected mergeDefaultProp` (default `true`) controls
deserialization: when the class's constructor-created default and the loaded
socket's default are both present, the loaded value wins but the
constructor's UX metadata (ranges, tooltips, etc.) overwrites what was saved,
so a UX tweak to a socket type takes effect on old files without a version
bump.

Override `canCoerceTo`/`convertTo` (and, for destination-side knowledge,
`canCoerceFrom`/`convertFrom`) to interoperate with other wire types, and
`reduce` to combine multi-link values.

The editor asks the socket class itself to build the default's editor row:
`createUI(container, datapath, label?)` receives the container to fill and the
datapath addressing the default value (through the owning node's `props`
list, at the socket's `nodePropName` — `"in:key"` or `"out:key"`). The base
implementation calls `container.prop(datapath)`, which picks the standard
path.ux widget for the bound property type — a slider for a number, a
checkbox for a boolean, a dropdown for an enum, and so on. A socket class
carrying a custom `ToolProperty` type overrides `createUI` to build its own
widget against the same datapath.

## The graph

`Graph` holds nodes and their links. `add(node)` assigns the node an id
(numeric ids are graph-allocated; a client may assign string ids itself) and
`remove(node)` severs its links. `nodeIdMap` looks nodes up by id.

### Links

`graph.connect(a, b)` links an output to an input and accepts the two sockets
in either order. It refuses two sockets of the same direction and sockets
from different graphs, replaces the existing link when the input is
single-link, and treats an already-connected pair as a no-op.
`graph.disconnect(a, b)` removes one link.

### Evaluation order

`graph.sort()` returns `{ order, cycles }`: a topological order of the nodes
(iterative Tarjan, so deep graphs cannot overflow the stack) plus any
strongly-connected components found, reported rather than thrown. Group
instances are flattened into their subgraph's nodes, so the order is directly
executable. The result is cached until a structural change calls
`flagSortDirty()`, which bubbles through `groupOwner` so an edit inside a
group definition dirties every graph embedding it.

## Groups

### Definitions and instances

A `GroupDef` is a reusable subgraph with a declared boundary and an ordered
list of exposed UI entries. `declareInput(key, sock)` and
`declareOutput(key, sock)` add boundary sockets and return the inner proxy
socket — the one you wire to subgraph nodes:

```ts
const def = new GroupDef();
const innerIn = def.declareInput("value", new FloatSocket("in"));
const innerOut = def.declareOutput("result", new FloatSocket("out"));
def.subgraph.connect(innerIn, someNode.inputs.a);
def.subgraph.connect(someNode.outputs.out, innerOut);
```

A `GroupNode` placed in a graph references a definition by a string `ref` and
carries its own physical copy of the subgraph. Calling
`graph.resolveGroups()` loads each referenced definition through the graph's
`groupLoader` and reconciles every instance against it. The returned
`GroupResolveReport` lists what synced and what failed with a reason;
failures are reported, never thrown, and a failed reload keeps the instance's
last-known-good subgraph. A definition that would contain itself (directly or
through a chain) is refused, both at `setDefinition` and again at
`resolveGroups`.

Inside an instance's subgraph, structural edits are refused:
`graph.structuralEditsRefused()` returns the refusal sentence ("a group
instance takes value edits only; structural edits belong to the group's
definition") on an instance subgraph and `undefined` elsewhere. Value edits
remain allowed — writing a property on an inner node materializes an
instance-local override (`wasSet`), and reconciliation transplants those
overrides when the definition changes. The boundary is diffed in place, so
links from the parent graph into the group survive a definition edit that
leaves their sockets intact.

### The loader and saver seams

The graph does not know where definitions live. `graph.groupLoader =
async (ref) => GroupDef | undefined` supplies them, and `graph.groupSaver =
async (ref, def) => void` persists edits (the exposure edits below save
through it). An application backs the pair with whatever store it has; the
example app uses an in-memory `Map`.

### Exposed UI

A definition's `exposed` array names what every instance shows on its node
frame, in order. Each `ExposedEntry(kind, nodeId, propKey, label?)` is either
a `"prop"` entry (one inner node's property, rendered as an editable row) or
a `"nodeUI"` entry (an inner node's whole UI; an inner group recurses).
Writes through a forwarded row go to the instance's own subgraph, so they
materialize overrides rather than editing the definition. The editor's Group
Designer panel edits this list (expose, reorder, repoint, remove) and saves
it through `groupSaver`.

## The graph DSL

`buildGraphFromDSL(input, { nodeTypes, socketTypes })` builds a graph from a
plain-data description — the shape an LLM or a config file produces. A node
entry carries up to three separate, disambiguated value blocks — `props`,
`inputs`, `outputs` — each a plain `{ key: value }` record addressed by the
socket or prop's own key, with no `in:`/`out:` prefix and no fallback between
blocks:

```ts
const { graph, diagnostics } = buildGraphFromDSL(
  {
    nodes: [
      { id: "v1", type: "ValueNode", props: { value: 2 } },
      { id: "txt", type: "TextNode", outputs: { text: "hello" } },
      { id: "add", type: "AddNode", inputs: { b: 1.5 } },
    ],
    links: [["v1", "out", "add", "a"]],
  },
  { nodeTypes: [ValueNode, TextNode, AddNode], socketTypes: [FloatSocket, StringSocket] }
);
```

- `props` sets a value on `node.props[key]` only — a key that names a socket
  instead of a prop is diagnosed `unknown-prop`, not silently redirected.
- `inputs` sets a value on `node.inputs[key].defaultProp` only.
- `outputs` sets a value on `node.outputs[key].defaultProp` only — this is how
  a DSL-authored graph gives an output-only node (no inputs at all) a
  configurable constant, e.g. `TextNode` above.

Each key resolves within its own block, so the same key name can address a
prop, an input and an output on the same node without collision — the block
is what disambiguates it, not a prefix on the key. (`NodePropName`, the
`in:`/`out:` prefixed address used elsewhere in the graph API — see
[Node properties](#node-properties) — is an implementation detail the DSL
never surfaces; keys here are always the bare socket/prop name.)

It never throws. Every problem becomes a diagnostic with a stable code —
`bad-shape`, `duplicate-node-id`, `unknown-node-type`, `unknown-prop`,
`bad-prop-value`, `unknown-link-node`, `unknown-link-socket`,
`link-type-mismatch`, `duplicate-link`, `link-input-occupied` — and the graph
contains everything that was valid. `unknown-prop` fires per block, so its
path names which one (`nodes[2].props.b`, `nodes[2].inputs.b`, or
`nodes[2].outputs.b`) failed. When two links contend for a single-link
input, the first stated link wins and the later one is diagnosed, so the
output does not depend on entry order. `validateGraphDSL` runs the same
checks and returns only the diagnostics.

## The data API

`defineGraphAPI(api)` returns a `DataStruct` for `Graph` (idempotent per
`DataAPI`); mount it wherever your context resolves a graph:

```ts
const graphst = nodegraph.defineGraphAPI(api);
cstruct.struct("nodegraph", "nodegraph", "Node Graph", graphst);
```

The struct exposes a `nodes` list keyed by node id, and each node's struct is
built from its class's `defineAPI` on first use. The resulting datapaths:

| path                                | resolves to                                                               |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `nodegraph.nodes[3]`                | the node with id `3` (a string id is quoted: `nodes["v1"]`)               |
| `nodegraph.nodes[3].props['value'].value` | one node property's value; writing on a group-inner node materializes an override |
| `nodegraph.nodes[3].group`          | a `GroupNode`'s subgraph, itself a graph struct — the descent nests       |

## ToolOps

The graph module registers one ToolOp per structural edit, all operating
through a `graphPath` string input (node ids are passed JSON-encoded so
numeric and string ids share one input):

| toolpath              | effect                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| `graph.add_node`      | add a node of a registered type at a position                                                              |
| `graph.delete_node`   | remove a node, severing its links                                                                          |
| `graph.connect`       | link an output to an input                                                                                 |
| `graph.disconnect`    | remove one link                                                                                            |
| `graph.move_node`     | set a node's position                                                                                      |
| `graph.rename_node`   | set a node's label                                                                                         |
| `graph.replace_node`  | swap a node's type, keeping id, position, label and every link whose sockets still coerce                  |
| `graph.set_node_prop` | write a node property (build via `SetNodePropOp.create`, since the value input clones the target property) |

The structural ops share a `canRun` that consults
`structuralEditsRefused()`, so they refuse inside a group instance's
subgraph. `graph.set_node_prop` is deliberately not structural: it runs on
instance subgraphs, materializes the override, and its undo restores the
prior `wasSet` state — undoing a first-time write dematerializes the
override entirely.

## The view widget

`NodeGraphView` is the whole interactive surface: a pan/zoom container
(`PanZoomContainer`) holding one `NodeFrame` per node, a link canvas beneath
them, and a breadcrumb row above. It is a plain internally-registered widget,
so any host — an `Area`, a dialog, a dock panel — can create and embed one:

```ts
const view = UIBase.createElement("nodegraphview-x") as NodeGraphView;
view.setGraph(myGraph, "nodegraph");
```

`setGraph(graph, graphPath)` points the view at a graph; `graphPath` is the
datapath its edits dispatch against. After mutating the graph outside the
view, call `view.syncGraph()` to reconcile the frames.

Each `NodeFrame` shows the node's name in a header, one row per socket, and a
body. Every socket owns a full-width row of its own: the outputs take the rows
directly under the header, then the inputs, which is what `socketRow(node, dir,
key)` indexes and what `socketAnchor` places the terminal dots against.

An unconnected input whose socket declares a `defaultProp` carries the editor
for that default inside its own row, beside its terminal — the view supplies
the node's datapath through `frame.nodePath`. Connecting the input replaces the
editor with the socket's name, since a driven default is inert, and
disconnecting brings it back; the rows rebuild from `syncContents()` whenever
the sockets or their editors change. A node property that is not an input's
default keeps its row in the body.

Each row hosts a standard path.ux prop editor bound to the value's
`props['key'].value` datapath — `container.prop` picks the widget the bound
property type maps to, and an input default's row is built by its socket
class's `createUI`, so a custom property type brings its own widget (see
[Writing a socket type](#writing-a-socket-type)). The widgets read and write
through `ctx.api`, so edits dispatch the datapath set op and path watchers
refresh every bound row. Beneath the body's prop rows sits whatever the node's
own `createUI` override adds (the base implementation renders nothing), and a
group instance's frame shows its forwarded UI instead of prop rows (see
[Exposed UI](#exposed-ui)).

An inline editor makes its row taller than the themed `SocketRowHeight`, so
`FrameMetrics` carries the measured `rowHeights` and `socketAnchor` accumulates
them; a row the array does not cover falls back to the uniform height.

### Theming

The editor reads its colors, fonts and geometry from the theme through
`getDefault`, so an app restyles it by overriding keys in its theme file
rather than by patching CSS. Three style classes carry the keys:

- `nodeframe` — the frame geometry (`Width`, `HeaderHeight`,
  `SocketRowHeight`), the body's `background-color`, `border-color` and
  `border-radius`, the header's `HeaderBG`, the selection ring's
  `SelectOutline`, two `CSSFont`s (`DefaultText` for the header and
  `SocketText` for the socket rows), and three socket-highlight keys:
  `SocketHitExpand` (pixels the pointer hit region extends past the dot,
  independent of its drawn size), `SocketHighlightColor` (the hover ring and
  the forced ring a link drag puts on its nearest valid target) and
  `SocketErrorColor` (a host-driven error ring; nothing in path.ux itself
  sets it yet — see [Gestures](#gestures) below).
- `nodegraphview` — the box-select marquee (`BoxSelectBorder`,
  `BoxSelectBG`) and `ErrorColor`, which the editor shell passes into the
  group designer's missing-entry flag.
- `nodelinkcanvas` — `LinkColor` and `LinkWidth` for the drawn links, and
  `LinkSelectColor` / `LinkSelectWidth` for a selected one.

A socket terminal's dot keeps the color its socket type declares
(`SocketDef.color`); that is per-type identity, not theme. Each terminal is a
`TerminalDot` custom element (`nodeframe-graph-terminaldot-x`) with its own
hover highlight, independent of any drag: hovering any socket rings it in
`SocketHighlightColor`, and `SocketHitExpand` grows the pointer-accepting
area around the dot without growing what is drawn, so a small dot stays easy
to hit. `frame.terminalDot(key, dir)` returns the element so a host can drive
`.forceHighlight` (used by a link drag; see [Gestures](#gestures)) or
`.showError` directly. The add and context menus are ordinary path.ux menus,
so the `menu` style class themes them along with every other menu in the app.

### Gestures

Drag gestures run as modal ToolOps rather than as widget-held pointer state.
The view's (or pan/zoom container's) pointerdown handler spawns the op with
`ctx.toolstack.execTool(ctx, new Op(...), event)`, and the toolsys routes
pointer and keyboard events to the op until it ends. `gesture_ops.ts` holds
`NodeMoveModalOp`, `BoxSelectModalOp` and `LinkDragModalOp`; the pan gesture
is `PanZoomPanOp` in `ui_panzoom.ts`. Each carries `UndoFlags.NO_UNDO`: a
gesture that changes the document commits on release through the
[delegate](#the-delegate-seam), so the dispatched graph op
(`graph.move_node`, `graph.connect`, …) is the single undoable entry the
gesture leaves behind, and Escape cancels the gesture and restores its
preview. A client that layers a toolmode system over the editor spawns the
same ops from its toolmodes' pointerdown handlers.

- **Pan / zoom** — middle-drag, right-drag, or hold space and left-drag to
  pan; the wheel zooms. A right-drag that moved swallows the contextmenu
  event its release fires, so context menus open only on a stationary
  right-click.
- **Select** — click a frame; shift-click toggles; drag on empty canvas box-
  selects (shift extends); click on empty canvas clears both selections.
  Pressing an already-selected frame changes nothing, so the press can go on
  to drag the whole selection; the collapse-to-one (or the shift-toggle-off)
  applies on release if the press did not move. Click a link to select it —
  shift toggles — and `deleteSelected()` severs the selected links along with
  the selected nodes. `selection` holds node ids, `linkSelection` holds link
  keys, and `selectedLinks()` resolves the latter against the links on screen.
- **Move** — drag a frame's header or empty background (a press on the node's
  own widgets, an inline socket editor included, belongs to the widget). Hold
  shift to drag every selected node along with it; the group commits as one
  `moveNodes` edit, so the drag leaves a single undo entry. The delegate is
  consulted mid-drag, a refused position renders that frame at half opacity,
  and a refused drop snaps back.
- **Link** — drag from a socket terminal to a terminal on the other side;
  terminals whose connect the delegate refuses dim for the drag's duration,
  and whichever valid terminal is nearest the pointer (within
  `LINK_DROP_PX`) carries a forced highlight that follows the drag, on top
  of the dimming. Starting on a connected single-link input detaches its
  edge: an empty drop severs the link, and a drop on another input moves it.
  `TerminalDot.showError` exists as a distinct error ring a host can set on
  a dot it holds a reference to, but nothing in `LinkDrag` wires it up today
  — the drag distinguishes valid from refused targets by highlight-or-dim
  alone.
- **Add** — the add-node menu belongs to the host, which folds it into a
  menu bar, an editor header, or a context menu of its own.
  `addNodeMenuTemplate(onPick, items?)` returns the type picker as
  `MenuTemplate` entries for `container.menu` and friends,
  `buildAddNodeMenu(ctx, onPick, items?)` builds it as a standalone `Menu`,
  and `view.addNodeAt(typeName, at?)` adds a node (at the view's center when
  `at` is omitted). `view.openAddMenu(local)` starts the picker as a popup in
  search mode (a filter textbox above the list), adding at that point on
  pick. The example app puts an Add dropdown in its editor header.
- **Node menu** — right-click a frame (without dragging) for a path.ux
  `Menu` with Delete, Duplicate (keeps overridden values) and Replace (keeps
  links where sockets still coerce); Replace opens the same searchable type
  picker as Add.
- **Arrange** — `arrangeNodes()` auto-lays-out the graph with graphpack, one
  island at a time, and commits the result as a single undo entry.

`deleteSelected()` and `duplicateSelected()` act on the current selection.
`selection` is a `Set` of node ids and `linkSelection` a `Set` of link keys;
`deleteSelected()` severs the selected links and deletes the selected nodes,
while `duplicateSelected()` ignores the link selection. Both are `async` and
run inside `await view.singleUndoStep(cb, shortLabel?, message?)`, which
brackets `cb` with the delegate's `undoStepBegin`/`undoStepEnd` so every edit
a multi-node delete or duplicate dispatches lands as one undo entry rather
than one per node — `shortLabel`/`message` pass through to `undoStepBegin`
for a host delegate that names the batch (a checkpoint's commit message, for
one). `duplicateSelected()` additionally clears the selection before
dispatching and, once every duplicate exists, selects the new nodes in place
of the originals.

### Group descent

Descent starts from the host: call `descendInto(groupNode)` to show a group
instance's subgraph. The breadcrumb row tracks the descent: a Root
button, one button per group instance, and a read-only note inside an
instance (structural gestures are refused there by the delegate, with the
graph's own refusal sentence as the reason). When the host sets
`onOpenDefinition`, the breadcrumb also offers Open Definition on the
instance being viewed, and the host routes that wherever definitions are
edited — typically `NodeEditor.editDefinition`.

### View state

`getViewState()` / `setViewState(state)` capture and restore the camera and
descent stack (`{ pan, zoom, descent }`). `setViewState` is safe to call
before `init` runs; `NodeEditor` uses the pair for STRUCT persistence, so a
saved screen layout reopens on the same subgraph at the same camera.

## The delegate seam

Every mutating gesture in the view is described as data — a `GraphEdit` — and
routed through the view's `delegate`:

```ts
interface NodeGraphDelegate {
  undoStepBegin(ctx: GraphContext, shortLabel: string, message: string): Promise<void>;
  check(ctx: GraphContext, edit: GraphEdit): EditVerdict; // { ok: true } | { ok: false; reason }
  perform(ctx: GraphContext, edit: GraphEdit): void;
  undoStepEnd(ctx: GraphContext): Promise<void>;
}
```

The edit kinds are `moveNode`, `moveNodes`, `addNode`, `deleteNode`,
`duplicateNode`, `replaceNode`, `connect`, `disconnect`, `arrange`, and the four exposure
kinds (`exposeEntry`, `reorderEntry`, `repointEntry`, `removeEntry`). A
`check` verdict must match what `perform` would decide, which is what lets a
refusal show mid-gesture rather than on drop.

`GraphContext` is the view's own context, not the host's raw one: `view.ctx`
plus a fixed set of selection operations (`selectNodes`, `deselectNodes`,
`selectLinks`, `deselectLinks`, `clearSelection`, `selectAll`) that a
`ToolOp.exec` or a delegate can call regardless of what host context it was
handed. `view.graphContext` builds it once, lazily, by wrapping `view.ctx` in
a `Proxy` that intercepts those names and falls through to the real context
for everything else (including `toLocked()`, re-wrapped so a locked context
keeps the same selection ops); every call site that used to pass `ctx`
straight into `delegate.check`/`perform` now passes `view.graphContext`
instead. `AddNodeOp` selects the node it creates through this seam, which is
also how `duplicateSelected()` (see [Gestures](#gestures)) ends with the
duplicates selected. `selectSockets`/`deselectSockets` are declared on
`GraphContext` for a future per-socket selection but nothing backs them yet
— `view.graphContext` does not implement them, so calling either throws.

`undoStepBegin`/`undoStepEnd` bracket a gesture that dispatches more than one
edit (`view.singleUndoStep`, used by `deleteSelected()` and
`duplicateSelected()`), so a delegate that wants those edits to land as one
undo entry has somewhere to open and close a batch. Both hooks return a real
`Promise<void>` — a host delegate can `await` genuine async work there (for
instance, opening and closing its own command-system checkpoint) — and
`singleUndoStep`/`deleteSelected`/`duplicateSelected` are themselves `async`
because of it: `await` always defers past the current synchronous turn, even
against an already-resolved promise, so there is no way to keep these
looking synchronous once a delegate hook does real async work. While one is
in flight, `singleUndoStep` holds a modal input lock (`AsyncGateOp`) so a
second gesture can't open a competing batch before the first one closes;
`AsyncGateOp` overrides `on_keydown` to a no-op so Escape can't release that
lock mid-flight. `cb`'s own success or failure survives the lock: `cb`
throwing rejects the promise `singleUndoStep` returns, after `undoStepEnd`
still runs.

The default `ToolOpDelegate` opens a `ToolMacro` on the first nested call and
executes it on the last, wrapped in an already-resolved promise since none of
that work is actually async; `addNode`, `deleteNode`, `moveNode` and the rest
still dispatch individually outside a `singleUndoStep`, each its own undo
entry, and `arrange`/`duplicateNode` still run as their own single-edit
`ToolMacro` regardless. A host with its own command system replaces the whole
delegate and routes the same edits there instead — the view never writes the
graph itself — but every implementation now needs all four methods; two that
previously implemented only `check`/`perform` must add `undoStepBegin`/
`undoStepEnd`, even as no-ops resolving immediately, or the object no longer
satisfies `NodeGraphDelegate`. A delegate with no batched command of its own
(each dispatch is already its own atomic write, as the exposure kinds are)
can leave both as `async` no-ops.

## The editor Area

`NodeEditor` is a thin `Area` shell around one view: a header, the view
filling the center, and a Group Designer dock panel. The library ships it
unregistered; a consumer subclasses or registers it directly (see below).

- `setGraph(graph, graphPath)` forwards to the view and records the root path
  exposure edits dispatch against.
- `editDefinition(ref, def, defPath)` points the view at a group definition's
  subgraph for structural editing and shows the definition's exposure list in
  the Group Designer. `defPath` must resolve to `def.subgraph` in the host's
  data API.
- The Group Designer panel lists the exposed entries in order with reorder
  and remove controls, flags an entry whose target no longer exists with
  repoint controls, and offers an Expose row (a property key, or an empty key
  to forward a node's whole UI). Every mutation goes through the view's
  delegate.
- STRUCT persistence carries the camera and descent stack, so the editor
  restores its view on load.

## Registering it in an app

The example app's tab (`example/editors/nodeeditor/`) is the worked example
of consumer-side registration. `demo_nodes.ts` defines the node types (using
`FloatSocket`, `Vec3Socket` and `StringSocket`; `DemoValue` and `DemoText`
show output-only defaults in practice — `DemoValue.outputs.str` and
`DemoText.outputs.text` are configurable constants with no input driving
them), a group definition behind a stub loader/saver pair, and a
`makeDemoGraph()` factory. `nodeeditor_tab.ts` subclasses the editor and
registers it:

```ts
export class NodeEditorTab extends NodeEditor {
  private fetchGraph() {
    const nodegraph = this.ctx.nodegraph;
    if (!nodegraph) {
      // the graph lives on the active model_data block, which may not
      // have loaded yet.
      window.setTimeout(() => this.fetchGraph(), 50);
      return;
    }

    this.setGraph(nodegraph, DEMO_GRAPH_PATH);
    this.view.onOpenDefinition = (node) => this._openDefinition(node);

    // group instances render unresolved until the stub loader answers.
    void nodegraph.resolveGroups().then(() => this.view.syncGraph());
  }

  init() {
    super.init();
    this.fetchGraph();
  }

  private _openDefinition(node: nodegraph.GroupNode) {
    const def = node.definition;
    if (def !== undefined) {
      this.editDefinition(node.ref, def, DEMO_GROUP_DEF_PATH);
    }
  }

  static define(): IAreaDef {
    return {
      tagname: "nodeeditor-tab-x",
      areaname: "node_editor",
      uiname: "Node Editor",
      icon: -1,
    };
  }
}
Area.register(NodeEditorTab);
```

The app's data API mounts the graph struct at both paths the tab uses
(`example/api/api_define.ts`); its context resolves them from the active
`model_data` block (`example/core/context.ts`), and the block owns the graph
as a real serialized field (`example/core/state.ts`) rather than a
module-level singleton, so each document gets its own graph and it saves and
loads with the rest of the document:

```ts
// api_define.ts
const graphst = nodegraph.defineGraphAPI(api);
cstruct.struct("nodegraph", "nodegraph", "Node Graph", graphst);
cstruct.struct("demogroup", "demogroup", "Demo Group Definition", graphst);

// state.ts (ModelData)
class ModelData extends DataBlock {
  demoNodeGraph = makeDemoGraph();
  // ...
}
ModelData.STRUCT = nstructjs.inherit(ModelData, DataBlock, "example.ModelData") + `
  demoNodeGraph : pathux.Graph;
}
`;

// context.ts (BaseOverlay)
get nodegraph() { return this.data?.demoNodeGraph; }
get demogroup() { return demoGroupDefs.get("demo_group")?.subgraph; }
```

Because `nodegraph` can be `undefined` before the model data block exists,
the tab's `fetchGraph()` polls rather than assuming it is ready in `init()`.

STRUCT registration follows the usual `Area` pattern (`STRUCT.inherit` plus
`nstructjs.register`).

## API reference

```ts
// --- graph module (the nodegraph namespace) ---

function registerNodeType(cls: typeof Node): void;
function getNodeClass(typeName: string): typeof Node | undefined;
function registerSocketType(cls: typeof NodeSocketBase): void;
function getSocketClass(typeName: string): typeof NodeSocketBase | undefined;

// Opaque (branded) string address for a node prop, input default, or output
// default: a bare name ("scale"), or "in:key" / "out:key" for a socket default.
type NodePropName = string;

class Node<Inputs, Outputs> {
  id: GraphId; // number (graph-allocated) or string (client-chosen)
  pos: Vector2;
  label: string; // user rename; getUIName() falls back to the def
  inputs: Inputs; // Record<string, NodeSocketBase>
  outputs: Outputs;
  props: Record<string, ToolProperty>;
  get allSockets(): NodeSocketBase[]; // inputs then outputs
  static graphDef(): NodeDef;
  static decomposePropName(prop: NodePropName): { type: "in" | "out" | "prop"; name: string };
  static composePropName(type: "in" | "out" | "prop", name: string): NodePropName;
  getUIName(): string;
}

function nodePropTarget(node: Node, key: NodePropName): ToolProperty | undefined;
function nodePropSocket(node: Node, key: NodePropName): NodeSocketBase | undefined;
function nodePropKeys(node: Node): NodePropName[]; // props, plus every editable input/output default
function nodePropValue(node: Node, key: NodePropName): unknown; // descends the group boundary

class NodeSocketBase<Type extends string, Value, Prop extends ToolProperty<Value>> {
  dir: SocketDir; // "in" | "out"
  type: Type; // the wire type
  multiSocket: boolean; // default: dir === "out"
  defaultProp: Prop; // editable default; every socket carries one, constructor-created
  useDefaultValue: boolean; // default true; false disables the default fallback entirely
  get defaultIsEditable(): boolean; // useDefaultValue && not read-only
  get nodePropName(): NodePropName; // `${dir}:${name}`
  setUX(cb: (prop: Prop) => void): this; // chaining helper to configure defaultProp
  edges: NodeSocketBase[];
  getValue(): Value | undefined; // both directions resolve through defaultProp when unset; inputs also through edges, memoized
  setValue(v: Value): void; // outputs store
  flagDirty(): void;
  coerce(b: NodeSocketBase, opts?: { dryRun?: boolean }): boolean;
  reduce?: (values: Value[]) => Value; // combines multi-link input values
  createUI(container: Container, datapath: string, label?: string): void; // default: container.prop(datapath)
}

class Graph {
  nodes: Node[];
  nodeIdMap: Map<GraphId, Node>;
  add(node: Node): void;
  remove(node: Node): void;
  connect(a: NodeSocketBase, b: NodeSocketBase): void; // either argument order
  disconnect(a: NodeSocketBase, b: NodeSocketBase): void;
  sort(): { order: Node[]; cycles: Node[][] };
  flagSortDirty(): void;
  structuralEditsRefused(): string | undefined;
  groupLoader?: (ref: string) => Promise<GroupDef | undefined>;
  groupSaver?: (ref: string, def: GroupDef) => Promise<void>;
  resolveGroups(): Promise<GroupResolveReport>;
}

class GroupDef {
  subgraph: Graph;
  exposed: ExposedEntry[];
  declareInput(key: string, sock: NodeSocketBase): NodeSocketBase; // returns the inner proxy socket
  declareOutput(key: string, sock: NodeSocketBase): NodeSocketBase;
  removeInput(key: string): void;
  removeOutput(key: string): void;
  contentHash(): string;
}

class GroupNode extends Node {
  ref: string;
  definition: GroupDef | undefined;
  subgraph: Graph; // the instance's physical copy
  setDefinition(def: GroupDef): void; // refuses self-containment
}

class ExposedEntry {
  constructor(kind: "prop" | "nodeUI", nodeId: GraphId, propKey: NodePropName, label?: string);
}

// Each node entry's props/inputs/outputs are independent { key: value } blocks —
// no fallback between them, no in:/out: prefix on the keys (see The graph DSL).
interface GraphDSLNode {
  id: string | number;
  type: string;
  props?: Record<string, unknown>;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
}
type GraphDSLLink = [fromNodeId: string | number, outputKey: string, toNodeId: string | number, inputKey: string];

function buildGraphFromDSL(
  input: unknown,
  registries: { nodeTypes: ReadonlyMap<string, typeof Node>; socketTypes: ReadonlyMap<string, typeof NodeSocketBase> }
): { graph: Graph; diagnostics: DSLDiagnostic[] };
function validateGraphDSL(input: unknown, registries): DSLDiagnostic[];
function defineGraphAPI(api: DataAPI): DataStruct;

// --- editor layer ---

class NodeGraphView<CTX> extends Container<CTX> {
  // custom element nodegraphview-x
  delegate: NodeGraphDelegate; // default: ToolOpDelegate
  get graphContext(): CTX & GraphContext; // view.ctx wrapped once, lazily, in a selection-op Proxy
  onOpenDefinition?: (node: GroupNode) => void;
  selection: Set<GraphId>;
  linkSelection: Set<string>; // keys from linkKey()
  setGraph(graph: Graph | undefined, graphPath: string): void;
  get currentGraph(): Graph | undefined; // the graph on screen after descent
  get currentGraphPath(): string;
  descendInto(node: Node): void;
  popTo(depth: number): void;
  syncGraph(): void; // reconcile frames after external changes
  addNodeAt(typeName: string, at?: readonly [number, number] | Vector2): void; // graph-space; defaults to the view's center
  openAddMenu(local: readonly [number, number]): Menu<CTX>; // started as a screen popup when ctx has a screen
  singleUndoStep<T>(cb: () => T, shortLabel?: string, message?: string): Promise<T>; // brackets cb with delegate.undoStepBegin/undoStepEnd, locking input meanwhile
  deleteSelected(): Promise<void>; // severs the selected links too; one undo step
  duplicateSelected(): Promise<void>; // one undo step; ends with the duplicates selected
  replaceNode(nodeId: GraphId, newType: string): void;
  arrangeNodes(): void;
  selectLink(ref: LinkRef, additive: boolean): void;
  selectedLinks(): LinkRef[]; // resolved against the links on screen
  clearSelection(): void; // clears both selections
  boxSelect(min: readonly [number, number], max: readonly [number, number], additive: boolean): void; // graph-space
  getViewState(): NodeGraphViewState; // { pan, zoom, descent }
  setViewState(state: NodeGraphViewState): void;
}

interface LinkRef {
  srcNode: GraphId;
  srcSocket: string;
  dstNode: GraphId;
  dstSocket: string;
}
function linkKey(ref: LinkRef): string;
const LINK_PICK_PX: number; // screen-space pick radius around a link

// Modal gesture ops the view spawns on pointerdown (all UndoFlags.NO_UNDO;
// document changes commit through the delegate on release).
class NodeMoveModalOp {} // nodeview.translate_node
class BoxSelectModalOp {} // nodeview.box_select
class LinkDragModalOp {} // nodeview.link_drag

class NodeEditor<CTX> extends Area<CTX> {
  // custom element node-editor-x; ships unregistered
  view: NodeGraphView<CTX>;
  headerRow: Container<CTX>; // the header makeHeader built; a subclass adds its own controls
  setGraph(graph: Graph | undefined, graphPath: string): void;
  editDefinition(ref: string, def: GroupDef, defPath: string): void;
}

// The type picker behind Add and Replace, as menu entries or a standalone Menu.
function addNodeMenuTemplate(
  onPick: (typeName: string) => void,
  items?: AddMenuItem[]
): MenuTemplate;
function buildAddNodeMenu<CTX>(
  ctx: CTX,
  onPick: (typeName: string) => void,
  items?: AddMenuItem[]
): Menu<CTX>;
function addMenuItems(): AddMenuItem[]; // registered types minus the group machinery

// Selection ops layered onto whatever context a client already passes; see
// The delegate seam. selectSockets/deselectSockets are declared but not yet
// backed by NodeGraphView, so calling either throws.
type GraphContext = ContextLike & {
  clearSelection(): void;
  selectAll(): void;
  selectNodes(ids: GraphId[]): void;
  deselectNodes(ids: GraphId[]): void;
  selectSockets(ids: GraphId[]): void;
  deselectSockets(ids: GraphId[]): void;
};

interface NodeGraphDelegate {
  undoStepBegin(ctx: GraphContext): void;
  check(ctx: GraphContext, edit: GraphEdit): EditVerdict;
  perform(ctx: GraphContext, edit: GraphEdit): void;
  undoStepEnd(ctx: GraphContext): void;
}

// One socket's terminal, a custom element (nodeframe-graph-terminaldot-x)
// wrapping the dot drawn at the frame's edge; frame.terminalDot(key, dir)
// resolves one, and a link drag drives forceHighlight as it moves. Its own
// hover ring runs off CSS and needs no host involvement.
class TerminalDot<CTX> extends HTMLElement {
  forceHighlight: boolean;
  showError: boolean;
}
```

The behavioral contracts live in the tests:
[`tests/graph_socket.test.ts`](../tests/graph_socket.test.ts),
[`tests/graph_node.test.ts`](../tests/graph_node.test.ts),
[`tests/graph_sort.test.ts`](../tests/graph_sort.test.ts),
[`tests/graph_group.test.ts`](../tests/graph_group.test.ts),
[`tests/graph_dsl.test.ts`](../tests/graph_dsl.test.ts),
[`tests/graph_api.test.ts`](../tests/graph_api.test.ts),
[`tests/graph_ops.test.ts`](../tests/graph_ops.test.ts) and
[`tests/graph_headless.test.ts`](../tests/graph_headless.test.ts) for the
graph module (the last one runs in plain Node, stating the no-DOM contract);
[`tests/nodeeditor_view.test.ts`](../tests/nodeeditor_view.test.ts) and
[`tests/nodeeditor_edit.test.ts`](../tests/nodeeditor_edit.test.ts) for the
editor. The **Node Editor** tab in the example app
([`example/editors/nodeeditor/`](../example/editors/nodeeditor/)) is a live,
group-carrying instance.
