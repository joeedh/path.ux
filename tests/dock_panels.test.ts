import { test, expect, beforeAll } from "vitest";
import { UIBase, iconmanager } from "../scripts/core/ui_base";
import type { Container } from "../scripts/core/ui";
import "../scripts/core/ui";
import {
  PanelManager,
  PanelLayoutState,
  RegionMode,
  StackMode,
  type IPanelHost,
  type PanelDef,
} from "../scripts/screen/dock_panels";
import type { IContextBase } from "../scripts/core/context_base";
//registers tabbar-x for rail mode (dock_panels only type-imports it)
import "../scripts/widgets/ui_tabs";

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
    ctx                   : undefined as unknown as IContextBase,
    panelLayoutEditable   : true,
    getBoundingClientRect : () => root.getBoundingClientRect(),
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


/** Region visibility is attribute-driven (data-dock-hidden + !important). */
function regionHidden(pm: PanelManager, side: "left" | "right" | "top" | "bottom") {
  return pm.regions[side].container!.hasAttribute("data-dock-hidden");
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
  expect(regionHidden(pm, "left")).toBe(false);
  //empty regions collapse
  expect(regionHidden(pm, "top")).toBe(true);
});

test("dockPanel moves panels between regions with ordering", () => {
  const pm = makeManager();

  pm.dockPanel("tools", "right", { index: 0 });

  expect(pm.regions.left.order).toEqual([]);
  expect(pm.regions.right.order).toEqual(["tools", "props"]);
  expect(regionHidden(pm, "left")).toBe(true);

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
  expect(regionHidden(pm, "left")).toBe(true);

  pm.toggleEdge("left");
  expect(pm.isEdgeHidden("left")).toBe(false);
  expect(regionHidden(pm, "left")).toBe(false);
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

test("floatPanel / closePanel / layout round-trip for floating panels", () => {
  const pm = makeManager();

  pm.floatPanel("props", { pos: [50, 60] });
  expect(pm.floating.has("props")).toBe(true);
  expect(pm.regions.right.order).toEqual([]);

  const state = pm.saveLayout();
  expect(state.floating.length).toBe(1);
  expect(state.floating[0].panelId).toBe("props");

  //closing a float re-docks it (to its last dock side) hidden
  pm.closePanel("props");
  expect(pm.floating.has("props")).toBe(false);
  expect(pm.isPanelClosed("props")).toBe(true);
  expect(pm.regions.right.order).toEqual(["props"]);

  //restoring the saved layout floats it again
  const { root, host } = makeHost();
  const pm2 = new PanelManager(host);
  pm2.panel(def("tools", "left"));
  pm2.panel(def("props", "right"));
  pm2.build(root);
  pm2.loadLayout(state);

  expect(pm2.floating.has("props")).toBe(true);
  expect(pm2.regions.left.order).toEqual(["tools"]);
});

test("NO_FLOAT panels refuse to float", () => {
  const pm = makeManager();
  const noFloat = def("pinned", "left");
  noFloat.flags = 2; //PanelFlags.NO_FLOAT
  pm.panel(noFloat);
  pm.applyDefaultLayout();

  pm.floatPanel("pinned");
  expect(pm.floating.has("pinned")).toBe(false);
  expect(pm.regions.left.order).toContain("pinned");
});

test("rail mode: expand/switch/collapse and toggleEdge keep the rail visible", () => {
  const pm = makeManager();
  pm.dockPanel("props", "left"); //both panels in the left region
  pm.setEdgeMode("left", RegionMode.RAIL);

  const r = pm.regions.left;
  const clickTab = (id: string) =>
    (pm as unknown as { _onRailTabClick(r: unknown, id: string): void })._onRailTabClick(r, id);

  expect(r.rail).toBeTruthy();
  expect(r.activeRail).toBe("tools");
  //the tabs are the headers: panel title bars hide, active panel shows
  expect(pm.panels.get("tools")!.titleframe.hasAttribute("data-dock-hidetitle")).toBe(true);
  expect(pm.panels.get("tools")!.style.display).not.toBe("none");
  expect(pm.panels.get("props")!.style.display).toBe("none");

  clickTab("props"); //switch
  expect(r.activeRail).toBe("props");
  expect(r.railCollapsed).toBe(false);

  clickTab("props"); //collapse on active tab
  expect(r.railCollapsed).toBe(true);
  expect(r.stackWrap!.style.display).toBe("none");

  clickTab("tools"); //expand with clicked panel active
  expect(r.railCollapsed).toBe(false);
  expect(r.activeRail).toBe("tools");

  //toggleEdge collapses to the bare rail instead of hiding the region
  pm.toggleEdge("left");
  expect(r.railCollapsed).toBe(true);
  expect(regionHidden(pm, "left")).toBe(false);

  //switching back to docked restores the panel title bars
  pm.setEdgeMode("left", RegionMode.DOCKED);
  expect(pm.panels.get("tools")!.titleframe.hasAttribute("data-dock-hidetitle")).toBe(false);
  expect(pm.regions.left.rail).toBeUndefined();
});

test("rail mode and collapse state round-trip through save/load", () => {
  const pm = makeManager();
  pm.setEdgeMode("left", RegionMode.RAIL);
  pm.toggleEdge("left"); //collapse to the rail

  const state = pm.saveLayout();

  const { root, host } = makeHost();
  const pm2 = new PanelManager(host);
  pm2.panel(def("tools", "left"));
  pm2.panel(def("props", "right"));
  pm2.build(root);
  pm2.loadLayout(state);

  expect(pm2.regions.left.mode).toBe(RegionMode.RAIL);
  expect(pm2.regions.left.railCollapsed).toBe(true);
  expect(pm2.regions.left.rail).toBeTruthy();
});

test("tabs stack mode presents panels in a TabContainer and round-trips", () => {
  const pm = makeManager();
  pm.dockPanel("props", "left"); //both panels in the left region
  pm.setStackMode("left", StackMode.TABS);

  const r = pm.regions.left;
  expect(r.tabStack).toBeTruthy();
  //the tabs are the headers
  expect(pm.panels.get("tools")!.titleframe.hasAttribute("data-dock-hidetitle")).toBe(true);

  const state = pm.saveLayout();
  expect(state.regions.find((rs) => rs.side === 0)!.stacks[0].mode).toBe(StackMode.TABS);

  const { root, host } = makeHost();
  const pm2 = new PanelManager(host);
  pm2.panel(def("tools", "left"));
  pm2.panel(def("props", "right"));
  pm2.build(root);
  pm2.loadLayout(state);

  expect(pm2.regions.left.stackMode).toBe(StackMode.TABS);
  expect(pm2.regions.left.tabStack).toBeTruthy();

  //switching back to a rollout stack restores title bars
  pm.setStackMode("left", StackMode.STACK);
  expect(pm.regions.left.tabStack).toBeUndefined();
  expect(pm.panels.get("tools")!.titleframe.hasAttribute("data-dock-hidetitle")).toBe(false);
});

test("visible regions get a resize grip; hidden/empty ones do not", () => {
  const pm = makeManager();

  expect(pm.regions.left.grip).toBeTruthy();
  expect(pm.regions.left.grip!.parentNode).toBeTruthy();
  expect(pm.regions.top.grip).toBeUndefined(); //empty region

  //grips honor panelLayoutEditable
  const { root, host } = makeHost();
  host.panelLayoutEditable = false;
  const pm2 = new PanelManager(host);
  pm2.panel(def("tools", "left"));
  pm2.build(root);
  pm2.applyDefaultLayout();
  expect(pm2.regions.left.grip).toBeUndefined();
});

test("transferPanel moves a panel to a same-catalog peer manager", () => {
  const pm1 = makeManager();

  const { root, host } = makeHost();
  const pm2 = new PanelManager(host);
  pm2.panel(def("tools", "left"));
  pm2.panel(def("props", "right"));
  pm2.build(root);
  pm2.applyDefaultLayout();

  pm1.transferPanel("tools", pm2, "right", { index: 0 });

  //source: removed from layout, marked closed ("moved away")
  expect(pm1.regions.left.order).toEqual([]);
  expect(pm1.isPanelClosed("tools")).toBe(true);

  //target: docked at the requested position, visible
  expect(pm2.regions.right.order).toEqual(["tools", "props"]);
  expect(pm2.isPanelClosed("tools")).toBe(false);
  expect(pm2.panels.get("tools")!.style.display).not.toBe("none");

  //showPanel brings the source's copy back locally
  pm1.showPanel("tools");
  expect(pm1.regions.left.order).toEqual(["tools"]);
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
