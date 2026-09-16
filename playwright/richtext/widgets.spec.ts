import { expect, test } from "@playwright/test";
import { build } from "esbuild";
import type {} from "./widgets_fixture";

let bundle: string;
test.beforeAll(async () => {
  const result = await build({
    entryPoints: ["playwright/richtext/widgets_fixture.ts"],
    bundle     : true,
    write      : false,
    target     : "es2022",
    format     : "esm",
    external   : ["fs", "path", "electron"],
  });
  bundle = result.outputFiles[0].text;
});

test.beforeEach(async ({ page }) => {
  await page.route("**/widgets.js", (route) =>
    route.fulfill({ contentType: "application/javascript", body: bundle })
  );
  await page.goto("http://localhost:5050/playwright/richtext/widgets.html");
  await expect(page.locator("#view0").getByRole("textbox", { name: "Answer" })).toBeVisible();
});

test("two views preserve independent drafts, focus and committed undo", async ({ page }) => {
  const input = page.locator("#view0").getByRole("textbox", { name: "Answer" });
  const other = page.locator("#view1").getByRole("textbox", { name: "Answer" });
  await input.fill("draft");
  await input.evaluate((el) => (el as HTMLInputElement).setSelectionRange(2, 4));
  await page.evaluate(() => window.widgets.neighboringEdit());
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("draft");
  await expect(other).toHaveValue("saved");
  expect(await page.evaluate(() => window.widgets.session.prepareSave())).toMatchObject({
    status: "ready",
  });
  await expect(input).toBeFocused();
  await expect(other).toHaveValue("draft");
  expect(
    await input.evaluate((el) => [
      (el as HTMLInputElement).selectionStart,
      (el as HTMLInputElement).selectionEnd,
    ])
  ).toEqual([2, 4]);
  await input.press("Control+z");
  await expect(other).toHaveValue("saved");
  await expect(input).toBeFocused();
});

test("legacy media elements keep rerender semantics and share event ownership", async ({
  page,
}) => {
  const input = page.locator("#legacy").getByRole("textbox", { name: "Legacy media" });
  await input.fill("local draft");
  expect(await page.evaluate(() => window.widgets.ctx.toolstack.length)).toBe(0);
  await page.evaluate(() => {
    const { legacySession, ctx } = window.widgets;
    const block = legacySession.doc.blocks[0].id;
    return legacySession.dispatch(
      {
        type: "insertText",
        text: "x",
        at  : { anchor: { block, offset: 0 }, head: { block, offset: 0 } },
      },
      ctx
    );
  });
  await expect(input).toHaveValue("initial");
  expect(await page.evaluate(() => window.widgets.legacyCalls())).toBe(2);
});

test("Tab, Escape, inner clipboard and deletion never become prose edits", async ({ page }) => {
  const input = page.locator("#view0").getByRole("textbox", { name: "Answer" });
  const slot = page.locator('#view0 [data-doc-widget="field"]');
  await page.evaluate(() =>
    window.widgets.editors[0].select({
      anchor: { block: "before", offset: 0 },
      head  : { block: "before", offset: 0 },
    })
  );
  await page.keyboard.press("Tab");
  await expect(input).toBeFocused();
  await slot.focus();
  await slot.press("Enter");
  await expect(input).toBeFocused();
  await input.fill("abc");
  await input.press("Backspace");
  expect(
    await input.evaluate((el) => {
      const results: boolean[] = [];
      for (const type of ["copy", "cut", "paste", "drop", "pointerdown"]) {
        results.push(
          el.dispatchEvent(new Event(type, { bubbles: true, composed: true, cancelable: true }))
        );
      }
      results.push(
        el.dispatchEvent(
          new InputEvent("beforeinput", {
            inputType : "insertFromPaste",
            data      : "pasted",
            bubbles   : true,
            composed  : true,
            cancelable: true,
          })
        )
      );
      return results;
    })
  ).toEqual([true, true, true, true, true, true]);
  expect(
    await page.evaluate(() => window.widgets.doc.blocks.find((b) => b.id === "field")?.text)
  ).toBe("saved");
  await input.press("Tab");
  await expect(
    page.locator("#view0").getByRole("button", { name: "Accept", exact: true })
  ).toBeFocused();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(
      () => window.widgets.editors[0].shadowRoot?.activeElement === window.widgets.editors[0].root
    )
  ).toBe(true);
  await input.focus();
  await input.press("Escape");
  expect(
    await page.evaluate(
      () => window.widgets.editors[0].shadowRoot?.activeElement === window.widgets.editors[0].root
    )
  ).toBe(true);
});

test("conflicting and unencodable drafts survive save and navigation", async ({ page }) => {
  await page.locator("#view0").getByRole("textbox", { name: "Answer" }).fill("first");
  await page.locator("#view1").getByRole("textbox", { name: "Answer" }).fill("second");
  expect(await page.evaluate(() => window.widgets.session.prepareSave())).toMatchObject({
    status: "conflict",
  });
  await page.evaluate(() => {
    const { session } = window.widgets;
    session.discardDraft(session.pendingDrafts[1].id);
  });
  await page.locator("#view0").getByRole("textbox", { name: "Answer" }).fill("!");
  expect(await page.evaluate(() => window.widgets.session.prepareSave())).toMatchObject({
    status: "unencodable",
  });
  await page.evaluate(() => {
    window.widgets.editors[0].session = undefined;
  });
  expect(await page.evaluate(() => window.widgets.session.pendingDrafts)).toMatchObject([
    { detached: true },
  ]);
  expect(
    await page.evaluate(() => {
      const session = window.widgets.session;
      return session.recoverDraft(session.pendingDrafts[0].id);
    })
  ).toBe("!");
  expect(await page.evaluate(() => window.widgets.session.prepareSave())).toMatchObject({
    status: "refused",
  });
});

test("policy denial precedes factories and shared history preserves its cursor", async ({
  page,
}) => {
  await page.evaluate(() => window.widgets.allow(false));
  expect(await page.evaluate(() => window.widgets.counts())).toEqual({ created: 2, disposed: 2 });
  await page.evaluate(() => window.widgets.allow(true));
  await page.evaluate(() => window.widgets.replaceImplementation());
  expect(await page.evaluate(() => window.widgets.counts())).toEqual({ created: 6, disposed: 4 });
  await page.evaluate(() => window.widgets.neighboringEdit());
  expect(
    await page.evaluate(async () => {
      const { session, ctx, doc } = window.widgets;
      session.setWriteAllowed(false);
      const before = ctx.toolstack.cur;
      try {
        await ctx.toolstack.undo();
      } catch {
        // The assertion checks that refusal preserved the cursor and data
      }
      return { before, after: ctx.toolstack.cur, text: doc.blocks[0].text };
    })
  ).toEqual({ before: 0, after: 0, text: "!before" });
  await expect(page.locator("#view0").getByRole("textbox", { name: "Answer" })).toHaveAttribute(
    "readonly",
    ""
  );
});

test("opted-in iframe retains its document during same-block edits and cross-block moves", async ({
  page,
}) => {
  const frame = page.frameLocator("#media iframe");
  await expect(frame.locator("body")).toHaveText("local fixture");
  const token = await frame
    .locator("body")
    .evaluate(() => (window as unknown as { token: number }).token);
  await expect
    .poll(() => frame.locator("video").evaluate((el) => (el as HTMLVideoElement).currentTime))
    .toBeGreaterThan(0);
  const played = await frame
    .locator("video")
    .evaluate((el) => (el as HTMLVideoElement).currentTime);
  await page.evaluate(async () => {
    const { mediaSession, ctx } = window.widgets;
    const block = mediaSession.doc.blocks[0];
    await mediaSession.dispatch(
      {
        type: "insertText",
        text: "x",
        at: {
          anchor: { block: block.id, offset: 0 },
          head  : { block: block.id, offset: 0 },
        },
      },
      ctx
    );
    const atom = block.atoms[0];
    const next = mediaSession.doc.blocks[1];
    await mediaSession.dispatch(
      {
        type  : "custom",
        name  : "moveAtom",
        blocks: [block.id, next.id],
        data: { from: { block: block.id, offset: atom.offset }, to: { block: next.id, offset: 0 } },
      },
      ctx
    );
  });
  expect(
    await frame.locator("body").evaluate(() => (window as unknown as { token: number }).token)
  ).toBe(token);
  await expect
    .poll(() => frame.locator("video").evaluate((el) => (el as HTMLVideoElement).currentTime))
    .toBeGreaterThan(played);
});

test("native draft undo and stale acceptance cannot alter document history", async ({ page }) => {
  const input = page.locator("#view0").getByRole("textbox", { name: "Answer" });
  await input.focus();
  await input.press("Control+a");
  await page.keyboard.type("draft");
  await input.press("Control+z");
  await expect(input).toHaveValue("saved");
  expect(await page.evaluate(() => window.widgets.ctx.toolstack.length)).toBe(0);
  await input.fill("stale");
  const other = page.locator("#view1").getByRole("textbox", { name: "Answer" });
  await other.fill("external");
  await other.press("Enter");
  await input.press("Enter");
  await expect(input).toHaveValue("stale");
  expect(await page.evaluate(() => window.widgets.doc.blocks[1].text)).toBe("external");
  expect(await page.evaluate(() => window.widgets.ctx.toolstack.length)).toBe(1);
});

test("outer deletion disposes both views and undo restores identity and committed data", async ({
  page,
}) => {
  await page.locator("#view0").getByRole("textbox", { name: "Answer" }).fill("recover me");
  await page.evaluate(async () => {
    const { session, ctx } = window.widgets;
    await session.dispatch(
      { type: "replaceBlocks", after: "before", blocks: [], remove: ["field"] },
      ctx
    );
  });
  expect(await page.evaluate(() => window.widgets.counts())).toEqual({ created: 2, disposed: 2 });
  await expect(page.locator("#view0").getByRole("textbox", { name: "Answer" })).toHaveCount(0);
  await page.evaluate(() => window.widgets.ctx.toolstack.undo());
  await expect(page.locator("#view0").getByRole("textbox", { name: "Answer" })).toHaveValue(
    "saved"
  );
  expect(await page.evaluate(() => window.widgets.doc.blocks[1].id)).toBe("field");
  expect(
    await page.evaluate(() => {
      const session = window.widgets.session;
      return session.recoverDraft(session.pendingDrafts[0].id);
    })
  ).toBe("recover me");
});

test("view read-only blocks its drafts while another view and application history remain authorized", async ({
  page,
}) => {
  const input = page.locator("#view0").getByRole("textbox", { name: "Answer" });
  await input.fill("local");
  await page.evaluate(() => {
    window.widgets.editors[0].readOnly = true;
  });
  expect(await page.evaluate(() => window.widgets.session.prepareSave())).toMatchObject({
    status: "refused",
  });
  await page.evaluate(() => {
    const session = window.widgets.session;
    session.discardDraft(session.pendingDrafts[0].id);
  });
  const other = page.locator("#view1").getByRole("textbox", { name: "Answer" });
  await other.fill("authorized");
  await other.press("Enter");
  await expect(input).toHaveValue("authorized");
  await page.evaluate(() => window.widgets.ctx.toolstack.undo());
  await expect(input).toHaveValue("saved");
});

test("composition inside a shadow control holds updates without creating prose history", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "CDP composition injection requires Chromium");
  const input = page.locator("#view0").getByRole("textbox", { name: "Answer" });
  await input.focus();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.imeSetComposition", { text: "漢", selectionStart: 1, selectionEnd: 1 });
  await page.evaluate(() => window.widgets.refresh());
  await expect(input).toBeFocused();
  await cdp.send("Input.insertText", { text: "漢" });
  await expect(input).toBeFocused();
  expect(await page.evaluate(() => window.widgets.ctx.toolstack.length)).toBe(0);
  expect(
    await page.evaluate(() => window.widgets.doc.blocks.find((b) => b.id === "field")?.text)
  ).toBe("saved");
  await cdp.send("Input.imeSetComposition", { text: "字", selectionStart: 1, selectionEnd: 1 });
  await page.evaluate(() => window.widgets.allow(false));
  await expect(input).toHaveCount(0);
  expect(await page.evaluate(() => window.widgets.session.pendingDrafts)).toMatchObject([
    { detached: true },
  ]);
  await cdp.detach();
});
