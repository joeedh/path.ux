import type { StructReader } from "nstructjs";
import { STRUCT } from "nstructjs";
import { nstructFormSchema } from "../../../scripts/widgets/richtext/form_nstruct";
import { declarativeFormSchema } from "../../../scripts/widgets/richtext/form_declarative";
import type { DeclarativeFormSchema } from "../../../scripts/widgets/richtext/form_declarative";

const manager = new STRUCT();
class Intake {
  loadSTRUCT(reader: StructReader<this>) {
    reader(this);
  }
  static STRUCT = `ExampleFormIntake { name: string; age: uint; active: bool; tags: array(string); note: optional(string); }`;
}
manager.register(Intake);

export const intakeDescription = {
  format : "pathux.form-schema",
  version: 1,
  root: {
    kind  : "object",
    fields: {
      name  : { kind: "string" },
      age   : { kind: "number", integer: true, min: 0, max: 4294967295 },
      active: { kind: "boolean" },
      tags  : { kind: "array", item: { kind: "string" } },
      note  : { kind: "union", optional: true, options: [{ kind: "string" }, { kind: "null" }] },
    },
  },
} satisfies DeclarativeFormSchema;

export const intakeSchemas = {
  nstruct    : nstructFormSchema(manager.get_struct("ExampleFormIntake")),
  declarative: declarativeFormSchema(intakeDescription),
};
export const intakeValues = {
  name   : "Ada",
  age    : 32,
  active : true,
  tags   : ["author"],
  unknown: "retained",
};
