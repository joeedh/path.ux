import type * as z from "zod";
import type { FormIssue, FormNode, FormSchema } from "./form_schema";

/** Adapts Zod 3 input shapes while retaining the original validator and output type. */
export function zodFormSchema<S extends z.ZodTypeAny>(schema: S): FormSchema<z.output<S>> {
  const diagnostics: FormIssue[] = [];
  const active = new Set<z.ZodTypeAny>();
  const visit = (schema: z.ZodTypeAny, path: (string | number)[], depth = 0): FormNode => {
    const unsupported = (reason: string): FormNode => {
      diagnostics.push({ path, message: reason });
      return { kind: "unsupported", reason };
    };
    if (depth > 32 || active.has(schema))
      return unsupported("Recursive or excessively deep schema");
    active.add(schema);
    const child = (value: z.ZodTypeAny, key?: string | number) =>
      visit(value, key === undefined ? path : [...path, key], depth + 1);
    let result: FormNode;
    switch (schema._def.typeName) {
      case "ZodOptional":
        result = { ...child((schema as z.ZodOptional<z.ZodTypeAny>).unwrap()), optional: true };
        break;
      case "ZodDefault":
        result = {
          ...child((schema as z.ZodDefault<z.ZodTypeAny>).removeDefault()),
          hasDefault: true,
        };
        break;
      case "ZodNullable":
        result = {
          kind   : "union",
          options: [child((schema as z.ZodNullable<z.ZodTypeAny>).unwrap()), { kind: "null" }],
        };
        break;
      case "ZodString":
        result = { kind: "string" };
        break;
      case "ZodNumber":
        result = { kind: "number" };
        break;
      case "ZodBoolean":
        result = { kind: "boolean" };
        break;
      case "ZodNull":
        result = { kind: "null" };
        break;
      case "ZodLiteral": {
        const value: unknown = (schema as z.ZodLiteral<z.Primitive>).value;
        result =
          typeof value === "string" ||
          typeof value === "boolean" ||
          (typeof value === "number" && Number.isFinite(value)) ||
          value === null
            ? { kind: "enum", values: [value] }
            : unsupported("Literal requires an explicit JSON codec");
        break;
      }
      case "ZodEnum":
        result = { kind: "enum", values: (schema as z.ZodEnum<[string, ...string[]]>).options };
        break;
      case "ZodObject": {
        const shape = (schema as z.AnyZodObject).shape as Record<string, z.ZodTypeAny>;
        const fields: Record<string, FormNode> = Object.create(null);
        for (const [key, value] of Object.entries(shape)) {
          if (["__proto__", "constructor", "prototype"].includes(key)) {
            unsupported("Unsafe schema field name");
            continue;
          }
          fields[key] = child(value, key);
        }
        result = { kind: "object", fields };
        break;
      }
      case "ZodArray":
        result = { kind: "array", item: child((schema as z.ZodArray<z.ZodTypeAny>).element, "*") };
        break;
      case "ZodRecord":
        result = { kind: "record", value: child((schema as z.ZodRecord).valueSchema, "*") };
        break;
      case "ZodUnion":
        result = {
          kind   : "union",
          options: (schema as z.ZodUnion<[z.ZodTypeAny, z.ZodTypeAny]>).options.map((s, i) =>
            child(s, i)
          ),
        };
        break;
      case "ZodDiscriminatedUnion":
        result = {
          kind   : "union",
          options: (
            schema as z.ZodDiscriminatedUnion<string, z.ZodDiscriminatedUnionOption<string>[]>
          ).options.map((s, i) => child(s, i)),
        };
        break;
      case "ZodEffects": {
        const effect = schema as z.ZodEffects<z.ZodTypeAny>;
        result =
          effect._def.effect.type === "preprocess"
            ? unsupported("Preprocessing requires an explicit authored-input codec")
            : child(effect.innerType());
        break;
      }
      default:
        result = unsupported(`Unsupported Zod 3 construct: ${String(schema._def.typeName)}`);
    }
    active.delete(schema);
    return schema.description ? { ...result, description: schema.description } : result;
  };
  const root = visit(schema, []);
  return {
    root,
    diagnostics,
    async validate(input) {
      if (diagnostics.length) return { success: false, issues: diagnostics };
      try {
        const result = await schema.safeParseAsync(input);
        return result.success
          ? { success: true, output: result.data as z.output<S> }
          : {
              success: false,
              issues : result.error.issues.map(({ path, message }) => ({ path, message })),
            };
      } catch (error) {
        return { success: false, issues: [{ path: [], message: String(error) }] };
      }
    },
  };
}
