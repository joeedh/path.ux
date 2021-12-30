"use strict";

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

import {FileDialogArgs, FilePath} from '../platform_base.js';

let _menu_init = false;
let _init = false;

function patchDropBox() {
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

    let {getCurrentWindow, Menu, MenuItem} = getElectron().remote;

    let emenu = buildElectronMenu(this._menu);

    this._menu.close = () => {
      emenu.closePopup(getCurrentWindow);
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
      x: x,
      y: y,
      callback: () => {

        if (this._menu) {
          this._menu.onclose();
        }
      }
    })
  };
}

let on_tick = () => {
  let nativeTheme = getElectron().remote.nativeTheme;

  let mode = nativeTheme.shouldUseDarkColors ? "dark" : "light";

  if (mode !== cconst.colorSchemeType) {
    nativeTheme.themeSource = cconst.colorSchemeType;
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

export function getNativeIcon(icon, iconsheet=0, invertColors=false, size=16) {
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

    let scale = size / tilesize;
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
  CTRL : "Control",
  ALT : "Alt",
  SHIFT : "Shift",
  COMMAND : "Command"
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

  let ElectronMenu = electron.Menu;
  let ElectronMenuItem = electron.MenuItem;

  let emenu = new ElectronMenu();


  let buildItem = (item) => {
    if (item._isMenu) {
      let menu2 = item._menu;

      return new ElectronMenuItem({
        submenu : buildElectronMenu(item._menu),
        label : menu2.getAttribute("title")
      });
    }


    let hotkey = item.hotkey;
    let icon = item.icon;
    let label = ""+item.label;

    if (hotkey && typeof hotkey !== "string") {
      hotkey = buildElectronHotkey(hotkey);
    } else {
      hotkey = ""+hotkey;
    }

    if (icon < 0) {
      icon = undefined;
    }

    let args = {
      id          : ""+item._id,
      label       : label,
      accelerator : hotkey,
      icon        : icon ? getNativeIcon(icon) : undefined,
      click       : function() {
        menu.onselect(item._id);
      },
      registerAccelerator : false
    };

    return new ElectronMenuItem(args);
  }

  for (let item of menu.items) {
    //buildItem(item);
    emenu.append(buildItem(item));

  }

  return emenu;
}

export function initMenuBar(menuEditor, override=false) {
  checkInit();

  if (!window.haveElectron) {
    return;
  }

  if (_menu_init && !override) {
    return;
  }

  _menu_init = true;

  let electron = getElectron().remote;

  let win = electron.getCurrentWindow();
  let ElectronMenu = electron.Menu;
  let ElectronMenuItem = electron.MenuItem;

  let menu = new ElectronMenu();

  let _roles = new Set(["undo", "redo", "cut", "copy", "paste", "delete", "about",
                        "quit", "open", "save", "load", "paste", "cut", "zoom"]);
  let roles = {};
  for (let k of _roles) {
    roles[k] = k;
  }

  roles = Object.assign(roles, {
    "select all" : "selectAll",
    "file"       : "fileMenu",
    "edit"       : "editMenu",
    "view"       : "viewMenu",
    "app"        : "appMenu",
    "help"       : "help",
    "zoom in"    : "zoomIn",
    "zoom out"   : "zoomOut"
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
      label   : title,
      tooltip : dbox.description,
      submenu : buildElectronMenu(menu2)
    };

    menu.insert(0, new ElectronMenuItem(args));
  }


  ElectronMenu.setApplicationMenu(menu);
  //win.setMenu(menu);
}

import {PlatformAPI, isMimeText} from '../platform_base.js';

export class platform extends PlatformAPI {
  static showOpenDialog(title, args = new FileDialogArgs()) {
    const {dialog} = require('electron').remote

    console.log(args.filters);

    let eargs = {
      defaultPath: args.defaultPath,
      filters    : args.filters,
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
      dialog.showOpenDialog(undefined, eargs).then((ret) => {
        if (ret.canceled) {
          reject("cancel");
        } else {
          accept(ret.filePaths.map(f => new FilePath(f)));
        }
      });
    });
  }

  static showSaveDialog(title, filedata_cb, args = new FileDialogArgs()) {
    const {dialog} = require('electron').remote

    console.log(args.filters);

    let eargs = {
      defaultPath: args.defaultPath,
      filters    : args.filters,
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
      dialog.showSaveDialog(undefined, eargs).then((ret) => {
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
          accept(path);
        }
      });
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
}
