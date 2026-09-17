import { describe, expect, test } from "vitest";
import { z } from "zod";
import { zodFormSchema } from "../../scripts/widgets/richtext/form_zod";
import { decodeFormField } from "../../scripts/widgets/richtext/form_schema";
import {
  characterFormSchema,
  locationFormSchema,
} from "../../example/editors/properties/form_schemas";
import { exampleYamlCodec as yaml } from "../../example/editors/properties/form_yaml";
import {
  markdownSourceDoc,
  markdownSourceCommand,
  nativeFormBinding,
  nativeFormWidgets,
  addFrontmatter,
  switchFormBinding,
} from "../../scripts/widgets/richtext/form_native";
import { markdownText } from "../../scripts/widgets/richtext/providers/markdown_serialize";
import { MarkdownProvider } from "../../scripts/widgets/richtext/providers/markdown_provider";
import { DocumentSession } from "../../scripts/widgets/richtext/context";
import { ToolStack } from "../../scripts/path-controller/toolsys/toolstack";
import type { WidgetContext } from "../../scripts/widgets/richtext/widget";
import { encodeWidgetFence, decodeWidgetFence } from "../../scripts/widgets/richtext/widget_codec";
import { markdownDocFromText } from "../../scripts/widgets/richtext/providers/markdown_parse";

const original =
  "\uFEFF\r\n---\r\n# Keep this comment\r\nname: 'Ada' # inline\r\nunknown: [one, two]\r\n---\r\n\r\nTitle\r\n=====\r\n\r\n  *  odd spacing\r\n\r\n[unused]: https://example.test\r\n";

function setup(source = original) {
  const doc = markdownSourceDoc(source);
  const provider = new MarkdownProvider();
  const stack = new ToolStack();
  const ctx = {
    api      : {} as never,
    screen   : {} as never,
    state    : {},
    toolstack: stack,
    toLocked() {
      return this;
    },
  };
  const session = new DocumentSession(doc, provider, stack);
  const context: WidgetContext = {
    signal       : new AbortController().signal,
    isCurrent    : () => true,
    command      : (command) => session.command(command, ctx),
    registerDraft: (draft) => session.registerDraft(draft, ctx),
  };
  const selected = { schema: zodFormSchema(characterFormSchema) };
  const options = { codec: yaml, select: () => selected };
  const binding = nativeFormBinding(session, doc.blocks[0].id, context, options, selected);
  return { doc, provider, stack, ctx, session, context, selected, options, binding };
}

describe("form schema input and output", () => {
  test("consumer-shaped defaults are annotations and do not run on mount", async () => {
    let calls = 0;
    const schema = zodFormSchema(
      z.object({
        name: z.string(),
        tags: z.array(z.string()).default(() => {
          calls++;
          return [];
        }),
      })
    );
    expect(calls).toBe(0);
    expect(schema.root).toMatchObject({ kind: "object", fields: { tags: { hasDefault: true } } });
    const input = { name: "Ada" };
    expect(await schema.validate(input)).toEqual({
      success: true,
      output : { name: "Ada", tags: [] },
    });
    expect(input).toEqual({ name: "Ada" });
    expect(calls).toBe(1);
  });
  test("transforms and unknown-key stripping affect output only", async () => {
    const schema = zodFormSchema(z.object({ name: z.string().transform((s) => s.toUpperCase()) }));
    const input = { name: "Ada", unknown: 42 };
    expect(await schema.validate(input)).toEqual({ success: true, output: { name: "ADA" } });
    expect(input).toEqual({ name: "Ada", unknown: 42 });
  });
  test("required, optional, nested arrays, records and unions use original validation", async () => {
    const character = zodFormSchema(characterFormSchema);
    expect(character.diagnostics).toEqual([]);
    expect((await character.validate({ id: "ada", name: "" })).success).toBe(false);
    expect(
      (
        await character.validate({
          id     : "ada",
          name   : "Ada",
          outfits: { day: "Blue", night: { description: "Green" } },
        })
      ).success
    ).toBe(true);
    const location = zodFormSchema(locationFormSchema);
    expect(location.diagnostics).toEqual([]);
    expect(
      (
        await location.validate({
          id       : "pier",
          name     : "Pier",
          variants : [{ id: "day" }],
          reference: { kind: "asset", hash: "abc" },
        })
      ).success
    ).toBe(true);
    expect(
      (await location.validate({ id: "pier", name: "Pier", reference: { kind: "asset" } })).success
    ).toBe(false);
  });
  test("cross-field and asynchronous refinements are retained", async () => {
    expect(
      await zodFormSchema(characterFormSchema).validate({ id: "ada", name: "Ada", min: 5, max: 2 })
    ).toMatchObject({ success: false, issues: [{ path: ["max"] }] });
    const schema = zodFormSchema(
      z.object({ name: z.string().refine(async (s) => s === "Ada", "Unknown name") })
    );
    expect((await schema.validate({ name: "other" })).success).toBe(false);
  });
  test.each([
    z.date(),
    z.bigint(),
    z.function(),
    z.preprocess(String, z.string()),
    z.lazy(() => z.string()),
    z.set(z.string()),
  ])("unsupported construct is an explicit diagnostic", async (field) => {
    const schema = zodFormSchema(z.object({ field }));
    expect(schema.diagnostics).toHaveLength(1);
    expect((await schema.validate({ field: "value" })).success).toBe(false);
  });
  test("editable values may violate validation but must be encodable", () => {
    expect(decodeFormField({ kind: "number" }, "-2")).toBe(-2);
    expect(() => decodeFormField({ kind: "number" }, "-")).toThrow();
    expect(() => decodeFormField({ kind: "object", fields: {} }, '{"__proto__":{}}')).toThrow();
    expect(() => decodeFormField({ kind: "number" }, "1e999")).toThrow();
  });
});

describe("native authored source", () => {
  test("native forms require retained source and report why a mount was declined", () => {
    const { session, context, options, selected } = setup();
    session.doc.blocks = markdownDocFromText("---\nname: Ada\n---\nBody  spelling").blocks;
    const binding = nativeFormBinding(
      session,
      session.doc.blocks[0].id,
      context,
      options,
      selected
    );
    expect(binding.read()).toBeUndefined();
    const messages: string[] = [];
    const widgets = nativeFormWidgets({
      ...options,
      onDiagnostic: (_block, message) => messages.push(message),
    });
    expect(
      widgets.resolveNativeBlock!(session, session.doc.blocks[0].id, {} as never)
    ).toBeUndefined();
    expect(messages[0]).toContain("markdownSourceDoc");
  });
  test("retained source carries duplicate widget identity repairs", () => {
    const fence = encodeWidgetFence({ id: "same", type: "example.note", version: 1, payload: {} });
    const source = `Unusual  body\n\n${fence}\n\n${fence}\n`;
    const doc = markdownSourceDoc(source);
    const saved = markdownText(doc);
    expect(saved).not.toBe(source);
    expect(saved.startsWith("Unusual  body\n\n")).toBe(true);
    const next = markdownSourceDoc(saved);
    const ids = next.blocks.flatMap((b) =>
      b.kind === "widget" ? [decodeWidgetFence(b.source)!.id] : []
    );
    expect(new Set(ids).size).toBe(2);
    expect(markdownText(next)).toBe(saved);
  });
  test("clipboard entries exclude retained document prefixes and unrelated source", () => {
    const { doc, provider } = setup();
    const block = doc.blocks[1];
    const copied = provider.toClipboard(doc, {
      anchor: { block: block.id, offset: 0 },
      head  : { block: block.id, offset: block.text.length },
    });
    expect(copied.text).toBe("# Title");
    expect(copied.text).not.toContain("\uFEFF");
    expect(copied.text).not.toContain("unused");
  });
  test("runtime media identities do not invalidate authored-body retention", () => {
    const source = "---\nname: Ada\n---\n\n![image](image.png 'title')\n\n[unused]: /keep\n";
    const doc = markdownSourceDoc(source);
    doc.blocks[1].atoms[0].id = "runtime-media-id";
    expect(markdownText(doc)).toBe(source);
  });
  test.each([
    original,
    "---\nname: Ada\n---",
    "---\n---\n\nbody",
    "---\nname: Ada\n...\nBody",
    "---\rname: Ada\r---\rBody",
    "--- \nname: Ada\n--- \nBody",
    "\uFEFFplain  text\r\n\r\n",
    "",
    "---\nmalformed: [\n---\nbody",
  ])("opening and serializing preserves source exactly", (source) => {
    expect(markdownText(markdownSourceDoc(source))).toBe(source);
  });
  test("metadata changes preserve comments, quote style, unknown fields and body; undo restores bytes", async () => {
    const { binding, doc, stack } = setup();
    const snapshot = binding.read()!;
    expect(
      await binding.commit(snapshot, { ...(snapshot.values as object), name: "Bea" })
    ).toMatchObject({ status: "applied" });
    expect(markdownText(doc)).toBe(original.replace("'Ada'", "'Bea'"));
    expect(stack.length).toBe(1);
    await stack.undo();
    expect(markdownText(doc)).toBe(original);
    await stack.redo();
    expect(markdownText(doc)).toBe(original.replace("'Ada'", "'Bea'"));
  });
  test("body edits preserve the YAML prefix and undo restores original body spelling", async () => {
    const { doc, session, ctx, stack } = setup();
    const block = doc.blocks[1].id;
    await session.dispatch(
      {
        type: "insertText",
        at  : { anchor: { block, offset: 0 }, head: { block, offset: 0 } },
        text: "New ",
      },
      ctx
    );
    expect(markdownText(doc).split("Title")[0]).toContain(
      "\uFEFF\r\n---\r\n# Keep this comment\r\nname: 'Ada' # inline\r\nunknown: [one, two]\r\n---\r\n\r\n"
    );
    await stack.undo();
    expect(markdownText(doc)).toBe(original);
  });
  test("removing front matter retains authored body and undo restores its prefix", async () => {
    const { doc, session, ctx, stack } = setup();
    await session.dispatch(
      { type: "replaceBlocks", after: null, blocks: [], remove: [doc.blocks[0].id] },
      ctx
    );
    expect(markdownText(doc)).toBe("\uFEFF\r\n" + original.split("---\r\n\r\n")[1]);
    await stack.undo();
    expect(markdownText(doc)).toBe(original);
  });
  test("raw replacement refreshes projection and stale commands cannot overwrite it", async () => {
    const { doc, session, ctx, stack, binding } = setup();
    const before = binding.read()!;
    const next = original.replace("Ada", "External");
    expect(await session.command(markdownSourceCommand(doc, original, next), ctx)).toMatchObject({
      status: "applied",
    });
    expect(await binding.commit(before, { name: "stale" })).toMatchObject({ status: "refused" });
    expect(markdownText(doc)).toBe(next);
    await stack.undo();
    expect(markdownText(doc)).toBe(original);
  });
  test("new front matter is one edit and undo restores a file without it", async () => {
    const { session, doc, ctx, stack } = setup("\uFEFFBody\r\n====\r\n");
    expect(await addFrontmatter(session, ctx, yaml, { name: "Ada" })).toMatchObject({
      status: "applied",
    });
    expect(markdownText(doc)).toContain('"name": "Ada"');
    expect(markdownText(doc)).toContain("Body\r\n====\r\n");
    await stack.undo();
    expect(markdownText(doc)).toBe("\uFEFFBody\r\n====\r\n");
    await stack.redo();
    expect(doc.blocks[0].kind).toBe("frontmatter");
  });
  test("session write authorization also guards shared application history", async () => {
    const { session, binding, stack, doc } = setup();
    await binding.commit(binding.read()!, { name: "Bea", unknown: ["one", "two"] });
    const source = markdownText(doc);
    session.setWriteAllowed(false);
    await expect(stack.undo()).rejects.toThrow();
    expect(markdownText(doc)).toBe(source);
    expect(await binding.commit(binding.read()!, { name: "No" })).toMatchObject({
      status: "refused",
    });
  });
  test("schema switches wait for drafts and never turn a conflict into a switch", async () => {
    const { session, context } = setup();
    let switched = false;
    const unregister = context.registerDraft({
      key    : "answers",
      pending: () => true,
      version: () => 0,
      prepare: () => ({ status: "conflict" }),
      committed() {},
      discard() {},
      recover() {},
    });
    expect(await switchFormBinding(session, () => (switched = true))).toMatchObject({
      status: "conflict",
    });
    expect(switched).toBe(false);
    unregister();
  });
});

describe("bounded host YAML policy", () => {
  test.each([
    "name: [",
    "name: &a Ada\ncopy: *a",
    "name: !!str Ada",
    "name: !custom Ada",
    "name: Ada\nname: Bea",
    "__proto__: bad",
    "- value",
  ])("unsupported YAML stays raw", (body) => {
    const source = `---\n${body}\n---\nbody  spelling\n`;
    expect(() => yaml.read(`---\n${body}\n---`)).toThrow();
    expect(markdownText(markdownSourceDoc(source))).toBe(source);
  });
  test("nested scalar patches preserve surrounding comments and arrays", () => {
    const source = "---\noutfits:\n  day:\n    description: 'Blue' # keep\nunknown: 42\n---";
    expect(yaml.patch(source, { outfits: { day: { description: "Green" } }, unknown: 42 })).toBe(
      source.replace("Blue", "Green")
    );
  });
  test("adding and removing ordinary fields does not rewrite existing values", () => {
    const source = "---\nname: 'Ada'\nage: 2\n---";
    expect(yaml.patch(source, { name: "Ada", color: "#abcdef" })).toBe(
      '---\nname: \'Ada\'\n"color": "#abcdef"\n---'
    );
  });
  test("unsafe comment-bearing replacements are refused without source mutation", () => {
    const source = "---\nname: Ada\ntags:\n  - one # keep\n---";
    expect(() => yaml.patch(source, { name: "Ada", tags: [] })).toThrow(/raw source/);
    expect(yaml.read(source)).toEqual({ name: "Ada", tags: ["one"] });
  });
  test("oversized YAML is refused", () => {
    expect(() => yaml.read("---\nname: " + "a".repeat(65536) + "\n---")).toThrow(/64 KiB/);
  });
});
