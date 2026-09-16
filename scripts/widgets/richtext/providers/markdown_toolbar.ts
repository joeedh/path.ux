import type { RowFrame } from "../../../core/ui_containers";
import { EnumProperty } from "../../../path-controller/toolsys/toolprop";
import { openLinkPopup } from "../link_popup";
import { newBlockId } from "../provider";
import type { DocRange, DocumentProvider, ProviderContext, ToolbarSync } from "../provider";
import type { MdBlock, MdDoc, MdMark } from "./markdown_model";
import { blockOf, isOpaque, orderRange } from "./markdown_doc";
import { markdownOps } from "./markdown_ops";
import type { MdKindTarget } from "./markdown_ops";
import { addMarkButtons, addSeparator, addToolButton } from "./toolbar";

// The markdown provider's toolbar row: the block-kind dropdown, the mark buttons, the list
// toggles and the Link button, each editing through the bridge on the row's context.

/** The kinds the toolbar's dropdown offers, in its order. */
const KIND_CHOICES: readonly { key: string; label: string; kind: MdKindTarget }[] = [
  { key: "paragraph", label: "Paragraph", kind: { kind: "paragraph" } },
  { key: "heading1", label: "Heading 1", kind: { kind: "heading", level: 1 } },
  { key: "heading2", label: "Heading 2", kind: { kind: "heading", level: 2 } },
  { key: "heading3", label: "Heading 3", kind: { kind: "heading", level: 3 } },
  { key: "heading4", label: "Heading 4", kind: { kind: "heading", level: 4 } },
  { key: "heading5", label: "Heading 5", kind: { kind: "heading", level: 5 } },
  { key: "heading6", label: "Heading 6", kind: { kind: "heading", level: 6 } },
  { key: "quote", label: "Quote", kind: { kind: "quote" } },
  { key: "code", label: "Code block", kind: { kind: "code" } },
];

/** The dropdown key that shows a block's kind; a list item shows as the paragraph it holds. */
function kindKey(b: MdBlock): string {
  switch (b.kind) {
    case "heading":
      return `heading${b.level}`;
    case "quote":
    case "code":
      return b.kind;
    default:
      return "paragraph";
  }
}

/**
 * Fills `row` for `provider`. Each edit goes over the blocks the selection spans; the sync
 * keeps the last document and selection so a press can find them after the button has taken
 * the pointer.
 */
export function buildMarkdownToolbar(
  row: RowFrame<ProviderContext>,
  ctx: ProviderContext,
  provider: DocumentProvider<MdDoc>
): ToolbarSync<MdDoc> {
  let lastDoc: MdDoc | undefined;
  let lastSelection: DocRange | undefined;

  const current = () => {
    const doc = lastDoc;
    const range = ctx.editor.selection() ?? lastSelection;
    if (doc === undefined || range === undefined) {
      return undefined;
    }
    const r = orderRange(doc, range);
    const editable = doc.blocks.slice(r.startIndex, r.endIndex + 1).filter((b) => !isOpaque(b));
    return editable.length === 0 ? undefined : { doc, range, editable };
  };

  const setKind = (kind: MdKindTarget) => {
    const cur = current();
    if (cur === undefined) {
      return;
    }
    // a fence that splits needs one fresh id per line beyond its first
    const lines =
      kind.kind === "code"
        ? 0
        : cur.editable
            .filter((b) => b.kind === "code")
            .reduce((n, b) => n + b.text.split("\n").length - 1, 0);
    const ids = lines > 0 ? Array.from({ length: lines }, () => newBlockId()) : undefined;
    void ctx.editor.dispatch(
      markdownOps.setKind(
        cur.editable.map((b) => b.id),
        kind,
        { ids, selection: cur.range }
      )
    );
  };

  const kindProp = new EnumProperty(
    "paragraph",
    Object.fromEntries(KIND_CHOICES.map((c) => [c.key, c.key])),
    undefined,
    "Block"
  ).addUINames(Object.fromEntries(KIND_CHOICES.map((c) => [c.key, c.label])));
  const kinds = row.listenum(undefined, {
    enumDef : kindProp,
    callback: (id) => {
      const choice = KIND_CHOICES.find((c) => c.key === id);
      if (choice !== undefined) {
        setKind(choice.kind);
      }
    },
  });
  kinds.setAttribute("data-testid", "richtext-kind");
  kinds.description = "Kind of the block at the cursor";
  kinds.setValue("paragraph");

  addSeparator(row);
  const syncMarks = addMarkButtons(row, ctx, provider);
  addSeparator(row);

  // a list toggle lit for the whole span turns it back into paragraphs
  const listButton = (
    glyph: string,
    label: string,
    testid: string,
    lit: (b: MdBlock) => boolean,
    kind: MdKindTarget
  ) => {
    const btn = addToolButton(row, glyph, label, () => {
      const cur = current();
      if (cur === undefined) {
        return;
      }
      setKind(cur.editable.every(lit) ? { kind: "paragraph" } : kind);
    });
    btn.setAttribute("data-testid", testid);
    return { btn, lit };
  };
  const lists = [
    listButton(
      "&bull;",
      "Bulleted list",
      "richtext-list-bullet",
      (b) => b.kind === "listItem" && !b.ordered && !b.task,
      { kind: "listItem", ordered: false, task: false }
    ),
    listButton(
      "1.",
      "Numbered list",
      "richtext-list-numbered",
      (b) => b.kind === "listItem" && b.ordered && !b.task,
      { kind: "listItem", ordered: true, task: false }
    ),
    listButton(
      "&#9745;",
      "Task list",
      "richtext-list-task",
      (b) => b.kind === "listItem" && b.task === true,
      { kind: "listItem", ordered: false, task: true }
    ),
  ];

  addSeparator(row);
  const link = addToolButton(row, "Link", "Link the selection", () => {
    const cur = current();
    const range = cur?.range;
    if (cur === undefined || range === undefined || range.anchor.block !== range.head.block) {
      return;
    }
    if (range.anchor.offset === range.head.offset) {
      return;
    }
    const block = cur.editable[0];
    const from = Math.min(range.anchor.offset, range.head.offset);
    const existing = block.marks.find(
      (m): m is MdMark & { name: "link" } => m.name === "link" && m.from <= from && from < m.to
    );
    const rect = link.getBoundingClientRect();
    openLinkPopup(
      row,
      ctx.editor,
      {
        range,
        kind  : existing?.kind ?? "url",
        target: existing?.target ?? "",
        title : existing?.title,
      },
      rect.left,
      rect.bottom + 4
    );
  });
  link.setAttribute("data-testid", "richtext-link");

  return (doc, selection) => {
    lastDoc = doc;
    lastSelection = selection;
    syncMarks(doc, selection);

    const head = selection === undefined ? undefined : blockOf(doc, selection.head.block);
    kinds.setValue(head === undefined ? "paragraph" : kindKey(head));
    for (const { btn, lit } of lists) {
      btn.active = head !== undefined && lit(head);
    }
    link.active =
      head !== undefined &&
      selection !== undefined &&
      head.marks.some(
        (m) => m.name === "link" && m.from < selection.head.offset && selection.head.offset <= m.to
      );
  };
}
