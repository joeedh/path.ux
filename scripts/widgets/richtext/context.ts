import { toLockedImpl } from "../../path-controller/controller/contextNew";
import type { DataAPI } from "../../path-controller/controller/controller";
import type { Screen } from "../../screen/FrameManager";
import type { IToolStack } from "../../path-controller/controller/controller_abstract";
import type { IContextBase } from "../../core/context_base";
import type { DocChange, DocumentProvider } from "./provider";

/** `source` is whatever the submitter of an edit passed to `DocEditOp.result`; undo and redo carry none. */
export type DocChangeListener = (change: DocChange, source?: unknown) => void;

let sessionCounter = 0;

/**
 * One open document: its provider, the toolstack its edits run on, and the listeners that
 * hear about changes an editor did not make itself. An app creates one per document and
 * hands it to every editor showing that document.
 */
export class DocumentSession<Doc = unknown> {
  readonly id: string;
  disposed = false;

  private readonly listeners = new Set<DocChangeListener>();
  private readonly unsubscribe: () => void;

  constructor(
    readonly doc: Doc,
    readonly provider: DocumentProvider<Doc>,
    readonly toolstack: IToolStack,
    id = `doc${++sessionCounter}`
  ) {
    this.id = id;
    this.unsubscribe = provider.onChange(doc, (change) => this.deliver(change));
  }

  /** Hears every change delivered through the session, provider changes included. */
  onChange(listener: DocChangeListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Forwards a change to every listener. Every `DocEditOp` phase arrives this way, with
   * `source` naming the submitter so an editor can skip a change it already applied.
   */
  deliver(change: DocChange, source?: unknown): void {
    if (this.disposed) {
      return;
    }

    for (const listener of [...this.listeners]) {
      listener(change, source);
    }
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
 * The context an editor builds its subtree under. Everything but the toolstack comes from
 * the parent context; the toolstack is the session's, so every op run through the editor
 * lands on the document's stack.
 */
export class RichTextContext<
  Parent extends IContextBase = IContextBase,
  Doc = unknown,
> implements IContextBase {
  constructor(
    readonly parent: Parent,
    readonly session: DocumentSession<Doc>
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

  /** Locks the parent; the session and its toolstack are not state and stay live. */
  toLocked(): this {
    const parent = this.parent.toLocked
      ? this.parent.toLocked()
      : (toLockedImpl.call(this.parent) as Parent);

    return new RichTextContext(parent, this.session) as this;
  }
}
