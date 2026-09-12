# Meta tags

A meta tag records what a control is, in a form another program can read. It attaches to a
widget (or to any object with the right shape), serializes with nstructjs so it can cross IPC,
and holds no ephemeral state — scroll positions and open panels are `saveData`/`loadData`, and
those two systems do not overlap.

The system lives in two modules. `scripts/core/base/ui_meta_tags.ts` holds the tags themselves
and imports nothing at runtime but nstructjs, so a node process with no DOM can build the same
record a live screen would produce. `scripts/core/base/ui_meta_walk.ts` holds the half that
needs the DOM.

<!-- toc -->

- [What a tag is](#what-a-tag-is)
- [Storage](#storage)
- [The owner](#the-owner)
- [StdUXMeta](#stduxmeta)
- [Tools, and identity](#tools-and-identity)
- [Writing a tool subclass](#writing-a-tool-subclass)
- [widgetPath](#widgetpath)
- [Reading a tag back](#reading-a-tag-back)
- [The headless split](#the-headless-split)
- [Who writes a tag today](#who-writes-a-tag-today)
- [What this is not](#what-this-is-not)

<!-- tocstop -->

## What a tag is

```ts
import { StdUXMeta, PathToolMeta, widgetSegment } from "path.ux";

button.ensureMeta(StdUXMeta).tools.push(new PathToolMeta("scene.deleteObject"));

const tag = button.getMeta(StdUXMeta)!;
tag.description; // the widget's tooltip text
tag.valuePath; // the datapath the widget is bound to
tag.enabled; // whether it accepts a press
tag.refusal; // why it would refuse, whether or not it is disabled
```

A tag class extends `UXMetaTag` and declares a `metaDefine()` returning a stable `typeName`. The
name rather than the constructor is the key, because a constructor identity does not survive
IPC. `StdUXMeta` is the one shipped tag, under the type name `"meta"`.

## Storage

Tags hang off the owner in a `Map` under a module-private symbol.

- `getMeta(owner, ctor)` — the tag, or undefined. A miss allocates nothing.
- `setMeta(owner, ctor, tag)` — attaches one. A second write for the same type name warns and
  overwrites, so use it only where the caller owns the tag outright.
- `ensureMeta(owner, ctor)` — the existing tag, or a new one attached in place. This is what a
  builder should call, since two layers may both want to describe one control.
- `allMeta(owner)` — every tag on the owner, for a sweep that does not know the classes.

`MetaTagSet` is the serialization container for the same map: an `array(abstract(pathux.UXMetaTag))`
plus the owner it belongs to, whose `onAttach()` rebinds each loaded tag's `owner` and calls the
tag's own. Nothing in path.ux constructs one today; a consumer that ships a whole tag set over the
wire as one struct uses it.

`UIBase` carries `getMeta`, `setMeta` and `ensureMeta` as methods. `UIBase.getMeta` walks
`parentWidget` on a miss when the tag class sets `inherits` in its `metaDefine()`; no tag class
shipped here sets it.

## The owner

A control is not always a `UIBase`. path.ux's own menu rows are raw `HTMLLIElement`s, and an app
drawing into an `appendSurface` root uses plain elements. So the owner bound is structural and
every member is optional:

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

Each accessor proxies when the owner declares the property and buffers when it does not.
Assigning a property the owner never declared would make an expando that nothing else reads, so
the buffer is the correct answer rather than a degraded one. `onAttach` flushes buffered values
only into properties the owner can hold and leaves the rest buffered.

A tag with no owner at all buffers everything, which is what lets a rules module build the same
record headlessly.

## StdUXMeta

| Field         | Reads                                                                    |
| ------------- | ------------------------------------------------------------------------ |
| `widgetPath`  | Filled by the writer, from `widgetPathOf`. See below.                    |
| `description` | `owner.description` — the raw tooltip text, not the composed one.        |
| `valuePath`   | The `datapath` DOM attribute, which every path-binding builder writes.   |
| `enabled`     | `!owner.disabled`.                                                       |
| `refusal`     | `owner.refusalReason`, called if it is a thunk, with no `disabled` test. |
| `tools`       | The tools the control runs. Appended to, never replaced.                 |

`refusal` is deliberately ungated, so `resolveRefusal` is the wrong helper to reach for here.
`resolveRefusal` answers undefined for a control that is not disabled, which is right for a
tooltip and wrong for a record: a rule that computes a refusal for a control the editor draws
enabled is silently inert on screen, and that is exactly the defect a record exists to catch.
The display value is `enabled ? undefined : refusal`.

`description` keeps returning the raw text rather than the composed tooltip. `composeTooltip`
stays the single authority for putting a refusal above a description.

## Tools, and identity

`UXToolMeta` is the base class for what a control runs. It is a class rather than an interface
so `abstract(pathux.UXToolMeta)` names a registered struct and nstructjs validates each entry
against it. A subclass narrows on `type`.

```ts
identity(): string; // default: `${this.type}\0${this.toolPath}`
```

`UXToolMeta` also carries an optional `requirements` string — why the control refuses right now,
or the precondition that would produce that sentence. It serializes, is copied by `copyTo`, and is
the second argument of `new PathToolMeta(toolPath, requirements?)`. A subclass with its own
refusal machinery overrides it the way it would `identity()`.

`identity()` states what tells two otherwise identical controls apart. Override it when the
subclass carries a discriminator — a row key, a command's `on` target. The default is enough for
`PathToolMeta`, the concrete subclass path.ux ships, which carries a tool path and nothing else.
Hashing the result is how `widgetSegment` builds the segment; changing what `identity()` reads
rewrites every committed `widgetPath` underneath it.

nstructjs registers struct names globally and consumer save files depend on them, so a new
subclass name is a permanent commitment.

## Writing a tool subclass

A consumer describing its own controls subclasses `UXToolMeta`, registers a struct, and narrows
on `type`.

```ts
export class MyUXToolMeta extends UXToolMeta<"mytype"> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
    myapp.MyUXToolMeta {
      supplies: array(string);
    }`
  );

  readonly type = "mytype" as const;
  /** Prop names whose values are read from the widget when the tool runs. */
  supplies: string[] = [];

  override identity(): string {
    return `${super.identity()}\0${this.supplies.join(",")}`;
  }

  copyTo(b: this): this {
    super.copyTo(b);
    b.supplies = [...this.supplies];
    return b;
  }

  copy(): this {
    return this.copyTo(new MyUXToolMeta() as this);
  }
}
```

Three things the class has to satisfy:

- **A constructor that takes no arguments**, because nstructjs builds one before loading it.
- **`copy` and `copyTo`**, chaining to `super.copyTo` so the inherited fields come along.
- **`identity()` overridden** if the subclass carries a discriminator. Leaving it at the default
  makes every control running the same tool path share a `widgetSegment`.

Pass the union of a consumer's subclasses to `StdUXMeta` to narrow on `type` when reading:

```ts
const tag = widget.getMeta<StdUXMeta<MyUXToolMeta>>(StdUXMeta)!;
for (const tool of tag.tools) {
  switch (tool.type) {
    case "mytype":
      tool.supplies; // narrowed
      break;
  }
}
```

## widgetPath

A `widgetPath` is `<scope>/<segment>`.

- **The scope comes from the writer**, never from the library. It names the home the control is
  drawn in, which the caller knows and a widget tree does not.
- **The segment is `widgetSegment(tag)`**, `<stem>~<hash>`.
  - The **stem** is a slug of the first tool's path, else the flattened `valuePath`, else `w`.
    It carries no identity; it is there so a diff can be read by a person.
  - The **hash** is eight hex digits of FNV-1a over an allow-list: the flattened `valuePath`,
    then each tool's `identity()` in order.

The allow-list is the point. A scrub list would fail open — a field added later enters the hash
unless someone remembers to exclude it — and `description`, `enabled` and `refusal` are pure
state that must never move a path. A field enters the hash only when someone puts it there.

`valuePath` is flattened before hashing: every `[<digits>]` becomes `[]`. A list-bound widget
carries `foo[3].bar`, and without this, inserting a row rewrites the path of every row after it.
Every row of a list therefore shares a segment, which is correct — they are the same control,
and what tells them apart is the tool's `identity()` carrying the row's key.

**A repeated segment within one scope is a collision to report, not one to disambiguate.**
`widgetPathOf` returns the path it computed. An occurrence index would need two writers to count
in the same order, and a DOM walk and a rules module do not.

```ts
for (const owner of walkWidgets(screen)) {
  const path = widgetPathOf(owner, "shots");
  // path is undefined when the owner carries no StdUXMeta
}
```

`walkWidgets` descends `childNodes` and then any shadow root, the same descent `saveUIData`
walks, and yields only nodes that carry at least one tag.

## Reading a tag back

```ts
const tag = readMetaJSON(json, StdUXMeta);
```

`readMetaJSON` runs `validateJSON` before `readJSON` and throws an `Error` naming the struct when
validation fails. It passes a collecting logger, so the complaint arrives in the thrown message
rather than as a stack and the whole STRUCT script printed to a console the caller is about to
throw past.

A tag naming a tool subclass the receiving side has not registered is rejected rather than read
back with a short `tools` array: nstructjs resolves the element class by struct name and throws
for one it does not know.

## Who writes a tag today

- **`container.tool(path)`** — `toolImpl` tags the button it builds with a `PathToolMeta`.
- **Tool-path menu rows** — `createMenu` fetches the row back with `menu.itemById` and tags it.

Both use `ensureMeta` and append to `tools`. An app that also tags a control through its own
layer would otherwise get a console warning per control and a clobbered tag.

`HotKey` is out of scope. A hotkey is not a widget and has no owner to attach a tag to;
recording keybindings needs a keymap-enumeration API that no consumer has asked for.

## What this is not

- **Not `saveUIData`.** That addresses a widget by two numbers per DOM hop, which is right for a
  scroll position and wrong for a committed model, where inserting one widget rewrites every
  record below it. The two schemes coexist and answer different questions.
- **Not part of a save file.** Tags describe the UI, not the document. They are built to cross
  IPC.
- **Not `_id`.** That is `tagname_N` off a global counter — unique within one session and
  meaningless across two.
