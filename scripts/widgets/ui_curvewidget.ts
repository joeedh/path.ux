import { UIBase, Icons, saveUIData, loadUIData } from "../core/ui_base";
import { ColumnFrame, Container } from "../core/ui";
import * as util from "../path-controller/util/util";
import { Curve1D } from "../path-controller/curve/curve1d";
import { makeGenEnum } from "../path-controller/curve/curve1d_utils";
import type { CurveTypeData } from "../path-controller/curve/curve1d";
import { IContextBase } from "../core/context_base";
import type { DropBox } from "../widgets/ui_menu";

/** Slider-like widget interface — slider() returns UIBase but these members exist at runtime. */
interface SliderWidget {
  setValue(val: number): void;
  displayUnit: string | undefined;
  baseUnit: string | undefined;
}

export class Curve1DWidget<CTX extends IContextBase = IContextBase> extends ColumnFrame<CTX> {
  #in_onchange: number = 0;

  _value: Curve1D;
  drawTransform: [number, [number, number]];
  _gen_type: string | undefined;
  _lastGen: CurveTypeData | undefined;
  _last_dpi: number | undefined;
  canvas: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  container: ColumnFrame<CTX> | undefined;
  dropbox!: DropBox<CTX>;
  _lastu: number | undefined;

  constructor() {
    super();

    this.useDataPathUndo = false;

    this._on_draw = this._on_draw.bind(this);
    this.drawTransform = [1.0, [0, 0]];

    this._value = new Curve1D();
    this.checkCurve1dEvents();

    this._value._on_change = () => {
      if (this.#in_onchange) {
        return;
      }

      /* Prevent infinite recursion. */
      this.#in_onchange++;

      try {
        if (this.hasAttribute("datapath")) {
          const path = this.getAttribute("datapath")!;
          if (this._value !== undefined) {
            const val = this.getPathValue(this.ctx, path);

            if (val instanceof Curve1D) {
              val.load(this._value);
              this.setPathValue(this.ctx, path, val);
            } else {
              const copy = this._value.copy();
              this.setPathValue(this.ctx, path, copy);
            }
          }
        }

        if (this.onchange) {
          this.onchange(this._value);
        }
      } catch (error) {
        if (window.DEBUG?.datapath) {
          console.error((error as Error).stack);
          console.error((error as Error).message);
        }
      }

      this.#in_onchange--;

      if (this.#in_onchange < 0) {
        console.warn("this.#in_onchange was negative");
        this.#in_onchange = 0;
      }
    };

    this._gen_type = undefined;
    this._lastGen = undefined;

    this._last_dpi = undefined;
    this.canvas = document.createElement("canvas");

    this.g = this.canvas.getContext("2d")!;

    (window as Window & { cw?: unknown }).cw = this;
    this.shadow.appendChild(this.canvas);
  }

  /**
   * Checks if a curve1d instance exists at dom attribute "datapath"
   * and if it does adds curve1d event handlers to it.
   *
   * Note: it's impossible to know for sure that a widget is truly dead,
   * e.g. it could be hidden in a panel or something.  Curve1d's event
   * handling system takes a callback that checks if a callback should
   * be removed, which we provide by testing this.isConnected.
   *
   * Since this is not robust we have to check regularly if we need to add
   * Curve1D event handlers, which is why this function exists.
   */
  checkCurve1dEvents() {
    if (!this._value.subscribed("draw", this)) {
      this._value.on("draw", this._on_draw, this, () => !this.isConnected);
    }

    if (this.ctx && this.hasAttribute("datapath")) {
      let curve1d: unknown;

      try {
        curve1d = this.ctx.api.getValue(this.ctx, this.getAttribute("datapath")!);
      } catch (error) {
        if (window.DEBUG?.datapath) {
          console.error((error as Error).stack);
          console.error((error as Error).message);
        }
      }

      if (!(curve1d instanceof Curve1D)) {
        this.disabled = true;
        return;
      }

      if (this.disabled) {
        this.disabled = false;
      }

      if (!curve1d.subscribed(undefined, this)) {
        curve1d.on("select", (data) => {
          const bspline1 = data as { points: { flag: number }[] };
          const bspline2 = this._value.getGenerator("BSplineCurve") as unknown as {
            points: { flag: number; co: { load(v: unknown): void } }[];
            length: number;
            redraw(): void;
            update(): void;
            updateKnots(): void;
          };

          for (let i = 0; i < bspline1.points.length; i++) {
            if (i >= bspline2.length) {
              break;
            }
            bspline2.points[i].flag = bspline1.points[i].flag;
          }

          bspline2.redraw();
        });

        curve1d.on("transform", (data) => {
          const bspline1 = data as { points: { co: { load(v: unknown): void } }[] };
          const bspline2 = this._value.getGenerator("BSplineCurve") as unknown as {
            points: { co: { load(v: unknown): void } }[];
            length: number;
            update(): void;
            updateKnots(): void;
            redraw(): void;
          };

          for (let i = 0; i < bspline1.points.length; i++) {
            if (i >= bspline2.length) {
              break;
            }
            bspline2.points[i].co.load(bspline1.points[i].co);
          }

          bspline2.update();
          bspline2.updateKnots();
          bspline2.redraw();
        });

        curve1d.on(
          "update",
          () => {
            console.log("datapath curve1d update!");
            this._value.load(curve1d as Curve1D);
            this.rebuild();
          },
          this,
          () => !this.isConnected
        );
      }
    }
  }

  get value() {
    return this._value;
  }

  _on_draw(_e: unknown) {
    //console.log("draw");
    this._redraw();
  }

  set value(val: Curve1D) {
    this._value.load(val);
    this.update();
    this._redraw();
  }

  _on_change() {
    if (this.onchange) {
      this.onchange(this);
    }
  }

  init() {
    super.init();

    this.useDataPathUndo = false;
    const row = this.row();

    const prop = makeGenEnum();

    prop.setValue(this.value.generatorType);

    this.dropbox = row.listenum(
      undefined,
      "Type",
      prop,
      this.value.generatorType,
      (id: string | number) => {
        console.warn("SELECT", id, prop.keys[id]);

        this.value.setGenerator(String(id));
        this.value._on_change();
      }
    );
    this.dropbox._init();

    row.iconbutton(Icons.ZOOM_OUT, "Zoom Out", () => {
      const curve = this._value;
      if (!curve) return;
      //if (isNaN(curve.uiZoom))
      //  curve.uiZoom = 1.0;

      curve.uiZoom *= 0.9;
      const dp = this.getAttribute("datapath");
      if (dp) {
        this.setPathValue(this.ctx, dp, curve);
      }

      this._redraw();
    }).iconsheet = 0;
    row.iconbutton(Icons.ZOOM_IN, "Zoom In", () => {
      const curve = this._value;
      if (!curve) return;
      //if (isNaN(curve.uiZoom))
      //  curve.uiZoom = 1.0;

      curve.uiZoom *= 1.1;
      const dp = this.getAttribute("datapath");
      if (dp) {
        this.setPathValue(this.ctx, dp, curve);
      }

      this._redraw();
    }).iconsheet = 0;

    this.container = this.col();

    const panel = this.panel("Range");

    const clipCheck = panel.check(undefined, "Clip To Range");
    clipCheck.onchange = (val) => {
      this._value.clipToRange = val as boolean;
      this._on_change();
      this._redraw();
    };
    clipCheck.checked = this._value.clipToRange;

    const xmin = panel.slider(
      undefined,
      "X Min",
      this._value.xRange[0],
      -10,
      10,
      0.1,
      false,
      undefined,
      (val: unknown) => {
        this._value.xRange[0] = (val as { value: number }).value;
        this._on_change();
        this._redraw();
      }
    ) as UIBase<CTX> & SliderWidget;

    const xmax = panel.slider(
      undefined,
      "X Max",
      this._value.xRange[1],
      -10,
      10,
      0.1,
      false,
      undefined,
      (val: unknown) => {
        this._value.xRange[1] = (val as { value: number }).value;
        this._on_change();
        this._redraw();
      }
    ) as UIBase<CTX> & SliderWidget;

    const ymin = panel.slider(
      undefined,
      "Y Min",
      this._value.yRange[0],
      -10,
      10,
      0.1,
      false,
      undefined,
      (val: unknown) => {
        this._value.yRange[0] = (val as { value: number }).value;
        this._on_change();
        this._redraw();
      }
    ) as UIBase<CTX> & SliderWidget;

    const ymax = panel.slider(
      undefined,
      "Y Max",
      this._value.yRange[1],
      -10,
      10,
      0.1,
      false,
      undefined,
      (val: unknown) => {
        this._value.yRange[1] = (val as { value: number }).value;
        this._on_change();
        this._redraw();
      }
    ) as UIBase<CTX> & SliderWidget;

    let last_update_key = "";
    this.container.updateAfter(() => {
      const xRange = this._value.xRange;
      const yRange = this._value.yRange;
      const key =
        "" +
        xRange[0] +
        ":" +
        xRange[1] +
        ":" +
        yRange[0] +
        ":" +
        yRange[1] +
        ":" +
        this._value.clipToRange;

      clipCheck.checked = this._value.clipToRange;

      if (key !== last_update_key) {
        last_update_key = key;

        xmin.setValue(xRange[0]);
        xmax.setValue(xRange[1]);

        ymin.setValue(yRange[0]);
        ymax.setValue(yRange[1]);
      }
    });

    xmin.displayUnit = xmin.baseUnit = "none";
    ymin.displayUnit = ymin.baseUnit = "none";
    xmax.displayUnit = xmax.baseUnit = "none";
    ymax.displayUnit = ymax.baseUnit = "none";

    panel.closed = false;
  }

  setCSS() {
    super.setCSS();

    (this.style as unknown as Record<string, string>)["width"] = "min-contents";
    (this.style as unknown as Record<string, string>)["height"] = "min-contents";
    this.updateSize();
  }

  updateSize() {
    const dpi = UIBase.getDPI();
    const w = ~~((this.getDefault("CanvasWidth") as number) * dpi);
    const h = ~~((this.getDefault("CanvasHeight") as number) * dpi);

    let bad = w !== this.canvas.width || h !== this.canvas.height;
    bad = bad || dpi !== this._last_dpi;

    if (!bad) {
      return;
    }

    this._last_dpi = dpi;
    this.canvas.width = w;
    this.canvas.height = h;

    this.canvas.style.width = w / dpi + "px";
    this.canvas.style.height = h / dpi + "px";

    this._redraw();
  }

  _redraw() {
    //forcibly clear canvas, works better then clearRect
    this.canvas.width = this.canvas.width;
    this.canvas.height = this.canvas.height;

    const canvas = this.canvas;
    const g = this.g;

    //g.clearRect(0, 0, canvas.width, canvas.height);
    g.beginPath();
    g.rect(0, 0, canvas.width, canvas.height);
    g.fillStyle = this.getDefault("CanvasBG") as string;
    g.fill();

    g.save();

    const zoom = this._value.uiZoom;
    const scale = Math.max(canvas.width, canvas.height);

    g.lineWidth /= scale;

    this.drawTransform[0] = scale * zoom;
    this.drawTransform[1][0] = 0.0;
    this.drawTransform[1][1] = -1.0;

    this.drawTransform[1][0] -= 0.5 - 0.5 / zoom;
    this.drawTransform[1][1] += 0.5 - 0.5 / zoom;

    //g.scale(scale, scale);

    g.scale(this.drawTransform[0], -this.drawTransform[0]);
    g.translate(this.drawTransform[1][0], this.drawTransform[1][1]);

    g.lineWidth /= zoom;

    this._value.draw(this.canvas, this.g, this.drawTransform);
    g.restore();
  }

  rebuild() {
    const ctx = this.ctx;
    if (ctx === undefined || this.container === undefined) {
      return;
    }

    this.checkCurve1dEvents();

    const uidata = saveUIData(this.container, "curve1d");

    this._gen_type = this.value.generatorType;
    const col = this.container;

    if (this._lastGen !== undefined) {
      this._lastGen.killGUI(col as unknown as Container, this.canvas);
    }

    const onchange = this.dropbox.onchange;
    this.dropbox.onchange = null;
    this.dropbox.setValue(this.value.generatorType);
    this.dropbox.onchange = onchange;

    col.clear();

    const onSourceUpdate = () => {
      if (!this.hasAttribute("datapath")) {
        return;
      }

      const val = this.getPathValue(this.ctx, this.getAttribute("datapath")!);
      this._value.load(val instanceof Curve1D ? val : undefined);
      this.rebuild();
    };

    const dpath = this.hasAttribute("datapath") ? this.getAttribute("datapath")! : undefined;
    const gen = this.value.generators.active;

    /* Turn off data path callbacks. */
    this.#in_onchange++;
    try {
      gen.makeGUI(
        col as unknown as Container,
        this.canvas,
        this.drawTransform,
        dpath,
        onSourceUpdate
      );

      loadUIData(this.container, uidata);
      for (let i = 0; i < 4; i++) {
        col.flushUpdate();
      }
    } catch (error) {
      console.warn((error as Error).stack);
      console.warn((error as Error).message);
    }

    this.#in_onchange--;

    this._lastGen = gen;
    this._redraw();
  }

  updateDataPath() {
    if (!this.hasAttribute("datapath")) {
      return;
    }

    const path = this.getAttribute("datapath")!;
    const val = this.getPathValue(this.ctx, path);

    if (this._lastu === undefined) {
      this._lastu = 0;
    }

    if (val instanceof Curve1D && !val.equals(this._value) && util.time_ms() - this._lastu > 200) {
      this._lastu = util.time_ms();

      this._value.load(val);
      this.update();
      this._redraw();
    }
  }

  updateGenUI() {
    const bad = this._lastGen !== this.value.generators.active;

    if (bad) {
      this.rebuild();
      this._redraw();
    }
  }

  update() {
    super.update();

    this.checkCurve1dEvents();
    this.updateDataPath();
    this.updateSize();
    this.updateGenUI();
  }

  static define() {
    return {
      tagname: "curve-widget-x",
      style  : "curvewidget",
    };
  }
}

UIBase.internalRegister(Curve1DWidget);
