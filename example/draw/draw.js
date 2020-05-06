import * as nstructjs from '../util/struct.js';
import * as util from '../util/util.js';
import {Vector2, Vector3, Vector4, Matrix4} from "../../scripts/vectormath.js";
import {color2css} from "../../scripts/ui_theme.js";
let STRUCT = nstructjs.STRUCT;

export const DrawFlags = {
  BLUR  : 1,
  COLOR : 2
};

export const PathTypes = {
  PATH    : 0,
  CIRCLE  : 1,
  RECT    : 2
};

export class Material {
  constructor() {
    this.color = new Vector4([0,0,0,1]);
    this.blur = 0;
    this.flag = 0;
  }
}
Material.STRUCT = `
Material {
  color : vec4;
  blur  : float;
  flag  : int;
}
`;
nstructjs.register(Material);

export class CanvasPoint extends Vector2 {
  constructor(co) {
    super(co);

    this.paths = [];
    this.edges = [];
    this.id = -1;
  }
}
CanvasPoint.STRUCT = STRUCT.inherit(CanvasPoint, Vector2) + `
  id    : int;
  edges : array(e, int) | e.id;
}
`;
nstructjs.register(CanvasPoint);

export class CanvasEdge extends Vector2 {
  constructor() {
    super();

    this.id = -1;
    this.material = new Material();
  }
}
CanvasEdge.STRUCT = STRUCT.inherit(CanvasEdge, Vector2) + `
  id       : int;
  material : Material;
  v1       : int | obj.v1.id;
  v2       : int | obj.v2.id;
}
`;
nstructjs.register(CanvasEdge);

export class CanvasPath {
  constructor() {
    this.type = PathTypes.PATH;
    this.id = -1;
    this.material = new Material();

    this.verts = [];
  }
}
CanvasPath.STRUCT = STRUCT.inherit(CanvasPath, Vector2) + `
  id       : int;
  material : Material;
  verts    : array(e, int) | e.id;
  flag     : int;
  type     : int;
}
`;
nstructjs.register(CanvasPath);

export class ElementArray extends Array {
  constructor() {
    super();

    this.highlight = undefined;
    this.active = undefined;
  }

  loadSTRUCT(reader) {
    reader(this);

    for (let item of this._items) {
      this.push(item);
    }

    delete this._items;
  }
}
ElementArray.STRUCT = `
ElementArray {
  _items     : array(abstract(Object)) | obj;
  active     : int | this.active !== undefined ? this.active.id : -1;
  highlight  : int | this.highlight !== undefined ? this.highlight.id : -1;
}
`;

export class Canvas {
  constructor() {
    this.verts = [];
    this.edges = [];
    this.paths = [];

    this.drawflag = DrawFlags.BLUR | DrawFlags.COLOR;

    this.idgen = 0;
    this.indexMap = {};

    this.needsUpdate = true;
    this.drawTask = undefined;

    this.idmap = {};
  }

  isDeadElement(e) {
    let dead = e === undefined;
    dead = dead || !(e.id in this.idmap);

    return dead;
  }

  killVertex(v) {
    while (v.edges.length > 0) {
      this.killEdge(v.edges[0]);
    }

    while (v.paths.length > 0) {
      this.killPath(v.paths[0]);
    }
  }

  killEdge(e) {
    e.v1.edges.remove(e);
    e.v2.edges.remove(e);
    this.edges.remove(e);
    delete this.idmap[e.id];
  }

  killPath(p) {
    for (let v of p.verts) {
      v.paths.remove(p);
    }

    delete this.idmap[p.id];
    this.paths.remove(p);

    if (this.paths.active === p) {
      this.paths.active = this.paths[this.paths.length-1];
    }
  }

  makeVertex(co) {
    let v = new CanvasPoint(co);

    v.id = this.idgen++;
    //this.indexMap[v.id] = this.verts.length;
    this.verts.push(v);
    this.idmap[v.id] = v;

    return v;
  }

  makeEdge(v1, v2) {
    let e = new CanvasEdge();

    e.v1 = v1;
    e.v2 = v2;

    v1.edges.push(e);
    v2.edges.push(e);

    e.id = this.idgen++;

    //this.indexMap[e.id] = this.edges.length;
    this.edges.push(e);
    this.idmap[e.id] = e;

    return e;
  }

  makePath(verts) {
    let p = new CanvasPath();

    for (let v of verts) {
      p.verts.push(v);
      v.paths.push(p);
    }

    p.id = this.idgen++;

    this.indexMap[p.id] = this.paths.length;
    this.paths.push(p);
    this.idmap[p.id] = p;

    this.paths.active = p;

    return p;
  }

  loadSTRUCT(reader) {
    reader(this);

    let idmap = this.idmap = {};
    let indexmap = this.indexMap = {};

    let lists = [this.verts, this.edges, this.paths];
    for (let list of lists) {
      let i = 0;

      for (let e of list) {
        idmap[e.id] = e;
        indexmap[e.id] = i;
        i++;
      }

      if (list.active !== undefined) {
        list.active = idmap[list.active];
      }
      if (list.highlight !== undefined) {
        list.highlight = idmap[list.highlight];
      }
    }


    for (let e of this.edges) {
      e.v1 = idmap[e.v1];
      e.v2 = idmap[e.v2];
    }

    for (let v of this.verts) {
      for (let i=0; i<v.edges.length; i++) {
        v.edges = idmap[v.edges];
      }
    }

    for (let p of this.paths) {
      for (let i=0; i<p.verts.length; i++) {
        p.verts[i] = idmap[p.verts[i]];
        p.verts[i].paths.push(p);
      }
    }
  }

  update() {
    this.needsUpdate = true;
  }

  asyncFullDraw(g, canvas) {
    let idend = 0;

    if (this.drawTask !== undefined) {
      window.clearInterval(this.drawTask);
    }

    let time = 0, first=true;

    let time2 = 0;
    let time0 = util.time_ms();

    this.drawTask = 1;
    let animreq = 0;

    let f = () => {
      if (first) {
        g.save();
        g.resetTransform();
        g.clearRect(0, 0, canvas.width, canvas.height);
        g.restore();

        first = false;
      }

      time = util.time_ms();
      while (util.time_ms() - time < 30) {
        if (idend >= this.paths.length) {
          console.warn("clear task", idend, this.paths.length, time2.toFixed(4), (util.time_ms()-time0).toFixed(4));
          this.drawTask = undefined;
          return;
        }
        let s = util.time_ms();

        let delta = 60;
        this.draw(canvas, g, idend, idend + delta, true, true);
        idend += delta;

        let time3 = util.time_ms() - s;
        time2 = Math.max(time2, time3);
      }

      animreq = requestAnimationFrame(f);
    };

    animreq = requestAnimationFrame(f);
  }

  draw(canvas, g, idstart=undefined, idend=this.idgen, force=false, use_idx=false) {
    if (this.paths.active === undefined) {
      this.paths.active = this.paths[this.paths.length-1];
    }

    let doblur = this.drawflag & DrawFlags.BLUR;
    let docolor = this.drawflag & DrawFlags.COLOR;

    if (idstart === undefined) {
      console.log("full canvas draw");
      this.asyncFullDraw(g, canvas);
      return;
      g.save();
      g.resetTransform();
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.restore();
      idstart = -1;
    }

    if (this.drawTask !== undefined && !force) {
      return;
    }

    let i=0;

    if (use_idx && idstart in this.indexMap) {
      i = Math.max(this.indexMap[idstart]-10, 0);
    } else if (use_idx) {
      i = idstart;
    }

    for (; i<this.paths.length; i++) {
      let p = this.paths[i];

      if (!use_idx && p.id < idstart) {
        continue;
      }

      if (!use_idx && p.id >= idend) {
        break;
      }

      if (use_idx && i >= idend) {
        break;
      }

      let blur = p.material.blur;
      if (!doblur)
        blur = 0;

      let bluroff = 10000;

      if (blur) {
        g.save();
        g.shadowBlur = blur;

        let color = p.material.color;

        g.fillStyle = !docolor ? "black" : color2css(color);
        g.shadowColor = color2css([color[0], color[1], color[2]]);


        g.translate(-bluroff, -bluroff);
        g.shadowOffsetX = bluroff;
        g.shadowOffsetY = bluroff;
      }

      g.beginPath();
      g.fillStyle = color2css(p.material.color);

      if (p.type === PathTypes.CIRCLE) {
        let r = p.verts[1].vectorDistance(p.verts[0]);
        g.arc(p.verts[0][0], p.verts[0][1], r, -Math.PI, Math.PI);
      } else {
        let first=true;

        for (let v of p.verts) {
          if (first) {
            first = false;
            g.moveTo(v[0], v[1]);
          } else {
            g.lineTo(v[0], v[1]);
          }
        }
      }

      g.fill();

      if (blur) {
        g.shadowBlur = 0;
        g.restore();
      }
    }
  }
};

Canvas.STRUCT = `
Canvas {
  verts : array(CanvasPoint);
  edges : array(CanvasEdge);
  paths : array(CanvasPath);
  idgen : int;
  drawflag : int;
}
`;
nstructjs.register(Canvas);
