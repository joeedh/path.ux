import * as nstructjs from "../path-controller/util/nstructjs";
import type { StructReader } from "../path-controller/util/nstructjs";
import { PropFlags, ToolProperty } from "../path-controller/toolsys/toolprop";
import type { DataAPI, DataStruct } from "../path-controller/controller/controller";
import type { IContextBase } from "../core/context_base";
import type { Container } from "../core/ui";
import type { Color, GraphId, ISocketOwner, SocketDir } from "./graph_types";
import { NO_ID } from "./graph_types";
import type { NodePropName } from "./node";
import { GRAPH_SCHEMA_VERSION } from "./types";

/** Per-type description a socket class returns from its static socketDef(). */
export interface SocketTypeDef {
  /** Equals the class name; written by hand because minification mangles class names. */
  typeName: string;
  /** The wire type coercion dispatches on ("float", "vec3", ...). */
  type: string;
  uiName?: string;
  color?: Color;
  // to set descriptions use the socket's defaultProp
}

export interface SocketTypeConstructor {
  new (dir?: SocketDir): NodeSocketBase;
  socketDef(): SocketTypeDef;
}

/** Claimed by each traversal pass; sockets remember the last pass that visited them. */
let visitPass = 0;

/**
 * A typed, directed graph connection. Output sockets store values; an input resolves
 * its value through its edges on demand and stores nothing of its own. See
 * documentation/NodeEditor.md for the design this implements.
 */
export class NodeSocketBase<
  Type extends string = string,
  Value = unknown,
  Prop extends ToolProperty<Value> = ToolProperty<Value>,
> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
pathux.NodeSocketBase {
  socketId     : string | JSON.stringify(this.socketId);
  name         : string;
  type         : string;
  dir          : string;
  multiSocket  : bool;
  defaultProp  : abstract(ToolProperty);
  VERSION      : int;
}
`
  );

  static socketDef(): SocketTypeDef {
    return { typeName: "NodeSocketBase", type: "" };
  }

  VERSION = GRAPH_SCHEMA_VERSION;
  socketId: GraphId = NO_ID;

  /** The record key this socket sits under in its owning node's inputs or outputs. */
  name = "";

  // the node property alias name for this socket
  get nodePropName() {
    return `${this.dir}:${this.name}` as unknown as NodePropName;
  }

  type: Type;
  dir: SocketDir;

  /** Derived, output sockets only. Written by the client through setValue, read through getValue. */
  private value: Value | undefined = undefined;

  /**
   * Default value.  For input sockets this contains default value.
   * For both input and output sockets contains various UX related properties.
   *
   * Client classes must create this.
   */
  declare defaultProp: Prop;
  /** Whether deserialization copies UX-related properties (numeric ranges, tooltips, etc.) from the default prop. */
  mergeDefaultProp = true;

  /** Is the default value editable. */
  get defaultIsEditable(): boolean {
    return this.useDefaultValue && !(this.defaultProp.flag & PropFlags.READ_ONLY);
  }
  useDefaultValue = true;

  edges: NodeSocketBase[] = [];

  /** True by default on output sockets, false by default on input sockets. */
  multiSocket: boolean;

  /** Combines the incoming values on a multi-connected input socket. */
  reduce?(values: Value[]): Value;

  isDirty = false;

  /** Set on load when this socket was kept from the file but is absent from the node type's definition. */
  orphaned = false;

  color: Color;
  owningNode: ISocketOwner | undefined = undefined;

  /** Coerced value memoized on an input; stale whenever memoValid is false. */
  private memo: Value | undefined = undefined;
  private memoValid = false;

  private edgeStamp = 0;
  private dirtyStamp = 0;

  constructor(dir: SocketDir = "in") {
    const def = (this.constructor as SocketTypeConstructor).socketDef();

    this.type = def.type as Type;
    this.dir = dir;
    this.multiSocket = dir === "out";
    this.color = def.color ?? "#888888";
  }

  /**
   * Chaining-friendly way to set the default prop's UX properties, e.g.
   * `new Socket().setUX((prop) => prop.setReadOnly().setDescription("..."))`.
   */
  setUX(cb: (prop: Prop) => void): this {
    cb(this.defaultProp);
    return this;
  }

  /**
   * On an output, the stored value. On an input, the value resolved through the edges:
   * coerced from the source, reduced when multi-connected, or the default when
   * unconnected. Returns undefined on an unconnected input whose type has no default.
   */
  getValue(): Value | undefined {
    if (this.dir === "out") {
      if (this.value === undefined && this.useDefaultValue) {
        return this.defaultProp.getValue();
      }

      return this.value;
    }

    const sources = this.resolvedEdges();

    if (sources.length === 0) {
      return !this.useDefaultValue ? undefined : (this.defaultProp.getValue() as Value);
    }

    // A same-type single source passes through; there is nothing to memoize.
    if (sources.length === 1 && sources[0].type === this.type) {
      return sources[0].getValue() as Value | undefined;
    }

    if (this.memoValid) {
      return this.memo;
    }

    const values: Value[] = [];
    for (const src of sources) {
      const v = this.coercedValueOf(src);
      if (v !== undefined) {
        values.push(v);
      }
    }

    const result = this.reduce !== undefined && values.length > 1 ? this.reduce(values) : values[0];

    this.memo = result;
    this.memoValid = true;
    this.isDirty = false;

    return result;
  }

  /** Output sockets only. Stores the value and dirties the inputs connected to it. */
  setValue(value: Value): void {
    if (DEV_BUILD && this.dir === "in") {
      throw new Error("setValue is meaningful on output sockets only");
    }

    this.value = value;
    this.flagDirty();
  }

  /** Loads the coerced value from b, or with dryRun reports whether coercion is possible. */
  coerce(b: NodeSocketBase, options?: { dryRun?: boolean }): boolean {
    const possible = b.type === this.type || this.canCoerceFrom(b.type) || b.canCoerceTo(this.type);

    if (!possible || options?.dryRun === true) {
      return possible;
    }

    const v = this.coercedValueOf(b);

    if (this.dir === "in") {
      this.memo = v;
      this.memoValid = true;
    } else {
      this.value = v;
    }

    return true;
  }

  /** Reports whether this socket's value can be converted to `type`. */
  canCoerceTo(type: string): boolean {
    return type === this.type;
  }

  /** This socket's value converted to `type`; called only after canCoerceTo(type) answers true. */
  convertTo(type: string): unknown {
    return type === this.type ? this.getValue() : undefined;
  }

  /** Reports whether this socket itself can convert values of `type`; the destination half of coercion's double dispatch. */
  protected canCoerceFrom(type: string): boolean {
    return type === this.type;
  }

  /** b's value converted to this socket's type; called only after canCoerceFrom(b.type) answers true. */
  protected convertFrom(b: NodeSocketBase): Value | undefined {
    return b.type === this.type ? (b.getValue() as Value | undefined) : undefined;
  }

  private coercedValueOf(b: NodeSocketBase): Value | undefined {
    if (b.type === this.type) {
      return b.getValue() as Value | undefined;
    }
    if (this.canCoerceFrom(b.type)) {
      return this.convertFrom(b);
    }
    if (b.canCoerceTo(this.type)) {
      return b.convertTo(this.type) as Value | undefined;
    }
    return undefined;
  }

  /**
   * The sockets on the far side of a group boundary. undefined marks a real endpoint,
   * which is what the base class is. Group proxies override this (stage 5).
   */
  protected resolveProxy(): NodeSocketBase[] | undefined {
    return undefined;
  }

  /** Edges with group proxies resolved away. Terminates on a proxy chain that cycles. */
  resolvedEdges(): NodeSocketBase[] {
    const pass = ++visitPass;
    const out: NodeSocketBase[] = [];
    const stack = [...this.edges];

    while (stack.length > 0) {
      const sock = stack.pop()!;

      if (sock.edgeStamp === pass) {
        continue;
      }
      sock.edgeStamp = pass;

      const proxied = sock.resolveProxy();
      if (proxied === undefined) {
        out.push(sock);
      } else {
        stack.push(...proxied);
      }
    }

    return out;
  }

  /**
   * The socket or default an input's value comes from, without resolving the value.
   * An output socket is its own source.
   */
  resolveSource(): NodeSocketBase | ToolProperty | undefined {
    if (this.dir === "out") {
      return this;
    }

    const sources = this.resolvedEdges();
    const defaultProp = this.useDefaultValue ? this.defaultProp : undefined;
    return sources.length > 0 ? sources[0] : defaultProp;
  }

  /**
   * Marks this socket dirty and, from an output, every input connected through
   * resolvedEdges(). A dirtied input flags its owning node; the visit stamp
   * terminates the walk on a cyclic edge set.
   */
  flagDirty(): void {
    const pass = ++visitPass;
    const stack: NodeSocketBase[] = [this];

    while (stack.length > 0) {
      const sock = stack.pop()!;

      if (sock.dirtyStamp === pass) {
        continue;
      }
      sock.dirtyStamp = pass;

      sock.isDirty = true;
      sock.memoValid = false;

      if (sock.dir === "in") {
        sock.owningNode?.flagDirty();
      } else {
        stack.push(...sock.resolvedEdges());
      }
    }
  }

  clearDirty(): void {
    this.isDirty = false;
  }

  /** Copies the authored configuration onto a socket of the same class. Identity, topology (edges) and derived state stay with each instance. */
  copyTo(b: NodeSocketBase): void {
    b.dir = this.dir;
    b.multiSocket = this.multiSocket;
    b.color = this.color;
    b.defaultProp = this.defaultProp.copy();
  }

  copy(): this {
    const b = new (this.constructor as new (dir?: SocketDir) => this)(this.dir);
    this.copyTo(b);
    return b;
  }

  /** Declares this socket in the data API. Inert until stage 7 lands the graph datapath that reaches a socket. */
  static defineAPI(api: DataAPI, st: DataStruct): void {
    //
  }

  /**
   * Builds the editor row for this socket's default value; datapath addresses it
   * through the owning node's props list. The base implementation covers the
   * built-in property types via container.prop; a socket class carrying a custom
   * property type overrides this to build its own widget.
   */
  createUI<CTX extends IContextBase>(
    container: Container<CTX>,
    datapath: string,
    label?: string
  ): void {
    const w = container.prop(datapath);
    if (label !== undefined) {
      w?.setAttribute("name", label);
    }
  }

  static getVersionSTRUCT(jsonOrObj: any): number {
    return jsonOrObj.VERSION ?? 0;
  }

  /**
   * To chain migrateSTRUCTs up the class hiearachy,
   * wrap any field exclusions in a closure, e.g.
   * super.migrateSTRUCT(version, jsonOrObj, () => migrate(['field']));
   */
  static migrateSTRUCT(version: number, jsonOrObj: any, migrate: nstructjs.StructMigrateFinisher) {
    const haveDefaultProp = Boolean(jsonOrObj.defaultProp);
    if (!jsonOrObj.defaultProp) {
      const defaultProp = new this().defaultProp;

      if (jsonOrObj instanceof this) {
        jsonOrObj.defaultProp = defaultProp;
      } else {
        jsonOrObj.defaultProp = nstructjs.writeJSON(defaultProp);
        // set type index key.
        // XXX if ToolProperty ever gets a formal type index get we'll
        // have to change _structName.
        jsonOrObj.defaultProp._structName = (defaultProp.constructor as any).structName;
      }
    }
    if (jsonOrObj.VERSION === undefined) {
      jsonOrObj.VERSION = 0;
    }

    // a defaultProp built just above already matches the current class, so it has nothing to migrate
    migrate(haveDefaultProp ? undefined : ["defaultProp"]);

    jsonOrObj.VERSION = GRAPH_SCHEMA_VERSION;
  }

  loadSTRUCT(reader: StructReader<this>): void {
    this.VERSION = 0; // old files may not load this properly
    reader(this);

    // GraphId is number | string; the STRUCT field carries it JSON-encoded so the two stay distinct.
    this.socketId = JSON.parse(this.socketId as unknown as string) as GraphId;
    this.dir = this.dir === "out" ? "out" : "in";
  }
}

// Minification mangles class names, so an intact name marks a development build; the
// direction asserts above and registerSocketType's name-equality check need one.
const DEV_BUILD = NodeSocketBase.name === "NodeSocketBase";

export const SocketClasses = new Map<string, SocketTypeConstructor>();

export function registerSocketType(cls: SocketTypeConstructor): void {
  if (cls.socketDef === NodeSocketBase.socketDef) {
    throw new Error(cls.name + " is missing its socketDef() static method");
  }

  const def = cls.socketDef();

  if (!def.typeName) {
    throw new Error(
      cls.name +
        ".socketDef() is missing typeName, which should equal the class name; " +
        "needed for minification"
    );
  }

  if (!def.type) {
    throw new Error(def.typeName + ".socketDef() is missing its wire type string");
  }

  if (DEV_BUILD && def.typeName !== cls.name) {
    throw new Error(
      cls.name + ": socketDef().typeName '" + def.typeName + "' does not match the class name"
    );
  }

  // A class without its own STRUCT serializes as its nearest registered ancestor
  // plus nothing; inlineRegister merges that ancestor's fields into the empty body.
  if (!nstructjs.isRegistered(cls)) {
    nstructjs.inlineRegister(cls, `graph.${def.typeName} {\n}\n`);
  }

  SocketClasses.set(def.typeName, cls);
}

export function getSocketClass(typeName: string): SocketTypeConstructor | undefined {
  return SocketClasses.get(typeName);
}
