import { test, expect, vi } from "vitest";
import { readJSON, writeJSON } from "../scripts/path-controller/util/nstructjs";
import type { StructReader } from "../scripts/path-controller/util/nstructjs";
import { IntProperty, FloatProperty } from "../scripts/path-controller/toolsys/toolprop";
import { Node, registerNodeType, getNodeClass } from "../scripts/graph/node";
import type { NodeDef } from "../scripts/graph/node";
import { FloatSocket, Vec3Socket } from "../scripts/graph/sockets_std";

class MathNode extends Node {
  static override graphDef(): NodeDef {
    return {
      typeName: "MathNode",
      uiName  : (node) => ((node.props.mode.getValue() as number) === 0 ? "Add" : "Multiply"),
      inputs  : { a: new FloatSocket("in"), b: new FloatSocket("in") },
      outputs : { value: new FloatSocket("out") },
      props   : { mode: new IntProperty(0) },
    };
  }
}
registerNodeType(MathNode);

class ConstNode extends Node {
  static override graphDef(): NodeDef {
    return {
      typeName: "ConstNode",
      uiName  : "Constant",
      outputs : { value: new FloatSocket("out") },
      props   : { value: new FloatProperty(0) },
    };
  }
}
registerNodeType(ConstNode);

test("the constructor materializes def sockets with dir, name and ownership", () => {
  const n = new MathNode();

  expect(Object.keys(n.inputs)).toEqual(["a", "b"]);
  expect(Object.keys(n.outputs)).toEqual(["value"]);

  expect(n.inputs.a.dir).toBe("in");
  expect(n.inputs.a.name).toBe("a");
  expect(n.inputs.a.owningNode).toBe(n);
  expect(n.outputs.value.dir).toBe("out");
  expect(n.outputs.value.owningNode).toBe(n);

  // Instances own their sockets; the definition's stay untouched.
  const m = new MathNode();
  expect(m.inputs.a).not.toBe(n.inputs.a);
});

test("subclass defs merge with parent defs, most-derived winning", () => {
  class ExtMathNode extends MathNode {
    static override graphDef(): NodeDef {
      return {
        typeName: "ExtMathNode",
        uiName  : "Ext",
        inputs  : { c: new Vec3Socket("in") },
      };
    }
  }

  const n = new ExtMathNode();

  expect(Object.keys(n.inputs).sort()).toEqual(["a", "b", "c"]);
  expect(Object.keys(n.outputs)).toEqual(["value"]);
  expect("mode" in n.props).toBe(true);
  expect(n.def.typeName).toBe("ExtMathNode");
  expect(n.getUIName()).toBe("Ext");
});

test("name resolution: rename beats callback beats constant", () => {
  const math = new MathNode();
  expect(math.getUIName()).toBe("Add");

  math.props.mode.setValue(1);
  expect(math.getUIName()).toBe("Multiply");

  math.label = "My node";
  expect(math.getUIName()).toBe("My node");

  const constant = new ConstNode();
  expect(constant.getUIName()).toBe("Constant");
});

test("a property edit flags its node dirty without polling", () => {
  const n = new MathNode();
  expect(n.dirty).toBe(false);

  n.props.mode.setValue(1);
  expect(n.dirty).toBe(true);

  // The definition's property is not subscribed to any instance.
  const other = new MathNode();
  expect(other.dirty).toBe(false);
});

test("a props key that contradicts its property's apiname is refused", () => {
  class BadPropsNode extends Node {
    static override graphDef(): NodeDef {
      return {
        typeName: "BadPropsNode",
        props   : { mode: new IntProperty(0, "other_name") },
      };
    }
  }

  expect(() => new BadPropsNode()).toThrow(/does not equal apiname/);
});

test("registerNodeType refuses a mismatched typeName and a missing graphDef", () => {
  class WrongNode extends Node {
    static override graphDef(): NodeDef {
      return { typeName: "SomethingElse" };
    }
  }
  expect(() => registerNodeType(WrongNode)).toThrow(/does not match/);

  class NoDefNode extends Node {}
  expect(() => registerNodeType(NoDefNode)).toThrow(/graphDef/);
});

test("getNodeClass resolves a registered typeName", () => {
  expect(getNodeClass("MathNode")).toBe(MathNode);
  expect(getNodeClass("NotRegistered")).toBeUndefined();
});

test("a node JSON round-trips its props, label, pos and sockets", () => {
  const n = new MathNode();
  n.id = 3;
  n.label = "Renamed";
  n.pos[0] = 10;
  n.pos[1] = 20;
  n.props.mode.setValue(1);
  n.inputs.a.defaultProp!.setValue(4);

  const loaded = readJSON(writeJSON(n), MathNode);

  expect(loaded.id).toBe(3);
  expect(loaded.label).toBe("Renamed");
  expect([loaded.pos[0], loaded.pos[1]]).toEqual([10, 20]);

  expect(loaded.props.mode.getValue()).toBe(1);
  expect(loaded.props.mode.wasSet).toBe(true);

  expect(Object.keys(loaded.inputs)).toEqual(["a", "b"]);
  expect(loaded.inputs.a.defaultProp!.getValue()).toBe(4);
  expect(loaded.inputs.a.owningNode).toBe(loaded);
  expect(loaded.inputs.a.orphaned).toBe(false);
  expect(loaded.outputs.value.dir).toBe("out");

  // Loaded props are re-subscribed to the loaded node.
  loaded.props.mode.setValue(0);
  expect(loaded.dirty).toBe(true);
});

test("a definition socket absent from the file is created at its default", () => {
  const n = new MathNode();
  delete (n.inputs as Record<string, unknown>).b;

  const loaded = readJSON(writeJSON(n), MathNode);

  expect(Object.keys(loaded.inputs).sort()).toEqual(["a", "b"]);
  expect(loaded.inputs.b.orphaned).toBe(false);
  expect(loaded.inputs.b.getValue()).toBe(0);
});

test("a file socket absent from the definition is kept, flagged orphaned", () => {
  const n = new MathNode();
  const legacy = new FloatSocket("in");
  (n.inputs as Record<string, unknown>).legacy = legacy;
  legacy.name = "legacy";
  legacy.owningNode = n;

  const loaded = readJSON(writeJSON(n), MathNode);

  expect("legacy" in loaded.inputs).toBe(true);
  expect(loaded.inputs.legacy.orphaned).toBe(true);
  expect(loaded.inputs.a.orphaned).toBe(false);
});

test("garbage subobjects are dropped with a warning on load", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

  const goodProp = new IntProperty(5, "mode");
  const fakeReader = ((obj: MathNode) => {
    const o = obj as unknown as Record<string, unknown>;
    o.id = "9";
    o.props = [{ junk: true }, goodProp];
    o.inputs = [{ alsoJunk: true }];
    o.outputs = [];
  }) as unknown as StructReader<MathNode>;

  const n = new MathNode();
  n.loadSTRUCT(fakeReader);

  expect(n.id).toBe(9);
  expect(n.props.mode.getValue()).toBe(5);
  expect(Object.keys(n.inputs).sort()).toEqual(["a", "b"]);
  expect(warn).toHaveBeenCalledTimes(2);

  warn.mockRestore();
});
