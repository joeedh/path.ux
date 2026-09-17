import type { SessionWidgetHost } from "./plugin_types";
import { toLockedImpl } from "../../path-controller/controller/contextNew";
import type { DataAPI } from "../../path-controller/controller/controller";
import type { Screen } from "../../screen/FrameManager";
import type { IToolStack } from "../../path-controller/controller/controller_abstract";
import type { IContextBase } from "../../core/context_base";
import { DocEditOp } from "./ops";
import { ToolRefusedError } from "../../path-controller/toolsys/toolop";
import type { CommandResult, DocumentCommand } from "./widget";
import type { DraftController, PendingDraft, PrepareSaveResult } from "./drafts";
import type { DocChange, DocumentProvider, EditOp, EditorBridge, EditResult } from "./provider";

/**
 * Where a delivered change came from. `edit` is a pushed op, `fold` one that joined the
 * typing run at the head of the stack, `external` a change the provider reported through
 * `onExternalChange`.
 */
export type DocChangeOrigin = "edit" | "fold" | "undo" | "redo" | "external" | "policy";

/** What the session knows about a change beyond the change itself. */
export interface DocChangeInfo {
  invalidateWidgets?: boolean;
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
  widgetHost?: SessionWidgetHost;

  /** Cancels mounted generations after host metadata, registry or policy changes. */
  invalidateWidgets(): void {
    this.notify(
      { dirtyBlocks: this.provider.blocks(this.doc), removedBlocks: [] },
      { origin: "policy", invalidateWidgets: true }
    );
  }
  disposed = false;
  /** Counts every delivered change, folds included, so a client can tell local edits from none. */
  revision = 0;
  private writable = true;
  private draftId = 0;
  private readonly drafts = new Map<
    number,
    {
      controller: DraftController;
      context: IContextBase;
      detached: boolean;
    }
  >();
  private saving?: Promise<PrepareSaveResult>;

  get canWrite(): boolean {
    return this.writable && !this.disposed;
  }

  /** Invalidates view policy without changing the committed document revision. */
  setWriteAllowed(allowed: boolean): void {
    this.writable = allowed;
    const change = { dirtyBlocks: this.provider.blocks(this.doc), removedBlocks: [] };
    this.notify(change, { origin: "policy" });
  }

  get pendingDrafts(): readonly PendingDraft[] {
    return [...this.drafts]
      .filter(([, draft]) => draft.controller.pending())
      .map(([id, draft]) => ({ id, key: draft.controller.key, detached: draft.detached }));
  }

  registerDraft(controller: DraftController, context: IContextBase): () => void {
    const id = ++this.draftId;
    const entry = { controller, context, detached: false };
    this.drafts.set(id, entry);
    return () => {
      if (controller.pending()) entry.detached = true;
      else this.drafts.delete(id);
    };
  }

  discardDraft(id: number): void {
    const draft = this.drafts.get(id);
    draft?.controller.discard();
    if (draft?.detached) this.drafts.delete(id);
  }

  recoverDraft(id: number): unknown {
    return this.drafts.get(id)?.controller.recover();
  }

  prepareSave(): Promise<PrepareSaveResult> {
    return (this.saving ??= this.prepareDrafts().finally(() => {
      this.saving = undefined;
    }));
  }

  private async prepareDrafts(): Promise<PrepareSaveResult> {
    // Wait behind commands already queued on the shared application stack
    await this.toolstack.head;
    const pending = this.pendingDrafts;
    if (!pending.length) return { status: "ready", revision: this.revision };
    if (!this.canWrite || pending.some((draft) => draft.detached)) {
      return { status: "refused", drafts: pending };
    }
    if (new Set(pending.map((draft) => draft.key)).size !== pending.length) {
      return { status: "conflict", drafts: pending };
    }
    const revision = this.revision;
    const prepared = await Promise.all(
      pending.map(async (draft) => {
        const entry = this.drafts.get(draft.id)!;
        const version = entry.controller.version();
        try {
          return { draft, entry, version, result: await entry.controller.prepare() };
        } catch {
          return { draft, entry, version, result: { status: "unencodable" as const } };
        }
      })
    );
    if (this.revision !== revision) return { status: "conflict", drafts: this.pendingDrafts };
    let expectedRevision = revision;
    for (const { draft, entry, version, result } of prepared) {
      if (result.status !== "ready") return { ...result, drafts: [draft] };
      if (entry.detached) return { status: "refused", drafts: [draft] };
      if (entry.controller.version() !== version) return { status: "conflict", drafts: [draft] };
      const committed = await this.command(
        {
          authorize: () => !entry.detached && (result.command.authorize?.() ?? true),
          resolve: () =>
            this.revision === expectedRevision &&
            entry.controller.version() === version &&
            this.pendingDrafts.filter((other) => other.key === draft.key).length === 1
              ? result.command.resolve()
              : undefined,
        },
        entry.context
      );
      if (committed.status !== "applied") {
        return {
          status:
            committed.status === "refused" && committed.reason === "Stale or deleted target"
              ? "conflict"
              : "refused",
          drafts: [draft],
        };
      }
      expectedRevision++;
      if (entry.controller.version() !== version) return { status: "conflict", drafts: [draft] };
      entry.controller.committed();
    }
    return this.pendingDrafts.length || this.revision !== expectedRevision
      ? { status: "conflict", drafts: this.pendingDrafts }
      : { status: "ready", revision: this.revision };
  }

  async command(command: DocumentCommand, parentCtx: IContextBase): Promise<CommandResult> {
    const ctx = new RichTextContext(parentCtx, this);
    const tool = new DocEditOp(undefined, undefined, this.id, `command${++dispatchCounter}`);
    tool.prepare = () => {
      if (command.authorize && !command.authorize())
        throw new ToolRefusedError("Write refused", tool);
      const op = command.resolve();
      if (!op) throw new ToolRefusedError("Stale or deleted target", tool);
      return op;
    };
    tool.preserveFocus = true;
    const result = tool.result();
    try {
      await ctx.toolstack.foldOrExec(ctx, tool);
      return { status: "applied", result: await result };
    } catch (error) {
      return error instanceof ToolRefusedError
        ? { status: "refused", reason: error.reason }
        : { status: "failed", error };
    } finally {
      tool.prepare = undefined;
    }
  }

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
   * Delivers a committed change and advances its revision. Policy notifications use notify.
   */
  deliver(change: DocChange, info: DocChangeInfo): void {
    if (this.disposed) {
      return;
    }

    this.revision++;
    this.notify(change, info);
  }

  private notify(change: DocChange, info: DocChangeInfo): void {
    for (const listener of [...this.listeners]) {
      try {
        listener(change, info);
      } catch (error) {
        console.error("Document change listener failed", error);
      }
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
    run: number | string = `dispatch${++dispatchCounter}`,
    authorize?: () => boolean
  ): Promise<EditResult> {
    const ctx = new RichTextContext(parentCtx, this);
    const toolop = new DocEditOp(op, undefined, this.id, run);
    toolop.prepare = () => {
      if (authorize && !authorize()) throw new ToolRefusedError("View is read-only", toolop);
      return op;
    };
    const result = toolop.result(source);
    try {
      await ctx.toolstack.foldOrExec(ctx, toolop);
      return await result;
    } finally {
      toolop.prepare = undefined;
    }
  }

  /** Closes the document and refuses subsequent commands and history execution. */
  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.widgetHost?.dispose();
    this.notify({ dirtyBlocks: [], removedBlocks: [] }, { origin: "policy" });
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
