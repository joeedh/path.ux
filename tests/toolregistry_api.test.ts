import { afterEach, describe, expect, test, vi } from "vitest";
import { DataAPI } from "../scripts/path-controller/controller/controller";
import { DataPathError } from "../scripts/path-controller/controller/controller_base";
import { ToolOp } from "../scripts/path-controller/toolsys/toolop";
import type { ToolDef } from "../scripts/path-controller/toolsys/toolop";
import { parseToolPath } from "../scripts/path-controller/toolsys/toolpath";
import { defaultRegistry, ToolRegistry } from "../scripts/path-controller/toolsys/toolregistry";
import { buildToolSysAPI } from "../scripts/path-controller/toolsys/toolsys";
import { IntProperty } from "../scripts/path-controller/toolsys/toolprop";

/**
 * `ModelInterface.registry` is the seam a subsystem gets its own tool namespace through:
 * everything reached via `ctx.api` resolves against it rather than against the module
 * tables. These check that an api pointed at a second registry stops seeing the default
 * one, in both directions.
 */

class PrivateTool extends ToolOp<{ count: IntProperty }> {
  static tooldef(): ToolDef {
    return {
      uiname  : "Private Tool",
      toolpath: "stage4.private",
      inputs  : { count: new IntProperty(1) },
      outputs : {},
    };
  }
}

/** Doubles as the data-api root, the way a real context does. */
class Ctx {
  api!: DataAPI<any>;
  toolstack = {};
}

/** Runs `fn` with console.warn silenced — a miss warns before it returns undefined. */
function quiet<T>(fn: () => T): T {
  const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
  try {
    return fn();
  } finally {
    spy.mockRestore();
  }
}

const registries: ToolRegistry[] = [];

const makeRegistry = () => {
  const registry = new ToolRegistry();
  registries.push(registry);
  return registry;
};

afterEach(() => {
  // The stamp outlives the registry that left it, so every class has to be handed back
  for (const registry of registries) {
    for (const cls of [...registry.classes]) {
      registry.unregister(cls);
    }
  }
  registries.length = 0;
});

describe("an api resolves against its own registry", () => {
  test("a toolpath the default registry never saw", () => {
    const other = makeRegistry();
    other.register(PrivateTool);

    const api = new DataAPI<any>();
    api.registry = other;

    expect(api.parseToolPath("stage4.private")).toBe(PrivateTool);
    expect(api.parseToolArgs("stage4.private(count=3)")).toEqual({ count: 3 });

    // The free function and the window hook stay wired to the default registry
    expect(quiet(() => new DataAPI<any>().parseToolPath("stage4.private"))).toBe(undefined);
    expect(() => parseToolPath("stage4.private()")).toThrow(DataPathError);
  });

  test("createTool builds from the class that registry holds", () => {
    const other = makeRegistry();
    other.register(PrivateTool);

    const api = new DataAPI<any>();
    api.registry = other;

    const tool = api.createTool({} as never, "stage4.private(count=5)");

    expect(tool).toBeInstanceOf(PrivateTool);
    expect((tool.inputs as { count: IntProperty }).count.getValue()).toBe(5);
  });

  test("getToolDef follows the same resolution", () => {
    const other = makeRegistry();
    other.register(PrivateTool);

    const api = new DataAPI<any>();
    api.registry = other;

    expect(api.getToolDef("stage4.private").uiname).toBe("Private Tool");
    expect(api.getToolDef("stage4.private|Renamed").uiname).toBe("Renamed");
  });
});

describe("ctx.toolDefaults follows the api", () => {
  test("the getter buildToolSysAPI installs reads the api's registry", () => {
    const api = new DataAPI<any>();
    const ctxStruct = api.mapStruct(Ctx);
    api.rootContextStruct = ctxStruct;

    buildToolSysAPI(api as DataAPI, false, ctxStruct, Ctx as never);

    const ctx = new Ctx() as Ctx & { toolDefaults: unknown };
    ctx.api = api;

    expect(ctx.toolDefaults).toBe(defaultRegistry.defaults);

    // The seam the plan calls the quiet one: repointing the api has to move the cache
    // the menus read, or they go on showing the default registry's values
    const other = makeRegistry();
    api.registry = other;

    expect(ctx.toolDefaults).toBe(other.defaults);
    expect(ctx.toolDefaults).not.toBe(defaultRegistry.defaults);
  });
});
