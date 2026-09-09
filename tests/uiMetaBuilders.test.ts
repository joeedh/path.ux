import { beforeAll, describe, expect, test, vi } from "vitest";
import { UIBase } from "../scripts/core/ui_base";
import type { Container } from "../scripts/core/ui";
import "../scripts/core/ui_containers";
import "../scripts/widgets/ui_widgets";
import { ToolOp } from "../scripts/path-controller/toolsys/toolop";
import { createMenu } from "../scripts/menu/menu_ops";
import type { IContextBase } from "../scripts/core/context_base";
import { getMeta, PathToolMeta, StdUXMeta } from "../scripts/core/base/ui_meta_tags";

beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window ||= globalThis;

  // labels are measured on a 2d context, which happy-dom does not implement
  HTMLCanvasElement.prototype.getContext = function () {
    return { font: "", measureText: (text: string) => ({ width: text.length * 7 }) };
  } as unknown as HTMLCanvasElement["getContext"];
});

class Noop extends ToolOp {}

/** Just enough api for `toolImpl` and `createMenu` to resolve and describe one tool path. */
function makeCtx(): IContextBase {
  return {
    api: {
      getToolDef       : (path: string) => ({ uiname: path, toolpath: path, icon: undefined }),
      getToolPathHotkey: () => undefined,
      parseToolPath    : () => Noop,
      createTool       : () => new Noop(),
      execTool         : () => Promise.resolve(),
    },
  } as unknown as IContextBase;
}

function container(ctx: IContextBase): Container {
  const con = UIBase.createElement("rowframe-x") as Container;
  con.ctx = ctx as never;
  con.checkInit();
  return con;
}

function toolPaths(owner: object): string[] {
  const tag = getMeta(owner, StdUXMeta);
  return (tag?.tools ?? []).map((tool) => tool.toolPath);
}

describe("container.tool", () => {
  test("tags the button it builds with the tool path", () => {
    const button = container(makeCtx()).tool("test.doThing");

    expect(toolPaths(button!)).toEqual(["test.doThing"]);
    expect(getMeta(button!, StdUXMeta)!.tools[0]).toBeInstanceOf(PathToolMeta);
  });

  test("leaves a plain button untagged", () => {
    const plain = container(makeCtx()).button("Press me", () => {});

    expect(getMeta(plain, StdUXMeta)).toBeUndefined();
  });

  test("appends rather than warning and clobbering on a second write", () => {
    const con = container(makeCtx());
    const button = con.tool("test.doThing")!;

    const warned = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      button.ensureMeta(StdUXMeta).tools.push(new PathToolMeta("app.alsoThis"));
      expect(warned).not.toHaveBeenCalled();
    } finally {
      warned.mockRestore();
    }

    expect(toolPaths(button)).toEqual(["test.doThing", "app.alsoThis"]);
  });
});

describe("a tool-path menu row", () => {
  test("carries the path it was built from", () => {
    const menu = createMenu(makeCtx(), "", ["test.doThing"]);

    expect(toolPaths(menu.items[0])).toEqual(["test.doThing"]);
  });

  test("leaves a custom entry untagged", () => {
    const menu = createMenu(makeCtx(), "", [{ name: "Custom", callback: () => {} }]);

    expect(getMeta(menu.items[0], StdUXMeta)).toBeUndefined();
  });
});
