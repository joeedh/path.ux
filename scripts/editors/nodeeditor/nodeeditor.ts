import nstructjs from "../../path-controller/util/struct";
import type { StructReader } from "../../util/nstructjs";
import { UIBase } from "../../core/ui_base";
import type { ColumnFrame } from "../../core/ui";
import { IContextBase } from "../../core/context_base";
import { Vector2 } from "../../path-controller/util/vectormath";
import { Area } from "../../screen/ScreenArea";
import type { IAreaDef } from "../../screen/ScreenArea";
// The plain import keeps the view module's module-scope internalRegister call;
// a type-only use would let the transpiler elide it.
import "./nodegraphview";
import type { NodeGraphView } from "./nodegraphview";
import type { Graph } from "../../graph/graph";
import type { GraphId } from "../../graph/graph_types";

/**
 * The node editor: an Area that is a thin shell around one {@link NodeGraphView}.
 * The library ships it unregistered — a consumer that wants it as a screen
 * editor calls Area.register(NodeEditor) itself, then setGraph on an instance.
 * The view carries all behavior; this class adds only the Area frame (header,
 * STRUCT persistence of the camera and descent).
 */
export class NodeEditor<CTX extends IContextBase = IContextBase> extends Area<CTX> {
  static STRUCT: string;

  container!: ColumnFrame<CTX>;
  view: NodeGraphView<CTX>;

  /** STRUCT carriers; the live values stay in the view. */
  pan = new Vector2();
  zoom = 1;
  descent: string[] = [];

  constructor() {
    super();

    // Created here rather than in init so setGraph and loadSTRUCT work on a
    // freshly constructed editor; NodeGraphView is internally registered at
    // import, so createElement always resolves it.
    this.view = UIBase.createElement("nodegraphview-x") as NodeGraphView<CTX>;
  }

  static define(): IAreaDef {
    return {
      tagname : "node-editor-x",
      areaname: "node_editor",
      uiname  : "Node Editor",
      icon    : -1,
    };
  }

  init() {
    super.init();

    this.container = UIBase.createElement("colframe-x") as ColumnFrame<CTX>;
    this.container.ctx = this.ctx;
    this.shadow.appendChild(this.container);

    this.makeHeader(this.container, false);

    this.view.parentWidget = this.container;
    this.container.shadow.appendChild(this.view);
    this.view.ctx = this.ctx;
    this.view._init();
    this.view.style.flexGrow = "1";
  }

  /** Forwards to the view; graphPath is the datapath the view's edits dispatch against. */
  setGraph(graph: Graph | undefined, graphPath: string) {
    this.view.setGraph(graph, graphPath);
  }

  override copy(): this {
    const ret = UIBase.createElement(this.constructor.define().tagname) as this;
    ret.setGraph(this.view.rootGraph, this.view.graphPath);
    ret.view.setViewState(this.view.getViewState());
    return ret;
  }

  _structPan(): Vector2 {
    return new Vector2(this.view.getViewState().pan);
  }

  _structZoom(): number {
    return this.view.getViewState().zoom;
  }

  _structDescent(): string[] {
    return this.view.getViewState().descent.map((id) => JSON.stringify(id));
  }

  loadSTRUCT(reader: StructReader<this>) {
    reader(this);

    this.view.setViewState({
      pan    : [this.pan[0], this.pan[1]],
      zoom   : this.zoom,
      descent: this.descent.map((s) => JSON.parse(s) as GraphId),
    });
  }
}

NodeEditor.STRUCT =
  nstructjs.STRUCT.inherit(NodeEditor, Area, "pathux.NodeEditor") +
  `
  pan     : vec2 | obj._structPan();
  zoom    : float | obj._structZoom();
  descent : array(string) | obj._structDescent();
}
`;
nstructjs.register(NodeEditor);
