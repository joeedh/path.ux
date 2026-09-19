import { beforeAll, describe, expect, test, vi } from "vitest";
import { UIBase, iconmanager } from "../../scripts/core/ui_base";
import type { Label } from "../../scripts/core/ui";
import { ToolStack } from "../../scripts/path-controller/toolsys/toolstack";
import { DocumentSession, replaceContentsOp } from "../../scripts/widgets/richtext/context";
import type { RichTextContext } from "../../scripts/widgets/richtext/context";
import { RichTextEditor } from "../../scripts/widgets/richtext/editor";
import type { RichTextChangeDetail } from "../../scripts/widgets/richtext/editor";
import { CARET_SLOT } from "../../scripts/widgets/richtext/provider";
import type {
  BlockId,
  DocRange,
  EditOp,
  EditResult,
  LinkInfo,
  ProviderContext,
} from "../../scripts/widgets/richtext/provider";
import { PlainProvider, plainDocFromLines } from "../../scripts/widgets/richtext/providers/plain";
import type { PlainDoc } from "../../scripts/widgets/richtext/providers/plain";
/* the element registrations the toolbar row and its buttons need */
import "../../scripts/core/ui_containers";
import "../../scripts/widgets/ui_widgets";

beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window ||= globalThis;

  // no iconsheet <img> elements exist in the test DOM; the toolbar's icon CSS lookups
  // dereference sheet.image.src, so give the sheets a stand-in
  const sheets = (iconmanager as unknown as { iconsheets: { image: unknown }[] }).iconsheets;
  for (const sheet of sheets) {
    sheet.image ||= { src: "" };
  }

  // happy-dom's InputEvent has no target ranges, so the editor falls back to the selection
  if (typeof InputEvent.prototype.getTargetRanges !== "function") {
    InputEvent.prototype.getTargetRanges = () => [];
  }
});

/** The app's context, standing in for whatever the editor is hosted under. */
class AppCtx {
  state = { name: "app" };
  api = {} as never;
  screen = {} as never;
  toolstack = new ToolStack();

  toLocked() {
    return this;
  }
}

/**
 * The reference provider plus what the tests need from a structured one: two custom ops, a
 * key handler, and a block that embeds a widget.
 */
class TestProvider extends PlainProvider {
  /** Every key `handleKey` saw, so a test can tell a refusal from a call that never came. */
  keys: string[] = [];
  /** The widgets `renderBlock` embedded, newest last. */
  embedded: Label<ProviderContext>[] = [];
  embedIn?: BlockId;

  override applyEdit(doc: PlainDoc, op: EditOp): EditResult {
    if (op.type !== "custom") {
      return super.applyEdit(doc, op);
    }

    const data = op.data as { touch?: BlockId[]; block?: BlockId; text?: string };
    if (op.name === "upper") {
      const touched = data.touch ?? [];
      for (const b of doc.blocks) {
        if (touched.includes(b.id)) {
          b.text = b.text.toUpperCase();
        }
      }
      const last = touched[touched.length - 1];
      return {
        dirtyBlocks  : touched,
        removedBlocks: [],
        selection    : { anchor: { block: last, offset: 0 }, head: { block: last, offset: 0 } },
      };
    }
    if (op.name === "prefix") {
      const b = doc.blocks.find((x) => x.id === data.block)!;
      const text = data.text ?? "";
      b.text = text + b.text;
      b.marks = b.marks.map((m) => ({ ...m, from: m.from + text.length, to: m.to + text.length }));
      const pos = { block: b.id, offset: text.length };
      return { dirtyBlocks: [b.id], removedBlocks: [], selection: { anchor: pos, head: pos } };
    }

    return super.applyEdit(doc, op);
  }

  handleKey(doc: PlainDoc, range: DocRange, event: KeyboardEvent): EditOp | undefined {
    this.keys.push(event.key);
    if (event.key === "Tab" && !event.shiftKey) {
      return { type: "insertText", at: range, text: "→" };
    }

    return undefined;
  }

  override renderBlock(doc: PlainDoc, block: BlockId, ctx: ProviderContext): HTMLElement {
    const el = super.renderBlock(doc, block, ctx);
    if (block === this.embedIn) {
      const widget = UIBase.constructElement<Label<ProviderContext>>("label-x", ctx);
      widget.setAttribute("data-doc-atom", "");
      widget.contentEditable = "false";
      el.append(document.createTextNode(CARET_SLOT), widget, document.createTextNode(CARET_SLOT));
      this.embedded.push(widget);
    }

    return el;
  }
}

const pos = (block: string, offset: number) => ({ block, offset });
const caret = (block: string, offset: number): DocRange => ({
  anchor: pos(block, offset),
  head  : pos(block, offset),
});
const span = (a: string, ao: number, h: string, ho: number): DocRange => ({
  anchor: pos(a, ao),
  head  : pos(h, ho),
});

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function openSession(
  lines = ["Hello world", "second line", "third"],
  toolstack = new ToolStack(),
  provider = new TestProvider()
) {
  const doc = plainDocFromLines(lines, (i) => "abc"[i]);
  return new DocumentSession(doc, provider, toolstack);
}

type Editor = RichTextEditor<AppCtx, PlainDoc>;

function openEditor(session: DocumentSession<PlainDoc>, ctx = new AppCtx()) {
  const editor = UIBase.constructElement<Editor>(RichTextEditor.define().tagname, ctx);
  document.body.append(editor);
  editor.session = session;
  editor.update();

  return editor;
}

const texts = (session: DocumentSession<PlainDoc>) =>
  session.provider.blocks(session.doc).map((id) => session.provider.blockText(session.doc, id));

const domTexts = (editor: Editor) =>
  [...editor.root.querySelectorAll("[data-doc-block]")].map((el) =>
    (el.textContent ?? "").replaceAll(CARET_SLOT, "")
  );

const markButton = (editor: Editor, name: string) => {
  const row = editor.shadow.querySelector("rowframe-x");
  const btn = row?.shadowRoot?.querySelector(`[data-testid="richtext-mark-${name}"]`);
  return btn as (HTMLElement & { checked: boolean; on_change?: (v: boolean) => void }) | null;
};

/** Sends a keystroke the way the browser would: the keydown, then the beforeinput unless it was cancelled. */
function type(editor: Editor, text: string) {
  const beforeinput = new InputEvent("beforeinput", {
    inputType : "insertText",
    data      : text,
    cancelable: true,
    bubbles   : true,
  });
  editor.root.dispatchEvent(beforeinput);
}

function keydown(editor: Editor, init: KeyboardEventInit) {
  const event = new KeyboardEvent("keydown", { cancelable: true, bubbles: true, ...init });
  editor.root.dispatchEvent(event);
  return event;
}

/** Holds the session's toolstack until the returned function is called. */
function holdStack(stack: ToolStack) {
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  const protect = (
    stack as unknown as { protect<T>(label: string, cb: () => Promise<T>): Promise<T> }
  ).protect.bind(stack);
  void protect("hold", () => held);

  return release;
}

describe("custom ops", () => {
  test("round-trip through the session and undo, restoring an untouched middle block in place", async () => {
    const session = openSession();
    const app = new AppCtx();

    await session.dispatch(
      { type: "custom", name: "upper", blocks: ["a", "b", "c"], data: { touch: ["a", "c"] } },
      app
    );
    expect(texts(session)).toEqual(["HELLO WORLD", "second line", "THIRD"]);

    await session.toolstack.undo(undefined);
    expect(texts(session)).toEqual(["Hello world", "second line", "third"]);
    expect(session.provider.blocks(session.doc)).toEqual(["a", "b", "c"]);

    await session.toolstack.redo(undefined);
    expect(texts(session)).toEqual(["HELLO WORLD", "second line", "THIRD"]);
  });

  test("a keystroke read from the DOM while a shifting custom op is pending lands after it", async () => {
    const session = openSession();
    const editor = openEditor(session);
    const release = holdStack(session.toolstack as ToolStack);

    editor.select(caret("a", 5));
    const dispatched = editor.dispatch({
      type  : "custom",
      name  : "prefix",
      blocks: ["a"],
      data  : { block: "a", text: "XY" },
      shifts: [{ block: "a", at: 0, delta: 2 }],
    });
    type(editor, "!");
    expect(texts(session)[0]).toBe("Hello world");

    release();
    await dispatched;
    await tick();
    expect(texts(session)[0]).toBe("XYHello! world");
    expect(domTexts(editor)[0]).toBe("XYHello! world");
  });

  test("the plain provider refuses a custom op it does not know", () => {
    const provider = new PlainProvider();
    expect(() =>
      provider.applyEdit(
        plainDocFromLines(["x"], () => "a"),
        {
          type  : "custom",
          name  : "nope",
          blocks: ["a"],
          data  : null,
        }
      )
    ).toThrow(/unknown custom op nope/);
  });
});

describe("handleKey", () => {
  test("a handled key is consumed and its op submitted; the editor's own Tab refusal is the fallback", async () => {
    const session = openSession();
    const provider = session.provider as TestProvider;
    const editor = openEditor(session);
    const refused: string[] = [];
    editor.addEventListener("refused", (e) => {
      refused.push((e as CustomEvent<{ inputType: string }>).detail.inputType);
    });

    editor.select(caret("a", 5));
    const tab = keydown(editor, { key: "Tab" });
    expect(tab.defaultPrevented).toBe(true);
    await tick();
    expect(texts(session)[0]).toBe("Hello→ world");
    expect(refused).toEqual([]);

    const shiftTab = keydown(editor, { key: "Tab", shiftKey: true });
    expect(shiftTab.defaultPrevented).toBe(true);
    expect(refused).toEqual(["insertTab"]);
    expect(provider.keys).toEqual(["Tab", "Tab"]);
  });

  test("the undo and redo chords never reach the provider", async () => {
    const session = openSession();
    const provider = session.provider as TestProvider;
    const editor = openEditor(session);

    editor.select(caret("a", 5));
    keydown(editor, { key: "z", ctrlKey: true });
    keydown(editor, { key: "y", ctrlKey: true });
    keydown(editor, { key: "Z", ctrlKey: true, shiftKey: true });
    keydown(editor, { key: "Escape" });
    await tick();

    expect(provider.keys).toEqual(["Escape"]);
  });
});

describe("toolbar", () => {
  test("is built by the provider once per session set and synced on selection change", () => {
    const session = openSession();
    const provider = session.provider as TestProvider;
    const build = vi.spyOn(provider, "buildToolbar");
    const editor = openEditor(session);

    expect(build).toHaveBeenCalledTimes(1);
    expect(build.mock.calls[0][1].editor).toBe(editor.bridge);
    expect(editor.shadow.querySelectorAll("rowframe-x")).toHaveLength(1);
    const bold = markButton(editor, "bold");
    expect(bold).not.toBeNull();

    editor.select(span("a", 0, "a", 5));
    document.dispatchEvent(new Event("selectionchange"));
    expect(bold?.checked).toBeFalsy();

    session.doc.blocks[0].marks.push({ from: 0, to: 5, name: "bold" });
    document.dispatchEvent(new Event("selectionchange"));
    expect(bold?.checked).toBe(true);

    editor.session = openSession(["other"]);
    expect(build).toHaveBeenCalledTimes(1);
    expect(editor.shadow.querySelectorAll("rowframe-x")).toHaveLength(1);
    expect(markButton(editor, "bold")).not.toBe(bold);
  });

  test("a mark button dispatches toggleMark over the selection through the bridge", async () => {
    const session = openSession();
    const editor = openEditor(session);
    const italic = markButton(editor, "italic")!;

    editor.select(span("a", 6, "a", 11));
    italic.checked = true;
    await tick();

    expect(session.doc.blocks[0].marks).toEqual([{ from: 6, to: 11, name: "italic" }]);
    expect(editor.root.querySelector("i")?.textContent).toBe("world");
  });

  test("the toolbar row is skipped by a provider with no buildToolbar", () => {
    const provider = new TestProvider();
    provider.buildToolbar = undefined as never;
    const editor = openEditor(openSession(undefined, undefined, provider));

    expect(editor.shadow.querySelector("rowframe-x")).toBeNull();
  });
});

describe("embedded widgets", () => {
  test("keep the editor's context through a setCtx cascade and are updated by the editor", () => {
    const session = openSession();
    const provider = session.provider as TestProvider;
    provider.embedIn = "b";
    const editor = openEditor(session);

    const widget = provider.embedded[0];
    expect(widget).toBeDefined();
    const ctx = widget.ctx as unknown as RichTextContext<AppCtx, PlainDoc>;
    expect(ctx.editor).toBe(editor.bridge);
    expect(ctx.session).toBe(session);

    editor.ctx = new AppCtx();
    expect(widget.ctx).toBe(ctx);
    expect(editor.richCtx?.editor).toBe(editor.bridge);

    const update = vi.spyOn(widget, "update");
    editor.update();
    expect(update).toHaveBeenCalled();
    expect(widget.parentWidget).toBe(editor);
  });
});

describe("readOnly", () => {
  test("refuses every input path, keeps the DOM and its scroll position, and disables the toolbar in place", async () => {
    const session = openSession();
    const provider = session.provider as TestProvider;
    const editor = openEditor(session);
    const before = [...editor.root.children];
    editor.root.scrollTop = 40;

    editor.readOnly = true;
    expect(editor.hasAttribute("readonly")).toBe(true);
    expect(editor.root.getAttribute("contenteditable")).toBe("false");
    expect(editor.root.hasAttribute("readonly")).toBe(true);
    expect([...editor.root.children]).toEqual(before);
    expect(editor.root.scrollTop).toBe(40);
    expect(
      editor.shadow.querySelector<HTMLElement & { disabled: boolean }>("rowframe-x")?.disabled
    ).toBe(true);

    editor.select(caret("a", 5));
    type(editor, "!");
    keydown(editor, { key: "Tab" });
    keydown(editor, { key: "z", ctrlKey: true });
    editor.toggleMark("bold");
    expect(
      await editor.dispatch({ type: "insertText", at: caret("a", 0), text: "x" })
    ).toBeUndefined();
    await tick();

    expect(texts(session)).toEqual(["Hello world", "second line", "third"]);
    expect(provider.keys).toEqual([]);
    expect(session.toolstack.length).toBe(0);

    editor.readOnly = false;
    expect(editor.root.getAttribute("contenteditable")).toBe("true");
    expect(editor.root.hasAttribute("readonly")).toBe(false);
    expect(
      editor.shadow.querySelector<HTMLElement & { disabled: boolean }>("rowframe-x")?.disabled
    ).toBe(false);

    type(editor, "!");
    await tick();
    expect(texts(session)[0]).toBe("Hello! world");
  });

  test("combines with the disabled state into the one contenteditable attribute", () => {
    const editor = openEditor(openSession());

    editor.internalDisabled = true;
    expect(editor.root.getAttribute("contenteditable")).toBe("false");

    editor.readOnly = true;
    editor.internalDisabled = false;
    expect(editor.root.getAttribute("contenteditable")).toBe("false");

    editor.readOnly = false;
    expect(editor.root.getAttribute("contenteditable")).toBe("true");
  });

  test("a widget mounted while the editor was disabled is told when it is enabled again", () => {
    const session = openSession();
    const ctx = new AppCtx();
    const editor = UIBase.constructElement<Editor>(RichTextEditor.define().tagname, ctx);
    const states: boolean[] = [];
    editor.widgetOptions = {
      resolveNativeBlock: (_session, block) =>
        block === "a"
          ? {
              id            : "native:a",
              implementation: "test",
              label         : "Native",
              create: () => ({
                element: document.createElement("span"),
                update : (state) => states.push(state.readOnly),
                dispose: () => {},
              }),
            }
          : undefined,
    };
    document.body.append(editor);
    editor.internalDisabled = true;
    editor.session = session;
    editor.update();
    expect(states.at(-1)).toBe(true);

    editor.internalDisabled = false;
    editor.update();
    expect(states.at(-1)).toBe(false);

    // happy-dom's ShadowRoot.activeElement throws over a mounted widget once the test is done
    // with the editor, and the document's selectionchange listener would reach it
    editor.session = undefined;
    editor.remove();
  });

  test("the attribute set from outside is picked up on update", () => {
    const editor = openEditor(openSession());

    editor.setAttribute("readonly", "");
    editor.update();
    expect(editor.readOnly).toBe(true);
    expect(editor.root.getAttribute("contenteditable")).toBe("false");
  });
});

describe("linkclick", () => {
  const link: LinkInfo = { kind: "wiki", target: "line: L7", text: "L7", range: caret("a", 0) };

  test("reaches a listener on the host and preventDefault suppresses the edit-mode default", () => {
    const editor = openEditor(openSession());
    // the default opens a popup on the screen, which the stub context has none of
    const fallback = vi
      .spyOn(editor as unknown as { linkDefault(): void }, "linkDefault")
      .mockImplementation(() => {});
    const heard: LinkInfo[] = [];
    let prevent = false;
    editor.addEventListener("linkclick", (e) => {
      heard.push((e as CustomEvent<LinkInfo>).detail);
      if (prevent) {
        e.preventDefault();
      }
    });
    const click = new MouseEvent("click");

    expect(editor.bridge.linkClicked(link, click)).toBe(true);
    expect(heard).toEqual([link]);
    expect(fallback).toHaveBeenCalledTimes(1);

    prevent = true;
    expect(editor.bridge.linkClicked(link, click)).toBe(false);
    expect(heard).toHaveLength(2);
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  test("has no default in read-only mode but still reaches the listener", () => {
    const editor = openEditor(openSession());
    const fallback = vi.spyOn(editor as unknown as { linkDefault(): void }, "linkDefault");
    const heard = vi.fn();
    editor.addEventListener("linkclick", heard);
    editor.readOnly = true;

    expect(editor.bridge.linkClicked(link, new MouseEvent("click"))).toBe(true);
    expect(heard).toHaveBeenCalledTimes(1);
    expect(fallback).not.toHaveBeenCalled();
  });

  test("does not bubble past the host", () => {
    const editor = openEditor(openSession());
    vi.spyOn(editor as unknown as { linkDefault(): void }, "linkDefault").mockImplementation(
      () => {}
    );
    const heard = vi.fn();
    document.body.addEventListener("linkclick", heard);

    editor.bridge.linkClicked(link, new MouseEvent("click"));
    expect(heard).not.toHaveBeenCalled();
    document.body.removeEventListener("linkclick", heard);
  });
});

describe("history engines", () => {
  test("replaceContentsOp swaps the document for both editors and undo restores text and ids", async () => {
    const session = openSession();
    const first = openEditor(session);
    const second = openEditor(session);
    const next = plainDocFromLines(["reloaded", "file"], (i) => `r${i}`);

    await session.dispatch(replaceContentsOp(session.provider, session.doc, next), new AppCtx());
    expect(texts(session)).toEqual(["reloaded", "file"]);
    expect(session.provider.blocks(session.doc)).toEqual(["r0", "r1"]);
    expect(domTexts(first)).toEqual(["reloaded", "file"]);
    expect(domTexts(second)).toEqual(["reloaded", "file"]);
    expect(session.toolstack.length).toBe(1);

    await first.undo();
    expect(texts(session)).toEqual(["Hello world", "second line", "third"]);
    expect(session.provider.blocks(session.doc)).toEqual(["a", "b", "c"]);
    expect(domTexts(first)).toEqual(["Hello world", "second line", "third"]);
    expect(domTexts(second)).toEqual(["Hello world", "second line", "third"]);
  });

  test("navigating to another session and back restores viewState and keeps the first session's undo", async () => {
    const first = openSession();
    const second = openSession(["elsewhere"]);
    const editor = openEditor(first);

    editor.select(caret("a", 5));
    type(editor, "!");
    await tick();
    expect(texts(first)[0]).toBe("Hello! world");

    editor.select(caret("b", 3));
    editor.root.scrollTop = 40;
    const saved = editor.viewState;
    expect(saved).toEqual({ selection: caret("b", 3), scrollTop: 40 });

    editor.session = second;
    expect(domTexts(editor)).toEqual(["elsewhere"]);

    editor.session = first;
    editor.viewState = saved;
    expect(editor.viewState).toEqual(saved);

    await editor.undo();
    expect(texts(first)[0]).toBe("Hello world");
    expect(domTexts(editor)[0]).toBe("Hello world");
  });

  test("a shared stack undoes a background session's op against that session, not the foreground one", async () => {
    const stack = new ToolStack();
    const foreground = openSession(undefined, stack);
    const background = openSession(["back"], stack);
    const editor = openEditor(foreground);

    await editor.dispatch({ type: "insertText", at: caret("a", 5), text: "!" });
    await background.dispatch({ type: "insertText", at: caret("a", 4), text: "?" }, new AppCtx());
    expect(texts(foreground)[0]).toBe("Hello! world");
    expect(texts(background)[0]).toBe("back?");
    expect(stack.length).toBe(2);

    await stack.undo();
    expect(texts(background)[0]).toBe("back");
    expect(texts(foreground)[0]).toBe("Hello! world");

    await stack.undo();
    expect(texts(foreground)[0]).toBe("Hello world");
    expect(domTexts(editor)[0]).toBe("Hello world");
  });

  test("session.dispatch never folds by default and counts every change in revision", async () => {
    const session = openSession();
    const app = new AppCtx();
    expect(session.revision).toBe(0);

    await session.dispatch({ type: "insertText", at: caret("a", 11), text: "!" }, app);
    await session.dispatch({ type: "insertText", at: caret("a", 12), text: "?" }, app);
    expect(session.toolstack.length).toBe(2);
    expect(session.revision).toBe(2);

    await session.dispatch(
      { type: "insertText", at: caret("a", 13), text: "." },
      app,
      undefined,
      7
    );
    await session.dispatch(
      { type: "insertText", at: caret("a", 14), text: "." },
      app,
      undefined,
      7
    );
    expect(session.toolstack.length).toBe(3);
    expect(session.revision).toBe(4);
    expect(texts(session)[0]).toBe("Hello world!?..");
  });
});

describe("change notification", () => {
  type Heard = { origin: string; editor: Editor };

  function listen(editors: Editor[]) {
    const heard: Heard[] = [];
    const docs: unknown[] = [];
    for (const editor of editors) {
      editor.addEventListener("change", (e) => {
        const { info, session } = (e as CustomEvent<RichTextChangeDetail>).detail;
        heard.push({ origin: info.origin, editor });
        expect(session).toBe(editor.session);
      });
      editor.on_change = (doc) => docs.push(doc);
    }

    return { heard, docs };
  }

  test("an edit, an undo and a reload each produce one change on every editor with its origin", async () => {
    const session = openSession();
    const first = openEditor(session);
    const second = openEditor(session);
    const { heard, docs } = listen([first, second]);

    first.select(caret("a", 5));
    type(first, "!");
    await tick();
    expect(heard).toEqual([
      { origin: "edit", editor: second },
      { origin: "edit", editor: first },
    ]);

    type(first, "?");
    await tick();
    expect(heard.slice(2).map((h) => h.origin)).toEqual(["fold", "fold"]);

    await second.undo();
    expect(heard.slice(4).map((h) => h.origin)).toEqual(["undo", "undo"]);

    await session.dispatch(
      replaceContentsOp(
        session.provider,
        session.doc,
        plainDocFromLines(["new"], () => "n")
      ),
      new AppCtx()
    );
    expect(heard.slice(6).map((h) => h.origin)).toEqual(["edit", "edit"]);
    expect(heard).toHaveLength(8);
    expect(docs).toHaveLength(8);
    expect(docs.every((doc) => doc === session.doc)).toBe(true);
  });

  test("the change event does not bubble", async () => {
    const session = openSession();
    const editor = openEditor(session);
    const heard = vi.fn();
    document.body.addEventListener("change", heard);

    await editor.dispatch({ type: "insertText", at: caret("a", 0), text: "x" });
    expect(heard).not.toHaveBeenCalled();
    document.body.removeEventListener("change", heard);
  });

  test("a provider's external change reaches session listeners and editors as external", () => {
    const session = openSession();
    const provider = session.provider as TestProvider;
    const editor = openEditor(session);
    const { heard } = listen([editor]);
    const origins: string[] = [];
    session.onChange((_change, info) => origins.push(info.origin));

    session.doc.blocks[0].text = "changed underneath";
    provider.notifyChange(session.doc, { dirtyBlocks: ["a"], removedBlocks: [] });

    expect(origins).toEqual(["external"]);
    expect(heard.map((h) => h.origin)).toEqual(["external"]);
    expect(domTexts(editor)[0]).toBe("changed underneath");
    expect(session.revision).toBe(1);
  });
});
