import type { IContextBase } from "../../core/context_base";
import type { DocumentSession } from "./context";
import type { JsonValue } from "./provider";
import type { WidgetContext, WidgetOptions } from "./widget";
import type { MdDoc } from "./providers/markdown_model";
import { mdBlock } from "./providers/markdown_model";
import { newBlockId } from "./provider";
import type { FormBinding, FormSnapshot } from "./form_schema";
import { formObject } from "./form_schema";
import { FormControl } from "./form_control";
import type { RegisteredForm } from "./form_plugin";
import { widgetJson } from "./widget_codec";

/** A host parser must bound input and reject unsupported YAML before projecting values. */
export interface FrontmatterCodec {
  read(source: string): JsonValue;
  patch(source: string, values: JsonValue): string;
}

export interface NativeFormOptions {
  readonly codec: FrontmatterCodec;
  select(values: JsonValue): RegisteredForm | undefined;
  onDiagnostic?(block: string, message: string): void;
}

/** Supplies a source-preconditioned binding without introducing a plugin envelope. */
export function nativeFormBinding(
  session: DocumentSession<MdDoc>,
  block: string,
  context: WidgetContext,
  options: NativeFormOptions,
  selected: RegisteredForm
): FormBinding {
  const read = (): FormSnapshot | undefined => {
    if (!session.doc.blocks.some((b) => b.retainedSource)) return;
    const current = session.doc.blocks.find((b) => b.id === block);
    if (current?.kind !== "frontmatter") return;
    try {
      const values = widgetJson(options.codec.read(current.source));
      if (!formObject(values) || options.select(values) !== selected) return;
      return { revision: current.source, values };
    } catch {
      return;
    }
  };
  const prepare = (expected: FormSnapshot, values: JsonValue) => {
    const source = options.codec.patch(expected.revision, widgetJson(values));
    return {
      resolve: () => {
        const current = session.doc.blocks.find((b) => b.id === block);
        if (current?.kind !== "frontmatter" || read()?.revision !== expected.revision) return;
        return {
          type  : "replaceBlocks" as const,
          after : session.doc.blocks[session.doc.blocks.indexOf(current) - 1]?.id ?? null,
          remove: [block],
          blocks: [{ id: block, state: { ...structuredClone(current), source } }],
        };
      },
    };
  };
  return {
    key: `frontmatter:${block}`,
    read,
    subscribe: (changed) => session.onChange(changed),
    prepare,
    commit       : (expected, values) => context.command(prepare(expected, values)),
    registerDraft: (draft) => context.registerDraft(draft),
    canWrite     : () => context.isCurrent() && session.canWrite,
  };
}

/** Installs only the host's recognized native schemas; failures retain the raw block view. */
export function nativeFormWidgets(options: NativeFormOptions): WidgetOptions<MdDoc> {
  return {
    resolveNativeBlock(session, block, providerContext) {
      const current = session.doc.blocks.find((b) => b.id === block);
      if (current?.kind !== "frontmatter") return;
      try {
        if (!session.doc.blocks.some((b) => b.retainedSource))
          throw new Error("Native forms require a document opened with markdownSourceDoc");
        const selected = options.select(widgetJson(options.codec.read(current.source)));
        if (!selected) throw new Error("No form schema selected for this document");
        if (selected.schema.diagnostics.length)
          throw new Error(selected.schema.diagnostics.map((issue) => issue.message).join("; "));
        if (selected.schema.root.kind !== "object") throw new Error("Form root must be an object");
        return {
          id            : `frontmatter:${block}`,
          implementation: selected,
          label         : "Document fields",
          create(context) {
            return new FormControl(
              selected.schema,
              nativeFormBinding(session, block, context, options, selected),
              providerContext,
              selected.presentation
            );
          },
        };
      } catch (error) {
        options.onDiagnostic?.(block, error instanceof Error ? error.message : String(error));
        return;
      }
    },
  };
}

/** Adds missing front matter in one document edit; creation is an explicit host action. */
export function addFrontmatter(
  session: DocumentSession<MdDoc>,
  context: IContextBase,
  codec: FrontmatterCodec,
  values: JsonValue
) {
  const eol = session.doc.blocks.find((b) => b.retainedSource)?.retainedSource?.eol ?? "\n";
  const source = codec.patch(`---${eol}---`, widgetJson(values));
  const block = mdBlock(newBlockId(), { kind: "frontmatter", source });
  return session.command(
    {
      resolve: () =>
        session.doc.blocks.some((b) => b.kind === "frontmatter")
          ? undefined
          : {
              type  : "replaceBlocks",
              after : null,
              remove: [],
              blocks: [{ id: block.id, state: block }],
            },
    },
    context
  );
}

/** Resolves drafts before a host changes a path or schema catalog. */
export async function switchFormBinding(session: DocumentSession<MdDoc>, change: () => void) {
  const result = await session.prepareSave();
  if (result.status === "ready") {
    change();
    session.invalidateWidgets();
  }
  return result;
}

export {
  markdownSourceDoc,
  markdownSourceCommand,
  splitMarkdownSource,
} from "./providers/markdown_source";
