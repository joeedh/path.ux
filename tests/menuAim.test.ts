import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { newMenu, type Menu } from "../scripts/menu/menu";
import { aimTriangle, insideAimTriangle } from "../scripts/menu/menu_aim";
import type { MenuItem } from "../scripts/menu/menu_types";

beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window ||= globalThis;
});

afterEach(() => {
  vi.useRealTimers();
  if (window.DEBUG) {
    window.DEBUG.drawMenuTri = false;
  }
});

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left,
    top,
    width,
    height,
    right : left + width,
    bottom: top + height,
    x     : left,
    y     : top,
  } as DOMRect;
}

describe("aimTriangle", () => {
  test("reaches the near edge of a submenu to the right", () => {
    const tri = aimTriangle({ x: 100, y: 50 }, rect(150, 0, 80, 200));
    expect(tri[1]).toEqual({ x: 150, y: 0 });
    expect(tri[2]).toEqual({ x: 150, y: 200 });
    expect(tri[0].x).toBeLessThan(100);
  });

  test("reaches the near edge of a submenu to the left", () => {
    const tri = aimTriangle({ x: 100, y: 50 }, rect(0, 0, 60, 200));
    expect(tri[1].x).toBe(60);
    expect(tri[0].x).toBeGreaterThan(100);
  });

  test("contains a diagonal move toward the submenu, not a move straight down", () => {
    const tri = aimTriangle({ x: 100, y: 50 }, rect(150, 0, 80, 200));
    expect(insideAimTriangle({ x: 130, y: 70 }, tri)).toBe(true);
    expect(insideAimTriangle({ x: 100, y: 90 }, tri)).toBe(false);
  });
});

/** A parent menu with a submenu row followed by two plain rows; the submenu sits to its right. */
function buildMenus() {
  const parent = newMenu("parent") as Menu;
  const sub = newMenu("sub") as Menu;
  sub.addItem("inner", "inner");

  parent.addItem(sub, "sub");
  parent.addItem("below", "below");
  parent.addItem("further", "further");

  sub.dom.getBoundingClientRect = () => rect(150, 0, 80, 200);

  const row = (id: string) => parent.items.find((item) => item._id === id) as MenuItem;
  return { parent, sub, row };
}

function hover(li: MenuItem, x: number, y: number) {
  li.dispatchEvent(new PointerEvent("pointermove", { clientX: x, clientY: y }));
}

describe("Menu safe triangle", () => {
  test("a row crossed on the way to the submenu does not take the hover", () => {
    const { parent, sub, row } = buildMenus();

    hover(row("sub"), 100, 10);
    expect(parent._submenu).toBe(sub);

    hover(row("below"), 120, 25);
    expect(parent.activeItem).toBe(row("sub"));
    expect(parent._submenu).toBe(sub);
  });

  test("a row outside the triangle takes the hover at once", () => {
    const { parent, row } = buildMenus();

    hover(row("sub"), 100, 10);
    hover(row("further"), 100, 60);

    expect(parent.activeItem).toBe(row("further"));
    expect(parent._submenu).toBeUndefined();
  });

  test("a pointer resting inside the triangle takes the hover after the delay", () => {
    vi.useFakeTimers();
    const { parent, row } = buildMenus();

    hover(row("sub"), 100, 10);
    hover(row("below"), 120, 25);
    expect(parent.activeItem).toBe(row("sub"));

    vi.advanceTimersByTime(1000);
    expect(parent.activeItem).toBe(row("below"));
    expect(parent._submenu).toBeUndefined();
  });

  test("leaving the held row cancels its pending hover", () => {
    vi.useFakeTimers();
    const { parent, row } = buildMenus();

    hover(row("sub"), 100, 10);
    hover(row("below"), 120, 25);
    row("below").dispatchEvent(new PointerEvent("pointerleave"));

    vi.advanceTimersByTime(1000);
    expect(parent.activeItem).toBe(row("sub"));
  });

  test("DEBUG.drawMenuTri draws the triangle, and closing the menu removes it", () => {
    window.DEBUG = { ...window.DEBUG, drawMenuTri: true };
    const { parent, row } = buildMenus();

    hover(row("sub"), 100, 10);
    const svg = parent._aimDebugSvg!;
    expect(svg.isConnected).toBe(true);
    expect(svg.querySelector("polygon")!.getAttribute("points")).toBe("96,10 150,0 150,200");

    parent.close();
    expect(svg.isConnected).toBe(false);
  });
});
