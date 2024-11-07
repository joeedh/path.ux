import { Container } from "../core/ui";
import { DataAPI, DataStruct } from "../../path-controller/types/controller/controller_base";
import { IconButton } from "../widgets/ui_widgets";
import { Screen } from "../screen/FrameManager";
import { Area } from "../screen/ScreenArea";
export { Context } from "../core/context";
import { Context } from "../core/context";
import { TabContainer } from "./ui_tabs";
import { IconMap } from "../pathux";
export declare class DataModel<ContextCls = {}> {
  ctx: ContextCls;
  static defineAPI(api, dataStruct): DataStruct;
  static register(Class: any);
}

export declare class SideBar<CTX extends Context = Context> extends Container<CTX> {
  closeIcon: IconButton;
  tabbar: TabContainer;
  header: Container;
  get closed(): boolean;
  set closed(value: boolean);
  width: number;
  height: number;
  tab(name: string): Container<CTX>;
}
export declare class Editor<CTX extends Context = Context> extends Area<CTX> {
  sidebar?: SideBar<CTX>;
  static findEditor<T>(Class: new (...args: any[]) => T): T | undefined;
  makeSideBar(): SideBar<CTX>;
}

export declare class SimpleScreen<CTX extends Context = Context> extends Screen<CTX> {}
export declare class FileData {
  magic: string;
  version_major: number;
  version_minor: number;
  version_micro: number;
  flags: number;
  schema: string; /* private */
  objects: any[]; /* client-provided objects array. */
}

export declare interface FileArgs {
  ext?: string /** default: .data */;
  magic?: string /** default: STRT */;
  doScreen?: boolean /** default: true */;
  resetOnLoad?: boolean /** default: true */;
  useJSON?: boolean /** default: false */;
  version?: number | [number, number, number] /** default: 0 */;
  fileFlags?: 0 /** client-provided 16-bit integer.  default: 0 */;
  fromFileOp?: boolean /* SimpleSaveOp and SimpleOpenOp set this to true */;
}

/** see StartArgs class */
export declare interface StartArgs1 {
  singlePage?: boolean;
  icons?: IconMap;
  iconsheet?: HTMLImageElement;
  iconSizes?: number[];
  iconTileSize?: number;
  iconsPerRow?: number;
  theme?: any;
  registerSaveOpenOps?: boolean;
  autoLoadSplineTemplates?: boolean;
}

/* Build start argument interface from StartArg class. */
import { StartArgs } from "../../simple/app";
import { ToolStack } from "../../path-controller/toolsys/toolsys";
type NotCallable<T> = T extends (...args: any) => any ? never : T;
type StartArgFilter<T> = NotCallable<T>;
/** See StartArgs class for defaults. */
type IStartArgs = {
  [k in keyof StartArgs]+?: StartArgFilter<StartArgs[k]>;
};

interface IContextConstructor<CTX extends Context = Context, APP> {
  new(state?: APP): CTX
}

/** see FileArgs class */
export interface IFileArgs {
  ext?: string
  magic?: string
  doScreen?: boolean
  resetOnLoad?: boolean
  useJSON?: boolean
  version?: number
  fileFlags?: number
  fromFileOp?: boolean /* SimpleSaveOp and SimpleOpenOp set this to true */
}
export declare class AppState<CTX extends Context = Context> {
  constructor(ctx: IContextConstructor<CTX, this>)
  api: DataAPI;
  screen: SimpleScreen<CTX>;
  ctx: CTX;
  fileMagic: string;
  fileVersion: [number, number, number];
  fileExt?: string;
  saveFilesInJSON: boolean;
  defaultEditorClass?: any;
  toolstack: ToolStack;

  reset(): void;
  createNewFile(): void;
  saveFileSync(objects: any, args?: IFileArgs): ArrayBuffer | string;
  saveFile(objects: any, args?: IFileArgs): Promise<ArrayBuffer | string>;
  loadFileSync(data: string | number[] | ArrayBuffer | Uint8Array | DataView, args?: IFileArgs): FileData;
  loadFile(data: string | number[] | ArrayBuffer | Uint8Array | DataView, args?: IFileArgs): Promise<FileData>;
  makeScreen();
  start(startArgs?: IStartArgs);
}
