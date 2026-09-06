<!-- toc -->

- [Tool System](#tool-system)
  - [Registration](#registration)
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

### A registry of your own

`ToolRegistry` holds one set of those four tables, so a subsystem can carry a tool namespace
the rest of the app never sees. `ModelInterface.registry` is the seam:

```js
const registry = new ToolRegistry();
registry.register(PaneTool);

const api = new DataAPI();
api.registry = registry;
buildToolSysAPI(api, false, rootStruct, RootContextClass);
```

Everything reached through `ctx.api` then resolves against that registry: `parseToolPath`,
`parseToolArgs`, `createTool`, `getToolDef`, and the `ctx.toolDefaults` getter
`buildToolSysAPI` installs. The free `parseToolPath` and `initToolPaths` functions and the
`window.parseToolPath` hook stay on the default registry. `getToolPathHotkey` consults no
registry at all, since it matches toolpath strings against the screen's keymaps.

A `ToolOp` constructor reads its saved defaults and has no ctx to reach a registry through,
so `register` stamps the registry on the class itself, and `hasDefault`, `getDefault` and
`saveDefaultInputs` read it back off `this.constructor`. A subclass inherits its parent's
answer through the static prototype chain, deliberately: an unregistered subclass belongs
wherever its parent does.

Two constraints to know before building one:

- **Struct names are global.** nstructjs registers by class name across the process, and
  saved files in consumer projects depend on those names. A registry is a runtime concept
  only; struct names are never namespaced by one.
- **Toolpath prefixes are shared by name.** Two registries holding `foo.a` and `foo.b`
  describe `foo` with a single `DataStruct` carrying both members. Their saved values stay
  separate, so reading the other registry's path resolves and then finds nothing — but a
  registry cannot give an existing prefix a different shape.

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
