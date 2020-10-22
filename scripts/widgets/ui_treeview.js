import '../util/ScreenOverdraw.js';
import {UIBase, Icons} from '../core/ui_base.js';
import {Container} from '../core/ui.js';
import {pushModalLight, popModalLight, keymap} from '../util/simple_events.js';
import {parsepx} from '../core/ui_theme.js';
import {Vector2} from '../util/vectormath.js';
import * as math from '../util/math.js';

export class TreeItem extends Container {
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
      }  else {
        this.open();
      }
    }

    this.opened = true;

    this._label = this.header.label("unlabeled");
    this._labelText = "unlabeled";
  }

  set icon(id) {
    if (this._icon2) {
      this._icon2 = id;
    } else {
      this._icon2 = UIBase.createElement("icon-label-x");
      this._icon2.icon = id;
      this._icon2.iconsheet = 0;


      this.header.insert(1, this._icon2);
    }
  }

  get icon() {
    if (this._icon2)
      return this._icon2.icon;
    else
      return -1;
  }

  open() {
    this._icon1.icon = Icons.TREE_COLLAPSE;
    this.opened = true;
    this.treeView._open(this);
  }

  close() {
    this._icon1.icon = Icons.TREE_EXPAND;
    this.opened = false;
    this.treeView._close(this);
  }

  set text(b) {
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

  get text() {
    return this._labelText;
  }


  item(name, args={}) {
    args.treeParent = this;
    return this.parentWidget.item(name, args);
  }

  init() {
    super.init();
  }

  static define() {return {
    tagname : "tree-item-x",
    style   : "treeview"
  }}
}
UIBase.internalRegister(TreeItem);

export class TreeView extends Container {
  constructor() {
    super();

    this.items = [];
    this.strokes = [];
  }

  init() {
    super.init();

    this.style["display"] = "flex";
    this.style["flex-direction"] = "column";

    //this.shadow.appendChild(this.overdraw);

    this.overdraw = UIBase.createElement("overdraw-x");
    console.log(this.overdraw.startNode);
    this.overdraw.startNode(this);

    this.style["margin"] = this.style["padding"] = "0px";

    this.updateOverdraw();
  }

  _forAllChildren(item, cb) {
    let visit = (n) => {
      cb(n);

      for (let c of n.treeChildren) {
        visit(c);
      }
    }

    for (let c of item.treeChildren) {
      visit(c);
    }
  }

  _open(item) {
    this._forAllChildren(item, (c) => {
      if (c.opened) {
        c.unhide();
      }
    })

    this._makeStrokes();
  }

  _close(item) {
    this._forAllChildren(item, (c) => {
      c.hide();
    })

    this._makeStrokes();
  }

  _makeStrokes() {
    if (!this.overdraw) {
      //this.doOnce(this._makeStrokes);
      return;
    }

    for (let elem of this.strokes) {
      elem.remove();
    }
    this.strokes.length = 0;

    let hidden = (item) => {
      return item.hidden;
      let p = item;

      while (p) {
        if (!p.opened)
          return true;
        p = p.treeParent;
      }

      return false;
    }

    let items = this.items;
    if (items.length == 0) {
      return;
    }

    this.overdraw.clear();

    let next = (i) => {
      i++;

      while (i < items.length && hidden(items[i])) {
        i++;
        continue;
      }

      return i;
    }

    let i = 0;
    if (hidden(items[i]))
      i = next(i);

    let origin = this.overdraw.getBoundingClientRect();
    let overdraw = this.overdraw;

    let line = function(x1, y1, x2, y2) {
      let ox = origin.x, oy = origin.y;

      x1 -= ox; y1 -= oy;
      x2 -= ox; y2 -= oy;

      overdraw.line([x1, y1], [x2, y2]);
    }

    console.log("making lines", i);

    let indent = this.getDefault("itemIndent");
    let rowh = this.getDefault("rowHeight");

    let getx = (depth) => {
      return (depth+2.2)*indent + origin.x;
    }

    this.overdraw.style["z-index"] = "0";

    let prev = undefined;

    for (; i<items.length; i = next(i)) {
      let item = this.items[i];
      let item2 = next(i);
      item2 = item2 < items.length ? items[item2] : undefined;

      let r = item._icon1.getBoundingClientRect();

      if (!r) continue;

      let x1 = getx(item.treeDepth);
      let y1 = origin.y + (i+1)*rowh - rowh*0.25;


      if (item2 && item2.treeDepth > item.treeDepth) {//} && (!prev || prev.treeDepth !== item.treeDepth)) {
        let y2 = y1 + rowh*0.75;

        line(x1, y1, x1, y2)
        line(x1, y2, getx(item2.treeDepth)-3, y2);

      } else if (item2 && item2.treeDepth === item.treeDepth) {
        line(x1, y1, x1, y1+rowh*0.5)
      }

      prev = item;
    }
  }

  updateOverdraw() {
    let mm = new math.MinMax(2);
    let ok = false;

    for (let item of this.items) {
      if (item.hidden) {
        //continue;
      }

      for (let r of item.getClientRects()) {
        //console.log(r.y);
        mm.minmax([r.x, r.y]);
        mm.minmax([r.x+r.width, r.y+r.height]);
        ok = true;
      }
    }

    if (!ok) {
      return;
    }

    let r = this.getClientRects()[0];
    if (!r) return;

    let x = r.left;
    let y = r.top;// - r.y;

    let od = this.overdraw;
    let w = mm.max[0] - mm.min[0];
    let h = mm.max[1] - mm.min[1];

    od.style["margin"] = "0px";
    od.style["padding"] = "0px";
    od.svg.style["margin"] = "0px";

    od.style["position"] = "fixed";

    od.style["width"] = (r.width-1) + "px";
    od.style["height"] = (r.height-1) + "px";

    od.style["left"] = x + "px";
    od.style["top"] =  y + "px";

    //od.style["background-color"] = "rgba(50, 50, 50, 0.25)";
    //od.svg.style["background-color"] = "rgba(50, 50, 50, 0.25)";

  }

  update() {
    super.update();

    this.updateOverdraw();
  }

  item(name, args={icon : undefined}) {
    let ret = UIBase.createElement("tree-item-x");
    this.add(ret);
    ret._init();

    ret.text = name;

    if (args.icon) {
      ret.icon = args.icon;
    }

    ret.treeParent = args.treeParent;
    ret.treeView = this;

    //ret.style["margin-bottom"] = ret.style["margin-top"] = "0px";
    //ret.style["padding-bottom"] = ret.style["padding-top"] = "0px";
    ret.style["max-height"] = this.getDefault("rowHeight") + "px";

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

    ret.style["margin-left"] = (i*this.getDefault("itemIndent")) + "px";
    this.items.push(ret);

    this.doOnce(() => {
      this._makeStrokes();
    });

    return ret;
  }

  static define() {return {
    tagname : "tree-view-x",
    style   : "treeview"
  }}
}
UIBase.internalRegister(TreeView);

