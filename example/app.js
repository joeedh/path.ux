import {ModelData, createAPI} from "./state.js";
import {ToolStack} from "../scripts/simple_toolsys.js";
import {ToolContext, ViewContext} from "./context.js";
import {Screen} from "../scripts/FrameManager.js";
import {UIBase, setIconManager, setIconMap, setTheme,
        IconManager} from "../scripts/ui_base.js";
import {keymap} from "../scripts/events.js";
import {ScreenArea} from "../scripts/ScreenArea.js";
import {SimpleEditor, SimpleEditor2, SimpleEditor3} from "./editors.js";
import * as nstructjs from '../scripts/struct.js';

import {theme} from './theme.js';
setTheme(theme);

import {Icons} from "./icon_enum.js";
setIconMap(Icons);

import cconst1 from './const.js';
import cconst2 from '../scripts/const.js';
import {HotKey, KeyMap} from "../scripts/simple_events.js";

cconst2.loadConstants(cconst1);

let iconmanager = new IconManager([
  document.getElementById("iconsheet16"),
  document.getElementById("iconsheet32"),
  document.getElementById("iconsheet48")
], [16, 32, 48], 16);

setIconManager(iconmanager);

export class AppState {
  constructor() {
    this.toolstack = new ToolStack();
    this.data = new ModelData();
    this.api = createAPI();
    this.viewctx = new ViewContext(this);
    this.toolctx = new ToolContext(this);

    this.screen = undefined;
  }

  genScreen() {
    let screen = this.screen = document.createElement("app-screen-x");
    screen.ctx = this.viewctx;

    let sarea = this.screen.newScreenArea();
    sarea.switch_editor(SimpleEditor);

    screen.add(sarea);

    let sarea2 = screen.splitArea(sarea, 0.5, false);
    sarea2.switch_editor(SimpleEditor2);

    let sarea3 = screen.splitArea(sarea2, 0.5, true);
    sarea3.switch_editor(SimpleEditor3);

    //setTimeout(() => {
    //  screen.splitArea(sarea2, 0.55, true);
    //}, 500);

    screen.update();
    return screen;
  }

  start() {
    this.genScreen();
    let screen = this.screen;

    document.body.appendChild(screen);
    screen.update();
    screen.listen();
  }
}

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

export function start() {
  window._appstate = new AppState();

  _appstate.start();
}
