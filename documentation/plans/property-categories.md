# Property categories

A `ToolProperty` becomes a value slot plus a set of _categories_: small objects that each own
their fields, their flags as named booleans, their presentation hints and their attribute
names. `IntProperty` is `Access + Numeric + Integer + Units`; `Vec3Property` is
`Access + Numeric + Vector + Units`; `FlagProperty` is `Access + Enum + Bitfield`.
`PropTypes`, `PropFlags`, `subtype`, the positional constructors, the `setXXX` setters and
the intermediate base classes go. The on-disk STRUCT format does not change.

This is the first plan that opens a migration record
([`migration-records.md`](migration-records.md)); the record convention is proven by it.
Colour as a unit dimension is a separate plan that follows this one.

## Context

- `scripts/path-controller/toolsys/props/` is 2,743 lines over ten files; `base.ts` is 740
  of them. The base class carries number-only configuration (`range`, `uiRange`, `step`,
  `stepIsRelative`, `expRate`, `radix`, `decimalPlaces`, `baseUnit`, `displayUnit`) in its
  fields and its STRUCT, so a `BoolProperty` serializes a range. `_NumberPropertyBase`
  re-declares and re-serializes the same fields, plus `slideSpeed` and
  `sliderDisplayExp`.
- Seventeen concrete classes carry a `PROP_TYPE_ID`: `Int`, `Float`, `String`, `Report`,
  `Bool`, `Enum`, `Flag`, `Vec2`, `Vec3`, `Vec4`, `Quat`, `Mat4`, `FloatArray`,
  `ArrayBuffer`, `List`, `StringSet`, and `Curve1D` (`toolsys/curve/curve1d_toolprop.ts`,
  read at `container_prop.ts:83` and `controller_abstract.ts:434`).
- `toolsys/allprops.ts` (`isVecProperty`, `ToolPropertyTypes`) is an existing category-test
  layer; this plan absorbs it.
- `PropTypes` is a bit-per-type table. `ToolProperty.register` allocates custom ids from
  `1 << customPropTypeBase` with `customPropTypeBase = 17`, and `ARRAY_BUFFER` is
  `65536 << 1` = `1 << 17`, so the first custom type a consumer registers collides with it;
  after fourteen more the shift wraps. Every bitmask test in path.ux (20 sites) is a
  category test — numeric, vector, enum-like — and the other 77 type tests are equality
  or `instanceof`. Several of the numeric tests distinguish scalar from vector
  (`ui.ts:220`, `ui_textbox.ts:356–361`, `controller_abstract.ts:438–442`), and two
  include `QUAT` where a third does not (`controller.ts:1606`, `controller_abstract.ts:607`
  against `:442`).
- `PropFlags` mixes semantics (`PRIVATE`, `READ_ONLY`, `NO_UNDO`, `OPTIONAL`,
  `SAVE_LAST_VALUE`, `NO_DEFAULT`, `NO_REALTIME`) with presentation (`LABEL`, `USE_ICONS`,
  `SIMPLE_SLIDER`, `FORCE_ROLLER_SLIDER`, `FORCE_ENUM_CHECKBOXES`, `MULTILINE_STRING`,
  `RICH_TEXT_STRING`, `EDIT_AS_BASE_UNIT`) and three controller internals that are live:
  `USE_CUSTOM_GETSET` (`controller.ts:1566`, `controller_abstract.ts:398,599`,
  `ui_widgets2.ts:479`), `USE_BASE_UNDO` (`controller_ops.ts:89`) and
  `USE_CUSTOM_PROP_GETTER` (`controller.ts:1217,1409`). `DataPath.customGetSet`,
  `customPropCallback` and `fullSaveUndo` set the same bits on `DataFlags`
  (`controller_base.ts:259–280,461`), so those three have a home on the path already.
  `SELECT` and `LABEL` have no reader.
- `subtype` has one value, `COLOR`; `PropSubTypes` is defined twice (`props/base.ts`,
  `toolprop_abstract.ts`). Outside `props/` it is written at `controller.ts:284,296`
  (and passed, unused, at `:345,349`) and read at `container_prop.ts:160` and
  `theme_editor.ts:1175–1183`.
- Four surfaces express the same vocabulary and none derives from another:
  1. `ToolProperty.setXXX()` chained setters: 38 sites in path.ux outside `props/`;
     fairmotion 10, visualnovel 7, webgl-app-framework 0 in its own code.
  2. The `DataPath` fluent builder in `controller_base.ts` — thirty-odd one-line
     delegations to (1), typed through `DataPathToolProperty`, an interface that declares
     subclass methods on the base because "they exist at runtime". This is the public API:
     fairmotion 141 uses, webgl-app-framework 238. `DataStruct.float()` and its siblings
     already return `DataPath<CTX, number, STRUCT>`, so the path is typed by value, not
     yet by property.
  3. DOM attributes on widgets. `loadNumConstraints` (`core/base/ui_base_datapath.ts`)
     copies the prop's numeric fields onto the widget, then lets attributes override them
     (`min`/`max` → `range`, `integer` → `isInt`, the rest by the same name), iterating the
     hand-maintained `NumberConstraints` set. `ui_textbox.ts:371–382,461–467` reads
     `decimalPlaces`/`baseUnit`/`displayUnit` by hand again, and `:367` prefers
     `this.decimalPlaces` when a caller set it programmatically, which
     `container_prop.ts`'s `sliderImpl` does. Callers: `core/ui_base.ts:910` and
     `widgets/ui_numsliders.ts`.
  4. Seven positional constructor parameters, repeated by every subclass; `Enum` and
     `Flag` take their definition positionally too (`enum.ts:142–161`).
- Readers of `prop.range/step/decimalPlaces/baseUnit/displayUnit/radix/expRate` outside
  `props/`: `ui_base_datapath.ts`, `ui.ts`, `controller_abstract.ts`, `ui_textbox.ts`,
  `ui_widgets2.ts`, `richtext/providers/markdown_provider.ts`, and — untyped —
  `buildtools/datapath-walker.mjs:37–65`, which `gen:paths` runs and which would silently
  emit an empty catalog if the fields moved without it.
- `ToolPropertyIF` (`toolprop_abstract.ts`) is "the contract any tool property library must
  implement": a seam for swapping in a custom property base class. Nothing else implements
  it, and there is no current use for one. It declares `flag` as a plain field initialised
  in its constructor (`:74,98`), which under `useDefineForClassFields` shadows any accessor
  a subclass defines — the same reason `data` is `declare` (`props/base.ts:189–192`).
- `ListProperty` stores a _template instance_ (`prop: abstract(ToolProperty)`,
  `props/list.ts:14–16,41–49`); a `PropTypes` id is one of three accepted constructor
  inputs, resolved through `PropClasses`. `controller_base.ts:69` calls
  `ToolProperty.getClass`.
- Units (`path-controller/units/units.ts`) already carry a category as a loose string:
  `UnitDefinition.type` is `"distance"`, `"angle"`, and so on.
- **What persists property STRUCTs.** `scripts/graph/node.ts:135`
  (`props: array(abstract(ToolProperty))`), `toolstack.ts:752`, `toolmacro.ts:566`,
  `props/list.ts:16`; in consumers, fairmotion `brush_types.ts:423` and `animdata.ts:197`
  (binary `.fmo` files), webgl-app-framework `lib_api.ts:1112` (`DataRefProperty`'s STRUCT
  inherits the base fields) and `legacy_struct_migration.ts:68,86` (maps saved schema
  names to `toolprop.NumProperty` and `toolprop._NumberPropertyBase`), and visualnovel's
  committed `vngen/work/graphs/*.json` through `@vn/gengraph`. gengraph is a
  migrate-then-validate reader: `migrate.ts:43` runs nstructjs `migrateJSON` on the raw
  JSON, which dispatches through `STRUCT`, `TSTRUCT` and array fields and so reaches a
  property's `migrateSTRUCT` inside `node.props`, and `graphfile.ts:141` validates the
  migrated result. A format change with a JSON-shape `migrateSTRUCT` therefore loads
  there. `SavedToolDefaults` and `ToolPropertyCache` (`toolsys/tooldefaults.ts`) hold
  plain values in memory and are never serialized.
- nstructjs facts, verified: `array(abstract(…))` over a heterogeneous list works
  (`ui_meta_tags.ts:126`, `node.ts:135`); `inlineRegister` flattens parent fields into each
  concrete STRUCT, so deleting an intermediate base changes nothing about what
  `toolprop.IntProperty` writes; binary `migrateSTRUCT` runs post-order on the loaded
  object, JSON `migrateSTRUCT` runs pre-read on raw JSON. gengraph content hashes use
  `getValue()` only (`hash.ts:33`), so property serialization does not touch asset hashes.
- Consumer custom property classes all extend `ToolProperty` directly (fairmotion 6,
  webgl-app-framework 2), none of the intermediate bases. fairmotion also augments
  `interface ToolProperty<T = unknown, TYPE extends number = number>` and
  `EnumPropertyBase<TYPE, VALUE>` (`src/core/toolprops.ts:107,133`) — an interface
  cannot merge with a type alias, so once `ToolProperty` is a union the augmentation has
  to target `ToolPropertyBase` — and extends `flag` with its own bits
  (`TPropFlags`, bits 25–26, `:87–93`), relying on `USE_CUSTOM_GETSET` for
  `userSetData`/`userGetData`.
- JSX intrinsics do not type these attributes today, so a typed attribute map is a
  follow-up, not part of this plan.
- `migration-records.md` has not landed. Its stages 1–3 (`README.md` and the authoring
  rule; `check`; `plan`) must land before this plan's stage 1, which opens a record, and
  before stage 8, which runs `migration plan`.

## Decisions already made

Recorded so the plan carries them without the conversation that produced them.

- Presentation hints live in a `ui` sub-object on the category they belong to. One
  system, with the semantic/presentation split visible in the shape.
- `Access` is a category, not base-class fields. "Read-only" is a fact about a property
  the same way "integer" is. The base class declares `static categories = [Access]`, so a
  consumer subclass that declares nothing still has `access`.
- `has(C)` narrows at the type level to the _base_ class with `C`'s value type and `C`'s
  member present — never to a concrete subclass.
- The `DataPath` builder methods are written out by hand, not generated.
- Attribute names stay as they are (`min`, `max`, `step`, `decimalPlaces`, `baseUnit`,
  `displayUnit`, `integer`, `radix`, …).
- A widget owns its own category instances. It merges in whatever categories the
  datapath's property provides, and a field set explicitly on the widget — by a DOM
  attribute or by code — wins over the property's value for that field.
- **The on-disk format does not change.** Categories are the in-memory shape; the STRUCT
  stays the flat version-2 layout, written through STRUCT write expressions that read
  the owning category, and read back by `loadSTRUCT` into the categories. `flag` keeps
  being written, derived from `Access` and the `ui` fields, and read back into them. No
  version bump, no new struct names, no `migrateSTRUCT` work, and every carrier above
  keeps loading. A format change is survivable — gengraph migrates before it validates,
  and binary readers migrate post-order — but it would need a `migrateSTRUCT` in both the
  JSON and the binary shape, a version bump per STRUCT-changing stage, a rule for a file
  whose category list disagrees with the class, and category names frozen as file
  content before they have settled. That is a plan of its own, after this one.
- Colour as a unit dimension is out of this plan. `subtype === COLOR` becomes
  `units.dimension === "color"` here, with `dimension` a plain field on `Units`; making
  colour spaces real units, with vector-aware conversion, is the follow-up plan.
- Constructors take `(value, options?)`. The base constructor takes `(options?)` only;
  each concrete class owns `value`. Metadata arrives through the options object or by
  assigning category fields; `apiname` is assigned by the owner (a `tooldef` key, an
  `api_define` call) as it is today.
- Built-in properties carry a string literal type tag. The class is
  `ToolPropertyBase<VALUE, TYPE extends string, C>`, each built-in fixes `TYPE` to a
  literal (`"float"`, `"vec3"`, `"enum"`, …), and `ToolProperty` is exported as the union
  of the built-ins plus `ToolPropertyBase<unknown, string>` for consumer classes. So
  `prop.type === "vec3"` narrows to `Vec3Property` for a built-in, and `has()` narrows to
  the base with a category — two mechanisms, each explicit about what it resolves to.
- No custom property base class. `ToolPropertyIF` was the seam for one; nothing uses it
  and nothing is planned to, so it goes rather than being carried forward.
- No compatibility shims. Every consumer is agent-maintained and pinned; the migration
  record carries the rewrite.
- No signature-level API diff for this plan. `example/` and each consumer's typecheck are
  the oracle for deleted or reshaped members; the record's searches exist for what a
  typecheck cannot see (`.js` files, `any`-typed properties).

## Design

### Category

```ts
abstract class Category<V = unknown> {
  static readonly key: string; // "numeric", "units", …: the member name on the property
  static readonly fields: FieldTable; // name → { type, default, attrs? }
  static readAttrs(dom: Element): Partial<Record<keyof Fields, unknown>>;
  explicit: Set<string>; // fields set on this instance by an attribute or by code
  merge(from: this): void; // takes `from`'s value for every field not in `explicit`
  copy(): this;
  ui: object; // presentation hints; shape is per category
}
```

- `V` is the value-type constraint. `Numeric` is `Category<number | VectorLike>`, `Text`
  is `Category<string>`, `Enum` is `Category<string | number>`.
- `fields[].attrs` is a reader, `(dom) => Partial<Fields>`, not a name: `range` reads
  `min` and `max`; most fields read the attribute of the same name. Category
  _membership_ is not a field, so `integer` is read by the widget, not by a table: a
  widget that declares `integer?: Integer` sets it when the attribute is present or the
  property `has(Integer)`.
- `fields` is the one declaration. From it: the options type, `readAttrs`, and the list
  `merge` walks. The STRUCT script stays hand-written, as it is today, because it is the
  on-disk format and this plan does not change it. `NumberConstraints`,
  `IntegerConstraints`, `FloatConstrinats` and their sets are deleted.
- Categories are per-instance objects: every tool's `range` differs, and a `ToolOp` copies
  its properties per invocation. `ToolProperty.copy` copies each category. A `DataPath`'s
  property and a `ToolOp`'s copy of it never share a category instance.
- Names avoid shadowing globals: `Numeric` not `Number`, `Text` not `String`, `StringSet`
  not `Set`. Categories are not nstructjs structs in this plan, so the names are not yet
  file content and can still change.

### The categories

| Category     | Value type             | Fields                                                                                                     | `ui`                                                           | Replaces                                                                            |
| ------------ | ---------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `Access`     | any                    | `readOnly`, `private`, `optional`, `undo`, `saveLastValue`, `realtime`, `noDefault`                        | —                                                              | `PropFlags` semantic bits                                                           |
| `Numeric`    | `number \| VectorLike` | `range`, `uiRange`, `step`, `stepIsRelative`, `expRate`, `slideSpeed`, `sliderDisplayExp`, `decimalPlaces` | `sliderStyle: "auto" \| "simple" \| "roller"`, `uniformSlider` | base-class number fields, `_NumberPropertyBase`, `NumProperty`, `FloatPropertyBase` |
| `Integer`    | `number`               | `radix`                                                                                                    | —                                                              | `IntProperty`'s constraint set; `elem.isInt`                                        |
| `Vector`     | `VectorLike`           | `arity`                                                                                                    | —                                                              | `VecPropertyBase`, `allprops.isVecProperty`                                         |
| `Quaternion` | `Quat`                 | —                                                                                                          | —                                                              | `QuatProperty`'s special-casing                                                     |
| `Units`      | `number \| VectorLike` | `dimension`, `base`, `display`                                                                             | `editAsBaseUnit`                                               | `baseUnit`, `displayUnit`, `subtype`, `EDIT_AS_BASE_UNIT`                           |
| `Text`       | `string`               | —                                                                                                          | `multiline`, `richText`                                        | `StringPropertyBase`, the two string flags                                          |
| `Enum`       | `string \| number`     | `keys`, `values`, `uiNames`, `descriptions`, `icons`, `icons2`                                             | `useIcons`, `checkboxes`                                       | `EnumPropertyBase`, `USE_ICONS`, `FORCE_ENUM_CHECKBOXES`                            |
| `Bitfield`   | `number`               | —                                                                                                          | —                                                              | `FlagProperty`'s special-casing                                                     |
| `Elements`   | list-like              | `template: ToolProperty`                                                                                   | —                                                              | `ListProperty`'s `prop` and its `PropTypes` constructor input                       |
| `StringSet`  | `Set<string>`          | as today                                                                                                   | —                                                              | `StringSetProperty` internals                                                       |
| `Buffer`     | typed array            | as today                                                                                                   | —                                                              | `FloatArrayProperty`, `ArrayBufferProperty` internals                               |
| `Curve`      | `Curve1D`              | as today                                                                                                   | —                                                              | `Curve1DProperty` internals                                                         |

- `LABEL` and `SELECT` are deleted; nothing reads them. `USE_CUSTOM_GETSET`,
  `USE_BASE_UNDO` and `USE_CUSTOM_PROP_GETTER` are not categories: their property-side
  reads move to `dpath.flag`, where `DataFlags` already carries them.
- `Access.undo` and `Access.realtime` are the positive forms of `NO_UNDO` and
  `NO_REALTIME`; a default of `true` reads as today's default of the flag being clear.
- Scalar-versus-vector tests are `has(Numeric) && !has(Vector)`. `Quaternion` implies
  `Vector`. The `QUAT` inconsistency at `controller_abstract.ts:442` is resolved toward
  including it, and recorded in the record's **Semantic changes**.

### Concrete classes and their sets

| Class                                          | Categories                                  |
| ---------------------------------------------- | ------------------------------------------- |
| `IntProperty`                                  | `Access`, `Numeric`, `Integer`, `Units`     |
| `FloatProperty`                                | `Access`, `Numeric`, `Units`                |
| `Vec2Property`, `Vec3Property`, `Vec4Property` | `Access`, `Numeric`, `Vector`, `Units`      |
| `QuatProperty`                                 | `Access`, `Numeric`, `Vector`, `Quaternion` |
| `Mat4Property`                                 | `Access`                                    |
| `BoolProperty`                                 | `Access`                                    |
| `StringProperty`, `ReportProperty`             | `Access`, `Text`                            |
| `EnumProperty`                                 | `Access`, `Enum`                            |
| `FlagProperty`                                 | `Access`, `Enum`, `Bitfield`                |
| `ListProperty`                                 | `Access`, `Elements`                        |
| `StringSetProperty`                            | `Access`, `StringSet`                       |
| `FloatArrayProperty`, `ArrayBufferProperty`    | `Access`, `Buffer`                          |
| `Curve1DProperty`                              | `Access`, `Curve`                           |

- `IntProperty` keeps `Units` because it carries `baseUnit = displayUnit = "none"` today
  (`number.ts:234`) and `ui.ts:220` formats ints through `units.buildString`.
- Each class is a declaration of its set, its type tag and a value type:

  ```ts
  class FloatProperty extends ToolPropertyBase<number, "float", typeof FloatProperty.categories> {
    static readonly type = "float";
    static categories = [Access, Numeric, Units] as const;
    declare access: Access;
    declare numeric: Numeric;
    declare units: Units;
    constructor(value = 0, options?: OptionsOf<typeof FloatProperty.categories>) { … }
  }
  ```

### Type tags and the `ToolProperty` union

- `ToolPropertyBase<VALUE, TYPE extends string, C>` is the class. `type` is a readonly
  instance field mirroring the class's `static type`, so it discriminates at the type
  level.
- `ToolProperty` becomes a type alias: the union of the seventeen built-ins, plus
  `ToolPropertyBase<unknown, string>` so a consumer class is a member. `prop.type ===
"float"` narrows a `ToolProperty` to `FloatProperty`; a consumer's own tag falls into
  the catch-all and narrows with `instanceof`, or through a union the consumer declares.
- The union lives in one module beside the class list nstructjs registers, so a class
  cannot be registered without being in the union.
- Internal constraints that mean "any property" — `PropertySlots`, `DataPath`'s
  property parameter, `Elements.template` — are written against `ToolPropertyBase`, not
  the union; the union is for narrowing at use sites.
- The runtime class is renamed, but its STRUCT name stays `ToolProperty`: nstructjs takes
  the name from the script, not the class, so every `abstract(ToolProperty)` in a STRUCT
  script and every file on disk is unaffected.

- `EnumProperty` and `FlagProperty` take their definition as the value-side argument:
  `new EnumProperty(initial, { enum: { A: 0, B: 1 }, uiNames: … })`, since the
  definition is `Enum`'s fields and the options object is where fields go.
- `ToolPropertyIF` is deleted in stage 1: whatever `ToolProperty` still needs from it
  moves into `ToolProperty`, and `flag` can be an accessor from that stage on.
  `toolprop_abstract.ts` then holds only `PropTypes`, `PropFlags` and `PropSubTypes`, and
  is deleted with the last of them in stage 5.
- Deleted by the end: `NumProperty`, `_NumberPropertyBase`, `FloatPropertyBase`,
  `VecPropertyBase`, `StringPropertyBase`, `EnumPropertyBase`, `allprops.ts`, `PropTypes`,
  `PropFlags`, `PropSubTypes`, `setPropTypes`, `customPropertyTypes`, `PropClasses`,
  `ToolProperty.register`, `ToolProperty.getClass`, `ToolProperty.internalRegister`,
  `PROP_TYPE_ID`, `subtype`, the `setXXX` setters, `TYPE extends number` (replaced by
  `TYPE extends string`), `defaultRadix`/`defaultDecimalPlaces` as module `var`s (they become `Numeric.defaults`),
  `SliderDefaults` in `ui_numsliders.ts`.
- A consumer's custom property becomes `extends ToolPropertyBase<X, "myapp.thing">`,
  declares `static categories` (or inherits `[Access]`) and no longer calls
  `ToolProperty.register`. Its tag is any string; dotted with the app's name by
  convention, since nothing checks uniqueness across consumers. A consumer that
  needs its own facts — fairmotion's `TPropFlags` bits — writes its own `Category`
  subclass and lists it; its persistence is the consumer's own STRUCT, as it is today.
  fairmotion's module augmentations of `ToolProperty<T, TYPE>` and
  `EnumPropertyBase<TYPE, VALUE>` are rewritten against the new generics in its local
  migration plan.

### `has()`

```ts
has<K extends C[number]>(c: K): this is ToolPropertyBase<ValueOf<K>, string> & WithMember<K>;
```

- One signature, written against the class's `C` (the `static categories` tuple).
  Verified with `tsgo` on a scratch model: `PropertySlots` still accepts a
  `FloatProperty`, so `ToolOp<{ a: FloatProperty }>` and `getInputs()` are unaffected;
  `fp.has(Vector)` on a `FloatProperty` is a type error, as intended.
- Value narrowing comes from the first `has()`. After `p.has(Numeric) && p.has(Vector)`
  the member `vector` is present but `getValue()` is still `number | VectorLike`; a site
  that needs the vector type narrows on `has(Vector)` first.
- Runtime: `this.constructor.categories.includes(c)`.
- The 20 bitmask sites become `has(Numeric)`, `has(Vector)`, `has(Enum)`; equality and
  `instanceof` sites become `has(Integer)` and the like. `prop instanceof IntProperty` at
  `ui_base_datapath.ts:131` and `instanceof EnumPropertyBase` at `theme_editor.ts:1185`
  are the first two.

### Serialization

- Unchanged on disk. The base STRUCT keeps its version-2 fields, each written through an
  expression that reads the category that now owns it, and `loadSTRUCT` unpacks them.
  Concrete STRUCTs keep `data` and whatever they add today.

  ```
  range : array(float) | this.numeric.range;
  flag  : int          | this.packFlags();
  type  : int          | this.legacyTypeId();
  ```

- `type : int` stays in the file. `legacyTypeId()` maps a built-in's string tag to the
  old `PropTypes` value through a private table that outlives `PropTypes` itself, and
  writes `0` for a consumer class, whose old id was allocated at runtime and was never
  stable across runs anyway. Reading ignores the field; the class is known from the STRUCT
  name.

- `packFlags()` derives the old bits from `Access` and the `ui` fields; `unpackFlags()`
  does the reverse. Bits a consumer added above path.ux's (`TPropFlags`) pass through
  untouched in a `flag` field the consumer's own category reads.
- `toJSON`/`loadJSON` follow the same rule.
- `TOOLPROP_SCHEMA_VERSION` stays 2. `datapath-walker.mjs` is updated to read through the
  categories, and `gen:paths` output is diffed against a pre-change generation in the
  stage that moves the fields.

### The builder

- `DataPath`'s methods are grouped by category in `controller_base.ts`, each a one-line
  assignment into the category (`this.data.numeric.range = [min, max]`).
- `DataPath` gains the property's category set as a type parameter, so `st.string(…)`
  does not offer `.range()`. `DataStruct.float()` and its siblings already return a
  `DataPath` typed by value; they are changed to return one typed by class.
  `DataPathToolProperty` is deleted.
- Method names stay: `range`, `step`, `decimalPlaces`, `baseUnit`, `displayUnit`, `unit`,
  `noUnits`, `editAsBaseUnit`, `simpleSlider`, `rollerSlider`, `checkStrip`, `readOnly`,
  `noUndo`, `icons`, `descriptions`, `uiNames`, and the rest. `customGetSet`,
  `customPropCallback` and `fullSaveUndo` keep setting `DataFlags` and stop touching the
  property. A consumer's ~380 builder calls compile unchanged unless the method was on
  the wrong kind of path.

### Widgets

- A widget that reads property configuration holds category instances: `NumSlider` has
  `numeric: Numeric`, `integer?: Integer`, `units: Units`. `loadNumConstraints` becomes
  one merge per declared category: `this.numeric.merge(prop.numeric)` takes the
  property's value for every field not in `this.numeric.explicit`.
- `explicit` is filled two ways: `readAttrs` adds every field it read, and a widget's
  category fields are accessors that add the field on assignment, so
  `sliderImpl`'s `ret.decimalPlaces = n` becomes `ret.numeric.decimalPlaces = n` and is
  explicit without further ceremony.
- `elem.range`, `elem.isInt`, `elem.step` and the rest go. `ui_textbox.ts`'s by-hand
  attribute reads, `container_prop.ts`'s widget choice, `dropbox.ts:314`, `ui.ts:220`,
  `ui_widgets2.ts`, `markdown_provider.ts`, `theme_editor.ts:1175–1185` and the
  `controller.ts` colour writes all move to `has()` and category fields.

### Migration record

- `documentation/migrations/property-categories.md`, opened in stage 1, closed in stage 8. Surfaces: `api`, `modules`, `behaviour`, `dom` (attribute vocabulary is unchanged;
  widget public fields are not). Not `struct`: the format is unchanged, and the record
  says so in **Save files** so a consumer does not go looking.
- Searches: `PropTypes\.`, `PropFlags\.`, `PropSubTypes`, `PROP_TYPE_ID`,
  `ToolProperty\.register\(`, `getClass\(`, `setPropTypes\(`, `\.subtype\b`,
  `\.flag\s*(=|&|\|)`, `super\(\s*PropTypes`, `Property\(\s*$` (a multi-line
  constructor), `new (Int|Float|Vec[234]|Quat|String|Bool|Enum|Flag|List|StringSet|FloatArray|ArrayBuffer|Mat4|Report|Curve1D)Property\(`,
  `\.set(Range|Step|UIName|Description|Unit|BaseUnit|DisplayUnit|Flag|Icon|UIRange|DecimalPlaces|Radix|SliderDisplayExp|ExpRate|SlideSpeed|ReadOnly|Realtime|Optional)\(`,
  `NumberConstraints`, `loadNumConstraints`, `\.isInt\b`, `_NumberPropertyBase`,
  `NumProperty\b`, `VecPropertyBase`, `EnumPropertyBase`, `StringPropertyBase`,
  `ToolPropertyIF`, `DataPathToolProperty`, `isVecProperty`, `ToolPropertyTypes`,
  `interface ToolProperty<`, `extends ToolProperty<`, `declare module .*toolprop`,
  `SliderDefaults`.
- The constructor search matches every construction, single-argument ones included; the
  record says a one-argument call is unaffected and the search is for finding the rest.
  Run against the consumers, the positional forms it must find include fairmotion
  `transform.ts:143,149` and `toolprops.ts:416,493,590,695,790,989`, and webgl-app-framework
  `transform_ops.ts:175`, `lib_api.ts:1133`, `textureGen.ts:6–10`.
- The barrel fixture (`tests/fixtures/barrel-surface.json`) lists most of the deleted
  names, so `barrelSurface.test.ts` fails on the stage that deletes each; the fixture is
  regenerated in that stage with `UPDATE_BARREL_FIXTURE=1` after the diff is read, and
  the same diff is the record's **Barrel delta** at closing.

## Repositories and landing

- The property, controller and units code lives in `scripts/path-controller`, a submodule.
  Widgets, containers, menus and the theme editor live in path.ux.
- A stage is defined at the path.ux level: one or more path-controller commits, then the
  path.ux commit that bumps the gitlink and adapts the path.ux side, landed together per
  the co-commit rule (`CLAUDE.md`, Submodule). The path.ux commit is what must be green
  under `typecheck`, `test` and `lint:check`; a path-controller commit is green under its
  own checks. A path-controller change that path.ux cannot compile against is not landed
  in path-controller's `master` until the path.ux side is ready to bump.
- `example/` is updated in every stage that touches something it uses, since it is the
  only consumer-shaped typecheck.

## Stages

1. **Open the record; `Category`; `Access`; the base constructor.** `ToolPropertyIF`
   deleted, its remaining members moved into `ToolProperty`. `Category` base, `fields` tables, `readAttrs`, `explicit`,
   `merge`, `copy`; `static categories` on `ToolProperty` defaulting to `[Access]`;
   `has()`; `OptionsOf`. `Access` as the first category with `flag` an accessor over it
   (`packFlags`/`unpackFlags`), so every existing `flag` reader still works. The base
   constructor becomes `(options?)`; every subclass's `super(...)` call is rewritten to
   pass an options object while its own public signature is untouched. `customPropTypeBase`
   bumped to 18. The record opened with front matter and stubs.
2. **Numeric categories.** `Numeric`, `Integer`, `Vector`, `Quaternion`, `Units`; fields
   off the base, written through STRUCT expressions; `_NumberPropertyBase`,
   `NumProperty`, `FloatPropertyBase`, `VecPropertyBase`, `allprops.ts` deleted;
   `Int`/`Float`/`Vec2`/`Vec3`/`Vec4`/`Quat`/`Mat4` public constructors converted.
   path.ux side: `loadNumConstraints` becomes the merge; `NumSlider`, `TextBox` hold
   category instances; `container_prop.ts`, `ui.ts`, `ui_widgets2.ts`,
   `markdown_provider.ts`, `datapath-walker.mjs` read through categories; `gen:paths`
   output diffed. Barrel fixture regenerated.
3. **Remaining categories.** `Text`, `Enum`, `Bitfield`, `Elements`, `StringSet`,
   `Buffer`, `Curve`; `StringPropertyBase`, `EnumPropertyBase` deleted; remaining
   constructors converted, `Enum`/`Flag` taking their definition in the options object.
   path.ux side: `dropbox.ts`, `container_prop.ts` enum branches, `theme_editor.ts:1185`,
   the string widgets. Barrel fixture regenerated.
4. **`PropFlags` and `subtype` removed.** `flag` accessor and `packFlags` stay (the STRUCT
   needs them) but no code reads bits: every reader on `Access` or a `ui` field, the three
   controller internals on `dpath.flag`, `LABEL`/`SELECT` gone; `subtype` replaced by
   `units.dimension === "color"`; `PropSubTypes` deleted from both files. path.ux side:
   `theme_editor.ts:1175–1183`, `controller.ts` colour writes and the unused `:345,349`
   arguments.
5. **`PropTypes` removed.** All bitmask and equality sites on `has()`; `PropTypes`,
   `setPropTypes`, `PropClasses`, `customPropertyTypes`, `register`, `getClass`,
   `internalRegister`, `PROP_TYPE_ID` deleted; `TYPE extends number` becomes the string
   tag, the class is renamed `ToolPropertyBase` and `ToolProperty` becomes the union;
   `legacyTypeId()` takes over the STRUCT's `type` field; `ListProperty` constructed only
   from a template instance. Barrel fixture regenerated.
6. **Builder.** `DataPath` typed by property class; methods rewritten as category
   assignments; `DataPathToolProperty` deleted; `setXXX` deleted from the property
   classes.
7. **Docs.** `toolprop.md`, `container.md`, `controller.md`, `toolsystem.md`, the
   `CLAUDE.md` ToolOp section's examples.
8. **Close the record; acceptance.** The record's prose written from the consumer's seat;
   `migration check` green. Acceptance: bump `visualnovel`'s gitlink through
   `migration plan`, write its local plan from the output alone, land it, and load a
   committed `vngen/work/graphs/*.json` written before the change. Anything the record
   failed to say goes back into the record before it closes.

## Status

- [ ] Plan written
- [ ] Pressure-tested; findings folded in below
- [ ] Stage 1: record opened; `Category`; `Access`; base constructor
- [ ] Stage 2: numeric categories
- [ ] Stage 3: remaining categories
- [ ] Stage 4: `PropFlags`, `subtype` removed
- [ ] Stage 5: `PropTypes` removed
- [ ] Stage 6: builder
- [ ] Stage 7: docs
- [ ] Stage 8: record closed; `visualnovel` acceptance

## Pressure test

A fresh-context review returned seventeen findings. What each changed:

1. The review said STRUCT version 3 would break every committed gengraph file in a VN
   project because `@vn/gengraph` validates before `migrateSTRUCT` can run. That part is
   wrong: `migrate.ts:43` runs `migrateJSON` first, and it reaches nested properties. What
   stands: the plan's list of what persists property STRUCTs named two things that are
   never serialized and missed the eight that are. Fixed by enumerating the carriers in
   Context, and — for the reasons in Decisions rather than for gengraph — by not changing
   the on-disk format in this plan.
2. One version bump for three STRUCT-changing stages would have produced indistinguishable
   intermediate files. Moot under (1).
3. `migrateSTRUCT` has two shapes (binary post-order on the object, JSON pre-read on raw
   JSON) and the abstract-list design left the reconcile rule for a mismatched category
   list undefined. Moot under (1); recorded here so the format-change plan that follows
   knows both.
4. Stage 1 could not be green: `ToolPropertyIF`'s own `flag` field shadows an accessor,
   and every non-numeric subclass still called `super()` positionally for two stages.
   Fixed: `ToolPropertyIF` folds in at stage 1; the base constructor takes `(options?)`
   from stage 1 and every `super()` call is rewritten then, with public signatures
   converting per stage.
5. `has(Numeric)` cannot express scalar-versus-vector, which three sites need. Fixed:
   `has(Numeric) && !has(Vector)`, and the `QUAT` inconsistency resolved and recorded.
6. Two `has()` signatures; stacked narrows do not refine the value; `readAttrs` typed
   `Partial<this>` in a static. Fixed: one signature, narrowing order stated, static
   return type corrected. The review verified with `tsgo` that ToolOp's typed inputs
   survive.
7. `fields[].attr` as a name could not express `range` ↔ `min`/`max` or `integer` ↔
   membership, and `merge` had no way to see programmatic sets. Fixed: `attrs` is a
   reader; membership is read by the widget; `explicit` is filled by accessors as well as
   by `readAttrs`.
8. fairmotion's module augmentations and flag bits, webgl-app-framework's legacy struct
   name map. Fixed: in Context, in the searches, and consumer categories described.
9. The constructor search false-positived on vector literals and missed multi-line calls
   and positional `super()`. Fixed: searches added, the record told to say what the
   searches are for.
10. `ListProperty` stores a template instance, not a type id. Fixed: `Elements.template`.
11. Seventeen classes, not twelve; `Curve1D`, `Bool`, `Mat4`, `Report` missing; `Int`
    without `Units` contradicted the code. Fixed: a row per class.
12. Three of the four "doubtful" flags are live and already have a home on `DataFlags`.
    Fixed: they move to `dpath.flag`; only `SELECT` and `LABEL` are deleted.
13. The `register` collision was not fixed by anything in stage 1. Fixed: bump to 18.
14. Dependency on `migration-records.md` unstated; its request for a signature-diff
    decision unanswered; barrel fixture failures per stage unplanned. Fixed: ordering
    stated, no signature diff, fixture regenerated per deleting stage.
15. Category struct names would have been file content from the first write; a consumer
    subclass with no `static categories` would have had no `access`. First moot under (1);
    second fixed by the base declaring `[Access]`.
16. The colour-units stage was speculative and contradicted the Decisions. Cut to a
    follow-up plan; `dimension` stays as a plain field so `subtype` can still go.
17. Count and reader-list corrections, `theme_editor.ts:1185` in stage 3, `allprops.ts`
    absorbed, `datapath-walker.mjs` handled. Fixed throughout.
