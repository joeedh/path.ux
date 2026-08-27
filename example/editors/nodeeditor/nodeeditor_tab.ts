import { ViewContext } from "../../core/context";
import {
  Area,
  NodeEditor,
  addNodeMenuTemplate,
  contextWrangler,
  nstructjs,
  nodegraph,
} from "../../pathux.js";
import type { IAreaDef } from "../../pathux.js";
import { DEMO_GRAPH_PATH, DEMO_GROUP_DEF_PATH } from "./demo_nodes.js";

/**
 * The example app's node editor: the library's unregistered NodeEditor plus the
 * app's context conventions, registered here at consumer scope the way every
 * example editor is.
 */
export class NodeEditorTab extends NodeEditor<ViewContext> {
  push_ctx_active() {
    contextWrangler.updateLastRef(this.constructor, this as unknown as Area);
    contextWrangler.push(this.constructor, this as unknown as Area);
  }

  pop_ctx_active() {
    contextWrangler.pop(this.constructor, this as unknown as Area);
  }

  private fetchGraph() {
    const nodegraph = this.ctx.nodegraph;

    if (!nodegraph) {
      window.setTimeout(() => this.fetchGraph(), 50);
      return;
    }

    this.setGraph(nodegraph, DEMO_GRAPH_PATH);
    this.view.onOpenDefinition = (node) => this._openDefinition(node);

    const add = this.headerRow.menu(
      "Add",
      addNodeMenuTemplate((typeName) => this.view.addNodeAt(typeName))
    );
    add.description = "Add a node at the view's center";

    // group instances render unresolved until the stub loader answers.
    void nodegraph.resolveGroups().then(() => this.view.syncGraph());
  }

  init() {
    super.init();
    this.fetchGraph();
  }

  private _openDefinition(node: nodegraph.GroupNode) {
    const def = node.definition;
    if (def === undefined) {
      return;
    }
    this.editDefinition(node.ref, def, DEMO_GROUP_DEF_PATH);
  }

  static define(): IAreaDef {
    return {
      tagname : "nodeeditor-tab-x",
      areaname: "node_editor",
      uiname  : "Node Editor",
      icon    : -1,
    };
  }
}
Area.register(NodeEditorTab);

// stashed the way eventgraph stashes theEventGraph, so CDP scripts can
// switch an area to this editor by class.
window.NodeEditorTab = NodeEditorTab;
NodeEditorTab.STRUCT =
  nstructjs.STRUCT.inherit(NodeEditorTab, NodeEditor, "app.NodeEditorTab") +
  `
}
`;
nstructjs.register(NodeEditorTab);
