# Embedded rich text widget tasks

Status: implementation has not started.

This is the sole status and completion tracker for the [widget architecture](rich-text-widgets.md)
and [forms/front-matter design](rich-text-widget-forms.md). Task IDs and existing completion
records are retained from the original combined document.

## Delivery and verification

Implementation is not authorized by this design document alone. The following stages are
proposed; update their status here when implementation begins.

| Stage                  | Status      | Deliverable and acceptance condition                                                                                               |
| ---------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1. Hosting             | Not started | Keyed mounts, disposal, input ownership, focus-preserving changes, and a synthetic editable widget work in two views               |
| 2. Native table        | Not started | GFM table cells and structure edit through document history and round-trip formatting                                              |
| 3. Plugin storage      | Not started | Registry, session host, command validation, Markdown envelopes, unknown-record preservation, and structured clipboard              |
| 4. Local forms         | Not started | Standalone form control, Zod adapter, embedded and native front-matter bindings, source preservation, drafts, validation, and undo |
| 5. Additional adapters | Not started | Second schema adapter and declarative embedded schemas with explicit unsupported cases                                             |
| 6. External data       | Not started | Host-supplied resource services, policy invalidation, conflicts, cancellation, and explicit submission                             |

Stage 1 includes a review of serialization at the toolstack boundary before later stages
depend on widget commands. Begin forms with a host-supplied Zod schema; add nstructjs against
the same rendering and validation contract. This choice does not make Zod part of the base
rich text bundle. Shared contracts stay lightweight; schema adapters and form controls are
optional imports. Media policy remains unchanged throughout these stages.

Provider tests cover record validation, unknown and malformed source, duplicate IDs,
snapshots, migrations, stale commands, clipboard identities, and Markdown round trips.
Browser tests cover typing beside and inside widgets, IME, Tab/Escape, inner versus outer
selection, copy/paste, deletion/undo, focus across updates, and two editors on one session.
Verify that a retained opted-in iframe is not reloaded by unrelated text edits using a
local test fixture rather than an external service.

Security regression tests cover URL and HTML sanitization, hostile payload keys and depth,
unregistered or disallowed records, policy changes during async work, and denial before
renderer construction. In the default configuration, video and iframe source remains inert,
video media references create no player, and no embed API script is loaded. Table and form
tests also verify that values are rendered as text rather than inserted as HTML.

Additional acceptance cases include saving with drafts in multiple views, saving partially
filled required fields and cross-field validation failures, cancellation on navigation, undo
after plugin removal, future payload versions, remote failure without a document edit, and
redo without external submission. Application-level undo against a session whose write
permission was revoked must preserve both the document and the history cursor. Follow the repository's full typecheck and applicable
unit/browser checks when implementation changes the public surface.

## Implementation task list

This checklist is the implementation tracker. The stage table above summarizes the same
work. Update both when a stage changes; do not maintain a second independent task list.
Implementation has not started. Creating this tracker does not start the visualnovel
migration or any other implementation work.

Task IDs remain stable when work is split or reordered. Before starting a task, record its
ID in the current-work entry below. Mark a checkbox complete only after its acceptance
condition is demonstrated, and record the relevant commit and checks in the completion log.
Record blockers with the affected task ID and the concrete dependency needed to continue.
Tasks without a checkbox marked complete are pending, including partially implemented work.

- Current work: none.
- Next task: H1, once implementation begins.
- Blockers: none recorded; the [open design decisions](rich-text-widgets.md#decisions-still-requiring-implementation-prototypes)
  are scheduled work, not completed decisions.

### Preparation

- [x] P1. Document the ownership split between native provider widgets, media references,
      and plugin records, with host authorization and safe default media behavior.
- [x] P2. Inspect visualnovel and record native YAML binding, Zod compatibility, source
      preservation, and application save/conflict requirements.
- [x] P3. Pressure-test the design with fresh context and incorporate the findings about
      incomplete answers, draft barriers, and shared history authorization.

### Stage 1: hosting and shared editing contracts

Dependencies: P1–P3. Complete this stage before native tables or plugin views depend on the
host. These tasks include the draft/history prerequisites needed by both tables and forms.

- [ ] H1. Finalize the lifecycle descriptor, stable identities, native-block resolver, and
      focus-preserving change result. Prototype connected-DOM reconciliation with an input and
      an explicitly opted-in local iframe; document which moves preserve focus and playback.
- [ ] H2. Implement per-view mount reconciliation, update, error fallback, and idempotent
      disposal. Verify deletion, session replacement, implementation changes, and late async
      results without leaked subscriptions or requests.
- [ ] H3. Implement event ownership across shadow DOM for input, clipboard, pointer, drop,
      and composition events. Verify the surrounding editor never treats field edits as prose.
- [ ] H4. Implement keyboard entry/exit, Tab, Escape, inner versus outer selection, and
      deletion boundaries. Verify accessible naming and focus survive neighboring text edits.
- [ ] H5. Serialize target resolution, authorization, inverse capture, and mutation at the
      command execution boundary. Prove stale/deleted targets settle with no history entry and
      failed edits leave document state unchanged.
- [ ] H6. Add history preflight refusal where needed, including the shared application
      stack. Verify revoked document-write permission blocks undo/redo/rerun without moving
      history or mutating data, while per-view read-only remains a separate restriction.
- [ ] H7. Implement draft registration, pending status, `prepareSave()`, conflicts between
      views, and control-versus-document undo ownership. Verify serialization remains a pure
      read of committed data and refused or unencodable drafts remain recoverable.
- [ ] H8. Adapt existing provider widgets and `renderMedia` to the hosting interface while
      retaining legacy callback behavior. Forward instance configuration and draft barriers
      through `RichTextArea` without global policy or credential state.
- [ ] H9. Run browser acceptance cases with a synthetic editable widget in two views,
      including IME, save/navigation with drafts, policy changes, and opted-in iframe retention.
      Record the browser coverage and any unsupported movement behavior before closing stage 1.

### Stage 2: native Markdown table editing

Dependencies: H1–H9. Tables retain ordinary GFM syntax and need no plugin envelope.

- [ ] T1. Define the reusable table model and command adapter, with header/alignment
      semantics and a cell editing representation that preserves supported inline formatting.
- [ ] T2. Implement cell editing, cell selection, keyboard navigation, and cell drafts on
      the common host. Verify the document still treats the outer table as one opaque block.
- [ ] T3. Implement row/column insertion and removal, alignment changes, and rectangular
      cell paste as undoable provider operations with complete snapshots and correct inverses.
- [ ] T4. Implement inner TSV/text clipboard behavior and outer document-table copy/paste.
      Verify cell handlers and document handlers do not both consume one clipboard event.
- [ ] T5. Add parse/edit/save fixtures for escaped pipes, inline formatting, header cells,
      empty values, and unsupported constructs. Verify unsupported source is retained.
- [ ] T6. Demonstrate cell focus, two-view updates, structural undo/redo, and raw Markdown
      round trips in the example application and browser tests; document the supported subset.

### Stage 3: plugin records and host policy

Dependencies: H1–H9. T1–T6 should validate native hosting before the plugin API is finalized.

- [ ] W1. Finalize the versioned Markdown block envelope and structured clipboard grammar,
      payload limits, fence escaping, and duplicate-ID repair. Add fixtures before implementing
      parsing, including unknown and future versions.
- [ ] W2. Define the explicit plugin registry and session document host. Implement duplicate
      type detection, per-document context, policy invalidation, and separate insert/mount/edit/
      external-action decisions with denial before renderer construction or resource access.
- [ ] W3. Implement the optional provider widget-storage capability and immutable record
      reads. Add insert/update/remove commands by stable ID with revision preconditions and
      snapshots; verify behavior through the H5/H6 execution and history boundaries.
- [ ] W4. Add Markdown parsing and serialization for block records, with canonical supported
      output and verbatim unsupported source. Verify malformed/oversized envelopes remain inert
      and bounded, and ordinary code fences retain their existing meaning.
- [ ] W5. Add structured clipboard plumbing and provider fallbacks. Verify fresh IDs on copy,
      retained IDs on moves and undo, preserved external references, and explicit unsupported
      target behavior without silently dropping saved values.
- [ ] W6. Implement explicit undoable migrations with validated output. Verify plugin removal,
      policy denial, and unavailable versions preserve records and do not prevent data-only
      undo/redo or cause migration during rendering.
- [ ] W7. Add tests for malicious keys/depth, HTML/URL handling, stale policy decisions, and
      cancellation after revocation. Verify default video references create no players, literal
      video/iframe HTML stays inert, and no embed scripts or services load automatically.
- [ ] W8. Document provider opt-in, host configuration, and an application-supplied plugin
      example. Verify ordinary editors without a host retain their existing behavior.

### Stage 4: Zod forms and native front-matter bindings

Dependencies: H1–H9 and W1–W8 for embedded plugin values. Native front-matter forms also
require source retention; the current canonical Markdown serializer is not sufficient.

- [ ] F1. Finalize the normalized form schema, presentation metadata, value codecs, and
      binding interface against real fixtures. Separate authored input, editable representation,
      and transformed validation output; specify unsupported constructs explicitly.
- [ ] F2. Implement the optional Zod adapter with support for the consumer's Zod major
      version. Test required/optional values, defaults, nested objects/arrays, unions, and
      refinements without silently weakening validation or writing defaults on mount.
- [ ] F3. Implement the standalone form control using path.ux controls and command-backed
      drafts. Verify incomplete answers can be saved, full validation gates submission, and no
      duplicate `DataPathSetOp` or direct saved-payload mutation occurs.
- [ ] F4. Wrap the form as a block plugin with a host-supplied schema and embedded answers.
      Verify payload/schema version separation, history, read-only modes, and two-view updates.
- [ ] F5. Implement or expose the source-retention and patch integration needed by native
      front matter. Verify metadata-only edits preserve body source, body-only edits preserve
      YAML, and undo restores comments, ordering, unknown fields, line endings, and prefixes.
- [ ] F6. Bind the shared form to a native front-matter block through the opt-in resolver,
      with host-owned bounded YAML parsing and schema selection. Test missing front matter,
      path/type conflicts, malformed YAML, unsupported aliases/tags, and raw-source fallback.
- [ ] F7. Demonstrate form/raw-source views sharing one session and draft barrier. Verify a
      schema switch resolves drafts, external changes cannot be overwritten by stale blur, and
      save preparation does not bypass the application's disk conflict checks.
- [ ] F8. Add an example using visualnovel-shaped fixtures and document both binding routes.
      Run schema/provider tests and browser form tests, including partially filled required
      fields and cross-field errors, before closing stage 4.

### Stage 5: additional schema adapters

Dependencies: F1–F8. Adapters remain optional imports, outside the base rich text bundle.

- [ ] A1. Implement the nstructjs adapter for a documented subset, with explicit diagnostics
      for helper expressions, references, and unsupported class/value encodings.
- [ ] A2. Implement versioned declarative embedded schemas without evaluating document code.
      Verify unsupported runtime behavior requires a host-registered implementation.
- [ ] A3. Add shared form fixtures for both adapters and schema-version migrations. Verify
      validation behavior and source/value codecs, and document limitations and bundle boundaries.

### Stage 6: external data and actions

Dependencies: W1–W8 and F1–F8. This stage introduces no default video or service renderer.

- [ ] E1. Define host-supplied resource/schema services with scoped references, credentials
      outside documents, destination authorization, cancellation, and version/conflict results.
- [ ] E2. Implement reference-backed form values and read-only external views. Verify
      refresh does not dirty the document and saving a snapshot is an explicit document edit.
- [ ] E3. Implement explicit submission with pending/success/failure states. Verify neither
      document undo nor redo submits, repeats, or reverses external requests.
- [ ] E4. Test document rebinding, path changes, policy revocation, redirects, and late
      responses. Verify disallowed work never mounts or starts a request and stale results are
      discarded without corrupting document or view state.
- [ ] E5. Document the service contract with a local fake service and browser example,
      including offline/failure behavior and externally versioned value conflicts.

### Follow-up: true inline plugin records

Status: deferred from the block implementation, still required to complete inline plugin
support. Existing image atoms are not a substitute for this work. Dependencies: stages 1,
3, and 4; revisit the stage schedule after their browser and persistence results.

- [ ] I1. Finalize a bounded, escaped inline record syntax and supported placements without
      putting arbitrary payloads in URLs or accepting executable custom HTML.
- [ ] I2. Implement inline parsing, serialization, insertion, movement, and clipboard transfer,
      with stable identity through split/join, range replacement, adjacent atoms, and undo/redo.
- [ ] I3. Verify caret slots, composition, keyboard entry/exit, focus retention, unknown-record
      preservation, and cross-provider fallback using inline controls in browser tests.

### Follow-up: visualnovel application migration

Status: planned consumer work in a separate repository; not started by this tracker.
Dependencies: stages 1, 3, and 4 and the application's own integration workflow. Preserve
existing command-layer identity checks and the separate `story.*` route for scene documents.

- [ ] V1. Connect the approved path.ux implementation in visualnovel and map existing schema
      classification to the native front-matter binding. Verify the installed Zod version and
      fixtures before replacing the current Wiki editor surface.
- [ ] V2. Adapt document buffer ownership to retained sessions and raw/form views, preserving
      reload, quit protection, command notifications, and unsaved state beyond pane lifetime.
- [ ] V3. Integrate `prepareSave()` with `doc.write` and `seenHash`. Verify conflicts retain
      unsaved work, successful saves advance only the accepted baseline, and later local edits
      remain dirty when an earlier save completes.
- [ ] V4. Run the consumer's required checks and migration cases for character/location
      sheets and notes, including source fidelity, partial answers, two views, and external writes.

### Completion log

| Tasks  | Evidence                                                                                                  |
| ------ | --------------------------------------------------------------------------------------------------------- |
| P1, P3 | `92769e71`: design written and reviewed; formatting, prose, and local-link checks passed                  |
| P2     | `35153e66`: visualnovel inspected and incorporated; follow-up review, formatting, and prose checks passed |

For every implementation stage, record focused acceptance results here and run the full
library/example typecheck plus applicable unit and browser checks. A task marked complete
does not imply its stage is complete until all stage tasks and their acceptance checks pass.
