export declare class FileHeader {
    static STRUCT: string;
    [key: string]: unknown;
    magic: string;
    flags: number;
    version_major: number;
    version_minor: number;
    version_micro: number;
    schema: string;
    constructor(version?: number[], magic?: string, flags?: number);
}
export declare class FileFull extends FileHeader {
    static STRUCT: string;
    objects: unknown[];
    screen: unknown;
    constructor(version?: number[], magic?: string, flags?: number);
}
interface FileArgsInit {
    ext?: string;
    magic?: string;
    doScreen?: boolean;
    resetOnLoad?: boolean;
    useJSON?: boolean;
    version?: number | number[];
    fileFlags?: number;
}
export declare class FileArgs {
    ext: string;
    magic: string;
    doScreen: boolean;
    resetOnLoad: boolean;
    useJSON: boolean;
    version: number | number[];
    fileFlags: number;
    fromFileOp: boolean;
    constructor(args?: FileArgsInit);
}
export declare class EmptyStruct {
    static STRUCT: string;
}
export declare function saveFile(appstate: {
    saveFilesInJSON?: boolean;
    screen: unknown;
}, args: FileArgsInit, objects: unknown[]): any;
export declare function loadFile(appstate: any, args: FileArgsInit, data: unknown): FileFull;
export {};
//# sourceMappingURL=file.d.ts.map