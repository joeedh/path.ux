import { ToolOp, ToolRefusedError } from "../../path-controller/toolsys/toolop";
import type { FoldableToolOp } from "../../path-controller/toolsys/toolop";
import { StringProperty } from "../../path-controller/toolsys/toolprop";
import type { DocChangeInfo, DocumentSession, RichTextContext } from "./context";
import type { EditOp, EditResult } from "./provider";

// A run of typing folds into one entry. Every other kind of edit pushes, which the key
// arranges by giving it a number no other op will carry.
let uniqueRun = 0;

function checkJson(value: unknown, ancestors = new Set<object>()): void {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (
    typeof value !== "object" ||
    ancestors.has(value) ||
    ancestors.size >= 100 ||
    (!Array.isArray(value) &&
      Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    throw new Error("Command data must be losslessly JSON encodable");
  }
  ancestors.add(value);
  for (const item of Object.values(value)) checkJson(item, ancestors);
  ancestors.delete(value);
}

function encodeEdit(op: EditOp): string {
  if (op.type === "custom") checkJson(op.data);
  return JSON.stringify(op);
}

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
 * refuse once that session is disposed. An editor reads the `EditResult` of the op it
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
  prepare?: () => EditOp;
  preserveFocus = false;
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

  override historyPreflight(ctx: RichTextContext) {
    return ctx.session.canWrite ? undefined : { reason: "Document writes are prohibited" };
  }

  private apply(session: DocumentSession, op: EditOp): EditResult {
    if (!session.canWrite) throw new ToolRefusedError("Document writes are prohibited", this);
    const blocks = structuredClone(session.provider.snapshots(session.doc));
    try {
      const result = session.provider.applyEdit(session.doc, op);
      return this.preserveFocus ? { ...result, preserveFocus: true } : result;
    } catch (error) {
      session.provider.applyEdit(session.doc, {
        type : "replaceBlocks",
        after: null,
        blocks,
        remove: [...session.provider.blocks(session.doc)],
      });
      throw error;
    }
  }

  private resolveEdit(session: DocumentSession): EditOp {
    if (!session.canWrite) throw new ToolRefusedError("Document writes are prohibited", this);
    const op = this.prepare?.() ?? this.op;
    if (session.widgetHost && !session.widgetHost.authorizeEdit(op))
      throw new ToolRefusedError("Widget insertion is prohibited", this);
    const encoded = encodeEdit(op);
    this.inputs.op.setValue(encoded);
    const decoded = this.op;
    this.inputs.inverse.setValue(JSON.stringify(session.provider.inverse(session.doc, decoded)));
    return decoded;
  }

  /** Captures the inverse beside mutation in exec, without an asynchronous gap. */
  override undoPre(_ctx: RichTextContext): void {}

  override exec(ctx: RichTextContext): void {
    const { session } = ctx;
    const op = this._was_redo ? this.op : this.resolveEdit(session);
    // the toolstack marks a redo before re-running exec; the resolver is unset by then
    const origin = this._was_redo ? "redo" : "edit";
    this.settle(session, this.apply(session, op), origin, op);
  }

  override undo(ctx: RichTextContext): void {
    const { session } = ctx;
    const inverse = this.inverse;
    session.deliver(this.apply(session, inverse), {
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
    const head = this.op;
    const delta = next.resolveEdit(session);
    const result = next.apply(session, delta);

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

    next.settle(session, result, "fold", delta);
  }
}

ToolOp.register(DocEditOp as unknown as Parameters<typeof ToolOp.register>[0]);
