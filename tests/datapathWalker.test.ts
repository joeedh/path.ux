import { DataAPI, DataStruct } from "../scripts/path-controller/controller/controller";
// @ts-expect-error - pure JS build helper, no type decls
import { walkAPI, normalizePath } from "../buildtools/datapath-walker.mjs";
import { test, expect } from "vitest";

interface Entry {
  path: string;
  kind: string;
  indexed: boolean;
  propType?: string;
  uiname?: string;
  range?: number[];
  unit?: string;
  enumItems?: string[];
  dynamic?: boolean;
}

function buildApi() {
  class Brush {
    size = 1;
    color = [0, 0, 0, 1];
  }
  class Path {
    closed = false;
  }
  class Canvas {
    paths: Path[] = [];
  }

  const api = new DataAPI();
  const root = new DataStruct();
  api.setRoot(root);

  const brushDef = api.mapStruct(Brush);
  brushDef.float("size", "size", "Size").range(0.25, 1024).unit("pixel");
  brushDef.color4("color", "color", "Color");

  const pathDef = api.mapStruct(Path);
  pathDef.bool("closed", "closed", "Closed");

  const canvasDef = api.mapStruct(Canvas);
  canvasDef.list<Path[]>("paths", "paths", {
    get(_api: DataAPI, list: Path[], key: number) {
      return list[key];
    },
    getKey(_api: DataAPI, list: Path[], obj: Path) {
      return list.indexOf(obj);
    },
    getIter(_api: DataAPI, list: Path[]) {
      return list[Symbol.iterator]();
    },
    getLength(_api: DataAPI, list: Path[]) {
      return list.length;
    },
    getStruct() {
      return pathDef;
    },
  });

  root.struct("brush", "brush", "Brush", brushDef);
  root.struct("canvas", "canvas", "Canvas", canvasDef);

  return api;
}

test("walkAPI enumerates known leaf paths", () => {
  const entries = walkAPI(buildApi()) as Entry[];
  const byPath = new Map(entries.map((e) => [e.path, e]));

  expect(byPath.has("brush.size")).toBe(true);
  expect(byPath.has("brush.color")).toBe(true);
  expect(byPath.has("canvas.paths")).toBe(true);
  // list element struct walked under [n]
  expect(byPath.has("canvas.paths[n].closed")).toBe(true);

  const size = byPath.get("brush.size")!;
  expect(size.kind).toBe("prop");
  expect(size.propType).toBe("FloatProperty");
  expect(size.uiname).toBe("Size");
  expect(size.unit).toBe("pixel");
  expect(size.range).toEqual([0.25, 1024]);

  // default float range (+/-1e17) must not leak through as a real range
  expect(byPath.get("canvas.paths[n].closed")!.range).toBeUndefined();
});

test("walkAPI marks indexed paths and normalizePath collapses indices", () => {
  const entries = walkAPI(buildApi()) as Entry[];
  const closed = entries.find((e) => e.path === "canvas.paths[n].closed")!;
  expect(closed.indexed).toBe(true);
  expect(normalizePath("canvas.paths[0].closed")).toBe("canvas.paths[n].closed");
  expect(normalizePath("canvas.paths[42].closed")).toBe("canvas.paths[n].closed");
});

test("walkAPI terminates on cyclic struct references", () => {
  class Node {}
  const api = new DataAPI();
  const root = new DataStruct();
  api.setRoot(root);

  const nodeDef = api.mapStruct(Node);
  nodeDef.float("value", "value", "Value");
  // self-reference: a node that points at another node of the same struct
  nodeDef.struct("child", "child", "Child", nodeDef);
  root.struct("node", "node", "Node", nodeDef);

  const entries = walkAPI(api, { maxDepth: 8 }) as Entry[];
  // must not hang and must include the leaf at least once
  expect(entries.some((e) => e.path === "node.value")).toBe(true);
  expect(entries.length).toBeLessThan(1000);
});
