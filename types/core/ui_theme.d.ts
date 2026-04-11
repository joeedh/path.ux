import { Vector3, Vector4 } from "../path-controller/util/vectormath.js";
import { CSSFont } from "./cssfont.js";
export declare class ThemeScrollBars {
    border?: string;
    color?: string;
    color2?: string;
    contrast?: number;
    width?: number;
    constructor({ border, color, color2, contrast, width }: {
        border?: string;
        color?: string;
        color2?: string;
        contrast?: number;
        width?: number;
    });
}
export type ThemeItem = ThemeRecord | CSSFont | string | number | boolean | ThemeScrollBars;
export interface ThemeRecord {
    [k: string]: ThemeItem;
}
export declare const compatMap: {
    BoxMargin: string;
    BoxBG: string;
    BoxRadius: string;
    background: string;
    defaultWidth: string;
    defaultHeight: string;
    DefaultWidth: string;
    DefaultHeight: string;
    BoxBorder: string;
    BoxLineWidth: string;
    BoxSubBG: string;
    BoxSub2BG: string;
    DefaultPanelBG: string;
    InnerPanelBG: string;
    Background: string;
    numslider_width: string;
    numslider_height: string;
};
export declare const ColorSchemeTypes: {
    LIGHT: string;
    DARK: string;
};
export declare function parsepx(css: string): number;
export declare function color2css(c: number[] | Vector4 | Vector3, alpha_override?: number): string;
export declare function color2web(color: ArrayLike<number>): string;
export declare function css2color(color: string | null | undefined): Vector4;
export declare function web2color(str: string): Vector4;
export declare function validateWebColor(str: string): boolean;
export declare function validateCSSColor(color: string): boolean;
export declare const theme: ThemeRecord;
export declare function invertTheme(): void;
export declare function setColorSchemeType(mode: string): void;
export declare function exportTheme(themeIn?: ThemeRecord, addVarDecl?: boolean): string;
export declare function copyTheme(themeObj: ThemeRecord | CSSFont | Record<string, unknown>): CSSFont | Record<string, unknown>;
//# sourceMappingURL=ui_theme.d.ts.map