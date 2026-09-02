# Gallery list mode

Adds a second layout to `scripts/gallery/`: one item per full-width row, thumbnail on the
left and a client-filled box on the right. The box defaults to the item's name, word-wrapped.
A segmented toggle at the right end of the search row switches between grid and list.

Status: implemented. Two things changed during the work and are marked below: the bare-function
shorthand for a renderer was dropped, and `rowFont` moved to the `assetthumb` style class.

<!-- toc -->
<!-- tocstop -->

## Why a second layout

- A grid cell is 96×96 and carries no text, so an item is identified by its thumbnail alone.
  Generated assets look alike; their names are what tells them apart.
- A grid cell has no room for anything else either — a date, a size, a "used in 3 shots"
  count, a mute toggle. Hosts that want any of that currently have to build their own list.
- Row mode gives the host a rectangle and no opinion about what goes in it.

## The mode

```ts
export type GalleryMode = "grid" | "list";
```

- `"grid"` is the existing layout and stays the default.
- `"list"` is one column of full-width rows. Row height comes from the theme
  (`assetgallery.rowHeight`, default 64); row width is the viewport width less the margin.
- The thumbnail occupies a leading square of the row's height. The box occupies the rest.
- Everything else is unchanged: same pool, same overscan, same cache, same events, same
  selection and focus model.

## The callback interface

The constraint that shapes this: cells are pooled and rebound as the grid scrolls, so the
callback cannot be "build DOM for this item". It is a bind protocol over a reused element.

```ts
/** The element a row renderer fills, and the state of the row it belongs to. */
export interface GalleryRowBox {
  /** The element to fill. Empty when `create` runs, reused for every item afterwards. */
  dom: HTMLDivElement;
  /** Index into the gallery's item list, or -1 while the row sits past the last item. */
  index: number;
  /** Whether the row is the gallery's selection. */
  active: boolean;
  /** Whether the keyboard cursor is on the row. */
  focused: boolean;
  /** Box size in CSS pixels, excluding the thumbnail square. */
  width: number;
  height: number;
}

/** Fills the box beside a thumbnail in list mode. */
export interface GalleryRowRenderer {
  /** Builds the reusable content once per pooled row, before any item reaches it. */
  create?(box: GalleryRowBox): void;
  /**
   * Points the box at `item`, or empties it when `item` is undefined. Called whenever the
   * row's item, selection or keyboard focus changes, so it must be cheap and must not
   * accumulate state across calls.
   */
  bind(box: GalleryRowBox, item: GalleryItem | undefined): void;
  /** Releases anything `create` allocated, when the pooled row is discarded. */
  destroy?(box: GalleryRowBox): void;
}

```

**Changed during the work:** the plan also offered a bare `bind` function as shorthand, with
the property typed `GalleryRowRenderer | GalleryRowBind`. That union breaks contextual typing
of an inline object literal — TypeScript infers `any` for `bind`'s parameters, which is the
common case rather than the rare one. The shorthand is gone; `{ bind: fn }` covers it.

### Why this shape

- **`create` is separate from `bind`** because the expensive half — making elements, wiring
  listeners — is per pool cell, and the pool is the size of the viewport. A renderer that
  builds three spans in `create` and writes three strings in `bind` costs one DOM build per
  visible row for the whole life of the gallery, not one per item scrolled past.
- **`bind` takes `undefined`** rather than the row being hidden, so a renderer holding a
  subscription or an object URL is told to drop it. Rows past the last item are also
  `display: none`, so a renderer that ignores the `undefined` case is merely wasteful.
- **`bind` also runs on selection and focus changes**, so a renderer can restyle its text
  against the selected row's fill without a second callback. It is one rule rather than a
  `bind`/`restyle` pair, and the call count is bounded by the pool size.
- **State is passed in the box, not read off the cell.** The renderer never sees `AssetThumb`,
  so pooling, the cache and the bind generation stay private.
- **The box is a plain `HTMLDivElement`**, not a path.ux `Container`. Word wrap, text
  selection and `title` come free from the browser, and a host that wants widgets can create
  a container into the div itself.

### The default renderer

`defaultRowRenderer` writes `item.label ?? item.id` into the box, using
`assetgallery.rowFont` for the face and `overflow-wrap: anywhere` so a long hyphenless asset
name wraps rather than clipping. It is what a gallery uses when the host sets no renderer.

### Rejected alternatives

- **A paint callback onto the row's canvas.** Cheapest to recycle, but word wrap would have
  to be reimplemented, and a host wanting a checkbox or a link gets nothing.
- **One `render(box, item)` function with no `create`.** Simpler signature, but every host
  doing non-trivial content ends up caching built nodes on the element behind the library's
  back, which is the same protocol written worse.
- **A `key`-based reconciler.** More machinery than a gallery row needs; the pool already
  provides the identity `create`/`bind` needs.

## Switching modes

A two-button segmented toggle at the right end of the search row, so it costs no vertical
space and sits where the same control sits in a file browser.

```
grid                                        list
┌────────────────────────────────┐          ┌────────────────────────────────┐
│ [Search…              ] [▦][≡] │          │ [Search…              ] [▦][≡] │
├────────────────────────────────┤          ├────────────────────────────────┤
│ ┌────┐┌────┐┌────┐┌────┐       │          │ ┌────┬───────────────────────┐ │
│ │    ││    ││    ││    │       │          │ │ ▨  │ kaya_school_uniform_  │ │
│ └────┘└────┘└────┘└────┘       │          │ │    │ front_neutral         │ │
│ ┌────┐┌────┐┌────┐┌────┐       │          │ └────┴───────────────────────┘ │
│ │    ││    ││    ││    │       │          │ ┌────┬───────────────────────┐ │
│ └────┘└────┘└────┘└────┘       │          │ │ ▨  │ kaya_school_uniform_  │ │
│                                │          │ │    │ three_quarter_smile   │ │
└────────────────────────────────┘          │ └────┴───────────────────────┘ │
                                            └────────────────────────────────┘
```

- Both buttons are always visible; the current mode's button is drawn depressed. A single
  button that toggles would hide which mode is available.
- 22×22 CSS pixels each, abutting, at the right of the search row. The search box stretches.
- Tooltips: "Show the assets as a grid of thumbnails" and "Show the assets as rows, with a
  name beside each thumbnail". Naming the result, not the mode.
- Keyboard: each button is a tab stop; Enter or Space activates it.
- `showModeToggle = false` hides the pair, for a host that drives `mode` from its own control.

### The icons

path.ux icons come from an app-supplied sprite sheet, and the gallery cannot add tiles to a
sheet it does not own. So the two glyphs are drawn in code, on the button's own canvas, the
way `AssetThumb` already draws. That keeps them crisp at any DPI, recolored live by the
theme, and free of any load step.

Both are drawn on a 16-unit grid and scaled to the button.

- **Grid** — four 6×6 rounded squares at (1,1), (9,1), (1,9), (9,9), corner radius 1.5.
  Four rather than nine, because a 3×3 of squares turns to mush at 16 pixels.
- **List** — two stacked rows, each a 6×6 rounded square at x=1 followed by two horizontal
  1.5-thick rounded lines: 6 units long at the square's top, 4 units long below it. The
  glyph is a miniature of the layout it produces, down to the second line being shorter,
  which is what a wrapped name looks like.

Glyph color is `DefaultText`'s color from the theme. The buttons take the existing
`iconbutton` style class rather than a new one, so an app that has themed its icon buttons
gets a toggle that matches without doing anything.

## Widgets and files

| File | Change |
| --- | --- |
| `gallery_row.ts` (new) | `GalleryRowBox`, `GalleryRowRenderer`, `defaultRowRenderer` |
| `gallery_mode_button.ts` (new) | `GalleryModeButton` (`gallerymodebutton-x`), canvas glyphs |
| `asset_thumb.ts` | `mode`, a leading image square in list mode, the box element |
| `asset_gallery_grid.ts` | mode-aware `measure`, pool teardown on mode change, `rowRenderer` |
| `asset_gallery.ts` | search row becomes a row, `mode`, `rowRenderer`, `showModeToggle` |
| `pick_asset_popup.ts` | `PickAssetArgs.mode`, and a sticky last-used mode |
| `index.ts` | re-export the two new modules |

- The cell keeps one canvas painting the whole row — fill, border, focus ring — with the
  image letterboxed into the leading square. The box is a transparent absolutely-positioned
  div over the rest, so hover, selection and focus visuals need no new code.
- Changing mode discards the pool and rebuilds it, since cell size and cell shape both
  change. Selection and the focus index survive; scroll position does not.
- `AssetGallery` gains `saveData`/`loadData` so the mode rides the existing `saveUIData`
  path rather than needing an event.

## Theme additions

| Class | Key | Purpose |
| --- | --- | --- |
| `assetgallery` | `rowHeight` | list-mode row height in CSS pixels (default 64) |
| `assetthumb` | `boxPadding` | inset between the thumbnail square and the box (default 6) |
| `assetthumb` | `rowFont` | face the default renderer writes the name in |

No new style class. `GalleryModeButton` reads `iconbutton`.

**Changed during the work:** `rowFont` was to sit on `assetgallery`, but the cell reads it and
`getDefault` searches the reader's own style class. It is on `assetthumb`.

`GalleryModeButton` also flips its glyph to white where the resolved fill is too dark to read
the theme's text color against. Themes give the depressed state a dark fill without giving it a
text color, so the glyph would otherwise vanish exactly when its mode is the one in use.

## Tests

- `playwright/gallery.spec.ts`: list mode lays out one column; the pool still tracks the
  viewport; a custom renderer's `create` runs once per pool cell while `bind` runs per
  scrolled item; toggling modes preserves the selection.
- A screenshot beside `gallery-grid.png` for list mode and for the toggle.

## Settled questions

- **Pointer events on the box.** The box is `pointer-events: none`, so a press anywhere
  across the row selects it, and a renderer opts its own controls back in. Said on
  `GalleryRowBox.dom`, where a renderer author reads it.
- **A theme-drawn subtitle line.** Not added. One wrapped name plus the callback is enough.
- **Vertical alignment.** The box is a centred flex column rather than a plain block, so a
  one-line name sits against the middle of the thumbnail instead of its top edge. A column
  rather than a row, so content still stacks the way a renderer would expect.
