import * as util from "../../path-controller/util/util";
import { Icons } from "../../icon_enum";
import { theme, ThemeRecord } from "../ui_theme";
import { getDPI } from "./ui_base_dpi";
import { PackFlags, type StyleRecord } from "./ui_base_types";
import type { UIBase } from "../ui_base";

interface CustomIconEntry {
  blobUrl: string;
  canvas: HTMLCanvasElement;
}

class _IconManager {
  tilex: number;
  tilesize: number;
  drawsize: number;
  customIcons: Map<number, CustomIconEntry>;
  image: HTMLImageElement;
  promise: util.TimeoutPromise<_IconManager> | undefined;
  _accept: ((value: _IconManager) => void) | undefined;
  _reject: ((reason?: unknown) => void) | undefined;

  constructor(
    image: HTMLImageElement,
    tilesize: number,
    number_of_horizontal_tiles: number,
    drawsize: number
  ) {
    this.tilex = number_of_horizontal_tiles;
    this.tilesize = tilesize;
    this.drawsize = drawsize;

    this.customIcons = new Map();

    this.image = image;
    this.promise = undefined;
    this._accept = undefined;
    this._reject = undefined;
  }

  get ready(): boolean {
    return !!this.image?.width;
  }

  onReady(): Promise<_IconManager> | util.TimeoutPromise<_IconManager> {
    if (this.ready) {
      return new Promise((accept) => {
        accept(this);
      });
    }

    if (this.promise) {
      return this.promise;
    }

    const onload = this.image.onload as ((this: GlobalEventHandlers, ev: Event) => void) | null;
    this.image.onload = (e: Event) => {
      if (onload) {
        onload.call(this.image, e);
      }

      if (!this._accept) {
        return;
      }

      const accept = this._accept;
      this._accept = this._reject = this.promise = undefined;

      if (this.image.width) {
        accept(this);
      }
    };

    this.promise = new util.TimeoutPromise<_IconManager>(
      (accept, reject) => {
        this._accept = accept;
        this._reject = reject;
      },
      15000,
      true
    ); /* silently rejects on timeout */

    this.promise.catch((error: unknown) => {
      util.print_stack(error as Error);
      this.promise = this._accept = this._reject = undefined;
    });

    return this.promise;
  }

  canvasDraw(
    elem: UIBase,
    canvas: HTMLCanvasElement,
    g: CanvasRenderingContext2D,
    icon: number,
    x = 0,
    y = 0
  ): void {
    const customIcon = this.customIcons.get(icon);

    if (customIcon) {
      g.drawImage(customIcon.canvas, x, y);
      return;
    }

    const tx = icon % this.tilex;
    const ty = ~~(icon / this.tilex);

    const dpi = elem.getDPI();
    const ts = this.tilesize;
    const ds = this.drawsize;

    if (!this.image) {
      return;
    }

    try {
      g.drawImage(this.image, tx * ts, ty * ts, ts, ts, x, y, ds * dpi, ds * dpi);
    } catch (error: unknown) {
      console.log(this.image);
      console.error((error as Error).stack);
      console.error((error as Error).message);
      console.error("failed to draw an icon");
    }
  }

  setCSS(icon: number, dom: HTMLElement, fitsize?: number | number[] | undefined): void {
    if (!fitsize) {
      fitsize = this.drawsize;
    }

    if (typeof fitsize === "object") {
      fitsize = Math.max(fitsize[0], fitsize[1]);
    }

    const s = dom.style as StyleRecord;
    s["background"] = this.getCSS(icon, fitsize);
    if (this.customIcons.has(icon)) {
      s["background-size"] = fitsize + "px";
    } else {
      s["background-size"] = fitsize * this.tilex + "px";
    }

    s["background-clip"] = "content-box";

    if (!s["width"]) {
      s["width"] = this.drawsize + "px";
    }
    if (!s["height"]) {
      s["height"] = this.drawsize + "px";
    }
  }

  //icon is an integer
  getCSS(icon: number, fitsize: number | number[] = this.drawsize): string {
    if (icon === -1) {
      //-1 means no icon
      return "";
    }

    if (typeof fitsize === "object") {
      fitsize = Math.max(fitsize[0], fitsize[1]);
    }

    const ratio = fitsize / this.tilesize;

    const customIcon = this.customIcons.get(icon);
    if (customIcon !== undefined) {
      return `url("${customIcon.blobUrl}")`;
    }

    const x = -(icon % this.tilex) * this.tilesize * ratio;
    const y = -~~(icon / this.tilex) * this.tilesize * ratio;

    return `url("${this.image.src}") ${x}px ${y}px`;
  }
}

/**
 * Runs `cb` against the sheet whose resolution best matches `sheet`, with that
 * sheet's `drawsize` temporarily forced to `sheet`'s so the caller's geometry
 * stays in the requested sheet's units.
 */
function withDrawSize<T>(manager: IconManager, sheet: number, cb: (found: _IconManager) => T): T {
  const base = manager.iconsheets[sheet];
  const found = manager.findSheet(sheet);
  const ds = found.drawsize;

  found.drawsize = base.drawsize;
  const ret = cb(found);
  found.drawsize = ds;

  return ret;
}

export class CustomIcon {
  key: string;
  baseImage: HTMLImageElement;
  images: HTMLCanvasElement[];
  id: number;
  manager: IconManager;

  constructor(manager: IconManager, key: string, id: number, baseImage: HTMLImageElement) {
    this.key = key;
    this.baseImage = baseImage;
    this.images = [];
    this.id = id;
    this.manager = manager;
  }

  regenIcons(): void {
    const manager = this.manager;

    const doSheet = (sheet: _IconManager) => {
      const size = sheet.drawsize;
      const canvas = document.createElement("canvas");
      const g = canvas.getContext("2d")!;

      canvas.width = canvas.height = size;
      g.drawImage(this.baseImage, 0, 0, size, size);

      canvas.toBlob((blob: Blob | null) => {
        const blobUrl = URL.createObjectURL(blob!);

        sheet.customIcons.set(this.id, {
          blobUrl,
          canvas,
        });
      });
    };

    for (const sheet of manager.iconsheets) {
      doSheet(sheet);
    }
  }
}

export class IconManager {
  iconsheets: _IconManager[];
  tilex: number;
  customIcons: Map<string, CustomIcon>;
  customIconIDMap: Map<number, CustomIcon>;

  /**
   images is a list of dom ids of img tags

   sizes is a list of tile sizes, one per image.
   you can control the final *draw* size by passing an array
   of [tilesize, drawsize] instead of just a number.
   */
  constructor(
    images: (HTMLImageElement | null)[],
    sizes: (number | [number, number])[] = [],
    horizontal_tile_count = 16
  ) {
    this.iconsheets = [];
    this.tilex = horizontal_tile_count;

    this.customIcons = new Map();
    this.customIconIDMap = new Map();

    for (let i = 0; i < images.length; i++) {
      let size: number;
      let drawsize: number;

      if (typeof sizes[i] == "object") {
        size = (sizes as number[][])[i][0];
        drawsize = (sizes as number[][])[i][1];
      } else {
        size = drawsize = sizes[i] as number;
      }

      if (util.isMobile()) {
        drawsize = ~~(drawsize * ((theme.base as ThemeRecord).mobileSizeMultiplier as number));
      }

      this.iconsheets.push(
        new _IconManager(images[i] as HTMLImageElement, size, horizontal_tile_count, drawsize)
      );
    }
  }

  isReady(sheet = 0): boolean {
    return this.iconsheets[sheet].ready;
  }

  addCustomIcon(key: string, image: HTMLImageElement): number {
    let icon = this.customIcons.get(key);

    if (!icon) {
      let maxid = 0;

      for (const k in Icons) {
        maxid = Math.max(maxid, Icons[k] + 1);
      }
      for (const icon of this.customIcons.values()) {
        maxid = Math.max(maxid, icon.id + 1);
      }

      maxid = Math.max(maxid, 1000); //just to be on the safe side

      const id = maxid;
      icon = new CustomIcon(this, key, id, image);

      this.customIcons.set(key, icon);
      this.customIconIDMap.set(id, icon);
    }

    icon.baseImage = image;
    icon.regenIcons();

    return icon.id;
  }

  load(manager2: IconManager): this {
    this.iconsheets = manager2.iconsheets;
    this.tilex = manager2.tilex;

    return this;
  }

  reset(horizontal_tile_count: number): void {
    this.iconsheets.length = 0;
    this.tilex = horizontal_tile_count;
  }

  add(image: HTMLImageElement, size: number, drawsize = size): this {
    this.iconsheets.push(new _IconManager(image, size, this.tilex, drawsize));
    return this;
  }

  canvasDraw(
    elem: UIBase,
    canvas: HTMLCanvasElement,
    g: CanvasRenderingContext2D,
    icon: number,
    x = 0,
    y = 0,
    sheet = 0
  ): void {
    withDrawSize(this, sheet, (found) => found.canvasDraw(elem, canvas, g, icon, x, y));
  }

  findClosestSheet(size: number): number {
    const sheets = this.iconsheets.concat([]);

    sheets.sort((a, b) => a.drawsize - b.drawsize);
    let sheet;

    for (let i = 0; i < sheets.length; i++) {
      if (sheets[i].drawsize <= size) {
        sheet = sheets[i];
        break;
      }
    }

    if (!sheet) sheet = sheets[sheets.length - 1];

    return this.iconsheets.indexOf(sheet);
  }

  findSheet(sheet: number | undefined): _IconManager {
    if (sheet === undefined) {
      console.warn("sheet was undefined");
      sheet = 0;
    }

    const base = this.iconsheets[sheet];

    /**sigh**/
    const dpi = getDPI();
    let minsheet = undefined;
    const goal = dpi * base.drawsize;

    for (const sheet of this.iconsheets) {
      minsheet = sheet;

      if (sheet.drawsize >= goal) {
        break;
      }
    }

    return minsheet === undefined ? base : minsheet;
  }

  getTileSize(sheet = 0): number {
    return this.iconsheets[sheet].drawsize;
  }

  getRealSize(sheet = 0): number {
    return this.iconsheets[sheet].tilesize;
  }

  //icon is an integer
  getCSS(icon: number, sheet = 0): string {
    return withDrawSize(this, sheet, (found) => found.getCSS(icon));
  }

  setCSS(icon: number, dom: HTMLElement, sheet = 0, fitsize?: number | number[] | undefined): void {
    withDrawSize(this, sheet, (found) => found.setCSS(icon, dom, fitsize));
  }
}

let iconmanager: IconManager;

if (typeof document !== "undefined") {
  iconmanager = new IconManager(
    [
      document.getElementById("iconsheet16") as HTMLImageElement | null,
      document.getElementById("iconsheet32") as HTMLImageElement | null,
      document.getElementById("iconsheet48") as HTMLImageElement | null,
    ],
    [16, 32, 64],
    16
  );
} else {
  iconmanager = new IconManager([]);
}

export { iconmanager };
window._iconmanager = iconmanager; //debug global

//if client code overrides iconsheets, they must follow logical convention
//that the first one is "small" and the second is "large"
export const IconSheets: Record<string, number> = {
  SMALL : 0,
  LARGE : 1,
  XLARGE: 2,
};

export function iconSheetFromPackFlag(flag: number): number {
  if (flag & PackFlags.CUSTOM_ICON_SHEET) {
    return flag >> PackFlags.CUSTOM_ICON_SHEET_START;
  }

  //IconSheets is app-overridable, so the sheet index is hardcoded here
  return 1;
}

export function getIconManager(): IconManager {
  return iconmanager;
}

export function setIconManager(
  manager: IconManager,
  IconSheetsOverride?: Record<string, number>
): void {
  iconmanager.load(manager);

  if (IconSheetsOverride !== undefined) {
    for (const k in IconSheetsOverride) {
      IconSheets[k] = IconSheetsOverride[k];
    }
  }
}

export function makeIconDiv(icon: number, sheet = 0): HTMLDivElement {
  const drawsize = iconmanager.getTileSize(sheet);
  const icontest = document.createElement("div");

  icontest.style["width"] = icontest.style["minWidth"] = drawsize + "px";
  icontest.style["height"] = icontest.style["minHeight"] = drawsize + "px";

  icontest.style["margin"] = "0px";
  icontest.style["padding"] = "0px";

  iconmanager.setCSS(icon, icontest, sheet);

  return icontest;
}
