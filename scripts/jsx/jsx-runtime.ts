/**
 * Minimal JSX runtime for path.ux.
 *
 * `jsx()`/`jsxs()` do NOT build widgets directly. JSX evaluates bottom-up, but
 * the `Container` builder API needs the parent container, `ctx`, and the current
 * `dataPrefix` *before* a child can be constructed. So the factory produces an
 * immutable descriptor tree (the IR below); a separate top-down `mount()` pass
 * (see ./mount) replays that IR through the same builders the xmlpage `Handler`
 * uses. This is a one-shot builder — there is no virtual DOM and no reconciler;
 * path.ux's own reactivity (`dependsOn`, `update()`) stays in charge.
 *
 * Configured as a classic-runtime factory via tsconfig:
 *   "jsx": "react", "jsxFactory": "jsx", "jsxFragmentFactory": "Fragment"
 */

/** A callback that receives the built widget for a node carrying a `ref` prop. */
export type Ref<T> = (el: T) => void;

export type PXChild = PXNode | string | number | boolean | null | undefined;

export type PXTag = string | typeof Fragment | ((props: Record<string, unknown>) => PXNode);

export interface PXNode {
  tag: PXTag;
  props: Record<string, unknown>;
  children: PXChild[];
}

export const Fragment = Symbol.for("pathux.jsx.Fragment");

function flatten(children: PXChild[]): PXChild[] {
  const out: PXChild[] = [];
  for (const c of children) {
    if (Array.isArray(c)) {
      out.push(...flatten(c as PXChild[]));
    } else {
      out.push(c);
    }
  }
  return out;
}

export function jsx(
  tag: PXTag,
  props: Record<string, unknown> | null,
  ...children: PXChild[]
): PXNode {
  return { tag, props: props ?? {}, children: flatten(children) };
}

/** Multi-child variant; identical to {@link jsx} for the classic runtime. */
export const jsxs = jsx;
