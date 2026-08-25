import { PackFlags, UIBase } from "./ui_base";
import { IContextBase } from "./context_base";
import { Container } from "./ui";
import { IsRowFrameTag } from "./ui_consts";

export class RowFrame<
  CTX extends IContextBase = IContextBase,
  SELF extends string = "RowFrame",
> extends Container<CTX, SELF> {
  readonly [IsRowFrameTag] = true;

  static define() {
    return {
      tagname: "rowframe-x",
    };
  }

  //try to set styling as early as possible
  connectedCallback() {
    super.connectedCallback();

    this.style["display"] = "flex";
    this.style["flexDirection"] = this.reversed ? "row-reverse" : "row";
  }

  init() {
    super.init();

    this.style["display"] = "flex";
    this.style["flexDirection"] = this.reversed ? "row-reverse" : "row";

    if (!this.style["alignItems"] || this.style["alignItems"] == "") {
      this.style["alignItems"] = "center";
    }

    if (this.getDefault("slider-style") === "simple") {
      this.packflag |= PackFlags.SIMPLE_NUMSLIDERS;
      this.inherit_packflag |= PackFlags.SIMPLE_NUMSLIDERS;
    }
  }

  oneAxisMargin(m: number | string = this.getDefault("oneAxisMargin") as number, m2 = 0) {
    this.style["marginLeft"] = this.style["marginRight"] = m + "px";
    this.style["marginTop"] = this.style["marginBottom"] = "" + m2 + "px";

    return this;
  }

  oneAxisPadding(m: number | string = this.getDefault("oneAxisPadding") as number, m2 = 0) {
    this.style["paddingLeft"] = this.style["paddingRight"] = "" + m + "px";
    this.style["paddingTop"] = this.style["paddingBottom"] = "" + m2 + "px";

    return this;
  }
}

UIBase.internalRegister(RowFrame);

export class ColumnFrame<
  CTX extends IContextBase = IContextBase,
  SELF extends string = "ColumnFrame",
> extends Container<CTX, SELF> {
  static define() {
    return {
      tagname: "colframe-x",
    };
  }

  init() {
    super.init();

    this.style["display"] = "flex";
    this.style["flexDirection"] = "column";
    this.style["justifyContent"] = "right";
  }

  oneAxisMargin(m: number | string = this.getDefault("oneAxisMargin") as number, m2 = 0) {
    this.style["marginTop"] = this.style["marginBottom"] = "" + m + "px";
    this.style["marginLeft"] = this.style["marginRight"] = m2 + "px";

    return this;
  }

  oneAxisPadding(m: number | string = this.getDefault("oneAxisPadding") as number, m2 = 0) {
    this.style["paddingTop"] = this.style["paddingBottom"] = "" + m + "px";
    this.style["paddingLeft"] = this.style["paddingRight"] = "" + m2 + "px";

    return this;
  }
}

UIBase.internalRegister(ColumnFrame);

export class TwoColumnFrame<CTX extends IContextBase = IContextBase> extends Container<
  CTX,
  "TwoColumnFrame"
> {
  _colWidth = 256;
  parentDepth = 1;

  get colWidth() {
    if (this.hasAttribute("colWidth")) {
      return parsepx(this.getAttribute("colWidth")!);
    }

    return this._colWidth;
  }

  set colWidth(v: number) {
    if (this.hasAttribute("colWidth")) {
      this.setAttribute("colWidth", "" + v);
    } else {
      this._colWidth = v;
    }
  }

  static define() {
    return {
      tagname: "two-column-x",
    };
  }

  init() {
    super.init();

    this.style["display"] = "flex";
    this.style["flexDirection"] = "column";
  }

  update() {
    super.update();

    let p: UIBase<CTX> | undefined = this as unknown as UIBase<CTX>;

    for (let i = 0; i < this.parentDepth; i++) {
      p = p.parentWidget ? (p.parentWidget as UIBase<CTX>) : p;
    }

    if (!p) {
      return;
    }

    const r = p.getBoundingClientRect();

    if (!r) {
      return;
    }

    const style = r.width > this.colWidth * 2.0 ? "row" : "column";

    if (this.style["flexDirection"] !== style) {
      this.style["flexDirection"] = style;
    }
  }
}

UIBase.internalRegister(TwoColumnFrame);

function parsepx(css: string): number {
  return parseFloat(css);
}
