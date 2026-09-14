import { UIBase } from "../core/ui_base";
import { IContextBase } from "../core/context_base";
import type { PathWatchInfo } from "../path-controller/controller/pathwatch";

export class RichViewer<CTX extends IContextBase = IContextBase> extends UIBase<
  CTX,
  string,
  "RichViewer"
> {
  contents: HTMLDivElement;
  _value: string;

  constructor() {
    super();

    this.contents = document.createElement("div");
    this.contents.style.padding = "10px";
    this.contents.style.margin = "10px";
    this.contents.style.overflow = "scroll";

    this.shadow.appendChild(this.contents);
    this._value = "";
  }

  hideScrollBars() {
    this.contents.style.overflow = "hidden";
  }

  showScrollBars() {
    this.contents.style.overflow = "scroll";
  }

  textTransform(text: string) {
    return text;
  }

  set value(val: string) {
    this._value = val;

    this.contents.innerHTML = this.textTransform(val);
  }

  get value() {
    return this._value;
  }

  updateFromPath(rawValue: unknown, info: PathWatchInfo) {
    if (!info.resolved) {
      console.warn("invalid datapath " + info.path);

      this.internalDisabled = true;
      return;
    }

    this.internalDisabled = false;
    const value = rawValue as string;

    if (value !== this.value) {
      this.value = value;
    }
  }

  static define() {
    return {
      tagname: "html-viewer-x",
      style  : "html_viewer",
    };
  }
}
UIBase.internalRegister(RichViewer);
