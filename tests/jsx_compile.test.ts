import { describe, it, expect } from "vitest";
import { jsx, Fragment } from "../scripts/jsx/jsx-runtime";
import { compile } from "../scripts/jsx/mount";

describe("jsx runtime IR", () => {
  it("captures tag, props and flattened children", () => {
    const node = jsx("panel", { label: "P" }, jsx("prop", { path: "a" }), [
      jsx("prop", { path: "b" }),
    ]);

    expect(node.tag).toBe("panel");
    expect(node.props).toEqual({ label: "P" });
    expect(node.children).toHaveLength(2);
  });
});

describe("compile() -> xmlpage source", () => {
  it("serializes attributes and self-closes empty elements", () => {
    const { xml } = compile(jsx("prop", { path: "data.x", useIcons: "false" }));
    expect(xml).toBe('<prop path="data.x" useIcons="false"/>');
  });

  it("emits children as nested markup and text", () => {
    const { xml } = compile(jsx("panel", { label: "P" }, jsx("prop", { path: "a" })));
    expect(xml).toBe('<panel label="P"><prop path="a"/></panel>');

    const { xml: btn } = compile(jsx("button", null, "Click me"));
    expect(btn).toBe("<button>Click me</button>");
  });

  it("inlines fragments without a wrapper element", () => {
    const { xml } = compile(jsx(Fragment, null, jsx("row", null), jsx("row", null)));
    expect(xml).toBe("<row/><row/>");
  });

  it("drops function props and assigns an id for refs", () => {
    const seen: unknown[] = [];
    const { xml, refs } = compile(
      jsx("strip", { ref: (el: unknown) => seen.push(el), onclick: () => {} })
    );

    expect(xml).toBe('<strip id="__px0"/>');
    expect(refs).toHaveLength(1);
    expect(refs[0].id).toBe("__px0");
  });

  it("reuses an explicit id for refs", () => {
    const { xml, refs } = compile(jsx("strip", { id: "mine", ref: () => {} }));
    expect(xml).toBe('<strip id="mine"/>');
    expect(refs[0].id).toBe("mine");
  });

  it("escapes attribute and text content", () => {
    const { xml } = compile(jsx("label", { title: 'a"b' }, "x < y & z"));
    expect(xml).toBe('<label title="a&quot;b">x &lt; y &amp; z</label>');
  });
});
