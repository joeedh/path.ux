# Plan: strongly-typed theme system

Goal: type-check `getDefault`/`getSubDefault`/override calls against per-element
theme keys, with each element declaring the keys it uses in `static define()` and
inheriting its parent class's declarations. Inheritance is resolved by a build
step (mirroring `gen:paths`) and emitted as **flat** generated types, so the type
system never recurses — avoiding the self-reference cycles a pure-TS approach hits.

Source of truth for the design: `documentation/` (see the design report). Key
existing code: `getDefault` at `scripts/core/ui_base.ts:3914`, style resolution
`getStyleClass`/`getClassDefault`/`getStyleRecord` (`ui_base.ts:3960-4163`), theme
data `scripts/core/theme.ts`, types `scripts/core/ui_theme.ts`, generator
precedent `buildtools/gen-datapaths.mjs` → `generated/datapaths.ts`.

---

## Phase 0 — Foundations (no behavior change, no churn)

**0.1 Type-token module** — `scripts/core/theme_schema.ts`
- Export `t` tokens: `t.string`, `t.number`, `t.bool`, `t.color` (→ string),
  `t.font` (→ CSSFont), `t.scrollbars` (→ ThemeScrollBars).
- Each token is a tiny runtime object carrying a phantom type
  (`interface TypeToken<T> { kind: string; __t?: T }`) so `typeof` recovers the TS type.
- Export `ThemeSchema` type: `{ [key: string]: TypeToken<any> | ThemeSchema }`
  (nested = sub-record like `disabled`/`highlight`).
- Export helper conditional types: `TokenType<X>` (token→TS type, recursing into
  nested schemas), used later by the generator's emitted code and accessor overloads.

**0.2 Extend the define() contract** — `scripts/core/ui_base.ts`
- Add optional `theme?: ThemeSchema` to `UIBaseDefinition` (`ui_base.ts:943`).
- No code reads it yet. Existing `define()`s remain valid (loose typing preserved).

**Acceptance:** `pnpm run typecheck` clean; no runtime/behavioral change.

---

## Phase 1 — Generator: collate + resolve inheritance

**1.1 `buildtools/gen-themes.mjs`** (model on `gen-datapaths.mjs`)
- Bundle + import the widget registry entry so every `UIBase` subclass loads.
- For each class: walk the **prototype chain**, merge `define().theme`
  child-over-parent → a resolved flat key→token map per class.
- Resolve each class's **style class** (replicate `getStyleClass` chain walk) and
  cross-check declared keys against `DefaultTheme` for `style` + `parentStyle` + `base`.

**1.2 Validation warnings** (build-time value-add)
- key declared by element but absent from theme (typo / missing theme entry);
- theme key present in `theme.ts` declared by no element (dead entry);
- token/value mismatch (declared `t.number`, theme has non-`Npx` string);
- expand `compatMap` aliases (`ui_theme.ts`) so alias + canonical both resolve;
  warn steering to canonical.

**1.3 Emit `generated/themes.ts`**
- `interface ResolvedThemeKeys { <ClassName>: { <key>: <tsType>; … flat, inherited … } }`
  — one entry per registered class; inheritance already baked in (flat → no type recursion).
- `export type KnownThemeKey = keyof ResolvedThemeKeys[keyof ResolvedThemeKeys];`
  (for lint/autocomplete, like `GeneratedDataPath`).
- Optional machine-readable `generated/themes.json` for an ESLint rule later.

**1.4 Wire script** — `package.json`: `"gen:themes": "node buildtools/gen-themes.mjs"`.
Document "regenerate after editing `define().theme` or `theme.ts`" in `CLAUDE.md`
alongside the `gen:paths` note.

**Acceptance:** running `pnpm run gen:themes` on the current tree emits
`generated/themes.ts` with at least `UIBase`/`base`; warnings list real drift in
`theme.ts`; committing the file typechecks.

---

## Phase 2 — Typed accessor surface (strictly additive)

**2.1 Lightweight phantom generic** — `scripts/core/ui_base.ts`
- `class UIBase<CTX … = IContextBase, VALUE = unknown, SELF extends keyof
  ResolvedThemeKeys = "UIBase">`. `SELF` is a **string literal** (cheap, no cycle).

**2.2 Overloads on `getDefault`**
- Typed: `getDefault<K extends keyof ResolvedThemeKeys[SELF]>(key: K, checkForMobile?):
  ResolvedThemeKeys[SELF][K]`.
- Fallback (keep last): `getDefault<T extends DefaultTypes = string>(key: string, …): T`
  — preserves every existing call site and dynamic keys.

**2.3 Companion signatures from the same registry**
- `getSubDefault(key, subkey)` → index into nested sub-record type.
- `overrideDefault(key, val)` / `overrideClassDefault(style, key, val)` → constrain
  `val` to the key's type (catches wrong-typed overrides — a current silent footgun).
- `hasDefault`/`hasSubDefault` → `key: keyof …` for autocomplete.

**Acceptance:** `pnpm run typecheck` clean with zero edits to existing call sites
(all resolve via the fallback overload). A deliberate typo on a migrated class errors.

---

## Phase 3 — Migrate widgets (leaves-first, per project convention)

For each widget, smallest/leaf first:
1. Add `theme: { … t-tokens … }` to its `define()` (only keys it adds/overrides;
   parent keys inherited via the generator).
2. Add the `"ClassName"` literal as `SELF`: `extends UIBase<CTX, void, "Button">`.
3. `pnpm run gen:themes` + `pnpm run typecheck`; fix any real key/type mismatches surfaced.

- Order suggestion: `label`, `button`, `iconbutton`/`iconcheck`, `checkbox`,
  `textbox`, `numslider*`, `listbox`, `menu`, `panel`, `tabs`, containers last.
- Generator can emit a codemod list `(className → file)` to automate step 2.

**Acceptance:** migrated widgets read theme keys with inferred (not cast) types;
casts like `as number` removed at those call sites; warnings for those classes clear.

---

## Phase 4 — Guardrails (optional)

- ESLint rule (clone the datapath rule fed by `gen:paths` JSON) flagging string-literal
  theme keys absent from `KnownThemeKey` on opted-in classes.
- CI check: `gen:themes` produces no diff (catches stale `generated/themes.ts`),
  same pattern as the datapaths artifact.

---

## Non-goals / explicitly deferred
- Typing `_themeOverride`/`overrideTheme` runtime trees (stay `string`; the static
  types describe the built-in theme contract only).
- Converting `theme.ts` into the generated source — `theme.ts` stays the value
  source; the generator only *validates* against it.
- Removing the `string` fallback overload (kept permanently for dynamic keys).

## Risks
- **Generator must replicate `getStyleClass`/`parentStyle` resolution faithfully** —
  unit-test the resolver against a few known classes (`button`→`base`, an
  `_override_class` case, a `style:"none"` case).
- **px-coercion**: declare the *returned* type; generator accepts `Npx` ↔ `t.number`.
- **Per-class `SELF` literal is churn** — mitigated by codemod + the fallback default
  (`"UIBase"`) so unmigrated classes are unaffected; rollout is incremental.
