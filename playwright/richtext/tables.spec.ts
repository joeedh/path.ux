import { expect, test } from "@playwright/test";
import { build } from "esbuild";
import type {} from "./tables_fixture";

let bundle: string;
test.beforeAll(async () => {
  const result = await build({
    entryPoints: ["playwright/richtext/tables_fixture.ts"],
    bundle     : true,
    write      : false,
    target     : "es2022",
    format     : "esm",
    external   : ["fs", "path", "electron"],
  });
  bundle = result.outputFiles[0].text;
});
test.beforeEach(async ({ page }) => {
  await page.route("**/tables.js", (route) =>
    route.fulfill({ contentType: "application/javascript", body: bundle })
  );
  await page.goto("http://localhost:5050/playwright/richtext/tables.html");
  await expect(
    page.locator("#view0").getByRole("textbox", { name: "Header column 1", exact: true })
  ).toBeVisible();
});

test("source cells retain focus, formatting and independent drafts in two views", async ({
  page,
}) => {
  const input = page
    .locator("#view0")
    .getByRole("textbox", { name: "Row 1 column 1", exact: true });
  const other = page
    .locator("#view1")
    .getByRole("textbox", { name: "Row 1 column 1", exact: true });
  await input.fill("**edited**");
  await input.evaluate((el) => (el as HTMLInputElement).setSelectionRange(2, 5));
  await page.evaluate(() => window.tables.neighboringEdit());
  await expect(input).toBeFocused();
  await expect(other).toHaveValue("*first*");
  expect(await page.evaluate(() => window.tables.source())).toContain("*first*");
  expect(await page.evaluate(() => window.tables.session.prepareSave())).toMatchObject({
    status: "ready",
  });
  await expect(input).toBeFocused();
  expect(
    await input.evaluate((el) => [
      (el as HTMLInputElement).selectionStart,
      (el as HTMLInputElement).selectionEnd,
    ])
  ).toEqual([2, 5]);
  await expect(other).toHaveValue("**edited**");
  expect(await page.evaluate(() => window.tables.ctx.toolstack.length)).toBe(2);
  await input.press("Control+z");
  await expect(other).toHaveValue("*first*");
  await input.press("Control+Shift+z");
  await expect(other).toHaveValue("**edited**");
  expect(await page.evaluate(() => window.tables.source())).toContain("`a\\|b`");
});

test("competing drafts conflict and unsupported input remains recoverable", async ({ page }) => {
  const input = page
    .locator("#view0")
    .getByRole("textbox", { name: "Row 1 column 1", exact: true });
  const other = page
    .locator("#view1")
    .getByRole("textbox", { name: "Row 1 column 1", exact: true });
  await input.fill("mine");
  await other.fill("theirs");
  expect(await page.evaluate(() => window.tables.session.prepareSave())).toMatchObject({
    status: "conflict",
  });
  await page.locator("#view1").getByRole("button", { name: "Discard drafts" }).click();
  await input.fill("<b>unsupported</b>");
  expect(await page.evaluate(() => window.tables.session.prepareSave())).toMatchObject({
    status: "unencodable",
  });
  expect(await page.evaluate(() => window.tables.ctx.toolstack.length)).toBe(0);
  await input.fill("valid");
  await input.press("Enter");
  await expect(other).toHaveValue("valid");
  expect(await page.evaluate(() => window.tables.ctx.toolstack.length)).toBe(1);
});

test("structure, alignment and undo update both views while the table remains opaque", async ({
  page,
}) => {
  const view = page.locator("#view0");
  const other = page.locator("#view1");
  await view.getByRole("textbox", { name: "Row 1 column 1", exact: true }).focus();
  await view.getByRole("button", { name: "Insert row below" }).click();
  await expect(other.getByRole("textbox", { name: "Row 3 column 1", exact: true })).toHaveValue(
    "last"
  );
  await expect(view.getByRole("button", { name: "Insert row below" })).toBeFocused();
  await view.getByRole("button", { name: "Insert column after" }).click();
  await expect(other.getByRole("textbox", { name: "Header column 3", exact: true })).toHaveValue(
    "Value"
  );
  await view.getByRole("button", { name: "Align center" }).click();
  await expect(other.getByRole("textbox", { name: "Header column 1", exact: true })).toHaveCSS(
    "text-align",
    "center"
  );
  expect(
    await page.evaluate(() =>
      window.tables.provider.blockText(window.tables.doc, window.tables.block)
    )
  ).toHaveLength(1);
  await page.evaluate(async () => {
    for (let i = 0; i < 3; i++) await window.tables.ctx.toolstack.undo();
  });
  expect(await page.evaluate(() => window.tables.source().trim())).toBe(
    await page.evaluate(() => window.tables.original)
  );
  await page.evaluate(async () => {
    for (let i = 0; i < 3; i++) await window.tables.ctx.toolstack.redo();
  });
  await expect(other.getByRole("textbox", { name: "Header column 3", exact: true })).toHaveValue(
    "Value"
  );
});

test("rectangular TSV paste and cell copy have one clipboard owner and one undo entry", async ({
  page,
}) => {
  const view = page.locator("#view0");
  const first = view.getByRole("textbox", { name: "Row 1 column 1", exact: true });
  await first.focus();
  await first.evaluate((el) => {
    const data = new DataTransfer();
    data.setData("text/plain", "**a**\tb\n\tc|d");
    const event = new ClipboardEvent("paste", { bubbles: true, composed: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    el.dispatchEvent(event);
  });
  await expect(view.getByRole("textbox", { name: "Row 2 column 2", exact: true })).toHaveValue(
    "c\\|d"
  );
  expect(await page.evaluate(() => window.tables.ctx.toolstack.length)).toBe(1);
  await first.focus();
  await first.press("Alt+Shift+ArrowRight");
  await page.keyboard.press("Alt+Shift+ArrowDown");
  const last = view.getByRole("textbox", { name: "Row 2 column 2", exact: true });
  expect(
    await last.evaluate((el) => {
      (el as HTMLInputElement).setSelectionRange(0, 0);
      const data = new DataTransfer();
      const event = new ClipboardEvent("copy", { bubbles: true, composed: true, cancelable: true });
      Object.defineProperty(event, "clipboardData", { value: data });
      el.dispatchEvent(event);
      return data.getData("text/plain");
    })
  ).toBe("**a**\tb\n\tc\\|d");
  await page.evaluate(() => window.tables.ctx.toolstack.undo());
  await expect(first).toHaveValue("*first*");
});

test("Tab navigation and Escape respect the opaque document boundary", async ({ page }) => {
  const view = page.locator("#view0");
  await page.evaluate(() => {
    const { editors, doc } = window.tables;
    const pos = { block: doc.blocks[0].id, offset: 0 };
    editors[0].select({ anchor: pos, head: pos });
  });
  await page.keyboard.press("Tab");
  await expect(view.getByRole("textbox", { name: "Header column 1", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(view.getByRole("textbox", { name: "Header column 2", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await expect(view.locator(".rich-text-root")).toBeFocused();
  expect(await page.evaluate(() => window.tables.ctx.toolstack.length)).toBe(0);
  const last = view.getByRole("textbox", { name: "Row 2 column 2", exact: true });
  await last.fill("last draft");
  await last.press("Tab");
  await expect(view.getByRole("button", { name: "Apply cells" })).toBeFocused();
  await expect(
    page.locator("#view1").getByRole("textbox", { name: "Row 2 column 2", exact: true })
  ).toHaveValue("last draft");
});

test("read-only and revoked write permission protect commands and shared history", async ({
  page,
}) => {
  const input = page
    .locator("#view0")
    .getByRole("textbox", { name: "Row 1 column 1", exact: true });
  await input.fill("committed");
  await input.press("Enter");
  await expect(
    page.locator("#view1").getByRole("textbox", { name: "Row 1 column 1", exact: true })
  ).toHaveValue("committed");
  await page.evaluate(() => (window.tables.editors[0].readOnly = true));
  await expect(input).toHaveJSProperty("readOnly", true);
  await input.press("Control+z");
  expect(await page.evaluate(() => window.tables.tableSource())).toContain("committed");
  const result = await page.evaluate(async () => {
    const { session, ctx } = window.tables;
    session.setWriteAllowed(false);
    const before = ctx.toolstack.cur;
    try {
      await ctx.toolstack.undo();
    } catch {
      // History refusal must preserve the cursor
    }
    return [before, ctx.toolstack.cur];
  });
  expect(result[0]).toBe(result[1]);
  await expect(page.locator("#view1").getByRole("button", { name: "Apply cells" })).toBeDisabled();
});

test("native input undo and stale draft acceptance preserve document history", async ({ page }) => {
  const input = page
    .locator("#view0")
    .getByRole("textbox", { name: "Row 1 column 1", exact: true });
  await input.focus();
  await input.press("Control+a");
  await page.keyboard.type("draft");
  await input.press("Control+z");
  for (let i = 0; i < 8 && (await input.inputValue()) !== "*first*"; i++)
    await input.press("Control+z");
  await expect(input).toHaveValue("*first*");
  expect(await page.evaluate(() => window.tables.ctx.toolstack.length)).toBe(0);
  await input.fill("stale");
  const other = page
    .locator("#view1")
    .getByRole("textbox", { name: "Row 1 column 1", exact: true });
  await other.fill("winner");
  await other.press("Enter");
  await input.press("Enter");
  await expect(input).toHaveValue("stale");
  expect(await page.evaluate(() => window.tables.session.prepareSave())).toMatchObject({
    status: "conflict",
  });
  expect(await page.evaluate(() => window.tables.ctx.toolstack.length)).toBe(1);
});

test("deleting a table retains detached drafts for recovery and undo restores committed source", async ({
  page,
}) => {
  await page
    .locator("#view0")
    .getByRole("textbox", { name: "Row 1 column 1", exact: true })
    .fill("recover me");
  await page.evaluate(async () => {
    const { session, ctx, block } = window.tables;
    await session.dispatch(
      { type: "deleteRange", range: { anchor: { block, offset: 0 }, head: { block, offset: 1 } } },
      ctx
    );
  });
  await expect(page.locator("#view0 .table-editor")).toHaveCount(0);
  expect(await page.evaluate(() => window.tables.session.prepareSave())).toMatchObject({
    status: "refused",
  });
  const recovered = await page.evaluate(() => {
    const { session } = window.tables;
    return session.recoverDraft(session.pendingDrafts[0].id);
  });
  expect(recovered).toMatchObject({
    model: {
      rows: [
        ["**Name**", "Value"],
        ["recover me", "`a\\|b`"],
        ["last", ""],
      ],
    },
  });
  await page.evaluate(() => window.tables.ctx.toolstack.undo());
  await expect(
    page.locator("#view0").getByRole("textbox", { name: "Row 1 column 1", exact: true })
  ).toHaveValue("*first*");
});

test("unsupported HTML table cells remain inert and retain their source", async ({ page }) => {
  const source =
    "| A | B |\n| --- | --- |\n| <iframe src='https://invalid.example'></iframe> | x |";
  await page.evaluate((source) => {
    const { doc, block, provider } = window.tables;
    const table = doc.blocks.find((b) => b.id === block);
    if (table?.kind === "table") table.source = source;
    provider.notifyChange(doc, { dirtyBlocks: [block], removedBlocks: [] });
  }, source);
  await expect(page.locator("#view0 .table-editor")).toHaveCount(0);
  await expect(page.locator("iframe")).toHaveCount(0);
  expect(await page.evaluate(() => window.tables.tableSource())).toBe(source);
});

test("real clipboard pastes cells once and copies the outer table as ordinary Markdown", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "Clipboard permission automation requires Chromium");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.evaluate(() => navigator.clipboard.writeText("one\ttwo\nthree\tfour"));
  const input = page
    .locator("#view0")
    .getByRole("textbox", { name: "Row 1 column 1", exact: true });
  await input.focus();
  await input.press("Control+v");
  await expect(
    page.locator("#view1").getByRole("textbox", { name: "Row 2 column 2", exact: true })
  ).toHaveValue("four");
  expect(await page.evaluate(() => window.tables.ctx.toolstack.length)).toBe(1);
  await page.evaluate(() => {
    const { editors, block } = window.tables;
    editors[0].select({ anchor: { block, offset: 0 }, head: { block, offset: 1 } });
  });
  await page.keyboard.press("Control+c");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied.trimEnd()).toBe(await page.evaluate(() => window.tables.tableSource()));
  await page.evaluate(() => {
    const { editors, doc } = window.tables;
    const pos = { block: doc.blocks.at(-1)!.id, offset: 0 };
    editors[0].select({ anchor: pos, head: pos });
  });
  await page.keyboard.press("Control+v");
  await expect
    .poll(() =>
      page.evaluate(() => window.tables.doc.blocks.filter((b) => b.kind === "table").length)
    )
    .toBe(2);
  await page.evaluate(() => window.tables.ctx.toolstack.undo());
  expect(
    await page.evaluate(() => window.tables.doc.blocks.filter((b) => b.kind === "table").length)
  ).toBe(1);
});

test("cell composition survives reconciliation and commits only after composition ends", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "CDP composition injection requires Chromium");
  const input = page
    .locator("#view0")
    .getByRole("textbox", { name: "Row 1 column 1", exact: true });
  await input.focus();
  await input.press("Control+a");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.imeSetComposition", { text: "漢", selectionStart: 1, selectionEnd: 1 });
  expect(await page.evaluate(() => window.tables.session.prepareSave())).toMatchObject({
    status: "refused",
  });
  await page.evaluate(() => window.tables.neighboringEdit());
  await expect(input).toBeFocused();
  await cdp.send("Input.insertText", { text: "漢" });
  await input.press("Enter");
  await expect(
    page.locator("#view1").getByRole("textbox", { name: "Row 1 column 1", exact: true })
  ).toHaveValue("漢");
  expect(await page.evaluate(() => window.tables.ctx.toolstack.length)).toBe(2);
});
