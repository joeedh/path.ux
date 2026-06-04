# path.ux

HTML5 UI library with Blender RNA-style data binding.

## Build

This project uses **pnpm** as its package manager. Use `pnpm` (and `pnpm run …`)
rather than `npm`.

```bash
pnpm run build          # Rollup bundle → dist/pathux.js
pnpm run typecheck      # tsgo --noEmit
pnpm run test           # vitest
pnpm run format         # prettier --write
pnpm run format:check   # prettier --check
```

Use `tsgo` to typecheck instead of `tsc`, e.g.
`pnpm exec tsgo --noEmit`.

## Vector classes

By design vectors do not have a simple index signature.
Instead, indices up to LEN type to number, while indices above
LEN type to number | undefined.

This is to prevent mixing of incompatible vectors.

This can create problems with iteration, for example:

  ```ts
  let v = new Vector3()
  for (let i=0; i<3; i++) {
    // will not work
    v[i] = i
    // will work
    v[i] = i as Number3
  }
  
  //alternative with IndexRange:
  for (const i of IndexRange(3)) {
    v[i] = i
  }
  ```

## Project Structure

 `scripts/` — main source (TypeScript, converting from JS)
 `scripts/path-controller/` — git submodule (data binding, tool system, math)
 `scripts/core/` — UIBase, Container, theme, animation
 `scripts/widgets/` — UI widget classes (extend UIBase)
 `scripts/screen/` — FrameManager, ScreenArea, area management
 `scripts/platforms/` — platform abstraction (web, electron)
 `scripts/simple/` — simple app framework
 `documentation/` — documentation source (markdown)
 `dist/` — built output
 `generated/` — auto-generated data-path catalog (`pnpm run gen:paths`)

## Data API paths

See [documentation/controller.md](documentation/controller.md) for the datapath
controller overview: how model classes are wrapped (`DataAPI` / `DataStruct` /
`DataPath`), how the UI references values by path, and how to look up structs by
name (`getStructByName`).

Valid `path` strings for `container.prop("...")`, related widget methods, and
`<prop path="...">` xmlpage tags are catalogued in `generated/API_PATHS.md`
(human/LLM-readable) and `generated/api-paths.json` (machine-readable), with each
path's type, UI name, range, unit, and enum items. `generated/datapaths.ts` exports
a `KnownDataPath` union of the valid non-indexed paths. Regenerate after changing any
`api_define` with `pnpm run gen:paths` (walks the app's `defineAPI()`).

## Conventions

 Do not add type annotations if types can be inferred
 TypeScript: `strictNullChecks: true` in all tsconfigs
 No `any`: except at `JSON.parse` boundaries, immediately narrowed
 Formatting: prettier (see `.prettierrc`)
 Tests: vitest for unit tests, Playwright for DOM widget tests
 Modules: ES modules (`"type": "module"` in package.json)
 Entry point: `scripts/pathux.ts` → re-exported from root `pathux.js`

## DOM events (future direction)

Historically widgets signal value/selection changes through bespoke
`on_change`-style callback properties; very few use real DOM events. We are
moving towards standard DOM events (e.g. `dispatchEvent(new
CustomEvent("change", { detail }))`) so consumers can use
`addEventListener`. `scripts/widgets/ui_listbox.ts` is the first widget
converted: it dispatches a `"change"` event (`detail = { id, item }`) and keeps
its `on_change` callback only as a deprecated backwards-compat shim. New
widgets should prefer DOM events; convert existing callbacks opportunistically,
leaving the old callback in place and `@deprecated`.

## Widgets

- [ListBox](documentation/listbox.md) — scrollable single-select list, in
  either manual (`addItem`) or `DataList`-backed mode, with a typed `"change"`
  event and user-resizable corner grip.

## Context

Children of `UIBase` should all take a `CTX` generic parameter that extends
`IContextBase` and defaults to `IContextBase`.  They should pass this parameter
up the inheritance chain, e.g.:

```ts
class MyWidget<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
}
```

## Widget values

If widgets implement `getValue` with a specific type they should pass that to UIBase, e.g.

```ts
class MyNumberWidget<CTX extends IContextBase = IContextBase> extends UIBase<CTX, number> {
  value = 1.0
  getValue(): number {return this.value}
  setValue(value: number) {return this.value}
}

```

## ToolOp

ToolOp has a strongly typed property system.  Properties are created
at runtime in the tooldef static method, and their types are declared in parameters
that are passed up the inheritance chain to ToolOp.

For example:

```ts
class Tool extends ToolOp<{
  input1: FloatProperty,
  input2: IntProperty
}, {
  output1: StringProperty,
  output2: BoolProperty
}> {
  static tooldef() {
    return {
      toolpath: 'tool',
      // inputs must match input list in generic parameters
      inputs: {
        input1: new FloatProperty(2.0)
        input2: new IntProperty(1)
      },
      // outputs must match output list in generic parameters
      outputs: {
        output1: new StringProperty("out1"), 
        output2: new BoolProperty(false),
      } 
    }
  }
}
```

To handle inheritance, do this:

```ts

class Tool1<Inputs extends PropertySlots, Outputs extends PropertySlots> extends ToolOp<
Inputs & {
  input1: FloatProperty,
  input2: IntProperty
}, 
Outputs & {
  output1: StringProperty,
  output2: BoolProperty
}> {
  static tooldef() {
    return {
      toolpath: 'tool1',
      // inputs must match input list in generic parameters
      inputs: {
        input1: new FloatProperty(2.0)
        input2: new IntProperty(1)
      },
      // outputs must match output list in generic parameters
      outputs: {
        output1: new StringProperty("out1"), 
        output2: new BoolProperty(false),
      } 
    }
  }
}

// tool2 will have access to both it's parent class's properties and it's own
class Tool2 extends Tool1<{
  input3: FloatProperty,
  input4: IntProperty
}, {
  output3: StringProperty,
  output4: BoolProperty
}> {
  exec(ctx){ 
    const {input1, input2, input3, input4} = this.getInputs()
  }

  static tooldef() {
    return {
      toolpath: 'tool2',
      // inputs must match input list in generic parameters
      inputs: {
        input3: new FloatProperty(2.0)
        input4: new IntProperty(1)
      },
      // outputs must match output list in generic parameters
      outputs: {
        output3: new StringProperty("out1"), 
        output4: new BoolProperty(false),
      } 
    }
  }
}
```

## Submodule

The `scripts/path-controller/` directory is a git submodule. Commit changes there separately before updating the parent repo's submodule pointer.

```bash
cd scripts/path-controller && git add -A && git commit -m "msg"
cd ../.. && git add scripts/path-controller && git commit -m "update submodule"
```
