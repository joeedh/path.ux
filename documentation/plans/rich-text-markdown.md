# Rich text: markdown documents and the provider bridge

Extends [rich-text-provider.md](rich-text-provider.md). That design left every question of
document structure to the provider and shipped `PlainProvider` as its only reference. This plan
adds the second provider, `MarkdownProvider`, and the protocol the first structured document
turns out to need: a toolbar the provider builds, inline editors (resizing and moving an
image, editing a link, ticking a task) that commit through the toolstack, a file export, a
render-only mode, and a link-click event the consumer resolves. The editor stays agnostic to
document structure, with one exception: it can ask for the headings, so a consumer can build
an outline.

Status: written and pressure tested (23 findings, all folded in; see Findings at the end).
Stage status is recorded under each stage as it lands.

<!-- toc -->

- [Goals](#goals)
- [Assumptions](#assumptions)
- [Protocol additions (`provider.ts`, `context.ts`, `editor.ts`)](#protocol-additions-providerts-contextts-editorts)
  - [`emitDocFile(doc): Blob` (required)](#emitdocfiledoc-blob-required)
  - [The `custom` edit op](#the-custom-edit-op)
  - [`handleKey?(doc, range, event): EditOp | undefined`](#handlekeydoc-range-event-editop--undefined)
  - [`styles?(): string`](#styles-string)
  - [`headings?(doc): readonly HeadingInfo[]`](#headingsdoc-readonly-headinginfo)
  - [`EditorBridge` on `RichTextContext`](#editorbridge-on-richtextcontext)
  - [`buildToolbar?(row, ctx): ToolbarSync | undefined`](#buildtoolbarrow-ctx-toolbarsync--undefined)
  - [Render-only mode](#render-only-mode)
  - [The `linkclick` event](#the-linkclick-event)
- [The markdown document](#the-markdown-document)
  - [Parse and serialize](#parse-and-serialize)
  - [HTML](#html)
  - [Sanitizing](#sanitizing)
  - [Media](#media)
  - [Rendering](#rendering)
  - [Edits by kind](#edits-by-kind)
  - [Clipboard](#clipboard)
- [Inline editors](#inline-editors)
- [Change notification](#change-notification)
- [History engines](#history-engines)
- [Theme](#theme)
- [Binding](#binding)
- [Editor changes, collected](#editor-changes-collected)
- [Verification over CDP](#verification-over-cdp)
- [Stages](#stages)
  - [Stage 1 — protocol](#stage-1--protocol)
  - [Stage 2 — model, parse, serialize](#stage-2--model-parse-serialize)
  - [Stage 3 — `MarkdownProvider`](#stage-3--markdownprovider)
  - [Stage 4 — toolbar and inline editors](#stage-4--toolbar-and-inline-editors)
  - [Stage 5 — binding, example, docs](#stage-5--binding-example-docs)
  - [Stage 6 — optional follow-ups](#stage-6--optional-follow-ups)
  - [Stage 7 — the syntax reference](#stage-7--the-syntax-reference)
- [Findings](#findings)
- [Decisions](#decisions)

<!-- tocstop -->

## Goals

- `MarkdownProvider` edits a markdown document WYSIWYG: headings, paragraphs, bulleted,
  numbered and task lists, block quotes, fenced code, thematic breaks, inline images that can
  be resized and moved, links, wikilinks, inline code, bold, italic, underline and
  strikethrough. Tables and front matter render read-only.
- The toolbar is the provider's. The editor hosts a row and nothing else; `PlainProvider`
  and `MarkdownProvider` each build their own from shared helpers.
- The provider protocol gains only generic seams. Nothing in `provider.ts`, `editor.ts` or
  `positions.ts` mentions markdown, a list, or an image.
- A render-only mode locks edits without rebuilding the DOM, so switching it on keeps the
  scroll position. Links stay clickable in that mode.
- A `linkclick` event carries the link's kind and target to the consumer. A wikilink such as
  `[[line: L7]]` in a visualnovel scene is a semantic reference the app resolves; the editor
  does not assume a link names a file or a URL.
- The editor learns one structural concept, the heading, through an optional provider method.
- Every document change (including one an inline editor makes) is a `DocEditOp` on the
  session's toolstack with a provider-computed inverse.
- Every widget this plan writes declares its theme keys in `define().theme`, and the visual
  work (toolbar, link popup, image handles, block styling, the example tab) goes through the
  `frontend-design` skill at the stages marked below.

## Assumptions

- The document is stored as a block list, parsed from markdown on load and serialized on
  demand. Round-trip normalizes formatting: setext headings become ATX, `_em_` becomes `*em*`,
  reference links become inline. A source-preserving editor is out of scope.
- Parsing and serializing use `mdast-util-from-markdown` / `mdast-util-to-markdown` with the
  GFM extensions (`micromark-extension-gfm`, `mdast-util-gfm`) for tables, task lists and
  strikethrough, and `micromark-extension-frontmatter` / `mdast-util-frontmatter` for the
  YAML block. They are ESM and handle escaping. `marked` was removed with the docs system
  and does not come back. They are the library's first runtime dependencies: `package.json`
  has no `dependencies` field today and `package_dist.json` lists only `nstructjs`, so both
  gain the packages, and `build_package_new.sh` carries them. `buildtools/esbuild.mjs` builds
  `dist/pathux.js` with `treeShaking: false`, so nothing markdown-specific may enter the
  `pathux.ts` barrel or every consumer bundles micromark: `MarkdownProvider` and its helpers
  live in `scripts/widgets/richtext/markdown.ts`, reached through the `./*` export as
  `path.ux/scripts/widgets/richtext/markdown`, and the serializer is configured explicitly
  (`bullet: "-"`, `emphasis: "*"`, `strong: "*"`, `fences: true`) so the forms this plan
  names are the ones emitted.
- HTML in the source is normalized into the block model rather than preserved: a tag maps to
  a block kind or a mark, its inline style and attributes ride along on the block or mark, and
  a block that carries any of them is emitted as HTML again. Markdown has no underline and no
  image size, so those two go through the same route as `<u>` and `<img width>`. The plan
  does not promise to preserve every element: `<pre>` comes back as a fence, `<b>` as `**`, a
  wrapper `<div>` around paragraphs disappears. The section HTML below has the rules.
- The HTML sub-parser is `DOMParser`. The test environment is happy-dom, so stage 2 stays
  DOM-free in the sense of needing no editor, not of needing no `DOMParser`; a headless
  consumer converting files supplies one.
- Wikilinks are `[[…]]` runs inside text. mdast parses them as text; the provider scans text
  runs for them after parsing and serializes them back as inline `html` nodes, which
  `mdast-util-to-markdown` emits verbatim (it would escape the `[` of a text node, and it has
  no option to disable that per run). The link's `kind` is `"wiki"` and its `target` is the
  text between the brackets, untrimmed; `[[page|alias]]` splits on the first `|` into target
  and display text. The provider does not interpret `key: value` inside the brackets; that is
  the consumer's.

## Protocol additions (`provider.ts`, `context.ts`, `editor.ts`)

Each addition is generic; `MarkdownProvider` is its first user and `PlainProvider` implements
the required ones.

### `emitDocFile(doc): Blob` (required)

The document serialized for saving. `Blob.type` carries the media type (`text/markdown`,
`text/plain`); the file name and extension are the consumer's. `PlainProvider` emits
`text/plain` with blocks joined by newlines. Loading stays the consumer's: it builds a `Doc`
through the provider's constructor helpers (`markdownDocFromText` for this plan).

### The `custom` edit op

```ts
| {
    type: "custom";
    name: string;
    /** A contiguous span in document order: every block from the first touched to the last. */
    blocks: readonly BlockId[];
    data: JsonValue;
    /** Length changes the pending-position mapper applies, one per block whose text length changes. */
    shifts?: readonly { block: BlockId; at: number; delta: number }[];
  }
```

- Applied and inverted by the provider like every other op; the editor never produces one and
  never reads `name` or `data`.
- `data` must survive `JSON.stringify`, since `DocEditOp` stores ops as strings.
- `blocks` is a contiguous span, because the inverse is a `replaceBlocks` snapshot and
  `replaceBlocks` restores its blocks as one run after `after` (`plain.ts:591-603` splices
  them together). An op that touches A and C with B between lists `[A, B, C]`, so the
  snapshot restores B in place too; listing `[A, C]` would reinsert them adjacent on undo.
- A `custom` op that creates blocks carries their ids in `data`, allocated by the caller with
  `newBlockId()`, never minted inside `applyEdit`: a redo re-runs `exec` with the same inputs
  and would mint different ids, and every later op replayed after it names ids that no longer
  exist. This is the same rule that has the editor pre-allocate `splitBlock`'s id.
- `shifts` is what `PendingMapper` in `positions.ts` applies for a `custom` op, since it cannot
  read `data`. An op that changes no text length omits it. `positions.ts` gains that one
  case and nothing else.
- `foldBlock` already returns `undefined` for anything but `insertText` and `deleteRange`
  (`ops.ts:15-22`), so a custom op pushes and ends the typing run with no change there.
- A provider that does not recognize `name` throws; the editor's `commit` already logs and
  drops a failed op. `PlainProvider.applyEdit` gets an explicit `custom` case that throws,
  which the widened union requires for its return type anyway.

### `handleKey?(doc, range, event): EditOp | undefined`

Called from `onKeyDown` before the editor's own handling, for every key except the undo and
redo chords, and never in render-only mode. A returned op is submitted and the event is
consumed, which also suppresses the `beforeinput` the key would have produced (a cancelled
`keydown` for Enter stops `insertParagraph` in Chromium and Firefox; the window keymap is a
bubbling listener, so the root sees Tab first). This is how Tab and Shift+Tab change a list
item's depth, how Enter inside a code fence inserts a newline instead of a block split, and
how Shift+Enter inserts a hard line break in a paragraph (see Line breaks). The editor's Tab
refusal stays as the fallback when the provider returns `undefined`.

### `styles?(): string`

CSS the editor places in a second `<style>` element after its own, replaced whole whenever
`session` is set or `setCSS` runs (`setCSS` re-runs on every theme update, so appending
would accumulate). The editor's root is in its shadow DOM, so a page stylesheet cannot reach
a provider's block elements; `::marker`, list indents and quote borders need this. The string is static, so it reads
colors and fonts through the CSS variables the editor sets on its root from its theme (see
Theme).

### `headings?(doc): readonly HeadingInfo[]`

```ts
interface HeadingInfo {
  block: BlockId;
  level: number;
}
```

In document order. A consumer building an outline calls it, reads titles through `blockText`,
recomputes on `session.onChange`, and navigates with `editor.select(range)` and the new
`editor.scrollToBlock(id)`. The editor itself only exposes it; it builds no outline.

### `EditorBridge` on `RichTextContext`

Every widget a provider embeds, and every toolbar item it builds, gets the editor's
`RichTextContext` as its `ctx`. The bridge hangs off it as `ctx.editor`, set by the editor
when it builds the context (one context per editor, so two editors over one session get two
bridges), and a provider reaches the editor through it without holding a pointer.

```ts
interface EditorBridge {
  /** Ends the typing run and commits `op` through the session's toolstack. `undefined` when read-only. */
  dispatch(op: EditOp): Promise<EditResult | undefined>;
  readonly readOnly: boolean;
  selection(): DocRange | undefined;
  select(range: DocRange): void;
  blockElement(block: BlockId): HTMLElement | undefined;
  /** The document position under a viewport point, for a drop caret; `undefined` where the platform cannot say. */
  posFromPoint(x: number, y: number): DocPos | undefined;
  /** The editable root, for positioning a popup. */
  readonly root: HTMLElement;
  /** Raises the editor's `linkclick` event; returns `false` when the consumer prevented it. */
  linkClicked(link: LinkInfo, event: MouseEvent): boolean;
}

interface LinkInfo {
  /** Provider-defined: `"url"`, `"wiki"`, whatever else the provider parses. */
  kind: string;
  target: string;
  text: string;
  range: DocRange;
}
```

- `dispatch` is `submit` made public, with `endRun` first. It resolves after `applyResult`, so
  a caller that dispatched a block re-render can read the fresh element. In render-only mode
  it resolves `undefined` without running anything.
- `posFromPoint` wraps `document.caretPositionFromPoint(x, y, { shadowRoots: [shadow] })`
  and maps through `toDocPos`; without `shadowRoots` the result is retargeted to the host
  element, which maps to nothing. WebKit's `caretRangeFromPoint` never pierces a shadow root,
  so there the method returns `undefined`, the move gesture shows no drop caret, and a drop
  is refused. It is what the image-move gesture uses for its drop caret.
- The mutation observer watches `childList`, `characterData` and `subtree` only
  (`editor.ts:185`), so a widget changing its own attributes or style during a drag is not
  logged and needs no escape hatch. A widget that replaces its own child nodes would be; none
  in this plan does.
- The `setCtx` cascade would otherwise erase `ctx.editor`: `_forEachChildWidget`
  (`ui_base_init.ts:230-256`) recurses through the editor's shadow root and every non-UIBase
  node under it, so a widget inside a block element would get the parent context, with no
  bridge and the app's toolstack. This is why the toolbar row pins its `ctx` with a getter
  (`editor.ts:1027-1031`). `RichTextEditor` overrides `_forEachChildWidget` to skip `root`,
  and `renderAll` / `applyResult` drive the embedded widgets' `update()` themselves, so a
  widget under a block keeps the `RichTextContext` it was constructed with.
- Popups use `ctx.screen.popup` as any widget does; the bridge adds nothing for them.
- Modal gestures spawn a `ToolOp` through `ctx.toolstack.execTool(ctx, op, event)` as the rule
  in CLAUDE.md requires; the toolstack is the session's, the op carries `UndoFlags.NO_UNDO`,
  and the commit on release is one `dispatch` of a `custom` op.
- `renderBlock`'s `ctx` parameter is retyped from `IContextBase` to `ProviderContext`, an
  interface in `provider.ts` declaring `editor: EditorBridge` over `IContextBase`, so
  `provider.ts` keeps importing nothing from the editor.

### `buildToolbar?(row, ctx): ToolbarSync | undefined`

The toolbar is rewritten: the editor no longer builds anything from `marks()`. It creates the
`RowFrame` with the `ctx` override it has today (`editor.ts:1026`), hands it to the provider,
and places it above the root.

- Called with the toolbar row and the editor's `ProviderContext` whenever `session` is set,
  as `buildToolbar` runs today (`editor.ts:210`), since a new session may bring a new
  provider; the old row is dropped. The provider adds whatever widgets it wants;
  `ctx.editor.dispatch` is how they edit.
- Returns a function the editor calls on every selection change, so the provider can light
  its buttons. Per-editor state lives in that closure, since one provider serves every editor
  over the session.
- `providers/toolbar.ts` holds the shared pieces: `addMarkButtons(row, ctx, marks)` builds
  one `IconCheck` per `MarkInfo` and returns a sync that reads `activeMarks`, and
  `addSeparator(row)`. `PlainProvider.buildToolbar` is one call to `addMarkButtons`.
  `toolbar.ts` is imported and never `export *`-ed, per the barrel rule (`pathux.ts`
  `export *`s each richtext module by name and there is no `richtext/index.ts`); a
  consumer's provider imports the helpers through the `./*` deep export.
- The editor keeps `toggleMark(name)` and the keyboard mappings (Ctrl+B, Ctrl+I, Ctrl+U,
  Ctrl+Shift+S) that resolve against `marks()`; a name the provider does not list is refused.
- The row is hidden under the `no-toolbar` attribute as today. In render-only mode it stays in
  place and its widgets are disabled, since removing it would move the content and lose the
  scroll position.
- Frontend-design skill: the row's spacing, grouping, active state and the dropdown are
  designed in stage 4, with the keys under Theme.

### Render-only mode

`editor.readOnly` (attribute `readonly`, reflected). Setting it:

- sets `contenteditable="false"` on the root and leaves the DOM alone, so the scroll position
  and the selection survive; text stays selectable and copy works;
- makes `onBeforeInput`, `onKeyDown` (undo chords included), paste, drop and `handleKey` return
  without acting, and `dispatch` resolve `undefined`;
- disables the toolbar's widgets in place (`disabled` on the `RowFrame` cascades to its
  children);
- is the only writer of the root's `contenteditable`. `RichTextArea.__updateDisable` writes
  it directly today (`textarea.ts:89-92`), so a disable-then-enable cycle would re-enable a
  read-only editor; it sets `editor.internalDisabled` instead, and the editor combines that
  with `readOnly` into the one attribute;
- re-renders nothing. A provider's embedded widgets read `ctx.editor.readOnly` on each
  interaction rather than at render time, so a mode switch needs no re-render: the image
  widget hides its handles through a `readonly` attribute the editor sets on the root that
  the provider's `styles()` can target, the checkbox ignores clicks, and a link click still
  raises `linkclick`.

`RichViewer` (`html-viewer-x`) is not extended; a read-only `rich-text-x` over a session is
the viewer.

### The `linkclick` event

Per the DOM-events direction in CLAUDE.md, a `CustomEvent("linkclick", { detail: LinkInfo,
cancelable: true })` dispatched on the editor's host element, non-bubbling like the editor's
`refused` and `ListBox`'s `change`; the consumer owns the element and listens on it.
The provider raises it through `ctx.editor.linkClicked` from the click listener its
`renderBlock` installs on a link. The editor attaches no meaning to a link: it never
navigates, opens a tab or resolves a target, in either mode. Its one default, in edit mode
only, is the link popup that edits the mark's target, and `preventDefault` suppresses that.
In render-only mode there is no default at all; a click that nobody listens for does
nothing. A plain click on a link in edit mode places the caret first, as in any editor; the
popup opens on the same click. A consumer such as visualnovel listens for `kind === "wiki"`
and resolves `[[line: L7]]` itself; a web app listens for `kind === "url"` and opens it.

## The markdown document

```ts
type MdKind =
  | { kind: "paragraph" }
  | { kind: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6 }
  | { kind: "listItem"; ordered: boolean; depth: number; task?: boolean; checked?: boolean }
  | { kind: "quote"; depth: number }
  | { kind: "code"; lang: string }
  | { kind: "hr" }
  | { kind: "table"; source: string }
  | { kind: "raw"; source: string }
  | { kind: "frontmatter"; source: string };

interface MdMark {
  from: number;
  to: number;
  name: "bold" | "italic" | "underline" | "strikethrough" | "code" | "link" | "style";
  /** `link` only. */
  kind?: string;
  target?: string;
  title?: string;
  /** Inline CSS from the source, on any mark; `style` marks exist only to carry it. */
  style?: Record<string, string>;
  attrs?: Record<string, string>;
}

interface MdAtom {
  offset: number;
  /** `attrs` holds the sanitized attributes of an `<img>` HTML form, for a consumer's own metadata. */
  image: {
    src: string;
    alt: string;
    title?: string;
    width?: number;
    attrs?: Record<string, string>;
  };
}

interface MdBlock extends MdKind {
  id: BlockId;
  text: string;
  marks: MdMark[];
  atoms: MdAtom[];
  /** Set when the source was HTML the kind alone does not reproduce; see HTML. */
  html?: MdHtml;
}

interface MdHtml {
  /** The element to emit and render, when it is not the kind's own; `span` for an inline paragraph. */
  tag?: string;
  style?: Record<string, string>;
  attrs?: Record<string, string>;
}

interface MdDoc {
  blocks: MdBlock[];
}
```

- Flat, as the editor requires. Nesting is a `depth` on list items and quotes; the parser
  flattens mdast's `list → listItem → list` tree and the serializer regroups consecutive
  items by depth.
- `text` is the display text; an image contributes one `ATOM_CHAR` at `atoms[i].offset`.
- A task item's checkbox is not in `text` at all; the block's `task` and `checked` flags are
  the record. It renders as an element with no children, which contributes 0 to the position
  walk (`positions.ts:56-70`, the same as `<br>`), so no offset in the block shifts and no
  op has to skip over it. Backspace at offset 0 reaches `joinWithPrevious`, whose demote rule
  turns the task into a plain item first, which matches the source edit `- [ ] x` to `- x`.
- Marks are flat ranges like `PlainMark`, and the `applyEdit` / `inverse` / `activeMarks`
  logic in `providers/plain.ts` is shared rather than copied: the range arithmetic moves into
  a `providers/marks.ts` module both providers import, extended to shift `atoms` the same way.
  `marks.ts` is imported and never `export *`-ed.
- `table`, `raw` and `frontmatter` are opaque and keep their source verbatim. Editable
  tables are deferred to a plan of their own. Front matter
  can only be the first block; a `frontmatter` block is never created by an edit. A `raw`
  block is a media or embed element the provider preserves without rendering (see Media);
  every other element the HTML rules cannot normalize is dropped, per the no-preservation
  assumption.

### Parse and serialize

- `markdownDocFromText(text): MdDoc` walks the mdast tree: each block node becomes one
  `MdBlock`, inline nodes flatten to `text` plus marks and atoms, nested lists and quotes
  carry their depth down, `html` nodes go through the table under HTML, and a post-pass over
  each block's text turns `[[…]]` runs into `link` marks with `kind: "wiki"`.
- `markdownText(doc): string` builds an mdast tree back (regrouping list runs and quote runs
  into nested nodes, emitting `html` nodes for wikilinks and for every block or mark the HTML
  rules say cannot be markdown) and hands it to `mdast-util-to-markdown`. `emitDocFile` wraps it in a `text/markdown` Blob.
- Overlapping marks that do not nest (`bold` from 0–6, `italic` from 3–9) are split at the
  segment edges the same way `renderBlock` splits them, so serialization and rendering agree.
- Round-trip tests: for a corpus of markdown fixtures including a visualnovel scene,
  `markdownText(markdownDocFromText(s))` is a fixed point after one pass, the visualnovel
  scene is a fixed point after zero passes (its markers and front matter come back byte for
  byte), and `markdownDocFromText` of the output equals the first parse block for block.

### HTML

mdast hands over raw HTML as `html` nodes, block-level or inline. A block-level node holds a
run of HTML up to the next blank line, which the provider parses with `DOMParser` and folds
into the block model through one table, used in both directions. A wrapper whose content
spans a blank line arrives as an opening `html` node, ordinary markdown nodes, and a closing
`html` node (`<div>`, paragraph, `</div>`); the provider pairs block-level open and close
nodes the same way it pairs inline ones and treats the markdown between as the wrapper's
children, so the wrapper's style copies onto them as for any nested wrapper. An unpaired
closing tag is dropped. An inline tag arrives as two nodes, the opening
tag and the closing tag, with ordinary markdown nodes between them; the provider pairs them
with a stack walk over the paragraph's inline nodes and turns each pair into a mark over the
text between. A tag that never closes (or closes out of order) is kept as literal text. The alternative
of resolving inline styles into marks by the CSS cascade (`font-weight: bold` becoming a
`bold` mark) is not attempted: a style is carried, not interpreted.

The table, `providers/markdown_html.ts`:

| element                                                                 | becomes                                                 | emitted back as                                   |
| ----------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------- |
| `p`, `div`                                                              | paragraph                                               | markdown, or `<p>` when styled                    |
| `span` at block level                                                   | paragraph with `html.tag: "span"`                       | `<span>`                                          |
| `h1`–`h6`                                                               | heading                                                 | `#`, or `<hN>` when styled                        |
| `blockquote`                                                            | quote; children flattened with depth + 1                | `>`                                               |
| `ul`, `ol`, `li`                                                        | listItem; nested lists add depth                        | `-` / `1.`                                        |
| `pre`, `pre > code`                                                     | code; `lang` from `class="language-…"`                  | a fence                                           |
| `hr`                                                                    | hr                                                      | `---`                                             |
| `table`                                                                 | opaque table, source verbatim                           | verbatim                                          |
| `img`                                                                   | atom; `width` kept                                      | `![]()`, or `<img>` when sized                    |
| `b`, `strong`                                                           | bold mark                                               | `**`                                              |
| `i`, `em`                                                               | italic mark                                             | `*`                                               |
| `u`                                                                     | underline mark                                          | `<u>`                                             |
| `s`, `del`, `strike`                                                    | strikethrough mark                                      | `~~`                                              |
| `code`                                                                  | code mark                                               | backticks                                         |
| `a`                                                                     | link mark, `kind: "url"`                                | `[]()`, or `<a>` when styled                      |
| `br`                                                                    | a hard line break: `\n` in the text                     | a backslash break, or `<br>` inside an HTML block |
| other allowed inline element                                            | `style` mark carrying tag, style and attrs              | the same tag                                      |
| other allowed block element                                             | paragraph with `html.tag`, style and attrs              | the same tag                                      |
| `video`, `audio`, `picture`, `iframe`, `object`, `embed` at block level | opaque `raw` block, source verbatim, never instantiated | verbatim                                          |
| element not on the list                                                 | dropped; its content is kept in place                   | nothing                                           |
| `script`, `style`, `form`, comments                                     | dropped entirely                                        | nothing                                           |

- The allowed elements are GitHub's sanitizer list, which is the working definition of
  "commonly used and rendered by most renderers": `h1`–`h6`, `p`, `div`, `span`, `br`, `hr`,
  `b`, `strong`, `i`, `em`, `u`, `s`, `strike`, `del`, `ins`, `code`, `pre`, `kbd`, `samp`,
  `var`, `tt`, `sup`, `sub`, `small`, `mark`, `abbr`, `cite`, `dfn`, `q`, `time`, `a`, `img`,
  `blockquote`, `ul`, `ol`, `li`, `dl`, `dt`, `dd`, `table` and its parts, `details`,
  `summary`, `figure`, `figcaption`, `center`, `wbr`. An allowed element with no row of its
  own rides on the generic tag-carrying block or mark, so `<kbd>` and `<details>` need no
  code each. The list is one array in `markdown_html.ts`; extending it is a one-line change.
- A `style` attribute on any element lands in `html.style` (block) or `mark.style` (inline)
  as a property record; the allowed attributes land in `attrs`. Both are filtered by the
  sanitizer below at parse time, since the render puts them on live elements.
- The reverse direction chooses the tag from the kind, then overrides it with `html.tag`, then
  decides the format: a block whose `html` is unset and whose marks carry no `style` or
  `attrs` is emitted as markdown syntax; any other block is emitted as one HTML block, its
  inline marks as tags too, because CommonMark does not parse markdown inside an HTML block.
  `<span>sssd</span>` therefore parses to a paragraph with `html.tag: "span"` and emits as
  `<span>sssd</span>`; `<p style="color: red">` parses to a paragraph with `html.style` and
  emits as `<p style="color: red">`. Strictly, CommonMark only withholds markdown parsing
  from a block opened by a block-level tag or by a tag alone on its line, so a `<span>`
  paragraph with text on the same line could keep markdown marks; the plan uses tags in every
  HTML block anyway, since that reads the same in every renderer and the distinction is easy
  to get wrong at the edges. Pandoc parses markdown inside HTML blocks by default and
  Python-Markdown and kramdown do on `markdown="1"`, but GitHub, markdown-it and micromark
  do not, and those are the targets.
- Nested block HTML is flattened: `<div><p>a</p><p>b</p></div>` becomes two paragraphs and the
  `div` is gone, unless the `div` carried style or attrs, in which case they are copied onto
  each child. A block element containing loose text and block children (`<div>a<p>b</p></div>`)
  makes a paragraph from the text and a block from each child.
- `renderMarkdownBlock` renders `html.tag` when set, applies `html.style` as the element's
  `style` attribute and `html.attrs` as attributes; a `style` mark renders its tag (or a
  `span`) with its style and attrs. `display: inline` on a block element the editor places as
  a direct child of the root is honoured as written, so two inline paragraphs flow together.
- Edits on a block keep its `html`; `splitBlock` copies it to the new block, `joinWithPrevious`
  keeps the earlier block's. `setKind` clears `html.tag` and keeps style and attrs.
- The toolbar offers nothing for `html`; it is preserved through edits and reachable only
  from the source.
- GitHub strips `style` and `class`, so a styled span renders unstyled there. The provider
  emits them regardless; a consumer that wants a GitHub-safe export strips them itself,
  from the `MdDoc` before `markdownText` or in a serializer of its own.
- Fixtures in stage 2 cover each row of the table, a styled paragraph, an inline styled span,
  a nested wrapper, a `<pre>` that comes back as a fence, and one fixture per sanitizer rule.

### Sanitizing

Nothing from the source, the clipboard or a `custom` op reaches a live element unfiltered.
`sanitizeAttrs(tag, attrs)` and `sanitizeStyle(text)` in `markdown_html.ts` run at parse time,
in `fromClipboard`, and inside `applyEdit` for `setLink` and for any op that writes `html`;
`renderMarkdownBlock` applies only what is in the model, so the model is the trust boundary.

- Attributes are sorted three ways. An attribute on the allowlist is kept: `id`, `class`,
  `title`, `lang`, `dir`, `align`, `width`, `height`, `open` (details), `href`, `target`,
  `rel` (a), `src`, `alt` (img), `colspan`, `rowspan` (table cells), `style`, `data-*` and
  `aria-*`. An attribute that is a standard HTML attribute but not on the allowlist is
  dropped; that is where every executable or URL-bearing one lives (`on*`, `srcdoc`,
  `formaction`, `action`, `srcset`, `ping`, `is`, `contenteditable`, `autofocus`,
  `xlink:href`), since an attribute only does something when the browser has a definition for
  it. An attribute that is not in the HTML vocabulary at all is custom and is kept as inert
  text. `target="_blank"` gets `rel="noopener"` added at render.
- The HTML vocabulary is one array of the global and element-specific attribute names in
  `markdown_html.ts`, with an `on*` pattern so an event handler newer than the list is still
  caught. Membership in it, not a prefix, is what tells a custom attribute from a dangerous
  one, so `<span vn-ref="c02">` survives as well as `<span data-vn-ref="c02">`, and a consumer
  reads either back from the mark's `attrs`. Values are text; the sanitizer never interprets
  them, and `renderMarkdownBlock` sets them on plain elements the browser has no reading for.
  The list is only as good as its last update, so it carries the attributes that act without
  appearing on older lists (`popover`, `popovertarget`, `commandfor`, `hidden`, `inert`,
  `tabindex`, `slot`, `part`), and the fixture corpus includes one attribute newer than the
  list so the next addition is a fixture change, not a discovery.
- The editor's and provider's own protocol attributes are reserved and dropped at parse
  time whatever the allowlist says: `data-doc-*` (a `data-doc-atom` from a file would count
  as one character in the walk while `blockText` counted its text, and a `data-doc-block` on
  an inner element would break `closest`), `data-md-*`, `data-link-*`, and the `md-*` class
  names the provider's `styles()` targets.
- `href` and `src` are accepted with the schemes `http`, `https`, `mailto`, `tel`, a relative
  path, or a `#fragment`; `src` also accepts `data:image/*`. Anything else, `javascript:` and
  `data:text/html` included, drops the attribute. A `setLink` with `kind: "url"` goes through
  the same check; a wikilink target is never a URL and is not checked.
- `style` is split by a small tokenizer of the provider's own (`;` outside quotes and
  parentheses, the first `:` in each declaration, names lower-cased), not by the browser's
  parser: happy-dom's `CSSStyleDeclaration` is a validating re-implementation that drops
  properties and values Chrome keeps, so a `cssText` round trip would make the fixtures
  describe happy-dom rather than the sanitizer. The declarations are then filtered to a
  property allowlist: `color`, `background-color`,
  `font-family`, `font-size`, `font-weight`, `font-style`, `text-decoration`, `text-align`,
  `vertical-align`, `line-height`, `letter-spacing`, `white-space`, `display`, `width`,
  `height`, `max-width`, `max-height`, `margin*`, `padding*`, `border*`, `border-radius`,
  `float`, `opacity`, `list-style*`. A value containing `url(`, `expression(`, `@`, a
  backslash or `<` drops the declaration whatever the property. `display` and `float` are
  allowed because the inline-paragraph case depends on `display`; `position` is not, so a
  styled block cannot leave its place in the flow.
- Tests assert each rule with an input that would be harmful if it got through: an `onclick`,
  a `javascript:` href, a `data:text/html` src, a `background: url(...)`, an `expression(`,
  a `position: fixed`, an `<iframe>`, a `<script>`, an `is=` and a `contenteditable`; and
  one input per allowed channel, a custom unprefixed attribute among them. The `<iframe>`
  case asserts that it lands as a `raw` block and that the rendered placeholder contains no
  `iframe` element.

### Media

Markdown has one media syntax, the image, and the plan adds no other. A consumer that wants
video, audio or an embedded player writes it as an image whose source names the media,
`![Trailer](trailer.mp4)` or `![](https://www.youtube.com/watch?v=…)`, and renders it itself:

- `MarkdownProvider` takes a `renderMedia?(image: MdAtom["image"], ctx: ProviderContext):
HTMLElement | undefined` option. The provider calls it for every image atom and wraps what
  comes back in `md-image-x`, so resize, move and the atom contract (`data-doc-atom`,
  `contenteditable="false"`, the caret slots) stay the provider's. `undefined` falls back to
  `<img>`. A consumer building a YouTube embed does so here, with whatever element it trusts.
  The hook decides from the image record alone; a consumer that needs more than the source
  writes the image as `<img src="…" data-kind="…">` and reads `image.attrs`, which the
  sanitizer keeps and the serializer emits back. The provider adds no media hint of its own.
- `renderBlock` is a public method and a subclass may override it for anything the hook does
  not reach; the hook exists so the common case needs no subclass.
- `<video>`, `<audio>`, `<picture>`, `<iframe>`, `<object>` and `<embed>` at block level are
  preserved as `raw` blocks: the source is kept verbatim, emitted verbatim, and rendered as a
  muted placeholder that shows the opening tag as text. The element is never created, which
  is what makes preserving an `<iframe>` safe. The block is opaque, so it is selected and
  deleted as a unit and nothing edits it. Inline occurrences inside a paragraph are dropped
  like any unlisted inline element.
- A consumer that wants a `raw` block rendered live overrides `renderBlock` for that kind and
  takes on the trust decision itself; the provider never does.

### Rendering

`renderMarkdownBlock(block, ctx)` is a function in `providers/markdown_render.ts`. One element
per block:

| kind        | element                                                | notes                               |
| ----------- | ------------------------------------------------------ | ----------------------------------- |
| paragraph   | `<p>`                                                  | inline runs                         |
| heading     | `<h1>`–`<h6>`                                          | inline runs                         |
| listItem    | `<div class="md-li">` with `display: list-item`        | `--md-depth`, `data-md-ordered`     |
| quote       | `<div class="md-quote">`                               | `--md-depth`                        |
| code        | `<pre>`                                                | text with newlines, no marks        |
| hr          | `<hr contenteditable="false">`                         | opaque, empty                       |
| table       | `<table contenteditable="false">`                      | opaque, rendered from `source`      |
| raw         | `<div class="md-raw" contenteditable="false">`         | opaque, placeholder showing the tag |
| frontmatter | `<div class="md-frontmatter" contenteditable="false">` | opaque, muted, source shown as text |

- Bullets and numbers are drawn by `display: list-item` and `::marker`, never by a DOM text
  node, since any text inside the block shifts the position walk. Numbering uses one named
  CSS counter per depth (`md-ol-0`, `md-ol-1`, …), not the built-in `list-item` counter,
  which every list item increments whatever its marker and which a nested run would shadow
  for the siblings after it. The resets come from structure alone, in `styles()`: every block
  that is not a list item resets every depth, every list item resets the depths below its
  own, and every bullet item resets its own depth (a bullet between numbered items starts a
  new list in markdown, so restarting is right). An ordered item therefore carries no index,
  no block records who is first, and no neighbour is ever dirtied for numbering, which
  matters because an undo delivers the provider's own `replaceBlocks` result and dirties only
  the restored blocks.
- Inline runs come from the shared segment walk in `marks.ts`: `<strong>`, `<em>`, `<u>`,
  `<s>`, `<code>`, `<a data-link-kind>`. A wikilink renders as an `<a>` with the display
  text and `data-link-kind="wiki"`, so it looks like a link and clicks like one. An image
  atom renders an `md-image-x` widget built with `UIBase.constructElement` under `ctx`,
  carrying `data-doc-atom` and `contenteditable="false"`, between two `CARET_SLOT`s. The task
  checkbox is an `<input type="checkbox" contenteditable="false">` with no `data-doc-atom`,
  placed before the text; an element with no children counts 0 in the walk, so the block's
  offsets are exactly its text's. A block whose text ends in `\n` gets a trailing `<br>`,
  which also counts 0, so the empty last line renders and can hold the caret.
- `styles()` returns the `.md-li`, `.md-quote`, `pre`, `.md-frontmatter`, `a` and `::marker`
  rules, and the `[readonly] md-image-x` rule that hides the handles.
- Frontend-design skill: stage 3 designs the block typography (heading scale, list indent,
  quote bar, code block, front matter chip) against the theme keys below.

### Edits by kind

The editor maps keys to the standard ops; the provider interprets them by kind.

- `splitBlock` in a list item makes a new item of the same `ordered` and `depth`, and in a
  task item a new unchecked task. In an empty list item it exits the list: the item is
  removed and a paragraph is created _as_ `newBlock` (`removedBlocks: [item]`,
  `dirtyBlocks: [newBlock]`), so the pre-allocated id is used. Leaving it unused is tolerated
  by `applyResult` but not by `PendingMapper.split` (`positions.ts:349-357`), which inserts
  the id into its order unconditionally and would route a keystroke mapped while the split
  is pending into a block that never exists. In a heading it makes a paragraph. In a quote it
  makes a quote of the same depth; an empty quote becomes a paragraph. Before an opaque block
  it makes a paragraph. A split at offset 0 of the front-matter block is refused, since front
  matter must stay first.
- `joinWithPrevious` on a list item, heading or quote at offset 0 first demotes the block to a
  paragraph (a depth > 0 item drops one level) and joins only when it is already a paragraph.
  This is the Backspace-at-start behaviour every markdown editor has. Joining into an opaque
  block is refused (the result dirties nothing).
- `handleKey`: Tab and Shift+Tab on a list item return `custom` `setDepth`. Enter inside a
  code block returns `insertText` with `"\n"`; Enter on an empty last line of a code block
  returns a `splitBlock` that the provider turns into a paragraph after the fence, dropping
  the empty line. Shift+Enter returns `insertText` with `"\n"` in a paragraph, heading, list
  item or quote as well, so it never reaches the editor's `insertLineBreak` mapping, which
  would split the block.
- Line breaks: a `\n` inside a paragraph's text is a hard break. It parses from mdast's
  `break` node (a backslash or two-space break) and from `<br>`, and it serializes as a
  backslash break in markdown or `<br>` inside an HTML block. Emitting a bare newline would
  be a soft break that re-parses as a space.
- `insertText` and `deleteRange` are the shared mark arithmetic; atoms shift like marks.
- `toggleMark` for `bold`, `italic`, `underline`, `strikethrough`, `code`; `link` is never
  toggled without a target and is set through `custom` `setLink`.
- `custom` ops: `setKind` (heading level, list kind, quote, code, paragraph, over a list of
  blocks), `setDepth`, `setTask` (toggle `checked`), `setLink` (`{ from, to, kind, target,
title }`; empty target removes), `setImage` (`{ offset, width }`), `moveAtom` (`{ from:
DocPos, to: DocPos }`, across blocks, with a `shifts` entry per block whose length
  changes). Each inverse is a `replaceBlocks` snapshot of the contiguous span in `blocks`, as
  the reference provider answers for every op. `setKind` to or from `code` over several
  blocks merges lines into one fence or splits a fence into one paragraph per line; the ids
  it needs come in `data`.
- Code blocks are one block whose `text` contains newlines. `positions.ts` counts a newline as
  one character and `<pre>` preserves it; the tests in stage 3 pin caret placement across a
  newline in Chromium and Firefox.

### Clipboard

- `ClipboardContent.blocks` is `readonly string[]` and `insertContent` pre-allocates one id
  per entry (`provider.ts:41-45`, `:67-73`), so an entry is the markdown source of one
  resulting block: a fence is one entry holding its newlines, a list item one entry with its
  marker and indent.
- `toClipboard` serializes each covered block to that form (a partial block through the same
  serializer over a sliced block) and the whole range to HTML through `renderMarkdownBlock`;
  the editor writes the entries joined by newlines as `text/plain`, which is valid markdown.
- `fromClipboard` parses `text/plain` as markdown and returns one entry per block it parsed
  to; `applyEdit(insertContent)` re-parses each entry into a block. `text/html` is ignored in
  this plan; a later stage can convert it.

## Inline editors

All four are widgets or listeners the provider installs in `renderBlock`, editing through
`ctx.editor.dispatch` and checking `ctx.editor.readOnly` first.

- **Task checkbox.** A `click` listener on the input dispatches `setTask`. The input is
  `contenteditable="false"` and childless, so the caret never enters it and it counts for
  nothing in the walk; the browser's own toggle is prevented and the re-render shows the new
  state.
- **Links.** The `<a>`'s click listener calls `ctx.editor.linkClicked`. The editor's default
  in edit mode is `link-popup-x`, a small widget opened through `ctx.screen.popup` at the link
  with a textbox for the target, the kind shown as a label and a Remove button (no Open
  button, since the editor does not know what a target means); apply dispatches `setLink` against the range captured when the popup opened (`LinkInfo.range`, or
  the toolbar's `ctx.editor.selection()` read before the popup takes focus), because focusing
  the textbox blurs the root and the live selection is gone by apply time. The popup is opened
  with the `"click"` close mode, since `screen.popup`'s default closes on pointer-leave after
  100 ms. The provider's toolbar Link button opens the same popup for the selection, creating
  the mark on apply. Frontend-design skill in
  stage 4.
- **Image resize.** `md-image-x` wraps the `<img>` and draws a corner handle on hover. Its
  pointerdown spawns `ImageResizeOp` (`is_modal`, `NO_UNDO`) on the session's toolstack; the op
  previews by setting the element's width (an attribute change, which the mutation observer
  does not watch), and on release dispatches `setImage`. Escape restores the previous width. The op clears its element
  pointer in `modalEnd`.
- **Image move.** Pointerdown on the image body (not the handle) spawns `ImageMoveOp`, also
  modal and `NO_UNDO`. During the drag it draws a drop caret at
  `ctx.editor.posFromPoint(x, y)` (a positioned element in the editor's shadow root, outside
  the editable root so the position walk never sees it) and a translucent copy of the image
  following the pointer; on release it dispatches `moveAtom` from the atom's position to the
  drop position, and Escape cancels. A drop onto an opaque block or inside a code block is
  refused and the caret shows as such. The native `dragstart` on the image is prevented so
  the browser's own drag does not compete.

## Change notification

Today a change can be heard in three places with unclear division: `provider.onChange` (by
contract only for changes made outside `applyEdit`, so `PlainProvider`'s listeners never hear
an edit), `session.onChange` (hears everything, with `source` typed `unknown`), and the
`on_change` the editor inherits from `UIBase` (never called). One rule replaces the three:
the session is the hub, the provider reports only what it alone can see, and the editor
reports what it shows.

- **Provider.** `onChange` is renamed `onExternalChange?(doc, listener)` and is optional. Its
  contract is unchanged: a mutation the session cannot see, such as an asynchronous store
  reconciling behind an in-memory document, or a write to a field the document renders. A
  provider never reports its own `applyEdit`. `PlainProvider.notifyChange` stays as its way to
  raise one. The session subscribes in its constructor as it does now.
- **Session.** `onChange(listener: DocChangeListener)` with
  `DocChangeListener = (change: DocChange, info: DocChangeInfo) => void` and
  `DocChangeInfo = { origin: "edit" | "fold" | "undo" | "redo" | "external"; op?: EditOp;
submitter?: object }`. `deliver(change, info)` is the only path to the listeners, bumps
  `revision`, and is what `DocEditOp.settle`, `undo`, `foldFrom` and the external hook call.
  The editor's "skip what I applied myself" test becomes `info.submitter === this`.
- **Editor.** After applying any delivered change to the session it shows, its own edits
  included, the editor dispatches `CustomEvent("change", { detail: { change, info, session } })`
  on its host element and calls `on_change?.(doc)`. The event does not bubble, like
  `ListBox`'s `change`, `RichTextArea`'s and the editor's own `refused`; a consumer owns the
  element and listens on it, and `RichTextArea`'s own `change` with `detail: { value }` is
  unaffected because the hosted editor's never leaves the editor. The `VALUE` generic becomes
  `Doc`, so `getValue()` returns the document and `on_change` is typed `(doc: Doc) => void`;
  the `SELF` parameter for theme typing is untouched. The event fires once per applied edit,
  not on blur as a form control's `change` does; the docs say so.
- `documentation/richtext.md` gets a section, "Hearing about changes", naming the three
  levels and who each is for: the editor event for UI code that owns an editor, the session
  listener for anything that owns a document (an outline, a history engine, a save-on-change
  hook), and `onExternalChange` for provider authors only.
- Tests (stage 1): an edit, an undo and a `replaceContentsOp` each produce one `change` on
  every editor over the session with the matching `origin`; `on_change` receives the doc;
  a `RichTextArea` consumer sees one `change` per edit with `detail.value`; a provider's
  `onExternalChange` reaches session listeners as `origin: "external"`.

## History engines

A client that navigates between documents (a web app on the HTML history API, visualnovel
with its own engine that also sees the file change under it from its agent, the user or git)
builds the engine itself; the plan supplies the primitives and states the lifetime rules.

- **`DocumentSession.dispatch(op, parentCtx, source?, run?)`** runs one `EditOp` on the
  session's toolstack with no editor involved. It computes the inverse through the provider,
  builds the `DocEditOp` under a `RichTextContext(parentCtx, session)` and resolves with the
  `EditResult`. `run` defaults to a fresh unique value, so two engine dispatches of
  `insertText` on one block never fold into each other (a fresh editor's `pathUndoGen` is
  `0` and `0` would fold). The editor keeps its own `commit`, because `commit` owns the
  pending queue, the composition bookkeeping and the run counter; only the op construction
  is shared with the session, and the bridge's `dispatch` goes through `commit` after
  `endRun`. A document can take an op with no editor open. So can a document sitting behind
  the current one in a history stack.
- **`provider.snapshots(doc, blocks?)`** (required) returns the `BlockSnapshot`s a
  `replaceBlocks` needs; providers already build them for inverses. With it,
  `replaceContentsOp(provider, doc, next)` in `context.ts` builds the op that swaps the
  whole document for `next` (`after: null`, every current id in `remove`); for markdown,
  `next` is `markdownDocFromText(text)`. Its inverse is the provider's snapshot of the current
  blocks, so undoing a reload restores the local edits the reload overwrote, ids included.
  The op never folds and lands as one undo entry, which is visualnovel's "undo the file
  reload".
- **Sessions keep resolving through `ctx.session`.** A draft of this plan added a registry
  keyed by `session.id`, on the belief that an undo on a shared app stack arrives with the
  focused editor's context and could apply to the wrong document. It cannot: `ToolStack.undo`
  takes no context and `_undo`, `_redo` and `_rerun` all run with `tool.execCtx`
  (`toolstack.ts:552`, `:576`, `:615`), the locked `RichTextContext` captured when the op
  ran, whose `session` is the op's own. An undo from the app's Edit menu works for the same
  reason. The finding in rich-text-provider.md that settled this stands, and a registry would
  have added an id-collision path through the caller-supplied `id`. The test below stays,
  since it documents the property.
- **`DocumentSession.revision`** counts every delivered change, folds included. A client
  records it at load and at save and compares to decide whether an external change conflicts
  with local edits. `toolstack.cur` cannot serve: a typing run folds into the head entry and
  the position does not move.
- **`editor.viewState`** (get and set) is `{ selection?: DocRange; scrollTop: number }`.
  The root becomes the scroller: it gets `overflow-y: auto` and the host's height comes from
  the consumer (`height` or `flex`), where today the root has `min-height` and no `overflow`
  (`editor.ts:154-160`) and `scrollTop` would always read 0. `scrollToBlock` scrolls that
  root. Setting `session` renders from scratch and loses both parts of the state, by design; a
  history engine saves it before navigating away and restores it after setting the session
  back.
- **Undo lives in the session and `dispose()` is terminal.** Per-document undo across
  navigation means keeping the session and its toolstack alive and swapping only
  `editor.session`; evicting a document from the history is discarding its undo. Undo does
  not persist across restarts: block ids are fresh per parse, so ops recorded against one
  parse do not apply to another. A replace op stays valid because the snapshots it restores
  carry their own ids.
- **`provider.onExternalChange` is for changes that must not be undoable**, an initial load or a
  remote update the client has decided the user cannot revert. A reload the user may undo
  goes through `dispatch` instead. `documentation/richtext.md` states the distinction.
- **Navigation itself is the client's.** A `linkclick` on a wikilink does not move the
  editor anywhere; the client's engine resolves the target, saves `viewState`, swaps the
  session and restores the target's state.
- Tests (stage 1): dispatch a `replaceContentsOp` on a session with two editors, both
  re-render and undo restores the text and the block ids; navigate an editor to a second
  session and back, `viewState` restored and the first session's undo still applies; a
  shared toolstack holding ops for two sessions undoes the background session's op against
  that session when the foreground editor's context is passed.

## Theme

`RichTextEditor.define().theme` grows from its two keys to cover the toolbar and the document
parts a provider's `styles()` needs. Every key becomes a `--richtext-<key>` variable on the
root, set in `setCSS`, so the static `styles()` string can use them.

- Toolbar: `toolbar-background`, `toolbar-border`, `toolbar-padding`, `toolbar-gap`,
  `toolbar-active-background` (the lit state of a mark button; `IconCheck` has its own
  highlight, which the toolbar overrides so the row reads as one control).
- Document: `link-color`, `link-underline` (boolean), `code-font` (`t.font`),
  `code-background`, `code-border-radius`, `quote-border-color`, `quote-text-color`,
  `marker-color`, `heading-font` (`t.font`, the family and weight; sizes scale from
  `DefaultText`), `hr-color`, `opaque-background` (front matter, raw blocks, tables),
  `selection-background`.
- Read-only: `readonly-background`, so a locked editor can read as a page rather than a form.

`md-image-x` declares `handle-color`, `handle-size`, `outline-color` (the hover ring) and
`drop-caret-color`. `link-popup-x` declares `background`, `border`, `padding` and reuses the
textbox's own keys. All three get `SELF` type parameters and are regenerated into the theme
catalog with `pnpm run gen:themes`. Every key lands with a default in the library's
`scripts/core/theme.ts` (the `richtext` class and two new classes), because `getDefault`
falls back to `DefaultTheme` and `gen:themes --strict` fails on a `define().theme` key
absent from it; `example/theme.ts` overrides what the example wants. A boolean key such as
`link-underline` is mapped to a CSS value in `setCSS` (`underline` or `none`) before it
becomes a variable.

## Binding

`RichTextArea` gains `format: "plain" | "markdown"`; `Container.textarea` sets it from a
`richTextFormat` on the `StringProperty` (`setRichText("markdown")`, with `true` meaning
plain). In markdown mode the path is written from `markdownText(doc)` on every result, and a
path write re-parses; marks now survive a rebuild, which the plain form cannot offer.
`readonly` passes through to the hosted editor as `editor.readOnly`, and the widget's
disabled state as `editor.internalDisabled`; the widget no longer touches `contenteditable`.

## Editor changes, collected

So the "agnostic" claim can be checked, the `editor.ts` changes are: the bridge (`dispatch`,
`readOnly`, `selection`, `select`, `blockElement`, `posFromPoint`, `root`, `linkClicked`);
`_forEachChildWidget` skipping the root and the embedded widgets updated from the render
paths; `handleKey` called from `onKeyDown`; the provider `<style>` element replaced in
`setCSS`; `buildToolbar` replacing the mark-button loop, and its sync called from
`selectionChanged`; `readOnly`, `internalDisabled` and their gates; `viewState` and the
root as scroller; the `linkclick` event and its default; `scrollToBlock`; the theme keys and
their CSS variables; the `change` event and `on_change`. `positions.ts` gains the `custom`
case of `PendingMapper.apply`, driven by `shifts`, and nothing else. `provider.ts` gains the
types above and renames `onChange`; `context.ts` gains `dispatch`, `revision`,
`DocChangeInfo` and `replaceContentsOp`; `ops.ts` is unchanged.

## Verification over CDP

Every stage with visible output is checked in a real Chromium shell, not only in happy-dom.
Three are available: Playwright's Chromium (`pnpm playwright`, the specs under `playwright/`),
Electron (`pnpm electron`) and NW.js (`pnpm nwjs`), the latter two driven over CDP with
`pnpm cdp` or `connectApp()` from `buildtools/cdp.mjs`.

- Playwright is the harness. Each stage's spec drives the example app's Markdown tab, asserts
  through the `EditorProbe` pattern in `playwright/richtext.spec.ts`, and writes screenshots
  to `playwright/screenshots/markdown-<case>.png` the way `basic.spec.ts` and
  `gallery.spec.ts` do. The screenshots are committed and reviewed by eye at the end of each
  stage: the agent opens each one and checks it against the stage's list below before
  marking the stage done. The stages that use the `frontend-design` skill iterate on the
  screenshot, not on the CSS in the abstract.
- Electron is the runtime check. After the Playwright pass, `pnpm electron` and
  `pnpm cdp screenshot` capture the same tab in the app shell the consumers run, and the
  capture is compared by eye with the Playwright one. NW.js is optional and used only when
  Electron and Playwright disagree, to see which one is odd.
- A screenshot is evidence, not an assertion: the specs assert document state and DOM
  structure, and the screenshot shows the rendering those assertions cannot reach (marker
  placement, indent, the drop caret, the handle).

## Stages

Each stage is a commit and records its status here when it lands.

### Stage 1 — protocol

- `custom` op with `shifts`, `emitDocFile`, `snapshots`, `handleKey`, `styles`, `headings`,
  `HeadingInfo`, `ProviderContext`, `EditorBridge`, `LinkInfo`, `buildToolbar`, `ToolbarSync`
  in `provider.ts`; `replaceContentsOp` in `context.ts`; the `custom` case in
  `PendingMapper.apply`.
- Bridge implementation in `editor.ts`; `_forEachChildWidget` override; `RichTextContext.editor`;
  `readOnly` and `internalDisabled`; `viewState` and the root as scroller; the `linkclick`
  event; `scrollToBlock`; the toolbar rewrite with `providers/toolbar.ts`; `RichTextArea`
  routed through `readOnly` / `internalDisabled`.
- `DocumentSession.dispatch` with `run` and `revision`; `DocChangeInfo` and the typed
  `deliver`; the editor's `change` event and `on_change`; `onExternalChange` on the provider.
- `PlainProvider.emitDocFile`, `snapshots` and `buildToolbar`; `marks.ts` extracted from `plain.ts` with
  no behaviour change (`plainProvider.test.ts` stays green; the barrel key diff is unchanged
  except for the names this plan adds on purpose).
- Tests: a custom op round-trips through `DocEditOp` and undo, including one whose span
  covers an untouched middle block and one with `shifts` while a keystroke is pending;
  `handleKey` consumes a key and suppresses its `beforeinput`; `buildToolbar` runs per
  session set and its sync fires on selection change; a widget embedded under a block keeps
  `ctx.editor` after a `setCtx` cascade; `readOnly` refuses every input path and preserves a
  non-zero `scrollTop`; `linkclick` reaches a listener on the
  host element and `preventDefault` suppresses the default; the three history-engine cases
  under History engines; the change-notification cases under Change notification.

Status: done. Everything above landed as listed; `tests/richtext/editor.test.ts` holds the
editor-level tests and the readOnly scroll check sits in `playwright/richtext.spec.ts`.
Deviations, each with its reason:

- `ops.ts` changed as well: the typed `deliver` needs `DocEditOp` to pass `origin`, `op` and
  `submitter`, so `settle`, `exec`, `undo` and `foldFrom` do; `run` is `number | string` so
  `dispatch` can mint a run that no editor's counter ever equals.
- `ToolbarSync<Doc>` is `(doc, selection) => void` and `addMarkButtons` takes the provider:
  `ProviderContext` carries the bridge but not the session, so the sync cannot reach the
  document or `activeMarks` on its own. That makes `RichTextEditor` and `DocumentSession`
  invariant in `Doc`, so the example names `PlainDoc` on both.
- `RichTextContext` takes the bridge as an optional third constructor argument; the
  session's own `dispatch` builds a context with none.
- The barrel gains the type-only names the listed ones are made of: `CustomShift`,
  `JsonValue`, `DocChangeOrigin` and `RichTextChangeDetail`. `tests/fixtures/barrel-surface.json`
  records the new surface.
- `getValue` is an arrow property, since `UIBase` declares it as one.
- The toolbar tint is a `--richtext-icon-tint` variable set on the host in `setCSS`, which
  `addMarkButtons` reads, so the editor tints buttons it did not build.
- `_forEachChildWidget` skips the root, as planned, and the editor drives embedded widgets'
  `update()` from `update()` as well, so a theme or ctx change still reaches them.

### Stage 2 — model, parse, serialize

- `providers/markdown_model.ts`, `markdown_parse.ts`, `markdown_serialize.ts`, all reached
  through `richtext/markdown.ts` and kept out of the `pathux.ts` barrel; the mdast
  dependencies added to `package.json`, `package_dist.json` and `build_package_new.sh`.
- Fixture corpus under `tests/richtext/fixtures/*.md` covering every kind, nesting depth 3,
  wikilinks, a copy of a visualnovel scene, and the HTML cases listed under HTML.
- `providers/markdown_html.ts` with the element table in both directions, the block-level
  and inline open/close pairing, the style tokenizer and the attribute rules.
- Round-trip tests as above, plus flattening tests for nested lists and quotes. No DOM.

Status: done. `markdown_model.ts`, `markdown_parse.ts`, `markdown_serialize.ts` and
`markdown_html.ts` under `providers/`, reached through `richtext/markdown.ts`; the six mdast
and micromark packages in both manifests (`build_package_new.sh` already copies the lock
file, so it needed no change); `tests/richtext/fixtures/{kinds,html,sanitize,scene}.md` and
`tests/richtext/markdown.test.ts` (62 tests). The barrel and `dist/pathux.js` are unchanged
and the bundle contains no micromark. Deviations, each with its reason:

- Soft line breaks are kept. The plan made every `\n` in a paragraph a hard break, which
  would have turned the scene's `AIKO` / `[[line: L2]]` / dialogue lines into one line
  joined by spaces; the scene fixture then could not be a fixed point after zero passes,
  which the plan also requires. A `\n` in the text is a line break either way; a hard one
  (a backslash or two-space break, a `<br>`) carries a `break` mark over that one character
  and serializes as a backslash break, a bare one serializes as a bare newline. So
  `MdMarkName` gains `break`, and `MdMark` gains `tag` for a `style` mark that carries an
  element such as `<kbd>`, which the plan's table names but its interface could not hold.
- `markdown_inline.ts` is a fifth module: the `InlineBuilder` the two parsers share and the
  `inlineTree` walk both emitters share, with a field-aware `normalizeMdMarks`, since
  `marks.ts`'s name-only merge would fuse two adjacent links into one.
- A wikilink is emitted as a `wikilink` mdast node with its own handler rather than an
  inline `html` node: `mdast-util-to-markdown` replaces the newline before an `html` node
  with a space, which would have pulled a marker off its own line.
- Media elements are cut out of an HTML block by a regex before `DOMParser` sees it and
  restored as `raw` blocks from the cut text, because happy-dom's `DOMParser` fetched the
  `<iframe>` source during the first run; an inline media or script tag is parsed with its
  tag name swapped for `span` for the same reason. A media element alone in a paragraph
  (mdast reads `<video>` as inline, since it is not in CommonMark's block list) is a `raw`
  block too.
- A styled list item is emitted as `- <li style="…">…</li>`, the `<li>` inside the markdown
  item, so the list stays one markdown list; the checkbox rides in the `<li>`. A wrapper's
  element-specific attributes (`open` on `details`) stay with the wrapper rather than
  copying onto its children.
- A `<u>` that never closes, and a `</em>` that closes out of order, are literal text as
  planned; a pair that did close between them is still a mark.
- A list item with more than one paragraph becomes one item per paragraph, and a code block
  inside an item leaves the list, since the flat model has no item that holds blocks. That is
  the one normalization of the stage that changes structure; a fixed point still holds after
  one pass.

### Stage 3 — `MarkdownProvider`

- `renderMarkdownBlock`, `styles`, `applyEdit` / `inverse` by kind, `handleKey`, `headings`,
  clipboard, `emitDocFile`.
- Theme keys on `RichTextEditor` in `theme.ts` and their CSS variables; frontend-design
  skill for the block typography.
- A bare Markdown tab in the example app: one editor over a fixture, no outline, Save or
  read-only toggle yet, so the spec below has something to open (`openEditor` in
  `playwright/richtext.spec.ts` clicks a tab by test id). Stage 5 finishes the tab.
- A `richTextFormat` registry on `RichTextArea` (`registerFormat(name, () => provider)`),
  which `richtext/markdown.ts` fills on import, so stage 5's markdown mode never imports the
  parser into the barrel.
- `tests/richtext/markdownProvider.test.ts` in the shape of `plainProvider.test.ts`: one
  case per op per kind, including Enter in an empty list item (the paragraph takes the
  pre-allocated id), Backspace at the start of a heading, Tab on a nested item, Enter and
  Shift+Enter inside a fence and in a paragraph, split before an opaque block, split at the
  start of front matter refused, and a `setKind` to `code` over three paragraphs with the ids
  supplied in `data` redone after an undo.
- `playwright/richtext/markdown.spec.ts`: caret across a code-block newline and onto an
  empty last line, list numbering after a split and after an undo, a numbered list resumed
  after a nested bullet run, both browsers.
- Screenshots: `markdown-document` (a fixture showing every kind at once), `markdown-lists`
  (bulleted, numbered and task items at depths 0 to 2), `markdown-code` (a fence with three
  lines and the caret on the second), `markdown-raw` (a preserved `<video>` placeholder),
  and the same document under `readonly`. Electron pass on `markdown-document`.

Status: done. `providers/markdown_provider.ts` and `providers/markdown_render.ts`, reached
through `richtext/markdown.ts`, which registers the `markdown` format on import; theme keys
and `--richtext-*` variables; the Markdown tab over `example/editors/properties/markdown_sample.ts`;
`tests/richtext/markdownProvider.test.ts` (66 tests); `playwright/richtext/markdown.spec.ts`
in Chromium and Firefox with the five screenshots, plus `markdown-document-electron.png`
from the Electron pass. The runtime barrel and the bundle are unchanged and the bundle
contains no micromark. Deviations, each with its reason:

- The registry entry is a `RichTextFormat` (`provider()`, `fromText`, `toText`) rather
  than a provider factory: a mode needs the parser and serializer as well as the provider,
  and only the module that owns the parser can supply them. `RichTextFormat` is the one
  type-only name the barrel gains, and `tests/fixtures/barrel-surface.json` records it.
- Enter in a paragraph is a hard break under Shift only, and it is an `insertBreak` custom
  op (a `break` mark over one `\n`) rather than a text insert, so a soft break and a hard
  one stay distinct after stage 2's decision to keep both. Enter in a fence inserts `\n`,
  except on an empty last line, where it leaves the fence and drops the empty line.
- `hr`, `table`, `raw` and `frontmatter` render inside a `contenteditable="false"` wrapper
  (`div.md-opaque`) and the provider treats each as one atom: `blockText` is `ATOM_CHAR`,
  a split lands a paragraph before or after (refused at the start of front matter), a join
  into one selects it instead. Chromium drops a selection endpoint inside such a wrapper, so
  `fromDocPos` maps an opaque position to the root's child offset.
- Backspace or Delete beside an opaque block arrives from both engines as a range from the
  end of the previous editable block to the start of the next, so a range whose interior is
  only opaque blocks removes them without joining its ends; a whole opaque block deleted on
  its own becomes an empty paragraph under the same id, so the caret has somewhere to go.
- `ClipboardContent` gains `text`, the plain text as it arrived, because a paste into a
  fence takes the text verbatim rather than the parsed blocks; the pre-allocated ids then go
  unused, which the protocol allows. A paste into an empty paragraph adopts the first pasted
  block's kind. A whole block copies as its markdown entry, a list item indented by depth;
  a partial code selection copies as bare text.
- `marks.ts`'s helpers take a trailing `normalize` parameter, defaulting to the name-only
  merge, so the provider can pass `normalizeMdMarks` and keep two adjacent links apart.
- Table cells render through `toMarkdown` on the cell's mdast children and a parse back,
  since the cell holds inline markdown rather than a block of the model.
- `markdownOps` builds the custom ops (`setKind`, `setDepth`, `setTask`, `setLink`,
  `setImage`, `moveAtom`, `insertBreak`) so stage 4's toolbar and the tests share one
  encoding; a custom op's `data` may carry a `selection`, which is what Tab and Shift+Tab
  use to keep the range. The inverse of a custom op spans the document order between its
  first and last block, since a redo must see the same contiguous span.
- The `code` mark button shows `Icons.FILE` until stage 4 draws its own; the toolbar theme
  keys wait for stage 4 as well.
- The Playwright config gains a `firefox` project matched to the markdown spec only. Marker
  text is unreadable through the DOM, so the numbering checks read it over CDP and run in
  Chromium only; Firefox element screenshots come back offset, so screenshots are Chromium
  only and Firefox checks behaviour.

### Stage 4 — toolbar and inline editors

- `MarkdownProvider.buildToolbar`: mark buttons, a block-kind dropdown (Paragraph, Heading
  1–6, Quote, Code), bulleted, numbered and task list toggles, the Link button; its sync.
- Task checkbox, `link-popup-x`, `md-image-x` with `ImageResizeOp` and `ImageMoveOp`.
- Frontend-design skill for the toolbar, the popup and the image handles; theme keys for
  each; `gen:themes` regenerated.
- Playwright: tick a task and undo it; resize an image and Escape; move an image into another
  paragraph and undo; set a link from the toolbar; a wikilink click raises `linkclick` with
  `kind: "wiki"`; everything above is inert under `readonly` and `scrollTop` holds.
- Screenshots: `markdown-toolbar` (the row with a heading selected, so the dropdown and the
  lit buttons show), `markdown-link-popup`, `markdown-image-hover` (the handle and outline),
  `markdown-image-resize` (mid-drag), `markdown-image-move` (mid-drag with the drop caret in
  another paragraph), `markdown-task-checked`. Electron pass on `markdown-toolbar` and
  `markdown-image-move`, since a modal op's pointer capture is the part most likely to differ
  between shells.

Status: not started.

### Stage 5 — binding, example, docs

- `RichTextArea` markdown mode through the format registry and the `richTextFormat` flag.
- Example app: a Markdown tab with an editor, a Read-only toggle, a Save button calling
  `emitDocFile`, an outline `ListBox` built from `headings()` that selects on click, and a
  `linkclick` listener that shows a wikilink's target in the status bar. Frontend-design
  skill for the tab layout.
- `documentation/richtext.md` gains Markdown, Provider bridge, Render-only and Link click
  sections; the todos entry.
- Screenshots: `markdown-tab` (editor, outline and toolbar together), `markdown-outline-click`
  (after selecting a heading from the outline), `markdown-readonly-toggle` (the same scroll
  position before and after the toggle, two captures). Electron pass on `markdown-tab`.

Status: not started.

### Stage 6 — optional follow-ups

- Typing shortcuts in `applyEdit`: `# ` at the start of a paragraph becomes a heading, `- `
  a list item, ` ``` ` a fence, `[[` opens wikilink completion through a provider hook.
- `text/html` paste converted to markdown.

Status: not started.

### Stage 7 — the syntax reference

Written last, from what the code does rather than from this plan, so it documents the syntax
that landed and none that was cut. `documentation/markdown_syntax.md`:

- One section per construct: headings, paragraphs and line breaks, emphasis (bold, italic,
  underline, strikethrough), inline code, links, wikilinks, images and media, bulleted,
  numbered and task lists with nesting, block quotes, fenced code, thematic breaks, tables
  (read-only), front matter, and HTML: the allowed elements, the attribute rules, the style
  rules, custom attributes, and the preserved media elements.
- Each section shows the source, states what it becomes in the editor, and states what comes
  back out, so the normalization is documented where a user will look for it (a `<pre>` in,
  a fence out; `_em_` in, `*em*` out).
- What the editor refuses or drops is listed in its own section, with the reason, so a user
  whose document lost something can find out why.
- The guide's code samples are the last fixture: a test reads every fenced markdown block
  out of the guide, parses it, and asserts the kinds and marks the surrounding prose names,
  so the guide cannot drift from the parser without failing a test.
- `documentation/richtext.md` links to it, and so does the example app's Markdown tab.

Status: not started.

## Findings

A fresh-context agent pressure tested the plan against the code before any stage began and
reported 23 findings; the four that overturned decisions were verified by reading the code
they cite. All are folded in above; the disposition of each:

1. `moveAtom`'s snapshot inverse would reorder blocks on undo, because `replaceBlocks`
   restores its blocks contiguously. `custom.blocks` is now a contiguous span.
2. The `setCtx` cascade recurses into the editor's root and would replace every embedded
   widget's `ctx`, losing `ctx.editor`. `RichTextEditor` overrides `_forEachChildWidget` to
   skip the root and updates embedded widgets from its own render paths.
3. A `custom` op minting ids inside `applyEdit` breaks redo. Ids come in `data`, allocated
   by the caller; `setKind` across `code` is defined.
4. The session registry solved nothing: undo runs with `tool.execCtx`, never with a caller's
   context (verified at `toolstack.ts:552`). Dropped; the original finding stands; the test
   stays.
5. The built-in `list-item` counter cannot number nested runs and `data-md-first` missed
   undo. Per-depth named counters reset from structure alone; no neighbour dirtying.
6. An unused pre-allocated `splitBlock` id leaves a phantom block in `PendingMapper`. The
   empty-list-item exit now creates the paragraph as `newBlock`.
7. A checkbox atom at offset 0 shifted every offset in the block. The checkbox is a childless
   `contenteditable="false"` element with no `data-doc-atom`, counting 0 in the walk.
8. `data-*` allowed wholesale let a file inject `data-doc-atom`; the vocabulary rule had
   gaps. Protocol attributes are reserved and dropped; the vocabulary carries `popover`,
   `hidden`, `inert`, `tabindex`, `slot`, `part`, `commandfor`, `popovertarget`; a fixture
   holds one newer attribute.
9. `viewState.scrollTop` had nothing to read. The root becomes the scroller with
   `overflow-y: auto`.
10. The mdast chain would land in every consumer bundle (`treeShaking: false`) and was not a
    declared dependency. Declared in both manifests; the provider lives outside the barrel
    in `richtext/markdown.ts`; `RichTextArea` reaches it through a format registry.
11. Hard line breaks were undefined. `\n` in a paragraph is mdast `break`, Shift+Enter is
    `insertText "\n"` through `handleKey`, a trailing `\n` renders a `<br>`.
12. Parsing `style` through happy-dom's `cssText` would pin fixtures to happy-dom. A small
    tokenizer of the provider's own instead.
13. Theme keys must land in `scripts/core/theme.ts` for `getDefault` and `gen:themes --strict`;
    booleans cannot be CSS variables as-is. Both stated under Theme.
14. Stage 3's spec drove a tab stage 5 built. A bare tab moves to stage 3.
15. `RichTextArea.__updateDisable` and `readOnly` both wrote `contenteditable`. The editor is
    the only writer; the widget sets `internalDisabled`.
16. `posFromPoint` needs `shadowRoots` and has no WebKit fallback. Passed; WebKit refuses the
    drop.
17. `custom` ops were invisible to `mapThroughPending`, and `session.dispatch` had no run
    counter. `shifts` on the op; `run` defaulting to a fresh value; the editor keeps `commit`.
18. A bubbling composed `change` was out of step with the repo and forced the `RichTextArea`
    interception. Non-bubbling, like `ListBox`'s.
19. A block-level HTML wrapper spanning a blank line arrives as separate open and close
    nodes. Paired like inline tags.
20. The link popup lost the selection it edited to focus, and `screen.popup`'s default close
    mode is pointer-leave. Range captured at open; `"click"` close mode.
21. `unobserved` was unnecessary: the observer does not watch attributes. Removed.
22. Tidying: `provider.onChange` still named after the rename; the `foldBlock` change was
    already covered; `PlainProvider` needs an explicit `custom` case; `buildToolbar` runs
    per session set; `styles()` goes in a replaced `<style>`; `richtext/index.ts` does not
    exist; a split at offset 0 of front matter is refused. All applied.
23. The clipboard shape was unstated. One markdown source entry per resulting block.

The agent also confirmed four things the brief questioned, recorded here so they are not
re-asked: cancelling `keydown` suppresses the matching `beforeinput` and `modalKeyEvents` is
not involved; `contenteditable="false"` on the root stops every input path and `disabled`
cascades through a `RowFrame`; only `context.ts` and one test call `provider.onChange`, the
hosted editor is inside `RichTextArea`'s shadow, and changing `VALUE` to `Doc` fits
`on_change` without touching `SELF`; and `mdast-util-to-markdown` escapes `[` in text, so a
wikilink must be an inline `html` node.

## Decisions

Answered after the pressure test, each folded into its section above:

- Underline and image width serialize as inline HTML (`<u>`, `<img width>`); there is no
  other representation and the common renderers show both.
- Nothing survives verbatim beyond `table`, `raw` and front matter; every other element is
  normalized, and a `<pre>` comes back as a fence.
- A GitHub-safe export (no `style`, no `class`) is the consumer's, not the provider's.
- Media metadata beyond the image source is the consumer's too: an `<img>` HTML form with a
  `data-*` attribute, read back from `image.attrs`.
- Tables are read-only; editing them is deferred.
- `headings()` returns ids and levels only; titles come from `blockText`.
- A link click has no default behaviour in either mode beyond the edit-mode popup. The
  widget makes no assumption about what a link means.
