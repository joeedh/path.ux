import { Context } from "../path-controller/controller/context.js";
export declare const DataModelClasses: (typeof DataModel)[];
import { ToolStack } from "../path-controller/toolsys/toolsys.js";
import { DataAPI } from "../path-controller/controller/controller.js";
import { Screen } from "../screen/FrameManager.js";
import { Editor } from "./editor.js";
export declare const getLastAppState: () => AppState | undefined;
export declare class DataModel {
    static defineAPI(api: DataAPI, strct: unknown): unknown;
    /** Automatically registers cls with nstructjs
     *  and handles STRUCT inheritance.
     */
    static register(cls: typeof DataModel & {
        STRUCT?: string;
    }): void;
}
export declare function makeAPI(ctxClass: typeof Context): DataAPI<import("../pathux.js").ContextLike<any, import("../pathux.js").IToolStack>>;
import { ThemeRecord } from "../core/ui_base.js";
export declare class StartArgs {
    singlePage: boolean;
    DEBUG: Record<string, unknown>;
    icons: Record<string, number>;
    iconsheet: HTMLImageElement | undefined;
    iconSizes: number[];
    iconTileSize: number;
    iconsPerRow: number;
    theme?: ThemeRecord;
    registerSaveOpenOps: boolean;
    autoLoadSplineTemplates: boolean;
    showPathsInToolTips: boolean;
    enableThemeAutoUpdate: boolean;
    addHelpPickers: boolean;
    useNumSliderTextboxes: boolean;
    numSliderArrowLimit: number;
    simpleNumSliders: boolean;
    saveFilesInJSON: boolean;
    constructor();
}
export declare class SimpleScreen extends Screen {
    constructor();
    static define(): {
        tagname: string;
    };
    init(): void;
    setCSS(): void;
}
export declare class AppState {
    _ctxClass: Function;
    startArgs: StartArgs | undefined;
    currentFileRef: unknown;
    api: DataAPI;
    ctx: Context;
    toolstack: ToolStack;
    screenClass: typeof Screen;
    screen: Screen | undefined;
    fileMagic: string;
    fileVersion: [number, number, number];
    _fileExt: string;
    _fileExtSet: boolean;
    saveFilesInJSON: boolean;
    defaultEditorClass: typeof Editor | undefined;
    /** ctxClass is the context class.  It can be either a simple class
     *  or a subclass of the more complex path.ux Context class.  Note that
     *  using Context will avoid subtle undo stack errors caused by the context
     *  changing after a tool is run (this is why Context has a serialization
     *  mechanism).
     *
     *  Path.ux will actually subclass ctxClass and add a few standard methods
     *  and properties, see GetContextClass.*/
    constructor(ctxClass: Function, screenClass?: typeof Screen);
    private _makeFileArgs;
    get fileExt(): string;
    set fileExt(ext: string);
    /** resets the undo stack */
    reset(): void;
    /** Create a new file. See this.makeScreen() if you wish
     *  to create a new screen at this time, and this.reset()
     *  if you wish to reset the undo stack*/
    createNewFile(): void;
    saveFileSync(objects: unknown[] | undefined, args?: Record<string, unknown>): any;
    /** Serialize the application state. Takes
     *  a list of objects to save (with nstructjs);
     *  Subclasses should override this, like so:
     *
     *  saveFile(args={}) {
     *    let objects = app state;
     *    return super.saveFile(objects, args);
     *  }
     **/
    saveFile(objects: unknown[] | undefined, args?: Record<string, unknown>): Promise<unknown>;
    loadFileSync(data: unknown, args?: Record<string, unknown>): import("./file.js").FileFull;
    /**
     *  Loads a new file. The default behavior is a
     *  complete state reset (you can control this
     *  with args.reset_toolstack, args.reset_context
     *  and args.doScreen).
     *
     *  As the base class cannot know just what to do
     *  with the loaded data (the objects parameter
     *  passed to saveFile) it is recommended you
     *  override this function like so:
     *
     *  loadFile(data, args) {
     *    return super.loadFile(data, args).then(fileData) => {
     *      // load fileData.objects into appropriate properties
     *      // this is the same objects array originally passed
     *      // to this.saveFile
     *      this.data = fileData.objects;
     *    });
     *  }
     *
     *  @param data
     *  @param args
     *  */
    loadFile(data: unknown, args?: Record<string, unknown>): Promise<unknown>;
    ensureMenuBar(): void;
    makeScreen(): void;
    start(args?: StartArgs | Record<string, unknown>): void;
}
//# sourceMappingURL=app.d.ts.map