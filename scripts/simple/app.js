import nstructjs from '../path-controller/util/struct.js';

export const DataModelClasses = [];
import {ToolStack} from '../path-controller/toolsys/toolsys.js';
import {Context} from '../path-controller/controller/context.js';
import {DataAPI} from '../path-controller/controller/controller.js';
import {Screen} from '../screen/FrameManager.js';
import {areaclasses} from '../screen/area_wrangler.js';
import * as util from '../util/util.js';
import {Editor} from './editor.js';

import {Vector2} from '../path-controller/util/vectormath.js';

import cconst from '../config/const.js';

export class DataModel {
  static defineAPI(api, strct) {
    return strct;
  }

  static register(cls) {
    DataModelClasses.push(cls);

    if (cls.hasOwnProperty("STRUCT")) {
      nstructjs.register(cls);
    }
  }
}

class EmptyContextClass extends Context {
  static defineAPI(api, strct) {
  }
}

import * as ui_noteframe from '../widgets/ui_noteframe.js';

/**
 * Extend the client-provided context class
 * with a few standard methods and properties
 *
 * */
function GetContextClass(ctxClass) {
  let StateSymbol = Symbol("AppState ref");

  return class ContextDerived extends ctxClass {
    constructor(state) {
      super(...arguments);

      this[StateSymbol] = state;
    }

    get screen() {
      return this[StateSymbol].screen;
    }

    set state(v) {
      this[StateSymbol] = v;
    }

    get state() {
      return this[StateSymbol];
    }

    get api() {
      return this[StateSymbol].api;
    }

    get toolstack() {
      return this[StateSymbol].toolstack;
    }

    toLocked() {
      //for now, don't support context locking
      return this;
    }

    message(msg, timeout=2500) {
      return ui_noteframe.message(this.screen, msg, timeout);
    }

    error(msg, timeout=2500) {
      return ui_noteframe.error(this.screen, msg, timeout);
    }

    warning(msg, timeout=2500) {
      return ui_noteframe.warning(this.screen, msg, timeout);
    }

    progressBar(msg, percent, color, timeout=1000) {
      return ui_noteframe.progbarNote(this.screen, msg, percent, color, timeout);
    }
  }
}

export function makeAPI(ctxClass) {
  let api = new DataAPI();

  for (let cls of DataModelClasses) {
    cls.defineAPI(api, api.mapStruct(cls, true));
  }

  for (let k in areaclasses) {
    areaclasses[k].defineAPI(api, api.mapStruct(areaclasses[k], true));
  }

  if (ctxClass.defineAPI) {
    ctxClass.defineAPI(api, api.mapStruct(ctxClass, true));
  } else {
    throw new Error("Context class should have a defineAPI static method");
  }

  api.rootContextStruct = api.mapStruct(ctxClass, api.mapStruct(ctxClass, true));

  return api;
}

import {Icons, loadDefaultIconSheet} from './icons.js';
import {IconManager, setIconManager, setIconMap, setTheme, UIBase} from '../core/ui_base.js';
import {FileArgs, loadFile, saveFile} from './file.js';
import {HotKey, KeyMap} from '../path-controller/util/simple_events.js';
import {initSplineTemplates} from '../path-controller/curve/curve1d_bspline.js';
import {MenuBarEditor, registerMenuBarEditor} from './menubar.js';
import {register} from './app_ops.js';

export class StartArgs {
  constructor() {
    this.singlePage = true;

    this.icons = Icons;
    this.iconsheet = undefined; //will default to loadDefaultIconSheet();
    this.iconSizes = [16, 24, 32, 48];
    this.iconTileSize = 32;
    this.iconsPerRow = 16;
    this.theme = undefined; //see scripts/core/theme.js

    this.registerSaveOpenOps = true;

    this.autoLoadSplineTemplates = true;
    this.showPathsInToolTips = true;
    this.enableThemeAutoUpdate = false;
    this.addHelpPickers = false;
    this.useNumSliderTextboxes = true;
    this.numSliderArrowLimit = cconst.numSliderArrowLimit;
    this.simpleNumSliders = cconst.simpleNumSliders;
  }
}

export class SimpleScreen extends Screen {
  constructor() {
    super();

    this.keymap = new KeyMap([
      new HotKey("Z", ["CTRL"], () => {
        this.ctx.toolstack.undo(this.ctx);
      }),
      new HotKey("Z", ["CTRL", "SHIFT"], () => {
        this.ctx.toolstack.redo(this.ctx);
      }),
    ])
  }

  init() {
    if (this.ctx.state.startArgs.registerSaveOpenOps) {
      this.keymap.add(new HotKey("S", ["CTRL"], "app.save()"));
      this.keymap.add(new HotKey("O", ["CTRL"], "app.open()"));
    }
  }

  static define() {
    return {
      tagname: "simple-screen-x"
    }
  }

  setCSS() {
    super.setCSS();

    this.style["position"] = UIBase.PositionKey;
    this.style["left"] = this.pos[0] + "px";
    this.style["top"] = this.pos[1] + "px";
  }
}

UIBase.register(SimpleScreen);

export class AppState {
  /** ctxClass is the context class.  It can be either a simple class
   *  or a subclass of the more complex path.ux Context class.  Note that
   *  using Context will avoid subtle undo stack errors caused by the context
   *  changing after a tool is run (this is why Context has a serialization
   *  mechanism).
   *
   *  Path.ux will actually subclass ctxClass and add a few standard methods
   *  and properties, see GetContextClass.*/
  constructor(ctxClass, screenClass = SimpleScreen) {
    this._ctxClass = ctxClass;

    ctxClass = GetContextClass(ctxClass);

    this.startArgs = undefined;
    this.currentFileRef = undefined; //current file path/ref

    this.ctx = new ctxClass(this);
    this.ctx._state = this;
    this.toolstack = new ToolStack();
    this.api = makeAPI(ctxClass);
    this.screenClass = screenClass;
    this.screen = undefined;

    this.fileMagic = "STRT";
    this.fileVersion = [0, 0, 1];
    this._fileExt = "data";
    this._fileExtSet = false;
    this.saveFilesInJSON = false; /* save files in nstructjs-json */

    this.defaultEditorClass = undefined; //if undefined, the first non-menubar editor will be used
  }


  get fileExt() {
    return this._fileExt;
  }

  set fileExt(ext) {
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
    let state = new this.constructor(this.ctx._ctxClass);

    state.api = this.api;
    state.ctx = this.ctx;
    state.startArgs = this.startArgs;
    state.saveFilesInJSON = this.saveFilesInJSON;

    state.toolstack = this.toolstack;
    state.toolstack.reset();

    this.screen.unlisten();
    this.screen.remove();

    for (let k in state) {
      this[k] = state[k];
    }

    this.makeScreen();
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
  saveFile(objects, args = {}) {
    args = new FileArgs(Object.assign({
      magic  : this.fileMagic,
      version: this.fileVersion,
      ext    : this.fileExt
    }, args));

    return new Promise((accept, reject) => {
      accept(saveFile(this, args, objects));
    });
  }

  /** It is recommended you override this to
   *  handle setting data state, e.g.
   *
   *  loadFile(data, args) {
   *    return super.loadFile(data, args).then((array_of_objects, fileMeta) => {
   *      //load array_of_objects into appropriate properties
   *      this.data = array_of_objects;
   *    });
   *  }
   *  */
  loadFile(data, args = {}) {
    return new Promise((accept, reject) => {
      args = new FileArgs(Object.assign({
        magic  : this.fileMagic,
        version: this.fileVersion,
        ext    : this.fileExt
      }, args));

      let ret = loadFile(this, args, data);

      if (args.doScreen) {
        try {
          this.ensureMenuBar();
        } catch (error) {
          console.error(error.stack);
          console.error(error.message);
          console.error("Failed to add menu bar");
        }

        this.screen.completeSetCSS();
        this.screen.completeUpdate();
      }

      accept(ret.objects, ret);
    });
  }

  ensureMenuBar() {
    let screen = this.screen;
    let ok = false;

    for (let sarea of screen.sareas) {
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

    let sarea = UIBase.createElement("screenarea-x");

    screen.appendChild(sarea);

    let h = 55;
    let min = new Vector2().addScalar(1e17);
    let max = new Vector2().addScalar(-1e17);
    let tmp = new Vector2();

    for (let sarea2 of screen.sareas) {
      if (sarea2 === sarea) {
        continue;
      }

      min.min(sarea2.pos);
      tmp.load(sarea2.pos).add(sarea2.size);
      max.max(tmp);
    }

    let scale = (max[1] - min[1] - h)/(max[1] - min[1]);

    for (let sarea2 of screen.sareas) {
      if (sarea2 === sarea) {
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

    let screen = this.screen = UIBase.createElement(this.screenClass.define().tagname);
    let sarea = UIBase.createElement("screenarea-x");

    screen.ctx = this.ctx;
    sarea.ctx = this.ctx;

    document.body.appendChild(screen);

    let cls = this.defaultEditorClass;

    if (!cls) {
      for (let k in areaclasses) {
        cls = areaclasses[k];

        if (cls !== MenuBarEditor) {
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

  start(args = new StartArgs()) {
    let args2 = new StartArgs();

    let methodsCheck = [
      "saveFile", "createFile"
    ];

    for (let method of methodsCheck) {
      let m1 = AppState.prototype[method];
      let m2 = this[method];

      if (m1 === m2) {
        console.warn(`Warning: it is recommended to override .${method} when subclassing simple.AppState`);
      }
    }

    document.body.style["touch-action"] = "none";

    registerMenuBarEditor();

    for (let k in args2) {
      if (args[k] === undefined) {
        args[k] = args2[k];
      }
    }

    if (args.registerSaveOpenOps) {
      register();
    }

    if (!args.iconsheet) {
      args.iconsheet = loadDefaultIconSheet();
    }

    this.startArgs = args;

    cconst.loadConstants(args);

    if (args.autoLoadSplineTemplates) {
      initSplineTemplates();
    }

    let sizes = [];
    let images = [];

    for (let size of args.iconSizes) {
      sizes.push([args.iconTileSize, size]);
      images.push(args.iconsheet);
    }

    window.iconsheet = args.iconsheet;


    let iconManager = new IconManager(images, sizes, args.iconsPerRow);
    setIconManager(iconManager);
    setIconMap(args.icons);

    if (args.theme) {
      setTheme(args.theme);
    }

    document.body.style["margin"] = "0px";
    document.body.style["padding"] = "0px";

    if (args.singlePage) {
      document.body.style["overflow"] = "hidden";
    }

    this.makeScreen();

    Object.defineProperty(window, "C", {
      get() {
        return this._appstate.ctx;
      }
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
