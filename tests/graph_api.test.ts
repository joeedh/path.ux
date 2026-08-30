import { test, expect, beforeAll } from "vitest";
import { DataAPI, DataStruct } from "../scripts/path-controller/controller/controller";
import { FloatProperty } from "../scripts/path-controller/toolsys/toolprop";
import { Node } from "../scripts/graph/node";
import type { NodeDef } from "../scripts/graph/node";
import { Graph } from "../scripts/graph/graph";
import { FloatSocket } from "../scripts/graph/sockets_std";
import { GroupDef, GroupNode } from "../scripts/graph/group";
import { defineGraphAPI } from "../scripts/graph/graph_api";

beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window ||= globalThis;
});

class ApiMath extends Node {
  static override graphDef(): NodeDef {
    return {
      typeName: "ApiMath",
      inputs  : { a: new FloatSocket("in"), b: new FloatSocket("in") },
      outputs : { out: new FloatSocket("out") },
      props   : { bias: new FloatProperty(1) },
    };
  }
}

function makeCtx(graph: Graph) {
  const api = new DataAPI();
  const root = new DataStruct();
  root.struct("graph", "graph", "Graph", defineGraphAPI(api));
  api.setRoot(root);

   
  const ctx: any = { state: {}, graph, api };
  ctx.toLocked = () => ctx;
  return ctx;
}

test("a node's props resolve by id and key, reading and writing", () => {
  const g = new Graph();
  const m = new ApiMath();
  g.add(m);
  const ctx = makeCtx(g);

  const path = `graph.nodes[${m.id}].props['bias'].value`;
  expect(ctx.api.getValue(ctx, path)).toBe(1);

  ctx.api.setValue(ctx, path, 3);
  expect(m.props.bias.getValue()).toBe(3);
  expect(m.props.bias.wasSet).toBe(true);
  expect(ctx.api.getValue(ctx, path)).toBe(3);

  // An 'in:'-prefixed key with no node prop lands on the input's editable default.
  ctx.api.setValue(ctx, `graph.nodes[${m.id}].props['in:b'].value`, 2.5);
  expect(m.inputs.b.defaultProp!.getValue()).toBe(2.5);
});

test("name, description and icon read the node's live derivations", () => {
  const g = new Graph();
  const m = new ApiMath();
  g.add(m);
  const ctx = makeCtx(g);

  expect(ctx.api.getValue(ctx, `graph.nodes[${m.id}].name`)).toBe("ApiMath");
  m.label = "Custom";
  expect(ctx.api.getValue(ctx, `graph.nodes[${m.id}].name`)).toBe("Custom");

  expect(ctx.api.getValue(ctx, `graph.nodes[${m.id}].description`)).toBe("");
  expect(ctx.api.getValue(ctx, `graph.nodes[${m.id}].icon`)).toBe(-1);
});

async function makeGroup() {
  const def = new GroupDef();
  const inner = new ApiMath();
  def.subgraph.add(inner);

  const host = new Graph();
  const grp = new GroupNode();
  grp.ref = "grp";
  host.add(grp);
  host.groupLoader = async (ref) => (ref === "grp" ? def : undefined);
  await host.resolveGroups();

  return { def, inner, host, grp };
}

test("a group instance's unmaterialized prop reads the definition; a write materializes", async () => {
  const { inner, host, grp } = await makeGroup();
  const ctx = makeCtx(host);

  const copy = grp.subgraph.nodeIdMap.get(inner.id)!;
  const path = `graph.nodes[${grp.id}].group.nodes[${copy.id}].props['bias'].value`;

  // Unmaterialized: the read follows the definition's live value.
  inner.props.bias.setValue(4);
  expect(copy.props.bias.wasSet).toBe(false);
  expect(ctx.api.getValue(ctx, path)).toBe(4);

  // The write lands on the instance and leaves the definition untouched.
  ctx.api.setValue(ctx, path, 9);
  expect(copy.props.bias.wasSet).toBe(true);
  expect(copy.props.bias.getValue()).toBe(9);
  expect(inner.props.bias.getValue()).toBe(4);
  expect(ctx.api.getValue(ctx, path)).toBe(9);
});

test("a two-level nested group resolves along the same path shape", async () => {
  const innerDef = new GroupDef();
  const leaf = new ApiMath();
  innerDef.subgraph.add(leaf);
  leaf.props.bias.setValue(7);

  const outerDef = new GroupDef();
  const midGrp = new GroupNode();
  midGrp.ref = "inner";
  outerDef.subgraph.add(midGrp);

  const host = new Graph();
  const outer = new GroupNode();
  outer.ref = "outer";
  host.add(outer);
  host.groupLoader = async (ref) =>
    ref === "outer" ? outerDef : ref === "inner" ? innerDef : undefined;
  await host.resolveGroups();

  const ctx = makeCtx(host);
  const path =
    `graph.nodes[${outer.id}].group` +
    `.nodes[${midGrp.id}].group` +
    `.nodes[${leaf.id}].props['bias'].value`;

  expect(ctx.api.getValue(ctx, path)).toBe(7);

  // The write materializes on the deep copy; neither definition moves.
  ctx.api.setValue(ctx, path, 8);
  const midCopy = outer.subgraph.nodeIdMap.get(midGrp.id)! as GroupNode;
  const leafCopy = midCopy.subgraph.nodeIdMap.get(leaf.id)!;
  expect(leafCopy.props.bias.getValue()).toBe(8);
  expect(leafCopy.props.bias.wasSet).toBe(true);
  expect(leaf.props.bias.getValue()).toBe(7);
});
