import { beforeAll, describe, expect, test } from "vitest";
import { newMenu, type Menu } from "../scripts/menu/menu";

beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window ||= globalThis;

  // addItemExtra measures its label on a 2d context, which happy-dom does not implement
  HTMLCanvasElement.prototype.getContext = function () {
    return { font: "", measureText: (text: string) => ({ width: text.length * 7 }) };
  } as unknown as HTMLCanvasElement["getContext"];
});

function buildMenu(labels: string[]): Menu {
  const menu = newMenu("test") as Menu;
  for (const label of labels) menu.addItem(label, label);
  return menu;
}

/** The labels of the rows `dom` shows, in order. */
function shown(menu: Menu): string[] {
  return menu.items
    .filter((item) => item.parentNode === menu.dom && !item.hidden)
    .map((item) => item.textContent!.trim());
}

describe("Menu.startSearch", () => {
  test("a menu searched, closed and searched again holds one search box", () => {
    const menu = buildMenu(["alpha", "beta", "gamma"]);

    for (let i = 0; i < 3; i++) {
      menu.closed = false;
      menu.startSearch();
      menu.close();
    }
    menu.closed = false;
    menu.startSearch();

    const boxes = [...menu.container.children].filter((child) => child.contains(menu.textbox));
    expect(boxes).toHaveLength(1);
    expect(menu.container.querySelectorAll("textbox-x")).toHaveLength(1);
  });

  test("closing drops the search box", () => {
    const menu = buildMenu(["alpha", "beta"]);
    menu.startSearch();
    menu.close();

    expect(menu.container.children).toHaveLength(0);
  });

  test("a filter typed in one search does not hide rows in the next", () => {
    const menu = buildMenu(["alpha", "beta", "gamma"]);
    menu.startSearch();
    menu.textbox.text = "bet";
    (menu.textbox as unknown as { on_change: () => void }).on_change();
    expect(shown(menu)).toEqual(["beta"]);
    menu.close();

    menu.closed = false;
    menu.startSearch();
    expect(shown(menu)).toEqual(["alpha", "beta", "gamma"]);
  });
});
