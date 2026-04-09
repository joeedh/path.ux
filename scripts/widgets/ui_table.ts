/* TS-NOTE: Dynamic method generation via makefunc(), Object.defineProperty
 * proxy patterns, DOM element wrapping with ad-hoc interfaces. */

//bind module to global var to get at it in console.
//
//note that require has an api for handling circular
//module refs, in such cases do not use these vars.

import { Container } from "../core/ui";
import { IContextBase } from "../core/context_base";
import { UIBase } from "../core/ui_base";

import * as util from "../path-controller/util/util";

/* Helper for CSSStyleDeclaration string indexing. */
type StyleRecord = CSSStyleDeclaration & Record<string, string>;

const list = util.list;

/** Ad-hoc wrapper around a <tr> element that proxies Container methods. */
export interface TableRowProxy {
  _tr: HTMLTableRowElement;
  style: CSSStyleDeclaration;
  focus(args?: FocusOptions): void;
  blur(): void;
  remove(): void;
  addEventListener(type: string, cb: EventListenerOrEventListenerObject, arg?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, cb: EventListenerOrEventListenerObject, arg?: boolean | EventListenerOptions): void;
  setAttribute(attr: string, val: string): void;
  scrollTo(...args: unknown[]): void;
  scrollIntoView(...args: unknown[]): void;
  clear(): void;
  cell(): Container;
  tabIndex: number;
  background: string;

  /* Dynamically added Container method proxies. */
  label(...args: unknown[]): unknown;
  tool(...args: unknown[]): unknown;
  prop(...args: unknown[]): unknown;
  pathlabel(...args: unknown[]): unknown;
  button(...args: unknown[]): unknown;
  iconbutton(...args: unknown[]): unknown;
  textbox(...args: unknown[]): unknown;
  col(...args: unknown[]): unknown;
  row(...args: unknown[]): unknown;
  table(...args: unknown[]): unknown;
  listenum(...args: unknown[]): unknown;
  check(...args: unknown[]): unknown;
}

export class TableRow<CTX extends IContextBase = IContextBase> extends Container<CTX> {
  declare dom: HTMLTableRowElement;
  declare shadow: ShadowRoot;

  constructor() {
    super();

    this.dom.remove();
    this.dom = document.createElement("tr") as unknown as HTMLTableRowElement;

    //kind of dumb, but this.dom doesn't live within this element itself, bleh
    //this.shadow.appendChild(this.dom);
    this.dom.setAttribute("class", "containerx");
  }

  static define() {
    return {
      tagname: "tablerow-x",
    };
  }

  _add(child: UIBase<CTX>) {
    child.ctx = this.ctx;
    child.parentWidget = this;

    const td = document.createElement("td");
    td.appendChild(child);

    this.dom.appendChild(td);
    child.onadd();
    return child;
  }
}
UIBase.internalRegister(TableRow);

export class TableFrame<CTX extends IContextBase = IContextBase> extends Container<CTX> {
  declare dom: HTMLTableElement;

  constructor() {
    super();

    this.dom = document.createElement("table") as unknown as HTMLTableElement;
    this.shadow.appendChild(this.dom);
    this.dom.setAttribute("class", "containerx");

    //this.dom.style["display"] = "block";
  }

  update() {
    //this.style["display"] = "inline-block";
    super.update();
  }

  _add(child: UIBase<CTX>) {
    child.ctx = this.ctx;
    child.parentWidget = this;
    this.dom.appendChild(child);
    child.onadd();
    return child;
  }

  add(child: UIBase<CTX>) {
    return this._add(child);
  }

  row(packflag?: number): any {
    // Returns TableRowProxy but typed as any to work around base class covariance
    // packflag parameter is ignored for table rows
    const tr = document.createElement("tr");
    let cls = "table-tr";

    tr.setAttribute("class", cls);
    this.dom.appendChild(tr);
    const this2 = this;

    function maketd() {
      const td = document.createElement("td");
      tr.appendChild(td);

      (td.style as StyleRecord)["margin"] = (tr.style as StyleRecord)["margin"];
      (td.style as StyleRecord)["padding"] = (tr.style as StyleRecord)["padding"];

      const container = UIBase.createElement("rowframe-x") as Container<CTX>;

      container.ctx = this2.ctx;
      container.parentWidget = this2;
      container.setAttribute("class", cls);

      td.setAttribute("class", cls);
      td.appendChild(container);

      return container;
    }

    //hrm wish I could subclass html elements easier
    const ret: TableRowProxy = {
      _tr: tr,

      style: tr.style,

      focus(args?: FocusOptions) {
        tr.focus(args);
      },

      blur() {
        tr.blur();
      },

      remove: () => {
        tr.remove();
      },

      addEventListener(type: string, cb: EventListenerOrEventListenerObject, arg?: boolean | AddEventListenerOptions) {
        tr.addEventListener(type, cb, arg);
      },

      removeEventListener(type: string, cb: EventListenerOrEventListenerObject, arg?: boolean | EventListenerOptions) {
        tr.removeEventListener(type, cb, arg);
      },

      setAttribute(attr: string, val: string) {
        if (attr == "class") {
          cls = val;
        }

        tr.setAttribute(attr, val);
      },

      scrollTo(...args: unknown[]) {
        return (tr.scrollTo as Function).apply(tr, args);
      },

      scrollIntoView(...args: unknown[]) {
        return (tr.scrollIntoView as Function).apply(tr, args);
      },

      clear() {
        for (const node of list(tr.childNodes)) {
          tr.removeChild(node);
        }
      },

      /* These are filled in below by makefunc / defineProperty / cell lambda */
      cell      : undefined!,
      tabIndex  : 0,
      background: "",
      label     : undefined!,
      tool      : undefined!,
      prop      : undefined!,
      pathlabel : undefined!,
      button    : undefined!,
      iconbutton: undefined!,
      textbox   : undefined!,
      col       : undefined!,
      row       : undefined!,
      table     : undefined!,
      listenum  : undefined!,
      check     : undefined!,
    } as TableRowProxy;

    function makefunc(f: string) {
      (ret as unknown as Record<string, unknown>)[f] = function () {
        const container = maketd();

        container.background = (tr.style as StyleRecord)["background-color"]; //"rgba(0,0,0,0)";
        return (container as unknown as Record<string, Function>)[f].apply(container, arguments);
      };
    }

    let _bg = "";

    //need to implement proper proxy here!
    Object.defineProperty(ret, "tabIndex", {
      set(f: number) {
        tr.tabIndex = f;
      },

      get() {
        return tr.tabIndex;
      },
    });

    Object.defineProperty(ret, "background", {
      set(bg: string) {
        _bg = bg;
        (tr.style as StyleRecord)["background-color"] = bg;

        for (const node of tr.childNodes) {
          if (node.childNodes.length > 0) {
            (node.childNodes[0] as unknown as Record<string, unknown>).background = bg;
            ((node as HTMLElement).style as StyleRecord)["background-color"] = bg;
          }
        }
      },
      get() {
        return _bg;
      },
    });

    /*
    Object.defineProperty(ret, "class", {
      set(bg) {
        tr.class = bg;
      }
    });//*/

    ret.cell = (() => {
      const container = maketd();
      container.background = (tr.style as StyleRecord)["background-color"];
      return container as unknown as Container;
    }) as () => Container;

    //makefunc("cell");
    makefunc("label");
    makefunc("tool");
    makefunc("prop");
    makefunc("pathlabel");
    makefunc("button");
    makefunc("iconbutton");
    makefunc("textbox");
    makefunc("col");
    makefunc("row");
    makefunc("table");
    makefunc("listenum");
    makefunc("check");

    return ret;
  }

  clear() {
    super.clear();
    for (const child of list(this.dom.childNodes)) {
      child.remove();
    }
  }

  static define() {
    return {
      tagname: "tableframe-x",
    };
  }
}
UIBase.internalRegister(TableFrame);
