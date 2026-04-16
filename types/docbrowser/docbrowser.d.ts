/**
 documentation browser, with editing support
 note that you must set window.TINYMCE_PATH
 */
import type { StructReader } from "../util/nstructjs";
import { UIBase } from "../core/ui_base";
interface TinyMCEBlobInfo {
    blob(): Blob;
    filename(): string;
}
interface DocSysConfig {
    uploadImage(relpath: string, filename: string, data: ArrayBuffer): string;
    hasDoc(relpath: string): boolean;
    updateDoc(relpath: string, data: string): string;
    newDoc(relpath: string, data: string): string;
    readConfig(configPath: string): DocSysConfig;
}
export declare class DocsAPI {
    start(): void;
    updateDoc(_relpath: string | undefined, _data: string | undefined): Promise<unknown> | undefined;
    newDoc(_relpath: string, _data: string | undefined): Promise<unknown> | undefined;
    hasDoc(_relpath: string): Promise<unknown> | undefined;
    uploadImage(_relpath: string | undefined, _blobInfo: TinyMCEBlobInfo, _success: (path: string) => void, _onError: (msg: string) => void): Promise<void> | undefined;
}
export declare class ElectronAPI extends DocsAPI {
    first: boolean;
    ready: boolean;
    config: DocSysConfig;
    _doinit(): boolean;
    start(): void;
    checkInit(): boolean;
    uploadImage(relpath: string | undefined, blobInfo: TinyMCEBlobInfo, success: (path: string) => void, onError: (msg: string) => void): Promise<void>;
    hasDoc(relpath: string): Promise<unknown> | undefined;
    updateDoc(relpath: string | undefined, data: string | undefined): Promise<unknown> | undefined;
    newDoc(relpath: string, data: string | undefined): Promise<unknown> | undefined;
}
export declare class ServerAPI extends DocsAPI {
    start(): void;
    hasDoc(relpath: string): Promise<unknown>;
    updateDoc(relpath: string | undefined, data: string | undefined): Promise<unknown>;
    newDoc(relpath: string, data: string | undefined): Promise<unknown>;
    uploadImage(relpath: string | undefined, blobInfo: TinyMCEBlobInfo, success: (path: string) => void, onError: (msg: string) => void): Promise<void>;
    callAPI(...callArgs: unknown[]): Promise<unknown>;
}
export declare class DocHistoryItem {
    url: string;
    title: string;
    static STRUCT: string;
    constructor(url?: string, title?: string);
    loadSTRUCT(reader: StructReader<this>): void;
}
export declare class DocHistory extends Array<DocHistoryItem> {
    cur: number;
    _items: DocHistoryItem[];
    static STRUCT: string;
    constructor();
    push(url: string | DocHistoryItem, title?: string | DocHistoryItem): number;
    go(dir: number): DocHistoryItem;
    loadSTRUCT(reader: StructReader<this>): void;
}
interface HeaderContainer extends UIBase {
    clear(): void;
    check(path: string | undefined, name: string): UIBase & {
        value: boolean;
        checked: boolean;
        onchange: (() => void) | null;
    };
    iconbutton(icon: number, description: string, cb: () => void): UIBase & {
        iconsheet: number;
    };
    button(label: string, cb: () => void): UIBase & {
        iconsheet: number;
    };
    listenum(path: string | undefined, name: string, enumDef: Record<string, string>): UIBase & {
        onselect: ((e: string) => void) | null;
    };
}
export declare class DocsBrowser extends UIBase {
    _sourceData: string | undefined;
    saveCallback: ((doc: Document) => void) | null;
    handlesDocURL: boolean;
    pathuxBaseURL: string;
    editMode: boolean;
    history: DocHistory;
    _prefix: string;
    saveReq: number;
    saveReqStart: number;
    _last_save: number;
    header: HeaderContainer;
    root: HTMLIFrameElement;
    serverapi: DocsAPI;
    currentPath: string;
    _doDocInit: boolean;
    contentDiv: HTMLDivElement | undefined;
    tinymce: TinyMCEInstance | undefined;
    oneditstart: ((browser: DocsBrowser) => void) | undefined;
    oneditend: ((browser: DocsBrowser) => void) | undefined;
    static STRUCT: string;
    constructor();
    setEditMode(state: boolean): void;
    go(dir: number): void;
    makeHeader(): void;
    makeHeader_intern(): void;
    init(): void;
    execCommand(...args: [string, ...unknown[]]): void;
    loadSource(data: string): void;
    load(url: string): void;
    initDoc(): void;
    queueSave(): void;
    undoPre(_label?: string): void;
    undoPost(_label?: string): void;
    enableLinks(): void;
    disableLinks(): void;
    patchImageTags(): void;
    patchImage(img: HTMLImageElement): void;
    toMarkdown(): string | undefined;
    getDocPath(): string | undefined;
    save(): void;
    updateCurrentPath(): void;
    report(message: string, color?: string, timeout?: number): void;
    update(): void;
    setCSS(): void;
    static newSTRUCT(): HTMLElement;
    loadSTRUCT(reader: StructReader<this>): void;
    static define(): {
        tagname: string;
        style: string;
    };
}
export {};
//# sourceMappingURL=docbrowser.d.ts.map