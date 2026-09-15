import { UIBase } from "../../core/ui_base";
import type { IContextBase } from "../../core/context_base";
import type { UIBaseDefinition } from "../../core/base/ui_base_types";
import type { PathWatchInfo } from "../../path-controller/controller/pathwatch";
import { DocumentSession } from "./context";
import { RichTextEditor } from "./editor";
import { newBlockId } from "./provider";
import { PlainProvider, plainDocFromLines } from "./providers/plain";
import type { PlainDoc } from "./providers/plain";

const LINE_BREAK = /\r\n|\r|\n/;

/**
 * A rich text field bound to a string datapath, the way `TextArea` is for plain text: a
 * `rich-text-x` over a `PlainDoc` the widget holds, on the context's toolstack. The value is
 * the block texts joined by newlines; marks live in the session for the widget's lifetime.
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
  readonly editor: RichTextEditor<CTX, PlainDoc>;
  private readonly provider = new PlainProvider();
  private readonly doc: PlainDoc = plainDocFromLines([""], () => newBlockId());
  private _session?: DocumentSession<PlainDoc>;
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

    this.editor = UIBase.createElement<RichTextEditor<CTX, PlainDoc>>(
      RichTextEditor.define().tagname
    );
    // exposed as a part, so a consumer styles it with ::part(editor) and a test finds it
    this.editor.setAttribute("part", "editor");
    this.shadow.appendChild(this.editor);
  }

  // The DocEditOp on the stack is the undo entry; a DataPathSetOp per write would double it
  override get useDataPathUndo() {
    return false;
  }

  override set useDataPathUndo(_val: boolean) {}

  /** The session the field's editor shows; `undefined` until the widget has a context. */
  get session(): DocumentSession<PlainDoc> | undefined {
    return this._session;
  }

  get value(): string {
    return this.doc.blocks.map((block) => block.text).join("\n");
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
    session.onChange(() => this.pushValue());
    this._session = session;
    this.editor.session = session;
  }

  private load(value: string): void {
    this.lastValue = value;

    const removedBlocks = this.doc.blocks.map((block) => block.id);
    this.doc.blocks = plainDocFromLines(value.split(LINE_BREAK), () => newBlockId()).blocks;

    this.provider.notifyChange(this.doc, {
      dirtyBlocks: this.doc.blocks.map((block) => block.id),
      removedBlocks,
    });
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
