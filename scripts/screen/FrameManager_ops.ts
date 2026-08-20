"use strict";

import cconst from "../config/const";

import * as util from "../path-controller/util/util";
import { Vector2 } from "../path-controller/util/vectormath";
import * as ui_base from "../core/ui_base";
import * as simple_toolsys from "../path-controller/toolsys/toolsys";
import { ToolTip } from "../widgets/ui_widgets2";
import type { Screen } from "./FrameManager";
import type { Overdraw } from "../util/ScreenOverdraw";
import type { SVGRectWithColor } from "../util/ScreenOverdraw";
import type { ScreenBorder, ScreenBorderAny, ScreenVert } from "./FrameManager_mesh";

// TODO: these tools do not need a toolstack; drop the getter and run them directly.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let toolstack_getter = function (): simple_toolsys.ToolStack {
  throw new Error("must pass a toolstack getter to registerToolStackGetter");
};

export function registerToolStackGetter(func: () => simple_toolsys.ToolStack) {
  toolstack_getter = func;
}

const UndoFlags = simple_toolsys.UndoFlags;

import { pushModalLight, popModalLight, keymap, pushPointerModal } from "../util/simple_events";
import { IContextBase } from "../core/context_base";
import { ScreenArea, ScreenAreaAny } from "./ScreenArea";
import { IAreaConstructor } from "./area_base";

export class ToolBase<CTX extends IContextBase = IContextBase> extends simple_toolsys.ToolOp<
  {},
  {},
  CTX
> {
  screen: Screen<CTX>;
  _finished: boolean;
  overdraw?: Overdraw<CTX>;
  modaldata: ReturnType<typeof pushModalLight> | ReturnType<typeof pushPointerModal> | undefined;
  ctx!: CTX;

  constructor(screen: Screen<CTX>) {
    super();
    this.screen = screen;

    this._finished = false;
  }

  start(elem?: Element, pointerId?: number) {
    this.toolModalStart(undefined, elem, pointerId);
  }

  cancel() {
    this.finish();
  }

  finish() {
    this._finished = true;
    this.popModal();
  }

  popModal() {
    this.overdraw?.end();
    popModalLight(this.modaldata);
    this.modaldata = undefined;
  }

  toolModalStart(
    ctx: CTX | undefined = this.screen.ctx as CTX,
    elem?: Element,
    pointerId?: number
  ) {
    this.ctx = ctx!;

    if (this.modaldata !== undefined) {
      console.log("Error, modaldata was not undefined");
      popModalLight(this.modaldata);
    }

    this.overdraw = ui_base.UIBase.createElement("overdraw-x");
    this.overdraw.start(this.screen);

    const handlers: Record<string, (...args: unknown[]) => void> = {};
    const keys = Object.getOwnPropertyNames(this);
    for (const k in Object.getPrototypeOf(this) as Record<string, unknown>) {
      keys.push(k);
    }
    for (const k of Object.getOwnPropertyNames(Object.getPrototypeOf(this))) {
      keys.push(k);
    }

    for (const k in this) {
      keys.push(k);
    }

    for (const k of keys) {
      if (k.startsWith("on")) {
        handlers[k] = (this as unknown as Record<string, (...args: unknown[]) => void>)[k].bind(
          this
        );
      }
    }

    if (pointerId !== undefined) {
      handlers.on_pointerdown = handlers.on_pointerdown ?? handlers.on_mousedown;
      handlers.on_pointermove = handlers.on_pointermove ?? handlers.on_mousemove;
      handlers.on_pointerup = handlers.on_pointerup ?? handlers.on_mouseup;
      handlers.on_pointercancel =
        handlers.on_pointercancel ?? handlers.on_pointerup ?? handlers.on_mouseup;

      this.modaldata = pushPointerModal(handlers, elem, pointerId);
    } else {
      this.modaldata = pushModalLight(handlers);
    }
  }

  on_pointermove(e: PointerEvent) {}

  on_pointerup(e: PointerEvent) {
    this.finish();
  }

  on_keydown(e: KeyboardEvent) {
    console.log("s", e.keyCode);

    switch (e.keyCode) {
      case keymap.Escape:
        this.cancel();
        break;
      case keymap.Space:
      case keymap.Enter:
        this.finish();
        break;
    }
  }
}

interface BorderWithOld<CTX extends IContextBase = any> extends ScreenBorder<CTX> {
  oldv1: Vector2;
  oldv2: Vector2;
}

export class AreaResizeTool<CTX extends IContextBase = any> extends ToolBase<CTX> {
  sarea: ScreenAreaAny;
  start_mpos: Vector2;
  side: number;

  constructor(screen: Screen<CTX>, border: ScreenBorderAny, mpos: Vector2 | number[]) {
    super(screen);

    this.start_mpos = new Vector2(mpos);

    this.sarea = border.sareas[0];
    if (!this.sarea || border.dead) {
      console.log(border.dead, border);
      throw new Error("border corruption");
    }

    this.screen = screen;
    this.side = this.sarea._side(border);
  }

  get border() {
    return this.sarea._borders[this.side];
  }

  static tooldef() {
    return {
      uiname     : "Resize Area",
      toolpath   : "screen.area.resize",
      icon       : ui_base.Icons.RESIZE,
      description: "change size of area",
      is_modal   : true,
      undoflag   : UndoFlags.NO_UNDO,
      flag       : 0,
      inputs     : {},
      outputs    : {},
    };
  }

  getBorders() {
    const horiz = this.border.horiz;

    const ret: ScreenBorder<CTX>[] = [];
    const visit = new Set<number>();

    const rec = (v: ScreenVert<CTX>) => {
      if (visit.has(v._id)) {
        return;
      }

      visit.add(v._id);

      for (const border of v.borders) {
        if (border.horiz == horiz && !visit.has(border._id)) {
          visit.add(border._id);
          ret.push(border);

          rec(border.otherVertex(v));
        }
      }
    };

    rec(this.border.v1);
    rec(this.border.v2);

    return ret;
  }

  override on_pointerup(e: PointerEvent) {
    this.finish();
  }

  override finish() {
    super.finish();

    this.screen.snapScreenVerts();
    this.screen.regenBorders();
    this.screen.snapScreenVerts();
    this.screen.loadFromVerts();
  }

  override on_keydown(e: KeyboardEvent) {
    switch (e.keyCode) {
      case keymap["Escape"]:
      case keymap["Enter"]:
      case keymap["Space"]:
        this.finish();
        break;
    }
  }

  override on_pointermove(e: PointerEvent) {
    const mpos = new Vector2([e.x, e.y]);

    mpos.sub(this.start_mpos);

    const axis = this.border.horiz ? 1 : 0;

    this.overdraw!.clear();

    const borders = this.getBorders() as BorderWithOld[];

    const color = cconst.DEBUG.screenborders
      ? "rgba(1.0, 0.5, 0.0, 0.1)"
      : "rgba(1.0, 0.5, 0.0, 1.0)";

    let bad = false;

    for (const border of borders) {
      bad = bad || !this.screen.isBorderMovable(border);

      border.oldv1 = new Vector2(border.v1);
      border.oldv2 = new Vector2(border.v2);
    }

    if (bad) {
      console.log("border is not movable");
      return;
    }

    const check = () => {
      let count = 0;

      for (const sarea of this.screen.sareas) {
        if (sarea.size[0] < 15 || sarea.size[1] < 15) {
          count++;
        }
      }

      return count;
    };

    const badcount = check();

    let fitToSize = true;

    const df = mpos[axis] as number;
    const border = this.border;

    this.screen.moveBorder(border, df, false);

    for (const border of borders) {
      // do not fit to size if border is on an outer edge
      if (border.outer) {
        fitToSize = false;
      }

      this.overdraw!.line(
        border.v1 as unknown as number[],
        border.v2 as unknown as number[],
        color
      );
    }

    this.start_mpos[0] = e.x;
    this.start_mpos[1] = e.y;
    this.screen.loadFromVerts();
    this.screen.setCSS();

    if (check() != badcount) {
      console.log("bad");

      for (const border of borders) {
        border.v1.load(border.oldv1);
        border.v2.load(border.oldv2);
      }
    }

    this.screen.snapScreenVerts(fitToSize);
    this.screen.loadFromVerts();
    this.screen.solveAreaConstraints(fitToSize);
    this.screen.setCSS();
    this.screen.updateDebugBoxes();
    this.screen._fireResizeCB();
  }
}

export class SplitTool<CTX extends IContextBase = IContextBase> extends ToolBase<CTX> {
  done: boolean;
  sarea: ScreenArea<CTX> | undefined;
  t: number | undefined;
  horiz: boolean | undefined;
  started: boolean;

  constructor(screen: Screen<CTX>) {
    super(screen);

    this.done = false;
    this.screen = screen;
    this.sarea = undefined;
    this.t = undefined;

    this.started = false;
  }

  static tooldef() {
    return {
      uiname     : "Split Area",
      toolpath   : "screen.area.split",
      icon       : ui_base.Icons.SMALL_PLUS,
      description: "split an area in two",
      is_modal   : true,
      undoflag   : UndoFlags.NO_UNDO,
      flag       : 0,
      inputs     : {},
      outputs    : {},
    };
  }

  override toolModalStart(ctx?: CTX) {
    if (this.started) {
      console.trace("double call to modalStart()");
      return;
    }

    this.overdraw = ui_base.UIBase.createElement("overdraw-x");
    this.overdraw.start(this.screen);

    super.toolModalStart(ctx);
  }

  override cancel() {
    return this.finish(true);
  }

  finish(canceled = false) {
    if (this.done) {
      return;
    }

    this.done = true;
    this.overdraw!.end();

    this.popModal();

    if (canceled || !this.sarea) {
      return;
    }

    const sarea = this.sarea;
    const screen = this.screen;
    const t = this.t;

    screen.splitArea(sarea, t, this.horiz);
    screen._internalRegenAll();
  }

  override on_pointermove(e: PointerEvent) {
    let x = e.x;
    let y = e.y;

    const screen = this.screen;

    const sarea = screen.findScreenArea(x, y);

    this.overdraw!.clear();

    if (sarea !== undefined) {
      x = (x - sarea.pos[0]) / sarea.size[0];
      y = (y - sarea.pos[1]) / sarea.size[1];

      const dx = 1.0 - Math.abs(x - 0.5);
      const dy = 1.0 - Math.abs(y - 0.5);

      this.sarea = sarea;
      const horiz = (this.horiz = dx < dy);

      if (horiz) {
        this.t = y;
        this.overdraw!.line([sarea.pos[0], e.y], [sarea.pos[0] + sarea.size[0], e.y]);
      } else {
        this.t = x;
        this.overdraw!.line([e.x, sarea.pos[1]], [e.x, sarea.pos[1] + sarea.size[1]]);
      }
    }
  }

  on_pointerdown(e: PointerEvent) {
    this.finish();

    if (e.button) {
      e.stopPropagation();
      e.preventDefault();
    }
  }

  override on_keydown(e: KeyboardEvent) {
    switch (e.keyCode) {
      case keymap.Escape:
        this.cancel();
        break;
      case keymap.Space:
      case keymap.Enter:
        this.finish();
        break;
    }
  }
}

export class RemoveAreaTool<CTX extends IContextBase = IContextBase> extends ToolBase<CTX> {
  _border: ScreenBorderAny | undefined;
  done: boolean;
  sarea: ScreenArea<CTX> | undefined;
  t: number | undefined;
  started: boolean;

  constructor(screen: Screen<CTX>, border?: ScreenBorder<CTX>) {
    super(screen);

    this._border = border;

    this.done = false;
    this.screen = screen;
    this.sarea = undefined;
    this.t = undefined;

    this.started = false;
  }

  static tooldef() {
    return {
      uiname     : "Remove Area",
      toolpath   : "screen.area.pick_remove",
      icon       : ui_base.Icons.SMALL_PLUS,
      description: "Collapse a window",
      is_modal   : true,
      undoflag   : UndoFlags.NO_UNDO,
      flag       : 0,
      inputs     : {},
      outputs    : {},
    };
  }

  override toolModalStart(ctx?: CTX) {
    if (this.started) {
      console.trace("double call to modalStart()");
      return;
    }

    this.overdraw = ui_base.UIBase.createElement("overdraw-x");
    this.overdraw.start(this.screen);

    super.toolModalStart(ctx);
  }

  override cancel() {
    return this.finish(true);
  }

  finish(canceled = false) {
    if (this.done) {
      return;
    }

    this.done = true;
    this.overdraw!.end();

    this.popModal();

    if (canceled || !this.sarea) {
      return;
    }

    const sarea = this.sarea;
    const screen = this.screen;

    if (sarea) {
      screen.collapseArea(sarea, this._border);
      screen._internalRegenAll();
    }
  }

  override on_pointermove(e: PointerEvent) {
    const x = e.x;
    const y = e.y;

    const screen = this.screen;

    const sarea = screen.findScreenArea(x, y);

    this.overdraw!.clear();

    if (sarea !== undefined) {
      this.sarea = sarea;
      this.overdraw!.rect(
        sarea.pos as unknown as number[],
        sarea.size as unknown as number[],
        "rgba(0,0,0,0.1)"
      );
    }
  }

  on_pointerdown(e: PointerEvent) {
    this.finish();

    if (e.button) {
      e.stopPropagation();
      e.preventDefault();
    }
  }

  override on_keydown(e: KeyboardEvent) {
    console.log("s", e.keyCode);

    switch (e.keyCode) {
      case keymap.Escape:
        this.cancel();
        break;
      case keymap.Space:
      case keymap.Enter:
        this.finish();
        break;
    }
  }
}

interface DragBoxRect<CTX extends IContextBase = IContextBase> extends SVGRectWithColor {
  sarea: ScreenArea<CTX>;
  horiz: boolean | number;
  t: number;
  side: string | number;
  rect: SVGRectWithColor | undefined;
  onclick: (e: PointerEvent | MouseEvent) => void;
}

interface DragBox<CTX extends IContextBase = IContextBase> {
  sarea: ScreenArea<CTX>;
  horiz: boolean | number;
  t: number;
  side: string | number;
}

export class AreaDragTool<CTX extends IContextBase = IContextBase> extends ToolBase<CTX> {
  dropArea: boolean;
  excludeAreas: Set<ScreenArea<CTX>>;
  cursorbox: SVGRectWithColor | undefined;
  boxes: DragBoxRect<CTX>[] & { active?: DragBoxRect<CTX> };
  sarea: ScreenArea<CTX> | undefined;
  start_mpos: Vector2;
  color: string;
  hcolor: string;
  curbox: DragBoxRect<CTX> | undefined;

  constructor(screen: Screen<CTX>, sarea: ScreenArea<CTX> | undefined, mpos: Vector2 | number[]) {
    super(screen);

    this.dropArea = false;
    this.excludeAreas = new Set();
    this.cursorbox = undefined;
    this.boxes = [];
    this.boxes.active = undefined;
    this.color = "";
    this.hcolor = "";

    this.sarea = sarea;
    this.start_mpos = new Vector2(mpos);
    this.screen = screen;
  }

  static tooldef() {
    return {
      uiname     : "Drag Area",
      toolpath   : "screen.area.drag",
      icon       : ui_base.Icons.TRANSLATE,
      description: "move or duplicate area",
      is_modal   : true,
      undoflag   : UndoFlags.NO_UNDO,
      flag       : 0,
      inputs     : {},
      outputs    : {},
    };
  }

  override finish() {
    super.finish();

    this.screen.regenBorders();
    this.screen.solveAreaConstraints();
    this.screen.snapScreenVerts();
    this.screen._recalcAABB();
  }

  getBoxRect(b: DragBox<CTX>) {
    const sa = b.sarea;
    let pos: number[];
    let size: number[];

    // A horiz of -1 is replacement rather than a split, so the box covers the whole area.
    if (b.horiz == -1) {
      pos = sa.pos as unknown as number[];
      size = sa.size as unknown as number[];
    } else if (b.horiz) {
      if (b.side == "b") {
        pos = [sa.pos[0], sa.pos[1] + sa.size[1] * b.t];
        size = [sa.size[0], sa.size[1] * (1.0 - b.t)];
      } else {
        pos = [sa.pos[0], sa.pos[1]];
        size = [sa.size[0], sa.size[1] * b.t];
      }
    } else {
      if (b.side == "r") {
        pos = [sa.pos[0] + sa.size[0] * b.t, sa.pos[1]];
        size = [sa.size[0] * (1.0 - b.t), sa.size[1]];
      } else {
        pos = [sa.pos[0], sa.pos[1]];
        size = [sa.size[0] * b.t, sa.size[1]];
      }
    }

    const color = "rgba(100, 100, 100, 0.2)";

    const ret = this.overdraw!.rect(pos!, size!, color);
    ret.style.pointerEvents = "none";

    return ret;
  }

  doSplit(b: DragBox<CTX>) {
    if (this.sarea) {
      return this.doSplitDrop(b);
    }

    const dst = b.sarea;
    const screen = this.screen;

    const t = b.t;

    screen.splitArea(dst, t, b.horiz as boolean);

    screen._internalRegenAll();
  }

  doSplitDrop(b: DragBox<CTX>) {
    // Replacing an area with itself changes nothing.
    if (b.horiz === -1 && b.sarea === this.sarea) {
      return;
    }

    let can_rip: boolean;
    const sa = this.sarea!;
    const screen = this.screen;

    // An area can be ripped out only if removing it leaves the rest rectangular: it spans the
    // full screen in one axis, or it floats. Dropping onto itself (or onto a neighbor it would
    // split against) is not a rip
    can_rip = sa.size[0] === screen.size[0] || sa.size[1] === screen.size[1];
    can_rip = can_rip || sa.floating;
    can_rip = can_rip && b.sarea !== sa;
    can_rip = can_rip && (b.horiz === -1 || !screen.areasBorder(sa, b.sarea));

    const expand = b.horiz === -1 && b.sarea !== sa && screen.areasBorder(b.sarea, sa);

    can_rip = can_rip || expand;

    console.log("can_rip:", can_rip, expand);

    if (can_rip) {
      screen.removeArea(sa);
      screen.snapScreenVerts();
    }

    if (b.horiz === -1) {
      const src = this.sarea!;
      const dst = b.sarea as ScreenArea<CTX>;

      if (can_rip && src !== dst) {
        let mm: ReturnType<Screen<CTX>["minmaxArea"]> | undefined;

        // An expanding drop takes over the consumed area's extent as well as its slot.
        if (expand) {
          mm = screen.minmaxArea(src);
          screen.minmaxArea(dst, mm);
        }

        console.log("replacing. . .", expand);

        if (src.floating) {
          const old = dst.editors;

          dst.editors = [];
          dst.editormap = {};

          if (
            dst.area &&
            !(
              (dst.area.constructor as unknown as IAreaConstructor).define().areaname! in
              src.editormap
            )
          ) {
            dst.area.push_ctx_active();
            dst.area.on_area_inactive();
            dst.area.remove();
            dst.area.pop_ctx_active();
          }

          for (const editor of old) {
            const def = (editor.constructor as unknown as IAreaConstructor).define();

            let bad = false;

            for (const editor2 of src.editors) {
              if (editor.constructor === editor2.constructor) {
                bad = true;
                break;
              }
            }

            if (!bad) {
              dst.editors.push(editor);
              dst.editormap[def.areaname!] = editor;
            }
          }

          for (const editor of src.editors) {
            const def = (editor.constructor as unknown as IAreaConstructor).define();

            dst.editormap[def.areaname!] = editor;
            dst.editors.push(editor);

            if (editor.owning_sarea) {
              editor.owning_sarea = dst;
            }

            if (editor.parentWidget) {
              editor.parentWidget = dst;
            }
          }

          dst.switcher?.flagUpdate();

          dst.area = src.area;
          dst.shadow.appendChild(src.area!);

          src.area = undefined;
          src.editors = [];
          src.editormap = {};

          dst.on_resize(dst.size);

          dst.flushSetCSS();
          dst.flushUpdate();

          screen.removeArea(src);
          screen.snapScreenVerts();

          return;
        } else {
          screen.replaceArea(dst, src);
        }

        if (expand) {
          console.log("\nEXPANDING:", src.size[0], src.size[1]);

          src.pos[0] = mm!.min[0];
          src.pos[1] = mm!.min[1];

          src.size[0] = mm!.max[0] - mm!.min[0];
          src.size[1] = mm!.max[1] - mm!.min[1];

          src.loadFromPosSize();

          screen._internalRegenAll();
        }
      } else {
        screen.replaceArea(dst as ScreenArea<CTX>, src.copy(screen));
        screen._internalRegenAll();
      }
    } else {
      const src = this.sarea!;
      const dst = b.sarea as ScreenArea<CTX>;

      const t = b.t;

      let nsa = screen.splitArea(dst, t, b.horiz as boolean);

      if (b.side === "l" || b.side === "t") {
        nsa = dst;
      }

      if (can_rip) {
        screen.replaceArea(nsa, src);
      } else {
        screen.replaceArea(nsa, src.copy(screen));
      }

      screen._internalRegenAll();
    }
  }

  makeBoxes(sa: ScreenArea<CTX>) {
    const sz = util.isMobile() ? 100 : 40;
    const cx = sa.pos[0] + sa.size[0] * 0.5;
    const cy = sa.pos[1] + sa.size[1] * 0.5;

    const color = (this.color = "rgba(200, 200, 200, 0.55)");
    const hcolor = (this.hcolor = "rgba(230, 230, 230, 0.75)");
    let idgen = 0;
    const boxes = this.boxes;

    const box = (
      x: number,
      y: number,
      sz: number[],
      horiz: boolean | number,
      t: number,
      side: string | number
    ) => {
      const b = this.overdraw!.rect(
        [x - sz[0] * 0.5, y - sz[1] * 0.5],
        sz,
        color
      ) as DragBoxRect<CTX>;
      b.style.borderRadius = "14px";

      boxes.push(b);

      b.sarea = sa;

      const style = document.createElement("style");
      const cls = `mybox_${idgen++}`;

      b.horiz = horiz;
      b.t = t;
      b.side = side;
      b.setAttribute("class", cls);
      b.setAttribute("is_box", "true");

      b.addEventListener("pointermove", this.on_pointermove.bind(this));

      const onclick = (b.onclick = (e: PointerEvent | MouseEvent) => {
        if ((e.type === "pointerdown" || e.type === "pointerup") && e.button !== 0) {
          return; // a non-left button is handled by the cancel path instead
        }

        console.log("split click");

        if (!this._finished) {
          this.finish();
          this.doSplit(b);

          e.preventDefault();
          e.stopPropagation();
        }
      });

      b.addEventListener("click", onclick);
      b.addEventListener("pointerdown", onclick);
      b.addEventListener("pointerup", onclick);

      b.addEventListener("pointerenter", (e: Event) => {
        if (this.curbox !== undefined) {
          if (this.curbox.rect) {
            this.curbox.rect.remove();
            this.curbox.rect = undefined;
          }
        }

        if (b.rect !== undefined) {
          b.rect.remove();
          b.rect = undefined;
        }

        b.rect = this.getBoxRect(b) as SVGRectWithColor;
        this.curbox = b;

        b.setColor(hcolor);
      });

      b.addEventListener("pointerleave", (e: Event) => {
        if (b.rect) {
          b.rect.remove();
          b.rect = undefined;
        }

        if (this.curbox === b) {
          this.curbox = undefined;
        }

        b.setColor(color);
      });

      style.textContent = `
        .${cls}:hover {
          background-color : orange;
          fill:orange;stroke-width:2
        }
      `;
      b.appendChild(style);
      b.setAttribute("class", cls);

      return b;
    };

    const pad = 5;

    if (this.sarea) {
      box(cx, cy, [sz, sz], -1, -1, -1);
    }

    box(cx - sz * 0.75 - pad, cy, [sz * 0.5, sz], false, 0.5, "l");
    box(cx - sz * 1.2 - pad, cy, [sz * 0.25, sz], false, 0.3, "l");

    box(cx + sz * 0.75 + pad, cy, [sz * 0.5, sz], false, 0.5, "r");
    box(cx + sz * 1.2 + pad, cy, [sz * 0.25, sz], false, 0.7, "r");

    box(cx, cy - sz * 0.75 - pad, [sz, sz * 0.5], true, 0.5, "t");
    box(cx, cy - sz * 1.2 - pad, [sz, sz * 0.25], true, 0.3, "t");

    box(cx, cy + sz * 0.75 + pad, [sz, sz * 0.5], true, 0.5, "b");
    box(cx, cy + sz * 1.2 + pad, [sz, sz * 0.25], true, 0.7, "b");
  }

  getActiveBox(x: number, y: number) {
    for (const n of this.boxes) {
      if (n.hasAttribute?.("is_box")) {
        const rect = n.getClientRects()[0];

        if (x >= rect.x && y >= rect.y && x < rect.x + rect.width && y < rect.y + rect.height) {
          return n;
        }
      }
    }
  }

  on_drag(e: PointerEvent) {
    this.on_pointermove(e);
  }

  on_dragend(e: PointerEvent) {
    this.on_pointerup(e);
  }

  override on_pointermove(e: PointerEvent) {
    let wid = 55;
    const color = "rgb(200, 200, 200, 0.7)";

    // Boxes are fed events by hand so touch works: pushModalLight routes touch to
    // pointer events only when no touch handlers are present.
    const n = this.getActiveBox(e.x, e.y);

    if (n !== undefined) {
      n.setColor(this.hcolor);
    }

    if (this.boxes.active !== undefined && this.boxes.active !== n) {
      this.boxes.active.setColor(this.color);
      this.boxes.active.dispatchEvent(new PointerEvent("pointerleave", e));
    }

    if (n !== undefined) {
      n.dispatchEvent(new PointerEvent("pointerenter", e));
    }

    this.boxes.active = n;
    if (this.sarea === undefined) {
      return;
    }

    if (this.cursorbox === undefined) {
      wid = 25;
      this.cursorbox = this.overdraw!.rect([e.x - wid * 0.5, e.y - wid * 0.5], [wid, wid], color);
      this.cursorbox.style.pointerEvents = "none";
    } else {
      this.cursorbox.setAttribute("x", "" + (e.x - wid * 0.5));
      this.cursorbox.setAttribute("y", "" + (e.y - wid * 0.5));
    }
  }

  override on_pointerup(e: PointerEvent) {
    console.log("e.button", e.button, e, e.x, e.y, this.getActiveBox(e.x, e.y));

    if (e.button) {
      e.stopPropagation();
      e.preventDefault();
    } else {
      const box = this.getActiveBox(e.x, e.y);

      if (box !== undefined) {
        box.onclick(e);
      }
    }

    this.finish();
  }

  override toolModalStart(ctx?: CTX) {
    super.toolModalStart(ctx);

    const screen = this.screen;

    this.overdraw!.clear();

    if (this.sarea && !this.excludeAreas.has(this.sarea)) {
      const sa = this.sarea;
      const box = this.overdraw!.rect(
        sa.pos as unknown as number[],
        sa.size as unknown as number[],
        "rgba(100, 100, 100, 0.5)"
      );

      box.style.pointerEvents = "none";
    }

    for (const sa of screen.sareas) {
      if (this.excludeAreas.has(sa)) {
        continue;
      }

      this.makeBoxes(sa);
    }
  }

  override on_keydown(e: KeyboardEvent) {
    switch (e.keyCode) {
      case keymap["Escape"]:
      case keymap["Enter"]:
      case keymap["Space"]:
        this.finish();
        break;
    }
  }
}

export class AreaMoveAttachTool<CTX extends IContextBase = IContextBase> extends AreaDragTool<CTX> {
  first: boolean;
  mpos: Vector2;
  start_mpos2: Vector2;
  start_pos: Vector2;

  constructor(screen: Screen<CTX>, sarea: ScreenArea<CTX>, mpos: Vector2 | number[]) {
    super(screen, sarea, mpos);

    this.excludeAreas = new Set([sarea]);

    this.dropArea = true;
    this.first = true;
    this.sarea = sarea;
    this.mpos = new Vector2(mpos);
    this.start_mpos2 = new Vector2(mpos);
    this.start_pos = new Vector2(sarea.pos);
  }

  override on_pointermove(e: PointerEvent) {
    const dx = e.x - (this.start_mpos2[0] as number);
    const dy = e.y - (this.start_mpos2[1] as number);

    const sarea = this.sarea!;

    if (this.first) {
      this.start_mpos2 = new Vector2([e.x, e.y]);
      this.first = false;
      return;
    }

    sarea.pos[0] = (this.start_pos[0] as number) + dx;
    sarea.pos[1] = (this.start_pos[1] as number) + dy;

    sarea.loadFromPosSize();

    this.mpos.loadXY(e.x, e.y);
    super.on_pointermove(e);
  }

  override on_pointerup(e: PointerEvent) {
    super.on_pointerup(e);
  }

  on_pointerdown(e: PointerEvent) {
    // Presses during a drag are swallowed; the drag ends on pointerup.
  }

  override on_keydown(e: KeyboardEvent) {
    super.on_keydown(e);
  }
}

/**
 * Returns the innermost element under the pointer that carries a `title`, descending through
 * shadow roots.
 *
 * `screen.pickElement` is not used here because it returns the innermost `UIBase`. An app whose
 * panes draw raw DOM inside a shadow root puts most of its tooltips on plain elements, which that
 * result never reaches. Keeping the last titled node found on the way down also means a widget
 * with untitled innards falls back to the widget's own title.
 */
function pickDescribed(x: number, y: number): Element | undefined {
  let node: Element | null = document.elementFromPoint(x, y);
  let found: Element | undefined;
  const seen = new Set<Element>();

  while (node && !seen.has(node)) {
    seen.add(node);

    if (typeof (node as HTMLElement).title === "string" && (node as HTMLElement).title) {
      found = node;
    }

    const root = (node as unknown as { shadow?: ShadowRoot }).shadow ?? node.shadowRoot;
    node = root ? root.elementFromPoint(x, y) : null;
  }

  return found;
}

/** How long a tooltip stays up once nothing is holding it, in milliseconds. */
const LINGER_MS = 30000;

/**
 * Closes the tooltip that `lingerTooltip` is currently keeping up, clearing its listener and
 * timer as well. Undefined when no tooltip is lingering. Only one lingers at a time, so
 * `lingerTooltip` calls this before it starts another.
 */
let lingering: { close: () => void } | undefined;

/** Take down a lingering tooltip, if there is one. Safe to call when there is not. */
function endLingeringTooltip(): void {
  lingering?.close();
}

/**
 * Keeps `tip` on screen after the pointers that raised it have lifted. It closes on the following
 * pointerdown, or after `LINGER_MS` (whichever comes first).
 *
 * Note: does not inhibit the event from reaching other consumers.
 */
function lingerTooltip(tip: { end(): void }): void {
  endLingeringTooltip();

  let timer: ReturnType<typeof setTimeout>;

  const close = () => {
    window.removeEventListener("pointerdown", onDown, true);
    clearTimeout(timer);
    if (lingering === entry) {
      lingering = undefined;
    }
    tip.end();
  };

  const onDown = () => close();
  const entry = { close };

  window.addEventListener("pointerdown", onDown, { capture: true, passive: true });
  timer = setTimeout(close, LINGER_MS);

  lingering = entry;
}

export class ToolTipViewer<CTX extends IContextBase = IContextBase> extends ToolBase<CTX> {
  tooltip: ToolTip<CTX> | undefined;
  element: Element | undefined;

  /** Pointer ids currently down. */
  private down = new Set<number>();
  /**
   * detected via the presence of multiple pointer ids.
   */
  private multitouch = false;

  constructor(screen: Screen<CTX>) {
    super(screen);

    this.tooltip = undefined;
    this.element = undefined;

    // Close any lingering tooltip
    endLingeringTooltip();
  }

  static tooldef() {
    return {
      uiname     : "Help Tool",
      toolpath   : "screen.help_picker",
      icon       : ui_base.Icons.HELP,
      description: "view tooltips",
      is_modal   : true,
      undoflag   : UndoFlags.NO_UNDO,
      flag       : 0,
      inputs     : {},
      outputs    : {},
    };
  }

  override on_pointermove(e: PointerEvent) {
    this.pick(e);
  }

  on_pointerdown(e: PointerEvent) {
    this.down.add(e.pointerId);
    if (this.down.size > 1) {
      this.multitouch = true;
    }
    this.pick(e);
  }

  /**
   * Lifting off a titled element closes that tooltip and leaves the tool running, so a touch user
   * can press one control after another without re-arming. Lifting off empty space ends the tool,
   * which is how a touch user leaves it — a phone has no Escape key.
   *
   * A two-finger gesture is the exception, and the only case where the tooltip outlives the press.
   * A tooltip held with one finger sits under the hand that raised it, so lifting to read it would
   * close it under the rule above. When the last of two or more fingers comes up, the tool ends and
   * passes the tooltip to {@link lingerTooltip}, which keeps it up for `LINGER_MS`. The tool stops
   * being modal instead of holding the tooltip, so the press that dismisses it is not blocked.
   */
  override on_pointerup(e: PointerEvent) {
    this.down.delete(e.pointerId);

    if (this.multitouch && this.tooltip !== undefined) {
      // The gesture ends when the last finger lifts; while one is still down, nothing changes.
      if (this.down.size === 0) {
        this.strand();
      }
    } else if (this.element === undefined) {
      this.finish();
    } else {
      this.clear();
    }

    e.preventDefault();
    e.stopPropagation();
  }

  /** Hands the tooltip to {@link lingerTooltip} and ends the tool. */
  private strand() {
    const tip = this.tooltip;
    // Cleared before `finish` so the `clear` it calls does not end the tooltip being handed off.
    this.tooltip = undefined;
    this.element = undefined;
    this.multitouch = false;
    this.down.clear();

    this.finish();

    if (tip) {
      lingerTooltip(tip);
    }
  }

  override finish() {
    this.clear();
    super.finish();
  }

  /** Ends the current tooltip. */
  clear() {
    this.tooltip?.end();
    this.tooltip = undefined;
    this.element = undefined;
  }

  override on_keydown(e: KeyboardEvent) {
    switch (e.keyCode) {
      case keymap.Escape:
      case keymap.Enter:
      case keymap.Space:
        this.finish();
        break;
    }
  }

  pick(e: PointerEvent) {
    const x = e.x;
    const y = e.y;

    const ele = pickDescribed(x, y);

    if (ele !== this.element) {
      // Moving to a different element (or to one with no title) ends the current tooltip first.
      this.clear();

      if (ele) {
        this.element = ele;
        this.tooltip = ToolTip.show((ele as HTMLElement).title, this.screen, x, y, Infinity);
      }
    }

    e.preventDefault();
    e.stopPropagation();
  }
}
