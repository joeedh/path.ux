import * as simple from '../scripts/simple/simple.js';
import {} from '../scripts/pathux.js';

export class Context {
  static defineAPI(api, strct) {
    strct.struct("canvas", "canvas", "Canvas", api.mapStruct(Canvas));
  }

  get canvas() {
    return simple.Editor.findEditor(Canvas);
  }
}

export class AppState extends simple.AppState {
  constructor() {
    super(Context);
  }
}

export class Canvas extends simple.Editor {
  constructor() {
    super();

    this.drawParam = true;
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

  init() {
    super.init();

    let sidebar = this.makeSideBar();
    sidebar.tab("Info");
    sidebar.tab("Tool");

    this.header.prop("canvas.drawParam");
  }
}

simple.Editor.register(Canvas);

export function start() {
  window._appstate = new AppState();
  _appstate.start();
}

