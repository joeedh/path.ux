import { ViewContext } from "../../core/context";
import {
  Area,
  NodeEditor,
  addGroupMenuTemplate,
  addNodeMenuTemplate,
  contextWrangler,
  createMenu,
  nstructjs,
} from "../../pathux.js";
import type { IAreaDef, MenuTemplate } from "../../pathux.js";
import { DEMO_GRAPH_PATH, demoGroupDefs } from "./demo_nodes.js";

/**
 * The example app's node editor: the library's unregistered NodeEditor plus the
 * app's context conventions, registered here at consumer scope the way every
 * example editor is. The keymap comes from the view's own hotkeys().
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

    const add = this.headerRow.menu("Add", []);
    // Built on every open, since Ctrl+G adds a definition to the store.
    add.template = () => this._addTemplate();
    add.description = "Add a node, or an instance of a group, at the view's center";

    // group instances render unresolved until the stub loader answers.
    void nodegraph.resolveGroups().then(() => this.view.syncGraph());
  }

  private _addTemplate(): MenuTemplate {
    const groups = createMenu(
      this.ctx,
      "Group",
      addGroupMenuTemplate([...demoGroupDefs.keys()], (ref) => void this.view.addGroupAt(ref))
    );
    groups.tooltip = "Add an instance of a group already in the store";
    return [...addNodeMenuTemplate((typeName) => void this.view.addNodeAt(typeName)), groups];
  }

  init() {
    super.init();
    this.fetchGraph();
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
