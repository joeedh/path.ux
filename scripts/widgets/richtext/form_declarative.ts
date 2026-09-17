import type { JsonValue } from "./provider";
import type { FormIssue, FormNode, FormSchema } from "./form_schema";
import { formObject } from "./form_schema";
import { widgetJson } from "./widget_codec";

/** Describes authored JSON inputs without executable validation or transformations. */
export type DeclarativeNode = {
  readonly optional?: boolean;
  readonly description?: string;
} & (
  | { readonly kind: "string"; readonly minLength?: number; readonly maxLength?: number }
  | {
      readonly kind: "number";
      readonly integer?: boolean;
      readonly min?: number;
      readonly max?: number;
    }
  | { readonly kind: "boolean" | "null" }
  | { readonly kind: "enum"; readonly values: readonly (string | number | boolean | null)[] }
  | { readonly kind: "object"; readonly fields: Readonly<Record<string, DeclarativeNode>> }
  | {
      readonly kind: "array";
      readonly item: DeclarativeNode;
      readonly minItems?: number;
      readonly maxItems?: number;
    }
  | { readonly kind: "record"; readonly value: DeclarativeNode }
  | { readonly kind: "union"; readonly options: readonly DeclarativeNode[] }
);

export interface DeclarativeFormSchema {
  readonly format: "pathux.form-schema";
  readonly version: 1;
  readonly root: DeclarativeNode;
}

/** Compiles a bounded versioned description; unknown keywords refuse structured editing. */
export function declarativeFormSchema(source: unknown): FormSchema<JsonValue> {
  const diagnostics: FormIssue[] = [];
  const unsupported = (path: readonly (string | number)[], message: string): FormNode => {
    diagnostics.push({ path, message });
    return { kind: "unsupported", reason: message };
  };
  const visit = (value: JsonValue, path: (string | number)[]): FormNode => {
    if (!formObject(value)) return unsupported(path, "Schema node must be an object");
    const allowed: Record<string, readonly string[]> = {
      string : ["minLength", "maxLength"],
      number : ["integer", "min", "max"],
      boolean: [],
      null   : [],
      enum   : ["values"],
      object : ["fields"],
      array  : ["item", "minItems", "maxItems"],
      record : ["value"],
      union  : ["options"],
    };
    if (typeof value.kind !== "string" || !Object.hasOwn(allowed, value.kind))
      return unsupported(path, "Unsupported schema kind; use a host-registered implementation");
    const keys = ["kind", "optional", "description", ...allowed[value.kind]];
    for (const key of Object.keys(value)) {
      if (!keys.includes(key))
        unsupported(
          [...path, key],
          "Unsupported schema keyword; use a host-registered implementation"
        );
    }
    if (value.optional !== undefined && typeof value.optional !== "boolean")
      unsupported(path, "optional must be boolean");
    if (value.description !== undefined && typeof value.description !== "string")
      unsupported(path, "description must be text");
    for (const key of ["minLength", "maxLength", "minItems", "maxItems"]) {
      if (value[key] !== undefined && (!Number.isSafeInteger(value[key]) || Number(value[key]) < 0))
        unsupported([...path, key], "Length bounds must be nonnegative safe integers");
    }
    for (const key of ["min", "max"]) {
      if (value[key] !== undefined && typeof value[key] !== "number")
        unsupported([...path, key], "Numeric bounds must be numbers");
    }
    for (const [low, high] of [
      ["min", "max"],
      ["minLength", "maxLength"],
      ["minItems", "maxItems"],
    ]) {
      if (
        typeof value[low] === "number" &&
        typeof value[high] === "number" &&
        value[low] > value[high]
      )
        unsupported(path, "Minimum exceeds maximum");
    }
    if (value.integer !== undefined && typeof value.integer !== "boolean")
      unsupported(path, "integer must be boolean");
    switch (value.kind) {
      case "object": {
        if (!formObject(value.fields)) return unsupported(path, "Object schema requires fields");
        const fields: Record<string, FormNode> = Object.create(null);
        for (const [key, field] of Object.entries(value.fields))
          fields[key] = visit(field, [...path, key]);
        return { ...value, kind: "object", fields } as FormNode;
      }
      case "array":
        return { ...value, kind: "array", item: visit(value.item, [...path, "*"]) } as FormNode;
      case "record":
        return { ...value, kind: "record", value: visit(value.value, [...path, "*"]) } as FormNode;
      case "union":
        if (!Array.isArray(value.options) || value.options.length < 2)
          return unsupported(path, "Union requires at least two options");
        return {
          ...value,
          kind   : "union",
          options: value.options.map((v, i) => visit(v, [...path, i])),
        } as FormNode;
      case "enum":
        if (
          !Array.isArray(value.values) ||
          !value.values.length ||
          value.values.some((v) => v !== null && typeof v === "object")
        )
          return unsupported(path, "Enum requires primitive JSON values");
    }
    return value as unknown as FormNode;
  };
  let root: FormNode;
  try {
    const value = widgetJson(source);
    if (
      !formObject(value) ||
      value.format !== "pathux.form-schema" ||
      value.version !== 1 ||
      Object.keys(value).some((k) => !["format", "version", "root"].includes(k))
    )
      root = unsupported([], "Unsupported declarative schema envelope or version");
    else root = visit(value.root, []);
  } catch (error) {
    root = unsupported([], String(error));
  }
  const validate = (input: JsonValue): FormIssue[] => {
    let budget = 50000;
    const check = (
      node: DeclarativeNode,
      value: JsonValue | undefined,
      path: (string | number)[]
    ): FormIssue[] => {
      if (--budget < 0) throw new Error("Schema validation exceeds its work limit");
      const fail = (message: string): FormIssue[] => [{ path, message }];
      if (value === undefined) return node.optional ? [] : fail("Required value is missing");
      switch (node.kind) {
        case "string":
          return typeof value !== "string"
            ? fail("Expected text")
            : value.length < (node.minLength ?? 0) || value.length > (node.maxLength ?? Infinity)
              ? fail("Text length is outside schema bounds")
              : [];
        case "number":
          return typeof value !== "number" || !Number.isFinite(value)
            ? fail("Expected a finite number")
            : node.integer && !Number.isSafeInteger(value)
              ? fail("Expected a safe integer")
              : value < (node.min ?? -Infinity) || value > (node.max ?? Infinity)
                ? fail("Number is outside schema bounds")
                : [];
        case "boolean":
          return typeof value === "boolean" ? [] : fail("Expected a boolean");
        case "null":
          return value === null ? [] : fail("Expected null");
        case "enum":
          return node.values.includes(value as string | number | boolean | null)
            ? []
            : fail("Value is not in the enum");
        case "object":
          return formObject(value)
            ? Object.entries(node.fields).flatMap(([key, field]) =>
                check(field, Object.hasOwn(value, key) ? value[key] : undefined, [...path, key])
              )
            : fail("Expected an object");
        case "array":
          if (!Array.isArray(value)) return fail("Expected an array");
          if (value.length < (node.minItems ?? 0) || value.length > (node.maxItems ?? Infinity))
            return fail("Array length is outside schema bounds");
          return value.flatMap((v, i) => check(node.item, v, [...path, i]));
        case "record":
          return formObject(value)
            ? Object.entries(value).flatMap(([key, v]) => check(node.value, v, [...path, key]))
            : fail("Expected a record");
        case "union":
          for (const option of node.options) if (!check(option, value, path).length) return [];
          return fail("Value does not match any union option");
      }
    };
    return check(root as DeclarativeNode, input, []);
  };
  return {
    root,
    diagnostics,
    async validate(input) {
      if (diagnostics.length) return { success: false, issues: diagnostics };
      try {
        const output = widgetJson(input);
        const issues = validate(output);
        return issues.length ? { success: false, issues } : { success: true, output };
      } catch (error) {
        return { success: false, issues: [{ path: [], message: String(error) }] };
      }
    },
  };
}
