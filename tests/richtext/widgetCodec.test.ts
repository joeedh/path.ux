import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  decodeWidgetFence,
  decodeWidgetTransfer,
  encodeWidgetFence,
  encodeWidgetTransfer,
  reidentifyWidgetFence,
  widgetJson,
  widgetRecord,
} from "../../scripts/widgets/richtext/widget_codec";

const fixtures = JSON.parse(readFileSync("tests/fixtures/widget-envelopes.json", "utf8")) as {
  name: string;
  source: string;
  record: boolean;
}[];
const record = {
  id     : "note-1",
  type   : "example.note",
  version: 1,
  payload: { text: "```", ref: "https://example.test/data" },
};

describe("bounded portable widget envelopes", () => {
  for (const fixture of fixtures)
    it(fixture.name, () => {
      expect(!!decodeWidgetFence(fixture.source)).toBe(fixture.record);
    });
  it("escapes fences and freezes detached payloads", () => {
    const result = decodeWidgetFence(encodeWidgetFence(record))!;
    expect(result).toEqual(record);
    expect(Object.isFrozen(result.payload)).toBe(true);
    expect(result.payload).not.toBe(record.payload);
  });
  it("changes only the outer ID token in unknown formatted source", () => {
    const source =
      '~~~pathux-widget-v1\r\n{ "payload": {"id":"nested"}, "version":99, "id" : "old", "type":"missing.note" }\r\n~~~';
    expect(reidentifyWidgetFence(source, "new")).toBe(source.replace('"old"', '"new"'));
  });
  it("rejects duplicate keys, hostile keys, excessive depth and size", () => {
    for (const payload of [
      '{"__proto__":{}}',
      '{"constructor":0}',
      "[".repeat(40) + "0" + "]".repeat(40),
      JSON.stringify("x".repeat(65536)),
    ]) {
      expect(
        decodeWidgetFence(
          '```pathux-widget-v1\n{"id":"a","type":"a.b","version":1,"payload":' + payload + "}\n```"
        )
      ).toBeUndefined();
    }
    expect(
      decodeWidgetFence(
        '```pathux-widget-v1\n{"id":"a","id":"b","type":"a.b","version":1,"payload":0}\n```'
      )
    ).toBeUndefined();
    expect(() =>
      widgetJson({
        get x() {
          throw new Error("must not run");
        },
      })
    ).toThrow("accessors");
    expect(() => widgetRecord({ ...record, payload: NaN })).toThrow();
    expect(() => widgetJson(new Array(2))).toThrow("dense");
  });
  it("round-trips ordered clipboard entries and refuses unsupported versions", () => {
    const blocks = [{ text: "before" }, { widget: record }, { text: "after" }];
    const encoded = encodeWidgetTransfer(blocks);
    expect(decodeWidgetTransfer(encoded)).toEqual(blocks);
    expect(decodeWidgetTransfer(encoded.replace('"version":1', '"version":2'))).toBeUndefined();
    expect(() =>
      encodeWidgetTransfer(Array.from({ length: 1025 }, () => ({ text: "" })))
    ).toThrow();
  });
});
