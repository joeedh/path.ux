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

## Running the example app under NW.js

`pnpm nwjs` launches the `example/` app in NW.js (SDK flavor, from the `nw`
devDependency) with the Chrome DevTools Protocol enabled on port 9222
(override with `--port=<n>`). It builds `example/dist/app.js` first if
missing. `example/package.json` doubles as the NW.js manifest: its `main` is
`nwjs_app.html`, which sets `window.haveNwjs` so the app picks the NW.js
platform backend (`scripts/platforms/nwjs/`). Electron ignores that field and
is launched explicitly instead: `npx electron example/electron_app.cjs`.

Drive the running app over CDP with `pnpm nwjs:cdp` (each invocation
connects, acts, and disconnects; the app keeps running):

```bash
pnpm nwjs:cdp pages                  # list debuggable pages
pnpm nwjs:cdp eval "document.title"  # evaluate JS in the app page
pnpm nwjs:cdp screenshot shot.png    # capture the window
pnpm nwjs:cdp click 100 200          # click at viewport coordinates
pnpm nwjs:cdp key Enter              # press a key (Playwright key names)
```

Gotcha: screenshots are captured at the window's `devicePixelRatio` (often
1.25 on Windows) while `click` takes CSS-pixel coordinates — divide
screenshot pixel positions by `devicePixelRatio` before clicking.

For richer automation, import `connectNwjs()` from `buildtools/nwjs-cdp.mjs`
in a Node script: it returns `{ browser, page }` where `page` is a Playwright
`Page` connected over CDP; `browser.close()` only disconnects.

The NW.js binary is downloaded by the `nw` package's postinstall script
(allowed via `pnpm.onlyBuiltDependencies`). If the launcher reports a missing
binary, run `pnpm rebuild nw`.

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
 `generated/` — auto-generated catalogs: data paths (`pnpm run gen:paths`) and theme keys (`pnpm run gen:themes`)

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

## Theme typing (`getDefault`)

Theme lookups go through `UIBase.getDefault(key)` (style-class scoped, with
`parentStyle`/`base` fallback). The keys are catalogued so `getDefault` can be
type-checked, mirroring the data-path catalog above.

- **Declare** the keys a widget uses in its `static define().theme`, mapping each
  to a `t.*` token from `scripts/core/theme_schema.ts` (`t.number`, `t.color`,
  `t.font`, …; nest an object for sub-records like `disabled`/`highlight`).
  Declare the *returned* type — a `"12px"` value reads back as a number, so use
  `t.number`. A widget inherits its parent class's declarations; only list what
  it adds or overrides. Annotate the migrated `define()` with the exported
  `UIBaseDefinition` return type so subclasses that omit `theme` still satisfy
  the static-side variance check.
- **Opt in** to typed lookups by passing the class name as `UIBase`'s third type
  param: `class Button<CTX…> extends ButtonEventBase<CTX, "Button">` (thread a
  `SELF extends string = "UIBase"` param through any intermediate base class).
- **Regenerate** with `pnpm run gen:themes` (walks the registry, resolves
  inheritance + `theme.ts` in JS, emits flat per-class types). It writes
  `generated/themes.ts` (augments the `ThemeKeyRegistry` seam) and
  `generated/themes.json`. `generated/` is gitignored — it's a build artifact.
- **Strict check**: the default `pnpm run typecheck` keeps `getDefault` loose
  (empty seam) so the library builds standalone; existing `as number`/`as CSSFont`
  casts stay load-bearing there. Run `pnpm run gen:themes && pnpm run
  typecheck:themes` (includes the catalog) to type-check `getDefault` against the
  per-class keys for migrated widgets.
- **CI**: run `pnpm run gen:themes --strict` (fails on a `define().theme` key
  absent from `theme.ts` — i.e. a typo) followed by `pnpm run typecheck:themes`.
- An **optional**, opt-in ESLint rule (`buildtools/eslint-rules/valid-theme-key.mjs`)
  flags literal `getDefault("…")` keys absent from the whole catalog. It is not
  wired into `eslint.config.js` by default (it currently surfaces ~15 legitimately
  un-themed keys read with runtime defaults); enable it as a `pathux/valid-theme-key`
  warning if you want typo coverage.

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

**Commit a parent repo and its submodules together** whenever their branch names
match, or both are on their default branches: make the submodule commit, then bump
the parent's gitlink, as one logical change. This applies both to
`path-controller` under path.ux and to path.ux itself under any superproject that
embeds it. (Pinned third-party submodules — e.g. a parent's `extern/imgui`
— are the exception and are bumped deliberately, not auto-co-committed; path.ux has
no such pinned submodules.)

**Parent on a branch, submodule on its default branch:** do not silently commit or
advance the submodule's shared default branch. Ask the user whether they want to
commit and/or push the submodule's default branch (and bump the gitlink) before
doing so. This applies to `path-controller` under path.ux and to path.ux itself
under any superproject.

**Worktree teardown:** before removing a worktree, every submodule sitting on its
default branch (path.ux has no pinned exceptions) must be committed and pushed, so
no work is lost when the checkout goes away.
