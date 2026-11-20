import { eq } from "drizzle-orm";
import * as z from "zod";

import { db } from "@/db";
import { member } from "@/db/schema/members";
import { section } from "@/db/schema/sections";
import { parseDelimitedText } from "@/lib/csv";
import { appendMemberHrNote } from "@/lib/member-hr-notes";
import {
  createMemberRecord,
  getSectionMemberRole,
} from "@/lib/members/create-member";
import { assertCan } from "@/lib/permissions";
import {
  memberImportCommitSchema,
  memberImportSheetTypeOptions,
} from "@/lib/schemas/members";
import type {
  EmailKind,
  MemberImportCommitInput,
  MemberStatus,
} from "@/lib/schemas/members";

import { extractGithubUsername } from "./normalize";
import type { ImportRowResult, ImportSummary } from "./summary";
import { summarizeImport } from "./summary";

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
  /** As written in the sheet (YYYY-MM-DD), so no time zone shifts it. */
  joinedAt: string | null;
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

const deniedMessage = "Tylko zarząd może importować członków.";

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

const emailPattern = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;

function normalizeStudyYear(raw: string): string {
  return raw
    .replace(/inżynierki$/i, "inżynierski")
    .replace(/magisterki$/i, "magisterski");
}

function parseMemberImportFile(
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
      rawGithub === undefined
        ? null
        : (extractGithubUsername(rawGithub) ?? rawGithub);

    const rawDiscord = cleanText(get(row, commonHeaders.discord));
    const discordId = rawDiscord ?? null;

    const rawYear = cleanText(get(row, commonHeaders.year));
    const studyYear =
      rawYear === undefined ? null : normalizeStudyYear(rawYear);

    const rawJoinedAt = cleanText(get(row, commonHeaders.joinedAt));
    const joinedAt =
      rawJoinedAt === undefined ||
      Number.isNaN(new Date(`${rawJoinedAt}T00:00:00`).getTime())
        ? null
        : rawJoinedAt;

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

export interface LegacyImportPreviewRow {
  key: string;
  rowNumber: number;
  include: boolean;
  fullName: string;
  status: MemberStatus;
  email: string;
  emailKind: "login" | "notification";
  githubUsername: string;
  discordId: string;
  facebookUrl: string;
  studentIndex: string;
  studyDepartment: string;
  studyField: string;
  studyYear: string;
  joinedAt: string;
  sectionNames: string[];
  parentId: string;
  parentNameRaw: string;
  noteLines: string[];
  duplicateReason: string | null;
}

export interface LegacyImportPreviewResult {
  rows: LegacyImportPreviewRow[];
  blankRowsSkipped: number;
  missingColumns: string[];
  existingMembers: { id: string; fullName: string }[];
  existingSections: { id: string; name: string }[];
}

interface MemberLookupSource {
  id: string;
  fullName: string;
  studentIndex: string | null;
  emails: { email: string }[];
}

function buildNameIndex(members: MemberLookupSource[]): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const existing of members) {
    addToNameIndex(index, existing.fullName, existing.id);
  }
  return index;
}

function addToNameIndex(
  index: Map<string, string[]>,
  fullName: string,
  id: string,
): void {
  const key = normalizeName(fullName);
  index.set(key, [...(index.get(key) ?? []), id]);
}

function buildIndexIndex(members: MemberLookupSource[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const existing of members) {
    if (existing.studentIndex !== null) {
      index.set(existing.studentIndex.trim().toLowerCase(), existing.id);
    }
  }
  return index;
}

function buildEmailIndex(members: MemberLookupSource[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const existing of members) {
    for (const email of existing.emails) {
      index.set(email.email.toLowerCase(), existing.id);
    }
  }
  return index;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replaceAll(/\s+/g, " ");
}

/**
 * Parses the uploaded sheet and returns an editable preview: one row per
 * person, with a best-effort duplicate check and parent suggestion, but
 * nothing written to the database yet. The board reviews/edits the rows
 * (parent, sections, contact info, whether to include a row at all) before
 * calling commitLegacyImport.
 */
export async function previewLegacyImport({
  actorMemberId,
  sheetType,
  fileContents,
}: {
  actorMemberId: string | null;
  sheetType: MemberImportSheetType;
  fileContents: string;
}): Promise<LegacyImportPreviewResult> {
  await assertCan(actorMemberId, "members", "write", deniedMessage);

  const { rows, missingColumns, blankRowsSkipped } = parseMemberImportFile(
    z.enum(memberImportSheetTypeOptions).parse(sheetType),
    fileContents,
  );

  const existingMembers = await db.query.member.findMany({
    with: { emails: true },
  });
  const existingSections = await db.query.section.findMany();

  const nameToIds = buildNameIndex(existingMembers);
  const indexToId = buildIndexIndex(existingMembers);
  const emailToId = buildEmailIndex(existingMembers);

  const previewRows: LegacyImportPreviewRow[] = rows.map((row) => {
    const duplicateId =
      (row.studentIndex === null
        ? undefined
        : indexToId.get(row.studentIndex.trim().toLowerCase())) ??
      (row.email === null ? undefined : emailToId.get(row.email));

    const parentCandidates =
      row.parentName === null
        ? []
        : (nameToIds.get(normalizeName(row.parentName)) ?? []);

    return {
      key: String(row.rowNumber),
      rowNumber: row.rowNumber,
      include: duplicateId === undefined,
      fullName: row.fullName,
      status: row.status,
      email: row.email ?? "",
      emailKind: row.emailKind,
      githubUsername: row.githubUsername ?? "",
      discordId: row.discordId ?? "",
      facebookUrl: row.facebookUrl ?? "",
      studentIndex: row.studentIndex ?? "",
      studyDepartment: row.studyDepartment ?? "",
      studyField: row.studyField ?? "",
      studyYear: row.studyYear ?? "",
      joinedAt: row.joinedAt ?? "",
      sectionNames: row.sectionNames,
      parentId: parentCandidates.length === 1 ? parentCandidates[0] : "",
      parentNameRaw: row.parentName ?? "",
      noteLines: row.noteLines,
      duplicateReason:
        duplicateId === undefined
          ? null
          : "Członek z tym indeksem lub adresem e-mail już istnieje.",
    };
  });

  return {
    rows: previewRows,
    blankRowsSkipped,
    missingColumns,
    existingMembers: existingMembers
      .map((existing) => ({ id: existing.id, fullName: existing.fullName }))
      .toSorted((a, b) => a.fullName.localeCompare(b.fullName)),
    existingSections: existingSections
      .map((existingSection) => ({
        id: existingSection.id,
        name: existingSection.name,
      }))
      .toSorted((a, b) => a.name.localeCompare(b.name)),
  };
}

/**
 * Creates the reviewed/edited rows from the import preview. Never sends
 * onboarding invites (GitHub org / Discord) — those only make sense for
 * genuinely new members going through onboarding, not a historical data
 * migration.
 */
export async function commitLegacyImport({
  actorMemberId,
  rows: rowsInput,
}: {
  actorMemberId: string | null;
  rows: MemberImportCommitInput;
}): Promise<ImportSummary> {
  await assertCan(actorMemberId, "members", "write", deniedMessage);

  const rows = memberImportCommitSchema
    .parse(rowsInput)
    .filter((row) => row.include);

  const existingMembers = await db.query.member.findMany({
    with: { emails: true },
  });
  const existingSections = await db.query.section.findMany();

  const nameToIds = buildNameIndex(existingMembers);
  const indexToId = buildIndexIndex(existingMembers);
  const emailToId = buildEmailIndex(existingMembers);
  const sectionNameToId = new Map<string, string>();
  for (const existingSection of existingSections) {
    sectionNameToId.set(
      existingSection.name.trim().toLowerCase(),
      existingSection.id,
    );
  }

  async function resolveSectionId(name: string): Promise<string> {
    const key = name.trim().toLowerCase();
    const existingId = sectionNameToId.get(key);
    if (existingId !== undefined) {
      return existingId;
    }
    const [created] = await db
      .insert(section)
      .values({ name: name.trim() })
      .returning();
    sectionNameToId.set(key, created.id);
    return created.id;
  }

  const results: ImportRowResult[] = [];
  const createdRows: {
    id: string;
    parentId: string | null;
    parentNameRaw: string | null;
  }[] = [];

  for (const row of rows) {
    const email = row.email === "" ? null : row.email.toLowerCase();
    if (email !== null && !emailPattern.test(email)) {
      results.push({
        rowNumber: row.rowNumber,
        fullName: row.fullName,
        outcome: "error",
        detail: `Nieprawidłowy adres e-mail: ${email}`,
      });
      continue;
    }
    const studentIndex = row.studentIndex === "" ? null : row.studentIndex;

    const duplicateId =
      (studentIndex === null
        ? undefined
        : indexToId.get(studentIndex.toLowerCase())) ??
      (email === null ? undefined : emailToId.get(email));
    if (duplicateId !== undefined) {
      results.push({
        rowNumber: row.rowNumber,
        fullName: row.fullName,
        outcome: "skipped_duplicate",
        detail: "Członek z tym indeksem lub adresem e-mail już istnieje.",
      });
      continue;
    }

    try {
      const sectionIds = await Promise.all(
        row.sectionNames.map(async (name) => resolveSectionId(name)),
      );
      const hrNotes =
        row.noteLines.length > 0 ? row.noteLines.join("\n") : null;
      const explicitParentId = row.parentId === "" ? null : row.parentId;

      const sectionMemberRole =
        sectionIds.length > 0 ? await getSectionMemberRole(db) : null;

      const created = await db.transaction(async (tx) =>
        createMemberRecord(tx, {
          values: {
            fullName: row.fullName,
            parentId: explicitParentId,
            githubUsername: emptyToNull(row.githubUsername),
            discordId: emptyToNull(row.discordId),
            facebookUrl: emptyToNull(row.facebookUrl),
            studentIndex,
            studyDepartment: emptyToNull(row.studyDepartment),
            studyField: emptyToNull(row.studyField),
            studyYear: emptyToNull(row.studyYear),
            status: row.status,
            ...(row.joinedAt !== "" && {
              createdAt: new Date(`${row.joinedAt}T00:00:00`),
            }),
          },
          hrNotes,
          emails: email === null ? [] : [{ email, kind: row.emailKind }],
          roleAssignments:
            sectionMemberRole === null
              ? []
              : sectionIds.map((sectionId) => ({
                  roleDefinitionId: sectionMemberRole.id,
                  boardTermId: null,
                  sectionId,
                  projectId: null,
                  startedAt:
                    row.joinedAt === ""
                      ? new Date()
                      : new Date(`${row.joinedAt}T00:00:00`),
                  endedAt: null,
                })),
        }),
      );

      if (email !== null) {
        emailToId.set(email, created.id);
      }
      if (studentIndex !== null) {
        indexToId.set(studentIndex.toLowerCase(), created.id);
      }
      addToNameIndex(nameToIds, row.fullName, created.id);
      createdRows.push({
        id: created.id,
        parentId: explicitParentId,
        parentNameRaw: row.parentNameRaw === "" ? null : row.parentNameRaw,
      });
      results.push({
        rowNumber: row.rowNumber,
        fullName: row.fullName,
        outcome: "created",
      });
    } catch (error) {
      results.push({
        rowNumber: row.rowNumber,
        fullName: row.fullName,
        outcome: "error",
        detail: error instanceof Error ? error.message : "Nieznany błąd.",
      });
    }
  }

  // Rows where the board left the parent field unset fall back to
  // best-effort name matching across everyone just created plus the
  // existing database, the same way the parser's suggestion was built.
  for (const created of createdRows) {
    if (created.parentId !== null || created.parentNameRaw === null) {
      continue;
    }
    const candidates = (
      nameToIds.get(normalizeName(created.parentNameRaw)) ?? []
    ).filter((id) => id !== created.id);
    if (candidates.length === 1) {
      await db
        .update(member)
        .set({ parentId: candidates[0] })
        .where(eq(member.id, created.id));
    } else {
      const note =
        candidates.length === 0
          ? `Rodzic (nie znaleziono w bazie): ${created.parentNameRaw}`
          : `Rodzic (niejednoznaczny — kilku członków o tym imieniu i nazwisku): ${created.parentNameRaw}`;
      await appendMemberHrNote(created.id, note);
    }
  }

  return summarizeImport(results);
}

function emptyToNull(value: string): string | null {
  return value === "" ? null : value;
}
