import { expect, test } from "@playwright/test";
import { build } from "esbuild";
import type {} from "./forms_fixture";

let bundle: string;
test.beforeAll(async () => {
  bundle = (
    await build({
      entryPoints: ["playwright/richtext/forms_fixture.ts"],
      bundle     : true,
      write      : false,
      target     : "es2022",
      format     : "esm",
      external   : ["fs", "path", "electron"],
    })
  ).outputFiles[0].text;
});
test.beforeEach(async ({ page }) => {
  await page.route("**/forms.js", (route) =>
    route.fulfill({ contentType: "application/javascript", body: bundle })
  );
  await page.goto("http://localhost:5050/playwright/richtext/forms.html");
  await expect(
    page.locator("#native0").getByRole("textbox", { name: "name", exact: true })
  ).toBeVisible();
  await page.waitForFunction(() => !!window.forms);
});

test("opening forms is a pure read with no defaults or duplicate history", async ({ page }) => {
  expect(await page.evaluate(() => window.forms.source())).toBe(
    await page.evaluate(() => window.forms.initial)
  );
  expect(
    await page.evaluate(() => [window.forms.stack.length, window.forms.pluginStack.length])
  ).toEqual([0, 0]);
  expect(await page.evaluate(() => window.forms.pluginSource())).not.toContain('"tags"');
  await expect(page.locator("#native0 textbox-x")).toHaveCount(15);
});

test("schema versions stay independent and unavailable schemas preserve payloads", async ({
  page,
}) => {
  expect(
    await page.evaluate(async () => {
      const api = window.forms;
      const current = api.provider.widgets.read(api.pluginSession.doc, "answers")!;
      const result = await api.host.update(
        current,
        { schema: { id: "character", version: 2 }, values: { id: "ada", name: "Future" } },
        api.editors[2].ctx
      );
      api.host.invalidate();
      return result.status;
    })
  ).toBe("applied");
  await expect(page.locator("#plugin0 .schema-form")).toHaveCount(0);
  expect(await page.evaluate(() => window.forms.pluginSource())).toContain(
    '"version":1,"payload":{"schema":{"id":"character","version":2}'
  );
  await page.evaluate(() => window.forms.pluginStack.undo());
  await expect(
    page.locator("#plugin0").getByRole("textbox", { name: "name", exact: true })
  ).toHaveValue("Ada");
});

test("nested JSON controls preserve unknown authored values and omission remains explicit", async ({
  page,
}) => {
  const form = page.locator("#native0");
  await form
    .getByRole("textbox", { name: "outfits", exact: true })
    .fill('{"day":{"description":"Blue"},"night":"Green"}');
  await form.getByRole("button", { name: "Omit name", exact: true }).click();
  expect(await page.evaluate(() => window.forms.session.prepareSave())).toMatchObject({
    status: "unencodable",
  });
  await form.getByRole("button", { name: "Discard answers" }).click();
  await form
    .getByRole("textbox", { name: "outfits", exact: true })
    .fill('{"day":{"description":"Blue"},"night":"Green"}');
  expect(await page.evaluate(() => window.forms.session.prepareSave())).toMatchObject({
    status: "ready",
  });
  expect(await page.evaluate(() => window.forms.source())).toContain("unknown: [authored, value]");
  expect(await page.evaluate(() => window.forms.source())).toContain('"outfits":');
  const embedded = page.locator("#plugin0");
  await embedded.getByRole("button", { name: "Omit name", exact: true }).click();
  expect(await page.evaluate(() => window.forms.pluginSession.prepareSave())).toMatchObject({
    status: "ready",
  });
  expect(await page.evaluate(() => window.forms.pluginSource())).not.toContain('"name"');
});

test("a late validator cannot accept changed answers", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const form = window.forms.standalone;
    let release: () => void = () => {};
    const validate = form.schema.validate.bind(form.schema);
    form.schema.validate = async (input) => {
      await new Promise<void>((resolve) => (release = resolve));
      return validate(input);
    };
    const pending = form.validateSubmission();
    const input = form.element.querySelector("textbox-x")!.shadowRoot!.querySelector("input")!;
    input.value = "Changed during validation";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    release();
    return pending;
  });
  expect(result).toMatchObject({
    success: false,
    issues : [{ message: expect.stringContaining("Answers changed during validation") }],
  });
});

test("native forms preserve source, focus and independent drafts through save and history", async ({
  page,
}) => {
  const input = page.locator("#native0").getByRole("textbox", { name: "name", exact: true });
  const other = page.locator("#native1").getByRole("textbox", { name: "name", exact: true });
  await input.fill("Bea");
  await input.evaluate((el) => (el as HTMLInputElement).setSelectionRange(1, 2));
  await expect(other).toHaveValue("Ada");
  expect(await page.evaluate(() => window.forms.session.prepareSave())).toMatchObject({
    status: "ready",
  });
  await expect(input).toBeFocused();
  expect(
    await input.evaluate((el) => [
      (el as HTMLInputElement).selectionStart,
      (el as HTMLInputElement).selectionEnd,
    ])
  ).toEqual([1, 2]);
  await expect(other).toHaveValue("Bea");
  expect(await page.evaluate(() => window.forms.source())).toBe(
    (await page.evaluate(() => window.forms.initial)).replace("'Ada'", "'Bea'")
  );
  expect(await page.evaluate(() => window.forms.stack.length)).toBe(1);
  await page.evaluate(() => window.forms.stack.undo());
  await expect(other).toHaveValue("Ada");
  await page.evaluate(() => window.forms.stack.redo());
  await expect(other).toHaveValue("Bea");
});

test("incomplete and cross-field-invalid embedded answers save but cannot be submitted", async ({
  page,
}) => {
  const form = page.locator("#plugin0");
  await form.getByRole("textbox", { name: "name", exact: true }).fill("");
  await form.getByRole("textbox", { name: "min", exact: true }).fill("7");
  await form.getByRole("button", { name: "Validate submission" }).click();
  await expect(form.getByRole("status")).toContainText("Name is required");
  await expect(form.getByRole("status")).toContainText("Maximum must be at least minimum");
  expect(await page.evaluate(() => window.forms.pluginSession.prepareSave())).toMatchObject({
    status: "ready",
  });
  expect(await page.evaluate(() => window.forms.pluginSource())).toContain('"name":""');
  expect(await page.evaluate(() => window.forms.pluginSource())).not.toContain('"tags"');
  await expect(
    page.locator("#plugin1").getByRole("textbox", { name: "min", exact: true })
  ).toHaveValue("7");
  expect(await page.evaluate(() => window.forms.pluginStack.length)).toBe(1);
  await page.evaluate(() => window.forms.pluginStack.undo());
  await expect(form.getByRole("textbox", { name: "name", exact: true })).toHaveValue("Ada");
});

test("two views conflict instead of overwriting drafts", async ({ page }) => {
  await page.locator("#plugin0").getByRole("textbox", { name: "name", exact: true }).fill("One");
  await page.locator("#plugin1").getByRole("textbox", { name: "name", exact: true }).fill("Two");
  expect(await page.evaluate(() => window.forms.pluginSession.prepareSave())).toMatchObject({
    status: "conflict",
  });
  expect(await page.evaluate(() => window.forms.pluginStack.length)).toBe(0);
  await page.locator("#plugin0").getByRole("button", { name: "Apply answers" }).click();
  await page.locator("#plugin1").getByRole("button", { name: "Apply answers" }).click();
  await expect(page.locator("#plugin1").getByRole("status")).toContainText("changed");
  expect(await page.evaluate(() => window.forms.pluginStack.length)).toBe(1);
});

test("standalone controls use the same draft barrier and reject unencodable input", async ({
  page,
}) => {
  const form = page.locator("#standalone");
  await form.getByRole("textbox", { name: "age", exact: true }).fill("-");
  expect(await page.evaluate(() => window.forms.session.prepareSave())).toMatchObject({
    status: "unencodable",
  });
  await form.getByRole("textbox", { name: "age", exact: true }).fill("-2");
  expect(await page.evaluate(() => window.forms.session.prepareSave())).toMatchObject({
    status: "ready",
  });
  expect(await page.evaluate(() => window.forms.standalone.validateSubmission())).toMatchObject({
    success: false,
  });
  expect(await page.evaluate(() => window.forms.stack.length)).toBe(1);
});

test("per-view read-only and session history authorization remain separate", async ({ page }) => {
  await page.evaluate(() => (window.forms.editors[0].readOnly = true));
  const first = page.locator("#native0").getByRole("textbox", { name: "name", exact: true });
  await expect(first).toHaveAttribute("readonly", "");
  await page.locator("#native1").getByRole("textbox", { name: "name", exact: true }).fill("Other");
  expect(await page.evaluate(() => window.forms.session.prepareSave())).toMatchObject({
    status: "ready",
  });
  await expect(first).toHaveValue("Other");
  await page.evaluate(() => window.forms.session.setWriteAllowed(false));
  expect(
    await page.evaluate(async () => {
      try {
        await window.forms.stack.undo();
        return false;
      } catch {
        return true;
      }
    })
  ).toBe(true);
  await expect(first).toHaveValue("Other");
});

test("raw drafts conflict with changed source and blur cannot overwrite it", async ({ page }) => {
  const raw = page.getByRole("textbox", { name: "Raw Markdown source" });
  const initial = await raw.inputValue();
  await raw.fill(initial.replace("Ada", "Raw draft"));
  await page
    .locator("#native0")
    .getByRole("textbox", { name: "name", exact: true })
    .fill("Form edit");
  await page.locator("#native0").getByRole("button", { name: "Apply answers" }).click();
  expect(await page.evaluate(() => window.forms.session.prepareSave())).toMatchObject({
    status: "conflict",
  });
  expect(await page.evaluate(() => window.forms.source())).toContain("Form edit");
  await expect(raw).toHaveValue(initial.replace("Ada", "Raw draft"));
});

test("external replacement retains detached drafts and malformed YAML remains raw", async ({
  page,
}) => {
  await page
    .locator("#native0")
    .getByRole("textbox", { name: "name", exact: true })
    .fill("Local draft");
  await page.evaluate(() => window.forms.rawReplace("---\nname: [\n---\nRaw body"));
  expect(await page.evaluate(() => window.forms.session.prepareSave())).toMatchObject({
    status: "refused",
  });
  expect(
    await page.evaluate(() => window.forms.session.pendingDrafts.some((d) => d.detached))
  ).toBe(true);
  expect(await page.evaluate(() => window.forms.source())).toBe("---\nname: [\n---\nRaw body");
  await expect(page.locator("#native0 .schema-form")).toHaveCount(0);
});

test("schema changes flush drafts and conflicting path tags leave raw source", async ({ page }) => {
  await page
    .locator("#native0")
    .getByRole("textbox", { name: "name", exact: true })
    .fill("Before switch");
  expect(await page.evaluate(() => window.forms.changePath("locations/pier.md"))).toMatchObject({
    status: "ready",
  });
  expect(await page.evaluate(() => window.forms.source())).toContain("Before switch");
  await expect(page.locator("#native0 .schema-form")).toHaveCount(0);
  await expect(page.locator("#forms-status")).toContainText("conflicts with its path");
  expect(await page.evaluate(() => window.forms.changePath("characters/ada.md"))).toMatchObject({
    status: "ready",
  });
  await expect(
    page.locator("#native0").getByRole("textbox", { name: "name", exact: true })
  ).toHaveValue("Before switch");
});

test("save preparation preserves disk conflicts and later local edits stay dirty", async ({
  page,
}) => {
  await page
    .locator("#native0")
    .getByRole("textbox", { name: "name", exact: true })
    .fill("Unsaved");
  await page.evaluate(() => window.forms.externalDiskWrite());
  expect(await page.evaluate(() => window.forms.save())).toBe("disk-conflict");
  expect(await page.evaluate(() => window.forms.disk().seenHash)).toBe(1);
  expect(await page.evaluate(() => window.forms.source())).toContain("Unsaved");
});

test("a successful earlier save does not mark later edits as saved", async ({ page }) => {
  expect(
    await page.evaluate(async () => {
      window.forms.setSaveHook(async () => {
        const block = window.forms.session.doc.blocks[1].id;
        await window.forms.session.dispatch(
          {
            type: "insertText",
            at  : { anchor: { block, offset: 0 }, head: { block, offset: 0 } },
            text: "New ",
          },
          window.forms.editors[0].ctx
        );
      });
      return window.forms.save();
    })
  ).toBe("saved");
  expect(
    await page.evaluate(() => window.forms.disk().savedRevision < window.forms.session.revision)
  ).toBe(true);
  await expect(page.locator("#forms-status")).toContainText("newer edits remain unsaved");
});

test("composition blocks save until the field finishes and rendered values stay text", async ({
  page,
}) => {
  const input = page.locator("#native0").getByRole("textbox", { name: "name", exact: true });
  await input.fill("<img src=x onerror=alert(1)>");
  await input.dispatchEvent("compositionstart", { bubbles: true, composed: true });
  expect(await page.evaluate(() => window.forms.session.prepareSave())).toMatchObject({
    status: "refused",
  });
  await input.dispatchEvent("compositionend", { bubbles: true, composed: true });
  expect(await page.evaluate(() => window.forms.session.prepareSave())).toMatchObject({
    status: "ready",
  });
  await expect(page.locator("#native0 .schema-form img")).toHaveCount(0);
});
