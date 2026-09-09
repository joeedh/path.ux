import { beforeAll, describe, expect, test } from "vitest";
import { newMenu } from "../scripts/menu/menu";
import type { UIBase } from "../scripts/core/ui_base";
import { setMeta, StdUXMeta, type MetaOwner } from "../scripts/core/base/ui_meta_tags";

beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window ||= globalThis;
});

/** A real, fully constructed widget, so the accessors run against an actual `UIBase`. */
function widget(): UIBase {
  return newMenu("meta owner test") as unknown as UIBase;
}

describe("a tag on a UIBase", () => {
  test("proxies description and valuePath to the widget", () => {
    const elem = widget();
    const tag = new StdUXMeta();

    setMeta(elem, StdUXMeta, tag);
    tag.description = "Approve the gate";
    tag.valuePath = "ui.gate";

    expect(elem.description).toBe("Approve the gate");
    expect(elem.getAttribute("datapath")).toBe("ui.gate");
    expect(tag.description).toBe("Approve the gate");
    expect(tag.valuePath).toBe("ui.gate");
  });

  test("clears valuePath by removing the attribute", () => {
    const elem = widget();
    const tag = new StdUXMeta({ valuePath: "ui.gate" });

    setMeta(elem, StdUXMeta, tag);
    tag.valuePath = undefined;

    expect(elem.hasAttribute("datapath")).toBe(false);
    expect(tag.valuePath).toBeUndefined();
  });
});

describe("a tag on a raw DOM node", () => {
  test("buffers description rather than installing an expando", () => {
    const row = document.createElement("li");
    const tag = new StdUXMeta();

    setMeta(row, StdUXMeta, tag);
    tag.description = "Delete the selected nodes";

    expect("description" in row).toBe(false);
    expect(tag.description).toBe("Delete the selected nodes");
  });

  test("still proxies valuePath, which an element can hold", () => {
    const row = document.createElement("li");
    const tag = new StdUXMeta();

    setMeta(row, StdUXMeta, tag);
    tag.valuePath = "ui.gate";

    expect(row.getAttribute("datapath")).toBe("ui.gate");
    expect(tag.valuePath).toBe("ui.gate");
  });

  test("keeps a buffered description readable after attaching", () => {
    const row = document.createElement("li");
    const tag = new StdUXMeta({ description: "Delete the selected nodes" });

    setMeta(row, StdUXMeta, tag);

    expect("description" in row).toBe(false);
    expect(tag.description).toBe("Delete the selected nodes");
  });

  test("flushes a buffered valuePath onto the element", () => {
    const row = document.createElement("li");
    const tag = new StdUXMeta({ valuePath: "ui.gate" });

    setMeta(row, StdUXMeta, tag);

    expect(row.getAttribute("datapath")).toBe("ui.gate");
  });
});

describe("a tag on an owner that can hold nothing", () => {
  test("buffers valuePath rather than throwing", () => {
    const owner: MetaOwner = {};
    const tag = new StdUXMeta();

    setMeta(owner, StdUXMeta, tag);
    tag.valuePath = "ui.gate";
    tag.description = "Approve the gate";

    expect(tag.valuePath).toBe("ui.gate");
    expect(tag.description).toBe("Approve the gate");
    expect(Object.keys(owner)).toEqual([]);
  });
});
