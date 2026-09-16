import type { DocumentSession } from "./context";
import type { DraftController } from "./drafts";
import type { BlockId, EditOp, EditResult, ProviderContext } from "./provider";

/** Resolves a guarded edit synchronously under the history lock. */
export interface DocumentCommand {
  resolve(): EditOp | undefined;
  authorize?(): boolean;
}

export type CommandResult =
  | { status: "applied"; result: EditResult }
  | { status: "refused"; reason: string }
  | { status: "failed"; error: unknown };

export interface WidgetState {
  readonly value: unknown;
  readonly readOnly: boolean;
}

export interface WidgetContext {
  readonly signal: AbortSignal;
  isCurrent(): boolean;
  command(command: DocumentCommand): Promise<CommandResult>;
  registerDraft(controller: DraftController): () => void;
}

/** Owns one editor's DOM and releases its subscriptions and requests on disposal. */
export interface WidgetView {
  element: HTMLElement;
  update?(state: WidgetState): void;
  dispose(): void;
  focus?(last: boolean): void;
}

/** Describes a view without constructing DOM or starting resource requests. */
export interface WidgetDescriptor {
  id: string;
  implementation: object | string;
  label: string;
  value?: unknown;
  allowed?: boolean;
  editable?: boolean;
  create(context: WidgetContext): WidgetView | Promise<WidgetView>;
}

export interface WidgetOptions<Doc = unknown> {
  resolveNativeBlock?(
    session: DocumentSession<Doc>,
    block: BlockId,
    context: ProviderContext
  ): WidgetDescriptor | undefined;
}
