import { UIBase } from "../../core/ui_base";
import type { UIBaseDefinition } from "../../core/ui_base";
import { Container } from "../../core/ui";
import { IContextBase } from "../../core/context_base";
import { t } from "../../core/theme_schema";
import type { CSSFont } from "../../core/cssfont";
import { Vector2 } from "../../path-controller/util/vectormath";
import { Node as GraphNode, NodePropName, nodePropSocket } from "../../graph/node";
import type { SocketDir } from "../../graph/graph_types";
import { propEditRow } from "./groupui";

/** Graph-space geometry a frame's socket anchors derive from. */
export interface FrameMetrics {
  x: number;
  y: number;
  width: number;
  headerHeight: number;

  /** Height of a socket row carrying no inline editor. */
  socketRowHeight: number;

  /** Measured height per socket row; a row absent from it uses socketRowHeight. */
  rowHeights?: readonly number[];
}

/** One frame's destination in a completed move gesture. */
export interface FrameMove<CTX extends IContextBase = IContextBase> {
  frame: NodeFrame<CTX>;
  x: number;
  y: number;
}

/** The height of row, falling back to the uniform themed row height. */
function rowHeight(m: FrameMetrics, row: number): number {
  return m.rowHeights?.[row] ?? m.socketRowHeight;
}

/**
 * Graph-space anchor of a socket terminal: the frame's left edge for an input,
 * the right edge for an output, centered on the socket's row. Row indices run
 * over the frame's sockets as a whole, so row 0 sits directly under the header.
 */
export function socketAnchor(m: FrameMetrics, dir: SocketDir, row: number): [number, number] {
  const x = dir === "in" ? m.x : m.x + m.width;

  let y = m.y + m.headerHeight;
  for (let i = 0; i < row; i++) {
    y += rowHeight(m, i);
  }

  return [x, y + rowHeight(m, row) * 0.5];
}

/**
 * Row index of the socket named key, or -1 when absent. Outputs take the rows
 * directly under the header and inputs the rows after them, so every socket
 * owns a full-width row.
 */
export function socketRow(node: GraphNode, dir: SocketDir, key: string): number {
  const outs = Object.keys(node.outputs);
  if (dir === "out") {
    return outs.indexOf(key);
  }

  const row = Object.keys(node.inputs).indexOf(key);
  return row < 0 ? -1 : outs.length + row;
}

// we don't need the full pathux UIBase for this element
export class TerminalDot<CTX extends IContextBase = IContextBase> extends HTMLElement {
  private _showError = false;
  private _forceHighlight = false;
  lookupString: string;
  nodeframe: NodeFrame<CTX>;
  dom: this;

  constructor(
    nodeframe: NodeFrame<CTX>,
    lookupString: string,
    socketName: string,
    dir: string,
    color: string,
    tooltip: string
  ) {
    super();
    this.nodeframe = nodeframe;
    this.lookupString = lookupString;
    this.dom = this;
    this.style.display = "inline";
    this.ensureStyle(nodeframe);

    const dot = this.dom;
    dot.className = "nodeframe-terminal";
    dot.dataset.socketKey = socketName;
    dot.dataset.socketDir = dir;
    dot.title = tooltip;
    // Centered on the frame's outer edge where socketAnchor and link-drop hit
    // testing place the terminal; -5px cancels the frame's 1px border.
    dot.style.cssText =
      "position: absolute; top: 50%; transform: translateY(-50%); " +
      "width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto; " +
      `background: ${color}; ${dir === "in" ? "left" : "right"}: -5px;`;

    this.resetStyles();

    dot.addEventListener("pointerdown", (e: PointerEvent) => {
      if (e.button !== 0 || nodeframe.onSocketDown === undefined) {
        return;
      }
      e.preventDefault();
      // Keeps the press from selecting the frame or starting a box-select.
      e.stopPropagation();
      // non-socket prop keys should've been caught in calling functions
      nodeframe.onSocketDown(nodeframe, socketName, dir as SocketDir, e);
    });
  }

  connectedCallback() {
    this.nodeframe._onTerminalDotAdd(this);
  }
  disconnectedCallback() {
    this.nodeframe._onTerminalDotRemove(this);
  }

  private resetStyles() {
    while (this.dom.classList.length > 0) {
      this.dom.classList.remove(this.dom.classList[0]);
    }

    this.dom.classList.add("__node_socket");
    this.dom.classList.add("__node_socket_highlight");
    if (this._forceHighlight) {
      this.dom.classList.add("__node_socket_highlight_force");
    }
    if (this._showError) {
      this.dom.classList.add("__node_socket_highlight_error");
    }
  }

  get showError() {
    return this._showError;
  }

  set showError(value: boolean) {
    this._showError = value;
    this.resetStyles();
  }

  get forceHighlight() {
    return this._forceHighlight;
  }

  set forceHighlight(value: boolean) {
    this._forceHighlight = value;
    this.resetStyles();
  }

  ensureStyle(nodeframe: NodeFrame<CTX>) {
    // set up CSS to expand hit region around sockets
    const styleId = "pathux_graph__node_socket_style";
    const shadowRoot = nodeframe.shadowRoot!;
    if (!shadowRoot.getElementById(styleId)) {
      const expand = nodeframe.getDefault("SocketHitExpand", undefined, 10);
      const socketHigh = nodeframe.getDefault(
        "SocketHighlightColor",
        undefined,
        "rgba(200,200,255,0.25)"
      );
      const socketError = nodeframe.getDefault("SocketErrorColor", undefined, "#ff0000");

      const style = document.createElement("style");
      style.id = styleId;

      style.innerHTML = `

.__node_socket::before {
  content: '';
  position: absolute;
  cursor: auto;
  inset: -${expand}px;
}

.__node_socket_highlight:hover::after {
  content: '';
  border-radius: 50%;
  position: absolute;
  cursor: auto;
  background-color: ${socketHigh};
  inset: -2px;
}

.__node_socket_highlight_error::after {
  content: '';
  border-radius: 50%;
  position: absolute;
  cursor: auto;
  border: 2px solid ${socketError};
  inset: -2px;
}

.__node_socket_highlight_force::after {
  content: '';
  border-radius: 50%;
  position: absolute;
  cursor: auto;
  background-color: ${socketHigh};
  inset: -2px;
}

        `;
      shadowRoot.prepend(style);
    }
  }
}
customElements.define("nodeframe-graph-terminaldot-x", TerminalDot);

/**
 * Generic node UX container; draws background, a title bar, and sockets.
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

  /** Reports that a press on this frame released without becoming a drag. */
  onMoveClick?: (frame: NodeFrame<CTX>) => void;

  /** Reports the frames a live drag is moving; this frame leads them. */
  onMovePreview?: (frames: readonly NodeFrame<CTX>[]) => void;

  /** Reports a completed drag of this frame and any dragged alongside it. */
  onMoveCommit?: (moves: readonly FrameMove<CTX>[]) => void;
  onSocketDown?: (frame: NodeFrame<CTX>, key: string, dir: SocketDir, e: PointerEvent) => void;

  /** Extra rows the owning view appends beneath the node's own createUI. */
  buildExtraUI?: (frame: NodeFrame<CTX>, body: Container<CTX>) => void;

  /** The node's datapath. When set, an unconnected input's socket row carries an
   *  editor for its default and the body renders a row per node prop. */
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
  private _socketsRoot: HTMLDivElement | undefined;
  private _body: Container<CTX> | undefined;
  private _propsRoot: HTMLDivElement | undefined;
  private _terminalDotMap = new Map<string, TerminalDot<CTX>>();

  /** Which sockets the built rows cover, and which carry an inline editor. */
  private _rowSig = "";

  /** Which props the built body rows cover, and the path they bind under. */
  private _propSig = "";

  /** The inline default editors, kept so a rebuild can tear each one down. */
  private _editors: Container<CTX>[] = [];

  static define(): UIBaseDefinition {
    return {
      tagname: "nodeframe-x",
      style  : "nodeframe",
      theme: {
        Width               : t.number,
        HeaderHeight        : t.number,
        SocketRowHeight     : t.number,
        "background-color"  : t.color,
        "border-color"      : t.color,
        "border-radius"     : t.number,
        HeaderBG            : t.color,
        SelectOutline       : t.color,
        DefaultText         : t.font,
        SocketText          : t.font,
        SocketHitExpand     : t.number, // in pixels
        SocketHighlightColor: t.color,
        SocketErrorColor    : t.color,
      },
    };
  }

  public _onTerminalDotAdd(dot: TerminalDot<CTX>) {
    this._terminalDotMap.set(dot.lookupString, dot);
  }
  public _onTerminalDotRemove(dot: TerminalDot<CTX>) {
    if (this._terminalDotMap.get(dot.lookupString) === dot) {
      this._terminalDotMap.delete(dot.lookupString);
    }
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
    const uniform = this.getDefault("SocketRowHeight") as number;

    // An inline default editor makes its row taller than the themed height, so
    // the anchors follow what the rows actually measure. happy-dom reports 0.
    const rowHeights = this._rows.map((row) => row.offsetHeight || uniform);

    return {
      x              : pos[0],
      y              : pos[1],
      width          : this.getDefault("Width") as number,
      headerHeight   : this.getDefault("HeaderHeight") as number,
      socketRowHeight: uniform,
      rowHeights,
    };
  }

  /** Graph-space bounds, sized from the socket rows; body height is excluded. */
  rect(): { x: number; y: number; width: number; height: number } {
    const m = this.metrics();
    const rows =
      this._rows.length ||
      Object.keys(this.node.inputs).length + Object.keys(this.node.outputs).length;

    let height = m.headerHeight;
    for (let i = 0; i < rows; i++) {
      height += rowHeight(m, i);
    }

    return { x: m.x, y: m.y, width: m.width, height };
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

    this._styleRows();
  }

  /** Watches the node's own path for header changes; prop rows own their values. */
  override watchPath() {
    super.watchPath();
    if (this.nodePath !== "") {
      this.addPathWatch(this.nodePath, { onChange: () => this._syncHeader() });
    }
  }

  /** Syncs the header and rebuilds the socket and prop rows whose structure
   *  changed; a value edit reaches its widget through its own path watch, so
   *  only a rename, a type swap, or a link change costs a rebuild here. */
  syncContents() {
    this._syncHeader();
    this._rebuildSocketRows();
    this._rebuildPropRows();
  }

  private _syncHeader() {
    if (this._header === undefined) {
      return;
    }
    this._header.textContent = this.node.getUIName();
    this._header.title = this.node.getDescription() || this.node.getUIName();
  }

  private _styleRows() {
    const font = this.getDefault("SocketText") as CSSFont;
    const height = this.getDefault("SocketRowHeight") as number;

    for (const row of this._rows) {
      row.style.font = font.genCSS();
      row.style.color = font.color;
      row.style.lineHeight = height + "px";
    }
  }

  /** The sockets the rows cover, and which of them carry an inline editor. */
  private _rowSignature(inline: ReadonlySet<NodePropName>): string {
    const parts = [] as string[];
    for (const key of Object.keys(this.node.outputs)) {
      const sock = this.node.outputs[key];
      parts.push(`in:${key}${inline.has(sock.nodePropName) ? "=" : ""}`);
    }
    for (const key of Object.keys(this.node.inputs)) {
      const sock = this.node.inputs[key];
      parts.push(`out:${key}${inline.has(sock.nodePropName) ? "=" : ""}`);
    }
    return parts.join(",");
  }

  /** The inputs whose default is editable inline: unshadowed, and unconnected. */
  private _inlineKeys(): Set<NodePropName> {
    const keys = new Set<NodePropName>();
    if (this.nodePath === "") {
      return keys;
    }

    const allSocks = [this.node.inputs, this.node.outputs];
    for (const socks of allSocks) {
      for (const key in socks) {
        const sock = socks[key];
        if (
          sock.useDefaultValue &&
          sock.defaultIsEditable &&
          sock.edges.length === 0 &&
          !(key in this.node.props)
        ) {
          keys.add(sock.nodePropName);
        }
      }
    }
    return keys;
  }

  /** Rebuilds the socket rows when the sockets or their inline editors change. */
  private _rebuildSocketRows() {
    const root = this._socketsRoot;
    if (root === undefined) {
      return;
    }

    const inline = this._inlineKeys();
    const sig = this._rowSignature(inline);
    if (sig === this._rowSig) {
      return;
    }
    this._rowSig = sig;

    // Each editor is removed through its own widget, so it tears down its path
    // watches; dropping the row div around it would not.
    for (const editor of this._editors) {
      editor.remove();
    }
    this._editors = [];
    for (const row of this._rows) {
      row.remove();
    }
    this._rows = [];

    for (const key of Object.keys(this.node.outputs)) {
      const sock = this.node.outputs[key];
      this._rows.push(this._socketRow(sock.nodePropName, inline.has(sock.nodePropName)));
    }
    for (const key of Object.keys(this.node.inputs)) {
      const sock = this.node.inputs[key];
      this._rows.push(this._socketRow(sock.nodePropName, inline.has(sock.nodePropName)));
    }

    for (const row of this._rows) {
      root.appendChild(row);
    }
    this._styleRows();
  }

  /** The props the body rows cover, and the path they bind under. */
  private _propSignature(): string {
    if (this.nodePath === "") {
      return "";
    }
    return `${this.nodePath}|${Object.keys(this.node.props).join(",")}`;
  }

  /** Rebuilds the body's prop rows; an input's default belongs to its socket row. */
  private _rebuildPropRows() {
    const root = this._propsRoot;
    if (root === undefined) {
      return;
    }

    const sig = this._propSignature();
    if (sig === this._propSig) {
      return;
    }
    this._propSig = sig;

    // Removed one widget at a time so each row tears down its path watches.
    while (root.firstChild !== null) {
      (root.firstChild as ChildNode).remove();
    }
    if (this.nodePath === "") {
      return;
    }

    for (const key of Object.keys(this.node.props)) {
      const row = propEditRow(
        this.ctx,
        key,
        `${this.nodePath}.props['${key}'].value`,
        this.inherit_packflag,
        this.node.customPropUX.get(key)
      );
      row.parentWidget = this._body!;
      row.packflag |= this.inherit_packflag;
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

    this._socketsRoot = document.createElement("div");
    this._socketsRoot.className = "nodeframe-sockets";
    this.shadow.appendChild(this._socketsRoot);

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

    this._rebuildSocketRows();
    this._rebuildPropRows();

    this.node.createUI(this._body);
    this.buildExtraUI?.(this, this._body);
  }

  /** The terminal dot for a socket, for the view to restyle during a drag. */
  terminalDot(key: string, dir: SocketDir): TerminalDot<CTX> | undefined {
    return this._terminalDotMap.get(`${dir}:${key}`);
  }

  /** One socket's row: its terminal dot, plus an inline default editor where
   *  the socket has one and its name where it does not. */
  private _socketRow(socketPropName: NodePropName, inline: boolean): HTMLDivElement {
    const height = this.getDefault("SocketRowHeight") as number;
    const { type: dir } = GraphNode.decomposePropName(socketPropName);
    if (dir === "prop") {
      throw new Error("_socketRow called with socket name not nodePropName");
    }

    const row = document.createElement("div");
    // Positioned so the terminal dot can anchor to the frame's outer edge.
    row.style.cssText =
      `min-height: ${height}px; display: flex; align-items: center; position: relative; ` +
      `justify-content: ${dir === "in" ? "flex-start" : "flex-end"}; ` +
      "gap: 4px; padding: 0 4px; box-sizing: border-box;";

    const dot = this._terminalDot(socketPropName);
    const label = inline ? this._inlineEditor(socketPropName) : undefined;

    if (dir === "in") {
      row.appendChild(dot.dom);
      row.appendChild(label ?? this._terminalName(socketPropName));
    } else {
      row.appendChild(label ?? this._terminalName(socketPropName));
      row.appendChild(dot.dom);
    }
    return row;
  }

  private _terminalName(key: NodePropName): HTMLSpanElement {
    const name = document.createElement("span");
    name.textContent = GraphNode.decomposePropName(key).name;
    name.style.cssText = "overflow: hidden; white-space: nowrap; text-overflow: ellipsis;";
    return name;
  }

  /** The editor for a sockets default value, bound through the props datapath. */
  private _inlineEditor(socketPropName: NodePropName): HTMLElement {
    const { name: socketName, type: dir } = GraphNode.decomposePropName(socketPropName);

    const path = `${this.nodePath}.props['${socketPropName}'].value`;
    const sock = nodePropSocket(this.node, socketPropName);
    const row = propEditRow(
      this.ctx,
      socketName,
      path,
      this.inherit_packflag,
      sock?.createUI ? sock.createUI.bind(sock) : undefined
    );
    row.parentWidget = this;
    row.style.flex = "1 1 auto";
    row.style.minWidth = "0";
    row.packflag |= this.inherit_packflag;
    this._editors.push(row);
    return row;
  }

  private _terminalDot(socketPropName: NodePropName): TerminalDot<CTX> {
    const { type: dir, name: socketName } = GraphNode.decomposePropName(socketPropName);

    const sock = dir === "in" ? this.node.inputs[socketName] : this.node.outputs[socketName];
    const color = typeof sock.color === "string" ? sock.color : "#ccc";

    return new TerminalDot<CTX>(
      this,
      `${dir}:${socketName}`,
      socketName,
      dir,
      color,
      `${socketName} (${sock.type})`
    );
  }

  /** Whether a press landed on one of the node's own widgets rather than the frame. */
  private _onNodeWidget(e: PointerEvent): boolean {
    for (const node of e.composedPath()) {
      if (node === this._body) {
        return true;
      }
      if (node instanceof HTMLElement && node.classList.contains("nodeeditor-prop-row")) {
        return true;
      }
    }
    return false;
  }

  private _wirePress(handle: HTMLElement) {
    handle.addEventListener("pointerdown", (e: PointerEvent) => {
      if (e.button !== 0) {
        return;
      }

      // Keeps the press from also starting the view's box-select.
      e.stopPropagation();
      this.onSelect?.(this, e);

      if (this._onNodeWidget(e)) {
        return;
      }

      e.preventDefault();
      this.onMoveStart?.(this, e);
    });
  }
}
UIBase.internalRegister(NodeFrame);
