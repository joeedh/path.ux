import { UIBase } from "../../core/ui_base";
import { TextBox } from "../ui_textbox";
import "../ui_textbox";
import type { IContextBase } from "../../core/context_base";
import type { DraftPreparation } from "./drafts";
import type { WidgetState, WidgetView } from "./widget";
import { decodeFormField, encodeFormField, formObject } from "./form_schema";
import type {
  FormBinding,
  FormNode,
  FormPresentation,
  FormSchema,
  FormSnapshot,
  FormValidation,
} from "./form_schema";
import type { JsonValue } from "./provider";
import { widgetJson } from "./widget_codec";

/** A standalone control whose text drafts commit through its supplied history binding. */
export class FormControl<Output = unknown> implements WidgetView {
  readonly element = document.createElement("div");
  private readonly status = document.createElement("div");
  private readonly controls = new Map<string, { node: FormNode; box: TextBox; json: boolean }>();
  private readonly edits = new Map<string, string | undefined>();
  private readonly buttons: HTMLButtonElement[] = [];
  private base: FormSnapshot;
  private latest?: FormSnapshot;
  private version = 0;
  private readOnly = false;
  private composing = false;
  private busy = false;
  private disposed = false;
  private readonly unsubscribe: () => void;
  private readonly unregister: () => void;

  constructor(
    readonly schema: FormSchema<Output>,
    readonly binding: FormBinding,
    context: IContextBase,
    presentation: FormPresentation = {},
    options: { commit?: boolean; discard?: boolean } = {}
  ) {
    const initial = binding.read();
    if (!initial || !formObject(initial.values)) throw new Error("Form requires an object input");
    if (schema.root.kind !== "object" || schema.diagnostics.length)
      throw new Error(
        "Unsupported form schema: " + schema.diagnostics.map((d) => d.message).join("; ")
      );
    this.latest = this.base = initial;
    this.element.className = "schema-form";
    this.element.style.cssText =
      "display:flex;flex-direction:column;gap:6px;padding:8px;min-width:260px";
    this.status.setAttribute("role", "status");
    const fields = schema.root.fields;
    const order = [...new Set([...(presentation.order ?? []), ...Object.keys(fields)])];
    for (const name of order) {
      const node = fields[name];
      if (!node) continue;
      const meta = presentation.fields?.[name];
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:6px;flex-wrap:wrap";
      const label = document.createElement("span");
      label.textContent = (meta?.group ? `${meta.group}: ` : "") + (meta?.label ?? name);
      label.style.flex = "0 0 105px";
      const box = UIBase.constructElement<TextBox>("textbox-x", context);
      box.useDataPathUndo = false;
      box.style.width = "220px";
      box.style.boxShadow = "inset 0 0 0 1px #888";
      box.overrideDefault("border-width", 1);
      box.setCSS();
      box.setAttribute("modal", "false");
      box.dom.setAttribute("aria-label", meta?.label ?? name);
      box.dom.title = meta?.help ?? node.description ?? "";
      const json = meta?.control === "json";
      this.controls.set(name, { node, box, json });
      box.dom.addEventListener("input", () => {
        if (this.locked()) return;
        this.edits.set(name, box.text);
        this.version++;
        this.status.textContent = "Draft";
      });
      row.append(label, box);
      this.button(
        "Omit " + name,
        () => {
          this.edits.set(name, undefined);
          this.version++;
          box.text = "";
          this.status.textContent = "Draft: field omitted";
        },
        row
      );
      this.element.append(row);
    }
    const actions = document.createElement("div");
    if (options.commit !== false) this.button("Apply answers", () => void this.commit(), actions);
    if (options.discard !== false)
      this.button("Discard answers", () => this.discard(), actions, true);
    this.button("Validate submission", () => void this.validateSubmission(), actions);
    this.element.append(actions, this.status);
    this.element.addEventListener("compositionstart", () => (this.composing = true));
    this.element.addEventListener("compositionend", () => (this.composing = false));
    this.unregister = binding.registerDraft({
      key      : binding.key,
      pending  : () => this.pending,
      version  : () => this.version,
      prepare  : () => this.prepare(),
      committed: () => this.committed(),
      discard  : () => this.discard(),
      recover  : () => ({ base: structuredClone(this.base), edits: [...this.edits] }),
    });
    this.unsubscribe = binding.subscribe(() => this.refresh());
    this.refresh();
  }

  get pending(): boolean {
    return this.edits.size > 0;
  }

  private locked(): boolean {
    return this.disposed || this.readOnly || !this.binding.canWrite() || !this.latest || this.busy;
  }

  private button(label: string, action: () => void, parent: HTMLElement, recovery = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.dataset.recovery = String(recovery);
    button.addEventListener("pointerdown", (event) => event.preventDefault());
    button.addEventListener("click", () => {
      if (!this.composing && !this.busy && (recovery || !this.locked())) action();
    });
    parent.append(button);
    this.buttons.push(button);
  }

  private values(): JsonValue {
    if (!formObject(this.base.values)) throw new Error("Form input is no longer an object");
    const result = { ...this.base.values };
    for (const [name, text] of this.edits) {
      if (text === undefined) delete result[name];
      else {
        const { node, json } = this.controls.get(name)!;
        result[name] = decodeFormField(node, text, json);
      }
    }
    return widgetJson(result);
  }

  private prepare(): DraftPreparation {
    this.latest = this.binding.read();
    if (this.locked() || this.composing)
      return { status: "refused", reason: "Form is unavailable or read-only" };
    if (this.latest?.revision !== this.base.revision)
      return { status: "conflict", reason: "Saved answers changed; recover or discard this draft" };
    try {
      return { status: "ready", command: this.binding.prepare(this.base, this.values()) };
    } catch (error) {
      return { status: "unencodable", reason: String(error) };
    }
  }

  /** Captures authored answers for an explicit action without committing or transforming them. */
  submissionValues(): JsonValue {
    if (this.locked() || this.composing || this.binding.read()?.revision !== this.base.revision)
      throw new Error("Resolve unavailable or conflicting answers before submission");
    return this.values();
  }

  async commit(): Promise<void> {
    if (!this.pending) return;
    const prepared = this.prepare();
    if (prepared.status !== "ready") {
      this.status.textContent = prepared.reason ?? prepared.status;
      return;
    }
    const version = this.version;
    const values = this.values();
    this.busy = true;
    this.refresh();
    try {
      const result = await this.binding.commit(this.base, values);
      if (result.status === "applied" && version === this.version) this.committed();
      else this.status.textContent = result.status;
    } finally {
      this.busy = false;
      this.refresh();
    }
  }

  /** Returns validated output for an explicit host action, without changing saved input. */
  async validateSubmission(): Promise<FormValidation<Output>> {
    const revision = this.base.revision;
    const version = this.version;
    let result: FormValidation<Output>;
    try {
      if (this.locked() || this.composing || this.binding.read()?.revision !== revision)
        throw new Error("Resolve unavailable or conflicting answers before submission");
      result = await this.schema.validate(this.values());
      if (
        this.disposed ||
        this.locked() ||
        version !== this.version ||
        this.binding.read()?.revision !== revision
      )
        throw new Error("Answers changed during validation");
    } catch (error) {
      result = { success: false, issues: [{ path: [], message: String(error) }] };
    }
    this.status.textContent = result.success
      ? "Valid for submission"
      : result.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return result;
  }

  private committed() {
    this.edits.clear();
    this.version++;
    this.refresh();
    this.status.textContent = "Saved in document";
  }

  discard(): void {
    this.edits.clear();
    this.version++;
    this.refresh();
    this.status.textContent = "";
  }

  refresh(): void {
    this.latest = this.binding.read();
    if (!this.pending && !this.composing && this.latest && formObject(this.latest.values)) {
      this.base = this.latest;
      for (const [name, { node, box, json }] of this.controls) {
        const text = encodeFormField(node, this.latest.values[name], json);
        if (box.text !== text) box.text = text;
      }
    }
    const locked = this.locked();
    for (const { box } of this.controls.values()) box.dom.readOnly = locked;
    for (const button of this.buttons)
      button.disabled = this.busy || (locked && button.dataset.recovery !== "true");
    if (!this.latest) this.status.textContent = "Structured view unavailable; use raw source";
    else if (this.pending && this.base.revision !== this.latest.revision)
      this.status.textContent = "Saved answers changed; draft retained";
  }

  update(state: WidgetState): void {
    this.readOnly = state.readOnly;
    this.refresh();
  }

  focus(last = false): void {
    const fields = [...this.controls.values()];
    fields[last ? fields.length - 1 : 0]?.box.dom.focus();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribe();
    this.unregister();
    for (const { box } of this.controls.values()) box.remove();
  }
}
