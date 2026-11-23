# Widget build performance

Building many widgets at once is slow. In implicit-explorer, the first node-editor sync
after building a 60-node graph blocks the main thread for 3.4–4 s. This plan removes the
largest measured costs, one stage at a time.

## Status

| Stage | What                                               | Status                   |
| ----- | -------------------------------------------------- | ------------------------ |
| 0     | Benchmark                                          | done                     |
| –     | Canvas text through a detached scratch canvas      | tried, no gain, reverted |
| 1     | Shared stylesheets instead of per-widget `<style>` | shelved (see below)      |
| 2     | Draw a widget's canvas only once it is styled      | done: −32%               |
| 3     | Small fixes, each kept only if it helps            | done: −9% more           |
| 4     | Sliders built and thrown away by `VectorPanel`     | done: −17% more          |

## Benchmark (stage 0)

- `tools/bench_graph_sync.mjs` in implicit-explorer, over CDP. It reloads the page once,
  waits for the renderer to go idle, discards one warm-up run, then times each run:
  `graphChanged()` on a freshly built 60-node graph, plus the next 30 animation frames. The
  render views are detached during each run.
- Within one page load, runs agree within a few percent. Compare builds by alternating them.
- Early runs with a first version of the harness saw some page loads take about 8 s instead
  of 3.4 s, for both builds. This couldn't be reproduced later (five loads in a row all took
  3.2–4.4 s, with identical page state) and may have been load from other processes.
- The machine's speed differs between sessions, and sometimes doubles the time of every build
  for a few minutes (1.4 s became 2.9 s, with and without the `isMobile` cache). Only compare
  builds alternated in one session.

Each row is the median of 4 runs; each build was measured in two rounds, alternating with
the others.

| Build               | Round 1 | Round 2 |
| ------------------- | ------- | ------- |
| master (`770c72fe`) | 3.49 s  | 3.38 s  |
| stage 2             | 2.40 s  | 2.33 s  |
| stages 2 and 3      | 2.15 s  | 2.10 s  |
| stages 2, 3 and 4   | 1.80 s  | 1.80 s  |

The last row comes from a later session, measured against a stages 2 and 3 build at 2.25 s
and 2.13 s, so it can't be compared with the rows above it.

The whole branch against master, alternated in one session (median of 5 runs per round). "With
cache" adds the `isMobile` cache, which was later dropped (see stage 3). These builds were
measured before the branch was rebased; the rebase only moved the submodule pointer.

| Build                          | Round 1 | Round 2 | Round 3 | Round 4 |
| ------------------------------ | ------- | ------- | ------- | ------- |
| master (`770c72fe`)            | 3.37 s  | 3.52 s  | 3.17 s  | 3.52 s  |
| branch, with cache             | 1.45 s  | 1.40 s  | 1.38 s  | 1.42 s  |
| branch, without cache (merged) | 1.47 s  | 1.50 s  | 1.43 s  | 1.47 s  |

Without the cache, about 3.4 s to 1.5 s (−57%).

Stage 3 broken down, each on top of stage 2 (a separate session, so the baseline differs
slightly):

| Build                                                      | Round 1 | Round 2 |
| ---------------------------------------------------------- | ------- | ------- |
| stage 2                                                    | 2.40 s  | 2.41 s  |
| + forced-work fixes (tooltips, `NodeFrame`, `g.font = ""`) | 2.29 s  | 2.27 s  |
| + JavaScript fixes (`isMobile`, `getStyleRecord`)          | 2.28 s  | 2.28 s  |
| + all five                                                 | 2.15 s  | 2.22 s  |

No single fix showed a gain beyond the noise on its own (about ±4%), except perhaps
`isMobile` (2.25 s). The forced-work fixes only pay together, as expected: the first forced
layout or style read in a dirty frame pays, so removing one site does nothing while another
remains.

## What the time goes to

Measured in implicit-explorer (NW.js, Chromium 152) on 2026-11-22. The page has about
12,100 elements counting shadow trees, and 8,262 of them are `<style>` elements.

- **Style updates.** A timeline trace of one sync recorded 986 style updates taking 1.27 s.
  1.02 s of that was `Document::updateActiveStyle`, which rebuilds the set of active
  stylesheets; the sync processed 19,872 `<style>` elements.
- **Every widget adds three `<style>` elements to its shadow root**, with the same content in
  every widget: the `:host([hidden])` rule (`ui_base_init.ts:55`), the `.DefaultText` font
  rule (`ui_base_init.ts:105`), and `_screenStyleTag`, which `FrameManager.update_intern`
  fills with the screen's global CSS (scrollbars). Containers add a fourth,
  `div.containerx` (`ui.ts:334`, `ui.ts:544`), in one of a handful of variants.
  - Converting the existing 8,249 tags on the page into 50 shared constructable sheets
    (`adoptedStyleSheets`) made one full style recalc 29% cheaper (19.5 ms to 13.9 ms).
- **Drawing on a canvas that has never been styled forces a style update.** `drawImage`,
  `fillText` and setting `font` on a canvas that was inserted in the current task and has no
  computed style yet each cost about 20 ms. `fillRect` and paths don't. Sliders are redrawn
  about 15 times each while they are built, from 14 call sites, all before the frame's first
  style pass.
  - Skipping slider redraws during the sync and redrawing each slider once after the next
    frame cut a sync from 3.4–4.0 s to 2.2–2.9 s.
- **Canvas text on a styled canvas also forces a recalc when styles are dirty.** Setting
  `font` (any value, including `""`), `fillText`, `measureText` and reading `direction` do;
  reading `font`, `textAlign`, `getTransform()` and setting `fillStyle` don't.

## The approach that didn't work: a scratch canvas for text

- The first version of this plan drew text on a detached canvas and copied it onto the
  widget's canvas with `drawImage`, to avoid the text calls' forced recalc. Text calls on a
  detached canvas are free, and the copied pixels were identical to a direct `fillText`.
- It made no difference: 3.5–4.6 s against master's 3.7–4.1 s, with or without deferred
  redraws. The trace showed `drawImage` itself forcing 700 style updates (1.5 s), because the
  target canvases had never been styled. The real problem is drawing before the first style
  pass, which stage 2 addresses directly. The change was reverted.

## Stage 1: shared stylesheets (shelved)

Shelved after the second pressure test:

- Adopted sheets don't remove the per-root cost. Assigning `adoptedStyleSheets` marks a
  scope dirty just as a `<style>` does, and a recalc's cost grows with the number of roots
  that have any sheet. In a simulation, stage 1 gained about 6% alone and about 5% on top of
  stage 2.
- Two of the four tags match nothing: no element has class `DefaultText`, and
  `div.containerx` in a container's shadow root can't match the container host it is meant
  for. About 3,400 tags on the page are dead CSS.
- Removing any of these tags shifts the indices that saved UI state uses to find widgets
  (`ui_savedata.ts:65-70`, `ui_save.ts:149-166`), which apps store in their files. It needs
  a `_ui_version` migration first. That's a separate change, with the dead tags as its
  first target.

The original design follows, for reference.

Replace the per-widget `<style>` elements with constructable stylesheets that every shadow
root adopts, so Blink parses each distinct sheet once and shares it.

- **A sheet cache keyed by CSS text:** `sharedSheet(cssText)` returns the one
  `CSSStyleSheet` for that text, creating it with `replaceSync` on first use. Keep it bounded
  (for example 256 entries, least recently used first out). Evicting an entry that widgets
  still adopt is harmless: they keep their reference, and only future lookups create a new
  object.
- **Each widget's shadow root adopts named slots**, held on the widget: `hidden`, `font`
  (the `.DefaultText` rule), `screen` (what `_screenStyleTag` holds today) and, for
  containers, `container`. Setting a slot swaps that one sheet and rebuilds the root's
  `adoptedStyleSheets` from the slots, keeping any sheets other code adopted.
- **Call sites:**
  - `initUIBase` sets `hidden` and `font` instead of appending two `<style>` elements.
  - `FrameManager.update_intern` sets each widget's `screen` slot where it now writes
    `_screenStyleTag.textContent`, keyed by the same hash.
  - Container's `setCSS` sets `container` where it now writes `styletag.textContent`.
- **Compatibility:** `_screenStyleTag` and Container's `styletag` stay as properties for
  code that reads them, but are no longer in the shadow root. Check every reader first.
  Where constructable stylesheets or `adoptedStyleSheets` are missing, fall back to the
  current `<style>` elements.
- **Order:** adopted sheets apply after a shadow root's `<style>` elements. These sheets
  only set properties that the widget's own `<style>` elements don't, but check for
  conflicts (any `<style>` in a widget shadow root that targets `.DefaultText`,
  `div.containerx`, `:host([hidden])` or scrollbars).
- **Tests:** a widget's shadow root has no `<style>` elements from these sources, two widgets
  share the same sheet objects, a theme change that alters the font or screen CSS reaches
  existing widgets, and `hidden` still hides.

## Stage 2: draw a widget's canvas only once it is styled

- `_redraw` still does its sizing work (`setCSS`), which measures text on the detached
  measure canvas and costs nothing. Then, if the slider's canvas is connected but hasn't had
  a non-zero layout yet, it marks a draw pending instead of drawing.
- A shared `ResizeObserver` watches the canvas. A callback with a non-zero `contentRect`
  marks it ready and draws any pending redraw, with each draw in a try/catch so one failure
  doesn't leave the rest blank. The callback draws without calling `setCSS`, so it doesn't
  resize anything and can't loop.
- Chromium sends an initial 0×0 callback for hidden, detached and zero-sized targets, so
  readiness requires a non-zero size. A later 0×0 callback (the slider was hidden) re-arms
  the deferral, so a hidden slider doesn't draw until it's shown again.
- `ResizeObserver` callbacks run after layout and before paint, so the canvas is drawn in
  the frame it first appears in, with clean styles.
- A canvas that isn't connected draws immediately (cheap).
- **No layout engine:** happy-dom's `ResizeObserver` exists but never calls back. Deferral is
  off when the user agent names happy-dom or jsdom. `NumSlider.deferDrawsToLayout` overrides
  the detection, so tests can turn it on with a fake observer.
- Known gap: a ready slider moved within one task draws on an unstyled canvas again until
  the next callback. That is today's cost, not a regression.
- Start with `NumSlider`. Other canvas widgets follow only if they show up in a trace.

## Stage 3: small fixes

Each change is kept only if a wall-clock A/B shows it helps.

- **`isMobile`** (in the `path-controller` submodule): tried and dropped in review. Caching
  the user-agent check and clearing it on `resize` saved 17, 99, 49 and 51 ms in four rounds
  (about 3.5%). A count of the reads agrees: 120,726 per sync at about 0.26 µs, or 32 ms. But
  a user agent that changes without a resize then goes unnoticed. The stage 3 figures above
  include it.
- **`getStyleRecord`:** hoist `testKey` to module scope, so esbuild's `keepNames` stops
  running `__name` on every call.
- **`NodeFrame.setCSS`:** read `HeaderHeight` from the theme instead of calling `metrics()`,
  which measures every row's `offsetHeight` after `_buildUI`.
- **`updateToolTips`:** check the hover timer before calling `getClientRects`, keeping the
  branch that removes a stale `_tooltip_ref`.
- **`g.font = ""`** in `measureText` and `drawText`: remove it. The empty string is an
  invalid font, so the canvas ignores it, but setting it still forces a recalc.

## Stage 4: sliders built and thrown away

- During a sync, 210 of the 469 sliders built are never connected. All come from
  `VectorPanel.init` → `rebuild`, inside `numslider-textbox-x` in `widget-with-label-x`.
- Cause: `init` builds the panel from its default value, then the first path delivery
  rebuilds it when the name arrives. Every bound panel was built twice; in the benchmark the
  70 panels' builds took 915 ms of a 2.2 s sync.
- Fix: a panel with a `datapath` skips the build in `init`, and `updateFromPath` builds it
  on the first delivery. A delivery that doesn't resolve still builds the default sliders,
  disabled, as before.
- Result, on top of stages 2 and 3 (median of 4 runs, two rounds): 2.25 s and 2.13 s
  before, 1.80 s and 1.80 s after.

## What's left after stage 4

A timeline trace of one sync after stage 4 (1.9 s wall clock, including the trace's own
overhead):

- **Style and layout are now small:** 188 style updates took 132 ms (1,270 ms before), of
  which `updateActiveStyle` was 55 ms (1,020 ms before). Forced style and layout came to
  133 ms.
- **The rest is JavaScript:** the synchronous sync itself is about 1.2 s of script, mostly
  constructing and initializing widgets, with no single dominant cost.
- Candidates for a later pass: the aspect system's per-widget binding (after its correctness
  fix), `innerHTML` parsing during widget construction (about 70 ms of parser work), and the
  dead `<style>` tags (with a saved-UI-state migration).

## The aspect system (fixed separately, same branch)

The first pressure test confirmed a correctness bug in `scripts/core/aspect.ts`. It was left
out of the staged plan because it barely affects speed and changes API behavior; the owner
then asked for it on the same branch.

- **Bug:** `AfterAspect`'s constructor wrote `after`, `once` and `remove` onto the shared
  prototype function, bound to the instance being constructed. So `widget.update.after(cb)`,
  `updateAfter` and `setCSSAfter` attached `cb` to the last-constructed widget of the same
  class. Affected callers included `container_prop.ts:346`, `ScreenArea.ts:495`, `ui.ts:608`
  and `xmlpage.ts:431`.
- **Related:** `clearAspectCallbacks` would throw (`.clear` was never assigned),
  `_method_bound` was never set, and `cls[AspectKeys]` was inherited through static
  inheritance, so subclasses reused their base class's key list.
- **Which form callers use:** path.ux itself only calls the `updateAfter`, `setCSSAfter` and
  `setCSSOnce` helpers. A search of every project in the owner's development folder for
  `<expr>.<method>.after(`, `.once(` and `.before(` found raw path.ux hooks only on `update`
  and `setCSS`. Bracket access (`widget["foo"].after`) and built bundles weren't searched.
- **Fix:** every widget gets its own wrappers for `update` and `setCSS` at construction, as
  own properties, so the raw form keeps working. Any other method is hooked per widget with
  `AfterAspect.get(widget, key)`. An unhooked wrapper calls the method straight through.
- **Behavior change:** `widget.someOtherMethod.after(cb)` no longer exists. It used to exist
  for every public method, but attached to the wrong widget.
- **Speed:** wrapping two methods per widget instead of every public method per class also
  helped: 1.57 s and 1.72 s before, 1.47 s and 1.57 s after (median of 4 runs, two rounds;
  the machine ran faster than in the stage 4 rounds).

## Pressure tests

### First draft (2026-11-22)

A fresh agent tried to falsify the first draft, which proposed the scratch canvas, small
fixes, aspect changes and redraw coalescing.

- **Survived:** text calls on a connected canvas force a recalc and a detached canvas
  doesn't; copied text matches a direct `fillText`; the transform check works; the stage 3
  fixes preserve behavior (with the corrections below).
- **Broke:**
  - Reading `direction` and setting `font = ""` also force the recalc.
  - Invalid font strings keep the previous value, so a shared scratch would draw in the
    last widget's font.
  - The aspect stage: a lazy wrapper can't work through `widget.method.after(cb)`, and the
    real cost is about 70 ms, not the profiled 600–750 ms. Moved out of the plan.
  - `NodeFrame.setCSS` uses `headerHeight`, not `width`.
  - Profiled costs are inflated; every stage now needs a wall-clock A/B.
  - The benchmark wasn't committed.

The scratch canvas then failed in the benchmark for a reason neither the draft nor the
pressure test anticipated (see above). That led to this revision.

### Second draft (2026-11-22)

A fresh agent tried to falsify stages 1 and 2 against the code and the live app.

- **Survived:**
  - Drawing before the first style pass costs about 1 s per sync. A simulation of stage 2
    cut the benchmark from 3.3 s to 2.3 s (−30%).
  - Styles are clean inside a `ResizeObserver` callback: 259 deferred draws took 25–38 ms
    in one callback.
  - Showing, connecting or unhiding a canvas fires a callback with its real size.
  - Nothing needs a synchronous slider draw: no code reads slider pixels, and modal drags,
    hover and text editing act on sliders that are already drawn.
  - `:host([hidden])` and scrollbar rules work from adopted sheets, and adopted sheets
    apply after a root's `<style>` elements with no conflicts. happy-dom supports them.
- **Broke:**
  - "The first callback means laid out": Chromium sends an initial 0×0 callback even for
    hidden and detached canvases. Readiness now requires a non-zero size.
  - "A forced recalc on an unstyled canvas costs about 20 ms": on the full page it is
    0.2–1.2 ms each. The total (about 1 s per sync) still holds, from about 8,500 font sets.
  - Stage 1's premise (adopted sheets avoid the per-root cost) and its expected gain. Two of
    its four tags are dead CSS, and removing tags breaks saved UI state. Shelved.
  - The benchmark never sees `_screenStyleTag` writes: `update_intern` runs from a 150 ms
    interval, after the timed window.
- **Gaps now in the plan:** keep the sizing work on the pending path, wrap deferred draws in
  try/catch, re-arm on hide, the happy-dom detection, and stage 4.
