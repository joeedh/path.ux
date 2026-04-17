import { DataAPI } from "../scripts/path-controller/controller/controller";
import * as util from "../scripts/path-controller/util/util";
import "jest";

test("mass set paths test", () => {
  const rnd = new util.MersenneRandom(0);

  class Point {
    x = 0;
    y = 0;
    sel = false;
    constructor(x: number, y: number, sel: boolean) {
      this.x = x;
      this.y = y;
      this.sel = sel;
    }
  }

  class PointContainer {
    points: Point[] = [];
  }

  let index = 0;
  let points: Point[] = [];
  for (let i = 0; i < 100; i++) {
    points.push(new Point(rnd.random(), rnd.random(), rnd.random() > 0.75));
  }

  const api = new DataAPI();
  const pointDef = api.mapStruct(Point);
  pointDef.float("x", "x");
  pointDef.float("y", "y");
  pointDef.bool("sel", "sel");

  const containerDef = api.mapStruct(PointContainer);
  containerDef
    .list<Point[]>("points", "points", {
      get(api: DataAPI, list: Point[], key: number) {
        return list[key];
      },
      getKey(api: DataAPI, list: Point[], obj: Point) {
        return list.indexOf(obj);
      },
      getIter(api: DataAPI, list: Point[]) {
        return list[Symbol.iterator]();
      },
      getLength(api: DataAPI, list: Point[]) {
        return list.length;
      },
      getStruct(api: DataAPI, list: Point[], key: number) {
        return pointDef;
      },
    })
    .evalMassSetFilter();

  api.rootContextStruct = containerDef;

  const container = new PointContainer();
  container.points = points;

  api.massSetProp(container as any, "points[{$.sel === true}].x", -1);

  let totsel = 0;
  let totchange = 0;
  for (const p of points) {
    totsel += p.sel ? 1 : 0;
    totchange += p.x === -1 ? 1 : 0;
  }

  expect(totsel).toBe(totchange)
});
