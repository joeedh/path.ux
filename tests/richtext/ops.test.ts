import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";
import { SavedToolDefaults } from "../../scripts/path-controller/toolsys/tooldefaults";
import { ToolOp } from "../../scripts/path-controller/toolsys/toolop";
import { defaultRegistry } from "../../scripts/path-controller/toolsys/toolregistry";
import { ToolStack } from "../../scripts/path-controller/toolsys/toolstack";
import { IntProperty } from "../../scripts/path-controller/toolsys/toolprop";
import type { IContextBase } from "../../scripts/core/context_base";
import { DocumentSession, RichTextContext } from "../../scripts/widgets/richtext/context";
import { DocEditOp } from "../../scripts/widgets/richtext/ops";
import type { DocChange, DocRange, EditOp } from "../../scripts/widgets/richtext/provider";
import { PlainProvider, plainDocFromLines } from "../../scripts/widgets/richtext/providers/plain";
import type { PlainDoc } from "../../scripts/widgets/richtext/providers/plain";

/** The app's context, standing in for whatever the editor is hosted under. */
class AppCtx {
  state = { name: "app" };
  api = {} as never;
  screen = {} as never;
  toolstack: ToolStack<AppCtx> = new ToolStack();

  toLocked() {
    return this;
  }
}

/** An unrelated undoable op sharing a stack with the document's edits. */
class CounterOp extends ToolOp<{ by: IntProperty }, {}, AppCtx> {
  static counter = 0;

  static tooldef() {
    return {
      toolpath: "test.richtext_counter",
      inputs  : { by: new IntProperty(1).ignoreLastValue() },
    };
  }

  override undoPre() {}

  override exec() {
    CounterOp.counter += this.inputs.by.getValue();
  }

  override undo() {
    CounterOp.counter -= this.inputs.by.getValue();
  }
}

ToolOp.register(CounterOp as unknown as Parameters<typeof ToolOp.register>[0]);

afterAll(() => {
  ToolOp.unregister(CounterOp as unknown as Parameters<typeof ToolOp.unregister>[0]);
});

const collapsed = (block: string, offset: number): DocRange => ({
  anchor: { block, offset },
  head  : { block, offset },
});

const insert = (block: string, offset: number, text: string): EditOp => ({
  type: "insertText",
  at  : collapsed(block, offset),
  text,
});

const del = (block: string, from: number, to: number): EditOp => ({
  type : "deleteRange",
  range: { anchor: { block, offset: from }, head: { block, offset: to } },
});

let app: AppCtx;
let provider: PlainProvider;
let doc: PlainDoc;
let session: DocumentSession<PlainDoc>;
let ctx: RichTextContext<AppCtx, PlainDoc>;
let changes: DocChange[];
/** Every change and source the session delivered, submitter's own included. */
let delivered: { change: DocChange; source: unknown }[];

/** Stands in for the editor: the token it hands `result()` and skips in its own listener. */
const SUBMITTER = { name: "editor" };

const texts = () => doc.blocks.map((b) => b.text);

/** Builds an op with its inverse computed the way an editor does, before it is applied. */
const edit = (op: EditOp, run = 0) => new DocEditOp(op, provider.inverse(doc, op), session.id, run);

/** Submits `op` through the fold path and returns its result together with whether it pushed. */
async function submit(op: EditOp, run = 0) {
  const toolop = edit(op, run);
  const result = toolop.result(SUBMITTER);
  const pushed = await ctx.toolstack.foldOrExec(ctx, toolop);

  return { result: await result, pushed };
}

/** A session on its own stack, so tests read the stack length as the number of undo entries. */
function openDocument(toolstack = new ToolStack()) {
  provider = new PlainProvider();
  doc = plainDocFromLines(["Hello world", "second line"], (i) => "ab"[i]);
  session = new DocumentSession(doc, provider, toolstack);
  ctx = new RichTextContext(app, session);
  changes = [];
  delivered = [];
  session.onChange((change, source) => {
    delivered.push({ change, source });
    if (source !== SUBMITTER) {
      changes.push(change);
    }
  });
}

beforeEach(() => {
  app = new AppCtx();
  CounterOp.counter = 0;
  openDocument();
});

describe("RichTextContext", () => {
  test("forwards state, api and screen to the parent and toolstack to the session", () => {
    expect(ctx.state).toBe(app.state);
    expect(ctx.api).toBe(app.api);
    expect(ctx.screen).toBe(app.screen);
    expect(ctx.toolstack).toBe(session.toolstack);
    expect(ctx.toolstack).not.toBe(app.toolstack);
  });

  test("toLocked locks the parent through its own toLocked and keeps the session live", () => {
    const locked = { ...app, locked: true } as unknown as AppCtx;
    const spy = vi.spyOn(app, "toLocked").mockReturnValue(locked);

    const result = ctx.toLocked();

    expect(spy).toHaveBeenCalledOnce();
    expect(result).toBeInstanceOf(RichTextContext);
    expect(result.parent).toBe(locked);
    expect(result.session).toBe(session);
    expect(result.toolstack).toBe(session.toolstack);
  });

  test("toLocked copies a parent that cannot lock itself", () => {
    const parent = { state: { n: 1 }, api: {}, screen: {}, toolstack: app.toolstack };
    const rich = new RichTextContext(parent as unknown as IContextBase, session);

    const locked = rich.toLocked();

    expect(locked.parent).not.toBe(parent);
    expect(locked.state).toBe(parent.state);
    expect(locked.session).toBe(session);
  });
});

describe("DocumentSession", () => {
  test("forwards provider change notifications until unsubscribed", () => {
    const change = { dirtyBlocks: ["a"], removedBlocks: [] };
    const heard: DocChange[] = [];
    const off = session.onChange((c) => heard.push(c));

    provider.notifyChange(doc, change);
    expect(heard).toEqual([change]);
    expect(changes).toEqual([change]);

    off();
    provider.notifyChange(doc, change);
    expect(heard).toHaveLength(1);
    expect(changes).toHaveLength(2);
  });

  test("dispose sets the flag and stops every listener", () => {
    session.dispose();

    expect(session.disposed).toBe(true);
    provider.notifyChange(doc, { dirtyBlocks: ["a"], removedBlocks: [] });
    session.deliver({ dirtyBlocks: ["a"], removedBlocks: [] });
    expect(changes).toEqual([]);
  });

  test("ids are distinct by default", () => {
    const other = new DocumentSession(doc, provider, new ToolStack());
    expect(other.id).not.toBe(session.id);
  });
});

describe("DocEditOp", () => {
  test("is registered under richtext.edit with both inputs cleared of SAVE_LAST_VALUE", () => {
    expect(defaultRegistry.ensurePaths()["richtext.edit"]).toBe(DocEditOp);

    const op = new DocEditOp();
    expect(op.inputs.op.flag & 256).toBe(0);
    expect(op.inputs.inverse.flag & 256).toBe(0);
  });

  test("exec applies the edit, answers the submitter and names it to the listeners", async () => {
    const { result, pushed } = await submit(insert("a", 5, ","));

    expect(pushed).toBe(true);
    expect(texts()).toEqual(["Hello, world", "second line"]);
    expect(result.selection).toEqual(collapsed("a", 6));
    expect(result.dirtyBlocks).toEqual(["a"]);
    expect(changes).toEqual([]);
    expect(delivered).toEqual([{ change: result, source: SUBMITTER }]);
    expect(ctx.toolstack).toHaveLength(1);
  });

  test("a folded op's result reaches the listeners with its own source", async () => {
    await submit(insert("a", 11, "!"));
    const other = {};
    const toolop = edit(insert("a", 12, "?"));
    const result = toolop.result(other);
    await ctx.toolstack.foldOrExec(ctx, toolop);

    expect(delivered).toHaveLength(2);
    expect(delivered[1]).toEqual({ change: await result, source: other });
    expect(changes).toHaveLength(1);
  });

  test("undo applies the inverse and delivers through the session without a source", async () => {
    await submit(insert("a", 5, ","));
    await ctx.toolstack.undo(ctx);

    expect(texts()).toEqual(["Hello world", "second line"]);
    expect(changes).toHaveLength(1);
    expect(changes[0].dirtyBlocks).toEqual(["a"]);
    expect(changes[0].selection).toEqual(collapsed("a", 11));
    expect(delivered[1].source).toBeUndefined();
  });

  test("redo reapplies the edit and delivers through the session", async () => {
    await submit(insert("a", 5, ","));
    await ctx.toolstack.undo(ctx);
    await ctx.toolstack.redo(ctx);

    expect(texts()).toEqual(["Hello, world", "second line"]);
    expect(changes).toHaveLength(2);
    expect(changes[1].selection).toEqual(collapsed("a", 6));
  });

  test("a run of insertText folds into one entry whose undo removes the whole run", async () => {
    const first = await submit(insert("a", 11, "!"));
    const second = await submit(insert("a", 12, "?"));
    const third = await submit(insert("a", 13, "."));

    expect([first.pushed, second.pushed, third.pushed]).toEqual([true, false, false]);
    expect(texts()[0]).toBe("Hello world!?.");
    expect(second.result.selection).toEqual(collapsed("a", 13));
    expect(third.result.selection).toEqual(collapsed("a", 14));
    expect(ctx.toolstack).toHaveLength(1);

    const head = ctx.toolstack[0] as DocEditOp;
    expect(head.op).toEqual(insert("a", 11, "!?."));

    await ctx.toolstack.undo(ctx);
    expect(texts()[0]).toBe("Hello world");
    expect(changes).toHaveLength(1);

    await ctx.toolstack.redo(ctx);
    expect(texts()[0]).toBe("Hello world!?.");
  });

  test("a run of backward deletes folds and redoes as one range", async () => {
    await submit(del("a", 10, 11));
    const second = await submit(del("a", 9, 10));

    expect(second.pushed).toBe(false);
    expect(texts()[0]).toBe("Hello wor");
    expect((ctx.toolstack[0] as DocEditOp).op).toEqual(del("a", 9, 11));

    await ctx.toolstack.undo(ctx);
    expect(texts()[0]).toBe("Hello world");
    await ctx.toolstack.redo(ctx);
    expect(texts()[0]).toBe("Hello wor");
  });

  test("a run of forward deletes folds and redoes as one range", async () => {
    await submit(del("a", 0, 1));
    await submit(del("a", 0, 1));

    expect(texts()[0]).toBe("llo world");
    expect((ctx.toolstack[0] as DocEditOp).op).toEqual(del("a", 0, 2));
    expect(ctx.toolstack).toHaveLength(1);

    await ctx.toolstack.undo(ctx);
    expect(texts()[0]).toBe("Hello world");
  });

  test("a bumped run counter ends the run", async () => {
    await submit(insert("a", 11, "!"), 0);
    const next = await submit(insert("a", 12, "?"), 1);

    expect(next.pushed).toBe(true);
    expect(ctx.toolstack).toHaveLength(2);

    await ctx.toolstack.undo(ctx);
    expect(texts()[0]).toBe("Hello world!");
  });

  test("a splitBlock ends the run", async () => {
    await submit(insert("a", 11, "!"));
    const split = await submit({
      type    : "splitBlock",
      at      : { block: "a", offset: 12 },
      newBlock: "n",
    });
    const after = await submit(insert("n", 0, "?"));

    expect(split.pushed).toBe(true);
    expect(after.pushed).toBe(true);
    expect(ctx.toolstack).toHaveLength(3);
    expect(texts()).toEqual(["Hello world!", "?", "second line"]);

    await ctx.toolstack.undo(ctx);
    await ctx.toolstack.undo(ctx);
    expect(texts()).toEqual(["Hello world!", "second line"]);
  });

  test("ops that never fold push even with a shared run and block", async () => {
    const mark: EditOp = {
      type : "toggleMark",
      range: { anchor: { block: "a", offset: 0 }, head: { block: "a", offset: 5 } },
      mark : "bold",
    };
    await submit(mark);
    await submit(mark);

    expect(ctx.toolstack).toHaveLength(2);
    expect(doc.blocks[0].marks).toEqual([]);
  });

  test("a deleteRange across blocks pushes", async () => {
    await submit(del("a", 10, 11));
    const across = await submit({
      type : "deleteRange",
      range: { anchor: { block: "a", offset: 10 }, head: { block: "b", offset: 0 } },
    });

    expect(across.pushed).toBe(true);
    expect(texts()).toEqual(["Hello worlsecond line"]);
  });

  test("a different session on the same stack never folds", async () => {
    const stack = new ToolStack();
    openDocument(stack);
    await submit(insert("a", 11, "!"));

    const firstSession = session;
    openDocument(stack);
    const next = await submit(insert("a", 11, "!"));

    expect(next.pushed).toBe(true);
    expect(stack).toHaveLength(2);
    expect(firstSession.id).not.toBe(session.id);
  });

  test("undo after dispose is a no-op", async () => {
    await submit(insert("a", 5, ","));
    session.dispose();

    await ctx.toolstack.undo(ctx);
    expect(texts()[0]).toBe("Hello, world");
    expect(changes).toEqual([]);
    expect(ctx.toolstack.cur).toBe(-1);

    await ctx.toolstack.redo(ctx);
    expect(texts()[0]).toBe("Hello, world");
  });

  test("a disposed session refuses new edits and folds", async () => {
    await submit(insert("a", 11, "!"));
    session.dispose();

    const toolop = edit(insert("a", 12, "?"));
    await ctx.toolstack.foldOrExec(ctx, toolop);
    expect(texts()[0]).toBe("Hello world!");
  });

  test("interleaves with an unrelated op on a shared stack", async () => {
    openDocument(app.toolstack);
    await submit(insert("a", 11, "!"));
    await app.toolstack.execTool(app, new CounterOp());
    const next = await submit(insert("a", 12, "?"));

    expect(next.pushed).toBe(true);
    expect(app.toolstack).toHaveLength(3);
    expect(CounterOp.counter).toBe(1);
    expect(texts()[0]).toBe("Hello world!?");

    await app.toolstack.undo();
    expect(texts()[0]).toBe("Hello world!");
    await app.toolstack.undo();
    expect(CounterOp.counter).toBe(0);
    await app.toolstack.undo();
    expect(texts()[0]).toBe("Hello world");
    expect(changes).toHaveLength(2);

    await app.toolstack.redo();
    await app.toolstack.redo();
    await app.toolstack.redo();
    expect(texts()[0]).toBe("Hello world!?");
    expect(CounterOp.counter).toBe(1);
  });

  test("leaves SavedToolDefaults untouched", async () => {
    // registration seeds the record with the empty defaults; a run must not overwrite them
    const before = { ...SavedToolDefaults.valuesFor("richtext.edit") };

    await submit(insert("a", 11, "!"));
    await submit(insert("a", 12, "?"));
    await submit(insert("a", 13, "."), 1);
    await ctx.toolstack.undo(ctx);
    await ctx.toolstack.redo(ctx);

    expect(SavedToolDefaults.valuesFor("richtext.edit")).toEqual(before);
    expect(before.op ?? "").toBe("");
  });
});
