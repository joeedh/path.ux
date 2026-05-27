# path.ux `example/` — High-Level Architecture & Port Map

> Living document. Source of truth for understanding the example app while porting it to
> TypeScript. Updated each iteration as type fixes reveal structural facts.
> Companion files: `ERROR_CATEGORIES.md` (error taxonomy), `errors-raw.txt` (raw tsgo output).

---

## 0. What this is

`example/` is a **self-contained demo application** built on the path.ux UI library
(`../dist/pathux_with_docbrowser.js`, types resolved from `.tmp-types/`). It is a small
**vector drawing / paint app** whose real purpose is to exercise and showcase path.ux:
the screen/area system, the Blender-RNA-style data API (`DataAPI`/`DataStruct`), the
tool/undo system (`ToolOp`/`ToolStack`), the context overlay system, nstructjs
serialization, themes, icons, the docs browser, curve widgets, graph packing, and the
event graph.

It is **not** part of the shipped library (it lives outside `scripts/`). It imports the
library only through the barrel re-export `example/pathux.ts`
(`export * from "../dist/pathux_with_docbrowser.js"`). Every example module imports library
symbols from `../pathux.js` / `../../pathux.js`.

The app is wired for both web (`index.html`) and Electron (`electron_app.cjs`,
`electron_app.html`). Runtime entry is `core/app.ts` → `start()`.

### Top-level layout

```
example/
  pathux.ts            barrel: re-exports the whole library
  theme.ts             a generated CSS-ish theme object (data only)
  page.xml             xmlpage markup loaded by the Properties editor
  index.html           web entry (loads built bundle + app)
  api/api_define.ts    builds the DataAPI tree (THE data-binding schema)
  core/                app state, datablocks, context, constants, tool base, dynamics
  draw/                the Canvas drawing model + draw tool op (the "document")
  editors/             one Area subclass per editor + shared Editor base
  lib/tinymce/         third-party (EXCLUDED from the port)
```

---

## 1. Cross-cutting patterns (read this before any module)

These recur everywhere and dominate the error counts. Understanding them is the key to the
port; most fixes are mechanical *applications* of these patterns.

### 1.1 nstructjs serialization (`X.STRUCT = "..."; nstructjs.register(X)`)

Almost every class is registered with **nstructjs**, a binary struct serializer. The pattern:

```ts
SomeClass.STRUCT = nstructjs.inherit(SomeClass, Base, "namespace.Name") + `
  field : type;
}`;
nstructjs.register(SomeClass);
```

- `STRUCT` is a **static string** stamped onto the class object (`SomeClass.STRUCT = ...`).
  In TS this needs the class to allow a static `STRUCT: string`. Several classes also set
  `ClassName.STRUCT` from `nstructjs.inherit(...)` (returns the opening `"Name {\n"` prefix).
- Serialization calls back into instance method `loadSTRUCT(reader)` where `reader(this)`
  populates fields, then custom relink logic runs (rebuild id maps, resolve refs).
- `loadSTRUCT` and the `_items`/`_blocks`/`active` "scratch" fields (used only during
  read) are an important pattern: classes that `extends Array` carry an `active`,
  `highlight`, `_items`, `_blocks` shadow field. **Port implication:** these classes need
  declared fields (incl. the transient read-time ones) typed, often `T | undefined`.
- `nstructjs.register`, `nstructjs.inherit`, `nstructjs.STRUCT`, `nstructjs.write_scripts`,
  `nstructjs.writeObject`, `nstructjs.validateStructs`, `nstructjs.isRegistered` all come
  from the library types (namespace import). Verify shapes in `.tmp-types`.

### 1.2 The `_appstate` global  (Category C — ~16 errors)

`core/app.ts::start()` does `window._appstate = new AppState()`. Throughout the codebase,
code then refers to the **bare identifier** `_appstate` (e.g. `screen.ts`, `toolop.ts`,
`context.ts`, `docbrowser.ts`, `app.ts` itself). In browsers a bare name resolves to the
`window` property; TS does not know this.

Also set as globals: `window.CTX`, `window.DataRef`, `window.theEventGraph`,
`window._relative`, `window.haveElectron`, `window.redraw_all`, `window.redraw_all_full`.

**Port plan:** add a single ambient declaration (e.g. `example/global.d.ts` or a
`declare global` block in `core/app.ts`) augmenting `Window` AND declaring the bare
`var _appstate: AppState`, `var redraw_all`, `var redraw_all_full`, `var CTX`, etc. This is
the cleanest fix and resolves both `window.X` writes and bare-`X` reads in one place.
STRUCTURAL DECISION — see Questions.

### 1.3 The DataAPI / DataStruct definition tree (`api/api_define.ts`)

path.ux binds widgets to data via **string paths** (`"workspace.brush.size"`,
`"data.angle1"`, `"canvas.paths[...]"`). The schema is built imperatively in
`defineAPI()`:

- `api = new DataAPI()`, `cstruct = new DataStruct()`, `api.setRoot(cstruct)`.
- `st = api.mapStruct(Class, /*autoStruct*/ bool)` returns a `DataStruct` for a class.
- On a struct you call **typed-builder** methods: `.float/.color4/.bool/.vec4/.struct/
  .list/.flags/.curve1d/.dynamicStruct(...)`, each returning a property descriptor with a
  fluent chain (`.range().uiRange().decimalPlaces().on("change", cb)...`).
- `.list(path, uiname, callbacks)` takes a bag/array of callbacks
  (`getStruct, getLength, getActive, setActive, get, set, getIter, getKey`) — these are the
  biggest cluster of implicit-any params (`api, list, key, item`).

**Port implication:** the `api`, `list`, `st`, callback params need annotations from the
library types (`DataAPI`, `DataStruct`, list-callback signatures). Many TS7006 here.

**Cross-class hook:** `DataBlock.defineAPI(api)` / `ModelData.defineAPI(api)` /
`buildAPI(api)` in `datablock.ts` follow the same shape. `buildAPI` also has a **real bug**:
`st.list(def.typeName, type.typeName, {...})` references undefined `type` (should be `def`).

### 1.4 The Context + Overlay system (`core/context.ts`)

path.ux contexts are layered. `Context` (library) is subclassed by `ContextBase`, which is
subclassed by `ToolContext` and `ViewContext`. Overlays (`ContextOverlay` subclasses
`BaseOverlay`, `ViewOverlay`) are pushed onto a context with `pushOverlay(new X(state))`.
Getters on overlays expose app state to the data API and tools:

- `BaseOverlay`: `toolstack, toolDefaults, last_tool, api, datalib, data, canvas, workspace`.
- `ViewOverlay`: `screen, editor, docsbrowser`.
- Overlays read `this.state` — `state` is the `AppState` instance threaded through.
  **The library `ContextOverlay`/`Context` must expose `state`** (verify in `.tmp-types`);
  if it's generic, our subclasses should bind it to `AppState`.
- `contextDefine()` static returns `{name, flag}` with `ContextFlags.IS_VIEW`.
- `Context.register(BaseOverlay)` registers overlays.

**Port implication:** the rich getters (`ctx.workspace`, `ctx.canvas`, `ctx.toolstack`,
`ctx.api`, `ctx.datalib`, `ctx.data`, `ctx.state`, `ctx.screen`) are consumed all over
(`draw_ops`, `workspace`, `menu`, `log_editor`). To get real types at the consumer side,
the context classes must surface these members. This is the spine of the app's typing.

### 1.5 The Area / Editor system (`editors/editor_base.ts` + per-editor)  (Category D)

`Editor extends Area` (library). Each editor (`WorkspaceEditor`, `PropsEditor`,
`MenuBarEditor`, `LogEditor`, `EventGraphViewer`, `DocsBrowserEditor`) extends `Editor`,
provides a `static define()` returning `{tagname, areaname, uiname, icon, flag?}`, and is
registered with `Editor.register(Cls)` + nstructjs + (for screen) `UIBase.register`.

`TS2417 "static side incorrectly extends base class static side 'typeof Editor'"` fires for
every editor. Root cause to confirm: the base `Area.define()` (library) has a static
signature whose return type is incompatible with the subclass `static define()` literal
(e.g. base declares `define(): AreaDefine` and our literal is missing a required field, or
the base `define` is typed as returning a specific subtype). **Likely fix:** declare the
editors' `static define()` return type to match/extend the library `Area` contract, or make
`Editor.define` the canonically-typed override the subclasses are compatible with.
STRUCTURAL — needs a look at `Area`/`define` in `.tmp-types`. See Questions.

Editors share instance members from `Area`: `ctx, header, container, shadow, size, pos,
minSize, maxSize, addEventListener, makeHeader, getDefault, setCSS, update, init,
on_resize, doOnce, flushUpdate, getScreen`. Consumers assume these exist → many TS2339 if
the library `Area` type doesn't expose them or our subclasses add undeclared fields
(`container`, `header`, `canvas`, `g`, `brush`, `dynamics`, `pan`, `scale`, `table`, ...).

### 1.6 The ToolOp system (`core/toolop.ts`, `draw/draw_ops.ts`, `workspace_ops.ts`)

CLAUDE.md documents a **strongly-typed** `ToolOp<Inputs, Outputs>` where properties are
declared via generic parameters and created in `static tooldef()`. The example uses the
**legacy untyped** pattern: `static tooldef()` returns `{..., inputs: {brushSize: new
FloatProperty(...)}}` and the op reads `this.inputs.brushSize.getValue()`.

- `core/toolop.ts` monkey-patches `ToolOp.prototype.undoPre/undo` to use `_appstate`
  create/load undo-file. `this._undo` is an undeclared instance field.
- `DrawOp extends ToolOp` (draw_ops.ts): big op, reads `this.inputs.*`, `ctx.workspace`,
  `ctx.canvas`, `this.modal_ctx`, `this.last_mpos`, `this.last_dstate`, `this._workspace`.
- `PanOp extends ToolOp` (workspace_ops.ts): **real bug** — constructor sets `this.x`
  without calling `super()` first → TS17009.

**Port plan:** to get real `this.inputs` typing we either (a) thread the `Inputs` generic
through `DrawOp`/`PanOp` per CLAUDE.md, or (b) declare the instance fields and accept
`inputs` typed from the base. Option (a) is the "match the intended structure" path and is
likely what the iteration should converge toward. STRUCTURAL — see Questions.

### 1.7 Vector / math classes

`Vector2/3/4`, `Matrix4`, `Curve1D`, `util.*` (`IDGen`, `MersenneRandom`, `cachering`,
`time_ms`, `btoa/atob`, `print_stack`) come from the library. Note the project-wide vector
indexing rule (CLAUDE.md): vectors have no plain numeric index signature; indices ≥ LEN are
`number | undefined`. Drawing code indexes verts heavily (`v[0]`, `co[1]`); should be fine
for indices < LEN but watch for `undefined` propagation (Category H).

`CanvasPoint extends Vector2` and `CanvasEdge extends Vector2` and `CanvasPath` — subclassed
vectors with extra fields (`paths, edges, id, material, v1, v2, verts, type`).

### 1.8 Window-augmenting canvas/DOM extras

`buildGraphPack` stashes `canvas.g = canvas.getContext("2d")` (custom prop on
`HTMLCanvasElement`) → TS2339. `Blob([...], {mime: ...})` uses wrong option name `mime`
(should be `type`) → TS2353 (real bug, 2 sites in properties.ts).

---

## 2. Module-by-module

### 2.1 `core/const.ts`  (53 lines)

- `class Version {major,minor,micro,dev}` with `toJSON/loadJSON/toInt`. Needs field decls.
- `export default {DEBUG:{...}, useNativeToolTips, ..., VERSION:new Version(), ...}` — the
  app's constants object, loaded into the library via `cconst.loadConstants(cconst1)` in
  app.ts. The library `cconst` is the canonical constants store.
- Errors: implicit-any params on `loadJSON(json)`; field declarations on `Version`.

### 2.2 `core/state.ts`  (72 lines)  — `ModelData extends DataBlock`

The single document datablock. Constructor builds `angle1/angle2/canvas(Canvas)/curvemap
(Curve1D)/vector_test(Vector4)/value/enum/color(Vector4)/text/boolval`. `copyTo(b)` deep
copies. `static blockDefine()` + `static defineAPI(api)` (calls `super.defineAPI`).
- Errors: field declarations; `defineAPI(api)`/`copyTo(b)` implicit any; `super.defineAPI`
  return typing. `ModelData.STRUCT` static string.

### 2.3 `core/datablock.ts`  (424 lines, 130 errors)  — datablock framework

Core mini-framework mirroring Blender's datablock/library model:

- `BlockFlag` enum-object; `BlockClasses: Class[]` registry.
- `DataBlock` base: `{lib_id, lib_users, name}`, `blockDefine()`, `defineAPI(api)`,
  `lib_addUser/remUser`, `loadSTRUCT`, `dataLink`, `copy()` (throws), `static register(cls)`.
- `DataRef {lib_id, name}` + `static fromBlock(block)`; set as `window.DataRef`.
- `BlockSet extends Array`: typed set of blocks with `blockIdMap/blockNameMap/datalib/
  active/_blocks`. Overrides `push`, `remove` (calls `super.remove` — **Array has no
  `remove`**; library augments `Array.prototype.remove`? verify, else TS2339), `get/has/
  uniqueName/regenBlockNameMap/loadSTRUCT`.
- `DataLib`: holds `blocksets[]`, `_blocksetKeys[]`, `blockIdMap/blockNameMap`, `idgen`.
  **Dynamic keys:** `this[key] = bset` for each block typeName (Category G — needs
  `[key:string]: BlockSet | ...` index signature, OR a `Map`). `allblocks` generator,
  `add/remove/has/get/getBlockSet/loadSTRUCT`.
- `buildAPI(api)` — defines list API per block class. **Real bug:** `type.typeName`
  (undefined `type`); shadowed inner `st`. Callback params implicit any.
- Errors: field declarations on all classes; `super.remove` on Array subclass; dynamic
  index signature on `DataLib`; many implicit-any params; `type` undefined.

### 2.4 `core/context.ts`  (148 lines)  — see §1.4

- `BaseOverlay`/`ViewOverlay extends ContextOverlay`; `ContextBase extends Context`;
  `ToolContext`/`ViewContext extends ContextBase`.
- `report(message, color, timeout)` shadows the imported `message`; uses `_appstate`.
- `saveProperty/loadProperty` walk `ctx.screen.sareas`, `sarea.area._area_id`,
  `sarea.editors`.
- Errors: `this.state` member (from library overlay base); `_appstate`; arg-count on
  `super(appstate)` / `pushOverlay` (TS2554 "expected 0, got 1" — confirm library ctor
  arity); implicit-any params; `ctx.*`/`sarea.*` member access.

### 2.5 `core/dynamics.ts`  (248 lines)  — brush dynamics

- `DynamicModes`/`PenKeys` enum-objects.
- `DynamicKey {key,min,max,exp,mode,penkey}` + `copy`. STRUCT.
- `Dynamics {keys:[], keymap:{}}`: `makeDefault`, `addKey(key)`, `clear`, `apply(key,value,
  dynamic_state)`, `copy`, `load(b)`, `loadSTRUCT`. **Real bug:** `makeDefault` calls
  `ret.addKey(new DK("brushSize"), 0.05, 1.0, 0.5, MULTIPLY)` — 5 args to a 1-arg
  `addKey` (TS2554 "expected 1, got 5"). The extra args look like they were meant for the
  `DynamicKey` constructor. `keymap` needs index signature.
- `DynamicsState {pressure, tilt:Vector2}`: `interp/load/copy`. `apply()` reads `ds.tilt[0]`
  and a typo `ds.tile[1]` (**real bug**, `tile`→`tilt`).
- Free-bit search mutates `PropTypes.DYNAMICS`/`DYNAMICS_STATE` (assigns new keys on the
  library `PropTypes` object → TS2339 unless augmented).
- `DynamicsProperty`/`DynamicsStateProperty extends ToolProperty`: `super(PropTypes.X)`
  (TS2554 "expected 4-6, got 1" — `ToolProperty` ctor arity), `getValue/setValue/copyTo`
  with `this.data`.
- Errors: field decls; index signature; PropTypes augmentation; ToolProperty ctor arity;
  implicit-any; the two real bugs.

### 2.6 `core/toolop.ts`  (12 lines)  — see §1.6

Monkey-patches `ToolOp.prototype.undoPre/undo`. `this._undo`, `_appstate`. Patching a
prototype in TS needs the added property on the instance type (declare `_undo` via interface
merge or `declare module`), and `this` typed inside the assigned function.

### 2.7 `api/api_define.ts`  (138 lines)  — see §1.3

Pure schema builder. All `api`, `list`, `key`, `item` params implicit-any (Category B, 31
errors). No field/structural issues — just annotate against `DataAPI`/`DataStruct`/list
callback types. The `.list(...)` named-function bag is the densest cluster.

### 2.8 `draw/draw.ts`  (492 lines, 135 errors)  — THE canvas document model

See §1.7. Classes: `DrawFlags`/`PathTypes` enum-objects; `Material {color,blur,flag}`;
`CanvasPoint extends Vector2 {paths,edges,id}`; `CanvasEdge extends Vector2 {id,material,
v1,v2}`; `CanvasPath {type,id,material,verts}`; `ElementArray extends Array {highlight,
active,_items}`; `Canvas {verts,edges,paths,drawflag,idgen,indexMap,needsUpdate,drawTask,
idmap}`.

- `verts/edges/paths` are plain `[]` in the ctor but used as `ElementArray` (accessed
  `.active`, `.highlight`, `.remove`). **Port decision:** type them as `ElementArray` (and
  construct as `new ElementArray()`), or augment. Currently constructed as `[]` — likely
  should be `ElementArray`. Many TS2339 (`paths/verts/edges/idmap/indexMap` on `Canvas`)
  stem from missing field declarations.
- `idmap`/`indexMap` are `{}` keyed by numeric id → index signature `{[id:number]: ...}`.
- `draw(canvas, g, idstart, idend, force, use_idx)` & `asyncFullDraw(g, canvas)` —
  `g:CanvasRenderingContext2D`, `canvas:HTMLCanvasElement`. Dead code after `return`
  (lines 398-403, 80-81 style) — harmless but TS may flag unreachable.
- `loadSTRUCT` relink has a suspicious line `v.edges = idmap[v.edges]` (assigns array elem
  wrong — possible latent bug; keep behavior, just type).
- Errors: field declarations (huge), index signatures, `g/canvas` param types,
  `Array.remove`, possibly-undefined from `verts[i]`.

### 2.9 `draw/brush.ts`  (80 lines)

- `BrushSettings {size,soft,type,spacing,color}` STRUCT.
- `Brushes: [] & {get}` — array with attached `.get(name)`. Type as a small interface or
  augment. `Brush` base `{size,soft}` with `doSoft(path,fac)/genPaths(canvas)/static
  define()/static register(cls)`. `CircleBrush extends Brush`.
- Errors: field decls; `Brushes.get` attachment; implicit-any params (`path,canvas,name`).

### 2.10 `draw/draw_ops.ts`  (267 lines, 27 errors)  — `DrawOp extends ToolOp`  see §1.6

The paint tool. Legacy `tooldef()` inputs bag. Reads `this.inputs.*`, `ctx.workspace/
canvas`, `this.modal_ctx`, modal mouse/pointer handlers, `this.last_mpos/last_dstate/
_workspace/_undo/havePointerEvents`. `Brushes.get(...)` then `new brush()`.
- Errors: undeclared instance fields; `this.inputs` typing (generic vs declared); `ctx.*`;
  `e:PointerEvent|MouseEvent`; implicit-any (`ctx`, callback args).

### 2.11 `draw/render.ts`  (0 lines)

Empty orphan. Nothing imports it. Make it a no-op module (`export {}`) or delete. Decide in
iteration (low risk). Currently renamed to `.ts`.

### 2.12 `editors/editor_base.ts`  (39 lines)  — `Editor extends Area`  see §1.5

Adds `useDataPathUndo`, `container`, `header`; `getScreen/on_fileload/push_ctx_active/
pop_ctx_active/init`. `contextWrangler.updateLastRef/push/pop(this.constructor, this)`.
- Errors: field decls (`useDataPathUndo`, `container`, `header`); `this.ctx` from Area;
  `this.constructor` typing for contextWrangler.

### 2.13 `editors/screen.ts`  (39 lines)  — `AppScreen extends Screen`

Defines keymap with `HotKey`s calling `_appstate.toolstack.undo/redo` and
`_appstate.screen.splitTool`. `static define(){tagname}`. `keymap` field.
- Errors: `_appstate` (4×); `keymap` field decl; `static define` vs Screen static side.

### 2.14 `editors/menu/menu.ts`  (121 lines)  — `MenuBarEditor extends Editor`

Builds a menu bar (`header.row().menu(...)`). Uses `this.ctx.toolstack`, `this.ctx.state.
saveLocalStorage/clearLocalStorage`, `electron_api.initMenuBar`, `window.haveElectron`,
`this.helppicker`, `this.maxSize/minSize/_height/borderLock/areaDragToolEnabled/background`.
`AreaFlags`, `Menu.SEP`.
- Errors: undeclared fields; `ctx.*`; `window.haveElectron`; TS2417 static side.

### 2.15 `editors/properties/properties.ts`  (514 lines, 42 errors)  — `PropsEditor`

The richest editor. Loads `page.xml` via `loadPage(ctx,url)`; builds graph-pack demo
(`PackNode`, `PackNodeVertex`, `graphPack`), curve, treeview, theme export, mass-set demo.
- Module-level `let graphNodes, solveTimer, seed` — implicit-any (annotate / give types).
- `canvas.g = ...` custom prop; `Blob({mime})` bug ×2; `con.dataPrefix`, `.prop()`,
  `.dependsOn().invert()`; `_pageUIData/_nodes/_nodemap/tabs/container/style` fields.
- `this.constructor.define().tagname` pattern (typing `constructor` statics).
- A `loadPage()` early `return;` leaves dead code (the big `init()` body after `return;`).
- Errors: implicit-any locals/params; custom DOM props; `mime`; field decls; static-side.

### 2.16 `editors/log/log_editor.ts`  (99 lines)  — `LogEditor`

Shows recent toolstack entries. Uses `ctx.toolstack[i].genToolString()`, `toolstack.cur/
length`, `this.table/_last_buf/_last_key/container`.
- Errors: field decls (`table,_last_buf,_last_key`); `ctx.toolstack` indexing; static-side.

### 2.17 `editors/eventgraph/eventgraph.ts`  (164 lines)  — `EventGraphViewer`

Uses modern class-field syntax already. Internal `SocketUI`/`NodeUI` classes.
- **Real bug:** duplicate `update()` method (TS2393, lines 112 & 143). Remove one.
- Fields `canvas = undefined`/`g = undefined` typed as `undefined` then assigned
  `HTMLCanvasElement`/`CanvasRenderingContext2D` → TS2322/TS18048. Re-type fields.
- `eventgraph.theEventGraph`, `window.theEventGraph`; `this.node[type]` indexing;
  `Object.entries(socks)`; `util.cachering.fromConstructor`.

### 2.18 `editors/docbrowser/docbrowser.ts`  (219 lines)  — `DocsBrowserEditor`

Wraps `DocsBrowser` widget; path util fns (`basename/dirname/relative/countstr`);
`SavedDocument` datablock; `platform` async. `window._relative`. Standalone `oldSave()` uses
`this` (TS2683). Getter/setter `browser`. `_browser/savedDocument` fields.
- Errors: implicit-any (`buf,s,path,a1,b1`); `this` in `oldSave`; field decls; `_appstate`;
  module-level `let platform`; static-side.

### 2.19 `editors/workspace/workspace.ts`  (253 lines)  — `WorkspaceEditor extends Editor`

The main canvas viewport. Holds `brush(BrushSettings)`, `dynamics(Dynamics)`, `pan(Vector2)`,
`scale`, `canvas(HTMLCanvasElement)`, `g(ctx2d)`, `_last_dpi/_last_id/minSize`. Builds header
with `prop("workspace.brush.size")` etc. `mousedown` runs `ctx.api.execTool(ctx,
"canvas.draw()")`. `draw()` delegates to the document `Canvas.draw`. `getLocalMouse`.
`this.constructor.define().tagname`.
- Errors: field decls; `ctx.*`; `visualViewport`; static-side; `this[name](e)` dynamic
  dispatch (index by event-name string).

### 2.20 `editors/workspace/workspace_ops.ts`  (53 lines)  — `PanOp extends ToolOp`

- **Real bug:** ctor accesses `this` before `super()` (TS17009). Add `super()`.
- Fields `start_mpos/last_mpos`; `this.modal_ctx`; `ctx.canvas.getLocalMouse` (note: canvas
  is the document `Canvas`, which has no `getLocalMouse` — that's on `WorkspaceEditor`;
  latent logic bug, preserve unless it surfaces).

### 2.21 `theme.ts`  (513 lines)  — data only

`export const theme = {...}` big nested style object; imports `{CSSFont, ThemeScrollBars}`.
Likely few/no errors (data). Watch for `CSSFont(...)` call signatures.

### 2.22 `editors/icon_enum.ts`  (33 lines)

`export const Icons = {...}` numeric enum-object. No errors expected.

---

## 3. Dependency graph (import direction)

```
app.ts ─┬─> state.ts ──> datablock.ts ──> pathux
        ├─> api_define.ts ──> draw/{draw,brush}.ts, dynamics.ts
        ├─> context.ts ──> editors/{workspace,docbrowser,editor_base}, pathux
        ├─> datablock.ts
        ├─> theme.ts
        ├─> editors/workspace/workspace.ts ──> editor_base, workspace_ops, draw_ops, brush, dynamics
        ├─> editors/screen.ts
        ├─> editors/{eventgraph,menu,properties,log,docbrowser}
        ├─> const.ts
        └─> icon_enum.ts
draw_ops.ts ──> brush.ts, dynamics.ts
state.ts ──> draw/draw.ts (Canvas), icon_enum
```

Leaf-first port order (matches CLAUDE.md "leaves-first"): `icon_enum`, `const`, `theme`,
`brush`, `draw`, `dynamics`, `datablock` → `state` → `context`, `editor_base` → ops
(`toolop`, `draw_ops`, `workspace_ops`) → editors → `api_define` → `app`.

---

## 4. Open structural questions (to resolve during iteration)

1. **`_appstate` & window globals** — one `global.d.ts` augmenting `Window` + ambient
   `var`s, vs. importing `_appstate` properly? (Leaning: ambient `global.d.ts`, lowest
   churn, matches runtime reality.)
2. **Editor `static define()` (TS2417)** — what is the library `Area.define` static
   signature, and do we type each `define()` return to an exported `AreaDefine`-like type?
3. **ToolOp typing** — adopt the CLAUDE.md `ToolOp<Inputs,Outputs>` generic pattern for
   `DrawOp`/`PanOp` (real types on `this.inputs`), or declare instance fields and lean on
   base `inputs`? (Leaning: generics, to match intended design — but larger change.)
4. **Context member surfacing** — does library `ContextOverlay` expose `state`, and is
   `Context` generic over an app-state type? Determines how `ctx.canvas/workspace/...` type.
5. **`Canvas.verts/edges/paths`** — retype as `ElementArray` (and construct as such) so
   `.active/.highlight/.remove` are legal? Confirms `ElementArray` is the intended type.
6. **`Array.prototype.remove`** — does the library augment `Array` (it's used on plain
   arrays everywhere)? If so the lib types should already declare it; verify.
7. **`DataLib` dynamic block-set keys** — index signature vs `Map`. Index signature
   preserves the `datalib.model_data` access pattern used in `context.ts::data`.

## 5. Known real bugs found while reading (fix as we type, preserve behavior elsewhere)

- `datablock.ts buildAPI`: `type.typeName` → undefined `type` (should be `def`).
- `dynamics.ts Dynamics.makeDefault`: `addKey(new DK(...), 0.05, ...)` passes 5 args to a
  1-arg `addKey`.
- `dynamics.ts Dynamics.apply`: `ds.tile[1]` typo → `ds.tilt[1]`.
- `eventgraph.ts`: duplicate `update()`.
- `workspace_ops.ts PanOp`: missing `super()` before `this`.
- `properties.ts`: `new Blob([...], {mime: ...})` → should be `{type: ...}` (×2).
- `app.ts loadLocalStorage`: `return this.loadFile(buf)` before a dead `try/catch`.
- `draw.ts loadSTRUCT`: `v.edges = idmap[v.edges]` inside a per-edge loop looks wrong.

These are noted; fix only where it doesn't change intended runtime behavior, and call out
the behavior-changing ones (the `addKey` arity, the `tile` typo) explicitly.

---

## 6. Library type facts (confirmed from `.tmp-types/`)

Concrete shapes pulled from the emitted library declarations. These resolve several of the
§4 questions and dictate the exact fixes.

### 6.1 `Area<CTX>` (`screen/ScreenArea.d.ts`)

`export declare class Area<CTX extends IContextBase = IContextBase> extends UIBase<CTX>`.
Already declares the members our editors use: `borderLock, flag, pos?, size?, minSize,
maxSize, keymap?, header: Container<CTX>|undefined, helppicker, areaName, ctx (via UIBase),
makeHeader, getDefault (UIBase), setCSS, update, init, on_resize, on_fileload,
push_ctx_active, pop_ctx_active, getScreen, getKeyMaps, draw, copy, loadSTRUCT`, and
`static define(): IAreaDef`, `static register/getActiveArea`.

```ts
export interface IAreaDef {
  tagname: string;            // required
  areaname: string;           // required
  apiname?: string; flag?: number; uiname?: string; icon?: number; borderLock?: number;
}
```

**TS2417 fix (confirmed):** the error is *"types returned by define()/blockDefine() are
incompatible"* — subclass return literal is missing properties the base returns. Two clean
fixes:
- **Editors:** annotate `static define(): IAreaDef { return {...} }`. With an explicit
  `IAreaDef` return type, omitting optionals (icon/flag/uiname) is legal and the inferred-
  literal-vs-sibling comparison disappears. Note **`AppScreen` (extends `Screen`) and
  editors must supply both `tagname` AND `areaname`** — `AppScreen.define()` currently
  returns only `{tagname}`; check whether `Screen.define` requires areaname (it may differ
  from `Area`).
- **Datablocks:** base `DataBlock.blockDefine()` returns `{uiName, typeName, defaultName,
  flag, icon}`. Introduce `export interface IBlockDef { uiName: string; typeName: string;
  defaultName: string; flag?: number; icon?: number }` and annotate
  `static blockDefine(): IBlockDef` on both `DataBlock` and `ModelData`. Then `ModelData`
  omitting flag/icon is legal.

### 6.2 `Context` / `ContextOverlay` (`path-controller/controller/context.d.ts`)

- `class Context<Overlays extends ContextLike = ContextLike>` with **`state: unknown`** and
  **`constructor(appstate: unknown)`** (so `super(appstate)` in `ToolContext`/`ViewContext`
  is fine — the TS2554 "expected 0, got 1" comes from a *different* call; find it in
  iteration). `pushOverlay(overlay)`, `static register(cls)`.
- `ContextOverlay` instances expose `state: unknown` (getter/setter over `_state`).

**Question 4 resolved:** `state` is `unknown`, so `this.state.toolstack` etc. error. Fix by
**narrowing `state` in our subclasses**: in `BaseOverlay`/`ViewOverlay`/`ContextBase` add
`declare state: AppState;` (AppState ⊆ unknown, legal). That makes every getter
(`this.state.toolstack/api/datalib/screen/...`) type against `AppState`. This is the single
highest-leverage fix for the context spine — do it early. `AppState` is exported from
`core/app.ts`, but `context.ts` is imported BY `app.ts` (cycle). Use a `type`-only import
(`import type { AppState } from "./app.js"`) to avoid a runtime cycle.

### 6.3 `ToolProperty<T, TYPE>` (`path-controller/toolsys/toolprop.d.ts`)

`class ToolProperty<T = unknown, TYPE extends number = number>` already declares
**`data: T`**, plus `subtype, wasSet, apiname, uiname, description, flag, icon, ...`.
`ToolPropertyIF` ctor is `(type?, subtype?, apiname?, uiname?, description?, flag?, icon?)`
— all optional, so `super(PropTypes.DYNAMICS)` is fine.

**Implication for `dynamics.ts`:** declare `class DynamicsProperty extends
ToolProperty<Dynamics>` and `DynamicsStateProperty extends ToolProperty<DynamicsState>` so
`this.data` is correctly typed (don't redeclare `data`). The "expected 4-6 args" TS2554 in
dynamics is NOT the ToolProperty ctor — track it down in iteration (likely a fluent
`.range()`/builder call or `ListProperty`).

### 6.4 `Array.prototype.remove` (`path-controller/util/util.d.ts`)

The library has `declare global { interface Array<T> { remove(item: T,
ignore_existence?: boolean): void } ... }`. **Question 6 resolved:** `.remove` on plain
arrays type-checks *as long as the global augmentation is in scope*. It is reachable through
the `pathux` barrel; if any file still errors on `.remove`, ensure the util/polyfill types
are transitively included (they are, via `pathux_with_docbrowser`). No per-call fix needed.

### 6.5 Decisions adopted (updating §4)

- **Q1 `_appstate`/window globals:** add `example/global.d.ts` with `declare global { interface
  Window {...} ; var _appstate: import("./core/app.js").AppState; var redraw_all: () => void;
  var redraw_all_full: () => void; var CTX: any; var theEventGraph: any; var haveElectron:
  boolean; var DataRef: ...; var _relative: ...; }`. Resolves bare-name reads + window writes.
- **Q2 Editor static side:** annotate `static define(): IAreaDef`; add `IBlockDef`. (6.1)
- **Q4 context:** `declare state: AppState` in overlays/ContextBase + `import type`. (6.2)
- **Q5 `Canvas.verts/edges/paths`:** retype as `ElementArray` and construct as
  `new ElementArray()` (they're used with `.active/.highlight/.remove`). Confirm no nstructjs
  read path depends on them being plain arrays (loadSTRUCT rebuilds them).
- **Q3 ToolOp generics (DECIDED — adopt generics):** port `DrawOp`/`PanOp` to the
  strongly-typed `ToolOp<Inputs, Outputs>` pattern from CLAUDE.md. Declare the input slot
  types as generic params (`{brushSize: FloatProperty, brushType: StringProperty, points:
  ListProperty<Vec2Property>, pointDynamics: ListProperty<DynamicsStateProperty>, dynamics:
  DynamicsProperty, ...}`) so `this.inputs.brushSize` is a real `FloatProperty`. `tooldef()`
  inputs must match the generic slot list. Still declare the non-input instance fields
  (`_undo, last_mpos, last_dstate, _workspace, havePointerEvents`). The `toolop.ts`
  prototype patches need `_undo` on the `ToolOp` instance type (interface merge).

- **BUGS (DECIDED — fix all, call out):** fix every real bug from §5 as encountered,
  including behavior-changing ones (`addKey` arity in `Dynamics.makeDefault`, `ds.tile`→
  `ds.tilt` typo). Maintain the running fixed-list in §5 / iteration log so each change is
  reviewable.
- **Q7 DataLib block-set keys:** use an index signature `[k: string]: BlockSet | ... ` kept
  minimal, preserving `datalib.model_data.active` access from `context.ts`.
