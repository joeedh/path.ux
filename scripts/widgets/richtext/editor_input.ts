import type { PendingDocView } from "./positions";
import { ATOM_CHAR, newBlockId } from "./provider";
import type { ClipboardContent, DocPos, DocRange, EditOp } from "./provider";

// One `beforeinput` to the `EditOp`s it asks for. The editor supplies what the mapping needs
// of it through `InputHost`; nothing here touches the DOM or the session.

/** What `mapInput` asks of the editor. */
export interface InputHost {
  view: PendingDocView;
  /** Whether the provider lists a mark of this name. */
  hasMark(name: string): boolean;
  fromClipboard(data: DataTransfer): ClipboardContent | undefined;
  /** The range the event works on, mapped through the pending ops. */
  inputRange(e: InputEvent): DocRange | undefined;
  /** Reports the input refused and answers no ops. */
  refuse(inputType: string): EditOp[];
  undo(): Promise<void>;
  redo(): Promise<void>;
}

// What each formatting inputType asks for, in the provider's naming
const FORMAT_MARKS: Record<string, string> = {
  formatBold         : "bold",
  formatItalic       : "italic",
  formatUnderline    : "underline",
  formatStrikeThrough: "strikethrough",
};

const BACKWARD_DELETES = new Set([
  "deleteContentBackward",
  "deleteWordBackward",
  "deleteSoftLineBackward",
]);
const FORWARD_DELETES = new Set([
  "deleteContentForward",
  "deleteWordForward",
  "deleteSoftLineForward",
]);
const WORD_DELETES = new Set(["deleteWordBackward", "deleteWordForward"]);

export const samePos = (a: DocPos, b: DocPos) => a.block === b.block && a.offset === b.offset;
export const isCollapsed = (range: DocRange) => samePos(range.anchor, range.head);

/** The range's ends in document order under `view`. */
export function orderRange(range: DocRange, view: PendingDocView) {
  const ai = view.blocks.indexOf(range.anchor.block);
  const hi = view.blocks.indexOf(range.head.block);
  const forward = ai < hi || (ai === hi && range.anchor.offset <= range.head.offset);

  return forward
    ? { start: range.anchor, end: range.head }
    : { start: range.head, end: range.anchor };
}

/** The offset a delete of one unit reaches from `offset`, going backward or forward. */
export function deleteBoundary(
  text: string,
  offset: number,
  granularity: "grapheme" | "word",
  backward: boolean
): number {
  if (typeof Intl.Segmenter !== "function") {
    return backward ? Math.max(0, offset - 1) : Math.min(text.length, offset + 1);
  }

  const segments = [...new Intl.Segmenter(undefined, { granularity }).segment(text)];
  // an atom is a unit of its own for a word delete, so a delete stops at it
  const wordLike = (i: number) =>
    segments[i].segment === ATOM_CHAR || segments[i].isWordLike !== false;

  if (backward) {
    let i = segments.findLastIndex((s) => s.index < offset);
    if (i < 0) {
      return 0;
    }
    if (granularity === "word") {
      while (i > 0 && !wordLike(i)) {
        i--;
      }
    }

    return segments[i].index;
  }

  let i = segments.findIndex((s) => s.index + s.segment.length > offset);
  if (i < 0) {
    return text.length;
  }
  if (granularity === "word") {
    while (i + 1 < segments.length && !wordLike(i)) {
      i++;
    }
  }

  return segments[i].index + segments[i].segment.length;
}

/** The `EditOp`s one input event asks for: none when it is refused or handled directly. */
export function mapInput(e: InputEvent, host: InputHost): EditOp[] {
  const { view } = host;
  const type = e.inputType;

  if (type === "historyUndo") {
    void host.undo();
    return [];
  }
  if (type === "historyRedo") {
    void host.redo();
    return [];
  }

  const mark = FORMAT_MARKS[type];
  if (mark !== undefined) {
    if (!host.hasMark(mark)) {
      return host.refuse(type);
    }
    const range = host.inputRange(e);
    return range === undefined || isCollapsed(range) ? [] : [{ type: "toggleMark", range, mark }];
  }

  if (type === "insertText") {
    const range = host.inputRange(e);
    if (typeof e.data !== "string" || range === undefined) {
      return host.refuse(type);
    }

    return [{ type: "insertText", at: range, text: e.data }];
  }

  if (type === "insertParagraph" || type === "insertLineBreak") {
    const range = host.inputRange(e);
    if (range === undefined) {
      return host.refuse(type);
    }

    const ops: EditOp[] = [];
    const start = orderRange(range, view).start;
    if (!isCollapsed(range)) {
      ops.push({ type: "deleteRange", range });
    }
    ops.push({ type: "splitBlock", at: start, newBlock: newBlockId() });

    return ops;
  }

  if (type === "insertFromPaste" || type === "insertFromDrop") {
    const range = host.inputRange(e);
    const content = e.dataTransfer ? host.fromClipboard(e.dataTransfer) : undefined;
    if (range === undefined || content === undefined || content.blocks.length === 0) {
      return host.refuse(type);
    }

    const newBlocks = content.blocks.slice(1).map(() => newBlockId());
    return [{ type: "insertContent", at: range, content, newBlocks }];
  }

  if (BACKWARD_DELETES.has(type) || FORWARD_DELETES.has(type) || type === "deleteByCut") {
    return mapDelete(e, type, host);
  }

  return host.refuse(type);
}

function mapDelete(e: InputEvent, type: string, host: InputHost): EditOp[] {
  const { view } = host;
  const range = host.inputRange(e);
  if (range === undefined) {
    return host.refuse(type);
  }

  let { start, end } = orderRange(range, view);

  if (samePos(start, end)) {
    // a collapsed target range is the browser saying there is nothing to delete
    if (type === "deleteByCut" || e.getTargetRanges().length > 0) {
      return [];
    }

    const text = view.blockText(start.block);
    const index = view.blocks.indexOf(start.block);
    const granularity = WORD_DELETES.has(type) ? "word" : "grapheme";

    if (BACKWARD_DELETES.has(type)) {
      if (start.offset === 0) {
        return index > 0 ? [{ type: "joinWithPrevious", block: start.block }] : [];
      }
      start = {
        block : start.block,
        offset: deleteBoundary(text, start.offset, granularity, true),
      };
    } else {
      if (end.offset >= text.length) {
        const next = view.blocks[index + 1];
        return next === undefined ? [] : [{ type: "joinWithPrevious", block: next }];
      }
      end = { block: end.block, offset: deleteBoundary(text, end.offset, granularity, false) };
    }
  }

  const si = view.blocks.indexOf(start.block);
  const ei = view.blocks.indexOf(end.block);
  const boundaryOnly =
    ei === si + 1 && start.offset >= view.blockText(start.block).length && end.offset === 0;

  if (boundaryOnly) {
    return [{ type: "joinWithPrevious", block: end.block }];
  }

  return [{ type: "deleteRange", range: { anchor: start, head: end } }];
}
