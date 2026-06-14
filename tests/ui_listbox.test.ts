import { test, expect, beforeAll } from "vitest";
import { UIBase } from "../scripts/core/ui_base";
import { ListBox, ListBoxChangeEvent } from "../scripts/widgets/ui_listbox";

beforeAll(() => {
  // resolvePath / theme lookups touch window in node.
  (globalThis as unknown as { window: unknown }).window ||= globalThis;
});

function makeBox(): ListBox {
  const box = UIBase.createElement("listbox-x") as ListBox;
  box._init();
  return box;
}

test("addItem / setActive / active / activeId round-trip", () => {
  const box = makeBox();
  const a = box.addItem("a");
  const b = box.addItem("b");
  box.addItem("c");

  expect(box.items.length).toBe(3);

  box.setActive(b);
  expect(box.active).toBe(b);
  expect(box.activeId).toBe(b.listId);
  expect(b.is_active).toBe(true);
  expect(a.is_active).toBe(false);
});

test("'change' event fires with selection payload", () => {
  const box = makeBox();
  const a = box.addItem("a");
  const b = box.addItem("b");

  const events: ListBoxChangeEvent[] = [];
  box.addEventListener("change", (e) => events.push(e));

  box.setActive(b);
  expect(events.length).toBe(1);
  expect(events[0]).toBeInstanceOf(ListBoxChangeEvent);
  expect(events[0].selection.id).toBe(b.listId);
  expect(events[0].selection.item).toBe(b);

  // re-selecting the already-active item must not fire again.
  box.setActive(b);
  expect(events.length).toBe(1);

  box.setActive(a);
  expect(events.length).toBe(2);
});

test("deprecated on_change still fires (id, item)", () => {
  const box = makeBox();
  const a = box.addItem("a");

  const calls: [unknown, unknown][] = [];
  box.on_change = (id, item) => calls.push([id, item]);

  box.setActive(a);
  expect(calls).toEqual([[a.listId, a]]);
});

test("removeItem of the active item clears selection and fires change", () => {
  const box = makeBox();
  const a = box.addItem("a");
  box.addItem("b");
  box.setActive(a);

  const events: ListBoxChangeEvent[] = [];
  box.addEventListener("change", (e) => events.push(e));

  box.removeItem(a);
  expect(box.active).toBeUndefined();
  expect(box.items.length).toBe(1);
  expect(events.length).toBe(1);
  expect(events[0].selection.id).toBeUndefined();
});

test("removeItem works by id and by reference", () => {
  const box = makeBox();
  const a = box.addItem("a", 10);
  const b = box.addItem("b", 20);

  box.removeItem(10); // by id
  expect(box.items.includes(a)).toBe(false);
  expect(box.idmap.has(10)).toBe(false);

  box.removeItem(b); // by reference
  expect(box.items.length).toBe(0);
  expect(box.idmap.has(20)).toBe(false);
});

test("removeItem on unknown id warns and is a no-op", () => {
  const box = makeBox();
  box.addItem("a");
  // missing id -> guarded, no throw
  expect(() => box.removeItem(999)).not.toThrow();
  expect(box.items.length).toBe(1);
});

test("clear empties items, idmap, and active", () => {
  const box = makeBox();
  box.addItem("a");
  const b = box.addItem("b");
  box.setActive(b);

  box.clear();
  expect(box.items.length).toBe(0);
  expect(box.idmap.size).toBe(0);
  expect(box.active).toBeUndefined();
});

test("auto-generated ids never collide after removal", () => {
  const box = makeBox();
  box.addItem("a"); // 0
  box.addItem("b"); // 1
  box.addItem("c"); // 2
  box.removeItem(1);
  const d = box.addItem("d"); // 3

  const liveIds = box.items.map((it) => it.listId);
  // the new id must be unique among the live items
  expect(liveIds.filter((id) => id === d.listId).length).toBe(1);
});

test("auto ids do not collide with explicit numeric ids", () => {
  const box = makeBox();
  box.addItem("x", 5);
  const y = box.addItem("y"); // must be > 5, not a clash

  expect(y.listId).not.toBe(5);
  expect(box.idmap.get(5)).toBeDefined();
  expect(box.idmap.get(y.listId as number)).toBe(y);
});

test("resizeAxes defaults to vertical and reflects to attribute", () => {
  const box = makeBox();
  expect(box.resizeAxes).toBe("y");

  box.resizeAxes = "xy";
  expect(box.resizeAxes).toBe("xy");
  expect(box.getAttribute("resize-axes")).toBe("xy");
});

test("resize grip stays pinned to the visible corner when scrolled", () => {
  const box = makeBox();
  const grip = (box as unknown as { _grip?: HTMLElement })._grip;
  expect(grip).toBeDefined();
  expect(grip!.style.transform).toBe("translate(0px, 0px)");

  box.scrollTop = 50;
  box.scrollLeft = 10;
  box.dispatchEvent(new Event("scroll"));

  expect(grip!.style.transform).toBe("translate(10px, 50px)");
});

test("saveData omits size until the user has resized", () => {
  const box = makeBox();
  expect(box.saveData()._userSized).toBeUndefined();
});

test("saveData/loadData round-trips a user-set size", () => {
  const box = makeBox();
  // simulate a completed resize
  box.style.width = "321px";
  box.style.height = "234px";
  (box as unknown as { _userSized: boolean })._userSized = true;

  const data = box.saveData();
  expect(data).toMatchObject({ width: 321, height: 234, _userSized: true });

  const box2 = makeBox();
  box2.loadData(data);
  expect(box2.style.width).toBe("321px");
  expect(box2.style.height).toBe("234px");

  // a subsequent init() must not clobber the restored size
  box2.init();
  expect(box2.style.width).toBe("321px");
  expect(box2.style.height).toBe("234px");
});
