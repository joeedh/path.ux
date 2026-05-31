import { test, expect, beforeAll } from "vitest";
import { DataAPI, DataStruct } from "../scripts/path-controller/controller/controller";
import { UIBase } from "../scripts/core/ui_base";
import { ListBox } from "../scripts/widgets/ui_listbox";

beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window ||= globalThis;
});

class Item {
  constructor(
    public id: number,
    public name: string
  ) {}
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function buildFixture(withActive: boolean) {
  const api = new DataAPI();
  const root = new DataStruct();
  api.setRoot(root);

  const itemDef = api.mapStruct(Item);
  itemDef.int("id", "id", "id");
  itemDef.string("name", "name", "name");

  const arr: Item[] = [new Item(0, "a"), new Item(1, "b"), new Item(2, "c")];
  let activeId: number | undefined = undefined;
  let version = 1;

  const funcs: any[] = [
    function get(_api: any, list: Item[], key: number) {
      return list.find((it) => it.id === key);
    },
    function getKey(_api: any, _list: Item[], obj: Item) {
      return obj.id;
    },
    function getLength(_api: any, list: Item[]) {
      return list.length;
    },
    function getIter(_api: any, list: Item[]) {
      return list;
    },
    function getStruct() {
      return itemDef;
    },
  ];

  if (withActive) {
    funcs.push(
      function getActive(_api: any, list: Item[]) {
        return list.find((it) => it.id === activeId);
      },
      function setActive(_api: any, _list: Item[], val: Item | undefined) {
        activeId = val ? val.id : undefined;
        version++;
      },
      function getVersion() {
        return version;
      }
    );
  }

  root.list("items", "items", funcs);

  const toolstack = {
    cur: undefined as any,
    execTool(ctx: any, tool: any) {
      tool.undoPre(ctx);
      tool.exec(ctx);
      this.cur = tool;
    },
    undo(ctx: any) {
      this.cur?.undo(ctx);
    },
  };

  const ctx: any = { api, toolstack, items: arr };

  return {
    api,
    ctx,
    arr,
    bump       : () => version++,
    getActiveId: () => activeId,
    setActiveId: (v: number | undefined) => {
      activeId = v;
      version++;
    },
  };
}

function makeBox(ctx: any, path = "items"): ListBox<any, number> {
  const box = UIBase.createElement("listbox-x") as ListBox<any, number>;
  // Value-level reference to ListBox: the TS transform elides type-only
  // imports, which would skip ui_listbox's customElements.define side effect
  // and leave the element un-upgraded.
  if (!(box instanceof ListBox)) {
    throw new Error("listbox-x failed to register");
  }
  box.ctx = ctx;
  box._init();
  box.setAttribute("datapath", path);
  return box;
}

test("populates items from a bound DataList", () => {
  const fx = buildFixture(true);
  const box = makeBox(fx.ctx);

  box.updateDataPath();

  expect(box.items.length).toBe(3);
  expect(box.items.map((it) => it.listId)).toEqual([0, 1, 2]);
});

test("uses getItemName for labels when provided", () => {
  const fx = buildFixture(true);
  const box = makeBox(fx.ctx);

  const seen: number[] = [];
  box.itemNames((_obj, key) => {
    seen.push(key);
    return "item-" + key;
  });

  box.updateDataPath();
  expect(seen).toEqual([0, 1, 2]);
});

test("reflects the data list's active element", () => {
  const fx = buildFixture(true);
  const box = makeBox(fx.ctx);
  box.updateDataPath();

  fx.setActiveId(2);
  box.updateDataPath();

  expect(box.activeId).toBe(2);
  expect(box.active?.is_active).toBe(true);
});

test("writes selection back via setActive (direct, no undo)", () => {
  const fx = buildFixture(true);
  const box = makeBox(fx.ctx);
  // update() sets _dataMode, which gates the write-back path.
  box.update();

  box.setActive(box.idmap.get(1));
  expect(fx.getActiveId()).toBe(1);
});

test("writes selection back through an undoable op", () => {
  const fx = buildFixture(true);
  const box = makeBox(fx.ctx);
  box.update();
  box.useActiveUndo = true;

  fx.setActiveId(2); // start with id 2 active
  box.setActive(box.idmap.get(0));
  expect(fx.getActiveId()).toBe(0);

  fx.ctx.toolstack.undo(fx.ctx);
  expect(fx.getActiveId()).toBe(2);
});

test("version fast-path avoids rebuild when unchanged, rebuilds on mutation", () => {
  const fx = buildFixture(true);
  const box = makeBox(fx.ctx);
  box.updateDataPath();

  let rebuilds = 0;
  const origClear = box.clear.bind(box);
  box.clear = () => {
    rebuilds++;
    return origClear();
  };

  box.updateDataPath();
  expect(rebuilds).toBe(0); // version unchanged → no rebuild

  fx.arr.push(new Item(3, "d"));
  fx.bump();
  box.updateDataPath();
  expect(rebuilds).toBe(1);
  expect(box.items.length).toBe(4);
});

test("fallback: list without getActive/setActive/getVersion", () => {
  const fx = buildFixture(false);
  const box = makeBox(fx.ctx);
  box.update();

  // population via O(n) key diff
  expect(box.items.length).toBe(3);

  // selection stays internal, no throw (no setActive callback)
  expect(() => box.setActive(box.idmap.get(1))).not.toThrow();
  expect(box.activeId).toBe(1);

  // key-diff triggers rebuild on structural mutation
  let rebuilds = 0;
  const origClear = box.clear.bind(box);
  box.clear = () => {
    rebuilds++;
    return origClear();
  };
  box.updateDataPath();
  expect(rebuilds).toBe(0);

  fx.arr.push(new Item(9, "z"));
  box.updateDataPath();
  expect(rebuilds).toBe(1);
  expect(box.items.length).toBe(4);
});
