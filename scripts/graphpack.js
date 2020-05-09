"use strict";

import {Vector2} from "./vectormath.js";
import * as math from './math.js';
import * as util from './util.js';

import {Constraint, Solver} from './solver.js';

let idgen = 0;

export class PackNodeVertex extends Vector2 {
  constructor(node, co) {
    super(co);

    this.node = node;
    this._id = idgen++;
    this.edges = [];
    this._absPos = new Vector2();
  }

  get absPos() {
    this._absPos.load(this).add(this.node.pos);
    return this._absPos;
  }

  [Symbol.keystr]() {
    return this._id;
  }
}

export class PackNode {
  constructor() {
    this.pos = new Vector2();
    this.vel = new Vector2();
    this.oldpos = new Vector2();
    this._id = idgen++;
    this.size = new Vector2();
    this.verts = [];
  }

  [Symbol.keystr]() {
    return this._id;
  }
}

function copyGraph(nodes) {
  let ret = [];
  let idmap = {};

  for (let n of nodes) {
    let n2 = new PackNode();
    n2._id = n._id;
    n2.pos.load(n.pos);
    n2.vel.load(n.vel);
    n2.size.load(n.size);

    n2.verts = [];
    idmap[n2._id] = n2;

    for (let v of n.verts) {
      let v2 = new PackNodeVertex(n2, v);
      v2._id = v._id;
      idmap[v2._id] = v2;

      n2.verts.push(v2);
    }

    ret.push(n2);
  }

  for (let n of nodes) {
    for (let v of n.verts) {
      let v2 = idmap[v._id];

      for (let v3 of v.edges) {
        v2.edges.push(idmap[v3._id]);
      }
    }
  }

  return ret;
}

function getCenter(nodes) {
  let cent = new Vector2();

  for (let n of nodes) {
    cent.add(n.pos);
  }

  if (nodes.length === 0)
    return cent;

  cent.mulScalar(1.0 / nodes.length);

  return cent;
}

function loadGraph(nodes, copy) {
  let idmap = {};

  for (let i=0; i<nodes.length; i++) {
    nodes[i].pos.load(copy[i].pos);
    nodes[i].oldpos.load(copy[i].oldpos);
    nodes[i].vel.load(copy[i].vel);
  }
}

export function graphGetIslands(nodes) {
  let islands = [];
  let visit1 = new util.set();

  let rec = (n, island) => {
    island.push(n);
    visit1.add(n);

    for (let v of n.verts) {
      for (let e of v.edges) {
        let n2 = e.node;
        if (n2 !== n && !visit1.has(n2)) {
          rec(n2, island);
        }
      }
    }
  };

  for (let n of nodes) {
    if (visit1.has(n)) {
      continue;
    }

    let island = [];
    islands.push(island);
    rec(n, island);
  }

  return islands;
}

export function graphPack(nodes, margin=15, steps=10, updateCb=undefined) {
  let orignodes = nodes;
  nodes = copyGraph(nodes);

  for (let n of nodes) {
    n.pos[0] += (Math.random()-0.5)*5.0;
    n.pos[1] += (Math.random()-0.5)*5.0;
  }

  let nodemap = {};
  for (let n of nodes) {
    n.vel.zero();
    nodemap[n._id] = n;
    for (let v of n.verts) {
      nodemap[v._id] = v;
    }
  }

  let visit = new util.set();
  let verts = new util.set();
  let isect = [];

  let disableEdges = false;

  function edge_c(params) {
    let [v1, v2] = params;

    if (disableEdges) return 0;

    return v1.absPos.vectorDistance(v2.absPos);
  }

  let p1 = new Vector2();
  let p2 = new Vector2();
  let s1 = new Vector2();
  let s2 = new Vector2();

  function loadBoxes(n1, n2, margin1=margin) {
    p1.load(n1.pos);
    p2.load(n2.pos);
    s1.load(n1.size);
    s2.load(n2.size);

    p1.subScalar(margin1);
    p2.subScalar(margin1);
    s1.addScalar(margin1*2.0);
    s2.addScalar(margin1*2.0);
  }

  let disableArea = false;

  function area_c(params) {
    let [n1, n2] = params;

    if (disableArea)
      return 0.0;

    loadBoxes(n1, n2);

    let a1 = n1.size[0]*n1.size[1];
    let a2 = n2.size[0]*n2.size[1];

    return math.aabb_overlap_area(p1, s1, p2, s2);
    return (math.aabb_overlap_area(p1, s1, p2, s2) / (a1+a2));
  }

  let lasterr, besterr, best;
  let err;

  let islands = graphGetIslands(nodes);
  let fakeVerts = [];
  for (let island of islands) {
    let n = island[0];
    let fv = new PackNodeVertex(n);
    fakeVerts.push(fv);
  }

  let solveStep1 = (gk=1.0) => {
    let solver = new Solver();

    isect.length = 0;
    visit = new util.set();

    if (fakeVerts.length > 1) {
      for (let i=1; i<fakeVerts.length; i++) {
        let v1 = fakeVerts[0];
        let v2 = fakeVerts[i];

        let con = new Constraint("edge_c", edge_c, [v1.node.pos, v2.node.pos], [v1, v2]);
        con.k = 0.25;
        solver.add(con);
      }
    }

    for (let n1 of nodes) {
      for (let v of n1.verts) {
        verts.add(v);
        for (let v2 of v.edges) {
          //hueristic to avoid adding same constraint twice
          if (v2._id < v._id) continue;

          let con = new Constraint("edge_c", edge_c, [v.node.pos, v2.node.pos], [v, v2]);
          con.k = 1.0;
          solver.add(con);
        }
      }

      for (let n2 of nodes) {
        if (n1 === n2) continue;
        let key = Math.min(n1._id, n2._id) + ":" + Math.max(n1._id, n2._id);
        if (visit.has(key)) continue;

        loadBoxes(n1, n2);
        let area = math.aabb_overlap_area(p1, s1, p2, s2);

        if (area > 0.01) {
          isect.push([n1, n2]);
          visit.add(key);
        }
      }

      for (let [n1, n2] of isect) {
        let con = new Constraint("area_c", area_c, [n1.pos, n2.pos], [n1, n2]);
        solver.add(con);
        con.k = 1.0;
      }
    }

    return solver;
  };

  let i = 1;
  let solveStep = (gk=0.5) => {
    let solver = solveStep1();

    if (i % 40 === 0.0) {
      let c1 = getCenter(nodes);

      let rfac = 1000.0;

      if (best) loadGraph(nodes, best);

      for (let n of nodes) {
        n.pos[0] += (Math.random() - 0.5) * rfac;
        n.pos[1] += (Math.random() - 0.5) * rfac;
        n.vel.zero();
      }

      let c2 = getCenter(nodes);
      c1.sub(c2);

      for (let n of nodes) {
        n.pos.add(c1);
      }
    }

    let err = 1e17;

    for (let n of nodes) {
      n.oldpos.load(n.pos);
      n.pos.addFac(n.vel, 0.5);
    }

    disableEdges = false;
    disableArea = true;
    solver.solve(1, gk);

    //solve so boxes don't overlap
    disableEdges = true;
    disableArea = false;

    for (let j=0; j<10; j++) {
      solver = solveStep1();
      err = solver.solve(10, gk);
    }

    for (let n of nodes) {
      n.vel.load(n.pos).sub(n.oldpos);
    }

    //get error from edge constraints

    disableEdges = false;
    disableArea = true;

    err = 0.0;
    for (let con of solver.constraints) {
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

    let add = Math.random()*besterr*Math.exp(-i*0.1);

    if (besterr === undefined || err < besterr+add) {
      best = copyGraph(nodes);
      besterr = err;
    }

    i++;

    return err;
  };


  for (let j=0; j<steps; j++) {
    solveStep();
  }

  loadGraph(orignodes, best ? best : nodes);

  if (updateCb) {
    if (nodes._timer !== undefined) {
      window.clearInterval(nodes._timer);
    }

    nodes._timer = window.setInterval(() => {
      let time = util.time_ms();

      while (util.time_ms() - time < 50) {
        let err = solveStep();
      }

      if (cconst.DEBUG.boxPacker) {
        console.log("err", (besterr / nodes.length).toFixed(2), (lasterr / nodes.length).toFixed(2), "isects", isect.length);
      }

      if (best) loadGraph(orignodes, best);

      if (updateCb() === false) {
        clearInterval(nodes._timer);
        return;
      }
    }, 100);

    let timer = nodes._timer;

    return {
      stop : () => {
        if (best) loadGraph(nodes, best);

        window.clearInterval(timer);
        nodes._timer = undefined;
      }
    }
  }
}
