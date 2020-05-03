import {Editor} from "../editor_base.js";
import {UIBase} from "../../../scripts/ui_base.js";
import {PackFlags} from "../../../scripts/ui_base.js";
import {Icons} from "../icon_enum.js";
import * as nstructjs from "../../util/struct.js";
import {KeyMap, HotKey} from "../../../scripts/simple_events.js";

export class PropsEditor extends Editor {
  constructor() {
    super();
  }

  getKeyMaps() {
    return [

    ]
  }

  init() {
    super.init();

    let tabs = this.tabs = this.container.tabs("left");

    let tab1 = tabs.tab("Mass Set Example");
    this.buildMassSetExample(tab1);
    this.buildFill(tabs.tab("Fill"));

    tabs.tab("Settings");
    tabs.setActive(tab1);

    this.setCSS();
  }

  buildFill(tab) {
    let col = tab.col();
    let mass_path = "canvas.paths[{$.id % 2 === 0}].material.color";
    col.prop("canvas.paths.active.material.color", undefined, mass_path);
  }

  buildMassSetExample(tab) {
    let col = tab.col();

    let path = "canvas.paths.active.material.color"
    let massSetPath = "canvas.paths[{$.id % 2 === 0}].material.color";

    col.label("Stripe fun!");
    col.prop(path, undefined, massSetPath);

    col.viewer(undefined, `
      <h2>Mass Paths Example</h2>
      <p>This is an example of setting multiple items in a list at once.</p>
      <p>Path.ux reads properties from a single datapath, but writes to multiple
      ones. This works by putting filters inside of lists.  For example:</p>
        
      <pre>"canvas.paths[{$.id % 2 === 0}].material.color"</pre>
      
      Will write to all items in canvas.paths whose .id members are a multiple of 2.
      
      <h3>Full example</h3>      
      <pre>
let path = "canvas.paths.active.material.color"
let massSetPath 
  = "canvas.paths[{$.id % 2 === 0}].material.color";

col.prop(path, undefined, massSetPath);</pre>
    `);
  }

  static define() {return {
    tagname  : "props-editor-x",
    areaname : "props",
    uiname   : "Properties",
    icon     : -1
  }}
};
Editor.register(PropsEditor);
PropsEditor.STRUCT = nstructjs.STRUCT.inherit(PropsEditor, Editor) + `
}
`;
nstructjs.register(PropsEditor);
