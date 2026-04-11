export declare const mimeMap: Record<string, string>;
export declare var textMimes: Set<string>;
export declare function isMimeText(mime: string | undefined): boolean;
export declare function getExtension(path: string | undefined): string;
export declare function getMime(path: string): string;
export declare class PlatformAPI {
    static writeFile(data: ArrayBuffer | string, handle: FilePath, mime: string): Promise<unknown>;
    static resolveURL(path: string, base?: string): string;
    static showOpenDialog(title: string, args?: FileDialogArgs): Promise<FilePath[]>;
    static showSaveDialog(title: string, savedata_cb: () => unknown, args?: FileDialogArgs): Promise<FilePath>;
    static readFile(path: string | FilePath, mime?: string): Promise<string | ArrayBuffer>;
}
export declare class FileDialogArgs {
    multi: boolean;
    addToRecentList: boolean;
    defaultPath?: string;
    filters: {
        name: string;
        mime: string;
        extensions: string[];
    }[];
}
export declare class FilePath {
    data: unknown;
    filename: string;
    constructor(data: unknown, filename?: string);
}
//# sourceMappingURL=platform_base.d.ts.map