import {UIBase, PackFlags, Icons, nstructjs, KeyMap, HotKey, Vector2} from '../../pathux.js';
import {Editor} from "../editor_base.js";
import {PanOp} from "./workspace_ops.js";
import {DrawOp} from "../../draw/draw_ops.js";
import {BrushSettings} from '../../draw/brush.js';
import {Dynamics} from "../../core/dynamics.js";
import {contextWrangler} from '../../../scripts/screen/ScreenArea.js';

export class WorkspaceEditor extends Editor {
  constructor() {
    super();

    this.useDataPathUndo = true;

    this.minSize = [75, 75];

    this._last_dpi = undefined;
    this._last_id = undefined;

    this.brush = new BrushSettings();
    this.dynamics = Dynamics.makeDefault();

    this.pan = new Vector2();
    this.scale = 1.0;

    this.canvas = document.createElement("canvas");
    this.canvas.style["margin"] = this.canvas.style["padding"] = "0px";

    this.canvas.style["position"] = UIBase.PositionKey;
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

  copy() {
    let ret = UIBase.createElement(this.constructor.define().tagname);
    ret.ctx = this.ctx;
    return ret;
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
    this.useDataPathUndo = true;
    this.container.parentWidget = this;
    this.container.useDataPathUndo = true;

    this.container._useDataPathUndo = true;

    let row = this.container.row();
    row.background = row.getDefault("AreaHeaderBG");

    let strip = row.row();
    strip.iconbutton(Icons.UNDO, "Undo", () => {
      this.ctx.toolstack.undo();
    });
    strip.iconbutton(Icons.REDO, "Redo", () => {
      this.ctx.toolstack.redo();
    });

    let container = this.container;


    let table = row.table();

    let row2 = table.row();

    row2._useDataPathUndo = true;
    row2.prop("workspace.brush.size"); //, PackFlags.SIMPLE_NUMSLIDERS);
    row2.prop("workspace.brush.soft");

    row2 = table.row();
    row2._useDataPathUndo = true;
    row2.prop("workspace.brush.spacing")
    row2.prop("workspace.brush.color[3]").setAttribute("name", "Opacity");

    row2 = table.row()
    row2._useDataPathUndo = true;
    row2.prop("workspace.brush.color");

    this.setCSS();
  }

  getFinalScale() {
    let dpi = UIBase.getDPI();
    let scale = visualViewport.scale;


    return this.scale;
  }

  getLocalMouse(mpos) {
    let dpi = UIBase.getDPI();

    let ret = new Vector2();

    ret[0] = mpos[0] - this.pos[0];
    ret[1] = mpos[1] - this.pos[1];

    ret[0] += this.pan[0];
    ret[1] += this.pan[1];

    let scale = this.getFinalScale();

    ret[0] *= dpi*scale;
    ret[1] *= dpi*scale;

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
    let dpi = UIBase.getDPI();
    let w1 = this.size[0];
    let h1 = this.size[1];

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
    this.push_ctx_active();

    console.log("canvas draw");
    let g = this.g;

    let scale = this.getFinalScale();

    g.resetTransform();
    g.scale(scale, scale);
    g.translate(this.pan[0], this.pan[1]);

    let canvas = this.ctx.canvas;

    canvas.draw(this.canvas, this.g, this._last_id);
    this._last_id = canvas.idgen-1;

    this.pop_ctx_active();
    contextWrangler.updateLastRef(this.constructor, this);
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
