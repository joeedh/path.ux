import { afterEach, describe, expect, test, vi } from "vitest";
import { DataAPI } from "../scripts/path-controller/controller/controller";
import { DataPathError } from "../scripts/path-controller/controller/controller_base";
import { ToolMacro } from "../scripts/path-controller/toolsys/toolmacro";
import { ToolOp } from "../scripts/path-controller/toolsys/toolop";
import type { ToolDef } from "../scripts/path-controller/toolsys/toolop";
import { defaultRegistry, ToolRegistry } from "../scripts/path-controller/toolsys/toolregistry";
import { buildToolSysAPI } from "../scripts/path-controller/toolsys/toolsys";
import { IntProperty } from "../scripts/path-controller/toolsys/toolprop";
import type { ContextLike } from "../scripts/path-controller/controller/controller_abstract";

/**
 * `ctx.last_tool.<input>` reads and writes the running op's own properties, which is what
 * the last-tool panel binds. A macro assembles its inputs rather than declaring them, so
 * it gets there through the struct its generated type class carries.
 */

class Step extends ToolOp<{ count: IntProperty }> {
  static tooldef(): ToolDef {
    return {
      uiname  : "Step",
      toolpath: "last_tool_test.step",
      inputs  : { count: new IntProperty(1) },
      outputs : {},
    };
  }
}

/** Runs `fn` with console.warn silenced. */
function quiet<T>(fn: () => T): T {
  const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
  try {
    return fn();
  } finally {
    spy.mockRestore();
  }
}

const registries: ToolRegistry[] = [];

/** A fresh context class each time, since buildToolSysAPI stamps the prototype once. */
function makeCtx() {
  const registry = new ToolRegistry();
  registries.push(registry);
  registry.register(Step);

  class Ctx {
    api!: DataAPI<any>;
    toolstack: { headOp: ToolOp | undefined } = { headOp: undefined };
  }

  const api = new DataAPI<any>();
  api.registries = [registry];

  const root = api.mapStruct(Ctx);
  api.setRoot(root);
  buildToolSysAPI(api as DataAPI, false, root, Ctx as never);

  const ctx = new Ctx();
  ctx.api = api;

  return { api, ctx, registry };
}

afterEach(() => {
  for (const registry of registries) {
    for (const cls of [...registry.classes]) {
      registry.unregister(cls);
    }
  }
  registries.length = 0;
});

describe("ctx.last_tool reaches a live op", () => {
  test("an ordinary tool reads and writes through its class struct", () => {
    const { api, ctx } = makeCtx();

    const op = new Step();
    op.inputs.count.setValue(7);
    ctx.toolstack.headOp = op;

    expect(api.getValue(ctx as never, "last_tool.count")).toBe(7);

    api.setValue(ctx as never, "last_tool.count", 9);
    expect(op.inputs.count.getValue()).toBe(9);
  });

  test("a macro reads and writes through its generated type class", () => {
    const { api, ctx, registry } = makeCtx();

    registry.stamp(ToolMacro as never);

    try {
      const macro = new ToolMacro<ContextLike>();
      const step = new Step();

      macro.add(step);
      macro._getTypeClass();
      macro.inputs.count.setValue(4);

      ctx.toolstack.headOp = macro as unknown as ToolOp;

      expect(api.getValue(ctx as never, "last_tool.count")).toBe(4);

      api.setValue(ctx as never, "last_tool.count", 12);
      expect(macro.inputs.count.getValue()).toBe(12);

      // add() hands the macro the member's own property, so the write lands on what runs
      expect(step.inputs.count.getValue()).toBe(12);
    } finally {
      defaultRegistry.stamp(ToolMacro as never);
    }
  });

  test("a macro with no tools yet resolves nothing rather than caching an empty struct", () => {
    const { api, ctx, registry } = makeCtx();

    registry.stamp(ToolMacro as never);

    try {
      const macro = new ToolMacro<ContextLike>();
      ctx.toolstack.headOp = macro as unknown as ToolOp;

      quiet(() => {
        expect(() => api.getValue(ctx as never, "last_tool.count")).toThrow(DataPathError);
      });

      // The placeholder class the miss went through is the one add() goes on to finish
      macro.add(new Step());
      macro._getTypeClass();
      macro.inputs.count.setValue(3);

      expect(api.getValue(ctx as never, "last_tool.count")).toBe(3);
    } finally {
      defaultRegistry.stamp(ToolMacro as never);
    }
  });

  test("two macro shapes get one struct each", () => {
    const { api, ctx, registry } = makeCtx();

    class Other extends ToolOp<{ size: IntProperty }> {
      static tooldef(): ToolDef {
        return {
          uiname  : "Other",
          toolpath: "last_tool_test.other",
          inputs  : { size: new IntProperty(2) },
          outputs : {},
        };
      }
    }

    registry.stamp(ToolMacro as never);

    try {
      const first = new ToolMacro<ContextLike>();
      first.add(new Step());
      first._getTypeClass();

      const second = new ToolMacro<ContextLike>();
      second.add(new Other());
      second._getTypeClass();

      ctx.toolstack.headOp = first as unknown as ToolOp;
      expect(api.getValue(ctx as never, "last_tool.count")).toBe(1);

      // A struct is named after the class it maps, so both would answer "MacroTypeClass"
      // and the second would be dropped as a duplicate were the key not the name
      ctx.toolstack.headOp = second as unknown as ToolOp;
      expect(api.getValue(ctx as never, "last_tool.size")).toBe(2);
      quiet(() => {
        expect(() => api.getValue(ctx as never, "last_tool.count")).toThrow(DataPathError);
      });
    } finally {
      defaultRegistry.stamp(ToolMacro as never);
    }
  });
});
