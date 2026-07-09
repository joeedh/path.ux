

<!-- toc -->

- [Datapath Controller](#datapath-controller)
  * [Object Wrapping Example](#object-wrapping-example)
  * [Defining Properties](#defining-properties)
  * [Using Paths From the UI](#using-paths-from-the-ui)
  * [Looking Up Structs by Name](#looking-up-structs-by-name)
  * [Update Notifications (subscribe / notify)](#update-notifications-subscribe--notify)
<!-- regenerate with pnpm markdown-toc -->

<!-- tocstop -->

# Datapath Controller

The controller is the glue by which the view (or UI) queries the model (application state),
and is loosely based on Blender's RNA system.  UI code doesn't hold references to model
objects; instead it holds special "data paths".  Objects in the model are wrapped
in a special API that describes all the type information a UI needs (e.g. property types,
icon, tooltips, numeric ranges, etc).  Simple paths are used to look up data in the model
(e.g. ```obj.property.something[bleh]```).

Blender's RNA was originally created to provide one wrapper API that could power Blender's UI,
scripting, and animation systems.

The core types live in `scripts/path-controller/controller/controller.ts`, re-exported through
`scripts/controller/simple_controller.ts`:

- **`DataAPI`** — the registry. Maps model classes to `DataStruct` definitions, and resolves
  string paths against a context object.
- **`DataStruct`** — the type description for one wrapped class: a collection of `DataPath`
  members.
- **`DataPath`** — one property: its member name, API name, `ToolProperty` (type, range,
  units, enum items, icons), and getter/setter behavior.

## Object Wrapping Example

```js
    //our test class we want to wrap
    class Thing {
      constructor(name, id, location, opacity) {
        this.name = name; //str
        this.id = id; //int
        this.location = location; //enumeration
        this.opacity = opacity; //float
      }
    }

    //enumeration for .location member
    const LocationEnum = {
      LIVING_ROOM : 0,
      BEDROOM : 1,
      DRIVEWAY : 2
    };

    import {DataAPI} from 'simple_controller.js';

    export const api = new DataAPI();

    //create a structure mapping to Thing
    let st = api.mapStruct(Thing);

    //define properties and their types
    //these all have the prototype (membername, apiname, ui_name, description)

    st.string("name", "name", "Name", "Name of thing");
    st.int("id", "id", "ID", "Unique ID of thing");
    st.enum("location", "location", LocationEnum, "Location", "Location of thing").icons({
      LIVING_ROOM : [some icon id],
      BEDROOM : [some icon id],
      DRIVEWAY : [some icon id],
    });
    st.float("opacity", "opacity", "Opacity", "Transparency of thing").range(0, 1);
```

## Defining Properties

`DataStruct` exposes a builder method per property type. Each takes
`(path, apiname, uiname?, description?)` and returns a `DataPath` you can chain modifiers on:

- Scalars: `string`, `int`, `float`, `bool`
- Vectors: `vec2`, `vec3`, `vec4`, `color3`, `color4`
- Choice: `enum`, `flags` (both take an `enumdef` object)
- Nested: `struct` (a fixed sub-struct), `dynamicStruct` (sub-struct resolved at runtime),
  `list` / `arrayList` (collections)

Common chained modifiers: `.range(min, max)`, `.step(...)`, `.icons({KEY: id})`,
`.noUnits()`, `.readOnly()`, `.customGet(getter)` / `.customGetSet(getter, setter)`,
`.uiNameGetter(...)`. See `api_define.ts` in the app for worked examples.

## Using Paths From the UI

Once a class is mapped, UI code references model values by string path against the current
context. Containers and widgets accept these paths directly:

```js
container.prop("scene.objects.active.location");
container.slider("scene.tool.brush.radius");
container.check("settings.snap.enabled");
```

`DataAPI.resolvePath(ctx, path)` is the low-level resolver behind these calls; on failure it
records a message (including "did you mean" hints) on `api.lastResolveError`. In this app the
set of valid paths is catalogued — see `generated/API_PATHS.md` and run `pnpm run gen:paths`
after changing any `defineAPI`.

## Looking Up Structs by Name

`getStruct(cls)` resolves a `DataStruct` from a class reference. When you only have a *name* —
e.g. a serialized type tag, or a string from a saved file or generic tool — use
`getStructByName(name)` instead:

```js
const st = api.getStructByName("Brush");
if (st) {
  // st is the same DataStruct as api.getStruct(BrushClass)
}
```

It returns `undefined` for unknown names.

**Which name?** Every struct is registered under the most stable name available, chosen in
priority order (`resolveStructName`):

1. an **explicit** name passed to `mapStruct` / `mapStructCustom` / `inheritStruct`;
2. the **nstructjs registered name** (`cls.structName`) — a string literal that bundlers
   can't mangle, the same name used for serialization;
3. `cls.name` — the JS constructor name, which production bundlers mangle, so it's only a
   last resort for classes nobody looks up by name.

Because of (2), name lookup survives minification as long as the class is nstructjs-registered.
Prefer it over `cls.name` whenever the lookup string crosses a serialization or bundle boundary.

```js
// explicit name
const def = api.mapStruct(Widget, true, "ExplicitWidget");
api.getStructByName("ExplicitWidget") === api.getStruct(Widget); // true

// nstructjs name (mangle-proof even if the class is minified to `a`)
api.getStructByName("RealBrush") === api.getStruct(brushClass); // true
```

If two classes register the same *explicit* name, the second `mapStruct` call **aliases** the
first struct (both classes share one `DataStruct`; this is what lets `SavedToolDefaults`
re-register). A genuine collision between *different* auto-derived structs logs a warning and
keeps the first registration — pass an explicit name to disambiguate.

## Update Notifications (subscribe / notify)

The controller pushes change notifications to subscribers instead of relying on the UI
re-reading every path per frame (`scripts/path-controller/controller/pathwatch.ts`).

**Subscribing.** `api.watch(ctx, path, cb, opts?)` returns a `DataPathWatcher` that owns
change detection for that path: it resolves once, snapshots the value, and invokes `cb(value,
info)` only when a prop-aware compare says the value changed (componentwise for
vectors/arrays, `.equals()` for value objects like `Curve1D`, `Object.is` for scalars).
`info = { resolved, path, prop, source }`. Hold the watcher and call `watcher.remove()` when
done — the registry keeps only a `WeakRef` (a `FinalizationRegistry` prunes leaks). Widgets
should not call `watch` directly; use the `UIBase.watchPath()` / `updateFromPath()` protocol,
which manages watcher lifecycle automatically.

**Snapshotting object values.** To diff, the watcher must snapshot the previous value. Plain
values, arrays/typed arrays (so all vector classes and `Quat`), and `Matrix4` are handled
built-in. Any other object must implement the `CreateSnapshot` symbol method
(`[CreateSnapshot]() { return this.copy() }`, exported from `pathux.js`) — the watcher will
not deep-copy arbitrary objects. Without it, a once-per-path console warning is logged and
change detection degrades: in-place mutations are invisible to the poll fallback, though
explicit push notifications (`api.setValue` / `notifyChange`) still fire.

**Notifying.** `api.setValue` notifies at the choke point, so tool ops, mass-set, and
undo/redo are covered automatically. For raw model mutation:

```ts
api.updateFrom<BrushSettings>("workspace.brush", "size"); // typed, exact instance
api.updateChanged<BrushSettings>("size");                 // typed, any instance of T
api.notifyChange("workspace.brush.size");                 // untyped path
api.notifyChange();  // structural epoch bump: wakes everything, re-resolves paths
```

Notifying a path wakes watchers on the path itself, its subtree, and its ancestors
(`"workspace.brush"` wakes a `"workspace.brush.size"` watcher and vice versa).

**Coalescing.** Notifications mark watchers dirty; one `requestAnimationFrame` flush drains
them, so a thousand writes in a frame produce one callback. Watcher `opts.debounce` selects
`"raf"` (default), `"immediate"`, or `{ trailing: ms }`. Outside the DOM (vitest/node) the
flush falls back to a microtask, and `flushPathNotifications()` drains synchronously.

**Polling fallback.** `watcher.tick()` re-reads and diffs on demand; `UIBase` drives it from
`update()` while `UIBase.dataPathPolling` is enabled (the default), catching writes that
bypass `api.setValue` without any instrumentation.
