import { UIBase } from "../core/ui_base";
import type { UIBaseDefinition } from "../core/ui_base";
import { IContextBase } from "../core/context_base";
import { CSSFont } from "../core/cssfont";
import { css2color } from "../core/ui_theme";
import { t } from "../core/theme_schema";
import { keymap } from "../path-controller/util/events";
import type { GalleryMode } from "./gallery_row";

/** Colors one state of the button reads out of the `iconbutton` style class. */
interface ButtonColors {
  "background-color": string;
  "border-color": string;
}

/** Side of the square the glyphs are laid out on, before scaling to the button. */
const GLYPH_UNITS = 16;

/**
 * Draws the glyph for `mode` filling a `size`-wide square at the origin.
 *
 * Neither glyph comes from an icon sheet: the sheet is supplied by the host application, and the
 * gallery cannot add tiles to a sheet it does not own.
 */
function drawGlyph(
  g: CanvasRenderingContext2D,
  mode: GalleryMode,
  size: number,
  color: string
): void {
  const s = size / GLYPH_UNITS;

  g.fillStyle = color;
  g.beginPath();
  if (mode === "grid") {
    // four squares rather than nine, which turn to mush at sixteen pixels
    for (const [x, y] of [
      [1, 1],
      [9, 1],
      [1, 9],
      [9, 9],
    ]) {
      g.roundRect(x * s, y * s, 6 * s, 6 * s, 1.5 * s);
    }
  } else {
    for (const y of [1, 9]) {
      g.roundRect(1 * s, y * s, 6 * s, 6 * s, 1.5 * s);
    }
  }
  g.fill();

  if (mode === "grid") {
    return;
  }

  g.strokeStyle = color;
  g.lineWidth = 1.5 * s;
  g.lineCap = "round";
  g.beginPath();
  for (const y of [1, 9]) {
    // the second line is shorter, which is what a wrapped name looks like
    g.moveTo(9 * s, (y + 1.75) * s);
    g.lineTo(15 * s, (y + 1.75) * s);
    g.moveTo(9 * s, (y + 4.25) * s);
    g.lineTo(13 * s, (y + 4.25) * s);
  }
  g.stroke();
}

/**
 * One half of the gallery's grid/list toggle: a small canvas-drawn icon button that stays
 * depressed while its mode is the one in use.
 *
 * It reads the `iconbutton` style class rather than one of its own, so an application that has
 * themed its icon buttons gets a matching toggle without doing anything.
 */
export class GalleryModeButton<CTX extends IContextBase = IContextBase> extends UIBase<
  CTX,
  undefined,
  "GalleryModeButton"
> {
  dom: HTMLCanvasElement;
  g: CanvasRenderingContext2D;

  /** Which layout pressing the button asks for. Set before the button is added. */
  mode: GalleryMode = "grid";

  private _selected = false;
  private _hover = false;
  private _size = 22;

  constructor() {
    super();

    this.dom = document.createElement("canvas");
    this.g = this.dom.getContext("2d")!;
    this.shadow.appendChild(this.dom);

    this.addEventListener("pointerenter", () => {
      this._hover = true;
      this.redraw();
    });
    this.addEventListener("pointerleave", () => {
      this._hover = false;
      this.redraw();
    });
    this.addEventListener("keydown", (e) => this.onKeyDown(e));
  }

  static define(): UIBaseDefinition {
    return {
      tagname: "gallerymodebutton-x",
      style  : "iconbutton",
      theme: {
        "background-color": t.color,
        "border-color"    : t.color,
        "border-radius"   : t.number,
        "border-width"    : t.number,
        depressed: {
          "background-color": t.color,
          "border-color"    : t.color,
        },
        highlight: {
          "background-color": t.color,
          "border-color"    : t.color,
        },
      },
    };
  }

  init() {
    super.init();

    this.style.display = "block";
    this.tabIndex = 0;
    this.dom.style.padding = this.dom.style.margin = "0px";
    this.setSize(this._size);
  }

  /** Whether this button's mode is the one the gallery is drawing in. */
  get selected(): boolean {
    return this._selected;
  }

  set selected(state: boolean) {
    if (state !== this._selected) {
      this._selected = state;
      this.redraw();
    }
  }

  /** Button side in CSS pixels. The glyph is inset within it. */
  setSize(size: number): void {
    this._size = size;

    const dpi = this.getDPI();
    this.dom.width = this.dom.height = Math.max(1, Math.floor(size * dpi));
    this.dom.style.width = this.dom.style.height = size + "px";
    this.style.width = this.style.height = size + "px";

    this.redraw();
  }

  redraw(): void {
    const g = this.g;
    const dpi = this.getDPI();
    const size = this.dom.width;

    const colors = this.stateColors();
    const radius = (this.getDefault("border-radius") as number) * dpi;
    const borderWidth = (this.getDefault("border-width") as number) * dpi;

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, size, size);

    const inset = borderWidth * 0.5;
    g.beginPath();
    g.roundRect(inset, inset, size - borderWidth, size - borderWidth, Math.max(0, radius));
    g.fillStyle = colors["background-color"];
    g.fill();
    if (borderWidth > 0) {
      g.strokeStyle = colors["border-color"];
      g.lineWidth = borderWidth;
      g.stroke();
    }

    const glyph = size * 0.72;
    g.save();
    g.translate((size - glyph) * 0.5, (size - glyph) * 0.5);
    drawGlyph(g, this.mode, glyph, this.glyphColor(colors["background-color"]));
    g.restore();
  }

  private stateColors(): ButtonColors {
    if (this._selected) {
      return this.getDefault("depressed") as unknown as ButtonColors;
    }
    if (this._hover) {
      return this.getDefault("highlight") as unknown as ButtonColors;
    }
    return {
      "background-color": this.getDefault("background-color"),
      "border-color"    : this.getDefault("border-color"),
    };
  }

  /**
   * The theme's text color, flipped to white where the depressed fill is too dark to read it
   * against. Themes give the depressed state a dark fill without giving it a text color, so the
   * glyph would otherwise disappear exactly when the mode is the one in use.
   */
  private glyphColor(background: string): string {
    const font = this.getDefault("DefaultText") as unknown as CSSFont | undefined;
    const ink = font?.color || "black";

    const bg = css2color(background);
    const alpha = bg[3] ?? 1;
    if (alpha < 0.5) {
      return ink;
    }

    const luma = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2];
    const dark = css2color(ink);
    const inkLuma = 0.2126 * dark[0] + 0.7152 * dark[1] + 0.0722 * dark[2];

    return Math.abs(luma - inkLuma) < 0.4 ? (luma < 0.5 ? "white" : "black") : ink;
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.keyCode !== keymap["Enter"] && e.keyCode !== keymap["Space"]) {
      return;
    }

    // synthesised rather than handled separately, so a listener only has to watch for a click
    this.click();
    e.preventDefault();
    e.stopPropagation();
  }
}

UIBase.internalRegister(GalleryModeButton);
