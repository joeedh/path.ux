import type { JsonValue } from "./provider";
import type { PluginViewContext, WidgetRecord } from "./plugin_types";
import { widgetJson, widgetRecord } from "./widget_codec";
import { formObject } from "./form_schema";

export interface ResourceReference {
  readonly service: string;
  readonly key: string;
}
export interface ResourceSnapshot {
  readonly version: string;
  readonly value: JsonValue;
}
export type ResourceAction = "read" | "schema" | "submit";
export interface ResourceScope {
  readonly document: JsonValue;
  readonly record: WidgetRecord;
}
export interface ResourceAccess extends ResourceScope {
  readonly action: ResourceAction;
  readonly reference: ResourceReference;
  readonly destination: string;
}
export interface ResourceRequest extends ResourceAccess {
  readonly signal: AbortSignal;
  readonly submission?: {
    readonly expectedVersion: string;
    readonly values: JsonValue;
    readonly output: JsonValue;
    readonly requestId: string;
    readonly schema?: { readonly reference: ResourceReference; readonly version: string };
  };
}
export type ResourceResult =
  | { readonly status: "ready"; readonly snapshot: ResourceSnapshot }
  | { readonly status: "conflict"; readonly current?: ResourceSnapshot }
  | { readonly status: "failed"; readonly message: string }
  | { readonly status: "refused" | "cancelled" };
export type ResourceResponse =
  ResourceResult | { readonly status: "redirect"; readonly destination: string };

/** Owns transport and credentials; redirects must be returned before contacting their destination. */
export interface ResourceService {
  resolve(reference: ResourceReference, scope: ResourceScope): string;
  request(request: ResourceRequest): Promise<ResourceResponse>;
}
export interface ResourceServices {
  readonly services: ReadonlyMap<string, ResourceService>;
  authorize(access: ResourceAccess): boolean;
}

export function resourceReference(value: JsonValue): value is { service: string; key: string } {
  return (
    formObject(value) &&
    Object.keys(value).sort().join(",") === "key,service" &&
    typeof value.service === "string" &&
    /^[a-zA-Z][a-zA-Z0-9._-]{0,127}$/.test(value.service) &&
    typeof value.key === "string" &&
    value.key.length > 0 &&
    value.key.length <= 2048
  );
}
function destination(value: string): string {
  if (
    typeof value !== "string" ||
    !value ||
    value.length > 4096 ||
    [...value].some((character) => character.charCodeAt(0) < 32)
  )
    throw new Error("Invalid resource destination");
  return value;
}
function version(value: unknown): string {
  if (typeof value !== "string" || !value || value.length > 1024)
    throw new Error("Invalid resource version");
  return value;
}
function snapshot(value: ResourceSnapshot): ResourceSnapshot {
  const copy = widgetJson(value);
  if (!formObject(copy) || !Object.hasOwn(copy, "value"))
    throw new Error("Invalid resource snapshot");
  return Object.freeze({ version: version(copy.version), value: copy.value });
}

function authorize(services: ResourceServices, access: ResourceAccess): boolean {
  const allowed: unknown = services.authorize(access);
  return allowed === true;
}

/** Preflights reference resolution and destination policy without starting transport work. */
export function resourceAllowed(
  services: ResourceServices,
  scope: ResourceScope,
  action: ResourceAction,
  reference: ResourceReference
): boolean {
  try {
    const ref = widgetJson(reference);
    if (!resourceReference(ref)) return false;
    const service = services.services.get(ref.service);
    return (
      !!service &&
      authorize(services, {
        ...scope,
        action,
        reference  : ref,
        destination: destination(service.resolve(ref, scope)),
      })
    );
  } catch {
    return false;
  }
}

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener("abort", abort);
      reject(new Error("Resource request cancelled"));
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

/** Routes explicitly supplied services through widget policy and per-destination authorization. */
export class WidgetResources {
  private requests = new Set<AbortController>();
  private disposed = false;
  constructor(
    private host: PluginViewContext,
    private services: ResourceServices,
    private record: () => WidgetRecord
  ) {}
  cancel(): void {
    for (const request of this.requests) request.abort();
  }
  dispose(): void {
    this.disposed = true;
    this.cancel();
  }
  allowed(action: ResourceAction, reference: ResourceReference): boolean {
    return (
      !this.disposed &&
      !this.host.signal.aborted &&
      this.host.isCurrent() &&
      resourceAllowed(
        this.services,
        { document: this.host.document, record: this.record() },
        action,
        reference
      )
    );
  }
  async request(
    action: ResourceAction,
    reference: ResourceReference,
    submission?: Omit<NonNullable<ResourceRequest["submission"]>, "requestId">
  ): Promise<ResourceResult> {
    if (!this.allowed(action, reference) || (action === "submit") !== !!submission)
      return { status: "refused" };
    const controller = new AbortController();
    this.requests.add(controller);
    const abort = () => controller.abort();
    this.host.signal.addEventListener("abort", abort, { once: true });
    if (this.host.signal.aborted) abort();
    try {
      const record = widgetRecord(this.record());
      const signature = JSON.stringify(record);
      const ref = widgetJson(reference);
      if (!resourceReference(ref)) return { status: "refused" };
      const service = this.services.services.get(ref.service)!;
      const scope = { document: this.host.document, record };
      const schema = submission?.schema;
      const schemaReference = schema ? widgetJson(schema.reference) : undefined;
      if (schema && (!schemaReference || !resourceReference(schemaReference)))
        throw new Error("Invalid schema reference");
      const values = submission
        ? {
            expectedVersion: version(submission.expectedVersion),
            schema:
              schema && schemaReference && resourceReference(schemaReference)
                ? { reference: schemaReference, version: version(schema.version) }
                : undefined,
            values         : widgetJson(submission.values),
            output         : widgetJson(submission.output),
            requestId      : crypto.randomUUID(),
          }
        : undefined;
      const current = () =>
        !this.disposed &&
        !controller.signal.aborted &&
        this.host.isCurrent() &&
        JSON.stringify(this.record()) === signature &&
        this.services.services.get(ref.service) === service;
      const result = await this.host.external(`resource:${action}`, async () => {
        let target = destination(service.resolve(ref, scope));
        const visited = new Set<string>();
        for (let redirects = 0; redirects <= 5; redirects++) {
          const access = { ...scope, reference: ref, action, destination: target };
          if (!current() || !authorize(this.services, access))
            return { status: "refused" } as const;
          if (visited.has(target)) throw new Error("Resource redirect loop");
          visited.add(target);
          const response = await abortable(
            service.request({ ...access, signal: controller.signal, submission: values }),
            controller.signal
          );
          if (!current() || !authorize(this.services, access))
            return { status: "refused" } as const;
          if (response.status === "redirect") {
            target = destination(response.destination);
            continue;
          }
          if (response.status === "ready")
            return { status: "ready", snapshot: snapshot(response.snapshot) } as const;
          if (response.status === "conflict")
            return response.current
              ? ({ status: "conflict", current: snapshot(response.current) } as const)
              : ({ status: "conflict" } as const);
          if (response.status === "failed")
            return { status: "failed", message: String(response.message).slice(0, 2048) } as const;
          if (response.status === "refused" || response.status === "cancelled")
            return { status: response.status };
          throw new Error("Invalid resource response");
        }
        throw new Error("Too many resource redirects");
      });
      if (controller.signal.aborted) return { status: "cancelled" };
      if (result.status === "complete") return result.value;
      return result.status === "failed"
        ? { status: "failed", message: String(result.error).slice(0, 2048) }
        : { status: "refused" };
    } catch (error) {
      return controller.signal.aborted
        ? { status: "cancelled" }
        : { status: "failed", message: String(error).slice(0, 2048) };
    } finally {
      this.requests.delete(controller);
      this.host.signal.removeEventListener("abort", abort);
    }
  }
}
