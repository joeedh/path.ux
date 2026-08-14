import { beforeAll, beforeEach, expect, test } from "vitest";
import { UIBase } from "../scripts/core/ui_base";
import type { Container } from "../scripts/core/ui";
import type { TextBox } from "../scripts/widgets/ui_textbox";
/* both classes are used only as types above, so the element registrations they
 * perform on import need naming explicitly or the import is elided */
import "../scripts/core/ui";
import "../scripts/widgets/ui_textbox";
import { DataAPI, clearPathWatchers } from "../scripts/path-controller/controller/controller";

beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window ||= globalThis;
});

/* the watcher registry is module-global state; isolate each test */
beforeEach(() => {
  clearPathWatchers();
});

class Brush {
  name = "default";
}

class Root {
  brush = new Brush();
  api!: DataAPI;
}

function makeCtx() {
  const api = new DataAPI();

  const brushDef = api.mapStruct(Brush);
  brushDef.string("name", "name");

  const rootDef = api.mapStruct(Root);
  rootDef.struct("brush", "brush", "Brush", brushDef);
  api.rootContextStruct = rootDef;

  const root = new Root();
  root.api = api;

  return root;
}

function makeContainer(ctx: Root): Container {
  const container = UIBase.createElement("rowframe-x") as Container;
  container.ctx = ctx as never;
  container._init();
  return container;
}

test("a path-bound textbox shows its value, not the string 'undefined'", () => {
  const ctx = makeCtx();
  const box = makeContainer(ctx).textbox("brush.name" as never) as TextBox;

  expect(box.text).toBe("default");
});

test("an explicit literal still wins over the binding", () => {
  const ctx = makeCtx();
  const box = makeContainer(ctx).textbox("brush.name" as never, "typed") as TextBox;

  expect(box.text).toBe("typed");
});

test("an unbound textbox with no text is empty", () => {
  const ctx = makeCtx();
  const box = makeContainer(ctx).textbox() as TextBox;

  expect(box.text).toBe("");
});
