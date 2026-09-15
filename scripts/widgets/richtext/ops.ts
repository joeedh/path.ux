import { ToolOp } from "../../path-controller/toolsys/toolop";
import type { FoldableToolOp } from "../../path-controller/toolsys/toolop";
import { StringProperty } from "../../path-controller/toolsys/toolprop";
import type { DocChangeInfo, DocumentSession, RichTextContext } from "./context";
import type { EditOp, EditResult } from "./provider";

// A run of typing folds into one entry. Every other kind of edit pushes, which the key
// arranges by giving it a number no other op will carry.
let uniqueRun = 0;

type EditInputs = { op: StringProperty; inverse: StringProperty };

/** A folding op's block, or `undefined` for an op that must always push. */
function foldBlock(op: EditOp) {
  const range = op.type === "insertText" ? op.at : op.type === "deleteRange" ? op.range : undefined;
  if (range === undefined || range.anchor.block !== range.head.block) {
    return undefined;
  }

  return range.anchor.block;
}

/**
 * One `EditOp` on the undo stack. The document comes from `ctx.session`, and both phases
 * are no-ops once that session is disposed. An editor reads the `EditResult` of the op it
 * submitted through `result()`; every result also reaches the session's listeners.
 */
export class DocEditOp extends ToolOp<EditInputs, {}, RichTextContext> implements FoldableToolOp {
  static tooldef() {
    return {
      uiname  : "Edit Document",
      toolpath: "richtext.edit",
      inputs: {
        op     : new StringProperty().ignoreLastValue(),
        inverse: new StringProperty().ignoreLastValue(),
      },
    };
  }

  private readonly key: string;
  private resolve?: (result: EditResult) => void;
  private source?: object;

  /**
   * `run` is the submitting editor's `pathUndoGen`; two `insertText` or `deleteRange` ops on
   * one block with the same run fold, and the editor bumps it whenever the next op is not
   * contiguous with the run in progress. A session's `dispatch` passes a fresh string instead.
   */
  constructor(op?: EditOp, inverse?: EditOp, sessionId = "", run: number | string = 0) {
    super();

    if (op !== undefined) {
      this.inputs.op.setValue(JSON.stringify(op));
    }
    if (inverse !== undefined) {
      this.inputs.inverse.setValue(JSON.stringify(inverse));
    }

    const type = op?.type ?? "";
    const block = op === undefined ? undefined : foldBlock(op);
    this.key =
      block === undefined
        ? `${sessionId}:${type}:#${++uniqueRun}`
        : `${sessionId}:${type}:${block}:${run}`;
  }

  get op(): EditOp {
    return JSON.parse(this.inputs.op.getValue()) as EditOp;
  }

  get inverse(): EditOp {
    return JSON.parse(this.inputs.inverse.getValue()) as EditOp;
  }

  /**
   * The `EditResult` of applying this op, whether it pushes or folds into the head. Call
   * before submitting; the promise is settled by the phase that applies the op, which also
   * delivers the result to the session's listeners with `source` as the submitter.
   */
  result(source?: object): Promise<EditResult> {
    this.source = source;

    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  private settle(
    session: DocumentSession,
    result: EditResult,
    origin: DocChangeInfo["origin"],
    op: EditOp
  ): void {
    const resolve = this.resolve;
    const submitter = this.source;
    this.resolve = undefined;
    this.source = undefined;

    session.deliver(result, { origin, op, submitter });
    resolve?.(result);
  }

  /** The inverse was computed by the editor before submission; there is nothing to record. */
  override undoPre(_ctx: RichTextContext): void {}

  override exec(ctx: RichTextContext): void {
    const { session } = ctx;
    if (session.disposed) {
      return;
    }

    const op = this.op;
    // the toolstack marks a redo before re-running exec; the resolver is unset by then
    const origin = this._was_redo ? "redo" : "edit";
    this.settle(session, session.provider.applyEdit(session.doc, op), origin, op);
  }

  override undo(ctx: RichTextContext): void {
    const { session } = ctx;
    if (session.disposed) {
      return;
    }

    const inverse = this.inverse;
    session.deliver(session.provider.applyEdit(session.doc, inverse), {
      origin: "undo",
      op    : inverse,
    });
  }

  foldKey(): string {
    return this.key;
  }

  /**
   * Applies `next`'s edit and widens this op to cover it, so a redo replays the whole run.
   * The inverse stored when the run began stays: it covers the block, not the keystroke.
   */
  foldFrom(next: this, ctx: RichTextContext): void {
    const { session } = ctx;
    if (session.disposed) {
      return;
    }

    const head = this.op;
    const delta = next.op;

    if (head.type === "insertText" && delta.type === "insertText") {
      this.inputs.op.setValue(JSON.stringify({ ...head, text: head.text + delta.text }));
    } else if (head.type === "deleteRange" && delta.type === "deleteRange") {
      const block = head.range.anchor.block;
      const start = Math.min(
        head.range.anchor.offset,
        head.range.head.offset,
        delta.range.anchor.offset,
        delta.range.head.offset
      );
      const length =
        Math.abs(head.range.head.offset - head.range.anchor.offset) +
        Math.abs(delta.range.head.offset - delta.range.anchor.offset);
      const range = { anchor: { block, offset: start }, head: { block, offset: start + length } };

      this.inputs.op.setValue(JSON.stringify({ ...head, range }));
    }

    next.settle(session, session.provider.applyEdit(session.doc, delta), "fold", delta);
  }
}

ToolOp.register(DocEditOp as unknown as Parameters<typeof ToolOp.register>[0]);
