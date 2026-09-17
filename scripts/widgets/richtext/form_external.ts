import type { IContextBase } from "../../core/context_base";
import type { PluginViewContext, WidgetPlugin, WidgetSnapshot } from "./plugin_types";
import type { WidgetState, WidgetView } from "./widget";
import type { JsonValue } from "./provider";
import type { DraftController } from "./drafts";
import type { FormReference, RegisteredForm } from "./form_plugin";
import { FormControl } from "./form_control";
import { formObject } from "./form_schema";
import { declarativeFormSchema } from "./form_declarative";
import { widgetJson } from "./widget_codec";
import { WidgetResources, resourceAllowed, resourceReference } from "./resource";
import type { ResourceReference, ResourceServices, ResourceSnapshot } from "./resource";

type ResolveSchema = (reference: FormReference, document: JsonValue) => RegisteredForm | undefined;
function payload(value: JsonValue): value is {
  resource: { service: string; key: string };
  [key: string]: JsonValue;
} {
  return formObject(value) && resourceReference(value.resource);
}
function schemaReference(value: JsonValue | undefined): boolean {
  return (
    value !== undefined &&
    formObject(value) &&
    ((Object.keys(value).join(",") === "resource" && resourceReference(value.resource)) ||
      (typeof value.id === "string" &&
        Number.isSafeInteger(value.version) &&
        Number(value.version) > 0 &&
        !("resource" in value)))
  );
}
function config(snapshot: WidgetSnapshot): string {
  const data = snapshot.record.payload;
  return payload(data) ? JSON.stringify([data.resource, data.schema ?? null]) : "";
}

/** Hosts remote values without making document save or history execute a service transaction. */
export class ExternalFormView implements WidgetView {
  readonly element = document.createElement("div");
  private readonly body = document.createElement("div");
  private readonly status = document.createElement("div");
  private readonly buttons: HTMLButtonElement[] = [];
  private readonly client: WidgetResources;
  private latest: WidgetSnapshot;
  private readonly signature: string;
  private remote?: ResourceSnapshot;
  private schemaVersion?: { reference: ResourceReference; version: string };
  private form?: FormControl;
  private formDraft?: DraftController;
  private readOnly = false;
  private disposed = false;
  private busy = false;
  private validating = false;
  private generation = 0;
  private loaded = false;
  private readonly unregister: () => void;
  state = "idle";

  constructor(
    initial: WidgetSnapshot,
    private host: PluginViewContext,
    private services: ResourceServices,
    private context?: IContextBase,
    private resolveSchema?: ResolveSchema
  ) {
    this.latest = initial;
    this.signature = config(initial);
    this.client = new WidgetResources(host, services, () => this.latest.record);
    this.element.className = "external-resource";
    this.status.setAttribute("role", "status");
    this.status.setAttribute("aria-live", "polite");
    this.status.className = "resource-status";
    const actions = document.createElement("div");
    this.button("Refresh resource", () => this.refresh(), actions);
    if (context) this.button("Submit answers", () => this.submit(), actions);
    this.button("Save resource snapshot", () => this.saveSnapshot(), actions);
    if (context) this.button("Discard resource draft", () => this.discard(), actions, "discard");
    this.button("Cancel request", () => this.client.cancel(), actions, "cancel");
    this.element.append(this.body, actions, this.status);
    this.showSavedSnapshot();
    this.unregister = host.registerDraft({
      key    : "external-answers",
      pending: () => this.pending,
      version: () => [this.generation, this.formDraft?.version()],
      prepare: () => ({
        status: "refused",
        reason: "Submit or discard external answers explicitly",
      }),
      committed() {},
      discard: () => this.discard(),
      recover: () => ({
        resource: this.latest.record.payload,
        remote  : this.remote,
        draft   : this.formDraft?.recover(),
        state   : this.state,
      }),
    });
    void this.refresh();
  }
  private showSavedSnapshot() {
    const data = this.latest.record.payload;
    if (
      !payload(data) ||
      !data.snapshot ||
      !formObject(data.snapshot) ||
      !Object.hasOwn(data.snapshot, "value")
    )
      return;
    const text = document.createElement("pre");
    text.textContent =
      "Saved snapshot (not refreshed)\n" + JSON.stringify(data.snapshot.value, null, 2);
    this.body.replaceChildren(text);
  }
  get pending(): boolean {
    return !!this.form?.pending || (this.busy && this.state === "submitting");
  }
  private current(): boolean {
    return !this.disposed && this.host.isCurrent() && config(this.latest) === this.signature;
  }
  private say(state: string, message = state) {
    this.state = state;
    this.status.textContent = message;
  }
  private button(label: string, action: () => unknown, target: HTMLElement, kind = "normal") {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.dataset.kind = kind;
    button.addEventListener("pointerdown", (event) => event.preventDefault());
    button.addEventListener("click", () => {
      if (!button.disabled) void action();
    });
    target.append(button);
    this.buttons.push(button);
  }
  private sync() {
    this.form?.update({
      value   : undefined,
      readOnly: this.readOnly || this.busy || !this.current() || !this.loaded,
    });
    for (const button of this.buttons) {
      const kind = button.dataset.kind;
      button.disabled =
        kind === "cancel"
          ? !this.busy
          : kind === "discard"
            ? this.busy
            : !this.current() ||
              this.busy ||
              this.validating ||
              (button.textContent !== "Refresh resource" && (this.readOnly || !this.loaded));
    }
  }
  private async schema(): Promise<RegisteredForm | undefined> {
    const data = this.latest.record.payload;
    if (!payload(data) || !data.schema || !formObject(data.schema)) return;
    if (resourceReference(data.schema.resource)) {
      const result = await this.client.request("schema", data.schema.resource);
      if (result.status !== "ready") {
        this.say(result.status, "Schema: " + result.status);
        return;
      }
      this.schemaVersion = { reference: data.schema.resource, version: result.snapshot.version };
      return { schema: declarativeFormSchema(result.snapshot.value) };
    }
    return this.resolveSchema?.(
      { id: String(data.schema.id), version: Number(data.schema.version) },
      this.host.document
    );
  }
  async refresh(): Promise<void> {
    if (!this.current() || this.busy || this.validating) return;
    if (this.pending) {
      this.say("draft", "Submit or discard the local draft before refreshing");
      return;
    }
    const data = this.latest.record.payload;
    if (!payload(data)) return;
    const generation = ++this.generation;
    this.loaded = false;
    this.schemaVersion = undefined;
    this.busy = true;
    this.say("loading");
    this.sync();
    try {
      const registered = this.context ? await this.schema() : undefined;
      if (!this.current() || generation !== this.generation) return;
      if (
        this.context &&
        (!registered ||
          registered.schema.diagnostics.length ||
          registered.schema.root.kind !== "object")
      ) {
        if (registered || this.state === "loading")
          this.say("unavailable", "Schema unavailable or unsupported");
        return;
      }
      const result = await this.client.request("read", data.resource);
      if (!this.current() || generation !== this.generation) return;
      if (result.status !== "ready") {
        this.say(result.status, result.status === "failed" ? result.message : result.status);
        return;
      }
      if (this.context && !formObject(result.snapshot.value))
        throw new Error("External form requires an object");
      this.remote = result.snapshot;
      this.loaded = true;
      if (this.context && registered) {
        this.form?.dispose();
        this.form = new FormControl(
          registered.schema,
          {
            key          : "external-control",
            read: () =>
              this.remote && this.current()
                ? { revision: this.remote.version, values: this.remote.value }
                : undefined,
            subscribe    : () => () => {},
            prepare: () => {
              throw new Error("External answers require explicit submission");
            },
            commit       : async () => ({ status: "refused", reason: "Use Submit answers" }),
            registerDraft: (controller) => {
              this.formDraft = controller;
              return () => {};
            },
            canWrite     : () => this.current() && this.loaded,
          },
          this.context,
          registered.presentation,
          { commit: false, discard: false }
        );
        this.body.replaceChildren(this.form.element);
      } else {
        const text = document.createElement("pre");
        text.textContent = JSON.stringify(this.remote.value, null, 2);
        this.body.replaceChildren(text);
      }
      this.say("ready", "Loaded version " + this.remote.version);
    } catch (error) {
      if (this.current()) this.say("failed", String(error));
    } finally {
      if (generation === this.generation) {
        this.busy = false;
        this.sync();
      }
    }
  }
  async submit(): Promise<void> {
    const data = this.latest.record.payload;
    if (
      !this.current() ||
      this.readOnly ||
      this.busy ||
      this.validating ||
      !this.loaded ||
      !this.form ||
      !this.remote ||
      !payload(data)
    )
      return;
    this.validating = true;
    this.say("validating");
    this.sync();
    const form = this.form;
    const remote = this.remote;
    const generation = this.generation;
    try {
      const values = form.submissionValues();
      const validated = await form.validateSubmission();
      if (!validated.success) {
        this.say("invalid", "Resolve validation errors before submission");
        return;
      }
      if (
        !this.current() ||
        this.readOnly ||
        this.busy ||
        this.form !== form ||
        this.remote !== remote ||
        generation !== this.generation ||
        JSON.stringify(values) !== JSON.stringify(form.submissionValues())
      )
        return;
      const output = widgetJson(validated.output);
      this.busy = true;
      this.say("submitting");
      this.sync();
      const result = await this.client.request("submit", data.resource, {
        expectedVersion: remote.version,
        values,
        output,
        schema: this.schemaVersion,
      });
      if (!this.current() || generation !== this.generation) return;
      if (result.status === "ready") {
        if (!formObject(result.snapshot.value)) throw new Error("External form requires an object");
        this.remote = result.snapshot;
        form.discard();
        this.say("success", "Submitted version " + this.remote.version);
      } else if (result.status === "conflict")
        this.say(
          "conflict",
          "Resource changed; draft retained. Discard the draft and refresh to load the latest version."
        );
      else
        this.say(
          result.status,
          result.status === "failed"
            ? result.message
            : result.status === "cancelled"
              ? "Cancelled; remote outcome may be unknown. Refresh before retrying."
              : result.status
        );
    } catch (error) {
      if (this.current()) this.say("failed", String(error));
    } finally {
      this.validating = false;
      if (generation === this.generation) {
        this.busy = false;
        this.sync();
      }
    }
  }
  async saveSnapshot(): Promise<void> {
    const data = this.latest.record.payload;
    if (
      !this.current() ||
      this.readOnly ||
      this.busy ||
      this.validating ||
      !this.loaded ||
      !this.remote ||
      !payload(data)
    )
      return;
    if (this.pending) {
      this.say("draft", "Submit or discard answers before saving a resource snapshot");
      return;
    }
    const saved = widgetJson(this.remote);
    if (JSON.stringify(data.snapshot) === JSON.stringify(saved)) {
      this.say("snapshot-saved");
      return;
    }
    this.busy = true;
    this.sync();
    try {
      const result = await this.host.update(this.latest, { ...data, snapshot: saved } as JsonValue);
      if (this.current()) this.say(result.status === "applied" ? "snapshot-saved" : result.status);
    } finally {
      this.busy = false;
      this.sync();
    }
  }
  discard(): void {
    if (this.busy && !this.disposed) return;
    this.busy = false;
    this.form?.discard();
    this.say(this.remote ? "ready" : "idle");
    this.sync();
  }
  update(state: WidgetState): void {
    const next = state.value as WidgetSnapshot;
    if (JSON.stringify(next.record) !== JSON.stringify(this.latest.record)) this.client.cancel();
    if (state.readOnly && !this.readOnly && this.state === "submitting") this.client.cancel();
    this.latest = next;
    this.readOnly = state.readOnly;
    if (!this.loaded && !this.form) this.showSavedSnapshot();
    if (!this.current()) {
      this.client.cancel();
      this.say("unavailable", "Resource binding changed; rebind this view");
    }
    this.sync();
  }
  focus(last = false): void {
    if (this.form) this.form.focus(last);
    else this.buttons[0]?.focus();
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.generation++;
    this.client.dispose();
    this.form?.dispose();
    this.unregister();
  }
}

function plugin(
  services: ResourceServices,
  context?: IContextBase,
  resolveSchema?: ResolveSchema
): WidgetPlugin {
  return {
    type    : context ? "pathux.external-form" : "pathux.external-view",
    version : 1,
    label   : context ? "External form" : "External data",
    validate: (data) => payload(data) && (!context || schemaReference(data.schema)),
    canMount(record, document) {
      const data = record.payload;
      if (!payload(data) || !resourceAllowed(services, { record, document }, "read", data.resource))
        return false;
      return (
        !context ||
        !data.schema ||
        !formObject(data.schema) ||
        !resourceReference(data.schema.resource) ||
        resourceAllowed(services, { record, document }, "schema", data.schema.resource)
      );
    },
    create: (initial, host) =>
      new ExternalFormView(initial, host, services, context, resolveSchema),
  };
}
/** Creates an opt-in external form; schemas come from a trusted catalog or declarative resource. */
export function createExternalFormPlugin(
  context: IContextBase,
  services: ResourceServices,
  resolveSchema: ResolveSchema
): WidgetPlugin {
  return plugin(services, context, resolveSchema);
}
/** Creates a read-only JSON view with explicit refresh and document snapshot actions. */
export function createExternalViewPlugin(services: ResourceServices): WidgetPlugin {
  return plugin(services);
}
