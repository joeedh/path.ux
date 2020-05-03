import {HotKey, KeyMap} from "../../scripts/simple_events.js";
import {UIBase} from "../../scripts/ui_base.js";
import * as nstructjs from "../../scripts/struct.js";
import {Screen} from "../../scripts/FrameManager.js";

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
