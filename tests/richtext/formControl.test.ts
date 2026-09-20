import { beforeAll, describe, expect, test } from "vitest";
import { z } from "zod";
import { zodFormSchema } from "../../scripts/widgets/richtext/form_zod";
import { FormControl } from "../../scripts/widgets/richtext/form_control";
import type { FieldControl, FormBinding, FormSnapshot } from "../../scripts/widgets/richtext/form_schema";
import type { DraftController } from "../../scripts/widgets/richtext/drafts";
import type { TextBox } from "../../scripts/widgets/ui_textbox";
import { exampleYamlCodec as yaml } from "../../example/editors/properties/form_yaml";
import { markdownSourceDoc } from "../../scripts/widgets/richtext/providers/markdown_source";
import { MarkdownProvider } from "../../scripts/widgets/richtext/providers/markdown_provider";
import { DocumentSession } from "../../scripts/widgets/richtext/context";
import { ToolStack } from "../../scripts/path-controller/toolsys/toolstack";
import { nativeFormBinding, nativeFormWidgets } from "../../scripts/widgets/richtext/form_native";
import type { WidgetContext, WidgetView } from "../../scripts/widgets/richtext/widget";
import type { JsonValue } from "../../scripts/widgets/richtext/provider";
import { markdownText } from "../../scripts/widgets/richtext/providers/markdown_serialize";

beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window ||= globalThis;
});

const schema = zodFormSchema(
  z.object({
    name   : z.string(),
    outfits: z.record(z.string(), z.string()).optional(),
    default: z.string().optional(),
    hidden : z.string().optional(),
  })
);

const ctx = {
  api      : {} as never,
  screen   : {} as never,
  state    : {},
  toolstack: new ToolStack(),
  toLocked() {
    return this;
  },
};

/** A binding over one in-memory snapshot, recording what was committed. */
function memoryBinding(values: JsonValue) {
  let snapshot: FormSnapshot = { revision: "1", values };
  const committed: JsonValue[] = [];
  const listeners = new Set<() => void>();
  let draft: DraftController | undefined;
  const binding: FormBinding = {
    key      : "test",
    read     : () => snapshot,
    subscribe: (changed) => {
      listeners.add(changed);
      return () => listeners.delete(changed);
    },
    prepare: () => ({ resolve: () => undefined }),
    commit : async (_expected, next) => {
      committed.push(next);
      snapshot = { revision: String(committed.length + 1), values: next };
      for (const l of listeners) l();
      return { status: "applied", result: { doc: {} as never, selection: undefined } as never };
    },
    registerDraft: (controller) => {
      draft = controller;
      return () => {};
    },
    canWrite: () => true,
  };
  return { binding, committed, draft: () => draft! };
}

/** A field control over `outfits` that also owns `default`, remembering every write. */
class FakeWardrobe implements FieldControl {
  readonly element = document.createElement("div");
  readonly also = ["default"];
  readonly writes: [string, string | undefined][] = [];
  readonly shown = new Map<string, string | undefined>();
  readOnly = false;
  oninput?: (key: string, text: string | undefined) => void;
  read(key: string) {
    return this.shown.get(key);
  }
  write(key: string, text: string | undefined) {
    if (this.shown.has(key) && this.shown.get(key) === text) return;
    this.shown.set(key, text);
    this.writes.push([key, text]);
  }
  setReadOnly(on: boolean) {
    this.readOnly = on;
  }
  focus() {}
  dispose() {}
}

describe("custom field controls", () => {
  test("a factory's control is written from the document and its input becomes the draft", async () => {
    const wardrobe = new FakeWardrobe();
    const { binding, committed } = memoryBinding({
      name   : "Ada",
      outfits: { day: "Blue" },
      default: "day",
      hidden : "keep",
    });
    const form = new FormControl(schema, binding, ctx, {
      fields: { outfits: { control: () => wardrobe }, hidden: { control: "none" } },
    });
    expect(wardrobe.shown.get("outfits")).toBe('{"day":"Blue"}');
    expect(wardrobe.shown.get("default")).toBe("day");
    const rows = form.element.querySelectorAll(".schema-form-row");
    expect([...rows].map((r) => r.querySelector(".schema-form-label")!.textContent)).toEqual([
      "name",
      "outfits",
    ]);
    wardrobe.oninput!("outfits", '{"day":"Blue","gala":"Green"}');
    wardrobe.oninput!("default", "gala");
    expect(form.pending).toBe(true);
    await form.commit();
    expect(committed).toEqual([
      { name: "Ada", outfits: { day: "Blue", gala: "Green" }, default: "gala", hidden: "keep" },
    ]);
  });
  test("a refresh with nothing pending rewrites only what changed", () => {
    const wardrobe = new FakeWardrobe();
    const { binding } = memoryBinding({ name: "Ada", outfits: { day: "Blue" }, default: "day" });
    const form = new FormControl(schema, binding, ctx, {
      fields: { outfits: { control: () => wardrobe } },
    });
    const before = wardrobe.writes.length;
    form.refresh();
    form.refresh();
    expect(wardrobe.writes.length).toBe(before);
  });
  test("omitting a key writes the control undefined and drops the key on commit", async () => {
    const wardrobe = new FakeWardrobe();
    const { binding, committed } = memoryBinding({ name: "Ada", outfits: { day: "Blue" } });
    const form = new FormControl(schema, binding, ctx, {
      fields: { outfits: { control: () => wardrobe } },
    });
    const omit = [...form.element.querySelectorAll("button")].find(
      (b) => b.getAttribute("aria-label") === "Omit outfits"
    )!;
    omit.click();
    expect(wardrobe.shown.get("outfits")).toBeUndefined();
    await form.commit();
    expect(committed).toEqual([{ name: "Ada" }]);
  });
  test("an omitted field reads Keep, and Keep puts the document's value back", () => {
    const wardrobe = new FakeWardrobe();
    const { binding } = memoryBinding({ name: "Ada", outfits: { day: "Blue" } });
    const form = new FormControl(schema, binding, ctx, {
      fields: { outfits: { control: () => wardrobe } },
    });
    const omit = [...form.element.querySelectorAll("button")].find(
      (b) => b.getAttribute("aria-label") === "Omit outfits"
    )!;
    expect(omit.textContent).toBe("Omit");
    omit.click();
    expect(omit.textContent).toBe("Keep");
    expect(form.pending).toBe(true);
    omit.click();
    expect(omit.textContent).toBe("Omit");
    expect(wardrobe.shown.get("outfits")).toBe('{"day":"Blue"}');
    expect(form.pending).toBe(false);
    // typing into an omitted field is a typed answer again, not an omission
    omit.click();
    wardrobe.oninput!("outfits", "{}");
    expect(omit.textContent).toBe("Omit");
  });
  test("answers the schema refuses never reach the document; the draft stays for Keep", async () => {
    const { binding, committed, draft } = memoryBinding({ name: "Ada", outfits: { day: "Blue" } });
    const form = new FormControl(schema, binding, ctx);
    const omit = [...form.element.querySelectorAll("button")].find(
      (b) => b.getAttribute("aria-label") === "Omit name"
    )!;
    omit.click();
    await form.commit();
    expect(committed).toEqual([]);
    expect(form.pending).toBe(true);
    const status = form.element.querySelector(".schema-form-status")!.textContent!;
    expect(status).toMatch(/^name: /);
    expect(await draft().prepare()).toMatchObject({ status: "unencodable", reason: status });
    omit.click();
    expect(form.pending).toBe(false);
  });
  test("a readOnly field is shown, never edited, and has no Omit", () => {
    const wardrobe = new FakeWardrobe();
    const { binding } = memoryBinding({ name: "Ada", outfits: { day: "Blue" } });
    const form = new FormControl(schema, binding, ctx, {
      fields: { outfits: { control: () => wardrobe, readOnly: true } },
    });
    expect(wardrobe.shown.get("outfits")).toBe('{"day":"Blue"}');
    expect(wardrobe.readOnly).toBe(true);
    const labels = [...form.element.querySelectorAll("button")].map((b) => b.getAttribute("aria-label"));
    expect(labels).toContain("Omit name");
    expect(labels).not.toContain("Omit outfits");
    form.update({ value: undefined, readOnly: false });
    expect(wardrobe.readOnly).toBe(true);
  });
  test("a factory that throws or names an unknown key falls back to the text box", () => {
    const { binding } = memoryBinding({ name: "Ada", outfits: {} });
    const form = new FormControl(schema, binding, ctx, {
      fields: {
        outfits: {
          control: () => {
            throw new Error("no thumbnails here");
          },
        },
        name: {
          control: () => Object.assign(new FakeWardrobe(), { also: ["nowhere"] }),
        },
      },
    });
    expect(form.element.querySelectorAll("textbox-x")).toHaveLength(4);
    const status = form.element.querySelector(".schema-form-status")!.textContent!;
    expect(status).toContain("no thumbnails here");
    expect(status).toContain("nowhere");
  });
  test("read-only reaches the control", () => {
    const wardrobe = new FakeWardrobe();
    const { binding } = memoryBinding({ name: "Ada", outfits: {} });
    const form = new FormControl(schema, binding, ctx, {
      fields: { outfits: { control: () => wardrobe } },
    });
    expect(wardrobe.readOnly).toBe(false);
    form.update({ value: undefined, readOnly: true });
    expect(wardrobe.readOnly).toBe(true);
  });
});

describe("restoring a closed form's answers", () => {
  test("answers typed over the same values come back; the draft's shape is recover's", () => {
    const first = memoryBinding({ name: "Ada", outfits: { day: "Blue" } });
    const closed = new FormControl(schema, first.binding, ctx);
    const box = closed.element.querySelector<TextBox>("textbox-x")!;
    box.text = "Bea";
    box.dom.dispatchEvent(new Event("input"));
    const recovered = first.draft().recover() as { base: FormSnapshot; edits: [string, string][] };
    closed.dispose();
    expect(recovered.edits).toEqual([["name", "Bea"]]);

    const second = memoryBinding({ name: "Ada", outfits: { day: "Blue" } });
    const form = new FormControl(schema, second.binding, ctx);
    expect(form.restore(recovered)).toBe(true);
    expect(form.pending).toBe(true);
    expect(form.element.querySelector<TextBox>("textbox-x")!.text).toBe("Bea");
    expect(form.element.querySelector(".schema-form-status")!.textContent).toContain("Recovered");
  });
  test("refused over different values, over a form already holding answers, or naming an undrawn field", () => {
    const base: FormSnapshot = { revision: "9", values: { name: "Ada", outfits: { day: "Blue" } } };
    const { binding } = memoryBinding({ name: "Ada", outfits: { day: "Red" } });
    const form = new FormControl(schema, binding, ctx);
    expect(form.restore({ base, edits: [["name", "Bea"]] })).toBe(false);
    expect(form.pending).toBe(false);

    const same = memoryBinding({ name: "Ada", outfits: { day: "Blue" } });
    const hidden = new FormControl(schema, same.binding, ctx, {
      fields: { hidden: { control: "none" } },
    });
    expect(hidden.restore({ base, edits: [["hidden", "x"]] })).toBe(false);
    expect(hidden.restore({ base, edits: [["name", "Bea"]] })).toBe(true);
    expect(hidden.restore({ base, edits: [["name", "Cy"]] })).toBe(false);
  });
});

describe("the native form's view", () => {
  test("a host's view is what the widget mounts, with the parts FormControl takes", async () => {
    const doc = markdownSourceDoc("---\nname: Ada\n---\nBody\n");
    const provider = new MarkdownProvider();
    const stack = new ToolStack();
    const session = new DocumentSession(doc, provider, stack);
    const context: WidgetContext = {
      signal       : new AbortController().signal,
      isCurrent    : () => true,
      command      : (command) => session.command(command, ctx),
      registerDraft: (draft) => session.registerDraft(draft, ctx),
    };
    const selected = { schema: zodFormSchema(z.object({ name: z.string() })) };
    let seen: FormControl | undefined;
    const widgets = nativeFormWidgets({
      codec : yaml,
      select: () => selected,
      view  : (parts) => {
        expect(parts.block).toBe(doc.blocks[0].id);
        expect(parts.form).toBe(selected);
        seen = new FormControl(parts.form.schema, parts.binding, parts.context);
        return seen;
      },
    });
    const descriptor = widgets.resolveNativeBlock!(session, doc.blocks[0].id, ctx as never)!;
    const view = (await descriptor.create(context)) as WidgetView;
    expect(view).toBe(seen);
    expect(seen!.element.querySelector("textbox-x")).not.toBeNull();
    const binding = nativeFormBinding(session, doc.blocks[0].id, context, { codec: yaml, select: () => selected }, selected);
    await binding.commit(binding.read()!, { name: "Bea" });
    expect(markdownText(doc)).toBe("---\nname: Bea\n---\nBody\n");
  });
});
