import { PlatformAPI, isMimeText } from "../platform_base.js";
import { saveFile, loadFile } from "../../path-controller/util/html5_fileapi.js";

import { FileDialogArgs, FilePath } from "../platform_base.js";

import { mimeMap } from "../platform_base.js";

interface FileFilter {
  name: string;
  mime?: string;
  extensions: string[];
}

export function getWebFilters(filters: FileFilter[] = []) {
  let types: { description: string; accept: Record<string, string[]> }[] = [];

  for (let item of filters) {
    let mime = item.mime;
    let exts: string[] = [];

    for (let ext of item.extensions) {
      ext = "." + ext;
      if (ext.toLowerCase() in mimeMap) {
        mime = mime !== undefined ? mime : (mimeMap as Record<string, string>)[ext.toLowerCase()];
      }

      exts.push(ext);
    }

    if (!mime) {
      mime = "application/x-octet-stream";
    }

    types.push({
      description: item.name,
      accept: {
        [mime]: exts,
      },
    });
  }

  return types;
}

export class platform extends PlatformAPI {
  //returns a promise
  static showOpenDialog(title: string, args = new FileDialogArgs()) {
    let types = getWebFilters(args.filters);

    return new Promise<FilePath[]>((accept, reject) => {
      try {
        (window as any)
          .showOpenFilePicker({
            multiple: args.multi,
            types,
          })
          .then((arg: any[]) => {
            let paths: FilePath[] = [];

            for (let file of arg) {
              paths.push(new FilePath(file, file.name));
            }

            accept(paths);
          });
      } catch (error) {
        reject(error);
      }
    });
  }

  static writeFile(data: any, handle: any, mime: string) {
    handle = handle.data;

    return handle.createWritable().then((file: any) => {
      file.write(data);
      file.close();
    });
  }

  static showSaveDialog(title: string, savedata_cb: () => any, args = new FileDialogArgs()): Promise<FilePath> {
    if (!(window as any).showSaveFilePicker) {
      return this.showSaveDialog_old(title, savedata_cb, args);
    }

    let types = getWebFilters(args.filters);

    return new Promise((accept, reject) => {
      let fname: string;
      let saveHandle: any;

      try {
        saveHandle = (window as any).showSaveFilePicker({ types });
      } catch (error) {
        reject(error);
      }

      let handle: any;

      saveHandle
        .then((handle1: any) => {
          handle = handle1;

          fname = handle.name;
          console.log("saveHandle", handle);
          return handle.createWritable();
        })
        .then((file: any) => {
          let savedata: any = savedata_cb();

          if (savedata instanceof Uint8Array || savedata instanceof DataView) {
            savedata = savedata.buffer;
          }

          file.write(savedata);
          file.close();

          let path = new FilePath(handle, fname);
          accept(path);
        });
    });
  }

  //returns a promise
  static showSaveDialog_old(title: string, savedata: any, args = new FileDialogArgs()) {
    let exts: string[] = [];

    for (let list of args.filters as any[]) {
      if (!Array.isArray(list) && list.filters) {
        list = list.filters;
      }

      for (let ext of list) {
        exts.push(ext);
      }
    }

    return new Promise<FilePath>((accept, reject) => {
      saveFile(savedata);

      window.setTimeout(() => {
        accept(undefined as unknown as FilePath);
      });
    });
  }

  //path is a FilePath instance, for web this is the actual file data
  static readFile(path: any, mime = ""): Promise<string | ArrayBuffer> {
    if (mime === "") {
      mime = path.filename;
      let i = mime.length - 1;

      while (i > 0 && mime[i] !== ".") {
        i--;
      }

      mime = mime.slice(i, mime.length).trim().toLowerCase();
      if (mime in mimeMap) {
        mime = (mimeMap as Record<string, string>)[mime];
      }
    }

    return new Promise((accept, reject) => {
      path.data.getFile().then((file: any) => {
        console.log("file!", file);

        let promise;

        if (isMimeText(mime)) {
          promise = file.text();
        } else {
          promise = file.arrayBuffer();
        }

        promise.then((data: any) => {
          accept(data);
        });
      });
    });
  }
}
