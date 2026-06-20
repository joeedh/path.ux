"use strict";

/*
 * NW.js platform backend. Unlike the Electron backend (which routes menus and
 * dialogs through ipcRenderer to a main process), NW.js merges the Node and
 * browser contexts: `nw.Menu` / `nw.MenuItem` / `nw.Window` and Node's `fs`
 * are all reachable directly from the renderer, so there is no IPC layer and
 * no main process. Menu-item `click` handlers are ordinary in-page functions.
 */

/** Minimal nodejs buffer interface */
declare class Buffer {
  static from(data: unknown, type?: string): Buffer;
  byteLength: number;
  byteOffset: number;
  buffer: {
    slice(start: number, end: number): ArrayBuffer;
  }
}

// Minimal ambient types for the NW.js APIs used here.
interface NwMenuItemOptions {
  label?: string;
  type?: "normal" | "separator" | "checkbox";
  click?: () => void;
  submenu?: NwMenu;
  icon?: string;
  enabled?: boolean;
  tooltip?: string;
}
interface NwMenuItem {
  label?: string;
}
interface NwMenu {
  append(item: NwMenuItem): void;
  popup(x: number, y: number): void;
  items: NwMenuItem[];
}
interface NwApi {
  Menu: {new (opts?: {type?: "menubar"}): NwMenu};
  MenuItem: {new (opts: NwMenuItemOptions): NwMenuItem};
  Window: {get(): {menu: NwMenu | null}};
}

function getNw(): NwApi {
  return (globalThis as unknown as {nw: NwApi}).nw;
}

interface NodeFS {
  readFileSync(path: string, encoding?: string): string | ArrayBuffer;
  writeFileSync(path: string, data: unknown): void;
}

function myRequire(mod: string): unknown {
  return (globalThis as any).require(mod);
}

import { Menu, DropBox } from "../../widgets/ui_menu";
import { getIconManager, UIBase } from "../../core/ui_base";
import cconst from "../../config/const";

import { FileDialogArgs, FilePath } from "../platform_base";
import { mimeMap } from "../platform_base";
import { PlatformAPI, isMimeText } from "../platform_base";
import { IContextBase } from "../../core/context_base";

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

export function checkInit() {
  if (window.haveNwjs && !_init) {
    _init = true;
    patchDropBox();
  }
}

function patchDropBox() {
  if (cconst.noElectronMenus) {
    return;
  }

  (DropBox.prototype as unknown as Record<string, unknown>)._onpress = function _onpress(
    this: DropBox,
    e: MouseEvent
  ) {
    if (this._menu !== undefined) {
      this._menu.close();
      this._menu = undefined;
      (this as unknown as { _pressed: boolean })._pressed = false;
      this._redraw();
      return;
    }

    (this as unknown as { _build_menu(): void })._build_menu();

    const nwmenu = buildNwMenu(this._menu!);

    this._menu!.close = () => {
      /* native popups close themselves */
    };

    if (this._menu === undefined) {
      return;
    }

    (this._menu as unknown as Record<string, unknown>)._dropbox = this;
    (this.dom as unknown as Record<string, unknown>)._background = this.getDefault("BoxDepressed");
    (this as unknown as Record<string, unknown>)._background = this.getDefault("BoxDepressed");
    this._redraw();
    (this as unknown as { _pressed: boolean })._pressed = true;
    this.setCSS();

    const onclose = (this._menu as unknown as Record<string, unknown>).onclose as
      | (() => void)
      | undefined;
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

    const rects = this.dom.getClientRects();
    const x = ~~rects[0].x;
    const y = ~~(rects[0].y + Math.ceil(rects[0].height));

    nwmenu.popup(x, y);
    if (this._menu) {
      (this._menu as unknown as { onclose(): void }).onclose();
    }
  };
}

const iconcache: Record<number, string> = {};

/**
 * Renders icon `icon` to a PNG temp file and returns its path (NW.js MenuItem
 * icons take a file path). Cached per icon number. Returns undefined on failure
 * so a menu item simply renders without an icon.
 */
export function getNativeIcon(icon: number, size = 16): string | undefined {
  if (icon in iconcache) {
    return iconcache[icon];
  }

  try {
    const manager = getIconManager();
    const closestSheet = manager.findClosestSheet(size);
    const tilesize = manager.getTileSize(closestSheet);

    const canvas = document.createElement("canvas");
    const g = canvas.getContext("2d")!;
    canvas.width = canvas.height = size;

    const scale = size / tilesize;
    g.scale(scale, scale);

    manager.canvasDraw(
      { getDPI: () => 1.0 } as unknown as UIBase,
      canvas,
      g,
      icon,
      0,
      0,
      closestSheet
    );

    const header = "data:image/png;base64,";
    const dataUrl = canvas.toDataURL();
    const b64 = dataUrl.slice(header.length);
    const data = Buffer.from(b64, "base64");

    const os = myRequire("os") as { tmpdir(): string };
    const pathlib = myRequire("path") as { join(...p: string[]): string };
    const file = pathlib.join(os.tmpdir(), `pathux_icon_${icon}.png`);
    (myRequire("fs") as NodeFS).writeFileSync(file, data);

    iconcache[icon] = file;
    return file;
  } catch (error: unknown) {
    console.warn("nwjs getNativeIcon failed", error);
    return undefined;
  }
}

interface MenuItem {
  _isMenu?: boolean;
  _menu?: Menu;
  _id: number | string;
  hotkey?: string;
  icon?: number;
  label?: string;
}

// NW.js delivers a MenuItem's `click` only while the JS wrapper is alive. If the
// nw.Menu / nw.MenuItem objects are garbage-collected (they are, once they fall
// out of scope — only nw.Window.menu weakly holds the top menubar), native
// clicks silently stop firing. We keep every built menu/item in a retain bucket
// that outlives the menu: `retainMenuObjects` swaps the live set so the previous
// menubar's objects can be collected only after the new one is installed.
let _menubarRetain: unknown[] = [];
let _popupRetain: unknown[] = [];

function buildNwMenuInto(menu: Menu, retain: unknown[]): NwMenu {
  const nw = getNw();
  const nwmenu = new nw.Menu();
  retain.push(nwmenu);

  const buildItem = (item: MenuItem): NwMenuItem => {
    let mi: NwMenuItem;
    if (item._isMenu) {
      const menu2 = item._menu!;
      mi = new nw.MenuItem({
        submenu: buildNwMenuInto(menu2, retain),
        label  : menu2.getAttribute("title") ?? "",
      });
    } else {
      const icon = item.icon;
      const label = "" + item.label;

      let nativeIcon: string | undefined;
      if (icon !== undefined && icon >= 0) {
        nativeIcon = getNativeIcon(icon);
      }

      // The app's keymap already dispatches hotkeys, so we intentionally do NOT
      // register a native accelerator here (NW.js has no "display-only" flag,
      // and registering would double-fire). The click handler runs in-page.
      mi = new nw.MenuItem({
        label: label,
        icon : nativeIcon,
        click: function () {
          try {
            menu.on_select?.(item._id);
            menu._onselect?.(item._id);
          } catch (err) {
            console.warn("nwjs menu callback error:", (err as Error)?.stack || err);
          }
        },
      });
    }
    retain.push(mi);
    return mi;
  };

  for (const item of (menu as unknown as { items: MenuItem[] }).items) {
    nwmenu.append(buildItem(item));
  }

  return nwmenu;
}

export function buildNwMenu(menu: Menu): NwMenu {
  // Each popup is independent — swap in a fresh bucket so the previous popup's
  // objects can be collected once it closes, while the live one stays retained.
  _popupRetain = [];
  return buildNwMenuInto(menu, _popupRetain);
}

interface MenuEditorLike<CTX extends IContextBase> {
  header?: UIBase<CTX>;
}

export function initMenuBar<CTX extends IContextBase>(
  menuEditor: MenuEditorLike<CTX>,
  override = false
) {
  checkInit();

  if (!window.haveNwjs) {
    return;
  }

  if (_menu_init && !override) {
    return;
  }

  _menu_init = true;

  const nw = getNw();
  const menubar = new nw.Menu({ type: "menubar" });

  // Build into a fresh retain bucket so every submenu + item (and its click
  // closure) stays referenced; otherwise NW.js GCs them and native clicks
  // silently no-op. Swap it in only after the menubar is fully built.
  const retain: unknown[] = [menubar];

  const header = menuEditor.header!;
  const items: NwMenuItem[] = [];
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
    const item = new nw.MenuItem({
      label  : title,
      tooltip: (db as unknown as { description?: string }).description,
      submenu: buildNwMenuInto(menu2, retain),
    });
    retain.push(item);
    items.unshift(item);
  }

  for (const item of items) {
    menubar.append(item);
  }

  _menubarRetain = retain;
  nw.Window.get().menu = menubar;
}

interface FileInputAttrs {
  accept?: string;
  multiple?: boolean;
  nwsaveas?: string;
  nwdirectory?: boolean;
}

interface NwFile extends File {
  path: string;
}

/**
 * Drives a hidden `<input type=file>` to mimic a native file dialog. NW.js adds
 * a `.path` property to the selected File objects. Resolves with the picked
 * paths, or rejects with "cancel" if the user dismisses the dialog (detected by
 * the window regaining focus with no selection).
 */
function pickFiles(attrs: FileInputAttrs): Promise<string[]> {
  return new Promise<string[]>((accept, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.style.display = "none";

    if (attrs.accept) input.accept = attrs.accept;
    if (attrs.multiple) input.multiple = true;
    if (attrs.nwsaveas !== undefined) input.setAttribute("nwsaveas", attrs.nwsaveas);
    if (attrs.nwdirectory) input.setAttribute("nwdirectory", "");

    let settled = false;
    const cleanup = () => {
      window.removeEventListener("focus", onFocus, true);
      input.remove();
    };

    const onChange = () => {
      settled = true;
      const files = Array.from(input.files ?? []) as NwFile[];
      cleanup();
      if (files.length === 0) {
        reject("cancel");
      } else {
        accept(files.map((f) => f.path));
      }
    };

    // If focus returns to the window without a change event, the user cancelled.
    const onFocus = () => {
      window.setTimeout(() => {
        if (!settled) {
          cleanup();
          reject("cancel");
        }
      }, 300);
    };

    input.addEventListener("change", onChange);
    window.addEventListener("focus", onFocus, true);

    document.body.appendChild(input);
    input.click();
  });
}

export class platform extends PlatformAPI {
  static _acceptFromFilters(filters: ({ extensions: string[] } | string[])[]): string {
    const exts = new Set<string>();
    for (const f of filters) {
      const list = Array.isArray(f) ? f : f.extensions;
      for (let e of list) {
        e = e.replace(/\./g, "").trim();
        if (e && e !== "*") exts.add("." + e);
      }
    }
    return Array.from(exts).join(",");
  }

  static showOpenDialog(title: string, args = new FileDialogArgs()) {
    const accept = this._acceptFromFilters((args.filters ?? []) as ({ extensions: string[] } | string[])[]);

    return pickFiles({
      accept  : accept || undefined,
      multiple: !!args.multi,
    }).then((paths) => paths.map((p) => new FilePath(p, getFilename(p))));
  }

  static showSaveDialog(title: string, filedata_cb: () => unknown, args = new FileDialogArgs()) {
    const accept = this._acceptFromFilters((args.filters ?? []) as ({ extensions: string[] } | string[])[]);
    const defaultName = args.defaultPath ? getFilename(args.defaultPath) : "untitled";

    return pickFiles({
      accept  : accept || undefined,
      nwsaveas: defaultName,
    }).then((paths) => {
      const path = paths[0];
      let filedata = filedata_cb();

      if (filedata instanceof ArrayBuffer) {
        filedata = new Uint8Array(filedata);
      }

      (myRequire("fs") as NodeFS).writeFileSync(path, filedata);
      return new FilePath(path, getFilename(path));
    });
  }

  static readFile(path: string | FilePath, mime?: string) {
    return new Promise<string | ArrayBuffer>((accept) => {
      const fs = myRequire("fs") as NodeFS;
      const p = (path as FilePath).data as string;

      if (isMimeText(mime)) {
        accept(fs.readFileSync(p, "utf8"));
      } else {
        const buf = fs.readFileSync(p) as unknown as Buffer;
        accept(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
      }
    });
  }

  static writeFile(data: ArrayBuffer | string, handle: FilePath, mime: string) {
    return new Promise<FilePath>((accept) => {
      const fs = myRequire("fs") as NodeFS;

      fs.writeFileSync(handle.data as string, data);
      accept(handle);
    });
  }
}

// mimeMap is re-exported for parity with the electron backend (some callers
// reach it through the platform module).
export { mimeMap };
