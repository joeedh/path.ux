import {Editor} from "../editor_base.js";
import {pushModalLight, popModalLight, Icons, UIBase, nstructjs, util, Vector2, Matrix4, cconst} from '../../pathux.js';
//import '../../lib/tinymce/js/tinymce/tinymce.js';
import {DocsBrowser} from '../../../scripts/docbrowser/docbrowser.js';
import {platform} from '../../../scripts/platforms/platform.js';

let countstr = function(buf, s) {
  let count = 0;

  while (buf.length > 0) {
    let i = buf.search(s);
    if (i < 0) {
      break;
    }

    buf = buf.slice(i+1, buf.length);
    count++;
  }

  return count;
}

function basename(path) {
  while (path.length > 0 && path.trim().endsWith("/")) {
    path = path.slice(0, path.length-1);
  }

  path = path.replace(/\/+/g, "/");
  path = path.split("/");
  return path[path.length-1];
}

function dirname(path) {
  while (path.length > 0 && path.trim().endsWith("/")) {
    path = path.slice(0, path.length-1);
  }

  path = path.split("/");
  path.length--;

  let s = "";
  for (let t of path) {
    s += t + "/";
  }

  while (s.endsWith("/")) {
    s = s.slice(0, s.length - 1);
  }

  return s;
}


function relative(a1, b1) {
  let a = a1, b = b1;

  let i = 1;
  while (i <= a.length && b.startsWith(a.slice(0, i+1))) {
    i++;
  }
  i--
  let pref = "";

  a = a.slice(i, a.length).trim();
  b = b.slice(i, b.length).trim();

  let s = "";

  for (let i = 0; i < countstr(a, "/"); i++) {
    s += "../";
  }

  if (s.endsWith("/") && b.startsWith("/")) {
    s = s.slice(0, s.length-1);
  }

  return s + b;
}

window._relative = relative;

export class SavedDocument {
  constructor() {
    this.data = "";
  }
}
SavedDocument.STRUCT = `
SavedDocument {
  data : string;
}`;
nstructjs.register(SavedDocument);

//window.PATHUX_DOCPATH = "../simple_docsys/docsys.js"
//window.PATHUX_DOC_CONFIG = "../simple_docsys/docs.config.js"

export class DocsBrowserEditor extends Editor {
  constructor() {
    super();

    let base = platform.resolveURL("../");

    this._browser = UIBase.createElement("docs-browser-x");
    this._browser.pathuxBaseURL = base;

    this.savedDocument = new SavedDocument();
  }

  get browser() {
    return this._browser;
  }

  set browser(b) {
    if (this._browser && b !== this._browser) {
      if (this._browser.isConnected) {
        this._browser.remove();
        this.shadow.appendChild(b);
      }
    }

    this._browser = b;
  }

  init() {
    super.init();
    this.shadow.appendChild(this.browser);

    if (this.savedDocument.data.trim().length > 0) {
      this.browser.loadSource(this.savedDocument.data);
    } else if (this.browser.currentPath.trim().length === 0) {
      this.browser.load("../simple_docsys/doc_build/index.html")
    }

    this.style["overflow"] = "scroll";

    this.header.button("Save", () => {
      this.browser.queueSave();
    });
  }
  static define() {return {
    uiname    : "Docs Browser",
    areaname  : "docs-browser-editor-x",
    tagname   : "docs-browser-editor-x"
  }}

  loadSTRUCT(reader) {
    reader(this);
    super.loadSTRUCT(reader);
  }
}

//Editor.register(DocsBrowserEditor);
DocsBrowserEditor.STRUCT = nstructjs.inherit(DocsBrowserEditor, Editor) + `
  browser        : DocsBrowser;
  savedDocument  : SavedDocument;
}
`;
nstructjs.register(DocsBrowserEditor);
Editor.register(DocsBrowserEditor);

function oldSave() {
    let doc = this.browser.root.contentDocument;
    let head = doc.head;
    let style = document.createElement("style");
    head.appendChild(style);

    let text = "";
    for (let sheet of doc.styleSheets) {
      let rules;

      try {
        rules = sheet.rules;
      } catch (error) {
        continue; //can't read rules
      }
      for (let rule of sheet.rules) {
        text += rule.cssText + "\n\n";
      }
    }

    style.textContent = text;

    let data = `<!doctype html>
<html>
${doc.head.outerHTML.trim()}
${doc.body.outerHTML.trim()}
</html>
      `;

    console.log(data);
    this.savedDocument.data = data;
    _appstate.saveLocalStorage();
  };

  /*this.header.button("Clear", () => {
    if (prompt("ok?", "true")) {
      this.savedDocument.data = "";
      console.log("cleared saved data");
      _appstate.saveLocalStorage();
    }
  })//*/
