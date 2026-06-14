import { Editor } from "../editor_base.js";
import { nstructjs, util, Vector2, Matrix4, UIBase, eventgraph } from "../../pathux.js";
const { theEventGraph } = eventgraph;

window.theEventGraph = theEventGraph;

class SocketUI {
  pos = new Vector2();
  abspos = new Vector2();
  nodeui: NodeUI | undefined = undefined;
}

class NodeUI {
  pos = new Vector2();
  size = new Vector2();
  inputs: Record<string, eventgraph.EventSocket> = {};
  outputs: Record<string, eventgraph.EventSocket> = {};
  node: eventgraph.EventNode;
  socks = new Map<eventgraph.EventSocket, SocketUI>();

  constructor(node: eventgraph.EventNode) {
    this.node = node;
  }

  getSockUI(sock: eventgraph.EventSocket) {
    let ret = this.socks.get(sock);
    if (!ret) {
      ret = new SocketUI();
      ret.nodeui = this;
      this.socks.set(sock, ret);
    }

    return ret;
  }

  layoutSockets(type: eventgraph.SocketType) {
    const socks = this.node[type];
    const x = type === "inputs" ? 0 : this.size[1];
    let y = 35;

    for (const sock of Object.values(socks)) {
      const sockui = this.getSockUI(sock);

      sockui.pos.loadXY(x, y);
      sockui.abspos.add(this.pos);

      y += 25;
    }

    this.size[1] = Math.max(this.size[1], y);
  }

  layout() {
    this.size[1] = 350;

    // BUG FIX: previously assigned layoutSockets()'s void return to this.inputs/
    // this.outputs, clobbering them with undefined. layoutSockets mutates socket
    // UI in place and returns nothing, so just invoke it.
    this.layoutSockets("inputs");
    this.layoutSockets("outputs");
  }
}

export class EventGraphViewer extends Editor {
  needsDraw = true;
  canvas: HTMLCanvasElement;
  g: CanvasRenderingContext2D | null;
  pan: Vector2;
  scale: number;

  nodeUiMap = new Map<eventgraph.EventNode, NodeUI>();

  constructor() {
    super();

    this.pan = new Vector2();
    this.scale = 1.0;

    this.canvas = document.createElement("canvas");
    this.g = this.canvas.getContext("2d");
  }

  getKeyMaps() {
    return [];
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

  getNodeUI(node: eventgraph.EventNode) {
    let ret = this.nodeUiMap.get(node);
    if (!ret) {
      ret = new NodeUI(node);
      this.nodeUiMap.set(node, ret);
    }

    return ret;
  }

  // BUG FIX: there used to be a second update() below that only called
  // super.update(); being declared last, it silently overrode this draw logic
  // so the editor never redrew. Merged into a single update().
  update() {
    super.update();

    try {
      if (this.needsDraw) {
        this.draw();
      }
    } catch (error) {
      util.print_stack(error as Error);
    }
  }

  draw() {
    if (!this.isConnected) {
      return;
    }

    this.needsDraw = false;
    const { canvas } = this;

    const dpi = UIBase.getDPI();
    const w = ~~(this.size![0] * dpi);
    const h = ~~(this.size![1] * dpi);

    canvas.width = w;
    canvas.height = h;
    canvas.style["width"] = w / dpi + "px";
    canvas.style["height"] = h / dpi + "px";
    canvas.style["padding"] = canvas.style["margin"] = "0px";
  }

  static define() {
    return {
      tagname : "eventgraph-editor-x",
      areaname: "eventgraph",
      uiname  : "Event Graph",
      icon    : -1,
    };
  }
}
Editor.register(EventGraphViewer);
EventGraphViewer.STRUCT =
  nstructjs.STRUCT.inherit(EventGraphViewer, Editor) +
  `
  pan   : vec2;
  scale : float;
}
`;
nstructjs.register(EventGraphViewer);
