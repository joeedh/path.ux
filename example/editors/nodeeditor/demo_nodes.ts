import { BoolProperty, FloatProperty, nodegraph } from "../../pathux.js";

const {
  Node,
  registerNodeType,
  FloatSocket,
  Vec3Socket,
  Graph,
  GroupDef,
  GroupNode,
  ExposedEntry,
} = nodegraph;

/** A constant source; its title tracks the value property. */
export class DemoValue extends Node {
  static override graphDef(): nodegraph.NodeDef {
    return {
      typeName: "DemoValue",
      uiName  : (node) => `Value ${(node.props.value.getValue() as number).toFixed(2)}`,
      props   : { value: new FloatProperty(1.0) },
      outputs : { out: new FloatSocket("out") },
    };
  }
}
registerNodeType(DemoValue);

/** Its scale and clamp props render as inline rows; an unconnected a or b
 *  input contributes an editable default row as well. */
export class DemoMath extends Node {
  static override graphDef(): nodegraph.NodeDef {
    return {
      typeName: "DemoMath",
      uiName  : "Math",
      props   : { scale: new FloatProperty(1.0), clamp: new BoolProperty(false) },
      inputs  : { a: new FloatSocket("in"), b: new FloatSocket("in") },
      outputs : { out: new FloatSocket("out") },
    };
  }
}
registerNodeType(DemoMath);

/** A multi-input reduce; its one input accepts any number of links. */
export class DemoReduce extends Node {
  static override graphDef(): nodegraph.NodeDef {
    const values = new FloatSocket("in");
    values.multiSocket = true;
    return {
      typeName: "DemoReduce",
      uiName  : "Sum",
      inputs  : { values },
      outputs : { out: new FloatSocket("out") },
    };
  }
}
registerNodeType(DemoReduce);

/** A vec3 passthrough; wiring a float into it exercises socket coercion. */
export class DemoVector extends Node {
  static override graphDef(): nodegraph.NodeDef {
    return {
      typeName: "DemoVector",
      uiName  : "Vector",
      inputs  : { vec: new Vec3Socket("in") },
      outputs : { out: new Vec3Socket("out") },
    };
  }
}
registerNodeType(DemoVector);

function makeDemoGroupDef() {
  const def = new GroupDef();

  const bias = new DemoValue();
  bias.pos.loadXY(60, 200);
  def.subgraph.add(bias);

  const math = new DemoMath();
  math.pos.loadXY(260, 60);
  def.subgraph.add(math);

  const innerIn = def.declareInput("value", new FloatSocket("in"));
  const innerOut = def.declareOutput("result", new FloatSocket("out"));
  def.inputNode().pos.loadXY(40, 40);
  def.outputNode().pos.loadXY(480, 60);

  def.subgraph.connect(innerIn, math.inputs.a);
  def.subgraph.connect(bias.outputs.out, math.inputs.b);
  def.subgraph.connect(math.outputs.out, innerOut);

  def.exposed.push(new ExposedEntry("prop", bias.id, "value", "Bias"));
  return def;
}

/** The in-memory definition store the stub loader/saver pair reads and writes. */
export const demoGroupDefs = new Map([["demo_group", makeDemoGroupDef()]]);

function makeDemoGraph() {
  const g = new Graph();
  g.groupLoader = async (ref) => demoGroupDefs.get(ref);
  g.groupSaver = async (ref, def) => {
    demoGroupDefs.set(ref, def);
  };

  const v1 = new DemoValue();
  v1.pos.loadXY(40, 40);
  const v2 = new DemoValue();
  v2.pos.loadXY(40, 200);
  const math = new DemoMath();
  math.pos.loadXY(280, 60);
  const reduce = new DemoReduce();
  reduce.pos.loadXY(280, 240);
  const vec = new DemoVector();
  vec.pos.loadXY(520, 240);
  const grp = new GroupNode();
  grp.ref = "demo_group";
  grp.pos.loadXY(520, 40);

  for (const n of [v1, v2, math, reduce, vec, grp]) {
    g.add(n);
  }

  // math.b stays unconnected so its editable default row shows in the frame.
  g.connect(v1.outputs.out, math.inputs.a);
  g.connect(v1.outputs.out, reduce.inputs.values);
  g.connect(v2.outputs.out, reduce.inputs.values);
  g.connect(reduce.outputs.out, vec.inputs.vec);
  return g;
}

/** The graph the node editor tab opens; resolved lazily by the tab. */
export const theDemoGraph = makeDemoGraph();

/** The datapaths api_define.ts publishes these graphs at. */
export const DEMO_GRAPH_PATH = "nodegraph";
export const DEMO_GROUP_DEF_PATH = "demogroup";
