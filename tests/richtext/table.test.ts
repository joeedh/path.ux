import { describe, expect, test } from "vitest";
import { MarkdownProvider } from "../../scripts/widgets/richtext/providers/markdown_provider";
import { markdownDocFromText } from "../../scripts/widgets/richtext/providers/markdown_parse";
import { markdownText } from "../../scripts/widgets/richtext/providers/markdown_serialize";
import { markdownOps } from "../../scripts/widgets/richtext/providers/markdown_ops";
import {
  parseMarkdownTable,
  serializeMarkdownTable,
  tableCommand,
} from "../../scripts/widgets/richtext/providers/markdown_table";
import { changeTable } from "../../scripts/widgets/richtext/table_model";
import type { TableChange } from "../../scripts/widgets/richtext/table_model";
import { DocumentSession } from "../../scripts/widgets/richtext/context";
import { ToolStack } from "../../scripts/path-controller/toolsys/toolstack";

const SOURCE =
  "| **Name** | Value |\n| :--- | ---: |\n| *first* | `a\\|b` |\n| [link](https://example.com) | |";

function setup(source = SOURCE) {
  const doc = markdownDocFromText(source);
  const provider = new MarkdownProvider();
  const stack = new ToolStack();
  const ctx = {
    api      : {} as never,
    screen   : {} as never,
    state    : {},
    toolstack: stack,
    toLocked() {
      return this;
    },
  };
  const session = new DocumentSession(doc, provider, stack);
  const block = doc.blocks[0].id;
  return { doc, provider, stack, ctx, session, block };
}

describe("GFM table source", () => {
  test("retains inline source, header, alignment, escaped pipes and empty values", () => {
    const model = parseMarkdownTable(SOURCE)!;
    expect(model).toEqual({
      rows: [
        ["**Name**", "Value"],
        ["*first*", "`a\\|b`"],
        ["[link](https://example.com)", ""],
      ],
      align: ["left", "right"],
    });
    expect(parseMarkdownTable(serializeMarkdownTable(model))).toEqual(model);
    expect(markdownText(markdownDocFromText(SOURCE)).trim()).toBe(SOURCE);
  });
  test.each([
    "a|b",
    "`a|b`",
    "**strong** and ~~old~~",
    "<https://example.com>",
    "back\\",
    "\\*literal\\*",
  ])("encodes %s as one cell without losing supported syntax", (value) => {
    const model = changeTable(parseMarkdownTable(SOURCE)!, {
      type  : "cell",
      row   : 1,
      column: 1,
      value,
    });
    const saved = serializeMarkdownTable(model);
    expect(parseMarkdownTable(saved)?.rows).toHaveLength(3);
    expect(parseMarkdownTable(saved)?.rows[1]).toHaveLength(2);
  });
  test.each(["<b>html</b>", "![image](data:image/png,x)", "[ref][id]", "line\nbreak"])(
    "refuses unsupported newly entered %s",
    (value) => {
      const model = changeTable(parseMarkdownTable(SOURCE)!, {
        type  : "cell",
        row   : 1,
        column: 1,
        value,
      });
      // Unresolved references are ordinary literal text under GFM and remain editable
      if (value === "[ref][id]") expect(serializeMarkdownTable(model)).toContain(value);
      else expect(() => serializeMarkdownTable(model)).toThrow();
    }
  );
  test.each([
    "| A | B |\n| - | - |\n| <b>x</b> | y |",
    "| A | B |\n| - | - |\n| ![x](image.png) | y |",
    "| A | B |\n| - | - |\n| x | y | extra |",
  ])("retains unsupported source exactly", (source) => {
    expect(parseMarkdownTable(source)).toBeUndefined();
    const { doc } = setup(source);
    expect(markdownText(doc).trim()).toBe(source);
  });
  test("fills absent body cells without dropping extra authored cells", () => {
    expect(parseMarkdownTable("A | B\n--- | ---\n| x")?.rows).toEqual([
      ["A", "B"],
      ["x", ""],
    ]);
  });
});

describe("table commands and history", () => {
  const changes: TableChange[] = [
    { type: "cell", row: 0, column: 0, value: "**Header**" },
    { type: "insertRow", row: 1 },
    { type: "removeRow", row: 1 },
    { type: "insertColumn", column: 1 },
    { type: "removeColumn", column: 0 },
    { type: "align", column: 1, value: "center" },
    {
      type  : "paste",
      row   : 1,
      column: 0,
      cells: [
        ["**a**", "b"],
        ["", "c|d"],
      ],
    },
  ];
  test.each(changes)("$type restores complete source and structure", async (change) => {
    const { doc, provider, stack, ctx, session, block } = setup();
    const snapshot = provider.snapshots(doc);
    const op = markdownOps.table(block, SOURCE, change);
    await session.dispatch(op, ctx);
    expect(stack).toHaveLength(1);
    expect(provider.blockText(doc, block)).toHaveLength(1);
    expect(provider.isOpaque(doc, block)).toBe(true);
    const after = provider.snapshots(doc);
    await stack.undo();
    expect(provider.snapshots(doc)).toEqual(snapshot);
    await stack.redo();
    expect(provider.snapshots(doc)).toEqual(after);
  });
  test("stale/deleted targets and revoked history cannot change a table", async () => {
    const { doc, provider, stack, ctx, session, block } = setup();
    const next = changeTable(parseMarkdownTable(SOURCE)!, {
      type  : "cell",
      row   : 1,
      column: 0,
      value : "new",
    });
    const command = tableCommand(doc, block, SOURCE, next);
    expect((await session.command(command, ctx)).status).toBe("applied");
    expect((await session.command(command, ctx)).status).toBe("refused");
    expect(stack).toHaveLength(1);
    const before = provider.snapshots(doc);
    const cursor = stack.cur;
    session.setWriteAllowed(false);
    await expect(stack.undo()).rejects.toThrow("Document writes are prohibited");
    expect(stack.cur).toBe(cursor);
    expect(provider.snapshots(doc)).toEqual(before);
    session.setWriteAllowed(true);
    await session.dispatch(
      { type: "replaceBlocks", after: null, remove: [block], blocks: [] },
      ctx
    );
    expect((await session.command(command, ctx)).status).toBe("refused");
  });
  test("outer clipboard keeps the complete ordinary table with new block identity", () => {
    const { doc, provider, block } = setup();
    const content = provider.toClipboard(doc, {
      anchor: { block, offset: 0 },
      head  : { block, offset: 1 },
    });
    expect(content.text).toBe(SOURCE);
    const paste = provider.fromClipboard({
      types  : ["text/plain"],
      getData: () => content.text ?? "",
    } as unknown as DataTransfer)!;
    const target = markdownDocFromText("beforeafter");
    const at = { block: target.blocks[0].id, offset: 6 };
    provider.applyEdit(target, {
      type     : "insertContent",
      at       : { anchor: at, head: at },
      content  : paste,
      newBlocks: ["fresh", "tail"],
    });
    const table = target.blocks.find((b) => b.kind === "table");
    expect(table?.id).not.toBe(block);
    expect(table?.kind === "table" && table.source).toBe(SOURCE);
    expect(target.blocks.map((b) => (b.kind === "table" ? "table" : b.text))).toEqual([
      "before",
      "table",
      "after",
    ]);
  });
  test("invalid structure and oversized paste leave models unchanged", () => {
    const model = parseMarkdownTable(SOURCE)!;
    for (const change of [
      { type: "removeRow", row: 0 },
      { type: "insertRow", row: 0 },
      { type: "cell", row: -1, column: 0, value: "bad" },
      { type: "paste", row: 2, column: 1, cells: [["a", "b"]] },
      { type: "paste", row: 1, column: 0, cells: [["a"], ["b", "c"]] },
    ] satisfies TableChange[])
      expect(() => changeTable(model, change)).toThrow();
    expect(parseMarkdownTable(SOURCE)).toEqual(model);
  });
});
