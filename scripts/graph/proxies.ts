import type { Graph } from "./graph";
import { definitionOfSubgraph, GroupInputNode, GroupOutputNode } from "./group";
import type { GraphId } from "./graph_types";

/** The sentence an edit that would take a definition's proxy node away is refused with. */
const PROXY_STAYS = "a group keeps its own input and output nodes";

export type ProxyEditKind = "deleteNode" | "replaceNode" | "duplicateNode";

/**
 * Returns why a node of a definition can't be deleted, replaced or duplicated, or undefined
 * when it can. A definition uses the first proxy node of each kind, so that one stays. Further
 * ones can be deleted or replaced, and none can be duplicated.
 */
export function proxyEditRefused(
  graph: Graph,
  nodeId: GraphId,
  kind: ProxyEditKind
): string | undefined {
  const node = graph.nodeIdMap.get(nodeId);
  const cls = [GroupInputNode, GroupOutputNode].find((c) => node instanceof c);
  if (cls === undefined || definitionOfSubgraph(graph) === undefined) {
    return undefined;
  }
  const stays = kind === "duplicateNode" || graph.nodes.find((n) => n instanceof cls) === node;
  return stays ? PROXY_STAYS : undefined;
}
