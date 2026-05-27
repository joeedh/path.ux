import {Area, UIBase, nstructjs, contextWrangler, ColumnFrame} from '../pathux.js';

export class Editor extends Area {
  container!: ColumnFrame;

  constructor() {
    super();

    this.useDataPathUndo = true;
  }
  
  getScreen() {
    return this.ctx.screen;
  }

  on_fileload(isActiveEditor: boolean) {
  }

  push_ctx_active() {
    contextWrangler.updateLastRef(this.constructor, this);
    contextWrangler.push(this.constructor, this);
  }

  pop_ctx_active(dontSetLastRef=false) {
    contextWrangler.pop(this.constructor, this);
  }

  init() {
    super.init();

    this.container = UIBase.createElement<ColumnFrame>("colframe-x");
    this.container.ctx = this.ctx;
    this.shadow.appendChild(this.container);

    this.header = this.makeHeader(this.container, true);
  }
}
Editor.STRUCT = nstructjs.STRUCT.inherit(Editor, Area) + `
}
`;
nstructjs.register(Editor);
