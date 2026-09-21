import { toDocPos } from "./positions";
import type { DocPos } from "./provider";
import type { DocumentSession } from "./context";
import type { IContextBase } from "../../core/context_base";
import type { WidgetDescriptor, WidgetState, WidgetView } from "./widget";

const descriptions = new WeakMap<HTMLElement, WidgetDescriptor>();

interface Mount {
  slot: HTMLElement;
  descriptor: WidgetDescriptor;
  abort: AbortController;
  view?: WidgetView;
  drafts: Set<() => void>;
}

/** Creates a placement without starting the descriptor's factory. */
export function widgetSlot(descriptor: WidgetDescriptor): HTMLElement {
  const slot = document.createElement("span");
  slot.contentEditable = "false";
  slot.dataset.docWidget = descriptor.id;
  slot.setAttribute("role", "group");
  slot.setAttribute("aria-label", descriptor.label);
  slot.tabIndex = 0;
  descriptions.set(slot, descriptor);
  return slot;
}

/** Owns retained mounts for one editor; provider DOM remains outside each slot. */
export class WidgetHost<Doc = unknown> {
  private mounts = new Map<string, Mount>();
  private composing = new Set<HTMLElement>();
  private deferred?: () => void;
  private retired: HTMLElement[] = [];

  constructor(
    readonly root: HTMLElement,
    private readonly session: () => DocumentSession<Doc> | undefined,
    private readonly context: () => IContextBase,
    private readonly readOnly: () => boolean,
    private readonly exit: (slot: HTMLElement, before: boolean) => void
  ) {}

  get composingNow() {
    return this.composing.size > 0;
  }

  hold(reconcile: () => void): boolean {
    if (!this.composingNow) return false;
    this.deferred = reconcile;
    return true;
  }

  owner(event: Event): HTMLElement | undefined {
    return event
      .composedPath()
      .find(
        (node): node is HTMLElement =>
          node instanceof HTMLElement && node.hasAttribute("data-doc-widget")
      );
  }

  ownsNode(node: Node): boolean {
    return node instanceof Element
      ? !!node.closest("[data-doc-widget]")
      : !!node.parentElement?.closest("[data-doc-widget]");
  }

  get focused(): boolean {
    if (!this.root.isConnected || !this.mounts.size) return false;
    const tree = this.root.getRootNode() as Document | ShadowRoot;
    return !!tree.activeElement && this.ownsNode(tree.activeElement);
  }

  event(event: Event): boolean {
    const slot = this.owner(event);
    if (!slot) return false;
    event.stopPropagation();
    if (event.type === "compositionstart") this.composing.add(slot);
    if (event.type === "compositionend") {
      this.composing.delete(slot);
      const reconcile = this.deferred;
      this.deferred = undefined;
      // Finish the control's composition handlers before reconciling its view
      if (reconcile) queueMicrotask(reconcile);
    }
    if (event instanceof KeyboardEvent && !event.isComposing && !this.composingNow) {
      const mount = this.mounts.get(slot.dataset.docWidget!);
      if (event.key === "Escape") {
        event.preventDefault();
        this.exit(slot, false);
      } else if (
        (event.key === "Enter" || event.key === "Tab") &&
        event.composedPath()[0] === slot
      ) {
        event.preventDefault();
        this.focus(mount, event.shiftKey);
      } else if (event.key === "Tab") {
        const controls = this.controls(slot);
        const target = event.composedPath()[0];
        if (target === controls[event.shiftKey ? 0 : controls.length - 1]) {
          event.preventDefault();
          this.exit(slot, event.shiftKey);
        }
      }
    }
    return true;
  }

  enter(position: DocPos, backward: boolean): boolean {
    const block = position.block;
    const blocks = [...this.root.children];
    const start = blocks.findIndex((node) => node.getAttribute("data-doc-block") === block);
    const mounts = [...this.root.querySelectorAll<HTMLElement>("[data-doc-widget]")];
    if (backward) mounts.reverse();
    const slot = mounts.find((slot) => {
      const parent = slot.closest("[data-doc-block]");
      const index = parent ? blocks.indexOf(parent) : -1;
      if (index !== start) return backward ? index < start : index > start;
      const at = toDocPos(this.root, slot, 0);
      return (
        at !== undefined && (backward ? at.offset < position.offset : at.offset >= position.offset)
      );
    });
    if (!slot) return false;
    slot.focus();
    this.focus(this.mounts.get(slot.dataset.docWidget!), backward);
    return true;
  }

  private controls(root: HTMLElement): HTMLElement[] {
    const result: HTMLElement[] = [];
    const walk = (node: Element | ShadowRoot) => {
      for (const child of node.children) {
        if (
          child instanceof HTMLElement &&
          child.tabIndex >= 0 &&
          !child.matches(":disabled,[hidden],[inert]")
        )
          result.push(child);
        walk(child.shadowRoot ?? child);
      }
    };
    walk(root);
    return result;
  }

  private focus(mount: Mount | undefined, last: boolean): void {
    if (!mount) return;
    if (mount.view?.focus) mount.view.focus(last);
    else {
      const controls = this.controls(mount.slot);
      controls[last ? controls.length - 1 : 0]?.focus();
    }
  }

  private state(mount: Mount): WidgetState {
    return {
      value   : mount.descriptor.value,
      readOnly: this.readOnly() || !this.session()?.canWrite || mount.descriptor.editable === false,
    };
  }

  /** Replaces a block only after its old mounts have moved into connected destinations. */
  replace(old: HTMLElement | undefined, fresh: HTMLElement, insert: () => void): void {
    insert();
    const slots = [...fresh.querySelectorAll<HTMLElement>("[data-doc-widget]")];
    for (const slot of slots) {
      const descriptor = descriptions.get(slot);
      if (!descriptor) continue;
      let mount = this.mounts.get(descriptor.id);
      if (
        mount &&
        (mount.descriptor.implementation !== descriptor.implementation ||
          descriptor.allowed === false)
      ) {
        this.disposeMount(mount);
        mount = undefined;
      }
      if (descriptor.allowed === false) {
        slot.textContent = `${descriptor.label} (unavailable)`;
        continue;
      }
      if (mount) {
        const parent = slot.parentElement!;
        if (
          typeof parent.moveBefore === "function" &&
          mount.slot.isConnected &&
          parent.isConnected
        ) {
          parent.moveBefore(mount.slot, slot);
          slot.remove();
        } else {
          // Unsupported engines remount explicitly rather than claiming playback continuity
          this.root.dispatchEvent(
            new CustomEvent("widgetremount", { detail: { id: descriptor.id } })
          );
          this.disposeMount(mount);
          mount = undefined;
        }
      }
      if (!mount) {
        mount = { slot, descriptor, abort: new AbortController(), drafts: new Set() };
        this.mounts.set(descriptor.id, mount);
        this.create(mount);
      } else {
        mount.descriptor = descriptor;
        mount.slot.setAttribute("aria-label", descriptor.label);
        this.update(mount);
      }
    }
    if (old) this.retired.push(old);
  }

  private create(mount: Mount): void {
    const session = this.session();
    if (!session) return;
    const current = () =>
      !mount.abort.signal.aborted && !session.disposed && this.session() === session;
    const accept = (view: WidgetView) => {
      if (!current()) {
        view.dispose();
        return;
      }
      mount.view = view;
      mount.slot.replaceChildren(view.element);
      this.update(mount);
    };
    try {
      const result = mount.descriptor.create({
        signal       : mount.abort.signal,
        isCurrent    : current,
        command: (command) =>
          session.command(
            {
              resolve  : command.resolve,
              authorize: () =>
                current() &&
                !this.state(mount).readOnly &&
                mount.descriptor.allowed !== false &&
                (command.authorize?.() ?? true),
            },
            this.context()
          ),
        registerDraft: (controller) => {
          const unregister = session.registerDraft(
            {
              key      : controller.key,
              pending  : () => controller.pending(),
              version  : () => controller.version(),
              discard  : () => controller.discard(),
              recover  : () => controller.recover(),
              committed: () => controller.committed(),
              undo     : () => current() && (controller.undo?.() ?? false),
              redo     : () => current() && (controller.redo?.() ?? false),
              prepare: async () => {
                const prepared = await controller.prepare();
                if (prepared.status !== "ready") return prepared;
                return {
                  status : "ready",
                  command: {
                    resolve  : prepared.command.resolve,
                    authorize: () =>
                      current() &&
                      !this.state(mount).readOnly &&
                      (prepared.command.authorize?.() ?? true),
                  },
                };
              },
            },
            this.context()
          );
          if (!current()) {
            unregister();
            return () => {};
          }
          mount.drafts.add(unregister);
          return () => {
            mount.drafts.delete(unregister);
            unregister();
          };
        },
      });
      if (result instanceof Promise) void result.then(accept, () => this.fail(mount));
      else accept(result);
    } catch {
      this.fail(mount);
    }
  }

  private update(mount: Mount): void {
    try {
      mount.view?.update?.(this.state(mount));
    } catch {
      this.fail(mount);
    }
  }

  private fail(mount: Mount): void {
    if (mount.abort.signal.aborted) return;
    this.disposeMount(mount);
    mount.slot.textContent = `${mount.descriptor.label} (unavailable)`;
  }

  refresh(): void {
    for (const mount of this.mounts.values()) this.update(mount);
  }

  sweep(): void {
    for (const old of this.retired) old.remove();
    this.retired.length = 0;
    for (const mount of this.mounts.values()) {
      if (!this.root.contains(mount.slot)) this.disposeMount(mount);
    }
  }

  private disposeMount(mount: Mount): void {
    if (mount.abort.signal.aborted) return;
    mount.abort.abort();
    this.mounts.delete(mount.descriptor.id);
    for (const unregister of mount.drafts) unregister();
    mount.drafts.clear();
    try {
      mount.view?.dispose();
    } catch {
      // Disposal must finish for other mounts
    }
  }

  dispose(): void {
    for (const mount of this.mounts.values()) this.disposeMount(mount);
    this.retired.length = 0;
    this.composing.clear();
    this.deferred = undefined;
  }
}
