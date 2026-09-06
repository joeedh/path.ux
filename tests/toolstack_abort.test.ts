import { beforeEach, describe, expect, test } from "vitest";
import { ToolStack } from "../scripts/path-controller/toolsys/toolstack";
import { ToolOp, UndoFlags } from "../scripts/path-controller/toolsys/toolop";
import type { ToolExecPhase } from "../scripts/path-controller/toolsys/toolop";
import type { ContextLike } from "../scripts/path-controller/controller/controller_abstract";

/** Model state the ops below write to, so a rollback has something to observe. */
let applied: string[] = [];
/** Everything onExecError was handed, in order. */
let reported: { tag: string; phase: ToolExecPhase; error: unknown }[] = [];

const ctx = {
  state    : {},
  api      : {},
  toolstack: undefined,
  screen   : {},
  toLocked() {
    return ctx;
  },
} as unknown as ContextLike;

/** Applies its tag on exec, and throws from whichever phase it was told to. */
class Op extends ToolOp {
  constructor(
    readonly tag: string,
    public failAt?: ToolExecPhase
  ) {
    super();
  }

  static tooldef() {
    return { toolpath: "test.op", uiname: "Op", inputs: {}, outputs: {} };
  }

  private trip(phase: ToolExecPhase) {
    if (this.failAt === phase) {
      throw new Error(`${this.tag}:${phase}`);
    }
  }

  undoPre() {
    this.trip("undoPre");
  }
  execPre() {
    this.trip("execPre");
  }
  exec() {
    applied.push(this.tag);
    this.trip("exec");
  }
  execPost() {
    this.trip("execPost");
  }
  undo() {
    applied = applied.filter((t) => t !== this.tag);
  }

  override onExecError(_ctx: unknown, error: unknown, phase: ToolExecPhase) {
    reported.push({ tag: this.tag, phase, error });
  }
}

/** Reverses itself from the hook, the way a client that knows it is safe would. */
class SelfReversingOp extends Op {
  override onExecError(c: unknown, error: unknown, phase: ToolExecPhase) {
    super.onExecError(c, error, phase);
    if (phase !== "undoPre") {
      this.undo();
    }
  }
}

class NoUndoOp extends Op {
  override undoflag = UndoFlags.NO_UNDO;
}

const stackWith = async (...ops: Op[]) => {
  const stack = new ToolStack();
  for (const op of ops) {
    await stack.execTool(ctx as never, op);
  }
  return stack;
};

beforeEach(() => {
  applied = [];
  reported = [];
});

describe("a throwing tool leaves the stack as it found it", () => {
  const phases: ToolExecPhase[] = ["undoPre", "execPre", "exec", "execPost"];

  for (const phase of phases) {
    test(`a throw from ${phase} is rethrown and rolled back`, async () => {
      const stack = await stackWith(new Op("first"));

      await expect(stack.execTool(ctx as never, new Op("bad", phase))).rejects.toThrow(
        `bad:${phase}`
      );

      expect(stack.length).toBe(1);
      expect(stack.cur).toBe(0);
      expect(stack[0].tag).toBe("first");
    });
  }

  test("the redo branch the push displaced comes back", async () => {
    const stack = await stackWith(new Op("first"), new Op("second"));
    await stack.undo();
    expect(stack.cur).toBe(0);
    expect(stack.length).toBe(2);

    await expect(stack.execTool(ctx as never, new Op("bad", "exec"))).rejects.toThrow();

    expect(stack.cur).toBe(0);
    expect(stack.length).toBe(2);
    expect(stack[1].tag).toBe("second");
  });

  test("a NO_UNDO tool was never pushed, so there is nothing to roll back", async () => {
    const stack = await stackWith(new Op("first"));

    await expect(stack.execTool(ctx as never, new NoUndoOp("bad", "exec"))).rejects.toThrow();

    expect(stack.length).toBe(1);
    expect(stack.cur).toBe(0);
    expect(reported.map((r) => r.phase)).toEqual(["exec"]);
  });
});

describe("onExecError", () => {
  test("is handed the phase that threw, and the error", async () => {
    const stack = new ToolStack();

    await expect(stack.execTool(ctx as never, new Op("bad", "execPre"))).rejects.toThrow();

    expect(reported).toHaveLength(1);
    expect(reported[0].phase).toBe("execPre");
    expect((reported[0].error as Error).message).toBe("bad:execPre");
  });

  test("the stack does not reverse the op for you", async () => {
    const stack = new ToolStack();

    await expect(stack.execTool(ctx as never, new Op("bad", "execPost"))).rejects.toThrow();

    // exec ran and nothing undid it; that is the op's call to make, not the stack's
    expect(applied).toEqual(["bad"]);
  });

  test("an op that reverses itself from the hook does get reversed", async () => {
    const stack = new ToolStack();

    await expect(
      stack.execTool(ctx as never, new SelfReversingOp("bad", "execPost"))
    ).rejects.toThrow();

    expect(applied).toEqual([]);
  });

  test("a hook that throws does not replace the error reaching the caller", async () => {
    class BadHookOp extends Op {
      override onExecError(): void {
        throw new Error("hook exploded");
      }
    }

    const stack = new ToolStack();

    await expect(stack.execTool(ctx as never, new BadHookOp("bad", "exec"))).rejects.toThrow(
      "bad:exec"
    );
    expect(stack.length).toBe(0);
  });
});

describe("undo, redo, rerun and replay", () => {
  test("a throw from undo leaves cur on the tool, which is still applied", async () => {
    class BadUndo extends Op {
      override undo() {
        throw new Error("undo failed");
      }
    }
    const stack = await stackWith(new Op("first"), new BadUndo("second"));

    await expect(stack.undo()).rejects.toThrow("undo failed");

    expect(stack.cur).toBe(1);
    expect(applied).toEqual(["first", "second"]);
    expect(reported.map((r) => r.phase)).toEqual(["undo"]);
  });

  test("a throw from redo steps cur back to the entry before it", async () => {
    const stack = await stackWith(new Op("first"), new Op("second"));
    await stack.undo();
    expect(stack.cur).toBe(0);

    (stack[1] as Op).failAt = "execPre";
    await expect(stack.redo()).rejects.toThrow("second:execPre");

    expect(stack.cur).toBe(0);
    // redo is reported whole, since an overridden one is opaque to the stack
    expect(reported.map((r) => r.phase)).toEqual(["redo"]);
  });

  test("ToolOp.redo awaits each phase in order and surfaces an async throw", async () => {
    const seen: string[] = [];
    class AsyncOp extends Op {
      override async undoPre() {
        seen.push("undoPre");
      }
      override async execPre() {
        seen.push("execPre");
      }
      override async exec() {
        seen.push("exec");
        throw new Error("async exec failed");
      }
      override async execPost() {
        seen.push("execPost");
      }
    }
    const op = new AsyncOp("async");
    await expect(op.redo(ctx as never)).rejects.toThrow("async exec failed");

    // execPost is never reached, which an unawaited redo would not have managed
    expect(seen).toEqual(["undoPre", "execPre", "exec"]);
  });

  test("a rerun that cannot re-run drops the tool it already undid", async () => {
    const stack = await stackWith(new Op("first"), new Op("second"));
    const second = stack[1] as Op;
    second.failAt = "execPre";

    await expect(stack.rerun(second)).rejects.toThrow("second:execPre");

    // undo ran and execPre stopped it before exec could reapply; the stack agrees
    expect(applied).toEqual(["first"]);
    expect(stack.length).toBe(1);
    expect(stack.cur).toBe(0);
    expect(reported.map((r) => r.phase)).toEqual(["execPre"]);
  });

  test("replay rejects instead of hanging, and releases the toolstack", async () => {
    const stack = await stackWith(new Op("first"), new Op("second"));
    stack[1].failAt = "exec";

    await expect(stack.replay()).rejects.toThrow("second:exec");

    // the old executor left replay's promise unsettled, wedging the lock forever
    expect(stack.locked).toBe(false);
    await expect(stack.idle()).resolves.toBeUndefined();
    expect(reported.map((r) => r.phase)).toEqual(["exec"]);
  });

  test("replay runs every tool in order when nothing throws", async () => {
    const stack = await stackWith(new Op("first"), new Op("second"));
    applied = [];

    await expect(stack.replay()).resolves.toBe(stack);
    expect(applied).toEqual(["first", "second"]);
  });
});
