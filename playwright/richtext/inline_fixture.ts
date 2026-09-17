import {
  UIBase,
  iconmanager,
  RichTextEditor,
  DocumentSession,
  ToolStack,
} from "../../scripts/pathux";
import {
  MarkdownProvider,
  markdownDocFromText,
  markdownText,
} from "../../scripts/widgets/richtext/markdown";
import { PlainProvider, plainDocFromLines } from "../../scripts/widgets/richtext/providers/plain";
import { DocumentWidgetHost, WidgetRegistry } from "../../scripts/widgets/richtext/plugins";
import type { PluginViewContext } from "../../scripts/widgets/richtext/plugins";
import {
  encodeInlineWidget,
  WIDGET_CLIPBOARD_MIME,
} from "../../scripts/widgets/richtext/widget_codec";
import { notePlugin } from "../../example/editors/properties/note_plugin";

for (const sheet of (iconmanager as unknown as { iconsheets: { image: unknown }[] }).iconsheets)
  sheet.image ||= { src: "" };
class Context {
  state = {};
  api = {} as never;
  screen = {} as never;
  toolstack = new ToolStack();
  toLocked() {
    return this;
  }
}
const ctx = new Context();
const record = { id: "note", type: "example.note", version: 1, payload: { text: "saved" } };
const source = `before${encodeInlineWidget(record)}after\n\nsecond`;
const doc = markdownDocFromText(source);
const provider = new MarkdownProvider();
const session = new DocumentSession(doc, provider, ctx.toolstack);
const registry = new WidgetRegistry();
let created = 0;
let disposed = 0;
const contexts: PluginViewContext[] = [];
const unregister = registry.register({
  ...notePlugin,
  placements: ["inline"],
  create(snapshot, context) {
    created++;
    contexts.push(context);
    const view = notePlugin.create(snapshot, context);
    if (view instanceof Promise) throw new Error("Synchronous example expected");
    return {
      ...view,
      dispose() {
        disposed++;
        view.dispose();
      },
    };
  },
});
const permissions = {
  insert  : true,
  mount   : sessionStorage.getItem("denyPlugins") !== "yes",
  edit    : true,
  external: true,
};
const host = new DocumentWidgetHost(session, registry, {
  document : { path: "/one.md" },
  authorize: (request) => permissions[request.action],
});
const editors = [0, 1].map((index) => {
  const editor = UIBase.constructElement<RichTextEditor<Context, typeof doc>>("rich-text-x", ctx);
  editor.id = `view${index}`;
  document.body.append(editor);
  editor.session = session;
  return editor;
});
const plain = UIBase.constructElement<
  RichTextEditor<Context, ReturnType<typeof plainDocFromLines>>
>("rich-text-x", ctx);
plain.id = "plain";
document.body.append(plain);
plain.session = new DocumentSession(
  plainDocFromLines(["plain"], () => "plain-block"),
  new PlainProvider(),
  ctx.toolstack
);
let unsupported = 0;
plain.addEventListener("clipboardunsupported", () => unsupported++);
const inert = UIBase.constructElement<RichTextEditor<Context, typeof doc>>("rich-text-x", ctx);
inert.id = "inert";
document.body.append(inert);
inert.session = new DocumentSession(
  markdownDocFromText(
    source +
      '\n\n![video](clip.mp4)\n\n<iframe src="https://unapproved.invalid/embed"></iframe>\n\n<video src="https://unapproved.invalid/video"></video>'
  ),
  new MarkdownProvider(),
  ctx.toolstack
);

const api = {
  ctx,
  doc,
  record,
  encodeInlineWidget,
  session,
  provider,
  host,
  editors,
  plain,
  inert,
  contexts,
  unregister,
  permissions,
  counts  : () => ({ created, disposed, unsupported }),
  saved   : () => markdownText(doc),
  snapshot: () => provider.widgets.read(doc, "note")!,
  revoke() {
    permissions.mount = false;
    permissions.external = false;
    host.invalidate();
  },
  neighboringEdit() {
    const block = doc.blocks[0].id;
    return session.dispatch(
      {
        type: "insertText",
        text: "x",
        at  : { anchor: { block, offset: 0 }, head: { block, offset: 0 } },
      },
      ctx
    );
  },
  copy() {
    const { block, offset = 0 } = provider.widgets.read(doc, "note")!;
    return provider.toClipboard(doc, {
      anchor: { block, offset },
      head  : { block, offset: offset + 1 },
    });
  },
  pastePlain() {
    const data = new DataTransfer();
    data.setData(WIDGET_CLIPBOARD_MIME, api.copy().widgetData!);
    data.setData("text/plain", "fallback");
    const block = plain.session!.doc.blocks[0].id;
    plain.select({ anchor: { block, offset: 0 }, head: { block, offset: 0 } });
    plain.root.dispatchEvent(
      new InputEvent("beforeinput", {
        bubbles     : true,
        cancelable  : true,
        inputType   : "insertFromPaste",
        dataTransfer: data,
      })
    );
  },
};
declare global {
  interface Window {
    inline: typeof api;
  }
}
window.inline = api;
