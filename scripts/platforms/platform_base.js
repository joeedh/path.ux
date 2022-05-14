export const mimeMap = {
  ".js"  : "application/javascript",
  ".json": "text/json",
  ".html": "text/html",
  ".txt" : "text/plain",
  ".jpg" : "image/jpeg",
  ".png" : "image/png",
  ".tiff": "image/tiff",
  ".gif" : "image/gif",
  ".bmp" : "image/bitmap",
  ".tga" : "image/targa",
  ".svg" : "image/svg+xml",
  ".xml" : "text/xml",
  ".webp": "image/webp",
  "svg"  : "image/svg+xml",
  "txt"  : "text/plain",
  "html" : "text/html",
  "css"  : "text/css",
  "ts"   : "application/typescript",
  "py"   : "application/python",
  "c"    : "application/c",
  "cpp"  : "application/cpp",
  "cc"   : "application/cpp",
  "h"    : "application/c",
  "hh"   : "application/cpp",
  "hpp"  : "application/cpp",
  "sh"   : "application/bash",
  "mjs"  : "application/javascript",
  "cjs"  : "application/javascript",
  "gif"  : "image/gif"
};

export var textMimes = new Set([
  "application/javascript", "application/x-javscript",
  "image/svg+xml", "application/xml"
]);

export function isMimeText(mime) {
  if (!mime) {
    return false;
  }

  if (mime.startsWith("text")) {
    return true;
  }

  return textMimes.has(mime);
}

export function getExtension(path) {
  if (!path) {
    return "";
  }

  let i = path.length;
  while (i > 0 && path[i] !== ".") {
    i--;
  }

  return path.slice(i, path.length).trim().toLowerCase();
}

export function getMime(path) {
  let ext = getExtension(path);
  if (ext in mimeMap) {
    return mimeMap[ext];
  }

  return "application/x-octet-stream";
}

export class PlatformAPI {
  static writeFile(data, handle, mime) {
    throw new Error("implement me");
    //returns a promise
  }

  static resolveURL(path, base = location.href) {
    base = base.trim();

    if (path.startsWith("./")) {
      path = path.slice(2, path.length).trim();
    }

    while (path.startsWith("/")) {
      path = path.slice(1, path.length).trim();
    }

    while (base.endsWith("/")) {
      base = base.slice(0, base.length - 1).trim();
    }

    let exts = ["html", "txt", "js", "php", "cgi"]
    for (let ext of exts) {
      ext = "." + ext;
      if (base.endsWith(ext)) {
        let i = base.length - 1;
        while (i > 0 && base[i] !== "/") {
          i--;
        }

        base = base.slice(0, i).trim();
      }
    }

    while (base.endsWith("/")) {
      base = base.slice(0, base.length - 1).trim();
    }

    path = (base + "/" + path).split("/")
    let path2 = [];

    for (let i = 0; i < path.length; i++) {
      if (path[i] === "..") {
        path2.pop();
      } else {
        path2.push(path[i]);
      }
    }

    return path2.join("/");
  }

  //returns a promise that resolves to a FilePath that can be used for re-saving.
  static showOpenDialog(title, args = new FileDialogArgs()) {
    throw new Error("implement me");
  }

  //returns a promise
  static showSaveDialog(title, savedata_cb, args = new FileDialogArgs()) {
    throw new Error("implement me");
  }

  //returns a promise.  if mime is a text type, a string will be fed to the promise,
  //otherwise it will be an ArrayBuffer
  static readFile(path, mime) {
    throw new Error("implement me");
  }
}

export class FileDialogArgs {
  constructor() {
    this.multi = false; //allow selecting multiple files
    this.addToRecentList = false; //update recent file list

    /* example for filters:
    [{
      name : "Images",
      mime : "image/png"
      extensions : "["png", "jpg"]
    }]
    * */
    this.filters = []
  }
}

/*a file path, some platforms may not return real payhs*/
export class FilePath {
  constructor(data, filename = "unnamed") {
    this.data = data;
    this.filename = filename;
  }
}
