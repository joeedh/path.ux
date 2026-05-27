import { UIBase, Icons, nstructjs, Vector2, contextWrangler } from "../../pathux.js";
import { Editor } from "../editor_base.js";
import { PanOp } from "./workspace_ops.js";
import { DrawOp } from "../../draw/draw_ops.js";
import { BrushSettings } from "../../draw/brush.js";
import { Dynamics } from "../../core/dynamics.js";
import type { AppContext } from "../../core/context.js";

export class WorkspaceEditor extends Editor {
  _last_dpi: number | undefined;
  _last_id: number | undefined;
  brush: BrushSettings;
  dynamics: Dynamics;
  pan: Vector2;
  scale: number;
  canvas: HTMLCanvasElement;
  g!: CanvasRenderingContext2D;

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
    this.canvas.style.margin = this.canvas.style.padding = "0px";

    this.canvas.style.position = UIBase.PositionKey;
    this.canvas.style.zIndex = "-2";

    this.canvas.style.pointerEvents = "none";

    this.g = this.canvas.getContext("2d")!;
    this.shadow.appendChild(this.canvas);

    const makeEventListener = (name: string, handler: (e: MouseEvent) => unknown) => {
      let mouse = name.search("mouse") >= 0 || name.search("pointer") >= 0;
      mouse = mouse || name.search("touch") >= 0;

      this.addEventListener(name, (e) => {
        const me = e as MouseEvent;

        if (mouse) {
          const screen = this.ctx.screen;

          // (pickElement's old (x,y,w,h) signature is now (x,y,args); drop the 1x1 region.)
          const ele = screen.pickElement(me.x, me.y);
          if (ele !== this && (ele as unknown) !== this.canvas) {
            return;
          }
        }

        this.push_ctx_active();
        const ret = handler(me);
        this.pop_ctx_active();

        return ret;
      });
    };

    makeEventListener("mousedown", (e) => this.mousedown(e));
    makeEventListener("mousemove", (e) => this.mousemove(e));
    makeEventListener("mouseup", () => this.mouseup());
  }

  copy() {
    const ret = UIBase.createElement<WorkspaceEditor>(
      (this.constructor as unknown as typeof WorkspaceEditor).define().tagname
    );
    ret.ctx = this.ctx;
    return ret;
  }

  on_resize(size: number[] | Vector2) {
    super.on_resize(size);

    this._last_id = undefined;
    window.redraw_all();
  }

  tagFullDraw() {
    this._last_id = undefined;
  }

  on_fileload(isActiveEditor: boolean) {
    this.tagFullDraw();

    if (isActiveEditor) {
      window.redraw_all();
    }
  }

  init() {
    super.init();

    const header = this.header;
    this.useDataPathUndo = true;
    this.container.parentWidget = this;
    this.container.useDataPathUndo = true;

    this.container._useDataPathUndo = true;

    const row = this.container.row();
    row.background = row.getDefault("AreaHeaderBG");

    const strip = row.row();
    strip.iconbutton(Icons.UNDO, "Undo", () => {
      this.ctx.toolstack.undo(this.ctx);
    });
    strip.iconbutton(Icons.REDO, "Redo", () => {
      this.ctx.toolstack.redo(this.ctx);
    });

    const container = this.container;

    const table = row.table();

    let row2 = table.row();

    row2.useDataPathUndo = true;
    row2.prop("workspace.brush.size"); //, PackFlags.SIMPLE_NUMSLIDERS);
    row2.prop("workspace.brush.soft");

    row2 = table.row();
    row2.useDataPathUndo = true;
    row2.prop("workspace.brush.spacing");
    row2.prop("workspace.brush.color[3]").setAttribute("name", "Opacity");

    row2 = table.row();
    row2.useDataPathUndo = true;
    row2.prop("workspace.brush.color");

    this.setCSS();
  }

  getFinalScale() {
    const dpi = UIBase.getDPI();
    const scale = visualViewport?.scale;

    return this.scale;
  }

  getLocalMouse(mpos: number[] | Vector2) {
    const dpi = UIBase.getDPI();

    const ret = new Vector2();

    ret[0] = mpos[0] - this.pos![0];
    ret[1] = mpos[1] - this.pos![1];

    ret[0] += this.pan[0];
    ret[1] += this.pan[1];

    const scale = this.getFinalScale();

    ret[0] *= dpi * scale;
    ret[1] *= dpi * scale;

    return ret;
  }

  mousedown(e: MouseEvent) {
    const ctx = this.ctx;
    const mpos = new Vector2([e.x, e.y]);

    console.log("mouse down", mpos);

    if (e.button === 0) {
      ctx.api.execTool(ctx, "canvas.draw()");
    }
  }

  mousemove(e: MouseEvent) {
    let mpos = new Vector2([e.x, e.y]);

    mpos = this.getLocalMouse(mpos);
  }

  mouseup() {}

  getKeyMaps() {
    return [];
  }

  updateSize() {
    const dpi = UIBase.getDPI();
    const w1 = this.size![0];
    const h1 = this.size![1];

    const w2 = ~~(w1 * dpi);
    const h2 = ~~(h1 * dpi);

    let update = this._last_dpi !== dpi;
    update = update || w2 !== this.canvas.width;
    update = update || h2 !== this.canvas.height;

    if (update) {
      this._last_id = undefined;

      this.canvas.width = w2;
      this.canvas.height = h2;

      this.canvas.style.width = w1 + "px";
      this.canvas.style.height = h1 + "px";
      this.draw();
    }

    this._last_dpi = dpi;
  }

  draw() {
    this.push_ctx_active();

    const g = this.g;

    const scale = this.getFinalScale();

    g.resetTransform();
    g.scale(scale, scale);
    g.translate(this.pan[0], this.pan[1]);

    const canvas = (this.ctx as AppContext).canvas;

    canvas.draw(this.canvas, this.g, this._last_id);
    this._last_id = canvas.idgen - 1;

    this.pop_ctx_active();
    contextWrangler.updateLastRef(this.constructor, this);
  }

  update() {
    super.update();
    this.updateSize();
  }

  static define() {
    return {
      tagname: "workspace-editor-x",
      areaname: "workspace",
      uiname: "Workspace",
      icon: -1,
    };
  }
}

Editor.register(WorkspaceEditor);
WorkspaceEditor.STRUCT =
  nstructjs.STRUCT.inherit(WorkspaceEditor, Editor) +
  `
  pan      : vec2;
  scale    : float;
  brush    : BrushSettings;
  dynamics : Dynamics;
}
`;
nstructjs.register(WorkspaceEditor);
