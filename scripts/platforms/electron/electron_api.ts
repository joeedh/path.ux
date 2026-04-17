"use strict";

declare function require(name: string): any;
declare class Buffer {
  static from(data: unknown, type?: string): Buffer;
}

/*
 * Minimal ambient types for Electron/Node APIs used in this module.
 * Declared locally to avoid pulling in @types/node or @types/electron.
 */
interface ElectronIpcRenderer {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  on(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void;
}

interface ElectronRemote {
  nativeTheme: NativeThemeProxy;
}

interface NativeThemeProxy {
  shouldUseDarkColors: boolean;
  themeSource: string;
  _themeSource?: string;
}

interface ElectronModule {
  remote?: ElectronRemote;
  nativeImage?: { createFromBuffer(buf: unknown): unknown };
  ipcRenderer: ElectronIpcRenderer;
}

interface NodeFS {
  readFileSync(path: string, encoding?: string): string | ArrayBuffer;
  writeFileSync(path: string, data: unknown): void;
}

interface IcoGenModule {
  GetRequiredICOImageSizes(): number[];
  GenerateICO(images: unknown[]): unknown;
}

let _nativeTheme: NativeThemeProxy | undefined;

function getNativeTheme() {
  if (_nativeTheme) {
    return _nativeTheme;
  }

  const remote = getElectron().remote;
  if (!remote) {
    /* Newer electron version with no remote, client must provide it */
    ipcRenderer!.invoke("nativeTheme");
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

  return key
    .trim()
    .split(".")
    .map((f) => parseInt(f));
}

/*
 * wrap require to keep angular from auto-importing
 * this api in browsers
 * */
function getElectron(): ElectronModule {
  return require("electron") as ElectronModule;
}

function myRequire(mod: string): unknown {
  return (globalThis as any).require(mod);
}

import { Menu, DropBox } from "../../widgets/ui_menu";
import { getIconManager, UIBase } from "../../core/ui_base";
import cconst from "../../config/const";
import * as util from "../../util/util";

import { FileDialogArgs, FilePath } from "../platform_base";

function getFilename(filepath: string) {
  let filename = filepath.replace(/\\/g, "/");
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

import { mimeMap } from "../platform_base";

let electron_menu_idgen = 1;
let ipcRenderer: ElectronIpcRenderer | undefined;

interface ElectronMenuItemArgs {
  id?: string;
  label?: string;
  tooltip?: string;
  accelerator?: string;
  icon?: string;
  click?: string | (() => void);
  submenu?: ElectronMenu;
  registerAccelerator?: boolean;
}

export class ElectronMenu extends Array<ElectronMenuItem> {
  _ipcId: number;

  constructor(args: Record<string, unknown> = {}) {
    super();

    this._ipcId = electron_menu_idgen++;

    Object.assign(this, args);
  }

  insert(i: number, item: ElectronMenuItem) {
    this.length++;

    let j = this.length - 1;
    while (j > i) {
      this[j] = this[j - 1];
      j--;
    }
    this[i] = item;

    return this;
  }

  static setApplicationMenu(menu: ElectronMenu) {
    initElectronIpc();

    ipcRenderer!.invoke("set-menu-bar", menu);
  }

  closePopup() {
    ipcRenderer!.invoke("close-menu", this._ipcId);
  }

  append(item: ElectronMenuItem) {
    this.push(item);
  }

  popup(args: { x: number; y: number; callback: () => void }) {
    const { x, y } = args;
    let callback: string | (() => void) = args.callback;

    callback = wrapRemoteCallback("popup_menu_click", callback);

    const { ipcRenderer: ipc } = require("electron") as ElectronModule;
    ipc.invoke("popup-menu", this, x, y, callback);
  }
}

let callbacks: Record<string, (...args: unknown[]) => void> = {};
let keybase = 1;

export function wrapRemoteCallback(key: string, callback: (...args: unknown[]) => void) {
  key = "remote_" + key + keybase++;
  callbacks[key] = callback;

  return key;
}

let ipcInit = false;

function initElectronIpc() {
  if (ipcInit) {
    return;
  }

  ipcInit = true;
  ipcRenderer = (require("electron") as ElectronModule).ipcRenderer;

  ipcRenderer.on("invoke-menu-callback", (event: unknown, key: unknown, args: unknown) => {
    //console.error("Electron menu callback", key, args);
    callbacks[key as string].apply(undefined, args as unknown[]);
  });

  ipcRenderer.on("nativeTheme", (event: unknown, module: unknown) => {
    const themeData = module as { themeSource: string; shouldUseDarkColors: boolean };
    _nativeTheme = Object.assign({}, themeData) as NativeThemeProxy;
    _nativeTheme._themeSource = _nativeTheme.themeSource;

    Object.defineProperty(_nativeTheme, "themeSource", {
      get() {
        return (this as NativeThemeProxy)._themeSource;
      },
      set(v: string) {
        ipcRenderer!.invoke("nativeTheme.setThemeSource", v);
      },
    });
  });
}

export class ElectronMenuItem {
  id?: string;
  label?: string;
  tooltip?: string;
  accelerator?: string;
  icon?: string;
  click?: string | (() => void);
  submenu?: ElectronMenu;
  registerAccelerator?: boolean;

  constructor(args: ElectronMenuItemArgs) {
    Object.assign(this, args);

    if (typeof this.click === "function") {
      this.click = wrapRemoteCallback("menu_click", this.click);
    }
  }
}

function patchDropBox() {
  initElectronIpc();

  if (cconst.noElectronMenus) {
    return;
  }

  //haveElectron = false;
  //return;
  (DropBox.prototype as unknown as Record<string, unknown>)._onpress = function _onpress(this: DropBox, e: MouseEvent) {
    if (this._menu !== undefined) {
      this._menu.close();
      this._menu = undefined;
      (this as unknown as { _pressed: boolean })._pressed = false;
      this._redraw();
      return;
    }

    (this as unknown as { _build_menu(): void })._build_menu();

    const emenu = buildElectronMenu(this._menu!);

    this._menu!.close = () => {
      emenu.closePopup(); //getCurrentWindow);
    };

    //console.log("menu dropbox click", this._menu);

    if (this._menu === undefined) {
      return;
    }

    (this._menu as unknown as Record<string, unknown>)._dropbox = this;
    (this.dom as unknown as Record<string, unknown>)._background = this.getDefault("BoxDepressed");
    (this as unknown as Record<string, unknown>)._background = this.getDefault("BoxDepressed");
    this._redraw();
    (this as unknown as { _pressed: boolean })._pressed = true;
    this.setCSS();

    const onclose = (this._menu as unknown as Record<string, unknown>).onclose as (() => void) | undefined;
    (this._menu as unknown as Record<string, unknown>).onclose = () => {
      (this as unknown as { _pressed: boolean })._pressed = false;
      this._redraw();

      const menu = this._menu;
      if (menu) {
        this._menu = undefined;
        (menu as unknown as Record<string, unknown>)._dropbox = undefined;
      }

      if (onclose) {
        onclose.call(menu);
      }
    };

    const menu = this._menu;
    const screen = this.getScreen();

    const dpi = this.getDPI();

    let x = e.x,
      y = e.y;
    const rects = this.dom.getClientRects();

    x = rects[0].x;
    y = rects[0].y + Math.ceil(rects[0].height);

    x = ~~x;
    y = ~~y;

    emenu.popup({
      x       : x,
      y       : y,
      callback: () => {
        if (this._menu) {
          (this._menu as unknown as { onclose(): void }).onclose();
        }
      },
    });
  };
}

const on_tick = () => {
  const nativeTheme = getNativeTheme();

  if (nativeTheme) {
    const mode = nativeTheme.shouldUseDarkColors ? "dark" : "light";

    if (mode !== cconst.colorSchemeType) {
      nativeTheme.themeSource = cconst.colorSchemeType;
    }
  }
};

export function checkInit() {
  if (window.haveElectron && !_init) {
    _init = true;

    patchDropBox();
    setInterval(on_tick, 350);
  }
}

export const iconcache: Record<string, unknown> = {};

function makeIconKey(icon: number, iconsheet: number, invertColors: boolean) {
  return "" + icon + ":" + iconsheet + ":" + invertColors;
}

export function getNativeIcon(icon: number, iconsheet = 0, invertColors = false, size = 16) {
  //let key = makeIconKey(icon, iconsheet, invertColors);
  //if (key in iconcache) {
  //  return iconcache[key];
  //}

  let icongen: IcoGenModule;

  try {
    icongen = myRequire("./icogen.js") as IcoGenModule;
  } catch (error: unknown) {
    icongen = myRequire("./icogen.cjs") as IcoGenModule;
  }

  (window as unknown as Record<string, unknown>).icongen = icongen;
  const nativeImage = getElectron().nativeImage;

  const manager = getIconManager();
  const sheet = manager.findSheet(iconsheet);
  const images: unknown[] = [];

  const sizes = icongen.GetRequiredICOImageSizes();

  //for (let size of sizes) {
  if (1) {
    const closestSheet = manager.findClosestSheet(size);
    const tilesize = manager.getTileSize(closestSheet);

    const canvas = document.createElement("canvas");
    const g = canvas.getContext("2d")!;

    canvas.width = canvas.height = size;

    if (invertColors) {
      g.filter = "invert(100%)";
    }

    const scale = size / tilesize;
    g.scale(scale, scale);

    manager.canvasDraw(
      { getDPI: () => 1.0 } as unknown as import("../../core/ui_base").UIBase,
      canvas,
      g,
      icon,
      0,
      0,
      closestSheet
    );

    const header = "data:image/png;base64,";
    let data: unknown = canvas.toDataURL();

    data = (data as string).slice(header.length, (data as string).length);
    data = Buffer.from(data as string, "base64");

    (myRequire("fs") as NodeFS).writeFileSync("./myicon2.png", data);

    images.push(data);
  }
  //}

  //let ico = icongen.GenerateICO(images);
  //icon = nativeImage.createFromBuffer(ico);
  //icon = nativeImage.createFromBitmap(ico);
  //myRequire("fs").writeFileSync("myicon2.ico", ico);
  return "myicon2.png";
}

const map: Record<string, string> = {
  CTRL   : "Control",
  ALT    : "Alt",
  SHIFT  : "Shift",
  COMMAND: "Command",
};

export function buildElectronHotkey(hk: string) {
  hk = hk.trim().replace(/[ \t-]+/g, "+");
  for (const k in map) {
    hk = hk.replace(k, map[k]);
  }

  return hk;
}

interface MenuItem {
  _isMenu?: boolean;
  _menu?: Menu;
  _id: number | string;
  hotkey?: string;
  icon?: number;
  label?: string;
}

export function buildElectronMenu(menu: Menu) {
  const electron = getElectron().remote;

  initElectronIpc();

  //let ElectronMenu = electron.Menu;
  //let ElectronMenuItem = electron.MenuItem;

  const emenu = new ElectronMenu();

  const buildItem = (item: MenuItem) => {
    if (item._isMenu) {
      const menu2 = item._menu!;

      return new ElectronMenuItem({
        submenu: buildElectronMenu(menu2),
        label  : menu2.getAttribute("title") ?? undefined,
      });
    }

    let hotkey = item.hotkey;
    const icon = item.icon;
    const label = "" + item.label;

    if (hotkey && typeof hotkey !== "string") {
      hotkey = buildElectronHotkey(hotkey);
    } else {
      hotkey = "" + hotkey;
    }

    let nativeIcon: string | undefined;
    if (icon !== undefined && icon >= 0) {
      nativeIcon = getNativeIcon(icon);
    }

    const args: ElectronMenuItemArgs = {
      id                 : "" + item._id,
      label              : label,
      accelerator        : hotkey,
      icon               : nativeIcon,
      click: function () {
        (menu as unknown as { onselect(id: number | string): void }).onselect(item._id);
      },
      registerAccelerator: false,
    };

    return new ElectronMenuItem(args);
  };

  for (const item of (menu as unknown as { items: MenuItem[] }).items) {
    //buildItem(item);
    emenu.append(buildItem(item));
  }

  return emenu;
}

interface MenuEditorLike<CTX extends IContextBase> {
  header?: UIBase<CTX>;
}

export function initMenuBar<CTX extends IContextBase>(menuEditor: MenuEditorLike<CTX>, override = false) {
  checkInit();

  if (!window.haveElectron) {
    return;
  }

  if (_menu_init && !override) {
    return;
  }

  _menu_init = true;

  //let win = electron.getCurrentWindow();

  const menu = new ElectronMenu();

  const _roles = new Set([
    "undo",
    "redo",
    "cut",
    "copy",
    "paste",
    "delete",
    "about",
    "quit",
    "open",
    "save",
    "load",
    "paste",
    "cut",
    "zoom",
  ]);
  let roles: Record<string, string> = {};
  for (const k of _roles) {
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
    "zoom out"  : "zoomOut",
  });

  const header = menuEditor.header!;
  for (const dbox of header.traverse(DropBox)) {
    const db = dbox as DropBox;
    (db as unknown as { _build_menu(): void })._build_menu();
    db.update();

    (db as unknown as { _build_menu(): void })._build_menu();
    const menu2 = db._menu!;
    menu2.ctx = db.ctx;
    menu2._init();
    menu2.update();

    const title = (db as unknown as { _genLabel(): string })._genLabel();
    const args: ElectronMenuItemArgs = {
      label  : title,
      tooltip: (db as unknown as { description?: string }).description,
      submenu: buildElectronMenu(menu2),
    };

    menu.insert(0, new ElectronMenuItem(args));
  }

  ElectronMenu.setApplicationMenu(menu);
  //win.setMenu(menu);
}

import { PlatformAPI, isMimeText } from "../platform_base";
import { IContextBase } from "../../core/context_base";

interface DialogResult {
  canceled?: boolean;
  cancelled?: boolean;
  filePaths?: string[];
  filePath?: string;
}

export class platform extends PlatformAPI {
  static showOpenDialog(title: string, args = new FileDialogArgs()) {
    console.log(args.filters);

    const eargs: Record<string, unknown> = {
      defaultPath: args.defaultPath,
      filters    : this._sanitizeFilters(args.filters ?? []),
      properties : ["openFile", "showHiddenFiles", "createDirectory"],
    };

    if (args.multi) {
      (eargs.properties as string[]).push("multiSelections");
    }

    if (!args.addToRecentList) {
      (eargs.properties as string[]).push("dontAddToRecent");
    }

    initElectronIpc();

    return new Promise<FilePath[]>((accept, reject) => {
      ipcRenderer!.invoke(
        "show-open-dialog",
        eargs,
        wrapRemoteCallback("open-dialog", (ret: unknown) => {
          const result = ret as DialogResult;
          if (result.canceled || result.cancelled) {
            reject("cancel");
          } else {
            accept(result.filePaths!.map((f) => new FilePath(f, getFilename(f))));
          }
        }),
        wrapRemoteCallback("show-open-dialog", (error: unknown) => {
          reject(error);
        })
      );
    });
  }

  static _sanitizeFilters(filters: ({ name: string; mime?: string; extensions: string[] } | string[])[]) {
    const filters2: { name: string; mime?: string; extensions: string[] }[] = [];

    for (let filter of filters) {
      if (Array.isArray(filter)) {
        let ext = filter[0];

        const filterObj: { name: string; mime?: string; extensions: string[] } = {
          extensions: filter,
          name      : "",
        };

        ext = ext.replace(/\./g, "").trim().toLowerCase();
        if (ext in mimeMap) {
          filterObj.mime = mimeMap[ext];
        }

        filterObj.name = ext;
        filter = filterObj;
      }

      const f = filter as { name: string; mime?: string; extensions: string[] };
      console.log(f.extensions);
      f.extensions = f.extensions.map((e) => (e.startsWith(".") ? e.slice(1, e.length) : e));

      filters2.push(f);
    }

    return filters2;
  }

  static showSaveDialog(title: string, filedata_cb: () => unknown, args = new FileDialogArgs()) {
    console.log(args.filters);

    const eargs: Record<string, unknown> = {
      defaultPath: args.defaultPath,
      filters    : this._sanitizeFilters(args.filters ?? []),
      properties : ["openFile", "showHiddenFiles", "createDirectory"],
    };

    if (args.multi) {
      (eargs.properties as string[]).push("multiSelections");
    }

    if (!args.addToRecentList) {
      (eargs.properties as string[]).push("dontAddToRecent");
    }

    return new Promise<FilePath>((accept, reject) => {
      initElectronIpc();

      const onthen = (ret: unknown) => {
        const result = ret as DialogResult;
        if (result.canceled) {
          reject("cancel");
        } else {
          const path = result.filePath!;
          let filedata = filedata_cb();

          if (filedata instanceof ArrayBuffer) {
            filedata = new Uint8Array(filedata);
          }

          (require("fs") as NodeFS).writeFileSync(path, filedata);
          console.log("saved file", filedata);

          accept(new FilePath(path, getFilename(path)));
        }
      };

      const oncatch = (error: unknown) => {
        reject(error);
      };

      ipcRenderer!.invoke(
        "show-save-dialog",
        eargs,
        wrapRemoteCallback("dialog", onthen),
        wrapRemoteCallback("dialog", oncatch)
      );
    });
  }

  static readFile(path: string | FilePath, mime?: string) {
    return new Promise<string | ArrayBuffer>((accept, reject) => {
      const fs = require("fs") as NodeFS;

      if (isMimeText(mime)) {
        accept(fs.readFileSync((path as FilePath).data as string, "utf8"));
      } else {
        accept(fs.readFileSync((path as FilePath).data as string) as ArrayBuffer);
      }
    });
  }

  static writeFile(data: ArrayBuffer | string, handle: FilePath, mime: string) {
    return new Promise<FilePath>((accept, reject) => {
      const fs = require("fs") as NodeFS;

      fs.writeFileSync(handle.data as string, data);
      accept(handle);
    });
  }
}
