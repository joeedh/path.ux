import { UIBase } from "../core/ui_base";
import type { UIBaseDefinition } from "../core/ui_base";
import { IContextBase } from "../core/context_base";
import { t } from "../core/theme_schema";

/** Anything `CanvasRenderingContext2D.drawImage` accepts and a thumbnail cell can paint. */
export type ThumbSource = ImageBitmap | HTMLImageElement | HTMLCanvasElement;

/**
 * One entry in a gallery. The host supplies these; the widget knows nothing about where the
 * pixels come from, so `image` may be a resolved source or a thunk that decodes one on demand.
 */
export interface GalleryItem {
  /** Stable identity, also the thumbnail cache key. */
  id: string;
  image: ThumbSource | (() => Promise<ThumbSource>);
  /** Shown under the thumbnail when the gallery is drawing labels. */
  label?: string;
  /** Hover text. Falls back to `label`, then to `id`. */
  tooltip?: string;
  /** Lowercased substring-matched by the gallery's search bar, alongside `label` and `id`. */
  searchTags?: string[];
}

/** Whether a cached source owns decoded bitmap memory that must be released explicitly. */
function isBitmap(src: ThumbSource): src is ImageBitmap {
  return typeof (src as ImageBitmap).close === "function";
}

/**
 * Decoded thumbnails keyed by {@link GalleryItem.id}, shared across every cell and every
 * gallery in the process. Concurrent requests for one id are coalesced onto a single load, so
 * a fast scroll that asks twice before the first decode finishes still decodes once.
 *
 * Eviction closes an `ImageBitmap`, which frees the decoded pixels immediately. A caller must
 * therefore not hold a source across an await — read it back through {@link peek} each time it
 * paints, and keep the capacity at or above the number of cells drawn at once
 * ({@link ensureCapacity}) so a visible thumbnail is never the one evicted.
 */
export class ThumbnailCache {
  private entries = new Map<string, ThumbSource>();
  private inFlight = new Map<string, Promise<ThumbSource>>();
  private _maxEntries: number;

  constructor(maxEntries = 200) {
    this._maxEntries = Math.max(1, maxEntries);
  }

  /** How many decoded thumbnails are held before the oldest is dropped. */
  get maxEntries(): number {
    return this._maxEntries;
  }

  set maxEntries(count: number) {
    this._maxEntries = Math.max(1, count);
    this.evict();
  }

  /** Number of decoded thumbnails currently held. */
  get size(): number {
    return this.entries.size;
  }

  /** Raises the capacity to `count` if it is lower. Never lowers it. */
  ensureCapacity(count: number): void {
    if (count > this._maxEntries) {
      this.maxEntries = count;
    }
  }

  /** The decoded thumbnail for `id` if it is already held, without starting a load. */
  peek(id: string): ThumbSource | undefined {
    const src = this.entries.get(id);
    if (src !== undefined) {
      // reinsert so the most recently painted id is the last one evicted
      this.entries.delete(id);
      this.entries.set(id, src);
    }
    return src;
  }

  /** The decoded thumbnail for `id`, running `loader` only when nothing else already is. */
  get(id: string, loader: () => Promise<ThumbSource>): Promise<ThumbSource> {
    const held = this.peek(id);
    if (held !== undefined) {
      return Promise.resolve(held);
    }

    const running = this.inFlight.get(id);
    if (running !== undefined) {
      return running;
    }

    const load = (async () => {
      try {
        const src = await loader();
        this.entries.set(id, src);
        this.evict();
        return src;
      } finally {
        this.inFlight.delete(id);
      }
    })();

    this.inFlight.set(id, load);
    return load;
  }

  /** Drops one entry and releases its bitmap. A load already running for `id` is unaffected. */
  delete(id: string): void {
    const src = this.entries.get(id);
    if (src === undefined) {
      return;
    }
    this.entries.delete(id);
    if (isBitmap(src)) {
      src.close();
    }
  }

  /** Drops every entry and releases every bitmap. */
  clear(): void {
    for (const id of [...this.entries.keys()]) {
      this.delete(id);
    }
  }

  private evict(): void {
    while (this.entries.size > this._maxEntries) {
      const oldest = this.entries.keys().next();
      if (oldest.done) {
        return;
      }
      this.delete(oldest.value);
    }
  }
}

/** The cache every gallery uses unless its host passes one of its own. */
export const sharedThumbnailCache = new ThumbnailCache();

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
