import { ToolOp } from "../pathux.js";
import { ListProperty, StringProperty, Vec2Property, Vec4Property, FloatProperty } from "../pathux.js";
import { Vector2 } from "../pathux.js";
import { Brushes } from "./brush.js";
import { DynamicsProperty, DynamicsState, DynamicsStateProperty } from "../core/dynamics.js";
import { Icons } from "../editors/icon_enum.js";
import type { AppContext } from "../core/context.js";
import type { Brush } from "./brush.js";

type DrawInputs = {
  brushType: StringProperty;
  brushSize: FloatProperty;
  brushSoft: FloatProperty;
  brushSpacing: FloatProperty;
  strokeWidth: FloatProperty;
  strokeColor: Vec4Property;
  fillColor: Vec4Property;
  points: ListProperty<Vec2Property>;
  pointDynamics: ListProperty<DynamicsStateProperty>;
  dynamics: DynamicsProperty;
};

export class DrawOp extends ToolOp<DrawInputs, {}, AppContext> {
  last_mpos: Vector2 | undefined;
  havePointerEvents: boolean;
  _workspace: AppContext["workspace"];
  last_dstate: DynamicsState | undefined;
  // DrawOp uses an id-generation snapshot for undo rather than the file-based undo
  // installed on ToolOp.prototype by core/toolop.ts, so it keeps its own field.
  _drawUndo!: { idgen: number };

  constructor() {
    super();

    this.last_mpos = undefined;
    this.havePointerEvents = false;
  }

  static tooldef() {
    return {
      name    : "draw",
      uiname  : "Draw",
      toolpath: "canvas.draw",
      icon    : Icons.ZOOM_OUT,
      is_modal: true,
      inputs: {
        brushType    : new StringProperty("circle"),
        brushSize: new FloatProperty(35.0)
          .setRange(0.01, 4000.0)
          .setStep(0.5)
          .setSlideSpeed(1.5)
          .setExpRate(1.75)
          .setDecimalPlaces(2)
          .noUnits(),
        brushSoft    : new FloatProperty(0.0).setDecimalPlaces(2).noUnits().setRange(0, 1),
        brushSpacing : new FloatProperty(0.5).setDecimalPlaces(2).noUnits().setRange(0, 2),
        strokeWidth  : new FloatProperty(1.0).setDecimalPlaces(2).noUnits(),
        strokeColor  : new Vec4Property().setIsColor(),
        fillColor    : new Vec4Property().setIsColor(),
        //duplicate points signify splits in path
        points       : new ListProperty(Vec2Property),
        pointDynamics: new ListProperty(DynamicsStateProperty),
        dynamics     : new DynamicsProperty(),
      },
    };
  }

  static invoke(ctx: AppContext, args: Record<string, unknown>): DrawOp {
    const ret = super.invoke(ctx, args) as DrawOp;

    const ws = ctx.workspace;
    if (!ws) {
      return ret;
    }
    const bs = ws.brush;

    if (!args.brushType) ret.inputs.brushType.setValue(bs.type);
    if (!args.fillColor) ret.inputs.fillColor.setValue(bs.color);
    if (!args.strokeColor) ret.inputs.strokeColor.setValue(bs.color);
    if (!args.brushSize) ret.inputs.brushSize.setValue(bs.size);
    if (!args.brushSoft) ret.inputs.brushSoft.setValue(bs.soft);
    if (!args.brushSpacing) ret.inputs.brushSpacing.setValue(bs.spacing);

    ret.inputs.dynamics.setValue(ws.dynamics);

    return ret;
  }

  modalStart(ctx: AppContext) {
    this._workspace = ctx.workspace;

    return super.modalStart(ctx);
  }
  undoPre(ctx: AppContext) {
    const canvas = ctx.canvas;

    this._drawUndo = {
      idgen: canvas.idgen,
    };
  }

  dynamicsGet(key: string, dstate: DynamicsState, val: number) {
    const dynamics = this.inputs.dynamics.getValue();

    return dynamics.apply(key, val, dstate);
  }

  execPoints(
    ctx: AppContext,
    points: ListProperty<Vec2Property>,
    pointDynamics: ListProperty<DynamicsStateProperty>,
    lastpoint: Vector2 | undefined,
    lastdstate: DynamicsState | undefined
  ) {
    const canvas = ctx.canvas;
    const brushCls = Brushes.get(this.inputs.brushType.getValue())!;
    const brush: Brush = new brushCls();

    const color = this.inputs.fillColor.getValue();

    const samplePath = (co: Vector2, ds: DynamicsState) => {
      brush.size = this.dynamicsGet("brushSize", ds, size);
      brush.soft = this.dynamicsGet("brushSoft", ds, soft);
      const opacity2 = this.dynamicsGet("opacity", ds, opacity);

      const paths = brush.genPaths(canvas);

      for (const path of paths) {
        for (const v of path.verts) {
          v.add(co);
        }

        path.material.color.load(color);
        path.material.color[3] = opacity2;
      }
    };

    const size = this.inputs.brushSize.getValue();
    const soft = this.inputs.brushSoft.getValue();
    const opacity = this.inputs.fillColor.getValue()[3];
    const spacing = this.inputs.brushSpacing.getValue();

    const dlist: DynamicsState[] = [];
    for (const ds of pointDynamics) {
      dlist.push(ds);
    }

    let i = 0;
    for (const p of points) {
      const co = p;

      const ds = dlist[i];
      i++;

      const dst = new DynamicsState();
      const co2 = new Vector2();

      samplePath(co, ds);

      if (lastpoint !== undefined) {
        const len = lastpoint.vectorDistance(co);

        const spacing2 = spacing; //this.dynamicsGet("brushSpacing", ds, spacing);
        let size2 = this.dynamicsGet("brushSize", ds, size) * spacing2;
        const size3 = this.dynamicsGet("brushSize", lastdstate!, size) * spacing2;

        size2 = Math.max(size2, size3);
        size2 = Math.max(size2, 1);

        const steps = Math.floor(len / size2);

        //steps = Math.min(Math.max(steps, 2), 1024); //1024*32);

        const dt = 1.0 / (steps - 1);

        for (let j = 1, t = dt; j < steps; j++, t += dt) {
          dst.load(lastdstate!).interp(ds, t);
          co2.load(lastpoint).interp(co, t);

          samplePath(co2, dst);
        }
      }

      lastpoint = co;
      lastdstate = ds;
    }
  }

  exec(ctx: AppContext) {
    const canvas = ctx.canvas;

    this.execPoints(ctx, this.inputs.points, this.inputs.pointDynamics, undefined, undefined);

    canvas.update();
    window.redraw_all();
  }

  undo(ctx: AppContext) {
    const ud = this._drawUndo;

    const canvas = ctx.canvas;
    const idgen = ud.idgen;

    const kvs = [];
    const kes = [];
    const kps = [];

    for (const v of canvas.verts) {
      if (v.id > idgen) {
        kvs.push(v);
      }
    }

    for (const e of canvas.edges) {
      if (e.id > idgen) {
        kes.push(e);
      }
    }
    for (const p of canvas.paths) {
      if (p.id > idgen) {
        kps.push(p);
      }
    }

    for (const v of kvs) {
      canvas.killVertex(v);
    }
    for (const e of kes) {
      if (!canvas.isDeadElement(e)) canvas.killEdge(e);
    }
    for (const p of kps) {
      if (!canvas.isDeadElement(p)) canvas.killPath(p);
    }
    canvas.idgen = ud.idgen;
    canvas.update();

    window.redraw_all_full();
  }

  pointermove(e: PointerEvent) {
    this.havePointerEvents = true;
    return this.mousemove(e, true);
  }

  mousemove(e: MouseEvent, pointer_mode = false) {
    if (this.havePointerEvents && !pointer_mode) {
      return;
    }

    const dstate = new DynamicsState();

    if (e instanceof PointerEvent) {
      dstate.pressure = e.pressure;
      dstate.tilt[0] = e.tiltX;
      dstate.tilt[1] = e.tiltY;

      //console.log("pointer event", e.pressure, dstate.pressure);
    }

    const ctx = this.modal_ctx;
    if (!ctx) {
      return;
    }

    const workspace = this._workspace;
    if (!workspace) {
      return;
    }

    const mpos = workspace.getLocalMouse([e.x, e.y]);
    //console.log(mpos);

    this.inputs.points.push(mpos);
    this.inputs.pointDynamics.push(dstate);

    const l1 = new ListProperty<Vec2Property>(Vec2Property);
    const l2 = new ListProperty<DynamicsStateProperty>(DynamicsStateProperty);

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

  mouseup(e: MouseEvent) {
    this.modalEnd(false);
  }
}
ToolOp.register(DrawOp);
