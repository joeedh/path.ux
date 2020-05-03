import {Editor} from "../editor_base.js";
import {UIBase} from "../../../scripts/ui_base.js";
import {PackFlags} from "../../../scripts/ui_base.js";
import {Icons} from "../icon_enum.js";
import * as nstructjs from "../../util/struct.js";
import {KeyMap, HotKey} from "../../../scripts/simple_events.js";
import {Vector2} from "../../../scripts/vectormath.js";
import {PanOp} from "./workspace_ops.js";
import {DrawOp} from "../../draw/draw_ops.js";
import {BrushSettings} from '../../draw/brush.js';
import {Dynamics} from "../../core/dynamics.js";

export class WorkspaceEditor extends Editor {
  constructor() {
    super();

    this._last_dpi = undefined;
    this._last_id = undefined;

    this.brush = new BrushSettings();
    this.dynamics = Dynamics.makeDefault();

    this.pan = new Vector2();
    this.scale = 1.0;

    this.canvas = document.createElement("canvas");
    this.canvas.style["margin"] = this.canvas.style["padding"] = "0px";

    this.canvas.style["position"] = "absolute";
    this.canvas.style["z-index"] = "-2";

    this.canvas.style["pointer-events"] = "none";

    this.g = this.canvas.getContext("2d");
    this.shadow.appendChild(this.canvas);

    let makeEventListener = (name) => {
      let mouse = (name.search("mouse") >= 0 || name.search("pointer") >= 0);
      mouse = mouse || name.search("touch") >= 0;

      this.addEventListener(name, (e) => {

        if (mouse) {
          let screen = this.ctx.screen;

          let ele = screen.pickElement(e.x, e.y, 1, 1);
          if (ele !== this && ele !== this.canvas) {
            return;
          }
        }

        this.push_ctx_active();
        let ret = this[name](e);
        this.pop_ctx_active();

        return ret;
      })
    };

    makeEventListener("mousedown");
    makeEventListener("mousemove");
    makeEventListener("mouseup");
  }

  on_resize() {
    super.on_resize(...arguments);

    this._last_id = undefined;
    window.redraw_all();
  }

  tagFullDraw() {
    this._last_id = undefined;
  }

  on_fileload(isActiveEditor) {
    this.tagFullDraw();

    if (isActiveEditor) {
      window.redraw_all();
    }
  }

  init() {
    super.init();

    let header = this.header;

    let container = this.container;
    let row = container.row();
    row.background = row.getDefault("AreaHeaderBG");

    row.prop("workspace.brush.size")
    row.prop("workspace.brush.soft")
    row.prop("workspace.brush.spacing")
    row.prop("workspace.brush.color");
    row.prop("workspace.brush.color[3]").setAttribute("name", "Opacity");

    this.setCSS();
  }

  getLocalMouse(mpos) {
    let dpi = UIBase.getDPI();

    let ret = new Vector2();

    ret[0] = mpos[0] - this.pos[0];
    ret[1] = mpos[1] - this.pos[1];

    ret[0] += this.pan[0];
    ret[1] += this.pan[1];

    ret[0] *= dpi*this.scale;
    ret[1] *= dpi*this.scale;

    return ret;
  }

  mousedown(e) {
    let ctx = this.ctx;
    let mpos = new Vector2([e.x, e.y]);

    console.log("mouse down", mpos);

    if (e.button === 0) {
      ctx.api.execTool(ctx, "canvas.draw()");
    }
  }

  mousemove(e) {
    let mpos = new Vector2([e.x, e.y]);

    mpos = this.getLocalMouse(mpos);
  }

  mouseup() {

  }

  getKeyMaps() {
    return [

    ]
  }

  updateSize(){
    let w1 = this.size[0];
    let h1 = this.size[1];
    let dpi = UIBase.getDPI();

    let w2 = ~~(w1*dpi);
    let h2 = ~~(h1*dpi);

    let update = this._last_dpi !== dpi;
    update = update || w2 !== this.canvas.width;
    update = update || h2 !== this.canvas.height;

    if (update) {
      this._last_id = undefined;

      this.canvas.width = w2;
      this.canvas.height = h2;

      this.canvas.style["width"] = w1 + "px";
      this.canvas.style["height"] = h1 + "px";
      this.draw();
    }

    this._last_dpi = dpi;
  }

  draw() {
    console.log("canvas draw");
    let g = this.g;

    g.save();

    g.scale(this.scale, this.scale);
    g.translate(this.pan[0], this.pan[1]);

    let canvas = this.ctx.canvas;

    canvas.draw(this.canvas, this.g, this._last_id);
    this._last_id = canvas.idgen-1;

    g.restore();
  }

  update() {
    super.update();
    this.updateSize();
  }

  static define() {return {
    tagname  : "workspace-editor-x",
    areaname : "workspace",
    uiname   : "Workspace",
    icon     : -1
  }}
};

Editor.register(WorkspaceEditor);
WorkspaceEditor.STRUCT = nstructjs.STRUCT.inherit(WorkspaceEditor, Editor) + `
  pan      : vec2;
  scale    : float;
  brush    : BrushSettings;
  dynamics : Dynamics;
}
`;
nstructjs.register(WorkspaceEditor);