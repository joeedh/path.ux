import { WIDGET_CLIPBOARD_MIME } from "./widget_mime";
import { UIBase } from "../../core/ui_base";
import type { UIBaseDefinition } from "../../core/base/ui_base_types";
import type { IContextBase } from "../../core/context_base";
import type { RowFrame } from "../../core/ui_containers";
import { RichTextContext } from "./context";
import type { DocChangeInfo, DocumentSession } from "./context";
import { WidgetHost, widgetSlot } from "./widget_host";
import type { WidgetOptions } from "./widget";
import { blockElement, mapThroughPending, toDocPos } from "./positions";
import type { PendingDocView } from "./positions";
import { freezeComposition, resolveComposition } from "./composition";
import type { CompositionSnapshot } from "./composition";
import { docPosIn, domRange, setDomSelection } from "./dom_selection";
import { isCollapsed, mapInput, samePos } from "./editor_input";
import { patchBlocks, renderRoot } from "./editor_render";
import { applyEditorTheme, EDITOR_CSS, EDITOR_THEME } from "./editor_style";
import { openLinkPopup } from "./link_popup";
import type {
  BlockId,
  DocChange,
  DocPos,
  DocRange,
  EditOp,
  EditResult,
  EditorBridge,
  LinkInfo,
  ProviderContext,
  ToolbarSync,
} from "./provider";

/** The detail of the `refused` event: the input the editor declined to handle. */
export interface RefusedDetail {
  inputType: string;
}

/** The detail of the editor's `change` event: what changed, where it came from, and the session it applied to. */
export interface RichTextChangeDetail<Doc = unknown> {
  change: DocChange;
  info: DocChangeInfo;
  session: DocumentSession<Doc>;
}

const collapsed = (pos: DocPos): DocRange => ({ anchor: pos, head: pos });

/** An op whose result has not been applied. `reflected` marks one the composed block's DOM already shows. */
interface PendingEntry {
  op: EditOp;
  reflected: boolean;
}

/**
 * Edits a document through a `DocumentProvider`. Every `beforeinput` is prevented and turned
 * into an `EditOp` run through the session's toolstack; the DOM changes only when a result
 * comes back. Composition is let through: the browser mutates the composed block during the
 * composition, and at `compositionend` the editor diffs the block back into an ordinary edit
 * and submits it. A composition it cannot attribute falls back to re-rendering the root and a
 * `refused` event. The toolbar is the provider's, built into a row the editor hosts above the
 * root and hidden under a `no-toolbar` attribute; `toggleMark` works either way. `readOnly`
 * locks every input path without touching the rendered DOM.
 */
export class RichTextEditor<CTX extends IContextBase = IContextBase, Doc = unknown> extends UIBase<
  CTX,
  Doc,
  "RichTextEditor"
> {
  /** Logs any DOM mutation the editor did not make, so a missed inputType shows up. */
  static observeMutations = true;

  readonly root: HTMLDivElement;
  private readonly widgetHost: WidgetHost<Doc>;
  private _widgetOptions: WidgetOptions<Doc> = {};

  get widgetOptions(): WidgetOptions<Doc> {
    return this._widgetOptions;
  }
  set widgetOptions(value: WidgetOptions<Doc>) {
    this.widgetHost.dispose();
    this._widgetOptions = value;
    this.refreshWidgets();
  }

  /** Rechecks instance policy and descriptor implementations. */
  refreshWidgets(): void {
    this.renderAll();
  }

  /** Cancels mounted generations before reevaluating a changed host policy. */
  invalidateWidgetPolicy(): void {
    this.widgetHost.dispose();
    this.renderAll();
  }

  private readonly styletag: HTMLStyleElement;
  /** Holds `provider.styles()`, replaced whole whenever the session or the theme changes. */
  private readonly providerStyle: HTMLStyleElement;
  private toolbar?: RowFrame<ProviderContext>;
  private toolbarSync?: ToolbarSync<Doc>;
  /** What `toolbar.disabled` was last written to, so a read-only switch writes it once. */
  private toolbarLocked = false;
  private _session?: DocumentSession<Doc>;
  private rctx?: RichTextContext<CTX, Doc> & ProviderContext;
  private unsubscribe?: () => void;
  private needsRender = false;
  /** Ops submitted whose results have not been applied, oldest first. */
  private readonly pending: PendingEntry[] = [];
  /** Where the next op must act to stay in the typing run in progress. */
  private runAnchor?: DocPos;
  private composing = false;
  private snapshot?: CompositionSnapshot;
  private observer?: MutationObserver;
  /** The info the session delivered for each of this editor's own results, read back once applied. */
  private readonly ownInfo = new WeakMap<DocChange, DocChangeInfo>();
  private readonly onSelectionChange = () => this.selectionChanged();
  /** How a provider reaches this editor from the context it renders under. */
  readonly bridge: EditorBridge;

  constructor() {
    super();

    this.styletag = document.createElement("style");
    this.styletag.textContent = EDITOR_CSS;
    this.shadow.appendChild(this.styletag);
    this.providerStyle = document.createElement("style");
    this.shadow.appendChild(this.providerStyle);

    const root = (this.root = document.createElement("div"));
    root.className = "rich-text-root";
    root.contentEditable = "true";
    root.spellcheck = false;

    this.widgetHost = new WidgetHost(
      root,
      () => this._session,
      () => this.richCtx!,
      () => this.readOnly || this.disabled,
      (slot, before) => {
        const block = slot.closest<HTMLElement>("[data-doc-block]")?.dataset.docBlock;
        if (!block || !this._session) return;
        const atom = slot.closest<HTMLElement>("[data-doc-atom]");
        const at = atom ? toDocPos(root, atom, 0) : undefined;
        this.select(
          collapsed({
            block,
            offset: at
              ? at.offset + (before ? 0 : 1)
              : before
                ? 0
                : this._session.provider.blockText(this._session.doc, block).length,
          })
        );
      }
    );
    const editor = this;
    this.bridge = {
      inlineWidget: (position) =>
        this._session?.widgetHost?.resolveInline?.(position, this.richCtx!),
      widget      : widgetSlot,
      dispatch    : (op) => this.dispatch(op),
      get readOnly() {
        return editor.readOnly || editor.disabled || editor.session?.canWrite === false;
      },
      selection   : () => this.selectionThroughPending(),
      select      : (range) => this.select(range),
      blockElement: (block) => blockElement(root, block),
      posFromPoint: (x, y) => this.posFromPoint(x, y),
      root,
      linkClicked: (link, event) => this.linkClicked(link, event),
    };

    root.addEventListener("beforeinput", (e) => {
      if (!this.widgetHost.event(e)) this.onBeforeInput(e);
    });
    root.addEventListener("keydown", (e) => {
      if (!this.widgetHost.event(e)) this.onKeyDown(e);
    });
    root.addEventListener("compositionstart", (e) => {
      if (!this.widgetHost.event(e)) this.onCompositionStart();
    });
    root.addEventListener("compositionend", (e) => {
      if (!this.widgetHost.event(e)) this.onCompositionEnd();
    });
    root.addEventListener("blur", () => this.endRun());
    root.addEventListener("copy", (e) => {
      if (!this.widgetHost.event(e)) this.onCopy(e, false);
    });
    root.addEventListener("cut", (e) => {
      if (!this.widgetHost.event(e)) this.onCopy(e, true);
    });
    for (const type of ["input", "paste", "drop", "pointerdown", "pointerup", "click"]) {
      root.addEventListener(type, (e) => {
        if (this.widgetHost.owner(e)) e.stopPropagation();
      });
    }

    this.shadow.appendChild(root);

    if (RichTextEditor.observeMutations) {
      this.observer = new MutationObserver((records) => {
        if (!this.composing && records.some((record) => !this.widgetHost.ownsNode(record.target))) {
          console.error("rich-text-x: the DOM changed outside the editor", records);
        }
      });
      this.observer.observe(root, { childList: true, characterData: true, subtree: true });
    }
  }

  get session(): DocumentSession<Doc> | undefined {
    return this._session;
  }

  /** The document shown. Setting it drops any run in progress and renders from scratch. */
  set session(session: DocumentSession<Doc> | undefined) {
    if (session === this._session) {
      return;
    }

    this.unsubscribe?.();
    this.widgetHost.dispose();
    this.root.replaceChildren();
    this._session = session;
    this.rctx = undefined;
    this.pending.length = 0;
    this.runAnchor = undefined;
    this.unsubscribe = session?.onChange((change, info) => {
      // an own result is applied by the commit that awaits it, which announces it then
      if (info.submitter === this) {
        this.ownInfo.set(change, info);
        return;
      }

      if (info.invalidateWidgets) {
        this.invalidateWidgetPolicy();
        return;
      }
      this.docChanged(change);
      if (info.origin !== "policy") this.announce(change, info);
    });

    this.providerStyle.textContent = session?.provider.styles?.() ?? "";
    this.buildToolbar();
    this.renderAll();
  }

  /** The context the document's UI is built under, rebuilt when the parent context changes. */
  get richCtx(): (RichTextContext<CTX, Doc> & ProviderContext) | undefined {
    const session = this._session;
    if (session === undefined || this.ctx === undefined) {
      return undefined;
    }

    if (this.rctx?.parent !== this.ctx || this.rctx.session !== session) {
      // the bridge is always passed, so the context is a ProviderContext by construction
      this.rctx = new RichTextContext(this.ctx, session, this.bridge) as RichTextContext<CTX, Doc> &
        ProviderContext;
    }

    return this.rctx;
  }

  /** The document shown, or `undefined` without a session. */
  getValue = (): Doc | undefined => this._session?.doc;

  /**
   * Render-only mode, reflected as the `readonly` attribute. Switching it leaves the DOM and
   * the scroll position alone: the root stops being editable, every input path returns
   * without acting, the toolbar's widgets disable in place, and `dispatch` resolves `undefined`.
   */
  get readOnly(): boolean {
    return this.hasAttribute("readonly");
  }

  set readOnly(value: boolean) {
    this.toggleAttribute("readonly", value);
    this.applyEditable();
    this.widgetHost.refresh();
  }

  /** The selection and scroll position, for a history engine to save before swapping `session` and restore after. */
  get viewState(): { selection?: DocRange; scrollTop: number } {
    return { selection: this.domRange(), scrollTop: this.root.scrollTop };
  }

  set viewState(state: { selection?: DocRange; scrollTop: number }) {
    this.root.scrollTop = state.scrollTop;
    if (state.selection !== undefined) {
      this.setSelection(state.selection);
    }
  }

  init() {
    super.init();
    document.addEventListener("selectionchange", this.onSelectionChange);
    this.setCSS();
    this.renderAll();
  }

  update() {
    super.update();
    if (this.needsRender) {
      this.renderAll();
    }
    if (this.toolbar !== undefined) {
      this.toolbar.hidden = this.hasAttribute("no-toolbar");
    }
    this.applyEditable();
    // the update cascade stops at the root, so the widgets a provider embedded run from here
    this.updateEmbedded(this.root);
  }

  /**
   * Skips the editable root: the widgets a provider embeds under a block keep the context they
   * were built under, so neither the `setCtx` cascade nor the update cascade reaches them.
   */
  override _forEachChildWidget(cb: (n: UIBase<CTX>) => void, thisvar?: unknown): void {
    const rec = (n: Node & { shadow?: ShadowRoot }) => {
      if (n === this.root) {
        return;
      }
      if (n instanceof UIBase) {
        if (thisvar !== undefined) {
          cb.call(thisvar, n as UIBase<CTX>);
        } else {
          cb(n as UIBase<CTX>);
        }
        return;
      }

      for (const child of n.childNodes) {
        rec(child);
      }
      if (n.shadow !== undefined) {
        for (const child of n.shadow.childNodes) {
          rec(child);
        }
      }
    };

    for (const n of this.childNodes) {
      rec(n);
    }
    for (const n of this.shadow.childNodes) {
      rec(n);
    }
  }

  override __updateDisable(val: boolean): void {
    super.__updateDisable(val);
    this.applyEditable();
  }

  /**
   * The one writer of the root's `contenteditable`: editable unless read-only or disabled.
   * Also mirrors `readOnly` onto the root as a `readonly` attribute a provider's styles can
   * target, and locks the toolbar's widgets in place.
   */
  private applyEditable(): void {
    const readOnly = this.readOnly || this._session?.canWrite === false;
    const editable = !readOnly && !this.disabled ? "true" : "false";

    if (this.root.getAttribute("contenteditable") !== editable) {
      this.root.contentEditable = editable;
      // Embedded widgets read the editable state once, when they mount, so one that mounted
      // while an ancestor was disabled stays locked until it is told
      this.widgetHost.refresh();
    }
    this.root.toggleAttribute("readonly", readOnly);

    if (this.toolbar !== undefined && this.toolbarLocked !== readOnly) {
      this.toolbarLocked = readOnly;
      this.toolbar.disabled = readOnly;
    }
  }

  /** Runs `flushUpdate` on every widget a provider placed under `scope`. */
  private updateEmbedded(scope: ParentNode): void {
    const rec = (n: Node) => {
      if (n instanceof UIBase) {
        if (n.parentWidget === undefined) {
          n.parentWidget = this;
        }
        n.flushUpdate();
        return;
      }
      for (const child of n.childNodes) {
        rec(child);
      }
    };

    for (const n of scope.childNodes) {
      rec(n);
    }
  }

  override _ondestroy() {
    this.widgetHost.dispose();
    document.removeEventListener("selectionchange", this.onSelectionChange);
    this.observer?.disconnect();
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    super._ondestroy();
  }

  setCSS() {
    super.setCSS();
    applyEditorTheme(this, this.root, this);
    // setCSS re-runs on every theme update, so the provider's sheet is replaced, not appended
    this.providerStyle.textContent = this._session?.provider.styles?.() ?? "";
  }

  /** Focuses the editable root and places the selection. */
  select(range: DocRange): void {
    this.root.focus();
    this.setSelection(range);
  }

  /** The current selection as document positions, or `undefined` when it is elsewhere. */
  selection(): DocRange | undefined {
    return this.domRange();
  }

  /** Scrolls the root so the block's element sits at its top; nothing happens for an unrendered block. */
  scrollToBlock(block: BlockId): void {
    const el = blockElement(this.root, block);
    if (el === undefined) {
      return;
    }

    const top = el.getBoundingClientRect().top - this.root.getBoundingClientRect().top;
    this.root.scrollTop += top;
  }

  /** Ends the typing run and commits `op`; resolves with its result, or `undefined` when read-only or dropped. */
  async dispatch(op: EditOp): Promise<EditResult | undefined> {
    if (this.readOnly || this.disabled) {
      return undefined;
    }

    this.endRun();
    return this.commit(op);
  }

  /**
   * Raises `linkclick` for a link the provider rendered and the user clicked. The editor
   * attaches no meaning to the link; its one default, in edit mode, is `linkDefault`, which
   * `preventDefault` on the event suppresses. Returns `false` when the consumer prevented it.
   */
  linkClicked(link: LinkInfo, event: MouseEvent): boolean {
    const proceed = this.dispatchEvent(
      new CustomEvent<LinkInfo>("linkclick", { detail: link, cancelable: true })
    );

    if (proceed && !this.readOnly) {
      this.linkDefault(link, event);
    }

    return proceed;
  }

  /** The edit-mode default for a link click: the link popup under the clicked element. */
  protected linkDefault(link: LinkInfo, event: MouseEvent): void {
    const target = event.currentTarget;
    const rect = target instanceof Element ? target.getBoundingClientRect() : undefined;
    const x = rect?.left ?? event.clientX;
    const y = rect?.bottom ?? event.clientY;

    openLinkPopup(
      this,
      this.bridge,
      { range: link.range, kind: link.kind, target: link.target },
      x,
      y + 4
    );
  }

  /**
   * The document position under a viewport point. The lookup pierces the shadow root, which
   * WebKit's `caretRangeFromPoint` cannot, so there the answer is `undefined`.
   */
  private posFromPoint(x: number, y: number): DocPos | undefined {
    if (typeof document.caretPositionFromPoint !== "function") {
      return undefined;
    }

    const caret = document.caretPositionFromPoint(x, y, { shadowRoots: [this.shadow] });
    return caret === null ? undefined : this.docPos(caret.offsetNode, caret.offset);
  }

  async undo(): Promise<void> {
    if (this.readOnly || this.disabled) return;
    const session = this._session;
    if (session === undefined) {
      return;
    }

    this.endRun();
    await session.toolstack.undo(this.richCtx);
    this.endRun();
  }

  async redo(): Promise<void> {
    if (this.readOnly || this.disabled) return;
    const session = this._session;
    if (session === undefined) {
      return;
    }

    this.endRun();
    await session.toolstack.redo(this.richCtx);
    this.endRun();
  }

  /** Toggles `mark` over the selection; nothing happens on a collapsed one or for a name the provider does not list. */
  toggleMark(mark: string): void {
    if (this.composing || this.readOnly) {
      return;
    }
    if (!this._session?.provider.marks().some((m) => m.name === mark)) {
      return;
    }

    const range = this.selectionThroughPending();
    if (range === undefined || isCollapsed(range)) {
      return;
    }

    this.submit({ type: "toggleMark", range, mark });
  }

  private refuse(inputType: string): EditOp[] {
    this.dispatchEvent(new CustomEvent<RefusedDetail>("refused", { detail: { inputType } }));
    return [];
  }

  private onBeforeInput(e: InputEvent): void {
    // an insertCompositionText is not cancelable and the diff at compositionend is its handler,
    // so neither prevent nor map it; preventing a cancelable one inside a composition would
    // cancel the composition
    if (this.composing || e.isComposing) {
      return;
    }

    e.preventDefault();

    const session = this._session;
    const view = this.view();
    if (session === undefined || session.disposed || view === undefined || this.readOnly) {
      return;
    }

    const { provider } = session;
    const ops = mapInput(e, {
      view,
      hasMark      : (name) => provider.marks().some((m) => m.name === name),
      fromClipboard: (data) => {
        if (data.types.includes(WIDGET_CLIPBOARD_MIME) && !provider.widgets) {
          this.dispatchEvent(
            new CustomEvent("clipboardunsupported", { detail: { format: WIDGET_CLIPBOARD_MIME } })
          );
          return undefined;
        }
        return provider.fromClipboard(data);
      },
      inputRange   : (event) => this.inputRange(event),
      refuse       : (type) => this.refuse(type),
      undo         : () => this.undo(),
      redo         : () => this.redo(),
    });
    for (const op of ops) {
      this.submit(op);
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    // the shortcuts are the browser's during a composition; on Windows they arrive as Process
    if (this.composing || e.isComposing || this.readOnly) {
      return;
    }

    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    const undoChord = mod && !e.altKey && (key === "z" || key === "y");

    // consuming the keydown also stops the beforeinput the key would have produced
    if (!undoChord && this.providerHandles(e)) {
      e.preventDefault();
      return;
    }

    if (e.key === "Escape") {
      this.root.blur();
      e.preventDefault();
    } else if (e.key === "Tab") {
      const range = this.selectionThroughPending();
      if (!range || !this.widgetHost.enter(range.head, e.shiftKey)) this.refuse("insertTab");
      e.preventDefault();
    } else if (mod && e.shiftKey && key === "s") {
      this.toggleMark("strikethrough");
      e.preventDefault();
    } else if (mod && !e.altKey && key === "z") {
      void (e.shiftKey ? this.redo() : this.undo());
      e.preventDefault();
    } else if (mod && !e.altKey && key === "y") {
      void this.redo();
      e.preventDefault();
    }
  }

  /** Offers `e` to the provider's `handleKey` and submits what it answers; `false` when it declines. */
  private providerHandles(e: KeyboardEvent): boolean {
    const session = this._session;
    if (session === undefined || session.disposed || session.provider.handleKey === undefined) {
      return false;
    }

    const range = this.selectionThroughPending();
    if (range === undefined) {
      return false;
    }

    const op = session.provider.handleKey(session.doc, range, e);
    if (op === undefined) {
      return false;
    }

    this.submit(op);
    return true;
  }

  /** Writes the selection through `toClipboard`; a cut then commits its deletion on its own. */
  private onCopy(e: ClipboardEvent, cut: boolean): void {
    if (this.composing) {
      return;
    }

    const session = this._session;
    const range = this.selectionThroughPending();
    if (session === undefined || range === undefined || isCollapsed(range) || !e.clipboardData) {
      return;
    }

    let content;
    try {
      content = session.provider.toClipboard(session.doc, range);
    } catch {
      e.preventDefault();
      this.dispatchEvent(
        new CustomEvent("clipboardunsupported", { detail: { format: WIDGET_CLIPBOARD_MIME } })
      );
      return;
    }
    e.clipboardData.setData("text/plain", content.blocks.join("\n"));
    if (content.html !== undefined) {
      e.clipboardData.setData("text/html", content.html);
    }
    if (content.widgetData !== undefined)
      e.clipboardData.setData(WIDGET_CLIPBOARD_MIME, content.widgetData);
    e.preventDefault();

    if (cut && !session.disposed && !this.readOnly) {
      // an entry of its own: neither joining a delete run nor starting one
      this.submit({ type: "deleteRange", range });
      this.endRun();
    }
  }

  /** Freezes the composed block and the document, so the composition can be diffed at the end. */
  private onCompositionStart(): void {
    this.composing = true;
    this.snapshot = undefined;

    const range = this.domRange();
    const view = this.view();
    if (range === undefined || view === undefined) {
      return;
    }

    const pending = this.pending.filter((e) => !e.reflected).map((e) => e.op);
    this.snapshot = freezeComposition(this.root, range, view, pending);
  }

  /** Diffs the composed block back into an edit and submits it, or falls back to a re-render. */
  private onCompositionEnd(): void {
    // Firefox queues the commit's mutation records before compositionend and delivers them
    // after this returns, when composing is already false; drop them so the observer stays quiet
    this.observer?.takeRecords();

    this.composing = false;
    const snapshot = this.snapshot;
    this.snapshot = undefined;

    const view = this.view();
    if (
      snapshot === undefined ||
      view === undefined ||
      this._session === undefined ||
      this._session.disposed
    ) {
      this.refuseComposition(snapshot);
      return;
    }

    const outcome = resolveComposition(snapshot, this.root, view);
    if (outcome.kind === "refuse") {
      this.refuseComposition(snapshot);
    } else if (outcome.kind === "rerender") {
      this.rerenderComposed(snapshot);
    } else {
      // the browser already put the composed text in the block, so this op's DOM write is a
      // no-op; mark it reflected so a position read before its result does not shift by it
      this.submit(outcome.op, true);
    }
  }

  /** Re-renders the composed block from the provider and restores the snapshot's caret. */
  private rerenderComposed(snapshot: CompositionSnapshot): void {
    const view = this.view();
    if (view?.blocks.includes(snapshot.block) !== true) {
      this.refuseComposition(snapshot);
      return;
    }

    const caret = mapThroughPending(snapshot.selection.head, snapshot.pending, snapshot.view);
    this.applyResult({
      dirtyBlocks  : [snapshot.block],
      removedBlocks: [],
      selection    : collapsed(this.clampPos(caret, view)),
    });
  }

  /** The fallback: reconcile the whole root, clamp the caret, and report the composition refused. */
  private refuseComposition(snapshot: CompositionSnapshot | undefined): void {
    this.renderAll();

    const view = this.view();
    if (view !== undefined) {
      const caret =
        snapshot !== undefined
          ? mapThroughPending(snapshot.selection.head, snapshot.pending, snapshot.view)
          : (this.domRange()?.head ?? { block: view.blocks[0], offset: 0 });
      if (caret.block !== undefined) {
        this.setSelection(collapsed(this.clampPos(caret, view)));
      }
    }

    this.refuse("insertCompositionText");
  }

  /** Ends the run in progress unless `op` continues it, then commits `op`. */
  private submit(op: EditOp, reflected = false): void {
    const anchor = this.runAnchor;

    if (op.type === "insertText" && isCollapsed(op.at)) {
      if (anchor === undefined || !samePos(op.at.head, anchor)) {
        this.undoBreakPoint();
      }
      this.runAnchor = { block: op.at.head.block, offset: op.at.head.offset + op.text.length };
    } else if (op.type === "deleteRange" && op.range.anchor.block === op.range.head.block) {
      const { anchor: a, head: h } = op.range;
      const start = a.offset <= h.offset ? a : h;
      const end = a.offset <= h.offset ? h : a;
      if (anchor === undefined || !(samePos(start, anchor) || samePos(end, anchor))) {
        this.undoBreakPoint();
      }
      this.runAnchor = start;
    } else {
      this.endRun();
    }

    void this.commit(op, reflected);
  }

  /** Runs `op` through the toolstack and applies its result once it has run; `undefined` when it did not land. */
  private async commit(op: EditOp, reflected = false): Promise<EditResult | undefined> {
    const session = this._session;
    const ctx = this.richCtx;
    if (session === undefined || ctx === undefined) {
      return undefined;
    }

    const entry: PendingEntry = { op, reflected };
    this.pending.push(entry);

    let applied: EditResult;
    try {
      // the result settles inside exec, before the stack's own promise does; a throw on the
      // way there is the only reason to wait on that one
      applied = await session.dispatch(
        op,
        ctx,
        this,
        this.pathUndoGen,
        () => !this.readOnly && !this.disabled
      );
    } catch (error) {
      this.dropPending(entry);
      console.error("rich-text-x: edit failed", error);
      // a composition op that fails leaves the block holding text the document lacks, so every
      // later position in it is off; reconcile the root rather than drop the op
      if (reflected) {
        this.refuseComposition(undefined);
      } else {
        this.endRun();
      }
      return undefined;
    }

    if (this._session !== session) {
      return undefined;
    }

    this.dropPending(entry);
    this.applyResult(applied);
    this.announce(applied, this.ownInfo.get(applied) ?? { origin: "edit", op, submitter: this });

    return applied;
  }

  /** Reports a change this editor has applied: the `change` event on the host, then `on_change` with the document. */
  private announce(change: DocChange, info: DocChangeInfo): void {
    const session = this._session;
    if (session === undefined) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent<RichTextChangeDetail<Doc>>("change", {
        detail: { change, info, session },
      })
    );
    this.on_change?.(session.doc);
  }

  private dropPending(entry: PendingEntry): void {
    const index = this.pending.indexOf(entry);
    if (index >= 0) {
      this.pending.splice(index, 1);
    }
  }

  /** A change from elsewhere: another editor, an undo, the provider. The caret stays put. */
  private docChanged(change: DocChange): void {
    if (this._session?.disposed) {
      this.widgetHost.dispose();
      return;
    }
    const own = this.domRange();
    const view = this.view();

    // the change's selection is not taken: an editor that does not hold the selection must
    // not pull it away from the one that does
    this.applyResult({ ...change, selection: undefined });

    // hold the caret restore and the run break while composing, for the same reason
    // applyResult holds the selection: the browser owns the caret until compositionend
    if (this.composing) {
      return;
    }

    if (own !== undefined && view !== undefined && !this.widgetHost.focused) {
      this.setSelection({
        anchor: this.clampPos(own.anchor, view),
        head  : this.clampPos(own.head, view),
      });
    }

    this.endRun();
  }

  private clampPos(pos: DocPos, view: PendingDocView): DocPos {
    if (!view.blocks.includes(pos.block)) {
      const block = view.blocks[0];
      return block === undefined ? pos : { block, offset: 0 };
    }

    return { block: pos.block, offset: Math.min(pos.offset, view.blockText(pos.block).length) };
  }

  private endRun(): void {
    this.undoBreakPoint();
    this.runAnchor = undefined;
  }

  private selectionChanged(): void {
    if (this.composing || this._session === undefined) {
      return;
    }

    this.syncToolbar();

    if (this.runAnchor === undefined || this.pending.length > 0) {
      return;
    }

    const range = this.domRange();
    if (range === undefined || !isCollapsed(range) || !samePos(range.head, this.runAnchor)) {
      this.endRun();
    }
  }

  /** The document as the position mapper reads it, or `undefined` before there is one. */
  private view(): PendingDocView | undefined {
    const session = this._session;
    if (session === undefined) {
      return undefined;
    }

    const { provider, doc } = session;
    return { blocks: provider.blocks(doc), blockText: (block) => provider.blockText(doc, block) };
  }

  private renderAll(): void {
    if (this.widgetHost.hold(() => this.renderAll())) return;
    const session = this._session;
    const ctx = this.richCtx;

    if (session === undefined) {
      this.root.replaceChildren();
      this.observer?.takeRecords();
      this.needsRender = false;
      return;
    }
    if (ctx === undefined) {
      this.needsRender = true;
      return;
    }

    renderRoot(this.root, session, ctx, this.widgetHost, this.widgetOptions);
    this.observer?.takeRecords();
    this.needsRender = false;
    this.updateEmbedded(this.root);
  }

  /** Re-renders the dirty blocks, drops the removed ones and places the selection. */
  private applyResult(result: EditResult | DocChange): void {
    if (this.widgetHost.hold(() => this.renderAll())) return;
    const session = this._session;
    const ctx = this.richCtx;
    if (session === undefined || ctx === undefined) {
      return;
    }

    // during a composition the browser owns the composed block and the caret; its render, its
    // removal and every caret write are held until compositionend renders the composition
    const held = this.composing ? this.snapshot?.block : undefined;
    patchBlocks(
      this.root,
      session.provider,
      session.doc,
      ctx,
      result,
      held,
      (fresh) => this.updateEmbedded(fresh),
      this.widgetHost,
      session,
      this.widgetOptions
    );
    this.observer?.takeRecords();

    // hold every caret write while composing, so a result from elsewhere does not move the
    // caret out of the composition the browser is running
    if (
      result.selection !== undefined &&
      !this.composing &&
      !result.preserveFocus &&
      !this.widgetHost.focused
    ) {
      this.setSelection(result.selection);
    }
    this.syncToolbar();
  }

  private setSelection(range: DocRange): void {
    setDomSelection(this.root, this.shadow, range);
  }

  /** A DOM position to a document one; a position on the root itself lands on a block edge. */
  private docPos(node: Node, offset: number): DocPos | undefined {
    const view = this.view();
    return view === undefined ? undefined : docPosIn(this.root, view, node, offset);
  }

  private domRange(): DocRange | undefined {
    if (this.widgetHost.focused) return undefined;
    const view = this.view();
    return view === undefined ? undefined : domRange(this.root, this.shadow, view);
  }

  private throughPending(range: DocRange): DocRange | undefined {
    const view = this.view();
    if (view === undefined) {
      return undefined;
    }

    // a reflected op's DOM write is already in the block, so a DOM-read position sits past it
    const ops = this.pending.filter((e) => !e.reflected).map((e) => e.op);
    if (ops.length === 0) {
      return range;
    }

    return {
      anchor: mapThroughPending(range.anchor, ops, view),
      head  : mapThroughPending(range.head, ops, view),
    };
  }

  private selectionThroughPending(): DocRange | undefined {
    const range = this.domRange();
    return range === undefined ? undefined : this.throughPending(range);
  }

  /** The range an input event works on: its first target range, else the selection. */
  private inputRange(e: InputEvent): DocRange | undefined {
    const targets = e.getTargetRanges();
    if (targets.length === 0) {
      return this.selectionThroughPending();
    }

    const r = targets[0];
    const anchor = this.docPos(r.startContainer, r.startOffset);
    const head = this.docPos(r.endContainer, r.endOffset);
    if (anchor === undefined || head === undefined) {
      return undefined;
    }

    return this.throughPending({ anchor, head });
  }

  /** Hands the provider a fresh row above the root; the old row and its sync are dropped. */
  private buildToolbar(): void {
    this.toolbar?.remove();
    this.toolbar = undefined;
    this.toolbarSync = undefined;
    this.toolbarLocked = false;

    const session = this._session;
    const ctx = this.richCtx;
    if (session === undefined || ctx === undefined || session.provider.buildToolbar === undefined) {
      return;
    }

    const row = UIBase.createElement<RowFrame<ProviderContext>>("rowframe-x");
    // an attribute rather than a class: a container writes its own class on init
    row.setAttribute("data-richtext-toolbar", "");
    // the row's ctx is the document's, so its parent is typed by that context rather than CTX
    row.parentWidget = this as unknown as UIBase<ProviderContext>;

    // The setCtx cascade from the screen would otherwise replace the document's context
    Object.defineProperty(row, "ctx", {
      configurable: true,
      get         : () => this.richCtx ?? this.ctx,
      set         : () => {},
    });

    this.toolbarSync = session.provider.buildToolbar(row, ctx);
    row.checkInit();
    this.shadow.insertBefore(row, this.root);
    this.toolbar = row;
    this.applyEditable();
  }

  /** Runs the provider's toolbar sync, except while an op is pending and the DOM is behind the document. */
  private syncToolbar(): void {
    const session = this._session;
    if (session === undefined || this.toolbarSync === undefined || this.pending.length > 0) {
      return;
    }

    this.toolbarSync(session.doc, this.domRange());
  }

  static define(): UIBaseDefinition {
    return {
      tagname       : "rich-text-x",
      style         : "richtext",
      modalKeyEvents: true,
      theme         : EDITOR_THEME,
    };
  }
}

UIBase.internalRegister(RichTextEditor);
