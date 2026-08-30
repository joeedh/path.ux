import { test, expect } from "vitest";
import { UIBase, PackFlags } from "../scripts/core/ui_base";
import type { Container } from "../scripts/core/ui";
import "../scripts/core/ui";
import { initPage } from "../scripts/xmlpage/xmlpage";
import { mount } from "../scripts/jsx/mount";
import { jsx } from "../scripts/jsx/jsx-runtime";

test("a container's packflag attribute (e.g. showLabel) propagates to its xml children", () => {
  const root = initPage(
    undefined as any,
    '<row showLabel="true"><button id="tb">hi</button></row>'
  );

  const tb = root.getElementById("tb") as UIBase;
  expect(tb.packflag & PackFlags.FORCE_PROP_LABELS).toBeTruthy();
});

test("initPage/mount propagate a host container's inherit_packflag onto the mounted page", () => {
  const parent = UIBase.createElement("container-x") as unknown as Container;
  parent.ctx = undefined as any;
  parent._init();
  parent.inherit_packflag |= PackFlags.FORCE_PROP_LABELS;

  const mounted = mount(undefined as any, parent, jsx("button", { id: "tb2" }, "hi"));
  const tb2 = mounted.getElementById("tb2") as UIBase;

  expect(tb2.packflag & PackFlags.FORCE_PROP_LABELS).toBeTruthy();
});
