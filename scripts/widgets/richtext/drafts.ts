import type { DocumentCommand } from "./widget";

export type DraftProblem = "unencodable" | "conflict" | "refused";
export type DraftPreparation =
  { status: "ready"; command: DocumentCommand } | { status: DraftProblem; reason?: string };

/** Retains authored input until a command commits it or the host explicitly discards it. */
export interface DraftController {
  readonly key: string;
  pending(): boolean;
  version(): unknown;
  prepare(): DraftPreparation | Promise<DraftPreparation>;
  committed(): void;
  discard(): void;
  /** Supplies recoverable authored input after the view has detached. */
  recover(): unknown;
}

export interface PendingDraft {
  id: number;
  key: string;
  detached: boolean;
}

export type PrepareSaveResult =
  | { status: "ready"; revision: number }
  | { status: DraftProblem; drafts: readonly PendingDraft[]; reason?: string };
