import {
  UIBase, PackFlags, Icons, nstructjs, KeyMap, HotKey, util,
  PackNode, PackNodeVertex, Vector2, graphPack, exportTheme
} from '../../pathux.js';

import {Editor} from "../editor_base.js";
import {loadPage} from '../../../scripts/xmlpage/xmlpage.js';
import {loadUIData, saveUIData} from '../../../scripts/core/ui_base.js';
import {getPlatformAsync} from '../../../scripts/platforms/platform.js';

let graphNodes;
let solveTimer;
let seed = 0;

export class PropsEditor extends Editor {
  constructor() {
    super();

    this._pageUIData = undefined;
    this.minSize = [55, undefined];
    //this.maxSize = [350, undefined]
  }

  getKeyMaps() {
    return []
  }

  _save_page_data() {
    if (!this.container) {
      return '';
    }

    let s = saveUIData(this.container, 'page');
    return s;
  }

  loadPage() {
    if (!this.ctx) {
      console.log("waiting for ctx");
      this.doOnce(this.loadPage);
      return;
    }

    getPlatformAsync().then((platform) => {
      let url = platform.resolveURL("./page.xml")

      return loadPage(this.ctx, url);
    }).then(container => {
      this.container.add(container);
      this.container.flushUpdate();

      if (this._pageUIData) {
        console.log("PAGE UI DATA", this._pageUIData.slice(0, 100) + "...");

        loadUIData(this.container, this._pageUIData);
        this._pageUIData = undefined;
        this.container.flushUpdate();
      }

      let graphtab = container.getElementById("graph_pack_tab");
      this.buildGraphPack(graphtab);

      let exportbutton = container.getElementById("export_theme");
      exportbutton.onclick = () => {
        let theme = exportTheme();

        theme = theme.replace(/var theme/, "export const theme");

        theme = `import {CSSFont} from './pathux.js';\n\n` + theme;
        theme = `
/*
 * WARNING: AUTO-GENERATED FILE
 * 
 * Copy to scripts/editors/theme.js
 */
      `.trim() + "\n\n" + theme + "\n";

        console.log(theme);

        let blob = new Blob([theme], {mime: "application/javascript"});
        let url = URL.createObjectURL(blob);

        console.log("url", url);
        window.open(url);
      };
    });
  }

  init() {
    super.init();

    this.doOnce(this.loadPage);

    this.style["overflow-y"] = "scroll";

    return;
    let tabs = this.tabs = this.container.tabs("left");

    let tab1 = tabs.tab("Mass Set Example");
    this.buildMassSetExample(tab1);

    tabs.style["overflow"] = "scroll";

    tab1 = tabs.tab("Theme");
    tab1.button("Export Theme", () => {
      let theme = exportTheme();

      theme = theme.replace(/var theme/, "export const theme");

      theme = `import {CSSFont} from './pathux.js';\n\n` + theme;
      theme = `
/*
 * WARNING: AUTO-GENERATED FILE
 * 
 * Copy to scripts/editors/theme.js
 */
      `.trim() + "\n\n" + theme + "\n";

      console.log(theme);

      let blob = new Blob([theme], {mime: "application/javascript"});
      let url = URL.createObjectURL(blob);

      console.log("url", url);
      window.open(url);
    });

    let th = UIBase.createElement("theme-editor-x");
    this.style["overflow-y"] = "scroll";
    tab1.add(th);

    let tab2 = tabs.tab("Settings");

    let strip = tab2.row().strip();

    strip.prop("data.angle1");
    strip.label("is internally: ");
    strip.pathlabel("data.angle1");

    strip = tab2.row().strip();
    strip.prop("data.angle2");
    strip.label("is internally: ");
    strip.pathlabel("data.angle2");

    strip = tab2.row().strip();
    strip.simpleslider("data.angle1");
    strip.label("is internally: ");
    strip.pathlabel("data.angle1");

    strip = tab2.row().strip();
    strip.simpleslider("data.angle2");
    strip.label("is internally: ");
    strip.pathlabel("data.angle2");

    strip = tab2.row().strip();
    strip.prop("data.vector_test");

    let col = tab2.col();
    col.pathlabel("data.vector_test[0]");
    col.pathlabel("data.vector_test[1]");
    col.pathlabel("data.vector_test[2]");
    col.pathlabel("data.vector_test[3]");

    this.buildCurve(tabs.tab("Curve Mapping"));
    this.buildGraphPack(tabs.tab("Graph Packing"));

    this.setCSS();

    let tab = tabs.tab("TreeView");
    let tview = tab.treeview();

    tview.item("One");
    tview.item("Two");
    let t = tview.item("Three", {icon: Icons.FILE});
    //t.button("Yay", () => {});
    //t.label("Label");

    t = t.item("Four", {icon: Icons.FILE});
    t.item("4.5");

    let row = UIBase.createElement("rowframe-x");
    row.ctx = this.ctx;

    let icon = row.check()
    row.label("Four");

    t.text = row;

    //t.button("Yay2", () => {});
    t = t.item("Five");
    tview.item("Six", {icon: Icons.UNDO});
    tview.item("Six", {icon: Icons.REDO});
    tview.item("Six", {icon: Icons.UNDO});

    if (this.ctx) {
      this.flushUpdate();
    } else {
      this.doOnce(this.flushUpdate);
    }
  }

  copy() {
    let ret = UIBase.createElement(this.constructor.define().tagname);
    ret.ctx = this.ctx;
    return ret;
  }


  buildGraphPackNodes(size) {
    let nodes = this._nodes = [];
    let nodemap = this._nodemap = {};

    let rand = new util.MersenneRandom(seed++);
    let count = 35;
    size /= count;
    size = Math.sqrt(size)*0.75;

    for (let i = 0; i < count; i++) {
      let n = new PackNode();
      n.pos[0] = 0;
      n.pos[1] = 0;

      n.size[0] = (rand.random()*0.5 + 0.5)*size;
      n.size[1] = (rand.random()*0.5 + 0.5)*size;

      for (let i = 0; i < 2; i++) {
        let scount = rand.random()*8;
        let x = i ? n.size[0] : 0;
        let y = 0, socksize = Math.min(20, n.size[1]/scount);

        for (let j = 0; j < scount; j++) {
          let v = new PackNodeVertex(n, [x, y]);
          v.side = i;
          n.verts.push(v);

          y += socksize;
        }
      }

      nodemap[n._id] = n;
      nodes.push(n);
    }

    let ri;

    function randitem(array) {
      ri = ~~(Math.random()*array.length*0.99999);
      return array[ri];
    }

    let visit2 = new Set();

    let linkcount = count*2.5*(rand.random()*0.5 + 0.5);

    for (let i = 0; i < linkcount; i++) {
      //let n1 = randitem(nodes), n2 = randitem(nodes);
      let ri = i%nodes.length;
      ri = ~~(rand.random()*nodes.length*0.99999);

      let ri2 = (ri + 1)%nodes.length;
      if (rand.random() > 0.8) {
        ri2 = ~~(rand.random()*nodes.length*0.99999);
      }

      let n1 = nodes[ri];
      let n2 = nodes[ri2];

      let key = "" + Math.min(n1._id, n2._id) + ":" + Math.max(n1._id, n2._id);
      if (visit2.has(key)) {//n1._id)) {
        continue;
      }

      if (n1 === n2)
        continue;

      visit2.add(key);

      let s1 = randitem(n1.verts);
      let s2 = randitem(n2.verts);

      if (s1.edges.indexOf(s2) >= 0) {
        continue;
      }

      if (!s1 || !s2) continue;

      s1.edges.push(s2);
      s2.edges.push(s1);
    }

    graphNodes = {
      nodes, nodemap
    }

    return graphNodes;
  }

  buildGraphPack(tab) {
    let draw;

    let canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    let scale = 0.25;

    canvas.addEventListener("wheel", (e) => {
      let df = Math.sign(e.deltaY)*0.05;
      scale *= 1.0 - df;

      console.log("scale", scale);

      draw();
    });

    const margin = 55;

    if (!graphNodes) {
      this.buildGraphPackNodes(canvas.width*canvas.height);
      graphPack(graphNodes.nodes, {steps: 2, margin});
    }

    let {nodes} = graphNodes;

    canvas.g = canvas.getContext("2d");

    canvas.style["border"] = "1px solid orange";

    draw = () => {
      let g = canvas.g;

      g.resetTransform();
      g.clearRect(0, 0, canvas.width, canvas.height);

      g.translate(canvas.width*0.5, canvas.height*0.5);
      g.scale(scale, scale);
      g.translate(-canvas.width*0.5, -canvas.height*0.5);
      g.lineWidth = 2.0/scale;

      g.beginPath();
      g.strokeStyle = "black";

      for (let node of nodes) {
        for (let v of node.verts) {
          let p1 = new Vector2(v).add(node.pos);

          for (let v2 of v.edges) {
            let p2 = new Vector2(v2).add(v2.node.pos);

            //let d = v.vectorDistance(v2)*1.5;
            let d = Math.abs(v2[0] - v[0])*1.5;

            let s1 = v.side ? -1 : 1;
            let s2 = v2.side ? -1 : 1;

            let dx1 = -s1*d, dy1 = 0.0;
            let dx2 = -s2*d, dy2 = 0.0;

            g.moveTo(p1[0], p1[1]);
            g.bezierCurveTo(p1[0] + dx1, p1[1] + dy1, p2[0] + dx2, p2[1] + dy2, p2[0], p2[1]);
            //g.lineTo(p2[0], p2[1]);
          }
        }
      }
      g.stroke();

      g.fillStyle = "teal";
      g.strokeStyle = "orange";

      g.beginPath();
      for (let node of nodes) {
        g.rect(node.pos[0], node.pos[1], node.size[0], node.size[1]);
      }
      g.fill();
      g.stroke();
    };

    let timercb = () => {
      if (!this.isConnected) {
        window.clearInterval(solveTimer);
        solveTimer = undefined;
        return;
      }

      let time = util.time_ms();
      while (util.time_ms() - time < 100) {
        graphPack(nodes, {
          steps: 2,
          speed: 0.1,
          margin
        });
      }

      draw();
    }

    let strip = tab.row();

    strip.button("Reset", () => {
      nodes = this.buildGraphPackNodes(canvas.width*canvas.height).nodes;
      graphPack(graphNodes.nodes, {steps: 22, margin});
      draw();
    });

    strip.button("Pack", () => {
      graphPack(graphNodes.nodes, {steps: 22, margin});

      draw();
    });

    strip.button("Start/Stop", () => {
      console.log("pack!");
      //graphPack(nodes, undefined, undefined, draw);
      if (solveTimer !== undefined) {
        window.clearInterval(solveTimer);
        solveTimer = undefined;
        return;
      }

      solveTimer = window.setInterval(timercb, 30);

      draw();
    });

    tab.shadow.appendChild(canvas);
    draw();

  }

  buildCurve(tab) {
    tab.prop("data.curvemap");
    //let c = document.createElement("curve-widget-x");
    //tab.add(c);
  }

  buildMassSetExample(tab) {
    let col = tab.col();

    let path = "canvas.paths.active.material.color"
    let massSetPath = "canvas.paths[{$.id % 2 === 0}].material.color";

    col.label("Stripe fun!");
    let ret = col.prop(path, undefined, massSetPath);
    ret.style["padding"] = "10px";

    let viewer = col.viewer(undefined, `
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

  static define() {
    return {
      tagname : "props-editor-x",
      areaname: "props",
      uiname  : "Properties",
      icon    : -1
    }
  }
};
Editor.register(PropsEditor);
PropsEditor.STRUCT = nstructjs.STRUCT.inherit(PropsEditor, Editor) + `
  _pageUIData : string | this._save_page_data();
}
`;
nstructjs.register(PropsEditor);
