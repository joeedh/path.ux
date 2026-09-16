import { blockElement } from "./positions";
import type { BlockId, DocChange, DocumentProvider, EditResult, ProviderContext } from "./provider";

// The editable root's DOM as a projection of the document: rendered whole, or patched block
// by block from an edit's result. The editor decides when; nothing here reads the selection.

/** Replaces the root's children with every block rendered afresh. */
export function renderRoot<Doc>(
  root: HTMLElement,
  provider: DocumentProvider<Doc>,
  doc: Doc,
  ctx: ProviderContext
): void {
  root.replaceChildren(...provider.blocks(doc).map((id) => provider.renderBlock(doc, id, ctx)));
}

/**
 * Re-renders `result`'s dirty blocks in document order and drops its removed ones; `held`
 * names a block the browser owns during a composition, which is left alone. `onFresh` runs
 * on each element rendered.
 */
export function patchBlocks<Doc>(
  root: HTMLElement,
  provider: DocumentProvider<Doc>,
  doc: Doc,
  ctx: ProviderContext,
  result: EditResult | DocChange,
  held: BlockId | undefined,
  onFresh: (element: HTMLElement) => void
): void {
  for (const id of result.removedBlocks) {
    if (id !== held) {
      blockElement(root, id)?.remove();
    }
  }

  const order = provider.blocks(doc);
  const dirty = result.dirtyBlocks
    .filter((id) => id !== held)
    .map((id) => ({ id, index: order.indexOf(id) }))
    .filter((entry) => entry.index >= 0)
    .sort((a, b) => a.index - b.index);

  for (const { id, index } of dirty) {
    const fresh = provider.renderBlock(doc, id, ctx);
    const old = blockElement(root, id);

    if (old !== undefined) {
      old.replaceWith(fresh);
    } else if (index === 0) {
      root.prepend(fresh);
    } else {
      const prev = blockElement(root, order[index - 1]);
      if (prev !== undefined) {
        prev.after(fresh);
      } else {
        root.append(fresh);
      }
    }
    onFresh(fresh);
  }
}
