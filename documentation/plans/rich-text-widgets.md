# Embedded rich text widgets

Implementation status and acceptance evidence live only in the [task list](rich-text-widget-tasks.md).

## Reading guide

- This document defines the shared architecture, persistence, lifecycle, history, host policy,
  and native table integration.
- [Forms and front matter](rich-text-widget-forms.md) defines schema adapters and the
  visualnovel integration.
- [Implementation tasks](rich-text-widget-tasks.md) owns all task status and completion evidence.

## Purpose

Rich text documents need interactive forms, native table editing, charts, and views of
external data. These features share requirements for focus, lifecycle, selection, and undo,
but they do not all need the same storage format.

Build a common embedded-widget host. Native provider widgets, host-supplied media renderers,
and registered plugins use that host. Providers retain ownership of document structure and
serialization. Applications explicitly supply plugin implementations and authorize external
embeds. The default Markdown editor does not acquire video players or iframe support.

The motivating plugin is a form driven by a Zod schema or an nstructjs struct. The form
control should also work outside rich text. A Markdown table editor is a native provider
widget and is a second test of the shared hosting contract.

Visualnovel is a concrete intended consumer. It stores structured document fields as YAML
front matter validated by Zod, alongside an authored body. Refactoring its editor must allow
the same form control to bind those existing fields without migrating them into plugin JSON.

## Existing behavior

The [provider contract](../../scripts/widgets/richtext/provider.ts) exposes a flat sequence
of blocks. Inline atoms contribute one `ATOM_CHAR`; opaque blocks are selected and deleted
as a unit. Providers render atom wrappers with `data-doc-atom` and
`contenteditable="false"`, with caret slots around inline atoms.

`DocumentSession` references a per-document or shared application toolstack and owns its
document change notifications. `DocEditOp` stores
edits and inverses as JSON. Provider `custom` operations already support native operations
such as changing an image's width. Embedded path.ux controls receive a `ProviderContext`
whose `ctx.editor` bridge submits edits and whose toolstack belongs to the session.

The Markdown provider already exposes `renderMedia(image, ctx)`. It calls this synchronous
hook for image atoms, including references written as `![video](clip.mp4)`. The host may
return an element; `undefined` selects `MdImageWidget`. Custom elements replace the image
widget and do not inherit its resize or move controls. The source remains a media reference.
Ordinary links and bare URLs do not pass through this hook. Literal video and iframe HTML
is preserved as inert raw block source, not instantiated.

Markdown tables occupy opaque blocks containing their Markdown source. Supported GFM
tables mount the reusable cell editor; unsupported tables retain the static fallback. [Block rendering](../../scripts/widgets/richtext/editor_render.ts)
replaces dirty block elements wholesale. The editor also handles input events at its root
and restores document selection after edits. Those behaviors need explicit support for
interactive children before forms or table cells can be edited reliably.

## Ownership

| Component            | Owns                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------- |
| Document provider    | Native structure, widget placement and storage, operations, snapshots, serialization, clipboard conversion |
| Embedded-widget host | Mounted instances, lifecycle, input ownership, focus, selection coordination, error fallback               |
| Plugin definition    | Payload interpretation, validation, supported versions, migrations, renderer factory                       |
| Application          | Available plugins, document-specific policy, schema catalog, external services, credentials                |
| Widget view          | Local interaction state and drafts; requests to change authoritative data                                  |

Plugin definitions are ordinary imported modules. The framework supplies contracts and
hosting primitives; optional packages or application modules supply implementations. A
document names a plugin but never supplies a module URL or executable implementation.

Registries are explicit objects supplied by the application, not a process-wide mutable
catalog. Registration checks duplicate type identifiers. One registry can serve several
documents. A document host attached to a session supplies policy and services for that
document. Each editor has its own mounted instances, so two views share saved data without
sharing DOM, focus, drafts, or pending view requests.

`RichTextArea` must expose the same instance configuration and carry it across the sessions
it creates. A global format registration must not capture one field's credentials, document
path, or policy. Existing applications that supply no host retain current behavior.

## Three ways to create an embedded view

### Native provider widgets

A provider renders a native object through a reusable control and translates the control's
commands into provider operations. A Markdown table uses this route. It remains a Markdown
table on disk and does not gain a plugin record solely to obtain focus or lifecycle support.

### Media references

Keep `renderMedia` as an explicit application extension point. Its result can be hosted by
the common lifecycle machinery without changing the saved media reference into a plugin.
The hook remains synchronous; a host can return a loading view that resolves data later.

An existing callback returning only an `HTMLElement` remains supported with its existing
re-render semantics. A new descriptor form can opt into keyed updates and disposal. Providers
must supply a stable runtime identity for these views; an atom's current offset is not an
identity because neighboring edits move it. No default media recognizer is introduced.

### Plugin records

A plugin record is a provider-independent value. The block envelope is:

```ts
interface WidgetRecord {
  id: string;
  type: string;
  version: number;
  payload: JsonValue;
}
```

`id` identifies this instance within the document. `type` is a stable namespaced identifier
such as `pathux.form`. `version` versions the plugin payload independently of the provider's
file format. The envelope has its own format version in the serialized container.

Placement belongs to the provider: a record may occupy an inline atom or an opaque block.
Plugins declare supported placements; insertion requires both provider and plugin support.
Forms and tables start as block widgets. Inline plugins remain part of the design, but their
Markdown syntax is deferred until the block implementation proves the hosting contract.

Payloads contain saved configuration, values, and resource references. They contain no DOM,
credentials, constructors, functions, or active requests. Focus, validation display, loading
state, and other temporary UI state belong to the view.

## Provider capability and edit flow

Add an optional widget-storage capability alongside `DocumentProvider`. A provider opting
in must locate records by ID, report placement, insert/update/remove records through edits,
include them in snapshots, and preserve them in its file format and supported clipboard
representations. Existing providers need not implement this capability.

Providers can use shared operation builders and validators while retaining their own model.
Rendering, serialization, and ordinary deletion must work without the plugin implementation
being installed. A plugin is generic across providers implementing this capability; a
plain-text format cannot claim support if saving loses the records.

The view receives an immutable record snapshot and scoped host commands such as
`updatePayload`, rather than a mutable pointer to provider storage. Each request identifies
the widget and its expected revision. The host resolves its current location, checks
permissions, validates the record and editable value representation, and submits the provider edit through the
session. Native widgets use the same flow with provider-specific commands.

Resolve identity, authorize, capture the inverse, and apply the change against the same
current state at the serialized commit boundary. A check performed when a palette opens or
before an asynchronous wait is insufficient. Rejected, stale, or deleted targets produce a
settled refusal result and no history entry. A failed operation must not partially mutate
the document. The shared command boundary captures inverses beside mutation and checks session write
authorization during application history execution.

Use a per-widget revision or relevant-value precondition so unrelated text edits do not
invalidate every request. Concurrent edits to the same value are refused and refreshed
instead of silently overwriting another view. This design does not introduce collaborative
operational transformation or automatic merging of arbitrary payloads.

Markdown plugin commands use complete `replaceBlocks` snapshots, including the contiguous
span touched by a move. Native provider operations can still use `custom` edits with complete
touched spans and position shifts. No plugin-specific history operation is needed. Raw plugin mutations and a second `DataPathSetOp` for
the same change are prohibited: one logical change produces one document history entry.

## Persistence and clipboard

The Markdown block envelope uses the exact info string `pathux-widget-v1`. Its body is one
JSON object with exactly `id`, `type`, `version`, and `payload`. The opening fence has at
least three backticks or tildes; the closing fence repeats it exactly. LF and CRLF are
supported, with optional trailing spaces or tabs on fence lines. Canonical output uses
compact JSON and a backtick fence longer than every backtick run in that JSON. Only top-level
blocks activate records. Nested fences keep ordinary code semantics. Other numbered
`pathux-widget-vN` fences, extra info, malformed JSON, and unsupported envelope shapes are
preserved as opaque source. This is a Markdown extension, not an arbitrary HTML tag.

IDs match `[A-Za-z0-9][A-Za-z0-9._:-]{0,127}`. Types have at least two dot-separated
ASCII segments, begin with a letter, and contain letters, digits, underscores, or hyphens;
their total length is at most 128 characters. Payload versions are integers from 1 through 2147483647. The entire JSON envelope is limited to 65,536 UTF-8 bytes, nesting depth 32,
and 10,000 values. Duplicate object members, accessors, sparse arrays, non-finite numbers,
and the keys `__proto__`, `prototype`, and `constructor` are rejected. A lexical scan bounds
depth and tokens before `JSON.parse`. The Markdown parser still retains the surrounding
document source; these limits bound envelope decoding rather than total document size.

Parsing recognizes the envelope without loading a plugin. Unknown types, future versions,
and disallowed instances render inert placeholders and retain their data. Malformed or
oversized envelopes remain preserved source rather than becoming executable content or
partially interpreted records. Bound parsing depth and allocation; retaining source does
not require eagerly materializing an unbounded payload.

Unedited unsupported source is preserved verbatim. Supported records may use a canonical
serialization. Plugin availability or a policy change never triggers data deletion or a
silent migration. Migrations validate their output and run as explicit undoable document
changes. Schema version changes within a form are separate from plugin payload migrations.

Copy/paste within capable providers preserves the record and creates a fresh instance ID.
Moving within a document preserves identity. Loading detects duplicate IDs and gives each
occurrence a distinct runtime identity before mounting. The format must define how duplicate
persisted IDs are repaired without changing opaque unknown payloads. The first occurrence
keeps its ID; later occurrences get fresh IDs by replacing only the top-level JSON ID token.
All other source bytes, including unknown payloads and CRLF, remain unchanged. Malformed or
future containers have no decoded record and use their provider block identity. Undo restores the
original identity of a deleted instance.

Use a versioned structured clipboard flavor for provider-independent transfers, with
plain-text and sanitized static HTML fallbacks. Clipboard input is untrusted and follows
the same parsing and authorization rules as loaded documents. Unsupported targets receive
an explicit fallback, not a successful insertion that silently loses saved values.

`ClipboardContent.widgetData` carries `application/x-pathux-widgets+json`. Its exact root is
`{format:"pathux-widgets",version:1,blocks:[...]}`; each ordered entry has exactly one member,
either `{widget:WidgetRecord}` or `{text:string}` for Markdown source. Transfers allow at most
1,024 entries and 262,144 UTF-8 bytes, with the same depth and node limits. Paste creates
fresh instance IDs; moves and history retain them. External references remain unchanged.
Malformed structured data refuses insertion rather than falling through to HTML. Editors
whose providers lack widget storage emit `clipboardunsupported` and refuse structured input.
Users can explicitly paste plain text as a source fallback. Oversized copy/cut also emits
that event and preserves the selection without deleting data. Native table cell selection
uses its own TSV/text clipboard behavior, while selecting the outer block copies the
document table. A cell paste is one undoable operation.

External resource references intentionally survive copying. The initial plugin format does
not support hidden cross-widget references inside opaque payloads: generic ID remapping
cannot safely rewrite them. If cross-widget references are added later, they need a standard
reference representation and a defined policy for copying only part of a document.

## Lifecycle and input ownership

Stage 1 uses `WidgetDescriptor` with a session-stable `id`, an implementation token,
an accessible label, an immutable value snapshot, and a factory. The factory receives an
abort signal, a generation check, guarded commands, and draft registration. It returns an
element with update/dispose hooks; asynchronous factories are allowed and late results are
disposed. A per-editor native-block resolver can decline without changing provider rendering.
Providers can supply the same descriptor through `ctx.editor.widget()`; media callbacks may
return a descriptor instead of an element. Runtime Markdown atom IDs survive snapshots,
offset changes, split/join, and moves, but are not written into ordinary Markdown.

The connected-DOM prototype in buildtools/richtext-movement.mjs passed in the installed
Chromium and Firefox engines: `moveBefore()` retained input focus, its selection range, and
the local iframe's document identity. `append()` lost focus and replaced the iframe document.
The host uses connected moves where available, keeps unchanged mount positions on other
engines, and reports a remount when an unsupported move is necessary. Playback continuity
is therefore supported only for retained connected mounts; a remount restarts embedded media.
The acceptance fixture also verifies continued playback of a local canvas stream inside the iframe.
Widget composition holds reconciliation until composition ends. `preserveFocus` on a change (with optional `selection`)
suppresses document caret restoration; other views keep their own focus owner.

The host creates a view with an element, an update method, and an idempotent dispose method.
Identity is scoped by session, editor view, and widget ID. Provider-native blocks can use
their block ID; inline media needs an identity independent of its offset. Rebinding a
session or changing the implementation invalidates its mounted generation.

Dirty blocks must reconcile existing widget mounts instead of replacing them as incidental
children of freshly rendered blocks. Keeping the same JavaScript element reference alone
is insufficient: detaching an iframe can reload it, and moving an active input can disturb
focus or composition. Preserve live mount positions where possible and verify actual
browser behavior for necessary moves. Active compositions defer structural reconciliation
until they can be committed or explicitly canceled.

Views are updated from document changes, including undo, redo, and external reconciliation.
Disposal releases subscriptions, timers, object URLs, and requests on deletion, session
replacement, permission revocation, or editor destruction. Async work carries an abort signal
and generation token. A result for a deleted, replaced, or rebound instance is discarded.
Failures in one view produce a local placeholder while preserving its record.

The host recognizes widget-owned events through the composed event path, including shadow
DOM. Typing, pointer interaction, paste, drop, Tab, and IME inside a control belong to that
control. The surrounding editor must not translate them into text operations. Mutation
diagnostics ignore legitimate mutations inside a hosted view while continuing to check
document-owned wrappers and text.

Tab moves through controls and then exits the widget. Escape leaves widget interaction and
returns focus to a defined document boundary. Backspace or Delete within a field edits the
field; deletion of the entire widget requires outer document selection. Accessible names,
keyboard entry and exit, and visible selection distinguish the two interaction contexts.

Widget commits keep field focus and selection. Extend change/selection handling so a widget
update can explicitly preserve the current focus owner; do not use a fabricated text caret
as the result of every payload edit. Other editors receiving the change retain their own
focus and selection. Read-only and permission changes update mounted views without requiring
document reserialization.

## History and drafts

Form controls and table cells may hold incomplete input locally while a field is being
edited. The first implementation commits on explicit acceptance or blur and groups a cell
paste or structural action into one operation. A form's saved answers may be incomplete or
fail business validation. Record validation checks the envelope and supported editable value
representation; full schema validation reports errors and gates submission. Required fields
and cross-field refinements must not prevent saving progress one field at a time. Input that
cannot yet be encoded as an editable value remains a draft.

Add a session-wide asynchronous `prepareSave()` barrier. Each view registers its draft
controller with the session and unregisters on disposal. The barrier commits encodable,
nonconflicting drafts and returns a typed result distinguishing ready, unencodable input,
conflicting drafts, and refused writes. The ready result identifies the committed session
revision. The application awaits this barrier before saving or navigation and checks that
the revision still matches the snapshot it saves. Any partial draft commits remain ordinary
undoable edits even when another draft prevents the barrier from becoming ready.

Two views holding drafts for the same field must resolve the conflict explicitly rather
than committing in view enumeration order. Concurrent changes arriving during the barrier
also produce a conflict or require a new barrier. Rebuilding or navigating away must not
silently discard drafts. The host exposes pending-draft status so navigation and close flows
can call the barrier or request explicit discard.

Serialization and `RichTextArea.value` remain synchronous reads of committed state. Automatic
datapath publication does not imply that every view's draft has been saved. `RichTextArea`
forwards the barrier and pending-draft status to applications. Applications with autosave
must choose committed-state autosave or invoke the barrier; the framework does not run an
asynchronous save protocol from a property getter.

While a draft is active, Ctrl+Z first uses the control's draft undo. Once committed, document
undo restores the saved value. Cancel restores the committed value. Controls without native
draft history must implement equivalent behavior or commit through a documented transaction
model; they must not accidentally use both histories. Custom operations do not currently
fold, so per-keystroke persistence requires an explicit future transaction design.

External changes to a field with a local draft require a conflict indication and refresh or
explicit replacement. A stale blur must not overwrite the external change. Removing or
locking the widget cancels its ability to commit; the host must surface any displaced draft
according to the application's navigation/conflict policy.

Undo and redo replay recorded data changes without loading plugins, invoking migrations,
fetching remote data, or submitting forms. A revoked render permission leaves restored data
inert. Applications can additionally prohibit document writes, in which case undo/redo
must be refused before moving the history cursor. This check belongs at the history
execution boundary and resolves the target operation's session. It covers the application's
shared toolstack, undo/redo menus, and operation reruns as well as editor shortcuts. A check
only in `EditorBridge.dispatch` or the mounted view is insufficient. If the toolstack lacks a
preflight refusal contract, adding one is a prerequisite; silently skipping an operation
while moving the cursor is not acceptable. Hiding a palette entry alone does not
invalidate history or prevent ordinary document deletion.

## Host policy and security defaults

path.ux is responsible for the safety of its parser, sanitizer, fallback renderer, envelope
handling, and generic hosting machinery. An extension point is not a substitute for those
responsibilities. The goal is a safe default editor with bounded, testable behavior, not a
claim that any implementation can guarantee the absence of all vulnerabilities.

Default Markdown rendering adds no video player, iframe embedding, service detection,
automatic embed fetching, or document-directed code loading. Existing image rendering is
unchanged and may make image requests; this design does not claim the default editor has
no network activity. A document never grants itself capabilities by naming a plugin.

Hosts explicitly provide trusted renderer code. That code runs with the application's
privileges; the registry and service interfaces are not a sandbox for hostile JavaScript.
Supporting untrusted third-party executable plugins would require a separate isolation
design and is outside this proposal.

Distinguish insertion availability, permission to mount an existing widget, permission to
edit its configuration or values, and permission to invoke external actions. Registry
membership alone is not authorization for every instance. Parsing, saving, copying, and
rendering a placeholder do not require activating a plugin.

The document host receives an application-defined document descriptor with URI/path,
metadata, and an explicit invalidation mechanism. The application may inspect contents
through its own model. Reevaluate decisions when relevant content, path, policy, or resource
references change. Stop affected views and pending work when authorization is revoked.
Evaluate policy before constructing a view or starting resource requests, and again when a
command executes. Limit each view to the services and configuration approved for it.

Resource identifiers and credentials remain separate. The document stores a reference;
host services resolve it and supply authentication. Reference resolution must apply host
policy to the actual destination, including redirects or a changed document base path.
Schema retrieval is also resource access and requires authorization.

YouTube illustrates the intended boundary. Supported browser embeds use an iframe, created
directly or by the [IFrame Player API](https://developers.google.com/youtube/iframe_api_reference).
A host may opt in by validating a supported reference, extracting a video ID, and constructing
an iframe with a fixed approved origin and host-controlled attributes. The Markdown parser
still does not instantiate iframe HTML from the document. Uploaded videos and other services
remain subject to separate host policy. This proposal ships no YouTube or video renderer.

## Schema-driven forms

The [forms design](rich-text-widget-forms.md#schema-driven-forms) specifies the reusable
control, normalized schema adapters, native and plugin value bindings, and validation rules.
It shares this document's hosting, history, and authorization contracts.

## Visualnovel: forms over YAML front matter

The [visualnovel integration](rich-text-widget-forms.md#visualnovel-forms-over-yaml-front-matter)
binds existing YAML fields without duplicating them in plugin records. It specifies source
preservation, schema selection, retained sessions, and the application's save/conflict boundary.

## Markdown tables

The reusable `TableEditor` receives a `TableSnapshot`, a `WidgetContext`, and a
`TableAdapter`. Its model contains rectangular rows of authored inline Markdown and column
alignments; row zero is always the header. The Markdown adapter translates `TableChange`
values into a `markdownOps.table` provider operation with complete expected and replacement
source. `tableCommand` resolves the stable block ID and expected source under the history
lock. A stale table never overwrites a later edit.
The surrounding document sees one opaque block; the widget owns cell interaction.

The first version supports ordinary GFM tables, including header and alignment semantics.
Cell edits preserve supported inline formatting and escape pipes and other syntax during
serialization. Treating every cell as plain text and silently dropping formatting is not
acceptable. Nested block widgets, merged cells, spreadsheets, and formulas are outside the
first version. Unsupported table constructs remain preserved and read-only.

Editing a table writes normal Markdown table syntax. Its history snapshots include all
changed table content and restore row/column structure. It requires no plugin registration,
external service, or active HTML from the document. The same control could later be used
by an explicitly registered plugin over an external table with a different command adapter.

The cell editor uses native text inputs containing inline Markdown. Supported formatting
includes emphasis, strong, strikethrough, code spans, and inline links/autolinks. Existing
escapes are retained; unescaped pipes become escaped delimiters. The parser reads the
inline nodes' source positions because GFM cell positions include separator pipes. Empty
body cells are padded to the header width; extra authored cells, HTML, and image syntax
make the table read-only. HTML tables remain preserved source. Unknown Markdown syntax
that GFM treats as literal text remains literal. No new media renderer is involved.

Enter, Tab, Apply cells, and the session save barrier commit drafts. Blur and Escape keep
uncommitted input recoverable. Each view registers one draft for the entire table, so edits
in separate views conflict even if they touch different cells. Structural commands and
rectangular paste include the current local draft in one undo entry. The header cannot be
removed, body rows insert after it, and one column must remain. Paste must fit the existing
rectangle; it never silently truncates cells or grows the table.

Tab visits cells, Alt+arrows moves between cells, and Alt+Shift+arrows or Shift+click selects
a rectangle. A selected native text range owns text copy/cut. Otherwise cell selection owns
TSV copy/cut; multiline or tabbed paste is one provider edit. Clipboard cell values are inline
Markdown source. Outer document selection uses the existing whole-table Markdown clipboard.
Clipboard parsing adds empty prose carriers around table edges so a paste into a nonempty
paragraph preserves both the table and surrounding text. Their preallocated IDs enter the
same insertion snapshot. The host owns Escape and entry/exit. Clean-cell undo/redo goes to document history; dirty
inputs retain native undo. Model limits are 10,000 cells and one million source characters.

Chromium and Firefox exercises resolve the input/focus and clipboard choices. In Firefox,
constructed ClipboardEvents ignore their initializer's DataTransfer; synthetic tests install
that property explicitly. Chromium also exercises real keyboard clipboard operations and
CDP composition. Exact coverage and completion evidence live in the task list.

## Delivery and verification

The [task list](rich-text-widget-tasks.md#delivery-and-verification) owns the stage schedule,
acceptance checks, current-work status, blockers, and completion log. Update status there rather than duplicating it in the design documents.

## Implementation task list

Use the [implementation checklist](rich-text-widget-tasks.md#implementation-task-list).
It tracks common hosting, native tables, plugin storage, schema adapters, external data,
true inline plugins, and the separate visualnovel migration using stable task IDs.

## Decisions still requiring implementation prototypes

- Specify true inline plugin syntax separately; do not encode arbitrary payloads in image
  URLs or accept executable custom HTML as a shortcut.
- Extend the [normalized form contract](rich-text-widget-forms.md#resolved-form-contracts)
  to nstructjs fixtures, including references and helper expressions. The Zod 3 subset,
  JSON controls, native source retention, and input/output separation are specified there.

## Design review

Fresh-context review completed on 2026-09-16 against the current provider, editor, session,
operation, and bound-field implementations. Three findings were incorporated:

- Separate record and editable-value validation from full form submission validation so
  incomplete forms can be saved.
- Define a session-wide draft barrier and distinguish committed serialization from drafts
  held by one or more views.
- Enforce session write authorization at shared history execution boundaries, and distinguish
  per-view read-only state from a session-wide write prohibition.

A follow-up review of the visualnovel use case found no additional issues. The design now
includes native front-matter bindings, authored-source preservation, the application's save
and conflict boundary, shared draft ownership, and compatibility with its Zod major version.

The implementation checklist was reviewed against the design for coverage, dependency
cycles, completion evidence, and follow-up scope. No additional issues were found.

The split into architecture, forms, and task documents was reviewed for lost requirements,
changed task status, and broken references. All 49 checklist entries were preserved; one
relative section reference was replaced with a link to the architecture document.
