import {Context, ContextOverlay, ContextFlags} from "../scripts/context.js";
import {Area} from "../scripts/ScreenArea.js";

export class BaseOverlay extends ContextOverlay {
  static contextDefine() {return {
    name : "view",
    flag : ContextFlags.IS_VIEW
  }}

  get toolstack() {
    return this.state.toolstack;
  }

  get api() {
    return this.state.api;
  }

  get data() {
    return this.state.data;
  }
}
Context.register(BaseOverlay);

export class ViewOverlay extends ContextOverlay {
  static contextDefine() {return {
    name : "view",
    flag : ContextFlags.IS_VIEW
  }}

  get screen() {
    return this.state.screen;
  }

  get editor() {
    return Area.getActiveArea();
  }
}

export class ToolContext extends Context {
  constructor(appstate) {
    super(appstate);

    this.reset();
  }

  reset() {
    this.pushOverlay(new BaseOverlay(this.state));
  }
}

export class ViewContext extends Context {
  constructor(appstate) {
    super(appstate);

    this.reset();
  }

  reset() {
    this.pushOverlay(new BaseOverlay(this.state));
    this.pushOverlay(new ViewOverlay(this.state));
  }
}
