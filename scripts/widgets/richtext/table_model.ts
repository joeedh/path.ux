/** A rectangular table whose first row is the header; cells contain authored inline source. */
export interface TableModel {
  readonly rows: readonly (readonly string[])[];
  readonly align: readonly ("left" | "center" | "right" | null)[];
}

export type TableChange =
  | { type: "cell"; row: number; column: number; value: string }
  | { type: "insertRow" | "removeRow"; row: number }
  | { type: "insertColumn" | "removeColumn"; column: number }
  | { type: "align"; column: number; value: TableModel["align"][number] }
  | { type: "paste"; row: number; column: number; cells: readonly (readonly string[])[] };

/** Rejects malformed and oversized models before allocating or changing a table. */
export function validateTable(model: TableModel): void {
  const width = model.align.length;
  if (
    !width ||
    !model.rows.length ||
    width * model.rows.length > 10000 ||
    model.align.some((a) => a !== null && a !== "left" && a !== "center" && a !== "right") ||
    model.rows.some((r) => r.length !== width || r.some((c) => typeof c !== "string")) ||
    model.rows.reduce((n, r) => n + r.reduce((m, c) => m + c.length, 0), 0) > 1000000
  ) {
    throw new Error(
      "Table must be rectangular, with a header and at most 10,000 cells / 1 MB of source"
    );
  }
}

/** Applies one structural or cell change to a new model. Row zero always remains the header. */
export function changeTable(model: TableModel, change: TableChange): TableModel {
  validateTable(model);
  const rows = model.rows.map((r) => [...r]);
  const align = [...model.align];
  const index = (value: number, limit: number) => {
    if (!Number.isInteger(value) || value < 0 || value >= limit)
      throw new Error("Invalid table index");
  };
  if ("row" in change) index(change.row, rows.length + (change.type === "insertRow" ? 1 : 0));
  if ("column" in change)
    index(change.column, align.length + (change.type === "insertColumn" ? 1 : 0));
  switch (change.type) {
    case "cell":
      rows[change.row][change.column] = change.value;
      break;
    case "insertRow":
      if (change.row === 0) throw new Error("Insert body rows after the header");
      rows.splice(
        change.row,
        0,
        align.map(() => "")
      );
      break;
    case "removeRow":
      if (change.row === 0) throw new Error("The header cannot be removed");
      rows.splice(change.row, 1);
      break;
    case "insertColumn":
      align.splice(change.column, 0, null);
      rows.forEach((r) => r.splice(change.column, 0, ""));
      break;
    case "removeColumn":
      if (align.length === 1) throw new Error("The last column cannot be removed");
      align.splice(change.column, 1);
      rows.forEach((r) => r.splice(change.column, 1));
      break;
    case "align":
      align[change.column] = change.value;
      break;
    case "paste": {
      const width = change.cells[0]?.length ?? 0;
      if (
        !width ||
        change.cells.some((r) => r.length !== width) ||
        change.row + change.cells.length > rows.length ||
        change.column + width > align.length
      ) {
        throw new Error("Paste a rectangle that fits the existing table");
      }
      change.cells.forEach((r, y) =>
        r.forEach((v, x) => (rows[change.row + y][change.column + x] = v))
      );
      break;
    }
  }
  const result = { rows, align };
  validateTable(result);
  return result;
}
