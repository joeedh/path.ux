# Dockable Editor Panels

Editors (Area subclasses) can host dockable/floatable panels: collapsible
`PanelFrame`-based sections that users drag between the editor's four edge
regions, float in provenance-titled windows, or collapse to edge-aligned
tab rails. Layouts serialize with nstructjs and per-panel widget state is
cached with `saveUIData`, keyed by panel id so reorders don't break restore.

The implementation lives in `scripts/screen/dock_panels.ts` and is re-exported
from the `scripts/pathux.ts` package entry. The example `WorkspaceEditor`
(`example/editors/workspace/workspace.ts`) is the reference conversion.

## Declaring panels

Implement the `definePanels()` hook and call `makePanels()` from `init()`:

```ts
class MyEditor extends Editor {
  definePanels(panels: PanelManager) {
    panels.panel({
      id   : "tools",              //stable string id — the serialization key
      title: "Tools",
      dock : "left",               //default placement (or "float")
      flags: PanelFlags.NO_CLOSE,
      allowedDocks: PanelDockMask.LEFT | PanelDockMask.RIGHT | PanelDockMask.FLOAT,
      minSize: [120, undefined],   //content size clamps in CSS pixels;
      maxSize: [undefined, 300],   //either component may be omitted
      build: (c) => {
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

`build()` runs once when the panel is first shown; widget state is restored
afterwards from the per-panel uidata blob. A serialized layout overrides the
declared defaults: unknown ids are dropped, ids the layout predates get their
default placement.

`minSize`/`maxSize` clamp the panel *contents* in CSS pixels; each component
is optional. Content past `maxSize` scrolls inside the panel.

## Constraints

Enforced centrally during interaction — drop zones outside `allowedDocks`
never render, and gestures are disabled by the flags:

- `PanelFlags.NO_CLOSE` — no close affordance.
- `PanelFlags.NO_FLOAT` — cannot float (also excluded via `allowedDocks`).
- `PanelFlags.NO_COLLAPSE` — cannot roll up; the header's collapse triangle is
  not drawn and the panel stays open.
- `PanelFlags.PINNED` — cannot be moved at all.
- `Area.panelLayoutEditable = false` — disables all interactive layout
  editing for the editor; the programmatic layout is authoritative.

## Imperative API

```ts
this.panels.dockPanel("tools", "right", { index: 0 });
this.panels.dockPanelInto("tools", "props"); //group with "props" as tabs
this.panels.floatPanel("tools", { pos: [x, y] });
this.panels.closePanel("tools");     //hides; layout position retained
this.panels.showPanel("tools");
this.panels.resetLayout();           //back to declared defaults
```

## Per-edge visibility and hotkeys

`hideEdge` / `showEdge` / `toggleEdge` / `isEdgeHidden` control whole
regions; a hidden region keeps its stacks and size for exact restore. Bind
them through the normal keymap mechanism:

```ts
getKeyMaps() {
  this.keymap ??= new KeyMap([
    new HotKey("T", [], () => this.panels?.toggleEdge("left")),
    new HotKey("N", [], () => this.panels?.toggleEdge("right")),
  ]);
  return [this.keymap];
}
```

## Region sizing and stack presentation

Every visible region has a 6px resize grip on its center-facing edge
(disabled when `panelLayoutEditable` is false); sizes persist. Regions hold
an ordered list of *stacks*: a panel docked normally is its own rollout
stack, and panels merged together form a tab group (`StackMode.TABS` in
`PanelStackState`). `setStackMode` merges/splits a whole region at once:

```ts
this.panels.setEdgeSize("right", 300);
this.panels.setStackMode("right", StackMode.TABS);
```

In a tab group the panels' title bars hide — the tabs are the headers — and
the group (including its active tab) round-trips through
`PanelStackState`. Rail mode takes precedence over stacks while active.

## Collapsing

Clicking a docked panel's triangle collapses it to its header, and the
panel gives up its footprint: in top/bottom regions a collapsed panel
shrinks to its header's width so siblings take the space, and once every
rollout in a region is collapsed the whole region shrinks to its headers
instead of holding its fixed size (the resize grip is inert while it does).
Expanding any panel restores the region's size. Panels inside tab groups
and rails have no headers, so no rollout collapse.

## Tab-docking panels into each other

Dragging a panel over another docked panel highlights it as a green
drop zone (edge zones stay blue); dropping merges the two into a tab group
with the dropped panel active. Dropping onto an existing group's zone joins
it. Dragging a tab out of the bar (past a small threshold) detaches that
panel into the normal drag gesture — drop it on an edge to dock, on a
panel to re-group, or elsewhere to float it. A group whose second-to-last
panel leaves degrades back to a plain rollout. Programmatically this is
`dockPanelInto(id, targetId)`; it refuses undocked targets and sides
outside the panel's `allowedDocks`.

## Rail mode

`setEdgeMode(side, RegionMode.RAIL)` renders a region as a slim tab bar
aligned to its edge (vertical for left/right); the panels' own title bars
hide — the tabs are the headers. Clicking a tab expands the group with that
panel active, clicking the active tab collapses to the bare rail, clicking
another tab switches. The rail never hides, and `toggleEdge()` on a rail
region collapses/expands instead of hiding it.

## Floating

Floating panels live in frames appended at screen level (registered as
screen popups for pickElement) but owned by the editor: they hide while the
editor is inactive in its tile and their header shows provenance — the panel
title plus the owning editor's uiname, since several editors of one type can
be open — with re-dock and close buttons. Dragging a docked panel's title
bar out floats it; dragging a floating frame onto an edge drop zone docks
it. Float position and size serialize exactly.

If an editor overrides `on_area_active` / `on_area_inactive` it should call
super, which is what hides/shows the floating frames.

Hovering a floating frame's header (and dragging the frame) draws a tether
overlay — the owning editor's rect tinted plus a line from the frame — so
ownership stays obvious with several same-type editors open.

## Cross-editor transfer

Drag drop zones also cover other visible editors of the same type (peers
share the panel catalog since `definePanels` is class-level). Dropping on a
peer's zone calls `transferPanel(id, target, side)`: widget state travels
via `saveUIData`, the target docks and shows the panel, and in the source
editor it becomes closed ("moved away") — `showPanel` brings the local copy
back. Peers with `panelLayoutEditable = false` are excluded.

## Serialization

`Area.STRUCT` carries `panelLayout : pathux.PanelLayoutState` as a computed
field; `makePanels()` applies a deserialized layout automatically. Editors
that never initialize (e.g. soft-closed tabs) pass their loaded layout
through unchanged. Per-panel widget state uses `saveUIData(panel,
"panel:" + id)` — id-keyed rather than positional, so layout edits never
corrupt restored widget state.

## Implementation notes

- Containers apply theme defaults (`flex-grow: unset`, centered alignment)
  and reset their `class` attribute from deferred `init()`, clobbering
  build-time inline styles and classes. The dock skeleton pins structural
  layout with `!important` rules injected into the enclosing shadow root,
  keyed by `data-dockpin` attributes; region visibility is driven by a
  `data-dock-hidden` attribute.
- `preventDefault()` on an initiating `pointerdown` suppresses the
  compatibility mouse event stream, so `pushModalLight` drag handlers must
  be `on_pointermove`/`on_pointerup`. Threshold detection before the modal
  uses `setPointerCapture` so the gesture survives leaving the title bar.
- `RowFrame.connectedCallback` re-sets inline `display:flex` every time an
  element reconnects (e.g. tab switches reparenting a panel), so panel
  title bars are hidden via a `data-dock-hidetitle` attribute matched by an
  `!important` rule in the panel's shadow root, not via inline styles.
