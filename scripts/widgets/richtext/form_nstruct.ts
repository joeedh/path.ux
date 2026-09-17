import { parser } from "nstructjs";
import type { NStructInterface } from "nstructjs";
import type { FormIssue, FormSchema } from "./form_schema";
import type { JsonValue } from "./provider";
import { declarativeFormSchema } from "./form_declarative";
import type { DeclarativeNode } from "./form_declarative";

type TypeDescriptor = NStructInterface["fields"][number]["type"];

/** Adapts trusted nstructjs metadata to plain JSON without invoking class readers or helpers. */
export function nstructFormSchema(struct: NStructInterface): FormSchema<JsonValue> {
  const diagnostics: FormIssue[] = [];
  const types = parser.StructEnum;
  let nodes = 0;
  const unsupported = (path: (string | number)[], message: string): DeclarativeNode => {
    diagnostics.push({ path, message });
    return { kind: "null" };
  };
  const visit = (type: TypeDescriptor, path: (string | number)[], depth = 0): DeclarativeNode => {
    if (++nodes > 10000 || depth > 24)
      return unsupported(path, "Recursive or oversized nstructjs metadata");
    const integer = (min: number, max: number): DeclarativeNode => ({
      kind   : "number",
      integer: true,
      min,
      max,
    });
    switch (type.type) {
      case types.INT:
        return integer(-2147483648, 2147483647);
      case types.UINT:
        return integer(0, 4294967295);
      case types.SHORT:
        return integer(-32768, 32767);
      case types.USHORT:
        return integer(0, 65535);
      case types.BYTE:
        return integer(0, 255);
      case types.SIGNED_BYTE:
        return integer(-128, 127);
      case types.FLOAT:
        return { kind: "number", min: -3.4028234663852886e38, max: 3.4028234663852886e38 };
      case types.DOUBLE:
        return { kind: "number" };
      case types.STRING:
        return { kind: "string" };
      case types.BOOL:
        return { kind: "boolean" };
      case types.OPTIONAL:
        return {
          kind    : "union",
          optional: true,
          options : [visit(type.data, path, depth + 1), { kind: "null" }],
        };
      case types.ARRAY:
        if (type.data.iname)
          return unsupported(path, "Iterator variables require an explicit JSON codec");
        return { kind: "array", item: visit(type.data.type, [...path, "*"], depth + 1) };
      case types.STRUCT:
      case types.TSTRUCT:
        return unsupported(
          path,
          "Struct references and class instances require a host-registered JSON codec"
        );
      default:
        return unsupported(
          path,
          "Unsupported nstructjs value encoding; use a host-registered JSON codec"
        );
    }
  };
  const fields: Record<string, DeclarativeNode> = Object.create(null);
  for (const field of struct.fields) {
    if (++nodes > 10000) {
      unsupported([], "Oversized nstructjs metadata");
      break;
    }
    if (["this", "__proto__", "constructor", "prototype"].includes(field.name)) {
      unsupported(
        [field.name],
        "Class-value encodings and unsafe field names require an explicit codec"
      );
      continue;
    }
    if (Object.hasOwn(fields, field.name)) unsupported([field.name], "Duplicate struct field");
    if (field.get)
      unsupported([field.name], "Helper expressions require a host-registered implementation");
    fields[field.name] = visit(field.type, [field.name]);
  }
  const schema = declarativeFormSchema({
    format : "pathux.form-schema",
    version: 1,
    root   : { kind: "object", fields },
  });
  if (!diagnostics.length) return schema;
  return {
    root       : { kind: "unsupported", reason: "Unsupported nstructjs schema" },
    diagnostics: [...diagnostics, ...schema.diagnostics],
    async validate() {
      return { success: false, issues: diagnostics };
    },
  };
}
