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
    ctx                  : undefined as unknown as IContextBase,
    panelLayoutEditable  : true,
    getBoundingClientRect: () => root.getBoundingClientRect(),
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

test("floatPanel applies an explicit size, and float size round-trips on load", () => {
  const pm = makeManager();

  pm.floatPanel("props", { pos: [50, 60], size: [400, 300] });
  const frame = pm.floating.get("props")!.frame;
  expect(frame.style.width).toBe("400px");
  expect(frame.style.height).toBe("300px");

  //saveLayout reads getBoundingClientRect (0 in happy-dom), so stamp a known
  //rect onto the serialized float and verify loadLayout restores both axes
  const state = pm.saveLayout();
  state.floating[0].pos.loadXY(20, 30);
  state.floating[0].size.loadXY(360, 240);

  const { root, host } = makeHost();
  const pm2 = new PanelManager(host);
  pm2.panel(def("tools", "left"));
  pm2.panel(def("props", "right"));
  pm2.build(root);
  pm2.loadLayout(state);

  const frame2 = pm2.floating.get("props")!.frame;
  expect(pm2.floating.has("props")).toBe(true);
  expect(frame2.style.left).toBe("20px");
  expect(frame2.style.width).toBe("360px");
  expect(frame2.style.height).toBe("240px");
});

test("NO_COLLAPSE panels cannot roll up and hide their collapse triangle", () => {
  const { root, host } = makeHost();
  const pm = new PanelManager(host);
  const noCollapse = def("props", "right");
  noCollapse.flags = 4; //PanelFlags.NO_COLLAPSE
  pm.panel(noCollapse);
  pm.panel(def("tools", "left"));
  pm.build(root);
  pm.applyDefaultLayout();

  const panel = pm.panels.get("props")!;
  expect(panel.canCollapse()).toBe(false);
  //the rollout triangle is not drawn
  expect(panel.openCloseIcon.hidden).toBe(true);
  //attempts to collapse are swallowed; the panel stays open
  panel.closed = true;
  expect(panel.closed).toBe(false);

  //a normal panel still collapses and keeps its triangle
  const tools = pm.panels.get("tools")!;
  expect(tools.canCollapse()).toBe(true);
  expect(tools.openCloseIcon.hidden).toBe(false);
  tools.closed = true;
  expect(tools.closed).toBe(true);
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
  expect(r.stacks.length).toBe(1);
  expect(r.stacks[0].mode).toBe(StackMode.TABS);
  expect(r.stacks[0].tabs).toBeTruthy();
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

  expect(pm2.regions.left.stacks[0].mode).toBe(StackMode.TABS);
  expect(pm2.regions.left.stacks[0].tabs).toBeTruthy();

  //switching back to rollout stacks restores title bars
  pm.setStackMode("left", StackMode.STACK);
  expect(pm.regions.left.stacks.every((s) => s.mode === StackMode.STACK)).toBe(true);
  expect(pm.regions.left.stacks.every((s) => s.tabs === undefined)).toBe(true);
  expect(pm.panels.get("tools")!.titleframe.hasAttribute("data-dock-hidetitle")).toBe(false);
});

test("dockPanelInto groups two panels into one tab stack and round-trips", () => {
  const pm = makeManager();

  pm.dockPanelInto("props", "tools"); //drop props onto tools

  const r = pm.regions.left;
  expect(r.stacks.length).toBe(1);
  expect(r.stacks[0].mode).toBe(StackMode.TABS);
  expect(r.stacks[0].ids).toEqual(["tools", "props"]);
  expect(r.stacks[0].active).toBe("props"); //the dropped panel is active
  expect(r.stacks[0].tabs).toBeTruthy();
  expect(pm.regions.right.order).toEqual([]);

  //tab groups round-trip, including the active tab
  const state = pm.saveLayout();
  const { root, host } = makeHost();
  const pm2 = new PanelManager(host);
  pm2.panel(def("tools", "left"));
  pm2.panel(def("props", "right"));
  pm2.build(root);
  pm2.loadLayout(state);

  expect(pm2.regions.left.stacks[0].mode).toBe(StackMode.TABS);
  expect(pm2.regions.left.stacks[0].ids).toEqual(["tools", "props"]);
  expect(pm2.regions.left.stacks[0].active).toBe("props");

  //docking a panel back out degrades the leftover solo group to a rollout
  pm.dockPanel("props", "right");
  expect(pm.regions.left.stacks.length).toBe(1);
  expect(pm.regions.left.stacks[0].mode).toBe(StackMode.STACK);
  expect(pm.regions.left.stacks[0].ids).toEqual(["tools"]);
  expect(pm.panels.get("tools")!.titleframe.hasAttribute("data-dock-hidetitle")).toBe(false);
});

test("dockPanelInto refuses undocked targets and disallowed sides", () => {
  const pm = makeManager();

  pm.floatPanel("props", { pos: [10, 10] });
  pm.dockPanelInto("tools", "props"); //target floats — no-op
  expect(pm.regions.left.order).toEqual(["tools"]);

  const noLeft = def("no-left", "right");
  noLeft.allowedDocks = 2 | 16; //RIGHT | FLOAT
  pm.panel(noLeft);
  pm.applyDefaultLayout();

  pm.dockPanelInto("no-left", "tools"); //tools sits on a disallowed side
  expect(pm.regions.left.order).toEqual(["tools"]);
  expect(pm.regions.right.order).toContain("no-left");
});

test("a docked region whose rollouts are all collapsed shrinks to content", () => {
  const pm = makeManager();
  pm.dockPanel("props", "top");
  pm.dockPanel("tools", "top");

  const r = pm.regions.top;
  const c = r.container!;
  expect(c.style.getPropertyValue("height")).toBe(r.size + "px");

  //one collapsed panel shrinks itself (header only), not the region
  pm.panels.get("tools")!.closed = true;
  expect(pm.panels.get("tools")!.style.width).toBe("fit-content");
  expect(pm.panels.get("props")!.style.width).toBe("100%");
  expect(c.style.getPropertyValue("height")).toBe(r.size + "px");

  //all collapsed: the region gives up its fixed size
  pm.panels.get("props")!.closed = true;
  expect(c.style.getPropertyValue("height")).toBe("auto");

  //expanding one restores the region size
  pm.panels.get("tools")!.closed = false;
  expect(pm.panels.get("tools")!.style.width).toBe("100%");
  expect(c.style.getPropertyValue("height")).toBe(r.size + "px");
});

test("PanelDef minSize/maxSize constrain the panel contents", () => {
  const pm = makeManager();

  const sized = def("sized", "left");
  sized.minSize = [120, undefined];
  sized.maxSize = [undefined, 300];
  pm.panel(sized);
  pm.applyDefaultLayout();

  const cs = pm.panels.get("sized")!.contents.style;
  expect(cs.minWidth).toBe("120px");
  expect(cs.minHeight).toBe("");
  expect(cs.maxWidth).toBe("");
  expect(cs.maxHeight).toBe("300px");
  expect(cs.overflow).toBe("auto"); //content past maxSize scrolls

  //no maxSize → no forced scroll container
  expect(pm.panels.get("tools")!.contents.style.overflow).toBe("");
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
