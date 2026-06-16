/**
 * Replays a JSX IR tree (see ./jsx-runtime) into real path.ux widgets by reusing
 * the xmlpage `Handler` dispatch. `compile()` serializes the IR to an xmlpage XML
 * string plus a list of `ref` callbacks (function-valued props cannot travel
 * through the string, so each ref'd node is assigned a generated id). `mount()`
 * feeds the XML to `initPage` — the exact same dispatch xmlpage uses — then
 * resolves each ref via `getElementById` and invokes its callback.
 *
 * This keeps a single dispatch table shared between xmlpage and JSX. A future
 * pass could teach `Handler` to walk the IR directly and skip the XML round-trip.
 */

import { initPage } from "../xmlpage/xmlpage";
import type { Container } from "../core/ui";
import type { IContextBase } from "../core/context_base";
import { Fragment, type PXChild, type PXNode } from "./jsx-runtime";

interface RefEntry {
  id: string;
  fn: (el: HTMLElement) => void;
}

interface CompileState {
  refs: RefEntry[];
  counter: number;
}

function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeText(s).replace(/"/g, "&quot;");
}

function serialize(node: PXChild, st: CompileState): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }
  if (typeof node === "string" || typeof node === "number") {
    return escapeText(String(node));
  }

  let { tag } = node as PXNode;
  const { props, children } = node as PXNode;

  // Function components are invoked eagerly to produce more IR.
  if (typeof tag === "function") {
    return serialize(tag(props), st);
  }

  if (tag === Fragment) {
    return children.map((c) => serialize(c, st)).join("");
  }

  tag = tag as string;

  const attrs: Record<string, string> = {};
  let refFn: ((el: HTMLElement) => void) | undefined;

  for (const [k, v] of Object.entries(props)) {
    if (k === "children") {
      continue;
    }
    if (k === "ref") {
      if (typeof v === "function") {
        refFn = v as (el: HTMLElement) => void;
      }
      continue;
    }
    if (typeof v === "function" || v === null || v === undefined || v === false) {
      continue;
    }
    attrs[k] = String(v);
  }

  if (refFn) {
    if (!attrs.id) {
      attrs.id = `__px${st.counter++}`;
    }
    st.refs.push({ id: attrs.id, fn: refFn });
  }

  let open = `<${tag}`;
  for (const [k, v] of Object.entries(attrs)) {
    open += ` ${k}="${escapeAttr(v)}"`;
  }

  const inner = children.map((c) => serialize(c, st)).join("");
  return inner.length === 0 ? `${open}/>` : `${open}>${inner}</${tag}>`;
}

/**
 * Lower a JSX IR node to an xmlpage source string plus its `ref` callbacks.
 * Exported for testing; most callers want {@link mount}.
 */
export function compile(node: PXChild): { xml: string; refs: RefEntry[] } {
  const st: CompileState = { refs: [], counter: 0 };
  const xml = serialize(node, st);
  return { xml, refs: st.refs };
}

/**
 * Build a JSX IR tree into widgets under `parent`, returning the created
 * container. `ref` callbacks fire once their widget exists.
 */
export function mount<CTX extends IContextBase>(
  ctx: CTX,
  parent: Container<CTX>,
  node: PXChild
): Container<CTX> {
  const { xml, refs } = compile(node);
  const container = initPage(
    ctx,
    xml,
    parent as unknown as HTMLElement
  ) as unknown as Container<CTX>;

  for (const { id, fn } of refs) {
    const el = container.getElementById(id);
    if (el) {
      fn(el);
    } else {
      console.warn("jsx mount: ref target not found for id", id);
    }
  }

  return container;
}
