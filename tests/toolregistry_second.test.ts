import { beforeAll, describe, expect, test } from "vitest";
import { DataAPI, DataStruct } from "../scripts/path-controller/controller/controller";
import { DataPathError } from "../scripts/path-controller/controller/controller_base";
import { SavedToolDefaults } from "../scripts/path-controller/toolsys/tooldefaults";
import { ToolRegistry } from "../scripts/path-controller/toolsys/toolregistry";
import { ToolOp } from "../scripts/path-controller/toolsys/toolop";
import type { ToolDef } from "../scripts/path-controller/toolsys/toolop";
import { parseToolPath } from "../scripts/path-controller/toolsys/toolpath";
import { buildToolSysAPI } from "../scripts/path-controller/toolsys/toolsys";
import { IntProperty } from "../scripts/path-controller/toolsys/toolprop";

/**
 * Stage 5 of `documentation/plans/tool-registry.md`: a second registry has to work end to
 * end, and could not before, because `updateToolSysAPI` walked the default registry's class
 * list and every api shared one `DataStruct` for the defaults cache. The shape below is the
 * desktop app's — two `DataAPI`s built in sequence — with the second on a registry of its
 * own.
 *
 * The toolpath prefixes are picked apart deliberately. A prefix only one registry uses is
 * what catches a shared struct being cleared; `stage5c`, which both use, is the case the
 * last test pins.
 */

/** Registered into the default registry, which stands in for registry A. */
class SharedTool extends ToolOp<{ count: IntProperty }> {
  static tooldef(): ToolDef {
    return {
      uiname  : "Shared Tool",
      toolpath: "stage5a.shared",
      inputs  : { count: new IntProperty(1) },
      outputs : {},
    };
  }
}

/** Registry A's half of the prefix both registries write into. */
class CommonTool extends ToolOp<{ count: IntProperty }> {
  static tooldef(): ToolDef {
    return {
      uiname  : "Common Tool",
      toolpath: "stage5c.common",
      inputs  : { count: new IntProperty(2) },
      outputs : {},
    };
  }
}

/** Registered only into registry B, under a prefix registry A never uses. */
class PrivateTool extends ToolOp<{ count: IntProperty }> {
  static tooldef(): ToolDef {
    return {
      uiname  : "Private Tool",
      toolpath: "stage5b.private",
      inputs  : { count: new IntProperty(7) },
      outputs : {},
    };
  }
}

/** Its own tool, because the round trip below writes a value no other test should see. */
class SavingTool extends ToolOp<{ count: IntProperty }> {
  static tooldef(): ToolDef {
    return {
      uiname  : "Saving Tool",
      toolpath: "stage5b.saving",
      inputs  : { count: new IntProperty(3) },
      outputs : {},
    };
  }
}

/** Registry B's half of the shared prefix. */
class CollidingTool extends ToolOp<{ count: IntProperty }> {
  static tooldef(): ToolDef {
    return {
      uiname  : "Colliding Tool",
      toolpath: "stage5c.colliding",
      inputs  : { count: new IntProperty(5) },
      outputs : {},
    };
  }
}

class ShellCtx {
  api!: DataAPI<any>;
  toolstack = {};
}

class PaneCtx {
  api!: DataAPI<any>;
  toolstack = {};
}

const apiA = new DataAPI<any>();
const apiB = new DataAPI<any>();
const registryB = new ToolRegistry();

const ctxA = new ShellCtx() as ShellCtx & { toolDefaults: unknown };
const ctxB = new PaneCtx() as PaneCtx & { toolDefaults: unknown };

beforeAll(() => {
  ToolOp.register(SharedTool);
  ToolOp.register(CommonTool);

  const rootA = new DataStruct();
  apiA.setRoot(rootA);
  buildToolSysAPI(apiA as DataAPI, false, rootA, ShellCtx as never);
  ctxA.api = apiA;

  // Second, so whatever it wipes was already there to wipe
  registryB.register(PrivateTool);
  registryB.register(SavingTool);
  registryB.register(CollidingTool);
  apiB.registry = registryB;

  const rootB = new DataStruct();
  apiB.setRoot(rootB);
  buildToolSysAPI(apiB as DataAPI, false, rootB, PaneCtx as never);
  ctxB.api = apiB;
});

describe("a registry the default one never saw", () => {
  test("its tools resolve, carry defaults, and stay out of the default registry", () => {
    expect(apiB.parseToolPath("stage5b.private")).toBe(PrivateTool);
    expect(ToolOp.isRegistered(PrivateTool as never)).toBe(false);
    expect(() => parseToolPath("stage5b.private")).toThrow(DataPathError);

    expect(ctxB.toolDefaults).toBe(registryB.defaults);
    expect(apiB.getValue(ctxB, "toolDefaults.stage5b.private.count")).toBe(7);
  });

  test("a tool run through the second api saves its inputs back into that registry", () => {
    const tool = apiB.createTool(ctxB as never, "stage5b.saving(count=9)");
    tool.saveDefaultInputs();

    expect(apiB.getValue(ctxB, "toolDefaults.stage5b.saving.count")).toBe(9);
    expect(new SavingTool().inputs.count.getValue()).toBe(9);

    // The default registry's cache is a different object and must not have learned it
    expect(SavedToolDefaults.pathmap.has("stage5b.saving")).toBe(false);
    expect(SavedToolDefaults.userSetMap.has("stage5b.saving.count")).toBe(false);
  });

  test("building it left the first api's accessors alone", () => {
    expect(ctxA.toolDefaults).toBe(SavedToolDefaults);
    expect(apiA.getValue(ctxA, "toolDefaults.stage5a.shared.count")).toBe(1);
    expect(apiA.getValue(ctxA, "toolDefaults.stage5c.common.count")).toBe(2);

    // ...and neither api can read the other's values, since the caches are separate
    expect(() => apiA.getValue(ctxA, "toolDefaults.stage5b.private.count")).toThrow(DataPathError);
    expect(() => apiB.getValue(ctxB, "toolDefaults.stage5a.shared.count")).toThrow(DataPathError);
  });

  test("a toolpath prefix both registries use is one struct, shared by name", () => {
    // `_buildAccessors` maps each prefix object under the bare prefix, and mapStruct hands
    // out an existing struct of that name — so the two registries describe `stage5c` with
    // one struct even though their accessor objects are separate
    expect(SavedToolDefaults.pathmap.get("stage5c")).not.toBe(
      registryB.defaults.pathmap.get("stage5c")
    );
    expect(apiA.getStructByName("stage5c")).toBe(apiB.getStructByName("stage5c"));

    // The struct is therefore wider than either cache, and a path only the other registry
    // filled resolves and then finds nothing
    expect(() => apiA.getValue(ctxA, "toolDefaults.stage5c.colliding.count")).toThrow(
      DataPathError
    );
    expect(apiB.getValue(ctxB, "toolDefaults.stage5c.colliding.count")).toBe(5);
  });
});
