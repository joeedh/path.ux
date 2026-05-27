import {nstructjs, Vector2, Vector3, Vector4, Matrix4, util,
        color2css} from '../pathux.js';

export const DrawFlags = {
  BLUR  : 1,
  COLOR : 2
};

export const PathTypes = {
  PATH    : 0,
  CIRCLE  : 1,
  RECT    : 2
};

export type CanvasElement = CanvasPoint | CanvasEdge | CanvasPath;

export class Material {
  static STRUCT: string;

  color: Vector4;
  blur: number;
  flag: number;

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
  static STRUCT: string;

  paths: CanvasPath[];
  edges: CanvasEdge[];
  id: number;

  constructor(co?: number[] | Vector2) {
    super(co);

    this.paths = [];
    this.edges = [];
    this.id = -1;
  }
}
CanvasPoint.STRUCT = nstructjs.inherit(CanvasPoint, Vector2) + `
  id    : int;
  edges : array(e, int) | e.id;
}
`;
nstructjs.register(CanvasPoint);

export class CanvasEdge extends Vector2 {
  static STRUCT: string;

  id: number;
  material: Material;
  v1: CanvasPoint | undefined;
  v2: CanvasPoint | undefined;

  constructor() {
    super();

    this.id = -1;
    this.material = new Material();
    this.v1 = undefined;
    this.v2 = undefined;
  }
}
CanvasEdge.STRUCT = nstructjs.inherit(CanvasEdge, Vector2) + `
  id       : int;
  material : Material;
  v1       : int | obj.v1.id;
  v2       : int | obj.v2.id;
}
`;
nstructjs.register(CanvasEdge);

export class CanvasPath {
  static STRUCT: string;

  type: number;
  id: number;
  material: Material;
  verts: CanvasPoint[];
  flag: number;

  constructor() {
    this.type = PathTypes.PATH;
    this.id = -1;
    this.material = new Material();
    this.flag = 0;

    this.verts = [];
  }
}
CanvasPath.STRUCT = nstructjs.inherit(CanvasPath, Vector2) + `
  id       : int;
  material : Material;
  verts    : array(e, int) | e.id;
  flag     : int;
  type     : int;
}
`;
nstructjs.register(CanvasPath);

export class ElementArray<T = CanvasElement> extends Array<T> {
  static STRUCT: string;

  highlight: T | undefined;
  active: T | undefined;
  _items?: T[];

  constructor() {
    super();

    this.highlight = undefined;
    this.active = undefined;
  }

  loadSTRUCT(reader: nstructjs.StructReader<this>) {
    reader(this);

    for (const item of this._items!) {
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
  static STRUCT: string;

  verts: ElementArray<CanvasPoint>;
  edges: ElementArray<CanvasEdge>;
  paths: ElementArray<CanvasPath>;
  drawflag: number;
  idgen: number;
  indexMap: Record<number, number>;
  needsUpdate: boolean;
  drawTask: number | undefined;
  idmap: Record<number, CanvasElement>;

  constructor() {
    this.verts = new ElementArray<CanvasPoint>();
    this.edges = new ElementArray<CanvasEdge>();
    this.paths = new ElementArray<CanvasPath>();

    this.drawflag = DrawFlags.BLUR | DrawFlags.COLOR;

    this.idgen = 0;
    this.indexMap = {};

    this.needsUpdate = true;
    this.drawTask = undefined;

    this.idmap = {};
  }

  clear() {
    this.verts.length = 0;
    this.edges.length = 0;
    this.paths.length = 0;
    this.indexMap = {};
    this.idmap = {};
    this.idgen = 0;

    return this;
  }

  copyTo(b: Canvas) {
    b.clear();
    b.idgen = this.idgen;

    let i = 0;
    for (const v of this.verts) {
      this.indexMap[v.id] = i++;
    }

    i = 0;
    for (const e of this.edges) {
      this.indexMap[e.id] = i++;
    }

    i = 0;
    for (const p of this.paths) {
      this.indexMap[p.id] = i++;
    }

    for (const v1 of this.verts) {
      const v2 = new CanvasPoint(v1);
      v2.id  = v1.id;

      b.idmap[v2.id] = v2;
      b.verts.push(v2);
    }

    for (const e1 of this.edges) {
      const i1 = this.indexMap[e1.v1!.id];
      const i2 = this.indexMap[e1.v2!.id];

      const v1 = b.verts[i1];
      const v2 = b.verts[i2];

      const e2 = new CanvasEdge();

      e2.v1 = v1;
      e2.v2 = v2;

      e2.id = e1.id;
      this.idmap[e2.id] = e2;
      this.edges.push(e2);
    }

    for (const p1 of this.paths) {
      const vs = p1.verts.map(v => b.idmap[v.id] as CanvasPoint);
      const p2 = new CanvasPath();

      p2.verts = vs;
      p2.id = p1.id;
      b.idmap[p2.id] = p2;
      b.paths.push(p2);
    }

    for (const v1 of this.verts) {
      const v2 = b.idmap[v1.id] as CanvasPoint;

      for (const e1 of v2.edges) {
        const e2 = b.idmap[e1.id] as CanvasEdge;

        v2.edges.push(e2);
      }
    }
  }
  isDeadElement(e: CanvasElement | undefined) {
    let dead = e === undefined;
    dead = dead || !(e!.id in this.idmap);

    return dead;
  }

  killVertex(v: CanvasPoint) {
    while (v.edges.length > 0) {
      this.killEdge(v.edges[0]);
    }

    while (v.paths.length > 0) {
      this.killPath(v.paths[0]);
    }
  }

  killEdge(e: CanvasEdge) {
    e.v1!.edges.remove(e);
    e.v2!.edges.remove(e);
    this.edges.remove(e);
    delete this.idmap[e.id];
  }

  killPath(p: CanvasPath) {
    for (const v of p.verts) {
      v.paths.remove(p);
    }

    delete this.idmap[p.id];
    this.paths.remove(p);

    if (this.paths.active === p) {
      this.paths.active = this.paths[this.paths.length-1];
    }
  }

  makeVertex(co?: number[] | Vector2) {
    const v = new CanvasPoint(co);

    v.id = this.idgen++;
    //this.indexMap[v.id] = this.verts.length;
    this.verts.push(v);
    this.idmap[v.id] = v;

    return v;
  }

  makeEdge(v1: CanvasPoint, v2: CanvasPoint) {
    const e = new CanvasEdge();

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

  makePath(verts: CanvasPoint[]) {
    const p = new CanvasPath();

    for (const v of verts) {
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

  loadSTRUCT(reader: nstructjs.StructReader<this>) {
    reader(this);

    const idmap = this.idmap = {} as Record<number, CanvasElement>;
    const indexmap = this.indexMap = {} as Record<number, number>;

    const lists: ElementArray<CanvasElement>[] = [
      this.verts as ElementArray<CanvasElement>,
      this.edges as ElementArray<CanvasElement>,
      this.paths as ElementArray<CanvasElement>,
    ];
    for (const list of lists) {
      let i = 0;

      for (const e of list) {
        idmap[e.id] = e;
        indexmap[e.id] = i;
        i++;
      }

      // active/highlight are stored as int ids and relinked here.
      if (list.active !== undefined) {
        list.active = idmap[list.active as unknown as number];
      }
      if (list.highlight !== undefined) {
        list.highlight = idmap[list.highlight as unknown as number];
      }
    }


    for (const e of this.edges) {
      e.v1 = idmap[e.v1 as unknown as number] as CanvasPoint;
      e.v2 = idmap[e.v2 as unknown as number] as CanvasPoint;
    }

    for (const v of this.verts) {
      for (let i=0; i<v.edges.length; i++) {
        v.edges[i] = idmap[v.edges[i] as unknown as number] as CanvasEdge;
      }
    }

    for (const p of this.paths) {
      for (let i=0; i<p.verts.length; i++) {
        p.verts[i] = idmap[p.verts[i] as unknown as number] as CanvasPoint;
        p.verts[i].paths.push(p);
      }
    }
  }

  update() {
    this.needsUpdate = true;
  }

  asyncFullDraw(g: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    let idend = 0;

    if (this.drawTask !== undefined) {
      window.clearInterval(this.drawTask);
    }

    let time = 0; let first=true;

    let time2 = 0;

    this.drawTask = 1;

    const f = () => {
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
          //console.warn("clear task", idend, this.paths.length, time2.toFixed(4), (util.time_ms()-time0).toFixed(4));
          this.drawTask = undefined;
          return;
        }
        const s = util.time_ms();

        const delta = 60;
        this.draw(canvas, g, idend, idend + delta, true, true);
        idend += delta;

        const time3 = util.time_ms() - s;
        time2 = Math.max(time2, time3);
      }

      requestAnimationFrame(f);
    };

    requestAnimationFrame(f);
  }

  draw(canvas: HTMLCanvasElement, g: CanvasRenderingContext2D, idstart?: number,
       idend: number = this.idgen, force = false, use_idx = false) {
    if (this.paths.active === undefined) {
      this.paths.active = this.paths[this.paths.length-1];
    }

    const doblur = this.drawflag & DrawFlags.BLUR;
    const docolor = this.drawflag & DrawFlags.COLOR;

    if (idstart === undefined) {
      //console.log("full canvas draw");
      this.asyncFullDraw(g, canvas);
      return;
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
      const p = this.paths[i];

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

      const bluroff = 10000;

      if (blur) {
        g.save();
        g.shadowBlur = blur;

        const color = p.material.color;

        g.fillStyle = !docolor ? "black" : color2css(color);
        g.shadowColor = color2css([color[0], color[1], color[2]]);


        g.translate(-bluroff, -bluroff);
        g.shadowOffsetX = bluroff;
        g.shadowOffsetY = bluroff;
      }

      g.beginPath();
      g.fillStyle = color2css(p.material.color);

      if (p.type === PathTypes.CIRCLE) {
        const r = p.verts[1].vectorDistance(p.verts[0]);
        g.arc(p.verts[0][0], p.verts[0][1], r, -Math.PI, Math.PI);
      } else {
        let first=true;

        for (const v of p.verts) {
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
