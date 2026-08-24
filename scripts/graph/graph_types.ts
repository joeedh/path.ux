/**
 * Shared primitives for the node graph library (scripts/graph). Kept apart from
 * socket.ts so later stages (node, graph, group) can import them without pulling
 * in the socket module.
 */

/** Identity within one graph. Numbers come from the graph's own counter; strings are for client-chosen ids. */
export type GraphId = number | string;

/** Placeholder id a socket or node carries until a graph assigns one. */
export const NO_ID = -1;

export type SocketDir = "in" | "out";

/** A CSS color string. */
export type Color = string;

/**
 * The subset of Node a socket needs from its owner. Node implements it in stage 3,
 * which is what lets the socket module compile and test on its own.
 */
export interface ISocketOwner {
  id: GraphId;
  graph: unknown;
  flagDirty(): void;
}
