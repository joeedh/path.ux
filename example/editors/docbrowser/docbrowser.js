import {Editor} from "../editor_base.js";
import {pushModalLight, popModalLight, Icons, UIBase, nstructjs, util, Vector2, Matrix4, cconst} from '../../pathux.js';

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

export class DocsBrowser extends UIBase {
  constructor() {
    super();

    this.header = document.createElement("rowframe-x");
    this.shadow.appendChild(this.header);
    this.makeHeader()

    this.root = document.createElement("iframe");
    this.shadow.appendChild(this.root);

    this.root.onload = () => {
      this.initDoc();
    }

    this.root.style["margin"] = this.root.style["padding"] = this.root.style["border"] = "0px";
    this.root.style["width"] = "100%";
    this.root.style["height"] = "100%";

    this.currentPath = "";
    this._doDocInit = true;

    this.contentDiv = undefined; //inside of iframe
  }

  makeHeader() {
    if (!this.contentDiv || !this.contentDiv.contentEditable) {
      setTimeout(() => {
        this.makeHeader();
      });
      return;
    }

    this.header.button("NoteBox", () => {
      this.root.contentDocument.execCommand("formatBlock", undefined, "p");
      let sel = this.root.contentDocument.getSelection();
      let p = sel.anchorNode;
      if (!(p instanceof HTMLElement)) {
        p = p.parentElement;
      }

      p.setAttribute("class", "notebox");

      console.log(p);
    })

    let indexOf = (list, item) => {
      for (let i=0; i<list.length; i++) {
        if (list[i] === item) {
          return i;
        }
      }

      return -1;
    }

    this.header.button("Remove", () => {
      let sel = this.root.contentDocument.getSelection();
      let p = sel.anchorNode;
      if (!p) return;

      if (!(p instanceof HTMLElement)) {
        p = p.parentElement;
      }

      if (!p) {
        return;
      }

      let parent = p.parentNode;
      let i = indexOf(p.parentNode.childNodes, p);

      if (p === this.contentDiv || p === this.contentDiv.parentNode || p === this.root.contentDocument.body) {
        return;
      }

      p.remove();

      console.log(p, i);
      let add = parent.childNodes.length > 0 ? parent.childNodes[i] : undefined;
      for (let i=0; i<p.childNodes.length; i++) {
        if (!add) {
          parent.appendChild(p.childNodes[i]);
        } else {
          parent.insertBefore(p.childNodes[i], add);
        }
      }

    });
    this.header.iconbutton(Icons.BOLD, "Bold", () => {
      this.root.contentDocument.execCommand("bold");
      console.log("ACTIVE", this.root.contentDocument.activeElement);
    }).iconsheet = 0;
    this.header.iconbutton(Icons.ITALIC, "Italic", () => {
      this.root.contentDocument.execCommand("italic");
    }).iconsheet = 0;
    this.header.iconbutton(Icons.UNDERLINE, "Underline", () => {
      this.root.contentDocument.execCommand("underline");
    }).iconsheet = 0;
    this.header.iconbutton(Icons.STRIKETHRU, "StrikeThrough", () => {
      this.root.contentDocument.execCommand("strikeThrough");
    }).iconsheet = 0;
    this.header.button("PRE", () => {
      this.root.contentDocument.execCommand("formatBlock", false, "pre");
    }).iconsheet = 0;
    this.header.listenum(undefined, "Style", {
      Paragraph     : "P",
      "Heading 1"   : "H1",
      "Heading 2"   : "H2",
      "Heading 3"   : "H3",
      "Heading 4"   : "H4",
      "Heading 5"   : "H5",
    }).onselect = (e) => {
      this.root.contentDocument.execCommand("formatBlock", false, e.toLowerCase());
    }
  }
  init() {
    super.init();
    this.setCSS();
  }

  loadSource(data) {
    this.root.setAttribute("srcDoc", data);
    this.root.onload = () => {
      this.initDoc();
    }
    this._doDocInit = true;
    this.contentDiv = undefined;
  }

  load(url) {
    this.currentPath = url;
    this.root.setAttribute("src", url);
    this.root.onload = () => {
      this.initDoc();
    }
    this._doDocInit = true;
    this.contentDiv = undefined;
  }

  initDoc() {
    this._doDocInit = false;
    this.contentDiv = undefined;

    console.log("doc loaded");

    let visit = (n) => {
      if (n.getAttribute) {
        //console.log(n, n.getAttribute("class"))
      }

      if (n.getAttribute && n.getAttribute("class") === "contents") {
        this.contentDiv = n;
        console.log("found content div");
        return;
      }

      //console.log(n.childNodes)
      for (let c of n.childNodes) {
        visit(c);
      }
    }

    visit(this.root.contentDocument.body);

    if (this.contentDiv) {
      this.contentDiv.contentEditable = true;
      this.patchImageTags();

      this.disableLinks();

      this.contentDiv.addEventListener("input", (e) => {
        if (e.inputType === "insertFromPaste") {
          this.patchImageTags();
        }
        //document.execCommand("enableObjectResizing");
        console.log("input event!", e);
      });
    }
  }

  disableLinks() {
    let visit = (n) => {
      if (n.tagName === "A") {
        n.setAttribute("_href", n.getAttribute("href"));
        n.removeAttribute("href");
      }
      for (let c of n.childNodes) {
        visit(c);
      }
    }

    visit(this.root.contentDocument.body);
  }
  patchImageTags() {
    console.log("patching image tags");

    if (!this.contentDiv) {
      return;
    }

    let tags = [];

    let traverse = (n) => {
      if (n.tagName === "IMG" && !n.getAttribute("_PATCHED_")) {
        tags.push(n);
      }
      for (let c of n.children) {
        traverse(c);
      }
    }

    traverse(this.contentDiv);

    console.log("Image Tags found:", tags);
    for (let t of tags) {
      this.patchImage(t);
      t.setAttribute("_PATCHED_", true);
    }
  }

  patchImage(img) {
    //OKAY, this isn't going to work
    img.style.float = "right";
    return; //XXX

    console.warn("Patching image!");

    let grab = (i, vs) => {
      console.log("Transform Modal start");

      let horiz = i % 2 != 0 ? 1 : 0;

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

      let modaldata;
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
        on_mousedown(e) {

        },

        on_mousemove(e) {
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
        on_mouseup(e) {
          end();
        },

        on_keydown(e) {
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
      let r = img.getClientRects[0]
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

    let handlers = {
      pointerover(e) {
        console.log("mouse over!")
      },
      pointerleave(e) {
        console.log("mouse leave!")
      },
      pointerdown(e, x=e.x, y=e.y, button=e.button) {
        //this.contentDiv.contentEditable = false;
        mpos[0] = x;
        mpos[1] = y;
        mdown = true;
        resizing = false;
        moving = false;

        img.setPointerCapture(e.pointerId);
      },
      pointermove(e, x=e.x, y=e.y, button=e.button) {
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
          img.style.float = "right";
          img.style["top"] = iy + "px";
        }

        if (resizing) {
          let dx = x - mpos[0], dy = y - mpos[1];
          console.log("mdown!", dx, dy);

          width += dy;
          height += dy;

          img.style["width"] = width  + "px";
          img.style["height"] = height+  "px";

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
          new Vector2([r.x, r.y+r.height]),
          new Vector2([r.x+r.width, r.y+r.height]),
          new Vector2([r.x+r.width, r.y]),
        ]

        let ret = undefined;
        let mindis = 1e17;

        for (let i=0; i<4; i++) {
          let i1 = i, i2 = (i + 1) % 4;
          let v1 = verts[i1], v2 = verts[i2];

          let horiz = i % 2 !== 0.0 ? 1 : 0;
          let dv = mpos[horiz] - v1[horiz];

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

      pointerup(e, x=e.x, y=e.y, button=e.button) {
        mpos[0] = x;
        mpos[1] = y;
        mdown = false;
        if (resizing) {
          this.releasePointerCapture(e.pointerId);
        }
        resizing = false;
        moving = false;
      },
      pointercancel(e) {
        mdown = false;
        moving = false;
      },
    }

    window.setInterval(() => {
      if (1||!mdown) {
        let val = img.getAttribute("draggable");
        img.setAttribute("draggable", "false");
        img.setAttribute("draggable", val);
      }
    }, 200)

    for (let k in handlers) {
      img.addEventListener(k, handlers[k].bind(this), true);
    }
  }

  toMarkdown() {
    if (this.contentDiv === undefined) {
      return;
    }

    let buf = "";

    let visit;
    let liststack = [];
    let image_idgen = 0;

    let getlist = () => {
      if (liststack.length > 0)
        return liststack[liststack.length-1];
    }

    let handlers = {
      TEXT(n) {
        console.log("Text data:", n.data);
        buf += n.textContent;
      },

      H1(n) {
        buf += "\n# " + n.innerHTML.trim() + "\n\n";
      },
      H2(n) {
        buf += "\n## " + n.innerHTML.trim() + "\n\n";
      },
      H3(n) {
        buf += "\n### " + n.innerHTML.trim() + "\n\n";
      },
      H4(n) {
        buf += "\n#### " + n.innerHTML.trim() + "\n\n";
      },
      H5(n) {
        buf += "\n##### " + n.innerHTML.trim() + "\n\n";
      },

      IMG(n) {
        buf += `<!--$IMG${image_idgen++}-->`;
        buf += n.outerHTML;
        buf += `<!--/$IMG${image_idgen++}-->`;
        visit();
      },

      TABLE(n) {
        buf += n.outerHTML;
        visit();
      },

      P(n) {
        buf += "\n";
        visit();
      },

      BR(n) {
        buf += "\n";
      },

      A(n) {
        buf += `[${n.innerHTML}](${n.getAttribute("href")})`
      },

      B(n) {
        buf += "<b>"
        visit();
        buf += "</b>"
      },

      STRONG(n) {
        buf += "<strong>"
        visit();
        buf += "</strong>"
      },

      EM(n) {
        buf += "<em>"
        visit();
        buf += "</em>"
      },
      STRIKE(n) {
        buf += "<strike>"
        visit();
        buf += "</strike>"
      },

      I(n) {
        buf += "<i>"
        visit();
        buf += "</i>"
      },

      U(n) {
        buf += "<u>"
        visit();
        buf += "</u>"
      },

      UL(n) {
        liststack.push(["UL", 0]);
        visit();
        liststack.pop();
      },

      OL(n) {
        liststack.push(["OL", 1]);
        visit();
        liststack.pop();
      },

      LI(n) {
        let head = getlist();
        if (head && head[0] === "OL") {
          buf += head[1] + ".  ";
          head[1]++;
        } else {
          buf += "*  "
        }
        visit()
      },

      PRE(n) {
        let start = buf;

        visit();

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

    let traverse = (n) => {
      visit = () => {
        for (let c of n.childNodes) {
          traverse(c);
        }
      }

      if (n.constructor.name === "Text") {
        handlers.TEXT(n);
      } else {
        let tag = n.tagName;
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

  update() {
    if (this._doDocInit && this.root.contentDocument && this.root.contentDocument.readyState === "complete") {
      //this.initDoc();
    }
  }

  setCSS() {
    this.style.width = "100%";
    this.style.height = "max-contents";

    this.root.style["background-color"] = "grey";
  }

  static newSTRUCT() {
    return document.createElement("docs-browser-x");
  }

  loadSTRUCT(reader) {
    reader(this);

    this.root.setAttribute("src", this.currentPath);
  }

  static define() {return {
    tagname : "docs-browser-x",
    style   : "docsbrowser"
  }}
}

DocsBrowser.STRUCT = `
DocsBrowser {
  currentPath   : string;
  savedDocument : string;
}
`;

UIBase.register(DocsBrowser);
nstructjs.register(DocsBrowser);

export class DocsBrowserEditor extends Editor {
  constructor() {
    super();

    this._browser = document.createElement("docs-browser-x");
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
    });

    this.header.button("Clear", () => {
      if (prompt("ok?", "true")) {
        this.savedDocument.data = "";
        console.log("cleared saved data");
        _appstate.saveLocalStorage();
      }
    })
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

Editor.register(DocsBrowserEditor);
DocsBrowserEditor.STRUCT = nstructjs.inherit(DocsBrowserEditor, Editor) + `
  browser        : DocsBrowser;
  savedDocument  : SavedDocument;
}
`;
nstructjs.register(DocsBrowserEditor);