import { UIBase, RichTextEditor, DocumentSession, ToolStack } from "../../../scripts/pathux";
import type { IContextBase } from "../../../scripts/core/context_base";
import { MarkdownProvider, markdownText } from "../../../scripts/widgets/richtext/markdown";
import { createFormPlugin } from "../../../scripts/widgets/richtext/form_plugin";
import { zodFormSchema } from "../../../scripts/widgets/richtext/form_zod";
import { FormControl } from "../../../scripts/widgets/richtext/form_control";
import { formObject } from "../../../scripts/widgets/richtext/form_schema";
import {
  addFrontmatter,
  markdownSourceDoc,
  markdownSourceCommand,
  nativeFormBinding,
  nativeFormWidgets,
  switchFormBinding,
} from "../../../scripts/widgets/richtext/form_native";
import { DocumentWidgetHost, WidgetRegistry } from "../../../scripts/widgets/richtext/plugins";
import { encodeWidgetFence } from "../../../scripts/widgets/richtext/widget_codec";
import { exampleYamlCodec } from "./form_yaml";
import { characterFormSchema, locationFormSchema } from "./form_schemas";
import { paletteControl } from "./form_palette";
import { createAdapterDemo } from "./form_adapters_demo";

/** Demonstrates local forms and an application-owned save/conflict protocol. */
export function createFormsDemo(parent: HTMLElement, context: IContextBase) {
  const character = {
    schema      : zodFormSchema(characterFormSchema),
    presentation: {
      order : ["name", "type", "min", "max"],
      fields: {
        palette: { help: "Swatches, as a JSON list of hex colors", control: paletteControl },
      },
    },
  };
  const location = { schema: zodFormSchema(locationFormSchema) };
  let path = "characters/ada.md";
  const nativeOptions = {
    codec: exampleYamlCodec,
    select(values: import("../../../scripts/widgets/richtext/provider").JsonValue) {
      if (!formObject(values) || path.startsWith("scenes/")) return;
      const implied = path.startsWith("characters/")
        ? "character"
        : path.startsWith("locations/")
          ? "location"
          : undefined;
      if (implied && values.type !== undefined && values.type !== implied)
        throw new Error("Document type conflicts with its path; use raw source");
      const type = values.type ?? implied;
      return type === "character" ? character : type === "location" ? location : undefined;
    },
    onDiagnostic(_block: string, message: string) {
      status.textContent = message;
    },
  };
  const initial =
    "\uFEFF---\r\n# Character notes\r\nid: ada\r\nname: 'Ada' # keep\r\ntype: character\r\nunknown: [authored, value]\r\n---\r\n\r\nAuthored body\r\n=============\r\n\r\n  *  Keep body spacing\r\n";
  const provider = new MarkdownProvider();
  const stack = new ToolStack();
  const session = new DocumentSession(markdownSourceDoc(initial), provider, stack);
  const editors: RichTextEditor<IContextBase, typeof session.doc>[] = [];
  const section = (id: string, title: string) => {
    const element = document.createElement("section");
    element.id = id;
    const heading = document.createElement("h3");
    heading.textContent = title;
    element.append(heading);
    parent.append(element);
    return element;
  };
  const button = (label: string, action: () => void | Promise<unknown>, target = parent) => {
    const button = document.createElement("button");
    button.textContent = label;
    button.type = "button";
    button.addEventListener("click", () => void action());
    target.append(button);
  };
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  status.id = "forms-status";
  parent.append(status);
  const editor = (id: string, title: string, documentSession: typeof session, native = false) => {
    const target = section(id, title);
    const view = UIBase.constructElement<RichTextEditor<IContextBase, typeof session.doc>>(
      "rich-text-x",
      context
    );
    view.style.width = "580px";
    if (native) view.widgetOptions = nativeFormWidgets(nativeOptions);
    target.append(view);
    view.session = documentSession;
    editors.push(view);
    return view;
  };
  editor("native0", "Native front matter", session, true);
  editor("native1", "Second view of the same document", session, true);

  const standaloneContext = {
    signal       : new AbortController().signal,
    isCurrent    : () => !session.disposed,
    command: (command: import("../../../scripts/widgets/richtext/widget").DocumentCommand) =>
      session.command(command, context),
    registerDraft: (draft: import("../../../scripts/widgets/richtext/drafts").DraftController) =>
      session.registerDraft(draft, context),
  };
  const standalone = new FormControl(
    character.schema,
    nativeFormBinding(
      session,
      session.doc.blocks[0].id,
      standaloneContext,
      nativeOptions,
      character
    ),
    context,
    character.presentation
  );
  section("standalone", "Standalone control over the same native binding").append(
    standalone.element
  );

  const raw = document.createElement("textarea");
  raw.setAttribute("aria-label", "Raw Markdown source");
  raw.style.cssText = "width:570px;height:220px";
  section("raw", "Raw source shares the document and draft barrier").append(raw);
  let rawBase = markdownText(session.doc);
  let rawDirty = false;
  let rawVersion = 0;
  raw.value = rawBase;
  const resetRaw = () => {
    rawDirty = false;
    rawBase = markdownText(session.doc);
    raw.value = rawBase;
    rawVersion++;
  };
  raw.addEventListener("input", () => {
    rawDirty = true;
    rawVersion++;
  });
  const rawDraft = session.registerDraft(
    {
      key      : "raw-source",
      pending  : () => rawDirty,
      version  : () => rawVersion,
      prepare: () =>
        markdownText(session.doc) !== rawBase
          ? { status: "conflict", reason: "Raw source changed" }
          : { status: "ready", command: markdownSourceCommand(session.doc, rawBase, raw.value) },
      committed: resetRaw,
      discard  : resetRaw,
      recover  : () => raw.value,
    },
    context
  );
  button("Discard raw draft", resetRaw);
  const unsubscribe = session.onChange(() => {
    raw.readOnly = !session.canWrite;
    if (!rawDirty) resetRaw();
  });
  let diskHash = 1;
  let seenHash = diskHash;
  let diskSource = initial;
  let savedRevision = 0;
  let saveHook: (() => Promise<void>) | undefined;
  const save = async () => {
    const prepared = await session.prepareSave();
    if (prepared.status !== "ready") {
      status.textContent = `Save blocked: ${prepared.status}`;
      return prepared.status;
    }
    const source = markdownText(session.doc);
    const expectedHash = seenHash;
    await saveHook?.();
    if (expectedHash !== diskHash) {
      status.textContent = "Disk conflict; unsaved work retained";
      return "disk-conflict";
    }
    diskSource = source;
    seenHash = ++diskHash;
    savedRevision = prepared.revision;
    status.textContent =
      savedRevision === session.revision
        ? "Saved to simulated disk"
        : "Snapshot saved; newer edits remain unsaved";
    return "saved";
  };
  button("Save native document", save);
  button("Simulate external disk write", () => {
    diskHash++;
    status.textContent = "External disk version advanced";
  });
  button("Undo native edit", () => stack.undo());
  button("Redo native edit", () => stack.redo());
  button("Add missing front matter", () =>
    addFrontmatter(session, context, exampleYamlCodec, { id: "new", type: "character", name: "" })
  );

  const registry = new WidgetRegistry();
  registry.register(
    createFormPlugin(context, (reference) =>
      reference.version === 1
        ? reference.id === "character"
          ? character
          : reference.id === "location"
            ? location
            : undefined
        : undefined
    )
  );
  const pluginStack = new ToolStack();
  const pluginSession = new DocumentSession(
    markdownSourceDoc(
      encodeWidgetFence({
        id     : "answers",
        type   : "pathux.form",
        version: 1,
        payload: {
          schema: { id: "character", version: 1 },
          values: { id: "ada", name: "Ada", min: 2, max: 5 },
        },
      })
    ),
    provider,
    pluginStack
  );
  const host = new DocumentWidgetHost(pluginSession, registry, {
    document : { path: "questionnaire.md" },
    authorize: ({ action }) => action !== "external",
  });
  editor("plugin0", "Embedded answers in a plugin record", pluginSession);
  editor("plugin1", "Second view of embedded answers", pluginSession);
  button("Commit embedded drafts", async () => {
    status.textContent = (await pluginSession.prepareSave()).status;
  });

  const adapters = createAdapterDemo(parent, context);
  return {
    adapters,
    session,
    provider,
    stack,
    pluginSession,
    pluginStack,
    host,
    editors,
    standalone,
    raw,
    initial,
    source      : () => markdownText(session.doc),
    pluginSource: () => markdownText(pluginSession.doc),
    save,
    setSaveHook      : (hook?: () => Promise<void>) => (saveHook = hook),
    disk             : () => ({ diskHash, seenHash, diskSource, savedRevision }),
    externalDiskWrite: () => diskHash++,
    changePath: (next: string) =>
      switchFormBinding(session, () => {
        path = next;
      }),
    rawReplace: (source: string) =>
      session.command(
        markdownSourceCommand(session.doc, markdownText(session.doc), source),
        context
      ),
    dispose() {
      adapters.dispose();
      rawDraft();
      unsubscribe();
      standalone.dispose();
      for (const view of editors) view.remove();
      host.dispose();
      session.dispose();
      pluginSession.dispose();
    },
  };
}
