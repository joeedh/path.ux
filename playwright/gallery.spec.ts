import { test, expect, type Locator, type Page } from "@playwright/test";
import { PLAYWRIGHT_HOST, SCEENSHOTS } from "./location";

/** The subset of `AssetGalleryGrid` the specs read back out of the page. */
interface GridProbe extends HTMLElement {
  itemCount: number;
  poolSize: number;
  columns: number;
  focusIndex: number;
  firstBoundIndex: number;
  setFocusIndex(index: number): void;
}

async function openGallery(page: Page): Promise<Locator> {
  await page.goto(PLAYWRIGHT_HOST);
  await page.getByTestId("tab-gallery").click();

  const grid = page.locator('[data-testid="gallery-grid"]');
  await expect(grid).toBeVisible();
  return grid;
}

/** One property off the grid, read in the page so the custom element's getters run there. */
function read<K extends keyof GridProbe>(grid: Locator, key: K): Promise<GridProbe[K]> {
  return grid.evaluate((el, k) => (el as GridProbe)[k as K], key) as Promise<GridProbe[K]>;
}

test("the grid draws two hundred items from a pool sized to the viewport", async ({ page }) => {
  const grid = await openGallery(page);

  expect(await read(grid, "itemCount")).toBe(200);

  const pool = await read(grid, "poolSize");
  const columns = await read(grid, "columns");

  expect(columns).toBeGreaterThan(1);
  // a 300px-tall viewport of 96px cells holds four rows; overscan adds four more
  expect(pool).toBeGreaterThan(columns);
  expect(pool).toBeLessThan(200);

  await page.screenshot({ path: `${SCEENSHOTS}/gallery-grid.png` });
});

test("scrolling rebinds the pool instead of growing it", async ({ page }) => {
  const grid = await openGallery(page);

  const poolBefore = await read(grid, "poolSize");
  expect(await read(grid, "firstBoundIndex")).toBe(0);

  await grid.evaluate((el) => {
    el.scrollTop = 1500;
  });

  await expect.poll(() => read(grid, "firstBoundIndex")).toBeGreaterThan(0);
  expect(await read(grid, "poolSize")).toBe(poolBefore);
});

test("arrow keys move the focus cursor and clamp at the grid edges", async ({ page }) => {
  const grid = await openGallery(page);

  const columns = await read(grid, "columns");
  await grid.evaluate((el) => (el as GridProbe).setFocusIndex(0));

  await page.keyboard.press("ArrowRight");
  expect(await read(grid, "focusIndex")).toBe(1);

  await page.keyboard.press("ArrowDown");
  expect(await read(grid, "focusIndex")).toBe(1 + columns);

  await page.keyboard.press("Home");
  expect(await read(grid, "focusIndex")).toBe(0);

  // clamped rather than wrapped, so the cursor stays put at the first cell
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowUp");
  expect(await read(grid, "focusIndex")).toBe(0);

  await page.keyboard.press("End");
  expect(await read(grid, "focusIndex")).toBe(199);

  // End scrolled the last row into view, which means the pool was rebound around it
  expect(await read(grid, "firstBoundIndex")).toBeGreaterThan(0);
});

/** Everything the demo page recorded from the grid's `"change"` and `"confirm"` events. */
function events(page: Page): Promise<string[]> {
  return page.evaluate(
    () => (window as unknown as { galleryEvents?: string[] }).galleryEvents ?? []
  );
}

/**
 * The tag name pool cells actually carry. path.ux prefixes the tags of its built-in elements at
 * registration time, so `assetthumb-x` is not what ends up in the DOM.
 */
async function cellTag(grid: Locator): Promise<string> {
  return grid.evaluate((el) => {
    const cell = el.shadowRoot!.querySelector("div")!.firstElementChild!;
    return cell.tagName.toLowerCase();
  });
}

test("a click selects, and Enter or a double-click confirms", async ({ page }) => {
  const grid = await openGallery(page);
  const cell = await cellTag(grid);

  await page.locator(cell).nth(1).click();
  expect(await events(page)).toEqual(["change:item-1"]);

  await page.locator(cell).nth(2).dblclick();
  expect(await events(page)).toEqual(["change:item-1", "change:item-2", "confirm:item-2"]);

  await grid.evaluate((el) => (el as GridProbe).setFocusIndex(5));
  await page.keyboard.press("Enter");
  expect(await events(page)).toEqual([
    "change:item-1",
    "change:item-2",
    "confirm:item-2",
    "change:item-5",
    "confirm:item-5",
  ]);
});

test("the search box filters the grid by label and by tag", async ({ page }) => {
  await openGallery(page);

  const gallery = page.locator('[data-testid="gallery"]');
  const count = () =>
    gallery.evaluate((el) => {
      const nodes = [...el.shadowRoot!.querySelectorAll("*")];
      const grid = nodes.find((n) => "itemCount" in n) as GridProbe | undefined;
      return grid?.itemCount ?? -1;
    });

  const setQuery = (query: string) =>
    gallery.evaluate((el, q) => (el as unknown as { setQuery(s: string): void }).setQuery(q), query);

  expect(await count()).toBe(200);

  // "item-7" also matches item-70 through item-79
  await setQuery("item-7");
  expect(await count()).toBe(11);

  // every second item carries the "odd" tag
  await setQuery("odd");
  expect(await count()).toBe(100);

  await setQuery("");
  expect(await count()).toBe(200);
});

test("the popup resolves with the confirmed item and with nothing on cancel", async ({ page }) => {
  await openGallery(page);

  await page.getByTestId("gallery-pick").click();

  const popupCell = page.locator("body > *").last().locator("canvas").nth(2);
  await popupCell.dblclick();

  await expect.poll(() => events(page)).toContain("picked:item-2");

  await page.getByTestId("gallery-pick").click();
  await page.keyboard.press("Escape");

  await expect.poll(() => events(page)).toContain("picked:undefined");
});

test("narrowing the viewport re-columns the grid and resizes the pool", async ({ page }) => {
  const grid = await openGallery(page);

  const columnsBefore = await read(grid, "columns");

  await grid.evaluate((el) => {
    el.style.width = "140px";
  });

  await expect.poll(() => read(grid, "columns")).toBeLessThan(columnsBefore);
  expect(await read(grid, "poolSize")).toBeGreaterThan(0);
});
