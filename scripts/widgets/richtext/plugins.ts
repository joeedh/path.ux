import { newBlockId } from "./provider";
import type { BlockId, EditOp, JsonValue, ProviderContext } from "./provider";
import type { IContextBase } from "../../core/context_base";
import type { DocumentSession } from "./context";
import type { CommandResult, DocumentCommand, WidgetContext, WidgetDescriptor } from "./widget";
import type {
  ExternalActionResult,
  PluginHostOptions,
  PluginViewContext,
  SessionWidgetHost,
  WidgetAction,
  WidgetPlugin,
  WidgetRecord,
  WidgetSnapshot,
} from "./plugin_types";
import { widgetJson, widgetRecord } from "./widget_codec";

export type * from "./plugin_types";
export { WIDGET_CLIPBOARD_MIME } from "./widget_codec";

/** Holds application-provided implementations and notifies attached document hosts. */
export class WidgetRegistry {
  private plugins = new Map<string, WidgetPlugin>();
  private listeners = new Set<() => void>();
  register(plugin: WidgetPlugin): () => void {
    widgetRecord({ id: "registration", type: plugin.type, version: plugin.version, payload: null });
    if (this.plugins.has(plugin.type)) throw new Error(`Duplicate widget type: ${plugin.type}`);
    const entry: WidgetPlugin = Object.freeze({
      type    : plugin.type,
      version : plugin.version,
      label   : plugin.label,
      validate: plugin.validate.bind(plugin),
      create  : plugin.create.bind(plugin),
      migrate : plugin.migrate?.bind(plugin),
    });
    this.plugins.set(entry.type, entry);
    this.changed();
    return () => {
      if (this.plugins.get(entry.type) !== entry) return;
      this.plugins.delete(entry.type);
      this.changed();
    };
  }
  get(type: string): WidgetPlugin | undefined {
    return this.plugins.get(type);
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private changed() {
    for (const listener of [...this.listeners]) listener();
  }
}

/** Authorizes plugin views and initial commands for one retained document session. */
export class DocumentWidgetHost<Doc> implements SessionWidgetHost {
  private options: PluginHostOptions;
  private epoch = 0;
  private closed = false;
  private unsubscribe: () => void;

  constructor(
    readonly session: DocumentSession<Doc>,
    readonly registry: WidgetRegistry,
    options: PluginHostOptions
  ) {
    if (session.disposed) throw new Error("The session is disposed");
    if (session.widgetHost) throw new Error("The session already has a widget host");
    this.options = { ...options, document: widgetJson(options.document) };
    this.unsubscribe = registry.subscribe(() => this.invalidate());
    session.widgetHost = this;
    session.invalidateWidgets();
  }

  /** Rebinds document metadata or policy and cancels every old view generation. */
  invalidate(options: PluginHostOptions = this.options): void {
    if (this.closed) return;
    this.options = { ...options, document: widgetJson(options.document) };
    this.epoch++;
    this.session.invalidateWidgets();
  }

  private allowed(action: WidgetAction, record: WidgetRecord, externalAction?: string): boolean {
    if (this.closed || this.session.disposed || this.session.widgetHost !== this) return false;
    try {
      const decision: unknown = this.options.authorize({
        action,
        record,
        document: this.options.document,
        externalAction,
      });
      return decision === true;
    } catch {
      return false;
    }
  }

  private supported(record: WidgetRecord, plugin = this.registry.get(record.type)): boolean {
    try {
      if (plugin?.version !== record.version) return false;
      const valid: unknown = plugin.validate(record.payload);
      return valid === true;
    } catch {
      return false;
    }
  }

  private current(expected: WidgetSnapshot): WidgetSnapshot | undefined {
    const found = this.session.provider.widgets?.read(this.session.doc, expected.record.id);
    return found?.revision === expected.revision &&
      found.block === expected.block &&
      JSON.stringify(found.record) === JSON.stringify(expected.record)
      ? found
      : undefined;
  }

  private capture(snapshot: WidgetSnapshot): WidgetSnapshot {
    return Object.freeze({
      placement: "block",
      block    : snapshot.block,
      revision : snapshot.revision,
      record   : widgetRecord(snapshot.record),
    });
  }

  prepareUpdate(expected: WidgetSnapshot, payload: JsonValue): DocumentCommand {
    expected = this.capture(expected);
    const next = widgetRecord({ ...expected.record, payload });
    const epoch = this.epoch;
    const plugin = this.registry.get(next.type);
    return {
      authorize: () =>
        epoch === this.epoch &&
        this.registry.get(next.type) === plugin &&
        this.allowed("edit", expected.record) &&
        this.allowed("edit", next) &&
        this.supported(next, plugin),
      resolve: () => {
        const current = this.current(expected);
        return current
          ? this.session.provider.widgets?.update(this.session.doc, current, next)
          : undefined;
      },
    };
  }

  update(
    expected: WidgetSnapshot,
    payload: JsonValue,
    context: IContextBase
  ): Promise<CommandResult> {
    try {
      return this.session.command(this.prepareUpdate(expected, payload), context);
    } catch (error) {
      return Promise.resolve({ status: "failed", error });
    }
  }

  insert(
    record: WidgetRecord,
    after: BlockId | null,
    context: IContextBase
  ): Promise<CommandResult> {
    try {
      const next = widgetRecord(record);
      const block = newBlockId();
      const epoch = this.epoch;
      return this.session.command(
        {
          authorize: () =>
            epoch === this.epoch && this.allowed("insert", next) && this.supported(next),
          resolve: () => {
            const storage = this.session.provider.widgets;
            if (
              !storage ||
              storage.read(this.session.doc, next.id) ||
              (after !== null && !this.session.provider.blocks(this.session.doc).includes(after))
            )
              return undefined;
            return storage.insert(this.session.doc, after, block, next);
          },
        },
        context
      );
    } catch (error) {
      return Promise.resolve({ status: "failed", error });
    }
  }

  remove(expected: WidgetSnapshot, context: IContextBase): Promise<CommandResult> {
    expected = this.capture(expected);
    const epoch = this.epoch;
    return this.session.command(
      {
        authorize: () => epoch === this.epoch && this.allowed("edit", expected.record),
        resolve: () => {
          const current = this.current(expected);
          return current
            ? this.session.provider.widgets?.remove(this.session.doc, current)
            : undefined;
        },
      },
      context
    );
  }

  move(
    expected: WidgetSnapshot,
    after: BlockId | null,
    context: IContextBase
  ): Promise<CommandResult> {
    expected = this.capture(expected);
    const epoch = this.epoch;
    return this.session.command(
      {
        authorize: () => epoch === this.epoch && this.allowed("edit", expected.record),
        resolve: () => {
          const current = this.current(expected);
          if (
            !current ||
            after === current.block ||
            (after !== null && !this.session.provider.blocks(this.session.doc).includes(after))
          )
            return undefined;
          return this.session.provider.widgets?.move(this.session.doc, current, after);
        },
      },
      context
    );
  }

  /** Runs conversion exactly once at command execution; replay contains only its data result. */
  migrate(expected: WidgetSnapshot, context: IContextBase): Promise<CommandResult> {
    expected = this.capture(expected);
    const plugin = this.registry.get(expected.record.type);
    const epoch = this.epoch;
    return this.session.command(
      {
        authorize: () =>
          epoch === this.epoch &&
          this.registry.get(expected.record.type) === plugin &&
          this.allowed("edit", expected.record),
        resolve: () => {
          const current = this.current(expected);
          if (!current || !plugin?.migrate || plugin.version <= current.record.version)
            return undefined;
          const next = widgetRecord({
            ...current.record,
            version: plugin.version,
            payload: plugin.migrate(current.record),
          });
          if (!this.supported(next, plugin) || !this.allowed("edit", next)) return undefined;
          return this.session.provider.widgets?.update(this.session.doc, current, next);
        },
      },
      context
    );
  }

  authorizeEdit(op: EditOp): boolean {
    if (op.type !== "insertContent") return true;
    const records = this.session.provider.widgets?.pasted(op.content) ?? [];
    return records.every((record) => this.allowed("insert", record));
  }

  resolve(block: BlockId, _context: ProviderContext): WidgetDescriptor | undefined {
    const snapshot = this.session.provider.widgets?.atBlock(this.session.doc, block);
    if (!snapshot) return undefined;
    const plugin = this.registry.get(snapshot.record.type);
    const allowed =
      this.allowed("mount", snapshot.record) && this.supported(snapshot.record, plugin);
    return {
      id            : `plugin:${snapshot.record.id}`,
      implementation: plugin ?? this,
      label         : plugin?.label ?? snapshot.record.type,
      value         : snapshot,
      allowed,
      editable: this.allowed("edit", snapshot.record),
      create: (context) => {
        if (
          !plugin ||
          !this.allowed("mount", snapshot.record) ||
          !this.supported(snapshot.record, plugin)
        )
          throw new Error("Widget mounting refused");
        return plugin.create(snapshot, this.viewContext(snapshot, plugin, context));
      },
    };
  }

  private viewContext(
    snapshot: WidgetSnapshot,
    plugin: WidgetPlugin,
    context: WidgetContext
  ): PluginViewContext {
    const epoch = this.epoch;
    const preparedUpdates = new WeakSet<DocumentCommand>();
    const isCurrent = () => {
      const current = this.session.provider.widgets?.read(this.session.doc, snapshot.record.id);
      return (
        !!current &&
        context.isCurrent() &&
        epoch === this.epoch &&
        this.registry.get(plugin.type) === plugin &&
        this.supported(current.record, plugin) &&
        this.allowed("mount", current.record)
      );
    };
    const prepare = (expected: WidgetSnapshot, payload: JsonValue): DocumentCommand => {
      const own = expected.record.id === snapshot.record.id;
      const command = this.prepareUpdate(expected, payload);
      const prepared: DocumentCommand = Object.freeze({
        resolve  : command.resolve,
        authorize: () => isCurrent() && own && (command.authorize?.() ?? true),
      });
      preparedUpdates.add(prepared);
      return prepared;
    };
    return {
      signal  : context.signal,
      document: this.options.document,
      isCurrent,
      prepareUpdate: prepare,
      update: (expected, payload) => {
        try {
          return context.command(prepare(expected, payload));
        } catch (error) {
          return Promise.resolve({ status: "failed", error });
        }
      },
      registerDraft: (controller) =>
        context.registerDraft({
          key      : `plugin:${snapshot.record.id}:${controller.key}`,
          pending  : () => controller.pending(),
          version  : () => controller.version(),
          discard  : () => controller.discard(),
          recover  : () => controller.recover(),
          committed: () => controller.committed(),
          prepare: async () => {
            const result = await controller.prepare();
            if (result.status !== "ready") return result;
            if (!preparedUpdates.has(result.command)) return { status: "refused" };
            return {
              status : "ready",
              command: {
                resolve  : result.command.resolve,
                authorize: () => {
                  const current = this.session.provider.widgets?.read(
                    this.session.doc,
                    snapshot.record.id
                  );
                  return (
                    !!current &&
                    isCurrent() &&
                    this.allowed("edit", current.record) &&
                    (result.command.authorize?.() ?? true)
                  );
                },
              },
            };
          },
        }),
      external: async <T>(
        action: string,
        run: (signal: AbortSignal) => Promise<T>
      ): Promise<ExternalActionResult<T>> => {
        const current = this.session.provider.widgets?.read(this.session.doc, snapshot.record.id);
        if (!current || !isCurrent() || !this.allowed("external", current.record, action))
          return { status: "refused" };
        try {
          const value = await run(context.signal);
          return isCurrent() &&
            this.current(current) &&
            this.allowed("external", current.record, action)
            ? { status: "complete", value }
            : { status: "refused" };
        } catch (error) {
          return context.signal.aborted || !isCurrent()
            ? { status: "refused" }
            : { status: "failed", error };
        }
      },
    };
  }

  dispose(): void {
    if (this.closed) return;
    this.closed = true;
    this.epoch++;
    this.unsubscribe();
    if (this.session.widgetHost === this) {
      this.session.widgetHost = undefined;
      this.session.invalidateWidgets();
    }
  }
}
