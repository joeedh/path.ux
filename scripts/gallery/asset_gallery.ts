import { UIBase } from "../core/ui_base";
import type { UIBaseDefinition } from "../core/ui_base";
import { IContextBase } from "../core/context_base";
import { ColumnFrame, RowFrame } from "../core/ui_containers";
import { t } from "../core/theme_schema";
import { AssetGalleryGrid } from "./asset_gallery_grid";
import { GalleryModeButton } from "./gallery_mode_button";
import { GalleryItem, ThumbnailCache, sharedThumbnailCache } from "./thumbnail_cache";
import { GalleryChangeEvent, GalleryConfirmEvent } from "./gallery_events";
import { defaultRowRenderer, type GalleryMode, type GalleryRowRenderer } from "./gallery_row";

/** What each mode button offers, said as the result rather than as the mode's name. */
const MODE_TOOLTIP: Record<GalleryMode, string> = {
  grid: "Show the assets as a grid of thumbnails",
  list: "Show the assets as rows, with a name beside each thumbnail",
};

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

  /** Whether the grid/list toggle is drawn. Clear it before init to drive `mode` from elsewhere. */
  showModeToggle = true;

  private grid: AssetGalleryGrid<CTX> | undefined;
  private modeButtons: GalleryModeButton<CTX>[] = [];
  private allItems: GalleryItem[] = [];
  private query = "";
  private pendingMode: GalleryMode = "grid";
  private pendingRenderer: GalleryRowRenderer | undefined;

  static define(): UIBaseDefinition {
    return {
      tagname    : "assetgallery-x",
      style      : "assetgallery",
      parentStyle: "popup",
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

    const bar = this.row();
    bar.style.width = "100%";

    const search = bar.textbox(undefined, "", (value) => this.setQuery(String(value)));
    search.description = "Show only items whose name or tags contain this text";
    search.setAttribute("placeholder", "Search");
    search.style.flex = "1 1 auto";

    const grid = UIBase.createElement<AssetGalleryGrid<CTX>>("assetgallerygrid-x");
    grid.cache = this.cache;
    grid.style.width = (this.getDefault("width") as number) + "px";
    grid.style.height = (this.getDefault("height") as number) + "px";
    this.add(grid);
    this.grid = grid;

    if (this.pendingRenderer !== undefined) {
      grid.rowRenderer = this.pendingRenderer;
      this.pendingRenderer = undefined;
    }
    grid.mode = this.pendingMode;

    if (this.showModeToggle) {
      this.buildModeToggle(bar);
    }

    grid.addEventListener("change", (e) => {
      this.dispatchEvent(new GalleryChangeEvent((e as GalleryChangeEvent).selection));
    });
    grid.addEventListener("confirm", (e) => {
      this.dispatchEvent(new GalleryConfirmEvent((e as GalleryConfirmEvent).selection));
    });

    this.applyQuery();
  }

  /** Adds the two abutting mode buttons at the trailing end of the search row. */
  private buildModeToggle(bar: RowFrame<CTX>): void {
    for (const mode of ["grid", "list"] as GalleryMode[]) {
      const button = UIBase.createElement<GalleryModeButton<CTX>>("gallerymodebutton-x");

      button.mode = mode;
      button.description = MODE_TOOLTIP[mode];
      button.title = MODE_TOOLTIP[mode];
      button.selected = mode === this.pendingMode;
      button.addEventListener("click", () => {
        this.mode = mode;
      });

      bar.add(button);
      this.modeButtons.push(button);
    }
  }

  /** Which layout the items are drawn in. The selection survives a change; the scroll does not. */
  get mode(): GalleryMode {
    return this.grid?.mode ?? this.pendingMode;
  }

  set mode(mode: GalleryMode) {
    this.pendingMode = mode;

    if (this.grid !== undefined) {
      this.grid.mode = mode;
    }
    for (const button of this.modeButtons) {
      button.selected = button.mode === mode;
    }
  }

  /** Fills the box beside each thumbnail in list mode. See {@link GalleryRowRenderer}. */
  get rowRenderer(): GalleryRowRenderer {
    return this.grid?.rowRenderer ?? this.pendingRenderer ?? defaultRowRenderer;
  }

  set rowRenderer(renderer: GalleryRowRenderer) {
    if (this.grid === undefined) {
      this.pendingRenderer = renderer;
      return;
    }
    this.grid.rowRenderer = renderer;
  }

  saveData(): Record<string, unknown> {
    return { mode: this.mode };
  }

  loadData(obj: Record<string, unknown>): this {
    if (obj.mode === "grid" || obj.mode === "list") {
      this.mode = obj.mode;
    }
    return this;
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
