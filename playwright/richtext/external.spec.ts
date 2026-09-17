import { expect, test } from "@playwright/test";
import { build } from "esbuild";
import type {} from "./external_fixture";
let bundle: string;
test.beforeAll(async () => {
  bundle = (
    await build({
      entryPoints: ["playwright/richtext/external_fixture.ts"],
      bundle     : true,
      write      : false,
      target     : "es2022",
      format     : "esm",
      external   : ["fs", "path", "electron"],
    })
  ).outputFiles[0].text;
});
test.beforeEach(async ({ page }) => {
  await page.route("**/external.js", (route) =>
    route.fulfill({ contentType: "application/javascript", body: bundle })
  );
  await page.goto("http://localhost:5050/playwright/richtext/external.html");
  await expect(
    page.locator("#external0").getByRole("textbox", { name: "name", exact: true })
  ).toHaveValue("Ada");
  await expect(page.locator("#external1 .resource-status").last()).toContainText(
    "Loaded version 1"
  );
});

test("loads and refreshes external data without document edits", async ({ page }) => {
  expect(await page.evaluate(() => window.externalDemo.stack.length)).toBe(0);
  const source = await page.evaluate(() => window.externalDemo.source());
  expect(source).not.toContain('"Ada"');
  await page.evaluate(() => window.externalDemo.externalChange({ name: "New remote", count: 4 }));
  await page
    .locator("#external0 .external-resource")
    .last()
    .getByRole("button", { name: "Refresh resource" })
    .click();
  await expect(page.locator("#external0 pre")).toContainText("New remote");
  expect(await page.evaluate(() => window.externalDemo.source())).toBe(source);
  expect(await page.evaluate(() => window.externalDemo.stack.length)).toBe(0);
});

test("saving a snapshot is one document edit and history never submits", async ({ page }) => {
  const source = await page.evaluate(() => window.externalDemo.source());
  await page
    .locator("#external0 .external-resource")
    .last()
    .getByRole("button", { name: "Save resource snapshot" })
    .click();
  await expect(page.locator("#external0 .resource-status").last()).toHaveText("snapshot-saved");
  await page
    .locator("#external0 .external-resource")
    .last()
    .getByRole("button", { name: "Save resource snapshot" })
    .click();
  expect(await page.evaluate(() => window.externalDemo.stack.length)).toBe(1);
  expect(await page.evaluate(() => window.externalDemo.source())).toContain(
    '"snapshot":{"version":"1","value":{"name":"Ada"'
  );
  await page.evaluate(() => window.externalDemo.stack.undo());
  expect(await page.evaluate(() => window.externalDemo.source())).toBe(source);
  await page.evaluate(() => window.externalDemo.stack.redo());
  expect(await page.evaluate(() => window.externalDemo.writes())).toBe(0);
});

test("drafts require explicit submission and remain independent across views", async ({ page }) => {
  const form = page.locator("#external0 .external-resource").first();
  await form.getByRole("textbox", { name: "name", exact: true }).fill("Bea");
  await expect(
    page.locator("#external1").getByRole("textbox", { name: "name", exact: true })
  ).toHaveValue("Ada");
  expect(await page.evaluate(() => window.externalDemo.session.prepareSave())).toMatchObject({
    status: "refused",
  });
  expect(await page.evaluate(() => window.externalDemo.writes())).toBe(0);
  await form.getByRole("button", { name: "Submit answers" }).click();
  await expect(form.locator(".resource-status")).toHaveText("Submitted version 2");
  expect(await page.evaluate(() => window.externalDemo.remote())).toEqual({
    version: "2",
    value  : { name: "Bea", count: 1 },
  });
  expect(await page.evaluate(() => window.externalDemo.stack.length)).toBe(0);
  expect(await page.evaluate(() => window.externalDemo.session.prepareSave())).toMatchObject({
    status: "ready",
  });
  await expect(
    page.locator("#external1").getByRole("textbox", { name: "name", exact: true })
  ).toHaveValue("Ada");
});

test("version conflicts preserve drafts and do not retry writes", async ({ page }) => {
  const first = page.locator("#external0 .external-resource").first();
  const second = page.locator("#external1 .external-resource").first();
  await first.getByRole("textbox", { name: "name", exact: true }).fill("First");
  await second.getByRole("textbox", { name: "name", exact: true }).fill("Second");
  await first.getByRole("button", { name: "Submit answers" }).click();
  await expect(first.locator(".resource-status")).toContainText("Submitted");
  await second.getByRole("button", { name: "Submit answers" }).click();
  await expect(second.locator(".resource-status")).toContainText(
    "Resource changed; draft retained"
  );
  await expect(second.getByRole("textbox", { name: "name", exact: true })).toHaveValue("Second");
  expect(await page.evaluate(() => window.externalDemo.writes())).toBe(1);
  await second.getByRole("button", { name: "Refresh resource" }).click();
  await expect(second.locator(".resource-status")).toContainText("Submit or discard");
  await second.getByRole("button", { name: "Discard resource draft" }).click();
  await second.getByRole("button", { name: "Refresh resource" }).click();
  await expect(second.getByRole("textbox", { name: "name", exact: true })).toHaveValue("First");
});

test("failed submission retains answers and validation runs before service calls", async ({
  page,
}) => {
  const form = page.locator("#external0 .external-resource").first();
  await form.getByRole("textbox", { name: "count", exact: true }).fill("-1");
  await form.getByRole("button", { name: "Submit answers" }).click();
  await expect(form.locator(".resource-status")).toContainText("Resolve validation errors");
  expect(
    await page.evaluate(
      () => window.externalDemo.requests.filter((r) => r.action === "submit").length
    )
  ).toBe(0);
  await form.getByRole("textbox", { name: "count", exact: true }).fill("2");
  await page.evaluate(() => window.externalDemo.setOffline(true));
  await form.getByRole("button", { name: "Submit answers" }).click();
  await expect(form.locator(".resource-status")).toHaveText("Simulated offline service");
  await expect(form.getByRole("textbox", { name: "count", exact: true })).toHaveValue("2");
  expect(await page.evaluate(() => window.externalDemo.session.prepareSave())).toMatchObject({
    status: "refused",
  });
  expect(await page.evaluate(() => window.externalDemo.stack.length)).toBe(0);
  expect(await page.evaluate(() => window.externalDemo.writes())).toBe(0);
});

test("cancellation clears pending UI and ignores late service responses", async ({ page }) => {
  const form = page.locator("#external0 .external-resource").first();
  await form.getByRole("textbox", { name: "name", exact: true }).fill("Pending");
  await page.evaluate(() => window.externalDemo.setDelayed(true));
  await form.getByRole("button", { name: "Submit answers" }).click();
  await expect(form.locator(".resource-status")).toHaveText("submitting");
  await expect(form.getByRole("textbox", { name: "name", exact: true })).toHaveAttribute(
    "readonly",
    ""
  );
  await form.getByRole("button", { name: "Cancel request" }).click();
  await expect(form.locator(".resource-status")).toContainText("remote outcome may be unknown");
  await page.evaluate(() => window.externalDemo.release());
  await expect(form.getByRole("textbox", { name: "name", exact: true })).toHaveValue("Pending");
  expect(await page.evaluate(() => window.externalDemo.writes())).toBe(0);
  expect(await page.evaluate(() => window.externalDemo.requests.at(-1)!.signal.aborted)).toBe(true);
});

test("policy revocation aborts requests and detached drafts remain recoverable", async ({
  page,
}) => {
  const form = page.locator("#external0 .external-resource").first();
  await form.getByRole("textbox", { name: "name", exact: true }).fill("Recover me");
  await page.evaluate(() => window.externalDemo.setDelayed(true));
  await form.getByRole("button", { name: "Submit answers" }).click();
  await expect(form.locator(".resource-status")).toHaveText("submitting");
  await page.evaluate(() => window.externalDemo.setResourcePolicy(false));
  await expect(page.locator(".external-resource")).toHaveCount(0);
  const result = await page.evaluate(() => {
    const api = window.externalDemo;
    const draft = api.session.pendingDrafts[0];
    const recovery = api.session.recoverDraft(draft.id);
    api.release();
    api.session.discardDraft(draft.id);
    return {
      recovery,
      detached: draft.detached,
      pending : api.session.pendingDrafts.length,
      aborted : api.requests.at(-1)!.signal.aborted,
    };
  });
  expect(result.detached).toBe(true);
  expect(result.aborted).toBe(true);
  expect(result.pending).toBe(0);
  expect(JSON.stringify(result.recovery)).toContain("Recover me");
  expect(await page.evaluate(() => window.externalDemo.writes())).toBe(0);
});

test("redirect destinations and document base paths are separately authorized", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.externalDemo.redirect("memory://allowed/customer", "memory://blocked/private")
  );
  await page
    .locator("#external0 .external-resource")
    .last()
    .getByRole("button", { name: "Refresh resource" })
    .click();
  await expect(page.locator("#external0 .resource-status").last()).toHaveText("refused");
  expect(
    await page.evaluate(() =>
      window.externalDemo.requests.some((r) => r.destination.startsWith("memory://blocked/"))
    )
  ).toBe(false);
  const count = await page.evaluate(() => window.externalDemo.requests.length);
  await page.evaluate(() => window.externalDemo.rebind("blocked"));
  await expect(page.locator(".external-resource")).toHaveCount(0);
  expect(await page.evaluate(() => window.externalDemo.requests.length)).toBe(count);
});

test("remote schemas are authorized declarative data and code stays inert", async ({ page }) => {
  await page.evaluate(() => window.externalDemo.remoteSchema());
  await expect(
    page.locator("#external0").getByRole("textbox", { name: "name", exact: true })
  ).toHaveValue("Ada");
  await expect
    .poll(() =>
      page.evaluate(() => window.externalDemo.requests.filter((r) => r.action === "schema").length)
    )
    .toBeGreaterThan(0);
  await page.evaluate(() =>
    window.externalDemo.setSchema({
      format : "pathux.form-schema",
      version: 1,
      root   : { kind: "object", fields: {}, execute: "window.executed = true" },
    })
  );
  await page
    .locator("#external0 .external-resource")
    .first()
    .getByRole("button", { name: "Refresh resource" })
    .click();
  await expect(page.locator("#external0 .resource-status").first()).toHaveText(
    "Schema unavailable or unsupported"
  );
  expect(await page.evaluate(() => "executed" in window)).toBe(false);
  await expect(
    page.locator("#external0").getByRole("textbox", { name: "name", exact: true })
  ).toHaveAttribute("readonly", "");
});

test("read-only views cannot submit or save snapshots and shared history obeys session policy", async ({
  page,
}) => {
  await page.evaluate(() => (window.externalDemo.editors[0].readOnly = true));
  await expect(
    page.locator("#external0").getByRole("button", { name: "Submit answers" })
  ).toBeDisabled();
  await expect(
    page.locator("#external0").getByRole("textbox", { name: "name", exact: true })
  ).toHaveAttribute("readonly", "");
  await page
    .locator("#external1 .external-resource")
    .last()
    .getByRole("button", { name: "Save resource snapshot" })
    .click();
  await expect(page.locator("#external1 .resource-status").last()).toHaveText("snapshot-saved");
  const source = await page.evaluate(() => window.externalDemo.source());
  expect(
    await page.evaluate(async () => {
      window.externalDemo.session.setWriteAllowed(false);
      try {
        await window.externalDemo.stack.undo();
        return false;
      } catch {
        return true;
      }
    })
  ).toBe(true);
  expect(await page.evaluate(() => window.externalDemo.source())).toBe(source);
});

test("permission to read does not grant permission to submit", async ({ page }) => {
  await page.evaluate(() => window.externalDemo.setSubmitPolicy(false));
  const form = page.locator("#external0 .external-resource").first();
  await expect(form.getByRole("textbox", { name: "name", exact: true })).toHaveValue("Ada");
  await form.getByRole("textbox", { name: "name", exact: true }).fill("Denied");
  await form.getByRole("button", { name: "Submit answers" }).click();
  await expect(form.locator(".resource-status")).toHaveText("refused");
  expect(
    await page.evaluate(() => window.externalDemo.requests.some((r) => r.action === "submit"))
  ).toBe(false);
});

test("rapid submission starts one transaction and document replay never resubmits it", async ({
  page,
}) => {
  const form = page.locator("#external0 .external-resource").first();
  await form.getByRole("textbox", { name: "name", exact: true }).fill("Once");
  await page.evaluate(() => window.externalDemo.setDelayed(true));
  await form.getByRole("button", { name: "Submit answers" }).evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await expect(form.locator(".resource-status")).toHaveText("submitting");
  await expect(form.getByRole("button", { name: "Submit answers" })).toBeDisabled();
  expect(
    await page.evaluate(
      () => window.externalDemo.requests.filter((r) => r.action === "submit").length
    )
  ).toBe(1);
  await page.evaluate(() => window.externalDemo.release());
  await expect(form.locator(".resource-status")).toHaveText("Submitted version 2");
  await form.getByRole("button", { name: "Save resource snapshot" }).click();
  await expect(form.locator(".resource-status")).toHaveText("snapshot-saved");
  await page.evaluate(() => window.externalDemo.stack.undo());
  await page.evaluate(() => window.externalDemo.stack.redo());
  expect(await page.evaluate(() => window.externalDemo.writes())).toBe(1);
  expect(
    await page.evaluate(
      () => window.externalDemo.requests.filter((r) => r.action === "submit").length
    )
  ).toBe(1);
});

test("schema version conflicts retain the authored draft", async ({ page }) => {
  await page.evaluate(() => window.externalDemo.remoteSchema());
  const form = page.locator("#external0 .external-resource").first();
  await expect(form.getByRole("textbox", { name: "name", exact: true })).toHaveValue("Ada");
  await form.getByRole("textbox", { name: "name", exact: true }).fill("Bea");
  await page.evaluate(() =>
    window.externalDemo.setSchema({
      format : "pathux.form-schema",
      version: 1,
      root   : { kind: "object", fields: { name: { kind: "string", minLength: 10 } } },
    })
  );
  await form.getByRole("button", { name: "Submit answers" }).click();
  await expect(form.locator(".resource-status")).toContainText("draft retained");
  await expect(form.getByRole("textbox", { name: "name", exact: true })).toHaveValue("Bea");
  expect(
    await page.evaluate(() => window.externalDemo.requests.at(-1)!.submission!.schema!.version)
  ).toBe("schema-1");
  expect(await page.evaluate(() => window.externalDemo.writes())).toBe(0);
});

test("rebinding during a delayed read aborts and ignores the old response", async ({ page }) => {
  await page.evaluate(() => window.externalDemo.setDelayed(true));
  await page
    .locator("#external0 .external-resource")
    .last()
    .getByRole("button", { name: "Refresh resource" })
    .click();
  await expect(page.locator("#external0 .resource-status").last()).toHaveText("loading");
  await page.evaluate(() => window.externalDemo.rebind("blocked"));
  await expect(page.locator(".external-resource")).toHaveCount(0);
  expect(await page.evaluate(() => window.externalDemo.requests.at(-1)!.signal.aborted)).toBe(true);
  await page.evaluate(() => window.externalDemo.release());
  await expect(page.locator(".external-resource")).toHaveCount(0);
  expect(await page.evaluate(() => window.externalDemo.stack.length)).toBe(0);
});

test("offline mounts display an explicit saved snapshot without trusting it for writes", async ({
  page,
}) => {
  const view = page.locator("#external0 .external-resource").last();
  await view.getByRole("button", { name: "Save resource snapshot" }).click();
  await expect(view.locator(".resource-status")).toHaveText("snapshot-saved");
  await page.evaluate(() => {
    window.externalDemo.setOffline(true);
    window.externalDemo.host.invalidate();
  });
  await expect(view.locator(".resource-status")).toHaveText("Simulated offline service");
  await expect(view.locator("pre")).toContainText("Saved snapshot (not refreshed)");
  await expect(view.locator("pre")).toContainText("Ada");
  await expect(view.getByRole("button", { name: "Save resource snapshot" })).toBeDisabled();
  expect(await page.evaluate(() => window.externalDemo.stack.length)).toBe(1);
});
