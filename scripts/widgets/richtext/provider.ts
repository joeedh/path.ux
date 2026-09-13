import type { IContextBase } from "../../core/context_base";

// The editor's whole view of a document is here: blocks with stable ids, flattened text per
// block, positions into that text, and the edits the provider applies. Marks, block kinds and
// atom contents stay the provider's business. See documentation/plans/rich-text-provider.md.

/** Stable identity of a block. Opaque to the editor, which never parses one. */
export type BlockId = string;

/** The one character an atom contributes to a block's flattened text. */
export const ATOM_CHAR = String.fromCharCode(0xfffc);

/**
 * The zero-width text a renderer emits on each side of an atom and inside an empty block, so
 * the caret has a text node to sit in. The position walk counts it as length 0.
 */
export const CARET_SLOT = String.fromCharCode(0x200b);

/** A position in a block's flattened text; `offset` runs from 0 to the text's length inclusive. */
export interface DocPos {
  block: BlockId;
  offset: number;
}

/** A selection. `head` is the caret end and may come before `anchor` in document order. */
export interface DocRange {
  anchor: DocPos;
  head: DocPos;
}

/** One toolbar entry, named by the string a `toggleMark` edit carries. */
export interface MarkInfo {
  name: string;
  /** Tooltip text. */
  label: string;
  /** An `Icons.*` index. */
  icon: number;
}

/** A selection ready for the clipboard, one plain-text entry per block. */
export interface ClipboardContent {
  blocks: readonly string[];
  /** The whole selection as HTML, when the provider can produce it. */
  html?: string;
}

/**
 * Provider-serialized state of one block, restored by a `replaceBlocks` edit. The editor never
 * reads `state`.
 */
export interface BlockSnapshot {
  id: BlockId;
  state: unknown;
}

/**
 * One edit to a document. `insertText` and `insertContent` replace a non-collapsed range;
 * `deleteRange` across blocks joins the outer two; `replaceBlocks` is the snapshot form of an
 * inverse and is never produced by user input.
 */
export type EditOp =
  | { type: "insertText"; at: DocRange; text: string }
  | { type: "deleteRange"; range: DocRange }
  | { type: "splitBlock"; at: DocPos; newBlock: BlockId }
  | { type: "joinWithPrevious"; block: BlockId }
  | { type: "toggleMark"; range: DocRange; mark: string }
  | {
      type: "insertContent";
      at: DocRange;
      content: ClipboardContent;
      /** One pre-allocated id per entry of `content.blocks` beyond the first. */
      newBlocks: readonly BlockId[];
    }
  | {
      type: "replaceBlocks";
      /** The block the restored ones follow; `null` places them at the document start. */
      after: BlockId | null;
      blocks: readonly BlockSnapshot[];
      remove: readonly BlockId[];
    };

/** What an edit changed and where the caret lands. */
export interface EditResult {
  /** Blocks to re-render, new ids included. */
  dirtyBlocks: readonly BlockId[];
  removedBlocks: readonly BlockId[];
  selection: DocRange;
}

/**
 * A change the editor did not make through `applyEdit`. Without `selection` the editor keeps
 * its own caret.
 */
export interface DocChange {
  dirtyBlocks: readonly BlockId[];
  removedBlocks: readonly BlockId[];
  selection?: DocRange;
}

/**
 * The seam between the editor and a document model. Every method is synchronous; a provider
 * over an asynchronous store keeps an in-memory document and reconciles behind it through
 * `onChange`. `applyEdit` mutates `doc` in place, so `Doc` must be a mutable object.
 */
export interface DocumentProvider<Doc> {
  blocks(doc: Doc): readonly BlockId[];
  /** The block's flattened text: its runs concatenated, each atom counting as one `ATOM_CHAR`. */
  blockText(doc: Doc, block: BlockId): string;
  /** Whether the caret cannot enter the block, which is then selected or deleted as a unit. */
  isOpaque(doc: Doc, block: BlockId): boolean;
  /** The marks a `toggleMark` edit may name; the editor builds its toolbar from this list. */
  marks(): readonly MarkInfo[];
  /**
   * The marks the toolbar shows as on for `range`: those a `toggleMark` there would remove,
   * or those typing at a collapsed range would extend. Without it the toolbar never lights.
   */
  activeMarks?(doc: Doc, range: DocRange): readonly string[];

  /**
   * A fresh element for the block, replaced wholesale on every re-render. The root carries
   * `data-doc-block`; an atom carries `data-doc-atom` and `contenteditable="false"`; a
   * `CARET_SLOT` text node sits on each side of an atom and inside an empty block.
   */
  renderBlock(doc: Doc, block: BlockId, ctx: IContextBase): HTMLElement;

  applyEdit(doc: Doc, op: EditOp): EditResult;
  /**
   * The edit that undoes `op`, computed before `applyEdit(doc, op)` runs. For `insertText` and
   * `deleteRange` it must also undo every later keystroke folded into the same run, so it has
   * to restore the block rather than reverse the one edit; a `replaceBlocks` snapshot does.
   */
  inverse(doc: Doc, op: EditOp): EditOp;

  toClipboard(doc: Doc, range: DocRange): ClipboardContent;
  /** Content for a paste or drop, or `undefined` to refuse it. */
  fromClipboard(data: DataTransfer): ClipboardContent | undefined;

  /** Subscribes to changes made outside `applyEdit`; returns the unsubscribe function. */
  onChange(doc: Doc, listener: (change: DocChange) => void): () => void;
}

let blockIdCounter = 0;

/** A fresh block id: a UUID where the platform has one, a timestamp plus counter otherwise. */
export function newBlockId(): BlockId {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `b${Date.now().toString(36)}-${blockIdCounter++}`;
}
