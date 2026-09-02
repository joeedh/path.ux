import { UIBase } from "../core/ui_base";
import type { UIBaseDefinition } from "../core/ui_base";
import { IContextBase } from "../core/context_base";
import { t } from "../core/theme_schema";
import { keymap } from "../path-controller/util/events";
import { AssetThumb } from "./asset_thumb";
import { GalleryItem, ThumbnailCache, sharedThumbnailCache } from "./thumbnail_cache";
import { GalleryChangeEvent, GalleryConfirmEvent } from "./gallery_events";
import { defaultRowRenderer, type GalleryMode, type GalleryRowRenderer } from "./gallery_row";

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
  private _mode: GalleryMode = "grid";
  private _renderer: GalleryRowRenderer = defaultRowRenderer;
  private resizeObserver: ResizeObserver | undefined;

  constructor() {
    super();

    this.content = document.createElement("div");
    this.content.style.position = "relative";
    this.content.style.width = "100%";
    this.shadow.appendChild(this.content);

    this.addEventListener("scroll", () => this.rebind());
    this.addEventListener("keydown", (e) => this.onKeyDown(e));
    this.addEventListener("focus", (e) => {
      // A cell taking focus retargets to the host, so act only when the grid itself was focused.
      // Without this, clicking a cell would scroll the focused index back into view and take the
      // cell out from under the pointer.
      if (e.composedPath()[0] !== this) {
        return;
      }
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
        rowHeight         : t.number,
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

  /** Which layout the items are drawn in. The selection and focus index survive a change. */
  get mode(): GalleryMode {
    return this._mode;
  }

  set mode(mode: GalleryMode) {
    if (mode === this._mode) {
      return;
    }

    this._mode = mode;
    this.scrollTop = 0;
    // cells carry their layout from creation, so the pool is discarded rather than reshaped
    this.repool();
  }

  /**
   * Fills the box beside each thumbnail in list mode. Replacing it rebuilds the pool, so what
   * the old renderer built is torn down through its own `destroy`.
   */
  get rowRenderer(): GalleryRowRenderer {
    return this._renderer;
  }

  set rowRenderer(renderer: GalleryRowRenderer) {
    this._renderer = renderer;
    this.repool();
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

  /** Drops every pooled cell and lays the grid out again, so the cells are made afresh. */
  private repool(): void {
    while (this.pool.length > 0) {
      this.pool.pop()!.remove();
    }
    this.firstIndex = -1;

    // before init() the theme is not yet readable, and init() ends in a rebuild of its own
    if (this._init_done) {
      this.rebuild();
    }
  }

  private measure(): void {
    const list = this._mode === "list";
    const margin = (this.pool[0]?.getDefault("margin") as number | undefined) ?? 4;

    const gridWidth = this.getDefault("cellWidth") as number;
    const gridHeight = this.getDefault("cellHeight") as number;

    const viewWidth = this.clientWidth || gridWidth + margin * 2;
    const viewHeight = this.clientHeight || gridHeight + margin * 2;

    // a row spans the viewport, so its width follows the scrollbar rather than the theme
    const cellWidth = list ? Math.max(gridHeight, viewWidth - margin * 2) : gridWidth;
    const cellHeight = list ? (this.getDefault("rowHeight") as number) : gridHeight;

    const pitchX = cellWidth + margin;
    const pitchY = cellHeight + margin;

    const columns = list ? 1 : Math.max(1, Math.floor((viewWidth - margin) / pitchX));

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
      // both are read by init(), which _init() runs below
      cell.mode = this._mode;
      cell.renderer = this._renderer;
      // appended to the content div rather than added as a child, so the link a hit test walks
      // back up to find the enclosing popup has to be made here
      cell.parentWidget = this;
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
