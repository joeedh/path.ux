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
import { TextArea } from "../../scripts/widgets/ui_textarea";
/* used only as a type above, so the element registration it performs on import needs
 * naming explicitly or the import is elided */
import "../../scripts/core/ui_containers";

beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window ||= globalThis;

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
