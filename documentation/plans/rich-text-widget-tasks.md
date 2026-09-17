# Embedded rich text widget tasks

Status: Stages 1–5 are complete. Stopped at the Stage 5 boundary.

This is the sole status and completion tracker for the [widget architecture](rich-text-widgets.md)
and [forms/front-matter design](rich-text-widget-forms.md). Task IDs and existing completion
records are retained from the original combined document.

## Delivery and verification

Implementation is not authorized by this design document alone. The following stages are
proposed; update their status here when implementation begins.

| Stage                  | Status      | Deliverable and acceptance condition                                                                                               |
| ---------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1. Hosting             | Complete    | Keyed mounts, disposal, input ownership, focus-preserving changes, and a synthetic editable widget work in two views               |
| 2. Native table        | Complete    | GFM table cells and structure edit through document history and round-trip formatting                                              |
| 3. Plugin storage      | Complete    | Registry, session host, command validation, Markdown envelopes, unknown-record preservation, and structured clipboard              |
| 4. Local forms         | Complete    | Standalone form control, Zod adapter, embedded and native front-matter bindings, source preservation, drafts, validation, and undo |
| 5. Additional adapters | Complete    | Second schema adapter and declarative embedded schemas with explicit unsupported cases                                             |
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
The continuation authorizes Stage 5. Stop after A3; later stages and visualnovel remain outside this run.

Task IDs remain stable when work is split or reordered. Before starting a task, record its
ID in the current-work entry below. Mark a checkbox complete only after its acceptance
condition is demonstrated, and record the relevant commit and checks in the completion log.
Record blockers with the affected task ID and the concrete dependency needed to continue.
Tasks without a checkbox marked complete are pending, including partially implemented work.

- Current work: none; A1–A3 are complete and verified.
- Next task: E1, define host-supplied resource/schema services and their authorization, cancellation and version/conflict contracts.
- Blockers: none for Stage 5. Remaining [design decisions](rich-text-widgets.md#decisions-still-requiring-implementation-prototypes)
  belong to later stages.

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

- [x] H1. Finalize the lifecycle descriptor, stable identities, native-block resolver, and
      focus-preserving change result. Prototype connected-DOM reconciliation with an input and
      an explicitly opted-in local iframe; document which moves preserve focus and playback.
- [x] H2. Implement per-view mount reconciliation, update, error fallback, and idempotent
      disposal. Verify deletion, session replacement, implementation changes, and late async
      results without leaked subscriptions or requests.
- [x] H3. Implement event ownership across shadow DOM for input, clipboard, pointer, drop,
      and composition events. Verify the surrounding editor never treats field edits as prose.
- [x] H4. Implement keyboard entry/exit, Tab, Escape, inner versus outer selection, and
      deletion boundaries. Verify accessible naming and focus survive neighboring text edits.
- [x] H5. Serialize target resolution, authorization, inverse capture, and mutation at the
      command execution boundary. Prove stale/deleted targets settle with no history entry and
      failed edits leave document state unchanged.
- [x] H6. Add history preflight refusal where needed, including the shared application
      stack. Verify revoked document-write permission blocks undo/redo/rerun without moving
      history or mutating data, while per-view read-only remains a separate restriction.
- [x] H7. Implement draft registration, pending status, `prepareSave()`, conflicts between
      views, and control-versus-document undo ownership. Verify serialization remains a pure
      read of committed data and refused or unencodable drafts remain recoverable.
- [x] H8. Adapt existing provider widgets and `renderMedia` to the hosting interface while
      retaining legacy callback behavior. Forward instance configuration and draft barriers
      through `RichTextArea` without global policy or credential state.
- [x] H9. Run browser acceptance cases with a synthetic editable widget in two views,
      including IME, save/navigation with drafts, policy changes, and opted-in iframe retention.
      Record the browser coverage and any unsupported movement behavior before closing stage 1.

### Stage 2: native Markdown table editing

Dependencies: H1–H9. Tables retain ordinary GFM syntax and need no plugin envelope.

- [x] T1. Define the reusable table model and command adapter, with header/alignment
      semantics and a cell editing representation that preserves supported inline formatting.
- [x] T2. Implement cell editing, cell selection, keyboard navigation, and cell drafts on
      the common host. Verify the document still treats the outer table as one opaque block.
- [x] T3. Implement row/column insertion and removal, alignment changes, and rectangular
      cell paste as undoable provider operations with complete snapshots and correct inverses.
- [x] T4. Implement inner TSV/text clipboard behavior and outer document-table copy/paste.
      Verify cell handlers and document handlers do not both consume one clipboard event.
- [x] T5. Add parse/edit/save fixtures for escaped pipes, inline formatting, header cells,
      empty values, and unsupported constructs. Verify unsupported source is retained.
- [x] T6. Demonstrate cell focus, two-view updates, structural undo/redo, and raw Markdown
      round trips in the example application and browser tests; document the supported subset.

### Stage 3: plugin records and host policy

Dependencies: H1–H9. T1–T6 should validate native hosting before the plugin API is finalized.

- [x] W1. Finalize the versioned Markdown block envelope and structured clipboard grammar,
      payload limits, fence escaping, and duplicate-ID repair. Add fixtures before implementing
      parsing, including unknown and future versions.
- [x] W2. Define the explicit plugin registry and session document host. Implement duplicate
      type detection, per-document context, policy invalidation, and separate insert/mount/edit/
      external-action decisions with denial before renderer construction or resource access.
- [x] W3. Implement the optional provider widget-storage capability and immutable record
      reads. Add insert/update/remove commands by stable ID with revision preconditions and
      snapshots; verify behavior through the H5/H6 execution and history boundaries.
- [x] W4. Add Markdown parsing and serialization for block records, with canonical supported
      output and verbatim unsupported source. Verify malformed/oversized envelopes remain inert
      and bounded, and ordinary code fences retain their existing meaning.
- [x] W5. Add structured clipboard plumbing and provider fallbacks. Verify fresh IDs on copy,
      retained IDs on moves and undo, preserved external references, and explicit unsupported
      target behavior without silently dropping saved values.
- [x] W6. Implement explicit undoable migrations with validated output. Verify plugin removal,
      policy denial, and unavailable versions preserve records and do not prevent data-only
      undo/redo or cause migration during rendering.
- [x] W7. Add tests for malicious keys/depth, HTML/URL handling, stale policy decisions, and
      cancellation after revocation. Verify default video references create no players, literal
      video/iframe HTML stays inert, and no embed scripts or services load automatically.
- [x] W8. Document provider opt-in, host configuration, and an application-supplied plugin
      example. Verify ordinary editors without a host retain their existing behavior.

### Stage 4: Zod forms and native front-matter bindings

Dependencies: H1–H9 and W1–W8 for embedded plugin values. Native front-matter forms also
require source retention; the current canonical Markdown serializer is not sufficient.

- [x] F1. Finalize the normalized form schema, presentation metadata, value codecs, and
      binding interface against real fixtures. Separate authored input, editable representation,
      and transformed validation output; specify unsupported constructs explicitly.
- [x] F2. Implement the optional Zod adapter with support for the consumer's Zod major
      version. Test required/optional values, defaults, nested objects/arrays, unions, and
      refinements without silently weakening validation or writing defaults on mount.
- [x] F3. Implement the standalone form control using path.ux controls and command-backed
      drafts. Verify incomplete answers can be saved, full validation gates submission, and no
      duplicate `DataPathSetOp` or direct saved-payload mutation occurs.
- [x] F4. Wrap the form as a block plugin with a host-supplied schema and embedded answers.
      Verify payload/schema version separation, history, read-only modes, and two-view updates.
- [x] F5. Implement or expose the source-retention and patch integration needed by native
      front matter. Verify metadata-only edits preserve body source, body-only edits preserve
      YAML, and undo restores comments, ordering, unknown fields, line endings, and prefixes.
- [x] F6. Bind the shared form to a native front-matter block through the opt-in resolver,
      with host-owned bounded YAML parsing and schema selection. Test missing front matter,
      path/type conflicts, malformed YAML, unsupported aliases/tags, and raw-source fallback.
- [x] F7. Demonstrate form/raw-source views sharing one session and draft barrier. Verify a
      schema switch resolves drafts, external changes cannot be overwritten by stale blur, and
      save preparation does not bypass the application's disk conflict checks.
- [x] F8. Add an example using visualnovel-shaped fixtures and document both binding routes.
      Run schema/provider tests and browser form tests, including partially filled required
      fields and cross-field errors, before closing stage 4.

### Stage 5: additional schema adapters

Dependencies: F1–F8. Adapters remain optional imports, outside the base rich text bundle.

- [x] A1. Implement the nstructjs adapter for a documented subset, with explicit diagnostics
      for helper expressions, references, and unsupported class/value encodings.
- [x] A2. Implement versioned declarative embedded schemas without evaluating document code.
      Verify unsupported runtime behavior requires a host-registered implementation.
- [x] A3. Add shared form fixtures for both adapters and schema-version migrations. Verify
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

Stage 1 completion on 2026-09-16:

| Tasks  | Commit and acceptance evidence                                                                                                                                                                                                                                                                                                                                                    |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1     | `5500c3d4`: finalized descriptor, native resolver, runtime identities, optional caret and `preserveFocus`. The connected-DOM experiment in buildtools/richtext-movement.mjs passed in Chromium and Firefox: `moveBefore` retained input focus/selection and iframe document identity; `append` lost both.                                                                         |
| H2     | `5500c3d4`: per-view mounts, generation aborts, failure placeholders, and idempotent disposal. Unit tests cover denial before construction and late async disposal; browser tests cover deletion/undo, session replacement, implementation replacement, and policy invalidation.                                                                                                  |
| H3, H4 | `5500c3d4`: composed-path event ownership, native field undo, Tab entry/exit, Escape, and independent inner/outer selection. Chromium and Firefox preserve field focus and selection across commits. Chromium CDP verifies composition, deferred refresh, and cancellation on policy invalidation.                                                                                |
| H5, H6 | `5500c3d4` with path-controller `6de53ad`: command resolution, authorization, inverse capture, mutation, and rollback share the history boundary. Tests cover queued edits, deleted/stale targets, unencodable data, partial provider failure, and shared-stack undo/redo/rerun refusal without cursor movement.                                                                  |
| H7, H8 | `5500c3d4`: save barriers wait behind queued history, detect competing drafts, preserve partial commits and recover detached input. Bound-field tests prove pure reads, instance configuration, and one undo entry. Browser tests verify stale acceptance, read-only separation, and legacy media rerender compatibility with shared event ownership.                             |
| H9     | `5500c3d4`: full library/example typecheck and build passed; all 970 unit tests passed across 72 files. The rich-text browser regression run passed 100 tests with 3 skips. The final widget run, including legacy media, passed 19 tests with 1 skip. Both engines retained local iframe identity and continued playing its canvas-fed video across edits and cross-block moves. |

Verification commands were `pnpm run typecheck`, `pnpm run build`, `pnpm run test`,
`pnpm exec playwright test playwright/richtext --workers=2 --reporter=line`, and the final
focused run of playwright/richtext/widgets.spec.ts with the same browser settings.
`pnpm run lint:check` passed (seven existing datapath warnings, zero prose findings).
Changed-file Prettier and `git diff --check` passed. Repository-wide `pnpm run format:check`
reports 66 unchanged path-controller files; this pre-existing formatting baseline was left
untouched. The public-surface fixture records twelve intentional new types and no new
runtime exports. Implementation review also checked cleanup ordering, shared-stack entry
points, the legacy callback path, and draft recovery after detachment.

The two existing Firefox Markdown skips remain. The new Firefox composition case is skipped
because its injection uses Chromium CDP; ordinary Firefox widget keyboard/focus tests pass.
WebKit, mobile/physical IMEs, and uninterrupted movement without `Element.moveBefore` remain
unverified. Engines without that API explicitly remount views in replaced blocks. Legacy
`HTMLElement` callbacks still rerender; retention requires the descriptor form. Rollback takes
a full document block snapshot per edit. Plugin persistence, native tables, schema adapters,
and visualnovel changes remain outside this completed stage.

For every implementation stage, record focused acceptance results here and run the full
library/example typecheck plus applicable unit and browser checks. A task marked complete
does not imply its stage is complete until all stage tasks and their acceptance checks pass.

Stage 2 completion on 2026-09-16:

| Tasks  | Commit and acceptance evidence                                                                                                                                                                                                                                                                                                                                               |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1, T5 | `7ab0b93d`: reusable table model, source snapshot adapter and GFM codec. Twenty-five table tests cover headers, alignment, empty cells, escaping, inline formatting, unsupported source, complete inverses, stale targets and policy refusal.                                                                                                                                |
| T2     | `7ab0b93d`: native cell inputs use the common host, independent per-view drafts, table-level conflicts, keyboard selection and navigation. Browser cases verify focus, native text undo, save barriers, stale drafts, deletion recovery and Chromium composition.                                                                                                            |
| T3, T4 | `7ab0b93d`: cell, row, column, alignment and rectangular paste operations carry complete source snapshots. Two-engine TSV tests and Chromium real clipboard tests verify single ownership and undo. Clipboard ingress reserves prose carriers so pasting a table inside text preserves both surrounding fragments. The final provider/table regression passes all 103 tests. |
| T6     | `7ab0b93d`: the Markdown example demonstrates two views, committed source, structural undo and draft-aware saving. Full library/example typecheck and build pass. All 995 unit tests pass across 73 files. The full rich-text browser run passes 124 tests with 5 skips; the final toolbar-focus/Tab checks pass all 4 cases in Chromium and Firefox.                        |

Verification used `pnpm run typecheck`, `pnpm run build`, `pnpm run test`, focused Vitest
runs of the table and Markdown provider suites, and
`pnpm exec playwright test playwright/richtext --workers=2 --reporter=line`. The table-only
browser run passed 20 tests with 2 skips; the example second-view cases passed in both engines.
The final focused browser command selected `structure,|Tab navigation` from the table spec.
The rendered example table was also inspected visually. `pnpm run lint:check` passes with
seven existing datapath warnings and zero prose findings. Changed-file Prettier passes;
full `pnpm run format:check` still reports the same 66 untouched path-controller files.
Diff whitespace checks use `core.whitespace=cr-at-eol` for the repository's tracked CRLF files.

Review covered source extraction, table boundaries in clipboard insertion, immutable command
capture, history authorization, draft retention and conflicts, DOM focus during commits,
unsupported-source fallbacks and the optional entry point. The main pathux barrel is unchanged.
Only the example bundle changes; no path-controller commit or gitlink update is needed.
Generated regression screenshots were restored after verification. Visualnovel was not modified.

Cells edit inline Markdown source rather than a nested rich-text surface. Draft conflicts are
conservative at table granularity; paste must fit existing dimensions. HTML/image cells,
HTML tables and extra authored columns remain read-only. The existing three Firefox skips
remain, plus two table cases that require Chromium's clipboard permissions or CDP composition.
WebKit, physical/mobile IMEs and movement without `Element.moveBefore` remain unverified.
Stage 3 and later work is pending; no plugin persistence or media service behavior was added.

Stage 1 boundary recheck on 2026-09-16:

The current request stops at H9. The existing hosting implementation (`5500c3d4`, with
path-controller `6de53ad`) and acceptance record (`6df6a5f4`) remain complete. Existing
Stage 2 commits through `9ac40766` were preserved. The unintegrated Stage 3 prototype files
and checklist diff were set aside outside the source tree; no W task passed acceptance.

On this checkout, `pnpm run typecheck` passed both library and example passes,
`pnpm run build` passed without changing tracked bundles, and `pnpm run test` passed all
995 tests in 73 files. `pnpm exec playwright test playwright/richtext/widgets.spec.ts
--workers=2 --reporter=line` passed 19 cases with one Firefox CDP composition skip.
`pnpm run lint:check` passed with seven existing datapath warnings and no prose findings.
Review reconfirmed connected mount retention, command/history authorization, draft recovery,
legacy media compatibility, and the documented browser limitations. Visualnovel was untouched.

Stage 3 completion on 2026-09-16:

| Tasks  | Commit and acceptance evidence                                                                                                                                                                                                                                                                  |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W1     | `97bcffac`: fixtures preceded parser integration. Eleven codec tests cover the exact v1 grammar, unknown/future versions, fence escaping, source-preserving ID repair, duplicate members, hostile keys, sparse arrays, depth and byte limits.                                                   |
| W2     | `97bcffac`: explicit registries and per-session hosts separate insert, mount, edit and external policy. Tests cover duplicate registration, separate document contexts, denial before factory construction, invalidation, abort signals and late-result refusal.                                |
| W3     | `97bcffac`: optional block storage returns frozen snapshots; insert/update/remove/move use complete provider snapshots. Tests cover stale/forged snapshots, queued caller mutation, stable identities, inverses and shared-stack write refusal.                                                 |
| W4     | `97bcffac`: Markdown retains reserved source, including CRLF and unsupported versions; duplicate repair changes only the ID token. Tests cover inert oversized/malformed data, nested/ordinary code fences and canonical writes.                                                                |
| W5     | `97bcffac`: portable structured transfers create fresh IDs and preserve external references. Tests cover surrounding prose, undo/redo, foreign clipboard HTML, explicit plain-provider refusal, escaped static HTML and independent entry parsing.                                              |
| W6, W7 | `97bcffac`: migrations run once as validated undoable edits; removal and policy denial leave data-only history usable. Raw draft edits are refused in favor of scoped prepared updates. Unit and browser tests cover revoked actions, source retention, hostile values and inert default media. |
| W8     | `97bcffac`: provider/host documentation and an application note plugin demonstrate two views, drafts and explicit opt-in. Bound-field tests verify per-instance configuration, one mount per replacement and one undo entry. The example was inspected visually in the browser.                 |

Final verification:

- `pnpm run typecheck` passes the library and example passes; `pnpm run build` passes.
- `pnpm run test` passes all 1,032 tests across 75 files, including the unchanged barrel surface.
- `pnpm exec playwright test playwright/richtext --workers=2 --reporter=line` passes 140
  tests with five existing skips. The focused plugin/example/image regression passes all
  20 cases in Chromium and Firefox. No new skips were added.
- `pnpm run lint:check` passes with seven existing datapath warnings and zero prose findings.
  Changed-file Prettier and whitespace checks pass. Repository-wide `pnpm run format:check`
  still reports the same 66 untouched path-controller files.

Review covered immutable capture, authoritative snapshot checks, draft command validation,
clipboard boundaries, hostile JSON, source offset mapping, disposal, instance configuration,
optional bundle boundaries and default media behavior. Browser fixtures were corrected to
use the local server without query strings. Shared screenshot overwrites caused Windows
file-open errors; Markdown diagnostics now use per-test output paths. The final full browser
run passes, and generated tracked screenshots were restored. Library/example bundles are
committed. No path-controller change or gitlink update was needed; visualnovel was untouched.

This API supports block records and one current payload version per plugin. Inline records,
forms/schema adapters, and external resource services remain pending. Plugins are trusted
application code, not isolated executable modules. Record envelopes retain unsupported source;
the surrounding Markdown document still uses its existing canonical serializer. Structured
transfers with an unclosed reserved container are explicitly refused. Host metadata/policy
changes require invalidation. The five existing browser skips and the earlier WebKit,
physical/mobile IME, and movement-without-`moveBefore` limitations remain.

Stage 4 completion on 2026-09-16:

| Tasks | Commit and acceptance evidence                                                                                                                                                                                                                                                                                                |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1    | `b0a6195f`: normalized input schema, presentation metadata, editable JSON/text codecs, and versioned binding contract. Consumer-shaped character/location fixtures exercise records, nested arrays/objects and unions. Tests preserve unknown authored keys and separate transformed output from saved values.                |
| F2    | `b0a6195f`: optional Zod 3 adapter retains original asynchronous validation, refinements, transforms, defaults and unknown-key policy. Defaults are not evaluated during normalization. Unsupported constructs produce diagnostics; no executable schema is stored in a document.                                             |
| F3    | `b0a6195f`: standalone path.ux controls keep local text drafts with datapath undo disabled. Unit/browser cases verify incomplete answers, unencodable drafts, omission, full submission validation, stale validation results, and one document history entry per commit.                                                      |
| F4    | `b0a6195f`: explicit `pathux.form` plugin uses host schema references and embedded answers. Both engines verify separate payload/schema versions, unavailable schema preservation, two independent views, undo, read-only behavior, and shared-stack write refusal.                                                           |
| F5    | `b0a6195f`: opt-in retained source travels through provider snapshots. Tests cover exact metadata/body preservation, comments, quotes, unknown fields, CRLF/BOM/blank prefixes, undo/redo, missing/deleted front matter, unsupported delimiters, clipboard isolation, runtime media IDs and duplicate widget identity repair. |
| F6    | `b0a6195f`: native resolver requires retained source and delegates parsing/selection to the host. The example's bounded YAML codec rejects malformed input, aliases, anchors, tags, hostile keys and unsupported patches. Tests cover missing front matter, path/type conflicts, diagnostics and raw fallback.                |
| F7    | `b0a6195f`: raw/form views share a session and draft barrier. Tests verify schema-switch flushing, stale raw refusal, detached draft recovery, simulated disk hash conflicts, and successful earlier saves leaving later edits unsaved.                                                                                       |
| F8    | `b0a6195f`: the Markdown example includes both bindings, standalone controls, shared views and a raw editor. The example was inspected visually; all form and example cases pass in Chromium and Firefox. Both binding routes and their limitations are documented in the forms design.                                       |

Final verification:

- `pnpm run typecheck` passes the full library and example checks; `pnpm run build` passes.
- `pnpm run test --maxWorkers=4` passes all 1,074 tests across 76 files. The form suite adds
  42 cases, and the main barrel surface remains unchanged. The final focused form/Markdown/plugin
  unit regression passes all 129 tests.
- `pnpm exec playwright test playwright/richtext --workers=2 --reporter=line` passes 172 tests
  with the five existing skips. After the final source-fallback and field-visibility changes,
  the forms/example regression passes all 32 cases in both engines. No new skips were added.
- `pnpm run lint:check` passes with seven existing datapath warnings and zero prose findings.
  Changed-file Prettier and CRLF-aware whitespace checks pass. Full `pnpm run format:check`
  still reports only the same 66 unchanged path-controller files.

Review covered authored/input/output separation, immutable snapshots, scoped plugin commands,
shared history authorization, schema invalidation, raw/source conflicts, source-offset repairs,
clipboard boundaries, mount-only media identities, and application save ownership. Native
forms refuse documents opened without source retention. Unsupported delimiter variants retain
raw source instead of losing a prefix. Browser assertions were corrected to accept the error
prefix on stale validation diagnostics and click the path.ux button host rather than its
internal label. The final form and example runs pass. Generated example bundles are committed;
the main library bundle contains no form, Zod or YAML runtime imports. No submodule change or
gitlink update was needed. Visualnovel was not modified.

Complex fields use JSON text controls. Unsupported Zod constructs need an application adapter;
unsupported YAML patches remain raw-editable and retain their drafts. Metadata-only edits retain
untouched body source, while body edits use the existing canonical body serializer; undo restores
the authored source. Retained source increases history snapshot memory. The example's disk writer
is simulated, so applications must retain their own authoritative hash/identity checks. WebKit,
physical/mobile IMEs and uninterrupted movement without `moveBefore` retain the earlier limits.
Stage 5 adapters, external services, inline records and the visualnovel migration remain pending.

Stage 5 completion on 2026-09-16:

| Tasks | Commit and acceptance evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1    | `6e6b58af`: optional nstructjs metadata adapter supports bounded scalar, array and optional JSON inputs. Tests cover numeric ranges, nullable optionals, helper expressions, named/abstract references, iterator variables and unsupported class/value encodings. Registered fixture constructors and readers are never executed. The inspected 0.8.12 metadata API and stricter form-validation policy are documented.                                                                       |
| A2    | `6e6b58af`: bounded version-1 declarative schemas support explicit scalar, collection, object, enum and union validation. Unknown keywords, runtime hooks, malformed shapes and future grammar versions produce diagnostics. Tests cover hostile JSON, cyclic/accessor input and the validation work limit. Both browsers preserve unsupported executable text inertly and require an explicit registered schema to restore behavior. The original reference-only plugin remains the default. |
| A3    | `6e6b58af`: shared intake fixtures exercise both adapters, editable codecs and source-preserving YAML patches. The example demonstrates catalog-version migration and embedded-schema replacement. Both browsers verify independent views, invalid/incomplete answer persistence, draft conflicts, stale command refusal, shared history authorization and atomic schema/answer undo. Redo never re-executes conversion. Optional bundle boundaries and limitations are documented.           |

Final verification:

- `pnpm run typecheck` passes both the library and example checks; `pnpm run build` passes.
- `pnpm run test --maxWorkers=4` passes all 1,128 tests across 77 files, including 54 new
  adapter cases. Main barrel exports remain unchanged. The declarative adapter's bundle
  contains no nstructjs, Zod, YAML or form UI runtime.
- `pnpm exec playwright test playwright/richtext/forms.spec.ts --workers=2 --reporter=line`
  passes all 48 cases in Chromium and Firefox. The full rich-text browser run passes 190
  tests with the same five existing skips. One earlier Firefox disk-conflict case timed out
  after returning the expected save result; it passed in both the complete forms rerun and
  the full regression. No timeout increase or new skip was introduced.
- `pnpm run lint:check` passes with the seven existing datapath warnings and zero prose
  findings. Changed-file Prettier and CRLF-aware whitespace checks pass. Full
  `pnpm run format:check` reports only the same 66 unchanged path-controller files.

Review covered metadata-only adaptation, unsupported runtime behavior, strict schema decoding,
validation bounds, authored-value preservation, migration snapshots, draft barriers, shared
history policy and undo/redo rebinding. The rendered adapter forms were inspected in Chromium;
the screenshot was saved as `pathux-stage5-adapters.png` in the system temporary directory.
Verification logs are `pathux-stage5-unit.log`, `pathux-stage5-forms-final.log`,
`pathux-stage5-browser.log`, `pathux-stage5-lint.log` and `pathux-stage5-format.log` in that same
directory. Generated example bundles are committed; the main library bundle is unchanged.
No submodule change or gitlink update was needed, and visualnovel was not modified.

The nstructjs adapter intentionally excludes class readers, helper expressions, references,
static encodings and other values requiring application codecs. It preserves authored floats
without promising lossless float32 binary conversion. Declarative descriptions support a
bounded path.ux subset rather than general JSON Schema; executable behavior requires a
host-registered implementation. Complex fields still use JSON text controls. The example
migration is pure application code using the existing command boundary; applications must
retain schema invalidation and their authoritative save/conflict handling. Earlier WebKit,
physical/mobile IME and movement-without-`moveBefore` limits remain. External services, true
inline records and the visualnovel migration remain pending.
