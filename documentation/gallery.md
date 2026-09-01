# Asset gallery

`scripts/gallery/` holds a searchable, virtualized grid of thumbnails and the
pieces it is built from (`thumbnail_cache.ts`, `gallery_events.ts`,
`asset_thumb.ts`, `asset_gallery_grid.ts`, `asset_gallery.ts`,
`pick_asset_popup.ts`, re-exported from `index.ts`). Nothing in it knows
where the pixels come from: a host describes each entry with a `GalleryItem`
whose `image` is either a decoded source or a thunk that produces one.

- `AssetGallery` (`assetgallery-x`) — a search box above a grid. This is the
  widget to reach for.
- `AssetGalleryGrid` (`assetgallerygrid-x`) — the grid on its own, for a host
  that supplies its own filtering.
- `AssetThumb` (`assetthumb-x`) — one cell. Created by the grid, not by hosts.
- `ThumbnailCache` — decoded thumbnails shared across every gallery.
- `pickAssetPopup` — the grid in a popup with an OK/Cancel footer, resolving
  with what the user chose.

<!-- toc -->

- [Quick start](#quick-start)
- [Items](#items)
- [Selecting and confirming](#selecting-and-confirming)
- [Keyboard navigation](#keyboard-navigation)
- [The popup](#the-popup)
- [The thumbnail cache](#the-thumbnail-cache)
- [Virtualization](#virtualization)
- [Theming](#theming)
- [API reference](#api-reference)
<!-- regenerate with pnpm markdown-toc -->

<!-- tocstop -->

## Quick start

```ts
const gallery = UIBase.createElement<AssetGallery>("assetgallery-x");
container.add(gallery);

gallery.setItems(
  hashes.map((hash) => ({
    id   : hash,
    label: nameFor(hash),
    image: () => decodeThumbnail(hash),
  }))
);

gallery.addEventListener("confirm", (e) => {
  attach(e.selection.item!.id);
});
```

## Items

```ts
interface GalleryItem {
  id: string;
  image: ThumbSource | (() => Promise<ThumbSource>);
  label?: string;
  tooltip?: string;
  searchTags?: string[];
}
```

`id` is the identity the cache keys on, so two items with the same id share one
decode. `ThumbSource` is an `ImageBitmap`, an `HTMLImageElement` or an
`HTMLCanvasElement` — anything `drawImage` accepts.

Pass a thunk rather than a resolved image whenever the library is large:
decoding runs only when a cell is bound to the item, which for a few hundred
items means decoding the dozen or so on screen.

The search box matches a lowercased substring against `id`, `label` and each
entry of `searchTags`. `tooltip` is the hover text, falling back to `label` and
then to `id`.

## Selecting and confirming

Selection and choice are separate, and so are their events.

- `"change"` (`GalleryChangeEvent`) fires when the selection moves, by a single
  click or by an arrow key. `e.selection` is `{id, item}`.
- `"confirm"` (`GalleryConfirmEvent`) fires when an item is chosen: a
  double-click, Enter on the focused cell, or the popup's OK button.

A single click never confirms. A host that wants "click a thumbnail, see it
somewhere else" listens for `"change"` alone; a host that wants a chosen value
listens for `"confirm"`.

`gallery.active` is the selected item and survives being scrolled out of view
or filtered out by the search box.

## Keyboard navigation

Focus is an index into the item list rather than a DOM node, because which pool
cell holds an item changes on every scroll.

| Key | Effect |
| --- | --- |
| Arrow Left / Right | one cell |
| Arrow Up / Down | one row |
| Home / End | first / last item |
| PageUp / PageDown | one viewport of rows |
| Enter | confirm the focused cell |

Movement clamps at the grid edges rather than wrapping. The target row is
scrolled into view before the pool is rebound, so the focused index always
lands on a real cell.

Only the cell bound to the focus index carries `tabindex="0"`; every other cell
is `-1`. When a mouse scroll leaves the focused index outside the bound range
the grid itself takes the tab stop and hands focus back to the cell on
receiving it.

There is no type-ahead jump. The search box already filters by substring, and a
second gesture doing the same thing would only be a second way to do it.

## The popup

```ts
const item = await pickAssetPopup(button, { items, active: currentHash });
if (item !== undefined) {
  attach(item.id);
}
```

The popup resolves with the chosen item, or with `undefined` when the user
cancels — through the Cancel button, Escape, or pressing outside it. It does
not close on the first click inside, since selecting and then pressing OK is
the gesture it is built around.

Moving the pointer out is not dismissal, only a press is — `Screen.popup`'s
default `closeOnMouseOut` ends a popup on a mousemove outside as well, which
would close this one the moment the author looked at anything else.

The dismissing press is consumed rather than passed on, so it does not also
land on whatever was under the popup. Closing is `closeOnMouseOut: "click"`
with `closeEventSource` set to `window`; the gallery adds its own
`pointerdown` listener there beforehand, purely to stop the press going
further. It has to be registered first to run first, since closing removes it
and a listener removed during a dispatch is not called.

`active` accepts an item or an id. `cache` accepts a `ThumbnailCache` to share
with the rest of the host, so reopening the popup redraws from thumbnails that
are already decoded. `at` places the popup at client coordinates, which is what
a host whose clicked control is a raw DOM node rather than a widget needs — it
passes an enclosing widget as `owner` and the node's own rect as `at`.

## The thumbnail cache

`ThumbnailCache` maps an item id to a decoded thumbnail. One instance,
`sharedThumbnailCache`, is used unless a host assigns its own to
`gallery.cache`.

- `get(id, loader)` runs `loader` only when no entry and no other load already
  exist for that id, so a fast scroll asking twice decodes once.
- `peek(id)` returns a held thumbnail without starting a load, and marks it as
  most recently used. Cells paint through `peek`, never from a stored
  reference.
- Eviction is by entry count (`maxEntries`, default 200) and calls `close()` on
  an evicted `ImageBitmap`, which releases the decoded pixels at once. Because
  a closed bitmap cannot be drawn, nothing may hold a source across an await —
  read it back through `peek` on each paint.
- `ensureCapacity(n)` raises the bound without ever lowering it. The grid calls
  it with twice its pool size, so a thumbnail that is on screen is never the
  one evicted.

The cache holds decoded pixels, so a host decoding full-resolution images
should downscale in its loader. `createImageBitmap(blob, {resizeWidth: 256})`
does this at decode time.

## Virtualization

The grid keeps a fixed pool of `AssetThumb` cells, sized from the measured
viewport plus two overscan rows above and below, and rebinds them as it
scrolls. The DOM cost therefore follows the viewport rather than the item
count. A `ResizeObserver` re-columns and re-pools when the widget is resized.

Cells are real DOM elements rather than one big canvas, so hover, click and
tooltips all stay native.

`setItems` replaces the list. There is no data-path-backed mode: the known
consumers want a snapshot taken when the gallery opens rather than a live list.
Selection is single; there is no multi-select.

## Theming

Cells read the `assetthumb` style class and the grid reads `assetgallery`, both
declared through `static define().theme` with typed tokens.

| Class | Key | Purpose |
| --- | --- | --- |
| `assetthumb` | `background-color` | idle cell fill |
| `assetthumb` | `highlight` | mouseover fill |
| `assetthumb` | `active` | selected fill |
| `assetthumb` | `focusRing` | keyboard-focus outline, drawn as a ring so it stays visible on a cell that is also selected |
| `assetthumb` | `border` | `{color, width}` around the cell |
| `assetthumb` | `margin` | space between cells |
| `assetthumb` | `padding` | inset between the cell border and the image |
| `assetgallery` | `background-color` | fill behind the cells |
| `assetgallery` | `cellWidth` / `cellHeight` | cell size in CSS pixels |
| `assetgallery` | `overscanRows` | rows kept bound above and below the viewport |
| `assetgallery` | `width` / `height` | the outer widget's default grid size |

`border` is a structured sub-record rather than the flat `border-color` /
`border-width` pair the older style classes use.

## API reference

**`AssetGallery`** (`assetgallery-x`)

| Member | Description |
| --- | --- |
| `setItems(items)` | The items to offer, before filtering |
| `active` | The selected item, get or set |
| `setQuery(text)` | Filters as if the text had been typed into the search box |
| `cache` | The `ThumbnailCache` to draw through |
| `"change"` / `"confirm"` | Selection and choice events |

**`AssetGalleryGrid`** (`assetgallerygrid-x`)

| Member | Description |
| --- | --- |
| `setItems(items)` | The items to draw, in display order |
| `active` / `setActive(item, notify?)` | The selection, optionally silent |
| `focusIndex` / `setFocusIndex(i)` | The keyboard cursor |
| `columns` / `poolSize` / `itemCount` / `firstBoundIndex` | Layout state |

**`ThumbnailCache`**

| Member | Description |
| --- | --- |
| `get(id, loader)` | Decoded thumbnail, coalescing concurrent loads |
| `peek(id)` | Held thumbnail without loading |
| `delete(id)` / `clear()` | Drop entries and release their bitmaps |
| `maxEntries` / `ensureCapacity(n)` | The eviction bound |
