import { DataAPI, util } from "../scripts/pathux";
import 'jest'

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
  containerDef.list("points", "points", {
    get(api: DataAPI, list: PointContainer, key: number) {
      return list.points[key]
    },
    getKey(api: DataAPI, list: PointContainer, obj: Point) {
      return list.points.indexOf(obj);
    },
    getIter(api: DataAPI, list: PointContainer) {
      return list.points[Symbol.iterator]();
    },
    getLength(api: DataAPI, list: PointContainer) {
      return list.points.length;
    },
    getStruct(api: DataAPI, list: PointContainer, key: number) {
      return pointDef;
    }
  });

  console.log(points)
  
});
