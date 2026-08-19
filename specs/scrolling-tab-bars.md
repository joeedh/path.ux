# Scrolling tab bars

The other half of [multiline tab bars](multiline-tab-bars.md). A bar that wraps keeps every
tab reachable by growing across the bar; a bar that does **not** wrap has to keep them
reachable some other way, because today it simply runs past its pane and whatever sits over
the edge is unreachable — including `AreaDocker`'s `+` tab, which is where an editor is
added from.

So: when `multiRow` is off, the bar scrolls along itself. Mouse wheel, right-click and
drag, or a two-finger swipe. **No scrollbar is drawn** — the affordance is the gesture, and
a 20-pixel-tall bar has nowhere to put a bar of its own.

The two features are exclusive by construction: wrapping and scrolling both answer "the
tabs do not fit", so a bar that wraps has nothing left to scroll, and `_scrollExtent()`
returns `undefined` the moment `multiRow` is on.

## The shape of the change

All of it is in `scripts/widgets/ui_tabs.ts`.

1. **A pure clamp**, `clampTabScroll(scroll, content, visible)`, exported and unit-tested in
   `tests/ui_tabs_scroll.test.ts`. Answers where an offset lands given how much there is and
   how much shows. A window bigger than the contents is no range rather than a backwards
   one, which is the case that would otherwise let a bar scroll itself blank.

2. **`TabBar` gains the scroll state**, all in device pixels, all derived in `_layout()`:

   - `scrollTabs = true` — the opt-out, matching `multiRow`'s shape.
   - `scrollPos` — the offset into the contents. Not `scroll`: that name is
     `HTMLElement.scroll()`, and a field cannot narrow a method.
   - `scrollContent` / `scrollVisible` — what there is and what shows, and
     `maxScroll = max(0, content - visible)` from them.
   - `setScroll(value)` clamps, and answers whether anything moved. Every gesture goes
     through it, so every gesture stops at both ends and none of them redraw for nothing.

3. **The canvas is the window, not the contents.** `_layout()`'s single-row branch already
   knew the full extent; it now reports `scrollVisible` as the extent instead, shifts every
   tab's along-axis position back by `scrollPos`, and lets the canvas edge do the clipping.
   That is the whole of "no scrollbar": there is no second element to draw one on, and the
   drawing code is untouched.

   The one tab exempt from the shift is a tab being dragged — `ModalTabMove` owns its
   position for the duration.

4. **Three gestures**, on the canvas:

   - `wheel`, non-passive, taking whichever of `deltaX`/`deltaY` the hardware reported the
     most of, because a trackpad spells sideways as one and a wheel spells it as the other
     and over a row of tabs both mean the same thing.
   - Right-press and drag, via pointer capture. `_startPan()` **declines** when
     `maxScroll === 0`, so a bar whose tabs all fit keeps the context menu it has today; on
     one that scrolls the menu is only deferred to `pointerup`, and a right-click that never
     travels further than `PAN_SLOP` still opens it.
   - `touchstart`/`touchmove` with exactly two touches, panning off their midpoint. A second
     finger cannot mean "move this tab", so it calls `_ensureNoModal()` and cancels a drag
     the first finger may have started.

5. **Nothing existing changes behaviour.** `maxExtent` is set by exactly one caller,
   `AreaDocker`, which also turns `multiRow` on — so every bar in the library either wraps
   or has no extent to scroll within, and `_scrollExtent()` returns `undefined` for both.
   The scrolling path is reached by turning `multiRow` off on a docker.

## Verified live

Driven over CDP against the VN desktop app (`pnpm vndesktop --mock`, `devicePixelRatio`
1.25), on a real `AreaDocker` bar carrying `Script | Branches | Tasks | +`.

Held at 120 CSS px of pane width with `multiRow` off, the bar reported `scrollContent`
288.46, `scrollVisible` 150 and `maxScroll` 138.46 device pixels, and sized its canvas to
150 × 26 against a `120px` CSS width — the window, not the contents.

- **Wheel.** `deltaY` 40 → `scrollPos` 50 (40 × dpi). 1000 → 138.46 and stops; a second
  1000 moves nothing and, notably, no longer calls `preventDefault`, so a bar at its end
  hands the gesture back rather than swallowing it. −1000 → 0, same on the way back.
  `deltaX` 60 scrolls the same 75, so a trackpad works.
- **Right-drag.** Press, −20, −20, +10 CSS px → 25, 50, 37.5 device px, tracking both
  directions; no `tabcontextmenu` fired, and `_pan` cleared on release.
- **The menu it defers.** On the scrolling bar `tabcontextmenu` fired 0 times on
  `pointerdown` and once on `pointerup`. On a sibling bar whose tabs fit (`maxScroll === 0`)
  it fired on `pointerdown` and not again on release — today's behaviour, unchanged.
- **Two-finger swipe.** With a stand-in `tool` in place, `touchstart` with two touches
  called `finish()` on it once and cleared it, then −20, −40, +30 CSS px of midpoint travel
  gave 25, 75, 37.5. `touchend` cleared `_swipe`; a one-finger `touchstart`/`touchmove`
  moved nothing.
- **No scrollbar.** The canvas read back at `scrollPos` 60 shows `Script` cut off at the
  left edge, `Branches` whole, `Tasks` clipped by the right edge, and nothing else — no
  track, no thumb, no arrows.

Restoring `multiRow` and the docker's own `updateMaxExtent` put the bar back to
`maxExtent` 282, `maxScroll` 0, one row.
