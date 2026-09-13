# Rich text editing over a document provider

Replaces the `execCommand`-driven `RichEditor` (`scripts/widgets/ui_richedit.ts`) with an editor
that renders a document through a provider, intercepts every edit through `beforeinput`, and
applies it to the document as a `ToolOp`. The browser's DOM is a render target with a position
index on it; the document is the source of truth.

Status: **pressure tested once and revised**. The test found ten problems, all accepted; see
[Findings](#findings). Tasks are in [`rich-text-provider-tasks.md`](rich-text-provider-tasks.md).

<!-- toc -->

- [Why](#why)
- [Scope](#scope)
- [The model the editor sees](#the-model-the-editor-sees)
- [Positions](#positions)
- [The provider interface](#the-provider-interface)
  - [Render contract](#render-contract)
  - [Edits](#edits)
  - [Change notifications](#change-notifications)
- [Position mapping](#position-mapping)
- [The editing loop](#the-editing-loop)
- [Undo](#undo)
  - [`DocEditOp`](#doceditop)
  - [Folding keystrokes](#folding-keystrokes)
  - [Which toolstack](#which-toolstack)
- [The editor's context](#the-editors-context)
- [Clipboard](#clipboard)
- [What the browser still does](#what-the-browser-still-does)
- [What deliberately does not change](#what-deliberately-does-not-change)
- [Risk](#risk)
- [Answers an implementer would otherwise guess at](#answers-an-implementer-would-otherwise-guess-at)
- [Findings](#findings)

<!-- tocstop -->

## Why

`RichEditor` calls `document.execCommand` for every formatting action and reads the result back
with `innerHTML`. `execCommand` is deprecated and unspecified: each browser wraps a selection in
different tags, chooses a different paragraph separator, and inserts wrapper spans on paste. The
widget cannot know what DOM it will get back, so it cannot map that DOM to a document model, and
it cannot put its edits on the toolstack because the browser owns the undo history.

A consumer with a document model of its own (a markdown file, a structured note, a script with
inline widgets) needs three things the current widget cannot give: a predictable DOM built from
the model, an edit stream it can apply to the model, and undo on the toolstack alongside every
other edit in the app.

## Scope

In scope for the first implementation:

- A `DocumentProvider<Doc>` interface and one reference provider over a plain block-and-marks
  model, used by the tests and by `example/`.
- A `RichTextEditor` widget that renders through the provider and edits through `beforeinput`.
- Position mapping between DOM `(node, offset)` pairs and document positions.
- `DocEditOp`, a foldable `ToolOp` carrying one edit, and the editor's choice of toolstack.
- Copy, cut and paste through the provider.

Out of scope for the first implementation:

- Composition. The editor refuses it rather than mis-handling it (see
  [What the browser still does](#what-the-browser-still-does)). This is a larger gap than "no
  CJK input": dead-key layouts (US-International, French, German, macOS press-and-hold) deliver
  accented characters through composition too, so the first implementation drops every é and ü
  typed on those layouts. Writing the plan that lifts this is the last task in the tasklist and
  waits on everything else working.
- Collaborative editing. The provider's change notifications are the seam it would use, but no
  conflict handling is designed here.
- Spellcheck and autocorrect. `spellcheck="false"` on the editable root for now.
- Tables, nested blocks, and any block structure beyond a flat sequence. A block is opaque to the
  editor; a provider that renders a table renders it as one atomic block the caret cannot enter.

## The model the editor sees

The editor knows three things about a document and nothing else.

- A document is an ordered sequence of **blocks**, each with a stable `BlockId`. A block is the
  unit of re-rendering and of position addressing: a paragraph, a heading, a list item, a code
  block, or an opaque custom element.
- A block has **flattened text**: its text runs concatenated in document order, with every
  **atom** (an inline node the caret cannot enter — an image, a mention chip, an embedded
  path.ux widget) counting as exactly one character, `"\uFFFC"`.
- A block may be **opaque**, in which case it has no flattened text, the caret cannot enter it,
  and it is selected or deleted as a unit.

Marks (bold, italic, links), block kinds, atom contents and everything else about the document
are the provider's business. The editor never inspects them; it asks the provider to render, and
it asks the provider to apply an edit.

`Doc` must be a mutable object, because `applyEdit` mutates it in place. A consumer whose
document is a string (a markdown file) wraps it in a holder that also carries a stable id per
block (index-derived ids cannot honour the ids the editor assigns) and, per block, a map between
source offsets and display offsets, since `**bold**` changes source length while `blockText`
must return display text. The wrapper is the consumer's, but the requirement is stated here so
the first markdown consumer does not discover it late.

## Positions

```ts
type BlockId = string;

interface DocPos {
  block: BlockId;
  offset: number; // index into blockText(block); 0..length inclusive
}

interface DocRange {
  anchor: DocPos;
  head: DocPos;
}
```

- `offset` indexes the flattened text, so marks never affect a position and the renderer may wrap
  text in whatever inline elements it likes.
- A position in an opaque block has `offset` 0 (before) or 1 (after). Its flattened text is one
  `"\uFFFC"`, so the same arithmetic applies.
- Ranges spanning blocks are ordered by the provider's `blocks()` order. Positions are not global
  integers, so an edit in one block never invalidates a position in another.
- The editor assigns ids to blocks it creates (a `splitBlock` produces one). The provider accepts
  the id it is given. This keeps `applyEdit` free of return-value plumbing for ids and keeps the
  editor's selection valid without a round trip.

## The provider interface

```ts
interface MarkInfo {
  name: string; // the string toggleMark carries
  label: string; // tooltip
  icon: number; // Icons.* index
}

interface ClipboardContent {
  blocks: readonly string[]; // plain text, one entry per block
  html?: string; // the whole selection, when the provider can produce it
}

interface DocumentProvider<Doc> {
  blocks(doc: Doc): readonly BlockId[];
  blockText(doc: Doc, block: BlockId): string;
  isOpaque(doc: Doc, block: BlockId): boolean;
  marks(): readonly MarkInfo[];

  renderBlock(doc: Doc, block: BlockId, ctx: IContextBase): HTMLElement;

  applyEdit(doc: Doc, op: EditOp): EditResult;
  inverse(doc: Doc, op: EditOp): EditOp; // computed before applyEdit(op) runs

  toClipboard(doc: Doc, range: DocRange): ClipboardContent;
  fromClipboard(data: DataTransfer): ClipboardContent | undefined;

  onChange(doc: Doc, listener: (change: DocChange) => void): () => void;
}
```

Every method is synchronous. A provider whose backing store is asynchronous (a worker, a
network) keeps a synchronous in-memory document and reconciles behind it, then reports what
changed through `onChange`. The design does not put an `await` between a keystroke and its
position.

### Render contract

`renderBlock` returns one element per block, built fresh each call. The editor replaces the
block's previous element wholesale; it never patches inside one.

- The root element carries `data-doc-block="<id>"`.
- Each atom carries `data-doc-atom` and `contenteditable="false"`. Its subtree contributes
  nothing to the position walk.
- An opaque block's root carries both `data-doc-block` and `contenteditable="false"`.
- Text is real text nodes. No `"\uFFFC"` appears in rendered text; no `"\u200B"` appears
  except where the next rule puts it.
- A zero-width space text node (`"\u200B"`) is emitted on each side of an atom, and one inside
  an empty block. The browser refuses to place a caret where there is no text node, so these
  give the caret somewhere to sit between two atoms, at a block edge beside an atom, or in an
  empty paragraph. The position walk counts them as length 0.
- An embedded path.ux widget is an atom. The `ctx` parameter is the editor's own context (see
  [The editor's context](#the-editors-context)), and a provider that builds a widget passes it
  through `UIBase.constructElement`.

### Edits

```ts
interface BlockSnapshot {
  id: BlockId;
  state: unknown; // provider-serialized; the editor never reads it
}

type EditOp =
  | { type: "insertText"; at: DocRange; text: string }
  | { type: "deleteRange"; range: DocRange }
  | { type: "splitBlock"; at: DocPos; newBlock: BlockId }
  | { type: "joinWithPrevious"; block: BlockId }
  | { type: "toggleMark"; range: DocRange; mark: string }
  | {
      type: "insertContent";
      at: DocRange;
      content: ClipboardContent;
      newBlocks: readonly BlockId[];
    }
  | {
      type: "replaceBlocks";
      after: BlockId | null; // null places the blocks at the document start
      blocks: readonly BlockSnapshot[];
      remove: readonly BlockId[];
    };

interface EditResult {
  dirtyBlocks: readonly BlockId[]; // re-render these; includes new ids
  removedBlocks: readonly BlockId[];
  selection: DocRange; // where the caret lands
}
```

- `applyEdit` mutates `doc` in place and returns what to re-render and where the selection
  goes. It does not return a new document.
- `insertText` and `insertContent` take a range rather than a position: a non-collapsed range is
  replaced. The `deleteRange` for that replacement is the provider's to perform, so the model's
  own invariants (a mark spanning the deleted text, a link the caret was inside) are the
  provider's decision.
- `deleteRange` across blocks joins them: the anchor's block keeps its text before the range and
  gains the head block's text after it, and every block between is removed. The result's
  `removedBlocks` lists them.
- `toggleMark` is the only formatting edit. `mark` names an entry of `marks()`; the editor's
  toolbar is built from that list, so the editor needs no list of its own.
- `insertContent` passes one pre-allocated id per entry of `content.blocks` beyond the first,
  which is why `ClipboardContent` is block-structured and the newline split happens in
  `fromClipboard` rather than in the provider's `applyEdit`. The first entry lands in the block
  at `at`.
- `replaceBlocks` is never produced by user input. It is the snapshot form of an inverse: it
  restores `blocks` in order after `after` and removes `remove`. Every provider handles it in
  `applyEdit`, because `undo` applies inverses through `applyEdit` and the reference provider's
  inverses are snapshots. Its own inverse is another `replaceBlocks`.
- `inverse(doc, op)` is called before `applyEdit(doc, op)` and returns the edit that would undo
  it. A provider may answer with a structural inverse (`deleteRange` for an `insertText`) or a
  snapshot (`replaceBlocks` over the blocks `op` touches). The reference provider uses
  snapshots, for the reason given under [Folding keystrokes](#folding-keystrokes).

### Change notifications

```ts
interface DocChange {
  dirtyBlocks: readonly BlockId[];
  removedBlocks: readonly BlockId[];
  selection?: DocRange; // when the change moves the caret, otherwise the editor keeps its own
}
```

`onChange` fires for changes the editor did not make through `applyEdit`: a load completing, a
remote update, a datapath write to a field the document renders, an undo running on a
toolstack the editor shares. The editor re-renders `dirtyBlocks`, drops `removedBlocks`,
re-derives its selection through the position map, clamping an offset that no longer exists to
the block's new length, and ends the current typing run (see
[Folding keystrokes](#folding-keystrokes)).

`applyEdit` does not fire `onChange` for its own caller. A provider that also notifies on
`applyEdit` is not wrong, and the editor tolerates it (a second render of a block it just
rendered), but it is wasted work.

## Position mapping

Both directions are a walk over one block's element with a `TreeWalker` showing text and
element nodes. Atoms count 1 and their subtrees are skipped; `"\u200B"` text nodes count 0.

`toDocPos(root, node, domOffset)`

- Finds the block element by `closest("[data-doc-block]")` from `node` (or its parent when
  `node` is a text node). A node outside every block maps to nothing and the caller ignores
  the event.
- If the block is opaque, returns offset 0 or 1 by whether the DOM position is at or after the
  root's last child.
- Walks the block in document order accumulating length until reaching `node`. If `node` is a
  text node the result is the accumulated length plus `domOffset`. If `node` is an element the
  `Selection` API has handed a child index, so the result is the accumulated length plus the
  flattened length of the first `domOffset` children. That covers a caret placed directly
  beside an atom and a caret in an empty block without special cases.

`fromDocPos(root, pos)`

- Finds the block element by id. If the block is opaque, returns the root with child offset 0
  or `childNodes.length`.
- Walks in document order. On a text node whose length covers the remaining offset, returns
  that node and the local offset. On an atom with remaining offset 0, returns the atom's parent
  and the atom's child index (the `"\u200B"` beside it will be reached first in practice). On
  an atom otherwise, subtracts 1 and skips its subtree.
- Runs off the end only when the offset exceeds the block's length, which the caller has
  clamped; if reached anyway, returns the end of the last text node.

Both functions are pure over the DOM and are unit-tested in jsdom against rendered blocks
including atoms, empty blocks, adjacent atoms and marks nested several elements deep.

## The editing loop

The editable root is a `div` with `contenteditable="true"` and `spellcheck="false"` inside
the widget's shadow root. Every block element is a direct child, in `blocks()` order.

```ts
root.addEventListener("beforeinput", (e) => {
  e.preventDefault(); // every input type is either handled here or refused
  const op = this.mapInput(e);
  if (op !== undefined) {
    void this.commit(op);
  }
});
```

`mapInput` is a table over `e.inputType`.

| `inputType`                                                                                                                                                  | `EditOp`                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `insertText`                                                                                                                                                 | `insertText` with `e.data`                                                   |
| `insertParagraph`, `insertLineBreak`                                                                                                                         | `splitBlock` with a fresh id                                                 |
| `deleteContentBackward`, `deleteContentForward`, `deleteWordBackward`, `deleteWordForward`, `deleteSoftLineBackward`, `deleteSoftLineForward`, `deleteByCut` | `deleteRange`, or `joinWithPrevious` when the range crosses a block boundary |
| `formatBold`, `formatItalic`, `formatUnderline`, `formatStrikeThrough`                                                                                       | `toggleMark` with the provider's name for that mark, if `marks()` has one    |
| `insertFromPaste`, `insertFromDrop`                                                                                                                          | `insertContent` via `fromClipboard`                                          |
| `historyUndo`, `historyRedo`                                                                                                                                 | not an `EditOp`; calls `toolstack.undo()`/`redo()` directly                  |
| `insertCompositionText`, `deleteCompositionText`, `insertReplacementText`, everything else                                                                   | refused                                                                      |

The range an entry works on comes from `e.getTargetRanges()` when it has one, and from
`document.getSelection()` otherwise. Browsers differ here and the editor cannot rely on
either alone:

- Chrome supplies target ranges for every type in the table. Firefox supplies them for the
  `delete*` types and returns an empty list for `insertText`, `insertParagraph` and
  `insertFromPaste`, so every insert type has the selection fallback.
- When a delete type arrives with no target range (Safari on some versions), the editor
  computes the range from the collapsed selection itself: one grapheme (`Intl.Segmenter`,
  granularity `"grapheme"`) for `deleteContent*`, one word (granularity `"word"`) for
  `deleteWord*`. `deleteSoftLine*` has no DOM-free answer and degrades to one grapheme.
- Backspace at the start of a block arrives as a non-collapsed target range from the end of
  the previous block to the caret, in Chrome and Firefox both. That is the "crosses a block
  boundary" case above and is what produces `joinWithPrevious`. A range crossing a boundary
  with text on both sides is a `deleteRange`, which joins as described under
  [Edits](#edits).

`commit(op)` runs the op through the toolstack, then applies the `EditResult` it produces:
replace each dirty block's element with a fresh `renderBlock`, remove each removed block's
element, and set the DOM selection from `result.selection` through `fromDocPos`. Selection
changes that come from the user (clicks, arrow keys, shift-arrows) are the browser's and need no
op; the editor reads `document.getSelection()` when it needs the current range, which is only
inside `mapInput` and for the toolbar's mark state.

The `EditResult` is applied when the toolstack has run the op, which is after at least one
`await`: `protect` (`toolsys/toolstack.ts:190`) awaits the previous holder unconditionally, so
nothing runs in the calling turn. Between `preventDefault()` and that point the DOM is
unchanged and further input can arrive. Two rules keep that window harmless:

- Positions in the next event are computed from the DOM, which still shows the state before the
  pending op. The editor therefore maps them through its pending ops before submitting: an
  `insertText` of `n` characters at offset `k` in block `b` shifts every later offset in `b`
  by `n`; a `deleteRange` shifts by its negative length; a `splitBlock` moves offsets past the
  split into the new block. `EditOp` positions are small enough that this is a dozen lines per
  op type and is unit-tested. The queue is drained as results arrive, in order. Order holds
  under folding because `foldFrom` runs inside the same protected region a push would, and it
  holds only while `canRun` is synchronous (`toolstack.ts:261-266`), so `DocEditOp` does not
  define an async `canRun`.
- The DOM is not touched optimistically. A fast provider (in-memory, which is every provider
  this plan ships) renders within the same macrotask and no lag is visible.

## Undo

### `DocEditOp`

One `ToolOp` class carries every `EditOp`. Its inputs are the serialized `EditOp` and the
inverse the provider computed for it, both `StringProperty` holding JSON with
`PropFlags.SAVE_LAST_VALUE` cleared. Without that clearing, `saveDefaultInputs`
(`toolstack.ts:457`) would write every unfolded keystroke into `SavedToolDefaults`.

- The document comes from `ctx.session` (see [The editor's context](#the-editors-context)),
  and only from there. `undo` runs with the op's `execCtx` (`toolstack.ts:552`), the locked
  snapshot of the context `exec` ran under, and `ContextLocker.lock` copies the live session
  reference into that snapshot, so the session is reachable from every phase without a
  registry. A registry on `ctx.state` was the first draft's answer and is wrong twice over:
  `state` is typed `any` on `ContextLike` (`controller_abstract.ts:61`) and belongs to the app,
  and no phase ever runs with a context other than the one `exec` was given.
- `exec` calls `provider.applyEdit(doc, op)` and fulfils the one-shot resolver the editor
  attached to the instance it submitted, with the `EditResult`. The resolver is a promise the
  editor awaits in `commit`; it is set on the instance before submission and cleared by the
  phase that fulfils it, so the op holds nothing across turns.
- `undoPre` does nothing beyond what the constructor stored: the inverse is computed by the
  editor, through `provider.inverse`, at submission time, before `applyEdit` has run.
- `undo` applies the stored inverse through `applyEdit` and delivers its `EditResult` to the
  session, which forwards it to every listener registered through `onChange`. No editor is
  awaiting at undo time, so this is the path by which an editor learns the document changed.
- `redo` re-runs `exec` with the same inputs, which is the default redo. The resolver is unset
  by then, so `exec` delivers through the session in that case too.
- Both `exec` and `undo` return without doing anything when `ctx.session.disposed` is true.
  Closing a document sets the flag; an undo walking past that document's ops on a shared
  stack is then a no-op rather than an error.

### Folding keystrokes

`DocEditOp` implements `FoldableToolOp` (`toolsys/toolop.ts:127`) and is submitted through
`foldOrExec` (`toolsys/toolstack.ts:329`), so a run of typing is one undo entry.

`foldOrExec` decides by `foldKey()` equality alone, inside the lock, and `foldFrom` returns
`void` with no way to decline. So contiguity must be decided by the editor before submission
and expressed through the key:

- `foldKey` is `"${sessionId}:${op.type}:${block}:${run}"`, where `run` is the editor's
  `pathUndoGen` (`ui_base.ts:198`). `UIBase.undoBreakPoint()` (`ui_base.ts:889`) increments it;
  it is a widget-side counter and not a toolstack feature, so it only ends a run for an op whose
  key carries it.
- The editor calls `undoBreakPoint()` whenever the next op is not contiguous with the run in
  progress (an insert not at the run's end, a backward delete not ending where the run
  starts), on blur, on a caret move away from the run's end, on a toolbar action, on every
  `onChange`, and after an undo or redo. A pause in typing does not end a run.
- Only `insertText` and `deleteRange` fold. Every other type includes a fresh `run` in its key
  so it always pushes.
- `foldFrom(next)` extends the head's `text` (or its range) with `next`'s and applies the
  delta through `applyEdit`, then fulfils `next`'s resolver with that result, since `next` is
  dropped by the stack and would otherwise leave `commit` waiting forever.
- A folded run has one inverse, stored when the run's first op was pushed. A structural inverse
  (`deleteRange` of one character) would cover the first keystroke only, and `foldFrom` would
  have to extend it the way `DataPathSetOp.extendUndo` does. A snapshot inverse over the run's
  block covers the whole run for free, because a run never leaves its block (`block` is in the
  key, and a `splitBlock` or `joinWithPrevious` always pushes). That is why the reference
  provider answers `inverse` with `replaceBlocks`, and a provider that answers structurally
  must be prepared for `foldFrom` to call `inverse` again and replace the stored one.

### Which toolstack

The editor takes an explicit toolstack, defaulting to `ctx.toolstack`, and exposes it through
its own context (next section) so that every widget built under the editor and every hotkey
that resolves through the editor's context reaches the same stack.

Both configurations use the same `DocEditOp`. The differences are in the consumer's
experience, and are documented so the consumer chooses knowingly.

Using the app's global toolstack:

- History is one interleaved sequence. Ctrl+Z with the editor focused undoes the last op on the
  stack, which may be a slider drag elsewhere in the app.
- Keystroke ops compete with every other op for `memLimit`. Folding is what makes this workable.
- Closing a document leaves its ops on the stack; the `disposed` flag makes them no-ops.

Using a per-document toolstack:

- Undo is per document. Each `DocumentSession` owns its `ToolStack`; a document open in two
  editors shares one.
- Every write to the document goes through its session's stack, including a `prop()`-bound
  field that renders the same data. The rule is enforced by construction: the document's UI is
  built under the editor's context, whose `toolstack` is the session's.
- An app-level op that reads the document (an export) is not ordered against the document's
  edits. Undoing one after the other can reach a state that never existed. Acceptable for text,
  and stated here so it is not rediscovered.
- Modal gestures stay on the global stack. `modal_running` is per stack but the modal event
  capture in `simple_events.ts` is global, so two stacks running modal ops at once would fight
  for it. The editor has no modal ops, so nothing needs enforcing beyond the statement.
- The screen's keymap must not also see Ctrl+Z. `Screen.on_keydown` gates hotkeys through
  `checkForTextBox` (`ui_textbox.ts:538`), which picks the element under the pointer and
  checks `document.activeElement` only for `HTMLInputElement` and `HTMLTextAreaElement`
  (`:554`). A focused editor with the pointer elsewhere therefore lets the screen keymap run,
  and on a per-document stack that undoes the global stack while `historyUndo` undoes the
  document's. The fix is one line in `checkForTextBox`: an active element whose
  `isContentEditable` is true counts as a text box. `modalKeyEvents: true` in `define()` stays,
  covering the pointer-over case as it does for `RichEditor` today.

## The editor's context

The datapath and tool APIs take `ctx` explicitly, so the editor's subtree gets a context of its
own rather than a getter patched onto the parent's. `RichTextContext` is a class:

```ts
class RichTextContext<Parent extends IContextBase> implements IContextBase {
  constructor(
    readonly parent: Parent,
    readonly session: DocumentSession
  ) {}

  get state() {
    return this.parent.state;
  }
  get api() {
    return this.parent.api;
  }
  get screen() {
    return this.parent.screen;
  }
  get toolstack() {
    return this.session.toolstack;
  }

  toLocked() {
    /* locks parent through toLockedImpl; session and toolstack stay live references */
  }
}
```

- `toLocked` is required. `_execTool` warns when a context cannot lock
  (`toolsys/toolstack.ts:405`) and undo relies on the locked snapshot. The implementation locks
  the parent through `toLockedImpl` and returns an object whose `session` and `toolstack` are
  the live ones, since a session is not state to snapshot.
- The editor pins its container's `ctx` the way `theme_editor.ts:1107` does, so a `setCtx`
  cascade from the screen does not replace it. The pin holds because the cascade goes through
  the `ctx` setter (`ui_base_props.ts:129`).

`DocumentSession` is the object an app creates per open document and hands to an editor:

```ts
class DocumentSession<Doc> {
  readonly id: string;
  readonly doc: Doc;
  readonly provider: DocumentProvider<Doc>;
  readonly toolstack: ToolStack;
  disposed: boolean;
  dispose(): void; // sets disposed, unsubscribes every listener
}
```

## Clipboard

- `copy` and `cut` are handled on the editable root. The editor maps the selection to a
  `DocRange`, asks `provider.toClipboard`, writes `text/plain` (the blocks joined by `\n`) and
  `text/html` when present to the event's `clipboardData`, and calls `preventDefault`. `cut`
  then commits a `deleteRange`.
- `paste` arrives as `beforeinput` with `insertFromPaste` and a `dataTransfer`. The editor calls
  `provider.fromClipboard`; an `undefined` result refuses the paste.
- The provider decides what HTML it accepts. The reference provider takes `text/plain` only and
  splits on newlines into `blocks`.

## What the browser still does

With every handled `inputType` prevented, the browser still owns:

- Caret and selection rendering, and their movement by mouse, keyboard and touch.
- Text layout, wrapping, and bidi.
- Focus, and the `selectionchange` event.
- Composition. `insertCompositionText` is not cancelable in any browser, so during a
  composition the browser mutates the DOM regardless of `preventDefault`. The first
  implementation handles this by refusing: on `compositionstart` the editor sets a `composing`
  flag and records the caret's `DocPos`; on `compositionend` it re-renders that block from the
  provider, restores the recorded position, clears the flag, and dispatches a `refused` event
  the consumer can surface. See [Scope](#scope) for what this costs on dead-key layouts.

A `MutationObserver` on the root is a development-mode assertion rather than a recovery path:
it logs any mutation the editor did not make, so a missed `inputType` shows up as a console
error during development instead of as silent divergence. Its records are delivered as a
microtask after the mutating task, so the editor cannot scope it by disconnecting around its
own renders. Instead the editor calls `takeRecords()` and discards the result after every render
it performs and at `compositionend`, and the callback ignores records while `composing` is set.

## What deliberately does not change

- `RichEditor` and `RichViewer` in `ui_richedit.ts` stay as they are until the new widget has a
  consumer. Removing them is a separate decision.
- `ToolStack` and `ToolOp` gain nothing. Folding, the lock and `IS_UNDO_ROOT` already exist, and
  the run counter is `UIBase.pathUndoGen`, which also exists.
- The `IContextBase` interface gains nothing. `RichTextContext` adds `session` on its own type.
- No datapath binding on the editor. A consumer that wants `datapath` on the widget writes a
  provider over the value at that path; binding the whole document to a string path would make
  every keystroke a `DataPathSetOp` on a string and defeat the design.
- Nothing in `scripts/path-controller/`. The one library change outside the new directory is the
  `isContentEditable` check in `checkForTextBox`.

## Risk

- **A browser emits an `inputType` the table lacks.** The refusal path handles it safely
  (nothing happens), and the development observer makes it visible. The risk is a feature that
  silently does nothing on one browser, not corruption.
- **The selection fallback disagrees with what the browser would have deleted.** Word
  boundaries from `Intl.Segmenter` and the browser's own can differ around punctuation. The
  editor prefers the target range whenever one is given, so the fallback is only reached on
  browsers that give none, and the tests run it on every delete type explicitly.
- **Pending-op position mapping has a bug.** The failure is an insertion one character off
  under fast typing with a slow toolstack. Mitigated by the unit tests on the mapper and by an
  integration test that submits ten `insertText` ops before the first resolves.
- **The `"\u200B"` nodes leak into a copy or a provider's parse.** `toClipboard` reads from
  the document, not the DOM, so copy is safe; a provider never reads the DOM in this plan.
- **Selection restore after a re-render lands in the wrong place.** Every `EditResult` carries
  the selection, so the editor never guesses. A provider bug here is a provider bug and the
  reference provider's tests pin the expected selection for every op.
- **Dead-key layouts are unusable until the IME plan lands.** Stated in Scope; the example page
  says so on screen, and the `refused` event exists so a consumer can too.

## Answers an implementer would otherwise guess at

- **Where does the widget live?** `scripts/widgets/richtext/` with `editor.ts` (the widget),
  `provider.ts` (interfaces and `EditOp`), `positions.ts` (the mapper), `ops.ts`
  (`DocEditOp`), `context.ts` (`RichTextContext`, `DocumentSession`), and
  `providers/plain.ts` (the reference provider). The barrel exports the widget, the
  interfaces, `DocumentSession` and the reference provider.
- **Tag name.** `rich-text-x`. `rich-text-editor-x` stays with the old widget.
- **Does the editor own the toolbar?** It builds one from `provider.marks()` above the editable
  root, using the same `iconbutton` pattern as today. A consumer that wants its own hides it
  with an attribute and drives `toggleMark` through `editor.toggleMark(name)`.
- **What is the caret's block when the selection spans blocks?** `head`'s block, for the
  toolbar's mark state and for composition refusal.
- **Block ids.** `crypto.randomUUID()` where available, a counter-plus-timestamp otherwise. Ids
  are opaque strings and are never parsed.
- **Does `renderBlock` run for every block on every change?** No. Only `dirtyBlocks`. Initial
  render walks `blocks()` once.
- **Is `blockText` cached?** By the provider, if it wants. The editor calls it inside position
  mapping and pending-op mapping only, never per frame.
- **Keyboard shortcuts for marks.** Ctrl+B/I/U arrive as `beforeinput` `formatBold` etc. from
  the browser and need no key handling. Strikethrough has no browser shortcut; the editor binds
  Ctrl+Shift+S on `keydown` as `RichEditor` does today.
- **Escape.** Blurs the editable root, which ends the run.
- **Tab.** Refused. A provider that wants indentation gets it through a future `EditOp`.
- **`define()`.** `modalKeyEvents: true` as `RichEditor` has. Theme keys reuse the `richtext`
  style class.

## Findings

From the fresh-context pressure test (task 1). All ten were accepted; the sections above are
already revised, and this list records what changed and why.

1. **Undo never runs with the app's context.** `_undo` uses `tool.execCtx`
   (`toolstack.ts:552`), the locked copy of the context `exec` ran under, and `state` is
   app-owned `any`. The `ctx.state` session registry was dropped; `ctx.session` plus a
   `disposed` flag replaces it.
2. **Contiguity cannot be checked in `foldFrom`'s caller.** `foldOrExec` decides by `foldKey`
   equality alone (`toolstack.ts:343-348`). The run counter now lives in the key. The same
   finding showed that `undoPre` runs once per push, so a structural inverse covers only the
   first keystroke of a run; the reference provider uses snapshot inverses and the contract
   says why.
3. **`undoBreakPoint` is a `UIBase` method, not a toolstack feature** (`ui_base.ts:889`). It
   increments `pathUndoGen`, which is exactly the run counter finding 2 needed, so the key
   carries it.
4. **`EditResult` delivery was contradictory** ("hands the result to the editor" versus "holds
   no pointer"). Replaced with a one-shot resolver on the submitted instance, fulfilled by
   `exec` or, on the fold path, by `foldFrom` on `next`'s behalf. `DocEditOp` must not define an
   async `canRun`, since that gives up the ordering the pending queue relies on.
5. **The `getTargetRanges` claim was inverted.** Firefox supplies ranges for `delete*` and none
   for the insert types; the fallback is now general, covers word and soft-line deletes, and
   `joinWithPrevious` triggers on a range crossing a block boundary rather than a collapsed one.
   `deleteRange` across blocks is now defined.
6. **Composition refusal drops dead-key input**, not only CJK. Stated in Scope and Risk; the IME
   plan is told to treat it first. The observer cannot be scoped by disconnecting, because
   records arrive as a microtask; it now uses `takeRecords()` and a `composing` flag, and the
   editor records a `DocPos` rather than a block.
7. **`modalKeyEvents` gates on the pointer, not focus** (`ui_textbox.ts:542`, `:554`). One-line
   `isContentEditable` check added to `checkForTextBox`.
8. **`ClipboardContent`, `MarkInfo`, `inverse`, `marks()` and `replaceBlocks` were referenced
   and never defined.** All defined; `ClipboardContent` is block-structured so the editor can
   pre-allocate ids.
9. **A string cannot be `Doc`.** The wrapper a markdown consumer needs is now a stated
   requirement.
10. **`SAVE_LAST_VALUE` is on by default**, so every unfolded keystroke would land in
    `SavedToolDefaults`. Cleared on both inputs.
