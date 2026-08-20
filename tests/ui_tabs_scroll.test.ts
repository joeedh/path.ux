import { test, expect } from "vitest";
import { clampTabScroll } from "../scripts/widgets/ui_tabs";

test("a bar showing everything has nowhere to go", () => {
  expect(clampTabScroll(0, 300, 300)).toBe(0);
  expect(clampTabScroll(80, 300, 300)).toBe(0);
  expect(clampTabScroll(-80, 300, 300)).toBe(0);
});

test("a bar wider than its window scrolls up to the difference", () => {
  expect(clampTabScroll(0, 500, 300)).toBe(0);
  expect(clampTabScroll(120, 500, 300)).toBe(120);
  expect(clampTabScroll(200, 500, 300)).toBe(200);
  expect(clampTabScroll(201, 500, 300)).toBe(200);
  expect(clampTabScroll(9999, 500, 300)).toBe(200);
});

test("scrolling back past the first tab stops at it", () => {
  expect(clampTabScroll(-1, 500, 300)).toBe(0);
  expect(clampTabScroll(-9999, 500, 300)).toBe(0);
});

// A window bigger than the contents is what a bar reports the frame it is told it has more
// room than it needs — the difference is negative, and a negative range is no range at all.
test("a window bigger than the contents is no range, not a backwards one", () => {
  expect(clampTabScroll(50, 200, 640)).toBe(0);
  expect(clampTabScroll(-50, 200, 640)).toBe(0);
});

// The last tab lands flush against the end rather than one pad short of it: the extent the
// layout reports already counts the trailing pad, so the maximum offset carries it too.
test("the far end shows the end of the contents", () => {
  const content = 437;
  const visible = 185;
  const scrolled = clampTabScroll(Infinity, content, visible);

  expect(scrolled).toBe(content - visible);
  expect(scrolled + visible).toBe(content);
});
