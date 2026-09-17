# Rich text forms and front-matter integration

Implementation status lives only in the [task list](rich-text-widget-tasks.md).

This document specifies schema-driven forms and visualnovel's native YAML binding. The
[architecture](rich-text-widgets.md) defines hosting, provider operations, history, and host
policy. The [task list](rich-text-widget-tasks.md) is the sole implementation tracker; its
stage 4 covers local forms and its V tasks cover the future visualnovel migration.

## Schema-driven forms

Build a reusable form control and a rich text plugin wrapping it. The form has three
independent inputs: its schema, its values, and presentation metadata such as field order,
labels, groups, and control preferences.

Separate the form's value binding from its renderer and schema adapter. A binding reads a
versioned snapshot, reports changes, and submits commands against its backing store. Support
three binding targets: a plugin record's embedded values, native provider-owned fields such
as YAML front matter, and a host-owned external resource. The first two use document history;
the third uses the resource service's transaction rules. Native bindings need no duplicate
values or serialized plugin record just to display a form.

Use one normalized `FormSchema` for rendering with adapters from Zod and nstructjs. The
adapter also supplies validation, defaults, and encoding/decoding of editable values. It
must report unsupported constructs rather than silently weakening validation. Preserve
input and output types separately when validation transforms a value.

Do not promise lossless conversion between arbitrary Zod schemas and nstructjs structs.
Zod supports executable refinements and transforms; its
[JSON Schema conversion](https://zod.dev/json-schema) documents unrepresentable constructs.
nstructjs serialization expressions and object references do not necessarily describe
editable fields. Source-specific validation and codecs remain in trusted application code.
An nstructjs adapter may generate Zod validation for its supported subset if Zod is chosen
as the runtime backend, without changing the renderer contract.

An embedded schema is a versioned declarative description of the supported form subset.
Never evaluate Zod code, struct helper expressions, or constructors supplied by a document.
A referenced schema identifies a host-registered schema and version. Unsupported runtime
behavior requires that registered implementation and otherwise produces an inert fallback.
Dates, large integers, references, and class instances require explicit JSON-compatible
codecs before they can enter widget records or document history.

The broader design allows schema and values to use embedded data or external references
independently. The local form payload uses a host-registered schema and embedded answers:

```json
{
  "schema": { "id": "customer-intake", "version": 3 },
  "values": { "name": "", "priority": "normal" }
}
```

Embedded values belong to document history. External values belong to the host's data
service and its conflict/versioning rules. Refreshing a chart or external form does not
dirty the document unless the user explicitly saves a snapshot. External submission is an
explicit action with pending, success, and failure states; document undo never repeats or
reverses a remote request. Redo does not resubmit a form.

Reuse path.ux controls and property metadata where useful. Any `DataAPI` mapping belongs to
its own API instance. Controls edit drafts or call the document command adapter; they must
not directly mutate saved payloads through ordinary property bindings.

Distinguish designing the form, filling values, and submitting. Existing `editor.readOnly`
continues to prohibit document mutation, including embedded answers. An application wanting
locked layout with editable answers uses a narrower structure-edit permission, not an
exception to `readOnly`. It is a per-view restriction: a read-only view cannot originate
mutations, but another authorized view or application-level history may change the shared
document. A session-wide write prohibition applies to all views and history entry points.
External interactions require their own explicit host permission.

## Visualnovel: forms over YAML front matter

The motivating checkout is C:/dev/visualnovel. The following paths are relative to that
repository and describe the inspected implementation, not dependencies path.ux should import:

- packages/types/src/schemas.ts defines Zod schemas and the document entity discriminator
  `type`. Character and location directories imply a type; a conflicting explicit tag is an
  error, not an override.
- packages/parse/src/frontmatter.ts splits YAML front matter from the authored body and
  preserves the original prefix for body-only edits. Its general stringify helper rebuilds
  YAML, so that helper alone does not provide source-preserving field edits.
- apps/desktop/renderer/pathux/editors/wiki.ts currently edits whole Markdown source in a
  textarea. Its command layer permits incomplete field values with diagnostics and protects
  document identity when saving.
- apps/desktop/renderer/pathux/doctree/docbuffer.ts delegates reads and writes to `doc.read`
  and `doc.write`, uses `seenHash` to refuse overwriting external changes, and retains drafts
  beyond the lifetime of a pane. Saving runs through the application's commit machinery.

Start with wiki notes and character/location sheets. The application's `doc.write` refuses
scene documents, which have their own `story.*` write path; this integration does not reroute
those documents through a generic file save.

For this integration, the application chooses a host-registered schema using its existing
path/content classification and mounts the shared form control over the provider's native
front-matter block. Form edits patch the YAML fields through document operations. Body edits
and front-matter edits share the same session and undo order. The file remains front matter
plus its authored body, with no second copy of those values in a `pathux.form` envelope.

The provider integration needs an opt-in native-block view resolver or equivalent explicit
adapter, so the application can supply a form for a recognized front-matter block without
forking the Markdown parser. It receives the block identity and a scoped native-data binding
along with document context. It may decline and leave the ordinary inert front-matter view.
The host supplies YAML interpretation and schema selection; the base Markdown provider
continues to preserve front-matter source without a mandatory YAML or Zod dependency.

Changing a path or discriminator invalidates the selected schema and field configuration.
Reuse the application's existing classification rules; do not guess a schema from the
folder alone or let a document name arbitrary executable schema code. Resolve a pending
draft before switching bindings. Incompatible or conflicting types produce diagnostics and
a raw-source view rather than dropping fields or rewriting the tag automatically.

Keep an authored-source representation alongside the projected form values. Opening the
form must not write schema defaults, remove unknown keys, or serialize transformed Zod output
back over the author's YAML. A field change applies the smallest supported source patch,
preserving comments, ordering, quoting, and untouched fields. Body-only edits preserve the
front-matter prefix. A metadata-only edit must also preserve untouched body source; the
current Markdown serializer can normalize the body, so source retention or a source patch
layer is an explicit integration prerequisite. Undo restores source as well as projected
values. Tests must cover CRLF and document-prefix handling.

Malformed YAML, unsupported tags/aliases, or structures the field patcher cannot safely
update retain their source and remain editable through the raw-source path. A form must
not repair or flatten these structures silently. Apply bounded parsing and the host's YAML
policy before projection. Keep authored input separate from validated model output, and
report validation errors without discarding incomplete answers. Visualnovel's command-level
identity protections still decide which file writes are acceptable.

The migration preserves the application's authoritative save path. `prepareSave()` flushes
view drafts into the session; serialization produces a source snapshot; the application
submits that snapshot to `doc.write` with its last accepted `seenHash`. Only a successful
write advances that baseline. A conflict leaves the unsaved session intact. A matching
session revision proves which local snapshot was saved but does not replace the disk hash
check. Later local edits remain dirty even if an earlier snapshot finishes saving.

Refactor the current buffer's draft ownership into one document session per open document,
retained independently of panes, or adapt the buffer to that session. Avoid independently
writable text and form caches. A raw-source editor and the form are views of the same
document; parsed projections refresh after source edits, and malformed source disables the
structured view until it can be parsed again. Preserve reload, quit protection, and command
notifications rather than replacing them with a widget-specific save mechanism.

Use actual character/location schema fixtures to prove path/content selection, optional
fields, nested arrays/objects, discriminated unions, defaults, and refinements. Test adding
front matter to a file without it as one undoable operation. Also test a metadata-only edit
with comments and unknown keys, body-only edits, type conflicts, incomplete answers, raw/form
switching, two views, and an external rewrite between load and save. Schema adapter support
must match the Zod major version used by the consuming project; do not assume a Zod 4-only
API for the inspected client, which declares Zod 3.

This is an intended application migration, not authorization to change the visualnovel
checkout as part of this design task. Its code and domain schemas remain application-owned.

## Resolved form contracts

The optional forms entry point is scripts/widgets/richtext/forms.ts. `FormSchema` describes
input fields and retains a full validator returning a separate `FormValidation.output`.
`FormSnapshot.values` contains authored JSON; editable text stays inside each `FormControl`.
Only fields the user changes pass through the editable-value codec. Untouched fields,
including unknown keys and absent defaults, pass through unchanged. Omit is an explicit
action, including for required fields. An incomplete but encodable object can enter history;
`validateSubmission()` returns success only after full validation of the current answers.
It performs no external action and never stores transformed output.

`FormBinding` supplies reads, subscriptions, prepared commands, explicit commits, draft
registration, and write authorization. Prepared commands must retain their identity when a
plugin host supplies them. The embedded binding returns `prepareUpdate()` directly so the
existing scoped-command checks remain effective. Native bindings compare the exact front-matter
source and selected schema at the history boundary. Conflicts retain the local editable text.

`FormPresentation` supplies field order, labels, help, groups, and text/JSON preferences.
The first renderer uses path.ux textboxes with datapath undo disabled and no saved-value
datapath. Strings and string enums use text; numbers, booleans, null, arrays, objects,
records, and unions use JSON text. Complex fields are edited as one JSON value, with nested
validation paths displayed as text. This bounded renderer does not claim nested visual
array builders or automatic controls for every possible schema construct.

### Zod 3 adapter

Import `zodFormSchema` from scripts/widgets/richtext/form_zod.ts. Its Zod import is type-only;
the application supplies its actual Zod 3 schema. Normalization understands strings,
numbers, booleans, null, JSON literals, enums, objects, arrays, records, unions,
discriminated unions, optional/nullable/default wrappers, refinements, and transforms.
Defaults are annotated without evaluating their factories. Validation delegates to the
original `safeParseAsync`, preserving refinements, coercions, unknown-key policy, and
transformed output. Validation exceptions become diagnostics.

Preprocessors, recursive/lazy schemas, dates, bigint, functions, sets, and other unsupported
constructs produce explicit diagnostics and prevent structured mounting. Applications can
provide their own normalized schema and JSON input codec/validator contract for these cases.
The adapter does not serialize executable schemas into documents. The Zod 3 fixtures in
example/editors/properties/form_schemas.ts were checked against the consumer's character and
location schema shapes, including record unions, nested variants, optional tags and defaults.

### Embedded and native bindings

`createFormPlugin(context, resolveSchema)` creates the opt-in `pathux.form` block plugin.
Its payload version is 1; its payload contains `schema: {id, version}` and `values`.
The schema version names an application catalog entry independently of the plugin version.
The host resolves the catalog using its document context; unknown schemas remain inert.
Changing a record's schema externally makes an existing incompatible view unavailable until
the host rebinds it. It never interprets document text as executable schema code.

Native documents opt into `markdownSourceDoc()` before opening a session. Source retention
travels in block snapshots, so history restores source as well as projected values.
`markdownText()` preserves BOM/blank prefixes, line endings, separators, and the unchanged
body, including source not represented in the block model. Metadata patches preserve that
body byte-for-byte. Body edits use the existing canonical body serializer while retaining
the original YAML prefix; undo restores the original body spelling. Duplicate plugin IDs
still receive the existing source-preserving identity repair. The default Markdown parser
and serializer keep their existing behavior for documents without retained-source metadata.
Native form bindings refuse to mount on those documents, so attaching a form cannot silently
normalize an unretained body. `onDiagnostic()` reports parser, schema, and retention refusals
to the application's status UI while the provider keeps its raw block fallback.
The native splitter recognizes `---` delimiters with LF or CRLF. Other delimiter/line-ending
forms retain their source without enabling a structured front-matter view.

`nativeFormWidgets({codec, select})` supplies the native resolver. `select()` returns a stable
registered-form object, or declines on unsupported/path-conflicting content. The host's
`FrontmatterCodec` owns bounded YAML parsing and source patching. The library imports no
YAML runtime. The example codec accepts core mappings, refuses aliases/anchors/tags,
duplicate or hostile keys, malformed input, and oversized input. Scalar range patches
preserve comments, existing quotes, ordering and untouched values. Nested equal-shape
collections patch their leaves. Structural replacement of comment-bearing collections,
block scalar edits, and unsupported flow-map insertion/removal require raw source editing.
These refusals retain the draft and original source. They do not silently reformat YAML.

`addFrontmatter()` explicitly creates missing metadata in one undoable edit.
`markdownSourceCommand()` replaces raw source with a whole-source precondition.
`switchFormBinding()` resolves drafts before a host changes document classification and
invalidates native mounts. An external replacement may detach a conflicting draft; the
session's recovery API retains it. Source and structured views must never maintain separate
authoritative values or write on a stale blur event.

The Markdown example's **Open forms demo** button shows both routes, a standalone control,
two views per document, and a raw source draft. Its simulated disk writer demonstrates
`prepareSave()` followed by a separate expected-hash check. A conflict retains unsaved
work and the accepted hash; a successful older snapshot does not mark newer local edits as
saved. Applications must replace this fake writer with their own authoritative save path.
No visualnovel file or save route is changed by this implementation.
