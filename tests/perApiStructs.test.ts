import { beforeAll, describe, expect, test, vi } from "vitest";
import { DataAPI, DataStruct } from "../scripts/path-controller/controller/controller";
import { ToolOp } from "../scripts/path-controller/toolsys/toolop";
import type { ToolDef } from "../scripts/path-controller/toolsys/toolop";
import { defaultRegistry, ToolRegistry } from "../scripts/path-controller/toolsys/toolregistry";
import { buildToolSysAPI } from "../scripts/path-controller/toolsys/toolsys";
import { IntProperty } from "../scripts/path-controller/toolsys/toolprop";

/**
 * Stage 1 of `documentation/plans/per-api-structs.md`: what two `DataAPI`s in one process
 * actually share today. Everything here records current behaviour, including the two places
 * it is wrong — the `useGlobalRegistry` opt-out, and `structs` holding only what its own api
 * built. Stage 3 fixes the first; stage 2 must not disturb any of it.
 */

/** Registered before either api is built. */
class EarlyTool extends ToolOp<{ count: IntProperty }> {
  static tooldef(): ToolDef {
    return {
      uiname  : "Early Tool",
      toolpath: "perapi.early",
      inputs  : { count: new IntProperty(1) },
      outputs : {},
    };
  }
}

/** Registered after both, which is the case `cache.api` currently decides. */
class LateTool extends ToolOp<{ count: IntProperty }> {
  static tooldef(): ToolDef {
    return {
      uiname  : "Late Tool",
      toolpath: "perapi.late",
      inputs  : { count: new IntProperty(2) },
      outputs : {},
    };
  }
}

class Model {
  size = 1;
}

class ShellCtx {
  api!: DataAPI<any>;
  toolstack: { head?: ToolOp } = {};
}

class PaneCtx {
  api!: DataAPI<any>;
  toolstack: { head?: ToolOp } = {};
}

const apiA = new DataAPI<any>();
const apiB = new DataAPI<any>();

const ctxA = new ShellCtx() as ShellCtx & { last_tool: unknown };
const ctxB = new PaneCtx() as PaneCtx & { last_tool: unknown };

let rootA: DataStruct;
let rootB: DataStruct;

beforeAll(() => {
  ToolOp.register(EarlyTool);

  rootA = new DataStruct();
  apiA.setRoot(rootA);
  buildToolSysAPI(apiA as DataAPI, false, rootA, ShellCtx as never);
  ctxA.api = apiA;

  rootB = new DataStruct();
  apiB.setRoot(rootB);
  buildToolSysAPI(apiB as DataAPI, false, rootB, PaneCtx as never);
  ctxB.api = apiB;

  ToolOp.register(LateTool);
});

describe("what two DataAPIs share", () => {
  test("the roots differ and everything below them is one object", () => {
    expect(rootA).not.toBe(rootB);

    expect(rootA.pathmap["toolDefaults"].data).toBe(rootB.pathmap["toolDefaults"].data);
    expect(apiA.mapStruct(Model as never, true)).toBe(apiB.mapStruct(Model as never, true));
    expect(apiA.getStruct(EarlyTool)).toBe(apiB.getStruct(EarlyTool));
  });

  test("a tool registered after both builds reaches both", () => {
    // The registry reaches every api it has been built against, rather than the newest
    expect(defaultRegistry.apis()).toContain(apiA);
    expect(defaultRegistry.apis()).toContain(apiB);

    expect(apiA.getValue(ctxA, "toolDefaults.perapi.late.count")).toBe(2);
    expect(apiB.getValue(ctxB, "toolDefaults.perapi.late.count")).toBe(2);
  });

  test("structs holds what that api created, not what it can reach", () => {
    // Model was created by whichever api asked first, so only that one lists it
    const st = apiA.mapStruct(Model as never, true);
    const inA = apiA.getStructs().includes(st);
    const inB = apiB.getStructs().includes(st);

    expect(inA).not.toBe(inB);
    expect(apiA.getStruct(Model as never)).toBe(st);
    expect(apiB.getStruct(Model as never)).toBe(st);
  });
});

describe("the useGlobalRegistry opt-out", () => {
  test("marks a class mapped process-wide but gives it no struct", () => {
    class Private {}
    const priv = new DataStruct();
    const owner = new DataAPI<any>();

    owner._addClass(Private, priv, undefined, false);

    // Wrong, and stage 3 fixes it: the stamp lands before the early return, so every api
    // reports the class as mapped while none of them can reach the struct
    expect(owner.hasStruct(Private)).toBe(true);
    expect(apiA.hasStruct(Private)).toBe(true);
    expect(owner.mapStruct(Private as never, true)).toBe(undefined);
    expect(apiA.mapStruct(Private as never, true)).toBe(undefined);

    // The owning api can still reach it, but only through its own list
    expect(owner.getStructs()).toContain(priv);
  });
});

describe("saving a default with no api built yet", () => {
  test("seeds the value rather than throwing", () => {
    class Orphan extends ToolOp<{ count: IntProperty }> {
      static tooldef(): ToolDef {
        return {
          uiname  : "Orphan Tool",
          toolpath: "perapi.orphan",
          inputs  : { count: new IntProperty(3) },
          outputs : {},
        };
      }
    }

    const registry = new ToolRegistry();
    registry.register(Orphan);

    const tool = new Orphan();
    tool.inputs.count.setValue(9);

    // set() warns that the tool is not in the map, then seeds it anyway
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      tool.saveDefaultInputs();
    } finally {
      warn.mockRestore();
    }

    expect(registry.defaults.get(Orphan, "count", tool.inputs.count)).toBe(9);
    registry.unregister(Orphan);
  });
});

describe("ctx.last_tool", () => {
  test("resolves a late-registered tool's inputs", () => {
    // The struct behind this comes from buildOpAPI, which updateDefaults only reaches
    // through the api it falls back to. Stage 2 must keep it built.
    const tool = new LateTool();
    tool.inputs.count.setValue(7);
    ctxA.toolstack.head = tool as ToolOp;

    expect(apiA.getValue(ctxA, "last_tool.count")).toBe(7);

    ctxB.toolstack.head = tool as ToolOp;
    expect(apiB.getValue(ctxB, "last_tool.count")).toBe(7);
  });
});
