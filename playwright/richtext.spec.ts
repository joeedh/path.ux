import { test, expect, type Locator, type Page } from "@playwright/test";
import { PLAYWRIGHT_HOST } from "./location";

interface Pos {
  block: string;
  offset: number;
}

interface Range {
  anchor: Pos;
  head: Pos;
}

/** The subset of `RichTextEditor` and its session the specs read back out of the page. */
interface EditorProbe extends HTMLElement {
  root: HTMLDivElement;
  session: {
    doc: unknown;
    provider: {
      blocks(doc: unknown): string[];
      blockText(doc: unknown, block: string): string;
      activeMarks(doc: unknown, range: Range): string[];
    };
    toolstack: {
      length: number;
      cur: number;
      protect(name: string, cb: () => Promise<void>): Promise<void>;
    };
  };
  select(range: Range): void;
  selection(): Range | undefined;
}

declare global {
  interface Window {
    __release?: () => void;
    __globalUndos?: number;
    _appstate: { toolstack: { undo(): Promise<void> } };
  }
}

const ORIGINAL = ["Hello, world.", "A second paragraph to edit.", ""];

async function openEditor(page: Page): Promise<Locator> {
  await page.goto(PLAYWRIGHT_HOST);
  await page.getByTestId("tab-richtext").click();

  const editor = page.locator('[data-testid="richtext-editor"]');
  await expect(editor).toBeVisible();
  await expect.poll(() => texts(editor)).toEqual(ORIGINAL);

  return editor;
}

function texts(editor: Locator): Promise<string[]> {
  return editor.evaluate((el) => {
    const { doc, provider } = (el as EditorProbe).session;
    return provider.blocks(doc).map((id) => provider.blockText(doc, id));
  });
}

function stackLength(editor: Locator): Promise<number> {
  return editor.evaluate((el) => (el as EditorProbe).session.toolstack.length);
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

test("typing lands in the document as one undo entry", async ({ page }) => {
  const editor = await openEditor(page);

  await selectIn(editor, 0, 13);
  await page.keyboard.type(" Typed here.");

  await expect
    .poll(() => texts(editor))
    .toEqual(["Hello, world. Typed here.", ORIGINAL[1], ORIGINAL[2]]);
  await expect(editor.locator("[data-doc-block]").first()).toHaveText("Hello, world. Typed here.");
  expect(await stackLength(editor)).toBe(1);
});

test("Enter splits a block and Backspace at its start joins it again", async ({ page }) => {
  const editor = await openEditor(page);

  await selectIn(editor, 0, 6);
  await page.keyboard.press("Enter");
  await expect.poll(() => texts(editor)).toEqual(["Hello,", " world.", ORIGINAL[1], ORIGINAL[2]]);

  await page.keyboard.press("Backspace");
  await expect.poll(() => texts(editor)).toEqual(ORIGINAL);
});

test("Ctrl+B toggles bold and the toolbar reflects it", async ({ page }) => {
  const editor = await openEditor(page);
  const bold = editor.locator('[data-testid="richtext-mark-bold"]');
  const checked = () => bold.evaluate((el) => (el as HTMLElement & { checked: boolean }).checked);

  await selectIn(editor, 0, 0, 5);
  expect(await checked()).toBeFalsy();

  await page.keyboard.press("Control+b");
  await expect(editor.locator("[data-doc-block] b").first()).toHaveText("Hello");
  await expect.poll(checked).toBe(true);

  await page.keyboard.press("Control+b");
  await expect(editor.locator("[data-doc-block] b")).toHaveCount(0);
  await expect.poll(checked).toBe(false);
});

test("the toolbar button toggles a mark over the selection", async ({ page }) => {
  const editor = await openEditor(page);

  await selectIn(editor, 0, 7, 12);
  await editor.locator('[data-testid="richtext-mark-italic"]').click();

  await expect(editor.locator("[data-doc-block] i").first()).toHaveText("world");
});

test("Ctrl+Z undoes the whole typing run and Ctrl+Y restores it", async ({ page }) => {
  const editor = await openEditor(page);

  await selectIn(editor, 0, 13);
  await page.keyboard.type("abc");
  await expect.poll(() => texts(editor)).toEqual(["Hello, world.abc", ORIGINAL[1], ORIGINAL[2]]);

  await page.keyboard.press("Control+z");
  await expect.poll(() => texts(editor)).toEqual(ORIGINAL);

  await page.keyboard.press("Control+y");
  await expect.poll(() => texts(editor)).toEqual(["Hello, world.abc", ORIGINAL[1], ORIGINAL[2]]);
});

test("moving the caret then typing starts a new run", async ({ page }) => {
  const editor = await openEditor(page);

  await selectIn(editor, 0, 13);
  await page.keyboard.type("ab");
  await expect.poll(() => texts(editor)).toEqual(["Hello, world.ab", ORIGINAL[1], ORIGINAL[2]]);

  await selectIn(editor, 0, 0);
  await page.keyboard.type("XY");
  await expect.poll(() => texts(editor)).toEqual(["XYHello, world.ab", ORIGINAL[1], ORIGINAL[2]]);
  expect(await stackLength(editor)).toBe(2);

  await page.keyboard.press("Control+z");
  await expect.poll(() => texts(editor)).toEqual(["Hello, world.ab", ORIGINAL[1], ORIGINAL[2]]);
});

test("characters typed while the toolstack is held land in order", async ({ page }) => {
  const editor = await openEditor(page);

  await selectIn(editor, 0, 13);
  await editor.evaluate((el) => {
    void (el as EditorProbe).session.toolstack.protect(
      "hold",
      () =>
        new Promise<void>((resolve) => {
          window.__release = resolve;
        })
    );
  });

  await page.keyboard.type("0123456789");
  expect(await texts(editor)).toEqual(ORIGINAL);

  await page.evaluate(() => window.__release?.());
  await expect
    .poll(() => texts(editor))
    .toEqual(["Hello, world.0123456789", ORIGINAL[1], ORIGINAL[2]]);
  expect(await stackLength(editor)).toBe(1);
});

test.describe("delete types with no target range", () => {
  const cases: { type: string; index: number; offset: number; expected: string[] }[] = [
    {
      type    : "deleteContentBackward",
      index   : 0,
      offset  : 6,
      expected: ["Hello world.", ORIGINAL[1], ""],
    },
    {
      type    : "deleteContentForward",
      index   : 0,
      offset  : 6,
      expected: ["Hello,world.", ORIGINAL[1], ""],
    },
    { type: "deleteWordBackward", index: 0, offset: 7, expected: ["world.", ORIGINAL[1], ""] },
    { type: "deleteWordForward", index: 0, offset: 6, expected: ["Hello,.", ORIGINAL[1], ""] },
    {
      type    : "deleteSoftLineBackward",
      index   : 0,
      offset  : 6,
      expected: ["Hello world.", ORIGINAL[1], ""],
    },
    {
      type    : "deleteSoftLineForward",
      index   : 0,
      offset  : 6,
      expected: ["Hello,world.", ORIGINAL[1], ""],
    },
    { type: "deleteByCut", index: 0, offset: 6, expected: ORIGINAL },
    {
      type    : "deleteContentBackward",
      index   : 1,
      offset  : 0,
      expected: ["Hello, world.A second paragraph to edit.", ""],
    },
    {
      type    : "deleteContentForward",
      index   : 0,
      offset  : 13,
      expected: ["Hello, world.A second paragraph to edit.", ""],
    },
  ];

  for (const c of cases) {
    test(`${c.type} at block ${c.index} offset ${c.offset}`, async ({ page }) => {
      const editor = await openEditor(page);

      await selectIn(editor, c.index, c.offset);
      await editor.evaluate((el, type) => {
        InputEvent.prototype.getTargetRanges = () => [];
        (el as EditorProbe).root.dispatchEvent(
          new InputEvent("beforeinput", { inputType: type, cancelable: true, bubbles: true })
        );
      }, c.type);

      await expect.poll(() => texts(editor)).toEqual(c.expected);
    });
  }
});

test("copy takes the selection to the clipboard and paste puts it in another block", async ({
  page,
}) => {
  const editor = await openEditor(page);

  await selectIn(editor, 0, 0, 5);
  await page.keyboard.press("Control+c");
  await expect.poll(() => texts(editor)).toEqual(ORIGINAL);

  await selectIn(editor, 1, 0);
  await page.keyboard.press("Control+v");
  await expect
    .poll(() => texts(editor))
    .toEqual([ORIGINAL[0], "HelloA second paragraph to edit.", ORIGINAL[2]]);
  expect(await stackLength(editor)).toBe(1);
});

test("cut is one undo entry of its own", async ({ page }) => {
  const editor = await openEditor(page);

  await selectIn(editor, 1, 0, 8);
  await page.keyboard.press("Control+x");
  await expect.poll(() => texts(editor)).toEqual([ORIGINAL[0], " paragraph to edit.", ORIGINAL[2]]);
  expect(await stackLength(editor)).toBe(1);

  await page.keyboard.type("Q");
  await expect
    .poll(() => texts(editor))
    .toEqual([ORIGINAL[0], "Q paragraph to edit.", ORIGINAL[2]]);
  expect(await stackLength(editor)).toBe(2);

  await page.keyboard.press("Control+z");
  await expect.poll(() => texts(editor)).toEqual([ORIGINAL[0], " paragraph to edit.", ORIGINAL[2]]);
  await page.keyboard.press("Control+z");
  await expect.poll(() => texts(editor)).toEqual(ORIGINAL);

  await selectIn(editor, 1, 12);
  await page.keyboard.press("Control+v");
  await expect
    .poll(() => texts(editor))
    .toEqual([ORIGINAL[0], "A second parA secondagraph to edit.", ORIGINAL[2]]);
});

test("pasting three lines makes three blocks with the pre-allocated ids", async ({ page }) => {
  const editor = await openEditor(page);

  await selectIn(editor, 0, 6);
  await editor.evaluate((el) => {
    const data = new DataTransfer();
    data.setData("text/plain", ["one", "two", "three"].join(String.fromCharCode(10)));
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
    .toEqual(["Hello,one", "two", "three world.", ORIGINAL[1], ORIGINAL[2]]);

  const ids = await editor.evaluate((el) => {
    const probe = el as EditorProbe & { session: { toolstack: { op: { newBlocks: string[] } }[] } };
    return {
      created: probe.session.toolstack[0].op.newBlocks,
      blocks : probe.session.provider.blocks(probe.session.doc),
    };
  });
  expect(ids.created).toEqual(ids.blocks.slice(1, 3));
  await expect(editor.locator("[data-doc-block]")).toHaveCount(5);
});

test("the toolbar hides under no-toolbar and toggleMark still works", async ({ page }) => {
  const editor = await openEditor(page);
  const bold = editor.locator('[data-testid="richtext-mark-bold"]');
  await expect(bold).toBeVisible();

  await editor.evaluate((el) => el.setAttribute("no-toolbar", ""));
  await expect(bold).toBeHidden();

  await selectIn(editor, 0, 0, 5);
  await editor.evaluate((el) =>
    (el as EditorProbe & { toggleMark(m: string): void }).toggleMark("bold")
  );
  await expect(editor.locator("[data-doc-block] b").first()).toHaveText("Hello");

  await editor.evaluate((el) => el.removeAttribute("no-toolbar"));
  await expect(bold).toBeVisible();
});

test("Ctrl+Z with the pointer over the tab bar undoes the document, not the app", async ({
  page,
}) => {
  const editor = await openEditor(page);

  await page.evaluate(() => {
    const stack = window._appstate.toolstack;
    const undo = stack.undo.bind(stack);
    window.__globalUndos = 0;
    stack.undo = () => {
      window.__globalUndos = (window.__globalUndos ?? 0) + 1;
      return undo();
    };
  });

  await selectIn(editor, 0, 13);
  await page.keyboard.type("abc");
  await expect.poll(() => texts(editor)).toEqual(["Hello, world.abc", ORIGINAL[1], ORIGINAL[2]]);

  await page.getByTestId("tab-theme").hover();
  await page.keyboard.press("Control+z");

  await expect.poll(() => texts(editor)).toEqual(ORIGINAL);
  expect(await page.evaluate(() => window.__globalUndos)).toBe(0);
});
