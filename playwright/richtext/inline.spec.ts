import { expect, test } from "@playwright/test";
import { build } from "esbuild";
import type {} from "./inline_fixture";

let bundle: string;
test.beforeAll(async () => {
  const result = await build({
    entryPoints: ["playwright/richtext/inline_fixture.ts"],
    bundle     : true,
    write      : false,
    target     : "es2022",
    format     : "esm",
    external   : ["fs", "path", "electron"],
  });
  bundle = result.outputFiles[0].text;
});
test.beforeEach(async ({ page }) => {
  await page.route("**/inline.js", (route) =>
    route.fulfill({ contentType: "application/javascript", body: bundle })
  );
  await page.goto("http://localhost:5050/playwright/richtext/inline.html");
  await expect(page.locator("#view0").getByRole("textbox", { name: "Note text" })).toBeVisible();
  await page.waitForFunction(() => !!window.inline);
});

test("plugin drafts retain focus and independent state in two views through save and history", async ({
  page,
}) => {
  const input = page.locator("#view0").getByRole("textbox", { name: "Note text" });
  const other = page.locator("#view1").getByRole("textbox", { name: "Note text" });
  await input.fill("draft");
  await input.evaluate((el) => (el as HTMLInputElement).setSelectionRange(1, 3));
  await page.evaluate(() => window.inline.neighboringEdit());
  await expect(input).toBeFocused();
  await expect(other).toHaveValue("saved");
  expect(await page.evaluate(() => window.inline.session.prepareSave())).toMatchObject({
    status: "ready",
  });
  await expect(other).toHaveValue("draft");
  await expect(input).toBeFocused();
  expect(
    await input.evaluate((el) => [
      (el as HTMLInputElement).selectionStart,
      (el as HTMLInputElement).selectionEnd,
    ])
  ).toEqual([1, 3]);
  expect(await page.evaluate(() => window.inline.ctx.toolstack.length)).toBe(2);
  await page.evaluate(() => window.inline.ctx.toolstack.undo());
  await expect(other).toHaveValue("saved");
  await page.evaluate(() => window.inline.ctx.toolstack.redo());
  await expect(other).toHaveValue("draft");
  expect(await page.evaluate(() => window.inline.counts().created)).toBe(2);
});

test("Tab enters inline controls and Escape exits beside the atom", async ({ page }) => {
  await page.evaluate(() => {
    const api = window.inline;
    const { block, offset = 0 } = api.snapshot();
    api.editors[0].select({ anchor: { block, offset }, head: { block, offset } });
  });
  await page.keyboard.press("Tab");
  const input = page.locator("#view0").getByRole("textbox", { name: "Note text" });
  await expect(input).toBeFocused();
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => window.inline.editors[0].selection()?.head.offset)).toBe(7);
  await page.keyboard.type("X");
  expect(await page.evaluate(() => window.inline.doc.blocks[0].text)).toBe("before\ufffcXafter");
  await expect
    .poll(() => page.evaluate(() => window.inline.editors[0].selection()?.head.offset))
    .toBe(8);
  await page.keyboard.press("ArrowLeft");
  await expect
    .poll(() => page.evaluate(() => window.inline.editors[0].selection()?.head.offset))
    .toBe(7);
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator("#view0").getByRole("button", { name: "Apply note" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(input).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  expect(await page.evaluate(() => window.inline.editors[0].selection()?.head.offset)).toBe(6);
});

test("adjacent widgets expose caret slots and retain independent inputs", async ({ page }) => {
  await page.evaluate(async () => {
    const api = window.inline;
    await api.host.insertInline(
      { ...api.record, id: "two" },
      { block: api.snapshot().block, offset: 7 },
      api.ctx
    );
  });
  await expect(page.locator("#view0 .md-inline-widget")).toHaveCount(2);
  await page.evaluate(() => {
    const api = window.inline;
    const block = api.snapshot().block;
    api.editors[0].select({ anchor: { block, offset: 7 }, head: { block, offset: 7 } });
  });
  await page.keyboard.type("between");
  expect(await page.evaluate(() => window.inline.doc.blocks[0].text)).toBe(
    "before\ufffcbetween\ufffcafter"
  );
  await expect(page.locator("#view0").getByRole("textbox", { name: "Note text" })).toHaveCount(2);
});

test("composition in an inline control holds reconciliation until compositionend", async ({
  page,
}) => {
  const input = page.locator("#view0").getByRole("textbox", { name: "Note text" });
  await input.focus();
  await input.dispatchEvent("compositionstart", { data: "" });
  await input.fill("漢字");
  await page.evaluate(() => window.inline.neighboringEdit());
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("漢字");
  await input.dispatchEvent("compositionend", { data: "漢字" });
  await page.evaluate(() => window.inline.session.prepareSave());
  await expect(input).toBeFocused();
  await expect(page.locator("#view1").getByRole("textbox", { name: "Note text" })).toHaveValue(
    "漢字"
  );
  expect(await page.evaluate(() => window.inline.counts().created)).toBe(2);
});

test("focused widget survives split, join and movement to another block", async ({ page }) => {
  const input = page.locator("#view0").getByRole("textbox", { name: "Note text" });
  await input.fill("draft");
  await page.evaluate(async () => {
    const api = window.inline;
    await api.session.dispatch(
      { type: "splitBlock", at: { block: api.snapshot().block, offset: 3 }, newBlock: "split" },
      api.ctx
    );
  });
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("draft");
  await page.evaluate(async () => {
    const api = window.inline;
    await api.session.dispatch({ type: "joinWithPrevious", block: "split" }, api.ctx);
    await api.host.moveInline(api.snapshot(), { block: api.doc.blocks[1].id, offset: 2 }, api.ctx);
  });
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("draft");
  expect(await page.evaluate(() => window.inline.counts().created)).toBe(2);
  expect(await page.evaluate(() => window.inline.session.prepareSave())).toMatchObject({
    status: "ready",
  });
});

test("outer deletion and undo restore the record with no renderer dependency", async ({ page }) => {
  await page.evaluate(async () => {
    const api = window.inline;
    const { block, offset = 0 } = api.snapshot();
    api.editors[0].select({ anchor: { block, offset }, head: { block, offset: offset + 1 } });
  });
  await page.keyboard.press("Backspace");
  await expect(page.locator("#view0 .md-inline-widget")).toHaveCount(0);
  await page.evaluate(async () => {
    const api = window.inline;
    api.unregister();
    await api.ctx.toolstack.undo();
  });
  await expect(page.locator("#view0 .md-inline-widget")).toHaveCount(1);
  expect(await page.evaluate(() => window.inline.snapshot().record)).toMatchObject({ id: "note" });
  await expect(page.locator("#view0").getByRole("textbox", { name: "Note text" })).toHaveCount(0);
});

test("inline clipboard transfer preserves source and refuses unsupported providers", async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const api = window.inline;
    const { block, offset = 0 } = api.snapshot();
    api.editors[0].select({ anchor: { block, offset }, head: { block, offset: offset + 1 } });
    const data = new DataTransfer();
    const event = new ClipboardEvent("copy", { bubbles: true, cancelable: true, composed: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    api.editors[0].root.dispatchEvent(event);
    const content = api.provider.fromClipboard(data)!;
    return {
      prevented: event.defaultPrevented,
      copied   : data.getData("text/plain"),
      records  : api.provider.widgets.pasted(content),
    };
  });
  expect(result.prevented).toBe(true);
  expect(result.copied).toContain("{{pathux-widget-v1:");
  expect(result.records).toHaveLength(1);
  expect(result.records[0].id).not.toBe("note");
  await page.evaluate(() => window.inline.pastePlain());
  expect(await page.evaluate(() => window.inline.counts().unsupported)).toBe(1);
  expect(await page.evaluate(() => window.inline.plain.session!.doc.blocks[0].text)).toBe("plain");
});

test("unknown records remain inert and round trip without constructing views", async ({ page }) => {
  await page.evaluate(async () => {
    const api = window.inline;
    const block = api.doc.blocks[1].id;
    await api.session.dispatch(
      {
        type     : "insertContent",
        at       : { anchor: { block, offset: 0 }, head: { block, offset: 0 } },
        content: { blocks: [api.encodeInlineWidget({ ...api.record, id: "future", version: 42 })] },
        newBlocks: [],
      },
      api.ctx
    );
  });
  await expect(page.locator("#view0 .md-inline-widget")).toHaveCount(2);
  expect(await page.evaluate(() => window.inline.counts().created)).toBe(2);
  expect(
    await page.evaluate(
      () => window.inline.provider.widgets.read(window.inline.doc, "future")?.record.version
    )
  ).toBe(42);
  await expect(page.locator("#inert iframe, #inert video, #inert script")).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath("inline-widgets.png") });
});

test("prose composition beside a widget preserves the atom and its mounted view", async ({
  page,
  browserName,
}) => {
  await page.evaluate(() => {
    const api = window.inline;
    const block = api.snapshot().block;
    api.editors[0].select({ anchor: { block, offset: 6 }, head: { block, offset: 6 } });
  });
  if (browserName === "chromium") {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.imeSetComposition", { text: "漢", selectionStart: 1, selectionEnd: 1 });
    await cdp.send("Input.insertText", { text: "漢" });
    await cdp.detach();
  } else {
    await page.evaluate(() => {
      const root = window.inline.editors[0].root;
      root.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "" }));
      const text = root.querySelector("[data-doc-block]")!.firstChild as Text;
      text.data += "漢";
      root.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "漢" }));
    });
  }
  await expect
    .poll(() => page.evaluate(() => window.inline.doc.blocks[0].text))
    .toBe("before漢\ufffcafter");
  expect(await page.evaluate(() => window.inline.snapshot().offset)).toBe(7);
  expect(await page.evaluate(() => window.inline.counts().created)).toBe(2);
  expect(await page.evaluate(() => window.inline.ctx.toolstack.length)).toBe(1);
});
