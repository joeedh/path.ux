import { Menu } from "../../widgets/ui_menu";
import { FileDialogArgs, FilePath } from "../platform_base";
interface ElectronMenuItemArgs {
    id?: string;
    label?: string;
    tooltip?: string;
    accelerator?: string;
    icon?: string;
    click?: string | (() => void);
    submenu?: ElectronMenu;
    registerAccelerator?: boolean;
}
export declare class ElectronMenu extends Array<ElectronMenuItem> {
    _ipcId: number;
    constructor(args?: Record<string, unknown>);
    insert(i: number, item: ElectronMenuItem): this;
    static setApplicationMenu(menu: ElectronMenu): void;
    closePopup(): void;
    append(item: ElectronMenuItem): void;
    popup(args: {
        x: number;
        y: number;
        callback: () => void;
    }): void;
}
export declare function wrapRemoteCallback(key: string, callback: (...args: unknown[]) => void): string;
export declare class ElectronMenuItem {
    id?: string;
    label?: string;
    tooltip?: string;
    accelerator?: string;
    icon?: string;
    click?: string | (() => void);
    submenu?: ElectronMenu;
    registerAccelerator?: boolean;
    constructor(args: ElectronMenuItemArgs);
}
export declare function checkInit(): void;
export declare const iconcache: Record<string, unknown>;
export declare function getNativeIcon(icon: number, iconsheet?: number, invertColors?: boolean, size?: number): string;
export declare function buildElectronHotkey(hk: string): string;
export declare function buildElectronMenu(menu: Menu): ElectronMenu;
interface MenuEditorLike {
    header: import("../../core/ui_base").UIBase;
}
export declare function initMenuBar(menuEditor: MenuEditorLike, override?: boolean): void;
import { PlatformAPI } from "../platform_base";
export declare class platform extends PlatformAPI {
    static showOpenDialog(title: string, args?: FileDialogArgs): Promise<FilePath[]>;
    static _sanitizeFilters(filters: ({
        name: string;
        mime?: string;
        extensions: string[];
    } | string[])[]): {
        name: string;
        mime?: string;
        extensions: string[];
    }[];
    static showSaveDialog(title: string, filedata_cb: () => unknown, args?: FileDialogArgs): Promise<FilePath>;
    static readFile(path: string | FilePath, mime?: string): Promise<string | ArrayBuffer>;
    static writeFile(data: ArrayBuffer | string, handle: FilePath, mime: string): Promise<FilePath>;
}
export {};
//# sourceMappingURL=electron_api.d.ts.map