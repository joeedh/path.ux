import { Editor } from "../editor_base.js";
import {
  Area,
  UIBase,
  electron_api,
  platform,
  PackFlags,
  Icons,
  KeyMap,
  HotKey,
  nstructjs,
  Menu,
  AreaFlags,
  nodegraph,
  util,
} from "../../pathux.js";
import type { NodeGraphView } from "../../pathux.js";
import type { ViewContext } from "../../core/context.js";
import { NodeEditorTab } from "../nodeeditor/nodeeditor_tab.js";

export class MenuBarEditor extends Editor {
  _height!: number;

  constructor() {
    super();

    this.updateHeight();
    this.borderLock = 1 | 2 | 4 | 8;
    this.areaDragToolEnabled = false;
  }

  copy() {
    const ret = UIBase.createElement<MenuBarEditor>(
      (this.constructor as unknown as typeof MenuBarEditor).define().tagname
    );
    ret.ctx = this.ctx;
    return ret;
  }

  init() {
    super.init();

    this.background = this.getDefault("AreaHeaderBG");

    if (!util.isMobile() && this.helppicker) {
      this.helppicker.iconsheet = 0;
    }

    const header = this.header!;
    const span = header.row();

    span
      .menu("File", [["New", () => {}], Menu.SEP, ["Save As", () => {}], ["Open", () => {}]])
      .playwrightId("menu-file");

    span
      .menu("Edit", [
        ["Undo", () => this.ctx.toolstack.undo(this.ctx), "CTRL-Z", Icons.UNDO],
        ["Redo", () => this.ctx.toolstack.redo(this.ctx), "CTRL-SHIFT-Z", Icons.REDO],
        Menu.SEP,
        {
          name    : "Create Group",
          hotkey  : "CTRL-G",
          tooltip : "Move the selected nodes into a new group",
          callback: () =>
            this._withNodeView(async (view) => {
              if (!(await view.groupSelected())) {
                (this.ctx as unknown as ViewContext).report(
                  `Nothing was grouped: ${view.lastRefusal}`,
                  "orange"
                );
              }
            }),
        },
        {
          name    : "Ungroup",
          hotkey  : "CTRL-ALT-G",
          tooltip : "Replace each selected group with a copy of what it contains",
          callback: () => this._withNodeView((view) => void view.ungroupSelected()),
        },
        {
          name    : "Edit Group",
          hotkey  : "TAB",
          tooltip : "Open the selected group's definition; edits there reach every instance",
          callback: () => this._withNodeView((view) => this._editGroup(view)),
        },
        {
          name    : "Exit Group",
          tooltip : "Leave the group on screen for the graph above it",
          callback: () => this._withNodeView((view) => void view.exitLevel()),
        },
      ])
      .playwrightId("menu-edit");

    span
      .menu("Session", [
        [
          "Save Default File",
          () => {
            this.ctx.state.saveLocalStorage();
          },
        ],
        [
          "Clear Default File",
          () => {
            this.ctx.state.clearLocalStorage();
          },
        ],
      ])
      .playwrightId("menu-session");

    this.setCSS();
  }

  /** Runs cb against the last-active node editor's view, or reports that there is none. */
  private _withNodeView(cb: (view: NodeGraphView<ViewContext>) => void) {
    const area = Area.getActiveArea(NodeEditorTab);
    if (!(area instanceof NodeEditorTab)) {
      (this.ctx as unknown as ViewContext).report("No node editor is open", "orange");
      return;
    }
    cb(area.view);
  }

  private _editGroup(view: NodeGraphView<ViewContext>) {
    const graph = view.currentGraph;
    const groups = [...view.selection]
      .map((id) => graph?.nodeIdMap.get(id))
      .filter((node) => node instanceof nodegraph.GroupNode);
    if (groups.length !== 1) {
      (this.ctx as unknown as ViewContext).report("Select one group to edit", "orange");
      return;
    }
    void view.enterDefinition(groups[0]);
  }

  updateHeight() {
    if (!this.header) return;

    if (window.haveElectron) {
      this.maxSize[1] = this.minSize[1] = 1;
      electron_api.initMenuBar(this);
      return;
    }

    const rect = this.header.getClientRects()[0];
    if (rect) {
      this._height = rect.height;
    }

    const update = this._height !== this.minSize[1];
    this.minSize[1] = this.maxSize[1] = this._height;

    if (update && this.ctx && this.getScreen()) {
      this.getScreen().solveAreaConstraints();
    }
  }

  getKeyMaps() {
    return [];
  }

  update() {
    super.update();
    this.updateHeight();
  }

  static define() {
    return {
      tagname : "menu-editor-x",
      areaname: "menu",
      uiname  : "Menu Bar",
      icon    : -1,
      flag    : AreaFlags.HIDDEN | AreaFlags.NO_SWITCHER,
    };
  }
}
Editor.register(MenuBarEditor);
MenuBarEditor.STRUCT =
  nstructjs.STRUCT.inherit(MenuBarEditor, Editor) +
  `
}
`;
nstructjs.register(MenuBarEditor);
