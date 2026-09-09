# Finishing the meta-tag system

Turns the sketch at `scripts/core/base/ui_meta_tags.ts` into a carrier a consumer can rely on:
barrel exports, an owner type that covers a raw DOM node, a `widgetPath` scheme, the refusal on
the tag and on the wire, a validating deserialize, and one concrete tool subclass with the
builders that write it.

Status: **planned**. Plan 6 of the eight in the superproject's
[`ux-behaviour-model-tasklist.md`](../../../../docs/plans/ux-behaviour-model-tasklist.md), and
the last piece owed before plan 7 can replace the desktop app's `AnchorDump` with a tag.

Revised twice. First after a fresh-context pressure test, which invalidated the draft's
`widgetPath` scheme, its owner interface, its hash input and one of its stages — see
[Findings](#findings) for the disposition of each result. Then again once `path-controller`
was opened for this plan, which let the refusal keep its shape on the wire instead of being
flattened into it.

<!-- toc -->

- [What is there today](#what-is-there-today)
  - [Built](#built)
  - [Owed](#owed)
  - [Three claims in the reports that are now stale](#three-claims-in-the-reports-that-are-now-stale)
- [The tag tree is flat](#the-tag-tree-is-flat)
- [The owner is not always a `UIBase`](#the-owner-is-not-always-a-uibase)
- [The module stays headless](#the-module-stays-headless)
- [`widgetPath`](#widgetpath)
  - [Scope, then segment](#scope-then-segment)
  - [`identity()`, and why the hash reads an allow-list](#identity-and-why-the-hash-reads-an-allow-list)
  - [Collisions are reported, not disambiguated](#collisions-are-reported-not-disambiguated)
- [The refusal, on the tag and on the wire](#the-refusal-on-the-tag-and-on-the-wire)
- [A validating deserialize](#a-validating-deserialize)
- [`toolPath`, and the one concrete subclass](#toolpath-and-the-one-concrete-subclass)
- [Public API added to the barrel](#public-api-added-to-the-barrel)
- [What deliberately does not change](#what-deliberately-does-not-change)
- [Answers an implementer would otherwise guess at](#answers-an-implementer-would-otherwise-guess-at)
- [Repos](#repos)
- [Risk](#risk)
- [Cost to undo](#cost-to-undo)
- [Stages](#stages)
  - [Stage 1 — the barrel, first](#stage-1--the-barrel-first)
  - [Stage 2 — the owner interface](#stage-2--the-owner-interface)
  - [Stage 3 — `enabled`, `refusal`, and `toolsys.Refusal`](#stage-3--enabled-refusal-and-toolsysrefusal)
  - [Stage 4 — `identity()` and `widgetSegment`](#stage-4--identity-and-widgetsegment)
  - [Stage 5 — the walk, in its own module](#stage-5--the-walk-in-its-own-module)
  - [Stage 6 — a validating deserialize](#stage-6--a-validating-deserialize)
  - [Stage 7 — `PathToolMeta` and the builders](#stage-7--pathtoolmeta-and-the-builders)
  - [Stage 8 — document](#stage-8--document)
- [Findings](#findings)
  - [Accepted](#accepted)
  - [Rejected](#rejected)

<!-- tocstop -->

## What is there today

`ui_meta_tags.ts` is 326 lines, of which the first 54 are a commented usage example. The example
is the specification the module has not caught up with, and three of the four names it uses —
`walkWidgets`, `widgetPathOf`, and a concrete `UXToolMeta` subclass — do not exist.

### Built

- **Storage.** `setMeta`, `getMeta`, `ensureMeta` and `allMeta` keep a `Map` under a module
  symbol on the owner, keyed by `metaDefine().typeName` rather than by constructor, so the key
  survives IPC.
- **`UIBase` methods.** `getMeta`, `setMeta` and `ensureMeta` are on the widget base class
  (`ui_base.ts:1287`, `:1299`, `:1302`), and `getMeta` walks `parentWidget` when the tag class
  sets `inherits`.
- **`StdUXMeta`.** Carries `widgetPath`, `description`, `valuePath` and `tools`, with a
  `deserialHelper` that buffers `description` and `valuePath` until an owner exists — which is
  also the storage when there is no owner at all, so a rules module can build the same record
  headlessly that a sweep reads off a live widget.
- **`valuePath` is trustworthy.** It proxies to the `datapath` DOM attribute
  (`ui_meta_tags.ts:274`), and every builder that writes that attribute joins the container's
  prefix first. Audited across `core/utils/container_widgets.ts`, `container_enum.ts`,
  `container_prop.ts` and `core/ui.ts`: eight sites write the attribute without a visible
  `_joinPrefix` on the same line, and all eight join it into the variable earlier in the same
  function, or are the re-prefixing pass at `ui.ts:372`.
- **The struct chain validates.** `UXMetaTag`, `UXToolMeta`, `MetaTagSet` and `StdUXMeta` each
  register a struct, and both `abstract(...)` declarations name a registered base class rather
  than an interface.

### Owed

Four pieces, and the barrel is the first of them rather than the last.

- **Nothing is exported.** `pathux.ts` does not mention `ui_meta_tags`, and `ui_base.ts` imports
  it without re-exporting (`ui_base.ts:96`). Every name below is unreachable from outside the
  source tree, which is why the module has no consumers and no test has ever exercised it.
- **`widgetPath` has no scheme and no writer.** It is a plain field nothing sets.
- **No refusal on the tag**, so the sentence a control is refusing with cannot reach a record.
- **No validating deserialize**, so a consumer reading a tag back off the wire has `readJSON`
  and no check in front of it.
- **`toolPath` is written by nobody**, and there is no concrete `UXToolMeta` to write it with.

### Three claims in the reports that are now stale

Checked against the tree while writing this, so the implementer does not spend the time again
and the superproject's tasklist can be corrected.

- **`MetaTagSet.STRUCT` was said to declare `array(abstract(IUIXMeta))` over an interface.** It
  declares `array(abstract(pathux.UXMetaTag))` over a registered base class. Fixed already.
- **Three builders were said to ignore `dataPrefix`** — `textareaImpl`, `viewerImpl` and
  `iconcheckImpl`. All three join now (`container_widgets.ts:356`, `:386`,
  `container_enum.ts:27`).
- **`iconcheck` was said to drop its tooltip**, reading a `name` that resolved to the global. It
  reads `description ?? ""` now (`container_enum.ts:24`).

## The tag tree is flat

The module's commented example implies a tree: `widgetPathOf(w)` naming a widget by its position
among other tagged widgets. Nothing will produce that tree, and the first draft of this plan
designed a `/`-joined ancestor chain that cannot exist.

- **Only controls carry tags.** Plan 7 has the desktop app's `act()` write a `StdUXMeta`, and
  `act()` is per-control. Nothing in either plan tags a container, a pane or an editor, so the
  chain of meta-bearing ancestors above any control has length zero.
- **The derived tier has no tree to walk in the first place.** A rule module's entry point is
  `controls(state: S): readonly Offer[]` (`apps/desktop/renderer/rules/model.ts:77`) — a flat
  list of leaf offers with no ancestor structure. There is nothing for it to chain.

So a path is a **scope plus one segment**, and the scope is supplied by the writer rather than
discovered by walking. That is not a retreat from the report's ambition: the desktop app already
identifies a control by an anchor key plus a home, and this is the same shape with the key
computed from the tag instead of assembled by hand.

## The owner is not always a `UIBase`

`StdUXMeta` is typed `UXMetaTag<Elem extends UIBase>`, and its accessors call
`owner.description` and `owner.getAttribute("datapath")`. Two populations of control cannot
satisfy that:

- **path.ux's own menu rows.** `MenuItem extends HTMLLIElement` (`menu_types.ts:48`). It is a raw
  DOM element, and the three fields it does carry are `_disabled`, `_refusalReason` and
  `_description` (`:56-60`) — underscore-prefixed, deliberately, so a refusal can compose above
  a row's own text without `title` swallowing both.
- **The desktop app's raw-DOM controls.** Controls inside an `appendSurface` root are plain
  elements, and the app's `applyOffer` already branches on it: a path.ux widget gets
  `description` and `refusalReason`, a raw node gets a composed `title`
  (`apps/desktop/renderer/rules/anchors.ts:96-104`). Plan 7 has the sweep read every control, so
  a tag that only attaches to a `UIBase` records a subset of the screen.

So the bound becomes structural, and every member is optional because the second population has
none of them:

```ts
export interface MetaOwner {
  description?: string;
  disabled?: boolean;
  refusalReason?: Refusal | (() => Refusal | undefined);
  getAttribute?(name: string): string | null;
  setAttribute?(name: string, value: string): void;
  removeAttribute?(name: string): void;
}
```

`UIBase` satisfies it in full. `HTMLElement` satisfies only the three attribute methods —
`disabled` is on form elements alone, which is why `applyOffer` guards it with
`'disabled' in node` rather than assuming it.

**Proxying is an optimization for owners that can hold the value, not a requirement.** Each
accessor already has a buffered path for the ownerless case, and the test widens from "no owner"
to "an owner that cannot hold this":

- **Getter** — proxy when the property is present on the owner, else read the buffer.
- **Setter** — proxy when the property is present, else write the buffer. Never assign a property
  the owner does not declare: installing `description` on an `HTMLLIElement` would make an
  expando that nothing else reads, which is the silent failure the `in` test exists to prevent.
  The two `setAttribute` / `removeAttribute` calls in `set valuePath` (`ui_meta_tags.ts:283`,
  `:285`) become conditional, which is also what makes them compile once the members are
  optional under `strict`.
- **`onAttach`** flushes the buffer only into properties the owner can hold, and leaves the rest
  buffered rather than dropping them.

A menu row therefore buffers everything and proxies nothing, and that is correct rather than a
degradation: the builder writes the tag at the same moment it sets `_description` and
`_disabled`, and a popup menu is built per press and lives seconds without being mutated
(`menu-item-disabling.md`, § Scope and limits, "Re-evaluation is one-shot"). Reading the two
underscore fields from `ui_meta_tags.ts` is deliberately not proposed: it would put one module's
private field names into another module's contract, to save a builder one assignment.

## The module stays headless

`ui_meta_tags.ts` imports exactly two things: `type { UIBase }`, which erases, and `nstructjs`.
That is not an accident to preserve casually — it is the condition that lets the derived tier
exist.

- The superproject's jest is node-only, and maps three deep path.ux aliases —
  `pathux-graph`, `pathux-toolprop`, `pathux-base-types` (`jest.config.cjs:72-74`) — and
  deliberately **not** the widget barrel, because `pathux.ts` reaches `config/const.ts`, which
  assigns `window.DEBUG` at module scope (`const.ts:288`).
- Plan 7 has rule modules construct a `StdUXMeta` where they build an `Offer` today. That is a
  runtime import from node, so it needs a fourth alias pointing straight at this module — which
  only resolves if the module pulls in no DOM.

**Rule for this plan: `ui_meta_tags.ts` gains no runtime import beyond `nstructjs`.** Two
consequences, each of which shapes a stage:

- **The walk goes in a sibling module.** `walkWidgets` needs `UIBase` at runtime for its
  `instanceof` test, and `widgetPathOf` calls it. Both go in a new `ui_meta_walk.ts`. The pure
  half — `widgetSegment` and its digest — stays in `ui_meta_tags.ts`, because the derived tier
  has to compute it.
- **The digest is written here rather than imported.** `util.strhash` would do the job, but
  `path-controller/util/util.ts` imports `mobile-detect` and has thirty-six DOM references, so
  importing it forfeits the property. A dozen lines of FNV-1a, unexported, is the price.

Plan 7 owns the wiring: an alias line in the superproject's `jest.config.cjs`,
`apps/desktop/vite.config.ts` and root `tsconfig.json`. The first two map to source; the third
maps to a built declaration under `apps/desktop/dist/pathux-types/`, which `build:pathux-types`
emits for the whole path.ux tree and `pnpm check` runs first (`apps/desktop/package.json:9-10`),
so a new module's `.d.ts` appears without a build change. Plan 6 owes the headless property, not
the wiring.

## `widgetPath`

The field's own doc comment points at `saveUIData`'s scheme, and that is the wrong answer.
`saveUIData` (`ui_savedata.ts`) addresses a widget by two numbers per hop — the child index, and
1/0 for whether the hop crossed into a shadow root — walking `childNodes` and then
`shadow.childNodes`. Correct for its own job, where a stale path costs a lost scroll position.
Wrong for a committed model, where inserting one widget earlier in a container rewrites every
record below it. `_id` is not a candidate either: it is `tagname_N` off a global counter
(`ui_base_init.ts:90`), unique within one session and meaningless across two.

### Scope, then segment

A `widgetPath` is `<scope>/<segment>`.

- **scope** — supplied by the writer, not discovered. The desktop app passes the home a control
  is drawn in, which both tiers already know: the measured side from which surface it swept, the
  derived side from `Row.editor` (`apps/desktop/renderer/rules/model.ts:72`). path.ux takes it as
  an argument and never invents one, so the app's home vocabulary stays out of the library.
- **segment** — `<stem>~<hash>`, computed from the tag alone by `widgetSegment(tag)`.
  - **stem** — a slug of the first present of `tools[0].toolPath` or `valuePath`, else `w`.
    Lowercased, runs of non-alphanumerics collapsed to `-`, trimmed to 24 characters. It carries
    no identity; it is there so a diff of a committed model can be read by a person.
  - **hash** — eight lowercase hex digits of FNV-1a over the identity string below.

Both tiers compute `widgetSegment` from the same pure function over the same fields, and both
supply their own scope. There is nothing left for them to disagree about by construction, which
is what the first draft asserted and could not deliver.

### `identity()`, and why the hash reads an allow-list

`UXToolMeta` gains one method:

```ts
identity(): string;   // default: `${this.type}\0${this.toolPath}`
```

The identity string a segment hashes is the tag's normalized `valuePath`, then each tool's
`identity()` in order, `\0`-joined.

The first draft hashed `nstructjs.writeJSON(tag)` with three fields scrubbed. That is the wrong
default in three separate ways, each of which the review demonstrated:

- **A scrub list fails open.** Any field added later — including `enabled` and `refusal`, which
  this very plan adds — enters the hash unless someone remembers to scrub it. Both are pure
  state, so the plan's own top risk would have fired on day one from a field the plan itself
  introduced. An allow-list fails closed: a new field is not in the hash until someone puts it
  there.
- **`writeJSON` identity is inherited silently.** `StructTStructField.toJSON` resolves the struct
  from `valCtor[keywords.name]` (`vendor/nstructjs/src/struct_intern2.ts:974-980`), so a
  subclass that forgets its own `inlineRegister` serializes as its parent and drops its
  discriminators with no error. Every widgetPath under it then collides and nothing says why.
- **The struct name itself enters the hash**, so renaming a consumer's tool class would rewrite
  every path beneath it.

`identity()` is explicit, so a subclass states what makes it a different control rather than
having it derived from a serialization format. The desktop app's subclass returns the command id
plus `on`, `supplies` and `form` — the discriminators its anchor keys assemble by hand today.

**`valuePath` is normalized before hashing: every `[<digits>]` becomes `[]`.** A list-bound
widget carries `foo[3].bar`, and path.ux has an `IndexedDataPathRegistry` for exactly that shape.
Without normalization, inserting a row rewrites the `valuePath`, hence the hash, hence the path,
of every row after it — reproducing the positional churn the scheme exists to avoid, in the list
case that is the scheme's own motivating example. With it, every row of a list shares a segment,
which is correct: they are the same control, and what tells them apart is the tool's `identity()`
carrying the row's key.

### Collisions are reported, not disambiguated

The first draft appended an occurrence index. That cannot work here: the two tiers would have to
count occurrences in the same order, and they cannot. The measured side counts in DOM walk order
across a home; the derived side counts within one module's `controls()` list, and two modules
draw into one home already — `assetview` and `promptview` both answer for `asset`
(`apps/desktop/renderer/rules/model.ts:90-106`).

So there is no index, and a repeated segment within one scope is an error the consumer reports.

That matches how the consumer already works. Plan 4 shipped the rule "two controls in one pane
share a key only with a discriminator": within a home a key is unique by construction, and a
duplicate fails a lint rule rather than being silently disambiguated. A colliding `widgetPath` is
the same defect, surfaced by the same means — which is the model's purpose, not an obstacle to
it.

Eight hex digits are defensible at that scope. A home holds hundreds of controls, not millions;
a genuine hash collision between two different controls is roughly one in ten thousand at five
hundred controls, and it surfaces as a reported duplicate rather than as a wrong record.

## The refusal, on the tag and on the wire

The report guessed one accessor would do. It needs two, and they serialize differently from how
they read.

`resolveRefusal` (`ui_base_props.ts:64`) returns nothing unless the control is disabled, so
`disabled` is the authority and the refusal only explains it. That makes "a disabled control
states why" exactly `disabled && resolveRefusal() === undefined`. But it also means the tag
cannot record the second failure the model is meant to catch — a rule module that computes a
refusal for a control the editor draws enabled, which is silently inert on screen — because
`resolveRefusal` collapses that case to `undefined`.

So `StdUXMeta` gains two accessors:

- **`enabled: boolean`** — `!owner.disabled`, buffered when the owner carries no `disabled`.
- **`refusal: Refusal | undefined`** — the _ungated_ value: `owner.refusalReason`, called if it
  is a thunk, with no `disabled` test. Buffered when the owner carries none.

`resolveRefusal` stays the display authority and is `enabled ? undefined : refusal`. This is the
one place in the feature where deliberately not sharing a helper is correct, and the doc comment
on `refusal` must say so, because the next reader will try to unify them.

**On the wire the refusal keeps its shape: `Refusal` becomes a registered struct.** It is a bare
interface today (`path-controller/toolsys/toolop.ts:195`) with no `inlineRegister`, and
nstructjs's `struct(...)` and `abstract(...)` both need a registered struct. The second revision
of this plan opened `path-controller`, so the fix is the direct one — a class with the two data
fields, `inlineRegister`ed as `toolsys.Refusal` beside `toolsys.ToolStack` and `toolsys.ToolOp`.
`StdUXMeta.STRUCT` then gains `enabled: bool` and `refusal?: struct(toolsys.Refusal)`, and the
accessor stores the object it is given.

The alternative the first revision settled on — two flat strings, `refusalReason?` and
`refusalDescription?`, composed and decomposed by the accessor — is what a plan that could not
touch `path-controller` has to do. It works, and it is strictly worse: it splits one value across
two fields at exactly the boundary where "`Refusal.description` and the widget's own
`description` are different sentences" is the thing a reader has to keep straight.

**An object literal still serializes.** Every consumer writes a refusal as one — `refuse()` in
the desktop app returns `{ reason }`, and `MenuItem._refusalReason` is assigned literals — and a
class with only data fields is structurally satisfied by them, since statics do not participate
in instance assignability. On the write side nstructjs does not consult the value's constructor
either: `StructStructField.toJSON` resolves the struct from the declared field type
(`vendor/nstructjs/src/struct_intern2.ts:812`), unlike the `abstract(...)` form, which reads
`valCtor[keywords.name]` (`:974`). Reading back constructs a real `Refusal`, which is
structurally the same thing.

Two consequences to write down rather than discover:

- **`instanceof Refusal` is not a valid test** and must not appear anywhere. It is false for every
  literal in the tree today. The doc comment on the class says so.
- **`Refusal` becomes a runtime export**, not only a type, and it travels the same
  `toolsys/index.ts` -> `controller.ts` -> `pathux.ts` chain that `toolopRefusal` and
  `ToolRefusedError` already do. It is a name in the barrel diff.

**Verify that optional-of-struct parses.** `StdUXMeta.STRUCT` already carries `widgetPath?` and
`description?`, so `?:` over a primitive is proven; `?:` wrapping `struct(...)` is not exercised
anywhere in this tree. Stage 3 establishes it before the field is relied on, and falls back to a
non-optional field written as an empty refusal if it does not hold.

Neither `enabled` nor `refusal` enters the hash, because the hash reads an allow-list and they
are not on it.

## A validating deserialize

nstructjs has the halves: `validateJSON(json, cls, useInternalParser?, printColors?, logger?)`
returns a boolean (`vendor/nstructjs/src/structjs.ts:59-67`), and `readJSON` deserializes. What
is missing is one function that will not let the second run without the first.

```ts
export function readMetaJSON<T>(json: unknown, cls: StructableClass<T>): T;
```

- Calls `validateJSON` first, passing a collecting logger rather than the default, and throws an
  `Error` naming the struct when it returns false. Returning `undefined` on bad input would put
  the burden back on every caller; letting the default logger run would `console.error` a stack
  and the entire STRUCT script on a path that is about to throw anyway
  (`struct_intern.ts:1503-1509`).
- Then `readJSON`.

**An unregistered tool subclass already fails, and no count check is needed.**
`StructTStructField.validateJSON` resolves the element class with
`manager.get_struct(valObj[key])` (`struct_intern2.ts:920`), which throws for an unknown struct
name; `manager.validateJSON` wraps the walk in try/catch and returns `false`
(`struct_intern.ts:1487-1512`). So a tag naming a subclass the receiving side has not registered
is rejected rather than silently deserialized with a short `tools` array.
`validateJSONIntern` additionally rejects any key not in the STRUCT (`:1618-1620`).

**The open question the tasklist leaves — `validateJSON` or a STRUCT-to-zod converter —
resolves to `validateJSON`.** A converter is a second schema to keep in step with the first, and
the boundary a tag crosses is between two halves of one program. It does not follow that a
consumer must do the same at its own boundary: the desktop app already validates its committed
`anchors.json` with zod and is free to keep doing so over the assembled dump. That is plan 7's
call, and this plan does not pre-empt it.

## `toolPath`, and the one concrete subclass

`toolPath` is written by nobody, and cannot be: `UXToolMeta` is abstract and the module ships no
concrete subclass, only a commented example. So the first half is
`PathToolMeta extends UXToolMeta<"path">` — registered, with no fields beyond the inherited
`toolPath` and `requirements`, and the default `identity()`.

Two builder sites:

- **`toolImpl`** (`core/utils/container_menu.ts:120`) resolves the path, builds the exec callback
  around it and sets a tooltip from the tooldef, then discards the string. It writes the tag at
  the end, on whichever of the two branches produced `ret`.
- **Tool-path menu rows** in `menu_ops.ts`. This is the site the owner widening is for, and it
  is not one line: the branch calls `menu.addItemExtra(def.uiname, id, hotkey, def.icon)`
  (`menu_ops.ts:114`) and keeps only the id, so the row has to be fetched back with
  `menu.itemById(id)` (`menu.ts:542`) before a tag can go on it.

**Both sites use `ensureMeta` and append to `tools`; neither calls `setMeta`.** `setMeta` keys by
`metaDefine().typeName`, which is `"meta"` for every `StdUXMeta`, and on a second write it
`console.warn`s and overwrites (`ui_meta_tags.ts:120-126`). A `container.tool()` button that the
desktop app also passes through `act()` would otherwise produce a warning per control and a
clobbered tag. Plan 7's `act()` must do the same, and the doc comment says so.

**`HotKey` is out of scope, and not deferred.** Its `action` is a toolpath string or an opaque
callback (`simple_events.ts:908`), but the blocker is simpler than that split: a `HotKey` is not
a widget and has no owner to attach a tag to. Recording keybindings through this system needs a
keymap-enumeration API no consumer has asked for, and the desktop app answers "a shortcut is
bound once" from its own table already (plan 4).

Both builder sites are submodule hygiene with no desktop consumer: the app's controls run
`@vn/commands` ids through `act()`, so a command id reaches a record through the app's own
`UXToolMeta` subclass, not through `toolPath`. They are here because leaving the one field the
struct advertises permanently empty is worse than filling it, and because `toolImpl` is where a
future path.ux consumer will look first.

## Public API added to the barrel

`pathux.ts` does not mention `ui_meta_tags` and `ui_base.ts` imports it without re-exporting, so
nothing in the module is reachable today. That is why it has no consumers, and it is stage 1
rather than the last stage: exporting the module as it stands makes every later stage's addition
show up in that stage's own barrel diff, instead of arriving as one unreviewable block at the
end.

Two lines are added to `pathux.ts`, beside the existing `export { composeTooltip }`:

```ts
export * from "./core/base/ui_meta_tags";
export * from "./core/base/ui_meta_walk";
```

`export *` rather than a named list, because the whole module is the intended surface. Per
`CLAUDE.md`, that makes anything the two modules export public, so the split is load-bearing:

- **Public from `ui_meta_tags.ts`** — `UXMetaTag`, `UXToolMeta`, `PathToolMeta`, `StdUXMeta`,
  `MetaTagSet`; `getMeta`, `setMeta`, `ensureMeta`, `allMeta`; `widgetSegment`, `readMetaJSON`;
  and the types `IUXMetaDef`, `IUXMetaConstructor`, `TagSet`, `MetaOwner`.
- **Public from `ui_meta_walk.ts`** — `walkWidgets`, `widgetPathOf`.
- **Internal, and must stay unexported** — the FNV-1a digest, the stem slugger, and the
  `valuePath` index normalizer. All three sit in a module the barrel now reaches, so exporting
  one for a test would publish it.
- **One name changes kind rather than appearing.** `Refusal` is exported from
  `path-controller/toolsys/toolop.ts` already, but as a type; making it a class makes it a
  runtime export through the same `export *` chain. It is the one entry in the barrel diff that
  does not come from the two new modules, and the one that a `.d.ts` diff alone would show as
  unchanged.

No collisions: all sixteen names above were checked against the tree, and none is exported
anywhere else.

**The verification needs both halves.** `CLAUDE.md` prescribes diffing the sorted
`Object.keys()` of the built `dist/pathux.js` against a pre-change baseline, which catches the
twelve runtime names. The four types are erased from the bundle, so they need a `.d.ts` diff as
well — the leak `CLAUDE.md` warns about, arriving through an `export *` line that reads
identically either way, is invisible to the runtime check alone.

## What deliberately does not change

- **`HotKey`.** For the reason above: no owner, and no consumer.
- **`resolveRefusal` stays in `ui_base_props.ts`.** The first draft moved it to a DOM-free module
  so `ui_meta_tags.ts` could import it; since `refusal` is deliberately ungated, nothing in
  either new module ever calls it, and the move would have been a split with no consumer and a
  circular-import risk booked against it.
- **`saveUIData`'s path scheme.** It keeps its positional walk, which is right for ephemeral
  data. The two schemes coexist and address different problems.
- **`MetaTagSet.onAttach` stays uncalled by the framework.** Nothing constructs a set today; it
  is a serialization container, and wiring it into the widget lifecycle is speculative until a
  consumer sends one.
- **`getMeta`'s inherit walk.** No tag class in this plan sets `inherits`.
- **`StdUXMeta.description` keeps returning the raw `_description`**, not the composed tooltip.
  That is the right value for a record's `tooltip` field, and `composeTooltip` remains the single
  authority for the display ordering.
- **`MenuItem`'s underscore-prefixed fields.** Renaming them to match `UIBase` would let a menu
  row proxy instead of buffer, and would touch the menu code `menu-item-disabling.md` has just
  shipped, to save one assignment in a builder.

## Answers an implementer would otherwise guess at

- **Why `identity()` defaults to `type` plus `toolPath` rather than being abstract.**
  `PathToolMeta` has nothing else, and an abstract method would make every consumer subclass
  write a body before it could compile. The doc comment states the contract: override it when the
  subclass carries anything that tells two otherwise identical controls apart.
- **Why the stem is not hashed.** It is derived from fields already in the identity string, so it
  adds no information; it is there to be read.
- **What `widgetSegment` does with an empty tag** — no tools, no `valuePath`. Stem `w`, and the
  hash of an empty identity string, which is stable. Two such widgets in one scope collide and
  are reported, which is the right answer: a control with no path and no tool has not said what
  it is.
- **Where `enabled` reads for a raw DOM node.** The accessor buffers when `disabled` is not a
  property on the owner, rather than reading an attribute — an element that never had the
  property should record what the consumer set, not `true` by default.
- **Why the digest stays a private copy now that `path-controller` is open.** `util.strhash`
  lives in a module that imports `mobile-detect` and touches the DOM, so using it still costs the
  headless property; giving it a DOM-free home in `path-controller` would instead cost a second
  superproject alias for jest to resolve, since the derived tier has to compute the same value. A
  dozen unexported lines in the module the app already has to alias is cheaper than either.
- **What a consumer does with a reported duplicate.** Nothing in path.ux: `widgetPathOf` returns
  the path it computed. Detecting the duplicate belongs to whoever assembles a scope's records,
  which for the desktop app is the same place that already runs the key-once-per-home rule.

## Repos

`scripts/path-controller` is a git submodule of path.ux on its shared default branch, and
path.ux is itself a submodule of the superproject. This plan straddles only the outer boundary:

- **In path.ux:** `core/base/ui_meta_tags.ts`, the new `core/base/ui_meta_walk.ts`,
  `core/utils/container_menu.ts`, `menu/menu_ops.ts`, `pathux.ts`, `documentation/`, `tests/`.
- **In `path-controller`:** `toolsys/toolop.ts` only — `Refusal` becomes a registered class. The
  user opened the inner submodule for this plan on 2026-09-09; without that this is the two-flat-
  fields design instead, and nothing else in the plan changes either way.
- **In the superproject:** the gitlink bump, and the tasklist's row 6 plus its three stale
  claims. No `apps/` or `packages/` change — plan 7 is the first consumer.

Consequences, per path.ux's `CLAUDE.md` and the superproject's:

- **Ask before committing or advancing either submodule's default branch.** A gate, not a
  formality, and it now applies twice: `path-controller` under path.ux, and path.ux under the
  superproject. Being authorized to _modify_ `path-controller` is not authorization to advance
  its shared default branch.
- Innermost commit first, then each gitlink bump outward, as one logical change:
  `path-controller`, then path.ux's gitlink, then the superproject's.
- **Stage 3 is the only stage that spans both submodules**, so it is two commits in a fixed
  order — the `path-controller` class first, then the path.ux side that declares the field —
  rather than one. Per `menu-item-disabling.md` § Repos, the "green on its own" contract is
  verified from the outer checkout, so the first of the two is green only in the sense that
  nothing yet references it.
- **The gate is four commands, not three.** `pnpm run typecheck`, `pnpm run test`,
  `pnpm run lint`, and `pnpm run playwright` for the two stages whose tests need a DOM —
  `pnpm run test` is `vitest run` and does not run the Playwright suite. Note also that
  `tests/*.ts` is in `tsconfig.json`'s `exclude`, so a stage whose deliverable is largely tests
  is not type-checked by the first pass; `pnpm run typecheck`'s second pass over `example/` is
  what checks the public surface.
- The superproject's `pnpm check && pnpm test && pnpm lint` is green at the gitlink bump.

## Risk

- **Highest: the identity string is a one-way commitment.** Once a consumer commits a model keyed
  by `widgetPath`, changing what `identity()` reads rewrites every path in it. The allow-list is
  the defence, and it is the reason the design is an allow-list: a field added later cannot enter
  the hash by being forgotten. A test that sets `description`, `enabled`, `refusal` and
  `requirements` and asserts the segment is unchanged pins it.
- **High: `export *` publishes more than intended.** Two new modules go onto the barrel, and the
  runtime `Object.keys()` diff cannot see the four types. Both halves have to run, and stage 1 is
  where the baseline is taken.
- **Medium: widening the owner type.** `Elem extends UIBase` becomes `Elem extends MetaOwner`, so
  attaching a tag to something with no `description` stops being a type error and becomes a
  buffer. The getter/setter `in` test is what makes that correct rather than merely quiet, and
  each of the four accessors needs a test on an owner that can hold the value and one that
  cannot.
- **Medium: the two builders write a tag that a consumer also writes.** `ensureMeta` plus
  appending to `tools` is the containment; a `setMeta` slipping into either site produces a
  console warning per control and a clobbered tag, which is a runtime symptom with no compile
  error.
- **Medium: `Refusal` changes kind, in the innermost submodule.** Interface to class is
  structurally invisible to every consumer that writes a literal, which is all of them — so the
  compiler will not point at anything if the assumption is wrong. The containment is that
  `instanceof` is documented as invalid and grepped for once, and that `struct(...)` provably
  ignores the constructor on write.
- **Low: nstructjs is vendored twice.** path.ux depends on `nstructjs: ^0.8.12` from npm while
  the superproject's jest and vite redirect to the `vendor/nstructjs` submodule; both are 0.8.12
  today, and the caret range lets them diverge. It matters only if a future version changes
  `writeJSON` field ordering, which the identity string no longer depends on — worth noting, not
  worth pinning here.

## Cost to undo

- **The barrel exports are the expensive half.** Once published and imported by the desktop app,
  removing a name breaks a consumer with a compile error — loud, but a coordinated change across
  two repos.
- **`PathToolMeta` is a one-way door for a reason unrelated to this plan.** nstructjs registers
  by class name globally, and path.ux's `CLAUDE.md` is explicit that saved files in consumer
  projects depend on those names. Removing or renaming the class later is a compatibility break,
  not an additive revert.
- **`widgetPath` is cheap to change and expensive to have changed.** The code is contained; the
  cost is any committed model keyed by it, which is why `identity()` and the normalization are
  settled here rather than discovered later.
- **The owner interface is a widening**, so reverting it is a narrowing that breaks every raw-DOM
  tag written in the meantime. Practically one-way once plan 7 lands.
- **`toolsys.Refusal` is a second permanent global struct name**, for the same reason
  `PathToolMeta` is. Narrowing the class back to an interface later also un-serializes every
  record that carried one.
- **`enabled`, `refusal`, `readMetaJSON` and the two builder calls are additive** and revert
  cleanly.

## Stages

Each stage is green on its own under the four commands in [Repos](#repos). Stage 1 changes the
public surface deliberately and first, so every stage after it is reviewed against a barrel diff
that grows one stage at a time.

### Stage 1 — the barrel, first

The two `export *` lines; the `Object.keys()` baseline from `dist/pathux.js` and the `.d.ts`
baseline, both checked in as fixtures with the test that compares against them. Nothing else
changes, so this stage is exactly the module as it stands becoming public.

### Stage 2 — the owner interface

`MetaOwner`; `StdUXMeta`'s generic rebased onto it; the four accessors' getter and setter rules;
`onAttach` flushing only what the owner can hold. Tests: a tag on a raw `HTMLLIElement` buffers
`description` and does not install an expando on the element; a tag on a `UIBase` proxies both;
`valuePath` set on an owner with no `setAttribute` buffers rather than throwing; `onAttach` onto
a raw node leaves `description` buffered and readable rather than dropped.

### Stage 3 — `enabled`, `refusal`, and `toolsys.Refusal`

Two commits, innermost first.

**3a, in `path-controller`:** `Refusal` becomes a class with the two data fields, registered as
`toolsys.Refusal`, with a doc comment saying `instanceof` is not a valid test. Grep the
superproject and path.ux for any `instanceof Refusal` first. Tests: a plain object literal
round-trips through a `struct(toolsys.Refusal)` field; `toolopRefusal` and `CanRunResult` are
unaffected.

**3b, in path.ux:** the two accessors, with the doc comment saying why `refusal` is ungated and
does not call `resolveRefusal`; `enabled: bool` and `refusal?: struct(toolsys.Refusal)` added to
`StdUXMeta.STRUCT`. Establish that `?:` over a struct parses before relying on it. Tests:
`refusal` returns the sentence on an enabled control where `resolveRefusal` returns undefined; a
thunk is called on read and not on assignment; a tag with a refusal round-trips with `reason` and
`description` intact; a tag with no refusal round-trips with the field absent.

### Stage 4 — `identity()` and `widgetSegment`

`UXToolMeta.identity()` with its default; the digest, the stem slugger, the `valuePath` index
normalizer and `widgetSegment`, only the last exported. Tests: the segment is unchanged across a
`description`, `enabled`, `refusal` and `requirements` change; it changes with `valuePath` and
with an overridden `identity()`; `foo[3].bar` and `foo[7].bar` produce the same segment while
`foo[3].baz` does not; an empty tag produces a stable segment. The `identity()` override test
needs a concrete subclass — use `PathToolMeta` if stage 7 has landed, and otherwise a test-local
class registered under a `test.` struct name, since nstructjs's name table is global.

### Stage 5 — the walk, in its own module

`ui_meta_walk.ts` with `walkWidgets` — mirroring `saveUIData`'s `childNodes` then
`shadow.childNodes` descent and yielding only tag-bearing owners — and
`widgetPathOf(widget, scope)`, which is `scope + "/" + widgetSegment(tag)`. Playwright, since it
needs a real shadow tree, so this stage's gate includes `pnpm run playwright`. Tests: a widget
inside a shadow root is reached; a tag-free container yields nothing; two identical siblings
yield the same path, which is the reported-collision case. Also assert `ui_meta_tags.ts` still
imports nothing but `nstructjs` at runtime — a test over the module's import list is the cheapest
form, and it is what keeps the headless property from being lost to a plausible-looking later
edit.

### Stage 6 — a validating deserialize

`readMetaJSON`, with the collecting logger. Tests: a well-formed tag round-trips; a tag with a
missing required field throws with the struct named and without the default logger's stack on the
console; a tag naming an unregistered tool subclass throws.

### Stage 7 — `PathToolMeta` and the builders

The class, plus `toolImpl` and the `menu_ops.ts` tool-path rows writing it through `ensureMeta`
and `menu.itemById`. Needs a DOM, so this stage's gate includes `pnpm run playwright`. Tests: a
button built by `container.tool("some.path")` carries a tag whose one tool has that `toolPath`; a
menu row built from a tool-path template does too; neither writes a tag on the custom-callback
path; a second `ensureMeta` on the same widget appends rather than warning and clobbering.

### Stage 8 — document

A `documentation/` page for the system, and the `widgetPath` field's doc comment rewritten off
this plan — it currently points at `saveUIData`, which stage 4 makes wrong. The superproject's
tasklist row 6 and its stale "Two path.ux bugs" section, with the gitlink bump.

## Findings

From a fresh-context pressure test of the first draft. Twenty-three results; the disposition of
each is below.

### Accepted

1. **The derived tier cannot produce a `/`-joined ancestor chain.** `controls` returns a flat
   `readonly Offer[]`. Fixed: a path is a scope plus one segment, and the scope is supplied.
   [The tag tree is flat](#the-tag-tree-is-flat).
2. **The tag tree is flat in practice**, so "siblings under one parent" was the whole screen.
   Same fix; the scope is now stated rather than discovered.
3. **The two tiers cannot count occurrences in the same order**, since two modules draw into the
   `asset` home. Fixed: no occurrence index, and a duplicate is reported.
   [Collisions](#collisions-are-reported-not-disambiguated).
4. **`enabled` and `refusal` needed STRUCT fields, and `Refusal` is not a registered struct.**
   Fixed twice. The first revision used three flat wire fields, because `path-controller` was
   out of scope; the second registers `toolsys.Refusal` and keeps the nested shape, after the
   user opened that submodule. The allow-list hash, which is what stops state fields entering the
   identity string, came from this finding and is unchanged by the second pass.
   [The refusal](#the-refusal-on-the-tag-and-on-the-wire).
5. **`MetaOwner` did not describe a `MenuItem`**, whose fields are underscore-prefixed, and
   `HTMLElement` has no `disabled`. Fixed: proxy-or-buffer stated for both getter and setter, a
   menu row buffers, and the false `HTMLElement` claim is gone.
6. **`ui_refusal.ts` had no consumer.** Dropped; recorded under
   [what does not change](#what-deliberately-does-not-change).
7. **nstructjs's behaviour on an unregistered subclass is already settled in source.** Fixed: the
   investigation and its count-check contingency are gone, replaced by the cited behaviour.
8. **The `Object.keys()` check cannot see the four types.** Fixed: a `.d.ts` diff as well.
9. **The `menu_ops.ts` site needs `menu.itemById`**, and the barrel note quoted there was about
   a different module. Both fixed.
10. **Indexed data paths churn the hash.** Fixed: `[<digits>]` normalizes to `[]`.
11. **`toolImpl` and `act()` would collide on typeName `"meta"`.** Fixed: `ensureMeta` and append,
    at both sites and in plan 7.
12. **Playwright is not `pnpm run test`.** Fixed in [Repos](#repos) and on the two stages.
13. **The setter half of the owner rule was undecided.** Fixed, including the expando hazard.
14. **Two one-way doors were missing from Cost to undo.** `PathToolMeta`'s global struct name is
    now listed; the silent-inheritance door closed with the move to `identity()`.
15. **Line-number drift** in four citations. Fixed.
16. **The collision claim checked seven of sixteen names.** Fixed; all sixteen checked.
17. **The struct name entered the hash.** Moot: the hash no longer reads `writeJSON`.
18. **The barrel was called urgent and staged last.** Fixed: it is stage 1.
19. **Two nstructjs copies under a caret range.** Recorded under [Risk](#risk); no pin, since the
    identity string no longer depends on serialization ordering.
20. **`readMetaJSON` should pass a logger.** Fixed.
21. **`tests/*.ts` is excluded from the first typecheck pass.** Recorded in [Repos](#repos).

### Rejected

- **13 — the superproject alias is more than a config line.** Half right, and the half that is
  right is smaller than stated: the root `tsconfig` does map to built declarations, but
  `build:pathux-types` emits them for the whole path.ux tree and `pnpm check` runs it first, so a
  new module needs no build change. The text now says which of the three maps to source and which
  to declarations, rather than claiming a uniform one-line change.
- **20 — determinism of `writeJSON`.** Confirmed rather than rejected, and now moot: the hash
  reads `identity()`, so STRUCT field ordering no longer enters it.
