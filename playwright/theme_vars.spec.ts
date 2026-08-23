import { test, expect } from "@playwright/test";
import { PLAYWRIGHT_HOST, SCEENSHOTS } from "./location";

/**
 * Opens a panel of the theme editor by its label and returns whether one was
 * found. Panel headers are drawn by path.ux rather than as plain DOM text, so
 * the panel is reached through the widget tree instead of a locator.
 */
async function openPanel(page: import("@playwright/test").Page, label: string) {
  return await page.evaluate((label) => {
    // every widget lives in a shadow root, so the search descends through them
    const walk = (root: Document | ShadowRoot, visit: (el: Element) => boolean): boolean => {
      for (const el of root.querySelectorAll("*")) {
        if (visit(el)) return true;
        if (el.shadowRoot && walk(el.shadowRoot, visit)) return true;
      }

      return false;
    };

    return walk(document, (el) => {
      const panel = el as Element & { closed?: boolean; flushUpdate?(): void };

      if (el.getAttribute("label") === label && typeof panel.closed === "boolean") {
        panel.closed = false;
        panel.flushUpdate?.();
        return true;
      }

      return false;
    });
  }, label);
}

/** The names the editor's own record holds, in the order the panel lists them. */
async function varNames(page: import("@playwright/test").Page) {
  return await page.evaluate(() => {
    const walk = (root: Document | ShadowRoot): string[] | undefined => {
      for (const el of root.querySelectorAll("*")) {
        const ed = el as Element & { getThemeVars?(): Record<string, unknown> };

        if (ed.getThemeVars) return Object.keys(ed.getThemeVars());

        const found = el.shadowRoot ? walk(el.shadowRoot) : undefined;
        if (found) return found;
      }

      return undefined;
    };

    return walk(document);
  });
}

test("the theme editor lists its variables", async ({ page }) => {
  await page.goto(PLAYWRIGHT_HOST);
  await page.getByTestId("tab-theme").click();

  expect(await openPanel(page, "Variables")).toBe(true);

  // the example theme authors four, and the panel shows a row for each
  expect(await varNames(page)).toEqual(["accent", "background", "radius", "bodyFont"]);

  await page.screenshot({ path: `${SCEENSHOTS}/theme-variables.png` });
});

test("a bound slot names the variable it follows", async ({ page }) => {
  await page.goto(PLAYWRIGHT_HOST);
  await page.getByTestId("tab-theme").click();

  expect(await openPanel(page, "base")).toBe(true);

  // BoxHighlight reads vars.accent, so its bind menu is titled after it
  await expect(page.locator('[name="= accent"]').first()).toBeVisible();

  await page.screenshot({ path: `${SCEENSHOTS}/theme-bound-slot.png` });
});
