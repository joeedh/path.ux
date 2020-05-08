import {Container} from './ui_container.js';
import {UIBase} from './ui_base.js';
import {DataAPI} from "./simple_controller.js";

export let api = new DataAPI();

export function setRootStruct(val) {
  return api.setRoot(val);
}

/*container interface refactor TODO:

* Have a system to build datapath definition and UI at the same time
* Make greater use of arguments object literals, instead of giant
  function parameter lists

Building the data api along with the UI will probably require
patching widget objects in real-time.  The idea is to do something like this:


layout.beginPath("object", SomeObjectClass)
layout.slider("value").range(0, 1)

*/

export class ContainerIF {
  beginPath(path, cls) {}
  endPath() {}

  prop(path, args) {}
  tool(path, args) {}
  menu(title, definition, args) {}

  slider(path, args) {}
  simpleslider(path, args) {}
  textbox(path, args) {}
  vector(path, args) {}
  colorpicker(path, args) {}
  colorbutton(path, args) {}
  iconenum(path, args) {}
  iconcheck(path, args) {}
  button(name, tooltip, args) {}
  iconbutton(icon, tooltip, args) {}

  //also known as a dropbox
  listenum(path, args) {}

  table() {}
  row() {}
  col() {}
  strip() {}

  useIcons() {}
  useSimpleSliders() {}
}

export class BuilderContainer extends Container {
  constructor() {
    super();
    this.pathPrefix = "";
    this.pathstack = [];
    this._class = undefined;
    this._struct = undefined;
  }

  init() {
    super.init();
  }

  _buildPath() {
    let path = "";

    for (let p of this.pathstack) {
      if (p[0].trim() === "") {
        continue;
      }

      if (path.length > 0)
        path += "."
      path += p[0];
    }

    if (this.pathstack.length > 0) {
      this._class = this.pathstack[this.pathstack.length - 1][1];
      this._struct = this.pathstack[this.pathstack.length - 1][2];
    } else {
      this._class = undefined;
      this._struct = undefined;
    }

    this.pathPrefix = path;
    return path;
  }

  beginPath(path, cls) {
    this.pathstack.push([path, cls, api.mapStruct(cls, true)]);
    this._buildPath();
  }

  popPath(path, cls) {
    this.pathstack.pop();
    this._buildPath();
  }

  joinPath(path) {
    if (this.pathPrefix.trim().length > 0) {
      return this.pathPrefix + "." + path;
    } else {
      return path.trim();
    }
  }

  _makeAPI(path) {
    if (!path) {
      return false;
    }

    if (!this._struct) {
      console.warn("No struct");
      return false;
    }

    return !(path in this._struct.pathmap);
  }


  static define() {return {
    tagname "container-builder-x"
  }}

  _args(args={}) {
    if (args.packflag === undefined)
      args.packflag = 0;

    args.packflag |= this.inherit_packflag;

    return args;
  }

  prop(path, args) {
    args = this._args(args);
    return super.prop(path, args.packflag, args.mass_set_path);
  }
  tool(path, args) {
    args = this._args(args);
    return super.tool(path, args.packflag, args.create_cb);
  }

  menu(title, definition, args) {
    args = this._args(args);
    return super.menu(title, definition, args.packflag);
  }

  _wrapElem(e, dpath) {
    return {
      widget : e,
      range : (min, max) => dpath.range(min, max),
      description : (d) => dpath.description(d),
      on : () => dpath.on(...arguments),
      off : () => dpath.off(...arguments),
      simpleSlider : () => dpath.simpleSlider(),
      rollerSlider : () => dpath.rollerSlider(),
      uiRange : (min, max) => dpath.uiRange(),
      decimalPlaces : (p) => dpath.decimalPlaces(),
      expRate : (p) => dpath.expRate(p),
      radix : (p) => dpath.radix(p),
      step : (p) => dpath.step(p),
      icon : (icon) => dpath,icon(icon),
      icons : (iconmap) => dpath,icons(iconmap),
      descriptions : (ds) => dpath.descriptions(ds),
      customGetSet : () => dpath.customGetSet.apply(...arguments)
    }
  }

  slider(path, args) {
    args = this._args(args);
    let dopatch = false, dpath;

    if (this._makeAPI(path)) {
      let path2 = args.apiname ? args.apiname : path;
      let uiname = args.uiName ? args.uiName : path2;

      if (args.is_int || args.isInt) {
        dpath = this._struct.int(path, path2, uiname, args.description);
      } else {
        dpath = this._struct.float(path, path2, uiname, args.description);
      }

      if (args.min && args.max) {
        dpath.range(args.min, args.max);
      }

    }


    let ret = super.slider(this.joinPath(path), args.name, args.defaultval, args.min, args.max,
                        args.step, args.is_int, args.do_redraw, args.callback, args.packflag);

    if (dopatch) {
      this._wrapElem(ret, dpath);
    }

    return ret;
  }

  simpleslider(path, args) {
    args = this._args(args);
    args.packflag |= PackFlags.SIMPLE_NUMSLIDERS;
    return this.slider(path, args);
  }

  textbox(path, args) {
    args = this._args(args);
    let dopatch = false, dpath;

    if (this._makeAPI(path)) {
      let path2 = args.apiname ? args.apiname : path;
      let uiname = args.uiName ? args.uiName : path2;


      if (args.type === "int") {
        dpath = this._struct.int(path, path2, uiname, args.description);
      } else if (args.type === "float") {
        dpath = this._struct.float(path, path2, uiname, args.description);
      } else {
        dpath = this._struct.string(path, path2, uiname, args.description);
      }

      if ((args.type === "int" || args.type === "float") && args.min && args.max) {
        dpath.range(args.min, args.max);
      }
    }


    let ret = super.textbox(this.joinPath(path), args.text, args.callback, args.packflag);

    if (dopatch) {
      this._wrapElem(ret, dpath);
    }

    return ret;
  }
  vector(path, args) {}
  colorpicker(path, args) {}
  colorbutton(path, args) {}
  iconenum(path, args) {}
  iconcheck(path, args) {}
  button(name, tooltip, args) {}
  iconbutton(icon, tooltip, args) {}

  //also known as a dropbox
  listenum(path, args) {}

  table() {}
  row() {}
  col() {}
  strip() {}

  useIcons() {}
  useSimpleSliderS() {}

}

export class BuilderRow extends BuilderContainer {
  init() {
    super.init();

    this.style["flex-direction"] = "row";
  }

  static define() {return {
    tagname "row-builder-x"
  }}
}
UIBase.register(BuilderRow);
