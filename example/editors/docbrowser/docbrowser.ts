import { Editor } from "../editor_base.js";
import {
  pushModalLight,
  popModalLight,
  Icons,
  UIBase,
  nstructjs,
  util,
  Vector2,
  Matrix4,
  cconst,
  PlatformAPI,
  platform as Platform
} from "../../pathux.js";
// DocsBrowser lives in the optional pathux_with_docbrowser bundle, not the main
// pathux entry; import it from source so the example bundle includes it and the
// "docs-browser-x" custom element gets registered.
import { DocsBrowser } from "../../../scripts/docbrowser/docbrowser";
// note: we need this import statement here due to esbuild pruning the above one in error
import "../../../scripts/docbrowser/docbrowser";

let platform: unknown;
Platform.getPlatformAsync().then((p) => (platform = p));

const countstr = function (buf: string, s: string) {
  let count = 0;

  while (buf.length > 0) {
    const i = buf.search(s);
    if (i < 0) {
      break;
    }

    buf = buf.slice(i + 1, buf.length);
    count++;
  }

  return count;
};

function basename(path: string) {
  while (path.length > 0 && path.trim().endsWith("/")) {
    path = path.slice(0, path.length - 1);
  }

  path = path.replace(/\/+/g, "/");
  const parts = path.split("/");
  return parts[parts.length - 1];
}

function dirname(path: string) {
  while (path.length > 0 && path.trim().endsWith("/")) {
    path = path.slice(0, path.length - 1);
  }

  const parts = path.split("/");
  parts.length--;

  let s = "";
  for (const t of parts) {
    s += t + "/";
  }

  while (s.endsWith("/")) {
    s = s.slice(0, s.length - 1);
  }

  return s;
}

function relative(a1: string, b1: string) {
  let a = a1;
    let b = b1;

  let i = 1;
  while (i <= a.length && b.startsWith(a.slice(0, i + 1))) {
    i++;
  }
  i--;
  const pref = "";

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

window._relative = relative as typeof window._relative;

export class SavedDocument {
  static STRUCT: string;
  data: string;

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
  static STRUCT: string;
  _browser: DocsBrowser;
  savedDocument: SavedDocument;

  constructor() {
    super();

    this._browser = UIBase.createElement<DocsBrowser>("docs-browser-x");

    Platform.getPlatformAsync().then((platform) => {
      const base = (platform as typeof PlatformAPI).resolveURL("../");
      this._browser.pathuxBaseURL = base;
    });

    this.savedDocument = new SavedDocument();
  }

  get browser() {
    return this._browser;
  }

  set browser(b: DocsBrowser) {
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
      this.browser.load("../simple_docsys/doc_build/index.html");
    }

    this.style.overflow = "scroll";

    this.header!.button("Save", () => {
      this.browser.queueSave();
    });
  }
  static define() {
    return {
      uiname  : "Docs Browser",
      areaname: "docs-browser-editor-x",
      tagname : "docs-browser-editor-x",
    };
  }

  loadSTRUCT(reader: (obj: this) => void) {
    reader(this);
    super.loadSTRUCT(reader);
  }
}

//Editor.register(DocsBrowserEditor);
DocsBrowserEditor.STRUCT =
  nstructjs.inherit(DocsBrowserEditor, Editor) +
  `
  browser        : DocsBrowser;
  savedDocument  : SavedDocument;
}
`;
nstructjs.register(DocsBrowserEditor);
Editor.register(DocsBrowserEditor);

function oldSave(this: DocsBrowserEditor) {
  const doc = this.browser.root.contentDocument!;
  const head = doc.head;
  const style = document.createElement("style");
  head.appendChild(style);

  let text = "";
  for (const sheet of doc.styleSheets) {
    let rules: CSSRuleList;

    try {
      rules = sheet.rules;
    } catch (error) {
      continue; //can't read rules
    }
    for (const rule of rules) {
      text += rule.cssText + "\n\n";
    }
  }

  style.textContent = text;

  const data = `<!doctype html>
<html>
${doc.head.outerHTML.trim()}
${doc.body.outerHTML.trim()}
</html>
      `;

  console.log(data);
  this.savedDocument.data = data;
  _appstate.saveLocalStorage();
}

/*this.header.button("Clear", () => {
    if (prompt("ok?", "true")) {
      this.savedDocument.data = "";
      console.log("cleared saved data");
      _appstate.saveLocalStorage();
    }
  })//*/
