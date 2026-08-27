import type { ToolProperty } from "../path-controller/toolsys/toolprop";
import { Graph } from "./graph";
import { Node } from "./node";
import type { NodeTypeConstructor } from "./node";
import type { SocketTypeConstructor } from "./socket";

/**
 * The flat graph description a model authors, validated against the type registries
 * with diagnostics rather than a parse failure. See documentation/NodeEditor.md.
 */
export interface GraphDSL {
  nodes?: GraphDSLNode[];
  links?: GraphDSLLink[];
}

export interface GraphDSLNode {
  id: string | number;
  /** A node typeName from the registry the DSL is validated against. */
  type: string;
  /** Values by key, set on the node's own props. No fallback to input/output defaults. */
  props?: Record<string, unknown>;
  /** Values by key, set on the matching input socket's editable default. */
  inputs?: Record<string, unknown>;
  /** Values by key, set on the matching output socket's editable default. */
  outputs?: Record<string, unknown>;
}

/** [fromNodeId, outputKey, toNodeId, inputKey]. */
export type GraphDSLLink = [string | number, string, string | number, string];

/** The type registries a description is validated against and built from. */
export interface DSLRegistries {
  nodeTypes: ReadonlyMap<string, NodeTypeConstructor>;
  socketTypes: ReadonlyMap<string, SocketTypeConstructor>;
}

export interface DSLDiagnostic {
  /** A stable machine-readable id, e.g. "unknown-node-type". */
  code: string;
  /** Names the offending entry, so a model can repair its own output. */
  message: string;
  /** The entry's location in the input, e.g. "nodes[2].props.bias". */
  path: string;
}

/** The diagnostics buildGraphFromDSL would produce, without keeping the graph. */
export function validateGraphDSL(input: unknown, registries: DSLRegistries): DSLDiagnostic[] {
  return buildGraphFromDSL(input, registries).diagnostics;
}

/**
 * Builds a Graph from a model-authored description. Never throws: every bad entry
 * (unknown node type, unrecognized prop or link, a value the property refuses, a link
 * between uncoercible types) is dropped and reported, and the salvageable graph is
 * returned alongside the diagnostics.
 */
export function buildGraphFromDSL(
  input: unknown,
  registries: DSLRegistries
): { graph: Graph; diagnostics: DSLDiagnostic[] } {
  const graph = new Graph();
  const diagnostics: DSLDiagnostic[] = [];
  const byId = new Map<string | number, Node>();

  const report = (code: string, path: string, detail: string): void => {
    diagnostics.push({ code, message: `${path}: ${detail}`, path });
  };

  if (!isRecord(input)) {
    report("bad-shape", "", "the input is not an object with nodes and links");
    return { graph, diagnostics };
  }

  const buildNode = (entry: unknown, path: string): void => {
    if (!isRecord(entry)) {
      report("bad-shape", path, "the entry is not a {id, type, props, inputs, outputs} object");
      return;
    }

    const { id, type } = entry;
    if (typeof id !== "string" && typeof id !== "number") {
      report("bad-shape", path, "the entry is missing a string or number id");
      return;
    }
    if (typeof type !== "string") {
      report("bad-shape", path, `node '${id}' is missing a node type string`);
      return;
    }
    if (byId.has(id)) {
      report("duplicate-node-id", path, `id '${id}' repeats an earlier node; entry dropped`);
      return;
    }

    const cls = registries.nodeTypes.get(type);
    if (cls === undefined) {
      report("unknown-node-type", path, `node '${id}' has unknown node type '${type}'`);
      return;
    }

    const node = new cls();
    node.id = id;
    graph.add(node);
    byId.set(id, node);

    applyBlock(node, entry.props, "props", (key) => node.props[key], "prop", `${path}.props`);
    applyBlock(
      node,
      entry.inputs,
      "inputs",
      (key) => node.inputs[key]?.defaultProp,
      "input default",
      `${path}.inputs`
    );
    applyBlock(
      node,
      entry.outputs,
      "outputs",
      (key) => node.outputs[key]?.defaultProp,
      "output default",
      `${path}.outputs`
    );
  };

  const applyBlock = (
    node: Node,
    block: unknown,
    fieldName: string,
    resolve: (key: string) => ToolProperty | undefined,
    kindLabel: string,
    path: string
  ): void => {
    if (block === undefined) {
      return;
    }
    if (!isRecord(block)) {
      report("bad-shape", path, `node '${node.id}' has a non-object ${fieldName} field`);
      return;
    }
    for (const key in block) {
      applyProp(node, resolve(key), key, block[key], `${path}.${key}`, kindLabel);
    }
  };

  const applyProp = (
    node: Node,
    target: ToolProperty | undefined,
    key: string,
    value: unknown,
    path: string,
    kindLabel: string
  ): void => {
    if (target === undefined) {
      report("unknown-prop", path, `node type '${node.def.typeName}' has no ${kindLabel} '${key}'`);
      return;
    }

    // Parsed on a scratch copy first: setValue can write partial state before it throws.
    try {
      target.copy().setValue(value);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      report("bad-prop-value", path, `the property refused the value: ${detail}`);
      return;
    }
    target.setValue(value);
  };

  const buildLink = (entry: unknown, path: string): void => {
    if (
      !Array.isArray(entry) ||
      entry.length !== 4 ||
      (typeof entry[0] !== "string" && typeof entry[0] !== "number") ||
      typeof entry[1] !== "string" ||
      (typeof entry[2] !== "string" && typeof entry[2] !== "number") ||
      typeof entry[3] !== "string"
    ) {
      report("bad-shape", path, "the entry is not [fromNode, outputKey, toNode, inputKey]");
      return;
    }

    const [fromId, outKey, toId, inKey] = entry as GraphDSLLink;

    const from = byId.get(fromId);
    if (from === undefined) {
      report("unknown-link-node", path, `no node with id '${fromId}'`);
      return;
    }
    const to = byId.get(toId);
    if (to === undefined) {
      report("unknown-link-node", path, `no node with id '${toId}'`);
      return;
    }

    const src = from.outputs[outKey];
    if (src === undefined) {
      report(
        "unknown-link-socket",
        path,
        `node '${fromId}' (${from.def.typeName}) has no output socket '${outKey}'`
      );
      return;
    }
    const dst = to.inputs[inKey];
    if (dst === undefined) {
      report(
        "unknown-link-socket",
        path,
        `node '${toId}' (${to.def.typeName}) has no input socket '${inKey}'`
      );
      return;
    }

    if (!dst.coerce(src, { dryRun: true })) {
      report(
        "link-type-mismatch",
        path,
        `'${src.type}' output '${outKey}' cannot feed '${dst.type}' input '${inKey}'; ` +
          "no coercion between the types"
      );
      return;
    }

    if (src.edges.includes(dst)) {
      report("duplicate-link", path, "the entry repeats an earlier link; dropped");
      return;
    }
    // Kept-first beats connect's replace-last here: a validator's output should not
    // depend on which of two conflicting links comes later.
    if (!dst.multiSocket && dst.edges.length > 0) {
      report(
        "link-input-occupied",
        path,
        `input '${inKey}' on node '${toId}' takes one link and already has one; dropped`
      );
      return;
    }

    graph.connect(src, dst);
  };

  if (input.nodes !== undefined && !Array.isArray(input.nodes)) {
    report("bad-shape", "nodes", "nodes is not an array");
  } else {
    (input.nodes ?? []).forEach((entry: unknown, i: number) => buildNode(entry, `nodes[${i}]`));
  }

  if (input.links !== undefined && !Array.isArray(input.links)) {
    report("bad-shape", "links", "links is not an array");
  } else {
    (input.links ?? []).forEach((entry: unknown, i: number) => buildLink(entry, `links[${i}]`));
  }

  return { graph, diagnostics };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
