import { UIBase } from "../core/ui_base";
import type { UIBaseDefinition } from "../core/ui_base";
import { IContextBase } from "../core/context_base";
import { t } from "../core/theme_schema";
import { GalleryItem, ThumbnailCache, sharedThumbnailCache } from "./thumbnail_cache";

/**
 * One pooled thumbnail cell. Cells are created once by the grid and rebound as it scrolls, so
 * nothing here may assume it keeps the same item, and every paint reads the image back out of
 * the cache rather than from a field.
 *
 * Hover, keyboard focus and selection are three independent states that compose: a cell can be
 * all three at once, which is why focus draws a ring rather than a fill.
 */
export class AssetThumb<CTX extends IContextBase = IContextBase> extends UIBase<
  CTX,
  undefined,
  "AssetThumb"
> {
  dom: HTMLCanvasElement;
  g: CanvasRenderingContext2D;

  item: GalleryItem | undefined;
  /** Index into the grid's item list, or -1 while the cell is parked off the end. */
  index = -1;

  private cache: ThumbnailCache = sharedThumbnailCache;
  private _hover = false;
  private _focused = false;
  private _active = false;
  private _width = 96;
  private _height = 96;
  /** Bumped on every rebind so a load that resolves late is discarded. */
  private _bindGen = 0;

  constructor() {
    super();

    this.dom = document.createElement("canvas");
    this.g = this.dom.getContext("2d")!;
    this.shadow.appendChild(this.dom);

    this.addEventListener("pointerenter", () => {
      this._hover = true;
      this.redraw();
    });
    this.addEventListener("pointerleave", () => {
      this._hover = false;
      this.redraw();
    });
  }

  static define(): UIBaseDefinition {
    return {
      tagname: "assetthumb-x",
      style  : "assetthumb",
      theme: {
        "background-color": t.color,
        highlight         : t.color,
        active            : t.color,
        focusRing         : t.color,
        border: {
          color: t.color,
          width: t.number,
        },
        margin            : t.number,
        padding           : t.number,
      },
    };
  }

  init() {
    super.init();

    this.style.position = "absolute";
    this.style.display = "block";
    // focusable from the start, or a click lands on the grid behind it instead of on the cell
    this.tabIndex = -1;
    this.dom.style.padding = this.dom.style.margin = "0px";
    this.setSize(this._width, this._height);
  }

  get hover(): boolean {
    return this._hover;
  }

  get focused(): boolean {
    return this._focused;
  }

  set focused(state: boolean) {
    if (state !== this._focused) {
      this._focused = state;
      // only the focused cell is a tab stop, so the stop survives recycling
      this.tabIndex = state ? 0 : -1;
      this.redraw();
    }
  }

  get isActive(): boolean {
    return this._active;
  }

  set isActive(state: boolean) {
    if (state !== this._active) {
      this._active = state;
      this.redraw();
    }
  }

  /** Cell size in CSS pixels, excluding the theme's inter-cell margin. */
  setSize(width: number, height: number): void {
    this._width = width;
    this._height = height;

    const dpi = this.getDPI();
    this.dom.width = Math.max(1, Math.floor(width * dpi));
    this.dom.height = Math.max(1, Math.floor(height * dpi));
    this.dom.style.width = width + "px";
    this.dom.style.height = height + "px";
    this.style.width = width + "px";
    this.style.height = height + "px";

    this.redraw();
  }

  /** Moves the cell within the grid's scrolling content. */
  setCellPos(x: number, y: number): void {
    this.style.transform = `translate(${x}px, ${y}px)`;
  }

  /**
   * Points the cell at another item, or at nothing when `item` is undefined. A decode already
   * running for the previous item is left to finish into the cache and is not painted here.
   */
  bindItem(item: GalleryItem | undefined, cache: ThumbnailCache = sharedThumbnailCache): void {
    this.cache = cache;
    this.item = item;
    this._bindGen++;

    this.description = item ? item.tooltip ?? item.label ?? item.id : undefined;
    this.title = this.description ?? "";

    this.redraw();

    if (item === undefined || cache.peek(item.id) !== undefined) {
      return;
    }

    const source = item.image;
    const load = typeof source === "function" ? source : () => Promise.resolve(source);
    const gen = this._bindGen;

    cache
      .get(item.id, load)
      .then(() => {
        if (gen === this._bindGen) {
          this.redraw();
        }
      })
      .catch((error: unknown) => {
        // a thumbnail that will not decode leaves the cell empty rather than failing the grid
        console.warn("AssetThumb: could not load", item.id, error);
      });
  }

  /** Repaints from the cache. Safe to call at any time, including before an image arrives. */
  redraw(): void {
    const g = this.g;
    const dpi = this.getDPI();
    const w = this.dom.width;
    const h = this.dom.height;

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, h);

    g.fillStyle = this.fillColor();
    g.fillRect(0, 0, w, h);

    const border = this.getDefault("border") as unknown as
      | { color: string; width: number }
      | undefined;
    const borderWidth = (border?.width ?? 0) * dpi;
    if (borderWidth > 0) {
      g.strokeStyle = border!.color;
      g.lineWidth = borderWidth;
      g.strokeRect(borderWidth * 0.5, borderWidth * 0.5, w - borderWidth, h - borderWidth);
    }

    this.drawImage(borderWidth + (this.getDefault("padding") as number) * dpi);

    if (this._focused) {
      const ring = Math.max(2 * dpi, borderWidth);
      g.strokeStyle = this.getDefault("focusRing");
      g.lineWidth = ring;
      g.strokeRect(ring * 0.5, ring * 0.5, w - ring, h - ring);
    }
  }

  private fillColor(): string {
    if (this._active) {
      return this.getDefault("active");
    }
    if (this._hover) {
      return this.getDefault("highlight");
    }
    return this.getDefault("background-color");
  }

  /** Letterboxes the cached thumbnail into the cell, inset by `inset` device pixels. */
  private drawImage(inset: number): void {
    const src = this.item ? this.cache.peek(this.item.id) : undefined;
    if (src === undefined) {
      return;
    }

    const boxW = this.dom.width - inset * 2;
    const boxH = this.dom.height - inset * 2;
    if (boxW <= 0 || boxH <= 0) {
      return;
    }

    const scale = Math.min(boxW / src.width, boxH / src.height);
    const drawW = src.width * scale;
    const drawH = src.height * scale;

    this.g.drawImage(src, inset + (boxW - drawW) * 0.5, inset + (boxH - drawH) * 0.5, drawW, drawH);
  }
}

UIBase.internalRegister(AssetThumb);
