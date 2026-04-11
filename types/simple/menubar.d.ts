import { Editor } from "./editor.js";
import { IContextBase } from "../core/context_base.js";
import { StructReader } from "../util/nstructjs.js";
/** see ./editor.js:Editor.registerAppMenu */
export declare class MenuBarEditor<CTX extends IContextBase = IContextBase> extends Editor<CTX> {
    static STRUCT: string;
    _height: number;
    needsRebuild: boolean;
    menuRow: unknown;
    constructor();
    get height(): number;
    set height(v: number);
    static define(): {
        tagname: string;
        areaname: string;
        uiname: string;
        icon: number;
        flag: number;
    };
    updateHeight(force?: boolean): void;
    makeMenuBar(container: unknown): void;
    flagRebuild(): void;
    init(): void;
    rebuild(): void;
    update(): void;
    loadSTRUCT(reader: StructReader<this>): void;
}
export declare function registerMenuBarEditor(): void;
//# sourceMappingURL=menubar.d.ts.map