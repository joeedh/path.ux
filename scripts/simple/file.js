import nstructjs from '../path-controller/util/struct.js';

import {UIBase} from '../core/ui_base.js';

export class FileHeader {
  constructor(version, magic, flags) {
    this.magic = magic;
    this.flags = flags;
    this.version_major = version ? version[0] : 0;
    this.version_minor = version ? version[1] : 0;
    this.version_micro = version ? version[2] : 0;
    this.schema = nstructjs.write_scripts();
  }
}

FileHeader.STRUCT = `
simple.FileHeader {
  magic         : static_string[4];
  version_major : short;
  version_minor : short;
  version_micro : short;
  flags         : short;
  schema        : string; 
}
`;
nstructjs.register(FileHeader);

export class FileFull extends FileHeader {
  constructor(version, magic, flags) {
    super(version, magic, flags);
    this.objects = [];
  }
}

FileFull.STRUCT = nstructjs.inherit(FileFull, FileHeader) + `
  objects : array(abstract(Object));
  screen  : abstract(Object);
}
`;
nstructjs.register(FileFull);


export class FileArgs {
  constructor(args = {}) {
    this.ext = args.ext || ".data";
    this.magic = args.magic || "STRT";
    this.doScreen = args.doScreen !== undefined ? args.doScreen : true;
    this.resetOnLoad = args.resetOnLoad !== undefined ? args.resetOnLoad : true;
    this.useJSON = args.useJSON !== undefined ? args.useJSON : false;
    this.version = args.version !== undefined ? args.version : 0;
    this.fileFlags = args.fileFlags !== undefined ? args.fileFlags : 0;
  }
}

export class EmptyStruct {

}
EmptyStruct.STRUCT = `
EmptyStruct {
}
`;
nstructjs.register(EmptyStruct);

export function saveFile(appstate, args, objects) {
  args = new FileArgs(args);

  let version = args.version;
  if (typeof version === "number") {
    if (version === Math.floor(version)) {
      version = [version, 0, 0];
    } else {
      let major = ~~version;
      let minor = ~~(Math.fract(version)*10.0);
      let micro = (Math.fract(version) - minor) * 100.0;

      version = [major, minor, micro];
    }
  }

  let file = new FileFull(version, args.magic, args.fileFlags);

  if (args.doScreen) {
    file.screen = appstate.screen;
  } else {
    file.screen = new EmptyStruct();
  }

  for (let ob of objects) {
    file.objects.push(ob);
  }

  if (args.useJSON) {
    return nstructjs.writeJSON(file);
  } else {
    let data = [];
    nstructjs.writeObject(data, file);
    return (new Uint8Array(data)).buffer;
  }
}

export function loadFile(appstate, args, data) {
  let header;

  if (!args.useJSON) {
    if (data instanceof Array) {
      data = (new Uint8Array(data)).buffer;
    }

    if (data instanceof Uint8Array) {
      data = data.buffer;
    }

    if (data instanceof ArrayBuffer) {
      data = new DataView(data);
    }

    header = nstructjs.readObject(data, FileHeader);
  } else if (typeof data === "string") {
    data = JSON.parse(data);

    header = nstructjs.readJSON(data, FileHeader);
  }

  if (header.magic !== args.magic) {
    throw new Error("invalid file");
  }

  let istruct = new nstructjs.STRUCT();
  istruct.parse_structs(header.schema);

  let ret;

  if (!args.useJSON) {
    ret = istruct.readObject(data, FileFull);
  } else {
    ret = istruct.readJSON(data, FileFull);
  }

  if (args.resetOnLoad) {
    appstate.reset();
  }

  if (args.doScreen) {
    if (appstate.screen) {
      appstate.screen.unlisten();
      appstate.screen.remove();
    }

    ret.screen.ctx = appstate.ctx;

    if (!(ret.screen instanceof appstate.screenClass)) {
      let screen = UIBase.createElement(appstate.screenClass.define().tagname);
      screen.ctx = appstate.ctx;

      for (let sarea of ret.screen.sareas) {
        screen.appendChild(sarea);
      }

      ret.screen = screen;
    }

    appstate.screen = ret.screen;

    document.body.appendChild(appstate.screen);
    appstate.screen.listen();
  }

  return ret;
}