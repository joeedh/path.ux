import { UIBase, RichTextEditor, DocumentSession, ToolStack } from "../../../scripts/pathux";
import type { JsonValue } from "../../../scripts/widgets/richtext/provider";
import type { IContextBase } from "../../../scripts/core/context_base";
import { MarkdownProvider, markdownText } from "../../../scripts/widgets/richtext/markdown";
import { markdownDocFromText } from "../../../scripts/widgets/richtext/providers/markdown_parse";
import { DocumentWidgetHost, WidgetRegistry } from "../../../scripts/widgets/richtext/plugins";
import { createDeclarativeFormPlugin } from "../../../scripts/widgets/richtext/form_embedded";
import { formObject } from "../../../scripts/widgets/richtext/form_schema";
import { encodeWidgetFence } from "../../../scripts/widgets/richtext/widget_codec";
import { declarativeFormSchema } from "../../../scripts/widgets/richtext/form_declarative";
import { intakeDescription, intakeSchemas, intakeValues } from "./form_adapters";

/** Demonstrates explicit schema changes after the shared draft barrier. */
export function createAdapterDemo(parent: HTMLElement, context: IContextBase) {
  const nextDescription = {
    ...intakeDescription,
    root: {
      kind  : "object",
      fields: {
        ...intakeDescription.root.fields,
        displayName: { kind: "string" },
      },
    },
  };
  const nextSchema = declarativeFormSchema(nextDescription);
  const provider = new MarkdownProvider();
  const stack = new ToolStack();
  const session = new DocumentSession(
    markdownDocFromText(
      ["nstruct", "declarative"]
        .map((id) =>
          encodeWidgetFence({
            id,
            type   : "pathux.form",
            version: 1,
            payload: {
              schema:
                id === "nstruct" ? { id: "intake", version: 1 } : { embedded: intakeDescription },
              values: intakeValues,
            },
          })
        )
        .join("\n\n")
    ),
    provider,
    stack
  );
  const registry = new WidgetRegistry();
  registry.register(
    createDeclarativeFormPlugin(context, (ref) =>
      ref.id === "intake" && ref.version === 1
        ? { schema: intakeSchemas.nstruct }
        : ref.id === "intake" && ref.version === 2
          ? { schema: nextSchema }
          : undefined
    )
  );
  const host = new DocumentWidgetHost(session, registry, {
    document : {},
    authorize: ({ action }) => action !== "external",
  });
  const schemaSignature = () =>
    JSON.stringify(
      ["nstruct", "declarative"].map((id) => {
        const data = provider.widgets.read(session.doc, id)?.record.payload;
        return data && formObject(data) ? data.schema : null;
      })
    );
  let signature = schemaSignature();
  const unsubscribe = session.onChange(() => {
    const next = schemaSignature();
    if (next !== signature) {
      signature = next;
      host.invalidate();
    }
  });
  const editors = [0, 1].map((index) => {
    const section = document.createElement("section");
    section.id = `adapter${index}`;
    const heading = document.createElement("h3");
    heading.textContent = `Optional schema adapters, view ${index + 1}`;
    const editor = UIBase.constructElement<RichTextEditor<IContextBase, typeof session.doc>>(
      "rich-text-x",
      context
    );
    editor.style.width = "580px";
    section.append(heading, editor);
    parent.append(section);
    editor.session = session;
    return editor;
  });
  let conversions = 0;
  const migrate = async (id: string) => {
    if (!["nstruct", "declarative"].includes(id)) return "refused";
    const prepared = await session.prepareSave();
    if (prepared.status !== "ready") return prepared.status;
    const expected = provider.widgets.read(session.doc, id);
    if (
      !expected ||
      !formObject(expected.record.payload) ||
      !formObject(expected.record.payload.values)
    )
      return "refused";
    const old = expected.record.payload;
    const values = expected.record.payload.values;
    const target: JsonValue =
      id === "nstruct" ? { id: "intake", version: 2 } : { embedded: nextDescription };
    const original =
      id === "nstruct" ? { id: "intake", version: 1 } : { embedded: intakeDescription };
    if (JSON.stringify(old.schema) !== JSON.stringify(original)) return "refused";
    if (!session.canWrite) return "refused";
    conversions++;
    const command = host.prepareUpdate(expected, {
      ...old,
      schema: target,
      values: { ...values, ...(Object.hasOwn(values, "name") ? { displayName: values.name } : {}) },
    });
    const authorize = command.authorize;
    command.authorize = () => !session.pendingDrafts.length && (authorize?.() ?? true);
    const result = await session.command(command, context);
    return result.status;
  };
  const button = document.createElement("button");
  button.textContent = "Migrate intake schema";
  button.addEventListener("click", () => void migrate("nstruct"));
  parent.append(button);
  return {
    session,
    stack,
    provider,
    host,
    editors,
    migrate,
    conversions: () => conversions,
    source     : () => markdownText(session.doc),
    dispose() {
      unsubscribe();
      for (const editor of editors) editor.remove();
      host.dispose();
      session.dispose();
    },
  };
}
