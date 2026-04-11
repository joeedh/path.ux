import { UIBase } from "../core/ui_base.js";
import { IContextBase } from "../core/context_base.js";
export declare class ProgressCircle<CTX extends IContextBase = IContextBase> extends UIBase<CTX, number> {
    canvas: HTMLCanvasElement;
    g: CanvasRenderingContext2D;
    size: number;
    animreq: number | undefined;
    _value: number;
    startTime: number;
    timer: number | undefined;
    _oncancel: ((self: ProgressCircle<CTX>) => void) | undefined;
    constructor();
    init(): void;
    flagRedraw(): void;
    draw(): void;
    set value(percent: number);
    get value(): number;
    startTimer(): void;
    endTimer(): void;
    update(): void;
    setCSS(): void;
    static define(): {
        tagname: string;
    };
}
//# sourceMappingURL=ui_progress.d.ts.map