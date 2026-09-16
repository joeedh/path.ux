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
  markdownOps,
} from "../../scripts/widgets/richtext/markdown";

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
const original =
  "before\n\n| **Name** | Value |\n| :--- | ---: |\n| *first* | `a\\|b` |\n| last | |\n\nafter";
const doc = markdownDocFromText(original);
const provider = new MarkdownProvider();
const session = new DocumentSession(doc, provider, ctx.toolstack);
const block = doc.blocks[1].id;
const editors = [0, 1].map((i) => {
  const editor = UIBase.constructElement<RichTextEditor<Context, typeof doc>>("rich-text-x", ctx);
  editor.id = `view${i}`;
  editor.style.cssText =
    "display:block;max-width:850px;border:1px solid #888;margin:12px;padding:12px";
  document.body.append(editor);
  editor.session = session;
  return editor;
});
const raw = document.createElement("pre");
raw.id = "source";
document.body.append(raw);
const update = () => (raw.textContent = markdownText(doc));
session.onChange(update);
update();
const api = {
  ctx,
  doc,
  provider,
  session,
  editors,
  block,
  original,
  markdownOps,
  source         : () => markdownText(doc),
  tableSource: () => {
    const table = doc.blocks.find((b) => b.id === block);
    return table?.kind === "table" ? table.source : "";
  },
  neighboringEdit: () => {
    const at = { block: doc.blocks[0].id, offset: 0 };
    return session.dispatch({ type: "insertText", at: { anchor: at, head: at }, text: "x" }, ctx);
  },
};
declare global {
  interface Window {
    tables: typeof api;
  }
}
window.tables = api;
