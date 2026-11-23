import { test, expect, beforeAll } from "vitest";
import { UIBase } from "../scripts/core/ui_base";
import { AfterAspect, clearAspectCallbacks } from "../scripts/core/aspect";
import "../scripts/pathux";

/** A widget whose hooked methods only count their calls. */
class AspectTestWidget extends UIBase {
  updates = 0;
  styles = 0;
  others = 0;

  static define() {
    return { tagname: "aspect-test-widget-x" };
  }

  update() {
    this.updates++;
  }

  setCSS() {
    this.styles++;
  }

  other() {
    this.others++;
    return "other";
  }
}

type Hookable = { after(cb: () => void): unknown };

beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window ||= globalThis;
  UIBase.register(AspectTestWidget);
});

function make() {
  return document.createElement("aspect-test-widget-x") as AspectTestWidget;
}

test("hooking an older widget's update reaches that widget only", () => {
  const a = make();
  const b = make();
  const hits: string[] = [];

  //the raw form apps use; it used to attach to the last widget constructed (b)
  (a.update as unknown as Hookable).after(() => hits.push("a"));
  a.updateAfter(() => hits.push("a2"));

  b.update();
  expect(hits).toEqual([]);

  a.update();
  expect(hits).toEqual(["a", "a2"]);
  expect(a.updates).toBe(1);
});

test("setCSSAfter and setCSSOnce attach to their own widget", () => {
  const a = make();
  const b = make();
  let after = 0;
  let once = 0;

  a.setCSSAfter(() => after++);
  a.setCSSOnce(() => once++, undefined);

  b.setCSS();
  expect([after, once]).toEqual([0, 0]);

  a.setCSS();
  a.setCSS();
  expect([after, once]).toEqual([2, 1]);
  expect(a.styles).toBe(2);
});

test("clearAspectCallbacks removes hooks and keeps the methods", () => {
  const a = make();
  let hits = 0;
  a.updateAfter(() => hits++);

  clearAspectCallbacks(a);
  a.update();

  expect(hits).toBe(0);
  expect(a.updates).toBe(1);
});

test("other methods are hooked per widget through AfterAspect.get", () => {
  const a = make();
  const b = make();
  let hits = 0;

  //not wrapped up front: only update and setCSS are
  expect((a.other as unknown as Partial<Hookable>).after).toBeUndefined();

  const aspect = AfterAspect.get(a, "other");
  expect(AfterAspect.get(a, "other")).toBe(aspect);
  aspect.after(() => hits++);

  b.other();
  expect(hits).toBe(0);

  a.other();
  expect(hits).toBe(1);
  expect(a.others).toBe(1);
});

test("an unhooked wrapper returns the method's own result", () => {
  const a = make();
  AfterAspect.get(a, "other");
  expect(a.other()).toBe("other");
});
