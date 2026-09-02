import * as nstructjs from "../path-controller/util/nstructjs";
import type { StructReader } from "../path-controller/util/nstructjs";
import { ToolProperty } from "../path-controller/toolsys/toolprop";
import { HashDigest } from "../path-controller/util/util";
import { DataAPI, DataStruct } from "../path-controller/controller/controller";
import { Graph } from "./graph";
import { defineGraphAPI } from "./graph_api";
import type { GroupResolveRuntime } from "./graph";
import { Node, registerNodeType } from "./node";
import type { NodeDef, NodePropName, Sockets } from "./node";
import { NodeSocketBase } from "./socket";
import type { GraphId, SocketDir } from "./graph_types";
import { NO_ID } from "./graph_types";

/** Maps a definition's subgraph back to its GroupDef for the link-time containment check. */
const defOfSubgraph = new WeakMap<Graph, GroupDef>();

/** The GroupDef whose subgraph is g, so ops editing a definition can reach its exposure rows. */
export function definitionOfSubgraph(g: Graph): GroupDef | undefined {
  return defOfSubgraph.get(g);
}

/** A standalone physical copy with ids preserved, via a JSON round trip. */
function copyGraph(g: Graph): Graph {
  return nstructjs.readJSON(nstructjs.writeJSON(g), Graph);
}

type ProxyHost = { resolveProxy(): NodeSocketBase[] | undefined };

/**
 * Makes sock resolve through the group boundary to counterpart's edges. An unconnected
 * input counterpart with an editable default stands in as the source itself, so the far
 * side reads the boundary default. A missing counterpart resolves to nothing, which is
 * how an orphaned boundary socket goes dead as a signal path.
 */
function setProxy(sock: NodeSocketBase, counterpart: () => NodeSocketBase | undefined): void {
  (sock as unknown as ProxyHost).resolveProxy = () => {
    const far = counterpart();
    if (far === undefined) {
      return [];
    }
    if (far.edges.length > 0) {
      return [...far.edges];
    }
    return far.useDefaultValue ? [far] : [];
  };
}

/**
 * One row of a group's forwarded UI: a single property, or a whole node's createUI.
 * An entry naming a missing target is kept in the definition; whether it is unresolved
 * or broken is derived at UI time rather than stored.
 */
export class ExposedEntry {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
graph.ExposedEntry {
  kind    : string;
  nodeId  : string | JSON.stringify(this.nodeId);
  propKey : string;
  label   ?: string;
}
`
  );

  kind: "prop" | "nodeUI";
  nodeId: GraphId;

  /** Empty on a nodeUI entry. */
  propKey: NodePropName;

  /** The outside-facing name; the target's own uiName applies when absent. */
  label?: string;

  constructor(
    kind: "prop" | "nodeUI" = "prop",
    nodeId: GraphId = NO_ID,
    propKey = "",
    label?: string
  ) {
    this.kind = kind;
    this.nodeId = nodeId;
    this.propKey = propKey as unknown as NodePropName;
    this.label = label;
  }

  loadSTRUCT(reader: StructReader<this>): void {
    reader(this);

    this.kind = this.kind === "nodeUI" ? "nodeUI" : "prop";
    // GraphId is number | string; the STRUCT field carries it JSON-encoded so the two stay distinct.
    this.nodeId = JSON.parse(this.nodeId as unknown as string) as GraphId;
  }
}

/**
 * The in-graph stand-in for a group's inputs: its output sockets mirror the boundary,
 * one per group input, and inner nodes connect to them. In a definition it is a real
 * endpoint; in an instance subgraph the owning GroupNode wires its sockets as proxies.
 */
export class GroupInputNode extends Node {
  static STRUCT = nstructjs.inlineRegister(this, `graph.GroupInputNode {}`);

  static override graphDef(): NodeDef {
    return { typeName: "GroupInputNode", uiName: "Group Input" };
  }

  override loadSTRUCT(reader: StructReader<this>): void {
    super.loadSTRUCT(reader);

    // The sockets mirror the group boundary rather than graphDef(), so the base
    // reconcile flagged every one of them orphaned.
    for (const k in this.outputs) {
      this.outputs[k].orphaned = false;
    }
  }
}
registerNodeType(GroupInputNode);

/** The output-side counterpart of GroupInputNode: one input socket per group output. */
export class GroupOutputNode extends Node {
  static STRUCT = nstructjs.inlineRegister(this, `graph.GroupOutputNode {}`);

  static override graphDef(): NodeDef {
    return { typeName: "GroupOutputNode", uiName: "Group Output" };
  }

  override loadSTRUCT(reader: StructReader<this>): void {
    super.loadSTRUCT(reader);

    for (const k in this.inputs) {
      this.inputs[k].orphaned = false;
    }
  }
}
registerNodeType(GroupOutputNode);

/**
 * A group definition: the subgraph instances copy, the boundary socket templates, and
 * the ordered forwarded-UI entries. Definitions live outside any graph and reach
 * instances through Graph.resolveGroups; the library never decides where a ref points.
 */
export class GroupDef {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
graph.GroupDef {
  subgraph : pathux.Graph;
  inputs   : array(abstract(pathux.NodeSocketBase)) | this._sockList(this.inputs);
  outputs  : array(abstract(pathux.NodeSocketBase)) | this._sockList(this.outputs);
  exposed  : array(graph.ExposedEntry);
}
`
  );

  subgraph = new Graph();

  /** Boundary socket templates; instances copy these onto their own inputs and outputs. */
  inputs: Sockets = {};
  outputs: Sockets = {};

  /** The ordered rows of the group's forwarded UI. */
  exposed: ExposedEntry[] = [];

  constructor() {
    defOfSubgraph.set(this.subgraph, this);
  }

  /** The subgraph's input proxy node, created on first use. */
  inputNode(): GroupInputNode {
    let n = this.subgraph.nodes.find((x): x is GroupInputNode => x instanceof GroupInputNode);
    if (n === undefined) {
      n = new GroupInputNode();
      this.subgraph.add(n);
    }
    return n;
  }

  /** The subgraph's output proxy node, created on first use. */
  outputNode(): GroupOutputNode {
    let n = this.subgraph.nodes.find((x): x is GroupOutputNode => x instanceof GroupOutputNode);
    if (n === undefined) {
      n = new GroupOutputNode();
      this.subgraph.add(n);
    }
    return n;
  }

  /**
   * Declares a boundary input from a template socket and mirrors its connect point on
   * the input proxy node. Returns the inner socket for the definition author to wire.
   */
  declareInput(key: string, sock: NodeSocketBase): NodeSocketBase {
    sock.name = key;
    sock.dir = "in";
    this.inputs[key] = sock;

    const node = this.inputNode();
    const inner = sock.copy();
    inner.name = key;
    inner.dir = "out";
    inner.multiSocket = true;
    inner.owningNode = node;
    node.outputs[key] = inner;
    return inner;
  }

  /** The output-side counterpart of declareInput. Returns the inner socket. */
  declareOutput(key: string, sock: NodeSocketBase): NodeSocketBase {
    const node = this.outputNode();

    // The inner socket copies first so it keeps the template's editable default.
    const inner = sock.copy();
    inner.name = key;
    inner.dir = "in";
    inner.multiSocket = false;
    inner.owningNode = node;
    node.inputs[key] = inner;

    sock.name = key;
    sock.dir = "out";
    sock.multiSocket = true;
    this.outputs[key] = sock;
    return inner;
  }

  /** Retires a boundary input: the template, the mirror socket and its inner edges. */
  removeInput(key: string): void {
    delete this.inputs[key];
    const node = this.subgraph.nodes.find((x) => x instanceof GroupInputNode);
    const sock = node?.outputs[key];
    if (node !== undefined && sock !== undefined) {
      for (const e of [...sock.edges]) {
        this.subgraph.disconnect(sock, e);
      }
      delete node.outputs[key];
    }
  }

  /** The output-side counterpart of removeInput. */
  removeOutput(key: string): void {
    delete this.outputs[key];
    const node = this.subgraph.nodes.find((x) => x instanceof GroupOutputNode);
    const sock = node?.inputs[key];
    if (node !== undefined && sock !== undefined) {
      for (const e of [...sock.edges]) {
        this.subgraph.disconnect(sock, e);
      }
      delete node.inputs[key];
    }
  }

  /**
   * Hash of the definition's authored content, computed on demand. A GroupNode compares
   * it with syncedHash to decide whether to reconcile; it is never stored as truth.
   */
  contentHash(): string {
    return new HashDigest()
      .add(JSON.stringify(nstructjs.writeJSON(this)))
      .get()
      .toString(16);
  }

  private _sockList(socks: Sockets): NodeSocketBase[] {
    return Object.values(socks);
  }

  loadSTRUCT(reader: StructReader<this>): void {
    reader(this);

    this.inputs = this._loadBoundary(this.inputs as unknown as unknown[], "in");
    this.outputs = this._loadBoundary(this.outputs as unknown as unknown[], "out");
    defOfSubgraph.set(this.subgraph, this);
  }

  private _loadBoundary(list: unknown[], dir: SocketDir): Sockets {
    const socks: Sockets = {};
    for (const s of list) {
      if (!(s instanceof NodeSocketBase) || !s.name) {
        console.warn("GroupDef: dropping bad boundary socket data on load:", s);
        continue;
      }
      s.dir = dir;
      socks[s.name] = s;
    }
    return socks;
  }
}

/** What one reconciliation changed, handed to onDefChanged. */
export interface GroupDiff {
  addedSockets: NodeSocketBase[];
  removedSockets: NodeSocketBase[];
  addedInnerNodes: Node[];
  removedInnerNodes: Node[];
}

/**
 * A group instance: a node whose subgraph is a physical copy of its definition's,
 * reconciled by Graph.resolveGroups whenever the definition's contentHash moves away
 * from syncedHash. Boundary sockets come from the resolved definition rather than
 * graphDef(). Value edits live on the instance; structural edits belong to the
 * definition, which Graph.structuralEditsRefused() enforces for ops.
 */
export class GroupNode extends Node {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
graph.GroupNode {
  ref        : string;
  syncedHash : string;
  subgraph   : pathux.Graph;
}
`
  );

  static override graphDef(): NodeDef {
    return { typeName: "GroupNode", uiName: "Group" };
  }

  /** The definition reference; the client's groupLoader decides what it points at. */
  ref = "";

  /** The contentHash this instance last reconciled to; "" marks a never-synced instance. */
  syncedHash = "";

  subgraph = new Graph();

  private _def: GroupDef | undefined = undefined;

  constructor() {
    super();
    this.subgraph.groupOwner = this;
  }

  /** The resolved definition; undefined until resolveGroups or setDefinition binds one. */
  get definition(): GroupDef | undefined {
    return this._def;
  }

  /** Adds the instance subgraph as "group", so paths descend nodes[i].group.nodes[j]. */
  static override defineAPI(api: DataAPI, st: DataStruct): void {
    super.defineAPI(api, st);
    st.struct("subgraph", "group", "Group", api.getStruct(Graph));
  }

  /** Reports whether target sits anywhere on def's chain of resolved group definitions. */
  static chainContains(def: GroupDef, target: GroupDef, seen = new Set<GroupDef>()): boolean {
    if (def === target) {
      return true;
    }
    if (seen.has(def)) {
      return false;
    }
    seen.add(def);

    for (const n of def.subgraph.nodes) {
      if (
        n instanceof GroupNode &&
        n._def !== undefined &&
        GroupNode.chainContains(n._def, target, seen)
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Binds this instance to a definition, refusing a binding that would make a group
   * contain itself. Syncing still happens through Graph.resolveGroups, which re-checks
   * containment there; this is the link-time half of the two-checkpoint rule.
   */
  setDefinition(ref: string, def: GroupDef): void {
    const host = this.graph !== undefined ? defOfSubgraph.get(this.graph) : undefined;
    if (host !== undefined && GroupNode.chainContains(def, host)) {
      throw new Error("a group cannot contain itself, directly or through another group");
    }
    this.ref = ref;
    this._def = def;
  }

  /** The inner client nodes, recursively flattened; the proxy nodes are excluded. */
  override expandNode(): Node[] {
    const out: Node[] = [];
    for (const n of this.subgraph.nodes) {
      if (n instanceof GroupInputNode || n instanceof GroupOutputNode) {
        continue;
      }
      out.push(...n.expandNode());
    }
    return out;
  }

  override async _resolveGroup(rt: GroupResolveRuntime): Promise<void> {
    if (this.ref === "") {
      return;
    }
    const ref = this.ref;

    let p = rt.pending.get(ref);
    if (p === undefined) {
      p = (async () => {
        try {
          return rt.loader !== undefined ? await rt.loader(ref) : undefined;
        } catch {
          return undefined;
        }
      })();
      rt.pending.set(ref, p);
    }

    let def = await p;
    if (def === undefined) {
      def = rt.known.get(ref);
      rt.report.failed.push({
        ref,
        reason:
          def !== undefined
            ? "the definition failed to load; keeping the one from an earlier run"
            : "the definition failed to load",
      });
      if (def === undefined) {
        return;
      }
    } else {
      rt.known.set(ref, def);
    }

    if (rt.chain.includes(def)) {
      rt.report.failed.push({
        ref,
        reason: "a group cannot contain itself, directly or through another group",
      });
      return;
    }

    // A definition may contain group instances of its own; they resolve first so this
    // instance copies current state.
    rt.chain.push(def);
    try {
      for (const n of [...def.subgraph.nodes]) {
        await n._resolveGroup(rt);
      }
    } finally {
      rt.chain.pop();
    }

    this._def = def;
    const hash = def.contentHash();
    if (this.syncedHash !== hash) {
      this._reconcile(def);
      this.syncedHash = hash;
    }

    // Orphan flags are not serialized, so they re-derive even when the hash matched.
    for (const k in this.inputs) {
      this.inputs[k].orphaned = !(k in def.inputs);
    }
    for (const k in this.outputs) {
      this.outputs[k].orphaned = !(k in def.outputs);
    }

    rt.report.synced.push(this);
  }

  /** Reconciliation's coarse hook; the default fans out to the finer hooks below. */
  onDefChanged(diff: GroupDiff): void {
    for (const s of diff.removedSockets) {
      this.onSocketRemoved(s);
    }
    for (const s of diff.addedSockets) {
      this.onSocketAdded(s);
    }
    for (const n of diff.removedInnerNodes) {
      this.onInnerNodeRemoved(n);
    }
  }

  /** Adopts a boundary socket the definition added. */
  onSocketAdded(sock: NodeSocketBase): void {
    const rec: Sockets = sock.dir === "in" ? this.inputs : this.outputs;
    this._adoptSocket(sock.name, sock, sock.dir);
    rec[sock.name] = sock;
  }

  /**
   * Retires a boundary socket the definition removed. A still-connected socket is kept
   * and flagged orphaned so the editor can show the dangling links as an error; an
   * unconnected one is deleted.
   */
  onSocketRemoved(sock: NodeSocketBase): void {
    const rec: Sockets = sock.dir === "in" ? this.inputs : this.outputs;
    if (rec[sock.name] !== sock) {
      // A type change already severed and replaced it under its key in _diffBoundary.
      return;
    }
    if (sock.edges.length > 0) {
      sock.orphaned = true;
      return;
    }
    delete rec[sock.name];
  }

  /** Notification that reconciliation dropped an inner node; the rebuild already removed it. */
  onInnerNodeRemoved(node: Node): void {
    void node;
  }

  private _reconcile(def: GroupDef): void {
    const oldNodes = new Map(this.subgraph.nodeIdMap);

    // The structure rebuilds wholesale from the definition — nodes, edges and layout —
    // and the instance-side overrides transplant back in below, which is what keeps
    // reconciliation tractable under arbitrary structural change.
    const fresh = copyGraph(def.subgraph);
    fresh.groupOwner = this;

    // wasSet in the copy is the definition author's; override tracking is instance-side.
    for (const n of fresh.nodes) {
      for (const k in n.props) {
        n.props[k].wasSet = false;
      }
      for (const sock of n.allSockets) {
        if (sock.useDefaultValue) {
          sock.defaultProp.wasSet = false;
        }
      }
    }

    for (const n of fresh.nodes) {
      const old = oldNodes.get(n.id);
      if (old === undefined) {
        continue;
      }
      for (const k in n.props) {
        this._transplantOverride(old.props[k], n.props[k]);
      }
      for (const k in n.inputs) {
        this._transplantOverride(old.inputs[k]?.defaultProp, n.inputs[k].defaultProp);
      }
      for (const k in n.outputs) {
        this._transplantOverride(old.outputs[k]?.defaultProp, n.outputs[k].defaultProp);
      }
    }

    const addedInnerNodes = fresh.nodes.filter((n) => !oldNodes.has(n.id));
    const removedInnerNodes = [...oldNodes.values()].filter((n) => !fresh.nodeIdMap.has(n.id));

    this.subgraph = fresh;

    const addedSockets: NodeSocketBase[] = [];
    const removedSockets: NodeSocketBase[] = [];
    this._diffBoundary(def.inputs, this.inputs, "in", addedSockets, removedSockets);
    this._diffBoundary(def.outputs, this.outputs, "out", addedSockets, removedSockets);

    this.onDefChanged({ addedSockets, removedSockets, addedInnerNodes, removedInnerNodes });

    this._wireProxies();
    this.flagDirty();
    this.graph?.flagSortDirty();
  }

  /** Copies an instance-side override (wasSet) from the old property onto its rebuilt copy. */
  private _transplantOverride(
    oldProp: ToolProperty | undefined,
    newProp: ToolProperty | undefined
  ): void {
    if (oldProp === undefined || newProp === undefined) {
      return;
    }
    if (!oldProp.wasSet || oldProp.constructor !== newProp.constructor) {
      return;
    }

    if (!newProp.equals(oldProp)) {
      newProp.setValue(oldProp.getValue());
    }
    newProp.wasSet = true;
  }

  /**
   * Diffs one boundary record against the definition's templates, in place for kept
   * sockets so the parent graph's edges survive. Added and removed sockets are applied
   * by the hooks rather than here; a socket whose type changed is severed and replaced,
   * because its key now names the new socket.
   */
  private _diffBoundary(
    defSocks: Sockets,
    instSocks: Sockets,
    dir: SocketDir,
    added: NodeSocketBase[],
    removed: NodeSocketBase[]
  ): void {
    for (const k in defSocks) {
      const tmpl = defSocks[k];
      const cur: NodeSocketBase | undefined = instSocks[k];

      if (cur?.constructor === tmpl.constructor) {
        const oldDefault = cur.defaultProp;
        tmpl.copyTo(cur);
        cur.dir = dir;
        cur.orphaned = false;
        this._transplantOverride(oldDefault, cur.defaultProp);
        continue;
      }

      if (cur !== undefined) {
        this._severParentEdges(cur);
        delete instSocks[k];
        removed.push(cur);
      }

      const s = tmpl.copy();
      s.name = k;
      s.dir = dir;
      added.push(s);
    }

    for (const k in instSocks) {
      if (!(k in defSocks)) {
        removed.push(instSocks[k]);
      }
    }
  }

  /** Removes sock from the edge lists of everything it connects to, dirtying the far side. */
  private _severParentEdges(sock: NodeSocketBase): void {
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
    this.graph?.flagSortDirty();
  }

  /** Installs proxy resolution across the boundary, in both directions per key. */
  private _wireProxies(): void {
    const gin = this.subgraph.nodes.find((n): n is GroupInputNode => n instanceof GroupInputNode);
    const gout = this.subgraph.nodes.find(
      (n): n is GroupOutputNode => n instanceof GroupOutputNode
    );

    for (const k in this.inputs) {
      setProxy(this.inputs[k], () => gin?.outputs[k]);
    }
    for (const k in this.outputs) {
      setProxy(this.outputs[k], () => gout?.inputs[k]);
    }
    if (gin !== undefined) {
      for (const k in gin.outputs) {
        setProxy(gin.outputs[k], () => this.inputs[k]);
      }
    }
    if (gout !== undefined) {
      for (const k in gout.inputs) {
        setProxy(gout.inputs[k], () => this.outputs[k]);
      }
    }
  }

  override loadSTRUCT(reader: StructReader<this>): void {
    super.loadSTRUCT(reader);

    // Boundary sockets come from the resolved definition rather than graphDef(), so the
    // base reconcile flagged them all orphaned; resolveGroups re-derives the real flags.
    for (const k in this.inputs) {
      this.inputs[k].orphaned = false;
    }
    for (const k in this.outputs) {
      this.outputs[k].orphaned = false;
    }

    this.subgraph.groupOwner = this;
    this._wireProxies();
  }
}
registerNodeType(GroupNode);
