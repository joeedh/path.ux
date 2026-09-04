// Plain imports keep the widget modules' module-scope internalRegister calls,
// so the elements container.prop builds (sliders, checkboxes, textboxes,
// dropdowns) upgrade even when the host skips the pathux entry point.
import "../../widgets/ui_numsliders";
import "../../widgets/ui_widgets";
import "../../widgets/ui_textbox";
import "../../menu/menu";
import "../../menu/dropbox";
import { PackFlags, UIBase } from "../../core/ui_base";
import { Container } from "../../core/ui";
import type { Label } from "../../core/ui";
import type { IContextBase } from "../../core/context_base";
import type { CSSFont } from "../../core/cssfont";
import { getStyleRecord } from "../../core/base/ui_base_theme_lookup";
import { Graph } from "../../graph/graph";
import {
  Node as GraphNode,
  nodePropKeys,
  NodePropName,
  nodePropSocket,
  nodePropTarget,
} from "../../graph/node";
import { SocketClasses } from "../../graph/socket";
import type { NodeSocketBase, SocketTypeConstructor } from "../../graph/socket";
import {
  ExposedEntry,
  GroupDef,
  GroupInputNode,
  GroupNode,
  GroupOutputNode,
} from "../../graph/group";
import type { ExposeRequest } from "../../graph/grouping";
import type { SocketDir } from "../../graph/graph_types";
import type { GraphContext, GraphEdit, NodeGraphDelegate } from "./delegate";
import { ToolProperty } from "../../path-controller/toolsys/toolprop";
import type { MenuTemplate } from "../../menu/menu_types";
import { createMenu } from "../../menu/menu_ops";

export type ExposureState = "ok" | "unresolved" | "missing";

/**
 * Whether an exposure entry's target exists in graph. A target inside a group
 * whose definition has not loaded is unresolved rather than missing — the
 * entry may become valid once the definition arrives, so the UI skips it
 * silently instead of flagging it broken.
 */
export function exposedEntryState(graph: Graph, entry: ExposedEntry): ExposureState {
  const node = graph.nodeIdMap.get(entry.nodeId);
  if (node === undefined) {
    return "missing";
  }
  if (entry.kind === "nodeUI") {
    return "ok";
  }
  if (nodePropTarget(node, entry.propKey) !== undefined) {
    return "ok";
  }
  if (node instanceof GroupNode && node.definition === undefined) {
    return "unresolved";
  }
  return "missing";
}

/** One forwarded-UI row, resolved against a group instance's subgraph. */
export interface ForwardedRow {
  entry: ExposedEntry;
  state: ExposureState;
  label: string;

  /** The instance-side datapath an ok prop entry reads and writes. */
  path?: string;

  /** Set when an ok prop entry addresses an input default; its class builds the row. */
  socket?: NodeSocketBase;

  /** The instance-side node an ok nodeUI entry renders. */
  target?: GraphNode;
}

/**
 * The rows a group instance forwards, in the definition's exposed order.
 * Paths point into the instance's own subgraph, so a write through one
 * materializes an instance override rather than editing the definition.
 */
export function forwardedRows(node: GroupNode, nodePath: string): ForwardedRow[] {
  const def = node.definition;
  if (def === undefined) {
    return [];
  }

  const rows: ForwardedRow[] = [];
  for (const entry of def.exposed) {
    const state = exposedEntryState(node.subgraph, entry);
    const target = node.subgraph.nodeIdMap.get(entry.nodeId);
    const label = entryLabel(entry, target);
    const row: ForwardedRow = { entry, state, label };

    if (state === "ok" && target !== undefined) {
      if (entry.kind === "prop") {
        row.path = `${nodePath}.group.nodes[${JSON.stringify(entry.nodeId)}].props['${entry.propKey}'].value`;
        row.socket = nodePropSocket(target, entry.propKey);
      } else {
        row.target = target;
      }
    }
    rows.push(row);
  }
  return rows;
}

/**
 * What an instance's forwarded UI depends on, as a string: the definition's identity
 * and each entry with its state. A frame whose signature changed rebuilds its rows.
 */
export function forwardedSignature(node: GroupNode): string {
  const def = node.definition;
  if (def === undefined) {
    return "";
  }
  const parts = def.exposed.map(
    (e) =>
      `${e.kind}:${String(e.nodeId)}:${e.propKey}:${e.label ?? ""}:` +
      exposedEntryState(node.subgraph, e)
  );
  return `${defIds.id(def)}|${parts.join(",")}`;
}

/** Definition identities for forwardedSignature; a WeakMap so a dropped definition is not held. */
const defIds = {
  next: 1,
  map : new WeakMap<GroupDef, number>(),
  id(def: GroupDef): number {
    let id = this.map.get(def);
    if (id === undefined) {
      id = this.next++;
      this.map.set(def, id);
    }
    return id;
  },
};

/** The text a row shows for an entry: its label, else the prop's name, else the node's. */
function entryLabel(entry: ExposedEntry, target: GraphNode | undefined): string {
  return (
    entry.label ||
    GraphNode.decomposePropName(entry.propKey).name ||
    target?.getUIName() ||
    String(entry.nodeId)
  );
}

/**
 * Renders a group instance's forwarded UI into root as one prop editor row per
 * entry. Writes go through the datapath on the instance-side props path. A
 * nodeUI entry naming an inner group recurses; one naming a plain node renders
 * that node's prop rows. Entries that are not ok are skipped.
 */
export function buildForwardedUI(
  root: HTMLElement,
  ctx: IContextBase,
  node: GroupNode,
  nodePath: string,
  inherit_packflag: number
): void {
  for (const row of forwardedRows(node, nodePath)) {
    if (row.state !== "ok") {
      continue;
    }

    let createUI = row.socket?.createUI;
    if (row.socket && createUI) {
      createUI = createUI.bind(row.socket);
    } else if (!row.socket) {
      createUI = node.customPropUX.get(GraphNode.decomposePropName(row.entry.propKey).name);
    }

    if (row.path !== undefined) {
      const propRow = propEditRow(ctx, row.label, row.path, inherit_packflag, createUI);
      if (propRow) {
        propRow.inherit_packflag |= inherit_packflag;
      }
      root.appendChild(propRow);
      continue;
    }

    const target = row.target!;
    if (target instanceof GroupNode) {
      buildForwardedUI(
        root,
        ctx,
        target,
        `${nodePath}.group.nodes[${JSON.stringify(target.id)}]`,
        inherit_packflag
      );
      continue;
    }
    for (const key of nodePropKeys(target)) {
      const path = `${nodePath}.group.nodes[${JSON.stringify(target.id)}].props['${key}'].value`;
      const { name, type } = GraphNode.decomposePropName(key);
      let socket: NodeSocketBase | undefined;
      switch (type) {
        case "in":
          socket = target.inputs[name];
          break;
        case "out":
          socket = target.outputs[name];
          break;
        case "prop":
          // socket is left undefined
          break;
      }

      root.appendChild(
        propEditRow(
          ctx,
          name,
          path,
          inherit_packflag,
          socket?.createUI ? socket.createUI.bind(socket) : undefined
        )
      );
    }
  }
}

/**
 * The editor row for the value at a datapath, shared by the forwarded group UI
 * and the node frames' inline default rows. A socket builds its own row through
 * its createUI; otherwise container.prop picks the widget the bound property
 * type maps to. A path the API cannot resolve renders an inert label.
 */
export function propEditRow<CTX extends IContextBase>(
  ctx: CTX,
  label: string,
  path: string,
  inherit_packflag: number,
  createUI?: (row: Container<CTX>, path: string, label: string) => void
): Container<CTX> {
  const row = UIBase.createElement("container-x") as Container<CTX>;
  row.inherit_packflag |= inherit_packflag;
  row.ctx = ctx;
  row._init();
  // init writes the class attribute, so the marker class is added after it.
  row.classList.add("nodeeditor-prop-row");
  row.inherit_packflag |= PackFlags.FORCE_PROP_LABELS | PackFlags.LABEL_ON_TOP;

  // ensure we have nice looking name that's capitalized
  label = ToolProperty.makeUIName(label);

  try {
    if (createUI !== undefined) {
      createUI(row, path, label);
    } else {
      row.prop(path)?.setAttribute("name", label);
    }
  } catch (error) {
    console.warn((error as any).stack);
    console.warn((error as any).message);
    row.label(`${label} (unavailable)`);
  }
  return row;
}

/** What the designer and the proxy frames' add-socket row share. */
export interface DefinitionEditOpts {
  ctx: GraphContext;
  def: GroupDef;
  /** The datapath of def.subgraph; the edits dispatch against it. */
  graphPath: string;
  delegate: NodeGraphDelegate;
  onChanged?: () => void;
}

export interface GroupDesignerOpts extends DefinitionEditOpts {
  /** Color of the missing-entry flag; the hosting editor passes its themed ErrorColor. */
  errorColor?: string;
}

/** Checks then performs; a refusal is reported and nothing runs. */
function dispatchEdit(opts: DefinitionEditOpts, edit: GraphEdit): string | undefined {
  const verdict = opts.delegate.check(opts.ctx, edit);
  if (!verdict.ok) {
    return verdict.reason;
  }
  opts.delegate.perform(opts.ctx, edit);
  opts.onChanged?.();
  return undefined;
}

/** The word for a boundary side as the controls name it. */
function sideWord(dir: SocketDir): string {
  return dir === "in" ? "input" : "output";
}

/** Initializes el, then adds the marker class; Container.init writes the class attribute. */
function mark<T extends UIBase>(el: T, cls: string): T {
  el._init();
  el.classList.add(cls);
  return el;
}

/** The socket types a boundary socket can take, each entry reporting its registered type name. */
export function socketTypeMenuTemplate(onPick: (typeName: string) => void): MenuTemplate {
  const items: MenuTemplate = [];
  for (const [typeName, cls] of SocketClasses) {
    const sdef = cls.socketDef();
    items.push({
      name    : sdef.uiName || typeName,
      id      : typeName,
      tooltip : `A ${sdef.uiName || typeName} socket, carrying ${sdef.type} values`,
      callback: () => onPick(typeName),
    });
  }
  return items;
}

/**
 * The targets an exposure can name inside def: one submenu per inner node,
 * listing the node's properties and, for kind undefined or "nodeUI", the whole
 * node. Menu ids are the prop key, or "nodeUI" for the whole node.
 */
export function exposeMenuTemplate(
  ctx: IContextBase,
  def: GroupDef,
  onPick: (req: ExposeRequest) => void,
  kind?: "prop" | "nodeUI"
): MenuTemplate {
  const items: MenuTemplate = [];
  for (const node of def.subgraph.nodes) {
    if (node instanceof GroupInputNode || node instanceof GroupOutputNode) {
      continue;
    }
    const nodeName = node.getUIName();
    const entries: MenuTemplate = [];
    if (kind !== "prop") {
      entries.push({
        name    : "whole node",
        id      : "nodeUI",
        tooltip : `Forward every property of ${nodeName} as one block`,
        callback: () => onPick({ kind: "nodeUI", nodeId: node.id }),
      });
    }
    if (kind !== "nodeUI") {
      for (const key of nodePropKeys(node)) {
        const { name, type } = GraphNode.decomposePropName(key);
        // an output's value is computed, so a forwarded row for it would edit nothing
        if (type === "out") {
          continue;
        }
        const propKey = key as unknown as string;
        entries.push({
          name,
          id      : propKey,
          tooltip : `Forward ${nodeName}'s ${name} to every instance`,
          callback: () => onPick({ kind: "prop", nodeId: node.id, propKey }),
        });
      }
    }
    if (entries.length === 0) {
      continue;
    }
    const sub = createMenu(ctx, nodeName, entries);
    sub.tooltip = `What ${nodeName} can forward`;
    items.push(sub);
  }
  return items;
}

/** The lowest-numbered key of the form base, base_2, base_3 … absent from socks. */
function freeKey(base: string, socks: Record<string, unknown>): string {
  if (!(base in socks)) {
    return base;
  }
  for (let i = 2; ; i++) {
    const key = `${base}_${i}`;
    if (!(key in socks)) {
      return key;
    }
  }
}

/**
 * The control that adds a boundary socket: an "Add input…" (or output) dropdown
 * of socket types; picking one reveals a name box and an Add button that
 * dispatches addBoundary. A refusal shows beneath the box and on the button.
 */
export function buildAddSocketRow<CTX extends IContextBase>(
  con: Container<CTX>,
  dir: SocketDir,
  opts: DefinitionEditOpts
): Container<CTX> {
  const word = sideWord(dir);
  const row = mark(con.col(), "nodeeditor-add-socket");
  row.dataset.dir = dir;

  let pending: string | undefined;
  let nameRow: Container<CTX> | undefined;
  let note: Label<CTX> | undefined;

  const hideName = () => {
    nameRow?.remove();
    note?.remove();
    nameRow = note = undefined;
  };

  const showName = () => {
    hideName();
    nameRow = mark(row.row(), "nodeeditor-add-socket-name");
    nameRow.style.gap = "6px";
    nameRow.style.alignItems = "center";

    const socks = dir === "in" ? opts.def.inputs : opts.def.outputs;
    const sdef = SocketClasses.get(pending!)?.socketDef();
    const base = (sdef?.uiName || sdef?.type || word).toLowerCase().replace(/\s+/g, "_");
    const box = nameRow.textbox(undefined, freeKey(base, socks));
    box.description = `The new ${word}'s name, as every instance will show it`;

    const add = nameRow.button("Add", () => {
      const reason = dispatchEdit(opts, {
        kind     : "addBoundary",
        graphPath: opts.graphPath,
        dir,
        key       : box.text.trim(),
        socketType: pending!,
      });
      if (reason !== undefined) {
        note!.text = reason;
        note!.hidden = false;
        add.description = reason;
        return;
      }
      hideName();
      pending = undefined;
    });
    add.description = `Add the ${sdef?.uiName ?? pending} ${word} named in the box`;

    note = mark(row.label(""), "nodeeditor-refusal");
    note.hidden = true;
  };

  const pick = row.menu(
    `Add ${word}…`,
    socketTypeMenuTemplate((typeName) => {
      pending = typeName;
      showName();
    })
  );
  pick.description = `Add an ${word} socket to the group; every instance gains it`;

  return row;
}

/**
 * Renders the group designer into root: the definition's inputs, outputs and
 * exposed rows as three headed lists, each with its remove, reorder and add
 * controls. Nothing here asks for an id: targets and types come from menus.
 * Every mutation goes through the delegate (check first) and re-renders.
 */
export function buildGroupDesigner(root: HTMLElement, opts: GroupDesignerOpts): void {
  root.textContent = "";

  const con = UIBase.createElement("container-x") as Container<IContextBase>;
  con.ctx = opts.ctx as unknown as IContextBase;
  con._init();
  con.classList.add("nodeeditor-designer");
  root.appendChild(con);

  const rerender = () => buildGroupDesigner(root, opts);
  const host: DesignerHost = {
    opts,
    rerender,
    dispatch: (edit) => {
      const reason = dispatchEdit(opts, edit);
      if (reason !== undefined) {
        note.text = reason;
        note.hidden = false;
        return;
      }
      rerender();
    },
    socketFont: getStyleRecord(con, "nodeframe", "SocketText")?.SocketText as CSSFont | undefined,
  };

  buildBoundaryList(con, "in", host);
  buildBoundaryList(con, "out", host);
  buildExposedList(con, host);

  // Built last so a refusal reads beneath the control that raised it.
  const note = mark(con.label(""), "nodeeditor-refusal");
  note.hidden = true;
  if (opts.errorColor !== undefined) {
    note.style.color = opts.errorColor;
  }
}

interface DesignerHost {
  opts: GroupDesignerOpts;
  rerender: () => void;
  dispatch: (edit: GraphEdit) => void;
  socketFont: CSSFont | undefined;
}

function heading<CTX extends IContextBase>(con: Container<CTX>, text: string) {
  const lbl = mark(con.label(text), "nodeeditor-designer-heading");
  lbl.font = "TitleText";
  return lbl;
}

function buildBoundaryList<CTX extends IContextBase>(
  con: Container<CTX>,
  dir: SocketDir,
  { opts, dispatch, rerender, socketFont }: DesignerHost
) {
  const word = sideWord(dir);
  const socks = dir === "in" ? opts.def.inputs : opts.def.outputs;
  const list = mark(con.col(), `nodeeditor-boundary-${dir}`);
  heading(list, dir === "in" ? "Inputs" : "Outputs");

  for (const key of Object.keys(socks)) {
    const row = mark(list.row(), "nodeeditor-boundary-row");
    row.dataset.socketKey = key;
    row.style.gap = "6px";
    row.style.alignItems = "center";
    row.label(key);

    const cls = socks[key].constructor as SocketTypeConstructor;
    const sdef = cls.socketDef();
    const type = mark(row.label(sdef.uiName || sdef.typeName), "nodeeditor-boundary-type");
    if (socketFont !== undefined) {
      type.font = socketFont;
    }

    const remove = row.button("✕", () =>
      dispatch({ kind: "removeBoundary", graphPath: opts.graphPath, dir, key })
    );
    remove.description = `Remove the ${word} '${key}'; every instance loses the socket and its links`;
  }

  buildAddSocketRow(list, dir, {
    ...opts,
    onChanged: () => {
      opts.onChanged?.();
      rerender();
    },
  });
}

function buildExposedList<CTX extends IContextBase>(
  con: Container<CTX>,
  { opts, dispatch }: DesignerHost
) {
  const list = mark(con.col(), "nodeeditor-exposed");
  heading(list, "Exposed");

  const common = { graphPath: opts.graphPath };
  opts.def.exposed.forEach((entry, index) => {
    const state = exposedEntryState(opts.def.subgraph, entry);
    if (state === "unresolved") {
      return;
    }

    const target = opts.def.subgraph.nodeIdMap.get(entry.nodeId);
    const row = mark(list.row(), "nodeeditor-exposure-row");
    row.dataset.exposureIndex = String(index);
    row.dataset.exposureState = state;
    row.style.gap = "6px";
    row.style.alignItems = "center";

    const name = mark(row.label(entryLabel(entry, target)), "nodeeditor-exposure-name");

    if (state === "missing") {
      const flag = mark(row.label("missing"), "nodeeditor-exposure-flag");
      flag.description = "This row's target no longer exists; point it somewhere else or remove it";
      if (opts.errorColor !== undefined) {
        flag.style.color = opts.errorColor;
      }

      const repoint = row.menu(
        "Repoint…",
        exposeMenuTemplate(
          opts.ctx as unknown as IContextBase,
          opts.def,
          (req) =>
            dispatch({
              kind: "repointEntry",
              ...common,
              index,
              nodeId : req.nodeId,
              propKey: (req.propKey ?? "") as unknown as NodePropName,
            }),
          entry.kind
        )
      );
      repoint.description =
        "Point this row at a property that exists, keeping its place in the list";
    } else {
      const up = row.button("↑", () =>
        dispatch({ kind: "reorderEntry", ...common, from: index, to: index - 1 })
      );
      up.description = "Show this row one place earlier on every instance";
      const down = row.button("↓", () =>
        dispatch({ kind: "reorderEntry", ...common, from: index, to: index + 1 })
      );
      down.description = "Show this row one place later on every instance";
    }

    const remove = row.button("✕", () => dispatch({ kind: "removeEntry", ...common, index }));
    remove.description = "Stop forwarding this row; instances keep their values";
  });

  const expose = list.menu(
    "Expose…",
    exposeMenuTemplate(opts.ctx as unknown as IContextBase, opts.def, (req) =>
      dispatch({ kind: "exposeEntry", ...common, entry: req })
    )
  );
  mark(expose, "nodeeditor-exposure-add");
  expose.description = "Forward a property of an inner node so every instance shows it";
}
