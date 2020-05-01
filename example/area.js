import {Area} from "../scripts/ScreenArea.js";
import * as nstructjs from "../scripts/struct.js";

export class MyAreaBase extends Area {
  constructor() {
    super();
  }

  getScreen() {
    return this.ctx.screen;
  }

  init() {
    super.init();

    this.container = document.createElement("colframe-x");
    this.container.ctx = this.ctx;
    this.shadow.appendChild(this.container);

    this.header = this.makeHeader(this.container, true);
  }
}
MyAreaBase.STRUCT = nstructjs.STRUCT.inherit(MyAreaBase, Area) + `
}
`;
nstructjs.register(MyAreaBase);
