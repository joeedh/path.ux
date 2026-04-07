/**
 documentation browser, with editing support
 note that you must set window.TINYMCE_PATH
 */

//import {pushModalLight, popModalLight, Icons, UIBase, nstructjs, util, Vector2, Matrix4} from '../../pathux.js';
import {pushModalLight, popModalLight} from "../path-controller/util/simple_events"
import cconst from '../config/const'
import nstructjs from "../path-controller/util/struct"
import type {StructReader} from "../util/nstructjs"
import {UIBase, Icons} from "../core/ui_base"
import {platform} from '../platforms/platform'

let tinymceLoaded = false;
// @ts-ignore - tinymce is an optional external dependency loaded at runtime
import('../lib/tinymce/tinymce.cjs').then(() => {
  tinymceLoaded = true;
});

import * as util from '../util/util'
import {Vector2} from '../util/vectormath'

/* Interfaces for tinymce integration */
interface TinyMCEBlobInfo {
  blob(): Blob
  filename(): string
}

interface TinyMCEBaseURI {
  host: string
  source: string
  toAbsolute(): string
}

interface TinyMCEEditor extends globalThis.TinyMCEEditor {
  hide(): void
  show(): void
}

/* Interfaces for Electron doc system */
interface DocSysConfig {
  uploadImage(relpath: string, filename: string, data: ArrayBuffer): string
  hasDoc(relpath: string): boolean
  updateDoc(relpath: string, data: string): string
  newDoc(relpath: string, data: string): string
  readConfig(configPath: string): DocSysConfig
}

let countstr = function (buf: string, s: string) {
  let count = 0;

  while (buf.length > 0) {
    let i = buf.search(s);
    if (i < 0) {
      break;
    }

    buf = buf.slice(i + 1, buf.length);
    count++;
  }

  return count;
}

function basename(path: string) {
  while (path.length > 0 && path.trim().endsWith("/")) {
    path = path.slice(0, path.length - 1);
  }

  path = path.replace(/\/+/g, "/");
  let parts = path.split("/");
  return parts[parts.length - 1];
}

function dirname(path: string) {
  while (path.length > 0 && path.trim().endsWith("/")) {
    path = path.slice(0, path.length - 1);
  }

  let parts = path.split("/");
  parts.length--;

  let s = "";
  for (let t of parts) {
    s += t + "/";
  }

  while (s.endsWith("/")) {
    s = s.slice(0, s.length - 1);
  }

  return s;
}


function relative(a1: string, b1: string) {
  let a = a1, b = b1;

  let i = 1;
  while (i <= a.length && b.startsWith(a.slice(0, i + 1))) {
    i++;
  }
  i--

  a = a.slice(i, a.length).trim();
  b = b.slice(i, b.length).trim();

  let s = "";

  for (let i = 0; i < countstr(a, "/"); i++) {
    s += "../";
  }

  if (s.endsWith("/") && b.startsWith("/")) {
    s = s.slice(0, s.length - 1);
  }

  return s + b;
}

window._relative = relative as (...args: unknown[]) => unknown;

export class DocsAPI {
  start(): void {}

  updateDoc(_relpath: string | undefined, _data: string | undefined): Promise<unknown> | undefined {
    //returns a promise
    return undefined;
  }

  newDoc(_relpath: string, _data: string | undefined): Promise<unknown> | undefined {
    //returns a promise
    return undefined;
  }

  hasDoc(_relpath: string): Promise<unknown> | undefined {
    //returns a promise
    return undefined;
  }

  uploadImage(_relpath: string | undefined, _blobInfo: TinyMCEBlobInfo, _success: (path: string) => void, _onError: (msg: string) => void): Promise<void> | undefined {
    //returns a promise
    return undefined;
  }
}

function getDocPaths() {
  let ret = {
    docpath       : `${cconst.docEditorPath}/docsys_base.js`,
    doc_config    : `${cconst.docEditorPath}/docs.config.js`,
    docpath_prefix: `${cconst.docEditorPath}/doc_build`,
  }

  if (window.PATHUX_DOCPATH) {
    ret.docpath = window.PATHUX_DOCPATH;
  }
  if (window.PATHUX_DOC_CONFIG) {
    ret.doc_config = window.PATHUX_DOC_CONFIG;
  }
  if (window.PATHUX_DOCPATH_PREFIX) {
    ret.docpath_prefix = window.PATHUX_DOCPATH_PREFIX;
  }

  return ret;
}

export class ElectronAPI extends DocsAPI {
  first = true
  ready = false
  config!: DocSysConfig

  _doinit() {
    if (!this.first) {
      return this.ready;
    }

    this.first = false;

    let {docpath, doc_config} = getDocPaths();
    console.log(docpath);

    import(docpath).then((docsys: Record<string, unknown>) => {
      let fs = require('fs');
      let marked = require('marked');
      let parse5 = require('parse5');
      let pathmod = require('path');
      let jsdiff = require('diff');

      let initFn = docsys.default as (
        fs: unknown,
        marked: unknown,
        parse5: unknown,
        pathmod: unknown,
        jsdiff: unknown
      ) => DocSysConfig;

      let initialized = initFn(fs, marked, parse5, pathmod, jsdiff);

      this.config = initialized.readConfig(doc_config);
      this.ready = true;
    });

    return this.ready;
  }

  override start() {
    this._doinit();
  }

  checkInit() {
    if (!this.ready) {
      this._doinit();
    }

    if (!this.ready) {
      console.warn("Could not connect to docs server");
    }

    return this.ready;
  }

  override uploadImage(relpath: string | undefined, blobInfo: TinyMCEBlobInfo, success: (path: string) => void, onError: (msg: string) => void) {
    return new Promise<void>((accept, reject) => {
      if (!this.checkInit()) {
        accept();
        return;
      }

      let blob = blobInfo.blob();

      blob.arrayBuffer().then((data) => {
        let path = this.config.uploadImage(relpath ?? "", blobInfo.filename(), data);
        success(path);
        accept();
      }).catch(reject);
    }).catch((error: unknown) => {
      onError("" + error);
    });
  }

  override hasDoc(relpath: string) {
    if (!this.checkInit()) {
      return undefined;
    }

    return new Promise((accept) => {
      accept(this.config.hasDoc(relpath));
    });
  }

  override updateDoc(relpath: string | undefined, data: string | undefined) {
    if (!this.checkInit()) {
      return undefined;
    }

    return new Promise((accept) => {
      accept(this.config.updateDoc(relpath ?? "", data ?? ""));
    });
  }

  override newDoc(relpath: string, data: string | undefined) {
    if (!this.checkInit()) {
      return undefined;
    }

    return new Promise((accept) => {
      accept(this.config.newDoc(relpath, data ?? ""));
    });
  }
}

export class ServerAPI extends DocsAPI {
  override start() {

  }

  override hasDoc(relpath: string) {
    return this.callAPI("hasDoc", relpath);
  }

  override updateDoc(relpath: string | undefined, data: string | undefined) {
    return this.callAPI("updateDoc", relpath, data);
  }

  override newDoc(relpath: string, data: string | undefined) {
    return this.callAPI("newDoc", relpath, data);
  }

  override uploadImage(relpath: string | undefined, blobInfo: TinyMCEBlobInfo, success: (path: string) => void, onError: (msg: string) => void) {
    return new Promise<void>((accept, reject) => {
      let blob = blobInfo.blob();

      blob.arrayBuffer().then((data) => {
        console.log("data!", data);
        let uint8 = new Uint8Array(data);
        let data2: number[] = [];

        for (let i = 0; i < uint8.length; i++) {
          data2.push(uint8[i]);
        }

        console.log("data2", data2);

        this.callAPI("uploadImage", relpath, blobInfo.filename(), data2).then((path: unknown) => {
          success(path as string);
          accept();
        }).catch(reject);
      }).catch(reject);
    }).catch((error: unknown) => {
      onError("" + error);
    });
  }

  callAPI(...callArgs: unknown[]): Promise<unknown> {
    let key = callArgs[0] as string;
    let args: unknown[] = [];
    for (let i = 1; i < callArgs.length; i++) {
      args.push(callArgs[i]);
    }
    console.log(args, callArgs.length);

    let path = location.origin + "/api/" + key;
    console.log(path);

    return new Promise((accept, reject) => {
      fetch(path, {
        headers: {
          "Content-Type": "application/json"
        },
        method : "POST",
        cache  : "no-cache",
        body   : JSON.stringify(args)
      }).then((res) => {
        //console.log(res.text, res.json, "res", res);
        console.log(path);

        if (res.ok || res.status < 300) {
          res.text().then((data) => {
            console.log("got json", data);
            let parsed = JSON.parse(data) as {result: unknown};
            accept(parsed.result);
          }).catch((error: unknown) => {
            console.log("ERROR!", error);
            reject(error);
          });
        } else {
          res.text().then((data) => {
            console.log(data);
            reject(data);
          });
        }
        //let json = res.json();
      }).catch((error: unknown) => {
        reject(error);
      });
    });
  }
}

export class DocHistoryItem {
  url: string
  title: string

  static STRUCT = `
DocHistoryItem {
  url   : string;
  title : string;
}
`

  constructor(url: string, title: string) {
    this.url = url;
    this.title = "" + title;
  }

  loadSTRUCT(reader: StructReader<this>) {
    reader(this);
  }
}

nstructjs.register(DocHistoryItem);

export class DocHistory extends Array<DocHistoryItem> {
  cur = 0

  declare _items: DocHistoryItem[]

  static STRUCT = `
DocHistory {
  _items : array(DocHistoryItem) | this;
  cur    : int;
}
`

  constructor() {
    super();
    this.cur = 0;
  }

  override push(url: string | DocHistoryItem, title: string | DocHistoryItem = url) {
    console.warn("history push", url);

    this.length = this.cur + 1;
    if (url instanceof DocHistoryItem) {
      this[this.length - 1] = url;
    } else {
      this[this.length - 1] = new DocHistoryItem(url, "" + title);
    }
    this.cur++;

    return this.length;
  }

  go(dir: number) {
    dir = Math.sign(dir);
    this.cur = Math.min(Math.max(this.cur + dir, 0), this.length - 1);

    return this[this.cur];
  }

  loadSTRUCT(reader: StructReader<this>) {
    reader(this);

    this.length = 0;
    let cur = this.cur;
    this.cur = 0;

    for (let item of this._items) {
      this.push(item);
    }

    this.cur = cur;
  }
}

nstructjs.register(DocHistory);

/* Container-like interface for the header row frame.
 * UIBase.createElement("rowframe-x") returns a Container (RowFrame),
 * but since it's created dynamically we type the methods we use. */
interface HeaderContainer extends UIBase {
  clear(): void
  check(path: string | undefined, name: string): UIBase & {value: boolean; checked: boolean; onchange: (() => void) | null}
  iconbutton(icon: number, description: string, cb: () => void): UIBase & {iconsheet: number}
  button(label: string, cb: () => void): UIBase & {iconsheet: number}
  listenum(path: string | undefined, name: string, enumDef: Record<string, string>): UIBase & {onselect: ((e: string) => void) | null}
}

export class DocsBrowser extends UIBase {
  _sourceData: string | undefined
  saveCallback: ((doc: Document) => void) | null = null
  handlesDocURL = true
  pathuxBaseURL: string
  editMode = false
  history: DocHistory
  _prefix: string
  saveReq = 0
  saveReqStart: number
  _last_save: number
  header: HeaderContainer
  root: HTMLIFrameElement
  serverapi: DocsAPI
  currentPath = ""
  _doDocInit = true
  contentDiv: HTMLDivElement | undefined
  tinymce: TinyMCEInstance | undefined
  oneditstart: ((browser: DocsBrowser) => void) | undefined
  oneditend: ((browser: DocsBrowser) => void) | undefined

  static STRUCT = `
DocsBrowser {
  currentPath   : string;
  savedDocument : string;
  editMode      : bool;
  history       : DocHistory;
}
`

  constructor() {
    super();

    this._sourceData = undefined;

    this.handlesDocURL = true;
    this.pathuxBaseURL = location.href;

    this.editMode = false;

    this.history = new DocHistory();

    //"../simple_docsys/doc_build/";
    this._prefix = cconst.docManualPath || getDocPaths().docpath_prefix;

    this.saveReq = 0;
    this.saveReqStart = util.time_ms();
    this._last_save = util.time_ms();

    this.header = UIBase.createElement("rowframe-x") as unknown as HeaderContainer;
    this.shadow.appendChild(this.header);

    this.doOnce(this.makeHeader);

    this.root = document.createElement("iframe");
    this.shadow.appendChild(this.root);

    this.root.onload = () => {
      this.initDoc();
    }

    if (window.haveElectron) {
      this.serverapi = new ElectronAPI();
    } else {
      this.serverapi = new ServerAPI();
    }

    this.serverapi.start();

    this.root.style["margin"] = this.root.style["padding"] = this.root.style["border"] = "0px";
    this.root.style["width"] = "100%";
    this.root.style["height"] = "100%";

    this.currentPath = "";
    this._doDocInit = true;

    this.contentDiv = undefined; //inside of iframe
  }

  setEditMode(state: boolean) {
    this.editMode = state;

    if (this.tinymce && this.editMode) {
      this.disableLinks();
      this.tinymce.show();
    } else if (this.tinymce && !this.editMode) {
      this.tinymce.hide();
      this.enableLinks();
    }

    this.makeHeader();

    if (state && this.oneditstart) {
      this.oneditstart(this);
    } else if (!state && this.oneditend) {
      this.queueSave();
      this.oneditend(this);
    }
  }

  go(dir: number) {
    //hrm, use iframe history?
    if (!this.root.contentWindow) {
      return;
    }

    if (dir > 0) {
      this.root.contentWindow.history.forward();
    } else {
      this.root.contentWindow.history.back();
    }
  }

  makeHeader() {
    this.makeHeader_intern();
    //this.flushUpdate();
  }

  makeHeader_intern() {
    console.log("making header", this.header);

    this.header.clear();

    let check = this.header.check(undefined, "Edit Enabled");
    check.value = this.editMode;

    check.onchange = () => {
      console.warn("set edit mode:", check.checked);

      this.setEditMode(check.checked);
    }

    if (!this.editMode) {
      this.header.iconbutton(Icons.LEFT_ARROW, "Back", () => {
        this.go(-1);
      });
      this.header.iconbutton(Icons.RIGHT_ARROW, "Forward", () => {
        this.go(1);
      });

      return;
    }

    if (!this.contentDiv || !this.contentDiv.contentEditable) {
      setTimeout(() => {
        this.makeHeader();
      });
      return;
    }

    this.header.button("NoteBox", () => {
      this.undoPre("Note Box");

      this.execCommand("formatBlock", undefined, "p");
      let sel = this.root.contentDocument!.getSelection();
      let p: Node | null = sel!.anchorNode;
      if (!(p instanceof HTMLElement)) {
        p = (p as Node).parentElement;
      }

      (p as HTMLElement).setAttribute("class", "notebox");

      this.undoPost("Note Box");

      console.log(p);
    })

    let indexOf = (list: NodeList, item: Node) => {
      for (let i = 0; i < list.length; i++) {
        if (list[i] === item) {
          return i;
        }
      }

      return -1;
    }

    this.header.button("Remove", () => {
      let sel = this.root.contentDocument!.getSelection();
      let p: Node | null = sel!.anchorNode;
      if (!p) return;

      if (!(p instanceof HTMLElement)) {
        p = (p as Node).parentElement;
      }

      if (!p) {
        return;
      }

      let parent = p.parentNode!;
      let i = indexOf(parent.childNodes, p);

      if (p === this.contentDiv || p === this.contentDiv!.parentNode || p === this.root.contentDocument!.body) {
        return;
      }

      (p as HTMLElement).remove();

      console.log(p, i);
      let add = parent.childNodes.length > 0 ? parent.childNodes[i] : undefined;
      for (let j = 0; j < p.childNodes.length; j++) {
        if (!add) {
          parent.appendChild(p.childNodes[j]);
        } else {
          parent.insertBefore(p.childNodes[j], add);
        }
      }

    });
    this.header.iconbutton(Icons.BOLD, "Bold", () => {
      this.execCommand("bold");
      console.log("ACTIVE", this.root.contentDocument!.activeElement);
    }).iconsheet = 0;
    this.header.iconbutton(Icons.ITALIC, "Italic", () => {
      this.execCommand("italic");
    }).iconsheet = 0;
    this.header.iconbutton(Icons.UNDERLINE, "Underline", () => {
      this.execCommand("underline");
    }).iconsheet = 0;
    this.header.iconbutton(Icons.STRIKETHRU, "StrikeThrough", () => {
      this.execCommand("strikeThrough");
    }).iconsheet = 0;
    this.header.button("PRE", () => {
      this.execCommand("formatBlock", false, "pre");
    }).iconsheet = 0;
    const styleList = this.header.listenum(undefined, "Style", {
      Paragraph  : "P",
      "Heading 1": "H1",
      "Heading 2": "H2",
      "Heading 3": "H3",
      "Heading 4": "H4",
      "Heading 5": "H5",
    });
    styleList.onselect = ((e: string) => {
      this.execCommand("formatBlock", false, e.toLowerCase());
    }) as unknown as typeof styleList.onselect;
  }

  init() {
    super.init();
    this.setCSS();
  }

  execCommand(...args: [string, ...unknown[]]) {
    this.undoPre(args[0]);
    this.root.contentDocument!.execCommand(args[0], args[1] as boolean | undefined, args[2] as string | undefined);
    this.undoPost(args[0]);
  }

  loadSource(data: string) {
    if (data.trim().length === 0) {
      return;
    }

    if (!(data.trim().toLowerCase().startsWith("<!doctype html>"))) {
      data = "<!doctype html>\n" + data;
    }

    this._sourceData = data;

    this.saveReq = 0;

    let cb = () => {
      if (this.root.contentDocument && (this.root.contentDocument as Document & {readyState?: string}).readyState !== 'loading') {
        this.initDoc();
      } else {
        window.setTimeout(cb, 5);
      }
    };

    console.log("DATA", data);
    this.root.setAttribute("srcDoc", data);
    this.root.onload = cb;

    this._doDocInit = true;
    this.contentDiv = undefined;
  }

  load(url: string) {
    this._sourceData = undefined;
    this.history.push(url, url);

    this.saveReq = 0;

    this.currentPath = url;
    this.root.setAttribute("src", url);
    this.root.onload = () => {
      this.initDoc();
    }
    this._doDocInit = true;
    this.contentDiv = undefined;
  }

  initDoc() {
    if (!tinymceLoaded) {
      this.doOnce(this.initDoc);
      return;
    }

    this._doDocInit = false;
    this.contentDiv = undefined;

    console.log("doc loaded");

    let visit = (n: Node) => {
      if (n instanceof Element) {
        //console.log(n, n.getAttribute("class"))
      }

      if (n instanceof Element && n.getAttribute("class") === "contents") {
        this.contentDiv = n as HTMLDivElement;
        console.log("found content div");
        return;
      }

      //console.log(n.childNodes)
      for (let c of Array.from(n.childNodes)) {
        visit(c);
      }
    }

    if (!this.root.contentDocument) {
      return;
    }
    visit(this.root.contentDocument.body);

    if (!this.contentDiv) {
      let body = this.root.contentDocument.body;

      this.contentDiv = this.root.contentDocument.createElement("div");
      this.contentDiv.setAttribute("class", "contents");

      this.contentDiv.style["margin"] = "0px";
      this.contentDiv.style["padding"] = "0px";

      for (let node of Array.from(body.childNodes)) {
        body.removeChild(node);
        this.contentDiv.appendChild(node);
      }

      body.appendChild(this.contentDiv);
    }

    if (this.contentDiv) {
      if (this.editMode) {
        this.disableLinks();
      }

      let globals = this.root.contentWindow!;

      console.log("tinymce globals:", globals.document, globals);

      window.tinymce = undefined;

      //*
      window.tinyMCEPreInit = {
        suffix         : "",
        baseURL        : this.currentPath,
        documentBaseURL: location.href
      };
      //*/

      let loc = globals.document.location;
      if (loc.href === "about:srcdoc" && this.currentPath && this._sourceData === undefined) {
        if (this.currentPath) {
          loc.href = this.currentPath;
        }
      }


      let base = this.pathuxBaseURL;
      let base_url = (platform as unknown as {resolveURL(path: string, base?: string): string}).resolveURL("scripts/lib/tinymce", base);

      console.warn(window.haveElectron, "haveElectron", base_url);

      let tinymce: TinyMCEInstance = this.tinymce = (globals as unknown as Window).tinymce = window.tinymce = window._tinymce(globals);

      let fixletter = () => {
        if (!tinymce.baseURI.host) {
          return;
        }

        //fix drive letter on windows
        if (window.haveElectron) {
          if ((process as unknown as {platform: string}).platform === "win32") {
            if (tinymce.baseURI.host.trim().length > 0) {
              console.warn("Fixing drive letter", tinymce.baseURI);
              tinymce.baseURI.host += ":";
            }
            tinymce.baseURL = tinymce.baseURI.source = tinymce.baseURI.toAbsolute();
          }
        }
      }

      let _baseuri = tinymce.baseURI;

      Object.defineProperty(tinymce, "baseURI", {
        get() {
          return _baseuri;
        },
        set(v: TinyMCEBaseURI) {
          _baseuri = v;
          if (v) {
            fixletter();
          }
        }
      });

      fixletter();

      if (this.root.contentDocument!.compatMode !== "CSS1Compat") {
        throw new Error("Source document is missing <!doctype html>");
      }

      tinymce.init({
        selector             : "div.contents",
        base_url             : base_url,
        paste_data_images    : true,
        allow_html_data_urls : true,
        plugins              : ['quickbars', 'paste'],
        toolbar              : true,
        menubar              : true,
        inline               : true,
        images_upload_handler: (blobInfo: TinyMCEBlobInfo, success: (path: string) => void, onError: (msg: string) => void) => {
          console.log("uploading image!", blobInfo);
          this.serverapi.uploadImage(this.getDocPath(), blobInfo, success, onError);
        },
        setup                : function (editor: TinyMCEEditor) {
          console.log("tinymce editor setup!", editor);
        }
      }).then((arg) => {
        fixletter();

        this.tinymce = arg[0] as unknown as TinyMCEInstance;

        if (!this.editMode) {
          (this.tinymce as unknown as TinyMCEEditor).hide();
        } else {
          this.disableLinks();
        }
      });

      fixletter();

      let onchange = () => {
        console.log("Input event!");
        this.queueSave();
      }

      this.contentDiv.addEventListener("input", onchange);
      this.contentDiv.addEventListener("change", onchange);
      //this.contentDiv.contentEditable = true;
    }
  }

  queueSave() {
    if (!this.saveReq) {
      this.saveReqStart = util.time_ms();
    }
    this.saveReq = 1;
  }

  undoPre(_label?: string) {
    let undo = this.tinymce!.editors[0].undoManager;
    undo.beforeChange();
  }

  undoPost(_label?: string) {
    let undo = this.tinymce!.editors[0].undoManager;
    undo.add();
  }

  enableLinks() {
    let visit = (n: Node) => {
      if (n instanceof Element && n.getAttribute("class") === "contents") {
        return;
      }

      if (n instanceof Element && n.tagName === "A") {
        let href = n.getAttribute("_href");
        if (href) {
          n.setAttribute("href", href);
        }
      }
      for (let c of Array.from(n.childNodes)) {
        visit(c);
      }
    }

    visit(this.root.contentDocument!.body);
  }

  disableLinks() {
    let visit = (n: Node) => {
      if (n instanceof Element && n.getAttribute("class") === "contents") {
        return;
      }

      if (n instanceof Element && n.tagName === "A") {
        let href = n.getAttribute("href");
        if (href) {
          n.setAttribute("_href", href);
        }
        n.removeAttribute("href");
      }
      for (let c of Array.from(n.childNodes)) {
        visit(c);
      }
    }

    visit(this.root.contentDocument!.body);
  }

  patchImageTags() {
    console.log("patching image tags");

    if (!this.contentDiv) {
      return;
    }

    let tags: HTMLImageElement[] = [];

    let traverse = (n: Element) => {
      if (n.tagName === "IMG" && !n.getAttribute("_PATCHED_")) {
        tags.push(n as HTMLImageElement);
      }
      for (let c of Array.from(n.children)) {
        traverse(c);
      }
    }

    traverse(this.contentDiv);

    console.log("Image Tags found:", tags);
    for (let t of tags) {
      this.patchImage(t);
      t.setAttribute("_PATCHED_", "true");
    }
  }

  patchImage(img: HTMLImageElement) {
    //OKAY, this isn't going to work
    img.style.cssFloat = "right";
    return; //XXX

    /* Dead code below - kept for future reference */
    /* istanbul ignore next */
    console.warn("Patching image!");

    let grab = (i: number, vs: Vector2[]) => {
      console.log("Transform Modal start");

      let horiz = i%2 != 0 ? 1 : 0;

      let update = () => {
        let x = vs[0][0], y = vs[0][1];
        let w = vs[2][0] - vs[0][0];
        let h = vs[1][1] - vs[0][1];

        img.style["display"] = "float";
        img.style["left"] = x + "px";
        img.style["top"] = y + "px";
        img.style["width"] = w + "px";
        img.style["height"] = h + "px";
      }

      update();

      let modaldata: ReturnType<typeof pushModalLight> | undefined;
      let first = true;
      let last_mpos = new Vector2();
      let start_mpos = new Vector2();

      let end = () => {
        if (modaldata) {
          console.log("done.");
          popModalLight(modaldata);
          modaldata = undefined;
        }
      }

      let ghandlers = {
        on_mousedown(_e: MouseEvent) {

        },

        on_mousemove(e: MouseEvent) {
          console.log("modal move");
          if (first) {
            first = false;
            start_mpos[0] = last_mpos[0] = e.x;
            start_mpos[1] = last_mpos[1] = e.y;
            return;
          }

          let dx = e.x - last_mpos[0], dy = last_mpos[1] - e.y;
          console.log(dx.toFixed(2), dy.toFixed(2));

          last_mpos[0] = e.x;
          last_mpos[1] = e.y;
        },
        on_mouseup(_e: MouseEvent) {
          end();
        },

        on_keydown(e: KeyboardEvent) {
          console.log(e.keyCode);

          if (e.keyCode === 27) {
            end();
          }
        }
      }

      modaldata = pushModalLight(ghandlers);
      console.warn("grab!", modaldata);
    }

    let mpos = new Vector2();
    let first = true;
    let tdown = true;
    let mdown = false;

    let ix = 0, iy = 0;
    let width = img.width, height = img.height;

    img.setAttribute("draggable", "false");
    let getsize = () => {
      let rects = img.getClientRects();
      let r = rects[0];
      if (!r) {
        setTimeout(getsize, 2)
        return;
      }

      console.log("got image size", width, height, img.width, img.height);
      width = r.width;
      height = r.height;
    }

    let resizing = false;
    let moving = false;

    let handlers: Record<string, (e: PointerEvent, x?: number, y?: number, button?: number) => void> = {
      pointerover(_e: PointerEvent) {
        console.log("mouse over!")
      },
      pointerleave(_e: PointerEvent) {
        console.log("mouse leave!")
      },
      pointerdown(e: PointerEvent, x = e.x, y = e.y, _button = e.button) {
        //this.contentDiv.contentEditable = false;
        mpos[0] = x;
        mpos[1] = y;
        mdown = true;
        resizing = false;
        moving = false;

        img.setPointerCapture(e.pointerId);
      },
      pointermove(e: PointerEvent, x = e.x, y = e.y, _button = e.button) {
        if (first) {
          mpos[0] = x;
          mpos[1] = y;
          first = false;
          return;
        }

        console.log(moving);

        if (moving) {
          let dx = x - mpos[0], dy = y - mpos[1];
          console.log("mdown!", dx, dy);

          ix += dx;
          iy += dy;

          img.style["position"] = "relative";
          img.style["display"] = "inline";
          img.style["left"] = ix + "px";
          img.style.cssFloat = "right";
          img.style["top"] = iy + "px";
        }

        if (resizing) {
          let dx = x - mpos[0], dy = y - mpos[1];
          console.log("mdown!", dx, dy);

          width += dy;
          height += dy;

          img.style["width"] = width + "px";
          img.style["height"] = height + "px";

          console.log("ix", ix);
        }
        mpos[0] = x;
        mpos[1] = y;
        //console.log(x.toFixed(2), y.toFixed(2));

        let r = img.getBoundingClientRect();
        if (!r) {
          return;
        }

        let verts = [
          new Vector2([r.x, r.y]),
          new Vector2([r.x, r.y + r.height]),
          new Vector2([r.x + r.width, r.y + r.height]),
          new Vector2([r.x + r.width, r.y]),
        ]

        let ret: number | undefined = undefined;
        let mindis = 1e17;

        for (let i = 0; i < 4; i++) {
          let i1 = i, i2 = (i + 1)%4;
          let v1 = verts[i1], v2 = verts[i2];

          let horiz = i%2 !== 0.0 ? 1 : 0;
          let dv = mpos[horiz as 0 | 1] - (v1[horiz as 0 | 1] as number);

          if (Math.abs(dv) < 15 && Math.abs(dv) < mindis) {
            mindis = Math.abs(dv);
            ret = i;
            console.log("border!", i);
          }
        }

        if (ret !== undefined && !moving) {
          img.setAttribute("draggable", "false");

          if (mdown) {
            resizing = true;
            img.setPointerCapture(e.pointerId);
          }
        } else if (!resizing && mdown) {
          moving = true;
          img.setPointerCapture(e.pointerId);
          //img.setAttribute("draggable", "true");
        }
      },

      pointerup(e: PointerEvent, x = e.x, y = e.y, _button = e.button) {
        mpos[0] = x;
        mpos[1] = y;
        mdown = false;
        if (resizing) {
          img.releasePointerCapture(e.pointerId);
        }
        resizing = false;
        moving = false;
      },
      pointercancel(_e: PointerEvent) {
        mdown = false;
        moving = false;
      },
    }

    window.setInterval(() => {
      if (1 || !mdown) {
        let val = img.getAttribute("draggable");
        img.setAttribute("draggable", "false");
        if (val) {
          img.setAttribute("draggable", val);
        }
      }
    }, 200)

    for (let k in handlers) {
      img.addEventListener(k, handlers[k] as EventListener, true);
    }
  }

  toMarkdown() {
    if (this.contentDiv === undefined) {
      return;
    }

    let buf = "";

    let visit: (() => void) | undefined;
    let liststack: [string, number][] = [];
    let image_idgen = 0;

    let getlist = () => {
      if (liststack.length > 0)
        return liststack[liststack.length - 1];
      return undefined;
    }

    type NodeHandler = (n: Node) => void
    let handlers: Record<string, NodeHandler> = {
      TEXT(n: Node) {
        console.log("Text data:", (n as Text).data);
        buf += n.textContent;
      },

      H1(n: Node) {
        buf += "\n# " + (n as HTMLElement).innerHTML.trim() + "\n\n";
      },
      H2(n: Node) {
        buf += "\n## " + (n as HTMLElement).innerHTML.trim() + "\n\n";
      },
      H3(n: Node) {
        buf += "\n### " + (n as HTMLElement).innerHTML.trim() + "\n\n";
      },
      H4(n: Node) {
        buf += "\n#### " + (n as HTMLElement).innerHTML.trim() + "\n\n";
      },
      H5(n: Node) {
        buf += "\n##### " + (n as HTMLElement).innerHTML.trim() + "\n\n";
      },

      IMG(n: Node) {
        buf += `<!--$IMG${image_idgen++}-->`;
        buf += (n as HTMLElement).outerHTML;
        buf += `<!--/$IMG${image_idgen++}-->`;
        visit!();
      },

      TABLE(n: Node) {
        buf += (n as HTMLElement).outerHTML;
        visit!();
      },

      P(_n: Node) {
        buf += "\n";
        visit!();
      },

      BR(_n: Node) {
        buf += "\n";
      },

      A(n: Node) {
        buf += `[${(n as HTMLElement).innerHTML}](${(n as Element).getAttribute("href")})`
      },

      B(_n: Node) {
        buf += "<b>"
        visit!();
        buf += "</b>"
      },

      STRONG(_n: Node) {
        buf += "<strong>"
        visit!();
        buf += "</strong>"
      },

      EM(_n: Node) {
        buf += "<em>"
        visit!();
        buf += "</em>"
      },
      STRIKE(_n: Node) {
        buf += "<strike>"
        visit!();
        buf += "</strike>"
      },

      I(_n: Node) {
        buf += "<i>"
        visit!();
        buf += "</i>"
      },

      U(_n: Node) {
        buf += "<u>"
        visit!();
        buf += "</u>"
      },

      UL(_n: Node) {
        liststack.push(["UL", 0]);
        visit!();
        liststack.pop();
      },

      OL(_n: Node) {
        liststack.push(["OL", 1]);
        visit!();
        liststack.pop();
      },

      LI(_n: Node) {
        let head = getlist();
        if (head && head[0] === "OL") {
          buf += head[1] + ".  ";
          head[1]++;
        } else {
          buf += "*  "
        }
        visit!()
      },

      PRE(_n: Node) {
        let start = buf;

        visit!();

        let data = buf.slice(start.length, buf.length);
        let lines = data.split("\n");
        let bad = false;
        for (let l of lines) {
          if (!l.startsWith("    ")) {
            bad = true;
            break;
          }
        }

        if (bad) {
          buf = start + "<pre>" + data + "</pre>\n"
        } else {
          buf = start + data;
        }

      }
    }

    let traverse = (n: Node) => {
      visit = () => {
        for (let c of Array.from(n.childNodes)) {
          traverse(c);
        }
      }

      if (n.constructor.name === "Text") {
        handlers.TEXT(n);
      } else {
        let tag = (n as Element).tagName;
        if (tag in handlers) {
          handlers[tag](n);
        } else {
          visit();
        }
      }
    }

    traverse(this.contentDiv);

    return buf;
  }

  getDocPath(): string | undefined {
    if (!this.root.contentDocument) {
      return undefined;
    }

    let href = this.root.contentDocument.location.href;

    //console.log(document.location.href, this.root.src);

    let path = relative(dirname(document.location.href), href).trim();
    while (path.startsWith("/")) {
      path = path.slice(1, path.length);
    }

    console.error("PATH", path, this._prefix);

    if (!path) return undefined;

    if (path.startsWith(this._prefix)) {
      path = path.slice(this._prefix.length, path.length).trim();
    }

    if (!path.startsWith("/")) {
      path = "/" + path;
    }

    return path;
    /*
    let path = this.currentPath;
    if (path.startsWith(this._prefix)) {
      path = path.slice(this._prefix.length, path.length).trim();
    }

    if (!path.startsWith("/")) {
      path = "/" + path;
    }

    return path;//*/
  }

  save() {
    if (!this.contentDiv) {
      this.report("Save Error", "red");
      return;
    }

    if (this.saveReq === 2) {
      if (util.time_ms() - this.saveReqStart > 13000) {
        this.saveReqStart = util.time_ms();
        this.saveReq = 1;
        console.log("save timeout");
      } else {
        return;
      }
    }

    this.report("Saving...", "yellow", 400);

    if (this.saveCallback) {
      this.saveCallback(this.root.contentDocument!);
      return;
    }

    let path = this.getDocPath();

    console.log("saving " + path);

    this.saveReq = 2;

    this.serverapi.updateDoc(path, this.contentDiv.innerHTML)!.then((result: unknown) => {
      this.saveReq = 0;
      console.log("Sucess! Saved document", result);

      if (result) {
        console.log("Server changed final document; reloading...");
        this.contentDiv!.innerHTML = result as string;
      }

      this.report("Saved", "green", 750)
    }).catch((error: unknown) => {
      console.error(error);
    });
  }

  updateCurrentPath() {
    if (!this.contentDiv || !this.handlesDocURL) {
      return;
    }

    let href = this.root.contentDocument!.location.href;
    href = relative(dirname(location.href), href).trim();

    if (href !== this.currentPath) {
      console.log("path change detected", href);
      this.history.push(href, href);

      this.currentPath = href;
    }
  }


  //send notifications to user
  report(message: string, color?: string, timeout?: number) {
    const ctx = this.ctx as unknown as Record<string, unknown>;
    if (ctx && ctx.report) {
      console.warn("%c" + message, "color : " + color + ";");
      (ctx.report as (msg: string, color?: string, timeout?: number) => void)(message, color, timeout);
    } else {
      console.warn("%c" + message, "color : " + color + ";");
    }
  }

  update() {
    if (this.saveReq) {
      if (util.pollTimer(this._id, 500)) {
        this.report("saving...", "yellow", 400);
      }
    }

    this.updateCurrentPath();

    if (this._doDocInit && this.root.contentDocument && this.root.contentDocument.readyState === "complete") {
      //this.initDoc();
    } else if (!this._doDocInit && this.saveReq) {
      if (util.time_ms() - this._last_save > 500) {
        this.save();
        this._last_save = util.time_ms();
      }
    }
  }

  setCSS() {
    if (!this.root) {
      return;
    }

    this.style.width = "100%";
    this.style.height = "max-contents";

    this.root.style["backgroundColor"] = "grey";
  }

  static newSTRUCT() {
    return UIBase.createElement("docs-browser-x");
  }

  loadSTRUCT(reader: StructReader<this>) {
    reader(this);

    this.doOnce(this.makeHeader);

    this.root.setAttribute("src", this.currentPath);
  }

  static define() {
    return {
      tagname: "docs-browser-x",
      style  : "docsbrowser"
    }
  }
}

UIBase.internalRegister(DocsBrowser);
nstructjs.register(DocsBrowser);
