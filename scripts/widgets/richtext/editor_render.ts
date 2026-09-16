import type { WidgetHost } from "./widget_host";
import type { WidgetOptions } from "./widget";
import type { DocumentSession } from "./context";
import { widgetSlot } from "./widget_host";
import { blockElement } from "./positions";
import type { BlockId, DocChange, DocumentProvider, EditResult, ProviderContext } from "./provider";

// The editable root's DOM as a projection of the document: rendered whole, or patched block
// by block from an edit's result. The editor decides when; nothing here reads the selection.

function renderBlock<Doc>(
  session: DocumentSession<Doc>,
  id: BlockId,
  ctx: ProviderContext,
  options?: WidgetOptions<Doc>
): HTMLElement {
  try {
    const descriptor = options?.resolveNativeBlock?.(session, id, ctx);
    if (descriptor) {
      const block = document.createElement("div");
      block.dataset.docBlock = id;
      block.contentEditable = "false";
      block.append(widgetSlot(descriptor));
      return block;
    }
    return session.provider.renderBlock(session.doc, id, ctx);
  } catch {
    const block = document.createElement("div");
    block.dataset.docBlock = id;
    block.contentEditable = "false";
    block.textContent = "Widget unavailable";
    return block;
  }
}

/** Reconciles every block through the same mount host as incremental edits. */
export function renderRoot<Doc>(
  root: HTMLElement,
  session: DocumentSession<Doc>,
  ctx: ProviderContext,
  host: WidgetHost<Doc>,
  options?: WidgetOptions<Doc>
): void {
  const ids = session.provider.blocks(session.doc);
  patchBlocks(
    root,
    session.provider,
    session.doc,
    ctx,
    {
      dirtyBlocks  : ids,
      removedBlocks: [...root.children]
        .map((el) => el.getAttribute("data-doc-block")!)
        .filter((id) => !ids.includes(id)),
    },
    undefined,
    () => {},
    host,
    session,
    options
  );
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
  onFresh: (element: HTMLElement) => void,
  host: WidgetHost<Doc>,
  session: DocumentSession<Doc>,
  options?: WidgetOptions<Doc>
): void {
  const order = provider.blocks(doc);
  const dirty = result.dirtyBlocks
    .filter((id) => id !== held)
    .map((id) => ({ id, index: order.indexOf(id) }))
    .filter((entry) => entry.index >= 0)
    .sort((a, b) => a.index - b.index);

  for (const { id, index } of dirty) {
    const fresh = renderBlock(session, id, ctx, options);
    const old = blockElement(root, id);

    host.replace(old, fresh, () => {
      if (old !== undefined) {
        old.before(fresh);
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
    });
    onFresh(fresh);
  }
  for (const id of result.removedBlocks) {
    if (id !== held) blockElement(root, id)?.remove();
  }
  host.sweep();
}
