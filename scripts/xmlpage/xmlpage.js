//stores xml sources
let pagecache = new Map()
import {PackFlags, UIBase} from '../core/ui_base.js';

export function parseXML(xml) {
  let parser = new DOMParser()
  return parser.parseFromString(xml, "application/xml");

}

function getIconFlag(elem) {
  if (!elem.hasAttribute("useIcons")) {
    return 0;
  }

  let attr = elem.getAttribute("useIcons");
  if (attr === "true" || attr === "yes") {
    return PackFlags.USE_ICONS;
  } else if (attr === "small") {
    return PackFlags.SMALL_ICON | PackFlags.USE_ICONS;
  } else if (attr === "large") {
    return PackFlags.LARGE_ICON | PackFlags.USE_ICONS;
  }
}

function getPackFlag(elem) {
  let packflag = getIconFlag(elem);

  if (getbool(elem, "simpleSlider")) {
    packflag |= PackFlags.SIMPLE_NUMSLIDERS;
  }
  if (getbool(elem, "rollarSlider")) {
    packflag |= PackFlags.FORCE_ROLLER_SLIDER;
  }

  return packflag;
}

function myParseFloat(s) {
  s = '' + s;
  s = s.trim().toLowerCase();

  if (s.endsWith("px")) {
    s = s.slice(0, s.length-2);
  }

  return parseFloat(s);
}

function getbool(elem, attr) {
  let ret = elem.getAttribute(attr);
  if (!ret) {
    return false;
  }

  ret = ret.toLowerCase();
  return ret === "1" || ret === "true" || ret === "yes";
}

function getfloat(elem, attr, defaultval) {
  if (!elem.hasAttribute(attr)) {
    return defaultval;
  }

  return myParseFloat(elem.getAttribute(attr));
}

class Handler {
  constructor(ctx, container) {
    this.container = container;
    this.stack = [];
    this.ctx = ctx;
  }

  push() {
    this.stack.push(this.container);
  }

  pop() {
    this.container = this.stack.pop();
  }

  handle(elem) {
    if (elem.constructor === XMLDocument) {
      for (let child of elem.childNodes) {
        this.handle(child);
      }

      window.tree = elem
      return;
    } else if (elem.constructor === Text) {
      return;
    }

    let tagname = "" + elem.tagName;
    if (this[tagname]) {
      this[tagname](elem);
    } else {
      let elem2 = UIBase.createElement(tagname.toLowerCase());

      if (elem2 instanceof UIBase) {
       this.container.add(elem2);
       this._style(elem, elem2);
      } else {
        console.warn("Unknown element " + elem.tagName + " (" + elem.constructor.name + ")");
      }
    }
  }

  _style(elem, elem2) {
    if (elem.hasAttribute("style")) {
      let style = elem.getAttribute("style");

      if (0) {
        console.log("STYLE", style);

        style = style.split(";");
        for (let row of style) {
          let i = row.search(/\:/);
          if (i >= 0) {
            let key = row.slice(0, i).trim();
            let val = row.slice(i + 1, row.length).trim();

            console.log("kv", key, val, elem2);
            elem2.style[key] = val;
          }
        }
      } else {
        elem2.setAttribute("style", style);
      }
    }
  }

  visit(node) {
    for (let child of node.childNodes) {
      this.handle(child)
    }
  }

  _basic(elem, con) {
    this._style(elem, con);

    if (elem.hasAttribute("useIcons") && con.useIcons) {
      con.useIcons(getbool(elem, "useIcons"));
    }
  }

  _handlePathPrefix(elem, con) {
    if (elem.hasAttribute("path")) {
      let prefix = con.dataPrefix;
      let path = elem.getAttribute("path").trim();

      if (prefix.length > 0) {
        prefix += ".";
      }

      prefix += path;
      con.dataPrefix = prefix;
    }
  }

  _container(elem, con) {
    this._basic(elem, con);
    this._handlePathPrefix(elem, con);
  }

  panel(elem) {
    let title = "" + elem.getAttribute("title")
    let closed = getbool(elem, "closed")

    this.push()
    this.container = this.container.panel(title);
    this.container.closed = closed;

    this._container(elem, this.container);

    this.visit(elem)

    this.pop();
  }

  pathlabel(elem) {
    this._prop(elem, "pathlabel")
  }

  /** simpleSliders=true enables simple sliders */
  prop(elem) {
    this._prop(elem, "prop")
  }

  _prop(elem, key) {
    let packflag = getPackFlag(elem);
    let path = elem.getAttribute("path");

    let elem2 = this.container[key](path, packflag);
    if (!elem2) {
      elem2 = document.createElement("span");
      elem2.innerHTML = "error";
      this.container.shadow.appendChild(elem2);
    } else {
      this._basic(elem2);
    }
  }

  strip(elem) {
    this.push();

    let dir;
    if (elem.hasAttribute("mode")) {
      dir = elem.getAttribute("mode").toLowerCase().trim();
      dir = dir === "horizontal";
    }

    let margin1 = getfloat(elem, "margin1", undefined);
    let margin2 = getfloat(elem, "margin2", undefined);

    console.log(margin1, margin2);

    this.container = this.container.strip(undefined, margin1, margin2, dir);
    this._container(elem, this.container);
    this.visit(elem);

    this.pop();
  }

  column(elem) {
    this.push();
    this.container = this.container.col();
    this._container(elem, this.container);
    this.visit(elem);
    this.pop();
  }

  row(elem) {
    this.push();
    this.container = this.container.row();
    this._container(elem, this.container);
    this.visit(elem);
    this.pop();
  }

  toolPanel(elem) {
    this.tool(elem, "toolPanel");
  }

  tool(elem, key="tool") {
    let path = elem.getAttribute("path");
    let packflag = getPackFlag(elem);

    if (getbool(elem, "useIcons")) {
      packflag |= PackFlags.USE_ICONS;
    }

    if (elem.hasAttribute("label")) {
      path += "|" + elem.getAttribute("label");
    }

    let elem2 = this.container[key](path, packflag);

    if (elem2) {
      this._basic(elem, elem2);
    } else {
      elem2 = document.createElement("strip")
      elem2.innerHTML = "error"
      this.container.shadow.appendChild(elem2);
    }
  }

  button(elem) {
    let title = elem.innerHTML.trim();

    let ret = this.container.button(title);

    if (elem.hasAttribute("id")) {
      ret.setAttribute("id", elem.getAttribute("id"));
    }

    this._basic(elem, ret);
  }

  iconbutton(elem) {
    let title = elem.innerHTML.trim();

    let icon = elem.getAttribute("icon");
    if (icon) {
      icon = UIBase.getIconEnum()[icon];
    }
    let ret = this.container.iconbutton(icon, title);

    if (elem.hasAttribute("id")) {
      ret.setAttribute("id", elem.getAttribute("id"));
    }

    this._basic(elem, ret);
  }

  tab(elem) {
    this.push();

    let title = "" + elem.getAttribute("title");

    this.container = this.container.tab(title);
    this._container(elem, this.container)
    this.visit(elem);

    this.pop();
  }

  tabs(elem) {
    let pos = elem.getAttribute("pos") || "left"

    this.push();

    let tabs = this.container.tabs(pos)
    this.container = tabs;

    this._container(elem, tabs);
    this.visit(elem);

    this.pop();
  }
}

export function initPage(ctx, xml) {
  let tree = parseXML(xml);
  let container = UIBase.createElement("container-x");

  container.ctx = ctx;
  if (ctx) {
    container._init();
  }

  let handler = new Handler(ctx, container);
  handler.handle(tree);

  return container;

}

export function loadPage(ctx, url) {
  let source;

  if (pagecache.has(url)) {
    source = pagecache.get(url);
    return new Promise((accept, reject) => {
      let ret = initPage(ctx, source);
      accept(ret);
    });
  } else {
    return new Promise((accept, reject) => {
      fetch(url).then(res => res.text()).then(data => {
        pagecache.set(url, data);

        let ret = initPage(ctx, data);
        accept(ret);
      });
    });
  }
}