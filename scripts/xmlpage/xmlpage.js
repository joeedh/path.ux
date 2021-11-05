//stores xml sources
import {isNumber} from '../path-controller/toolsys/toolprop.js';

let pagecache = new Map()
import {PackFlags, UIBase} from '../core/ui_base.js';
import {sliderDomAttributes} from '../widgets/ui_numsliders.js';
import * as util from '../util/util.js';
import {Menu} from '../widgets/ui_menu.js';
import {Icons} from '../core/ui_base.js';
import {Container} from '../core/ui.js';

export var domTransferAttrs = new Set(["id", "title", "tab-index"]);
export var domEventAttrs = new Set(["click", "mousedown", "mouseup", "mousemove", "keydown", "keypress"]);

export function parseXML(xml) {
  let parser = new DOMParser()
  xml = `<root>${xml}</root>`;
  return parser.parseFromString(xml.trim(), "application/xml");
}

let num_re = /[0-9]+$/;

function getIconFlag(elem) {
  if (!elem.hasAttribute("useIcons")) {
    return 0;
  }

  let attr = elem.getAttribute("useIcons");

  if (typeof attr === "string") {
    attr = attr.toLowerCase().trim();
  }

  if (attr === "false" || attr === "no") {
    return 0;
  }

  if (attr === "true" || attr === "yes") {
    return PackFlags.USE_ICONS;
  } else if (attr === "small") {
    return PackFlags.SMALL_ICON | PackFlags.USE_ICONS;
  } else if (attr === "large") {
    return PackFlags.LARGE_ICON | PackFlags.USE_ICONS;
  } else {
    let isnum = typeof attr === "number";
    let sheet = attr;

    if (typeof sheet === "string" && sheet.search(num_re) === 0) {
      sheet = parseInt(sheet);
      isnum = true;
    }

    if (!isnum) {
      return PackFlags.USE_ICONS;
    }

    let flag = PackFlags.USE_ICONS | PackFlags.CUSTOM_ICON_SHEET;
    flag |= ((sheet - 1)<<PackFlags.CUSTOM_ICON_SHEET_START);

    return flag;
  }

  return 0;
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

export const customHandlers = {};

class Handler {
  constructor(ctx, container) {
    this.container = container;
    this.stack = [];
    this.ctx = ctx;
    this.codefuncs = {};

    this.templateVars = {};

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
    if (elem.constructor === XMLDocument || elem.nodeName === 'root') {
      for (let child of elem.childNodes) {
        this.handle(child);
      }

      window.tree = elem
      return;
    } else if (elem.constructor === Text || elem.constructor === Comment) {
      return;
    }

    let tagname = "" + elem.tagName;

    if (tagname in customHandlers) {
      customHandlers[tagname](this, elem);
    } else if (this[tagname]) {
      this[tagname](elem);
    } else {
      let elem2 = UIBase.createElement(tagname.toLowerCase());

      window.__elem = elem;
      //transfer DOM attributes
      for (let k of elem.getAttributeNames()) {
        elem2.setAttribute(k, elem.getAttribute(k));
      }

      if (elem2 instanceof UIBase) {
        this.container.add(elem2);
        this._style(elem, elem2);

        if (elem2 instanceof Container) {
          this.push();

          this.container = elem2;
          this._container(elem, elem2);
          this.visit(elem);

          this.pop();

          return;
        }
      } else {
        console.warn("Unknown element " + elem.tagName + " (" + elem.constructor.name + ")");
        let elem2 = document.createElement(elem.tagName.toLowerCase());

        for (let attr of elem.getAttributeNames()) {
          elem2.setAttribute(attr, elem.getAttribute(attr));
        }

        this._basic(elem, elem2);

        this.container.shadow.appendChild(elem2);
        elem2.pathux_ctx = this.container.ctx;
      }

      this.visit(elem);
    }
  }

  _style(elem, elem2) {
    let style = {};

    //try to handle class attribute, at least somewhat

    if (elem.hasAttribute("class")) {
      elem2.setAttribute("class", elem.getAttribute("class"));

      let cls = elem2.getAttribute("class").trim();
      let keys = [
        cls,
        (elem2.tagName.toLowerCase() + "." + cls).trim(),
        "#" + elem.getAttribute("id").trim()
      ];

      for (let sheet of document.styleSheets) {
        for (let rule of sheet.rules) {
          for (let k of keys) {
            if (rule.selectorText.trim() === k) {
              for (let k2 of rule.styleMap.keys()) {
                let val = rule.style[k2]

                style[k2] = val;
              }
            }
          }
        }
      }
    }

    if (elem.hasAttribute("style")) {
      let stylecode = elem.getAttribute("style");

      stylecode = stylecode.split(";");

      for (let row of stylecode) {
        row = row.trim();

        let i = row.search(/\:/);
        if (i >= 0) {
          let key = row.slice(0, i).trim();
          let val = row.slice(i + 1, row.length).trim();

          style[key] = val;
        }
      }
    }

    let keys = Object.keys(style);
    if (keys.length === 0) {
      return;
    }

    function setStyle() {
      for (let k of keys) {
        elem2.style[k] = style[k];
      }
    }

    if (elem2 instanceof UIBase) {
      elem2.setCSS.after(() => {
        setStyle();
      });
    }

    setStyle();
  }

  visit(node) {
    for (let child of node.childNodes) {
      this.handle(child)
    }
  }

  _getattr(elem, k) {
    let val = elem.getAttribute(k);

    if (!val) {
      return val;
    }

    if (val.startsWith("##")) {
      val = val.slice(2, val.length).trim();

      if (!(val in this.templateVars)) {
        console.error(`unknown template variable '${val}'`);
        val = '';
      } else {
        val = this.templateVars[val];
      }
    }

    return val;
  }

  _basic(elem, elem2) {
    this._style(elem, elem2);

    for (let k of elem.getAttributeNames()) {
      if (k.startsWith("custom")) {
        elem2.setAttribute(k, this._getattr(elem, k));
      }
    }

    let codeattrs = [];

    for (let k of elem.getAttributeNames()) {
      let val = ""+elem.getAttribute(k);

      if (val.startsWith('ng[')) {
        val = val.slice(3, val.endsWith("]") ? val.length-1 : val.length);

        codeattrs.push([k, "ng", val]);
      }
    }

    for (let k of domEventAttrs) {
      let k2 = 'on' + k;

      if (elem.hasAttribute(k2)) {
        codeattrs.push([k, "dom", elem.getAttribute(k2)]);
      }
    }

    for (let [k, eventType, id] of codeattrs) {
      if (!(id in this.codefuncs)) {
        console.error("Unknown code fragment " + id);
        continue;
      }

      if (eventType === "dom") {
        //click events usually don't go through normal
        //dom event system
        if (k === 'click') {
          let onclick = elem2.onclick;
          let func = this.codefuncs[id];

          elem2.onclick = function () {
            if (onclick) {
              onclick.apply(this, arguments);
            }

            return func.apply(this, arguments);
          }
        } else {
          elem2.addEventListener(k, this.codefuncs[id]);
        }
      } else if (eventType === "ng") {
        elem2.addEventListener(k, this.codefuncs[id]);
      }
    }


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

    if (!(elem2 instanceof UIBase)) {
      return;
    }

    if (elem.hasAttribute("useIcons") && typeof elem2.useIcons === "function") {
      let val = elem.getAttribute("useIcons").trim().toLowerCase();

      if (val === "small" || val === "true" || val === "yes") {
        val = true;
      } else if (val === "large") {
        val = 1;
      } else if (val === "false" || val === "no") {
        val = false;
      } else {
        val = parseInt(val) - 1;
      }

      elem2.useIcons(val);
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

    function doBox(key) {
      if (elem.hasAttribute(key)) {
        let val = elem.getAttribute(key).toLowerCase().trim();

        if (val.endsWith("px")) {
          val = val.slice(0, val.length - 2).trim();
        }

        if (val.endsWith("%")) {
          //eek! don't support at all?
          //or use aspect overlay?

          console.warn(`Relative styling of '${key}' may be unstable for this element`, elem);

          elem.setCSS.after(function () {
            this.style[key] = val;
          });
        } else {
          val = parseFloat(val);

          if (isNaN(val) || typeof val !== "number") {
            console.error(`Invalid style ${key}:${elem.getAttribute(key)}`);
            return;
          }

          elem2.overrideDefault(key, val);
          elem2.setCSS();
          elem2.style[key] = "" + val + "px";
        }
      }
    }

    doBox("width");
    doBox("height");
    doBox("margin");
    doBox("padding");

    for (let i = 0; i < 2; i++) {
      let key = i ? "margin" : "padding";

      doBox(key + "-bottom");
      doBox(key + "-top");
      doBox(key + "-left");
      doBox(key + "-right");
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

  noteframe(elem) {
    let ret = this.container.noteframe();

    if (ret) {
      this._basic(elem, ret);
    }
  }

  cell(elem) {
    this.push();
    this.container = this.container.cell();
    this._container(elem, this.container);
    this.visit(elem);
    this.pop();
  }

  table(elem) {
    this.push();
    this.container = this.container.table();
    this._container(elem, this.container);
    this.visit(elem);
    this.pop();
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

  /**
   handle a code element, which are wrapped in functions
   */
  code(elem) {
    window._codelem = elem;

    let buf = '';

    for (let elem2 of elem.childNodes) {
      if (elem2.nodeName === "#text") {
        buf += elem2.textContent + '\n';
      }
    }

    var func, $scope = this.templateScope;

    buf = `
func = function() {
  ${buf};
}
    `;

    eval(buf);

    let id = "" + elem.getAttribute("id");

    this.codefuncs[id] = func;
  }

  textbox(elem) {
    if (elem.hasAttribute("path")) {
      this._prop(elem, 'textbox');
    } else {
      //let elem2 = this.container.textbox();
      //this._basic(elem, elem2);
    }
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

    let elem2;
    if (key === 'pathlabel') {
      elem2 = this.container.pathlabel(path, elem.innerHTML, packflag);
    } else if (key === 'textbox') {
      elem2 = this.container.textbox(path, undefined, undefined, packflag);

      elem2.update();

      //make textboxes non-modal by default
      if (elem.hasAttribute("modal")) {
        elem2.setAttribute("modal", elem.getAttribute("modal"));
      }

      if (elem.hasAttribute("realtime")) {
        elem2.setAttribute("realtime", elem.getAttribute("realtime"));
      }
    } else {
      elem2 = this.container[key](path, packflag);
    }

    if (!elem2) {
      elem2 = document.createElement("span");
      elem2.innerHTML = "error";
      this.container.shadow.appendChild(elem2);
    } else {
      this._basic(elem, elem2);

      if (elem.hasAttribute("massSetPath") || this.container.massSetPrefix) {
        let mpath = elem.getAttribute("massSetPath");
        if (!mpath) {
          mpath = elem.getAttribute("path");
        }

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

    let noIcons = false, iconflags;

    if (getbool(elem, "useIcons")) {
      packflag |= PackFlags.USE_ICONS;
    } else if (elem.hasAttribute("useIcons")) {
      packflag &= ~PackFlags.USE_ICONS;
      noIcons = true;
    }

    let label = ("" + elem.textContent).trim()
    if (label.length > 0) {
      path += "|" + label;
    }

    if (noIcons) {
      iconflags = this.container.useIcons(false);
    }

    let elem2 = this.container[key](path, packflag);

    if (elem2) {
      this._basic(elem, elem2);
    } else {
      elem2 = document.createElement("strip")
      elem2.innerHTML = "error"
      this.container.shadow.appendChild(elem2);
      this._basic(elem, elem2);
    }

    if (noIcons) {
      this.container.inherit_packflag |= iconflags;
      this.container.packflag |= iconflags;
    }
  }

  dropbox(elem) {
    return this.menu(elem, true);
  }

  menu(elem, isDropBox = false) {
    let packflag = getPackFlag(elem);
    let title = elem.getAttribute("name")

    let list = [];

    for (let child of elem.childNodes) {
      if (child.tagName === "tool") {
        let path = child.getAttribute("path");
        let label = child.innerHTML.trim();

        if (label.length > 0) {
          path += "|" + label;
        }

        list.push(path);
      } else if (child.tagName === "sep") {
        list.push(Menu.SEP);
      } else if (child.tagName === "item") {
        let id, icon, hotkey, description;

        if (child.hasAttribute("id")) {
          id = child.getAttribute("id");
        }

        if (child.hasAttribute("icon")) {
          icon = child.getAttribute("icon").toUpperCase().trim();
          icon = Icons[icon];
        }

        if (child.hasAttribute("hotkey")) {
          hotkey = child.getAttribute("hotkey");
        }

        if (child.hasAttribute("description")) {
          description = child.getAttribute("description");
        }

        list.push({
          name: child.innerHTML.trim(),
          id, icon, hotkey, description
        });
      }
    }

    let ret = this.container.menu(title, list, packflag);
    if (isDropBox) {
      ret.removeAttribute("simple");
    }

    if (elem.hasAttribute("id")) {
      ret.setAttribute("id", elem.getAttribute("id"));
    }

    this._basic(elem, ret);

    return ret;
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

export function initPage(ctx, xml, parentContainer = undefined, templateVars = {}, templateScope = {}) {
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

  handler.templateVars = Object.assign({}, templateVars);
  handler.templateScope = templateScope;

  handler.handle(tree);

  return container;

}

export function loadPage(ctx, url, parentContainer_or_args = undefined, loadSourceOnly = false,
                         modifySourceCB, templateVars, templateScope) {
  let source;
  let parentContainer;

  if (parentContainer_or_args !== undefined && !(parentContainer_or_args instanceof HTMLElement)) {
    let args = parentContainer_or_args;

    parentContainer = args.parentContainer;
    loadSourceOnly = args.loadSourceOnly;
    modifySourceCB = args.modifySourceCB;
    templateVars = args.templateVars;
    templateScope = args.templateScope;
  } else {
    parentContainer = parentContainer_or_args;
  }

  if (pagecache.has(url)) {
    source = pagecache.get(url);

    if (modifySourceCB) {
      source = modifySourceCB(source);
    }

    return new Promise((accept, reject) => {
      if (loadSourceOnly) {
        accept(source);
      } else {
        accept(initPage(ctx, source, parentContainer, templateVars, templateScope));
      }
    });
  } else {
    return new Promise((accept, reject) => {
      fetch(url).then(res => res.text()).then(data => {
        pagecache.set(url, data);

        if (modifySourceCB) {
          data = modifySourceCB(data);
        }

        if (loadSourceOnly) {
          accept(data);
        } else {
          accept(initPage(ctx, data, parentContainer, templateVars, templateScope));
        }
      });
    });
  }
}
