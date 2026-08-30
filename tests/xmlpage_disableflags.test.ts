import { beforeAll, beforeEach, expect, test } from "vitest";
import { UIBase, PackFlags, iconmanager } from "../scripts/core/ui_base";
import "../scripts/core/ui_containers";
import "../scripts/widgets/ui_textbox";
import "../scripts/widgets/ui_panel";
import { DataAPI, clearPathWatchers } from "../scripts/path-controller/controller/controller";
import { initPage } from "../scripts/xmlpage/xmlpage";
import type { Label } from "../scripts/core/ui";

beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window ||= globalThis;

  // PanelFrame's header renders an icon-check widget to a 2d canvas; happy-dom
  // has no real context, and the icon sheets have no backing <img>.
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

beforeEach(() => {
  clearPathWatchers();
});

class Root {
  x = "x default";
  y = "y default";
  api!: DataAPI;
}

function makeCtx() {
  const api = new DataAPI();
  const rootDef = api.mapStruct(Root);
  rootDef.string("x", "x");
  rootDef.string("y", "y", "Y Value");
  api.rootContextStruct = rootDef;

  const root = new Root();
  root.api = api;

  return root;
}

function deepAll(root: Element): Element[] {
  const out: Element[] = [];
  const stack: Element[] = [root];
  while (stack.length) {
    const node = stack.pop()!;
    if (node.tagName) out.push(node);
    const shadow = (node as unknown as { shadowRoot?: ShadowRoot }).shadowRoot;
    const kids = shadow ? shadow.children : node.children;
    if (kids) for (const c of Array.from(kids)) stack.push(c as Element);
  }
  return out;
}

test("a <prop> sibling doesn't stick NO_PROP_LABELS onto the container for later siblings", () => {
  const ctx = makeCtx();

  // <prop> forces FORCE_PROP_LABELS unconditionally on itself and, before the
  // fix, _disableflags' dispose() would unconditionally OR the whole
  // "disabled" mask (every flag whose attribute is absent on <prop>, which
  // includes NO_PROP_LABELS) back onto the panel's inherit_packflag -
  // permanently, for every sibling built afterward.
  const root = initPage(
    ctx as never,
    '<panel label="P" showLabel="true"><prop path="x"/><pathlabel path="y"/></panel>'
  );

  const labels = deepAll(root as unknown as Element).filter(
    (n) => n.tagName.toLowerCase() === "label-x"
  ) as unknown as Label[];
  const captionLabel = labels.find((l) => l.text === "Y Value");

  expect(captionLabel).toBeDefined();
});

test("the panel's inherit_packflag never gains NO_PROP_LABELS from an unrelated sibling", () => {
  const ctx = makeCtx();

  const root = initPage(
    ctx as never,
    '<panel label="P" showLabel="true"><prop path="x"/><pathlabel path="y" id="probe"/></panel>'
  );

  const probe = root.getElementById("probe") as unknown as Label;
  expect(probe.packflag & PackFlags.NO_PROP_LABELS).toBeFalsy();
});
