import nstructjs from "../util/struct";
import * as util from "../util/util";

let _digest = new util.HashDigest();

export interface CSSFontArgs {
  size?: number;
  font?: string;
  style?: string;
  weight?: string;
  variant?: string;
  color?: string;
}

export class CSSFont {
  _size: number;
  font: string;
  style: string;
  weight: string;
  variant: string;
  color: string;

  static STRUCT: string;

  constructor(args: CSSFontArgs = {}) {
    this._size = args.size ? args.size : 12;
    this.font = args.font ?? "";
    this.style = args.style !== undefined ? args.style : "normal";
    this.weight = args.weight !== undefined ? args.weight : "normal";
    this.variant = args.variant !== undefined ? args.variant : "normal";
    this.color = args.color ?? "";
  }

  calcHashUpdate(digest = _digest.reset()): number {
    digest.add(this._size || 0);
    digest.add(this.font);
    digest.add(this.style);
    digest.add(this.weight);
    digest.add(this.variant);
    digest.add(this.color);

    return digest.get();
  }

  set size(val: number) {
    this._size = val;
  }

  get size(): number {
    if (util.isMobile()) {
      // XXX fix me! circular module dependency!
      let mul = 1.0;
      //let mul = theme.base.mobileTextSizeMultiplier / visualViewport!.scale;
      if (mul) {
        return this._size * mul;
      }
    }

    return this._size;
  }

  copyTo(b: CSSFont): void {
    b._size = this._size;
    b.font = this.font;
    b.style = this.style;
    b.color = this.color;
    b.variant = this.variant;
    b.weight = this.weight;
  }

  copy(): CSSFont {
    let ret = new CSSFont();
    this.copyTo(ret);
    return ret;
  }

  genCSS(size = this.size): string {
    return `${this.style} ${this.variant} ${this.weight} ${size}px ${this.font}`;
  }

  //deprecated, use genKey()
  hash(): string {
    return this.genKey();
  }

  genKey(): string {
    let color: string = this.color;

    if (typeof this.color === "object" || typeof this.color === "function") {
      color = JSON.stringify(color);
    }

    return this.genCSS() + ":" + this.size + ":" + color;
  }
}

CSSFont.STRUCT = `
CSSFont {
  size     : float | obj._size;
  font     : string | obj.font || "";
  style    : string | obj.font || "";
  color    : string | ""+obj.color;
  variant  : string | obj.variant || "";
  weight   : string | ""+obj.weight;
}
`;
nstructjs.register(CSSFont);
