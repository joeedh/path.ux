import { UIBase } from "../../core/ui_base";
import { TextBox } from "../ui_textbox";
import "../ui_textbox";
import type { IContextBase } from "../../core/context_base";
import type { DraftPreparation } from "./drafts";
import type { WidgetState, WidgetView } from "./widget";
import { decodeFormField, encodeFormField, formObject } from "./form_schema";
import { formStyles } from "./form_styles";
import type {
  FieldControl,
  FieldMeta,
  FormBinding,
  FormNode,
  FormPresentation,
  FormSchema,
  FormSnapshot,
  FormValidation,
} from "./form_schema";
import type { JsonValue } from "./provider";
import { widgetJson } from "./widget_codec";

/** What `FormControl.restore` takes: the shape a form draft's `recover` answers with. */
export interface RecoveredForm {
  readonly base: FormSnapshot;
  readonly edits: Iterable<readonly [string, string | undefined]>;
}

const RECOVERED = "Recovered answers from a form that closed";

/** The default editor: one `textbox-x`, keyed by the field it shows. */
class TextFieldControl implements FieldControl {
  readonly element: HTMLElement;
  private readonly box: TextBox;
  oninput?: (key: string, text: string | undefined) => void;

  constructor(
    private readonly key: string,
    meta: FieldMeta,
    node: FormNode,
    context: IContextBase
  ) {
    const box = UIBase.constructElement<TextBox>("textbox-x", context);
    box.useDataPathUndo = false;
    // the widget copies its own width onto the inner input, so the row's width reaches the input
    // only through the widget's; the stylesheet's flex-basis then sizes the widget
    box.width = "100%";
    box.dom.style.minWidth = "0";
    box.overrideDefault("border-width", 1);
    box.setCSS();
    box.setAttribute("modal", "false");
    box.dom.setAttribute("aria-label", meta.label ?? key);
    box.dom.title = meta.help ?? node.description ?? "";
    box.dom.addEventListener("input", () => this.oninput?.(key, box.text));
    this.box = box;
    this.element = box;
  }

  read(): string {
    return this.box.text;
  }

  write(_key: string, text: string | undefined): void {
    const next = text ?? "";
    if (this.box.text !== next) this.box.text = next;
  }

  /** The attribute mirrors the input's state onto the host, where a stylesheet can reach it. */
  setReadOnly(on: boolean): void {
    this.box.dom.readOnly = on;
    this.box.toggleAttribute("readonly", on);
  }

  focus(): void {
    this.box.dom.focus();
  }

  dispose(): void {
    this.box.remove();
  }
}

interface Field {
  node: FormNode;
  control: FieldControl;
  json: boolean;
}

/** A row's Omit button, which reads Keep while the field is omitted so the click is reversible. */
interface OmitButton {
  button: HTMLButtonElement;
  label: string;
}

/** A standalone control whose text drafts commit through its supplied history binding. */
export class FormControl<Output = unknown> implements WidgetView {
  readonly element = document.createElement("div");
  private readonly status = document.createElement("div");
  private readonly fields = new Map<string, Field>();
  private readonly views: FieldControl[] = [];
  private readonly edits = new Map<string, string | undefined>();
  private readonly buttons: HTMLButtonElement[] = [];
  private readonly omits = new Map<string, OmitButton>();
  /** Controls a `readOnly` field meta keeps read-only whatever the form's state. */
  private readonly fixed = new Set<FieldControl>();
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
    const style = document.createElement("style");
    style.textContent = formStyles();
    this.element.append(style);
    this.status.className = "schema-form-status";
    this.status.setAttribute("role", "status");
    const nodes = schema.root.fields;
    const order = [...new Set([...(presentation.order ?? []), ...Object.keys(nodes)])];
    const fallbacks: string[] = [];
    for (const name of order) {
      const node = nodes[name];
      if (!node || this.fields.has(name)) continue;
      const meta = presentation.fields?.[name] ?? {};
      if (meta.control === "none") continue;
      const row = document.createElement("div");
      row.className = "schema-form-row";
      const label = document.createElement("span");
      label.className = "schema-form-label";
      label.textContent = (meta.group ? `${meta.group}: ` : "") + (meta.label ?? name);
      let control: FieldControl | undefined;
      let json = meta.control === "json";
      if (typeof meta.control === "function") {
        try {
          control = meta.control({ name, node, meta, context });
          for (const key of control.also ?? []) {
            if (!nodes[key]) throw new Error(`${name} also edits ${key}, which the schema lacks`);
            if (this.fields.has(key)) throw new Error(`${key} is drawn twice`);
          }
        } catch (error) {
          control?.dispose();
          control = undefined;
          fallbacks.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      if (!control) {
        control = new TextFieldControl(name, meta, node, context);
        json = meta.control === "json";
      }
      control.oninput = (key, text) => {
        if (this.locked()) return;
        this.edits.set(key, text);
        this.version++;
        this.status.textContent = "Draft";
        this.paintOmits();
      };
      this.fields.set(name, { node, control, json });
      for (const key of control.also ?? [])
        this.fields.set(key, { node: nodes[key]!, control, json: false });
      this.views.push(control);
      if (meta.readOnly) this.fixed.add(control);
      row.append(label, control.element);
      // the row's label already names the field, so the button reads as one word and keeps
      // the field's name for assistive technology
      if (!meta.readOnly) {
        const button = this.button("Omit", "", () => this.toggleOmit(name), row);
        button.setAttribute("aria-label", "Omit " + name);
        this.omits.set(name, { button, label: meta.label ?? name });
      }
      this.element.append(row);
    }
    const actions = document.createElement("div");
    actions.className = "schema-form-actions";
    if (options.commit !== false)
      this.button(
        "Apply answers",
        "Write the answers typed here into the document, as one undoable edit",
        () => void this.commit(),
        actions
      );
    if (options.discard !== false)
      this.button(
        "Discard answers",
        "Drop the answers typed here and show what the document holds",
        () => this.discard(),
        actions,
        true
      );
    this.button(
      "Validate submission",
      "Check the answers against the schema without applying them",
      () => void this.validateSubmission(),
      actions
    );
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
      recover: (): RecoveredForm => ({ base: structuredClone(this.base), edits: [...this.edits] }),
    });
    this.unsubscribe = binding.subscribe(() => this.refresh());
    this.refresh();
    if (fallbacks.length) this.status.textContent = "Text box instead: " + fallbacks.join("; ");
  }

  get pending(): boolean {
    return this.edits.size > 0;
  }

  private locked(): boolean {
    return this.disposed || this.readOnly || !this.binding.canWrite() || !this.latest || this.busy;
  }

  private button(
    label: string,
    title: string,
    action: () => void,
    parent: HTMLElement,
    recovery = false
  ) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.title = title;
    button.dataset.recovery = String(recovery);
    button.addEventListener("pointerdown", (event) => event.preventDefault());
    button.addEventListener("click", () => {
      if (!this.composing && !this.busy && (recovery || !this.locked())) action();
    });
    parent.append(button);
    this.buttons.push(button);
    return button;
  }

  private omitted(name: string): boolean {
    return this.edits.has(name) && this.edits.get(name) === undefined;
  }

  /** Omit leaves the field out of the document; pressed again, as Keep, it puts the value back. */
  private toggleOmit(name: string): void {
    const { node, control, json } = this.fields.get(name)!;
    if (this.omitted(name)) {
      this.edits.delete(name);
      control.write(
        name,
        encodeFormField(
          node,
          formObject(this.base.values) ? this.base.values[name] : undefined,
          json
        )
      );
      this.status.textContent = this.pending ? "Draft" : "";
    } else {
      this.edits.set(name, undefined);
      control.write(name, undefined);
      this.status.textContent = "Draft: field omitted";
    }
    this.version++;
    this.paintOmits();
  }

  private paintOmits(): void {
    for (const [name, { button, label }] of this.omits) {
      const omitted = this.omitted(name);
      button.textContent = omitted ? "Keep" : "Omit";
      button.title = omitted
        ? `Put ${label} back as the document has it`
        : `Leave ${label} out of the document; applying the answers then removes it`;
    }
  }

  private values(): JsonValue {
    if (!formObject(this.base.values)) throw new Error("Form input is no longer an object");
    const result = { ...this.base.values };
    for (const [name, text] of this.edits) {
      if (text === undefined) delete result[name];
      else {
        const { node, json } = this.fields.get(name)!;
        result[name] = decodeFormField(node, text, json);
      }
    }
    return widgetJson(result);
  }

  /**
   * The draft as a command, once the answers pass the schema; answers that fail it are refused
   * here, with the issues as the reason, so an omitted required field never reaches the document.
   */
  private async prepare(): Promise<DraftPreparation> {
    this.latest = this.binding.read();
    if (this.locked() || this.composing)
      return { status: "refused", reason: "Form is unavailable or read-only" };
    if (this.latest?.revision !== this.base.revision)
      return { status: "conflict", reason: "Saved answers changed; recover or discard this draft" };
    let values: JsonValue;
    try {
      values = this.values();
    } catch (error) {
      return { status: "unencodable", reason: String(error) };
    }
    const version = this.version;
    const checked = await this.schema.validate(values);
    if (this.disposed || version !== this.version)
      return { status: "conflict", reason: "Answers changed during validation" };
    if (!checked.success) {
      const issues = checked.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
      return { status: "unencodable", reason: issues.join("; ") };
    }
    try {
      return { status: "ready", command: this.binding.prepare(this.base, values) };
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
    const prepared = await this.prepare();
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

  /**
   * Plays a closed form's answers into this one. Refused, answering `false`, when this form
   * is locked or already holds answers, when the draft was typed over different values, or
   * when it names a field this form does not draw.
   */
  restore(draft: RecoveredForm): boolean {
    this.refresh();
    if (this.locked() || this.composing || this.pending) return false;
    if (JSON.stringify(draft.base.values) !== JSON.stringify(this.base.values)) return false;
    const entries = [...draft.edits];
    if (entries.some(([name]) => !this.fields.has(name))) return false;
    for (const [name, text] of entries) {
      this.edits.set(name, text);
      this.fields.get(name)!.control.write(name, text);
    }
    this.version++;
    this.status.textContent = RECOVERED;
    this.paintOmits();
    return true;
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
      for (const [name, { node, control, json }] of this.fields)
        control.write(name, encodeFormField(node, this.latest.values[name], json));
    }
    const locked = this.locked();
    for (const control of this.views) control.setReadOnly(locked || this.fixed.has(control));
    for (const button of this.buttons)
      button.disabled = this.busy || (locked && button.dataset.recovery !== "true");
    this.paintOmits();
    if (!this.latest) this.status.textContent = "Structured view unavailable; use raw source";
    else if (this.pending && this.base.revision !== this.latest.revision)
      this.status.textContent = "Saved answers changed; draft retained";
  }

  update(state: WidgetState): void {
    this.readOnly = state.readOnly;
    this.refresh();
  }

  focus(last = false): void {
    this.views[last ? this.views.length - 1 : 0]?.focus();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribe();
    this.unregister();
    for (const control of this.views) control.dispose();
  }
}
