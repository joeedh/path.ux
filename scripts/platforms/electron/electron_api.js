"use strict";

let _nativeTheme;

function getNativeTheme() {
  if (_nativeTheme) {
    return _nativeTheme;
  }

  let remote = getElectron().remote;
  if (!remote) { /* Newer electron version with no remote, client must provide it */
    ipcRenderer.invoke("nativeTheme");
  } else {
    _nativeTheme = remote.nativeTheme;
  }

  return _nativeTheme;
}

function getElectronVersion() {
  let key = navigator.userAgent;
  let i = key.search("Electron");
  key = key.slice(i + 9, key.length);

  i = key.search(/[ \t]/);
  if (i >= 0) {
    key = key.slice(0, i);
  }

  key = key.trim();
  key = key.split(".").map(f => parseInt(f));

  return key;
}

/*
* wrap require to keep angular from auto-importing
* this api in browsers
* */
function getElectron() {
  return require('electron');
}

function myRequire(mod) {
  return globalThis.require(mod);
}

import {Menu, DropBox} from '../../widgets/ui_menu.js';
import {getIconManager} from "../../core/ui_base.js";
import cconst from "../../config/const.js";
import * as util from '../../util/util.js';

import {FileDialogArgs, FilePath} from '../platform_base.js';

function getFilename(path) {
  let filename = path.replace(/\\/g, "/");
  let i = filename.length - 1;
  while (i >= 0 && filename[i] !== "/") {
    i--;
  }

  if (filename[i] === "/") {
    i++;
  }

  if (i > 0) {
    filename = filename.slice(i, filename.length).trim();
  }

  return filename;
}

let _menu_init = false;
let _init = false;

import {mimeMap} from '../platform_base.js';

let electron_menu_idgen = 1;
let ipcRenderer;

export class ElectronMenu extends Array {
  constructor(args = {}) {
    super();

    this._ipcId = electron_menu_idgen++;

    for (let k in args) {
      this[k] = args[k];
    }
  }

  insert(i, item) {
    this.length++;

    let j = this.length - 1;
    while (j > i) {
      this[j] = this[j - 1];
      j--;
    }
    this[i] = item;

    return this;
  }

  static setApplicationMenu(menu) {
    initElectronIpc();

    ipcRenderer.invoke("set-menu-bar", menu);
  }

  closePopup() {
    ipcRenderer.invoke("close-menu", this._ipcId);
  }

  append(item) {
    this.push(item);
  }

  popup(args) {
    let {x, y, callback} = args;

    callback = wrapRemoteCallback("popup_menu_click", callback);

    const {ipcRenderer} = require('electron')
    ipcRenderer.invoke("popup-menu", this, x, y, callback);
  }
}

let callbacks = {};
let keybase = 1;

export function wrapRemoteCallback(key, callback) {
  key = "remote_" + key + (keybase++);
  callbacks[key] = callback;

  return key;
}

let ipcInit = false;

function initElectronIpc() {
  if (ipcInit) {
    return;
  }

  ipcInit = true;
  ipcRenderer = require('electron').ipcRenderer;

  ipcRenderer.on('invoke-menu-callback', (event, key, args) => {
    //console.error("Electron menu callback", key, args);
    callbacks[key].apply(undefined, args);
  });

  ipcRenderer.on("nativeTheme", (event, module) => {
    _nativeTheme = Object.assign({}, module);
    _nativeTheme._themeSource = _nativeTheme.themeSource;

    Object.defineProperty(_nativeTheme, "themeSource", {
      get() {
        return this._themeSource;
      },
      set(v) {
        ipcRenderer.invoke("nativeTheme.setThemeSource", v);
      }
    });
  });
}


export class ElectronMenuItem {
  constructor(args) {
    for (let k in args) {
      this[k] = args[k];
    }

    if (this.click) {
      this.click = wrapRemoteCallback("menu_click", this.click);
    }
  }
}

function patchDropBox() {
  initElectronIpc();

  //haveElectron = false;
  //return;
  DropBox.prototype._onpress = function _onpress(e) {
    if (this._menu !== undefined) {
      this._menu.close();
      this._menu = undefined;
      this._pressed = false;
      this._redraw();
      return;
    }

    this._build_menu();

    let emenu = buildElectronMenu(this._menu);

    this._menu.close = () => {
      emenu.closePopup(); //getCurrentWindow);
    };

    //console.log("menu dropbox click", this._menu);

    if (this._menu === undefined) {
      return;
    }

    this._menu._dropbox = this;
    this.dom._background = this.getDefault("BoxDepressed");
    this._background = this.getDefault("BoxDepressed");
    this._redraw();
    this._pressed = true;
    this.setCSS();

    let onclose = this._menu.onclose;
    this._menu.onclose = () => {
      this._pressed = false;
      this._redraw();

      let menu = this._menu;
      if (menu) {
        this._menu = undefined;
        menu._dropbox = undefined;
      }

      if (onclose) {
        onclose.call(menu);
      }
    }

    let menu = this._menu;
    let screen = this.getScreen();

    let dpi = this.getDPI();

    let x = e.x, y = e.y;
    let rects = this.dom.getClientRects();

    x = rects[0].x;
    y = rects[0].y + Math.ceil(rects[0].height);

    x = ~~x;
    y = ~~y;

    emenu.popup({
      x       : x,
      y       : y,
      callback: () => {

        if (this._menu) {
          this._menu.onclose();
        }
      }
    })
  };
}

let on_tick = () => {
  let nativeTheme = getNativeTheme();

  if (nativeTheme) {
    let mode = nativeTheme.shouldUseDarkColors ? "dark" : "light";

    if (mode !== cconst.colorSchemeType) {
      nativeTheme.themeSource = cconst.colorSchemeType;
    }
  }
}

export function checkInit() {
  if (window.haveElectron && !_init) {
    _init = true;


    patchDropBox();
    setInterval(on_tick, 350);
  }
}

export let iconcache = {};

function makeIconKey(icon, iconsheet, invertColors) {
  return "" + icon + ":" + iconsheet + ":" + invertColors;
}

export function getNativeIcon(icon, iconsheet = 0, invertColors = false, size = 16) {
  //let key = makeIconKey(icon, iconsheet, invertColors);
  //if (key in iconcache) {
  //  return iconcache[key];
  //}

  let icongen;

  try {
    icongen = myRequire("./icogen.js");
  } catch (error) {
    icongen = myRequire("./icogen.cjs");
  }


  window.icongen = icongen;
  let nativeImage = getElectron().nativeImage;

  let manager = getIconManager();
  let sheet = manager.findSheet(iconsheet);
  let images = [];

  let sizes = icongen.GetRequiredICOImageSizes();

  //for (let size of sizes) {
  if (1) {
    let iconsheet = manager.findClosestSheet(size);
    let tilesize = manager.getTileSize(iconsheet);

    let canvas = document.createElement("canvas");
    let g = canvas.getContext("2d");

    canvas.width = canvas.height = size;

    if (invertColors) {
      g.filter = "invert(100%)";
    }

    let scale = size/tilesize;
    g.scale(scale, scale);

    manager.canvasDraw({getDPI: () => 1.0}, canvas, g, icon, 0, 0, iconsheet);

    let header = "data:image/png;base64,";
    let data = canvas.toDataURL();

    data = data.slice(header.length, data.length);
    data = Buffer.from(data, "base64");

    myRequire("fs").writeFileSync("./myicon2.png", data);

    images.push(data);
  }
  //}

  //let ico = icongen.GenerateICO(images);
  //icon = nativeImage.createFromBuffer(ico);
  //icon = nativeImage.createFromBitmap(ico);
  //myRequire("fs").writeFileSync("myicon2.ico", ico);
  return "myicon2.png"
  return icon;
  return undefined

  window._icon = icon;
  return icon;
}

let map = {
  CTRL   : "Control",
  ALT    : "Alt",
  SHIFT  : "Shift",
  COMMAND: "Command"
};

export function buildElectronHotkey(hk) {
  hk = hk.trim().replace(/[ \t-]+/g, "+");
  for (let k in map) {
    hk = hk.replace(k, map[k]);
  }

  return hk;
}

export function buildElectronMenu(menu) {
  let electron = getElectron().remote;

  initElectronIpc();

  //let ElectronMenu = electron.Menu;
  //let ElectronMenuItem = electron.MenuItem;

  let emenu = new ElectronMenu();

  let buildItem = (item) => {
    if (item._isMenu) {
      let menu2 = item._menu;

      return new ElectronMenuItem({
        submenu: buildElectronMenu(item._menu),
        label  : menu2.getAttribute("title")
      });
    }


    let hotkey = item.hotkey;
    let icon = item.icon;
    let label = "" + item.label;

    if (hotkey && typeof hotkey !== "string") {
      hotkey = buildElectronHotkey(hotkey);
    } else {
      hotkey = "" + hotkey;
    }

    if (icon < 0) {
      icon = undefined;
    }

    let args = {
      id                 : "" + item._id,
      label              : label,
      accelerator        : hotkey,
      icon               : icon ? getNativeIcon(icon) : undefined,
      click              : function () {
        menu.onselect(item._id);
      },
      registerAccelerator: false
    };

    return new ElectronMenuItem(args);
  }

  for (let item of menu.items) {
    //buildItem(item);
    emenu.append(buildItem(item));

  }

  return emenu;
}

export function initMenuBar(menuEditor, override = false) {
  checkInit();

  if (!window.haveElectron) {
    return;
  }

  if (_menu_init && !override) {
    return;
  }

  _menu_init = true;

  //let win = electron.getCurrentWindow();

  let menu = new ElectronMenu();

  let _roles = new Set(["undo", "redo", "cut", "copy", "paste", "delete", "about",
                        "quit", "open", "save", "load", "paste", "cut", "zoom"]);
  let roles = {};
  for (let k of _roles) {
    roles[k] = k;
  }

  roles = Object.assign(roles, {
    "select all": "selectAll",
    "file"      : "fileMenu",
    "edit"      : "editMenu",
    "view"      : "viewMenu",
    "app"       : "appMenu",
    "help"      : "help",
    "zoom in"   : "zoomIn",
    "zoom out"  : "zoomOut"
  });

  /*
  let item = new MenuItem({
    label : "Label",
    tooltip : "Tooltip",
    icon : getNativeIcon(0),
    accelerator : "Control+Z",
    checked : true,
    id : 0,
    role : undefined,
    click : (arg) => {
      console.log("menu click!", arg)
    },
    submenu : undefined,
    role :  undo, redo, cut, copy, paste, pasteAndMatchStyle, delete, selectAll, reload,
            forceReload, toggleDevTools, resetZoom, zoomIn, zoomOut, togglefullscreen, window,
             minimize, close, help, about, services, hide, hideOthers, unhide, quit, startSpeaking,
             stopSpeaking, close, minimize, zoom, front, appMenu, fileMenu, editMenu, viewMenu, recentDocuments,
              toggleTabBar, selectNextTab, selectPreviousTab, mergeAllWindows, clearRecentDocuments, moveTabToNewWindow
               or windowMenu - Define the action of the menu item, when specified the click property will be ignored.
                See roles.

  });//*/


  let header = menuEditor.header;
  for (let dbox of header.traverse(DropBox)) {
    dbox._build_menu();
    dbox.update();

    dbox._build_menu();
    let menu2 = dbox._menu;
    menu2.ctx = dbox.ctx;
    menu2._init();
    menu2.update();

    let title = dbox._genLabel();
    let args = {
      label  : title,
      tooltip: dbox.description,
      submenu: buildElectronMenu(menu2)
    };

    menu.insert(0, new ElectronMenuItem(args));
  }


  ElectronMenu.setApplicationMenu(menu);
  //win.setMenu(menu);
}

import {PlatformAPI, isMimeText} from '../platform_base.js';

export class platform extends PlatformAPI {
  static showOpenDialog(title, args = new FileDialogArgs()) {
    console.log(args.filters);

    let eargs = {
      defaultPath: args.defaultPath,
      filters    : this._sanitizeFilters(args.filters ?? []),
      properties : [
        "openFile", "showHiddenFiles", "createDirectory"
      ]
    }

    if (args.multi) {
      eargs.properties.push("multiSelections");
    }

    if (!args.addToRecentList) {
      eargs.properties.push("dontAddToRecent");
    }

    initElectronIpc();

    return new Promise((accept, reject) => {
      ipcRenderer.invoke('show-open-dialog', eargs, wrapRemoteCallback("open-dialog", (ret) => {
        if (ret.canceled || ret.cancelled) {
          reject("cancel");
        } else {
          accept(ret.filePaths.map(f => new FilePath(f, getFilename(f))));
        }
      }), wrapRemoteCallback("show-open-dialog", (error) => {
        reject(error);
      }));
    });
  }

  static _sanitizeFilters(filters) {
    let filters2 = [];

    for (let filter of filters) {
      if (Array.isArray(filter)) {
        let ext = filter[0];

        filter = {extensions: filter};

        ext = ext.replace(/\./g, "").trim().toLowerCase();
        if (ext in mimeMap) {
          filter.mime = mimeMap[ext];
        }

        filter.name = ext;
      }

      console.log(filter.extensions);
      filter.extensions = filter.extensions.map(f => f.startsWith(".") ? f.slice(1, f.length) : f);

      filters2.push(filter);
    }

    return filters2;
  }

  static showSaveDialog(title, filedata_cb, args = new FileDialogArgs()) {
    console.log(args.filters);

    let eargs = {
      defaultPath: args.defaultPath,
      filters    : this._sanitizeFilters(args.filters ?? []),
      properties : [
        "openFile", "showHiddenFiles", "createDirectory"
      ]
    }

    if (args.multi) {
      eargs.properties.push("multiSelections");
    }

    if (!args.addToRecentList) {
      eargs.properties.push("dontAddToRecent");
    }

    return new Promise((accept, reject) => {
      initElectronIpc();

      let onthen = (ret) => {
        if (ret.canceled) {
          reject("cancel");
        } else {
          let path = ret.filePath;
          let filedata = filedata_cb();

          if (filedata instanceof ArrayBuffer) {
            filedata = new Uint8Array(filedata);
          }

          require('fs').writeFileSync(path, filedata);
          console.log("saved file", filedata);

          accept(new FilePath(path, getFilename(path)));
        }
      }

      let oncatch = (error) => {
        reject(error);
      }

      ipcRenderer.invoke('show-save-dialog', eargs, wrapRemoteCallback('dialog', onthen), wrapRemoteCallback('dialog', oncatch));

    });
  }

  static readFile(path, mime) {
    return new Promise((accept, reject) => {
      let fs = require('fs');

      if (isMimeText(mime)) {
        accept(fs.readFileSync(path.data, "utf8"));
      } else {
        accept(fs.readFileSync(path.data).buffer);
      }
    });
  }

  static writeFile(data, handle, mime) {
    return new Promise((accept, reject) => {
      let fs = require('fs');

      fs.writeFileSync(handle.data, data);
      accept(handle);
    });
  }
}
