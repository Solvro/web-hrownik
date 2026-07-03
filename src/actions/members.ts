"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { member, memberEmail } from "@/db/schema/members";
import { teamMember } from "@/db/schema/projects";
import { roleAssignment, roleDefinition } from "@/db/schema/roles";
import { section } from "@/db/schema/sections";
import { getCurrentMember } from "@/lib/current-member";
import { reattributeActivityForMember } from "@/lib/integrations/github-activity";
import type { MemberImportSheetType } from "@/lib/member-import";
import { emailPattern, parseMemberImportFile } from "@/lib/member-import";
import { runOnboardingAutomations } from "@/lib/onboarding";
import {
  can,
  canEditOwnProfile,
  getMemberPermissions,
} from "@/lib/permissions";
import {
  memberFormSchema,
  memberImportCommitSchema,
} from "@/lib/schemas/members";
import type {
  MemberFormValues,
  MemberImportCommitInput,
  MemberStatus,
} from "@/lib/schemas/members";
import { revokeTeamAccess } from "@/lib/team-sync";

export async function createMember(input: MemberFormValues) {
  const currentMember = await getCurrentMember();
  if (currentMember === null) {
    throw new Error("Unauthorized");
  }
  const permissions = await getMemberPermissions(currentMember.id);
  if (!can(permissions, "members", "write")) {
    throw new Error("Tylko zarząd może dodawać nowych członków.");
  }

  const values = memberFormSchema.parse(input);

  const [created] = await db
    .insert(member)
    .values({
      fullName: values.fullName,
      parentId: emptyToNull(values.parentId),
      githubUsername: emptyToNull(values.githubUsername),
      discordId: emptyToNull(values.discordId),
      facebookUrl: emptyToNull(values.facebookUrl),
      linkedinUrl: emptyToNull(values.linkedinUrl),
      instagramUrl: emptyToNull(values.instagramUrl),
      websiteUrl: emptyToNull(values.websiteUrl),
      photoUrl: emptyToNull(values.photoUrl),
      studentIndex: emptyToNull(values.studentIndex),
      studyDepartment: emptyToNull(values.studyDepartment),
      studyField: emptyToNull(values.studyField),
      studyYear: emptyToNull(values.studyYear),
      bio: emptyToNull(values.bio),
      hrNotes: emptyToNull(values.hrNotes),
      status: values.status,
    })
    .returning();

  if (values.emails.length > 0) {
    await db.insert(memberEmail).values(
      values.emails.map((email) => ({
        memberId: created.id,
        email: normalizeEmail(email.email),
        kind: email.kind,
      })),
    );
  }

  if (values.roleAssignments.length > 0) {
    const roleDefinitions =
      values.roleAssignments.length === 0
        ? []
        : await db.query.roleDefinition.findMany({
            where: inArray(
              roleDefinition.id,
              values.roleAssignments.map((role) => role.roleDefinitionId),
            ),
          });
    const roleDefinitionById = new Map(
      roleDefinitions.map((role) => [role.id, role]),
    );

    await db.insert(roleAssignment).values(
      values.roleAssignments.map((role) => {
        const definition = roleDefinitionById.get(role.roleDefinitionId);
        if (definition === undefined) {
          throw new Error("Nie znaleziono wybranej roli.");
        }
        if (
          definition.scope === "project_team" ||
          definition.scope === "project"
        ) {
          throw new Error("Role projektowe są zarządzane przy projekcie.");
        }
        if (
          definition.scope === "board" &&
          (role.boardTermId === undefined || role.boardTermId === "")
        ) {
          throw new Error("Rola zarządowa wymaga wskazania kadencji.");
        }
        return {
          memberId: created.id,
          roleDefinitionId: role.roleDefinitionId,
          boardTermId: definition.scope === "board" ? role.boardTermId : null,
          sectionId:
            definition.scope === "section" ? (role.sectionId ?? null) : null,
          projectId: null,
          startedAt: parseDate(role.startedAt) ?? new Date(),
          endedAt: parseDate(role.endedAt),
        };
      }),
    );
  }

  if (created.githubUsername !== null) {
    await reattributeActivityForMember(created.id, created.githubUsername);
  }

  const automationResult = await runOnboardingAutomations({
    member: { githubUsername: created.githubUsername },
    sendGithubInvite: values.sendGithubInvite ?? true,
    sendDiscordInvite: values.sendDiscordInvite ?? true,
  });

  const resultParameters = new URLSearchParams();
  if (automationResult.githubInviteSent) {
    resultParameters.set("githubInvited", "1");
  }
  if (automationResult.discordInviteUrl !== null) {
    resultParameters.set("discordInvite", automationResult.discordInviteUrl);
  }

  revalidatePath(`/members/${created.id}`);
  revalidatePath("/members");

  return { id: created.id, query: resultParameters.toString() };
}

export async function updateMember(
  memberId: string,
  input: Partial<MemberFormValues>,
) {
  const currentMember = await getCurrentMember();
  if (currentMember === null) {
    throw new Error("Unauthorized");
  }
  const permissions = await getMemberPermissions(currentMember.id);
  const isFullAccess = can(permissions, "members", "write");
  const isSelf = canEditOwnProfile(permissions, memberId);
  if (!isFullAccess && !isSelf) {
    throw new Error("Brak uprawnień do edycji tego profilu.");
  }

  const values = memberFormSchema.partial().parse(input);

  if (values.parentId !== undefined && values.parentId === memberId) {
    throw new Error("Członek nie może być swoim własnym rodzicem.");
  }

  // fullName, status, bio, HR notes, emails and roles are board-only;
  // everything else (socials + study data) is self-editable per FEATURES.md.
  await db
    .update(member)
    .set({
      ...(isFullAccess &&
        values.fullName !== undefined && {
          fullName: values.fullName,
        }),
      ...(isFullAccess &&
        values.parentId !== undefined && {
          parentId: emptyToNull(values.parentId),
        }),
      ...(values.githubUsername !== undefined && {
        githubUsername: emptyToNull(values.githubUsername),
      }),
      ...(values.discordId !== undefined && {
        discordId: emptyToNull(values.discordId),
      }),
      ...(values.facebookUrl !== undefined && {
        facebookUrl: emptyToNull(values.facebookUrl),
      }),
      ...(values.linkedinUrl !== undefined && {
        linkedinUrl: emptyToNull(values.linkedinUrl),
      }),
      ...(values.instagramUrl !== undefined && {
        instagramUrl: emptyToNull(values.instagramUrl),
      }),
      ...(values.websiteUrl !== undefined && {
        websiteUrl: emptyToNull(values.websiteUrl),
      }),
      ...(values.photoUrl !== undefined && {
        photoUrl: emptyToNull(values.photoUrl),
      }),
      ...(values.studentIndex !== undefined && {
        studentIndex: emptyToNull(values.studentIndex),
      }),
      ...(values.studyDepartment !== undefined && {
        studyDepartment: emptyToNull(values.studyDepartment),
      }),
      ...(values.studyField !== undefined && {
        studyField: emptyToNull(values.studyField),
      }),
      ...(values.studyYear !== undefined && {
        studyYear: emptyToNull(values.studyYear),
      }),
      ...(isFullAccess &&
        values.bio !== undefined && {
          bio: emptyToNull(values.bio),
        }),
      ...(isFullAccess &&
        values.hrNotes !== undefined && {
          hrNotes: emptyToNull(values.hrNotes),
        }),
      ...(isFullAccess &&
        values.status !== undefined && {
          status: values.status,
        }),
      updatedAt: new Date(),
    })
    .where(eq(member.id, memberId));

  if (isFullAccess && values.emails !== undefined) {
    await db.delete(memberEmail).where(eq(memberEmail.memberId, memberId));
    if (values.emails.length > 0) {
      await db.insert(memberEmail).values(
        values.emails.map((email) => ({
          memberId,
          email: normalizeEmail(email.email),
          kind: email.kind,
        })),
      );
    }
  }

  if (isFullAccess && values.roleAssignments !== undefined) {
    const existingAssignments = await db.query.roleAssignment.findMany({
      where: eq(roleAssignment.memberId, memberId),
      with: { roleDefinition: true },
    });
    const replacedAssignmentIds = existingAssignments
      .filter(
        (assignment) =>
          assignment.roleDefinition.scope !== "project" &&
          assignment.roleDefinition.scope !== "project_team",
      )
      .map((assignment) => assignment.id);
    if (replacedAssignmentIds.length > 0) {
      await db
        .delete(roleAssignment)
        .where(inArray(roleAssignment.id, replacedAssignmentIds));
    }

    if (values.roleAssignments.length > 0) {
      const roleDefinitions =
        values.roleAssignments.length === 0
          ? []
          : await db.query.roleDefinition.findMany({
              where: inArray(
                roleDefinition.id,
                values.roleAssignments.map((role) => role.roleDefinitionId),
              ),
            });
      const roleDefinitionById = new Map(
        roleDefinitions.map((role) => [role.id, role]),
      );

      const assignments = values.roleAssignments.map((role) => {
        const definition = roleDefinitionById.get(role.roleDefinitionId);
        if (definition === undefined) {
          throw new Error("Nie znaleziono wybranej roli.");
        }
        if (
          definition.scope === "project_team" ||
          definition.scope === "project"
        ) {
          throw new Error("Role projektowe są zarządzane przy projekcie.");
        }
        if (
          definition.scope === "board" &&
          (role.boardTermId === undefined || role.boardTermId === "")
        ) {
          throw new Error("Rola zarządowa wymaga wskazania kadencji.");
        }
        return {
          memberId,
          roleDefinitionId: role.roleDefinitionId,
          boardTermId: definition.scope === "board" ? role.boardTermId : null,
          sectionId:
            definition.scope === "section" ? (role.sectionId ?? null) : null,
          projectId: null,
          startedAt: parseDate(role.startedAt) ?? new Date(),
          endedAt: parseDate(role.endedAt),
        };
      });
      if (assignments.length > 0) {
        await db.insert(roleAssignment).values(assignments);
      }
    }
  }

  if (values.githubUsername !== undefined) {
    const githubUsername = emptyToNull(values.githubUsername);
    if (githubUsername !== null) {
      await reattributeActivityForMember(memberId, githubUsername);
    }
  }

  revalidatePath(`/members/${memberId}`);
  revalidatePath("/members");
}

export async function deleteMember(memberId: string): Promise<void> {
  const currentMember = await getCurrentMember();
  if (currentMember === null) {
    throw new Error("Unauthorized");
  }
  const permissions = await getMemberPermissions(currentMember.id);
  if (!can(permissions, "members", "write")) {
    throw new Error("Tylko zarząd może usuwać członków.");
  }

  const memberRow = await db.query.member.findFirst({
    where: eq(member.id, memberId),
  });
  if (memberRow === undefined) {
    throw new Error("Nie znaleziono członka.");
  }

  const activeMemberships = await db.query.teamMember.findMany({
    where: and(eq(teamMember.memberId, memberId), isNull(teamMember.leftAt)),
    with: { team: true },
  });
  for (const membership of activeMemberships) {
    await revokeTeamAccess(membership.team, memberRow);
  }

  await db.delete(member).where(eq(member.id, memberId));
  revalidatePath("/members");
  redirect("/members");
}

export interface MemberImportPreviewRow {
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

export interface MemberImportPreviewResult {
  rows: MemberImportPreviewRow[];
  blankRowsSkipped: number;
  missingColumns: string[];
  existingMembers: { id: string; fullName: string }[];
  existingSections: { id: string; name: string }[];
}

export interface MemberImportRowResult {
  rowNumber: number;
  fullName: string;
  outcome: "created" | "skipped_duplicate" | "error";
  detail?: string;
}

export interface MemberImportSummary {
  created: number;
  skipped: number;
  errors: number;
  rows: MemberImportRowResult[];
}

async function assertCanManageMembers(action: string): Promise<void> {
  const currentMember = await getCurrentMember();
  if (currentMember === null) {
    throw new Error("Unauthorized");
  }
  const permissions = await getMemberPermissions(currentMember.id);
  if (!can(permissions, "members", "write")) {
    throw new Error(`Tylko zarząd może ${action}.`);
  }
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
 * calling commitMemberImport.
 */
export async function previewMemberImport(
  sheetType: MemberImportSheetType,
  fileContents: string,
): Promise<MemberImportPreviewResult> {
  await assertCanManageMembers("importować członków");

  const { rows, missingColumns, blankRowsSkipped } = parseMemberImportFile(
    sheetType,
    fileContents,
  );

  const existingMembers = await db.query.member.findMany({
    with: { emails: true },
  });
  const existingSections = await db.query.section.findMany();

  const nameToIds = buildNameIndex(existingMembers);
  const indexToId = buildIndexIndex(existingMembers);
  const emailToId = buildEmailIndex(existingMembers);

  const previewRows: MemberImportPreviewRow[] = rows.map((row) => {
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
      joinedAt:
        row.joinedAt === null ? "" : row.joinedAt.toISOString().slice(0, 10),
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
export async function commitMemberImport(
  rowsInput: MemberImportCommitInput,
): Promise<MemberImportSummary> {
  await assertCanManageMembers("importować członków");

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

  const results: MemberImportRowResult[] = [];
  const createdRows: {
    id: string;
    parentId: string | null;
    parentNameRaw: string | null;
    hrNotes: string | null;
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

      const [created] = await db
        .insert(member)
        .values({
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
          hrNotes,
          ...(row.joinedAt !== "" && {
            createdAt: new Date(`${row.joinedAt}T00:00:00`),
          }),
        })
        .returning();

      if (email !== null) {
        await db
          .insert(memberEmail)
          .values({ memberId: created.id, email, kind: row.emailKind })
          .onConflictDoNothing({ target: memberEmail.email });
        emailToId.set(email, created.id);
      }
      if (sectionIds.length > 0) {
        const sectionMemberRole = await getSectionMemberRole();
        await db.insert(roleAssignment).values(
          sectionIds.map((sectionId) => ({
            memberId: created.id,
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
        );
      }
      if (studentIndex !== null) {
        indexToId.set(studentIndex.toLowerCase(), created.id);
      }
      if (created.githubUsername !== null) {
        await reattributeActivityForMember(created.id, created.githubUsername);
      }
      addToNameIndex(nameToIds, row.fullName, created.id);
      createdRows.push({
        id: created.id,
        parentId: explicitParentId,
        parentNameRaw: row.parentNameRaw === "" ? null : row.parentNameRaw,
        hrNotes,
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
      await db
        .update(member)
        .set({
          hrNotes: [created.hrNotes, note].filter(Boolean).join("\n"),
        })
        .where(eq(member.id, created.id));
    }
  }

  revalidatePath("/members");

  return {
    created: results.filter((r) => r.outcome === "created").length,
    skipped: results.filter((r) => r.outcome === "skipped_duplicate").length,
    errors: results.filter((r) => r.outcome === "error").length,
    rows: results,
  };
}

function emptyToNull(value: string | undefined): string | null {
  return value === undefined || value === "" ? null : value;
}

async function getSectionMemberRole() {
  const role = await db.query.roleDefinition.findFirst({
    where: and(
      eq(roleDefinition.scope, "section"),
      eq(roleDefinition.name, "członek"),
    ),
  });
  if (role === undefined) {
    throw new Error("Nie znaleziono roli członka sekcji.");
  }
  return role;
}

function normalizeEmail(email: string): string {
  return email.toLowerCase();
}

function parseDate(value: string | undefined): Date | null {
  if (value === undefined || value === "") {
    return null;
  }
  return new Date(`${value}T00:00:00`);
}
