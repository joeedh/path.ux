import nstructjs from "../path-controller/util/struct";

import { UIBase } from "../core/ui_base";

export class FileHeader {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
    simple.FileHeader {
      magic         : static_string[4];
      version_major : short;
      version_minor : short;
      version_micro : short;
      flags         : short;
      schema        : string;
    }
  `
  );

  [key: string]: unknown;

  magic: string;
  flags: number;
  version_major: number;
  version_minor: number;
  version_micro: number;
  schema: string;

  constructor(version?: number[], magic = "", flags = 0) {
    this.magic = magic;
    this.flags = flags;
    this.version_major = version ? version[0] : 0;
    this.version_minor = version ? version[1] : 0;
    this.version_micro = version ? version[2] : 0;
    this.schema = nstructjs.write_scripts();
  }

  loadSTRUCT(reader: nstructjs.StructReader<this>) {
    reader(this);
  }
}

export class FileFull extends FileHeader {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
    FileFull {
      objects : array(abstract(Object));
      screen  : abstract(Object);
    }`
  );

  objects: unknown[];
  screen: unknown;

  constructor(version?: number[], magic?: string, flags?: number) {
    super(version, magic, flags);
    this.objects = [];
  }
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

export class FileArgs {
  ext: string;
  magic: string;
  doScreen: boolean;
  resetOnLoad: boolean;
  useJSON: boolean;
  version: number | number[];
  fileFlags: number;
  fromFileOp: boolean;

  constructor(args: FileArgsInit = {}) {
    this.ext = args.ext || ".data";
    this.magic = args.magic || "STRT";
    this.doScreen = args.doScreen !== undefined ? args.doScreen : true;
    this.resetOnLoad = args.resetOnLoad !== undefined ? args.resetOnLoad : true;
    this.useJSON = args.useJSON !== undefined ? args.useJSON : false;
    this.version = args.version !== undefined ? args.version : 0;
    this.fileFlags = args.fileFlags !== undefined ? args.fileFlags : 0;
    this.fromFileOp = false; /* SimpleSaveOp and SimpleOpenOp set this to true */
  }
}

export class EmptyStruct {
  static STRUCT = nstructjs.inlineRegister(this, `EmptyStruct {}`);
  loadSTRUCT(reader: nstructjs.StructReader<this>) {
    reader(this);
  }
}

export function saveFile(
  appstate: { saveFilesInJSON?: boolean; screen: unknown },
  args: FileArgsInit,
  objects: unknown[]
) {
  if (args.useJSON === undefined) {
    args.useJSON = appstate.saveFilesInJSON;
  }

  let fargs = new FileArgs(args);

  let version: number | number[] = fargs.version;
  if (typeof version === "number") {
    if (version === Math.floor(version)) {
      version = [version, 0, 0];
    } else {
      let major = ~~version;
      let minor = ~~(Math.fract(version) * 10.0);
      let micro = (Math.fract(version) - minor) * 100.0;

      version = [major, minor, micro];
    }
  }

  let file = new FileFull(version, fargs.magic, fargs.fileFlags);

  if (fargs.doScreen) {
    file.screen = appstate.screen;
  } else {
    file.screen = new EmptyStruct();
  }

  for (let ob of objects) {
    file.objects.push(ob);
  }

  if (fargs.useJSON) {
    return nstructjs.writeJSON(file);
  } else {
    let data: number[] = [];
    nstructjs.writeObject(data, file);
    return new Uint8Array(data).buffer;
  }
}

export function loadFile(appstate: any, args: FileArgsInit, data: unknown) {
  if (args.useJSON === undefined) {
    args.useJSON = (appstate as { saveFilesInJSON?: boolean }).saveFilesInJSON;
  }

  let fargs = new FileArgs(args);

  let header: FileHeader;

  if (!fargs.useJSON) {
    if (data instanceof Array) {
      data = new Uint8Array(data).buffer;
    }

    if (data instanceof Uint8Array) {
      data = data.buffer;
    }

    if (data instanceof ArrayBuffer) {
      data = new DataView(data);
    }

    header = nstructjs.readObject(data as DataView, FileHeader) as FileHeader;
  } else {
    if (typeof data === "string") {
      data = JSON.parse(data);
    }

    header = nstructjs.readJSON(data as Record<string, unknown>, FileHeader) as FileHeader;
  }

  if (header.magic !== fargs.magic) {
    throw new Error("invalid file");
  }

  let istruct = new nstructjs.STRUCT();
  istruct.parse_structs(header.schema);

  let ret: FileFull;

  if (!fargs.useJSON) {
    ret = istruct.readObject(data as DataView, FileFull);
  } else {
    ret = istruct.readJSON(data as Record<string, unknown>, FileFull);
  }

  if (fargs.resetOnLoad) {
    (appstate as { reset(): void }).reset();
  }

  if (fargs.doScreen) {
    let screen = appstate.screen as { unlisten(): void; remove(): void } | undefined;
    if (screen) {
      screen.unlisten();
      screen.remove();
    }

    (ret.screen as { ctx: unknown }).ctx = appstate.ctx;

    let screenClass = appstate.screenClass as { define(): { tagname: string } };
    if (!(ret.screen instanceof (screenClass as unknown as new (...args: unknown[]) => unknown))) {
      let newScreen = UIBase.createElement(screenClass.define().tagname) as UIBase;
      newScreen.ctx = appstate.ctx as typeof newScreen.ctx;

      for (let sarea of (
        ret.screen as { sareas: { area: { afterSTRUCT(): void; on_fileload(): void } }[] }
      ).sareas) {
        newScreen.appendChild(sarea as unknown as Node);

        sarea.area.afterSTRUCT();
        sarea.area.on_fileload();
      }

      ret.screen = newScreen;
    }

    appstate.screen = ret.screen;

    document.body.appendChild(ret.screen as Node);
    (ret.screen as { listen(): void }).listen();
  }

  return ret;
}
