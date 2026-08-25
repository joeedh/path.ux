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

  /** Draws the segment in the selected color and width. */
  selected?: boolean;
}

/** Horizontal reach of a segment's control points; its endpoints stay level. */
function linkBulge(s: LinkSegment): number {
  return Math.max(24, Math.abs(s.x2 - s.x1) * 0.5);
}

/** The point at parameter t along a segment's curve, in screen space. */
export function linkCurvePoint(s: LinkSegment, t: number): [number, number] {
  const bulge = linkBulge(s);
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;

  return [
    a * s.x1 + b * (s.x1 + bulge) + c * (s.x2 - bulge) + d * s.x2,
    a * s.y1 + b * s.y1 + c * s.y2 + d * s.y2,
  ];
}

/**
 * Screen-space distance from a point to a segment's curve, sampled rather than
 * solved; the error is well under the pick radius the view tests it against.
 */
export function linkDistance(s: LinkSegment, x: number, y: number, samples = 24): number {
  let best = Infinity;
  for (let i = 0; i <= samples; i++) {
    const p = linkCurvePoint(s, i / samples);
    best = Math.min(best, Math.hypot(p[0] - x, p[1] - y));
  }
  return best;
}

/**
 * Draws the links beneath the node frames (in screen space). The owning editor
 * projects socket anchors, passes finished segments to `drawLinks`, and
 * repaints whenever the transform or the topology changes. Drawing is skipped
 * when the 2D context is absent (happy-dom provides none); sizing still runs.
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
        LinkColor      : t.string,
        LinkWidth      : t.number,
        LinkSelectColor: t.string,
        LinkSelectWidth: t.number,
      },
    };
  }

  /** Matches the canvas backing store to the given CSS size at `dpi`. */
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

    const color = (this.getDefault("LinkColor") as string) ?? "#aaaaaa";
    const width = (this.getDefault("LinkWidth") as number) ?? 2;
    const selColor = (this.getDefault("LinkSelectColor") as string) ?? "#e8930c";
    const selWidth = (this.getDefault("LinkSelectWidth") as number) ?? width + 2;

    // Selected links paint last so a highlighted one is never buried.
    for (const pass of [false, true]) {
      g.strokeStyle = pass ? selColor : color;
      g.lineWidth = pass ? selWidth : width;

      for (const s of segments) {
        if ((s.selected === true) !== pass) {
          continue;
        }
        const bulge = linkBulge(s);

        g.beginPath();
        g.moveTo(s.x1, s.y1);
        g.bezierCurveTo(s.x1 + bulge, s.y1, s.x2 - bulge, s.y2, s.x2, s.y2);
        g.stroke();
      }
    }
  }
}
UIBase.internalRegister(LinkCanvas);
