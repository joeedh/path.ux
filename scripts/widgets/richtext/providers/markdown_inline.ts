// A block's inline content in both directions: a builder that accumulates text, marks and
// atoms while a parser walks inline nodes, and the nesting tree a serializer walks to emit
// them again. Shared by the markdown and HTML sides of the provider.

import { ATOM_CHAR } from "../provider";
import { markSegments } from "./marks";
import type { MdAtom, MdBlock, MdImage, MdMark } from "./markdown_model";

/** An open mark: everything but its range, which closes when the builder is told to. */
export type OpenMark = Omit<MdMark, "from" | "to">;

/** Accumulates one block's text, marks and atoms in document order. */
export class InlineBuilder {
  text = "";
  marks: MdMark[] = [];
  atoms: MdAtom[] = [];

  private readonly open = new Map<number, MdMark>();
  private nextHandle = 0;

  get length() {
    return this.text.length;
  }

  append(text: string): void {
    this.text += text;
  }

  /** Starts a mark at the current end; `close` ends it. Returns the handle `close` takes. */
  start(mark: OpenMark): number {
    const handle = this.nextHandle++;
    this.open.set(handle, { ...mark, from: this.text.length, to: this.text.length });
    return handle;
  }

  close(handle: number): void {
    const mark = this.open.get(handle);
    if (mark === undefined) {
      return;
    }

    this.open.delete(handle);
    mark.to = this.text.length;
    if (mark.to > mark.from) {
      this.marks.push(mark);
    }
  }

  /** Forgets an open mark, for a tag that never closed. */
  discard(handle: number): void {
    this.open.delete(handle);
  }

  /** Adds a mark over an explicit range, for a pass that runs after the walk. */
  mark(mark: OpenMark, from: number, to: number): void {
    if (to > from) {
      this.marks.push({ ...mark, from, to });
    }
  }

  atom(image: MdImage): void {
    this.atoms.push({ offset: this.text.length, image });
    this.text += ATOM_CHAR;
  }

  /** A line break: `\n`, marked `break` when it is hard. */
  lineBreak(hard: boolean): void {
    const at = this.text.length;
    this.text += "\n";
    if (hard) {
      this.marks.push({ name: "break", from: at, to: at + 1 });
    }
  }

  /**
   * Replaces `[from, to)` of the text with `replacement`, moving every mark and atom after
   * it; a mark spanning the range shrinks or grows with it.
   */
  splice(from: number, to: number, replacement: string): void {
    const delta = replacement.length - (to - from);
    const map = (x: number) => (x <= from ? x : x >= to ? x + delta : from + replacement.length);

    this.text = this.text.slice(0, from) + replacement + this.text.slice(to);
    for (const m of [...this.marks, ...this.open.values()]) {
      m.from = map(m.from);
      m.to = map(m.to);
    }
    for (const a of this.atoms) {
      a.offset = map(a.offset);
    }
  }

  /** Drops leading and trailing whitespace, for content that came from HTML. */
  trim(): void {
    const end = this.text.replace(/\s+$/, "").length;
    if (end < this.text.length) {
      this.splice(end, this.text.length, "");
    }
    const start = this.text.length - this.text.replace(/^\s+/, "").length;
    if (start > 0) {
      this.splice(0, start, "");
    }
  }

  /** Closes what is still open and writes text, marks and atoms onto `block`. */
  finish(block: MdBlock): MdBlock {
    for (const handle of [...this.open.keys()]) {
      this.close(handle);
    }

    block.text = this.text;
    block.marks = normalizeMdMarks(this.marks);
    block.atoms = this.atoms;
    return block;
  }
}

const markKey = (m: MdMark) =>
  JSON.stringify([m.name, m.kind, m.target, m.title, m.tag, m.style, m.attrs]);

const bareStyle = (m: MdMark) =>
  m.name === "style" && m.tag === undefined && m.style === undefined && m.attrs === undefined;

/**
 * Drops empty marks and `style` marks carrying nothing, and merges touching or overlapping
 * marks that agree in every field but their range; `marks.ts`'s `normalizeMarks` merges by
 * name alone, which would fuse two adjacent links into one. A `break` mark is one character
 * and never merges.
 */
export function normalizeMdMarks(marks: readonly MdMark[]): MdMark[] {
  const sorted = marks
    .filter((m) => m.from < m.to && !bareStyle(m))
    .map((m) => ({ ...m }))
    .sort((a, b) => a.from - b.from || a.name.localeCompare(b.name));
  const out: MdMark[] = [];

  for (const m of sorted) {
    const key = markKey(m);
    const prev =
      m.name === "break"
        ? undefined
        : out.find((o) => o.name === m.name && o.to >= m.from && markKey(o) === key);
    if (prev) {
      prev.to = Math.max(prev.to, m.to);
    } else {
      out.push(m);
    }
  }

  return out.sort((a, b) => a.from - b.from || a.name.localeCompare(b.name));
}

export type InlineLeaf =
  | { type: "text"; value: string }
  | { type: "atom"; atom: MdAtom }
  | { type: "break"; hard: boolean };

/** A mark's span in the tree, holding the content it wraps. */
export interface InlineWrap {
  type: "wrap";
  mark: MdMark;
  children: InlineNode[];
}

export type InlineNode = InlineLeaf | InlineWrap;

const isWrapMark = (m: MdMark) => m.name !== "break";

/**
 * A block's inline content as a properly nested tree. Marks that overlap without nesting are
 * split at the segment edges: the inner one closes and reopens, so `bold` over 0–6 and
 * `italic` over 3–9 emit as `**abc*def***ghi*`.
 */
export function inlineTree(block: MdBlock): InlineNode[] {
  const root: InlineNode[] = [];
  const stack: { mark: MdMark; node: InlineWrap }[] = [];
  const breaks = new Set(block.marks.filter((m) => m.name === "break").map((m) => m.from));
  const atoms = new Map(block.atoms.map((a) => [a.offset, a]));
  const wrapMarks = block.marks.filter(isWrapMark);

  const top = () => (stack.length > 0 ? stack[stack.length - 1].node.children : root);

  for (const seg of markSegments(block.text.length, wrapMarks)) {
    // outermost first: the mark that started first, then the one that reaches furthest
    const wanted = [...seg.marks].sort((a, b) => a.from - b.from || b.to - a.to);
    const wantedSet = new Set(wanted);

    const firstClosed = stack.findIndex((entry) => !wantedSet.has(entry.mark));
    if (firstClosed >= 0) {
      stack.length = firstClosed;
    }

    const openSet = new Set(stack.map((entry) => entry.mark));
    for (const mark of wanted) {
      if (!openSet.has(mark)) {
        const node: InlineWrap = { type: "wrap", mark, children: [] };
        top().push(node);
        stack.push({ mark, node });
      }
    }

    pushLeaves(top(), block.text, seg.from, seg.to, atoms, breaks);
  }

  return root;
}

function pushLeaves(
  into: InlineNode[],
  text: string,
  from: number,
  to: number,
  atoms: Map<number, MdAtom>,
  breaks: Set<number>
): void {
  let runStart = from;
  const flush = (end: number) => {
    if (end > runStart) {
      into.push({ type: "text", value: text.slice(runStart, end) });
    }
  };

  for (let i = from; i < to; i++) {
    const ch = text[i];
    const atom = ch === ATOM_CHAR ? atoms.get(i) : undefined;
    if (atom !== undefined) {
      flush(i);
      into.push({ type: "atom", atom });
      runStart = i + 1;
    } else if (ch === "\n") {
      flush(i);
      into.push({ type: "break", hard: breaks.has(i) });
      runStart = i + 1;
    }
  }

  flush(to);
}

/** The text under `nodes`, atoms and breaks included as their characters. */
export function treeText(nodes: readonly InlineNode[]): string {
  let out = "";
  for (const node of nodes) {
    if (node.type === "text") {
      out += node.value;
    } else if (node.type === "atom") {
      out += ATOM_CHAR;
    } else if (node.type === "break") {
      out += "\n";
    } else {
      out += treeText(node.children);
    }
  }

  return out;
}
