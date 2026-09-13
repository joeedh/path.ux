# Rich text editing over a document provider: tasks

Tasks for [`rich-text-provider.md`](rich-text-provider.md). Each stage is a commit, and each
stage's status is recorded here when it lands.

Status: task 1 done; task 3 stages 1 to 3 done; task 2 done (all seven stages).

<!-- toc -->

- [Task 1 — pressure test the design](#task-1--pressure-test-the-design)
- [Task 2 — implementation](#task-2--implementation)
  - [Stage 1 — interfaces and the reference provider](#stage-1--interfaces-and-the-reference-provider)
  - [Stage 2 — position mapping](#stage-2--position-mapping)
  - [Stage 3 — `RichTextContext`, `DocumentSession` and `DocEditOp`](#stage-3--richtextcontext-documentsession-and-doceditop)
  - [Stage 4 — the editor widget](#stage-4--the-editor-widget)
  - [Stage 5 — composition events over CDP](#stage-5--composition-events-over-cdp)
  - [Stage 6 — clipboard and the toolbar](#stage-6--clipboard-and-the-toolbar)
  - [Stage 7 — the example app and the docs](#stage-7--the-example-app-and-the-docs)
- [Task 3 — remove the docs system: `simple_docsys`, `DocsBrowser` and TinyMCE](#task-3--remove-the-docs-system-simple_docsys-docsbrowser-and-tinymce)
- [Task 4 — the IME plan](#task-4--the-ime-plan)

<!-- tocstop -->

## Task 1 — pressure test the design

**Done.** A fresh-context agent found ten problems, all accepted and folded into the design;
the disposition of each is under Findings in the design doc. The three that changed the design
most: undo never runs with the app's context (so sessions resolve through `ctx.session` only),
folding contiguity has to live in `foldKey` (so the run counter is `pathUndoGen`), and
composition refusal drops dead-key accents, not only CJK input (so the IME plan is no longer
optional for European layouts).

## Task 2 — implementation

All seven stages done. Seven stages, in order; each is green on `pnpm run typecheck`, `pnpm run test` and
`pnpm run lint:check` before the next begins.

### Stage 1 — interfaces and the reference provider

- `scripts/widgets/richtext/provider.ts`: `BlockId`, `DocPos`, `DocRange`, `BlockSnapshot`,
  `EditOp` (including `replaceBlocks`), `EditResult`, `DocChange`, `ClipboardContent`,
  `MarkInfo`, `DocumentProvider<Doc>`.
- `scripts/widgets/richtext/providers/plain.ts`: a provider over
  `{ blocks: { id, text, marks: { from, to, name }[] }[] }`. Implements every edit including
  `replaceBlocks`, `inverse` as a `replaceBlocks` snapshot of the touched blocks, `marks()`,
  `toClipboard`/`fromClipboard` for `text/plain` (splitting on newlines into `blocks`), and
  `onChange` with a listener list.
- Tests in `tests/richtext/plainProvider.test.ts`: every `EditOp` against a fixture document,
  the expected `dirtyBlocks` and `selection` for each, a `deleteRange` across three blocks
  joining the outer two, and `inverse` round-tripping every op back to the fixture.

Done. Fifty tests pass. Decisions the design left to the provider, recorded so the editor and
the example do not rediscover them:

- Typing extends a mark the caret is inside of or at the end of, and a mark starting at the
  caret moves right, so text typed at the start of a bold run is not bold. Pasted text
  (`insertContent`) never inherits a mark; a mark spanning the paste is split around it.
- Marks are half-open offset ranges; the provider drops empty ones and merges same-named ones
  that touch after every edit, so a `toggleMark` over a sub-range splits and over an
  overlapping range merges.
- `toggleMark` removes the mark only when every non-empty segment of the range already has it.
- `inverse` snapshots every block the op's range covers plus the ids it will create, with the
  block before the first of them as `after`; the touched blocks are contiguous for every op
  type, which is what lets one anchor place them all.
- A `replaceBlocks` result puts the caret at the end of the last restored block, or at the
  start of the block following `after` when it only removes. The editor keeps its own caret on
  undo, so this is a fallback.
- `provider.ts` also carries `ATOM_CHAR` and `CARET_SLOT` (the object replacement character
  and the zero-width space of the render contract, built with `String.fromCharCode`) and
  `newBlockId()`; `plain.ts` carries `plainDocFromLines` for fixtures and the example, and a
  public `notifyChange(doc, change)` outside the interface so a direct write to a `PlainDoc` can
  reach `onChange` listeners.
- Nothing is exported from the barrel yet; stage 7 adds the exports against the `Object.keys`
  baseline.

### Stage 2 — position mapping

- `scripts/widgets/richtext/positions.ts`: `toDocPos`, `fromDocPos`, and `mapThroughPending`
  (positions through a queue of unresolved `EditOp`s).
- Tests in `tests/richtext/positions.test.ts` (jsdom): blocks rendered by the plain provider,
  plus hand-built blocks with atoms, adjacent atoms, an empty block, an opaque block, and marks
  nested three elements deep. Round-trip every offset of every fixture both ways. Pending-op
  mapping for each op type, including a split that moves the mapped position into the new
  block.

Done. Thirty tests pass, under happy-dom rather than jsdom, since that is the environment the
repo's vitest config already provides. Two departures from the text above:

- `mapThroughPending(pos, pending, doc)` takes a third argument, a `PendingDocView` with the
  block order and a `blockText` accessor for the document as it stands before the pending ops.
  The ops alone cannot map a position through a `joinWithPrevious` (the previous block's
  length) or order a cross-block range (the block order), and the mapper tracks how each
  pending op changes both as it goes. The editor passes the provider's answers for the current
  document, which is the pre-pending state because a result is applied in the microtask after
  `exec` and no DOM event can arrive between the two.
- A caret slot character counts 0 wherever it sits inside a text node, not only as a text node
  of its own. `innerHTML` parses a slot beside text into one merged text node, and the walk
  should not depend on how the nodes were built.

`positions.ts` also exports `DomPos` (the `Selection` API's node-plus-offset pair) and
`blockElement(root, id)`, which finds a block by scanning the root's children rather than by a
CSS selector, so an id needs no escaping.

### Stage 3 — `RichTextContext`, `DocumentSession` and `DocEditOp`

- `scripts/widgets/richtext/context.ts`: the two classes, `toLocked` over `toLockedImpl` with
  `session` and `toolstack` kept live, `disposed` and `dispose()`.
- `scripts/widgets/richtext/ops.ts`: `DocEditOp` with two `StringProperty` inputs (op and
  inverse, `SAVE_LAST_VALUE` cleared), `exec`, `undo`, `foldKey` carrying the run counter,
  `foldFrom` fulfilling `next`'s resolver, no `canRun`. Registered in the default registry
  under `richtext.edit`.
- Tests in `tests/richtext/ops.test.ts`: exec, undo, redo against the plain provider on a
  fresh `ToolStack`; a run of `insertText` ops folding to one entry whose undo removes the
  whole run; a bumped run counter ending the run; a `splitBlock` ending the run; undo after
  `dispose()` being a no-op; the same ops on a shared stack with an unrelated op between
  them; `SavedToolDefaults` untouched after a run.

Done. Twenty-two tests pass, on top of the fifty and thirty from the stages before. Departures
from the text above, and from the design:

- `toLocked` calls the parent's own `toLocked` when it has one and falls back to
  `toLockedImpl` only for a parent without. `_execTool` would have called exactly that on the
  parent, and an app context's `toLocked` can carry save and load hooks the generic copy would
  not know about. The `api` and `screen` getters cast, since `ContextLike` types both by the
  self type and the parent's are what serve this context.
- `DocumentSession` carries the listener side the design described in prose: `onChange(listener)`
  returning its unsubscribe, and `deliver(change)`, which `DocEditOp`'s undo and redo call. The
  session subscribes to the provider's `onChange` in its constructor and forwards, so an editor
  registers with the session only, and `dispose()` unsubscribes and clears the set. The id is a
  fourth constructor argument defaulting to `doc<n>` from a module counter.
- `foldFrom` keeps the inverse stored when the run began and never asks `provider.inverse`
  again. The design's sentence that a structural provider "must be prepared for `foldFrom` to
  call `inverse` again and replace the stored one" cannot be honoured: by the time `foldFrom`
  runs the state before the run is gone, so nothing computed then could undo it. The provider
  contract in `provider.ts` now says the inverse of an `insertText` or `deleteRange` must
  restore the block, not reverse the one edit. Proposed design edit: replace that sentence
  with the contract as stated in `provider.ts`.
- A non-folding op takes a key no other op carries, `<session>:<type>:#<n>` from a module
  counter. With the run alone in the key, two `toggleMark` ops on one block in one run would
  have matched and folded. A `deleteRange` across blocks takes the same unique form, since a run
  never leaves its block.
- `DocEditOp` types its context as `RichTextContext` through `ToolOp`'s third parameter, exposes
  `op` and `inverse` getters over the JSON inputs, and `result()` returns the promise the
  resolver fulfils. Its constructor takes `(op, inverse, sessionId, run)`, all optional, since
  nstructjs needs a no-argument form. `foldFrom` merges a `deleteRange` run into one range
  from the smallest offset over the summed lengths, which covers both a backspace run and a
  forward-delete run.
- On a disposed session `foldFrom` returns without settling `next`'s resolver, as there is no
  result to give; nothing is awaiting by then, since the editor is gone with the session.
- Registration is confirmed through `defaultRegistry.ensurePaths()` rather than `ToolPaths`,
  which is only filled once something has walked the registry.

One thing found while writing the tests, settled in stage 7: `exec` answered the submitting
editor alone, so a second editor on the same session did not hear an edit made in the first.
Every result now also goes to the session's listeners, tagged with the `source` the submitter
passed to `result()`, and an editor skips the changes it made itself, so its typing run stays
intact while the other editor re-renders.

### Stage 4 — the editor widget

- One-line change in `checkForTextBox` (`scripts/widgets/ui_textbox.ts:554`): an active
  element with `isContentEditable` counts as a text box. Test: a focused `rich-text-x` with
  the pointer over a button swallows Ctrl+Z from the screen keymap.
- `scripts/widgets/richtext/editor.ts`: `RichTextEditor` (`rich-text-x`), the editable root,
  initial render, `mapInput` with the target-range and selection fallbacks, `commit`, the
  pending queue, `EditResult` application, `onChange` handling, `undoBreakPoint()` on every
  break-point condition the design lists, composition refusal with the `composing` flag and
  recorded `DocPos`, and the development-mode `MutationObserver` with `takeRecords()` after
  every render.
- Playwright tests in `tests/richtext/editor.spec.ts`: type a sentence and read the document;
  backspace across a block boundary joins; Enter splits; Ctrl+B toggles a mark and the toolbar
  reflects it; Ctrl+Z undoes the whole typing run and Ctrl+Y restores it; moving the caret
  then typing starts a new run; ten characters typed while the toolstack is held (a test hook
  that delays `protect`) land in order; every delete type with `getTargetRanges` stubbed to
  return `[]`. Composition is covered by stage 5 with real IME events rather than dispatched
  ones.

Done. Seventeen Playwright tests pass alongside the twenty from before, with the one
pre-existing `theme_vars` failure unchanged. Departures from the text above, and from the
design:

- The spec is `playwright/richtext.spec.ts`, not `tests/richtext/editor.spec.ts`. The
  Playwright config's `testDir` is `playwright/` and vitest's glob is `tests/**/*.test.ts`, so
  a `.spec.ts` under `tests/` would have run under neither.
- The tests need a page hosting the widget, so the example's Rich Text tab arrives here
  rather than in stage 7: `example/page.tsx` declares it and `properties.ts` builds an editor
  over the plain provider on a toolstack of its own, with the composition notice the design
  asks for. The example deep-imports the richtext modules for now; stage 7 switches it to the
  barrel when the exports land. The import has to be a value import, since a type-only one is
  elided and the tag then never registers.
- `mapInput` returns an array of ops. Enter on a non-collapsed selection is a `deleteRange`
  followed by a `splitBlock`, and refused or directly handled input is an empty array.
- Ctrl+Z, Ctrl+Y and Ctrl+Shift+Z are handled on `keydown`, with `historyUndo` and
  `historyRedo` still mapped. Chrome only emits those input types when its own undo history
  has entries, and an editor that prevents every input never gives it any.
- The toolbar needs to know which marks are on at the selection, and the provider interface
  had no query for it. `DocumentProvider` gains an optional `activeMarks(doc, range)`, which
  the plain provider answers with the marks a `toggleMark` there would remove, or for a caret
  the marks typing would extend. Without it the toolbar never lights.
- The toolbar is built from `iconcheck-x` buttons so the state shows, with `on_change` driving
  `toggleMark` and a guard so the editor's own syncing does not re-toggle. Each carries
  `data-testid="richtext-mark-<name>"`.
- `UIBaseDefinition` gains `modalKeyEvents?: boolean`. `checkForTextBox` already read it off
  `define()`, but the typed return the theme declaration needs did not admit it.
- Every refused input dispatches a `refused` event with `{ inputType }`, not only composition,
  and Tab is refused on `keydown`. The mutation observer is gated by a static
  `RichTextEditor.observeMutations`, on by default.
- On a change delivered through the session the editor keeps its own caret when the selection
  is inside it, clamped to the new block lengths, and takes the change's selection otherwise.
- Word deletes use `Intl.Segmenter` and treat an atom as a word of its own, so a word delete
  stops at it rather than removing an embedded widget with the next word.
- Public surface beyond the design: `select(range)` focuses and places the selection,
  `selection()` reads it, `richCtx` exposes the document's context, and `root` is the editable
  element, all of which the spec drives.
- The Ctrl+Z gate test was run once with the `checkForTextBox` change stashed and fails there,
  so it is load-bearing.
- Both `dist/` bundles are rebuilt and committed, as the earlier stages did.

### Stage 5 — composition events over CDP

Ground truth for the refusal path in stage 4 and for the IME plan in task 4. Playwright's
keyboard API cannot compose, so the test drives Chromium's IME through a CDP session
(`page.context().newCDPSession(page)`), which is also what `connectApp()` in
`buildtools/cdp.mjs` hands back for the running example app.

- A helper in `playwright/richtext/composition.ts` that records every `compositionstart`,
  `compositionupdate`, `compositionend`, `beforeinput` (with `inputType`, `data` and
  `isComposing`) and `input` event on a target into an array, and a `compose(cdp, steps,
commit)` function that sends one `Input.imeSetComposition` per step and `Input.insertText`
  for the commit.
- `playwright/richtext/composition.spec.ts`, first against a bare `contenteditable` div and
  then against `rich-text-x`:
  - a two-step Japanese composition (`か`, `かん`) committed as `漢`: assert the full event
    order, and in particular whether a final `beforeinput` with `insertCompositionText`
    precedes `compositionend` or the commit arrives as `insertText`;
  - a one-step dead-key composition (`´` then commit `é`): assert it is the same sequence with
    one update;
  - a composition abandoned by `Input.imeSetComposition` with empty text: assert what
    `deleteCompositionText` looks like and whether `compositionend` carries `data: ""`;
  - on `rich-text-x`, each of the above leaves the document unchanged, the caret where it
    was, and dispatches one `refused` event.
- Record the observed sequences in a comment at the top of the spec, since the IME plan is
  written from them and the browser is the only source.
- Firefox is manual only (no synthetic IME path); the manual steps in
  `documentation/richtext.md` list the Windows language packs to install (Japanese and
  Chinese Microsoft IMEs, Korean, and the United States-International keyboard for dead keys).

Done. Six Playwright tests pass, three on a bare `contenteditable` div and three on
`rich-text-x`. What Chromium does, recorded at the top of the spec:

- The commit never arrives as `insertText`. `Input.insertText` after a composition produces one
  more `compositionupdate` and a `beforeinput` of `insertCompositionText` carrying the committed
  text, then `compositionend` whose `data` repeats it.
- An abandoned composition never produces `deleteCompositionText`. It is an
  `insertCompositionText` with empty `data`, whose `input` event carries `null`, then
  `compositionend` with `data: ""`.
- Every `beforeinput` during a composition has `isComposing` true and is not cancelable, on
  the bare div and on the editor alike; the editor's DOM shows the composed text until
  `compositionend` re-renders the block.
- On `rich-text-x` each scenario leaves the document and the caret unchanged and dispatches
  exactly one `refused` event, at `compositionend`.

Departures from the text above:

- `tsconfig.json` now includes `playwright/**/*.ts` rather than `playwright/*.ts`, so the new
  subdirectory is typechecked and eslint's project service accepts it.
- `documentation/richtext.md` exists from this stage with the composition section and the
  manual Firefox steps only; stage 7 writes the rest. The example logs every `refused` event
  to the console so the manual steps have something to watch.
- The helper's `compose` abandons a composition by sending an empty `Input.imeSetComposition`
  when `commit` is `undefined`, since CDP has no separate cancel call.

### Stage 6 — clipboard and the toolbar

- `copy`, `cut`, `paste` on the editable root through the provider.
- Toolbar from `provider.marks()`, hidden by attribute, `editor.toggleMark(name)`.
- Playwright: copy a range and paste it into a second block; cut is one undo entry; paste of
  three lines makes three blocks with the pre-allocated ids.

Done. Four more Playwright tests in `playwright/richtext.spec.ts`, twenty-one there in all.
Notes:

- `copy` and `cut` are handled on the editable root as the design says: the selection goes
  through `toClipboard` as `text/plain` joined by newlines, plus `text/html` when the provider
  gives it, and the event's default is prevented. A cut then commits a `deleteRange` bracketed
  by run breaks, so it neither joins a backspace run in progress nor starts one; the design's
  "one undo entry" is stated as an entry of its own. Preventing the `cut` event's default keeps
  Chromium from also sending `deleteByCut`, whose mapping in `mapInput` stays for a browser
  that sends it alone.
- Paste was already in place from stage 4 through `insertFromPaste`. The three-line test
  dispatches a synthetic `beforeinput` carrying a `DataTransfer`, and reads the pre-allocated
  ids off the op at the head of the stack to compare with the blocks created.
- Headless Chromium has a working clipboard, so the copy, cut and paste tests use the real
  Ctrl+C, Ctrl+X and Ctrl+V keys; the first probe showed `copy` fires with writable
  `clipboardData` and Ctrl+V arrives as `insertFromPaste` with `text/plain` and `text/html`.
- The attribute that hides the toolbar is `no-toolbar`, read in `update()` since `UIBase`
  observes no attributes; `toggleMark(name)` works with it hidden.

### Stage 7 — the example app and the docs

- A page in `example/` with two `RichTextEditor`s over one `DocumentSession` on a
  per-document toolstack, and a third over the app's toolstack, so both configurations are
  exercised. The page states on screen that composition (including dead-key accents) is not
  yet supported.
- Write `documentation/richtext.md`, which describes the provider contract for a consumer,
  including the mutable-holder requirement for a string-backed document, and link it from
  `CLAUDE.md` under Widgets.
- Barrel exports verified against a pre-change `Object.keys` baseline of `dist/pathux.js`.
- Mark `RichEditor` `@deprecated` pointing at `RichTextEditor`.

Done. Two more Playwright tests, twenty-three in `playwright/richtext.spec.ts` and
twenty-nine for rich text in all. Notes and departures:

- The example's Rich Text tab, begun in stage 4, now holds the three editors the text asks for:
  two over one `DocumentSession` on a toolstack of its own and a third over a second document on
  `_appstate.toolstack`. The example imports from the barrel. The third editor uses
  `_appstate.toolstack` rather than `this.ctx.toolstack`, since `ContextLike` types the latter
  as `IToolStack`, which `DocumentSession` does not accept.
- Two editors over one session needed the delivery change recorded under stage 3:
  `DocEditOp.result(source)` takes the submitter, `DocumentSession.deliver(change, source)`
  passes it on, and the editor ignores its own. A change from elsewhere never moves the DOM
  selection: the first run of the two-editor page showed the unfocused editor pulling the
  selection into itself on every keystroke and breaking the other's typing run.
- The barrel exports `provider.ts`, `context.ts`, `ops.ts`, `editor.ts` and `providers/plain.ts`;
  `positions.ts` stays internal. Checked two ways: the esbuild metafile's export list for
  `dist/pathux.js` gained exactly `ATOM_CHAR`, `CARET_SLOT`, `DocEditOp`, `DocumentSession`,
  `PlainProvider`, `RichTextContext`, `RichTextEditor`, `newBlockId` and `plainDocFromLines`
  over the pre-change build, and `tests/barrelSurface.test.ts` (which also sees type exports)
  gained those nine values and fifteen types, with nothing removed; its fixture is regenerated.
- `documentation/richtext.md` is written in full and linked from `CLAUDE.md` under Widgets.
  `RichEditor` carries `@deprecated` pointing at `RichTextEditor`.

## Task 3 — remove the docs system: `simple_docsys`, `DocsBrowser` and TinyMCE

Stages 1 to 3 done. Stages 1 to 3 do not depend on task 2 and can run before it; only stage 4 waits on
task 2's stage 7.

Gate status when stage 1 started, recorded so a later stage does not mistake it for its own
regression: `pnpm run typecheck` and `pnpm run test` were green. `pnpm run lint:check` was red
before any change here, from three stale registered worktrees under `.claude/worktrees/` that
eslint's flat config walks, from `simple_example/*.js` and the submodule's `pathwatch.ts`, and
from 157 prose findings across `documentation/` and `specs/`. `pnpm run format:check` was red on
75 files, none under `servers/`. `pnpm exec playwright test` had one failure, the theme editor
variable list in `theme_vars.spec.ts`, and the run rewrites the tracked screenshots under
`playwright/screenshots/`. Each stage below is held to adding nothing to those sets.

The three pieces are one system and go together. `simple_docsys` is a Node-side bridge that
renders markdown to HTML with `marked` and writes edits back, reached over an RPC endpoint in
the dev server or through `require` under Electron and NW.js. `DocsBrowser`
(`scripts/docbrowser/`) is the widget that shows those pages in an iframe and edits them with
TinyMCE. `DocsBrowserEditor` in `example/` is the pane that hosts the widget, and it is the
widget's only consumer. `simple_docsys` was written for a locally served path.ux and later for
Electron and NW.js, not for the web; the replacement, when one is wanted, is better wrappers
around the web file system APIs, which is separate work and out of scope here.

What is there today:

- `simple_docsys/`: 79 tracked files, 3 MB, most of them `manual/` and `doc_build/` — a
  placeholder manual (headings "In", "Page 2", "Page 3") and its build. Its own `package.json`
  declares `marked`, `parse5` and `diff`; that is the only `marked` in the repo, so deleting the
  directory removes the markdown dependency outright.
- `servers/rpc.js` imports `simple_docsys/docsys.js` at module load and exposes `updateDoc`,
  `newDoc`, `hasDoc` and `uploadImage`. All three dev servers import it: `servers/serv.js:4`
  (which `pnpm serv` runs, and which Playwright's `webServer` starts), `servers/serv_simple.js:4`
  and `servers/http2.js:9`. Deleting `simple_docsys` alone breaks the dev server and the
  Playwright suite, so `rpc.js` and its wiring go in the same commit.
- `scripts/docbrowser/docbrowser.ts` (plus a stale `docbrowser.ts.bak`). The Electron path
  (`docbrowser.ts:180-195`) is the only user of the root `parse5`, `@types/parse5` and `diff`
  devDependencies.
- The second barrel and the second bundle, which exist only to carry the widget:
  `scripts/pathux_with_docbrowser.ts` (two `export *` lines), the root
  `pathux_with_docbrowser.js` shim over `dist/`, the tracked
  `dist/pathux_with_docbrowser.{js,js.map,d.ts}`, the second entry point in
  `buildtools/esbuild.mjs:38`, the `marked`/`parse5`/`diff` entries in that file's `external`
  list (`:7`), and the second entry in `tsconfigDecl.json:24`, which `pnpm run emitTypes` reads.
  After this, `scripts/pathux.ts` is the one barrel and `dist/pathux.js` the one library bundle.
- `example/editors/docbrowser/docbrowser.ts`, imported by `example/core/app.ts:1`; the
  `docsbrowser` getter and field in `example/core/context.ts:12`, `:34` and `:119`;
  `DocEditorPath` in `example/core/const.ts:56` and `:78`.
- `docManualPath` and `docEditorPath` in `scripts/config/const.ts:185-186` and `:240-241`;
  the TinyMCE types, `Window.tinymce`, `Window._tinymce`, `PATHUX_DOCPATH`,
  `PATHUX_DOC_CONFIG`, `PATHUX_DOCPATH_PREFIX` and `_relative` in `scripts/global.d.ts`
  (`:11-36`, `:130-144`).
- `scripts/lib/tinymce/` and `example/lib/tinymce/`, 146 tracked files and 8.1 MB each. The
  `example/` copy is referenced by nothing.
- Config that exists only for the above: `tsconfig.json:29-32` (`simple_docsys` and `servers`
  includes), `eslint.config.js:26`, `:31`, `:33`, `:34` and `:129`, `.claudeignore:3`,
  `tsconfigDecl.json:30`, and the `simple_docsys` copy in `buildtools/build_package_new.sh:20`.
  The `pathux_with_docbrowser.js` line in `CLAUDE.md`'s build section. (`tsconfigDeclTmp.json`
  and `tsconfigExampleDecl.json` at the root are untracked scratch and are not part of this.)

Stages:

- **Stage 1 — the servers.** Done. Deleted `servers/rpc.js` and the `rpc` import and the whole
  `/api/` handler block in `serv.js`, `serv_simple.js` and `http2.js`, since the block existed
  only to call `rpc.handle`; a request under `/api/` now falls through to the static file path
  and gets a 404. `pnpm serv` serves `/` and `example/index.html`, and the Playwright suite
  starts and matches its baseline.
- **Stage 2 — the example pane and the widget.** Done. Deleted `example/editors/docbrowser/`,
  its import in `app.ts`, the `docsbrowser` accessor in `context.ts` and `DocEditorPath` in
  `const.ts`; deleted `scripts/docbrowser/`, the `pathux_with_docbrowser` barrel, shim and dist
  files, the esbuild entry point and its three externals, and the `tsconfigDecl.json` entry.
  `pnpm run build` and `pnpm run emitTypes` produce `pathux.*` only. Removed the `doc*Path`
  constants, the `PATHUX_DOC*`, `_relative` and TinyMCE declarations from `global.d.ts`, and
  `parse5`, `@types/parse5` and `diff` from the root devDependencies. Four things the inventory
  above did not list, all handled here:
  - The root `pathux.js` re-exported from `scripts/pathux_with_docbrowser.js`, not from `dist/`;
    it now re-exports from `scripts/pathux.js`.
  - `example/global.d.ts` declared `_relative` too (to match the library's declaration); both
    copies are gone.
  - `eslint.config.js:22` ignored the root `pathux_with_docbrowser.js`; that line went with the
    file rather than waiting for stage 3.
  - The lockfile still pins `parse5` and `diff` for the `simple_docsys` workspace package until
    stage 3 deletes it.
    A saved layout naming `docs-browser-editor-x` loads without throwing and needs no skip: the
    file's schema carries the struct, nstructjs reads the editor entry without a registered class,
    and `ScreenArea.loadSTRUCT` (`ScreenArea.ts:1719`) finds no active area, warns "Failed to find
    active area!", and shows the tile's first remaining editor. Verified by capturing a layout with
    the pane from the pre-deletion build, then loading it from localStorage in the rebuilt example
    under Playwright: no page error, three tiles, the docs tile showing a workspace editor. The
    library bundle differs from the stage 1 baseline by the two removed constants only.
    `pnpm run emitTypes` writes `types/`, which is neither gitignored nor eslint-ignored, so a
    run of it leaves `lint:check` red until the directory is deleted; that predates this task and
    is left as found.
- **Stage 3 — the trees and the config.** Done. Deleted `simple_docsys/` and both `lib/tinymce`
  trees, the config lines listed above, and the `CLAUDE.md` build line; checked off the
  `todos.md` entry for this task. `pnpm run build`, `pnpm run typecheck`, `pnpm run test`,
  `pnpm run lint:check` and `pnpm exec playwright test` match the stage 1 baseline, and
  `dist/pathux.js` is byte-identical to the stage 2 build. Deviations from the inventory:
  - `tsconfig.json` keeps its two `servers/**` entries. The inventory listed them with the
    `simple_docsys` ones, but typescript-eslint's project service resolves `servers/http2.js`
    through them and reports a parsing error without them.
  - `simple_docsys` was a pnpm workspace package (`pnpm-workspace.yaml`), so that entry and the
    lockfile's importer section went too.
  - `example/package.json` declared `marked` and `diff`, with matching entries in its npm-era
    `example/package-lock.json`. They were the Electron and NW.js runtime copies for the
    widget's `require` calls, unused by anything else in `example/`, and are removed.
  - `buildtools/gen-datapaths.mjs` and `gen-themes.mjs` listed `marked`, `parse5` and `diff` as
    esbuild externals; those entries are gone. `pnpm-lock.yaml` still resolves `marked` and
    `diff` as transitive dependencies of tooling.
- **Stage 4 — delete `RichEditor`.** Waits on task 2's stage 7, which deprecates it. Its
  remaining users are the container's rich `textarea` builder
  (`core/utils/container_widgets.ts:346`) and the matching overload in `core/ui.ts:1327`; both
  switch to `rich-text-x` over the plain provider, after which `ui_richedit.ts` keeps
  `RichViewer` only.

No markdown library replaces `marked`. The design keeps markdown on the consumer's side: a
markdown-backed document is a provider over a mutable holder (see the design's "The model the
editor sees"), and a path.ux-shipped markdown provider would be its own plan. Nothing in the
library renders markdown at runtime once `simple_docsys` is gone; `markdown-toc` is a docs
tool and stays.

## Task 4 — the IME plan

Not started. Waits on task 2 being complete and exercised in `example/`.

- Write `documentation/plans/rich-text-ime.md` from the event sequences stage 5 recorded: replace composition refusal with a scoped
  parse-back of the composed block. The editor lets the browser mutate the block during
  composition, then on `compositionend` reads the block's DOM back through the position map
  into a `replaceBlockText` edit the provider applies, with marks carried over from the
  block's prior state by offset.
- Dead-key layouts come first, since they are the common case on desktop and a single
  composition of one or two characters is the simplest instance of the general problem.
- The plan must answer: how marks survive a composition that inserts in the middle of a marked
  run; how the pending-op queue interacts with a composition (nothing else may be committed
  while one is open); how the `MutationObserver` distinguishes composition mutations from
  missed input types; what Android does, where every keystroke is a composition; and what the
  reference provider's `replaceBlockText` does with atoms inside the composed block.
- Pressure test it the same way as task 1 before it becomes task 5.
