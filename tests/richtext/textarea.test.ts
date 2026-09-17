import { beforeAll, beforeEach, expect, test } from "vitest";
import { UIBase, iconmanager } from "../../scripts/core/ui_base";
import type { Container } from "../../scripts/core/ui";
import {
  DataAPI,
  clearPathWatchers,
  flushPathNotifications,
} from "../../scripts/path-controller/controller/controller";
import { ToolStack } from "../../scripts/path-controller/toolsys/toolstack";
import { StringProperty } from "../../scripts/path-controller/toolsys/toolprop";
import { DocEditOp } from "../../scripts/widgets/richtext/ops";
import type { EditOp } from "../../scripts/widgets/richtext/provider";
import { RichTextArea } from "../../scripts/widgets/richtext/textarea";
import {
  MarkdownProvider,
  markdownDocFromText,
  markdownText,
} from "../../scripts/widgets/richtext/markdown";
import { TextArea } from "../../scripts/widgets/ui_textarea";
import { DocumentWidgetHost, WidgetRegistry } from "../../scripts/widgets/richtext/plugins";
import { notePlugin } from "../../example/editors/properties/note_plugin";
/* used only as a type above, so the element registration it performs on import needs
 * naming explicitly or the import is elided */
import "../../scripts/core/ui_containers";

beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window ||= globalThis;

  // the markdown toolbar's kind dropdown draws on a 2d canvas, which happy-dom does not implement
  const proto = HTMLCanvasElement.prototype as unknown as { getContext(kind: string): unknown };
  proto.getContext = () =>
    new Proxy(
      {},
      {
        get: (_t, key) => (key === "measureText" ? () => ({ width: 10 }) : () => undefined),
        set: () => true,
      }
    );

  // no iconsheet <img> elements exist in the test DOM; the toolbar's icon CSS lookups
  // dereference sheet.image.src, so give the sheets a stand-in
  const sheets = (iconmanager as unknown as { iconsheets: { image: unknown }[] }).iconsheets;
  for (const sheet of sheets) {
    sheet.image ||= { src: "" };
  }
});

/* the watcher registry is module-global state; isolate each test */
beforeEach(() => {
  clearPathWatchers();
});

class Data {
  text = "Hello world\nsecond line";
  plain = "one line";
  md = "# Title\n\nSome *text* here.\n";
}

class Root {
  data = new Data();
  api!: DataAPI;
  toolstack = new ToolStack();
  screen = {} as never;
  state = this;

  toLocked() {
    return this;
  }
}

function makeCtx() {
  const api = new DataAPI();

  const dataDef = api.mapStruct(Data);
  const text = dataDef.textblock("text", "text", "Text");
  if (text.data instanceof StringProperty) {
    text.data.setRichText(true);
  }
  dataDef.textblock("plain", "plain", "Plain");
  const md = dataDef.textblock("md", "md", "Markdown");
  if (md.data instanceof StringProperty) {
    md.data.setRichText("markdown");
  }

  const rootDef = api.mapStruct(Root);
  rootDef.struct("data", "data", "Data", dataDef);
  api.rootContextStruct = rootDef;

  const root = new Root();
  root.api = api;

  return root;
}

function makeContainer(ctx: Root): Container {
  const container = UIBase.createElement("rowframe-x") as Container;
  container.ctx = ctx as never;
  container.checkInit();
  return container;
}

/** Builds the bound field and drives the first watcher delivery. */
function openField(ctx: Root, path = "data.text") {
  const field = makeContainer(ctx).textarea(path as never, { isRichEdit: true });
  if (!(field instanceof RichTextArea)) {
    throw new Error("expected a RichTextArea");
  }

  field.checkInit();
  field.update();
  flushPathNotifications();

  return field;
}

test("plugin host configuration is per field, survives format replacement and adds one history entry", async () => {
  const ctx = makeCtx();
  const field = openField(ctx, "data.md");
  const other = openField(ctx, "data.text");
  const registry = new WidgetRegistry();
  let created = 0;
  registry.register({
    ...notePlugin,
    create(snapshot, context) {
      created++;
      return notePlugin.create(snapshot, context);
    },
  });
  field.widgetHostFactory = (session) =>
    new DocumentWidgetHost(session, registry, {
      document : { path: "one.md" },
      authorize: () => true,
    });
  expect(other.session?.widgetHost).toBeUndefined();
  const original = field.session!;
  const host = original.widgetHost as DocumentWidgetHost<unknown>;
  expect(
    (
      await host.insert(
        { id: "note", type: notePlugin.type, version: 1, payload: { text: "bound" } },
        null,
        ctx
      )
    ).status
  ).toBe("applied");
  expect(ctx.data.md).toContain("pathux-widget-v1");
  expect(ctx.toolstack).toHaveLength(1);
  await ctx.toolstack.undo();
  expect(ctx.data.md).not.toContain("pathux-widget-v1");
  await ctx.toolstack.redo();
  expect(ctx.data.md).toContain("pathux-widget-v1");
  const beforeReplacement = created;
  field.widgetHostFactory = (session) =>
    new DocumentWidgetHost(session, registry, {
      document : { path: "renamed.md" },
      authorize: () => true,
    });
  expect(created).toBe(beforeReplacement + 1);
  field.useFormat({
    provider: () => new MarkdownProvider(),
    fromText: markdownDocFromText,
    toText  : markdownText,
  });
  expect(original.widgetHost).toBeUndefined();
  expect(field.session?.widgetHost).toBeInstanceOf(DocumentWidgetHost);
  expect(field.session?.widgetHost).not.toBe(host);
  field.widgetHostFactory = undefined;
  expect(field.session?.widgetHost).toBeUndefined();
});

const blockTexts = (field: RichTextArea) => {
  const session = field.session;
  if (session === undefined) {
    throw new Error("no session");
  }

  return session.provider
    .blocks(session.doc)
    .map((id) => session.provider.blockText(session.doc, id));
};

const domTexts = (field: RichTextArea) =>
  [...field.editor.root.querySelectorAll("[data-doc-block]")].map((el) => el.textContent);

/** Stands in for a second editor over the session, so the field's own editor applies the change. */
const SUBMITTER = { name: "test" };

/** Submits `op` the way an editor does: inverse first, then through the fold path. */
async function submit(field: RichTextArea, op: EditOp) {
  const session = field.session;
  const ctx = field.editor.richCtx;
  if (session === undefined || ctx === undefined) {
    throw new Error("field has no session");
  }

  const toolop = new DocEditOp(op, session.provider.inverse(session.doc, op), session.id);
  const result = toolop.result(SUBMITTER);
  await ctx.toolstack.foldOrExec(ctx, toolop);
  await result;
}

const insertAt = (field: RichTextArea, index: number, offset: number, text: string): EditOp => {
  const block = field.session!.provider.blocks(field.session!.doc)[index];
  return { type: "insertText", at: { anchor: { block, offset }, head: { block, offset } }, text };
};

test("a RICH_TEXT_STRING property gets the rich field, a plain one the textarea", () => {
  const ctx = makeCtx();
  const container = makeContainer(ctx);

  expect(container.textarea("data.text" as never)).toBeInstanceOf(RichTextArea);
  expect(container.textarea("data.plain" as never)).toBeInstanceOf(TextArea);
  expect(container.textarea("data.plain" as never, { isRichEdit: true })).toBeInstanceOf(
    RichTextArea
  );
});

test("the field shows the path's lines as blocks", () => {
  const field = openField(makeCtx());

  expect(field.value).toBe("Hello world\nsecond line");
  expect(blockTexts(field)).toEqual(["Hello world", "second line"]);
  expect(domTexts(field)).toEqual(["Hello world", "second line"]);
});

test("an edit writes the joined text to the path with one undo entry and a change event", async () => {
  const ctx = makeCtx();
  const field = openField(ctx);
  const changes: string[] = [];
  field.addEventListener("change", (e) => {
    changes.push((e as CustomEvent<{ value: string }>).detail.value);
  });

  await submit(field, insertAt(field, 0, 5, ","));

  expect(ctx.data.text).toBe("Hello, world\nsecond line");
  expect(ctx.toolstack.length).toBe(1);
  expect(changes).toEqual(["Hello, world\nsecond line"]);
  expect(domTexts(field)).toEqual(["Hello, world", "second line"]);
});

test("undo restores the path and the blocks", async () => {
  const ctx = makeCtx();
  const field = openField(ctx);

  await submit(field, insertAt(field, 0, 5, ","));
  await ctx.toolstack.undo();

  expect(ctx.data.text).toBe("Hello world\nsecond line");
  expect(blockTexts(field)).toEqual(["Hello world", "second line"]);
  expect(domTexts(field)).toEqual(["Hello world", "second line"]);
});

test("a write to the path re-renders the field", () => {
  const ctx = makeCtx();
  const field = openField(ctx);

  ctx.api.setValue(ctx, "data.text", "one\ntwo\nthree");
  flushPathNotifications();

  expect(blockTexts(field)).toEqual(["one", "two", "three"]);
  expect(domTexts(field)).toEqual(["one", "two", "three"]);
});

test("an undo after the field is rebuilt still restores the path, and the new field follows", async () => {
  const ctx = makeCtx();
  const first = openField(ctx);
  await submit(first, insertAt(first, 0, 5, ","));
  first.remove();

  const second = openField(ctx);
  expect(blockTexts(second)).toEqual(["Hello, world", "second line"]);

  await ctx.toolstack.undo();
  flushPathNotifications();

  expect(ctx.data.text).toBe("Hello world\nsecond line");
  expect(blockTexts(second)).toEqual(["Hello world", "second line"]);
});

test("an unresolved path disables the field", () => {
  const field = openField(makeCtx(), "data.missing");

  expect(field.internalDisabled).toBe(true);
  expect(field.editor.root.contentEditable).toBe("false");
});

test("a disable then enable cycle leaves a read-only field read-only", () => {
  const field = openField(makeCtx());

  field.readOnly = true;
  expect(field.editor.root.contentEditable).toBe("false");

  field.internalDisabled = true;
  field.internalDisabled = false;
  expect(field.editor.root.contentEditable).toBe("false");

  field.readOnly = false;
  expect(field.editor.root.contentEditable).toBe("true");
});

test("a property whose richTextFormat is markdown opens the field in markdown mode", () => {
  const field = openField(makeCtx(), "data.md");

  expect(field.format).toBe("markdown");
  expect(field.session?.provider).toBeInstanceOf(MarkdownProvider);
  expect(blockTexts(field)).toEqual(["Title", "Some text here."]);
  expect(field.editor.root.querySelector("h1")?.textContent).toBe("Title");
  expect(field.editor.root.querySelector("em")?.textContent).toBe("text");
  expect(field.value).toBe("# Title\n\nSome *text* here.\n");
});

test("an edit in markdown mode writes the source back with its marks, and undo restores it", async () => {
  const ctx = makeCtx();
  const field = openField(ctx, "data.md");

  await submit(field, insertAt(field, 1, 15, "!"));
  expect(ctx.data.md).toBe("# Title\n\nSome *text* here.!\n");
  expect(ctx.toolstack.length).toBe(1);

  await ctx.toolstack.undo();
  expect(ctx.data.md).toBe("# Title\n\nSome *text* here.\n");
  expect(field.editor.root.querySelector("em")?.textContent).toBe("text");
});

test("a write to a markdown path re-parses the field", () => {
  const ctx = makeCtx();
  const field = openField(ctx, "data.md");

  ctx.api.setValue(ctx, "data.md", "- one\n- two\n");
  flushPathNotifications();

  expect(blockTexts(field)).toEqual(["one", "two"]);
  expect(field.editor.root.querySelectorAll(".md-li")).toHaveLength(2);
});

test("the format option and the format property re-parse the value; an unknown format throws", () => {
  const ctx = makeCtx();
  const field = makeContainer(ctx).textarea("data.text" as never, { format: "markdown" });
  if (!(field instanceof RichTextArea)) {
    throw new Error("expected a RichTextArea");
  }
  field.checkInit();
  field.update();
  flushPathNotifications();

  expect(field.format).toBe("markdown");
  expect(field.session?.provider).toBeInstanceOf(MarkdownProvider);

  field.format = "plain";
  expect(field.session?.provider).not.toBeInstanceOf(MarkdownProvider);
  expect(blockTexts(field)).toEqual(["Hello world", "second line"]);

  expect(() => {
    field.format = "nope";
  }).toThrow(/registered as "nope"/);
  expect(field.format).toBe("plain");
});

test("instance formats and write policy survive new sessions without changing the registry", () => {
  const ctx = makeCtx();
  const field = openField(ctx);
  const registered = RichTextArea.format("markdown");
  const provider = new MarkdownProvider({ renderMedia: () => document.createElement("span") });
  const options = { resolveNativeBlock: () => undefined };
  field.widgetOptions = options;
  field.setWriteAllowed(false);
  field.useFormat({
    provider: () => provider,
    fromText: markdownDocFromText,
    toText  : markdownText,
  });
  expect(field.session?.provider).toBe(provider);
  expect(field.session?.canWrite).toBe(false);
  expect(field.editor.widgetOptions).toBe(options);
  expect(RichTextArea.format("markdown")).toBe(registered);
});

test("the field forwards drafts and publishes one undoable save commit", async () => {
  const ctx = makeCtx();
  const field = openField(ctx);
  let pending = true;
  field.session!.registerDraft(
    {
      key      : "field.answer",
      pending  : () => pending,
      version  : () => 0,
      prepare: () => ({
        status : "ready",
        command: { resolve: () => insertAt(field, 0, 0, "draft") },
      }),
      recover  : () => "draft",
      committed: () => {
        pending = false;
      },
      discard: () => {
        pending = false;
      },
    },
    ctx
  );
  expect(field.value).toBe("Hello world\nsecond line");
  expect(() => {
    field.format = "markdown";
  }).toThrow("drafts");
  expect(field.pendingDrafts).toHaveLength(1);
  expect((await field.prepareSave()).status).toBe("ready");
  expect(ctx.data.text).toBe("draftHello world\nsecond line");
  expect(ctx.toolstack).toHaveLength(1);
  await ctx.toolstack.undo();
  expect(ctx.data.text).toBe("Hello world\nsecond line");
});
