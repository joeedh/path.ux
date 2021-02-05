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
  ".xml" : "text/xml"
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
  }

  //returns a promise that resolves to a FilePath that can be used for re-saving.
  static showOpenDialog(title, args=new FileDialogArgs()) {
    throw new Error("implement me");
  }

  //returns a promise
  static showSaveDialog(title, savedata_cb, args=new FileDialogArgs()) {
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
  constructor(data, filename="unnamed") {
    this.data = data;
    this.filename = filename;
  }
}
