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
 * A page screenshot clipped to the editor, for a state an element screenshot would disturb:
 * Playwright loses `:hover` and a pointer capture while it stabilises the element.
 */
async function pageShot(page: Page, editor: Locator, browserName: string, name: string) {
  if (browserName !== "chromium") {
    return;
  }
  const box = (await editor.boundingBox())!;
  await page.screenshot({
    path: `${SCEENSHOTS}/${name}.png`,
    clip: { x: box.x, y: box.y, width: box.width, height: box.height },
  });
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

/** The block indexes the stage 4 tests drive, found by text so the sample can grow. */
async function sampleIndexes(editor: Locator) {
  const t = await texts(editor);
  const find = (prefix: string) => {
    const i = t.findIndex((x) => x.startsWith(prefix));
    expect(i, prefix).toBeGreaterThanOrEqual(0);
    return i;
  };
  return {
    heading  : find("The Markdown tab"),
    paragraph: find("A paragraph with"),
    task     : find("A task inside it"),
    image    : find("￼ sits inline"),
    texts    : t,
  };
}

/** The `checked` flag of the list item at `index`, straight off the document. */
function checkedAt(editor: Locator, index: number): Promise<boolean | undefined> {
  return editor.evaluate((el, index) => {
    const { doc } = (el as EditorProbe).session as { doc: { blocks: { checked?: boolean }[] } };
    return doc.blocks[index].checked;
  }, index);
}

/** The atoms of every block that holds one, as `[index, count, width]` rows. */
function atoms(editor: Locator): Promise<[number, number, number | undefined][]> {
  return editor.evaluate((el) => {
    const { doc } = (el as EditorProbe).session as {
      doc: { blocks: { atoms: { image: { width?: number } }[] }[] };
    };
    return doc.blocks
      .map((b, i): [number, number, number | undefined] => [
        i,
        b.atoms.length,
        b.atoms[0]?.image.width,
      ])
      .filter((row) => row[1] > 0);
  });
}

/** The link marks of the block at `index`. */
function linksAt(
  editor: Locator,
  index: number
): Promise<{ from: number; to: number; target: string }[]> {
  return editor.evaluate((el, index) => {
    const { doc } = (el as EditorProbe).session as {
      doc: { blocks: { marks: { name: string; from: number; to: number; target?: string }[] }[] };
    };
    return doc.blocks[index].marks
      .filter((m) => m.name === "link")
      .map((m) => ({ from: m.from, to: m.to, target: m.target ?? "" }));
  }, index);
}

const toolButton = (editor: Locator, id: string) => editor.locator(`[data-testid="${id}"]`);

/** Whether the toolbar button with `id` is lit. */
function lit(editor: Locator, id: string): Promise<boolean> {
  return toolButton(editor, id).evaluate((btn) => (btn as unknown as { active: boolean }).active);
}

test("the toolbar shows the kind and the marks under the caret, and the dropdown sets a kind", async ({
  page,
  browserName,
}) => {
  const editor = await openMarkdown(page);
  const at = await sampleIndexes(editor);

  await selectIn(editor, at.heading, 0, 3);
  await expect(toolButton(editor, "richtext-kind")).toHaveAttribute("name", "Heading 1");
  await shot(editor, browserName, "markdown-toolbar");

  const bold = at.texts[at.paragraph].indexOf("strong");
  await selectIn(editor, at.paragraph, bold, bold + 3);
  await expect(toolButton(editor, "richtext-kind")).toHaveAttribute("name", "Paragraph");
  await expect.poll(() => lit(editor, "richtext-mark-bold")).toBe(true);
  expect(await lit(editor, "richtext-mark-italic")).toBe(false);

  // the dropdown turns the paragraph into a heading, and Ctrl+Z turns it back
  await toolButton(editor, "richtext-kind").click();
  await page.getByText("Heading 2", { exact: true }).click();
  await expect(editor.locator("h2").filter({ hasText: "A paragraph with" })).toHaveCount(1);
  await expect(toolButton(editor, "richtext-kind")).toHaveAttribute("name", "Heading 2");

  await page.keyboard.press("Control+z");
  await expect(editor.locator("h2").filter({ hasText: "A paragraph with" })).toHaveCount(0);
});

test("resting the pointer on a toolbar control shows its tooltip", async ({ page }) => {
  const editor = await openMarkdown(page);
  const tip = page.locator("pathux-tool-tip-x div");

  for (const [id, text] of [
    ["richtext-kind", "Kind of the block at the cursor"],
    ["richtext-mark-bold", "Bold (Ctrl+B)"],
    ["richtext-list-task", "Task list"],
    ["richtext-link", "Link the selection"],
  ]) {
    await toolButton(editor, id).hover();
    await expect(tip).toHaveText(text);
    await page.mouse.move(0, 0);
    await expect(tip).toHaveCount(0);
  }
});

test("the list buttons toggle a paragraph into a list and back", async ({ page }) => {
  const editor = await openMarkdown(page);
  const at = await sampleIndexes(editor);

  await selectIn(editor, at.paragraph, 2);
  await toolButton(editor, "richtext-list-bullet").click();
  await expect(editor.locator(".md-li").nth(0)).toHaveText(/^A paragraph with/);
  await expect.poll(() => lit(editor, "richtext-list-bullet")).toBe(true);

  await toolButton(editor, "richtext-list-task").click();
  await expect(editor.locator(".md-li[data-md-task]").nth(0)).toHaveText(/^A paragraph with/);
  await expect.poll(() => lit(editor, "richtext-list-task")).toBe(true);

  // the lit button turns the item back into a paragraph
  await toolButton(editor, "richtext-list-task").click();
  await expect(editor.locator("p").nth(0)).toHaveText(/^A paragraph with/);
  await expect.poll(() => lit(editor, "richtext-list-task")).toBe(false);
});

test("ticking a task writes the document and undoes as one entry", async ({
  page,
  browserName,
}) => {
  const editor = await openMarkdown(page);
  const at = await sampleIndexes(editor);
  expect(await checkedAt(editor, at.task)).toBe(false);

  await selectIn(editor, at.task, 0);
  const box = editor.locator(".md-li").filter({ hasText: "A task inside it" }).locator("input");
  await box.click();
  await expect.poll(() => checkedAt(editor, at.task)).toBe(true);
  await expect(box).toBeChecked();
  await shot(editor, browserName, "markdown-task-checked");

  await page.keyboard.press("Control+z");
  await expect.poll(() => checkedAt(editor, at.task)).toBe(false);
  await expect(box).not.toBeChecked();
});

test("the Link button sets a link over the selection and a link click opens the popup", async ({
  page,
  browserName,
}) => {
  const editor = await openMarkdown(page);
  const at = await sampleIndexes(editor);
  const from = at.texts[at.paragraph].indexOf("emphasis");

  await selectIn(editor, at.paragraph, from, from + 8);
  await toolButton(editor, "richtext-link").click();
  const popup = page.getByTestId("richtext-link-popup");
  await expect(popup).toBeVisible();
  if (browserName === "chromium") {
    await page.screenshot({
      path: `${SCEENSHOTS}/markdown-link-popup.png`,
      clip: { x: 640, y: 0, width: 640, height: 240 },
    });
  }

  await page.keyboard.type("https://example.test/a");
  await page.keyboard.press("Enter");
  await expect(popup).toBeHidden();
  await expect
    .poll(() => linksAt(editor, at.paragraph))
    .toContainEqual({
      from,
      to    : from + 8,
      target: "https://example.test/a",
    });
  // Enter closed the popup and nothing else: the paragraph is still one block
  expect((await texts(editor))[at.paragraph]).toBe(at.texts[at.paragraph]);

  // a click on the new link opens the popup with its target, and Remove takes the link off
  await editor.locator('a[data-link-target="https://example.test/a"]').click();
  await expect(popup).toBeVisible();
  await expect(page.getByTestId("richtext-link-target").locator("input")).toHaveValue(
    "https://example.test/a"
  );
  await page.getByTestId("richtext-link-remove").click();
  await expect(popup).toBeHidden();
  await expect
    .poll(() => linksAt(editor, at.paragraph).then((l) => l.some((m) => m.from === from)))
    .toBe(false);
});

test("a wikilink click raises linkclick with kind wiki, and preventDefault keeps the popup shut", async ({
  page,
}) => {
  const editor = await openMarkdown(page);
  await editor.evaluate((el) => {
    const seen: unknown[] = [];
    (window as unknown as { __links: unknown[] }).__links = seen;
    el.addEventListener("linkclick", (e) => {
      const detail = (e as CustomEvent<{ kind: string; target: string; text: string }>).detail;
      seen.push({ kind: detail.kind, target: detail.target, text: detail.text });
      if (detail.kind === "wiki") {
        e.preventDefault();
      }
    });
  });

  await editor.locator('a[data-link-kind="wiki"]').first().click();
  expect(await page.evaluate(() => (window as unknown as { __links: unknown[] }).__links)).toEqual([
    { kind: "wiki", target: "Wiki page", text: "wikilink" },
  ]);
  await expect(page.getByTestId("richtext-link-popup")).toHaveCount(0);

  // the url link is not prevented, so the default popup opens
  await editor.locator('a[data-link-kind="url"]').first().click();
  await expect(page.getByTestId("richtext-link-popup")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("richtext-link-popup")).toBeHidden();
});

test("the image handle resizes with Escape restoring, and a release commits one undo entry", async ({
  page,
  browserName,
}) => {
  const editor = await openMarkdown(page);
  const at = await sampleIndexes(editor);
  const widget = editor.locator('[data-testid="md-image"]').first();
  const handle = editor.locator('[data-testid="md-image-handle"]').first();

  await widget.scrollIntoViewIfNeeded();
  await widget.hover();
  await expect(handle).toBeVisible();
  await pageShot(page, editor, browserName, "markdown-image-hover");

  const grab = async () => {
    await widget.hover();
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 20, box.y + 5);
    await page.mouse.move(box.x + 40, box.y + 5);
  };

  await grab();
  await expect
    .poll(() =>
      widget.evaluate((w) => (w as unknown as { img: HTMLImageElement }).img.getAttribute("width"))
    )
    .toBe("51");
  await pageShot(page, editor, browserName, "markdown-image-resize");
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect
    .poll(() =>
      widget.evaluate((w) => (w as unknown as { img: HTMLImageElement }).img.getAttribute("width"))
    )
    .toBeNull();
  expect((await atoms(editor))[0]).toEqual([at.image, 2, undefined]);

  await grab();
  await page.mouse.up();
  await expect.poll(() => atoms(editor).then((a) => a[0][2])).toBe(51);

  await selectIn(editor, at.image, 2);
  await page.keyboard.press("Control+z");
  await expect.poll(() => atoms(editor).then((a) => a[0][2])).toBeUndefined();
});

test("dragging an image into another paragraph moves the atom and undoes", async ({
  page,
  browserName,
}) => {
  // tall enough that the image and the heading it lands in are both on screen
  await page.setViewportSize({ width: 1280, height: 1400 });
  const editor = await openMarkdown(page);
  const at = await sampleIndexes(editor);
  const widget = editor.locator('[data-testid="md-image"]').first();
  await widget.scrollIntoViewIfNeeded();

  const from = (await widget.boundingBox())!;
  const heading = (await editor.locator("h1").first().boundingBox())!;
  // away from the corner, where the resize handle sits over a small image
  await page.mouse.move(from.x + 4, from.y + 4);
  await page.mouse.down();
  await page.mouse.move(from.x + 10, from.y - 10);
  await page.mouse.move(heading.x + 60, heading.y + heading.height / 2);
  await expect(editor.locator(".md-image-drop-caret")).toBeVisible();
  await expect(editor.locator(".md-image-ghost")).toBeVisible();
  await pageShot(page, editor, browserName, "markdown-image-move");

  await page.mouse.up();
  await expect.poll(() => texts(editor).then((t) => t[at.heading])).toMatch(/^The.?￼/);
  expect((await atoms(editor)).map((row) => row[0])).toEqual([at.heading, at.image]);
  await expect(editor.locator(".md-image-drop-caret")).toHaveCount(0);

  await page.keyboard.press("Control+z");
  await expect.poll(() => texts(editor).then((t) => t[at.heading])).toBe("The Markdown tab");
  expect((await atoms(editor)).map((row) => row[0])).toEqual([at.image]);
});

test("under readonly the toolbar, the checkbox, the handle and the drag are inert and scrollTop holds", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 700 });
  const editor = await openMarkdown(page);
  const at = await sampleIndexes(editor);
  const before = await texts(editor);

  await editor.evaluate((el) => {
    (el as EditorProbe).readOnly = true;
    // the tab sizes the editor to its content, so the root only scrolls once it is held down
    (el as HTMLElement).style.height = "400px";
  });
  const disabled = (id: string) =>
    toolButton(editor, id).evaluate((btn) => (btn as unknown as { disabled: boolean }).disabled);
  await expect.poll(() => disabled("richtext-link")).toBe(true);
  await expect.poll(() => disabled("richtext-list-bullet")).toBe(true);
  await expect.poll(() => disabled("richtext-kind")).toBe(true);

  const box = editor.locator(".md-li").filter({ hasText: "A task inside it" }).locator("input");
  await box.scrollIntoViewIfNeeded();
  await box.click();
  expect(await checkedAt(editor, at.task)).toBe(false);

  const widget = editor.locator('[data-testid="md-image"]').first();
  await widget.scrollIntoViewIfNeeded();
  await widget.hover();
  await expect(editor.locator('[data-testid="md-image-handle"]').first()).toBeHidden();

  const from = (await widget.boundingBox())!;
  await page.mouse.move(from.x + 4, from.y + 4);
  await page.mouse.down();
  await page.mouse.move(from.x + 40, from.y - 60);
  await page.mouse.up();
  await expect(editor.locator(".md-image-ghost")).toHaveCount(0);
  expect(await texts(editor)).toEqual(before);

  // a link click with the root scrolled raises no popup and moves nothing
  const scrollTop = () => editor.evaluate((el) => (el as EditorProbe).root.scrollTop);
  await editor.evaluate((el) => {
    (el as EditorProbe).root.scrollTop = 120;
  });
  const held = await scrollTop();
  expect(held).toBeGreaterThan(0);
  await editor.locator('a[data-link-kind="url"]').first().click();
  await expect(page.getByTestId("richtext-link-popup")).toHaveCount(0);
  await page.keyboard.type("zzz");
  expect(await texts(editor)).toEqual(before);
  expect(await scrollTop()).toBe(held);
});

// ---- stage 5: the tab around the editor ----

/** The tab from its control row to a way down the editor, so the outline, toolbar and document show together. */
async function tabShot(page: Page, browserName: string, name: string) {
  if (browserName !== "chromium") {
    return;
  }
  const controls = (await page.locator('[data-testid="markdown-readonly"]').boundingBox())!;
  const outline = (await page.locator('[data-testid="markdown-outline"]').boundingBox())!;
  const editor = (await page.locator('[data-testid="markdown-editor"]').boundingBox())!;
  const x = Math.min(controls.x, outline.x) - 2;
  const y = controls.y - 8;
  const view = page.viewportSize()!;
  await page.screenshot({
    path: `${SCEENSHOTS}/${name}.png`,
    clip: {
      x,
      y,
      width : Math.min(editor.x + editor.width + 8, view.width) - x,
      height: Math.min(editor.y + 480, view.height) - y,
    },
  });
}

test("the tab holds the outline, the toolbar and the editor, and an outline click selects the heading", async ({
  page,
  browserName,
}) => {
  // wide enough for the properties area to show the outline beside the whole editor
  await page.setViewportSize({ width: 1920, height: 1000 });
  const editor = await openMarkdown(page);
  const outline = page.locator('[data-testid="markdown-outline"]');
  await expect(outline).toBeVisible();
  await expect(editor.locator('[data-testid="richtext-kind"]')).toBeVisible();
  await tabShot(page, browserName, "markdown-tab");

  await expect(outline.getByText("The Markdown tab")).toBeVisible();
  await expect(outline.getByText("Quotes and code")).toBeVisible();

  // held to a height so the root has somewhere to scroll
  await editor.evaluate((el) => {
    (el as HTMLElement).style.height = "400px";
  });
  await outline.getByText("Quotes and code").click();

  const t = await texts(editor);
  const heading = t.findIndex((x) => x === "Quotes and code");
  await expect
    .poll(() => editor.evaluate((el) => (el as EditorProbe).selection()?.head.block))
    .toBe(await blocks(editor).then((b) => b[heading]));
  const scrollTop = await editor.evaluate((el) => (el as EditorProbe).root.scrollTop);
  expect(scrollTop).toBeGreaterThan(0);
  await pageShot(page, editor, browserName, "markdown-outline-click");
});

test("the Read-only toggle keeps the scroll position, Save downloads the source, and a wikilink lands in the status line", async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1920, height: 1000 });
  const editor = await openMarkdown(page);
  await editor.evaluate((el) => {
    (el as HTMLElement).style.height = "400px";
    (el as EditorProbe).root.scrollTop = 150;
  });
  const scrollTop = () => editor.evaluate((el) => (el as EditorProbe).root.scrollTop);
  const held = await scrollTop();
  expect(held).toBeGreaterThan(0);

  const toggle = page.locator('[data-testid="markdown-readonly"]');
  await pageShot(page, editor, browserName, "markdown-readonly-toggle-before");
  await toggle.click();
  await expect.poll(() => editor.evaluate((el) => (el as EditorProbe).readOnly)).toBe(true);
  expect(await scrollTop()).toBe(held);
  await pageShot(page, editor, browserName, "markdown-readonly-toggle-after");
  await toggle.click();
  await expect.poll(() => editor.evaluate((el) => (el as EditorProbe).readOnly)).toBe(false);
  expect(await scrollTop()).toBe(held);

  const download = page.waitForEvent("download");
  await page.locator('[data-testid="markdown-save"]').click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("document.md");
  const body = await file.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of body) {
    chunks.push(chunk as Buffer);
  }
  expect(Buffer.concat(chunks).toString("utf8")).toContain("# The Markdown tab");

  const status = page.locator('[data-testid="markdown-status"]');
  await editor.locator("a[data-link-kind='wiki']").first().scrollIntoViewIfNeeded();
  await editor.locator("a[data-link-kind='wiki']").first().click();
  await expect(status).toHaveText("Wikilink: Wiki page");
  await expect(page.getByTestId("richtext-link-popup")).toHaveCount(0);
});

test("a markdown property bound through the container edits its source and undoes with the app", async ({
  page,
}) => {
  await page.goto(PLAYWRIGHT_HOST);
  await page.getByTestId("tab-markdown").click();

  const field = page.locator('[data-testid="markdown-field"]');
  const editor = field.locator("[part=editor]");
  await expect(editor).toBeVisible();
  await expect
    .poll(() => texts(editor))
    .toEqual(["Notes", "A bound markdown field; its source is the property."]);
  expect(await editor.locator("h1").count()).toBe(1);

  const model = () =>
    page.evaluate(
      () =>
        (window as unknown as { _appstate: { viewctx: { data: { markdown: string } } } })._appstate
          .viewctx.data.markdown
    );
  await selectIn(editor, 1, 0);
  await page.keyboard.type("Edited: ");
  await expect
    .poll(model)
    .toBe("# Notes\n\nEdited: A *bound* markdown field; its source is the property.\n");

  await page.keyboard.press("Control+z");
  await expect
    .poll(model)
    .toBe("# Notes\n\nA *bound* markdown field; its source is the property.\n");
  await expect
    .poll(() => texts(editor))
    .toEqual(["Notes", "A bound markdown field; its source is the property."]);
});

// ---- stage 6: typing shortcuts, wikilink completion, HTML paste ----

const kindsOf = (editor: Locator) =>
  editor.evaluate((el) =>
    ((el as EditorProbe).session.doc as { blocks: { kind: string }[] }).blocks.map((b) => b.kind)
  );

test("a marker typed at the start of a paragraph changes its kind, and Ctrl+Z gives the paragraph back", async ({
  page,
}) => {
  const editor = await openMarkdown(page, "# Top\n\nfirst\n\nsecond\n\nthird\n\nfourth\n");
  await expect.poll(() => texts(editor)).toEqual(["Top", "first", "second", "third", "fourth"]);

  await selectIn(editor, 1, 0);
  await page.keyboard.type("## Hello ");
  await expect
    .poll(() => texts(editor))
    .toEqual(["Top", "Hello first", "second", "third", "fourth"]);
  expect(await kindsOf(editor)).toEqual([
    "heading",
    "heading",
    "paragraph",
    "paragraph",
    "paragraph",
  ]);
  expect(await editor.locator("h2").filter({ hasText: "Hello first" }).count()).toBe(1);

  await selectIn(editor, 2, 0);
  await page.keyboard.type("- ");
  await selectIn(editor, 3, 0);
  await page.keyboard.type("> ");
  await selectIn(editor, 4, 0);
  await page.keyboard.type("```");
  await expect
    .poll(() => kindsOf(editor))
    .toEqual(["heading", "heading", "listItem", "quote", "code"]);
  await expect
    .poll(() => texts(editor))
    .toEqual(["Top", "Hello first", "second", "third", "fourth"]);

  await page.keyboard.press("Control+z");
  await expect
    .poll(() => kindsOf(editor))
    .toEqual(["heading", "heading", "listItem", "quote", "paragraph"]);
  await expect
    .poll(() => texts(editor))
    .toEqual(["Top", "Hello first", "second", "third", "fourth"]);
});

test("typing [[ offers the headings and a pick lands a wikilink", async ({ page }) => {
  const editor = await openMarkdown(page, "# Top\n\n## Second\n\nsee \n");
  await expect.poll(() => texts(editor)).toEqual(["Top", "Second", "see"]);

  await selectIn(editor, 2, 3);
  await page.keyboard.type(" [[Se");
  const list = page.locator('[data-testid="markdown-wikilink-list"]');
  await expect(list).toBeVisible();
  await expect.poll(() => texts(editor)).toEqual(["Top", "Second", "see [[Se"]);

  await list.getByText("Second").click();
  await expect.poll(() => texts(editor)).toEqual(["Top", "Second", "see Second"]);
  await expect(list).toHaveCount(0);
  expect(await linksAt(editor, 2)).toEqual([{ target: "Second", from: 4, to: 10 }]);
  expect(await editor.locator("a[data-link-kind='wiki']").count()).toBe(1);

  await page.keyboard.press("Control+z");
  await expect.poll(() => texts(editor)).toEqual(["Top", "Second", "see [[Se"]);
});

test("pasted HTML becomes the blocks its elements make", async ({ page }) => {
  const editor = await openMarkdown(page, "before\n\nafter\n");
  await expect.poll(() => texts(editor)).toEqual(["before", "after"]);

  await selectIn(editor, 0, 6);
  await editor.evaluate((el) => {
    const data = new DataTransfer();
    data.setData(
      "text/html",
      "<html><body><!--StartFragment--><p>tail</p><h2>A heading</h2><ul><li>one</li><li><b>two</b></li></ul><!--EndFragment--></body></html>"
    );
    data.setData("text/plain", "tail\nA heading\none\ntwo");
    (el as EditorProbe).root.dispatchEvent(
      new InputEvent("beforeinput", {
        inputType   : "insertFromPaste",
        dataTransfer: data,
        cancelable  : true,
        bubbles     : true,
      })
    );
  });

  await expect
    .poll(() => texts(editor))
    .toEqual(["beforetail", "A heading", "one", "two", "after"]);
  expect(await kindsOf(editor)).toEqual([
    "paragraph",
    "heading",
    "listItem",
    "listItem",
    "paragraph",
  ]);
  expect(await editor.locator("strong").filter({ hasText: "two" }).count()).toBe(1);

  await page.keyboard.press("Control+z");
  await expect.poll(() => texts(editor)).toEqual(["before", "after"]);
});
