

<!-- toc -->

- [FrameManager: Screens, Areas, and Dockable Panels](#framemanager-screens-areas-and-dockable-panels)
  * [Defining an editor](#defining-an-editor)
    + [AreaFlags](#areaflags)
    + [Size constraints](#size-constraints)
    + [Lifecycle hooks](#lifecycle-hooks)
  * [Setting up a screen](#setting-up-a-screen)
  * [The screen mesh](#the-screen-mesh)
    + [Layout operations](#layout-operations)
  * [Multiple editors per tile: the AreaDocker](#multiple-editors-per-tile-the-areadocker)
  * [Context integration](#context-integration)
  * [Keymaps and key events](#keymaps-and-key-events)
  * [Serialization](#serialization)
  * [Dockable panels](#dockable-panels)
  * [Popups and utilities](#popups-and-utilities)
  * [Debugging aids](#debugging-aids)
<!-- regenerate with pnpm markdown-toc -->

<!-- tocstop -->

# FrameManager: Screens, Areas, and Dockable Panels

The FrameManager module (`scripts/screen/`) is path.ux's tiled window
manager, modeled on Blender's screen system. A **Screen** fills the page
with a mesh of non-overlapping tiles; each tile is a **ScreenArea** that
hosts one or more **Area** (editor) instances with a tab bar to switch
between them. Users resize tiles by dragging the borders between them,
split/merge tiles from a border menu, tear editors out into floating
windows by dragging their tabs, and — within an editor — rearrange
dockable panels. The whole arrangement serializes with nstructjs.

Core classes:

| Class | Element | Role |
|---|---|---|
| `Screen` | `pathux-screen-x` | Root workspace: owns the tile mesh, update loop, popups, global keymap |
| `ScreenArea` | `screenarea-x` | One tile: position/size, a set of editors, the active editor |
| `Area` | (per editor) | Editor base class; your subclasses implement actual UI |
| `ScreenBorder` | `screenborder-x` | Draggable border between tiles (part of the screen mesh) |
| `AreaDocker` | `area-docker-x` | The editor tab bar in a tile's header |
| `PanelManager` | — | Dockable/floatable panels inside one editor (see below) |

`simple.Editor` (`scripts/simple/editor.ts`) is a convenience Area
subclass used by the `simple` app framework; `simple.AppState.makeScreen()`
performs the screen setup described below automatically.

## Defining an editor

Subclass `Area` (or `simple.Editor`), describe it in `static define()`,
and register it:

```ts
import { Area, AreaFlags, nstructjs } from "pathux";

export class MyEditor extends Area {
  static define() {
    return {
      tagname : "my-editor-x",   //custom element name
      areaname: "my_editor",     //stable key, used in serialization
      apiname : "myEditor",      //optional: name in the data API
      uiname  : "My Editor",     //label in the editor-switcher menu
      icon    : Icons.EDITOR,    //optional switcher icon
      flag    : 0,               //AreaFlags bits
      //bitmask of BorderMask.LEFT/BOTTOM/RIGHT/TOP: borders the user
      //cannot move (e.g. a fixed-height menu bar locks all four)
      borderLock: 0,
    };
  }

  init() {
    super.init();

    const container = document.createElement("container-x");
    this.shadow.appendChild(container);

    this.makeHeader(container); //editor tab bar + notification area
    //...build UI in container
  }
}

MyEditor.STRUCT = nstructjs.inherit(MyEditor, Area) + `\n}`;
nstructjs.register(MyEditor);
Area.register(MyEditor);
```

`Area.register` adds the class to the editor registry (`areaclasses`),
which drives the switcher tab bar's `+` menu, serialization by
`areaname`, and `Area.makeAreasEnum()`.

### AreaFlags

| Flag | Effect |
|---|---|
| `HIDDEN` | Excluded from the editor-switcher menu |
| `FLOATING` | Area floats above the tile mesh (set by `Screen.floatArea`) |
| `INDEPENDENT` | Excluded from the screen mesh (not resized with it) |
| `NO_SWITCHER` | `makeHeader` omits the editor tab bar |
| `NO_HEADER_CONTEXT_MENU` | No right-click split/collapse menu on the header |
| `NO_COLLAPSE` | The tile's borders refuse to collapse/merge it away |

### Size constraints

`this.minSize = [w, h]` and `this.maxSize = [w, h]` (components may be
`undefined` for "unconstrained") clamp the owning tile. The screen's
constraint solver (`solveAreaConstraints`) enforces them whenever borders
move or the window resizes, pushing shared borders as needed. A menu-bar
editor, for example, pins `minSize[1] = maxSize[1] = barHeight` and locks
its borders.

### Lifecycle hooks

- `init()` — build the DOM. Runs once, deferred until `ctx` is set.
- `on_area_active()` / `on_area_inactive()` — the editor became / stopped
  being the tile's visible editor. **Call super**: the base class shows
  and hides the editor's floating dock panels.
- `on_area_focus()` / `on_area_blur()` — the mouse entered/left the tile.
- `on_resize(size)` — the tile changed size.
- `draw()` — called via `Screen.draw()` for canvas-style editors.
- `on_fileload(isActiveEditor)` — a new file was loaded.
- `copy()` — clone this editor for tile splits. Implement it; the base
  class only warns and returns an empty instance.
- `getKeyMaps()` — return this editor's `KeyMap` list (defaults to
  `[this.keymap]` when set).
- `makeHeader(container)` — builds the standard header: the shared
  editor tab bar (unless `NO_SWITCHER`), a notification area
  (`noteframe-x`), and the right-click screen menu. Returns the header
  row so you can append editor-specific controls.

## Setting up a screen

```ts
import { UIBase, Screen, ScreenArea, startEvents } from "pathux";

const screen = UIBase.createElement("pathux-screen-x") as Screen;
screen.ctx = myContext;                 //your context object
document.body.appendChild(screen);

const sarea = UIBase.createElement("screenarea-x") as ScreenArea;
sarea.ctx = myContext;
sarea.switchEditor(MyEditor);           //instantiate + activate an editor
screen.appendChild(sarea);              //registers the tile, builds borders

screen._init();
screen.listen();                        //start the update timer (~150ms)
screen.completeUpdate();
```

Notes:

- `screen.listen()` polls `screen.update()` on a timer; `unlisten()`
  stops it. `update()` runs an incremental generator that walks the
  widget tree in ~20ms slices; `completeUpdate()` drains it synchronously.
- By default the screen tracks the browser window size. Set the
  `inherit-scale` attribute (or `screen.fullScreen = false`) to size it
  from its own CSS instead. `setPosSize(x, y, w, h)` sets an explicit
  geometry.
- `startEvents(() => ctx.screen)` (called by `listen()`) installs the
  global `keydown` hotkey handler; see [Keymaps](#keymaps-and-key-events).
- `screen.mergeGlobalCSS(cssTextOrSheet)` merges rules into the style
  sheet that every widget shadow root copies.
- With the `simple` framework all of this is `new AppState(...).start()`.

## The screen mesh

Tiles are kept non-overlapping by a shared vertex/border mesh
(`FrameManager_mesh.ts`): each `ScreenArea` contributes four
`ScreenVert`s and four `ScreenBorder`s (sides are indexed
left=0, bottom=1, right=2, top=3 — see `BorderSides`); coincident
verts/borders are shared between neighboring tiles, and
`ScreenHalfEdge`s record which tiles touch each border. `ScreenBorder` is
itself a DOM element that renders the border line and handles drag-resize
(`AreaResizeTool`); dragging moves every collinear border segment
(`walkBorderLine`) so tile edges stay aligned.

The mesh is derived data: `regenBorders()` (alias `regenScreenMesh()`)
rebuilds it from tile pos/size whenever the layout changes.
`snapScreenVerts()` fits the mesh to the screen size, and
`solveAreaConstraints()` iterates min/max-size enforcement. Borders that
may not move — outer screen edges, `borderLock`ed sides — render inert
(`isBorderMovable`); `screen.allBordersMovable = true` overrides for
debugging.

### Layout operations

Programmatic:

```ts
screen.splitArea(sarea, 0.5, true);   //split at t, horiz=rows
screen.collapseArea(sarea);           //merge into a neighbor
screen.removeArea(sarea);             //remove outright
screen.replaceArea(dst, src);         //swap a tile in place
screen.floatArea(area);               //tear an editor into a floating tile
```

Interactive (all built on modal operators in `FrameManager_ops.ts`):

- **Drag a border** — resize the adjoining tiles (`AreaResizeTool`).
- **Double-click a border or header** — menu with *Split Area* /
  *Collapse Area* (`SplitTool`, `RemoveAreaTool`). The same tools are
  callable as `screen.splitTool()` / `screen.removeAreaTool()`.
- **Drag an editor's tab off the tab bar** — floats the editor and starts
  `AreaMoveAttachTool`, which re-attaches it where dropped (drop-position
  preview included) or leaves it floating. Set
  `area.areaDragToolEnabled = false` to disable tearing a specific editor
  out.
- `screen.hintPickerTool()` — click-to-inspect tooltips (`ToolTipViewer`).

Floating tiles (`sarea.floating === true`) sit above the mesh with
independent borders; `sarea.bringToFront()` raises one.

## Multiple editors per tile: the AreaDocker

A `ScreenArea` keeps every editor ever shown in it alive in
`sarea.editors` / `sarea.editormap` (one instance per editor class);
`sarea.area` is the active one. `sarea.switchEditor(EditorClass)`
instantiates on first use and swaps the DOM, firing
`on_area_inactive`/`on_area_active` on the outgoing/incoming editors.
Inactive editors keep their full UI state but are skipped by the update
loop.

The **AreaDocker** is the tab bar in the header. Each tile owns a single
docker instance which the active editor *adopts* into its header
(`ScreenArea._attachSwitcher`) — so tab UI state and even an in-progress
tab drag survive editor switches. Its affordances:

- Click a tab: `switchEditor` to that editor.
- `+` tab: menu of registered editor classes (from `areaclasses`) not
  already shown in the tile.
- Tab close `×` (and right-click → *Close*): **soft-closes** the editor —
  `area.closed = true` hides its tab but keeps the instance and its UI
  state; re-adding it from the `+` menu (or any `switchEditor` call)
  restores it as it was. `closed` round-trips through `Area.STRUCT`.
- Dragging a tab past the bar detaches the editor into a floating tile
  (see layout operations above).

## Context integration

Editors participate in the data-path context system (see
[controller.md](controller.md)) through the **AreaWrangler**
(`contextWrangler`): a per-editor-class stack of "which instance is
active". Wrap event handling that runs outside the normal update flow in:

```ts
area.push_ctx_active();
try {
  //code that resolves paths like "view2d.zoomfac"
} finally {
  area.pop_ctx_active();
}
```

`Area.getActiveArea(MyEditor)` returns the innermost/most recent instance,
which is how a `ContextOverlay` typically exposes editors:

```ts
class MyContext {
  get view2d() {
    return Area.getActiveArea(View2D);
  }
}
```

The screen keeps the stacks fresh from mouse-over/focus events; modal
operators lock them (`AreaWrangler.lock`) so popups don't retarget.
`area.buildDataPath()` returns the editor's own path
(`screen.sareas[i].editors[j]`) for editor-settings bindings.

## Keymaps and key events

`startEvents()` routes window `keydown` to `screen.on_keydown`, which:

1. Skips if a textbox has focus or a modal operator is running.
2. Tries the active editor's `getKeyMaps()` (with its context pushed).
3. Falls back to `screen.keymap`.
4. If `screen.testAllKeyMaps` is set, tries every visible editor.

`screen.getHotKey("tool.path")` finds the hotkey bound to a tool path for
display in menus. `stopEvents()` / `setKeyboardOpts(opts)` manage the
global listener.

## Serialization

Screens serialize through nstructjs (see [nstructjs.md](nstructjs.md)):

```
pathux.Screen     { size, pos, sareas, idgen, uidata }
pathux.ScreenArea { pos, size, editors, area /*active areaname*/ }
pathux.Area       { flag, saved_uidata, closed, panelLayout }
```

- Editor subclasses must have their own registered STRUCT inheriting
  `pathux.Area` (the `Area.register`/`nstructjs.inherit` pattern above;
  `simple.Editor.register` does it for you).
- Widget state inside each editor is captured as a `saveUIData` blob
  (`saved_uidata`) and replayed in `afterSTRUCT` once `ctx` is ready —
  panel open/closed states, tab selections, etc. survive without
  serializing widgets themselves.
- `panelLayout` carries the dock-panel layout (next section).
- A JSON path (`toJSON`/`loadJSON`/`Screen.fromJSON`) also exists.

After reading a screen with nstructjs, append it, then call
`screen.afterSTRUCT()`, `_init()`, and `listen()` (the `simple`
framework's file code does this).

## Dockable panels

Editors can host dockable/floatable **panels** — collapsible sections the
user rearranges inside the editor — via a `PanelManager`
(`scripts/screen/dock_panels.ts`). This is a separate, finer-grained
layer than screen tiles: tiles partition the screen between editors;
panels arrange tool UI *within* one editor.

Declare panels in the `definePanels()` hook and build the frame with
`makePanels()`:

```ts
class MyEditor extends Editor {
  definePanels(panels: PanelManager) {
    panels.panel({
      id   : "tools",            //stable id — the serialization key
      title: "Tools",
      dock : "left",             //default: left/right/top/bottom/"float"
      flags: PanelFlags.NO_CLOSE,
      allowedDocks: PanelDockMask.LEFT | PanelDockMask.RIGHT | PanelDockMask.FLOAT,
      minSize: [120, undefined], //content clamps, each component optional
      maxSize: [undefined, 300], //content past maxSize scrolls
      build: (c, panel) => {
        c.prop("tool.strength");
      },
    });
  }

  init() {
    super.init();
    const center = this.makePanels(this.container);
    //build the editor's main content into `center`
  }
}
```

What users get, all persistent:

- **Four edge regions** around the editor's center content, each with a
  resize grip. Panels are rollouts (`PanelFrame`) whose triangle collapses
  them to their header — a collapsed panel gives up its footprint, and a
  region whose panels are all collapsed shrinks to a header strip.
- **Drag-to-dock**: dragging a panel's title bar shows edge drop zones
  (blue) and per-panel "tab into" zones (green). Dropping on a panel
  merges the two into a **tab group**; dragging a tab out of the group's
  bar detaches it again. Regions can also present all their panels as one
  tab group (`setStackMode`) or as a slim edge **rail**
  (`setEdgeMode(side, RegionMode.RAIL)`).
- **Floating panels** in screen-level frames with provenance titles and a
  hover tether back to the owning editor; they hide with the editor
  (which is why `on_area_active`/`on_area_inactive` overrides must call
  super) and can be dropped onto any same-type editor's zones
  (cross-editor transfer).
- **Per-edge hotkeys**: `panels.toggleEdge("left")` etc. are designed to
  be bound in `getKeyMaps()`.

`Area` implements the panel system's host interface: it supplies the
provenance title (`getPanelHostTitle`, from `define().uiname`), finds
same-type peers for cross-editor drops (`getPanelPeers`), and embeds the
layout in `Area.STRUCT` (`panelLayout`), which `makePanels()` applies on
load — unknown panel ids are dropped and new ones get their declared
defaults, so catalogs can evolve. Set `area.panelLayoutEditable = false`
to disable all interactive panel rearrangement and make the programmatic
layout authoritative.

The imperative API (`dockPanel`, `dockPanelInto`, `floatPanel`,
`closePanel`/`showPanel`, `resetLayout`, `setEdgeSize`, …), the
constraint flags, and implementation notes are documented in
[dock_panels.md](dock_panels.md).

## Popups and utilities

- `screen.popupMenu(menu, x, y)` — show a `Menu` widget.
- `screen.popup(owner, x, y)` — an auto-dismissing popup container
  (closes on outside click / Escape), kept inside the window.
- `screen.draggablePopup(x, y)` — a `drag-box-x` the user can move.
- `screen.popupArea(EditorClass)` — a whole editor in a popup frame.
- `screen.pickElement(x, y, args)` — hit-test the widget tree, popups
  first; used throughout for event routing.
- `screen.calcTabOrder()` — recompute keyboard tab order (queued via
  `screen.needsTabRecalc`).

## Debugging aids

`cconst.DEBUG` flags (`scripts/config/const.ts`):

- `screenborders` — draw the screen mesh with vert/half-edge overlays.
- `areaConstraintSolver` — log constraint-solve passes.
- `screenAreaPosSizeAccesses` — trace tile pos/size writes.
- `allBordersMovable` — let every border drag, ignoring locks.
- `areadocker` — log AreaDocker tab lifecycle.
