# Property and tool system: tasks

Five plans, in the order they land. Tasks 1, 2 and 5 are written and pressure-tested;
tasks 3 and 4 are named by task 2 and not yet written. Each plan records its own stage
status; this file records only whether the plan is written and whether it has landed.

Status: none landed. Tasks 1, 2 and 5 written; tasks 3 and 4 to be written.

<!-- toc -->

- [Why this order](#why-this-order)
- [Task 1 — migration records](#task-1--migration-records)
- [Task 2 — property categories](#task-2--property-categories)
- [Task 3 — the property STRUCT format](#task-3--the-property-struct-format)
- [Task 4 — colour as a unit dimension](#task-4--colour-as-a-unit-dimension)
- [Task 5 — tool handlers](#task-5--tool-handlers)

<!-- regenerate with pnpm markdown-toc -->

<!-- tocstop -->

## Why this order

- path.ux has four superproject consumers, all pinned by submodule, three of them well
  behind `master`. The property rewrite is the first structural change large enough that
  a consumer cannot be brought forward by reading the diff, so the mechanism for telling
  a consumer what changed has to exist before the change does. Task 1 is that mechanism;
  task 2 is the first plan to open a record with it.
- Task 2 leaves the on-disk STRUCT layout untouched so that the categories can settle
  before their names become file content. Task 3 changes the layout once they have.
- Task 4 needs `Units.dimension` from task 2 and a vector-aware conversion in
  `units/units.ts`; nothing consumes a colour unit yet, so it waits for a consumer that
  does.
- Task 5 is independent of tasks 2–4 in substance, but it edits `toolop.ts` too and opens
  a record of its own, and one record is open at a time, so it lands after task 2 has
  closed its record. It could equally land between task 2 and task 3.

## Task 1 — migration records

Plan: [`migration-records.md`](migration-records.md). Written, pressure-tested.

- Records in `documentation/migrations/`, tied to commit ranges derived from each record's
  own git history; `buildtools/migration.mjs` with `barrel-diff`, `module-diff`,
  `manifest`, `check` and `plan`; the authoring rule in `CLAUDE.md`.
- Stages 1–3 (directory and rules; the oracles and `check`; `plan`) must land before task
  2's stage 1, which opens a record. Stages 4–6 (the `pre-epoch` record, the
  `webgl-app-framework` acceptance, the consumer-side line) can land in parallel with
  task 2.

## Task 2 — property categories

Plan: [`property-categories.md`](property-categories.md). Written, pressure-tested.

- `ToolPropertyBase<VALUE, TYPE extends string, C>` plus categories (`Access`, `Numeric`,
  `Integer`, `Vector`, `Quaternion`, `Units`, `Text`, `Enum`, `Bitfield`, `Elements`,
  `StringSet`, `Buffer`, `Curve`), each with a `ui` sub-object; `has()`; `ToolProperty`
  as a union over the built-ins; options-object constructors; the `DataPath` builder
  typed by property; widgets holding category instances.
- Removes `PropTypes`, `PropFlags`, `subtype`, `ToolPropertyIF`, the `setXXX` setters and
  the intermediate base classes. The STRUCT format is unchanged.
- Acceptance is bumping `visualnovel` through `migration plan`.

## Task 3 — the property STRUCT format

Plan: not yet written. Named in `property-categories.md` § Decisions and § Serialization.

- Replaces the flat version-2 layout with one that serializes the categories, and bumps
  `TOOLPROP_SCHEMA_VERSION`.
- Must handle what task 2's review found: `migrateSTRUCT` has two shapes (JSON pre-read on
  raw JSON, binary post-order on the loaded object); a version bump per STRUCT-changing
  stage, or all STRUCT changes in one stage; a rule for a file whose category list
  disagrees with the class's `static categories`; category struct names namespaced
  (`toolprop.Numeric`) from the first commit, because nstructjs names are global and
  become file content on the first write.
- Carriers to test against are listed in `property-categories.md` § Context: gengraph
  files (which migrate before validating), the toolstack and macro stacks,
  `ListProperty`, fairmotion's binary `.fmo` files, webgl-app-framework's legacy struct
  name map.
- Opens its own migration record with a `struct` surface and a **Save files** section.

## Task 4 — colour as a unit dimension

Plan: not yet written. Named in `property-categories.md` § Decisions.

- A colour space becomes a unit of dimension `color`, so a colour button is
  `Numeric + Vector + Units` with `units.dimension === "color"` and no special case.
- `Unit.toInternal`/`fromInternal` become vector-aware so a colour space can convert;
  `srgb`, `linear-rgb` and `lab` to start, with `srgb` the internal form so `ColorPicker`
  keeps its storage and converts at its boundary.
- Open: how `Units.display` is interpreted for a multidimensional unit.
- Waits for a consumer that needs a non-sRGB colour property.

## Task 5 — tool handlers

Plan: [`tool-handlers.md`](tool-handlers.md). Written, pressure-tested.

- `ToolOp` goes headless; `ToolHandler` is the event side, bound or op-less, pushed on the
  event modal stack or resting — four kinds that are four different hacks today. A
  handler reaches its op only through `inputs` and `apply()`, which defaults to `exec`
  alone. `startHandler` for op-less gestures; `MacroHandler` for a macro's modal steps,
  with per-member cancel; the resting op-less form is a toolmode.
- Removes `is_modal`, `modalStart`/`modalEnd`, `modal_ctx`, the `ModalCTX` generics,
  `ToolOp`'s `EventHandler` base and the module-level `modalstack`.
- Acceptance is webgl-app-framework converting its transform ops and composing a
  toolmode with the base.
