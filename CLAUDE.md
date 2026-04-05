# path.ux

HTML5 UI library with Blender RNA-style data binding.

## Build

```bash
npm run build          # Rollup bundle → dist/pathux.js
npm run typecheck      # tsc --noEmit
npm run test           # vitest
npm run format         # prettier --write
npm run format:check   # prettier --check
```

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
 `docs_src/` — documentation source (markdown)
 `dist/` — built output

## Conventions

 Do not add type annotations if types can be inferred
 TypeScript: `strictNullChecks: true` in all tsconfigs
 No `any`: except at `JSON.parse` boundaries, immediately narrowed
 Formatting: prettier (see `.prettierrc`)
 Tests: vitest for unit tests, Playwright for DOM widget tests
 Modules: ES modules (`"type": "module"` in package.json)
 Entry point: `scripts/pathux.ts` → re-exported from root `pathux.js`

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
