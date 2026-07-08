import {
  UIBase,
  Icons,
  nstructjs,
  Vector2,
  contextWrangler,
  HotKey,
  KeyMap,
  PanelFlags,
  type PanelManager,
} from "../../pathux.js";
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
          const isCanvasArea =
            ele === this ||
            (ele as unknown) === this.canvas ||
            //the empty dock-panel center frames the drawable canvas
            ele === this.panels?.center ||
            (ele && ele.parentWidget === this.panels?.center);
          if (!isCanvasArea) {
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

  definePanels(panels: PanelManager) {
    panels.panel({
      id   : "history",
      title: "History",
      dock : "top",
      flags: PanelFlags.NO_CLOSE,
      build: (c) => {
        const strip = c.row();
        strip.iconbutton(Icons.UNDO, "Undo", () => {
          this.ctx.toolstack.undo(this.ctx);
        });
        strip.iconbutton(Icons.REDO, "Redo", () => {
          this.ctx.toolstack.redo(this.ctx);
        });
      },
    });

    panels.panel({
      id   : "brush",
      title: "Brush",
      dock : "top",
      build: (c) => {
        c.useDataPathUndo = true;

        c.prop("workspace.brush.size");
        c.prop("workspace.brush.soft");
        c.prop("workspace.brush.spacing");
        c.prop("workspace.brush.color[3]").setAttribute("name", "Opacity");
        c.prop("workspace.brush.color");
      },
    });
  }

  init() {
    super.init();

    this.useDataPathUndo = true;
    this.container.parentWidget = this;
    this.container.useDataPathUndo = true;

    this.container._useDataPathUndo = true;

    this.makePanels(this.container);

    this.setCSS();
  }

  getFinalScale() {
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

  mousemove(e: MouseEvent) {}

  mouseup() {}

  getKeyMaps() {
    if (!this.keymap) {
      this.keymap = new KeyMap([
        new HotKey("T", [], () => this.panels?.toggleEdge("left")),
        new HotKey("N", [], () => this.panels?.toggleEdge("right")),
      ]);
    }

    return [this.keymap];
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
