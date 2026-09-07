import { beforeEach, describe, expect, test } from "vitest";
import { ToolStack } from "../scripts/path-controller/toolsys/toolstack";
import { ToolOp, ToolRefusedError, UndoFlags } from "../scripts/path-controller/toolsys/toolop";
import type { CanRunResult } from "../scripts/path-controller/toolsys/toolop";
import type { ContextLike } from "../scripts/path-controller/controller/controller_abstract";

/** What each op did, so a refusal can be shown to have run nothing. */
let log: string[] = [];

const ctx = { state: {}, api: {}, toolstack: undefined, screen: {} } as unknown as ContextLike;

/** An op whose verdict the test sets, and which records every lifecycle step it reaches. */
function opClass(toolpath: string, verdict: () => CanRunResult | Promise<CanRunResult>) {
  return class extends ToolOp {
    constructor(readonly tag = toolpath) {
      super();
    }

    static override canRun() {
      return verdict();
    }

    static tooldef() {
      return { toolpath, uiname: toolpath, inputs: {}, outputs: {} };
    }

    override undoPre() {
      log.push(`${this.tag}:undoPre`);
    }
    override undo() {
      log.push(`${this.tag}:undo`);
    }
    override exec() {
      log.push(`${this.tag}:exec`);
    }
  };
}

const Allowed = opClass("test.allowed", () => true);
const Refused = opClass("test.refused", () => ({ reason: "nothing is selected" }));

function newStack() {
  const stack = new ToolStack(ctx);
  (ctx as { toolstack: unknown }).toolstack = stack;
  return stack;
}

beforeEach(() => {
  log = [];
});

describe("execTool", () => {
  test("throws ToolRefusedError carrying the reason and the toolpath", async () => {
    const stack = newStack();
    const error = await stack.execTool(ctx, new Refused()).catch((e: unknown) => e);

    expect(ToolRefusedError.is(error)).toBe(true);
    expect((error as ToolRefusedError).reason).toBe("nothing is selected");
    expect((error as ToolRefusedError).toolpath).toBe("test.refused");
  });

  test("refuses before the op runs, and leaves the stack alone", async () => {
    const stack = newStack();
    await stack.execTool(ctx, new Allowed());

    const before = { length: stack.length, cur: stack.cur };
    await expect(stack.execTool(ctx, new Refused())).rejects.toThrow(ToolRefusedError);

    expect(log).toEqual(["test.allowed:undoPre", "test.allowed:exec"]);
    expect({ length: stack.length, cur: stack.cur }).toEqual(before);
  });

  test("a bare false refuses with a stand-in sentence", async () => {
    const stack = newStack();
    const Terse = opClass("test.terse", () => false);

    const error = await stack.execTool(ctx, new Terse()).catch((e: unknown) => e);
    expect((error as ToolRefusedError).reason).toBeTruthy();
  });

  test("an async canRun is awaited", async () => {
    const stack = newStack();
    const Late = opClass("test.late", () => Promise.resolve({ reason: "still loading" }));

    await expect(stack.execTool(ctx, new Late())).rejects.toThrow("still loading");
    expect(log).toEqual([]);
  });

  test("a canRun reading the toolstack does not deadlock", async () => {
    const stack = newStack();
    // The check runs outside protect, so canRun may read the stack without waiting on itself
    const Reader = opClass("test.reader", () => {
      void stack.head;
      return true;
    });

    await stack.execTool(ctx, new Reader());
    expect(log).toEqual(["test.reader:undoPre", "test.reader:exec"]);
  });
});

describe("execOrRedo", () => {
  test("refuses without running its undo", async () => {
    const stack = newStack();
    const Toggle = opClass("test.toggle", () => allowed);
    let allowed: CanRunResult = true;

    await stack.execOrRedo(ctx, new Toggle());
    expect(log).toEqual(["test.toggle:undoPre", "test.toggle:exec"]);

    // A gate inside _execTool would let the undo land and then throw, losing an op
    allowed = { reason: "the document closed" };
    await expect(stack.execOrRedo(ctx, new Toggle())).rejects.toThrow(ToolRefusedError);

    expect(log).toEqual(["test.toggle:undoPre", "test.toggle:exec"]);
    expect(stack.length).toBe(1);
  });
});

describe("foldOrExec", () => {
  test("refuses the fold branch too", async () => {
    let allowed: CanRunResult = true;

    class FoldOp extends ToolOp {
      static override canRun() {
        return allowed;
      }
      static tooldef() {
        return { toolpath: "test.fold", uiname: "Fold", inputs: {}, outputs: {} };
      }
      foldKey() {
        return "same";
      }
      foldFrom() {
        log.push("fold");
      }
      override exec() {
        log.push("exec");
      }
      override undoPre() {}
      override undo() {}
    }

    const stack = newStack();
    await stack.foldOrExec(ctx, new FoldOp());
    await stack.foldOrExec(ctx, new FoldOp());
    expect(log).toEqual(["exec", "fold"]);

    allowed = { reason: "the drag left the canvas" };
    await expect(stack.foldOrExec(ctx, new FoldOp())).rejects.toThrow(ToolRefusedError);
    expect(log).toEqual(["exec", "fold"]);
  });
});

describe("undo and redo", () => {
  test("still run once the op has started refusing", async () => {
    let allowed: CanRunResult = true;
    const Once = opClass("test.once", () => allowed);

    const stack = newStack();
    await stack.execTool(ctx, new Once());

    // Re-running something already on the stack is not a new authorization decision
    allowed = { reason: "not any more" };
    await stack.undo();
    expect(log).toEqual(["test.once:undoPre", "test.once:exec", "test.once:undo"]);

    await stack.redo();
    expect(log[log.length - 1]).toBe("test.once:exec");
  });
});

describe("no-undo ops", () => {
  test("are gated like any other", async () => {
    const NoUndo = class extends ToolOp {
      static override canRun() {
        return { reason: "the view is locked" };
      }
      static tooldef() {
        return {
          toolpath: "test.noundo",
          uiname  : "NoUndo",
          inputs  : {},
          outputs : {},
          undoflag: UndoFlags.NO_UNDO,
        };
      }
      override exec() {
        log.push("noundo:exec");
      }
    };

    const stack = newStack();
    await expect(stack.execTool(ctx, new NoUndo())).rejects.toThrow("the view is locked");
    expect(log).toEqual([]);
  });
});
