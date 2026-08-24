import type { ContextLike } from "../../path-controller/controller/controller_abstract";
import { Graph } from "../../graph/graph";
import { Node as GraphNode, nodePropKeys, nodePropTarget } from "../../graph/node";
import { ExposedEntry, GroupDef, GroupNode } from "../../graph/group";
import type { GraphId } from "../../graph/graph_types";
import type { NodeGraphDelegate } from "./delegate";

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
    const label = entry.label || entry.propKey || target?.getUIName() || String(entry.nodeId);
    const row: ForwardedRow = { entry, state, label };

    if (state === "ok" && target !== undefined) {
      if (entry.kind === "prop") {
        row.path = `${nodePath}.group.nodes[${JSON.stringify(entry.nodeId)}].props['${entry.propKey}']`;
      } else {
        row.target = target;
      }
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Renders a group instance's forwarded UI into root as raw-DOM label + input
 * rows. Writes go through ctx.api.setValue on the instance-side props path.
 * A nodeUI entry naming an inner group recurses; one naming a plain node
 * renders that node's prop rows. Entries that are not ok are skipped.
 */
export function buildForwardedUI(
  root: HTMLElement,
  ctx: ContextLike,
  node: GroupNode,
  nodePath: string
): void {
  for (const row of forwardedRows(node, nodePath)) {
    if (row.state !== "ok") {
      continue;
    }

    if (row.path !== undefined) {
      root.appendChild(_propRow(ctx, row.label, row.path));
      continue;
    }

    const target = row.target!;
    if (target instanceof GroupNode) {
      buildForwardedUI(root, ctx, target, `${nodePath}.group.nodes[${JSON.stringify(target.id)}]`);
      continue;
    }
    for (const key of nodePropKeys(target)) {
      const path = `${nodePath}.group.nodes[${JSON.stringify(target.id)}].props['${key}']`;
      root.appendChild(_propRow(ctx, key, path));
    }
  }
}

function _propRow(ctx: ContextLike, label: string, path: string): HTMLDivElement {
  const row = document.createElement("div");
  row.className = "nodeeditor-forwarded-row";
  row.style.cssText = "display: flex; gap: 4px; align-items: center; font-size: 11px;";

  const name = document.createElement("span");
  name.textContent = label;
  name.title = path;
  row.appendChild(name);

  let current: unknown;
  try {
    current = ctx.api.getValue(ctx, path);
  } catch {
    current = undefined;
  }

  const input = document.createElement("input");
  input.type = "text";
  input.title = `Edit ${label}`;
  input.value = current === undefined ? "" : String(current);
  input.addEventListener("change", () => {
    const value = typeof current === "number" ? parseFloat(input.value) : input.value;
    ctx.api.setValue(ctx, path, value);
    current = value;
  });
  row.appendChild(input);

  return row;
}

export interface GroupDesignerOpts {
  ctx: ContextLike;
  def: GroupDef;
  ref: string;
  graphPath: string;
  delegate: NodeGraphDelegate;
  onChanged?: () => void;

  /** Color of the missing-entry flag; the hosting editor passes its themed ErrorColor. */
  errorColor?: string;
}

/**
 * Renders the group designer's exposure list into root: the definition's
 * exposed entries in order, each with reorder and remove controls, a missing
 * entry flagged with repoint controls, an unresolved one skipped silently.
 * Every mutation goes through the delegate (check first) and re-renders.
 */
export function buildGroupDesigner(root: HTMLElement, opts: GroupDesignerOpts): void {
  root.textContent = "";

  const dispatch = (edit: Parameters<NodeGraphDelegate["perform"]>[1]) => {
    if (opts.delegate.check(opts.ctx, edit).ok) {
      opts.delegate.perform(opts.ctx, edit);
    }
    buildGroupDesigner(root, opts);
    opts.onChanged?.();
  };

  const common = { graphPath: opts.graphPath, ref: opts.ref, def: opts.def };
  const exposed = opts.def.exposed;

  exposed.forEach((entry, index) => {
    const state = exposedEntryState(opts.def.subgraph, entry);
    if (state === "unresolved") {
      return;
    }

    const target = opts.def.subgraph.nodeIdMap.get(entry.nodeId);
    const row = document.createElement("div");
    row.className = "nodeeditor-exposure-row";
    row.dataset.exposureIndex = String(index);
    row.dataset.exposureState = state;
    row.style.cssText = "display: flex; gap: 4px; align-items: center; font-size: 11px;";

    const name = document.createElement("span");
    name.textContent = entry.label || entry.propKey || target?.getUIName() || String(entry.nodeId);
    row.appendChild(name);

    if (state === "missing") {
      const flag = document.createElement("span");
      flag.textContent = "missing";
      flag.title = "This entry's target no longer exists; repoint or remove it";
      flag.style.color = opts.errorColor ?? "#ff6666";
      row.appendChild(flag);

      const nodeIdIn = document.createElement("input");
      nodeIdIn.type = "text";
      nodeIdIn.title = "Node id to repoint this entry at";
      nodeIdIn.style.width = "48px";
      row.appendChild(nodeIdIn);

      const keyIn = document.createElement("input");
      keyIn.type = "text";
      keyIn.title = "Property key to repoint this entry at";
      keyIn.style.width = "64px";
      row.appendChild(keyIn);

      const repoint = document.createElement("button");
      repoint.textContent = "Repoint";
      repoint.title = "Point this entry at a different property";
      repoint.addEventListener("click", () => {
        dispatch({
          kind: "repointEntry",
          ...common,
          index,
          nodeId : _parseNodeId(nodeIdIn.value),
          propKey: keyIn.value.trim(),
        });
      });
      row.appendChild(repoint);
    } else {
      const up = document.createElement("button");
      up.textContent = "↑";
      up.title = "Move this entry up";
      up.addEventListener("click", () =>
        dispatch({ kind: "reorderEntry", ...common, from: index, to: index - 1 })
      );
      row.appendChild(up);

      const down = document.createElement("button");
      down.textContent = "↓";
      down.title = "Move this entry down";
      down.addEventListener("click", () =>
        dispatch({ kind: "reorderEntry", ...common, from: index, to: index + 1 })
      );
      row.appendChild(down);
    }

    const remove = document.createElement("button");
    remove.textContent = "✕";
    remove.title = "Stop exposing this entry";
    remove.addEventListener("click", () => dispatch({ kind: "removeEntry", ...common, index }));
    row.appendChild(remove);

    root.appendChild(row);
  });

  const addRow = document.createElement("div");
  addRow.className = "nodeeditor-exposure-add";
  addRow.style.cssText = "display: flex; gap: 4px; align-items: center; font-size: 11px;";

  const nodeIdIn = document.createElement("input");
  nodeIdIn.type = "text";
  nodeIdIn.title = "Node id of the property's owner";
  nodeIdIn.style.width = "48px";
  addRow.appendChild(nodeIdIn);

  const keyIn = document.createElement("input");
  keyIn.type = "text";
  keyIn.title = "Property key to expose; leave empty to forward the node's whole UI";
  keyIn.style.width = "64px";
  addRow.appendChild(keyIn);

  const add = document.createElement("button");
  add.textContent = "Expose";
  add.title = "Expose this property on every instance of the group";
  add.addEventListener("click", () => {
    const key = keyIn.value.trim();
    const entry = new ExposedEntry(
      key === "" ? "nodeUI" : "prop",
      _parseNodeId(nodeIdIn.value),
      key
    );
    dispatch({ kind: "exposeEntry", ...common, entry });
  });
  addRow.appendChild(add);

  root.appendChild(addRow);
}

/** GraphId is number | string; a numeric string reads as the number id. */
function _parseNodeId(text: string): GraphId {
  const raw = text.trim();
  return /^-?\d+$/.test(raw) ? Number(raw) : raw;
}
