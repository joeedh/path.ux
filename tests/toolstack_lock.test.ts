import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { ToolStack } from "../scripts/path-controller/toolsys/toolstack";
import { ToolOp, UndoFlags } from "../scripts/path-controller/toolsys/toolop";
import type { ContextLike } from "../scripts/path-controller/controller/controller_abstract";

/** Every await boundary crossed, in order, across all tools in a test. */
let log: string[] = [];

const tick = (n = 1) => {
  let p = Promise.resolve();
  for (let i = 0; i < n; i++) {
    p = p.then(() => {});
  }
  return p;
};

const ctx = { state: {}, api: {}, toolstack: undefined, screen: {} } as unknown as ContextLike;

/**
 * Yields between every lifecycle step, so an unserialized second tool has many
 * chances to slip in between this one's steps.
 */
class SlowOp extends ToolOp {
  constructor(readonly tag: string) {
    super();
  }

  static tooldef() {
    return { toolpath: "test.slow", uiname: "Slow", inputs: {}, outputs: {} };
  }

  async undoPre() {
    log.push(`${this.tag}:undoPre`);
    await tick(2);
  }

  undo() {
    log.push(`${this.tag}:undo`);
    return tick(2);
  }

  async execPre() {
    log.push(`${this.tag}:execPre`);
    await tick(2);
  }

  async exec() {
    log.push(`${this.tag}:exec`);
    await tick(2);
  }

  async execPost() {
    log.push(`${this.tag}:execPost`);
    await tick(2);
  }
}

/** Runs to completion in one turn; used to prove ordering, not interleaving. */
class FastOp extends ToolOp {
  constructor(readonly tag: string) {
    super();
  }

  static tooldef() {
    return { toolpath: "test.fast", uiname: "Fast", inputs: {}, outputs: {} };
  }

  undoPre() {}
  undo() {
    log.push(`${this.tag}:undo`);
  }
  exec() {
    log.push(`${this.tag}:exec`);
  }
}

/** Takes the modal stack instead of running, and never ends on its own. */
class ModalOp extends ToolOp {
  ended = false;
  private _end?: () => void;

  constructor(readonly tag: string) {
    super();
    this.is_modal = true;
  }

  static tooldef() {
    return { toolpath: "test.modal", uiname: "Modal", is_modal: true, inputs: {}, outputs: {} };
  }

  undoPre() {}
  undo() {
    log.push(`${this.tag}:undo`);
  }
  exec() {}

  override modalStart(): Promise<unknown> {
    log.push(`${this.tag}:modalStart`);
    return new Promise((accept) => (this._end = () => accept(undefined)));
  }

  override modalEnd(wasCancelled?: boolean) {
    this.ended = true;
    log.push(`${this.tag}:modalEnd`);
    if (wasCancelled && this._on_cancel) {
      const onCancel = this._on_cancel;
      this._on_cancel = undefined;
      onCancel(this);
    }
    this._end?.();
  }
}

const stack = () => {
  const ts = new ToolStack(ctx);
  (ctx as unknown as { toolstack: unknown }).toolstack = ts;
  return ts;
};

beforeEach(() => {
  log = [];
});

afterEach(() => {
  ToolStack.lockWarnTimeoutMS = 5000;
});

describe("toolstack serialization", () => {
  test("two execTool calls issued in the same turn do not interleave", async () => {
    const ts = stack();

    const a = ts.execTool(ctx, new SlowOp("a"));
    const b = ts.execTool(ctx, new SlowOp("b"));
    await Promise.all([a, b]);

    expect(log).toEqual([
      "a:undoPre",
      "a:execPre",
      "a:exec",
      "a:execPost",
      "b:undoPre",
      "b:execPre",
      "b:exec",
      "b:execPost",
    ]);
  });

  test("ten tools queued in one turn run in issue order", async () => {
    const ts = stack();

    const pending = [];
    for (let i = 0; i < 10; i++) {
      pending.push(ts.execTool(ctx, new SlowOp(String(i))));
    }
    await Promise.all(pending);

    const expected: string[] = [];
    for (let i = 0; i < 10; i++) {
      expected.push(`${i}:undoPre`, `${i}:execPre`, `${i}:exec`, `${i}:execPost`);
    }
    expect(log).toEqual(expected);
  });

  test("undo issued mid-execution waits for the running tool", async () => {
    const ts = stack();

    const exec = ts.execTool(ctx, new SlowOp("a"));
    const undo = ts.undo();
    await Promise.all([exec, undo]);

    expect(log).toEqual(["a:undoPre", "a:execPre", "a:exec", "a:execPost", "a:undo"]);
    expect(ts.cur).toBe(-1);
  });

  test("undo/redo pairs issued together keep their order", async () => {
    const ts = stack();

    await ts.execTool(ctx, new FastOp("a"));
    await ts.execTool(ctx, new FastOp("b"));
    log = [];

    const pending = [ts.undo(), ts.undo(), ts.redo(), ts.redo()];
    await Promise.all(pending);

    expect(log).toEqual(["b:undo", "a:undo", "a:exec", "b:exec"]);
    expect(ts.cur).toBe(1);
  });

  test("the lock is released when a tool throws", async () => {
    const ts = stack();

    class BadOp extends SlowOp {
      override async exec(): Promise<void> {
        log.push(`${this.tag}:exec`);
        throw new Error("boom");
      }
    }

    await expect(ts.execTool(ctx, new BadOp("bad"))).rejects.toThrow("boom");
    expect(ts.locked).toBe(false);

    await ts.execTool(ctx, new SlowOp("after"));
    expect(log).toContain("after:exec");
  });

  test("execOrRedo does not deadlock against its own inner undo", async () => {
    const ts = stack();

    await ts.execTool(ctx, new FastOp("a"));
    log = [];

    const same = await ts.execOrRedo(ctx, new FastOp("b"));

    expect(same).toBe(false);
    expect(log).toEqual(["a:undo", "b:exec"]);
  });

  test("rewind does not deadlock against its own undo loop", async () => {
    const ts = stack();

    await ts.execTool(ctx, new FastOp("a"));
    await ts.execTool(ctx, new FastOp("b"));
    log = [];

    await ts.rewind();

    expect(log).toEqual(["b:undo", "a:undo"]);
    expect(ts.cur).toBe(-1);
  });

  test("toolCancel does not deadlock against its own undo", async () => {
    const ts = stack();

    const tool = new FastOp("a");
    await ts.execTool(ctx, tool);
    log = [];

    await ts.toolCancel(ctx, tool);
    expect(log).toEqual(["a:undo"]);
  });

  test("execOrRedo with compareInputs reruns without deadlocking", async () => {
    const ts = stack();

    const tool = new FastOp("a");
    await ts.execTool(ctx, tool);
    log = [];

    const same = await ts.execOrRedo(ctx, new FastOp("a"), true);

    expect(same).toBe(false);
    expect(log).toEqual(["a:undo", "a:exec"]);
  });

  test("replay does not deadlock against its own rewind", async () => {
    const ts = stack();

    await ts.execTool(ctx, new FastOp("a"));
    await ts.execTool(ctx, new FastOp("b"));
    log = [];

    await ts.replay();

    expect(log).toEqual(["b:undo", "a:undo", "a:exec", "b:exec"]);
  });
});

describe("modal tools", () => {
  test("a modal tool releases the toolstack once it owns the modal stack", async () => {
    const ts = stack();

    const modal = new ModalOp("m");
    await ts.execTool(ctx, modal);

    expect(ts.locked).toBe(false);
    expect(modal.ended).toBe(false);
    expect(ts.modal_running).toBe(true);
  });

  test("a gesture can commit a tool before its own modalEnd", async () => {
    const ts = stack();

    const modal = new ModalOp("m");
    await ts.execTool(ctx, modal);

    // what a gesture's _commit does: run the undoable op, then end the modal
    const commit = ts.execTool(ctx, new SlowOp("commit"));
    modal.modalEnd();

    await commit;
    expect(log).toEqual([
      "m:modalStart",
      "m:modalEnd",
      "commit:undoPre",
      "commit:execPre",
      "commit:exec",
      "commit:execPost",
    ]);
    expect(ts.modal_running).toBe(false);
  });

  test("a cancelled modal tool is undone and popped", async () => {
    const ts = stack();

    const modal = new ModalOp("m");
    await ts.execTool(ctx, modal);
    expect(ts.length).toBe(1);

    modal.modalEnd(true);
    await tick(8);

    expect(log).toContain("m:undo");
    expect(ts.length).toBe(0);
    expect(ts.cur).toBe(-1);
  });
});

describe("deadlock watchdog", () => {
  test("reports a waiter that outlives the timeout", async () => {
    const ts = stack();
    ToolStack.lockWarnTimeoutMS = 10;

    const reports: [string, string | undefined][] = [];
    ts.onPossibleDeadlock = (waiter, holder) => reports.push([waiter, holder]);

    let release!: () => void;
    class BlockedOp extends FastOp {
      override exec(): Promise<void> {
        return new Promise((accept) => (release = () => accept()));
      }
    }

    const held = ts.execTool(ctx, new BlockedOp("held"));
    const waiter = ts.undo();

    await new Promise((accept) => setTimeout(accept, 40));
    expect(reports).toEqual([["undo", "execTool"]]);

    release();
    await Promise.all([held, waiter]);
  });

  test("stays quiet when operations complete promptly", async () => {
    const ts = stack();
    ToolStack.lockWarnTimeoutMS = 50;

    const reports: string[] = [];
    ts.onPossibleDeadlock = (waiter) => reports.push(waiter);

    await Promise.all([ts.execTool(ctx, new SlowOp("a")), ts.execTool(ctx, new SlowOp("b"))]);

    await new Promise((accept) => setTimeout(accept, 80));
    expect(reports).toEqual([]);
  });

  test("the watchdog is disabled by a zero timeout", async () => {
    const ts = stack();
    ToolStack.lockWarnTimeoutMS = 0;

    const reports: string[] = [];
    ts.onPossibleDeadlock = (waiter) => reports.push(waiter);

    let release!: () => void;
    class BlockedOp extends FastOp {
      override exec(): Promise<void> {
        return new Promise((accept) => (release = () => accept()));
      }
    }

    const held = ts.execTool(ctx, new BlockedOp("held"));
    const waiter = ts.undo();

    await new Promise((accept) => setTimeout(accept, 40));
    expect(reports).toEqual([]);

    release();
    await Promise.all([held, waiter]);
  });
});

describe("undo bookkeeping", () => {
  test("undoPre runs exactly once per tool", async () => {
    const ts = stack();

    await ts.execTool(ctx, new SlowOp("a"));
    expect(log.filter((l) => l === "a:undoPre")).toHaveLength(1);
  });

  test("a tool is pushed onto the stack exactly once", async () => {
    const ts = stack();

    await ts.execTool(ctx, new FastOp("a"));
    expect(ts.length).toBe(1);
    expect(ts.cur).toBe(0);
  });

  test("a NO_UNDO tool is not pushed", async () => {
    const ts = stack();

    const tool = new FastOp("a");
    tool.undoflag = UndoFlags.NO_UNDO;
    await ts.execTool(ctx, tool);

    expect(ts.length).toBe(0);
    expect(ts.cur).toBe(-1);
  });
});
