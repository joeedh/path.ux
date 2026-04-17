import "../util/ScreenOverdraw";
import { UIBase, Icons } from "../core/ui_base";
import { Container } from "../core/ui";
import { IContextBase } from "../core/context_base";
import * as math from "../path-controller/util/math";

export class TreeItem<CTX extends IContextBase = IContextBase> extends Container<CTX> {
  treeParent: TreeItem<CTX> | undefined;
  treeChildren: TreeItem<CTX>[];
  treeView: TreeView<CTX> | undefined;
  treeDepth: number;
  header: any;
  _icon1: any;
  _icon2: any;
  opened: boolean;
  _label: any;
  _labelText: string | HTMLElement;

  constructor() {
    super();

    this.treeParent = undefined;
    this.treeChildren = [];
    this.treeView = undefined;
    this.treeDepth = 0;

    this.header = this.row();

    this._icon1 = this.header.iconbutton(Icons.TREE_COLLAPSE);
    this._icon1.iconsheet = 0;
    this._icon1.drawButtonBG = false;

    this._icon2 = undefined;

    this._icon1.onclick = () => {
      if (this.opened) {
        this.close();
      } else {
        this.open();
      }
    };

    this.opened = true;

    this._label = this.header.label("unlabeled");
    this._labelText = "unlabeled";
  }

  set icon(id: number) {
    if (this._icon2) {
      this._icon2 = id;
    } else {
      this._icon2 = UIBase.createElement("icon-label-x");
      this._icon2.icon = id;
      this._icon2.iconsheet = 0;

      this.header.insert(1, this._icon2);
    }
  }

  get icon(): number {
    if (this._icon2) return this._icon2.icon;
    else return -1;
  }

  open() {
    this._icon1.icon = Icons.TREE_COLLAPSE;
    this.opened = true;
    this.treeView!._open(this);
  }

  close() {
    this._icon1.icon = Icons.TREE_EXPAND;
    this.opened = false;
    this.treeView!._close(this);
  }

  set text(b: string | HTMLElement) {
    if (typeof b === "string") {
      this._label.text = b;
      this._labelText = b;
    } else if (b instanceof HTMLElement) {
      this._label.remove();
      this.header.add(b);

      this._label = b;
      this._labelText = b;
    }
  }

  get text(): string | HTMLElement {
    return this._labelText;
  }

  item(name: string, args: any = {}) {
    args.treeParent = this;
    return (this.parentWidget as any).item(name, args);
  }

  init() {
    super.init();
  }

  static define() {
    return {
      tagname: "tree-item-x",
      style  : "treeview",
    };
  }
}
UIBase.internalRegister(TreeItem);

export class TreeView<CTX extends IContextBase = IContextBase> extends Container<CTX> {
  items: TreeItem<CTX>[];
  strokes: any[];
  overdraw: any;

  constructor() {
    super();

    this.items = [];
    this.strokes = [];
  }

  init() {
    super.init();

    this.style.display = "flex";
    this.style.flexDirection = "column";

    this.overdraw = UIBase.createElement("overdraw-x");
    console.log(this.overdraw.startNode);
    this.overdraw.startNode(this);

    this.style.margin = this.style.padding = "0px";

    this.updateOverdraw();
  }

  _forAllChildren(item: TreeItem<CTX>, cb: (n: TreeItem<CTX>) => void) {
    const visit = (n: TreeItem<CTX>) => {
      cb(n);

      for (const c of n.treeChildren) {
        visit(c);
      }
    };

    for (const c of item.treeChildren) {
      visit(c);
    }
  }

  _open(item: TreeItem<CTX>) {
    this._forAllChildren(item, (c) => {
      if (c.opened) {
        c.unhide();
      }
    });

    this._makeStrokes();
  }

  _close(item: TreeItem<CTX>) {
    this._forAllChildren(item, (c) => {
      c.hide();
    });

    this._makeStrokes();
  }

  _makeStrokes() {
    if (!this.overdraw) {
      return;
    }

    for (const elem of this.strokes) {
      elem.remove();
    }
    this.strokes.length = 0;

    const hidden = (item: TreeItem<CTX>) => {
      return item.hidden;
    };

    const items = this.items;
    if (items.length == 0) {
      return;
    }

    this.overdraw.clear();

    const next = (i: number) => {
      i++;

      while (i < items.length && hidden(items[i])) {
        i++;
      }

      return i;
    };

    let i = 0;
    if (hidden(items[i])) i = next(i);

    const origin = this.overdraw.getBoundingClientRect();
    const overdraw = this.overdraw;

    const line = function (x1: number, y1: number, x2: number, y2: number) {
      const ox = origin.x;
      const oy = origin.y;

      x1 -= ox;
      y1 -= oy;
      x2 -= ox;
      y2 -= oy;

      overdraw.line([x1, y1], [x2, y2]);
    };

    console.log("making lines", i);

    const indent = this.getDefault("itemIndent") as number;
    const rowh = this.getDefault("rowHeight") as number;

    const getx = (depth: number) => {
      return (depth + 2.2) * indent + origin.x;
    };

    this.overdraw.style.zIndex = "0";

    let prev: TreeItem<CTX> | undefined = undefined;

    for (; i < items.length; i = next(i)) {
      const item = this.items[i];
      const item2idx = next(i);
      const item2: TreeItem<CTX> | undefined =
        item2idx < items.length ? items[item2idx] : undefined;

      const r = item._icon1.getBoundingClientRect();

      if (!r) continue;

      const x1 = getx(item.treeDepth);
      const y1 = origin.y + (i + 1) * rowh - rowh * 0.25;

      if (item2 && item2.treeDepth > item.treeDepth) {
        const y2 = y1 + rowh * 0.75;

        line(x1, y1, x1, y2);
        line(x1, y2, getx(item2.treeDepth) - 3, y2);
      } else if (item2?.treeDepth === item.treeDepth) {
        line(x1, y1, x1, y1 + rowh * 0.5);
      }

      prev = item;
    }
  }

  updateOverdraw() {
    const mm = new math.MinMax(2);
    let ok = false;

    for (const item of this.items) {
      for (const r of item.getClientRects()) {
        mm.minmax([r.x, r.y]);
        mm.minmax([r.x + r.width, r.y + r.height]);
        ok = true;
      }
    }

    if (!ok) {
      return;
    }

    const r = this.getClientRects()[0];
    if (!r) return;

    const x = r.left;
    const y = r.top;

    const od = this.overdraw;
    const w = (mm.max as any)[0] - (mm.min as any)[0];
    const h = (mm.max as any)[1] - (mm.min as any)[1];

    od.style.margin = "0px";
    od.style.padding = "0px";
    od.svg.style.margin = "0px";

    od.style.position = UIBase.PositionKey;

    od.style.width = r.width - 1 + "px";
    od.style.height = r.height - 1 + "px";

    od.style.left = x + "px";
    od.style.top = y + "px";
  }

  update() {
    super.update();

    this.updateOverdraw();
  }

  item(name: string, args: { icon?: number; treeParent?: TreeItem<CTX> } = {}) {
    const ret = UIBase.createElement("tree-item-x") as TreeItem<CTX>;
    this.add(ret);
    ret._init();

    ret.text = name;

    if (args.icon) {
      ret.icon = args.icon;
    }

    ret.treeParent = args.treeParent;
    ret.treeView = this;

    ret.style.maxHeight = this.getDefault("rowHeight") + "px";

    if (ret.treeParent) {
      ret.treeParent.treeChildren.push(ret);
      ret.treeDepth = ret.treeParent.treeDepth + 1;
    }

    let p = ret.treeParent;
    let i = 1;
    while (p) {
      p = p.treeParent;
      i++;
    }

    ret.style.marginLeft = i * (this.getDefault("itemIndent") as number) + "px";
    this.items.push(ret);

    this.doOnce(() => {
      this._makeStrokes();
    });

    return ret;
  }

  static define() {
    return {
      tagname: "tree-view-x",
      style  : "treeview",
    };
  }
}
UIBase.internalRegister(TreeView);
