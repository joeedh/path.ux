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

// The focus cursor starts at item 0, so scrolling past it puts it outside the pool's range. A
// cell taking focus retargets to the host, so the grid's tab-in recovery used to run on this
// click, scroll item 0 back into view, and take the cell out from under the pointer with it.
test("a click after scrolling selects rather than snapping back to the focused row", async ({
  page,
}) => {
  const grid = await openGallery(page);
  const cell = await cellTag(grid);

  await grid.evaluate((el) => {
    el.scrollTop = 1500;
  });
  await expect.poll(() => read(grid, "firstBoundIndex")).toBeGreaterThan(0);

  const scrollTop = await grid.evaluate((el) => el.scrollTop);

  // A cell fully inside the viewport, so Playwright's own scroll-into-view cannot move the grid.
  const inView = await grid.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const cells = [...el.shadowRoot!.querySelector("div")!.children] as HTMLElement[];
    const slot = cells.findIndex((c) => {
      const rect = c.getBoundingClientRect();
      return rect.top >= box.top && rect.bottom <= box.bottom;
    });
    return { slot, index: (cells[slot] as unknown as { index: number }).index };
  });

  await page.locator(cell).nth(inView.slot).click();

  expect(await grid.evaluate((el) => el.scrollTop)).toBe(scrollTop);
  expect(await read(grid, "focusIndex")).toBe(inView.index);
  expect(await events(page)).toEqual([`change:item-${inView.index}`]);
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
  const grid = await openGallery(page);

  await page.getByTestId("gallery-pick").click();

  // by cell tag rather than by canvas, since the mode toggle draws canvases of its own
  const popupCell = page.locator("body > *").last().locator(await cellTag(grid)).nth(2);
  await popupCell.dblclick();

  await expect.poll(() => events(page)).toContain("picked:item-2");

  await page.getByTestId("gallery-pick").click();
  await page.keyboard.press("Escape");

  await expect.poll(() => events(page)).toContain("picked:undefined");
});

test("the popup cancels on a press outside it, but not on the pointer leaving", async ({ page }) => {
  await openGallery(page);

  await page.getByTestId("gallery-pick").click();
  const popup = page.locator("body > *").last();
  await expect(popup).toBeVisible();

  await popup.screenshot({ path: `${SCEENSHOTS}/gallery-popup.png` });

  // Moving out is not dismissal: the author has to be able to read the rest of the page.
  const box = (await popup.boundingBox())!;
  await page.mouse.move(box.x + box.width + 80, box.y + box.height + 80);
  await page.waitForTimeout(200);
  await expect(popup).toBeVisible();

  await page.mouse.click(box.x + box.width + 80, box.y + box.height + 80);

  await expect.poll(() => events(page)).toContain("picked:undefined");
  await expect(popup).toBeHidden();
});

/** Presses and clicks that made it past the popup's own capture-phase handler. */
function pressesBelow(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { pressesBelow: number }).pressesBelow);
}

test("the press that dismisses the popup is consumed rather than passed through", async ({
  page,
}) => {
  await openGallery(page);

  // Counted on document, which the capture path reaches only after window.
  await page.evaluate(() => {
    const w = window as unknown as { pressesBelow: number };
    w.pressesBelow = 0;
    for (const type of ["mousedown", "mouseup", "click"]) {
      document.addEventListener(type, () => w.pressesBelow++, true);
    }
  });

  await page.getByTestId("gallery-pick").click();
  const popup = page.locator("body > *").last();
  const box = (await popup.boundingBox())!;
  const outside = { x: box.x + box.width + 80, y: box.y + box.height + 80 };

  await page.evaluate(() => ((window as unknown as { pressesBelow: number }).pressesBelow = 0));
  await page.mouse.click(outside.x, outside.y);

  await expect.poll(() => events(page)).toContain("picked:undefined");
  expect(await pressesBelow(page)).toBe(0);

  // and the same press with nothing open still reaches the page
  await page.mouse.click(outside.x, outside.y);
  expect(await pressesBelow(page)).toBeGreaterThan(0);
});

test("closeOnMouseOut tells a press outside from the pointer moving out", async ({ page }) => {
  await openGallery(page);

  for (const mode of ["click", "move", "click-move"] as const) {
    await page.getByTestId(`open-${mode}`).click();
    const popup = page.getByTestId(`popup-${mode}`);
    await expect(popup).toBeVisible();

    // the popup opens at 100,100, so this is well clear of it and still inside the viewport
    const away = { x: 700, y: 500 };

    // The handler throttles itself to one look every 350ms, so the gesture is repeated past it
    // rather than sent once. A real pointer produces a stream of these anyway.
    await page.mouse.move(away.x, away.y);
    await page.waitForTimeout(500);
    await page.mouse.move(away.x + 10, away.y + 10);

    if (mode === "click") {
      await page.waitForTimeout(500);
      await expect(popup).toBeVisible();
      await page.mouse.click(away.x + 10, away.y + 10);
    }

    await expect(popup).toBeHidden();
  }
});

/** How many times the demo's list renderer has been asked to build and to bind. */
function rowCalls(page: Page): Promise<{ create: number; bind: number }> {
  return page.evaluate(
    () => (window as unknown as { rowCalls: { create: number; bind: number } }).rowCalls
  );
}

test("list mode draws one column of rows from a pool sized to the viewport", async ({ page }) => {
  await openGallery(page);

  const rows = page.locator('[data-testid="gallery-rows"]');
  await expect(rows).toBeVisible();

  expect(await read(rows, "columns")).toBe(1);

  const pool = await read(rows, "poolSize");
  // a 300px-tall viewport of 64px rows holds five, and overscan adds four more
  expect(pool).toBeGreaterThan(5);
  expect(pool).toBeLessThan(200);

  // a row spans the viewport rather than taking the theme's grid cell width
  const rowWidth = await rows.evaluate(
    (el) => (el.shadowRoot!.querySelector("div")!.firstElementChild as HTMLElement).clientWidth
  );
  expect(rowWidth).toBeGreaterThan(300);

  await expect(rows.getByText("row-item-0")).toBeVisible();

  await page.screenshot({ path: `${SCEENSHOTS}/gallery-list.png` });
});

test("a row renderer builds once per pooled row and binds per item scrolled past", async ({
  page,
}) => {
  await openGallery(page);

  const rows = page.locator('[data-testid="gallery-rows"]');
  const pool = await read(rows, "poolSize");

  const before = await rowCalls(page);
  expect(before.create).toBe(pool);

  await rows.evaluate((el) => {
    el.scrollTop = 1500;
  });
  await expect.poll(() => read(rows, "firstBoundIndex")).toBeGreaterThan(0);

  const after = await rowCalls(page);
  // the pool was rebound rather than rebuilt, so nothing new was created
  expect(after.create).toBe(before.create);
  expect(after.bind).toBeGreaterThan(before.bind);
  expect(await read(rows, "poolSize")).toBe(pool);
});

test("the mode toggle switches the gallery's layout and keeps the selection", async ({ page }) => {
  const grid = await openGallery(page);
  const cell = await cellTag(grid);

  const gallery = page.locator('[data-testid="gallery"]');
  const mode = () => gallery.evaluate((el) => (el as unknown as { mode: string }).mode);
  const active = () =>
    gallery.evaluate((el) => (el as unknown as { active?: { id: string } }).active?.id);

  expect(await mode()).toBe("grid");

  await gallery.locator(cell).nth(3).click();
  const picked = await active();
  expect(picked).toBeDefined();

  // located by their tooltips, which every control in this library is required to carry
  const buttons = gallery.getByTitle(/^Show the assets as/);
  await expect(buttons).toHaveCount(2);

  await gallery.getByTitle("Show the assets as rows, with a name beside each thumbnail").click();
  expect(await mode()).toBe("list");
  expect(await active()).toBe(picked);

  await gallery.getByTitle("Show the assets as a grid of thumbnails").click();
  expect(await mode()).toBe("grid");

  const toggle = (await buttons.first().boundingBox())!;
  const rest = (await buttons.last().boundingBox())!;
  await page.screenshot({
    path: `${SCEENSHOTS}/gallery-mode-toggle.png`,
    clip: {
      x     : toggle.x - 6,
      y     : toggle.y - 6,
      width : rest.x + rest.width - toggle.x + 12,
      height: toggle.height + 12,
    },
    scale: "css",
  });
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
