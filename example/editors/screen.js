import {HotKey, KeyMap, UIBase, nstructjs, Screen} from '../pathux.js';

export class AppScreen extends Screen {
  constructor() {
    super();

    this.defineKeymap();
  }

  defineKeymap() {
    this.keymap = new KeyMap([
      new HotKey("Z", ["CTRL"], () => {
        console.log("undo hotkey");
        _appstate.toolstack.undo();
      }),
      new HotKey("Z", ["CTRL", "SHIFT"], () => {
        console.log("redo hotkey");
        _appstate.toolstack.redo();
      }),
      new HotKey("Y", ["CTRL"], () => {
        console.log("redo hotkey");
        _appstate.toolstack.redo();
      }),
      new HotKey("S", [], () => {
        _appstate.screen.splitTool();
      })
    ]);
  }

  init() {
    super.init();
  }

  static define() {return {
    tagname : "app-screen-x"
  }}
}
AppScreen.STRUCT = nstructjs.STRUCT.inherit(AppScreen, Screen, "app.AppScreen") + `
}`;
nstructjs.register(AppScreen);
UIBase.register(AppScreen);
