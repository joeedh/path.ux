import type { RowFrame } from "../../../core/ui_containers";
import { Icons } from "../../../icon_enum";
import { CARET_SLOT } from "../provider";
import type {
  BlockId,
  BlockSnapshot,
  ClipboardContent,
  DocChange,
  DocPos,
  DocRange,
  DocumentProvider,
  EditOp,
  EditResult,
  MarkInfo,
  ProviderContext,
  ToolbarSync,
} from "../provider";
import {
  clipMarks,
  cutMark,
  hasMark,
  markSegments,
  marksAfterDelete,
  marksAfterTyping,
  marksAroundInsert,
  normalizeMarks,
} from "./marks";
import type { Mark } from "./marks";
import { addMarkButtons } from "./toolbar";

/** A mark over the half-open offset range `[from, to)` of a block's text. */
export type PlainMark = Mark;

export interface PlainBlock {
  id: BlockId;
  text: string;
  marks: PlainMark[];
}

/** The reference document: a flat list of text blocks, each with flat marks. */
export interface PlainDoc {
  blocks: PlainBlock[];
}

interface OrderedRange {
  start: DocPos;
  end: DocPos;
  startIndex: number;
  endIndex: number;
}

const MARK_TAGS: Record<string, string> = {
  bold         : "b",
  italic       : "i",
  underline    : "u",
  strikethrough: "s",
};

const PLAIN_MARKS: readonly MarkInfo[] = [
  { name: "bold", label: "Bold", icon: Icons.BOLD },
  { name: "italic", label: "Italic", icon: Icons.ITALIC },
  { name: "underline", label: "Underline", icon: Icons.UNDERLINE },
  { name: "strikethrough", label: "Strikethrough", icon: Icons.STRIKETHRU },
];

const collapsed = (block: BlockId, offset: number): DocRange => ({
  anchor: { block, offset },
  head  : { block, offset },
});

const cloneBlock = (b: PlainBlock): PlainBlock => ({
  id   : b.id,
  text : b.text,
  marks: b.marks.map((m) => ({ ...m })),
});

const unique = (ids: readonly BlockId[]) => [...new Set(ids)];

/**
 * The reference provider over `PlainDoc`. Marks are flat offset ranges, no block is opaque,
 * and there are no atoms. `inverse` answers with a `replaceBlocks` snapshot of every block an
 * edit touches, so one inverse covers a whole folded typing run.
 */
export class PlainProvider implements DocumentProvider<PlainDoc> {
  private listeners = new WeakMap<PlainDoc, Set<(change: DocChange) => void>>();

  blocks(doc: PlainDoc) {
    return doc.blocks.map((b) => b.id);
  }

  blockText(doc: PlainDoc, block: BlockId) {
    return this.block(doc, block).text;
  }

  isOpaque(doc: PlainDoc, block: BlockId) {
    return false;
  }

  marks() {
    return PLAIN_MARKS;
  }

  activeMarks(doc: PlainDoc, range: DocRange): readonly string[] {
    const r = this.order(doc, range);
    const names = new Set(PLAIN_MARKS.map((m) => m.name));

    // a caret extends a mark it sits inside or at the end of, as marksAfterTyping does
    if (r.startIndex === r.endIndex && r.start.offset === r.end.offset) {
      const { marks } = doc.blocks[r.startIndex];
      const pos = r.start.offset;
      return [...names].filter((name) =>
        marks.some((m) => m.name === name && m.from < pos && pos <= m.to)
      );
    }

    const segments: { marks: readonly PlainMark[]; from: number; to: number }[] = [];
    for (let i = r.startIndex; i <= r.endIndex; i++) {
      const block = doc.blocks[i];
      const from = i === r.startIndex ? r.start.offset : 0;
      const to = i === r.endIndex ? r.end.offset : block.text.length;
      if (from < to) {
        segments.push({ marks: block.marks, from, to });
      }
    }

    if (segments.length === 0) {
      return [];
    }

    return [...names].filter((name) =>
      segments.every(({ marks, from, to }) => hasMark(marks, name, from, to))
    );
  }

  renderBlock(doc: PlainDoc, block: BlockId, ctx: ProviderContext): HTMLElement {
    const b = this.block(doc, block);
    const el = document.createElement("p");
    el.setAttribute("data-doc-block", b.id);

    if (b.text.length === 0) {
      el.append(document.createTextNode(CARET_SLOT));
      return el;
    }

    for (const { from, to, marks } of markSegments(b.text.length, b.marks)) {
      let node: Node = document.createTextNode(b.text.slice(from, to));

      // wrap innermost first, so the first mark in the list ends up outermost
      for (const m of [...marks].reverse()) {
        const tag = MARK_TAGS[m.name];
        const wrap = document.createElement(tag ?? "span");
        if (tag === undefined) {
          wrap.setAttribute("data-doc-mark", m.name);
        }
        wrap.append(node);
        node = wrap;
      }

      el.append(node);
    }

    return el;
  }

  buildToolbar(row: RowFrame<ProviderContext>, ctx: ProviderContext): ToolbarSync<PlainDoc> {
    return addMarkButtons(row, ctx, this);
  }

  applyEdit(doc: PlainDoc, op: EditOp): EditResult {
    switch (op.type) {
      case "insertText": {
        const cut = this.deleteRangeImpl(doc, op.at);
        const b = this.block(doc, cut.start.block);
        const pos = cut.start.offset;

        b.text = b.text.slice(0, pos) + op.text + b.text.slice(pos);
        b.marks = marksAfterTyping(b.marks, pos, op.text.length);

        return {
          dirtyBlocks  : unique([b.id, ...cut.dirty]),
          removedBlocks: cut.removed,
          selection    : collapsed(b.id, pos + op.text.length),
        };
      }

      case "deleteRange": {
        const cut = this.deleteRangeImpl(doc, op.range);

        return {
          dirtyBlocks  : cut.dirty,
          removedBlocks: cut.removed,
          selection    : collapsed(cut.start.block, cut.start.offset),
        };
      }

      case "splitBlock": {
        if (doc.blocks.some((b) => b.id === op.newBlock)) {
          throw new Error(`splitBlock: block id ${op.newBlock} is already in use`);
        }

        const index = this.index(doc, op.at.block);
        const b = doc.blocks[index];
        const pos = Math.min(op.at.offset, b.text.length);
        const tail: PlainBlock = {
          id   : op.newBlock,
          text : b.text.slice(pos),
          marks: clipMarks(b.marks, pos, b.text.length, 0),
        };

        b.text = b.text.slice(0, pos);
        b.marks = clipMarks(b.marks, 0, pos, 0);
        doc.blocks.splice(index + 1, 0, tail);

        return {
          dirtyBlocks  : [b.id, tail.id],
          removedBlocks: [],
          selection    : collapsed(tail.id, 0),
        };
      }

      case "joinWithPrevious": {
        const index = this.index(doc, op.block);
        if (index === 0) {
          return { dirtyBlocks: [], removedBlocks: [], selection: collapsed(op.block, 0) };
        }

        const prev = doc.blocks[index - 1];
        const b = doc.blocks[index];
        const seam = prev.text.length;

        prev.text += b.text;
        prev.marks = normalizeMarks([
          ...prev.marks,
          ...b.marks.map((m) => ({ from: m.from + seam, to: m.to + seam, name: m.name })),
        ]);
        doc.blocks.splice(index, 1);

        return {
          dirtyBlocks  : [prev.id],
          removedBlocks: [b.id],
          selection    : collapsed(prev.id, seam),
        };
      }

      case "toggleMark":
        return this.toggleMark(doc, op.range, op.mark);

      case "insertContent":
        return this.insertContent(doc, op.at, op.content.blocks, op.newBlocks);

      case "replaceBlocks":
        return this.replaceBlocks(doc, op.after, op.blocks, op.remove);

      case "custom":
        throw new Error(`PlainProvider: unknown custom op ${op.name}`);
    }
  }

  inverse(doc: PlainDoc, op: EditOp): EditOp {
    let touched: BlockId[] = [];
    let created: readonly BlockId[] = [];
    let after: BlockId | null | undefined;

    switch (op.type) {
      case "insertText":
        touched = this.rangeBlocks(doc, op.at);
        break;
      case "deleteRange":
      case "toggleMark":
        touched = this.rangeBlocks(doc, op.range);
        break;
      case "insertContent":
        touched = this.rangeBlocks(doc, op.at);
        created = op.newBlocks;
        break;
      case "splitBlock":
        touched = [op.at.block];
        created = [op.newBlock];
        break;
      case "joinWithPrevious": {
        const index = this.index(doc, op.block);
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
      case "custom":
        touched = [...op.blocks];
        break;
    }

    // the touched blocks are contiguous in every case above, so one anchor places them all
    if (after === undefined) {
      const first = touched.length > 0 ? this.index(doc, touched[0]) : 0;
      after = first > 0 ? doc.blocks[first - 1].id : null;
    }

    return {
      type: "replaceBlocks",
      after,
      blocks: this.snapshots(doc, touched),
      remove: unique([...touched, ...created]),
    };
  }

  snapshots(doc: PlainDoc, blocks: readonly BlockId[] = this.blocks(doc)): BlockSnapshot[] {
    return blocks.map((id) => this.snapshot(doc, id));
  }

  toClipboard(doc: PlainDoc, range: DocRange): ClipboardContent {
    const r = this.order(doc, range);
    const blocks: string[] = [];

    for (let i = r.startIndex; i <= r.endIndex; i++) {
      const text = doc.blocks[i].text;
      const from = i === r.startIndex ? r.start.offset : 0;
      const to = i === r.endIndex ? r.end.offset : text.length;
      blocks.push(text.slice(from, to));
    }

    return { blocks };
  }

  fromClipboard(data: DataTransfer): ClipboardContent | undefined {
    if (!data.types.includes("text/plain")) {
      return undefined;
    }

    return { blocks: data.getData("text/plain").split(/\r\n|\r|\n/) };
  }

  /** The block texts joined by newlines, as `text/plain`. */
  emitDocFile(doc: PlainDoc): Blob {
    return new Blob([doc.blocks.map((b) => b.text).join("\n")], { type: "text/plain" });
  }

  onExternalChange(doc: PlainDoc, listener: (change: DocChange) => void) {
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
  notifyChange(doc: PlainDoc, change: DocChange) {
    const set = this.listeners.get(doc);
    if (set === undefined) {
      return;
    }

    for (const listener of [...set]) {
      listener(change);
    }
  }

  private block(doc: PlainDoc, id: BlockId) {
    return doc.blocks[this.index(doc, id)];
  }

  private index(doc: PlainDoc, id: BlockId) {
    const index = doc.blocks.findIndex((b) => b.id === id);
    if (index < 0) {
      throw new Error(`unknown block ${id}`);
    }

    return index;
  }

  private snapshot(doc: PlainDoc, id: BlockId): BlockSnapshot {
    return { id, state: cloneBlock(this.block(doc, id)) };
  }

  /** The range in document order, offsets clamped to their block's text. */
  private order(doc: PlainDoc, range: DocRange): OrderedRange {
    const ai = this.index(doc, range.anchor.block);
    const hi = this.index(doc, range.head.block);
    const clamp = (pos: DocPos, i: number): DocPos => ({
      block : pos.block,
      offset: Math.max(0, Math.min(pos.offset, doc.blocks[i].text.length)),
    });
    const anchor = clamp(range.anchor, ai);
    const head = clamp(range.head, hi);

    if (ai < hi || (ai === hi && anchor.offset <= head.offset)) {
      return { start: anchor, end: head, startIndex: ai, endIndex: hi };
    }

    return { start: head, end: anchor, startIndex: hi, endIndex: ai };
  }

  private rangeBlocks(doc: PlainDoc, range: DocRange) {
    const r = this.order(doc, range);
    return doc.blocks.slice(r.startIndex, r.endIndex + 1).map((b) => b.id);
  }

  /** Removes the range's text, joining its outer blocks; a collapsed range changes nothing. */
  private deleteRangeImpl(doc: PlainDoc, range: DocRange) {
    const r = this.order(doc, range);
    const first = doc.blocks[r.startIndex];

    if (r.startIndex === r.endIndex) {
      if (r.start.offset === r.end.offset) {
        return { start: r.start, dirty: [] as BlockId[], removed: [] as BlockId[] };
      }

      first.text = first.text.slice(0, r.start.offset) + first.text.slice(r.end.offset);
      first.marks = marksAfterDelete(first.marks, r.start.offset, r.end.offset);

      return { start: r.start, dirty: [first.id], removed: [] as BlockId[] };
    }

    const last = doc.blocks[r.endIndex];
    const removed = doc.blocks.slice(r.startIndex + 1, r.endIndex + 1).map((b) => b.id);

    first.marks = normalizeMarks([
      ...clipMarks(first.marks, 0, r.start.offset, 0),
      ...clipMarks(last.marks, r.end.offset, last.text.length, r.start.offset),
    ]);
    first.text = first.text.slice(0, r.start.offset) + last.text.slice(r.end.offset);
    doc.blocks.splice(r.startIndex + 1, r.endIndex - r.startIndex);

    return { start: r.start, dirty: [first.id], removed };
  }

  /** Removes the mark when every character of the range already has it, adds it otherwise. */
  private toggleMark(doc: PlainDoc, range: DocRange, mark: string): EditResult {
    const r = this.order(doc, range);
    const segments: { block: PlainBlock; from: number; to: number }[] = [];

    for (let i = r.startIndex; i <= r.endIndex; i++) {
      const block = doc.blocks[i];
      const from = i === r.startIndex ? r.start.offset : 0;
      const to = i === r.endIndex ? r.end.offset : block.text.length;
      if (from < to) {
        segments.push({ block, from, to });
      }
    }

    if (segments.length === 0) {
      return { dirtyBlocks: [], removedBlocks: [], selection: range };
    }

    const covered = segments.every(({ block, from, to }) => hasMark(block.marks, mark, from, to));

    for (const { block, from, to } of segments) {
      if (covered) {
        block.marks = cutMark(block.marks, mark, from, to);
      } else {
        block.marks = normalizeMarks([...block.marks, { from, to, name: mark }]);
      }
    }

    return {
      dirtyBlocks  : segments.map((s) => s.block.id),
      removedBlocks: [],
      selection    : range,
    };
  }

  private insertContent(
    doc: PlainDoc,
    at: DocRange,
    lines: readonly string[],
    newBlocks: readonly BlockId[]
  ): EditResult {
    if (lines.length === 0 || newBlocks.length !== lines.length - 1) {
      throw new Error(`insertContent: ${lines.length} lines need ${lines.length - 1} new ids`);
    }
    for (const id of newBlocks) {
      if (doc.blocks.some((b) => b.id === id)) {
        throw new Error(`insertContent: block id ${id} is already in use`);
      }
    }

    const cut = this.deleteRangeImpl(doc, at);
    const index = this.index(doc, cut.start.block);
    const b = doc.blocks[index];
    const pos = cut.start.offset;

    if (lines.length === 1) {
      b.text = b.text.slice(0, pos) + lines[0] + b.text.slice(pos);
      b.marks = marksAroundInsert(b.marks, pos, lines[0].length);

      return {
        dirtyBlocks  : unique([b.id, ...cut.dirty]),
        removedBlocks: cut.removed,
        selection    : collapsed(b.id, pos + lines[0].length),
      };
    }

    const tailText = lines[lines.length - 1];
    const tail: PlainBlock = {
      id   : newBlocks[newBlocks.length - 1],
      text : tailText + b.text.slice(pos),
      marks: clipMarks(b.marks, pos, b.text.length, tailText.length),
    };
    const middle = lines
      .slice(1, -1)
      .map((text, i): PlainBlock => ({ id: newBlocks[i], text, marks: [] }));

    b.marks = clipMarks(b.marks, 0, pos, 0);
    b.text = b.text.slice(0, pos) + lines[0];
    doc.blocks.splice(index + 1, 0, ...middle, tail);

    return {
      dirtyBlocks  : unique([b.id, ...newBlocks, ...cut.dirty]),
      removedBlocks: cut.removed,
      selection    : collapsed(tail.id, tailText.length),
    };
  }

  private replaceBlocks(
    doc: PlainDoc,
    after: BlockId | null,
    snapshots: readonly BlockSnapshot[],
    remove: readonly BlockId[]
  ): EditResult {
    const removing = new Set(remove);
    const removed = doc.blocks.filter((b) => removing.has(b.id)).map((b) => b.id);
    doc.blocks = doc.blocks.filter((b) => !removing.has(b.id));

    const restored = snapshots.map((s) => this.fromSnapshot(s));
    const index = after === null ? 0 : this.index(doc, after) + 1;
    doc.blocks.splice(index, 0, ...restored);

    const inserted = new Set(restored.map((b) => b.id));
    const last = restored[restored.length - 1];
    let selection: DocRange;

    if (last !== undefined) {
      selection = collapsed(last.id, last.text.length);
    } else if (index < doc.blocks.length) {
      selection = collapsed(doc.blocks[index].id, 0);
    } else if (index > 0) {
      const prev = doc.blocks[index - 1];
      selection = collapsed(prev.id, prev.text.length);
    } else {
      selection = collapsed("", 0);
    }

    return {
      dirtyBlocks  : restored.map((b) => b.id),
      removedBlocks: removed.filter((id) => !inserted.has(id)),
      selection,
    };
  }

  private fromSnapshot(snapshot: BlockSnapshot): PlainBlock {
    const state = snapshot.state as Partial<PlainBlock> | undefined;
    if (typeof state?.text !== "string" || !Array.isArray(state.marks)) {
      throw new Error(`replaceBlocks: snapshot of ${snapshot.id} is not a PlainBlock`);
    }

    return cloneBlock({ id: snapshot.id, text: state.text, marks: state.marks });
  }
}

/** A `PlainDoc` with one unmarked block per line, ids from `makeId`. */
export function plainDocFromLines(
  lines: readonly string[],
  makeId: (index: number) => BlockId
): PlainDoc {
  return { blocks: lines.map((text, i) => ({ id: makeId(i), text, marks: [] })) };
}
