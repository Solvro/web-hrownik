/**
 * Minimal RFC4180-ish parser for CSV/TSV text. Delimiter is auto-detected
 * from the header line (tab wins if present, since Google Sheets exports
 * members as TSV) so the same import UI accepts both.
 */
export function parseDelimitedText(text: string): string[][] {
  const normalized = text.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  const firstLineEnd = normalized.indexOf("\n");
  const firstLine =
    firstLineEnd === -1 ? normalized : normalized.slice(0, firstLineEnd);
  const delimiter = firstLine.includes("\t") ? "\t" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < normalized.length; index++) {
    const char = normalized[index];
    if (inQuotes) {
      if (char === '"') {
        if (normalized[index + 1] === '"') {
          field += '"';
          index++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === delimiter) {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += char;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}
