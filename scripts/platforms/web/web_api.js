import {PlatformAPI, isMimeText} from '../platform_base.js';
import {saveFile, loadFile} from '../../path-controller/util/html5_fileapi.js';

import {FileDialogArgs, FilePath} from '../platform_base.js';

let mimemap = {
  ".js" : "application/javascript",
  ".json" :"text/json",
  ".html" : "text/html",
  ".txt" :"text/plain",
  ".jpg" : "image/jpeg",
  ".png" : "image/png",
  ".svg" : "image/svg+xml",
  ".xml" : "text/xml"
};

export class platform extends PlatformAPI {
  //returns a promise
  static showOpenDialog(title, args=new FileDialogArgs()) {
    let exts = [];

    for (let list of args.filters) {
      for (let ext of list.extensions) {
        exts.push(ext);
      }
    }

    return new Promise((accept, reject) => {
      loadFile(args.defaultPath, exts).then((file) => {
        accept([new FilePath(file)]);
      });
    });
  }

  static writeFile(data, handle, mime) {
    handle = handle.data;

    return handle.createWritable().then((file) => {
      file.write(data);
      file.close();
    });
  }

  static showSaveDialog(title, savedata, args=new FileDialogArgs()) {
    if (!window.showSaveFilePicker) {
      return this.showSaveDialog_old(...arguments);
    }

    let types = [];

    for (let item of args.filters) {
      let mime = item.mime;
      let exts = [];

      for (let ext of item.extensions) {
        ext = "." + ext;
        if (ext.toLowerCase() in mimemap) {
          mime = mime !== undefined ? mime : mimemap[ext.toLowerCase()];
        }

        exts.push(ext);
      }

      if (!mime) {
        mime = "application/x-octet-stream";
      }

      types.push({
        description : item.name,
        accept : {
          [mime] : exts
        }
      });
    }

    return new Promise((accept, reject) => {
      let fname;
      let saveHandle = window.showSaveFilePicker(undefined, types);
      let handle;

      saveHandle.then((handle1) => {
        handle = handle1;

        fname = handle.name;
        console.log("saveHandle", handle);
        return handle.createWritable();
      }).then((file) => {
        file.write(savedata);
        file.close();

        let path = new FilePath(handle, fname);
        accept(path);
      });
    });
  }

  //returns a promise
  static showSaveDialog_old(title, savedata, args=new FileDialogArgs()) {

    let exts = [];

    for (let list of args.filters) {
      for (let ext of list) {
        exts.push(ext);
      }
    }

    return new Promise((accept, reject) => {
      saveFile(savedata);

      window.setTimeout(() => {
        accept("undefined");
      });
    });
  }

  //path is a FilePath instance, for web this is the actual file data
  static readFile(path, mime="") {
    return new Promise((accept, reject) => {
      let data = path.data;

      if (isMimeText(mime)) {
        let s = '';
        data = new Uint8Array(data);

        for (let i=0; i<data.length; i++) {
          s += String.fromCharCode(data[i]);
        }

        data = s;
      }

      accept(data);
    });
  }
}
