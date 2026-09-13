# Rich text editing over a document provider: tasks

Tasks for [`rich-text-provider.md`](rich-text-provider.md). Each stage is a commit, and each
stage's status is recorded here when it lands.

Status: task 1 done; task 2 not started.

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
- [Task 3 — remove TinyMCE from the repo](#task-3--remove-tinymce-from-the-repo)
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

Not started. Seven stages, in order; each is green on `pnpm run typecheck`, `pnpm run test` and
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

### Stage 2 — position mapping

- `scripts/widgets/richtext/positions.ts`: `toDocPos`, `fromDocPos`, and `mapThroughPending`
  (positions through a queue of unresolved `EditOp`s).
- Tests in `tests/richtext/positions.test.ts` (jsdom): blocks rendered by the plain provider,
  plus hand-built blocks with atoms, adjacent atoms, an empty block, an opaque block, and marks
  nested three elements deep. Round-trip every offset of every fixture both ways. Pending-op
  mapping for each op type, including a split that moves the mapped position into the new
  block.

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

### Stage 6 — clipboard and the toolbar

- `copy`, `cut`, `paste` on the editable root through the provider.
- Toolbar from `provider.marks()`, hidden by attribute, `editor.toggleMark(name)`.
- Playwright: copy a range and paste it into a second block; cut is one undo entry; paste of
  three lines makes three blocks with the pre-allocated ids.

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

## Task 3 — remove TinyMCE from the repo

Not started. Waits on task 2, because the docs browser's edit mode is TinyMCE's only consumer
and needs `rich-text-x` to replace it.

What is there today:

- `scripts/lib/tinymce/` and `example/lib/tinymce/`, 146 tracked files and 8.1 MB each. The
  `example/` copy is referenced by nothing.
- `scripts/docbrowser/docbrowser.ts` dynamic-imports `../lib/tinymce/tinymce.cjs` at module
  load (`:18`), gates `initDoc` on it (`:776`), and in edit mode runs a TinyMCE instance inside
  the docs iframe (`:826-870`) with an image-upload handler. The whole library is bundled into
  `dist/pathux_with_docbrowser.js` as a result.
- `scripts/global.d.ts:11-36` declares the minimal TinyMCE types and `Window.tinymce`
  (`:131`), and `Window._tinymce`.
- Exclusions that exist only because of it: `tsconfigDecl.json:30`, `tsconfigDeclTmp.json:37`,
  `eslint.config.js:26` and `:34`, `.claudeignore:3`.

Stages:

- **Stage 1 — decide what the docs browser's edit mode becomes.** The default is a port: an
  HTML-block provider (one block per top-level element of the docs page's `.contents` div,
  `renderBlock` returning that element's clone, edits applied to the element's text) and
  `rich-text-x` hosted in the iframe's document. The alternative is to drop edit mode from
  the docs browser and keep it a viewer, which is a one-line decision if nobody edits docs
  in-app any more. This is the one decision the tasklist cannot make; record it here when made.
- **Stage 2 — port or remove edit mode** per stage 1, including the image-upload path if the
  port is chosen (it becomes an atom the provider renders).
- **Stage 3 — delete.** Remove both `lib/tinymce` trees, the TinyMCE section of
  `scripts/global.d.ts`, the `TINYMCE_PATH` note at the top of `docbrowser.ts`, and the five
  exclusion entries. Rebuild and confirm `dist/pathux_with_docbrowser.js` no longer contains
  the `require_tinymce` chunk.
- **Stage 4 — delete `RichEditor`.** Task 2's stage 7 deprecates it. Its remaining users are
  the container's rich `textarea` builder (`core/utils/container_widgets.ts:346`) and the
  matching overload in `core/ui.ts:1327`; both switch to `rich-text-x` over the plain provider,
  after which `ui_richedit.ts` keeps `RichViewer` only.

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
