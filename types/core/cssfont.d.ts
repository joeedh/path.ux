import nstructjs from "../util/struct";
import * as util from "../util/util";
export interface CSSFontArgs {
    size?: number;
    font?: string;
    style?: string;
    weight?: string;
    variant?: string;
    color?: string;
}
export declare class CSSFont {
    _size: number;
    font: string;
    style: string;
    weight: string;
    variant: string;
    color: string;
    static STRUCT: string;
    constructor(args?: CSSFontArgs);
    calcHashUpdate(digest?: util.HashDigest): number;
    set size(val: number);
    get size(): number;
    copyTo(b: CSSFont): void;
    copy(): CSSFont;
    genCSS(size?: number): string;
    hash(): string;
    genKey(): string;
    loadSTRUCT(reader: nstructjs.StructReader<this>): void;
}
//# sourceMappingURL=cssfont.d.ts.map