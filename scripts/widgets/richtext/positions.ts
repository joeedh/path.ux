import { ATOM_CHAR, CARET_SLOT } from "./provider";
import type { BlockId, DocPos, DocRange, EditOp } from "./provider";

// Both directions of the map are a walk over one block's element. An atom counts 1 and its
// subtree is skipped, a caret slot character counts 0 wherever it sits in a text node, and every
// other character counts 1. See documentation/plans/rich-text-provider.md, Position mapping.

const BLOCK_ATTR = "data-doc-block";
const ATOM_ATTR = "data-doc-atom";

/** A DOM position in the `Selection` API's terms: a text offset, or a child index on an element. */
export interface DomPos {
  node: Node;
  offset: number;
}

/** What `mapThroughPending` reads of the document as it was before any pending edit ran. */
export interface PendingDocView {
  blocks: readonly BlockId[];
  blockText(block: BlockId): string;
}

const isElement = (node: Node): node is Element => node.nodeType === 1;
const isText = (node: Node): node is Text => node.nodeType === 3;
const isAtom = (node: Node): node is Element => isElement(node) && node.hasAttribute(ATOM_ATTR);
const isOpaqueBlock = (el: Element) => el.getAttribute("contenteditable") === "false";

/** The flattened length of text node data: its UTF-16 length less every caret slot character. */
function textLength(data: string) {
  let len = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i] !== CARET_SLOT) {
      len++;
    }
  }

  return len;
}

/** The first index into `data` at which `offset` non-slot characters have been passed. */
function domOffsetIn(data: string, offset: number) {
  let seen = 0;
  for (let i = 0; i < data.length; i++) {
    if (seen === offset) {
      return i;
    }
    if (data[i] !== CARET_SLOT) {
      seen++;
    }
  }

  return data.length;
}

/** The flattened length a node contributes to its block. */
function nodeLength(node: Node): number {
  if (isText(node)) {
    return textLength(node.data);
  }
  if (isAtom(node)) {
    return 1;
  }

  let len = 0;
  for (const child of node.childNodes) {
    len += nodeLength(child);
  }

  return len;
}

/** The flattened length of the first `count` children of `parent`. */
function prefixLength(parent: Node, count: number) {
  const kids = parent.childNodes;
  let len = 0;
  for (let i = 0; i < Math.min(count, kids.length); i++) {
    len += nodeLength(kids[i]);
  }

  return len;
}

/**
 * The block's flattened text as the position walk counts it: an atom is one `ATOM_CHAR`, a
 * caret slot is nothing, every other character is itself. The composition diff reads a block
 * back through this so its coordinates match the position map.
 */
export function blockTextOf(element: Element): string {
  let out = "";

  const walk = (parent: Node) => {
    for (const child of parent.childNodes) {
      if (isAtom(child)) {
        out += ATOM_CHAR;
      } else if (isText(child)) {
        for (const ch of child.data) {
          if (ch !== CARET_SLOT) {
            out += ch;
          }
        }
      } else {
        walk(child);
      }
    }
  };

  walk(element);
  return out;
}

/** The element rendering `block`, which is always a direct child of the editable root. */
export function blockElement(root: ParentNode, block: BlockId): HTMLElement | undefined {
  for (const child of root.children) {
    if (child.getAttribute(BLOCK_ATTR) === block) {
      return child as HTMLElement;
    }
  }

  return undefined;
}

/**
 * Maps a DOM position to a document position, or to `undefined` when `node` lies outside
 * every block. A position inside an atom maps to just before the atom, and one in an opaque
 * block maps to 0 before its last child and 1 at or after it.
 */
export function toDocPos(root: ParentNode, node: Node, domOffset: number): DocPos | undefined {
  const from = isElement(node) ? node : node.parentElement;
  const blockEl = from?.closest(`[${BLOCK_ATTR}]`);
  if (!blockEl || blockEl.parentNode !== root) {
    return undefined;
  }

  const block = blockEl.getAttribute(BLOCK_ATTR) ?? "";

  if (isOpaqueBlock(blockEl)) {
    if (node === blockEl) {
      return { block, offset: domOffset >= blockEl.childNodes.length ? 1 : 0 };
    }

    let top = node;
    while (top.parentNode !== blockEl && top.parentNode !== null) {
      top = top.parentNode;
    }

    return { block, offset: top === blockEl.lastChild ? 1 : 0 };
  }

  if (node === blockEl) {
    return { block, offset: prefixLength(blockEl, domOffset) };
  }

  let acc = 0;
  const walk = (parent: Node): number | undefined => {
    for (const child of parent.childNodes) {
      if (child === node) {
        if (isText(child)) {
          return acc + textLength(child.data.slice(0, domOffset));
        }

        return acc + prefixLength(child, domOffset);
      }

      if (isAtom(child)) {
        if (child.contains(node)) {
          return acc;
        }
        acc += 1;
      } else if (isText(child)) {
        acc += nodeLength(child);
      } else {
        const found = walk(child);
        if (found !== undefined) {
          return found;
        }
      }
    }

    return undefined;
  };

  const offset = walk(blockEl);
  return offset === undefined ? undefined : { block, offset };
}

/**
 * Maps a document position to a DOM position, or to `undefined` when the block is not
 * rendered. An offset past the block's length lands at the end of its last text node. An
 * opaque block's two positions are the root's child offsets on either side of it, since
 * Chromium drops a selection endpoint placed inside a `contenteditable="false"` element.
 */
export function fromDocPos(root: ParentNode, pos: DocPos): DomPos | undefined {
  const blockEl = blockElement(root, pos.block);
  if (blockEl === undefined) {
    return undefined;
  }

  if (isOpaqueBlock(blockEl)) {
    const index = [...root.childNodes].indexOf(blockEl);
    return { node: root as Node, offset: pos.offset <= 0 ? index : index + 1 };
  }

  let remaining = Math.max(0, pos.offset);
  let lastText: Text | undefined;

  const walk = (parent: Node): DomPos | undefined => {
    const kids = parent.childNodes;
    for (let i = 0; i < kids.length; i++) {
      const child = kids[i];

      if (isText(child)) {
        const len = nodeLength(child);
        lastText = child;
        if (remaining <= len) {
          return { node: child, offset: domOffsetIn(child.data, remaining) };
        }
        remaining -= len;
      } else if (isAtom(child)) {
        if (remaining === 0) {
          return { node: parent, offset: i };
        }
        remaining -= 1;
      } else {
        const found = walk(child);
        if (found !== undefined) {
          return found;
        }
      }
    }

    return undefined;
  };

  const found = walk(blockEl);
  if (found !== undefined) {
    return found;
  }
  if (lastText !== undefined) {
    return { node: lastText, offset: lastText.data.length };
  }

  return { node: blockEl, offset: blockEl.childNodes.length };
}

/** Tracks block order and lengths through pending edits while a position is mapped through them. */
class PendingMapper {
  private order: BlockId[];
  private lengths = new Map<BlockId, number>();
  pos: DocPos;

  constructor(
    pos: DocPos,
    private readonly doc: PendingDocView
  ) {
    this.pos = { ...pos };
    this.order = [...doc.blocks];
  }

  apply(op: EditOp) {
    switch (op.type) {
      case "insertText":
        this.insertAt(this.delete(op.at), op.text.length);
        break;
      case "deleteRange":
        this.delete(op.range);
        break;
      case "splitBlock":
        this.split(op.at, op.newBlock);
        break;
      case "joinWithPrevious":
        this.join(op.block);
        break;
      case "insertContent":
        this.insertContent(this.delete(op.at), op.content.blocks, op.newBlocks);
        break;
      case "custom":
        // the op's data is the provider's; its shifts are what the mapper can read
        for (const shift of op.shifts ?? []) {
          this.shift(shift.block, shift.at, shift.delta);
        }
        break;
      case "toggleMark":
      case "replaceBlocks":
        // neither moves text; replaceBlocks is never pending from user input
        break;
    }
  }

  /** Text of length `|delta|` added at `at` when `delta` is positive, removed from `at` on otherwise. */
  private shift(block: BlockId, at: number, delta: number) {
    if (delta > 0) {
      this.insertAt({ block, offset: at }, delta);
    } else if (delta < 0) {
      this.delete({ anchor: { block, offset: at }, head: { block, offset: at - delta } });
    }
  }

  private length(block: BlockId) {
    let len = this.lengths.get(block);
    if (len === undefined) {
      len = this.doc.blockText(block).length;
      this.lengths.set(block, len);
    }

    return len;
  }

  private index(block: BlockId) {
    const index = this.order.indexOf(block);
    if (index < 0) {
      throw new Error(`unknown block ${block}`);
    }

    return index;
  }

  private orderRange(range: DocRange) {
    const ai = this.index(range.anchor.block);
    const hi = this.index(range.head.block);
    const forward = ai < hi || (ai === hi && range.anchor.offset <= range.head.offset);

    return forward
      ? { start: range.anchor, end: range.head, si: ai, ei: hi }
      : { start: range.head, end: range.anchor, si: hi, ei: ai };
  }

  /** Maps the position through a deletion and returns the deletion's start. */
  private delete(range: DocRange): DocPos {
    const { start, end, si, ei } = this.orderRange(range);
    const pos = this.pos;

    if (si === ei) {
      if (pos.block === start.block && pos.offset > start.offset) {
        pos.offset =
          pos.offset >= end.offset ? pos.offset - (end.offset - start.offset) : start.offset;
      }
      this.lengths.set(start.block, this.length(start.block) - (end.offset - start.offset));

      return start;
    }

    const removed = this.order.slice(si + 1, ei + 1);

    if (pos.block === start.block && pos.offset > start.offset) {
      pos.offset = start.offset;
    } else if (pos.block === end.block) {
      pos.block = start.block;
      pos.offset = pos.offset >= end.offset ? start.offset + pos.offset - end.offset : start.offset;
    } else if (removed.includes(pos.block)) {
      pos.block = start.block;
      pos.offset = start.offset;
    }

    this.lengths.set(start.block, start.offset + this.length(end.block) - end.offset);
    this.order.splice(si + 1, ei - si);

    return start;
  }

  private insertAt(at: DocPos, len: number) {
    if (this.pos.block === at.block && this.pos.offset >= at.offset) {
      this.pos.offset += len;
    }
    this.lengths.set(at.block, this.length(at.block) + len);
  }

  private split(at: DocPos, newBlock: BlockId) {
    if (this.pos.block === at.block && this.pos.offset >= at.offset) {
      this.pos = { block: newBlock, offset: this.pos.offset - at.offset };
    }

    this.lengths.set(newBlock, this.length(at.block) - at.offset);
    this.lengths.set(at.block, at.offset);
    this.order.splice(this.index(at.block) + 1, 0, newBlock);
  }

  private join(block: BlockId) {
    const index = this.index(block);
    if (index === 0) {
      return;
    }

    const prev = this.order[index - 1];
    const seam = this.length(prev);

    if (this.pos.block === block) {
      this.pos = { block: prev, offset: this.pos.offset + seam };
    }

    this.lengths.set(prev, seam + this.length(block));
    this.order.splice(index, 1);
  }

  private insertContent(at: DocPos, lines: readonly string[], newBlocks: readonly BlockId[]) {
    if (lines.length <= 1) {
      this.insertAt(at, lines[0]?.length ?? 0);
      return;
    }

    const last = newBlocks[newBlocks.length - 1];
    const lastLen = lines[lines.length - 1].length;
    const oldLen = this.length(at.block);

    if (this.pos.block === at.block && this.pos.offset >= at.offset) {
      this.pos = { block: last, offset: this.pos.offset - at.offset + lastLen };
    }

    this.lengths.set(at.block, at.offset + lines[0].length);
    for (let i = 0; i + 1 < newBlocks.length; i++) {
      this.lengths.set(newBlocks[i], lines[i + 1].length);
    }
    this.lengths.set(last, lastLen + oldLen - at.offset);
    this.order.splice(this.index(at.block) + 1, 0, ...newBlocks);
  }
}

/**
 * Maps a position read from the DOM, which still shows the state before every op in `pending`
 * ran, to where it will be once they have. `doc` is the document as it stands before them.
 */
export function mapThroughPending(
  pos: DocPos,
  pending: readonly EditOp[],
  doc: PendingDocView
): DocPos {
  const mapper = new PendingMapper(pos, doc);
  for (const op of pending) {
    mapper.apply(op);
  }

  return mapper.pos;
}
