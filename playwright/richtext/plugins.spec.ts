import { expect, test } from "@playwright/test";
import { build } from "esbuild";
import type {} from "./plugins_fixture";

let bundle: string;
test.beforeAll(async () => {
  const result = await build({
    entryPoints: ["playwright/richtext/plugins_fixture.ts"],
    bundle     : true,
    write      : false,
    target     : "es2022",
    format     : "esm",
    external   : ["fs", "path", "electron"],
  });
  bundle = result.outputFiles[0].text;
});
test.beforeEach(async ({ page }) => {
  await page.route("**/plugins.js", (route) =>
    route.fulfill({ contentType: "application/javascript", body: bundle })
  );
  await page.goto("http://localhost:5050/playwright/richtext/plugins.html");
  await expect(page.locator("#view0").getByRole("textbox", { name: "Note text" })).toBeVisible();
  await page.waitForFunction(() => !!window.plugins);
});

test("denied documents construct no plugin renderers", async ({ page }) => {
  await page.evaluate(() => sessionStorage.setItem("denyPlugins", "yes"));
  await page.reload();
  await page.waitForFunction(() => !!window.plugins);
  expect(await page.evaluate(() => window.plugins.counts().created)).toBe(0);
  await expect(page.locator("#view0").getByRole("textbox", { name: "Note text" })).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .filter((entry) => entry.name.includes("unapproved.invalid"))
    )
  ).toEqual([]);
});

test("plugin drafts retain focus and independent state in two views through save and history", async ({
  page,
}) => {
  const input = page.locator("#view0").getByRole("textbox", { name: "Note text" });
  const other = page.locator("#view1").getByRole("textbox", { name: "Note text" });
  await input.fill("draft");
  await input.evaluate((el) => (el as HTMLInputElement).setSelectionRange(1, 3));
  await page.evaluate(() => window.plugins.neighboringEdit());
  await expect(input).toBeFocused();
  await expect(other).toHaveValue("saved");
  expect(await page.evaluate(() => window.plugins.session.prepareSave())).toMatchObject({
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
  expect(await page.evaluate(() => window.plugins.ctx.toolstack.length)).toBe(2);
  await page.evaluate(() => window.plugins.ctx.toolstack.undo());
  await expect(other).toHaveValue("saved");
  await page.evaluate(() => window.plugins.ctx.toolstack.redo());
  await expect(other).toHaveValue("draft");
  expect(await page.evaluate(() => window.plugins.counts().created)).toBe(2);
});

test("conflicting drafts and revoked writes retain recoverable input", async ({ page }) => {
  await page.locator("#view0").getByRole("textbox", { name: "Note text" }).fill("first");
  await page.locator("#view1").getByRole("textbox", { name: "Note text" }).fill("second");
  expect(await page.evaluate(() => window.plugins.session.prepareSave())).toMatchObject({
    status: "conflict",
  });
  await page.evaluate(() => window.plugins.revoke());
  expect(await page.evaluate(() => window.plugins.session.prepareSave())).toMatchObject({
    status: "refused",
  });
  expect(
    await page.evaluate(() =>
      window.plugins.session.pendingDrafts.map((draft) =>
        window.plugins.session.recoverDraft(draft.id)
      )
    )
  ).toEqual(["first", "second"]);
  expect(await page.evaluate(() => window.plugins.counts())).toMatchObject({
    created : 2,
    disposed: 2,
  });
  expect(await page.evaluate(() => window.plugins.ctx.toolstack.length)).toBe(0);
});

test("external policy gates callbacks and revocation aborts work and discards late values", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const api = window.plugins;
    const context = api.contexts[0];
    let called = 0;
    let aborted = false;
    api.permissions.external = false;
    const denied = await context.external("fetch", async () => {
      called++;
      return "bad";
    });
    api.permissions.external = true;
    let finish!: (value: string) => void;
    const pending = context.external(
      "fetch",
      (signal) =>
        new Promise<string>((resolve) => {
          called++;
          finish = resolve;
          signal.addEventListener("abort", () => {
            aborted = true;
          });
        })
    );
    api.revoke();
    finish("late");
    return { denied, result: await pending, called, aborted };
  });
  expect(result).toEqual({
    denied : { status: "refused" },
    result : { status: "refused" },
    called : 1,
    aborted: true,
  });
});

test("default media and no-host plugin records remain inert", async ({ page }) => {
  await expect(page.locator("#inert .md-widget")).toHaveText("Widget unavailable");
  await expect(page.locator("#inert iframe, #inert video, #inert script")).toHaveCount(0);
  const original = await page.evaluate(() => window.plugins.saved());
  await page.evaluate(() => window.plugins.unregister());
  await expect(page.locator("#view0").getByRole("textbox", { name: "Note text" })).toHaveCount(0);
  expect(await page.evaluate(() => window.plugins.saved())).toBe(original);
  expect(await page.evaluate(() => window.plugins.session.revision)).toBe(0);
});

test("provider HTML fallback escapes payload and plain targets explicitly refuse structured transfer", async ({
  page,
}) => {
  const html = await page.evaluate(async () => {
    const api = window.plugins;
    await api.host.update(
      api.snapshot(),
      {
        text: '<img src="https://unapproved.invalid" onerror="alert(1)">',
        url : "javascript:alert(1)",
      },
      api.ctx
    );
    return api.copy().html;
  });
  expect(html).toContain("&lt;img");
  await expect(page.locator("#view0 img")).toHaveCount(0);
  await page.evaluate(() => window.plugins.pastePlain());
  expect(await page.evaluate(() => window.plugins.counts().unsupported)).toBe(1);
  expect(await page.evaluate(() => window.plugins.plain.session!.doc.blocks[0].text)).toBe("plain");
});

test("outer copy publishes the structured MIME while inner clipboard stays native", async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const api = window.plugins;
    const editor = api.editors[0];
    const block = api.snapshot().block;
    editor.select({ anchor: { block, offset: 0 }, head: { block, offset: 1 } });
    const data = new DataTransfer();
    const event = new ClipboardEvent("copy", { bubbles: true, cancelable: true, composed: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    editor.root.dispatchEvent(event);
    return {
      prevented: event.defaultPrevented,
      types    : [...data.types],
      value    : data.getData("application/x-pathux-widgets+json"),
    };
  });
  expect(result.prevented).toBe(true);
  expect(result.types).toContain("application/x-pathux-widgets+json");
  expect(JSON.parse(result.value).blocks[0].widget.id).toBe("note");
});
