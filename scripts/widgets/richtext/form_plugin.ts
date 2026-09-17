import type { IContextBase } from "../../core/context_base";
import type { WidgetPlugin, WidgetSnapshot } from "./plugin_types";
import type { JsonValue } from "./provider";
import type { FormPresentation, FormSchema, FormSnapshot } from "./form_schema";
import { formObject } from "./form_schema";
import { FormControl } from "./form_control";

export interface RegisteredForm {
  readonly schema: FormSchema;
  readonly presentation?: FormPresentation;
}

export interface FormReference {
  readonly id: string;
  readonly version: number;
}

function payload(value: JsonValue): value is {
  schema: { id: string; version: number };
  values: { [key: string]: JsonValue };
} {
  return (
    formObject(value) &&
    formObject(value.schema) &&
    typeof value.schema.id === "string" &&
    Number.isSafeInteger(value.schema.version) &&
    Number(value.schema.version) > 0 &&
    formObject(value.values)
  );
}

/** Creates an opt-in block plugin; schema versions are independent of its payload version. */
export function createFormPlugin(
  context: IContextBase,
  resolveSchema: (reference: FormReference, document: JsonValue) => RegisteredForm | undefined
): WidgetPlugin {
  return {
    type    : "pathux.form",
    version : 1,
    label   : "Form",
    validate: payload,
    create(initial, host) {
      if (!payload(initial.record.payload)) throw new Error("Invalid form payload");
      const reference = initial.record.payload.schema;
      const registered = resolveSchema(reference, host.document);
      if (!registered) throw new Error("Unregistered form schema");
      let latest = initial;
      const snapshots = new WeakMap<FormSnapshot, WidgetSnapshot>();
      const read = () => {
        const data = latest.record.payload;
        if (
          !payload(data) ||
          data.schema.id !== reference.id ||
          data.schema.version !== reference.version
        )
          return;
        const snapshot = { revision: latest.revision, values: data.values };
        snapshots.set(snapshot, latest);
        return snapshot;
      };
      const source = (expected: FormSnapshot) => {
        const value = snapshots.get(expected);
        if (!value) throw new Error("Unknown form snapshot");
        return value;
      };
      const next = (expected: FormSnapshot, values: JsonValue) => ({
        ...(source(expected).record.payload as { schema: JsonValue; values: JsonValue }),
        values,
      });
      const form = new FormControl(
        registered.schema,
        {
          key: "answers",
          read,
          subscribe    : () => () => {},
          prepare: (expected, values) =>
            host.prepareUpdate(source(expected), next(expected, values)),
          commit: (expected, values) => host.update(source(expected), next(expected, values)),
          registerDraft: (draft) => host.registerDraft(draft),
          canWrite     : () => host.isCurrent(),
        },
        context,
        registered.presentation
      );
      return {
        element: form.element,
        update(state) {
          latest = state.value as WidgetSnapshot;
          form.update(state);
        },
        focus  : (last) => form.focus(last),
        dispose: () => form.dispose(),
      };
    },
  };
}
