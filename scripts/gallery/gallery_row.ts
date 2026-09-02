import type { GalleryItem } from "./thumbnail_cache";

/** Which layout a gallery draws its items in. */
export type GalleryMode = "grid" | "list";

/** The element a row renderer fills, and the state of the row it belongs to. */
export interface GalleryRowBox {
  /**
   * The element to fill. Empty when `create` runs, and reused for every item the pooled row is
   * bound to afterwards.
   *
   * It is `pointer-events: none`, so a press anywhere across the row selects the row. A renderer
   * whose content has controls of its own sets `style.pointerEvents = "auto"` on those elements
   * — on the controls themselves, not on this element, which would take the whole box out of the
   * row's hit area and leave a strip the author cannot click to select.
   */
  dom: HTMLDivElement;
  /** Index into the gallery's item list, or -1 while the row sits past the last item. */
  index: number;
  /** Whether the row is the gallery's selection. */
  active: boolean;
  /** Whether the keyboard cursor is on the row. */
  focused: boolean;
  /** Box width in CSS pixels, which excludes the thumbnail square beside it. */
  width: number;
  /** Box height in CSS pixels. */
  height: number;
}

/**
 * Fills the box beside a thumbnail in list mode.
 *
 * Rows are pooled and rebound as the gallery scrolls, so this is a bind protocol over a reused
 * element rather than a per-item render: build in {@link create}, which runs once for each of the
 * handful of rows the viewport holds, and write into what it built from {@link bind}.
 */
export interface GalleryRowRenderer {
  /** Builds the reusable content once per pooled row, before any item reaches it. */
  create?(box: GalleryRowBox): void;
  /**
   * Points the box at `item`, or empties it when `item` is undefined. Called whenever the row's
   * item, selection or keyboard focus changes, so it must be cheap and must not accumulate state
   * across calls.
   */
  bind(box: GalleryRowBox, item: GalleryItem | undefined): void;
  /** Releases whatever `create` allocated, when the pooled row is discarded. */
  destroy?(box: GalleryRowBox): void;
}

/** Writes the item's name into the box, which the gallery has already set to wrap it. */
export const defaultRowRenderer: GalleryRowRenderer = {
  bind(box: GalleryRowBox, item: GalleryItem | undefined): void {
    box.dom.textContent = item ? item.label ?? item.id : "";
  },
};
