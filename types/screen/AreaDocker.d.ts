import { Vector2 } from "../path-controller/util/vectormath";
import { Container } from "../core/ui";
import type { Area } from "./ScreenArea";
import { type Menu } from "../widgets/ui_menu";
import type { IContextBase } from "../core/context_base";
import type { TabItem } from "../widgets/ui_tabs";
export declare const testSnapScreenVerts: (fitToSize: boolean, ctx: IContextBase & {
    propsbar: Area<IContextBase>;
}) => void;
export declare class AreaDocker<CTX extends IContextBase = IContextBase> extends Container<CTX> {
    _last_update_key: string | undefined;
    mpos: InstanceType<typeof Vector2>;
    needsRebuild: boolean;
    ignoreChange: number;
    tbar: any;
    addicon: any;
    constructor();
    static define(): {
        tagname: string;
        style: string;
    };
    rebuild(): void;
    detach(event: PointerEvent): void;
    loadTabData(uidata: any): void;
    on_addclick(e: PointerEvent): void;
    tab_onchange(tab: TabItem<CTX>, event?: PointerEvent | KeyboardEvent): void;
    init(): void;
    setCSS(): void;
    getArea(): Area<CTX>;
    flagUpdate(): this;
    update(): void;
    select(areaId: string, event: PointerEvent | KeyboardEvent | MouseEvent): void;
    addTabMenu(tab: TabItem<CTX>, mpos: number[] | Vector2): Menu<CTX> | undefined;
}
//# sourceMappingURL=AreaDocker.d.ts.map