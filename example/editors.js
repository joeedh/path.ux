import {Area} from "../scripts/ScreenArea.js";
import * as nstructjs from "../scripts/struct.js";
import {Icons} from "./icon_enum.js";
import {MyAreaBase} from "./area.js";
import {Menu} from "../scripts/ui_menu.js";

export class SimpleEditor extends MyAreaBase {
  constructor() {
    super();
  }

  init() {
    super.init();

    let header = this.header;

    header.iconbutton(Icons.UNDO, "Undo", () => {
      this.ctx.toolstack.undo(this.ctx);
    });

    header.iconbutton(Icons.REDO, "Redo", () => {
      this.ctx.toolstack.redo(this.ctx);
    })

    header.menu("File", [
      ["New", () => {
        console.log("New clicked");
      }],
      Menu.SEP,
      ["Open", () => {
        console.log("Open clicked");
      }],
      ["Save", () => {
        console.log("Save clicked");
      }],
    ])

    let tabs = this.tabs = this.container.tabs();
    let tab;

    tab = tabs.tab("A tab");
    tab.prop("data.color");

    tabs.tab("Another tab");
    tabs.tab("A third tab");

    let row = this.container.row();

    let text = row.textarea("data.text");

    text.style["width"] = "50%";

    let view = row.viewer("data.text");
    view.style["width"] = "50%";

    view.textTransform = (text) => {
      let lines = text.split("\n");
      let buf = '';

      for (let i=0; i<lines.length; i++) {
        let l = lines[i];
        let l2 = l.trim();

        //do headers
        if (l2[0] == "#") {
          let count = 1;
          while (l2[count-1] === "#") {
            count++;
          }

          l = l.slice(count-1, l.length).trim();

          buf += `<h${count}>${l}</h${count}>\n`;
        } else if (l.search(/[ \t]*\*/) >= 0) {
          buf += "<ul>\n";

          while (l.search(/[ \t]*\*/) == 0 && i < lines.length) {
            l = l.slice(l.search(/\*/)+1, l.length)
            buf += `<li>${l}</li>\n`;

            i++;
            l = lines[i];
          }

          buf += "</ul>";
        } else {
          buf += `<p>${l}</p>\n`;
        }
      }

      return buf;
    }

    row.add(view);
  }

  static define() {return {
    areaname : "simple",
    uiname   : "Simple",
    tagname  : "simple-editor-x",
    icon     : Icons.HELP
  }}
}
SimpleEditor.STRUCT = nstructjs.STRUCT.inherit(SimpleEditor, MyAreaBase) + `
}
`;
nstructjs.register(SimpleEditor);
Area.register(SimpleEditor);

export class SimpleEditor2 extends MyAreaBase {
  constructor() {
    super();
  }

  init() {
    super.init();

    let header = this.header;
    let label = header.label("Drag me");

    label.style["pointer-events"] = "none";

  }

  static define() {return {
    areaname : "simple2",
    uiname   : "Simple2",
    tagname  : "simple-editor2-x",
    icon     : Icons.HELP
  }}
}
SimpleEditor2.STRUCT = nstructjs.STRUCT.inherit(SimpleEditor2, MyAreaBase) + `
}
`;
nstructjs.register(SimpleEditor2);
Area.register(SimpleEditor2);
