import type { WidgetPlugin, WidgetSnapshot } from "../../../scripts/widgets/richtext/plugins";

/** An application-owned note field with local drafts and guarded document commits. */
export const notePlugin: WidgetPlugin = {
  type   : "example.note",
  version: 1,
  label  : "Note",
  validate(payload) {
    return (
      payload !== null &&
      typeof payload === "object" &&
      !Array.isArray(payload) &&
      "text" in payload &&
      typeof payload.text === "string"
    );
  },
  create(initial, context) {
    const element = document.createElement("div");
    const shadow = element.attachShadow({ mode: "open" });
    const input = document.createElement("input");
    input.setAttribute("aria-label", "Note text");
    const accept = document.createElement("button");
    accept.textContent = "Apply note";
    const status = document.createElement("span");
    status.setAttribute("role", "status");
    shadow.append(input, accept, status);
    let base = initial;
    let latest = initial;
    let dirty = false;
    let version = 0;
    const text = (snapshot: WidgetSnapshot) => (snapshot.record.payload as { text: string }).text;
    input.value = text(initial);
    const payload = () => ({ ...(base.record.payload as { text: string }), text: input.value });
    const committed = () => {
      dirty = false;
      base = latest;
      input.value = text(latest);
      status.textContent = "Saved in document";
    };
    input.addEventListener("input", () => {
      dirty = true;
      version++;
      status.textContent = "Draft";
    });
    accept.addEventListener("pointerdown", (event) => event.preventDefault());
    accept.addEventListener("click", async () => {
      if (!dirty) return;
      const expectedVersion = version;
      const result = await context.update(base, payload());
      if (result.status === "applied" && version === expectedVersion) committed();
      else status.textContent = "Draft retained; refresh or resolve the conflict";
    });
    context.registerDraft({
      key    : "text",
      pending: () => dirty,
      version: () => version,
      recover: () => input.value,
      discard: () => {
        dirty = false;
        base = latest;
        input.value = text(latest);
        version++;
      },
      committed,
      prepare: () => ({ status: "ready", command: context.prepareUpdate(base, payload()) }),
    });
    return {
      element,
      update(state) {
        latest = state.value as WidgetSnapshot;
        input.readOnly = state.readOnly;
        accept.disabled = state.readOnly;
        if (!dirty) {
          base = latest;
          input.value = text(latest);
        } else if (base.revision !== latest.revision)
          status.textContent = "Saved value changed; draft retained";
      },
      dispose() {},
    };
  },
};
