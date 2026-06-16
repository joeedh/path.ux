import { describe, it, expect } from "vitest";
// @ts-expect-error - plain .mjs build tool without type declarations
import { parseXml, xmlToTsx } from "../buildtools/xml-to-tsx.mjs";

describe("parseXml", () => {
  it("preserves tag and attribute case", () => {
    const [node] = parseXml('<toolPanel useIcons="false" massSetPath="a.b" />');
    expect(node.name).toBe("toolPanel");
    expect(node.attrs).toEqual([
      { key: "useIcons", value: "false" },
      { key: "massSetPath", value: "a.b" },
    ]);
    expect(node.selfClosed).toBe(true);
  });

  it("nests children and captures text, skipping comments", () => {
    const [panel] = parseXml('<panel label="P"><!-- c --><button>Go</button></panel>');
    expect(panel.children).toHaveLength(1);
    const [button] = panel.children;
    expect(button.name).toBe("button");
    expect(button.children[0]).toEqual({ type: "text", value: "Go" });
  });

  it("throws on mismatched closing tags", () => {
    expect(() => parseXml("<a></b>")).toThrow();
  });
});

describe("xmlToTsx", () => {
  it("emits a component with the configured name and import", () => {
    const out = xmlToTsx('<prop path="data.x" />', { name: "MyPage", importSpecifier: "pathux" });
    expect(out).toContain('import { jsx } from "pathux";');
    expect(out).toContain("export function MyPage() {");
    expect(out).toContain('<prop path="data.x" />');
  });

  it("wraps multiple roots in a fragment and imports Fragment", () => {
    const out = xmlToTsx("<row /><row />");
    expect(out).toContain('import { jsx, Fragment } from "pathux";');
    expect(out).toContain("<>");
    expect(out).toContain("</>");
  });

  it("renders nested children and text labels", () => {
    const out = xmlToTsx('<panel label="P"><button>Save</button></panel>');
    expect(out).toContain('<panel label="P">');
    expect(out).toContain("<button>");
    expect(out).toContain("Save");
  });

  it("uses a JSX expression when an attribute value contains a double quote", () => {
    const out = xmlToTsx('<label title="a&quot;b" />');
    expect(out).toContain('title={"a\\"b"}');
  });
});
