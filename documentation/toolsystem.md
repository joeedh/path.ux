<!-- toc -->

- [Tool System](#tool-system)
  - [Registration](#registration)
    - [Macro defaults](#macro-defaults)
    - [A registry of your own](#a-registry-of-your-own)
  - [Context](#context)
  - [Undo](#undo)
  - [tooldef()](#tooldef)
  - [Tool Properties](#tool-properties)

<!-- regenerate with pnpm markdown-toc -->

<!-- tocstop -->

# Tool System

Tools are what the user uses to change state in the model. They handle undo, can take control of events if needed and
in general are foundational to path.ux and it's associated projects.

Tools all inherit from [ToolOp](@ToolOp), which roughly looks like this (see Context section for an
explanation for what the "ctx" parameters are):

```
class SomeTool extends ToolOp {
  static tooldef() {return {
    uiname   : "Tool",
    toolpath     : "module.tool"
    inputs   : ToolOp.inherit({
    }), //use ToolOp.inherit to flag inheritance
    outputs  : {}
  }}

  static invoke(ctx, args) {
    /*create a new tool instance.
      args is simple key:val mapping
      where val is either a string, a number
      or a boolean.*/

    //super.invoke will create tool and parse args
    return super.invoke(ctx, args);
  }

  //add a 2d line
  makeDrawLine(v1, v2, css_color);

  //reset temporary drawing geometry
  resetTempGeom();

  calcUndoMem(ctx) {
    return size in bytes of stored undo data
  }
  undoPre(ctx) {
    //create undo data
  }
  undo(ctx) {
    //execute undo with data made in previous call to this.undoPre
  }
  exec(ctx) {
    //execute tool
  }
  modalStart(ctx) {
    super.modalStart(ctx);

    //start interactice mode
  }
  modalEnd(was_cancelled) {
    super.modalEnd(was_cancelled);
    //end interactive mode
  }
  on_[mousedown/mousemove/mouseup/keydown](ctx) {
    //interactive mode event handler
  }
}

ToolOp.register(SomeTool);
```

## Registration

A tool is unreachable by toolpath until it is registered. `ToolOp.register`, `unregister`
and `isRegistered` are the **default registry's** public API, and the module-level tables
are that registry's own tables, by identity rather than by copy:

| Export              | Holds                                                   |
| ------------------- | ------------------------------------------------------- |
| `ToolClasses`       | every registered class, in registration order           |
| `ToolPaths`         | toolpath to class, filled lazily by `initToolPaths`     |
| `MacroClasses`      | the type classes `ToolMacro` generates for saved macros |
| `SavedToolDefaults` | last-used input values, keyed by toolpath               |

Writing to one of them writes to `defaultRegistry`. None of them is a snapshot.

Saved defaults are keyed by **toolpath**, not by class. Two classes reporting the same
toolpath share one set of values, including a subclass that declares no `tooldef()` of its
own.

### Macro defaults

A `ToolMacro` has no toolpath of its own, so `_getTypeClass` generates one from the macro's
shape — its member class names, the subclass toolpath where it is subclassed, and its input
names — under the reserved prefix `macro.`. The key is structural, so two macros built the
same way share one set of values, and the prefix keeps them out of the tree the authored
toolpaths land in.

The policy is that **macro inputs are macro-scoped**, seeded from the individual toolpath:

- `add()` **aliases**. Every member input without `PropFlags.PRIVATE` goes into the macro's
  `inputs` as the member's own property object, so the macro's inputs *are* its members'.
- A member reads its **own** toolpath's saved value when it is constructed, which seeds the
  macro.
- `exec` and `modalStart` then call `loadDefaults(false)`, which overrides anything the
  author has not set with the **macro-scoped** value. A macro cannot do this in its
  constructor, since its members are added afterwards.
- The save goes to the macro key: `saveDefaultInputs` writes every aliased property there,
  leaving the members' own toolpaths untouched.

`PropFlags.PRIVATE` and `connect()` are the two opt-outs. `PRIVATE` keeps a property out of
`add()`'s aliasing; `connect()` deletes a linked property from `inputs`, which takes it back
out of macro-scoped defaults and out of the generated key.

Nothing seeds a macro's values at generation time, on purpose: a seeded value would satisfy
`hasDefault`, and `loadDefaults` would then overwrite the member's individual default with
it. So a macro's values arrive on its first save, and `set()` warns that the class was never
registered — which is true, and is how a macro type class always reaches a cache.

**This is not in tension with the duplicate-toolpath rule below.** A macro-key value
overriding an individual toolpath's is two different toolpaths holding values for one
property object, resolved by an explicit `loadDefaults` call. The duplicate rule is about
two registries offering one toolpath, where there is no principled way to choose.

### A registry of your own

`ToolRegistry` holds one set of those four tables, so a subsystem can carry a tool namespace
the rest of the app never sees. `ModelInterface.registries` is the seam — an **ordered
list**, so a subsystem can have its own tools without losing the built-ins:

```js
const registry = new ToolRegistry();
registry.register(PaneTool);

const api = new DataAPI();
api.registries = [registry, defaultRegistry];
buildToolSysAPI(api, false, rootStruct, RootContextClass);
```

`api.registry` is an alias for the first entry, so the single-registry form still reads
`api.registry = registry`. Composition is per api: two APIs may list the same two registries
in different orders.

The api merges the list into a table of its own, `api.toolPaths`, mapping each toolpath to
the class and the registry that supplied it. `parseToolPath`, `parseToolArgs`, `createTool`
and `getToolDef` are one lookup in it, and so is the `ctx.toolDefaults` getter
`buildToolSysAPI` installs. The free `parseToolPath` and `initToolPaths` functions and the
`window.parseToolPath` hook stay on the default registry. `getToolPathHotkey` consults no
registry at all, since it matches toolpath strings against the screen's keymaps.

**Within one api a toolpath names one tool.** Two registries offering the same one is an
error naming both, thrown where the table is merged. That is what makes a bare toolpath
usable as an identity in a record that outlives the call. One registry cannot collide with
itself — `paths` is keyed on toolpath, so two classes in one registry sharing one stays
last-wins — which is why constructing an api never throws. Macro keys are the one exemption,
and first wins: the key is structural, so two registries holding one means two macros of the
same shape.

The table is built on first read and dropped when a listed registry changes, since merging
is also the collision scan and a rescan in place cannot see a duplicate it introduces.
`register` and `unregister` tell the APIs built against them; an api that lists a registry it
never built into rebuilds on a miss instead.

A `ToolOp` constructor reads its saved defaults and has no ctx to reach a registry through,
so `register` stamps the registry on the class itself, and `hasDefault`, `getDefault` and
`saveDefaultInputs` read it back off `this.constructor`. A subclass inherits its parent's
answer through the static prototype chain, deliberately: an unregistered subclass belongs
wherever its parent does.

Two things to know before building one:

- **Struct names are global.** nstructjs registers by class name across the process, and
  saved files in consumer projects depend on those names. A registry is a runtime concept
  only; struct names are never namespaced by one.
- **Saved values stay per registry, but the binding is the api's.** `ToolPropertyCache` is
  storage: a flat map from toolpath to that tool's values. The tree
  `ctx.toolDefaults.<prefix>.<tool>.<prop>` walks belongs to the api, built from the merged
  table, with each tool's leaf being the owning registry's own record. So a prefix two
  registries both use is one node carrying both halves, and a write through the datapath
  lands in the registry that owns the tool. Two graph panes still do not forget each other's
  last-used values.

## Context

The foundation of the tool system is a special Context struct that's provided by client code. Think of it as defining "arguments" for tools. Path.ux can use any context struct, but requires the following properties be defined:

```
class Context {
  get api() {
    //return reference to a controller.ModelInterface
  }

  get appstate() {
    //return reference to main appstate global
  }

  get screen() {
    //return reference to main FrameManager.screen
  }
}
```

In addition, path.ux has hooks to provide UI context, specifically which are is currently active. To do this,
either override the following methods in ScreenArea.Area.prototype, or subclass Area:

```
  //called when area should be considered "active"
  push_ctx_active() {
  }

  //called when area should be considered "inactive"
  pop_ctx_active() {
  }
```

## Undo

Typically tools will inherit from a base class with a general, brute-force undo (i.e. saving the
entire application and then reloading it on undo). Additionally to save on speed and memory subclasses
can override undoPre and undo with their own implementation.

## tooldef()

Tools have a special tooldef() static function that "defines" the tool. It returns things like
what properties the tool has, it's name, it's path in the data path system, etc.

## Tool Properties

Tools have input and output slots. See toolprop.js. There are integer properties, float properties,
various linear algebra properties (vectors, matrices), enumerations, bitflags, and in addition client code
may provide it's own property classes.
