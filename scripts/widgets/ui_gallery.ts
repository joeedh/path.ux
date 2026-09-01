import { UIBase } from "../core/ui_base";
import type { UIBaseDefinition } from "../core/ui_base";
import { IContextBase } from "../core/context_base";
import { ColumnFrame } from "../core/ui_containers";
import { t } from "../core/theme_schema";
import { keymap } from "../path-controller/util/events";
import type { PopupContainer } from "../screen/FrameManager_popup";

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

/** Which item a gallery event is about. Both fields are undefined when the selection cleared. */
export interface GallerySelection {
  id: string | undefined;
  item: GalleryItem | undefined;
}

/** Dispatched when the active item changes, by click or by Enter on the focused cell. */
export class GalleryChangeEvent extends Event {
  selection: GallerySelection;

  constructor(selection: GallerySelection) {
    super("change");
    this.selection = selection;
  }
}

/** Dispatched when an item is chosen for downstream use, by double-click, Enter, or OK. */
export class GalleryConfirmEvent extends Event {
  selection: GallerySelection;

  constructor(selection: GallerySelection) {
    super("confirm");
    this.selection = selection;
  }
}

/** Cell geometry for the current viewport width, recomputed whenever the grid is rebuilt. */
interface GridMetrics {
  cellWidth: number;
  cellHeight: number;
  margin: number;
  pitchX: number;
  pitchY: number;
  columns: number;
  rows: number;
  visibleRows: number;
}

/**
 * A scrolling grid of thumbnails backed by a fixed pool of cells. The pool is sized off the
 * measured viewport plus an overscan margin and is rebound as the grid scrolls, so the DOM cost
 * is bounded by what fits on screen rather than by the number of items.
 *
 * Keyboard focus moves an index rather than a DOM node. Only the cell currently bound to that
 * index is a tab stop, because which pool slot holds an item changes on every scroll; when the
 * focused index is scrolled out of the bound range the grid itself becomes the tab stop and
 * hands focus back to the cell.
 */
export class AssetGalleryGrid<CTX extends IContextBase = IContextBase> extends UIBase<
  CTX,
  undefined,
  "AssetGalleryGrid"
> {
  cache: ThumbnailCache = sharedThumbnailCache;

  private content: HTMLDivElement;
  private items: GalleryItem[] = [];
  private pool: AssetThumb<CTX>[] = [];
  private metrics: GridMetrics = {
    cellWidth  : 96,
    cellHeight : 96,
    margin     : 4,
    pitchX     : 100,
    pitchY     : 100,
    columns    : 1,
    rows       : 0,
    visibleRows: 1,
  };
  private firstIndex = -1;
  private _focusIndex = 0;
  private _active: GalleryItem | undefined;
  private resizeObserver: ResizeObserver | undefined;

  constructor() {
    super();

    this.content = document.createElement("div");
    this.content.style.position = "relative";
    this.content.style.width = "100%";
    this.shadow.appendChild(this.content);

    this.addEventListener("scroll", () => this.rebind());
    this.addEventListener("keydown", (e) => this.onKeyDown(e));
    this.addEventListener("focus", () => {
      // reached by tabbing in while the focused index is scrolled out of the pool's range
      if (this.cellFor(this._focusIndex) === undefined) {
        this.setFocusIndex(this._focusIndex);
      }
    });
  }

  static define(): UIBaseDefinition {
    return {
      tagname: "assetgallerygrid-x",
      style  : "assetgallery",
      theme: {
        "background-color": t.color,
        cellWidth         : t.number,
        cellHeight        : t.number,
        overscanRows      : t.number,
      },
    };
  }

  init() {
    super.init();

    this.style.display = "block";
    this.style.position = "relative";
    this.style.overflowX = "hidden";
    this.style.overflowY = "auto";
    this.background = this.getDefault("background-color");

    if (typeof ResizeObserver !== "undefined" && this.resizeObserver === undefined) {
      this.resizeObserver = new ResizeObserver(() => this.rebuild());
      this.resizeObserver.observe(this);
    }

    this.rebuild();
  }

  remove() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    return super.remove();
  }

  /** The items the grid draws, in display order. Replaces whatever was there. */
  setItems(items: GalleryItem[]): void {
    this.items = items;

    if (this._active !== undefined && !items.includes(this._active)) {
      this._active = undefined;
    }
    this._focusIndex = Math.min(Math.max(this._focusIndex, 0), Math.max(0, items.length - 1));

    this.rebuild();
  }

  /** How many items the grid is currently drawing. */
  get itemCount(): number {
    return this.items.length;
  }

  /** The selected item, which survives being scrolled out of view. */
  get active(): GalleryItem | undefined {
    return this._active;
  }

  set active(item: GalleryItem | undefined) {
    this.setActive(item, false);
  }

  /** Where the keyboard cursor sits, as an index into the item list. */
  get focusIndex(): number {
    return this._focusIndex;
  }

  /** Number of pool cells, exposed so a test can check the pool tracks the viewport. */
  get poolSize(): number {
    return this.pool.length;
  }

  /** Columns the current viewport width fits, exposed for the same reason as `poolSize`. */
  get columns(): number {
    return this.metrics.columns;
  }

  /** Item index the first pool slot is bound to, exposed so a test can watch recycling. */
  get firstBoundIndex(): number {
    return this.firstIndex;
  }

  /** Selects `item`, dispatching `"change"` when `notify` is set and the selection moved. */
  setActive(item: GalleryItem | undefined, notify = true): void {
    if (item === this._active) {
      return;
    }

    this._active = item;
    for (const cell of this.pool) {
      cell.isActive = cell.item !== undefined && cell.item === item;
    }

    if (notify) {
      this.dispatchEvent(new GalleryChangeEvent({ id: item?.id, item }));
    }
  }

  /** Moves the keyboard cursor, scrolling the target row into view before rebinding. */
  setFocusIndex(index: number): void {
    if (this.items.length === 0) {
      return;
    }

    this._focusIndex = Math.min(Math.max(index, 0), this.items.length - 1);
    this.scrollIndexIntoView(this._focusIndex);
    this.rebind(true);
    this.cellFor(this._focusIndex)?.focus();
  }

  /** Recomputes the layout and pool for the current viewport, then rebinds every cell. */
  rebuild(): void {
    this.measure();
    this.resizePool();

    this.content.style.height =
      this.metrics.rows * this.metrics.pitchY + this.metrics.margin + "px";

    this.rebind(true);
  }

  private measure(): void {
    const cellWidth = this.getDefault("cellWidth") as number;
    const cellHeight = this.getDefault("cellHeight") as number;
    const margin = (this.pool[0]?.getDefault("margin") as number | undefined) ?? 4;

    const pitchX = cellWidth + margin;
    const pitchY = cellHeight + margin;

    const viewWidth = this.clientWidth || cellWidth + margin * 2;
    const viewHeight = this.clientHeight || cellHeight + margin * 2;

    const columns = Math.max(1, Math.floor((viewWidth - margin) / pitchX));

    this.metrics = {
      cellWidth,
      cellHeight,
      margin,
      pitchX,
      pitchY,
      columns,
      rows       : Math.ceil(this.items.length / columns),
      visibleRows: Math.max(1, Math.ceil(viewHeight / pitchY)),
    };
  }

  private resizePool(): void {
    const { columns, visibleRows, cellWidth, cellHeight } = this.metrics;
    const overscan = this.getDefault("overscanRows") as number;
    const wanted = Math.min(this.items.length, (visibleRows + 1 + overscan * 2) * columns);

    while (this.pool.length > wanted) {
      this.pool.pop()!.remove();
    }

    while (this.pool.length < wanted) {
      const cell = UIBase.createElement("assetthumb-x") as AssetThumb<CTX>;
      cell.ctx = this.ctx;
      this.content.appendChild(cell);
      cell._init();

      cell.addEventListener("click", () => this.pick(cell.index));
      cell.addEventListener("dblclick", () => this.confirmAt(cell.index));

      this.pool.push(cell);
    }

    for (const cell of this.pool) {
      cell.setSize(cellWidth, cellHeight);
    }

    // an evicted thumbnail must never be one that is still on screen
    this.cache.ensureCapacity(this.pool.length * 2);

    // the pool only measures right once the cells exist, so the margin is read back afterwards
    const margin =
      (this.pool[0]?.getDefault("margin") as number | undefined) ?? this.metrics.margin;
    if (margin !== this.metrics.margin) {
      this.measure();
    }
  }

  /**
   * Points each pool cell at the item its slot now holds. Cheap enough to call on every scroll
   * event: unless the first bound index moved, or `force` is set, it does nothing.
   */
  private rebind(force = false): void {
    const { columns, margin, pitchX, pitchY } = this.metrics;
    const overscan = this.getDefault("overscanRows") as number;

    const firstRow = Math.max(0, Math.floor(this.scrollTop / pitchY) - overscan);
    const firstIndex = firstRow * columns;

    if (!force && firstIndex === this.firstIndex) {
      return;
    }
    this.firstIndex = firstIndex;

    let focusedCell: AssetThumb<CTX> | undefined;

    for (let slot = 0; slot < this.pool.length; slot++) {
      const cell = this.pool[slot];
      const index = firstIndex + slot;

      if (index >= this.items.length) {
        cell.index = -1;
        cell.style.display = "none";
        cell.bindItem(undefined, this.cache);
        cell.focused = false;
        continue;
      }

      const item = this.items[index];
      const col = index % columns;
      const row = (index - col) / columns;

      cell.index = index;
      cell.style.display = "block";
      cell.setCellPos(margin + col * pitchX, margin + row * pitchY);

      if (cell.item !== item) {
        cell.bindItem(item, this.cache);
      }
      cell.isActive = item === this._active;
      cell.focused = index === this._focusIndex;

      if (cell.focused) {
        focusedCell = cell;
      }
    }

    this.tabIndex = focusedCell === undefined ? 0 : -1;
  }

  private cellFor(index: number): AssetThumb<CTX> | undefined {
    return this.pool.find((cell) => cell.index === index);
  }

  private scrollIndexIntoView(index: number): void {
    const { columns, pitchY, cellHeight, margin } = this.metrics;
    const top = margin + Math.floor(index / columns) * pitchY;
    const bottom = top + cellHeight;
    const viewHeight = this.clientHeight || cellHeight;

    if (top - margin < this.scrollTop) {
      this.scrollTop = Math.max(0, top - margin);
    } else if (bottom + margin > this.scrollTop + viewHeight) {
      this.scrollTop = bottom + margin - viewHeight;
    }
  }

  /** Selects the item at `index` without confirming it. */
  private pick(index: number): void {
    if (index < 0 || index >= this.items.length) {
      return;
    }

    this._focusIndex = index;
    this.rebind(true);
    this.setActive(this.items[index]);
  }

  /** Selects the item at `index` and announces it as chosen. */
  private confirmAt(index: number): void {
    if (index < 0 || index >= this.items.length) {
      return;
    }

    this.pick(index);
    const item = this.items[index];
    this.dispatchEvent(new GalleryConfirmEvent({ id: item.id, item }));
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (this.items.length === 0) {
      return;
    }

    const { columns, visibleRows } = this.metrics;
    const page = Math.max(1, visibleRows) * columns;
    let next: number | undefined;

    switch (e.keyCode) {
      case keymap["Up"]:
        next = this._focusIndex - columns;
        break;
      case keymap["Down"]:
        next = this._focusIndex + columns;
        break;
      case keymap["Left"]:
        next = this._focusIndex - 1;
        break;
      case keymap["Right"]:
        next = this._focusIndex + 1;
        break;
      case keymap["Home"]:
        next = 0;
        break;
      case keymap["End"]:
        next = this.items.length - 1;
        break;
      case keymap["PageUp"]:
        next = this._focusIndex - page;
        break;
      case keymap["PageDown"]:
        next = this._focusIndex + page;
        break;
      case keymap["Enter"]:
        this.confirmAt(this._focusIndex);
        e.preventDefault();
        e.stopPropagation();
        return;
      default:
        return;
    }

    // clamped rather than wrapped, so a held arrow key stops at the edge
    this.setFocusIndex(next);
    e.preventDefault();
    e.stopPropagation();
  }
}

UIBase.internalRegister(AssetGalleryGrid);

/** Whether `item` matches `query`, which is already lowercased and non-empty. */
function matchesQuery(item: GalleryItem, query: string): boolean {
  if (item.id.toLowerCase().includes(query)) {
    return true;
  }
  if (item.label?.toLowerCase().includes(query)) {
    return true;
  }
  return (item.searchTags ?? []).some((tag) => tag.toLowerCase().includes(query));
}

/**
 * A searchable thumbnail grid. The search box filters the item list by substring over the id,
 * the label and the search tags; the grid below re-lays out around whatever is left.
 *
 * Re-dispatches the grid's `"change"` and `"confirm"` events, so a host that only wants to
 * follow the selection listens for `"change"` and a host that wants a chosen item listens for
 * `"confirm"`.
 */
export class AssetGallery<CTX extends IContextBase = IContextBase> extends ColumnFrame<
  CTX,
  "AssetGallery"
> {
  cache: ThumbnailCache = sharedThumbnailCache;

  private grid: AssetGalleryGrid<CTX> | undefined;
  private allItems: GalleryItem[] = [];
  private query = "";

  static define(): UIBaseDefinition {
    return {
      tagname: "assetgallery-x",
      style  : "assetgallery",
      theme: {
        width : t.number,
        height: t.number,
      },
    };
  }

  init() {
    super.init();

    if (this.grid !== undefined) {
      return;
    }

    const search = this.textbox(undefined, "", (value) => this.setQuery(String(value)));
    search.description = "Show only items whose name or tags contain this text";
    search.setAttribute("placeholder", "Search");

    const grid = UIBase.createElement<AssetGalleryGrid<CTX>>("assetgallerygrid-x");
    grid.cache = this.cache;
    grid.style.width = (this.getDefault("width") as number) + "px";
    grid.style.height = (this.getDefault("height") as number) + "px";
    this.add(grid);
    this.grid = grid;

    grid.addEventListener("change", (e) => {
      this.dispatchEvent(new GalleryChangeEvent((e as GalleryChangeEvent).selection));
    });
    grid.addEventListener("confirm", (e) => {
      this.dispatchEvent(new GalleryConfirmEvent((e as GalleryConfirmEvent).selection));
    });

    this.applyQuery();
  }

  /** The items to offer, before filtering. Safe to call before the widget is in the DOM. */
  setItems(items: GalleryItem[]): void {
    this.allItems = items;
    this.applyQuery();
  }

  /** The selected item, which the search box hiding it does not clear. */
  get active(): GalleryItem | undefined {
    return this.grid?.active;
  }

  set active(item: GalleryItem | undefined) {
    if (this.grid !== undefined) {
      this.grid.active = item;
    }
  }

  /** The search text, as if it had been typed into the box. */
  setQuery(query: string): void {
    this.query = query.trim().toLowerCase();
    this.applyQuery();
  }

  private applyQuery(): void {
    if (this.grid === undefined) {
      return;
    }

    const shown =
      this.query === ""
        ? this.allItems
        : this.allItems.filter((item) => matchesQuery(item, this.query));

    this.grid.setItems(shown);
  }
}

UIBase.internalRegister(AssetGallery);

/** What {@link pickAssetPopup} shows and how it starts out. */
export interface PickAssetArgs {
  items: GalleryItem[];
  /** Selected when the popup opens, by item or by id. */
  active?: GalleryItem | string;
  /** Shared with the caller so a reopened popup redraws from decoded thumbnails. */
  cache?: ThumbnailCache;
}

/**
 * Opens a gallery over `owner` and resolves with the item the user chose, or with undefined if
 * they cancelled. Confirming (double-click, Enter, or the OK button) resolves and closes;
 * clicking a thumbnail only moves the selection, since choosing and then pressing OK is the
 * gesture this popup is built around.
 */
export function pickAssetPopup<CTX extends IContextBase = IContextBase>(
  owner: UIBase<CTX>,
  args: PickAssetArgs
): Promise<GalleryItem | undefined> {
  return new Promise((resolve) => {
    const popup = owner.ctx.screen.popup(
      owner,
      owner,
      undefined,
      false
    ) as unknown as PopupContainer<CTX>;

    let settled = false;
    const finish = (item: GalleryItem | undefined) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(item);
    };

    // every teardown path ends in remove(), Escape and the outside-click handler included
    const baseRemove = popup.remove.bind(popup);
    popup.remove = (...rest: Parameters<UIBase["remove"]>) => {
      finish(undefined);
      return baseRemove(...rest);
    };

    const gallery = UIBase.createElement<AssetGallery<CTX>>("assetgallery-x");
    if (args.cache !== undefined) {
      gallery.cache = args.cache;
    }
    popup.add(gallery);
    gallery.setItems(args.items);

    if (args.active !== undefined) {
      const wanted = args.active;
      gallery.active =
        typeof wanted === "string" ? args.items.find((item) => item.id === wanted) : wanted;
    }

    gallery.addEventListener("confirm", (e) => {
      finish((e as GalleryConfirmEvent).selection.item);
      popup.end();
    });

    const footer = popup.row();
    const ok = footer.button("OK", () => {
      finish(gallery.active);
      popup.end();
    });
    ok.description = "Use the selected item";

    const cancel = footer.button("Cancel", () => popup.end());
    cancel.description = "Close without choosing anything";

    popup.flushUpdate();
  });
}
