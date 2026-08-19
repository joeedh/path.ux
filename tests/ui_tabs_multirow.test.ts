import { test, expect } from "vitest";
import { layoutTabRows } from "../scripts/widgets/ui_tabs";

/** Along-bar extent each row actually occupies, pad included at both ends. */
function rowExtents(sizes: number[], rows: number[], offsets: number[], pad: number) {
  const ends = new Map<number, number>();

  for (let i = 0; i < sizes.length; i++) {
    const end = offsets[i] + sizes[i] + pad;
    ends.set(rows[i], Math.max(ends.get(rows[i]) ?? 0, end));
  }

  return ends;
}

test("everything on one row when it fits", () => {
  const sizes = [30, 40, 50];
  const r = layoutTabRows({ sizes, available: 1000, pad: 5 });

  expect(r.rowCount).toBe(1);
  expect(r.rows).toEqual([0, 0, 0]);
  expect(r.offsets).toEqual([5, 35, 75]);
  expect(r.extent).toBe(130); //5 + 30 + 40 + 50 + 5
});

test("no tabs is still one row, just the two pads", () => {
  const r = layoutTabRows({ sizes: [], available: 100, pad: 4 });

  expect(r.rowCount).toBe(1);
  expect(r.rows).toEqual([]);
  expect(r.offsets).toEqual([]);
  expect(r.extent).toBe(8);
});

test("a tab that would overflow starts the next row", () => {
  //pad 5 either end, so a 100-wide bar holds 90 of tabs
  const sizes = [50, 50, 50];
  const r = layoutTabRows({ sizes, available: 100, pad: 5 });

  expect(r.rowCount).toBe(3);
  expect(r.rows).toEqual([0, 1, 2]);
  expect(r.offsets).toEqual([5, 5, 5]);
});

test("a row is filled before the next one is opened", () => {
  const sizes = [20, 20, 20, 20, 20];
  const r = layoutTabRows({ sizes, available: 50, pad: 5 });

  //40 of tabs per row
  expect(r.rows).toEqual([0, 0, 1, 1, 2]);
  expect(r.offsets).toEqual([5, 25, 5, 25, 5]);
  expect(r.rowCount).toBe(3);
});

test("the boundary is inclusive: a tab that exactly fills the row stays on it", () => {
  const sizes = [45, 45];
  const r = layoutTabRows({ sizes, available: 100, pad: 5 });

  expect(r.rows).toEqual([0, 0]);
  expect(r.extent).toBe(100);

  //one device pixel more and it does not fit
  expect(layoutTabRows({ sizes: [45, 46], available: 100, pad: 5 }).rows).toEqual([0, 1]);
});

test("a tab wider than the whole bar overflows its own row rather than looping", () => {
  const sizes = [500, 20];
  const r = layoutTabRows({ sizes, available: 100, pad: 5 });

  expect(r.rows).toEqual([0, 1]);
  expect(r.offsets).toEqual([5, 5]);
  expect(r.extent).toBe(510);
});

test("an unusable extent puts every tab on its own row without hanging", () => {
  const r = layoutTabRows({ sizes: [10, 10, 10], available: 0, pad: 0 });

  expect(r.rows).toEqual([0, 1, 2]);
  expect(r.rowCount).toBe(3);
});

test("extent reports the widest row, not the last one", () => {
  //rows come out as [80, 30] wide plus pads
  const sizes = [40, 40, 30];
  const r = layoutTabRows({ sizes, available: 90, pad: 5 });

  expect(r.rows).toEqual([0, 0, 1]);
  expect(r.extent).toBe(90);
});

test("rows and offsets stay parallel to the input and never overlap within a row", () => {
  const sizes = [17, 63, 24, 41, 9, 88, 33, 12];
  const pad = 7;
  const available = 160;

  const r = layoutTabRows({ sizes, available, pad });

  expect(r.rows.length).toBe(sizes.length);
  expect(r.offsets.length).toBe(sizes.length);

  for (let i = 1; i < sizes.length; i++) {
    if (r.rows[i] === r.rows[i - 1]) {
      //same row: butted up against the previous tab
      expect(r.offsets[i]).toBe(r.offsets[i - 1] + sizes[i - 1]);
    } else {
      //new row, exactly one further down, starting at the pad
      expect(r.rows[i]).toBe(r.rows[i - 1] + 1);
      expect(r.offsets[i]).toBe(pad);
    }
  }

  //every row but an over-wide one fits, and the reported extent is the true maximum
  const ends = rowExtents(sizes, r.rows, r.offsets, pad);
  expect(Math.max(...ends.values())).toBe(r.extent);

  for (const [row, end] of ends) {
    const only = r.rows.filter((n) => n === row).length === 1;
    if (!only) {
      expect(end).toBeLessThanOrEqual(available);
    }
  }
});
