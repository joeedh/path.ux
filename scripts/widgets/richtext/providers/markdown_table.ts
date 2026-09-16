import { fromMarkdown } from "mdast-util-from-markdown";
import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown } from "mdast-util-gfm";
import type { PhrasingContent } from "mdast";
import type { MdDoc } from "./markdown_model";
import type { DocumentCommand } from "../widget";
import type { EditOp } from "../provider";
import { changeTable, validateTable } from "../table_model";
import type { TableChange, TableModel } from "../table_model";

function supported(node: PhrasingContent): boolean {
  switch (node.type) {
    case "text":
    case "inlineCode":
      return true;
    case "strong":
    case "emphasis":
    case "delete":
    case "link":
      return node.children.every(supported);
    default:
      return false;
  }
}

/** Reads a supported GFM table without rewriting its authored cell source. */
export function parseMarkdownTable(source: string): TableModel | undefined {
  if (source.length > 1000000) return undefined;
  const tree = fromMarkdown(source, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });
  const node = tree.children[0];
  if (tree.children.length !== 1 || node?.type !== "table") return undefined;
  const align = node.align ?? node.children[0].children.map(() => null);
  if (node.children.length * align.length > 10000) return undefined;
  const rows: string[][] = [];
  for (const row of node.children) {
    if (row.children.length > align.length) return undefined;
    const cells: string[] = [];
    for (const cell of row.children) {
      if (!cell.children.every(supported)) return undefined;
      if (!cell.children.length) {
        cells.push("");
        continue;
      }
      const start = cell.children[0].position?.start.offset;
      const end = cell.children.at(-1)?.position?.end.offset;
      if (start === undefined || end === undefined) return undefined;
      cells.push(source.slice(start, end).trim());
    }
    while (cells.length < align.length) cells.push("");
    rows.push(cells);
  }
  const result = { rows, align };
  try {
    validateTable(result);
  } catch {
    return undefined;
  }
  return result;
}

/** Escapes table delimiters while preserving existing escapes and inline Markdown. */
function cellSource(value: string): string {
  if (/[\r\n\t]/.test(value)) throw new Error("Cells must contain one line of inline Markdown");
  let result = "";
  let slashes = 0;
  for (const char of value.trim()) {
    if (char === "|" && slashes % 2 === 0) result += "\\";
    result += char;
    slashes = char === "\\" ? slashes + 1 : 0;
  }
  // A trailing escape must not consume the closing table delimiter
  if (slashes % 2) result += "\\";
  return result;
}

/** Writes ordinary GFM and refuses content the cell editor cannot retain. */
export function serializeMarkdownTable(model: TableModel): string {
  validateTable(model);
  const rows = model.rows.map((r) => r.map(cellSource));
  const line = (r: readonly string[]) => `| ${r.join(" | ")} |`;
  const separator = model.align.map((a) =>
    a === "center" ? ":---:" : a === "left" ? ":---" : a === "right" ? "---:" : "---"
  );
  const source = [line(rows[0]), line(separator), ...rows.slice(1).map(line)].join("\n");
  const parsed = parseMarkdownTable(source);
  if (!parsed || JSON.stringify(parsed.rows) !== JSON.stringify(rows)) {
    throw new Error("Unsupported inline table content");
  }
  return source;
}

/** Builds a complete provider operation; snapshots retain the original source for undo. */
export function tableEditOp(
  block: string,
  expected: string,
  model: TableModel
): EditOp & { type: "custom" } {
  if (!parseMarkdownTable(expected)) throw new Error("Unsupported table source");
  return {
    type  : "custom",
    name  : "table",
    blocks: [block],
    data  : { expected, source: serializeMarkdownTable(model) },
  };
}

/** Resolves a table replacement against its source under the shared history lock. */
export function tableCommand(
  doc: MdDoc,
  block: string,
  expected: string,
  model: TableModel
): DocumentCommand {
  const op = tableEditOp(block, expected, model);
  return {
    resolve: () => {
      const current = doc.blocks.find((b) => b.id === block);
      return current?.kind === "table" && current.source === expected ? op : undefined;
    },
  };
}

/** Builds cell, structure, alignment and rectangular paste operations from one source snapshot. */
export function markdownTableChange(block: string, expected: string, change: TableChange): EditOp {
  const model = parseMarkdownTable(expected);
  if (!model) throw new Error("Unsupported table source");
  return tableEditOp(block, expected, changeTable(model, change));
}
