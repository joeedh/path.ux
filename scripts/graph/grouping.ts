import * as nstructjs from "../path-controller/util/nstructjs";
import { Graph } from "./graph";
import { nodePropTarget } from "./node";
import type { Node, NodePropName } from "./node";
import { getSocketClass } from "./socket";
import type { NodeSocketBase } from "./socket";
import { ExposedEntry, GroupDef, GroupInputNode, GroupNode, GroupOutputNode } from "./group";
import type { GraphId, SocketDir } from "./graph_types";
import { NO_ID } from "./graph_types";

/**
 * The pure half of group authoring: grouping a selection, taking an instance apart, and
 * editing a definition's boundary and forwarded rows. Every function here mutates plain
 * graph objects and answers a refusal sentence rather than throwing, so a ToolOp wraps
 * one with undo and a host without a toolstack calls it directly.
 */

/** The sentence a function answers instead of acting. */
export interface Refusal {
  refusal: string;
}

export function isRefusal(x: unknown): x is Refusal {
  return typeof x === "object" && x !== null && "refusal" in x;
}

/** One link, held as ids and socket keys so it can be remade after its nodes move. */
export interface LinkRecord {
  srcId: GraphId;
  srcKey: string;
  dstId: GraphId;
  dstKey: string;
}

/** Every link on node's sockets, in both directions. */
export function captureLinks(node: Node): LinkRecord[] {
  const out: LinkRecord[] = [];
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

/** Remakes recorded links, skipping records whose endpoints no longer exist. */
export function restoreLinks(graph: Graph, records: LinkRecord[]): void {
  for (const r of records) {
    const src = graph.nodeIdMap.get(r.srcId)?.outputs[r.srcKey];
    const dst = graph.nodeIdMap.get(r.dstId)?.inputs[r.dstKey];
    if (src !== undefined && dst !== undefined) {
      graph.connect(src, dst);
    }
  }
}

/** A group input the cut derives: one outside output and the selected inputs it feeds. */
export interface BoundaryInput {
  key: string;
  source: NodeSocketBase;
  targets: NodeSocketBase[];
}

/** A group output the cut derives: one selected output and the outside inputs it feeds. */
export interface BoundaryOutput {
  key: string;
  source: NodeSocketBase;
  targets: NodeSocketBase[];
}

export interface GroupPlan {
  nodes: Node[];
  inputs: BoundaryInput[];
  outputs: BoundaryOutput[];
}

function isProxy(n: Node): boolean {
  return n instanceof GroupInputNode || n instanceof GroupOutputNode;
}

/** key, or key_2, key_3 … until it is absent from used; the chosen key is added to used. */
function uniqueKey(key: string, used: Set<string>): string {
  let k = key;
  for (let i = 2; used.has(k); i++) {
    k = `${key}_${i}`;
  }
  used.add(k);
  return k;
}

/**
 * What grouping ids would produce: the nodes that move and the boundary the cut
 * derives. Each outside output feeding a selected input becomes one group input, keyed
 * and typed by the first inner socket it reaches in selection order; each selected
 * output feeding an outside input becomes one group output.
 */
export function groupPlan(graph: Graph, ids: readonly GraphId[]): GroupPlan | Refusal {
  const refused = graph.structuralEditsRefused();
  if (refused !== undefined) {
    return { refusal: refused };
  }
  if (ids.length === 0) {
    return { refusal: "select at least one node to group" };
  }

  const nodes: Node[] = [];
  const seen = new Set<Node>();
  for (const id of ids) {
    const n = graph.nodeIdMap.get(id);
    if (n === undefined) {
      return { refusal: `no node with id ${String(id)}` };
    }
    if (isProxy(n)) {
      return { refusal: "the group's own input and output nodes stay where they are" };
    }
    if (!seen.has(n)) {
      seen.add(n);
      nodes.push(n);
    }
  }

  const inputs: BoundaryInput[] = [];
  const inKeys = new Set<string>();
  for (const n of nodes) {
    for (const k in n.inputs) {
      const sock = n.inputs[k];
      for (const e of sock.edges) {
        if (seen.has(e.owningNode as Node)) {
          continue;
        }
        const entry = inputs.find((x) => x.source === e);
        if (entry !== undefined) {
          entry.targets.push(sock);
        } else {
          inputs.push({ key: uniqueKey(k, inKeys), source: e, targets: [sock] });
        }
      }
    }
  }

  const outputs: BoundaryOutput[] = [];
  const outKeys = new Set<string>();
  for (const n of nodes) {
    for (const k in n.outputs) {
      const sock = n.outputs[k];
      const targets = sock.edges.filter((e) => !seen.has(e.owningNode as Node));
      if (targets.length > 0) {
        outputs.push({ key: uniqueKey(k, outKeys), source: sock, targets });
      }
    }
  }

  return { nodes, inputs, outputs };
}

interface Bounds {
  min: [number, number];
  max: [number, number];
}

function boundsOf(nodes: readonly Node[]): Bounds {
  const b: Bounds = {
    min: [Infinity, Infinity],
    max: [-Infinity, -Infinity],
  };
  for (const n of nodes) {
    b.min[0] = Math.min(b.min[0], n.pos[0]);
    b.min[1] = Math.min(b.min[1], n.pos[1]);
    b.max[0] = Math.max(b.max[0], n.pos[0] + n.size[0]);
    b.max[1] = Math.max(b.max[1], n.pos[1] + n.size[1]);
  }
  return b;
}

/** Horizontal distance between a proxy node and the nodes it stands beside. */
const PROXY_GAP = 60;

export interface CreatedGroup {
  def: GroupDef;
  node: GroupNode;
  plan: GroupPlan;
  /** The links the cut severed, as they were in graph, for undo. */
  crossing: LinkRecord[];
}

/**
 * Moves the nodes ids name into a new definition and puts an instance in their place.
 * The nodes keep their ids, positions, links and authored values; the instance starts
 * with no overrides and its boundary is wired to what the nodes were connected to.
 * Throws on what groupPlan refuses, so check the plan first.
 */
export function createGroup(graph: Graph, ids: readonly GraphId[], ref: string): CreatedGroup {
  const plan = groupPlan(graph, ids);
  if (isRefusal(plan)) {
    throw new Error(plan.refusal);
  }
  const { nodes } = plan;
  const selected = new Set(nodes);

  const internal: LinkRecord[] = [];
  const crossing: LinkRecord[] = [];
  for (const n of nodes) {
    for (const r of captureLinks(n)) {
      const inner =
        selected.has(graph.nodeIdMap.get(r.srcId)!) && selected.has(graph.nodeIdMap.get(r.dstId)!);
      if (inner) {
        // both ends selected, so the record shows up once per end
        if (!internal.some((x) => sameLink(x, r))) {
          internal.push(r);
        }
      } else {
        crossing.push(r);
      }
    }
  }

  const bounds = boundsOf(nodes);
  const centre: [number, number] = [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
  ];

  for (const n of nodes) {
    graph.remove(n);
  }

  const def = new GroupDef();
  for (const n of nodes) {
    def.subgraph.add(n);
  }
  restoreLinks(def.subgraph, internal);

  for (const entry of plan.inputs) {
    const inner = def.declareInput(entry.key, entry.targets[0].copy());
    for (const t of entry.targets) {
      def.subgraph.connect(inner, t);
    }
  }
  for (const entry of plan.outputs) {
    const inner = def.declareOutput(entry.key, entry.source.copy());
    def.subgraph.connect(entry.source, inner);
  }

  const gin = def.inputNode();
  gin.pos[0] = bounds.min[0] - PROXY_GAP - gin.size[0];
  gin.pos[1] = centre[1] - gin.size[1] / 2;
  const gout = def.outputNode();
  gout.pos[0] = bounds.max[0] + PROXY_GAP;
  gout.pos[1] = centre[1] - gout.size[1] / 2;

  const node = new GroupNode();
  node.pos[0] = centre[0] - node.size[0] / 2;
  node.pos[1] = centre[1] - node.size[1] / 2;
  graph.add(node);
  node.setDefinition(ref, def);
  node.syncToDefinition();

  for (const entry of plan.inputs) {
    graph.connect(entry.source, node.inputs[entry.key]);
  }
  for (const entry of plan.outputs) {
    for (const t of entry.targets) {
      graph.connect(node.outputs[entry.key], t);
    }
  }

  return { def, node, plan, crossing };
}

function sameLink(a: LinkRecord, b: LinkRecord): boolean {
  return (
    a.srcId === b.srcId && a.srcKey === b.srcKey && a.dstId === b.dstId && a.dstKey === b.dstKey
  );
}

/** What dissolveGroup took apart, so redoGroup can put the same objects back. */
export interface Dissolved {
  /** Every link inside the definition that touched an inner node, proxy ends included. */
  inner: LinkRecord[];
  /** The inner links only, valid in the parent graph since ids were kept. */
  internal: LinkRecord[];
}

/**
 * The inverse of createGroup for undo: the same node objects leave the definition's
 * subgraph and return to graph with their links, and the instance is removed. The
 * definition is left holding only its proxies.
 */
export function dissolveGroup(graph: Graph, created: CreatedGroup): Dissolved {
  const { def, node, crossing } = created;
  const innerNodes = def.subgraph.nodes.filter((n) => !isProxy(n));
  const innerSet = new Set(innerNodes);

  const inner: LinkRecord[] = [];
  const internal: LinkRecord[] = [];
  for (const n of innerNodes) {
    for (const r of captureLinks(n)) {
      if (inner.some((x) => sameLink(x, r))) {
        continue;
      }
      inner.push(r);
      const a = def.subgraph.nodeIdMap.get(r.srcId);
      const b = def.subgraph.nodeIdMap.get(r.dstId);
      if (a !== undefined && b !== undefined && innerSet.has(a) && innerSet.has(b)) {
        internal.push(r);
      }
    }
  }

  graph.remove(node);
  for (const n of innerNodes) {
    def.subgraph.remove(n);
  }
  for (const n of innerNodes) {
    graph.add(n);
  }
  restoreLinks(graph, internal);
  restoreLinks(graph, crossing);
  return { inner, internal };
}

/** Redoes a dissolved createGroup with the same definition, instance and node objects. */
export function redoGroup(graph: Graph, created: CreatedGroup, dissolved: Dissolved): void {
  const { def, node, plan } = created;
  for (const n of plan.nodes) {
    graph.remove(n);
  }
  for (const n of plan.nodes) {
    def.subgraph.add(n);
  }
  restoreLinks(def.subgraph, dissolved.inner);

  graph.add(node);
  for (const entry of plan.inputs) {
    graph.connect(entry.source, node.inputs[entry.key]);
  }
  for (const entry of plan.outputs) {
    for (const t of entry.targets) {
      graph.connect(node.outputs[entry.key], t);
    }
  }
}

/** A standalone physical copy with ids preserved, via a JSON round trip. */
function copyGraph(g: Graph): Graph {
  return nstructjs.readJSON(nstructjs.writeJSON(g), Graph);
}

/**
 * A copy of node with no id, no graph and no links. A group instance's copy carries its
 * ref, its instance subgraph, its overrides and its definition.
 */
export function cloneNode<T extends Node>(node: T): T {
  const cls = node.constructor as nstructjs.StructableClass<T>;
  const copy = nstructjs.readJSON(nstructjs.writeJSON(node), cls);
  copy.id = NO_ID;
  copy.graph = undefined;
  if (node instanceof GroupNode && copy instanceof GroupNode && node.definition !== undefined) {
    copy.setDefinition(node.ref, node.definition);
  }
  return copy;
}

export interface Ungrouped {
  nodes: Node[];
  /** Inner id in the instance to the id the parent graph gave the inlined copy. */
  idMap: Map<GraphId, GraphId>;
  /** The instance's links as they were, for undo. */
  links: LinkRecord[];
}

/**
 * Inlines a copy of the instance's subgraph, overrides included, where the instance
 * stood, and removes the instance. A numeric id is reallocated by the parent; a string
 * id is kept when free and suffixed otherwise. ids, when given, fixes the ids the copies
 * take so a redo lands on the same ones.
 */
export function ungroup(
  graph: Graph,
  node: GroupNode,
  ids?: Map<GraphId, GraphId>
): Ungrouped | Refusal {
  const refused = graph.structuralEditsRefused();
  if (refused !== undefined) {
    return { refusal: refused };
  }
  if (node.graph !== graph) {
    return { refusal: `no group node with id ${String(node.id)}` };
  }

  const copy = copyGraph(node.subgraph);
  const inner = copy.nodes.filter((n) => !isProxy(n));
  const gin = copy.nodes.find((n): n is GroupInputNode => n instanceof GroupInputNode);
  const gout = copy.nodes.find((n): n is GroupOutputNode => n instanceof GroupOutputNode);

  const innerSet = new Set(inner);
  const internal: LinkRecord[] = [];
  for (const n of inner) {
    for (const r of captureLinks(n)) {
      const a = copy.nodeIdMap.get(r.srcId);
      const b = copy.nodeIdMap.get(r.dstId);
      if (a !== undefined && b !== undefined && innerSet.has(a) && innerSet.has(b)) {
        if (!internal.some((x) => sameLink(x, r))) {
          internal.push(r);
        }
      }
    }
  }

  // What each boundary key reaches inside, by inner id and socket key.
  const inTargets = new Map<string, { id: GraphId; key: string }[]>();
  if (gin !== undefined) {
    for (const k in gin.outputs) {
      inTargets.set(
        k,
        gin.outputs[k].edges.map((e) => ({ id: e.owningNode!.id, key: e.name }))
      );
    }
  }
  const outSources = new Map<string, { id: GraphId; key: string }>();
  if (gout !== undefined) {
    for (const k in gout.inputs) {
      const e = gout.inputs[k].edges[0];
      if (e !== undefined) {
        outSources.set(k, { id: e.owningNode!.id, key: e.name });
      }
    }
  }

  const links = captureLinks(node);
  const outside = new Map<string, NodeSocketBase[]>();
  for (const k in node.inputs) {
    outside.set(`in:${k}`, [...node.inputs[k].edges]);
  }
  for (const k in node.outputs) {
    outside.set(`out:${k}`, [...node.outputs[k].edges]);
  }

  const b = boundsOf(inner);
  const dx = node.pos[0] + node.size[0] / 2 - (b.min[0] + b.max[0]) / 2;
  const dy = node.pos[1] + node.size[1] / 2 - (b.min[1] + b.max[1]) / 2;

  graph.remove(node);

  const idMap = new Map<GraphId, GraphId>();
  for (const n of inner) {
    const oldId = n.id;
    for (const s of n.allSockets) {
      s.edges.length = 0;
    }
    n.graph = undefined;
    const fixed = ids?.get(oldId);
    if (fixed !== undefined) {
      n.id = fixed;
    } else if (typeof oldId === "number") {
      n.id = NO_ID;
    } else {
      const taken = [...graph.nodeIdMap.keys()].filter((k): k is string => typeof k === "string");
      n.id = uniqueKey(oldId, new Set(taken));
    }
    n.pos[0] += dx;
    n.pos[1] += dy;
    graph.add(n);
    idMap.set(oldId, n.id);
  }

  restoreLinks(
    graph,
    internal.map((r) => ({ ...r, srcId: idMap.get(r.srcId)!, dstId: idMap.get(r.dstId)! }))
  );

  for (const [k, targets] of inTargets) {
    const sources = outside.get(`in:${k}`) ?? [];
    for (const t of targets) {
      const dst = graph.nodeIdMap.get(idMap.get(t.id)!)?.inputs[t.key];
      if (dst === undefined) {
        continue;
      }
      if (sources.length === 0) {
        // The inner input read the instance's boundary default through the proxy.
        const bound = node.inputs[k];
        if (bound !== undefined && bound.useDefaultValue && dst.useDefaultValue) {
          dst.defaultProp.setValue(bound.defaultProp.getValue());
        }
      }
      for (const s of sources) {
        graph.connect(s, dst);
      }
    }
  }
  for (const [k, src] of outSources) {
    const out = graph.nodeIdMap.get(idMap.get(src.id)!)?.outputs[src.key];
    if (out === undefined) {
      continue;
    }
    for (const t of outside.get(`out:${k}`) ?? []) {
      graph.connect(out, t);
    }
  }

  return { nodes: inner, idMap, links };
}

/** Undoes an ungroup: the inlined nodes leave and the instance returns with its links. */
export function regroup(graph: Graph, node: GroupNode, ungrouped: Ungrouped): void {
  for (const n of ungrouped.nodes) {
    graph.remove(n);
  }
  graph.add(node);
  restoreLinks(graph, ungrouped.links);
}

/** What exposeEntry needs to name a row. */
export interface ExposeRequest {
  kind: "prop" | "nodeUI";
  nodeId: GraphId;
  propKey?: string;
  label?: string;
}

function checkTarget(
  def: GroupDef,
  req: { kind: "prop" | "nodeUI"; nodeId: GraphId; propKey?: string }
): Refusal | undefined {
  const node = def.subgraph.nodeIdMap.get(req.nodeId);
  if (node === undefined) {
    return { refusal: `no node with id ${String(req.nodeId)} in the definition` };
  }
  if (req.kind === "prop") {
    const key = req.propKey ?? "";
    if (nodePropTarget(node, key as unknown as NodePropName) === undefined) {
      return { refusal: `${node.getUIName()} has no property '${key}'` };
    }
  }
  return undefined;
}

/** Appends a forwarded row, or inserts it at index at. */
export function exposeEntry(
  def: GroupDef,
  req: ExposeRequest,
  at?: number
): { entry: ExposedEntry; index: number } | Refusal {
  const bad = checkTarget(def, req);
  if (bad !== undefined) {
    return bad;
  }
  const propKey = req.kind === "prop" ? (req.propKey ?? "") : "";
  if (
    def.exposed.some(
      (e) =>
        e.kind === req.kind &&
        e.nodeId === req.nodeId &&
        e.propKey === (propKey as unknown as NodePropName)
    )
  ) {
    return { refusal: "that is already exposed" };
  }
  const index = at ?? def.exposed.length;
  if (index < 0 || index > def.exposed.length) {
    return { refusal: `no row ${index} to insert at` };
  }
  const entry = new ExposedEntry(req.kind, req.nodeId, propKey, req.label);
  def.exposed.splice(index, 0, entry);
  return { entry, index };
}

/** Moves the row at from so it sits at to. */
export function reorderEntry(def: GroupDef, from: number, to: number): Refusal | undefined {
  const n = def.exposed.length;
  if (from < 0 || from >= n) {
    return { refusal: `no row ${from} to move` };
  }
  if (to < 0 || to >= n) {
    return { refusal: `no row ${to} to move to` };
  }
  const [entry] = def.exposed.splice(from, 1);
  def.exposed.splice(to, 0, entry);
  return undefined;
}

/** Points the row at index at another target, keeping its label. */
export function repointEntry(
  def: GroupDef,
  index: number,
  nodeId: GraphId,
  propKey?: string
): { previous: { nodeId: GraphId; propKey: string } } | Refusal {
  const entry = def.exposed[index];
  if (entry === undefined) {
    return { refusal: `no row ${index} to repoint` };
  }
  const bad = checkTarget(def, { kind: entry.kind, nodeId, propKey });
  if (bad !== undefined) {
    return bad;
  }
  const previous = { nodeId: entry.nodeId, propKey: entry.propKey as unknown as string };
  entry.nodeId = nodeId;
  entry.propKey = (entry.kind === "prop" ? (propKey ?? "") : "") as unknown as NodePropName;
  return { previous };
}

/** Removes the row at index. */
export function removeEntry(def: GroupDef, index: number): { entry: ExposedEntry } | Refusal {
  const entry = def.exposed[index];
  if (entry === undefined) {
    return { refusal: `no row ${index} to remove` };
  }
  def.exposed.splice(index, 1);
  return { entry };
}

/** Declares a boundary socket of a registered socket type. Answers the inner proxy socket. */
export function addBoundary(
  def: GroupDef,
  dir: SocketDir,
  key: string,
  socketType: string
): { socket: NodeSocketBase } | Refusal {
  if (key === "") {
    return { refusal: "a boundary socket needs a name" };
  }
  const cls = getSocketClass(socketType);
  if (cls === undefined) {
    return { refusal: `unknown socket type '${socketType}'` };
  }
  const side = dir === "in" ? def.inputs : def.outputs;
  if (key in side) {
    return {
      refusal: `the group already has an ${dir === "in" ? "input" : "output"} named '${key}'`,
    };
  }
  const socket =
    dir === "in" ? def.declareInput(key, new cls("in")) : def.declareOutput(key, new cls("out"));
  return { socket };
}

/** Retires a boundary socket. Answers the template and the inner links it severed, for undo. */
export function removeBoundary(
  def: GroupDef,
  dir: SocketDir,
  key: string
): { template: NodeSocketBase; links: LinkRecord[] } | Refusal {
  const side = dir === "in" ? def.inputs : def.outputs;
  const template = side[key];
  if (template === undefined) {
    return { refusal: `the group has no ${dir === "in" ? "input" : "output"} named '${key}'` };
  }
  const proxy = dir === "in" ? def.inputNode().outputs[key] : def.outputNode().inputs[key];
  const links: LinkRecord[] = [];
  if (proxy !== undefined) {
    const owner = proxy.owningNode as Node;
    for (const e of proxy.edges) {
      links.push(
        dir === "in"
          ? { srcId: owner.id, srcKey: key, dstId: e.owningNode!.id, dstKey: e.name }
          : { srcId: e.owningNode!.id, srcKey: e.name, dstId: owner.id, dstKey: key }
      );
    }
  }
  if (dir === "in") {
    def.removeInput(key);
  } else {
    def.removeOutput(key);
  }
  return { template, links };
}

/** Undoes removeBoundary: the template is declared again and the inner links remade. */
export function restoreBoundary(
  def: GroupDef,
  dir: SocketDir,
  key: string,
  removed: { template: NodeSocketBase; links: LinkRecord[] }
): void {
  if (dir === "in") {
    def.declareInput(key, removed.template);
  } else {
    def.declareOutput(key, removed.template);
  }
  restoreLinks(def.subgraph, removed.links);
}
