import { describe, expect, test } from "vitest";
import {
  encodeInlineWidget,
  decodeInlineWidget,
  encodeWidgetFence,
  WIDGET_CLIPBOARD_MIME,
} from "../../scripts/widgets/richtext/widget_codec";
import { MarkdownProvider } from "../../scripts/widgets/richtext/providers/markdown_provider";
import { markdownDocFromText } from "../../scripts/widgets/richtext/providers/markdown_parse";
import { markdownText } from "../../scripts/widgets/richtext/providers/markdown_serialize";
import { markdownSourceDoc } from "../../scripts/widgets/richtext/providers/markdown_source";
import { markdownOps } from "../../scripts/widgets/richtext/providers/markdown_ops";
import { DocumentSession } from "../../scripts/widgets/richtext/context";
import { ToolStack } from "../../scripts/path-controller/toolsys/toolstack";
import { DocumentWidgetHost, WidgetRegistry } from "../../scripts/widgets/richtext/plugins";
import type { ProviderContext } from "../../scripts/widgets/richtext/provider";
import { ATOM_CHAR } from "../../scripts/widgets/richtext/provider";

const record = {
  id     : "one",
  type   : "test.inline",
  version: 1,
  payload: { text: "漢字 ` ** <script> \n" },
};
const source = encodeInlineWidget(record);
const provider = new MarkdownProvider();
const records = (text: string) => provider.widgets.pasted({ blocks: [text] });
const transfer = (values: Record<string, string | undefined>) =>
  ({
    types  : Object.keys(values),
    getData: (type: string) => values[type] ?? "",
  }) as unknown as DataTransfer;
function setup(
  text = "a" + source + "b\n\nsecond",
  placements: readonly ("block" | "inline")[] = ["inline"]
) {
  const doc = markdownDocFromText(text);
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
  const registry = new WidgetRegistry();
  registry.register({
    type   : record.type,
    version: 1,
    placements,
    label   : "Inline",
    validate: () => true,
    create  : () => ({ element: document.createElement("input"), dispose() {} }),
  });
  const host = new DocumentWidgetHost(session, registry, { document: {}, authorize: () => true });
  return { doc, stack, ctx, session, host };
}

describe("inline portable records", () => {
  test("bounded escaped JSON and malformed envelopes", () => {
    expect(decodeInlineWidget(source)).toEqual(record);
    for (const value of [
      "{{pathux-widget-v1:xx}}",
      "{{pathux-widget-v2:7b7d}}",
      "{{pathux-widget-v1:ff}}",
      "{{pathux-widget-v1:" + "00".repeat(70000) + "}}",
    ])
      expect(decodeInlineWidget(value)).toBeUndefined();
    expect(() => encodeInlineWidget({ ...record, payload: "x".repeat(70000) })).toThrow();
    const malicious = '{"id":"one","type":"test.inline","version":1,"payload":{"constructor":0}}';
    const hex = Array.from(new TextEncoder().encode(malicious), (b) =>
      b.toString(16).padStart(2, "0")
    ).join("");
    expect(decodeInlineWidget("{{pathux-widget-v1:" + hex + "}}")).toBeUndefined();
  });
  test.each(["%s", "# %s", "- %s", "> %s", "**%s**", '<span style="color:red">%s</span>'])(
    "round trips placement %s",
    (format) => {
      const doc = markdownDocFromText(format.replace("%s", source));
      expect(doc.blocks[0].atoms).toHaveLength(1);
      expect(records(markdownText(doc))).toEqual([record]);
    }
  );
  test("adjacent atoms keep separate slots and fresh duplicate identities", () => {
    const doc = markdownDocFromText(source + source);
    expect(doc.blocks[0].text).toBe(ATOM_CHAR + ATOM_CHAR);
    const saved = markdownText(doc);
    const values = records(saved);
    expect(values).toHaveLength(2);
    expect(values[0].id).not.toBe(values[1].id);
    expect(markdownDocFromText(saved).blocks[0].text).toBe(ATOM_CHAR + ATOM_CHAR);
  });
  test("escaped literals, code spans, fenced code and table cells stay data", () => {
    for (const text of [
      "\\" + source,
      "`" + source + "`",
      "```\n" + source + "\n```",
      "| a |\n|---|\n|" + source + "|",
    ]) {
      const doc = markdownDocFromText(text);
      expect(doc.blocks.flatMap((b) => b.atoms)).toHaveLength(0);
      expect(records(markdownText(doc))).toHaveLength(0);
    }
  });
  test("escaped and entity-authored lookalikes cannot steal a later token", () => {
    for (const literal of ["\\" + source, "{\\" + source.slice(1), "&#123;" + source.slice(1)]) {
      const doc = markdownDocFromText(literal + " " + source);
      expect(doc.blocks[0].text).toBe(source + " " + ATOM_CHAR);
      expect(doc.blocks[0].atoms).toHaveLength(1);
      expect(records(markdownText(doc))).toHaveLength(1);
    }
    expect(records("> escaped \\* &amp;\n> " + source)).toHaveLength(1);
  });
  test("HTML code literals stay literal and wikilinks cannot consume an atom", () => {
    const content = provider.fromClipboard(
      transfer({ "text/html": "<p><code>" + source + "</code></p>" })
    )!;
    expect(provider.widgets.pasted(content)).toHaveLength(0);
    expect(records("before <code>" + source + "</code> after")).toHaveLength(0);
    const doc = markdownDocFromText("[[target|" + source + "]]");
    expect(doc.blocks[0].atoms[0].offset).toBe(9);
    expect(records(markdownText(doc))).toEqual([record]);
  });
  test("render-only table cells keep record syntax as literal text", () => {
    const doc = markdownDocFromText("| a |\n|---|\n|" + source + "|");
    const element = provider.renderBlock(doc, doc.blocks[0].id, { editor: {} } as ProviderContext);
    expect(element.querySelector("td")?.textContent).toBe(source);
    expect(element.querySelector(".md-inline-widget")).toBeNull();
  });
  test("unknown and malformed tokens survive verbatim", () => {
    for (const token of [
      source.replace("widget-v1:", "widget-v8:"),
      "{{pathux-widget-v1:xx}}",
      encodeInlineWidget({ ...record, version: 90 }),
    ]) {
      expect(markdownText(markdownDocFromText("a" + token + "b")).trim()).toBe("a" + token + "b");
    }
  });
  test("duplicates across block and inline records repair retained CRLF source", () => {
    const doc = markdownSourceDoc(
      "---\r\nx: y\r\n---\r\n\r\n" + encodeWidgetFence(record) + "\r\n\r\n" + source + source
    );
    const saved = markdownText(doc);
    const all = records(saved);
    expect(all).toHaveLength(3);
    expect(new Set(all.map((r) => r.id)).size).toBe(3);
    expect(saved).toContain("x: y\r\n");
  });
  test("HTML duplicate repair cannot reintroduce stale IDs from retained source", () => {
    const doc = markdownSourceDoc(
      "<p><code data-pathux-widget>" +
        source +
        "</code><code data-pathux-widget>" +
        source +
        "</code></p>"
    );
    const saved = markdownText(doc);
    expect(new Set(records(saved).map((r) => r.id)).size).toBe(2);
  });
  test("split, join, movement and stale-location updates resolve stable identity", async () => {
    const { doc, session, host, ctx, stack } = setup();
    const original = provider.widgets.read(doc, "one")!;
    await session.dispatch(
      { type: "splitBlock", at: { block: original.block, offset: 1 }, newBlock: "split" },
      ctx
    );
    expect(provider.widgets.read(doc, "one")).toMatchObject({ block: "split", offset: 0 });
    expect((await host.update(original, { text: "updated" }, ctx)).status).toBe("applied");
    const updated = provider.widgets.read(doc, "one")!;
    await session.dispatch({ type: "joinWithPrevious", block: "split" }, ctx);
    expect(
      (await host.moveInline(updated, { block: doc.blocks[1].id, offset: 3 }, ctx)).status
    ).toBe("applied");
    expect(provider.widgets.read(doc, "one")).toMatchObject({ block: doc.blocks[1].id, offset: 3 });
    await stack.undo();
    expect(provider.widgets.read(doc, "one")).toMatchObject({ block: original.block, offset: 1 });
    await stack.redo();
    expect(provider.widgets.read(doc, "one")!.record.payload).toEqual({ text: "updated" });
    expect((await host.update(original, { text: "stale" }, ctx)).status).toBe("refused");
  });
  test("range replacement and removal undo restore exact records", async () => {
    const { doc, session, host, ctx, stack } = setup();
    const at = provider.widgets.read(doc, "one")!;
    await session.dispatch(
      {
        type: "insertText",
        at  : { anchor: { block: at.block, offset: 0 }, head: { block: at.block, offset: 2 } },
        text: "new",
      },
      ctx
    );
    expect(provider.widgets.read(doc, "one")).toBeUndefined();
    await stack.undo();
    expect(provider.widgets.read(doc, "one")!.record).toEqual(record);
    await host.remove(provider.widgets.read(doc, "one")!, ctx);
    expect(doc.blocks[0].text).toBe("ab");
    await stack.undo();
    expect(provider.widgets.read(doc, "one")!.record).toEqual(record);
  });
  test("insertion requires inline opt-in, unique IDs and compatible destinations", async () => {
    const { doc, host, ctx, stack } = setup("plain\n\n```\ncode\n```", ["block"]);
    expect(
      (await host.insertInline(record, { block: doc.blocks[0].id, offset: 1 }, ctx)).status
    ).toBe("refused");
    const allowed = setup("plain\n\n```\ncode\n```");
    const at = { block: allowed.doc.blocks[0].id, offset: 2 };
    expect((await allowed.host.insertInline(record, at, allowed.ctx)).status).toBe("applied");
    expect((await allowed.host.insertInline(record, at, allowed.ctx)).status).toBe("refused");
    expect(
      (
        await allowed.host.insertInline(
          { ...record, id: "two" },
          { block: allowed.doc.blocks[1].id, offset: 0 },
          allowed.ctx
        )
      ).status
    ).toBe("refused");
    expect(stack.length).toBe(0);
    expect(allowed.stack.length).toBe(1);
  });
  test("structured, source and HTML paste preserve records with fresh IDs", () => {
    const { doc } = setup();
    const b = doc.blocks[0].id;
    const copy = provider.toClipboard(doc, {
      anchor: { block: b, offset: 1 },
      head  : { block: b, offset: 2 },
    });
    expect(copy.widgetData).toBeDefined();
    for (const data of [
      { [WIDGET_CLIPBOARD_MIME]: copy.widgetData! },
      { "text/plain": copy.text! },
      { "text/html": copy.html!.replace("data-richtext-markdown", "data-foreign") },
    ]) {
      const content = provider.fromClipboard(transfer(data))!;
      const pasted = provider.widgets.pasted(content);
      expect(pasted).toHaveLength(1);
      expect(pasted[0].id).not.toBe(record.id);
      expect(pasted[0].payload).toEqual(record.payload);
    }
  });
  test("paste and shared application history honor revoked authorization", async () => {
    const { doc, session, host, ctx, stack } = setup();
    const snap = provider.widgets.read(doc, "one")!;
    await host.update(snap, { text: "changed" }, ctx);
    session.setWriteAllowed(false);
    const saved = markdownText(doc);
    await expect(stack.undo()).rejects.toThrow("Document writes are prohibited");
    expect(markdownText(doc)).toBe(saved);
    session.setWriteAllowed(true);
    host.invalidate({ document: {}, authorize: (request) => request.action !== "insert" });
    await expect(
      session.dispatch(
        {
          type     : "insertContent",
          at: { anchor: { block: snap.block, offset: 0 }, head: { block: snap.block, offset: 0 } },
          content  : { blocks: [source] },
          newBlocks: [],
        },
        ctx
      )
    ).rejects.toThrow();
    expect(stack.length).toBe(1);
  });
  test("code and link marks never consume record payloads", () => {
    const doc = markdownDocFromText("a" + source + "b");
    const range = {
      anchor: { block: doc.blocks[0].id, offset: 0 },
      head  : { block: doc.blocks[0].id, offset: 3 },
    };
    provider.applyEdit(doc, { type: "toggleMark", mark: "code", range });
    expect(records(markdownText(doc))).toEqual([record]);
    provider.applyEdit(doc, markdownOps.setKind([doc.blocks[0].id], { kind: "code" }));
    expect(markdownText(doc)).toContain(source);
  });
});
