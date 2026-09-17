import { describe, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import { DocumentWidgetHost, WidgetRegistry } from "../../scripts/widgets/richtext/plugins";
import type {
  PluginHostOptions,
  PluginViewContext,
  WidgetPlugin,
} from "../../scripts/widgets/richtext/plugins";
import {
  encodeWidgetFence,
  encodeWidgetTransfer,
  WIDGET_CLIPBOARD_MIME,
} from "../../scripts/widgets/richtext/widget_codec";
import { MarkdownProvider } from "../../scripts/widgets/richtext/providers/markdown_provider";
import { markdownDocFromText } from "../../scripts/widgets/richtext/providers/markdown_parse";
import { markdownText } from "../../scripts/widgets/richtext/providers/markdown_serialize";
import { DocumentSession } from "../../scripts/widgets/richtext/context";
import { ToolStack } from "../../scripts/path-controller/toolsys/toolstack";
import { newBlockId } from "../../scripts/widgets/richtext/provider";

const record = {
  id     : "note",
  type   : "example.note",
  version: 1,
  payload: { text: "saved", ref: "https://example.test/value" },
};
const plugin: WidgetPlugin = {
  type    : record.type,
  version : 1,
  label   : "Note",
  validate: () => true,
  create  : () => ({ element: document.createElement("input"), dispose() {} }),
};
const options: PluginHostOptions = { document: { path: "/notes/one.md" }, authorize: () => true };

function setup(source = `before\n\n${encodeWidgetFence(record)}\n\nafter`) {
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
  const registry = new WidgetRegistry();
  const unregister = registry.register(plugin);
  const host = new DocumentWidgetHost(session, registry, options);
  return { doc, provider, stack, ctx, session, registry, host, unregister };
}
function transfer(values: Record<string, string>): DataTransfer {
  return {
    types  : Object.keys(values),
    getData: (type: string) => values[type] ?? "",
  } as unknown as DataTransfer;
}

describe("provider widget storage", () => {
  test("foreign clipboard HTML cannot import an existing instance ID", () => {
    const { provider } = setup();
    const content = provider.fromClipboard(transfer({ "text/html": encodeWidgetFence(record) }))!;
    expect(provider.widgets.pasted(content)[0].id).not.toBe(record.id);
  });
  test("reserved fences in footnotes remain code", () => {
    const source =
      "[^note]:\n" +
      encodeWidgetFence(record)
        .split("\n")
        .map((line) => "    " + line)
        .join("\n");
    const parsed = markdownDocFromText(source);
    expect(parsed.blocks.some((block) => block.kind === "widget")).toBe(false);
    expect(parsed.blocks.some((block) => block.kind === "code")).toBe(true);
  });
  test("a text entry cannot consume a later structured widget", () => {
    const { provider } = setup();
    const widgetData = encodeWidgetTransfer([{ text: "```text\nunfinished" }, { widget: record }]);
    const content = provider.fromClipboard(transfer({ [WIDGET_CLIPBOARD_MIME]: widgetData }))!;
    expect(provider.widgets.pasted(content)).toHaveLength(1);
    expect(content.blocks[0]).toContain("unfinished");
    const openContainer = encodeWidgetTransfer([
      { text: "```pathux-widget-v2\nunfinished" },
      { widget: record },
    ]);
    expect(
      provider.fromClipboard(transfer({ [WIDGET_CLIPBOARD_MIME]: openContainer }))
    ).toBeUndefined();
  });
  const fixtures = JSON.parse(readFileSync("tests/fixtures/widget-envelopes.json", "utf8")) as {
    name: string;
    source: string;
    record: boolean;
  }[];
  for (const fixture of fixtures)
    test(`retains ${fixture.name} source`, () => {
      const { doc, provider } = setup(fixture.source.replace(/\n/g, "\r\n"));
      if (fixture.name !== "ordinary fence") {
        expect(doc.blocks[0].kind).toBe("widget");
        expect(markdownText(doc)).toContain(fixture.source.replace(/\n/g, "\r\n"));
        expect(!!provider.widgets.atBlock(doc, doc.blocks[0].id)).toBe(fixture.record);
      } else expect(doc.blocks[0].kind).toBe("code");
    });
  test("unknown duplicates change only the second ID, even after CRLF text", () => {
    const source = encodeWidgetFence({ ...record, type: "missing.note", version: 99 }).replace(
      /\n/g,
      "\r\n"
    );
    const { doc, provider } = setup("before\r\n\r\n" + source + "\r\n\r\n" + source);
    const snapshots = doc.blocks.flatMap((block) => provider.widgets.atBlock(doc, block.id) ?? []);
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0].record.id).toBe("note");
    expect(snapshots[1].record.id).not.toBe("note");
    expect(snapshots[1].revision.replace(snapshots[1].record.id, "note")).toBe(source);
  });
  test("nested fences retain code semantics and oversized envelopes remain inert", () => {
    expect(
      markdownDocFromText(
        encodeWidgetFence(record)
          .split("\n")
          .map((line) => "> " + line)
          .join("\n")
      ).blocks[0].kind
    ).toBe("code");
    const source =
      "```pathux-widget-v1\n" + JSON.stringify({ ...record, payload: "x".repeat(70000) }) + "\n```";
    const { doc, provider } = setup(source);
    expect(provider.widgets.atBlock(doc, doc.blocks[0].id)).toBeUndefined();
    expect(markdownText(doc)).toContain(source);
  });
  test("reads immutable detached data and guards stale updates behind shared history", async () => {
    const { doc, provider, host, ctx, stack } = setup();
    const initial = provider.widgets.read(doc, "note")!;
    expect(Object.isFrozen(initial.record.payload)).toBe(true);
    const first = host.update(initial, { text: "one" }, ctx);
    const second = host.update(initial, { text: "two" }, ctx);
    expect((await first).status).toBe("applied");
    expect((await second).status).toBe("refused");
    expect(stack).toHaveLength(1);
    await stack.undo();
    expect(provider.widgets.read(doc, "note")!.record).toEqual(record);
    await stack.redo();
    expect(provider.widgets.read(doc, "note")!.record.payload).toEqual({ text: "one" });
  });
  test("inserts, moves and removes with stable identities and complete inverses", async () => {
    const { doc, provider, host, ctx, stack } = setup();
    const initial = provider.widgets.read(doc, "note")!;
    const before = structuredClone(doc);
    expect((await host.move(initial, doc.blocks.at(-1)!.id, ctx)).status).toBe("applied");
    expect(doc.blocks.at(-1)!.id).toBe(initial.block);
    await stack.undo();
    expect(doc).toEqual(before);
    await stack.redo();
    expect((await host.remove(provider.widgets.read(doc, "note")!, ctx)).status).toBe("applied");
    expect(provider.widgets.read(doc, "note")).toBeUndefined();
    await stack.undo();
    expect(provider.widgets.read(doc, "note")!.record).toEqual(record);
    expect((await host.insert({ ...record, id: "second" }, null, ctx)).status).toBe("applied");
    expect(provider.widgets.atBlock(doc, doc.blocks[0].id)!.record.id).toBe("second");
    expect((await host.insert(record, null, ctx)).status).toBe("refused");
  });
  test("copies fresh IDs, preserves references and middle-of-prose paste, and replays data", async () => {
    const { doc, provider, ctx, session, stack } = setup();
    const initial = provider.widgets.read(doc, "note")!;
    const copied = provider.toClipboard(doc, {
      anchor: { block: initial.block, offset: 0 },
      head  : { block: initial.block, offset: 1 },
    });
    const content = provider.fromClipboard(
      transfer({ [WIDGET_CLIPBOARD_MIME]: copied.widgetData! })
    )!;
    const next = provider.widgets.pasted(content)[0];
    expect(next.id).not.toBe(initial.record.id);
    expect(next.payload).toEqual(record.payload);
    const block = doc.blocks[0].id;
    const at = { anchor: { block, offset: 2 }, head: { block, offset: 2 } };
    await session.dispatch(
      {
        type: "insertContent",
        at,
        content,
        newBlocks: content.blocks.slice(1).map(() => newBlockId()),
      },
      ctx
    );
    expect(doc.blocks[0].text).toBe("be");
    expect(doc.blocks[2].text).toBe("fore");
    expect(provider.widgets.read(doc, next.id)).toBeDefined();
    await stack.undo();
    expect(provider.widgets.read(doc, next.id)).toBeUndefined();
    await stack.redo();
    expect(provider.widgets.read(doc, next.id)).toBeDefined();
    expect(
      provider.fromClipboard(
        transfer({ [WIDGET_CLIPBOARD_MIME]: "broken", "text/plain": "fallback" })
      )
    ).toBeUndefined();
  });
});

describe("session plugin policy and migration", () => {
  test("plugin drafts refuse raw provider edits outside their scoped update API", async () => {
    const { host, registry, unregister, provider, doc, session, ctx, stack } = setup();
    unregister();
    registry.register({
      ...plugin,
      create(_snapshot, context) {
        const block = doc.blocks[0].id;
        context.registerDraft({
          key    : "raw",
          pending: () => true,
          version: () => 0,
          discard() {},
          committed() {},
          recover: () => "kept",
          prepare: () => ({
            status : "ready",
            command: {
              resolve: () => ({
                type: "insertText",
                text: "bypass",
                at  : { anchor: { block, offset: 0 }, head: { block, offset: 0 } },
              }),
            },
          }),
        });
        return { element: document.createElement("div"), dispose() {} };
      },
    });
    const descriptor = host.resolve(provider.widgets.read(doc, "note")!.block, {} as never)!;
    descriptor.create({
      signal       : new AbortController().signal,
      isCurrent    : () => true,
      command      : (command) => session.command(command, ctx),
      registerDraft: (controller) => session.registerDraft(controller, ctx),
    });
    expect(await session.prepareSave()).toMatchObject({ status: "refused" });
    expect(doc.blocks[0].text).toBe("before");
    expect(stack).toHaveLength(0);
  });
  test("a forged snapshot cannot replace authoritative record contents", async () => {
    const { host, provider, doc, ctx, stack } = setup();
    const current = provider.widgets.read(doc, "note")!;
    const forged = { ...current, record: { ...current.record, payload: { text: "forged" } } };
    expect((await host.update(forged, { text: "replacement" }, ctx)).status).toBe("refused");
    expect(stack).toHaveLength(0);
    expect(provider.widgets.read(doc, "note")!.record).toEqual(record);
  });
  test("registry sharing does not share document policy or context", () => {
    const first = setup();
    const second = setup();
    second.host.dispose();
    const host = new DocumentWidgetHost(second.session, first.registry, {
      document : { path: "two.md" },
      authorize: () => false,
    });
    expect(
      first.host.resolve(first.provider.widgets.read(first.doc, "note")!.block, {} as never)
        ?.allowed
    ).toBe(true);
    expect(
      host.resolve(second.provider.widgets.read(second.doc, "note")!.block, {} as never)?.allowed
    ).toBe(false);
    host.invalidate({ document: { path: "three.md" }, authorize: () => true });
    expect(first.session.revision).toBe(0);
    second.session.dispose();
    expect(first.session.widgetHost).toBe(first.host);
    expect(second.session.widgetHost).toBeUndefined();
  });
  test("queued commands capture snapshots and payloads before caller mutation", async () => {
    const { host, provider, doc, ctx } = setup();
    const expected = { ...provider.widgets.read(doc, "note")! };
    const payload = { text: "captured" };
    const pending = host.update(expected, payload, ctx);
    expected.revision = "mutated";
    payload.text = "mutated";
    expect((await pending).status).toBe("applied");
    expect(provider.widgets.read(doc, "note")!.record.payload).toEqual({ text: "captured" });
  });
  test("duplicate registrations fail and absent/denied implementations never construct", () => {
    const { registry, host, provider, doc } = setup();
    expect(() => registry.register(plugin)).toThrow("Duplicate");
    host.invalidate({ ...options, authorize: () => false });
    expect(host.resolve(provider.widgets.read(doc, "note")!.block, {} as never)?.allowed).toBe(
      false
    );
  });
  test("queued commands and clipboard insertion check current policy", async () => {
    const { host, provider, doc, ctx, stack, session } = setup();
    const pending = host.update(provider.widgets.read(doc, "note")!, { text: "no" }, ctx);
    host.invalidate({ ...options, authorize: ({ action }) => action === "mount" });
    expect((await pending).status).toBe("refused");
    const content = provider.fromClipboard(transfer({ "text/plain": encodeWidgetFence(record) }))!;
    const block = doc.blocks[0].id;
    await expect(
      session.dispatch(
        {
          type: "insertContent",
          at  : { anchor: { block, offset: 0 }, head: { block, offset: 0 } },
          content,
          newBlocks: content.blocks.slice(1).map(() => newBlockId()),
        },
        ctx
      )
    ).rejects.toThrow();
    expect(stack).toHaveLength(0);
  });
  test("editing requires policy approval of both current and replacement values", async () => {
    const { host, provider, doc, ctx, stack } = setup();
    host.invalidate({
      ...options,
      authorize: ({ record, action }) => action !== "edit" || record.payload === null,
    });
    expect((await host.update(provider.widgets.read(doc, "note")!, null, ctx)).status).toBe(
      "refused"
    );
    expect(stack).toHaveLength(0);
  });
  test("migration runs once explicitly and history survives plugin removal", async () => {
    const { host, provider, doc, ctx, stack, registry, unregister, session } = setup();
    unregister();
    const migrate = vi.fn(() => ({ text: "converted" }));
    const remove = registry.register({ ...plugin, version: 2, migrate });
    expect(host.resolve(provider.widgets.read(doc, "note")!.block, {} as never)?.allowed).toBe(
      false
    );
    expect(migrate).not.toHaveBeenCalled();
    expect((await host.migrate(provider.widgets.read(doc, "note")!, ctx)).status).toBe("applied");
    remove();
    host.invalidate({ ...options, authorize: () => false });
    await stack.undo();
    expect(provider.widgets.read(doc, "note")!.record.version).toBe(1);
    await stack.redo();
    expect(provider.widgets.read(doc, "note")!.record.version).toBe(2);
    expect(migrate).toHaveBeenCalledTimes(1);
    session.setWriteAllowed(false);
    await expect(stack.undo()).rejects.toThrow();
    expect(provider.widgets.read(doc, "note")!.record.version).toBe(2);
  });
  test("invalid migration output and thrown migrations cannot mutate or add history", async () => {
    const { host, provider, doc, ctx, stack, registry, unregister } = setup();
    unregister();
    registry.register({ ...plugin, version: 2, migrate: () => ({ bad: NaN }) });
    expect((await host.migrate(provider.widgets.read(doc, "note")!, ctx)).status).toBe("failed");
    expect(provider.widgets.read(doc, "note")!.record).toEqual(record);
    expect(stack).toHaveLength(0);
  });
  test("external callbacks are denied before work and late results are refused", async () => {
    const { host, registry, unregister, provider, doc, session, ctx } = setup();
    unregister();
    let viewContext: PluginViewContext | undefined;
    registry.register({
      ...plugin,
      create: (_snapshot, context) => {
        viewContext = context;
        return { element: document.createElement("div"), dispose() {} };
      },
    });
    const descriptor = host.resolve(provider.widgets.read(doc, "note")!.block, {} as never)!;
    descriptor.create({
      signal       : new AbortController().signal,
      isCurrent    : () => true,
      command      : (command) => session.command(command, ctx),
      registerDraft: () => () => {},
    });
    let finish!: (value: string) => void;
    const run = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        })
    );
    const pending = viewContext!.external("load", run);
    host.invalidate({ ...options, authorize: () => false });
    finish("late");
    expect(await pending).toEqual({ status: "refused" });
    expect(await viewContext!.external("load", run)).toEqual({ status: "refused" });
    expect(run).toHaveBeenCalledTimes(1);
  });
});
