# Application-supplied rich text plugins

Import plugin hosting separately from the base rich text entry point. A registry holds
trusted application implementations; attaching a document host supplies policy for one
session. Merely registering a plugin grants no permission to mount it.

```ts
import { DocumentWidgetHost, WidgetRegistry } from "path.ux/scripts/widgets/richtext/plugins";
import { notePlugin } from "./note_plugin";

const registry = new WidgetRegistry();
registry.register(notePlugin);
const host = new DocumentWidgetHost(session, registry, {
  document : { path: "notes/example.md" },
  authorize: ({ action, record }) => record.type === "example.note" && action !== "external",
});
await host.insert(
  { id: crypto.randomUUID(), type: "example.note", version: 1, payload: { text: "Hello" } },
  null,
  applicationContext
);
```

The [note plugin](../example/editors/properties/note_plugin.ts) demonstrates a native text
input, local drafts, conflict detection, and one undo entry per commit. The Markdown example
provides an Insert note widget button and two views of the same document. Its external-action
policy denies every action. Ordinary editors with no document host retain inert placeholders
for plugin records and preserve their source.

## Provider and session contracts

A provider opts in through `DocumentProvider.widgets`, a `WidgetStorage<Doc>`. It reports
block or inline placement, returns immutable detached records with relevant-value revisions, and builds
insert/update/remove/move edits. Reads never activate plugins. Its clipboard parser allocates
new IDs on paste; its `pasted` method reports incoming records for insertion policy checks.
Its snapshots and inverses must preserve complete values and identities without plugin code.
The Markdown implementation uses data-only block snapshots and atom edits. Other providers remain
compatible without implementing this optional capability.

`host.update(snapshot, payload, context)`, `remove`, `move`, and `migrate` require a current
snapshot from storage. Commands resolve that snapshot under the shared history lock and refuse
stale or deleted targets. Updates validate the replacement and authorize both the current
and new record. Migration runs only through `host.migrate`; it validates output and records
the converted data once. Undo and redo replay data even after registry removal or mount-policy
denial. Session write authorization still gates all history operations.

A plugin supports one payload version and defaults to block placement. `validate` checks its saved value;
`create` returns the common `WidgetView`. Its context exposes `prepareUpdate`, `update`, draft
registration, an immutable application document descriptor, and cancellation. Each view has
independent DOM and drafts. A view must retain the snapshot its draft began from so a remote
commit cannot silently change that draft's precondition. Draft commands must come from that view's
`prepareUpdate`; arbitrary provider edits are refused. The session save barrier handles
conflicts and partial commits.

```ts
field.widgetHostFactory = (session) =>
  new DocumentWidgetHost(session, registry, {
    document : { path: currentDocumentPath },
    authorize: applicationPolicy,
  });
```

`RichTextArea.widgetHostFactory` creates instance-owned configuration for each new session,
including format replacement. It must return the host attached to that session. Format changes
require resolving pending drafts first. Changing the factory disposes old views and preserves
detached drafts for recovery. No credentials or document policy belong in global format
registration. Disposing a session also disposes its document host.

## Policy and source retention

Policy distinguishes `insert`, `mount`, `edit`, and `external`. Each callback gets the current
record and application document descriptor. Call `host.invalidate(newOptions)` when the path,
metadata, or policy changes; it cancels existing mounted generations in all views and
reevaluates policy before constructing replacements. Registry registration/removal does this
automatically. Rendering never migrates or edits stored data.

`context.external(action, callback)` checks permission before invoking the callback, passes
the mount abort signal, and discards a result after revocation, replacement, or a change to
the source record. Applications must authorize actual destinations and redirects inside
their service implementations. This callback gate supplies no network service, credentials,
default fetcher, player, iframe, or service detection. Resource and submission protocols
remain future work. Trusted plugin JavaScript runs with application privileges; this API is
not a sandbox. Applications can still perform their own model edits through provider APIs.

The [architecture](plans/rich-text-widgets.md#persistence-and-clipboard) specifies the exact
envelope and clipboard limits. Supported records canonicalize when edited; unedited records,
including unavailable payload versions, retain source. Unknown and malformed reserved fences
render inert placeholders. Ordinary code fences keep their meaning. Duplicate valid IDs are
repaired by changing only the duplicate envelope's ID token. Clipboard HTML escapes record
source; it does not instantiate payload HTML or interpret resource URLs.

Structured paste into an unsupported provider is explicitly refused and emits
`clipboardunsupported`. Invalid structured data emits the editor's existing `inputrefused`.
Plain-text paste is an explicit source fallback; pasting into a Markdown code block inserts
literal source. Transfers exceeding the limits are refused without cutting the selection. Structured text
entries are parsed separately so an unfinished ordinary code fence cannot consume a later
record. An unclosed reserved container in a structured transfer is explicitly refused.
Schema adapters and external resource services remain optional modules. Migration is explicit.

## Inline records

Register a plugin with `placements: ["inline"]` or `placements: ["block", "inline"]`, then use
`host.insertInline(record, { block, offset }, applicationContext)`. Use
`host.moveInline(snapshot, position, applicationContext)` to move an existing inline record.
Updates, removal, migration and drafts use the same APIs as block plugins. A location-only
change leaves an inline payload snapshot valid; changing its saved value makes it stale.

Markdown stores each record as `{{pathux-widget-v1:HEX}}`, with hexadecimal UTF-8 JSON produced
by `encodeInlineWidget` from the optional widget codec module. Paragraphs, headings, list
items and quotes support these atoms. Code blocks and table cells keep literal source.
Escaping the opening brace or using a code span also produces literal text. Code/link marks
split around atoms; converting a paragraph to code preserves record source as literal text.
Unknown records stay inert and retain their source. No media view or network service is implied.

Inline selection uses one document character per record. Tab enters its first control;
Shift+Tab enters its last. Escape exits after the atom, and Shift+Tab from the first control
exits before it. Controls own their internal clipboard and composition. Outer copy/paste uses
the structured widget transfer, with fresh IDs on paste and explicit refusal by unsupported
providers. Mount identity and independent drafts are retained separately in each editor view.
