import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { DataAPI } from "../scripts/path-controller/controller/controller";
import { DataPathSetOp } from "../scripts/path-controller/controller/controller_ops";
import { ToolStack } from "../scripts/path-controller/toolsys/toolstack";
import { buildToolSysAPI } from "../scripts/path-controller/toolsys/toolsys";
import { _setModalAreaClass } from "../scripts/path-controller/util/simple_events";
import { setPathValueUndo } from "../scripts/core/base/ui_base_datapath";
import type { ContextLike } from "../scripts/path-controller/controller/controller_abstract";
import type { UIBase } from "../scripts/core/ui_base";

const PointFlags = { RED: 1, GREEN: 2, BLUE: 4 };

class Point {
  x = 0;
  sel = false;
  flags = 0;
}

/** Doubles as the data-api root, since path resolution starts at the context. */
class Ctx {
  points: Point[] = [];
  state = {};
  api!: DataAPI<any>;
  toolstack!: ToolStack<any>;
  screen = {} as never;

  toLocked() {
    return this;
  }
}

/** The four members `setPathValueUndo` reads off the widget it is called on. */
class FakeWidget {
  _id = 1;
  pathUndoGen = 0;
  _lastPathUndoGen = 0;
  attrs: Record<string, string> = {};

  constructor(readonly ctx: Ctx) {}

  getAttribute(key: string): string | null {
    return this.attrs[key] ?? null;
  }
  pathSocketUpdate() {}
  undoBreakPoint() {
    this.pathUndoGen++;
  }
}

let ctx: Ctx;
let widget: FakeWidget;
/** Every "change" the model's own x property fired, oldest first. */
let xChanges: number[] = [];

const buildAPI = () => {
  const api = new DataAPI<any>();

  const pointDef = api.mapStruct(Point);
  pointDef.float("x", "x").range(-1000, 1000);
  pointDef.bool("sel", "sel");
  pointDef.flags("flags", "flags", PointFlags);

  const ctxDef = api.mapStruct(Ctx);
  ctxDef
    .list<Point[]>("points", "points", {
      get(_api: DataAPI, list: Point[], key: number) {
        return list[key];
      },
      getKey(_api: DataAPI, list: Point[], obj: Point) {
        return list.indexOf(obj);
      },
      getIter(_api: DataAPI, list: Point[]) {
        return list[Symbol.iterator]();
      },
      getLength(_api: DataAPI, list: Point[]) {
        return list.length;
      },
      getStruct(_api: DataAPI, _list: Point[], _key: number) {
        return pointDef;
      },
    })
    .evalMassSetFilter();

  api.rootContextStruct = ctxDef;
  buildToolSysAPI(api as DataAPI, false);

  return api;
};

/** One drag frame: what a slider does per pointermove. */
const drag = (path: string, value: unknown) =>
  setPathValueUndo(
    widget as unknown as UIBase<any, any, any>,
    ctx as unknown as ContextLike,
    path,
    value
  );

const head = () => ctx.toolstack[ctx.toolstack.cur] as DataPathSetOp<any> | undefined;

let unhandled: unknown[] = [];
const onUnhandled = (error: unknown) => unhandled.push(error);

beforeAll(() => {
  _setModalAreaClass({ lock() {}, unlock() {} });
  process.on("unhandledRejection", onUnhandled);
});

afterAll(() => {
  process.off("unhandledRejection", onUnhandled);
});

beforeEach(() => {
  unhandled = [];
  xChanges = [];

  ctx = new Ctx();
  ctx.api = buildAPI();
  ctx.toolstack = new ToolStack(ctx as never);
  ctx.toolstack.ctx = ctx as never;

  for (let i = 0; i < 4; i++) {
    ctx.points.push(new Point());
  }

  // An op's input property is a copy, and copyTo hands the copy this very
  // callback list, so filter on the receiver to count model writes alone
  const modelProp = ctx.api.resolvePath(ctx as never, "points[0].x")!.prop!;
  modelProp.on("change", function (this: unknown, value: number) {
    if (this === modelProp) {
      xChanges.push(value);
    }
  });

  widget = new FakeWidget(ctx);
});

afterEach(async () => {
  // A dropped rejection would otherwise arrive during an unrelated test
  await new Promise<void>((accept) => setTimeout(accept, 0));
  expect(unhandled).toEqual([]);
});

describe("a drag folds into one undo entry", () => {
  test("the snapshot stays at the pre-drag value across the whole run", async () => {
    ctx.points[0].x = 5;

    for (const v of [10, 20, 30, 40]) {
      await drag("points[0].x", v);
    }

    // Read the snapshot rather than round-tripping: an undo passes either way
    expect(head()!._undo!["points[0].x"]).toBe(5);
    expect(ctx.points[0].x).toBe(40);
  });

  test("N frames with no break point leave one entry holding the last value", async () => {
    for (const v of [1, 2, 3, 4, 5]) {
      await drag("points[0].x", v);
    }

    expect(ctx.toolstack.length).toBe(1);
    expect(ctx.toolstack.cur).toBe(0);
    expect(ctx.points[0].x).toBe(5);

    await ctx.toolstack.undo();
    expect(ctx.points[0].x).toBe(0);
  });

  test("a break point splits the run, and two undos walk back through it", async () => {
    await drag("points[0].x", 1);
    await drag("points[0].x", 2);

    widget.undoBreakPoint();

    await drag("points[0].x", 3);
    await drag("points[0].x", 4);

    expect(ctx.toolstack.length).toBe(2);
    expect(ctx.points[0].x).toBe(4);

    await ctx.toolstack.undo();
    expect(ctx.points[0].x).toBe(2);

    await ctx.toolstack.undo();
    expect(ctx.points[0].x).toBe(0);
  });

  test("the snapshot is retaken every frame", async () => {
    const original = DataPathSetOp.prototype.undoPre;
    let calls = 0;

    DataPathSetOp.prototype.undoPre = function (this: DataPathSetOp<any>, c: never) {
      calls++;
      return original.call(this, c);
    };

    try {
      for (const v of [1, 2, 3, 4, 5]) {
        await drag("points[0].x", v);
      }
    } finally {
      DataPathSetOp.prototype.undoPre = original;
    }

    // Once on the push and once per redo. fullSaveUndo runs through the same
    // method, so this is the count that costs; foldOrExec takes it to 1
    expect(calls).toBe(5);
  });

  test("a folded frame writes the model twice", async () => {
    await drag("points[0].x", 1);
    xChanges = [];

    await drag("points[0].x", 2);

    // The head is undone back to the pre-drag value and then re-executed
    expect(xChanges).toEqual([0, 2]);
  });
});

describe("mass set", () => {
  const MASS_PATH = "points[{$.sel === true}].x";

  beforeEach(() => {
    widget.attrs.mass_set_path = MASS_PATH;
    ctx.points[0].sel = true;
    ctx.points[1].sel = true;
  });

  test("every selected path is restored by one undo", async () => {
    ctx.points[1].x = 7;

    await drag("points[0].x", 1);
    await drag("points[0].x", 2);

    expect(ctx.points[1].x).toBe(2);

    await ctx.toolstack.undo();
    expect(ctx.points[0].x).toBe(0);
    expect(ctx.points[1].x).toBe(7);
  });

  test("a path that joins the selection mid-drag is still restored", async () => {
    ctx.points[2].x = 9;

    await drag("points[0].x", 1);

    // the selection filter re-evaluates every frame, so the set can grow mid-drag
    ctx.points[2].sel = true;

    await drag("points[0].x", 2);
    expect(ctx.points[2].x).toBe(2);

    await ctx.toolstack.undo();
    expect(ctx.points[2].x).toBe(9);
  });
});

describe("flag properties", () => {
  test("a flag drag never folds", async () => {
    await drag("points[0].flags[RED]", true);
    await drag("points[0].flags[BLUE]", true);

    expect(ctx.points[0].flags).toBe(PointFlags.RED | PointFlags.BLUE);

    // create chops the subkey off the path before hashing while the widget hashes
    // the unchopped one, so the two can never match; foldOrExec asks both sides
    expect(ctx.toolstack.length).toBe(2);

    await ctx.toolstack.undo();
    await ctx.toolstack.undo();
    expect(ctx.points[0].flags).toBe(0);
  });
});
