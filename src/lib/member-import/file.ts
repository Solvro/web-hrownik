import readXlsxFile from "read-excel-file/node";

import { parseDelimitedText } from "@/lib/csv";

export interface ImportTable {
  headers: string[];
  rows: string[][];
}

export type ImportTableResult =
  { ok: true; table: ImportTable } | { ok: false; error: string };

/**
 * Reads the first sheet of an XLSX export (or a CSV) into trimmed strings.
 * Numbers are kept as their original text so long IDs (Discord snowflakes,
 * indices with leading zeros) aren't mangled into floats.
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

  const [headers = [], ...rows] = table
    .map((row) => row.map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell !== ""));
  if (rows.length === 0) {
    return { ok: false, error: "Plik nie zawiera żadnych zgłoszeń." };
  }
  return { ok: true, table: { headers, rows } };
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
