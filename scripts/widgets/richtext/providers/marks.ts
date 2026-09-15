// The range arithmetic every provider with flat marks needs: how marks move when text is
// typed, pasted or deleted, how they clip to a slice of a block, and how a block's text splits
// into runs for rendering. Imported by the providers and never re-exported from the barrel.

/** A mark over the half-open offset range `[from, to)` of a block's text. */
export interface Mark {
  from: number;
  to: number;
  name: string;
}

/** A run of a block's text under one set of marks, from the edge walk `markSegments` does. */
export interface MarkSegment<M extends Mark> {
  from: number;
  to: number;
  /** The marks covering the run, in the block's own order. */
  marks: M[];
}

/** Drops empty marks, merges same-named marks that touch or overlap, and sorts by start. */
export function normalizeMarks<M extends Mark>(marks: readonly M[]): M[] {
  const sorted = marks
    .filter((m) => m.from < m.to)
    .map((m) => ({ ...m }))
    .sort((a, b) => a.from - b.from || a.name.localeCompare(b.name));
  const out: M[] = [];

  for (const m of sorted) {
    const prev = out.find((o) => o.name === m.name && o.to >= m.from);
    if (prev) {
      prev.to = Math.max(prev.to, m.to);
    } else {
      out.push(m);
    }
  }

  return out.sort((a, b) => a.from - b.from || a.name.localeCompare(b.name));
}

/** The marks clipped to `[from, to)` and re-based so that `from` becomes `base`. */
export function clipMarks<M extends Mark>(
  marks: readonly M[],
  from: number,
  to: number,
  base: number
): M[] {
  return normalizeMarks(
    marks.map((m) => ({
      ...m,
      from: Math.max(m.from, from) - from + base,
      to  : Math.min(m.to, to) - from + base,
    }))
  );
}

/**
 * The marks after typing `len` characters at `pos`. A mark the caret is inside of or at the end
 * of grows over the new text; a mark starting at `pos` moves right and leaves it unmarked.
 */
export function marksAfterTyping<M extends Mark>(marks: readonly M[], pos: number, len: number) {
  return normalizeMarks(
    marks.map((m) => ({
      ...m,
      from: m.from < pos ? m.from : m.from + len,
      to  : m.to < pos ? m.to : m.to + len,
    }))
  );
}

/**
 * The marks after pasting `len` unmarked characters at `pos`. A mark spanning `pos` is split
 * around the insertion, so pasted text never inherits a mark.
 */
export function marksAroundInsert<M extends Mark>(marks: readonly M[], pos: number, len: number) {
  const out: M[] = [];

  for (const m of marks) {
    if (m.to <= pos) {
      out.push({ ...m });
    } else if (m.from >= pos) {
      out.push({ ...m, from: m.from + len, to: m.to + len });
    } else {
      out.push({ ...m, from: m.from, to: pos });
      out.push({ ...m, from: pos + len, to: m.to + len });
    }
  }

  return normalizeMarks(out);
}

/** The marks after deleting `[from, to)`: later offsets move left, marks inside it vanish. */
export function marksAfterDelete<M extends Mark>(marks: readonly M[], from: number, to: number) {
  const map = (x: number) => (x <= from ? x : x >= to ? x - (to - from) : from);
  return normalizeMarks(marks.map((m) => ({ ...m, from: map(m.from), to: map(m.to) })));
}

/** Whether some mark named `name` covers all of `[from, to)`. */
export function hasMark(marks: readonly Mark[], name: string, from: number, to: number) {
  return marks.some((m) => m.name === name && m.from <= from && m.to >= to);
}

/** The marks with `name` removed over `[from, to)`; a mark reaching past either edge keeps its remainder. */
export function cutMark<M extends Mark>(
  marks: readonly M[],
  name: string,
  from: number,
  to: number
) {
  const kept: M[] = [];
  for (const m of marks) {
    if (m.name !== name) {
      kept.push(m);
    } else {
      kept.push({ ...m, from: m.from, to: Math.min(m.to, from) });
      kept.push({ ...m, from: Math.max(m.from, to), to: m.to });
    }
  }

  return normalizeMarks(kept);
}

/**
 * Splits `[0, length)` at every mark edge into runs, each with the marks covering it, so a
 * renderer can wrap each run once and a serializer can emit the same runs.
 */
export function markSegments<M extends Mark>(
  length: number,
  marks: readonly M[]
): MarkSegment<M>[] {
  const bounds = new Set([0, length]);
  for (const m of marks) {
    bounds.add(m.from);
    bounds.add(m.to);
  }
  const edges = [...bounds].sort((a, b) => a - b);
  const out: MarkSegment<M>[] = [];

  for (let i = 0; i + 1 < edges.length; i++) {
    const from = edges[i];
    const to = edges[i + 1];
    out.push({ from, to, marks: marks.filter((m) => m.from <= from && m.to >= to) });
  }

  return out;
}
