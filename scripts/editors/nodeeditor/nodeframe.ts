import { UIBase } from "../../core/ui_base";
import type { UIBaseDefinition } from "../../core/ui_base";
import { Container } from "../../core/ui";
import { IContextBase } from "../../core/context_base";
import { t } from "../../core/theme_schema";
import type { CSSFont } from "../../core/cssfont";
import { Vector2 } from "../../path-controller/util/vectormath";
import type { Node as GraphNode } from "../../graph/node";
import { nodePropKeys } from "../../graph/node";
import type { SocketDir } from "../../graph/graph_types";
import { propEditRow } from "./groupui";

/** Graph-space geometry a frame's socket anchors derive from. */
export interface FrameMetrics {
  x: number;
  y: number;
  width: number;
  headerHeight: number;
  socketRowHeight: number;
}

/**
 * Graph-space anchor of a socket terminal: the frame's left edge for an input,
 * the right edge for an output, centered on the socket's row. Input and output
 * rows share indices, both starting directly under the header.
 */
export function socketAnchor(m: FrameMetrics, dir: SocketDir, row: number): [number, number] {
  const x = dir === "in" ? m.x : m.x + m.width;
  const y = m.y + m.headerHeight + (row + 0.5) * m.socketRowHeight;
  return [x, y];
}

/** Row index of the socket named key on its side, or -1 when absent. */
export function socketRow(node: GraphNode, dir: SocketDir, key: string): number {
  return Object.keys(dir === "in" ? node.inputs : node.outputs).indexOf(key);
}

/**
 * One node's on-screen frame: a header row carrying the node's name, socket
 * terminals down both sides, and the node's own createUI as the body. The
 * frame positions itself in graph coordinates — the pan/zoom content's CSS
 * matrix maps those to the screen. The frame owns no drag: a press outside
 * the body reports through onMoveStart, and the owning view spawns the modal
 * ToolOp that drives previewPos and getScale. A completed drag reaches the
 * document only through onMoveCommit; the owning editor dispatches the op.
 */
export class NodeFrame<CTX extends IContextBase = IContextBase> extends Container<
  CTX,
  "NodeFrame"
> {
  node!: GraphNode;
  selected = false;

  /** Graph-space position while a drag is live; undefined at rest. */
  previewPos: Vector2 | undefined = undefined;

  getScale: () => number = () => 1;
  onSelect?: (frame: NodeFrame<CTX>, e: PointerEvent) => void;
  onMoveStart?: (frame: NodeFrame<CTX>, e: PointerEvent) => void;
  onMovePreview?: (frame: NodeFrame<CTX>) => void;
  onMoveCommit?: (frame: NodeFrame<CTX>, x: number, y: number) => void;
  onSocketDown?: (frame: NodeFrame<CTX>, key: string, dir: SocketDir, e: PointerEvent) => void;

  /** Extra rows the owning view appends beneath the node's own createUI. */
  buildExtraUI?: (frame: NodeFrame<CTX>, body: Container<CTX>) => void;

  /** The node's datapath. When set, the body renders an editable row per node
   *  prop and per unconnected input default, writing through the datapath. */
  get nodePath(): string {
    return this._nodePath;
  }

  set nodePath(path: string) {
    if (path === this._nodePath) {
      return;
    }
    this._nodePath = path;
    // Re-arms watchPath on the next update; the view assigns the path after init.
    this.clearPathWatches();
  }

  private _nodePath = "";
  private _header!: HTMLDivElement;
  private _rows: HTMLDivElement[] = [];
  private _body: Container<CTX> | undefined;
  private _propsRoot: HTMLDivElement | undefined;

  static define(): UIBaseDefinition {
    return {
      tagname: "nodeframe-x",
      style  : "nodeframe",
      theme: {
        Width             : t.number,
        HeaderHeight      : t.number,
        SocketRowHeight   : t.number,
        "background-color": t.color,
        "border-color"    : t.color,
        "border-radius"   : t.number,
        HeaderBG          : t.color,
        SelectOutline     : t.color,
        DefaultText       : t.font,
        SocketText        : t.font,
      },
    };
  }

  setNode(node: GraphNode) {
    this.node = node;
  }

  init() {
    super.init();

    this.style.position = "absolute";
    this.style.width = this.metrics().width + "px";
    this.style.userSelect = "none";

    this._buildUI();
    this.setCSS();
    this.syncPosition();
  }

  /** Graph-space geometry for this frame's socket anchors. */
  metrics(): FrameMetrics {
    const pos = this.previewPos ?? this.node.pos;
    return {
      x              : pos[0],
      y              : pos[1],
      width          : this.getDefault("Width") as number,
      headerHeight   : this.getDefault("HeaderHeight") as number,
      socketRowHeight: this.getDefault("SocketRowHeight") as number,
    };
  }

  /** Graph-space bounds, sized from the socket rows; body height is excluded. */
  rect(): { x: number; y: number; width: number; height: number } {
    const m = this.metrics();
    const rows = Math.max(
      Object.keys(this.node.inputs).length,
      Object.keys(this.node.outputs).length
    );
    return {
      x     : m.x,
      y     : m.y,
      width : m.width,
      height: m.headerHeight + rows * m.socketRowHeight,
    };
  }

  /** Writes the frame's graph-space position (preview during a drag) to CSS. */
  syncPosition() {
    const pos = this.previewPos ?? this.node.pos;
    this.style.left = pos[0] + "px";
    this.style.top = pos[1] + "px";
  }

  setSelected(sel: boolean) {
    this.selected = sel;
    this.style.outline = sel ? `2px solid ${this.getDefault("SelectOutline")}` : "";
  }

  /** Applies the themed colors and fonts; a live theme edit re-runs it. */
  setCSS() {
    super.setCSS();

    const radius = this.getDefault("border-radius") as number;
    // Container's styletag targets div.containerx, which never matches the host.
    this.style.backgroundColor = this.getDefault("background-color") as string;
    this.style.border = `1px solid ${this.getDefault("border-color")}`;
    this.style.borderRadius = radius + "px";
    this.style.outline = this.selected ? `2px solid ${this.getDefault("SelectOutline")}` : "";

    if (this._header === undefined) {
      return;
    }

    const m = this.metrics();
    const font = this.getDefault("DefaultText") as CSSFont;
    this._header.style.font = font.genCSS();
    this._header.style.color = font.color;
    // The font shorthand resets line-height, so the row centering is re-applied after it.
    this._header.style.lineHeight = m.headerHeight + "px";
    this._header.style.background = this.getDefault("HeaderBG") as string;
    this._header.style.borderRadius = `${radius}px ${radius}px 0 0`;

    const rowFont = this.getDefault("SocketText") as CSSFont;
    for (const row of this._rows) {
      row.style.font = rowFont.genCSS();
      row.style.color = rowFont.color;
      row.style.lineHeight = m.socketRowHeight + "px";
    }
  }

  /** Watches the node's own path for header changes; prop rows own their values. */
  override watchPath() {
    super.watchPath();
    if (this.nodePath !== "") {
      this.addPathWatch(this.nodePath, { onChange: () => this._syncHeader() });
    }
  }

  /** Rebuilds header text and socket rows; used after a rename or type swap. */
  syncContents() {
    this._syncHeader();
    this._rebuildPropRows();
  }

  private _syncHeader() {
    if (this._header === undefined) {
      return;
    }
    this._header.textContent = this.node.getUIName();
    this._header.title = this.node.getDescription() || this.node.getUIName();
  }

  /** Rebuilds the editable prop/default rows; a connected input contributes none. */
  private _rebuildPropRows() {
    const root = this._propsRoot;
    if (root === undefined) {
      return;
    }
    // Removed one widget at a time so each row tears down its path watches.
    while (root.firstChild !== null) {
      (root.firstChild as ChildNode).remove();
    }
    if (this.nodePath === "") {
      return;
    }

    for (const key of nodePropKeys(this.node)) {
      if ((this.node.inputs[key]?.edges.length ?? 0) > 0) {
        continue;
      }
      const path = `${this.nodePath}.props['${key}'].value`;
      const socket = key in this.node.props ? undefined : this.node.inputs[key];
      const row = propEditRow(this.ctx, key, path, socket);
      row.parentWidget = this._body!;
      root.appendChild(row);
    }
  }

  private _buildUI() {
    const m = this.metrics();

    this._header = document.createElement("div");
    this._header.textContent = this.node.getUIName();
    this._header.title = this.node.getDescription() || this.node.getUIName();
    this._header.style.cssText =
      `height: ${m.headerHeight}px; line-height: ${m.headerHeight}px; ` +
      "padding: 0 6px; overflow: hidden; white-space: nowrap;";
    this.shadow.appendChild(this._header);

    this.style.cursor = "move";
    this._wirePress(this);

    const inKeys = Object.keys(this.node.inputs);
    const outKeys = Object.keys(this.node.outputs);
    const rows = Math.max(inKeys.length, outKeys.length);

    for (let i = 0; i < rows; i++) {
      const row = document.createElement("div");
      // Positioned so each terminal dot can anchor to the frame's outer edge.
      row.style.cssText =
        `height: ${m.socketRowHeight}px; line-height: ${m.socketRowHeight}px; ` +
        "display: flex; justify-content: space-between; padding: 0 4px; position: relative;";

      row.appendChild(this._terminal(inKeys[i], "in"));
      row.appendChild(this._terminal(outKeys[i], "out"));
      this.shadow.appendChild(row);
      this._rows.push(row);
    }

    this._body = UIBase.createElement("container-x") as Container<CTX>;
    this._body.style.cursor = "auto";
    this._body.parentWidget = this;
    this.shadow.appendChild(this._body);
    this._body.ctx = this.ctx;
    this._body._init();

    this._propsRoot = document.createElement("div");
    this._propsRoot.className = "nodeframe-props";
    this._propsRoot.style.cssText =
      "display: flex; flex-direction: column; gap: 2px; padding: 2px 4px;";
    this._body.shadow.appendChild(this._propsRoot);
    this._rebuildPropRows();

    this.node.createUI(this._body);
    this.buildExtraUI?.(this, this._body);
  }

  /** The terminal dot for a socket, for the view to restyle during a drag. */
  terminalDot(key: string, dir: SocketDir): HTMLElement | undefined {
    const sel = `.nodeframe-terminal[data-socket-key="${key}"][data-socket-dir="${dir}"]`;
    return (this.shadow.querySelector(sel) as HTMLElement | null) ?? undefined;
  }

  /** A terminal dot plus name, or an empty spacer where this side has no row. */
  private _terminal(key: string | undefined, dir: SocketDir): HTMLSpanElement {
    const span = document.createElement("span");
    if (key === undefined) {
      return span;
    }

    const sock = dir === "in" ? this.node.inputs[key] : this.node.outputs[key];
    const color = typeof sock.color === "string" ? sock.color : "#ccc";
    const dot = document.createElement("span");
    dot.className = "nodeframe-terminal";
    dot.dataset.socketKey = key;
    dot.dataset.socketDir = dir;
    dot.title = `${key} (${sock.type})`;
    // Centered on the frame's outer edge, where socketAnchor and link-drop hit
    // testing place the terminal; -5px cancels the frame's 1px border.
    dot.style.cssText =
      "position: absolute; top: 50%; transform: translateY(-50%); " +
      "width: 8px; height: 8px; border-radius: 50%; " +
      `background: ${color}; ${dir === "in" ? "left" : "right"}: -5px;`;

    dot.addEventListener("pointerdown", (e: PointerEvent) => {
      if (e.button !== 0 || this.onSocketDown === undefined) {
        return;
      }
      e.preventDefault();
      // Keeps the press from selecting the frame or starting a box-select.
      e.stopPropagation();
      this.onSocketDown(this, key, dir, e);
    });

    const name = document.createElement("span");
    name.textContent = key;

    if (dir === "in") {
      span.appendChild(dot);
      span.appendChild(name);
    } else {
      span.appendChild(name);
      span.appendChild(dot);
    }
    return span;
  }

  private _wirePress(handle: HTMLElement) {
    handle.addEventListener("pointerdown", (e: PointerEvent) => {
      if (e.button !== 0) {
        return;
      }

      // Keeps the press from also starting the view's box-select.
      e.stopPropagation();
      this.onSelect?.(this, e);

      // A press inside the body belongs to the node's own widgets.
      if (this._body !== undefined && e.composedPath().includes(this._body)) {
        return;
      }

      e.preventDefault();
      this.onMoveStart?.(this, e);
    });
  }
}
UIBase.internalRegister(NodeFrame);
