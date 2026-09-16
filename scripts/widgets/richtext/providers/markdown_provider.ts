import type { RowFrame } from "../../../core/ui_containers";
import { newBlockId } from "../provider";
import type {
  BlockId,
  BlockSnapshot,
  ClipboardContent,
  DocChange,
  DocRange,
  DocumentProvider,
  EditOp,
  EditResult,
  HeadingInfo,
  ProviderContext,
  ToolbarSync,
} from "../provider";
import { hasMark } from "./marks";
import type { MdDoc } from "./markdown_model";
import { renderMarkdownBlock, markdownStyles } from "./markdown_render";
import type { MarkdownRenderOptions } from "./markdown_render";
import { markdownText } from "./markdown_serialize";
import { fromClipboard, toClipboard } from "./markdown_clipboard";
import { applyCustom, customData } from "./markdown_custom";
import {
  blockOf,
  cloneBlock,
  collapsed,
  indexOf,
  isOpaque,
  MD_MARKS,
  orderRange,
  rangeBlocks,
  segments,
  textOf,
  unique,
} from "./markdown_doc";
import {
  deleteRange,
  insertContent,
  insertText,
  joinWithPrevious,
  replaceBlocks,
  splitBlock,
  toggleMark,
} from "./markdown_edits";
import { markdownOps } from "./markdown_ops";
import { buildMarkdownToolbar } from "./markdown_toolbar";

// The provider over `MdDoc`: the protocol surface, with the standard ops in
// `markdown_edits.ts`, the custom ops in `markdown_custom.ts`, the clipboard in
// `markdown_clipboard.ts` and the toolbar in `markdown_toolbar.ts`. Reached through
// `richtext/markdown.ts`, never the barrel.

/** What the app is told as a `[[` is typed, before the second `[` lands: `offset` is where the caret will then be. */
export interface WikilinkStart {
  block: BlockId;
  offset: number;
  event: KeyboardEvent;
}

export interface MarkdownProviderOptions extends MarkdownRenderOptions {
  /** Whether a marker typed at the start of a paragraph (`# `, `- `, `1. `, `> `, three backticks) changes its kind; on by default. */
  shortcuts?: boolean;
  /**
   * Called from `handleKey` as the second `[` of a `[[` is typed, so the app can open its own
   * wikilink completion; the key still inserts. A pick lands through `markdownOps.insertWikilink`.
   */
  onWikilinkStart?: (start: WikilinkStart) => void;
}

/**
 * The provider over `MdDoc`. Paragraphs, headings, list items, quotes and fences are edited in
 * place; rules, tables, raw HTML and front matter are opaque, one `ATOM_CHAR` long, deleted
 * as a unit and never typed into. `inverse` answers with a `replaceBlocks` snapshot of the
 * contiguous span an edit touches, as the reference provider does.
 */
export class MarkdownProvider implements DocumentProvider<MdDoc> {
  private listeners = new WeakMap<MdDoc, Set<(change: DocChange) => void>>();

  constructor(readonly options: MarkdownProviderOptions = {}) {}

  blocks(doc: MdDoc) {
    return doc.blocks.map((b) => b.id);
  }

  /** The block's text; an opaque block answers one `ATOM_CHAR`, so its offsets run 0 to 1. */
  blockText(doc: MdDoc, block: BlockId) {
    return textOf(doc, block);
  }

  isOpaque(doc: MdDoc, block: BlockId) {
    return isOpaque(blockOf(doc, block));
  }

  marks() {
    return MD_MARKS;
  }

  activeMarks(doc: MdDoc, range: DocRange): readonly string[] {
    const r = orderRange(doc, range);
    const names = MD_MARKS.map((m) => m.name);

    if (r.startIndex === r.endIndex && r.start.offset === r.end.offset) {
      const { marks } = doc.blocks[r.startIndex];
      const pos = r.start.offset;
      return names.filter((name) =>
        marks.some((m) => m.name === name && m.from < pos && pos <= m.to)
      );
    }

    const runs = segments(doc, r);
    if (runs.length === 0) {
      return [];
    }

    return names.filter((name) =>
      runs.every(({ block, from, to }) => hasMark(block.marks, name, from, to))
    );
  }

  headings(doc: MdDoc): HeadingInfo[] {
    const out: HeadingInfo[] = [];
    for (const b of doc.blocks) {
      if (b.kind === "heading") {
        out.push({ block: b.id, level: b.level });
      }
    }

    return out;
  }

  renderBlock(doc: MdDoc, block: BlockId, ctx: ProviderContext): HTMLElement {
    return renderMarkdownBlock(blockOf(doc, block), ctx, this.options);
  }

  styles() {
    return markdownStyles();
  }

  buildToolbar(row: RowFrame<ProviderContext>, ctx: ProviderContext): ToolbarSync<MdDoc> {
    return buildMarkdownToolbar(row, ctx, this);
  }

  /**
   * Tab and Shift+Tab on a list item change its depth; Enter in a fence adds a line, or leaves
   * the fence from an empty last line; Shift+Enter is a hard line break in any editable block.
   */
  handleKey(doc: MdDoc, range: DocRange, e: KeyboardEvent): EditOp | undefined {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return undefined;
    }

    const r = orderRange(doc, range);
    const b = doc.blocks[r.startIndex];
    const single = r.startIndex === r.endIndex;
    const isCollapsed = single && r.start.offset === r.end.offset;

    // the key falls through and inserts; the app hears about the [[ first
    if (
      e.key === "[" &&
      isCollapsed &&
      !isOpaque(b) &&
      b.kind !== "code" &&
      b.text[r.start.offset - 1] === "[" &&
      this.options.onWikilinkStart !== undefined
    ) {
      this.options.onWikilinkStart({ block: b.id, offset: r.start.offset + 1, event: e });
      return undefined;
    }

    if (e.key === "Tab") {
      if (b.kind !== "listItem") {
        return undefined;
      }

      const blocks = doc.blocks.slice(r.startIndex, r.endIndex + 1).map((x) => x.id);
      return markdownOps.setDepth(blocks, { delta: e.shiftKey ? -1 : 1, selection: range });
    }

    if (e.key !== "Enter" || isOpaque(b)) {
      return undefined;
    }

    if (b.kind === "code" && single) {
      const atEnd = isCollapsed && r.start.offset === b.text.length;
      if (atEnd && (b.text === "" || b.text.endsWith("\n"))) {
        return { type: "splitBlock", at: r.start, newBlock: newBlockId() };
      }

      return { type: "insertText", at: range, text: "\n" };
    }

    if (e.shiftKey) {
      return single
        ? markdownOps.insertBreak(range)
        : { type: "insertText", at: range, text: "\n" };
    }

    return undefined;
  }

  applyEdit(doc: MdDoc, op: EditOp): EditResult {
    const shortcuts = this.options.shortcuts !== false;

    switch (op.type) {
      case "insertText":
        return insertText(doc, op.at, op.text, false, shortcuts);
      case "deleteRange": {
        const cut = deleteRange(doc, op.range);
        return {
          dirtyBlocks  : cut.dirty,
          removedBlocks: cut.removed,
          selection    : collapsed(cut.start.block, cut.start.offset),
        };
      }
      case "splitBlock":
        return splitBlock(doc, op.at, op.newBlock);
      case "joinWithPrevious":
        return joinWithPrevious(doc, op.block);
      case "toggleMark":
        return toggleMark(doc, op.range, op.mark);
      case "insertContent":
        return insertContent(doc, op.at, op.content, op.newBlocks, shortcuts);
      case "replaceBlocks":
        return replaceBlocks(doc, op.after, op.blocks, op.remove);
      case "custom":
        return applyCustom(doc, op, shortcuts);
    }
  }

  inverse(doc: MdDoc, op: EditOp): EditOp {
    let touched: BlockId[] = [];
    let created: readonly BlockId[] = [];
    let after: BlockId | null | undefined;

    switch (op.type) {
      case "insertText":
        touched = rangeBlocks(doc, op.at);
        break;
      case "deleteRange":
      case "toggleMark":
        touched = rangeBlocks(doc, op.range);
        break;
      case "insertContent":
        touched = rangeBlocks(doc, op.at);
        created = op.newBlocks;
        break;
      case "splitBlock":
        touched = [op.at.block];
        created = [op.newBlock];
        break;
      case "joinWithPrevious": {
        const index = indexOf(doc, op.block);
        touched = index === 0 ? [op.block] : [doc.blocks[index - 1].id, op.block];
        break;
      }
      case "replaceBlocks": {
        const removing = new Set(op.remove);
        touched = doc.blocks.filter((b) => removing.has(b.id)).map((b) => b.id);
        created = op.blocks.map((b) => b.id);
        if (touched.length === 0) {
          after = op.after;
        }
        break;
      }
      case "custom": {
        // the span between the op's outermost blocks, whatever it listed in between
        const indices = op.blocks.map((id) => indexOf(doc, id));
        const first = Math.min(...indices);
        const last = Math.max(...indices);
        touched = doc.blocks.slice(first, last + 1).map((b) => b.id);

        const ids = customData(op).ids;
        if (Array.isArray(ids)) {
          created = ids.filter((id): id is string => typeof id === "string");
        }
        break;
      }
    }

    if (after === undefined) {
      const first = touched.length > 0 ? indexOf(doc, touched[0]) : 0;
      after = first > 0 ? doc.blocks[first - 1].id : null;
    }

    return {
      type: "replaceBlocks",
      after,
      blocks: this.snapshots(doc, touched),
      remove: unique([...touched, ...created]),
    };
  }

  snapshots(doc: MdDoc, blocks: readonly BlockId[] = this.blocks(doc)): BlockSnapshot[] {
    return blocks.map((id) => ({ id, state: cloneBlock(blockOf(doc, id)) }));
  }

  toClipboard(doc: MdDoc, range: DocRange): ClipboardContent {
    return toClipboard(doc, range);
  }

  fromClipboard(data: DataTransfer): ClipboardContent | undefined {
    return fromClipboard(data);
  }

  /** The document as markdown, as `text/markdown`. */
  emitDocFile(doc: MdDoc): Blob {
    return new Blob([markdownText(doc)], { type: "text/markdown" });
  }

  onExternalChange(doc: MdDoc, listener: (change: DocChange) => void) {
    let set = this.listeners.get(doc);
    if (set === undefined) {
      set = new Set();
      this.listeners.set(doc, set);
    }
    set.add(listener);

    return () => {
      set.delete(listener);
    };
  }

  /** Reports a change made to `doc` outside `applyEdit` to every `onExternalChange` listener. */
  notifyChange(doc: MdDoc, change: DocChange) {
    const set = this.listeners.get(doc);
    if (set === undefined) {
      return;
    }

    for (const listener of [...set]) {
      listener(change);
    }
  }
}
