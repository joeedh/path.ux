import { beforeAll, describe, expect, test, vi } from "vitest";
import { UIBase, iconmanager } from "../../scripts/core/ui_base";
import type { RowFrame } from "../../scripts/core/ui_containers";
import { ATOM_CHAR, CARET_SLOT } from "../../scripts/widgets/richtext/provider";
import type {
  DocRange,
  EditOp,
  EditResult,
  EditorBridge,
  LinkInfo,
  ProviderContext,
} from "../../scripts/widgets/richtext/provider";
import {
  MarkdownProvider,
  markdownDocFromText,
  markdownOps,
  markdownStyles,
  markdownText,
  mdBlock,
  setLinkOp,
} from "../../scripts/widgets/richtext/markdown";
import type {
  MdBlock,
  MdDoc,
  MdImageWidget,
  WikilinkStart,
} from "../../scripts/widgets/richtext/markdown";
import { RichTextArea } from "../../scripts/widgets/richtext/textarea";
import type { ToolButton } from "../../scripts/widgets/richtext/providers/toolbar";
/* the element registrations the toolbar row and its buttons need */
import "../../scripts/core/ui_containers";
import "../../scripts/widgets/ui_widgets";

beforeAll(() => {
  // the kind dropdown draws its box on a 2d canvas, which happy-dom does not implement
  const proto = HTMLCanvasElement.prototype as unknown as { getContext(kind: string): unknown };
  proto.getContext = () =>
    new Proxy(
      {},
      {
        get: (_t, key) => (key === "measureText" ? () => ({ width: 10 }) : () => undefined),
        set: () => true,
      }
    );

  // no iconsheet <img> elements exist in the test DOM; the toolbar's icon CSS lookups
  // dereference sheet.image.src, so give the sheets a stand-in
  const sheets = (iconmanager as unknown as { iconsheets: { image: unknown }[] }).iconsheets;
  for (const sheet of sheets) {
    sheet.image ||= { src: "" };
  }
});

const SOURCE = `---
title: Test
---

# Heading

A *paragraph* with **bold** and a [link](http://x.test).

- one
- two
  1. nested
- [ ] task

> quoted

\`\`\`js
let a = 1;
let b = 2;
\`\`\`

---

| a | b |
| - | - |
| 1 | 2 |

<video src="c.mp4" controls></video>

![alt](pic.png) after
`;

/** Parses with sequential ids, so a test can name blocks as `b0`, `b1`, … */
function parse(text = SOURCE): MdDoc {
  let n = 0;
  return markdownDocFromText(text, () => `b${n++}`);
}

const provider = new MarkdownProvider();

const pos = (block: string, offset: number) => ({ block, offset });
const range = (a: string, ao: number, h: string, ho: number): DocRange => ({
  anchor: pos(a, ao),
  head  : pos(h, ho),
});
const caret = (block: string, offset: number) => range(block, offset, block, offset);
const kinds = (doc: MdDoc) => doc.blocks.map((b) => b.kind);
const texts = (doc: MdDoc) => doc.blocks.map((b) => b.text);
const ids = (doc: MdDoc) => doc.blocks.map((b) => b.id);
const marks = (block: MdBlock) => block.marks.map((m) => [m.name, m.from, m.to]);
const block = (doc: MdDoc, id: string) => {
  const b = doc.blocks.find((x) => x.id === id);
  if (b === undefined) {
    throw new Error(`no block ${id}`);
  }
  return b;
};

/** A bridge that records what the rendered widgets dispatch, for the render tests. */
function fakeCtx() {
  const dispatched: EditOp[] = [];
  const clicked: LinkInfo[] = [];
  let selection: DocRange | undefined;
  const editor = {
    dispatch: async (op: EditOp) => {
      dispatched.push(op);
      return undefined;
    },
    readOnly    : false as boolean,
    selection   : () => selection,
    select: (range: DocRange) => {
      selection = range;
    },
    blockElement: () => undefined,
    posFromPoint: () => undefined,
    root        : document.createElement("div"),
    linkClicked: (link: LinkInfo) => {
      clicked.push(link);
      return true;
    },
  } satisfies EditorBridge;

  return { ctx: { editor } as unknown as ProviderContext, editor, dispatched, clicked };
}

/** Applies `op` after taking its inverse, and checks the inverse restores the document. */
function applyAndUndo(doc: MdDoc, op: EditOp) {
  const before = JSON.stringify(doc);
  const inverse = provider.inverse(doc, op);
  const result = provider.applyEdit(doc, op);
  const after = JSON.stringify(doc);
  provider.applyEdit(doc, inverse);
  expect(JSON.stringify(doc)).toBe(before);
  provider.applyEdit(doc, op);
  expect(JSON.stringify(doc)).toBe(after);
  return result;
}

describe("reading", () => {
  const doc = parse();

  test("the fixture parses to one block per kind", () => {
    expect(kinds(doc)).toEqual([
      "frontmatter",
      "heading",
      "paragraph",
      "listItem",
      "listItem",
      "listItem",
      "listItem",
      "quote",
      "code",
      "hr",
      "table",
      "raw",
      "paragraph",
    ]);
  });

  test("opaque blocks are one ATOM_CHAR long", () => {
    expect(provider.isOpaque(doc, "b0")).toBe(true);
    expect(provider.blockText(doc, "b0")).toBe(ATOM_CHAR);
    expect(provider.blockText(doc, "b9")).toBe(ATOM_CHAR);
    expect(provider.isOpaque(doc, "b1")).toBe(false);
    expect(provider.blockText(doc, "b1")).toBe("Heading");
    expect(() => provider.blockText(doc, "nope")).toThrow(/unknown block nope/);
  });

  test("marks, headings and active marks", () => {
    expect(provider.marks().map((m) => m.name)).toEqual([
      "bold",
      "italic",
      "underline",
      "strikethrough",
      "code",
    ]);
    expect(provider.headings(doc)).toEqual([{ block: "b1", level: 1 }]);
    expect(provider.activeMarks(doc, range("b2", 2, "b2", 11))).toEqual(["italic"]);
    expect(provider.activeMarks(doc, caret("b2", 11))).toEqual(["italic"]);
    expect(provider.activeMarks(doc, range("b2", 0, "b2", 11))).toEqual([]);
  });

  test("the fixture serializes back to itself", () => {
    expect(markdownText(doc)).toBe(SOURCE);
  });
});

describe("insertText and deleteRange", () => {
  test("typing extends a mark and shifts a later atom", () => {
    const doc = parse();
    const b = block(doc, "b12");
    expect(b.text).toBe(`${ATOM_CHAR} after`);
    expect(b.atoms).toEqual([{ offset: 0, image: { src: "pic.png", alt: "alt" } }]);

    const result = applyAndUndo(doc, { type: "insertText", at: caret("b12", 0), text: "xy" });
    expect(b.text).toBe(`xy${ATOM_CHAR} after`);
    expect(b.atoms[0].offset).toBe(2);
    expect(result.selection).toEqual(caret("b12", 2));
  });

  test("a hard break mark stays one newline wide when typed after", () => {
    const doc = parse("a\\\nb\n");
    const b = doc.blocks[0];
    expect(marks(b)).toEqual([["break", 1, 2]]);

    provider.applyEdit(doc, { type: "insertText", at: caret(b.id, 2), text: "zz" });
    expect(b.text).toBe("a\nzzb");
    expect(marks(b)).toEqual([["break", 1, 2]]);

    provider.applyEdit(doc, { type: "deleteRange", range: range(b.id, 1, b.id, 2) });
    expect(b.text).toBe("azzb");
    expect(marks(b)).toEqual([]);
  });

  test("two adjacent links survive the mark arithmetic as two links", () => {
    const doc = parse("[a](http://a)[b](http://b)\n");
    const b = doc.blocks[0];
    provider.applyEdit(doc, { type: "insertText", at: caret(b.id, 2), text: "!" });
    expect(b.text).toBe("ab!");
    expect(b.marks.map((m) => [m.from, m.to, m.target])).toEqual([
      [0, 1, "http://a"],
      [1, 3, "http://b"],
    ]);
  });

  test("typing onto an opaque block changes nothing", () => {
    const doc = parse();
    const result = provider.applyEdit(doc, { type: "insertText", at: caret("b9", 1), text: "x" });
    expect(result.dirtyBlocks).toEqual([]);
    expect(block(doc, "b9").kind).toBe("hr");
  });

  test("deleting the whole of an opaque block leaves an empty paragraph with its id", () => {
    const doc = parse();
    const result = applyAndUndo(doc, { type: "deleteRange", range: range("b9", 0, "b9", 1) });
    expect(block(doc, "b9")).toEqual({
      id   : "b9",
      kind : "paragraph",
      text : "",
      marks: [],
      atoms: [],
    });
    expect(result).toEqual({ dirtyBlocks: ["b9"], removedBlocks: [], selection: caret("b9", 0) });
  });

  test("a range across blocks joins the outer two and removes the ones between", () => {
    const doc = parse();
    const result = applyAndUndo(doc, { type: "deleteRange", range: range("b1", 4, "b3", 1) });
    expect(block(doc, "b1")).toMatchObject({ kind: "heading", text: "Headne" });
    expect(result.removedBlocks).toEqual(["b2", "b3"]);
    expect(ids(doc)).not.toContain("b2");
  });

  test("a range ending at the edge of an opaque block leaves it alone", () => {
    const doc = parse();
    provider.applyEdit(doc, { type: "deleteRange", range: range("b8", 3, "b9", 0) });
    expect(block(doc, "b8").text).toBe("let");
    expect(block(doc, "b9").kind).toBe("hr");

    // starting after the rule removes nothing of it either
    provider.applyEdit(doc, { type: "deleteRange", range: range("b9", 1, "b10", 1) });
    expect(block(doc, "b9").kind).toBe("hr");
    expect(block(doc, "b10")).toMatchObject({ kind: "paragraph", text: "" });
  });

  test("a range covering an opaque block from a paragraph removes it", () => {
    const doc = parse();
    provider.applyEdit(doc, { type: "deleteRange", range: range("b8", 3, "b9", 1) });
    expect(block(doc, "b8").text).toBe("let");
    expect(ids(doc)).not.toContain("b9");
  });

  test("a range from one block's end to the next's start over opaque blocks removes them alone", () => {
    const doc = parse();
    const result = applyAndUndo(doc, { type: "deleteRange", range: range("b8", 21, "b12", 0) });
    expect(result).toEqual({
      dirtyBlocks  : [],
      removedBlocks: ["b9", "b10", "b11"],
      selection    : caret("b8", 21),
    });
    expect(block(doc, "b8").text).toBe("let a = 1;\nlet b = 2;");
    expect(block(doc, "b12").text).toBe(`${ATOM_CHAR} after`);
  });

  test("text joined into a fence loses its marks", () => {
    const doc = parse("```\ncode\n```\n\n**bold** tail\n");
    provider.applyEdit(doc, { type: "deleteRange", range: range("b0", 4, "b1", 0) });
    expect(doc.blocks[0]).toMatchObject({ kind: "code", text: "codebold tail", marks: [] });
  });
});

describe("splitBlock", () => {
  test("a list item splits into two items of the same kind", () => {
    const doc = parse();
    const result = applyAndUndo(doc, { type: "splitBlock", at: pos("b4", 1), newBlock: "n" });
    expect(block(doc, "b4")).toMatchObject({
      kind   : "listItem",
      text   : "t",
      ordered: false,
      depth  : 0,
    });
    expect(block(doc, "n")).toMatchObject({
      kind   : "listItem",
      text   : "wo",
      ordered: false,
      depth  : 0,
    });
    expect(result.selection).toEqual(caret("n", 0));
  });

  test("a task item splits into an unchecked task", () => {
    const doc = parse("- [x] done\n");
    provider.applyEdit(doc, { type: "splitBlock", at: pos("b0", 4), newBlock: "n" });
    expect(block(doc, "n")).toMatchObject({ kind: "listItem", task: true, checked: false });
    expect(block(doc, "b0")).toMatchObject({ task: true, checked: true });
  });

  test("Enter in an empty list item exits the list and the paragraph takes the new id", () => {
    const doc = parse("- one\n-\n");
    expect(block(doc, "b1").text).toBe("");
    const result = applyAndUndo(doc, { type: "splitBlock", at: pos("b1", 0), newBlock: "n" });
    expect(result).toEqual({ dirtyBlocks: ["n"], removedBlocks: ["b1"], selection: caret("n", 0) });
    expect(ids(doc)).toEqual(["b0", "n"]);
    expect(block(doc, "n").kind).toBe("paragraph");
  });

  test("a heading splits into a heading and a paragraph", () => {
    const doc = parse();
    provider.applyEdit(doc, { type: "splitBlock", at: pos("b1", 4), newBlock: "n" });
    expect(block(doc, "b1")).toMatchObject({ kind: "heading", text: "Head" });
    expect(block(doc, "n")).toMatchObject({ kind: "paragraph", text: "ing" });
  });

  test("a split at the start of a heading puts an empty paragraph before it", () => {
    const doc = parse();
    const result = provider.applyEdit(doc, { type: "splitBlock", at: pos("b1", 0), newBlock: "n" });
    expect(block(doc, "b1")).toMatchObject({ kind: "paragraph", text: "" });
    expect(block(doc, "n")).toMatchObject({ kind: "heading", level: 1, text: "Heading" });
    expect(result.selection).toEqual(caret("n", 0));
  });

  test("a quote splits into a quote of the same depth", () => {
    const doc = parse("> > deep\n");
    provider.applyEdit(doc, { type: "splitBlock", at: pos("b0", 2), newBlock: "n" });
    expect(block(doc, "n")).toMatchObject({ kind: "quote", depth: 1, text: "ep" });
  });

  test("a split of an opaque block makes a paragraph on the caret's side", () => {
    const doc = parse();
    applyAndUndo(doc, { type: "splitBlock", at: pos("b9", 1), newBlock: "after" });
    expect(ids(doc).indexOf("after")).toBe(ids(doc).indexOf("b9") + 1);
    applyAndUndo(doc, { type: "splitBlock", at: pos("b9", 0), newBlock: "before" });
    expect(ids(doc).indexOf("before")).toBe(ids(doc).indexOf("b9") - 1);
  });

  test("a split at the start of front matter is refused", () => {
    const doc = parse();
    const result = provider.applyEdit(doc, { type: "splitBlock", at: pos("b0", 0), newBlock: "n" });
    expect(result).toEqual({ dirtyBlocks: [], removedBlocks: [], selection: caret("b0", 0) });
    expect(ids(doc)[0]).toBe("b0");
    expect(ids(doc)).not.toContain("n");
  });

  test("a split on an empty last line of a fence leaves the fence", () => {
    const doc = parse("```\nlet a;\n\n```\n");
    expect(block(doc, "b0").text).toBe("let a;\n");
    const result = applyAndUndo(doc, { type: "splitBlock", at: pos("b0", 7), newBlock: "n" });
    expect(block(doc, "b0").text).toBe("let a;");
    expect(block(doc, "n").kind).toBe("paragraph");
    expect(result.selection).toEqual(caret("n", 0));
  });

  test("a split inside a fence makes two fences", () => {
    const doc = parse("```js\nlet a;\nlet b;\n```\n");
    provider.applyEdit(doc, { type: "splitBlock", at: pos("b0", 6), newBlock: "n" });
    expect(block(doc, "b0")).toMatchObject({ kind: "code", lang: "js", text: "let a;" });
    expect(block(doc, "n")).toMatchObject({ kind: "code", lang: "js", text: "\nlet b;" });
  });
});

describe("joinWithPrevious", () => {
  test("Backspace at the start of a heading makes it a paragraph", () => {
    const doc = parse();
    const result = applyAndUndo(doc, { type: "joinWithPrevious", block: "b1" });
    expect(block(doc, "b1")).toMatchObject({ kind: "paragraph", text: "Heading" });
    expect(result).toEqual({ dirtyBlocks: ["b1"], removedBlocks: [], selection: caret("b1", 0) });
  });

  test("a nested item drops one level, then becomes a paragraph, then joins", () => {
    const doc = parse();
    expect(block(doc, "b5")).toMatchObject({ kind: "listItem", depth: 1, ordered: true });

    provider.applyEdit(doc, { type: "joinWithPrevious", block: "b5" });
    expect(block(doc, "b5")).toMatchObject({ kind: "listItem", depth: 0, ordered: true });

    provider.applyEdit(doc, { type: "joinWithPrevious", block: "b5" });
    expect(block(doc, "b5")).toMatchObject({ kind: "paragraph", text: "nested" });

    const result = provider.applyEdit(doc, { type: "joinWithPrevious", block: "b5" });
    expect(block(doc, "b4")).toMatchObject({ kind: "listItem", text: "twonested" });
    expect(result).toEqual({
      dirtyBlocks  : ["b4"],
      removedBlocks: ["b5"],
      selection    : caret("b4", 3),
    });
  });

  test("a join that would take in an opaque block selects it instead", () => {
    const doc = parse();
    const selected = (id: string) => ({
      dirtyBlocks  : [],
      removedBlocks: [],
      selection    : range(id, 0, id, 1),
    });
    expect(provider.applyEdit(doc, { type: "joinWithPrevious", block: "b12" })).toEqual(
      selected("b11")
    );
    expect(provider.applyEdit(doc, { type: "joinWithPrevious", block: "b9" })).toEqual(
      selected("b9")
    );
    expect(kinds(doc)).toHaveLength(13);
  });

  test("the first block never joins", () => {
    const doc = parse();
    expect(provider.applyEdit(doc, { type: "joinWithPrevious", block: "b0" })).toEqual({
      dirtyBlocks  : [],
      removedBlocks: [],
      selection    : caret("b0", 0),
    });
  });

  test("a join carries marks and atoms across the seam", () => {
    const doc = parse("one\n\n**two** ![i](p.png)\n");
    provider.applyEdit(doc, { type: "joinWithPrevious", block: "b1" });
    const b = doc.blocks[0];
    expect(b.text).toBe(`onetwo ${ATOM_CHAR}`);
    expect(marks(b)).toEqual([["bold", 3, 6]]);
    expect(b.atoms[0].offset).toBe(7);
  });
});

describe("toggleMark", () => {
  test("adds and removes over paragraphs and skips fences", () => {
    const doc = parse("one\n\n```\ncode\n```\n\ntwo\n");
    const r = range("b0", 1, "b2", 2);
    const result = applyAndUndo(doc, { type: "toggleMark", range: r, mark: "code" });
    expect(result.dirtyBlocks).toEqual(["b0", "b2"]);
    expect(marks(doc.blocks[0])).toEqual([["code", 1, 3]]);
    expect(doc.blocks[1].marks).toEqual([]);
    expect(marks(doc.blocks[2])).toEqual([["code", 0, 2]]);

    provider.applyEdit(doc, { type: "toggleMark", range: r, mark: "code" });
    expect(doc.blocks[0].marks).toEqual([]);
    expect(doc.blocks[2].marks).toEqual([]);
  });

  test("link and unknown names are refused", () => {
    const doc = parse();
    const r = range("b2", 0, "b2", 3);
    expect(
      provider.applyEdit(doc, { type: "toggleMark", range: r, mark: "link" }).dirtyBlocks
    ).toEqual([]);
    expect(
      provider.applyEdit(doc, { type: "toggleMark", range: r, mark: "shout" }).dirtyBlocks
    ).toEqual([]);
  });
});

describe("handleKey", () => {
  const key = (init: KeyboardEventInit) => new KeyboardEvent("keydown", init);

  test("Tab and Shift+Tab on list items set depth over the selection", () => {
    const doc = parse();
    const op = provider.handleKey(doc, range("b3", 0, "b4", 1), key({ key: "Tab" }));
    expect(op).toMatchObject({ type: "custom", name: "setDepth", blocks: ["b3", "b4"] });
    const result = applyAndUndo(doc, op!);
    expect(block(doc, "b3")).toMatchObject({ kind: "listItem", depth: 1 });
    expect(result.dirtyBlocks).toEqual(["b3", "b4"]);
    expect(result.selection).toEqual(range("b3", 0, "b4", 1));

    const back = provider.handleKey(doc, caret("b3", 0), key({ key: "Tab", shiftKey: true }));
    provider.applyEdit(doc, back!);
    expect(block(doc, "b3")).toMatchObject({ depth: 0 });
    provider.applyEdit(doc, back!);
    expect(block(doc, "b3")).toMatchObject({ depth: 0 });
  });

  test("Tab outside a list, and any chord, is left to the editor", () => {
    const doc = parse();
    expect(provider.handleKey(doc, caret("b2", 0), key({ key: "Tab" }))).toBeUndefined();
    expect(
      provider.handleKey(doc, caret("b3", 0), key({ key: "Tab", ctrlKey: true }))
    ).toBeUndefined();
    expect(provider.handleKey(doc, caret("b2", 0), key({ key: "Enter" }))).toBeUndefined();
  });

  test("Enter in a fence inserts a newline, and on an empty last line splits", () => {
    const doc = parse();
    expect(provider.handleKey(doc, caret("b8", 3), key({ key: "Enter" }))).toEqual({
      type: "insertText",
      at  : caret("b8", 3),
      text: "\n",
    });

    const end = block(doc, "b8").text.length;
    provider.applyEdit(doc, { type: "insertText", at: caret("b8", end), text: "\n" });
    const op = provider.handleKey(doc, caret("b8", end + 1), key({ key: "Enter" }));
    expect(op).toMatchObject({ type: "splitBlock", at: pos("b8", end + 1) });
    provider.applyEdit(doc, op!);
    expect(block(doc, "b8").text).toBe("let a = 1;\nlet b = 2;");
    expect(kinds(doc)[9]).toBe("paragraph");
  });

  test("Shift+Enter in a paragraph is a hard break", () => {
    const doc = parse();
    const op = provider.handleKey(doc, caret("b2", 1), key({ key: "Enter", shiftKey: true }));
    expect(op).toMatchObject({
      type  : "custom",
      name  : "insertBreak",
      shifts: [{ block: "b2", at: 1, delta: 1 }],
    });
    const result = applyAndUndo(doc, op!);
    const b = block(doc, "b2");
    expect(b.text.slice(0, 3)).toBe("A\n ");
    expect(marks(b)[0]).toEqual(["break", 1, 2]);
    expect(result.selection).toEqual(caret("b2", 2));
    expect(markdownText({ blocks: [b] }).startsWith("A\\\n")).toBe(true);
  });

  test("Shift+Enter replacing a selection within one block", () => {
    const doc = parse("hello world\n");
    const op = provider.handleKey(
      doc,
      range("b0", 5, "b0", 6),
      key({ key: "Enter", shiftKey: true })
    );
    expect(op).toMatchObject({ shifts: [{ block: "b0", at: 5, delta: 0 }] });
    provider.applyEdit(doc, op!);
    expect(doc.blocks[0].text).toBe("hello\nworld");
  });

  test("Shift+Enter on an opaque block is left alone", () => {
    const doc = parse();
    expect(
      provider.handleKey(doc, caret("b9", 1), key({ key: "Enter", shiftKey: true }))
    ).toBeUndefined();
  });
});

describe("custom ops", () => {
  test("setKind to code merges three paragraphs into one fence, and redoes after an undo", () => {
    const doc = parse("one\n\ntwo\n\nthree\n");
    const op = markdownOps.setKind(["b0", "b1", "b2"], { kind: "code", lang: "txt" });
    const result = applyAndUndo(doc, op);
    expect(doc.blocks).toEqual([
      { id: "b0", kind: "code", lang: "txt", text: "one\ntwo\nthree", marks: [], atoms: [] },
    ]);
    expect(result).toEqual({
      dirtyBlocks  : ["b0"],
      removedBlocks: ["b1", "b2"],
      selection    : caret("b0", 13),
    });
  });

  test("setKind from code splits a fence into one paragraph per line with the supplied ids", () => {
    const doc = parse("```\none\ntwo\nthree\n```\n");
    const op = markdownOps.setKind(["b0"], { kind: "paragraph" }, { ids: ["l1", "l2"] });
    const result = applyAndUndo(doc, op);
    expect(texts(doc)).toEqual(["one", "two", "three"]);
    expect(ids(doc)).toEqual(["b0", "l1", "l2"]);
    expect(kinds(doc)).toEqual(["paragraph", "paragraph", "paragraph"]);
    expect(result.dirtyBlocks).toEqual(["b0", "l1", "l2"]);

    expect(() =>
      provider.applyEdit(
        parse("```\na\nb\n```\n"),
        markdownOps.setKind(["b0"], { kind: "paragraph" })
      )
    ).toThrow(/one unused id per line/);
  });

  test("setKind to heading, list, quote and paragraph keeps depth where it applies", () => {
    const doc = parse();
    provider.applyEdit(doc, markdownOps.setKind(["b2"], { kind: "heading", level: 3 }));
    expect(block(doc, "b2")).toMatchObject({ kind: "heading", level: 3 });
    expect(marks(block(doc, "b2"))).toEqual([
      ["italic", 2, 11],
      ["bold", 17, 21],
      ["link", 28, 32],
    ]);

    provider.applyEdit(
      doc,
      markdownOps.setKind(["b5"], { kind: "listItem", ordered: false, task: true })
    );
    expect(block(doc, "b5")).toMatchObject({
      kind   : "listItem",
      ordered: false,
      depth  : 1,
      task   : true,
      checked: false,
    });

    provider.applyEdit(doc, markdownOps.setKind(["b5"], { kind: "quote" }));
    expect(block(doc, "b5")).toMatchObject({ kind: "quote", depth: 0 });

    const result = provider.applyEdit(
      doc,
      markdownOps.setKind(["b9", "b10"], { kind: "paragraph" })
    );
    expect(result.dirtyBlocks).toEqual([]);
    expect(block(doc, "b9").kind).toBe("hr");
  });

  test("setTask adds, checks and removes the box", () => {
    const doc = parse();
    provider.applyEdit(doc, markdownOps.setTask(["b3"], { checked: true }));
    expect(block(doc, "b3")).toMatchObject({ task: true, checked: true });
    applyAndUndo(doc, markdownOps.setTask(["b3"], { checked: false }));
    expect(block(doc, "b3")).toMatchObject({ task: true, checked: false });
    provider.applyEdit(doc, markdownOps.setTask(["b3", "b6"], { task: false }));
    expect(block(doc, "b3")).not.toHaveProperty("task");
    expect(block(doc, "b6")).not.toHaveProperty("checked");
  });

  test("setLink sets, replaces and removes a link", () => {
    const doc = parse();
    const result = applyAndUndo(
      doc,
      markdownOps.setLink("b2", 2, 11, { target: "http://y", title: "t" })
    );
    expect(block(doc, "b2").marks.find((m) => m.name === "link" && m.from === 2)).toEqual({
      from  : 2,
      to    : 11,
      name  : "link",
      kind  : "url",
      target: "http://y",
      title : "t",
    });
    expect(result.selection).toEqual(range("b2", 2, "b2", 11));

    provider.applyEdit(doc, markdownOps.setLink("b2", 2, 11, { kind: "wiki", target: "Page" }));
    expect(
      block(doc, "b2")
        .marks.filter((m) => m.name === "link")
        .map((m) => m.kind)
    ).toEqual(["wiki", "url"]);

    provider.applyEdit(
      doc,
      markdownOps.setLink("b2", 0, block(doc, "b2").text.length, { target: "" })
    );
    expect(block(doc, "b2").marks.some((m) => m.name === "link")).toBe(false);
  });

  test("setImage patches width and alt", () => {
    const doc = parse();
    applyAndUndo(doc, markdownOps.setImage("b12", 0, { width: 120.4, alt: "picture" }));
    expect(block(doc, "b12").atoms[0].image).toEqual({
      src  : "pic.png",
      alt  : "picture",
      width: 120,
    });
    provider.applyEdit(doc, markdownOps.setImage("b12", 0, { width: null }));
    expect(block(doc, "b12").atoms[0].image).toEqual({ src: "pic.png", alt: "picture" });
    expect(
      provider.applyEdit(doc, markdownOps.setImage("b12", 3, { width: 1 })).dirtyBlocks
    ).toEqual([]);
  });

  test("insertImage puts an atom into a paragraph and shifts what follows", () => {
    const doc = parse();
    const op = markdownOps.insertImage("b2", 2, { src: "../a.png", alt: "a", width: 40.6 });
    expect(op).toMatchObject({ shifts: [{ block: "b2", at: 2, delta: 1 }] });
    const result = applyAndUndo(doc, op);
    expect(block(doc, "b2").text.slice(0, 4)).toBe(`A ${ATOM_CHAR}p`);
    expect(block(doc, "b2").atoms).toEqual([
      { offset: 2, image: { src: "../a.png", alt: "a", width: 41 } },
    ]);
    expect(marks(block(doc, "b2"))[0]).toEqual(["italic", 3, 12]);
    expect(result.selection).toEqual(caret("b2", 3));
    expect(markdownText(doc)).toContain(`A <img src="../a.png" alt="a" width="41">*paragraph*`);

    const fence = provider.applyEdit(doc, markdownOps.insertImage("b9", 0, { src: "x", alt: "" }));
    expect(fence.dirtyBlocks).toEqual([]);
    const empty = provider.applyEdit(doc, markdownOps.insertImage("b2", 0, { src: "", alt: "" }));
    expect(empty.dirtyBlocks).toEqual([]);
  });

  test("moveAtom moves an image into another paragraph and back", () => {
    const doc = parse();
    const op = markdownOps.moveAtom(doc, pos("b12", 0), pos("b2", 2));
    expect(op).toMatchObject({
      blocks: ["b2", "b3", "b4", "b5", "b6", "b7", "b8", "b9", "b10", "b11", "b12"],
      shifts: [
        { block: "b12", at: 0, delta: -1 },
        { block: "b2", at: 2, delta: 1 },
      ],
    });
    const result = applyAndUndo(doc, op);
    expect(block(doc, "b12").text).toBe(" after");
    expect(block(doc, "b12").atoms).toEqual([]);
    expect(block(doc, "b2").text.slice(0, 4)).toBe(`A ${ATOM_CHAR}p`);
    expect(block(doc, "b2").atoms).toEqual([{ offset: 2, image: { src: "pic.png", alt: "alt" } }]);
    expect(marks(block(doc, "b2"))[0]).toEqual(["italic", 3, 12]);
    expect(result.selection).toEqual(caret("b2", 3));
  });

  test("moveAtom within one block and into a fence", () => {
    const doc = parse("![i](p.png) tail\n\n```\ncode\n```\n");
    provider.applyEdit(doc, markdownOps.moveAtom(doc, pos("b0", 0), pos("b0", 6)));
    expect(doc.blocks[0].text).toBe(` tail${ATOM_CHAR}`);
    expect(doc.blocks[0].atoms[0].offset).toBe(5);

    const refused = provider.applyEdit(doc, markdownOps.moveAtom(doc, pos("b0", 5), pos("b1", 2)));
    expect(refused.dirtyBlocks).toEqual([]);
    expect(doc.blocks[0].atoms[0].offset).toBe(5);
  });

  test("unknown ops and malformed data throw", () => {
    const doc = parse();
    expect(() =>
      provider.applyEdit(doc, { type: "custom", name: "explode", blocks: ["b1"], data: {} })
    ).toThrow(/unknown custom op explode/);
    expect(() =>
      provider.applyEdit(doc, { type: "custom", name: "setKind", blocks: ["b1"], data: 3 })
    ).toThrow(/needs an object/);
  });
});

describe("typing shortcuts", () => {
  /** Types `text` one character at a time at the caret, the way the editor delivers it. */
  function typeAt(doc: MdDoc, block: string, offset: number, text: string) {
    let result: EditResult | undefined;
    for (const ch of text) {
      result = provider.applyEdit(doc, { type: "insertText", at: caret(block, offset), text: ch });
      offset = result.selection!.head.offset;
    }
    return result!;
  }

  test("a marker typed at the start of a paragraph sets its kind and keeps the rest", () => {
    const doc = parse("Hello *there*\n");
    expect(typeAt(doc, "b0", 0, "#").selection).toEqual(caret("b0", 1));
    expect(kinds(doc)).toEqual(["paragraph"]);

    const result = typeAt(doc, "b0", 1, " ");
    expect(doc.blocks[0]).toMatchObject({ kind: "heading", level: 1, text: "Hello there" });
    expect(marks(doc.blocks[0])).toEqual([["italic", 6, 11]]);
    expect(result).toEqual({ dirtyBlocks: ["b0"], removedBlocks: [], selection: caret("b0", 0) });
  });

  test("each marker has its kind, and a fence takes the third backtick", () => {
    const cases: [string, Partial<MdBlock>][] = [
      ["### ", { kind: "heading", level: 3 }],
      ["- ", { kind: "listItem", ordered: false, depth: 0 }],
      ["* ", { kind: "listItem", ordered: false, depth: 0 }],
      ["12. ", { kind: "listItem", ordered: true, depth: 0 }],
      ["> ", { kind: "quote", depth: 0 }],
      ["```", { kind: "code", lang: "" }],
    ];
    for (const [typed, expected] of cases) {
      const doc = parse("body\n");
      typeAt(doc, "b0", 0, typed);
      expect(doc.blocks[0], typed).toMatchObject({ ...expected, text: "body" });
    }
  });

  test("a marker elsewhere, in another kind, or with shortcuts off stays text", () => {
    const doc = parse("a\n\n# h\n\n- i\n");
    typeAt(doc, "b0", 1, " # ");
    expect(doc.blocks[0]).toMatchObject({ kind: "paragraph", text: "a # " });
    typeAt(doc, "b1", 0, "- ");
    expect(doc.blocks[1]).toMatchObject({ kind: "heading", text: "- h" });
    typeAt(doc, "b2", 0, "> ");
    expect(doc.blocks[2]).toMatchObject({ kind: "listItem", text: "> i" });

    const quiet = new MarkdownProvider({ shortcuts: false });
    const other = parse("b\n");
    quiet.applyEdit(other, { type: "insertText", at: caret("b0", 0), text: "#" });
    quiet.applyEdit(other, { type: "insertText", at: caret("b0", 1), text: " " });
    expect(other.blocks[0]).toMatchObject({ kind: "paragraph", text: "# b" });

    // a pasted marker is not typed
    const pasted = parse("c\n");
    provider.applyEdit(pasted, { type: "insertText", at: caret("b0", 0), text: "# " });
    expect(pasted.blocks[0]).toMatchObject({ kind: "paragraph", text: "# c" });
  });

  test("the shortcut's inverse restores the paragraph", () => {
    const doc = parse("x\n");
    provider.applyEdit(doc, { type: "insertText", at: caret("b0", 0), text: "-" });
    applyAndUndo(doc, { type: "insertText", at: caret("b0", 1), text: " " });
    expect(doc.blocks[0]).toMatchObject({ kind: "listItem", text: "x" });
  });
});

describe("wikilinks", () => {
  test("the second [ of a [[ reaches onWikilinkStart before it lands, and the key falls through", () => {
    const starts: WikilinkStart[] = [];
    const hooked = new MarkdownProvider({ onWikilinkStart: (start) => starts.push(start) });
    const doc = parse("see [ here\n\n```\n[\n```\n");
    const key = (init: KeyboardEventInit) => new KeyboardEvent("keydown", { key: "[", ...init });

    expect(hooked.handleKey(doc, caret("b0", 5), key({}))).toBeUndefined();
    expect(starts).toMatchObject([{ block: "b0", offset: 6 }]);

    hooked.handleKey(doc, caret("b0", 4), key({}));
    hooked.handleKey(doc, caret("b0", 5), key({ ctrlKey: true }));
    hooked.handleKey(doc, range("b0", 4, "b0", 5), key({}));
    hooked.handleKey(doc, caret("b1", 1), key({}));
    expect(starts).toHaveLength(1);

    expect(provider.handleKey(doc, caret("b0", 5), key({}))).toBeUndefined();
  });

  test("insertWikilink replaces the typed [[ with a wiki link and serializes as one", () => {
    const doc = parse("see [[Pa here\n");
    const op = markdownOps.insertWikilink("b0", 4, 8, "Page", "the page");
    expect(op).toMatchObject({
      name  : "insertWikilink",
      blocks: ["b0"],
      shifts: [{ block: "b0", at: 4, delta: 4 }],
    });
    const result = applyAndUndo(doc, op);
    expect(doc.blocks[0].text).toBe("see the page here");
    expect(doc.blocks[0].marks).toEqual([
      { from: 4, to: 12, name: "link", kind: "wiki", target: "Page" },
    ]);
    expect(result.selection).toEqual(caret("b0", 12));
    expect(markdownText(doc)).toBe("see [[Page|the page]] here\n");

    provider.applyEdit(doc, markdownOps.insertWikilink("b0", 0, 0, "Top"));
    expect(doc.blocks[0].text).toBe("Topsee the page here");
    expect(marks(doc.blocks[0])).toEqual([
      ["link", 0, 3],
      ["link", 7, 15],
    ]);
    expect(provider.applyEdit(doc, markdownOps.insertWikilink("b0", 0, 0, "")).dirtyBlocks).toEqual(
      []
    );
  });
});

describe("clipboard", () => {
  test("whole blocks copy as their markdown source, partial ones as inline content", () => {
    const doc = parse();
    const content = provider.toClipboard(doc, range("b1", 4, "b5", 6));
    expect(content.blocks).toEqual([
      "ing",
      "A *paragraph* with **bold** and a [link](http://x.test).",
      "- one",
      "- two",
      "  1. nested",
    ]);
    expect(content.text).toBe(content.blocks.join("\n"));
    expect(content.html).toBe(
      '<div data-richtext-markdown><p>ing</p><p>A <em>paragraph</em> with <strong>bold</strong> and a <a href="http://x.test">link</a>.</p><li>one</li><li>two</li><li>nested</li></div>'
    );
  });

  test("a fence copies whole as a fence and partially as bare lines; opaque blocks copy whole", () => {
    const doc = parse();
    expect(provider.toClipboard(doc, range("b8", 0, "b8", 21)).blocks).toEqual([
      "```js\nlet a = 1;\nlet b = 2;\n```",
    ]);
    expect(provider.toClipboard(doc, range("b8", 4, "b8", 16)).blocks).toEqual(["a = 1;\nlet b"]);
    expect(provider.toClipboard(doc, range("b9", 0, "b11", 1)).blocks).toEqual([
      "---",
      "| a | b |\n| - | - |\n| 1 | 2 |",
      '<video src="c.mp4" controls></video>',
    ]);
    expect(provider.toClipboard(doc, range("b9", 1, "b10", 0)).blocks).toEqual([]);
  });

  test("fromClipboard parses the text into one entry per block and keeps the text", () => {
    const data = {
      types  : ["text/plain"],
      getData: () => "# Title\r\n\r\n- a\r\n  - b\r\n",
    } as unknown as DataTransfer;
    expect(provider.fromClipboard(data)).toEqual({
      blocks: ["# Title", "- a", "  - b"],
      text  : "# Title\n\n- a\n  - b\n",
    });
    expect(
      provider.fromClipboard({ types: [], getData: () => "" } as unknown as DataTransfer)
    ).toBeUndefined();
    expect(
      provider.fromClipboard({
        types  : ["text/plain"],
        getData: () => "",
      } as unknown as DataTransfer)
    ).toEqual({
      blocks: [""],
      text  : "",
    });
  });

  test("text/html from elsewhere pastes as the blocks its elements make; the provider's own copy pastes its markdown", () => {
    const transfer = (parts: Record<string, string>) =>
      ({
        types  : Object.keys(parts),
        getData: (t: string) => parts[t] ?? "",
      }) as unknown as DataTransfer;

    const web = transfer({
      "text/html":
        '<html><head><style>p { color: red }</style></head><body><!--StartFragment--><h1>Title</h1>\n\n<p>Some <b>bold</b> and <a href="http://x.test">a link</a></p>\n<ul><li>one</li><li>two</li></ul><!--EndFragment--></body></html>',
      "text/plain": "Title\nSome bold and a link\none\ntwo",
    });
    expect(provider.fromClipboard(web)).toEqual({
      blocks: ["# Title", "Some **bold** and [a link](http://x.test)", "- one", "- two"],
      text  : "Title\nSome bold and a link\none\ntwo",
    });

    const own = provider.toClipboard(parse(), range("b1", 0, "b2", 5));
    expect(
      provider.fromClipboard(
        transfer({ "text/html": own.html ?? "", "text/plain": own.text ?? "" })
      )
    ).toEqual({ blocks: ["# Heading", "A *par*"], text: "# Heading\nA *par*" });

    expect(provider.fromClipboard(transfer({ "text/html": "<p>only html</p>" }))).toEqual({
      blocks: ["only html"],
      text  : "only html",
    });
  });

  test("insertContent splices the first entry inline and makes blocks of the rest", () => {
    const doc = parse("hello world\n");
    const content = { blocks: ["**in**", "- item", "  - deeper", "tail"] };
    const result = applyAndUndo(doc, {
      type: "insertContent",
      at  : caret("b0", 5),
      content,
      newBlocks: ["n1", "n2", "n3"],
    });
    expect(texts(doc)).toEqual(["helloin", "item", "deeper", "tail world"]);
    expect(kinds(doc)).toEqual(["paragraph", "listItem", "listItem", "paragraph"]);
    expect(block(doc, "n2")).toMatchObject({ depth: 1 });
    expect(marks(doc.blocks[0])).toEqual([["bold", 5, 7]]);
    expect(result).toEqual({
      dirtyBlocks  : ["b0", "n1", "n2", "n3"],
      removedBlocks: [],
      selection    : caret("n3", 4),
    });
  });

  test("an empty paragraph takes the kind of a single pasted block", () => {
    const empty = (): MdDoc => ({ blocks: [mdBlock("b0", { kind: "paragraph" })] });
    const doc = empty();
    provider.applyEdit(doc, {
      type     : "insertContent",
      at       : caret("b0", 0),
      content  : { blocks: ["## Two"] },
      newBlocks: [],
    });
    expect(doc.blocks[0]).toMatchObject({ kind: "heading", level: 2, text: "Two" });

    const rule = empty();
    provider.applyEdit(rule, {
      type     : "insertContent",
      at       : caret("b0", 0),
      content  : { blocks: ["---"] },
      newBlocks: [],
    });
    expect(rule.blocks[0]).toMatchObject({ kind: "hr", id: "b0" });
  });

  test("pasting into a fence inserts the text verbatim", () => {
    const doc = parse("```\nab\n```\n");
    const content = {
      blocks: ["# not a heading", "- nor a list"],
      text  : "# not a heading\n\n- nor a list",
    };
    const result = provider.applyEdit(doc, {
      type: "insertContent",
      at  : caret("b0", 1),
      content,
      newBlocks: ["n1"],
    });
    expect(doc.blocks).toHaveLength(1);
    expect(doc.blocks[0].text).toBe("a# not a heading\n\n- nor a listb");
    expect(result.selection).toEqual(caret("b0", 30));
  });

  test("an opaque last entry keeps the caret's tail on the entry before it", () => {
    const doc = parse("hello world\n");
    provider.applyEdit(doc, {
      type     : "insertContent",
      at       : caret("b0", 5),
      content  : { blocks: ["one", "two", "---"] },
      newBlocks: ["n1", "n2"],
    });
    expect(texts(doc)).toEqual(["helloone", "two world", ""]);
    expect(kinds(doc)).toEqual(["paragraph", "paragraph", "hr"]);
  });

  test("emitDocFile is text/markdown", async () => {
    const doc = parse();
    const blob = provider.emitDocFile(doc);
    expect(blob.type).toBe("text/markdown");
    expect(await blob.text()).toBe(SOURCE);
  });
});

describe("inverse and snapshots", () => {
  test("a custom op's inverse restores the whole span between its blocks", () => {
    const doc = parse();
    const inverse = provider.inverse(doc, {
      type  : "custom",
      name  : "x",
      blocks: ["b4", "b2"],
      data  : {},
    });
    expect(inverse).toMatchObject({
      type  : "replaceBlocks",
      after : "b1",
      remove: ["b2", "b3", "b4"],
    });
    expect(inverse.type === "replaceBlocks" && inverse.blocks.map((s) => s.id)).toEqual([
      "b2",
      "b3",
      "b4",
    ]);
  });

  test("snapshots are deep copies and a foreign snapshot is refused", () => {
    const doc = parse();
    const [snap] = provider.snapshots(doc, ["b12"]);
    (snap.state as MdBlock).atoms[0].image!.alt = "changed";
    expect(block(doc, "b12").atoms[0].image!.alt).toBe("alt");

    expect(() =>
      provider.applyEdit(doc, {
        type  : "replaceBlocks",
        after : null,
        blocks: [{ id: "z", state: { text: "x" } }],
        remove: [],
      })
    ).toThrow(/not an MdBlock/);
  });

  test("onExternalChange delivers notifyChange", () => {
    const doc = parse();
    const listener = vi.fn();
    const off = provider.onExternalChange(doc, listener);
    provider.notifyChange(doc, { dirtyBlocks: ["b1"], removedBlocks: [] });
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    provider.notifyChange(doc, { dirtyBlocks: ["b1"], removedBlocks: [] });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("renderBlock", () => {
  const doc = parse();
  const { ctx, dispatched, clicked, editor } = fakeCtx();

  test("each kind gets its element", () => {
    const tags = doc.blocks.map((b) => {
      const el = provider.renderBlock(doc, b.id, ctx);
      expect(el.getAttribute("data-doc-block")).toBe(b.id);
      return `${el.tagName.toLowerCase()}${el.className === "" ? "" : `.${el.className.replace(/ /g, ".")}`}`;
    });
    expect(tags).toEqual([
      "div.md-frontmatter.md-opaque",
      "h1",
      "p",
      "div.md-li",
      "div.md-li",
      "div.md-li",
      "div.md-li",
      "div.md-quote",
      "pre.md-code",
      "div.md-hr.md-opaque",
      "div.md-table.md-opaque",
      "div.md-raw.md-opaque",
      "p",
    ]);
  });

  test("opaque blocks are contenteditable=false with one child", () => {
    for (const id of ["b0", "b9", "b10", "b11"]) {
      const el = provider.renderBlock(doc, id, ctx);
      expect(el.getAttribute("contenteditable")).toBe("false");
      expect(el.childNodes).toHaveLength(1);
    }
    expect(provider.renderBlock(doc, "b11", ctx).textContent).toBe('<video src="c.mp4" controls>');
    expect(provider.renderBlock(doc, "b0", ctx).textContent).toBe("---\ntitle: Test\n---");
  });

  test("inline marks, a link that reports its click, and an atom between caret slots", () => {
    const p = provider.renderBlock(doc, "b2", ctx);
    expect(p.innerHTML).toBe(
      'A <em>paragraph</em> with <strong>bold</strong> and a <a data-link-kind="url" data-link-target="http://x.test" href="http://x.test">link</a>.'
    );
    p.querySelector("a")!.click();
    expect(clicked).toEqual([
      { kind: "url", target: "http://x.test", text: "link", range: range("b2", 28, "b2", 32) },
    ]);

    const img = provider.renderBlock(doc, "b12", ctx);
    const atom = img.querySelector("[data-doc-atom]")!;
    expect(atom.getAttribute("contenteditable")).toBe("false");
    expect(atom.previousSibling?.textContent).toBe(CARET_SLOT);
    expect(atom.nextSibling?.textContent).toBe(CARET_SLOT);
    const widget = atom.querySelector("md-image-x") as MdImageWidget | null;
    expect(widget?.img.getAttribute("src")).toBe("pic.png");
    expect(widget?.block).toBe("b12");
    expect(widget?.offset).toBe(doc.blocks[12].atoms[0].offset);
  });

  test("list items carry depth and order, and the task box dispatches setTask", () => {
    const nested = provider.renderBlock(doc, "b5", ctx);
    expect(nested.getAttribute("data-md-ordered")).toBe("true");
    expect(nested.getAttribute("data-md-depth")).toBe("1");
    expect(nested.style.getPropertyValue("--md-depth")).toBe("1");

    const task = provider.renderBlock(doc, "b6", ctx);
    const box = task.querySelector("input")!;
    expect(box.getAttribute("contenteditable")).toBe("false");
    expect(box.checked).toBe(false);
    expect(box.childNodes).toHaveLength(0);
    box.click();
    expect(dispatched).toEqual([
      { type: "custom", name: "setTask", blocks: ["b6"], data: { checked: true } },
    ]);

    editor.readOnly = true;
    box.click();
    expect(dispatched).toHaveLength(1);
    editor.readOnly = false;
  });

  test("a fence keeps its newlines and ends in a <br> when the text does", () => {
    const pre = provider.renderBlock(doc, "b8", ctx);
    expect(pre.getAttribute("data-md-lang")).toBe("js");
    expect(pre.textContent).toBe("let a = 1;\nlet b = 2;");
    expect(pre.querySelector("br")).toBeNull();

    const trailing = parse("```\nx\n\n```\n");
    const el = provider.renderBlock(trailing, "b0", ctx);
    expect(el.lastElementChild?.tagName).toBe("BR");

    const empty = parse("```\n```\n");
    expect(provider.renderBlock(empty, "b0", ctx).textContent).toBe(CARET_SLOT);
  });

  test("a table renders its cells with inline markdown", () => {
    const table = provider.renderBlock(doc, "b10", ctx).querySelector("table")!;
    expect(table.querySelectorAll("th").length).toBe(2);
    expect(table.querySelectorAll("td").length).toBe(2);
    expect(table.textContent).toBe("ab12");
  });

  test("a source-carried style and attribute survive sanitized, a reserved one does not", () => {
    const styled = parse(
      '<p style="color: red; behavior: url(x)" class="md-raw fancy" data-doc-block="z">hi</p>\n'
    );
    const el = provider.renderBlock(styled, "b0", ctx);
    expect(el.getAttribute("style")).toBe("color: red");
    expect(el.getAttribute("class")).toBe("fancy");
    expect(el.getAttribute("data-doc-block")).toBe("b0");

    const unsafe = parse("[x](javascript:alert(1))\n");
    expect(provider.renderBlock(unsafe, "b0", ctx).querySelector("a")?.hasAttribute("href")).toBe(
      false
    );
  });

  test("styles cover the list counters for every depth", () => {
    const css = provider.styles();
    expect(css).toContain("counter(md-ol-0)");
    expect(css).toContain("counter(md-ol-7)");
    expect(css).toContain("--richtext-link-color");
    expect(markdownStyles()).toBe(css);
  });
});

describe("setLinkOp", () => {
  test("carries the link edit as a setLink op over the range's block", () => {
    const edit = { range: range("b2", 2, "b2", 11), kind: "url" as const, target: "old" };
    expect(setLinkOp(edit, "http://y.test")).toEqual({
      type  : "custom",
      name  : "setLink",
      blocks: ["b2"],
      data  : { from: 2, to: 11, target: "http://y.test", kind: "url", selection: edit.range },
    });
    const titled = setLinkOp({ ...edit, range: range("b2", 11, "b2", 2), title: "t" }, "z");
    expect(titled).toMatchObject({ data: { from: 2, to: 11, target: "z", title: "t" } });
    expect(setLinkOp({ ...edit, title: "t" }, "")).not.toMatchObject({ data: { title: "t" } });
  });

  test("a setLink op from the popup applies through the provider", () => {
    const doc = parse();
    const op = setLinkOp(
      { range: range("b2", 2, "b2", 11), kind: "url", target: "" },
      "http://y.test"
    );
    provider.applyEdit(doc, op);
    expect(marks(block(doc, "b2"))).toContainEqual(["link", 2, 11]);
    provider.applyEdit(
      doc,
      setLinkOp({ range: range("b2", 2, "b2", 11), kind: "url", target: "" }, "")
    );
    expect(marks(block(doc, "b2"))).not.toContainEqual(["link", 2, 11]);
  });
});

describe("buildToolbar", () => {
  /** Builds the toolbar the way the editor does and hands back its parts by test id. */
  function toolbar(doc: MdDoc) {
    const fake = fakeCtx();
    const row = UIBase.createElement<RowFrame<ProviderContext>>("rowframe-x");
    row.ctx = fake.ctx;
    const sync = provider.buildToolbar(row, fake.ctx);
    row.checkInit();
    document.body.append(row);
    const part = <T extends HTMLElement>(id: string) => {
      const el = row.shadowRoot?.querySelector(`[data-testid="${id}"]`) as T | null;
      if (el === null || el === undefined) {
        throw new Error(`no ${id}`);
      }
      return el;
    };
    const select = (r: DocRange) => {
      fake.editor.select(r);
      sync(doc, r);
    };
    return {
      ...fake,
      row,
      sync,
      select,
      kinds : part<UIBase & { value: string; on_select?: (id: string) => void }>("richtext-kind"),
      button: (id: string) => part<ToolButton>(id),
    };
  }

  test("the kind dropdown and list buttons follow the head block", () => {
    const doc = parse();
    const t = toolbar(doc);
    expect(t.kinds.value).toBe("paragraph");

    t.select(caret("b1", 1));
    expect(t.kinds.value).toBe("heading1");
    t.select(caret("b3", 1));
    expect(t.kinds.value).toBe("paragraph");
    expect(t.button("richtext-list-bullet").active).toBe(true);
    expect(t.button("richtext-list-numbered").active).toBe(false);
    t.select(caret("b5", 1));
    expect(t.button("richtext-list-numbered").active).toBe(true);
    t.select(caret("b6", 1));
    expect(t.button("richtext-list-task").active).toBe(true);
    t.select(caret("b8", 1));
    expect(t.kinds.value).toBe("code");
    t.sync(doc, undefined);
    expect(t.kinds.value).toBe("paragraph");
    expect(t.button("richtext-list-task").active).toBe(false);
    t.row.remove();
  });

  test("a list button dispatches setKind over the editable span, and undoes itself when lit", () => {
    const doc = parse();
    const t = toolbar(doc);
    t.select(range("b2", 0, "b3", 1));
    t.button("richtext-list-bullet").click();
    expect(t.dispatched).toEqual([
      {
        type  : "custom",
        name  : "setKind",
        blocks: ["b2", "b3"],
        data: {
          kind     : "listItem",
          ordered  : false,
          task     : false,
          selection: range("b2", 0, "b3", 1),
        },
      },
    ]);

    t.select(caret("b3", 1));
    t.button("richtext-list-bullet").click();
    expect(t.dispatched[1]).toMatchObject({ blocks: ["b3"], data: { kind: "paragraph" } });

    // a fence leaving code needs a fresh id per extra line
    t.select(caret("b8", 0));
    t.button("richtext-list-numbered").click();
    expect(t.dispatched[2]).toMatchObject({ data: { ids: [expect.any(String)] } });

    t.select(caret("b11", 0));
    t.button("richtext-list-numbered").click();
    expect(t.dispatched).toHaveLength(3);

    t.select(caret("b2", 0));
    t.kinds.on_select?.("heading2");
    expect(t.dispatched[3]).toMatchObject({ blocks: ["b2"], data: { kind: "heading", level: 2 } });
    t.row.remove();
  });

  test("the link button lights inside a link and opens nothing over a collapsed selection", () => {
    const doc = parse();
    const t = toolbar(doc);
    const link = t.button("richtext-link");
    t.select(caret("b2", 30));
    expect(link.active).toBe(true);
    t.select(caret("b2", 3));
    expect(link.active).toBe(false);

    link.click();
    expect(t.dispatched).toEqual([]);
    expect(document.querySelector("link-popup-x")).toBeNull();
    t.row.remove();
  });
});

describe("the format registry", () => {
  test("importing the markdown module registers the markdown format next to plain", () => {
    const md = RichTextArea.format("markdown")!;
    expect(md.provider()).toBeInstanceOf(MarkdownProvider);
    const doc = md.fromText("# Hi\n") as MdDoc;
    expect(doc.blocks[0]).toMatchObject({ kind: "heading", text: "Hi" });
    expect(md.toText(doc)).toBe("# Hi\n");

    const plain = RichTextArea.format("plain")!;
    expect(plain.toText(plain.fromText("a\r\nb"))).toBe("a\nb");
    expect(RichTextArea.format("nope")).toBeUndefined();
  });
});
