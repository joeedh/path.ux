# ListBox

`ListBox` (`scripts/widgets/ui_listbox.ts`, custom element `listbox-x`) is a
scrollable, single-select list of `ListItem` rows. It works in two modes:

- **Manual** — you push items in yourself with `addItem`.
- **Data-API backed** — you bind it to a `DataList` data-path and it stays in
  sync with that list automatically.

It emits a typed `"change"` DOM event on selection, supports keyboard
navigation (Up/Down), and can be resized by the user via a corner grip.

<!-- toc -->

- [Quick start](#quick-start)
- [Manual mode](#manual-mode)
- [Listening for selection changes](#listening-for-selection-changes)
- [Data-API backed mode](#data-api-backed-mode)
  * [The DataList contract](#the-datalist-contract)
  * [Active element sync](#active-element-sync)
  * [Item labels](#item-labels)
  * [Change detection: getVersion vs key diff](#change-detection-getversion-vs-key-diff)
  * [Undoable selection](#undoable-selection)
- [XML pages](#xml-pages)
- [Resizing](#resizing)
- [API reference](#api-reference)
<!-- regenerate with pnpm markdown-toc -->

<!-- tocstop -->

## Quick start

```ts
// manual
const box = container.listbox();
box.addItem("Apple");
box.addItem("Banana");
box.addEventListener("change", (e) => {
  console.log("selected", e.selection.id, e.selection.item);
});

// data-api backed
const box2 = container.listbox("myStruct.myList");
```

`container.listbox(path?, packflag?)` creates the widget. Passing a `path`
binds it to a `DataList` (see [below](#data-api-backed-mode)); omitting it
leaves the box in manual mode.

## Manual mode

```ts
const box = container.listbox<number>();

const a = box.addItem("Alpha");        // auto id
const b = box.addItem("Beta", 42);     // explicit id

box.setActive(b);          // by reference
box.setActive(42);         // or by id
box.removeItem(a);         // by reference or id
box.clear();
```

- `addItem(name, id?)` returns the created `ListItem`. If you omit `id`, an
  integer is generated; generated ids never collide with explicit numeric ids.
- `setActive(itemOrIdOrUndefined)` highlights the entry, scrolls it into view,
  and fires a `"change"` event (re-selecting the current item is a no-op).
- `removeItem` / `clear` keep the active selection consistent (removing the
  active item deselects it and fires a change).

Read the current selection with `box.active` (the `ListItem`) or `box.activeId`
(its id).

## Listening for selection changes

The widget dispatches a typed `ListBoxChangeEvent` whose `selection` carries the
new id and item:

```ts
box.addEventListener("change", (e) => {
  const { id, item } = e.selection; // e is ListBoxChangeEvent
});
```

> The older `box.on_change = (id, item) => {…}` callback still works but is
> **deprecated** — prefer the DOM event. ListBox is the first path.ux widget to
> move to standard DOM events; new widgets should follow suit.

## Data-API backed mode

Bind the box to a data-path that resolves to a `DataList`
(`scripts/path-controller/controller/controller_base.ts`). The widget then
populates itself from the list and reflects/writes the active element.

```ts
const box = container.listbox("scene.objects");
```

You can also set the path after creation: `box.setAttribute("datapath", path)`.
The widget polls in its `update()` loop, so it tracks list changes
automatically.

### The DataList contract

A list is declared in an `api_define` with `struct.list(path, apiname, funcs)`.
The callbacks the ListBox uses:

| callback | required | purpose |
| --- | --- | --- |
| `getIter(api, list)` | yes | iterate the elements (for population) |
| `getKey(api, list, obj)` | yes | the stable key/id of an element |
| `get(api, list, key)` | yes | look an element up by key |
| `getActive(api, list)` | no | the currently-active element |
| `setActive(api, list, val)` | no | make `val` (the **value**, not a key) active |
| `getVersion(api, list)` | no | O(1) change-detection counter |

> **`setActive` receives the value object**, symmetric with `getActive` — not a
> key. (A list path's `.active` resolves read-only through `getActive`, so the
> widget calls `setActive` directly.)

### Active element sync

If the list implements `getActive`/`setActive`, the box is fully two-way:

- the active item reflects `getActive` (updated whenever the list changes);
- clicking an item (or arrow-key nav) writes back through `setActive`.

If those callbacks are absent, the box still populates and selection works, but
it stays **internal only** (nothing is written back).

### Item labels

By default each row is labelled with the element's `.name` (when it's a
string), otherwise its key. Override per-listbox with a callback:

```ts
box.itemNames((obj, key) => `Object #${obj.id}`);
// or: box.getItemName = (obj, key) => ...
```

### Change detection: getVersion vs key diff

To avoid rebuilding the DOM every frame, the widget detects whether the list
actually changed:

- If the list implements **`getVersion`**, the box reads it (O(1)) and rebuilds
  only when the number changes. Your list should bump the counter on any
  structural change (add/remove/reorder) **and** on active change.
- Otherwise the box falls back to an **O(n) key diff** (it hashes the ordered
  keys).

It also rebuilds if the data-path resolves to a *different* list object, and
clears itself if the list ceases to exist (e.g. a `foo.active.children` path
whose `active` becomes undefined), repopulating if it reappears.

### Undoable selection

By default selection write-back is a direct `setActive` call (not undoable),
matching most list pickers. To route it through an undoable tool op instead:

```ts
box.useActiveUndo = true; // requires ctx.toolstack
```

This uses the built-in `ListBoxSetActiveToolOp`, which records the previous
active element for undo. If no `toolstack` is present it falls back to the
direct call.

## XML pages

In an xmlpage layout, use the `<listbox>` tag:

```xml
<listbox path="canvas.paths" height="220" resize-axes="xy" />
```

- `path` → the `DataList` data-path.
- `height` / `width` → initial size (px).
- `resize-axes` → `"x"`, `"y"`, or `"xy"` (see below).
- `resizable` → `false` to hide the grip.

The `path` is joined to the surrounding container's data-prefix, so a
`<listbox>` inside `<panel path="canvas">` can use `path="paths"`. To set
labels, grab the element by `id` after the page loads and call `itemNames(...)`
(labels can't be expressed in XML).

## Resizing

Each box has a draggable triangular grip in its bottom-right corner.

- `box.resizeAxes` — `"y"` (default, vertical only), `"x"`, or `"xy"`.
- `box.resizable` — set `false` to hide the grip.
- `box.minWidth` / `maxWidth` / `minHeight` / `maxHeight` — drag bounds.

The grip stays pinned to the visible corner while the list scrolls. A
user-resized size is persisted through `saveData`/`loadData`, so it round-trips
with `saveUIData` / `loadUIData`.

## API reference

```ts
class ListBox<CTX, IDTYPE = string | number> extends Container<CTX> {
  // manual
  addItem(name: string, id?: IDTYPE): ListItem;
  removeItem(item: ListItem | IDTYPE): void;
  setActive(item: ListItem | IDTYPE | undefined): void;
  clear(): void;
  get active(): ListItem | undefined;
  get activeId(): IDTYPE | undefined;

  // data-api binding
  getItemName?: (obj: unknown, key: IDTYPE) => string;
  itemNames(cb): this;
  useActiveUndo: boolean;        // default false

  // resize
  resizable: boolean;            // default true
  resizeAxes: "x" | "y" | "xy";  // default "y"
  minWidth; maxWidth; minHeight; maxHeight;

  // deprecated — use the "change" DOM event
  on_change?: (id: IDTYPE | undefined, item: ListItem | undefined) => void;
}

// dispatched on "change"
class ListBoxChangeEvent extends Event {
  selection: { id: IDTYPE | undefined; item: ListItem | undefined };
}
```

See [`tests/ui_listbox.test.ts`](../tests/ui_listbox.test.ts) and
[`tests/ui_listbox_datalist.test.ts`](../tests/ui_listbox_datalist.test.ts) for
worked examples, and the **ListBox** tab in the example app
([`example/page.xml`](../example/page.xml)) for a live data-bound listbox.
