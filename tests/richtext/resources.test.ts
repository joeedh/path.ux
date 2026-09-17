import { describe, expect, test, vi } from "vitest";
import { WidgetResources, resourceAllowed } from "../../scripts/widgets/richtext/resource";
import type {
  ResourceRequest,
  ResourceResponse,
  ResourceServices,
} from "../../scripts/widgets/richtext/resource";
import type { PluginViewContext, WidgetRecord } from "../../scripts/widgets/richtext/plugin_types";
import { ToolStack } from "../../scripts/path-controller/toolsys/toolstack";
import { DocumentSession } from "../../scripts/widgets/richtext/context";
import { DocumentWidgetHost, WidgetRegistry } from "../../scripts/widgets/richtext/plugins";
import { MarkdownProvider } from "../../scripts/widgets/richtext/providers/markdown_provider";
import { markdownDocFromText } from "../../scripts/widgets/richtext/providers/markdown_parse";
import { encodeWidgetFence } from "../../scripts/widgets/richtext/widget_codec";

const ref = { service: "memory", key: "record" };
function setup() {
  let record: WidgetRecord = {
    id     : "one",
    type   : "example.remote",
    version: 1,
    payload: { resource: ref },
  };
  const abort = new AbortController();
  let current = true;
  let external = true;
  const host: PluginViewContext = {
    signal       : abort.signal,
    document     : { base: "allowed" },
    isCurrent    : () => current,
    update       : async () => ({ status: "refused", reason: "unused" }),
    prepareUpdate: () => ({ resolve: () => undefined }),
    registerDraft: () => () => {},
    async external(_action, run) {
      return external
        ? { status: "complete", value: await run(abort.signal) }
        : { status: "refused" };
    },
  };
  const request = vi.fn<(request: ResourceRequest) => Promise<ResourceResponse>>(async () => ({
    status  : "ready",
    snapshot: { version: "v1", value: { name: "Ada" } },
  }));
  const service = { resolve: () => "memory://allowed/record", request };
  const authorize = vi.fn<ResourceServices["authorize"]>((access) =>
    access.destination.startsWith("memory://allowed/")
  );
  const services = { services: new Map([["memory", service]]), authorize };
  const client = new WidgetResources(host, services, () => record);
  return {
    client,
    host,
    service,
    services,
    request,
    authorize,
    abort,
    setCurrent  : (value: boolean) => (current = value),
    denyExternal: () => (external = false),
    replace     : () => (record = { ...record, payload: { resource: { ...ref, key: "other" } } }),
  };
}

describe("scoped resource services", () => {
  test("reads through a host service with immutable bounded data and no credential fields", async () => {
    const { client, request } = setup();
    expect(await client.request("read", ref)).toEqual({
      status  : "ready",
      snapshot: { version: "v1", value: { name: "Ada" } },
    });
    expect(request.mock.calls[0][0]).toMatchObject({
      action     : "read",
      destination: "memory://allowed/record",
      document   : { base: "allowed" },
      reference  : ref,
    });
    expect(Object.isFrozen(request.mock.calls[0][0].record)).toBe(true);
    expect(Object.isFrozen(request.mock.calls[0][0].reference)).toBe(true);
  });
  test("missing services, invalid references and denied destinations start no request", async () => {
    const { client, request, authorize } = setup();
    expect(await client.request("read", { ...ref, service: "unknown" })).toEqual({
      status: "refused",
    });
    expect(await client.request("read", { ...ref, key: "" })).toEqual({ status: "refused" });
    authorize.mockReturnValue(false);
    expect(await client.request("read", ref)).toEqual({ status: "refused" });
    expect(request).not.toHaveBeenCalled();
  });
  test("truthy non-boolean policy results do not grant access", async () => {
    const { client, request, authorize } = setup();
    authorize.mockReturnValue("yes" as never);
    expect(await client.request("read", ref)).toEqual({ status: "refused" });
    expect(request).not.toHaveBeenCalled();
  });
  test("widget external authorization precedes transport work", async () => {
    const { client, denyExternal, request } = setup();
    denyExternal();
    expect(await client.request("schema", ref)).toEqual({ status: "refused" });
    expect(request).not.toHaveBeenCalled();
  });
  test("each redirect is authorized before its destination is contacted", async () => {
    const { client, request, authorize } = setup();
    request.mockResolvedValueOnce({ status: "redirect", destination: "memory://blocked/private" });
    expect(await client.request("read", ref)).toEqual({ status: "refused" });
    expect(request).toHaveBeenCalledTimes(1);
    expect(authorize.mock.calls.some(([r]) => r.destination === "memory://blocked/private")).toBe(
      true
    );
  });
  test("permitted redirects retain submission identity and expected version", async () => {
    const { client, request } = setup();
    request.mockResolvedValueOnce({ status: "redirect", destination: "memory://allowed/next" });
    expect(
      await client.request("submit", ref, {
        expectedVersion: "v1",
        values         : { name: "Ada" },
        output         : { name: "ADA" },
      })
    ).toMatchObject({ status: "ready" });
    const first = request.mock.calls[0][0].submission!;
    expect(first.values).toEqual({ name: "Ada" });
    expect(first.output).toEqual({ name: "ADA" });
    expect(request.mock.calls[1][0].submission).toEqual(first);
    expect(first.requestId).not.toBe("");
  });
  test.each(["loop", "chain"])("redirect %s is bounded", async (mode) => {
    const { client, request } = setup();
    let i = 0;
    request.mockImplementation(async () => ({
      status     : "redirect",
      destination: "memory://allowed/" + (mode === "loop" ? "record" : ++i),
    }));
    expect(await client.request("read", ref)).toMatchObject({
      status : "failed",
      message: expect.stringContaining(mode === "loop" ? "loop" : "redirects"),
    });
    expect(request.mock.calls.length).toBeLessThanOrEqual(6);
  });
  test("cancellation settles even when the transport ignores abort", async () => {
    const { client, request } = setup();
    let finish!: (value: ResourceResponse) => void;
    request.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    const pending = client.request("read", ref);
    client.cancel();
    expect(await pending).toEqual({ status: "cancelled" });
    expect(request.mock.calls[0][0].signal.aborted).toBe(true);
    finish({ status: "ready", snapshot: { version: "late", value: "ignored" } });
  });
  test.each(["host", "dispose", "record", "policy", "service"])(
    "%s changes prevent accepting a late response",
    async (kind) => {
      const state = setup();
      let finish!: (value: ResourceResponse) => void;
      state.request.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
      const pending = state.client.request("read", ref);
      if (kind === "host") state.abort.abort();
      if (kind === "dispose") state.client.dispose();
      if (kind === "record") state.replace();
      if (kind === "policy") state.authorize.mockReturnValue(false);
      if (kind === "service") state.services.services.delete("memory");
      finish({ status: "ready", snapshot: { version: "late", value: "ignored" } });
      expect(["cancelled", "refused"]).toContain((await pending).status);
    }
  );
  test("conflicts expose the current version without retrying the write", async () => {
    const { client, request } = setup();
    request.mockResolvedValue({
      status : "conflict",
      current: { version: "v2", value: { name: "Other" } },
    });
    expect(
      await client.request("submit", ref, { expectedVersion: "v1", values: {}, output: {} })
    ).toEqual({ status: "conflict", current: { version: "v2", value: { name: "Other" } } });
    expect(request).toHaveBeenCalledTimes(1);
  });
  test.each([
    { version: "", value: {} },
    { version: "v1", value: Infinity },
    { version: "v1", value: JSON.parse('{"__proto__":{}}') },
  ])("malformed service snapshots are failures", async (snapshot) => {
    const { client, request } = setup();
    request.mockResolvedValue({ status: "ready", snapshot });
    expect(await client.request("read", ref)).toMatchObject({ status: "failed" });
  });
  test("service exceptions and offline results remain explicit failures", async () => {
    const { client, request } = setup();
    request.mockRejectedValueOnce(new Error("offline"));
    expect(await client.request("read", ref)).toMatchObject({
      status : "failed",
      message: expect.stringContaining("offline"),
    });
    request.mockResolvedValue({ status: "failed", message: "offline" });
    expect(await client.request("read", ref)).toEqual({ status: "failed", message: "offline" });
  });
  test("authorization exceptions and invalid destinations fail closed", () => {
    const { services, service, authorize, host } = setup();
    const scope = {
      document: host.document,
      record  : { id: "one", type: "example.remote", version: 1, payload: {} },
    };
    authorize.mockImplementation(() => {
      throw new Error("denied");
    });
    expect(resourceAllowed(services, scope, "read", ref)).toBe(false);
    authorize.mockReturnValue(true);
    service.resolve = () => "\nunsafe";
    expect(resourceAllowed(services, scope, "read", ref)).toBe(false);
  });
  test("mount preflight refuses before factories and is reevaluated before construction", () => {
    const record = { id: "one", type: "example.remote", version: 1, payload: {} };
    const provider = new MarkdownProvider();
    const session = new DocumentSession(
      markdownDocFromText(encodeWidgetFence(record)),
      provider,
      new ToolStack()
    );
    const registry = new WidgetRegistry();
    let allowed = false;
    const create = vi.fn(() => ({ element: document.createElement("div"), dispose() {} }));
    registry.register({
      type    : record.type,
      version : 1,
      label   : "Remote",
      validate: () => true,
      canMount: () => allowed,
      create,
    });
    const host = new DocumentWidgetHost(session, registry, { document: {}, authorize: () => true });
    const block = provider.widgets.read(session.doc, "one")!.block;
    expect(host.resolve(block, {} as never)!.allowed).toBe(false);
    allowed = true;
    const descriptor = host.resolve(block, {} as never)!;
    expect(descriptor.allowed).toBe(true);
    allowed = false;
    expect(() => descriptor.create({} as never)).toThrow("refused");
    expect(create).not.toHaveBeenCalled();
    session.dispose();
  });
});
