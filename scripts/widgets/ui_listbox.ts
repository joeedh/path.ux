import { UIBase } from "../core/ui_base";
import { Container, RowFrame } from "../core/ui";
import { IContextBase } from "../core/context_base";
import { keymap } from "../path-controller/util/events";

export class ListItem<
  CTX extends IContextBase = IContextBase,
  IDTYPE extends string | number = string | number,
> extends RowFrame<CTX> {
  highlight: boolean = false;
  is_active: boolean = false;
  declare listId: IDTYPE;

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

export interface ListItems<
  CTX extends IContextBase = IContextBase,
  IDTYPE extends string | number = string | number,
> extends Array<ListItem<CTX, IDTYPE>> {
  active?: ListItem<CTX, IDTYPE> | undefined;
}

export class ListBox<
  CTX extends IContextBase = IContextBase,
  IDTYPE extends string | number = string | number,
> extends Container<CTX> {
  items: ListItems<CTX, IDTYPE>;
  idmap: Record<IDTYPE, ListItem<CTX, IDTYPE>>;
  highlight: boolean;
  is_active: boolean;

  on_change?: (val: IDTYPE | undefined, item: ListItem<CTX, IDTYPE> | undefined) => void;

  constructor() {
    super();

    this.items = [];
    this.idmap = {} as unknown as typeof this.idmap;
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
    const item = UIBase.createElement("listitem-x") as ListItem<CTX, IDTYPE>;

    item.listId = (id === undefined ? this.items.length : id) as any;
    this.idmap[item.listId] = item;

    this.tabIndex = 1;
    this.setAttribute("tabindex", "1");

    this.add(item);
    this.items.push(item);

    item.label(name);
    const this2 = this;

    (item as any).onclick = function (this: ListItem<CTX, IDTYPE>) {
      this2.setActive(this);
      this.setBackground();
    };

    return item;
  }

  removeItem(item: ListItem<CTX, IDTYPE> | IDTYPE) {
    if (typeof item == "number" || typeof item === "string") {
      item = this.idmap[item as IDTYPE];
    }

    item.remove();
    delete this.idmap[item.listId];
    (this.items as any).remove(item);
  }

  setActive(item: ListItem<CTX, IDTYPE> | IDTYPE | undefined) {
    if (typeof item == "number" || typeof item === "string") {
      item = this.idmap[item as IDTYPE];
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

    if (this.on_change) {
      this.on_change(item?.listId, item);
    }
  }

  clear() {}
}

UIBase.internalRegister(ListBox);
