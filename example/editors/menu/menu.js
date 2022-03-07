import {Editor} from "../editor_base.js";
import {UIBase, electron_api, platform, PackFlags, Icons, KeyMap, HotKey, nstructjs, Menu, AreaFlags, util} from '../../pathux.js';

export class MenuBarEditor extends Editor {
  constructor() {
    super();

    this.updateHeight();
    this.borderLock = 1|2|4|8;
    this.areaDragToolEnabled = false;

  }

  copy() {
    let ret = UIBase.createElement(this.constructor.define().tagname);
    ret.ctx = this.ctx;
    return ret;
  }


  init() {
    super.init();

    this.background = this.getDefault("AreaHeaderBG");

    if (!util.isMobile()) {
      this.helppicker.iconsheet = 0;
    }

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
      ["Undo", () => this.ctx.toolstack.undo(), "CTRL-Z", Icons.UNDO],
      ["Redo", () => this.ctx.toolstack.redo(), "CTRL-SHIFT-Z", Icons.REDO]
    ]);

    span.menu("Session", [
      ["Save Default File", () => {this.ctx.state.saveLocalStorage()}],
      ["Clear Default File", () => {this.ctx.state.clearLocalStorage()}]
    ]);

    this.setCSS();
  }

  updateHeight() {
    if (!this.header)
      return;

    if (window.haveElectron) {
      this.maxSize[1] = this.minSize[1] = 1;
      electron_api.initMenuBar(this);
      return;
    }

    let rect = this.header.getClientRects()[0];
    if (rect) {
      this._height = rect.height;
    }

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
    flag     :  AreaFlags.HIDDEN|AreaFlags.NO_SWITCHER,
  }}
};
Editor.register(MenuBarEditor);
MenuBarEditor.STRUCT = nstructjs.STRUCT.inherit(MenuBarEditor, Editor) + `
}
`;
nstructjs.register(MenuBarEditor);
