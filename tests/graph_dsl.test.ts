import { test, expect } from "vitest";
import { FloatProperty } from "../scripts/path-controller/toolsys/toolprop";
import { Node } from "../scripts/graph/node";
import type { NodeDef, NodeTypeConstructor } from "../scripts/graph/node";
import { NodeSocketBase } from "../scripts/graph/socket";
import type { SocketTypeDef } from "../scripts/graph/socket";
import { FloatSocket, Vec3Socket } from "../scripts/graph/sockets_std";
import { buildGraphFromDSL, validateGraphDSL } from "../scripts/graph/dsl";
import type { DSLRegistries } from "../scripts/graph/dsl";

// A wire type nothing coerces to or from, for the mismatch diagnostic.
class StrSocket extends NodeSocketBase<"str", string> {
  static override socketDef(): SocketTypeDef {
    return { typeName: "StrSocket", type: "str" };
  }
}

class DslSrc extends Node {
  static override graphDef(): NodeDef {
    return {
      typeName: "DslSrc",
      outputs : { value: new FloatSocket("out") },
    };
  }
}

class DslMath extends Node {
  static override graphDef(): NodeDef {
    return {
      typeName: "DslMath",
      inputs  : { a: new FloatSocket("in"), b: new FloatSocket("in") },
      outputs : { out: new FloatSocket("out") },
      props   : { bias: new FloatProperty(1) },
    };
  }
}

class DslText extends Node {
  static override graphDef(): NodeDef {
    return {
      typeName: "DslText",
      inputs  : { text: new StrSocket("in") },
    };
  }
}

class DslVec extends Node {
  static override graphDef(): NodeDef {
    return {
      typeName: "DslVec",
      inputs  : { v: new Vec3Socket("in") },
    };
  }
}

// The DSL validates against registries it is handed, so the tests pass their own
// maps rather than registering these types globally.
const registries: DSLRegistries = {
  nodeTypes: new Map<string, NodeTypeConstructor>([
    ["DslSrc", DslSrc],
    ["DslMath", DslMath],
    ["DslText", DslText],
    ["DslVec", DslVec],
  ]),
  socketTypes: new Map(),
};

test("a valid description builds a graph that sorts", () => {
  const { graph, diagnostics } = buildGraphFromDSL(
    {
      nodes: [
        { id: "src", type: "DslSrc" },
        { id: "m1", type: "DslMath", props: { bias: 3, b: 2.5 } },
        { id: "m2", type: "DslMath" },
      ],
      links: [
        ["src", "value", "m1", "a"],
        ["m1", "out", "m2", "a"],
      ],
    },
    registries
  );

  expect(diagnostics).toEqual([]);
  expect(graph.nodes.length).toBe(3);

  const src = graph.nodeIdMap.get("src")!;
  const m1 = graph.nodeIdMap.get("m1")!;
  const m2 = graph.nodeIdMap.get("m2")!;
  expect(src).toBeInstanceOf(DslSrc);

  // A props key lands on the node prop when one exists, else on the input's default.
  expect(m1.props.bias.getValue()).toBe(3);
  expect(m1.props.bias.wasSet).toBe(true);
  expect(m1.inputs.b.defaultProp!.getValue()).toBe(2.5);

  src.outputs.value.setValue(7);
  expect(m1.inputs.a.getValue()).toBe(7);

  const { order, cycles } = graph.sort();
  expect(cycles).toEqual([]);
  expect(order.indexOf(src)).toBeLessThan(order.indexOf(m1));
  expect(order.indexOf(m1)).toBeLessThan(order.indexOf(m2));
});

test("an unknown node type is dropped with one named diagnostic", () => {
  const { graph, diagnostics } = buildGraphFromDSL(
    {
      nodes: [
        { id: "src", type: "DslSrc" },
        { id: "bad", type: "NoSuchType" },
      ],
    },
    registries
  );

  expect(diagnostics.length).toBe(1);
  expect(diagnostics[0].code).toBe("unknown-node-type");
  expect(diagnostics[0].message).toContain("NoSuchType");
  expect(diagnostics[0].path).toBe("nodes[1]");

  expect(graph.nodes.length).toBe(1);
  expect(graph.nodeIdMap.get("src")).toBeInstanceOf(DslSrc);
});

test("a link naming a nonexistent socket is dropped with one named diagnostic", () => {
  const { graph, diagnostics } = buildGraphFromDSL(
    {
      nodes: [
        { id: "src", type: "DslSrc" },
        { id: "m", type: "DslMath" },
      ],
      links: [["src", "value", "m", "nope"]],
    },
    registries
  );

  expect(diagnostics.length).toBe(1);
  expect(diagnostics[0].code).toBe("unknown-link-socket");
  expect(diagnostics[0].message).toContain("nope");
  expect(diagnostics[0].path).toBe("links[0]");

  expect(graph.nodeIdMap.get("src")!.outputs.value.edges).toEqual([]);
});

test("a prop value the property refuses keeps the default, with one diagnostic", () => {
  const { graph, diagnostics } = buildGraphFromDSL(
    {
      nodes: [{ id: "m", type: "DslMath", props: { bias: "not a number" } }],
    },
    registries
  );

  expect(diagnostics.length).toBe(1);
  expect(diagnostics[0].code).toBe("bad-prop-value");
  expect(diagnostics[0].path).toBe("nodes[0].props.bias");

  const m = graph.nodeIdMap.get("m")!;
  expect(m.props.bias.getValue()).toBe(1);
  expect(m.props.bias.wasSet).toBe(false);
});

test("an uncoercible link yields a type-mismatch diagnostic; a coercible one connects", () => {
  const { graph, diagnostics } = buildGraphFromDSL(
    {
      nodes: [
        { id: "src", type: "DslSrc" },
        { id: "txt", type: "DslText" },
        { id: "vec", type: "DslVec" },
      ],
      links: [
        ["src", "value", "txt", "text"],
        ["src", "value", "vec", "v"],
      ],
    },
    registries
  );

  expect(diagnostics.length).toBe(1);
  expect(diagnostics[0].code).toBe("link-type-mismatch");
  expect(diagnostics[0].message).toContain("float");
  expect(diagnostics[0].message).toContain("str");
  expect(diagnostics[0].path).toBe("links[0]");

  expect(graph.nodeIdMap.get("txt")!.inputs.text.edges).toEqual([]);
  expect(graph.nodeIdMap.get("vec")!.inputs.v.edges.length).toBe(1);
});

test("unrecognized props, duplicate ids and dangling links are each dropped and reported", () => {
  const { graph, diagnostics } = buildGraphFromDSL(
    {
      nodes: [
        { id: "src", type: "DslSrc" },
        { id: "src", type: "DslMath" },
        { id: "m", type: "DslMath", props: { nope: 1 } },
      ],
      links: [
        ["src", "value", "m", "a"],
        ["src", "value", "m", "a"],
        ["ghost", "value", "m", "b"],
      ],
    },
    registries
  );

  const codes = diagnostics.map((d) => d.code).sort();
  expect(codes).toEqual([
    "duplicate-link",
    "duplicate-node-id",
    "unknown-link-node",
    "unknown-prop",
  ]);

  // The salvageable part still built and connected.
  expect(graph.nodes.length).toBe(2);
  const m = graph.nodeIdMap.get("m")!;
  expect(m.inputs.a.edges.length).toBe(1);
  expect(graph.sort().order.length).toBe(2);
});

test("a second link into a single-link input keeps the first and reports the second", () => {
  const { graph, diagnostics } = buildGraphFromDSL(
    {
      nodes: [
        { id: "s1", type: "DslSrc" },
        { id: "s2", type: "DslSrc" },
        { id: "m", type: "DslMath" },
      ],
      links: [
        ["s1", "value", "m", "a"],
        ["s2", "value", "m", "a"],
      ],
    },
    registries
  );

  expect(diagnostics.length).toBe(1);
  expect(diagnostics[0].code).toBe("link-input-occupied");
  expect(diagnostics[0].path).toBe("links[1]");

  const m = graph.nodeIdMap.get("m")!;
  expect(m.inputs.a.edges).toEqual([graph.nodeIdMap.get("s1")!.outputs.value]);
});

test("malformed input never throws", () => {
  expect(validateGraphDSL(null, registries).map((d) => d.code)).toEqual(["bad-shape"]);
  expect(validateGraphDSL("nodes", registries).map((d) => d.code)).toEqual(["bad-shape"]);
  expect(validateGraphDSL({ nodes: {}, links: 3 }, registries).map((d) => d.code)).toEqual([
    "bad-shape",
    "bad-shape",
  ]);

  const { diagnostics } = buildGraphFromDSL(
    {
      nodes: [42, { type: "DslSrc" }, { id: "x" }, { id: "y", type: "DslSrc", props: [] }],
      links: [["y", "value"], "zap"],
    },
    registries
  );
  expect(diagnostics.every((d) => d.code === "bad-shape")).toBe(true);
  expect(diagnostics.length).toBe(6);
});

test("validateGraphDSL reports the same diagnostics as the builder", () => {
  const input = {
    nodes: [
      { id: "src", type: "DslSrc" },
      { id: "bad", type: "NoSuchType" },
    ],
    links: [["src", "value", "bad", "a"]],
  };

  expect(validateGraphDSL(input, registries)).toEqual(
    buildGraphFromDSL(input, registries).diagnostics
  );
  expect(validateGraphDSL(input, registries).map((d) => d.code)).toEqual([
    "unknown-node-type",
    "unknown-link-node",
  ]);
});
