import { Container } from "../core/ui.js";
import { IContextBase } from "../core/context_base.js";
interface CatKey {
    key: string;
    category: string;
    help: string;
}
export declare class ThemeEditor<CTX extends IContextBase = IContextBase> extends Container<CTX> {
    categoryMap: Record<string, string | CatKey>;
    constructor();
    static define(): {
        tagname: string;
        style: string;
    };
    init(): void;
    doFolder(catkey: CatKey, obj: any, container?: any, panel?: any, path?: string[] | undefined): void;
    build(): void;
}
export {};
//# sourceMappingURL=theme_editor.d.ts.map