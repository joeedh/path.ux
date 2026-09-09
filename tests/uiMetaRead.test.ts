import { describe, expect, test, vi } from "vitest";
import * as nstructjs from "../scripts/path-controller/util/nstructjs";
import { readMetaJSON, StdUXMeta, UXToolMeta } from "../scripts/core/base/ui_meta_tags";

/** A tool the writing side knows about; the test unregisters it to play the receiving side. */
class VanishingTool extends UXToolMeta<"vanishing"> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
    test.VanishingTool {
    }`
  );

  readonly type = "vanishing" as const;

  copy(): this {
    return this.copyTo(new VanishingTool() as this);
  }
}

describe("readMetaJSON", () => {
  test("round-trips a well-formed tag", () => {
    const tag = new StdUXMeta({ description: "Approve the gate", valuePath: "ui.gate" });
    const back = readMetaJSON(nstructjs.writeJSON(tag), StdUXMeta);

    expect(back).toBeInstanceOf(StdUXMeta);
    expect(back.description).toBe("Approve the gate");
    expect(back.valuePath).toBe("ui.gate");
  });

  test("throws naming the struct when a required field is missing, and logs nothing", () => {
    const json = nstructjs.writeJSON(new StdUXMeta()) as Record<string, unknown>;
    delete json.tools;

    const logged = vi.spyOn(console, "log").mockImplementation(() => {});
    const errored = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      expect(() => readMetaJSON(json, StdUXMeta)).toThrow(/pathux\.StdUXMeta/);
      expect(logged).not.toHaveBeenCalled();
      expect(errored).not.toHaveBeenCalled();
    } finally {
      logged.mockRestore();
      errored.mockRestore();
    }
  });

  test("throws when a tool names a struct the receiving side has not registered", () => {
    const tag = new StdUXMeta({ tools: [new VanishingTool()] });
    const json = nstructjs.writeJSON(tag);

    nstructjs.unregister(VanishingTool);
    try {
      expect(() => readMetaJSON(json, StdUXMeta)).toThrow(/pathux\.StdUXMeta/);
    } finally {
      nstructjs.register(VanishingTool);
    }
  });
});
