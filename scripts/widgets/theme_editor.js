import {Area} from '../screen/ScreenArea.js';
import * as nstructjs from '../path-controller/util/struct.js';
import {UIBase, theme, flagThemeUpdate} from '../core/ui_base.js';
import {Container} from '../core/ui.js';
import {color2css, css2color, CSSFont} from '../core/ui_theme.js';

let basic_colors = {
  'white' : [1,1,1],
  'grey' : [0.5, 0.5, 0.5],
  'gray' : [0.5, 0.5, 0.5],
  'black' : [0, 0, 0],
  'red' : [1, 0, 0],
  'yellow' : [1, 1, 0],
  'green' : [0, 1, 0],
  'teal' : [0, 1, 1],
  'cyan' : [0, 1, 1],
  'blue' : [0, 0, 1],
  'orange' : [1, 0.5, 0.25],
  'brown' : [0.5, 0.4, 0.3],
  'purple' : [1, 0, 1],
  'pink' : [1, 0.5, 0.5]
};

export class ThemeEditor extends Container {
  constructor() {
    super();
  }

  init() {
    super.init();

    this.build();
  }

  doFolder(key, obj) {
    let panel = this.panel(key);
    panel.style["margin-left"] = "15px";

    let row = panel.row();
    let col1 = row.col();
    let col2 = row.col();


    let do_onchange = (key, k, obj) => {
      flagThemeUpdate();

      if (this.onchange) {
        this.onchange(key, k, obj);
      }
    };

    let getpath = (path) => {
      let obj = theme;

      for (let i=0; i<path.length; i++) {
        obj = obj[path[i]];
      }

      return obj;
    }

    let ok = false;
    let _i = 0;

    let dokey = (k, v, path) => {
      let col = _i % 2 === 0 ? col1 : col2;

      if (k.toLowerCase().search("flag") >= 0) {
        return; //don't do flags
      }

      if (typeof v === "string") {
        let v2 = v.toLowerCase().trim();

        let iscolor = v2 in basic_colors;
        iscolor = iscolor || v2.search("rgb") >= 0;
        iscolor = iscolor || v2[0] === "#";

        if (iscolor) {
          let cw = col.colorbutton();
          ok = true;
          _i++;

          try {
            cw.setRGBA(css2color(v2));
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
          panel2.textbox(undefined, v[key]).onchange = function() {
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
    let keys = Object.keys(theme);
    keys.sort();

    for (let k of keys) {
      let v = theme[k];
      if (typeof v === "object") {
        this.doFolder(k, v);
      }
    }
  }

  static define() { return {
    tagname : "theme-editor-x",
    style   : "theme-editor"
  }}
}
UIBase.internalRegister(ThemeEditor);
