import nstructjs from '../path-controller/util/struct.js';

export const DataModelClasses = [];
import {ToolStack} from '../path-controller/toolsys/toolsys.js';
import {Context} from '../path-controller/controller/context.js';
import {DataAPI} from '../path-controller/controller/controller.js';
import {Screen} from '../screen/FrameManager.js';
import {areaclasses} from '../screen/area_wrangler.js';
import * as util from '../util/util.js';

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

function GetContextClass(ctxClass) {
  return class ContextDerived extends ctxClass {
    get screen() {
      return this._state.screen;
    }

    get api() {
      return this._state.api;
    }

    get toolstack() {
      return this._state.toolstack;
    }

    toLocked() {
      //for now, don't support context locking
      return this;
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
import {IconManager, setIconManager, setIconMap} from '../core/ui_base.js';
import {FileArgs, loadFile, saveFile} from './file.js';

export class StartArgs {
  constructor() {
    this.icons = Icons;
    this.iconsheet = undefined; //will default to loadDefaultIconSheet();
    this.iconSizes = [16, 24, 32, 48];
    this.iconTileSize = 32;
    this.iconsPerRow = 16;
  }
}

export class AppState {
  constructor(ctxClass, screenClass = Screen) {
    ctxClass = GetContextClass(ctxClass);

    this.ctx = new ctxClass(this);
    this.ctx._state = this;
    this.toolstack = new ToolStack();
    this.api = makeAPI(ctxClass);
    this.screenClass = screenClass;
    this.screen = undefined;

    this.fileMagic = "STRT";
    this.fileVersion = [0, 0, 1];
    this.fileExt = ".data";
  }

  reset() {
    this.toolstack.reset();
  }

  saveFile(objects, args = {}) {
    args = new FileArgs(Object.assign({
      magic  : this.fileMagic,
      version: this.fileVersion,
      ext    : this.fileExt
    }, args));

    return saveFile(this, args, objects)
  }

  loadFile(data, args = {}) {
    args = new FileArgs(Object.assign({
      magic  : this.fileMagic,
      version: this.fileVersion,
      ext    : this.fileExt
    }, args));

    return loadFile(this, args, data);
  }

  makeScreen() {
    let screen = this.screen = document.createElement(this.screenClass.define().tagname);
    let sarea = document.createElement("screenarea-x");

    screen.ctx = this.ctx;
    sarea.ctx = this.ctx;

    document.body.appendChild(screen);

    let cls;

    for (let k in areaclasses) {
      cls = areaclasses[k];
      break;
    }

    sarea.switch_editor(cls);
    screen.appendChild(sarea);

    screen._init();
    screen.listen();
  }

  start(args = new StartArgs()) {
    let args2 = new StartArgs();

    for (let k in args2) {
      if (args[k] === undefined) {
        args[k] = args2[k];
      }
    }

    if (!args.iconsheet) {
      args.iconsheet = loadDefaultIconSheet();
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

    document.body.style["margin"] = "0px";
    document.body.style["padding"] = "0px";
    document.body.style["overflow"] = "hidden";

    this.makeScreen();

    Object.defineProperty(window, "C", {
      get() {
        return this._appstate.ctx;
      }
    });

    nstructjs.validateStructs();
  }
}
