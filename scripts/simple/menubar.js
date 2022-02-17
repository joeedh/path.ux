import {Editor} from './editor.js';
import {UIBase} from '../core/ui_base.js';
import {nstructjs} from '../path-controller/controller.js';
import {AreaFlags} from '../screen/ScreenArea.js';
import {electron_api} from '../pathux.js';

/** see ./editor.js:Editor.registerAppMenu */

export class MenuBarEditor extends Editor {
  constructor() {
    super();

    this.updateHeight();
    this.borderLock = 1 | 2 | 4 | 8;
    this.areaDragToolEnabled = false;

    this._height = 25;

    this.needsRebuild = false;
  }

  get height() {
    return this._height;
  }

  set height(v) {
    this._height = v;
    this.updateHeight();
  }

  static define() {
    return {
      tagname : "simple-menu-editor-x",
      areaname: "menu",
      uiname  : "Menu Bar",
      icon    : -1,
      //hide in editor list
      flag    : AreaFlags.HIDDEN | AreaFlags.NO_HEADER_CONTEXT_MENU | AreaFlags.NO_COLLAPSE | AreaFlags.NO_SWITCHER
    }
  }

  updateHeight(force = false) {
    if (!this.header)
      return;

    if (window.haveElectron) {
      this.maxSize[1] = this.minSize[1] = 1;
      electron_api.initMenuBar(this);
      return;
    }

    if (this._height === undefined) {
      let rect = this.header.getClientRects()[0];

      if (rect) {
        this._height = rect.height;
      }
    }

    let update = force || this._height !== this.minSize[1];
    this.minSize[1] = this.maxSize[1] = this._height;

    if (update && this.ctx && this.getScreen()) {
      this.getScreen().solveAreaConstraints();
    }
  }

  makeMenuBar(container) {
    Editor.makeMenuBar(this.ctx, container, this);
  }

  flagRebuild() {
    this.needsRebuild = true;
  }

  init() {
    super.init();

    this.background = this.getDefault("AreaHeaderBG");

    this.menuRow = this.header.row();
    this.makeMenuBar(this.menuRow);

    this.doOnce(() => {
      if (window.haveElectron) {
        this.height = 1;
        electron_api.initMenuBar(this);
      }
    });

    this.updateHeight(true);
    this.flushUpdate();
  }

  rebuild() {
    this.needsRebuild = false;

    this.menuRow.clear();
    this.makeMenuBar(this.menuRow);
    this.flushUpdate();
  }

  update() {
    if (this.needsRebuild) {
      this.rebuild();
    }
  }
}

MenuBarEditor.STRUCT = nstructjs.inherit(MenuBarEditor, Editor, "MenuBarEditor") + `
}
`;

export function registerMenuBarEditor() {
  Editor.register(MenuBarEditor);
}
