import type { WidgetOptions } from "./widget";
import { UIBase } from "../../core/ui_base";
import type { IContextBase } from "../../core/context_base";
import type { UIBaseDefinition } from "../../core/base/ui_base_types";
import type { PathWatchInfo } from "../../path-controller/controller/pathwatch";
import { DocumentSession, replaceContentsOp } from "./context";
import { RichTextEditor } from "./editor";
import { newBlockId } from "./provider";
import type { DocumentProvider } from "./provider";
import { PlainProvider, plainDocFromLines } from "./providers/plain";
import type { PlainDoc } from "./providers/plain";

const LINE_BREAK = /\r\n|\r|\n/;

/**
 * One way of holding a string datapath as a document: the provider that edits it and the
 * two conversions. Registered by name with `RichTextArea.registerFormat`; the markdown
 * module registers `"markdown"` when it is imported, so the parser never enters the barrel.
 */
export interface RichTextFormat<Doc> {
  provider(): DocumentProvider<Doc>;
  fromText(text: string): Doc;
  toText(doc: Doc): string;
}

/**
 * The registered formats, type-erased: `ToolbarSync` makes a provider invariant in its
 * document, so the one cast lives here and `format()` hands the entry back as `unknown`.
 */
const formats = new Map<string, RichTextFormat<unknown>>();

const plainFormat: RichTextFormat<PlainDoc> = {
  provider: () => new PlainProvider(),
  fromText: (text) => plainDocFromLines(text.split(LINE_BREAK), () => newBlockId()),
  toText  : (doc) => doc.blocks.map((b) => b.text).join("\n"),
};
// the registry's cast again, since the field holds whichever format it is given
const plainEntry = plainFormat as RichTextFormat<unknown>;

/**
 * A rich text field bound to a string datapath, the way `TextArea` is for plain text: a
 * `rich-text-x` over a document the widget holds, on the context's toolstack. `format` names
 * the registered `RichTextFormat` that parses the path's string into that document and
 * serializes it back: `plain` joins the block texts with newlines and keeps marks in the
 * session only, `markdown` round-trips them through the source.
 *
 * Every edit is the `DocEditOp` the editor pushes, and the path is written from its result
 * without an undo entry of its own. The session outlives the widget, so an undo after the
 * field is rebuilt still restores the path and the new field reloads from it.
 */
export class RichTextArea<CTX extends IContextBase = IContextBase> extends UIBase<
  CTX,
  string,
  "RichTextArea"
> {
  get widgetOptions(): WidgetOptions {
    return this.editor.widgetOptions;
  }
  set widgetOptions(options: WidgetOptions) {
    this.editor.widgetOptions = options;
  }
  get pendingDrafts() {
    return this._session?.pendingDrafts ?? [];
  }
  prepareSave() {
    return (
      this._session?.prepareSave() ?? Promise.resolve({ status: "ready" as const, revision: 0 })
    );
  }
  invalidateWidgetPolicy(): void {
    this.editor.invalidateWidgetPolicy();
  }

  private writeAllowed = true;
  setWriteAllowed(allowed: boolean): void {
    this.writeAllowed = allowed;
    this._session?.setWriteAllowed(allowed);
  }

  readonly editor: RichTextEditor<CTX, unknown>;
  private _format = "plain";
  private entry = plainEntry;
  private provider = plainEntry.provider();
  private doc = plainEntry.fromText("");
  private _session?: DocumentSession<unknown>;
  /** The value last written to or read from the path, so a watcher echo is not a change. */
  private lastValue = "";

  constructor() {
    super();

    const style = document.createElement("style");
    style.textContent = `
      :host {
        display : block;
      }

      rich-text-x {
        width : 100%;
      }
    `;
    this.shadow.appendChild(style);

    this.editor = UIBase.createElement<RichTextEditor<CTX, unknown>>(
      RichTextEditor.define().tagname
    );
    // exposed as a part, so a consumer styles it with ::part(editor) and a test finds it
    this.editor.setAttribute("part", "editor");
    this.shadow.appendChild(this.editor);
  }

  /** Registers a document format under `name`, replacing any earlier one of that name. */
  static registerFormat<Doc>(name: string, format: RichTextFormat<Doc>): void {
    formats.set(name, format as RichTextFormat<unknown>);
  }

  /** The format registered as `name`, or `undefined` when nothing has registered it yet. */
  static format(name: string): RichTextFormat<unknown> | undefined {
    return formats.get(name);
  }

  // The DocEditOp on the stack is the undo entry; a DataPathSetOp per write would double it
  override get useDataPathUndo() {
    return false;
  }

  override set useDataPathUndo(_val: boolean) {}

  /** The session the field's editor shows; `undefined` until the widget has a context. */
  get session(): DocumentSession<unknown> | undefined {
    return this._session;
  }

  /**
   * The name of the registered format the field edits the string as. Setting it re-parses
   * the current value into a fresh session, so the old format's edits leave the stack; a
   * name nothing has registered throws, since the module that registers it was not imported.
   */
  get format(): string {
    return this._format;
  }

  set format(name: string) {
    if (name === this._format) {
      return;
    }

    const entry = formats.get(name);
    if (entry === undefined) {
      throw new Error(`RichTextArea: no rich text format is registered as "${name}"`);
    }

    this.useFormat(entry);
    this._format = name;
  }

  /** Uses instance-owned provider configuration without registering application state globally. */
  useFormat<Doc>(format: RichTextFormat<Doc>): void {
    if (this.pendingDrafts.length)
      throw new Error("Prepare or discard drafts before changing format");
    const entry = format as RichTextFormat<unknown>;
    const provider = entry.provider();
    const doc = entry.fromText(this.lastValue);
    this.entry = entry;
    this.provider = provider;
    this.doc = doc;
    this._session?.dispose();
    this._session = undefined;
    this.openSession();
  }

  get value(): string {
    return this.entry.toText(this.doc);
  }

  /** Replaces the document; the path is not written and no `change` fires. */
  set value(value: string) {
    this.load(value);
  }

  init() {
    super.init();
    this.editor.checkInit();
    this.openSession();
  }

  update() {
    super.update();
    this.openSession();
  }

  /** Render-only mode, passed through to the hosted editor; the field's value still follows the path. */
  get readOnly(): boolean {
    return this.editor.readOnly;
  }

  set readOnly(value: boolean) {
    this.editor.readOnly = value;
  }

  // The editor is the only writer of its root's contenteditable, combining this with readOnly
  override __updateDisable(val: boolean): void {
    super.__updateDisable(val);
    this.editor.internalDisabled = val;
  }

  override updateFromPath(rawValue: unknown, info: PathWatchInfo): void {
    if (!info.resolved) {
      this.internalDisabled = true;
      return;
    }

    this.internalDisabled = false;

    const value = rawValue === undefined || rawValue === null ? "" : String(rawValue);
    if (value !== this.lastValue) {
      this.load(value);
    }
  }

  private openSession(): void {
    if (this._session !== undefined || this.ctx === undefined) {
      return;
    }

    const session = new DocumentSession(this.doc, this.provider, this.ctx.toolstack);
    session.setWriteAllowed(this.writeAllowed);
    // a load is the path's own value arriving, so it is not written back normalized
    session.onChange((_change, info) => {
      if (info.origin !== "external" && info.origin !== "policy") {
        this.pushValue();
      }
    });
    this._session = session;
    this.editor.session = session;
  }

  // A path write is not an edit: the contents swap outside the stack and the session hears
  // it as an external change, so the editor re-renders and keeps its own selection
  private load(value: string): void {
    this.lastValue = value;

    const next = this.entry.fromText(value);
    const { dirtyBlocks, removedBlocks } = this.provider.applyEdit(
      this.doc,
      replaceContentsOp(this.provider, this.doc, next)
    );
    this._session?.deliver({ dirtyBlocks, removedBlocks }, { origin: "external" });
  }

  private pushValue(): void {
    const value = this.value;
    if (value === this.lastValue) {
      return;
    }

    this.lastValue = value;

    const path = this.getAttribute("datapath");
    if (path !== null && this.ctx !== undefined) {
      this.setPathValue(this.ctx, path, value);
    }

    this.on_change?.(value);
    this.dispatchEvent(new CustomEvent("change", { detail: { value } }));
  }

  static define(): UIBaseDefinition {
    return {
      tagname       : "rich-text-area-x",
      style         : "richtext",
      modalKeyEvents: true,
    };
  }
}
UIBase.internalRegister(RichTextArea);

RichTextArea.registerFormat("plain", plainFormat);
