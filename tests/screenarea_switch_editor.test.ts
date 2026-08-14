import { test, expect, beforeAll, afterAll } from "vitest";
import { UIBase, iconmanager } from "../scripts/core/ui_base";
import { Area, ScreenArea } from "../scripts/screen/ScreenArea";
import { Vector2 } from "../scripts/path-controller/util/vectormath";
import type { IContextBase } from "../scripts/core/context_base";

beforeAll(() => {
  // resolvePath / theme lookups touch window in node.
  (globalThis as unknown as { window: unknown }).window ||= globalThis;

  // icon widgets render to 2d canvas; happy-dom has no real context.
  const proto = HTMLCanvasElement.prototype as unknown as {
    getContext(kind: string): unknown;
  };
  proto.getContext = () =>
    new Proxy(
      {},
      {
        get: (_t, key) => (key === "measureText" ? () => ({ width: 10 }) : () => undefined),
        set: () => true,
      }
    );

  // no iconsheet <img> elements exist in the test DOM; icon CSS lookups
  // dereference sheet.image.src, so give the sheets a stand-in.
  const sheets = (iconmanager as unknown as { iconsheets: { image: unknown }[] }).iconsheets;
  for (const sheet of sheets) {
    sheet.image ||= { src: "" };
  }
});

/** Minimal editor: no header, so no AreaDocker is built in the test DOM. */
function makeEditorClass(name: string) {
  const cls = class TestEditor extends Area {
    static define() {
      return {
        tagname : `test-editor-${name}-x`,
        areaname: `test_${name}`,
        uiname  : `Test ${name}`,
      };
    }
  };

  Area.register(cls);
  return cls;
}

const EditorA = makeEditorClass("a");
const EditorB = makeEditorClass("b");
const EditorC = makeEditorClass("c");

afterAll(() => {
  for (const cls of [EditorA, EditorB, EditorC]) {
    Area.unregister(cls);
  }
});

function makeScreenArea() {
  const sarea = UIBase.createElement("screenarea-x", true) as ScreenArea;

  sarea.ctx = {} as IContextBase;
  sarea.pos = new Vector2([0, 0]);
  sarea.size = new Vector2([100, 100]);
  sarea._init();

  return sarea;
}

function areanamesOf(sarea: ScreenArea) {
  return sarea.editors.map((e) => (e.constructor as typeof Area).define().areaname).sort();
}

test("switchEditor keeps every editor it has shown", () => {
  const sarea = makeScreenArea();

  sarea.switchEditor(EditorA);
  sarea.switchEditor(EditorB);

  expect(sarea.editors.length).toBe(2);
  expect(areanamesOf(sarea)).toEqual(["test_a", "test_b"]);
  expect(sarea.area).toBe(sarea.editormap["test_b"]);
});

test("deleteExisting destroys the other editors and reuses the target", () => {
  const sarea = makeScreenArea();

  sarea.switchEditor(EditorA);
  sarea.switchEditor(EditorB);

  const a = sarea.editormap["test_a"];
  const b = sarea.editormap["test_b"];

  //B is the active editor, so this deletes the active one and revives A
  sarea.switchEditor(EditorA, { deleteExisting: true });

  expect(sarea.editors.length).toBe(1);
  expect(areanamesOf(sarea)).toEqual(["test_a"]);
  expect(Object.keys(sarea.editormap)).toEqual(["test_a"]);

  //the surviving target is the same instance, so its UI state is intact
  expect(sarea.area).toBe(a);
  expect(a.dead).toBe(false);
  expect(a.owning_sarea).toBe(sarea);

  expect(b.dead).toBe(true);
  expect(b.owning_sarea).toBe(undefined);
  expect(b.parentNode).toBe(null);
});

test("deleteExisting with an editor the tile has never shown", () => {
  const sarea = makeScreenArea();

  sarea.switchEditor(EditorA);
  sarea.switchEditor(EditorB);

  sarea.switchEditor(EditorC, { deleteExisting: true });

  expect(sarea.editors.length).toBe(1);
  expect(areanamesOf(sarea)).toEqual(["test_c"]);
  expect(sarea.area).toBe(sarea.editormap["test_c"]);
  expect(sarea.area!.dead).toBe(false);
});

test("deleteExisting is a no-op on a tile holding only the target", () => {
  const sarea = makeScreenArea();

  sarea.switchEditor(EditorA);
  const a = sarea.editormap["test_a"];

  sarea.switchEditor(EditorA, { deleteExisting: true });

  expect(sarea.editors.length).toBe(1);
  expect(sarea.area).toBe(a);
  expect(a.dead).toBe(false);
});

test("switch_editor forwards the options object", () => {
  const sarea = makeScreenArea();

  sarea.switchEditor(EditorA);
  sarea.switch_editor(EditorB, { deleteExisting: true });

  expect(sarea.editors.length).toBe(1);
  expect(areanamesOf(sarea)).toEqual(["test_b"]);
});
