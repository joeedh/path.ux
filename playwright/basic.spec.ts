import { test, expect } from "@playwright/test";
import { PLAYWRIGHT_HOST, SCEENSHOTS } from "./location";

test("has title", async ({ page }) => {
  await page.goto(PLAYWRIGHT_HOST);

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle("Path.UX");
  await page.screenshot({ path: `${SCEENSHOTS}/start.png` });
});

test("click tabs", async ({ page }) => {
  await page.goto(PLAYWRIGHT_HOST);

  const tabs = ["tab", "graph-packing", "curve-mapping", "last-command", "theme"];
  for (const tab of tabs) {
    await page.getByTestId(`tab-${tab}`).click();
    await page.screenshot({ path: `${SCEENSHOTS}/tab-${tab}.png` });
  }
});

test("click menus", async ({ page }) => {
  await page.goto(PLAYWRIGHT_HOST);

  const menus = ["file", "edit", "session"];
  for (const menu of menus) {
    await page.getByTestId(`menu-${menu}`).click();
    await page.screenshot({ path: `${SCEENSHOTS}/menu-${menu}.png` });
  }
});
