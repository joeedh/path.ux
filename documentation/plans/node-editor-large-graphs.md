# Node editor: large graphs

Status: revised after the pressure test. Stages 0 and 1 are done.

## Problem

Measured in an app with 226 nodes (75 Box, 75 Transform, 75 Union and one Plane), in NW.js at a
device pixel ratio of 2:

|                                  | Time                                            |
| -------------------------------- | ----------------------------------------------- |
| `syncGraph` building every frame | 3.4–4 s, blocking (8–10 s in one slow run)      |
| Pan, per animation frame         | 78–107 ms median, up to 350 ms in some sessions |
| `syncGraph` again after an edit  | 120–370 ms                                      |
| `_redrawLinks` for every link    | 4.3 ms                                          |

- **The inline value editors are nearly all of the build.** A frame without editors takes
  0.5–1.7 ms. A Transform, which has about nine sliders, takes 24–40 ms.
- **The slider canvases are the pan cost.** Chromium gives each accelerated 2D canvas its own
  compositor layer (reason `Canvas`), and then everything that overlaps one gets a layer too. The
  page has about 1,890 layers and spends nearly the whole frame in `Layerize`.
- **Links are cheap**, so they're always drawn.

## Stage 0: needless syncs (done)

- **The path watcher never settles on a graph.** `DataPathWatcher.check` compares the stored
  snapshot with the live value. For a type with `[CreateSnapshot]` the snapshot is an array and the
  value is the object, so they never match. Every idle poll of a `NodeGraphView` therefore runs
  `syncGraph`, which takes about 220 ms here. Every step of a slider drag does too.
  - Fix in path-controller: compare the stored snapshot with a new one, and also report a change
    when the object itself was replaced (held by `WeakRef`).
  - A push with an equal snapshot no longer calls back, so the graph's snapshot must hold
    everything `syncGraph` shows. Add the socket names and types, and for a group node what its
    forwarded rows show.
- **`syncGraph` flushes every frame.** 90–100 of its 112–124 ms after an edit are `flushUpdate` on
  frames that didn't change. Flush only frames that are new or were rebuilt. The screen's own
  update visits the others.
- **A link change rebuilds every row of its node.** Keep the rows that stay the same.
- **Links:** read each frame's `metrics()` once per redraw (it was twice per link), and redraw at
  most once per animation frame while the transform changes. At 1,000 bare nodes the links are what
  makes panning slow (31 ms per frame, no editors).

## Stage 1 (done): software canvases for small widgets

- Create the canvases of sliders, buttons, checkboxes and color buttons with
  `getContext("2d", { willReadFrequently: true })`. Chromium draws those in software and
  composites them with the rest of the page.
- Measured by patching `getContext` on the page, with every editor loaded (median / 95th
  percentile of 40 frames; two rounds in reversed order):

| Zoom | Before            | After           |
| ---- | ----------------- | --------------- |
| 1    | 93/130, 88/230 ms | 17/45, 17/36 ms |
| 0.5  | 102/141, 95/163   | 19/44, 16/38    |
| 0.35 | 96/151, 88/148    | 18/43, 18/33    |
| 0.1  | 78/128, 107/141   | 19/45, 24/45    |

- Layers: 1,890 before, 93–183 after. The sync time doesn't change (3.7 s and 3.7–4.0 s).
- The link canvas stays accelerated: there's one of it, and it's redrawn while panning.
- Check that dragging a slider costs the same as before.

## Results of stages 0 and 1

226 nodes, every editor loaded, a 1279×778 view, two rounds in reversed order. Pan times are
median / 95th percentile of 80 frames, in ms.

|                         | Before           | After        |
| ----------------------- | ---------------- | ------------ |
| Pan at 1                | 127/251, 130/151 | 22/44, 21/44 |
| Pan at 0.5              | 103/297, 104/124 | 21/48, 21/47 |
| Pan at 0.35             | 93/292, 99/321   | 20/48, 21/44 |
| Pan at 0.1              | 66/98, 67/97     | 18/37, 20/40 |
| `syncGraph` again       | 225, 230         | 14, 14       |
| after a link change     | 228, 225         | 15, 17       |
| syncs in 4 idle seconds | 2 (about 480 ms) | 0            |
| building everything     | 5.9, 5.9 s       | 6.2, 4.2 s   |

## Stage 2: value editors on demand (not started)

A frame is built whole, except that each value editor starts as a placeholder of the same height.
The view fills the placeholders in, nearest to its center first. A loaded editor stays.

- **Opt in:** `NodeGraphView.lazyEditors`, false by default, because hosts and tests may look
  inside frames right after `syncGraph`. `createUI` and `customPropUX` callbacks then run later, or
  never for a node that's never near the view.
- **Units:** one inline socket editor or one prop row. A group frame's forwarded UI is one unit.
  `node.createUI` and the proxy frames' add-socket row are always built.
- **The placeholder** shows the value's name and a dim bar. Its class is
  `nodeeditor-placeholder`: a press on it drags the node, and a right-click opens the prop row's
  menu. `_onNodeWidget` and `propRowKey` learn the class.
- **Sockets and props are looked up by key** when a unit is built. A reparse can replace the node
  under a frame that stays.
- **Wanted:** the frame intersects the view grown by a quarter of its size on each side, and the
  scale is at least 0.35. A view with no size wants nothing.
- **A pass** runs in an animation frame and builds units until 8 ms have passed. It builds and
  flushes one unit at a time, because a bound vector panel only builds its sliders in its first
  update. One vector unit takes 8–15 ms, so a pass can go over.
- **No pass** runs while `haveModal()` (a slider drag doesn't set the toolstack's own flag), within
  100 ms of a transform change, or when the view isn't connected.
- A unit that appears in a loaded frame is built at once. A sync that adds one to four frames
  builds theirs at once too, so an added node shows up complete.
- **Heights:** a table in the view, filled in from real builds and cleared when the theme changes.
  The key is the property type and its number of components, or the node type and prop key for a
  custom row. Placeholders are resized when their key's height becomes known. `metrics()` keeps
  measuring rows, so links, drops, box select and arrange work without changes.
- **Tab order:** `Screen.calcTabOrder` measures every widget (40 ms here) and runs after nearly
  every batch. Put it off until the page has been quiet for 200 ms.
- `flushEditors()` loads everything. The view fires `editorsloaded` when nothing wanted is left.

## Dropped

- **Unloading editors.** Panning meets its target with all of them loaded after stages 0 and 1, and
  removed editors brought most of the failures in the pressure test: open popups, uncommitted text,
  custom widgets' state, and removal during the screen's update.
- **Frames in batches, with rectangles for the rest.** 1,000 bare frames take 0.5 s. It would add a
  second geometry path and a canvas node renderer. Build bare frames in slices if larger graphs
  turn up.

## Targets

For the 226-node graph, in the same session as a control, with the view size stated:

- every frame and link visible within 0.5 s
- at 1:1 the editors in the view filled in within another 0.5 s
- panning: median under 20 ms per frame at every zoom, in a view of about 1280×780
- `syncGraph` after an edit under 50 ms, and none while idle

## Tests

- **Headless:** an idle poll of an unchanged graph doesn't call back; each kind of structural
  change does; which units a pass builds for a view and zoom; a new unit in a loaded frame is built
  at once; a reparse before a unit is built; the height table; presses and right-clicks on a
  placeholder; rows that stay through a link change.
- **In an app:** the timings above; dragging a slider while zooming; undo; a group's forwarded UI;
  two views of one graph; editing inside a group while another view shows its instance.

## Pressure test (2026-11-24)

A fresh agent tried to falsify the first draft, in the code and in the running app.

- **Survived:** stage 1's numbers, also in a 1279×778 view (16–17 ms median at every scale, 36–75
  ms before); a rebuilt editor has the same height; dragging a slider costs the same on a software
  canvas (43 µs per redraw, 47 µs on a hardware one).
- **Broke:**
  - The measurements included the idle resyncs of stage 0, which the draft didn't know about.
  - Removing an editor doesn't tear down the path watches inside it. The comments in nodeframe.ts
    that say so are wrong. Noted in todos.md, since nothing is unloaded anymore.
  - A unit's cost and height aren't known until its first update.
  - A tab order recalculation follows nearly every batch.
  - A press on a placeholder in the body wouldn't have dragged the node, and a right-click on one
    wouldn't have found its prop.
  - `toolstack.modal_running` is false during a slider drag.
  - 1,000 bare frames take 0.5 s, not 1 s.
  - The height table was keyed too narrowly: every vec3 row has the same height.
- **Recommended and adopted:** stage 0, opt in, no unloading, no stage 3.
