"use strict";

import { Vector2 } from "./vectormath";
import * as math from "./math";
import * as util from "./util";

import { Constraint, Solver } from "./solver";
import cconst from "../config/const";

let idgen = 0;

// @ts-ignore - Vector2 is a factory-produced class, extending works at runtime
export class PackNodeVertex extends (Vector2 as unknown as {
  new (co?: unknown): InstanceType<typeof Vector2>;
}) {
  node: PackNode;
  _id: number;
  edges: PackNodeVertex[];
  _absPos: InstanceType<typeof Vector2>;

  constructor(node: PackNode, co?: number[] | InstanceType<typeof Vector2>) {
    super(co);

    this.node = node;
    this._id = idgen++;
    this.edges = [];
    this._absPos = new Vector2(undefined as unknown as number[]);
  }

  get absPos(): InstanceType<typeof Vector2> {
    this._absPos.load!(this).add!(this.node.pos);
    return this._absPos;
  }

  [Symbol.keystr](): string {
    return "" + this._id;
  }
}

export class PackNode {
  pos: InstanceType<typeof Vector2>;
  vel: InstanceType<typeof Vector2>;
  oldpos: InstanceType<typeof Vector2>;
  _id: number;
  size: InstanceType<typeof Vector2>;
  verts: PackNodeVertex[];

  constructor() {
    this.pos = new Vector2(undefined as unknown as number[]);
    this.vel = new Vector2(undefined as unknown as number[]);
    this.oldpos = new Vector2(undefined as unknown as number[]);
    this._id = idgen++;
    this.size = new Vector2(undefined as unknown as number[]);
    this.verts = [];
  }

  [Symbol.keystr](): string {
    return "" + this._id;
  }
}

function copyGraph(nodes: PackNode[]): PackNode[] {
  const ret: PackNode[] = [];
  const idmap: Record<number, PackNode | PackNodeVertex> = {};

  for (const n of nodes) {
    const n2 = new PackNode();
    n2._id = n._id;
    n2.pos.load!(n.pos);
    n2.vel.load!(n.vel);
    n2.size.load!(n.size);

    n2.verts = [];
    idmap[n2._id] = n2;

    for (const v of n.verts) {
      const v2 = new PackNodeVertex(n2, v as unknown as InstanceType<typeof Vector2>);
      v2._id = v._id;
      idmap[v2._id] = v2;

      n2.verts.push(v2);
    }

    ret.push(n2);
  }

  for (const n of nodes) {
    for (const v of n.verts) {
      const v2 = idmap[v._id] as PackNodeVertex;

      for (const v3 of v.edges) {
        v2.edges.push(idmap[v3._id] as PackNodeVertex);
      }
    }
  }

  return ret;
}

function getCenter(nodes: PackNode[]): InstanceType<typeof Vector2> {
  const cent = new Vector2(undefined as unknown as number[]);

  for (const n of nodes) {
    cent.add!(n.pos);
  }

  if (nodes.length === 0) return cent;

  cent.mulScalar!(1.0 / nodes.length);

  return cent;
}

function loadGraph(nodes: PackNode[], copy: PackNode[]): void {
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].pos.load!(copy[i].pos);
    nodes[i].oldpos.load!(copy[i].oldpos);
    nodes[i].vel.load!(copy[i].vel);
  }
}

export function graphGetIslands(nodes: PackNode[]): PackNode[][] {
  const islands: PackNode[][] = [];
  const visit1 = new util.set();

  const rec = (n: PackNode, island: PackNode[]): void => {
    island.push(n);
    visit1.add(n);

    for (const v of n.verts) {
      for (const e of v.edges) {
        const n2 = e.node;
        if (n2 !== n && !visit1.has(n2)) {
          rec(n2, island);
        }
      }
    }
  };

  for (const n of nodes) {
    if (visit1.has(n)) {
      continue;
    }

    const island: PackNode[] = [];
    islands.push(island);
    rec(n, island);
  }

  return islands;
}

export function graphPack(
  nodes: PackNode[],
  margin: number = 15,
  steps: number = 10,
  updateCb?: () => boolean | void
): { stop: () => void } | void {
  const orignodes = nodes;
  nodes = copyGraph(nodes);

  for (const n of nodes) {
    n.pos[0] += (Math.random() - 0.5) * 5.0;
    n.pos[1] += (Math.random() - 0.5) * 5.0;
  }

  const nodemap: Record<number, PackNode | PackNodeVertex> = {};
  for (const n of nodes) {
    n.vel.zero!();
    nodemap[n._id] = n;
    for (const v of n.verts) {
      nodemap[v._id] = v;
    }
  }

  let visit = new util.set();
  const verts = new util.set();
  const isect: [PackNode, PackNode][] = [];

  let disableEdges = false;

  function edge_c(params: [PackNodeVertex, PackNodeVertex]): number {
    const [v1, v2] = params;

    if (disableEdges) return 0;

    return v1.absPos.vectorDistance!(v2.absPos);
  }

  const p1 = new Vector2(undefined as unknown as number[]);
  const p2 = new Vector2(undefined as unknown as number[]);
  const s1 = new Vector2(undefined as unknown as number[]);
  const s2 = new Vector2(undefined as unknown as number[]);

  function loadBoxes(n1: PackNode, n2: PackNode, margin1: number = margin): void {
    p1.load!(n1.pos);
    p2.load!(n2.pos);
    s1.load!(n1.size);
    s2.load!(n2.size);

    p1.subScalar!(margin1);
    p2.subScalar!(margin1);
    s1.addScalar!(margin1 * 2.0);
    s2.addScalar!(margin1 * 2.0);
  }

  let disableArea = false;

  function area_c(params: [PackNode, PackNode]): number {
    const [n1, n2] = params;

    if (disableArea) return 0.0;

    loadBoxes(n1, n2);

    const a1 = n1.size[0] * n1.size[1];
    const a2 = n2.size[0] * n2.size[1];

    return math.aabb_overlap_area(p1, s1, p2, s2);
    return math.aabb_overlap_area(p1, s1, p2, s2) / (a1 + a2);
  }

  let lasterr: number | undefined;
  let besterr: number | undefined;
  let best: PackNode[] | undefined;
  let err: number;

  const islands = graphGetIslands(nodes);
  const fakeVerts: PackNodeVertex[] = [];
  for (const island of islands) {
    const n = island[0];
    const fv = new PackNodeVertex(n);
    fakeVerts.push(fv);
  }

  const solveStep1 = (_gk: number = 1.0): Solver => {
    const solver = new Solver();

    isect.length = 0;
    visit = new util.set();

    if (fakeVerts.length > 1) {
      for (let i = 1; i < fakeVerts.length; i++) {
        const v1 = fakeVerts[0];
        const v2 = fakeVerts[i];

        const con = new Constraint(
          "edge_c",
          edge_c as (params: unknown) => number,
          [v1.node.pos as unknown as Float64Array, v2.node.pos as unknown as Float64Array],
          [v1, v2]
        );
        con.k = 0.25;
        solver.add(con);
      }
    }

    for (const n1 of nodes) {
      for (const v of n1.verts) {
        verts.add(v);
        for (const v2 of v.edges) {
          //hueristic to avoid adding same constraint twice
          if (v2._id < v._id) continue;

          const con = new Constraint(
            "edge_c",
            edge_c as (params: unknown) => number,
            [v.node.pos as unknown as Float64Array, v2.node.pos as unknown as Float64Array],
            [v, v2]
          );
          con.k = 1.0;
          solver.add(con);
        }
      }

      for (const n2 of nodes) {
        if (n1 === n2) continue;
        const key = Math.min(n1._id, n2._id) + ":" + Math.max(n1._id, n2._id);
        if (visit.has(key as unknown as PackNode)) continue;

        loadBoxes(n1, n2);
        const area = math.aabb_overlap_area(p1, s1, p2, s2);

        if (area > 0.01) {
          isect.push([n1, n2]);
          visit.add(key as unknown as PackNode);
        }
      }

      for (const [n1, n2] of isect) {
        const con = new Constraint(
          "area_c",
          area_c as (params: unknown) => number,
          [n1.pos as unknown as Float64Array, n2.pos as unknown as Float64Array],
          [n1, n2]
        );
        solver.add(con);
        con.k = 1.0;
      }
    }

    return solver;
  };

  let i = 1;
  const solveStep = (gk: number = 0.5): number => {
    let solver = solveStep1();

    if (i % 40 === 0.0) {
      const c1 = getCenter(nodes);

      const rfac = 1000.0;

      if (best) loadGraph(nodes, best);

      for (const n of nodes) {
        n.pos[0] += (Math.random() - 0.5) * rfac;
        n.pos[1] += (Math.random() - 0.5) * rfac;
        n.vel.zero!();
      }

      const c2 = getCenter(nodes);
      c1.sub!(c2);

      for (const n of nodes) {
        n.pos.add!(c1);
      }
    }

    let err = 1e17;

    for (const n of nodes) {
      n.oldpos.load!(n.pos);
      n.pos.addFac!(n.vel, 0.5);
    }

    disableEdges = false;
    disableArea = true;
    solver.solve(1, gk);

    //solve so boxes don't overlap
    disableEdges = true;
    disableArea = false;

    for (let j = 0; j < 10; j++) {
      solver = solveStep1();
      err = solver.solve(10, gk);
    }

    for (const n of nodes) {
      n.vel.load!(n.pos).sub!(n.oldpos);
    }

    //get error from edge constraints

    disableEdges = false;
    disableArea = true;

    err = 0.0;
    for (const con of solver.constraints) {
      err += con.evaluate(true);
    }

    disableEdges = false;
    disableArea = false;

    /*
    loadGraph(orignodes, nodes);
    if (updateCb) {
      updateCb();
    }//*/

    lasterr = err;

    const add = Math.random() * (besterr ?? 0) * Math.exp(-i * 0.1);

    if (besterr === undefined || err < besterr + add) {
      best = copyGraph(nodes);
      besterr = err;
    }

    i++;

    return err;
  };

  for (let j = 0; j < steps; j++) {
    solveStep();
  }

  loadGraph(orignodes, best ? best : nodes);

  if (updateCb) {
    const extNodes = nodes as PackNode[] & { _timer?: number };

    if (extNodes._timer !== undefined) {
      window.clearInterval(extNodes._timer);
    }

    extNodes._timer = window.setInterval(() => {
      const time = util.time_ms();

      while (util.time_ms() - time < 50) {
        const err = solveStep();
      }

      if (cconst.DEBUG.boxPacker) {
        console.log(
          "err",
          ((besterr ?? 0) / nodes.length).toFixed(2),
          ((lasterr ?? 0) / nodes.length).toFixed(2),
          "isects",
          isect.length
        );
      }

      if (best) loadGraph(orignodes, best);

      if (updateCb!() === false) {
        clearInterval(extNodes._timer);
        return;
      }
    }, 100);

    const timer = extNodes._timer;

    return {
      stop: () => {
        if (best) loadGraph(nodes, best);

        window.clearInterval(timer);
        extNodes._timer = undefined;
      },
    };
  }
}
