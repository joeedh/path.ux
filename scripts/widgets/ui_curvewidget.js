import {Curve1DProperty} from "../path-controller/toolsys/toolprop.js";
import {UIBase, Icons, saveUIData, loadUIData} from '../core/ui_base.js';
import {ColumnFrame, RowFrame} from "../core/ui.js";
import * as util from '../path-controller/util/util.js';
import {Vector2, Vector3} from "../path-controller/util/vectormath.js";
import {Curve1D, mySafeJSONStringify} from "../path-controller/curve/curve1d.js";
import {makeGenEnum} from '../path-controller/curve/curve1d_utils.js';

export class Curve1DWidget extends ColumnFrame {
  constructor() {
    super();

    this.useDataPathUndo = false;

    this._on_draw = this._on_draw.bind(this);
    this.drawTransform = [1.0, [0, 0]];

    this._value = new Curve1D();
    this.checkCurve1dEvents();

    let in_onchange = false;

    this._value._on_change = (msg) => {
      if (in_onchange) {
        return;
      }

      /* Prevent infinite recursion. */
      in_onchange = true;

      try {
        if (this.onchange) {
          this.onchange(this._value);
        }

        if (this.hasAttribute("datapath")) {
          let path = this.getAttribute("datapath");
          if (this._value !== undefined) {
            let val = this.getPathValue(this.ctx, path);

            if (val) {
              val.load(this._value);
              this.setPathValue(this.ctx, path, val);
            } else {
              val = this._value.copy();
              this.setPathValue(this.ctx, path, val);
            }
          }
        }
      } catch (error) {
        console.error(error.stack);
        console.error(error.message);
      }

      in_onchange = false;
    };

    this._gen_type = undefined;
    this._lastGen = undefined;

    this._last_dpi = undefined;
    this.canvas = document.createElement("canvas");

    this.g = this.canvas.getContext("2d");
    this.canvas.g = this.g;

    window.cw = this;
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
      let curve1d = this.ctx.api.getValue(this.ctx, this.getAttribute("datapath"));

      if (!curve1d) {
        console.log("unknown curve1d at datapath:", this.getAttribute("datapath"));
        return;
      }

      if (!curve1d.subscribed(undefined, this)) {
        curve1d.on("select", (bspline1) => {
          let bspline2 = this._value.getGenerator("BSplineCurve");

          for (let i = 0; i < bspline1.points.length; i++) {
            bspline2.points[i].flag = bspline1.points[i].flag;
          }

          bspline2.redraw();
        });

        curve1d.on("transform", (bspline1) => {
          let bspline2 = this._value.getGenerator("BSplineCurve");

          for (let i = 0; i < bspline1.points.length; i++) {
            bspline2.points[i].co.load(bspline1.points[i].co);
          }

          bspline2.update();
          bspline2.updateKnots();
          bspline2.redraw();
        });

        curve1d.on("update", () => {
          console.log("datapath curve1d update!");
          this._value.load(curve1d);
          this.rebuild();
        }, this, () => !this.isConnected);
      }
    }
  }

  get value() {
    return this._value;
  }

  _on_draw(e) {
    let curve = e.data;

    //console.log("draw");
    this._redraw();
  }

  set value(val) {
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
    let row = this.row();

    let prop = makeGenEnum();

    prop.setValue(this.value.generatorType);

    this.dropbox = row.listenum(undefined, "Type", prop, this.value.generatorType, (id) => {
      console.warn("SELECT", id, prop.keys[id]);

      this.value.setGenerator(id);
      this.value._on_change("curve type change");
    });
    this.dropbox._init();

    row.iconbutton(Icons.ZOOM_OUT, "Zoom Out", () => {
      let curve = this._value;
      if (!curve) return;
      //if (isNaN(curve.uiZoom))
      //  curve.uiZoom = 1.0;

      curve.uiZoom *= 0.9;
      if (this.getAttribute("datapath")) {
        this.setPathValue(this.ctx, this.getAttribute("datapath"), curve);
      }

      this._redraw();
    }).iconsheet = 0;
    row.iconbutton(Icons.ZOOM_IN, "Zoom In", () => {
      let curve = this._value;
      if (!curve) return;
      //if (isNaN(curve.uiZoom))
      //  curve.uiZoom = 1.0;

      curve.uiZoom *= 1.1;
      if (this.getAttribute("datapath")) {
        this.setPathValue(this.ctx, this.getAttribute("datapath"), curve);
      }

      this._redraw();

    }).iconsheet = 0;

    this.container = this.col();

    let panel = this.panel("Range");

    let clipCheck = panel.check(undefined, "Clip To Range");
    clipCheck.onchange = (val) => {
      this._value.clipToRange = val;
      this._on_change();
      this._redraw();
    }
    clipCheck.checked = this._value.clipToRange;

    let xmin = panel.slider(undefined, "X Min", this._value.xRange[0], -10, 10, 0.1, false, undefined, (val) => {
      this._value.xRange[0] = val.value;
      this._on_change();
      this._redraw();
    });

    let xmax = panel.slider(undefined, "X Max", this._value.xRange[1], -10, 10, 0.1, false, undefined, (val) => {
      this._value.xRange[1] = val.value;
      this._on_change();
      this._redraw();
    });

    let ymin = panel.slider(undefined, "Y Min", this._value.yRange[0], -10, 10, 0.1, false, undefined, (val) => {
      this._value.yRange[0] = val.value;
      this._on_change();
      this._redraw();
    });

    let ymax = panel.slider(undefined, "Y Max", this._value.yRange[1], -10, 10, 0.1, false, undefined, (val) => {
      this._value.yRange[1] = val.value;
      this._on_change();
      this._redraw();
    });

    let last_update_key = "";
    this.container.update.after(() => {
      const xRange = this._value.xRange;
      const yRange = this._value.yRange;
      let key = "" + xRange[0] + ":" + xRange[1]
        + ":" + yRange[0] + ":" + yRange[1] + ":" + this._value.clipToRange;

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

    this.style["width"] = "min-contents";
    this.style["height"] = "min-contents";
    this.updateSize();
  }

  updateSize() {
    let dpi = UIBase.getDPI();
    let w = ~~(this.getDefault("CanvasWidth")*dpi);
    let h = ~~(this.getDefault("CanvasHeight")*dpi);

    let bad = w !== this.canvas.width || h !== this.canvas.height;
    bad = bad || dpi !== this._last_dpi;

    if (!bad) {
      return;
    }

    this._last_dpi = dpi;
    this.canvas.width = w;
    this.canvas.height = h;

    this.canvas.style["width"] = (w/dpi) + "px";
    this.canvas.style["height"] = (h/dpi) + "px";

    this._redraw();
  }

  _redraw() {
    //forcibly clear canvas, works better then clearRect
    this.canvas.width = this.canvas.width;
    this.canvas.height = this.canvas.height;

    let canvas = this.canvas, g = this.g;

    //g.clearRect(0, 0, canvas.width, canvas.height);
    g.beginPath();
    g.rect(0, 0, canvas.width, canvas.height);
    g.fillStyle = this.getDefault("CanvasBG");
    g.fill();

    g.save();

    let zoom = this._value.uiZoom;
    let scale = Math.max(canvas.width, canvas.height);

    g.lineWidth /= scale;

    this.drawTransform[0] = scale*zoom;
    this.drawTransform[1][0] = 0.0;
    this.drawTransform[1][1] = -1.0;

    this.drawTransform[1][0] -= 0.5 - 0.5/zoom;
    this.drawTransform[1][1] += 0.5 - 0.5/zoom;

    //g.scale(scale, scale);

    g.scale(this.drawTransform[0], -this.drawTransform[0]);
    g.translate(this.drawTransform[1][0], this.drawTransform[1][1]);

    g.lineWidth /= zoom;

    this._value.draw(this.canvas, this.g, this.drawTransform);
    g.restore();
  }

  rebuild() {
    let ctx = this.ctx;
    if (ctx === undefined || this.container === undefined) {
      return;
    }

    this.checkCurve1dEvents();

    let uidata = saveUIData(this.container, "curve1d");

    this._gen_type = this.value.generatorType;
    let col = this.container;

    if (this._lastGen !== undefined) {
      this._lastGen.killGUI(col, this.canvas);
    }

    let onchange = this.dropbox.onchange;
    this.dropbox.onchange = undefined
    this.dropbox.setValue(this.value.generatorType);
    this.dropbox.onchange = onchange;

    col.clear();

    let onSourceUpdate = () => {
      if (!this.hasAttribute("datapath")) {
        return;
      }

      let val = this.getPathValue(this.ctx, this.getAttribute("datapath"));
      this._value.load(val);
      this.rebuild();
    };

    let dpath = this.hasAttribute("datapath") ? this.getAttribute("datapath") : undefined;
    let gen = this.value.generators.active;
    gen.makeGUI(col, this.canvas, this.drawTransform, dpath, onSourceUpdate);

    loadUIData(this.container, uidata);
    for (let i = 0; i < 4; i++) {
      col.flushUpdate();
    }

    this._lastGen = gen;
    this._redraw();
  }

  updateDataPath() {
    if (!this.hasAttribute("datapath")) {
      return;
    }

    let path = this.getAttribute("datapath");
    let val = this.getPathValue(this.ctx, path);

    if (this._lastu === undefined) {
      this._lastu = 0;
    }

    if (val && !val.equals(this._value) && util.time_ms() - this._lastu > 200) {
      this._lastu = util.time_ms();

      this._value.load(val);
      this.update();
      this._redraw();
    }
  }

  updateGenUI() {
    let bad = this._lastGen !== this.value.generators.active;

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
      style  : "curvewidget"
    }
  }
}

UIBase.internalRegister(Curve1DWidget);
