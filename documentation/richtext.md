# Rich text

`rich-text-x` (`RichTextEditor`, `scripts/widgets/richtext/editor.ts`) edits a document it
never owns. A `DocumentProvider` renders each block and applies each edit; the editor turns
browser input into `EditOp`s, runs them through a toolstack as `DocEditOp`s, and re-renders
what the provider says changed. The design and its reasoning live in
[plans/rich-text-provider.md](plans/rich-text-provider.md); this page is the consumer's view.

Everything below is exported from the `pathux` barrel: `RichTextEditor`, `DocumentSession`,
`RichTextContext`, `DocEditOp`, `PlainProvider`, `plainDocFromLines`, `newBlockId`,
`ATOM_CHAR`, `CARET_SLOT` and the interfaces. `RichEditor` (`rich-text-editor-x`) is deprecated
in favour of this widget.

## The model

- A document is a flat sequence of blocks. Each block has a stable id (`BlockId`, an opaque
  string) and a flattened text: its runs concatenated, every atom counting as one `ATOM_CHAR`.
- A position is `{ block, offset }` into that text; a range is `{ anchor, head }` and may run
  backwards or across blocks.
- Marks (bold, a link, anything the provider wants) are the provider's business. The editor
  only knows their names, labels and icons through `marks()`, and asks `activeMarks()` for the
  toolbar state.
- An atom is something the caret cannot enter: an embedded widget, an image. A block can be
  opaque as a whole (a table), and is then selected or deleted as a unit.

## Writing a provider

Implement `DocumentProvider<Doc>` from `scripts/widgets/richtext/provider.ts`. `Doc` is your
own document type, and it must be a mutable object: `applyEdit` mutates it in place. A
string-backed document (a markdown source, a text field) needs a holder, `{ text: string }` or
the like, since a string cannot be edited in place.

- `blocks(doc)`, `blockText(doc, block)`, `isOpaque(doc, block)`: the model above.
- `marks()`: the marks `toggleMark` may name, in toolbar order. `activeMarks(doc, range)` is
  optional and returns the marks the toolbar shows as on: those a `toggleMark` there would
  remove, or for a caret the marks typing there would extend.
- `renderBlock(doc, block, ctx)` returns a fresh element the editor places as a direct child of
  its editable root, replaced wholesale on every re-render. The contract:
  - the root carries `data-doc-block="<id>"`;
  - an atom carries `data-doc-atom` and `contenteditable="false"`, and its subtree counts for
    nothing in the position walk;
  - an opaque block's root carries `contenteditable="false"` as well;
  - text is real text nodes, with a `CARET_SLOT` (a zero-width space) on each side of an atom
    and one inside an empty block, so the caret has somewhere to sit;
  - a widget embedded as an atom is built with `UIBase.constructElement` under `ctx`, which is
    the editor's `RichTextContext`, so its toolstack is the document's.
- `applyEdit(doc, op)` applies one `EditOp` and returns an `EditResult`: `dirtyBlocks` to
  re-render (new ids included), `removedBlocks`, and the `selection` the caret lands on. The op
  types are `insertText`, `deleteRange`, `splitBlock`, `joinWithPrevious`, `toggleMark`,
  `insertContent` and `replaceBlocks`; `provider.ts` documents each. `insertText` and
  `insertContent` take a range and replace it when it is not collapsed. `deleteRange` across
  blocks joins the outer two. `replaceBlocks` is the snapshot form of an inverse and never comes
  from user input, but every provider must apply it.
- `inverse(doc, op)` is called before `applyEdit` and returns the edit that undoes `op`. For
  `insertText` and `deleteRange` it must also undo every later keystroke folded into the same
  typing run, so it has to restore the block rather than reverse the one edit. A
  `replaceBlocks` snapshot of the block does that, and is what the reference provider answers
  with for every op.
- `toClipboard(doc, range)` returns `{ blocks, html? }`, one string per block the range covers;
  `fromClipboard(data)` parses a `DataTransfer` into the same shape, or returns `undefined` to
  refuse a paste. The editor joins `blocks` with newlines for `text/plain`.
- `onChange(doc, listener)` reports changes made outside `applyEdit` (a load, a remote update,
  a write to a field the document renders) and returns the unsubscribe. A provider need not
  report its own `applyEdit`.

`PlainProvider` in `providers/plain.ts` is the reference: blocks of text with `from`/`to`
marks, rendered as `<p>` with `<b>`, `<i>`, `<u>` and `<s>`. `plainDocFromLines` builds one for
fixtures. `tests/richtext/plainProvider.test.ts` pins its behaviour and doubles as a
specification of what each op does to marks and the selection.

## Sessions and toolstacks

A `DocumentSession` is what an app creates per open document and hands to every editor showing
it: the document, its provider, the toolstack its edits run on, and the listeners that hear
about changes. `dispose()` marks the document closed; its ops on any stack become no-ops.

```ts
const session = new DocumentSession(doc, provider, new ToolStack());
const editor = UIBase.constructElement<RichTextEditor>("rich-text-x", ctx);
editor.session = session;
```

The toolstack is the session's choice, and the two configurations feel different:

- **A toolstack per document** gives per-document undo. Two editors over one session share it
  and show each other's edits. Ctrl+Z inside the editor undoes the document; the app's Edit
  menu does not reach it. Modal gestures stay on the app's stack.
- **The app's toolstack** interleaves document edits with everything else. Ctrl+Z with the
  editor focused undoes the last op on the stack, whichever it was, and keystroke ops compete
  with every other op for the memory limit; folding keeps that workable.

Either way every edit is a `DocEditOp` registered as `richtext.edit`, carrying the op and its
inverse as JSON. A run of typing on one block folds into one entry; anything else pushes.

The editor builds its subtree, and the widgets a provider embeds, under a `RichTextContext`
whose `toolstack` is the session's and whose `state`, `api` and `screen` are the parent
context's. `editor.richCtx` exposes it.

## The editor

- `session` sets or swaps the document. `select(range)` focuses the editor and places the
  selection; `selection()` reads it as document positions.
- `toggleMark(name)` toggles a mark over the selection. The toolbar built from `marks()` does
  the same and hides under a `no-toolbar` attribute.
- `undo()` and `redo()` run the session's toolstack. Ctrl+Z, Ctrl+Y and Ctrl+Shift+Z are
  handled on `keydown`; Ctrl+B, Ctrl+I and Ctrl+U arrive from the browser as formatting input
  and Ctrl+Shift+S toggles `strikethrough`. Escape blurs, and Tab is refused.
- Copy and cut write the selection through `toClipboard`; paste and drop read through
  `fromClipboard`.
- A `refused` event, `detail: { inputType }`, fires for every input the editor declined: an
  input type it has no mapping for, a paste the provider refused, and composition.
- `RichTextEditor.observeMutations` (a static, on by default) logs any change to the editable
  DOM the editor did not make, which is how a missed input type shows up during development.

The editor never patches the DOM optimistically. Every `beforeinput` is prevented and mapped to
an op; the DOM changes when the op's result comes back, which is after at least one `await` on
the toolstack. Positions read from the DOM in the meantime are mapped through the ops still
pending, so fast typing lands in order even when the stack is busy.

## Composition (IME and dead keys)

The first implementation refuses composition: on `compositionend` the editor re-renders the
block from the provider, puts the caret back where the composition started, and dispatches a
`refused` event with `{ inputType: "insertCompositionText" }`. Nothing typed through an IME or a
dead key reaches the document, which on a dead-key layout means every accented character.
[plans/rich-text-provider.md](plans/rich-text-provider.md) says why, and task 4 of its
tasklist is the plan that lifts it.

`playwright/richtext/composition.spec.ts` drives Chromium's IME over the Chrome DevTools
Protocol and records the event sequences at the top of the file. Firefox has no synthetic IME
path, so it is checked by hand.

### Manual steps

Install the input methods on Windows under Settings, Time & language, Language & region, by
adding a language and its keyboard:

- Japanese: the Microsoft IME that comes with the language pack.
- Chinese (Simplified): Microsoft Pinyin.
- Korean: Microsoft IME.
- English (United States): add the United States-International keyboard for dead keys, where
  `'` then `e` composes `é`.

Then, with the example app's Rich Text tab open in Firefox and the caret inside the editor:

1. Switch to the Japanese IME, type `kan`, press Space to convert and Enter to commit. The text
   must stay unchanged, the caret must stay put, and one `refused` event must fire; the
   example logs it to the console.
2. Repeat with Pinyin (`ni hao`, Space) and Korean (`han`).
3. Switch to United States-International and type `'e`. The same refusal must apply to the dead
   key, and a plain `e` must still land in the document.
4. Start a composition and press Escape. The document must stay unchanged and the caret stay put.
