# Rich text

`rich-text-x` (`RichTextEditor`, `scripts/widgets/richtext/editor.ts`) edits a document it
never owns. A `DocumentProvider` renders each block and applies each edit; the editor turns
browser input into `EditOp`s, runs them through a toolstack as `DocEditOp`s, and re-renders
what the provider says changed. The design and its reasoning live in
[plans/rich-text-provider.md](plans/rich-text-provider.md); this page is the consumer's view.

Everything below is exported from the `pathux` barrel: `RichTextEditor`, `RichTextArea`,
`DocumentSession`, `RichTextContext`, `DocEditOp`, `PlainProvider`, `plainDocFromLines`,
`newBlockId`, `ATOM_CHAR`, `CARET_SLOT` and the interfaces. The `execCommand`-driven
`RichEditor` (`rich-text-editor-x`) is gone; `RichViewer` (`html-viewer-x`) stays.

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
- `undo()` and `redo()` run the session's toolstack, passing the editor's `RichTextContext`. Ctrl+Z, Ctrl+Y and Ctrl+Shift+Z are
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

## Binding a string property

The editor itself binds no datapath: binding a whole document to a string path would make
every keystroke a `DataPathSetOp`. `RichTextArea` (`rich-text-area-x`,
`scripts/widgets/richtext/textarea.ts`) is the bound form, and what `Container.textarea`
builds for a `StringProperty` with `RICH_TEXT_STRING` set (`setRichText(true)`) or an
explicit `isRichEdit`; a plain multi-line property still gets `TextArea`.

- The widget holds a `PlainDoc` and a `DocumentSession` over `PlainProvider` on the context's
  toolstack, and hosts one `rich-text-x` (`field.editor`, with `field.session`), exposed as
  `::part(editor)`.
- `value` is the block texts joined by newlines. A write to the path splits it into blocks and
  re-renders; marks live in the session for the widget's lifetime and are not written back.
- Every edit is the `DocEditOp` the editor pushes on the app's stack. Its result writes the
  path without an undo entry of its own, so undo restores the path through the same op; the
  session outlives the widget, so an undo after the field is rebuilt still lands.
- A `change` event (`detail: { value }`) fires on every write; `on_change` is the deprecated
  callback form.

## Composition (IME and dead keys)

The editor accepts composition. The browser mutates the composed block during the composition,
and at `compositionend` the editor reads the block's text back, diffs it against a snapshot
taken at `compositionstart`, and submits the difference as an ordinary `insertText` or
`deleteRange`. A CJK commit, a dead-key accent and a press-and-hold accent all land as one
edit; a collapsed insertion folds into the typing run in progress, so `café` on a dead-key
layout is one undo entry. Nothing new reaches the provider, and marks extend exactly as they
do for a keystroke at the same place.

During the composition the browser owns the composed block and the caret. A result that
arrives meanwhile (another editor over the session, an undo) applies to the document, but the
composed block's render, its removal and every caret write are held until `compositionend`;
other blocks render at once. [plans/rich-text-ime.md](plans/rich-text-ime.md) is the design.

The refusal path remains as the fallback, and the `refused` event with it. It fires with
`{ inputType: "insertCompositionText" }` only when the diff cannot attribute what the browser
did: a composition that landed text outside any block, joined two blocks, or replaced a range
away from the caret. The editor then re-renders the whole root and clamps the caret into the
document.

`playwright/richtext/composition.spec.ts` drives Chromium's IME over the Chrome DevTools
Protocol and records the event sequences at the top of the file. Firefox has no synthetic IME
path, so it is checked by hand.

### Manual steps

Install the input methods on Windows under Settings, Time & language, Language & region, by
adding a language and its keyboard:

- Japanese: the Microsoft IME that comes with the language pack.
- Chinese (Simplified): Microsoft Pinyin.
- Korean: Microsoft IME. Its 2-set layout puts ㅎ on `g`, ㅏ on `k` and ㄴ on `s`.
- English (United States): add the United States-International keyboard for dead keys, where
  `'` then `e` composes `é`. It sits under the language's keyboard list, not the language list.

Open the example app's Rich Text tab, then paste this into the browser console. It prints one
line per event on the first editor, in the format the Playwright recorder uses, so a manual run
and a CDP run read alike. The text it prints is the editable root's, read before the editor's
own handler runs. A keydown that arrives during a composition is stopped before the editor's
handler; the editor already ignores such a keydown, so this only keeps the recording clean.

```js
{
  const find = (root) => {
    const hit = root.querySelector('[data-testid="richtext-editor"]');
    if (hit) return hit;
    for (const el of root.querySelectorAll("*")) {
      const found = el.shadowRoot && find(el.shadowRoot);
      if (found) return found;
    }
  };
  const target = find(document).root;
  const textAt = new Set(["input", "compositionstart", "compositionend"]);
  const types = [
    "compositionstart",
    "compositionupdate",
    "compositionend",
    "beforeinput",
    "input",
    "keydown",
  ];
  for (const type of types) {
    target.parentNode.addEventListener(
      type,
      (e) => {
        const parts = [type];
        if (type === "keydown") parts.push(e.key);
        if ("inputType" in e) parts.push(e.inputType);
        if ("data" in e) parts.push(JSON.stringify(e.data));
        if (type === "keydown" || "inputType" in e)
          parts.push(e.isComposing ? "composing" : "not composing");
        if ("inputType" in e) parts.push(e.cancelable ? "cancelable" : "not cancelable");
        if (textAt.has(type)) parts.push("text=" + JSON.stringify(target.textContent));
        console.log(parts.join(" "));
        if (type === "keydown" && e.isComposing) e.stopPropagation();
      },
      true
    );
  }
}
```

Then, with the caret at the end of "Hello, world." in the first editor:

1. Switch to the Japanese IME, type `kan`, press Space to convert and Enter to commit. The
   committed text must land in the block as one undo entry, the caret must sit after it, and
   no `refused` event must fire.
2. Repeat with Pinyin (`ni hao`, Space).
3. Switch to Korean, in Hangul mode, and type `g`, `k`, `s`, `k`, then Space. The result must
   read 하나 in the block; each syllable is its own composition and both must land.
4. Switch to United States-International and type `'e`, then a plain `e`. Both accented and
   plain characters must land. On Windows the dead key never composes and arrives as a plain
   `insertText`; the accent lands the same way a keystroke does.
5. Start a Japanese composition (`kan`) and press Escape until the composed text is gone. The
   document must stay unchanged and no `refused` event must fire, since the browser restores
   the block's text before `compositionend`.

The recorded runs are in the tasklist's stage 5 note (plans/rich-text-provider-tasks.md).

### Android and macOS

Neither has been recorded. The steps, for whoever has the device:

- Android, Chrome, with Gboard: serve the example (`node serv.js 5050` from the repo root),
  open `chrome://inspect` on the desktop with the phone over USB, and paste the snippet into
  the inspected page's console. Then in the first editor: type a word and a space; type a word
  and press Backspace inside it before the space; tap into a word that is already committed
  and change a letter. What matters is whether the word stays in one composition until the
  space, whether Backspace arrives as a cancelable `beforeinput` inside the composition, and
  whether tapping into committed text re-opens a composition over it.
- macOS, Safari and Chrome: paste the snippet, then hold `e` until the accent popover shows
  and pick `é`. What matters is whether the accent arrives as a composition, as
  `insertReplacementText` over the base letter, or as a plain `insertText`.
