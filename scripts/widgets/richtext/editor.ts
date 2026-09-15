import { UIBase } from "../../core/ui_base";
import type { UIBaseDefinition } from "../../core/base/ui_base_types";
import type { IContextBase } from "../../core/context_base";
import type { CSSFont } from "../../core/cssfont";
import type { RowFrame } from "../../core/ui_containers";
import { t } from "../../core/theme_schema";
import { css2color } from "../../core/ui_theme";
import { RichTextContext } from "./context";
import type { DocChangeInfo, DocumentSession } from "./context";
import { DocEditOp } from "./ops";
import { blockElement, blockTextOf, fromDocPos, mapThroughPending, toDocPos } from "./positions";
import type { DomPos, PendingDocView } from "./positions";
import { composedEdit, rootReflects } from "./composition";
import { ATOM_CHAR, newBlockId } from "./provider";
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

// The color keys set as `--richtext-<key>` variables as they are, and the font keys as CSS
const THEME_COLORS = [
  "readonly-background",
  "selection-background",
  "link-color",
  "code-background",
  "quote-border-color",
  "quote-text-color",
  "marker-color",
  "hr-color",
  "opaque-background",
] as const;
const THEME_FONTS = ["code-font", "heading-font"] as const;

// What each formatting inputType asks for, in the provider's naming
const FORMAT_MARKS: Record<string, string> = {
  formatBold         : "bold",
  formatItalic       : "italic",
  formatUnderline    : "underline",
  formatStrikeThrough: "strikethrough",
};

const BACKWARD_DELETES = new Set([
  "deleteContentBackward",
  "deleteWordBackward",
  "deleteSoftLineBackward",
]);
const FORWARD_DELETES = new Set([
  "deleteContentForward",
  "deleteWordForward",
  "deleteSoftLineForward",
]);
const WORD_DELETES = new Set(["deleteWordBackward", "deleteWordForward"]);

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

const samePos = (a: DocPos, b: DocPos) => a.block === b.block && a.offset === b.offset;
const isCollapsed = (range: DocRange) => samePos(range.anchor, range.head);
const collapsed = (pos: DocPos): DocRange => ({ anchor: pos, head: pos });

/** An op whose result has not been applied. `reflected` marks one the composed block's DOM already shows. */
interface PendingEntry {
  op: EditOp;
  reflected: boolean;
}

/** What the editor froze at `compositionstart`, so the composed block can be diffed at the end. */
interface CompositionSnapshot {
  block: BlockId;
  /** The block's flattened text when the composition began. */
  text: string;
  /** The selection then, in DOM coordinates (before the pending ops), as `domRange()` read it. */
  selection: DocRange;
  /** The non-reflected ops pending then; the composed block's DOM does not reflect these. */
  pending: EditOp[];
  /** The document as it stood then, for mapping the composed edit through `pending`. */
  view: PendingDocView;
}

/** The offset a delete of one unit reaches from `offset`, going backward or forward. */
function deleteBoundary(
  text: string,
  offset: number,
  granularity: "grapheme" | "word",
  backward: boolean
): number {
  if (typeof Intl.Segmenter !== "function") {
    return backward ? Math.max(0, offset - 1) : Math.min(text.length, offset + 1);
  }

  const segments = [...new Intl.Segmenter(undefined, { granularity }).segment(text)];
  // an atom is a unit of its own for a word delete, so a delete stops at it
  const wordLike = (i: number) =>
    segments[i].segment === ATOM_CHAR || segments[i].isWordLike !== false;

  if (backward) {
    let i = segments.findLastIndex((s) => s.index < offset);
    if (i < 0) {
      return 0;
    }
    if (granularity === "word") {
      while (i > 0 && !wordLike(i)) {
        i--;
      }
    }

    return segments[i].index;
  }

  let i = segments.findIndex((s) => s.index + s.segment.length > offset);
  if (i < 0) {
    return text.length;
  }
  if (granularity === "word") {
    while (i + 1 < segments.length && !wordLike(i)) {
      i++;
    }
  }

  return segments[i].index + segments[i].segment.length;
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
    this.styletag.textContent = `
      :host {
        display        : flex;
        flex-direction : column;
      }

      .rich-text-root {
        flex          : 1 1 auto;
        min-height    : 6em;
        overflow-y    : auto;
        padding       : 5px;
        outline       : none;
        white-space   : pre-wrap;
        overflow-wrap : anywhere;
        background    : var(--richtext-background);
      }

      .rich-text-root[readonly] {
        background : var(--richtext-readonly-background);
      }

      .rich-text-root ::selection {
        background : var(--richtext-selection-background);
      }
    `;
    this.shadow.appendChild(this.styletag);
    this.providerStyle = document.createElement("style");
    this.shadow.appendChild(this.providerStyle);

    const root = (this.root = document.createElement("div"));
    root.className = "rich-text-root";
    root.contentEditable = "true";
    root.spellcheck = false;

    const editor = this;
    this.bridge = {
      dispatch: (op) => this.dispatch(op),
      get readOnly() {
        return editor.readOnly;
      },
      selection   : () => this.selectionThroughPending(),
      select      : (range) => this.select(range),
      blockElement: (block) => blockElement(root, block),
      posFromPoint: (x, y) => this.posFromPoint(x, y),
      root,
      linkClicked: (link, event) => this.linkClicked(link, event),
    };

    root.addEventListener("beforeinput", (e) => this.onBeforeInput(e));
    root.addEventListener("keydown", (e) => this.onKeyDown(e));
    root.addEventListener("compositionstart", () => this.onCompositionStart());
    root.addEventListener("compositionend", () => this.onCompositionEnd());
    root.addEventListener("blur", () => this.endRun());
    root.addEventListener("copy", (e) => this.onCopy(e, false));
    root.addEventListener("cut", (e) => this.onCopy(e, true));

    this.shadow.appendChild(root);

    if (RichTextEditor.observeMutations) {
      this.observer = new MutationObserver((records) => {
        if (!this.composing) {
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

      this.docChanged(change);
      this.announce(change, info);
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
    const readOnly = this.readOnly;
    const editable = !readOnly && !this.disabled ? "true" : "false";

    if (this.root.getAttribute("contenteditable") !== editable) {
      this.root.contentEditable = editable;
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
    document.removeEventListener("selectionchange", this.onSelectionChange);
    this.observer?.disconnect();
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    super._ondestroy();
  }

  setCSS() {
    super.setCSS();

    const font = this.getDefault("DefaultText") as CSSFont;
    this.root.style.font = font.genCSS();
    this.root.style.color = font.color;

    // every theme key becomes a variable on the host, so a provider's static sheet reads them
    const set = (name: string, value: string) =>
      this.style.setProperty(`--richtext-${name}`, value);
    set("background", this.getDefault("background-color") as string);
    for (const key of THEME_COLORS) {
      set(key, this.getDefault(key) as string);
    }
    for (const key of THEME_FONTS) {
      set(key, (this.getDefault(key) as CSSFont).genCSS());
    }
    set("code-border-radius", `${this.getDefault("code-border-radius") as number}px`);
    set("link-underline", this.getDefault("link-underline") ? "underline" : "none");

    // The toolbar's sprite icons are white, so a brightness filter multiplies them to the text
    // color's luminance, which reads in a light theme and a dark one alike; the toolbar
    // helpers put the variable on each icon div, so a button's own background keeps its color
    const c = css2color(font.color);
    const luminance = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    this.style.setProperty("--richtext-icon-tint", `brightness(${luminance.toFixed(3)})`);

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
    if (this.readOnly) {
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

  /** The edit-mode default for a link click. Empty until the link popup lands. */
  protected linkDefault(_link: LinkInfo, _event: MouseEvent): void {}

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
    const session = this._session;
    if (session === undefined) {
      return;
    }

    this.endRun();
    await session.toolstack.undo(this.richCtx);
    this.endRun();
  }

  async redo(): Promise<void> {
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

    if (this._session === undefined || this._session.disposed || this.readOnly) {
      return;
    }

    for (const op of this.mapInput(e)) {
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
      this.refuse("insertTab");
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

    const content = session.provider.toClipboard(session.doc, range);
    e.clipboardData.setData("text/plain", content.blocks.join("\n"));
    if (content.html !== undefined) {
      e.clipboardData.setData("text/html", content.html);
    }
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

    const block = range.head.block;
    const element = blockElement(this.root, block);
    if (element === undefined) {
      return;
    }

    const blocks = [...view.blocks];
    const texts = new Map(blocks.map((id) => [id, view.blockText(id)]));

    this.snapshot = {
      block,
      text     : blockTextOf(element),
      selection: range,
      pending  : this.pending.filter((e) => !e.reflected).map((e) => e.op),
      view     : { blocks, blockText: (id) => texts.get(id) ?? "" },
    };
  }

  /** Diffs the composed block back into an edit and submits it, or falls back to a re-render. */
  private onCompositionEnd(): void {
    // Firefox queues the commit's mutation records before compositionend and delivers them
    // after this returns, when composing is already false; drop them so the observer stays quiet
    this.observer?.takeRecords();

    this.composing = false;
    const snapshot = this.snapshot;
    this.snapshot = undefined;

    if (snapshot === undefined || this._session === undefined || this._session.disposed) {
      this.refuseComposition(snapshot);
      return;
    }

    const element = blockElement(this.root, snapshot.block);
    const view = this.view();
    if (element === undefined || view === undefined || !rootReflects(this.root, view.blocks)) {
      this.refuseComposition(snapshot);
      return;
    }

    const sel = snapshot.selection;
    if (sel.anchor.block !== snapshot.block || sel.head.block !== snapshot.block) {
      this.refuseComposition(snapshot);
      return;
    }

    const edit = composedEdit(snapshot.text, blockTextOf(element), [
      sel.anchor.offset,
      sel.head.offset,
    ]);

    if (edit === undefined) {
      // nothing composed, or an abandoned composition: the DOM is back to the block's text, but
      // a held result may have moved the document on, so re-render the block and restore the caret
      this.rerenderComposed(snapshot);
      return;
    }
    if ("refused" in edit) {
      this.refuseComposition(snapshot);
      return;
    }

    const map = (offset: number): DocPos =>
      mapThroughPending({ block: snapshot.block, offset }, snapshot.pending, snapshot.view);
    const range: DocRange = { anchor: map(edit.range[0]), head: map(edit.range[1]) };
    const op: EditOp =
      edit.text.length > 0
        ? { type: "insertText", at: range, text: edit.text }
        : { type: "deleteRange", range };

    // the browser already put the composed text in the block, so this op's DOM write is a
    // no-op; mark it reflected so a position read before its result does not shift by it
    this.submit(op, true);
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

  /** The `EditOp`s one input event asks for: none when it is refused or handled directly. */
  mapInput(e: InputEvent): EditOp[] {
    const session = this._session;
    const view = this.view();
    if (session === undefined || view === undefined) {
      return [];
    }

    const type = e.inputType;

    if (type === "historyUndo") {
      void this.undo();
      return [];
    }
    if (type === "historyRedo") {
      void this.redo();
      return [];
    }

    const mark = FORMAT_MARKS[type];
    if (mark !== undefined) {
      if (!session.provider.marks().some((m) => m.name === mark)) {
        return this.refuse(type);
      }
      const range = this.inputRange(e);
      return range === undefined || isCollapsed(range) ? [] : [{ type: "toggleMark", range, mark }];
    }

    if (type === "insertText") {
      const range = this.inputRange(e);
      if (typeof e.data !== "string" || range === undefined) {
        return this.refuse(type);
      }

      return [{ type: "insertText", at: range, text: e.data }];
    }

    if (type === "insertParagraph" || type === "insertLineBreak") {
      const range = this.inputRange(e);
      if (range === undefined) {
        return this.refuse(type);
      }

      const ops: EditOp[] = [];
      const start = this.orderRange(range, view).start;
      if (!isCollapsed(range)) {
        ops.push({ type: "deleteRange", range });
      }
      ops.push({ type: "splitBlock", at: start, newBlock: newBlockId() });

      return ops;
    }

    if (type === "insertFromPaste" || type === "insertFromDrop") {
      const range = this.inputRange(e);
      const content = e.dataTransfer ? session.provider.fromClipboard(e.dataTransfer) : undefined;
      if (range === undefined || content === undefined || content.blocks.length === 0) {
        return this.refuse(type);
      }

      const newBlocks = content.blocks.slice(1).map(() => newBlockId());
      return [{ type: "insertContent", at: range, content, newBlocks }];
    }

    if (BACKWARD_DELETES.has(type) || FORWARD_DELETES.has(type) || type === "deleteByCut") {
      return this.mapDelete(e, type, view);
    }

    return this.refuse(type);
  }

  private mapDelete(e: InputEvent, type: string, view: PendingDocView): EditOp[] {
    const range = this.inputRange(e);
    if (range === undefined) {
      return this.refuse(type);
    }

    let { start, end } = this.orderRange(range, view);

    if (samePos(start, end)) {
      // a collapsed target range is the browser saying there is nothing to delete
      if (type === "deleteByCut" || e.getTargetRanges().length > 0) {
        return [];
      }

      const text = view.blockText(start.block);
      const index = view.blocks.indexOf(start.block);
      const granularity = WORD_DELETES.has(type) ? "word" : "grapheme";

      if (BACKWARD_DELETES.has(type)) {
        if (start.offset === 0) {
          return index > 0 ? [{ type: "joinWithPrevious", block: start.block }] : [];
        }
        start = {
          block : start.block,
          offset: deleteBoundary(text, start.offset, granularity, true),
        };
      } else {
        if (end.offset >= text.length) {
          const next = view.blocks[index + 1];
          return next === undefined ? [] : [{ type: "joinWithPrevious", block: next }];
        }
        end = { block: end.block, offset: deleteBoundary(text, end.offset, granularity, false) };
      }
    }

    const si = view.blocks.indexOf(start.block);
    const ei = view.blocks.indexOf(end.block);
    const boundaryOnly =
      ei === si + 1 && start.offset >= view.blockText(start.block).length && end.offset === 0;

    if (boundaryOnly) {
      return [{ type: "joinWithPrevious", block: end.block }];
    }

    return [{ type: "deleteRange", range: { anchor: start, head: end } }];
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

    const toolop = new DocEditOp(
      op,
      session.provider.inverse(session.doc, op),
      session.id,
      this.pathUndoGen
    );
    const result = toolop.result(this);
    const entry: PendingEntry = { op, reflected };
    this.pending.push(entry);

    let applied: EditResult;
    try {
      // the result settles inside exec, before the stack's own promise does; a throw on the
      // way there is the only reason to wait on that one
      const run = ctx.toolstack.foldOrExec(ctx, toolop);
      applied = await Promise.race([result, run.then(() => result)]);
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

    if (own !== undefined && view !== undefined) {
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

  private orderRange(range: DocRange, view: PendingDocView) {
    const ai = view.blocks.indexOf(range.anchor.block);
    const hi = view.blocks.indexOf(range.head.block);
    const forward = ai < hi || (ai === hi && range.anchor.offset <= range.head.offset);

    return forward
      ? { start: range.anchor, end: range.head }
      : { start: range.head, end: range.anchor };
  }

  private renderAll(): void {
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

    const { provider, doc } = session;
    this.root.replaceChildren(
      ...provider.blocks(doc).map((id) => provider.renderBlock(doc, id, ctx))
    );
    this.observer?.takeRecords();
    this.needsRender = false;
    this.updateEmbedded(this.root);
  }

  /** Re-renders the dirty blocks, drops the removed ones and places the selection. */
  private applyResult(result: EditResult | DocChange): void {
    const session = this._session;
    const ctx = this.richCtx;
    if (session === undefined || ctx === undefined) {
      return;
    }

    const { provider, doc } = session;
    const root = this.root;

    // during a composition the browser owns the composed block and the caret; its render, its
    // removal and every caret write are held until compositionend renders the composition
    const held = this.composing ? this.snapshot?.block : undefined;

    for (const id of result.removedBlocks) {
      if (id !== held) {
        blockElement(root, id)?.remove();
      }
    }

    const order = provider.blocks(doc);
    const dirty = result.dirtyBlocks
      .filter((id) => id !== held)
      .map((id) => ({ id, index: order.indexOf(id) }))
      .filter((entry) => entry.index >= 0)
      .sort((a, b) => a.index - b.index);

    for (const { id, index } of dirty) {
      const fresh = provider.renderBlock(doc, id, ctx);
      const old = blockElement(root, id);

      if (old !== undefined) {
        old.replaceWith(fresh);
      } else if (index === 0) {
        root.prepend(fresh);
      } else {
        const prev = blockElement(root, order[index - 1]);
        if (prev !== undefined) {
          prev.after(fresh);
        } else {
          root.append(fresh);
        }
      }
      this.updateEmbedded(fresh);
    }

    this.observer?.takeRecords();

    // hold every caret write while composing, so a result from elsewhere does not move the
    // caret out of the composition the browser is running
    if (result.selection !== undefined && !this.composing) {
      this.setSelection(result.selection);
    }
    this.syncToolbar();
  }

  private setSelection(range: DocRange): void {
    const anchor = fromDocPos(this.root, range.anchor);
    const head = fromDocPos(this.root, range.head);
    const sel = this.domSelection();
    if (anchor === undefined || head === undefined || sel === null) {
      return;
    }

    sel.setBaseAndExtent(anchor.node, anchor.offset, head.node, head.offset);
  }

  private domSelection(): Selection | null {
    const shadow = this.shadow as ShadowRoot & { getSelection?(): Selection | null };
    return shadow.getSelection?.() ?? document.getSelection();
  }

  /** The selection's endpoints as DOM positions inside the root, if it is there. */
  private selectionEndpoints(): { anchor: DomPos; head: DomPos } | undefined {
    const sel = this.domSelection();
    if (sel === null || sel.rangeCount === 0) {
      return undefined;
    }

    const composed = (
      sel as Selection & {
        getComposedRanges?(options: { shadowRoots: ShadowRoot[] }): StaticRange[];
      }
    ).getComposedRanges?.({ shadowRoots: [this.shadow] });

    if (composed !== undefined && composed.length > 0) {
      const r = composed[0];
      const backward = this.isBackward(sel, r);
      const start = { node: r.startContainer, offset: r.startOffset };
      const end = { node: r.endContainer, offset: r.endOffset };
      return backward ? { anchor: end, head: start } : { anchor: start, head: end };
    }

    if (sel.anchorNode === null || sel.focusNode === null) {
      return undefined;
    }

    return {
      anchor: { node: sel.anchorNode, offset: sel.anchorOffset },
      head  : { node: sel.focusNode, offset: sel.focusOffset },
    };
  }

  private isBackward(sel: Selection, range: StaticRange): boolean {
    if (sel.anchorNode === null || sel.focusNode === null) {
      return false;
    }
    if (sel.anchorNode === sel.focusNode) {
      return sel.anchorOffset > sel.focusOffset;
    }

    return sel.anchorNode === range.endContainer && sel.anchorOffset === range.endOffset;
  }

  /** A DOM position to a document one; a position on the root itself lands on a block edge. */
  private docPos(node: Node, offset: number): DocPos | undefined {
    const view = this.view();
    if (view === undefined) {
      return undefined;
    }

    if (node === this.root) {
      const kids = this.root.children;
      if (offset < kids.length) {
        const block = kids[offset].getAttribute("data-doc-block");
        return block === null ? undefined : { block, offset: 0 };
      }

      const last = view.blocks[view.blocks.length - 1];
      return last === undefined ? undefined : { block: last, offset: view.blockText(last).length };
    }

    return toDocPos(this.root, node, offset);
  }

  private domRange(): DocRange | undefined {
    const ends = this.selectionEndpoints();
    if (ends === undefined) {
      return undefined;
    }

    const anchor = this.docPos(ends.anchor.node, ends.anchor.offset);
    const head = this.docPos(ends.head.node, ends.head.offset);
    return anchor !== undefined && head !== undefined ? { anchor, head } : undefined;
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
      theme: {
        DefaultText           : t.font,
        "background-color"    : t.color,
        "readonly-background" : t.color,
        "selection-background": t.color,
        "link-color"          : t.color,
        "link-underline"      : t.bool,
        "code-font"           : t.font,
        "code-background"     : t.color,
        "code-border-radius"  : t.number,
        "quote-border-color"  : t.color,
        "quote-text-color"    : t.color,
        "marker-color"        : t.color,
        "heading-font"        : t.font,
        "hr-color"            : t.color,
        "opaque-background"   : t.color,
      },
    };
  }
}

UIBase.internalRegister(RichTextEditor);
