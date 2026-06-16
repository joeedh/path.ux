# Plan: Typed JSX layer for path.ux UI construction

A compile-checked JSX front end that lowers onto the **existing** `Container`
builder API, sharing dispatch logic with `scripts/xmlpage/xmlpage.ts`. JSX is a
one-shot builder (no vdom/reconciler); path.ux's own reactivity (`dependsOn`,
`update()`) stays in charge. xmlpage is kept for runtime/user-authored pages.

## Goals

- `<prop path="data.angle1"/>` is **type-checked** against `KnownDataPath` and
  surfaces errors in `pnpm run typecheck` (tsgo) — replacing xmlpage's silent
  `console.warn`.
- Logic (refs, `dependsOn`, events) co-located with layout — no second
  `getElementById` file.
- Zero new heavy deps: reuse esbuild (already the bundler) + tsgo.
- xmlpage and JSX share one dispatch table and both target `Container`.

## Non-goals

- No React, no virtual DOM, no runtime reconciliation.
- No removal of xmlpage / `loadPage` (runtime + hot-reload path stays).
- No change to the datapath generator's output format (only consumption).

## Design

JSX evaluates bottom-up, but `Container` builders need parent + `ctx` +
`dataPrefix` *before* constructing children. So the factory must NOT call
builders eagerly. It produces an immutable descriptor tree (IR); a separate
`mount()` pass replays it top-down through the same builders with the same
`push()/pop()` prefix semantics as `Handler`.

```
.tsx ──esbuild/tsgo──▶ jsx()/jsxs() ──▶ PXNode IR ──mount(ctx,parent)──▶ Container tree
                                                         │
                              shares dispatch table with xmlpage Handler
```

## Phases

### Phase 1 — Runtime + IR (no typing yet)
- `scripts/jsx/jsx-runtime.ts`: export `jsx`, `jsxs`, `jsxDEV`, `Fragment`,
  and `PXNode`/`PXChild` types. Pure data, no DOM work.
- `scripts/jsx/jsx-dev-runtime.ts`: re-export for dev builds.
- Package `exports` entry so `@pathux/jsx-runtime` resolves (jsxImportSource).

### Phase 2 — mount() / shared dispatch
- `scripts/jsx/mount.ts`: `mount(ctx, parent, node)` walking the IR.
- Refactor `xmlpage.ts` `Handler` so its per-tag logic (panel/strip/row/column/
  prop/pathlabel/colorfield/tool/tabs/tab/listbox/menu/button/table/label/…)
  is callable from both XML and IR inputs. Extract a `dispatch(tag, attrs,
  visitChildren)` core; `Handler` and `mount` become thin adapters.
- Support `ref?: (el) => void` (fires during mount; replaces getElementById).
- Custom tags fall back to `UIBase.createElement(tag)` (xmlpage.ts:216 parity).

### Phase 3 — Typed intrinsics
- `scripts/jsx/intrinsics.ts`: `JSX.Element` = `PXNode`; `JSX.IntrinsicElements`
  mapping every structural tag to a props interface. `path` props typed as
  `KnownDataPath` (from `scripts/core/datapath_registry.ts`).
- Shared base attr interfaces (`ContainerAttrs`, `PathAttrs`) for class/style/
  width/height/useIcons/ref.
- Custom widget tags: start with a `\`${string}-x\`` index signature; later
  optionally have `gen:paths` emit precise entries for registered UIBase tags.

### Phase 4 — Build/typecheck wiring
- `tsconfig.json`: `"jsx": "react-jsx"`, `"jsxImportSource": "@pathux"`, add
  `scripts/**/*.tsx` to `include`. (tsgo + esbuild both read this.)
- `buildtools/esbuild.mjs`: add `.tsx` handling / entry points as needed
  (esbuild inherits jsx settings from tsconfig).
- Confirm `pnpm run typecheck` flags a bad `path=` and a bad tag/attr.

### Phase 5 — Proof of concept + docs
- Port `example/page.xml` → `example/page.tsx`; fold the `properties.ts`
  `getElementById` wiring (`dependsOn`, `onclick`, `itemNames`) into refs.
- Keep `page.xml` in place to prove coexistence.
- `documentation/jsx.md`: usage, tag/attr reference, datapath integration,
  when to choose JSX vs xmlpage.

### Phase 6 (optional, follow-up)
- Extend `buildtools/eslint-rules/valid-datapath.mjs` to lint `path={...}` JSX
  attrs against `generated/api-paths.json`.
- `gen:paths` emits intrinsic entries for registered custom widgets.
- Optional `xml → tsx` codemod.

## Files

| File | Action |
|---|---|
| `scripts/jsx/jsx-runtime.ts` | new — `jsx`/`jsxs`/`Fragment` + IR types |
| `scripts/jsx/jsx-dev-runtime.ts` | new — dev re-export |
| `scripts/jsx/mount.ts` | new — IR → Container replay |
| `scripts/jsx/intrinsics.ts` | new — `JSX.IntrinsicElements` |
| `scripts/xmlpage/xmlpage.ts` | refactor — extract shared dispatch |
| `scripts/pathux.ts` | export jsx runtime + mount |
| `tsconfig.json` | jsx/jsxImportSource/include |
| `buildtools/esbuild.mjs` | `.tsx` entries |
| `package.json` | `exports` for `@pathux/jsx-runtime` |
| `example/page.tsx` | new — ported PoC |
| `documentation/jsx.md` | new — docs |

## Verification

- `pnpm run typecheck` (tsgo) — clean; deliberately break a `path=` to confirm
  it errors.
- `pnpm run build` (esbuild) — `.tsx` bundles.
- `pnpm run test` (vitest) — add unit tests: `jsx()` IR shape; `mount()` builds
  expected widget tree / applies dataPrefix; ref fires; custom-tag fallback.
- Manual: `example/page.tsx` renders equivalently to `page.xml`.

## Risks / decisions

- **Shared-dispatch refactor of `Handler`** is the main risk; mitigate by
  keeping xmlpage's public API (`initPage`/`loadPage`) unchanged and covered by
  existing behavior.
- **`@pathux` import-source name** must match the package `exports` + any
  existing module-name conventions used by `gen:paths` augmentation.
- Intrinsics are hand-maintained for structural tags (small, stable set);
  custom widgets handled by index signature first.
