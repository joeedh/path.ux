import type { ContextLike } from "../../path-controller/controller/controller_abstract";
import { ToolMacro, ToolOp } from "../../path-controller/toolsys/toolsys";
import {
  ToolProperty,
  StringProperty,
  IntProperty,
  EnumProperty,
  FlagProperty,
  ListProperty,
} from "../../path-controller/toolsys/toolprop";
import { Graph } from "../../graph/graph";
import {
  AddNodeOp,
  ConnectOp,
  DeleteNodeOp,
  DisconnectOp,
  MoveNodeOp,
  ReplaceNodeOp,
  SetNodePropOp,
} from "../../graph/graph_ops";
import { getNodeClass, nodePropKeys, NodePropName, nodePropTarget } from "../../graph/node";
import type { GroupDef, ExposedEntry } from "../../graph/group";
import type { GraphId } from "../../graph/graph_types";

/** One node's destination in a multi-node move. */
export interface NodeMove {
  nodeId: GraphId;
  x: number;
  y: number;
}

/** One proposed graph mutation, described as data so a host can route it. */
export type GraphEdit =
  | { kind: "moveNode"; graphPath: string; nodeId: GraphId; x: number; y: number }
  | { kind: "moveNodes"; graphPath: string; moves: NodeMove[] }
  | { kind: "addNode"; graphPath: string; nodeType: string; x: number; y: number }
  | { kind: "deleteNode"; graphPath: string; nodeId: GraphId }
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
  | { kind: "exposeEntry"; graphPath: string; ref: string; def: GroupDef; entry: ExposedEntry }
  | {
      kind: "reorderEntry";
      graphPath: string;
      ref: string;
      def: GroupDef;
      from: number;
      to: number;
    }
  | {
      kind: "repointEntry";
      graphPath: string;
      ref: string;
      def: GroupDef;
      index: number;
      nodeId: GraphId;
      propKey: NodePropName;
    }
  | { kind: "removeEntry"; graphPath: string; ref: string; def: GroupDef; index: number };

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
 */
export interface NodeGraphDelegate {
  undoStepBegin(ctx: GraphContext): void;
  check(ctx: GraphContext, edit: GraphEdit): EditVerdict;
  perform(ctx: GraphContext, edit: GraphEdit): void;
  undoStepEnd(ctx: GraphContext): void;
}

/** The exposure kinds edit a group definition rather than the resolved graph. */
function isExposureEdit(edit: GraphEdit): boolean {
  return (
    edit.kind === "exposeEntry" ||
    edit.kind === "reorderEntry" ||
    edit.kind === "repointEntry" ||
    edit.kind === "removeEntry"
  );
}
/*
type SelectOpType = "select-nodes" | "deselect-nodes" | "clear" | "all" | 'select-sockets' | 'deselect-sockets';

export class SelectOp<CTX extends GraphContext = GraphContext> extends ToolOp<
  {
    type: EnumProperty<SelectOpType>;
    stringIds: ListProperty<ToolProperty<GraphId>>;
  },
  {},
  CTX
> {
  static tooldef() {
    return {
      toolpath: 'pathux.graph.select',
      inputs: {
        type: new EnumProperty('select', {
          select: 'select',
          deselect: 'deselect',
          clear: 'clear',
          all: 'all'
        }),
        ids: new ListProperty()
      },
      outputs: {},
      description: '',
      uiname: '',
    }
  }

  exec(ctx: CTX) {
    const {type, ids} = this.getInputs()

    const idsList: GraphId[] = []
    for (const id of ids.getValue()) {
      idsList.push(id.getValue())
    }

    switch (type) {
      case 'select-nodes':
        ctx.selectNodes(idsList)
        break;
      case 'deselect-nodes':
        ctx.deselectNodes(idsList)
        break;
      case 'clear':
        ctx.clearSelection()
        break;
      case 'all':
        ctx.selectAll()
        break;
      case 'select-sockets':
        ctx.selectSockets(idsList)
        break;
      case 'deselect-sockets':
        ctx.deselectSockets(idsList)
        break;
    }
  }
}
*/

/**
 * The default delegate. check consults the graph's own refusal — every
 * graph-mutating kind is a structural edit, so it is refused inside a group
 * instance's subgraph — plus per-kind feasibility (a connect's sockets must
 * exist and coerce, an addNode's type must be registered). perform dispatches
 * the graph module's ToolOps on ctx.toolstack; the composite kinds (arrange,
 * moveNodes, duplicateNode) go through one ToolMacro so each is a single undo
 * entry. The exposure kinds mutate the definition's exposed list in place and
 * save it through the graph's groupSaver seam; they carry no undo.
 */
export class ToolOpDelegate implements NodeGraphDelegate {
  private undoStepLvl = 0;
  private pendingMacro?: ToolMacro<GraphContext>;

  undoStepBegin(ctx: GraphContext): void {
    if (this.undoStepLvl === 0) {
      this.pendingMacro = new ToolMacro<GraphContext>();
    }
    this.undoStepLvl++;
  }

  undoStepEnd(ctx: GraphContext): void {
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

    if (isExposureEdit(edit)) {
      return { ok: true };
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
        this._performDuplicate(ctx, edit);
        break;
      }
      case "exposeEntry":
      case "reorderEntry":
      case "repointEntry":
      case "removeEntry": {
        this._performExposure(ctx, edit);
        break;
      }
    }
  }

  private _performDuplicate(
    ctx: GraphContext,
    edit: Extract<GraphEdit, { kind: "duplicateNode" }>
  ): void {
    const graph = this._graph(ctx, edit.graphPath);
    const source = graph?.nodeIdMap.get(edit.nodeId);
    if (source === undefined) {
      return;
    }

    const macro = new ToolMacro<GraphContext>();

    const addOp = new AddNodeOp();
    addOp.inputs.graphPath.setValue(edit.graphPath);
    addOp.inputs.nodeType.setValue(source.def.typeName);
    addOp.inputs.x.setValue(edit.x);
    addOp.inputs.y.setValue(edit.y);
    macro.add(addOp);

    // The copy's id exists only once addOp runs, so each set op receives it
    // through a connect callback; the macro runs each tool's undoPre directly
    // before its own exec, which is what makes the late id safe to record.
    for (const key of nodePropKeys(source)) {
      const target = nodePropTarget(source, key);
      if (!target?.wasSet) {
        continue;
      }

      const setOp = new SetNodePropOp();
      setOp.inputs.graphPath.setValue(edit.graphPath);
      setOp.inputs.propKey.setValue(key as unknown as string);
      const prop = (target.copy() as ToolProperty).ignoreLastValue();
      (setOp.inputs as Record<string, unknown>).value = prop;

      macro.add(setOp);
      macro.connectCB(
        addOp,
        setOp,
        (src, dst) => {
          (dst as SetNodePropOp).inputs.nodeId.setValue(
            (src as AddNodeOp).outputs.nodeId.getValue()
          );
        },
        undefined
      );
    }

    this.execTool(ctx, macro);
  }

  private _performExposure(
    ctx: GraphContext,
    edit: Extract<
      GraphEdit,
      { kind: "exposeEntry" | "reorderEntry" | "repointEntry" | "removeEntry" }
    >
  ): void {
    const exposed = edit.def.exposed;

    switch (edit.kind) {
      case "exposeEntry":
        exposed.push(edit.entry);
        break;
      case "reorderEntry": {
        if (edit.from < 0 || edit.from >= exposed.length) {
          return;
        }
        const [entry] = exposed.splice(edit.from, 1);
        const to = Math.min(Math.max(edit.to, 0), exposed.length);
        exposed.splice(to, 0, entry);
        break;
      }
      case "repointEntry": {
        const entry = exposed[edit.index];
        if (entry === undefined) {
          return;
        }
        // Edited in place, so the entry keeps its position in the list.
        entry.nodeId = edit.nodeId;
        entry.propKey = edit.propKey;
        break;
      }
      case "removeEntry":
        exposed.splice(edit.index, 1);
        break;
    }

    void this._graph(ctx, edit.graphPath)?.groupSaver?.(edit.ref, edit.def);
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
