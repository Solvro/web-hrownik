import { and, eq, isNotNull } from "drizzle-orm";

import type { DatabaseExecutor } from "@/db";
import { db } from "@/db";
import { member, memberEmail } from "@/db/schema/members";
import { memberRecruitment } from "@/db/schema/recruitment";
import {
  createMemberRecord,
  getSectionMemberRole,
} from "@/lib/members/create-member";
import type { OnboardingAutomationResult } from "@/lib/onboarding";
import { runOnboardingAutomations } from "@/lib/onboarding";
import { assertCan } from "@/lib/permissions";
import type { RecruitmentImportRow } from "@/lib/schemas/member-import";
import {
  recruitmentAnalyzeInputSchema,
  recruitmentCommitSchema,
} from "@/lib/schemas/member-import";
import { emptyToNull } from "@/lib/utils";

import type {
  ColumnMapping,
  DetectedColumn,
  RecruitmentImportField,
  RequiredMapping,
} from "./columns";
import { detectColumns, missingRequiredFields } from "./columns";
import type { ImportTable } from "./file";
import { readImportTable } from "./file";
import type { DepartmentOption, FieldOfStudyOption } from "./matching";
import { matchDepartment, matchFieldOfStudy, matchSection } from "./matching";
import {
  githubUsernameFromPortfolio,
  normalizeDiscord,
  normalizeEmail,
  normalizeFacebookUrl,
  normalizeForMatching,
  normalizeGithubUsername,
  normalizeStudentIndex,
  normalizeStudyYear,
  splitList,
} from "./normalize";
import type { ImportRowResult, ImportSummary } from "./summary";
import { summarizeImport } from "./summary";

export interface UniversityReference {
  departments: DepartmentOption[];
  fieldsOfStudy: FieldOfStudyOption[];
}

export interface RecruitmentPreviewRow extends RecruitmentImportRow {
  /** Has a final section in the export, i.e. was accepted in recruitment. */
  accepted: boolean;
  warnings: string[];
  /** Set when the person already exists (or appears earlier in the file); never imported. */
  duplicateReason: string | null;
}

export interface RecruitmentAnalysis {
  headers: string[];
  mapping: ColumnMapping;
  detected: Partial<Record<RecruitmentImportField, DetectedColumn>>;
  missingFields: RequiredMapping[];
  rows: RecruitmentPreviewRow[];
}

export type RecruitmentAnalysisResult =
  { ok: true; analysis: RecruitmentAnalysis } | { ok: false; error: string };

export interface RecruitmentImportRowResult extends ImportRowResult {
  memberId?: string;
  onboarding?: OnboardingAutomationResult;
}

export type RecruitmentCommitResult =
  | { ok: true; summary: ImportSummary<RecruitmentImportRowResult> }
  | { ok: false; error: string };

const deniedMessage = "Tylko zarząd może importować członków.";

/**
 * Reads an uploaded Eventownik export and returns the column mapping (auto-
 * detected, or the board's override) and editable preview rows. Stateless:
 * a changed mapping re-sends the file, nothing is cached or written.
 */
export async function analyzeRecruitmentFile({
  actorMemberId,
  file,
  mapping,
  university,
}: {
  actorMemberId: string | null;
  file: unknown;
  mapping: unknown;
  university: UniversityReference;
}): Promise<RecruitmentAnalysisResult> {
  await assertCan(actorMemberId, "members", "write", deniedMessage);

  const input = recruitmentAnalyzeInputSchema.safeParse({ file, mapping });
  if (!input.success) {
    return { ok: false, error: input.error.issues[0].message };
  }
  const tableResult = await readImportTable(input.data.file);
  if (!tableResult.ok) {
    return tableResult;
  }
  const { headers, rows } = tableResult.table;

  const detected = detectColumns(headers, rows);
  const resolvedMapping =
    input.data.mapping ??
    Object.fromEntries(
      Object.entries(detected).map(([field, column]) => [
        field,
        column.columnIndex,
      ]),
    );
  if (Object.values(resolvedMapping).some((index) => index >= headers.length)) {
    return { ok: false, error: "Mapowanie wskazuje kolumnę spoza pliku." };
  }

  const analysis: RecruitmentAnalysis = {
    headers,
    mapping: resolvedMapping,
    detected,
    missingFields: missingRequiredFields(resolvedMapping),
    rows: [],
  };
  if (analysis.missingFields.length > 0) {
    return { ok: true, analysis };
  }

  const [sections, identities] = await Promise.all([
    db.query.section.findMany(),
    loadMemberIdentities(db),
  ]);
  analysis.rows = buildRecruitmentPreview({
    table: tableResult.table,
    mapping: resolvedMapping,
    sections,
    university,
    identities,
  });
  return { ok: true, analysis };
}

/**
 * Creates the reviewed rows as new members (status `new`), each in its own
 * transaction, so one failing row never undoes the others. Duplicates are
 * re-checked against the database at commit time and skipped — existing
 * members are never overwritten, so re-importing an export is safe.
 */
export async function commitRecruitmentRows({
  actorMemberId,
  input,
  university,
}: {
  actorMemberId: string | null;
  input: unknown;
  university: UniversityReference;
}): Promise<RecruitmentCommitResult> {
  await assertCan(actorMemberId, "members", "write", deniedMessage);

  const parsed = recruitmentCommitSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        "Dane importu są nieprawidłowe — wróć do podglądu i popraw zaznaczone pola.",
    };
  }
  const { edition, joinedAt } = parsed.data;
  const rows = parsed.data.rows.filter((row) => row.include);
  const startedAt = new Date(`${joinedAt}T00:00:00`);

  const identities = await loadMemberIdentities(db);
  const sectionMemberRole = rows.some((row) => row.sectionIds.length > 0)
    ? await getSectionMemberRole(db)
    : null;

  const results: RecruitmentImportRowResult[] = [];
  for (const row of rows) {
    const identity = rowIdentity(row);
    const duplicateReason = findDuplicate(identities, identity);
    if (duplicateReason !== null) {
      results.push({
        rowNumber: row.rowNumber,
        fullName: row.fullName,
        outcome: "skipped_duplicate",
        detail: duplicateReason,
      });
      continue;
    }

    if (!isKnownStudies(row, university)) {
      results.push({
        rowNumber: row.rowNumber,
        fullName: row.fullName,
        outcome: "error",
        detail: "Nieznany wydział lub kierunek — wybierz je z listy ToPWR.",
      });
      continue;
    }

    let created: typeof member.$inferSelect;
    try {
      created = await db.transaction(async (tx) => {
        const createdMember = await createMemberRecord(tx, {
          values: {
            fullName: row.fullName,
            status: "new",
            githubUsername: emptyToNull(row.githubUsername),
            discordId: emptyToNull(row.discordId),
            facebookUrl: emptyToNull(row.facebookUrl),
            studentIndex: emptyToNull(row.studentIndex),
            studyDepartment: emptyToNull(row.studyDepartment),
            studyField: emptyToNull(row.studyField),
            studyYear: emptyToNull(row.studyYear),
          },
          emails: [{ email: row.email, kind: row.emailKind }],
          roleAssignments:
            sectionMemberRole === null
              ? []
              : row.sectionIds.map((sectionId) => ({
                  roleDefinitionId: sectionMemberRole.id,
                  sectionId,
                  startedAt,
                })),
        });
        await tx.insert(memberRecruitment).values({
          memberId: createdMember.id,
          source: "eventownik",
          externalParticipantId: emptyToNull(row.externalId),
          edition,
          importedByMemberId: actorMemberId,
        });
        return createdMember;
      });
    } catch (error) {
      console.error(
        "[commitRecruitmentRows] row %d failed",
        row.rowNumber,
        error,
      );
      results.push({
        rowNumber: row.rowNumber,
        fullName: row.fullName,
        outcome: "error",
        detail: describeRowError(error),
      });
      continue;
    }
    rememberIdentity(identities, identity, {
      kind: "member",
      name: created.fullName,
    });

    // After the row's transaction: invites are side effects outside the
    // database and never undo (or misreport) the created member.
    const onboarding = await runOnboardingAutomations({
      member: { githubUsername: created.githubUsername },
      sendGithubInvite: row.onboarding.githubInvite,
      sendDiscordInvite: row.onboarding.discordInvite,
    });
    results.push({
      rowNumber: row.rowNumber,
      fullName: row.fullName,
      outcome: "created",
      memberId: created.id,
      onboarding,
    });
  }

  return { ok: true, summary: summarizeImport(results) };
}

/** Pure part of the analysis: table + mapping + reference data → preview rows. */
function buildRecruitmentPreview({
  table,
  mapping,
  sections,
  university,
  identities,
}: {
  table: ImportTable;
  mapping: ColumnMapping;
  sections: { id: string; name: string }[];
  university: UniversityReference;
  identities: MemberIdentityIndex;
}): RecruitmentPreviewRow[] {
  const previewRows: RecruitmentPreviewRow[] = [];
  // Accepted rows also shadow later rows of the same person (someone who
  // registered twice); rejected registrations never block an accepted one.
  const seen: MemberIdentityIndex = {
    byExternalId: new Map(identities.byExternalId),
    byEmail: new Map(identities.byEmail),
    byStudentIndex: new Map(identities.byStudentIndex),
    byGithubUsername: new Map(identities.byGithubUsername),
  };

  for (const [dataRowIndex, cells] of table.rows.entries()) {
    const rowNumber = table.firstRowNumber + dataRowIndex;
    const read = (field: RecruitmentImportField) => {
      const columnIndex = mapping[field];
      const value = columnIndex === undefined ? "" : (cells[columnIndex] ?? "");
      // The exact alias lookups need the cell text as read from the export.
      return field === "studyField" || field === "sections"
        ? value
        : value.replaceAll(/\s+/g, " ").trim();
    };
    const warnings: string[] = [];

    const fullName =
      read("fullName") ||
      [read("firstName"), read("lastName")].filter(Boolean).join(" ");
    const rawEmail = read("email");
    if (fullName === "" && rawEmail === "") {
      continue;
    }

    const email = normalizeEmail(rawEmail);
    if (email === null && rawEmail !== "") {
      warnings.push(rawValueWarning("Nieprawidłowy adres e-mail", rawEmail));
    }

    const rawIndex = read("studentIndex");
    const studentIndex = normalizeStudentIndex(rawIndex);
    if (studentIndex === null && rawIndex !== "") {
      warnings.push(
        rawValueWarning(
          "Nieprawidłowy numer indeksu — popraw ręcznie",
          rawIndex,
        ),
      );
    }

    const rawGithub = read("githubUsername");
    let githubUsername = normalizeGithubUsername(rawGithub);
    if (githubUsername === null && rawGithub !== "") {
      warnings.push(rawValueWarning("Nie rozpoznano konta GitHub", rawGithub));
    }
    githubUsername ??= githubUsernameFromPortfolio(read("githubPortfolio"));

    const rawDiscord = read("discordId");
    const discordId = normalizeDiscord(rawDiscord);
    if (discordId === null && rawDiscord !== "") {
      warnings.push(
        rawValueWarning("Nie rozpoznano konta Discord", rawDiscord),
      );
    }

    const rawFacebook = read("facebookUrl");
    const facebookUrl = normalizeFacebookUrl(rawFacebook);
    if (facebookUrl === null && rawFacebook !== "") {
      warnings.push(
        rawValueWarning("Facebook bez linku do profilu", rawFacebook),
      );
    }

    const rawYear = read("studyYear");
    const year = normalizeStudyYear(rawYear);
    if (year === null && rawYear !== "") {
      warnings.push(rawValueWarning("Nie rozpoznano roku studiów", rawYear));
    }

    const rawDepartment = read("studyDepartment");
    const department = matchDepartment(rawDepartment, university.departments);
    if (
      department === null &&
      rawDepartment !== "" &&
      normalizeForMatching(rawDepartment) !== "inny"
    ) {
      warnings.push(rawValueWarning("Nie rozpoznano wydziału", rawDepartment));
    }

    const rawField = read("studyField");
    const field =
      department === null
        ? null
        : matchFieldOfStudy(
            rawField,
            {
              department,
              studiesType: year?.studiesType ?? null,
            },
            university.fieldsOfStudy,
          );
    if (field === null && rawField !== "") {
      warnings.push(
        rawValueWarning("Nie dopasowano kierunku — wybierz z listy", rawField),
      );
    }

    const rawSections = read("sections");
    const sectionIds: string[] = [];
    for (const name of splitList(rawSections)) {
      const matched = matchSection(name, sections);
      if (matched === null) {
        warnings.push(
          rawValueWarning("Nie znaleziono sekcji — wybierz ręcznie", name),
        );
      } else if (!sectionIds.includes(matched.id)) {
        sectionIds.push(matched.id);
      }
    }

    const identity: MemberIdentity = {
      externalId: read("externalId"),
      email: email?.email ?? "",
      studentIndex: studentIndex ?? "",
      githubUsername: githubUsername ?? "",
    };
    const duplicateReason = findDuplicate(seen, identity);
    const accepted = mapping.sections === undefined || rawSections !== "";
    if (accepted) {
      rememberIdentity(seen, identity, { kind: "row", rowNumber });
    }
    previewRows.push({
      rowNumber,
      externalId: identity.externalId,
      include: accepted && duplicateReason === null,
      accepted,
      fullName,
      email: identity.email,
      emailKind: email?.kind ?? "notification",
      studentIndex: identity.studentIndex,
      githubUsername: identity.githubUsername,
      discordId: discordId ?? "",
      facebookUrl: facebookUrl ?? "",
      studyDepartment: department?.value ?? "",
      studyField: field?.value ?? "",
      studyYear: year?.studyYear ?? "",
      sectionIds,
      onboarding: { githubInvite: false, discordInvite: false },
      warnings,
      duplicateReason,
    });
  }

  return previewRows;
}

interface MemberIdentity {
  externalId: string;
  email: string;
  studentIndex: string;
  githubUsername: string;
}

type IdentityOwner =
  { kind: "member"; name: string } | { kind: "row"; rowNumber: number };

interface MemberIdentityIndex {
  byExternalId: Map<string, IdentityOwner>;
  byEmail: Map<string, IdentityOwner>;
  byStudentIndex: Map<string, IdentityOwner>;
  byGithubUsername: Map<string, IdentityOwner>;
}

/** Everything a recruitment row is deduplicated against, keyed case-insensitively. */
async function loadMemberIdentities(
  executor: DatabaseExecutor,
): Promise<MemberIdentityIndex> {
  const [members, emails, recruitments] = await Promise.all([
    executor
      .select({
        fullName: member.fullName,
        studentIndex: member.studentIndex,
        githubUsername: member.githubUsername,
      })
      .from(member),
    executor
      .select({ email: memberEmail.email, fullName: member.fullName })
      .from(memberEmail)
      .innerJoin(member, eq(memberEmail.memberId, member.id)),
    executor
      .select({
        externalId: memberRecruitment.externalParticipantId,
        fullName: member.fullName,
      })
      .from(memberRecruitment)
      .innerJoin(member, eq(memberRecruitment.memberId, member.id))
      .where(
        and(
          eq(memberRecruitment.source, "eventownik"),
          isNotNull(memberRecruitment.externalParticipantId),
        ),
      ),
  ]);

  const index: MemberIdentityIndex = {
    byExternalId: new Map(),
    byEmail: new Map(),
    byStudentIndex: new Map(),
    byGithubUsername: new Map(),
  };
  for (const existing of members) {
    setKey(
      index.byStudentIndex,
      existing.studentIndex,
      memberOwner(existing.fullName),
    );
    setKey(
      index.byGithubUsername,
      existing.githubUsername,
      memberOwner(existing.fullName),
    );
  }
  for (const existing of emails) {
    setKey(index.byEmail, existing.email, memberOwner(existing.fullName));
  }
  for (const existing of recruitments) {
    setKey(
      index.byExternalId,
      existing.externalId,
      memberOwner(existing.fullName),
    );
  }
  return index;
}

/**
 * Department and field must come from ToPWR (as the pickers offer them); a
 * field of study always comes with its own department.
 */
function isKnownStudies(
  row: RecruitmentImportRow,
  university: UniversityReference,
): boolean {
  if (row.studyField !== "") {
    return university.fieldsOfStudy.some(
      (field) =>
        field.value === row.studyField &&
        field.department === row.studyDepartment,
    );
  }
  return (
    row.studyDepartment === "" ||
    university.departments.some(
      (department) => department.value === row.studyDepartment,
    )
  );
}

function rowIdentity(row: RecruitmentImportRow): MemberIdentity {
  return {
    externalId: row.externalId,
    email: row.email,
    studentIndex: row.studentIndex,
    githubUsername: row.githubUsername,
  };
}

function findDuplicate(
  index: MemberIdentityIndex,
  identity: MemberIdentity,
): string | null {
  const byExternalId = getKey(index.byExternalId, identity.externalId);
  if (byExternalId !== undefined) {
    return `To zgłoszenie zostało już zaimportowane (${describeOwner(byExternalId, false)}).`;
  }
  const checks: [Map<string, IdentityOwner>, string, string][] = [
    [index.byEmail, identity.email, "adres e-mail"],
    [index.byStudentIndex, identity.studentIndex, "numer indeksu"],
    [index.byGithubUsername, identity.githubUsername, "konto GitHub"],
  ];
  for (const [map, value, label] of checks) {
    const owner = getKey(map, value);
    if (owner !== undefined) {
      return `${describeOwner(owner)} ma ten sam ${label}.`;
    }
  }
  return null;
}

function rememberIdentity(
  index: MemberIdentityIndex,
  identity: MemberIdentity,
  owner: IdentityOwner,
): void {
  setKey(index.byExternalId, identity.externalId, owner);
  setKey(index.byEmail, identity.email, owner);
  setKey(index.byStudentIndex, identity.studentIndex, owner);
  setKey(index.byGithubUsername, identity.githubUsername, owner);
}

function describeOwner(owner: IdentityOwner, sentenceStart = true): string {
  const description =
    owner.kind === "member"
      ? `członek „${owner.name}”`
      : `wiersz ${owner.rowNumber} w pliku`;
  return sentenceStart
    ? description.charAt(0).toUpperCase() + description.slice(1)
    : description;
}

function setKey(
  map: Map<string, IdentityOwner>,
  value: string | null,
  owner: IdentityOwner,
): void {
  const key = value?.trim().toLowerCase() ?? "";
  if (key !== "" && !map.has(key)) {
    map.set(key, owner);
  }
}

function getKey(
  map: Map<string, IdentityOwner>,
  value: string,
): IdentityOwner | undefined {
  return value.trim() === "" ? undefined : map.get(value.trim().toLowerCase());
}

function describeRowError(error: unknown): string {
  const cause = error instanceof Error ? error.cause : undefined;
  const code =
    typeof cause === "object" && cause !== null && "code" in cause
      ? cause.code
      : undefined;
  if (code === "23505") {
    return "Członek z tymi danymi już istnieje.";
  }
  if (code === "23503") {
    return "Wybrana sekcja już nie istnieje.";
  }
  return "Nie udało się zapisać tego wiersza.";
}

function rawValueWarning(message: string, raw: string): string {
  const value = raw.length > 60 ? `${raw.slice(0, 59)}…` : raw;
  return `${message}: „${value}”`;
}

function memberOwner(name: string): IdentityOwner {
  return { kind: "member", name };
}
