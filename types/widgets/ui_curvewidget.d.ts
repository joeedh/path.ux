import { ColumnFrame } from "../core/ui.js";
import { Curve1D } from "../path-controller/curve/curve1d.js";
import type { CurveTypeData } from "../path-controller/curve/curve1d.js";
import { IContextBase } from "../core/context_base.js";
import type { DropBox } from "../widgets/ui_menu.js";
export declare class Curve1DWidget<CTX extends IContextBase = IContextBase> extends ColumnFrame<CTX> {
    #private;
    _value: Curve1D;
    drawTransform: [number, [number, number]];
    _gen_type: string | undefined;
    _lastGen: CurveTypeData | undefined;
    _last_dpi: number | undefined;
    canvas: HTMLCanvasElement;
    g: CanvasRenderingContext2D;
    container: ColumnFrame<CTX> | undefined;
    dropbox: DropBox<CTX>;
    _lastu: number | undefined;
    constructor();
    /**
     * Checks if a curve1d instance exists at dom attribute "datapath"
     * and if it does adds curve1d event handlers to it.
     *
     * Note: it's impossible to know for sure that a widget is truly dead,
     * e.g. it could be hidden in a panel or something.  Curve1d's event
     * handling system takes a callback that checks if a callback should
     * be removed, which we provide by testing this.isConnected.
     *
     * Since this is not robust we have to check regularly if we need to add
     * Curve1D event handlers, which is why this function exists.
     */
    checkCurve1dEvents(): void;
    get value(): Curve1D;
    _on_draw(_e: unknown): void;
    set value(val: Curve1D);
    _on_change(): void;
    init(): void;
    setCSS(): void;
    updateSize(): void;
    _redraw(): void;
    rebuild(): void;
    updateDataPath(): void;
    updateGenUI(): void;
    update(): void;
    static define(): {
        tagname: string;
        style: string;
    };
}
//# sourceMappingURL=ui_curvewidget.d.ts.map