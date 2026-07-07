import type { Screen } from "./FrameManager";

import { loadUIData, saveUIData, UIBase } from "../core/ui_base";
import { Container } from "../core/ui";

import * as util from "../path-controller/util/util";
import { haveModal } from "../path-controller/util/simple_events";
import cconst from "../config/const";
import nstructjs from "../path-controller/util/struct";
import { BORDER_ZINDEX_BASE, ScreenBorder, ScreenBorderAny, snap } from "./FrameManager_mesh";
import { contextWrangler } from "./area_wrangler";
import { IsScreenTag } from "./constants";
import { IContextBase } from "../core/context_base";
import { Vector2 } from "../pathux";
import { StructReader } from "../util/nstructjs";
import type { KeyMap } from "../path-controller/util/simple_events";
import type { AreaDocker } from "./AreaDocker";
import { PanelManager, PanelLayoutState, IPanelHost } from "./dock_panels";
import {
  areaclasses,
  IAreaConstructor,
  AreaConstructorParam,
  AreaFlags,
  makeAreasEnum,
} from "./area_base";

export interface IAreaDef {
  tagname: string;
  /** used by buildEditorsAPI, if it doesn't exit areaname will be used */
  apiname?: string;
  areaname: string;
  flag?: number;
  uiname?: string;
  icon?: number;
  borderLock?: number;
}

/** Is obj an instance of Screen */
function isScreen<CTX extends IContextBase = IContextBase>(obj: unknown): obj is Screen<CTX> {
  return typeof obj === "object" && obj !== null && IsScreenTag in obj;
}

export { AreaFlags };
export * from "./area_wrangler";
export { contextWrangler };

window._contextWrangler = contextWrangler;

export const BorderMask = {
  LEFT  : 1,
  BOTTOM: 2,
  RIGHT : 4,
  TOP   : 8,
  ALL   : 1 | 2 | 4 | 8,
};

export const BorderSides = {
  LEFT  : 0,
  BOTTOM: 1,
  RIGHT : 2,
  TOP   : 3,
};

Symbol.IsAreaTag = Symbol.for("IsAreaTag");

/**
 * Base class for all editors
 **/
export class Area<CTX extends IContextBase = IContextBase> extends UIBase<CTX, unknown, "Area"> {
  static STRUCT: string;

  // used to avoid circular module ref with UIBase
  [Symbol.IsAreaTag] = true;
  borderLock: number;
  flag: number;
  pos?: Vector2;
  size?: Vector2;
  inactive: boolean;
  /** When false the editor cannot be ripped out of its ScreenArea by
   *  dragging its tab off the AreaDocker tab bar (see AreaDocker.detach). */
  areaDragToolEnabled: boolean;
  owning_sarea: ScreenArea<CTX> | undefined;
  _area_id: number;
  minSize: (number | undefined)[];
  maxSize: (number | undefined)[];
  keymap?: KeyMap<CTX>;
  header: Container<CTX> | undefined;
  /** Notifications area. */
  noteArea?: UIBase<CTX>;
  /** Header row the owning ScreenArea's shared AreaDocker is adopted into
   *  while this editor is active (see ScreenArea._attachSwitcher). */
  _switcherRow?: Container<CTX>;
  helppicker: (UIBase<CTX> & { iconsheet?: number }) | undefined;
  saved_uidata: string | undefined;
  areaName: string | undefined;
  /** Dockable-panel manager, created by makePanels() for editors that
   *  implement definePanels(). */
  panels?: PanelManager<CTX>;
  /** Deserialized panel layout awaiting makePanels() (see Area.STRUCT). */
  panelLayout?: PanelLayoutState;
  /** When false, interactive panel-layout editing (drag/dock/float/close)
   *  is disabled and the programmatic layout is authoritative. */
  panelLayoutEditable = true;
  dead = false;
  /** Soft-close flag. Closed editors are hidden from the AreaDocker tab bar
   *  but stay in `ScreenArea.editors` / `editormap`, so their UI state is
   *  preserved and a `switchEditor` call restores them as-is. Roundtripped
   *  through nstructjs via `Area.STRUCT`. */
  closed = false;

  constructor() {
    super();

    /**
     * -----b4----
     *
     * b1       b3
     *
     * -----b2----
     *
     * */

    const def = this.constructor.define() as any;

    //set bits in mask to keep
    //borders from moving
    this.borderLock = def.borderLock ?? 0;
    this.flag = def.flag || 0;

    this.inactive = true;
    this.areaDragToolEnabled = true;

    this.owning_sarea = undefined;
    this._area_id = contextWrangler.idgen++;

    this.pos = undefined; //set by screenarea parent
    this.size = undefined; //set by screenarea parent
    this.minSize = [5, 5];
    this.maxSize = [undefined, undefined];

    const appendChild = this.shadow.appendChild.bind(this.shadow);
    this.shadow.appendChild = <T extends Node>(child: T): T => {
      appendChild(child);
      if (child instanceof UIBase) {
        child.parentWidget = this as unknown as typeof child.parentWidget;
      }
      return child;
    };

    const prepend = this.shadow.prepend.bind(this.shadow);
    this.shadow.prepend = (child: Node | string) => {
      prepend(child);

      if (child instanceof UIBase) {
        child.parentWidget = this as unknown as typeof child.parentWidget;
      }
    };
  }

  get floating() {
    return ~~(this.flag & AreaFlags.FLOATING);
  }

  set floating(val) {
    if (val) {
      this.flag |= AreaFlags.FLOATING;
    } else {
      this.flag &= ~AreaFlags.FLOATING;
    }
  }

  /**
   * Get active area as defined by push_ctx_active and pop_ctx_active.
   *
   * Type should be an Area subclass, if undefined the last accessed area
   * will be returned.
   * */
  static getActiveArea(type?: AreaConstructorParam) {
    return contextWrangler.getLastArea(type);
  }

  static unregister(cls: AreaConstructorParam) {
    const def = cls.define();

    if (!def.areaname) {
      throw new Error("Missing areaname key in define()");
    }

    if (def.areaname in areaclasses) {
      delete areaclasses[def.areaname];
    }

    UIBase.unregister(cls);
  }

  /*
  addEventListener(type, cb, options) {
    let cb2 = (e) => {
      let x, y;
      let screen = this.getScreen();

      if (!screen) {
        console.warn("no screen!");
        return cb(elem);
      }

      if (type.startsWith("mouse")) {
        x = e.x; y = e.y;
      } else if (type.startsWith("touch") && e.touches && e.touches.length > 0) {
        x = e.touches[0].pageX; y = e.touches[0].pageY;
      } else if (type.startsWith("pointer")) {
        x = e.x; y = e.y;
      } else {
        if (screen) {
          x = screen.mpos[0];
          y = screen.mpos[1];
        } else {
          x = y = -100;
        }
      }

      let elem = screen.pickElement(x, y);
      console.log(elem ? elem.tagName : undefined);

      if (elem === this || elem === this.owning_sarea) {
        return cb(elem);
      }
    };

    cb.__cb2 = cb2;
    return super.addEventListener(type, cb2, options);
  }

  removeEventListener(type, cb, options) {
    super.removeEventListener(type, cb.__cb2, options);
  }
  //*/

  static register(_cls: any, isInternal = true) {
    const cls = _cls as unknown as IAreaConstructor;
    const def = cls.define();

    if (!def.areaname) {
      throw new Error("Missing areaname key in define()");
    }

    areaclasses[def.areaname] = cls;

    if (isInternal) {
      UIBase.internalRegister(cls as unknown as typeof UIBase);
    } else {
      UIBase.register(cls as unknown as typeof UIBase);
    }
  }

  static makeAreasEnum() {
    return makeAreasEnum();
  }

  static getAreaName<CTX extends IContextBase = IContextBase>(area: Area<CTX>) {
    return (area.constructor as any).define().areaname as string;
  }

  static define(): IAreaDef {
    return {
      tagname   : "pathux-editor-x",
      areaname  : "",
      flag      : 0,
      uiname    : undefined,
      icon      : undefined,
      borderLock: undefined,
    };
  }

  static newSTRUCT() {
    return UIBase.createElement(this.define().tagname);
  }

  init() {
    super.init();

    this.style["overflow"] = "hidden";
    this.noMarginsOrPadding();

    const onover = (e: Event) => {
      //try to trigger correct entry in context area stacks
      this.push_ctx_active();
      this.pop_ctx_active();
    };

    //*
    super.addEventListener("mouseover", onover, { passive: true });
    super.addEventListener("mousemove", onover, { passive: true });
    super.addEventListener("mousein", onover, { passive: true });
    super.addEventListener("mouseenter", onover, { passive: true });
    super.addEventListener("touchstart", onover, { passive: true });
    super.addEventListener("focusin", onover, { passive: true });
    super.addEventListener("focus", onover, { passive: true });
    //*/
  }

  _get_v_suffix() {
    if (this.flag & AreaFlags.INDEPENDENT) {
      return this._id;
    } else {
      return "";
    }
  }

  /**
   * Return a list of keymaps used by this editor
   */
  getKeyMaps() {
    return this.keymap !== undefined ? [this.keymap] : [];
  }

  on_fileload(isActiveEditor: boolean) {
    contextWrangler.reset();
  }

  buildDataPath() {
    const sarea = this.owning_sarea;

    if (sarea?.screen === undefined) {
      console.warn("Area.buildDataPath(): Failed to build data path");
      return "";
    }

    const screen = sarea.screen;

    const idx1 = screen.sareas.indexOf(sarea);
    const idx2 = sarea.editors.indexOf(this as Area<CTX>);

    if (idx1 < 0 || idx2 < 0) {
      throw new Error("malformed area data");
    }

    return `screen.sareas[${idx1}].editors[${idx2}]`;
  }

  saveData() {
    return {
      _area_id: this._area_id,
      areaName: this.areaName,
    };
  }

  override loadData(obj: Record<string, unknown>) {
    const id = obj._area_id as number | undefined;

    if (id !== undefined && id !== null) {
      this._area_id = id;
    }

    return this;
  }

  draw() {}

  copy() {
    console.warn("You might want to implement this, Area.prototype.copy based method called");
    const ret = UIBase.createElement(this.constructor.define().tagname);
    return ret;
  }

  override on_resize(size: number[] | Vector2) {
    super.on_resize(size);
  }

  on_area_focus() {}

  on_area_blur() {}

  /** called when editors are swapped with another editor type.
   *  overrides should call super so floating dock panels track activation. */
  on_area_active() {
    this.panels?._hostShown();
  }

  /** called when editors are swapped with another editor type.
   *  overrides should call super so floating dock panels track activation. */
  on_area_inactive() {
    this.panels?._hostHidden();
  }

  /*
   * This is needed so UI controls can know what their parent area is.
   * For example, a slider with data path "view2d.zoomfac" needs to know where
   * to find view2d.
   *
   * Typically this works by adding a field to a ContextOverlay:
   *
   * class ContextOverlay {
   *   get view3d() {
   *     return Area.getActiveArea(View3D);
   *   }
   * }
   *
   * Make sure to wrap event callbacks in push_ctx_active and pop_ctx_active.
   * */
  push_ctx_active(dontSetLastRef = false) {
    contextWrangler.updateLastRef(this.constructor, this as unknown as Area);
    contextWrangler.push(this.constructor, this as unknown as Area, !dontSetLastRef);
  }

  /**
   * see push_ctx_active
   * */
  pop_ctx_active(dontSetLastRef = false) {
    contextWrangler.pop(this.constructor, this as unknown as Area);
  }

  override getScreen(): Screen | undefined {
    throw new Error("replace me in Area.prototype");
  }

  toJSON() {
    return Object.assign(super.toJSON(), {
      areaname: (this.constructor as any).define().areaname as string,
      _area_id: this._area_id,
    });
  }

  loadJSON(obj: Record<string, unknown>) {
    super.loadJSON(obj);
    this._area_id = obj._area_id as number;

    return this;
  }

  getBarHeight() {
    return this.header!.getClientRects()[0].height;
  }

  /** The tab switcher this editor currently adopts from its owning
   *  ScreenArea (which owns the single AreaDocker instance per tile).
   *  Undefined while the editor is inactive or detached. */
  get switcher(): AreaDocker<CTX> | undefined {
    return this.owning_sarea?.switcher;
  }

  makeAreaSwitcher(container: Container<CTX>) {
    const ret = UIBase.createElement("area-docker-x") as AreaDocker<CTX>;
    container.add(ret);
    return ret;
  }

  makeHeader(container: Container<CTX>, addNoteArea = true) {
    let switcherRow: Container<CTX> | undefined;
    let row: Container<CTX>;
    let helpRow: Container<CTX>;

    if (this.header) {
      this.header.remove();
      this.header = undefined;
    }

    if (!(this.flag & AreaFlags.NO_SWITCHER)) {
      const col = (this.header = container.col());

      switcherRow = helpRow = col.row();
      row = col.row();
    } else {
      row = helpRow = this.header = container.row();
    }

    if (!(this.flag & AreaFlags.NO_HEADER_CONTEXT_MENU)) {
      const callmenu = ScreenBorder.bindBorderMenu(this.header!, true);

      this.addEventListener("mousedown", (e: MouseEvent) => {
        if (e.button !== 2 || this.header!.pickElement(e.x, e.y) !== this.header) {
          return;
        }

        callmenu(e);
      });
    }

    this.header!.remove();
    container._prepend(this.header!);

    row.setCSSAfter(() => (row.background = this.getDefault("AreaHeaderBG")));

    container.noMarginsOrPadding();
    row.noMarginsOrPadding();

    row.style["width"] = "100%";
    row.style["margin"] = "0px";
    row.style["padding"] = "0px";

    if (!(this.flag & AreaFlags.NO_SWITCHER)) {
      this._switcherRow = switcherRow!;
      this.owning_sarea?._attachSwitcher(this);
    }

    if (util.isMobile() || cconst.addHelpPickers) {
      if (this.helppicker) {
        this.helppicker.remove();
      }

      this.helppicker = helpRow.helppicker() as UIBase<CTX> & { iconsheet?: number };
      this.helppicker!.iconsheet = 0;
    }

    if (addNoteArea) {
      const notef = UIBase.createElement("noteframe-x") as UIBase<CTX>;
      notef.ctx = this.ctx;
      this.noteArea = notef;
      row._add(notef);
    }

    return row;
  }

  setCSS() {
    if (this.size !== undefined) {
      this.style["position"] = UIBase.PositionKey;
      //this.style["left"] = this.pos[0] + "px";
      //this.style["top"] = this.pos[1] + "px";
      this.style["width"] = this.size[0] + "px";
      this.style["height"] = this.size[1] + "px";
    }
  }

  update() {
    //don't update non-active editors
    if (this !== this.owning_sarea?.area) {
      return;
    }

    super.update();

    //see FrameManager.js, we use a single update
    //function for everything now
    //this._forEachChildWidget((n) => {
    //  n.update();
    //});
  }

  loadSTRUCT(reader: StructReader<this>) {
    reader(this);
  }

  _isDead() {
    if (this.dead) {
      return true;
    }

    const screen = this.getScreen();

    if (screen === undefined) return true;

    if (screen.parentNode === undefined) return true;
  }

  //called by owning ScreenArea on file load
  afterSTRUCT() {
    const f = () => {
      if (this._isDead()) {
        return;
      }
      if (!this.ctx) {
        this.doOnce(f);
        return;
      }

      try {
        loadUIData(this as unknown as UIBase, this.saved_uidata);
        this.saved_uidata = undefined;
      } catch (error) {
        console.log("failed to load ui data");
        util.print_stack(error as Error);
      }
    };

    this.doOnce(f);
  }

  _getSavedUIData() {
    return saveUIData(this as unknown as UIBase, "area");
  }

  /**
   * Optional hook: editors with dockable panels implement this to declare
   * their panel catalog and default layout (see PanelManager.panel), then
   * call makePanels() from init().
   */
  definePanels?(panels: PanelManager<CTX>): void;

  /**
   * Build the dock-panel frame inside `container` and return the center
   * content container.  Requires definePanels(); applies a deserialized
   * layout when one arrived via loadSTRUCT, else the declared defaults.
   */
  makePanels(container: Container<CTX>): Container<CTX> {
    if (!this.definePanels) {
      throw new Error("makePanels() requires a definePanels() implementation");
    }

    const panels = (this.panels = new PanelManager<CTX>(this as unknown as IPanelHost<CTX>));

    this.definePanels(panels);
    const center = panels.build(container);

    if (this.panelLayout) {
      panels.loadLayout(this.panelLayout);
      this.panelLayout = undefined;
    } else {
      panels.applyDefaultLayout();
    }

    return center;
  }

  /** Provenance title for floating dock panels (IPanelHost). */
  getPanelHostTitle(): string {
    return (this.constructor as unknown as IAreaConstructor).define().uiname ?? "";
  }

  /** Panel managers of other visible editors of this type (IPanelHost);
   *  panel drags can drop onto their edge zones (same-catalog transfer). */
  getPanelPeers(): PanelManager<CTX>[] {
    const out: PanelManager<CTX>[] = [];
    const screen = this.owning_sarea?.screen;

    if (!screen) {
      return out;
    }

    for (const sarea of screen.sareas) {
      const area = sarea.area as Area<CTX> | undefined;

      if (area && area !== this && area.constructor === this.constructor && area.panels) {
        out.push(area.panels);
      }
    }

    return out;
  }

  _getPanelLayout(): PanelLayoutState {
    if (this.panels) {
      return this.panels.saveLayout();
    }
    //an editor that never initialized keeps its loaded layout intact
    return this.panelLayout ?? new PanelLayoutState();
  }
}

Area.STRUCT = `
pathux.Area {
  flag : int;
  saved_uidata : string | obj._getSavedUIData();
  closed : bool;
  panelLayout : pathux.PanelLayoutState | obj._getPanelLayout();
}
`;

nstructjs.register(Area);
UIBase.internalRegister(Area as unknown as typeof UIBase);

export class ScreenArea<CTX extends IContextBase = IContextBase> extends UIBase<
  CTX,
  unknown,
  "ScreenArea"
> {
  static STRUCT: string;

  keymap?: KeyMap;
  screen?: Screen<CTX>;
  _flag: number;
  _borders: ScreenBorder<CTX>[];
  _verts: import("./FrameManager_mesh.js").ScreenVert<CTX>[];
  dead: boolean;
  _sarea_id: number;
  _pos: Vector2;
  _size: Vector2;
  area: Area<CTX> | undefined;
  editors: Area<CTX>[] & { remove(item: Area<CTX>, b?: boolean): void };
  editormap: Record<string, Area<CTX>>;
  /** The single AreaDocker tab switcher for this tile, adopted into the
   *  active editor's header (see _attachSwitcher).  Created lazily. */
  switcher?: AreaDocker<CTX>;
  switcherData?: any;

  on_keyup?: (e: KeyboardEvent) => void | boolean;
  on_keypress?: (e: KeyboardEvent) => void | boolean;

  constructor() {
    super();

    this._flag = 0;

    this.flag = 0; /** holds AreaFlags.FLOATING and AreaFlags.INDEPENDENT */

    this._borders = [];
    this._verts = [];
    this.dead = false;

    this._sarea_id = contextWrangler.idgen++;

    this._pos = new Vector2();
    this._size = new Vector2([512, 512]);

    if (cconst.DEBUG.screenAreaPosSizeAccesses) {
      const wrapVector = (name: "_size" | "_pos", axis: 0 | 1) => {
        Object.defineProperty(this[name], axis, {
          get: function () {
            return this["_" + axis];
          },

          set: function (val: number) {
            console.warn(`ScreenArea.${name}[${axis}] set:`, val);
            this["_" + axis] = val;
          },
        });
      };

      wrapVector("_size", 0);
      wrapVector("_size", 1);
      wrapVector("_pos", 0);
      wrapVector("_pos", 1);
    }

    this.area = undefined;
    this.editors = [];
    this.editormap = {};

    this.addEventListener("mouseover", (e) => {
      if (haveModal()) {
        return;
      }

      //console.log("screen area mouseover");
      const screen = this.getScreen() as Screen<CTX> | undefined;
      if (!screen) return;

      if (screen.sareas.active !== this && screen.sareas.active?.area) {
        screen.sareas.active.area.on_area_blur();
      }

      if (this.area && screen.sareas.active !== this) {
        this.area.on_area_focus();
      }

      screen.sareas.active = this;
    });

    //this.addEventListener("mouseleave", (e) => {
    //console.log("screen area mouseleave");
    //});
  }

  /*
  saveData() {
    return {
      _sarea_id : this._sarea_id,
      pos       : this.pos,
      size      : this.size,
    };
  }
  loadData(obj) {
    super.loadData(obj);

    let id = obj._sarea_id;

    let type = obj.areatype;

    if (id !== undefined && id !== null) {
      this._sarea_id = id;
    }

    for (let area of this.editors) {
      if (area.areaType == type) {
        console.log("             found saved area type");

        this.switch_editor(area.constructor);
      }
    }

    this.pos.load(obj.pos);
    this.size.load(obj.size);
  }//*/

  get floating() {
    return Boolean(this.flag & AreaFlags.FLOATING);
  }

  set floating(val: boolean) {
    if (val) {
      this.flag |= AreaFlags.FLOATING;
    } else {
      this.flag &= ~AreaFlags.FLOATING;
    }
  }

  get flag() {
    let flag = this._flag & (AreaFlags.FLOATING | AreaFlags.INDEPENDENT);

    if (this.area) {
      flag |= this.area.flag;
    }

    return flag;
  }

  set flag(v) {
    this._flag &= ~(AreaFlags.FLOATING | AreaFlags.INDEPENDENT);
    this._flag |= v & (AreaFlags.FLOATING | AreaFlags.INDEPENDENT);

    if (this.area) {
      this.area.flag |= v & ~(AreaFlags.FLOATING | AreaFlags.INDEPENDENT);
    }
  }

  get borderLock() {
    return this.area !== undefined ? this.area.borderLock : 0;
  }

  get minSize() {
    return this.area !== undefined ? this.area.minSize : this.size;
  }

  get maxSize() {
    return this.area !== undefined ? this.area.maxSize : this.size;
  }

  get pos() {
    return this._pos;
  }

  set pos(val) {
    if (cconst.DEBUG.screenAreaPosSizeAccesses) {
      console.log("ScreenArea set pos", val);
    }
    this._pos.load(val);
  }

  get size() {
    return this._size;
  }

  set size(val) {
    if (cconst.DEBUG.screenAreaPosSizeAccesses) {
      console.log("ScreenArea set size", val);
    }
    this._size.load(val);
  }

  static newSTRUCT() {
    return UIBase.createElement("screenarea-x");
  }

  static define() {
    return {
      tagname: "screenarea-x",
    };
  }

  _get_v_suffix() {
    return this.area ? this.area._get_v_suffix() : "";
  }

  bringToFront() {
    const screen = this.getScreen() as Screen<CTX> | undefined;
    if (!screen) return;

    HTMLElement.prototype.remove.call(this);
    screen.sareas.remove(this);

    screen.appendChild(this);

    let zindex: number = BORDER_ZINDEX_BASE + 1;

    if (screen.style.zIndex) {
      zindex = parseInt(screen.style.zIndex) + 1;
    }

    for (const sarea of screen.sareas) {
      const sareaZ = sarea.style.zIndex;
      if (sareaZ) {
        zindex = Math.max(zindex, parseInt(sareaZ) + 1);
      }
    }

    this.style.zIndex = "" + zindex;
  }

  _side(border: ScreenArea<CTX>["_borders"][number]) {
    const ret = this._borders.indexOf(border);
    if (ret < 0) {
      throw new Error("border not in screen area");
    }

    return ret;
  }

  init() {
    super.init();

    this.noMarginsOrPadding();
  }

  draw() {
    if (this.area?.draw) {
      this.area.push_ctx_active();
      this.area.draw();
      this.area.pop_ctx_active();
    }
  }

  _isDead() {
    if (this.dead) {
      return true;
    }

    const screen = this.getScreen();

    if (screen === undefined) return true;

    if (screen.parentNode === undefined) return true;
  }

  toJSON() {
    const ret = {
      editors  : this.editors,
      _sarea_id: this._sarea_id,
      area     : (this.area!.constructor as unknown as IAreaConstructor).define().areaname,
      pos      : this.pos,
      size     : this.size,
    };

    return Object.assign(super.toJSON(), ret);
  }

  on_keydown(e: KeyboardEvent) {
    if ((this.area as Area<CTX> & { on_keydown?: (e: KeyboardEvent) => void })?.on_keydown) {
      this.area!.push_ctx_active();
      (this.area as Area<CTX> & { on_keydown: (e: KeyboardEvent) => void }).on_keydown(e);
      this.area!.pop_ctx_active();
    }
  }

  loadJSON(obj: Record<string, unknown>) {
    if (obj === undefined) {
      console.warn("undefined in loadJSON");
      return;
    }

    super.loadJSON(obj);

    this.pos.load(obj.pos as number[]);
    this.size.load(obj.size as number[]);

    for (const editor of obj.editors as Record<string, unknown>[]) {
      const areaname = editor.areaname as string;

      const tagname = areaclasses[areaname].define().tagname;
      const area = UIBase.createElement(tagname) as Area<CTX>;

      area.owning_sarea = this;
      this.editormap[areaname] = area;
      this.editors.push(this.editormap[areaname]);

      area.pos = new Vector2(obj.pos as number[]);
      area.size = new Vector2(obj.size as number[]);
      area.ctx = this.ctx;

      area.inactive = true;
      area.loadJSON(editor);
      area.owning_sarea = undefined;

      if (areaname === obj.area) {
        this.area = area;
      }
    }

    if (this.area !== undefined) {
      this.area.ctx = this.ctx;
      this.area.style["width"] = "100%";
      this.area.style["height"] = "100%";
      this.area.owning_sarea = this;
      this.area.parentWidget = this;

      this.area.pos = this.pos;
      this.area.size = this.size;

      this.area.inactive = false;
      this.shadow.appendChild(this.area);
      this.area.on_area_active();
      this.area.onadd();
    }

    this.setCSS();
  }

  _ondestroy() {
    super._ondestroy();

    this.dead = true;

    for (const editor of this.editors) {
      if (editor === this.area) continue;

      editor._ondestroy();
    }
  }

  override getScreen(): Screen<CTX> | undefined {
    if (this.screen !== undefined) {
      return this.screen;
    }

    //try to walk up graph, if possible
    let p: Node | null = this.parentNode;
    let _i = 0;

    while (p && !isScreen(p) && p !== (p as Element).parentNode) {
      p = this.parentNode;

      if (_i++ > 1000) {
        console.warn("infinite loop detected in ScreenArea.prototype.getScreen()");
        return undefined;
      }
    }

    return p && isScreen<CTX>(p) ? p : undefined;
  }

  copy(screen: Screen<CTX>) {
    const ret = UIBase.createElement("screenarea-x") as ScreenArea<CTX>;

    ret.screen = screen;
    ret.ctx = this.ctx;

    ret.pos[0] = this.pos[0];
    ret.pos[1] = this.pos[1];

    ret.size[0] = this.size[0];
    ret.size[1] = this.size[1];

    for (const area of this.editors) {
      const cpy = area.copy() as Area<CTX>;

      cpy.ctx = this.ctx;

      cpy.parentWidget = ret;
      ret.editors.push(cpy);
      ret.editormap[(cpy.constructor as unknown as IAreaConstructor).define().areaname!] = cpy;

      if (area === this.area) {
        ret.area = cpy;
      }
    }

    ret.ctx = this.ctx;

    if (ret.area !== undefined) {
      ret.area.ctx = this.ctx;

      ret.area.pos = ret.pos;
      ret.area.size = ret.size;
      ret.area.owning_sarea = ret;
      ret.area.parentWidget = ret;

      ret.shadow.appendChild(ret.area);
      //ret.area.onadd();

      if (ret.area._init_done) {
        ret.area.push_ctx_active();
        ret.area.on_area_active();
        ret.area.pop_ctx_active();
      } else {
        ret.doOnce(() => {
          if (this.dead) {
            return;
          }
          ret._init();
          ret.area!._init();
          ret.area!.push_ctx_active();
          ret.area!.on_area_active();
          ret.area!.pop_ctx_active();
        });
      }
    }

    return ret;
  }

  snapToScreenSize() {
    const screen = this.getScreen();
    if (!screen) return;

    const co = new Vector2();
    let changed = 0;

    for (const v of this._verts) {
      co.load(v);

      v[0] = Math.min(Math.max(v[0], 0), screen.size[0]);
      v[1] = Math.min(Math.max(v[1], 0), screen.size[1]);

      if (co.vectorDistance(v) > 0.1) {
        changed = 1;
      }
    }

    if (changed) {
      this.loadFromVerts();
    }
  }

  /**
   *
   * Sets screen verts from pos/size
   * */
  loadFromPosSize() {
    if (this.floating && this._verts.length > 0) {
      const p = this.pos;
      const s = this.size;

      this._verts[0].loadXY(p[0], p[1]);
      this._verts[1].loadXY(p[0], p[1] + s[1]);
      this._verts[2].loadXY(p[0] + s[0], p[1] + s[1]);
      this._verts[3].loadXY(p[0] + s[0], p[1]);

      for (const border of this._borders) {
        border.setCSS();
      }

      this.setCSS();
      return;
    }

    const screen = this.getScreen();
    if (!screen) return;

    for (const b of this._borders) {
      screen.freeBorder(b);
    }

    this.makeBorders(screen);
    this.setCSS();

    return this;
  }

  /**
   *
   * Sets pos/size from screen verts
   * */
  loadFromVerts() {
    if (this._verts.length == 0) {
      return;
    }

    const min = new Vector2([1e17, 1e17]);
    const max = new Vector2([-1e17, -1e17]);

    for (const v of this._verts) {
      min.min(v);
      max.max(v);
    }

    this.pos[0] = min[0];
    this.pos[1] = min[1];

    this.size[0] = max[0] - min[0];
    this.size[1] = max[1] - min[1];

    this.setCSS();
    return this;
  }

  override on_resize(size: number[] | Vector2) {
    super.on_resize(size);

    if (this.area !== undefined) {
      this.area.on_resize(size);
    }
  }

  makeBorders(screen: Screen<CTX>) {
    this._borders.length = 0;
    this._verts.length = 0;

    const p = this.pos;
    const s = this.size;

    //s = snapi(new Vector2(s));

    const vs: Vector2[] = [
      new Vector2([p[0], p[1]]),
      new Vector2([p[0], p[1] + s[1]]),
      new Vector2([p[0] + s[0], p[1] + s[1]]),
      new Vector2([p[0] + s[0], p[1]]),
    ];

    const floating = this.floating;

    for (let i = 0; i < vs.length; i++) {
      vs[i] = snap(vs[i] as unknown as number[]) as unknown as Vector2;
      vs[i] = screen.getScreenVert(vs[i], "" + i, !!floating);
      this._verts.push(vs[i] as any);
    }

    for (let i = 0; i < vs.length; i++) {
      const v1 = vs[i];
      const v2 = vs[(i + 1) % vs.length];

      const b = screen.getScreenBorder(this, v1, v2, i);

      for (let j = 0; j < 2; j++) {
        const v = j ? b.v2 : b.v1;

        if (!v.sareas.includes(this)) {
          v.sareas.push(this);
        }
      }

      if (!b.sareas.includes(this)) {
        b.sareas.push(this);
      }

      this._borders.push(b as unknown as ScreenBorderAny);

      b.movable = screen.isBorderMovable(b);
    }

    return this;
  }

  setCSS() {
    this.style["position"] = UIBase.PositionKey;

    this.style["left"] = this.pos[0] + "px";
    this.style["top"] = this.pos[1] + "px";

    this.style["width"] = this.size[0] + "px";
    this.style["height"] = this.size[1] + "px";

    this.style["overflow"] = "hidden";
    this.style["contain"] = "layout"; //ensure we have a new positioning stack

    if (this.area !== undefined) {
      this.area.setCSS();
    }
  }

  appendChild<T extends Node>(child: T): T {
    if (child instanceof Area) {
      const def = (child.constructor as unknown as IAreaConstructor).define();
      const existing = def.areaname ? this.editormap[def.areaname] : undefined;

      if (existing && existing !== child) {
        console.warn("Warning, replacing an exising editor instance", child, existing);

        if (this.area === existing) {
          this.area = child;
        }

        existing.remove();
        this.editors.remove(existing, true);
        this.editormap[def.areaname!] = child;
      }

      child.ctx = this.ctx;
      child.pos = this.pos;
      child.size = this.size;

      if (!this.editors.includes(child)) {
        this.editors.push(child);
      }

      child.owning_sarea = undefined;
      if (this.area === undefined) {
        this.area = child;
      }
    }

    const result = super.appendChild(child);

    if (child instanceof UIBase) {
      child.parentWidget = this;
      child.onadd();
    }
    return result;
  }

  switch_editor(cls: AreaConstructorParam) {
    return this.switchEditor(cls);
  }

  /** Adopt this tile's shared AreaDocker into `area`'s switcher row,
   *  creating the docker on first use.  Because there is a single docker
   *  element per tile, tab UI state and any in-progress tab drag survive
   *  editor switches without swapping DOM nodes between areas. */
  _attachSwitcher(area: Area<CTX>) {
    const row = area._switcherRow;

    if (!row || area.flag & AreaFlags.NO_SWITCHER) {
      return;
    }

    //parentWidget alone is not a reliable attachment signal: raw
    //HTMLElement.remove (used during editor switches) leaves it stale
    if (this.switcher && this.switcher.parentWidget === row && this.switcher.parentNode) {
      return;
    }

    //evict any docker that rode along inside a reparented editor's header
    //(e.g. after Screen.floatArea moved the editor to another tile)
    const dockerTag = UIBase.getInternalName("area-docker-x");
    row._forEachChildWidget((child) => {
      if (child.tagName.toLowerCase() === dockerTag && child !== this.switcher) {
        HTMLElement.prototype.remove.call(child);
      }
    });

    if (!this.switcher) {
      this.switcher = area.makeAreaSwitcher(row);
      this.switcher.ctx = this.ctx;
      return;
    }

    HTMLElement.prototype.remove.call(this.switcher);
    //prepend so the switcher keeps its place before the help picker/note area
    row._prepend(this.switcher);
    this.switcher.ctx = this.ctx;
    this.switcher.flagUpdate();
  }

  switchEditor(cls: AreaConstructorParam) {
    const def = cls.define();
    const name = def.areaname!;

    //areaclasses[name]
    if (!(name in this.editormap)) {
      this.editormap[name] = UIBase.createElement(def.tagname) as Area<CTX>;
      this.editormap[name].ctx = this.ctx;
      this.editormap[name].parentWidget = this;
      this.editormap[name].owning_sarea = this;
      this.editormap[name].inactive = false;

      this.editors.push(this.editormap[name]);
    }

    //var finish = () => {
    if (this.area) {
      //keep the shared switcher; it is re-adopted by the new active area
      if (this.switcher) {
        HTMLElement.prototype.remove.call(this.switcher);
      }

      //break direct pos/size references for old active area
      this.area.pos = new Vector2(this.area.pos);
      this.area.size = new Vector2(this.area.size);

      this.area.owning_sarea = undefined;
      this.area.inactive = true;
      this.area.push_ctx_active();
      this.area._init(); //check that init was called
      this.area.on_area_inactive();
      this.area.pop_ctx_active();

      this.area.remove();
    } else {
      this.area = undefined;
    }

    this.area = this.editormap[name];

    // Selecting an editor always un-hides it from the tab bar.
    this.area.closed = false;

    this.area.inactive = false;
    this.area.parentWidget = this;

    //. . .and set references to pos/size
    this.area.pos = this.pos;
    this.area.size = this.size;
    this.area.owning_sarea = this;
    this.area.ctx = this.ctx;

    this.area.packflag |= this.packflag;

    this.shadow.appendChild(this.area);

    this.area.style["width"] = "100%";
    this.area.style["height"] = "100%";

    //propegate new size
    this.area.push_ctx_active();
    this.area._init(); //check that init was called
    this.area.on_resize([this.size[0], this.size[1]]);
    this.area.pop_ctx_active();

    this._attachSwitcher(this.area);

    this.area.push_ctx_active();
    this.area.on_area_active();
    this.area.pop_ctx_active();

    this.regenTabOrder();
    //}
  }

  _checkWrangler() {
    if (this.ctx) contextWrangler._checkWrangler(this.ctx);
  }

  update() {
    this._checkWrangler();

    super.update();

    //flag client controller implementation that
    //this area is active for its type
    if (this.area !== undefined) {
      this.area.owning_sarea = this;
      this.area.parentWidget = this;
      this.area.size = this.size;
      this.area.pos = this.pos;

      //self-heals paths that bypass switchEditor (loadSTRUCT, floatArea)
      this._attachSwitcher(this.area);

      const screen = this.getScreen();
      const oldsize = [this.size[0], this.size[1]];

      const moved = screen ? screen.checkAreaConstraint(this, true) : 0;
      //*
      if (moved) {
        if (cconst.DEBUG.areaConstraintSolver) {
          console.log(
            "screen constraint solve",
            moved,
            this.area.minSize,
            this.area.maxSize,
            this.area.tagName,
            this.size
          );
        }

        screen!.solveAreaConstraints();
        screen!.regenBorders();
        this.on_resize(oldsize);
      } //*/

      this.area.push_ctx_active(true);
    }

    this._forEachChildWidget((n) => {
      n.update();
    });

    if (this.area !== undefined) {
      this.area.pop_ctx_active(true);
    }
  }

  removeChild<T extends Node>(ch: T): T {
    if (ch instanceof Area) {
      ch.owning_sarea = undefined;
      ch.pos = undefined;
      ch.size = undefined;

      if (this.area === ch && this.editors.length > 1) {
        const i = (this.editors.indexOf(ch) + 1) % this.editors.length;
        this.switchEditor(this.editors[i].constructor);
      } else if (this.area === ch) {
        this.editors = [];
        this.editormap = {};
        this.area = undefined;

        ch.remove();
        return ch;
      }

      const areaname = (ch.constructor as unknown as IAreaConstructor).define().areaname!;

      this.editors.remove(ch);
      delete this.editormap[areaname];

      ch.parentWidget = undefined;
      return ch;
    } else {
      return super.removeChild(ch);
    }
  }

  afterSTRUCT() {
    for (const area of this.editors) {
      area.pos = this.pos;
      area.size = this.size;
      area.owning_sarea = this;

      area.push_ctx_active();
      area._ctx = this.ctx;
      area.afterSTRUCT();
      area.pop_ctx_active();
    }
  }

  loadSTRUCT(reader: StructReader<this>) {
    reader(this);

    this.pos = new Vector2(this.pos);
    this.size = new Vector2(this.size);

    //find active editor

    const editors: Area<CTX>[] = [];

    for (const area of this.editors) {
      if (!area.constructor?.define || area.constructor === Area) {
        //failed to load this area
        continue;
      }

      const areaname = (area.constructor as unknown as IAreaConstructor).define().areaname!;

      area.inactive = true;
      area.owning_sarea = undefined;
      this.editormap[areaname] = area;

      if (areaname === (this.area as unknown as string)) {
        this.area = area;
      }

      /*
       * originally inactive areas weren't supposed to have
       * a reference to their owning ScreenAreas.
       *
       * Unfortunately this will cause isDead() to return true,
       * which might lead to nasty problems.
       * */
      area.parentWidget = this;

      editors.push(area);
    }
    this.editors = editors;

    if (typeof this.area !== "object") {
      let area: Area<CTX> | undefined = this.editors[0];

      console.warn("Failed to find active area!", this.area);

      if (typeof area !== "object") {
        for (const k in areaclasses) {
          const tagname = areaclasses[k].define().tagname;
          area = UIBase.createElement(tagname) as Area<CTX>;
          const areaname = (area.constructor as unknown as IAreaConstructor).define().areaname!;

          this.editors.push(area);
          this.editormap[areaname] = area;

          break;
        }
      }

      if (area) {
        this.area = area;
      }
    }

    if (this.area !== undefined) {
      this.area.style["width"] = "100%";
      this.area.style["height"] = "100%";
      this.area.owning_sarea = this;
      this.area.parentWidget = this;

      this.area.pos = this.pos;
      this.area.size = this.size;

      this.area.inactive = false;
      this.shadow.appendChild(this.area);

      const f = () => {
        if (this._isDead()) {
          return;
        }

        if (!this.ctx && this.parentNode) {
          console.log("waiting to start. . .");
          this.doOnce(f);
          return;
        }

        this.area!.ctx = this.ctx;
        this.area!._init(); //ensure init has been called already
        this.area!.on_area_active();
        this.area!.onadd();
      };

      this.doOnce(f);
    }
  }
}

ScreenArea.STRUCT = `
pathux.ScreenArea {
  pos      : vec2;
  size     : vec2;
  type     : string;
  hidden   : bool;
  editors  : array(abstract(pathux.Area));
  area     : string | this.area ? this.area.constructor.define().areaname : "";
}
`;

nstructjs.register(ScreenArea);
UIBase.internalRegister(ScreenArea as unknown as typeof UIBase);

export type ScreenAreaAny = ScreenArea<any>;
export type AreaAny = Area<any>;
