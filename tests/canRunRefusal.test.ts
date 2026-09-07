import { describe, expect, test } from "vitest";
import {
  CanRunResult,
  IToolOpConstructor,
  ToolOp,
  toolopCanRunAsync,
  toolopRefusal,
} from "../scripts/path-controller/toolsys/toolop";
import { ToolMacro } from "../scripts/path-controller/toolsys/toolmacro";
import type { ContextLike } from "../scripts/path-controller/controller/controller_abstract";

const ctx = { state: {}, api: {}, toolstack: undefined, screen: {} } as unknown as ContextLike;

/** A tool whose canRun answers whatever the test asked for. */
function opAnswering(answer: CanRunResult | Promise<CanRunResult>) {
  return class Answering extends ToolOp {
    static override canRun(): CanRunResult | Promise<CanRunResult> {
      return answer;
    }
  };
}

const clsOf = (cls: unknown) => cls as unknown as IToolOpConstructor;

describe("toolopRefusal", () => {
  test("allows on true, in both sync and promise form", async () => {
    expect(await toolopRefusal(ctx, clsOf(opAnswering(true)))).toBeUndefined();
    expect(await toolopRefusal(ctx, clsOf(opAnswering(Promise.resolve(true))))).toBeUndefined();
  });

  test("returns the sentence a refusal carries", async () => {
    const cls = clsOf(opAnswering({ reason: "the graph is a group instance" }));
    expect(await toolopRefusal(ctx, cls)).toBe("the graph is a group instance");
  });

  test("returns the sentence through a promise", async () => {
    const cls = clsOf(opAnswering(Promise.resolve({ reason: "still loading" })));
    expect(await toolopRefusal(ctx, cls)).toBe("still loading");
  });

  test("a bare false refuses with a stand-in sentence", async () => {
    expect(await toolopRefusal(ctx, clsOf(opAnswering(false)))).toBeTruthy();
  });

  test("an empty reason refuses rather than allowing", async () => {
    // Otherwise an op could allow itself by returning a refusal it forgot to fill in
    expect(await toolopRefusal(ctx, clsOf(opAnswering({ reason: "" })))).toBeTruthy();
  });

  test("the default ToolOp.canRun allows", async () => {
    expect(await toolopRefusal(ctx, clsOf(class extends ToolOp {}))).toBeUndefined();
  });
});

describe("toolopCanRunAsync", () => {
  test("normalizes a refusal object to false", async () => {
    // The object is truthy, so a caller testing truthiness would read it as permission
    const cls = clsOf(opAnswering({ reason: "nope" }));
    expect(await toolopCanRunAsync(ctx, cls)).toBe(false);
  });

  test("keeps the boolean answers it always had", async () => {
    expect(await toolopCanRunAsync(ctx, clsOf(opAnswering(true)))).toBe(true);
    expect(await toolopCanRunAsync(ctx, clsOf(opAnswering(false)))).toBe(false);
  });
});

describe("ToolMacro.canRun", () => {
  const macroOf = (...tools: ToolOp[]) => {
    const macro = new ToolMacro<ContextLike>();
    macro.tools = tools;
    return macro;
  };

  test("allows when every step allows", async () => {
    const macro = macroOf(new (opAnswering(true))(), new (opAnswering(true))());
    expect(await toolopRefusal(ctx, clsOf(ToolMacro), macro)).toBeUndefined();
  });

  test("refuses with the first refusing step's sentence", async () => {
    const macro = macroOf(
      new (opAnswering(true))(),
      new (opAnswering({ reason: "step two says no" }))(),
      new (opAnswering({ reason: "step three also says no" }))()
    );
    expect(await toolopRefusal(ctx, clsOf(ToolMacro), macro)).toBe("step two says no");
  });

  test("refuses when a step answers asynchronously", async () => {
    const macro = macroOf(
      new (opAnswering(true))(),
      new (opAnswering(Promise.resolve({ reason: "resolved late" })))()
    );
    expect(await toolopRefusal(ctx, clsOf(ToolMacro), macro)).toBe("resolved late");
  });

  test("allows an empty macro, and one polled without an instance", async () => {
    expect(await toolopRefusal(ctx, clsOf(ToolMacro), macroOf())).toBeUndefined();
    expect(await toolopRefusal(ctx, clsOf(ToolMacro))).toBeUndefined();
  });
});
