import * as simple from '../scripts/simple/simple.js';
import {Vector4, UIBase} from '../scripts/pathux.js';
import {Editor} from '../scripts/simple/simple.js';

export class Context {
  get canvas() {
    return window._appstate.canvas;
  }

  get canvasEditor() {
    return simple.Editor.findEditor(Canvas);
  }

  static defineAPI(api, strct) {
    strct.struct("canvas", "canvas", "Canvas", api.mapStruct(Canvas));
    strct.struct("canvasEditor", "canvasEditor", "Canvas Editor", api.mapStruct(CanvasEditor));
  }
}

export class Brush {
  constructor() {
    this.color = new Vector4();
    this.color.addScalar(1.0);
  }

  static defineAPI(api, st) {
    st.color4("color", "color", "Color");
  }
}

Brush.STRUCT = `
Brush {
  radius   : float;
  strength : float;
  color    : vec4;
}
`;
simple.DataModel.register(Brush);

export class Canvas {
  constructor(dimen = 512) {
    this.image = new ImageData(dimen, dimen);
    this.brush = new Brush();
    this.dimen = dimen;
  }

  static defineAPI(api, st) {
    st.struct("brush", "brush", "Brush", api.mapStruct(Brush, true));
  }
}

Canvas.STRUCT = `
Canvas {
  dimen   : int; 
  brush   : Brush; 
}
`;
simple.DataModel.register(Canvas);

export class AppState extends simple.AppState {
  constructor() {
    super(Context);

    this.canvas = new Canvas();
  }

  saveFile(args = {}) {
    return super.saveFile([this.canvas], args);
  }

  loadFile(data, args = {}) {
    let file = super.loadFile(data, args);

    this.canvas = file.objects[0];
  }
}

export class CanvasEditor extends simple.Editor {
  constructor() {
    super();

    this.animReq = undefined;
    this.drawParam = true;
    this.canvas = document.createElement("canvas");
    this.g = this.canvas.getContext("2d");

    this.shadow.appendChild(this.canvas);
  }

  static define() {
    return {
      tagname : "simple-canvas-x",
      areaname: "simple-canvas",
      uiname  : "Canvas"
    }
  }

  static defineAPI(api, st) {
    st.bool("drawParam", "drawParam", "Draw Param");

    return st;
  }

  flagRedraw() {
    if (this.animReq) {
      return;
    }

    this.animReq = requestAnimationFrame(() => this.draw());
  }

  draw() {
    this.animReq = undefined;

    let dpi = UIBase.getDPI();

    let w = ~~((this.size[0])*dpi);
    let h = ~~(this.size[1]*dpi)

    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.style["width"] = (w/dpi) + "px";
    this.canvas.style["height"] = (h/dpi) + "px";

    let g = this.g;

    g.putImageData(this.ctx.canvas.image, 0, 0);

    g.beginPath();
    let dimen = this.ctx.canvas.dimen;
    console.log("DIMEN", dimen);
    g.rect(0, 0, dimen, dimen);
    g.stroke();
  }

  init() {
    super.init();

    this.addEventListener("mousemove", (e) => this.on_mousemove(e));
    this.flagRedraw();

    let sidebar = this.makeSideBar();
    sidebar.tab("Info");
    sidebar.tab("Tool");

    this.header.prop("canvasEditor.drawParam");
  }

  on_mousemove(e) {
    let canvas = this.ctx.canvas;
    let r = this.canvas.getBoundingClientRect();

    let dpi = devicePixelRatio;

    let x = e.x - r.x;
    let y = e.y - r.y;

    x = ~~(x*dpi);
    y = ~~(y*dpi);

    let idata = canvas.image.data;

    let idx = (y * canvas.dimen + x) * 4;

    idata[idx] = idata[idx+1] = idata[idx+2] = 0.0;
    idata[idx+3] = 255;

    this.flagRedraw();
  }

  setCSS() {
    super.setCSS();

    this.canvas.style["position"] = "fixed";
    this.canvas.style["z-index"] = "0";

    this.flagRedraw();
  }
}

simple.Editor.register(CanvasEditor);

export function start() {
  window._appstate = new AppState();
  _appstate.start();
}

