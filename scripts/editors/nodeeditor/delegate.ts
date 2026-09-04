import type { ContextLike } from "../../path-controller/controller/controller_abstract";
import { ToolMacro, ToolOp } from "../../path-controller/toolsys/toolsys";
import { Graph } from "../../graph/graph";
import {
  AddGroupSocketOp,
  AddNodeOp,
  ConnectOp,
  CreateGroupOp,
  DeleteNodeOp,
  DisconnectOp,
  DuplicateNodeOp,
  ExposeEntryOp,
  MoveNodeOp,
  RemoveEntryOp,
  RemoveGroupSocketOp,
  ReorderEntryOp,
  RepointEntryOp,
  ReplaceNodeOp,
  UngroupOp,
} from "../../graph/graph_ops";
import { getNodeClass, nodePropTarget } from "../../graph/node";
import type { NodePropName } from "../../graph/node";
import { definitionOfSubgraph, GroupNode } from "../../graph/group";
import { groupPlan, isRefusal } from "../../graph/grouping";
import type { ExposeRequest } from "../../graph/grouping";
import { getSocketClass } from "../../graph/socket";
import type { GraphId, SocketDir } from "../../graph/graph_types";

/** One node's destination in a multi-node move. */
export interface NodeMove {
  nodeId: GraphId;
  x: number;
  y: number;
}

/**
 * One proposed graph mutation, described as data so a host can route it. The
 * definition kinds — the four exposure edits and the two boundary edits — name a
 * definition's subgraph by graphPath and are refused on any other graph.
 */
export type GraphEdit =
  | { kind: "moveNode"; graphPath: string; nodeId: GraphId; x: number; y: number }
  | { kind: "moveNodes"; graphPath: string; moves: NodeMove[] }
  | {
      kind: "addNode";
      graphPath: string;
      nodeType: string;
      x: number;
      y: number;
      /** The definition a GroupNode instances; ignored on any other type. */
      ref?: string;
    }
  | { kind: "deleteNode"; graphPath: string; nodeId: GraphId }
  | {
      kind: "createGroup";
      graphPath: string;
      /** The root graph, whose store seams save the new definition. */
      storePath: string;
      nodeIds: GraphId[];
      /** Filled from the root graph's newGroupRef when absent. */
      ref?: string;
    }
  | { kind: "ungroup"; graphPath: string; nodeId: GraphId }
  | { kind: "duplicateNode"; graphPath: string; nodeId: GraphId; x: number; y: number }
  | { kind: "replaceNode"; graphPath: string; nodeId: GraphId; newType: string }
  | {
      kind: "connect";
      graphPath: string;
      srcNode: GraphId;
      srcSocket: string;
      dstNode: GraphId;
      dstSocket: string;
    }
  | {
      kind: "disconnect";
      graphPath: string;
      srcNode: GraphId;
      srcSocket: string;
      dstNode: GraphId;
      dstSocket: string;
    }
  | { kind: "arrange"; graphPath: string; moves: NodeMove[] }
  | { kind: "exposeEntry"; graphPath: string; entry: ExposeRequest; at?: number }
  | { kind: "reorderEntry"; graphPath: string; from: number; to: number }
  | {
      kind: "repointEntry";
      graphPath: string;
      index: number;
      nodeId: GraphId;
      propKey: NodePropName;
    }
  | { kind: "removeEntry"; graphPath: string; index: number }
  | { kind: "addBoundary"; graphPath: string; dir: SocketDir; key: string; socketType: string }
  | { kind: "removeBoundary"; graphPath: string; dir: SocketDir; key: string };

export type EditVerdict = { ok: true } | { ok: false; reason: string };

// array of node ids
export type SelectionState = GraphId[];

/*
 * note: some clients may implement undoable undo
 */
export type GraphContext = ContextLike & {
  clearSelection(): void;
  selectAll(): void;
  selectNodes(ids: GraphId[]): void;
  deselectNodes(id: GraphId[]): void;

  selectSockets(ids: GraphId[]): void;
  deselectSockets(id: GraphId[]): void;
};

/**
 * The gesture seam: every mutating gesture in the node-graph view asks a
 * delegate to judge and perform its edit. The default implementation
 * dispatches the graph module's ToolOps; a host with its own command system
 * installs a delegate that routes edits there instead. A check verdict must
 * match what perform would decide, so a refusal can show mid-gesture.
 * undoStepBegin/undoStepEnd bracket a whole gesture (e.g. delete, duplicate)
 * and may await real async work (a host opening/closing its own checkpoint);
 * perform stays synchronous.
 */
export interface NodeGraphDelegate {
  undoStepBegin(ctx: GraphContext, shortLabel: string, message: string): Promise<void>;
  check(ctx: GraphContext, edit: GraphEdit): EditVerdict;
  perform(ctx: GraphContext, edit: GraphEdit): void;
  undoStepEnd(ctx: GraphContext): Promise<void>;
}

/** The definition kinds edit a group definition rather than the graph on screen. */
export function isDefinitionEdit(edit: GraphEdit): boolean {
  switch (edit.kind) {
    case "exposeEntry":
    case "reorderEntry":
    case "repointEntry":
    case "removeEntry":
    case "addBoundary":
    case "removeBoundary":
      return true;
    default:
      return false;
  }
}

/** The sentence a definition edit is refused with on a graph that is no definition. */
export const NOT_A_DEFINITION =
  "forwarded rows and boundary sockets belong to a group's definition; open one to edit them";

/**
 * Locks pointer/keyboard input while an async undo step (delegate.undoStepBegin,
 * cb, delegate.undoStepEnd) is in flight, so a second gesture can't open a
 * competing checkpoint before the first one closes. The base modal promise
 * (`ToolOp.modalStart`) always resolves, never rejects, so this class captures
 * cb's own outcome and rethrows it once the lock releases.
 */
export class AsyncGateOp<CTX extends GraphContext = GraphContext> extends ToolOp<{}, {}, CTX, CTX> {
  private stepDelegate!: NodeGraphDelegate;
  private shortLabel = "";
  private message = "";
  private cb!: () => unknown;
  private result: unknown;
  private caughtError: unknown;
  private failed = false;

  static tooldef() {
    return {
      toolpath   : "pathux.graph.async_gate",
      uiname     : "Async Undo Gate",
      description: "Locks input while an async undo step runs.",
      is_modal   : true,
      inputs     : {},
      outputs    : {},
    };
  }

  init(delegate: NodeGraphDelegate, shortLabel: string, message: string, cb: () => unknown): this {
    this.stepDelegate = delegate;
    this.shortLabel = shortLabel;
    this.message = message;
    this.cb = cb;
    return this;
  }

  override on_keydown(_e: KeyboardEvent): void {
    // Escape must not release the lock while the async step is still pending
  }

  override modalStart(ctx: CTX): Promise<unknown> {
    const gate = super.modalStart(ctx);
    void this.run(ctx);
    return gate.then(() => {
      if (this.failed) {
        throw this.caughtError;
      }
      return this.result;
    });
  }

  private async run(ctx: CTX): Promise<void> {
    try {
      await this.stepDelegate.undoStepBegin(ctx, this.shortLabel, this.message);
      this.result = await this.cb();
    } catch (err) {
      this.failed = true;
      this.caughtError = err;
    } finally {
      await this.stepDelegate.undoStepEnd(ctx);
      this.modalEnd();
    }
  }
}

/**
 * The default delegate. check consults the graph's own refusal — every
 * graph-mutating kind is a structural edit, so it is refused inside a group
 * instance's subgraph — plus per-kind feasibility (a connect's sockets must
 * exist and coerce, an addNode's type must be registered, a createGroup's plan
 * must not refuse). perform dispatches the graph module's ToolOps on
 * ctx.toolstack; the composite kinds (arrange, moveNodes) go through one
 * ToolMacro so each is a single undo entry. The definition kinds run only on a
 * definition's subgraph, and each is one undoable op.
 */
export class ToolOpDelegate implements NodeGraphDelegate {
  private undoStepLvl = 0;
  private pendingMacro?: ToolMacro<GraphContext>;

  async undoStepBegin(ctx: GraphContext, _shortLabel: string, _message: string): Promise<void> {
    if (this.undoStepLvl === 0) {
      this.pendingMacro = new ToolMacro<GraphContext>();
    }
    this.undoStepLvl++;
  }

  async undoStepEnd(ctx: GraphContext): Promise<void> {
    this.undoStepLvl--;
    if (this.undoStepLvl === 0 && this.pendingMacro) {
      ctx.toolstack.execTool(ctx, this.pendingMacro);
      this.pendingMacro = undefined;
    }
  }

  check(ctx: GraphContext, edit: GraphEdit): EditVerdict {
    let value: unknown;
    try {
      value = ctx.api.getValue(ctx, edit.graphPath);
    } catch {
      value = undefined;
    }
    if (!(value instanceof Graph)) {
      return { ok: false, reason: `'${edit.graphPath}' does not resolve to a graph` };
    }
    const graph = value;

    if (isDefinitionEdit(edit)) {
      return this._checkDefinitionEdit(graph, edit);
    }

    const refusal = graph.structuralEditsRefused();
    if (refusal !== undefined) {
      return { ok: false, reason: refusal };
    }

    switch (edit.kind) {
      case "addNode":
      case "replaceNode": {
        const typeName = edit.kind === "addNode" ? edit.nodeType : edit.newType;
        if (getNodeClass(typeName) === undefined) {
          return { ok: false, reason: `unknown node type '${typeName}'` };
        }
        break;
      }
      case "duplicateNode": {
        if (graph.nodeIdMap.get(edit.nodeId) === undefined) {
          return { ok: false, reason: `no node with id ${JSON.stringify(edit.nodeId)}` };
        }
        break;
      }
      case "createGroup": {
        const plan = groupPlan(graph, edit.nodeIds);
        if (isRefusal(plan)) {
          return { ok: false, reason: plan.refusal };
        }
        if (this._refFor(ctx, edit) === undefined) {
          return { ok: false, reason: "the host gave no name for the new group" };
        }
        break;
      }
      case "ungroup": {
        if (!(graph.nodeIdMap.get(edit.nodeId) instanceof GroupNode)) {
          return { ok: false, reason: `node ${JSON.stringify(edit.nodeId)} is not a group` };
        }
        break;
      }
      case "connect": {
        const src = graph.nodeIdMap.get(edit.srcNode)?.outputs[edit.srcSocket];
        const dst = graph.nodeIdMap.get(edit.dstNode)?.inputs[edit.dstSocket];
        if (src === undefined || dst === undefined) {
          return { ok: false, reason: "a link endpoint does not exist" };
        }
        if (!dst.coerce(src, { dryRun: true })) {
          return {
            ok    : false,
            reason: `a '${src.type}' output cannot connect to a '${dst.type}' input`,
          };
        }
        break;
      }
    }

    return { ok: true };
  }

  private _checkDefinitionEdit(graph: Graph, edit: GraphEdit): EditVerdict {
    const def = definitionOfSubgraph(graph);
    if (def === undefined) {
      return { ok: false, reason: NOT_A_DEFINITION };
    }
    switch (edit.kind) {
      case "exposeEntry":
      case "repointEntry": {
        const nodeId = edit.kind === "exposeEntry" ? edit.entry.nodeId : edit.nodeId;
        const node = def.subgraph.nodeIdMap.get(nodeId);
        if (node === undefined) {
          return { ok: false, reason: `no node with id ${JSON.stringify(nodeId)}` };
        }
        const key = edit.kind === "exposeEntry" ? edit.entry.propKey : edit.propKey;
        const wantsProp = edit.kind === "repointEntry" || edit.entry.kind === "prop";
        if (
          wantsProp &&
          nodePropTarget(node, (key ?? "") as unknown as NodePropName) === undefined
        ) {
          return { ok: false, reason: `${node.getUIName()} has no property '${key ?? ""}'` };
        }
        break;
      }
      case "addBoundary": {
        if (getSocketClass(edit.socketType) === undefined) {
          return { ok: false, reason: `unknown socket type '${edit.socketType}'` };
        }
        if (edit.key in (edit.dir === "in" ? def.inputs : def.outputs)) {
          return { ok: false, reason: `the group already has a socket named '${edit.key}'` };
        }
        break;
      }
      case "removeBoundary": {
        if (!(edit.key in (edit.dir === "in" ? def.inputs : def.outputs))) {
          return { ok: false, reason: `the group has no socket named '${edit.key}'` };
        }
        break;
      }
    }
    return { ok: true };
  }

  /** The ref a createGroup saves under: the edit's own, else the store's newGroupRef. */
  private _refFor(
    ctx: GraphContext,
    edit: Extract<GraphEdit, { kind: "createGroup" }>
  ): string | undefined {
    if (edit.ref) {
      return edit.ref;
    }
    const ref = this._graph(ctx, edit.storePath)?.newGroupRef?.();
    return ref ? ref : undefined;
  }

  private execTool(ctx: GraphContext, tool: ToolOp): void {
    if (this.undoStepLvl > 0) {
      this.pendingMacro?.add(tool);
    } else {
      ctx.toolstack.execTool(ctx, tool);
    }
  }

  perform(ctx: GraphContext, edit: GraphEdit): void {
    switch (edit.kind) {
      case "moveNode": {
        const tool = new MoveNodeOp();
        tool.inputs.graphPath.setValue(edit.graphPath);
        tool.inputs.nodeId.setValue(JSON.stringify(edit.nodeId));
        tool.inputs.x.setValue(edit.x);
        tool.inputs.y.setValue(edit.y);
        this.execTool(ctx, tool);
        break;
      }
      case "addNode": {
        const tool = new AddNodeOp();
        tool.inputs.graphPath.setValue(edit.graphPath);
        tool.inputs.nodeType.setValue(edit.nodeType);
        tool.inputs.x.setValue(edit.x);
        tool.inputs.y.setValue(edit.y);
        tool.inputs.ref.setValue(edit.ref ?? "");
        this.execTool(ctx, tool);
        break;
      }
      case "createGroup": {
        const tool = new CreateGroupOp();
        tool.inputs.graphPath.setValue(edit.graphPath);
        tool.inputs.storePath.setValue(edit.storePath);
        tool.inputs.nodeIds.setValue(JSON.stringify(edit.nodeIds));
        tool.inputs.ref.setValue(this._refFor(ctx, edit) ?? "");
        this.execTool(ctx, tool);
        break;
      }
      case "ungroup": {
        const tool = new UngroupOp();
        tool.inputs.graphPath.setValue(edit.graphPath);
        tool.inputs.nodeId.setValue(JSON.stringify(edit.nodeId));
        this.execTool(ctx, tool);
        break;
      }
      case "deleteNode": {
        const tool = new DeleteNodeOp();
        tool.inputs.graphPath.setValue(edit.graphPath);
        tool.inputs.nodeId.setValue(JSON.stringify(edit.nodeId));
        this.execTool(ctx, tool);
        break;
      }
      case "replaceNode": {
        const tool = new ReplaceNodeOp();
        tool.inputs.graphPath.setValue(edit.graphPath);
        tool.inputs.nodeId.setValue(JSON.stringify(edit.nodeId));
        tool.inputs.newType.setValue(edit.newType);
        this.execTool(ctx, tool);
        break;
      }
      case "connect":
      case "disconnect": {
        const tool = edit.kind === "connect" ? new ConnectOp() : new DisconnectOp();
        tool.inputs.graphPath.setValue(edit.graphPath);
        tool.inputs.srcNode.setValue(JSON.stringify(edit.srcNode));
        tool.inputs.srcSocket.setValue(edit.srcSocket);
        tool.inputs.dstNode.setValue(JSON.stringify(edit.dstNode));
        tool.inputs.dstSocket.setValue(edit.dstSocket);
        this.execTool(ctx, tool);
        break;
      }
      case "arrange":
      case "moveNodes": {
        const macro = new ToolMacro<GraphContext>();
        for (const move of edit.moves) {
          const tool = new MoveNodeOp();
          tool.inputs.graphPath.setValue(edit.graphPath);
          tool.inputs.nodeId.setValue(JSON.stringify(move.nodeId));
          tool.inputs.x.setValue(move.x);
          tool.inputs.y.setValue(move.y);
          macro.add(tool);
        }
        this.execTool(ctx, macro);
        break;
      }
      case "duplicateNode": {
        const tool = new DuplicateNodeOp();
        tool.inputs.graphPath.setValue(edit.graphPath);
        tool.inputs.nodeId.setValue(JSON.stringify(edit.nodeId));
        tool.inputs.x.setValue(edit.x);
        tool.inputs.y.setValue(edit.y);
        this.execTool(ctx, tool);
        break;
      }
      case "exposeEntry": {
        const tool = new ExposeEntryOp();
        tool.inputs.graphPath.setValue(edit.graphPath);
        tool.inputs.kind.setValue(edit.entry.kind);
        tool.inputs.nodeId.setValue(JSON.stringify(edit.entry.nodeId));
        tool.inputs.propKey.setValue(edit.entry.propKey ?? "");
        tool.inputs.label.setValue(edit.entry.label ?? "");
        tool.inputs.at.setValue(edit.at ?? -1);
        this.execTool(ctx, tool);
        break;
      }
      case "reorderEntry": {
        const tool = new ReorderEntryOp();
        tool.inputs.graphPath.setValue(edit.graphPath);
        tool.inputs.from.setValue(edit.from);
        tool.inputs.to.setValue(edit.to);
        this.execTool(ctx, tool);
        break;
      }
      case "repointEntry": {
        const tool = new RepointEntryOp();
        tool.inputs.graphPath.setValue(edit.graphPath);
        tool.inputs.index.setValue(edit.index);
        tool.inputs.nodeId.setValue(JSON.stringify(edit.nodeId));
        tool.inputs.propKey.setValue(edit.propKey as unknown as string);
        this.execTool(ctx, tool);
        break;
      }
      case "removeEntry": {
        const tool = new RemoveEntryOp();
        tool.inputs.graphPath.setValue(edit.graphPath);
        tool.inputs.index.setValue(edit.index);
        this.execTool(ctx, tool);
        break;
      }
      case "addBoundary": {
        const tool = new AddGroupSocketOp();
        tool.inputs.graphPath.setValue(edit.graphPath);
        tool.inputs.dir.setValue(edit.dir);
        tool.inputs.key.setValue(edit.key);
        tool.inputs.socketType.setValue(edit.socketType);
        this.execTool(ctx, tool);
        break;
      }
      case "removeBoundary": {
        const tool = new RemoveGroupSocketOp();
        tool.inputs.graphPath.setValue(edit.graphPath);
        tool.inputs.dir.setValue(edit.dir);
        tool.inputs.key.setValue(edit.key);
        this.execTool(ctx, tool);
        break;
      }
    }
  }

  private _graph(ctx: GraphContext, path: string): Graph | undefined {
    let value: unknown;
    try {
      value = ctx.api.getValue(ctx, path);
    } catch {
      value = undefined;
    }
    return value instanceof Graph ? value : undefined;
  }
}
