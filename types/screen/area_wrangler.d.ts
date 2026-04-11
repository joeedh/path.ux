import "../path-controller/util/struct.js";
import type { Area } from "./ScreenArea.js";
import { IContextBase } from "../core/context_base.js";
export declare function getAreaIntName(name: string): number;
type AreaTypes = {
    [key: string]: number;
};
export declare const AreaTypes: AreaTypes;
export declare function setAreaTypes(def: AreaTypes): void;
export declare class AreaWrangler<CTX extends IContextBase = IContextBase> {
    stacks: Map<string, Area<IContextBase<any, import("../pathux.js").IToolStack>>[]>;
    lasts: Map<string, Area<IContextBase<any, import("../pathux.js").IToolStack>>>;
    lastArea?: Area;
    stack: Area[];
    idgen: number;
    locked: number;
    _last_screen_id: unknown;
    constructor();
    makeSafeContext(ctx: CTX): CTX;
    copyTo(ret: this): void;
    copy(): AreaWrangler<IContextBase<any, import("../pathux.js").IToolStack>>;
    _checkWrangler(ctx?: CTX): boolean;
    reset(): this;
    static findInstance(): AreaWrangler<IContextBase<any, import("../pathux.js").IToolStack>> | undefined;
    static lock(): AreaWrangler<IContextBase<any, import("../pathux.js").IToolStack>> | undefined;
    static unlock(): AreaWrangler<IContextBase<any, import("../pathux.js").IToolStack>> | undefined;
    lock(): this;
    unlock(): this;
    push(type: any, area: Area, pushLastRef?: boolean): void;
    updateLastRef(type: any, area: Area): void;
    pop(type: any, area?: Area): void;
    getLastArea(type?: any): Area<IContextBase<any, import("../pathux.js").IToolStack>> | undefined;
}
export declare const contextWrangler: AreaWrangler<IContextBase<any, import("../pathux.js").IToolStack>>;
export {};
//# sourceMappingURL=area_wrangler.d.ts.map