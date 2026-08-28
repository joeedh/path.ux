import { ToolOp } from "../path-controller/toolsys/toolsys";
import { FloatProperty, StringProperty } from "../path-controller/toolsys/toolprop";
import type { ToolProperty } from "../path-controller/toolsys/toolprop";
import type { ContextLike } from "../path-controller/controller/controller_abstract";
import { Graph } from "./graph";
import { getNodeClass, nodePropTarget } from "./node";
import type { Node, NodePropName } from "./node";
import { definitionOfSubgraph } from "./group";
import type { ExposedEntry } from "./group";
import type { GraphId } from "./graph_types";
import { GraphContext } from "../pathux";

/** Resolves a graphPath input to its Graph, throwing when the path lands elsewhere. */
function graphAt(ctx: ContextLike, path: string): Graph {
  const g: unknown = ctx.api.getValue(ctx, path);
  if (!(g instanceof Graph)) {
    throw new Error(`'${path}' does not resolve to a graph`);
  }
  return g;
}

/** Resolves a JSON-encoded GraphId input to its node, throwing when absent. */
function nodeAt(graph: Graph, idJSON: string): Node {
  const node = graph.nodeIdMap.get(JSON.parse(idJSON) as GraphId);
  if (node === undefined) {
    throw new Error(`no node with id ${idJSON}`);
  }
  return node;
}

/**
 * Wakes the pathwatch watchers on an op's graph. Called at the end of every exec and
 * undo (redo re-runs exec), so the editor refreshes on undo/redo without the caller
 * syncing by hand.
 */
function notifyGraph(ctx: ContextLike, op: { inputs: { graphPath: StringProperty } }): void {
  ctx.api.notifyChange(op.inputs.graphPath.getValue());
}

/** One severed or displaced link, held as ids and socket keys so undo can reconnect it. */
interface EdgeRecord {
  srcId: GraphId;
  srcKey: string;
  dstId: GraphId;
  dstKey: string;
}

/** Every link on node's sockets, in both directions. */
function captureEdges(node: Node): EdgeRecord[] {
  const out: EdgeRecord[] = [];
  for (const k in node.inputs) {
    for (const e of node.inputs[k].edges) {
      out.push({ srcId: e.owningNode!.id, srcKey: e.name, dstId: node.id, dstKey: k });
    }
  }
  for (const k in node.outputs) {
    for (const e of node.outputs[k].edges) {
      out.push({ srcId: node.id, srcKey: k, dstId: e.owningNode!.id, dstKey: e.name });
    }
  }
  return out;
}

/** Reconnects recorded links, skipping records whose endpoints no longer exist. */
function restoreEdges(graph: Graph, records: EdgeRecord[]): void {
  for (const r of records) {
    const src = graph.nodeIdMap.get(r.srcId)?.outputs[r.srcKey];
    const dst = graph.nodeIdMap.get(r.dstId)?.inputs[r.dstKey];
    if (src !== undefined && dst !== undefined) {
      graph.connect(src, dst);
    }
  }
}

/**
 * Shared canRun for the structural ops. A group instance's subgraph takes value
 * edits only; the refusal sentence is reported through console.warn, matching how
 * execTool reports a declined canRun.
 */
function structuralOkay(
  ctx: ContextLike,
  toolop: { inputs: { graphPath: StringProperty } } | undefined
): boolean {
  if (toolop === undefined) {
    return true;
  }

  let graph: Graph;
  try {
    graph = graphAt(ctx, toolop.inputs.graphPath.getValue());
  } catch (err) {
    console.warn(err instanceof Error ? err.message : String(err));
    return false;
  }

  const refusal = graph.structuralEditsRefused();
  if (refusal !== undefined) {
    console.warn(refusal);
    return false;
  }
  return true;
}

type LinkInputs = {
  graphPath: StringProperty;
  srcNode: StringProperty;
  srcSocket: StringProperty;
  dstNode: StringProperty;
  dstSocket: StringProperty;
};

// Every graph-op input is an address or a per-invocation value, so none belongs in
// the saved-defaults cache.
function strInput(): StringProperty {
  return new StringProperty().ignoreLastValue();
}

function floatInput(value: number): FloatProperty {
  return new FloatProperty(value).ignoreLastValue();
}

function linkInputs(): LinkInputs {
  return {
    graphPath: strInput(),
    srcNode  : strInput(),
    srcSocket: strInput(),
    dstNode  : strInput(),
    dstSocket: strInput(),
  };
}

/** Resolves a link op's inputs to live sockets, throwing when either socket is absent. */
function linkEndpoints(ctx: ContextLike, inputs: LinkInputs) {
  const graph = graphAt(ctx, inputs.graphPath.getValue());
  const srcNode = nodeAt(graph, inputs.srcNode.getValue());
  const dstNode = nodeAt(graph, inputs.dstNode.getValue());

  const srcKey = inputs.srcSocket.getValue();
  const dstKey = inputs.dstSocket.getValue();
  const src = srcNode.outputs[srcKey];
  const dst = dstNode.inputs[dstKey];
  if (src === undefined) {
    throw new Error(`${srcNode.def.typeName} has no output socket '${srcKey}'`);
  }
  if (dst === undefined) {
    throw new Error(`${dstNode.def.typeName} has no input socket '${dstKey}'`);
  }
  return { graph, src, dst, dstNode, dstKey };
}

/**
 * Adds a node of a registered type at a position. The new node's id lands in
 * outputs.nodeId JSON-encoded, and a redo reuses it so later records stay valid.
 */
export class AddNodeOp extends ToolOp<
  {
    graphPath: StringProperty;
    nodeType: StringProperty;
    x: FloatProperty;
    y: FloatProperty;
  },
  { nodeId: StringProperty }
> {
  static tooldef() {
    return {
      uiname  : "Add Node",
      toolpath: "graph.add_node",
      inputs: {
        graphPath: strInput(),
        nodeType : strInput(),
        x        : floatInput(0),
        y        : floatInput(0),
      },
      outputs: {
        nodeId: new StringProperty(),
      },
    };
  }

  static override canRun(ctx: ContextLike, toolop?: ToolOp): boolean {
    return structuralOkay(ctx, toolop as AddNodeOp | undefined);
  }

  /** Nothing to record: undo removes the node outputs.nodeId names. */
  override undoPre(_ctx: ContextLike): void {}

  override exec(ctx: GraphContext): void {
    const graph = graphAt(ctx, this.inputs.graphPath.getValue());

    const typeName = this.inputs.nodeType.getValue();
    const cls = getNodeClass(typeName);
    if (cls === undefined) {
      throw new Error(`unknown node type '${typeName}'`);
    }

    const node = new cls();
    const prior = this.outputs.nodeId.getValue();
    if (prior) {
      node.id = JSON.parse(prior) as GraphId;
    }
    node.pos[0] = this.inputs.x.getValue();
    node.pos[1] = this.inputs.y.getValue();

    graph.add(node);
    this.outputs.nodeId.setValue(JSON.stringify(node.id));
    notifyGraph(ctx, this);
    ctx.selectNodes([node.id]);
  }

  override undo(ctx: ContextLike): void {
    const graph = graphAt(ctx, this.inputs.graphPath.getValue());
    graph.remove(nodeAt(graph, this.outputs.nodeId.getValue()));
    notifyGraph(ctx, this);
  }
}

/** Deletes a node. Undo re-adds the same node (its id survives removal) and re-links it. */
export class DeleteNodeOp extends ToolOp<{
  graphPath: StringProperty;
  nodeId: StringProperty;
}> {
  private _node: Node | undefined;
  private _edges: EdgeRecord[] = [];

  static tooldef() {
    return {
      uiname  : "Delete Node",
      toolpath: "graph.delete_node",
      inputs: {
        graphPath: strInput(),
        nodeId   : strInput(),
      },
    };
  }

  static override canRun(ctx: ContextLike, toolop?: ToolOp): boolean {
    return structuralOkay(ctx, toolop as DeleteNodeOp | undefined);
  }

  override undoPre(ctx: ContextLike): void {
    const graph = graphAt(ctx, this.inputs.graphPath.getValue());
    const node = nodeAt(graph, this.inputs.nodeId.getValue());
    this._node = node;
    this._edges = captureEdges(node);
  }

  override exec(ctx: ContextLike): void {
    const graph = graphAt(ctx, this.inputs.graphPath.getValue());
    graph.remove(nodeAt(graph, this.inputs.nodeId.getValue()));
    notifyGraph(ctx, this);
  }

  override undo(ctx: ContextLike): void {
    const graph = graphAt(ctx, this.inputs.graphPath.getValue());
    graph.add(this._node!);
    restoreEdges(graph, this._edges);
    notifyGraph(ctx, this);
  }
}

/** Connects an output to an input by node id and socket key. Undo restores displaced links. */
export class ConnectOp extends ToolOp<LinkInputs> {
  private _existed = false;
  private _displaced: EdgeRecord[] = [];

  static tooldef() {
    return {
      uiname  : "Connect",
      toolpath: "graph.connect",
      inputs  : linkInputs(),
    };
  }

  static override canRun(ctx: ContextLike, toolop?: ToolOp): boolean {
    return structuralOkay(ctx, toolop as ConnectOp | undefined);
  }

  override undoPre(ctx: ContextLike): void {
    const { src, dst, dstNode, dstKey } = linkEndpoints(ctx, this.inputs);

    this._existed = src.edges.includes(dst);
    this._displaced = [];
    if (!this._existed && !dst.multiSocket) {
      for (const e of dst.edges) {
        this._displaced.push({
          srcId : e.owningNode!.id,
          srcKey: e.name,
          dstId : dstNode.id,
          dstKey,
        });
      }
    }
  }

  override exec(ctx: ContextLike): void {
    const { graph, src, dst } = linkEndpoints(ctx, this.inputs);
    graph.connect(src, dst);
    notifyGraph(ctx, this);
  }

  override undo(ctx: ContextLike): void {
    const { graph, src, dst } = linkEndpoints(ctx, this.inputs);
    if (!this._existed) {
      graph.disconnect(src, dst);
    }
    restoreEdges(graph, this._displaced);
    notifyGraph(ctx, this);
  }
}

/** Severs one link. A no-op when the link is absent, and undo then restores nothing. */
export class DisconnectOp extends ToolOp<LinkInputs> {
  private _existed = false;

  static tooldef() {
    return {
      uiname  : "Disconnect",
      toolpath: "graph.disconnect",
      inputs  : linkInputs(),
    };
  }

  static override canRun(ctx: ContextLike, toolop?: ToolOp): boolean {
    return structuralOkay(ctx, toolop as DisconnectOp | undefined);
  }

  override undoPre(ctx: ContextLike): void {
    const { src, dst } = linkEndpoints(ctx, this.inputs);
    this._existed = src.edges.includes(dst);
  }

  override exec(ctx: ContextLike): void {
    const { graph, src, dst } = linkEndpoints(ctx, this.inputs);
    graph.disconnect(src, dst);
    notifyGraph(ctx, this);
  }

  override undo(ctx: ContextLike): void {
    const { graph, src, dst } = linkEndpoints(ctx, this.inputs);
    if (this._existed) {
      graph.connect(src, dst);
    }
    notifyGraph(ctx, this);
  }
}

/** Moves a node to an absolute position. */
export class MoveNodeOp extends ToolOp<{
  graphPath: StringProperty;
  nodeId: StringProperty;
  x: FloatProperty;
  y: FloatProperty;
}> {
  private _oldX = 0;
  private _oldY = 0;

  static tooldef() {
    return {
      uiname  : "Move Node",
      toolpath: "graph.move_node",
      inputs: {
        graphPath: strInput(),
        nodeId   : strInput(),
        x        : floatInput(0),
        y        : floatInput(0),
      },
    };
  }

  static override canRun(ctx: ContextLike, toolop?: ToolOp): boolean {
    return structuralOkay(ctx, toolop as MoveNodeOp | undefined);
  }

  private _node(ctx: ContextLike): Node {
    const graph = graphAt(ctx, this.inputs.graphPath.getValue());
    return nodeAt(graph, this.inputs.nodeId.getValue());
  }

  override undoPre(ctx: ContextLike): void {
    const node = this._node(ctx);
    this._oldX = node.pos[0];
    this._oldY = node.pos[1];
  }

  override exec(ctx: ContextLike): void {
    const node = this._node(ctx);
    node.pos[0] = this.inputs.x.getValue();
    node.pos[1] = this.inputs.y.getValue();
    notifyGraph(ctx, this);
  }

  override undo(ctx: ContextLike): void {
    const node = this._node(ctx);
    node.pos[0] = this._oldX;
    node.pos[1] = this._oldY;
    notifyGraph(ctx, this);
  }
}

/** Sets or clears a node's label. An empty label restores the definition's name. */
export class RenameNodeOp extends ToolOp<{
  graphPath: StringProperty;
  nodeId: StringProperty;
  label: StringProperty;
}> {
  private _oldLabel: string | undefined;

  static tooldef() {
    return {
      uiname  : "Rename Node",
      toolpath: "graph.rename_node",
      inputs: {
        graphPath: strInput(),
        nodeId   : strInput(),
        label    : strInput(),
      },
    };
  }

  static override canRun(ctx: ContextLike, toolop?: ToolOp): boolean {
    return structuralOkay(ctx, toolop as RenameNodeOp | undefined);
  }

  private _node(ctx: ContextLike): Node {
    const graph = graphAt(ctx, this.inputs.graphPath.getValue());
    return nodeAt(graph, this.inputs.nodeId.getValue());
  }

  override undoPre(ctx: ContextLike): void {
    this._oldLabel = this._node(ctx).label;
  }

  override exec(ctx: ContextLike): void {
    const label = this.inputs.label.getValue();
    this._node(ctx).label = label === "" ? undefined : label;
    notifyGraph(ctx, this);
  }

  override undo(ctx: ContextLike): void {
    this._node(ctx).label = this._oldLabel;
    notifyGraph(ctx, this);
  }
}

/**
 * Swaps a node's type in place: same id, position and label; links re-attach by
 * socket key where the replacement can accept them. In a group definition, exposure
 * rows naming a prop the replacement lacks are dropped, and undo restores them.
 */
export class ReplaceNodeOp extends ToolOp<{
  graphPath: StringProperty;
  nodeId: StringProperty;
  newType: StringProperty;
}> {
  private _old: Node | undefined;
  private _edges: EdgeRecord[] = [];
  private _exposed: ExposedEntry[] | undefined;

  static tooldef() {
    return {
      uiname  : "Replace Node",
      toolpath: "graph.replace_node",
      inputs: {
        graphPath: strInput(),
        nodeId   : strInput(),
        newType  : strInput(),
      },
    };
  }

  static override canRun(ctx: ContextLike, toolop?: ToolOp): boolean {
    return structuralOkay(ctx, toolop as ReplaceNodeOp | undefined);
  }

  override undoPre(ctx: ContextLike): void {
    const graph = graphAt(ctx, this.inputs.graphPath.getValue());
    const node = nodeAt(graph, this.inputs.nodeId.getValue());
    this._old = node;
    this._edges = captureEdges(node);

    const def = definitionOfSubgraph(graph);
    this._exposed = def !== undefined ? [...def.exposed] : undefined;
  }

  override exec(ctx: ContextLike): void {
    const graph = graphAt(ctx, this.inputs.graphPath.getValue());
    const old = nodeAt(graph, this.inputs.nodeId.getValue());

    const typeName = this.inputs.newType.getValue();
    const cls = getNodeClass(typeName);
    if (cls === undefined) {
      throw new Error(`unknown node type '${typeName}'`);
    }

    const edges = captureEdges(old);
    graph.remove(old);

    const node = new cls();
    node.id = old.id;
    node.label = old.label;
    node.pos.load(old.pos);
    graph.add(node);

    for (const r of edges) {
      const src = graph.nodeIdMap.get(r.srcId)?.outputs[r.srcKey];
      const dst = graph.nodeIdMap.get(r.dstId)?.inputs[r.dstKey];
      if (src !== undefined && dst !== undefined && dst.coerce(src, { dryRun: true })) {
        graph.connect(src, dst);
      }
    }

    // A definition's exposure rows follow the id, so prop rows survive only when the
    // replacement can satisfy them; nodeUI rows always do.
    const def = definitionOfSubgraph(graph);
    if (def !== undefined) {
      def.exposed = def.exposed.filter(
        (e) =>
          e.nodeId !== node.id || e.kind !== "prop" || nodePropTarget(node, e.propKey) !== undefined
      );
    }
    notifyGraph(ctx, this);
  }

  override undo(ctx: ContextLike): void {
    const graph = graphAt(ctx, this.inputs.graphPath.getValue());
    graph.remove(nodeAt(graph, this.inputs.nodeId.getValue()));
    graph.add(this._old!);
    restoreEdges(graph, this._edges);

    const def = definitionOfSubgraph(graph);
    if (def !== undefined && this._exposed !== undefined) {
      def.exposed = this._exposed;
    }
    notifyGraph(ctx, this);
  }
}

/**
 * Sets one node property (or input default) through the tool stack. Not structural,
 * so it runs on a group instance's subgraph, where the write materializes the value;
 * undo restores the prior wasSet, dematerializing a first edit.
 */
export class SetNodePropOp extends ToolOp<{
  graphPath: StringProperty;
  nodeId: StringProperty;
  /** holds a NodePropName. */
  propKey: StringProperty;
  value: ToolProperty;
  [k: string]: ToolProperty;
}> {
  private _oldValue: unknown;
  private _oldWasSet = false;

  static tooldef() {
    return {
      uiname  : "Set Node Property",
      toolpath: "graph.set_node_prop",
      inputs: {
        graphPath: strInput(),
        nodeId   : strInput(),
        propKey  : strInput(),
      },
    };
  }

  /** The value input is typed by cloning the target property, so tooldef cannot declare it. */
  static create(
    ctx: ContextLike,
    graphPath: string,
    nodeIdJSON: string,
    propKey: NodePropName,
    value: unknown
  ): SetNodePropOp {
    const tool = new SetNodePropOp();
    tool.inputs.graphPath.setValue(graphPath);
    tool.inputs.nodeId.setValue(nodeIdJSON);
    tool.inputs.propKey.setValue(propKey as unknown as string);

    const graph = graphAt(ctx, graphPath);
    const node = nodeAt(graph, nodeIdJSON);
    const target = nodePropTarget(node, propKey);
    if (target === undefined) {
      throw new Error(`${node.def.typeName}: no prop or input default '${propKey}'`);
    }

    const prop = (target.copy() as ToolProperty).ignoreLastValue();
    prop.setValue(value);
    tool.inputs.value = prop;
    return tool;
  }

  private _target(ctx: ContextLike): ToolProperty {
    const graph = graphAt(ctx, this.inputs.graphPath.getValue());
    const node = nodeAt(graph, this.inputs.nodeId.getValue());
    const key = this.inputs.propKey.getValue() as unknown as NodePropName;
    const target = nodePropTarget(node, key);
    if (target === undefined) {
      throw new Error(`${node.def.typeName}: no prop or input default '${key}'`);
    }
    return target;
  }

  override undoPre(ctx: ContextLike): void {
    const target = this._target(ctx);
    this._oldWasSet = target.wasSet;

    let val: unknown = target.getValue();
    if (typeof val === "object" && val !== null) {
      val = (val as { copy(): unknown }).copy();
    }
    this._oldValue = val;
  }

  override exec(ctx: ContextLike): void {
    this._target(ctx).setValue(this.inputs.value.getValue());
    notifyGraph(ctx, this);
  }

  override undo(ctx: ContextLike): void {
    const target = this._target(ctx);
    target.setValue(this._oldValue);
    // setValue marks the property set; the pre-edit state may have been unmaterialized.
    target.wasSet = this._oldWasSet;
    notifyGraph(ctx, this);
  }
}

for (const cls of [
  AddNodeOp,
  DeleteNodeOp,
  ConnectOp,
  DisconnectOp,
  MoveNodeOp,
  RenameNodeOp,
  ReplaceNodeOp,
  SetNodePropOp,
]) {
  ToolOp.register(cls as unknown as Parameters<typeof ToolOp.register>[0]);
}
