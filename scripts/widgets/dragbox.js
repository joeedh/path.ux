import {UIBase, Icons} from '../core/ui_base.js';
import {Container} from '../core/ui.js';
import {pushModalLight, popModalLight, keymap} from '../util/simple_events.js';
import {parsepx} from '../core/ui_theme.js';

function startDrag(box) {
  if (box._modal) {
    popModalLight(box._modal);
    box._modal = undefined;
    return;
  }

  let first = true;
  let lastx = 0;
  let lasty = 0;

  let handlers = {
    on_mousemove(e) {
      let x = e.x, y = e.y;

      if (first) {
        lastx = x;
        lasty = y;
        first = false;

        return;
      }

      let dx = x - lastx;
      let dy = y - lasty;

      let hx = parsepx(box.style["left"]);
      let hy = parsepx(box.style["top"]);

      hx += dx;
      hy += dy;

      console.log(hx, hy);

      box.style["left"] = hx + "px";
      box.style["top"] = hy + "px";

      lastx = x;
      lasty = y;
    },

    end() {
      if (box._modal) {
        popModalLight(box._modal);
        box._modal = undefined;
      }
    },

    on_mouseup(e) {
      this.end();
    },

    on_keydown(e) {
      switch (e.keyCode) {
        case keymap["Escape"]:
        case keymap["Return"]:
          this.end();
          break;
      }
    }

  }

  box._modal = pushModalLight(handlers);
}

export class DragBox extends Container {
  constructor() {
    super();

    this._done = false;
    this.header = UIBase.createElement("rowframe-x");
    this.contents = UIBase.createElement("container-x");

    this.header.style["border-radius"] = "20px";

    this.header.parentWidget = this;
    this.contents.parentWidget = this;

    this.shadow.appendChild(this.header);
    this.shadow.appendChild(this.contents);
  }

  init() {
    super.init();

    let header = this.header;

    header.ctx = this.ctx;
    this.contents.ctx = this.ctx;
    header._init();
    this.contents._init();

    this.style["min-width"] = "350px";
    header.style["height"] = "35px";

    let icon = header.iconbutton(Icons.DELETE, "Hide", () => {
      this.end();
    });
    icon.iconsheet = 0; //use small icons

    this.addEventListener("mousedown", (e) => {
      console.log("start drag");
      startDrag(this);
    }, {capture : false})

    header.background = this.getDefault("Background");

    this.setCSS();
  }

  add() {
    return this.contents.add(...arguments);
  }

  prepend(n) {
    return this.contents.prepend(n);
  }

  appendChild(n) {
    return this.contents.appendChild(n);
  }
  col() {
    return this.contents.col(...arguments);
  }

  row() {
    return this.contents.row(...arguments);
  }

  strip() {
    return this.contents.strip(...arguments);
  }
  button() {
    return this.contents.button(...arguments);
  }
  iconbutton() {
    return this.contents.iconbutton(...arguments);
  }
  iconcheck() {
    return this.contents.iconcheck(...arguments);
  }
  tool() {
    return this.contents.tool(...arguments);
  }
  menu() {
    return this.contents.menu(...arguments);
  }
  prop() {
    return this.contents.prop(...arguments);
  }
  listenum() {
    return this.contents.listenum(...arguments);
  }
  check() {
    return this.contents.check(...arguments);
  }
  iconenum() {
    return this.contents.iconenum(...arguments);
  }
  slider() {
    return this.contents.slider(...arguments);
  }
  simpleslider() {
    return this.contents.simpleslider(...arguments);
  }
  curve() {
    return this.contents.curve(...arguments);
  }
  textbox() {
    return this.contents.textbox(...arguments);
  }
  textarea() {
    return this.contents.textarea(...arguments);
  }
  viewer() {
    return this.contents.viewer(...arguments);
  }
  panel() {
    return this.contents.panel(...arguments);
  }
  tabs() {
    return this.contents.tabs(...arguments);
  }
  table() {
    return this.contents.table(...arguments);
  }


  end() {
    if (this._done) {
      return;
    }
    this.remove();

    if (this._onend) {
      this._onend();
    }

    if (this.onend) {
      this.onend();
    }
  }

  setCSS() {
    super.setCSS();

    this.background = this.getDefault("Background");
  }

  static define() {return {
    tagname : "drag-box-x",
    style   : "panel"
  }}
}
UIBase.internalRegister(DragBox);
