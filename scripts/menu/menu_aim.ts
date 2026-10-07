// Internal to the menu: imported by menu.ts and never `export *`-ed, so none of this reaches
// the pathux barrel

export interface AimPoint {
  x: number;
  y: number;
}

/** The apex, then the two corners of the submenu's near edge, in client coordinates. */
export type AimTriangle = [AimPoint, AimPoint, AimPoint];

/** How far the apex sits behind the pointer, so a move straight at the submenu stays inside. */
const APEX_SLACK = 4;

/**
 * The safe triangle from the pointer's last position on a submenu row to the submenu's near
 * edge. While the pointer stays inside it, it is on its way to the submenu, and the rows it
 * crosses do not take the hover.
 */
export function aimTriangle(apex: AimPoint, submenu: DOMRect): AimTriangle {
  const toRight = submenu.left + submenu.width * 0.5 >= apex.x;
  const edgeX = toRight ? submenu.left : submenu.right;
  const slack = toRight ? -APEX_SLACK : APEX_SLACK;

  return [
    { x: apex.x + slack, y: apex.y },
    { x: edgeX, y: submenu.top },
    { x: edgeX, y: submenu.bottom },
  ];
}

/** Whether `p` lies inside `tri` or on its boundary. */
export function insideAimTriangle(p: AimPoint, tri: AimTriangle): boolean {
  const [a, b, c] = tri;
  const side = (u: AimPoint, v: AimPoint) => (v.x - u.x) * (p.y - u.y) - (v.y - u.y) * (p.x - u.x);

  const d1 = side(a, b);
  const d2 = side(b, c);
  const d3 = side(c, a);

  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;

  return !(hasNeg && hasPos);
}

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Draws `tri` on a full-window overlay that ignores the pointer, creating the overlay when
 * `svg` is undefined. Returns the overlay so the caller can redraw or remove it.
 */
export function drawAimTriangle(tri: AimTriangle, svg?: SVGSVGElement): SVGSVGElement {
  if (!svg) {
    svg = document.createElementNS(SVG_NS, "svg");
    svg.style.position = "fixed";
    svg.style.left = "0px";
    svg.style.top = "0px";
    svg.style.width = "100vw";
    svg.style.height = "100vh";
    svg.style.pointerEvents = "none";
    // Above everything: a menu floats inside a popup, which outranks ZIndexes.menu
    svg.style.zIndex = "2147483647";

    const poly = document.createElementNS(SVG_NS, "polygon");
    poly.setAttribute("fill", "rgba(255, 64, 64, 0.25)");
    poly.setAttribute("stroke", "rgba(255, 32, 32, 0.9)");
    poly.setAttribute("stroke-width", "1");
    svg.appendChild(poly);

    document.body.appendChild(svg);
  }

  const points = tri.map((p) => `${p.x},${p.y}`).join(" ");
  svg.firstElementChild!.setAttribute("points", points);

  return svg;
}
