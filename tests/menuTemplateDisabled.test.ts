import { beforeAll, describe, expect, test } from "vitest";
import { ToolOp } from "../scripts/path-controller/toolsys/toolop";
import type { CanRunResult } from "../scripts/path-controller/toolsys/toolop";
import { createMenu } from "../scripts/menu/menu_ops";
import type { IContextBase } from "../scripts/core/context_base";

beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window ||= globalThis;

  // addItemExtra measures its label on a 2d context, which happy-dom does not implement
  HTMLCanvasElement.prototype.getContext = function () {
    return { font: "", measureText: (text: string) => ({ width: text.length * 7 }) };
  } as unknown as HTMLCanvasElement["getContext"];
});

/** Tool classes the fake api resolves, keyed by toolpath. */
const tools: Record<string, typeof ToolOp> = {};

function registerTool(
  toolpath: string,
  canRun: () => CanRunResult | Promise<CanRunResult>,
  onInvoke?: () => void
) {
  tools[toolpath] = class extends ToolOp {
    static override canRun() {
      return canRun();
    }
    static override invoke(): ToolOp {
      onInvoke?.();
      return new this();
    }
  } as unknown as typeof ToolOp;
}

const ran: string[] = [];

/** Just enough api for createMenu: def lookup, hotkeys, tool construction and exec. */
function makeCtx(): IContextBase {
  return {
    api: {
      getToolDef: (path: string) => {
        if (!(path in tools)) {
          throw new Error("unknown toolpath " + path);
        }
        return { uiname: path, icon: -1 };
      },
      getToolPathHotkey: () => undefined,
      parseToolPath    : (path: string) => tools[path],
      createTool       : (_ctx: unknown, path: string) =>
        (tools[path] as unknown as { invoke(): ToolOp }).invoke(),
      execTool: (_ctx: unknown, path: string) => {
        ran.push(path);
        return Promise.resolve();
      },
    },
  } as unknown as IContextBase;
}

describe("toolpath entries", () => {
  test("a refusing tool is disabled with its reason", () => {
    registerTool("test.refuses", () => ({ reason: "no document is open" }));

    const menu = createMenu(makeCtx(), "", ["test.refuses"]);
    const row = menu.items[0];

    expect(row._disabled).toBe(true);
    expect(row.title).toBe("no document is open");
  });

  test("an allowing tool stays enabled and still dispatches", () => {
    registerTool("test.allows", () => true);
    ran.length = 0;

    const menu = createMenu(makeCtx(), "", ["test.allows"]);
    expect(menu.items[0]._disabled).toBeFalsy();

    menu._onselect!(menu.items[0]._id);
    expect(ran).toEqual(["test.allows"]);
  });

  test("canRun is asked with an instance, not undefined", () => {
    let sawInstance = false;
    tools["test.instance"] = class extends ToolOp {
      static override canRun(_ctx: unknown, toolop?: ToolOp) {
        sawInstance = toolop !== undefined;
        return true;
      }
    } as unknown as typeof ToolOp;

    createMenu(makeCtx(), "", ["test.instance"]);
    expect(sawInstance).toBe(true);
  });

  test("a promised answer starts disabled and settles", async () => {
    registerTool("test.slow", () => Promise.resolve<CanRunResult>(true));

    const menu = createMenu(makeCtx(), "", ["test.slow"]);
    const row = menu.items[0];

    // Disabled until the answer lands, so no click can slip through the window
    expect(row._disabled).toBe(true);
    expect(menu.pendingValidation).toBeInstanceOf(Promise);

    await menu.pendingValidation;
    expect(row._disabled).toBe(false);
  });

  test("a promised refusal settles disabled, with its reason", async () => {
    registerTool("test.slowNo", () => Promise.resolve<CanRunResult>({ reason: "still loading" }));

    const menu = createMenu(makeCtx(), "", ["test.slowNo"]);
    await menu.pendingValidation;

    expect(menu.items[0]._disabled).toBe(true);
    expect(menu.items[0].title).toBe("still loading");
  });

  test("no pendingValidation when every answer was synchronous", () => {
    registerTool("test.sync", () => true);

    expect(createMenu(makeCtx(), "", ["test.sync"]).pendingValidation).toBeUndefined();
  });

  test("an invoke that throws leaves the row usable", () => {
    registerTool(
      "test.throws",
      () => true,
      () => {
        throw new Error("no workspace yet");
      }
    );

    const menu = createMenu(makeCtx(), "", ["test.throws"]);

    expect(menu.items.length).toBe(1);
    expect(menu.items[0]._disabled).toBeFalsy();
  });

  test("an unknown toolpath still yields the error row", () => {
    const menu = createMenu(makeCtx(), "", ["test.missing"]);

    expect(menu.items.length).toBe(1);
    expect(menu.items[0].textContent).toContain("tool path error");
  });
});

describe("custom entries", () => {
  test("validate returning a string disables and titles the row", () => {
    const menu = createMenu(makeCtx(), "", [
      { name: "Paste", callback: () => {}, validate: () => "the clipboard is empty" },
    ]);

    expect(menu.items[0]._disabled).toBe(true);
    expect(menu.items[0].title).toBe("the clipboard is empty");
  });

  test("validate returning true leaves the row alone", () => {
    const menu = createMenu(makeCtx(), "", [
      { name: "Copy", callback: () => {}, tooltip: "Copy the selection", validate: () => true },
    ]);

    expect(menu.items[0]._disabled).toBeFalsy();
    expect(menu.items[0].title).toBe("Copy the selection");
  });

  test("the static disabled flag needs no closure", () => {
    const menu = createMenu(makeCtx(), "", [
      { name: "Redo", callback: () => {}, disabled: true },
    ]);

    expect(menu.items[0]._disabled).toBe(true);
  });

  test("validate receives the ctx createMenu was given", () => {
    const ctx = makeCtx();
    let seen: unknown;

    createMenu(ctx, "", [
      {
        name    : "Whatever",
        callback: () => {},
        validate: (given) => {
          seen = given;
          return true;
        },
      },
    ]);

    expect(seen).toBe(ctx);
  });
});
