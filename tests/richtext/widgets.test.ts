import { describe, expect, test, vi } from "vitest";
import { ToolStack } from "../../scripts/path-controller/toolsys/toolstack";
import { DocumentSession } from "../../scripts/widgets/richtext/context";
import { PlainProvider, plainDocFromLines } from "../../scripts/widgets/richtext/providers/plain";
import type { EditOp } from "../../scripts/widgets/richtext/provider";
import type { DraftController } from "../../scripts/widgets/richtext/drafts";
import { WidgetHost, widgetSlot } from "../../scripts/widgets/richtext/widget_host";
import type { WidgetContext, WidgetDescriptor } from "../../scripts/widgets/richtext/widget";

function setup() {
  const provider = new PlainProvider();
  const doc = plainDocFromLines(["one", "two"], (i) => ["a", "b"][i]);
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
  return { provider, doc, stack, ctx, session };
}

const insert = (text: string, offset = 0): EditOp => ({
  type: "insertText",
  text,
  at: { anchor: { block: "a", offset }, head: { block: "a", offset } },
});

describe("serialized widget commands", () => {
  test("a throwing application listener cannot stop policy delivery or session cleanup", () => {
    const { session } = setup();
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const notified = vi.fn();
    session.onChange(() => {
      throw new Error("application listener");
    });
    session.onChange(notified);
    session.setWriteAllowed(false);
    session.dispose();
    expect(notified).toHaveBeenCalledTimes(2);
    expect(session.disposed).toBe(true);
    logged.mockRestore();
  });
  test("a deleted target and queued permission revocation settle without a history entry", async () => {
    const { session, ctx, doc, stack } = setup();
    const remove = session.dispatch(
      { type: "replaceBlocks", after: "a", blocks: [], remove: ["b"] },
      ctx
    );
    const command = session.command(
      { resolve: () => (doc.blocks.some((b) => b.id === "b") ? insert("x") : undefined) },
      ctx
    );
    await remove;
    expect((await command).status).toBe("refused");
    expect(stack).toHaveLength(1);
    const pending = session.command({ resolve: () => insert("denied") }, ctx);
    session.setWriteAllowed(false);
    expect((await pending).status).toBe("refused");
    expect(stack).toHaveLength(1);
  });

  test("unencodable command values fail before mutation", async () => {
    const { session, ctx, stack } = setup();
    const result = await session.command(
      {
        resolve: () => ({
          type  : "custom",
          name  : "field",
          blocks: ["a"],
          data  : { value: NaN },
        }),
      },
      ctx
    );
    expect(result.status).toBe("failed");
    expect(stack).toHaveLength(0);
  });
  test("resolves queued commands against current values and captures the current inverse", async () => {
    const { session, ctx, doc, stack } = setup();
    const first = session.dispatch(insert("X"), ctx);
    const second = session.command(
      { resolve: () => (doc.blocks[0].text === "Xone" ? insert("Y") : undefined) },
      ctx
    );
    await first;
    expect((await second).status).toBe("applied");
    expect(stack).toHaveLength(2);
    await stack.undo();
    expect(doc.blocks[0].text).toBe("Xone");
    await stack.undo();
    expect(doc.blocks[0].text).toBe("one");
  });

  test("stale, deleted, unauthorized and throwing commands leave history untouched", async () => {
    const { session, ctx, doc, provider, stack } = setup();
    expect((await session.command({ resolve: () => undefined }, ctx)).status).toBe("refused");
    expect(
      (await session.command({ authorize: () => false, resolve: () => insert("x") }, ctx)).status
    ).toBe("refused");
    const apply = provider.applyEdit.bind(provider);
    vi.spyOn(provider, "applyEdit").mockImplementation((document, op) => {
      if (op.type === "insertText") {
        document.blocks[0].text = "partial";
        throw new Error("broken");
      }
      return apply(document, op);
    });
    expect((await session.command({ resolve: () => insert("x") }, ctx)).status).toBe("failed");
    expect(doc.blocks[0].text).toBe("one");
    expect(stack).toHaveLength(0);
    expect(stack.cur).toBe(-1);
  });

  test("shared history refuses undo, redo and rerun before moving the cursor", async () => {
    const { session, ctx, doc, stack } = setup();
    await session.dispatch(insert("x"), ctx);
    session.setWriteAllowed(false);
    await expect(stack.undo()).rejects.toThrow("prohibited");
    await expect(stack.rerun(stack[0])).rejects.toThrow("prohibited");
    expect(stack.cur).toBe(0);
    expect(doc.blocks[0].text).toBe("xone");
    session.setWriteAllowed(true);
    await stack.undo();
    session.setWriteAllowed(false);
    await expect(stack.redo()).rejects.toThrow("prohibited");
    expect(stack.cur).toBe(-1);
    expect(doc.blocks[0].text).toBe("one");
  });
});

describe("session draft barrier", () => {
  function draft(key = "a.value"): DraftController {
    let pending = true;
    return {
      key,
      pending  : () => pending,
      version  : () => 1,
      prepare  : () => ({ status: "ready", command: { resolve: () => insert("draft") } }),
      recover  : () => "draft",
      committed: () => {
        pending = false;
      },
      discard: () => {
        pending = false;
      },
    };
  }

  test("pure serialization and one history entry per committed draft", async () => {
    const { session, ctx, doc, provider, stack } = setup();
    session.registerDraft(draft(), ctx);
    expect(await provider.emitDocFile(doc).text()).toContain("one");
    expect(stack).toHaveLength(0);
    expect(await session.prepareSave()).toEqual({ status: "ready", revision: 1 });
    expect(stack).toHaveLength(1);
    expect(session.pendingDrafts).toHaveLength(0);
    await stack.undo();
    expect(doc.blocks[0].text).toBe("one");
  });

  test("save waits for commands already queued and partial draft commits remain undoable", async () => {
    const { session, ctx, stack, doc } = setup();
    const queued = session.dispatch(insert("queued"), ctx);
    expect(await session.prepareSave()).toEqual({ status: "ready", revision: 1 });
    await queued;
    session.registerDraft(draft("first"), ctx);
    const invalid = draft("second");
    invalid.prepare = () => ({ status: "unencodable" });
    session.registerDraft(invalid, ctx);
    expect((await session.prepareSave()).status).toBe("unencodable");
    expect(stack).toHaveLength(2);
    expect(session.pendingDrafts).toHaveLength(1);
    await stack.undo();
    expect(doc.blocks[0].text).toBe("queuedone");
  });

  test("two views of the same field conflict before either commits", async () => {
    const { session, ctx, stack } = setup();
    session.registerDraft(draft(), ctx);
    session.registerDraft(draft(), ctx);
    expect((await session.prepareSave()).status).toBe("conflict");
    expect(stack).toHaveLength(0);
    expect(session.pendingDrafts).toHaveLength(2);
  });

  test("unencodable and detached drafts remain recoverable until explicit discard", async () => {
    const { session, ctx } = setup();
    const controller = draft();
    controller.prepare = () => ({ status: "unencodable" });
    const off = session.registerDraft(controller, ctx);
    expect((await session.prepareSave()).status).toBe("unencodable");
    off();
    expect((await session.prepareSave()).status).toBe("refused");
    const pending = session.pendingDrafts[0];
    expect(pending.detached).toBe(true);
    session.discardDraft(pending.id);
    expect((await session.prepareSave()).status).toBe("ready");
  });

  test("an external edit during asynchronous preparation conflicts", async () => {
    const { session, ctx } = setup();
    const controller = draft();
    let release!: () => void;
    controller.prepare = async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return { status: "ready", command: { resolve: () => insert("draft") } };
    };
    session.registerDraft(controller, ctx);
    const save = session.prepareSave();
    await session.dispatch(insert("external"), ctx);
    release();
    expect((await save).status).toBe("conflict");
    expect(session.pendingDrafts).toHaveLength(1);
  });
});

describe("mount generations", () => {
  test("late async results dispose once and cannot dispatch after removal", async () => {
    const { session, ctx, stack } = setup();
    const root = document.createElement("div");
    document.body.append(root);
    const host = new WidgetHost(
      root,
      () => session,
      () => ctx,
      () => false,
      () => {}
    );
    let context!: WidgetContext;
    let resolve!: (view: { element: HTMLElement; dispose(): void }) => void;
    const descriptor: WidgetDescriptor = {
      id            : "widget",
      implementation: "test",
      label         : "Test",
      create(c) {
        context = c;
        return new Promise((r) => {
          resolve = r;
        });
      },
    };
    const block = document.createElement("div");
    block.append(widgetSlot(descriptor));
    host.replace(undefined, block, () => root.append(block));
    host.dispose();
    host.dispose();
    const dispose = vi.fn();
    resolve({ element: document.createElement("input"), dispose });
    await Promise.resolve();
    expect(dispose).toHaveBeenCalledOnce();
    expect(context.signal.aborted).toBe(true);
    expect((await context.command({ resolve: () => insert("bad") })).status).toBe("refused");
    expect(stack).toHaveLength(0);
    root.remove();
  });

  test("denial runs before construction and a failed factory stays local", () => {
    const { session, ctx } = setup();
    const root = document.createElement("div");
    const host = new WidgetHost(
      root,
      () => session,
      () => ctx,
      () => false,
      () => {}
    );
    const create = vi.fn(() => {
      throw new Error("failed");
    });
    const block = document.createElement("div");
    block.append(
      widgetSlot({ id: "w", implementation: "test", label: "Test", allowed: false, create })
    );
    host.replace(undefined, block, () => root.append(block));
    expect(create).not.toHaveBeenCalled();
    const next = document.createElement("div");
    next.append(widgetSlot({ id: "w", implementation: "test", label: "Test", create }));
    host.replace(block, next, () => root.append(next));
    expect(next.textContent).toContain("unavailable");
    host.dispose();
  });
});
