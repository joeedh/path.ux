

<!-- toc -->

- [Containers and Property Binding](#containers-and-property-binding)
  * [`prop()` — build the widget the property asks for](#prop--build-the-widget-the-property-asks-for)
    + [Property flags that steer `prop()`](#property-flags-that-steer-prop)
    + [Pack flags](#pack-flags)
  * [Sliders](#sliders)
  * [Other path-taking methods](#other-path-taking-methods)
  * [Path prefixes](#path-prefixes)
  * [Mass set](#mass-set)
  * [Undo](#undo)
<!-- regenerate with pnpm markdown-toc -->

<!-- tocstop -->

# Containers and Property Binding

`Container` (`scripts/core/ui.ts`) is the base class every layout widget extends
(`RowFrame`, `ColumnFrame`, `Panel`, `ScreenArea` contents, and so on). Its build methods
take a data path string rather than a value, and the widget they create binds itself to
that path: it reads the path's `ToolProperty` for its type, UI name, tooltip, range, step,
unit, enum items and icons, and it writes back through `api.setValue` so undo, mass-set and
change notification all work without the caller wiring anything up.

The path syntax, `DataAPI`/`DataStruct`/`DataPath`, and the change-notification runtime are
covered in [controller.md](controller.md). The property types themselves are covered in
[toolprop.md](toolprop.md). This document covers what the `Container` methods do with them.

## `prop()` — build the widget the property asks for

`container.prop(path, packflag?, mass_set_path?)` resolves the path, reads the
`ToolProperty` at the end of it, and creates whichever widget suits that property's type.
The caller does not choose the widget:

| Property type                   | Widget built                                                        |
| ------------------------------- | ------------------------------------------------------------------- |
| `REPORT`                        | `pathlabel` (read-only text)                                        |
| `STRING`                        | textbox in a labeled strip; `textarea` when `multiLine`             |
| `STRING` with `READ_ONLY`       | `pathlabel`                                                         |
| `INT`, `FLOAT`                  | `slider` (or `simpleslider`, see below)                             |
| `BOOL`                          | `check`                                                             |
| `ENUM`                          | `listenum` dropdown, or a `checkenum` strip when icons are in play  |
| `ENUM` with a subkey in the path | a single `check` for that one value                                 |
| `FLAG`                          | a strip of checkboxes, one per flag value                           |
| `FLAG` with a subkey in the path | a single `check` for that one bit                                   |
| `VEC2`/`VEC3`/`VEC4`            | `vector-panel-x` (one slider per component)                         |
| a vector with `COLOR` subtype   | `colorbutton`                                                       |
| a vector with a subkey          | a single slider for that component                                  |
| `CURVE`                         | `curve1d` curve widget                                              |

An unhandled property type throws `DataPathError("Unsupported property: …")`, and an
unresolvable path throws `DataPathError("Unknown property at path …")` carrying
`api.lastResolveError`'s "did you mean" hint.

Because the property carries the metadata, this is usually all a panel needs:

```js
const panel = container.panel("Brush");
panel.prop("scene.tool.brush.radius");   // float → slider, with the property's range/step
panel.prop("scene.tool.brush.color");    // color4 → color button
panel.prop("scene.tool.brush.mode");     // enum → dropdown, with the property's icons
panel.prop("scene.tool.brush.flags");    // flag → checkbox strip
```

### Property flags that steer `prop()`

Flags set on the `ToolProperty` (`PropFlags`, in
`scripts/path-controller/toolsys/toolprop_abstract.ts`) change what gets built, so the
choice lives with the property definition rather than at each call site:

- `READ_ONLY` — a string renders as a label instead of a textbox.
- `NO_UNDO` — the widget is built with `useDataPathUndo` off, so edits do not push an undo
  step.
- `USE_ICONS` — an enum or flag renders as an icon strip rather than a dropdown.
- `FORCE_ENUM_CHECKBOXES` — an enum renders as a strip of checkboxes without icons. Set it
  from the `DataPath` builder with `.checkStrip()`.
- `SIMPLE_SLIDER` / `FORCE_ROLLER_SLIDER` — pick the slider style (see below). Set from the
  `DataPath` builder with `.simpleSlider()` / `.rollerSlider()`.

### Pack flags

`packflag` is a bitfield (`PackFlags`, in `scripts/core/ui_base.ts`) passed down from the
container and merged with `this.inherit_packflag`, so setting it on a panel affects
everything built inside it. The ones that affect property binding:

- `SIMPLE_NUMSLIDERS` — build simple sliders rather than rollers.
- `FORCE_ROLLER_SLIDER` — the reverse, and it wins over `SIMPLE_NUMSLIDERS`.
- `NO_NUMSLIDER_TEXTBOX` — leave off the slider's paired textbox.
- `FORCE_PROP_LABELS` — put a label in front of a widget that would otherwise carry its
  own name.
- `USE_ICONS` — enums and flags render as icon strips.
- `PUT_FLAG_CHECKS_IN_COLUMNS` — lay a flag property's checkboxes out in two columns.
- `WRAP_CHECKBOXES` — wrap a flag property's checkboxes at `checkRowWrapLimit` /
  `checkColWrapLimit` theme keys.
- `LABEL_ON_RIGHT` — put a widget's label after it rather than before.

## Sliders

`slider()` and `simpleslider()` both bind a numeric path. They differ only in which element
they create, and `simpleslider(path, args)` is `slider(path, args)` with
`PackFlags.SIMPLE_NUMSLIDERS` added.

Three elements can come out of the call:

- `numslider-x` — the roller: dragging spins a value that has no fixed travel, which suits
  an unbounded or wide-ranged number.
- `numslider-simple-x` — a bar that fills between `min` and `max`.
- `numslider-textbox-x` — the roller with a textbox beside it.

Which one is built depends, in order: the property's `SIMPLE_SLIDER` and
`FORCE_ROLLER_SLIDER` flags are folded into `packflag`; `FORCE_ROLLER_SLIDER` overrides
`SIMPLE_NUMSLIDERS`; `cconst.simpleNumSliders` supplies the app-wide default when neither
flag is present; and `cconst.useNumSliderTextboxes` (minus `NO_NUMSLIDER_TEXTBOX`) decides
whether the textbox variant is used for the roller.

Both methods take either positional arguments or a `SliderArgs` object, and the object form
is preferred:

```js
container.slider("scene.tool.brush.radius", {
  name: "Radius",
  min: 0,
  max: 100,
  step: 0.5,
  isInt: false,
  decimalPlaces: 2,
  packflag: PackFlags.NO_NUMSLIDER_TEXTBOX,
  callback: (slider) => console.log(slider.value),
});
```

Every field is optional. Anything left out falls back to the bound property's own
`uiname`, `range`, `step` and unit, which is why `container.prop(path)` on a float needs no
arguments at all. Passing `min`/`max`/`step` overrides the property for this widget only.

The datapath itself may be omitted (`slider(undefined, {…})`) for a slider that is not
bound to the model; it then reports changes through `callback` / `on_change` and holds its
own value.

## Other path-taking methods

Each of these creates one widget bound to `datapath`, and each reads the property for its
name, tooltip and value type:

- `textbox(path, text?, cb?, packflag?)` — single-line text. An explicit `text` argument
  overrides the bound value; leave it out to let the binding supply it.
- `textarea(path, value?, packflag?, mass_set_path?)` — multi-line rich text.
- `viewer(path, value?, packflag?, mass_set_path?)` — read-only HTML view.
- `pathlabel(path, label?, packflag?)` — a label showing the value, with the property's UI
  name when `label` is omitted.
- `check(path, name, packflag?, mass_set_path?)` — checkbox, or an icon check under
  `USE_ICONS`. A path ending in `[KEY]` binds one enum value or one flag bit.
- `iconcheck(path, icon, description?, mass_set_path?)` — icon-only checkbox.
- `checkenum(path, args?)` — a strip of checkboxes covering an enum's values.
- `checkenum_panel(path, name?, packflag?, callback?, mass_set_path?, prop?)` — the same
  strip inside its own panel.
- `listenum(path, args?)` — dropdown for an enum. `args.enumDef` supplies the values when
  no path is given; with a path the bound `EnumProperty` supplies them.
- `colorbutton(path, packflag?, mass_set_path?)` — a button opening a color picker.
- `colorPicker(path, args?)` — the picker itself, inline.
- `curve1d(path, packflag?, mass_set_path?)` — curve editor for a `CURVE` property.
- `vecpopup(path, packflag?, mass_set_path?)` — a button opening a vector editor.
- `treeview()`, `panel()`, `row()`, `col()`, `strip()`, `table()`, `tabs()` — layout
  containers; they carry `dataPrefix`, `massSetPrefix` and `inherit_packflag` down to
  whatever is built inside them.

`tool(toolpath, …)` and `menu()` bind a *tool* path rather than a data path — see
[toolsystem.md](toolsystem.md) and [menus.md](menus.md).

## Path prefixes

`dataPrefix` is prepended to every path a container builds (`_joinPrefix`), so a panel can
be written against one object and re-pointed at another:

```js
panel.dataPrefix = "scene.objects.active";
panel.prop("location");   // resolves "scene.objects.active.location"
panel.prop("opacity");
```

`pushDataPrefix(prefix)` / `popDataPrefix()` scope it to part of a build, and
`changePathPrefix(newPrefix)` rewrites the prefix on a container and its children after the
fact. `massSetPrefix` does the same for mass-set paths.

## Mass set

A mass-set path applies one edit to every member of a list, so a slider dragged in the UI
can drive a whole selection. It is an ordinary data path with a filter expression inside a
list subscript:

```js
container.prop("object.size", 0, "scene.objects[{$.select}].size");
```

The widget stores it as its `mass_set_path` attribute; on commit,
`api.massSetProp(ctx, path, value)` resolves the filter to a list of concrete paths and
sets each one, and the whole thing lands as a single undo step. Filters are property tests
(`$.select`) unless the list opts into expressions with `.evalMassSetFilter()`, which
allows things like `scene.paths[{$.id % 2 === 0}]`.

When `massSetPrefix` is set on the container, the argument may be left out entirely: each
build method derives the mass path from the property's own name via `_getMassPath`.

## Undo

`Container.useDataPathUndo` (inherited by children) decides whether widgets push undo
steps for their edits. `prop()` clears it per widget for a property flagged `NO_UNDO`, and
every build method returns a widget on which `.setUndo(bool)` overrides it. Under the hood
an edit runs as a `DataPathToolOp`; consecutive edits to the same path from the same widget
coalesce into one undo step rather than one step per drag frame.
