import { test, expect, type Locator, type Page } from "@playwright/test";
import { PLAYWRIGHT_HOST } from "../location";
import {
  compose,
  describeEvents,
  installRecorder,
  pressKey,
  setComposition,
  takeEvents,
} from "./composition";

/*
 * Ground truth for the composition refusal path and for the IME plan, observed on Chromium
 * through CDP. Chromium never sends an `insertText` for the commit and never sends
 * `deleteCompositionText`:
 *
 * Two-step Japanese composition (か, かん) committed as 漢:
 *   compositionstart "" text="abc"
 *   compositionupdate "か"
 *   beforeinput insertCompositionText "か" composing not cancelable
 *   input insertCompositionText "か" composing not cancelable text="abcか"
 *   compositionupdate "かん"
 *   beforeinput insertCompositionText "かん" composing not cancelable
 *   input insertCompositionText "かん" composing not cancelable text="abcかん"
 *   compositionupdate "漢"
 *   beforeinput insertCompositionText "漢" composing not cancelable
 *   input insertCompositionText "漢" composing not cancelable text="abc漢"
 *   compositionend "漢" text="abc漢"
 *
 * Dead key (´) committed as é: the same shape with one update, the commit arriving as a
 * final insertCompositionText "é" before compositionend "é". This is synthetic: CDP sets the
 * composition text itself, so it says nothing about whether a real Windows dead key composes.
 *
 * Abandoned after か (empty composition text):
 *   compositionstart "" text="abc"
 *   compositionupdate "か"
 *   beforeinput insertCompositionText "か" composing not cancelable
 *   input insertCompositionText "か" composing not cancelable text="abcか"
 *   compositionupdate ""
 *   beforeinput insertCompositionText "" composing not cancelable
 *   input insertCompositionText null composing not cancelable text="abc"
 *   compositionend "" text="abc"
 *
 * So the commit is the last insertCompositionText, compositionend's data repeats it, the DOM
 * holds the committed text at compositionend, an abandonment is an insertCompositionText with
 * empty data whose input event carries null, and the abandoned text is gone from the DOM by
 * compositionend.
 *
 * The Korean shape (ㅎ, 하, 한 committed as 하, then ㄴ, 나 committed as 나), also synthetic: a
 * commit whose text differs from the last update is one more update plus insertCompositionText
 * carrying the committed text, and the next composition begins with its own compositionstart
 * after compositionend. Nothing re-opens composition over committed text; the IME on a real
 * keyboard is what decides that, and the tasklist's stage 5 note records what Firefox did.
 *
 * Escape while a synthetic composition is open does nothing on a bare div: the keydown fires
 * with isComposing and the composition stays open, since no IME is there to cancel it. The
 * editor ignores a keydown with isComposing, so the composition stays open there too; a real
 * IME's Escape ends the composition through compositionend, which the recordings in the
 * tasklist's stage 5 note cover.
 */

const KANJI = String.fromCharCode(0x6f22);
const KA = String.fromCharCode(0x304b);
const KAN = KA + String.fromCharCode(0x3093);
const ACUTE = String.fromCharCode(0xb4);
const E_ACUTE = String.fromCharCode(0xe9);
const HIEUT = String.fromCharCode(0x314e);
const HA = String.fromCharCode(0xd558);
const HAN = String.fromCharCode(0xd55c);
const NIEUN = String.fromCharCode(0x3134);
const NA = String.fromCharCode(0xb098);
const CARET_SLOT = String.fromCharCode(0x200b);

const NOT_CANCELABLE = "composing not cancelable";

/** The text of a target whose `base` text has `composed` inserted at `at`. */
const textWith = (base: string, at: number, composed: string) =>
  JSON.stringify(base.slice(0, at) + composed + base.slice(at));

/**
 * The sequence one composition produces on a target showing `base` with the caret at `at`,
 * given its updates and what it ends with.
 */
function expectedSequence(
  updates: readonly string[],
  end: string,
  base: string,
  at: number
): string[] {
  const lines = [`compositionstart "" text=${JSON.stringify(base)}`];
  for (const text of updates) {
    const data = JSON.stringify(text);
    lines.push(
      `compositionupdate ${data}`,
      `beforeinput insertCompositionText ${data} ${NOT_CANCELABLE}`,
      `input insertCompositionText ${text === "" ? "null" : data} ${NOT_CANCELABLE} text=${textWith(base, at, text)}`
    );
  }
  lines.push(`compositionend ${JSON.stringify(end)} text=${textWith(base, at, end)}`);

  return lines;
}

const scenarios = [
  { name: "a two-step Japanese composition", steps: [KA, KAN], commit: KANJI },
  { name: "a one-step dead-key composition", steps: [ACUTE], commit: E_ACUTE },
  { name: "an abandoned composition", steps: [KA], commit: undefined },
];

const updatesOf = (steps: readonly string[], commit: string | undefined) => [
  ...steps,
  commit ?? "",
];

/** The Korean shape: a commit that recomposes the last update, then a second composition. */
async function composeKorean(page: Page): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await compose(cdp, [HIEUT, HA, HAN], HA);
  await compose(cdp, [NIEUN, NA], NA);
}

/** Opens a composition of か, then presses Escape through CDP. */
async function escapeMidComposition(page: Page): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await setComposition(cdp, KA);
  await pressKey(cdp, "Escape", "Escape", 27);
}

test.describe("a bare contenteditable div", () => {
  async function openDiv(page: Page): Promise<Locator> {
    await page.setContent('<div id="ed" contenteditable="true">abc</div>');
    const div = page.locator("#ed");
    await div.evaluate((el) => {
      el.focus();
      const text = el.firstChild as Text;
      document.getSelection()?.setBaseAndExtent(text, 3, text, 3);
    });
    await installRecorder(div);

    return div;
  }

  for (const { name, steps, commit } of scenarios) {
    test(name, async ({ page }) => {
      const div = await openDiv(page);

      const cdp = await page.context().newCDPSession(page);
      await compose(cdp, steps, commit);

      await expect(div).toHaveText("abc" + (commit ?? ""));
      expect(describeEvents(await takeEvents(page))).toEqual(
        expectedSequence(updatesOf(steps, commit), commit ?? "", "abc", 3)
      );
    });
  }

  test("the Korean shape is two compositions back to back", async ({ page }) => {
    const div = await openDiv(page);
    await composeKorean(page);

    await expect(div).toHaveText("abc" + HA + NA);
    expect(describeEvents(await takeEvents(page))).toEqual([
      ...expectedSequence([HIEUT, HA, HAN, HA], HA, "abc", 3),
      ...expectedSequence([NIEUN, NA, NA], NA, "abc" + HA, 4),
    ]);
  });

  test("Escape leaves a synthetic composition open", async ({ page }) => {
    const div = await openDiv(page);
    await escapeMidComposition(page);

    await expect(div).toHaveText("abc" + KA);
    expect(describeEvents(await takeEvents(page))).toEqual([
      ...expectedSequence([KA], "", "abc", 3).slice(0, -1),
      "keydown Escape composing",
    ]);
  });
});

interface Pos {
  block: string;
  offset: number;
}

interface EditorProbe extends HTMLElement {
  session: {
    doc: unknown;
    provider: { blocks(doc: unknown): string[]; blockText(doc: unknown, block: string): string };
  };
  select(range: { anchor: Pos; head: Pos }): void;
  selection(): { anchor: Pos; head: Pos } | undefined;
}

declare global {
  interface Window {
    __refused?: string[];
  }
}

const ORIGINAL = ["Hello, world.", "A second paragraph to edit.", ""];
// the editable root's text: every block's text in order, an empty block being one caret slot
const ROOT_TEXT = ORIGINAL.map((t) => (t === "" ? CARET_SLOT : t)).join("");
const CARET = 6;

async function openEditor(page: Page): Promise<Locator> {
  await page.goto(PLAYWRIGHT_HOST);
  await page.getByTestId("tab-richtext").click();

  const editor = page.locator('[data-testid="richtext-editor"]');
  await expect(editor).toBeVisible();

  return editor;
}

const texts = (editor: Locator) =>
  editor.evaluate((el) => {
    const { doc, provider } = (el as EditorProbe).session;
    return provider.blocks(doc).map((id) => provider.blockText(doc, id));
  });

/** Places the caret at `CARET` in the first block and starts recording refusals and events. */
async function prepare(page: Page, editor: Locator) {
  const before = await editor.evaluate((el, offset) => {
    const probe = el as EditorProbe;
    const block = probe.session.provider.blocks(probe.session.doc)[0];
    probe.select({ anchor: { block, offset }, head: { block, offset } });
    window.__refused = [];
    probe.addEventListener("refused", (e) => {
      window.__refused?.push((e as CustomEvent<{ inputType: string }>).detail.inputType);
    });

    return probe.selection();
  }, CARET);
  await installRecorder(editor.locator(".rich-text-root"));

  return before;
}

const refusals = (page: Page) => page.evaluate(() => window.__refused);
const stackLength = (editor: Locator) =>
  editor.evaluate(
    (el) =>
      (el as EditorProbe & { session: { toolstack: { length: number } } }).session.toolstack.length
  );

/** Selects a range in the first block. */
function selectIn(editor: Locator, offset: number, to = offset): Promise<void> {
  return editor.evaluate(
    (el, [offset, to]) => {
      const probe = el as EditorProbe;
      const block = probe.session.provider.blocks(probe.session.doc)[0];
      probe.select({ anchor: { block, offset }, head: { block, offset: to } });
    },
    [offset, to]
  );
}

test.describe("rich-text-x", () => {
  test("a Japanese commit lands in the document as one undo entry, no refusal", async ({
    page,
  }) => {
    const editor = await openEditor(page);
    await prepare(page, editor);
    const before = await stackLength(editor);

    const cdp = await page.context().newCDPSession(page);
    await compose(cdp, [KA, KAN], KANJI);

    await expect
      .poll(() => texts(editor))
      .toEqual([`Hello,${KANJI} world.`, ORIGINAL[1], ORIGINAL[2]]);
    // the caret sits after the committed character
    const caret = await editor.evaluate((el) => (el as EditorProbe).selection());
    expect(caret?.head.offset).toBe(7);
    expect(caret?.anchor.offset).toBe(7);
    expect(await stackLength(editor)).toBe(before + 1);
    expect(await refusals(page)).toEqual([]);
  });

  test("a dead-key commit lands, no refusal", async ({ page }) => {
    const editor = await openEditor(page);
    await prepare(page, editor);

    const cdp = await page.context().newCDPSession(page);
    await compose(cdp, [ACUTE], E_ACUTE);

    await expect
      .poll(() => texts(editor))
      .toEqual([`Hello,${E_ACUTE} world.`, ORIGINAL[1], ORIGINAL[2]]);
    expect(await refusals(page)).toEqual([]);
  });

  test("an abandoned composition leaves the document unchanged, no refusal", async ({ page }) => {
    const editor = await openEditor(page);
    const before = await prepare(page, editor);
    const stack = await stackLength(editor);

    const cdp = await page.context().newCDPSession(page);
    await compose(cdp, [KA], undefined);

    await expect.poll(() => texts(editor)).toEqual(ORIGINAL);
    expect(await editor.evaluate((el) => (el as EditorProbe).selection())).toEqual(before);
    expect(await stackLength(editor)).toBe(stack);
    expect(await refusals(page)).toEqual([]);
  });

  test("composing inside a bold run extends the bold", async ({ page }) => {
    const editor = await openEditor(page);
    await prepare(page, editor);

    await selectIn(editor, 0, 5);
    await page.keyboard.press("Control+b");
    await expect(editor.locator("[data-doc-block] b").first()).toHaveText("Hello");

    await selectIn(editor, 3);
    const cdp = await page.context().newCDPSession(page);
    await compose(cdp, [KA], KANJI);

    await expect(editor.locator("[data-doc-block] b").first()).toHaveText(`Hel${KANJI}lo`);
  });

  test("composing over a selection replaces it", async ({ page }) => {
    const editor = await openEditor(page);
    await prepare(page, editor);

    await selectIn(editor, 0, 5);
    const cdp = await page.context().newCDPSession(page);
    await compose(cdp, [KA], KANJI);

    await expect.poll(() => texts(editor)).toEqual([`${KANJI}, world.`, ORIGINAL[1], ORIGINAL[2]]);
  });

  test("typing then a composed accent is one undo entry", async ({ page }) => {
    const editor = await openEditor(page);
    await prepare(page, editor);
    const before = await stackLength(editor);

    await selectIn(editor, 13);
    await page.keyboard.type("caf");
    const cdp = await page.context().newCDPSession(page);
    await compose(cdp, [ACUTE], E_ACUTE);

    await expect
      .poll(() => texts(editor))
      .toEqual([`Hello, world.caf${E_ACUTE}`, ORIGINAL[1], ORIGINAL[2]]);
    expect(await stackLength(editor)).toBe(before + 1);

    await page.keyboard.press("Control+z");
    await expect.poll(() => texts(editor)).toEqual(ORIGINAL);
  });

  test("a composition while the toolstack is held lands after a pending keystroke", async ({
    page,
  }) => {
    const editor = await openEditor(page);
    await prepare(page, editor);

    await selectIn(editor, 13);
    await editor.evaluate((el) => {
      void (
        el as EditorProbe & {
          session: { toolstack: { protect(n: string, cb: () => Promise<void>): Promise<void> } };
        }
      ).session.toolstack.protect(
        "hold",
        () =>
          new Promise<void>((resolve) => {
            (window as unknown as { __release?: () => void }).__release = resolve;
          })
      );
    });

    await page.keyboard.type("X");
    const cdp = await page.context().newCDPSession(page);
    await compose(cdp, [ACUTE], E_ACUTE);

    // both are held behind the protect; releasing runs them in order
    expect(await texts(editor)).toEqual(ORIGINAL);
    await page.evaluate(() => (window as unknown as { __release?: () => void }).__release?.());

    await expect
      .poll(() => texts(editor))
      .toEqual([`Hello, world.X${E_ACUTE}`, ORIGINAL[1], ORIGINAL[2]]);
    expect(await refusals(page)).toEqual([]);
  });

  test("two compositions back to back both land, the Korean shape", async ({ page }) => {
    const editor = await openEditor(page);
    await prepare(page, editor);

    await composeKorean(page);

    await expect
      .poll(() => texts(editor))
      .toEqual([`Hello,${HA}${NA} world.`, ORIGINAL[1], ORIGINAL[2]]);
    expect(await refusals(page)).toEqual([]);
  });

  test("a second editor over the same session shows the commit", async ({ page }) => {
    const editor = await openEditor(page);
    await prepare(page, editor);
    const second = page.locator('[data-testid="richtext-editor-2"]');

    const cdp = await page.context().newCDPSession(page);
    await compose(cdp, [KA, KAN], KANJI);

    await expect(second.locator("[data-doc-block]").first()).toHaveText(`Hello,${KANJI} world.`);
  });
});
