import * as ui_base from "../core/ui_base.js";
import { IContextBase } from "../core/context_base.js";
import { ColumnFrame, RowFrame, Container, Label } from "../core/ui.js";
import { forwardContainerMethods } from "../core/ui_forward.js";
import { IconCheck } from "./ui_widgets.js";
import { CSSFont } from "../core/cssfont.js";

const UIBase = ui_base.UIBase;
const PackFlags = ui_base.PackFlags;

export class PanelContents<CTX extends IContextBase = IContextBase> extends ColumnFrame<CTX> {
  // set by PanelFrame
  /** @deprecated use panelFrame */
  declare _panel: PanelFrame<CTX>;
  /** Owner PanelFrame<CTX> */
  declare panelFrame: PanelFrame<CTX>;

  get openClosedIcon() {
    return this.panelFrame.openCloseIcon;
  }

  get closed() {
    return this.parentPanel?.closed ?? false;
  }
  set closed(v: boolean) {
    if (this.parentPanel) {
      this.parentPanel.closed = v;
    }
  }
  public get parentPanel() {
    return this.parentWidget as unknown as PanelFrame<CTX> | undefined;
  }
  remove() {
    this.parentWidget!.remove();
  }

  static define() {
    return {
      tagname: "panel-contents-x",
    };
  }
}
UIBase.internalRegister(PanelContents);

export class PanelFrame<CTX extends IContextBase = IContextBase> extends ColumnFrame<CTX> {
  titleframe: RowFrame<CTX>;
  contents: PanelContents<CTX>;
  _iconcheckWidget!: IconCheck<CTX>;
  __label!: Label<CTX>;
  _closed: boolean;
  _state: boolean | undefined;
  _panel: this;

  public get openCloseIcon() {
    return this._iconcheckWidget;
  }

  private createContents() {
    const ret = UIBase.createElement("panel-contents-x") as unknown as PanelContents<CTX>;
    this._container_inherit(ret as unknown as ui_base.UIBase<CTX>);
    this._add(ret as unknown as ui_base.UIBase<CTX>);
    return ret;
  }

  constructor() {
    super();

    this.titleframe = super.row();
    this.contents = this.createContents();
    this.contents._panel = this;
    this.contents.panelFrame = this;

    this._panel = this;

    this._iconcheckWidget = UIBase.createElement("iconcheck-x") as IconCheck<CTX>;
    this._iconcheckWidget.noEmboss = true;

    Object.defineProperty(this.contents, "closed", {
      get: () => {
        return this.closed;
      },

      set: (v) => {
        this.closed = v;
      },
    });

    Object.defineProperty(this.contents, "title", {
      get: () => this.titleframe.getAttribute("title"),
      set: (v) => this.setHeaderToolTip(v),
    });

    this.packflag = this.inherit_packflag = 0;

    this._closed = false;

    this.makeHeader();
  }

  get inherit_packflag(): number {
    super.inherit_packflag;
    if (!this.contents) return 0 as number;
    return this.contents.inherit_packflag;
  }

  set inherit_packflag(val: number) {
    if (!this.contents) return;
    this.contents.inherit_packflag = val;
  }

  get packflag(): number {
    if (!this.contents) return 0 as number;
    return this.contents.packflag;
  }

  set packflag(val: number) {
    if (!this.contents) return;
    this.contents.packflag = val;
  }

  override appendChild<T extends Node>(child: T): T {
    return this.contents.shadow.appendChild(child);
  }

  get headerLabel() {
    return this.__label.text as string;
  }

  set headerLabel(v: string) {
    this.__label.text = v;
    this.__label._updateFont();

    if (this.hasAttribute("label")) {
      this.setAttribute("label", v);
    }

    if (this.ctx) {
      this.setCSS();
    }
  }

  get dataPrefix(): string {
    super.dataPrefix;
    return this.contents ? this.contents.dataPrefix : "";
  }

  set dataPrefix(v: string) {
    if (this.contents) {
      this.contents.dataPrefix = v;
    }
  }

  get closed() {
    return this._closed;
  }

  set closed(val: boolean) {
    const update = !!val !== !!this.closed;
    this._closed = val;

    if (update) {
      this._updateClosed(true);
    }
  }

  static define() {
    return {
      tagname            : "panelframe-x",
      style              : "panel",
      subclassChecksTheme: true,
    };
  }

  setHeaderToolTip(tooltip: string) {
    this.titleframe.setAttribute("title", tooltip);

    this.titleframe._forEachChildWidget((child) => {
      child.setAttribute("title", tooltip);
    });
  }

  saveData() {
    const ret = {
      closed: this._closed,
    };

    return Object.assign(super.saveData(), ret);
  }

  loadData(obj: Record<string, unknown>) {
    if (!("closed" in obj)) {
      this.closed = !!(obj as Record<string, unknown>)._closed;
    } else {
      this.closed = !!obj.closed;
    }
    return this;
  }

  clear() {
    this.contents.clear();
    return this;
  }

  makeHeader() {
    const row = this.titleframe;
    row.overrideClass("panel.header");

    const iconcheck = this._iconcheckWidget;
    if (!iconcheck) {
      return;
    }

    iconcheck.overrideClass("panel.header");

    let headerHeight = this.getDefault<number>("padding-top") + this.getDefault<number>("padding-bottom");
    const font = (this.getDefault<CSSFont>("TitleText") ?? this.getDefault<CSSFont>("DefaultText"))!;
    headerHeight += font.size;

    const iconSize = iconcheck.getSize();
    let padding = (headerHeight - iconSize) / 2;
    iconcheck.overrideDefault("padding", Math.max(padding, 0));
    //iconcheck.noMarginsOrPadding()

    iconcheck.overrideDefault("highlight", {
      "background-color": iconcheck.getSubDefault("highlight", "background-color"),
    });

    iconcheck.overrideDefault("background-color", "rgba(0,0,0,0)");
    iconcheck.overrideDefault("BoxDepressed", "rgba(0,0,0,0)");
    iconcheck.overrideDefault("border-color", "rgba(0,0,0,0)");

    iconcheck.ctx = this.ctx;
    iconcheck._icon_pressed = ui_base.Icons.UI_EXPAND;
    iconcheck._icon = ui_base.Icons.UI_COLLAPSE;
    iconcheck.drawCheck = false;
    iconcheck.iconsheet = ui_base.IconSheets.SMALL;
    iconcheck.checked = this._closed;

    this._iconcheckWidget.onchange = () => {
      this.closed = !!this._iconcheckWidget.checked;
    };

    row._add(iconcheck);

    const onclick = (e: Event) => {
      iconcheck.checked = !iconcheck.checked;

      e.preventDefault();
    };

    this.__label = row.label(this.getAttribute("label") ?? "");
    const label = this.__label;

    this.__label.font = "TitleText";

    label._updateFont();

    label.noMarginsOrPadding();
    label.addEventListener("mousedown", onclick);
    label.addEventListener("touchdown" as keyof HTMLElementEventMap, onclick);

    const bs = this.getDefault("border-style");

    row.background = this.getDefault("TitleBackground") as string;
    row.style.borderRadius = this.getDefault("border-radius") + "px";
    row.style.border = `${this.getDefault("border-width")}px ${bs} ${this.getDefault("border-color")}`;

    row.style.paddingRight = "20px";
    row.style.paddingLeft = "5px";
    row.style.paddingTop = this.getDefault("padding-top") + "px";
    row.style.paddingBottom = this.getDefault("padding-bottom") + "px";
  }

  init() {
    super.init();

    this.background = this.getDefault("background-color") as string;
    this.style.width = "100%";

    this.contents.ctx = this.ctx;
    if (!this._closed) {
      super.add(this.contents);
      this.contents.flushUpdate();
    }

    this.contents.dataPrefix = this.dataPrefix;

    this.setCSS();
  }

  setCSS() {
    super.setCSS();

    if (!this.titleframe || !this.__label) {
      return;
    }

    const getDefault = (key: string, defval: unknown) => {
      const val = this.getDefault(key);
      return val !== undefined ? val : defval;
    };

    const bs = this.getDefault("border-style");

    let header_radius = this.getDefault("HeaderRadius");
    if (header_radius === undefined) {
      header_radius = this.getDefault("border-radius");
    }

    const boxmargin = getDefault("padding", 0) as number;

    let paddingleft = getDefault("padding-left", 0) as number;
    let paddingright = getDefault("padding-right", 0) as number;

    paddingleft += boxmargin;
    paddingright += boxmargin;

    this.titleframe.background = this.getDefault("TitleBackground") as string;
    this.titleframe.style.borderRadius = header_radius + "px";
    this.titleframe.style.border = `${this.getDefault("border-width")}px ${bs} ${this.getDefault("TitleBorder")}`;
    this.style.border = `${this.getDefault("border-width")}px ${bs} ${this.getDefault("border-color")}`;
    this.style.borderRadius = this.getDefault("border-radius") + "px";

    this.titleframe.style.paddingTop = this.getDefault("padding-top") + "px";
    this.titleframe.style.paddingBottom = this.getDefault("padding-bottom") + "px";
    this.titleframe.style.paddingLeft = paddingleft + "px";
    this.titleframe.style.paddingRight = paddingright + "px";
    this.titleframe.style.marginBottom = "0px";
    this.titleframe.style.marginTop = "0px";

    this.__label.style.border = "unset";
    this.__label.style.borderRadius = "unset";

    const bg = this.getDefault("background-color") as string;

    this.background = bg;
    this.contents.background = bg;
    this.contents.parentWidget = this;
    this.contents.style.backgroundColor = bg;
    this.style.backgroundColor = bg;

    let margintop: unknown;
    let marginbottom: unknown;

    if (this._closed) {
      margintop = getDefault("margin-top-closed", 0);
      marginbottom = getDefault("margin-bottom-closed", 5);
    } else {
      margintop = getDefault("margin-top", 0);
      marginbottom = getDefault("margin-bottom", 0);
    }

    const marginleft = getDefault("margin-left", 0);
    const marginright = getDefault("margin-right", 0);

    this.style.marginLeft = marginleft + "px";
    this.style.marginRight = marginright + "px";

    this.style.marginTop = margintop + "px";
    this.style.marginBottom = marginbottom + "px";

    this.__label._updateFont();
  }

  on_disabled() {
    super.on_disabled();

    this.__label._updateFont();
    this.setCSS();
  }

  on_enabled() {
    super.on_enabled();

    this.__label.setCSS();
    this.__label.style.color = this.style.color;
    this.setCSS();
  }

  update() {
    const text = this.getAttribute("label");

    let update = text !== (this.__label.text as string);

    if (this.checkThemeUpdate()) {
      update = true;
      this._setVisible(this.closed, true);
      this.setCSS();
      this.flushSetCSS();
    }

    if (update) {
      this.headerLabel = this.getAttribute("label") ?? "";

      this.__label._updateFont();
      this.setCSS();
    }

    super.update();
  }

  _onchange(isClosed: boolean) {
    if (this.onchange) {
      (this.onchange as Function)(isClosed);
    }

    if (this.contents.onchange) {
      (this.contents.onchange as Function)(isClosed);
    }
  }

  override setAttribute(key: string, value: string) {
    super.setAttribute(key, value);

    if (this.ctx) {
      this.update();
      this.flushUpdate();
    }
  }

  get noUpdateClosedContents() {
    if (!this.hasAttribute("update-closed-contents")) {
      return false;
    }

    const ret = this.getAttribute("update-closed-contents");
    return ret === "true" || ret === "on";
  }

  set noUpdateClosedContents(v: boolean) {
    this.setAttribute("update-closed-contents", v ? "true" : "false");
  }

  _setVisible(isClosed: boolean, changed: boolean) {
    changed = changed || !!isClosed !== !!this._closed;

    this._state = isClosed;

    if (isClosed) {
      this.contents.style.display = "none";

      if (!this.noUpdateClosedContents) {
        this.contents.packflag |= PackFlags.NO_UPDATE;
      }
    } else {
      this.contents.style.display = "flex";
      this.contents.packflag &= ~PackFlags.NO_UPDATE;
      this.contents.flushUpdate();
    }

    this.contents.hidden = isClosed;

    if (this.parentWidget) {
      this.parentWidget.flushUpdate();
    } else {
      this.flushUpdate();
    }

    if (changed) {
      this._onchange(isClosed);
    }
  }

  _updateClosed(changed: boolean) {
    this._setVisible(this._closed, changed);

    if (this._iconcheckWidget) {
      this._iconcheckWidget.checked = this._closed;
    }
  }
}
UIBase.internalRegister(PanelFrame);

// forward container methods to this.contents
forwardContainerMethods(PanelFrame, "contents");
