import * as ui from "../core/ui";
import * as ui_base from "../core/ui_base";
import { IContextBase } from "../core/context_base";
import type { Screen } from "../screen/FrameManager";
export declare class Note<CTX extends IContextBase = IContextBase> extends ui_base.UIBase<CTX> {
    _noteid: string | undefined;
    height: number;
    showExclMark: boolean;
    dom: HTMLDivElement;
    color: string;
    mark: HTMLDivElement | undefined;
    ntext: HTMLDivElement;
    constructor();
    static define(): {
        tagname: string;
        style: string;
    };
    setLabel(s: string): void;
    init(): void;
    setCSS(): void;
}
export declare class ProgBarNote<CTX extends IContextBase = IContextBase> extends Note<CTX> {
    _percent: number;
    barWidth: number;
    bar: HTMLDivElement;
    bar2: HTMLDivElement;
    constructor();
    get percent(): number;
    set percent(val: number);
    static define(): {
        tagname: string;
        style: string;
    };
    setCSS(): void;
    init(): void;
}
export declare class NoteFrame<CTX extends IContextBase = IContextBase> extends ui.RowFrame<CTX> {
    _h: number;
    constructor();
    static define(): {
        tagname: string;
        style: string;
    };
    init(): void;
    setCSS(): void;
    _ondestroy(): void;
    progbarNote(msg: string, percent: number, color?: string, timeout?: number, id?: string): ProgBarNote<CTX>;
    addNote(msg: string, color?: string, timeout?: number, tagname?: string, showExclMark?: boolean): Note<CTX>;
}
export declare function getNoteFrames(screen: Screen): NoteFrame[];
export declare let noteframes: NoteFrame[];
export declare function sendNote(screen: Screen, msg: string, color?: string, timeout?: number, showExclMark?: boolean): void;
export declare function error(screen: Screen, msg: string, timeout?: number): void;
export declare function warning(screen: Screen, msg: string, timeout?: number): void;
export declare function message(screen: Screen, msg: string, timeout?: number): void;
export declare function progbarNote(screen: Screen, msg: string, percent: number, color?: string, timeout?: number): void;
//# sourceMappingURL=ui_noteframe.d.ts.map