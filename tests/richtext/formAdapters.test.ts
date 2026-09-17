import { describe, expect, test } from "vitest";
import { STRUCT } from "nstructjs";
import type { StructReader } from "nstructjs";
import { build } from "esbuild";
import { nstructFormSchema } from "../../scripts/widgets/richtext/form_nstruct";
import { declarativeFormSchema } from "../../scripts/widgets/richtext/form_declarative";
import { createFormPlugin } from "../../scripts/widgets/richtext/form_plugin";
import { createDeclarativeFormPlugin } from "../../scripts/widgets/richtext/form_embedded";
import { decodeFormField, encodeFormField } from "../../scripts/widgets/richtext/form_schema";
import {
  intakeDescription,
  intakeSchemas,
  intakeValues,
} from "../../example/editors/properties/form_adapters";
import {
  widgetJson,
  encodeWidgetFence,
  decodeWidgetFence,
} from "../../scripts/widgets/richtext/widget_codec";
import { exampleYamlCodec } from "../../example/editors/properties/form_yaml";
import { markdownSourceDoc } from "../../scripts/widgets/richtext/providers/markdown_source";
import { markdownText } from "../../scripts/widgets/richtext/providers/markdown_serialize";

function structSchema(fields: string) {
  let executions = 0;
  class Fixture {
    static STRUCT = `AdapterFixture {\n${fields}\n}`;
    constructor() {
      executions++;
    }
    loadSTRUCT(reader: StructReader<this>) {
      executions++;
      reader(this);
    }
  }
  const manager = new STRUCT();
  manager.register(Fixture);
  return {
    schema    : nstructFormSchema(manager.get_struct("AdapterFixture")),
    executions: () => executions,
  };
}
const description = (root: unknown) => ({ format: "pathux.form-schema", version: 1, root });

describe.each(Object.entries(intakeSchemas))(
  "%s shared authored-input contract",
  (_name, schema) => {
    test("validates the same JSON and preserves unknown fields without constructing instances", async () => {
      expect(schema.diagnostics).toEqual([]);
      expect(await schema.validate(intakeValues)).toEqual({ success: true, output: intakeValues });
      expect(await schema.validate({ ...intakeValues, note: null })).toMatchObject({
        success: true,
      });
      expect(await schema.validate({ ...intakeValues, note: "authored" })).toMatchObject({
        success: true,
      });
    });
    test.each([
      { age: -1 },
      { age: 1.5 },
      { age: 4294967296 },
      { tags: [false] },
      { active: "true" },
      { note: 5 },
    ])("rejects invalid values %j", async (patch) => {
      expect(await schema.validate(widgetJson({ ...intakeValues, ...patch }))).toMatchObject({
        success: false,
      });
    });
    test("missing fields and non-JSON input produce diagnostics", async () => {
      expect(await schema.validate({ name: "" })).toMatchObject({
        success: false,
        issues : expect.arrayContaining([{ path: ["age"], message: "Required value is missing" }]),
      });
      expect(await schema.validate({ ...intakeValues, age: Infinity })).toMatchObject({
        success: false,
      });
      let calls = 0;
      const input = {
        ...intakeValues,
        get surprise() {
          calls++;
          return "bad";
        },
      };
      expect(await schema.validate(input)).toMatchObject({ success: false });
      expect(calls).toBe(0);
    });
    test("shared control codecs round-trip values without requiring semantic validity", () => {
      if (schema.root.kind !== "object") throw new Error("Expected fields");
      for (const [key, field] of Object.entries(schema.root.fields)) {
        const value = { ...intakeValues, note: null }[key as keyof typeof intakeValues | "note"];
        expect(decodeFormField(field, encodeFormField(field, value))).toEqual(value);
      }
      const age = schema.root.fields.age;
      expect(decodeFormField(age, "-1")).toBe(-1);
      expect(() => decodeFormField(age, "-")).toThrow();
    });
    test("native YAML projection patches only changed fields", async () => {
      const source =
        "---\r\n# Keep\r\nname: 'Ada' # keep quote\r\nage: 32\r\nactive: true\r\ntags: [author]\r\nunknown: retained\r\n---";
      const values = exampleYamlCodec.read(source);
      expect(await schema.validate(values)).toMatchObject({ success: true });
      const patched = exampleYamlCodec.patch(source, { ...intakeValues, name: "Bea" });
      expect(patched).toBe(source.replace("'Ada'", "'Bea'"));
      expect(exampleYamlCodec.read(patched)).toEqual({ ...intakeValues, name: "Bea" });
    });
  }
);

describe("nstructjs metadata", () => {
  test.each([
    "value: int;",
    "value: uint;",
    "value: short;",
    "value: ushort;",
    "value: byte;",
    "value: sbyte;",
    "value: float;",
    "value: double;",
  ])("numeric encoding %s", async (fields) => {
    const { schema, executions } = structSchema(fields);
    expect(schema.diagnostics).toEqual([]);
    expect(await schema.validate({ value: 1 })).toMatchObject({ success: true });
    expect(await schema.validate({ value: 1e100 })).toMatchObject({
      success: fields.includes("double"),
    });
    expect(executions()).toBe(0);
  });
  test.each([
    ["value: int | missingHostFunction(this.value);", "Helper expressions"],
    ["value: Other;", "references"],
    ["value: abstract(Other);", "references"],
    ["this: array(int);", "Class-value"],
    ["value: iter(int);", "value encoding"],
    ["value: static_string[4];", "value encoding"],
    ["value: static_array[int, 4];", "value encoding"],
    ["value: array(item, int);", "Iterator variables"],
  ])("refuses %s", async (fields, diagnostic) => {
    const { schema, executions } = structSchema(fields);
    expect(schema.diagnostics.some((d) => d.message.includes(diagnostic))).toBe(true);
    expect(await schema.validate({ value: 1 })).toMatchObject({ success: false });
    expect(executions()).toBe(0);
  });
});

describe("declarative schemas", () => {
  test.each([
    { ...intakeDescription, version: 2 },
    { ...intakeDescription, execute: "alert(1)" },
    description({ kind: "string", pattern: "(a+)+$" }),
    description({ kind: "number", coerce: true }),
    description({ kind: "string", default: "implicit" }),
    description({ kind: "reference", id: "remote" }),
    description({ kind: "string", minLength: -1 }),
    description({ kind: "number", min: 10, max: 2 }),
    description({ kind: "number", integer: "yes" }),
    description({ kind: "union", options: [] }),
    description({ kind: "array" }),
    description({ kind: "enum", values: [{}] }),
    description({ kind: "object", fields: JSON.parse('{"__proto__":{"kind":"string"}}') }),
  ])("unsupported descriptions are explicit and cannot validate %j", async (source) => {
    const schema = declarativeFormSchema(source);
    expect(schema.diagnostics.length).toBeGreaterThan(0);
    expect(await schema.validate(intakeValues)).toMatchObject({ success: false });
  });
  test("nested objects, records, unions, enums and bounds retain validation paths", async () => {
    const schema = declarativeFormSchema(
      description({
        kind  : "object",
        fields: {
          rows: {
            kind    : "array",
            minItems: 1,
            maxItems: 2,
            item: {
              kind  : "object",
              fields: { title: { kind: "string", minLength: 2, maxLength: 4 } },
            },
          },
          choice : { kind: "enum", values: ["a", 2, null] },
          records: {
            kind : "record",
            value: { kind: "union", options: [{ kind: "number" }, { kind: "boolean" }] },
          },
        },
      })
    );
    expect(schema.diagnostics).toEqual([]);
    const value = { rows: [{ title: "Book" }], choice: "a", records: { one: 3, two: false } };
    expect(await schema.validate(value)).toMatchObject({ success: true });
    expect(await schema.validate({ ...value, rows: [{ title: "x" }] })).toMatchObject({
      success: false,
      issues : [{ path: ["rows", 0, "title"] }],
    });
    expect(await schema.validate({ ...value, rows: [] })).toMatchObject({ success: false });
    expect(await schema.validate({ ...value, records: { one: "bad" } })).toMatchObject({
      success: false,
    });
    expect(await schema.validate({ ...value, choice: true })).toMatchObject({ success: false });
  });
  test("bounded descriptions never run accessors or recurse indefinitely", () => {
    let calls = 0;
    expect(
      declarativeFormSchema({
        get root() {
          calls++;
          return {};
        },
      }).diagnostics.length
    ).toBeGreaterThan(0);
    const cyclic: { root?: unknown } = {};
    cyclic.root = cyclic;
    expect(declarativeFormSchema(cyclic).diagnostics.length).toBeGreaterThan(0);
    expect(calls).toBe(0);
  });
  test("embedded schemas require the optional plugin and preserve future versions as source", () => {
    const payload = { schema: { embedded: intakeDescription }, values: intakeValues };
    expect(createFormPlugin({} as never, () => undefined).validate(payload)).toBe(false);
    const plugin = createDeclarativeFormPlugin({} as never, () => undefined);
    expect(plugin.validate(payload)).toBe(true);
    expect(
      plugin.validate({
        ...payload,
        schema: { id: "trusted", version: 1, embedded: intakeDescription },
      })
    ).toBe(false);
    const record = {
      id     : "intake",
      type   : "pathux.form",
      version: 1,
      payload: { ...payload, schema: { embedded: { ...intakeDescription, version: 99 } } },
    };
    const fence = encodeWidgetFence(record);
    expect(decodeWidgetFence(fence)).toEqual(record);
    expect(markdownText(markdownSourceDoc(fence))).toContain(fence);
    expect(() => plugin.create({ record } as never, { document: {} } as never)).toThrow(
      "Unsupported form schema"
    );
  });
  test("validation bounds repeated union work", async () => {
    const schema = declarativeFormSchema(
      description({
        kind: "array",
        item: { kind: "union", options: Array.from({ length: 50 }, () => ({ kind: "string" })) },
      })
    );
    expect(await schema.validate(Array.from({ length: 2000 }, () => true))).toMatchObject({
      success: false,
      issues : [{ message: expect.stringContaining("work limit") }],
    });
  });
  test("the declarative adapter bundles without schema runtimes or form UI", async () => {
    const result = await build({
      entryPoints: ["scripts/widgets/richtext/form_declarative.ts"],
      bundle     : true,
      write      : false,
      metafile   : true,
      platform   : "browser",
    });
    expect(
      Object.keys(result.metafile!.inputs).some((p) =>
        /nstructjs|zod|yaml|form_control|form_plugin/.test(p)
      )
    ).toBe(false);
  });
});
