import { UIBase } from "../core/ui_base";
import { IContextBase } from "../core/context_base";
import type { PopupContainer } from "../screen/FrameManager_popup";
import { AssetGallery } from "./asset_gallery";
import { GalleryItem, ThumbnailCache } from "./thumbnail_cache";
import { GalleryConfirmEvent } from "./gallery_events";

/** What {@link pickAssetPopup} shows and how it starts out. */
export interface PickAssetArgs {
  items: GalleryItem[];
  /** Selected when the popup opens, by item or by id. */
  active?: GalleryItem | string;
  /** Shared with the caller so a reopened popup redraws from decoded thumbnails. */
  cache?: ThumbnailCache;
  /**
   * Where to open, in client coordinates. Defaults to `owner`'s own corner, which is wrong when
   * the control that was clicked is a raw DOM node rather than the widget being passed as owner.
   */
  at?: { x: number; y: number };
}

/**
 * Consumes the whole of a press, not just its `pointerdown`. A dismissing press that stopped
 * there would still deliver the rest of the gesture to the control underneath, and the browser
 * synthesises the mouse half of it separately.
 */
const REST_OF_PRESS = ["pointerup", "mousedown", "mouseup", "click"];

function swallowPress(press: Event): void {
  const stop = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const done = () => {
    for (const type of REST_OF_PRESS) {
      window.removeEventListener(type, consume, true);
    }
    window.removeEventListener("pointerdown", done, true);
  };
  const consume = (e: Event) => {
    stop(e);
    if (e.type === "click") {
      done();
    }
  };

  stop(press);
  for (const type of REST_OF_PRESS) {
    window.addEventListener(type, consume, true);
  }
  // a press released outside the window produces no click, so the next press clears these instead
  window.addEventListener("pointerdown", done, true);
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
    // eslint-disable-next-line prefer-const
    let popup: PopupContainer<CTX> | undefined;

    /**
     * Consumes the press that dismisses the popup, so it does not also reach what was underneath.
     * Closing stays `makePopup`'s job, through the "click" mode below. Both handlers sit on
     * window, and `stopPropagation` does not stop a sibling listener on the same node, so this
     * one has to be registered first to run first — closing removes it, and a listener removed
     * during a dispatch is not called.
     */
    const onPressOutside = (e: PointerEvent) => {
      if (popup !== undefined && !e.composedPath().includes(popup)) {
        swallowPress(e);
      }
    };
    window.addEventListener("pointerdown", onPressOutside, true);

    // Closed by a press outside but not by the pointer leaving, since the author reads the rest
    // of the screen while choosing. Listened for on window so the press is seen before the page
    // acts on it, which is what lets the handler above consume it.
    popup = owner.ctx.screen.popup(
      owner,
      args.at ? args.at.x : owner,
      args.at?.y,
      "click",
      undefined,
      window
    ) as unknown as PopupContainer<CTX>;

    let settled = false;
    const finish = (item: GalleryItem | undefined) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(item);
    };

    // every teardown path ends in remove(), Escape and the press-outside handler included
    const baseRemove = popup.remove.bind(popup);
    popup.remove = (...rest: Parameters<UIBase["remove"]>) => {
      window.removeEventListener("pointerdown", onPressOutside, true);
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
