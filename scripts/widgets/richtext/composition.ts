import { blockElement, blockTextOf, mapThroughPending } from "./positions";
import type { PendingDocView } from "./positions";
import { ATOM_CHAR, CARET_SLOT } from "./provider";
import type { BlockId, DocPos, DocRange, EditOp } from "./provider";

// What a composition did to one block, recovered by diffing the block's flattened text against
// the snapshot taken at compositionstart. See documentation/plans/rich-text-ime.md, "The diff,
// precisely". Every offset here is in the snapshot's coordinates.

/** One replaced range of the snapshot text and the text that now stands in its place. */
export interface ComposedEdit {
  /** The half-open range `[start, end)` of the snapshot text that the composition replaced. */
  range: [number, number];
  /** The text now in that range; empty when the composition only removed text. */
  text: string;
}

/** Why the diff cannot vouch for what the browser did, so the editor falls back to a re-render. */
export interface ComposedRefusal {
  refused: string;
}

/** The longest common prefix of two strings, in UTF-16 units. */
function commonPrefix(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) {
    i++;
  }

  return i;
}

/** The longest common suffix of two strings, in UTF-16 units. */
function commonSuffix(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[a.length - 1 - i] === b[b.length - 1 - i]) {
    i++;
  }

  return i;
}

/**
 * Diffs the composed block's text `dom` against the snapshot `base`, given the selection at
 * `compositionstart` as two snapshot offsets in either order. Answers `undefined` when nothing
 * changed, the edit that turns `base` into `dom` otherwise, or a refusal when that edit is
 * not one the editor can attribute to the composition: it would insert an atom or a caret
 * slot, or it sits away from the selection.
 *
 * The minimal edit is one replaced range; when the inserted text is periodic it can sit at
 * more than one start, and the start nearest the selection is taken. The range is then widened
 * to cover the selection, since the browser deleted the selection on the first update and a
 * selected character that recurs in the composed text would otherwise keep its marks.
 */
export function composedEdit(
  base: string,
  dom: string,
  selection: readonly [number, number]
): ComposedEdit | ComposedRefusal | undefined {
  if (base === dom) {
    return undefined;
  }

  const selStart = Math.max(0, Math.min(selection[0], selection[1], base.length));
  const selEnd = Math.max(0, Math.min(Math.max(selection[0], selection[1]), base.length));

  const prefix = commonPrefix(base, dom);
  const suffix = commonSuffix(base, dom);
  // prefix and suffix may overlap when the change is periodic; the overlap is the width of
  // the interval of starts that all produce dom
  const overlap = Math.max(0, prefix + suffix - Math.min(base.length, dom.length));
  const replaced = base.length - prefix - suffix + overlap;

  const start = Math.max(prefix - overlap, Math.min(prefix, selStart));
  const end = start + replaced;

  if (start > selEnd || end < selStart) {
    return { refused: `the change at ${start} is away from the selection at ${selStart}` };
  }

  const from = Math.min(start, selStart);
  const to = Math.max(end, selEnd);
  // the suffix kept after the range is the same length in both texts
  const text = dom.slice(from, dom.length - (base.length - to));

  if (text.includes(ATOM_CHAR)) {
    return { refused: "the composed text contains an atom" };
  }
  if (text.includes(CARET_SLOT)) {
    return { refused: "the composed text contains a caret slot" };
  }

  return { range: [from, to], text };
}

const BLOCK_ATTR = "data-doc-block";

/**
 * Checks that the editable root's children are exactly the block elements for `blocks`, in
 * order, with nothing else beside them. A composition that put text outside every block fails
 * the check, and so does a browser that joined two blocks. The editor then re-renders all.
 */
export function rootReflects(root: ParentNode, blocks: readonly BlockId[]): boolean {
  const kids = root.childNodes;
  if (kids.length !== blocks.length) {
    return false;
  }

  for (let i = 0; i < kids.length; i++) {
    const kid = kids[i];
    if (kid.nodeType !== 1 || (kid as Element).getAttribute(BLOCK_ATTR) !== blocks[i]) {
      return false;
    }
  }

  return true;
}

/** What the editor froze at `compositionstart`, so the composed block can be diffed at the end. */
export interface CompositionSnapshot {
  block: BlockId;
  /** The block's flattened text when the composition began. */
  text: string;
  /** The selection then, in DOM coordinates (before the pending ops), as the editor read it. */
  selection: DocRange;
  /** The non-reflected ops pending then; the composed block's DOM does not reflect these. */
  pending: EditOp[];
  /** The document as it stood then, for mapping the composed edit through `pending`. */
  view: PendingDocView;
}

/**
 * Freezes the block under `range` and the document as `view` shows it, or `undefined` when
 * the block is not rendered. `pending` is the non-reflected ops in flight.
 */
export function freezeComposition(
  root: ParentNode,
  range: DocRange,
  view: PendingDocView,
  pending: EditOp[]
): CompositionSnapshot | undefined {
  const block = range.head.block;
  const element = blockElement(root, block);
  if (element === undefined) {
    return undefined;
  }

  const blocks = [...view.blocks];
  const texts = new Map(blocks.map((id) => [id, view.blockText(id)]));

  return {
    block,
    text     : blockTextOf(element),
    selection: range,
    pending,
    view: { blocks, blockText: (id) => texts.get(id) ?? "" },
  };
}

/** What `compositionend` resolves to: an op to submit, a re-render of the composed block, or a refusal. */
export type CompositionOutcome =
  { kind: "op"; op: EditOp } | { kind: "rerender" } | { kind: "refuse" };

/**
 * Diffs the composed block against `snapshot` and maps the edit through the ops that were
 * pending, with `view` the document now. Refuses when the root no longer shows the document's
 * blocks, the selection spanned blocks, or the diff cannot attribute what the browser did.
 */
export function resolveComposition(
  snapshot: CompositionSnapshot,
  root: ParentNode,
  view: PendingDocView
): CompositionOutcome {
  const element = blockElement(root, snapshot.block);
  if (element === undefined || !rootReflects(root, view.blocks)) {
    return { kind: "refuse" };
  }

  const sel = snapshot.selection;
  if (sel.anchor.block !== snapshot.block || sel.head.block !== snapshot.block) {
    return { kind: "refuse" };
  }

  const edit = composedEdit(snapshot.text, blockTextOf(element), [
    sel.anchor.offset,
    sel.head.offset,
  ]);

  if (edit === undefined) {
    // nothing composed, or an abandoned composition: the DOM is back to the block's text, but
    // a held result may have moved the document on, so the block is re-rendered
    return { kind: "rerender" };
  }
  if ("refused" in edit) {
    return { kind: "refuse" };
  }

  const map = (offset: number): DocPos =>
    mapThroughPending({ block: snapshot.block, offset }, snapshot.pending, snapshot.view);
  const range: DocRange = { anchor: map(edit.range[0]), head: map(edit.range[1]) };
  const op: EditOp =
    edit.text.length > 0
      ? { type: "insertText", at: range, text: edit.text }
      : { type: "deleteRange", range };

  return { kind: "op", op };
}
