import * as nstructjs from "../path-controller/util/nstructjs";
import type { StructReader } from "../path-controller/util/nstructjs";
import { ToolProperty } from "../path-controller/toolsys/toolprop";
import { Vector2 } from "../path-controller/util/vectormath";
import type { DataAPI, DataStruct } from "../path-controller/controller/controller";
import type { IContextBase } from "../core/context_base";
import type { Container } from "../core/ui";
import { NodeSocketBase } from "./socket";
import type { Graph, GroupResolveRuntime } from "./graph";
import type { Color, GraphId, SocketDir } from "./graph_types";
import { NO_ID } from "./graph_types";

export type Sockets = Record<string, NodeSocketBase>;

/** A constant, or a callback deriving the value from the node's live state. */
export type NodeDefValue<T> = T | ((node: Node) => T);

/**
 * Per-type description a node class returns from its static graphDef(). Definitions
 * merge up the class chain, with the most-derived class winning per field (and per
 * record key for inputs, outputs and props), following the ToolOp.tooldef() pattern.
 */
export interface NodeDef {
  /** Equals the class name; written by hand because minification mangles class names. */
  typeName: string;
  uiName?: NodeDefValue<string>;
  description?: NodeDefValue<string>;
  /** An Icons id. */
  icon?: NodeDefValue<number>;
  color?: Color;
  size?: Vector2;
  inputs?: Sockets;
  outputs?: Sockets;
  props?: Record<string, ToolProperty>;
  /** Bumped when the type changes its socket or prop layout; written per node. */
  typeVersion?: number;
}

export interface NodeTypeConstructor {
  new (): Node;
  graphDef(): NodeDef;
}

const mergedDefs = new Map<NodeTypeConstructor, NodeDef>();

/** The class's definition merged with its ancestors', cached per class. */
function finalDef(cls: NodeTypeConstructor): NodeDef {
  const cached = mergedDefs.get(cls);
  if (cached !== undefined) {
    return cached;
  }

  const def: NodeDef = { typeName: "" };
  const inputs: Sockets = {};
  const outputs: Sockets = {};
  const props: Record<string, ToolProperty> = {};

  let p: NodeTypeConstructor | undefined = cls;
  while (p !== undefined && (p as unknown) !== Node && typeof p.graphDef === "function") {
    const pdef = p.graphDef();

    if (!def.typeName) def.typeName = pdef.typeName ?? "";
    def.uiName ??= pdef.uiName;
    def.description ??= pdef.description;
    def.icon ??= pdef.icon;
    def.color ??= pdef.color;
    def.size ??= pdef.size;
    def.typeVersion ??= pdef.typeVersion;

    for (const k in pdef.inputs) {
      if (!(k in inputs)) inputs[k] = pdef.inputs[k];
    }
    for (const k in pdef.outputs) {
      if (!(k in outputs)) outputs[k] = pdef.outputs[k];
    }
    for (const k in pdef.props) {
      if (!(k in props)) props[k] = pdef.props[k];
    }

    p = Object.getPrototypeOf(p) as NodeTypeConstructor | undefined;
  }

  def.inputs = inputs;
  def.outputs = outputs;
  def.props = props;

  mergedDefs.set(cls, def);
  return def;
}

function resolveDefValue<T>(v: NodeDefValue<T> | undefined, node: Node): T | undefined {
  return typeof v === "function" ? (v as (node: Node) => T)(node) : v;
}

const DEFAULT_NODE_SIZE: [number, number] = [140, 80];

/**
 * A graph node: typed sockets plus authored ToolProperty state. A type is described
 * by its static graphDef(); the constructor materializes the definition's sockets and
 * properties onto the instance. See documentation/research/nodeEditor.md.
 */
export class Node<Inputs extends Sockets = Sockets, Outputs extends Sockets = Sockets> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
graph.Node {
  id          : string | JSON.stringify(this.id);
  label       ?: string;
  pos         : vec2;
  size        : vec2;
  typeVersion : int;
  props       : array(abstract(ToolProperty)) | this._propList();
  inputs      : array(abstract(graph.NodeSocketBase)) | this._socketList(this.inputs);
  outputs     : array(abstract(graph.NodeSocketBase)) | this._socketList(this.outputs);
}
`
  );

  static graphDef(): NodeDef {
    return { typeName: "Node" };
  }

  /** The merged definition of this node's type; shared by every instance of the class. */
  readonly def: NodeDef;

  inputs: Inputs;
  outputs: Outputs;

  /** Authored properties, sparse on a group instance. Each key equals its property's apiname. */
  props: Record<string, ToolProperty>;

  /** The user's rename, absent until the user renames this node. */
  label?: string;

  id: GraphId = NO_ID;

  /** Assigned by Graph.add, cleared by Graph.remove. */
  graph: Graph | undefined = undefined;

  pos = new Vector2();
  size: Vector2;

  typeVersion: number;

  dirty = false;

  constructor() {
    const def = finalDef(this.constructor as NodeTypeConstructor);

    this.def = def;
    this.typeVersion = def.typeVersion ?? 0;
    this.size = new Vector2(def.size ?? DEFAULT_NODE_SIZE);

    const inputs: Sockets = {};
    for (const k in def.inputs) {
      inputs[k] = this._adoptSocket(k, def.inputs[k].copy(), "in");
    }
    this.inputs = inputs as Inputs;

    const outputs: Sockets = {};
    for (const k in def.outputs) {
      outputs[k] = this._adoptSocket(k, def.outputs[k].copy(), "out");
    }
    this.outputs = outputs as Outputs;

    this.props = {};
    for (const k in def.props) {
      this._adoptProp(k, def.props[k].copy() as ToolProperty);
    }
  }

  protected _adoptSocket(key: string, sock: NodeSocketBase, dir: SocketDir): NodeSocketBase {
    sock.name = key;
    sock.dir = dir;
    sock.owningNode = this;
    return sock;
  }

  /** Enforces the record-key ≡ apiname invariant node serialization depends on. */
  protected _adoptProp(key: string, prop: ToolProperty): void {
    if (!prop.apiname) {
      prop.apiname = key;
    } else if (prop.apiname !== key) {
      throw new Error(
        `${this.def.typeName}: props key '${key}' does not equal apiname '${prop.apiname}'`
      );
    }

    // copyTo shares callback arrays with the definition's property; clone them so the
    // change subscription below stays per-instance.
    for (const k in prop.callbacks) {
      prop.callbacks[k] = [...prop.callbacks[k]];
    }
    prop.on("change", () => this.flagDirty());

    this.props[key] = prop;
  }

  flagDirty(): void {
    this.dirty = true;
    this.graph?.dirtyNodes.add(this);
  }

  /** The nodes this node contributes to a flattened sort. A group instance returns its inner nodes. */
  expandNode(): Node[] {
    return [this];
  }

  /** Resolution hook for Graph.resolveGroups; a plain node has nothing to resolve. */
  async _resolveGroup(rt: GroupResolveRuntime): Promise<void> {
    void rt;
  }

  clearDirty(): void {
    this.dirty = false;
    this.graph?.dirtyNodes.delete(this);
  }

  /** Precedence: the user's rename, then a definition callback, then a definition constant. */
  getUIName(): string {
    return this.label ?? resolveDefValue(this.def.uiName, this) ?? this.def.typeName;
  }

  getDescription(): string {
    return resolveDefValue(this.def.description, this) ?? "";
  }

  /** An Icons id; -1 means no icon. */
  getIcon(): number {
    return resolveDefValue(this.def.icon, this) ?? -1;
  }

  /** Declares this node in the data API. Inert until stage 7 lands the graph datapaths. */
  static defineAPI(api: DataAPI, st: DataStruct): void {
    void api;
    void st;
  }

  /** UI for editing this node's properties. Inert until stage 7 supplies the datapaths. */
  createUI<CTX extends IContextBase>(container: Container<CTX>): void {
    void container;
  }

  private _propList(): ToolProperty[] {
    return Object.values(this.props);
  }

  private _socketList(socks: Sockets): NodeSocketBase[] {
    return Object.values(socks);
  }

  loadSTRUCT(reader: StructReader<this>): void {
    reader(this);

    // GraphId is number | string; the STRUCT field carries it JSON-encoded so the two stay distinct.
    this.id = JSON.parse(this.id as unknown as string) as GraphId;

    const def = this.def;

    const fileProps = this.props as unknown as unknown[];
    this.props = {};
    for (const p of fileProps) {
      if (!(p instanceof ToolProperty) || !p.apiname) {
        console.warn(`${def.typeName}: dropping bad property data on load:`, p);
        continue;
      }
      this._adoptProp(p.apiname, p);
    }
    for (const k in def.props) {
      if (!(k in this.props)) {
        this._adoptProp(k, def.props[k].copy() as ToolProperty);
      }
    }

    this.inputs = this._loadSockets(
      this.inputs as unknown as unknown[],
      def.inputs,
      "in"
    ) as Inputs;
    this.outputs = this._loadSockets(
      this.outputs as unknown as unknown[],
      def.outputs,
      "out"
    ) as Outputs;
  }

  /**
   * Rebuilds a socket record from the file's list, reconciled against the definition:
   * a definition socket absent from the file is created at its default, and a file
   * socket absent from the definition is kept, flagged orphaned.
   */
  private _loadSockets(
    fileSocks: unknown[],
    defSocks: Sockets | undefined,
    dir: SocketDir
  ): Sockets {
    const socks: Sockets = {};

    for (const s of fileSocks) {
      if (!(s instanceof NodeSocketBase) || !s.name) {
        console.warn(`${this.def.typeName}: dropping bad socket data on load:`, s);
        continue;
      }

      this._adoptSocket(s.name, s, dir);
      s.orphaned = defSocks === undefined || !(s.name in defSocks);
      socks[s.name] = s;
    }

    for (const k in defSocks) {
      if (!(k in socks)) {
        socks[k] = this._adoptSocket(k, defSocks[k].copy(), dir);
      }
    }

    return socks;
  }
}

const DEV_BUILD = Node.name === "Node";

export const NodeClasses = new Map<string, NodeTypeConstructor>();

export function registerNodeType(cls: NodeTypeConstructor): void {
  if (cls.graphDef === Node.graphDef) {
    throw new Error(cls.name + " is missing its graphDef() static method");
  }

  const def = cls.graphDef();

  if (!def.typeName) {
    throw new Error(
      cls.name +
        ".graphDef() is missing typeName, which should equal the class name; " +
        "needed for minification"
    );
  }

  if (DEV_BUILD && def.typeName !== cls.name) {
    throw new Error(
      cls.name + ": graphDef().typeName '" + def.typeName + "' does not match the class name"
    );
  }

  NodeClasses.set(def.typeName, cls);
}

export function getNodeClass(typeName: string): NodeTypeConstructor | undefined {
  return NodeClasses.get(typeName);
}
