import { test, expect, beforeAll } from "vitest";
import { DataAPI, DataStruct } from "../scripts/path-controller/controller/controller";
import { Vector3 } from "../scripts/path-controller/util/vectormath";
import { UIBase } from "../scripts/core/ui_base";
import { VectorPanel } from "../scripts/widgets/ui_widgets2";
// registers the slider elements VectorPanel builds its axes from
import "../scripts/pathux";

beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window ||= globalThis;

  // sliders render to a 2d canvas; happy-dom has no real context
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
});

class Light {
  dir = new Vector3([0.45, 0.8, 0.35]);
}

function buildFixture() {
  const api = new DataAPI();
  const root = new DataStruct();
  api.setRoot(root);

  const st = api.mapStruct(Light);
  st.vec3("dir", "dir", "Direction").decimalPlaces(3).noUnits();
  root.struct("light", "light", "Light", st);

  const ctx = { api, light: new Light() } as unknown as VectorPanel["ctx"];
  return { api, ctx };
}

function makePanel(ctx: VectorPanel["ctx"]) {
  const panel = UIBase.createElement("vector-panel-x") as VectorPanel;
  // value-level use keeps ui_widgets2's customElements.define side effect from being elided
  if (!(panel instanceof VectorPanel)) {
    throw new Error("vector-panel-x failed to register");
  }
  panel.ctx = ctx;
  panel.checkInit();
  panel.setAttribute("datapath", "light.dir");
  return panel;
}

test("the first delivery loads the value and unit params, not just the name", () => {
  const { api, ctx } = buildFixture();
  const panel = makePanel(ctx);
  const path = "light.dir";
  const value = api.getValue(ctx, path) as Vector3;

  // one delivery only: push watchers never redeliver an unchanged value
  panel.updateFromPath(value, { resolved: true, path, prop: undefined, source: "push" });

  expect(panel.name).toBe("Direction");
  expect([...panel.value]).toEqual([0.45, 0.8, 0.35]);
  expect(panel.sliders.length).toBe(3);
  for (const slider of panel.sliders) {
    const s = slider as unknown as { decimalPlaces: number; displayUnit: string };
    expect(s.decimalPlaces).toBe(3);
    expect(s.displayUnit).toBe("none");
  }
});

/** A panel bound before init, as Container.prop builds one. Counts its rebuilds. */
function makeBoundPanel(ctx: VectorPanel["ctx"]) {
  const panel = UIBase.createElement("vector-panel-x") as VectorPanel;
  if (!(panel instanceof VectorPanel)) {
    throw new Error("vector-panel-x failed to register");
  }
  let rebuilds = 0;
  const rebuild = panel.rebuild.bind(panel);
  panel.rebuild = () => {
    rebuilds++;
    rebuild();
  };
  panel.ctx = ctx;
  panel.setAttribute("datapath", "light.dir");
  panel.checkInit();
  return { panel, rebuilds: () => rebuilds };
}

test("a bound panel builds its sliders once, on the first delivery", () => {
  const { api, ctx } = buildFixture();
  const { panel, rebuilds } = makeBoundPanel(ctx);
  expect(rebuilds()).toBe(0);
  expect(panel.sliders.length).toBe(0);

  const path = "light.dir";
  const value = api.getValue(ctx, path) as Vector3;
  panel.updateFromPath(value, { resolved: true, path, prop: undefined, source: "push" });

  expect(rebuilds()).toBe(1);
  expect(panel.name).toBe("Direction");
  expect(panel.sliders.length).toBe(3);
});

test("a bound panel whose path doesn't resolve shows its default sliders, disabled", () => {
  const { ctx } = buildFixture();
  const { panel, rebuilds } = makeBoundPanel(ctx);

  panel.updateFromPath(undefined, {
    resolved: false,
    path    : "light.dir",
    prop    : undefined,
    source  : "push",
  });

  expect(rebuilds()).toBe(1);
  expect(panel.sliders.length).toBe(3);
  expect(panel.internalDisabled).toBe(true);
});
