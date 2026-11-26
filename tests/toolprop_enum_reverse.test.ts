import { beforeAll, expect, test } from "vitest";
import { UIBase, iconmanager } from "../scripts/core/ui_base";
import type { IContextBase } from "../scripts/core/context_base";
import "../scripts/menu/dropbox";
import type { DropBox } from "../scripts/menu/dropbox";
import { DataAPI, DataStruct } from "../scripts/path-controller/controller/controller";
import { ToolStack } from "../scripts/path-controller/toolsys/toolstack";
import {
  EnumProperty,
  FlagProperty,
  stripEnumReverseMapping,
} from "../scripts/path-controller/toolsys/toolprop";

enum Mode {
  PREVIEW = 0,
  PATH_TRACE = 1,
}

enum Bits {
  A = 1,
  B = 2,
}

enum Named {
  ONE = "one",
  TWO = "two",
}

test("the reverse entries of a numeric enum are left out", () => {
  expect(stripEnumReverseMapping(Mode)).toEqual({ PREVIEW: 0, PATH_TRACE: 1 });
  expect(stripEnumReverseMapping(Bits)).toEqual({ A: 1, B: 2 });
});

test("other definitions keep every entry", () => {
  expect(stripEnumReverseMapping(Named)).toEqual({ ONE: "one", TWO: "two" });
  // a number key whose value doesn't map back is a value of its own
  const def = { "0": "zero", zero: 1, "2": "two", two: 2.5, "1.5": "half", half: 2 };
  expect(stripEnumReverseMapping(def)).toEqual(def);
  // negative members have reverse entries too
  enum Signed {
    LOW = -1,
    HIGH = 1,
  }
  expect(stripEnumReverseMapping(Signed)).toEqual({ LOW: -1, HIGH: 1 });
});

test("EnumProperty and FlagProperty take a numeric enum as it is", () => {
  const mode = new EnumProperty(undefined, Mode);
  expect(mode.values).toEqual({ PREVIEW: 0, PATH_TRACE: 1 });
  expect(Object.keys(mode.ui_value_names)).toEqual(["PREVIEW", "PATH_TRACE"]);
  expect(mode.keys[1]).toBe("PATH_TRACE");
  mode.setValue(1);
  expect(mode.getValue()).toBe(1);

  const bits = new FlagProperty(Bits.A, Bits);
  expect(bits.values).toEqual({ A: 1, B: 2 });

  // a definition given later is stripped the same way
  const later = new EnumProperty(0, { X: 0 });
  later.updateDefinition(Mode);
  expect(later.values).toEqual({ PREVIEW: 0, PATH_TRACE: 1 });
  expect(Object.keys(later.ui_value_names)).toEqual(["PREVIEW", "PATH_TRACE"]);
});

beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window ||= globalThis;
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
  const sheets = (iconmanager as unknown as { iconsheets: { image: unknown }[] }).iconsheets;
  for (const sheet of sheets) {
    sheet.image ||= { src: "" };
  }
});

class Settings {
  mode = Mode.PREVIEW;
}

test("a dropdown of a numeric enum lists its names and sets a number", async () => {
  const settings = new Settings();
  const api = new DataAPI();
  const st = api.mapStruct(Settings, true);
  st.enum("mode", "mode", Mode, "Mode", "The mode").uiNames({
    PREVIEW   : "Preview",
    PATH_TRACE: "Path Trace",
  });
  const root = new DataStruct();
  root.struct("settings", "settings", "Settings", st);
  api.setRoot(root);
  const ctx = { state: {}, settings, api } as Record<string, unknown>;
  ctx.toLocked = () => ctx;
  ctx.toolstack = new ToolStack(ctx as unknown as ConstructorParameters<typeof ToolStack>[0]);

  const dbox = UIBase.createElement("dropbox-x") as DropBox;
  dbox.ctx = ctx as unknown as IContextBase;
  dbox.setAttribute("datapath", "settings.mode");
  dbox.checkInit();
  dbox.prop = api.resolvePath(ctx as unknown as IContextBase, "settings.mode")!
    .prop as EnumProperty;
  await dbox._build_menu();
  const menu = dbox._menu!;
  expect(menu.items.map((li) => li.textContent)).toEqual(["Preview", "Path Trace"]);

  await menu._onselect!(Mode.PATH_TRACE);
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(settings.mode).toBe(Mode.PATH_TRACE);
});
