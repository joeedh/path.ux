import nstructjs from "../util/struct";
import * as util from "../util/util";
import { TypedThemeObject, ThemeTypeArgsWithVars } from "./theme_base_types";
import { FloatProperty, StringProperty, Vec4Property } from "../path-controller/toolsys/toolprop";
import type { ThemeRecord } from "./ui_theme";

const _digest = new util.HashDigest();

export interface CSSFontArgs {
  size?: number;
  font?: string;
  style?: string;
  weight?: string;
  variant?: string;
  color?: string;
}

const CSSFontProps = {
  size   : new FloatProperty().setUnit("pixel"),
  font   : new StringProperty(),
  style  : new StringProperty(),
  weight : new StringProperty(),
  variant: new StringProperty(),
  // note: we don't actually store using vec4, just using it for validation as a color
  color  : new Vec4Property().isColor(),
} as const;

export class CSSFont extends TypedThemeObject<CSSFont, typeof CSSFontProps> {
  static Props = CSSFontProps;

  _size: number;
  font: string;
  style: string;
  weight: string;
  variant: string;
  color: string;

  static STRUCT: string;

  /**
   * Used to create an instance that can accept theme vars.
   * All child classes must have this.
   */
  static withVars(args: ThemeTypeArgsWithVars<CSSFontArgs> = {}): ThemeRecord {
    return new CSSFont(args as unknown as CSSFontArgs, false) as unknown as ThemeRecord;
  }

  constructor(args: CSSFontArgs = {}, validate = false) {
    super(args, validate);

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
      const mul = 1.0;
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
    const ret = new CSSFont();
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

  loadSTRUCT(reader: nstructjs.StructReader<this>) {
    reader(this);
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
