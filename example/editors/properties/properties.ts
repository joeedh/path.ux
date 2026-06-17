import {
  UIBase,
  Icons,
  nstructjs,
  util,
  PackNode,
  PackNodeVertex,
  Vector2,
  graphPack,
  exportTheme,
  loadUIData,
  saveUIData,
  mount,
  Container,
  TabContainer,
  RowFrame,
} from "../../pathux.js";

import { Editor } from "../editor_base.js";
import { PropsPage } from "../../page.js";

// graphpack's PackNodeVertex tracks which side of a node a socket sits on; this
// app sets it when laying out the demo graph. It is not part of the library type.
declare module "../../pathux.js" {
  interface PackNodeVertex {
    side?: number;
  }
}

let graphNodes: { nodes: PackNode[]; nodemap: Record<number, PackNode> } | undefined;
let solveTimer: number | undefined;
let seed = 0;

export class PropsEditor extends Editor {
  _pageUIData: string | undefined;
  tabs!: TabContainer;
  _nodes!: PackNode[];
  _nodemap!: Record<number, PackNode>;

  constructor() {
    super();

    this._pageUIData = undefined;
    this.minSize = [55, undefined];
    //this.maxSize = [350, undefined]
  }

  getKeyMaps() {
    return [];
  }

  _save_page_data() {
    if (!this.container) {
      return "";
    }

    const s = saveUIData(this.container, "page");
    return s;
  }

  loadPage() {
    if (!this.ctx) {
      console.log("waiting for ctx");
      this.doOnce(this.loadPage);
      return;
    }

    // Build the page from typed JSX (example/page.tsx). Interactive wiring that
    // the markup can't express is supplied through typed `ref` callbacks instead
    // of post-build getElementById lookups.
    mount(
      this.ctx,
      this.container,
      PropsPage({
        exportButton: (btn) => {
          btn.onclick = () => this.exportTheme();
        },
        graphTab    : (tab) => this.buildGraphPack(tab),
        // CanvasPath has no name field; label list entries by id for the demo.
        listbox: (lb) => {
          lb.itemNames((obj) => "Path " + (obj as { id: number }).id);
        },
        eventStrip: (con) => {
          con.dataPrefix = "";
          const bval = con.prop("data.boolval");
          const color = con.prop("data.color");

          color.dependsOn("hidden", bval, "value").invert();
        },
      })
    );

    this.container.flushUpdate();

    if (this._pageUIData) {
      console.log("PAGE UI DATA", this._pageUIData.slice(0, 100) + "...");

      loadUIData(this.container, this._pageUIData);
      this._pageUIData = undefined;
      this.container.flushUpdate();
    }
  }

  exportTheme() {
    let theme = exportTheme();

    theme = theme.replace(/var theme/, "export const theme");

    theme = `import {CSSFont} from './pathux.js';\n\n` + theme;
    theme =
      `
/*
 * WARNING: AUTO-GENERATED FILE
 *
 * Copy to scripts/editors/theme.js
 */
      `.trim() +
      "\n\n" +
      theme +
      "\n";

    console.log(theme);

    const blob = new Blob([theme], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);

    console.log("url", url);
    window.open(url);
  }

  init() {
    super.init();

    this.doOnce(this.loadPage);

    this.style.overflowY = "scroll";

    return;
    const tabs = (this.tabs = this.container.tabs("left"));

    let tab1 = tabs.tab("Mass Set Example");
    this.buildMassSetExample(tab1);

    tabs.style.overflow = "scroll";

    tab1 = tabs.tab("Theme");
    tab1.button("Export Theme", () => {
      let theme = exportTheme();

      theme = theme.replace(/var theme/, "export const theme");

      theme = `import {CSSFont} from './pathux.js';\n\n` + theme;
      theme =
        `
/*
 * WARNING: AUTO-GENERATED FILE
 * 
 * Copy to scripts/editors/theme.js
 */
      `.trim() +
        "\n\n" +
        theme +
        "\n";

      console.log(theme);

      const blob = new Blob([theme], { type: "application/javascript" });
      const url = URL.createObjectURL(blob);

      console.log("url", url);
      window.open(url);
    });

    const th = UIBase.createElement<UIBase>("theme-editor-x");
    this.style.overflowY = "scroll";
    tab1.add(th);

    const tab2 = tabs.tab("Settings");

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

    const col = tab2.col();
    col.pathlabel("data.vector_test[0]");
    col.pathlabel("data.vector_test[1]");
    col.pathlabel("data.vector_test[2]");
    col.pathlabel("data.vector_test[3]");

    this.buildCurve(tabs.tab("Curve Mapping"));
    this.buildGraphPack(tabs.tab("Graph Packing"));

    this.setCSS();

    const tab = tabs.tab("TreeView");
    const tview = tab.treeview();

    tview.item("One");
    tview.item("Two");
    let t = tview.item("Three", { icon: Icons.FILE });
    //t.button("Yay", () => {});
    //t.label("Label");

    t = t.item("Four", { icon: Icons.FILE });
    t.item("4.5");

    const row = UIBase.createElement<RowFrame>("rowframe-x");
    row.ctx = this.ctx;

    row.check(undefined, "");
    row.label("Four");

    t.text = row;

    //t.button("Yay2", () => {});
    t = t.item("Five");
    tview.item("Six", { icon: Icons.UNDO });
    tview.item("Six", { icon: Icons.REDO });
    tview.item("Six", { icon: Icons.UNDO });

    if (this.ctx) {
      this.flushUpdate();
    } else {
      this.doOnce(this.flushUpdate);
    }
  }

  copy() {
    const ret = UIBase.createElement<PropsEditor>(
      (this.constructor as unknown as typeof PropsEditor).define().tagname
    );
    ret.ctx = this.ctx;
    return ret;
  }

  buildGraphPackNodes(size: number) {
    const nodes = (this._nodes = [] as PackNode[]);
    const nodemap = (this._nodemap = {} as Record<number, PackNode>);

    const rand = new util.MersenneRandom(seed++);
    const count = 35;
    size /= count;
    size = Math.sqrt(size) * 0.75;

    for (let i = 0; i < count; i++) {
      const n = new PackNode();
      n.pos[0] = 0;
      n.pos[1] = 0;

      n.size[0] = (rand.random() * 0.5 + 0.5) * size;
      n.size[1] = (rand.random() * 0.5 + 0.5) * size;

      for (let i = 0; i < 2; i++) {
        const scount = rand.random() * 8;
        const x = i ? n.size[0] : 0;
        let y = 0;
        const socksize = Math.min(20, n.size[1] / scount);

        for (let j = 0; j < scount; j++) {
          const v = new PackNodeVertex(n, [x, y]);
          v.side = i;
          n.verts.push(v);

          y += socksize;
        }
      }

      nodemap[n._id] = n;
      nodes.push(n);
    }

    let ri = 0;

    function randitem<T>(array: T[]): T {
      ri = ~~(Math.random() * array.length * 0.99999);
      return array[ri];
    }

    const visit2 = new Set<string>();

    const linkcount = count * 2.5 * (rand.random() * 0.5 + 0.5);

    for (let i = 0; i < linkcount; i++) {
      //let n1 = randitem(nodes), n2 = randitem(nodes);
      const ri = ~~(rand.random() * nodes.length * 0.99999);

      let ri2 = (ri + 1) % nodes.length;
      if (rand.random() > 0.8) {
        ri2 = ~~(rand.random() * nodes.length * 0.99999);
      }

      const n1 = nodes[ri];
      const n2 = nodes[ri2];

      const key = "" + Math.min(n1._id, n2._id) + ":" + Math.max(n1._id, n2._id);
      if (visit2.has(key)) {
        //n1._id)) {
        continue;
      }

      if (n1 === n2) continue;

      visit2.add(key);

      const s1 = randitem(n1.verts);
      const s2 = randitem(n2.verts);

      if (s1.edges.includes(s2)) {
        continue;
      }

      if (!s1 || !s2) continue;

      s1.edges.push(s2);
      s2.edges.push(s1);
    }

    graphNodes = {
      nodes,
      nodemap,
    };

    return graphNodes;
  }

  buildGraphPack(tab: Container) {
    let draw = (): void => {};

    const canvas = document.createElement("canvas");
    const g = canvas.getContext("2d")!;
    const dpi = UIBase.getDPI();

    let w = 800;
    let h = 600;
    canvas.style["width"] = w / dpi + "px";
    canvas.style["height"] = h / dpi + "px";
    let scale = 0.25;

    canvas.addEventListener("wheel", (e) => {
      const df = Math.sign(e.deltaY) * 0.05;
      scale *= 1.0 - df;

      console.log("scale", scale);

      draw();
    });

    const margin = 55;

    if (!graphNodes) {
      graphNodes = this.buildGraphPackNodes(canvas.width * canvas.height);
      graphPack(graphNodes.nodes, { steps: 2, margin });
    }

    let { nodes } = graphNodes;
    canvas.style.border = "1px solid orange";

    draw = () => {
      if (this.size === undefined) {
        // properties editor is not active
        return;
      }

      w = ~~((this.size[0] - 75) * dpi);
      h = ~~(this.size[1] * dpi);

      canvas.style["width"] = w / dpi + "px";
      canvas.style["height"] = h / dpi + "px";
      canvas.width = w;
      canvas.height = h;

      g.resetTransform();
      g.clearRect(0, 0, canvas.width, canvas.height);

      g.translate(canvas.width * 0.5, canvas.height * 0.5);
      g.scale(scale, scale);
      g.translate(-canvas.width * 0.5, -canvas.height * 0.5);
      g.lineWidth = 2.0 / scale;

      g.beginPath();
      g.strokeStyle = "black";

      for (const node of nodes) {
        for (const v of node.verts) {
          const p1 = new Vector2(v).add(node.pos);

          for (const v2 of v.edges) {
            const p2 = new Vector2(v2).add(v2.node.pos);

            //let d = v.vectorDistance(v2)*1.5;
            const d = Math.abs(v2[0] - v[0]) * 1.5;

            const s1 = v.side ? -1 : 1;
            const s2 = v2.side ? -1 : 1;

            const dx1 = -s1 * d;
            const dy1 = 0.0;
            const dx2 = -s2 * d;
            const dy2 = 0.0;

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
      for (const node of nodes) {
        g.rect(node.pos[0], node.pos[1], node.size[0], node.size[1]);
      }
      g.fill();
      g.stroke();
    };

    const timercb = () => {
      if (!this.isConnected) {
        window.clearInterval(solveTimer);
        solveTimer = undefined;
        return;
      }

      const time = util.time_ms();
      while (util.time_ms() - time < 100) {
        graphPack(nodes, {
          steps: 2,
          speed: 0.1,
          margin,
        });
      }

      draw();
    };

    const strip = tab.row();

    strip.button("Reset", () => {
      nodes = this.buildGraphPackNodes(canvas.width * canvas.height).nodes;
      graphPack(nodes, { steps: 22, margin });
      draw();
    });

    strip.button("Pack", () => {
      graphPack(nodes, { steps: 22, margin });

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

  buildCurve(tab: Container) {
    tab.prop("data.curvemap");
    //let c = document.createElement("curve-widget-x");
    //tab.add(c);
  }

  buildMassSetExample(tab: Container) {
    const col = tab.col();

    const path = "canvas.paths.active.material.color";
    const massSetPath = "canvas.paths[{$.id % 2 === 0}].material.color";

    col.label("Stripe fun!");
    const ret = col.prop(path, undefined, massSetPath);
    ret.style["padding"] = "10px";

    col.viewer(
      undefined,
      `
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
    `
    );
  }

  static define() {
    return {
      tagname : "props-editor-x",
      areaname: "props",
      uiname  : "Properties",
      icon    : -1,
    };
  }
}
Editor.register(PropsEditor);
PropsEditor.STRUCT =
  nstructjs.STRUCT.inherit(PropsEditor, Editor) +
  `
  _pageUIData : string | this._save_page_data();
}
`;
nstructjs.register(PropsEditor);
