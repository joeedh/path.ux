import type { IContextBase } from "../../core/context_base";
import type { JsonValue } from "./provider";
import type { CommandResult, DocumentCommand } from "./widget";
import type { DraftController } from "./drafts";
import { widgetJson } from "./widget_codec";

export type FormNode = {
  readonly optional?: boolean;
  readonly hasDefault?: boolean;
  readonly description?: string;
} & (
  | { readonly kind: "string" | "number" | "boolean" | "null" }
  | { readonly kind: "enum"; readonly values: readonly JsonValue[] }
  | { readonly kind: "object"; readonly fields: Readonly<Record<string, FormNode>> }
  | { readonly kind: "array"; readonly item: FormNode }
  | { readonly kind: "record"; readonly value: FormNode }
  | { readonly kind: "union"; readonly options: readonly FormNode[] }
  | { readonly kind: "unsupported"; readonly reason: string }
);

export interface FormIssue {
  readonly path: readonly (string | number)[];
  readonly message: string;
}

export type FormValidation<Output = unknown> =
  | { readonly success: true; readonly output: Output }
  | { readonly success: false; readonly issues: readonly FormIssue[] };

/** Validates authored input; transformed output is never a storage replacement. */
export interface FormSchema<Output = unknown> {
  readonly root: FormNode;
  readonly diagnostics: readonly FormIssue[];
  validate(input: JsonValue): Promise<FormValidation<Output>>;
}

/**
 * One field's editor in place of the text box. It speaks the encoded text `FormControl` keeps
 * for the field (`encodeFormField` with `json` false), and never the decoded value.
 */
export interface FieldControl {
  readonly element: HTMLElement;
  /** Further keys this control also encodes; each is routed here and gets no row of its own. */
  readonly also?: readonly string[];
  /** The encoded text for `key` as the control shows it now; `undefined` omits the key. */
  read(key: string): string | undefined;
  /** Shows `text` for `key`; a no-op when it equals what the control last read or wrote. */
  write(key: string, text: string | undefined): void;
  setReadOnly(on: boolean): void;
  focus(): void;
  dispose(): void;
  /** Set by `FormControl`; the control calls it with every change the author makes. */
  oninput?: (key: string, text: string | undefined) => void;
}

/** What `FormControl` hands a factory: the field it is for and the context widgets are built in. */
export interface FieldHost {
  readonly name: string;
  readonly node: FormNode;
  readonly meta: FieldMeta;
  readonly context: IContextBase;
}

export type FieldControlFactory = (host: FieldHost) => FieldControl;

export interface FieldMeta {
  readonly label?: string;
  readonly help?: string;
  readonly group?: string;
  /**
   * `"text"` and `"json"` are the text box, the latter decoding as JSON even for a string;
   * `"none"` draws no row and leaves the key to another control's `also` or to the document;
   * a factory draws its own editor.
   */
  readonly control?: "text" | "json" | "none" | FieldControlFactory;
  /** Shown and never edited: the control stays read-only whatever the form's state, and the row draws no Omit. */
  readonly readOnly?: boolean;
}

export interface FormPresentation {
  readonly order?: readonly string[];
  readonly fields?: Readonly<Record<string, FieldMeta>>;
}

export interface FormSnapshot {
  readonly revision: string;
  readonly values: JsonValue;
}

/** Owns committed values and history; controls keep editable text in per-view drafts. */
export interface FormBinding {
  readonly key: string;
  read(): FormSnapshot | undefined;
  subscribe(changed: () => void): () => void;
  prepare(expected: FormSnapshot, values: JsonValue): DocumentCommand;
  commit(expected: FormSnapshot, values: JsonValue): Promise<CommandResult>;
  registerDraft(controller: DraftController): () => void;
  canWrite(): boolean;
}

export function formObject(value: JsonValue): value is { readonly [key: string]: JsonValue } {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Encodes controls without applying defaults, coercions, refinements or transforms. */
export function decodeFormField(node: FormNode, text: string, json = false): JsonValue {
  if (node.kind === "unsupported") throw new Error(node.reason);
  if (node.kind === "string" && !json) return text;
  if (node.kind === "enum" && node.values.every((v) => typeof v === "string") && !json) return text;
  if (text.length > 65536) throw new Error("Field exceeds the JSON size limit");
  return widgetJson(JSON.parse(text));
}

export function encodeFormField(
  node: FormNode,
  value: JsonValue | undefined,
  json = false
): string {
  if (value === undefined) return "";
  if (!json && (node.kind === "string" || (node.kind === "enum" && typeof value === "string")))
    return typeof value === "string" ? value : JSON.stringify(value);
  return JSON.stringify(value);
}
