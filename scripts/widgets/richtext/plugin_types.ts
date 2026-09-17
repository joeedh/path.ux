import type { IContextBase } from "../../core/context_base";
import type { DocumentSession } from "./context";
import type { BlockId, ClipboardContent, EditOp, JsonValue, ProviderContext } from "./provider";
import type { DraftController } from "./drafts";
import type { CommandResult, DocumentCommand, WidgetDescriptor, WidgetView } from "./widget";

/** Stores only portable data; the container version is independent of the payload version. */
export interface WidgetRecord {
  readonly id: string;
  readonly type: string;
  readonly version: number;
  readonly payload: JsonValue;
}

/** Identifies a record's current location and relevant-value precondition. */
export interface WidgetSnapshot {
  readonly placement: "block";
  readonly block: BlockId;
  readonly revision: string;
  readonly record: WidgetRecord;
}

/** Builds data-only edits; reads return deeply frozen, detached values. */
export interface WidgetStorage<Doc> {
  read(doc: Doc, id: string): WidgetSnapshot | undefined;
  atBlock(doc: Doc, block: BlockId): WidgetSnapshot | undefined;
  insert(doc: Doc, after: BlockId | null, block: BlockId, record: WidgetRecord): EditOp;
  update(doc: Doc, snapshot: WidgetSnapshot, record: WidgetRecord): EditOp;
  remove(doc: Doc, snapshot: WidgetSnapshot): EditOp;
  move(doc: Doc, snapshot: WidgetSnapshot, after: BlockId | null): EditOp;
  pasted(content: ClipboardContent): readonly WidgetRecord[];
}

/** Provides session-level rendering and checks initial edits without participating in replay. */
export interface SessionWidgetHost {
  resolve(block: BlockId, context: ProviderContext): WidgetDescriptor | undefined;
  authorizeEdit(op: EditOp): boolean;
  dispose(): void;
}

export type WidgetAction = "insert" | "mount" | "edit" | "external";
export interface WidgetPolicyRequest {
  readonly action: WidgetAction;
  readonly record: WidgetRecord;
  readonly document: JsonValue;
  readonly externalAction?: string;
}

export interface PluginHostOptions {
  readonly document: JsonValue;
  authorize(request: WidgetPolicyRequest): boolean;
}

export type ExternalActionResult<T> =
  { status: "complete"; value: T } | { status: "refused" } | { status: "failed"; error: unknown };

/** Exposes scoped commands and cancellation; it is not a sandbox for plugin JavaScript. */
export interface PluginViewContext {
  readonly signal: AbortSignal;
  readonly document: JsonValue;
  isCurrent(): boolean;
  update(expected: WidgetSnapshot, payload: JsonValue): Promise<CommandResult>;
  prepareUpdate(expected: WidgetSnapshot, payload: JsonValue): DocumentCommand;
  registerDraft(controller: DraftController): () => void;
  external<T>(
    action: string,
    run: (signal: AbortSignal) => Promise<T>
  ): Promise<ExternalActionResult<T>>;
}

export interface WidgetPlugin {
  readonly type: string;
  readonly version: number;
  readonly label: string;
  validate(payload: JsonValue): boolean;
  create(snapshot: WidgetSnapshot, context: PluginViewContext): WidgetView | Promise<WidgetView>;
  /** Converts an older payload only when an explicit migration command runs. */
  migrate?(record: WidgetRecord): JsonValue;
}

/** Creates instance-owned configuration when a bound field opens a session. */
export type WidgetHostFactory = (
  session: DocumentSession,
  context: IContextBase
) => SessionWidgetHost;
