"use strict";

import {Menu, DropBox} from '../../widgets/ui_menu.js';
import {getIconManager} from "../../core/ui_base.js";
import cconst from "../../config/const.js";

let _menu_init = false;
let _init = false;

function patchDropBox() {
  //haveElectron = false;
  //return;
  DropBox.prototype._onpress = function _onpress(e) {
    if (this._menu !== undefined) {
      this._menu.close();
      this._menu = undefined;
      return;
    }

    this._build_menu();

    let {getCurrentWindow, Menu, MenuItem} = require("electron").remote;

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

    //console.log(x, y);
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
  let nativeTheme = require("electron").remote.nativeTheme;

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
export function getNativeIcon(icon, iconsheet=0, invertColors=false) {
  let icongen = require("./icogen.js");

  window.icongen = icongen;
  let nativeImage = require("electron").nativeImage;

  let manager = getIconManager();
  let sheet = manager.findSheet(iconsheet);
  let images = [];

  let sizes = icongen.GetRequiredICOImageSizes();

  //for (let size of sizes) {
  if (1) {
    let size = 16;
    let iconsheet = manager.findClosestSheet(size);
    let tilesize = manager.getTileSize(iconsheet);

    let canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    let g = canvas.getContext("2d");

    if (invertColors) {
      g.filter = "invert(100%)";
    }
    //console.log(size, tilesize);

    let scale = size / tilesize;
    g.scale(scale, scale);

    let header = "data:image/png;base64,";

    manager.canvasDraw({getDPI: () => 1.0}, canvas, g, icon, 0, 0, iconsheet);
    let data = canvas.toDataURL();
    
    data = data.slice(header.length, data.length);
    data = Buffer.from(data, "base64");

    require("fs").writeFileSync("myicon2.png", data);
    images.push(data);
  }
  //}

  //let ico = icongen.GenerateICO(images);
  //icon = nativeImage.createFromBuffer(ico);
  //icon = nativeImage.createFromBitmap(ico);
  //require("fs").writeFileSync("myicon2.ico", ico);
  return "myicon2.png"
  return icon;
  return undefined

  //console.log("ICON", icon);
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
  let electron = require("electron").remote;

  let ElectronMenu = electron.Menu;
  let ElectronMenuItem = electron.MenuItem;

  let emenu = new ElectronMenu();


  let buildItem = (item) => {
    let hotkey = item.hotkey;
    let icon = item.icon;
    let label = item.label;

    if (hotkey) {
      hotkey = buildElectronHotkey(hotkey);
    }

    if (icon < 0) {
      icon = undefined;
    }

    let args = {
      id          : item._id,
      label       : label,
      accelerator : hotkey,
      icon        : icon ? getNativeIcon(icon) : undefined,
      click       : function() {
        menu.onselect(item._id);
        //console.log("click", item._id);
      }
    };

    return new ElectronMenuItem(args);
  }
  for (let item of menu.items) {
    emenu.append(buildItem(item));

  }

  return emenu;
}

export function initMenuBar(menuEditor) {
  checkInit();

  if (!window.haveElectron) {
    return;
  }

  if (_menu_init) {
    return;
  }

  _menu_init = true;

  let electron = require("electron").remote;

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
  //console.log(header)
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

    //console.log(title);
    menu.insert(0, new ElectronMenuItem(args));
  }


  ElectronMenu.setApplicationMenu(menu);
  //win.setMenu(menu);
}
