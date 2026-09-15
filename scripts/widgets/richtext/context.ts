import { toLockedImpl } from "../../path-controller/controller/contextNew";
import type { DataAPI } from "../../path-controller/controller/controller";
import type { Screen } from "../../screen/FrameManager";
import type { IToolStack } from "../../path-controller/controller/controller_abstract";
import type { IContextBase } from "../../core/context_base";
import { DocEditOp } from "./ops";
import type { DocChange, DocumentProvider, EditOp, EditorBridge, EditResult } from "./provider";

/**
 * Where a delivered change came from. `edit` is a pushed op, `fold` one that joined the
 * typing run at the head of the stack, `external` a change the provider reported through
 * `onExternalChange`.
 */
export type DocChangeOrigin = "edit" | "fold" | "undo" | "redo" | "external";

/** What the session knows about a change beyond the change itself. */
export interface DocChangeInfo {
  origin: DocChangeOrigin;
  /** The op applied, for every origin but `external`. */
  op?: EditOp;
  /** Whatever the submitter of the op passed to `DocEditOp.result`; undo and redo carry none. */
  submitter?: object;
}

export type DocChangeListener = (change: DocChange, info: DocChangeInfo) => void;

let sessionCounter = 0;
let dispatchCounter = 0;

/**
 * One open document: its provider, the toolstack its edits run on, and the listeners that
 * hear about every change to it. An app creates one per document and hands it to every
 * editor showing that document.
 */
export class DocumentSession<Doc = unknown> {
  readonly id: string;
  disposed = false;
  /** Counts every delivered change, folds included, so a client can tell local edits from none. */
  revision = 0;

  private readonly listeners = new Set<DocChangeListener>();
  private readonly unsubscribe: () => void;

  constructor(
    readonly doc: Doc,
    readonly provider: DocumentProvider<Doc>,
    readonly toolstack: IToolStack,
    id = `doc${++sessionCounter}`
  ) {
    this.id = id;
    this.unsubscribe =
      provider.onExternalChange?.(doc, (change) => this.deliver(change, { origin: "external" })) ??
      (() => {});
  }

  /** Hears every change delivered through the session, an editor's own edits included. */
  onChange(listener: DocChangeListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * The only path to the listeners. Every `DocEditOp` phase and the provider's external hook
   * arrive here; an editor skips a change whose `submitter` is itself, having applied it already.
   */
  deliver(change: DocChange, info: DocChangeInfo): void {
    if (this.disposed) {
      return;
    }

    this.revision++;
    for (const listener of [...this.listeners]) {
      listener(change, info);
    }
  }

  /**
   * Runs one op on the session's toolstack with no editor involved, and resolves with its
   * result once it has run. `run` defaults to a fresh value, so two dispatches never fold
   * into each other; pass an editor's own run to join its typing run.
   */
  async dispatch(
    op: EditOp,
    parentCtx: IContextBase,
    source?: object,
    run: number | string = `dispatch${++dispatchCounter}`
  ): Promise<EditResult> {
    const ctx = new RichTextContext(parentCtx, this);
    const toolop = new DocEditOp(op, this.provider.inverse(this.doc, op), this.id, run);
    const result = toolop.result(source);
    const ran = ctx.toolstack.foldOrExec(ctx, toolop);

    // the result settles inside exec, before the stack's own promise does; a throw on the
    // way there is the only reason to wait on that one
    return Promise.race([result, ran.then(() => result)]);
  }

  /** Marks the document closed: its ops on any stack become no-ops and nothing is delivered. */
  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.unsubscribe();
    this.listeners.clear();
  }
}

/**
 * The op that swaps the whole of `doc` for `next`, keeping `next`'s block ids. Its inverse is
 * the provider's snapshot of the current blocks, so undoing a reload restores the local edits
 * it overwrote, ids included; it never folds and lands as one undo entry.
 */
export function replaceContentsOp<Doc>(
  provider: DocumentProvider<Doc>,
  doc: Doc,
  next: Doc
): EditOp {
  return {
    type  : "replaceBlocks",
    after : null,
    blocks: provider.snapshots(next),
    remove: provider.blocks(doc),
  };
}

/**
 * The context an editor builds its subtree under. Everything but the toolstack comes from
 * the parent context; the toolstack is the session's, so every op run through the editor
 * lands on the document's stack. `editor` is the bridge of the editor that built the
 * context, and is absent on one the session built for a `dispatch`.
 */
export class RichTextContext<
  Parent extends IContextBase = IContextBase,
  Doc = unknown,
> implements IContextBase {
  constructor(
    readonly parent: Parent,
    readonly session: DocumentSession<Doc>,
    readonly editor?: EditorBridge
  ) {}

  get state() {
    return this.parent.state;
  }

  // The api and screen resolve against whichever context they are handed, so the parent's
  // serve this context as well; the self type on ContextLike is what the casts bridge
  get api(): DataAPI<this> {
    return this.parent.api as unknown as DataAPI<this>;
  }

  get screen(): Screen<this> {
    return this.parent.screen as unknown as Screen<this>;
  }

  get toolstack() {
    return this.session.toolstack;
  }

  /** Locks the parent; the session, its toolstack and the bridge are not state and stay live. */
  toLocked(): this {
    const parent = this.parent.toLocked
      ? this.parent.toLocked()
      : (toLockedImpl.call(this.parent) as Parent);

    return new RichTextContext(parent, this.session, this.editor) as this;
  }
}
