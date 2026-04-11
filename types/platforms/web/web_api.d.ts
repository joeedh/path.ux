import { PlatformAPI } from "../platform_base.js";
import { FileDialogArgs, FilePath } from "../platform_base.js";
interface FileFilter {
    name: string;
    mime?: string;
    extensions: string[];
}
export declare function getWebFilters(filters?: FileFilter[]): {
    description: string;
    accept: Record<string, string[]>;
}[];
export declare class platform extends PlatformAPI {
    static showOpenDialog(title: string, args?: FileDialogArgs): Promise<FilePath[]>;
    static writeFile(data: any, handle: any, mime: string): any;
    static showSaveDialog(title: string, savedata_cb: () => any, args?: FileDialogArgs): Promise<FilePath>;
    static showSaveDialog_old(title: string, savedata: any, args?: FileDialogArgs): Promise<FilePath>;
    static readFile(path: any, mime?: string): Promise<string | ArrayBuffer>;
}
export {};
//# sourceMappingURL=web_api.d.ts.map