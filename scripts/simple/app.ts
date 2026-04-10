import nstructjs from "../path-controller/util/struct.js";
import { Context, ContextOverlay, makeDerivedOverlay } from "../path-controller/controller/context.js";

export const DataModelClasses: (typeof DataModel)[] = [];
import { buildToolSysAPI, SavedToolDefaults, ToolStack } from "../path-controller/toolsys/toolsys.js";
import { DataAPI } from "../path-controller/controller/controller.js";
import { Screen } from "../screen/FrameManager.js";
import { contextWrangler } from "../screen/area_wrangler.js";
import { Editor } from "./editor.js";

import { Vector2 } from "../path-controller/util/vectormath.js";

import cconst from "../config/const.js";

export class DataModel {
  static defineAPI(api: DataAPI, strct: unknown) {
    return strct;
  }

  /** Automatically registers cls with nstructjs
   *  and handles STRUCT inheritance.
   */
  static register(cls: typeof DataModel & { STRUCT?: string }) {
    if (!cls.hasOwnProperty("defineAPI")) {
      //  throw new Error(cls.name + "is missing a defineAPI method");
    }

    DataModelClasses.push(cls);

    if (cls.hasOwnProperty("STRUCT") && !nstructjs.isRegistered(cls)) {
      cls.STRUCT = nstructjs.inlineRegister(cls, cls.STRUCT!);
    }
  }
}

class EmptyContextClass extends Context {
  static defineAPI(_api: DataAPI, _strct: unknown) {}
}

import * as ui_noteframe from "../widgets/ui_noteframe.js";

/**
 * Extend the client-provided context class
 * with a few standard methods and properties
 *
 * */
function GetContextClass(ctxClass: Function): typeof Context {
  let ok = 0;
  let cls = ctxClass as any;
  while (cls) {
    if (cls === Context) {
      ok = 1;
    } else if (cls === ContextOverlay) {
      ok = 2;
    }

    cls = cls.__proto__;
  }

  if (ok === 1) {
    return ctxClass as typeof Context;
  }

  let OverlayDerived: ReturnType<typeof makeDerivedOverlay>;

  if (ok === 2) {
    OverlayDerived = ctxClass as ReturnType<typeof makeDerivedOverlay>;
  } else {
    OverlayDerived = makeDerivedOverlay(ctxClass as { new (appstate: unknown): Record<string, unknown> });
  }

  interface IBasicAppState {
    toolstack: ToolStack;
    api: DataAPI;
    screen: Screen;
  }

  class Overlay extends OverlayDerived {
    constructor(state: unknown) {
      super(state);
    }

    protected get typedState() {
      return this.state as IBasicAppState;
    }

    get screen() {
      return this.typedState.screen;
    }

    get activeArea() {
      return contextWrangler.getLastArea();
    }

    get api() {
      return this.typedState.api;
    }

    get toolstack() {
      return this.typedState.toolstack;
    }

    get toolDefaults() {
      return SavedToolDefaults;
    }

    get last_tool() {
      return (this.toolstack as ToolStack).head;
    }

    message(msg: string, timeout = 2500) {
      return ui_noteframe.message(this.screen as unknown as Node, msg, timeout);
    }

    error(msg: string, timeout = 2500) {
      return ui_noteframe.error(this.screen as unknown as Node, msg, timeout);
    }

    warning(msg: string, timeout = 2500) {
      return ui_noteframe.warning(this.screen as unknown as Node, msg, timeout);
    }

    progressBar(msg: string, percent: number, color: string, timeout = 1000) {
      return ui_noteframe.progbarNote(this.screen as unknown as Node, msg, percent, color, timeout);
    }
  }

  Context.register(Overlay);

  return class ContextDerived extends Context {
    constructor(state: unknown) {
      super(state);

      this.pushOverlay(new Overlay(state));
    }

    static defineAPI(api: DataAPI, st: { dynamicStruct(key: string, name: string, label: string): void }) {
      st.dynamicStruct("activeArea", "activeArea", "Active Area");
      return (Overlay as unknown as typeof EmptyContextClass).defineAPI(api, st);
    }
  };
}

export function makeAPI(ctxClass: typeof Context) {
  const api = new DataAPI();

  for (const cls of DataModelClasses) {
    if (cls.defineAPI) {
      cls.defineAPI(api, api.mapStruct(cls, true));
    }
  }

  for (const k in areaclasses) {
    (areaclasses[k] as unknown as { defineAPI: (api: DataAPI, strct: unknown) => void }).defineAPI(
      api,
      api.mapStruct(areaclasses[k], true)
    );
  }

  if ((ctxClass as any).defineAPI) {
    (ctxClass as any).defineAPI(api, api.mapStruct(ctxClass, true));
  } else {
    throw new Error("Context class should have a defineAPI static method");
  }

  const rootContextStruct = api.mapStruct(ctxClass, api.mapStruct(ctxClass, true) as unknown as boolean);
  api.rootContextStruct = rootContextStruct;

  buildToolSysAPI(api, false, rootContextStruct, ctxClass as any, true);

  return api;
}

import { Icons, loadDefaultIconSheet } from "./icons.js";
import { IconManager, setIconManager, setIconMap, setTheme, ThemeRecord, UIBase } from "../core/ui_base.js";
import { FileArgs, loadFile, saveFile } from "./file.js";
import { HotKey, KeyMap } from "../path-controller/util/simple_events.js";
import { initSplineTemplates } from "../path-controller/curve/curve1d_bspline.js";
import { MenuBarEditor, registerMenuBarEditor } from "./menubar.js";
import { register } from "./app_ops.js";
import { IContextBase } from "../core/context_base.js";
import { areaclasses } from "../screen/area_base.js";

declare global {
  var _appstate: AppState;
}

type ScreenAreaElement = UIBase & {
  pos: Vector2;
  size: Vector2;
  switch_editor(cls: unknown): void;
};

export class StartArgs {
  singlePage: boolean;
  DEBUG: Record<string, unknown>;
  icons: Record<string, number>;
  iconsheet: HTMLImageElement | undefined;
  iconSizes: number[];
  iconTileSize: number;
  iconsPerRow: number;
  //see scripts/core/theme.js
  theme?: ThemeRecord;
  registerSaveOpenOps: boolean;
  autoLoadSplineTemplates: boolean;
  showPathsInToolTips: boolean;
  enableThemeAutoUpdate: boolean;
  addHelpPickers: boolean;
  useNumSliderTextboxes: boolean;
  numSliderArrowLimit: number;
  simpleNumSliders: boolean;
  saveFilesInJSON: boolean;

  constructor() {
    this.singlePage = true;

    this.DEBUG = {};
    this.icons = Icons;
    this.iconsheet = undefined; //will default to loadDefaultIconSheet();
    this.iconSizes = [16, 24, 32, 48];
    this.iconTileSize = 32;
    this.iconsPerRow = 16;

    this.registerSaveOpenOps = true;

    this.autoLoadSplineTemplates = true;
    this.showPathsInToolTips = true;
    this.enableThemeAutoUpdate = false;
    this.addHelpPickers = false;
    this.useNumSliderTextboxes = true;
    this.numSliderArrowLimit = (cconst as Record<string, unknown>).numSliderArrowLimit as number;
    this.simpleNumSliders = (cconst as Record<string, unknown>).simpleNumSliders as boolean;
    this.saveFilesInJSON = false;
  }
}

export class SimpleScreen extends Screen {
  constructor() {
    super();

    this.keymap = new KeyMap([
      new HotKey("Z", ["CTRL"], () => {
        (this.ctx as unknown as { toolstack: ToolStack }).toolstack.undo();
      }),
      new HotKey("Z", ["CTRL", "SHIFT"], () => {
        (this.ctx as unknown as { toolstack: ToolStack }).toolstack.redo();
      }),
    ]);
  }

  static define() {
    return {
      tagname: "simple-screen-x",
    };
  }

  override init() {
    const state = (this.ctx as unknown as Record<string, unknown>).state as Record<string, unknown>;
    if ((state.startArgs as StartArgs).registerSaveOpenOps) {
      this.keymap!.add(new HotKey("S", ["CTRL"], "app.save()"));
      this.keymap!.add(new HotKey("O", ["CTRL"], "app.open()"));
    }
  }

  override setCSS() {
    super.setCSS();
    (this.style as unknown as Record<string, string>)["position"] = UIBase.PositionKey;
    (this.style as unknown as Record<string, string>)["left"] = this.pos![0 as const] + "px";
    (this.style as unknown as Record<string, string>)["top"] = this.pos![1 as 0] + "px";
  }
}

UIBase.register(SimpleScreen);

export class AppState {
  _ctxClass: Function;
  startArgs: StartArgs | undefined;
  currentFileRef: unknown;
  api: DataAPI;
  ctx: Context;
  toolstack: ToolStack;
  screenClass: typeof Screen;
  screen: Screen | undefined;
  fileMagic: string;
  fileVersion: [number, number, number];
  _fileExt: string;
  _fileExtSet: boolean;
  saveFilesInJSON: boolean;
  defaultEditorClass: typeof Editor | undefined;

  /** ctxClass is the context class.  It can be either a simple class
   *  or a subclass of the more complex path.ux Context class.  Note that
   *  using Context will avoid subtle undo stack errors caused by the context
   *  changing after a tool is run (this is why Context has a serialization
   *  mechanism).
   *
   *  Path.ux will actually subclass ctxClass and add a few standard methods
   *  and properties, see GetContextClass.*/
  constructor(ctxClass: Function, screenClass: typeof Screen = SimpleScreen as unknown as typeof Screen) {
    this._ctxClass = ctxClass;

    const derivedCtxClass = GetContextClass(ctxClass)!;

    this.startArgs = undefined;
    this.currentFileRef = undefined; //current file path/ref

    this.api = makeAPI(derivedCtxClass);
    this.ctx = new derivedCtxClass(this);
    (this.ctx as Record<string, unknown>)._state = this;
    this.toolstack = new ToolStack({} as unknown as IContextBase);
    this.screenClass = screenClass;
    this.screen = undefined;

    this.fileMagic = "STRT";
    this.fileVersion = [0, 0, 1];
    this._fileExt = "data";
    this._fileExtSet = false;
    this.saveFilesInJSON = false; /* save files in nstructjs-json */

    this.defaultEditorClass = undefined; //if undefined, the first non-menubar editor will be used
  }

  private _makeFileArgs(args: Record<string, unknown>) {
    return new FileArgs(
      Object.assign(
        {
          magic  : this.fileMagic,
          version: this.fileVersion,
          ext    : this.fileExt,
        },
        args
      )
    );
  }

  get fileExt() {
    return this._fileExt;
  }

  set fileExt(ext: string) {
    this._fileExt = ext;
    this._fileExtSet = true;
  }

  /** resets the undo stack */
  reset() {
    this.toolstack.reset();
  }

  /** Create a new file. See this.makeScreen() if you wish
   *  to create a new screen at this time, and this.reset()
   *  if you wish to reset the undo stack*/
  createNewFile() {
    console.warn("appstate.createNewFile: implement me, using default hack");
    const state = new (this.constructor as new (ctxClass: Function, screenClass?: typeof Screen) => AppState)(
      (this.ctx as Record<string, unknown>)._ctxClass as Function
    );

    state.api = this.api;
    state.ctx = this.ctx;
    state.startArgs = this.startArgs;
    state.saveFilesInJSON = this.saveFilesInJSON;

    state.toolstack = this.toolstack;
    state.toolstack.reset();

    this.screen!.unlisten();
    this.screen!.remove();

    for (const k in state) {
      (this as unknown as Record<string, unknown>)[k] = (state as unknown as Record<string, unknown>)[k];
    }

    this.makeScreen();
  }

  saveFileSync(objects: unknown[] | undefined, args: Record<string, unknown> = {}) {
    return saveFile(
      this as unknown as { saveFilesInJSON?: boolean; screen: unknown },
      this._makeFileArgs(args),
      objects ?? []
    );
  }

  /** Serialize the application state. Takes
   *  a list of objects to save (with nstructjs);
   *  Subclasses should override this, like so:
   *
   *  saveFile(args={}) {
   *    let objects = app state;
   *    return super.saveFile(objects, args);
   *  }
   **/
  saveFile(objects: unknown[] | undefined, args: Record<string, unknown> = {}) {
    return new Promise<unknown>((accept, _reject) => {
      accept(this.saveFileSync(objects, args));
    });
  }

  loadFileSync(data: unknown, args: Record<string, unknown> = {}) {
    const fileArgs = this._makeFileArgs(args);

    const ret = loadFile(this, fileArgs, data);

    if (fileArgs.doScreen) {
      try {
        this.ensureMenuBar();
      } catch (error: unknown) {
        console.error((error as Error).stack);
        console.error((error as Error).message);
        console.error("Failed to add menu bar");
      }

      this.screen!.completeSetCSS();
      this.screen!.completeUpdate();
    }

    return ret;
  }

  /**
   *  Loads a new file. The default behavior is a
   *  complete state reset (you can control this
   *  with args.reset_toolstack, args.reset_context
   *  and args.doScreen).
   *
   *  As the base class cannot know just what to do
   *  with the loaded data (the objects parameter
   *  passed to saveFile) it is recommended you
   *  override this function like so:
   *
   *  loadFile(data, args) {
   *    return super.loadFile(data, args).then(fileData) => {
   *      // load fileData.objects into appropriate properties
   *      // this is the same objects array originally passed
   *      // to this.saveFile
   *      this.data = fileData.objects;
   *    });
   *  }
   *
   *  @param data
   *  @param args
   *  */
  loadFile(data: unknown, args: Record<string, unknown> = {}) {
    return new Promise<unknown>((accept, _reject) => {
      accept(this.loadFileSync(data, args));
    });
  }

  ensureMenuBar() {
    const screen = this.screen!;
    let ok = false;

    for (const sarea of screen.sareas) {
      if (sarea.area instanceof MenuBarEditor) {
        ok = true;
        break;
      }
    }

    if (ok) {
      return;
    }

    if (!Editor.makeMenuBar) {
      /* don't make menu bar if Editor.registerAppMenu hasn't been called */
      return;
    }

    /* ensure screen size is up to date */
    screen.update();

    const sarea = UIBase.createElement("screenarea-x") as ScreenAreaElement;

    screen.appendChild(sarea);

    const h = 55;
    const min = new Vector2().addScalar(1e17);
    const max = new Vector2().addScalar(-1e17);
    const tmp = new Vector2();

    for (const sarea2 of screen.sareas) {
      if (sarea2 === (sarea as unknown)) {
        continue;
      }

      min.min(sarea2.pos);
      tmp.load(sarea2.pos).add(sarea2.size);
      max.max(tmp);
    }

    const scale = (max[1] - min[1] - h) / (max[1] - min[1]);

    for (const sarea2 of screen.sareas) {
      if (sarea2 === (sarea as unknown)) {
        continue;
      }

      sarea2.pos[1] *= scale;
      sarea2.size[1] *= scale;
      sarea2.pos[1] += h;
    }

    sarea.pos.zero();
    sarea.size[0] = screen.size[0];
    sarea.size[1] = h;

    screen.regenScreenMesh();
    screen.snapScreenVerts();

    sarea.switch_editor(MenuBarEditor);

    screen.solveAreaConstraints();

    screen.completeSetCSS();
    screen.completeUpdate();
  }

  makeScreen() {
    if (this.screen) {
      this.screen.unlisten();
      this.screen.remove();
    }

    const screen = (this.screen = UIBase.createElement(
      (this.screenClass as unknown as { define(): { tagname: string } }).define().tagname
    ) as Screen);
    const sarea = UIBase.createElement("screenarea-x") as ScreenAreaElement;

    screen.ctx = this.ctx as unknown as typeof screen.ctx;
    sarea.ctx = this.ctx as unknown as typeof sarea.ctx;

    document.body.appendChild(screen);

    let cls: typeof Editor | undefined = this.defaultEditorClass;

    if (!cls) {
      for (const k in areaclasses) {
        cls = areaclasses[k] as unknown as typeof Editor;

        if (cls !== (MenuBarEditor as unknown)) {
          break;
        }
      }
    }

    sarea.switch_editor(cls);
    screen.appendChild(sarea);

    screen._init();
    screen.listen();
    screen.update();
    screen.completeSetCSS();
    screen.completeUpdate();

    if (Editor.makeMenuBar) {
      this.ensureMenuBar();
    }
  }

  start(args: StartArgs | Record<string, unknown> = new StartArgs()) {
    nstructjs.validateStructs();

    const args2 = new StartArgs();

    const methodsCheck: (keyof AppState)[] = ["saveFile", "createNewFile", "loadFile"];

    for (const method of methodsCheck) {
      const m1 = AppState.prototype[method];
      const m2 = this[method];

      if (m1 === m2) {
        console.warn(`Warning: it is recommended to override .${method} when subclassing simple.AppState`);
      }
    }

    document.body.style["touchAction"] = "none";

    registerMenuBarEditor();

    const argsRec = args as any;
    const args2Rec = args2 as any;
    for (const k in args2) {
      if (argsRec[k] === undefined) {
        argsRec[k] = args2Rec[k];
      }
    }

    const startArgs = args as StartArgs;

    if (startArgs.registerSaveOpenOps) {
      register();
    }

    if (!startArgs.iconsheet) {
      startArgs.iconsheet = loadDefaultIconSheet();
    }

    this.startArgs = startArgs;

    cconst.loadConstants(startArgs as unknown as import("../config/const.js").PathUXConstants);

    if (startArgs.autoLoadSplineTemplates) {
      initSplineTemplates();
    }

    const sizes: [number, number][] = [];
    const images: HTMLImageElement[] = [];

    for (const size of startArgs.iconSizes) {
      sizes.push([startArgs.iconTileSize, size]);
      images.push(startArgs.iconsheet!);
    }

    window.iconsheet = startArgs.iconsheet!;

    const iconManager = new IconManager(images, sizes, startArgs.iconsPerRow);
    setIconManager(iconManager);
    setIconMap(startArgs.icons);

    if (startArgs.theme) {
      setTheme(startArgs.theme);
    }

    document.body.style["margin"] = "0px";
    document.body.style["padding"] = "0px";

    if (startArgs.singlePage) {
      document.body.style["overflow"] = "hidden";
    }

    this.makeScreen();

    Object.defineProperty(window, "C", {
      get() {
        return _appstate.ctx;
      },
    });

    nstructjs.validateStructs();

    if (this.saveFilesInJSON && !this._fileExtSet) {
      this._fileExt = "json";
    }

    if (this._fileExt.startsWith(".")) {
      this._fileExt = this._fileExt.slice(1, this._fileExt.length).trim();
    }
  }
}
