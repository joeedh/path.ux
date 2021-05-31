//stores xml sources
let pagecache = new Map()
import {PackFlags, UIBase} from '../core/ui_base.js';
import {sliderDomAttributes} from '../widgets/ui_numsliders.js';
import * as util from '../util/util.js';

export var domTransferAttrs = new Set(["id", "title", "tab-index"]);

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

  if (elem.hasAttribute("drawChecks")) {
    if (!getbool(elem, "drawChecks")) {
      packflag |= PackFlags.HIDE_CHECK_MARKS;
    } else {
      packflag &= ~PackFlags.HIDE_CHECK_MARKS;
    }
  }

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
    s = s.slice(0, s.length - 2);
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

    let attrs = util.list(sliderDomAttributes);

    //note that useIcons, showLabel and sliderMode are PackFlag bits and are inherited through that system

    this.inheritDomAttrs = {};
    this.inheritDomAttrKeys = new Set(attrs);
  }

  push() {
    this.stack.push(this.container);
    this.stack.push(new Set(this.inheritDomAttrKeys));
    this.stack.push(Object.assign({}, this.inheritDomAttrs));
  }

  pop() {
    this.inheritDomAttrs = this.stack.pop();
    this.inheritDomAttrKeys = this.stack.pop();
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

  _basic(elem, elem2) {
    this._style(elem, elem2);

    for (let k of domTransferAttrs) {
      if (elem.hasAttribute(k)) {
        elem2.setAttribute(k, elem.getAttribute(k));
      }
    }

    for (let k in this.inheritDomAttrs) {
      if (!elem.hasAttribute(k)) {
        elem.setAttribute(k, this.inheritDomAttrs[k]);
      }
    }

    for (let k of sliderDomAttributes) {
      if (elem.hasAttribute(k)) {
        elem2.setAttribute(k, elem.getAttribute(k));
      }
    }

    if (elem.hasAttribute("useIcons") && typeof elem2.useIcons === "function") {
      let val = elem.getAttribute("useIcons");

      if (val === "small") {
        elem2.useIcons(true);
        elem2.packflag &= ~PackFlags.LARGE_ICON;
        elem2.packflag |= PackFlags.SMALL_ICON;
      } else if (val === "large") {
        elem2.useIcons(true);
        elem2.packflag |= PackFlags.LARGE_ICON;
        elem2.packflag &= ~PackFlags.SMALL_ICON;
      } else {
        elem2.useIcons(getbool(elem, "useIcons"));
      }
    }

    if (elem.hasAttribute("sliderTextBox")) {
      let textbox = getbool(elem, "sliderTextBox");

      if (textbox) {
        elem2.packflag &= ~PackFlags.NO_NUMSLIDER_TEXTBOX;
        elem2.inherit_packflag &= ~PackFlags.NO_NUMSLIDER_TEXTBOX;
      } else {
        elem2.packflag |= PackFlags.NO_NUMSLIDER_TEXTBOX;
        elem2.inherit_packflag |= PackFlags.NO_NUMSLIDER_TEXTBOX;
      }

      //console.error("textBox", textbox, elem2, elem.getAttribute("sliderTextBox"), elem2.packflag);
    }

    if (elem.hasAttribute("sliderMode")) {
      let sliderMode = elem.getAttribute("sliderMode");

      if (sliderMode === "slider") {
        elem2.packflag &= ~PackFlags.FORCE_ROLLER_SLIDER;
        elem2.inherit_packflag &= ~PackFlags.FORCE_ROLLER_SLIDER;

        elem2.packflag |= PackFlags.SIMPLE_NUMSLIDERS;
        elem2.inherit_packflag |= PackFlags.SIMPLE_NUMSLIDERS;
      } else if (sliderMode === "roller") {
        elem2.packflag &= ~PackFlags.SIMPLE_NUMSLIDERS;
        elem2.packflag |= PackFlags.FORCE_ROLLER_SLIDER;

        elem2.inherit_packflag &= ~PackFlags.SIMPLE_NUMSLIDERS;
        elem2.inherit_packflag |= PackFlags.FORCE_ROLLER_SLIDER;
      }

      //console.error("sliderMode", sliderMode, elem2, elem2.packflag & (PackFlags.SIMPLE_NUMSLIDERS | PackFlags.FORCE_ROLLER_SLIDER));
    }

    if (elem.hasAttribute("showLabel")) {
      let state = getbool(elem, "showLabel");

      if (state) {
        elem2.packflag |= PackFlags.FORCE_PROP_LABELS;
        elem2.inherit_packflag |= PackFlags.FORCE_PROP_LABELS;
      } else {
        elem2.packflag &= ~PackFlags.FORCE_PROP_LABELS;
        elem2.inherit_packflag &= ~PackFlags.FORCE_PROP_LABELS;
      }
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

    if (elem.hasAttribute("massSetPath")) {
      let prefix = con.massSetPrefix;
      let path = elem.getAttribute("massSetPath").trim();

      if (prefix.length > 0) {
        prefix += ".";
      }

      prefix += path;
      con.massSetPrefix = prefix;
    }
  }

  _container(elem, con) {
    for (let k of this.inheritDomAttrKeys) {
      if (elem.hasAttribute(k)) {
        this.inheritDomAttrs[k] = elem.getAttribute(k);
      }
    }

    let packflag = getPackFlag(elem);

    con.packflag |= packflag;
    con.inherit_packflag |= packflag;

    this._basic(elem, con);
    this._handlePathPrefix(elem, con);
  }

  panel(elem) {
    let title = "" + elem.getAttribute("label")
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

  label(elem) {
    let elem2 = this.container.label(elem.innerHTML);
    this._basic(elem, elem2);
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
      this._basic(elem, elem2);

      if (elem.hasAttribute("massSetPath")) {
        let mpath = elem.getAttribute("massSetPath");
        mpath = this.container._getMassPath(this.container.ctx, path, mpath);

        elem2.setAttribute("mass_set_path", mpath);
      }
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

  tool(elem, key = "tool") {
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

    let title = "" + elem.getAttribute("label");

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

export function initPage(ctx, xml, parentContainer = undefined) {
  let tree = parseXML(xml);
  let container = UIBase.createElement("container-x");

  container.ctx = ctx;
  if (ctx) {
    container._init();
  }

  if (parentContainer) {
    parentContainer.add(container);
  }

  let handler = new Handler(ctx, container);
  handler.handle(tree);

  return container;

}

export function loadPage(ctx, url, parentContainer = undefined, loadSourceOnly = false) {
  let source;

  if (pagecache.has(url)) {
    source = pagecache.get(url);
    return new Promise((accept, reject) => {
      if (loadSourceOnly) {
        accept(source);
      } else {
        accept(initPage(ctx, source, parentContainer));
      }
    });
  } else {
    return new Promise((accept, reject) => {
      fetch(url).then(res => res.text()).then(data => {
        pagecache.set(url, data);

        if (loadSourceOnly) {
          accept(data);
        } else {
          accept(initPage(ctx, data, parentContainer));
        }
      });
    });
  }
}
