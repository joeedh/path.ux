import { ToolOp } from "../scripts/path-controller/toolsys/toolsys";
import type { ToolDef } from "../scripts/path-controller/toolsys/toolsys";
import { initToolPaths, parseToolPath } from "../scripts/path-controller/toolsys/toolpath";
import {
  BoolProperty,
  EnumProperty,
  FlagProperty,
  FloatProperty,
  IntProperty,
  StringProperty,
} from "../scripts/path-controller/toolsys/toolprop";
import { DataPathError } from "../scripts/path-controller/controller/controller_base";
import { beforeAll, describe, expect, test, vi } from "vitest";

/* ------------------------------------------------------------------ */
/*  Test tools                                                        */
/* ------------------------------------------------------------------ */

class SelectTool extends ToolOp<{
  mode: EnumProperty<number>;
  count: IntProperty;
  factor: FloatProperty;
  label: StringProperty;
  toggle: BoolProperty;
}> {
  static tooldef(): ToolDef {
    return {
      uiname  : "Select Tool",
      toolpath: "test.select",
      inputs: {
        mode  : new EnumProperty<number>(0, { ADD: 0, SUB: 1, SET: 2 }),
        count : new IntProperty(1),
        factor: new FloatProperty(0.5),
        label : new StringProperty("x"),
        toggle: new BoolProperty(false),
      },
      outputs : {},
    };
  }
}

// Child tool: parseArgs must validate inherited inputs (mode/count/...) plus its
// own `extra`, since it walks the prototype chain via _getFinalToolDef.
class ExtendedSelectTool extends SelectTool {
  static tooldef(): ToolDef {
    return {
      uiname  : "Extended Select Tool",
      toolpath: "test.select_extended",
      inputs: {
        extra: new IntProperty(3),
      },
      outputs : {},
    };
  }
}

class FlagTool extends ToolOp<{ flags: FlagProperty }> {
  static tooldef(): ToolDef {
    return {
      toolpath: "test.flag",
      inputs: {
        flags: new FlagProperty(0, { A: 1, B: 2, C: 4 }),
      },
      outputs : {},
    };
  }
}

ToolOp.register(SelectTool);
ToolOp.register(ExtendedSelectTool);
ToolOp.register(FlagTool);

beforeAll(() => {
  // toolpath.ts touches `window` at module scope; harmless to reassert in node.
  (globalThis as unknown as { window: unknown }).window ||= globalThis;
  // populate ToolPaths from the registered classes above
  initToolPaths();
});

/** Run `fn` with console.warn silenced (parseArgs warns before it throws). */
function silenceWarn<T>(fn: () => T): T {
  const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
  try {
    return fn();
  } finally {
    spy.mockRestore();
  }
}

/* ------------------------------------------------------------------ */
/*  ToolProperty.parseArg                                             */
/* ------------------------------------------------------------------ */

describe("ToolProperty.parseArg", () => {
  test("base property returns its argument unchanged", () => {
    const str = new StringProperty("x");
    expect(str.parseArg("hello")).toBe("hello");
    // base validates nothing — non-string passes through untouched
    expect(str.parseArg(42)).toBe(42);

    const bool = new BoolProperty(false);
    expect(bool.parseArg(true)).toBe(true);
  });

  test("number properties accept numbers and reject everything else", () => {
    const int = new IntProperty(1);
    expect(int.parseArg(5)).toBe(5);
    // parseArg validates the type but does NOT coerce (no flooring here)
    expect(int.parseArg(5.7)).toBe(5.7);
    expect(() => int.parseArg("5")).toThrow(/expected a number/);
    expect(() => int.parseArg(true)).toThrow(/expected a number/);

    const float = new FloatProperty(0.5);
    expect(float.parseArg(2.5)).toBe(2.5);
    expect(() => float.parseArg("nope")).toThrow(/expected a number/);
  });

  test("enum property maps a string key to its numeric value", () => {
    const en = new EnumProperty<number>(0, { ADD: 0, SUB: 1, SET: 2 });
    expect(en.parseArg("ADD")).toBe(0);
    expect(en.parseArg("SUB")).toBe(1);
    expect(en.parseArg("SET")).toBe(2);
  });

  test("enum property throws on an unknown key", () => {
    const en = new EnumProperty<number>(0, { ADD: 0, SUB: 1, SET: 2 });
    expect(() => en.parseArg("NOPE")).toThrow(/unknown key NOPE/);
  });

  test("enum property passes non-string values through unchanged", () => {
    const en = new EnumProperty<number>(0, { ADD: 0, SUB: 1, SET: 2 });
    // already-numeric values bypass key validation
    expect(en.parseArg(2)).toBe(2);
    expect(en.parseArg(99)).toBe(99);
  });

  test("flag property reuses the enum key→value parsing", () => {
    const fl = new FlagProperty(0, { A: 1, B: 2, C: 4 });
    expect(fl.parseArg("A")).toBe(1);
    expect(fl.parseArg("C")).toBe(4);
    expect(fl.parseArg(3)).toBe(3);
    expect(() => fl.parseArg("Z")).toThrow(/unknown key Z/);
  });
});

/* ------------------------------------------------------------------ */
/*  ToolOp.parseArgs                                                  */
/* ------------------------------------------------------------------ */

describe("ToolOp.parseArgs", () => {
  test("transforms enum keys and leaves other valid args untouched", () => {
    const args = SelectTool.parseArgs({ mode: "SUB", count: 2 });
    expect(args).toEqual({ mode: 1, count: 2 });
  });

  test("passes string, bool and float args through unchanged", () => {
    const args = SelectTool.parseArgs({ label: "hi", toggle: true, factor: 1.5 });
    expect(args).toEqual({ label: "hi", toggle: true, factor: 1.5 });
  });

  test("mutates and returns the same args object", () => {
    const input: Record<string, unknown> = { mode: "SET" };
    const out = SelectTool.parseArgs(input);
    expect(out).toBe(input);
    expect(out.mode).toBe(2);
  });

  test("throws on an argument with no matching input", () => {
    expect(() => silenceWarn(() => SelectTool.parseArgs({ bogus: 1 }))).toThrow(
      /unknown argument bogus/
    );
  });

  test("throws when a number input receives a non-number", () => {
    expect(() => SelectTool.parseArgs({ count: "x" })).toThrow(/expected a number/);
  });

  test("throws when an enum input receives an unknown key", () => {
    expect(() => SelectTool.parseArgs({ mode: "XYZ" })).toThrow(/unknown key XYZ/);
  });

  test("validates inputs inherited from a parent tool", () => {
    // `mode` comes from SelectTool, `extra` from ExtendedSelectTool
    const args = ExtendedSelectTool.parseArgs({ mode: "SET", extra: 9 });
    expect(args).toEqual({ mode: 2, extra: 9 });
  });

  test("an empty args object stays empty", () => {
    expect(SelectTool.parseArgs({})).toEqual({});
  });
});

/* ------------------------------------------------------------------ */
/*  parseToolPath                                                     */
/* ------------------------------------------------------------------ */

describe("parseToolPath", () => {
  test("resolves the tool class and an empty arg set", () => {
    const { toolclass, args } = parseToolPath("test.select()");
    expect(toolclass).toBe(SelectTool);
    expect(args).toEqual({});
  });

  test("converts an enum string argument to its numeric value", () => {
    const { toolclass, args } = parseToolPath("test.select(mode=SET)");
    expect(toolclass).toBe(SelectTool);
    expect(args.mode).toBe(2);
  });

  test("parses number, string and bool arguments", () => {
    const { args } = parseToolPath("test.select(count=5 label='hi' toggle=true)");
    expect(args).toEqual({ count: 5, label: "hi", toggle: true });
  });

  test("parses negative numbers", () => {
    const { args } = parseToolPath("test.select(count=-3)");
    expect(args.count).toBe(-3);
  });

  test("converts a flag string argument to its bit value", () => {
    const { toolclass, args } = parseToolPath("test.flag(flags='C')");
    expect(toolclass).toBe(FlagTool);
    expect(args.flags).toBe(4);
  });

  test("throws a DataPathError for an unknown tool", () => {
    expect(() => parseToolPath("test.does_not_exist()")).toThrow(DataPathError);
  });

  test("throws for an argument the tool does not declare", () => {
    expect(() => silenceWarn(() => parseToolPath("test.select(bogus=1)"))).toThrow(
      /unknown argument bogus/
    );
  });

  test("throws for an invalid enum key", () => {
    expect(() => parseToolPath("test.select(mode=ZZZ)")).toThrow(/unknown key ZZZ/);
  });

  test("throws when a number argument is given a string literal", () => {
    expect(() => parseToolPath("test.select(count='hi')")).toThrow(/expected a number/);
  });
});

/* ------------------------------------------------------------------ */
/*  ToolOp.invoke                                                     */
/* ------------------------------------------------------------------ */

describe("ToolOp.invoke", () => {
  test("resolves an enum key and sets it on the new tool instance", () => {
    const tool = SelectTool.invoke({}, { mode: "SET" }) as InstanceType<typeof SelectTool>;
    expect(tool.inputs.mode.getValue()).toBe(2);
    expect(tool.getInputs().mode).toBe(2);
  });

  test("sets number, string and bool inputs from args", () => {
    const tool = SelectTool.invoke({}, { count: 7, label: "hey", toggle: true }) as InstanceType<
      typeof SelectTool
    >;
    const inputs = tool.getInputs();
    expect(inputs.count).toBe(7);
    expect(inputs.label).toBe("hey");
    expect(inputs.toggle).toBe(true);
  });

  test("resolves a flag key to its bit value", () => {
    const tool = FlagTool.invoke({}, { flags: "B" }) as InstanceType<typeof FlagTool>;
    expect(tool.inputs.flags.getValue()).toBe(2);
  });

  // The core fix: invoke must throw on an enum/flag key it cannot transform,
  // rather than silently warning and leaving the default value in place.
  test("throws on an enum key it cannot transform", () => {
    expect(() => SelectTool.invoke({}, { mode: "ZZZ" })).toThrow(/unknown key ZZZ/);
  });

  test("throws on a flag key it cannot transform", () => {
    expect(() => FlagTool.invoke({}, { flags: "ZZZ" })).toThrow(/unknown key ZZZ/);
  });

  test("throws on an argument the tool does not declare", () => {
    expect(() => silenceWarn(() => SelectTool.invoke({}, { bogus: 1 }))).toThrow(
      /unknown argument bogus/
    );
  });

  test("leaves untouched inputs at their defaults", () => {
    const tool = SelectTool.invoke({}, { count: 4 }) as InstanceType<typeof SelectTool>;
    const inputs = tool.getInputs();
    expect(inputs.count).toBe(4);
    // mode/label/toggle were not passed, so they keep their tooldef defaults
    expect(inputs.mode).toBe(0);
    expect(inputs.label).toBe("x");
    expect(inputs.toggle).toBe(false);
  });
});
