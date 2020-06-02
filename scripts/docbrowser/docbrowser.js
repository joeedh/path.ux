/**
documentation browser, with editing support
note that you must set window.TINYMCE_PATH
*/

import {pushModalLight, popModalLight, Icons, UIBase, nstructjs, util, Vector2, Matrix4, cconst} from '../../pathux.js';

//import '../../lib/tinymce/js/tinymce/tinymce.js';

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

export class DocsAPI {
  updateDoc(relpath, data) {
    //returns a promise
  }
  uploadImage(blobInfo, success, onError) {

  }
  newDoc(relpath, data) {
    //returns a promise
  }
  hasDoc(relpath, data) {
    //returns a promise
  }

  uploadImage(relpath, blobInfo, success, onError) {
    //returns a promise
  }
}


window.PATHUX_DOCPATH = "../simple_docsys/docsys.js"
window.PATHUX_DOC_CONFIG = "../simple_docsys/docs.config.js"

export class ElectronAPI extends DocsAPI {
  constructor() {
    super();

    this.first = true;
  }

  _doinit() {
    if (!this.first) {
      return;
    }

    let docsys = require(PATHUX_DOCPATH);
    this.config = docsys.readConfig(PATHUX_DOC_CONFIG);

    this.first = false;
  }

  uploadImage(relpath, blobInfo, success, onError) {
    return new Promise((accept, reject) => {
      this._doinit();

      let blob = blobInfo.blob();

      return blob.arrayBuffer().then((data) => {
        let path = this.config.uploadImage(relpath, blobInfo.filename(), data);
        success(path);
      });
    }).catch((error) => {
      onError(""+error);
    });
  }

  hasDoc(relpath) {
    this._doinit();
    return new Promise((accept, reject) => {
      accept(this.config.hasDoc(relpath));
    });
  }

  updateDoc(relpath, data) {
    this._doinit();

    return new Promise((accept, reject) => {
      accept(this.config.updateDoc(relpath, data));
    });
  }

  newDoc(relpath, data) {
    this._doinit();
    return new Promise((accept, reject) => {
      accept(this.config.newDoc(relpath, data));
    });
  }
}

export class ServerAPI extends DocsAPI {
  constructor() {
    super();
  }

  hasDoc(relpath) {
    return this.callAPI("hasDoc", relpath);
  }

  updateDoc(relpath, data) {
    return this.callAPI("updateDoc", relpath, data);
  }

  newDoc(relpath, data) {
    return this.callAPI("newDoc", relpath, data);
  }

  uploadImage(relpath, blobInfo, success, onError) {
    return new Promise((accept, reject) => {
      let blob = blobInfo.blob();

      return blob.arrayBuffer().then((data) => {
        console.log("data!", data);
        let uint8 = new Uint8Array(data);
        let data2 = [];

        for (let i=0; i<uint8.length; i++) {
          data2.push(uint8[i]);
        }

        console.log("data2", data2);

        this.callAPI("uploadImage", relpath, blobInfo.filename(), data2).then((path) => {
          success(path);
        });
      });
    }).catch((error) => {
      onError(""+error);
    });
  }

  callAPI() {
    let key = arguments[0];
    let args = [];
    for (let i=1; i<arguments.length; i++) {
      args.push(arguments[i]);
    }
    console.log(args, arguments.length);

    let path = location.origin + "/api/" + key;
    console.log(path);

    return new Promise((accept, reject) => {
      fetch(path, {
        headers: {
          "Content-Type" : "application/json"
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
            data = JSON.parse(data);
            accept(data.result);
          }).catch((error) => {
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
      }).catch((error) => {
        reject(error);
      });
    });
  }
}

export class DocHistoryItem {
  constructor(url, title) {
    this.url = url;
    this.title = "" + title;
  }

  loadSTRUCT(reader) {
    reader(this);
  }
}

DocHistoryItem.STRUCT = `
DocHistoryItem {
  url   : string;
  title : string;
}
`;
nstructjs.register(DocHistoryItem);

export class DocHistory extends Array {
  constructor() {
    super();
    this.cur = 0;
  }

  push(url, title=url) {
    console.warn("history push", url);

    this.length = this.cur+1;
    this[this.length-1] = new DocHistoryItem(url, title);
    this.cur++;

    return this;
  }

  go(dir) {
    dir = Math.sign(dir);
    this.cur = Math.min(Math.max(this.cur + dir, 0), this.length-1);

    return this[this.cur];
  }

  loadSTRUCT(reader) {
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

DocHistory.STRUCT = `
DocHistory {
  _items : array(DocHistoryItem) | this;
  cur    : int;
}
`;

nstructjs.register(DocHistory);

export class DocsBrowser extends UIBase {
  constructor() {
    super();

    this.editMode = false;

    this.history = new DocHistory();

    this._prefix = cconst.docManualPath; //"../simple_docsys/doc_build/";
    this.saveReq = 0;
    this.saveReqStart = util.time_ms();
    this._last_save = util.time_ms();

    this.header = document.createElement("rowframe-x");
    this.shadow.appendChild(this.header);
    this.makeHeader()

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


    this.root.style["margin"] = this.root.style["padding"] = this.root.style["border"] = "0px";
    this.root.style["width"] = "100%";
    this.root.style["height"] = "100%";

    this.currentPath = "";
    this._doDocInit = true;

    this.contentDiv = undefined; //inside of iframe
  }

  setEditMode(state) {
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

  go(dir) {
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
    this.flushUpdate();
  }

  makeHeader_intern() {
    console.log("making header");

    this.header.clear();

    let check = this.header.check(undefined, "Edit Enabled");
    check.value = this.editMode;

    check.onchange = () => {
      console.log("check click!", check.checked);

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
      let sel = this.root.contentDocument.getSelection();
      let p = sel.anchorNode;
      if (!(p instanceof HTMLElement)) {
        p = p.parentElement;
      }

      p.setAttribute("class", "notebox");

      this.undoPost("Note Box");

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
      this.execCommand("bold");
      console.log("ACTIVE", this.root.contentDocument.activeElement);
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
    this.header.listenum(undefined, "Style", {
      Paragraph     : "P",
      "Heading 1"   : "H1",
      "Heading 2"   : "H2",
      "Heading 3"   : "H3",
      "Heading 4"   : "H4",
      "Heading 5"   : "H5",
    }).onselect = (e) => {
      this.execCommand("formatBlock", false, e.toLowerCase());
    }
  }

  init() {
    super.init();
    this.setCSS();
  }

  execCommand() {
    this.undoPre(arguments[0]);
    this.root.contentDocument.execCommand(...arguments);
    this.undoPost(arguments[0]);
  }

  loadSource(data) {
    this.saveReq = 0;

    let cb = () => {
      if (this.root.readyState !== 'loading') {
        this.initDoc();
      } else {
        window.setTimeout(cb, 5);
      }
    };

    this.root.setAttribute("srcDoc", data);
    this.root.onload = cb;
    this._doDocInit = true;
    this.contentDiv = undefined;
  }

  load(url) {
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

    if (!this.root.contentDocument) {
      return;
    }
    visit(this.root.contentDocument.body);

    if (this.contentDiv) {
      if (this.editMode) {
        this.disableLinks();
      }

      let globals = this.root.contentWindow;
      console.log("tinymce globals:", globals.document, globals);

      window.tinymce = undefined;

      //*
      window.tinyMCEPreInit = {
        suffix : "",
        baseURL : this.currentPath,
        documentBaseURL : location.href
      };
       //*/

      let loc = globals.document.location;
      if (loc.href === "about:srcdoc") {
        loc.href = document.location.href;// this.currentPath;
      }


      let base_url = "/example/lib/tinymce/js/tinymce";

      if (window.haveElectron) {
        base_url = "lib/tinymce/js/tinymce";
        let path = document.location.href;
        path = path.slice(7, path.length);

        path = "file://" + require('path').dirname(path);
        console.log("%c" + path, "blue");

        tinyMCEPreInit.baseURL = path;
        tinyMCEPreInit.documentBaseURL = path;
      }

      let tinymce = this.tinymce = globals.tinymce = window.tinymce = _tinymce(globals);

      tinymce.init({
        selector: "div.contents",
        base_url: base_url,
        paste_data_images : true,
        allow_html_data_urls : true,
        plugins: [ 'quickbars', 'paste' ],
        toolbar: true,
        menubar: true,
        inline: true,
        images_upload_handler : (blobInfo, success, onError) => {
          console.log("uploading image!", blobInfo);
          this.serverapi.uploadImage(this.getDocPath(), blobInfo, success, onError);
        },
        setup : function(editor) {
          console.log("tinymce editor setup!", editor);
        }
      }).then((arg) => {
        this.tinymce = arg[0];

        if (!this.editMode) {
          this.tinymce.hide();
        } else {
          this.disableLinks();
        }
      });

      let onchange = (e) => {
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

  undoPre() {
    let undo = this.tinymce.editors[0].undoManager;
    undo.beforeChange();
  }

  undoPost(label) {
    let undo = this.tinymce.editors[0].undoManager;
    undo.add();
  }

  enableLinks() {
    let visit = (n) => {
      if (n.getAttribute && n.getAttribute("class") === "contents") {
        return;
      }

      if (n.tagName === "A") {
        if (n.getAttribute("_href")) {
          n.setAttribute("href", n.getAttribute("_href"));
        }
      }
      for (let c of n.childNodes) {
        visit(c);
      }
    }

    visit(this.root.contentDocument.body);
  }

  disableLinks() {
    let visit = (n) => {
      if (n.getAttribute && n.getAttribute("class") === "contents") {
        return;
      }

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

  getDocPath() {
    if (!this.root.contentDocument) {
      return undefined;
    }

    let href = this.root.contentDocument.location.href;

    console.log(document.location.href, this.root.src);
    let path = relative(dirname(document.location.href), href).trim();
    while (path.startsWith("/")) {
      path = path.slice(1, path.length);
    }

    console.log(path, this._prefix);
    if (!path) return;

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

    let path = this.getDocPath();

    console.log("saving " + path);

    this.saveReq = 2;

    this.serverapi.updateDoc(path, this.contentDiv.innerHTML).then((result) => {
      this.saveReq = 0;
      console.log("Sucess! Saved document", result);

      if (result) {
        console.log("Server changed final document; reloading...");
        this.contentDiv.innerHTML = result;
      }

      this.report("Saved", "green", 750)
    }).catch((error) => {
      console.error(error);
    });
  }

  updateCurrentPath() {
    if (!this.contentDiv) {
      return;
    }

    let href = this.root.contentDocument.location.href;
    href = relative(dirname(location.href), href).trim();

    if (href !== this.currentPath) {
      console.log("path change detected", href);
      this.history.push(href, href);

      this.currentPath = href;
    }
  }


  //send notifications to user
  report(message, color=undefined, timeout=undefined) {
    if (this.ctx.report) {
      console.warn("%c"+message, "color : " + color + ";");
      this.ctx.report(message, color, timeout);
    } else {
      console.warn("%c"+message, "color : " + color + ";");
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
    this.style.width = "100%";
    this.style.height = "max-contents";

    this.root.style["background-color"] = "grey";
  }

  static newSTRUCT() {
    return document.createElement("docs-browser-x");
  }

  loadSTRUCT(reader) {
    reader(this);

    this.doOnce(this.makeHeader);

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
  editMode      : bool;
  history       : DocHistory;
}
`;

UIBase.register(DocsBrowser);
nstructjs.register(DocsBrowser);
