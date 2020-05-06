import {Area} from "../../scripts/ScreenArea.js";
import * as nstructjs from "../../scripts/struct.js";

export class Editor extends Area {
  constructor() {
    super();

    this.useDataPathUndo = true;
  }
  
  getScreen() {
    return this.ctx.screen;
  }

  on_fileload(isActiveEditor) {

  }

  init() {
    super.init();

    this.container = document.createElement("colframe-x");
    this.container.ctx = this.ctx;
    this.shadow.appendChild(this.container);

    this.header = this.makeHeader(this.container, true);
  }
}
Editor.STRUCT = nstructjs.STRUCT.inherit(Editor, Area) + `
}
`;
nstructjs.register(Editor);
