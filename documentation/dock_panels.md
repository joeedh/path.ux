# Dockable Editor Panels

Editors (Area subclasses) can host dockable/floatable panels: collapsible
`PanelFrame`-based sections that users drag between the editor's four edge
regions, float in provenance-titled windows, or collapse to edge-aligned
tab rails. Layouts serialize with nstructjs and per-panel widget state is
cached with `saveUIData`, keyed by panel id so reorders don't break restore.

The implementation lives in `scripts/screen/dock_panels.ts` and is exported
from `pathux.ts`. The example `WorkspaceEditor`
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

## Constraints

Enforced centrally during interaction — drop zones outside `allowedDocks`
never render, and gestures are disabled by the flags:

- `PanelFlags.NO_CLOSE` — no close affordance.
- `PanelFlags.NO_FLOAT` — cannot float (also excluded via `allowedDocks`).
- `PanelFlags.PINNED` — cannot be moved at all.
- `Area.panelLayoutEditable = false` — disables all interactive layout
  editing for the editor; the programmatic layout is authoritative.

## Imperative API

```ts
this.panels.dockPanel("tools", "right", { index: 0 });
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
(disabled when `panelLayoutEditable` is false); sizes persist. Docked
regions present their panels either as a vertical rollout stack (default)
or as a one-visible-panel tab group:

```ts
this.panels.setEdgeSize("right", 300);
this.panels.setStackMode("right", StackMode.TABS);
```

In tabs mode the panels' title bars hide — the tabs are the headers — and
the mode round-trips through `PanelStackState.mode`. Rail mode takes
precedence over the stack mode while active.

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
it. Float positions serialize exactly.

If an editor overrides `on_area_active` / `on_area_inactive` it should call
super, which is what hides/shows the floating frames.

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

Not yet implemented: cross-editor panel drags and the hover tether overlay
from a floating panel to its owning editor.
