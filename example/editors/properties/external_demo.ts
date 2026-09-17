import { UIBase, RichTextEditor, DocumentSession, ToolStack } from "../../../scripts/pathux";
import type { IContextBase } from "../../../scripts/core/context_base";
import type { JsonValue } from "../../../scripts/widgets/richtext/provider";
import { MarkdownProvider, markdownText } from "../../../scripts/widgets/richtext/markdown";
import { markdownDocFromText } from "../../../scripts/widgets/richtext/providers/markdown_parse";
import { DocumentWidgetHost, WidgetRegistry } from "../../../scripts/widgets/richtext/plugins";
import {
  createExternalFormPlugin,
  createExternalViewPlugin,
} from "../../../scripts/widgets/richtext/form_external";
import type {
  ResourceAccess,
  ResourceRequest,
  ResourceResponse,
  ResourceService,
  ResourceSnapshot,
} from "../../../scripts/widgets/richtext/resource";
import { declarativeFormSchema } from "../../../scripts/widgets/richtext/form_declarative";
import { widgetJson, encodeWidgetFence } from "../../../scripts/widgets/richtext/widget_codec";

const schemaDescription = {
  format : "pathux.form-schema",
  version: 1,
  root: {
    kind  : "object",
    fields: {
      name : { kind: "string", minLength: 1 },
      count: { kind: "number", integer: true, min: 0 },
    },
  },
};

/** Simulates host-owned transport, optimistic concurrency, redirects and cancellation locally. */
export function createExternalDemo(parent: HTMLElement, context: IContextBase) {
  let schemaVersion = 1;
  let remoteSchema: JsonValue = schemaDescription;
  let remote: ResourceSnapshot = { version: "1", value: { name: "Ada", count: 1 } };
  let offline = false;
  let delayed = false;
  let allowResources = true;
  let allowSubmit = true;
  let allowHost = true;
  let base = "allowed";
  let writes = 0;
  const redirects = new Map<string, string>();
  const requests: ResourceRequest[] = [];
  const releases: (() => void)[] = [];
  const service: ResourceService = {
    resolve: (ref, scope) => `memory://${(scope.document as { base: string }).base}/${ref.key}`,
    async request(request): Promise<ResourceResponse> {
      requests.push(request);
      if (delayed) await new Promise<void>((resolve) => releases.push(resolve));
      if (request.signal.aborted) return { status: "cancelled" };
      if (offline) return { status: "failed", message: "Simulated offline service" };
      const redirect = redirects.get(request.destination);
      if (redirect) return { status: "redirect", destination: redirect };
      if (request.action === "schema")
        return {
          status  : "ready",
          snapshot: { version: `schema-${schemaVersion}`, value: remoteSchema },
        };
      if (request.action === "submit") {
        if (
          request.submission?.expectedVersion !== remote.version ||
          (request.submission.schema &&
            request.submission.schema.version !== `schema-${schemaVersion}`)
        )
          return { status: "conflict", current: remote };
        remote = {
          version: String(Number(remote.version) + 1),
          value  : widgetJson(request.submission.values),
        };
        writes++;
      }
      return { status: "ready", snapshot: remote };
    },
  };
  const services = {
    services : new Map([["memory", service]]),
    authorize: (request: ResourceAccess) =>
      allowResources &&
      request.destination.startsWith("memory://allowed/") &&
      (request.action !== "submit" || allowSubmit),
  };
  const provider = new MarkdownProvider();
  const stack = new ToolStack();
  const initial = [
    encodeWidgetFence({
      id     : "form",
      type   : "pathux.external-form",
      version: 1,
      payload: {
        resource: { service: "memory", key: "customer" },
        schema  : { id: "intake", version: 1 },
      },
    }),
    encodeWidgetFence({
      id     : "view",
      type   : "pathux.external-view",
      version: 1,
      payload: { resource: { service: "memory", key: "customer" } },
    }),
  ].join("\n\n");
  const session = new DocumentSession(markdownDocFromText(initial), provider, stack);
  const registry = new WidgetRegistry();
  registry.register(
    createExternalFormPlugin(context, services, (ref) =>
      ref.id === "intake" && ref.version === 1
        ? { schema: declarativeFormSchema(schemaDescription) }
        : undefined
    )
  );
  registry.register(createExternalViewPlugin(services));
  const options = () => ({ document: { base }, authorize: () => allowHost });
  const host = new DocumentWidgetHost(session, registry, options());
  let signature = "";
  const bindings = () =>
    JSON.stringify(
      ["form", "view"].map((id) => {
        const data = provider.widgets.read(session.doc, id)?.record.payload as
          { resource?: JsonValue; schema?: JsonValue } | undefined;
        return data ? [data.resource, data.schema ?? null] : null;
      })
    );
  signature = bindings();
  const unsubscribe = session.onChange(() => {
    const next = bindings();
    if (next !== signature) {
      signature = next;
      host.invalidate(options());
    }
  });
  const editors = [0, 1].map((index) => {
    const section = document.createElement("section");
    section.id = `external${index}`;
    const heading = document.createElement("h3");
    heading.textContent = `External service, view ${index + 1}`;
    const editor = UIBase.constructElement<RichTextEditor<IContextBase, typeof session.doc>>(
      "rich-text-x",
      context
    );
    editor.style.width = "600px";
    section.append(heading, editor);
    parent.append(section);
    editor.session = session;
    return editor;
  });
  const button = (label: string, action: () => unknown) => {
    const button = document.createElement("button");
    button.textContent = label;
    button.addEventListener("click", action);
    parent.append(button);
  };
  button("Toggle simulated offline", () => (offline = !offline));
  button(
    "Simulate remote change",
    () =>
      (remote = {
        version: String(Number(remote.version) + 1),
        value  : { name: "Other author", count: 2 },
      })
  );
  button("Undo document snapshot", () => void stack.undo());
  button("Redo document snapshot", () => void stack.redo());
  return {
    session,
    provider,
    stack,
    host,
    editors,
    requests,
    initial,
    source        : () => markdownText(session.doc),
    remote        : () => remote,
    writes        : () => writes,
    setSchema: (value: JsonValue) => {
      remoteSchema = value;
      schemaVersion++;
    },
    setOffline    : (value: boolean) => (offline = value),
    setDelayed    : (value: boolean) => (delayed = value),
    release: () => {
      delayed = false;
      for (const release of releases.splice(0)) release();
    },
    externalChange: (value: JsonValue) =>
      (remote = { version: String(Number(remote.version) + 1), value: widgetJson(value) }),
    redirect      : (from: string, to: string) => redirects.set(from, to),
    setResourcePolicy(value: boolean) {
      allowResources = value;
      host.invalidate(options());
    },
    setSubmitPolicy(value: boolean) {
      allowSubmit = value;
      host.invalidate(options());
    },
    setHostPolicy(value: boolean) {
      allowHost = value;
      host.invalidate(options());
    },
    rebind(value: string) {
      base = value;
      host.invalidate(options());
    },
    async remoteSchema() {
      const expected = provider.widgets.read(session.doc, "form")!;
      return host.update(
        expected,
        {
          resource: { service: "memory", key: "customer" },
          schema  : { resource: { service: "memory", key: "schema" } },
        },
        context
      );
    },
    dispose() {
      unsubscribe();
      for (const editor of editors) editor.remove();
      session.dispose();
    },
  };
}
