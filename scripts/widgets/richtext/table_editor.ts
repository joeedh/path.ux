import { changeTable } from "./table_model";
import type { TableChange, TableModel } from "./table_model";
import type { DocumentCommand, WidgetContext, WidgetState, WidgetView } from "./widget";
import type { DraftPreparation } from "./drafts";

export interface TableSnapshot {
  readonly revision: string;
  readonly model: TableModel;
}

/** Encodes a table edit without mutating storage; history resolves the returned command. */
export interface TableAdapter {
  command(expected: TableSnapshot, model: TableModel): DocumentCommand;
  history?(redo: boolean): void | Promise<unknown>;
}

/** Edits inline source in native inputs and retains drafts independently for each view. */
export class TableEditor implements WidgetView {
  readonly element = document.createElement("div");
  private table = document.createElement("table");
  private toolbar = document.createElement("div");
  private status = document.createElement("span");
  private inputs: HTMLInputElement[][] = [];
  private latest: TableSnapshot;
  private base: TableSnapshot;
  private model: TableModel;
  private dirty = false;
  private version = 0;
  private readOnly = false;
  private busy = false;
  private composing = false;
  private anchor = { row: 0, column: 0 };
  private head = { row: 0, column: 0 };
  private unregister: () => void;

  constructor(
    snapshot: TableSnapshot,
    key: string,
    private context: WidgetContext,
    private adapter: TableAdapter
  ) {
    this.latest = this.base = snapshot;
    this.model = structuredClone(snapshot.model);
    this.element.className = "table-editor";
    this.table.setAttribute("aria-label", "Table cells (inline Markdown)");
    this.toolbar.setAttribute("role", "toolbar");
    this.toolbar.setAttribute("aria-label", "Table operations");
    this.status.setAttribute("role", "status");
    this.element.append(this.table, this.toolbar, this.status);
    this.button("Apply cells", () => void this.commit());
    this.button("Discard drafts", () => this.discard(), true);
    this.button("Insert row below", () => this.edit({ type: "insertRow", row: this.head.row + 1 }));
    this.button("Remove row", () => this.edit({ type: "removeRow", row: this.head.row }));
    this.button("Insert column after", () =>
      this.edit({ type: "insertColumn", column: this.head.column + 1 })
    );
    this.button("Remove column", () =>
      this.edit({ type: "removeColumn", column: this.head.column })
    );
    for (const value of [null, "left", "center", "right"] as const) {
      this.button(`Align ${value ?? "default"}`, () =>
        this.edit({ type: "align", column: this.head.column, value })
      );
    }
    this.element.addEventListener("compositionstart", () => (this.composing = true));
    this.element.addEventListener("compositionend", () => (this.composing = false));
    this.element.addEventListener("copy", (e) => this.copy(e, false));
    this.element.addEventListener("cut", (e) => this.copy(e, true));
    this.element.addEventListener("paste", (e) => this.paste(e));
    this.unregister = context.registerDraft({
      key,
      pending  : () => this.dirty,
      version  : () => this.version,
      prepare  : () => this.prepare(),
      committed: () => this.committed(),
      discard  : () => this.discard(),
      recover  : () => ({ base: structuredClone(this.base), model: structuredClone(this.model) }),
    });
    this.draw();
  }

  private button(label: string, action: () => void, recovery = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.dataset.recovery = String(recovery);
    button.addEventListener("click", () => {
      if (!this.busy && !this.composing && (recovery || !this.readOnly)) action();
    });
    this.toolbar.append(button);
  }

  private prepare(): DraftPreparation {
    if (this.composing || this.busy || this.readOnly || !this.context.isCurrent())
      return { status: "refused" };
    if (this.latest.revision !== this.base.revision)
      return {
        status: "conflict",
        reason: "Table changed in another view; copy or discard this draft",
      };
    try {
      return { status: "ready", command: this.adapter.command(this.base, this.model) };
    } catch (error) {
      return { status: "unencodable", reason: String(error) };
    }
  }

  private committed() {
    this.dirty = false;
    this.base = this.latest;
    this.model = structuredClone(this.latest.model);
    this.status.textContent = "";
    this.draw();
  }

  private discard() {
    this.version++;
    this.committed();
  }

  private async commit() {
    if (!this.dirty) return;
    const prepared = this.prepare();
    if (prepared.status !== "ready") {
      this.status.textContent = prepared.reason ?? prepared.status;
      return;
    }
    const version = this.version;
    this.busy = true;
    this.draw();
    const result = await this.context.command(prepared.command);
    this.busy = false;
    if (result.status === "applied" && version === this.version) this.committed();
    else
      this.status.textContent =
        result.status === "applied" ? "Draft changed during commit" : result.status;
    this.draw();
  }

  private edit(change: TableChange) {
    if (this.readOnly || this.busy || this.composing) return;
    try {
      const next = changeTable(this.model, change);
      if (JSON.stringify(next) === JSON.stringify(this.model) && !this.dirty) return;
      // Validate before replacing the local draft, including rectangular paste
      this.adapter.command(this.base, next);
      this.model = next;
      this.dirty = true;
      this.version++;
      this.draw();
      void this.commit();
    } catch (error) {
      this.status.textContent = String(error);
    }
  }

  private selection() {
    return {
      top   : Math.min(this.anchor.row, this.head.row),
      bottom: Math.max(this.anchor.row, this.head.row),
      left  : Math.min(this.anchor.column, this.head.column),
      right : Math.max(this.anchor.column, this.head.column),
    };
  }

  private copy(event: ClipboardEvent, cut: boolean) {
    const target = event.composedPath()[0];
    if (!(target instanceof HTMLInputElement) || !event.clipboardData) return;
    // A native text selection owns its clipboard operation
    if (target.selectionStart !== target.selectionEnd) return;
    event.preventDefault();
    event.stopPropagation();
    const { top, bottom, left, right } = this.selection();
    const cells = this.model.rows.slice(top, bottom + 1).map((r) => r.slice(left, right + 1));
    event.clipboardData.setData("text/plain", cells.map((r) => r.join("\t")).join("\n"));
    if (cut)
      this.edit({
        type  : "paste",
        row   : top,
        column: left,
        cells : cells.map((r) => r.map(() => "")),
      });
  }

  private paste(event: ClipboardEvent) {
    if (!(event.composedPath()[0] instanceof HTMLInputElement) || !event.clipboardData) return;
    const text = event.clipboardData.getData("text/plain").replace(/\r\n?/g, "\n");
    if (!/[\t\n]/.test(text)) return;
    event.preventDefault();
    event.stopPropagation();
    if (text.length > 1000000) {
      this.status.textContent = "Paste exceeds 1 MB";
      return;
    }
    const { top, left } = this.selection();
    this.edit({
      type  : "paste",
      row   : top,
      column: left,
      cells: text
        .replace(/\n$/, "")
        .split("\n")
        .map((r) => r.split("\t")),
    });
  }

  private key(event: KeyboardEvent, row: number, column: number) {
    if (event.isComposing || this.composing) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !this.dirty) {
      event.preventDefault();
      event.stopPropagation();
      if (!this.readOnly && !this.busy) {
        try {
          void Promise.resolve(this.adapter.history?.(event.shiftKey)).catch(
            (error: unknown) => (this.status.textContent = String(error))
          );
        } catch (error) {
          this.status.textContent = String(error);
        }
      }
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      void this.commit();
      return;
    }
    let nextRow = row;
    let nextColumn = column;
    if (event.key === "Tab") {
      const index = row * this.model.align.length + column + (event.shiftKey ? -1 : 1);
      if (index < 0 || index >= this.model.rows.length * this.model.align.length) {
        void this.commit();
        return;
      }
      nextRow = Math.floor(index / this.model.align.length);
      nextColumn = index % this.model.align.length;
      void this.commit();
    } else if (
      event.altKey &&
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
    ) {
      nextRow += event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
      nextColumn += event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    } else return;
    event.preventDefault();
    event.stopPropagation();
    const input = this.inputs[nextRow]?.[nextColumn];
    if (!input) return;
    const anchor = this.anchor;
    input.focus();
    this.head = { row: nextRow, column: nextColumn };
    this.anchor = event.altKey && event.shiftKey ? anchor : this.head;
    this.draw();
  }

  private draw() {
    const height = this.model.rows.length;
    const width = this.model.align.length;
    const shapeChanged = this.inputs.length !== height || this.inputs[0]?.length !== width;
    const tree = this.element.getRootNode() as Document | ShadowRoot;
    const restoreFocus =
      shapeChanged && !!tree.activeElement && this.table.contains(tree.activeElement);
    if (shapeChanged) {
      this.table.replaceChildren();
      this.inputs = this.model.rows.map((row, r) => {
        const tr = document.createElement("tr");
        const inputs = row.map((_, c) => {
          const cell = document.createElement(r === 0 ? "th" : "td");
          if (r === 0) (cell as HTMLTableCellElement).scope = "col";
          const input = document.createElement("input");
          input.type = "text";
          input.setAttribute("aria-label", `${r === 0 ? "Header" : `Row ${r}`} column ${c + 1}`);
          input.addEventListener("focus", () => {
            this.anchor = this.head = { row: r, column: c };
            this.draw();
          });
          input.addEventListener("pointerdown", (e) => {
            if (!e.shiftKey) return;
            e.preventDefault();
            const anchor = this.anchor;
            input.focus();
            this.anchor = anchor;
            this.head = { row: r, column: c };
            this.draw();
          });
          input.addEventListener("input", () => {
            this.model = {
              align: this.model.align,
              rows: this.model.rows.map((row, y) =>
                row.map((value, x) => (y === r && x === c ? input.value : value))
              ),
            };
            this.dirty = JSON.stringify(this.model) !== JSON.stringify(this.base.model);
            this.version++;
            this.status.textContent = this.dirty
              ? "Uncommitted cell source; Enter or Apply cells to commit"
              : "";
          });
          input.addEventListener("keydown", (e) => this.key(e, r, c));
          cell.append(input);
          tr.append(cell);
          return input;
        });
        (r === 0
          ? this.table.createTHead()
          : (this.table.tBodies[0] ?? this.table.createTBody())
        ).append(tr);
        return inputs;
      });
      this.anchor = this.head = {
        row   : Math.min(this.head.row, height - 1),
        column: Math.min(this.head.column, width - 1),
      };
    }
    const rect = this.selection();
    this.inputs.forEach((row, r) =>
      row.forEach((input, c) => {
        if (input.value !== this.model.rows[r][c]) input.value = this.model.rows[r][c];
        input.readOnly = this.readOnly || this.busy;
        input.style.textAlign = this.model.align[c] ?? "left";
        input.parentElement!.toggleAttribute(
          "data-selected",
          r >= rect.top && r <= rect.bottom && c >= rect.left && c <= rect.right
        );
      })
    );
    for (const button of this.toolbar.querySelectorAll("button")) {
      button.disabled = this.readOnly && button.dataset.recovery !== "true";
      button.setAttribute("aria-disabled", String(this.busy || button.disabled));
    }
    if (restoreFocus) this.inputs[this.head.row]?.[this.head.column]?.focus();
  }

  update(state: WidgetState) {
    this.latest = state.value as TableSnapshot;
    this.readOnly = state.readOnly;
    if (!this.dirty) {
      this.base = this.latest;
      this.model = structuredClone(this.latest.model);
    } else if (this.base.revision !== this.latest.revision)
      this.status.textContent = "Table changed; draft retained until committed or discarded";
    this.draw();
  }

  focus(last: boolean) {
    (last ? this.inputs.at(-1)?.at(-1) : this.inputs[0]?.[0])?.focus();
  }
  dispose() {
    this.unregister();
    this.element.remove();
  }
}
