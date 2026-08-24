import { UIBase } from "../core/ui_base";
import type { UIBaseDefinition } from "../core/ui_base";
import { Container } from "../core/ui";
import { IContextBase } from "../core/context_base";
import { t } from "../core/theme_schema";
import { Vector2 } from "../path-controller/util/vectormath";

export interface PanZoomRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A uniform scale plus screen-space translation between content and screen
 * coordinates: screen = content * scale + pan. Pure math, so it is testable
 * without a DOM; {@link PanZoomContainer} applies it as a CSS matrix.
 */
export class PanZoomTransform {
  scale = 1;
  pan = new Vector2([0, 0]);
  minScale = 0.1;
  maxScale = 8;

  /** The screen point a content point maps to. */
  project(p: readonly [number, number] | Vector2): Vector2 {
    return new Vector2([p[0] * this.scale + this.pan[0], p[1] * this.scale + this.pan[1]]);
  }

  /** The content point a screen point maps to. */
  unproject(p: readonly [number, number] | Vector2): Vector2 {
    return new Vector2([(p[0] - this.pan[0]) / this.scale, (p[1] - this.pan[1]) / this.scale]);
  }

  panBy(dx: number, dy: number): this {
    this.pan[0] += dx;
    this.pan[1] += dy;
    return this;
  }

  /** Sets the (clamped) scale while keeping the screen point center fixed. */
  setScale(scale: number, center: readonly [number, number] | Vector2): this {
    const s = Math.min(Math.max(scale, this.minScale), this.maxScale);
    const k = s / this.scale;

    this.pan[0] = center[0] - (center[0] - this.pan[0]) * k;
    this.pan[1] = center[1] - (center[1] - this.pan[1]) * k;
    this.scale = s;

    return this;
  }

  zoomBy(factor: number, center: readonly [number, number] | Vector2): this {
    return this.setScale(this.scale * factor, center);
  }

  /** Fits rect (content space) inside the view and centers it. */
  zoomToRect(rect: PanZoomRect, viewWidth: number, viewHeight: number): this {
    const fit = Math.min(viewWidth / rect.width, viewHeight / rect.height);
    this.scale = Math.min(Math.max(fit, this.minScale), this.maxScale);

    this.pan[0] = viewWidth * 0.5 - (rect.x + rect.width * 0.5) * this.scale;
    this.pan[1] = viewHeight * 0.5 - (rect.y + rect.height * 0.5) * this.scale;

    return this;
  }

  toCSS(): string {
    return `matrix(${this.scale}, 0, 0, ${this.scale}, ${this.pan[0]}, ${this.pan[1]})`;
  }
}

/**
 * A container whose single content child pans and zooms under a CSS matrix.
 * Wheel zooms about the cursor; middle-drag (or space plus left-drag) pans.
 * Children go into {@link content}; every transform change dispatches a
 * "transform" CustomEvent whose detail carries the {@link PanZoomTransform}.
 */
export class PanZoomContainer<CTX extends IContextBase = IContextBase> extends Container<
  CTX,
  "PanZoomContainer"
> {
  content: Container<CTX>;
  transform = new PanZoomTransform();

  private _panning = false;
  private _spaceDown = false;
  private _lastX = 0;
  private _lastY = 0;
  private _onKey = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      this._spaceDown = e.type === "keydown";
    }
  };

  constructor() {
    super();

    this.content = UIBase.createElement("container-x") as Container<CTX>;
    this.content.parentWidget = this;
    this.shadow.appendChild(this.content);
  }

  static define(): UIBaseDefinition {
    return {
      tagname: "panzoom-x",
      style  : "panzoom",
      theme: {
        ZoomMin      : t.number,
        ZoomMax      : t.number,
        ZoomWheelRate: t.number,
      },
    };
  }

  init() {
    super.init();

    this.style.overflow = "hidden";
    this.style.position = "relative";

    this.content.ctx = this.ctx;
    this.content._init();
    this.content.style.position = "absolute";
    this.content.style.transformOrigin = "0 0";

    this.transform.minScale = this.getDefault("ZoomMin") as number;
    this.transform.maxScale = this.getDefault("ZoomMax") as number;

    this.addEventListener(
      "wheel",
      (e: WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const rate = this.getDefault("ZoomWheelRate") as number;
        this.transform.zoomBy(Math.pow(rate, -e.deltaY / 120), this._local(e));
        this._updateTransform();
      },
      { passive: false }
    );

    this.addEventListener("pointerdown", (e: PointerEvent) => {
      if (e.button === 1 || (e.button === 0 && this._spaceDown)) {
        this._panning = true;
        this._lastX = e.clientX;
        this._lastY = e.clientY;
        this.setPointerCapture(e.pointerId);
        e.preventDefault();
        e.stopPropagation();
      }
    });

    this.addEventListener("pointermove", (e: PointerEvent) => {
      if (!this._panning) {
        return;
      }
      this.transform.panBy(e.clientX - this._lastX, e.clientY - this._lastY);
      this._lastX = e.clientX;
      this._lastY = e.clientY;
      this._updateTransform();
    });

    const endPan = (e: PointerEvent) => {
      if (this._panning) {
        this._panning = false;
        this.releasePointerCapture(e.pointerId);
      }
    };
    this.addEventListener("pointerup", endPan);
    this.addEventListener("pointercancel", endPan);

    // The listeners are on window so a held space bar is seen without focus.
    window.addEventListener("keydown", this._onKey);
    window.addEventListener("keyup", this._onKey);

    this._updateTransform();
    this.setCSS();
  }

  override remove() {
    window.removeEventListener("keydown", this._onKey);
    window.removeEventListener("keyup", this._onKey);
    super.remove();
  }

  /** The screen point (widget-local) a content point maps to. */
  project(p: readonly [number, number] | Vector2): Vector2 {
    return this.transform.project(p);
  }

  /** The content point a widget-local screen point maps to. */
  unproject(p: readonly [number, number] | Vector2): Vector2 {
    return this.transform.unproject(p);
  }

  /** Fits rect (content space) inside the widget's current bounds. */
  zoomToRect(rect: PanZoomRect) {
    const r = this.getBoundingClientRect();
    this.transform.zoomToRect(rect, r.width, r.height);
    this._updateTransform();
  }

  private _local(e: MouseEvent): [number, number] {
    const r = this.getBoundingClientRect();
    return [e.clientX - r.x, e.clientY - r.y];
  }

  private _updateTransform() {
    this.content.style.transform = this.transform.toCSS();
    this.dispatchEvent(new CustomEvent("transform", { detail: { transform: this.transform } }));
  }

  override add(...args: unknown[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.content as any).add(...args);
  }

  override appendChild<T extends Node>(n: T): T {
    return this.content.appendChild(n);
  }
}
UIBase.internalRegister(PanZoomContainer);
