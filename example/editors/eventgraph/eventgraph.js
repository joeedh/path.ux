import {Editor} from "../editor_base.js";
import {
  nstructjs, util, Vector2, Matrix4, UIBase,
  eventgraph
} from '../../pathux.js';
import {theEventGraph} from '../../../scripts/path-controller/dag/eventdag.js';

let proj_cachering = util.cachering.fromConstructor(Vector2, 64);

window.theEventGraph = theEventGraph;

class SocketUI {
  pos = new Vector2()
  abspos = new Vector2()
  nodeui = undefined;
}

class NodeUI {
  pos = new Vector2();
  size = new Vector2();
  inputs = {}
  outputs = {}
  node = undefined;
  socks = new Map()

  constructor(node) {
    this.node = node;
  }

  getSockUI(sock) {
    let ret = this.socks.get(sock);
    if (!ret) {
      ret = new SocketUI()
      ret.nodeui = this
      this.socks.set(sock, ret);
    }

    return ret;
  }

  layoutSockets(type) {
    let socks = this.node[type];
    let x = type === "inputs" ? 0 : this.size[1];
    let y = 35;

    for (let [k, sock] of Object.entries(socks)) {
      let sockui = this.getSockUI(sock);

      sockui.pos.loadXY(x, y);
      sockui.abspos.add(this.pos);

      y += 25;
    }

    this.size[1] = Math.max(this.size[1], y);
  }

  layout() {
    this.size[1] = 350;
    let x = 0, y = 0;

    this.inputs = this.layoutSockets("inputs");
    this.outputs = this.layoutSockets("outputs");
  }
}

export class EventGraphViewer extends Editor {
  needsDraw = true;
  canvas = undefined;
  g = undefined;

  nodeUiMap = new Map();

  constructor() {
    super();

    this.pan = new Vector2();
    this.scale = 1.0;

    this.canvas = document.createElement("canvas");
    this.g = this.canvas.getContext("2d");
  }

  getKeyMaps() {
    return []
  }

  init() {
    super.init();

    this.shadow.appendChild(this.canvas);
    this.flagRedraw();
  }

  flagRedraw() {
    if (this.needsDraw) {
      return;
    }

    this.needsDraw = true;
    requestAnimationFrame(() => this.draw());
  }

  getNodeUI(node) {
    let ret = this.nodeUiMap.get(node);
    if (!ret) {
      ret = new NodeUI(node);
      this.nodeUiMap.set(node, ret);
    }

    return ret;
  }

  update() {
    try {
      if (this.needsDraw) {
        this.draw();
      }
    } catch (error) {
      util.print_stack(error);
    }
  }

  draw() {
    if (!this.isConnected) {
      return;
    }

    this.needsDraw = false;
    let {canvas, g, scale, pan} = this;

    let dpi = UIBase.getDPI();
    let w = ~~(this.size[0]*dpi);
    let h = ~~(this.size[1]*dpi);

    canvas.width = w;
    canvas.height = h;
    canvas.style["width"] = (w/dpi) + "px";
    canvas.style["height"] = (h/dpi) + "px";
    canvas.style["padding"] = canvas.style["margin"] = "0px";

    let graph = eventgraph.theEventGraph;

  }

  update() {
    super.update();
  }

  static define() {
    return {
      tagname : "eventgraph-editor-x",
      areaname: "eventgraph",
      uiname  : "Event Graph",
      icon    : -1
    }
  }
};
Editor.register(EventGraphViewer);
EventGraphViewer.STRUCT = nstructjs.STRUCT.inherit(EventGraphViewer, Editor) + `
  pan   : vec2;
  scale : float;
}
`;
nstructjs.register(EventGraphViewer);
