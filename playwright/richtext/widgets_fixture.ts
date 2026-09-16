import {
  UIBase,
  iconmanager,
  RichTextEditor,
  DocumentSession,
  ToolStack,
} from "../../scripts/pathux";
import { PlainProvider, plainDocFromLines } from "../../scripts/widgets/richtext/providers/plain";
import type { PlainDoc } from "../../scripts/widgets/richtext/providers/plain";
import type { EditOp, EditResult } from "../../scripts/widgets/richtext/provider";
import type { DocumentCommand, WidgetDescriptor } from "../../scripts/widgets/richtext/widget";
import { MarkdownProvider, markdownDocFromText } from "../../scripts/widgets/richtext/markdown";

for (const sheet of (iconmanager as unknown as { iconsheets: { image: unknown }[] }).iconsheets) {
  sheet.image ||= { src: "" };
}

class Provider extends PlainProvider {
  override isOpaque(_doc: PlainDoc, block: string) {
    return block === "field";
  }
  override applyEdit(doc: PlainDoc, op: EditOp): EditResult {
    if (op.type !== "custom") return super.applyEdit(doc, op);
    const block = doc.blocks.find((block) => block.id === op.blocks[0])!;
    block.text = (op.data as { value: string }).value;
    return { dirtyBlocks: [block.id], removedBlocks: [], preserveFocus: true };
  }
}

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
const doc = plainDocFromLines(["before", "saved", "after"], (i) => ["before", "field", "after"][i]);
const provider = new Provider();
const session = new DocumentSession(doc, provider, ctx.toolstack);
let created = 0;
let disposed = 0;
let allowed = true;
let implementation = "synthetic-v1";

function descriptor(): WidgetDescriptor {
  return {
    id: "field",
    implementation,
    allowed,
    label: "Synthetic field",
    value: doc.blocks.find((b) => b.id === "field")?.text,
    create(context) {
      created++;
      const element = document.createElement("div");
      const shadow = element.attachShadow({ mode: "open" });
      const input = document.createElement("input");
      input.setAttribute("aria-label", "Answer");
      const button = document.createElement("button");
      button.textContent = "Accept";
      const status = document.createElement("span");
      shadow.append(input, button, status);
      let base = String(doc.blocks.find((b) => b.id === "field")?.text);
      let dirty = false;
      let version = 0;
      let readOnly = false;
      input.value = base;
      const command = (): DocumentCommand => {
        const value = input.value;
        const expected = base;
        return {
          resolve: () => {
            const current = doc.blocks.find((b) => b.id === "field");
            return current?.text === expected
              ? { type: "custom", name: "field", blocks: ["field"], data: { value } }
              : undefined;
          },
        };
      };
      const committed = () => {
        dirty = false;
        base = input.value;
        status.textContent = "";
      };
      context.registerDraft({
        key    : "field.answer",
        pending: () => dirty,
        version: () => version,
        prepare: () =>
          input.value === "!" ? { status: "unencodable" } : { status: "ready", command: command() },
        committed,
        recover: () => input.value,
        discard: () => {
          dirty = false;
          input.value = base;
          status.textContent = "";
        },
      });
      input.addEventListener("input", () => {
        dirty = input.value !== base;
        version++;
      });
      const accept = async () => {
        if (!dirty) return;
        const result = await context.command(command());
        if (result.status === "applied") committed();
        else status.textContent = result.status;
      };
      button.addEventListener("click", () => void accept());
      input.addEventListener("keydown", (e) => {
        if (e.isComposing) return;
        if (e.key === "Enter") {
          e.preventDefault();
          void accept();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "z" && !dirty && !readOnly) {
          e.preventDefault();
          void (e.shiftKey ? ctx.toolstack.redo() : ctx.toolstack.undo());
        }
      });
      return {
        element,
        update(state) {
          readOnly = state.readOnly;
          input.readOnly = readOnly;
          button.disabled = readOnly;
          if (!dirty) {
            input.value = String(state.value);
            base = input.value;
          } else if (state.value !== base) status.textContent = "conflict";
        },
        dispose() {
          disposed++;
        },
      };
    },
  };
}

const editors = [0, 1].map((index) => {
  const editor = UIBase.constructElement<RichTextEditor<Context, PlainDoc>>("rich-text-x", ctx);
  editor.id = `view${index}`;
  editor.style.cssText =
    "display:block;border:1px solid #888;margin:12px;padding:12px;min-height:100px";
  editor.widgetOptions = {
    resolveNativeBlock: (_session, block) => (block === "field" ? descriptor() : undefined),
  };
  document.body.append(editor);
  editor.session = session;
  return editor;
});

const mediaDoc = markdownDocFromText("before ![local](fixture.mp4) after\n\nsecond");
const mediaProvider = new MarkdownProvider({
  renderMedia: () => ({
    id            : "ignored",
    implementation: "local-frame",
    label         : "Local frame",
    create() {
      const frame = document.createElement("iframe");
      frame.title = "Local opted-in fixture";
      frame.srcdoc = `<video autoplay muted playsinline width="8" height="8"></video><script>
      window.token=Math.random();
      const canvas=document.createElement('canvas');canvas.width=8;canvas.height=8;
      const ctx=canvas.getContext('2d');let tick=0;
      setInterval(()=>{ctx.fillStyle=tick++%2?'red':'blue';ctx.fillRect(0,0,8,8)},20);
      const video=document.querySelector('video');video.muted=true;
      video.srcObject=canvas.captureStream(30);video.play();
    </script>local fixture`;
      return { element: frame, dispose() {} };
    },
  }),
});
const mediaSession = new DocumentSession(mediaDoc, mediaProvider, ctx.toolstack);
const media = UIBase.constructElement<RichTextEditor<Context, typeof mediaDoc>>("rich-text-x", ctx);
media.id = "media";
document.body.append(media);
media.session = mediaSession;

let legacyCalls = 0;
const legacyDoc = markdownDocFromText("before ![legacy](local.bin) after");
const legacySession = new DocumentSession(
  legacyDoc,
  new MarkdownProvider({
    renderMedia: () => {
      legacyCalls++;
      const input = document.createElement("input");
      input.setAttribute("aria-label", "Legacy media");
      input.value = "initial";
      return input;
    },
  }),
  ctx.toolstack
);
const legacy = UIBase.constructElement<RichTextEditor<Context, typeof legacyDoc>>(
  "rich-text-x",
  ctx
);
legacy.id = "legacy";
document.body.append(legacy);
legacy.session = legacySession;

export const fixture = {
  legacy,
  legacySession,
  legacyCalls: () => legacyCalls,
  editors,
  session,
  doc,
  ctx,
  media,
  mediaSession,
  counts : () => ({ created, disposed }),
  refresh: () => editors.forEach((editor) => editor.refreshWidgets()),
  allow(value: boolean) {
    allowed = value;
    editors.forEach((editor) => editor.invalidateWidgetPolicy());
  },
  replaceImplementation() {
    implementation += "-next";
    this.refresh();
  },
  neighboringEdit: () =>
    session.dispatch(
      {
        type: "insertText",
        text: "!",
        at  : { anchor: { block: "before", offset: 0 }, head: { block: "before", offset: 0 } },
      },
      ctx
    ),
};

declare global {
  interface Window {
    widgets: typeof fixture;
  }
}
window.widgets = fixture;
