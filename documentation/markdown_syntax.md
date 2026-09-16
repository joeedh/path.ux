# Markdown syntax

This is the syntax `MarkdownProvider` reads and writes. `markdownDocFromText` parses a source
into blocks and marks, the editor edits those, and `markdownText` writes them back as markdown.
The parser reads CommonMark with the GFM extensions (strikethrough, task lists, tables,
autolink literals), YAML front matter and a whitelisted subset of HTML. The serializer writes
one normalized form of each construct, so a source comes back in that form whether or not it
started there.

Each section below shows a source, states what the editor makes of it, and shows what comes
back out when the serializer writes it unchanged. Every ` ```markdown ` fence in this
file is a test fixture, and `tests/richtext/markdownSyntax.test.ts` parses each one and checks
the `<!-- expect: … -->` comment under it, so the guide cannot drift from the parser. A
comment names:

- `kinds`, the block kinds in document order. A heading is `heading1` to `heading6`; a list
  item is `bullet`, `numbered`, `task` or `task-done`, with `@1`, `@2` for its nesting depth;
  a quote is `quote`, with `@1` for a quote inside a quote; the rest are `paragraph`, `code`,
  `hr`, `table`, `raw` and `frontmatter`.
- `marks`, the distinct mark names in the document, sorted, or `none`. The marks are `bold`,
  `italic`, `underline`, `strikethrough`, `code`, `link`, `break` and `style` (an HTML span
  markdown has no syntax for).
- `images`, the number of image atoms, when the section is about images.
- `out`, what the serializer writes. `same` means the source comes back byte for byte;
  `next` means it comes back as the next fence, which is then itself a fixed point.

For the editor around the document (the provider, the toolbar, the typing shortcuts and the
`[[` completion) see [richtext.md](richtext.md) § Markdown.

## Headings

Six ATX levels. A setext heading (underlined with `=` or `-`) is read as level one or two,
and closing hashes are dropped; both come back as ATX.

```markdown
# Heading one

## Heading two

Setext one
==========

Setext two
----------

### Trailing hashes ###
```

<!-- expect: kinds=heading1,heading2,heading1,heading2,heading3; marks=none; out=next -->

```markdown
# Heading one

## Heading two

# Setext one

## Setext two

### Trailing hashes
```

<!-- expect: kinds=heading1,heading2,heading1,heading2,heading3; marks=none; out=same -->

## Paragraphs and line breaks

A blank line separates paragraphs. A single newline inside a paragraph is a soft break, kept
in the block's text as a newline and written back as one. Extra blank lines are not kept; two
paragraphs always come back with one blank line between them.

```markdown
A paragraph
continues on the next line.



A second paragraph after several blank lines.
```

<!-- expect: kinds=paragraph,paragraph; marks=none; out=next -->

```markdown
A paragraph
continues on the next line.

A second paragraph after several blank lines.
```

<!-- expect: kinds=paragraph,paragraph; marks=none; out=same -->

A hard break is two trailing spaces or a backslash at the end of a line. It carries a `break`
mark on the newline and comes back as the backslash form, since trailing spaces do not survive
an editor. The two-space form has no sample here, because the formatter strips it.

```markdown
A backslash ends this line\
before the last line.
```

<!-- expect: kinds=paragraph; marks=break; out=same -->

A `<br>` is a hard break too, but the newline after it is read as a soft break as well, so
`<br>` at the end of a line comes back as a backslash followed by an empty line. Write the
backslash form in a source the editor will save.

## Emphasis

Asterisks and underscores both read as emphasis and both come back as asterisks. Three
asterisks are bold and italic together. GFM strikethrough is two tildes. Markdown has no
underline, so `<u>` is read as the `underline` mark and written back as `<u>`.

```markdown
*italic*, _italic_, **bold**, __bold__, ***both***, ~~struck~~ and <u>underlined</u>.
```

<!-- expect: kinds=paragraph; marks=bold,italic,strikethrough,underline; out=next -->

```markdown
*italic*, *italic*, **bold**, **bold**, ***both***, ~~struck~~ and <u>underlined</u>.
```

<!-- expect: kinds=paragraph; marks=bold,italic,strikethrough,underline; out=same -->

Marks nest, and a link can sit inside emphasis.

```markdown
Text with **bold *nested italic* bold** and *italic with [a link](https://l)*.
```

<!-- expect: kinds=paragraph; marks=bold,italic,link; out=same -->

The HTML forms read as the same marks and come back as markdown. `<b>` and `<strong>` are
bold, `<i>` and `<em>` italic, `<s>`, `<del>` and `<strike>` strikethrough, and `<u>` and
`<ins>` underline.

```markdown
<b>bold</b>, <em>italic</em>, <del>struck</del> and <ins>inserted</ins>.
```

<!-- expect: kinds=paragraph; marks=bold,italic,strikethrough,underline; out=next -->

```markdown
**bold**, *italic*, ~~struck~~ and <u>inserted</u>.
```

<!-- expect: kinds=paragraph; marks=bold,italic,strikethrough,underline; out=same -->

## Inline code

Backticks make a `code` mark. Nothing inside is read as syntax, and `<code>` reads as the same
mark.

```markdown
Call `render()` and note that `**stars** stay literal` inside code.
```

<!-- expect: kinds=paragraph; marks=code; out=same -->

## Links

A link is a `link` mark with a `target` and an optional `title`. Inline links and autolinks
come back as written. A reference link is resolved while parsing and comes back inline, and
its definition is dropped, since the model holds the target on the mark.

```markdown
[Inline](https://example.com "With a title"), <https://example.com/auto>
and [a reference][ref].

[ref]: https://ref.test
```

<!-- expect: kinds=paragraph; marks=link; out=next -->

```markdown
[Inline](https://example.com "With a title"), <https://example.com/auto>
and [a reference](https://ref.test).
```

<!-- expect: kinds=paragraph; marks=link; out=same -->

GFM autolink literals (a bare `www.` or `https://` address, or an email address) are links
too. They come back as an explicit link or an autolink, so the target is visible in the
source.

```markdown
www.example.com, https://bare.example.com and user@example.com are links.
```

<!-- expect: kinds=paragraph; marks=link; out=next -->

```markdown
[www.example.com](http://www.example.com), <https://bare.example.com> and <user@example.com> are links.
```

<!-- expect: kinds=paragraph; marks=link; out=same -->

An `<a>` reads as the same mark. When it carries only what markdown syntax can hold (`href`
and `title`) it comes back as markdown; `target` and `rel` are kept on the mark, and a
paragraph holding a mark markdown cannot write comes back as HTML in full.

```markdown
An <a href="https://x.test">anchor</a> in a paragraph.

An <a href="https://x.test" title="T" target="_blank" rel="me">anchor with attributes</a>.
```

<!-- expect: kinds=paragraph,paragraph; marks=link; out=next -->

```markdown
An [anchor](https://x.test) in a paragraph.

<p>An <a href="https://x.test" title="T" target="_blank" rel="me">anchor with attributes</a>.</p>
```

<!-- expect: kinds=paragraph,paragraph; marks=link; out=same -->

A link target is checked. A relative path, a fragment, and the `http`, `https`, `mailto` and
`tel` schemes are kept. Every other scheme drops the link and keeps its text; see
[What the editor refuses or drops](#what-the-editor-refuses-or-drops).

## Wikilinks

`[[Page]]` is a `link` mark of kind `wiki` whose target is the text between the brackets.
`[[Page|shown]]` shows `shown` and targets `Page`; anything after a second `|` is part of the
shown text. A `#section` suffix stays in the target. Wikilinks come back as written. An
unclosed `[[` is text and comes back escaped.

```markdown
See [[Page]], [[Page|shown as this]] and [[Page#section]].
```

<!-- expect: kinds=paragraph; marks=link; out=same -->

The editor does not resolve a wikilink. A click dispatches a `linkclick` event whose link has
`kind: "wiki"`, and the app decides what the target means; typing `[[` calls the provider's
`onWikilinkStart` hook so the app can offer completions. Both are described in
[richtext.md](richtext.md).

## Images and media

An image is an atom in a paragraph's text, holding `src`, `alt` and an optional `title`. An
`<img>` reads as the same atom and keeps `width` as a number; an image with a width comes
back as `<img>`, since markdown has no syntax for it, and one without comes back as markdown.
The image syntax is used for any media file, and `MarkdownProviderOptions.renderMedia` decides
what element shows it.

```markdown
![alt](pic.png "Title") and ![](no-alt.png)

<img src="wide.png" alt="wide" width="240">

![video](clip.mp4)
```

<!-- expect: kinds=paragraph,paragraph,paragraph; marks=none; images=4; out=same -->

An image `src` is checked like a link target, and `data:image/*` is allowed on it as well.

## Lists

A bulleted item is `-`, `*` or `+` followed by a space; a numbered item is a number followed
by `.` or `)`. Nesting is by indentation, two spaces per level under a bullet and the width of
the marker under a number. A task item is a bullet followed by `[ ]` or `[x]`. Every item is
its own block, with its `depth` and, for a task, its `checked` state.

```markdown
- one
  - two
    - three
- back

1. first
   1. inner
2. second

- [ ] open
- [x] done
```

<!-- expect: kinds=bullet,bullet@1,bullet@2,bullet,numbered,numbered@1,numbered,task,task-done; marks=none; out=same -->

Bullets all come back as `-`, and numbers come back counting from one, so a list that starts
at another number or uses `)` is renumbered. Two lists that touch merge into one run.

```markdown
* star
+ plus

3. three
4) four
```

<!-- expect: kinds=bullet,bullet,numbered,numbered; marks=none; out=next -->

```markdown
- star
- plus

1. three
2. four
```

<!-- expect: kinds=bullet,bullet,numbered,numbered; marks=none; out=same -->

An item holds one line of inline content. A second paragraph in an item becomes an item of
its own, and so does a quote in one; a fenced code block inside an item leaves the list. A
document that relies on blocks inside items is flattened on the way through.

````markdown
- item

  > a quote in an item

- item two

  ```
  code in an item
  ```
````

<!-- expect: kinds=bullet,bullet,bullet,code; marks=none; out=next -->

````markdown
- item
- a quote in an item
- item two

```
code in an item
```
````

<!-- expect: kinds=bullet,bullet,bullet,code; marks=none; out=same -->

## Block quotes

A quote is a `quote` block with a `depth`; each `>` past the first adds one. Lines in one
quote stay one block, and a lazy continuation (a line without its `>`) is read as part of the
quote and comes back with the marker.

```markdown
> A quote
> with a second line.
>
> > Nested one level deeper.
```

<!-- expect: kinds=quote,quote@1; marks=none; out=same -->

A list inside a quote leaves the quote, as a list item does not carry a quote depth.

```markdown
> a quote holding
> - a list
> - inside
>
> and a paragraph
```

<!-- expect: kinds=quote,bullet,bullet,quote; marks=none; out=next -->

```markdown
> a quote holding

- a list
- inside

> and a paragraph
```

<!-- expect: kinds=quote,bullet,bullet,quote; marks=none; out=same -->

## Fenced code

A fence is a `code` block whose text holds the lines, with `lang` taken from the first word
of the info string; the rest of the info string is dropped. Tilde fences and indented code
read as the same block and come back as backtick fences. A fence holding backticks comes back
with a longer fence around it.

````markdown
```ts title="x.ts"
const x = 1;
```

~~~
tilde fence
~~~

    indented code
````

<!-- expect: kinds=code,code,code; marks=none; out=next -->

````markdown
```ts
const x = 1;
```

```
tilde fence
```

```
indented code
```
````

<!-- expect: kinds=code,code,code; marks=none; out=same -->

## Thematic breaks

Three or more of `-`, `*` or `_` on a line make an `hr` block, and every form comes back as
`---`. A `---` on the first line of a document opens front matter instead, so a break that is
the first block is written as `---` and read back as front matter on the next load.

```markdown
Above the breaks.

***

___

- - -
```

<!-- expect: kinds=paragraph,hr,hr,hr; marks=none; out=next -->

```markdown
Above the breaks.

---

---

---
```

<!-- expect: kinds=paragraph,hr,hr,hr; marks=none; out=same -->

## Tables

A GFM table is one opaque `table` block. Until edited, its source comes back byte for
byte. Supported tables offer inline Markdown cell inputs, body row/column operations,
alignment, and rectangular TSV paste through document history. Edits retain supported
inline formatting and serialize ordinary GFM; undo restores the original source. HTML
tables and cells containing HTML or images remain read-only with preserved source. See
[table editing](richtext.md#native-markdown-tables) for keyboard and draft behavior.

```markdown
| Name | Value |
| ---- | ----- |
| a    | 1     |
```

<!-- expect: kinds=table; marks=none; out=same -->

```markdown
<table>
<tr><th>h</th></tr>
<tr><td>c</td></tr>
</table>
```

<!-- expect: kinds=table; marks=none; out=same -->

## Front matter

A YAML block between `---` lines at the top of the document is a `frontmatter` block,
rendered read-only and kept verbatim.

```markdown
---
title: Notes
tags: [a, b]
---

Body.
```

<!-- expect: kinds=frontmatter,paragraph; marks=none; out=same -->

## HTML

HTML in a source is read through an element table, and the model is the trust boundary:
nothing reaches a live element that the table did not admit.

### The allowed elements

The list is GitHub's sanitizer list, the elements most renderers show: `h1` to `h6`, `p`,
`div`, `span`, `br`, `hr`, `b`, `strong`, `i`, `em`, `u`, `s`, `strike`, `del`, `ins`,
`code`, `pre`, `kbd`, `samp`, `var`, `tt`, `sup`, `sub`, `small`, `mark`, `abbr`, `cite`,
`dfn`, `q`, `time`, `a`, `img`, `blockquote`, `ul`, `ol`, `li`, `dl`, `dt`, `dd`, `table`,
`thead`, `tbody`, `tfoot`, `tr`, `th`, `td`, `caption`, `details`, `summary`, `figure`,
`figcaption`, `center` and `wbr`.

A block element with a markdown kind becomes that kind and comes back as markdown.

```markdown
<h2>An HTML heading</h2>
<ul>
<li>one</li>
<li>two</li>
</ul>
<blockquote>quoted</blockquote>
<pre><code class="language-js">let x = 1;
</code></pre>
<hr>
```

<!-- expect: kinds=heading2,bullet,bullet,quote,code,hr; marks=none; out=next -->

````markdown
## An HTML heading

- one
- two

> quoted

```js
let x = 1;
```

---
````

<!-- expect: kinds=heading2,bullet,bullet,quote,code,hr; marks=none; out=same -->

An inline element with no markdown equivalent (`sub`, `sup`, `kbd`, `mark`, `small`, `abbr`
and the rest) becomes a `style` mark that remembers its tag, and comes back as that tag.

```markdown
Water is H<sub>2</sub>O, 2<sup>10</sup>, <kbd>Ctrl</kbd> and <mark>marked</mark>.
```

<!-- expect: kinds=paragraph; marks=style; out=same -->

A `<p>` or `<div>` with no attributes is a plain paragraph. One with attributes keeps them on
the block and comes back as `<p …>`; a `<span>` on its own line is a block that remembers its
tag. A `<summary>`, `<figcaption>`, `<dt>` or `<dd>` is a paragraph that remembers its tag,
and comes back as that tag on its own; the `<details>`, `<figure>` and `<dl>` around them are
dropped, since the model has no block that holds other blocks.

```markdown
<div class="note" id="n1" data-kind="tip" lang="en">a tagged div</div>

<p align="center">centered</p>

<span>a span block</span>

<details>
<summary>Click</summary>

Hidden body.

</details>
```

<!-- expect: kinds=paragraph,paragraph,paragraph,paragraph,paragraph; marks=none; out=next -->

```markdown
<p class="note" id="n1" data-kind="tip" lang="en">a tagged div</p>

<p align="center">centered</p>

<span>a span block</span>

<summary>Click</summary>

Hidden body.
```

<!-- expect: kinds=paragraph,paragraph,paragraph,paragraph,paragraph; marks=none; out=same -->

### The attribute rules

An attribute survives when it is on the allowlist (`id`, `class`, `title`, `lang`, `dir`,
`align`, `width`, `height`, `style`; `href`, `target` and `rel` on `a`; `src` and `alt` on
`img`; `open` on `details`; `colspan` and `rowspan` on a cell) or when its name is not one
the browser knows. A name the browser acts on that is not on the allowlist (`onclick` and
every other handler, `loading`, `srcset`, `contenteditable`, …) is dropped. The editor's own
`data-doc-`, `data-md-` and `data-link-` prefixes are dropped as well.

### The style rules

A `style` attribute is read declaration by declaration. The properties kept are `color`,
`background-color`, `font-family`, `font-size`, `font-weight`, `font-style`,
`text-decoration`, `text-align`, `vertical-align`, `line-height`, `letter-spacing`,
`white-space`, `display`, `width`, `height`, `max-width`, `max-height`, `float`, `opacity`,
`border-radius`, and every `margin-`, `padding-`, `border-` and `list-style-` property. A
value holding `url(`, `expression(`, `@`, a backslash or `<` is dropped whatever its property.
A styled inline span is a `style` mark, and its paragraph comes back as HTML in full.

```markdown
<p style="text-align: center; position: fixed">Centered paragraph</p>

<span style="font-weight: bold; background: url(x); color: red">mixed style</span>

Some <span style="color: red">red</span> text.
```

<!-- expect: kinds=paragraph,paragraph,paragraph; marks=style; out=next -->

```markdown
<p style="text-align: center">Centered paragraph</p>

<span style="font-weight: bold; color: red">mixed style</span>

<p>Some <span style="color: red">red</span> text.</p>
```

<!-- expect: kinds=paragraph,paragraph,paragraph; marks=style; out=same -->

### Custom attributes

An attribute name outside the HTML vocabulary is a consumer's own and is kept as inert text,
on a block or on a `style` mark, so an app can tag its content and read the tag back.

```markdown
A <span vn-ref="scene1">custom</span> attribute.
```

<!-- expect: kinds=paragraph; marks=style; out=next -->

```markdown
<p>A <span vn-ref="scene1">custom</span> attribute.</p>
```

<!-- expect: kinds=paragraph; marks=style; out=same -->

### The preserved media elements

`video`, `audio`, `picture`, `iframe`, `object` and `embed` are `raw` blocks. The editor
shows their source as text, never instantiates them, and writes them back verbatim.

```markdown
<video src="clip.mp4" controls></video>

After the video.
```

<!-- expect: kinds=raw,paragraph; marks=none; out=same -->

## Escapes and entities

A backslash escape keeps its character literal and comes back escaped. An entity is decoded
while parsing and comes back as the character.

```markdown
\*not emphasis\*, a literal \[bracket], an entity &amp; and &copy;.
```

<!-- expect: kinds=paragraph; marks=none; out=next -->

```markdown
\*not emphasis\*, a literal \[bracket], an entity & and ©.
```

<!-- expect: kinds=paragraph; marks=none; out=same -->

## What the editor refuses or drops

- `<script>`, `<style>`, `<form>` and `<template>` are dropped with their content, since they
  run or collect input.
- An element not on the allowed list (`<section>`, `<article>`, `<nav>`, `<font>`, …) is
  dropped and its content stays in place.
- A link or image whose target has a scheme other than `http`, `https`, `mailto` or `tel`
  (`javascript:`, `ftp:`, `data:` outside `data:image/*` on an image) loses the link and keeps
  the text.
- An attribute the browser acts on that is not on the allowlist, every `on*` handler among
  them, is dropped; see [The attribute rules](#the-attribute-rules).
- A style property outside the kept set (`position`, `z-index`, `content`, …) and a value
  holding `url(` or the other unsafe tokens are dropped declaration by declaration.
- A reference link definition is dropped once resolved, since the target lives on the mark.
- A block inside a list item or a list inside a quote is flattened, as
  [Lists](#lists) and [Block quotes](#block-quotes) show; `<details>`, `<figure>` and `<dl>`
  wrappers go the same way.
- A fence's info string past the language is dropped.
- A thematic break as the first block is written as `---`, which the next parse reads as
  front matter.
- An unclosed inline tag (`<u>` with no `</u>`) or a stray closing tag is literal text, and
  comes back escaped so it stays text.
- Footnotes, definition lists, `^superscript^`, `==highlight==` and `:emoji:` shortcodes are
  not extensions the parser reads; each is literal text. A single tilde pair `~x~` is GFM
  strikethrough.
- GFM table cells edit a supported inline-source subset. HTML tables and unsupported
  cell content remain read-only with their original source.
- Composition input (IME) is refused by the editor for every format, as
  [richtext.md](richtext.md) describes.

```markdown
<a href="javascript:alert(1)">no link</a>, <section>a section</section>, <script>alert(1)</script>done.
```

<!-- expect: kinds=paragraph; marks=none; out=next -->

```markdown
no link, a section, done.
```

<!-- expect: kinds=paragraph; marks=none; out=same -->
