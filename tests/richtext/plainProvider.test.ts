import { describe, expect, test, vi } from "vitest";
import {
  CARET_SLOT,
  type DocRange,
  type EditOp,
  type ProviderContext,
} from "../../scripts/widgets/richtext/provider";
import {
  PlainProvider,
  plainDocFromLines,
  type PlainDoc,
} from "../../scripts/widgets/richtext/providers/plain";

const fixture = (): PlainDoc => ({
  blocks: [
    { id: "a", text: "Hello world", marks: [{ from: 0, to: 5, name: "bold" }] },
    { id: "b", text: "second line", marks: [{ from: 7, to: 11, name: "italic" }] },
    { id: "c", text: "third", marks: [] },
  ],
});

const pos = (block: string, offset: number) => ({ block, offset });
const range = (a: string, ao: number, h: string, ho: number): DocRange => ({
  anchor: pos(a, ao),
  head  : pos(h, ho),
});
const caret = (block: string, offset: number) => range(block, offset, block, offset);
const mark = (from: number, to: number, name: string) => ({ from, to, name });

const provider = new PlainProvider();
const ctx = undefined as unknown as ProviderContext;

describe("reading", () => {
  test("blocks, text, opacity and marks", () => {
    const doc = fixture();
    expect(provider.blocks(doc)).toEqual(["a", "b", "c"]);
    expect(provider.blockText(doc, "b")).toBe("second line");
    expect(provider.isOpaque(doc, "a")).toBe(false);
    expect(provider.marks().map((m) => m.name)).toEqual([
      "bold",
      "italic",
      "underline",
      "strikethrough",
    ]);
    expect(() => provider.blockText(doc, "nope")).toThrow(/unknown block nope/);
  });

  test("plainDocFromLines", () => {
    const doc = plainDocFromLines(["one", "two"], (i) => `l${i}`);
    expect(doc).toEqual({
      blocks: [
        { id: "l0", text: "one", marks: [] },
        { id: "l1", text: "two", marks: [] },
      ],
    });
  });
});

describe("insertText", () => {
  test("typing at the end of a mark extends it", () => {
    const doc = fixture();
    const result = provider.applyEdit(doc, { type: "insertText", at: caret("a", 5), text: "!!" });

    expect(doc.blocks[0]).toEqual({ id: "a", text: "Hello!! world", marks: [mark(0, 7, "bold")] });
    expect(result).toEqual({ dirtyBlocks: ["a"], removedBlocks: [], selection: caret("a", 7) });
  });

  test("typing at the start of a mark leaves the new text unmarked", () => {
    const doc = fixture();
    const result = provider.applyEdit(doc, { type: "insertText", at: caret("a", 0), text: "x" });

    expect(doc.blocks[0]).toEqual({ id: "a", text: "xHello world", marks: [mark(1, 6, "bold")] });
    expect(result.selection).toEqual(caret("a", 1));
  });

  test("a non-collapsed range is replaced", () => {
    const doc = fixture();
    const result = provider.applyEdit(doc, {
      type: "insertText",
      at  : range("a", 6, "a", 11),
      text: "there",
    });

    expect(doc.blocks[0]).toEqual({ id: "a", text: "Hello there", marks: [mark(0, 5, "bold")] });
    expect(result.selection).toEqual(caret("a", 11));
  });

  test("a range across blocks joins them before inserting", () => {
    const doc = fixture();
    const result = provider.applyEdit(doc, {
      type: "insertText",
      at  : range("a", 6, "c", 2),
      text: "X",
    });

    expect(provider.blocks(doc)).toEqual(["a"]);
    expect(doc.blocks[0].text).toBe("Hello Xird");
    expect(result).toEqual({
      dirtyBlocks  : ["a"],
      removedBlocks: ["b", "c"],
      selection    : caret("a", 7),
    });
  });
});

describe("deleteRange", () => {
  test("within a block, shrinking the mark it cuts into", () => {
    const doc = fixture();
    const result = provider.applyEdit(doc, { type: "deleteRange", range: range("a", 1, "a", 4) });

    expect(doc.blocks[0]).toEqual({ id: "a", text: "Ho world", marks: [mark(0, 2, "bold")] });
    expect(result).toEqual({ dirtyBlocks: ["a"], removedBlocks: [], selection: caret("a", 1) });
  });

  test("across three blocks joins the outer two, in either direction", () => {
    for (const r of [range("a", 6, "c", 2), range("c", 2, "a", 6)]) {
      const doc = fixture();
      const result = provider.applyEdit(doc, { type: "deleteRange", range: r });

      expect(doc.blocks).toEqual([{ id: "a", text: "Hello ird", marks: [mark(0, 5, "bold")] }]);
      expect(result).toEqual({
        dirtyBlocks  : ["a"],
        removedBlocks: ["b", "c"],
        selection    : caret("a", 6),
      });
    }
  });

  test("carries the tail block's marks into the joined block", () => {
    const doc = fixture();
    provider.applyEdit(doc, { type: "deleteRange", range: range("a", 2, "b", 8) });

    expect(doc.blocks[0]).toEqual({
      id   : "a",
      text : "Heine",
      marks: [mark(0, 2, "bold"), mark(2, 5, "italic")],
    });
  });

  test("a collapsed range changes nothing", () => {
    const doc = fixture();
    const result = provider.applyEdit(doc, { type: "deleteRange", range: caret("b", 3) });

    expect(doc).toEqual(fixture());
    expect(result).toEqual({ dirtyBlocks: [], removedBlocks: [], selection: caret("b", 3) });
  });
});

describe("splitBlock and joinWithPrevious", () => {
  test("split moves the tail into the new block", () => {
    const doc = fixture();
    const result = provider.applyEdit(doc, { type: "splitBlock", at: pos("a", 5), newBlock: "d" });

    expect(provider.blocks(doc)).toEqual(["a", "d", "b", "c"]);
    expect(doc.blocks[0]).toEqual({ id: "a", text: "Hello", marks: [mark(0, 5, "bold")] });
    expect(doc.blocks[1]).toEqual({ id: "d", text: " world", marks: [] });
    expect(result).toEqual({
      dirtyBlocks  : ["a", "d"],
      removedBlocks: [],
      selection    : caret("d", 0),
    });
  });

  test("split inside a mark leaves a piece on each side", () => {
    const doc = fixture();
    provider.applyEdit(doc, { type: "splitBlock", at: pos("b", 9), newBlock: "d" });

    expect(doc.blocks[1]).toEqual({ id: "b", text: "second li", marks: [mark(7, 9, "italic")] });
    expect(doc.blocks[2]).toEqual({ id: "d", text: "ne", marks: [mark(0, 2, "italic")] });
  });

  test("split refuses an id already in use", () => {
    expect(() =>
      provider.applyEdit(fixture(), { type: "splitBlock", at: pos("a", 1), newBlock: "c" })
    ).toThrow(/already in use/);
  });

  test("join appends to the previous block and shifts its marks", () => {
    const doc = fixture();
    const result = provider.applyEdit(doc, { type: "joinWithPrevious", block: "b" });

    expect(provider.blocks(doc)).toEqual(["a", "c"]);
    expect(doc.blocks[0]).toEqual({
      id   : "a",
      text : "Hello worldsecond line",
      marks: [mark(0, 5, "bold"), mark(18, 22, "italic")],
    });
    expect(result).toEqual({ dirtyBlocks: ["a"], removedBlocks: ["b"], selection: caret("a", 11) });
  });

  test("join on the first block is a no-op", () => {
    const doc = fixture();
    const result = provider.applyEdit(doc, { type: "joinWithPrevious", block: "a" });

    expect(doc).toEqual(fixture());
    expect(result).toEqual({ dirtyBlocks: [], removedBlocks: [], selection: caret("a", 0) });
  });
});

describe("toggleMark", () => {
  test("adds a mark, keeping a non-adjacent run separate", () => {
    const doc = fixture();
    const r = range("a", 6, "a", 11);
    const result = provider.applyEdit(doc, { type: "toggleMark", range: r, mark: "bold" });

    expect(doc.blocks[0].marks).toEqual([mark(0, 5, "bold"), mark(6, 11, "bold")]);
    expect(result).toEqual({ dirtyBlocks: ["a"], removedBlocks: [], selection: r });
  });

  test("merges with an overlapping run", () => {
    const doc = fixture();
    provider.applyEdit(doc, { type: "toggleMark", range: range("a", 3, "a", 8), mark: "bold" });

    expect(doc.blocks[0].marks).toEqual([mark(0, 8, "bold")]);
  });

  test("removes a mark the whole range already has", () => {
    const doc = fixture();
    provider.applyEdit(doc, { type: "toggleMark", range: range("a", 0, "a", 5), mark: "bold" });

    expect(doc.blocks[0].marks).toEqual([]);
  });

  test("removing over a sub-range splits the mark", () => {
    const doc = fixture();
    provider.applyEdit(doc, { type: "toggleMark", range: range("a", 1, "a", 3), mark: "bold" });

    expect(doc.blocks[0].marks).toEqual([mark(0, 1, "bold"), mark(3, 5, "bold")]);
  });

  test("spans blocks", () => {
    const doc = fixture();
    const result = provider.applyEdit(doc, {
      type : "toggleMark",
      range: range("a", 6, "b", 6),
      mark : "underline",
    });

    expect(doc.blocks[0].marks).toEqual([mark(0, 5, "bold"), mark(6, 11, "underline")]);
    expect(doc.blocks[1].marks).toEqual([mark(0, 6, "underline"), mark(7, 11, "italic")]);
    expect(result.dirtyBlocks).toEqual(["a", "b"]);
  });

  test("a collapsed range is a no-op", () => {
    const doc = fixture();
    const result = provider.applyEdit(doc, {
      type : "toggleMark",
      range: caret("a", 2),
      mark : "bold",
    });

    expect(doc).toEqual(fixture());
    expect(result.dirtyBlocks).toEqual([]);
  });
});

describe("insertContent", () => {
  test("one line lands in the block at the caret, unmarked", () => {
    const doc = fixture();
    const result = provider.applyEdit(doc, {
      type     : "insertContent",
      at       : caret("a", 5),
      content  : { blocks: ["XYZ"] },
      newBlocks: [],
    });

    expect(doc.blocks[0]).toEqual({ id: "a", text: "HelloXYZ world", marks: [mark(0, 5, "bold")] });
    expect(result).toEqual({ dirtyBlocks: ["a"], removedBlocks: [], selection: caret("a", 8) });
  });

  test("one line inside a mark splits the mark around it", () => {
    const doc = fixture();
    provider.applyEdit(doc, {
      type     : "insertContent",
      at       : caret("a", 2),
      content  : { blocks: ["--"] },
      newBlocks: [],
    });

    expect(doc.blocks[0]).toEqual({
      id   : "a",
      text : "He--llo world",
      marks: [mark(0, 2, "bold"), mark(4, 7, "bold")],
    });
  });

  test("three lines make two new blocks with the pre-allocated ids", () => {
    const doc = fixture();
    const result = provider.applyEdit(doc, {
      type     : "insertContent",
      at       : caret("b", 6),
      content  : { blocks: ["X", "Y", "Z"] },
      newBlocks: ["n1", "n2"],
    });

    expect(provider.blocks(doc)).toEqual(["a", "b", "n1", "n2", "c"]);
    expect(doc.blocks[1]).toEqual({ id: "b", text: "secondX", marks: [] });
    expect(doc.blocks[2]).toEqual({ id: "n1", text: "Y", marks: [] });
    expect(doc.blocks[3]).toEqual({ id: "n2", text: "Z line", marks: [mark(2, 6, "italic")] });
    expect(result).toEqual({
      dirtyBlocks  : ["b", "n1", "n2"],
      removedBlocks: [],
      selection    : caret("n2", 1),
    });
  });

  test("refuses the wrong number of ids", () => {
    expect(() =>
      provider.applyEdit(fixture(), {
        type     : "insertContent",
        at       : caret("a", 0),
        content  : { blocks: ["x", "y"] },
        newBlocks: [],
      })
    ).toThrow(/new ids/);
  });
});

describe("replaceBlocks", () => {
  test("removes and restores in one step", () => {
    const doc = fixture();
    const result = provider.applyEdit(doc, {
      type  : "replaceBlocks",
      after : "a",
      blocks: [{ id: "z", state: { id: "z", text: "zed", marks: [] } }],
      remove: ["b"],
    });

    expect(provider.blocks(doc)).toEqual(["a", "z", "c"]);
    expect(result).toEqual({ dirtyBlocks: ["z"], removedBlocks: ["b"], selection: caret("z", 3) });
  });

  test("a pure removal puts the caret at the start of the block that follows", () => {
    const doc = fixture();
    const result = provider.applyEdit(doc, {
      type  : "replaceBlocks",
      after : "a",
      blocks: [],
      remove: ["b"],
    });

    expect(provider.blocks(doc)).toEqual(["a", "c"]);
    expect(result).toEqual({ dirtyBlocks: [], removedBlocks: ["b"], selection: caret("c", 0) });
  });

  test("a null anchor places the blocks at the start", () => {
    const doc = fixture();
    provider.applyEdit(doc, {
      type  : "replaceBlocks",
      after : null,
      blocks: [{ id: "z", state: { id: "z", text: "", marks: [] } }],
      remove: [],
    });

    expect(provider.blocks(doc)).toEqual(["z", "a", "b", "c"]);
  });

  test("rejects a snapshot that is not a PlainBlock", () => {
    expect(() =>
      provider.applyEdit(fixture(), {
        type  : "replaceBlocks",
        after : null,
        blocks: [{ id: "z", state: 42 }],
        remove: [],
      })
    ).toThrow(/not a PlainBlock/);
  });
});

describe("inverse", () => {
  const ops: EditOp[] = [
    { type: "insertText", at: caret("a", 5), text: "!!" },
    { type: "insertText", at: range("a", 6, "c", 2), text: "X" },
    { type: "deleteRange", range: range("a", 1, "a", 4) },
    { type: "deleteRange", range: range("c", 2, "a", 6) },
    { type: "splitBlock", at: pos("b", 9), newBlock: "d" },
    { type: "joinWithPrevious", block: "b" },
    { type: "joinWithPrevious", block: "a" },
    { type: "toggleMark", range: range("a", 3, "b", 3), mark: "underline" },
    { type: "toggleMark", range: range("a", 0, "a", 5), mark: "bold" },
    {
      type     : "insertContent",
      at       : caret("b", 6),
      content  : { blocks: ["X", "Y", "Z"] },
      newBlocks: ["n1", "n2"],
    },
    {
      type     : "insertContent",
      at       : range("a", 2, "b", 2),
      content  : { blocks: ["Q"] },
      newBlocks: [],
    },
    {
      type  : "replaceBlocks",
      after : "a",
      blocks: [{ id: "z", state: { id: "z", text: "zed", marks: [] } }],
      remove: ["b"],
    },
    { type: "replaceBlocks", after: null, blocks: [], remove: ["a"] },
  ];

  test.each(ops)("round-trips %j", (op) => {
    const doc = fixture();
    const inverse = provider.inverse(doc, op);

    expect(inverse.type).toBe("replaceBlocks");
    provider.applyEdit(doc, op);
    expect(doc).not.toEqual(fixture().blocks.length === 0 ? undefined : null);
    provider.applyEdit(doc, inverse);
    expect(doc).toEqual(fixture());
  });

  test("is a snapshot of the touched blocks", () => {
    const doc = fixture();
    const inverse = provider.inverse(doc, { type: "splitBlock", at: pos("b", 2), newBlock: "d" });

    expect(inverse).toEqual({
      type  : "replaceBlocks",
      after : "a",
      blocks: [{ id: "b", state: fixture().blocks[1] }],
      remove: ["b", "d"],
    });
  });
});

describe("snapshots and emitDocFile", () => {
  test("snapshots covers the named blocks, or the whole document", () => {
    const doc = fixture();
    expect(provider.snapshots(doc, ["b"])).toEqual([{ id: "b", state: fixture().blocks[1] }]);
    expect(provider.snapshots(doc).map((s) => s.id)).toEqual(["a", "b", "c"]);
    expect(provider.snapshots(doc)[0].state).not.toBe(doc.blocks[0]);
  });

  test("emitDocFile is the texts joined by newlines as text/plain", async () => {
    const blob = provider.emitDocFile(fixture());
    expect(blob.type).toBe("text/plain");
    expect(await blob.text()).toBe(["Hello world", "second line", "third"].join("\n"));
  });

  test("a custom op's inverse snapshots its span and the provider refuses to apply it", () => {
    const doc = fixture();
    const op: EditOp = { type: "custom", name: "nope", blocks: ["a", "b"], data: null };

    expect(provider.inverse(doc, op)).toEqual({
      type  : "replaceBlocks",
      after : null,
      blocks: [
        { id: "a", state: fixture().blocks[0] },
        { id: "b", state: fixture().blocks[1] },
      ],
      remove: ["a", "b"],
    });
    expect(() => provider.applyEdit(doc, op)).toThrow(/unknown custom op nope/);
  });
});

describe("clipboard", () => {
  test("toClipboard slices the outer blocks, in either direction", () => {
    const doc = fixture();
    expect(provider.toClipboard(doc, range("a", 6, "c", 2))).toEqual({
      blocks: ["world", "second line", "th"],
    });
    expect(provider.toClipboard(doc, range("c", 2, "a", 6))).toEqual({
      blocks: ["world", "second line", "th"],
    });
    expect(provider.toClipboard(doc, range("a", 0, "a", 5))).toEqual({ blocks: ["Hello"] });
  });

  test("fromClipboard splits text/plain on any newline and refuses anything else", () => {
    const text = { types: ["text/plain"], getData: () => "x\r\ny\nz" } as unknown as DataTransfer;
    expect(provider.fromClipboard(text)).toEqual({ blocks: ["x", "y", "z"] });

    const html = { types: ["text/html"], getData: () => "<b>x</b>" } as unknown as DataTransfer;
    expect(provider.fromClipboard(html)).toBeUndefined();
  });
});

describe("onExternalChange", () => {
  test("delivers to every listener until unsubscribed", () => {
    const doc = fixture();
    const first = vi.fn();
    const second = vi.fn();
    const off = provider.onExternalChange(doc, first);
    provider.onExternalChange(doc, second);
    const change = { dirtyBlocks: ["a"], removedBlocks: [] };

    provider.notifyChange(doc, change);
    off();
    provider.notifyChange(doc, change);
    provider.notifyChange(fixture(), change);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledWith(change);
  });
});

describe("renderBlock", () => {
  test("wraps marked runs in their elements", () => {
    const el = provider.renderBlock(fixture(), "a", ctx);
    expect(el.outerHTML).toBe('<p data-doc-block="a"><b>Hello</b> world</p>');
  });

  test("nests overlapping marks with the first mark outermost", () => {
    const doc: PlainDoc = {
      blocks: [
        {
          id   : "a",
          text : "Hello world",
          marks: [mark(0, 5, "bold"), mark(3, 8, "italic")],
        },
      ],
    };
    const el = provider.renderBlock(doc, "a", ctx);
    expect(el.innerHTML).toBe("<b>Hel</b><b><i>lo</i></b><i> wo</i>rld");
    expect(el.textContent).toBe("Hello world");
  });

  test("an empty block holds one caret slot", () => {
    const doc = plainDocFromLines([""], () => "e");
    const el = provider.renderBlock(doc, "e", ctx);
    expect(el.textContent).toBe(CARET_SLOT);
  });

  test("an unknown mark becomes a tagged span", () => {
    const doc: PlainDoc = {
      blocks: [{ id: "a", text: "abc", marks: [mark(1, 2, "highlight")] }],
    };
    const el = provider.renderBlock(doc, "a", ctx);
    expect(el.innerHTML).toBe('a<span data-doc-mark="highlight">b</span>c');
  });
});
