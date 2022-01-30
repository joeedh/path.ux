//bind module to global var to get at it in console.
//
//note that require has an api for handling circular
//module refs, in such cases do not use these vars.

import {CSSFont} from "../core/ui_base.js";

var _ui = undefined;

import * as util from '../path-controller/util/util.js';
import * as vectormath from '../path-controller/util/vectormath.js';
import * as ui_base from '../core/ui_base.js';
import * as ui_widgets from './ui_widgets.js';
import * as toolprop from '../path-controller/toolsys/toolprop.js';
import '../path-controller/util/html5_fileapi.js';
import {ColumnFrame, RowFrame, Container} from "../core/ui.js";

let PropFlags = toolprop.PropFlags;
let PropSubTypes = toolprop.PropSubTypes;

let EnumProperty = toolprop.EnumProperty;

let Vector2   = vectormath.Vector2,
    UIBase    = ui_base.UIBase,
    PackFlags = ui_base.PackFlags,
    PropTypes = toolprop.PropTypes;


//methods to forward to this.contents
let forward_keys = new Set([
  "row", "col", "strip", "noteframe", "helppicker", "vecpopup",
  "tabs", "table", "menu", "listbox", "panel",
  "pathlabel", "label", "listenum", "check", "iconcheck",
  "button", "iconbutton", "colorPicker", "twocol",
  "treeview", "slider", "simpleslider", "curve1d",
  "noteframe", "vecpopup",
  "prop", "tool", "toolPanel", "textbox", "dynamicMenu",
  "add", "prepend", "useIcons", "noMarginsOrPadding", "wrap"
]);

export class PanelFrame extends ColumnFrame {
  constructor() {
    super();

    this.titleframe = super.row();

    this.contents = super.col();
    this.contents._remove = this.contents.remove;
    this.contents.remove = () => {
      this.remove();
    };

    this._panel = this; //compatibility alias

    this.contents._panel = this;
    this.iconcheck = UIBase.createElement("iconcheck-x");
    this.iconcheck.noEmboss = true;

    Object.defineProperty(this.contents, "closed", {
      get: () => {
        return this.closed;
      },

      set: (v) => {
        this.closed = v;
      }
    })

    Object.defineProperty(this.contents, "title", {
      get: () => this.titleframe.getAttribute("title"),
      set: (v) => this.setHeaderToolTip(v)
    });

    this.packflag = this.inherit_packflag = 0;

    this._closed = false;

    this.makeHeader();
  }

  get inherit_packflag() {
    if (!this.contents) return;
    return this.contents.inherit_packflag;
  }

  set inherit_packflag(val) {
    if (!this.contents) return;
    this.contents.inherit_packflag = val;
  }

  get packflag() {
    if (!this.contents) return;
    return this.contents.packflag;
  }

  set packflag(val) {
    if (!this.contents) return;
    this.contents.packflag = val;
  }

  appendChild(child) {
    return this.contents.shadow.appendChild(child);
  }

  get headerLabel() {
    return this.__label.text;
  }

  set headerLabel(v) {
    this.__label.text = v;
    this.__label._updateFont();

    if (this.hasAttribute("label")) {
      this.setAttribute("label", v);
    }

    if (this.ctx) {
      this.setCSS();
    }
  }

  get dataPrefix() {
    return this.contents ? this.contents.dataPrefix : "";
  }

  set dataPrefix(v) {
    if (this.contents) {
      this.contents.dataPrefix = v;
    }
  }

  get closed() {
    return this._closed;
  }

  set closed(val) {
    let update = !!val !== !!this.closed;
    this._closed = val;

    //console.log("closed set", update);
    if (update) {
      this._updateClosed(true);
    }
  }

  static define() {
    return {
      tagname            : "panelframe-x",
      style              : "panel",
      subclassChecksTheme: true
    };
  }

  setHeaderToolTip(tooltip) {
    this.titleframe.setAttribute("title", tooltip);

    this.titleframe._forEachChildWidget((child) => {
      child.setAttribute("title", tooltip);
    });
  }

  saveData() {
    let ret = {
      closed: this._closed
    };

    return Object.assign(super.saveData(), ret);
  }

  loadData(obj) {
    if (!("closed" in obj)) {
      this.closed = obj._closed;
    } else {
      this.closed = obj.closed;
    }
  }

  clear() {
    super.clear();
    super.add(this.titleframe);
  }

  makeHeader() {
    let row = this.titleframe;

    let iconcheck = this.iconcheck;

    if (!iconcheck) {
      return;
    }

    iconcheck.overrideDefault("padding", 0);

    iconcheck.noMarginsOrPadding();

    iconcheck.overrideDefault("background-color", "rgba(0,0,0,0)");
    iconcheck.overrideDefault("BoxDepressed", "rgba(0,0,0,0)");
    iconcheck.overrideDefault("border-color", "rgba(0,0,0,0)");

    iconcheck.ctx = this.ctx;
    iconcheck._icon_pressed = ui_base.Icons.UI_EXPAND;
    iconcheck._icon = ui_base.Icons.UI_COLLAPSE;
    iconcheck.drawCheck = false;
    iconcheck.iconsheet = ui_base.IconSheets.SMALL;
    iconcheck.checked = this._closed;

    this.iconcheck.onchange = (e) => {
      this.closed = this.iconcheck.checked;
    };

    row._add(iconcheck);

    //stupid css, let's just hackishly put " " to create spacing2

    let onclick = (e) => {
      iconcheck.checked = !iconcheck.checked;

      /* ensure browser doesn't spawn its own (incompatible)
         touch->mouse emulation events}; */
      e.preventDefault();
    };

    let label = this.__label = row.label(this.getAttribute("label"));

    this.__label.overrideClass("panel");
    this.__label.font = "TitleText";

    label._updateFont();

    label.noMarginsOrPadding();
    label.addEventListener("mousedown", onclick);
    label.addEventListener("touchdown", onclick);

    let bs = this.getDefault("border-style");

    row.background = this.getDefault("TitleBackground");
    row.style["border-radius"] = this.getDefault("border-radius") + "px";
    row.style["border"] = `${this.getDefault("border-width")}px ${bs} ${this.getDefault("border-color")}`;

    row.style["padding-right"] = "20px";
    row.style["padding-left"] = "5px";
    row.style["padding-top"] = this.getDefault("padding-top") + "px";
    row.style["padding-bottom"] = this.getDefault("padding-bottom") + "px";
  }

  init() {
    super.init();

    this.background = this.getDefault("background-color");
    this.style["width"] = "100%";

    this.contents.ctx = this.ctx;
    if (!this._closed) {
      super.add(this.contents);
      this.contents.flushUpdate();
    }

    this.contents.dataPrefix = this.dataPrefix;

    //con.style["margin-left"] = "5px";

    this.setCSS();
  }

  setCSS() {
    super.setCSS();

    if (!this.titleframe || !this.__label) {
      return;
    }

    let getDefault = (key, defval) => {
      let val = this.getDefault(key);
      return val !== undefined ? val : defval;
    };

    let bs = this.getDefault("border-style");

    let header_radius = this.getDefault("HeaderRadius");
    if (header_radius === undefined) {
      header_radius = this.getDefault("border-radius");
    }

    let boxmargin = getDefault("padding", 0);

    let paddingleft = getDefault("padding-left", 0);
    let paddingright = getDefault("padding-right", 0);

    paddingleft += boxmargin;
    paddingright += boxmargin;

    this.titleframe.background = this.getDefault("TitleBackground");
    this.titleframe.style["border-radius"] = header_radius + "px";
    this.titleframe.style["border"] = `${this.getDefault("border-width")}px ${bs} ${this.getDefault("TitleBorder")}`;
    this.style["border"] = `${this.getDefault("border-width")}px ${bs} ${this.getDefault("border-color")}`;
    this.style["border-radius"] = this.getDefault("border-radius") + "px";

    this.titleframe.style["padding-top"] = this.getDefault("padding-top") + "px";
    this.titleframe.style["padding-bottom"] = this.getDefault("padding-bottom") + "px";
    this.titleframe.style["padding-left"] = paddingleft + "px";
    this.titleframe.style["padding-right"] = paddingright + "px";
    this.titleframe.style["margin-bottom"] = "0px";
    this.titleframe.style["margin-top"] = "0px";

    this.__label.style["border"] = "unset";
    this.__label.style["border-radius"] = "unset";

    let bg = this.getDefault("background-color");

    this.background = bg;
    this.contents.background = bg;
    this.contents.parentWidget = this;
    this.contents.style["background-color"] = bg;
    this.style["background-color"] = bg;

    let margintop, marginbottom;

    if (this._closed) {
      margintop = getDefault('margin-top-closed', 0);
      marginbottom = getDefault('margin-bottom-closed', 5);
    } else {
      margintop = getDefault('margin-top', 0);
      marginbottom = getDefault('margin-bottom', 0);
    }

    let marginleft = getDefault('margin-left', 0);
    let marginright = getDefault('margin-right', 0);

    this.style['margin-left'] = marginleft + "px";
    this.style['margin-right'] = marginright + "px";

    this.style['margin-top'] = margintop + "px";
    this.style['margin-bottom'] = marginbottom + "px";

    //this.style["padding-left"] = paddingleft + "px";
    //this.style["padding-right"] = paddingright + "px";

    this.__label._updateFont();
  }

  on_disabled() {
    super.on_disabled();

    this.__label._updateFont();
    this.setCSS();
  }

  on_enabled() {
    super.on_enabled();

    this.__label.setCSS();
    this.__label.style["color"] = this.style["color"];
    this.setCSS();
  }

  update() {
    let text = this.getAttribute("label");

    let update = text !== this.__label.text;

    if (this.checkThemeUpdate()) {
      update = true;
      this._setVisible(this.closed, true);
      this.setCSS();
      this.flushSetCSS();
    }

    if (update) {
      this.headerLabel = this.getAttribute("label")

      this.__label._updateFont();
      this.setCSS();
    }

    super.update();
  }

  _onchange(isClosed) {
    if (this.onchange) {
      this.onchange(isClosed);
    }

    if (this.contents.onchange) {
      this.contents.onchange(isClosed);
    }
  }

  //catch setAttribute so we can detect label update
  //even if close and updates disabled
  setAttribute(key, value) {
    let ret = super.setAttribute(key, value);

    if (this.ctx) {
      this.update();
      this.flushUpdate();
    }

    return ret;
  }

  get noUpdateClosedContents() {
    if (!this.hasAttribute("update-closed-contents")) {
      return false;
    }

    let ret = this.getAttribute("update-closed-contents");
    return ret === "true" || ret === "on";
  }

  set noUpdateClosedContents(v) {
    this.setAttribute("update-closed-contents", v ? "true" : "false");
  }

  _setVisible(isClosed, changed) {
    changed = changed || !!isClosed !== !!this._closed;

    this._state = isClosed;

    if (isClosed) {
      this.contents.style.display = "none";

      //this.contents._remove();
      //this.contents.hide(true);
      if (!this.noUpdateClosedContents) {
        this.contents.packflag |= PackFlags.NO_UPDATE;
      }
    } else {
      //this.contents.hide(false);
      this.contents.style.display = "flex";
      this.contents.packflag &= ~PackFlags.NO_UPDATE;
      this.contents.flushUpdate();
    }

    this.contents.hidden = isClosed;

    if (this.parentWidget) {
      this.parentWidget.flushUpdate();
    } else {
      this.flushUpdate();
    }

    if (changed) {
      this._onchange(isClosed);
    }

    /*
    for (let c of this.shadow.childNodes) {
      if (c !== this.titleframe) {
        c.hidden = state;
      }
    }*/
  }

  _updateClosed(changed) {
    this._setVisible(this._closed, changed);

    if (this.iconcheck) {
      this.iconcheck.checked = this._closed;
    }
  }
}


let makeForward = (k) => {
  return function() {
    return this.contents[k](...arguments);
  }
};

for (let k of forward_keys) {
  PanelFrame.prototype[k] = makeForward(k);
}

UIBase.internalRegister(PanelFrame);
