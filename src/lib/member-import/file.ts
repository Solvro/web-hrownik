import readXlsxFile from "read-excel-file/node";

import { parseDelimitedText } from "@/lib/csv";

export interface ImportTable {
  headers: string[];
  rows: string[][];
  /** Spreadsheet row number of `rows[0]`, so messages point at the right row. */
  firstRowNumber: number;
}

export type ImportTableResult =
  { ok: true; table: ImportTable } | { ok: false; error: string };

/**
 * Reads the first sheet of an XLSX export (or a CSV) into trimmed strings.
 * Numbers are kept as their original text so long IDs (Discord snowflakes,
 * indices with leading zeros) aren't mangled into floats. Blank rows are
 * kept (and skipped later) so row numbers match the sheet; the CSV parser
 * drops blank lines, so there they count non-blank lines only.
 */
export async function readImportTable(file: File): Promise<ImportTableResult> {
  let table: string[][];
  if (/\.xlsx$/i.test(file.name)) {
    try {
      const [sheet] = await readXlsxFile(
        Buffer.from(await file.arrayBuffer()),
        { parseNumber: (value) => value },
      );
      table = sheet.data.map((row) => row.map((cell) => cellToString(cell)));
    } catch {
      return {
        ok: false,
        error:
          "Nie udało się odczytać pliku XLSX. Wgraj eksport uczestników z Eventownika.",
      };
    }
  } else if (/\.csv$/i.test(file.name)) {
    table = parseDelimitedText(await file.text());
  } else {
    return {
      ok: false,
      error: "Nieobsługiwany format pliku — wgraj plik .xlsx albo .csv.",
    };
  }

  const trimmed = table.map((row) => row.map((cell) => cell.trim()));
  const headerIndex = trimmed.findIndex((row) => !isBlank(row));
  const rows = trimmed.slice(headerIndex + 1);
  if (headerIndex === -1 || rows.every((row) => isBlank(row))) {
    return { ok: false, error: "Plik nie zawiera żadnych zgłoszeń." };
  }
  return {
    ok: true,
    table: {
      headers: trimmed[headerIndex],
      rows,
      firstRowNumber: headerIndex + 2,
    },
  };
}

function isBlank(row: string[]): boolean {
  return row.every((cell) => cell === "");
}

function cellToString(cell: string | boolean | Date | null): string {
  if (cell === null) {
    return "";
  }
  if (cell instanceof Date) {
    return cell.toISOString().slice(0, 10);
  }
  return String(cell);
}
