import { UIBase } from "../../core/ui_base";
import type { UIBaseDefinition } from "../../core/ui_base";
import { IContextBase } from "../../core/context_base";
import { t } from "../../core/theme_schema";

/** One link's endpoints in screen space, output terminal first. */
export interface LinkSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * The link underlay: a screen-space canvas beneath the node frames, redrawn
 * whenever the transform or the topology changes. The owning editor projects
 * socket anchors and hands finished segments to drawLinks. The 2D context is
 * nullable — happy-dom provides none — so every draw call degrades to a no-op
 * there while sizing and bookkeeping still run.
 */
export class LinkCanvas<CTX extends IContextBase = IContextBase> extends UIBase<
  CTX,
  unknown,
  "LinkCanvas"
> {
  canvas: HTMLCanvasElement;
  g: CanvasRenderingContext2D | null;

  constructor() {
    super();

    this.canvas = document.createElement("canvas");
    this.g = this.canvas.getContext("2d");
    this.shadow.appendChild(this.canvas);
  }

  static define(): UIBaseDefinition {
    return {
      tagname: "nodelinkcanvas-x",
      style  : "nodelinkcanvas",
      theme: {
        LinkColor: t.string,
        LinkWidth: t.number,
      },
    };
  }

  /** Matches the canvas backing store to the given CSS size at dpi. */
  resize(width: number, height: number, dpi = 1) {
    const w = Math.max(1, Math.round(width * dpi));
    const h = Math.max(1, Math.round(height * dpi));

    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.canvas.style.width = width + "px";
    this.canvas.style.height = height + "px";
  }

  /** Repaints every segment as a cubic bezier with horizontal tangents. */
  drawLinks(segments: LinkSegment[], dpi = 1) {
    const g = this.g;
    if (g === null) {
      return;
    }

    g.setTransform(dpi, 0, 0, dpi, 0, 0);
    g.clearRect(0, 0, this.canvas.width, this.canvas.height);

    g.strokeStyle = (this.getDefault("LinkColor") as string) ?? "#aaaaaa";
    g.lineWidth = (this.getDefault("LinkWidth") as number) ?? 2;

    for (const s of segments) {
      const bulge = Math.max(24, Math.abs(s.x2 - s.x1) * 0.5);

      g.beginPath();
      g.moveTo(s.x1, s.y1);
      g.bezierCurveTo(s.x1 + bulge, s.y1, s.x2 - bulge, s.y2, s.x2, s.y2);
      g.stroke();
    }
  }
}
UIBase.internalRegister(LinkCanvas);
