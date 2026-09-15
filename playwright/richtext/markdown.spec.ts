import { test, expect, type Locator, type Page } from "@playwright/test";
import { PLAYWRIGHT_HOST, SCEENSHOTS } from "../location";

interface Pos {
  block: string;
  offset: number;
}

interface Range {
  anchor: Pos;
  head: Pos;
}

/** The subset of `RichTextEditor` and its session the spec reads back out of the page. */
interface EditorProbe extends HTMLElement {
  root: HTMLDivElement;
  readOnly: boolean;
  session: {
    doc: unknown;
    provider: {
      blocks(doc: unknown): string[];
      blockText(doc: unknown, block: string): string;
    };
  };
  select(range: Range): void;
  selection(): Range | undefined;
}

declare global {
  interface Window {
    __loadMarkdown?: (text: string) => void;
  }
}

const LISTS = `- Bullet at depth 0
  - Bullet at depth 1
    - Bullet at depth 2
- A second top bullet

1. Number at depth 0
   1. Number at depth 1
      1. Number at depth 2
      2. Second at depth 2
   2. Second at depth 1
2. Second at depth 0

- [ ] Task at depth 0
  - [x] Done at depth 1
    - [ ] Task at depth 2
`;

const NUMBERED = `1. one
2. two
   - a bullet between
   - another
3. three
`;

const CODE = "```ts\nfirst line\nsecond line\nthird line\n```\n";

const RAW = `A paragraph before the video.

<video src="trailer.mp4" controls></video>

A paragraph after it.
`;

async function openMarkdown(page: Page, text?: string): Promise<Locator> {
  await page.goto(PLAYWRIGHT_HOST);
  await page.getByTestId("tab-markdown").click();

  const editor = page.locator('[data-testid="markdown-editor"]');
  await expect(editor).toBeVisible();
  await expect.poll(() => blocks(editor).then((b) => b.length)).toBeGreaterThan(5);

  if (text !== undefined) {
    await page.evaluate((md) => window.__loadMarkdown?.(md), text);
  }

  return editor;
}

function blocks(editor: Locator): Promise<string[]> {
  return editor.evaluate((el) => {
    const { doc, provider } = (el as EditorProbe).session;
    return provider.blocks(doc);
  });
}

function texts(editor: Locator): Promise<string[]> {
  return editor.evaluate((el) => {
    const { doc, provider } = (el as EditorProbe).session;
    return provider.blocks(doc).map((id) => provider.blockText(doc, id));
  });
}

/** Focuses the editor with the selection from `offset` to `to` in the block at `index`. */
function selectIn(editor: Locator, index: number, offset: number, to = offset): Promise<void> {
  return editor.evaluate(
    (el, [index, offset, to]) => {
      const probe = el as EditorProbe;
      const block = probe.session.provider.blocks(probe.session.doc)[index];
      probe.select({ anchor: { block, offset }, head: { block, offset: to } });
    },
    [index, offset, to]
  );
}

function selection(editor: Locator): Promise<Range | undefined> {
  return editor.evaluate((el) => (el as EditorProbe).selection());
}

/** The caret's rectangle, read through the editor's shadow root the way the editor reads it. */
function caretRect(editor: Locator): Promise<{ top: number; left: number } | undefined> {
  return editor.evaluate((el) => {
    const shadow = el.shadowRoot as ShadowRoot & { getSelection?(): Selection | null };
    const sel = (shadow.getSelection?.() ?? document.getSelection()) as
      (Selection & { getComposedRanges?(o: { shadowRoots: ShadowRoot[] }): StaticRange[] }) | null;
    if (sel === null || sel.rangeCount === 0) {
      return undefined;
    }

    const composed = sel.getComposedRanges?.({ shadowRoots: [shadow] })[0];
    const range = document.createRange();
    if (composed !== undefined) {
      range.setStart(composed.startContainer, composed.startOffset);
      range.setEnd(composed.endContainer, composed.endOffset);
    } else {
      const live = sel.getRangeAt(0);
      range.setStart(live.startContainer, live.startOffset);
      range.setEnd(live.endContainer, live.endOffset);
    }

    const rect = range.getClientRects()[0] ?? range.getBoundingClientRect();
    return { top: rect.top, left: rect.left };
  });
}

/** Writes the named screenshot from Chromium; the Firefox project only checks behaviour. */
async function shot(editor: Locator, browserName: string, name: string): Promise<void> {
  if (browserName === "chromium") {
    await editor.screenshot({ path: `${SCEENSHOTS}/${name}.png`, caret: "initial" });
  }
}

/**
 * The text every list marker shows, in document order. Markers are `::marker` boxes that no
 * DOM API reads back, so the layout tree is asked over CDP; only Chromium answers.
 */
async function markers(page: Page): Promise<string[]> {
  const cdp = await page.context().newCDPSession(page);
  const snap = await cdp.send("DOMSnapshot.captureSnapshot", { computedStyles: [] });
  await cdp.detach();

  const out = new Map<number, string>();
  for (const doc of snap.documents) {
    const { nodes, layout } = doc;
    const pseudoIndex = nodes.pseudoType?.index ?? [];
    const pseudoValue = nodes.pseudoType?.value ?? [];

    for (let i = 0; i < layout.nodeIndex.length; i++) {
      const nodeIndex = layout.nodeIndex[i];
      const at = pseudoIndex.indexOf(nodeIndex);
      if (at < 0 || snap.strings[pseudoValue[at]] !== "marker") {
        continue;
      }

      const text = layout.text[i] >= 0 ? snap.strings[layout.text[i]] : "";
      out.set(nodeIndex, (out.get(nodeIndex) ?? "") + text);
    }
  }

  return [...out.values()].map((m) => m.trim());
}

test("the sample document renders every kind, and reads as a page when read-only", async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1280, height: 1400 });
  const editor = await openMarkdown(page);

  const kinds = await editor.evaluate((el) =>
    [...(el as EditorProbe).root.children].map(
      (b) =>
        `${b.tagName.toLowerCase()}${b.className === "" ? "" : `.${b.className.split(" ")[0]}`}`
    )
  );
  expect(kinds.slice(0, 3)).toEqual(["div.md-frontmatter", "h1", "p"]);
  expect(kinds).toContain("pre.md-code");
  expect(kinds).toContain("div.md-table");
  expect(kinds).toContain("div.md-raw");
  expect(kinds.filter((k) => k === "div.md-li")).toHaveLength(12);

  await shot(editor, browserName, "markdown-document");

  await editor.evaluate((el) => {
    (el as EditorProbe).readOnly = true;
  });
  await expect(editor.locator(".rich-text-root")).toHaveAttribute("contenteditable", "false");
  await shot(editor, browserName, "markdown-document-readonly");

  // nothing edits under readonly
  const before = await texts(editor);
  await selectIn(editor, 1, 3);
  await page.keyboard.type("zzz");
  await page.keyboard.press("Enter");
  expect(await texts(editor)).toEqual(before);
});

test("lists at three depths, with bullets, numbers and tasks", async ({ page, browserName }) => {
  const editor = await openMarkdown(page, LISTS);
  await expect.poll(() => texts(editor).then((t) => t.length)).toBe(13);

  const items = editor.locator(".md-li");
  await expect(items).toHaveCount(13);
  await expect(items.nth(2)).toHaveAttribute("data-md-depth", "2");
  await expect(items.nth(6)).toHaveAttribute("data-md-ordered", "true");
  await expect(items.nth(11)).toHaveAttribute("data-md-checked", "");
  await expect(items.nth(11).locator("input")).toBeChecked();

  await shot(editor, browserName, "markdown-lists");

  // a task item draws no marker at all; its box sits where the marker would
  test.skip(browserName !== "chromium", "marker text is read over CDP");
  expect(await markers(page)).toEqual(["•", "◦", "■", "•", "1.", "1.", "1.", "2.", "2.", "2."]);
});

test("numbering follows a split and an undo, and resumes after a bullet run", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "marker text is read over CDP");
  const editor = await openMarkdown(page, NUMBERED);
  await expect
    .poll(() => texts(editor))
    .toEqual(["one", "two", "a bullet between", "another", "three"]);
  expect(await markers(page)).toEqual(["1.", "2.", "◦", "◦", "3."]);

  await selectIn(editor, 1, 3);
  await page.keyboard.press("Enter");
  await expect
    .poll(() => texts(editor))
    .toEqual(["one", "two", "", "a bullet between", "another", "three"]);
  expect(await markers(page)).toEqual(["1.", "2.", "3.", "◦", "◦", "4."]);

  await page.keyboard.type("new");
  await expect
    .poll(() => texts(editor))
    .toEqual(["one", "two", "new", "a bullet between", "another", "three"]);

  await page.keyboard.press("Control+z");
  await page.keyboard.press("Control+z");
  await expect
    .poll(() => texts(editor))
    .toEqual(["one", "two", "a bullet between", "another", "three"]);
  expect(await markers(page)).toEqual(["1.", "2.", "◦", "◦", "3."]);
});

test("Enter in an empty item leaves the list, Tab nests an item and Shift+Tab lifts it", async ({
  page,
}) => {
  const editor = await openMarkdown(page, NUMBERED);
  await expect.poll(() => texts(editor).then((t) => t.length)).toBe(5);

  await selectIn(editor, 4, 5);
  await page.keyboard.press("Enter");
  await expect
    .poll(() => texts(editor))
    .toEqual(["one", "two", "a bullet between", "another", "three", ""]);
  await expect(editor.locator("[data-doc-block]").nth(5)).toHaveClass(/md-li/);

  await page.keyboard.press("Enter");
  await expect(editor.locator("[data-doc-block]").nth(5)).not.toHaveClass(/md-li/);
  expect(await texts(editor)).toHaveLength(6);

  await selectIn(editor, 4, 0);
  await page.keyboard.press("Tab");
  await expect(editor.locator("[data-doc-block]").nth(4)).toHaveAttribute("data-md-depth", "1");
  await page.keyboard.press("Shift+Tab");
  await expect(editor.locator("[data-doc-block]").nth(4)).toHaveAttribute("data-md-depth", "0");
});

test("Backspace at the start of a heading makes it a paragraph before joining", async ({
  page,
}) => {
  const editor = await openMarkdown(page, "Intro\n\n## Title\n");
  await expect.poll(() => texts(editor)).toEqual(["Intro", "Title"]);

  await selectIn(editor, 1, 0);
  await page.keyboard.press("Backspace");
  await expect(editor.locator("[data-doc-block]").nth(1)).toHaveJSProperty("tagName", "P");
  expect(await texts(editor)).toEqual(["Intro", "Title"]);

  await page.keyboard.press("Backspace");
  await expect.poll(() => texts(editor)).toEqual(["IntroTitle"]);
});

test("the caret crosses a code-block newline and lands on an empty last line", async ({
  page,
  browserName,
}) => {
  const editor = await openMarkdown(page, CODE);
  await expect.poll(() => texts(editor)).toEqual(["first line\nsecond line\nthird line"]);

  await selectIn(editor, 0, 9);
  const firstLine = await caretRect(editor);
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("ArrowRight");
  }
  await expect.poll(selection.bind(null, editor)).toMatchObject({ head: { offset: 12 } });
  const secondLine = await caretRect(editor);
  expect(secondLine!.top).toBeGreaterThan(firstLine!.top);

  await shot(editor, browserName, "markdown-code");

  // Enter inside the fence is a newline, not a split
  await selectIn(editor, 0, 11);
  await page.keyboard.press("Enter");
  await expect.poll(() => texts(editor)).toEqual(["first line\n\nsecond line\nthird line"]);
  expect(await blocks(editor)).toHaveLength(1);

  // at the end, Enter opens an empty last line the caret can sit on and type into
  const end = (await texts(editor))[0].length;
  await selectIn(editor, 0, end);
  await page.keyboard.press("Enter");
  await expect.poll(() => texts(editor)).toEqual(["first line\n\nsecond line\nthird line\n"]);
  await expect.poll(selection.bind(null, editor)).toMatchObject({ head: { offset: end + 1 } });
  await page.keyboard.type("x");
  await expect.poll(() => texts(editor)).toEqual(["first line\n\nsecond line\nthird line\nx"]);
  const lastLine = await caretRect(editor);
  expect(lastLine!.top).toBeGreaterThan(secondLine!.top);

  // a second Enter on an empty last line leaves the fence
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Enter");
  await expect.poll(() => texts(editor)).toEqual(["first line\n\nsecond line\nthird line", ""]);
  await expect(editor.locator("[data-doc-block]").nth(1)).toHaveJSProperty("tagName", "P");
});

test("Shift+Enter is a hard break in a paragraph", async ({ page }) => {
  const editor = await openMarkdown(page, "one two\n");
  await expect.poll(() => texts(editor)).toEqual(["one two"]);

  await selectIn(editor, 0, 3);
  await page.keyboard.press("Shift+Enter");
  await expect.poll(() => texts(editor)).toEqual(["one\n two"]);
  expect(await blocks(editor)).toHaveLength(1);
});

test("a raw block is a placeholder that is deleted as a unit", async ({ page, browserName }) => {
  const editor = await openMarkdown(page, RAW);
  await expect.poll(() => texts(editor).then((t) => t.length)).toBe(3);

  const raw = editor.locator(".md-raw");
  await expect(raw).toHaveAttribute("contenteditable", "false");
  await expect(raw).toContainText('<video src="trailer.mp4" controls>');
  expect(await page.locator("video").count()).toBe(0);

  await shot(editor, browserName, "markdown-raw");

  // the browser reports Backspace beside a non-editable block as a deletion spanning it; the
  // block goes and the paragraphs on either side stay separate
  await selectIn(editor, 2, 0);
  await page.keyboard.press("Backspace");
  await expect
    .poll(() => texts(editor))
    .toEqual(["A paragraph before the video.", "A paragraph after it."]);
  await expect(editor.locator(".md-raw")).toHaveCount(0);
  await expect.poll(selection.bind(null, editor)).toMatchObject({ head: { offset: 29 } });

  await page.keyboard.press("Control+z");
  await expect(editor.locator(".md-raw")).toHaveCount(1);
  await expect.poll(() => texts(editor).then((t) => t.length)).toBe(3);
});
