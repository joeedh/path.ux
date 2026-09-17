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

### nstructjs metadata adapter

Import `nstructFormSchema` from scripts/widgets/richtext/form_nstruct.ts and pass metadata
from a trusted application's `manager.get_struct(name)`. The adapter reads the installed
nstructjs 0.8.12 field descriptors and `parser.StructEnum`; it does not parse document-provided
STRUCT programs, call constructors, run `loadSTRUCT`, invoke migrations, or call helper expressions.
Its output is plain authored JSON, not a deserialized class instance.

The supported subset is `string`, `bool`, `int`, `uint`, `short`, `ushort`, `byte`, `sbyte`,
`float`, `double`, `array(T)` without an iterator variable, and `optional(T)` (including `?:`).
Arrays and optionals may nest. Optional values can be absent or null, matching nstructjs's
optional JSON representation. Integer validation uses the storage type's range and requires
safe integers; float values must fit finite float32 range, and doubles must be finite.
The adapter preserves authored numeric precision and does not promise a lossless float32
binary round trip. Unknown JSON fields pass through and no class defaults are inferred.
This form validation is deliberately stricter than nstructjs's general JSON validator at
numeric storage boundaries.

Helpers, named/abstract struct references, class-as-value `this` fields, iterator variables,
iterators, static strings/arrays, buffers and other encodings produce explicit diagnostics.
They require an application-owned JSON codec and registered `FormSchema`. A struct reference
is not assumed to be an editable nested object. The adapter checks at most 10,000 metadata
nodes with a nesting limit of 24, then uses the same bounded JSON validator as declarative
schemas. The shared fixtures use actual registered nstructjs metadata and prove that adapting
or validating it never constructs the class or runs its reader.

### Declarative schemas and optional plugin support

`declarativeFormSchema` in scripts/widgets/richtext/form_declarative.ts accepts this envelope:

```json
{
  "format" : "pathux.form-schema",
  "version": 1,
  "root": {
    "kind"  : "object",
    "fields": {
      "name": { "kind": "string", "minLength": 1 },
      "age" : { "kind": "number", "integer": true, "min": 0 },
      "tags": { "kind": "array", "item": { "kind": "string" }, "optional": true }
    }
  }
}
```

This is a path.ux format, not JSON Schema. It supports strings, finite numbers, booleans,
null, primitive enums, objects, arrays, records and unions. Every node may declare `optional`
and a text `description`. Strings accept `minLength`/`maxLength` in JavaScript UTF-16 code
units; numbers accept `integer` and inclusive `min`/`max`; arrays accept `minItems`/`maxItems`.
Bounds must be consistent and length bounds must be nonnegative safe integers. Object fields
are required unless marked optional; unknown answer fields are preserved. Unions accept the
first valid option without transforming input. Error paths identify nested fields and indices;
a failed union reports at the union's own path.

Unknown envelope versions, kinds or keywords produce diagnostics and prevent structured
mounting. Defaults, coercions, regular expressions, references, class names, custom validation,
transforms and executable code are unsupported. A document requiring these behaviors must
use the existing `{id, version}` route to a host-registered implementation. There is no
automatic resolution, schema fetching or fallback from embedded code to registered behavior.
Validation freezes a detached JSON output without changing authored input. Both descriptions
and answers use the widget JSON limits (64 KiB, 10,000 values, depth 32); validation additionally
limits traversal to 50,000 node visits to bound repeated union work.

To opt in, register `createDeclarativeFormPlugin(context, resolveSchema)` from
scripts/widgets/richtext/form_embedded.ts. It shares the existing form binding and accepts
`schema: {embedded: description}` as an alternative to the existing schema reference.
Mixing the two representations is refused. The original `createFormPlugin` still accepts
only references unless the host explicitly supplies its optional embedded resolver. Unknown
embedded formats stay in the opaque record and render an inert fallback. The plugin payload
version remains 1; the embedded grammar version and a registered schema's catalog version
have separate meanings. An embedded schema is replaced explicitly when its fields change;
its grammar version is not an application schema revision.

### Schema changes, migrations and bundle boundaries

The optional adapter example in example/editors/properties/form_adapters_demo.ts shows
registered-schema version 1 to 2 migration and explicit embedded-schema replacement. It calls
`prepareSave()`, refuses unresolved drafts, reads a fresh widget snapshot and verifies the
source schema before computing the application-owned conversion. A guarded `prepareUpdate()`
commits schema and answers in one document operation, refusing a newly pending draft at the
history boundary. Earlier draft commits remain separate undo entries. Missing answers and
unknown keys are retained, and migration never requires full submission validity.

The converter is trusted host code and must be pure. Redo replays stored data and never runs
the converter. The existing host checks snapshot freshness and write policy at execution.
The application invalidates widget views when schema descriptions change, including during
undo/redo; ordinary answer changes retain mounted controls. Registry or presentation changes
without a document schema change still require explicit host invalidation. An external schema
replacement with unresolved drafts leaves the detached drafts recoverable through the session.
No migration occurs on mount, validation or save alone.

All adapters remain optional deep imports. The main path.ux barrel and base rich text bundle
import none of the form control or adapter modules. The declarative validator imports only
lightweight form/JSON helpers and needs no schema runtime or DOM. The nstructjs adapter adds
an explicit nstructjs dependency; Zod and YAML remain separately supplied by their respective
adapter and application codec. The shared intake fixtures in
example/editors/properties/form_adapters.ts exercise both new adapters with identical values,
control codecs and source-preserving YAML patches. Complex values still use JSON text controls;
this stage adds no nested visual builder, external service, media renderer or consumer migration.

## External resources and submission

The optional resource API lives in scripts/widgets/richtext/resource.ts. Applications supply
`ResourceServices`: an explicit map of service implementations plus a synchronous destination
policy. A document reference is exactly `{service, key}`. The key is opaque to path.ux; it is
not a URL that the library fetches. Service objects own transport, authentication and any
credential store. Documents, widget records, snapshots and resource requests contain no
credential field. No HTTP adapter, service detection, media renderer or default network
fetching is installed by this API.

`ResourceService.resolve(reference, scope)` is a synchronous, side-effect-free resolution
step. It may use the host's document descriptor to resolve a relative path but must perform
no I/O. It returns the actual destination string checked by `ResourceServices.authorize()`.
The scope contains the document descriptor and immutable widget record. Resolution and
policy must be cheap: mount checks and current-view checks can call them repeatedly.

`ResourceService.request()` receives that destination, scoped reference, action and an
`AbortSignal`. Actions are `read`, `schema` and `submit`. A successful response is
`{status: "ready", snapshot: {version, value}}`, where the version is a nonempty opaque
string and the value is bounded JSON. Other results are `conflict` (optionally with the
current snapshot), `failed`, `refused` or `cancelled`. Returned JSON is detached and frozen;
versions, references and destinations have explicit length limits. Widget JSON size, depth
and value-count limits apply to service snapshots and submission values.

A service must return `{status: "redirect", destination}` before contacting a redirect
target. `WidgetResources` checks policy for every hop, limits redirects to five, rejects
loops and checks permission again before accepting the response. A network adapter must use
manual redirect handling and retain credentials only for destinations approved by the host.
The library cannot enforce this inside arbitrary trusted service code. It provides no
transport sandbox and never follows an HTTP redirect itself.

Requests also pass through the existing widget `external()` gate using action names
`resource:read`, `resource:schema` and `resource:submit`. The optional plugin `canMount`
preflight checks service/reference policy before renderer construction; the shared widget
host checks it again before constructing a view and when checking whether a view is current.
Host mount policy and service policy must both permit access. Read permission does not grant
submit permission. Hosts must call `DocumentWidgetHost.invalidate()` when credentials,
services, paths, schema classification or policies change so existing generations abort.

`WidgetResources.cancel()` aborts outstanding requests and settles their callers even when
a transport ignores the signal. Disposal and host invalidation abort requests too. Changes
to the record, service identity, policy or mounted generation prevent late data from being
accepted. Cancellation cannot reverse a remote transaction that has already committed;
the UI reports that its outcome may be unknown and offers refresh instead of automatic retry.

### External form and read-only view plugins

Import `createExternalFormPlugin` or `createExternalViewPlugin` from
scripts/widgets/richtext/form_external.ts. They are explicitly registered plugins named
`pathux.external-form` and `pathux.external-view`, each with payload version 1. Both use the
shared widget host. The form payload is:

```json
{
  "resource": { "service": "customers", "key": "customer-42" },
  "schema"  : { "id": "customer-intake", "version": 3 }
}
```

The form's schema can instead be `{resource: {service, key}}`. Schema resource access uses
its own authorization check and returns a versioned declarative description understood by
`declarativeFormSchema`; fetched text never becomes executable code. Runtime validation still
requires an explicitly host-registered schema. The read-only plugin needs only `resource`
and displays fetched JSON as text. This stage supplies external values with a registered or
resource-backed schema; it does not add a remote-schema binding over native YAML fields.

Initial load and Refresh resource read external state without changing the document or its
history. Each view retains its own versioned read and local field drafts. A dirty view refuses
refresh until its answers are submitted or discarded. A failed refresh disables editing until
a fresh read succeeds. Resource reference/schema changes require rebinding; the example
invalidates views when these references change, including during undo and redo.

Save resource snapshot explicitly copies the last successfully loaded or submitted
`{version, value}` into the payload's `snapshot` field through the document command boundary.
It refuses pending drafts and creates one undo entry. Saving the same snapshot again is a
no-op. Undo/redo restores document data without performing a resource write. A saved snapshot
can be displayed offline with an explicit stale-data label; it never supplies a trusted write
version or enables submission before a fresh read. Read-only editor state and session write
policy protect snapshot commands and application-level history.

### Drafts and explicit submission

External forms reuse `FormControl` and its input codecs, with its document Apply action
hidden through `{commit: false, discard: false}`. The external view supplies its own discard
action, which also updates resource status and stays disabled during a transaction. `submissionValues()` captures authored JSON independently
of the full validator's output. External drafts register with the document session for
navigation/save protection, but their preparation refuses with an explicit submit-or-discard
reason. `prepareSave()` never runs a remote transaction. Detached drafts remain recoverable
and discardable after a view is removed or its policy is revoked.

Submit answers validates the current input, bounds both authored values and validated output,
and sends them separately. The request contains `expectedVersion`, an opaque `requestId`, and
both `values` and `output`. If the schema was fetched, it also contains the schema reference
and version. The host service must atomically enforce applicable data/schema versions and
return a conflict when either changed. It decides how validated output maps to its domain;
transformed output never silently replaces the authored input in the document.

Validation and submission are guarded against repeated clicks, changed answers, composition,
read-only changes and stale views. Pending service work disables edits. Success adopts the
service's returned snapshot and clears only that view's submitted draft. Conflict and failure
retain authored text and the original version baseline; the conflict's newer version is not
silently adopted. Other views retain their prior snapshots until explicitly refreshed, so a
second stale view encounters a version conflict instead of overwriting the first submission.
The client performs no automatic retries. Services own deduplication by request ID, external
transaction history and recovery from uncertain outcomes.

External transactions create no document undo entries. Document undo/redo never submits,
reverses, repeats or retries a service operation. The supplied form conservatively prohibits
submission in a read-only editor or session, in addition to requiring external-action policy.
Reading and refresh remain available under read policy. A host requiring a different external
interaction policy can use the scoped resource API in its own widget.

### Local service example

The Markdown example's Open external data demo button opens two views sharing a document
and an application-owned in-memory service. It demonstrates independent drafts, explicit
submission, version conflicts, read-only JSON views, saved snapshots and offline failures.
The fixture can also delay requests, revoke policy, redirect destinations and change the
remote schema version. Browser checks exercise those controls in Chromium and Firefox.
The example's service has no real credentials or network access. Production adapters must
supply their own authentication, atomic version checks, redirect behavior, idempotency and
bounded transport parsing. Resource refresh is explicit; push subscriptions and cross-view
remote cache synchronization are outside this implementation.
