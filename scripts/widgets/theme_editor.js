import {Area} from '../screen/ScreenArea.js';
import * as nstructjs from '../path-controller/util/struct.js';
import {UIBase, theme, flagThemeUpdate, saveUIData, loadUIData} from '../core/ui_base.js';
import {Container} from '../core/ui.js';
import {validateCSSColor, color2css, css2color, CSSFont} from '../core/ui_theme.js';

export class ThemeEditor extends Container {
  constructor() {
    super();

    this.categoryMap = {};
  }

  static define() {
    return {
      tagname: "theme-editor-x",
      style  : "theme-editor"
    }
  }

  init() {
    super.init();

    this.build();
  }

  doFolder(catkey, obj, container = this, panel = undefined, path=undefined) {
    let key = catkey.key;

    if (!path) {
      path = [key];
    }

    if (!panel) {
      panel = container.panel(key, undefined, undefined, catkey.help);
      panel.style["margin-left"] = "15px";
    }

    let row2 = panel.row();
    let textbox = row2.textbox(undefined, "");

    let callback = (id) => {
      console.log("ID", id, obj, catkey);
      console.log(textbox, textbox.text, textbox.value);

      let propkey = (textbox.text || "").trim();

      if (!propkey) {
        console.error("Cannot have empty theme property name");
        return;
      }

      if (id === "FLOAT") {
        obj[propkey] = 0.0;
      } else if (id === "SUBFOLDER") {
        obj[propkey] = {test : 0};
      } else if (id === "COLOR") {
        obj[propkey] = "grey";
      } else if (id === "FONT") {
        obj[propkey] = new CSSFont();
      } else if (id === "STRING") {
        obj[propkey] = "";
      }

      let uidata = saveUIData(panel, "theme-panel");

      panel.clear();
      this.doFolder(catkey, obj, container, panel, path);

      loadUIData(panel, uidata);
      panel.flushUpdate();
      panel.flushSetCSS();

      //doFolder(catkey, obj, container = this, panel=undefined) {
      //this.build();
      if (this.onchange) {
        this.onchange(key, propkey, obj);
      }
    }

    let menu = row2.menu("+", [
      {name: "Float", callback: () => callback("FLOAT")},
      {name: "Color", callback: () => callback("COLOR")},
      {name: "Subfolder", callback: () => callback("SUBFOLDER")},
      {name: "Font", callback: () => callback("FONT")},
      {name: "String", callback: () => callback("STRING")},
    ]);

    let row = panel.row();
    let col1 = row.col();
    let col2 = row.col();

    let do_onchange = (key, k, obj) => {
      flagThemeUpdate();

      if (this.onchange) {
        this.onchange(key, k, obj);
      }

      this.ctx.screen.completeSetCSS();
      this.ctx.screen.completeUpdate();
    };

    let getpath = (path) => {
      let obj = theme;

      for (let i = 0; i < path.length; i++) {
        obj = obj[path[i]];
      }

      return obj;
    }

    let ok = false;
    let _i = 0;

    let dokey = (k, v, path) => {
      let col = _i%2 === 0 ? col1 : col2;

      if (k.toLowerCase().search("flag") >= 0) {
        return; //don't do flags
      }

      if (typeof v === "string") {
        let v2 = v.toLowerCase().trim();

        let iscolor = validateCSSColor(v2);

        if (iscolor) {
          let cw = col.colorbutton();
          ok = true;
          _i++;

          let color = css2color(v2);
          if (color.length < 3) {
            color = [color[0], color[1], color[2], 1.0];
          }

          try {
            cw.setRGBA(color);
          } catch (error) {
            console.warn("Failed to set color " + k, v2);
          }

          cw.onchange = () => {
            console.log("setting '" + k + "' to " + color2css(cw.rgba), key);
            getpath(path)[k] = color2css(cw.rgba);

            do_onchange(key, k);
          }
          cw.label = k;
        } else {
          col.label(k);

          let box = col.textbox();
          box.onchange = () => {
            getpath(path)[k] = box.text;
            do_onchange(key, k);
          }
          box.text = v;
        }
      } else if (typeof v === "number") {
        let slider = col.slider(undefined, k, v, 0, 256, 0.01, false);

        slider.baseUnit = slider.displayUnit = "none";

        ok = true;
        _i++;

        slider.onchange = () => {
          getpath(path)[k] = slider.value;

          do_onchange(key, k);
        }
      } else if (typeof v === "boolean") {
        let check = col.check(undefined, k);

        check.value = getpath(path)[k];

        check.onchange = () => {
          getpath(path)[k] = !!check.value;
          do_onchange(key, k);
        }
      } else if (typeof v === "object" && v instanceof CSSFont) {
        let panel2 = col.panel(k);
        ok = true;
        _i++;

        let textbox = (key) => {
          panel2.label(key);
          let tbox = panel2.textbox(undefined, v[key]);

          tbox.width = tbox.getDefault("width");

          tbox.onchange = function () {
            v[key] = this.text;
            do_onchange(key, k);
          }
        }

        textbox("font");
        textbox("variant");
        textbox("weight");
        textbox("style");

        let cw = panel2.colorbutton();
        cw.label = "color";
        cw.setRGBA(css2color(v.color));
        cw.onchange = () => {
          v.color = color2css(cw.rgba);
          do_onchange(key, k);
        }

        let slider = panel2.slider(undefined, "size", v.size);
        slider.onchange = () => {
          v.size = slider.value;
          do_onchange(key, k);
        }
        slider.setAttribute("min", 1);
        slider.setAttribute("max", 100);

        slider.baseUnit = slider.displayUnit = "none";

        panel2.closed = true;
      } else if (typeof v === "object") {
        /*
          let old = {
            panel, row, col1, col2
          };

          let path2 = path.slice(0, path.length);
          path2.push(k);

          panel = panel.panel(k);
          row = panel.row();
          col1 = row.col();
          col2 = row.col();
          for (let k2 in v) {
            let v2 = v[k2];

            dokey(k2, v2, path2);
          }

          panel = old.panel;
          row = old.row;
          col1 = old.col1;
          col2 = old.col2;
        */

        let catkey2 = Object.assign({}, catkey);
        catkey2.key = k;

        let path2 = path.concat(k);

        this.doFolder(catkey2, v, panel, undefined, path2);
      }
    };

    for (let k in obj) {
      let v = obj[k];

      dokey(k, v, path);
    }

    if (!ok) {
      panel.remove();
    } else {
      panel.closed = true;
    }

  }

  build() {
    let uidata = saveUIData(this, "theme");

    this.clear();

    let categories = {};

    for (let k of Object.keys(theme)) {
      let catkey;

      if (k in this.categoryMap) {
        let cat = this.categoryMap[k];

        if (typeof cat === "string") {
          cat = {
            category: cat,
            help    : "",
            key     : k
          }
        }

        catkey = cat;
      } else {
        catkey = {category: k, help: '', key: k};
      }

      if (!catkey.key) {
        catkey.key = k;
      }

      if (!(catkey.category in categories)) {
        categories[catkey.category] = [];
      }

      categories[catkey.category].push(catkey);
    }

    function strcmp(a, b) {
      a = a.trim().toLowerCase();
      b = b.trim().toLowerCase();
      return a < b ? -1 : (a === b ? 0 : 1);
    }

    let keys = Object.keys(categories);
    keys.sort(strcmp);

    for (let k of keys) {
      let list = categories[k];
      list.sort((a, b) => strcmp(a.key, b.key));

      let panel = this;

      if (list.length > 1) {
        panel = this.panel(k);
      }

      for (let cat of list) {
        let k2 = cat.key;
        let v = theme[k2];

        if (typeof v === "object") {
          this.doFolder(cat, v, panel);
        }
      }

      if (list.length > 1) {
        panel.closed = true;
      }
    }

    loadUIData(this, uidata);

    for (let i = 0; i < 2; i++) {
      this.flushSetCSS();
      this.flushUpdate();
    }

    if (this.ctx && this.ctx.screen) {
      /* Fix panel spacing bug. */
      window.setTimeout(() => {
        this.ctx.screen.completeSetCSS();
      }, 100);
    }
  }
}

UIBase.internalRegister(ThemeEditor);
