import nstructjs from "../../path-controller/util/struct";
import type { StructReader } from "../../util/nstructjs";
import { PackFlags, UIBase } from "../../core/ui_base";
import type { Container } from "../../core/ui";
import type { ColumnFrame } from "../../core/ui_containers";
import { IContextBase } from "../../core/context_base";
import { Vector2 } from "../../path-controller/util/vectormath";
import { KeyMap } from "../../path-controller/util/simple_events";
import { Area } from "../../screen/ScreenArea";
import type { IAreaDef } from "../../screen/ScreenArea";
import type { PanelManager } from "../../screen/dock_panels";
// The plain import keeps the view module's module-scope internalRegister call;
// a type-only use would let the transpiler elide it.
import "./nodegraphview";
import type { DescentEntry, NodeGraphView } from "./nodegraphview";
import { buildGroupDesigner } from "./groupui";
import type { Graph } from "../../graph/graph";
import type { GraphId } from "../../graph/graph_types";

/**
 * The node editor: an Area that is a thin shell around one {@link NodeGraphView}.
 * The library ships it unregistered — a consumer that wants it as a screen
 * editor calls Area.register(NodeEditor) itself, then setGraph on an instance.
 * The view carries all behavior; this class adds only the Area frame (header,
 * keymap, STRUCT persistence of the camera and descent, the designer panel).
 */
export class NodeEditor<CTX extends IContextBase = IContextBase> extends Area<CTX> {
  static STRUCT: string;

  container!: ColumnFrame<CTX>;
  view: NodeGraphView<CTX>;

  /** The header row makeHeader returned; a subclass adds its own controls here. */
  headerRow!: Container<CTX>;

  /** STRUCT carriers; the live values stay in the view. */
  pan = new Vector2();
  zoom = 1;
  descent: string[] = [];

  private _designerRoot: HTMLDivElement | undefined = undefined;

  constructor() {
    super();

    // Created here rather than in init so setGraph and loadSTRUCT work on a
    // freshly constructed editor; NodeGraphView is internally registered at
    // import, so createElement always resolves it.
    this.view = UIBase.createElement("nodegraphview-x") as NodeGraphView<CTX>;
    this.keymap = new KeyMap(this.view.hotkeys()) as unknown as KeyMap<CTX>;
    this.view.addEventListener("levelchange", () => {
      // The watched path follows the level; the next update() rebuilds it.
      this.clearPathWatches();
      this._renderDesigner();
    });
  }

  /** On a definition level the designer follows the definition's path, so an exposure edit re-renders it. */
  override watchPath(): void {
    super.watchPath();
    if (this.view.currentLevel().kind === "definition") {
      this.addPathWatch(this.view.currentGraphPath, { onChange: () => this._renderDesigner() });
    }
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

    this.headerRow = this.makeHeader(this.container, false);

    const center = this.makePanels(this.container);
    this.view.parentWidget = center;
    center.shadow.appendChild(this.view);
    this.view.ctx = this.ctx;

    // packflags must be assigned prior to init()
    if (!this.realtime) {
      this.view.inherit_packflag |= PackFlags.NO_REALTIME;
      this.view.packflag |= PackFlags.NO_REALTIME;
    }

    this.view._init();
    this.view.style.flexGrow = "1";
  }

  definePanels(panels: PanelManager<CTX>) {
    panels.panel({
      id   : "group_designer",
      title: "Group Designer",
      dock : "right",
      build: (container) => {
        const root = document.createElement("div");
        this._designerRoot = root;
        container.shadow.appendChild(root);
        this._renderDesigner();
      },
    });
  }

  /** Forwards to the view; graphPath is the datapath the view's edits dispatch against. */
  setGraph(graph: Graph | undefined, graphPath: string) {
    this.view.setGraph(graph, graphPath);
  }

  /** The designer follows the view's level: it edits the definition on screen, and shows a hint elsewhere. */
  private _renderDesigner() {
    const root = this._designerRoot;
    if (root === undefined) {
      return;
    }
    const level = this.view.currentLevel();
    if (level.kind !== "definition") {
      root.textContent = "Open a group definition to edit its exposed UI.";
      return;
    }
    buildGroupDesigner(root, {
      ctx       : this.view.graphContext,
      def       : level.def,
      graphPath : this.view.currentGraphPath,
      delegate  : this.view.delegate,
      onChanged : () => this.view.syncGraph(),
      errorColor: this.view.getDefault("ErrorColor") as string,
    });
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
    return this.view.getViewState().descent.map((entry) => JSON.stringify(entry));
  }

  loadSTRUCT(reader: StructReader<this>) {
    reader(this);

    this.view.setViewState({
      pan    : [this.pan[0], this.pan[1]],
      zoom   : this.zoom,
      descent: this.descent.map(readDescentEntry),
    });
  }
}

/** A stored entry; a file from before definition levels holds a bare instance id. */
function readDescentEntry(text: string): DescentEntry {
  const parsed = JSON.parse(text) as DescentEntry | GraphId;
  if (typeof parsed === "object" && parsed !== null) {
    return {
      nodeId: parsed.nodeId,
      into  : parsed.into === "definition" ? "definition" : "instance",
    };
  }
  return { nodeId: parsed, into: "instance" };
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
