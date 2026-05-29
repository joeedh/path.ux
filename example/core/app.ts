import "../editors/docbrowser/docbrowser.js";
import {
  nstructjs,
  ToolStack,
  UIBase,
  setIconManager,
  setIconMap,
  setTheme,
  IconManager,
  keymap,
  ScreenArea,
  util,
  contextWrangler,
  HotKey,
  KeyMap,
  Screen,
  DataPathSetOp,
  buildToolSysAPI,
  DataAPI,
  ContextLike,
} from "../pathux.js";

import { ModelData } from "./state.js";
import { defineAPI } from "../api/api_define.js";
import { ToolContext, ViewContext } from "./context.js";
import '../draw/draw_ops';
import { DataLib, DataRef, DataBlock } from "./datablock.js";
import { theme } from "../theme.js";

import { WorkspaceEditor } from "../editors/workspace/workspace.js";
import { AppScreen } from "../editors/screen.js";
//import * as util from '../util/util.js';
import "./toolop.js";
import "../editors/eventgraph/eventgraph.js";

import cconst1, { Version } from "./const.js";
import { cconst } from "../pathux.js";

/*load our application's constants into pathux. The example stores app-specific
constants (VERSION, LOCALSTORAGE_KEY, customWindowSize) that don't fit the library's
IPathUXConstants shape, so cast to the loadConstants parameter type.*/
cconst.loadConstants(cconst1 as unknown as Parameters<typeof cconst.loadConstants>[0]);

import { MenuBarEditor } from "../editors/menu/menu.js";

import { PropsEditor } from "../editors/properties/properties.js";
import { LogEditor } from "../editors/log/log_editor.js";
import { Icons } from "../editors/icon_enum.js";

const iconsheet = document.getElementById("iconsheet") as HTMLImageElement | null;
const iconmanager = new IconManager(
  [iconsheet, iconsheet, iconsheet],
  [
    [32, 16],
    [32, 32],
    [32, 48],
  ],
  16
);

setIconManager(iconmanager);
setIconMap(Icons);

/*
let dopExecPost = DataPathSetOp.prototype.execPost;
DataPathSetOp.prototype.execPost = function() {
  dopExecPost.call(this, ...arguments);
  window.redraw_all_full();
};

let dopUndo = DataPathSetOp.prototype.undo;
DataPathSetOp.prototype.undo = function() {
  dopUndo.call(this, ...arguments);
  window.redraw_all_full();
};
//*/

export class AppState {
  toolstack: ToolStack;
  api: DataAPI;
  viewctx: ViewContext;
  toolctx: ToolContext;
  datalib: DataLib;
  screen: AppScreen | undefined;

  constructor() {
    this.toolstack = new ToolStack();
    this.api = defineAPI();
    this.viewctx = new ViewContext(this);
    this.toolctx = new ToolContext(this);

    this.datalib = new DataLib();
    const model = new ModelData();

    this.datalib.add(model);

    // Context subclasses can't structurally satisfy ContextLike (Context.toLocked
    // returns LockedContext), so cast at the toolstack boundary as the library does.
    this.toolstack.setRestrictedToolContext(this.toolctx as unknown as ContextLike);

    //make global to viewctx--for debugging purposes only!!!
    window.CTX = this.viewctx;

    this.screen = undefined;
  }

  genScreen() {
    const screen = (this.screen = UIBase.createElement<AppScreen>("app-screen-x"));
    screen.ctx = this.viewctx as unknown as ContextLike;

    if (cconst1.DEBUG.customWindowSize) {
      screen.size[0] = cconst1.DEBUG.customWindowSize.width;
      screen.size[1] = cconst1.DEBUG.customWindowSize.height;
    }

    const sarea = this.screen.newScreenArea();
    sarea.switch_editor(WorkspaceEditor);

    screen.add(sarea);

    const t = 300 / window.innerWidth;

    const wsarea = screen.splitArea(sarea, 0.1, true);
    sarea.switchEditor(MenuBarEditor);

    const sarea2 = screen.splitArea(wsarea, 0.6, false);
    sarea2.switchEditor(PropsEditor);

    /*
    if (!util.isMobile) {
      screen.splitArea(wsarea, 0.5, false);
      screen.splitArea(sarea2, 0.5, false);

      screen.splitArea(wsarea, 0.5, true);
      screen.splitArea(sarea2, 0.5, true);
    }
//*/

    //screen.splitArea(sarea2, 0.55, false);
    //sarea2 = screen.splitArea(sarea, 1.0-t, false);
    //sarea2.switch_editor(SideBarEditor);
    //setTimeout(() => {
    //  screen.splitArea(sarea2, 0.55, true);
    //}, 500);

    screen.solveAreaConstraints();
    screen.regenBorders();

    screen.update();
    screen.setCSS();
    return screen;
  }

  createFile(
    args: { writeScreen: boolean; writeData: boolean } = { writeScreen: true, writeData: true }
  ) {
    const data: number[] = [];

    const buf = new ArrayBuffer(8);
    const f32 = new Float32Array(buf);
    const i32 = new Int32Array(buf);
    const u8 = new Uint8Array(buf);

    function packbyte(i: number) {
      data.push(i);
    }

    function packint(i: number) {
      i32[0] = i;
      for (let i = 0; i < 4; i++) {
        data.push(u8[i]);
      }
    }

    function writestr(s: string) {
      for (let i = 0; i < s.length; i++) {
        data.push(s.charCodeAt(i));
      }
    }

    function packfloat(i: number) {
      f32[0] = i;
      for (let i = 0; i < 4; i++) {
        data.push(u8[i]);
      }
    }

    function writeblock(type: string, block: number[]) {
      writestr(type);
      packint(block.length);

      for (let i = 0; i < block.length; i++) {
        data.push(block[i]);
      }
    }

    writestr("STRT");

    const version = cconst1.VERSION.toJSON();

    packbyte(version[0]);
    packbyte(version[1]);
    packbyte(version[2]);
    packbyte(version[3]);

    const str = nstructjs.write_scripts();
    packint(str.length);
    writestr(str);

    if (args.writeScreen) {
      const data2: number[] = [];

      nstructjs.writeObject(data2, this.screen);
      writeblock("SCRN", data2);
    }

    if (args.writeData) {
      const data2: number[] = [];
      nstructjs.writeObject(data2, this.datalib);
      writeblock("DATA", data2);
    }

    return data;
  }

  loadFile(
    rawData: number[] | Uint8Array | ArrayBuffer | DataView,
    args = { resetToolStack: true, loadScreen: true }
  ) {
    args.loadScreen = args.loadScreen === undefined ? true : args.loadScreen;
    args.resetToolStack = args.resetToolStack === undefined ? true : args.resetToolStack;

    if (args.loadScreen) {
      contextWrangler.reset();
    }

    let data: DataView;
    if (rawData instanceof Array) {
      data = new DataView(new Uint8Array(rawData).buffer);
    } else if (rawData instanceof Uint8Array) {
      data = new DataView(rawData.buffer);
    } else if (rawData instanceof ArrayBuffer) {
      data = new DataView(rawData);
    } else {
      data = rawData;
    }

    let _i = 0;
    const endian = true;
    function readfour() {
      let s = String.fromCharCode(data.getUint8(_i++));
      s += String.fromCharCode(data.getUint8(_i++));
      s += String.fromCharCode(data.getUint8(_i++));
      s += String.fromCharCode(data.getUint8(_i++));

      return s;
    }

    function readbyte() {
      _i += 1;
      return data.getUint8(_i - 1);
    }

    function readint() {
      _i += 4;
      return data.getInt32(_i - 4, endian);
    }

    function readfloat() {
      _i += 4;
      return data.getFloat32(_i - 4, endian);
    }

    function readstring() {
      const len = readint();

      if (len > 1024 * 1024) {
        throw new Error("file corruption error");
      }

      let ret = "";
      for (let i = 0; i < len; i++) {
        ret += String.fromCharCode(data.getUint8(_i++));
      }
      return ret;
    }

    const magic = readfour();

    if (magic !== "STRT") {
      throw new Error("File corruption");
    }

    const versionArr: number[] = [];
    for (let i = 0; i < 4; i++) {
      versionArr.push(readbyte());
    }
    const version = new Version().loadJSON(versionArr);

    const structs = readstring();

    let screen: AppScreen | undefined;
    let datalib: DataLib | undefined;

    const rstruct = new nstructjs.STRUCT();
    rstruct.parse_structs(structs);

    while (_i < data.buffer.byteLength) {
      const type = readfour();
      const len = readint();

      const data2 = new DataView(data.buffer.slice(_i, _i + len));

      _i += len;
      if (type === "SCRN") {
        screen = rstruct.readObject(data2, AppScreen);
      } else if (type === "DATA") {
        datalib = rstruct.readObject(data2, DataLib);
      } else {
        console.log("Unknown data type", type);
      }
    }

    console.error("DATALIB", datalib);

    this.toolctx.reset();
    this.viewctx.reset();

    if (datalib) {
      this.datalib = datalib;
    }

    if (screen && args.loadScreen) {
      screen.ctx = this.viewctx as unknown as ContextLike;

      this.screen?.unlisten();
      this.screen?.remove();

      this.screen = screen;

      document.body.appendChild(screen);

      screen._init();
      screen.listen();
      screen.update();
      screen.setCSS();

      const size = cconst1.customWindowSize
        ? [cconst1.customWindowSize.width, cconst1.customWindowSize.height]
        : [window.innerWidth, window.innerHeight];
      screen.on_resize(screen.size, size);
    }

    if (args.resetToolStack) {
      this.toolstack.reset();
    }

    if (screen) {
      for (const sarea of screen.sareas) {
        for (const area of sarea.editors) {
          area.on_fileload(area === sarea.area);
        }
      }
    }
  }

  createUndoFile() {
    // Undo files carry the datalib, not the screen.  (Previously this passed only
    // {writeScreen:false}, which left writeData undefined and silently produced an
    // empty undo file.)
    return this.createFile({ writeScreen: false, writeData: true });
  }

  loadUndoFile(data: number[] | Uint8Array | ArrayBuffer | DataView) {
    this.loadFile(data, { resetToolStack: false, loadScreen: false });
  }

  clearLocalStorage() {
    delete localStorage[cconst1.LOCALSTORAGE_KEY];
    console.log("cleared local storage");
  }

  saveLocalStorage() {
    const file = this.createFile();
    const str = util.btoa(new Uint8Array(file));

    localStorage[cconst1.LOCALSTORAGE_KEY] = str;
    console.log("saved to local storage", str.length);
  }

  loadLocalStorage() {
    if (cconst1.LOCALSTORAGE_KEY in localStorage) {
      const raw = localStorage[cconst1.LOCALSTORAGE_KEY];
      const buf = new DataView(util.atob(raw).buffer);

      // (Previously an unconditional `return this.loadFile(buf)` here made the
      // try/catch dead code; restore the intended guarded load.)
      try {
        this.loadFile(buf);
      } catch (error) {
        util.print_stack(error as Error);
        console.warn("Failed to load startup file");
      }
    }
  }

  start() {
    this.genScreen();
    const screen = this.screen!;

    document.body.appendChild(screen);
    screen.update();
    screen.listen();
  }
}

export function start() {
  setTheme(theme);

  window._appstate = new AppState();

  nstructjs.validateStructs();

  let animreq: number | undefined;
  const f = () => {
    animreq = undefined;

    const screen = _appstate.screen;
    if (!screen) {
      return;
    }
    for (const sarea of screen.sareas) {
      if (sarea.draw) {
        sarea.draw();
      }
    }
  };

  window.redraw_all = () => {
    if (animreq) {
      //wait for pending draw to finish
      return;
    }

    animreq = requestAnimationFrame(f);
  };

  window.redraw_all_full = () => {
    if (!_appstate?.screen) return;

    const screen = _appstate.screen;

    for (const sarea of screen.sareas) {
      if (sarea.area && sarea.area instanceof WorkspaceEditor) {
        sarea.area.tagFullDraw();
      }
    }
    window.redraw_all();
  };

  _appstate.start();
  _appstate.loadLocalStorage();
}
