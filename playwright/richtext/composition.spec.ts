import { test, expect, type Locator, type Page } from "@playwright/test";
import { PLAYWRIGHT_HOST } from "../location";
import { compose, describeEvents, installRecorder, takeEvents } from "./composition";

/*
 * Ground truth for the composition refusal path and for the IME plan, observed on Chromium
 * through CDP. Chromium never sends an `insertText` for the commit and never sends
 * `deleteCompositionText`:
 *
 * Two-step Japanese composition (か, かん) committed as 漢:
 *   compositionstart ""
 *   compositionupdate "か"
 *   beforeinput insertCompositionText "か" composing not cancelable
 *   input insertCompositionText "か" composing not cancelable
 *   compositionupdate "かん"
 *   beforeinput insertCompositionText "かん" composing not cancelable
 *   input insertCompositionText "かん" composing not cancelable
 *   compositionupdate "漢"
 *   beforeinput insertCompositionText "漢" composing not cancelable
 *   input insertCompositionText "漢" composing not cancelable
 *   compositionend "漢"
 *
 * Dead key (´) committed as é: the same shape with one update, the commit arriving as a
 * final insertCompositionText "é" before compositionend "é".
 *
 * Abandoned after か (empty composition text):
 *   compositionstart ""
 *   compositionupdate "か"
 *   beforeinput insertCompositionText "か" composing not cancelable
 *   input insertCompositionText "か" composing not cancelable
 *   compositionupdate ""
 *   beforeinput insertCompositionText "" composing not cancelable
 *   input insertCompositionText null composing not cancelable
 *   compositionend ""
 *
 * So the commit is the last insertCompositionText, compositionend's data repeats it, and an
 * abandonment is an insertCompositionText with empty data whose input event carries null.
 */

const KANJI = String.fromCharCode(0x6f22);
const KA = String.fromCharCode(0x304b);
const KAN = KA + String.fromCharCode(0x3093);
const ACUTE = String.fromCharCode(0xb4);
const E_ACUTE = String.fromCharCode(0xe9);

const NOT_CANCELABLE = "composing not cancelable";

/** The sequence one composition produces, given its updates and what it ends with. */
function expectedSequence(updates: readonly string[], end: string): string[] {
  const lines = ['compositionstart ""'];
  for (const text of updates) {
    const data = JSON.stringify(text);
    lines.push(
      `compositionupdate ${data}`,
      `beforeinput insertCompositionText ${data} ${NOT_CANCELABLE}`,
      `input insertCompositionText ${text === "" ? "null" : data} ${NOT_CANCELABLE}`
    );
  }
  lines.push(`compositionend ${JSON.stringify(end)}`);

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

test.describe("a bare contenteditable div", () => {
  for (const { name, steps, commit } of scenarios) {
    test(name, async ({ page }) => {
      await page.setContent('<div id="ed" contenteditable="true">abc</div>');
      const div = page.locator("#ed");
      await div.evaluate((el) => {
        el.focus();
        const text = el.firstChild as Text;
        document.getSelection()?.setBaseAndExtent(text, 3, text, 3);
      });
      await installRecorder(div);

      const cdp = await page.context().newCDPSession(page);
      await compose(cdp, steps, commit);

      await expect(div).toHaveText("abc" + (commit ?? ""));
      expect(describeEvents(await takeEvents(page))).toEqual(
        expectedSequence(updatesOf(steps, commit), commit ?? "")
      );
    });
  }
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

test.describe("rich-text-x", () => {
  for (const { name, steps, commit } of scenarios) {
    test(`${name} is refused and leaves the document and caret alone`, async ({ page }) => {
      const editor = await openEditor(page);

      const before = await editor.evaluate((el) => {
        const probe = el as EditorProbe;
        const block = probe.session.provider.blocks(probe.session.doc)[0];
        probe.select({ anchor: { block, offset: 6 }, head: { block, offset: 6 } });
        window.__refused = [];
        probe.addEventListener("refused", (e) => {
          window.__refused?.push((e as CustomEvent<{ inputType: string }>).detail.inputType);
        });

        return probe.selection();
      });
      await installRecorder(editor.locator(".rich-text-root"));

      const cdp = await page.context().newCDPSession(page);
      await compose(cdp, steps, commit);

      // the browser edits the DOM regardless, and the same sequence fires as on a bare div
      expect(describeEvents(await takeEvents(page))).toEqual(
        expectedSequence(updatesOf(steps, commit), commit ?? "")
      );

      await expect(editor.locator("[data-doc-block]").first()).toHaveText(ORIGINAL[0]);
      expect(await texts(editor)).toEqual(ORIGINAL);
      expect(await editor.evaluate((el) => (el as EditorProbe).selection())).toEqual(before);
      expect(await page.evaluate(() => window.__refused)).toEqual(["insertCompositionText"]);
    });
  }
});
