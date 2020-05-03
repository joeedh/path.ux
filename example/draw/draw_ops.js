import {ToolOp} from "../../scripts/simple_toolsys.js";
import {ListProperty, StringProperty, Vec2Property, Vec4Property, FloatProperty} from "../../scripts/toolprop.js";
import {Vector2} from "../../scripts/vectormath.js";
import {Brushes} from "./brush.js";
import {DynamicsProperty, DynamicsState, DynamicsStateProperty} from '../core/dynamics.js';

export class DrawOp extends ToolOp {
  constructor() {
    super();

    this.last_mpos = undefined;
    this.havePointerEvents = false;
  }

  static tooldef() {return {
    name     : "draw",
    uiname   : "Draw",
    toolpath : "canvas.draw",
    is_modal : true,
    inputs   : {
      brushType    : new StringProperty("circle"),
      brushSize    : new FloatProperty(35.0),
      brushSoft    : new FloatProperty(0.0),
      brushSpacing : new FloatProperty(0.5),
      strokeWidth  : new FloatProperty(1.0),
      strokeColor  : new Vec4Property(),
      fillColor    : new Vec4Property(),
      //duplicate points signify splits in path
      points        : new ListProperty(Vec2Property),
      pointDynamics : new ListProperty(DynamicsStateProperty),
      dynamics      : new DynamicsProperty()
    }
  }}

  static invoke(ctx, args) {
    let ret = super.invoke(ctx, args);

    let ws = ctx.workspace;
    let bs = ws.brush;

    if (!args.brushType)
      ret.inputs.brushType.setValue(bs.type);
    if (!args.fillColor)
      ret.inputs.fillColor.setValue(bs.color);
    if (!args.brushSize)
      ret.inputs.brushSize.setValue(bs.size);
    if (!args.brushSoft)
      ret.inputs.brushSoft.setValue(bs.soft);
    if (!args.brushSpacing)
      ret.inputs.brushSpacing.setValue(bs.spacing);

    ret.inputs.dynamics.setValue(ws.dynamics);

    return ret;
  }

  modalStart(ctx) {
    this._workspace = ctx.workspace;

    return super.modalStart(ctx);
  }
  undoPre(ctx) {
    let canvas = ctx.canvas;

    this._undo = {
      idgen : canvas.idgen
    }
  }

  dynamicsGet(key, dstate, val) {
    let dynamics = this.inputs.dynamics.getValue();

    return dynamics.apply(key, val, dstate);

    return val;
  }

  execPoints(ctx, points, pointDynamics, lastpoint, lastdstate) {
    let canvas = ctx.canvas;
    let brush = Brushes.get(this.inputs.brushType.getValue());
    brush = new brush();

    let color = this.inputs.fillColor.getValue();

    let samplePath = (co, ds) => {
      brush.size = this.dynamicsGet("brushSize", ds, size);
      brush.soft = this.dynamicsGet("brushSoft", ds, soft);
      let opacity2 = this.dynamicsGet("opacity", ds, opacity);

      let paths = brush.genPaths(canvas);

      for (let path of paths) {
        for (let v of path.verts) {
          v.add(co);
        }

        path.material.color.load(color);
        path.material.color[3] = opacity2;
      }
    };

    let size = this.inputs.brushSize.getValue();
    let soft = this.inputs.brushSoft.getValue();
    let opacity = this.inputs.fillColor.getValue()[3];
    let spacing = this.inputs.brushSpacing.getValue();
    
    let dlist = [];
    for (let ds of pointDynamics) {
      dlist.push(ds);
    }
    
    let i = 0;
    for (let p of points) {
      let co = p;

      let ds = dlist[i];
      i++;

      let dst = new DynamicsState();
      let co2 = new Vector2();

      samplePath(co, ds);

      if (lastpoint !== undefined) {
        let len = lastpoint.vectorDistance(co);
        let spacing2 = 0.25;//this.dynamicsGet("brushSpacing", ds, spacing);
        let size2 = this.dynamicsGet("brushSize", ds, size)*spacing2;
        let size3 = this.dynamicsGet("brushSize", lastdstate, size)*spacing2;

        size2 = Math.max(size2, size3);
        size2 = Math.max(size2, 1);

        let steps = Math.floor(len / size2);
        steps = Math.min(Math.max(steps, 2), 24); //1024*32);

        let dt = 1.0 / (steps - 1);
        for (let j=1, t=dt; j<steps; j++, t += dt) {
          dst.load(lastdstate).interp(ds, t);
          co2.load(lastpoint).interp(co, t);

          samplePath(co2, dst);
        }
      }

      lastpoint = co;
      lastdstate = ds;
    }
  }

  exec(ctx) {
    let brush = Brushes.get(this.inputs.brushType.getValue());
    brush.size = this.inputs.brushSize.getValue();

    let last = new Vector2();
    let ps = [];
    let canvas = ctx.canvas;

    this.execPoints(ctx, this.inputs.points, this.inputs.pointDynamics, undefined, undefined);

    canvas.update();
    window.redraw_all();
  }

  undo(ctx) {
    let ud = this._undo;

    let canvas = ctx.canvas;
    let idgen = ud.idgen;

    let kvs = [];
    let kes = [];
    let kps = [];

    for (let v of canvas.verts) {
      if (v.id > idgen) {
        kvs.push(v);
      }
    }
    
    for (let e of canvas.edges) {
      if (e.id > idgen) {
        kes.push(e);
      }
    }
    for (let p of canvas.paths) {
      if (p.id > idgen) {
        kps.push(p);
      }
    }

    for (let v of kvs) {
      canvas.killVertex(v);
    }
    for (let e of kes) {
      if (!canvas.isDeadElement(e))
        canvas.killEdge(e);
    }
    for (let p of kps) {
      if (!canvas.isDeadElement(p))
        canvas.killPath(p);
    }
    canvas.idgen = ud.idgen;
    canvas.update();
    
    window.redraw_all_full();
  }

  pointermove(e) {
    this.havePointerEvents = true;
    return this.mousemove(e, true);
  }

  mousemove(e, pointer_mode=false) {
    if (this.havePointerEvents && !pointer_mode) {
      return;
    }

    let dstate = new DynamicsState();

    if (e instanceof PointerEvent) {
      dstate.pressure = e.pressure;
      dstate.tilt[0] = e.tiltX;
      dstate.tilt[1] = e.tiltY;

      //console.log("pointer event", e.pressure, dstate.pressure);
    }

    let ctx = this.modal_ctx;
    let canvas = ctx.canvas;
    let workspace = this._workspace;

    let mpos = workspace.getLocalMouse([e.x, e.y]);
    //console.log(mpos);

    this.inputs.points.push(mpos);
    this.inputs.pointDynamics.push(dstate);
    
    let l1 = new ListProperty(Vec2Property);
    let l2 = new ListProperty(DynamicsStateProperty);

    l1.push(new Vec2Property(mpos));
    l2.push(new DynamicsStateProperty(dstate));

    this.execPoints(ctx, l1, l2, this.last_mpos, this.last_dstate);

    if (this.last_mpos === undefined) {
      this.last_mpos = new Vector2(mpos);
    }

    this.last_dstate = dstate;
    this.last_mpos.load(mpos);

    window.redraw_all();
  }

  mouseup(e) {
    this.modalEnd(false);
  }
}
ToolOp.register(DrawOp);
