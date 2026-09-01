import type { GalleryItem } from "./thumbnail_cache";

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
