import { UIBase } from "../core/ui_base.js";
import { Container, RowFrame } from "../core/ui.js";
import { IContextBase } from "../core/context_base.js";
import { keymap } from "../path-controller/util/events.js";

class ListItem<CTX extends IContextBase = IContextBase> extends RowFrame<CTX> {
  highlight: boolean = false;
  is_active: boolean = false;

  constructor() {
    super();

    const highlight = () => {
      this.highlight = true;
      this.setBackground();
    };

    const unhighlight = () => {
      this.highlight = false;
      this.setBackground();
    };

    this.addEventListener("mouseover", highlight);
    this.addEventListener("mousein" as any, highlight);

    this.addEventListener("mouseleave", unhighlight);
    this.addEventListener("mouseout", unhighlight);
    this.addEventListener("blur", unhighlight);

    const style = document.createElement("style");
    style.textContent = `
      .listitem {
        -moz-user-focus: normal;
        moz-user-focus: normal;
        user-focus: normal;
      }
    `;

    this.shadowRoot!.prepend(style);
  }

  static define() {
    return {
      tagname: "listitem-x",
      style  : "listbox",
    };
  }

  init() {
    super.init();

    this.setAttribute("class", "listitem");

    this.style.width = "100%";
    this.style.height = this.getDefault("ItemHeight") + "px";
    this.style.flexGrow = "unset";

    this.setCSS();
  }

  setBackground() {
    if (this.highlight && this.is_active) {
      this.background = this.getDefault("ListActiveHighlight");
    } else if (this.highlight) {
      this.background = this.getDefault("ListHighlight");
    } else if (this.is_active) {
      this.background = this.getDefault("ListActive");
    } else {
      this.background = this.getDefault("background-color");
    }
  }

  setCSS() {
    super.setCSS();

    this.setBackground();
  }
}

UIBase.internalRegister(ListItem);

interface ListItems<CTX extends IContextBase = IContextBase> extends Array<ListItem<CTX>> {
  active?: ListItem<CTX> | undefined;
}

class ListBox<CTX extends IContextBase = IContextBase> extends Container<CTX> {
  items: ListItems<CTX>;
  idmap: Record<number | string, ListItem<CTX>>;
  highlight: boolean;
  is_active: boolean;

  constructor() {
    super();

    this.items = [];
    this.idmap = {};
    this.items.active = undefined;
    this.highlight = false;
    this.is_active = false;

    const style = document.createElement("style");
    style.textContent = `
      .listbox {
        -moz-user-focus: normal;
        moz-user-focus: normal;
        user-focus: normal;
      }
    `;
    this.shadow.prepend(style);

    this.onkeydown = (e) => {
      switch (e.keyCode) {
        case keymap["Up"]:
        case keymap["Down"]:
          if (this.items.length == 0) return;

          if (this.items.active === undefined) {
            this.setActive(this.items[0]);
            return;
          }

          let i = this.items.indexOf(this.items.active);
          const dir = e.keyCode == keymap["Up"] ? -1 : 1;

          i = Math.max(Math.min(i + dir, this.items.length - 1), 0);
          this.setActive(this.items[i]);

          break;
      }
    };
  }

  static define() {
    return {
      tagname: "listbox-x",
      style  : "listbox",
    };
  }

  setCSS() {
    super.setCSS();
  }

  init() {
    super.init();

    this.setCSS();

    this.style.width = this.getDefault("width") + "px";
    this.style.height = this.getDefault("height") + "px";
    this.style.overflow = "scroll";
  }

  addItem(name: string, id?: number) {
    const item = UIBase.createElement("listitem-x") as ListItem<CTX>;

    item._id = (id === undefined ? this.items.length : id) as any;
    this.idmap[item._id] = item;

    this.tabIndex = 1;
    this.setAttribute("tabindex", "1");

    this.add(item);
    this.items.push(item);

    item.label(name);
    const this2 = this;

    (item as any).onclick = function (this: ListItem<CTX>) {
      this2.setActive(this);
      this.setBackground();
    };

    return item;
  }

  removeItem(item: ListItem<CTX> | number) {
    if (typeof item == "number") {
      item = this.idmap[item];
    }

    item.remove();
    delete this.idmap[(item as any)._id];
    (this.items as any).remove(item);
  }

  setActive(item: ListItem<CTX> | number | undefined) {
    if (typeof item == "number") {
      item = this.idmap[item];
    }

    if (item === this.items.active) {
      return;
    }

    if (this.items.active !== undefined) {
      this.items.active.highlight = false;
      this.items.active.is_active = false;
      this.items.active.setBackground();
    }

    this.items.active = item;

    if (item) {
      item.is_active = true;

      item.setBackground();
      (item as any).scrollIntoViewIfNeeded();
    }

    if (this.onchange) {
      (this.onchange as any)(item ? (item as any)._id : undefined, item);
    }
  }

  clear() {}
}

UIBase.internalRegister(ListBox);
