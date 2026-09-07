import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { DataAPI } from "../scripts/path-controller/controller/controller";
import { MacroClasses, ToolMacro } from "../scripts/path-controller/toolsys/toolmacro";
import { SavedToolDefaults } from "../scripts/path-controller/toolsys/tooldefaults";
import {
  defaultRegistry,
  registryOf,
  ToolRegistry,
} from "../scripts/path-controller/toolsys/toolregistry";
import { ToolClasses, ToolOp } from "../scripts/path-controller/toolsys/toolop";
import type { IToolOpConstructor, ToolDef } from "../scripts/path-controller/toolsys/toolop";
import { buildToolSysAPI } from "../scripts/path-controller/toolsys/toolsys";
import { ToolStack } from "../scripts/path-controller/toolsys/toolstack";
import { IntProperty, StringProperty } from "../scripts/path-controller/toolsys/toolprop";
import type { ContextLike } from "../scripts/path-controller/controller/controller_abstract";

/**
 * Regression net for `documentation/plans/tool-registry.md` stage 1: the saved-defaults
 * cache, macro type classes and the register/unregister pair, none of which were covered
 * before the module tool tables move onto a registry object. Every expectation records
 * what the code does today, including the one place where that still looks wrong.
 */

/* ------------------------------------------------------------------ */
/*  Harness                                                           */
/* ------------------------------------------------------------------ */

const api = new DataAPI<any>();

/** Tools the running test registered, taken back out again in afterEach. */
let registered: IToolOpConstructor[] = [];

/** Macro keys present before any test ran, so afterEach can drop the ones a test added. */
let macroKeys = new Set<string>();

function register(cls: IToolOpConstructor): void {
  ToolOp.register(cls);
  registered.push(cls);
}

/** Runs `fn` with console.warn captured, and returns the lines it wrote. */
function recordWarnings(fn: () => void): string[] {
  const warnings: string[] = [];
  const spy = vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
    warnings.push(args.map((arg) => String(arg)).join(" "));
  });

  try {
    fn();
  } finally {
    spy.mockRestore();
  }

  return warnings;
}

beforeAll(() => {
  // The registry learns its apis from this first pass, and until it has one updateDefaults
  // has nowhere to build, so every lookup below would miss
  buildToolSysAPI(api as DataAPI, false);
  expect(defaultRegistry.apis()).toContain(api);
  expect(SavedToolDefaults.registry).toBe(defaultRegistry);

  macroKeys = new Set(Object.keys(MacroClasses));
});

afterEach(() => {
  for (const cls of registered) {
    ToolOp.unregister(cls);
  }
  registered = [];

  for (const key of Object.keys(MacroClasses)) {
    if (!macroKeys.has(key)) {
      delete MacroClasses[key];
    }
  }
});

/* ------------------------------------------------------------------ */
/*  register -> construct -> saveDefaultInputs -> construct           */
/* ------------------------------------------------------------------ */

class RoundTripTool extends ToolOp<{ count: IntProperty; label: StringProperty }> {
  static tooldef(): ToolDef {
    return {
      uiname  : "Round Trip Tool",
      toolpath: "tooldefaults.round_trip",
      inputs  : { count: new IntProperty(1), label: new StringProperty("a") },
      outputs : {},
    };
  }
}

/** A second class, because userSetMap is keyed on the toolpath and nothing ever clears it. */
class UseDefaultTool extends ToolOp<{ count: IntProperty }> {
  static tooldef(): ToolDef {
    return {
      uiname  : "Use Default Tool",
      toolpath: "tooldefaults.use_default",
      inputs  : { count: new IntProperty(1) },
      outputs : {},
    };
  }
}

describe("a saved default reaches the next instance", () => {
  test("saveDefaultInputs changes what the constructor loads", () => {
    register(RoundTripTool);

    const first = new RoundTripTool();
    expect(first.inputs.count.getValue()).toBe(1);

    first.inputs.count.setValue(7);
    first.inputs.label.setValue("z");
    first.saveDefaultInputs();

    const second = new RoundTripTool();
    expect(second.inputs.count.getValue()).toBe(7);
    expect(second.inputs.label.getValue()).toBe("z");

    // The constructor loads a default without counting it as a set value, so a tool
    // built from defaults is still distinguishable from one an argument reached
    expect(second.inputs.count.wasSet).toBe(false);
  });

  test("hasDefault answers for a registered tool before anything is saved", () => {
    register(UseDefaultTool);

    const tool = new UseDefaultTool();

    // has() asks whether registration built an accessor, not whether a value was
    // ever saved into it; useDefault() is the question about the saved value
    expect(tool.hasDefault(tool.inputs.count, "count")).toBe(true);
    expect(SavedToolDefaults.useDefault(UseDefaultTool, "count", tool.inputs.count)).toBe(false);
    expect(tool.getDefault(tool.inputs.count, "count")).toBe(1);

    tool.inputs.count.setValue(3);
    tool.saveDefaultInputs();

    expect(SavedToolDefaults.useDefault(UseDefaultTool, "count", tool.inputs.count)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  ToolMacro defaults, through _getTypeClass()                       */
/* ------------------------------------------------------------------ */

/* A macro's generated key is its accessor path, and nothing clears an accessor, so
   each test below needs member tools whose names no other test reuses. */

class MacroStep extends ToolOp<{ count: IntProperty }> {
  static tooldef(): ToolDef {
    return {
      uiname  : "Macro Step",
      toolpath: "tooldefaults.macro_step",
      inputs  : { count: new IntProperty(1) },
      outputs : {},
    };
  }
}

class ShareStep extends ToolOp<{ count: IntProperty }> {
  static tooldef(): ToolDef {
    return {
      uiname  : "Share Step",
      toolpath: "tooldefaults.share_step",
      inputs  : { count: new IntProperty(1) },
      outputs : {},
    };
  }
}

class FirstStep extends ToolOp<{ count: IntProperty }> {
  static tooldef(): ToolDef {
    return {
      uiname  : "First Step",
      toolpath: "tooldefaults.first_step",
      inputs  : { count: new IntProperty(1) },
      outputs : {},
    };
  }
}

class SecondStep extends ToolOp<{ count: IntProperty }> {
  static tooldef(): ToolDef {
    return {
      uiname  : "Second Step",
      toolpath: "tooldefaults.second_step",
      inputs  : { count: new IntProperty(1) },
      outputs : {},
    };
  }
}

describe("a ToolMacro reaches its defaults through _getTypeClass", () => {
  test("the generated class is unregistered, so the first save builds its accessor", () => {
    register(MacroStep);

    const macro = new ToolMacro<ContextLike>();
    macro.add(new MacroStep());

    const cls = macro._getTypeClass();

    // The key doubles as the accessor path, so it is what a registry would have to
    // namespace; it carries no ".", so it lands as one top-level accessor
    expect(cls.tooldef().toolpath).toBe("MacroStep:count:");
    expect(MacroClasses["MacroStep:count:"]).toBe(cls);

    // Stamped where it is generated, since it never passes through register() — being
    // owned by a registry and being in its class list are separate things
    expect(registryOf(cls)).toBe(defaultRegistry);
    expect(ToolOp.isRegistered(cls as unknown as IToolOpConstructor)).toBe(false);

    // Nothing registers a macro type class, so the accessor register() would have
    // built does not exist until the first save asks for it
    expect(macro.hasDefault(macro.inputs.count, "count")).toBe(false);

    macro.inputs.count.setValue(99);
    const warnings = recordWarnings(() => macro.saveDefaultInputs());

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/was not in the default map; unregistered\?/);

    expect(macro.hasDefault(macro.inputs.count, "count")).toBe(true);
    expect(macro.getDefault(macro.inputs.count, "count")).toBe(99);
  });

  test("a second macro of the same shape loads the first one's saved default", () => {
    register(ShareStep);

    const first = new ToolMacro<ContextLike>();
    first.add(new ShareStep());
    first.inputs.count.setValue(99);
    recordWarnings(() => first.saveDefaultInputs());

    const second = new ToolMacro<ContextLike>();
    second.add(new ShareStep());

    expect(second._getTypeClass()).toBe(first._getTypeClass());

    // A macro cannot load defaults in its constructor the way a ToolOp does, so the
    // value arrives only once exec/modalStart calls loadDefaults
    expect(second.inputs.count.getValue()).toBe(1);
    second.loadDefaults(true);
    expect(second.inputs.count.getValue()).toBe(99);
  });

  test("the key names every member tool, so two shapes stay apart", () => {
    register(FirstStep);
    register(SecondStep);

    const pair = new ToolMacro<ContextLike>();
    pair.add(new FirstStep());
    pair.add(new SecondStep());

    const single = new ToolMacro<ContextLike>();
    single.add(new SecondStep());

    expect(pair._getTypeClass().tooldef().toolpath).toBe("FirstStep:SecondStep:count:");
    expect(single._getTypeClass().tooldef().toolpath).toBe("SecondStep:count:");
    expect(single._getTypeClass()).not.toBe(pair._getTypeClass());

    pair.inputs.count.setValue(55);
    recordWarnings(() => pair.saveDefaultInputs());

    single.loadDefaults(true);
    expect(single.inputs.count.getValue()).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/*  unregister then re-register, as setDataPathToolOp does it         */
/* ------------------------------------------------------------------ */

class ReRegisterTool extends ToolOp<{ count: IntProperty }> {
  static tooldef(): ToolDef {
    return {
      uiname  : "Re-register Tool",
      toolpath: "tooldefaults.reregister",
      inputs  : { count: new IntProperty(1) },
      outputs : {},
    };
  }
}

describe("unregister then re-register", () => {
  // setDataPathToolOp itself is off limits here: it unregisters DataPathSetOp and never
  // puts it back, which would leave the shared registry broken for every later test
  test("the sequence setDataPathToolOp runs keeps the saved value", () => {
    register(ReRegisterTool);

    const before = new ReRegisterTool();
    before.inputs.count.setValue(7);
    before.saveDefaultInputs();
    expect(new ReRegisterTool().inputs.count.getValue()).toBe(7);

    ToolOp.unregister(ReRegisterTool);

    // Unregistering drops the class from the table and leaves the cache alone, so a
    // tool built from an unregistered class still gets the saved default
    expect(ToolOp.isRegistered(ReRegisterTool)).toBe(false);
    expect(new ReRegisterTool().inputs.count.getValue()).toBe(7);

    // isRegistered() is the gate setDataPathToolOp puts the re-registration behind
    if (!ToolOp.isRegistered(ReRegisterTool)) {
      ToolOp.register(ReRegisterTool);
    }

    // register() rebuilds the accessors, but only seeds the ones it finds missing
    expect(new ReRegisterTool().inputs.count.getValue()).toBe(7);
    const prop = new ReRegisterTool().inputs.count;
    expect(SavedToolDefaults.useDefault(ReRegisterTool, "count", prop)).toBe(true);
  });

  test("registering twice warns and leaves one entry", () => {
    register(ReRegisterTool);

    const warnings = recordWarnings(() => ToolOp.register(ReRegisterTool));

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/Tried to register same ToolOp class twice/);
    expect(ToolClasses.filter((cls) => cls === ReRegisterTool)).toHaveLength(1);
  });

  test("unregistering a class that was never registered is a no-op", () => {
    const length = ToolClasses.length;

    ToolOp.unregister(ReRegisterTool);

    expect(ToolClasses.length).toBe(length);
  });
});

/* ------------------------------------------------------------------ */
/*  a subclass of a registered tool                                   */
/* ------------------------------------------------------------------ */

class BaseTool extends ToolOp<{ count: IntProperty; label: StringProperty }> {
  static tooldef(): ToolDef {
    return {
      uiname  : "Base Tool",
      toolpath: "tooldefaults.base",
      inputs  : { count: new IntProperty(1), label: new StringProperty("a") },
      outputs : {},
    };
  }
}

/** No tooldef() of its own, so the static lookup inherits the parent's toolpath. */
class InheritedPathTool extends BaseTool {}

class OwnPathTool extends BaseTool {
  static tooldef(): ToolDef {
    return {
      uiname  : "Own Path Tool",
      toolpath: "tooldefaults.own_path",
      inputs  : { extra: new IntProperty(3) },
      outputs : {},
    };
  }
}

describe("a subclass of a registered tool", () => {
  test("an unregistered subclass inherits the parent's toolpath and its defaults", () => {
    register(BaseTool);

    const parent = new BaseTool();
    parent.inputs.count.setValue(7);
    parent.saveDefaultInputs();

    const child = new InheritedPathTool();

    // Statics inherit, so tooldef() resolves to the parent's and the accessor
    // lookup lands on the parent's entry
    expect(ToolOp.isRegistered(InheritedPathTool)).toBe(false);
    expect(child.hasDefault(child.inputs.count, "count")).toBe(true);
    expect(child.inputs.count.getValue()).toBe(7);
  });

  test("that subclass writes the parent's defaults too", () => {
    register(BaseTool);

    const child = new InheritedPathTool();
    child.inputs.count.setValue(42);
    child.saveDefaultInputs();

    expect(new BaseTool().inputs.count.getValue()).toBe(42);
  });

  test("a subclass with its own toolpath has no accessor until it is registered", () => {
    register(BaseTool);

    const parent = new BaseTool();
    parent.inputs.count.setValue(7);
    parent.saveDefaultInputs();

    const child = new OwnPathTool();

    // The inputs still come down the prototype chain, but the toolpath does not, so
    // nothing built an accessor and the tooldef value stands
    expect(child.inputs.count).toBeDefined();
    expect(child.hasDefault(child.inputs.count, "count")).toBe(false);
    expect(child.inputs.count.getValue()).toBe(1);
    expect(child.getDefault(child.inputs.count, "count")).toBe(1);

    register(OwnPathTool);

    const registeredChild = new OwnPathTool();
    expect(registeredChild.hasDefault(registeredChild.inputs.count, "count")).toBe(true);
    expect(registeredChild.inputs.count.getValue()).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/*  the registry a class belongs to                                    */
/* ------------------------------------------------------------------ */

class StampTool extends ToolOp<{ count: IntProperty }> {
  static tooldef(): ToolDef {
    return {
      uiname  : "Stamp Tool",
      toolpath: "tooldefaults.stamp",
      inputs  : { count: new IntProperty(1) },
      outputs : {},
    };
  }
}

/** No tooldef() of its own, so it inherits both the toolpath and the stamp. */
class StampChild extends StampTool {}

class RouteTool extends ToolOp<{ count: IntProperty }> {
  static tooldef(): ToolDef {
    return {
      uiname  : "Route Tool",
      toolpath: "tooldefaults.route",
      inputs  : { count: new IntProperty(1) },
      outputs : {},
    };
  }
}

describe("the registry a class belongs to", () => {
  test("register stamps the class and unregister takes the stamp back", () => {
    // A second registry needs no DataAPI here: register calls updateDefaults, which
    // returns early while the cache has no api to build accessors into
    const other = new ToolRegistry();

    expect(registryOf(StampTool)).toBe(defaultRegistry);

    other.register(StampTool);
    expect(registryOf(StampTool)).toBe(other);

    // The class list and the stamp are separate, and ToolOp's statics ask the default
    // registry's question
    expect(ToolOp.isRegistered(StampTool)).toBe(false);
    expect(other.isRegistered(StampTool)).toBe(true);

    other.unregister(StampTool);
    expect(registryOf(StampTool)).toBe(defaultRegistry);
  });

  test("a registry only takes back its own stamp", () => {
    const other = new ToolRegistry();

    other.register(StampTool);
    defaultRegistry.unregister(StampTool);

    expect(registryOf(StampTool)).toBe(other);

    other.unregister(StampTool);
  });

  test("a subclass inherits its parent's registry until it is registered itself", () => {
    const other = new ToolRegistry();
    const another = new ToolRegistry();

    other.register(StampTool);
    expect(registryOf(StampChild)).toBe(other);

    another.register(StampChild);
    expect(registryOf(StampChild)).toBe(another);
    expect(registryOf(StampTool)).toBe(other);

    another.unregister(StampChild);
    expect(registryOf(StampChild)).toBe(other);

    other.unregister(StampTool);
  });

  test("the stamp decides which cache a ctx-less lookup reads", () => {
    register(RouteTool);

    const tool = new RouteTool();
    tool.inputs.count.setValue(7);
    tool.saveDefaultInputs();
    expect(new RouteTool().inputs.count.getValue()).toBe(7);

    // The other registry's cache has no accessors, so the tooldef value stands — which
    // is only observable because the constructor followed the stamp rather than the
    // module-level SavedToolDefaults
    const other = new ToolRegistry();
    other.register(RouteTool);
    expect(new RouteTool().inputs.count.getValue()).toBe(1);

    other.unregister(RouteTool);
    expect(new RouteTool().inputs.count.getValue()).toBe(7);
  });
});

/* ------------------------------------------------------------------ */
/*  the macro defaults policy: seed, scope, and the connect() opt-out   */
/* ------------------------------------------------------------------ */

/* Macro inputs are macro-scoped by default, seeded from the individual toolpath at
   construction, with PropFlags.PRIVATE and connect() as the two opt-outs. The member
   tools below need names no other test reuses, since nothing clears an accessor. */

class SeedStep extends ToolOp<{ count: IntProperty }> {
  static tooldef(): ToolDef {
    return {
      uiname  : "Seed Step",
      toolpath: "tooldefaults.seed_step",
      inputs  : { count: new IntProperty(1) },
      outputs : {},
    };
  }
}

class ScopeStep extends ToolOp<{ count: IntProperty }> {
  static tooldef(): ToolDef {
    return {
      uiname  : "Scope Step",
      toolpath: "tooldefaults.scope_step",
      inputs  : { count: new IntProperty(1) },
      outputs : {},
    };
  }

  // The base class throws from both, and the run below goes through the real toolstack
  override undoPre(): void {}
  override exec(): void {}
}

class LinkSource extends ToolOp<Record<string, never>, { total: IntProperty }> {
  static tooldef(): ToolDef {
    return {
      uiname  : "Link Source",
      toolpath: "tooldefaults.link_source",
      inputs  : {},
      outputs : { total: new IntProperty(0) },
    };
  }
}

class LinkTarget extends ToolOp<{ count: IntProperty }> {
  static tooldef(): ToolDef {
    return {
      uiname  : "Link Target",
      toolpath: "tooldefaults.link_target",
      inputs  : { count: new IntProperty(1) },
      outputs : {},
    };
  }
}

describe("macro defaults are macro-scoped, seeded from the member's own toolpath", () => {
  test("a member reads its individual default at construction, and the macro overrides it", () => {
    register(SeedStep);

    // The individual toolpath's saved value, which is what a standalone SeedStep gets
    const standalone = new SeedStep();
    standalone.inputs.count.setValue(7);
    standalone.saveDefaultInputs();

    // A macro of this shape, holding a different value under its own key
    const first = new ToolMacro<ContextLike>();
    first.add(new SeedStep());
    first.inputs.count.setValue(99);
    recordWarnings(() => first.saveDefaultInputs());

    const member = new SeedStep();

    // The seed half: the member's constructor read defaultsFor(SeedStep), so it holds
    // the individual value even though the macro key says 99
    expect(member.inputs.count.getValue()).toBe(7);

    const second = new ToolMacro<ContextLike>();
    second.add(member);
    expect(second.inputs.count.getValue()).toBe(7);

    // ...and the override half, which exec and modalStart reach through loadDefaults
    second.loadDefaults(false);
    expect(second.inputs.count.getValue()).toBe(99);
  });

  test("running a macro saves under the macro key and leaves the member's toolpath alone", async () => {
    register(ScopeStep);

    const macro = new ToolMacro<ContextLike>();
    macro.add(new ScopeStep());
    macro.inputs.count.setValue(42);

    const toolstack = new ToolStack();
    const ctx = {
      state: {},
      api  : {},
      toolstack,
      screen  : {},
      toLocked: () => ctx,
    } as unknown as ContextLike;

    // toolstack.ts calls saveDefaultInputs on the op it ran; for a macro that is the
    // override writing every aliased property under the macro key
    await toolstack.execTool(ctx as never, macro as never);

    expect(macro.getDefault(macro.inputs.count, "count")).toBe(42);

    // The member shares the property object the macro just saved, so asking whether the
    // value comes back would pass either way. Ask about the member's own toolpath
    const prop = new ScopeStep().inputs.count;
    expect(SavedToolDefaults.useDefault(ScopeStep, "count", prop)).toBe(false);
    expect(prop.getValue()).toBe(1);
  });

  test("connect() takes a linked property back out of macro-scoped defaults", () => {
    register(LinkSource);
    register(LinkTarget);

    const linked = new ToolMacro<ContextLike>();
    const source = new LinkSource();
    const target = new LinkTarget();

    linked.add(source);
    linked.add(target);

    // add() aliases rather than copies, so the macro's input is the member's own object
    expect(linked.inputs.count).toBe(target.inputs.count);

    linked.connect(source, "total", target, "count");
    expect("count" in linked.inputs).toBe(false);

    // The key is built from the macro's inputs, so an unlinked property leaves it
    expect(linked._getTypeClass().tooldef().toolpath).toBe("LinkSource:LinkTarget:");

    linked.inputs.count?.setValue(31);
    recordWarnings(() => linked.saveDefaultInputs());
    expect(SavedToolDefaults.userSetMap.has("LinkSource:LinkTarget:.count")).toBe(false);

    // The same two members without the link do keep a macro-scoped value, which is what
    // makes the assertion above about connect() rather than about macros in general
    const unlinked = new ToolMacro<ContextLike>();
    unlinked.add(new LinkSource());
    unlinked.add(new LinkTarget());

    expect(unlinked._getTypeClass().tooldef().toolpath).toBe("LinkSource:LinkTarget:count:");

    unlinked.inputs.count.setValue(31);
    recordWarnings(() => unlinked.saveDefaultInputs());
    expect(SavedToolDefaults.userSetMap.has("LinkSource:LinkTarget:count:.count")).toBe(true);
  });
});
