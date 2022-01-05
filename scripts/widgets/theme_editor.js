import {Area} from '../screen/ScreenArea.js';
import * as nstructjs from '../path-controller/util/struct.js';
import {UIBase, theme, flagThemeUpdate} from '../core/ui_base.js';
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

  doFolder(catkey, obj, container = this) {
    let key = catkey.key;

    let panel = container.panel(key, undefined, undefined, catkey.help);
    panel.style["margin-left"] = "15px";

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
      }
    };

    for (let k in obj) {
      let v = obj[k];

      dokey(k, v, [key]);
    }

    if (!ok) {
      panel.remove();
    } else {
      panel.closed = true;
    }

  }

  build() {
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
  }
}

UIBase.internalRegister(ThemeEditor);
