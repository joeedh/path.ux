# Multiline tab bars

Wrap a tab bar's tabs onto additional rows when they do not fit the extent available to
the bar — width for a horizontal bar, height for a vertical one — so every tab stays
reachable without scrolling. Opt-in, off by default, switched on for the screen-area tab
bar (`AreaDocker`).

## Plan (v1)

### Where the tabs are placed today

`TabBar._layout()` (`scripts/widgets/ui_tabs.ts`) walks `this.tabs` once and lays them out
along a single line:

- `axis = this.horiz ? 0 : 1` is the _along-bar_ axis; `axis ^ 1` is the _cross_ axis.
- `x` starts at `pad` and accumulates `w + pad * 2` per tab; the cross coordinate `y` is
  the constant `0.0`, and every tab's cross size is the single row thickness `h`.
- At the end it sizes the canvas to the content: `canvas.style.width = x + "px"` /
  `canvas.style.height = h + "px"` (swapped when vertical). Nothing clips; the bar simply
  grows past its pane and is cut off by whatever is above it.

So there is no notion of an available extent at all today. Adding one is the whole feature.

### The shape of the change

1. **A pure row-breaking function**, `layoutTabRows()`, exported from `ui_tabs.ts`:
   takes the per-tab along-axis sizes, the available extent and the pad, and returns a row
   index and an along-axis offset per tab plus the row count and the used extent. Greedy
   first-fit: start a new row when the next tab would cross `available`, never break a row
   that is still empty (so one over-wide tab overflows its own row rather than looping).
   Unit-tested in `tests/`.

2. **`TabBar` gains two properties**:

   - `multiRow = false` — the opt-in switch.
   - `maxExtent: number | undefined` — the extent, in CSS pixels, the tabs must fit into.
     Wrapping happens only when `multiRow` is on _and_ `maxExtent` is a positive finite
     number, so a bar that opts in without supplying an extent behaves exactly as today.
     `TabBar` also records `rowCount` and each `TabItem` records its `row`.

3. **`TabBar._layout()`** calls `layoutTabRows()` when wrapping is live, writes
   `tab.pos[axis] = offset` and `tab.pos[axis ^ 1] = row * h`, and sizes the canvas to
   `usedExtent` along the bar and `rowCount * h` across it. When wrapping is off it keeps
   the existing single-line code path verbatim.

4. **`TabContainer`** forwards `multiRow` / `maxExtent` to `this.tbar` as getters/setters,
   so consumers that hold the container (everyone) do not have to reach through to the bar.

5. **`AreaDocker`** switches it on in `rebuild()` and feeds `maxExtent` from the owning
   `ScreenArea`'s width each `update()`.

### What stays the same

- Serialization. `TabBar.saveData()` writes `taborder` + `active`; `TabContainer.saveData()`
  writes per-tab `saveUIData` blobs. Neither is touched, and `multiRow` / `maxExtent` are
  plain runtime properties rather than attributes, so nothing about wrapping reaches a saved
  layout or `ScreenArea.switcherData`.
- Every existing caller of `Container.tabs()` (`ui_colorpicker2`, `dock_panels`
  `_buildTabStack`, `simple/editor`, `xmlpage`, `dragbox`) gets `multiRow === false` and
  the untouched single-line path.
- The `TabItem` phantom-DOM protocol, `closeRect`, `tab.extra` / `tab.dom`, `swapTabs`,
  `setActive`, `loadData`/`saveData`, the tooltip plumbing, and the theme keys.

---

## Pressure test

Re-reading `_layout`, `_redraw`, `_doelement`, `ModalTabMove._on_move` and `update()`
against the plan turned up seven places where v1 is wrong or incomplete. Five of them
invalidate parts of the plan above.

### 1. `y = 0` is baked into the drawing code, not just the layout — **invalidates v1 step 3**

v1 said "write `tab.pos[axis ^ 1] = row * h`" as if `_redraw` would follow. It will not.
`_redraw` reads `tab.pos`, but in several places it then uses the tab's _size_ as if it
were an absolute edge, which is only true while the cross origin is zero:

- Active-tab outline, horizontal branch: `g.moveTo(x - r, h)`, `g.lineTo(x, r2)`,
  `g.quadraticCurveTo(x, ypad, …)` — `h` here is `tab.size[1] + 2` used as the _bottom_ y,
  and `ypad` (2) as the _top_ y. Both need `+ y`.
- Active-tab outline, vertical branch: the same with `w` as the right edge and `ypad` as
  the left edge; both need `+ x`.
- Inactive separator: `g.moveTo(x + w, h - 5); g.lineTo(x + w, 5)` — same bug, needs `+ y`
  (and `+ x` on the vertical branch).

### 2. The vertical-bar text transform silently depends on the cross origin being zero — **invalidates v1 step 3**

For a vertical bar `_redraw` rotates the text 90°:

```ts
const x3 = 0;
const y3 = y2;
g.translate(x3, y3);
g.rotate(Math.PI / 2);
g.translate(x3 - tsize, -y3 - tsize * 0.5);
```

`x3` is a dead constant today, and the active-tab branch spells the second translate
`-x3 - tsize` while the inactive branch spells it `x3 - tsize` — indistinguishable at
`x3 === 0`. Working the composition through, a point `(px, py)` lands at
`(tsize * 0.5 + x3, px + py - tsize + …)`, so `x3` _is_ the cross offset the rows need.
Multi-row vertical bars therefore need `x3 = x` **and** the sign in the active branch
corrected to `x3 - tsize` to match the inactive one.

Worse, `x2` — the along-axis text centring — is computed as
`x + (tab.size[horiz ^ 1] - tw) * 0.5`. For a horizontal bar `x` is the along position and
that is right. For a vertical bar `x` is the _cross_ position, and the along position
arrives separately through `y2`; the term is only harmless because `x` is zero. With rows
it double-counts. The additive term must become `this.horiz ? x : 0`.

The icon draw has the same defect: `iconmanager.canvasDraw(…, x + paddingRight, y, …)` sits
_inside_ the rotated frame on a vertical bar, so its `x` must also become
`this.horiz ? x : 0`.

### 3. Hit-testing is one-dimensional — **invalidates v1's "what stays the same"**

`TabBar._doelement()` tests only the along-bar axis:

```ts
ok = this.horiz ? (mx >= tab.pos[0] && mx <= tab.pos[0] + tab.size[0]) : (my >= …);
```

With one row the cross axis is the whole canvas so this is equivalent to a rectangle test.
With several rows every row overlaps in the along-bar range and the _last_ matching tab
wins (the loop does not break), so the bottom row would swallow every click. A rectangle
test is required — but only when the bar is actually wrapped, because
`canvas.height = ~~(~~h / dpi * dpi)` can round a pixel below `h` and a strict `my <= h`
test could start rejecting a hit that lands today. Gate the 2D test on `rowCount > 1`.

`_findCloseHit` is already a rectangle test against `closeRect`, and `closeRect` is derived
from `tab.pos`, so it needs no change.

### 4. Dragging breaks in two separate ways — **invalidates v1's "what stays the same"**

`ModalTabMove._on_move`:

- It moves the dragged tab along **one** axis only (`tab.pos[0] += dx` for a horizontal
  bar). With rows the tab can never visually reach another row.
- The detach test is `disty > limit * 1.5` where `disty` is the perpendicular travel and
  `limit` is 50 device pixels. A three-row bar is taller than 75 device pixels, so simply
  dragging a tab to the bottom row would detach the editor into a floating area. The
  perpendicular limit has to grow with the bar's cross extent.
- The reorder rule compares `tab.pos[axis]` against the _array_ neighbours' `pos[axis]`.
  Across rows those positions restart at `pad`, so the comparison is meaningless: the first
  tab of row 2 sits at a smaller along-position than the last tab of row 1 and the two
  would swap forever.

Replacement for the wrapped case: move both axes, and swap with whatever tab the _pointer_
is over (excluding the dragged tab, which is skipped by `_layout` while `tool` is set).
Using the pointer rather than the dragged tab's centre is what makes it stable — after a
swap the target moves into the dragged tab's old slot, which is not under the pointer, so
no second swap fires until the pointer crosses another tab.

### 5. A resize does not re-layout — **invalidates v1 step 5**

v1 assumed feeding `maxExtent` each frame is enough. It is not. `TabBar.update()` only
calls `_layout()` when the bar's _position_ changes:

```ts
const key = Math.floor(rect.x * 4.0) + ":" + Math.floor(rect.y * 4.0);
if (key !== this._last_p_key) { … this._layout(); }
```

Widening a pane from its right edge moves nothing on the left, so `rect.x`/`rect.y` are
unchanged and the bar would keep its stale row count until something else forced a redraw.
`maxExtent` (and `multiRow`) must be part of that key.

### 6. Measuring the available extent from the bar's own ancestors oscillates

`TabContainer._remakeStyle()` emits `align-self: flex-start` for both `._tab_<id>` and
`._tbar_<id>`, and `TabContainer` itself is `display: flex` with no width. So every
ancestor of the canvas shrink-wraps _to the canvas_. A "measure my parent" default would
read the width the bar just chose, wrap, shrink, un-wrap, and flip forever.

Consequence: there is no safe generic default, so v1's implicit hope of one is dropped.
`maxExtent` is required, and the extent must come from something that does not depend on
the bar's size. For `AreaDocker` that is the owning `ScreenArea`'s client rect right edge
minus the docker's own left edge — the docker is `_prepend`ed into the switcher row, so its
`x` is the row's start and does not move when the bar resizes.

### 7. The example app's own tab bars are the regression surface

`dock_panels._buildTabStack` sets `flex-grow`, `align-self: stretch` and `min-width: 0` on
its `TabContainer` with `!important`. That container's bar is therefore _not_ shrink-wrapped
— but it also never sets `multiRow`, so it stays on the untouched path. Noted so the
single-line path is kept byte-for-byte rather than "improved".

### Things the pressure test cleared

- **Serialization is genuinely untouched.** `saveUIData` walks `saveData()` results, not
  attributes; `TabBar.saveData` is `{taborder, active}` and `TabContainer.saveData` is a
  map of per-tab blobs. `ScreenArea.switcherData` is one of those strings. Runtime
  properties never reach it. `Area.STRUCT`'s `panelLayout` is `dock_panels`' own state and
  has no tab-bar geometry in it.
- **`ScreenArea.getBarHeight()`** measures `header.getClientRects()[0].height` live, so a
  taller header from a second row is picked up with no change.
- **`AreaDocker.update()`'s `+`-tab reshuffle** (`swapTabs(addicon, last)`) is order-only
  and row-agnostic.
- **`TabItem.setCSS()`** already positions the phantom focus/DOM element from `pos` and
  `size` absolutely, so rows come for free.
- **`tab.extra` / `tab.dom`** positioning also reads `pos` directly.

---

## Revised plan

1. `layoutTabRows()` in `scripts/widgets/ui_tabs.ts` — exported pure function, greedy
   first-fit, returns `{rows, offsets, rowCount, extent}`. Never breaks an empty row.
   Tested in `tests/ui_tabs_multirow.test.ts`.

2. `TabItem` gains `row = 0`.

3. `TabBar` gains `multiRow = false`, `maxExtent: number | undefined`, `rowCount = 1`, and
   a private `_wrapExtent()` returning the device-pixel extent to wrap into, or `undefined`
   when wrapping is off. Also `tabAt(x, y, exclude?)`, a rectangle hit-test used by both the
   wrapped pointer path and the drag.

4. `TabBar._layout()` — after the existing sizing loop (which already computes each tab's
   along-axis size), place the tabs either through `layoutTabRows()` or through the existing
   running-`x` loop. Canvas sizing becomes `usedExtent` × `rowCount * h`.

5. `TabBar._redraw()` — offset every cross-axis literal by the tab's cross position
   (findings 1 and 2), and skip the separator stroke at the end of a row.

6. `TabBar._doelement()` — rectangle test when `rowCount > 1`, and `break` on a hit.

7. `TabBar.update()` — fold `multiRow` and `maxExtent` into `_last_p_key` (finding 5).

8. `ModalTabMove._on_move()` — when the bar is wrapped: move both axes, scale the
   perpendicular detach limit by the bar's cross extent, and reorder by pointer hit-test
   (finding 4). Otherwise unchanged.

9. `TabContainer` — `multiRow` / `maxExtent` accessors forwarding to `tbar`.

10. `AreaDocker` — `tabs.multiRow = true` in `rebuild()`; in `update()`, set
    `maxExtent` from `screenAreaRect.right - dockerRect.x` (finding 6).

### Still true after the pressure test

Everything under "What stays the same" in v1 except the two entries findings 3 and 4
invalidated — hit-testing and dragging _do_ change, but only inside a
`rowCount > 1` branch, so an un-wrapped bar still runs the original code.

---

## As implemented

One deliberate departure from step 5 above.

Finding 2 prescribed setting `x3 = x` in the rotated text frame and fixing the sign
mismatch between the two branches. Doing it that way turns out to double-count the row
offset: `translate(x3, y3)` and `translate(x3 - tsize, …)` both carry `x3`, so a point
lands at `screenY = px + x + py` rather than `px + py`. Getting the composition right
would have meant rewriting a transform whose correctness is hard to read off the page.

What shipped instead is an extra `g.translate(x, 0)` in front of the existing chain, with
`x3` left as the dead `0` it already was. The row offset is then applied once, outside the
rotation, and — because `x` is zero for every single-row bar — the emitted transform is
provably identical to today's for the untouched path. The same trick covers finding 1: the
active-tab outline and the inactive separator are wrapped in
`g.save(); g.translate(horiz ? 0 : x, horiz ? y : 0); … g.restore()` and keep their
original literals, rather than having `+ y` / `+ x` threaded through a dozen curve
control points.

The sign mismatch between the two branches (`x3 - tsize` versus `-x3 - tsize`) is left
alone: with `x3` pinned at zero the two spellings are the same instruction, and changing
one of them would be an unverifiable edit to code the feature no longer depends on.

---

## Verified live

Driven over CDP against `pnpm electron` (the `example/` app, `devicePixelRatio` 1.25).

The right-hand pane was given every editor its `+` menu offered — Workspace, Properties,
Event Graph, Docs Browser — through the real `AreaDocker.addTabMenu` → `switchEditor`
path, not by poking tabs into the bar. At 403 CSS px of pane width the five tabs (the `+`
tab included) came to more than one row could hold, and the bar reported `rowCount === 2`,
canvas height `22.4px` → `45.6px`, with `Docs Browser` and `+` placed on row 1 at cross
offset `28.75`. The switcher row grew with it rather than clipping.

Setting `multiRow = false` on that same bar and re-laying it out put all five tabs back on
one line and the canvas back to a single row's height — at which point `Docs Browser` is
cut off by the pane edge and `+` is off-screen entirely. That is the old behaviour, intact.

Clicking the row-1 `Docs Browser` tab at its CSS-pixel centre switched the pane to the
Docs Browser editor and moved the active-tab frame down to row 1, which is finding 3's
rectangle hit-test and the row-aware outline both working.

The vertical path was exercised on the Properties editor's own tab bar (`simple/editor`'s
`this.tabs("left")`), which ships with the feature off — it reported `multiRow === false`
and `maxExtent === undefined`, confirming an existing caller is untouched. Forcing
`multiRow = true, maxExtent = 220` on it wrapped its six tabs into four columns, with the
rotated labels, the active-tab frame and the `Curve Mapping | ListBox` separator each
landing in the correct column.

Not verified live: tab dragging across rows. The modal drag needs a sustained pointer
gesture the CDP helpers here do not express, so the `ModalTabMove` changes rest on reading
rather than on a demonstrated drag.
