# JSX UI construction

A typed, compile-checked way to build path.ux UI trees. JSX lowers onto the
**same** `Container` builder API that the [xmlpage](../scripts/xmlpage/xmlpage.ts)
system uses — it is a one-shot builder, **not** React: there is no virtual DOM
and no reconciler. path.ux's own reactivity (`dependsOn`, `update()`) stays in
charge.

Use JSX for app-authored UI where you want compile-time safety; keep xmlpage for
runtime- or user-authored pages that are fetched and rendered without a build
step. Both target the same widgets, so they interoperate freely.

## Why JSX over XML

- `<prop path="...">` is type-checked against `KnownDataPath` (the same type
  `container.prop()` accepts). After `pnpm run gen:paths` augments
  `DataPathRegistry`, unknown paths become **compile errors** instead of
  xmlpage's silent runtime `console.warn`.
- Tag names and attributes are checked by `tsgo` — the loop you already run.
- Interactive wiring (`ref`, callbacks) lives next to the layout instead of in a
  separate `getElementById` pass.

## Setup

`tsconfig.json` (already configured in this repo) uses the classic runtime:

```jsonc
{
  "compilerOptions": {
    "jsx": "react",
    "jsxFactory": "jsx",
    "jsxFragmentFactory": "Fragment"
  }
}
```

esbuild mirrors this (`jsx: "transform"`, `jsxFactory: "jsx"`,
`jsxFragment: "Fragment"`). Every `.tsx` file must import the factory:

```tsx
import { jsx, Fragment } from "pathux"; // or the local re-export, e.g. "./pathux.js"
```

## Building a page

```tsx
import { jsx } from "./pathux.js";
import type { Container } from "./pathux.js";

export function MyPage(onStrip?: (c: Container) => void) {
  return (
    <tabs pos="left">
      <tab label="Settings">
        <panel label="Transform" path="data">
          <strip mode="vertical">
            <prop path="angle1" />
            <prop path="angle2" />
          </strip>
        </panel>
        <strip ref={onStrip} />
      </tab>
    </tabs>
  );
}
```

Mount it under any `Container`:

```ts
import { mount } from "pathux";

mount(ctx, this.container, MyPage((strip) => {
  // ref fires once the widget exists — replaces getElementById wiring
  const a = strip.prop("data.boolval");
  const b = strip.prop("data.color");
  b.dependsOn("hidden", a, "value").invert();
}));
```

## How it works

1. `jsx()`/`jsxs()` build an immutable descriptor tree (`PXNode`). They do **not**
   call builder methods — JSX evaluates children before parents, but builders
   need the parent/`ctx`/`dataPrefix` first.
2. `mount()` calls `compile()`, which serializes the IR to an xmlpage source
   string. Function-valued props (`ref`, handlers) can't travel through the
   string, so each ref'd node is assigned a generated `id` and its callback is
   recorded.
3. The string is handed to `initPage` — the exact dispatch xmlpage uses — so
   there is a single dispatch table behind both front ends.
4. After building, each `ref` is resolved via `getElementById` and invoked.

A future pass could teach the xmlpage `Handler` to walk the IR directly and skip
the XML round-trip.

## Notes & limits

- `path` props accept `KnownDataPath`; relative/prefixed paths still work because
  the type also permits arbitrary strings.
- Text children become a widget's label (`<button>Save</button>`,
  `<tool path="...">Run</tool>`).
- `<Fragment>` groups siblings without a wrapper container.
- Custom registered widgets (`*-x` tags) are accepted via a loose intrinsic
  entry and fall back to `UIBase.createElement`.
- Reference port: [`example/page.tsx`](../example/page.tsx) is a JSX port of
  [`example/page.xml`](../example/page.xml); both still build.
