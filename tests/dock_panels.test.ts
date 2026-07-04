import { test, expect, beforeAll } from "vitest";
import { UIBase, iconmanager } from "../scripts/core/ui_base";
import type { Container } from "../scripts/core/ui";
import "../scripts/core/ui";
import {
  PanelManager,
  PanelLayoutState,
  type IPanelHost,
  type PanelDef,
} from "../scripts/screen/dock_panels";
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

function makeHost() {
  const root = UIBase.createElement("colframe-x") as Container;
  root._init();

  const host: IPanelHost = {
    ctx                : undefined as unknown as IContextBase,
    getPanelRoot       : () => root,
    panelLayoutEditable: true,
  };

  return { root, host };
}

function def(id: string, dock: PanelDef["dock"]): PanelDef {
  return {
    id,
    title: id.toUpperCase(),
    dock,
    build(container) {
      container.label(id + " contents");
    },
  };
}

function makeManager() {
  const { root, host } = makeHost();
  const pm = new PanelManager(host);

  pm.panel(def("tools", "left"));
  pm.panel(def("props", "right"));

  pm.build(root);
  pm.applyDefaultLayout();

  return pm;
}

test("default layout places panels at their declared docks", () => {
  const pm = makeManager();

  expect(pm.regions.left.order).toEqual(["tools"]);
  expect(pm.regions.right.order).toEqual(["props"]);

  expect(pm.regions.left.container!.shadow.contains(pm.panels.get("tools")!)).toBe(true);
  expect(pm.regions.left.container!.style.display).toBe("flex");
  //empty regions collapse
  expect(pm.regions.top.container!.style.display).toBe("none");
});

test("dockPanel moves panels between regions with ordering", () => {
  const pm = makeManager();

  pm.dockPanel("tools", "right", { index: 0 });

  expect(pm.regions.left.order).toEqual([]);
  expect(pm.regions.right.order).toEqual(["tools", "props"]);
  expect(pm.regions.left.container!.style.display).toBe("none");

  //DOM order matches order list
  const region = pm.regions.right.container!;
  const ids: string[] = [];
  region._forEachChildWidget((c) => {
    const id = (c as unknown as { panelId?: string }).panelId;
    if (id) ids.push(id);
  });
  expect(ids).toEqual(["tools", "props"]);
});

test("closePanel hides but retains layout position", () => {
  const pm = makeManager();

  pm.closePanel("props");
  expect(pm.isPanelClosed("props")).toBe(true);
  expect(pm.panels.get("props")!.style.display).toBe("none");
  expect(pm.regions.right.order).toEqual(["props"]);

  pm.showPanel("props");
  expect(pm.isPanelClosed("props")).toBe(false);
  expect(pm.panels.get("props")!.style.display).not.toBe("none");
});

test("hideEdge / toggleEdge control region visibility", () => {
  const pm = makeManager();

  pm.hideEdge("left");
  expect(pm.isEdgeHidden("left")).toBe(true);
  expect(pm.regions.left.container!.style.display).toBe("none");

  pm.toggleEdge("left");
  expect(pm.isEdgeHidden("left")).toBe(false);
  expect(pm.regions.left.container!.style.display).toBe("flex");
});

test("saveLayout / loadLayout round-trips layout and closed state", () => {
  const pm = makeManager();

  pm.dockPanel("tools", "right", { index: 1 });
  pm.closePanel("props");
  pm.hideEdge("bottom");
  pm.setEdgeSize("right", 300);

  const state = pm.saveLayout();
  expect(state).toBeInstanceOf(PanelLayoutState);

  const { root, host } = makeHost();
  const pm2 = new PanelManager(host);
  pm2.panel(def("tools", "left"));
  pm2.panel(def("props", "right"));
  //a panel the saved layout has never seen gets its default placement
  pm2.panel(def("extra", "top"));
  pm2.build(root);

  pm2.loadLayout(state);

  expect(pm2.regions.right.order).toEqual(["props", "tools"]);
  expect(pm2.regions.right.size).toBe(300);
  expect(pm2.isPanelClosed("props")).toBe(true);
  expect(pm2.isEdgeHidden("bottom")).toBe(true);
  expect(pm2.regions.top.order).toEqual(["extra"]);
});

test("layout state ignores unknown panel ids", () => {
  const pm = makeManager();
  const state = pm.saveLayout();

  state.regions[0].stacks[0].panelIds.push("deleted-panel");

  const { root, host } = makeHost();
  const pm2 = new PanelManager(host);
  pm2.panel(def("tools", "left"));
  pm2.panel(def("props", "right"));
  pm2.build(root);
  pm2.loadLayout(state);

  for (const side of ["left", "right", "top", "bottom"] as const) {
    expect(pm2.regions[side].order).not.toContain("deleted-panel");
  }
});
