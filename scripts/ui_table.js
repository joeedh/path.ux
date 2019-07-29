//bind module to global var to get at it in console.
//
//note that require has an api for handling circular
//module refs, in such cases do not use these vars.

import {Container} from "./ui.js";

var _ui = undefined;

import * as util from './util.js';
import * as vectormath from './util.js';
import * as ui_curvewidget from './ui_curvewidget.js';
import * as ui_base from './ui_base.js';
import * as ui_widgets from './ui_widgets.js';
import * as toolprop from './toolprop.js';

let PropFlags = toolprop.PropFlags;
let PropSubTypes = toolprop.PropSubTypes;

let EnumProperty = toolprop.EnumProperty;

let Vector2 = vectormath.Vector2,
  UIBase = ui_base.UIBase,
  PackFlags = ui_base.PackFlags,
  PropTypes = toolprop.PropTypes;

export const SimpleContext = ui_base.SimpleContext;
export const DataPathError = ui_base.DataPathError;

var list = function list(iter) {
  let ret = [];

  for (let item of iter) {
    ret.push(item);
  }

  return ret;
}

export class TableRow extends Container {
  constructor() {
    super();

    this.dom.remove();
    this.dom = document.createElement("tr");

    //kind of dumb, but this.dom doesn't live within this element itself, bleh
    //this.shadow.appendChild(this.dom);
    this.dom.setAttribute("class", "containerx");
  }

  static define() {return {
    tagname : "tablerow-x"
  };}

  _add(child) {
    child.ctx = this.ctx;
    child.parentWidget = this;

    let td = document.createElement("td");
    td.appendChild(child);

    this.dom.appendChild(td);
    child.onadd();
  }
};
UIBase.register(TableRow);

export class TableFrame extends Container {
  constructor() {
    super();

    this.dom.remove();
    this.dom = document.createElement("table");
    this.shadow.appendChild(this.dom);
    this.dom.setAttribute("class", "containerx");

    //this.dom.style["display"] = "block";
  }

  update() {
    this.style["display"] = "inline-block";
    super.update();
  }

  _add(child) {
    child.ctx = this.ctx;
    child.parentWidget = this;
    this.dom.appendChild(child);
    child.onadd();
  }

  row() {
    let tr = document.createElement("tr");
    let cls = "table-tr";

    tr.setAttribute("class", cls);
    this.dom.appendChild(tr);
    let this2 = this;

    function maketd() {
      let td = document.createElement("td");
      tr.appendChild(td);

      td.style["margin"] = tr.style["margin"];
      td.style["padding"] = tr.style["padding"];

      let container = document.createElement("rowframe-x");

      container.ctx = this2.ctx;
      container.setAttribute("class", cls);
      container.dom.setAttribute("class", cls);
      td.setAttribute("class", cls);

      //let div2 = document.createElement("div");
      //div2.setAttribute("class", cls);
      //div2.innerHTML = "sdfsdf";

      //td.appendChild(div2);
      td.appendChild(container);

      return container;
    }

    //hrm wish I could subclass html elements easier
    let ret = {
      _tr : tr,

      style : tr.style,

      focus : function(args) {
        tr.focus(args);
      },

      blur : function(args) {
        tr.blur(args);
      },

      remove : () => {
        tr.remove();
      },

      addEventListener : function(type, cb, arg) {
        tr.addEventListener(type, cb, arg);
      },

      removeEventListener : function(type, cb, arg) {
        tr.removeEventListener(type, cb, arg);
      },

      setAttribute : function(attr, val) {
        if (attr == "class") {
          cls = val;
        }

        tr.setAttribute(attr, val);
      },

      clear : function() {
        for (let node of list(tr.childNodes)) {
          tr.removeChild(node);
        }
      }
    };

    function makefunc(f) {
      ret[f] = function() {
        let container = maketd();

        container.background = tr.style["background-color"]; //"rgba(0,0,0,0)";
        return container[f].apply(container, arguments);
      }
    }

    let _bg = "";

    //need to implement proper proxy here!
    Object.defineProperty(ret, "tabIndex", {
      set : function(f) {
        tr.tabIndex = f;
      },

      get : function(f) {
        return tr.tabIndex;
      }
    });

    Object.defineProperty(ret, "background", {
      set : function(bg) {
        _bg = bg;
        tr.style["background-color"] = bg;

        for (let node of tr.childNodes) {
          if (node.childNodes.length > 0) {
            node.childNodes[0].background = bg;
            node.style["background-color"] = bg;
          }
        }
      }, get : function() {
        return _bg;
      }
    });

    /*
    Object.defineProperty(ret, "class", {
      set(bg) {
        tr.class = bg;
      }
    });//*/

    ret.cell = () => {
      let container = maketd();
      container.background = tr.style["background-color"];
      return container;
    };

    //makefunc("cell");
    makefunc("label");
    makefunc("tool");
    makefunc("prop");
    makefunc("pathlabel");
    makefunc("button");
    makefunc("iconbutton");
    makefunc("textbox");
    makefunc("col");
    makefunc("row");
    makefunc("table");
    makefunc("listenum");
    makefunc("check");

    return ret;
  }

  update() {
    super.update();
  }

  clear() {
    super.clear();
    for (let child of list(this.dom.childNodes)) {
      child.remove();
    }
  }

  static define() {return {
    tagname : "tableframe-x"
  };}
}
UIBase.register(TableFrame);

