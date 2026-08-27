# Split toolsys/toolprop.ts into a props/ folder

## Context

`scripts/path-controller/toolsys/toolprop.ts` held every `ToolProperty`
subclass path.ux ships in one 2649-line file. It is split into one file per
class-inheritance chain under `scripts/path-controller/toolsys/props/`, with
`toolprop.ts` reduced to a re-export shim so nothing outside the folder has
to change.

`toolprop.ts` is reachable from the public `pathux` barrel
(`pathux.ts` -> `controller.ts` -> `export * from "./toolsys/toolprop"`), so
per the barrel rule in `CLAUDE.md`, the split must not add a single new
public name. Several helpers in the file were used only internally
(`FloatPropertyBase`, `ToolPropertyConstructor`, `OnceTag`, `ExecScopeUsing`,
`ExecScopeUsingStack`, `execScopeUsingStack`, the local `first()` helper) and
were not exported before the split. They become plain (non-barrel) exports
of their new home module so sibling files in `props/` can import them, but
`toolprop.ts` does not re-export them.

## Layout

`scripts/path-controller/toolsys/props/`:

- `base.ts` — the `ToolProperty` root class plus shared infrastructure
  (`OnceTag`, `ExecScopeUsing`/`ExecScopeUsingStack`/`execScopeUsingStack`,
  `DataAPIExecScope`, `ToolPropertyConstructor`, `PropClasses`,
  `customPropertyTypes`, `customPropTypeBase`, `MakeUINameWordMap`,
  `defaultRadix`/`defaultDecimalPlaces`, `setPropTypes`, `CallbackFn`,
  `PropSubTypes`, the `NumberConstraint*` types/sets, the `EnumDef`/
  `FlagsDef`/`IconMap`/`DescriptionMap`/`UINameMap` types, the
  `UtilStringSet` alias, and the `SymbolConstructor.dispose` global
  augmentation).
- `number.ts` — `NumProperty`, `_NumberPropertyBase`, `IntProperty`,
  `FloatPropertyBase`, `FloatProperty`.
- `string.ts` — `StringPropertyBase`, `StringProperty`, `ReportProperty`.
- `bool.ts` — `BoolProperty`.
- `enum.ts` — `EnumKeyPair`, `EnumPropertyBase`, `EnumProperty`,
  `FlagProperty`, and the local `first()` helper.
- `vector.ts` — `VecPropertyBase` (extends `FloatPropertyBase` from
  `number.ts`), `Vec2Property`, `Vec3Property`, `Vec4Property`,
  `QuatProperty`.
- `matrix.ts` — `Mat4Property`.
- `array.ts` — `FloatArrayProperty`, `ArrayBufferProperty`.
- `list.ts` — `ListProperty`.
- `string_set.ts` — `StringSetProperty`.

`toolprop.ts` re-exports the same names it exported before the split, using
named re-exports rather than `export *`, so the barrel surface is unchanged.

## Status

- [x] Plan written and approved
- [x] `props/base.ts` created
- [x] `props/number.ts` created
- [x] `props/string.ts` created
- [x] `props/bool.ts` created
- [x] `props/enum.ts` created
- [x] `props/vector.ts` created
- [x] `props/matrix.ts` created
- [x] `props/array.ts` created
- [x] `props/list.ts` created
- [x] `props/string_set.ts` created
- [x] `toolprop.ts` reduced to re-export shim
- [x] `pnpm exec tsgo --noEmit` clean
- [x] `pnpm run test` passing (318/319; `graph_headless.test.ts` fails the
      same way on unmodified `master`, pre-existing and unrelated)
- [x] `pnpm run build` + barrel surface diff clean (byte-identical to the
      pre-split baseline)
- [x] `pnpm run format:check` clean

Note: `_NumberPropertyBase` was exported by the original `toolprop.ts` (unlike
`FloatPropertyBase`, which was not), so it is re-exported from the barrel too
— this was caught by the barrel surface diff and corrected.
