export const mimeMap: Record<string, string> = {
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
  "gif"  : "image/gif",
};

export var textMimes = new Set([
  "application/javascript",
  "application/x-javscript",
  "image/svg+xml",
  "application/xml",
]);

export function isMimeText(mime: string | undefined) {
  if (!mime) {
    return false;
  }

  if (mime.startsWith("text")) {
    return true;
  }

  return textMimes.has(mime);
}

export function getExtension(path: string | undefined) {
  if (!path) {
    return "";
  }

  let i = path.length;
  while (i > 0 && path[i] !== ".") {
    i--;
  }

  return path.slice(i, path.length).trim().toLowerCase();
}

export function getMime(path: string) {
  let ext = getExtension(path);
  if (ext in mimeMap) {
    return mimeMap[ext];
  }

  return "application/x-octet-stream";
}

export class PlatformAPI {
  static writeFile(data: ArrayBuffer | string, handle: FilePath, mime: string): Promise<unknown> {
    throw new Error("implement me");
  }

  static resolveURL(path: string, base = location.href) {
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

    let exts = ["html", "txt", "js", "php", "cgi"];
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

    const segments = (base + "/" + path).split("/");
    const path2: string[] = [];

    for (let i = 0; i < segments.length; i++) {
      if (segments[i] === "..") {
        path2.pop();
      } else {
        path2.push(segments[i]);
      }
    }

    return path2.join("/");
  }

  static showOpenDialog(title: string, args = new FileDialogArgs()): Promise<FilePath[]> {
    throw new Error("implement me");
  }

  static showSaveDialog(
    title: string,
    savedata_cb: () => unknown,
    args = new FileDialogArgs()
  ): Promise<FilePath> {
    throw new Error("implement me");
  }

  static readFile(path: string | FilePath, mime?: string): Promise<string | ArrayBuffer> {
    throw new Error("implement me");
  }
}

export class FileDialogArgs {
  multi = false;
  addToRecentList = false;
  defaultPath?: string;
  filters: { name: string; mime: string; extensions: string[] }[] = [];
}

/*a file path, some platforms may not return real paths*/
export class FilePath {
  data: unknown;
  filename: string;

  constructor(data: unknown, filename = "unnamed") {
    this.data = data;
    this.filename = filename;
  }
}
