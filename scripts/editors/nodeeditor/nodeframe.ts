import { UIBase } from "../../core/ui_base";
import type { UIBaseDefinition } from "../../core/ui_base";
import { Container } from "../../core/ui";
import { IContextBase } from "../../core/context_base";
import { t } from "../../core/theme_schema";
import { CSSFont } from "../../core/cssfont";
import { Vector2 } from "../../path-controller/util/vectormath";
import { PropTypes, ToolProperty } from "../../path-controller/toolsys/toolprop";
import { Node as GraphNode, NodePropName, nodePropSocket, nodePropTarget } from "../../graph/node";
import { GroupInputNode, GroupNode, GroupOutputNode } from "../../graph/group";
import { NodeSocketBase } from "../../graph/socket";
import type { SocketDir } from "../../graph/graph_types";
import { propEditRow } from "./groupui";
import { PLACEHOLDER_CLASS } from "./editorloader";
import type { EditorLoader } from "./editorloader";
import { getStyleRecord } from "../../core/base/ui_base_theme_lookup";

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

/** One socket's row in a frame. */
interface SocketRow<CTX extends IContextBase> {
  key: NodePropName;

  /** What the row was built to show. */
  sig: string;
  el: HTMLDivElement;

  /** The inline default editor, kept so a rebuild can tear it down. */
  editor: Container<CTX> | undefined;

  /** The inline editor that hasn't been built yet. */
  pending: PendingEditor | undefined;
}

/** A value editor that hasn't been built yet, and the placeholder that stands for it. */
interface PendingEditor {
  /** The kind of editor, for its height. */
  heightKey: string;
  placeholder: HTMLDivElement;

  /** Puts the editor in the placeholder's place, and answers the widgets it consists of. */
  build: () => { el: HTMLElement; widgets: UIBase[] };
}

/** The widgets among these nodes and below them that aren't inside another widget. */
function topWidgets(nodes: Iterable<ChildNode>): UIBase[] {
  return [...nodes].flatMap((n) => (n instanceof UIBase ? [n] : topWidgets(n.childNodes)));
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
    dot.style.cssText = `
      position: absolute; top: 50%; 
      transform: translateY(-50%); 
      width: 8px; height: 8px; 
      border-radius: 50%; 
      flex: 0 0 auto; 
      background: ${color}; 
      ${dir === "in" ? "left" : "right"}: -5px;
      `
      .split("\n")
      .join("");

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

  /** Whether the latest press landed on the title bar rather than a socket row. */
  headerPressed = false;

  getScale: () => number = () => 1;
  onSelect?: (frame: NodeFrame<CTX>, e: PointerEvent) => void;
  onMoveStart?: (frame: NodeFrame<CTX>, e: PointerEvent) => void;

  /** Reports that a press on this frame released without becoming a drag. */
  onMoveClick?: (frame: NodeFrame<CTX>) => void;

  /** Reports the frames a live drag is moving; this frame leads them. */
  onMovePreview?: (frames: readonly NodeFrame<CTX>[]) => void;

  /**
   * Reports a completed drag of this frame and any dragged alongside it.
   * Resolves once the move has been applied and the view has resynced.
   */
  onMoveCommit?: (moves: readonly FrameMove<CTX>[]) => void | Promise<void>;
  onSocketDown?: (frame: NodeFrame<CTX>, key: string, dir: SocketDir, e: PointerEvent) => void;

  /** Extra rows the owning view appends beneath the node's own createUI. */
  buildExtraUI?: (frame: NodeFrame<CTX>, body: Container<CTX>) => void;

  /** Set for extra rows that are value editors, which `loader` builds like the others. */
  extraUI: { heightKey: string; rows: number } | undefined = undefined;

  /** Builds the value editors later, if set before init; otherwise they're built at once. */
  loader: EditorLoader<CTX> | undefined = undefined;

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
  /** The socket rows, in socketRow's order. */
  private _rows: SocketRow<CTX>[] = [];
  private _socketsRoot: HTMLDivElement | undefined;
  private _body: Container<CTX> | undefined;
  private _propsRoot: HTMLDivElement | undefined;
  private _terminalDotMap = new Map<string, TerminalDot<CTX>>();

  /** Which props the built body rows cover, and the path they bind under. */
  private _propSig = "";
  private _propsPending: PendingEditor[] = [];

  /** The editors that haven't been built yet, in the order they'll be built. */
  private _pending: PendingEditor[] = [];

  /** Whether the frame's editors have all been built once; later ones are built at once. */
  private _loaded = false;

  private _extraPending: PendingEditor | undefined;

  /** What buildExtraUI added to the body, so rebuildExtraUI can take it out again. */
  private _extraNodes: ChildNode[] = [];

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
        GroupAccent         : t.color,
        GroupHeaderBG       : t.color,
        ProxyHeaderBG       : t.color,
        SelectOutline       : t.color,
        DefaultText         : t.font,
        SocketText          : t.font,
        SocketHitExpand     : t.number, // in pixels
        SocketHighlightColor: t.color,
        SocketErrorColor    : t.color,
        EditorPlaceholder   : t.color,
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
    const rowHeights = this._rows.map((row) => row.el.offsetHeight || uniform);

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

    // metrics() would measure every row's offsetHeight, forcing a layout, just for this
    const headerHeight = this.getDefault("HeaderHeight") as number;
    const font = this.getDefault("DefaultText") as CSSFont;
    this._header.style.font = font.genCSS();
    this._header.style.color = font.color;
    // The font shorthand resets line-height, so the row centering is re-applied after it.
    this._header.style.lineHeight = headerHeight + "px";
    this._header.style.background = this.getDefault(this._headerKey()) as string;
    this._header.style.borderRadius = `${radius}px ${radius}px 0 0`;

    // A group instance reads as a container: an accent stripe down its left edge.
    this.style.borderLeft =
      this.node instanceof GroupNode
        ? `3px solid ${this.getDefault("GroupAccent")}`
        : `1px solid ${this.getDefault("border-color")}`;

    this._styleRows();
  }

  /** The theme key of the header tint: groups and proxies carry their own. */
  private _headerKey(): "HeaderBG" | "GroupHeaderBG" | "ProxyHeaderBG" {
    if (this.node instanceof GroupNode) {
      return "GroupHeaderBG";
    }
    if (this.node instanceof GroupInputNode || this.node instanceof GroupOutputNode) {
      return "ProxyHeaderBG";
    }
    return "HeaderBG";
  }

  /** The title-bar tooltip; a group's says how to enter it. */
  private _headerTitle(): string {
    if (this.node instanceof GroupNode) {
      return `An instance of the group '${this.node.ref}'; press its title twice to edit the definition every instance shares`;
    }
    return this.node.getDescription() || this.node.getUIName();
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
   *  only a rename, a type swap, or a link change costs a rebuild here.
   *  Reports whether any row was rebuilt. */
  syncContents(): boolean {
    this._syncHeader();
    const sockets = this._rebuildSocketRows();
    const props = this._rebuildPropRows();
    return sockets || props;
  }

  private _syncHeader() {
    if (this._header === undefined) {
      return;
    }
    this._header.textContent = this.node.getUIName();
    this._header.title = this._headerTitle();
  }

  private _styleRows() {
    const font = this.getDefault("SocketText") as CSSFont;
    const height = this.getDefault("SocketRowHeight") as number;

    for (const { el } of this._rows) {
      el.style.font = font.genCSS();
      el.style.color = font.color;
      el.style.lineHeight = height + "px";
    }
  }

  /** What a socket's row shows; a row whose signature changes is built again. */
  private _rowSignature(key: NodePropName, inline: boolean): string {
    const sock = nodePropSocket(this.node, key);
    const name = nodePropTarget(this.node, key)?.uiname;
    return JSON.stringify([inline, sock?.type, sock?.color, name]);
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

  /** Rebuilds the socket rows that changed, and reports whether any did. */
  private _rebuildSocketRows(): boolean {
    const root = this._socketsRoot;
    if (root === undefined) {
      return false;
    }

    const inline = this._inlineKeys();
    const old = new Map(this._rows.map((row) => [row.key, row]));
    const rows: SocketRow<CTX>[] = [];
    let rebuilt = false;

    for (const socks of [this.node.outputs, this.node.inputs]) {
      for (const name in socks) {
        const key = socks[name].nodePropName;
        const sig = this._rowSignature(key, inline.has(key));
        const row = old.get(key);
        if (row?.sig === sig) {
          old.delete(key);
          rows.push(row);
        } else {
          rows.push(this._socketRow(key, sig, inline.has(key)));
          rebuilt = true;
        }
      }
    }

    for (const row of old.values()) {
      this._dropPending(row.pending);
      row.editor?.remove();
      row.el.remove();
      rebuilt = true;
    }

    this._rows = rows;
    rows.forEach(({ el }, i) => {
      if (root.children[i] !== el) {
        root.insertBefore(el, root.children[i] ?? null);
      }
    });
    if (rebuilt) {
      this._styleRows();
    }
    return rebuilt;
  }

  /** The props the body rows cover, and the path they bind under. */
  private _propSignature(): string {
    if (this.nodePath === "") {
      return "";
    }
    return `${this.nodePath}|${Object.keys(this.node.props).join(",")}`;
  }

  /** Rebuilds the body's prop rows if the props changed, and reports whether it did.
   *  An input's default belongs to its socket row. */
  private _rebuildPropRows(): boolean {
    const root = this._propsRoot;
    if (root === undefined) {
      return false;
    }

    const sig = this._propSignature();
    if (sig === this._propSig) {
      return false;
    }
    this._propSig = sig;

    for (const pending of this._propsPending) {
      this._dropPending(pending);
    }
    this._propsPending = [];
    // Removed one widget at a time so each row tears down its path watches.
    while (root.firstChild !== null) {
      (root.firstChild as ChildNode).remove();
    }
    if (this.nodePath === "") {
      return true;
    }

    for (const key of Object.keys(this.node.props)) {
      const build = () => {
        const row = this._propRow(key);
        return { el: row, widgets: [row] };
      };
      if (this._buildNow()) {
        root.appendChild(build().el);
        continue;
      }
      const pending = this._addPending(
        key as unknown as NodePropName,
        this.node.customPropUX.has(key),
        build
      );
      this._propsPending.push(pending);
      root.appendChild(pending.placeholder);
    }
    return true;
  }

  /** The editor row for one of the node's props. */
  private _propRow(key: string): Container<CTX> {
    const row = propEditRow(
      this.ctx,
      key,
      `${this.nodePath}.props['${key}'].value`,
      this.inherit_packflag,
      this.node.customPropUX.get(key)
    );
    row.parentWidget = this._body!;
    row.packflag |= this.inherit_packflag;
    row.dataset.propKey = key;
    return row;
  }

  /** Whether an editor is built right away rather than left to the loader. */
  private _buildNow(): boolean {
    return this.loader === undefined || this._loaded;
  }

  /** Makes the placeholder of a value's editor; the caller puts it in the DOM. */
  private _addPending(
    key: NodePropName,
    custom: boolean,
    build: PendingEditor["build"]
  ): PendingEditor {
    const target = nodePropTarget(this.node, key);
    const value = target?.getValue() as unknown;
    const isList = Array.isArray(value) || ArrayBuffer.isView(value);
    const parts = isList ? (value as ArrayLike<unknown>).length : 1;
    const heightKey = custom
      ? `${this.node.def.typeName}|${String(key)}`
      : `${String(target?.type)}|${String(target?.subtype)}|${parts}`;

    const uniform = this.getDefault("SocketRowHeight") as number;
    // a checkbox, a label over one slider, or a label over a column of labeled sliders
    const lines = target?.type === PropTypes.BOOL ? 1.1 : parts === 1 ? 2 : 2 + parts * 1.6;

    const { name } = GraphNode.decomposePropName(key);
    const label = ToolProperty.makeUIName(name);
    const pending: PendingEditor = {
      heightKey,
      placeholder: this._placeholder(
        label,
        parts,
        this.loader?.height(heightKey) ?? uniform * lines
      ),
      build,
    };
    pending.placeholder.dataset.propKey = key as unknown as string;
    this._pending.push(pending);
    this.loader?.request();
    return pending;
  }

  private _placeholder(label: string, bars: number, height: number): HTMLDivElement {
    const el = document.createElement("div");
    const font = getStyleRecord(this, "propLabels", "font", true)?.font as CSSFont | undefined;
    const fallback = "rgba(127, 127, 127, 0.15)";
    const bar = this.getDefault("EditorPlaceholder", undefined, fallback) as string;
    const line = this.getDefault("SocketRowHeight") as number;

    el.className = PLACEHOLDER_CLASS;
    el.textContent = label;
    // the bars stand for sliders, which have labels of their own if there are several
    const first = bars > 1 ? 1.9 : 1;
    const layers = [...Array(bars).keys()].map(
      (i) =>
        `linear-gradient(${bar}, ${bar}) no-repeat 0 ${(first + i * 2) * line}px / 100% ${line * 0.9}px`
    );
    el.style.cssText =
      `flex: 1 1 auto; min-width: 0; box-sizing: border-box; height: ${height}px; ` +
      `line-height: ${line}px; overflow: hidden; white-space: nowrap; cursor: move; ` +
      `background: ${layers.join(", ")};`;
    if (font !== undefined) {
      el.style.font = font.genCSS();
      el.style.lineHeight = line + "px";
      el.style.color = font.color;
    }
    return el;
  }

  private _dropPending(pending: PendingEditor | undefined) {
    const i = pending !== undefined ? this._pending.indexOf(pending) : -1;
    if (i >= 0) {
      this._pending.splice(i, 1);
    }
  }

  /** How many value editors haven't been built yet. */
  get pendingEditors(): number {
    return this._pending.length;
  }

  /**
   * Builds the next editor. Its first update runs too: a bound panel only builds its sliders
   * then, so neither its cost nor its height is known before.
   */
  loadEditor() {
    const pending = this._pending.shift();
    if (pending === undefined) {
      return;
    }
    const { el, widgets } = pending.build();
    if (el !== pending.placeholder) {
      pending.placeholder.replaceWith(el);
    }
    for (const widget of widgets) {
      widget.flushUpdate();
    }
    if (this.loader !== undefined && this.loader.height(pending.heightKey) === undefined) {
      this.loader.learnHeight(pending.heightKey, el.offsetHeight);
    }
    if (this._pending.length === 0) {
      this._loaded = true;
    }
  }

  /** Gives the placeholders of one kind of editor the height it turned out to have. */
  resizePlaceholders(heightKey: string, height: number) {
    for (const pending of this._pending) {
      if (pending.heightKey === heightKey) {
        pending.placeholder.style.height = height + "px";
      }
    }
  }

  /** The frame's graph-space size, body included. */
  outerSize(): [number, number] {
    if (this.offsetHeight > 0) {
      return [this.offsetWidth, this.offsetHeight];
    }
    const r = this.rect();
    return [r.width, r.height];
  }

  private _buildUI() {
    const m = this.metrics();

    this._header = document.createElement("div");
    this._header.textContent = this.node.getUIName();
    this._header.title = this._headerTitle();
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
    this._body.checkInit();

    this._propsRoot = document.createElement("div");
    this._propsRoot.className = "nodeframe-props";
    this._propsRoot.style.cssText =
      "display: flex; flex-direction: column; gap: 2px; padding: 2px 4px;";
    this._body.shadow.appendChild(this._propsRoot);

    this._rebuildSocketRows();
    this._rebuildPropRows();

    this.node.createUI(this._body);
    this._runExtraUI();
  }

  private _runExtraUI() {
    const body = this._body;
    if (body === undefined || this.buildExtraUI === undefined) {
      return;
    }
    const extra = this.extraUI;
    if (extra === undefined || extra.rows === 0 || this._buildNow()) {
      this._buildExtraUI();
      return;
    }

    const height = extra.rows * 2 * (this.getDefault("SocketRowHeight") as number);
    const pending: PendingEditor = {
      heightKey  : extra.heightKey,
      placeholder: this._placeholder(
        "",
        extra.rows,
        this.loader?.height(extra.heightKey) ?? height
      ),
      build: () => {
        pending.placeholder.remove();
        this._extraPending = undefined;
        const nodes = this._buildExtraUI();
        const el = nodes.find((n) => n instanceof HTMLElement) ?? pending.placeholder;
        return { el, widgets: topWidgets(nodes) };
      },
    };
    this._pending.push(pending);
    this.loader?.request();
    this._extraPending = pending;
    this._extraNodes = [pending.placeholder];
    body.shadow.appendChild(pending.placeholder);
  }

  private _buildExtraUI(): ChildNode[] {
    const body = this._body!;
    const before = new Set(body.shadow.childNodes);
    this.buildExtraUI?.(this, body);
    this._extraNodes = [...body.shadow.childNodes].filter((n) => !before.has(n));
    return this._extraNodes;
  }

  /**
   * Tears down what buildExtraUI added and builds it again. The view calls it
   * when a group instance's forwarded rows change under a frame that stays.
   */
  rebuildExtraUI() {
    this._dropPending(this._extraPending);
    this._extraPending = undefined;
    // Removed one at a time so each widget tears down its path watches.
    for (const n of this._extraNodes) {
      n.remove();
    }
    this._extraNodes = [];
    this._runExtraUI();
  }

  /** The terminal dot for a socket, for the view to restyle during a drag. */
  terminalDot(key: string, dir: SocketDir): TerminalDot<CTX> | undefined {
    return this._terminalDotMap.get(`${dir}:${key}`);
  }

  /** One socket's row: its terminal dot, plus an inline default editor where
   *  the socket has one and its name where it does not. */
  private _socketRow(key: NodePropName, sig: string, inline: boolean): SocketRow<CTX> {
    const height = this.getDefault("SocketRowHeight") as number;
    const { type: dir } = GraphNode.decomposePropName(key);
    if (dir === "prop") {
      throw new Error("_socketRow called with socket name not nodePropName");
    }

    const el = document.createElement("div");
    // Positioned so the terminal dot can anchor to the frame's outer edge.
    el.style.cssText =
      `min-height: ${height}px; display: flex; align-items: center; position: relative; ` +
      `justify-content: ${dir === "in" ? "flex-start" : "flex-end"}; ` +
      "gap: 4px; padding: 0 4px; box-sizing: border-box;";

    const row: SocketRow<CTX> = { key, sig, el, editor: undefined, pending: undefined };
    if (inline && this._buildNow()) {
      row.editor = this._inlineEditor(key);
    } else if (inline) {
      row.pending = this._addPending(
        key,
        nodePropSocket(this.node, key)?.createUI !== NodeSocketBase.prototype.createUI,
        () => {
          row.pending = undefined;
          row.editor = this._inlineEditor(key);
          return { el: row.editor, widgets: [row.editor] };
        }
      );
    }

    const dot = this._terminalDot(key);
    const label = row.editor ?? row.pending?.placeholder ?? this._terminalName(key, this.node);
    if (dir === "in") {
      el.append(dot.dom, label);
    } else {
      el.append(label, dot.dom);
    }
    return row;
  }

  private _terminalName(key: NodePropName, node: GraphNode): HTMLSpanElement {
    const name = document.createElement("span");
    const font = getStyleRecord(this, "propLabels", "font", true)?.font as CSSFont | undefined;

    name.textContent = nodePropTarget(node, key)?.uiname || GraphNode.decomposePropName(key).name;
    name.style.overflow = "hidden";
    name.style.whiteSpace = "nowrap";
    name.style.textOverflow = "ellipsis";
    name.title = nodePropTarget(node, key)?.description ?? "";
    if (font) {
      name.style.font = font.genCSS();
      name.style.color = font.color;
    }
    return name;
  }

  /** The editor for a sockets default value, bound through the props datapath. */
  private _inlineEditor(socketPropName: NodePropName): Container<CTX> {
    const { name: socketName } = GraphNode.decomposePropName(socketPropName);

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
    row.dataset.propKey = socketPropName as unknown as string;
    return row;
  }

  private _terminalDot(socketPropName: NodePropName): TerminalDot<CTX> {
    const { type: dir, name: socketName } = GraphNode.decomposePropName(socketPropName);

    const sock = dir === "in" ? this.node.inputs[socketName] : this.node.outputs[socketName];
    const color = typeof sock.color === "string" ? sock.color : "#ccc";

    const dot = new TerminalDot<CTX>(
      this,
      `${dir}:${socketName}`,
      socketName,
      dir,
      color,
      `${socketName} (${sock.type})`
    );
    // Registered eagerly rather than solely through connectedCallback, since a
    // frame built off-document (e.g. under test) never fires it.
    this._onTerminalDotAdd(dot);
    return dot;
  }

  /** Whether a press landed on one of the node's own widgets rather than the frame. */
  private _onNodeWidget(e: PointerEvent): boolean {
    for (const node of e.composedPath()) {
      if (node instanceof HTMLElement && node.classList.contains(PLACEHOLDER_CLASS)) {
        return false;
      }
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
      this.headerPressed = e.composedPath().includes(this._header);
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
