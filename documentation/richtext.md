# Rich text

## Embedded widget views

Providers can place `ctx.editor.widget(descriptor)` inside their atom wrappers. An editor
can also set `widgetOptions.resolveNativeBlock(session, block, context)` to supply a view
for a native opaque block. Returning `undefined` retains ordinary provider rendering.
Native controls, media views, and future plugin views share the per-editor mount host.

`WidgetDescriptor` contains a session-stable `id`, an `implementation` token, an accessible
`label`, a caller-supplied immutable `value` snapshot, and `create(context)`. Changing the
implementation token disposes the old generation. `allowed: false` prevents construction;
`editable: false` prohibits view commands. The factory returns a `WidgetView` with an
`element`, optional `update(state)` and `focus(last)` methods, and `dispose()`. Factories
may return promises. IDs must be distinct within a session; each editor owns separate DOM.

The context supplies `signal`, `isCurrent()`, `command()`, and `registerDraft()`. Cancel
requests on abort and check the generation before publishing asynchronous results. Late
factory results are disposed automatically. Factories and services are trusted application
code; these interfaces do not sandbox executable plugins. Rendering must not write defaults
or change provider storage.

`refreshWidgets()` reconciles descriptors and holds changes during widget composition.
Call `invalidateWidgetPolicy()` when document context or render authorization changes. It
cancels mounted generations immediately, then resolves views again. Pending drafts remain
recoverable. Replacing `widgetOptions` also invalidates mounted generations.

Connected `Element.moveBefore()` preserves input focus, selection, and iframe playback in
the tested Chromium and Firefox versions. Other engines remount widgets in replaced blocks
and emit `widgetremount` on `editor.root`. Applications requiring uninterrupted embeds should
require `moveBefore`. WebKit, mobile keyboards, and physical IMEs have not been verified for
this host; automated composition coverage uses Chromium CDP.

The host recognizes composed-path input, clipboard, pointer, drop, and composition events.
Tab from prose enters controls; Tab at the last control exits to a document boundary, and
Shift+Tab reverses direction. Enter on the outer focus stop enters the widget. Escape returns
to the enclosing block boundary. Inner deletion belongs to the control; document selection
is required to delete the outer object. Closed-shadow controls should implement `focus(last)`
and their own internal Tab order.

### Commands and drafts

`context.command({ resolve, authorize })` runs synchronous, side-effect-free callbacks under
the shared history lock. `resolve()` locates the target by ID, checks its expected value or
revision, and returns an `EditOp`. Return `undefined` for a stale or deleted target.
`authorize()` adds host-specific checks to the generation, view, and session checks. Results
are `applied`, `refused`, or `failed`; refusals and failures add no history entry. Only the
resulting JSON edit and inverse remain in history, so replay invokes no resolver or renderer.

Inverse capture and mutation happen together at execution time. Failed edits restore the
provider's full block snapshot. Providers must supply complete snapshots and reliable
`replaceBlocks` restoration; this version takes a full rollback snapshot per edit. Widget
results can omit `selection` and set `preserveFocus: true` without fabricating a prose caret.

`session.setWriteAllowed(false)` prohibits commands and shared-stack undo, redo, and rerun
without moving the history cursor. `editor.readOnly` restricts that view; other views and
application history can remain authorized. Disposed sessions also refuse history operations.
Policy notifications use `origin: "policy"` without incrementing the document revision or
publishing a field value. Custom history engines must honor `ToolOp.historyPreflight` before
changing their cursor.

A draft controller registers a field `key`, `pending()`, a `version()` token, `prepare()`,
`committed()`, and `discard()`. `recover()` exposes authored input after detachment.
`prepare()` returns a ready command or an `unencodable`, `conflict`, or `refused` result.
Retain input until the command commits. Native input undo belongs to the control while a
draft is active; after acceptance the control can route undo to document history. Do not
create a second `DataPathSetOp` for the same change.

Await `session.prepareSave()` before saving or navigating. It waits behind queued history
work, detects competing drafts for the same field before either commits, and checks for
concurrent changes. Earlier successful draft commits remain undoable if another draft prevents
readiness. A ready result includes the committed revision; compare it with the serialized
snapshot's revision before acknowledging a save. Serialization remains a pure committed read.

`pendingDrafts` includes detached drafts, which refuse save until the application recovers
them with `recoverDraft(id)` or explicitly calls `discardDraft(id)`. Retain the session while
deciding. Keep recoverable input separately from subscriptions and requests that disposal
must release.

### Native front-matter forms

`nativeFormWidgets(options)` (`form_native.ts`, imported by path rather than from the
barrel) is a `widgetOptions` that mounts a `FormControl` over a document's front matter
block. `options.codec` reads the fence's YAML to JSON and patches values back into the
source; `options.select(values)` answers the `RegisteredForm` (a `FormSchema` and a
`FormPresentation`) for the document, `undefined` to keep the raw block, or throws a
message `onDiagnostic` receives. The form's binding is `nativeFormBinding`, whose draft is
keyed `frontmatter:<block>`.

`FormControl` draws one row per key of the schema's root object, in `presentation.order`
then schema order, and keeps its draft as encoded text per key: the string itself for a
string field, JSON for anything else. `presentation.fields[key].control` picks the row's
editor:

- `"text"` (the default) and `"json"` are a `textbox-x`; `"json"` decodes the text as JSON
  even for a string field.
- `"none"` draws no row. The key still passes through the draft unchanged, so it reaches
  the codec as the document holds it; another control's `also` may own it.
- A `FieldControlFactory` — `(host: FieldHost) => FieldControl` — draws its own editor.
  `FieldHost` carries the field's `name`, `node`, `meta` and the context widgets are built
  in. The control speaks the same encoded text: `read(key)` answers what it shows,
  `write(key, text)` shows a value and must be a no-op when the text is what it last read
  or wrote, because `FormControl` writes every control on every session change while
  nothing is pending; `undefined` in either direction means the key is omitted. The
  control calls the `oninput` `FormControl` sets on it with every change the author
  makes. `also` lists further keys the control encodes; each is routed to it and gets no
  row. A factory that throws, or whose `also` names a key the schema lacks or one drawn
  already, falls back to the text box and the status line says why.

`NativeFormOptions.view(parts)` builds the mounted view instead of the default
`new FormControl(...)`; `parts` is the block id, the selected form, the binding and the
context, and `formView(parts)` is the default for a host that only wants to keep the
instance. That is how a host recovers a closed form's answers: `session.recoverDraft(id)`
on a detached `frontmatter:` draft answers `{ base, edits }`, and
`form.restore(recovered)` plays them into the form that replaced it, answering `false` —
and changing nothing — when the form is locked or already holds answers, when the draft
was typed over different values than the form now shows, or when it names a key the form
does not draw.

The form's own stylesheet rides inside its element, every selector wrapped in `:where()`,
so a host rule on `.schema-form`, `.schema-form-row`, `.schema-form-label`,
`.schema-form-actions` or `.schema-form-status` wins on specificity alone. The text box's
width is set through the widget, not the stylesheet, because `textbox-x` copies its own
width onto its inner input.

### Media and bound fields

`renderMedia` still accepts an `HTMLElement` with its legacy rerender behavior. It may return
a descriptor for retention and disposal. The Markdown provider supplies the atom's runtime
ID; offsets are not identities. Default image controls use the same host. Runtime IDs survive
moves, split/join, snapshots, and undo, and are omitted from ordinary Markdown. This adds no
video renderer, iframe recognizer, embed fetching, or service API.

`RichTextArea` forwards `widgetOptions`, `pendingDrafts`, `prepareSave()`,
`invalidateWidgetPolicy()`, and `setWriteAllowed()`. Its `value` remains a pure committed read.
`useFormat(format)` accepts an instance-owned `RichTextFormat`; its provider factory can
capture one field's media callback and configuration without global registration. Resolve or
explicitly discard drafts before changing formats. Committed changes still publish through
one document undo entry.

`rich-text-x` (`RichTextEditor`, `scripts/widgets/richtext/editor.ts`) edits a document it
never owns. A `DocumentProvider` renders each block and applies each edit; the editor turns
browser input into `EditOp`s, runs them through a toolstack as `DocEditOp`s, and re-renders
what the provider says changed. The design and its reasoning live in
[plans/rich-text-provider.md](plans/rich-text-provider.md), with the markdown provider in
[plans/rich-text-markdown.md](plans/rich-text-markdown.md) and composition in
[plans/rich-text-ime.md](plans/rich-text-ime.md); this page is the consumer's view.

The [embedded-widget design](plans/rich-text-widgets.md) proposes shared hosting for native
table editors, host-supplied media views, and schema-driven form plugins. It describes future
work, with separate [forms and front-matter notes](plans/rich-text-widget-forms.md) and an
[implementation checklist](plans/rich-text-widget-tasks.md). The contracts below describe
the current implementation.

Everything below is exported from the `pathux` barrel: `RichTextEditor`, `RichTextArea`,
`DocumentSession`, `RichTextContext`, `DocEditOp`, `replaceContentsOp`, `PlainProvider`,
`plainDocFromLines`, `newBlockId`, `ATOM_CHAR`, `CARET_SLOT` and the interfaces. The helpers
in `providers/marks.ts` and `providers/toolbar.ts` are not: a provider imports them by path
(`path.ux/scripts/widgets/richtext/providers/toolbar`). The `execCommand`-driven
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
- `marks()`: the marks `toggleMark` and the editor's Ctrl+B, Ctrl+I, Ctrl+U and Ctrl+Shift+S
  may name; a name not listed is refused. `activeMarks(doc, range)` is optional and returns
  the marks a toolbar shows as on: those a `toggleMark` there would remove, or for a caret
  the marks typing there would extend.
- `headings(doc)` is optional and returns `{ block, level }` in document order, for a consumer
  building an outline; the editor builds none.
- `renderBlock(doc, block, ctx)` returns a fresh element the editor places as a direct child of
  its editable root, replaced wholesale on every re-render. `ctx` is a `ProviderContext`: the
  editor's `RichTextContext` with the `EditorBridge` under `ctx.editor` (see Provider bridge). The
  contract:
  - the root carries `data-doc-block="<id>"`;
  - an atom carries `data-doc-atom` and `contenteditable="false"`, and its subtree counts for
    nothing in the position walk;
  - an opaque block's root carries `contenteditable="false"` as well;
  - text is real text nodes, with a `CARET_SLOT` (a zero-width space) on each side of an atom
    and one inside an empty block, so the caret has somewhere to sit;
  - a widget embedded as an atom is built with `UIBase.constructElement` under `ctx`, so its
    toolstack is the document's and it reaches the editor through `ctx.editor`. The editor
    keeps that context on it: its `_forEachChildWidget` skips the editable root, so a
    `setCtx` cascade from the app never replaces it, and `renderAll` and each applied result
    drive the embedded widgets' `update()` themselves.
- `styles()` is optional and returns CSS the editor places in a `<style>` after its own,
  replaced whole whenever `session` is set or the theme updates. The root is in the editor's
  shadow DOM, so this is the only way a page-level rule reaches a block element.
- `applyEdit(doc, op)` applies one `EditOp` and returns an `EditResult`: `dirtyBlocks` to
  re-render (new ids included), `removedBlocks`, and the `selection` the caret lands on. The op
  types are `insertText`, `deleteRange`, `splitBlock`, `joinWithPrevious`, `toggleMark`,
  `insertContent`, `replaceBlocks` and `custom`; `provider.ts` documents each. `insertText` and
  `insertContent` take a range and replace it when it is not collapsed. `deleteRange` across
  blocks joins the outer two. `replaceBlocks` is the snapshot form of an inverse and never comes
  from user input, but every provider must apply it.
- `custom` is the provider's own op: `{ name, blocks, data, shifts? }`, where `data` is JSON
  (it is serialized on the toolstack), `blocks` names every block it may touch so the inverse
  can snapshot them, and `shifts` lists each `{ block, at, delta }` by which it moves text, so
  a keystroke pending behind it lands in the right place. A provider throws on a `name` it
  does not know; `PlainProvider` knows none. A custom op never folds into a typing run.
- `handleKey(doc, range, event)` is optional and runs on `keydown` before the editor's own
  handling, for every key but the undo and redo chords and never when read-only. An op it
  returns is submitted and the key is consumed, `beforeinput` included; `undefined` falls
  through to the editor, so Tab stays refused unless the provider takes it.
- `inverse(doc, op)` is called before `applyEdit` and returns the edit that undoes `op`. For
  `insertText` and `deleteRange` it must also undo every later keystroke folded into the same
  typing run, so it has to restore the block rather than reverse the one edit. A
  `replaceBlocks` snapshot of the block does that, and is what the reference provider answers
  with for every op.
- `snapshots(doc, blocks?)` returns the `BlockSnapshot`s a `replaceBlocks` restores, for the
  given blocks or the whole document; `inverse` and `replaceContentsOp` are built on it.
- `emitDocFile(doc)` returns the document as a `Blob` in its file format, for a Save button.
- `toClipboard(doc, range)` returns `{ blocks, html? }`, one string per block the range covers;
  `fromClipboard(data)` parses a `DataTransfer` into the same shape, or returns `undefined` to
  refuse a paste. The editor joins `blocks` with newlines for `text/plain`.
- `buildToolbar(row, ctx)` is optional and fills the editor's toolbar row, called with the
  editor's `ProviderContext` whenever `session` is set. Its widgets edit through
  `ctx.editor.dispatch`. It returns a `ToolbarSync`, `(doc, selection) => void`, which the
  editor calls on every selection change to light the buttons; per-editor state lives in that
  closure, since one provider serves every editor over a session. `providers/toolbar.ts`
  supplies `addMarkButtons(row, ctx, provider, marks?)`, one `IconCheck` per mark with a sync
  that reads `activeMarks`, `addToolButton(row, glyph, label, onPress)` for a plain glyph
  button, and `addSeparator(row)`; `providers/marks.ts` has the range arithmetic for flat
  `{ from, to, name }` marks. A provider without `buildToolbar` gets no toolbar.
- `onExternalChange(doc, listener)` is optional and reports changes made outside `applyEdit`
  (a remote update, a write to a field the document renders) and returns the unsubscribe. A
  provider never reports its own `applyEdit`. See Hearing about changes for when to use it
  rather than `session.dispatch`.

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
const editor = UIBase.constructElement<RichTextEditor<Ctx, PlainDoc>>("rich-text-x", ctx);
editor.session = session;
```

`RichTextEditor` and `DocumentSession` take the document type as a parameter and are
invariant in it (the toolbar sync is a function over the document), so name it on both.

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
context's. `editor.richCtx` exposes it; its `editor` is the bridge below.

### History engines

A client that navigates between documents builds the engine itself; these are the primitives.

- `session.dispatch(op, parentCtx, source?, run?)` runs one `EditOp` on the session's
  toolstack with no editor involved and resolves with the `EditResult`. `run` defaults to a
  fresh value, so two dispatches never fold into each other; pass an editor's run to join its
  typing. A document takes an op with no editor open, or from behind the current one.
- `replaceContentsOp(provider, doc, next)` builds the op that swaps the whole document for
  `next`, keeping `next`'s block ids. Its inverse snapshots the current blocks, so undoing a
  reload restores the edits it overwrote, ids included; it never folds and is one undo entry.
- `session.revision` counts every delivered change, folds included. Record it at load and at
  save to tell whether an external change conflicts with local edits; `toolstack.cur` cannot
  serve, since a typing run folds into the head entry without moving it.
- `editor.viewState` (get and set) is `{ selection?, scrollTop }`. The editable root is the
  scroller, so give the host a height; setting `session` renders from scratch and loses both,
  by design. Save it before navigating away, restore it after setting the session back.
  `editor.scrollToBlock(id)` scrolls a block into view.
- Undo lives in the session and `dispose()` is terminal. Per-document undo across navigation
  means keeping the session and its toolstack alive and swapping only `editor.session`;
  evicting a document is discarding its undo. Block ids are fresh per parse, so undo does not
  persist across restarts.
- A change the user must not be able to revert (an initial load, a remote update the client
  has accepted) goes through the provider's `onExternalChange`; a reload the user may undo
  goes through `dispatch` with `replaceContentsOp`.

### Provider bridge

Every widget a provider embeds and every toolbar item it builds gets the editor's context, and
`ctx.editor` on it is the `EditorBridge`: one per editor, so two editors over one session get
two. It is how a provider reaches the editor without holding a pointer to it.

- `dispatch(op)` ends the typing run and commits `op` through the session's toolstack,
  resolving after the result is applied so the fresh block element can be read; it resolves
  `undefined` when the editor is read-only.
- `readOnly`, `selection()`, `select(range)`, `blockElement(block)` and `root` read and drive
  the editor. `posFromPoint(x, y)` maps a viewport point to a document position, or
  `undefined` where the platform cannot say (WebKit).
- `linkClicked(link, event)` raises the editor's `linkclick` event and returns `false` when a
  listener prevented it.

## The editor

- `session` sets or swaps the document. `select(range)` focuses the editor and places the
  selection; `selection()` reads it as document positions. `getValue()` is the document.
- `toggleMark(name)` toggles a mark over the selection. The toolbar is the provider's, built
  by its `buildToolbar` whenever `session` is set, and hides under a `no-toolbar` attribute.
- `readOnly` (attribute `readonly`, reflected) is render-only mode, described below.
- `undo()` and `redo()` run the session's toolstack, passing the editor's `RichTextContext`. Ctrl+Z, Ctrl+Y and Ctrl+Shift+Z are
  handled on `keydown`; every other key is offered to the provider's `handleKey` first.
  Ctrl+B, Ctrl+I and Ctrl+U arrive from the browser as formatting input and Ctrl+Shift+S
  toggles `strikethrough`. Escape blurs, and Tab is refused unless the provider takes it.
- A `linkclick` event fires when a provider's link is clicked; see Link clicks below.
- Copy and cut write the selection through `toClipboard`; paste and drop read through
  `fromClipboard`.
- A `refused` event, `detail: { inputType }`, fires for every input the editor declined: an
  input type it has no mapping for, a paste the provider refused, Tab when the provider does
  not take it, and a composition whose result the editor could not attribute (see
  Composition below; an ordinary composition is accepted).
- `RichTextEditor.observeMutations` (a static, on by default) logs any change to the editable
  DOM the editor did not make, which is how a missed input type shows up during development.
- The editor's source is split by concern: `editor.ts` holds the widget and its state,
  `editor_input.ts` maps a `beforeinput` to ops, `dom_selection.ts` reads and writes the
  live selection as document positions, `editor_render.ts` renders and patches the root,
  `editor_style.ts` holds the stylesheet and theme keys, `positions.ts` the DOM-to-document
  walk and `composition.ts` the composition diff and snapshot.

## Render-only mode

`editor.readOnly` (attribute `readonly`, reflected) makes the editor a viewer of the session
it shows; `RichViewer` is not extended for this.

- The root's `contenteditable` goes false and nothing else changes: the DOM is not rebuilt,
  so the scroll position and the selection survive, text stays selectable and copy works.
- `beforeinput`, `keydown` (undo chords included), paste, drop and `handleKey` return without
  acting; `dispatch` resolves `undefined`, on the editor and on the bridge alike.
- The toolbar's widgets are disabled in place; a provider's embedded widgets read
  `ctx.editor.readOnly` on each interaction, so a mode switch needs no re-render (the markdown
  task box ignores its click, the image handle hides, a link click still raises `linkclick`).
- `readOnly` and `disabled` are the only writers of the root's `contenteditable`, combined
  into the one attribute, so a disable-then-enable cycle leaves a read-only editor read-only.
- `RichTextArea.readOnly` passes through to its hosted editor; the field's value still follows
  the path.

## Link clicks

A `CustomEvent("linkclick")`, `detail: LinkInfo` (`{ kind, target, text, range }`), cancelable
and non-bubbling, fires on the editor's host element when a provider's link is clicked. The
editor attaches no meaning to a link: it never navigates, opens a tab or resolves a target, in
either mode. The consumer listens on the element and resolves the target itself, by `kind`:
the markdown provider reports `url` for `[text](target)` and `wiki` for `[[target]]`.

Its one default, in edit mode only, is the link popup (`link-popup-x`, `openLinkPopup` in
`richtext/link_popup.ts`), which edits the mark's target; `preventDefault` suppresses it, and
render-only mode has no default at all. A plain click places the caret first, as in any editor,
and the popup opens on the same click. The popup applies its result as the provider's
`setLink` op through `setLinkOp`: Apply or Enter commits, Remove clears the link, Escape
closes. The example's Markdown tab shows the shape: it listens for `kind === "wiki"`, prevents
the default and shows the target in a status line, and leaves a url link to the popup.

## Hearing about changes

A change can be heard at three levels, one for each kind of owner.

- **The editor's `change` event**, for UI code that owns an editor. After applying any change
  to the session it shows, its own edits included, the editor dispatches
  `CustomEvent("change", { detail: { change, info, session } })` (`RichTextChangeDetail`) on
  its host element and calls `on_change?.(doc)`. It fires once per applied edit, not on blur
  as a form control's `change` does, and does not bubble: listen on the element.
- **`session.onChange(listener)`**, for anything that owns a document: an outline, a history
  engine, a save-on-change hook. The listener gets `(change, info)` with `info.origin` one of
  `edit`, `fold` (the op joined the typing run at the head of the stack), `undo`, `redo` or
  `external`, the `op` for every origin but `external`, and the `submitter` the op's source
  passed to `DocEditOp.result`. `session.revision` counts these.
- **`provider.onExternalChange`**, for provider authors only: how a change the session cannot
  see reaches it, delivered with `origin: "external"`. A provider never reports its own
  `applyEdit`.

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

- The widget holds a document and a `DocumentSession` over the format's provider on the
  context's toolstack, and hosts one `rich-text-x` (`field.editor`, with `field.session`),
  exposed as `::part(editor)`.
- A format is a `RichTextFormat` (`provider()`, `fromText`, `toText`) registered under a name
  with `RichTextArea.registerFormat` and read back with `RichTextArea.format(name)`. `plain`
  is registered by the module itself: `value` is the block texts joined by newlines, and marks
  live in the session for the widget's lifetime and are not written back. Importing
  `scripts/widgets/richtext/markdown.ts` registers `markdown`, so the parser only reaches an
  app that asks for it: `value` is the markdown source, and marks round-trip through it.
- `field.format` names the format. `Container.textarea` sets it from the property's
  `richTextFormat`, which `setRichText("markdown")` records (`setRichText(true)` is plain), or
  from an explicit `format` option; setting it later re-parses the value into a fresh session,
  and a name nothing has registered throws. A write to the path re-parses the field through
  `replaceContentsOp` as an external change, outside the stack, so the editor keeps its
  selection and the path is not written back normalized.
- Every edit is the `DocEditOp` the editor pushes on the app's stack. Its result writes the
  path without an undo entry of its own, so undo restores the path through the same op; the
  session outlives the widget, so an undo after the field is rebuilt still lands.
- A `change` event (`detail: { value }`) fires on every write; `on_change` is the deprecated
  callback form.

## Markdown

`MarkdownProvider` edits an `MdDoc`, the document `markdownDocFromText` parses and
`markdownText` serializes. All of it is reached through `scripts/widgets/richtext/markdown.ts`
(`path.ux/scripts/widgets/richtext/markdown`), never the barrel, because it bundles the mdast
chain; importing the module also registers the `markdown` format on `RichTextArea`. The
Markdown tab of the example app (`example/editors/properties/properties.ts`) shows it running:
an editor on its own toolstack with a Read-only toggle, a Save button over `emitDocFile`, an
outline built from `headings()` that selects a heading on click, a status line fed by
`linkclick`, and a bound field over a `setRichText("markdown")` property.
[markdown_syntax.md](markdown_syntax.md) is the syntax reference: what the parser accepts,
construct by construct, what each becomes in the model, what comes back out, and what is
dropped. Its samples are a test fixture, so it tracks the parser.

A host that runs documents outside a browser (a node test, an Electron main process) imports
`scripts/widgets/richtext/headless.ts` instead: `DocumentSession`, `ToolStack`, the `MdDoc`
model, `markdownDocFromText`, `markdownText`, and the source-retention helpers
`markdownSourceDoc` and `markdownSourceCommand`. Nothing in it reads the DOM at import time,
and `tests/richtext/headless.test.ts` runs in vitest's node environment to keep it so. The
provider a session needs is the host's own, since `MarkdownProvider` renders and stays with
the editor; a document containing HTML also needs a `DOMParser` on the global, which node
does not supply.

### The document

- `MdDoc` is `{ blocks: MdBlock[] }`. A block is its kind plus `id`, `text`, `marks` and
  `atoms`: `paragraph`, `heading` (`level`), `listItem` (`ordered`, `depth`, `task`,
  `checked`), `quote` (`depth`), `code` (`lang`, with newlines in `text`), and the opaque kinds
  `hr`, `table`, `raw` and `frontmatter`, each keeping its `source`. A text block parsed from
  HTML may carry `html` (`tag`, `style`, `attrs`), the element and the sanitized attributes
  the source gave it, which the serializer writes back as HTML.
- Marks are `{ from, to, name }` with `bold`, `italic`, `underline`, `strikethrough`, `code`,
  `link` (`kind`, `target`, `title`), `style` (an inline element markdown has no syntax for)
  and `break` (a hard line break over one `\n`; a bare `\n` is a soft one). Any mark parsed
  from HTML may carry `tag`, `style` and `attrs` from its element.
- An atom is an image, `{ offset, image: { src, alt, title?, width?, attrs? } }`, one
  `ATOM_CHAR` in the text. `mdBlock(id, kind, text)` builds an empty block; `wikilinkSource`
  is the `[[…]]` form of a target and its text.
- `markdownDocFromText(text, newId?)` understands GFM tables, task lists and strikethrough,
  YAML front matter, `[[target|text]]` wikilinks and a whitelist of inline and block HTML; ids
  are fresh per parse. `markdownText(doc)` writes fixed forms (`-` bullets, `*` emphasis and
  strong, fenced code, `---` rules, ATX headings) and falls back to inline or block HTML for
  what markdown cannot say (a wikilink, an underline, a sized image, a preserved element);
  `markdownTree` is the mdast it builds. `sanitizeAttrs`, `sanitizeStyle` and `safeUrl` are
  the HTML rules, shared with the renderer.

### The provider

- Paragraphs, headings, list items, quotes and fences are edited in place; the opaque kinds
  are one atom long, selected and deleted as a unit and never typed into.
- Enter in a list item makes an item of the same kind and depth (a task item an unchecked
  task); in an empty item or quote it exits the run as a paragraph; in a heading it makes a
  paragraph; on an empty last line of a fence it leaves the fence; before an opaque block it
  makes a paragraph, and at the start of front matter it is refused. Backspace at the start of
  an item, heading or quote first demotes it to a paragraph (a nested item drops a level), and
  joins only a paragraph; a join into an opaque block does nothing.
- `handleKey`: Tab and Shift+Tab on a list item change its depth; Enter inside a fence
  inserts a newline; Shift+Enter is a hard break in any text block.
- Typing shortcuts: a marker typed at the start of a paragraph, one character at a time,
  turns it into the block it names once the marker is complete: `#` to `######` and a space
  make a heading, `-`, `*` or `+` and a space a bulleted item, a number, `.` and a space a
  numbered item, `>` and a space a quote, and three backticks a fence. The marker goes and
  the rest of the paragraph stays. Ctrl+Z restores the paragraph, marker and all, since the
  shortcut lands inside the typing run. `MarkdownProviderOptions.shortcuts: false` turns them
  off; a marker inside other text, in another kind, or arriving as a longer insert is text.
- `markdownOps` builds the custom ops the toolbar, the inline editors and a consumer share:
  `setKind` (paragraph, heading level, list kind, quote, code; a fence splitting into lines
  takes the ids in `data`), `setDepth`, `setTask`, `setLink` (an empty target removes),
  `insertImage` (a new atom at an offset, refused into a fence), `setImage` (`width`,
  `alt`), `moveAtom` (across blocks, with `shifts`), `insertBreak` and `insertWikilink`
  (replaces a range with a wiki link to a target, shown as its text or the target). Each
  inverse snapshots the span between the op's first and last block.
- Wikilink completion is the app's: `MarkdownProviderOptions.onWikilinkStart` is called from
  `handleKey` as the second `[` of a `[[` is typed, with the block, the offset the caret will
  have once the key lands, and the event; the key still inserts. The app opens whatever
  completion it has and lands the pick through `insertWikilink` over the `[[` and the query
  typed after it. The example's Markdown tab offers the document's headings in a popup.
- The clipboard carries one markdown entry per block (an item with its marker and indent, a
  fence whole), so a paste re-parses into blocks; a paste into a fence takes the text verbatim,
  and a paste into an empty paragraph adopts the first block's kind. `text/html` from
  elsewhere (a web page, a word processor) is read through the parser's HTML rules instead,
  so headings, lists, emphasis and links arrive as blocks and marks; the provider's own copy
  marks its HTML and pastes as the markdown it wrote. `emitDocFile` is a `text/markdown` blob.
- `headings(doc)` lists `{ block, level }` in document order for an outline.
- `MarkdownProviderOptions.renderMedia(image, ctx)` supplies the element for an image atom,
  for an app whose media are not plain `<img>`s. `resolveSrc(src)` is the lighter hook: the
  default image widget checks the authored `src` with `safeUrl` and then loads what
  `resolveSrc` answers for it (`undefined` loads the text as written), so an app can serve a
  relative path from its own store without the path changing in the document.
- The provider's source is split by concern: `markdown_provider.ts` holds the protocol
  surface, `markdown_doc.ts` the block helpers its modules share, `markdown_edits.ts` the
  standard ops, `markdown_custom.ts` the custom ops, `markdown_ops.ts` the `markdownOps`
  builders, `markdown_clipboard.ts` the clipboard and `markdown_toolbar.ts` the toolbar row.

### Rendering and editing widgets

- `renderMarkdownBlock` renders each kind to its element (`h1`–`h6`, `p`, `div.md-li` with
  `--md-depth` and CSS counters for numbering, `div.md-quote`, `pre`, `hr`, `table`, and the
  opaque kinds as `contenteditable="false"` wrappers), and `markdownStyles()` is the CSS the
  provider hands the editor.
- The toolbar holds a block-kind dropdown (Paragraph, Heading 1–6, Quote, Code), the mark
  buttons, bulleted, numbered and task list toggles, and a Link button that opens the link
  popup over the selection.
- A task item renders a checkbox that dispatches `setTask`. An image renders as `md-image-x`:
  hovering shows an outline and a corner handle, dragging the handle resizes (a modal
  `ImageResizeOp`, committed as `setImage` on release, Escape restores) and dragging the image
  moves it (a modal `ImageMoveOp` with a ghost and a drop caret, committed as `moveAtom`; a
  target that refuses atoms draws the caret grey and the release does nothing). Under
  `readonly` the toolbar, the boxes and the handle are inert.
- Theme keys: `richtext` carries the block typography (`heading-font`, `code-font`,
  `quote-border-color`, `link-color`, …) and the `toolbar-*` keys; `mdimage` and `linkpopup` are the
  widgets' own classes. Run `pnpm run gen:themes --strict scripts/widgets/richtext/markdown.ts`
  to catalogue them, since the default entry is the barrel.

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

Android was recorded on Samsung Keyboard (see the tasklist's stage 5 note): a word is one
composition committed at the space, an in-word Backspace shrinks the composition rather than
sending a delete, and the composition may cover the token before the caret. The editor's
`compositionend` diff handles all of it, so composition works on Android with no code of its
own. Gboard specifically and macOS have not been recorded; the steps, for whoever has the
device:

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

## Native Markdown tables

Supported GFM tables mount `TableEditor` through the shared widget host. Cells show editable
inline Markdown source, including emphasis, strong, strikeout, code spans and inline links.
The table remains one opaque document block, with a stable identity and separate draft and
selection state in each view. Opening a table does not rewrite its source.

- Enter or Apply cells commits the draft. Tab commits and moves between cells, then reaches
  the table toolbar. Shift+Tab moves backward. Escape returns to the document and keeps the
  draft. Blur also keeps drafts; call `session.prepareSave()` before saving or navigating.
- Alt+arrows moves to adjacent cells. Alt+Shift+arrows and Shift+click extend a rectangular
  selection. Row zero is the header. Insert row below adds a body row; removing the header or
  final column is refused. Alignment applies to the selected column.
- Copy/cut uses native selected text when present; otherwise it copies the selected cells
  as TSV containing inline Markdown. Multiline/tabbed paste replaces a rectangle and must
  fit the existing table. Add rows or columns first when needed. One paste makes one undo
  entry, including any current local draft. Single-line text uses native input paste.
- While a cell has a draft, Ctrl/Cmd+Z stays with its native text undo. After commit, it undoes
  document history; Shift adds redo. Structural edits use complete source snapshots, so undo
  restores original spacing and all cells. Per-view read-only and session write authorization
  apply to these commands and shared application history.

Drafts conflict at table granularity. Two pending views of the same table must be resolved
before save, even if their edited cells differ. A stale draft remains visible and recoverable
until copied or discarded. Deletion or view disposal retains pending data through
`session.recoverDraft()`. Serialization reads only committed source. The example Markdown tab
provides a second view and committed-source display, and its Save button uses the draft barrier.

HTML tables, HTML/image cell content, and rows wider than their header retain their source
and static rendering. Missing body cells become empty cells on edit. Nested block content,
merged cells and formulas are unsupported. Leading/trailing cell padding is canonicalized
on edit, pipes are escaped, and newlines/tabs within a cell are refused. A table may contain
at most 10,000 cells and one million source characters. Unrecognized inline syntax remains
literal when GFM parses it as text; external reference definitions are outside this editor's
supported subset.

The optional Markdown entry point exports `TableEditor`, `TableModel`, `TableChange`,
`TableSnapshot`, `TableAdapter`, `changeTable`, `parseMarkdownTable`,
`serializeMarkdownTable`, and `tableCommand`. No table symbols enter the base pathux barrel.
A standalone host can supply its own `WidgetContext` and `TableAdapter`; the adapter encodes
a model into a guarded `DocumentCommand`, and the host delivers committed snapshots through
`update({value: snapshot, readOnly})`. Commands must notify views synchronously before their
promise settles. Draft registration and history routing use that host's session.

For a direct provider edit, use `markdownOps.table(blockId, expectedSource, change)`. For a
widget or delayed action, use `tableCommand(doc, blockId, expectedSource, nextModel)` through
`session.command()` so stale targets settle as refusals without history entries. The source
comparison is an optimistic concurrency check over the entire table.

Application-supplied block and inline plugins use the optional [plugin host](richtext_plugins.md), with
provider-owned records, per-document policy, scoped commands, and data-only history.
