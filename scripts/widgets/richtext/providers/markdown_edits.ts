import { ATOM_CHAR } from "../provider";
import type {
  BlockId,
  BlockSnapshot,
  ClipboardContent,
  DocPos,
  DocRange,
  EditResult,
} from "../provider";
import { clipMarks, cutMark, hasMark, marksAfterDelete, marksAfterTyping } from "./marks";
import { normalizeMdMarks } from "./markdown_inline";
import { mdBlock } from "./markdown_model";
import type { MdBlock, MdDoc, MdKind, MdMarkName } from "./markdown_model";
import { parseEntry } from "./markdown_clipboard";
import {
  atomsAfterDelete,
  atomsAfterInsert,
  blank,
  blockOf,
  clipAtoms,
  cloneBlock,
  collapsed,
  fixMarks,
  indexOf,
  isOpaque,
  kindOf,
  orderRange,
  segments,
  slice,
  tailKind,
  textOf,
  TOGGLE_NAMES,
  unique,
  withKind,
} from "./markdown_doc";
import type { Cut } from "./markdown_doc";

// The standard `EditOp`s on an `MdDoc`, interpreted by block kind. Each mutates the document
// in place and reports what to re-render, as `applyEdit` does.

/** A marker typed at the start of a paragraph and the kind it turns the paragraph into. */
const SHORTCUTS: { marker: RegExp; kind: (match: RegExpMatchArray) => MdKind }[] = [
  {
    marker: /^(#{1,6}) $/,
    kind  : (m) => ({ kind: "heading", level: m[1].length as 1 | 2 | 3 | 4 | 5 | 6 }),
  },
  { marker: /^[-*+] $/, kind: () => ({ kind: "listItem", ordered: false, depth: 0 }) },
  { marker: /^\d+\. $/, kind: () => ({ kind: "listItem", ordered: true, depth: 0 }) },
  { marker: /^> $/, kind: () => ({ kind: "quote", depth: 0 }) },
  { marker: /^```$/, kind: () => ({ kind: "code", lang: "" }) },
];

/**
 * Removes the range's text, joining its outer blocks. An opaque block is removed when the
 * range covers it and left alone when the range only touches its edge; one that was the
 * only thing removed becomes an empty paragraph, so its id survives. A range from the end
 * of one block to the start of another with only opaque blocks between, which is what a
 * browser reports for Backspace or Delete beside one, removes them without joining.
 */
export function deleteRange(doc: MdDoc, range: DocRange): Cut {
  const r = orderRange(doc, range);
  const none: Cut = { start: r.start, dirty: [], removed: [] };

  if (r.startIndex === r.endIndex) {
    const b = doc.blocks[r.startIndex];
    if (r.start.offset === r.end.offset) {
      return none;
    }
    if (isOpaque(b)) {
      blank(doc, r.startIndex);
      return { start: { block: b.id, offset: 0 }, dirty: [b.id], removed: [] };
    }

    b.text = b.text.slice(0, r.start.offset) + b.text.slice(r.end.offset);
    b.marks = marksAfterDelete(b.marks, r.start.offset, r.end.offset, normalizeMdMarks);
    b.atoms = atomsAfterDelete(b.atoms, r.start.offset, r.end.offset);
    b.marks = fixMarks(b);

    return { start: r.start, dirty: [b.id], removed: [] };
  }

  let { startIndex, endIndex, start, end } = r;

  // a range that begins after an opaque block or ends before one leaves it alone
  if (isOpaque(doc.blocks[startIndex]) && start.offset >= 1) {
    startIndex++;
    start = { block: doc.blocks[startIndex].id, offset: 0 };
  }
  if (isOpaque(doc.blocks[endIndex]) && end.offset === 0) {
    endIndex--;
    end = {
      block : doc.blocks[endIndex].id,
      offset: textOf(doc, doc.blocks[endIndex].id).length,
    };
  }
  if (startIndex > endIndex) {
    return none;
  }
  if (startIndex === endIndex) {
    return deleteRange(doc, { anchor: start, head: end });
  }

  let first = doc.blocks[startIndex];
  let last = doc.blocks[endIndex];
  const between = doc.blocks.slice(startIndex + 1, endIndex);
  if (
    between.length > 0 &&
    between.every(isOpaque) &&
    !isOpaque(first) &&
    !isOpaque(last) &&
    start.offset >= first.text.length &&
    end.offset === 0
  ) {
    doc.blocks.splice(startIndex + 1, between.length);
    return { start, dirty: [], removed: between.map((b) => b.id) };
  }

  if (isOpaque(first)) {
    first = blank(doc, startIndex);
    start = { block: first.id, offset: 0 };
  }
  if (isOpaque(last)) {
    last = blank(doc, endIndex);
    end = { block: last.id, offset: 0 };
  }

  const removed = doc.blocks.slice(startIndex + 1, endIndex + 1).map((b) => b.id);
  const joined = withKind(
    {
      ...first,
      text : first.text.slice(0, start.offset) + last.text.slice(end.offset),
      marks: [
        ...clipMarks(first.marks, 0, start.offset, 0, normalizeMdMarks),
        ...clipMarks(last.marks, end.offset, last.text.length, start.offset, normalizeMdMarks),
      ],
      atoms: [
        ...clipAtoms(first.atoms, 0, start.offset, 0),
        ...clipAtoms(last.atoms, end.offset, last.text.length, start.offset),
      ],
    },
    kindOf(first)
  );
  joined.html = first.html;
  doc.blocks[startIndex] = joined;
  doc.blocks.splice(startIndex + 1, endIndex - startIndex);

  return { start: { block: joined.id, offset: start.offset }, dirty: [joined.id], removed };
}

/** The kind a typing shortcut turns `b` into when the text before `caret` is exactly a marker. */
function shortcutAt(b: MdBlock, caret: number): MdKind | undefined {
  if (b.kind !== "paragraph" || b.text.length === 0) {
    return undefined;
  }

  const head = b.text.slice(0, caret);
  for (const { marker, kind } of SHORTCUTS) {
    const match = marker.exec(head);
    if (match !== null) {
      return kind(match);
    }
  }
  return undefined;
}

/**
 * Typing, or a hard break when `hardBreak` is set and the text is one newline. With
 * `shortcuts`, a single character completing a marker at the start of a paragraph changes
 * its kind.
 */
export function insertText(
  doc: MdDoc,
  at: DocRange,
  text: string,
  hardBreak: boolean,
  shortcuts: boolean
): EditResult {
  const cut = deleteRange(doc, at);
  const b = blockOf(doc, cut.start.block);
  const pos = cut.start.offset;

  if (isOpaque(b)) {
    return {
      dirtyBlocks  : cut.dirty,
      removedBlocks: cut.removed,
      selection    : collapsed(b.id, pos),
    };
  }

  const inserted = b.kind === "code" ? text.split(ATOM_CHAR).join("") : text;
  b.text = b.text.slice(0, pos) + inserted + b.text.slice(pos);
  b.atoms = atomsAfterInsert(b.atoms, pos, inserted.length);
  if (b.kind !== "code") {
    b.marks = marksAfterTyping(b.marks, pos, inserted.length, normalizeMdMarks);
    if (hardBreak && inserted === "\n") {
      b.marks.push({ from: pos, to: pos + 1, name: "break" });
    }
    b.marks = fixMarks(b);
  }

  const caret = pos + inserted.length;
  // one character at a time is typing; a longer insert is composed or dispatched text
  const shortcut = shortcuts && inserted.length === 1 ? shortcutAt(b, caret) : undefined;
  if (shortcut !== undefined) {
    // the marker goes and the rest of the paragraph becomes the block, under the same id
    doc.blocks[indexOf(doc, b.id)] = slice(b, caret, b.text.length, shortcut);
    return {
      dirtyBlocks  : unique([b.id, ...cut.dirty]),
      removedBlocks: cut.removed,
      selection    : collapsed(b.id, 0),
    };
  }

  return {
    dirtyBlocks  : unique([b.id, ...cut.dirty]),
    removedBlocks: cut.removed,
    selection    : collapsed(b.id, caret),
  };
}

export function splitBlock(doc: MdDoc, at: DocPos, newBlock: BlockId): EditResult {
  if (doc.blocks.some((b) => b.id === newBlock)) {
    throw new Error(`splitBlock: block id ${newBlock} is already in use`);
  }

  const index = indexOf(doc, at.block);
  const b = doc.blocks[index];
  const pos = Math.max(0, Math.min(at.offset, textOf(doc, b.id).length));
  const paragraph = () => mdBlock(newBlock, { kind: "paragraph" });

  if (isOpaque(b)) {
    // front matter stays first; elsewhere the paragraph goes on the side the caret was
    if (b.kind === "frontmatter" && pos === 0) {
      return { dirtyBlocks: [], removedBlocks: [], selection: collapsed(b.id, 0) };
    }

    const para = paragraph();
    doc.blocks.splice(pos === 0 ? index : index + 1, 0, para);
    return { dirtyBlocks: [para.id], removedBlocks: [], selection: collapsed(para.id, 0) };
  }

  // an empty item or quote exits its run; the paragraph takes the pre-allocated id
  if ((b.kind === "listItem" || b.kind === "quote") && b.text.length === 0) {
    const para = paragraph();
    doc.blocks[index] = para;
    return { dirtyBlocks: [para.id], removedBlocks: [b.id], selection: collapsed(para.id, 0) };
  }

  // an empty last line of a fence is where Enter leaves it
  if (b.kind === "code" && pos === b.text.length && (b.text === "" || b.text.endsWith("\n"))) {
    b.text = b.text.slice(0, b.text.endsWith("\n") ? -1 : undefined);
    const para = paragraph();
    doc.blocks.splice(index + 1, 0, para);
    return { dirtyBlocks: [b.id, para.id], removedBlocks: [], selection: collapsed(para.id, 0) };
  }

  // at the start of a block with text, the block's own kind moves down with its content
  const atStart = pos === 0 && b.text.length > 0;
  const headKind = atStart ? tailKind(b) : kindOf(b);
  const tail = slice(b, pos, b.text.length, atStart ? kindOf(b) : tailKind(b));
  tail.id = newBlock;
  if (atStart) {
    tail.html = b.html;
  }

  const head = slice(b, 0, pos, headKind);
  if (!atStart) {
    head.html = b.html;
  }
  doc.blocks[index] = head;
  doc.blocks.splice(index + 1, 0, tail);

  return { dirtyBlocks: [head.id, tail.id], removedBlocks: [], selection: collapsed(tail.id, 0) };
}

/**
 * At the start of an item, heading, quote or fence the block first sheds its kind (an item or
 * quote at depth drops one level); only a paragraph joins. A join that would take in an
 * opaque block, from either side, selects that block instead, so the next key deletes it.
 */
export function joinWithPrevious(doc: MdDoc, block: BlockId): EditResult {
  const index = indexOf(doc, block);
  const b = doc.blocks[index];
  const stay = { dirtyBlocks: [], removedBlocks: [], selection: collapsed(block, 0) };
  const select = (id: BlockId): EditResult => ({
    dirtyBlocks  : [],
    removedBlocks: [],
    selection    : { anchor: { block: id, offset: 0 }, head: { block: id, offset: 1 } },
  });

  if (index === 0) {
    return stay;
  }
  if (isOpaque(b)) {
    return select(b.id);
  }

  if (b.kind !== "paragraph") {
    const own = kindOf(b);
    let kind: MdKind = { kind: "paragraph" };
    if ((own.kind === "listItem" || own.kind === "quote") && own.depth > 0) {
      own.depth -= 1;
      kind = own;
    }

    doc.blocks[index] = withKind(b, kind);
    return { dirtyBlocks: [block], removedBlocks: [], selection: collapsed(block, 0) };
  }

  const prev = doc.blocks[index - 1];
  if (isOpaque(prev)) {
    return select(prev.id);
  }

  const seam = prev.text.length;
  const joined = withKind(
    {
      ...prev,
      text : prev.text + b.text,
      marks: [
        ...prev.marks,
        ...b.marks.map((m) => ({ ...m, from: m.from + seam, to: m.to + seam })),
      ],
      atoms: [...prev.atoms, ...b.atoms.map((a) => ({ ...a, offset: a.offset + seam }))],
    },
    kindOf(prev)
  );
  joined.html = prev.html;
  doc.blocks[index - 1] = joined;
  doc.blocks.splice(index, 1);

  return { dirtyBlocks: [prev.id], removedBlocks: [b.id], selection: collapsed(prev.id, seam) };
}

/** Removes the mark when every covered run already has it, adds it otherwise; fences and opaque blocks are skipped. */
export function toggleMark(doc: MdDoc, range: DocRange, mark: string): EditResult {
  const none = { dirtyBlocks: [], removedBlocks: [], selection: range };
  if (!TOGGLE_NAMES.has(mark)) {
    return none;
  }

  const runs = segments(doc, orderRange(doc, range));
  if (runs.length === 0) {
    return none;
  }

  const name = mark as MdMarkName;
  const covered = runs.every(({ block, from, to }) => hasMark(block.marks, name, from, to));

  for (const { block, from, to } of runs) {
    block.marks = covered
      ? cutMark(block.marks, name, from, to, normalizeMdMarks)
      : normalizeMdMarks([...block.marks, { from, to, name }]);
  }

  return { dirtyBlocks: runs.map((s) => s.block.id), removedBlocks: [], selection: range };
}

/** `block` with `[from, to)` replaced by `insert`'s inline content, marks and atoms carried over. */
function spliced(block: MdBlock, from: number, to: number, insert: MdBlock): MdBlock {
  const len = insert.text.length;
  const marks = [
    ...clipMarks(block.marks, 0, from, 0, normalizeMdMarks),
    ...insert.marks.map((m) => ({ ...m, from: m.from + from, to: m.to + from })),
    ...clipMarks(block.marks, to, block.text.length, from + len, normalizeMdMarks),
  ];
  const atoms = [
    ...clipAtoms(block.atoms, 0, from, 0),
    ...insert.atoms.map((a) => ({ ...a, offset: a.offset + from })),
    ...clipAtoms(block.atoms, to, block.text.length, from + len),
  ];
  const out: MdBlock = {
    ...block,
    text: block.text.slice(0, from) + insert.text + block.text.slice(to),
    marks,
    atoms,
  };
  out.marks = fixMarks(out);

  return out;
}

/**
 * The first entry goes in at the caret as inline content (an empty paragraph takes its kind),
 * the rest become blocks, the last one taking the text after the caret. Into a fence the
 * content goes verbatim as lines, so no new block is made and the ids go unused.
 */
export function insertContent(
  doc: MdDoc,
  at: DocRange,
  content: ClipboardContent,
  newBlocks: readonly BlockId[],
  shortcuts: boolean
): EditResult {
  const entries = content.blocks;
  if (entries.length === 0 || newBlocks.length !== entries.length - 1) {
    throw new Error(`insertContent: ${entries.length} entries need ${entries.length - 1} new ids`);
  }
  for (const id of newBlocks) {
    if (doc.blocks.some((b) => b.id === id)) {
      throw new Error(`insertContent: block id ${id} is already in use`);
    }
  }

  const cut = deleteRange(doc, at);
  const index = indexOf(doc, cut.start.block);
  const target = doc.blocks[index];
  const pos = cut.start.offset;

  if (isOpaque(target)) {
    return {
      dirtyBlocks  : cut.dirty,
      removedBlocks: cut.removed,
      selection    : collapsed(target.id, pos),
    };
  }
  if (target.kind === "code") {
    const text = content.text ?? entries.join("\n");
    return insertText(doc, collapsed(target.id, pos), text, false, shortcuts);
  }

  const parsed = entries.map((entry, i) =>
    parseEntry(entry, i === 0 ? target.id : newBlocks[i - 1])
  );
  const first = parsed[0];
  const adopt = target.kind === "paragraph" && target.text.length === 0;

  if (entries.length === 1) {
    const kind = adopt ? kindOf(first) : kindOf(target);
    const merged = withKind(spliced(target, pos, pos, first), kind);
    merged.html = adopt ? first.html : target.html;
    doc.blocks[index] = merged;

    return {
      dirtyBlocks  : unique([merged.id, ...cut.dirty]),
      removedBlocks: cut.removed,
      selection    : collapsed(merged.id, pos + first.text.length),
    };
  }

  const prefix = slice(target, 0, pos, kindOf(target));
  const head = withKind(spliced(prefix, pos, pos, first), adopt ? kindOf(first) : kindOf(target));
  head.html = adopt ? first.html : target.html;
  doc.blocks[index] = head;
  doc.blocks.splice(index + 1, 0, ...parsed.slice(1));

  // the text after the caret follows the last entry, or the last editable one before an opaque end
  const suffix = slice(target, pos, target.text.length, { kind: "paragraph" });
  const last = parsed[parsed.length - 1];
  const carrier =
    parsed
      .slice(1)
      .reverse()
      .find((b) => !isOpaque(b)) ?? head;
  const carrierIndex = indexOf(doc, carrier.id);
  doc.blocks[carrierIndex] = spliced(carrier, carrier.text.length, carrier.text.length, suffix);

  return {
    dirtyBlocks  : unique([head.id, ...newBlocks, ...cut.dirty]),
    removedBlocks: cut.removed,
    selection    : collapsed(last.id, isOpaque(last) ? 1 : last.text.length),
  };
}

function fromSnapshot(snapshot: BlockSnapshot): MdBlock {
  const state = snapshot.state as Partial<MdBlock> | undefined;
  if (
    typeof state?.kind !== "string" ||
    typeof state.text !== "string" ||
    !Array.isArray(state.marks) ||
    !Array.isArray(state.atoms)
  ) {
    throw new Error(`replaceBlocks: snapshot of ${snapshot.id} is not an MdBlock`);
  }

  return cloneBlock({ ...(state as MdBlock), id: snapshot.id });
}

/** Removes `remove` and restores `snapshots` after `after` (`null` for the start), the caret landing at the end of the restored run. */
export function replaceBlocks(
  doc: MdDoc,
  after: BlockId | null,
  snapshots: readonly BlockSnapshot[],
  remove: readonly BlockId[]
): EditResult {
  const removing = new Set(remove);
  const removed = doc.blocks.filter((b) => removing.has(b.id)).map((b) => b.id);
  doc.blocks = doc.blocks.filter((b) => !removing.has(b.id));

  const restored = snapshots.map(fromSnapshot);
  const index = after === null ? 0 : indexOf(doc, after) + 1;
  doc.blocks.splice(index, 0, ...restored);

  const inserted = new Set(restored.map((b) => b.id));
  const last = restored[restored.length - 1];
  let selection: DocRange;

  if (last !== undefined) {
    selection = collapsed(last.id, textOf(doc, last.id).length);
  } else if (index < doc.blocks.length) {
    selection = collapsed(doc.blocks[index].id, 0);
  } else if (index > 0) {
    const prev = doc.blocks[index - 1];
    selection = collapsed(prev.id, textOf(doc, prev.id).length);
  } else {
    selection = collapsed("", 0);
  }

  return {
    dirtyBlocks  : restored.map((b) => b.id),
    removedBlocks: removed.filter((id) => !inserted.has(id)),
    selection,
  };
}
