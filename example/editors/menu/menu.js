import {Editor} from "../editor_base.js";
import {UIBase} from "../../../scripts/ui_base.js";
import {PackFlags} from "../../../scripts/ui_base.js";
import {Icons} from "../icon_enum.js";
import * as nstructjs from "../../util/struct.js";
import {KeyMap, HotKey} from "../../../scripts/simple_events.js";
import {Menu} from "../../../scripts/ui_menu.js";
import {AreaFlags} from "../../../scripts/ScreenArea.js";

export class MenuBarEditor extends Editor {
  constructor() {
    super();

    this.updateHeight();

  }

  init() {
    super.init();

    this.background = this.getDefault("AreaHeaderBG");

    this.switcher.remove();
    let header = this.header;
    let span = header.row();

    span.menu("File", [
      ["New", () => {

      }],
      Menu.SEP,
      ["Save As", () => {

      }],
      ["Open", () => {

      }],

    ]);

    span.menu("Edit", [
      ["Undo", () => this.ctx.toolstack.undo(), "CTRL-Z"],
      ["Redo", () => this.ctx.toolstack.redo(), "CTRL-SHIFT-Z"]
    ]);

    this.setCSS();
  }

  updateHeight() {
    this._height = this.getDefault("TitleText").size + 22;

    let update = this._height !== this.minSize[1];
    this.minSize[1] = this.maxSize[1] = this._height;

    if (update && this.ctx && this.getScreen()) {
      this.getScreen().solveAreaConstraints();
    }
  }

  getKeyMaps() {
    return [

    ]
  }

  update() {
    super.update();
    this.updateHeight();
  }

  static define() {return {
    tagname  : "menu-editor-x",
    areaname : "menu",
    uiname   : "Menu Bar",
    icon     : -1,
    flag     :  AreaFlags.HIDDEN //hide in editor list
  }}
};
Editor.register(MenuBarEditor);
MenuBarEditor.STRUCT = nstructjs.STRUCT.inherit(MenuBarEditor, Editor) + `
}
`;
nstructjs.register(MenuBarEditor);
