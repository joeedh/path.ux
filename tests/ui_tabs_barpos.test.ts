import { test, expect, beforeAll } from "vitest";
import { UIBase } from "../scripts/core/ui_base";
// NOTE: a *named* runtime import of ui_tabs makes createElement return an
// un-upgraded HTMLElement under the vitest module runner (module-instance
// duplication with the circular ui.ts <-> ui_tabs.ts graph); a side-effect
// import plus a type-only import avoids it.
import type { TabContainer } from "../scripts/widgets/ui_tabs";
import "../scripts/widgets/ui_tabs";

beforeAll(() => {
  // resolvePath / theme lookups touch window in node.
  (globalThis as unknown as { window: unknown }).window ||= globalThis;

  // TabBar renders to a 2d canvas; happy-dom has no real context, so hand
  // back a permissive stub (methods no-op, measureText reports a width).
  const proto = HTMLCanvasElement.prototype as unknown as {
    getContext(kind: string): unknown;
  };
  proto.getContext = () =>
    new Proxy(
      {},
      {
        get: (_t, key) => {
          if (key === "measureText") return () => ({ width: 10 });
          return () => undefined;
        },
        set: () => true,
      }
    );
});

function makeTabs() {
  const tc = UIBase.createElement("tabcontainer-x") as TabContainer;
  tc.setAttribute("bar_pos", "top");
  tc._init();
  const a = tc.tab("A");
  const b = tc.tab("B");
  return { tc, a, b };
}

/** Is the tab bar's wrapper after the active-tab contents wrapper? */
function barIsAfterContents(tc: TabContainer) {
  const bar = tc.tbar._wrapperDiv!;
  const contents = tc.tbar._contentsWrapper!;

  expect(bar.parentNode).toBe(tc.shadow);
  expect(contents.parentNode).toBe(tc.shadow);

  return !!(bar.compareDocumentPosition(contents) & Node.DOCUMENT_POSITION_PRECEDING);
}

function setBarPos(tc: TabContainer, pos: string) {
  tc.setAttribute("bar_pos", pos);
  tc.updateBarPos();
  tc.tbar.updatePos(true);
}

test("bar_pos placement: bar before contents for top/left, after for right/bottom", () => {
  const { tc } = makeTabs();

  expect(barIsAfterContents(tc)).toBe(false); //top

  setBarPos(tc, "right");
  expect(tc.tbar.horiz).toBe(false);
  expect(barIsAfterContents(tc)).toBe(true);

  setBarPos(tc, "bottom");
  expect(tc.tbar.horiz).toBe(true);
  expect(barIsAfterContents(tc)).toBe(true);

  setBarPos(tc, "left");
  expect(tc.tbar.horiz).toBe(false);
  expect(barIsAfterContents(tc)).toBe(false);

  setBarPos(tc, "top");
  expect(tc.tbar.horiz).toBe(true);
  expect(barIsAfterContents(tc)).toBe(false);
});

test("bar_pos round-trip right -> left restores original order", () => {
  const { tc } = makeTabs();

  setBarPos(tc, "right");
  expect(barIsAfterContents(tc)).toBe(true);

  setBarPos(tc, "left");
  expect(barIsAfterContents(tc)).toBe(false);
});

test("switching tabs keeps contents before a right/bottom bar", () => {
  const { tc, b } = makeTabs();

  setBarPos(tc, "bottom");
  tc.setActive(b);

  expect(barIsAfterContents(tc)).toBe(true);
});
