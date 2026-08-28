import * as nstructjs from "../path-controller/util/nstructjs";
import type { StructReader } from "../path-controller/util/nstructjs";
import { CreateSnapshot } from "../path-controller/controller/pathwatch";
import { ToolProperty } from "../path-controller/toolsys/toolprop";
import { Vector2 } from "../path-controller/util/vectormath";
import { DataStruct } from "../path-controller/controller/controller";
import type { DataAPI } from "../path-controller/controller/controller";
import type { IContextBase } from "../core/context_base";
import type { Container } from "../core/ui";
import { NodeSocketBase } from "./socket";
import type { Graph, GroupResolveRuntime } from "./graph";
import type { Color, GraphId, SocketDir } from "./graph_types";
import { NO_ID } from "./graph_types";
import { GRAPH_SCHEMA_VERSION } from "./types";

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

declare const brand: unique symbol;
type PrimTag<T, Tag extends string> = T & { readonly [brand]: Tag };
type OpaqueTag<T, Tag extends string> = { readonly [brand]: Tag };

/**
 * An opaque wrapper to prevent node prop keys (e.g. 'in:socket1', 'out:socket2', 'some-node-prop')
 * from mixing with real names in the type system.
 */
export type NodePropName = OpaqueTag<string, "NodePropName">;

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
 * properties onto the instance. See documentation/NodeEditor.md.
 */
export class Node<Inputs extends Sockets = Sockets, Outputs extends Sockets = Sockets> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
pathux.GraphNode {
  id          : string | JSON.stringify(this.id);
  label       ?: string;
  pos         : vec2;
  size        : vec2;
  typeVersion : int;
  props       : array(abstract(ToolProperty)) | this._propList();
  inputs      : array(abstract(pathux.NodeSocketBase)) | this._socketList(this.inputs);
  outputs     : array(abstract(pathux.NodeSocketBase)) | this._socketList(this.outputs);
  VERSION     : int;
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

  VERSION = GRAPH_SCHEMA_VERSION;

  public get allSockets() {
    return Object.values(this.inputs).concat(Object.values(this.outputs));
  }

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

  static decomposePropName(prop: NodePropName): { type: "in" | "out" | "prop"; name: string } {
    // keep up to date with NodeSocketBase.nodePropName!!
    let name = prop as unknown as string;
    let type: "in" | "out" | "prop" = "prop";

    if (name.startsWith("in:")) {
      type = "in";
      name = name.slice(3);
    } else if (name.startsWith("out:")) {
      type = "out";
      name = name.slice(4);
    }
    return { type, name };
  }
  static composePropName(type: "in" | "out" | "prop", name: string): NodePropName {
    // keep up to date with NodeSocketBase.nodePropName!!
    return (type === "prop" ? name : `${type}:${name}`) as unknown as NodePropName;
  }

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

  /** Declares this node type's datapaths on st. Subclasses extend via super.defineAPI. */
  static defineAPI(api: DataAPI, st: DataStruct): void {
    void api;

    st.string("", "name", "Name")
      .customGet<Node>(function () {
        return this.dataref.getUIName();
      })
      .readOnly();

    st.string("", "description", "Description")
      .customGet<Node>(function () {
        return this.dataref.getDescription();
      })
      .readOnly();

    st.int("", "icon", "Icon")
      .customGet<Node>(function () {
        return this.dataref.getIcon();
      })
      .readOnly();

    // unified entry into node.props/inputs/outputs
    // input key are prefixed with 'in:' outputs with 'out:'
    st.list<Node, string, unknown>("", "props", {
      get(_api: DataAPI, node: Node, key: string) {
        return nodePropTarget(node, key as unknown as NodePropName) !== undefined
          ? nodePropRef(node, key as unknown as NodePropName)
          : undefined;
      },
      set(_api: DataAPI, node: Node, key: string, val: unknown) {
        const target = nodePropTarget(node, key as unknown as NodePropName);
        if (target === undefined) {
          throw new Error(`${node.def.typeName}: no prop or input/output default '${key}'`);
        }
        target.setValue(val);
      },
      getKey(_api: DataAPI, node: Node, val: unknown) {
        const ref = val as NodePropRef | undefined;
        return ref?.node === node ? ref.key : undefined;
      },
      getLength(_api: DataAPI, node: Node) {
        return nodePropKeys(node).length;
      },
      getIter(_api: DataAPI, node: Node) {
        return nodePropKeys(node)
          .map((k) => nodePropRef(node, k))
          [Symbol.iterator]();
      },
      getStruct(_api: DataAPI, node: Node, key: string) {
        const target = nodePropTarget(node, key as unknown as NodePropName);
        return target !== undefined ? nodePropStruct(target) : undefined;
      },
    });
  }

  /**
   * Header snapshot for a path watcher on the node's own path: the derived name
   * and description, which is what a frame paints outside its prop widgets.
   */
  [CreateSnapshot](): unknown[] {
    return [this.getUIName(), this.getDescription()];
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

  static getVersionSTRUCT(json: any) {
    return json.VERSION ?? 0;
  }
  /**
   * To chain migrateSTRUCTs up the class hiearachy,
   * wrap any field exclusions in a closure, e.g.
   * super.migrateSTRUCT(version, jsonOrObj, () => migrate(['field']));
   */
  static migrateSTRUCT(version: number, jsonOrObj: any, migrate: nstructjs.StructMigrateFinisher) {
    if (!jsonOrObj.VERSION) {
      jsonOrObj.VERSION = 0;
    }
    migrate();
    jsonOrObj.VERSION = GRAPH_SCHEMA_VERSION;
  }

  loadSTRUCT(reader: StructReader<this>): void {
    this.VERSION = 0; // in case we don't have a VERSION written in json
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
    for (const k in defSocks) {
      const defSock = defSocks[k];
      const sock = socks[k];
      if (sock === undefined) {
        continue;
      }

      // A socket with useDefaultValue false never reads its defaultProp; it carries one only
      // because copyTo/serialization now require every socket to have one. getValue() on such
      // a socket returns undefined, and restoring that through setValue below would corrupt the
      // placeholder's own value, so it is left alone entirely.
      if (defSock.mergeDefaultProp && sock.useDefaultValue) {
        const value = sock.getValue();
        const wasSet = sock.defaultProp.wasSet;
        defSock.defaultProp.copyTo(sock.defaultProp);
        sock.defaultProp.setValue(value);
        // setValue above exists only to restore the value copyTo just overwrote with the
        // definition's own default; it must not make an untouched load look user-edited.
        sock.defaultProp.wasSet = wasSet;
      }
    }
    return socks;
  }
}

/** One props entry as the data API sees it; the editable value is its value member. */
export interface NodePropRef {
  node: Node;
  key: NodePropName;
}

const propRefs = new WeakMap<Node, Map<NodePropName, NodePropRef>>();

/** The ref a (node, key) pair resolves to, cached so repeated reads compare equal. */
function nodePropRef(node: Node, key: NodePropName): NodePropRef {
  let map = propRefs.get(node);
  if (map === undefined) {
    map = new Map();
    propRefs.set(node, map);
  }
  let ref = map.get(key);
  if (ref === undefined) {
    ref = { node, key };
    map.set(key, ref);
  }
  return ref;
}

const propStructs = new WeakMap<ToolProperty, DataStruct>();

/**
 * The struct a props entry resolves through: one member, value, bound to a copy
 * of the target property so widgets read its metadata (range, enum items, ui
 * name). Reads route through nodePropValue, which descends a group boundary for
 * an unmaterialized property; a write lands on the node's own property through
 * nodePropTarget, which is what materializes an instance override. The bound
 * copy is required: customGetSet mutates the property it is bound to.
 */
function nodePropStruct(target: ToolProperty): DataStruct {
  let st = propStructs.get(target);
  if (st === undefined) {
    st = new DataStruct(undefined, "NodeProp");
    st.fromToolProp<ToolProperty, unknown>(
      "",
      target.copy() as ToolProperty,
      "value"
    ).customGetSet<NodePropRef>(
      function () {
        return nodePropValue(this.dataref.node, this.dataref.key);
      },
      function (val) {
        nodePropTarget(this.dataref.node, this.dataref.key)!.setValue(val);
      }
    );
    propStructs.set(target, st);
  }
  return st;
}

/** If nodePropName references a socket returns that socket, otherwise undefined.*/
export function nodePropSocket(node: Node, nodePropName: NodePropName): NodeSocketBase | undefined {
  const { type, name } = Node.decomposePropName(nodePropName);
  switch (type) {
    case "in":
      return node.inputs[name];
    case "out":
      return node.outputs[name];
    case "prop":
      return undefined;
  }
}

/** The property a key addresses on node: its own prop first, else the input's editable default. */
export function nodePropTarget(node: Node, nodePropName: NodePropName): ToolProperty | undefined {
  const { type, name } = Node.decomposePropName(nodePropName);
  switch (type) {
    case "in":
      return node.inputs[name]?.defaultProp;
    case "out":
      return node.outputs[name]?.defaultProp;
    case "prop":
      return node.props[name];
  }
}

/** The keys the props datapath exposes: node props plus inputs/outputs carrying an editable default. */
export function nodePropKeys(node: Node): NodePropName[] {
  const keys = Object.keys(node.props) as unknown as NodePropName[];
  for (const k in node.inputs) {
    if (node.inputs[k].defaultIsEditable) {
      keys.push(node.inputs[k].nodePropName);
    }
  }
  for (const k in node.outputs) {
    if (node.outputs[k].defaultIsEditable) {
      keys.push(node.outputs[k].nodePropName);
    }
  }
  return keys;
}

/**
 * The value a key reads on node, descending the group boundary: an unmaterialized
 * property on a group instance's subgraph node reads the bound definition's value.
 * A materialized (wasSet) property reads its own value, as does a node whose graph
 * has no bound definition (a nested copy; reconciliation re-copies it whenever the
 * definition's content moves, so the copied value stays current).
 */
export function nodePropValue(node: Node, key: NodePropName): unknown {
  const target = nodePropTarget(node, key);
  if (target === undefined) {
    return undefined;
  }
  if (target.wasSet) {
    return target.getValue();
  }

  const owner = node.graph?.groupOwner as (Node & { definition?: { subgraph: Graph } }) | undefined;
  const defNode = owner?.definition?.subgraph.nodeIdMap.get(node.id);
  if (defNode !== undefined && nodePropTarget(defNode, key) !== undefined) {
    return nodePropValue(defNode, key);
  }
  return target.getValue();
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

  // A class without its own STRUCT serializes as its nearest registered ancestor
  // plus nothing; inlineRegister merges that ancestor's fields into the empty body.
  if (!nstructjs.isRegistered(cls)) {
    nstructjs.inlineRegister(cls, `graph.${def.typeName} {\n}\n`);
  }

  NodeClasses.set(def.typeName, cls);
}

export function getNodeClass(typeName: string): NodeTypeConstructor | undefined {
  return NodeClasses.get(typeName);
}
