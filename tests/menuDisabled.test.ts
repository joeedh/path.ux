import { beforeAll, describe, expect, test } from "vitest";
import { newMenu, type Menu } from "../scripts/menu/menu";

beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window ||= globalThis;
});

/** A started menu holding `labels`, plus the ids its click dispatch reports. */
function buildMenu(labels: string[]) {
  const menu = newMenu("test") as Menu;
  const picked: (string | number)[] = [];

  for (const label of labels) {
    menu.addItem(label, label);
  }

  menu._onselect = (id) => picked.push(id);

  return { menu, picked };
}

describe("Menu.setItemDisabled", () => {
  test("refuses the click, and keeps refusing until enabled again", () => {
    const { menu, picked } = buildMenu(["open", "save"]);

    menu.setItemDisabled("save", "no document is open");
    menu.setActive(menu.itemById("save"), false);
    menu.click();
    expect(picked).toEqual([]);

    menu.setItemEnabled("save");
    menu._was_clicked = false;
    menu.click();
    expect(picked).toEqual(["save"]);
  });

  test("shows the reason in place of the tooltip, and gives the tooltip back", () => {
    const { menu } = buildMenu(["open"]);
    const item = menu.itemById("open")!;
    item.title = "Open a document";
    item._enabledTitle = item.title;

    menu.setItemDisabled("open", "no workspace yet");
    expect(item.title).toBe("no workspace yet");
    expect(item.classList.contains("disabled")).toBe(true);
    expect(item.getAttribute("aria-disabled")).toBe("true");

    menu.setItemEnabled("open");
    expect(item.title).toBe("Open a document");
    expect(item.classList.contains("disabled")).toBe(false);
  });

  test("disabling twice does not lose the original tooltip", () => {
    const { menu } = buildMenu(["open"]);
    const item = menu.itemById("open")!;
    item.title = "Open a document";
    item._enabledTitle = item.title;

    menu.setItemDisabled("open", "first reason");
    menu.setItemDisabled("open", "second reason");
    menu.setItemEnabled("open");

    expect(item.title).toBe("Open a document");
  });

  test("isItemDisabled answers false for a row that is not there", () => {
    const { menu } = buildMenu(["open"]);

    expect(menu.isItemDisabled("open")).toBe(false);
    menu.setItemDisabled("open");
    expect(menu.isItemDisabled("open")).toBe(true);
    expect(menu.isItemDisabled("no-such-row")).toBe(false);
  });
});

describe("keyboard selection", () => {
  test("walks past a disabled row", () => {
    const { menu } = buildMenu(["a", "b", "c"]);
    menu.setItemDisabled("b", "not now");

    menu.setActive(menu.itemById("a"), false);
    menu.selectNext(false);
    expect(menu.activeItem?._id).toBe("c");

    menu.selectPrev(false);
    expect(menu.activeItem?._id).toBe("a");
  });

  test("terminates when every row is disabled", () => {
    const { menu } = buildMenu(["a", "b"]);
    menu.setItemDisabled("a");
    menu.setItemDisabled("b");

    menu.setActive(menu.itemById("a"), false);
    menu.selectNext(false);

    // Nowhere to go, so the walk wraps back rather than hanging
    expect(menu.activeItem?._id).toBe("a");
  });

  test("picks the first enabled row when nothing is active", () => {
    const { menu } = buildMenu(["a", "b", "c"]);
    menu.setItemDisabled("a");

    menu.selectNext(false);
    expect(menu.activeItem?._id).toBe("b");
  });
});

describe("setActive", () => {
  test("leaves a disabled row unhighlighted", () => {
    const { menu } = buildMenu(["a", "b"]);
    menu.setItemDisabled("b", "not now");

    const enabled = menu.itemById("a")!;
    const disabled = menu.itemById("b")!;

    menu.setActive(enabled, false);
    const highlight = enabled.style["backgroundColor"];

    // The highlight is written inline, so a stylesheet rule could not undo it
    menu.setActive(disabled, false);
    expect(disabled.style["backgroundColor"]).not.toBe(highlight);
    expect(disabled.style["backgroundColor"]).toBe(menu.getDefault("MenuBG"));
  });
});

describe("submenu rows", () => {
  test("a menu marked rowDisabled cannot be opened from its parent", () => {
    const parent = newMenu("parent") as Menu;
    const sub = newMenu("sub") as Menu;

    sub.rowDisabled = true;
    sub.rowDisabledReason = "nothing to add yet";
    parent.addItem(sub, "sub");

    const row = parent.itemById("sub")!;
    expect(row._disabled).toBe(true);
    expect(row.title).toBe("nothing to add yet");

    row.dispatchEvent(new Event("focus"));
    expect(parent._submenu).toBeUndefined();
  });

  test("an enabled submenu still opens", () => {
    const parent = newMenu("parent") as Menu;
    const sub = newMenu("sub") as Menu;

    parent.addItem(sub, "sub");
    parent.itemById("sub")!.dispatchEvent(new Event("focus"));

    expect(parent._submenu).toBe(sub);
  });
});

describe("theme", () => {
  test("the disabled rule reaches the stylesheet", () => {
    const { menu } = buildMenu(["a"]);
    menu.buildStyle();

    expect(menu.menustyle.textContent).toContain(".menuitem.disabled");
    expect(menu.getDefault("MenuTextDisabled")).toBeTruthy();
  });
});
