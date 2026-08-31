import * as nstructjs from "../path-controller/util/nstructjs";
import {
  FloatProperty,
  Vec3Property,
  StringProperty,
  PropFlags,
} from "../path-controller/toolsys/toolprop";
import { Vector3 } from "../path-controller/util/vectormath";
import type { SocketDir } from "./graph_types";
import { NodeSocketBase, registerSocketType } from "./socket";
import type { SocketTypeDef } from "./socket";

export class FloatSocket extends NodeSocketBase<"float", number> {
  static STRUCT = nstructjs.inlineRegister(this, `graph.FloatSocket {}`);

  static socketDef(): SocketTypeDef {
    return { typeName: "FloatSocket", type: "float", uiName: "Float", color: "#a1a1a1" };
  }

  constructor(
    dir: SocketDir = "in",
    { uiName = "", description = "" }: { uiName?: string; description?: string } = {}
  ) {
    super(dir);

    this.defaultProp = new FloatProperty(0).setUIName(uiName).setDescription(description);
  }
}
registerSocketType(FloatSocket);

export class Vec3Socket extends NodeSocketBase<"vec3", Vector3> {
  static STRUCT = nstructjs.inlineRegister(this, `graph.Vec3Socket {}`);

  static socketDef(): SocketTypeDef {
    return { typeName: "Vec3Socket", type: "vec3", uiName: "Vector3", color: "#8a8ad0" };
  }

  constructor(
    dir: SocketDir = "in",
    { uiName = "", description = "" }: { uiName?: string; description?: string } = {}
  ) {
    super(dir);

    this.defaultProp = new Vec3Property([0, 0, 0]).setUIName(uiName).setDescription(description);
  }

  // float→vec3 is destination knowledge: the float splats across the components.
  protected override canCoerceFrom(type: string): boolean {
    return type === "float" || super.canCoerceFrom(type);
  }

  protected override convertFrom(b: NodeSocketBase): Vector3 | undefined {
    if (b.type === "float") {
      const v = b.getValue();
      return typeof v === "number" ? new Vector3([v, v, v]) : undefined;
    }
    return super.convertFrom(b);
  }

  // vec3→float is source knowledge, so FloatSocket stays ignorant of vectors.
  override canCoerceTo(type: string): boolean {
    return type === "float" || super.canCoerceTo(type);
  }

  /** A vec3 reads as a float through the component average, the inverse of the splat. */
  override convertTo(type: string): unknown {
    if (type === "float") {
      const v = this.getValue();
      return v === undefined ? undefined : (v[0] + v[1] + v[2]) / 3;
    }
    return super.convertTo(type);
  }
}
registerSocketType(Vec3Socket);

export class StringSocket extends NodeSocketBase<"string", string, StringProperty> {
  static STRUCT = nstructjs.inlineRegister(this, `graph.StringSocket {}`);

  static socketDef(): SocketTypeDef {
    return { typeName: "StringSocket", type: "string", uiName: "String", color: "#9c8f6a" };
  }

  constructor(
    dir: SocketDir = "in",
    { uiName = "", description = "" }: { uiName?: string; description?: string } = {}
  ) {
    super(dir);

    this.defaultProp = new StringProperty("").setUIName(uiName).setDescription(description);
  }
}
registerSocketType(StringSocket);
