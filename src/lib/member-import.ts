import { parseDelimitedText } from "@/lib/csv";
import type {
  EmailKind,
  MemberStatus,
  memberImportSheetTypeOptions,
} from "@/lib/schemas/members";

/**
 * The club's historical member spreadsheet is split into four tabs, each
 * exported separately (one file per status) with a slightly different set
 * of columns. Status isn't a column in any of them — it's implied by which
 * tab/file a row came from, so the importer is told which one it's looking
 * at instead of trying to infer it.
 */
export type MemberImportSheetType =
  (typeof memberImportSheetTypeOptions)[number];

export const memberImportSheetStatus: Record<
  MemberImportSheetType,
  MemberStatus
> = {
  active: "active",
  new: "new",
  inactive: "inactive",
  honorary: "honorary",
};

export interface ParsedMemberImportRow {
  rowNumber: number;
  fullName: string;
  status: MemberStatus;
  email: string | null;
  emailKind: EmailKind;
  githubUsername: string | null;
  discordId: string | null;
  facebookUrl: string | null;
  studentIndex: string | null;
  studyDepartment: string | null;
  studyField: string | null;
  studyYear: string | null;
  sectionNames: string[];
  parentName: string | null;
  joinedAt: Date | null;
  noteLines: string[];
}

export interface MemberImportParseResult {
  rows: ParsedMemberImportRow[];
  /** Data rows that had neither a first nor a last name and were skipped. */
  blankRowsSkipped: number;
  /** Header names expected for this sheet type but missing from the file. */
  missingColumns: string[];
}

const commonHeaders = {
  firstName: "Imię",
  lastName: "Nazwisko",
  index: "Index",
  mail: "Mail",
  joinedAt: "Data dołączenia",
  parent: "Rodzic",
  department: "Wydział",
  field: "Kierunek",
  year: "Rok",
  // Despite the header name, this column holds Facebook profile links in
  // the real export, not Messenger handles — there is no separate Facebook
  // column in any of the four sheets.
  facebook: "Messenger",
  discord: "Discord",
  github: "Github",
  notes: "Uwagi",
  bio: "Zdanie o sobie na stronę",
  otherExperience: "Inne doświadcznie zawodowe/PWr",
  otherRoles: "Inne sekcje/projekty/role",
  declarationSigned: "Podpisane oświadczenie",
} as const;

const sheetSpecificHeaders: Record<MemberImportSheetType, string[]> = {
  active: [
    "Główna sekcja",
    "Inne sekcje",
    "Obecne projekty",
    "Przeszłe projekty",
    "Obecna rola",
  ],
  new: ["Obecna sekcja", "Obecny projekt", "Obecna rola"],
  honorary: [
    "Sekcje",
    "Projekty",
    "Data statusu członka honorowego",
    "Retrospekcja",
  ],
  inactive: [
    "Sekcje",
    "Projekty",
    "Data zakończenia działalności",
    "Retrospekcja / Powód odejścia",
  ],
};

const placeholderValues = new Set(["-", "brak", "nie dotyczy", "n/a"]);

function addNote(
  noteLines: string[],
  label: string,
  value: string | undefined,
): void {
  if (value !== undefined) {
    noteLines.push(`${label}: ${value}`);
  }
}

function cleanText(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed === "" || placeholderValues.has(trimmed.toLowerCase())) {
    return undefined;
  }
  return trimmed;
}

function splitList(value: string | undefined): string[] {
  const cleaned = cleanText(value);
  if (cleaned === undefined) {
    return [];
  }
  return cleaned
    .split(",")
    .map((part) => part.trim())
    .filter(
      (part) => part !== "" && !placeholderValues.has(part.toLowerCase()),
    );
}

export const emailPattern = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;

function extractGithubUsername(raw: string): string {
  const match = /github\.com\/([^/?#]+)/i.exec(raw);
  return match === null ? raw : match[1];
}

function normalizeStudyYear(raw: string): string {
  return raw
    .replace(/inżynierki$/i, "inżynierski")
    .replace(/magisterki$/i, "magisterski");
}

export function parseMemberImportFile(
  sheetType: MemberImportSheetType,
  fileContents: string,
): MemberImportParseResult {
  const table = parseDelimitedText(fileContents);
  if (table.length === 0) {
    return { rows: [], blankRowsSkipped: 0, missingColumns: [] };
  }

  const [headerRow, ...dataRows] = table;
  const headerIndex = new Map<string, number>();
  for (const [index, header] of headerRow.entries()) {
    headerIndex.set(header.trim(), index);
  }

  const expectedHeaders = [
    ...Object.values(commonHeaders),
    ...sheetSpecificHeaders[sheetType],
  ];
  const missingColumns = expectedHeaders.filter(
    (header) => !headerIndex.has(header),
  );

  function get(row: string[], header: string): string | undefined {
    const index = headerIndex.get(header);
    if (index === undefined) {
      return undefined;
    }
    return row[index];
  }

  const status = memberImportSheetStatus[sheetType];
  const rows: ParsedMemberImportRow[] = [];
  let blankRowsSkipped = 0;

  for (const [dataRowIndex, row] of dataRows.entries()) {
    const firstName = cleanText(get(row, commonHeaders.firstName));
    const lastName = cleanText(get(row, commonHeaders.lastName));
    if (firstName === undefined && lastName === undefined) {
      blankRowsSkipped++;
      continue;
    }
    const fullName = [firstName, lastName].filter(Boolean).join(" ");

    const noteLines: string[] = [];

    const rawMail = cleanText(get(row, commonHeaders.mail));
    let email: string | null = null;
    let emailKind: EmailKind = "notification";
    if (rawMail !== undefined) {
      if (emailPattern.test(rawMail)) {
        email = rawMail.toLowerCase();
        emailKind = email.endsWith("pwr.edu.pl") ? "login" : "notification";
      } else {
        addNote(
          noteLines,
          "Kontakt (nieprawidłowy adres e-mail w arkuszu)",
          rawMail,
        );
      }
    }

    const rawFacebook = cleanText(get(row, commonHeaders.facebook));
    let facebookUrl: string | null = null;
    if (rawFacebook !== undefined) {
      if (/^https?:\/\//i.test(rawFacebook)) {
        facebookUrl = rawFacebook;
      } else {
        addNote(noteLines, "Kontakt (Messenger/inne)", rawFacebook);
      }
    }

    const rawGithub = cleanText(get(row, commonHeaders.github));
    const githubUsername =
      rawGithub === undefined ? null : extractGithubUsername(rawGithub);

    const rawDiscord = cleanText(get(row, commonHeaders.discord));
    const discordId = rawDiscord ?? null;

    const rawYear = cleanText(get(row, commonHeaders.year));
    const studyYear =
      rawYear === undefined ? null : normalizeStudyYear(rawYear);

    const rawJoinedAt = cleanText(get(row, commonHeaders.joinedAt));
    let joinedAt: Date | null = null;
    if (rawJoinedAt !== undefined) {
      const parsed = new Date(`${rawJoinedAt}T00:00:00`);
      joinedAt = Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const sectionNames: string[] = [];
    switch (sheetType) {
      case "active": {
        sectionNames.push(
          ...splitList(get(row, "Główna sekcja")),
          ...splitList(get(row, "Inne sekcje")),
        );
        addNote(
          noteLines,
          "Obecne projekty",
          cleanText(get(row, "Obecne projekty")),
        );
        addNote(
          noteLines,
          "Przeszłe projekty",
          cleanText(get(row, "Przeszłe projekty")),
        );
        addNote(noteLines, "Obecna rola", cleanText(get(row, "Obecna rola")));

        break;
      }
      case "new": {
        sectionNames.push(...splitList(get(row, "Obecna sekcja")));
        addNote(
          noteLines,
          "Obecny projekt",
          cleanText(get(row, "Obecny projekt")),
        );
        addNote(noteLines, "Obecna rola", cleanText(get(row, "Obecna rola")));

        break;
      }
      case "honorary": {
        sectionNames.push(...splitList(get(row, "Sekcje")));
        addNote(noteLines, "Projekty", cleanText(get(row, "Projekty")));
        addNote(
          noteLines,
          "Data statusu członka honorowego",
          cleanText(get(row, "Data statusu członka honorowego")),
        );
        addNote(noteLines, "Retrospekcja", cleanText(get(row, "Retrospekcja")));

        break;
      }
      case "inactive": {
        sectionNames.push(...splitList(get(row, "Sekcje")));
        addNote(noteLines, "Projekty", cleanText(get(row, "Projekty")));
        addNote(
          noteLines,
          "Data zakończenia działalności",
          cleanText(get(row, "Data zakończenia działalności")),
        );
        addNote(
          noteLines,
          "Retrospekcja / Powód odejścia",
          cleanText(get(row, "Retrospekcja / Powód odejścia")),
        );
        break;
      }
    }

    addNote(noteLines, "Uwagi", cleanText(get(row, commonHeaders.notes)));
    addNote(
      noteLines,
      "Zdanie o sobie",
      cleanText(get(row, commonHeaders.bio)),
    );
    addNote(
      noteLines,
      "Inne doświadczenie zawodowe/PWr",
      cleanText(get(row, commonHeaders.otherExperience)),
    );
    addNote(
      noteLines,
      "Inne sekcje/projekty/role",
      cleanText(get(row, commonHeaders.otherRoles)),
    );
    const declaration = cleanText(get(row, commonHeaders.declarationSigned));
    if (declaration !== undefined) {
      addNote(
        noteLines,
        "Oświadczenie podpisane",
        declaration.toUpperCase() === "TRUE"
          ? "tak"
          : declaration.toUpperCase() === "FALSE"
            ? "nie"
            : declaration,
      );
    }

    rows.push({
      rowNumber: dataRowIndex + 2, // +1 for 0-index, +1 for header row
      fullName,
      status,
      email,
      emailKind,
      githubUsername,
      discordId,
      facebookUrl,
      studentIndex: cleanText(get(row, commonHeaders.index)) ?? null,
      studyDepartment: cleanText(get(row, commonHeaders.department)) ?? null,
      studyField: cleanText(get(row, commonHeaders.field)) ?? null,
      studyYear,
      sectionNames: [...new Set(sectionNames)],
      parentName: cleanText(get(row, commonHeaders.parent)) ?? null,
      joinedAt,
      noteLines,
    });
  }

  return { rows, blankRowsSkipped, missingColumns };
}
