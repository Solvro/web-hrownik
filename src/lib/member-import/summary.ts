export interface ImportRowResult {
  rowNumber: number;
  fullName: string;
  outcome: "created" | "skipped_duplicate" | "error";
  detail?: string;
}

export interface ImportSummary<Row extends ImportRowResult = ImportRowResult> {
  created: number;
  skipped: number;
  errors: number;
  rows: Row[];
}

export function summarizeImport<Row extends ImportRowResult>(
  rows: Row[],
): ImportSummary<Row> {
  return {
    created: rows.filter((row) => row.outcome === "created").length,
    skipped: rows.filter((row) => row.outcome === "skipped_duplicate").length,
    errors: rows.filter((row) => row.outcome === "error").length,
    rows,
  };
}
