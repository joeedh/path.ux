import type { ContextLike } from "../../path-controller/controller/controller_abstract";
import { Graph } from "../../graph/graph";
import { MoveNodeOp } from "../../graph/graph_ops";
import type { GraphId } from "../../graph/graph_types";

/** One proposed graph mutation, described as data so a host can route it. */
export type GraphEdit = {
  kind: "moveNode";
  graphPath: string;
  nodeId: GraphId;
  x: number;
  y: number;
};

export type EditVerdict = { ok: true } | { ok: false; reason: string };

/**
 * The gesture seam: every mutating gesture in the node-graph view asks a
 * delegate to judge and perform its edit. The default implementation
 * dispatches the graph module's ToolOps; a host with its own command system
 * installs a delegate that routes edits there instead. A check verdict must
 * match what perform would decide, so a refusal can show mid-gesture.
 */
export interface NodeGraphDelegate {
  check(ctx: ContextLike, edit: GraphEdit): EditVerdict;
  perform(ctx: ContextLike, edit: GraphEdit): void;
}

/**
 * The default delegate. check consults the graph's own refusal — a node move
 * is a structural edit, so it is refused inside a group instance's subgraph —
 * and perform dispatches the graph module's ToolOps on ctx.toolstack.
 */
export class ToolOpDelegate implements NodeGraphDelegate {
  check(ctx: ContextLike, edit: GraphEdit): EditVerdict {
    let graph: unknown;
    try {
      graph = ctx.api.getValue(ctx, edit.graphPath);
    } catch {
      graph = undefined;
    }
    if (!(graph instanceof Graph)) {
      return { ok: false, reason: `'${edit.graphPath}' does not resolve to a graph` };
    }

    const refusal = graph.structuralEditsRefused();
    if (refusal !== undefined) {
      return { ok: false, reason: refusal };
    }
    return { ok: true };
  }

  perform(ctx: ContextLike, edit: GraphEdit): void {
    const tool = new MoveNodeOp();
    tool.inputs.graphPath.setValue(edit.graphPath);
    tool.inputs.nodeId.setValue(JSON.stringify(edit.nodeId));
    tool.inputs.x.setValue(edit.x);
    tool.inputs.y.setValue(edit.y);
    ctx.toolstack.execTool(ctx, tool);
  }
}
