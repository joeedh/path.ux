import { UIBase } from "../core/ui_base";
import type { UIBaseDefinition } from "../core/ui_base";
import { IContextBase } from "../core/context_base";
import { ColumnFrame } from "../core/ui_containers";
import { t } from "../core/theme_schema";
import { AssetGalleryGrid } from "./asset_gallery_grid";
import { GalleryItem, ThumbnailCache, sharedThumbnailCache } from "./thumbnail_cache";
import { GalleryChangeEvent, GalleryConfirmEvent } from "./gallery_events";

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
