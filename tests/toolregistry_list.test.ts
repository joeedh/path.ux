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
 * Stage 2 of `documentation/plans/per-api-tool-tables.md`: an api carries an ordered list
 * of registries and merges them into one toolpath table it owns. Within one api a toolpath
 * names one tool, which is what makes the bare string usable as an identity.
 */

function tool(path: string, count = 1) {
  return class extends ToolOp<{ count: IntProperty }> {
    static tooldef(): ToolDef {
      return {
        uiname  : path,
        toolpath: path,
        inputs  : { count: new IntProperty(count) },
        outputs : {},
      };
    }
  };
}

const AlphaTool = tool("list_alpha.run", 1);
const BetaTool = tool("list_beta.run", 2);
const ClashA = tool("list_clash.run", 3);
const ClashB = tool("list_clash.run", 4);
const LateTool = tool("list_late.run", 5);

/** Its own member and macro subclass, since the save below writes a value. */
class LateStep extends ToolOp<{ count: IntProperty }> {
  static tooldef(): ToolDef {
    return {
      uiname  : "Late Step",
      toolpath: "list_late_step.run",
      inputs  : { count: new IntProperty(1) },
      outputs : {},
    };
  }
}

/** Never registered: a macro key is built from its members' class names, not their paths. */
class MacroStep extends ToolOp<{ count: IntProperty }> {
  static tooldef(): ToolDef {
    return {
      uiname  : "Macro Step",
      toolpath: "list_macro.step",
      inputs  : { count: new IntProperty(1) },
      outputs : {},
    };
  }
}

/** One subclass for both registries, so the two macros come out the same shape. */
class SharedMacro extends ToolMacro<ContextLike> {
  static override tooldef(): ToolDef {
    return { uiname: "Shared Macro", toolpath: "list_macro.shared" };
  }
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

function makeRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registries.push(registry);
  return registry;
}

afterEach(() => {
  // The stamp outlives the registry that left it, so every class has to be handed back
  for (const registry of registries) {
    for (const cls of [...registry.classes]) {
      registry.unregister(cls);
    }
  }
  registries.length = 0;
});

describe("an api merges the registries it lists", () => {
  test("both namespaces resolve through one api", () => {
    const first = makeRegistry();
    const second = makeRegistry();

    first.register(AlphaTool);
    second.register(BetaTool);

    const api = new DataAPI<any>();
    api.registries = [first, second];

    expect(api.parseToolPath("list_alpha.run")).toBe(AlphaTool);
    expect(api.parseToolPath("list_beta.run")).toBe(BetaTool);
    expect(api.parseToolArgs("list_beta.run(count=3)")).toEqual({ count: 3 });

    // ...and the table records which registry answered, so a defaults binding has an owner
    expect(api.toolPaths.get("list_alpha.run")?.registry).toBe(first);
    expect(api.toolPaths.get("list_beta.run")?.registry).toBe(second);

    // An api that lists neither still sees only the default registry
    expect(quiet(() => new DataAPI<any>().parseToolPath("list_beta.run"))).toBe(undefined);
  });

  test("registry is an alias for the first entry, and defaults to the default registry", () => {
    const api = new DataAPI<any>();

    expect(api.registries).toEqual([defaultRegistry]);
    expect(api.registry).toBe(defaultRegistry);

    const other = makeRegistry();
    api.registry = other;

    expect(api.registry).toBe(other);
    expect(api.registries).toEqual([other]);
  });

  test("one registry cannot collide with itself, so constructing an api never throws", () => {
    const only = makeRegistry();

    only.register(ClashA);
    only.register(ClashB);

    const api = new DataAPI<any>();
    api.registries = [only];

    // Two classes in one registry sharing a toolpath stays last-wins, as initPaths has it
    expect(api.parseToolPath("list_clash.run")).toBe(ClashB);
    expect(() => new DataAPI<any>()).not.toThrow();
  });

  test("two registries offering one toolpath is an error naming both", () => {
    const first = makeRegistry();
    const second = makeRegistry();

    first.register(ClashA);
    second.register(ClashB);

    const api = new DataAPI<any>();
    api.registries = [first, second];

    // Not a DataPathError, which parseToolPath answers undefined for
    expect(() => api.parseToolPath("list_clash.run")).toThrow(/two registries offer/);
    expect(() => api.parseToolPath("list_clash.run")).toThrow(first.structName);
    expect(() => api.parseToolPath("list_clash.run")).toThrow(second.structName);
  });

  test("two macros of one shape are the exemption, and the first listed wins", () => {
    const first = makeRegistry();
    const second = makeRegistry();

    // A macro key is structural, so two registries holding one means two macros of the
    // same shape — which is the intent rather than a collision. Generating into a chosen
    // registry means stamping the macro class, since _getTypeClass reads the stamp
    const build = (registry: ToolRegistry) => {
      registry.stamp(SharedMacro as never);

      const macro = new SharedMacro();
      macro.add(new MacroStep());

      return macro._getTypeClass();
    };

    const held = build(first);
    build(second);

    const key = held.tooldef().toolpath as string;
    expect(Object.keys(first.macros)).toContain(key);
    expect(Object.keys(second.macros)).toContain(key);

    const api = new DataAPI<any>();
    api.registries = [first, second];

    expect(() => api.parseToolPath(key)).not.toThrow();
    expect(api.toolPaths.get(key)?.registry).toBe(first);
  });
});

describe("the table follows what the registries hold", () => {
  test("a tool registered after the api was built resolves", () => {
    class Ctx {
      api!: DataAPI<any>;
      toolstack = {};
    }

    const registry = makeRegistry();
    const api = new DataAPI<any>();
    api.registry = registry;

    const root = api.mapStruct(Ctx);
    api.setRoot(root);
    buildToolSysAPI(api as DataAPI, false, root, Ctx as never);

    expect(quiet(() => api.parseToolPath("list_late.run"))).toBe(undefined);

    registry.register(LateTool);
    expect(api.parseToolPath("list_late.run")).toBe(LateTool);

    registry.unregister(LateTool);
    expect(quiet(() => api.parseToolPath("list_late.run"))).toBe(undefined);
  });

  test("a registry the api lists but never built into is still picked up", () => {
    const registry = makeRegistry();

    const api = new DataAPI<any>();
    api.registries = [registry];

    // Nothing ran buildAPI here, so the registry has no api to notify; a miss rebuilds
    registry.register(AlphaTool);
    expect(api.parseToolPath("list_alpha.run")).toBe(AlphaTool);
  });

  test("an unknown toolpath is still a DataPathError from the registry-backed callers", () => {
    const api = new DataAPI<any>();

    expect(() => api.parseToolArgs("list_missing.run()")).toThrow(DataPathError);
    expect(() => api.createTool({} as never, "list_missing.run()")).toThrow(DataPathError);
  });
});

describe("a macro reaches the table it was not in when the api was built", () => {
  test("it resolves, and its defaults land under the reserved prefix", () => {
    class Ctx {
      api!: DataAPI<any>;
      toolstack = {};
    }

    const registry = makeRegistry();
    registry.register(LateStep);

    const api = new DataAPI<any>();
    api.registries = [registry];

    const root = api.mapStruct(Ctx);
    api.setRoot(root);
    buildToolSysAPI(api as DataAPI, false, root, Ctx as never);

    const ctx = new Ctx() as Ctx & { toolDefaults: unknown };
    ctx.api = api;

    // Built before the macro exists, so the table it lands in is already in use
    expect(api.getValue(ctx as never, "toolDefaults.list_late_step.run.count")).toBe(1);

    // _getTypeClass reads the stamp on the macro's own class, so routing one into a
    // chosen registry means stamping ToolMacro itself
    registry.stamp(ToolMacro as never);

    let key: string;
    let cls: ReturnType<ToolMacro<ContextLike>["_getTypeClass"]>;

    try {
      const macro = new ToolMacro<ContextLike>();
      macro.add(new LateStep());

      cls = macro._getTypeClass();
      key = cls.tooldef().toolpath as string;

      expect(key).toBe("macro.LateStep$$count");
      expect(api.parseToolPath(key)).toBe(cls);

      // A macro seeds nothing until the first save, which is what the warning says
      macro.inputs.count.setValue(17);
      quiet(() => macro.saveDefaultInputs());
    } finally {
      defaultRegistry.stamp(ToolMacro as never);
    }

    expect(registry.defaults.values.get(key)).toEqual({ count: 17 });

    // The whole point of "$": every part of the key is a JS identifier, so the key is one
    // datapath segment and the leaf reads and writes like any other tool's
    expect(api.getValue(ctx as never, `toolDefaults.${key}.count`)).toBe(17);
    api.setValue(ctx as never, `toolDefaults.${key}.count`, 23);
    expect(registry.defaults.values.get(key)).toEqual({ count: 23 });

    // The reserved prefix is a node of its own, so the authored toolpaths are untouched
    expect(api.getValue(ctx as never, "toolDefaults.list_late_step.run.count")).toBe(1);
  });

  test("the path container.toolPanel composes resolves for a macro", () => {
    class Ctx {
      api!: DataAPI<any>;
      toolstack = {};
    }

    const registry = makeRegistry();
    const api = new DataAPI<any>();
    api.registries = [registry];

    const root = api.mapStruct(Ctx);
    api.setRoot(root);
    buildToolSysAPI(api as DataAPI, false, root, Ctx as never);

    const ctx = new Ctx() as Ctx & { toolDefaults: unknown };
    ctx.api = api;

    registry.stamp(ToolMacro as never);

    try {
      const macro = new ToolMacro<ContextLike>();
      macro.add(new LateStep());
      macro._getTypeClass();
      macro.inputs.count.setValue(5);
      quiet(() => macro.saveDefaultInputs());
    } finally {
      defaultRegistry.stamp(ToolMacro as never);
    }

    // toolPanelImpl builds "toolDefaults." + tdef.toolpath + "." + apiname per input and
    // hands each to container.prop, so this is the binding a tool panel would make
    const tdef = api.parseToolPath("macro.LateStep$$count")!._getFinalToolDef();
    const paths: string[] = [];

    for (const k in tdef.inputs) {
      paths.push(`toolDefaults.${tdef.toolpath}.${tdef.inputs[k].apiname ?? k}`);
    }

    expect(paths).toEqual(["toolDefaults.macro.LateStep$$count.count"]);
    expect(api.getValue(ctx as never, paths[0])).toBe(5);
  });
});
