import type { IContextBase } from "../../core/context_base";
import type { RowFrame } from "../../core/ui_containers";

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

/** A value that survives `JSON.stringify`, which is how a `DocEditOp` stores its op. */
export type JsonValue =
  string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue };

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

/** A text-length change a `custom` op makes, so pending positions can be mapped through it. */
export interface CustomShift {
  block: BlockId;
  at: number;
  /** Positive for text added at `at`, negative for text removed from `at` on. */
  delta: number;
}

/**
 * One edit to a document. `insertText` and `insertContent` replace a non-collapsed range;
 * `deleteRange` across blocks joins the outer two; `replaceBlocks` is the snapshot form of an
 * inverse and is never produced by user input; `custom` is the provider's own, which the
 * editor never produces and never reads beyond `blocks` and `shifts`.
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
    }
  | {
      type: "custom";
      name: string;
      /** A contiguous span in document order: every block from the first touched to the last. */
      blocks: readonly BlockId[];
      data: JsonValue;
      /** One entry per block whose text length changes; omitted when none does. */
      shifts?: readonly CustomShift[];
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

/** A heading, for a consumer building an outline; the title comes from `blockText`. */
export interface HeadingInfo {
  block: BlockId;
  level: number;
}

/** A link the provider rendered and the user clicked, carried by the editor's `linkclick` event. */
export interface LinkInfo {
  /** Provider-defined: `"url"`, `"wiki"`, whatever else the provider parses. */
  kind: string;
  target: string;
  text: string;
  range: DocRange;
}

/**
 * The editor as a provider reaches it, through `ctx.editor` on the context every embedded
 * widget and toolbar item is built under. One bridge per editor.
 */
export interface EditorBridge {
  /** Ends the typing run and commits `op` through the session's toolstack; `undefined` when read-only. */
  dispatch(op: EditOp): Promise<EditResult | undefined>;
  readonly readOnly: boolean;
  /** The selection as document positions, mapped through the ops still pending. */
  selection(): DocRange | undefined;
  select(range: DocRange): void;
  blockElement(block: BlockId): HTMLElement | undefined;
  /** The document position under a viewport point, for a drop caret; `undefined` where the platform cannot say. */
  posFromPoint(x: number, y: number): DocPos | undefined;
  /** The editable root, for positioning a popup. */
  readonly root: HTMLElement;
  /** Raises the editor's `linkclick` event; returns `false` when the consumer prevented it. */
  linkClicked(link: LinkInfo, event: MouseEvent): boolean;
}

/** The context a provider renders and builds its toolbar under: the editor's, with the bridge on it. */
export interface ProviderContext extends IContextBase {
  editor: EditorBridge;
}

/** Called on every selection change of the editor whose toolbar the provider built. */
export type ToolbarSync<Doc> = (doc: Doc, selection: DocRange | undefined) => void;

/**
 * The seam between the editor and a document model. Every method is synchronous; a provider
 * over an asynchronous store keeps an in-memory document and reconciles behind it through
 * `onExternalChange`. `applyEdit` mutates `doc` in place, so `Doc` must be a mutable object.
 */
export interface DocumentProvider<Doc> {
  blocks(doc: Doc): readonly BlockId[];
  /** The block's flattened text: its runs concatenated, each atom counting as one `ATOM_CHAR`. */
  blockText(doc: Doc, block: BlockId): string;
  /** Whether the caret cannot enter the block, which is then selected or deleted as a unit. */
  isOpaque(doc: Doc, block: BlockId): boolean;
  /** The marks a `toggleMark` edit may name; the editor's `toggleMark` and its key mappings resolve against this list. */
  marks(): readonly MarkInfo[];
  /**
   * The marks the toolbar shows as on for `range`: those a `toggleMark` there would remove,
   * or those typing at a collapsed range would extend. Without it the toolbar never lights.
   */
  activeMarks?(doc: Doc, range: DocRange): readonly string[];
  /** The headings in document order, for a consumer building an outline. */
  headings?(doc: Doc): readonly HeadingInfo[];

  /**
   * A fresh element for the block, replaced wholesale on every re-render. The root carries
   * `data-doc-block`; an atom carries `data-doc-atom` and `contenteditable="false"`; a
   * `CARET_SLOT` text node sits on each side of an atom and inside an empty block.
   */
  renderBlock(doc: Doc, block: BlockId, ctx: ProviderContext): HTMLElement;
  /**
   * CSS for the rendered blocks, placed in the editor's shadow root after its own styles and
   * replaced whole on every theme update. The string is static; colors and fonts come from
   * the CSS variables the editor sets on its root.
   */
  styles?(): string;
  /**
   * Fills the toolbar row the editor hosts, editing through `ctx.editor.dispatch`, and
   * returns the sync the editor calls on every selection change. Runs once per session set.
   */
  buildToolbar?(row: RowFrame<ProviderContext>, ctx: ProviderContext): ToolbarSync<Doc> | undefined;

  /**
   * A key the provider handles before the editor does: a returned op is submitted and the
   * event consumed, which also suppresses the `beforeinput` the key would have produced.
   * Every key arrives but the undo and redo chords; nothing arrives in read-only mode.
   */
  handleKey?(doc: Doc, range: DocRange, event: KeyboardEvent): EditOp | undefined;

  applyEdit(doc: Doc, op: EditOp): EditResult;
  /**
   * The edit that undoes `op`, computed before `applyEdit(doc, op)` runs. For `insertText` and
   * `deleteRange` it must also undo every later keystroke folded into the same run, so it has
   * to restore the block rather than reverse the one edit; a `replaceBlocks` snapshot does.
   */
  inverse(doc: Doc, op: EditOp): EditOp;

  /** The snapshots a `replaceBlocks` needs, of `blocks` or of the whole document. */
  snapshots(doc: Doc, blocks?: readonly BlockId[]): readonly BlockSnapshot[];

  toClipboard(doc: Doc, range: DocRange): ClipboardContent;
  /** Content for a paste or drop, or `undefined` to refuse it. */
  fromClipboard(data: DataTransfer): ClipboardContent | undefined;
  /** The document serialized for saving; `Blob.type` carries the media type. */
  emitDocFile(doc: Doc): Blob;

  /**
   * Subscribes to mutations the session cannot see (a store reconciling behind the document,
   * a write to a field it renders) and returns the unsubscribe. A provider never reports its
   * own `applyEdit`, and a change reported here lands on no undo stack.
   */
  onExternalChange?(doc: Doc, listener: (change: DocChange) => void): () => void;
}

let blockIdCounter = 0;

/** A fresh block id: a UUID where the platform has one, a timestamp plus counter otherwise. */
export function newBlockId(): BlockId {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `b${Date.now().toString(36)}-${blockIdCounter++}`;
}
