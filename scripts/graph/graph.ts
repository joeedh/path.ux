import * as nstructjs from "../path-controller/util/nstructjs";
import type { StructReader } from "../path-controller/util/nstructjs";
import { CreateSnapshot } from "../path-controller/controller/pathwatch";
import { Node } from "./node";
import type { NodeSocketBase } from "./socket";
import type { GraphId } from "./graph_types";
import { NO_ID } from "./graph_types";
import type { GroupDef, GroupNode } from "./group";
import { GRAPH_SCHEMA_VERSION } from "./types";

/**
 * One serialized edge. Direction is implied by position: srcKey names a record key in
 * the source node's outputs, dstKey one in the destination node's inputs, which is what
 * disambiguates a node carrying an input and an output under the same key.
 */
export class GraphLink {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
pathux.GraphLink {
  srcNode : string | JSON.stringify(this.srcNode);
  srcKey  : string;
  dstNode : string | JSON.stringify(this.dstNode);
  dstKey  : string;
}
`
  );

  srcNode: GraphId = NO_ID;
  srcKey = "";
  dstNode: GraphId = NO_ID;
  dstKey = "";

  constructor(srcNode: GraphId = NO_ID, srcKey = "", dstNode: GraphId = NO_ID, dstKey = "") {
    this.srcNode = srcNode;
    this.srcKey = srcKey;
    this.dstNode = dstNode;
    this.dstKey = dstKey;
  }

  loadSTRUCT(reader: StructReader<this>): void {
    reader(this);

    // GraphId is number | string; the STRUCT fields carry it JSON-encoded so the two stay distinct.
    this.srcNode = JSON.parse(this.srcNode as unknown as string) as GraphId;
    this.dstNode = JSON.parse(this.dstNode as unknown as string) as GraphId;
  }
}

export interface GraphSortResult {
  /** Topological order over the acyclic part of the graph. */
  order: Node[];
  /** The strongly connected components, each with two or more nodes (or one self-connected node). */
  cycles: Node[][];
}

/** What resolveGroups managed and what it could not, reported rather than thrown. */
export interface GroupResolveReport {
  /** Instances now current: reconciled this run, or already at the definition's hash. */
  synced: GroupNode[];
  failed: { ref: string; reason: string }[];
}

/** Shared state one resolveGroups run threads through Node._resolveGroup. */
export interface GroupResolveRuntime {
  loader: ((ref: string) => Promise<GroupDef | undefined>) | undefined;
  /** In-flight and completed loads this run, keyed by ref, so a ref loads once per run. */
  pending: Map<string, Promise<GroupDef | undefined>>;
  /** Last-known-good definitions across runs; a failed reload keeps the earlier one. */
  known: Map<string, GroupDef>;
  /** Definitions currently expanding, for the self-containment check. */
  chain: GroupDef[];
  report: GroupResolveReport;
}

/**
 * A collection of nodes and the edges between their sockets. Node ids are allocated
 * per graph, never globally, so a subgraph serializes and copies standalone. See
 * documentation/NodeEditor.md.
 */
export class Graph {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
pathux.Graph {
  VERSION : float;
  idgen   : int;
  nodes   : array(abstract(pathux.GraphNode));
  links   : array(pathux.GraphLink) | this._linkList();
}
`
  );

  VERSION = GRAPH_SCHEMA_VERSION;

  nodes: Node[] = [];
  nodeIdMap = new Map<GraphId, Node>();

  /** Nodes flagged dirty since the client last cleared them; maintained by Node.flagDirty. */
  dirtyNodes = new Set<Node>();

  /** Loads a group definition by reference. The library never decides where a ref points. */
  groupLoader?: (ref: string) => Promise<GroupDef | undefined>;

  /** Saves a group definition by reference; the seam beside groupLoader for group designers. */
  groupSaver?: (ref: string, def: GroupDef) => Promise<void>;

  /** Set on a group instance's subgraph; flagSortDirty bubbles through it to the owning graph. */
  groupOwner: Node | undefined = undefined;

  /** Last-known-good group definitions, kept across resolveGroups runs. */
  private knownDefs = new Map<string, GroupDef>();

  private idgen = 0;

  /** Populated by the reader during load and drained by loadSTRUCT; writes go through _linkList. */
  private links: GraphLink[] = [];

  private sortCache: GraphSortResult | undefined = undefined;

  /**
   * Structural snapshot for path watchers: node identity, label, position and edges.
   * Prop values are deliberately absent — a prop widget watches its own descendant
   * path, which the same notification wakes.
   */
  [CreateSnapshot](): unknown[] {
    const out: unknown[] = [];
    for (const n of this.nodes) {
      out.push(n.id, n.def.typeName, n.label ?? "", n.pos[0], n.pos[1]);
      for (const key in n.inputs) {
        for (const e of n.inputs[key].edges) {
          out.push(`${String(e.owningNode?.id)}:${e.name}>${String(n.id)}:${key}`);
        }
      }
    }
    return out;
  }

  /** Adds the node, allocating an id when it has none. A node keeps a preassigned id. */
  add(node: Node): void {
    if (node.graph !== undefined && node.graph !== this) {
      throw new Error(`node ${String(node.id)} already belongs to another graph`);
    }

    if (node.id === NO_ID) {
      node.id = this.idgen++;
    } else if (typeof node.id === "number") {
      this.idgen = Math.max(this.idgen, node.id + 1);
    }

    node.graph = this;
    this.nodes.push(node);
    this.nodeIdMap.set(node.id, node);
    this.flagSortDirty();
  }

  /** Removes the node and severs every edge into or out of it. Unknown nodes are ignored. */
  remove(node: Node): void {
    const i = this.nodes.indexOf(node);
    if (i < 0) {
      return;
    }

    for (const key in node.inputs) {
      this._severEdges(node.inputs[key]);
    }
    for (const key in node.outputs) {
      this._severEdges(node.outputs[key]);
    }

    this.nodes.splice(i, 1);
    this.nodeIdMap.delete(node.id);
    this.dirtyNodes.delete(node);
    node.graph = undefined;
    this.flagSortDirty();
  }

  /**
   * Connects an output socket to an input socket, in either argument order. Refuses two
   * sockets of the same direction and sockets whose nodes are not both in this graph.
   * A single-link input replaces its existing edge, the way a node editor's link drag
   * expects; connecting an already-connected pair is a no-op.
   */
  connect(sockA: NodeSocketBase, sockB: NodeSocketBase): void {
    if (sockA.dir === sockB.dir) {
      throw new Error("connect takes one output socket and one input socket");
    }

    const src = sockA.dir === "out" ? sockA : sockB;
    const dst = sockA.dir === "out" ? sockB : sockA;

    const srcNode = src.owningNode as Node | undefined;
    const dstNode = dst.owningNode as Node | undefined;
    if (srcNode?.graph !== this || dstNode?.graph !== this) {
      throw new Error("connect refuses an edge between nodes of different graphs");
    }

    if (src.edges.includes(dst)) {
      return;
    }

    if (!dst.multiSocket) {
      for (const e of [...dst.edges]) {
        this.disconnect(e, dst);
      }
    }

    src.edges.push(dst);
    dst.edges.push(src);
    dst.flagDirty();
    this.flagSortDirty();
  }

  /** Severs the edge between the two sockets; a pair that is not connected is a no-op. */
  disconnect(sockA: NodeSocketBase, sockB: NodeSocketBase): void {
    const ai = sockA.edges.indexOf(sockB);
    const bi = sockB.edges.indexOf(sockA);
    if (ai < 0 && bi < 0) {
      return;
    }

    if (ai >= 0) sockA.edges.splice(ai, 1);
    if (bi >= 0) sockB.edges.splice(bi, 1);

    const dst = sockA.dir === "in" ? sockA : sockB;
    dst.flagDirty();
    this.flagSortDirty();
  }

  flagSortDirty(): void {
    this.sortCache = undefined;
    this.groupOwner?.graph?.flagSortDirty();
  }

  /**
   * The refusal sentence for structural edits, or undefined where they are allowed.
   * A group instance's subgraph answers with the sentence; ops consult this in canRun.
   */
  structuralEditsRefused(): string | undefined {
    return this.groupOwner !== undefined
      ? "a group instance takes value edits only; structural edits belong to the group's definition"
      : undefined;
  }

  /**
   * Loads and reconciles every group instance in the graph through groupLoader,
   * recursing into loaded definitions. Failures are reported rather than thrown, and
   * a definition that fails to reload keeps the one an earlier run resolved.
   */
  async resolveGroups(): Promise<GroupResolveReport> {
    const report: GroupResolveReport = { synced: [], failed: [] };
    const rt: GroupResolveRuntime = {
      loader : this.groupLoader,
      pending: new Map(),
      known  : this.knownDefs,
      chain  : [],
      report,
    };

    for (const n of [...this.nodes]) {
      await n._resolveGroup(rt);
    }
    return report;
  }

  /**
   * Topological order plus strongly connected components, via iterative Tarjan.
   * Cyclic nodes appear in cycles and not in order, so a client with its own cyclic
   * solver receives the components it needs. Cached until flagSortDirty().
   */
  sort(): GraphSortResult {
    if (this.sortCache !== undefined) {
      return this.sortCache;
    }

    const nodes: Node[] = [];
    for (const n of this.nodes) {
      nodes.push(...n.expandNode());
    }
    const nodeSet = new Set(nodes);

    const succOf = (n: Node): Node[] => {
      const out: Node[] = [];
      for (const key in n.outputs) {
        for (const target of n.outputs[key].resolvedEdges()) {
          const owner = target.owningNode as Node | undefined;
          if (owner !== undefined && nodeSet.has(owner)) {
            out.push(owner);
          }
        }
      }
      return out;
    };

    // Tarjan with an explicit frame stack; graphs are user-sized, so no recursion.
    const index = new Map<Node, number>();
    const lowlink = new Map<Node, number>();
    const onStack = new Set<Node>();
    const sccStack: Node[] = [];
    let counter = 0;

    // Components complete in reverse topological order of the condensation.
    const components: Node[][] = [];

    for (const root of nodes) {
      if (index.has(root)) {
        continue;
      }

      index.set(root, counter);
      lowlink.set(root, counter);
      counter++;
      sccStack.push(root);
      onStack.add(root);

      const frames = [{ node: root, succs: succOf(root), i: 0 }];

      while (frames.length > 0) {
        const f = frames[frames.length - 1];

        if (f.i < f.succs.length) {
          const w = f.succs[f.i++];

          if (!index.has(w)) {
            index.set(w, counter);
            lowlink.set(w, counter);
            counter++;
            sccStack.push(w);
            onStack.add(w);
            frames.push({ node: w, succs: succOf(w), i: 0 });
          } else if (onStack.has(w)) {
            lowlink.set(f.node, Math.min(lowlink.get(f.node)!, index.get(w)!));
          }

          continue;
        }

        frames.pop();

        const parent = frames[frames.length - 1];
        if (parent !== undefined) {
          lowlink.set(parent.node, Math.min(lowlink.get(parent.node)!, lowlink.get(f.node)!));
        }

        if (lowlink.get(f.node) === index.get(f.node)) {
          const comp: Node[] = [];
          let w: Node;
          do {
            w = sccStack.pop()!;
            onStack.delete(w);
            comp.push(w);
          } while (w !== f.node);
          components.push(comp);
        }
      }
    }

    const order: Node[] = [];
    const cycles: Node[][] = [];

    for (let i = components.length - 1; i >= 0; i--) {
      const comp = components[i];
      if (comp.length === 1 && !succOf(comp[0]).includes(comp[0])) {
        order.push(comp[0]);
      } else {
        cycles.push(comp);
      }
    }

    this.sortCache = { order, cycles };
    return this.sortCache;
  }

  /** Removes sock from the edge lists of everything it connects to, dirtying the far side. */
  private _severEdges(sock: NodeSocketBase): void {
    for (const other of [...sock.edges]) {
      const i = other.edges.indexOf(sock);
      if (i >= 0) {
        other.edges.splice(i, 1);
      }
      if (other.dir === "in") {
        other.flagDirty();
      }
    }
    sock.edges.length = 0;
  }

  private _linkList(): GraphLink[] {
    const out: GraphLink[] = [];

    for (const n of this.nodes) {
      for (const key in n.outputs) {
        const sock = n.outputs[key];
        for (const e of sock.edges) {
          const dst = e.owningNode as Node | undefined;
          if (dst === undefined) {
            continue;
          }
          out.push(new GraphLink(n.id, sock.name, dst.id, e.name));
        }
      }
    }

    return out;
  }

  loadSTRUCT(reader: StructReader<this>): void {
    reader(this);

    this.nodeIdMap.clear();
    for (const n of this.nodes) {
      n.graph = this;
      this.nodeIdMap.set(n.id, n);
    }

    for (const link of this.links) {
      const srcSock = this.nodeIdMap.get(link.srcNode)?.outputs[link.srcKey];
      const dstSock = this.nodeIdMap.get(link.dstNode)?.inputs[link.dstKey];

      if (srcSock === undefined || dstSock === undefined) {
        console.warn(
          `dropping a link naming a missing endpoint: ` +
            `${String(link.srcNode)}.${link.srcKey} -> ${String(link.dstNode)}.${link.dstKey}`
        );
        continue;
      }

      srcSock.edges.push(dstSock);
      dstSock.edges.push(srcSock);
    }
    this.links = [];

    this.VERSION = GRAPH_SCHEMA_VERSION;
    this.flagSortDirty();
  }
}
