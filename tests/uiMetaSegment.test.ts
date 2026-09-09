import { describe, expect, test } from "vitest";
import * as nstructjs from "../scripts/path-controller/util/nstructjs";
import { StdUXMeta, UXToolMeta, widgetSegment } from "../scripts/core/base/ui_meta_tags";

/** A tool with nothing beyond the inherited fields, so it takes the default `identity()`. */
class PlainTool extends UXToolMeta<"plain"> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
    test.PlainSegmentTool {
    }`
  );

  readonly type = "plain" as const;

  copy(): this {
    return this.copyTo(new PlainTool() as this);
  }
}

/** A tool that carries a discriminator, so it has to override `identity()`. */
class KeyedTool extends UXToolMeta<"keyed"> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
    test.KeyedSegmentTool {
      rowKey: string;
    }`
  );

  readonly type = "keyed" as const;
  rowKey = "";

  override identity(): string {
    return `${super.identity()}\0${this.rowKey}`;
  }

  copyTo(b: this): this {
    super.copyTo(b);
    b.rowKey = this.rowKey;
    return b;
  }

  copy(): this {
    return this.copyTo(new KeyedTool() as this);
  }
}

function toolAt(toolPath: string): PlainTool {
  const tool = new PlainTool();
  tool.toolPath = toolPath;
  return tool;
}

describe("widgetSegment", () => {
  test("reads only the value path and the tools", () => {
    const tag = new StdUXMeta({ valuePath: "ui.gate", tools: [toolAt("graph.delete")] });
    const before = widgetSegment(tag);

    tag.description = "Approve the gate";
    tag.enabled = false;
    tag.refusal = { reason: "nothing is selected" };
    tag.tools[0].requirements = "a node is selected";

    expect(widgetSegment(tag)).toBe(before);
  });

  test("changes with the value path", () => {
    const a = new StdUXMeta({ valuePath: "ui.gate" });
    const b = new StdUXMeta({ valuePath: "ui.other" });

    expect(widgetSegment(a)).not.toBe(widgetSegment(b));
  });

  test("changes with an overridden identity", () => {
    const first = new KeyedTool();
    first.toolPath = "graph.delete";
    first.rowKey = "alpha";

    const second = new KeyedTool();
    second.toolPath = "graph.delete";
    second.rowKey = "beta";

    const a = new StdUXMeta({ valuePath: "ui.rows[0].act", tools: [first] });
    const b = new StdUXMeta({ valuePath: "ui.rows[1].act", tools: [second] });

    expect(widgetSegment(a)).not.toBe(widgetSegment(b));
  });

  test("flattens list indices in the value path", () => {
    const third = new StdUXMeta({ valuePath: "foo[3].bar" });
    const seventh = new StdUXMeta({ valuePath: "foo[7].bar" });
    const other = new StdUXMeta({ valuePath: "foo[3].baz" });

    expect(widgetSegment(third)).toBe(widgetSegment(seventh));
    expect(widgetSegment(third)).not.toBe(widgetSegment(other));
  });

  test("gives an empty tag a stable segment", () => {
    expect(widgetSegment(new StdUXMeta())).toBe("w~811c9dc5");
    expect(widgetSegment(new StdUXMeta())).toBe(widgetSegment(new StdUXMeta()));
  });

  test("takes its stem from the first tool's path, then the value path", () => {
    const withTool = new StdUXMeta({ valuePath: "ui.gate", tools: [toolAt("graph.deleteNode")] });
    const withPath = new StdUXMeta({ valuePath: "foo[3].bar" });

    expect(widgetSegment(withTool).split("~")[0]).toBe("graph-deletenode");
    expect(widgetSegment(withPath).split("~")[0]).toBe("foo-bar");
  });

  test("trims a long stem without touching the hash", () => {
    const long = "a".repeat(40);
    const tag = new StdUXMeta({ valuePath: long });
    const [stem, hash] = widgetSegment(tag).split("~");

    expect(stem).toBe("a".repeat(24));
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
  });
});
