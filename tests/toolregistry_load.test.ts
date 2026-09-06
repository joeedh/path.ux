import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

/**
 * `ToolClasses`, `ToolPaths`, `MacroClasses` and `SavedToolDefaults` are aliases onto
 * `defaultRegistry`, evaluated at import time, so a module-scope cycle between the
 * registry and any of them would throw a ReferenceError — under some entry orders and
 * not others, since nothing fixes which module a consumer reaches first. Each case below
 * enters the graph through a different module and checks the aliases came out bound.
 */

const entries: Record<string, () => Promise<unknown>> = {
  toolregistry: () => import("../scripts/path-controller/toolsys/toolregistry"),
  tooldefaults: () => import("../scripts/path-controller/toolsys/tooldefaults"),
  toolop      : () => import("../scripts/path-controller/toolsys/toolop"),
  toolpath    : () => import("../scripts/path-controller/toolsys/toolpath"),
  toolmacro   : () => import("../scripts/path-controller/toolsys/toolmacro"),
  toolsys     : () => import("../scripts/path-controller/toolsys/toolsys"),
  barrel      : () => import("../scripts/path-controller/toolsys/index"),
  controller  : () => import("../scripts/path-controller/controller"),
};

// resetModules re-evaluates the sources against an nstructjs whose own registry it does
// not reset, so each reload reports every struct it already holds
let quiet: { mockRestore(): void }[] = [];

beforeEach(() => {
  quiet = [
    vi.spyOn(console, "error").mockImplementation(() => {}),
    vi.spyOn(console, "warn").mockImplementation(() => {}),
  ];
});

afterEach(() => {
  for (const spy of quiet) {
    spy.mockRestore();
  }
  vi.resetModules();
});

describe("the tables survive every entry order", () => {
  for (const [name, load] of Object.entries(entries)) {
    test(`entering through ${name}`, async () => {
      vi.resetModules();
      await load();

      const registry = await import("../scripts/path-controller/toolsys/toolregistry");
      const op = await import("../scripts/path-controller/toolsys/toolop");
      const path = await import("../scripts/path-controller/toolsys/toolpath");
      const macro = await import("../scripts/path-controller/toolsys/toolmacro");
      const defaults = await import("../scripts/path-controller/toolsys/tooldefaults");

      const { defaultRegistry } = registry;

      expect(op.ToolClasses).toBe(defaultRegistry.classes);
      expect(path.ToolPaths).toBe(defaultRegistry.paths);
      expect(macro.MacroClasses).toBe(defaultRegistry.macros);
      expect(defaults.SavedToolDefaults).toBe(defaultRegistry.defaults);

      // Identity alone would hold even if the statics had stopped delegating
      class Probe extends op.ToolOp {
        static tooldef() {
          return { uiname: "Probe", toolpath: "loadorder.probe", inputs: {}, outputs: {} };
        }
      }

      op.ToolOp.register(Probe);
      expect(op.ToolClasses.at(-1)).toBe(Probe);
      expect(op.ToolOp.isRegistered(Probe as never)).toBe(true);

      op.ToolOp.unregister(Probe);
      expect(defaultRegistry.classes.includes(Probe as never)).toBe(false);
    });
  }
});
