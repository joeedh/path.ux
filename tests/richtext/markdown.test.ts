import { describe, expect, test, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ATOM_CHAR } from "../../scripts/widgets/richtext/provider";
import {
  blockNeedsHtml,
  markdownDocFromText,
  markdownText,
  safeUrl,
  sanitizeAttrs,
  sanitizeStyle,
} from "../../scripts/widgets/richtext/markdown";
import type { MdBlock, MdDoc, MdMark } from "../../scripts/widgets/richtext/markdown";
import { normalizeMdMarks } from "../../scripts/widgets/richtext/providers/markdown_inline";

const FIXTURES = join(import.meta.dirname, "fixtures");

// read with LF whatever the checkout's line endings, since the serializer writes LF
const fixture = (name: string) =>
  readFileSync(join(FIXTURES, `${name}.md`), "utf8").replace(/\r\n/g, "\n");

/** Parses with sequential ids, so two parses of one text compare equal. */
function parse(text: string): MdDoc {
  let n = 0;
  return markdownDocFromText(text, () => `b${n++}`);
}

const roundTrip = (text: string) => markdownText(parse(text));

const kinds = (doc: MdDoc) => doc.blocks.map((b) => b.kind);
const texts = (doc: MdDoc) => doc.blocks.map((b) => b.text);
const marks = (block: MdBlock) => block.marks.map((m) => [m.name, m.from, m.to]);

/** A block's identity-free shape, for comparing two parses. */
const shape = (block: MdBlock) => {
  const rest: Partial<MdBlock> = { ...block };
  delete rest.id;
  return rest;
};

describe("the fixture corpus", () => {
  const names = readdirSync(FIXTURES)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.slice(0, -3));

  test.each(names)("%s is a fixed point after one pass", (name) => {
    const once = roundTrip(fixture(name));
    expect(roundTrip(once)).toBe(once);
  });

  test.each(names)("%s re-parses from its output block for block", (name) => {
    const first = parse(fixture(name));
    const again = parse(markdownText(first));
    expect(again.blocks.map(shape)).toEqual(first.blocks.map(shape));
  });

  test("the visualnovel scene comes back byte for byte", () => {
    const scene = fixture("scene");
    expect(roundTrip(scene)).toBe(scene);
    expect(scene).toContain("[[line: L2]]\nOh");
  });

  test("the kinds fixture is already in the emitted form", () => {
    const text = fixture("kinds");
    expect(roundTrip(text)).toBe(text);
  });
});

describe("kinds", () => {
  test("every kind parses to its block", () => {
    const doc = parse(fixture("kinds"));
    expect(kinds(doc)).toEqual([
      "frontmatter",
      ...Array<string>(6).fill("heading"),
      "paragraph",
      "paragraph",
      ...Array<string>(5).fill("listItem"),
      ...Array<string>(5).fill("listItem"),
      "listItem",
      "listItem",
      "quote",
      "quote",
      "quote",
      "code",
      "code",
      "hr",
      "table",
      "paragraph",
    ]);

    const headings = doc.blocks.filter((b) => b.kind === "heading");
    expect(headings.map((b) => (b.kind === "heading" ? b.level : 0))).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test("front matter, a table and a code block keep their source", () => {
    const [front] = parse(fixture("kinds")).blocks;
    expect(front).toMatchObject({
      kind  : "frontmatter",
      source: "---\ntitle: Every kind\ntags: [fixture, kinds]\n---",
    });

    const [table] = parse("| a | b |\n|---|---|\n| 1 | 2 |\n").blocks;
    expect(table).toMatchObject({ kind: "table", source: "| a | b |\n|---|---|\n| 1 | 2 |" });

    const [code] = parse("```ts\nconst x = 1;\n\nconst y = 2;\n```\n").blocks;
    expect(code).toMatchObject({ kind: "code", lang: "ts", text: "const x = 1;\n\nconst y = 2;" });
  });

  test("front matter is only read at the top", () => {
    const doc = parse("text\n\n---\nnot: front matter\n---\n");
    expect(kinds(doc)).toEqual(["paragraph", "hr", "heading"]);
  });

  test("nested lists flatten to depths and regroup on the way out", () => {
    const text = "- one\n  - two\n    - three\n  - two again\n- one again\n";
    const doc = parse(text);
    expect(doc.blocks.map((b) => (b.kind === "listItem" ? b.depth : -1))).toEqual([0, 1, 2, 1, 0]);
    expect(roundTrip(text)).toBe(text);
  });

  test("ordered and bullet lists at one depth stay two lists", () => {
    const text = "1. one\n2. two\n\n- bullet\n\n3. three\n";
    const doc = parse(text);
    expect(doc.blocks.map((b) => (b.kind === "listItem" ? b.ordered : null))).toEqual([
      true,
      true,
      false,
      true,
    ]);
    expect(roundTrip(text)).toBe("1. one\n2. two\n\n- bullet\n\n1. three\n");
  });

  test("task items carry their state and not a character", () => {
    const doc = parse("- [ ] open\n- [x] done\n- plain\n");
    expect(doc.blocks.map((b) => (b.kind === "listItem" ? [b.task, b.checked] : []))).toEqual([
      [true, false],
      [true, true],
      [undefined, undefined],
    ]);
    expect(texts(doc)).toEqual(["open", "done", "plain"]);
    expect(roundTrip("- [ ] open\n- [x] done\n")).toBe("- [ ] open\n- [x] done\n");
  });

  test("quotes flatten to depths and regroup", () => {
    const text = "> one\n>\n> > two\n> >\n> > > three\n>\n> back to one\n";
    const doc = parse(text);
    expect(doc.blocks.map((b) => (b.kind === "quote" ? b.depth : -1))).toEqual([0, 1, 2, 0]);
    expect(roundTrip(text)).toBe(text);
  });

  test("a list inside a quote is a list item, not a quote", () => {
    const doc = parse("> - item\n");
    expect(doc.blocks[0]).toMatchObject({ kind: "listItem", depth: 0, text: "item" });
  });

  test("a rule is three dashes and a setext heading becomes ATX", () => {
    expect(roundTrip("***\n")).toBe("---\n");
    expect(roundTrip("Title\n=====\n")).toBe("# Title\n");
  });
});

describe("inline content", () => {
  test("marks land on the flattened text", () => {
    const [block] = parse('a **b *c*** ~~d~~ `e` [f](http://g "h")\n').blocks;
    expect(block.text).toBe("a b c d e f");
    expect(marks(block)).toEqual([
      ["bold", 2, 5],
      ["italic", 4, 5],
      ["strikethrough", 6, 7],
      ["code", 8, 9],
      ["link", 10, 11],
    ]);
    expect(block.marks[4]).toMatchObject({ kind: "url", target: "http://g", title: "h" });
  });

  test("an image is one atom character", () => {
    const [block] = parse('see ![alt](pic.png "t") here\n').blocks;
    expect(block.text).toBe(`see ${ATOM_CHAR} here`);
    expect(block.atoms).toEqual([{ offset: 4, image: { src: "pic.png", alt: "alt", title: "t" } }]);
  });

  test("marks that overlap without nesting close and reopen", () => {
    const doc: MdDoc = {
      blocks: [
        {
          kind : "paragraph",
          id   : "a",
          text : "abcdefghi",
          marks: [
            { name: "bold", from: 0, to: 6 },
            { name: "italic", from: 3, to: 9 },
          ],
          atoms: [],
        },
      ],
    };
    expect(markdownText(doc)).toBe("**abc*def****ghi*\n");
    expect(parse(markdownText(doc)).blocks[0].marks).toEqual(doc.blocks[0].marks);
  });

  test("a hard break is a marked newline and a soft one a bare newline", () => {
    const [block] = parse("one\\\ntwo  \nthree\nfour\n").blocks;
    expect(block.text).toBe("one\ntwo\nthree\nfour");
    expect(marks(block)).toEqual([
      ["break", 3, 4],
      ["break", 7, 8],
    ]);
    expect(roundTrip("one\\\ntwo  \nthree\nfour\n")).toBe("one\\\ntwo\\\nthree\nfour\n");
  });

  test("a newline in a heading becomes a space", () => {
    const doc: MdDoc = {
      blocks: [{ kind: "heading", level: 2, id: "a", text: "a\nb", marks: [], atoms: [] }],
    };
    expect(markdownText(doc)).toBe("## a b\n");
  });

  test("reference links and images resolve to inline ones", () => {
    const text = '[text][r] and ![alt][i] and [missing][m]\n\n[r]: http://r "R"\n[i]: i.png\n';
    const [block] = parse(text).blocks;
    expect(block.text).toBe(`text and ${ATOM_CHAR} and [missing][m]`);
    expect(block.marks[0]).toMatchObject({ name: "link", target: "http://r", title: "R", to: 4 });
    expect(block.atoms[0].image).toEqual({ src: "i.png", alt: "alt" });
    expect(roundTrip(text)).toBe('[text](http://r "R") and ![alt](i.png) and \\[missing]\\[m]\n');
  });
});

describe("wikilinks", () => {
  test("a bare wikilink shows its target and an aliased one its alias", () => {
    const [block] = parse("see [[line: L7]] and [[page|the alias]].\n").blocks;
    expect(block.text).toBe("see line: L7 and the alias.");
    expect(block.marks).toEqual([
      { name: "link", kind: "wiki", target: "line: L7", from: 4, to: 12 },
      { name: "link", kind: "wiki", target: "page", from: 17, to: 26 },
    ]);
  });

  test("both forms come back as written", () => {
    const text = "see [[line: L7]] and [[page|the alias]].\n";
    expect(roundTrip(text)).toBe(text);
  });

  test("a wikilink inside code or a link is left alone", () => {
    const text = "`[[not]]` and [[[x]]](http://y)\n";
    const [block] = parse(text).blocks;
    expect(block.text).toBe("[[not]] and [[x]]");
    expect(block.marks.map((m) => m.name)).toEqual(["code", "link"]);
  });

  test("a marker on a line of its own stays on it", () => {
    const text = "AIKO\n[[line: L2]]\nHello.\n";
    expect(roundTrip(text)).toBe(text);
    expect(roundTrip("[[a]]\n[[b]]\n")).toBe("[[a]]\n[[b]]\n");
  });

  test("an edited alias is emitted against its target", () => {
    const doc = parse("[[page]]\n");
    doc.blocks[0].text = "renamed";
    doc.blocks[0].marks[0].to = 7;
    expect(markdownText(doc)).toBe("[[page|renamed]]\n");
  });
});

describe("HTML elements", () => {
  const first = (text: string) => parse(text).blocks[0];

  test("p and div are paragraphs, and only a styled one comes back as HTML", () => {
    expect(first("<p>plain</p>\n")).toMatchObject({ kind: "paragraph", text: "plain" });
    expect(first("<div>plain</div>\n").html).toBeUndefined();
    expect(roundTrip("<div>plain</div>\n")).toBe("plain\n");
    expect(roundTrip('<p style="color: red">red</p>\n')).toBe('<p style="color: red">red</p>\n');
  });

  test("a span at block level is a paragraph that emits as a span", () => {
    expect(first("<span>sssd</span>\n")).toMatchObject({
      kind: "paragraph",
      text: "sssd",
      html: { tag: "span" },
    });
    expect(roundTrip("<span>sssd</span>\n")).toBe("<span>sssd</span>\n");
    expect(roundTrip('<span style="color: red">a **b**</span>\n')).toBe(
      '<span style="color: red">a **b**</span>\n'
    );
  });

  test("headings, quotes, lists, pre, hr and table", () => {
    expect(first("<h3>three</h3>\n")).toMatchObject({ kind: "heading", level: 3, text: "three" });
    expect(roundTrip("<h3>three</h3>\n")).toBe("### three\n");
    expect(roundTrip('<h3 style="color: red">three</h3>\n')).toBe(
      '<h3 style="color: red">three</h3>\n'
    );

    const quotes = parse("<blockquote>a<blockquote>b</blockquote></blockquote>\n");
    expect(quotes.blocks.map(shape)).toMatchObject([
      { kind: "quote", depth: 0, text: "a" },
      { kind: "quote", depth: 1, text: "b" },
    ]);

    const list = parse("<ol><li>one<ul><li>two</li></ul></li><li>three</li></ol>\n");
    expect(list.blocks.map(shape)).toMatchObject([
      { kind: "listItem", ordered: true, depth: 0, text: "one" },
      { kind: "listItem", ordered: false, depth: 1, text: "two" },
      { kind: "listItem", ordered: true, depth: 0, text: "three" },
    ]);
    expect(markdownText(list)).toBe("1. one\n   - two\n2. three\n");

    expect(first('<pre><code class="language-py">print(1)\n</code></pre>\n')).toMatchObject({
      kind: "code",
      lang: "py",
      text: "print(1)",
    });
    expect(roundTrip('<pre><code class="language-py">print(1)\n</code></pre>\n')).toBe(
      "```py\nprint(1)\n```\n"
    );

    expect(first("<hr>\n")).toMatchObject({ kind: "hr" });
    expect(first("<table><tr><td>x</td></tr></table>\n")).toMatchObject({
      kind  : "table",
      source: "<table><tr><td>x</td></tr></table>",
    });
  });

  test("an img is an atom and a sized one comes back as a tag", () => {
    const block = first('<img src="a.png" alt="A" width="120" title="T" data-kind="still">\n');
    expect(block.text).toBe(ATOM_CHAR);
    expect(block.atoms[0].image).toEqual({
      src  : "a.png",
      alt  : "A",
      title: "T",
      width: 120,
      attrs: { "data-kind": "still" },
    });
    expect(roundTrip("![A](a.png)\n")).toBe("![A](a.png)\n");
    expect(roundTrip('<img src="a.png" alt="A" width="120">\n')).toBe(
      '<img src="a.png" alt="A" width="120">\n'
    );
  });

  test("inline tags become marks", () => {
    const block = first(
      '<b>b</b> <strong>s</strong> <i>i</i> <em>e</em> <u>u</u> <s>s</s> <del>d</del> <strike>k</strike> <code>c</code> <a href="http://x" title="t">a</a>\n'
    );
    expect(block.text).toBe("b s i e u s d k c a");
    expect(block.marks.map((m) => m.name)).toEqual([
      "bold",
      "bold",
      "italic",
      "italic",
      "underline",
      "strikethrough",
      "strikethrough",
      "strikethrough",
      "code",
      "link",
    ]);
    expect(block.marks[9]).toMatchObject({ kind: "url", target: "http://x", title: "t" });
  });

  test("marks without a markdown form are inline tags in a markdown paragraph", () => {
    expect(roundTrip("a <u>u</u> b <kbd>k</kbd> c\n")).toBe("a <u>u</u> b <kbd>k</kbd> c\n");
    expect(first("<kbd>k</kbd>\n").marks[0]).toMatchObject({ name: "style", tag: "kbd" });
  });

  test("a mark carrying style or attributes turns the block into HTML", () => {
    expect(roundTrip('a <em style="color: red">e</em> **b**\n')).toBe(
      '<p>a <em style="color: red">e</em> <strong>b</strong></p>\n'
    );
    expect(roundTrip('a <span data-x="1">s</span>\n')).toBe('<p>a <span data-x="1">s</span></p>\n');
  });

  test("br is a hard break, and a plain br in a markdown paragraph comes back as a backslash", () => {
    const block = first("a<br>b\n");
    expect(block.text).toBe("a\nb");
    expect(marks(block)).toEqual([["break", 1, 2]]);
    expect(roundTrip("a<br>b\n")).toBe("a\\\nb\n");
    expect(roundTrip('<p style="color: red">a<br>b</p>\n')).toBe(
      '<p style="color: red">a<br>b</p>\n'
    );
  });

  test("an allowed block element without a row of its own keeps its tag", () => {
    const doc = parse("<details open><summary>Sum</summary>body</details>\n");
    expect(doc.blocks.map(shape)).toMatchObject([
      { kind: "paragraph", text: "Sum", html: { tag: "summary" } },
      { kind: "paragraph", text: "body" },
    ]);
    expect(doc.blocks[1].html).toBeUndefined();
    expect(markdownText(doc)).toBe("<summary>Sum</summary>\n\nbody\n");
  });

  test("media elements are raw blocks kept verbatim and never instantiated", () => {
    const parseFromString = vi.spyOn(DOMParser.prototype, "parseFromString");
    const source = '<iframe src="https://example.com/e" onload="x()"></iframe>';
    const doc = parse(`${source}\n\n<video src="c.mp4" controls></video>\n\n<embed src="e.swf">\n`);
    expect(doc.blocks.map(shape)).toEqual([
      { kind: "raw", source, text: "", marks: [], atoms: [] },
      {
        kind  : "raw",
        source: '<video src="c.mp4" controls></video>',
        text  : "",
        marks : [],
        atoms : [],
      },
      { kind: "raw", source: '<embed src="e.swf">', text: "", marks: [], atoms: [] },
    ]);
    for (const call of parseFromString.mock.calls) {
      expect(call[0]).not.toMatch(/<(iframe|video|embed)/i);
    }
    parseFromString.mockRestore();

    expect(markdownText(doc)).toBe(
      `${source}\n\n<video src="c.mp4" controls></video>\n\n<embed src="e.swf">\n`
    );
  });

  test("a media element inside a paragraph is dropped", () => {
    expect(first('a <video src="c.mp4"></video> b\n').text).toBe("a  b");
  });

  test("an element not on the list goes and its content stays", () => {
    expect(first("<section>kept</section>\n")).toMatchObject({ kind: "paragraph", text: "kept" });
    expect(first('a <font color="red">b</font> c\n')).toMatchObject({ text: "a b c", marks: [] });
  });

  test("script, style, form and comments go entirely", () => {
    const doc = parse(
      '<script>alert(1)</script>\n\n<style>p{}</style>\n\n<form><input name="x"></form>\n\n<!-- c -->\n\ntext\n'
    );
    expect(doc.blocks.map(shape)).toMatchObject([{ kind: "paragraph", text: "text" }]);
    expect(first("a <script>x</script> b <!-- c --> d\n").text).toBe("a  b  d");
  });

  test("a wrapper around markdown copies its style onto each block", () => {
    const doc = parse('<div style="color: green">\n\npara **b**\n\n- item\n\n</div>\n\nafter\n');
    expect(doc.blocks.map(shape)).toMatchObject([
      { kind: "paragraph", text: "para b", html: { style: { color: "green" } } },
      { kind: "listItem", text: "item", html: { style: { color: "green" } } },
      { kind: "paragraph", text: "after" },
    ]);
    expect(doc.blocks[2].html).toBeUndefined();
    expect(markdownText(doc)).toBe(
      '<p style="color: green">para <strong>b</strong></p>\n\n- <li style="color: green">item</li>\n\nafter\n'
    );
  });

  test("a wrapper with nothing to carry vanishes and an unpaired closing tag is dropped", () => {
    const doc = parse("<div>\n\npara\n\n</div>\n\n</div>\n\nafter\n");
    expect(doc.blocks.map(shape)).toMatchObject([
      { kind: "paragraph", text: "para" },
      { kind: "paragraph", text: "after" },
    ]);
    expect(doc.blocks[0].html).toBeUndefined();
  });

  test("nested block HTML flattens, copying a styled wrapper onto its children", () => {
    const doc = parse(
      '<div style="color: green"><p>one</p><p>two</p></div>\n\n<div>loose<p>block</p></div>\n'
    );
    expect(doc.blocks.map(shape)).toMatchObject([
      { kind: "paragraph", text: "one", html: { style: { color: "green" } } },
      { kind: "paragraph", text: "two", html: { style: { color: "green" } } },
      { kind: "paragraph", text: "loose" },
      { kind: "paragraph", text: "block" },
    ]);
  });

  test("a tag that never closes, or closes out of order, is literal text", () => {
    expect(first("<u>open and </em>stray\n")).toMatchObject({
      text : "<u>open and </em>stray",
      marks: [],
    });
    // the pair that did close is still a mark; the two that did not are text
    expect(first("<b>a <i>b</b> c</i>\n")).toMatchObject({
      text : "<b>a b</b> c",
      marks: [{ name: "italic", from: 5, to: 12 }],
    });
  });

  test("a bare span pair inside a paragraph is just its content", () => {
    expect(first("<span>one</span> and <span>two</span>\n")).toMatchObject({
      text : "one and two",
      marks: [],
    });
  });

  test("a styled list item is an li inside the markdown list", () => {
    const text = '- <li style="color: green">item</li>\n';
    expect(parse(text).blocks.map(shape)).toMatchObject([
      { kind: "listItem", depth: 0, text: "item", html: { style: { color: "green" } } },
    ]);
    expect(roundTrip(text)).toBe(text);
  });
});

describe("sanitizing", () => {
  const first = (text: string) => parse(text).blocks[0];

  test("an event handler attribute is dropped", () => {
    expect(first('<p onclick="steal()" onLoad="x">t</p>\n').html).toBeUndefined();
    expect(sanitizeAttrs("span", { onpointerrawupdate: "x" })).toEqual({});
  });

  test("a javascript href drops the link", () => {
    expect(first('<a href="javascript:alert(1)">t</a>\n').marks).toEqual([]);
    expect(first('<a href=" JAVA\tSCRIPT:alert(1)">t</a>\n').marks).toEqual([]);
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl("vbscript:x")).toBeUndefined();
  });

  test("a data:text/html src drops the image, a data:image one is kept", () => {
    expect(first('a <img src="data:text/html,x" alt="a"> b\n')).toMatchObject({
      text : "a  b",
      atoms: [],
    });
    expect(first('<img src="data:image/png;base64,AA==" alt="a">\n').atoms[0].image!.src).toBe(
      "data:image/png;base64,AA=="
    );
    expect(safeUrl("data:image/png;base64,AA==")).toBeUndefined();
    expect(first('<a href="data:image/png;base64,AA==">t</a>\n').marks).toEqual([]);
  });

  test("safe schemes, relative paths and fragments pass", () => {
    for (const url of ["http://a", "https://a", "mailto:x@y", "tel:+1", "a/b.md", "#top", "../x"]) {
      expect(safeUrl(url)).toBe(url);
    }
  });

  test("a style with url(), expression(), an at-rule, a backslash or a tag is dropped", () => {
    expect(sanitizeStyle("background-color: url(x); color: red")).toEqual({ color: "red" });
    expect(sanitizeStyle("width: expression(alert(1))")).toEqual({});
    expect(sanitizeStyle("color: red; font-family: @import")).toEqual({ color: "red" });
    expect(sanitizeStyle("font-family: a\\62")).toEqual({});
    expect(sanitizeStyle("color: <red>")).toEqual({});
  });

  test("a property off the allowlist is dropped, position among them", () => {
    expect(sanitizeStyle("position: fixed; top: 0; z-index: 9; color: red")).toEqual({
      color: "red",
    });
    expect(
      sanitizeStyle("margin-left: 1em; padding: 0; border-top: 1px solid; list-style-type: square")
    ).toEqual({
      "margin-left"    : "1em",
      "padding"        : "0",
      "border-top"     : "1px solid",
      "list-style-type": "square",
    });
  });

  test("the style tokenizer splits outside quotes and parentheses", () => {
    expect(sanitizeStyle('font-family: "a; b", c; color: rgb(1, 2, 3); COLOR: blue')).toEqual({
      "font-family": '"a; b", c',
      "color"      : "blue",
    });
  });

  test("attributes the browser acts on are dropped, custom ones are kept", () => {
    expect(
      sanitizeAttrs("span", {
        is             : "x-evil",
        contenteditable: "true",
        srcdoc         : "<script>",
        formaction     : "/steal",
        popover        : "auto",
        tabindex       : "0",
        hidden         : "",
        "vn-ref"       : "c03",
        "data-vn-ref"  : "c02",
        "aria-label"   : "hint",
        closedby       : "any",
        id             : "i",
        title          : "t",
      })
    ).toEqual({
      "vn-ref"     : "c03",
      "data-vn-ref": "c02",
      "aria-label" : "hint",
      closedby     : "any",
      id           : "i",
      title        : "t",
    });
  });

  test("element-specific attributes stay with their element", () => {
    expect(sanitizeAttrs("details", { open: "" })).toEqual({ open: "" });
    expect(sanitizeAttrs("p", { open: "", href: "http://x", src: "a.png" })).toEqual({});
    expect(sanitizeAttrs("a", { href: "http://x", target: "_blank", rel: "noopener" })).toEqual({
      href  : "http://x",
      target: "_blank",
      rel   : "noopener",
    });
    expect(sanitizeAttrs("td", { colspan: "2" })).toEqual({ colspan: "2" });
  });

  test("the protocol's own attributes and classes are dropped whatever the list says", () => {
    expect(
      sanitizeAttrs("span", {
        "data-doc-block": "fake",
        "data-doc-atom" : "",
        "data-md-x"     : "1",
        "data-link-kind": "wiki",
        class           : "md-li keep md-quote",
      })
    ).toEqual({ class: "keep" });
  });

  test("the sanitize fixture stops every harmful input and passes every allowed channel", () => {
    const doc = parse(fixture("sanitize"));
    const text = markdownText(doc);
    for (const gone of [
      "onclick=",
      "javascript:",
      "text/html",
      "url(",
      "expression(",
      "position:",
      "srcdoc=",
      "formaction=",
      "popover=",
      "tabindex=",
      "hidden=",
      "is=",
      "contenteditable=",
      "data-doc-",
      "md-li",
      "<script",
      "<style",
      "<form",
    ]) {
      expect(text).not.toContain(gone);
    }
    expect(text).toContain('<iframe src="https://evil.example/frame"></iframe>');
    expect(text).toContain('data-vn-ref="c02"');
    expect(text).toContain('vn-ref="c03"');
    expect(text).toContain('closedby="any"');
    expect(text).toContain('aria-label="hint"');
    expect(text).toContain('target="_blank" rel="noopener"');
    expect(text).toContain("data:image/png");
  });
});

describe("the model", () => {
  test("blockNeedsHtml is true for a block with html or a styled mark", () => {
    const plain: MdBlock = { kind: "paragraph", id: "a", text: "x", marks: [], atoms: [] };
    expect(blockNeedsHtml(plain)).toBe(false);
    expect(blockNeedsHtml({ ...plain, html: { tag: "span" } })).toBe(true);
    expect(blockNeedsHtml({ ...plain, marks: [{ name: "bold", from: 0, to: 1, style: {} }] })).toBe(
      true
    );
    expect(
      blockNeedsHtml({ ...plain, marks: [{ name: "style", tag: "kbd", from: 0, to: 1 }] })
    ).toBe(false);
  });

  test("normalizing merges only marks that agree in every field", () => {
    const a: MdMark = { name: "link", kind: "url", target: "http://a", from: 0, to: 2 };
    const b: MdMark = { name: "link", kind: "url", target: "http://b", from: 2, to: 4 };
    const a2: MdMark = { name: "link", kind: "url", target: "http://a", from: 2, to: 4 };
    expect(normalizeMdMarks([a, b])).toEqual([a, b]);
    expect(normalizeMdMarks([a, a2])).toEqual([{ ...a, to: 4 }]);

    const breaks: MdMark[] = [
      { name: "break", from: 0, to: 1 },
      { name: "break", from: 1, to: 2 },
    ];
    expect(normalizeMdMarks(breaks)).toEqual(breaks);
    expect(normalizeMdMarks([{ name: "style", from: 0, to: 3 }])).toEqual([]);
  });
});
