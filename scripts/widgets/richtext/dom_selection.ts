import { fromDocPos, toDocPos } from "./positions";
import type { DomPos, PendingDocView } from "./positions";
import type { DocPos, DocRange } from "./provider";

// The live selection as document positions and back, for an editable root inside a shadow
// root. Reading goes through `getComposedRanges` where the browser has it, since the plain
// `Selection` API answers the shadow host's position from outside.

/** The shadow root's own selection where the browser has one, else the document's. */
export function domSelection(shadow: ShadowRoot): Selection | null {
  const scoped = shadow as ShadowRoot & { getSelection?(): Selection | null };
  return scoped.getSelection?.() ?? document.getSelection();
}

function isBackward(sel: Selection, range: StaticRange): boolean {
  if (sel.anchorNode === null || sel.focusNode === null) {
    return false;
  }
  if (sel.anchorNode === sel.focusNode) {
    return sel.anchorOffset > sel.focusOffset;
  }

  return sel.anchorNode === range.endContainer && sel.anchorOffset === range.endOffset;
}

/** The selection's endpoints as DOM positions, if there is a selection. */
export function selectionEndpoints(
  shadow: ShadowRoot
): { anchor: DomPos; head: DomPos } | undefined {
  const sel = domSelection(shadow);
  if (sel === null || sel.rangeCount === 0) {
    return undefined;
  }

  const composed = (
    sel as Selection & {
      getComposedRanges?(options: { shadowRoots: ShadowRoot[] }): StaticRange[];
    }
  ).getComposedRanges?.({ shadowRoots: [shadow] });

  if (composed !== undefined && composed.length > 0) {
    const r = composed[0];
    const backward = isBackward(sel, r);
    const start = { node: r.startContainer, offset: r.startOffset };
    const end = { node: r.endContainer, offset: r.endOffset };
    return backward ? { anchor: end, head: start } : { anchor: start, head: end };
  }

  if (sel.anchorNode === null || sel.focusNode === null) {
    return undefined;
  }

  return {
    anchor: { node: sel.anchorNode, offset: sel.anchorOffset },
    head  : { node: sel.focusNode, offset: sel.focusOffset },
  };
}

/** A DOM position under `root` to a document one; a position on the root itself lands on a block edge. */
export function docPosIn(
  root: HTMLElement,
  view: PendingDocView,
  node: Node,
  offset: number
): DocPos | undefined {
  if (node === root) {
    const kids = root.children;
    if (offset < kids.length) {
      const block = kids[offset].getAttribute("data-doc-block");
      return block === null ? undefined : { block, offset: 0 };
    }

    const last = view.blocks[view.blocks.length - 1];
    return last === undefined ? undefined : { block: last, offset: view.blockText(last).length };
  }

  return toDocPos(root, node, offset);
}

/** The selection as a document range, or `undefined` when it is elsewhere. */
export function domRange(
  root: HTMLElement,
  shadow: ShadowRoot,
  view: PendingDocView
): DocRange | undefined {
  const ends = selectionEndpoints(shadow);
  if (ends === undefined) {
    return undefined;
  }

  const anchor = docPosIn(root, view, ends.anchor.node, ends.anchor.offset);
  const head = docPosIn(root, view, ends.head.node, ends.head.offset);
  return anchor !== undefined && head !== undefined ? { anchor, head } : undefined;
}

/** Places the selection at `range`; nothing happens for a position the root does not show. */
export function setDomSelection(root: HTMLElement, shadow: ShadowRoot, range: DocRange): void {
  const anchor = fromDocPos(root, range.anchor);
  const head = fromDocPos(root, range.head);
  const sel = domSelection(shadow);
  if (anchor === undefined || head === undefined || sel === null) {
    return;
  }

  sel.setBaseAndExtent(anchor.node, anchor.offset, head.node, head.offset);
}
