import type { IContextBase } from "../../core/context_base";
import type { JsonValue } from "./provider";
import { createFormPlugin } from "./form_plugin";
import type { FormReference, RegisteredForm } from "./form_plugin";
import { declarativeFormSchema } from "./form_declarative";

/** Opts into declarative schemas while retaining the host-registered schema route. */
export function createDeclarativeFormPlugin(
  context: IContextBase,
  resolveSchema: (reference: FormReference, document: JsonValue) => RegisteredForm | undefined
) {
  return createFormPlugin(context, resolveSchema, (source) => ({
    schema: declarativeFormSchema(source),
  }));
}
